"""Jobicy (https://jobicy.com) public remote-jobs API connector.

Jobicy asks API users to credit it with a link and to send applicants to the original job
URL; the dashboard links every posting to ``url`` and the methodology page credits it.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime

from jobs_radar.extract.base import RawItem, Source
from jobs_radar.models import JobPosting
from jobs_radar.text import clean_inline, html_to_text

API_URL = "https://jobicy.com/api/v2/remote-jobs"
# Region filters that include candidates based in Argentina. The feed has no full-text
# search, so the shared queries are not used; repeats across regions collapse by id.
GEOS = ("argentina", "latam")
MAX_COUNT = 100
# "Any" means the employer did not set a level: leave the decision to the title.
NO_LEVEL = {"any", ""}


class JobicySource(Source):
    name = "Jobicy"
    homepage = "https://jobicy.com"

    def fetch(self) -> Iterator[RawItem]:
        for geo in GEOS:
            payload = self.client.get_json(API_URL, params={"count": MAX_COUNT, "geo": geo})
            yield from payload.get("jobs") or []

    def parse(self, item: RawItem) -> JobPosting | None:
        geo = ", ".join(part.strip() for part in str(item.get("jobGeo") or "").split(","))
        location = clean_inline(geo)
        if not location or location.lower() == "anywhere":
            location = "Worldwide"
        level = clean_inline(item.get("jobLevel"))
        published = item.get("pubDate")
        published_at = datetime.fromisoformat(published) if published else None
        if published_at is not None and published_at.tzinfo is None:
            published_at = published_at.replace(tzinfo=UTC)
        return JobPosting(
            source=self.name,
            source_id=str(item["id"]),
            url=item["url"],
            title=clean_inline(item["jobTitle"]),
            company=clean_inline(item.get("companyName")),
            location=location,
            remote=True,
            published_at=published_at,
            description=html_to_text(item.get("jobDescription"))
            or clean_inline(item.get("jobExcerpt")),
            tags=[clean_inline(t) for t in item.get("jobIndustry") or []],
            seniority_hint=None if level.lower() in NO_LEVEL else level,
        )
