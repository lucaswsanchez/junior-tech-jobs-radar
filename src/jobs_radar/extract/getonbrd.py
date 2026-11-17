"""Get on Board (https://www.getonbrd.com) public API connector."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime

from jobs_radar.extract.base import RawItem, Source
from jobs_radar.models import JobPosting
from jobs_radar.text import clean_inline, html_to_text

API_URL = "https://www.getonbrd.com/api/v0/search/jobs"
MAX_PAGES = 3

# attributes.seniority.data.id
SENIORITY_LABELS = {1: "No experience", 2: "Junior", 3: "Semi Senior", 4: "Senior", 5: "Expert"}
LANGUAGES = {"en": "en", "es": "es"}


class GetOnBoardSource(Source):
    name = "Get on Board"
    homepage = "https://www.getonbrd.com"

    def fetch(self) -> Iterator[RawItem]:
        for query in self.queries:
            for page in range(1, MAX_PAGES + 1):
                payload = self.client.get_json(
                    API_URL,
                    params={
                        "query": query,
                        "per_page": 100,
                        "page": page,
                        "expand": '["company"]',
                    },
                )
                yield from payload.get("data", [])
                if page >= payload.get("meta", {}).get("total_pages", 1):
                    break

    def parse(self, item: RawItem) -> JobPosting | None:
        attrs = item["attributes"]
        seniority_id = ((attrs.get("seniority") or {}).get("data") or {}).get("id")
        company = ((attrs.get("company") or {}).get("data") or {}).get("attributes") or {}
        modality = attrs.get("remote_modality") or ""
        countries = [c for c in attrs.get("countries") or [] if c]
        if modality == "fully_remote" and countries in ([], ["Remote"]):
            location = "Worldwide"
        else:
            location = ", ".join(countries)
            if modality == "remote_local":
                location += " (remote, local residents only)"
        sections = (attrs.get(k) for k in ("description", "functions", "desirable", "projects"))
        published = attrs.get("published_at")
        return JobPosting(
            source=self.name,
            source_id=str(item["id"]),
            url=item["links"]["public_url"],
            title=clean_inline(attrs["title"]),
            company=clean_inline(company.get("name")),
            location=location,
            remote=modality in {"fully_remote", "remote_local"},
            published_at=datetime.fromtimestamp(published, tz=UTC) if published else None,
            description="\n".join(html_to_text(s) for s in sections if s),
            tags=[t for t in [attrs.get("category_name")] if t],
            seniority_hint=SENIORITY_LABELS.get(seniority_id) if seniority_id else None,
            language_hint=LANGUAGES.get(attrs.get("lang") or ""),
        )
