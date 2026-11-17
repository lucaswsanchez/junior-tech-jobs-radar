import pytest

from jobs_radar.transform.location import ARGENTINA, LATAM, WORLDWIDE, classify_location
from tests.factories import make_posting


@pytest.mark.parametrize(
    ("location", "remote", "expected"),
    [
        ("Argentina", False, ARGENTINA),
        ("Buenos Aires, Argentina", False, ARGENTINA),
        ("Argentina, +44 countries", True, ARGENTINA),
        ("Córdoba", False, ARGENTINA),
        ("LATAM, Europe, USA, Canada, APAC", True, LATAM),
        ("Latin America", True, LATAM),
        ("Americas", True, LATAM),
        ("Worldwide", True, WORLDWIDE),
        ("Anywhere in the World", True, WORLDWIDE),
        ("Remote", True, WORLDWIDE),
        ("USA", True, None),
        ("USA, Canada, USA timezones", True, None),
        ("Europe", True, None),
        ("North America", True, None),
        ("Chile", False, None),
        ("Mexico", True, None),
        ("Remote (local residents only)", True, None),
        ("Worldwide", False, None),
        ("", True, None),
    ],
)
def test_classify_location(location: str, remote: bool, expected: str | None) -> None:
    assert classify_location(make_posting(location=location, remote=remote)) == expected
