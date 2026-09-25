/**
 * The loosening check on the repository, its control input, its seeded bad
 * inputs, and the baseline writer (docs/guardrails.md section 10; prompt 3
 * sections 5.2 and 5.4).
 */
import { readFileSync } from 'node:fs';
import { PRODUCTION_GATES_DIR, loadGateDefinitions } from '@sovitech/registry/gates';
import { BASELINE_PATH, PROPOSED_SETTINGS } from '@sovitech/registry/validation';
import { describe, expect, it } from 'vitest';
import check from './check';
import { EXCEPTION_LISTS_BASELINE_PATH, readCurrentLists } from './exception-lists';
import { CONTROL_SEEDS, badSeeds, expectedReasons, runSeed } from './selftest';
import selfTest from './selftest';
import { planBaseline, planExceptionLists, repoExceptionListPlanInputs, repoPlanInputs } from './write-baseline';

// The repository runs read every gate, list and baseline; under the full parallel run they exceed Vitest's 5 s default.
describe('the loosening check', { timeout: 60_000 }, () => {
  it('passes on the repository against unapproved baseline v0, and lists what waits for approval', async () => {
    const result = await check();
    expect(result.details.filter((line) => line.startsWith('problem:'))).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.summary).toContain('unapproved baseline v0');
    expect(result.summary).toContain('no approver is named');
    expect(result.details.filter((line) => line.startsWith('waiting for approval: gate '))).toHaveLength(18);
  });

  it('passes on the repository against the exception-list part too, and lists its allow entries as waiting', async () => {
    const result = await check();
    expect(result.summary).toContain('unapproved baseline v0 (exception lists)');
    expect(result.summary).toMatch(/\d+ exception lists as recorded/);
    expect(result.details.some((line) => /^waiting for approval: exception list render\.entries: max-file-size \(recorded \d{4}-\d{2}-\d{2}\)$/.test(line))).toBe(true);
    expect(result.details.some((line) => line.startsWith('waiting for approval: exception list mockup-figures (deny list)'))).toBe(true);
  });

  it.each(CONTROL_SEEDS)('passes its control input seeded/%s', { timeout: 60_000 }, async (name) => {
    const result = await runSeed(name);
    expect(result.details.filter((line) => line.startsWith('problem:'))).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('holds the seeded inputs the builder task names', () => {
    expect(badSeeds()).toEqual(
      expect.arrayContaining(['open-gate-no-approver', 'open-gate-no-reference', 'looser-estimation', 'dataset-without-approval', 'unrecorded-field']),
    );
  });

  it('holds the round 2 seeds: approvals from git, the runtime override probe, and the exception lists', () => {
    expect(badSeeds()).toEqual(
      expect.arrayContaining([
        'approval-row-only-in-working-tree',
        'approval-row-committed-on-build-branch',
        'approver-named-on-build-branch',
        'approval-cell-future-date',
        'approver-table-placeholder-tbd',
        'gate-override-outside-proposed-runner',
        'exception-list-render-entry-added',
        'exception-list-eslint-allowlist-added',
        'exception-list-figure-removed',
      ]),
    );
  });

  it.each(badSeeds())('fails seeded/%s for its own reason', { timeout: 60_000 }, async (name) => {
    const result = await runSeed(name);
    expect(result.ok).toBe(false);
    for (const reason of expectedReasons(name)) expect(result.details.join('\n')).toContain(reason);
  });

  it('self-test returns one failing result per bad seed', { timeout: 60_000 }, async () => {
    const results = await selfTest();
    const list = Array.isArray(results) ? results : [results];
    expect(list).toHaveLength(badSeeds().length);
    expect(list.every((result) => !result.ok)).toBe(true);
  });
});

describe('the baseline writer', () => {
  it('finds the committed baseline up to date', () => {
    const plan = planBaseline(repoPlanInputs('2099-01-01'));
    expect(plan.problems).toEqual([]);
    expect(plan.changed).toBe(false);
    expect(plan.text).toBe(readFileSync(BASELINE_PATH, 'utf8'));
  });

  it('finds the exception-list baseline up to date', async () => {
    const plan = await planExceptionLists(await repoExceptionListPlanInputs('2099-01-01'));
    expect(plan.problems).toEqual([]);
    expect(plan.changed).toBe(false);
    expect(plan.newEntries).toEqual([]);
    expect(plan.text).toBe(readFileSync(EXCEPTION_LISTS_BASELINE_PATH, 'utf8'));
  });

  it('refuses an entry added to an allow list, and an entry removed from a deny list', async () => {
    const inputs = await repoExceptionListPlanInputs('2099-01-01');
    const lists = new Map([...inputs.current.lists].map(([id, list]) => [id, { ...list, entries: new Map(list.entries) }]));
    lists.get('render.entries')?.entries.set('test-quantity-line', { sha256: 'a'.repeat(64), label: 'test-quantity-line' });
    const figures = lists.get('mockup-figures');
    const firstFigure = [...(figures?.entries.keys() ?? [])][0] ?? '';
    figures?.entries.delete(firstFigure);
    const plan = await planExceptionLists({ ...inputs, current: { ...inputs.current, lists } });
    expect(plan.ok).toBe(false);
    expect(plan.problems.join('\n')).toContain('exception list render.entries: entry added: test-quantity-line: a loosening');
    expect(plan.problems.join('\n')).toContain(`exception list mockup-figures: entry removed from a deny list: ${firstFigure}: a loosening`);
  });

  it('records a tightening with the day it was recorded, and reports it for the build log', async () => {
    const inputs = await repoExceptionListPlanInputs('2099-01-01');
    const lists = new Map([...inputs.current.lists].map(([id, list]) => [id, { ...list, entries: new Map(list.entries) }]));
    lists.get('render.entries')?.entries.delete('max-file-size');
    const extensions = lists.get('fixture-manifest.document-extensions');
    extensions?.entries.set('test-ext', { sha256: 'b'.repeat(64), label: 'test-ext' });
    const plan = await planExceptionLists({ ...inputs, current: { ...inputs.current, lists } });
    expect(plan.problems).toEqual([]);
    expect(plan.changed).toBe(true);
    expect(plan.text).not.toContain('"max-file-size"');
    expect(plan.text).toContain('"test-ext": {\n          "recordedOn": "2099-01-01"');
    expect(plan.newEntries).toContain(`fixture-manifest.document-extensions (deny list; removing an entry is a loosening): 1 entries of ${extensions?.entries.size ?? -1}`);
  });

  it('refuses to record the lists again when the baseline is missing but committed, or git cannot tell', async () => {
    const inputs = await repoExceptionListPlanInputs('2099-01-01');
    for (const inHead of [true, undefined]) {
      const plan = await planExceptionLists({ ...inputs, existing: undefined, onDisk: '', inHead });
      expect(plan.ok, String(inHead)).toBe(false);
    }
    const first = await planExceptionLists({ ...inputs, existing: undefined, onDisk: '', inHead: false });
    expect(first.problems).toEqual([]);
    expect(first.newEntries).toContain('render.entries (allow list): max-file-size');
  });

  it('refuses a list it cannot read', async () => {
    const inputs = await repoExceptionListPlanInputs('2099-01-01');
    const current = await readCurrentLists(undefined, [
      { id: 'broken', direction: 'allow', source: 'nowhere', read: async () => Promise.reject(new Error('gone')) },
    ]);
    const plan = await planExceptionLists({ ...inputs, current });
    expect(plan.ok).toBe(false);
    expect(plan.problems.join('\n')).toContain('exception list broken: cannot be read from nowhere: gone');
  });

  it('records a new strict field', () => {
    const inputs = repoPlanInputs('2099-01-01');
    const registry = {
      ...(inputs.registry as Record<string, unknown>),
      units: [{ code: 'm2', symbol: 'm²', dimension: 'area' }],
      formulas: [{ id: 'writerFormula', version: '1', inputs: ['building.writerArea'], outputs: ['writer.output'] }],
      fields: [
        {
          key: 'building.writerArea',
          label: 'Writer area (synthetic)',
          subject: 'building',
          kind: 'quantity',
          unit: 'm2',
          dimension: 'area',
          estimation: 'forbidden',
          criticality: 'for_quotation',
          impactRank: 1,
          confirmBy: 'engineer',
          affects: [{ output: 'writer.output', via: 'formula:writerFormula@1' }],
        },
      ],
    };
    const plan = planBaseline({ ...inputs, registry });
    expect(plan.problems).toEqual([]);
    expect(plan.changed).toBe(true);
    expect(plan.text).toContain('"recordedOn": "2099-01-01"');
    expect(plan.text).toContain('building.writerArea');
  });

  it('refuses a looser setting', () => {
    const inputs = repoPlanInputs();
    const settings = { ...PROPOSED_SETTINGS, confirmationBudget: { ...PROPOSED_SETTINGS.confirmationBudget, value: 8 } };
    const plan = planBaseline({ ...inputs, registry: { ...(inputs.registry as Record<string, unknown>), settings } });
    expect(plan.ok).toBe(false);
    expect(plan.problems.join('\n')).toContain('confirmation budget 7 → 8: a loosening');
  });

  it('refuses an open gate and a filled approval reference', () => {
    const inputs = repoPlanInputs();
    const gates = loadGateDefinitions(PRODUCTION_GATES_DIR).map((gate) =>
      gate.id === 'operations' ? { ...gate, open: true } : gate.id === 'ifc-areas' ? { ...gate, waitsFor: gate.waitsFor.map((item) => ({ ...item, approvalRef: 'guardrails-changelog:1.5' })) } : gate,
    );
    const plan = planBaseline({ ...inputs, gates });
    expect(plan.ok).toBe(false);
    expect(plan.problems.join('\n')).toContain('operations.yaml: the gate is open');
    expect(plan.problems.join('\n')).toContain('ifc-areas.yaml');
  });

  it('refuses a registry that fails validation', () => {
    const inputs = repoPlanInputs();
    const plan = planBaseline({ ...inputs, registry: { ...(inputs.registry as Record<string, unknown>), fields: [{ key: 'bad' }] } });
    expect(plan.ok).toBe(false);
    expect(plan.problems[0]).toContain('registry validation');
  });
});
