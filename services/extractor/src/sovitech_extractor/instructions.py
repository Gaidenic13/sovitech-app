"""Detecting text that addresses the reader: an embedded instruction (guardrails rule 14).

The detector reads document text as data. When a text tries to instruct the AI or the app (to
ignore its instructions, to mark values as verified or confirmed, to issue a quotation, or when
it speaks to the AI as its reader), the extractor reports one ``embedded_instruction`` finding
for the engineer, with a code and a location, never the text (guardrails rule 13). A finding
creates no candidate, badge, verification or field state.

Matching is on a normalised form: case folded, diacritics removed (ș and ş, ț and ţ alike),
whitespace collapsed. English and Romanian.
"""

from __future__ import annotations

import re
import unicodedata

__all__ = ["detect", "normalise"]

_TARGETS_EN = r"(?:instructions?|prompts?|rules|guidelines|directions|guardrails)"
_TARGETS_RO = r"(?:instructiunile|instructiuni|regulile|reguli|indicatiile|indicatii)"
_STATE_EN = r"(?:verified|confirmed|approved|validated|checked|certified)"
_STATE_RO = (
    r"(?:verificate|verificata|verificat|confirmate|confirmata|aprobate|validate|certificate)"
)

# One code per kind of instruction. The first pattern that matches names the finding; a text
# gives at most one finding (G14-3: one embedded_instruction finding).
_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "embedded_instruction.override",
        re.compile(
            r"\b(?:ignore|disregard|forget|override|bypass)\b[^.;:]{0,40}?"
            r"\b(?:previous|prior|above|earlier|preceding|all|any|your|the|these|those)\b"
            rf"[^.;:]{{0,20}}?\b{_TARGETS_EN}\b"
        ),
    ),
    (
        "embedded_instruction.override",
        re.compile(
            r"\b(?:ignora|ignorati|ignorat|ignora-ti|nu tineti cont de|neglijati|uitati)\b"
            rf"[^.;:]{{0,40}}?\b{_TARGETS_RO}\b"
        ),
    ),
    (
        "embedded_instruction.set_state",
        re.compile(
            r"\b(?:mark|set|flag|treat|record|label|consider|tag)\b[^.;:]{0,40}?"
            r"\b(?:values?|items?|fields?|data|everything|entries|results|figures)\b"
            rf"[^.;:]{{0,40}}?\b{_STATE_EN}\b"
        ),
    ),
    (
        "embedded_instruction.set_state",
        re.compile(
            r"\b(?:marcati|marcheaza|setati|considerati|tratati|inregistrati|bifati)\b"
            r"[^.;:]{0,40}?\b(?:valorile|valori|datele|date|toate|elementele|rezultatele)\b"
            rf"[^.;:]{{0,40}}?\b{_STATE_RO}\b"
        ),
    ),
    (
        "embedded_instruction.set_stage",
        re.compile(
            r"\b(?:issue|generate|produce|create|send|make)\b[^.;:]{0,30}?"
            r"\b(?:formal quotation|quotation|firm price|binding offer|final offer)\b"
        ),
    ),
    (
        "embedded_instruction.set_stage",
        re.compile(
            r"\b(?:emiteti|generati|trimiteti|faceti|intocmiti)\b[^.;:]{0,30}?"
            r"\b(?:oferta ferma|oferta finala|cotatie|cotatia|deviz)\b"
        ),
    ),
    (
        "embedded_instruction.addresses_reader",
        re.compile(
            r"\b(?:you are|act as|behave as|pretend to be)\b[^.;:]{0,12}?"
            r"\b(?:an?|the)\b[^.;:]{0,12}?\b(?:ai|assistant|language model|model|chatbot)\b"
        ),
    ),
    (
        "embedded_instruction.addresses_reader",
        re.compile(
            r"\b(?:note|message|instruction|instructions|request)s? (?:for|to) the "
            r"(?:automated (?:reviewer|system|assistant)|ai|artificial intelligence|assistant|"
            r"language model|chatbot)\b"
        ),
    ),
    (
        "embedded_instruction.addresses_reader",
        re.compile(r"\b(?:system prompt|developer message|as an ai|as a language model)\b"),
    ),
)

_SPACES = re.compile(r"\s+")


def normalise(text: str) -> str:
    """Case folded, diacritics removed, whitespace collapsed: for matching only."""
    decomposed = unicodedata.normalize("NFKD", text)
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return _SPACES.sub(" ", stripped.casefold()).strip()


def detect(text: str) -> str | None:
    """The finding code when the text addresses the reader, else None."""
    if not text:
        return None
    normalised = normalise(text)
    for code, pattern in _PATTERNS:
        if pattern.search(normalised):
            return code
    return None
