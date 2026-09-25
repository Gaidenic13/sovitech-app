/**
 * Finds and classifies the guardrail case files (guardrails section 7):
 * - T cases: tests/guardrails/<ID>.test.ts (or .test.tsx), at the top level;
 * - E cases: evals/guardrails/<ID>.yaml, at the top level.
 *
 * Each case file is one of:
 * - `real`: a T case that runs; an E case only with a current 5-of-5 run
 *   (eval-runs.ts), so none before the phase 2 eval runner exists;
 * - `pending`: a real case held out of the green run: a T file that imports
 *   tests/guardrails/_support/pending.ts (directly or through another _support
 *   module) and whose first line is the domain's `// @pending-until: phase <n>
 *   <feature>` marker; and, until the eval runner exists, every E file that holds
 *   the full eval body (fixture, task, assertions, samples: 5). The import and the
 *   marker go together: either one without the other, or a marker that breaks the
 *   grammar of `parsePendingMarker` (@sovitech/domain), is a `[pending]` problem,
 *   and the file still counts as pending, never as real;
 * - `stub`: a placeholder carrying STUB_MARKER (or, for evals, `status: stub`);
 * - `malformed`: a file that breaks a case-file rule that decides whether it runs:
 *   a T file that holds a test out without the wrapper (`[held out]`), registers a
 *   test with an empty body (`[empty]`), names the domain's NotImplementedError
 *   (`[pending]`), asserts vacuously (`[vacuous]`: `expect(x)` with no matcher,
 *   `expect.assertions(0)`, `.toThrow()` naming no error), uses an unreviewed test
 *   double (`[test double]`: `vi.mock`, `vi.doMock`, `vi.stubGlobal`, `vi.stubEnv`,
 *   `vi.resetModules`, `vi.importActual`, `vi.importMock`, a spy with an
 *   implementation of its own or on project code) or imports a faulty support
 *   module (`[support]`); an E file that does not parse, names another id,
 *   carries an unknown status or lacks the full eval body (`[eval]`).
 * A stub or a malformed file is never a case: the index check lists its id as
 * "no automated check yet" (docs/adr/0003-index-check-convention.md).
 *
 * T files are read with the TypeScript parser, not by text patterns, so a test
 * held out through an options object (`{ skip: true }`), a computed or
 * destructured modifier (`test['skip']`, `const { skip } = test`) or a
 * describe-level option is seen. The Vitest run guard
 * (tools/vitest/guardrail-run-guard.ts) checks the same thing on the results of
 * the run. Detection errs on the side of "not running": text that only looks like
 * a pending import or a stub marker still makes the file pending or a stub, so a
 * held-out case can never be counted as a real one.
 */
import { existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import ts from 'typescript';
import { PENDING_MARKER_PREFIX, parsePendingMarker } from '@sovitech/domain';
import { parseDocument } from 'yaml';
import { listFiles } from '../lib';
import { NO_EVAL_RUNNER, evalResultGaps, type EvalRunEvidence } from './eval-runs';
import { CASE_DIRS, type CaseType } from './guardrail-index';
import {
  PENDING_WRAPPER,
  T_SUPPORT_DIR,
  importsPendingWrapper,
  namesId,
  supportModulesReached,
  type ReadFile,
} from './wrapper-imports';

export {
  PENDING_WRAPPER,
  T_SUPPORT_DIR,
  fileReader,
  importSpecifiers,
  importsPendingWrapper,
  namesId,
  supportModulesReached,
  type ReadFile,
} from './wrapper-imports';

/** Marks a generated placeholder (tools/checks/index/generate-stubs.ts). */
export const STUB_MARKER = '@guardrail-stub';

/** How many times an eval is sampled; it passes only at 5 of 5 (guardrails section 7). */
export const EVAL_SAMPLES = 5;

/** Where an eval's synthetic fixture lives (prompt 3 section 14, item 3). */
export const EVAL_FIXTURE_DIR = 'fixtures/evals';

export type CaseStatus = 'real' | 'pending' | 'stub' | 'malformed';

export interface ClassifiedCase {
  status: CaseStatus;
  /** Each as "<path>:<line>: [<kind>] <what>". */
  problems: string[];
  /** Keys (`testDoubleKey`) of the reviewed-list entries this file used. */
  reviewedUsed?: string[];
}

/** Whether a root-relative path (file or folder) exists. */
export type PathExists = (rootRelativePath: string) => boolean;

/** What a path under the case folders is. */
export type PathOutcome =
  | { kind: 'ignore' }
  | { kind: 'case'; id: string; type: CaseType }
  | { kind: 'problem'; message: string };

/** A case file found on disk, before its content is read. */
export interface ListedCaseFile {
  id: string;
  type: CaseType;
  /** Root-relative path with forward slashes. */
  path: string;
}

const T_NAME = /^(.+)\.test\.tsx?$/;
const E_NAME = /^(.+)\.yaml$/;

/** Vitest's test and suite modifiers that keep a test out of the run, or run it inverted. */
const HOLD_OUT_MODIFIERS: ReadonlySet<string> = new Set(['skip', 'skipIf', 'runIf', 'todo', 'only', 'fails']);
/** Keys of Vitest's test and suite options that do the same. */
const HOLD_OUT_OPTIONS: ReadonlySet<string> = new Set(['skip', 'todo', 'fails', 'only']);
/** Vitest's registration functions, by their usual names. */
const TEST_API_NAMES: readonly string[] = ['test', 'it', 'describe', 'suite', 'bench'];
/** Registration functions whose callback is one test (describe and suite hold tests). */
const TEST_REGISTRARS: readonly string[] = ['test', 'it', 'bench'];
/** Names a case file never uses: only a domain stub throws NotImplementedError. */
const NOT_IMPLEMENTED_NAMES: ReadonlySet<string> = new Set(['NotImplementedError', 'declareNotImplemented']);
/**
 * Members of `vi` that replace code, the environment or the module graph under a
 * case: a case that mocks the code it tests proves nothing about that code, and a
 * second copy of the domain would hide its stubs from the stub guard
 * (tools/vitest/guardrail-stub-guard.ts). Allowed only through the reviewed list.
 */
const VI_DOUBLE_CALLS: ReadonlySet<string> = new Set([
  'mock',
  'doMock',
  'stubGlobal',
  'stubEnv',
  'resetModules',
  'importActual',
  'importMock',
]);
/** Methods that give a spy an implementation of its own, so it no longer runs the code it spies on. */
const MOCK_IMPLEMENTATION_METHODS: ReadonlySet<string> = new Set([
  'mockImplementation',
  'mockImplementationOnce',
  'mockReturnValue',
  'mockReturnValueOnce',
  'mockResolvedValue',
  'mockResolvedValueOnce',
  'mockRejectedValue',
  'mockRejectedValueOnce',
  'mockReturnThis',
  'mockThrow',
  'mockThrowOnce',
  'withImplementation',
]);
/** `expect` members whose call takes a subject and needs a matcher after it. */
const EXPECT_SUBJECT_MEMBERS: ReadonlySet<string> = new Set(['soft', 'poll']);
/** Matchers that pass on any error when they name none. */
const THROW_MATCHERS: ReadonlySet<string> = new Set(['toThrow', 'toThrowError']);

/**
 * The reviewed list of test doubles a case or support module may use
 * (reviewed-test-doubles.json, next to this file). Empty in phase 0. Each entry
 * names the file, the call (`vi.mock`, `vi.stubEnv`, ...) and its target (the
 * module specifier, the variable, or `<object>.<method>` for a spy), and why.
 */
export const REVIEWED_TEST_DOUBLES_FILE = 'tools/checks/index/reviewed-test-doubles.json';

/** One entry of the reviewed list. */
export interface ReviewedTestDouble {
  path: string;
  call: string;
  target: string;
  reason: string;
}

/** The key a finding and a reviewed entry share. */
export function testDoubleKey(entry: { path: string; call: string; target: string }): string {
  return `${entry.path} ${entry.call} ${entry.target}`;
}

/**
 * Says what a root-relative path under tests/guardrails/ or evals/guardrails/ is.
 * Paths elsewhere are ignored.
 */
export function classifyCasePath(path: string): PathOutcome {
  for (const type of ['T', 'E'] as const) {
    const dir = CASE_DIRS[type];
    if (!path.startsWith(`${dir}/`)) continue;
    const segments = path.slice(dir.length + 1).split('/');
    const name = segments[0] ?? '';
    if (segments.length > 1) {
      // T support code lives in _support/ (not collected by Vitest). Eval
      // support data may live in any folder whose name starts with "_".
      if (type === 'T' ? name === '_support' : name.startsWith('_')) return { kind: 'ignore' };
      if (name.startsWith('.')) return { kind: 'ignore' };
      const support = type === 'T' ? `${T_SUPPORT_DIR}/` : `${dir}/_<name>/`;
      return {
        kind: 'problem',
        message: `[layout] case files live at the top level of ${dir}/, and support files under ${support}`,
      };
    }
    if (name.startsWith('.') || name === 'README.md') return { kind: 'ignore' };
    const match = (type === 'T' ? T_NAME : E_NAME).exec(name);
    if (match?.[1] === undefined) {
      const form = type === 'T' ? '<ID>.test.ts' : '<ID>.yaml';
      return { kind: 'problem', message: `[layout] not a case file name; ${dir}/ holds ${form} files only` };
    }
    return { kind: 'case', id: match[1], type };
  }
  return { kind: 'ignore' };
}

/** Lists the case files under `root`, and the paths that are neither case files nor ignorable. */
export async function listCaseFiles(root: string): Promise<{ files: ListedCaseFile[]; problems: string[] }> {
  const paths = await listFiles([`${CASE_DIRS.T}/**`, `${CASE_DIRS.E}/**`], { cwd: root });
  const files: ListedCaseFile[] = [];
  const problems: string[] = [];
  for (const path of paths) {
    const outcome = classifyCasePath(path);
    if (outcome.kind === 'case') files.push({ id: outcome.id, type: outcome.type, path });
    else if (outcome.kind === 'problem') problems.push(`${path}:1: ${outcome.message}`);
  }
  return { files, problems };
}

/** Whether a path under `root` exists, as a file or a folder. */
export function pathChecker(root: string): PathExists {
  return (path) => existsSync(join(root, path));
}

// ---------------------------------------------------------------------------
// Reading a T case file with the TypeScript parser
// ---------------------------------------------------------------------------

/** One finding in a T case file's source, with its 1-based line. */
export interface SourceFinding {
  line: number;
  what: string;
}

/** A test double found in the source: the call (`vi.mock`, ...) and its target. */
export interface TestDoubleFinding extends SourceFinding {
  call: string;
  /** The module specifier, variable or `<object>.<method>` it replaces; `<computed>` when code computes it. */
  target: string;
}

/** What the TypeScript parser finds in a T case file. */
export interface CaseSourceFacts {
  /** The text of every string and template literal (a template's parts, joined). */
  strings: string[];
  /** Tests or suites held out of the run, or run inverted. */
  heldOut: SourceFinding[];
  /** Tests registered with a body that does nothing. */
  empty: SourceFinding[];
  /** Uses of the domain's NotImplementedError or its declaration function. */
  notImplemented: SourceFinding[];
  /**
   * Assertions that prove nothing: `expect(...)` with no matcher after it (Vitest
   * counts the call itself, so expect.requireAssertions lets it through),
   * `expect.assertions(0)` or a count computed from code, and `.toThrow()` naming
   * no error (it passes on any error, an unbuilt stub's included).
   */
  vacuous: SourceFinding[];
  /** Test doubles that replace the code under test, the environment or the module graph. */
  testDoubles: TestDoubleFinding[];
  /** Code that swallows errors: a catch clause, `.catch(...)`, a two-argument `.then`, `Promise.allSettled`. */
  swallows: SourceFinding[];
}

/** The text of a literal the parser can read without running code, or undefined. */
function literalText(node: ts.Node): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  if (ts.isParenthesizedExpression(node)) return literalText(node.expression);
  return undefined;
}

/** The name of a property or destructuring key: `skip`, `'skip'`, `['skip']`; undefined when computed from code. */
function keyText(name: ts.PropertyName | ts.BindingName): string | undefined {
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) return name.text;
  if (ts.isComputedPropertyName(name)) return literalText(name.expression);
  return undefined;
}

/** The identifier an expression chain starts from: `test` in `test.concurrent.each(x)('t', fn)`. */
function rootIdentifier(node: ts.Expression): string | undefined {
  let current: ts.Expression = node;
  for (;;) {
    if (ts.isIdentifier(current)) return current.text;
    if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) current = current.expression;
    else if (ts.isCallExpression(current) || ts.isNonNullExpression(current) || ts.isParenthesizedExpression(current)) {
      current = current.expression;
    } else if (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isTypeAssertionExpression(current)) {
      current = current.expression;
    } else return undefined;
  }
}

/** True when a test body does nothing: `() => {}`, `() => undefined`, `() => void 0`, `() => 1`. */
function isEmptyBody(fn: ts.ArrowFunction | ts.FunctionExpression): boolean {
  const body = fn.body;
  if (ts.isBlock(body)) return body.statements.length === 0;
  let expression: ts.Expression = body;
  while (ts.isParenthesizedExpression(expression)) expression = expression.expression;
  if (ts.isIdentifier(expression) && expression.text === 'undefined') return true;
  if (ts.isVoidExpression(expression)) return literalText(expression.expression) !== undefined;
  return (
    literalText(expression) !== undefined ||
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword ||
    expression.kind === ts.SyntaxKind.NullKeyword
  );
}

/**
 * The names under which a file reaches Vitest's registration functions: the
 * usual names, import aliases (`import { test as t }`, `import * as v`), and
 * locals bound to one of them (`const t = test`, `const my = test.extend(...)`).
 * `registrars` are those that register one test, plus locals bound to the
 * wrapper's `pendingCase(...)`.
 */
function collectTestNames(file: ts.SourceFile): { api: Set<string>; registrars: Set<string> } {
  const api = new Set(TEST_API_NAMES);
  const registrars = new Set(TEST_REGISTRARS);
  const aliases: Array<{ name: string; initializer: ts.Expression }> = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && literalText(node.moduleSpecifier) === 'vitest') {
      const bindings = node.importClause?.namedBindings;
      if (bindings !== undefined && ts.isNamespaceImport(bindings)) api.add(bindings.name.text);
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          const imported = (element.propertyName ?? element.name).text;
          if (TEST_API_NAMES.includes(imported)) api.add(element.name.text);
          if (TEST_REGISTRARS.includes(imported)) registrars.add(element.name.text);
        }
      }
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      aliases.push({ name: node.name.text, initializer: node.initializer });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  // Aliases of aliases: repeat until nothing new is found.
  for (let changed = true; changed; ) {
    changed = false;
    for (const alias of aliases) {
      const root = rootIdentifier(alias.initializer);
      const isPendingCase = ts.isCallExpression(alias.initializer) && root === 'pendingCase';
      if (root !== undefined && (api.has(root) || isPendingCase)) {
        if (!api.has(alias.name) && !isPendingCase) {
          api.add(alias.name);
          changed = true;
        }
        if (!registrars.has(alias.name) && (registrars.has(root) || isPendingCase)) {
          registrars.add(alias.name);
          changed = true;
        }
      }
    }
  }
  return { api, registrars };
}

/** How a file reaches `expect`, `vi` and the modules it imports. */
interface VitestNames {
  /** Names bound to Vitest's `expect`: the import, aliases, and a test context's `{ expect }`. */
  expect: Set<string>;
  /** Names bound to Vitest's `vi`. */
  vi: Set<string>;
  /** Namespace imports of 'vitest' (`import * as v from 'vitest'`, then `v.expect`, `v.vi`). */
  namespaces: Set<string>;
  /** Every imported local name, with the module specifier it comes from. */
  imports: Map<string, string>;
  /** Locals bound to a `vi.spyOn(...)` spy. */
  spies: Set<string>;
  /** The `vi.spyOn(...)` call each spy local is bound to. */
  spyCalls: Map<string, ts.CallExpression>;
}

/** Strips parentheses, `!`, `as`, `satisfies` and `await` around an expression. */
function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  for (;;) {
    if (
      ts.isParenthesizedExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isAwaitExpression(current)
    ) {
      current = current.expression;
    } else return current;
  }
}

/** The member name of `a.b` or `a['b']`; `<computed>` when code computes it; undefined for anything else. */
function memberName(node: ts.Expression): string | undefined {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node)) return literalText(node.argumentExpression) ?? '<computed>';
  return undefined;
}

function isVitestRef(node: ts.Expression, names: VitestNames, member: 'expect' | 'vi'): boolean {
  const expression = unwrap(node);
  if (ts.isIdentifier(expression)) return names[member].has(expression.text);
  if ((ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) && memberName(expression) === member) {
    const object = unwrap(expression.expression);
    return ts.isIdentifier(object) && names.namespaces.has(object.text);
  }
  return false;
}

/** True when a call is `vi.spyOn(...)` on a name bound to `vi`. */
function isSpyOnCall(node: ts.Node, names: VitestNames): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false;
  const callee = unwrap(node.expression);
  return memberName(callee) === 'spyOn' && isVitestRef((callee as ts.PropertyAccessExpression).expression, names, 'vi');
}

function collectVitestNames(file: ts.SourceFile): VitestNames {
  const names: VitestNames = {
    expect: new Set(['expect']),
    vi: new Set(['vi']),
    namespaces: new Set(),
    imports: new Map(),
    spies: new Set(),
    spyCalls: new Map(),
  };
  const aliases: Array<{ name: string; initializer: ts.Expression }> = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const specifier = literalText(node.moduleSpecifier) ?? '';
      const clause = node.importClause;
      if (clause?.name !== undefined) names.imports.set(clause.name.text, specifier);
      const bindings = clause?.namedBindings;
      if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
        names.imports.set(bindings.name.text, specifier);
        if (specifier === 'vitest') names.namespaces.add(bindings.name.text);
      }
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          names.imports.set(element.name.text, specifier);
          const imported = (element.propertyName ?? element.name).text;
          if (specifier === 'vitest' && imported === 'expect') names.expect.add(element.name.text);
          if (specifier === 'vitest' && imported === 'vi') names.vi.add(element.name.text);
        }
      }
    }
    // A test context's `{ expect }`, `{ expect: local }`; `const { vi } = await import('vitest')`.
    if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent) && ts.isIdentifier(node.name)) {
      const key = keyText(node.propertyName ?? node.name);
      if (key === 'expect') names.expect.add(node.name.text);
      if (key === 'vi') names.vi.add(node.name.text);
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      aliases.push({ name: node.name.text, initializer: node.initializer });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  // Aliases (`const e = expect`, `const v = vitest.vi`) and spies, until nothing new is found.
  for (let changed = true; changed; ) {
    changed = false;
    for (const alias of aliases) {
      for (const member of ['expect', 'vi'] as const) {
        if (!names[member].has(alias.name) && isVitestRef(alias.initializer, names, member)) {
          names[member].add(alias.name);
          changed = true;
        }
      }
      const spyCall = unwrap(alias.initializer);
      if (!names.spies.has(alias.name) && isSpyOnCall(spyCall, names)) {
        names.spies.add(alias.name);
        names.spyCalls.set(alias.name, spyCall);
        changed = true;
      }
    }
  }
  return names;
}

/** True when a call takes an `expect` subject: `expect(x)`, `expect.soft(x)`, `expect.poll(fn)`, `v.expect(x)`. */
function isExpectSubjectCall(node: ts.CallExpression, names: VitestNames): boolean {
  const callee = unwrap(node.expression);
  if (isVitestRef(callee, names, 'expect')) return true;
  const member = memberName(callee);
  return (
    member !== undefined &&
    EXPECT_SUBJECT_MEMBERS.has(member) &&
    isVitestRef((callee as ts.PropertyAccessExpression).expression, names, 'expect')
  );
}

/**
 * True when an `expect(...)` call is followed by a matcher that is called:
 * `expect(x).toBe(1)`, `expect(x).not.toBe(1)`, `await expect(p).rejects.toThrow(E)`.
 */
function hasMatcherCall(call: ts.CallExpression): boolean {
  let current: ts.Node = call;
  for (;;) {
    const parent = current.parent;
    if (
      ts.isParenthesizedExpression(parent) ||
      ts.isNonNullExpression(parent) ||
      ts.isAsExpression(parent) ||
      ts.isSatisfiesExpression(parent)
    ) {
      current = parent;
      continue;
    }
    if ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === current) {
      const grand = parent.parent;
      if (ts.isCallExpression(grand) && grand.expression === parent) return true;
      current = parent;
      continue;
    }
    return false;
  }
}

/** True when an expression chain holds an `expect(...)` subject call: `expect(fn).not.toThrow` holds one. */
function chainHasExpectCall(node: ts.Expression, names: VitestNames): boolean {
  let current: ts.Expression = unwrap(node);
  for (;;) {
    if (ts.isCallExpression(current)) {
      if (isExpectSubjectCall(current, names)) return true;
      current = unwrap(current.expression);
    } else if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
      current = unwrap(current.expression);
    } else return false;
  }
}

/** The target text of a test double's first argument: a literal, `import('x')`, a name, or `<computed>`. */
function doubleTarget(argument: ts.Expression | undefined, file: ts.SourceFile): string {
  if (argument === undefined) return '';
  const inner = unwrap(argument);
  const literal = literalText(inner);
  if (literal !== undefined) return literal;
  if (ts.isCallExpression(inner) && inner.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const specifier = inner.arguments[0];
    return specifier === undefined ? '<computed>' : (literalText(specifier) ?? '<computed>');
  }
  if (ts.isIdentifier(inner) || ts.isPropertyAccessExpression(inner)) return inner.getText(file);
  return '<computed>';
}

/** True when a module specifier is app or package code rather than test support or a third-party tool. */
function isProjectCode(specifier: string | undefined): boolean {
  if (specifier === undefined) return false;
  if (specifier.startsWith('@sovitech/')) return true;
  return specifier.startsWith('.') && !/(^|\/)_support(\/|$)/.test(specifier);
}

/** Reads a T case file's source with the TypeScript parser. */
export function analyseCaseSource(path: string, text: string): CaseSourceFacts {
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const { api, registrars } = collectTestNames(file);
  const vitest = collectVitestNames(file);
  const facts: CaseSourceFacts = {
    strings: [],
    heldOut: [],
    empty: [],
    notImplemented: [],
    vacuous: [],
    testDoubles: [],
    swallows: [],
  };
  const lineOf = (node: ts.Node): number => file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
  const holdOut = (node: ts.Node, what: string): void => {
    facts.heldOut.push({ line: lineOf(node), what });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) facts.strings.push(node.text);
    if (ts.isTemplateExpression(node)) {
      facts.strings.push([node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' '));
    }

    // test.skip(...), it.todo(...), describe.only(...), context.skip(), test.skipIf(x)(...)
    if (ts.isPropertyAccessExpression(node) && HOLD_OUT_MODIFIERS.has(node.name.text)) {
      holdOut(node.name, `".${node.name.text}"`);
    }

    // test['skip'](...), and test[name](...) where the modifier is computed
    if (ts.isElementAccessExpression(node)) {
      const key = literalText(node.argumentExpression);
      if (key !== undefined && HOLD_OUT_MODIFIERS.has(key)) holdOut(node, `"[${JSON.stringify(key)}]"`);
      else if (key === undefined) {
        const root = rootIdentifier(node.expression);
        if (root !== undefined && api.has(root)) holdOut(node, `a modifier of "${root}" computed from code`);
      }
    }

    // const { skip } = test;  ({ skip }) => skip();  const { ['todo']: t } = it;
    if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
      const key = keyText(node.propertyName ?? node.name);
      if (key !== undefined && HOLD_OUT_MODIFIERS.has(key)) holdOut(node, `the destructured modifier "${key}"`);
      else if (key === undefined && node.propertyName !== undefined) {
        const declaration = node.parent.parent;
        const initializer = ts.isVariableDeclaration(declaration) ? declaration.initializer : undefined;
        const root = initializer === undefined ? undefined : rootIdentifier(initializer);
        if (root !== undefined && api.has(root)) holdOut(node, `a modifier of "${root}" destructured under a computed key`);
      }
    }

    // test('x', { skip: true }, fn), describe('x', { todo: true }, fn), const options = { fails: true }
    if (ts.isObjectLiteralExpression(node)) {
      const inCall = ts.isCallExpression(node.parent) && node.parent.arguments.includes(node);
      const callRoot = inCall ? rootIdentifier(node.parent.expression) : undefined;
      for (const property of node.properties) {
        if (ts.isSpreadAssignment(property)) continue;
        const key = keyText(property.name);
        if (key !== undefined && HOLD_OUT_OPTIONS.has(key)) {
          const value = ts.isPropertyAssignment(property) ? property.initializer : undefined;
          if (value === undefined || value.kind !== ts.SyntaxKind.FalseKeyword) {
            holdOut(property, `the option "${key}" (an options object holds the test or suite out; rename the key if it is test data)`);
          }
        } else if (key === undefined && callRoot !== undefined && api.has(callRoot)) {
          holdOut(property, `an option of "${callRoot}" under a computed key`);
        }
      }
    }

    // A test registered with a body that does nothing.
    if (ts.isCallExpression(node)) {
      const root = rootIdentifier(node.expression);
      if (root !== undefined && registrars.has(root)) {
        for (const argument of node.arguments) {
          if ((ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) && isEmptyBody(argument)) {
            facts.empty.push({ line: lineOf(argument), what: `a test registered through "${root}"` });
          }
        }
      }
    }

    if (ts.isIdentifier(node) && NOT_IMPLEMENTED_NAMES.has(node.text)) {
      facts.notImplemented.push({ line: lineOf(node), what: node.text });
    }

    if (ts.isCallExpression(node)) findInCall(node);

    // const { mock } = vi;  const { spyOn: s } = vitest.vi
    if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
      const key = keyText(node.propertyName ?? node.name);
      const declaration = node.parent.parent;
      const initializer = ts.isVariableDeclaration(declaration) ? declaration.initializer : undefined;
      if (initializer !== undefined && isVitestRef(initializer, vitest, 'vi')) {
        if (key === undefined || VI_DOUBLE_CALLS.has(key) || key === 'spyOn') {
          facts.testDoubles.push({ line: lineOf(node), what: `vi.${key ?? '<computed>'} taken out of vi`, call: `vi.${key ?? '<computed>'}`, target: '<destructured>' });
        }
      }
    }

    if (ts.isTryStatement(node) && node.catchClause !== undefined) {
      facts.swallows.push({ line: lineOf(node.catchClause), what: 'a catch clause' });
    }

    ts.forEachChild(node, visit);
  };

  const snippet = (node: ts.Node): string => {
    const text = node.getText(file).replace(/\s+/g, ' ');
    return text.length > 60 ? `${text.slice(0, 57)}...` : text;
  };
  const spyTarget = (call: ts.CallExpression): string =>
    `${doubleTarget(call.arguments[0], file)}.${call.arguments[1] === undefined ? '' : (literalText(call.arguments[1]) ?? '<computed>')}`;

  /** Vacuous assertions, test doubles and swallowed errors in one call. */
  function findInCall(node: ts.CallExpression): void {
    const callee = unwrap(node.expression);
    const member = memberName(callee);
    const object =
      ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee) ? callee.expression : undefined;

    // expect(x) with no matcher called after it.
    if (isExpectSubjectCall(node, vitest) && !hasMatcherCall(node)) {
      facts.vacuous.push({
        line: lineOf(node),
        what:
          `"${snippet(node)}" has no matcher after it, so it asserts nothing; Vitest counts the call itself, ` +
          'so expect.requireAssertions lets it through',
      });
    }
    // expect.assertions(0), or a count computed from code.
    if (member === 'assertions' && object !== undefined && isVitestRef(object, vitest, 'expect')) {
      const argument = node.arguments[0];
      const count = argument === undefined ? undefined : literalText(argument);
      if (count === undefined || !/^[1-9][0-9]*$/.test(count)) {
        facts.vacuous.push({
          line: lineOf(node),
          what: `"${snippet(node)}" expects no assertion, or a count computed from code; a case asserts, so its count is a literal above zero`,
        });
      }
    }
    // .toThrow() naming no error: it passes on any error, an unbuilt stub's NotImplementedError included.
    if (member !== undefined && THROW_MATCHERS.has(member) && object !== undefined && chainHasExpectCall(object, vitest)) {
      const argument = node.arguments[0] === undefined ? undefined : unwrap(node.arguments[0]);
      if (argument === undefined || (ts.isIdentifier(argument) && argument.text === 'undefined')) {
        facts.vacuous.push({
          line: lineOf(node),
          what:
            `"${snippet(node)}" names no error, so it passes on any error, an unbuilt stub's NotImplementedError or a ` +
            'TypeError from a wrong call included; name the error class or message, or assert on the returned verdict',
        });
      }
    }

    // vi.mock(...), vi.doMock(...), vi.stubEnv(...), vi.resetModules(), vi[name](...)
    if (member !== undefined && object !== undefined && isVitestRef(object, vitest, 'vi')) {
      if (member === '<computed>' || VI_DOUBLE_CALLS.has(member)) {
        const call = `vi.${member}`;
        facts.testDoubles.push({ line: lineOf(node), what: `"${snippet(node)}"`, call, target: doubleTarget(node.arguments[0], file) });
      } else if (member === 'spyOn') {
        const root = node.arguments[0] === undefined ? undefined : rootIdentifier(node.arguments[0]);
        const onProjectCode = root !== undefined && isProjectCode(vitest.imports.get(root));
        const parent = node.parent;
        const chained =
          (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) &&
          parent.expression === node &&
          MOCK_IMPLEMENTATION_METHODS.has(memberName(parent) ?? '');
        if (onProjectCode || chained) {
          const shown = chained ? parent.parent : node;
          facts.testDoubles.push({ line: lineOf(node), what: `"${snippet(shown)}"`, call: 'vi.spyOn', target: spyTarget(node) });
        }
      }
    }
    // spy.mockImplementation(...) on a local bound to vi.spyOn(...)
    if (member !== undefined && MOCK_IMPLEMENTATION_METHODS.has(member) && object !== undefined) {
      const spy = unwrap(object);
      if (ts.isIdentifier(spy) && vitest.spies.has(spy.text)) {
        const call = vitest.spyCalls.get(spy.text);
        facts.testDoubles.push({
          line: lineOf(node),
          what: `"${snippet(node)}"`,
          call: 'vi.spyOn',
          target: call === undefined ? spy.text : spyTarget(call),
        });
      }
    }

    // Swallowed errors: .catch(...), .then(onFulfilled, onRejected), Promise.allSettled(...)
    if (member === 'catch' && object !== undefined) facts.swallows.push({ line: lineOf(node), what: `"${snippet(node)}"` });
    if (member === 'then' && node.arguments.length >= 2) {
      facts.swallows.push({ line: lineOf(node), what: `"${snippet(node)}" (a rejection handler)` });
    }
    if (member === 'allSettled' && object !== undefined && ts.isIdentifier(unwrap(object)) && (unwrap(object) as ts.Identifier).text === 'Promise') {
      facts.swallows.push({ line: lineOf(node), what: `"${snippet(node)}"` });
    }
  }

  visit(file);
  return facts;
}

/** What the index check knows beyond a case file's own text. */
export interface TestCaseOptions {
  /** The reviewed list of test doubles (REVIEWED_TEST_DOUBLES_FILE); empty when absent. */
  reviewed?: readonly ReviewedTestDouble[];
  /**
   * Faults of modules under tests/guardrails/_support/, by root-relative path
   * (`supportModuleFaults`). When absent, the modules the file reaches are read
   * through `readFile` and checked here.
   */
  supportFaults?: ReadonlyMap<string, readonly string[]>;
}

const VACUOUS_ADVICE = 'a case proves its Expected cell with a matcher on the code under test\'s result';

function vacuousProblem(path: string, finding: SourceFinding, kind: string): string {
  return `${path}:${finding.line}: [${kind}] ${finding.what}; ${VACUOUS_ADVICE}`;
}

function testDoubleProblem(path: string, finding: TestDoubleFinding, kind: string): string {
  return (
    `${path}:${finding.line}: [${kind}] ${finding.what} is a test double (${finding.call}, target ` +
    `${JSON.stringify(finding.target)}): a case that mocks or stubs the code under test, the environment or the ` +
    'module graph proves nothing about that code, and a second copy of the domain hides its stubs from the stub ' +
    `guard; only a reviewed entry in ${REVIEWED_TEST_DOUBLES_FILE} allows one`
  );
}

/** Splits test-double findings into reviewed ones (their keys) and the others. */
function reviewTestDoubles(
  path: string,
  findings: readonly TestDoubleFinding[],
  reviewed: readonly ReviewedTestDouble[],
): { unreviewed: TestDoubleFinding[]; used: string[] } {
  const allowed = new Set(reviewed.map(testDoubleKey));
  const unreviewed: TestDoubleFinding[] = [];
  const used: string[] = [];
  for (const finding of findings) {
    const key = testDoubleKey({ path, call: finding.call, target: finding.target });
    if (allowed.has(key)) used.push(key);
    else unreviewed.push(finding);
  }
  return { unreviewed, used };
}

/**
 * The faults of one module under tests/guardrails/_support/, each a `[support]`
 * problem: a support helper runs inside a case, so what disqualifies a case file
 * disqualifies it too. It may not swallow errors (a catch clause, `.catch`, a
 * rejection handler, `Promise.allSettled`), hold a test out, register an empty
 * test, assert vacuously, use an unreviewed test double, or name the domain's
 * NotImplementedError. The pending wrapper itself is the one module that catches
 * (only to tell the stub's error from any other) and skips (only with its record
 * and note), so those two rules do not apply to it.
 */
export function supportModuleFaults(
  path: string,
  text: string,
  reviewed: readonly ReviewedTestDouble[] = [],
): { problems: string[]; reviewedUsed: string[] } {
  const facts = analyseCaseSource(path, text);
  const isWrapper = path.replace(/\.[cm]?[jt]sx?$/, '') === PENDING_WRAPPER;
  const { unreviewed, used } = reviewTestDoubles(path, facts.testDoubles, reviewed);
  const problems = [
    ...(isWrapper ? [] : facts.swallows).map(
      (finding) =>
        `${path}:${finding.line}: [support] ${finding.what} swallows errors: a helper that catches a case body's failure ` +
        'lets the case pass whatever the code under test does; only the pending wrapper catches, and only to tell the stub\'s error from any other',
    ),
    ...(isWrapper ? [] : facts.heldOut).map(
      (finding) => `${path}:${finding.line}: [support] ${finding.what} keeps a test out of the run or inverts it; only the pending wrapper may hold a case out`,
    ),
    ...facts.empty.map((finding) => `${path}:${finding.line}: [support] ${finding.what} has an empty body, so it proves nothing`),
    ...facts.vacuous.map((finding) => vacuousProblem(path, finding, 'support')),
    ...unreviewed.map((finding) => testDoubleProblem(path, finding, 'support')),
    ...facts.notImplemented.map(
      (finding) => `${path}:${finding.line}: [support] names ${finding.what}: only a domain stub throws NotImplementedError`,
    ),
  ];
  return { problems, reviewedUsed: used };
}

/** Classifies a T case file's content. `path` is root-relative. */
export function classifyTestCase(
  id: string,
  path: string,
  text: string,
  readFile: ReadFile,
  options: TestCaseOptions = {},
): ClassifiedCase {
  const facts = analyseCaseSource(path, text);
  const problems: string[] = [];
  if (!facts.strings.some((literal) => namesId(literal, id))) {
    problems.push(
      `${path}:1: [title] no string in the file names ${id}; case titles start with the ids they prove (prompt 3 section 12)`,
    );
  }
  if (text.includes(STUB_MARKER)) return { status: 'stub', problems };

  const importsWrapper = importsPendingWrapper(path, text, readFile);
  const marker = parsePendingMarker(text);
  const mentionsMarker = text.includes(PENDING_MARKER_PREFIX.slice(3));
  const pending = importsWrapper || marker.kind !== 'none' || mentionsMarker;
  if (pending) {
    // The wrapper reads the marker from the first line, and the marker names the
    // phase and features that keep the case out of the green run. One without the
    // other is a fault; the file still counts as pending, so a held-out case can
    // never be counted as a real one.
    if (marker.kind === 'malformed') {
      problems.push(`${path}:1: [pending] malformed pending marker: ${marker.problem}`);
    } else if (marker.kind === 'none') {
      const where = mentionsMarker ? 'the marker is not on the first line' : 'the first line has no marker';
      problems.push(
        importsWrapper
          ? `${path}:1: [pending] imports the pending wrapper, but ${where}; a pending case starts with "${PENDING_MARKER_PREFIX} phase <n> <feature>"`
          : `${path}:1: [pending] mentions the pending marker, but ${where}, and the file does not use the pending wrapper`,
      );
    }
    if (!importsWrapper && marker.kind !== 'none') {
      problems.push(
        `${path}:1: [pending] carries the pending marker, but does not run its test through the pending wrapper (tests/guardrails/_support/pending.ts)`,
      );
    }
  }

  const { unreviewed, used } = reviewTestDoubles(path, facts.testDoubles, options.reviewed ?? []);
  // The support modules the file reaches, read here when the caller has not read them already.
  const isFaulty = (module: string): boolean =>
    options.supportFaults !== undefined
      ? (options.supportFaults.get(module) ?? []).length > 0
      : supportModuleFaults(module, readFile(module) ?? '', options.reviewed ?? []).problems.length > 0;
  const faultySupport = supportModulesReached(path, text, readFile).filter(isFaulty);

  // Faults that decide whether the file runs as a check: the file is never
  // counted, as real or as pending.
  const disqualifying = [
    ...facts.heldOut.map(
      (finding) =>
        `${path}:${finding.line}: [held out] ${finding.what} keeps a test out of the run or inverts it; ` +
        'only the pending wrapper (tests/guardrails/_support/pending.ts) may hold a case out',
    ),
    ...facts.empty.map(
      (finding) =>
        `${path}:${finding.line}: [empty] ${finding.what} has an empty body, so it proves nothing; write the case's assertions`,
    ),
    ...facts.notImplemented.map(
      (finding) =>
        `${path}:${finding.line}: [pending] names ${finding.what}: only a domain stub throws NotImplementedError, and a case ` +
        'that creates, declares or imitates it would stay pending after the code is built; call the domain function under test',
    ),
    ...facts.vacuous.map((finding) => vacuousProblem(path, finding, 'vacuous')),
    ...unreviewed.map((finding) => testDoubleProblem(path, finding, 'test double')),
    ...faultySupport.map(
      (module) =>
        `${path}:1: [support] imports ${module}, whose faults (listed as its own problems) make it unfit to run a case`,
    ),
  ];
  problems.push(...disqualifying);
  const status: CaseStatus = disqualifying.length > 0 ? 'malformed' : pending ? 'pending' : 'real';
  return used.length > 0 ? { status, problems, reviewedUsed: used } : { status, problems };
}

// ---------------------------------------------------------------------------
// E case files
// ---------------------------------------------------------------------------

function keyLine(text: string, key: string): number {
  const index = text.split(/\r?\n/).findIndex((line) => new RegExp(`^${key}\\s*:`).test(line));
  return index === -1 ? 1 : index + 1;
}

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';
const isNonEmptyMapping = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0;

/**
 * The problems of an eval's body: a synthetic fixture under fixtures/evals/<ID>/
 * that exists, a task, assertions on the structured output, and 5 samples
 * (guardrails section 7, "Model-behaviour evals").
 */
function evalBodyProblems(id: string, path: string, text: string, record: Record<string, unknown>, exists: PathExists): string[] {
  const at = (key: string): string => `${path}:${keyLine(text, key)}: [eval]`;
  const missing: string[] = [];
  const problems: string[] = [];
  const fixtureDir = `${EVAL_FIXTURE_DIR}/${id}/`;

  const fixture = record['fixture'];
  const fixtures = typeof fixture === 'string' ? [fixture] : Array.isArray(fixture) ? (fixture as unknown[]) : undefined;
  if (fixture === undefined) missing.push('fixture');
  else if (fixtures === undefined || fixtures.length === 0 || !fixtures.every(isNonEmptyString)) {
    problems.push(`${at('fixture')} "fixture" names the synthetic fixture: a path, or a list of paths, under ${fixtureDir}`);
  } else {
    for (const entry of fixtures) {
      const normalised = posix.normalize(entry);
      if (!normalised.startsWith(fixtureDir) || normalised.split('/').includes('..')) {
        problems.push(`${at('fixture')} the fixture ${JSON.stringify(entry)} is not under ${fixtureDir}`);
      } else if (!exists(normalised)) {
        problems.push(`${at('fixture')} the fixture ${JSON.stringify(entry)} does not exist`);
      }
    }
  }

  const task = record['task'];
  if (task === undefined) missing.push('task');
  else if (!isNonEmptyString(task) && !isNonEmptyMapping(task)) {
    problems.push(`${at('task')} "task" is the task given to the model: a text or a mapping, not empty`);
  }

  const assertions = record['assertions'];
  if (assertions === undefined) missing.push('assertions');
  else if (
    !Array.isArray(assertions) ||
    assertions.length === 0 ||
    !assertions.every((item) => isNonEmptyString(item) || isNonEmptyMapping(item))
  ) {
    problems.push(`${at('assertions')} "assertions" is a list of assertions on the structured output, not empty`);
  }

  const samples = record['samples'];
  if (samples === undefined) missing.push(`samples: ${EVAL_SAMPLES}`);
  else if (samples !== EVAL_SAMPLES) {
    problems.push(
      `${at('samples')} "samples" is ${JSON.stringify(samples)}; each eval is sampled ${EVAL_SAMPLES} times and passes only at ${EVAL_SAMPLES} of ${EVAL_SAMPLES} (guardrails section 7)`,
    );
  }

  if (missing.length > 0) {
    problems.unshift(
      `${path}:1: [eval] not a full eval case: no ${missing.join(', ')}. An eval holds a synthetic fixture, a task, ` +
        `assertions and samples: ${EVAL_SAMPLES} (guardrails section 7); a file with less is a stub, which never counts (docs/adr/0003)`,
    );
  }
  return problems;
}

/**
 * Classifies an E case file's content. `path` is root-relative; `exists` says
 * whether a root-relative path exists (for the fixture), and fails closed.
 * `evalRuns` is the evidence of eval runs (eval-runs.ts): without the runner no
 * E case is real; with it, a full eval without `status: pending` counts as real
 * only with a current 5-of-5 results record, and is a problem without one.
 */
export function classifyEvalCase(
  id: string,
  path: string,
  text: string,
  exists: PathExists = () => false,
  evalRuns: EvalRunEvidence = NO_EVAL_RUNNER,
): ClassifiedCase {
  const problems: string[] = [];
  const stubMarked = text.includes(STUB_MARKER);
  const document = parseDocument(text);
  const firstError = document.errors[0];
  if (firstError !== undefined) {
    const line = firstError.linePos?.[0].line ?? 1;
    problems.push(`${path}:${line}: [eval] the file is not valid YAML: ${firstError.message.split('\n')[0] ?? ''}`);
    return { status: stubMarked ? 'stub' : 'malformed', problems };
  }
  const value: unknown = document.toJS();
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    problems.push(`${path}:1: [eval] an eval case file is a YAML mapping with an "id" key`);
    return { status: stubMarked ? 'stub' : 'malformed', problems };
  }
  const record = value as Record<string, unknown>;
  const declared = record['id'];
  if (declared === undefined) {
    problems.push(`${path}:1: [eval] no "id" key; an eval case file names its id (${id})`);
  } else if (typeof declared !== 'string' || declared !== id) {
    problems.push(`${path}:${keyLine(text, 'id')}: [eval] the "id" key is ${JSON.stringify(declared)}; the file name says ${id}`);
  }
  const status = record['status'];
  if (stubMarked || status === 'stub') return { status: 'stub', problems };
  if (status !== undefined && status !== 'pending') {
    problems.push(
      `${path}:${keyLine(text, 'status')}: [eval] unknown status ${JSON.stringify(status)}; use "pending", "stub" or no status key`,
    );
  }
  problems.push(...evalBodyProblems(id, path, text, record, exists));
  if (problems.length > 0) return { status: 'malformed', problems };
  // No eval runs before the phase 2 runner exists: every E case is pending until then.
  if (!evalRuns.runner || status === 'pending') return { status: 'pending', problems };
  // Once the runner exists, a case that claims to run needs a current 5-of-5 result
  // (definition of done item 2); without one it stays pending, and the check fails.
  const gaps = evalResultGaps(id, evalRuns);
  if (gaps.length > 0) {
    problems.push(
      `${path}:1: [eval] no current ${EVAL_SAMPLES} of ${EVAL_SAMPLES} result: ${gaps.join('; ')}. Run the eval ` +
        `(${EVAL_SAMPLES} samples) against the current prompt, model id and schema, or mark it "status: pending"`,
    );
    return { status: 'pending', problems };
  }
  return { status: 'real', problems };
}
