"""The contract's invariants on the Python side: one function per ``x-invariants`` id.

The TypeScript side implements the same ids in packages/extraction-contract/src/invariants.ts;
each side's tests fail when an id of the schema has no implementation, and the shared corpus
(packages/extraction-contract/src/samples/corpus.json) holds both to the same verdicts. Each
function takes a JSON value that passed its def's structural check and returns the relative
paths of what it refuses, never the values (guardrails rule 13). Where each rule comes from is
written once, in invariants.ts.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping
from typing import Any

from ._validate import RelativePath, definitions

type Check = Callable[[Any], list[RelativePath]]

SECTIONS = ("pdf", "xlsx", "ifcModel", "ifcValues")

MEDIA_TYPES: Mapping[str, tuple[str, ...]] = {
    "fragments": ("application/octet-stream",),
    "glb": ("model/gltf-binary",),
    "svg_plan": ("image/svg+xml",),
    "thumbnail": ("image/png", "image/webp"),
    "page_image": ("image/png", "image/webp"),
}

FINDING_LOCATOR_KINDS: Mapping[str, tuple[str, ...]] = {
    "embedded_instruction": ("pdf", "xlsx", "ifc", "file"),
    "hidden_text": ("pdf", "xlsx"),
    "schema_error": ("ifc", "file"),
    "hidden_content": ("ifc",),
}


def format_rule(file_format: str) -> Mapping[str, Any]:
    """The x-format-rules entry of a format."""
    return definitions()["ExtractionOutput"]["x-format-rules"][file_format]


def mechanism_rule(mechanism: str) -> Mapping[str, Any]:
    """The x-mechanism-rules entry of a mechanism: the gates it waits for at least."""
    return definitions()["IfcProposalMechanism"]["x-mechanism-rules"][mechanism]


def duplicates(values: Iterable[object]) -> list[int]:
    """The index of each value seen before."""
    seen: set[object] = set()
    repeated: list[int] = []
    for index, value in enumerate(values):
        if value in seen:
            repeated.append(index)
        seen.add(value)
    return repeated


def box_ordered(box: list[float]) -> list[RelativePath]:
    left, bottom, right, top = box
    return [()] if left > right or bottom > top else []


def read_below_total(status: Mapping[str, Any]) -> list[RelativePath]:
    return [] if status["read"] < status["total"] else [("read",)]


def request_consistent(request: Mapping[str, Any]) -> list[RelativePath]:
    problems: list[RelativePath] = []
    if request["ifcValues"] and request["declaredFormat"] != "ifc":
        problems.append(("ifcValues",))
    if not request["ifcValues"] and request["datasets"]:
        problems.append(("datasets",))
    if "ids" in request and request["declaredFormat"] != "ifc":
        problems.append(("ids",))
    allowed = format_rule(request["declaredFormat"])["derivatives"]
    problems.extend(
        ("derivatives", index)
        for index, kind in enumerate(request["derivatives"])
        if kind not in allowed
    )
    return problems


def format_sections(output: Mapping[str, Any]) -> list[RelativePath]:
    problems: list[RelativePath] = []
    file_format = output["format"]
    rule = format_rule(file_format)
    status = output["analysis"]["status"]
    coverage = output["coverage"]
    for section in SECTIONS:
        if section not in output:
            continue
        not_for_format = section not in rule["sections"]
        nothing_extracted = status in ("stored_only", "failed") and section in ("pdf", "xlsx")
        failed_model = status == "failed" and section == "ifcValues"
        if not_for_format or nothing_extracted or failed_model:
            problems.append((section,))
    if "ifcValues" in output and "ifcModel" not in output:
        problems.append(("ifcValues",))
    for key, owner in (("pages", "pdf"), ("sheets", "xlsx"), ("ifc", "ifc")):
        if key in coverage and file_format != owner:
            problems.append(("coverage", key))
    read = status in ("analysed", "partly_analysed")
    if read and file_format == "pdf":
        if "pdf" not in output:
            problems.append(("pdf",))
        if "pages" not in coverage:
            problems.append(("coverage", "pages"))
    if read and file_format == "xlsx":
        if "xlsx" not in output:
            problems.append(("xlsx",))
        if "sheets" not in coverage:
            problems.append(("coverage", "sheets"))
    if status == "stored_only" and file_format == "pdf" and "pages" not in coverage:
        problems.append(("coverage", "pages"))
    return problems


def status_matches_format(output: Mapping[str, Any]) -> list[RelativePath]:
    rule = format_rule(output["format"])
    analysis = output["analysis"]
    if analysis["status"] not in rule["statuses"]:
        return [("analysis", "status")]
    if analysis["status"] == "stored_only" and analysis["formatWord"] != rule.get("storedOnlyWord"):
        return [("analysis", "formatWord")]
    if analysis["status"] == "partly_analysed" and analysis["unit"] != rule.get(
        "partlyAnalysedUnit"
    ):
        return [("analysis", "unit")]
    return []


def page_coverage(output: Mapping[str, Any]) -> list[RelativePath]:
    coverage = output["coverage"].get("pages")
    if coverage is None:
        return []
    problems: list[RelativePath] = []
    total = coverage["total"]
    seen: set[int] = set()
    read_pages: set[int] = set()

    def collect(name: str, ranges: list[Mapping[str, Any]], into: set[int]) -> None:
        for index, page_range in enumerate(ranges):
            first, last = page_range["first"], page_range["last"]
            if first > last or last > total:
                problems.append(("coverage", "pages", name, index))
                continue
            for page in range(first, last + 1):
                if page in seen:
                    problems.append(("coverage", "pages", name, index))
                    break
                seen.add(page)
                into.add(page)

    collect("read", coverage["read"], read_pages)
    collect("unread", coverage["unread"], set())
    if len(seen) != total:
        problems.append(("coverage", "pages"))
    analysis = output["analysis"]
    if analysis["status"] == "analysed" and coverage["unread"]:
        problems.append(("coverage", "pages", "unread"))
    if analysis["status"] == "partly_analysed" and (
        analysis["read"] != len(read_pages) or analysis["total"] != total
    ):
        problems.append(("analysis",))
    if analysis["status"] == "stored_only":
        if read_pages:
            problems.append(("coverage", "pages", "read"))
        problems.extend(
            ("coverage", "pages", "unread", index, "reason")
            for index, page_range in enumerate(coverage["unread"])
            if page_range["reason"] != "no_text_layer"
        )
    if "pdf" in output:
        listed: set[int] = set()
        for index, page in enumerate(output["pdf"]["pages"]):
            if page["page"] in listed or page["page"] not in read_pages:
                problems.append(("pdf", "pages", index))
            listed.add(page["page"])
        if any(page not in listed for page in read_pages):
            problems.append(("pdf", "pages"))
    return problems


def text_blocks(output: Mapping[str, Any]) -> list[RelativePath]:
    if "pdf" not in output:
        return []
    problems: list[RelativePath] = []
    anchors: set[str] = set()
    for page_index, page in enumerate(output["pdf"]["pages"]):
        for block_index, block in enumerate(page["blocks"]):
            here = ("pdf", "pages", page_index, "blocks", block_index)
            if block["anchorId"] in anchors:
                problems.append((*here, "anchorId"))
            anchors.add(block["anchorId"])
            length = len(block["text"])
            previous_end = None
            for box_index, char_box in enumerate(block["charBoxes"]):
                start, end = char_box["start"], char_box["end"]
                overlaps = previous_end is not None and start < previous_end
                if start >= end or end > length or overlaps:
                    problems.append((*here, "charBoxes", box_index))
                previous_end = end
    return problems


def sheet_coverage(output: Mapping[str, Any]) -> list[RelativePath]:
    problems: list[RelativePath] = []
    coverage = output["coverage"].get("sheets")
    sheets = output["xlsx"]["sheets"] if "xlsx" in output else None
    if coverage is not None:
        problems.extend(
            ("coverage", "sheets", index)
            for index in duplicates(entry["sheet"] for entry in coverage)
        )
        problems.extend(
            ("coverage", "sheets", index, "reason")
            for index, entry in enumerate(coverage)
            if (entry["status"] == "not_read") != ("reason" in entry)
        )
    if sheets is not None:
        problems.extend(
            ("xlsx", "sheets", index) for index in duplicates(sheet["name"] for sheet in sheets)
        )
        for sheet_index, sheet in enumerate(sheets):
            problems.extend(
                ("xlsx", "sheets", sheet_index, "cells", cell_index)
                for cell_index in duplicates(cell["ref"] for cell in sheet["cells"])
            )
    if coverage is not None and sheets is not None:
        status = {entry["sheet"]: entry["status"] for entry in coverage}
        names = {sheet["name"] for sheet in sheets}
        for index, sheet in enumerate(sheets):
            read = status.get(sheet["name"])
            if read is None:
                problems.append(("xlsx", "sheets", index))
            elif read == "not_read" and sheet["cells"]:
                problems.append(("xlsx", "sheets", index, "cells"))
        problems.extend(
            ("coverage", "sheets", index)
            for index, entry in enumerate(coverage)
            if entry["status"] == "read" and entry["sheet"] not in names
        )
    if coverage is not None and output["format"] == "xlsx":
        read = len([entry for entry in coverage if entry["status"] == "read"])
        analysis = output["analysis"]
        if analysis["status"] == "analysed" and read != len(coverage):
            problems.append(("coverage", "sheets"))
        if analysis["status"] == "partly_analysed" and (
            analysis["read"] != read or analysis["total"] != len(coverage)
        ):
            problems.append(("analysis",))
        if analysis["status"] == "failed" and read > 0:
            problems.append(("coverage", "sheets"))
    return problems


def hidden_reported(output: Mapping[str, Any]) -> list[RelativePath]:
    problems: list[RelativePath] = []
    hidden = [
        finding["locator"] for finding in output["findings"] if finding["kind"] == "hidden_text"
    ]
    if "pdf" in output:
        for page_index, page in enumerate(output["pdf"]["pages"]):
            for block_index, block in enumerate(page["blocks"]):
                if not block["hidden"]:
                    continue
                reported = any(
                    locator["kind"] == "pdf"
                    and locator["page"] == page["page"]
                    and locator.get("anchorId") == block["anchorId"]
                    for locator in hidden
                )
                if not reported:
                    problems.append(("pdf", "pages", page_index, "blocks", block_index, "hidden"))
    if "xlsx" in output:
        for sheet_index, sheet in enumerate(output["xlsx"]["sheets"]):
            for cell_index, cell in enumerate(sheet["cells"]):
                here = ("xlsx", "sheets", sheet_index, "cells", cell_index, "hidden")
                hidden_sheet = "hidden_sheet" in cell["hidden"]
                very_hidden_sheet = "very_hidden_sheet" in cell["hidden"]
                if hidden_sheet != (sheet["visibility"] == "hidden") or very_hidden_sheet != (
                    sheet["visibility"] == "very_hidden"
                ):
                    problems.append(here)
                    continue
                if not cell["hidden"]:
                    continue
                reported = any(
                    locator["kind"] == "xlsx"
                    and locator["sheet"] == sheet["name"]
                    and locator.get("cell") in (None, cell["ref"])
                    for locator in hidden
                )
                if not reported:
                    problems.append(here)
    return problems


def finding_locators(output: Mapping[str, Any]) -> list[RelativePath]:
    problems: list[RelativePath] = []
    allowed = format_rule(output["format"])["findingLocators"]
    total = output["coverage"].get("pages", {}).get("total")
    pdf_pages = output["pdf"]["pages"] if "pdf" in output else []
    sheets = output["xlsx"]["sheets"] if "xlsx" in output else []
    for index, finding in enumerate(output["findings"]):
        locator = finding["locator"]
        if locator["kind"] not in allowed:
            problems.append(("findings", index, "locator"))
            continue
        if locator["kind"] not in FINDING_LOCATOR_KINDS[finding["kind"]]:
            problems.append(("findings", index, "kind"))
            continue
        if locator["kind"] == "pdf":
            if total is not None and locator["page"] > total:
                problems.append(("findings", index, "locator", "page"))
            anchor = locator.get("anchorId")
            if anchor is not None:
                holder = next(
                    (
                        page["page"]
                        for page in pdf_pages
                        if any(block["anchorId"] == anchor for block in page["blocks"])
                    ),
                    None,
                )
                if holder != locator["page"]:
                    problems.append(("findings", index, "locator", "anchorId"))
        if locator["kind"] == "xlsx":
            sheet = next((sheet for sheet in sheets if sheet["name"] == locator["sheet"]), None)
            if sheet is None:
                problems.append(("findings", index, "locator", "sheet"))
            elif "cell" in locator and not any(
                cell["ref"] == locator["cell"] for cell in sheet["cells"]
            ):
                problems.append(("findings", index, "locator", "cell"))
    return problems


def ifc_model_record(output: Mapping[str, Any]) -> list[RelativePath]:
    model = output.get("ifcModel")
    if model is None:
        return []
    problems: list[RelativePath] = []
    schema_errors = any(finding["kind"] == "schema_error" for finding in output["findings"])
    if (model["schemaCheck"]["outcome"] == "problems") != schema_errors:
        problems.append(("ifcModel", "schemaCheck", "outcome"))
    if "ids" in model:
        specifications = model["ids"]["specifications"]
        problems.extend(
            ("ifcModel", "ids", "specifications", index, "specId")
            for index in duplicates(spec["specId"] for spec in specifications)
        )
        problems.extend(
            ("ifcModel", "ids", "specifications", index, "failingGlobalIds")
            for index, spec in enumerate(specifications)
            if spec["outcome"] != "fail" and spec["failingGlobalIds"]
        )
    classes_read = output["coverage"].get("ifc", {}).get("classesRead", [])
    problems.extend(
        ("coverage", "ifc", "classesRead", index)
        for index, ifc_class in enumerate(classes_read)
        if ifc_class not in model["classesPresent"]
    )
    return problems


def ifc_value_locators(output: Mapping[str, Any]) -> list[RelativePath]:
    values = output.get("ifcValues")
    if values is None:
        return []
    problems: list[RelativePath] = [
        ("ifcValues", "facts", index, "id")
        for index in duplicates(fact["id"] for fact in values["facts"])
    ]
    schema = output["ifcModel"]["header"]["schema"] if "ifcModel" in output else None
    for index, fact in enumerate(values["facts"]):
        locator = fact["locator"]
        if locator["contentHash"] != output["job"]["contentHash"]:
            problems.append(("ifcValues", "facts", index, "locator", "contentHash"))
        if locator["schema"] != schema:
            problems.append(("ifcValues", "facts", index, "locator", "schema"))
    return problems


def ifc_proposals(output: Mapping[str, Any]) -> list[RelativePath]:
    values = output.get("ifcValues")
    if values is None:
        return []
    fact_ids = {fact["id"] for fact in values["facts"]}
    proposals = values["candidateProposals"]
    problems: list[RelativePath] = [
        ("ifcValues", "candidateProposals", index, "id")
        for index in duplicates(proposal["id"] for proposal in proposals)
    ]
    for index, proposal in enumerate(proposals):
        here = ("ifcValues", "candidateProposals", index)
        problems.extend(
            (*here, "evidenceFactIds", fact_index)
            for fact_index, fact_id in enumerate(proposal["evidenceFactIds"])
            if fact_id not in fact_ids
        )
        value = proposal["value"]
        if value["kind"] == "fact" and value["factId"] not in proposal["evidenceFactIds"]:
            problems.append((*here, "value"))
        if (proposal["sourceClaim"] == "calculated") != (proposal["mechanism"] == "geometry"):
            problems.append((*here, "sourceClaim"))
        if (proposal["sourceClaim"] == "ai_inference") != ("confidence" in proposal):
            problems.append((*here, "confidence"))
        rule = mechanism_rule(proposal["mechanism"])
        if any(gate not in proposal["requiresGates"] for gate in rule["gates"]):
            problems.append((*here, "requiresGates"))
        if rule["needsDataset"] and not proposal["datasets"]:
            problems.append((*here, "datasets"))
    return problems


def derivatives_keyed(output: Mapping[str, Any]) -> list[RelativePath]:
    project_id = output["job"]["projectId"]
    content_hash = output["job"]["contentHash"]
    prefix = f"{project_id}/{content_hash}/derived/"
    allowed = format_rule(output["format"])["derivatives"]
    total = output["coverage"].get("pages", {}).get("total")
    derivatives = output["derivatives"]
    problems: list[RelativePath] = [
        ("derivatives", index, "relativePath")
        for index in duplicates(derivative["relativePath"] for derivative in derivatives)
    ]
    for index, derivative in enumerate(derivatives):
        here = ("derivatives", index)
        kind = derivative["kind"]
        if derivative["projectId"] != project_id:
            problems.append((*here, "projectId"))
        if derivative["contentHash"] != content_hash:
            problems.append((*here, "contentHash"))
        if not derivative["relativePath"].startswith(prefix):
            problems.append((*here, "relativePath"))
        if kind not in allowed:
            problems.append((*here, "kind"))
        if derivative["mediaType"] not in MEDIA_TYPES[kind]:
            problems.append((*here, "mediaType"))
        if (kind == "svg_plan") != ("storeyGlobalId" in derivative):
            problems.append((*here, "storeyGlobalId"))
        if (kind == "page_image") != ("page" in derivative):
            problems.append((*here, "page"))
        if "page" in derivative and total is not None and derivative["page"] > total:
            problems.append((*here, "page"))
    return problems


INVARIANTS: Mapping[str, Check] = {
    "box_ordered": box_ordered,
    "read_below_total": read_below_total,
    "request_consistent": request_consistent,
    "format_sections": format_sections,
    "status_matches_format": status_matches_format,
    "page_coverage": page_coverage,
    "text_blocks": text_blocks,
    "sheet_coverage": sheet_coverage,
    "hidden_reported": hidden_reported,
    "finding_locators": finding_locators,
    "ifc_model_record": ifc_model_record,
    "ifc_value_locators": ifc_value_locators,
    "ifc_proposals": ifc_proposals,
    "derivatives_keyed": derivatives_keyed,
}
