"""Cross-source deduplication."""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable

from jobs_radar.models import JobPosting

_NOISE = re.compile(r"\((?:remote|remoto|100% remote|latam|worldwide)[^)]*\)|\bremote\b|\bremoto\b")
_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def normalize_key(text: str) -> str:
    """Lowercase, strip accents, drop 'remote' noise and punctuation."""
    ascii_text = (
        unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii").lower()
    )
    return _NON_ALNUM.sub(" ", _NOISE.sub(" ", ascii_text)).strip()


def dedupe_key(posting: JobPosting) -> str:
    company = normalize_key(posting.company)
    if not company:
        # Without a company we cannot safely match across sources.
        return f"{posting.source}:{posting.source_id}"
    return f"{normalize_key(posting.title)}|{company}"


def dedupe(postings: Iterable[JobPosting]) -> list[JobPosting]:
    """Keep the first posting for each (title, company); input order sets source priority."""
    seen: dict[str, JobPosting] = {}
    for posting in postings:
        seen.setdefault(dedupe_key(posting), posting)
    return list(seen.values())
