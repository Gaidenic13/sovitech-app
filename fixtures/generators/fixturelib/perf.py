"""The `perf` profile: the test building scaled up for the performance budgets (prompt 3, 11).

One IFC4 model that combines the architectural and building-services content of the test profile
and repeats its guest-room floor: every upper floor holds ROOMS_PER_FLOOR rooms in two rows with a
corridor, and every room a fan coil, a room sensor, luminaires and sprinklers. The default floor
count gives a file of about 100 MB (the "perf IFC4 file of about 100 MB" of section 11).

The output goes to <out>/fixtures/ifc/perf/, which .gitignore keeps out of git; it is never listed
in fixtures/manifest.json and the fixture-manifest check skips it. It is TEST data like every
other fixture: a fictitious building with invented values.
"""

from __future__ import annotations

from typing import Any

from fixturelib.common import write_json, write_text
from fixturelib.ifc_model import ModelBuilder
from fixturelib.spec import Element, Spec

PERF_PATH = "fixtures/ifc/perf/demo-hotel-perf.ifc"
PERF_SUMMARY_PATH = "fixtures/ifc/perf/demo-hotel-perf.summary.json"
PERF_DEFAULT_FLOORS = 184
ROOMS_PER_FLOOR = 120
ROOM_WIDTH = 4800
ROOM_DEPTH = 5500
CORRIDOR = 3000


def _element(
    key: str,
    ifc_class: str,
    predefined: str,
    name: str,
    tag: str | None,
    container: str,
    systems: tuple[str, ...],
    object_type: str | None = None,
) -> Element:
    return Element(
        key=key,
        group=key.split("#", 1)[0],
        ifc_class=ifc_class,
        predefined_type=predefined,
        object_type=object_type,
        name=name,
        tag=tag,
        description=None,
        container=container,
        systems=systems,
        psets={},
        typed=None,
        hidden_layer=False,
        life_safety=(),
        exercises=(),
        ifc2x3={},
        controls=None,
        placement=None,
        index=0,
    )


def perf_spec(spec: Spec, floors: int) -> Spec:
    raw: dict[str, Any] = {
        "profile": "perf",
        "project": {
            "name": "Demo Hotel Bucharest (perf)",
            "description": (
                "TEST fixture, perf profile: synthetic model of a fictitious hotel. "
                "Not a real project."
            ),
        },
        "site": spec.raw["site"],
        "building": {
            "name": "Demo Hotel Bucharest (perf)",
            "footprint": [ROOMS_PER_FLOOR // 2 * ROOM_WIDTH, 2 * ROOM_DEPTH + CORRIDOR],
            "psets": {
                "Pset_BuildingCommon": {"OccupancyType": {"type": "IfcLabel", "value": "Hotel"}}
            },
        },
        "storeys": [
            {"key": "S1", "arh": "Subsol 1", "mep": "SUBSOL 01", "elevation": "-3250"},
            {"key": "P", "arh": "Parter", "mep": "PARTER", "elevation": "0"},
        ],
        "spaceHeights": {"S1": 2800, "P": 3600},
        "arhSpaces": [],
        "zones": [],
        "systems": spec.raw["systems"],
        "boxSizes": spec.raw["boxSizes"],
        "layers": spec.raw["layers"],
        "pumpType": spec.raw["pumpType"],
        "ifc2x3Types": spec.raw["ifc2x3Types"],
    }
    elements: list[Element] = []
    for floor in range(1, floors + 1):
        storey = f"E{floor:03d}"
        raw["storeys"].append(
            {
                "key": storey,
                "arh": f"Etaj {floor}",
                "mep": f"ETAJ {floor:03d}",
                "elevation": str(4500 + (floor - 1) * 3200),
            }
        )
        raw["spaceHeights"][storey] = 3000
        members = []
        for room in range(1, ROOMS_PER_FLOOR + 1):
            column = (room - 1) % (ROOMS_PER_FLOOR // 2)
            row = (room - 1) // (ROOMS_PER_FLOOR // 2)
            number = f"{floor}.{room:03d}"
            space_key = f"{storey}-{room:03d}"
            y = 0 if row == 0 else ROOM_DEPTH + CORRIDOR
            raw["arhSpaces"].append(
                {
                    "key": space_key,
                    "storey": storey,
                    "name": number,
                    "longName": f"Cameră {number}",
                    "type": "SPACE",
                    "rect": [column * ROOM_WIDTH, y, ROOM_WIDTH, ROOM_DEPTH],
                    "qto": {"net": "26.4", "gross": "27.6"},
                }
            )
            members.append(space_key)
            elements.append(
                _element(
                    f"VCV-{number}",
                    "IfcUnitaryEquipment",
                    "USERDEFINED",
                    "Ventiloconvector",
                    f"VCV-{number}",
                    storey,
                    ("apa-racita",),
                    object_type="Ventiloconvector",
                )
            )
            elements.append(
                _element(
                    f"ST-{number}",
                    "IfcSensor",
                    "TEMPERATURESENSOR",
                    "Senzor temperatură cameră",
                    f"ST-{number}",
                    f"space:{space_key}",
                    ("automatizare",),
                )
            )
            for index in range(3):
                elements.append(
                    _element(
                        f"LUM-{number}#{index}",
                        "IfcLightFixture",
                        "POINTSOURCE",
                        "Corp iluminat LED",
                        None,
                        storey,
                        ("iluminat",),
                    )
                )
            for index in range(2):
                elements.append(
                    _element(
                        f"SPK-{number}#{index}",
                        "IfcFireSuppressionTerminal",
                        "SPRINKLER",
                        "Sprinkler pendent",
                        None,
                        storey,
                        ("sprinklere",),
                    )
                )
        corridor_key = f"{storey}-H"
        raw["arhSpaces"].append(
            {
                "key": corridor_key,
                "storey": storey,
                "name": f"E{floor}-H",
                "longName": f"Hol E{floor}",
                "type": "SPACE",
                "rect": [0, ROOM_DEPTH, ROOMS_PER_FLOOR // 2 * ROOM_WIDTH, CORRIDOR],
                "qto": {"net": "288", "gross": "295.2"},
            }
        )
        members.append(corridor_key)
        raw["zones"].append(
            {
                "key": f"hvac-{storey}",
                "model": "arh",
                "name": f"Zonă HVAC Etaj {floor}",
                "members": members,
            }
        )
        for index in range(1, 11):
            elements.append(
                _element(
                    f"VAV-{floor}.{index:02d}",
                    "IfcAirTerminalBox",
                    "VARIABLEFLOWPRESSUREINDEPENDANT",
                    "Unitate VAV",
                    f"VAV-{floor}.{index:02d}",
                    storey,
                    ("ventilare-cta-01",),
                )
            )
        for index in range(1, 5):
            elements.append(
                _element(
                    f"CA-{floor}.{index:02d}",
                    "IfcDamper",
                    "FIREDAMPER",
                    "Clapetă antifoc",
                    f"CA-{floor}.{index:02d}",
                    storey,
                    ("ventilare-cta-01",),
                )
            )
    raw["mepSpaces"] = raw["arhSpaces"]
    # Plant in the basement, from the test profile.
    for element in spec.elements:
        if (
            element.container == "S1"
            and not element.hidden_layer
            and element.ifc_class != "IfcBuildingElementProxy"
        ):
            elements.append(element)
    perf = Spec(raw=raw)
    perf.elements = elements
    return perf


def write_perf(spec: Spec, out: str, floors: int) -> None:
    perf = perf_spec(spec, floors)
    builder = ModelBuilder(
        perf,
        schema="IFC4",
        discipline="combined",
        variant="perf",
        path=PERF_PATH,
        gid_prefix="perf",
    )
    builder.setup()
    builder.spatial("arh")
    builder.building_psets()
    space_refs = builder.spaces(perf.raw["arhSpaces"], arh=True)
    builder.zones("arh", space_refs)
    builder.mep_elements(perf.elements, space_refs, [])
    text = builder.w.text(builder.header("ReferenceView_V1.2"))
    write_text(out, PERF_PATH, text)
    write_json(
        out,
        PERF_SUMMARY_PATH,
        {
            "about": (
                "TEST perf profile summary "
                "(git-ignored output; never listed in fixtures/manifest.json)"
            ),
            "file": PERF_PATH,
            "floors": floors,
            "roomsPerFloor": ROOMS_PER_FLOOR,
            "storeys": len(perf.raw["storeys"]),
            "spaces": len(perf.raw["arhSpaces"]),
            "elements": len(perf.elements),
            "instances": len(builder.w._lines),
            "bytes": len(text.encode("utf-8")),
        },
    )
