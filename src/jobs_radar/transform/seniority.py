"""Seniority classification: keep entry-level and junior roles, drop the rest.

Decision order:
1. A structured seniority field from the source wins (Get on Board, Himalayas).
2. Otherwise the title decides: junior signals keep the job, senior signals drop it.
3. Without a title signal, explicit entry-level phrases in the description keep it.
In every case, a description that asks for 3+ years of experience drops the job.
"""

from __future__ import annotations

import re

from jobs_radar.models import JobPosting

ENTRY_LEVEL = "Entry level"
JUNIOR = "Junior"
MAX_YEARS_REQUIRED = 2

_I = re.IGNORECASE

# Always disqualifying, even next to a junior keyword ("Junior to Senior ...").
STRONG_SENIOR_TITLE = re.compile(
    r"\b(?:senior|sr|semi[\s-]?senior|ssr|principal|staff|director|head\s+of|vp|"
    r"vice\s+president|chief|cto|ceo|cfo|expert|experto)\b",
    _I,
)
# Disqualifying unless the title also carries a junior signal ("Junior Project Manager").
WEAK_SENIOR_TITLE = re.compile(
    r"\b(?:lead|leader|líder|manager|gerente|architect|arquitecto|mid[\s-]?level|"
    r"intermediate|ii|iii|iv)\b",
    _I,
)
ENTRY_TITLE = re.compile(
    r"\b(?:trainee|intern|internship|pasante|pasantía|práctica|praktikum|apprentice|aprendiz|"
    r"becario|graduate|new\s+grad|entry[\s-]?level|sin\s+experiencia|no\s+experience)\b",
    _I,
)
JUNIOR_TITLE = re.compile(r"\b(?:junior|jr|júnior)\b", _I)
LEVEL_ONE_TITLE = re.compile(
    # Case-insensitive role word followed by an uppercase Roman numeral I.
    r"\b(?i:engineer|analyst|developer|technician|specialist|associate|analista|"
    r"desarrollador|técnico)\s+I\b"
)
ASSOCIATE_TITLE = re.compile(r"^associate\b", _I)
ENTRY_TEXT = re.compile(
    r"\b(?:entry[\s-]?level|no\s+(?:prior\s+)?experience\s+(?:is\s+)?(?:required|needed|necessary)|"
    r"recent\s+graduates?|new\s+grads?|sin\s+experiencia|primer\s+empleo|"
    r"0\s*(?:-|\u2013|to|a)\s*[12]\s*(?:years?|años))\b",
    _I,
)
YEARS_REQUIRED = re.compile(
    r"(?P<years>\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|\u2013|to|a)\s*\d{1,2}\s*)?\+?\s*"
    r"(?:years?|yrs?|años)(?:\s+(?:of|de))?(?:\s+[\w/.-]+){0,4}?\s+"
    r"(?:experience|experiencia)",
    _I,
)

# Values used by sources that expose a structured seniority field.
_HINT_ENTRY = {"no experience", "entry-level", "entry level", "internship"}
_HINT_JUNIOR = {"junior"}


def years_required(text: str) -> int | None:
    """Largest minimum number of years of experience the text asks for, if any."""
    values = [int(m.group("years")) for m in YEARS_REQUIRED.finditer(text)]
    values = [v for v in values if v <= 15]  # ignore "20 years of experience" in company blurbs
    return max(values) if values else None


def _from_hint(hint: str) -> str | None:
    """Map a structured source value; returns '' when the hint says the job is too senior."""
    levels = {part.strip().lower() for part in hint.split(",") if part.strip()}
    if levels & _HINT_ENTRY:
        return ENTRY_LEVEL
    if levels & _HINT_JUNIOR:
        return JUNIOR
    return ""


def _from_title(title: str) -> str | None:
    """Returns a level, '' when the title is clearly senior, or None when undecided."""
    if STRONG_SENIOR_TITLE.search(title):
        return ""
    if ENTRY_TITLE.search(title):
        return ENTRY_LEVEL
    if JUNIOR_TITLE.search(title) or LEVEL_ONE_TITLE.search(title):
        return JUNIOR
    if WEAK_SENIOR_TITLE.search(title):
        return ""
    if ASSOCIATE_TITLE.search(title):
        return JUNIOR
    return None


def classify_seniority(posting: JobPosting) -> str | None:
    """Return ``"Entry level"`` or ``"Junior"``, or ``None`` if the job should be excluded."""
    years = years_required(posting.description)
    if years is not None and years > MAX_YEARS_REQUIRED:
        return None

    title_level = _from_title(posting.title)
    if title_level == "":
        return None

    if posting.seniority_hint:
        return _from_hint(posting.seniority_hint) or None

    if title_level:
        return title_level
    if ENTRY_TEXT.search(posting.description):
        return ENTRY_LEVEL
    return None
