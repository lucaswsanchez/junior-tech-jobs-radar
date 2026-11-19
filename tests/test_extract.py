from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import httpx
import pytest

from jobs_radar.config import USER_AGENT
from jobs_radar.extract import (
    GetOnBoardSource,
    HimalayasSource,
    HttpClient,
    JobicySource,
    PartialFetchError,
    RemoteOKSource,
    RemotiveSource,
)
from tests.conftest import load_fixture


def make_client(handler: Any, retries: int = 2, sleeps: list[float] | None = None) -> HttpClient:
    record = sleeps if sleeps is not None else []
    return HttpClient(
        delay_seconds=0,
        retries=retries,
        transport=httpx.MockTransport(handler),
        sleep=record.append,
    )


def offline_client() -> HttpClient:
    def handler(request: httpx.Request) -> httpx.Response:  # pragma: no cover - must not be hit
        raise AssertionError("parsers must not touch the network")

    return make_client(handler)


# --- Get on Board -----------------------------------------------------------------------


def test_getonbrd_parses_fixture() -> None:
    source = GetOnBoardSource(offline_client())
    jobs = source.parse_many(load_fixture("getonbrd.json")["data"])

    assert len(jobs) == 5
    first = jobs[0]
    assert first.source == "Get on Board"
    assert first.title == "Infosec Analyst I"
    assert first.company == "LemonTech"
    assert first.location == "Worldwide"
    assert first.remote is True
    assert first.seniority_hint == "Junior"
    assert first.url.startswith("https://www.getonbrd.com/jobs/")
    assert first.published_at is not None and first.published_at.tzinfo is not None
    assert "<" not in first.description


def test_getonbrd_marks_local_only_remote_and_onsite_jobs() -> None:
    jobs = GetOnBoardSource(offline_client()).parse_many(load_fixture("getonbrd.json")["data"])
    by_title = {j.title: j for j in jobs}

    assert by_title["Database Administrator (Junior)"].location == "Chile"
    assert by_title["Database Administrator (Junior)"].remote is False
    assert "local residents only" in by_title["Junior Ad Ops Specialist"].location
    assert by_title["Head of SEO — Medical Accounts"].seniority_hint == "Senior"


def test_getonbrd_fetch_follows_pagination() -> None:
    page_payload = load_fixture("getonbrd.json")
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        page = int(request.url.params["page"])
        return httpx.Response(200, json={**page_payload, "meta": {"page": page, "total_pages": 2}})

    source = GetOnBoardSource(make_client(handler), queries=["junior"])
    items = list(source.fetch())

    assert len(calls) == 2
    assert len(items) == 10
    assert calls[0].headers["User-Agent"] == USER_AGENT
    assert calls[0].url.params["expand"] == '["company"]'


# --- Himalayas --------------------------------------------------------------------------


def test_himalayas_parses_fixture_and_collapses_repeats() -> None:
    jobs = HimalayasSource(offline_client()).parse_many(load_fixture("himalayas.json")["jobs"])

    # The fixture repeats two jobs (as the API does across queries): they collapse.
    assert len(jobs) == 3
    by_title = {j.title: j for j in jobs}
    analyst = by_title["Analista de sistemas Jr / QA Jr / Scrum Jr"]
    assert analyst.location == "Argentina"
    assert analyst.company == "WebExport Sistemas y Diseño Web"
    assert analyst.seniority_hint == "Entry-level"
    assert by_title["Junior Accountant"].location == "Argentina, +44 countries"
    assert by_title["Jr. E-Commerce Assistant (Flex-Time) (Remote/Global)"].location == "Worldwide"


def test_himalayas_fetch_stops_on_short_page() -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        assert request.url.params["country"] == "AR"
        return httpx.Response(200, json=load_fixture("himalayas.json"))

    items = list(HimalayasSource(make_client(handler), queries=["qa"]).fetch())
    assert calls == 1
    assert len(items) == 5


# --- Remotive ---------------------------------------------------------------------------


def test_remotive_parses_fixture() -> None:
    jobs = RemotiveSource(offline_client()).parse_many(load_fixture("remotive.json")["jobs"])

    assert len(jobs) == 5
    office = next(j for j in jobs if j.title == "Remote Office Assistant")
    assert office.location == "Worldwide"
    assert office.published_at is not None and office.published_at.tzinfo == UTC
    assert any(j.location == "USA" for j in jobs)


# --- RemoteOK ---------------------------------------------------------------------------


def test_remoteok_skips_legal_notice_and_fixes_encoding() -> None:
    payload = load_fixture("remoteok.json")

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=payload)

    jobs = RemoteOKSource(make_client(handler)).run()

    assert len(jobs) == len(payload) - 1  # the legal notice is not a job
    assert all(j.source == "RemoteOK" for j in jobs)
    assert jobs[0].location == "Worldwide"
    assert any(j.location == "München" for j in jobs)
    assert all(j.url.startswith("https://remoteOK.com/") for j in jobs)


# --- Jobicy -----------------------------------------------------------------------------


def test_jobicy_parses_fixture() -> None:
    jobs = JobicySource(offline_client()).parse_many(load_fixture("jobicy.json")["jobs"])
    by_id = {j.source_id: j for j in jobs}

    video = by_id["149160"]
    assert video.source == "Jobicy"
    assert video.location == "LATAM"
    assert video.remote is True
    assert video.seniority_hint == "Entry-Level, Junior"
    assert video.tags == ["Data Science & Analytics"]
    assert video.published_at == datetime(2026, 11, 16, 3, 5, 34, tzinfo=UTC)
    assert "<" not in video.description
    assert by_id["163303"].location == "Argentina"
    assert by_id["163303"].seniority_hint == "Senior"
    # "Any" is not a level: the title decides instead.
    assert by_id["163256"].seniority_hint is None


def test_jobicy_normalizes_region_lists_and_anywhere() -> None:
    base = load_fixture("jobicy.json")["jobs"][0]
    source = JobicySource(offline_client())
    regions = source.parse({**base, "jobGeo": "EMEA,  LATAM,  Canada,  USA"})
    anywhere = source.parse({**base, "jobGeo": "Anywhere"})

    assert regions is not None and regions.location == "EMEA, LATAM, Canada, USA"
    assert anywhere is not None and anywhere.location == "Worldwide"


def test_jobicy_fetch_queries_each_region_and_collapses_repeats() -> None:
    geos: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        geos.append(request.url.params["geo"])
        assert request.url.params["count"] == "100"
        return httpx.Response(200, json=load_fixture("jobicy.json"))

    jobs = JobicySource(make_client(handler)).run()
    assert geos == ["argentina", "latam"]
    assert len(jobs) == 3


# --- Shared behaviour -------------------------------------------------------------------


def test_malformed_items_are_skipped() -> None:
    source = RemotiveSource(offline_client())
    good = load_fixture("remotive.json")["jobs"][0]
    bad_url = {**good, "id": 1, "url": "not-a-url"}
    missing_title = {k: v for k, v in good.items() if k != "title"}

    jobs = source.parse_many([good, bad_url, missing_title])
    assert [j.source_id for j in jobs] == [str(good["id"])]


def test_uid_is_stable_and_source_scoped() -> None:
    job = RemotiveSource(offline_client()).parse_many(load_fixture("remotive.json")["jobs"])[0]
    clone = job.model_copy(update={"source": "Other"})
    assert job.uid == job.model_copy().uid
    assert job.uid != clone.uid
    assert len(job.uid) == 16


def test_http_client_retries_server_errors() -> None:
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            return httpx.Response(503)
        return httpx.Response(200, json={"ok": True})

    assert make_client(handler).get_json("https://example.test") == {"ok": True}
    assert attempts == 3


def test_http_client_does_not_retry_client_errors() -> None:
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        return httpx.Response(404)

    with pytest.raises(httpx.HTTPStatusError):
        make_client(handler).get_json("https://example.test")
    assert attempts == 1


def test_published_dates_are_parsed_from_epoch() -> None:
    jobs = RemoteOKSource(offline_client()).parse_many(load_fixture("remoteok.json")[1:])
    assert all(isinstance(j.published_at, datetime) for j in jobs)


def test_http_client_honours_retry_after_on_rate_limit() -> None:
    attempts = 0
    sleeps: list[float] = []

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(429, headers={"Retry-After": "7"})
        return httpx.Response(200, json={"ok": True})

    assert make_client(handler, sleeps=sleeps).get_json("https://example.test") == {"ok": True}
    assert sleeps == [7.0]


def test_http_client_backs_off_longer_on_rate_limit_without_header() -> None:
    sleeps: list[float] = []

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, headers={"Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT"})

    with pytest.raises(httpx.HTTPStatusError):
        make_client(handler, retries=3, sleeps=sleeps).get_json("https://example.test")
    assert sleeps == [5.0, 10.0, 20.0]


def test_http_client_caps_retry_wait() -> None:
    sleeps: list[float] = []

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, headers={"Retry-After": "3600"})

    with pytest.raises(httpx.HTTPStatusError):
        make_client(handler, retries=1, sleeps=sleeps).get_json("https://example.test")
    assert sleeps == [60.0]


def test_source_keeps_pages_fetched_before_a_failure() -> None:
    page_one = load_fixture("himalayas.json")
    page_one = {**page_one, "jobs": page_one["jobs"] * 4}  # a full page: keep paging

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.params["page"] == "1":
            return httpx.Response(200, json=page_one)
        return httpx.Response(404)

    source = HimalayasSource(make_client(handler), queries=["qa"])
    with pytest.raises(PartialFetchError) as info:
        source.run()
    assert len(info.value.postings) == 3
    assert isinstance(info.value.cause, httpx.HTTPStatusError)


def test_source_with_nothing_fetched_raises_the_original_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404)

    with pytest.raises(httpx.HTTPStatusError):
        HimalayasSource(make_client(handler), queries=["qa"]).run()
