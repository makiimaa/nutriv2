# be-py/ai/gemini_client.py
from google import genai
from common.config import GEMINI_API_KEY

_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

def generate(prompt: str, model: str = "gemini-2.5-flash") -> str:
    if not _client:
        raise RuntimeError("GEMINI_API_KEY missing")
    resp = _client.models.generate_content(model=model, contents=prompt)
    return resp.text or ""
