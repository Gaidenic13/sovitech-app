/**
 * Gates (prompt 3 section 5.4): data files in packages/registry/gates/, one
 * read function that takes a gate source, a production source built only from
 * that folder, every gate closed, and a check that fails any open gate whose
 * approval references do not resolve.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseApprovalContext } from '../approvals';
import * as gatesEntry from './index';
import {
  GATE_IDS,
  PRODUCTION_GATES_DIR,
  assertGatesStartupSafe,
  checkProductionDefinitions,
  gateSetProblems,
  isProductionSource,
  isStartupCheckedSource,
  loadGateDefinitions,
  productionGateSource,
  readGate,
  verifyGates,
  type GateDefinition,
  type GateSource,
} from './index';
import * as sourceModule from './source';
import { PROPOSED_RUNNER_SETUP_FILE, armTestOverridesForProposedRunner, disarmTestOverrides, issueTestOverrideSource } from './source';
import { REPO_ROOT } from '../approvals';

/**
 * Runs `run` as if this worker were the tests/proposed/ runner: Vitest's worker
 * state is replaced for the length of one synchronous call (no expect() inside:
 * expect reads that state), then restored. The real runner is proven end to end
 * in ../test-utils/test-utils.test.ts.
 */
function asProposedRunner<T>(run: () => T): T {
  const real: unknown = Reflect.get(globalThis, '__vitest_worker__');
  Reflect.set(globalThis, '__vitest_worker__', {
    filepath: join(REPO_ROOT, 'tests', 'proposed', 'unit-stand-in.test.ts'),
    config: { root: REPO_ROOT, setupFiles: [PROPOSED_RUNNER_SETUP_FILE] },
  });
  try {
    armTestOverridesForProposedRunner();
    return run();
  } finally {
    disarmTestOverrides();
    Reflect.set(globalThis, '__vitest_worker__', real);
  }
}

function outcome(run: () => unknown): string {
  try {
    return `ok: ${String(run())}`;
  } catch (error) {
    return `refused: ${error instanceof Error ? error.message : String(error)}`;
  }
}

const temporaryDirs: string[] = [];
afterEach(() => {
  for (const dir of temporaryDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sovitech-gates-'));
  temporaryDirs.push(dir);
  return dir;
}

const STARTING_SET: Record<string, string[]> = {
  'ifc-values': ['ifc-input 6.2.1', 'ifc-input 6.2.2', 'ifc-input 6.2.3', 'ifc-input 6.2.10', 'IFC mapping tables (GAP-I)', 'build-readiness decision 4'],
  'ifc-code-inference': ['ifc-input 6.2.9'],
  'ifc-identity': ['ifc-input 6.2.4'],
  'ifc-untagged-count': ['ifc-input 6.2.5'],
  'ifc-areas': ['ifc-input 6.2.6'],
  'ifc-geometry': ['ifc-input 6.2.7'],
  'ifc-units': ['ifc-input 6.2.11'],
  'ifc-hidden-content': ['ifc-input 6.2.13'],
  'view-provenance': ['proposal 7.2.8', 'ifc-input 6.2.15'],
  'dataset-asset-taxonomy': ['SOVITECH asset taxonomy with lifeSafety flags'],
  'dataset-glossary': ['Romanian glossary, engineer-reviewed'],
  'dataset-point-templates': ['SOVITECH point templates'],
  'dataset-cost-ranges': ['SOVITECH cost ranges and benchmarks'],
  'dataset-sauter-catalogue': ['SAUTER catalogue'],
  'units-7.2.22': ['proposal 7.2.22'],
  'financial-indicators': ['dashboards 8.6', 'proposal 7.2.12'],
  operations: ['dashboards 8.1', 'proposal 7.2.1', 'proposal 7.2.2', 'proposal 7.2.11', 'proposal 7.2.16', 'proposal 7.2.33'],
  'ai-processor-route': ['build-readiness decision 2'],
};

describe('the gate files in packages/registry/gates/', () => {
  const gates = loadGateDefinitions(PRODUCTION_GATES_DIR);

  it('hold the full starting set of prompt 3 section 5.4, one file per gate', () => {
    expect(gates.map((gate) => gate.id).sort()).toEqual([...GATE_IDS].sort());
    expect(Object.keys(STARTING_SET).sort()).toEqual([...GATE_IDS].sort());
    expect(gateSetProblems(gates)).toEqual([]);
    const files = readdirSync(PRODUCTION_GATES_DIR).filter((name) => name.endsWith('.yaml'));
    expect(files.sort()).toEqual(GATE_IDS.map((id) => `${id}.yaml`).sort());
  });

  it('keep every gate closed, with one empty approval reference per item it waits for', () => {
    for (const gate of gates) {
      expect(gate.open, gate.id).toBe(false);
      expect(gate.closedBehaviour.length, gate.id).toBeGreaterThan(20);
      for (const item of gate.waitsFor) expect(item.approvalRef, `${gate.id}: ${item.item}`).toBe('');
    }
  });

  it('name what each gate waits for, with its D id', () => {
    for (const gate of gates) {
      expect(gate.waitsFor.map((item) => item.item), gate.id).toEqual(STARTING_SET[gate.id]);
      for (const item of gate.waitsFor) expect(item.dId, `${gate.id}: ${item.item}`).toMatch(/^D-\d+$/);
    }
    const ifcValues = gates.find((gate) => gate.id === 'ifc-values');
    expect(ifcValues?.waitsFor.map((item) => [item.item, item.kind, item.dId])).toEqual([
      ['ifc-input 6.2.1', 'guardrail-proposal', 'D-38'],
      ['ifc-input 6.2.2', 'guardrail-proposal', 'D-39'],
      ['ifc-input 6.2.3', 'guardrail-proposal', 'D-40'],
      ['ifc-input 6.2.10', 'guardrail-proposal', 'D-37'],
      ['IFC mapping tables (GAP-I)', 'dataset', 'D-37'],
      ['build-readiness decision 4', 'owner-decision', 'D-01'],
    ]);
    expect(gates.find((gate) => gate.id === 'ai-processor-route')?.waitsFor[0]).toMatchObject({ kind: 'owner-decision', dId: 'D-09' });
  });

  it('give every dataset item a dataset id', () => {
    for (const gate of gates) {
      for (const item of gate.waitsFor) {
        if (item.kind === 'dataset') expect(item.dataset, `${gate.id}: ${item.item}`).toMatch(/^[a-z][a-z0-9-]+$/);
        else expect(item.dataset, `${gate.id}: ${item.item}`).toBeUndefined();
      }
    }
  });
});

describe('readGate and the production source', () => {
  it('reads every gate as closed from the production source', () => {
    const source = productionGateSource();
    expect(isProductionSource(source)).toBe(true);
    for (const id of GATE_IDS) {
      const reading = readGate(source, id);
      expect(reading.open).toBe(false);
      expect(reading.id).toBe(id);
    }
  });

  it('returns a frozen reading, so no caller can open a gate by writing to it', () => {
    const reading = readGate(productionGateSource(), 'ifc-values');
    expect(Object.isFrozen(reading)).toBe(true);
    expect(() => {
      (reading as { open: boolean }).open = true;
    }).toThrow();
    expect(readGate(productionGateSource(), 'ifc-values').open).toBe(false);
  });

  it('throws on an unknown gate id instead of guessing', () => {
    expect(() => readGate(productionGateSource(), 'no-such-gate' as never)).toThrow(/unknown gate/);
  });

  it('refuses a source that the registry did not build', () => {
    const forged = { kind: 'production', gates: new Map() } as unknown as GateSource;
    expect(() => readGate(forged, 'ifc-values')).toThrow(/not a gate source/);
  });

  it('has no environment variable or configuration path that reaches a gate', () => {
    const here = join(PRODUCTION_GATES_DIR, '..', 'src', 'gates');
    for (const name of readdirSync(here).filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))) {
      const text = readFileSync(join(here, name), 'utf8');
      expect(text, name).not.toMatch(/process\.env|process\.argv|import\.meta\.env/);
    }
  });

  it('fails closed: open gate definitions are refused unless the gate passes the approval check', () => {
    const definitions = loadGateDefinitions(PRODUCTION_GATES_DIR).map((gate) =>
      gate.id === 'operations' ? { ...gate, open: true } : gate,
    );
    const noApprover = parseApprovalContext({ guardrails: guardrailsText('*(to be named by the product owner)*', []) });
    expect(() => checkProductionDefinitions(definitions, () => noApprover)).toThrow(/operations/);
  });

  it('refuses definitions that miss a gate of the starting set', () => {
    const definitions = loadGateDefinitions(PRODUCTION_GATES_DIR).filter((gate) => gate.id !== 'ifc-values');
    expect(() => checkProductionDefinitions(definitions, () => parseApprovalContext({ guardrails: '' }))).toThrow(/ifc-values/);
  });

  it('does not read the approval documents while every gate is closed', () => {
    let loaded = false;
    checkProductionDefinitions(loadGateDefinitions(PRODUCTION_GATES_DIR), () => {
      loaded = true;
      throw new Error('must not be called');
    });
    expect(loaded).toBe(false);
  });
});

describe('who can issue a gate source (phase 0 review: a gate opened by a deep import)', () => {
  it('exports nothing from the gate source module that issues a source of a chosen kind or over chosen gates', () => {
    // Before the fix, source.ts exported issueSource(kind, gates), gatesOf(source) and
    // createVerifiedSource(definitions, loader): a relative deep import opened any gate
    // on a source that isProductionSource() accepted.
    expect(Object.keys(sourceModule).sort()).toEqual(
      [
        'GateApprovalError',
        'PROPOSED_RUNNER_SETUP_FILE',
        'armTestOverridesForProposedRunner',
        'assertGatesStartupSafe',
        'checkProductionDefinitions',
        'disarmTestOverrides',
        'isProductionSource',
        'isStartupCheckedSource',
        'issueTestOverrideSource',
        'productionGateSource',
        'readGate',
      ].sort(),
    );
  });

  it('keeps the test-override path and the arming functions out of the gates entry', () => {
    for (const name of ['issueTestOverrideSource', 'armTestOverridesForProposedRunner', 'disarmTestOverrides']) {
      expect(Object.keys(gatesEntry)).not.toContain(name);
    }
    for (const name of ['issueSource', 'gatesOf', 'createVerifiedSource', 'issue']) expect(Object.keys(gatesEntry)).not.toContain(name);
  });

  it('lets only the gates entry, the test-utils entry, the proposed runner\'s setup file and their tests import the gate source module', () => {
    const srcRoot = join(PRODUCTION_GATES_DIR, '..', 'src');
    const importers: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
          const text = readFileSync(path, 'utf8');
          const here = relative(srcRoot, path).split('\\').join('/');
          const pointsAtSource = [...text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].some((match) => {
            const specifier = match[1] ?? '';
            if (!specifier.startsWith('.')) return false;
            const target = relative(srcRoot, join(dir, specifier)).split('\\').join('/');
            return target === 'gates/source' || target === 'gates/source.ts' || target === 'gates/source.js';
          });
          if (pointsAtSource) importers.push(here);
        }
      }
    };
    walk(srcRoot);
    const allowed = (file: string): boolean =>
      file === 'gates/index.ts' || /^(?:gates|test-utils)\/[^/]+\.test\.ts$/.test(file) || file === 'test-utils/index.ts' || file === 'test-utils/proposed-runner-setup.ts';
    expect(importers.filter((file) => !allowed(file))).toEqual([]);
    expect(importers).toContain('test-utils/index.ts');
    expect(importers).toContain('test-utils/proposed-runner-setup.ts');
  });

  it('issues only test-override sources on the test path, never a production one', () => {
    const production = productionGateSource();
    const seen = asProposedRunner(() => {
      const override = issueTestOverrideSource(production, 'ifc-values');
      return {
        kind: override.kind,
        production: isProductionSource(override),
        startupChecked: isStartupCheckedSource(override),
        open: readGate(override, 'ifc-values').open,
        productionOpen: readGate(production, 'ifc-values').open,
        // Chaining keeps the kind: an override of an override is still an override.
        chainedProduction: isProductionSource(issueTestOverrideSource(override, 'ifc-areas')),
      };
    });
    expect(seen).toEqual({ kind: 'test-override', production: false, startupChecked: false, open: true, productionOpen: false, chainedProduction: false });
  });

  it('refuses a forged base and an unknown gate on the test path', () => {
    const forged = Object.freeze({ kind: 'production' }) as GateSource;
    const seen = asProposedRunner(() => [
      outcome(() => issueTestOverrideSource(forged, 'ifc-values')),
      outcome(() => issueTestOverrideSource(productionGateSource(), 'no-such-gate' as never)),
    ]);
    expect(seen[0]).toMatch(/refused: .*not a gate source/);
    expect(seen[1]).toMatch(/refused: .*unknown gate/);
  });
});

describe('a test-override source outside the tests/proposed/ runner (phase 0 review, round 2)', () => {
  // The verifier's probe: a computed dynamic import reached issueTestOverrideSource outside
  // Vitest, and readGate read the gate open; only the VITEST variable stood in the way.
  it('refuses to issue one in any other runner, this unit runner included', () => {
    expect(() => issueTestOverrideSource(productionGateSource(), 'ifc-values')).toThrow(/exists only inside the tests\/proposed\/ runner/);
  });

  it('refuses to arm in a runner whose current file is not under tests/proposed/', () => {
    expect(() => armTestOverridesForProposedRunner()).toThrow(/not under tests\/proposed\//);
  });

  it('refuses to arm when the runner does not register the proposed-runner setup file', () => {
    const real: unknown = Reflect.get(globalThis, '__vitest_worker__');
    Reflect.set(globalThis, '__vitest_worker__', { filepath: join(REPO_ROOT, 'tests', 'proposed', 'x.test.ts'), config: { root: REPO_ROOT, setupFiles: [] } });
    const seen = outcome(() => armTestOverridesForProposedRunner());
    Reflect.set(globalThis, '__vitest_worker__', real);
    expect(seen).toMatch(/refused: .*does not register packages\/registry\/src\/test-utils\/proposed-runner-setup\.ts/);
  });

  it('refuses to read one once its runner ended: a production-context read throws', () => {
    const override = asProposedRunner(() => issueTestOverrideSource(productionGateSource(), 'ifc-values'));
    expect(() => readGate(override, 'ifc-values')).toThrow(/readGate: a test-override gate source exists only inside the tests\/proposed\/ runner/);
    // The production source is read everywhere, as before.
    expect(readGate(productionGateSource(), 'ifc-values').open).toBe(false);
  });

});

describe('assertGatesStartupSafe', () => {
  it('returns a production source marked as start-up checked, with every gate closed', () => {
    const source = assertGatesStartupSafe();
    expect(isProductionSource(source)).toBe(true);
    expect(isStartupCheckedSource(source)).toBe(true);
    for (const id of GATE_IDS) expect(readGate(source, id).open).toBe(false);
  });

  it('marks only what it returned: the plain production source and forged objects are not start-up checked', () => {
    assertGatesStartupSafe();
    expect(isStartupCheckedSource(productionGateSource())).toBe(false);
    expect(isStartupCheckedSource(Object.freeze({ kind: 'production' }) as GateSource)).toBe(false);
  });
});

describe('loadGateDefinitions', () => {
  function writeGate(dir: string, name: string, text: string): void {
    writeFileSync(join(dir, name), text);
  }
  const valid = (id: string): string =>
    [
      `id: ${id}`,
      'open: false',
      'waitsFor:',
      '  - item: proposal 7.2.8',
      '    kind: guardrail-proposal',
      '    dId: D-45',
      "    approvalRef: ''",
      'closedBehaviour: No pins or highlights from location evidence on any view.',
      'source: unit test',
      '',
    ].join('\n');

  it('names the file when a gate is malformed', () => {
    const dir = tempDir();
    writeGate(dir, 'view-provenance.yaml', valid('view-provenance').replace("    approvalRef: ''\n", ''));
    expect(() => loadGateDefinitions(dir)).toThrow(/view-provenance\.yaml/);
  });

  it('fails when the file name differs from the gate id', () => {
    const dir = tempDir();
    writeGate(dir, 'something-else.yaml', valid('view-provenance'));
    expect(() => loadGateDefinitions(dir)).toThrow(/file name/);
  });

  it('rejects an unknown gate id', () => {
    const dir = tempDir();
    writeGate(dir, 'made-up.yaml', valid('made-up'));
    expect(() => loadGateDefinitions(dir)).toThrow(/made-up/);
  });

  it('rejects a dataset item without a dataset id', () => {
    const dir = tempDir();
    writeGate(dir, 'view-provenance.yaml', valid('view-provenance').replace('kind: guardrail-proposal', 'kind: dataset'));
    expect(() => loadGateDefinitions(dir)).toThrow(/dataset/);
  });

  it('reports missing gates in the set check', () => {
    const dir = tempDir();
    writeGate(dir, 'view-provenance.yaml', valid('view-provenance'));
    expect(gateSetProblems(loadGateDefinitions(dir)).join('\n')).toContain('ifc-values');
  });
});

function guardrailsText(approver: string, rows: string[]): string {
  return [
    '## 10. Keeping the guardrails improving',
    '',
    '| Approver | Role | Since |',
    '|---|---|---|',
    `| ${approver} | Product owner | |`,
    '',
    '### Change log',
    '',
    '| Version | Date | Change | Approved by |',
    '|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}

describe('verifyGates', () => {
  const operations = (): GateDefinition => {
    const gate = loadGateDefinitions(PRODUCTION_GATES_DIR).find((item) => item.id === 'operations');
    if (gate === undefined) throw new Error('operations gate missing');
    return gate;
  };
  const approvedRows = [
    '| 2.0 | 2026-04-01 | Accepted proposals 7.2.1, 7.2.2, 7.2.11, 7.2.16 and 7.2.33. | Ana Test |',
  ];
  const prd = [
    '## 15. Open decisions',
    '| D id | Source id(s) | Question | Kind | Owner | Recommended default | Until decided | Impact | What it blocks |',
    '|---|---|---|---|---|---|---|---|---|',
    '| D-28 | dashboards 8.1 | Operations phase? | product decision | product owner | Decided: Owner decision 2026-04-02 ("build the operations phase") | x | y | z |',
    '## 16. Glossary',
  ].join('\n');

  function opened(refs: Record<string, string>): GateDefinition {
    const gate = operations();
    return {
      ...gate,
      open: true,
      waitsFor: gate.waitsFor.map((item) => ({ ...item, approvalRef: refs[item.item] ?? '' })),
    };
  }
  const allRefs = {
    'dashboards 8.1': 'owner-decision:D-28',
    'proposal 7.2.1': 'guardrails-changelog:2.0',
    'proposal 7.2.2': 'guardrails-changelog:2.0',
    'proposal 7.2.11': 'guardrails-changelog:2.0',
    'proposal 7.2.16': 'guardrails-changelog:2.0',
    'proposal 7.2.33': 'guardrails-changelog:2.0',
  };

  it('passes every gate in the repository today (all closed, all references empty)', () => {
    const context = parseApprovalContext({ guardrails: guardrailsText('*(to be named by the product owner)*', []) });
    expect(verifyGates(loadGateDefinitions(PRODUCTION_GATES_DIR), context)).toEqual([]);
  });

  it('fails an open gate with no reference', () => {
    const context = parseApprovalContext({ guardrails: guardrailsText('Ana Test', approvedRows), prd });
    const problems = verifyGates([opened({})], context);
    expect(problems.join('\n')).toContain('operations');
    expect(problems.join('\n')).toContain('no approval reference');
  });

  it('fails any open gate while the approver table is empty, even with every reference filled', () => {
    const context = parseApprovalContext({ guardrails: guardrailsText('*(to be named by the product owner)*', approvedRows), prd });
    expect(verifyGates([opened(allRefs)], context).join('\n')).toContain('no approver is named');
  });

  it('passes an open gate only when the approver is named and every reference resolves', () => {
    const context = parseApprovalContext({ guardrails: guardrailsText('Ana Test', approvedRows), prd });
    expect(verifyGates([opened(allRefs)], context)).toEqual([]);
  });

  it('fails an open gate when one owner decision is not recorded', () => {
    const context = parseApprovalContext({ guardrails: guardrailsText('Ana Test', approvedRows), prd: '## 15. Open decisions\n## 16. G\n' });
    expect(verifyGates([opened(allRefs)], context).join('\n')).toContain('dashboards 8.1');
  });

  it('fails a closed gate that carries a reference that does not resolve', () => {
    const context = parseApprovalContext({ guardrails: guardrailsText('*(to be named by the product owner)*', []) });
    const gate = operations();
    const withBogus = { ...gate, waitsFor: gate.waitsFor.map((item, i) => (i === 0 ? { ...item, approvalRef: 'approved' } : item)) };
    expect(verifyGates([withBogus], context).join('\n')).toContain('does not resolve');
  });
});
