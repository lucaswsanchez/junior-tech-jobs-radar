-- 02. Remote share by role type
-- Question: how many junior jobs open to Argentina can be done fully remotely?
-- How: conditional aggregation with FILTER over active jobs; the ROLLUP row (role_type
--      IS NULL) is the overall total.
SELECT
    COALESCE(role_type, 'All roles') AS role_type,
    COUNT(*) AS active_jobs,
    COUNT(*) FILTER (WHERE remote) AS remote_jobs,
    ROUND(100.0 * COUNT(*) FILTER (WHERE remote) / COUNT(*), 1) AS pct_remote
FROM jobs
WHERE last_seen_at >= NOW() - INTERVAL '7 days'
GROUP BY ROLLUP (role_type)
ORDER BY role_type IS NULL, active_jobs DESC;
