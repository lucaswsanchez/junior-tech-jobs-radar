from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from jobs_radar.models import JobPosting


def make_posting(**overrides: Any) -> JobPosting:
    data: dict[str, Any] = {
        "source": "Remotive",
        "source_id": "1",
        "url": "https://example.com/jobs/1",
        "title": "Junior Python Developer",
        "company": "Acme",
        "location": "Worldwide",
        "remote": True,
        "published_at": datetime(2026, 11, 10, tzinfo=UTC),
        "description": "We build APIs with Python and PostgreSQL.",
    }
    data.update(overrides)
    return JobPosting(**data)
