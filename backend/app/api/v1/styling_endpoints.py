import os
import uuid
import replicate
import requests
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client

from app.services.ai_service import chat as ai_chat

router = APIRouter()

# Clothing try-on provider: "gemini" (free, Vertex credits) or "replicate" (paid IDM-VTon).
STYLING_TRY_ON_PROVIDER = os.getenv("STYLING_TRY_ON_PROVIDER", "gemini").lower()
GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image-preview")

# Replicate model versions (community models need a pinned version hash, and they expire).
# Override via env if these are deprecated again — fetch the current hash from the model page.
IDM_VTON_MODEL = os.getenv(
    "IDM_VTON_MODEL",
    "cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985",
)
# camenduru/stable-fast-3d was removed from Replicate — Trellis is the current image-to-3D model.
MODEL_3D = os.getenv("MODEL_3D", "firtoz/trellis")


def _supabase() -> Client:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "https://vklmboqczcywqpdkjdgi.supabase.co"
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or ""
    )
    return create_client(url, key)


def _fetch_image(url: str) -> tuple:
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    mime = resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
    if not mime.startswith("image/"):
        mime = "image/jpeg"
    return resp.content, mime


def _upload_result(image_bytes: bytes, mime: str) -> str:
    sb = _supabase()
    ext = "png" if mime == "image/png" else "jpg"
    path = f"try-on/{uuid.uuid4()}.{ext}"
    sb.storage.from_("user-images").upload(
        path=path, file=image_bytes, file_options={"content-type": mime, "upsert": "false"}
    )
    return sb.storage.from_("user-images").get_public_url(path)


def _try_on_gemini(user_url: str, garment_url: str, category: str, garment_des: str) -> str:
    """Free clothing try-on via Vertex Gemini: dresses the person in the given garment."""
    api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_GEMINI_API_KEY missing")
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise HTTPException(status_code=500, detail="google-genai package not installed")

    user_bytes, user_mime = _fetch_image(user_url)
    garm_bytes, garm_mime = _fetch_image(garment_url)

    where = {
        "upper_body": "as the top / upper-body garment",
        "lower_body": "as the bottoms / lower-body garment",
        "dresses": "as a full dress",
    }.get(category, "")

    prompt = (
        "You are given two images. IMAGE 1 is a photo of a person. "
        "IMAGE 2 is a clothing product. "
        f"Edit IMAGE 1 so the person is realistically wearing the garment from IMAGE 2 {where}. "
        f"The garment: {garment_des}. "
        "Fit the garment naturally to the person's body, pose and proportions, with realistic "
        "folds, shadows and lighting. Keep the person's face, hair, skin tone, body, pose, "
        "and the background EXACTLY the same. Do not copy the person or background from IMAGE 2. "
        "Return one photorealistic edited image."
    )

    client = genai.Client(vertexai=True, api_key=api_key)
    for attempt in range(1, 4):
        response = client.models.generate_content(
            model=GEMINI_IMAGE_MODEL,
            contents=[
                prompt,
                types.Part.from_bytes(data=user_bytes, mime_type=user_mime),
                types.Part.from_bytes(data=garm_bytes, mime_type=garm_mime),
            ],
            config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
        )
        if response.candidates:
            parts = getattr(getattr(response.candidates[0], "content", None), "parts", None)
            for part in parts or []:
                inline = getattr(part, "inline_data", None)
                if inline and inline.data:
                    return _upload_result(inline.data, getattr(inline, "mime_type", "image/jpeg"))
            reason = getattr(response.candidates[0], "finish_reason", None)
        else:
            reason = "no candidates"
        print(f"[styling try-on] attempt {attempt} no image (finish_reason={reason}); retrying")

    raise HTTPException(status_code=502, detail="Gemini produced no try-on image after 3 attempts.")


def _try_on_replicate(user_url: str, garment_url: str, category: str, garment_des: str) -> str:
    token = os.getenv("REPLICATE_API_TOKEN")
    if not token:
        raise HTTPException(status_code=500, detail="REPLICATE_API_TOKEN is missing from .env")
    output = replicate.run(
        IDM_VTON_MODEL,
        input={
            "garm_img": garment_url,
            "human_img": user_url,
            "garment_des": garment_des,
            "category": category,
        },
    )
    if isinstance(output, list):
        return str(output[0])
    if hasattr(output, "url"):
        return str(output.url)
    return str(output)


def _gemini_generate(prompt: str, images: list) -> tuple:
    """images: list of (bytes, mime). Returns (result_bytes, result_mime). Retries 3x."""
    api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_GEMINI_API_KEY missing")
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise HTTPException(status_code=500, detail="google-genai package not installed")

    client = genai.Client(vertexai=True, api_key=api_key)
    contents = [prompt] + [
        types.Part.from_bytes(data=b, mime_type=m) for b, m in images
    ]
    for _ in range(3):
        response = client.models.generate_content(
            model=GEMINI_IMAGE_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
        )
        if response.candidates:
            parts = getattr(getattr(response.candidates[0], "content", None), "parts", None)
            for part in parts or []:
                inline = getattr(part, "inline_data", None)
                if inline and inline.data:
                    return inline.data, getattr(inline, "mime_type", "image/jpeg")
    raise HTTPException(status_code=502, detail="Gemini produced no image after 3 attempts")


# Camera angles for the 360° spin (frame 0 is the original front-facing try-on image).
_TURNTABLE_ANGLES = [
    "rotated about 60 degrees, showing a three-quarter view of their right side",
    "rotated about 120 degrees, showing mainly their right side and part of their back",
    "viewed directly from behind — the full back view of the person and outfit",
    "rotated to show mainly their left side and part of their back",
    "rotated to show a three-quarter view of their left side",
]


class TurntableRequest(BaseModel):
    image_url: str


@router.post("/turntable")
async def turntable(request: TurntableRequest):
    """
    Generates a 360° spin: the original try-on image plus 5 AI-rotated views.
    The frontend cycles through `frames` as the user drags to rotate.
    """
    base_bytes, base_mime = _fetch_image(request.image_url)
    frames = [request.image_url]  # frame 0 = original front view

    for angle in _TURNTABLE_ANGLES:
        prompt = (
            "This photo shows a person wearing an outfit. Generate an image of the EXACT "
            "same person wearing the EXACT same outfit, standing in the same spot, but seen "
            f"from a different camera angle: {angle}. Keep their body, outfit, garment colors, "
            "hair and the background identical — only the camera viewing angle changes. "
            "Photorealistic, full body, consistent lighting and framing."
        )
        try:
            data, mime = _gemini_generate(prompt, [(base_bytes, base_mime)])
            frames.append(_upload_result(data, mime))
        except Exception as e:
            print(f"[turntable] angle '{angle[:30]}...' failed: {e}")
            # Skip the failed frame; the spin still works with the remaining ones.

    return {"frames": frames, "count": len(frames)}

class TryOnRequest(BaseModel):
    user_image_url: str
    product_image_url: str
    category: str = "upper_body" # can be upper_body, lower_body, dresses
    garment_des: str = "A stylish outfit"

class Generate3DRequest(BaseModel):
    image_url: str

class ExpertAdviceRequest(BaseModel):
    user_image_url: str
    product_name: str
    product_description: str

@router.post("/try-on")
async def try_on(request: TryOnRequest):
    """
    Clothing virtual try-on. Provider via STYLING_TRY_ON_PROVIDER env:
    "gemini" (free, Vertex credits) or "replicate" (paid IDM-VTon).
    """
    try:
        if STYLING_TRY_ON_PROVIDER == "replicate":
            img_url = _try_on_replicate(
                request.user_image_url, request.product_image_url,
                request.category, request.garment_des,
            )
        else:
            img_url = _try_on_gemini(
                request.user_image_url, request.product_image_url,
                request.category, request.garment_des,
            )
        return {"generated_image_url": img_url, "provider": STYLING_TRY_ON_PROVIDER}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in Try-On ({STYLING_TRY_ON_PROVIDER}): {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-3d")
async def generate_3d(request: Generate3DRequest):
    replicate_token = os.getenv("REPLICATE_API_TOKEN")
    if not replicate_token:
        raise HTTPException(status_code=500, detail="REPLICATE_API_TOKEN is missing from .env")

    try:
        # Trellis takes a list of input images and returns a GLB model file.
        output = replicate.run(
            MODEL_3D,
            input={
                "images": [request.image_url],
                "generate_model": True,
                "save_gaussian_ply": False,
                "texture_size": 1024,
            },
        )

        # Trellis returns a dict-like object; the GLB is usually under "model_file".
        model_url = None
        if isinstance(output, dict):
            model_url = output.get("model_file") or output.get("glb") or output.get("model")
        elif isinstance(output, list):
            model_url = output[0]
        else:
            model_url = output

        if model_url is None:
            raise HTTPException(status_code=502, detail=f"3D model not found in output: {output}")
        if hasattr(model_url, "url"):
            model_url = model_url.url
        return {"model_url": str(model_url)}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in Replicate 3D Gen: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/expert-advice")
async def get_expert_advice(request: ExpertAdviceRequest):
    try:
        # Download user image to pass to the vision model
        user_img_response = requests.get(request.user_image_url)
        user_img_response.raise_for_status()
        img_bytes = user_img_response.content
        mime_type = user_img_response.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()

        prompt = f"""
        Act as a legendary fashion designer expert with over 30 years of experience.
        You are looking at a user's photo. They are wearing (or considering wearing) this product: {request.product_name}.
        Product details: {request.product_description}.
        
        Please provide:
        1. A rating from 1 to 10 on how this product looks on them based on their silhouette and the product's design.
        2. Your expert feedback and why it works or doesn't work. Talk like a seasoned fashion veteran.
           IMPORTANT: keep the feedback CONCISE — 2 to 3 sentences maximum, under 60 words. Be punchy, not wordy.
        3. Suggestions on what they should try more of, or what combinations (shoes, accessories, bottoms) look good with this.

        Respond strictly in this JSON format without markdown code blocks:
        {{
            "rating": 9,
            "feedback": "Your seasoned expert insight...",
            "suggestions": ["suggestion 1", "suggestion 2"]
        }}
        """
        
        result_text = ai_chat(
            [{"role": "user", "content": prompt}],
            json_mode=True,
            image=(img_bytes, mime_type),
        )
        try:
            return json.loads(result_text)
        except Exception:
            cleaned = result_text.replace('```json', '').replace('```', '').strip()
            return json.loads(cleaned)
    except Exception as e:
        print(f"Error in Expert Advice: {e}")
        raise HTTPException(status_code=500, detail=str(e))
