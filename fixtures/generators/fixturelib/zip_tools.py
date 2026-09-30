"""Deterministic ZIP containers (XLSX): stored entries, a fixed date and fixed attributes.

Entries are stored, not deflated, because deflate output can differ between zlib builds (macOS,
Debian, zlib-ng), and the fixture-manifest check compares the bytes a generator writes on any
machine with the SHA-256 in fixtures/manifest.json. Every entry gets the same date_time (prompt 3
section 8: "zip entries rewritten with a fixed date_time"), the same create_system and the same
permissions, in the order the source archive lists them.
"""

from __future__ import annotations

import io
import zipfile
from collections.abc import Callable

FIXED_DATE_TIME = (2026, 1, 15, 9, 0, 0)


def repack(source: bytes, transform: Callable[[str, bytes], bytes] | None = None) -> bytes:
    """Rewrites a ZIP with stored entries, a fixed date_time and fixed attributes."""
    out = io.BytesIO()
    with (
        zipfile.ZipFile(io.BytesIO(source)) as src,
        zipfile.ZipFile(out, "w", zipfile.ZIP_STORED) as dst,
    ):
        for info in src.infolist():
            data = src.read(info.filename)
            if transform is not None:
                data = transform(info.filename, data)
            entry = zipfile.ZipInfo(info.filename, date_time=FIXED_DATE_TIME)
            entry.compress_type = zipfile.ZIP_STORED
            entry.create_system = 0
            entry.external_attr = 0o600 << 16
            dst.writestr(entry, data)
    return out.getvalue()
