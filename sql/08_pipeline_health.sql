-- 08. Pipeline health: last 14 runs
-- Question: is the daily ETL running, how long does it take and how selective are the filters?
-- How: duration from timestamps, keep rate = kept / fetched, and the number of sources
--      that failed (length of the JSON `errors` array).
SELECT
    id,
    started_at,
    status,
    ROUND(EXTRACT(EPOCH FROM (finished_at - started_at))::numeric, 1) AS duration_s,
    fetched,
    kept,
    ROUND(100.0 * kept / NULLIF(fetched, 0), 1) AS pct_kept,
    inserted,
    updated,
    json_array_length(errors::json) AS failed_sources
FROM pipeline_runs
ORDER BY id DESC
LIMIT 14;
