"""SOVITECH extractor.

Reads one stored document per job, inside the sandbox, and writes one extraction output (the
contract in ``sovitech_extractor.contract``): PDF text blocks and XLSX cells; the other formats
are stored "Not analysed". IFC models are the IFC reader's (packages/ifc-reader, on web-ifc: the
owner's decision of 2026-09-26; ADR 0031): a model sent here is refused as a job. It never parses
numbers out of text, never maps PDF or XLSX content to fields, and never writes the database
(prompt 3 section 6). Logs carry codes only (rule 13). See services/extractor/README.md and
docs/adr/0024-extractor-pipeline.md.
"""

__all__ = ["__version__"]

__version__ = "0.1.0"
