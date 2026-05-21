import os
import json
import requests
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from app.services.ai_service import chat as ai_chat

load_dotenv()

router = APIRouter()

class ProfileUpdateRequest(BaseModel):
    user_id: str
    image_url: str


class FacePhotoUpdateRequest(BaseModel):
    user_id: str
    image_url: str


@router.post("/update-face-photo")
async def update_face_photo(request: FacePhotoUpdateRequest):
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Missing Supabase admin keys")

    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    payload = {"id": request.user_id, "face_photo_url": request.image_url}

    url = f"{supabase_url}/rest/v1/profiles"
    response = requests.post(url, headers=headers, json=payload)

    if not response.ok:
        print(f"Supabase Admin Error: {response.text}")
        raise HTTPException(status_code=500, detail="Failed to upsert face photo via admin key")

    return {"success": True}


@router.post("/analyze-face-photo")
async def analyze_face_photo(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        mime_type = file.content_type or "image/jpeg"

        prompt = """
        Analyze this image for a virtual HAIRSTYLE try-on.
        BE STRICT.

        CRITERIA for a valid headshot:
        1. Exactly one person is present.
        2. The face is clearly visible, front-facing (or up to ~30° off-angle).
        3. Head and hair are fully in frame — no crop at the top of the head.
        4. Good resolution, not heavily blurred or low-light.
        5. Face is not obscured by sunglasses, a mask, or hands.

        Respond with strict JSON:
        {
          "is_valid_headshot": boolean,
          "description": "Short reason if invalid, or 'Looks good' if valid"
        }
        """

        result_text = ai_chat(
            [{"role": "user", "content": prompt}],
            json_mode=True,
            image=(contents, mime_type),
        )
        try:
            return json.loads(result_text)
        except Exception:
            return {"is_valid_headshot": False, "description": "Failed to parse AI response."}

    except Exception as e:
        print(f"Face analysis error: {e}")
        return {"is_valid_headshot": False, "description": f"AI service error: {str(e)}"}


@router.post("/update-profile-image")
async def update_profile_image(request: ProfileUpdateRequest):
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Missing Supabase admin keys")
    
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    payload = {
        "id": request.user_id,
        "full_body_img_url": request.image_url
    }
    
    # POST to REST endpoint allows upsert with Prefer header
    url = f"{supabase_url}/rest/v1/profiles"
    response = requests.post(url, headers=headers, json=payload)
    
    if not response.ok:
        print(f"Supabase Admin Error: {response.text}")
        raise HTTPException(status_code=500, detail="Failed to upsert profile via admin key")
        
    return {"success": True}

@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Missing Supabase admin keys")
        
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json"
    }
    
    # Use REST endpoint to bypass RLS and get profile
    url = f"{supabase_url}/rest/v1/profiles?id=eq.{user_id}&select=*"
    response = requests.get(url, headers=headers)
    
    if not response.ok:
        raise HTTPException(status_code=500, detail="Failed to fetch profile")
        
    data = response.json()
    if len(data) > 0:
        return data[0]
    return {}

@router.post("/analyze-body-photo")
async def analyze_body_photo(file: UploadFile = File(...)):
    try:
        print(f"Analyzing image: {file.filename}")
        contents = await file.read()
        mime_type = file.content_type or "image/jpeg"

        prompt = """
        Analyze this image for a fashion virtual try-on application.
        YOU MUST BE EXTREMELY STRICT.

        CRITERIA:
        1. A person MUST be clearly present in the photo.
        2. The entire body MUST be visible from HEAD to TOE.
        3. No parts (hands, feet, head) should be cut off by the frame.

        If no person is present, or if it is just a face, or just torso, or missing feet, set 'is_full_body' to false.

        Respond with a JSON object in this format:
        {
          "is_full_body": boolean,
          "description": "Short explanation of why it is or isn't a valid full-body shot"
        }
        """

        result_text = ai_chat(
            [{"role": "user", "content": prompt}],
            json_mode=True,
            image=(contents, mime_type),
        )
        print(f"AI Raw Response: {result_text}")

        try:
            return json.loads(result_text)
        except Exception as parse_err:
            print(f"AI Parse Error: {parse_err} | Raw: {result_text}")
            return {"is_full_body": False, "description": "Failed to parse AI response."}

    except Exception as e:
        print(f"AI Analysis Exception: {e}")
        return {"is_full_body": False, "description": f"AI service error: {str(e)}"}
