"""Print the text PDFs show, for the mockup and company figure checks.

Usage: python -I -B pdf_text.py <pdf> [<pdf> ...]

Prints one JSON list with one object per argument, in order: the path, the text
of each page, the document information dictionary (Title, Author, Subject,
Keywords, Creator, Producer, dates) and the outline titles; or the path and an
error. Before a page's text is read, its annotations and form fields are
flattened into the page (in memory only), so their visible text is read too.

It reads with pypdfium2, the PDF library the extractor uses, from the
extractor's environment, and imports nothing else. It writes no file: the
flattened pages are never saved.

Why (phase 2 review, adversarial finding 16): the figure checks skipped binary
files and read a PDF only as raw bytes, so a figure inside a compressed content
stream, in a hex string or split across a kerned text array was never seen.
Text drawn as curves or images is not text, and is not read here either.
"""

import json
import sys

import pypdfium2 as pdfium
import pypdfium2.raw as pdfium_raw


def page_text(pdf: pdfium.PdfDocument, index: int) -> str:
    page = pdf[index]
    try:
        # Annotation and form-field appearances become page content (in memory).
        # A page with nothing to flatten, or that cannot be flattened, is read as it is.
        pdfium_raw.FPDFPage_Flatten(page, pdfium_raw.FLAT_NORMALDISPLAY)
    finally:
        page.close()
    # A flattened page is read again, as PDFium requires.
    page = pdf[index]
    try:
        textpage = page.get_textpage()
        try:
            return textpage.get_text_range()
        finally:
            textpage.close()
    finally:
        page.close()


def read(path: str) -> dict[str, object]:
    try:
        pdf = pdfium.PdfDocument(path)
    except pdfium.PdfiumError as error:
        return {"path": path, "error": f"PDFium could not open it: {error}"}
    try:
        pages = [page_text(pdf, index) for index in range(len(pdf))]
        metadata = {
            key: value
            for key, value in pdf.get_metadata_dict(skip_empty=True).items()
            if isinstance(value, str)
        }
        outline = [bookmark.get_title() for bookmark in pdf.get_toc()]
    except pdfium.PdfiumError as error:
        return {"path": path, "error": f"PDFium could not read it: {error}"}
    finally:
        pdf.close()
    return {"path": path, "pages": pages, "metadata": metadata, "outline": outline}


def main(paths: list[str]) -> None:
    json.dump([read(path) for path in paths], sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1:])
