"""
Shared AI text/vision service.

Priority: Google Vertex AI (Gemini) — uses the project's Vertex Express key + free credits.
Fallback: OpenRouter (google/gemini-2.0-flash-001) — used automatically if Vertex fails.

All callers use chat(); they don't need to know which provider answered.
"""
import os
import base64
from typing import List, Dict, Optional, Tuple

# Model IDs (override via env if needed).
VERTEX_TEXT_MODEL = os.getenv("VERTEX_TEXT_MODEL", "gemini-2.5-flash")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")

# A message is {"role": "user" | "assistant", "content": str}.
Message = Dict[str, str]
# An attached image is (raw_bytes, mime_type).
Image = Tuple[bytes, str]


def _chat_vertex(
    messages: List[Message],
    system: Optional[str],
    json_mode: bool,
    image: Optional[Image],
) -> str:
    from google import genai
    from google.genai import types

    api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_GEMINI_API_KEY missing")

    # vertexai=True is required for the project's Vertex Express key.
    client = genai.Client(vertexai=True, api_key=api_key)

    contents = []
    last_idx = len(messages) - 1
    for i, m in enumerate(messages):
        role = "user" if m["role"] == "user" else "model"
        parts = [types.Part.from_text(text=m["content"])]
        if image and i == last_idx:
            data, mime = image
            parts.append(types.Part.from_bytes(data=data, mime_type=mime))
        contents.append(types.Content(role=role, parts=parts))

    config_kwargs: Dict[str, object] = {}
    if system:
        config_kwargs["system_instruction"] = system
    if json_mode:
        config_kwargs["response_mime_type"] = "application/json"

    response = client.models.generate_content(
        model=VERTEX_TEXT_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(**config_kwargs),
    )
    text = response.text
    if not text:
        raise RuntimeError("Vertex returned an empty response")
    return text


def _chat_openrouter(
    messages: List[Message],
    system: Optional[str],
    json_mode: bool,
    image: Optional[Image],
) -> str:
    from openai import OpenAI

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY missing")

    client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)

    oai_messages: List[Dict[str, object]] = []
    if system:
        oai_messages.append({"role": "system", "content": system})

    last_idx = len(messages) - 1
    for i, m in enumerate(messages):
        if image and i == last_idx and m["role"] == "user":
            data, mime = image
            b64 = base64.b64encode(data).decode("utf-8")
            oai_messages.append(
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": m["content"]},
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                    ],
                }
            )
        else:
            oai_messages.append({"role": m["role"], "content": m["content"]})

    kwargs: Dict[str, object] = {"model": OPENROUTER_MODEL, "messages": oai_messages}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(**kwargs)
    text = response.choices[0].message.content
    if not text:
        raise RuntimeError("OpenRouter returned an empty response")
    return text


def chat(
    messages: List[Message],
    system: Optional[str] = None,
    json_mode: bool = False,
    image: Optional[Image] = None,
) -> str:
    """
    Generate a text reply from the conversation.

    messages   - ordered list of {"role", "content"} turns.
    system     - optional system instruction.
    json_mode  - if True, ask the model to return strict JSON.
    image      - optional (bytes, mime) attached to the LAST user message (vision).

    Tries Vertex Gemini first; on any failure falls back to OpenRouter.
    Raises if both providers fail.
    """
    try:
        return _chat_vertex(messages, system, json_mode, image)
    except Exception as vertex_err:
        print(f"[ai_service] Vertex failed ({vertex_err}); falling back to OpenRouter")
        try:
            return _chat_openrouter(messages, system, json_mode, image)
        except Exception as openrouter_err:
            raise RuntimeError(
                f"Both AI providers failed. Vertex: {vertex_err} | OpenRouter: {openrouter_err}"
            )
