"""Runtime configuration read from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from jobs_radar import __version__

DEFAULT_SQLITE_URL = "sqlite:///data/jobs.db"
REPO_URL = "https://github.com/lucaswsanchez/junior-tech-jobs-radar"
USER_AGENT = f"junior-tech-jobs-radar/{__version__} (+{REPO_URL})"

# Search terms sent to sources that support full-text search.
DEFAULT_QUERIES: tuple[str, ...] = (
    "junior",
    "trainee",
    "entry level",
    "qa",
    "support",
    "data analyst",
    "developer",
)


def normalize_database_url(url: str) -> str:
    """Force the psycopg (v3) driver for PostgreSQL URLs.

    Providers such as Supabase hand out ``postgresql://`` or ``postgres://`` URLs,
    which SQLAlchemy would map to psycopg2 by default.
    """
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


@dataclass(frozen=True)
class Settings:
    database_url: str = DEFAULT_SQLITE_URL
    request_delay_seconds: float = 1.0
    log_level: str = "INFO"
    queries: tuple[str, ...] = field(default=DEFAULT_QUERIES)

    @classmethod
    def from_env(cls) -> Settings:
        return cls(
            database_url=normalize_database_url(os.getenv("DATABASE_URL") or DEFAULT_SQLITE_URL),
            request_delay_seconds=float(os.getenv("REQUEST_DELAY_SECONDS", "1.0")),
            log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
        )
