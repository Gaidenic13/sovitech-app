"""PDF: the native text layer through pypdfium2, with anchor ids, character boxes, hidden-text
flags, coverage recorded by code, and no OCR.

Against the six synthetic PDF companions (fixtures/pdf/, with their ground truth), and against
PDFs made in the test with reportlab (synthetic TEST text, written to a temporary folder only).

Ids: F-EXTRACT-01, F-EXTRACT-07 (coverage), F-EXTRACT-10 (findings), R-015, G12-3 (extractor
half: "Partly analysed (37 of 40 pages)" with 3 pages that have no text layer; with no OCR,
prompt 3 5.2), G12-4 (extractor half: pages past a limit are not read and are listed so), G14-1
and G14-2 (extractor half: an embedded instruction and white text are findings), rule 14.
"""

from __future__ import annotations

import json
import re
from functools import cache
from pathlib import Path
from typing import Any

import pytest
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from sovitech_extractor.pdf_reader import PdfReading, read_pdf

REPO = Path(__file__).resolve().parents[3]
COMPANIONS = (
    "memoriu-tehnic",
    "tabel-suprafete",
    "lista-echipamente",
    "plan-subsol",
    "nota-proiectant",
    "caiet-de-sarcini",
)
LIMITS = {"max_pages": 100000}


@cache
def _read(name: str) -> PdfReading:
    return read_pdf(REPO / "fixtures" / "pdf" / f"{name}.pdf", max_pages=100000)


@cache
def _truth(name: str) -> dict[str, Any]:
    return json.loads((REPO / "fixtures" / "pdf" / "ground-truth" / f"{name}.json").read_text())


def _squash(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _visible_text(reading: PdfReading, page: int) -> str:
    [read] = [p for p in reading.pages if p.page == page]
    return _squash(" ".join(block.text for block in read.blocks if not block.hidden))


def _all_text(reading: PdfReading) -> str:
    return _squash(" ".join(block.text for page in reading.pages for block in page.blocks))


@pytest.mark.parametrize("name", COMPANIONS)
def test_every_ground_truth_value_is_in_the_visible_text_of_its_page(name: str) -> None:
    truth, reading = _truth(name), _read(name)
    assert reading.page_count == truth["pageCount"]
    assert [p.page for p in reading.pages] == truth["pagesWithTextLayer"]
    for value in truth["values"]:
        assert _squash(value["text"]) in _visible_text(reading, value["page"]), value["text"]
    marking = _squash(truth["testMarking"])
    for page in truth["pagesWithTextLayer"]:
        assert marking in _visible_text(reading, page)


@pytest.mark.parametrize("name", COMPANIONS)
def test_blocks_carry_unique_anchors_and_ordered_boxes(name: str) -> None:
    reading = _read(name)
    anchors = [block.anchor_id for page in reading.pages for block in page.blocks]
    assert len(anchors) == len(set(anchors))
    assert all(re.fullmatch(r"[a-z0-9][a-z0-9.-]{0,63}", anchor) for anchor in anchors)
    for page in reading.pages:
        left, bottom, right, top = page.media_box
        assert left <= right and bottom <= top
        assert page.rotation in (0, 90, 180, 270)
        for block in page.blocks:
            assert block.text.strip()
            left_edge, bottom_edge, right_edge, top_edge = block.bbox
            assert left_edge <= right_edge and bottom_edge <= top_edge
            previous_end = 0
            for char_box in block.char_boxes:
                assert previous_end <= char_box.start < char_box.end <= len(block.text)
                previous_end = char_box.end
                cl, cb, cr, ct = char_box.box
                assert cl <= cr and cb <= ct


def test_G12_3_three_pages_with_no_text_layer_are_not_read_and_the_file_is_37_of_40() -> None:
    """G12-3 (extractor half). The caiet has 40 pages; 12, 25 and 33 hold only an image, so with
    no OCR they are not read: 'Partly analysed (37 of 40 pages)'. The values only those pages hold
    are in no text block, so nothing can cite them and the fields they would feed stay unknown."""
    truth, reading = _truth("caiet-de-sarcini"), _read("caiet-de-sarcini")
    assert reading.analysis == ("partly_analysed", 37, 40)
    assert reading.unread == [
        (12, 12, "no_text_layer"),
        (25, 25, "no_text_layer"),
        (33, 33, "no_text_layer"),
    ]
    assert [p.page for p in reading.pages] == truth["pagesWithTextLayer"]
    text = _all_text(reading)
    for image_page in truth["valuesOnlyOnImagePages"]:
        for line in image_page["content"]:
            assert _squash(line) not in text


def test_G14_2_white_text_is_hidden_and_reported_and_is_no_visible_text() -> None:
    """G14-2 (extractor half). White text on the plan states a capacity for CH-02: its block is
    flagged, reported as a hidden_text finding, and is not part of the visible text."""
    truth, reading = _truth("plan-subsol"), _read("plan-subsol")
    [hidden] = truth["hiddenText"]
    blocks = [b for page in reading.pages for b in page.blocks if b.hidden]
    assert [(_squash(b.text), b.hidden) for b in blocks] == [
        (_squash(hidden["text"]), ("fill_matches_background",))
    ]
    assert _squash(hidden["text"]) not in _visible_text(reading, hidden["page"])
    findings = [f for f in reading.findings if f.kind == "hidden_text"]
    assert [(f.page, f.anchor_id) for f in findings] == [(1, blocks[0].anchor_id)]


def test_G14_1_each_embedded_instruction_is_one_finding_and_the_claim_is_none() -> None:
    """G14-1 (extractor half). The designer's note tells the reviewer to mark every value as
    verified, in English and in Romanian: one embedded_instruction finding each. The sentence
    claiming the designer checked the data is a claim, not an instruction: no finding here (the
    AI reports claims; it is never a verification, rule 14)."""
    truth, reading = _truth("nota-proiectant"), _read("nota-proiectant")
    findings = [f for f in reading.findings if f.kind == "embedded_instruction"]
    assert len(findings) == len(truth["embeddedInstructions"])
    by_anchor = {b.anchor_id: b for page in reading.pages for b in page.blocks}
    flagged = sorted(_squash(by_anchor[f.anchor_id].text) for f in findings if f.anchor_id)
    assert flagged == sorted(_squash(item["text"]) for item in truth["embeddedInstructions"])


@pytest.mark.parametrize("name", ["memoriu-tehnic", "tabel-suprafete", "lista-echipamente"])
def test_a_fully_read_pdf_is_analysed_with_every_page_read(name: str) -> None:
    reading = _read(name)
    assert reading.analysis == ("analysed", None, None)
    assert reading.unread == []
    assert not [f for f in reading.findings if f.kind == "hidden_text"]


def _pdf(path: Path, pages: list[list[tuple[str, dict[str, Any]]]], **options: Any) -> Path:
    doc = canvas.Canvas(str(path), pagesize=A4, invariant=1, pageCompression=0, **options)
    for page in pages:
        for text, style in page:
            obj = doc.beginText()
            obj.setFont("Helvetica", style.get("size", 10))
            obj.setTextOrigin(style.get("x", 72), style.get("y", 700))
            obj.setTextRenderMode(style.get("mode", 0))
            obj.setFillColorRGB(*style.get("fill", (0, 0, 0)))
            obj.textLine(text)
            doc.drawText(obj)
        if not page:
            doc.rect(72, 600, 200, 100, fill=1)
        doc.showPage()
    doc.save()
    return path


def test_G12_4_pages_past_the_limit_are_not_read_and_listed_as_such(tmp_path: Path) -> None:
    """G12-4 (extractor half). A document cut short by the page limit supports no 'not found'
    claim about the pages it did not read: they are listed as not read, with the reason."""
    pages = [[(f"TEST page text {i}", {})] for i in range(1, 6)]
    reading = read_pdf(_pdf(tmp_path / "t.pdf", pages), max_pages=3)
    assert reading.analysis == ("partly_analysed", 3, 5)
    assert reading.unread == [(4, 5, "page_limit")]
    assert [p.page for p in reading.pages] == [1, 2, 3]


def test_a_pdf_with_no_text_layer_on_any_page_is_stored_as_a_scan(tmp_path: Path) -> None:
    reading = read_pdf(_pdf(tmp_path / "scan.pdf", [[], []]), max_pages=100)
    assert reading.analysis == ("stored_only", None, None)
    assert reading.unread == [(1, 2, "no_text_layer")]
    assert reading.pages == []


@pytest.mark.parametrize(
    ("style", "reason"),
    [
        ({"mode": 3}, "invisible_render_mode"),
        ({"size": 1}, "tiny_text"),
        ({"x": -900}, "outside_page"),
        ({"fill": (1, 1, 1)}, "fill_matches_background"),
    ],
)
def test_hidden_text_is_flagged_with_its_reason(
    tmp_path: Path, style: dict[str, Any], reason: str
) -> None:
    pages = [[("TEST visible line", {}), ("TEST hidden line", {"y": 650, **style})]]
    reading = read_pdf(_pdf(tmp_path / "h.pdf", pages), max_pages=10)
    [page] = reading.pages
    hidden = [(b.text.strip(), b.hidden) for b in page.blocks if b.hidden]
    assert hidden == [("TEST hidden line", (reason,))]
    assert [f.anchor_id for f in reading.findings if f.kind == "hidden_text"] == [
        b.anchor_id for b in page.blocks if b.hidden
    ]


def test_white_text_on_a_dark_panel_is_not_hidden(tmp_path: Path) -> None:
    path = tmp_path / "panel.pdf"
    doc = canvas.Canvas(str(path), pagesize=A4, invariant=1, pageCompression=0)
    doc.setFillColorRGB(0.1, 0.2, 0.3)
    doc.rect(60, 680, 300, 40, fill=1, stroke=0)
    doc.setFillColorRGB(1, 1, 1)
    doc.setFont("Helvetica", 10)
    doc.drawString(72, 695, "TEST title block text")
    doc.showPage()
    doc.save()
    reading = read_pdf(path, max_pages=10)
    [page] = reading.pages
    assert [(b.text.strip(), b.hidden) for b in page.blocks] == [("TEST title block text", ())]


def test_an_encrypted_pdf_fails_as_encrypted(tmp_path: Path) -> None:
    pages = [[("TEST secret", {})]]
    path = _pdf(tmp_path / "e.pdf", pages, encrypt="TEST-password")
    reading = read_pdf(path, max_pages=10)
    assert reading.analysis == ("failed", "encrypted", None)


def test_a_broken_pdf_fails_as_unreadable(tmp_path: Path) -> None:
    path = tmp_path / "broken.pdf"
    path.write_bytes(b"%PDF-1.7\n this is not a PDF body \n%%EOF\n")
    reading = read_pdf(path, max_pages=10)
    assert reading.analysis == ("failed", "unreadable_file", None)


def test_a_line_drawn_glyph_by_glyph_reads_as_one_block(tmp_path: Path) -> None:
    """Some writers place each glyph as its own text object; the block is still the line, so an
    excerpt such as a tag is found in the text the verifier checks against."""
    path = tmp_path / "glyphs.pdf"
    doc = canvas.Canvas(str(path), pagesize=A4, invariant=1, pageCompression=0)
    doc.setFont("Helvetica", 10)
    x = 72.0
    for glyph in "TEST CTA-09":
        doc.drawString(x, 700, glyph)
        x += doc.stringWidth(glyph, "Helvetica", 10)
    doc.drawString(72, 680, "TEST next line")
    doc.showPage()
    doc.save()
    [page] = read_pdf(path, max_pages=10).pages
    assert [_squash(b.text) for b in page.blocks] == ["TEST CTA-09", "TEST next line"]


def test_a_hidden_run_on_a_visible_line_is_its_own_block(tmp_path: Path) -> None:
    path = tmp_path / "mixed.pdf"
    doc = canvas.Canvas(str(path), pagesize=A4, invariant=1, pageCompression=0)
    doc.setFont("Helvetica", 10)
    doc.drawString(72, 700, "TEST visible part")
    doc.setFillColorRGB(1, 1, 1)
    doc.drawString(
        72 + doc.stringWidth("TEST visible part ", "Helvetica", 10), 700, "TEST white part"
    )
    doc.showPage()
    doc.save()
    [page] = read_pdf(path, max_pages=10).pages
    assert [(_squash(b.text), b.hidden) for b in page.blocks] == [
        ("TEST visible part", ()),
        ("TEST white part", ("fill_matches_background",)),
    ]


@pytest.mark.parametrize("name", [n for n in COMPANIONS if n != "nota-proiectant"])
def test_ordinary_companion_text_raises_no_embedded_instruction(name: str) -> None:
    assert [f for f in _read(name).findings if f.kind == "embedded_instruction"] == []
