import { describe, expect, it } from 'vitest';
import {
  STUB_MARKER,
  analyseCaseSource,
  classifyCasePath,
  classifyEvalCase,
  classifyTestCase,
  importSpecifiers,
  importsPendingWrapper,
  supportModuleFaults,
  supportModulesReached,
  type PathExists,
  type ReadFile,
} from './case-files';
import { contentHash, loadSupportPin } from './support-pin';

const noFiles: ReadFile = () => undefined;
const fixtureOf =
  (...paths: string[]): PathExists =>
  (path) =>
    paths.includes(path);
/** A full eval body: a fixture under fixtures/evals/<ID>/, a task, assertions and 5 samples. */
const evalBody = (id: string, extra = ''): string =>
  `id: ${id}\n${extra}fixture: fixtures/evals/${id}/input.txt\ntask: TEST task\nassertions:\n  - TEST assertion\nsamples: 5\n`;
const realCase = (id: string): string =>
  `import { expect, test } from 'vitest';\n\ntest('${id} · a case', () => {\n  expect(1).toBe(1);\n});\n`;

describe('case files: where they live and how they are named', () => {
  it('reads T case files at the top level of tests/guardrails/', () => {
    expect(classifyCasePath('tests/guardrails/G1-4.test.ts')).toEqual({ kind: 'case', id: 'G1-4', type: 'T' });
    expect(classifyCasePath('tests/guardrails/G2-1.test.tsx')).toEqual({ kind: 'case', id: 'G2-1', type: 'T' });
    expect(classifyCasePath('tests/guardrails/GS-1.test.ts')).toEqual({ kind: 'case', id: 'GS-1', type: 'T' });
  });

  it('reads E case files at the top level of evals/guardrails/', () => {
    expect(classifyCasePath('evals/guardrails/G1-1.yaml')).toEqual({ kind: 'case', id: 'G1-1', type: 'E' });
  });

  it('ignores placeholders, READMEs, dotfiles and folders starting with an underscore', () => {
    for (const path of [
      'tests/guardrails/.gitkeep',
      'tests/guardrails/.DS_Store',
      'tests/guardrails/README.md',
      'tests/guardrails/_support/pending.ts',
      'tests/guardrails/_support/deep/helper.test.ts',
      'evals/guardrails/.gitkeep',
      'evals/guardrails/README.md',
      'evals/guardrails/_shared/common.yaml',
    ]) {
      expect(classifyCasePath(path)).toEqual({ kind: 'ignore' });
    }
  });

  it('reports a file that is not named like a case file', () => {
    for (const path of [
      'tests/guardrails/G1-4.spec.ts',
      'tests/guardrails/G1-4.ts',
      'tests/guardrails/notes.md',
      'evals/guardrails/G1-1.yml',
      'evals/guardrails/G1-1.json',
    ]) {
      const outcome = classifyCasePath(path);
      expect(outcome.kind).toBe('problem');
    }
  });

  it('reports a case file in a nested folder', () => {
    const outcome = classifyCasePath('tests/guardrails/extra/G1-4.test.ts');
    expect(outcome.kind).toBe('problem');
    if (outcome.kind === 'problem') expect(outcome.message).toContain('top level');
  });
});

describe('case files: the pending wrapper', () => {
  it('lists every static, dynamic and re-export specifier', () => {
    const text = [
      "import { test } from 'vitest';",
      'import type { X } from "./_support/types";',
      "export { y } from './_support/y';",
      "import './_support/side-effect';",
      "const later = await import('./_support/later');",
    ].join('\n');
    expect(importSpecifiers(text)).toEqual([
      'vitest',
      './_support/types',
      './_support/y',
      './_support/side-effect',
      './_support/later',
    ]);
  });

  it('finds a direct import of tests/guardrails/_support/pending, with or without an extension', () => {
    for (const specifier of ['./_support/pending', './_support/pending.ts', './_support/pending.js']) {
      const text = `import { pending } from '${specifier}';\n`;
      expect(importsPendingWrapper('tests/guardrails/G1-4.test.ts', text, noFiles)).toBe(true);
    }
  });

  it('finds the wrapper when a support module re-exports it', () => {
    const files: Record<string, string> = {
      'tests/guardrails/_support/index.ts': "export * from './helpers';\n",
      'tests/guardrails/_support/helpers.ts': "export { pendingUntilImplemented } from './pending';\n",
    };
    const readFile: ReadFile = (path) => files[path];
    expect(importsPendingWrapper('tests/guardrails/G1-4.test.ts', "import { x } from './_support';\n", readFile)).toBe(
      true,
    );
    expect(
      importsPendingWrapper('tests/guardrails/G1-4.test.ts', "import { x } from './_support/helpers.js';\n", readFile),
    ).toBe(true);
  });

  it('does not see the wrapper in a case that imports other support code only', () => {
    const files: Record<string, string> = { 'tests/guardrails/_support/render.ts': "import { chromium } from '@playwright/test';\n" };
    const readFile: ReadFile = (path) => files[path];
    expect(importsPendingWrapper('tests/guardrails/G2-1.test.ts', "import { r } from './_support/render';\n", readFile)).toBe(
      false,
    );
    expect(importsPendingWrapper('tests/guardrails/G2-1.test.ts', realCase('G2-1'), readFile)).toBe(false);
  });

  it('survives an import cycle between support modules', () => {
    const files: Record<string, string> = {
      'tests/guardrails/_support/a.ts': "export * from './b';\n",
      'tests/guardrails/_support/b.ts': "export * from './a';\n",
    };
    const readFile: ReadFile = (path) => files[path];
    expect(importsPendingWrapper('tests/guardrails/G1-4.test.ts', "import './_support/a';\n", readFile)).toBe(false);
  });
});

describe('case files: T case content', () => {
  it('classifies a case with a titled test as real', () => {
    expect(classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', realCase('G1-4'), noFiles)).toEqual({
      status: 'real',
      problems: [],
    });
  });

  it('accepts a title that lists other ids before the case id', () => {
    const text = "import { expect, test } from 'vitest';\ntest('US-INTAKE-03 · F-QUESTION-02 · G7-6: blocks', () => { expect(1).toBe(1); });\n";
    expect(classifyTestCase('G7-6', 'tests/guardrails/G7-6.test.ts', text, noFiles).problems).toEqual([]);
  });

  it('reports a case file that never names its id in a string', () => {
    const outcome = classifyTestCase('G1-1', 'tests/guardrails/G1-1.test.ts', realCase('G1-10'), noFiles);
    expect(outcome.problems).toHaveLength(1);
    expect(outcome.problems[0]).toMatch(/^tests\/guardrails\/G1-1\.test\.ts:1: /);
    const suffixed = classifyTestCase('G7-2', 'tests/guardrails/G7-2.test.ts', realCase('G7-2a'), noFiles);
    expect(suffixed.problems).toHaveLength(1);
  });

  it('classifies a case that imports the pending wrapper and starts with the marker as pending', () => {
    const text =
      "// @pending-until: phase 2 verify-proposal\nimport { pendingCase } from './_support/pending';\npendingCase(import.meta.url)('G1-4 · pending', () => {});\n";
    expect(classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles)).toEqual({
      status: 'pending',
      problems: [],
    });
  });

  it('reports the wrapper without the marker on the first line, and still counts the case as pending', () => {
    const noMarker = "import { pendingCase } from './_support/pending';\npendingCase(import.meta.url)('G1-4 · pending', () => {});\n";
    const lateMarker = `import { x } from 'vitest';\n// @pending-until: phase 2 verify-proposal\n${noMarker}`;
    for (const text of [noMarker, lateMarker]) {
      const outcome = classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles);
      expect(outcome.status).toBe('pending');
      expect(outcome.problems).toHaveLength(1);
      expect(outcome.problems[0]).toMatch(/^tests\/guardrails\/G1-4\.test\.ts:1: \[pending\] imports the pending wrapper/);
    }
  });

  it('reports a malformed marker, and still counts the case as pending', () => {
    for (const marker of ['// @pending-until: phase 9 verify-proposal', '// @pending-until: phase 1 someday', '// @pending-until: phase 2 verify-proposal, verify-proposal']) {
      const text = `${marker}\nimport { pendingCase } from './_support/pending';\npendingCase(import.meta.url)('G1-4 · pending', () => {});\n`;
      const outcome = classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles);
      expect(outcome.status).toBe('pending');
      expect(outcome.problems).toHaveLength(1);
      expect(outcome.problems[0]).toContain('[pending] malformed pending marker');
    }
  });

  it('reports a marker without the wrapper, and never counts that file as real', () => {
    const text = `// @pending-until: phase 2 verify-proposal\n${realCase('G1-4')}`;
    const outcome = classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles);
    expect(outcome.status).toBe('pending');
    expect(outcome.problems).toHaveLength(1);
    expect(outcome.problems[0]).toContain('does not run its test through the pending wrapper');
  });

  it('classifies a file carrying the stub marker as a stub, whatever else it holds', () => {
    const text = `// ${STUB_MARKER}\n${realCase('G1-4')}`;
    expect(classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles).status).toBe('stub');
  });

  it('reports a test held out of the run by skip, todo, only, fails, skipIf or runIf, and never counts the file', () => {
    for (const call of [
      "test.skip('G1-4 · x', () => {});",
      "it.todo('G1-4 · x');",
      "describe.only('G1-4 · x', () => {});",
      "test.fails('G1-4 · x', () => {});",
      "test.skipIf(true)('G1-4 · x', () => {});",
      "test.runIf(false)('G1-4 · x', () => {});",
      "test('G1-4 · x', (context) => { context.skip(); });",
      "test.skip.each([1])('G1-4 · %s', () => {});",
      "test.concurrent.only('G1-4 · x', () => {});",
    ]) {
      const text = `import { test, it, describe } from 'vitest';\n\n${call}\n`;
      const outcome = classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles);
      expect(outcome.status, call).toBe('malformed');
      expect(outcome.problems.some((problem) => problem.includes('[held out]')), call).toBe(true);
      expect(outcome.problems[0], call).toMatch(/^tests\/guardrails\/G1-4\.test\.ts:3: /);
    }
  });

  it('reports the forms a text pattern does not see: options objects, computed and destructured modifiers', () => {
    const body = "() => { expect(1).toBe(1); }";
    const forms: ReadonlyArray<readonly [string, string]> = [
      [`test('G1-4 · x', { skip: true }, ${body});`, 'the option "skip"'],
      [`test('G1-4 · x', { todo: true }, ${body});`, 'the option "todo"'],
      [`test('G1-4 · x', { fails: true }, ${body});`, 'the option "fails"'],
      [`test('G1-4 · x', { only: true }, ${body});`, 'the option "only"'],
      [`test('G1-4 · x', { 'skip': 1 === 1 }, ${body});`, 'the option "skip"'],
      [`test('G1-4 · x', { ['todo']: true }, ${body});`, 'the option "todo"'],
      [`const skip = true;\ntest('G1-4 · x', { skip }, ${body});`, 'the option "skip"'],
      [`const options = { skip: true };\ntest('G1-4 · x', options, ${body});`, 'the option "skip"'],
      [`describe('G1-4 · suite', { skip: true }, () => { test('G1-4 · x', ${body}); });`, 'the option "skip"'],
      [`test['skip']('G1-4 · x', ${body});`, '"["skip"]"'],
      [`test[\`only\`]('G1-4 · x', ${body});`, '"["only"]"'],
      [`const mode = 'sk' + 'ip';\ntest[mode]('G1-4 · x', ${body});`, 'computed from code'],
      [`const { skip } = test;\nskip('G1-4 · x', ${body});`, 'the destructured modifier "skip"'],
      [`const { todo: later } = it;\nlater('G1-4 · x');`, 'the destructured modifier "todo"'],
      [`test('G1-4 · x', ({ skip }) => { skip(); });`, 'the destructured modifier "skip"'],
      [`const key = 'skip';\nconst { [key]: hold } = test;\nhold('G1-4 · x', ${body});`, 'destructured under a computed key'],
      [`import { test as t } from 'vitest';\nconst k = 'only';\nt[k]('G1-4 · x', ${body});`, 'computed from code'],
    ];
    for (const [form, what] of forms) {
      const text = `import { describe, expect, it, test } from 'vitest';\n${form}\n`;
      const outcome = classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles);
      expect(outcome.status, form).toBe('malformed');
      expect(
        outcome.problems.some((problem) => problem.includes('[held out]') && problem.includes(what)),
        `${form}\n${outcome.problems.join('\n')}`,
      ).toBe(true);
    }
  });

  it('accepts the forms that run every test', () => {
    const text = [
      "import { describe, expect, test } from 'vitest';",
      "test('G1-4 · with options', { timeout: 1000, retry: 0, skip: false }, () => { expect(1).toBe(1); });",
      "describe.concurrent('G1-4 · suite', () => {",
      "  test.each([1])('G1-4 · each %s', (value) => { expect(value).toBe(1); });",
      "  test.for([1])('G1-4 · for %s', (value, { expect: local }) => { local(value).toBe(1); });",
      '});',
      "const row = { passed: true, skipped: false, only_in_test: 1 };",
      "test('G1-4 · data', () => { expect(row.skipped).toBe(false); });",
    ].join('\n');
    expect(classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles)).toEqual({ status: 'real', problems: [] });
  });

  it('reports a test registered with an empty body, through test, it, an alias or the pending wrapper', () => {
    for (const form of [
      "test('G1-4 · x', () => {});",
      "it('G1-4 · x', function () {});",
      "test('G1-4 · x', () => undefined);",
      "test('G1-4 · x', async () => {});",
      "const t = test.extend({});\nt('G1-4 · x', () => {});",
      "const pending = pendingCase(import.meta.url);\npending('G1-4 · x', () => {});",
    ]) {
      const text = `import { it, test } from 'vitest';\n${form}\n`;
      const outcome = classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles);
      expect(outcome.status, form).toBe('malformed');
      expect(outcome.problems.some((problem) => problem.includes('[empty]')), form).toBe(true);
    }
  });

  it('reports a case file that names NotImplementedError: only a domain stub throws it', () => {
    const text = [
      '// @pending-until: phase 2 verify-proposal',
      "import { NotImplementedError } from '@sovitech/domain';",
      "import { pendingCase } from './_support/pending';",
      "pendingCase(import.meta.url)('G1-4 · x', () => { throw new NotImplementedError('derive'); });",
    ].join('\n');
    const outcome = classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles);
    expect(outcome.status).toBe('malformed');
    expect(outcome.problems).toHaveLength(2);
    expect(outcome.problems[0]).toMatch(/^tests\/guardrails\/G1-4\.test\.ts:2: \[pending\] names NotImplementedError/);
    const lookalike = "import { test } from 'vitest';\nclass NotImplementedError extends Error {}\ntest('G1-4 · x', () => { throw new NotImplementedError(); });\n";
    expect(classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', lookalike, noFiles).status).toBe('malformed');
    const declares = "import { declareNotImplemented } from '@sovitech/domain';\nimport { test } from 'vitest';\ntest('G1-4 · x', () => { declareNotImplemented('derive')(); });\n";
    expect(classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', declares, noFiles).status).toBe('malformed');
  });

  it('checks a pending case for held-out tests too', () => {
    const text =
      "// @pending-until: phase 2 verify-proposal\nimport { test } from 'vitest';\nimport { pendingCase } from './_support/pending';\ntest.skip('G1-4 · x', () => { expect(1).toBe(1); });\n";
    const outcome = classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles);
    expect(outcome.status).toBe('malformed');
    expect(outcome.problems.some((problem) => problem.includes('[held out]'))).toBe(true);
  });

  it('ignores those words in comments and strings', () => {
    const text = [
      "import { test } from 'vitest';",
      '// Never test.skip( a case, or pass { skip: true }; use the pending wrapper.',
      '/* test.only( is banned too */',
      "test('G1-4 · says test.skip( in its title', () => { expect(1).toBe(1); });",
      "const url = 'http://127.0.0.1:4173/x.skip(';",
    ].join('\n');
    expect(classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles).problems).toEqual([]);
  });

  it('reads the strings of a file, template parts included, for the title check', () => {
    const facts = analyseCaseSource('tests/guardrails/G1-4.test.ts', "const a = 'G1-4 · x';\nconst b = `G2-1 ${a} tail`;\n");
    expect(facts.strings).toContain('G1-4 · x');
    expect(facts.strings.some((text) => text.startsWith('G2-1 '))).toBe(true);
    expect(facts.heldOut).toEqual([]);
  });
});

describe('case files: E case content', () => {
  it('counts a full eval as pending, never as real, until the eval runner exists', () => {
    expect(classifyEvalCase('G1-1', 'evals/guardrails/G1-1.yaml', evalBody('G1-1'), fixtureOf('fixtures/evals/G1-1/input.txt'))).toEqual({
      status: 'pending',
      problems: [],
    });
    expect(
      classifyEvalCase('G1-1', 'evals/guardrails/G1-1.yaml', evalBody('G1-1', 'status: pending\n'), fixtureOf('fixtures/evals/G1-1/input.txt')),
    ).toEqual({ status: 'pending', problems: [] });
  });

  it('never counts an eval without its full body: an id alone, or with a pending status, is a stub', () => {
    for (const text of ['id: G1-1\n', 'id: G1-1\nstatus: pending\n', 'id: G1-1\ntask: read it\n']) {
      const outcome = classifyEvalCase('G1-1', 'evals/guardrails/G1-1.yaml', text, fixtureOf());
      expect(outcome.status, text).toBe('malformed');
      expect(outcome.problems[0], text).toMatch(/^evals\/guardrails\/G1-1\.yaml:1: \[eval\] not a full eval case/);
    }
  });

  it('checks each part of the body: the fixture exists under fixtures/evals/<ID>/, a task, assertions, 5 samples', () => {
    const exists = fixtureOf('fixtures/evals/G1-1/input.txt', 'fixtures/evals/G1-2/input.txt');
    const cases: Array<[string, string]> = [
      [evalBody('G1-1').replace('fixtures/evals/G1-1/input.txt', 'fixtures/evals/G1-1/missing.txt'), 'does not exist'],
      [evalBody('G1-1').replace('fixtures/evals/G1-1/input.txt', 'fixtures/evals/G1-2/input.txt'), 'is not under fixtures/evals/G1-1/'],
      [evalBody('G1-1').replace('fixtures/evals/G1-1/input.txt', 'fixtures/evals/G1-1/../G1-2/input.txt'), 'is not under'],
      [evalBody('G1-1').replace('fixture: fixtures/evals/G1-1/input.txt', 'fixture: []'), '"fixture" names the synthetic fixture'],
      [evalBody('G1-1').replace('task: TEST task', 'task: ""'), '"task" is the task'],
      [evalBody('G1-1').replace('assertions:\n  - TEST assertion', 'assertions: []'), '"assertions" is a list'],
      [evalBody('G1-1').replace('samples: 5', 'samples: 3'), '"samples" is 3'],
      [evalBody('G1-1').replace('samples: 5', 'samples: "5"'), '"samples" is "5"'],
    ];
    for (const [text, reason] of cases) {
      const outcome = classifyEvalCase('G1-1', 'evals/guardrails/G1-1.yaml', text, exists);
      expect(outcome.status, text).toBe('malformed');
      expect(outcome.problems.some((problem) => problem.includes(reason)), `${text}\n${outcome.problems.join('\n')}`).toBe(true);
    }
    const listed = evalBody('G1-1').replace(
      'fixture: fixtures/evals/G1-1/input.txt',
      'fixture:\n  - fixtures/evals/G1-1/input.txt\n  - fixtures/evals/G1-1/input.txt',
    );
    expect(classifyEvalCase('G1-1', 'evals/guardrails/G1-1.yaml', listed, exists).status).toBe('pending');
  });

  it('reads the status key: pending and stub', () => {
    const exists = fixtureOf('fixtures/evals/G1-1/input.txt');
    expect(classifyEvalCase('G1-1', 'evals/guardrails/G1-1.yaml', evalBody('G1-1', 'status: pending\n'), exists).status).toBe('pending');
    expect(classifyEvalCase('G1-1', 'evals/guardrails/G1-1.yaml', 'id: G1-1\nstatus: stub\n').status).toBe('stub');
    expect(classifyEvalCase('G1-1', 'evals/guardrails/G1-1.yaml', `# ${STUB_MARKER}\nid: G1-1\n`).status).toBe('stub');
  });

  it('reports an unknown status, a missing or different id, malformed YAML and a non-mapping, and never counts the file', () => {
    const exists = fixtureOf('fixtures/evals/G1-1/input.txt');
    const outcomeOf = (text: string) => classifyEvalCase('G1-1', 'evals/guardrails/G1-1.yaml', text, exists);
    for (const [text, reason] of [
      [evalBody('G1-1', 'status: done\n'), 'unknown status'],
      [evalBody('G1-1').replace('id: G1-1\n', ''), 'no "id" key'],
      [evalBody('G1-1').replace('id: G1-1', 'id: G1-2'), 'the "id" key is'],
      ['id: [G1-1\n', 'not valid YAML'],
      ['- G1-1\n', 'a YAML mapping'],
    ] as const) {
      const outcome = outcomeOf(text);
      expect(outcome.status, text).toBe('malformed');
      expect(outcome.problems, text).toHaveLength(1);
      expect(outcome.problems[0], text).toContain(reason);
    }
    expect(outcomeOf(evalBody('G1-1').replace('id: G1-1', 'id: G1-2')).problems[0]).toMatch(/^evals\/guardrails\/G1-1\.yaml:1: /);
  });

  it('fails closed on the fixture when no path checker is given', () => {
    expect(classifyEvalCase('G1-1', 'evals/guardrails/G1-1.yaml', evalBody('G1-1')).status).toBe('malformed');
  });
});

/** A case file with one test whose body is `body`, importing `imports` first. */
const caseWith = (body: string, imports = "import { expect, test, vi } from 'vitest';"): string =>
  `${imports}\n\ntest('G1-4 · a case', async () => {\n${body}\n});\n`;
const classify = (text: string, options = {}) => classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles, options);

describe('case files: assertions that prove nothing (phase 0 review, round 2)', () => {
  it.each([
    ['expect with no matcher', "expect('TEST');", 'has no matcher after it'],
    ['a matcher read but not called', 'expect(1).toBe;', 'has no matcher after it'],
    ['.not with no matcher', 'expect(1).not;', 'has no matcher after it'],
    ['an expect kept in a variable', "const pending = expect('TEST');\n  void pending;", 'has no matcher after it'],
    ['expect.soft with no matcher', "expect.soft('TEST');", 'has no matcher after it'],
    ['expect.poll with no matcher', "expect.poll(() => 'TEST');", 'has no matcher after it'],
    ['expect.assertions(0)', 'expect.assertions(0);\n  expect(1).toBe(1);', 'expects no assertion'],
    ['expect.assertions with a computed count', 'const n = 0;\n  expect.assertions(n);\n  expect(1).toBe(1);', 'expects no assertion'],
    ['a throw naming no error', 'expect(() => JSON.parse("{")).toThrow();', 'names no error'],
    ['a throw naming undefined', 'expect(() => JSON.parse("{")).toThrowError(undefined);', 'names no error'],
    ['a rejection naming no error', 'await expect(Promise.reject(new Error("TEST"))).rejects.toThrow();', 'names no error'],
  ])('flags %s', (_name, body, reason) => {
    const outcome = classify(caseWith(body));
    expect(outcome.status).toBe('malformed');
    expect(outcome.problems.some((problem) => problem.includes('[vacuous]') && problem.includes(reason)), outcome.problems.join('\n')).toBe(true);
  });

  it('finds expect through an alias, a namespace import and a test context', () => {
    for (const text of [
      caseWith("check('TEST');", "import { expect as check, test } from 'vitest';"),
      "import * as v from 'vitest';\n\nv.test('G1-4 · a case', () => {\n  v.expect('TEST');\n});\n",
      "import { test } from 'vitest';\n\ntest('G1-4 · a case', ({ expect }) => {\n  expect('TEST');\n});\n",
      "import { test } from 'vitest';\n\ntest('G1-4 · a case', ({ expect: local }) => {\n  local('TEST');\n});\n",
      caseWith("const e = expect;\n  e('TEST');"),
    ]) {
      expect(classify(text).problems.some((problem) => problem.includes('[vacuous]')), text).toBe(true);
    }
  });

  it('passes matchers, negations, resolves and rejects, asymmetric matchers, named throws and counts above zero', () => {
    const body = [
      'expect.assertions(4);',
      'expect.hasAssertions();',
      "expect(['TEST']).toEqual(expect.arrayContaining(['TEST']));",
      'expect(1).not.toBe(2);',
      'await expect(Promise.resolve(1)).resolves.toBe(1);',
      'await expect(Promise.reject(new TypeError("TEST"))).rejects.toThrow(TypeError);',
      "expect(() => JSON.parse('{')).toThrow(/JSON/);",
      "expect.soft('TEST').toBe('TEST');",
    ].join('\n  ');
    expect(classify(caseWith(body))).toEqual({ status: 'real', problems: [] });
  });
});

describe('case files: test doubles (phase 0 review, round 2)', () => {
  it.each([
    ['vi.mock of the domain', "vi.mock('@sovitech/domain', () => ({}));", 'vi.mock', '@sovitech/domain'],
    ['vi.mock through import()', "vi.mock(import('@sovitech/domain'), () => ({}));", 'vi.mock', '@sovitech/domain'],
    ['vi.mock of any module', "vi.mock('node:fs');", 'vi.mock', 'node:fs'],
    ['vi.doMock of a relative domain path', "vi.doMock('../../packages/domain/src/evidence', () => ({}));", 'vi.doMock', '../../packages/domain/src/evidence'],
    ['vi.stubGlobal', "vi.stubGlobal('fetch', () => undefined);", 'vi.stubGlobal', 'fetch'],
    ['vi.stubEnv', "vi.stubEnv('TZ', 'UTC');", 'vi.stubEnv', 'TZ'],
    ['vi.resetModules', 'vi.resetModules();', 'vi.resetModules', ''],
    ['vi.importActual', "await vi.importActual('@sovitech/domain');", 'vi.importActual', '@sovitech/domain'],
    ['a member of vi computed from code', "const name = 'mo' + 'ck';\n  vi[name]('@sovitech/domain');", 'vi.<computed>', '@sovitech/domain'],
    ['a spy given a return value', "vi.spyOn(Math, 'random').mockReturnValue(0.5);", 'vi.spyOn', 'Math.random'],
    ['a spy on project code', "vi.spyOn(domain, 'derive');", 'vi.spyOn', 'domain.derive'],
    ['a spy kept in a variable and given an implementation', "const spy = vi.spyOn(Math, 'max');\n  spy.mockImplementation(() => 1);", 'vi.spyOn', 'Math.max'],
  ])('flags %s', (_name, body, call, target) => {
    const text = caseWith(`${body}\n  expect(1).toBe(1);`, "import { expect, test, vi } from 'vitest';\nimport * as domain from '@sovitech/domain';");
    const outcome = classify(text);
    expect(outcome.status).toBe('malformed');
    const needle = `(${call}, target ${JSON.stringify(target)})`;
    expect(outcome.problems.some((problem) => problem.includes('[test double]') && problem.includes(needle)), outcome.problems.join('\n')).toBe(true);
  });

  it('finds vi through an alias, a namespace import and destructuring', () => {
    for (const text of [
      caseWith("mocker.mock('@sovitech/domain');", "import { expect, test, vi as mocker } from 'vitest';"),
      "import * as v from 'vitest';\n\nv.test('G1-4 · a case', () => {\n  v.vi.stubEnv('TZ', 'UTC');\n  v.expect(1).toBe(1);\n});\n",
      caseWith("const { stubEnv } = vi;\n  stubEnv('TZ', 'UTC');\n  expect(1).toBe(1);"),
    ]) {
      expect(classify(text).problems.some((problem) => problem.includes('[test double]')), text).toBe(true);
    }
  });

  it('passes an injected vi.fn() with a return value, and a spy that only watches a third-party object', () => {
    const body = [
      "const textAt = vi.fn().mockReturnValue('TEST');",
      "const watch = vi.spyOn(console, 'warn');",
      "expect(textAt()).toBe('TEST');",
      'expect(watch).not.toHaveBeenCalled();',
    ].join('\n  ');
    expect(classify(caseWith(body))).toEqual({ status: 'real', problems: [] });
  });

  it('allows a use named in the reviewed list, and reports which entry it used', () => {
    const text = caseWith("vi.stubEnv('TZ', 'UTC');\n  expect(1).toBe(1);");
    const reviewed = [{ path: 'tests/guardrails/G1-4.test.ts', call: 'vi.stubEnv', target: 'TZ', reason: 'TEST' }];
    expect(classify(text, { reviewed })).toEqual({
      status: 'real',
      problems: [],
      reviewedUsed: ['tests/guardrails/G1-4.test.ts vi.stubEnv TZ'],
    });
    const otherTarget = [{ ...reviewed[0]!, target: 'LANG' }];
    expect(classify(text, { reviewed: otherTarget }).status).toBe('malformed');
  });
});

describe('case files: support modules (phase 0 review, round 2)', () => {
  it.each([
    ['a catch clause', 'try { run(); } catch { /* swallowed */ }', 'a catch clause swallows errors'],
    ['a .catch call', 'void Promise.resolve().catch(() => undefined);', 'swallows errors'],
    ['a rejection handler', 'void Promise.resolve().then(() => undefined, () => undefined);', 'a rejection handler'],
    ['Promise.allSettled', 'void Promise.allSettled([]);', 'swallows errors'],
    ['a test double', "vi.mock('@sovitech/domain');", '[support]'],
    ['a vacuous expect', "expect('TEST');", 'has no matcher after it'],
  ])('flags %s in a support module', (_name, body, reason) => {
    const text = `import { expect, vi } from 'vitest';\nexport function helper(run: () => void): void {\n  ${body}\n}\n`;
    const { problems } = supportModuleFaults('tests/guardrails/_support/helper.ts', text);
    expect(problems.some((problem) => problem.startsWith('tests/guardrails/_support/helper.ts:') && problem.includes(reason)), problems.join('\n')).toBe(true);
  });

  it('lets the pending wrapper catch and skip only through the reviewed list, with its reviewed content', () => {
    const wrapper =
      "import { notImplementedFeature } from '@sovitech/domain';\n" +
      'export async function run(body: () => unknown, context: { skip: (note: string) => never }) {\n' +
      '  try { await body(); } catch (error) { if (notImplementedFeature(error) === undefined) throw error; return context.skip("TEST"); }\n}\n';
    const pinned = [{ path: 'tests/guardrails/_support/pending.ts', role: 'pending-wrapper' as const, sha256: contentHash(wrapper), reason: 'TEST' }];
    expect(supportModuleFaults('tests/guardrails/_support/pending.ts', wrapper, [], pinned).problems).toEqual([]);
    // Not on the list (or no list): the wrapper is held to the full rule, like any module.
    expect(supportModuleFaults('tests/guardrails/_support/pending.ts', wrapper).problems.length).toBe(2);
    // On the list, but its content changed since it was reviewed.
    const changed = supportModuleFaults('tests/guardrails/_support/pending.ts', `${wrapper}// TEST edit\n`, [], pinned).problems;
    expect(changed.some((problem) => problem.includes('its content changed since it was reviewed')), changed.join('\n')).toBe(true);
    expect(changed.some((problem) => problem.includes('swallows errors'))).toBe(true);
    // The pending-wrapper role belongs to the wrapper's path only.
    const elsewhere = [{ ...pinned[0]!, path: 'tests/guardrails/_support/other.ts' }];
    const other = supportModuleFaults('tests/guardrails/_support/other.ts', wrapper, [], elsewhere).problems;
    expect(other.some((problem) => problem.includes('the role pending-wrapper belongs to'))).toBe(true);
    expect(other.some((problem) => problem.includes('keeps a test out of the run'))).toBe(true);
  });

  it('lets a stub-aware module on the reviewed list catch, but not skip, and only through notImplementedFeature', () => {
    const helper =
      "import { notImplementedFeature } from '@sovitech/domain';\n" +
      'export function check(run: () => void): void {\n  try { run(); } catch (error) { if (notImplementedFeature(error) === undefined) throw error; }\n}\n';
    const pinned = (text: string) => [{ path: 'tests/guardrails/_support/property.ts', role: 'stub-aware' as const, sha256: contentHash(text), reason: 'TEST' }];
    expect(supportModuleFaults('tests/guardrails/_support/property.ts', helper, [], pinned(helper)).problems).toEqual([]);
    const skipping = `${helper}export function hold(context: { skip: () => void }): void { context.skip(); }\n`;
    expect(supportModuleFaults('tests/guardrails/_support/property.ts', skipping, [], pinned(skipping)).problems.some((problem) => problem.includes('keeps a test out'))).toBe(true);
    const blind = 'export function check(run: () => void): void {\n  try { run(); } catch { /* TEST */ }\n}\n';
    expect(
      supportModuleFaults('tests/guardrails/_support/property.ts', blind, [], pinned(blind)).problems.some((problem) => problem.includes('through notImplementedFeature')),
    ).toBe(true);
  });

  it.each([
    ['return', 'try { run(); } finally { return; }'],
    ['throw', "try { run(); } finally { throw new Error('TEST'); }"],
    ['break', 'for (;;) { try { run(); } finally { break; } }'],
    ['continue', 'for (const x of [1]) { try { run(); } finally { continue; } }'],
    ['labelled break', 'outer: for (;;) { try { run(); } finally { for (;;) { break outer; } } }'],
  ])('flags a finally block that leaves by %s (round 2 residual: try/finally return passed the [support] rule)', (_name, body) => {
    const text = `export function helper(run: () => void): void {\n  ${body}\n}\n`;
    const { problems } = supportModuleFaults('tests/guardrails/_support/helper.ts', text);
    expect(problems.some((problem) => problem.includes('[support]') && problem.includes('in a finally block replaces whatever the try block threw')), problems.join('\n')).toBe(true);
  });

  it('passes a finally block that only cleans up, and jumps that stay inside it', () => {
    const text =
      'export function helper(run: () => void, close: () => void): void {\n' +
      '  try { run(); } finally { close(); for (const x of [1]) { if (x) break; } const f = () => { return 1; }; void f; }\n}\n';
    expect(supportModuleFaults('tests/guardrails/_support/helper.ts', text).problems).toEqual([]);
  });

  it.each([
    ['child_process', "import { spawnSync } from 'node:child_process';"],
    ['worker_threads', "import { Worker } from 'worker_threads';"],
    ['cluster', "import cluster from 'node:cluster';"],
    ['vm', "import vm from 'node:vm';"],
    ['a re-export', "export { execFileSync } from 'child_process';"],
    ['a dynamic import', "const cp = await import('node:child_process');"],
    ['require', "const cp = require('child_process');"],
    ['a computed import', "const cp = await import('node:child' + '_process');"],
    ['createRequire', "import { createRequire } from 'node:module';\nconst load = createRequire(import.meta.url);"],
    ['new Worker', "const w = new Worker(new URL('./x.js', import.meta.url));"],
    ['execa', "import { execa } from 'execa';"],
  ])('marks a case file that runs code in another process or context (%s) as malformed', (_name, line) => {
    const text = `${line}\nimport { expect, test } from 'vitest';\ntest('G1-4 · a case', () => { expect(1).toBe(1); });\n`;
    const outcome = classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles);
    expect(outcome.status).toBe('malformed');
    expect(outcome.problems.some((problem) => problem.includes('[process]')), outcome.problems.join('\n')).toBe(true);
    expect(supportModuleFaults('tests/guardrails/_support/helper.ts', text).problems.some((problem) => problem.includes('[support]') && problem.includes('another process'))).toBe(true);
  });

  it('marks a case file with a finally block that returns as malformed ([swallow])', () => {
    const text = "import { expect, test } from 'vitest';\ntest('G1-4 · a case', () => { try { expect(1).toBe(2); } finally { return; } });\n";
    const outcome = classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles);
    expect(outcome.status).toBe('malformed');
    expect(outcome.problems.some((problem) => problem.includes('[swallow]'))).toBe(true);
  });

  it('passes imports that start no process: node:fs, node:path, a literal import of project code', () => {
    const text =
      "import { readFileSync } from 'node:fs';\nimport { join } from 'node:path';\nimport { expect, test } from 'vitest';\n" +
      "test('G1-4 · a case', async () => { const m = await import('./_support/x'); expect(m).toBeDefined(); expect(readFileSync).toBeDefined(); expect(join).toBeDefined(); });\n";
    expect(classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, noFiles).status).toBe('real');
  });

  it('marks a case that imports a faulty support module, directly or through another, as malformed', () => {
    const files: Record<string, string> = {
      'tests/guardrails/_support/index.ts': "export * from './lenient';\n",
      'tests/guardrails/_support/lenient.ts': 'export const x = 1;\n',
    };
    const readFile: ReadFile = (path) => files[path];
    const text = "import { x } from './_support';\nimport { expect, test } from 'vitest';\ntest('G1-4 · a case', () => { expect(x).toBe(1); });\n";
    expect(supportModulesReached('tests/guardrails/G1-4.test.ts', text, readFile)).toEqual([
      'tests/guardrails/_support/index.ts',
      'tests/guardrails/_support/lenient.ts',
    ]);
    const supportFaults = new Map([['tests/guardrails/_support/lenient.ts', ['TEST fault']]]);
    const outcome = classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, readFile, { supportFaults });
    expect(outcome.status).toBe('malformed');
    expect(outcome.problems).toEqual([
      'tests/guardrails/G1-4.test.ts:1: [support] imports tests/guardrails/_support/lenient.ts, whose faults (listed as its own problems) make it unfit to run a case',
    ]);
    expect(classifyTestCase('G1-4', 'tests/guardrails/G1-4.test.ts', text, readFile, { supportFaults: new Map() }).status).toBe('real');
  });

  it('passes the repository\'s own support modules, with the repository\'s reviewed list', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = join(import.meta.dirname, '..', '..', '..');
    const pin = loadSupportPin(root);
    expect(pin.problems).toEqual([]);
    expect(pin.entries.map((entry) => entry.path).sort()).toEqual(['tests/guardrails/_support/pending.ts', 'tests/guardrails/_support/property.ts']);
    for (const name of readdirSync(join(root, 'tests/guardrails/_support')).filter((file) => file.endsWith('.ts'))) {
      const path = `tests/guardrails/_support/${name}`;
      expect(supportModuleFaults(path, readFileSync(join(root, path), 'utf8'), [], pin.entries).problems, path).toEqual([]);
    }
  });
});
