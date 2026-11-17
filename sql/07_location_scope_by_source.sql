-- 07. Where can you work from? Location scope by source
-- Question: does each board list jobs explicitly for Argentina, for LATAM, or worldwide?
-- How: a pivot of location_scope per source, plus the share that explicitly names Argentina.
SELECT
    source,
    COUNT(*) FILTER (WHERE location_scope = 'Argentina') AS argentina,
    COUNT(*) FILTER (WHERE location_scope = 'LATAM') AS latam,
    COUNT(*) FILTER (WHERE location_scope = 'Worldwide') AS worldwide,
    ROUND(100.0 * COUNT(*) FILTER (WHERE location_scope = 'Argentina') / COUNT(*), 1)
        AS pct_explicit_argentina
FROM jobs
WHERE last_seen_at >= NOW() - INTERVAL '7 days'
GROUP BY source
ORDER BY COUNT(*) DESC;
