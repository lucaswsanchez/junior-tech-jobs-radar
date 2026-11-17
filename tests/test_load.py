from __future__ import annotations

import os
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from sqlalchemy import Engine, func, select

from jobs_radar.config import normalize_database_url
from jobs_radar.load.repository import finish_run, start_run, sync_skills, upsert_jobs
from jobs_radar.load.schema import (
    create_schema,
    job_skills,
    jobs,
    make_engine,
    metadata,
    pipeline_runs,
)
from jobs_radar.models import Job
from jobs_radar.transform.pipeline import transform
from jobs_radar.transform.skills import SKILLS
from tests.factories import make_posting

T1 = datetime(2026, 11, 16, 12, tzinfo=UTC)
T2 = datetime(2026, 11, 17, 12, tzinfo=UTC)


# Every test runs on SQLite; CI also runs them on a real PostgreSQL service.
DATABASE_URLS = ["sqlite://"]
if os.getenv("TEST_DATABASE_URL"):
    DATABASE_URLS.append(normalize_database_url(os.environ["TEST_DATABASE_URL"]))


@pytest.fixture(params=DATABASE_URLS, ids=lambda url: url.split(":")[0])
def engine(request: pytest.FixtureRequest) -> Iterator[Engine]:
    eng = make_engine(request.param)
    metadata.drop_all(eng)
    create_schema(eng)
    yield eng
    metadata.drop_all(eng)
    eng.dispose()


def make_jobs() -> list[Job]:
    return transform(
        [
            make_posting(source_id="1", title="Junior Python Developer"),
            make_posting(
                source_id="2",
                title="QA Analyst Trainee",
                company="Globex",
                description="Selenium and Postman.",
            ),
        ]
    ).jobs


def count(engine: Engine, table: object) -> int:
    with engine.connect() as conn:
        return int(conn.scalar(select(func.count()).select_from(table)) or 0)  # type: ignore[arg-type]


def test_upsert_inserts_then_updates_idempotently(engine: Engine) -> None:
    items = make_jobs()

    with engine.begin() as conn:
        first = upsert_jobs(conn, items, seen_at=T1)
    with engine.begin() as conn:
        second = upsert_jobs(conn, items, seen_at=T2)

    assert (first.inserted, first.updated) == (2, 0)
    assert (second.inserted, second.updated) == (0, 2)
    assert count(engine, jobs) == 2
    with engine.connect() as conn:
        row = conn.execute(select(jobs).where(jobs.c.id == items[0].id)).mappings().one()
    assert row["first_seen_at"].replace(tzinfo=UTC) == T1
    assert row["last_seen_at"].replace(tzinfo=UTC) == T2


def test_skill_links_are_replaced_not_duplicated(engine: Engine) -> None:
    items = make_jobs()
    with engine.begin() as conn:
        upsert_jobs(conn, items, seen_at=T1)
    links_before = count(engine, job_skills)

    changed = [items[0].model_copy(update={"skills": ["Python"]}), items[1]]
    with engine.begin() as conn:
        upsert_jobs(conn, changed, seen_at=T2)

    assert links_before == sum(len(j.skills) for j in items)
    assert count(engine, job_skills) == 1 + len(items[1].skills)


def test_sync_skills_loads_the_whole_dictionary_once(engine: Engine) -> None:
    with engine.begin() as conn:
        first = sync_skills(conn)
        second = sync_skills(conn)
    assert first == second
    assert len(first) == len(SKILLS)


def test_empty_upsert_is_a_no_op(engine: Engine) -> None:
    with engine.begin() as conn:
        result = upsert_jobs(conn, [], seen_at=T1)
    assert (result.inserted, result.updated) == (0, 0)


def test_pipeline_run_lifecycle(engine: Engine) -> None:
    with engine.begin() as conn:
        run_id = start_run(conn, T1)
        finish_run(
            conn,
            run_id,
            status="partial",
            finished_at=T2,
            fetched=10,
            kept=4,
            errors=[{"source": "RemoteOK", "error": "timeout"}],
        )
    with engine.connect() as conn:
        row = conn.execute(select(pipeline_runs)).mappings().one()
    assert row["status"] == "partial"
    assert row["kept"] == 4
    assert row["errors"] == [{"source": "RemoteOK", "error": "timeout"}]
