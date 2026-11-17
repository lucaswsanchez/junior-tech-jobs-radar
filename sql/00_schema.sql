-- Database schema (PostgreSQL). Generated from src/jobs_radar/load/schema.py;
-- the pipeline creates these tables automatically with `jobs-radar init-db`.

CREATE TABLE jobs (
	id VARCHAR(16) NOT NULL,
	source VARCHAR(40) NOT NULL,
	source_id VARCHAR(400) NOT NULL,
	url TEXT NOT NULL,
	title TEXT NOT NULL,
	company TEXT NOT NULL,
	location TEXT NOT NULL,
	location_scope VARCHAR(20) NOT NULL,
	remote BOOLEAN NOT NULL,
	seniority VARCHAR(20) NOT NULL,
	role_type VARCHAR(20) NOT NULL,
	language VARCHAR(2) NOT NULL,
	published_at TIMESTAMP WITH TIME ZONE,
	description TEXT NOT NULL,
	first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
	last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id)
);

CREATE INDEX ix_jobs_last_seen_at ON jobs (last_seen_at);

CREATE INDEX ix_jobs_role_type ON jobs (role_type);

CREATE TABLE pipeline_runs (
	id SERIAL NOT NULL,
	started_at TIMESTAMP WITH TIME ZONE NOT NULL,
	finished_at TIMESTAMP WITH TIME ZONE,
	status VARCHAR(20) NOT NULL,
	fetched INTEGER NOT NULL,
	kept INTEGER NOT NULL,
	inserted INTEGER NOT NULL,
	updated INTEGER NOT NULL,
	rejected JSON NOT NULL,
	source_stats JSON NOT NULL,
	errors JSON NOT NULL,
	PRIMARY KEY (id)
);

CREATE TABLE skills (
	id SERIAL NOT NULL,
	name VARCHAR(60) NOT NULL,
	category VARCHAR(40) NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (name)
);

CREATE TABLE job_skills (
	job_id VARCHAR(16) NOT NULL,
	skill_id INTEGER NOT NULL,
	PRIMARY KEY (job_id, skill_id),
	FOREIGN KEY(job_id) REFERENCES jobs (id) ON DELETE CASCADE,
	FOREIGN KEY(skill_id) REFERENCES skills (id) ON DELETE CASCADE
);

CREATE INDEX ix_job_skills_skill_id ON job_skills (skill_id);
