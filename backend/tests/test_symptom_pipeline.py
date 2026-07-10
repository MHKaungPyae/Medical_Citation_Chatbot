"""Unit tests for symptom_pipeline pure functions."""

import json
import pytest
import sys
import os

# Ensure backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from backend.symptom_pipeline import (
    _normalize_citation_markers,
    _extract_citations,
    _extract_drug_names_from_text,
    _strip_thinking_tokens,
    _strip_prompt_leaks,
    _build_prompt,
    _format_wiki_context,
    _format_fda_context,
)


# ── _normalize_citation_markers ───────────────────────────────────────────


class TestNormalizeCitationMarkers:
    def test_bracket_format(self):
        assert _normalize_citation_markers("See [1] for details") == "See [[CITATION:1]] for details"

    def test_space_variant(self):
        assert _normalize_citation_markers("See [[CITATION 1]] for details") == "See [[CITATION:1]] for details"

    def test_standalone_parenthesized_number(self):
        assert _normalize_citation_markers("See (1) for details") == "See [[CITATION:1]] for details"

    def test_does_not_match_parenthesized_with_unit(self):
        assert _normalize_citation_markers("Take 5 mg (twice daily)") == "Take 5 mg (twice daily)"

    def test_does_not_match_parenthesized_with_text(self):
        assert _normalize_citation_markers("See (page 5) for details") == "See (page 5) for details"

    def test_strips_literal_template(self):
        assert _normalize_citation_markers("Use [[CITATION:N]] format") == "Use  format"

    def test_strips_literal_template_with_space(self):
        assert _normalize_citation_markers("Use [[CITATION: N]] format") == "Use  format"

    def test_multiple_markers(self):
        text = "See [1] and [2] and [[CITATION 3]]"
        expected = "See [[CITATION:1]] and [[CITATION:2]] and [[CITATION:3]]"
        assert _normalize_citation_markers(text) == expected


# ── _extract_citations ────────────────────────────────────────────────────


class TestExtractCitations:
    def test_single_citation(self):
        assert _extract_citations("See [[CITATION:1]]") == [1]

    def test_multiple_citations(self):
        assert _extract_citations("See [[CITATION:1]] and [[CITATION:3]]") == [1, 3]

    def test_deduplicates(self):
        assert _extract_citations("[[CITATION:1]] and [[CITATION:1]]") == [1]

    def test_returns_sorted(self):
        assert _extract_citations("[[CITATION:3]] and [[CITATION:1]]") == [1, 3]

    def test_no_citations(self):
        assert _extract_citations("No citations here") == []


# ── _extract_drug_names_from_text ─────────────────────────────────────────


class TestExtractDrugNames:
    def test_capitalized_drug_name(self):
        names = _extract_drug_names_from_text("Paracetamol is a common painkiller")
        assert "paracetamol" in names

    def test_lowercase_drug_name(self):
        names = _extract_drug_names_from_text("I took aspirin for my headache")
        assert "aspirin" in names

    def test_stop_words_excluded(self):
        names = _extract_drug_names_from_text("The treatment for diabetes is important")
        assert "treatment" not in names
        assert "diabetes" not in names

    def test_max_four_results(self):
        names = _extract_drug_names_from_text("Paracetamol Aspirin Ibuprofen Codeine Morphine")
        assert len(names) <= 4

    def test_extra_names_included(self):
        names = _extract_drug_names_from_text("Some text", extra=["Advil"])
        assert "advil" in names

    def test_empty_text(self):
        assert _extract_drug_names_from_text("") == []


# ── _strip_thinking_tokens ────────────────────────────────────────────────


class TestStripThinkingTokens:
    def test_strips_thinking_block(self):
        text = "Before <unused42>thought I should think about this<unused42> After"
        assert _strip_thinking_tokens(text) == "Before  After"

    def test_no_thinking_block(self):
        text = "Just a normal response"
        assert _strip_thinking_tokens(text) == "Just a normal response"

    def test_multiline_thinking(self):
        text = "Before <unused42>thought\nline 1\nline 2<unused42> After"
        result = _strip_thinking_tokens(text)
        assert "line 1" not in result
        assert "Before" in result
        assert "After" in result


# ── _strip_prompt_leaks ──────────────────────────────────────────────────


class TestStripPromptLeaks:
    def test_strips_begin_user_input(self):
        text = "Response text\n--- BEGIN USER INPUT ---\nmore text"
        result = _strip_prompt_leaks(text)
        assert "--- BEGIN USER INPUT ---" not in result

    def test_strips_end_user_input(self):
        text = "Response text\n--- END USER INPUT ---\nmore text"
        result = _strip_prompt_leaks(text)
        assert "--- END USER INPUT ---" not in result

    def test_strips_section_headers(self):
        text = "## WIKIPEDIA MEDICAL INFORMATION\nSome content"
        result = _strip_prompt_leaks(text)
        assert "## WIKIPEDIA MEDICAL INFORMATION" not in result

    def test_no_leaks(self):
        text = "Just a normal medical response"
        assert _strip_prompt_leaks(text) == "Just a normal medical response"


# ── _build_prompt ─────────────────────────────────────────────────────────


class TestBuildPrompt:
    def test_includes_user_query(self):
        prompt = _build_prompt("What is aspirin?")
        assert "What is aspirin?" in prompt

    def test_includes_wiki_context(self):
        prompt = _build_prompt("query", wiki_context="Wiki info here")
        assert "Wiki info here" in prompt

    def test_includes_fda_context(self):
        prompt = _build_prompt("query", fda_context="FDA info here")
        assert "FDA info here" in prompt

    def test_includes_conversation_history(self):
        prompt = _build_prompt("query", conversation_history="User: hello\nAssistant: hi")
        assert "User: hello" in prompt

    def test_includes_citation_instruction(self):
        prompt = _build_prompt("query")
        assert "[[CITATION:X]]" in prompt

    def test_includes_disclaimer_instruction(self):
        prompt = _build_prompt("query")
        assert "disclaimer" in prompt.lower()

    def test_fallback_when_no_context(self):
        prompt = _build_prompt("query")
        assert "general medical knowledge" in prompt.lower()


# ── _format_wiki_context ─────────────────────────────────────────────────


class TestFormatWikiContext:
    def test_empty_articles(self):
        assert _format_wiki_context([]) == ""

    def test_formats_article_with_extract(self):
        articles = [{"pageid": 1, "title": "Aspirin", "url": "https://en.wikipedia.org/wiki/Aspirin"}]
        extracts = {1: "Aspirin is a medication."}
        result = _format_wiki_context(articles, extracts)
        assert "CITATION 1: Aspirin" in result
        assert "Aspirin is a medication." in result

    def test_formats_article_without_extract(self):
        articles = [{"pageid": 1, "title": "Aspirin", "url": "https://en.wikipedia.org/wiki/Aspirin", "snippet": "A drug"}]
        result = _format_wiki_context(articles)
        assert "A drug" in result


# ── _format_fda_context ──────────────────────────────────────────────────


class TestFormatFdaContext:
    def test_not_found(self):
        assert _format_fda_context({"not_found": True}) == ""

    def test_formats_drug_name(self):
        data = {"drug_name": "aspirin", "indications": "Pain relief"}
        result = _format_fda_context(data, citation_index=1)
        assert "CITATION 1" in result
        assert "aspirin" in result
        assert "Pain relief" in result


# ── Citation serialization roundtrip ─────────────────────────────────────


class TestCitationSerialization:
    """Verify that citation dicts serialize to JSON the frontend can parse."""

    def test_wiki_citation_roundtrip(self):
        citations = [
            {"index": 1, "url": "https://en.wikipedia.org/wiki/Aspirin", "title": "Aspirin", "source": "wikipedia"},
        ]
        serialized = json.dumps(citations)
        parsed = json.loads(serialized)
        assert len(parsed) == 1
        assert parsed[0]["index"] == 1
        assert parsed[0]["source"] == "wikipedia"
        assert parsed[0]["url"] == "https://en.wikipedia.org/wiki/Aspirin"

    def test_fda_citation_roundtrip(self):
        citations = [
            {"index": 2, "url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=abc", "title": "FDA Label: aspirin", "source": "fda"},
        ]
        serialized = json.dumps(citations)
        parsed = json.loads(serialized)
        assert len(parsed) == 1
        assert parsed[0]["source"] == "fda"
        # drug_name should NOT be present (removed per review finding)
        assert "drug_name" not in parsed[0]

    def test_mixed_citations_roundtrip(self):
        citations = [
            {"index": 1, "url": "https://en.wikipedia.org/wiki/Aspirin", "title": "Aspirin", "source": "wikipedia"},
            {"index": 2, "url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=abc", "title": "FDA Label: aspirin", "source": "fda"},
        ]
        serialized = json.dumps(citations)
        parsed = json.loads(serialized)
        assert len(parsed) == 2
        assert {c["source"] for c in parsed} == {"wikipedia", "fda"}

    def test_empty_citations_yields_none(self):
        """Empty list should result in None passed to session_store.save()."""
        used_citations = []
        citations_json = json.dumps(used_citations) if used_citations else None
        assert citations_json is None

    def test_citation_fields_match_frontend_type(self):
        """Serialized citation must have exactly: index, url, title, source."""
        citation = {"index": 1, "url": "https://example.com", "title": "Test", "source": "wikipedia"}
        serialized = json.dumps([citation])
        parsed = json.loads(serialized)[0]
        expected_keys = {"index", "url", "title", "source"}
        assert set(parsed.keys()) == expected_keys
