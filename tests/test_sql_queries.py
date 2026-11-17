"""Execute every analytical query against PostgreSQL (runs in CI, skipped locally)."""

from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from sqlalchemy import Engine

from jobs_radar.config import Settings, normalize_database_url
from jobs_radar.load.schema import create_schema, make_engine, metadata
from jobs_radar.pipeline import run_pipeline
from tests.factories import make_posting
from tests.test_pipeline_export import FakeSource

SQL_DIR = Path(__file__).parent.parent / "sql"
QUERIES = sorted(p for p in SQL_DIR.glob("0*.sql") if p.name != "00_schema.sql")

pytestmark = pytest.mark.skipif(
    not os.getenv("TEST_DATABASE_URL"), reason="needs TEST_DATABASE_URL (PostgreSQL)"
)


@pytest.fixture(scope="module")
def pg_engine() -> Iterator[Engine]:
    engine = make_engine(normalize_database_url(os.environ["TEST_DATABASE_URL"]))
    metadata.drop_all(engine)
    create_schema(engine)
    postings = [
        make_posting(source_id="1", title="Junior Python Developer", description="Python, SQL"),
        make_posting(source_id="2", title="Junior Data Analyst", description="Python, SQL, Excel"),
        make_posting(source_id="3", title="QA Trainee", company="B", description="Selenium, SQL"),
    ]
    run_pipeline(Settings(), sources=[FakeSource(postings)], engine=engine)
    yield engine
    metadata.drop_all(engine)
    engine.dispose()


def test_there_are_six_to_eight_queries() -> None:
    assert 6 <= len(QUERIES) <= 8


@pytest.mark.parametrize("path", QUERIES, ids=lambda p: p.stem)
def test_query_runs_and_returns_rows(pg_engine: Engine, path: Path) -> None:
    with pg_engine.connect() as conn:
        rows = conn.exec_driver_sql(path.read_text(encoding="utf-8")).fetchall()
    assert rows, f"{path.name} returned no rows on the seeded database"
