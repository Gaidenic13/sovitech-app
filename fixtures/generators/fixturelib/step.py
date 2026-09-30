"""A small, deterministic ISO 10303-21 (STEP physical file) writer for the IFC fixtures.

Why not IfcOpenShell: ifc-input 5.2 names ``ifcopenshell.api`` for authoring, but IfcOpenShell
0.8.5 is not used (docs/adr/0018-extractor-dependencies-and-sandbox-image.md: its PyPI wheel
bundles CGAL packages that CGAL publishes under the GPL; the owner chose web-ifc on 2026-09-26).
A STEP file is plain text, so the fixtures are written directly: every entity goes through
``StepWriter.add``, which checks the attribute count against the schema tables below and fails
on anything it does not know. The tables list only the entities the fixtures use, with their
attributes in schema order, for IFC4 (ADD2 TC1) and IFC2X3 (TC1).

Determinism: instance ids are allocated in creation order from ``FIRST_INSTANCE_ID``; strings
are encoded with the \\X2\\ escape for every non-ASCII character; reals are written from the
decimal text the spec gives, never through a float; the header is fixed.

Instance ids start at 100001, not 1: the repository's figure checks
(tools/checks/mockup-figures, tools/checks/company-figures) read text fixtures line by line and
would take a short reference such as ``#<three digits>`` for a listed figure. Ids are not
figures and carry no meaning; only their uniqueness within a file matters.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from decimal import Decimal

FIRST_INSTANCE_ID = 100001

# ---------------------------------------------------------------------------
# Values


@dataclass(frozen=True)
class Ref:
    """A reference to an instance (#id)."""

    id: int

    def step(self) -> str:
        return f"#{self.id}"


@dataclass(frozen=True)
class Enum:
    """An enumeration value, written .VALUE."""

    value: str

    def __post_init__(self) -> None:
        if not re.fullmatch(r"[A-Z0-9_]+", self.value):
            raise ValueError(f"not an enumeration value: {self.value!r}")

    def step(self) -> str:
        return f".{self.value}."


@dataclass(frozen=True)
class Real:
    """A REAL written from its decimal text ('26.4', '-6500', '0.5'), never from a float."""

    text: str

    def __post_init__(self) -> None:
        if not re.fullmatch(r"-?\d+(\.\d+)?", self.text):
            raise ValueError(f"not a decimal literal: {self.text!r}")

    def step(self) -> str:
        whole, _, fraction = self.text.partition(".")
        fraction = fraction.rstrip("0")
        if whole in ("-0",) and fraction == "":
            whole = "0"
        return f"{whole}.{fraction}"

    @property
    def decimal(self) -> Decimal:
        return Decimal(self.text)


@dataclass(frozen=True)
class RawReal:
    """A REAL given as an exact STEP token, for the few constants that need an exponent."""

    token: str

    def __post_init__(self) -> None:
        if not re.fullmatch(r"-?\d+\.(\d+)?(E[+-]?\d+)?", self.token):
            raise ValueError(f"not a STEP real: {self.token!r}")

    def step(self) -> str:
        return self.token


@dataclass(frozen=True)
class Typed:
    """A typed value inside a SELECT: IFCLABEL('Hotel'), IFCPOWERMEASURE(430000.)."""

    type_name: str
    value: object

    def step(self) -> str:
        return f"{self.type_name.upper()}({encode(self.value)})"


class _Derived:
    def step(self) -> str:
        return "*"


DERIVED = _Derived()


def real(value: int | str) -> Real:
    """A REAL from an int (millimetres, counts) or a decimal string."""
    if isinstance(value, bool):
        raise TypeError("a boolean is not a real")
    return Real(str(value))


def encode_string(text: str) -> str:
    """ISO 10303-21 string: quotes and backslashes doubled, non-ASCII as \\X2\\HHHH\\X0\\."""
    out: list[str] = []
    run: list[str] = []

    def flush() -> None:
        if run:
            out.append("\\X2\\" + "".join(f"{ord(ch):04X}" for ch in run) + "\\X0\\")
            run.clear()

    for ch in text:
        code = ord(ch)
        if code > 0xFFFF:
            raise ValueError("characters outside the Basic Multilingual Plane are not used")
        if 0x20 <= code <= 0x7E:
            flush()
            if ch == "'":
                out.append("''")
            elif ch == "\\":
                out.append("\\\\")
            else:
                out.append(ch)
        else:
            run.append(ch)
    flush()
    return "'" + "".join(out) + "'"


def decode_string(literal: str) -> str:
    """The inverse of encode_string, for tests and ground truth (literal includes the quotes)."""
    if not (literal.startswith("'") and literal.endswith("'")):
        raise ValueError(f"not a STEP string: {literal!r}")
    body = literal[1:-1]
    out: list[str] = []
    index = 0
    while index < len(body):
        if body.startswith("\\X2\\", index):
            end = body.index("\\X0\\", index)
            hexes = body[index + 4 : end]
            out.extend(chr(int(hexes[i : i + 4], 16)) for i in range(0, len(hexes), 4))
            index = end + 4
        elif body.startswith("''", index):
            out.append("'")
            index += 2
        elif body.startswith("\\\\", index):
            out.append("\\")
            index += 2
        else:
            out.append(body[index])
            index += 1
    return "".join(out)


def encode(value: object) -> str:
    if value is None:
        return "$"
    if isinstance(value, bool):
        return ".T." if value else ".F."
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        raise TypeError("floats are never written: use Real('…') with the decimal text")
    if isinstance(value, str):
        return encode_string(value)
    if isinstance(value, (Ref, Enum, Real, RawReal, Typed, _Derived)):
        return value.step()
    if isinstance(value, (list, tuple)):
        return "(" + ",".join(encode(item) for item in value) + ")"
    raise TypeError(f"cannot encode {type(value).__name__}")


# ---------------------------------------------------------------------------
# GlobalIds

GUID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$"
GUID_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "https://fixtures.sovitech.invalid/demo-hotel/test")


def compress_guid(value: uuid.UUID) -> str:
    """The 22-character IFC form of a UUID (the IfcGloballyUniqueId compression)."""
    number = value.int
    chars: list[str] = []
    for _ in range(22):
        chars.append(GUID_ALPHABET[number % 64])
        number //= 64
    return "".join(reversed(chars))


def global_id(key: str) -> str:
    """A stable GlobalId from a stable key: uuid5 over a fixed namespace (ifc-input 5.2)."""
    return compress_guid(uuid.uuid5(GUID_NAMESPACE, key))


# ---------------------------------------------------------------------------
# Schema tables: entity -> attribute names, in schema order.

_ROOT = ["GlobalId", "OwnerHistory", "Name", "Description"]
_OBJECT = [*_ROOT, "ObjectType"]
_PRODUCT = [*_OBJECT, "ObjectPlacement", "Representation"]
_ELEMENT = [*_PRODUCT, "Tag"]
_TYPE_PRODUCT = [*_ROOT, "ApplicableOccurrence", "HasPropertySets", "RepresentationMaps", "Tag"]
_ELEMENT_TYPE = [*_TYPE_PRODUCT, "ElementType"]
_REL2 = [*_ROOT]

_COMMON: dict[str, list[str]] = {
    "IFCPERSON": [
        "Identification",
        "FamilyName",
        "GivenName",
        "MiddleNames",
        "PrefixTitles",
        "SuffixTitles",
        "Roles",
        "Addresses",
    ],
    "IFCORGANIZATION": ["Identification", "Name", "Description", "Roles", "Addresses"],
    "IFCPERSONANDORGANIZATION": ["ThePerson", "TheOrganization", "Roles"],
    "IFCAPPLICATION": [
        "ApplicationDeveloper",
        "Version",
        "ApplicationFullName",
        "ApplicationIdentifier",
    ],
    "IFCOWNERHISTORY": [
        "OwningUser",
        "OwningApplication",
        "State",
        "ChangeAction",
        "LastModifiedDate",
        "LastModifyingUser",
        "LastModifyingApplication",
        "CreationDate",
    ],
    "IFCSIUNIT": ["Dimensions", "UnitType", "Prefix", "Name"],
    "IFCDERIVEDUNITELEMENT": ["Unit", "Exponent"],
    "IFCDERIVEDUNIT": ["Elements", "UnitType", "UserDefinedType"],
    "IFCUNITASSIGNMENT": ["Units"],
    "IFCCARTESIANPOINT": ["Coordinates"],
    "IFCDIRECTION": ["DirectionRatios"],
    "IFCAXIS2PLACEMENT3D": ["Location", "Axis", "RefDirection"],
    "IFCAXIS2PLACEMENT2D": ["Location", "RefDirection"],
    "IFCLOCALPLACEMENT": ["PlacementRelTo", "RelativePlacement"],
    "IFCGEOMETRICREPRESENTATIONCONTEXT": [
        "ContextIdentifier",
        "ContextType",
        "CoordinateSpaceDimension",
        "Precision",
        "WorldCoordinateSystem",
        "TrueNorth",
    ],
    "IFCGEOMETRICREPRESENTATIONSUBCONTEXT": [
        "ContextIdentifier",
        "ContextType",
        "CoordinateSpaceDimension",
        "Precision",
        "WorldCoordinateSystem",
        "TrueNorth",
        "ParentContext",
        "TargetScale",
        "TargetView",
        "UserDefinedTargetView",
    ],
    "IFCRECTANGLEPROFILEDEF": ["ProfileType", "ProfileName", "Position", "XDim", "YDim"],
    "IFCEXTRUDEDAREASOLID": ["SweptArea", "Position", "ExtrudedDirection", "Depth"],
    "IFCSHAPEREPRESENTATION": [
        "ContextOfItems",
        "RepresentationIdentifier",
        "RepresentationType",
        "Items",
    ],
    "IFCPRODUCTDEFINITIONSHAPE": ["Name", "Description", "Representations"],
    "IFCPRESENTATIONLAYERASSIGNMENT": ["Name", "Description", "AssignedItems", "Identifier"],
    "IFCPRESENTATIONLAYERWITHSTYLE": [
        "Name",
        "Description",
        "AssignedItems",
        "Identifier",
        "LayerOn",
        "LayerFrozen",
        "LayerBlocked",
        "LayerStyles",
    ],
    "IFCPROJECT": [*_OBJECT, "LongName", "Phase", "RepresentationContexts", "UnitsInContext"],
    "IFCSITE": [
        *_PRODUCT,
        "LongName",
        "CompositionType",
        "RefLatitude",
        "RefLongitude",
        "RefElevation",
        "LandTitleNumber",
        "SiteAddress",
    ],
    "IFCBUILDING": [
        *_PRODUCT,
        "LongName",
        "CompositionType",
        "ElevationOfRefHeight",
        "ElevationOfTerrain",
        "BuildingAddress",
    ],
    "IFCBUILDINGSTOREY": [*_PRODUCT, "LongName", "CompositionType", "Elevation"],
    "IFCRELAGGREGATES": [*_REL2, "RelatingObject", "RelatedObjects"],
    "IFCRELCONTAINEDINSPATIALSTRUCTURE": [*_REL2, "RelatedElements", "RelatingStructure"],
    "IFCRELASSIGNSTOGROUP": [*_REL2, "RelatedObjects", "RelatedObjectsType", "RelatingGroup"],
    "IFCRELSERVICESBUILDINGS": [*_REL2, "RelatingSystem", "RelatedBuildings"],
    "IFCRELFLOWCONTROLELEMENTS": [*_REL2, "RelatedControlElements", "RelatingFlowElement"],
    "IFCRELDEFINESBYTYPE": [*_REL2, "RelatedObjects", "RelatingType"],
    "IFCRELDEFINESBYPROPERTIES": [*_REL2, "RelatedObjects", "RelatingPropertyDefinition"],
    "IFCPROPERTYSET": [*_ROOT, "HasProperties"],
    "IFCPROPERTYSINGLEVALUE": ["Name", "Description", "NominalValue", "Unit"],
    "IFCELEMENTQUANTITY": [*_ROOT, "MethodOfMeasurement", "Quantities"],
}

_IFC4_ONLY: dict[str, list[str]] = {
    "IFCSPACE": [
        *_PRODUCT,
        "LongName",
        "CompositionType",
        "PredefinedType",
        "ElevationWithFlooring",
    ],
    "IFCZONE": [*_OBJECT, "LongName"],
    "IFCDISTRIBUTIONSYSTEM": [*_OBJECT, "LongName", "PredefinedType"],
    "IFCQUANTITYAREA": ["Name", "Description", "Unit", "AreaValue", "Formula"],
    "IFCSLAB": [*_ELEMENT, "PredefinedType"],
    "IFCDOOR": [
        *_ELEMENT,
        "OverallHeight",
        "OverallWidth",
        "PredefinedType",
        "OperationType",
        "UserDefinedOperationType",
    ],
    "IFCTRANSPORTELEMENT": [*_ELEMENT, "PredefinedType"],
    "IFCBUILDINGELEMENTPROXY": [*_ELEMENT, "PredefinedType"],
    "IFCPUMPTYPE": [*_ELEMENT_TYPE, "PredefinedType"],
}

# IFC4 distribution occurrences: IfcElement plus PredefinedType.
IFC4_DISTRIBUTION_CLASSES = (
    "IFCUNITARYEQUIPMENT",
    "IFCCHILLER",
    "IFCPUMP",
    "IFCFAN",
    "IFCAIRTERMINALBOX",
    "IFCDAMPER",
    "IFCVALVE",
    "IFCFLOWMETER",
    "IFCFIRESUPPRESSIONTERMINAL",
    "IFCLIGHTFIXTURE",
    "IFCSENSOR",
    "IFCACTUATOR",
    "IFCCONTROLLER",
    "IFCUNITARYCONTROLELEMENT",
    "IFCALARM",
    "IFCELECTRICDISTRIBUTIONBOARD",
)
for _name in IFC4_DISTRIBUTION_CLASSES:
    _IFC4_ONLY[_name] = [*_ELEMENT, "PredefinedType"]

_IFC2X3_ONLY: dict[str, list[str]] = {
    "IFCSPACE": [
        *_PRODUCT,
        "LongName",
        "CompositionType",
        "InteriorOrExteriorSpace",
        "ElevationWithFlooring",
    ],
    "IFCZONE": [*_OBJECT],
    "IFCSYSTEM": [*_OBJECT],
    "IFCQUANTITYAREA": ["Name", "Description", "Unit", "AreaValue"],
    "IFCBUILDINGELEMENTPROXY": [*_ELEMENT, "CompositionType"],
    # IFC2X3 has generic flow occurrences, typed by a type object (ifc-input 3.2 [S48]).
    "IFCENERGYCONVERSIONDEVICE": [*_ELEMENT],
    "IFCFLOWMOVINGDEVICE": [*_ELEMENT],
    "IFCFLOWCONTROLLER": [*_ELEMENT],
    "IFCFLOWTERMINAL": [*_ELEMENT],
    "IFCDISTRIBUTIONCONTROLELEMENT": [*_ELEMENT, "ControlElementId"],
    "IFCELECTRICDISTRIBUTIONPOINT": [*_ELEMENT, "DistributionPointFunction", "UserDefinedFunction"],
}
IFC2X3_TYPE_CLASSES = (
    "IFCUNITARYEQUIPMENTTYPE",
    "IFCCHILLERTYPE",
    "IFCPUMPTYPE",
    "IFCFANTYPE",
    "IFCAIRTERMINALBOXTYPE",
    "IFCDAMPERTYPE",
    "IFCVALVETYPE",
    "IFCFLOWMETERTYPE",
    "IFCFIRESUPPRESSIONTERMINALTYPE",
    "IFCLIGHTFIXTURETYPE",
    "IFCSENSORTYPE",
    "IFCACTUATORTYPE",
    "IFCCONTROLLERTYPE",
    "IFCALARMTYPE",
)
for _name in IFC2X3_TYPE_CLASSES:
    _IFC2X3_ONLY[_name] = [*_ELEMENT_TYPE, "PredefinedType"]

SCHEMAS: dict[str, dict[str, list[str]]] = {
    "IFC4": {**_COMMON, **_IFC4_ONLY},
    "IFC2X3": {**_COMMON, **_IFC2X3_ONLY},
}


# ---------------------------------------------------------------------------
# The writer


@dataclass(frozen=True)
class Header:
    file_name: str
    view_definition: str
    description: str
    author: str
    organization: str
    preprocessor: str
    originating_system: str
    time_stamp: str = "2026-01-15T09:00:00"


class StepWriter:
    """Collects instances in creation order and writes the file."""

    def __init__(self, schema: str) -> None:
        if schema not in SCHEMAS:
            raise ValueError(f"unknown schema {schema}")
        self.schema = schema
        self.table = SCHEMAS[schema]
        self._next = FIRST_INSTANCE_ID
        self._lines: dict[int, str] = {}
        self._types: dict[int, str] = {}

    def add(self, entity: str, *attributes: object) -> Ref:
        entity = entity.upper()
        names = self.table.get(entity)
        if names is None:
            raise KeyError(f"{entity} is not in the {self.schema} table")
        if len(attributes) != len(names):
            raise ValueError(
                f"{entity} ({self.schema}) takes {len(names)} attributes "
                f"({', '.join(names)}), got {len(attributes)}"
            )
        ref = Ref(self._next)
        self._next += 1
        body = ",".join(encode(value) for value in attributes)
        self._lines[ref.id] = f"#{ref.id}={entity}({body});"
        self._types[ref.id] = entity
        return ref

    def line(self, ref: Ref) -> str:
        return self._lines[ref.id]

    def entity_type(self, ref: Ref) -> str:
        return self._types[ref.id]

    def attribute_names(self, entity: str) -> list[str]:
        return list(self.table[entity.upper()])

    def text(self, header: Header) -> str:
        head = [
            "ISO-10303-21;",
            "HEADER;",
            "FILE_DESCRIPTION(("
            + ",".join(encode_string(item) for item in (header.view_definition, header.description))
            + "),'2;1');",
            "FILE_NAME("
            + ",".join(
                [
                    encode_string(header.file_name),
                    encode_string(header.time_stamp),
                    "(" + encode_string(header.author) + ")",
                    "(" + encode_string(header.organization) + ")",
                    encode_string(header.preprocessor),
                    encode_string(header.originating_system),
                    encode_string(""),
                ]
            )
            + ");",
            f"FILE_SCHEMA(('{self.schema}'));",
            "ENDSEC;",
            "DATA;",
        ]
        tail = ["ENDSEC;", "END-ISO-10303-21;"]
        return "\n".join([*head, *self._lines.values(), *tail]) + "\n"
