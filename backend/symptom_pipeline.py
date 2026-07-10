"""Medical chatbot pipeline.

Always fetches Wikipedia + OpenFDA context for every query, then streams
an LLM response. No keyword classification, no hardcoded system prompt —
the model handles everything generatively.
"""

import asyncio
import json
import logging
import re
import uuid
from typing import AsyncGenerator

import httpx

from backend.config import ErrorCode, MAX_OUTPUT_TOKENS, MAX_PROMPT_WORDS, OLLAMA_MODEL, OLLAMA_NUM_CTX, OLLAMA_TIMEOUT, OLLAMA_URL, PROMPT_HARD_LIMIT_WORDS
from backend.logging_setup import set_request_id
from backend.openfda_client import search_openfda
from backend.session_store import session_store
from backend.wiki_client import get_wiki_extracts, search_wikipedia

logger = logging.getLogger(__name__)

# ── SSE formatting ──────────────────────────────────────────────────────────

def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# ── Ollama streaming ────────────────────────────────────────────────────────

_ollama_client: httpx.AsyncClient | None = None


def init_ollama_client() -> None:
    """Eagerly initialize the shared httpx.AsyncClient. Call at app startup."""
    _get_ollama_client()


def _get_ollama_client() -> httpx.AsyncClient:
    """Return a shared httpx.AsyncClient for Ollama requests."""
    global _ollama_client
    if _ollama_client is None:
        _ollama_client = httpx.AsyncClient(
            timeout=OLLAMA_TIMEOUT,
            headers={"ngrok-skip-browser-warning": "true"},
        )
    return _ollama_client


async def close_ollama_client() -> None:
    """Close the shared Ollama client. Call on shutdown."""
    global _ollama_client
    if _ollama_client is not None:
        await _ollama_client.aclose()
        _ollama_client = None


async def _stream_ollama(prompt: str) -> AsyncGenerator[tuple[str, dict], None]:
    """Stream tokens from Ollama, yielding (event_type, data_dict) tuples."""
    client = _get_ollama_client()
    try:
        async with client.stream(
            "POST",
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "num_predict": MAX_OUTPUT_TOKENS,
                    "num_ctx": OLLAMA_NUM_CTX,
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1,
                },
            },
        ) as response:
            response.raise_for_status()
            token_count = 0
            async for line in response.aiter_lines():
                if not line:
                    continue
                try:
                    chunk = json.loads(line)
                except json.JSONDecodeError:
                    continue
                token = chunk.get("response", "")
                if token:
                    token_count += 1
                    yield ("token", {"text": token})
                    if token_count >= MAX_OUTPUT_TOKENS:
                        logger.warning(
                            "Ollama output capped at %d tokens", MAX_OUTPUT_TOKENS
                        )
                        yield ("warning", {
                            "message": "Response was truncated due to length.",
                        })
                        break
                if chunk.get("done", False):
                    break
    except httpx.TimeoutException:
        logger.error("Ollama request timed out")
        yield ("error", {
            "message": "The model took too long to respond. Please try again.",
            "code": ErrorCode.TIMEOUT,
        })
    except httpx.ConnectError:
        logger.error("Cannot connect to Ollama at %s", OLLAMA_URL)
        yield ("error", {
            "message": "Could not reach the model. Is Ollama running?",
            "code": ErrorCode.CONNECTION_REFUSED,
        })


# ── thinking token filter ──────────────────────────────────────────────────

_THINKING_RE = re.compile(
    r"<unused\d+>.*?<unused\d+>",
    re.DOTALL,
)


def _strip_thinking_tokens(text: str) -> str:
    """Remove MedGemma thinking blocks from the response."""
    cleaned = _THINKING_RE.sub("", text).strip()
    if cleaned != text.strip():
        logger.info("Stripped thinking tokens (%d → %d chars)", len(text.strip()), len(cleaned))
    return cleaned


# ── output validation — strip leaked prompt structure ─────────────────────

_PROMPT_LEAK_PATTERNS: list[re.Pattern] = [
    re.compile(r"---\s*BEGIN\s+USER\s+INPUT\s*---", re.IGNORECASE),
    re.compile(r"---\s*END\s+USER\s+INPUT\s*---", re.IGNORECASE),
    re.compile(r"##\s*PREVIOUS\s+CONVERSATION", re.IGNORECASE),
    re.compile(r"##\s*WIKIPEDIA\s+MEDICAL\s+INFORMATION", re.IGNORECASE),
    re.compile(r"##\s*FDA\s+DRUG\s+LABEL\s+INFORMATION", re.IGNORECASE),
    re.compile(r"##\s*USER'S\s+QUESTION", re.IGNORECASE),
]


def _strip_prompt_leaks(text: str) -> str:
    """Remove any prompt structure that the LLM may have leaked."""
    for pattern in _PROMPT_LEAK_PATTERNS:
        text = pattern.sub("", text)
    return text.strip()


# ── citation post-processing ────────────────────────────────────────────────

def _normalize_citation_markers(text: str) -> str:
    text = re.sub(r"\[\s*(\d+)\s*\]", r"[[CITATION:\1]]", text)
    # Only match standalone parenthesized numbers (1)-(99) that look like
    # citation markers — not "(5 mg)", "(see page 3)", etc.
    text = re.sub(r"(?<![a-zA-Z])\((\d{1,2})\)(?![a-zA-Z/%])", r"[[CITATION:\1]]", text)
    text = re.sub(r"\[\[CITATION[:\s]+(\d+)\]\]", r"[[CITATION:\1]]", text)
    # Strip literal [[CITATION:N]] — LLM copied the template literally
    text = text.replace("[[CITATION:N]]", "")
    text = text.replace("[[CITATION: N]]", "")
    return text


def _extract_citations(text: str) -> list[int]:
    markers = re.findall(r"\[\[CITATION:(\d+)\]\]", text)
    return sorted(set(int(n) for n in markers))


# ── drug name extraction from text (heuristic, no keyword lists) ────────────

# Words we skip when extracting potential drug names from Wiki text.
_STOP_WORDS: frozenset[str] = frozenset({
    # Articles, pronouns, conjunctions
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "above", "below", "between", "under", "again",
    "further", "then", "once", "here", "there", "when", "where", "why",
    "how", "all", "both", "each", "few", "more", "most", "other", "some",
    "such", "no", "nor", "not", "only", "own", "same", "so", "than",
    "too", "very", "just", "because", "but", "and", "or", "if", "while",
    "that", "this", "these", "those", "it", "its", "he", "she", "they",
    "them", "their", "his", "her", "my", "your", "our", "we", "you",
    "also", "about", "what", "which", "who", "whom", "without", "within",
    # Medical / generic words that are not drug names
    "using", "used", "use", "due", "including", "include", "known",
    "treatment", "symptoms", "medication", "dose", "doses", "mg", "effects",
    "side", "clinical", "patients", "patient", "study", "studies",
    "drug", "drugs", "medical", "medicine", "health", "disease",
    "condition", "cause", "caused", "causes", "common", "blood",
    "body", "pain", "cells", "cell", "system", "risk", "high", "low",
    "severe", "mild", "acute", "chronic", "therapy", "one", "two",
    "first", "new", "many", "often", "well", "however", "available",
    "evidence", "data", "research", "reported", "found", "shown",
    "significant", "important", "potential", "different", "several",
    "number", "including", "years", "time", "day", "days",
    "effect", "human", "history", "people", "person",
    "oral", "topical", "injection", "tablet", "capsule", "typically",
    "generally", "recommended", "followed", "necessary", "following",
    # Generic substances / non-drug terms that cause false-positive FDA lookups
    "acid", "salt", "gold", "silver", "iron", "water", "sugar", "starch",
    "calcium", "sodium", "potassium", "magnesium", "alcohol", "oxygen",
    "nitrogen", "sulfur", "copper", "iodine", "flour", "honey", "lemon",
    "ginger", "garlic", "turmeric", "cinnamon", "pepper", "mint", "basil",
    "cream", "lotion", "gel", "oil", "paste", "powder", "syrup",
    "vitamin", "mineral", "supplement", "herbal", "herb", "extract",
    "formula", "solution", "mixture", "compound", "substance",
    "adult", "child", "children", "infant", "elderly",
    "morning", "evening", "night", "daily", "weekly",
    "food", "meal", "diet", "eating", "drink",
    "skin", "hair", "nail", "muscle", "bone", "joint",
    "head", "neck", "chest", "back", "stomach", "throat",
    "fever", "cough", "cold", "flu", "infection", "virus", "bacteria",
    "allergy", "allergic", "reaction", "rash", "swelling", "nausea",
    "vomiting", "diarrhea", "constipation", "headache", "dizziness",
    "fatigue", "weakness", "insomnia", "anxiety", "depression",
    "diabetes", "asthma", "arthritis", "cancer", "heart", "liver",
    "kidney", "lung", "brain", "nerve", "thyroid",
})


def _extract_drug_names_from_text(text: str, extra: list[str] | None = None) -> list[str]:
    """Heuristically extract potential drug/substance names from any text.

    Returns up to 4 unique names. Works on both capitalized Wiki text and
    lowercase user queries.
    """
    found: list[str] = []
    seen: set[str] = set()

    # Start with any explicit names passed in (e.g. from Wiki article titles)
    for name in (extra or []):
        name_lower = name.lower().strip()
        if name_lower and name_lower not in seen and len(name_lower) > 2:
            seen.add(name_lower)
            found.append(name_lower)

    # Pass 1: capitalized words (proper nouns in Wikipedia text)
    # Capture 3+ char names (e.g. Advil, Xanax) and optional second word
    for word in re.findall(r'\b[A-Z][a-z]{2,}(?:[-\s][a-z]{3,})*\b', text):
        word_lower = word.lower().strip()
        if word_lower not in seen and word_lower not in _STOP_WORDS:
            seen.add(word_lower)
            found.append(word_lower)

    # Pass 2: all-caps abbreviations (e.g. OTC, NSAID, HRT)
    for word in re.findall(r'\b[A-Z]{3,6}\b', text):
        word_lower = word.lower()
        if word_lower not in seen and word_lower not in _STOP_WORDS:
            seen.add(word_lower)
            found.append(word_lower)

    # Pass 3: lowercase words 4+ chars (handles user queries like
    # "aspirin", "paracetamol", "glucosamine")
    for word in re.findall(r'\b[a-z]{4,15}\b', text.lower()):
        if word not in seen and word not in _STOP_WORDS:
            seen.add(word)
            found.append(word)

    return found[:4]


# ── context formatting (inline — no prompts.py) ─────────────────────────────

def _format_wiki_context(articles: list[dict], extracts: dict[int, str] | None = None) -> str:
    """Format Wikipedia search results and extracts into a prompt-ready string."""
    if not articles:
        return ""

    if extracts is None:
        extracts = {}

    lines: list[str] = []
    for i, article in enumerate(articles, start=1):
        pid = article.get("pageid", 0)
        extract = extracts.get(pid, "")
        title = article.get("title", "")

        lines.append(
            f"CITATION {i}: {title}\n"
            f"Source: {article.get('url', '')}\n"
        )
        if extract:
            lines.append(f"Summary: {extract}\n")
        elif article.get("snippet"):
            lines.append(f"Summary: {article.get('snippet', '')}\n")
        else:
            lines.append("Summary: No extract available.\n")

    return "\n".join(lines)


def _format_fda_context(data: dict, citation_index: int = 0) -> str:
    """Format OpenFDA drug label data into a prompt-ready string."""
    if data.get("not_found"):
        return ""

    label = f"CITATION {citation_index}: " if citation_index > 0 else ""
    lines = [f"{label}Drug: {data['drug_name']} (Source: FDA Drug Label)"]

    if data.get("indications"):
        lines.append(f"Indications: {data['indications']}")
    if data.get("warnings"):
        lines.append(f"Warnings: {data['warnings']}")
    if data.get("side_effects"):
        lines.append(f"Side Effects: {data['side_effects']}")
    if data.get("contraindications"):
        lines.append(f"Contraindications: {data['contraindications']}")
    if data.get("drug_interactions"):
        lines.append(f"Drug Interactions: {data['drug_interactions']}")
    if data.get("dosage"):
        lines.append(f"Dosage: {data['dosage']}")
    if data.get("pregnancy"):
        lines.append(f"Pregnancy/Breastfeeding: {data['pregnancy']}")

    return "\n".join(lines)


def _build_prompt(
    user_query: str,
    wiki_context: str = "",
    fda_context: str = "",
    conversation_history: str = "",
) -> str:
    """Build the full prompt for the LLM — minimal, no hardcoded behavior rules."""
    parts: list[str] = []
    context_indices: list[int] = []  # track which parts are trimmable context

    # Conversation history
    if conversation_history:
        parts.append("## PREVIOUS CONVERSATION\n" + conversation_history + "\n")

    # Context (trimmable — these can be shortened if prompt is too long)
    if wiki_context:
        context_indices.append(len(parts))
        parts.append("## WIKIPEDIA MEDICAL INFORMATION\n" + wiki_context + "\n")
    if fda_context:
        context_indices.append(len(parts))
        parts.append("## FDA DRUG LABEL INFORMATION\n" + fda_context + "\n")

    if not wiki_context and not fda_context:
        parts.append(
            "No specific medical sources were found for this query. "
            "Answer using your general medical knowledge.\n"
        )

    # User query — wrapped in delimiters to mitigate prompt injection
    parts.append(
        "## USER'S QUESTION\n"
        "--- BEGIN USER INPUT ---\n"
        + user_query +
        "\n--- END USER INPUT ---\n"
    )

    # Answering guidance
    parts.append(
        "Answer the user's question in detail using well-structured markdown. "
        "Formatting rules:\n"
        "- Use **bold** for key medical terms on first mention.\n"
        "- Use headers (## or ###) to organize sections when the answer is long.\n"
        "- Use bullet points (- ) for lists of symptoms, side effects, or recommendations.\n"
        "- Use numbered lists for step-by-step instructions or ranked information.\n"
        "- Use > blockquotes for important warnings or key takeaways.\n"
        "- Keep paragraphs concise (2-4 sentences each).\n"
        "- If comparing options, use a markdown table.\n\n"
        "CRITICAL: You MUST cite sources by inserting [[CITATION:X]] markers "
        "after sentences that use information from the context above. "
        "X must match the CITATION number from the context (e.g. [[CITATION:1]]). "
        "Place at least one citation per major claim. "
        "End with a brief medical disclaimer."
    )

    prompt = "\n".join(parts)
    word_count = len(prompt.split())

    if word_count > MAX_PROMPT_WORDS:
        logger.warning(
            "Prompt is %d words (limit ~%d) — model may truncate context.",
            word_count, MAX_PROMPT_WORDS,
        )

    # Hard-truncate context sections if prompt exceeds safe limit for num_ctx
    if word_count > PROMPT_HARD_LIMIT_WORDS and context_indices:
        excess_words = word_count - PROMPT_HARD_LIMIT_WORDS
        # Trim from the last context section (FDA, then Wiki) backwards
        for idx in reversed(context_indices):
            if excess_words <= 0:
                break
            section_words = len(parts[idx].split())
            # Keep the header line, trim the body
            lines = parts[idx].split("\n", 1)
            if len(lines) > 1:
                header, body = lines[0], lines[1]
                body_words = len(body.split())
                trim = min(excess_words, body_words - 50)  # keep at least 50 words
                if trim > 0:
                    trimmed_body = " ".join(body.split()[: body_words - trim])
                    parts[idx] = header + "\n" + trimmed_body + "\n\n[...truncated to fit context window...]"
                    excess_words -= trim
                    logger.warning(
                        "Truncated context section at index %d by ~%d words to fit num_ctx=%d",
                        idx, trim, OLLAMA_NUM_CTX,
                    )

        prompt = "\n".join(parts)

    return prompt


# ── main entry point ────────────────────────────────────────────────────────

async def run(query: str, session_id: str, user_id: str = "") -> AsyncGenerator[str, None]:
    """Answer a medical question, yielding SSE events.

    Always searches Wikipedia and OpenFDA regardless of query content.
    No keyword classification — the model handles everything.
    """
    set_request_id(uuid.uuid4().hex[:8])

    # Sanitize session_id — only allow alphanumeric, hyphens, underscores
    session_id = re.sub(r'[^a-zA-Z0-9_-]', '', session_id)[:128]

    logger.info("Request: query=%r session=%s", query, session_id)

    # ── Phase 1: Wikipedia (full query) ────────────────────────────────
    wiki_articles = await search_wikipedia(query, max_results=3)
    wiki_extracts: dict[int, str] = {}

    if wiki_articles:
        page_ids = [a["pageid"] for a in wiki_articles if a.get("pageid")]
        wiki_extracts = await get_wiki_extracts(page_ids)

    # ── Phase 2: Extract drug names ─────────────────────────────────────
    # From the user's query itself (capitalized words = likely drug names)
    query_drugs = _extract_drug_names_from_text(query)

    # From Wiki text + article titles (if we found articles)
    wiki_titles = [a.get("title", "") for a in wiki_articles]
    all_wiki_text = " ".join(wiki_extracts.values())
    wiki_drugs = _extract_drug_names_from_text(all_wiki_text, extra=wiki_titles)

    # Merge: query drugs first, then wiki supplements
    drug_names = list(dict.fromkeys(query_drugs + wiki_drugs))[:4]

    logger.info("Extracted drug names: query=%s wiki=%s final=%s",
                query_drugs, wiki_drugs, drug_names)

    # If Wikipedia found nothing, try searching for the drug names directly
    if not wiki_articles and drug_names:
        existing_ids: set[int] = set()
        for name in drug_names[:2]:
            name_articles = await search_wikipedia(
                f"{name} medication", max_results=2
            )
            for a in name_articles:
                pid = a.get("pageid")
                if pid and pid not in existing_ids:
                    existing_ids.add(pid)
                    wiki_articles.append(a)
        if wiki_articles:
            page_ids = [a["pageid"] for a in wiki_articles if a.get("pageid")]
            wiki_extracts = await get_wiki_extracts(page_ids)

    # ── Phase 3: OpenFDA ────────────────────────────────────────────────
    openfda_results: list[dict] = []
    if drug_names:
        tasks = [asyncio.create_task(search_openfda(name)) for name in drug_names]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        openfda_results = [
            r for r in results
            if isinstance(r, dict) and not r.get("not_found")
        ]

    # ── Phase 4: Citation metadata ──────────────────────────────────────
    citations: list[dict] = []
    cite_index = 1

    for article in wiki_articles:
        citations.append({
            "index": cite_index,
            "url": article.get("url", ""),
            "title": article.get("title", ""),
            "source": "wikipedia",
        })
        cite_index += 1

    for fda_result in openfda_results:
        drug_name = fda_result.get("drug_name", "")
        citations.append({
            "index": cite_index,
            "url": fda_result.get("source_url", ""),
            "title": f"FDA Label: {drug_name}",
            "source": "fda",
        })
        cite_index += 1

    # ── Phase 5: Build prompt ───────────────────────────────────────────
    wiki_context = _format_wiki_context(wiki_articles, wiki_extracts)

    wiki_count = len(wiki_articles)
    fda_parts: list[str] = []
    for i, fda_result in enumerate(openfda_results):
        ctx = _format_fda_context(fda_result, citation_index=wiki_count + i + 1)
        if ctx:
            fda_parts.append(ctx)
    fda_context = "\n\n".join(fda_parts)

    history = await session_store.get_history(session_id) if session_id else ""

    prompt = _build_prompt(
        user_query=query,
        wiki_context=wiki_context,
        fda_context=fda_context,
        conversation_history=history,
    )

    # ── Phase 6: Stream ─────────────────────────────────────────────────
    full_text = ""

    # 7a — citation metadata
    for citation in citations:
        yield _sse_event("citation", citation)

    # 7b — info
    if drug_names:
        yield _sse_event("info", {
            "message": f"Looked up information on: {', '.join(drug_names)}",
        })

    # 7c — warning if nothing found
    if not wiki_articles and not openfda_results:
        yield _sse_event("warning", {
            "message": (
                "Limited medical information found. "
                "Please see a doctor for proper diagnosis."
            ),
        })

    # 7d — token stream from Ollama (filter thinking tokens in real-time)
    # MedGemma emits <unusedN>...<unusedN> thinking blocks.  We buffer
    # until the closing tag appears, then stream only the post-thinking text.
    _think_buf = ""
    _past_thinking = False
    async for event_type, data in _stream_ollama(prompt):
        if event_type != "token":
            yield _sse_event(event_type, data)
            continue
        token_text = data.get("text", "")
        full_text += token_text
        if _past_thinking:
            yield _sse_event("token", {"text": token_text})
            continue
        _think_buf += token_text
        # Check if we've collected the full thinking block (two <unused> tags)
        tags = list(re.finditer(r"<unused\d+>", _think_buf))
        if len(tags) >= 2:
            # Thinking block complete — emit only text after the closing tag
            _past_thinking = True
            after = _think_buf[tags[1].end():]
            if after:
                yield _sse_event("token", {"text": after})
        elif len(tags) == 0 and len(_think_buf) > 1000:
            # No thinking tags after 1000+ chars — model isn't using thinking blocks
            _past_thinking = True
            yield _sse_event("token", {"text": _think_buf})
        # else: keep buffering — waiting for more tokens or a second tag

    # Flush any remaining buffered content (stream ended while still buffering)
    if not _past_thinking and _think_buf:
        cleaned_buf = _strip_thinking_tokens(_think_buf)
        if cleaned_buf:
            yield _sse_event("token", {"text": cleaned_buf})

    # 7e — strip thinking tokens, prompt leaks, citation post-processing + done
    full_text = _strip_thinking_tokens(full_text)
    full_text = _strip_prompt_leaks(full_text)
    full_text = _normalize_citation_markers(full_text)
    used_indices = _extract_citations(full_text)
    used_citations = [c for c in citations if c["index"] in used_indices]

    yield _sse_event("done", {
        "full_text": full_text,
        "citations": used_citations,
    })

    # ── Phase 7: Persist conversation ───────────────────────────────────
    if session_id:
        await session_store.save(session_id, "user", query, user_id)
        await session_store.save(
            session_id, "assistant", full_text, user_id,
            citations_json=json.dumps(used_citations) if used_citations else None,
        )

    logger.info(
        "Response complete: tokens=%d citations=%d used=%d wiki=%d fda=%d",
        len(full_text.split()), len(citations), len(used_indices),
        len(wiki_articles), len(openfda_results),
    )
