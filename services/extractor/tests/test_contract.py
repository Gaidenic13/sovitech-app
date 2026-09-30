"""The extraction contract on the Python side.

It reads the same shared corpus as the TypeScript side
(packages/extraction-contract/src/samples/corpus.json) and must reach the same verdict on every
case: 'valid', 'schema', or the sorted invariant ids it breaks. Every valid value survives the
round trip through the dataclasses, and through JSON text, unchanged.

Ids: F-EXTRACT-01, F-EXTRACT-03, F-INGEST-05, F-IFC-01, F-IFC-09, R-027, G1-13, G12-1, G12-5,
G13-4, guardrails rule 13 (problems carry no values) and rule 14 (hidden text is reported).
"""

from __future__ import annotations

import copy
import dataclasses
import json
from pathlib import Path
from typing import Any

import pytest

from sovitech_extractor import contract
from sovitech_extractor.contract import _codec, _generated, _invariants, _validate

REPO = Path(__file__).resolve().parents[3]
SOURCE = REPO / "packages" / "extraction-contract" / "src" / "extraction-contract.schema.json"
CORPUS_FILE = REPO / "packages" / "extraction-contract" / "src" / "samples" / "corpus.json"


def _tokens(pointer: str) -> list[str]:
    if pointer == "":
        return []
    return [token.replace("~1", "/").replace("~0", "~") for token in pointer[1:].split("/")]


def _position(items: list[Any], token: str) -> int:
    for index in range(len(items)):
        if str(index) == token:
            return index
    raise KeyError(token)


def _apply(document: Any, operation: dict[str, Any]) -> Any:
    path = _tokens(operation["path"])
    if not path:
        return copy.deepcopy(operation["value"])
    result = copy.deepcopy(document)
    parent = result
    for token in path[:-1]:
        parent = parent[_position(parent, token)] if isinstance(parent, list) else parent[token]
    last = path[-1]
    if isinstance(parent, list):
        if operation["op"] == "set" and last == "-":
            parent.append(copy.deepcopy(operation["value"]))
        elif operation["op"] == "set":
            parent[_position(parent, last)] = copy.deepcopy(operation["value"])
        else:
            del parent[_position(parent, last)]
    elif operation["op"] == "set":
        parent[last] = copy.deepcopy(operation["value"])
    else:
        del parent[last]
    return result


def _load_corpus() -> tuple[dict[str, dict[str, Any]], list[dict[str, Any]]]:
    raw = json.loads(CORPUS_FILE.read_text("utf-8"))
    cases: dict[str, dict[str, Any]] = {}
    for item in raw["cases"]:
        if "base" in item:
            base = cases[item["base"]]
            value = base["value"]
            for operation in item["patch"]:
                value = _apply(value, operation)
            entry = base["entry"]
        else:
            value, entry = item["value"], item["entry"]
        expect = item["expect"] if isinstance(item["expect"], str) else sorted(item["expect"])
        cases[item["name"]] = {
            "name": item["name"],
            "entry": entry,
            "value": value,
            "expect": expect,
        }
    return cases, raw["pairs"]


CASES, PAIRS = _load_corpus()
VALID = [name for name, case in CASES.items() if case["expect"] == "valid"]


def _verdict(problems: tuple[contract.Problem, ...]) -> str | list[str]:
    if not problems:
        return "valid"
    if any(not problem.code.startswith("invariant:") for problem in problems):
        return "schema"
    return sorted({problem.code.removeprefix("invariant:") for problem in problems})


def _parse(entry: str, value: Any) -> Any:
    parsers = {
        "ExtractionOutput": contract.parse_output,
        "ExtractionRequest": contract.parse_request,
        "EvidenceLocator": contract.parse_evidence_locator,
    }
    return parsers[entry](value)


def test_f_extract_03_the_corpus_holds_every_kind_of_case() -> None:
    for entry in contract.ENTRY_POINTS:
        expects = [case["expect"] for case in CASES.values() if case["entry"] == entry]
        assert "valid" in expects
        assert "schema" in expects
        assert any(isinstance(expect, list) for expect in expects)


@pytest.mark.parametrize("name", list(CASES))
def test_f_extract_03_case_reaches_its_expected_verdict(name: str) -> None:
    case = CASES[name]
    assert _verdict(contract.check(case["entry"], case["value"])) == case["expect"]


@pytest.mark.parametrize("name", VALID)
def test_f_extract_03_valid_case_survives_the_round_trip(name: str) -> None:
    case = CASES[name]
    parsed = _parse(case["entry"], case["value"])
    assert _codec.dump(parsed) == case["value"]
    through_text = _parse(case["entry"], json.loads(json.dumps(case["value"], ensure_ascii=False)))
    assert through_text == parsed
    dumped = json.dumps(_codec.dump(through_text), ensure_ascii=False, sort_keys=True)
    assert dumped == json.dumps(case["value"], ensure_ascii=False, sort_keys=True)


@pytest.mark.parametrize(
    "name", [name for name in VALID if CASES[name]["entry"] != "EvidenceLocator"]
)
def test_f_extract_03_the_writers_check_what_they_write(name: str) -> None:
    case = CASES[name]
    parsed = _parse(case["entry"], case["value"])
    writer = contract.dump_output if case["entry"] == "ExtractionOutput" else contract.dump_request
    assert writer(parsed) == case["value"]


def test_f_extract_03_the_output_writer_refuses_an_ifc_file_marked_analysed() -> None:
    output = contract.parse_output(CASES["ifc-gate-closed"]["value"])
    analysed = dataclasses.replace(output, analysis=contract.AnalysedStatus(status="analysed"))
    with pytest.raises(contract.ContractError) as refused:
        contract.dump_output(analysed)
    assert [problem.code for problem in refused.value.problems] == [
        "invariant:status_matches_format"
    ]


def test_f_extract_03_the_schema_copy_is_the_source_byte_for_byte() -> None:
    assert _validate.SCHEMA_FILE.read_bytes() == SOURCE.read_bytes()


def test_f_extract_03_every_invariant_of_the_schema_has_one_implementation() -> None:
    named: list[str] = []
    for definition in _validate.definitions().values():
        named.extend(definition.get("x-invariants", ()))
    assert sorted(named) == sorted(_generated.INVARIANT_IDS)
    assert sorted(_invariants.INVARIANTS) == sorted(_generated.INVARIANT_IDS)


def test_f_extract_03_every_object_def_has_a_frozen_dataclass() -> None:
    for name, definition in _validate.definitions().items():
        if definition.get("type") != "object":
            continue
        cls = getattr(_generated, name)
        assert dataclasses.is_dataclass(cls)
        assert cls.__dataclass_params__.frozen
        keys = set(definition["properties"])
        assert {_codec.camel_case(field.name) for field in dataclasses.fields(cls)} == keys


def test_rule_13_problems_hold_paths_and_codes_never_values() -> None:
    for case in CASES.values():
        if case["expect"] == "valid":
            continue
        with pytest.raises(contract.ContractError) as refused:
            _parse(case["entry"], case["value"])
        message = str(refused.value)
        assert "TEST" not in message
        assert "problem" in message
        for problem in refused.value.problems:
            assert set(dataclasses.asdict(problem)) == {"path", "code"}
            assert "TEST" not in problem.path
            assert "CTA-T1" not in problem.path


def test_rule_13_an_unknown_key_named_with_document_text_is_reported_without_the_key() -> None:
    value = copy.deepcopy(CASES["pdf-analysed"]["value"])
    value["Nota TEST pentru cititor"] = True
    assert contract.check("ExtractionOutput", value) == (contract.Problem("", "unknown_key"),)


@pytest.mark.parametrize(
    ("name", "key"),
    [
        ("locator-ifc-object", "/ifc"),
        ("locator-globalid-key", "/globalId"),
        ("locator-step-ids-key", "/stepIds"),
        ("locator-path-key", "/path"),
    ],
)
def test_g1_13_an_ifc_key_in_evidence_locator_is_refused_with_ifc_field(
    name: str, key: str
) -> None:
    problems = contract.check("EvidenceLocator", CASES[name]["value"])
    assert [problem.path for problem in problems if problem.code == "ifc_field"] == [key]


def test_g1_13_the_ifc_locator_keys_come_from_the_schema() -> None:
    assert contract.ifc_locator_keys() == (
        "ifc",
        "globalId",
        "globalIds",
        "guid",
        "stepId",
        "stepIds",
        "step",
        "path",
    )


def test_g12_5_an_ifc_output_is_stored_only_with_the_word_ifc_model() -> None:
    output = contract.parse_output(CASES["ifc-with-values"]["value"])
    assert output.analysis == contract.StoredOnlyStatus(
        status="stored_only", format_word="IFC model"
    )


def test_g13_4_derivatives_are_keyed_by_project_id_and_content_hash() -> None:
    output = contract.parse_output(CASES["ifc-gate-closed"]["value"])
    for derivative in output.derivatives:
        prefix = f"{output.job.project_id}/{output.job.content_hash}/derived/"
        assert derivative.relative_path.startswith(prefix)
        assert (derivative.project_id, derivative.content_hash) == (
            output.job.project_id,
            output.job.content_hash,
        )


@pytest.mark.parametrize("pair", PAIRS, ids=[pair["name"] for pair in PAIRS])
def test_r_027_an_output_answers_its_request(pair: dict[str, Any]) -> None:
    request = contract.parse_request(CASES[pair["request"]]["value"])
    output = contract.parse_output(CASES[pair["output"]]["value"])
    paths = [problem.path for problem in contract.output_answers_request(request, output)]
    assert paths == pair["expect"]
