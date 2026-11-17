-- 06. English vs Spanish postings by role type
-- Question: how much does English matter for each kind of junior role?
-- How: pivot the language column with FILTER and compute the English share per role.
SELECT
    role_type,
    COUNT(*) AS active_jobs,
    COUNT(*) FILTER (WHERE language = 'en') AS english,
    COUNT(*) FILTER (WHERE language = 'es') AS spanish,
    ROUND(100.0 * COUNT(*) FILTER (WHERE language = 'en') / COUNT(*), 1) AS pct_english
FROM jobs
WHERE last_seen_at >= NOW() - INTERVAL '7 days'
GROUP BY role_type
ORDER BY pct_english DESC, active_jobs DESC;
