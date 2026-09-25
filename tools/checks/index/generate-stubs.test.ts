import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { classifyEvalCase, classifyTestCase } from './case-files';
import { planStubs, renderStub, writeStubs, type StubWriter } from './generate-stubs';

const seeded = (name: string): string => join(dirname(fileURLToPath(import.meta.url)), 'seeded', name);

/** Records writes instead of touching the disk. */
function fakeWriter(existing: string[] = []): StubWriter & { written: Map<string, string> } {
  const written = new Map<string, string>();
  return {
    written,
    exists: (path) => existing.includes(path) || written.has(path),
    ensureDir: () => undefined,
    write: (path, content) => {
      written.set(path, content);
    },
  };
}

describe('stub generator (written, not run while D-33 is open)', () => {
  it('plans one stub per id with no case file, in the folder of its type', async () => {
    const plan = await planStubs(seeded('missing-id'));
    expect(plan.problems).toEqual([]);
    expect(plan.stubs.map((stub) => stub.path)).toEqual(['tests/guardrails/G1-2.test.ts']);
    const wrongType = await planStubs(seeded('wrong-type-test'));
    expect(wrongType.stubs.map((stub) => stub.path)).toEqual(['evals/guardrails/G2-1.yaml']);
  });

  it('plans nothing when every id has a case file', async () => {
    const plan = await planStubs(seeded('good'));
    expect(plan.stubs).toEqual([]);
  });

  it('refuses to plan while the section 7 table has problems', async () => {
    const plan = await planStubs(seeded('duplicate-id'));
    expect(plan.stubs).toEqual([]);
    expect(plan.problems.length).toBeGreaterThan(0);
  });

  it('writes stubs that the index check classifies as stubs, never as real or pending cases', () => {
    const testStub = renderStub({ id: 'G1-2', type: 'T' });
    expect(testStub).toContain("test.todo('G1-2 · pending stub: no automated check yet')");
    expect(classifyTestCase('G1-2', 'tests/guardrails/G1-2.test.ts', testStub, () => undefined)).toEqual({
      status: 'stub',
      problems: [],
    });
    const evalStub = renderStub({ id: 'G1-1', type: 'E' });
    expect(classifyEvalCase('G1-1', 'evals/guardrails/G1-1.yaml', evalStub)).toEqual({ status: 'stub', problems: [] });
  });

  it('never overwrites an existing file', () => {
    const writer = fakeWriter([join('/nowhere', 'tests/guardrails/G1-2.test.ts')]);
    const outcome = writeStubs(
      '/nowhere',
      [
        { id: 'G1-2', type: 'T', path: 'tests/guardrails/G1-2.test.ts', content: 'x' },
        { id: 'G1-1', type: 'E', path: 'evals/guardrails/G1-1.yaml', content: 'y' },
      ],
      writer,
    );
    expect(outcome.written).toEqual(['evals/guardrails/G1-1.yaml']);
    expect(outcome.skipped).toEqual(['tests/guardrails/G1-2.test.ts']);
    expect([...writer.written.keys()]).toEqual([join('/nowhere', 'evals/guardrails/G1-1.yaml')]);
  });
});
