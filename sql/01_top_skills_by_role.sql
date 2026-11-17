-- 01. Top 10 skills for each role type
-- Question: which technologies should a junior learn for the role they want?
-- How: count job-skill links per (role, skill) over active jobs, rank them inside each
--      role with a window function and keep the top 10. `pct_of_role` is the share of
--      that role's jobs that mention the skill.
WITH active_jobs AS (
    SELECT id, role_type
    FROM jobs
    WHERE last_seen_at >= NOW() - INTERVAL '7 days'
),
role_totals AS (
    SELECT role_type, COUNT(*) AS jobs_in_role
    FROM active_jobs
    GROUP BY role_type
),
skill_counts AS (
    SELECT aj.role_type, s.name AS skill, COUNT(*) AS jobs_with_skill
    FROM active_jobs aj
    JOIN job_skills js ON js.job_id = aj.id
    JOIN skills s ON s.id = js.skill_id
    GROUP BY aj.role_type, s.name
),
ranked AS (
    SELECT
        sc.*,
        ROUND(100.0 * sc.jobs_with_skill / rt.jobs_in_role, 1) AS pct_of_role,
        RANK() OVER (PARTITION BY sc.role_type ORDER BY sc.jobs_with_skill DESC) AS rnk
    FROM skill_counts sc
    JOIN role_totals rt USING (role_type)
)
SELECT role_type, rnk, skill, jobs_with_skill, pct_of_role
FROM ranked
WHERE rnk <= 10
ORDER BY role_type, rnk, skill;
