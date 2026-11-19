# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-18

First public release, live at https://junior-tech-jobs-radar.vercel.app.

### Added

- **Extract**: connectors for the Get on Board, Himalayas, Remotive and RemoteOK public APIs
  behind a common `Source` interface, with an identifiable User-Agent, a pause between requests
  and retries on 429/5xx. A failing source is logged and never stops the run.
- **Transform**: pydantic-validated common schema, cross-source deduplication, seniority filter
  (structured source field, title rules and a 3+ years-of-experience guard), location filter
  (Argentina / LATAM / worldwide), role type classification, a 108-skill dictionary matched with
  word-boundary regexes, and EN/ES language detection.
- **Load**: `jobs`, `skills`, `job_skills` and `pipeline_runs` tables (SQLAlchemy Core) with an
  idempotent `ON CONFLICT` upsert; works on PostgreSQL (Supabase) and SQLite (local).
- **Automation**: daily GitHub Actions workflow (cron + manual trigger) that runs the pipeline and
  commits a static JSON snapshot (`summary.json`, `skills.json`, `jobs_latest.json`).
- **SQL**: eight documented analytical queries in `sql/`, executed in CI against PostgreSQL 16.
- **Dashboard** (React, TypeScript, Tailwind CSS, Recharts, TanStack Table): editorial market
  report with headline indicators, pipeline funnel, skills ranking and skills × role matrix, role
  type × eligibility × language table, weekly trend, sources and a sortable, filterable job
  explorer; Methodology page; loading, error and empty states; responsive layout.
- **Quality**: 164 Python tests (pytest, 100% coverage of the transform package) and 13 frontend
  tests (Vitest); Ruff, mypy (strict), oxlint and Prettier; CI on every pull request.
- **Deployment**: Supabase PostgreSQL as the warehouse (daily GitHub Actions run) and Vercel for
  the static dashboard, with SPA rewrites and no-cache headers for the data snapshot.
- **Tooling**: Dockerfile and Docker Compose stack (PostgreSQL + pipeline + dashboard),
  `.env.example`, `.editorconfig`.

[1.0.0]: https://github.com/lucaswsanchez/junior-tech-jobs-radar/releases/tag/v1.0.0
