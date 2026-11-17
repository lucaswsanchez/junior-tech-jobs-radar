import pytest

from jobs_radar.transform.skills import SKILL_CATEGORIES, SKILLS, extract_skills


def test_dictionary_size_and_unique_names() -> None:
    names = [s.name for s in SKILLS]
    assert len(names) >= 80
    assert len(names) == len(set(names))
    assert set(SKILL_CATEGORIES) == set(names)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Python, SQL and Power BI", {"Python", "SQL", "Power BI"}),
        ("Experience with JavaScript and TypeScript", {"JavaScript", "TypeScript"}),
        ("Backend in Java with Spring Boot", {"Java", "Spring Boot"}),
        ("C#, .NET Core and SQL Server", {"C#", ".NET", "SQL Server", "SQL"}),
        ("Modern C++ (C++17)", {"C++"}),
        ("Frontend with React and Next.js", {"React", "Next.js"}),
        ("Stack: Python, Go, PostgreSQL", {"Python", "Go", "PostgreSQL"}),
        ("We write services in Golang", {"Go"}),
        ("Tools: Python / R / Tableau", {"Python", "R", "Tableau"}),
        ("Experience in R programming", {"R"}),
        ("Node.js REST APIs on AWS with Docker", {"Node.js", "REST APIs", "AWS", "Docker"}),
        ("Cypress or Playwright for E2E tests", {"Cypress", "Playwright"}),
        (
            "Soporte en Windows, Active Directory y redes TCP/IP",
            {"Windows", "Active Directory", "Networking"},
        ),
        ("Metodologías ágiles (Scrum)", {"Agile/Scrum"}),
        ("Data annotation for LLMs", {"Data Annotation", "LLMs"}),
    ],
)
def test_extracts_expected_skills(text: str, expected: set[str]) -> None:
    assert set(extract_skills(text)) == expected


@pytest.mark.parametrize(
    "text",
    [
        "Our go-to-market team will go above and beyond",
        "Let's go! We go fast.",
        "Join our R&D department",
        "Rate: R$ 5.000",
        "You react quickly to customer needs",
        "You will excel at communication",
        "Guard rails and time windows",
        "Each node of the graph",
        "A spring of new ideas",
    ],
)
def test_ambiguous_words_are_not_false_positives(text: str) -> None:
    assert extract_skills(text) == []


def test_java_is_not_matched_inside_javascript() -> None:
    assert extract_skills("JavaScript developer") == ["JavaScript"]


def test_sql_is_not_matched_inside_mysql() -> None:
    assert extract_skills("MySQL") == ["MySQL"]


def test_results_are_sorted_and_unique() -> None:
    assert extract_skills("python Python PYTHON", "SQL") == ["Python", "SQL"]
