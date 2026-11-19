# Technical decisions

Short architecture decision records (ADRs): the context, the decision, and its trade-offs.

## 1. Static JSON snapshot instead of a backend API

**Context.** The dashboard only reads data that changes once a day. Free backend tiers (e.g.
Render) sleep after inactivity, so the first visit can take ~50 seconds.

**Decision.** The pipeline exports three JSON files after each run and commits them to
`web/public/data`. The commit triggers a static redeploy on Vercel.

**Trade-offs.** Instant loads, zero servers to maintain, no secrets in the frontend, and the
data history lives in git. The cost: the dashboard can only show pre-computed views, and
ad-hoc questions go through the SQL queries in `sql/` instead.

## 2. Public APIs only, with a source-isolated extract step

**Context.** Scraping LinkedIn or local boards breaks their terms of service and is fragile.

**Decision.** Use only official public APIs (Get on Board, Himalayas, Remotive, RemoteOK, Jobicy). Each
connector implements `fetch()` (network) and `parse()` (a pure function). The run catches errors
per source and records them in `pipeline_runs.errors` with status `partial`; a source that
fails midway keeps the pages it already fetched. HTTP 429 responses are retried after the
`Retry-After` wait (or 5 s, 10 s, 20 s), capped at 60 s.

**Trade-offs.** Coverage is limited to five boards, but the pipeline is legal, polite (custom
User-Agent, delays, retries) and resilient. Pure parsers can be tested offline with saved
fixtures.

## 3. Deterministic rules instead of machine learning for classification

**Context.** Seniority, role type and skills need to be explainable to the user and testable.
There is no labelled dataset.

**Decision.** Ordered regex rules: a structured source field wins; otherwise title keywords;
a "3+ years of experience" guard; and a 108-skill dictionary with custom word boundaries.
Ambiguous names (`Go`, `R`, `React`, `Excel`) get stricter, case-sensitive or list-context
patterns.

**Trade-offs.** Every decision can be explained on the Methodology page and pinned by a unit test
(transform coverage: 100%). Rules were tuned on a real sample (742 postings → 88 kept). Some edge
cases will be misclassified, and new rules mean code changes.

## 4. SQLAlchemy Core with a dialect-aware upsert (PostgreSQL + SQLite)

**Context.** Production runs on Supabase PostgreSQL, but the project must run locally without
Docker, and tests must not need a database server.

**Decision.** SQLAlchemy Core tables and `INSERT … ON CONFLICT DO UPDATE` built with the
PostgreSQL or SQLite dialect. Primary key = `sha1(source:source_id)[:16]`, so re-running is
idempotent. `first_seen_at` is preserved and `last_seen_at` is refreshed.

**Trade-offs.** One code path for both engines. CI runs the load tests against both SQLite and
a PostgreSQL 16 service container, and executes every analytical query on PostgreSQL. Advanced
PostgreSQL features are only used in `sql/`, not in the pipeline.

## 5. Editorial dashboard built from small custom components

**Context.** The audience (recruiters, tech leads) should read the market at a glance, and the
page should not look like a generic admin template.

**Decision.** A "market report" layout with a dark palette, numbered sections, a 12-column grid
with a shared 5/7 split, and IBM Plex Mono for figures. The skills ranking and matrix share the
same table geometry, so their rows line up. Charts are small custom HTML/SVG components:
after a design audit, Recharts was removed because it was used for a single bar chart and doubled
the bundle (736 KB → 369 KB). TanStack Table powers the explorer (sorting, pagination).
ECharts, MapLibre and a component kit were evaluated and left out: the data has no per-country
breakdown, and the custom components stay small.

**Trade-offs.** More layout code to maintain, but a smaller bundle, a consistent visual system
and no invented visuals. Every number on screen is computed from the exported snapshot.
