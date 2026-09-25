"""Seeded input for the scan-roots self-test (TEST). Wrong on purpose.

A services/<service>/ subfolder the list does not classify: the Python bans read
src/ only, so a number parsed out of text here went unread.
"""


def area(text: str) -> float:
    return float(text)
