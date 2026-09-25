"""SOVITECH extractor.

Reads documents and IFC models inside a sandbox and emits JSON facts with
locators, coverage and findings. It never parses numbers out of text, never
maps PDF or XLSX content to fields and never writes the database
(prompt 3 section 6). Phase 2 builds it.
"""

__all__ = ["__version__"]

__version__ = "0.0.0"
