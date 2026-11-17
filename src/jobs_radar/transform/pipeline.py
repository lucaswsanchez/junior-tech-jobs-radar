"""Transform orchestration: filter, deduplicate and enrich raw postings."""

from __future__ import annotations

import logging
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass, field

from jobs_radar.models import Job, JobPosting
from jobs_radar.transform.dedupe import dedupe
from jobs_radar.transform.language import detect_language
from jobs_radar.transform.location import classify_location
from jobs_radar.transform.roles import classify_role, is_non_tech_title
from jobs_radar.transform.seniority import classify_seniority
from jobs_radar.transform.skills import extract_skills

logger = logging.getLogger(__name__)

MAX_DESCRIPTION_CHARS = 6000

# Skills that show up in almost any office job: on their own they do not make a role "tech".
GENERIC_SKILLS = frozenset(
    {
        "Excel",
        "Google Sheets",
        "Microsoft 365",
        "Agile/Scrum",
        "Jira",
        "Figma",
        "Windows",
        "Salesforce",
        "SAP",
        "Statistics",
    }
)


def is_tech(job: Job) -> bool:
    if is_non_tech_title(job.title):
        return False
    return job.role_type != "Other" or any(s not in GENERIC_SKILLS for s in job.skills)


@dataclass
class TransformResult:
    jobs: list[Job]
    input_count: int
    rejected: Counter[str] = field(default_factory=Counter)

    @property
    def kept(self) -> int:
        return len(self.jobs)


def enrich(posting: JobPosting, seniority: str, location_scope: str) -> Job:
    skills = extract_skills(posting.title, posting.description, " , ".join(posting.tags))
    return Job(
        **posting.model_dump(exclude={"description"}),
        description=posting.description[:MAX_DESCRIPTION_CHARS],
        id=posting.uid,
        seniority=seniority,
        location_scope=location_scope,
        role_type=classify_role(posting.title, posting.tags),
        language=detect_language(
            f"{posting.title}\n{posting.description}", hint=posting.language_hint
        ),
        skills=skills,
    )


def transform(postings: Iterable[JobPosting]) -> TransformResult:
    """Apply every rule in order and keep counts of why postings were dropped."""
    items = list(postings)
    rejected: Counter[str] = Counter()
    jobs: list[Job] = []
    unique = dedupe(items)
    rejected["duplicate"] = len(items) - len(unique)
    for posting in unique:
        seniority = classify_seniority(posting)
        if seniority is None:
            rejected["seniority"] += 1
            continue
        scope = classify_location(posting)
        if scope is None:
            rejected["location"] += 1
            continue
        job = enrich(posting, seniority, scope)
        if not is_tech(job):
            # Junior but not a tech role (e.g. sales, accounting): out of scope.
            rejected["not_tech"] += 1
            continue
        jobs.append(job)
    logger.info("Transform kept %d of %d postings; rejected: %s", len(jobs), len(items), rejected)
    return TransformResult(jobs=jobs, input_count=len(items), rejected=rejected)
