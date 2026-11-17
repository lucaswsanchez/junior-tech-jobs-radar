"""Lightweight EN/ES language detection based on stop-word frequency.

A full language-ID model would be overkill: postings are either English or
Spanish, and stop words separate the two reliably on a few hundred words.
"""

from __future__ import annotations

import re

EN = "en"
ES = "es"

_WORD_RE = re.compile(r"[a-záéíóúñü]+", re.IGNORECASE)
_EN_STOPWORDS = frozenset(
    [
        "the",
        "and",
        "of",
        "to",
        "in",
        "for",
        "with",
        "you",
        "we",
        "our",
        "is",
        "are",
        "be",
        "will",
        "on",
        "as",
        "your",
        "this",
        "that",
        "an",
        "or",
        "experience",
        "team",
        "work",
        "skills",
    ]
)
_ES_STOPWORDS = frozenset(
    [
        "el",
        "la",
        "de",
        "que",
        "y",
        "en",
        "los",
        "las",
        "del",
        "para",
        "con",
        "por",
        "una",
        "un",
        "se",
        "su",
        "es",
        "al",
        "lo",
        "como",
        "más",
        "experiencia",
        "equipo",
        "trabajo",
        "conocimientos",
    ]
)


def detect_language(text: str, hint: str | None = None) -> str:
    """Return ``"en"`` or ``"es"``. A reliable source hint wins; ties default to English."""
    if hint in (EN, ES):
        return hint
    words = [w.lower() for w in _WORD_RE.findall(text[:4000])]
    en = sum(w in _EN_STOPWORDS for w in words)
    es = sum(w in _ES_STOPWORDS for w in words)
    return ES if es > en else EN
