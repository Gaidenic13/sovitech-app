"""List the Python distributions installed in the given site-packages folders.

Usage: python -I -B python_dists.py <site-packages> [<site-packages> ...]

Prints one JSON list: name, version, License-Expression, License, the licence
trove classifiers, the absolute paths of the licence files the wheel installed
(from its RECORD), the native binaries the wheel installed, and the GPL
components found inside those binaries. It reads package metadata and file
bytes only; it imports nothing from the packages and writes nothing.

Why the binaries are read (phase 2, 2026-09-25): the IfcOpenShell 0.8.5 wheel
declares LGPL-3.0-or-later and ships no licence file at all, while its compiled
library bundles CGAL packages that CGAL publishes under the GPL. Reading licence
files alone passed it. A bundled component shows in a binary's symbol names, so
each native binary (and each native binary inside an archive the wheel ships)
is searched for the markers in gpl-components.json.
"""

import json
import re
import sys
import zipfile
from importlib import metadata
from pathlib import Path

LICENCE_FILE = re.compile(
    r"^(licen[cs]e|copying|notice|copyright|unlicense)", re.IGNORECASE
)

# Native code a wheel can install: shared libraries, extension modules and
# WebAssembly. Archives are opened one level deep and their native members read.
NATIVE_SUFFIX = re.compile(r"\.(so(\.\d+)*|dylib|pyd|dll|wasm)$", re.IGNORECASE)
ARCHIVE_SUFFIX = re.compile(r"\.(whl|zip)$", re.IGNORECASE)

# GPL components, each with namespace markers (one must be present) and the
# package markers that name a GPL package of that component, as class names
# appear inside mangled C++ symbol names. They are kept in gpl-components.json,
# which the npm side of the check (licences.ts) reads too; its "about" says
# where the CGAL list comes from.
GPL_COMPONENTS = [
    {
        "component": spec["component"],
        "namespace": [marker.encode("ascii") for marker in spec["namespace"]],
        "packages": {
            marker.encode("ascii"): name for marker, name in spec["packages"].items()
        },
    }
    for spec in json.loads(
        Path(__file__).with_name("gpl-components.json").read_text(encoding="utf-8")
    )["components"]
]


def licence_files(dist: metadata.Distribution) -> list[str]:
    found = set()
    for entry in dist.files or []:
        parts = entry.parts
        in_licenses_folder = (
            len(parts) >= 2
            and parts[0].endswith(".dist-info")
            and parts[1] == "licenses"
        )
        if in_licenses_folder or LICENCE_FILE.match(entry.name):
            found.add(str(dist.locate_file(entry)))
    return sorted(found)


def gpl_markers(data: bytes) -> list[dict[str, object]]:
    found = []
    for spec in GPL_COMPONENTS:
        if not any(marker in data for marker in spec["namespace"]):
            continue
        packages = sorted(
            {name for marker, name in spec["packages"].items() if marker in data}
        )
        if packages:
            found.append({"component": spec["component"], "packages": packages})
    return found


def native_files(dist: metadata.Distribution) -> tuple[list[str], list[dict[str, object]]]:
    natives = []
    bundled = []
    for entry in dist.files or []:
        path = Path(str(dist.locate_file(entry)))
        if not path.is_file():
            continue
        if NATIVE_SUFFIX.search(entry.name):
            natives.append(str(path))
            for hit in gpl_markers(path.read_bytes()):
                bundled.append({"file": str(path), **hit})
        elif ARCHIVE_SUFFIX.search(entry.name) and zipfile.is_zipfile(path):
            with zipfile.ZipFile(path) as archive:
                for member in archive.namelist():
                    if not NATIVE_SUFFIX.search(member):
                        continue
                    inner = f"{path}!{member}"
                    natives.append(inner)
                    for hit in gpl_markers(archive.read(member)):
                        bundled.append({"file": inner, **hit})
    return sorted(natives), bundled


def describe(dist: metadata.Distribution) -> dict[str, object]:
    meta = dist.metadata
    classifiers = [
        c for c in (meta.get_all("Classifier") or []) if c.startswith("License ::")
    ]
    natives, bundled = native_files(dist)
    return {
        "name": meta.get("Name"),
        "version": meta.get("Version"),
        "licenseExpression": meta.get("License-Expression"),
        "license": meta.get("License"),
        "classifiers": classifiers,
        "licenseFiles": licence_files(dist),
        "nativeFiles": natives,
        "bundledGpl": bundled,
    }


def main(paths: list[str]) -> None:
    dists = [describe(dist) for dist in metadata.distributions(path=paths)]
    dists.sort(key=lambda item: str(item["name"] or "").lower())
    json.dump(dists, sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1:])
