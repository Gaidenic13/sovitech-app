"""The sandbox: every job that opens a document runs in the extractor image with no network, a
read-only root and input, dropped capabilities, memory, process and time limits, and one writable
output place (prompt 3 sections 8 and 11; ADR 0018).

Every job here runs the API worker's way (tests/job_sandbox.py; ADR 0034, decision 4): the one
writable place is a volume of the job's own, a tmpfs limited in size, noexec, nosuid and nodev,
owned by the sandbox account, that no host folder backs; the one regular output file within the
bound is copied out through the Docker daemon; the account is named. The flags are checked on the
command itself; with Docker and the image present, fixtures run through it end to end, a probe
shows the network, the root and the input are closed to the job, a container that attacks its
output place leaves nothing on the host, and a job past its wall clock is killed. Without Docker or
the image these report "not running" with the reason. Folders shared with the container sit under
the home folder (the Colima machine mounts only that); they hold the request, read-only, and the
copied output, and are removed after.

Ids: F-INGEST-04 (the sandbox), prompt 3 section 8 ("Pipeline") and section 11 (security basics).
"""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest

import job_sandbox
from sovitech_extractor import contract, sandbox
from sovitech_extractor.extract import file_hash

REPO = Path(__file__).resolve().parents[3]
IMAGE = sandbox.EXTRACTOR.image or ""
READER_IMAGE = sandbox.IFC_READER.image or ""


def _docker_state(image: str, build: str) -> str | None:
    """None when Docker and the image are there, else why the integration tests do not run."""
    if shutil.which("docker") is None:
        return "not running: no docker client on this machine"
    try:
        probe = subprocess.run(  # noqa: S603
            ["docker", "image", "inspect", image],  # noqa: S607
            capture_output=True,
            check=False,
            timeout=30,
        )
    except (OSError, subprocess.TimeoutExpired):
        return "not running: the docker daemon does not answer"
    if probe.returncode != 0:
        return f"not running: image {image} is not built ({build})"
    return None


DOCKER = _docker_state(IMAGE, "docker build --target extractor")
needs_docker = pytest.mark.skipif(DOCKER is not None, reason=DOCKER or "")
READER = _docker_state(
    READER_IMAGE, "docker build -f services/ifc-reader/Dockerfile -t sovitech-ifc-reader:dev ."
)
needs_reader = pytest.mark.skipif(READER is not None, reason=READER or "")


@pytest.fixture
def shared() -> Iterator[Path]:
    root = Path.home() / ".cache" / "sovitech-extractor-tests"
    root.mkdir(parents=True, exist_ok=True)
    folder = Path(tempfile.mkdtemp(prefix="job-", dir=root))
    # The container never writes here: the harness copies the output file in (owner-only).
    (folder / "out").mkdir(mode=0o700)
    try:
        yield folder
    finally:
        shutil.rmtree(folder, ignore_errors=True)


def test_the_command_closes_the_network_the_root_and_the_input() -> None:
    argv = job_sandbox.command(
        sandbox.docker_argv(
            sandbox.EXTRACTOR,
            name="sovitech-job-test",
            document=Path("/home/test/document"),
            request=Path("/home/test/request.json"),
            output_volume="sovitech-job-output-test",
        ),
        "sovitech-job-output-test",
    )
    joined = " ".join(argv)
    for flag in (
        "--network none",
        "--read-only",
        "--cap-drop ALL",
        "--security-opt no-new-privileges",
        "--pids-limit 256",
        "--memory 4g",
        "--memory-swap 4g",
        "--tmpfs /tmp:rw,noexec,nosuid,size=64m",
        f"target={sandbox.INPUT},readonly",
        f"target={sandbox.REQUEST},readonly",
    ):
        assert flag in joined, flag
    # No host folder is writable: the one writable place is the job's own volume, and the
    # account is named.
    writable = [a for a in argv if a.startswith("type=") and not a.endswith(",readonly")]
    assert writable == [
        f"type=volume,source=sovitech-job-output-test,target={sandbox.OUTPUT},volume-nocopy"
    ]
    assert "/home/test/out" not in joined
    assert argv[argv.index("--user") + 1] == "10001:10001"
    assert argv[argv.index(IMAGE) + 1 :] == [
        "--request",
        sandbox.REQUEST,
        "--document",
        sandbox.INPUT,
        "--out",
        sandbox.OUTPUT,
    ]


def test_the_output_volume_is_the_workers_size_limited_noexec_nosuid_tmpfs() -> None:
    """ADR 0034 decision 4: the harness's output place is the API runner's
    (apps/api/src/jobs/sandbox.ts, outputVolumeArguments): a tmpfs of the output bound and 1 MiB,
    noexec, nosuid and nodev, owned by the sandbox account and closed to everyone else; its
    holder runs under the same confinement."""
    volume = job_sandbox.volume_create_argv("sovitech-job-output-test")
    assert volume[:3] == ["docker", "volume", "create"]
    assert "type=tmpfs" in volume
    size = 4 * 1024 * 1024 + 1 + 1024 * 1024
    assert f"o=size={size},noexec,nosuid,nodev,uid=10001,gid=10001,mode=0700" in volume
    holder = " ".join(
        job_sandbox.holder_argv(IMAGE, "sovitech-job-output-test", "sovitech-job-hold-test", 60)
    )
    for flag in (
        "--network none",
        "--read-only",
        "--cap-drop ALL",
        "--user 10001:10001",
        "--entrypoint sleep",
    ):
        assert flag in holder, flag
    assert (
        f"type=volume,source=sovitech-job-output-test,target={sandbox.OUTPUT},volume-nocopy"
        in holder
    )


def test_the_harness_refuses_a_command_with_another_writable_mount() -> None:
    argv = sandbox.docker_argv(
        sandbox.EXTRACTOR,
        name="sovitech-job-test",
        document=Path("/home/test/document"),
        request=Path("/home/test/request.json"),
        output_volume="sovitech-job-output-test",
    )
    image_at = argv.index(IMAGE)
    extra = [
        *argv[:image_at],
        "--mount",
        "type=bind,source=/home/test/else,target=/else",
        *argv[image_at:],
    ]
    with pytest.raises(ValueError, match="sandbox"):
        job_sandbox.command(extra, "sovitech-job-output-test")


def test_the_conversion_hook_has_no_image_yet() -> None:
    with pytest.raises(ValueError, match="sandbox"):
        sandbox.docker_argv(
            sandbox.CONVERSION,
            name="x",
            document=Path("/d"),
            request=Path("/r"),
            output_volume="sovitech-job-output-test",
        )


def _request(folder: Path, document: Path, declared: str) -> Path:
    path = folder / "request.json"
    path.write_text(
        json.dumps(
            {
                "contractVersion": "1.0.0",
                "job": {
                    "projectId": "0192f0a0-0000-7000-8000-00000000d101",
                    "documentId": "0192f0a0-0000-7000-8000-00000000d102",
                    "contentHash": file_hash(document),
                },
                "declaredFormat": declared,
                "ifcValues": False,
                "datasets": [],
                "derivatives": [],
                "limits": {"maxPages": 1000, "maxCellsPerSheet": 100000, "wallClockSeconds": 120},
            }
        )
    )
    return path


@needs_docker
@pytest.mark.parametrize(
    ("relative", "declared", "status"),
    [
        ("pdf/caiet-de-sarcini.pdf", "pdf", "partly_analysed"),
        ("xlsx/tabel-camere.xlsx", "xlsx", "analysed"),
    ],
)
def test_a_fixture_runs_through_the_sandbox(
    shared: Path, relative: str, declared: str, status: str
) -> None:
    document = REPO / "fixtures" / relative
    result = job_sandbox.run(
        sandbox.EXTRACTOR,
        document=document,
        request=_request(shared, document, declared),
        out=shared / "out",
        wall_clock_seconds=120,
    )
    assert (result.exit_status, result.killed, result.output) == (0, False, "copied")
    assert [line["code"] for line in result.log] == ["job.started", "job.finished"]
    output = contract.parse_output(json.loads((shared / "out" / "output.json").read_text()))
    assert output.analysis.status == status


@needs_docker
def test_inside_the_sandbox_the_network_the_root_and_the_input_are_closed(shared: Path) -> None:
    document = REPO / "fixtures" / "pdf" / "memoriu-tehnic.pdf"
    probe = (
        "import os, socket\n"
        "results = []\n"
        "for label, action in [\n"
        "    ('network', lambda: socket.create_connection(('192.0.2.1', 80), timeout=2)),\n"
        "    ('root', lambda: open('/opt/probe', 'w')),\n"
        f"    ('input', lambda: open('{sandbox.INPUT}', 'a')),\n"
        "]:\n"
        "    try:\n"
        "        action()\n"
        "        results.append(label + ':open')\n"
        "    except OSError:\n"
        "        results.append(label + ':closed')\n"
        "open('/output/probe.txt', 'w').write(' '.join(results) + ' uid:' + str(os.getuid()))\n"
    )
    with job_sandbox.output_place(IMAGE) as place:
        argv = place.command(
            sandbox.docker_argv(
                sandbox.EXTRACTOR,
                name="sovitech-job-probe",
                document=document,
                request=_request(shared, document, "pdf"),
                output_volume=place.volume,
            )
        )
        image_at = argv.index(IMAGE)
        command = [*argv[:image_at], "--entrypoint", "python", IMAGE, "-I", "-c", probe]
        completed = subprocess.run(command, capture_output=True, text=True, check=False, timeout=60)  # noqa: S603
        assert completed.returncode == 0, completed.stderr[-300:]
        assert place.copy_out("probe.txt", shared / "out" / "probe.txt") == "copied"
    assert (
        shared / "out" / "probe.txt"
    ).read_text() == "network:closed root:closed input:closed uid:10001"


@needs_docker
def test_a_container_that_attacks_its_output_place_leaves_nothing_on_the_host(shared: Path) -> None:
    """ADR 0034 decision 4, the phase 2 review: with the host folder bind-mounted, a container
    left a link to /dev/zero at output.json, a FIFO, an executable, a 64 MB file and a folder
    with no permissions on the host. In the job's own volume: writing past its size fails, a
    file there cannot run, the link is refused when the output is copied out, and the host
    folder stays empty."""
    document = REPO / "fixtures" / "pdf" / "memoriu-tehnic.pdf"
    probe = (
        "import errno, os, subprocess, sys\n"
        "try:\n"
        "    open('/output/big', 'wb').write(b'x' * (64 * 1024 * 1024))\n"
        "    sys.exit(7)\n"
        "except OSError as error:\n"
        "    if error.errno != errno.ENOSPC: sys.exit(8)\n"
        "os.remove('/output/big')\n"
        "open('/output/run.sh', 'w').write('#!/bin/sh\\nexit 0\\n')\n"
        "os.chmod('/output/run.sh', 0o755)\n"
        "try:\n"
        "    subprocess.run(['/output/run.sh'], check=False)\n"
        "    sys.exit(9)\n"
        "except PermissionError:\n"
        "    pass\n"
        "os.symlink('/dev/zero', '/output/output.json')\n"
        "os.mkfifo('/output/fifo')\n"
        "os.makedirs('/output/locked/inner')\n"
        "os.chmod('/output/locked', 0o000)\n"
    )
    with job_sandbox.output_place(IMAGE) as place:
        argv = place.command(
            sandbox.docker_argv(
                sandbox.EXTRACTOR,
                name=f"sovitech-job-attack-{shared.name}",
                document=document,
                request=_request(shared, document, "pdf"),
                output_volume=place.volume,
            )
        )
        image_at = argv.index(IMAGE)
        command = [*argv[:image_at], "--entrypoint", "python", IMAGE, "-I", "-c", probe]
        completed = subprocess.run(  # noqa: S603
            command, capture_output=True, text=True, check=False, timeout=120
        )
        assert completed.returncode == 0, completed.stderr[-300:]
        assert place.copy_out("output.json", shared / "out" / "output.json") == "refused"
        assert place.copy_out("fifo", shared / "out" / "fifo") == "refused"
        assert place.copy_out("locked", shared / "out" / "locked") == "refused"
        volume = place.volume
    assert list((shared / "out").iterdir()) == []
    gone = subprocess.run(["docker", "volume", "inspect", volume], capture_output=True, check=False)  # noqa: S603, S607
    assert gone.returncode != 0


@needs_docker
def test_a_job_past_its_wall_clock_is_killed(shared: Path) -> None:
    document = REPO / "fixtures" / "pdf" / "memoriu-tehnic.pdf"
    spec = sandbox.SandboxSpec(image=IMAGE)
    name = "sovitech-job-slow"
    with job_sandbox.output_place(IMAGE) as place:
        argv = place.command(
            sandbox.docker_argv(
                spec,
                name=name,
                document=document,
                request=_request(shared, document, "pdf"),
                output_volume=place.volume,
            )
        )
        image_at = argv.index(IMAGE)
        command = [
            *argv[:image_at],
            "--entrypoint",
            "python",
            IMAGE,
            "-I",
            "-c",
            "import time; time.sleep(60)",
        ]
        try:
            subprocess.run(command, capture_output=True, check=False, timeout=3)  # noqa: S603
            killed = False
        except subprocess.TimeoutExpired:
            subprocess.run(["docker", "kill", name], capture_output=True, check=False)  # noqa: S603, S607
            killed = True
    assert killed
    still = subprocess.run(  # noqa: S603
        ["docker", "ps", "--filter", f"name={name}", "--format", "{{.Names}}"],  # noqa: S607
        capture_output=True,
        text=True,
        check=False,
    )
    assert still.stdout.strip() == ""


@needs_reader
def test_a_model_runs_through_the_ifc_readers_sandbox_under_the_same_flags(shared: Path) -> None:
    """ADR 0031: an IFC model's job runs in the IFC reader's image, with the one flag definition
    above, and writes a strict output: stored "Not analysed" as an IFC model."""
    document = REPO / "fixtures" / "ifc" / "demo-hotel-mep-rev-a.ifc"
    result = job_sandbox.run(
        sandbox.IFC_READER,
        document=document,
        request=_request(shared, document, "ifc"),
        out=shared / "out",
        wall_clock_seconds=120,
    )
    assert (result.exit_status, result.killed, result.output) == (0, False, "copied")
    assert [line["code"] for line in result.log] == ["job.started", "job.finished"]
    output = contract.parse_output(json.loads((shared / "out" / "output.json").read_text()))
    assert (output.analysis.status, output.analysis.format_word) == ("stored_only", "IFC model")  # type: ignore[union-attr]


PERF = REPO / "fixtures" / "ifc" / "perf" / "demo-hotel-perf.ifc"


@needs_reader
@pytest.mark.skipif(not PERF.exists(), reason="not running: the perf model is not generated here")
def test_the_runner_kills_a_job_at_its_wall_clock(shared: Path) -> None:
    """The perf model's data pass takes longer than 3 s in the IFC reader's sandbox (ADR 0031)."""
    result = job_sandbox.run(
        sandbox.IFC_READER,
        document=PERF,
        request=_request(shared, PERF, "ifc"),
        out=shared / "out",
        wall_clock_seconds=3,
    )
    assert (result.exit_status, result.killed, result.output) == (None, True, None)
    assert not (shared / "out" / "output.json").exists()
