from jobs_radar.transform.dedupe import dedupe, normalize_key
from tests.factories import make_posting


def test_normalize_key_strips_accents_noise_and_punctuation() -> None:
    assert normalize_key("Desarrollador Júnior (Remote) - Python!") == "desarrollador junior python"


def test_same_title_and_company_across_sources_is_merged_keeping_first() -> None:
    first = make_posting(source="Get on Board", source_id="a", title="Junior QA Analyst")
    second = make_posting(source="RemoteOK", source_id="b", title="Junior QA Analyst (Remote)")
    other = make_posting(source="RemoteOK", source_id="c", title="Junior Data Analyst")

    result = dedupe([first, second, other])

    assert [p.source_id for p in result] == ["a", "c"]


def test_postings_without_company_are_never_merged() -> None:
    a = make_posting(source_id="a", company="")
    b = make_posting(source_id="b", company="")
    assert len(dedupe([a, b])) == 2


def test_same_title_different_company_is_kept() -> None:
    a = make_posting(source_id="a", company="Acme")
    b = make_posting(source_id="b", company="Globex")
    assert len(dedupe([a, b])) == 2
