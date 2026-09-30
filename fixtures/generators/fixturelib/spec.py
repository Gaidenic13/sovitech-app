"""Loads the building spec (fixtures/generators/ifc/spec/test.yaml) and expands its repeats.

Every generator reads the same spec, so the IFC models, their ground truth, the expected
model-check results and the PDF and XLSX companions describe one fictitious building.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from fixturelib.common import GENERATORS_DIR

SPEC_PATH = GENERATORS_DIR / "ifc" / "spec" / "test.yaml"


@dataclass(frozen=True)
class Element:
    """One MEP element occurrence, after expanding `tags`, `names` and `count`."""

    key: str  # stable key for its GlobalId
    group: str  # the spec entry it came from
    ifc_class: str
    predefined_type: str | None
    object_type: str | None
    name: str
    tag: str | None
    description: str | None
    container: str | None  # storey key, 'space:<key>' or None
    systems: tuple[str, ...]
    psets: dict[str, dict[str, dict[str, Any]]]
    typed: str | None
    hidden_layer: bool
    life_safety: tuple[str, ...]
    exercises: tuple[str, ...]
    ifc2x3: dict[str, Any]
    controls: str | None
    placement: tuple[int, int, int] | None
    index: int  # position within its group (0 for single entries)


@dataclass
class Spec:
    raw: dict[str, Any]
    elements: list[Element] = field(default_factory=list)

    @property
    def storeys(self) -> list[dict[str, Any]]:
        return self.raw["storeys"]

    def storey(self, key: str) -> dict[str, Any]:
        for storey in self.storeys:
            if storey["key"] == key:
                return storey
        raise KeyError(key)

    def system(self, key: str) -> dict[str, Any]:
        for system in self.raw["systems"]:
            if system["key"] == key:
                return system
        raise KeyError(key)

    def element(self, key: str) -> Element:
        for element in self.elements:
            if element.key == key:
                return element
        raise KeyError(key)


def _expand(entry: dict[str, Any]) -> list[Element]:
    def build(key: str, tag: str | None, name: str, container: Any, index: int) -> Element:
        return Element(
            key=key,
            group=entry["key"],
            ifc_class=entry["class"],
            predefined_type=entry.get("predefinedType"),
            object_type=entry.get("objectType"),
            name=name,
            tag=tag,
            description=entry.get("description"),
            container=container,
            systems=tuple(entry.get("systems", [])),
            psets=copy.deepcopy(entry.get("psets", {})),
            typed=entry.get("typed"),
            hidden_layer=bool(entry.get("hiddenLayer", False)),
            life_safety=tuple(entry.get("lifeSafety", [])),
            exercises=tuple(str(item) for item in entry.get("exercises", [])),
            ifc2x3=dict(entry.get("ifc2x3", {})),
            controls=entry.get("controls"),
            placement=tuple(entry["placement"]) if "placement" in entry else None,
            index=index,
        )

    if "tags" in entry:
        containers = entry.get("containers") or [entry.get("container")] * len(entry["tags"])
        return [
            build(tag, tag, entry["name"], containers[i], i) for i, tag in enumerate(entry["tags"])
        ]
    if "names" in entry:
        tags = entry["numericTags"]
        return [
            build(f"{entry['key']}#{i + 1}", tags[i], name, entry.get("container"), i)
            for i, name in enumerate(entry["names"])
        ]
    if "count" in entry:
        return [
            build(f"{entry['key']}#{i + 1:02d}", None, entry["name"], entry.get("container"), i)
            for i in range(entry["count"])
        ]
    return [build(entry["key"], entry.get("tag"), entry["name"], entry.get("container"), 0)]


def load_spec(path: Path = SPEC_PATH) -> Spec:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    spec = Spec(raw=raw)
    for entry in raw["elements"]:
        spec.elements.extend(_expand(entry))
    keys = [element.key for element in spec.elements]
    if len(keys) != len(set(keys)):
        raise ValueError("element keys repeat in the spec")
    return spec


def rev_b_elements(spec: Spec) -> list[Element]:
    """Rev A's elements with rev B's removals and additions applied (changes are applied later)."""
    removed = set(spec.raw["revB"]["removed"])
    kept = [element for element in spec.elements if element.key not in removed]
    for entry in spec.raw["revB"]["added"]:
        kept.extend(_expand(entry))
    return kept
