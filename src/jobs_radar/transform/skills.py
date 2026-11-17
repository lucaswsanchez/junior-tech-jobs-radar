"""Technology extraction with a curated dictionary and word-boundary regexes.

Each skill has one or more patterns. Patterns are wrapped in custom boundaries
(``(?<![\\w+#.])`` ... ``(?![\\w+#])``) so ``Java`` does not match ``JavaScript``,
``C`` does not match ``C++`` and ``SQL`` does not match ``MySQL``.

Ambiguous short names (``Go``, ``R``, ``React``, ``Spring``) use stricter,
case-sensitive or context-dependent patterns to avoid false positives such as
"go to market", "R&D" or "react quickly".
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Skill:
    name: str
    category: str
    patterns: tuple[str, ...]
    case_sensitive: bool = False
    regex: re.Pattern[str] = field(init=False, repr=False, compare=False)

    def __post_init__(self) -> None:
        body = "|".join(f"(?:{p})" for p in self.patterns)
        flags = 0 if self.case_sensitive else re.IGNORECASE
        object.__setattr__(self, "regex", re.compile(rf"(?<![\w+#.])(?:{body})(?![\w+#])", flags))


def _s(name: str, category: str, *patterns: str, cs: bool = False) -> Skill:
    return Skill(name, category, patterns or (re.escape(name),), case_sensitive=cs)


LANG = "Languages"
FRONT = "Frontend"
BACK = "Backend"
MOBILE = "Mobile"
DATA = "Data & BI"
AI = "AI & ML"
DB = "Databases"
CLOUD = "Cloud & DevOps"
TEST = "Testing & QA"
IT = "IT & Support"
TOOLS = "Tools & Practices"

# A list separator or start/end of text: used to accept very ambiguous tokens only in lists.
_SEP_BEFORE = r"(?:(?<=[,/|•·:;\n])|(?<=[,/|•·:;]\s)|(?<=\band\s)|(?<=\bor\s)|(?<=\by\s)|^)"
_SEP_AFTER = r"(?=\s*(?:[,/|•·;\n]|\band\b|\bor\b|\by\b|$))"

SKILLS: tuple[Skill, ...] = (
    # Languages
    _s("Python", LANG),
    _s("JavaScript", LANG, r"javascript", r"js", r"ecmascript", r"es6"),
    _s("TypeScript", LANG, r"typescript", r"ts(?=\s*[,/)])"),
    _s("Java", LANG, r"java(?!\s*script)"),
    _s("C#", LANG, r"c#", r"c\s?sharp"),
    _s("C++", LANG, r"c\+\+", r"cpp"),
    _s(
        "Go",
        LANG,
        r"[Gg]olang",
        r"Go(?=\s+(?:developer|engineer|programming|language|lang)\b)",
        _SEP_BEFORE + r"Go" + _SEP_AFTER,
        cs=True,
    ),
    _s("Rust", LANG),
    _s("PHP", LANG),
    _s("Ruby", LANG),
    _s("Kotlin", LANG),
    _s("Swift", LANG, r"Swift", cs=True),
    _s(
        "R",
        LANG,
        r"R(?=\s+(?:programming|language|studio)\b)",
        r"RStudio",
        _SEP_BEFORE + r"R" + _SEP_AFTER,
        cs=True,
    ),
    _s("SQL", LANG, r"sql"),
    _s("Bash", LANG, r"bash", r"shell\s+scripting"),
    _s("PowerShell", LANG, r"powershell"),
    # Frontend
    _s("HTML", FRONT, r"html5?"),
    _s("CSS", FRONT, r"css3?"),
    _s("React", FRONT, r"React(?!\s+(?:to|quickly|fast))", r"(?i:react\.?js)", cs=True),
    _s("Angular", FRONT, r"angular(?:\.?js)?"),
    _s("Vue", FRONT, r"vue(?:\.?js)?"),
    _s("Next.js", FRONT, r"next\.?js"),
    _s("Tailwind CSS", FRONT, r"tailwind(?:\s*css)?"),
    _s("Sass", FRONT, r"sass", r"scss"),
    _s("Redux", FRONT),
    # Backend
    _s("Node.js", BACK, r"node\.?js"),
    _s("Express", BACK, r"express(?:\.?js)"),
    _s("Django", BACK),
    _s("Flask", BACK),
    _s("FastAPI", BACK),
    _s("Spring Boot", BACK, r"spring\s*boot", r"spring\s+framework"),
    _s(".NET", BACK, r"\.net(?:\s*core)?", r"dotnet", r"asp\.net"),
    _s("Laravel", BACK),
    _s("Ruby on Rails", BACK, r"ruby\s+on\s+rails", r"(?-i:Rails|RoR)"),
    _s("REST APIs", BACK, r"rest(?:ful)?(?:\s+apis?)", r"rest(?=\s*/\s*graphql)"),
    _s("GraphQL", BACK),
    # Mobile
    _s("React Native", MOBILE, r"react\s+native"),
    _s("Flutter", MOBILE),
    _s("Android", MOBILE),
    _s("iOS", MOBILE, r"iOS", cs=True),
    # Data & BI
    _s("Excel", DATA, r"(?-i:Excel|EXCEL)"),
    _s("Google Sheets", DATA, r"google\s+sheets"),
    _s("Power BI", DATA, r"power\s?bi"),
    _s("Tableau", DATA),
    _s("Looker", DATA, r"looker(?:\s+studio)?"),
    _s("Pandas", DATA),
    _s("NumPy", DATA),
    _s("Apache Spark", DATA, r"apache\s+spark", r"pyspark", r"spark\s+sql"),
    _s("Airflow", DATA),
    _s("dbt", DATA, r"dbt"),
    _s("ETL", DATA, r"etl", r"elt"),
    _s("Databricks", DATA),
    _s("Snowflake", DATA),
    _s("BigQuery", DATA, r"big\s?query"),
    _s("Statistics", DATA, r"statistics", r"estad[ií]stica"),
    # AI & ML
    _s(
        "Machine Learning",
        AI,
        r"machine\s+learning",
        r"\bml\b(?=\s*(?:models?|engineer|pipelines?|,|/))",
    ),
    _s("Deep Learning", AI, r"deep\s+learning"),
    _s("scikit-learn", AI, r"scikit[\s-]?learn", r"sklearn"),
    _s("TensorFlow", AI),
    _s("PyTorch", AI),
    _s("LLMs", AI, r"llms?", r"large\s+language\s+models?"),
    _s("Generative AI", AI, r"generative\s+ai", r"gen\s?ai"),
    _s("NLP", AI, r"nlp", r"natural\s+language\s+processing"),
    _s("Prompt Engineering", AI, r"prompt\s+engineering", r"prompting"),
    _s("Data Annotation", AI, r"data\s+(?:annotation|labell?ing)", r"annotation"),
    # Databases
    _s("PostgreSQL", DB, r"postgres(?:ql)?"),
    _s("MySQL", DB),
    _s("SQL Server", DB, r"sql\s+server", r"mssql", r"t-sql"),
    _s("Oracle DB", DB, r"oracle\s+(?:db|database|sql|pl/sql)", r"pl/sql"),
    _s("MongoDB", DB, r"mongo(?:db)?"),
    _s("Redis", DB),
    _s("Firebase", DB),
    _s("Elasticsearch", DB, r"elastic\s?search"),
    # Cloud & DevOps
    _s("AWS", CLOUD, r"aws", r"amazon\s+web\s+services"),
    _s("Azure", CLOUD),
    _s("GCP", CLOUD, r"gcp", r"google\s+cloud"),
    _s("Docker", CLOUD),
    _s("Kubernetes", CLOUD, r"kubernetes", r"k8s"),
    _s("Terraform", CLOUD),
    _s("CI/CD", CLOUD, r"ci\s*/\s*cd", r"continuous\s+integration"),
    _s("GitHub Actions", CLOUD, r"github\s+actions"),
    _s("Jenkins", CLOUD),
    _s("Linux", CLOUD, r"linux", r"ubuntu", r"unix"),
    # Testing & QA
    _s("Selenium", TEST),
    _s("Cypress", TEST),
    _s("Playwright", TEST),
    _s("Jest", TEST, r"Jest", cs=True),
    _s("Pytest", TEST),
    _s("JUnit", TEST),
    _s("Postman", TEST),
    _s("Appium", TEST),
    _s("Cucumber", TEST, r"cucumber", r"gherkin", r"bdd"),
    _s(
        "Test Automation",
        TEST,
        r"test\s+automation",
        r"automated\s+testing",
        r"automatizaci[oó]n\s+de\s+pruebas",
    ),
    _s("Manual Testing", TEST, r"manual\s+testing", r"pruebas\s+manuales", r"testing\s+manual"),
    # IT & Support
    _s("Windows", IT, r"(?-i:Windows)(?:\s+server)?"),
    _s("Active Directory", IT, r"active\s+directory"),
    _s(
        "Networking",
        IT,
        r"tcp/ip",
        r"lan/wan",
        r"dns",
        r"dhcp",
        r"vpn",
        r"networking\s+fundamentals",
    ),
    _s("Microsoft 365", IT, r"microsoft\s+365", r"office\s+365", r"m365", r"o365"),
    _s("ITIL", IT),
    _s(
        "Help Desk Tools",
        IT,
        r"zendesk",
        r"freshdesk",
        r"servicenow",
        r"jira\s+service\s+(?:desk|management)",
    ),
    _s("Cybersecurity", IT, r"cyber\s?security", r"ciberseguridad", r"iso\s*27001"),
    # Tools & Practices
    _s("Git", TOOLS),
    _s("GitHub", TOOLS),
    _s("Jira", TOOLS),
    _s("Figma", TOOLS),
    _s("Agile/Scrum", TOOLS, r"scrum", r"agile", r"[aá]gil(?:es)?", r"kanban"),
    _s("Salesforce", TOOLS),
    _s("SAP", TOOLS, r"SAP", cs=True),
)

SKILL_CATEGORIES: dict[str, str] = {skill.name: skill.category for skill in SKILLS}


def extract_skills(*texts: str) -> list[str]:
    """Return the sorted, unique skill names mentioned in any of ``texts``."""
    joined = "\n".join(texts)
    return sorted(skill.name for skill in SKILLS if skill.regex.search(joined))
