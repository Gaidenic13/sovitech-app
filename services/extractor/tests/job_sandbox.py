"""The worker's output place, for the sandbox tests (apps/api/src/jobs/sandbox.ts; ADR 0034,
decision 4).

The API's runner never mounts a host folder at /output: a job writes only into a volume of its
own, a tmpfs limited in size, noexec, nosuid and nodev, owned by the sandbox account and closed to
everyone else; a holder container keeps the volume mounted after the job; the one regular output
file within the bound is copied out through the Docker daemon as a tar entry, into a new host file
(never through a link); and the job's containers and its volume are removed whatever happened.
The phase 2 review found this harness still bind-mounting a host folder, so a container under test
could leave a link to a device, a FIFO, an executable, a file of any size or a folder the host
cannot open in the tests' home folder. Every sandboxed job of the tests runs the worker's way,
through this module. ``sandbox.docker_argv`` (src/sovitech_extractor/sandbox.py) takes the job's
volume and names the sandbox account itself (phase 2 fix round 3, the integrator); ``command``
checks that a command's one writable mount is the job's volume and that it runs as the sandbox
account, and refuses any other.

The bounds are the API's (apps/api/src/jobs/read-output.ts ``OUTPUT_LIMITS`` and
``outputFileBytes``; sandbox.ts ``DEFAULT_SANDBOX_LIMITS``): an output of a job that asked for no
IFC values is at most 4 MiB and its line end, and the volume holds that and 1 MiB more.
"""

from __future__ import annotations

import contextlib
import io
import json
import os
import subprocess
import tarfile
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from sovitech_extractor import sandbox

# The account both images run as, named on every container (the API's SANDBOX_USER).
SANDBOX_USER = sandbox.SANDBOX_USER
# The largest output file the API reads for a job that asked for no IFC values, and the
# volume's room.
OUTPUT_FILE_BYTES = 4 * 1024 * 1024 + 1
VOLUME_BYTES = OUTPUT_FILE_BYTES + 1024 * 1024
DOCKER_STEP_SECONDS = 120

CopyOutcome = Literal["copied", "missing", "refused"]


def volume_create_argv(volume: str, size_bytes: int = VOLUME_BYTES) -> list[str]:
    """The ``docker volume create`` command of a job's output volume, as the API's runner
    makes it."""
    uid, gid = SANDBOX_USER.split(":")
    options = f"size={size_bytes},noexec,nosuid,nodev,uid={uid},gid={gid},mode=0700"
    return [
        "docker",
        "volume",
        "create",
        "--driver",
        "local",
        "--opt",
        "type=tmpfs",
        "--opt",
        "device=tmpfs",
        "--opt",
        f"o={options}",
        "--label",
        "sovitech.job-output=1",
        volume,
    ]


def output_mount(volume: str) -> str:
    """The job's volume at /output: the one writable place of its containers."""
    return f"type=volume,source={volume},target={sandbox.OUTPUT},volume-nocopy"


def command(argv: list[str], volume: str) -> list[str]:
    """``sandbox.docker_argv``'s command, checked: its one writable mount is the job's own volume
    at /output, and it names the sandbox account (so an image cannot run the job as root).
    Anything else is refused."""
    writable = [
        index
        for index in range(1, len(argv))
        if argv[index - 1] == "--mount" and not argv[index].endswith(",readonly")
    ]
    if len(writable) != 1 or argv[writable[0]] != output_mount(volume):
        raise ValueError("sandbox.unexpected_mounts")
    users = [index for index in range(1, len(argv)) if argv[index - 1] == "--user"]
    if [argv[index] for index in users] != [SANDBOX_USER]:
        raise ValueError("sandbox.unexpected_user")
    return [*argv]


def holder_argv(image: str, volume: str, name: str, seconds: int) -> list[str]:
    """The holder: it keeps the output volume mounted after the job, under the same confinement."""
    return [
        "docker",
        "run",
        "--detach",
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
        "8",
        "--memory",
        "64m",
        "--memory-swap",
        "64m",
        "--cpus",
        "0.1",
        "--mount",
        output_mount(volume),
        "--entrypoint",
        "sleep",
        image,
        str(seconds),
    ]


def copy_out(
    holder: str, name: str, target: Path, max_bytes: int = OUTPUT_FILE_BYTES
) -> CopyOutcome:
    """Copies /output/<name> out of the holder through the Docker daemon, as the API's runner
    does (apps/api/src/jobs/copy-out.ts): only one regular file of that name within the bound
    is taken, into a new file at ``target``; a link, a FIFO, a device, a folder or a larger file
    is refused, and nothing is written on the host."""
    fetched = subprocess.run(  # noqa: S603 - a fixed argv, no shell
        ["docker", "cp", f"{holder}:{sandbox.OUTPUT}/{name}", "-"],  # noqa: S607
        capture_output=True,
        check=False,
        timeout=DOCKER_STEP_SECONDS,
    )
    if fetched.returncode != 0 or len(fetched.stdout) == 0:
        return "missing"
    try:
        with tarfile.open(fileobj=io.BytesIO(fetched.stdout), mode="r:") as archive:
            members = archive.getmembers()
            if len(members) != 1:
                return "refused"
            member = members[0]
            if member.name != name or not member.isreg() or member.size > max_bytes:
                return "refused"
            source = archive.extractfile(member)
            if source is None:
                return "refused"
            data = source.read(max_bytes + 1)
    except tarfile.TarError:
        return "refused"
    if len(data) > max_bytes:
        return "refused"
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW
    try:
        descriptor = os.open(target, flags, 0o600)
    except OSError:
        return "refused"
    with os.fdopen(descriptor, "wb") as written:
        written.write(data)
    return "copied"


@dataclass(frozen=True, slots=True)
class OutputPlace:
    """A job's output volume and the holder that keeps it mounted."""

    volume: str
    holder: str

    def command(self, argv: list[str]) -> list[str]:
        return command(argv, self.volume)

    def copy_out(self, name: str, target: Path, max_bytes: int = OUTPUT_FILE_BYTES) -> CopyOutcome:
        return copy_out(self.holder, name, target, max_bytes)


def _docker(argv: list[str]) -> None:
    subprocess.run(argv, capture_output=True, check=True, timeout=DOCKER_STEP_SECONDS)  # noqa: S603


def _removed(name: str, volume: str) -> None:
    subprocess.run(["docker", "rm", "--force", name], capture_output=True, check=False)  # noqa: S603, S607
    subprocess.run(["docker", "volume", "rm", "--force", volume], capture_output=True, check=False)  # noqa: S603, S607


@contextlib.contextmanager
def output_place(
    image: str, *, size_bytes: int = VOLUME_BYTES, seconds: int = 900
) -> Iterator[OutputPlace]:
    """A job's output volume and its holder, removed with the volume whatever happened."""
    suffix = uuid.uuid4().hex
    place = OutputPlace(
        volume=f"sovitech-job-output-{suffix}", holder=f"sovitech-job-hold-{suffix}"
    )
    try:
        _docker(volume_create_argv(place.volume, size_bytes))
        _docker(holder_argv(image, place.volume, place.holder, seconds))
        yield place
    finally:
        _removed(place.holder, place.volume)


@dataclass(frozen=True, slots=True)
class Outcome:
    """How a sandboxed job ended (as ``sandbox.Result``), and what came of its output file."""

    exit_status: int | None
    log: tuple[dict[str, object], ...]
    killed: bool
    output: CopyOutcome | None


def _log_lines(text: str) -> tuple[dict[str, object], ...]:
    lines: list[dict[str, object]] = []
    for line in text.splitlines():
        with contextlib.suppress(json.JSONDecodeError):
            item = json.loads(line)
            if isinstance(item, dict):
                lines.append(item)
    return tuple(lines)


def run(
    spec: sandbox.SandboxSpec,
    *,
    document: Path,
    request: Path,
    out: Path,
    wall_clock_seconds: float,
    datasets: Path | None = None,
    ids: Path | None = None,
) -> Outcome:
    """``sandbox.run`` the worker's way: the job writes into its own volume, and the one regular
    output.json within the bound is copied into ``out`` after it ends."""
    if spec.image is None:
        raise ValueError("sandbox.no_image")
    name = f"sovitech-job-{uuid.uuid4().hex}"
    with output_place(spec.image) as place:
        argv = place.command(
            sandbox.docker_argv(
                spec,
                name=name,
                document=document,
                request=request,
                output_volume=place.volume,
                datasets=datasets,
                ids=ids,
            )
        )
        try:
            completed = subprocess.run(  # noqa: S603 - a fixed argv, no shell
                argv, capture_output=True, text=True, timeout=wall_clock_seconds, check=False
            )
        except subprocess.TimeoutExpired:
            subprocess.run(["docker", "kill", name], capture_output=True, check=False)  # noqa: S603, S607
            return Outcome(None, (), True, None)
        copied = (
            place.copy_out("output.json", out / "output.json")
            if completed.returncode == 0
            else None
        )
        return Outcome(completed.returncode, _log_lines(completed.stderr), False, copied)
