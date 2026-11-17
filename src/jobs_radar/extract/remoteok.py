"""RemoteOK (https://remoteok.com) public API connector.

RemoteOK's API terms require linking back to the original posting and naming
RemoteOK as the source; the dashboard always shows both.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime

from jobs_radar.extract.base import RawItem, Source
from jobs_radar.models import JobPosting
from jobs_radar.text import clean_inline, html_to_text

API_URL = "https://remoteok.com/api"
WORLDWIDE_ALIASES = {"", "remote", "anywhere", "anywhere in the world", "worldwide"}


class RemoteOKSource(Source):
    name = "RemoteOK"
    homepage = "https://remoteok.com"

    def fetch(self) -> Iterator[RawItem]:
        payload = self.client.get_json(API_URL)
        # The first element is a legal notice, not a job.
        yield from (item for item in payload if isinstance(item, dict) and "id" in item)

    def parse(self, item: RawItem) -> JobPosting | None:
        epoch = item.get("epoch")
        location = clean_inline(item.get("location"))
        if location.lower() in WORLDWIDE_ALIASES:
            location = "Worldwide"
        return JobPosting(
            source=self.name,
            source_id=str(item["id"]),
            url=item.get("url") or item["apply_url"],
            title=clean_inline(item["position"]),
            company=clean_inline(item.get("company")),
            location=location,
            remote=True,
            published_at=datetime.fromtimestamp(epoch, tz=UTC) if epoch else None,
            description=html_to_text(item.get("description")),
            tags=list(item.get("tags") or []),
        )
