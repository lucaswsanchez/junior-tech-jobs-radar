"""Location filter: keep jobs that accept candidates based in Argentina."""

from __future__ import annotations

import re

from jobs_radar.models import JobPosting

ARGENTINA = "Argentina"
LATAM = "LATAM"
WORLDWIDE = "Worldwide"

_I = re.IGNORECASE
_ARGENTINA_RE = re.compile(
    r"\bargentin|buenos\s+aires|\bcaba\b|c[oó]rdoba|rosario|mendoza|corrientes|tucum[aá]n", _I
)
_LATAM_RE = re.compile(
    r"\blatam\b|latin\s*america|latinoam[eé]rica|am[eé]rica\s+latina|south\s+america|"
    r"sudam[eé]rica|\bamericas\b|\blac\b",
    _I,
)
_WORLDWIDE_RE = re.compile(
    r"worldwide|anywhere|\bglobal\b|\bworld\b|international|all\s+countries|^remote$", _I
)


def classify_location(posting: JobPosting) -> str | None:
    """Return ``Argentina``, ``LATAM`` or ``Worldwide``; ``None`` if Argentina is not eligible.

    ``Argentina`` means the posting explicitly lists Argentina (on-site, hybrid or remote).
    """
    location = posting.location.strip()
    if _ARGENTINA_RE.search(location):
        return ARGENTINA
    if not posting.remote:
        return None
    if _LATAM_RE.search(location):
        return LATAM
    if _WORLDWIDE_RE.search(location):
        return WORLDWIDE
    return None
