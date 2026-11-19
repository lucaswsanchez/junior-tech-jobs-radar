# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-11-19

### Added

- Jobicy connector (fifth source): remote jobs from its Argentina and LATAM region feeds.

### Fixed

- A rate-limited source (HTTP 429) is now retried after the `Retry-After` wait, or 5 s, 10 s
  and 20 s without one, capped at 60 s. Himalayas requests are spaced 3 s apart.
- A source that fails midway keeps the pages it already fetched instead of losing all of them.
  On 2026-11-19 a 429 on the last page dropped every Himalayas posting from the run.

## [1.1.0] - 2026-11-19

Changes from an independent UI/UX and data-visualization audit. No pipeline logic, metric or
classification was changed.

### Added

- Coverage note and "Source mix" fact: 93% of the report comes from one board, now stated next to
  the headline figures and in a per-source coverage table on the Methodology page.
- Role groups (core tech, AI data work, tech-adjacent) as a reading aid, with a summary bar above
  the fold.
- Drill-down: selecting a skill, role or source opens the job explorer filtered to it.
- Explorer filters stored in the URL (shareable views), a skill filter, CSV export of the filtered
  rows, the original location per job, and a card layout below 1024 px.
- Methodology: data dictionary and a "Why no country comparison" section.

### Changed

- The posting-date chart is described as a snapshot of open postings and flags a batch upload
  (33 of 40 postings in one week share a single publication day) instead of highlighting it as a peak.
- The skills ranking is merged into the skills × role matrix as its first column (15 skills).
- The pipeline funnel is labelled in place; seniority and work mode are reported as figures.
- Roles section: grouped table on desktop, cards on mobile.
- Recharts replaced by a dependency-free chart: bundle 736 KB → 369 KB (216 → 112 KB gzipped).
- Higher contrast for the "Other" role color and the "Worldwide" segment.

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

[1.2.0]: https://github.com/lucaswsanchez/junior-tech-jobs-radar/releases/tag/v1.2.0
[1.1.0]: https://github.com/lucaswsanchez/junior-tech-jobs-radar/releases/tag/v1.1.0
[1.0.0]: https://github.com/lucaswsanchez/junior-tech-jobs-radar/releases/tag/v1.0.0
