import os
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client

from app.services.ai_service import chat as ai_chat

router = APIRouter()

SYSTEM_PROMPT = """You are AuraStyle, a warm, expert personal fashion & outfit planner.
Your job: help the user build outfits that suit their body type, skin tone, style preferences, and the occasion they're dressing for.

Conversation rules:
- If the user's goal is vague, ask ONE short, focused clarifying question at a time — occasion, vibe (casual/formal/streetwear/etc.), season/weather, budget, color preferences, or pieces they already own. Never ask everything at once.
- Once you have enough context, propose a complete outfit: top, bottom, shoes, and 1–2 accessories. Explain briefly WHY each piece works for them.
- Reference the user's profile (body type, skin tone, country) when it's relevant — don't repeat it back robotically.
- Tone: friendly fashion stylist, not corporate. Keep replies tight — short paragraphs, bullets when listing items.
- If the user asks something off-topic (not fashion/outfit/style), politely steer back.
- Never invent specific product links or brand prices — describe the garment (color, cut, fabric, silhouette) so the user can find it.
"""


def _supabase() -> Client:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    )
    if not url or not key:
        raise RuntimeError("Supabase credentials missing — check .env")
    return create_client(url, key)


def _build_profile_context(user_id: Optional[str]) -> str:
    if not user_id:
        return "No profile on file — ask the user about their style when helpful."
    try:
        sb = _supabase()
        res = sb.table("profiles").select("*").eq("id", user_id).single().execute()
        p = res.data or {}
        parts = []
        if p.get("full_name"):
            parts.append(f"Name: {p['full_name']}")
        if p.get("body_type"):
            parts.append(f"Body type: {p['body_type']}")
        if p.get("skin_tone"):
            parts.append(f"Skin tone: {p['skin_tone']}")
        if p.get("country"):
            parts.append(f"Country: {p['country']}")
        if p.get("style_prefs"):
            parts.append(f"Style preferences: {', '.join(p['style_prefs'])}")
        if not parts:
            return "User profile exists but has no style details filled in."
        return "User profile:\n" + "\n".join(f"- {x}" for x in parts)
    except Exception as e:
        print(f"Profile context fetch failed: {e}")
        return "Could not load user profile."


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="messages is empty")

    profile_ctx = _build_profile_context(request.user_id)
    system = f"{SYSTEM_PROMPT}\n\n{profile_ctx}"

    history = [
        {
            "role": m.role if m.role in ("user", "assistant") else "user",
            "content": m.content,
        }
        for m in request.messages
    ]

    try:
        reply = ai_chat(history, system=system)
        return ChatResponse(reply=reply.strip())
    except Exception as e:
        print(f"Assistant chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
