"""Database schema (SQLAlchemy Core). Works on PostgreSQL and SQLite."""

from __future__ import annotations

from pathlib import Path

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Engine,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    create_engine,
)

metadata = MetaData()

jobs = Table(
    "jobs",
    metadata,
    Column("id", String(16), primary_key=True, comment="sha1(source:source_id)[:16]"),
    Column("source", String(40), nullable=False),
    Column("source_id", String(400), nullable=False),
    Column("url", Text, nullable=False),
    Column("title", Text, nullable=False),
    Column("company", Text, nullable=False, default=""),
    Column("location", Text, nullable=False, default=""),
    Column("location_scope", String(20), nullable=False),
    Column("remote", Boolean, nullable=False),
    Column("seniority", String(20), nullable=False),
    Column("role_type", String(20), nullable=False),
    Column("language", String(2), nullable=False),
    Column("published_at", DateTime(timezone=True)),
    Column("description", Text, nullable=False, default=""),
    Column("first_seen_at", DateTime(timezone=True), nullable=False),
    Column("last_seen_at", DateTime(timezone=True), nullable=False),
    Index("ix_jobs_last_seen_at", "last_seen_at"),
    Index("ix_jobs_role_type", "role_type"),
)

skills = Table(
    "skills",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(60), nullable=False, unique=True),
    Column("category", String(40), nullable=False),
)

job_skills = Table(
    "job_skills",
    metadata,
    Column("job_id", String(16), ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True),
    Column("skill_id", Integer, ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True),
    Index("ix_job_skills_skill_id", "skill_id"),
)

pipeline_runs = Table(
    "pipeline_runs",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("started_at", DateTime(timezone=True), nullable=False),
    Column("finished_at", DateTime(timezone=True)),
    Column("status", String(20), nullable=False, comment="running | success | partial | failed"),
    Column("fetched", Integer, nullable=False, default=0),
    Column("kept", Integer, nullable=False, default=0),
    Column("inserted", Integer, nullable=False, default=0),
    Column("updated", Integer, nullable=False, default=0),
    Column("rejected", JSON, nullable=False, default=dict),
    Column("source_stats", JSON, nullable=False, default=dict),
    Column("errors", JSON, nullable=False, default=list),
)


def make_engine(database_url: str) -> Engine:
    """Create an engine, creating the parent folder of a local SQLite file if needed."""
    if database_url.startswith("sqlite:///") and ":memory:" not in database_url:
        Path(database_url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
    return create_engine(database_url, pool_pre_ping=True)


def create_schema(engine: Engine) -> None:
    metadata.create_all(engine)
