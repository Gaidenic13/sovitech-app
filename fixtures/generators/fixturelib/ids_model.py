"""The draft SOVITECH IDS v0.1 (ifc-input 5.5) and the results a checker is expected to report.

The IDS is draft reference data, not a TEST fixture: the same file could later go to an owner's
designer. It stays "v0.1" and "draft" until the approver accepts it and SOVITECH engineers have
reviewed it (ifc-input 5.5, "Versioning"; prompt 3 5.3). Its text holds no reserved term of
guardrails 2.8.

The expected results are derived here from the building spec, specification by specification,
with the semantics IDS 1.0 gives each facet. They are not recorded from an IfcTester run:
IfcTester is not used (owner decision 2026-09-26, docs/adr/0018), and the IDS model check waits
(D-36). If a checker is adopted, its report on each fixture must equal these results (spec ids,
applicable, passing and failing counts, failing GlobalIds); results are stored as spec ids, counts
and GlobalIds only, never as report text (prompt 3 8). The "about" text written into each expected
file still says IfcTester is "withheld"; it is left as generated, so the files and their manifest
entries do not change.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from xml.sax.saxutils import escape, quoteattr

IDS_PATH = "fixtures/ids/sovitech-ifc-minimum-v0.1.ids"
IDS_VERSIONS_ALL = ("IFC2X3", "IFC4", "IFC4X3_ADD2")
IDS_VERSIONS_4 = ("IFC4", "IFC4X3_ADD2")

# BMS equipment classes of S05 to S07 (ifc-input 5.5; the XML there abbreviates the list).
EQUIPMENT_CLASSES = (
    "IFCUNITARYEQUIPMENT",
    "IFCCHILLER",
    "IFCBOILER",
    "IFCPUMP",
    "IFCFAN",
    "IFCAIRTERMINALBOX",
    "IFCDAMPER",
    "IFCFLOWMETER",
)
# IFC2X3 has no occurrence classes for those types: its flow and energy-conversion occurrences
# carry them through a type object (ifc-input 3.2 [S48]). S07b applies to these instead.
EQUIPMENT_CLASSES_2X3 = ("IFCENERGYCONVERSIONDEVICE", "IFCFLOWMOVINGDEVICE", "IFCFLOWCONTROLLER")
# IfcDamperTypeEnum values that identify the damper (all but USERDEFINED and NOTDEFINED).
SPECIFIC_DAMPER_TYPES = (
    "BACKDRAFTDAMPER",
    "BALANCINGDAMPER",
    "BLASTDAMPER",
    "CONTROLDAMPER",
    "FIREDAMPER",
    "FIRESMOKEDAMPER",
    "FUMEHOODEXHAUST",
    "GRAVITYDAMPER",
    "GRAVITYRELIEFDAMPER",
    "RELIEFDAMPER",
    "SMOKEDAMPER",
)
TAG_PATTERN = ".*[A-Za-z].*"


@dataclass(frozen=True)
class Specification:
    identifier: str
    name: str
    versions: tuple[str, ...]
    min_occurs: int
    description: str
    applicability: str  # XML of the applicability facets
    requirements: str  # XML of the requirement facets


def _simple(value: str) -> str:
    return f"<simpleValue>{escape(value)}</simpleValue>"


def _enumeration(values: tuple[str, ...]) -> str:
    items = "".join(f'<xs:enumeration value="{escape(value)}"/>' for value in values)
    return f'<xs:restriction base="xs:string">{items}</xs:restriction>'


def _entity(names: tuple[str, ...] | str, predefined: tuple[str, ...] | None = None) -> str:
    name = _simple(names) if isinstance(names, str) else _enumeration(names)
    predefined_xml = (
        "" if predefined is None else f"<predefinedType>{_enumeration(predefined)}</predefinedType>"
    )
    return f"<entity><name>{name}</name>{predefined_xml}</entity>"


def _part_of(relation: str, entity: str) -> str:
    return f'<partOf relation="{relation}" cardinality="required">{_entity(entity)}</partOf>'


def _attribute(name: str, value_xml: str = "") -> str:
    value = f"<value>{value_xml}</value>" if value_xml else ""
    return f'<attribute cardinality="required"><name>{_simple(name)}</name>{value}</attribute>'


def _property(pset: str, name: str, data_type: str) -> str:
    return (
        f'<property dataType="{data_type}" cardinality="required">'
        f"<propertySet>{_simple(pset)}</propertySet><baseName>{_simple(name)}</baseName></property>"
    )


SPECIFICATIONS: tuple[Specification, ...] = (
    Specification(
        "S01",
        "S01 Storeys carry a name",
        IDS_VERSIONS_ALL,
        1,
        "At least one building storey; each storey has a Name. Feeds the level register.",
        _entity("IFCBUILDINGSTOREY"),
        _attribute("Name"),
    ),
    Specification(
        "S02",
        "S02 Spaces sit on storeys and carry a name",
        IDS_VERSIONS_ALL,
        1,
        "At least one space; each space is aggregated into a building storey and has a Name.",
        _entity("IFCSPACE"),
        _part_of("IFCRELAGGREGATES", "IFCBUILDINGSTOREY") + _attribute("Name"),
    ),
    Specification(
        "S03",
        "S03 Space net floor area",
        IDS_VERSIONS_ALL,
        1,
        "Each space has Qto_SpaceBaseQuantities.NetFloorArea as an area measure.",
        _entity("IFCSPACE"),
        _property("Qto_SpaceBaseQuantities", "NetFloorArea", "IFCAREAMEASURE"),
    ),
    Specification(
        "S04",
        "S04 Space gross floor area",
        IDS_VERSIONS_ALL,
        1,
        "Each space has Qto_SpaceBaseQuantities.GrossFloorArea as an area measure.",
        _entity("IFCSPACE"),
        _property("Qto_SpaceBaseQuantities", "GrossFloorArea", "IFCAREAMEASURE"),
    ),
    Specification(
        "S05",
        "S05 Equipment carries an engineering tag",
        IDS_VERSIONS_4,
        0,
        "Building-services equipment has a Tag that contains at least one letter; "
        "an all-digit Tag is an authoring-tool id, not an engineering tag.",
        _entity(EQUIPMENT_CLASSES),
        _attribute(
            "Tag",
            '<xs:restriction base="xs:string">'
            f'<xs:pattern value="{TAG_PATTERN}"/></xs:restriction>',
        ),
    ),
    Specification(
        "S06",
        "S06 Equipment is contained in a storey",
        IDS_VERSIONS_4,
        0,
        "Building-services equipment is contained in a building storey.",
        _entity(EQUIPMENT_CLASSES),
        _part_of("IFCRELCONTAINEDINSPATIALSTRUCTURE", "IFCBUILDINGSTOREY"),
    ),
    Specification(
        "S07",
        "S07 Equipment belongs to a distribution system",
        IDS_VERSIONS_4,
        0,
        "Building-services equipment is assigned to a distribution system.",
        _entity(EQUIPMENT_CLASSES),
        _part_of("IFCRELASSIGNSTOGROUP", "IFCDISTRIBUTIONSYSTEM"),
    ),
    Specification(
        "S07b",
        "S07b Equipment belongs to a system (IFC2X3)",
        ("IFC2X3",),
        0,
        "IFC2X3: flow and energy-conversion equipment is assigned to a system.",
        _entity(EQUIPMENT_CLASSES_2X3),
        _part_of("IFCRELASSIGNSTOGROUP", "IFCSYSTEM"),
    ),
    Specification(
        "S08",
        "S08 Proxies state what they are",
        IDS_VERSIONS_ALL,
        0,
        "A building element proxy has an ObjectType.",
        _entity("IFCBUILDINGELEMENTPROXY"),
        _attribute("ObjectType"),
    ),
    Specification(
        "S09",
        "S09 Dampers state their kind",
        IDS_VERSIONS_4,
        0,
        "A damper has a specific PredefinedType, so fire and smoke dampers can be told apart.",
        _entity("IFCDAMPER"),
        _entity("IFCDAMPER", SPECIFIC_DAMPER_TYPES),
    ),
    Specification(
        "S10",
        "S10 Chiller capacity",
        ("IFC4X3_ADD2",),
        0,
        "A chiller has Pset_ChillerTypeCommon.ChillerCapacity as a power measure. "
        "IFC4X3 only until the IFC4 property name has been checked (ifc-input 5.5).",
        _entity("IFCCHILLER"),
        _property("Pset_ChillerTypeCommon", "ChillerCapacity", "IFCPOWERMEASURE"),
    ),
)

IDS_TITLE = "SOVITECH IFC minimum information for a preliminary BMS proposal (draft v0.1)"
IDS_DESCRIPTION = (
    "DRAFT REFERENCE DATA, version 0.1: not approved, awaiting the approver and SOVITECH "
    "engineering review. Results inform coverage and engineer review only: they never block "
    "the owner, never create values and never become owner questions."
)
IDS_PURPOSE = "Minimum model information for a preliminary BMS proposal"


def ids_text() -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<ids xmlns="http://standards.buildingsmart.org/IDS"'
        ' xmlns:xs="http://www.w3.org/2001/XMLSchema"'
        ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
        ' xsi:schemaLocation="http://standards.buildingsmart.org/IDS'
        ' http://standards.buildingsmart.org/IDS/1.0/ids.xsd">',
        "  <info>",
        f"    <title>{escape(IDS_TITLE)}</title>",
        "    <version>0.1</version>",
        f"    <description>{escape(IDS_DESCRIPTION)}</description>",
        f"    <purpose>{escape(IDS_PURPOSE)}</purpose>",
        "  </info>",
        "  <specifications>",
    ]
    for spec in SPECIFICATIONS:
        lines.append(
            f'    <specification name={quoteattr(spec.name)} ifcVersion="{" ".join(spec.versions)}"'
            f' identifier="{spec.identifier}" description={quoteattr(spec.description)}>'
        )
        lines.append(
            f'      <applicability minOccurs="{spec.min_occurs}" maxOccurs="unbounded">'
            f"{spec.applicability}</applicability>"
        )
        lines.append(f"      <requirements>{spec.requirements}</requirements>")
        lines.append("    </specification>")
    lines.extend(["  </specifications>", "</ids>"])
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Expected results


def _applicable_and_passed(
    spec: Specification, facts: dict[str, Any]
) -> tuple[list[str], list[str]]:
    """GlobalIds the specification applies to, and those among them that fail it."""
    elements = facts["elements"]
    if spec.identifier == "S01":
        applicable = [s["globalId"] for s in facts["storeys"]]
        failing = [s["globalId"] for s in facts["storeys"] if not s["name"]]
    elif spec.identifier == "S02":
        applicable = [s["globalId"] for s in facts["spaces"]]
        failing = [s["globalId"] for s in facts["spaces"] if not (s["inStorey"] and s["name"])]
    elif spec.identifier in ("S03", "S04"):
        quantity = "NetFloorArea" if spec.identifier == "S03" else "GrossFloorArea"
        applicable = [s["globalId"] for s in facts["spaces"]]
        failing = [s["globalId"] for s in facts["spaces"] if quantity not in s["quantities"]]
    elif spec.identifier in ("S05", "S06", "S07"):
        chosen = [e for e in elements if e["class"] in EQUIPMENT_CLASSES]
        applicable = [e["globalId"] for e in chosen]
        if spec.identifier == "S05":
            failing = [
                e["globalId"]
                for e in chosen
                if not (e["tag"] and any(ch.isalpha() for ch in e["tag"]))
            ]
        elif spec.identifier == "S06":
            failing = [e["globalId"] for e in chosen if e["containerClass"] != "IFCBUILDINGSTOREY"]
        else:
            failing = [
                e["globalId"] for e in chosen if "IFCDISTRIBUTIONSYSTEM" not in e["systemClasses"]
            ]
    elif spec.identifier == "S07b":
        chosen = [e for e in elements if e["class"] in EQUIPMENT_CLASSES_2X3]
        applicable = [e["globalId"] for e in chosen]
        failing = [e["globalId"] for e in chosen if "IFCSYSTEM" not in e["systemClasses"]]
    elif spec.identifier == "S08":
        chosen = [e for e in elements if e["class"] == "IFCBUILDINGELEMENTPROXY"]
        applicable = [e["globalId"] for e in chosen]
        failing = [e["globalId"] for e in chosen if not e["objectType"]]
    elif spec.identifier == "S09":
        chosen = [e for e in elements if e["class"] == "IFCDAMPER"]
        applicable = [e["globalId"] for e in chosen]
        failing = [
            e["globalId"] for e in chosen if e["predefinedType"] not in SPECIFIC_DAMPER_TYPES
        ]
    elif spec.identifier == "S10":
        chosen = [e for e in elements if e["class"] == "IFCCHILLER"]
        applicable = [e["globalId"] for e in chosen]
        failing = []  # never reached: no fixture is IFC4X3_ADD2
    else:
        raise KeyError(spec.identifier)
    return applicable, failing


def expected_results(model_path: str, schema: str, facts: dict[str, Any]) -> dict[str, Any]:
    results = []
    for spec in SPECIFICATIONS:
        if schema not in spec.versions:
            results.append(
                {
                    "identifier": spec.identifier,
                    "name": spec.name,
                    "ifcVersion": list(spec.versions),
                    "status": "skipped",
                    "reason": f"ifcVersion does not include {schema}",
                }
            )
            continue
        applicable, failing = _applicable_and_passed(spec, facts)
        failing_sorted = sorted(failing)
        if len(applicable) < spec.min_occurs:
            status = "fail"
        else:
            status = "fail" if failing_sorted else "pass"
        results.append(
            {
                "identifier": spec.identifier,
                "name": spec.name,
                "ifcVersion": list(spec.versions),
                "minOccurs": spec.min_occurs,
                "status": status,
                "applicableCount": len(applicable),
                "passCount": len(applicable) - len(failing_sorted),
                "failCount": len(failing_sorted),
                "failingGlobalIds": failing_sorted,
            }
        )
    checked = [r for r in results if r["status"] != "skipped"]
    return {
        "about": (
            "Expected results of checking the fixture against the draft IDS v0.1, derived by "
            "fixtures/generators/ids/sovitech_ids.py from the building spec with IDS 1.0 facet "
            "semantics. NOT recorded from an IfcTester run: IfcTester 0.8.5 is withheld "
            "(docs/adr/0018). Stored as spec ids, counts and failing GlobalIds only, never as "
            "report text (prompt 3 section 8). Results never block the owner, create values or "
            "become questions (ifc-input 5.5)."
        ),
        "ids": IDS_PATH,
        "idsVersion": "0.1",
        "model": model_path,
        "schema": schema,
        "specifications": results,
        "summary": {
            "specifications": len(results),
            "checked": len(checked),
            "passed": len([r for r in checked if r["status"] == "pass"]),
            "failed": len([r for r in checked if r["status"] == "fail"]),
            "skipped": len(results) - len(checked),
        },
    }


def expected_path(model_path: str) -> str:
    name = model_path.rsplit("/", 1)[-1].removesuffix(".ifc")
    return f"fixtures/ids/expected/{name}.json"
