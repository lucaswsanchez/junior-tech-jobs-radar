"""Export static JSON snapshots consumed by the dashboard.

The dashboard has no backend: after each pipeline run these files are written to
``web/public/data`` and committed, which triggers a new static deploy.
"""

from __future__ import annotations

import json
import logging
from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import Engine, desc, select

from jobs_radar.extract import ALL_SOURCES
from jobs_radar.load.schema import job_skills, jobs, pipeline_runs, skills
from jobs_radar.models import ROLE_TYPES

logger = logging.getLogger(__name__)

ACTIVE_WINDOW_DAYS = 7
NEW_WINDOW_DAYS = 7
WEEKS_OF_HISTORY = 12
TOP_SKILLS = 15
SOURCE_URLS = {source.name: source.homepage for source in ALL_SOURCES}


def _utc(value: datetime | None) -> datetime | None:
    """SQLite returns naive datetimes; everything is stored in UTC."""
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _iso(value: datetime | None) -> str | None:
    value = _utc(value)
    return value.isoformat().replace("+00:00", "Z") if value else None


def _pct(part: int, total: int) -> float:
    return round(100 * part / total, 1) if total else 0.0


def _counts(values: list[str], order: tuple[str, ...] = ()) -> list[dict[str, Any]]:
    counter = Counter(values)
    keys = [k for k in order if counter[k]] or [k for k, _ in counter.most_common()]
    return [{"name": k, "count": counter[k]} for k in keys]


def build_snapshot(engine: Engine, now: datetime | None = None) -> dict[str, Any]:
    """Read the database and build the three JSON documents."""
    now = now or datetime.now(UTC)
    active_since = now - timedelta(days=ACTIVE_WINDOW_DAYS)
    new_since = now - timedelta(days=NEW_WINDOW_DAYS)

    with engine.connect() as conn:
        all_rows = [dict(r) for r in conn.execute(select(jobs)).mappings()]
        links = conn.execute(
            select(job_skills.c.job_id, skills.c.name, skills.c.category).join(
                skills, skills.c.id == job_skills.c.skill_id
            )
        ).all()
        last_run = (
            conn.execute(select(pipeline_runs).order_by(desc(pipeline_runs.c.id)).limit(1))
            .mappings()
            .first()
        )

    skills_by_job: dict[str, list[str]] = defaultdict(list)
    categories: dict[str, str] = {}
    for job_id, name, category in links:
        skills_by_job[job_id].append(name)
        categories[name] = category

    for row in all_rows:
        for key in ("published_at", "first_seen_at", "last_seen_at"):
            row[key] = _utc(row[key])
        row["skills"] = sorted(skills_by_job.get(row["id"], []))
    active = [r for r in all_rows if r["last_seen_at"] >= active_since]
    active.sort(key=lambda r: r["published_at"] or r["first_seen_at"], reverse=True)
    total = len(active)

    def posted(row: dict[str, Any]) -> datetime:
        value: datetime = row["published_at"] or row["first_seen_at"]
        return value

    # Weekly trend over every job ever tracked, by posting week (Monday).
    weeks: Counter[str] = Counter()
    first_week = (now - timedelta(weeks=WEEKS_OF_HISTORY - 1)).date()
    first_week -= timedelta(days=first_week.weekday())
    for row in all_rows:
        day = posted(row).date()
        week = day - timedelta(days=day.weekday())
        if week >= first_week:
            weeks[week.isoformat()] += 1
    week_starts = [(first_week + timedelta(weeks=i)).isoformat() for i in range(WEEKS_OF_HISTORY)]
    weekly = [{"week": week, "count": weeks[week]} for week in week_starts]

    source_counts = Counter(r["source"] for r in active)
    summary = {
        "generated_at": _iso(now),
        "active_window_days": ACTIVE_WINDOW_DAYS,
        "totals": {
            "active_jobs": total,
            "new_last_7_days": sum(posted(r) >= new_since for r in active),
            "pct_english": _pct(sum(r["language"] == "en" for r in active), total),
            "pct_remote": _pct(sum(bool(r["remote"]) for r in active), total),
            "sources": len(source_counts),
            "tracked_all_time": len(all_rows),
        },
        "by_role": _counts([r["role_type"] for r in active], ROLE_TYPES),
        "by_language": _counts([r["language"] for r in active]),
        "by_location_scope": _counts([r["location_scope"] for r in active]),
        "by_seniority": _counts([r["seniority"] for r in active]),
        "by_source": [
            {"name": name, "count": count, "url": SOURCE_URLS.get(name)}
            for name, count in source_counts.most_common()
        ],
        "weekly": weekly,
        "last_run": _run_summary(last_run),
    }

    def top(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        counter = Counter(s for r in rows for s in r["skills"])
        return [
            {"name": n, "category": categories.get(n, ""), "count": c, "pct": _pct(c, len(rows))}
            for n, c in sorted(counter.items(), key=lambda kv: (-kv[1], kv[0]))[:TOP_SKILLS]
        ]

    roles_present = [r for r in ROLE_TYPES if any(j["role_type"] == r for j in active)]
    skills_doc = {
        "generated_at": _iso(now),
        "top_n": TOP_SKILLS,
        "overall": top(active),
        "by_role": {
            role: top([j for j in active if j["role_type"] == role]) for role in roles_present
        },
    }

    jobs_doc = {
        "generated_at": _iso(now),
        "count": total,
        "jobs": [
            {
                "id": r["id"],
                "title": r["title"],
                "company": r["company"],
                "url": r["url"],
                "source": r["source"],
                "source_url": SOURCE_URLS.get(r["source"]),
                "location": r["location"],
                "location_scope": r["location_scope"],
                "remote": bool(r["remote"]),
                "role_type": r["role_type"],
                "seniority": r["seniority"],
                "language": r["language"],
                "published_at": _iso(r["published_at"]),
                "first_seen_at": _iso(r["first_seen_at"]),
                "skills": r["skills"],
            }
            for r in active
        ],
    }
    return {"summary.json": summary, "skills.json": skills_doc, "jobs_latest.json": jobs_doc}


def _run_summary(run: Any) -> dict[str, Any] | None:
    if run is None:
        return None
    return {
        "started_at": _iso(run["started_at"]),
        "finished_at": _iso(run["finished_at"]),
        "status": run["status"],
        "fetched": run["fetched"],
        "kept": run["kept"],
        "inserted": run["inserted"],
        "updated": run["updated"],
        "rejected": run["rejected"],
        "source_stats": run["source_stats"],
        "errors": run["errors"],
    }


def export_json(engine: Engine, out_dir: Path, now: datetime | None = None) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for filename, document in build_snapshot(engine, now).items():
        path = out_dir / filename
        path.write_text(json.dumps(document, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        written.append(path)
    logger.info("Exported %s", ", ".join(p.name for p in written))
    return written
