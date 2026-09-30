"""Parsing and writing the contract's entry points, strictly.

Strict is the only mode: a key the schema does not name is refused at every level. The
extractor writes an output only through ``dump_output``, which checks it against the same
schema and invariants as the API (packages/extraction-contract), so the extractor never writes
a file the API would refuse.
"""

from __future__ import annotations

from typing import Any

from . import _generated as generated
from ._codec import build, dump
from ._invariants import INVARIANTS
from ._validate import Problem, Validator, definitions, pointer

_VALIDATOR = Validator(INVARIANTS)


class ContractError(ValueError):
    """A value the contract refuses.

    The message names the entry point and the number of problems; the problems name paths
    and codes. Neither holds a value, which may be document text (guardrails rule 13).
    """

    def __init__(self, entry: str, problems: tuple[Problem, ...]) -> None:
        super().__init__(f"{entry}: {len(problems)} contract problem(s)")
        self.entry = entry
        self.problems = problems


def ifc_locator_keys() -> tuple[str, ...]:
    """Keys that would carry an IFC locator: refused in Evidence.locator with ``ifc_field``."""
    return tuple(definitions()["EvidenceLocator"]["x-ifc-locator-keys"])


def check(entry: str, value: object) -> tuple[Problem, ...]:
    """Every problem of a JSON value against an entry point (empty when it is valid)."""
    if entry not in generated.ENTRY_POINTS:
        raise ValueError(f"unknown entry point {entry}")
    problems = _VALIDATOR.validate(value, entry)
    if entry == "EvidenceLocator" and isinstance(value, dict):
        ifc_keys = ifc_locator_keys()
        refused = [Problem(pointer((key,)), "ifc_field") for key in value if key in ifc_keys]
        problems = [*refused, *problems]
    return tuple(problems)


def _parse(entry: str, value: object) -> Any:
    problems = check(entry, value)
    if problems:
        raise ContractError(entry, problems)
    return build(entry, value, _VALIDATOR)


def _dump(entry: str, value: object) -> dict[str, Any]:
    data = dump(value)
    problems = check(entry, data)
    if problems:
        raise ContractError(entry, problems)
    return data


def parse_output(value: object) -> generated.ExtractionOutput:
    """An extraction output from its JSON value; raises ContractError."""
    return _parse("ExtractionOutput", value)


def parse_request(value: object) -> generated.ExtractionRequest:
    """An extraction request from its JSON value; raises ContractError."""
    return _parse("ExtractionRequest", value)


def parse_evidence_locator(
    value: object,
) -> generated.PdfEvidenceLocator | generated.XlsxEvidenceLocator:
    """An Evidence.locator from its JSON value: no IFC field (G1-13); raises ContractError."""
    return _parse("EvidenceLocator", value)


def dump_output(output: generated.ExtractionOutput) -> dict[str, Any]:
    """The JSON value of an output, checked first; raises ContractError."""
    return _dump("ExtractionOutput", output)


def dump_request(request: generated.ExtractionRequest) -> dict[str, Any]:
    """The JSON value of a request, checked first; raises ContractError."""
    return _dump("ExtractionRequest", request)


def output_answers_request(
    request: generated.ExtractionRequest, output: generated.ExtractionOutput
) -> tuple[Problem, ...]:
    """Whether an output answers its request, as outputAnswersRequest does on the API side."""
    problems: list[Problem] = []
    if output.job != request.job:
        problems.append(Problem("/job", "value"))
    not_placed = output.format == "other" and output.analysis.status == "failed"
    if output.format != request.declared_format and not not_placed:
        problems.append(Problem("/format", "value"))
    if output.ifc_values is not None and not request.ifc_values:
        problems.append(Problem("/ifcValues", "value"))
    ids = output.ifc_model.ids if output.ifc_model is not None else None
    if ids is not None and ids.ids != request.ids:
        problems.append(Problem("/ifcModel/ids/ids", "value"))
    problems.extend(
        Problem(pointer(("derivatives", index, "kind")), "value")
        for index, derivative in enumerate(output.derivatives)
        if derivative.kind not in request.derivatives
    )
    if output.ifc_values is not None:
        problems.extend(
            Problem(pointer(("ifcValues", "candidateProposals", index, "datasets")), "value")
            for index, proposal in enumerate(output.ifc_values.candidate_proposals)
            if any(dataset not in request.datasets for dataset in proposal.datasets)
        )
    return tuple(problems)
