"""Bans on the extractor's source: no number read out of text, no zero for a missing value.

The extractor never parses numbers out of text: the one rule 8 parser lives in
packages/registry (prompt 3 section 6; guardrails rule 8, "Parsing"). A missing value
is never replaced by a zero, and a total never drops the missing items (guardrails
rule 1, "Unknown propagates"). This module reads every Python file under the
"python-bans" folders of the shared scan-roots list (tools/checks/scan-roots/roots.json:
services/<service>/src) with the ast module, and fails on:

- ``number-from-text``: ``float()``, ``int()``, ``complex()``, ``Decimal()``,
  ``Fraction()``, ``locale.atof()`` or ``locale.atoi()`` called on anything but a
  literal, called with nothing (a zero), or passed as a function
  (``map(float, cells)``, ``defaultdict(int)``);
- ``zero-fallback``: ``x or 0`` in any zero spelling (``0``, ``0.0``, ``"0"``,
  ``Decimal(0)``), a conditional that falls back to zero on the value it tests
  (``x if x is not None else 0``), and a parameter default of zero;
- ``zero-default``: ``.get(key, 0)``, ``.pop(key, 0)``, ``.setdefault(key, 0)``,
  ``getattr(obj, name, 0)`` and ``next(items, 0)``;
- ``filtered-sum``: ``sum()``, ``max()``, ``min()``, ``math.fsum()`` or a
  ``statistics`` mean over a comprehension whose ``if`` drops missing values or over
  ``filter(None, ...)``, and a loop that adds into a running total while it tests for
  a missing value or runs over such a filtered iterable.

Phase 0 review round 2, adversarial finding 14. Every form has seeded bad inputs below
(``SEEDED_BAD``) that must fail with their ban, and good inputs (``SEEDED_GOOD``) that
must pass, so a ban cannot stop working unnoticed. The scan never passes on nothing:
it fails when no source file was read (phase 0 review, finding 17). There is no inline
switch to turn a ban off; a file that needs an exception is proposed for review.
"""

from __future__ import annotations

import ast
import json
import re
from dataclasses import dataclass
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
SCAN_ROOTS = Path("tools", "checks", "scan-roots", "roots.json")

# Top-level folders whose subfolders the list classifies (tools/checks/scan-roots/roots.ts).
SUBFOLDER_GROUPS = {"packages": "packageSubfolders", "services": "serviceSubfolders"}
SKIPPED_PARTS = {".venv", "__pycache__", ".pytest_cache", ".ruff_cache"}

NUMBER_BUILDERS = {"float", "int", "complex", "Decimal", "Fraction", "atof", "atoi"}
# As attributes only the library ones count: obj.float() is not the builtin.
NUMBER_BUILDER_ATTRIBUTES = {"Decimal", "Fraction", "atof", "atoi"}
# Calls that take a type, not a converter: isinstance(x, int) passes.
TYPE_TAKERS = {"isinstance", "issubclass", "cast", "TypeVar", "NewType", "type"}
DEFAULT_TAKERS = {"get": 1, "pop": 1, "setdefault": 1}
AGGREGATES = {
    "sum",
    "max",
    "min",
    "fsum",
    "mean",
    "fmean",
    "median",
    "geometric_mean",
    "harmonic_mean",
}
PRESENCE_CALLS = {"isinstance", "hasattr", "isnan", "isfinite", "callable", "bool"}
ZERO_TEXT = re.compile(r"^\s*[-+]?0+(?:[.,]0*)?\s*$")


@dataclass(frozen=True)
class Problem:
    path: str
    line: int
    ban: str
    message: str

    def __str__(self) -> str:
        return f"{self.path}:{self.line} {self.ban}: {self.message}"


def _text(node: ast.AST) -> str:
    """The source text of a node, the same for a target and a read (no Store or Load)."""
    return ast.unparse(node)


def _name_of(func: ast.expr) -> str | None:
    if isinstance(func, ast.Name):
        return func.id
    if isinstance(func, ast.Attribute):
        return func.attr
    return None


def _is_literal(node: ast.expr) -> bool:
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.UAdd | ast.USub):
        return _is_literal(node.operand)
    return isinstance(node, ast.Constant) and not isinstance(node.value, bool)


def _is_number_builder_call(node: ast.AST) -> bool:
    if not isinstance(node, ast.Call):
        return False
    if isinstance(node.func, ast.Name):
        return node.func.id in NUMBER_BUILDERS
    return isinstance(node.func, ast.Attribute) and node.func.attr in NUMBER_BUILDER_ATTRIBUTES


def _is_zero(node: ast.expr | None) -> bool:
    if node is None:
        return False
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.UAdd | ast.USub):
        return _is_zero(node.operand)
    if isinstance(node, ast.Constant):
        value = node.value
        if isinstance(value, bool):
            return False
        if isinstance(value, int | float | complex):
            return value == 0
        return isinstance(value, str) and ZERO_TEXT.match(value) is not None
    if _is_number_builder_call(node):
        call = node
        assert isinstance(call, ast.Call)
        return len(call.args) == 0 or (len(call.args) == 1 and _is_zero(call.args[0]))
    return False


def _root_name(node: ast.expr) -> str | None:
    current = node
    while isinstance(current, ast.Attribute | ast.Subscript):
        current = current.value
    return current.id if isinstance(current, ast.Name) else None


def _tested(test: ast.expr) -> list[ast.expr]:
    """The expressions a test checks for being present (None, NaN, a type, truthiness)."""
    if isinstance(test, ast.BoolOp):
        return [tested for value in test.values for tested in _tested(value)]
    if isinstance(test, ast.UnaryOp) and isinstance(test.op, ast.Not):
        return _tested(test.operand)
    if isinstance(test, ast.Compare):
        sides = [test.left, *test.comparators]
        if any(isinstance(side, ast.Constant) and side.value is None for side in sides):
            return [side for side in sides if not (isinstance(side, ast.Constant))]
        return []
    if isinstance(test, ast.Call) and _name_of(test.func) in PRESENCE_CALLS and test.args:
        return [test.args[0]]
    if isinstance(test, ast.Name | ast.Attribute | ast.Subscript):
        return [test]
    return []


def _is_missing_test(tree: ast.AST) -> bool:
    """Whether a tree tests for a missing value: a comparison with None, isinstance, isnan."""
    for node in ast.walk(tree):
        if isinstance(node, ast.Compare):
            sides = [node.left, *node.comparators]
            if any(isinstance(side, ast.Constant) and side.value is None for side in sides):
                return True
        if isinstance(node, ast.Call) and _name_of(node.func) in PRESENCE_CALLS:
            return True
    return False


def _reads(branch: ast.expr, tested: list[ast.expr]) -> bool:
    """Whether a branch reads a tested value or a property of it (row.area.value for row.area).

    A flag of the same object is not the value: ``row.count if row.visible else 0`` passes.
    """
    dumps = {_text(expression) for expression in tested}
    for node in ast.walk(branch):
        current: ast.expr | None = node if isinstance(node, ast.expr) else None
        while current is not None:
            if _text(current) in dumps:
                return True
            current = current.value if isinstance(current, ast.Attribute | ast.Subscript) else None
    return False


def _drops_missing(comprehension: ast.expr) -> bool:
    """A comprehension whose if drops missing values, or filter(None | bool | lambda, ...)."""
    if isinstance(comprehension, ast.GeneratorExp | ast.ListComp | ast.SetComp):
        element = _text(comprehension.elt)
        for generator in comprehension.generators:
            targets = {node.id for node in ast.walk(generator.target) if isinstance(node, ast.Name)}
            for condition in generator.ifs:
                if _is_missing_test(condition):
                    return True
                for tested in _tested(condition):
                    if _text(tested) == element:
                        return True
                    if isinstance(tested, ast.Name) and tested.id in targets:
                        return True
        return False
    if isinstance(comprehension, ast.Call) and _name_of(comprehension.func) == "filter":
        if not comprehension.args:
            return False
        keep = comprehension.args[0]
        if isinstance(keep, ast.Constant) and keep.value is None:
            return True
        if isinstance(keep, ast.Name) and keep.id == "bool":
            return True
        if isinstance(keep, ast.Lambda):
            # filter(lambda v: v, ...) keeps present values; a flag such as r.visible does not.
            params = {argument.arg for argument in keep.args.args}
            tested = _tested(keep.body)
            return _is_missing_test(keep.body) or any(
                isinstance(item, ast.Name) and item.id in params for item in tested
            )
    return False


def _accumulation(node: ast.AST) -> ast.expr | None:
    """The step an augmented or self-referencing assignment adds: s += v, s = s + v."""
    if isinstance(node, ast.AugAssign) and isinstance(
        node.op, ast.Add | ast.Sub | ast.Mult | ast.Div | ast.FloorDiv
    ):
        return node.value
    if (
        isinstance(node, ast.Assign)
        and len(node.targets) == 1
        and isinstance(node.value, ast.BinOp)
        and isinstance(node.value.op, ast.Add | ast.Sub)
    ):
        target = _text(node.targets[0])
        if _text(node.value.left) == target:
            return node.value.right
        if _text(node.value.right) == target:
            return node.value.left
    return None


def _counts_or_text(step: ast.expr) -> bool:
    if isinstance(step, ast.Constant):
        return True
    if isinstance(step, ast.JoinedStr):
        return True
    return isinstance(step, ast.Call) and _name_of(step.func) == "len"


def _loop_names(loop: ast.For | ast.AsyncFor | ast.While) -> set[str]:
    if isinstance(loop, ast.While):
        return set()
    return {node.id for node in ast.walk(loop.target) if isinstance(node, ast.Name)}


def _loop_problems(loop: ast.For | ast.AsyncFor | ast.While) -> list[int]:
    """Lines of the running totals a loop keeps while it skips missing values."""
    steps = [
        (node, step)
        for statement in loop.body
        for node in ast.walk(statement)
        if (step := _accumulation(node)) is not None and not _counts_or_text(step)
    ]
    if not steps:
        return []
    over_dropped = isinstance(loop, ast.For | ast.AsyncFor) and _drops_missing(loop.iter)
    missing = any(_is_missing_test(statement) for statement in loop.body)
    names = _loop_names(loop) | {_root_name(step) for _, step in steps} - {None}
    step_dumps = {_text(step) for _, step in steps}
    truthy = any(
        (isinstance(tested, ast.Name) and tested.id in names) or _text(tested) in step_dumps
        for statement in loop.body
        for node in ast.walk(statement)
        if isinstance(node, ast.If | ast.IfExp | ast.While)
        for tested in _tested(node.test)
    )
    if over_dropped or missing or truthy:
        return [node.lineno for node, _ in steps]
    return []


class _Scanner(ast.NodeVisitor):
    def __init__(self, path: str) -> None:
        self.path = path
        self.problems: list[Problem] = []
        self.reported_lines: set[tuple[int, str]] = set()

    def report(self, node: ast.AST | int, ban: str, message: str) -> None:
        line = node if isinstance(node, int) else getattr(node, "lineno", 0)
        if (line, ban) in self.reported_lines:
            return
        self.reported_lines.add((line, ban))
        self.problems.append(Problem(self.path, line, ban, message))

    def visit_Call(self, node: ast.Call) -> None:
        name = _name_of(node.func)
        if _is_number_builder_call(node):
            arguments = [*node.args, *(keyword.value for keyword in node.keywords)]
            if not arguments or not all(_is_literal(argument) for argument in arguments):
                self.report(
                    node,
                    "number-from-text",
                    f"{name}() reads a number here; the extractor never parses numbers "
                    "out of text (prompt 3 section 6). Emit the raw string with its "
                    "locator; the rule 8 parser in packages/registry reads it.",
                )
        if name not in TYPE_TAKERS:
            for argument in [*node.args, *(keyword.value for keyword in node.keywords)]:
                if isinstance(argument, ast.Name) and argument.id in NUMBER_BUILDERS:
                    self.report(
                        argument,
                        "number-from-text",
                        f"{argument.id} is passed as a converter; the extractor never parses "
                        "numbers out of text, and a default of int() or float() is a zero.",
                    )
        position = DEFAULT_TAKERS.get(name or "")
        default: ast.expr | None = None
        if isinstance(node.func, ast.Attribute) and position is not None:
            if len(node.args) > position:
                default = node.args[position]
            default = next(
                (keyword.value for keyword in node.keywords if keyword.arg == "default"), default
            )
        if isinstance(node.func, ast.Name) and name == "getattr" and len(node.args) > 2:
            default = node.args[2]
        if isinstance(node.func, ast.Name) and name == "next" and len(node.args) > 1:
            default = node.args[1]
        if _is_zero(default):
            self.report(
                node,
                "zero-default",
                f"{name}(..., 0) puts a zero where the value is missing; keep it missing "
                '(guardrails rule 1, "Unknown propagates").',
            )
        if name in AGGREGATES and node.args and _drops_missing(node.args[0]):
            self.report(
                node,
                "filtered-sum",
                f"{name}() over values that dropped the missing ones: unknown items vanish "
                'from the figure (guardrails rule 1, "Unknown propagates"). The extractor '
                "emits facts; the engine makes totals with its unknownPolicy.",
            )
        self.generic_visit(node)

    def visit_BoolOp(self, node: ast.BoolOp) -> None:
        if isinstance(node.op, ast.Or) and any(_is_zero(value) for value in node.values[1:]):
            self.report(
                node,
                "zero-fallback",
                "`or 0` puts a zero where the value is missing, or turns a real value into "
                'zero; keep it missing (guardrails rule 1, "Unknown propagates").',
            )
        self.generic_visit(node)

    def visit_IfExp(self, node: ast.IfExp) -> None:
        for zero, other in ((node.orelse, node.body), (node.body, node.orelse)):
            tested = _tested(node.test)
            if _is_zero(zero) and tested and _reads(other, tested):
                self.report(
                    node,
                    "zero-fallback",
                    "This conditional falls back to zero on the value it tests; keep it "
                    'missing (guardrails rule 1, "Unknown propagates").',
                )
        self.generic_visit(node)

    def _check_defaults(self, arguments: ast.arguments) -> None:
        for default in [*arguments.defaults, *arguments.kw_defaults]:
            if _is_zero(default):
                assert default is not None
                self.report(
                    default,
                    "zero-fallback",
                    "A default of zero puts a zero where the value is missing; leave the "
                    'default out (guardrails rule 1, "Unknown propagates").',
                )

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._check_defaults(node.args)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._check_defaults(node.args)
        self.generic_visit(node)

    def visit_Lambda(self, node: ast.Lambda) -> None:
        self._check_defaults(node.args)
        self.generic_visit(node)

    def _check_loop(self, node: ast.For | ast.AsyncFor | ast.While) -> None:
        for line in _loop_problems(node):
            self.report(
                line,
                "filtered-sum",
                "This loop adds into a running total while it skips missing values: unknown "
                'items vanish from the figure (guardrails rule 1, "Unknown propagates").',
            )
        self.generic_visit(node)

    def visit_For(self, node: ast.For) -> None:
        self._check_loop(node)

    def visit_AsyncFor(self, node: ast.AsyncFor) -> None:
        self._check_loop(node)

    def visit_While(self, node: ast.While) -> None:
        self._check_loop(node)


def scan_source(text: str, path: str = "<seed>") -> list[Problem]:
    """The ban problems in one Python source."""
    scanner = _Scanner(path)
    scanner.visit(ast.parse(text, filename=path))
    return sorted(scanner.problems, key=lambda problem: (problem.line, problem.ban))


def ban_folders(repo: Path = REPO) -> list[Path]:
    """The folders the "python-bans" scan reads, from the shared scan-roots list."""
    roots = json.loads((repo / SCAN_ROOTS).read_text("utf-8"))
    folders: list[Path] = []
    for top, entry in roots["topLevel"].items():
        if "python-bans" not in entry.get("scans", []):
            continue
        group = SUBFOLDER_GROUPS.get(top)
        if group is None:
            folders.append(repo / top)
            continue
        subfolders = [
            name for name, sub in roots[group].items() if "python-bans" in sub.get("scans", [])
        ]
        base = repo / top
        owners = sorted(path for path in base.iterdir() if path.is_dir()) if base.is_dir() else []
        folders.extend(owner / sub for owner in owners for sub in subfolders)
    return [folder for folder in folders if folder.is_dir()]


def scan_folders(folders: list[Path], repo: Path = REPO) -> tuple[int, list[Problem]]:
    """Every .py file under the folders: how many were read, and their problems."""
    files = sorted(
        path
        for folder in folders
        for path in folder.rglob("*.py")
        if not SKIPPED_PARTS.intersection(path.relative_to(folder).parts)
    )
    problems: list[Problem] = []
    for path in files:
        relative = path.relative_to(repo).as_posix() if path.is_relative_to(repo) else str(path)
        problems.extend(scan_source(path.read_text("utf-8"), relative))
    return len(files), problems


# Seeded inputs: each bad one must fail with its ban. TEST code, not extractor code.
SEEDED_BAD: dict[str, tuple[str, str]] = {
    "float-on-a-cell": ("number-from-text", "area = float(cell.text)\n"),
    "int-on-a-match": ("number-from-text", "floors = int(match.group(1))\n"),
    "decimal-on-text": ("number-from-text", "from decimal import Decimal\narea = Decimal(raw)\n"),
    "decimal-module": ("number-from-text", "import decimal\narea = decimal.Decimal(raw)\n"),
    "locale-atof": ("number-from-text", "import locale\narea = locale.atof(raw)\n"),
    "fraction": ("number-from-text", "from fractions import Fraction\nshare = Fraction(raw)\n"),
    "int-with-base": ("number-from-text", "tag = int(raw, 16)\n"),
    "float-of-nothing": ("number-from-text", "area = float()\n"),
    "map-float": ("number-from-text", "areas = list(map(float, cells))\n"),
    "defaultdict-int": (
        "number-from-text",
        "from collections import defaultdict\ncounts = defaultdict(int)\n",
    ),
    "or-zero": ("zero-fallback", "area = value or 0\n"),
    "or-zero-float": ("zero-fallback", "area = value or 0.0\n"),
    "or-zero-text": ("zero-fallback", "area = value or '0'\n"),
    "or-zero-decimal": ("zero-fallback", "area = value or Decimal(0)\n"),
    "or-zero-chain": ("zero-fallback", "area = first or second or 0\n"),
    "ternary-none": ("zero-fallback", "area = value if value is not None else 0\n"),
    "ternary-none-reversed": ("zero-fallback", "area = 0 if value is None else value\n"),
    "ternary-truthy": ("zero-fallback", "area = row.area if row.area else 0\n"),
    "ternary-isinstance": ("zero-fallback", "area = value if isinstance(value, float) else 0\n"),
    "default-zero": ("zero-fallback", "def area(value=0):\n    return value\n"),
    "keyword-default-zero": ("zero-fallback", "def area(*, value=0.0):\n    return value\n"),
    "get-zero": ("zero-default", "area = fields.get('area', 0)\n"),
    "get-zero-keyword": ("zero-default", "area = fields.get('area', default=0)\n"),
    "pop-zero": ("zero-default", "area = fields.pop('area', 0)\n"),
    "setdefault-zero": ("zero-default", "fields.setdefault('area', 0)\n"),
    "getattr-zero": ("zero-default", "area = getattr(row, 'area', 0)\n"),
    "next-zero": ("zero-default", "area = next(iter(values), 0)\n"),
    "sum-not-none": ("filtered-sum", "total = sum(v for v in values if v is not None)\n"),
    "sum-truthy": ("filtered-sum", "total = sum([v for v in values if v])\n"),
    "sum-attribute": ("filtered-sum", "total = sum(r.area for r in rows if r.area is not None)\n"),
    "sum-filter-none": ("filtered-sum", "total = sum(filter(None, values))\n"),
    "sum-filter-lambda": ("filtered-sum", "total = sum(filter(lambda v: v is not None, values))\n"),
    "max-filtered": ("filtered-sum", "peak = max(v for v in values if v is not None)\n"),
    "fsum-filtered": (
        "filtered-sum",
        "import math\ntotal = math.fsum(v for v in values if v is not None)\n",
    ),
    "loop-continue": (
        "filtered-sum",
        "total = start\nfor v in values:\n    if v is None:\n        continue\n    total += v\n",
    ),
    "loop-if": (
        "filtered-sum",
        "total = start\nfor v in values:\n    if v is not None:\n        total = total + v\n",
    ),
    "loop-truthy": (
        "filtered-sum",
        "total = start\nfor v in values:\n    if v:\n        total += v\n",
    ),
    "loop-over-filtered": (
        "filtered-sum",
        "total = start\nfor v in (x for x in values if x is not None):\n    total += v\n",
    ),
}

SEEDED_GOOD: dict[str, str] = {
    "literal-conversions": "limit = int('3')\nratio = float('nan')\nexact = Decimal('1.5')\n",
    "type-checks": "ok = isinstance(value, int) or isinstance(value, float)\n",
    "annotations": "def read(cell: str) -> float | None:\n    return None\n",
    "flag-default": "def read(strict=False, retries=1):\n    return strict, retries\n",
    "or-fallback-text": "label = value or 'Unknown'\n",
    "get-none": "area = fields.get('area')\n",
    "counting-loop": (
        "count = start\nfor page in pages:\n    if page is None:\n        continue\n"
        "    count += 1\n"
    ),
    "length-loop": "chars = start\nfor line in lines:\n    if line is None:\n        continue\n"
    "    chars += len(line)\n",
    "text-loop": "out = ''\nfor part in parts:\n    if part is None:\n        continue\n"
    "    out += f'{part};'\n",
    "len-of-filtered": "known = len([v for v in values if v is not None])\n",
    "sum-unfiltered": "pages = sum(1 for page in pages)\n",
    "filter-on-a-flag": "shown = sum(r.width for r in filter(lambda r: r.visible, rows))\n",
    "flag-ternary": "count = row.count if row.visible else 0\n",
}


def scope_problems(files: int) -> list[str]:
    """The bans never pass on nothing (phase 0 review, finding 17)."""
    return [] if files > 0 else ["no Python file was read; the bans never pass on nothing"]


def test_the_extractor_source_holds_no_banned_form() -> None:
    files, problems = scan_folders(ban_folders())
    assert scope_problems(files) == []
    assert [str(problem) for problem in problems] == []


def test_the_scan_reads_the_shared_scan_roots_list() -> None:
    folders = ban_folders()
    assert REPO / "services" / "extractor" / "src" in folders
    assert all(folder.name == "src" for folder in folders)


def test_an_empty_scope_is_not_a_pass(tmp_path: Path) -> None:
    files, problems = scan_folders([tmp_path], repo=tmp_path)
    assert (files, problems) == (0, [])
    assert scope_problems(files) != []


@pytest.mark.parametrize(("name", "ban", "code"), [(k, *v) for k, v in SEEDED_BAD.items()])
def test_seeded_bad_input_fails_with_its_ban(name: str, ban: str, code: str) -> None:
    bans = {problem.ban for problem in scan_source(code, f"<seed {name}>")}
    assert ban in bans, f"seeded {name}: {ban} found nothing"


@pytest.mark.parametrize(("name", "code"), list(SEEDED_GOOD.items()))
def test_seeded_good_input_passes(name: str, code: str) -> None:
    assert [str(problem) for problem in scan_source(code, f"<seed {name}>")] == []
