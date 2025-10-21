# be-py/common/config.py
import os
from dotenv import load_dotenv
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MONGODB_URI    = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/nuv2")
OLLAMA_HOST    = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL   = os.getenv("OLLAMA_MODEL", "gpt-oss:20b")
