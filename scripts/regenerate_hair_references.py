"""
Regenerate accurate hair-style reference images.

PROBLEM this solves: the seeded card images were random stock photos that did not
actually depict the named haircut. So a user would pick a card by its picture but get
a different style (the AI follows the style NAME/spec, not the picture).

This script generates one clean, accurate reference photo per style — using the SAME
STYLE_SPECS the try-on uses — and updates each hair_styles row. Result: the picture on
the card and the try-on output now come from one source of truth.

Run once:
    cd outfit-planner
    source backend/venv/bin/activate
    python scripts/regenerate_hair_references.py
"""
import os
import sys
import time
import uuid

# Make the backend package importable.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from dotenv import load_dotenv
load_dotenv(os.path.join(ROOT, ".env"))

from app.api.v1.hair_endpoints import SEED_STYLES, _client

GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image-preview")

SUBJECT = {"Men": "man", "Women": "woman", "Boys": "young boy", "Girls": "young girl"}


def build_reference_prompt(gender: str, name: str, spec: str) -> str:
    subject = SUBJECT.get(gender, "person")
    return (
        f"A professional studio portrait photograph of a young {subject} "
        f"with a '{name}' haircut. "
        f"The haircut must follow this exact specification:\n{spec}\n"
        "The hairstyle must be clearly and fully visible. "
        "Front-facing head-and-shoulders shot, neutral light-grey background, "
        "soft even studio lighting, sharp focus, realistic photography. "
        "The image should clearly showcase the haircut."
    )


def generate_image(prompt: str):
    """Generates one image. Retries on no-image AND on 429 rate-limit with backoff."""
    from google import genai
    from google.genai import types

    client = genai.Client(vertexai=True, api_key=os.getenv("GOOGLE_GEMINI_API_KEY"))
    for attempt in range(1, 7):
        try:
            resp = client.models.generate_content(
                model=GEMINI_IMAGE_MODEL,
                contents=[prompt],
                config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
            )
        except Exception as e:
            msg = str(e)
            if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                wait = 30 * attempt
                print(f"    rate-limited (429) — waiting {wait}s then retrying")
                time.sleep(wait)
                continue
            raise

        if resp.candidates:
            parts = getattr(getattr(resp.candidates[0], "content", None), "parts", None)
            for part in parts or []:
                inline = getattr(part, "inline_data", None)
                if inline and inline.data:
                    return inline.data, getattr(inline, "mime_type", "image/jpeg")
        reason = getattr(resp.candidates[0], "finish_reason", None) if resp.candidates else None
        print(f"    attempt {attempt}: no image (finish_reason={reason})")
        time.sleep(5)
    return None, None


def upload(image_bytes: bytes, mime: str) -> str:
    sb = _client()
    ext = "png" if mime == "image/png" else "jpg"
    path = f"hair-references/{uuid.uuid4()}.{ext}"
    sb.storage.from_("user-images").upload(
        path=path,
        file=image_bytes,
        file_options={"content-type": mime, "upsert": "false"},
    )
    return sb.storage.from_("user-images").get_public_url(path)


# Seconds to pause between styles, to stay under the Vertex free-tier rate limit.
THROTTLE_SECONDS = int(os.getenv("HAIR_REF_THROTTLE", "12"))


def main():
    sb = _client()
    total, ok, failed = 0, 0, 0
    all_styles = [(g, s) for g, styles in SEED_STYLES.items() for s in styles]

    for idx, (gender, style) in enumerate(all_styles):
            name = style["name"]
            total += 1
            spec = style.get("description", "")
            print(f"[{gender}] {name} ...")

            prompt = build_reference_prompt(gender, name, spec)
            image_bytes, mime = generate_image(prompt)
            if not image_bytes:
                print(f"    FAILED — skipped")
                failed += 1
                continue

            try:
                url = upload(image_bytes, mime)
            except Exception as e:
                print(f"    upload failed: {e}")
                failed += 1
                continue

            # Insert the row if missing, otherwise update it (the script self-seeds).
            row = {
                "gender": gender,
                "name": name,
                "image_url": url,
                "thumb_url": url,
                "source": "generated",
                "tags": style.get("tags", []),
                "description": style.get("description"),
            }
            existing = (
                sb.table("hair_styles")
                .select("id")
                .eq("gender", gender)
                .eq("name", name)
                .execute()
            )
            if existing.data:
                sb.table("hair_styles").update(row).eq("id", existing.data[0]["id"]).execute()
                print(f"    OK -> {url}  (updated)")
            else:
                sb.table("hair_styles").insert(row).execute()
                print(f"    OK -> {url}  (inserted)")
            ok += 1

            # Throttle between styles to respect the free-tier rate limit.
            if idx < len(all_styles) - 1:
                time.sleep(THROTTLE_SECONDS)

    print(f"\nDone. {ok}/{total} regenerated, {failed} failed.")
    if failed:
        print("Failed styles can be re-run — the script is safe to run again.")


if __name__ == "__main__":
    main()
