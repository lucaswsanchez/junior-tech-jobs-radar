"""Pydantic models shared by every pipeline stage."""

from __future__ import annotations

import hashlib
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

ROLE_TYPES: tuple[str, ...] = (
    "Development",
    "QA",
    "Data",
    "IT Support",
    "AI/Annotation",
    "Admin/VA",
    "Other",
)


class JobPosting(BaseModel):
    """A job as returned by a source, mapped to the common schema (Extract output)."""

    model_config = ConfigDict(str_strip_whitespace=True)

    source: str
    source_id: str = Field(min_length=1)
    url: str
    title: str = Field(min_length=1)
    company: str = ""
    location: str = ""
    remote: bool = True
    published_at: datetime | None = None
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    seniority_hint: str | None = None
    language_hint: str | None = None

    @field_validator("url")
    @classmethod
    def _url_must_be_http(cls, value: str) -> str:
        if not value.startswith(("http://", "https://")):
            raise ValueError("url must be an absolute http(s) URL")
        return value

    @property
    def uid(self) -> str:
        """Stable primary key: hash of source + source id."""
        raw = f"{self.source}:{self.source_id}".encode()
        return hashlib.sha1(raw).hexdigest()[:16]


class Job(JobPosting):
    """A posting enriched by the Transform stage and ready to be loaded."""

    id: str
    seniority: str
    location_scope: str
    role_type: str
    language: str
    skills: list[str] = Field(default_factory=list)
