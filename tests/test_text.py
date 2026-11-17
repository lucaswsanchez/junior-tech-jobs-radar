from jobs_radar.text import clean_inline, fix_mojibake, html_to_text


def test_html_to_text_keeps_block_breaks_and_unescapes() -> None:
    raw = "<p>Hello&nbsp;<strong>world</strong></p><ul><li>Python</li><li>SQL &amp; dbt</li></ul>"
    assert html_to_text(raw) == "Hello world\nPython\nSQL & dbt"


def test_html_to_text_handles_empty() -> None:
    assert html_to_text(None) == ""
    assert html_to_text("") == ""


def test_fix_mojibake_repairs_double_encoded_utf8() -> None:
    assert fix_mojibake("MÃ¼nchen") == "München"
    assert fix_mojibake("partnerâ\x80\x99s") == "partner\u2019s"
    assert fix_mojibake("Córdoba") == "Córdoba"


def test_clean_inline_collapses_whitespace() -> None:
    assert clean_inline("  Junior <b>QA</b>\n Analyst ") == "Junior QA Analyst"
