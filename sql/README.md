# Analytical SQL

These queries run against the pipeline's PostgreSQL database (Supabase in production).
Each file starts with a comment that explains the question it answers and how.
They use standard PostgreSQL features: CTEs, window functions (`RANK`, `LAG`, `SUM() OVER`),
`FILTER` aggregates, `ROLLUP` and `generate_series`.

"Active" means the job was seen by the pipeline in the last 7 days. The dashboard uses the same rule.

| File | Question |
| --- | --- |
| [`00_schema.sql`](00_schema.sql) | Table definitions (reference DDL, generated from the SQLAlchemy models) |
| [`01_top_skills_by_role.sql`](01_top_skills_by_role.sql) | Top 10 skills for each role type |
| [`02_remote_share.sql`](02_remote_share.sql) | Share of remote jobs per role, with an overall total |
| [`03_jobs_by_source.sql`](03_jobs_by_source.sql) | Active and all-time jobs per source, avg. skills per posting |
| [`04_weekly_trend.sql`](04_weekly_trend.sql) | New postings per week (last 12 weeks), week-over-week change |
| [`05_skill_cooccurrence.sql`](05_skill_cooccurrence.sql) | Skill pairs that appear together, with lift |
| [`06_language_by_role.sql`](06_language_by_role.sql) | English vs Spanish postings per role |
| [`07_location_scope_by_source.sql`](07_location_scope_by_source.sql) | Argentina / LATAM / Worldwide per source |
| [`08_pipeline_health.sql`](08_pipeline_health.sql) | Duration, keep rate and failures of the last 14 runs |

## Running them

```bash
psql "$DATABASE_URL" -f sql/01_top_skills_by_role.sql
```

You can also paste them into the Supabase SQL editor.

Every query is executed in CI against a PostgreSQL 16 service seeded with sample data
(`tests/test_sql_queries.py`), so a broken query fails the build.
