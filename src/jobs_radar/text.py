"""Small text helpers: HTML stripping and mojibake repair."""

from __future__ import annotations

import html
import re

_TAG_RE = re.compile(r"<[^>]+>|<[^>]*$")
_BLOCK_TAG_RE = re.compile(r"</?(?:p|br|li|ul|ol|div|h[1-6])[^>]*>", re.IGNORECASE)
_WS_RE = re.compile(r"[ \t\r\f\v\u00a0\u200b]+")
_MOJIBAKE_MARKERS = ("Ã", "â€", "â\x80", "Â")


def fix_mojibake(text: str) -> str:
    """Repair UTF-8 text that was decoded as Latin-1 (e.g. ``MÃ¼nchen`` -> ``München``)."""
    if not any(marker in text for marker in _MOJIBAKE_MARKERS):
        return text
    for codec in ("latin-1", "cp1252"):
        try:
            return text.encode(codec).decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            continue
    return text


def html_to_text(raw: str | None) -> str:
    """Convert an HTML fragment to readable plain text."""
    if not raw:
        return ""
    text = _BLOCK_TAG_RE.sub("\n", raw)
    text = _TAG_RE.sub(" ", text)
    text = fix_mojibake(html.unescape(text))
    lines = (_WS_RE.sub(" ", line).strip() for line in text.splitlines())
    return "\n".join(line for line in lines if line)


def clean_inline(raw: str | None) -> str:
    """Single-line cleanup for titles, company names and locations."""
    return " ".join(html_to_text(raw).split())
