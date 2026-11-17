import pytest

from jobs_radar.models import ROLE_TYPES
from jobs_radar.transform.language import EN, ES, detect_language
from jobs_radar.transform.roles import ROLE_RULES, classify_role


@pytest.mark.parametrize(
    ("title", "expected"),
    [
        ("Junior Python Developer", "Development"),
        ("Desarrollador Frontend Jr", "Development"),
        ("Analista de sistemas Jr", "Development"),
        ("Junior QA Engineer", "QA"),
        ("QA Automation Trainee", "QA"),
        ("Manual Tester", "QA"),
        ("Junior Data Analyst", "Data"),
        ("Business Intelligence Intern", "Data"),
        ("Data Entry Clerk", "Admin/VA"),
        ("Virtual Assistant (Remote)", "Admin/VA"),
        ("Customer Support Representative", "Admin/VA"),
        ("IT Support Technician", "IT Support"),
        ("Help Desk Analyst", "IT Support"),
        ("Soporte Técnico Jr", "IT Support"),
        ("Infosec Analyst I", "IT Support"),
        ("AI Trainer - Spanish", "AI/Annotation"),
        ("Data Annotation Specialist", "AI/Annotation"),
        ("Junior Accountant", "Other"),
        ("Sales Development Representative", "Other"),
        ("Business Development Intern", "Other"),
        ("Remote Sales Rep - Free AI Training", "Other"),
        ("Language Data Quality Reviewer", "AI/Annotation"),
    ],
)
def test_classify_role_from_title(title: str, expected: str) -> None:
    assert classify_role(title) == expected


def test_classify_role_falls_back_to_tags() -> None:
    assert classify_role("Junior Associate", ["Software Development"]) == "Development"
    assert classify_role("Junior Associate", ["Unknown"]) == "Other"


def test_rules_only_use_known_role_types() -> None:
    assert {role for role, _ in ROLE_RULES} <= set(ROLE_TYPES)


def test_detect_language() -> None:
    assert detect_language("We are looking for a junior developer to join our team") == EN
    assert detect_language("Buscamos un desarrollador junior para el equipo de trabajo") == ES
    assert detect_language("") == EN


def test_language_hint_wins() -> None:
    assert detect_language("Buscamos un desarrollador para el equipo", hint="en") == EN
    assert detect_language("Some text", hint="lang_not_specified") == EN
