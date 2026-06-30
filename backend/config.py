"""Central configuration for the Medical Citation Chatbot.

Every constant that was previously scattered across main.py and openfda_client.py
lives here so there is a single source of truth.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
import httpx

# Load .env from backend/ directory (one level up from this file)
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path)

# ── Ollama ─────────────────────────────────────────────────────────────────

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "medgemma1.5:4b-it-q4_K_M"
OLLAMA_TIMEOUT = httpx.Timeout(120.0, connect=10.0)

# ── OpenFDA ────────────────────────────────────────────────────────────────

OPENFDA_BASE = "https://api.fda.gov"
OPENFDA_PATH = "/drug/label.json"
OPENFDA_ENDPOINT = f"{OPENFDA_BASE}{OPENFDA_PATH}"
OPENFDA_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
OPENFDA_MAX_RETRIES = 3
OPENFDA_RETRY_DELAY = 1.0  # seconds, doubled on each retry

# ── Wikipedia (MediaWiki API) ─────────────────────────────────────────────

WIKI_ENDPOINT = "https://en.wikipedia.org/w/api.php"
WIKI_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
WIKI_SEARCH_LIMIT = 3
WIKI_EXTRACT_CHARS = 800  # intro extract length

# ── Session store ──────────────────────────────────────────────────────────

MAX_HISTORY_TURNS = 6
SESSION_TTL_SECONDS = 1800  # 30 minutes

# ── Prompt guard ───────────────────────────────────────────────────────────

# medgemma1.5:4b-it-q4_K_M has ~32K context.  We warn when the assembled prompt exceeds
# ~6000 tokens (≈ 4500 words for medical English).
MAX_PROMPT_WORDS = 4500

# Max output tokens from Ollama (≈ 3000 words). Prevents runaway generations.
MAX_OUTPUT_TOKENS = 4000

# ── SSE error codes ───────────────────────────────────────────────────────

class ErrorCode:
    EMPTY_QUERY = "EMPTY_QUERY"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    TIMEOUT = "TIMEOUT"
    CONNECTION_REFUSED = "CONNECTION_REFUSED"
