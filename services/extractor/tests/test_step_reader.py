"""The ISO 10303-21 (STEP) reader: header, instance index, typed tokens, verbatim excerpts.

Every value stays the token the file writes: a real or an integer is never turned into a
number here (prompt 3 section 6; the Python bans). Strings keep their token as written and
carry their decoded text. A statement the reader cannot read is recorded with its STEP id and
the rest of the file is still read (prompt 3 section 8: a file with problems is read where it
can be). All text below is synthetic TEST data.

Ids: F-IFC-01, F-EXTRACT-01, ifc-input 4.1 item 3 (the verbatim STEP text is the excerpt),
guardrails rule 13 (problems carry codes and STEP ids, never text).
"""

from __future__ import annotations

import pytest

from sovitech_extractor.ifc import step
from sovitech_extractor.ifc.step import (
    Binary,
    Derived,
    Enum,
    Integer,
    Real,
    Ref,
    StepList,
    Str,
    Typed,
    Unset,
)

HEADER = (
    "ISO-10303-21;\n"
    "HEADER;\n"
    "FILE_DESCRIPTION(('ViewDefinition [TEST]','TEST FIXTURE; not a real project'),'2;1');\n"
    "FILE_NAME('test.ifc','2026-01-15T09:00:00',('TEST author'),('TEST org'),"
    "'TEST preprocessor','TEST originating system 7','');\n"
    "FILE_SCHEMA(('IFC4'));\n"
    "ENDSEC;\n"
)


def _file(data: str, header: str = HEADER) -> step.StepFile:
    return step.read_text(f"{header}DATA;\n{data}ENDSEC;\nEND-ISO-10303-21;\n")


def test_header_is_read_as_written() -> None:
    parsed = _file("#1=IFCWALL('0000000000000000000001',$,$,$,$,$,$,$,$);\n")
    assert parsed.header.schemas == ("IFC4",)
    assert parsed.header.originating_system == "TEST originating system 7"
    assert parsed.header.preprocessor_version == "TEST preprocessor"
    assert parsed.header.description == (
        "ViewDefinition [TEST]",
        "TEST FIXTURE; not a real project",
    )
    assert parsed.problems == ()


def test_instances_are_indexed_in_file_order_with_their_verbatim_text() -> None:
    data = (
        "#10=IFCLABELTEST('a;b)c',$);\n"
        "/* a comment ; with ) inside */\n"
        "#11 = IFCSECOND ( #10 , .T. ) ;\n"
        "#12=IFCTHIRD(\n  'multi',\n  $\n);\n"
    )
    parsed = _file(data)
    assert list(parsed.ids()) == ["10", "11", "12"]
    assert parsed.keyword("10") == "IFCLABELTEST"
    assert parsed.keyword("11") == "IFCSECOND"
    assert parsed.excerpt("10") == "#10=IFCLABELTEST('a;b)c',$);"
    assert parsed.excerpt("11") == "#11 = IFCSECOND ( #10 , .T. ) ;"
    assert parsed.excerpt("12") == "#12=IFCTHIRD(\n  'multi',\n  $\n);"
    assert parsed.ids_of("IFCSECOND") == ("11",)


def test_every_token_kind_keeps_its_token() -> None:
    parsed = _file(
        "#1=IFCTEST($,*,#7,.ELEMENT.,.T.,.U.,1.,-6500.,2.5,1.E-05,+3.0E2,17,-1,"
        "'x''y',\"0FF\",IFCLABEL('Pomp\\X2\\0103\\X0\\'),IFCPOWERMEASURE(5.5),"
        "(#2,#3),((1.,2.),(3.,4.)),());\n"
    )
    values = parsed.attributes("1")
    assert values[0] == Unset()
    assert values[1] == Derived()
    assert values[2] == Ref("7")
    assert values[3] == Enum(".ELEMENT.")
    assert values[4] == Enum(".T.")
    assert values[5] == Enum(".U.")
    assert [values[i] for i in range(6, 12)] == [
        Real("1."),
        Real("-6500."),
        Real("2.5"),
        Real("1.E-05"),
        Real("+3.0E2"),
        Integer("17"),
    ]
    assert values[12] == Integer("-1")
    assert values[13] == Str("'x''y'", "x'y")
    assert values[14] == Binary('"0FF"')
    assert values[15] == Typed("IFCLABEL", Str("'Pomp\\X2\\0103\\X0\\'", "Pompă"))
    assert values[16] == Typed("IFCPOWERMEASURE", Real("5.5"))
    assert values[17] == StepList((Ref("2"), Ref("3")))
    assert values[18] == StepList(
        (StepList((Real("1."), Real("2."))), StepList((Real("3."), Real("4."))))
    )
    assert values[19] == StepList(())


@pytest.mark.parametrize(
    ("token", "text"),
    [
        ("'Camer\\X2\\0103\\X0\\ 101'", "Cameră 101"),
        ("'Zon\\X2\\0103\\X0\\ HVAC'", "Zonă HVAC"),
        ("'\\X2\\0219021B\\X0\\'", "șț"),
        ("'\\X4\\0001F600\\X0\\'", "\U0001f600"),
        ("'caf\\X\\E9'", "café"),
        ("'caf\\S\\i'", "café"),
        ("'back\\\\slash'", "back\\slash"),
        ("'O''Neil'", "O'Neil"),
        ("''", ""),
        ("'\\PB\\\\S\\:'", "ş"),
    ],
)
def test_strings_are_decoded_from_their_escapes(token: str, text: str) -> None:
    assert step.decode_string(token) == text


def test_an_escape_that_breaks_the_rules_is_a_problem_not_a_guess() -> None:
    with pytest.raises(step.StepSyntaxError):
        step.decode_string("'\\X2\\01\\X0\\'")


def test_attributes_are_parsed_only_when_asked_and_cached() -> None:
    parsed = _file("#1=IFCA('0000000000000000000001');\n#2=IFCB(#1);\n")
    assert parsed.parsed_count() == 0
    assert parsed.attributes("2") == (Ref("1"),)
    assert parsed.attributes("2") is parsed.attributes("2")
    assert parsed.parsed_count() == 1


def test_a_statement_that_cannot_be_read_is_recorded_and_the_rest_is_read() -> None:
    parsed = _file(
        "#1=IFCA($);\nthis is not a statement;\n#2=IFCB('ok');\n#3=IFCC($;\n#4=IFCD($);\n"
    )
    assert list(parsed.ids()) == ["1", "2", "3", "4"]
    codes = [problem.code for problem in parsed.problems]
    assert "step.unexpected_text" in codes
    with pytest.raises(step.StepSyntaxError):
        parsed.attributes("3")
    assert parsed.attributes("4") == (Unset(),)


def test_a_duplicate_instance_id_is_a_problem_with_its_id() -> None:
    parsed = _file("#1=IFCA($);\n#1=IFCB($);\n")
    duplicate = [problem for problem in parsed.problems if problem.code == "step.duplicate_id"]
    assert [problem.step_ids for problem in duplicate] == [("1",)]
    assert parsed.keyword("1") == "IFCA"


def test_a_complex_instance_is_indexed_but_not_read() -> None:
    parsed = _file("#1=(IFCA($)IFCB($));\n#2=IFCC($);\n")
    assert parsed.keyword("1") is None
    assert [problem.code for problem in parsed.problems] == ["step.complex_instance"]
    assert parsed.keyword("2") == "IFCC"


def test_problems_hold_codes_and_ids_only() -> None:
    parsed = _file("#1=IFCA('secret text');\nsecret text here;\n#2=IFCB($);\n")
    assert parsed.problems
    for problem in parsed.problems:
        assert "secret" not in repr(problem)


def test_a_file_that_is_not_step_is_refused() -> None:
    with pytest.raises(step.NotStepError):
        step.read_text("%PDF-1.7 not a step file")


def test_a_missing_data_section_is_refused() -> None:
    with pytest.raises(step.NotStepError):
        step.read_text(HEADER + "END-ISO-10303-21;\n")


def test_bytes_that_are_not_utf8_are_read_as_latin1_and_flagged() -> None:
    raw = (HEADER + "DATA;\n#1=IFCA('caf\xe9');\nENDSEC;\nEND-ISO-10303-21;\n").encode("latin-1")
    parsed = step.read_bytes(raw)
    assert parsed.attributes("1") == (Str("'caf\xe9'", "caf\xe9"),)
    assert "step.non_ascii_text" in [problem.code for problem in parsed.problems]
