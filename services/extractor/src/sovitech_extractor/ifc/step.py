"""A reader of ISO 10303-21 (STEP physical) files: the header, an index of instances, and typed
tokens.

Since the owner's decision of 2026-09-26 ("web-ifc instead"; ADR 0018, ADR 0031) this is the
in-house reader of word-for-word evidence only: IFC models are read by the IFC reader on web-ifc
(packages/ifc-reader), whose TypeScript copy of this reader (step-text.ts) supplies each fact's
verbatim STEP line and literal tokens. The two read the shared corpus
packages/ifc-reader/src/step-text-corpus.json the same way (tests/test_step_text_parity.py).

It keeps what the file writes. A real or an integer stays its token (``Real("26.4")``); the
extractor never turns text into a number (prompt 3 section 6; tests/test_bans.py). A string keeps
its token as written, escapes included, and carries its decoded text. Each instance's verbatim
statement is its excerpt (ifc-input 4.1 item 3).

The index is built in one pass that only finds where each statement starts and ends; the
attributes of an instance are parsed when something asks for them, so the geometry that makes up
most of a large model is never parsed by the data pass (prompt 3 section 11, the extraction
budget).

A statement the reader cannot read is recorded as a ``ReadProblem`` (a code and STEP ids, never
text: guardrails rule 13), and the rest of the file is still read (prompt 3 section 8).

STEP instance names are kept as their digits (``"100001"``): they are identifiers, never numbers
read from the text.
"""

from __future__ import annotations

import re
from collections.abc import Iterator
from dataclasses import dataclass, field

__all__ = [
    "Binary",
    "Derived",
    "Enum",
    "FileHeader",
    "Integer",
    "NotStepError",
    "ReadProblem",
    "Real",
    "Ref",
    "StepFile",
    "StepList",
    "StepSyntaxError",
    "Str",
    "Typed",
    "Unset",
    "Value",
    "decode_string",
    "read_bytes",
    "read_text",
]


class NotStepError(ValueError):
    """The text is not an ISO 10303-21 exchange file (no header, schema or data section)."""


class StepSyntaxError(ValueError):
    """A statement or a string that breaks the ISO 10303-21 grammar. The message is a code."""


@dataclass(frozen=True, slots=True)
class Unset:
    """``$``: not set. Unknown, never zero (guardrails rule 1)."""


@dataclass(frozen=True, slots=True)
class Derived:
    """``*``: derived by the schema, not written."""


@dataclass(frozen=True, slots=True)
class Ref:
    """``#n``: a reference to another instance of the file, by its digits."""

    id: str


@dataclass(frozen=True, slots=True)
class Enum:
    """``.NAME.``: an enumeration, a boolean (``.T.``, ``.F.``) or a logical (``.U.``)."""

    token: str

    @property
    def name(self) -> str:
        return self.token[1:-1]


@dataclass(frozen=True, slots=True)
class Real:
    """A real as its token: ``26.4``, ``-6500.``, ``1.E-05``."""

    token: str


@dataclass(frozen=True, slots=True)
class Integer:
    """An integer as its token."""

    token: str


@dataclass(frozen=True, slots=True)
class Str:
    """A string: its token as written (quotes and escapes included) and its decoded text."""

    token: str
    text: str


@dataclass(frozen=True, slots=True)
class Binary:
    """A binary as its token (``"0FF"``)."""

    token: str


@dataclass(frozen=True, slots=True)
class Typed:
    """A typed parameter: ``IFCLABEL('x')``, ``IFCPOWERMEASURE(5.5)``."""

    type_name: str
    value: Value


@dataclass(frozen=True, slots=True)
class StepList:
    """An aggregate ``( ... )``."""

    items: tuple[Value, ...]


type Value = Unset | Derived | Ref | Enum | Real | Integer | Str | Binary | Typed | StepList


@dataclass(frozen=True, slots=True)
class ReadProblem:
    """Something the reader could not read: a code and the STEP ids it concerns, never text."""

    code: str
    step_ids: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class FileHeader:
    """The header section as written (ISO 10303-21 section 8)."""

    description: tuple[str, ...] = ()
    implementation_level: str | None = None
    name: str | None = None
    time_stamp: str | None = None
    author: tuple[str, ...] = ()
    organization: tuple[str, ...] = ()
    preprocessor_version: str | None = None
    originating_system: str | None = None
    authorization: str | None = None
    schemas: tuple[str, ...] = ()


# One statement of the data section, from "#n=" to its ";". Strings and comments may hold ";"
# and ")", so they are matched whole; possessive quantifiers keep the scan linear.
_STATEMENT = re.compile(
    r"#(?P<id>[0-9]+)[ \t\r\n]*=[ \t\r\n]*"
    r"(?P<body>(?:[^';/]++|'(?:[^']|'')*+'|/\*(?:[^*]|\*(?!/))*+\*/|/(?!\*))*+);"
)
_SKIP = re.compile(r"(?:[ \t\r\n]+|/\*(?:[^*]|\*(?!/))*+\*/)*+")
_KEYWORD = re.compile(r"[ \t\r\n]*(?P<keyword>[A-Za-z_][A-Za-z0-9_]*)[ \t\r\n]*\(")
_TO_SEMICOLON = re.compile(r"(?:[^';]++|'(?:[^']|'')*+')*+;")
_HEADER_STATEMENT = re.compile(
    r"(?P<keyword>[A-Za-z_][A-Za-z0-9_]*)[ \t\r\n]*"
    r"(?P<body>\((?:[^';/]++|'(?:[^']|'')*+'|/\*(?:[^*]|\*(?!/))*+\*/|/(?!\*))*+);"
)
_MAGIC = re.compile(r"(?:﻿)?[ \t\r\n]*ISO-10303-21[ \t\r\n]*;")

_TOKEN = re.compile(
    r"""[ \t\r\n]*(?:
      (?P<str>'(?:[^']|'')*')
    | (?P<ref>\#[0-9]+)
    | (?P<enum>\.[A-Za-z_][A-Za-z0-9_]*\.)
    | (?P<real>[+-]?[0-9]+\.[0-9]*(?:[Ee][+-]?[0-9]+)?)
    | (?P<int>[+-]?[0-9]+)
    | (?P<bin>"[0-9A-Fa-f]*")
    | (?P<kw>[A-Za-z_][A-Za-z0-9_]*)
    | (?P<open>\()
    | (?P<close>\))
    | (?P<comma>,)
    | (?P<unset>\$)
    | (?P<derived>\*)
    | (?P<comment>/\*(?:[^*]|\*(?!/))*\*/)
    )""",
    re.VERBOSE,
)

# ISO 10303-21 code pages for \S\ and \P?\ : A is ISO 8859-1, B to I are ISO 8859-2 to -9.
_CODE_PAGES = {
    "A": "iso8859-1",
    "B": "iso8859-2",
    "C": "iso8859-3",
    "D": "iso8859-4",
    "E": "iso8859-5",
    "F": "iso8859-6",
    "G": "iso8859-7",
    "H": "iso8859-8",
    "I": "iso8859-9",
}
# The parts of a string body (ISO 10303-21 7.3.3): a doubled quote, a doubled backslash, the
# \S\ \P?\ \X\ \X2\ \X4\ escapes, a run of plain characters; anything else breaks the grammar.
_STRING_PART = re.compile(
    r"(?P<quote>'')"
    r"|(?P<backslash>\\\\)"
    r"|\\S\\(?P<upper>[\x20-\x7e])"
    r"|\\P(?P<page>[A-I])\\"
    r"|\\X2\\(?P<ucs2>(?:[0-9A-Fa-f]{4})*)\\X0\\"
    r"|\\X4\\(?P<ucs4>(?:[0-9A-Fa-f]{8})*)\\X0\\"
    r"|\\X\\(?P<byte>[0-9A-Fa-f]{2})"
    r"|(?P<plain>[^'\\]+)",
)


def decode_string(token: str) -> str:
    """The text of a STEP string token (ISO 10303-21 7.3.3), quotes and escapes resolved."""
    if len(token) < 2 or token[0] != "'" or token[-1] != "'":
        raise StepSyntaxError("step.string_token")
    body = token[1:-1]
    out: list[str] = []
    page = "A"
    pos = 0
    while pos < len(body):
        part = _STRING_PART.match(body, pos)
        if part is None:
            raise StepSyntaxError("step.string_escape")
        pos = part.end()
        kind = part.lastgroup
        if kind == "plain":
            out.append(part.group("plain"))
        elif kind == "quote":
            out.append("'")
        elif kind == "backslash":
            out.append("\\")
        elif kind == "page":
            page = part.group("page")
        elif kind == "upper":
            out.append(bytes([ord(part.group("upper")) | 0x80]).decode(_CODE_PAGES[page]))
        elif kind == "byte":
            out.append(bytes.fromhex(part.group("byte")).decode("iso8859-1"))
        else:
            out.append(_wide(part.group("ucs2"), part.group("ucs4")))
    return "".join(out)


def _wide(ucs2: str | None, ucs4: str | None) -> str:
    """The characters of an \\X2\\ or \\X4\\ escape."""
    digits, codec = (ucs2, "utf-16-be") if ucs2 is not None else (ucs4 or "", "utf-32-be")
    try:
        return bytes.fromhex(digits).decode(codec)
    except UnicodeDecodeError as error:
        raise StepSyntaxError("step.string_escape") from error


def _parse_values(text: str, start: int) -> tuple[tuple[Value, ...], int]:
    """The values of the aggregate whose "(" was consumed before ``start``, and the end offset."""
    items: list[Value] = []
    pos = start
    expect_value = True
    while True:
        match = _TOKEN.match(text, pos)
        if match is None:
            raise StepSyntaxError("step.token")
        pos = match.end()
        kind = match.lastgroup
        if kind == "comment":
            continue
        if kind == "close":
            if expect_value and items:
                raise StepSyntaxError("step.token")
            return tuple(items), pos
        if kind == "comma":
            if expect_value:
                raise StepSyntaxError("step.token")
            expect_value = True
            continue
        if not expect_value:
            raise StepSyntaxError("step.token")
        value, pos = _value_from(match, kind, text, pos)
        items.append(value)
        expect_value = False


def _value_from(match: re.Match[str], kind: str | None, text: str, pos: int) -> tuple[Value, int]:
    token = match.group(kind) if kind else ""
    if kind == "str":
        return Str(token, decode_string(token)), pos
    if kind == "ref":
        return Ref(token[1:]), pos
    if kind == "enum":
        return Enum(token.upper()), pos
    if kind == "real":
        return Real(token), pos
    if kind == "int":
        return Integer(token), pos
    if kind == "bin":
        return Binary(token.upper()), pos
    if kind == "unset":
        return Unset(), pos
    if kind == "derived":
        return Derived(), pos
    if kind == "open":
        inner, end = _parse_values(text, pos)
        return StepList(inner), end
    if kind == "kw":
        opener = _TOKEN.match(text, pos)
        while opener is not None and opener.lastgroup == "comment":
            opener = _TOKEN.match(text, opener.end())
        if opener is None or opener.lastgroup != "open":
            raise StepSyntaxError("step.token")
        inner, end = _parse_values(text, opener.end())
        if len(inner) != 1:
            raise StepSyntaxError("step.typed_parameter")
        return Typed(token.upper(), inner[0]), end
    raise StepSyntaxError("step.token")


def parse_parameters(text: str) -> tuple[Value, ...]:
    """The values of one parenthesised parameter list, ``(a,b,...)``, and nothing after it."""
    opener = _TOKEN.match(text)
    while opener is not None and opener.lastgroup == "comment":
        opener = _TOKEN.match(text, opener.end())
    if opener is None or opener.lastgroup != "open":
        raise StepSyntaxError("step.token")
    values, end = _parse_values(text, opener.end())
    if _SKIP.fullmatch(text, end) is None:
        raise StepSyntaxError("step.trailing_text")
    return values


@dataclass(slots=True)
class _Instance:
    keyword: str | None
    start: int
    end: int
    params: int


@dataclass(slots=True)
class StepFile:
    """A read STEP file: header, instances in file order, problems, and lazy attributes."""

    text: str
    header: FileHeader
    _instances: dict[str, _Instance]
    _by_keyword: dict[str, list[str]]
    problems: tuple[ReadProblem, ...]
    _parsed: dict[str, tuple[Value, ...]] = field(default_factory=dict)

    def ids(self) -> Iterator[str]:
        """Every instance id, in file order."""
        return iter(self._instances)

    def __contains__(self, step_id: str) -> bool:
        return step_id in self._instances

    def __len__(self) -> int:
        return len(self._instances)

    def keyword(self, step_id: str) -> str | None:
        """The entity keyword of an instance (upper case), or None for a complex instance."""
        return self._instances[step_id].keyword

    def keywords(self) -> tuple[str, ...]:
        """Every keyword the data section uses, in the order first seen."""
        return tuple(self._by_keyword)

    def ids_of(self, keyword: str) -> tuple[str, ...]:
        """The ids of the instances of one keyword, in file order."""
        return tuple(self._by_keyword.get(keyword, ()))

    def position(self, step_id: str) -> int:
        """Where the instance's statement starts in the file (for ordering by file order)."""
        return self._instances[step_id].start

    def excerpt(self, step_id: str) -> str:
        """The instance's statement exactly as the file writes it, from "#" to ";"."""
        instance = self._instances[step_id]
        return self.text[instance.start : instance.end]

    def attributes(self, step_id: str) -> tuple[Value, ...]:
        """The instance's attribute values, parsed on first use; raises StepSyntaxError."""
        cached = self._parsed.get(step_id)
        if cached is not None:
            return cached
        instance = self._instances[step_id]
        if instance.keyword is None:
            raise StepSyntaxError("step.complex_instance")
        values = parse_parameters(self.text[instance.params : instance.end - 1])
        self._parsed[step_id] = values
        return values

    def parsed_count(self) -> int:
        """How many instances have had their attributes parsed (for tests and measurements)."""
        return len(self._parsed)


def _header(text: str, start: int, end: int, problems: list[ReadProblem]) -> FileHeader:
    fields: dict[str, tuple[Value, ...]] = {}
    pos = start
    while True:
        skip = _SKIP.match(text, pos)
        pos = skip.end() if skip else pos
        if pos >= end:
            break
        match = _HEADER_STATEMENT.match(text, pos, end)
        if match is None:
            problems.append(ReadProblem("step.header_statement"))
            resync = _TO_SEMICOLON.match(text, pos, end)
            if resync is None:
                break
            pos = resync.end()
            continue
        pos = match.end()
        try:
            fields[match.group("keyword").upper()] = parse_parameters(match.group("body"))
        except StepSyntaxError:
            problems.append(ReadProblem("step.header_statement"))
    return FileHeader(
        description=_texts(_at(fields.get("FILE_DESCRIPTION"), 0)),
        implementation_level=_text(_at(fields.get("FILE_DESCRIPTION"), 1)),
        name=_text(_at(fields.get("FILE_NAME"), 0)),
        time_stamp=_text(_at(fields.get("FILE_NAME"), 1)),
        author=_texts(_at(fields.get("FILE_NAME"), 2)),
        organization=_texts(_at(fields.get("FILE_NAME"), 3)),
        preprocessor_version=_text(_at(fields.get("FILE_NAME"), 4)),
        originating_system=_text(_at(fields.get("FILE_NAME"), 5)),
        authorization=_text(_at(fields.get("FILE_NAME"), 6)),
        schemas=_texts(_at(fields.get("FILE_SCHEMA"), 0)),
    )


def _at(values: tuple[Value, ...] | None, index: int) -> Value | None:
    if values is None or index >= len(values):
        return None
    return values[index]


def _text(value: Value | None) -> str | None:
    return value.text if isinstance(value, Str) else None


def _texts(value: Value | None) -> tuple[str, ...]:
    if isinstance(value, StepList):
        return tuple(item.text for item in value.items if isinstance(item, Str))
    return ()


_SECTIONS = {name: re.compile(rf"(?:^|[;\s]){name}[ \t\r\n]*;") for name in ("HEADER", "DATA")}


def _section(text: str, name: str, start: int) -> int:
    """The offset just after a section's opening "NAME;"."""
    opener = _SECTIONS[name].search(text, start)
    if opener is None:
        raise NotStepError(f"step.no_{name.lower()}_section")
    return opener.end()


def read_text(text: str) -> StepFile:
    """Read a STEP file from its text. Raises NotStepError when it is not one.

    ISO 10303-21 files are 7-bit text with escapes for other characters; characters above 127
    are recorded as a problem (the file departs from the standard) and still read.
    """
    if _MAGIC.match(text) is None:
        raise NotStepError("step.not_step")
    problems: list[ReadProblem] = []
    header_start = _section(text, "HEADER", 0)
    header_end = text.find("ENDSEC", header_start)
    if header_end < 0:
        raise NotStepError("step.no_header_section")
    data_start = _section(text, "DATA", header_end)
    header = _header(text, header_start, header_end, problems)
    if not header.schemas:
        problems.append(ReadProblem("step.no_schema"))
    instances: dict[str, _Instance] = {}
    by_keyword: dict[str, list[str]] = {}
    pos = data_start
    length = len(text)
    ended = False
    while pos < length:
        skip = _SKIP.match(text, pos)
        pos = skip.end() if skip else pos
        if pos >= length:
            break
        if text.startswith("ENDSEC", pos):
            ended = True
            break
        match = _STATEMENT.match(text, pos)
        if match is None:
            problems.append(ReadProblem("step.unexpected_text"))
            resync = _TO_SEMICOLON.match(text, pos)
            if resync is None:
                break
            pos = resync.end()
            continue
        step_id = match.group("id")
        body_start = match.start("body")
        keyword_match = _KEYWORD.match(text, body_start, match.end())
        if step_id in instances:
            problems.append(ReadProblem("step.duplicate_id", (step_id,)))
        elif keyword_match is None:
            instances[step_id] = _Instance(None, match.start(), match.end(), match.end())
            problems.append(ReadProblem("step.complex_instance", (step_id,)))
        else:
            keyword = keyword_match.group("keyword").upper()
            instances[step_id] = _Instance(
                keyword, match.start(), match.end(), keyword_match.end() - 1
            )
            by_keyword.setdefault(keyword, []).append(step_id)
        pos = match.end()
    if not ended:
        problems.append(ReadProblem("step.no_endsec"))
    if not text.isascii():
        problems.append(ReadProblem("step.non_ascii_text"))
    return StepFile(text, header, instances, by_keyword, tuple(problems))


def read_bytes(raw: bytes) -> StepFile:
    """Read a STEP file from its bytes: UTF-8 when they decode as UTF-8, else ISO 8859-1."""
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("iso8859-1")
    return read_text(text)
