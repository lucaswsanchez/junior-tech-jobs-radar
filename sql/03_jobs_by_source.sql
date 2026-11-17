-- 03. Jobs per source
-- Question: which job boards actually publish junior roles open to Argentina?
-- How: per source, active vs all-time jobs, share of the active total and the average
--      number of skills detected per job (a proxy for how detailed the postings are).
WITH skills_per_job AS (
    SELECT j.id, j.source, j.last_seen_at, COUNT(js.skill_id) AS n_skills
    FROM jobs j
    LEFT JOIN job_skills js ON js.job_id = j.id
    GROUP BY j.id, j.source, j.last_seen_at
)
SELECT
    source,
    COUNT(*) FILTER (WHERE last_seen_at >= NOW() - INTERVAL '7 days') AS active_jobs,
    COUNT(*) AS tracked_all_time,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE last_seen_at >= NOW() - INTERVAL '7 days')
        / NULLIF(SUM(COUNT(*) FILTER (WHERE last_seen_at >= NOW() - INTERVAL '7 days')) OVER (), 0),
        1
    ) AS pct_of_active,
    ROUND(AVG(n_skills), 1) AS avg_skills_per_job
FROM skills_per_job
GROUP BY source
ORDER BY active_jobs DESC;
