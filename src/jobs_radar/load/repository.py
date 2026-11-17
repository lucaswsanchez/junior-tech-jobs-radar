"""Idempotent writes: upsert jobs, sync the skill dictionary, record pipeline runs."""

from __future__ import annotations

from collections.abc import Iterator, Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import Connection, Insert, delete, insert, select, update
from sqlalchemy.dialects import postgresql, sqlite

from jobs_radar.load.schema import job_skills, jobs, pipeline_runs, skills
from jobs_radar.models import Job
from jobs_radar.transform.skills import SKILLS

CHUNK_SIZE = 500
_JOB_COLUMNS = (
    "id",
    "source",
    "source_id",
    "url",
    "title",
    "company",
    "location",
    "location_scope",
    "remote",
    "seniority",
    "role_type",
    "language",
    "published_at",
    "description",
)


@dataclass(frozen=True)
class UpsertResult:
    inserted: int
    updated: int


def _chunks(items: Sequence[Any], size: int = CHUNK_SIZE) -> Iterator[Sequence[Any]]:
    for start in range(0, len(items), size):
        yield items[start : start + size]


def _dialect_insert(conn: Connection, table: Any) -> Any:
    """``INSERT`` that supports ``on_conflict_do_update`` on PostgreSQL and SQLite."""
    if conn.dialect.name == "postgresql":
        return postgresql.insert(table)
    if conn.dialect.name == "sqlite":
        return sqlite.insert(table)
    raise NotImplementedError(f"Unsupported database dialect: {conn.dialect.name}")


def sync_skills(conn: Connection) -> dict[str, int]:
    """Make sure every dictionary skill exists; return ``{name: id}``."""
    stmt = _dialect_insert(conn, skills)
    stmt = stmt.on_conflict_do_update(
        index_elements=[skills.c.name], set_={"category": stmt.excluded.category}
    )
    conn.execute(stmt, [{"name": s.name, "category": s.category} for s in SKILLS])
    return {name: skill_id for skill_id, name in conn.execute(select(skills.c.id, skills.c.name))}


def upsert_jobs(conn: Connection, items: Sequence[Job], seen_at: datetime) -> UpsertResult:
    """Insert new jobs, refresh existing ones and replace their skill links.

    Running it twice with the same input leaves the database unchanged except for
    ``last_seen_at``: the operation is idempotent.
    """
    if not items:
        return UpsertResult(0, 0)
    skill_ids = sync_skills(conn)
    ids = [job.id for job in items]
    existing: set[str] = set()
    for chunk in _chunks(ids):
        existing.update(conn.scalars(select(jobs.c.id).where(jobs.c.id.in_(chunk))))

    rows = [
        {
            **job.model_dump(include=set(_JOB_COLUMNS)),
            "first_seen_at": seen_at,
            "last_seen_at": seen_at,
        }
        for job in items
    ]
    for chunk in _chunks(rows):
        stmt = _dialect_insert(conn, jobs)
        stmt = stmt.on_conflict_do_update(
            index_elements=[jobs.c.id],
            set_={col: stmt.excluded[col] for col in (*_JOB_COLUMNS[1:], "last_seen_at")},
        )
        conn.execute(stmt, list(chunk))

    for chunk in _chunks(ids):
        conn.execute(delete(job_skills).where(job_skills.c.job_id.in_(chunk)))
    links = [
        {"job_id": job.id, "skill_id": skill_ids[name]}
        for job in items
        for name in job.skills
        if name in skill_ids
    ]
    for chunk in _chunks(links):
        conn.execute(insert(job_skills), list(chunk))

    inserted = len(set(ids) - existing)
    return UpsertResult(inserted=inserted, updated=len(set(ids)) - inserted)


def start_run(conn: Connection, started_at: datetime) -> int:
    stmt: Insert = insert(pipeline_runs).values(
        started_at=started_at, status="running", rejected={}, source_stats={}, errors=[]
    )
    run_id = conn.execute(stmt.returning(pipeline_runs.c.id)).scalar_one()
    return int(run_id)


def finish_run(conn: Connection, run_id: int, **values: Any) -> None:
    conn.execute(update(pipeline_runs).where(pipeline_runs.c.id == run_id).values(**values))
