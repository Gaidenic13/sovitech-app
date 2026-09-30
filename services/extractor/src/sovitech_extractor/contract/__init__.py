"""The extraction contract: the JSON the extractor reads (a request) and writes (an output).

One source, packages/extraction-contract/src/extraction-contract.schema.json, from which the
API's zod schemas and this package's dataclasses (_generated.py) and schema copy (schema.json)
are generated. The API parses the same output strictly and keeps its IFC section sealed until
the ``ifc-values`` gate opens (packages/extraction-contract/README.md).

What the extractor must hold to:

- it emits raw strings: text blocks, cell values as stored, STEP tokens. It never reads a
  number out of text (prompt 3 section 6; tests/test_bans.py);
- no IFC locator outside ``ifc_values``: never in a page, sheet, cell or bbox (prompt 3
  section 8);
- findings and coverage hold codes, GlobalIds and STEP ids, never document text (rule 13);
- an IFC file is always ``stored_only`` with "IFC model" (G12-5); what the extractor could
  process in the model goes in ``ifc_model.processing`` for the engineer;
- every derivative lives under ``<projectId>/<contentHash>/derived/`` (G13-4);
- it writes an output only through ``dump_output``, which refuses what the API would refuse.
"""

from ._api import (
    ContractError,
    check,
    dump_output,
    dump_request,
    ifc_locator_keys,
    output_answers_request,
    parse_evidence_locator,
    parse_output,
    parse_request,
)
from ._generated import (
    CONTRACT_VERSION,
    ENTRY_POINTS,
    INVARIANT_IDS,
    AnalysedStatus,
    AnalysisFailedStatus,
    CharBox,
    Coverage,
    DatasetRef,
    DeclaredUnit,
    Derivative,
    ExtractionOutput,
    ExtractionRequest,
    Finding,
    IdsRef,
    IdsResults,
    IdsSpecResult,
    IfcCandidateProposal,
    IfcCoverage,
    IfcFact,
    IfcHeader,
    IfcLocator,
    IfcModelRecord,
    IfcValues,
    Job,
    Limits,
    PageCoverage,
    PageRange,
    PartlyAnalysedStatus,
    PdfContent,
    PdfEvidenceLocator,
    PdfPage,
    Producer,
    SchemaCheck,
    SheetCoverage,
    StoredOnlyStatus,
    TextBlock,
    ToolVersion,
    UnreadPageRange,
    XlsxCell,
    XlsxContent,
    XlsxEvidenceLocator,
    XlsxSheet,
)
from ._validate import Problem

__all__ = [
    "CONTRACT_VERSION",
    "ENTRY_POINTS",
    "INVARIANT_IDS",
    "AnalysedStatus",
    "AnalysisFailedStatus",
    "CharBox",
    "ContractError",
    "Coverage",
    "DatasetRef",
    "DeclaredUnit",
    "Derivative",
    "ExtractionOutput",
    "ExtractionRequest",
    "Finding",
    "IdsRef",
    "IdsResults",
    "IdsSpecResult",
    "IfcCandidateProposal",
    "IfcCoverage",
    "IfcFact",
    "IfcHeader",
    "IfcLocator",
    "IfcModelRecord",
    "IfcValues",
    "Job",
    "Limits",
    "PageCoverage",
    "PageRange",
    "PartlyAnalysedStatus",
    "PdfContent",
    "PdfEvidenceLocator",
    "PdfPage",
    "Problem",
    "Producer",
    "SchemaCheck",
    "SheetCoverage",
    "StoredOnlyStatus",
    "TextBlock",
    "ToolVersion",
    "UnreadPageRange",
    "XlsxCell",
    "XlsxContent",
    "XlsxEvidenceLocator",
    "XlsxSheet",
    "check",
    "dump_output",
    "dump_request",
    "ifc_locator_keys",
    "output_answers_request",
    "parse_evidence_locator",
    "parse_output",
    "parse_request",
]
