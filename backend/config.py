"""Central configuration for the Medical Citation Chatbot.

Every constant that was previously scattered across main.py and openfda_client.py
lives here so there is a single source of truth.
"""

import httpx

# ── Ollama ─────────────────────────────────────────────────────────────────

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:7b"
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

# ── RxNav (RxNorm) ────────────────────────────────────────────────────────

RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST"
RXNAV_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

# ── Session store ──────────────────────────────────────────────────────────

MAX_HISTORY_TURNS = 6
SESSION_TTL_SECONDS = 1800  # 30 minutes

# ── Prompt guard ───────────────────────────────────────────────────────────

# qwen2.5:7b has ~32K context.  We warn when the assembled prompt exceeds
# ~6000 tokens (≈ 4500 words for medical English).
MAX_PROMPT_WORDS = 4500
