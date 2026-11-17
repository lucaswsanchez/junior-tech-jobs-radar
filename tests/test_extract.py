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
    RemoteOKSource,
    RemotiveSource,
)
from tests.conftest import load_fixture


def make_client(handler: Any, retries: int = 2) -> HttpClient:
    return HttpClient(delay_seconds=0, retries=retries, transport=httpx.MockTransport(handler))


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
