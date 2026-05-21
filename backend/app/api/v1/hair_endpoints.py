import os
import base64
import json
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import requests
import replicate
from supabase import create_client, Client

from app.services.ai_service import chat as ai_chat

router = APIRouter()

# Provider for hair try-on. "gemini" (free via Google AI Studio key) or "replicate" (paid, higher quality).
HAIR_TRY_ON_PROVIDER = os.getenv("HAIR_TRY_ON_PROVIDER", "gemini").lower()

# Replicate model (only used when HAIR_TRY_ON_PROVIDER=replicate).
HAIR_TRY_ON_MODEL = os.getenv("HAIR_TRY_ON_MODEL", "black-forest-labs/flux-kontext-pro")

# Gemini image-edit model (only used when HAIR_TRY_ON_PROVIDER=gemini).
# 3.1 preview gives more accurate hair edits and avoids the IMAGE_RECITATION failures of 2.5.
GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image-preview")


def _client() -> Client:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    )
    if not url or not key:
        raise RuntimeError("Supabase credentials missing — check .env")
    return create_client(url, key)


# Placeholder shown on cards until regenerate_hair_references.py fills in real images.
PLACEHOLDER_IMAGE = "https://placehold.co/800x1000/0a0a0a/f472b6/png?text=AuraStyle"

# Hair-style catalog. Each `description` is detailed enough to (a) drive the card-image
# generation and (b) drive the on-user try-on edit — so the picture and the result match.
# Categories: Men, Women, Boys, Girls. Re-seeded per category on first request.
SEED_STYLES = {
    "Men": [
        {"name": "Classic Taper Fade", "tags": ["short", "fade", "classic"], "description": "2-3 inch neat textured top; sides and back gradually tapered shorter toward a clean rounded neckline; smooth professional blend, no harsh lines."},
        {"name": "Buzz Cut", "tags": ["short", "low-maintenance"], "description": "Whole head clipped to one uniform very short length (grade 1-3); no fade, no parting; flat and even all over."},
        {"name": "Crew Cut", "tags": ["short", "classic"], "description": "Short tapered sides with a slightly longer top that is shortest at the back and a touch longer at the front; tidy and military-inspired."},
        {"name": "French Crop", "tags": ["short", "textured"], "description": "Short faded sides with a short textured top worn forward into a small straight blunt fringe across the forehead."},
        {"name": "Textured Crop", "tags": ["short", "textured"], "description": "Short faded sides; 1.5-2 inch choppy piecey textured top styled forward; matte messy-but-controlled finish."},
        {"name": "Caesar Cut", "tags": ["short", "classic"], "description": "Short uniform length all over with a short horizontal fringe combed forward; flat even top, neat sides."},
        {"name": "Ivy League", "tags": ["short", "formal"], "description": "A longer crew cut: short tapered sides, top long enough to comb to a side part; clean, preppy and polished."},
        {"name": "Side Part", "tags": ["medium", "classic", "formal"], "description": "Medium 2-4 inch top combed neatly to one side with a sharp defined parting line; tapered short tidy sides; smooth lightly shined finish."},
        {"name": "Comb Over", "tags": ["medium", "formal"], "description": "Top swept across the head to one side; faded or tapered sides; sleek, polished and professional."},
        {"name": "Hard Part", "tags": ["short", "fade"], "description": "A side part with a sharp shaved line; short combed-over top and a clean skin fade on the sides."},
        {"name": "Slick Back Undercut", "tags": ["medium", "undercut"], "description": "Long 4-5 inch top combed straight back; disconnected undercut with uniformly short clipped sides, glossy slicked finish."},
        {"name": "Disconnected Undercut", "tags": ["medium", "undercut", "edgy"], "description": "Long top with a hard disconnection from very short uniform sides and back; no blend, bold contrast."},
        {"name": "Modern Pompadour", "tags": ["medium", "volume", "retro"], "description": "Long 4-6 inch top swept up and back with strong height and volume at the front; faded short sides; shiny voluminous finish."},
        {"name": "Quiff", "tags": ["medium", "volume"], "description": "Medium top lifted up and slightly forward at the front with volume; tapered sides; clean modern shape."},
        {"name": "Messy Quiff", "tags": ["medium", "casual"], "description": "3-4 inch top lifted up and forward into a tousled voluminous quiff with messy texture; tapered short sides; matte finish."},
        {"name": "Faux Hawk", "tags": ["medium", "edgy"], "description": "Hair on top pushed up to a central peak running front to back; shorter faded sides; softer than a true mohawk."},
        {"name": "Mohawk", "tags": ["bold", "edgy"], "description": "A strip of long hair down the centre of the head styled upward; sides shaved very short or to skin."},
        {"name": "Spiky Hair", "tags": ["short", "edgy"], "description": "Short top styled into separated upward spikes with gel; short neat sides; sharp pointed texture."},
        {"name": "High Fade", "tags": ["short", "fade"], "description": "Fade starting high near the temples, dropping quickly to skin; clearly longer styled hair on top."},
        {"name": "Low Fade", "tags": ["short", "fade"], "description": "Fade starting low just above the ears and neckline; subtle gradient, more length kept on the sides."},
        {"name": "Mid Fade", "tags": ["short", "fade"], "description": "Fade starting around the middle of the sides; balanced gradient between the top and the skin."},
        {"name": "Burst Fade", "tags": ["short", "fade", "edgy"], "description": "A fade that curves in a semicircle around the ear, leaving more length toward the back of the neck."},
        {"name": "Curly Top Fade", "tags": ["curly", "fade"], "description": "2-3 inch natural defined curls on top; clean low or skin fade blending the curls down to short near the ears."},
        {"name": "Afro", "tags": ["curly", "natural", "volume"], "description": "Natural tightly-coiled hair grown out evenly into a full rounded voluminous shape all around the head."},
        {"name": "Cornrows", "tags": ["braids", "natural"], "description": "Hair braided in neat straight rows flat against the scalp, running from the front of the head to the back."},
        {"name": "Dreadlocks", "tags": ["long", "natural"], "description": "Hair formed into many rope-like locks of medium to long length hanging from the head."},
        {"name": "Man Bun", "tags": ["long", "tied"], "description": "Long hair gathered and tied into a bun at the top-back of the head; front pulled cleanly off the face."},
        {"name": "Long Flow", "tags": ["long", "casual"], "description": "Hair grown out long and uniform, jaw to shoulder length, with natural movement and slight wave; no undercut."},
        {"name": "Mullet", "tags": ["medium", "retro", "edgy"], "description": "Short on the top and sides, deliberately left long at the back of the neck; the classic short-front long-back shape."},
        {"name": "Two Block Cut", "tags": ["medium", "korean"], "description": "Longer rounded top and fringe sitting over a distinctly shorter clipped under-section on the sides and back."},
    ],
    "Women": [
        {"name": "Long Layers", "tags": ["long", "layers"], "description": "Long hair past the shoulders cut with soft graduated layers throughout and face-framing pieces; full flowing ends."},
        {"name": "Blunt Bob", "tags": ["short", "bob"], "description": "Hair cut to one uniform length ending at the jawline with a sharp straight blunt bottom edge; no layers."},
        {"name": "Layered Bob", "tags": ["short", "bob", "layers"], "description": "A jaw to chin length bob cut with soft layers for movement and volume."},
        {"name": "Lob (Long Bob)", "tags": ["medium", "bob"], "description": "A collarbone-length bob, slightly longer than a classic bob, with subtle soft layers and a fairly blunt bottom."},
        {"name": "French Bob", "tags": ["short", "bob", "chic"], "description": "A short chin-length bob with a soft blunt edge, usually paired with short bangs; chic and Parisian."},
        {"name": "Bob with Bangs", "tags": ["short", "bob", "bangs"], "description": "A jawline bob combined with a full straight fringe across the forehead."},
        {"name": "Asymmetrical Bob", "tags": ["short", "bob", "edgy"], "description": "An angled bob, noticeably longer at the front than the back; modern and edgy."},
        {"name": "Pixie Cut", "tags": ["short", "bold"], "description": "A very short cropped cut; short tapered sides and back, slightly longer textured top, often with a short fringe."},
        {"name": "Shag Cut", "tags": ["medium", "layers", "retro"], "description": "A heavily layered choppy cut with lots of texture, feathered layers around the face and a wispy fringe."},
        {"name": "Wolf Cut", "tags": ["medium", "layers", "edgy"], "description": "A mix of a shag and a mullet: choppy layers, volume at the crown, longer wispy ends and a textured fringe."},
        {"name": "Beach Waves", "tags": ["medium", "wavy", "casual"], "description": "Medium collarbone-length hair styled into loose undone S-shaped waves with effortless tousled texture."},
        {"name": "Voluminous Curls", "tags": ["long", "curly"], "description": "Long hair styled into big, bouncy, well-defined curls with lots of body and volume throughout."},
        {"name": "Straight Long Hair", "tags": ["long", "sleek"], "description": "Long hair worn poker-straight, smooth and glossy, with a sleek frizz-free finish."},
        {"name": "Curtain Bangs", "tags": ["medium", "bangs"], "description": "Keep the existing length; add face-framing bangs parted down the middle that sweep softly outward like curtains."},
        {"name": "Blunt Bangs", "tags": ["bangs"], "description": "A full straight fringe cut bluntly straight across the forehead at eyebrow level."},
        {"name": "Side-Swept Bangs", "tags": ["bangs"], "description": "Soft bangs swept diagonally across the forehead to one side, blending into the length."},
        {"name": "Sleek Ponytail", "tags": ["long", "tied", "formal"], "description": "All hair pulled back tightly and smoothly into a high gathered ponytail at the crown; glossy flat finish."},
        {"name": "High Bun", "tags": ["tied", "formal"], "description": "Hair pulled up and wrapped into a neat smooth bun high on the crown of the head."},
        {"name": "Messy Bun", "tags": ["tied", "casual"], "description": "Hair loosely gathered into a relaxed undone bun high on the head with a few soft pieces left around the face."},
        {"name": "Top Knot", "tags": ["tied", "casual"], "description": "Hair gathered very high on the head and twisted into a compact knot."},
        {"name": "Half-Up Half-Down", "tags": ["medium", "casual"], "description": "The top section of hair pulled back and secured while the rest is left flowing loose."},
        {"name": "Braided Crown", "tags": ["braids", "formal"], "description": "Hair braided and wrapped around the top of the head like a crown or halo encircling the head."},
        {"name": "Fishtail Braid", "tags": ["braids"], "description": "A single intricate braid with a fine woven fishtail pattern, worn down the back or to one side."},
        {"name": "Dutch Braids", "tags": ["braids"], "description": "Two raised braids that sit on top of the hair, running from the hairline down the back."},
        {"name": "Space Buns", "tags": ["tied", "playful"], "description": "Hair parted down the middle and tied into two buns, one high on each side of the head."},
        {"name": "Hime Cut", "tags": ["long", "straight"], "description": "Long straight hair with cheek-length straight side pieces and a straight blunt fringe; sharp geometric shape."},
        {"name": "Feathered Hair", "tags": ["medium", "layers", "retro"], "description": "Layers brushed back and away from the face so they resemble feathers; soft volume and movement."},
        {"name": "Money Piece Highlights", "tags": ["color", "long"], "description": "Long layered hair with two bold lighter highlighted strands framing the face at the front."},
        {"name": "Cornrow Braids", "tags": ["braids", "natural"], "description": "Hair braided in neat rows flat to the scalp from front to back."},
        {"name": "Afro", "tags": ["curly", "natural", "volume"], "description": "Natural tightly-coiled hair grown out into a full, rounded, voluminous shape."},
    ],
    "Boys": [
        {"name": "Boys' Classic Cut", "tags": ["short", "neat"], "description": "Short tapered sides and back with a slightly longer combed top; tidy, neat and school-appropriate."},
        {"name": "Boys' Buzz Cut", "tags": ["short", "low-maintenance"], "description": "Whole head clipped to one uniform very short length; even all over, no styling needed."},
        {"name": "Boys' Crew Cut", "tags": ["short", "classic"], "description": "Short tapered sides with a short flat top; clean and easy."},
        {"name": "Boys' Short Fade", "tags": ["short", "fade"], "description": "Short top with a clean fade on the sides and back blending down to short; sporty and low-maintenance."},
        {"name": "Boys' Mid Fade", "tags": ["short", "fade"], "description": "A fade starting around the middle of the sides with a short neat top."},
        {"name": "Boys' High Fade", "tags": ["short", "fade"], "description": "A fade starting high on the sides dropping quickly to skin, with a short styled top."},
        {"name": "Boys' Taper Fade", "tags": ["short", "fade"], "description": "Sides gradually tapered shorter toward the neckline with a clean rounded edge and a neat top."},
        {"name": "Boys' Textured Crop", "tags": ["short", "textured"], "description": "Short faded sides with a short choppy textured top worn forward into a small fringe."},
        {"name": "Boys' French Crop", "tags": ["short", "textured"], "description": "Short sides with a short top worn forward into a neat straight little fringe."},
        {"name": "Boys' Caesar Cut", "tags": ["short", "classic"], "description": "Short even length all over with a short fringe combed forward."},
        {"name": "Boys' Comb Over", "tags": ["short", "neat"], "description": "Short top combed neatly across to one side; short tidy sides."},
        {"name": "Boys' Side Part", "tags": ["short", "neat"], "description": "Short top combed to one side with a soft parting line; short neat sides."},
        {"name": "Boys' Hard Part", "tags": ["short", "fade"], "description": "A short side part with a sharp shaved parting line and a clean fade on the sides."},
        {"name": "Boys' Faux Hawk", "tags": ["medium", "playful"], "description": "Hair on top pushed up to a soft central peak; shorter sides; fun but not extreme."},
        {"name": "Boys' Mohawk", "tags": ["bold", "playful"], "description": "A central strip of upward-styled hair with very short sides; bold kid-friendly version."},
        {"name": "Boys' Spiky Hair", "tags": ["short", "playful"], "description": "Short top styled into small upward spikes; short neat sides."},
        {"name": "Boys' Curly Top", "tags": ["curly"], "description": "Natural curls left longer and full on top with shorter sides."},
        {"name": "Boys' Afro", "tags": ["curly", "natural"], "description": "Natural coily hair grown into a rounded full afro shape."},
        {"name": "Boys' Cornrows", "tags": ["braids", "natural"], "description": "Hair braided in neat rows flat to the scalp from front to back."},
        {"name": "Boys' Messy Fringe", "tags": ["medium", "casual"], "description": "Medium-length top worn forward into a soft messy fringe across the forehead; shorter sides."},
        {"name": "Boys' Bowl Cut", "tags": ["short", "retro"], "description": "Hair cut to one even length all around with a straight round fringe; the classic bowl shape."},
        {"name": "Boys' Undercut", "tags": ["medium", "edgy"], "description": "Longer top with clearly shorter clipped sides; a kid-friendly undercut."},
        {"name": "Boys' Two Block Cut", "tags": ["medium", "korean"], "description": "A longer rounded top sitting over a shorter clipped under-section on the sides."},
        {"name": "Boys' Edgar Cut", "tags": ["short", "trendy"], "description": "A faded cut with a short, straight, bluntly-cut horizontal fringe across the forehead."},
        {"name": "Boys' Quiff", "tags": ["medium", "neat"], "description": "Medium top lifted up at the front with light volume; tapered short sides."},
        {"name": "Boys' Slick Back", "tags": ["medium", "neat"], "description": "Top combed straight back off the face; short neat sides."},
        {"name": "Boys' Long Hair", "tags": ["long", "casual"], "description": "Hair grown out long and uniform to around the ears or jaw with natural movement."},
        {"name": "Boys' Mullet", "tags": ["medium", "retro"], "description": "Short on top and sides with deliberately longer hair at the back of the neck."},
        {"name": "Boys' High Top", "tags": ["medium", "retro"], "description": "Hair on top grown up tall and flat with very short or faded sides."},
        {"name": "Boys' Disconnected Undercut", "tags": ["medium", "edgy"], "description": "Longer top with a hard disconnection from very short uniform sides; bold contrast."},
    ],
    "Girls": [
        {"name": "Girls' Long Waves", "tags": ["long", "wavy"], "description": "Long hair grown out evenly with soft natural waves and gentle movement."},
        {"name": "Girls' Straight Long Hair", "tags": ["long", "sleek"], "description": "Long hair worn smooth and straight with a soft neat finish."},
        {"name": "Girls' Layered Cut", "tags": ["medium", "layers"], "description": "Medium-length hair with soft layers throughout for movement and bounce."},
        {"name": "Girls' Bob Cut", "tags": ["short", "bob"], "description": "Hair cut to a neat chin-length bob with a soft rounded shape."},
        {"name": "Girls' Blunt Bob", "tags": ["short", "bob"], "description": "A jawline bob with a sharp straight blunt bottom edge; no layers."},
        {"name": "Girls' Pixie Cut", "tags": ["short", "bold"], "description": "A short cropped pixie; short sides, slightly longer textured top; cute and low-maintenance."},
        {"name": "Girls' Shoulder-Length Cut", "tags": ["medium"], "description": "Hair cut to a versatile shoulder length with a soft even shape."},
        {"name": "Girls' Curly Hair", "tags": ["curly"], "description": "Natural defined curls worn full and bouncy at medium to long length."},
        {"name": "Girls' Double Braids", "tags": ["braids"], "description": "Hair parted down the middle and braided into two even braids, one on each side."},
        {"name": "Girls' French Braid", "tags": ["braids"], "description": "A single braid woven flat against the head from the crown down the back."},
        {"name": "Girls' Dutch Braids", "tags": ["braids"], "description": "Two raised braids that sit on top of the hair running from the hairline down the back."},
        {"name": "Girls' Fishtail Braid", "tags": ["braids"], "description": "A single braid with a fine woven fishtail pattern worn down the back."},
        {"name": "Girls' Side Braid", "tags": ["braids"], "description": "Hair gathered and braided into one braid resting over one shoulder."},
        {"name": "Girls' Braided Crown", "tags": ["braids", "formal"], "description": "Braids wrapped around the top of the head like a crown encircling the head."},
        {"name": "Girls' High Ponytail", "tags": ["tied"], "description": "Hair gathered up into a bouncy high ponytail at the crown."},
        {"name": "Girls' Low Ponytail", "tags": ["tied"], "description": "Hair smoothly gathered into a ponytail low at the nape of the neck."},
        {"name": "Girls' Pigtails", "tags": ["tied", "playful"], "description": "Hair parted down the middle and tied into two ponytails, one on each side."},
        {"name": "Girls' Space Buns", "tags": ["tied", "playful"], "description": "Hair parted down the middle and tied into two buns, one high on each side."},
        {"name": "Girls' Top Knot", "tags": ["tied"], "description": "Hair gathered high on the head into a single compact knot."},
        {"name": "Girls' Messy Bun", "tags": ["tied", "casual"], "description": "Hair loosely gathered into a relaxed undone bun with a few soft pieces around the face."},
        {"name": "Girls' Half-Up Half-Down", "tags": ["medium", "casual"], "description": "The top section pulled back and secured while the rest is left flowing loose."},
        {"name": "Girls' Bangs", "tags": ["bangs"], "description": "A straight fringe cut across the forehead, paired with the existing length."},
        {"name": "Girls' Curtain Bangs", "tags": ["bangs"], "description": "Face-framing bangs parted in the middle and sweeping softly outward to each side."},
        {"name": "Girls' Bantu Knots", "tags": ["natural", "playful"], "description": "Hair sectioned and twisted into small coiled knots arranged across the head."},
        {"name": "Girls' Afro Puffs", "tags": ["curly", "natural"], "description": "Natural curly hair gathered into two round fluffy puffs, one on each side."},
        {"name": "Girls' Cornrows", "tags": ["braids", "natural"], "description": "Hair braided in neat rows flat to the scalp from front to back."},
        {"name": "Girls' Twists", "tags": ["natural"], "description": "Hair styled into many small two-strand twists hanging from the head."},
        {"name": "Girls' Headband Braid", "tags": ["braids"], "description": "A braid running across the top of the head like a headband, with the rest left loose."},
        {"name": "Girls' Bun with Ribbon", "tags": ["tied", "formal"], "description": "A neat bun on the crown finished with a decorative ribbon or bow."},
        {"name": "Girls' Bubble Ponytail", "tags": ["tied", "playful"], "description": "A ponytail segmented into several rounded bubble sections with small ties down its length."},
    ],
}


class HairStyleOut(BaseModel):
    id: Optional[str] = None
    gender: str
    name: str
    image_url: str
    thumb_url: Optional[str] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None


def _seed_gender(sb: Client, gender: str) -> List[dict]:
    rows = [
        {
            "gender": gender,
            "name": s["name"],
            "image_url": PLACEHOLDER_IMAGE,
            "thumb_url": PLACEHOLDER_IMAGE,
            "source": "pending",
            "tags": s.get("tags", []),
            "description": s.get("description"),
        }
        for s in SEED_STYLES.get(gender, [])
    ]
    if not rows:
        return []
    res = sb.table("hair_styles").insert(rows).execute()
    return res.data or []


@router.get("/", response_model=List[HairStyleOut])
async def list_hair_styles(gender: str = Query(..., description="Men | Women | Boys | Girls")):
    if gender not in ("Men", "Women", "Boys", "Girls"):
        raise HTTPException(status_code=400, detail="gender must be one of Men, Women, Boys, Girls")

    sb = _client()
    res = sb.table("hair_styles").select("*").eq("gender", gender).order("name").execute()
    data = res.data or []

    if not data:
        data = _seed_gender(sb, gender)

    return data


class TryOnRequest(BaseModel):
    user_face_url: str
    hair_style_image_url: str
    style_name: str
    style_description: Optional[str] = None


def _style_description(name: str) -> str:
    """Looks up a style's detailed description from the catalog, by exact name."""
    for styles in SEED_STYLES.values():
        for s in styles:
            if s["name"] == name:
                return s.get("description", "")
    return ""


def _single_image_prompt(name: str, description: Optional[str]) -> str:
    """
    Rich text instruction — the model relies on its own knowledge of the named haircut
    plus the catalog's detailed description. The same description drives the card image,
    so the picture the user picks and the result they get come from one definition.
    """
    spec = description or _style_description(name) or ""
    return (
        f"Completely restyle the hair of the person in this photo into an accurate, "
        f"real-life '{name}' haircut. "
        f"Follow this exact specification and match EVERY detail of it:\n"
        f"{spec}\n"
        f"The result must clearly and unmistakably look like a real '{name}' — the top length, "
        f"the side length, the back, the fade or taper, the texture, the volume and the parting "
        f"must all match the specification above. "
        "Do NOT keep the person's current hairstyle — fully replace it with the new haircut. "
        "CRITICAL — keep these EXACTLY the same as the original photo, do not alter them: "
        "the person's face, skin tone, eye color, facial features, expression, beard and facial "
        "hair, head angle, neck, body, clothing, lighting, and background. "
        "Change ONLY the hair on the scalp. "
        "Return a single, photorealistic, natural-looking image of the same person with the new haircut."
    )


def _fetch_image(url: str) -> tuple:
    """Downloads an image, returns (bytes, mime)."""
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    mime = resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
    if not mime.startswith("image/"):
        mime = "image/jpeg"
    return resp.content, mime


def _upload_result_to_storage(image_bytes: bytes, mime: str = "image/jpeg") -> str:
    """Uploads bytes to the public 'user-images' Supabase bucket and returns the public URL."""
    sb = _client()
    ext = "png" if mime == "image/png" else "jpg"
    filename = f"hair-tryon/{uuid.uuid4()}.{ext}"
    sb.storage.from_("user-images").upload(
        path=filename,
        file=image_bytes,
        file_options={"content-type": mime, "upsert": "false"},
    )
    return sb.storage.from_("user-images").get_public_url(filename)


GEMINI_TRY_ON_ATTEMPTS = 3


def _try_on_gemini(face_url: str, prompt: str) -> str:
    """
    Single-image hair edit: the user's photo + a rich text prompt naming the haircut.
    Retries on IMAGE_RECITATION (an intermittent Gemini refusal that returns no image).
    """
    api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_GEMINI_API_KEY missing")

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise HTTPException(status_code=500, detail="google-genai package not installed")

    face_bytes, face_mime = _fetch_image(face_url)

    # Vertex AI Express mode — required for the "AI free credits" service-account-bound key.
    client = genai.Client(vertexai=True, api_key=api_key)

    last_reason = None
    for attempt in range(1, GEMINI_TRY_ON_ATTEMPTS + 1):
        response = client.models.generate_content(
            model=GEMINI_IMAGE_MODEL,
            contents=[
                prompt,
                types.Part.from_bytes(data=face_bytes, mime_type=face_mime),
            ],
            config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
        )

        if response.candidates:
            candidate = response.candidates[0]
            last_reason = getattr(candidate, "finish_reason", None)
            content = getattr(candidate, "content", None)
            parts = getattr(content, "parts", None) if content else None
            if parts:
                for part in parts:
                    inline = getattr(part, "inline_data", None)
                    if inline and inline.data:
                        out_mime = getattr(inline, "mime_type", None) or "image/jpeg"
                        return _upload_result_to_storage(inline.data, out_mime)

        print(
            f"[hair try-on] attempt {attempt}/{GEMINI_TRY_ON_ATTEMPTS} "
            f"returned no image (finish_reason={last_reason}); retrying"
        )

    raise HTTPException(
        status_code=502,
        detail=(
            f"Gemini produced no image after {GEMINI_TRY_ON_ATTEMPTS} attempts "
            f"(last finish_reason={last_reason}). Try a clearer, well-lit, "
            "front-facing headshot, or set HAIR_TRY_ON_PROVIDER=replicate."
        ),
    )


def _try_on_replicate(face_url: str, prompt: str) -> str:
    token = os.getenv("REPLICATE_API_TOKEN")
    if not token:
        raise HTTPException(status_code=500, detail="REPLICATE_API_TOKEN missing")

    output = replicate.run(
        HAIR_TRY_ON_MODEL,
        input={
            "prompt": prompt,
            "input_image": face_url,
            "output_format": "jpg",
            "safety_tolerance": 2,
        },
    )
    if isinstance(output, list):
        return str(output[0])
    if hasattr(output, "url"):
        return str(output.url)
    return str(output)


@router.post("/try-on")
async def try_on_hair(request: TryOnRequest):
    """
    AI hair edit: keeps the user's face/identity and swaps the hairstyle.
    Provider is selected via HAIR_TRY_ON_PROVIDER env ("gemini" = free default, "replicate" = paid).

    Both providers use the user's photo + a rich text prompt naming the haircut — the model
    relies on its own knowledge of the style, which is more accurate than copying a reference photo.
    """
    prompt = _single_image_prompt(request.style_name, request.style_description)

    try:
        if HAIR_TRY_ON_PROVIDER == "replicate":
            result_url = _try_on_replicate(request.user_face_url, prompt)
        else:
            result_url = _try_on_gemini(request.user_face_url, prompt)
        return {"result_url": result_url, "provider": HAIR_TRY_ON_PROVIDER}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Hair try-on error ({HAIR_TRY_ON_PROVIDER}): {e}")
        raise HTTPException(status_code=500, detail=f"Hair try-on failed: {e}")


class RateRequest(BaseModel):
    result_image_url: str
    style_name: str
    style_description: Optional[str] = None


@router.post("/rate")
async def rate_hair_style(request: RateRequest):
    """
    Uses a vision LLM to score how the hairstyle suits the user.
    Returns { rating, feedback, pros, cons, suggestions }.
    """
    try:
        img_resp = requests.get(request.result_image_url, timeout=30)
        img_resp.raise_for_status()
        img_bytes = img_resp.content
        mime = img_resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()

        prompt = f"""
        You are a top celebrity hair stylist with 25+ years of experience.
        The person in this photo is wearing the hairstyle: "{request.style_name}".
        {"Style notes: " + request.style_description if request.style_description else ""}

        Assess how well this hairstyle suits the person based on:
        - face shape compatibility
        - hair texture match
        - overall harmony with their features
        - styling execution (does the AI-generated result look natural?)

        Respond strictly in JSON, no markdown fences:
        {{
            "rating": <integer 1-10>,
            "feedback": "<2-3 sentence verdict in a warm, expert tone>",
            "pros": ["<what works>", "<what works>"],
            "cons": ["<what doesn't work>", "<what doesn't work>"],
            "suggestions": ["<tweak or alternative>", "<tweak or alternative>"]
        }}
        """

        text = ai_chat(
            [{"role": "user", "content": prompt}],
            json_mode=True,
            image=(img_bytes, mime),
        )
        try:
            return json.loads(text)
        except Exception:
            cleaned = text.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)
    except Exception as e:
        print(f"Hair rating error: {e}")
        raise HTTPException(status_code=500, detail=f"Rating failed: {e}")
