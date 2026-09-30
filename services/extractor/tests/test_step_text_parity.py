"""The two in-house STEP text readers read the shared corpus the same way.

The owner's decision of 2026-09-26 ("web-ifc instead"; ADR 0018, ADR 0031) keeps the in-house
STEP reader for word-for-word evidence only: each fact's verbatim STEP line and literal tokens.
The IFC reader carries it in TypeScript (packages/ifc-reader/src/step-text.ts); this reader
(sovitech_extractor/ifc/step.py) is the one it was written from. Both tests read every case of
packages/ifc-reader/src/step-text-corpus.json (synthetic TEST text) and must give the same tokens,
decoded texts, excerpts, keywords and problem codes; the TypeScript half is
packages/ifc-reader/src/step-text.test.ts.

Ids: F-IFC-01, ifc-input 4.1 item 3 (the verbatim STEP text is the excerpt), rule 13 (problems
are codes and STEP ids).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from sovitech_extractor.ifc import step

CORPUS = json.loads(
    (
        Path(__file__).resolve().parents[3]
        / "packages"
        / "ifc-reader"
        / "src"
        / "step-text-corpus.json"
    ).read_text("utf-8")
)


def _as_json(value: step.Value) -> dict[str, Any]:
    """A token in the corpus's form (the TypeScript reader's StepToken)."""
    if isinstance(value, step.Unset):
        return {"kind": "unset"}
    if isinstance(value, step.Derived):
        return {"kind": "derived"}
    if isinstance(value, step.Ref):
        return {"kind": "ref", "id": value.id}
    if isinstance(value, step.Str):
        return {"kind": "string", "token": value.token, "text": value.text}
    if isinstance(value, step.Typed):
        return {"kind": "typed", "typeName": value.type_name, "value": _as_json(value.value)}
    if isinstance(value, step.StepList):
        return {"kind": "list", "items": [_as_json(item) for item in value.items]}
    kinds = {step.Enum: "enum", step.Real: "real", step.Integer: "integer", step.Binary: "binary"}
    return {"kind": kinds[type(value)], "token": value.token}


@pytest.mark.parametrize("case", CORPUS["strings"], ids=lambda case: case["token"])
def test_F_IFC_01_a_string_decodes_as_the_typescript_reader_decodes_it(
    case: dict[str, str],
) -> None:
    if "error" in case:
        with pytest.raises(step.StepSyntaxError, match=case["error"]):
            step.decode_string(case["token"])
    else:
        assert step.decode_string(case["token"]) == case["text"]


@pytest.mark.parametrize("case", CORPUS["files"], ids=lambda case: case["name"])
def test_F_IFC_01_a_file_reads_as_the_typescript_reader_reads_it(case: dict[str, Any]) -> None:
    read = step.read_text(case["text"])
    problems = [{"code": p.code, "stepIds": list(p.step_ids)} for p in read.problems]
    assert problems == case["problems"]
    assert list(read.ids()) == [instance["id"] for instance in case["instances"]]
    for instance in case["instances"]:
        assert read.keyword(instance["id"]) == instance["keyword"]
        assert read.excerpt(instance["id"]) == instance["excerpt"]
        if "error" in instance:
            with pytest.raises(step.StepSyntaxError, match=instance["error"]):
                read.attributes(instance["id"])
        else:
            assert [_as_json(v) for v in read.attributes(instance["id"])] == instance["attributes"]


@pytest.mark.parametrize("case", CORPUS["notStep"], ids=lambda case: case["error"])
def test_F_IFC_01_text_that_is_no_exchange_file_is_refused(case: dict[str, str]) -> None:
    with pytest.raises(step.NotStepError, match=case["error"]):
        step.read_text(case["text"])
