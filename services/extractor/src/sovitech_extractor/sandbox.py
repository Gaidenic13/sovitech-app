"""The sandbox every job that opens an owner model or document runs in (prompt 3 sections 8
and 11; ADR 0018): the extractor image, with no network, a read-only root and input, dropped
capabilities, memory and process limits, a small no-exec /tmp, one writable output place, and a
wall clock after which the container is killed.

``docker_argv`` is the one definition of those flags here; the API's job worker runs the same flags
from its own definition (apps/api/src/jobs/sandbox.ts; ADR 0026, ADR 0034), and the tests here run
fixtures through this one. The one writable place is a volume of the job's own, never a host
folder: the caller makes it (a size-limited, noexec, nosuid, nodev tmpfs owned by the sandbox
account) and copies the output out of it through the Docker daemon, as the API's runner does
(tests/job_sandbox.py; ADR 0034 decision 5). Every container runs as the sandbox account. ``run``
starts the container and kills it at the wall clock. The container's standard error carries the
extractor's JSON log lines (codes and ids only); nothing else of it is kept.

The IFC reader (web-ifc; the owner's decision of 2026-09-26; ADR 0031) runs every IFC job under
the same flags from its own image on the node:22 slim base of ADR 0018
(services/ifc-reader/Dockerfile): its spec is ``IFC_READER`` below, and the API's worker picks it
for IFC models (apps/api/src/jobs/sandbox.ts).

Phase 4 hook: the Node conversion of a model into viewing files (That Open's IfcImporter, web-ifc)
runs under the same flags from its own image; its spec is ``CONVERSION`` below, and it has no
image yet.
"""

from __future__ import annotations

import contextlib
import json
import subprocess
import uuid
from dataclasses import dataclass, field
from pathlib import Path

__all__ = [
    "CONVERSION",
    "EXTRACTOR",
    "IFC_READER",
    "SANDBOX_USER",
    "Result",
    "SandboxSpec",
    "docker_argv",
    "run",
]


@dataclass(frozen=True, slots=True)
class SandboxSpec:
    """An image and its limits. The flags themselves are fixed in ``docker_argv``."""

    image: str | None
    memory: str = "4g"
    cpus: str = "2"
    pids: int = 256
    tmpfs: str = "64m"
    entry_arguments: tuple[str, ...] = field(default_factory=tuple)


# The extraction budget of prompt 3 section 11: under 4 GB of memory.
EXTRACTOR = SandboxSpec(image="sovitech-extractor:dev")
# The IFC reader: the same budget, and web-ifc is wasm32, so 4 GB is its ceiling too.
IFC_READER = SandboxSpec(image="sovitech-ifc-reader:dev")
# Phase 4: the viewer conversion (web-ifc is wasm32, so 4 GB is its ceiling). No image yet.
CONVERSION = SandboxSpec(image=None)

# The account both images run as, named on every container (the API's SANDBOX_USER).
SANDBOX_USER = "10001:10001"

INPUT = "/input/document"
REQUEST = "/job/request.json"
OUTPUT = "/output"
DATASETS = "/datasets"
IDS = "/ids/requirements.ids"


def docker_argv(
    spec: SandboxSpec,
    *,
    name: str,
    document: Path,
    request: Path,
    output_volume: str,
    datasets: Path | None = None,
    ids: Path | None = None,
) -> list[str]:
    """The ``docker run`` command for one job. Its one writable place is ``output_volume``, a
    volume of the job's own (the API's runner: a size-limited, noexec, nosuid, nodev tmpfs owned
    by the sandbox account; ADR 0034), never a host folder."""
    if spec.image is None:
        raise ValueError("sandbox.no_image")
    argv = [
        "docker",
        "run",
        "--rm",
        "--name",
        name,
        "--network",
        "none",
        "--read-only",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        "--user",
        SANDBOX_USER,
        "--pids-limit",
        str(spec.pids),
        "--memory",
        spec.memory,
        "--memory-swap",
        spec.memory,
        "--cpus",
        spec.cpus,
        "--tmpfs",
        f"/tmp:rw,noexec,nosuid,size={spec.tmpfs}",  # noqa: S108 - the container's own /tmp
        "--mount",
        f"type=bind,source={document.resolve()},target={INPUT},readonly",
        "--mount",
        f"type=bind,source={request.resolve()},target={REQUEST},readonly",
        "--mount",
        f"type=volume,source={output_volume},target={OUTPUT},volume-nocopy",
    ]
    arguments = ["--request", REQUEST, "--document", INPUT, "--out", OUTPUT]
    if datasets is not None:
        argv += ["--mount", f"type=bind,source={datasets.resolve()},target={DATASETS},readonly"]
        arguments += ["--datasets", DATASETS]
    if ids is not None:
        argv += ["--mount", f"type=bind,source={ids.resolve()},target={IDS},readonly"]
        arguments += ["--ids", IDS]
    return [*argv, spec.image, *spec.entry_arguments, *arguments]


@dataclass(frozen=True, slots=True)
class Result:
    """How a sandboxed job ended: its exit status (None when killed at the wall clock) and the
    extractor's log lines."""

    exit_status: int | None
    log: tuple[dict[str, object], ...]
    killed: bool


def _log_lines(text: str) -> tuple[dict[str, object], ...]:
    lines: list[dict[str, object]] = []
    for line in text.splitlines():
        with contextlib.suppress(json.JSONDecodeError):
            item = json.loads(line)
            if isinstance(item, dict):
                lines.append(item)
    return tuple(lines)


def run(
    spec: SandboxSpec,
    *,
    document: Path,
    request: Path,
    output_volume: str,
    wall_clock_seconds: float,
    datasets: Path | None = None,
    ids: Path | None = None,
) -> Result:
    """Run one job in the sandbox and kill it at the wall clock. The caller makes the job's output
    volume and copies its output out (tests/job_sandbox.py ``run`` does both)."""
    name = f"sovitech-job-{uuid.uuid4().hex}"
    argv = docker_argv(
        spec,
        name=name,
        document=document,
        request=request,
        output_volume=output_volume,
        datasets=datasets,
        ids=ids,
    )
    try:
        completed = subprocess.run(  # noqa: S603 - a fixed argv, no shell
            argv, capture_output=True, text=True, timeout=wall_clock_seconds, check=False
        )
    except subprocess.TimeoutExpired:
        subprocess.run(["docker", "kill", name], capture_output=True, check=False)  # noqa: S603, S607
        return Result(None, (), True)
    return Result(completed.returncode, _log_lines(completed.stderr), False)
