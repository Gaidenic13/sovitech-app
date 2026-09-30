"""Builds the IFC fixtures of ifc-input 5.2 and 5.3 from the building spec, with their ground truth.

Four models from one spec: the architectural model (IFC4), the building-services model rev A
(IFC4), its declared revision rev B (IFC4) and an IFC2X3 copy of rev A. Each comes with a
ground-truth JSON that says what the file contains, with STEP instance ids and the verbatim STEP
line of every value (ifc-input 4.1 item 3), so an extractor can be compared with it exactly.

The ``perf`` profile scales the building up for the performance budgets (prompt 3 section 11);
its output is git-ignored (fixtures/ifc/perf/) and is never listed in fixtures/manifest.json.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from fixturelib.common import AUTHOR, GENERATOR_VERSION, ORGANISATION, TEST_MARK_EN
from fixturelib.spec import Element, Spec, rev_b_elements
from fixturelib.step import (
    DERIVED,
    Enum,
    Header,
    RawReal,
    Ref,
    StepWriter,
    Typed,
    decode_string,
    encode,
    global_id,
    real,
)

CREATION_TIMESTAMP = calendar.timegm((2026, 1, 15, 9, 0, 0))
ORIGINATING_SYSTEM = "SOVITECH TEST fixture generator " + GENERATOR_VERSION
PREPROCESSOR = "fixtures/generators STEP writer (no IfcOpenShell; docs/adr/0018)"

# Project units a measure is read in (the models' IfcUnitAssignment).
MEASURE_UNITS = {
    "IfcPowerMeasure": "W",
    "IfcVolumetricFlowRateMeasure": "m³/s",
    "IfcThermodynamicTemperatureMeasure": "°C",
    "IfcAreaMeasure": "m²",
    "IfcLengthMeasure": "mm",
}
TEXT_TYPES = {"IfcLabel", "IfcText", "IfcIdentifier"}

# IFC4 classes of building-services occurrences (distribution elements, ifc-input 3.2).
SERVICES_CLASSES = {
    "IfcUnitaryEquipment",
    "IfcChiller",
    "IfcPump",
    "IfcFan",
    "IfcAirTerminalBox",
    "IfcDamper",
    "IfcValve",
    "IfcFlowMeter",
    "IfcFireSuppressionTerminal",
    "IfcLightFixture",
    "IfcSensor",
    "IfcActuator",
    "IfcController",
    "IfcUnitaryControlElement",
    "IfcAlarm",
    "IfcElectricDistributionBoard",
}
CEILING_CLASSES = {"IfcLightFixture", "IfcFireSuppressionTerminal", "IfcSensor"}


def is_authoring_id(tag: str | None) -> bool:
    """A Tag with no letter is an authoring-tool id, never an engineering tag (ifc-input 3.3)."""
    return tag is not None and not any(ch.isalpha() for ch in tag)


@dataclass
class Built:
    """One generated model: its file text, its ground truth and the facts the IDS check reads."""

    path: str
    text: str
    ground_truth: dict[str, Any]
    facts: dict[str, Any]
    schema: str


@dataclass
class _Shared:
    oh: Ref
    ctx: Ref
    body: Ref
    origin: Ref
    identity: Ref
    dir_z: Ref
    kilowatt: Ref
    units: dict[str, Any]
    extra_units: list[dict[str, Any]]
    profiles: dict[tuple[int, int], Ref] = field(default_factory=dict)


class ModelBuilder:
    def __init__(
        self,
        spec: Spec,
        *,
        schema: str,
        discipline: str,
        variant: str,
        path: str,
        gid_prefix: str,
    ) -> None:
        self.spec = spec
        self.schema = schema
        self.discipline = discipline
        self.variant = variant
        self.path = path
        self.file_name = path.rsplit("/", 1)[-1]
        self.prefix = gid_prefix
        self.w = StepWriter(schema)
        self.ifc4 = schema == "IFC4"
        self.gt: dict[str, Any] = {}
        self.facts: dict[str, Any] = {
            "schema": schema,
            "storeys": [],
            "spaces": [],
            "elements": [],
        }
        self.visible_reps: list[tuple[Ref, str]] = []
        self.hidden_reps: list[tuple[Ref, str]] = []

    # -- basics ---------------------------------------------------------------------------

    def gid(self, key: str) -> str:
        return global_id(f"{self.prefix}:{key}")

    def excerpt(self, ref: Ref) -> str:
        return self.w.line(ref)

    def point(self, *coordinates: int) -> Ref:
        return self.w.add("IFCCARTESIANPOINT", [real(value) for value in coordinates])

    def placement(self, relative_to: Ref | None, x: int, y: int, z: int) -> Ref:
        location = self.point(x, y, z) if (x, y, z) != (0, 0, 0) else self.shared.origin
        axis = self.w.add("IFCAXIS2PLACEMENT3D", location, None, None)
        return self.w.add("IFCLOCALPLACEMENT", relative_to, axis)

    def box(self, width: int, depth: int, height: int) -> Ref:
        """A product shape: a rectangle extruded upwards, corner at the placement origin."""
        profile = self.shared.profiles.get((width, depth))
        if profile is None:
            half_width = format((Decimal(width) / 2).normalize(), "f")
            half_depth = format((Decimal(depth) / 2).normalize(), "f")
            centre = self.w.add("IFCCARTESIANPOINT", [real(half_width), real(half_depth)])
            position = self.w.add("IFCAXIS2PLACEMENT2D", centre, None)
            profile = self.w.add(
                "IFCRECTANGLEPROFILEDEF", Enum("AREA"), None, position, real(width), real(depth)
            )
            self.shared.profiles[(width, depth)] = profile
        solid = self.w.add(
            "IFCEXTRUDEDAREASOLID", profile, self.shared.identity, self.shared.dir_z, real(height)
        )
        return self.w.add("IFCSHAPEREPRESENTATION", self.shared.body, "Body", "SweptSolid", [solid])

    def shape(self, representation: Ref) -> Ref:
        return self.w.add("IFCPRODUCTDEFINITIONSHAPE", None, None, [representation])

    # -- header entities, units, contexts ----------------------------------------------------

    def setup(self) -> None:
        w = self.w
        person = w.add("IFCPERSON", None, "Fictiv", "Autor", None, None, None, None, None)
        organisation = w.add("IFCORGANIZATION", None, ORGANISATION, None, None, None)
        developer = w.add("IFCORGANIZATION", None, AUTHOR, TEST_MARK_EN, None, None)
        user = w.add("IFCPERSONANDORGANIZATION", person, organisation, None)
        application = w.add(
            "IFCAPPLICATION", developer, GENERATOR_VERSION, ORIGINATING_SYSTEM, "SOVITECH-TEST"
        )
        oh = w.add(
            "IFCOWNERHISTORY",
            user,
            application,
            None,
            Enum("NOCHANGE"),
            None,
            None,
            None,
            CREATION_TIMESTAMP,
        )

        def si(unit_type: str, prefix: str | None, name: str) -> Ref:
            return w.add(
                "IFCSIUNIT", DERIVED, Enum(unit_type), Enum(prefix) if prefix else None, Enum(name)
            )

        length = si("LENGTHUNIT", "MILLI", "METRE")
        area = si("AREAUNIT", None, "SQUARE_METRE")
        volume = si("VOLUMEUNIT", None, "CUBIC_METRE")
        angle = si("PLANEANGLEUNIT", None, "RADIAN")
        power = si("POWERUNIT", None, "WATT")
        temperature = si("THERMODYNAMICTEMPERATUREUNIT", None, "DEGREE_CELSIUS")
        second = si("TIMEUNIT", None, "SECOND")
        volume_element = w.add("IFCDERIVEDUNITELEMENT", volume, 1)
        second_element = w.add("IFCDERIVEDUNITELEMENT", second, -1)
        flow = w.add(
            "IFCDERIVEDUNIT",
            [volume_element, second_element],
            Enum("VOLUMETRICFLOWRATEUNIT"),
            None,
        )
        assignment = w.add(
            "IFCUNITASSIGNMENT", [length, area, volume, angle, power, temperature, flow]
        )
        kilowatt = si("POWERUNIT", "KILO", "WATT")

        origin = self.point(0, 0, 0)
        dir_z = w.add("IFCDIRECTION", [real(0), real(0), real(1)])
        identity = w.add("IFCAXIS2PLACEMENT3D", origin, None, None)
        ctx = w.add(
            "IFCGEOMETRICREPRESENTATIONCONTEXT", None, "Model", 3, RawReal("1.E-05"), identity, None
        )
        body = w.add(
            "IFCGEOMETRICREPRESENTATIONSUBCONTEXT",
            "Body",
            "Model",
            DERIVED,
            DERIVED,
            DERIVED,
            DERIVED,
            ctx,
            None,
            Enum("MODEL_VIEW"),
            None,
        )
        units = {
            "assignment": {"stepId": assignment.id, "excerpt": self.excerpt(assignment)},
            "LENGTHUNIT": {"stepId": length.id, "symbol": "mm", "excerpt": self.excerpt(length)},
            "AREAUNIT": {"stepId": area.id, "symbol": "m²", "excerpt": self.excerpt(area)},
            "VOLUMEUNIT": {"stepId": volume.id, "symbol": "m³", "excerpt": self.excerpt(volume)},
            "PLANEANGLEUNIT": {"stepId": angle.id, "symbol": "rad", "excerpt": self.excerpt(angle)},
            "POWERUNIT": {"stepId": power.id, "symbol": "W", "excerpt": self.excerpt(power)},
            "THERMODYNAMICTEMPERATUREUNIT": {
                "stepId": temperature.id,
                "symbol": "°C",
                "excerpt": self.excerpt(temperature),
            },
            "VOLUMETRICFLOWRATEUNIT": {
                "stepId": flow.id,
                "symbol": "m³/s",
                "excerpt": self.excerpt(flow),
                "note": "m³/s is not in the unit registry (ifc-input GAP-J, 6.2.11)",
            },
        }
        extra = [
            {
                "stepId": kilowatt.id,
                "symbol": "kW",
                "excerpt": self.excerpt(kilowatt),
                "note": "not in the unit assignment: carried by one property's own Unit",
            }
        ]
        self.shared = _Shared(
            oh=oh,
            ctx=ctx,
            body=body,
            origin=origin,
            identity=identity,
            dir_z=dir_z,
            kilowatt=kilowatt,
            units=units,
            extra_units=extra,
        )

    # -- values -----------------------------------------------------------------------------

    def typed(self, prop: dict[str, Any]) -> Typed:
        kind = prop["type"]
        value = prop["value"]
        if kind in TEXT_TYPES:
            return Typed(kind, str(value))
        if kind == "IfcInteger":
            return Typed(kind, int(value))
        if kind == "IfcBoolean":
            return Typed(kind, bool(value))
        return Typed(kind, real(str(value)))

    def property_record(self, ref: Ref, prop: dict[str, Any], typed: Typed) -> dict[str, Any]:
        kind = prop["type"]
        literal = encode(typed.value)
        if kind in TEXT_TYPES:
            decoded: Any = decode_string(literal)
        elif kind == "IfcBoolean":
            decoded = bool(prop["value"])
        else:
            decoded = str(prop["value"])
        unit: dict[str, Any] | None = None
        if prop.get("unit") == "kW":
            unit = {"source": "property Unit", "symbol": "kW", "stepId": self.shared.kilowatt.id}
        elif kind in MEASURE_UNITS:
            unit = {"source": "project units", "symbol": MEASURE_UNITS[kind]}
        record: dict[str, Any] = {
            "stepId": ref.id,
            "type": kind,
            "literal": f"{kind.upper()}({literal})",
            "value": decoded,
            "unit": unit,
            "excerpt": self.excerpt(ref),
        }
        if kind == "IfcReal":
            record["unit"] = None
            record["note"] = "IfcReal carries no dimension: never a quantity candidate (IFC-9)"
        if prop.get("exercises"):
            record["exercises"] = [str(item) for item in prop["exercises"]]
        return record

    def property_set(
        self, key: str, name: str, props: dict[str, dict[str, Any]]
    ) -> tuple[Ref, dict[str, Any]]:
        refs: list[Ref] = []
        records: dict[str, Any] = {}
        for prop_name, prop in props.items():
            typed = self.typed(prop)
            unit = self.shared.kilowatt if prop.get("unit") == "kW" else None
            ref = self.w.add("IFCPROPERTYSINGLEVALUE", prop_name, None, typed, unit)
            refs.append(ref)
            records[prop_name] = self.property_record(ref, prop, typed)
        pset = self.w.add(
            "IFCPROPERTYSET", self.gid(f"pset:{key}:{name}"), self.shared.oh, name, None, refs
        )
        return pset, {
            "globalId": self.gid(f"pset:{key}:{name}"),
            "stepId": pset.id,
            "properties": records,
        }

    def attach(self, key: str, target: Ref, psets: dict[str, dict[str, Any]]) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for name, props in psets.items():
            pset, record = self.property_set(key, name, props)
            rel = self.w.add(
                "IFCRELDEFINESBYPROPERTIES",
                self.gid(f"rel:props:{key}:{name}"),
                self.shared.oh,
                None,
                None,
                [target],
                pset,
            )
            record["relStepId"] = rel.id
            out[name] = record
        return out

    # -- spatial structure ------------------------------------------------------------------

    def spatial(self, storey_name_field: str) -> None:
        w, oh = self.w, self.shared.oh
        spec = self.spec
        site_placement = self.placement(None, 0, 0, 0)
        building_placement = self.placement(site_placement, 0, 0, 0)
        project = w.add(
            "IFCPROJECT",
            self.gid("project"),
            oh,
            spec.raw["project"]["name"],
            spec.raw["project"]["description"],
            None,
            None,
            None,
            [self.shared.ctx],
            self.units_ref(),
        )
        site = w.add(
            "IFCSITE",
            self.gid("site"),
            oh,
            spec.raw["site"]["name"],
            None,
            None,
            site_placement,
            None,
            None,
            Enum("ELEMENT"),
            None,
            None,
            None,
            None,
            None,
        )
        building = w.add(
            "IFCBUILDING",
            self.gid("building"),
            oh,
            spec.raw["building"]["name"],
            None,
            None,
            building_placement,
            None,
            None,
            Enum("ELEMENT"),
            None,
            None,
            None,
        )
        self.project, self.site, self.building = project, site, building
        self.building_placement = building_placement
        self.storey_refs: dict[str, Ref] = {}
        self.storey_placements: dict[str, Ref] = {}
        storeys_gt = []
        for storey in spec.storeys:
            elevation = int(storey["elevation"])
            placement = self.placement(building_placement, 0, 0, elevation)
            name = storey[storey_name_field]
            ref = w.add(
                "IFCBUILDINGSTOREY",
                self.gid(f"storey:{storey['key']}"),
                oh,
                name,
                None,
                None,
                placement,
                None,
                None,
                Enum("ELEMENT"),
                real(storey["elevation"]),
            )
            self.storey_refs[storey["key"]] = ref
            self.storey_placements[storey["key"]] = placement
            storeys_gt.append(
                {
                    "key": storey["key"],
                    "globalId": self.gid(f"storey:{storey['key']}"),
                    "stepId": ref.id,
                    "name": name,
                    "elevation": {"literal": real(storey["elevation"]).step(), "unit": "mm"},
                    "excerpt": self.excerpt(ref),
                    "spaces": [],
                    "containedElements": [],
                    "exercises": [str(item) for item in storey.get("exercises", [])],
                }
            )
            self.facts["storeys"].append(
                {"globalId": self.gid(f"storey:{storey['key']}"), "name": name}
            )
        w.add("IFCRELAGGREGATES", self.gid("rel:agg:project"), oh, None, None, project, [site])
        w.add("IFCRELAGGREGATES", self.gid("rel:agg:site"), oh, None, None, site, [building])
        w.add(
            "IFCRELAGGREGATES",
            self.gid("rel:agg:building"),
            oh,
            None,
            None,
            building,
            [self.storey_refs[s["key"]] for s in spec.storeys],
        )
        self.gt["project"] = {
            "globalId": self.gid("project"),
            "stepId": project.id,
            "name": spec.raw["project"]["name"],
            "phase": None,
            "excerpt": self.excerpt(project),
            "note": "Phase is empty: the stage is unknown until declared (ifc-input 6.2.2)",
        }
        self.gt["site"] = {
            "globalId": self.gid("site"),
            "stepId": site.id,
            "name": spec.raw["site"]["name"],
            "georeference": {"IfcMapConversion": False, "trueNorth": False},
        }
        self.gt["building"] = {
            "globalId": self.gid("building"),
            "stepId": building.id,
            "name": spec.raw["building"]["name"],
            "psets": {},
        }
        self.gt["storeys"] = storeys_gt

    def units_ref(self) -> Ref:
        return Ref(self.shared.units["assignment"]["stepId"])

    def building_psets(self) -> None:
        self.gt["building"]["psets"] = self.attach(
            "building", self.building, self.spec.raw["building"]["psets"]
        )

    def spaces(self, entries: list[dict[str, Any]], *, arh: bool) -> dict[str, Ref]:
        w, oh = self.w, self.shared.oh
        heights = self.spec.raw["spaceHeights"]
        refs: dict[str, Ref] = {}
        records = []
        by_storey: dict[str, list[Ref]] = {}
        for entry in entries:
            key = entry["key"]
            storey = entry["storey"]
            rect = entry.get("rect")
            gid = self.gid(f"space:{key}")
            geometry = None
            shape = None
            if rect is not None:
                x, y, width, depth = rect
                placement = self.placement(self.storey_placements[storey], x, y, 0)
                shape = self.shape(self.box(width, depth, heights[storey]))
                area = Decimal(width * depth) / Decimal(1_000_000)
                geometry = {
                    "rect": {"x": x, "y": y, "width": width, "depth": depth, "unit": "mm"},
                    "height": {"value": heights[storey], "unit": "mm"},
                    "footprintArea": {"value": format(area.normalize(), "f"), "unit": "m²"},
                }
            else:
                placement = self.placement(self.storey_placements[storey], 0, 0, 0)
            if self.ifc4:
                space_type = entry.get("type", "SPACE")
                ref = w.add(
                    "IFCSPACE",
                    gid,
                    oh,
                    entry["name"],
                    None,
                    None,
                    placement,
                    shape,
                    entry["longName"],
                    Enum("ELEMENT"),
                    Enum(space_type),
                    None,
                )
            else:
                space_type = None
                ref = w.add(
                    "IFCSPACE",
                    gid,
                    oh,
                    entry["name"],
                    None,
                    None,
                    placement,
                    shape,
                    entry["longName"],
                    Enum("ELEMENT"),
                    Enum("INTERNAL"),
                    None,
                )
            refs[key] = ref
            by_storey.setdefault(storey, []).append(ref)
            quantities = None
            if entry.get("qto") is not None:
                qto_refs = []
                quantities = {}
                for quantity_name, field_name in (
                    ("NetFloorArea", "net"),
                    ("GrossFloorArea", "gross"),
                ):
                    value = real(entry["qto"][field_name])
                    if self.ifc4:
                        q = w.add("IFCQUANTITYAREA", quantity_name, None, None, value, None)
                    else:
                        q = w.add("IFCQUANTITYAREA", quantity_name, None, None, value)
                    qto_refs.append(q)
                    quantities[quantity_name] = {
                        "stepId": q.id,
                        "literal": value.step(),
                        "value": entry["qto"][field_name],
                        "unit": "m²",
                        "excerpt": self.excerpt(q),
                    }
                eq = w.add(
                    "IFCELEMENTQUANTITY",
                    self.gid(f"qto:{key}"),
                    oh,
                    "Qto_SpaceBaseQuantities",
                    None,
                    None,
                    qto_refs,
                )
                rel = w.add(
                    "IFCRELDEFINESBYPROPERTIES",
                    self.gid(f"rel:qto:{key}"),
                    oh,
                    None,
                    None,
                    [ref],
                    eq,
                )
                quantities = {
                    "set": "Qto_SpaceBaseQuantities",
                    "stepId": eq.id,
                    "relStepId": rel.id,
                    "quantities": quantities,
                }
            psets = {}
            if arh:
                psets = self.attach(
                    f"space:{key}",
                    ref,
                    {
                        "Pset_SpaceCommon": {
                            "Reference": {"type": "IfcIdentifier", "value": entry["name"]},
                            "IsExternal": {"type": "IfcBoolean", "value": False},
                        }
                    },
                )
            record = {
                "key": key,
                "globalId": gid,
                "stepId": ref.id,
                "name": entry["name"],
                "longName": entry["longName"],
                "predefinedType": space_type,
                "storey": self.gid(f"storey:{storey}"),
                "excerpt": self.excerpt(ref),
                "geometry": geometry,
                "quantitySet": quantities,
                "psets": psets,
            }
            if entry.get("exercises"):
                record["exercises"] = [str(item) for item in entry["exercises"]]
            if entry.get("note"):
                record["note"] = entry["note"]
            records.append(record)
            self.facts["spaces"].append(
                {
                    "globalId": gid,
                    "name": entry["name"],
                    "inStorey": True,
                    "quantities": sorted(quantities["quantities"]) if quantities else [],
                }
            )
            for storey_gt in self.gt["storeys"]:
                if storey_gt["key"] == storey:
                    storey_gt["spaces"].append(gid)
        for storey in self.spec.storeys:
            members = by_storey.get(storey["key"])
            if members:
                w.add(
                    "IFCRELAGGREGATES",
                    self.gid(f"rel:agg:storey:{storey['key']}"),
                    oh,
                    None,
                    None,
                    self.storey_refs[storey["key"]],
                    members,
                )
        self.gt["spaces"] = records
        return refs

    def zones(self, model: str, space_refs: dict[str, Ref]) -> None:
        w, oh = self.w, self.shared.oh
        records = []
        for zone in self.spec.raw["zones"]:
            if zone["model"] != model:
                continue
            gid = self.gid(f"zone:{zone['key']}")
            if self.ifc4:
                ref = w.add("IFCZONE", gid, oh, zone["name"], None, None, None)
            else:
                ref = w.add("IFCZONE", gid, oh, zone["name"], None, None)
            members = [space_refs[key] for key in zone["members"]]
            rel = w.add(
                "IFCRELASSIGNSTOGROUP",
                self.gid(f"rel:group:zone:{zone['key']}"),
                oh,
                None,
                None,
                members,
                None,
                ref,
            )
            records.append(
                {
                    "globalId": gid,
                    "stepId": ref.id,
                    "name": zone["name"],
                    "relStepId": rel.id,
                    "members": [self.gid(f"space:{key}") for key in zone["members"]],
                    "excerpt": self.excerpt(ref),
                    "exercises": [str(item) for item in zone.get("exercises", [])],
                }
            )
        self.gt["zones"] = records

    # -- ARH elements -------------------------------------------------------------------------

    def arh_elements(self) -> None:
        w, oh = self.w, self.shared.oh
        spec = self.spec.raw
        width, depth = spec["building"]["footprint"]
        contained: dict[str, list[Ref]] = {}
        records = []
        for storey in spec["arhElements"]["slabs"]:
            placement = self.placement(self.storey_placements[storey], 0, 0, -250)
            ref = w.add(
                "IFCSLAB",
                self.gid(f"slab:{storey}"),
                oh,
                "Placă " + self.spec.storey(storey)["arh"],
                None,
                None,
                placement,
                self.shape(self.box(width, depth, 250)),
                None,
                Enum("FLOOR"),
            )
            contained.setdefault(storey, []).append(ref)
            records.append(
                self._arh_record(
                    f"slab:{storey}",
                    ref,
                    "IfcSlab",
                    "FLOOR",
                    None,
                    storey,
                    {},
                    [],
                    name="Placă " + self.spec.storey(storey)["arh"],
                )
            )
        for door in spec["arhElements"]["doors"]:
            x, y = door["position"]
            placement = self.placement(self.storey_placements[door["storey"]], x, y, 0)
            ref = w.add(
                "IFCDOOR",
                self.gid(f"door:{door['key']}"),
                oh,
                door["name"],
                None,
                None,
                placement,
                self.shape(self.box(1000, 200, 2100)),
                door["tag"],
                real(2100),
                real(1000),
                Enum("DOOR"),
                Enum("SINGLE_SWING_LEFT"),
                None,
            )
            psets = self.attach(
                f"door:{door['key']}",
                ref,
                {
                    "Pset_DoorCommon": {
                        "FireExit": {"type": "IfcBoolean", "value": door["fireExit"]},
                        "HasDrive": {"type": "IfcBoolean", "value": door["hasDrive"]},
                    }
                },
            )
            contained.setdefault(door["storey"], []).append(ref)
            records.append(
                self._arh_record(
                    f"door:{door['key']}",
                    ref,
                    "IfcDoor",
                    "DOOR",
                    door["tag"],
                    door["storey"],
                    psets,
                    door.get("lifeSafety", []),
                    name=door["name"],
                    note=door.get("note"),
                )
            )
        for item in spec["arhElements"]["transport"]:
            x, y = item["position"]
            placement = self.placement(self.storey_placements[item["storey"]], x, y, 0)
            ref = w.add(
                "IFCTRANSPORTELEMENT",
                self.gid(f"transport:{item['key']}"),
                oh,
                item["name"],
                None,
                None,
                placement,
                self.shape(self.box(2000, 2000, 3000)),
                item["tag"],
                Enum(item["predefinedType"]),
            )
            contained.setdefault(item["storey"], []).append(ref)
            records.append(
                self._arh_record(
                    f"transport:{item['key']}",
                    ref,
                    "IfcTransportElement",
                    item["predefinedType"],
                    item["tag"],
                    item["storey"],
                    {},
                    item.get("lifeSafety", []),
                    name=item["name"],
                )
            )
        self._containment(contained, {})
        self.gt["elements"] = records

    def _arh_record(
        self,
        key: str,
        ref: Ref,
        ifc_class: str,
        predefined: str,
        tag: str | None,
        storey: str,
        psets: dict[str, Any],
        life_safety: list[str],
        *,
        name: str,
        note: str | None = None,
    ) -> dict[str, Any]:
        gid = self.gid(key)
        for storey_gt in self.gt["storeys"]:
            if storey_gt["key"] == storey:
                storey_gt["containedElements"].append(gid)
        record: dict[str, Any] = {
            "key": key,
            "globalId": gid,
            "stepId": ref.id,
            "class": ifc_class,
            "predefinedType": predefined,
            "name": name,
            "tag": tag,
            "container": {"globalId": self.gid(f"storey:{storey}"), "class": "IfcBuildingStorey"},
            "systems": [],
            "psets": psets,
            "lifeSafetySignals": list(life_safety),
            "excerpt": self.excerpt(ref),
        }
        if note:
            record["note"] = note
        return record

    # -- MEP elements -------------------------------------------------------------------------

    def _position(
        self, element: Element, counters: dict[str, int], mep_spaces: dict[str, Any]
    ) -> tuple[str | None, int, int, int]:
        """The storey the element is placed on and its position relative to that storey."""
        if element.placement is not None:
            x, y, z = element.placement
            return None, x, y, z
        container = element.container
        if container is None:
            raise ValueError(f"{element.key} has neither a container nor a placement")
        z = 2700 if element.ifc_class in CEILING_CLASSES else 0
        if container.startswith("space:"):
            space = mep_spaces[container.split(":", 1)[1]]
            x, y, width, depth = space["rect"]
            return space["storey"], x + width // 2, y + depth // 2, z
        n = counters.get(container, 0)
        counters[container] = n + 1
        return container, 1150 + (n % 30) * 1900, 1150 + (n // 30) * 1900, z

    def mep_elements(
        self, elements: list[Element], space_refs: dict[str, Ref], changes: list[dict[str, Any]]
    ) -> None:
        w, oh = self.w, self.shared.oh
        spec = self.spec
        mep_spaces = {entry["key"]: entry for entry in spec.raw["mepSpaces"]}
        sizes = spec.raw["boxSizes"]
        counters: dict[str, int] = {}
        refs: dict[str, Ref] = {}
        records: list[dict[str, Any]] = []
        contained: dict[str, list[Ref]] = {}
        contained_in_space: dict[str, list[Ref]] = {}
        system_members: dict[str, list[tuple[str, Ref]]] = {
            s["key"]: [] for s in spec.raw["systems"]
        }
        change_map = {(c["element"], c["pset"], c["property"]): c["value"] for c in changes}

        # System entities first, so members can be listed in one pass.
        systems_gt = []
        system_refs: dict[str, Ref] = {}
        for system in spec.raw["systems"]:
            gid = self.gid(f"system:{system['key']}")
            if self.ifc4:
                ref = w.add(
                    "IFCDISTRIBUTIONSYSTEM",
                    gid,
                    oh,
                    system["name"],
                    None,
                    system.get("objectType"),
                    None,
                    Enum(system["type"]),
                )
            else:
                ref = w.add("IFCSYSTEM", gid, oh, system["name"], None, system.get("objectType"))
            system_refs[system["key"]] = ref
            systems_gt.append(
                {
                    "key": system["key"],
                    "globalId": gid,
                    "stepId": ref.id,
                    "class": "IfcDistributionSystem" if self.ifc4 else "IfcSystem",
                    "name": system["name"],
                    "predefinedType": system["type"] if self.ifc4 else None,
                    "objectType": system.get("objectType"),
                    "excerpt": self.excerpt(ref),
                    "members": [],
                    "exercises": [str(item) for item in system.get("exercises", [])],
                }
            )

        # IFC4: the pump type object. IFC2X3: one type object per type key in use.
        type_refs: dict[str, Ref] = {}
        types_gt: list[dict[str, Any]] = []
        typed_members: dict[str, list[Ref]] = {}
        if self.ifc4:
            pump = spec.raw["pumpType"]
            if any(element.typed == pump["key"] for element in elements):
                psets = []
                pset_records = {}
                for name, props in pump["psets"].items():
                    pset, record = self.property_set(pump["key"], name, props)
                    psets.append(pset)
                    pset_records[name] = record
                ref = w.add(
                    "IFCPUMPTYPE",
                    self.gid(f"type:{pump['key']}"),
                    oh,
                    pump["name"],
                    None,
                    None,
                    psets,
                    None,
                    None,
                    None,
                    Enum(pump["predefinedType"]),
                )
                type_refs[pump["key"]] = ref
                types_gt.append(
                    {
                        "key": pump["key"],
                        "globalId": self.gid(f"type:{pump['key']}"),
                        "stepId": ref.id,
                        "class": "IfcPumpType",
                        "name": pump["name"],
                        "predefinedType": pump["predefinedType"],
                        "elementType": None,
                        "psets": pset_records,
                        "excerpt": self.excerpt(ref),
                        "typedElements": [],
                    }
                )
        else:
            used = [element.ifc2x3.get("typeKey") for element in elements]
            for type_key, definition in spec.raw["ifc2x3Types"].items():
                if type_key not in used:
                    continue
                psets = []
                pset_records = {}
                source = definition.get("psetsFrom")
                if source:
                    for name, props in spec.raw[source]["psets"].items():
                        pset, record = self.property_set(f"type2x3:{type_key}", name, props)
                        psets.append(pset)
                        pset_records[name] = record
                ref = w.add(
                    definition["class"].upper(),
                    self.gid(f"type2x3:{type_key}"),
                    oh,
                    definition["name"],
                    None,
                    None,
                    psets or None,
                    None,
                    None,
                    definition.get("elementType"),
                    Enum(definition["predefinedType"]),
                )
                type_refs[type_key] = ref
                types_gt.append(
                    {
                        "key": type_key,
                        "globalId": self.gid(f"type2x3:{type_key}"),
                        "stepId": ref.id,
                        "class": definition["class"],
                        "name": definition["name"],
                        "predefinedType": definition["predefinedType"],
                        "elementType": definition.get("elementType"),
                        "psets": pset_records,
                        "excerpt": self.excerpt(ref),
                        "typedElements": [],
                    }
                )

        for element in elements:
            storey_key, x, y, z = self._position(element, counters, mep_spaces)
            relative = self.storey_placements[storey_key] if storey_key else None
            placement = self.placement(relative, x, y, z)
            size_class = (
                "IfcBuildingElementProxy"
                if element.ifc_class == "IfcBuildingElementProxy"
                else element.ifc_class
            )
            width, depth, height = sizes[size_class]
            representation = self.box(width, depth, height)
            (self.hidden_reps if element.hidden_layer else self.visible_reps).append(
                (representation, element.key)
            )
            shape = self.shape(representation)
            gid = self.gid(f"element:{element.key}")
            common = [
                gid,
                oh,
                element.name,
                element.description,
                element.object_type,
                placement,
                shape,
                element.tag,
            ]
            type_key = None
            if self.ifc4:
                cls = element.ifc_class
                predefined = Enum(element.predefined_type) if element.predefined_type else None
                ref = w.add(cls.upper(), *common, predefined)
                if element.typed:
                    type_key = element.typed
            else:
                cls = element.ifc2x3["class"]
                if cls == "IfcElectricDistributionPoint":
                    ref = w.add(cls.upper(), *common, Enum(element.ifc2x3["function"]), None)
                elif cls == "IfcDistributionControlElement":
                    ref = w.add(cls.upper(), *common, None)
                elif cls == "IfcBuildingElementProxy":
                    ref = w.add(cls.upper(), *common, None)
                else:
                    ref = w.add(cls.upper(), *common)
                type_key = element.ifc2x3.get("typeKey")
            refs[element.key] = ref
            if type_key:
                typed_members.setdefault(type_key, []).append(ref)
            # Property sets, with rev B's changes applied.
            psets_spec: dict[str, dict[str, Any]] = {}
            for pset_name, props in element.psets.items():
                psets_spec[pset_name] = {}
                for prop_name, prop in props.items():
                    changed = change_map.get((element.key, pset_name, prop_name))
                    psets_spec[pset_name][prop_name] = (
                        {**prop, "value": changed} if changed is not None else prop
                    )
            psets = self.attach(f"element:{element.key}", ref, psets_spec)
            # Containment.
            container_gt = None
            container = element.container
            if container is not None and container.startswith("space:"):
                space_key = container.split(":", 1)[1]
                contained_in_space.setdefault(space_key, []).append(ref)
                container_gt = {
                    "globalId": self.gid(f"space:{space_key}"),
                    "class": "IfcSpace",
                    "storey": self.gid(f"storey:{storey_key}"),
                }
            elif container is not None:
                contained.setdefault(container, []).append(ref)
                container_gt = {
                    "globalId": self.gid(f"storey:{container}"),
                    "class": "IfcBuildingStorey",
                }
                for storey_gt in self.gt["storeys"]:
                    if storey_gt["key"] == container:
                        storey_gt["containedElements"].append(gid)
            for system_key in element.systems:
                system_members[system_key].append((element.key, ref))
            resolved, user_defined = self._resolved_type(element)
            record: dict[str, Any] = {
                "key": element.key,
                "group": element.group,
                "globalId": gid,
                "stepId": ref.id,
                "class": cls,
                "ifc4Class": element.ifc_class,
                "predefinedType": element.predefined_type if self.ifc4 else None,
                "resolvedPredefinedType": resolved,
                "userDefinedType": user_defined,
                "objectType": element.object_type,
                "name": element.name,
                "tag": element.tag,
                "tagIsAuthoringId": is_authoring_id(element.tag),
                "description": element.description,
                "container": container_gt,
                "systems": [spec.system(key)["name"] for key in element.systems],
                "type": None,
                "psets": psets,
                "hiddenLayer": element.hidden_layer,
                "lifeSafetySignals": list(element.life_safety),
                "exercises": list(element.exercises),
                "excerpt": self.excerpt(ref),
            }
            if type_key:
                record["type"] = {
                    "globalId": self.gid(f"type:{type_key}")
                    if self.ifc4
                    else self.gid(f"type2x3:{type_key}")
                }
            if not self.ifc4 and element.ifc2x3.get("limitation"):
                record["ifc2x3Limitation"] = element.ifc2x3["limitation"]
            records.append(record)
            self.facts["elements"].append(
                {
                    "globalId": gid,
                    "class": cls.upper(),
                    "tag": element.tag,
                    "objectType": element.object_type,
                    "predefinedType": element.predefined_type if self.ifc4 else None,
                    "containerClass": None
                    if container is None
                    else ("IFCSPACE" if container.startswith("space:") else "IFCBUILDINGSTOREY"),
                    "systemClasses": ["IFCDISTRIBUTIONSYSTEM" if self.ifc4 else "IFCSYSTEM"]
                    if element.systems
                    else [],
                }
            )

        # Containment relations: storeys, then spaces, in spec order.
        self._containment(
            contained, {key: (space_refs[key], items) for key, items in contained_in_space.items()}
        )
        # System membership and service.
        for system_gt in systems_gt:
            members = system_members[system_gt["key"]]
            if members:
                rel = w.add(
                    "IFCRELASSIGNSTOGROUP",
                    self.gid(f"rel:group:system:{system_gt['key']}"),
                    oh,
                    None,
                    None,
                    [ref for _, ref in members],
                    None,
                    system_refs[system_gt["key"]],
                )
                system_gt["relStepId"] = rel.id
                system_gt["members"] = [self.gid(f"element:{key}") for key, _ in members]
            rel = w.add(
                "IFCRELSERVICESBUILDINGS",
                self.gid(f"rel:serves:{system_gt['key']}"),
                oh,
                None,
                None,
                system_refs[system_gt["key"]],
                [self.building],
            )
            system_gt["servicesBuildings"] = [self.gid("building")]
            system_gt["servicesRelStepId"] = rel.id
        # Types.
        for type_gt in types_gt:
            members = typed_members.get(type_gt["key"], [])
            rel = w.add(
                "IFCRELDEFINESBYTYPE",
                self.gid(f"rel:type:{type_gt['key']}"),
                oh,
                None,
                None,
                members,
                type_refs[type_gt["key"]],
            )
            type_gt["relStepId"] = rel.id
            type_gt["typedElements"] = [
                record["globalId"]
                for record in records
                if record["type"] and record["type"]["globalId"] == type_gt["globalId"]
            ]
        # Control relations.
        flow_control = []
        for element in elements:
            if element.controls and element.controls in refs:
                rel = w.add(
                    "IFCRELFLOWCONTROLELEMENTS",
                    self.gid(f"rel:control:{element.key}"),
                    oh,
                    None,
                    None,
                    [refs[element.key]],
                    refs[element.controls],
                )
                flow_control.append(
                    {
                        "stepId": rel.id,
                        "controlElements": [self.gid(f"element:{element.key}")],
                        "flowElement": self.gid(f"element:{element.controls}"),
                        "excerpt": self.excerpt(rel),
                    }
                )
        # Layers.
        layers = []
        if self.visible_reps:
            layer = w.add(
                "IFCPRESENTATIONLAYERASSIGNMENT",
                self.spec.raw["layers"]["visible"],
                None,
                [ref for ref, _ in self.visible_reps],
                None,
            )
            layers.append(
                {
                    "stepId": layer.id,
                    "class": "IfcPresentationLayerAssignment",
                    "name": self.spec.raw["layers"]["visible"],
                    "layerOn": True,
                    "assignedElements": [
                        self.gid(f"element:{key}") for _, key in self.visible_reps
                    ],
                }
            )
        if self.hidden_reps:
            layer = w.add(
                "IFCPRESENTATIONLAYERWITHSTYLE",
                self.spec.raw["layers"]["hidden"],
                None,
                [ref for ref, _ in self.hidden_reps],
                None,
                False,
                False,
                False,
                [],
            )
            layers.append(
                {
                    "stepId": layer.id,
                    "class": "IfcPresentationLayerWithStyle",
                    "name": self.spec.raw["layers"]["hidden"],
                    "layerOn": False,
                    "assignedElements": [self.gid(f"element:{key}") for _, key in self.hidden_reps],
                    "excerpt": self.excerpt(layer),
                }
            )
        self.gt["systems"] = systems_gt
        self.gt["types"] = types_gt
        self.gt["elements"] = records
        self.gt["relations"] = {"flowControl": flow_control}
        self.gt["layers"] = layers

    def _resolved_type(self, element: Element) -> tuple[str | None, str | None]:
        """The PredefinedType a reader resolves (occurrence, else type), and user-defined text."""
        if self.ifc4:
            if element.typed:
                predefined = self.spec.raw["pumpType"]["predefinedType"]
            else:
                predefined = element.predefined_type
            user = element.object_type if predefined == "USERDEFINED" else None
            return predefined, user
        cls = element.ifc2x3["class"]
        if cls == "IfcElectricDistributionPoint":
            return element.ifc2x3["function"], None
        if cls == "IfcBuildingElementProxy":
            return None, None
        definition = self.spec.raw["ifc2x3Types"][element.ifc2x3["typeKey"]]
        predefined = definition["predefinedType"]
        user = definition.get("elementType") if predefined == "USERDEFINED" else None
        if predefined == "USERDEFINED" and user is None:
            user = element.object_type
        return predefined, user

    def _containment(
        self, by_storey: dict[str, list[Ref]], by_space: dict[str, tuple[Ref, list[Ref]]]
    ) -> None:
        w, oh = self.w, self.shared.oh
        for storey in self.spec.storeys:
            items = by_storey.get(storey["key"])
            if items:
                w.add(
                    "IFCRELCONTAINEDINSPATIALSTRUCTURE",
                    self.gid(f"rel:contains:storey:{storey['key']}"),
                    oh,
                    None,
                    None,
                    items,
                    self.storey_refs[storey["key"]],
                )
        for entry in self.spec.raw["mepSpaces"]:
            pair = by_space.get(entry["key"])
            if pair:
                space_ref, items = pair
                w.add(
                    "IFCRELCONTAINEDINSPATIALSTRUCTURE",
                    self.gid(f"rel:contains:space:{entry['key']}"),
                    oh,
                    None,
                    None,
                    items,
                    space_ref,
                )

    # -- output -------------------------------------------------------------------------------

    def header(self, view: str) -> Header:
        return Header(
            file_name=self.file_name,
            view_definition=f"ViewDefinition [{view}]",
            description=TEST_MARK_EN,
            author=AUTHOR,
            organization=ORGANISATION,
            preprocessor=PREPROCESSOR,
            originating_system=ORIGINATING_SYSTEM,
        )


def _coverage(builder: ModelBuilder) -> dict[str, Any]:
    storeys = builder.gt["storeys"]
    with_spaces = [s["name"] for s in storeys if s["spaces"]]
    classes = sorted({line.split("=", 1)[1].split("(", 1)[0] for line in builder.w._lines.values()})
    element_classes = [
        record.get("ifc4Class", record["class"]) for record in builder.gt["elements"]
    ]
    services = any(cls in SERVICES_CLASSES for cls in element_classes)
    lighting = sorted(
        {
            s["name"]
            for s in storeys
            for gid in s["containedElements"]
            for record in builder.gt["elements"]
            if record["globalId"] == gid and record.get("ifc4Class") == "IfcLightFixture"
        }
    )
    return {
        "storeyCount": len(storeys),
        "storeysWithSpaces": with_spaces,
        "storeysWithSpacesCount": len(with_spaces),
        "storeysWithoutSpaces": [s["name"] for s in storeys if not s["spaces"]],
        "buildingServicesElements": services,
        "lightingOnStoreys": lighting,
        "entityClassesPresent": classes,
    }


def _register(builder: ModelBuilder) -> list[dict[str, Any]]:
    """The asset appearances as a register compares them (IFC-11: rev A and IFC2X3 agree)."""
    rows = []
    storeys = {s["globalId"]: s["key"] for s in builder.gt["storeys"]}
    for record in builder.gt["elements"]:
        container = record["container"]
        storey = None
        if container is not None:
            storey = storeys.get(container.get("storey", container["globalId"]))
        rows.append(
            {
                "globalId": record["globalId"],
                "engineeringTag": None
                if record["tag"] is None or record["tagIsAuthoringId"]
                else record["tag"],
                "ifc4Class": record["ifc4Class"],
                "resolvedPredefinedType": record["resolvedPredefinedType"],
                "userDefinedType": record["userDefinedType"],
                "storey": storey,
                "systems": record["systems"],
            }
        )
    return rows


def _findings(builder: ModelBuilder) -> list[dict[str, Any]]:
    findings = []
    for record in builder.gt["elements"]:
        if record.get("description"):
            findings.append(
                {
                    "kind": "embedded_instruction",
                    "globalId": record["globalId"],
                    "stepId": record["stepId"],
                    "path": "attr:Description",
                    "text": record["description"],
                    "expected": "one embedded_instruction finding, no state change (G14-1, G14-3)",
                }
            )
        if record.get("hiddenLayer"):
            findings.append(
                {
                    "kind": "hidden_content",
                    "globalId": record["globalId"],
                    "stepId": record["stepId"],
                    "layer": builder.spec.raw["layers"]["hidden"],
                    "expected": (
                        "a hidden-content finding and no candidate "
                        "(gate ifc-hidden-content; ifc-input 6.2.13)"
                    ),
                }
            )
    return findings


GROUND_TRUTH_ABOUT = (
    "TEST ground truth of a synthetic IFC fixture (fictitious building, not a real project). "
    "Written by fixtures/generators/ifc/demo_hotel.py from fixtures/generators/ifc/spec/test.yaml "
    "together with the model, so it states what the file contains: every GlobalId, STEP instance "
    "id and verbatim STEP line (the excerpt) that an extractor must find. It is not an expected "
    "app output: which values may be stored is decided by the guardrails and the closed gates."
)


def _finish(builder: ModelBuilder, view: str, extra: dict[str, Any]) -> Built:
    text = builder.w.text(builder.header(view))
    ground_truth: dict[str, Any] = {
        "about": GROUND_TRUTH_ABOUT,
        "file": builder.path,
        "profile": "test",
        "schema": builder.schema,
        "discipline": builder.discipline,
        "variant": builder.variant,
        "header": {
            "fileName": builder.file_name,
            "viewDefinition": f"ViewDefinition [{view}]",
            "description": TEST_MARK_EN,
            "author": AUTHOR,
            "organization": ORGANISATION,
            "preprocessor": PREPROCESSOR,
            "originatingSystem": ORIGINATING_SYSTEM,
            "timeStamp": "2026-01-15T09:00:00",
        },
        "instanceCount": len(builder.w._lines),
        "units": builder.shared.units,
        "extraUnits": builder.shared.extra_units,
        **{key: builder.gt[key] for key in ("project", "site", "building", "storeys", "spaces")},
        "zones": builder.gt.get("zones", []),
        "systems": builder.gt.get("systems", []),
        "types": builder.gt.get("types", []),
        "elements": builder.gt["elements"],
        "relations": builder.gt.get("relations", {"flowControl": []}),
        "layers": builder.gt.get("layers", []),
        "coverage": _coverage(builder),
        "findings": _findings(builder),
        **extra,
    }
    if builder.discipline == "mep":
        ground_truth["register"] = _register(builder)
    return Built(builder.path, text, ground_truth, builder.facts, builder.schema)


# ---------------------------------------------------------------------------
# The four models


ARH_PATH = "fixtures/ifc/demo-hotel-arh.ifc"
MEP_A_PATH = "fixtures/ifc/demo-hotel-mep-rev-a.ifc"
MEP_B_PATH = "fixtures/ifc/demo-hotel-mep-rev-b.ifc"
MEP_2X3_PATH = "fixtures/ifc/demo-hotel-mep-ifc2x3.ifc"


def build_arh(spec: Spec) -> Built:
    b = ModelBuilder(
        spec,
        schema="IFC4",
        discipline="architectural",
        variant="arh",
        path=ARH_PATH,
        gid_prefix="arh",
    )
    b.setup()
    b.spatial("arh")
    b.building_psets()
    space_refs = b.spaces(spec.raw["arhSpaces"], arh=True)
    b.zones("arh", space_refs)
    b.arh_elements()
    return _finish(b, "ReferenceView_V1.2", {})


def _build_mep(
    spec: Spec,
    *,
    schema: str,
    variant: str,
    path: str,
    elements: list[Element],
    changes: list[dict[str, Any]],
) -> Built:
    b = ModelBuilder(
        spec, schema=schema, discipline="mep", variant=variant, path=path, gid_prefix="mep"
    )
    b.setup()
    b.spatial("mep")
    space_refs = b.spaces(spec.raw["mepSpaces"], arh=False)
    b.zones("mep", space_refs)
    b.mep_elements(elements, space_refs, changes)
    view = "ReferenceView_V1.2" if schema == "IFC4" else "CoordinationView_V2.0"
    extra: dict[str, Any] = {}
    if variant == "rev-b":
        extra["revision"] = {
            "declaredRevisionOf": MEP_A_PATH,
            "note": (
                "The revision is declared by the owner or an engineer (guardrails 2.3); "
                "nothing in the file says so."
            ),
            "changedValues": [
                {
                    "element": b.gid(f"element:{c['element']}"),
                    "tag": spec.element(c["element"]).tag,
                    "path": f"{c['pset']}.{c['property']}",
                    "revA": next(
                        str(prop["value"])
                        for name, props in spec.element(c["element"]).psets.items()
                        for prop_name, prop in props.items()
                        if name == c["pset"] and prop_name == c["property"]
                    ),
                    "revB": c["value"],
                }
                for c in changes
            ],
            "removedElements": [b.gid(f"element:{key}") for key in spec.raw["revB"]["removed"]],
            "addedElements": [
                b.gid(f"element:{entry['key']}") for entry in spec.raw["revB"]["added"]
            ],
            "unchangedGlobalIds": "every other GlobalId is the same as in rev A",
            "exercises": ["G4-13", "G4-14", "IFC-13"],
        }
    if schema == "IFC2X3":
        limitations = [
            {
                "globalId": record["globalId"],
                "tag": record["tag"],
                "what": record["ifc2x3Limitation"],
            }
            for record in b.gt["elements"]
            if record.get("ifc2x3Limitation")
        ]
        limitations.append(
            {
                "globalId": None,
                "tag": None,
                "what": (
                    "IFC2X3 has no IfcDistributionSystem: systems are IfcSystem with no "
                    "PredefinedType; only the systems whose spec gives an ObjectType carry one"
                ),
            }
        )
        extra["sameRegisterAs"] = MEP_A_PATH
        extra["ifc2x3Limitations"] = limitations
        extra["exercises"] = ["IFC-11"]
    return _finish(b, view, extra)


def build_all(spec: Spec) -> list[Built]:
    rev_a = list(spec.elements)
    return [
        build_arh(spec),
        _build_mep(
            spec, schema="IFC4", variant="rev-a", path=MEP_A_PATH, elements=rev_a, changes=[]
        ),
        _build_mep(
            spec,
            schema="IFC4",
            variant="rev-b",
            path=MEP_B_PATH,
            elements=rev_b_elements(spec),
            changes=spec.raw["revB"]["changes"],
        ),
        _build_mep(
            spec, schema="IFC2X3", variant="ifc2x3", path=MEP_2X3_PATH, elements=rev_a, changes=[]
        ),
    ]


def ground_truth_path(model_path: str) -> str:
    name = model_path.rsplit("/", 1)[-1].removesuffix(".ifc")
    return f"fixtures/ifc/ground-truth/{name}.json"
