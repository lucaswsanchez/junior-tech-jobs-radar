-- 05. Skills that appear together
-- Question: which technology combos are asked for together (e.g. Python + SQL)?
-- How: self-join job_skills on the same job with a < b to count each unordered pair once.
--      `lift` = P(a and b) / (P(a) * P(b)): values above 1 mean the pair appears together
--      more often than chance would predict.
WITH active AS (
    SELECT js.job_id, js.skill_id
    FROM job_skills js
    JOIN jobs j ON j.id = js.job_id
    WHERE j.last_seen_at >= NOW() - INTERVAL '7 days'
),
total AS (
    SELECT COUNT(DISTINCT job_id)::numeric AS n FROM active
),
singles AS (
    SELECT skill_id, COUNT(*) AS n FROM active GROUP BY skill_id
),
pairs AS (
    SELECT a.skill_id AS skill_a, b.skill_id AS skill_b, COUNT(*) AS together
    FROM active a
    JOIN active b ON a.job_id = b.job_id AND a.skill_id < b.skill_id
    GROUP BY a.skill_id, b.skill_id
)
SELECT
    sa.name AS skill_a,
    sb.name AS skill_b,
    p.together,
    ROUND(p.together * t.n / (s1.n * s2.n), 2) AS lift
FROM pairs p
CROSS JOIN total t
JOIN singles s1 ON s1.skill_id = p.skill_a
JOIN singles s2 ON s2.skill_id = p.skill_b
JOIN skills sa ON sa.id = p.skill_a
JOIN skills sb ON sb.id = p.skill_b
WHERE p.together >= 2
ORDER BY p.together DESC, lift DESC
LIMIT 20;
