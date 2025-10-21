# be-py/ai/ollama_client.py
import ollama
from common.config import OLLAMA_HOST, OLLAMA_MODEL

_ol = ollama.Client(host=OLLAMA_HOST)

def generate(prompt: str, model: str = None) -> str:
    mdl = model or OLLAMA_MODEL
    resp = _ol.chat(model=mdl, messages=[
        {"role": "system", "content": "You are a nutrition assistant. Output ONLY JSON as instructed."},
        {"role": "user", "content": prompt},
    ])
    return resp["message"]["content"]
