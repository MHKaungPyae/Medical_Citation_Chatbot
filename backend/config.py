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

OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_URL = f"{OLLAMA_BASE}/api/generate"
OLLAMA_MODEL = "medgemma1.5:4b-it-q8_0"
OLLAMA_TIMEOUT = httpx.Timeout(120.0, connect=10.0)
OLLAMA_NUM_CTX = 16384  # Reduced from default 32K to save RAM — covers ~6K prompt + 4K output

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

# ── Auth (Supabase JWT) ───────────────────────────────────────────────────

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# ── Prompt guard ───────────────────────────────────────────────────────────

# medgemma:4b has ~32K context, but we cap at OLLAMA_NUM_CTX (16K) to save RAM.
# Warn when the assembled prompt exceeds ~6000 tokens (≈ 4500 words).
# Hard-cap at ~7500 words to leave room for output within the 16K context.
MAX_PROMPT_WORDS = 4500
PROMPT_HARD_LIMIT_WORDS = 7500

# Max output tokens from Ollama (≈ 3000 words). Prevents runaway generations.
MAX_OUTPUT_TOKENS = 4000

# ── SSE error codes ───────────────────────────────────────────────────────

class ErrorCode:
    EMPTY_QUERY = "EMPTY_QUERY"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    TIMEOUT = "TIMEOUT"
    CONNECTION_REFUSED = "CONNECTION_REFUSED"

