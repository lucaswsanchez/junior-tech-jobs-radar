"""End-to-end ETL run: extract every source, transform, load and record metrics."""

from __future__ import annotations

import logging
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import Engine

from jobs_radar.config import Settings
from jobs_radar.export import export_json
from jobs_radar.extract import ALL_SOURCES, HttpClient, Source
from jobs_radar.load.repository import finish_run, start_run, upsert_jobs
from jobs_radar.load.schema import create_schema, make_engine
from jobs_radar.models import JobPosting
from jobs_radar.transform.pipeline import transform

logger = logging.getLogger(__name__)


@dataclass
class RunReport:
    run_id: int
    status: str
    fetched: int = 0
    kept: int = 0
    inserted: int = 0
    updated: int = 0
    rejected: dict[str, int] = field(default_factory=dict)
    source_stats: dict[str, dict[str, int]] = field(default_factory=dict)
    errors: list[dict[str, str]] = field(default_factory=list)


def extract_all(sources: Sequence[Source]) -> tuple[list[JobPosting], dict[str, Any], list[Any]]:
    """Run every source; a failing source is logged and skipped, never fatal."""
    postings: list[JobPosting] = []
    stats: dict[str, dict[str, int]] = {}
    errors: list[dict[str, str]] = []
    for source in sources:
        try:
            found = source.run()
        except Exception as exc:
            logger.exception("Source %s failed", source.name)
            errors.append({"source": source.name, "error": f"{type(exc).__name__}: {exc}"[:500]})
            continue
        logger.info("Source %s returned %d postings", source.name, len(found))
        stats[source.name] = {"fetched": len(found)}
        postings.extend(found)
    return postings, stats, errors


def run_pipeline(
    settings: Settings,
    sources: Sequence[Source] | None = None,
    export_dir: Path | None = None,
    engine: Engine | None = None,
) -> RunReport:
    engine = engine or make_engine(settings.database_url)
    create_schema(engine)
    started_at = datetime.now(UTC)
    with engine.begin() as conn:
        run_id = start_run(conn, started_at)

    client: HttpClient | None = None
    if sources is None:
        client = HttpClient(delay_seconds=settings.request_delay_seconds)
        sources = [cls(client, settings.queries) for cls in ALL_SOURCES]
    try:
        postings, stats, errors = extract_all(sources)
    finally:
        if client is not None:
            client.close()

    result = transform(postings)
    for name, count in Counter(job.source for job in result.jobs).items():
        stats.setdefault(name, {"fetched": 0})["kept"] = count

    if not stats:
        status = "failed"
    elif errors:
        status = "partial"
    else:
        status = "success"

    report = RunReport(
        run_id=run_id,
        status=status,
        fetched=result.input_count,
        kept=result.kept,
        rejected=dict(result.rejected),
        source_stats=stats,
        errors=errors,
    )
    with engine.begin() as conn:
        if status != "failed":
            upserted = upsert_jobs(conn, result.jobs, seen_at=started_at)
            report.inserted, report.updated = upserted.inserted, upserted.updated
        finish_run(
            conn,
            run_id,
            finished_at=datetime.now(UTC),
            status=report.status,
            fetched=report.fetched,
            kept=report.kept,
            inserted=report.inserted,
            updated=report.updated,
            rejected=report.rejected,
            source_stats=report.source_stats,
            errors=report.errors,
        )
    logger.info(
        "Run %d %s: fetched=%d kept=%d inserted=%d updated=%d",
        run_id,
        status,
        report.fetched,
        report.kept,
        report.inserted,
        report.updated,
    )
    if export_dir is not None and status != "failed":
        export_json(engine, export_dir)
    return report
