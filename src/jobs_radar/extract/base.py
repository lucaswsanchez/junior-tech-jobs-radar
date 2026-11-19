"""Common connector interface and a polite HTTP client."""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from collections.abc import Callable, Iterable, Sequence
from typing import Any, ClassVar

import httpx
from pydantic import ValidationError

from jobs_radar.config import USER_AGENT
from jobs_radar.models import JobPosting

logger = logging.getLogger(__name__)

RawItem = dict[str, Any]

# A rate-limited API (429) gets a longer pause than a server error: 5 s, 10 s, 20 s...
RATE_LIMIT_BASE_SECONDS = 5.0
# Never wait longer than this for one retry, whatever Retry-After asks for.
MAX_RETRY_WAIT_SECONDS = 60.0


def _is_retriable(exc: Exception) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        return status == 429 or status >= 500
    return isinstance(exc, httpx.TransportError)


def _retry_after(response: httpx.Response) -> float | None:
    """Seconds asked for by a numeric ``Retry-After`` header, if present."""
    value = response.headers.get("Retry-After", "").strip()
    try:
        return max(float(value), 0.0)
    except ValueError:
        return None


class PartialFetchError(Exception):
    """A source failed midway; ``postings`` holds what was parsed before the failure."""

    def __init__(self, postings: list[JobPosting], cause: Exception) -> None:
        super().__init__(f"{type(cause).__name__}: {cause}")
        self.postings = postings
        self.cause = cause


class HttpClient:
    """Thin wrapper over httpx with an identifiable User-Agent, a pause and retries."""

    def __init__(
        self,
        delay_seconds: float = 1.0,
        timeout: float = 30.0,
        retries: int = 3,
        transport: httpx.BaseTransport | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.delay_seconds = delay_seconds
        self.retries = retries
        self._sleep = sleep
        self._last_request = 0.0
        self._client = httpx.Client(
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            timeout=timeout,
            follow_redirects=True,
            transport=transport,
        )

    def get_json(
        self,
        url: str,
        params: dict[str, Any] | None = None,
        min_interval: float | None = None,
    ) -> Any:
        """GET and decode JSON. ``min_interval`` slows down a source with a tighter limit."""
        for attempt in range(self.retries + 1):
            self._throttle(max(self.delay_seconds, min_interval or 0.0))
            try:
                response = self._client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except (httpx.TransportError, httpx.HTTPStatusError) as exc:
                if not _is_retriable(exc) or attempt == self.retries:
                    raise
                wait = self._retry_wait(exc, attempt)
                logger.warning("Retrying %s in %.0f s after error: %s", url, wait, exc)
                self._sleep(wait)
        raise RuntimeError("unreachable")  # pragma: no cover

    def _retry_wait(self, exc: Exception, attempt: int) -> float:
        if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 429:
            asked = _retry_after(exc.response)
            wait = asked if asked is not None else RATE_LIMIT_BASE_SECONDS * 2**attempt
        else:
            wait = self.delay_seconds * (attempt + 2)
        return min(wait, MAX_RETRY_WAIT_SECONDS)

    def _throttle(self, interval: float) -> None:
        wait = interval - (time.monotonic() - self._last_request)
        if wait > 0:
            self._sleep(wait)
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
        """Fetch and parse; if the API fails midway, keep the pages already fetched."""
        items: list[RawItem] = []
        try:
            for item in self.fetch():
                items.append(item)
        except Exception as exc:
            if not items:
                raise
            raise PartialFetchError(self.parse_many(items), exc) from exc
        return self.parse_many(items)
