from __future__ import annotations

import json
from collections.abc import Iterable
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import Engine, select

from jobs_radar.cli import main
from jobs_radar.config import Settings
from jobs_radar.export import build_snapshot, export_json
from jobs_radar.extract.base import HttpClient, RawItem, Source
from jobs_radar.load.schema import create_schema, make_engine, pipeline_runs
from jobs_radar.models import JobPosting
from jobs_radar.pipeline import run_pipeline
from tests.factories import make_posting

NOW = datetime.now(UTC)


class FakeSource(Source):
    name = "Remotive"
    homepage = "https://remotive.com"

    def __init__(self, postings: list[JobPosting]) -> None:
        super().__init__(HttpClient(delay_seconds=0))
        self.postings = postings

    def fetch(self) -> Iterable[RawItem]:
        return []

    def parse(self, item: RawItem) -> JobPosting | None:  # pragma: no cover - unused
        return None

    def run(self) -> list[JobPosting]:
        return self.postings


class BrokenSource(FakeSource):
    name = "RemoteOK"

    def run(self) -> list[JobPosting]:
        raise ConnectionError("API is down")


def sample_postings() -> list[JobPosting]:
    return [
        make_posting(source_id="1", title="Junior Python Developer", published_at=NOW),
        make_posting(
            source_id="2",
            title="Analista QA Jr",
            company="Globex",
            location="Argentina",
            description="Buscamos analista de QA con Selenium y Jira para el equipo",
            published_at=NOW - timedelta(days=20),
        ),
        make_posting(source_id="3", title="Senior Data Engineer", company="Initech"),
    ]


@pytest.fixture
def engine() -> Engine:
    eng = make_engine("sqlite://")
    create_schema(eng)
    return eng


def test_run_pipeline_isolates_failing_sources_and_records_metrics(
    engine: Engine, tmp_path: Path
) -> None:
    sources = [FakeSource(sample_postings()), BrokenSource([])]

    report = run_pipeline(Settings(), sources=sources, export_dir=tmp_path, engine=engine)

    assert report.status == "partial"
    assert (report.fetched, report.kept, report.inserted) == (3, 2, 2)
    assert report.rejected["seniority"] == 1
    assert report.errors[0]["source"] == "RemoteOK"
    assert "API is down" in report.errors[0]["error"]
    assert report.source_stats == {"Remotive": {"fetched": 3, "kept": 2}}
    with engine.connect() as conn:
        run = conn.execute(select(pipeline_runs)).mappings().one()
    assert run["status"] == "partial"
    assert sorted(p.name for p in tmp_path.iterdir()) == [
        "jobs_latest.json",
        "skills.json",
        "summary.json",
    ]


def test_second_run_updates_instead_of_inserting(engine: Engine) -> None:
    run_pipeline(Settings(), sources=[FakeSource(sample_postings())], engine=engine)
    report = run_pipeline(Settings(), sources=[FakeSource(sample_postings())], engine=engine)
    assert report.status == "success"
    assert (report.inserted, report.updated) == (0, 2)


def test_all_sources_failing_marks_run_failed_and_skips_export(
    engine: Engine, tmp_path: Path
) -> None:
    report = run_pipeline(
        Settings(), sources=[BrokenSource([])], export_dir=tmp_path / "out", engine=engine
    )
    assert report.status == "failed"
    assert not (tmp_path / "out").exists()


def test_snapshot_contents(engine: Engine) -> None:
    run_pipeline(Settings(), sources=[FakeSource(sample_postings())], engine=engine)

    docs = build_snapshot(engine, now=NOW)
    summary, skills, latest = docs["summary.json"], docs["skills.json"], docs["jobs_latest.json"]

    assert summary["totals"]["active_jobs"] == 2
    assert summary["totals"]["new_last_7_days"] == 1
    assert summary["totals"]["pct_english"] == 50.0
    assert summary["totals"]["sources"] == 1
    assert summary["by_source"] == [{"name": "Remotive", "count": 2, "url": "https://remotive.com"}]
    assert {r["name"] for r in summary["by_role"]} == {"Development", "QA"}
    assert len(summary["weekly"]) == 12
    assert sum(w["count"] for w in summary["weekly"]) == 2
    assert summary["last_run"]["status"] == "success"

    assert skills["overall"][0]["count"] >= 1
    assert set(skills["by_role"]) == {"Development", "QA"}
    assert {s["name"] for s in skills["by_role"]["QA"]} == {"Selenium", "Jira"}

    assert latest["count"] == 2
    assert latest["jobs"][0]["title"] == "Junior Python Developer"  # newest first
    assert latest["jobs"][0]["source_url"] == "https://remotive.com"
    assert latest["jobs"][0]["published_at"].endswith("Z")


def test_jobs_not_seen_recently_are_not_active(engine: Engine) -> None:
    run_pipeline(Settings(), sources=[FakeSource(sample_postings())], engine=engine)
    docs = build_snapshot(engine, now=NOW + timedelta(days=30))
    assert docs["summary.json"]["totals"]["active_jobs"] == 0
    assert docs["summary.json"]["totals"]["tracked_all_time"] == 2


def test_export_writes_valid_json(engine: Engine, tmp_path: Path) -> None:
    written = export_json(engine, tmp_path)
    assert len(written) == 3
    summary = json.loads((tmp_path / "summary.json").read_text(encoding="utf-8"))
    assert summary["totals"]["active_jobs"] == 0
    assert summary["last_run"] is None


def test_cli_version_and_export(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    assert main(["version"]) == 0
    assert capsys.readouterr().out.strip()

    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'jobs.db'}")
    assert main(["init-db"]) == 0
    assert main(["export", "--export-dir", str(tmp_path / "data")]) == 0
    assert (tmp_path / "data" / "summary.json").exists()
