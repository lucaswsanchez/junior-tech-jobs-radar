from __future__ import annotations

from jobs_radar.extract import GetOnBoardSource, HimalayasSource, HttpClient, RemotiveSource
from jobs_radar.transform.pipeline import transform
from tests.conftest import load_fixture
from tests.factories import make_posting


def test_transform_keeps_only_junior_tech_jobs_open_to_argentina() -> None:
    postings = [
        make_posting(source_id="ok", title="Junior Python Developer"),
        make_posting(source_id="dup", title="Junior Python Developer (Remote)", source="RemoteOK"),
        make_posting(source_id="senior", title="Senior Python Developer", company="B"),
        make_posting(source_id="usa", title="Junior QA Analyst", location="USA", company="C"),
        make_posting(
            source_id="acct", title="Junior Accountant", company="D", description="Use Excel daily"
        ),
    ]

    result = transform(postings)

    assert [j.source_id for j in result.jobs] == ["ok"]
    assert result.input_count == 5
    assert result.rejected == {"duplicate": 1, "seniority": 1, "location": 1, "not_tech": 1}
    job = result.jobs[0]
    assert job.id == postings[0].uid
    assert job.role_type == "Development"
    assert job.seniority == "Junior"
    assert job.location_scope == "Worldwide"
    assert job.language == "en"
    assert {"Python", "PostgreSQL"} <= set(job.skills)


def test_transform_on_real_fixtures() -> None:
    client = HttpClient(delay_seconds=0)
    postings = [
        *GetOnBoardSource(client).parse_many(load_fixture("getonbrd.json")["data"]),
        *HimalayasSource(client).parse_many(load_fixture("himalayas.json")["jobs"]),
        *RemotiveSource(client).parse_many(load_fixture("remotive.json")["jobs"]),
    ]

    result = transform(postings)
    titles = {j.title for j in result.jobs}

    assert "Infosec Analyst I" in titles  # Get on Board, junior, fully remote
    assert "Analista de sistemas Jr / QA Jr / Scrum Jr" in titles  # Himalayas, Argentina
    assert "Database Administrator (Junior)" not in titles  # hybrid in Chile
    assert "Head of SEO — Medical Accounts" not in titles  # senior
    assert "Tech Lead Full-Stack Rails Engineer" not in titles  # senior + USA
    analyst = next(j for j in result.jobs if j.title.startswith("Analista de sistemas"))
    assert analyst.language == "es"
    assert analyst.location_scope == "Argentina"
    assert analyst.role_type == "QA"
    assert "Agile/Scrum" in analyst.skills


def test_long_descriptions_are_truncated() -> None:
    posting = make_posting(description="Python " * 5000)
    job = transform([posting]).jobs[0]
    assert len(job.description) == 6000
