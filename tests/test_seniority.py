import pytest

from jobs_radar.transform.seniority import (
    ENTRY_LEVEL,
    JUNIOR,
    classify_seniority,
    years_required,
)
from tests.factories import make_posting


@pytest.mark.parametrize(
    ("title", "expected"),
    [
        ("Junior Python Developer", JUNIOR),
        ("Jr. QA Analyst", JUNIOR),
        ("Desarrollador Jr", JUNIOR),
        ("Software Engineer I", JUNIOR),
        ("Associate Data Analyst", JUNIOR),
        ("IT Support Trainee", ENTRY_LEVEL),
        ("Data Engineering Intern", ENTRY_LEVEL),
        ("Entry-Level Help Desk Technician", ENTRY_LEVEL),
        ("Junior Project Manager", JUNIOR),
        ("Junior Lead Generation Specialist", JUNIOR),
        ("Senior Backend Engineer", None),
        ("Sr. Frontend Developer", None),
        ("Semi Senior QA Automation", None),
        ("Tech Lead Full-Stack Rails Engineer", None),
        ("Engineering Manager", None),
        ("Head of Data", None),
        ("Staff Software Engineer", None),
        ("Software Engineer II", None),
        ("Solutions Architect", None),
        ("Junior to Senior Developer (all levels)", None),
    ],
)
def test_title_rules(title: str, expected: str | None) -> None:
    assert classify_seniority(make_posting(title=title)) == expected


def test_neutral_title_needs_entry_level_text() -> None:
    neutral = make_posting(title="Python Developer", description="Great team, remote work.")
    entry = make_posting(
        title="Python Developer", description="This is an entry-level role, training provided."
    )
    assert classify_seniority(neutral) is None
    assert classify_seniority(entry) == ENTRY_LEVEL


def test_mentoring_juniors_is_not_an_entry_signal() -> None:
    posting = make_posting(title="Backend Developer", description="You will mentor junior devs.")
    assert classify_seniority(posting) is None


@pytest.mark.parametrize(
    ("hint", "expected"),
    [
        ("No experience", ENTRY_LEVEL),
        ("Junior", JUNIOR),
        ("Entry-level", ENTRY_LEVEL),
        ("Entry-level, Mid-level", ENTRY_LEVEL),
        ("Semi Senior", None),
        ("Senior", None),
        ("Mid-level", None),
    ],
)
def test_structured_source_hint_wins(hint: str, expected: str | None) -> None:
    posting = make_posting(title="QA Analyst", seniority_hint=hint)
    assert classify_seniority(posting) == expected


def test_senior_title_overrides_junior_hint() -> None:
    posting = make_posting(title="Head of SEO", seniority_hint="Junior")
    assert classify_seniority(posting) is None


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Requirements: 3+ years of experience with React.", 3),
        ("2-4 years of professional experience", 2),
        ("Mínimo 5 años de experiencia en Java", 5),
        ("1+ years experience; 4 years of hands-on experience in SQL", 4),
        ("Experiencia: 0 a 2 años de experiencia en seguridad", 0),
        ("No experience needed.", None),
        ("We have been in business for 30 years of experience", None),
    ],
)
def test_years_required(text: str, expected: int | None) -> None:
    assert years_required(text) == expected


def test_junior_title_with_too_many_years_is_excluded() -> None:
    posting = make_posting(
        title="Junior Developer", description="You need 5+ years of experience in .NET."
    )
    assert classify_seniority(posting) is None
