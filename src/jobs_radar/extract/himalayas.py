"""Himalayas (https://himalayas.app) public API connector."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime

from jobs_radar.extract.base import RawItem, Source
from jobs_radar.models import JobPosting
from jobs_radar.text import clean_inline, html_to_text

API_URL = "https://himalayas.app/jobs/api/search"
PAGE_SIZE = 20
MAX_PAGES = 4
# Himalayas answers 429 when paged quickly; space its requests out.
MIN_INTERVAL_SECONDS = 3.0


class HimalayasSource(Source):
    name = "Himalayas"
    homepage = "https://himalayas.app"

    def fetch(self) -> Iterator[RawItem]:
        for query in self.queries:
            for page in range(1, MAX_PAGES + 1):
                payload = self.client.get_json(
                    API_URL,
                    params={"q": query, "country": "AR", "page": page},
                    min_interval=MIN_INTERVAL_SECONDS,
                )
                jobs = payload.get("jobs") or []
                yield from jobs
                if len(jobs) < PAGE_SIZE:
                    break

    def parse(self, item: RawItem) -> JobPosting | None:
        restrictions: list[str] = [c for c in item.get("locationRestrictions") or [] if c]
        if not restrictions:
            location = "Worldwide"
        elif len(restrictions) <= 6:
            location = ", ".join(restrictions)
        else:
            # Long lists are regional hiring zones; keep the label readable.
            has_ar = "Argentina" in restrictions
            head = "Argentina, " if has_ar else ""
            location = f"{head}+{len(restrictions) - int(has_ar)} countries"
        published = item.get("pubDate")
        description = html_to_text(item.get("description")) or clean_inline(item.get("excerpt"))
        return JobPosting(
            source=self.name,
            source_id=item.get("guid") or item["applicationLink"],
            url=item["applicationLink"],
            title=clean_inline(item["title"]),
            company=clean_inline(item.get("companyName")),
            location=location,
            remote=True,
            published_at=datetime.fromtimestamp(published, tz=UTC) if published else None,
            description=description,
            tags=list(item.get("categories") or []),
            seniority_hint=", ".join(item.get("seniority") or []) or None,
        )
