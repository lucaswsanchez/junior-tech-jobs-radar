-- 04. Weekly trend of new junior postings (last 12 weeks)
-- Question: is the junior market heating up or cooling down?
-- How: generate_series builds every week (so empty weeks show 0), postings are bucketed
--      by the Monday of their publication week, and LAG gives week-over-week change.
WITH weeks AS (
    SELECT generate_series(
        date_trunc('week', NOW()) - INTERVAL '11 weeks',
        date_trunc('week', NOW()),
        INTERVAL '1 week'
    ) AS week_start
),
postings AS (
    SELECT date_trunc('week', COALESCE(published_at, first_seen_at)) AS week_start, role_type
    FROM jobs
)
SELECT
    w.week_start::date AS week_start,
    COUNT(p.role_type) AS new_jobs,
    COUNT(p.role_type) FILTER (WHERE p.role_type = 'Development') AS development,
    COUNT(p.role_type) FILTER (WHERE p.role_type = 'Data') AS data,
    COUNT(p.role_type) FILTER (WHERE p.role_type = 'QA') AS qa,
    COUNT(p.role_type) - LAG(COUNT(p.role_type)) OVER (ORDER BY w.week_start) AS change_vs_prev_week
FROM weeks w
LEFT JOIN postings p ON p.week_start = w.week_start
GROUP BY w.week_start
ORDER BY w.week_start;
