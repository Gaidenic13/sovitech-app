"""List the Python distributions installed in the given site-packages folders.

Usage: python -I -B python_dists.py <site-packages> [<site-packages> ...]

Prints one JSON list: name, version, License-Expression, License, the licence
trove classifiers, and the absolute paths of the licence files the wheel
installed (from its RECORD). It reads package metadata only; it imports
nothing from the packages and writes nothing.
"""

import json
import re
import sys
from importlib import metadata

LICENCE_FILE = re.compile(
    r"^(licen[cs]e|copying|notice|copyright|unlicense)", re.IGNORECASE
)


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


def describe(dist: metadata.Distribution) -> dict[str, object]:
    meta = dist.metadata
    classifiers = [
        c for c in (meta.get_all("Classifier") or []) if c.startswith("License ::")
    ]
    return {
        "name": meta.get("Name"),
        "version": meta.get("Version"),
        "licenseExpression": meta.get("License-Expression"),
        "license": meta.get("License"),
        "classifiers": classifiers,
        "licenseFiles": licence_files(dist),
    }


def main(paths: list[str]) -> None:
    dists = [describe(dist) for dist in metadata.distributions(path=paths)]
    dists.sort(key=lambda item: str(item["name"] or "").lower())
    json.dump(dists, sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1:])
