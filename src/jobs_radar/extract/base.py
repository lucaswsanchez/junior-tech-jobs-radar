"""Common connector interface and a polite HTTP client."""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from collections.abc import Iterable, Sequence
from typing import Any, ClassVar

import httpx
from pydantic import ValidationError

from jobs_radar.config import USER_AGENT
from jobs_radar.models import JobPosting

logger = logging.getLogger(__name__)

RawItem = dict[str, Any]


def _is_retriable(exc: Exception) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        return status == 429 or status >= 500
    return isinstance(exc, httpx.TransportError)


class HttpClient:
    """Thin wrapper over httpx with an identifiable User-Agent, a pause and retries."""

    def __init__(
        self,
        delay_seconds: float = 1.0,
        timeout: float = 30.0,
        retries: int = 2,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.delay_seconds = delay_seconds
        self.retries = retries
        self._last_request = 0.0
        self._client = httpx.Client(
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            timeout=timeout,
            follow_redirects=True,
            transport=transport,
        )

    def get_json(self, url: str, params: dict[str, Any] | None = None) -> Any:
        for attempt in range(self.retries + 1):
            self._throttle()
            try:
                response = self._client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except (httpx.TransportError, httpx.HTTPStatusError) as exc:
                if not _is_retriable(exc) or attempt == self.retries:
                    raise
                logger.warning("Retrying %s after error: %s", url, exc)
                time.sleep(self.delay_seconds * (attempt + 2))
        raise RuntimeError("unreachable")  # pragma: no cover

    def _throttle(self) -> None:
        wait = self.delay_seconds - (time.monotonic() - self._last_request)
        if wait > 0:
            time.sleep(wait)
        self._last_request = time.monotonic()

    def close(self) -> None:
        self._client.close()


class Source(ABC):
    """A job source. Subclasses implement ``fetch`` (network) and ``parse`` (pure)."""

    name: ClassVar[str]
    homepage: ClassVar[str]

    def __init__(self, client: HttpClient, queries: Sequence[str] = ()) -> None:
        self.client = client
        self.queries = tuple(queries)

    @abstractmethod
    def fetch(self) -> Iterable[RawItem]:
        """Yield raw API items."""

    @abstractmethod
    def parse(self, item: RawItem) -> JobPosting | None:
        """Map one raw item to the common schema. Return ``None`` to skip it."""

    def parse_many(self, items: Iterable[RawItem]) -> list[JobPosting]:
        """Parse items, skipping malformed ones and collapsing repeats of the same id."""
        postings: dict[str, JobPosting] = {}
        for item in items:
            try:
                posting = self.parse(item)
            except (ValidationError, KeyError, TypeError, ValueError) as exc:
                logger.warning("%s: skipping malformed item: %s", self.name, exc)
                continue
            if posting is not None:
                postings[posting.source_id] = posting
        return list(postings.values())

    def run(self) -> list[JobPosting]:
        return self.parse_many(self.fetch())
