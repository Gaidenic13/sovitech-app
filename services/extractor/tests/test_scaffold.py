"""Scaffold test: the package imports and names its version."""

import sovitech_extractor


def test_package_imports() -> None:
    assert sovitech_extractor.__version__ == "0.1.0"
