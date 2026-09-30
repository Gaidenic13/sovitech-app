"""The draft SOVITECH IDS v0.1 against the buildingSMART IDS 1.0 XSD, offline, with lxml.

Prompt 3 section 12: validate the draft IDS against the XSD with lxml before it is committed, and
record that the IDS-Audit-tool was not run. Owner answers of 2026-09-26 (docs/build-log.md, "Owner
answers during the run"): the XSD is fetched from the official buildingSMART/IDS GitHub repository
("Fetch from buildingSMART's GitHub"), and IFC data is read with web-ifc ("web-ifc instead"), so
IfcTester is not used and the IDS model check waits (D-36).

What runs here:
- the XSD in services/extractor/schemas/ is the IDS 1.0 release file, byte for byte (SHA-256, git
  blob id and size as services/extractor/schemas/README.md records them);
- it compiles with no network: http://www.w3.org/2001/XMLSchema.xsd resolves to the SOVITECH-written
  stand-in next to it, and the two other W3C imports stay unresolved because the XSD references
  nothing in their namespaces;
- the draft IDS validates;
- broken copies of it, built in memory, fail, each for its own reason, so a pass is not vacuous;
- the stand-in keeps its shape: two components, no wildcard, the twelve XML Schema 1.0 facets.

What does not run: the IDS-Audit-tool (a binary from GitHub; prompt 3 section 12) and IfcTester (not
used: owner decision 2026-09-26). So the IDS's meaning is not checked beyond the XSD (IFC class and
property names, data types against the IFC schemas), and the expected results under
fixtures/ids/expected/ are compared with no checker's report.

Ids: F-IFC-09 (the IDS file; its model check itself is not built), ifc-input 5.5.
"""

from __future__ import annotations

import copy
import hashlib
from collections.abc import Callable
from pathlib import Path

import pytest
from lxml import etree

REPO = Path(__file__).resolve().parents[3]
SCHEMAS = REPO / "services" / "extractor" / "schemas"
XSD = SCHEMAS / "ids-1.0.xsd"
STAND_IN = SCHEMAS / "xs-namespace-stand-in.xsd"
README = SCHEMAS / "README.md"
IDS = REPO / "fixtures" / "ids" / "sovitech-ifc-minimum-v0.1.ids"

# The IDS 1.0 release file: tag v1.0.0 of github.com/buildingSMART/IDS, Development/ids.xsd.
XSD_COMMIT = "1effec6f419798ce09617416d258a35bdc58320a"
XSD_SHA256 = "8975dc18bd18f08a345a430a22bf317a54d94671b7db01400042fa43b6c0d1f3"
XSD_GIT_BLOB = "edab179d836d0c3e9b21d93c5e2b29f86ec56885"
XSD_SIZE = 13158

XS = "http://www.w3.org/2001/XMLSchema"
XML_NS = "http://www.w3.org/XML/1998/namespace"
XSI = "http://www.w3.org/2001/XMLSchema-instance"
IDS_NS = "http://standards.buildingsmart.org/IDS"
NS = {"xs": XS, "ids": IDS_NS}

XS_URL = "http://www.w3.org/2001/XMLSchema.xsd"
UNRESOLVED = ("http://www.w3.org/2001/xml.xsd", "http://www.w3.org/2001/XMLSchema-instance")
# XML Schema 1.0 Part 2, section 4.3: the constraining facets.
FACETS = (
    "minExclusive",
    "minInclusive",
    "maxExclusive",
    "maxInclusive",
    "totalDigits",
    "fractionDigits",
    "length",
    "minLength",
    "maxLength",
    "enumeration",
    "whiteSpace",
    "pattern",
)


class _Offline(etree.Resolver):
    """Resolves the XML Schema namespace to the stand-in; records every URL libxml2 asks for."""

    def __init__(self) -> None:
        super().__init__()
        self.asked: list[str] = []

    def resolve(self, system_url: str, public_id: str | None, context: object) -> object:
        self.asked.append(system_url)
        if system_url == XS_URL:
            return self.resolve_filename(str(STAND_IN), context)
        return None  # libxml2's own loader, which no_network keeps off the network


def _parser(resolver: _Offline | None = None) -> etree.XMLParser:
    parser = etree.XMLParser(resolve_entities=False, no_network=True, load_dtd=False)
    if resolver is not None:
        parser.resolvers.add(resolver)
    return parser


def _compile() -> tuple[etree.XMLSchema, _Offline]:
    resolver = _Offline()
    schema = etree.XMLSchema(etree.parse(str(XSD), _parser(resolver)))
    return schema, resolver


@pytest.fixture(scope="module")
def schema() -> etree.XMLSchema:
    return _compile()[0]


def _ids() -> etree._ElementTree:
    return etree.parse(str(IDS), _parser())


def _first(root: etree._Element, path: str) -> etree._Element:
    found = root.find(path, NS)
    assert found is not None, path
    return found


# ---------------------------------------------------------------------------
# The XSD file


def test_f_ifc_09_the_xsd_is_the_ids_1_0_release_file_byte_for_byte() -> None:
    assert XSD.is_file(), "services/extractor/schemas/ids-1.0.xsd is missing"
    data = XSD.read_bytes()
    assert len(data) == XSD_SIZE
    assert hashlib.sha256(data).hexdigest() == XSD_SHA256
    # The git blob id GitHub lists for Development/ids.xsd at the tagged commit.
    blob = hashlib.sha1(b"blob %d\0" % len(data) + data, usedforsecurity=False).hexdigest()
    assert blob == XSD_GIT_BLOB
    root = etree.fromstring(data, _parser())
    assert root.get("targetNamespace") == IDS_NS
    assert root.get("version") == "1.0.0"


def test_f_ifc_09_the_readme_records_the_source_and_hashes_of_the_xsd() -> None:
    text = README.read_text(encoding="utf-8")
    for recorded in (XSD_COMMIT, XSD_SHA256, XSD_GIT_BLOB, "v1.0.0", "Development/ids.xsd"):
        assert recorded in text, recorded
    assert "xs-namespace-stand-in.xsd" in text
    assert "IDS-Audit-tool" in text
    assert "IfcTester" in text


# ---------------------------------------------------------------------------
# Compiling it offline


def _qname_refs(root: etree._Element) -> set[tuple[str, str, str]]:
    """(namespace, local name, attribute) of every QName the schema refers to."""
    refs: set[tuple[str, str, str]] = set()
    for element in root.iter(etree.Element):
        values = [(a, element.get(a)) for a in ("ref", "type", "base", "itemType")]
        values += [("memberTypes", v) for v in (element.get("memberTypes") or "").split()]
        for attribute, value in values:
            if value is not None:
                prefix, _, local = value.rpartition(":")
                refs.add((element.nsmap.get(prefix or None, ""), local, attribute))
    return refs


def test_f_ifc_09_the_xsd_needs_only_what_the_stand_in_declares() -> None:
    root = etree.parse(str(XSD), _parser()).getroot()
    refs = _qname_refs(root)
    assert not [r for r in refs if r[0] in (XML_NS, XSI)]
    in_xs = {(local, attribute) for namespace, local, attribute in refs if namespace == XS}
    # Built-in datatypes aside, the XSD uses one element and one attribute group of the XML
    # Schema namespace: the two components the stand-in declares, and nothing more.
    assert {c for c in in_xs if c[1] == "ref"} == {("restriction", "ref"), ("occurs", "ref")}
    kinds = {
        el.get("ref"): etree.QName(el).localname
        for el in root.iter(etree.Element)
        if (el.get("ref") or "").startswith("xs:")
    }
    assert kinds == {"xs:restriction": "element", "xs:occurs": "attributeGroup"}
    datatypes = {local for local, attribute in in_xs if attribute != "ref"}
    assert datatypes == {"string", "date", "anyURI", "normalizedString"}


def test_f_ifc_09_the_xsd_compiles_with_no_network_and_nothing_else_resolved() -> None:
    schema, resolver = _compile()
    asked = [url for url in resolver.asked if url.startswith(("http:", "https:"))]
    assert sorted(asked) == sorted([XS_URL, *UNRESOLVED])
    entries = list(schema.error_log)
    assert all(e.level_name == "WARNING" for e in entries), [e.message for e in entries]
    # The only warnings are the two imports left unresolved, which the XSD never uses.
    assert all(any(url in e.message for url in UNRESOLVED) for e in entries), entries
    assert {url for url in UNRESOLVED if any(url in e.message for e in entries)} == set(UNRESOLVED)


# ---------------------------------------------------------------------------
# The draft IDS


def test_f_ifc_09_the_draft_ids_validates_against_the_ids_1_0_xsd(
    schema: etree.XMLSchema,
) -> None:
    document = _ids()
    assert schema.validate(document), [e.message for e in schema.error_log]
    root = document.getroot()
    assert root.tag == f"{{{IDS_NS}}}ids"
    assert "DRAFT REFERENCE DATA" in root.findtext("ids:info/ids:description", namespaces=NS)
    assert len(root.findall("ids:specifications/ids:specification", NS)) == 11


def _drop(attribute: str, path: str) -> Callable[[etree._Element], None]:
    def breaks(root: etree._Element) -> None:
        del _first(root, path).attrib[attribute]

    return breaks


def _set(attribute: str, value: str, path: str) -> Callable[[etree._Element], None]:
    def breaks(root: etree._Element) -> None:
        _first(root, path).set(attribute, value)

    return breaks


def _purpose_before_title(root: etree._Element) -> None:
    info = _first(root, "ids:info")
    purpose = _first(info, "ids:purpose")
    info.remove(purpose)
    info.insert(0, purpose)


def _facet_xml_schema_1_0_lacks(root: etree._Element) -> None:
    etree.SubElement(_first(root, ".//xs:restriction"), f"{{{XS}}}assertion", test="true()")


# Each broken copy, and the words the validator's message must hold, so it fails for its reason.
BROKEN: dict[str, tuple[Callable[[etree._Element], None], str]] = {
    "specification-without-name": (
        _drop("name", ".//ids:specification"),
        "attribute 'name' is required",
    ),
    "ifc-version-not-in-ids-1-0": (
        _set("ifcVersion", "IFC5", ".//ids:specification"),
        "attribute 'ifcVersion'",
    ),
    "partof-relation-not-in-ids-1-0": (
        _set("relation", "IFCRELCONNECTSELEMENTS", ".//ids:requirements/ids:partOf"),
        "attribute 'relation'",
    ),
    "partof-cardinality-optional": (
        _set("cardinality", "optional", ".//ids:requirements/ids:partOf"),
        "attribute 'cardinality'",
    ),
    "data-type-not-upper-case": (
        _set("dataType", "IfcAreaMeasure", ".//ids:property"),
        "attribute 'dataType'",
    ),
    "info-out-of-order": (_purpose_before_title, "purpose': This element is not expected"),
    "max-occurs-not-a-number": (
        _set("maxOccurs", "many", ".//ids:applicability"),
        "attribute 'maxOccurs'",
    ),
    # The three below reach the stand-in's xs:restriction.
    "restriction-with-a-facet-xml-schema-1-0-lacks": (
        _facet_xml_schema_1_0_lacks,
        "assertion': This element is not expected",
    ),
    "enumeration-without-value": (
        _drop("value", ".//xs:enumeration"),
        "attribute 'value' is required",
    ),
    # Stricter than W3C, where a restriction with no base may carry a nested simpleType instead.
    "restriction-without-base": (
        _drop("base", ".//xs:restriction"),
        "attribute 'base' is required",
    ),
}


@pytest.mark.parametrize("case", list(BROKEN))
def test_f_ifc_09_a_broken_copy_of_the_ids_fails_for_its_own_reason(
    schema: etree.XMLSchema, case: str
) -> None:
    breaks, words = BROKEN[case]
    document = copy.deepcopy(_ids())
    breaks(document.getroot())
    assert not schema.validate(document)
    messages = " ".join(e.message for e in schema.error_log)
    assert words in messages, messages


# ---------------------------------------------------------------------------
# The stand-in


def test_f_ifc_09_the_stand_in_declares_two_components_and_no_wildcard() -> None:
    root = etree.parse(str(STAND_IN), _parser()).getroot()
    assert root.get("targetNamespace") == XS
    declared = [(etree.QName(el).localname, el.get("name")) for el in root.iter(etree.Element)]
    top_level = [
        (etree.QName(el).localname, el.get("name")) for el in root.iterchildren(etree.Element)
    ]
    assert top_level == [("element", "restriction"), ("attributeGroup", "occurs")]
    for loosening in ("any", "anyAttribute", "import", "include", "redefine", "annotation"):
        assert not root.findall(f".//xs:{loosening}", NS), loosening
    # No nested xs:simpleType and no xs:annotation child is declared inside xs:restriction.
    elements = [name for kind, name in declared if kind == "element"]
    assert "simpleType" not in elements
    assert "annotation" not in elements
    restriction = _first(root, "xs:element[@name='restriction']/xs:complexType")
    choice = _first(restriction, "xs:choice")
    assert (choice.get("minOccurs"), choice.get("maxOccurs")) == ("1", "unbounded")
    facets = choice.findall("xs:element", NS)
    assert [facet.get("name") for facet in facets] == list(FACETS)
    for facet in facets:
        name = facet.get("name")
        attributes = {a.get("name"): a for a in facet.iterfind(".//xs:attribute", NS)}
        assert attributes["value"].get("use") == "required", name
        fixed_allowed = name not in ("enumeration", "pattern")
        assert set(attributes) == ({"value", "fixed"} if fixed_allowed else {"value"}), name
        assert facet.find(".//xs:element", NS) is None, name
    base = restriction.findall("xs:attribute", NS)
    assert [(a.get("name"), a.get("type"), a.get("use")) for a in base] == [
        ("base", "xs:QName", "required")
    ]
    occurs = _first(root, "xs:attributeGroup[@name='occurs']")
    names = [a.get("name") for a in occurs.findall("xs:attribute", NS)]
    assert names == ["minOccurs", "maxOccurs"]
