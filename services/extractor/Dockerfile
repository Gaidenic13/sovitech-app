# The extraction sandbox (prompt 3 sections 8 and 11; docs/adr/0018-extractor-
# dependencies-and-sandbox-image.md; docs/adr/0024-extractor-pipeline.md). Every
# job that opens an owner model or document runs in a container of the
# "extractor" target. The image carries no secret and makes no network call at
# run time; the runner enforces the rest. The one definition of the run flags
# is src/sovitech_extractor/sandbox.py (docker_argv): --network none,
# --read-only, --cap-drop ALL, --security-opt no-new-privileges, --pids-limit,
# --memory equal to --memory-swap, --cpus, a small noexec /tmp, the document and
# the request mounted read-only, one writable output folder, and a wall clock
# after which the runner kills the container. Logs carry codes, GlobalIds and
# STEP ids only, never document text (rule 13).
#
# Build (from the repository root; the context is this folder only, so nothing
# outside it, and never company/, reaches the image):
#
#   docker build --target extractor -t sovitech-extractor:dev services/extractor
#   docker build --target fixtures  -t sovitech-fixtures:dev  services/extractor
#
# Packages come only from PyPI, installed at build time from the hashed locks
# with --require-hashes and wheels only (no build scripts run). IfcOpenShell
# and IfcTester are withheld until the owner decides (ADR 0018): their wheels
# bundle CGAL packages published under the GPL.

# Python 3.12.14 on Debian bookworm, slim, pinned by the multi-platform index
# digest (linux/amd64 and linux/arm64 among its platforms), pulled 2026-09-25.
FROM python:3.12.14-slim-bookworm@sha256:392307d22300de8b5986851a12d9176dfc0fc073e65bf6523ebd7dcbeb23564e AS extractor

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_NO_INPUT=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:$PATH

# An unprivileged account with no home content and no login shell.
RUN groupadd --system --gid 10001 extractor \
 && useradd --system --uid 10001 --gid extractor --no-create-home --shell /usr/sbin/nologin extractor

COPY requirements.lock /opt/extractor/requirements.lock
RUN python -m venv /opt/venv \
 && /opt/venv/bin/python -m pip install --require-hashes --only-binary=:all: -r /opt/extractor/requirements.lock

# The package source, found through a .pth file so that `python -I` (which
# ignores PYTHONPATH and leaves the working folder off sys.path) still finds it.
COPY src/ /opt/extractor/src/
RUN echo /opt/extractor/src > /opt/venv/lib/python3.12/site-packages/sovitech_extractor.pth \
 && python -I -c "import sovitech_extractor, pypdfium2, openpyxl, lxml.etree"

WORKDIR /output
USER extractor:extractor
ENTRYPOINT ["python", "-I", "-m", "sovitech_extractor"]

# The fixture generators (prompt 3 section 8 "Fixtures"): the extractor image
# plus reportlab and PyYAML. The runner mounts fixtures/ and runs a generator
# with --network none, so regeneration is byte-for-byte reproducible offline.
FROM extractor AS fixtures
USER root
COPY requirements-fixtures.lock /opt/extractor/requirements-fixtures.lock
RUN /opt/venv/bin/python -m pip install --require-hashes --only-binary=:all: \
      -r /opt/extractor/requirements.lock -r /opt/extractor/requirements-fixtures.lock \
 && python -I -c "import reportlab, yaml"
USER extractor:extractor
ENTRYPOINT ["python", "-I"]
