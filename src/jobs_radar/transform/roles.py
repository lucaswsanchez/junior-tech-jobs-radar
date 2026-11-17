"""Role type classification from the job title (falling back to source tags)."""

from __future__ import annotations

import re
from collections.abc import Sequence

_I = re.IGNORECASE

# Junior roles that are clearly outside tech (sales, marketing, finance...). They are
# classified as "Other" and dropped by the pipeline even if they mention a tool.
NON_TECH_TITLE = re.compile(
    r"\bsales\b|\bventas\b|business\s+development|\bsdr\b|\bbdr\b|marketing|\bmedia\b|"
    r"account\s+(?:executive|manager)|recruit|talent\s+acquisition|\bhr\b|human\s+resources|"
    r"accountant|accounting|contador|contable|\bfinance\b|financial|legal|lawyer|paralegal|"
    r"construction|estimator|patient\s+care|nurse|transport|logistics|copywriter|"
    r"content\s+creator|social\s+media|ejecutivo|growth",
    re.IGNORECASE,
)


def is_non_tech_title(title: str) -> bool:
    return bool(NON_TECH_TITLE.search(title))


# Order matters: the first matching rule wins ("Data Entry" is Admin, not Data;
# "QA Engineer" is QA, not Development; "Support Engineer" is IT Support).
ROLE_RULES: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "AI/Annotation",
        re.compile(
            r"annotat|label(?:l)?er|label(?:l)?ing|\bai\s+(?:trainer|tutor|rater|evaluator|"
            r"training|data\s+specialist)|\brater\b|\bevaluator\b|prompt\s+engineer|"
            r"\bllm\s+(?:trainer|evaluator)|\brlhf\b|search\s+quality|data\s+contributor|"
            r"language\s+data|transcri|language\s+alignment",
            _I,
        ),
    ),
    (
        "QA",
        re.compile(
            r"\bqa\b|quality\s+assurance|\btester\b|\btesting\b|test\s+(?:automation|engineer|"
            r"analyst)|\bsdet\b|\bqc\b|calidad\s+de\s+software|automatizador",
            _I,
        ),
    ),
    (
        "Admin/VA",
        re.compile(
            r"virtual\s+assistant|asistente\s+virtual|administrative|administrativ[oa]|"
            r"admin(?:istration)?\s+assistant|data\s+entry|executive\s+assistant|"
            r"office\s+assistant|back\s?office|customer\s+(?:service|support|success|care)|"
            r"atenci[oó]n\s+al\s+cliente|e-?commerce\s+assistant|"
            r"\bassistant\b(?!.*\b(?:developer|engineer)\b)",
            _I,
        ),
    ),
    (
        "Data",
        re.compile(
            r"\bdata\b|\bdatos\b|\bbi\b|business\s+intelligence|analytics|\banalista\s+de\s+datos|"
            r"machine\s+learning|\bml\b|scientist|\betl\b|\bpower\s?bi\b|reporting\s+analyst",
            _I,
        ),
    ),
    (
        "IT Support",
        re.compile(
            r"help\s?desk|service\s+desk|it\s+support|technical\s+support|tech\s+support|"
            r"desktop\s+support|soporte|\bsupport\b|\bnoc\b|\bsoc\b|sysadmin|"
            r"system(?:s)?\s+administrator|it\s+technician|t[eé]cnico|infraestructura|"
            r"\bit\s+(?:analyst|specialist|assistant)|network|redes|infosec|"
            r"cyber\s?security|ciberseguridad|security\s+analyst",
            _I,
        ),
    ),
    (
        "Development",
        re.compile(
            r"develop|engineer|programador|programmer|desarrollador|software|front[\s-]?end|"
            r"back[\s-]?end|full[\s-]?stack|devops|\bsre\b|mobile|android|\bios\b|\bweb\b|"
            r"python|java|javascript|react|node|\.net|php|ruby|golang|coder|ingenier[oa]|"
            r"analista\s+de\s+sistemas|systems?\s+analyst|ux|ui\s+designer",
            _I,
        ),
    ),
)

# Source categories that reveal the role when the title is not enough.
_TAG_HINTS: dict[str, str] = {
    "software development": "Development",
    "software-developer": "Development",
    "programming": "Development",
    "devops": "Development",
    "developer": "Development",
    "quality-assurance": "QA",
    "qa": "QA",
    "data": "Data",
    "data analysis": "Data",
    "data-analyst": "Data",
    "customer service": "Admin/VA",
    "customer support": "Admin/VA",
    "it": "IT Support",
    "sys admin": "IT Support",
    "cybersecurity": "IT Support",
    "technical-support": "IT Support",
}


def classify_role(title: str, tags: Sequence[str] = ()) -> str:
    """Return one of the role types in :data:`jobs_radar.models.ROLE_TYPES`."""
    if is_non_tech_title(title):
        return "Other"
    for role, pattern in ROLE_RULES:
        if pattern.search(title):
            return role
    for tag in tags:
        hinted = _TAG_HINTS.get(tag.strip().lower())
        if hinted:
            return hinted
    return "Other"
