"""The strict validator of the extraction contract, reading schema.json.

schema.json is a byte copy of packages/extraction-contract/src/extraction-contract.schema.json,
written by the generator. This module reads the same JSON Schema subset the TypeScript side
generates zod from (packages/extraction-contract/src/generator/subset.ts refuses any other
keyword), with the same meanings:

- every object is closed: an unknown key is a problem (``unknown_key``);
- string lengths count code points; patterns are anchored and match the whole value;
- integers are JSON integers (a bool is not one), numbers are finite;
- a def's ``x-invariants`` run on its value once its subtree has no structural problem,
  and report ``invariant:<id>``.

A problem is a JSON Pointer and a code, never the value or a key the input chose: a value may
be document text (guardrails rule 13: logs and error reports never contain it).
"""

from __future__ import annotations

import json
import math
import re
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import Any

SCHEMA_FILE = Path(__file__).with_name("schema.json")

STRUCTURAL_CODES = frozenset(
    {
        "unknown_key",
        "ifc_field",
        "type",
        "value",
        "pattern",
        "length",
        "range",
        "items",
        "unique",
        "union",
    }
)

type PathPart = str | int
type RelativePath = tuple[PathPart, ...]
type Invariant = Callable[[Any], list[RelativePath]]


@dataclass(frozen=True, slots=True)
class Problem:
    """One reason a value is refused: where it is (a JSON Pointer) and a code."""

    path: str
    code: str

    @property
    def structural(self) -> bool:
        return self.code in STRUCTURAL_CODES


def pointer(path: Sequence[PathPart]) -> str:
    """A JSON Pointer from a path."""
    return "".join("/" + str(part).replace("~", "~0").replace("/", "~1") for part in path)


@cache
def load_schema() -> Mapping[str, Any]:
    """The contract schema (schema.json beside this module)."""
    return json.loads(SCHEMA_FILE.read_text("utf-8"))


def definitions() -> Mapping[str, Any]:
    return load_schema()["$defs"]


@cache
def _compiled(pattern: str) -> re.Pattern[str]:
    # The schema anchors every pattern with ^ and $. Python's $ also matches before a final
    # line break, and JavaScript's does not, so the end anchor becomes \Z here.
    body = pattern[:-1] + r"\Z" if pattern.endswith("$") else pattern
    return re.compile(body)


def _is_integer(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _is_number(value: object) -> bool:
    if isinstance(value, bool) or not isinstance(value, int | float):
        return False
    return not isinstance(value, float) or math.isfinite(value)


def _is_fixed_tuple(node: Mapping[str, Any]) -> bool:
    size = node.get("minItems")
    return (
        size is not None
        and size == node.get("maxItems")
        and 1 < size <= 8
        and not node.get("uniqueItems", False)
    )


class Validator:
    """Validates JSON values (as ``json.loads`` returns them) against the contract's defs."""

    def __init__(self, invariants: Mapping[str, Invariant]) -> None:
        self._defs = definitions()
        self._invariants = invariants

    def validate(self, value: object, def_name: str) -> list[Problem]:
        """Every problem of a value against one def, in document order."""
        return self._def(def_name, value, ())

    def branch_of(self, value: object, def_name: str) -> str:
        """The def of the oneOf branch a valid value takes."""
        node = self._defs[def_name]
        if "oneOf" not in node:
            return def_name
        branches = [branch["$ref"].rsplit("/", 1)[1] for branch in node["oneOf"]]
        discriminator = node.get("discriminator", {}).get("propertyName")
        if discriminator is not None and isinstance(value, Mapping):
            for branch in branches:
                const = self._defs[branch]["properties"][discriminator].get("const")
                if const == value.get(discriminator):
                    return branch
        clean = [branch for branch in branches if not self._def(branch, value, ())]
        if len(clean) != 1:
            raise ValueError(f"{def_name}: the value takes no single branch")
        return clean[0]

    def _def(self, name: str, value: object, path: RelativePath) -> list[Problem]:
        node = self._defs[name]
        problems = self._node(node, value, path)
        ids = node.get("x-invariants", ())
        if ids and not any(problem.structural for problem in problems):
            for invariant_id in ids:
                problems.extend(
                    Problem(pointer((*path, *relative)), f"invariant:{invariant_id}")
                    for relative in self._invariants[invariant_id](value)
                )
        return problems

    def _node(self, node: Mapping[str, Any], value: object, path: RelativePath) -> list[Problem]:
        if "$ref" in node:
            return self._def(node["$ref"].rsplit("/", 1)[1], value, path)
        if "oneOf" in node:
            return self._one_of(node, value, path)
        kind = node["type"]
        if kind == "object":
            return self._object(node, value, path)
        if kind == "array":
            return self._array(node, value, path)
        if kind == "string":
            return self._string(node, value, path)
        if kind == "integer":
            return self._integer(node, value, path)
        if kind == "number":
            return self._number(node, value, path)
        if kind == "boolean":
            return [] if isinstance(value, bool) else [Problem(pointer(path), "type")]
        raise ValueError(f"unsupported schema type {kind}")

    def _one_of(self, node: Mapping[str, Any], value: object, path: RelativePath) -> list[Problem]:
        branches = [branch["$ref"].rsplit("/", 1)[1] for branch in node["oneOf"]]
        discriminator = node.get("discriminator", {}).get("propertyName")
        if discriminator is not None:
            if not isinstance(value, Mapping):
                return [Problem(pointer(path), "type")]
            for branch in branches:
                const = self._defs[branch]["properties"][discriminator].get("const")
                if const == value.get(discriminator):
                    return self._def(branch, value, path)
            return [Problem(pointer((*path, discriminator)), "union")]
        results = [self._def(branch, value, path) for branch in branches]
        clean = [
            problems for problems in results if not any(problem.structural for problem in problems)
        ]
        if len(clean) == 1:
            return clean[0]
        return [Problem(pointer(path), "union")]

    def _object(self, node: Mapping[str, Any], value: object, path: RelativePath) -> list[Problem]:
        if not isinstance(value, Mapping):
            return [Problem(pointer(path), "type")]
        properties: Mapping[str, Any] = node["properties"]
        problems = [Problem(pointer(path), "unknown_key") for key in value if key not in properties]
        for key, child in properties.items():
            if key in value:
                problems.extend(self._node(child, value[key], (*path, key)))
            elif key in node["required"]:
                problems.append(Problem(pointer((*path, key)), "type"))
        return problems

    def _array(self, node: Mapping[str, Any], value: object, path: RelativePath) -> list[Problem]:
        if not isinstance(value, list):
            return [Problem(pointer(path), "type")]
        problems: list[Problem] = []
        low, high = node.get("minItems"), node.get("maxItems")
        if (low is not None and len(value) < low) or (high is not None and len(value) > high):
            problems.append(Problem(pointer(path), "items"))
            if _is_fixed_tuple(node):
                return problems
        for index, item in enumerate(value):
            problems.extend(self._node(node["items"], item, (*path, index)))
        if node.get("uniqueItems", False) and not problems:
            if len(set(value)) != len(value):
                problems.append(Problem(pointer(path), "unique"))
        return problems

    def _string(self, node: Mapping[str, Any], value: object, path: RelativePath) -> list[Problem]:
        if not isinstance(value, str):
            return [Problem(pointer(path), "type")]
        if "const" in node:
            return [] if value == node["const"] else [Problem(pointer(path), "value")]
        if "enum" in node:
            return [] if value in node["enum"] else [Problem(pointer(path), "value")]
        problems: list[Problem] = []
        pattern = node.get("pattern")
        if pattern is not None and _compiled(pattern).search(value) is None:
            problems.append(Problem(pointer(path), "pattern"))
        low, high = node.get("minLength"), node.get("maxLength")
        if (low is not None and len(value) < low) or (high is not None and len(value) > high):
            problems.append(Problem(pointer(path), "length"))
        return problems

    def _integer(self, node: Mapping[str, Any], value: object, path: RelativePath) -> list[Problem]:
        if not _is_integer(value):
            return [Problem(pointer(path), "type")]
        if "enum" in node:
            return [] if value in node["enum"] else [Problem(pointer(path), "value")]
        return self._range(node, value, path)

    def _number(self, node: Mapping[str, Any], value: object, path: RelativePath) -> list[Problem]:
        if not _is_number(value):
            return [Problem(pointer(path), "type")]
        return self._range(node, value, path)

    @staticmethod
    def _range(node: Mapping[str, Any], value: Any, path: RelativePath) -> list[Problem]:
        low, high = node.get("minimum"), node.get("maximum")
        if (low is not None and value < low) or (high is not None and value > high):
            return [Problem(pointer(path), "range")]
        return []
