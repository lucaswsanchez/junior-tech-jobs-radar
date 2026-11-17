"""Remotive (https://remotive.com) public API connector."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime

from jobs_radar.extract.base import RawItem, Source
from jobs_radar.models import JobPosting
from jobs_radar.text import clean_inline, html_to_text

API_URL = "https://remotive.com/api/remote-jobs"


class RemotiveSource(Source):
    name = "Remotive"
    homepage = "https://remotive.com"

    def fetch(self) -> Iterator[RawItem]:
        for query in self.queries:
            payload = self.client.get_json(API_URL, params={"search": query, "limit": 100})
            yield from payload.get("jobs") or []

    def parse(self, item: RawItem) -> JobPosting | None:
        published = item.get("publication_date")
        published_at = None
        if published:
            published_at = datetime.fromisoformat(published)
            if published_at.tzinfo is None:
                published_at = published_at.replace(tzinfo=UTC)
        category = item.get("category")
        return JobPosting(
            source=self.name,
            source_id=str(item["id"]),
            url=item["url"],
            title=clean_inline(item["title"]),
            company=clean_inline(item.get("company_name")),
            location=clean_inline(item.get("candidate_required_location")) or "Worldwide",
            remote=True,
            published_at=published_at,
            description=html_to_text(item.get("description")),
            tags=[*(item.get("tags") or []), *([category] if category else [])],
        )
