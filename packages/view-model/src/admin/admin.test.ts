/**
 * The development-only admin area's view builders (phase 7; docs/adr/0053 decision 7; the contract:
 * ../browser/contract/admin.ts; PRD R-134, R-143, R-150, R-151, R-152, R-154, R-155 and their "Until decided" lines;
 * D-34's interim). The case files G1-33, G3-24, G3-26, G13-15, G13-16 and GS-2 prove the cases on these builders and on
 * the served responses; these tests pin the builders' own shape. Every account, project, document and count is TEST data.
 */
import { describe, expect, test } from 'vitest';
import { GUARDRAIL_EVENT_TYPES, calibrateTiers } from '@sovitech/domain';
import { statusLineById } from '@sovitech/registry';
import {
  ADMIN_GUARDRAIL_EVENT_TYPES,
  ADMIN_METRICS,
  AdminAccountsResponseSchema,
  AdminDatasetsResponseSchema,
  AdminGuardrailEventsResponseSchema,
  SPEED_TRUTH_PAIRS,
  type AdminGuardrailEventType,
  type DisplayObject,
} from '../browser/contract';
import { lineOf } from '../resolver';
import { adminAccountsView, adminDatasetsView, adminGuardrailEventsView, type AdminGuardrailEventsInput } from './index';

const uuid = (n: number): string => `0192f0e4-7e57-7000-8000-${n.toString(16).padStart(12, '0')}`;
const AS_OF = '2026-10-07T09:00:00.000000Z';
const ADMIN = uuid(1);
const OWNER = uuid(2);
const SEED = uuid(3);
const PROJECT = uuid(10);
const DEMO = uuid(11);

const textOf = (displays: readonly DisplayObject[], valueId: string): string => {
  const found = displays.find((display) => display.valueId === valueId);
  if (found === undefined) throw new Error(`no display ${valueId}`);
  return found.text;
};

describe('ADR 0053 decision 7: the admin views', () => {
  test('the contract\'s section 8 list equals the domain\'s (the browser entry cannot import the domain)', () => {
    expect([...ADMIN_GUARDRAIL_EVENT_TYPES]).toEqual([...GUARDRAIL_EVENT_TYPES]);
  });

  test('UD-39 · R-154 "Until decided" · R-143 "Until decided": accounts with their roles, every role event with who acted, projects by id, no processor chosen, and no action anywhere', () => {
    const response = adminAccountsView({
      asOf: AS_OF,
      accounts: [
        { userId: ADMIN, displayName: 'Development admin', kind: 'person', roles: [{ role: 'sovitech_admin', since: '2026-10-07T08:00:00.000000Z' }], development: true },
        { userId: OWNER, displayName: 'TEST owner 7', kind: 'person', roles: [{ role: 'owner', since: '2026-10-06T08:00:00.000000Z' }], development: false },
        { userId: SEED, displayName: 'TEST demo seed', kind: 'seed', roles: [], development: false },
      ],
      roleEvents: [
        { eventId: uuid(20), userId: OWNER, role: 'owner', change: 'granted', byUserId: ADMIN, at: '2026-10-06T08:00:00.000000Z', reason: 'TEST granted by the admin' },
        { eventId: uuid(21), userId: ADMIN, role: 'sovitech_admin', change: 'granted', byUserId: null, at: '2026-10-05T08:00:00.000000Z', reason: 'TEST setup' },
      ],
      projects: [
        { projectId: PROJECT, isDemo: false, createdAt: '2026-10-06T09:00:00.000000Z', memberIds: [OWNER] },
        { projectId: DEMO, isDemo: true, createdAt: '2026-10-05T09:00:00.000000Z', memberIds: [SEED] },
      ],
    });
    expect(AdminAccountsResponseSchema.safeParse(response).success).toBe(true);
    const { view, displayObjects } = response;
    expect(view.processors).toEqual({ state: 'none_chosen' });
    expect(view.accounts.map((account) => [account.userId, account.kind, account.development])).toEqual([
      [ADMIN, 'person', true],
      [OWNER, 'person', false],
      [SEED, 'seed', false],
    ]);
    expect(textOf(displayObjects, `account:${OWNER}.displayName`)).toBe('TEST owner 7');
    expect(textOf(displayObjects, `account:${ADMIN}.roles.sovitech_admin.since`)).toBe('7 Oct 2026');
    expect(view.accounts[2]?.roles).toEqual([]);
    expect(textOf(displayObjects, `role_event:${uuid(20)}.by`)).toBe('Development admin');
    expect(textOf(displayObjects, `role_event:${uuid(21)}.by`)).toBe("The operator's login");
    expect(textOf(displayObjects, `role_event:${uuid(21)}.reason`)).toBe('TEST setup');
    expect(textOf(displayObjects, `role_event:${uuid(21)}.at`)).toBe('5 Oct 2026, 08:00');
    expect(view.projects.map((project) => [project.projectId, project.isDemo, project.members])).toEqual([
      [PROJECT, false, [OWNER]],
      [DEMO, true, [SEED]],
    ]);
    expect(textOf(displayObjects, `admin_project:${PROJECT}.id`)).toBe(PROJECT);
    expect(textOf(displayObjects, `admin_project:${PROJECT}.createdOn`)).toBe('6 Oct 2026');
    for (const display of displayObjects) expect(display.actions, display.valueId).toBeUndefined();
  });

  test('UD-40 · R-150 "Until decided" · G1-33: each dataset with no version received, no approval record and what waits for it; no action', () => {
    const response = adminDatasetsView({
      asOf: AS_OF,
      datasets: [
        { datasetKey: 'sovitech-cost-ranges', name: 'SOVITECH cost ranges and benchmarks', version: null, approved: false, gates: [{ gateId: 'dataset-cost-ranges', dId: 'D-92' }] },
        { datasetKey: 'romanian-glossary', name: 'Romanian glossary, engineer-reviewed', version: null, approved: false, gates: [{ gateId: 'dataset-glossary', dId: 'D-92' }] },
      ],
    });
    expect(AdminDatasetsResponseSchema.safeParse(response).success).toBe(true);
    const { view, displayObjects } = response;
    expect(view.datasets.map((dataset) => dataset.datasetKey)).toEqual(['sovitech-cost-ranges', 'romanian-glossary']);
    expect(textOf(displayObjects, 'dataset:sovitech-cost-ranges.name')).toBe('SOVITECH cost ranges and benchmarks');
    expect(textOf(displayObjects, 'dataset:sovitech-cost-ranges.version')).toBe('No version received');
    expect(textOf(displayObjects, 'dataset:sovitech-cost-ranges.approval')).toBe('No approval record');
    expect(textOf(displayObjects, 'dataset:sovitech-cost-ranges.waitsFor')).toBe('Waited for by dataset-cost-ranges (D-92)');
    for (const display of displayObjects) expect(display.actions, display.valueId).toBeUndefined();
  });

  test('UD-40 · A-7 (phase 7 part B): a dataset no gate waits for says so, never an empty "Waited for by  ()"', () => {
    const response = adminDatasetsView({
      asOf: AS_OF,
      datasets: [{ datasetKey: 'sovitech-declared-only', name: 'A declared dataset no gate waits for', version: null, approved: false, gates: [] }],
    });
    expect(AdminDatasetsResponseSchema.safeParse(response).success).toBe(true);
    expect(textOf(response.displayObjects, 'dataset:sovitech-declared-only.waitsFor')).toBe('No gate waits for it');
  });

  /** The TEST counts the store would give, every type of section 8 counted (migration 0018), a count of none written out. */
  type Tally = Readonly<Record<AdminGuardrailEventType, number>>;
  const counted = (owner: number, skipped: number): Tally => ({
    ai_output_rejected: 0,
    evidence_not_found: 0,
    question_for_known_field: 0,
    owner_corrected_inference: owner,
    engineer_corrected_accepted_item: 0,
    conflict_raised: 0,
    reserved_term_blocked: 0,
    embedded_instruction: 0,
    confirmation_budget_exceeded: 0,
    skipped,
  });
  const STORED: Readonly<Record<string, Tally>> = { [PROJECT]: counted(1, 3), [DEMO]: counted(0, 2) };
  const TOTALS: Tally = counted(1, 5);
  const eventsInput = (over: Partial<AdminGuardrailEventsInput> = {}): AdminGuardrailEventsInput => ({
    asOf: AS_OF,
    projects: [
      { projectId: PROJECT, isDemo: false },
      { projectId: DEMO, isDemo: true },
    ],
    // As the store counts them: every type for every project, and per type in all (migration 0018).
    counts: Object.entries(STORED).flatMap(([projectId, tally]) => ADMIN_GUARDRAIL_EVENT_TYPES.map((type) => ({ projectId, type, count: tally[type] }))),
    totals: ADMIN_GUARDRAIL_EVENT_TYPES.map((type) => ({ type, count: TOTALS[type] })),
    inferenceDecisions: [
      { projectId: PROJECT, confirmations: 2, corrections: 1 },
      { projectId: DEMO, confirmations: 0, corrections: 0 },
    ],
    calibration: calibrateTiers(
      [
        { tier: 'high', fieldKey: 'test.asset.type', outcome: 'corrected', by: 'owner', at: '2026-10-06T09:00:00.000000Z' },
        { tier: 'medium', fieldKey: 'test.building.type', outcome: 'corrected', by: 'owner', at: '2026-10-06T09:01:00.000000Z' },
        { tier: 'high', fieldKey: 'test.asset.type', outcome: 'agreed', by: 'owner', at: '2026-10-06T09:02:00.000000Z' },
      ],
      null,
    ),
    threshold: null,
    proposedThreshold: { correctionRatePercent: 10, window: 50 },
    erasures: [
      { documentEventId: uuid(30), projectId: PROJECT, isDemo: false, documentId: uuid(31), role: 'owner', byName: 'TEST owner 7', at: '2026-10-06T10:00:00.000000Z', excerptsErased: 2, textPartsDeleted: 1, candidatesWithdrawn: 2 },
      { documentEventId: uuid(32), projectId: DEMO, isDemo: true, documentId: uuid(33), role: 'system', byName: null, at: '2026-10-05T10:00:00.000000Z', excerptsErased: 0, textPartsDeleted: 0, candidatesWithdrawn: 0 },
    ],
    ...over,
  });

  test('UD-41 · R-151 · GS-2: counts per project and section 8 type, totals, the release split not counted, and each speed metric next to its truth metric', () => {
    const response = adminGuardrailEventsView(eventsInput());
    expect(AdminGuardrailEventsResponseSchema.safeParse(response).success).toBe(true);
    const { view, displayObjects } = response;
    // Every section 8 type, in its order, for each project; a type with no event is a count of none read from the store.
    for (const row of view.projects) expect(row.counts.map((count) => count.type)).toEqual([...ADMIN_GUARDRAIL_EVENT_TYPES]);
    expect(textOf(displayObjects, `guardrail_count:${PROJECT}.skipped`)).toBe('3');
    expect(textOf(displayObjects, `guardrail_count:${PROJECT}.question_for_known_field`)).toBe('0');
    expect(textOf(displayObjects, 'guardrail_count:all.skipped')).toBe('5');
    expect(textOf(displayObjects, 'guardrail_count:all.byRelease')).toBe('By release: not counted yet. No release is recorded with the events.');
    expect(view.projects.map((row) => [row.projectId, row.isDemo])).toEqual([
      [PROJECT, false],
      [DEMO, true],
    ]);
    // Section 4, "Measure it": each pair in the table's order, for each project.
    const [row] = view.metrics;
    expect(row?.pairs.map((pair) => [pair.speed.metric, pair.truth.metric])).toEqual(SPEED_TRUTH_PAIRS.map((pair) => [pair.speed, pair.truth]));
    expect(textOf(displayObjects, `metric:${PROJECT}.questions_per_project`)).toBe('not counted yet');
    expect(textOf(displayObjects, `metric:${PROJECT}.owner_correction_rate`)).toBe('1 of 3 decisions corrected (33.3%)');
    expect(textOf(displayObjects, `metric:${DEMO}.owner_correction_rate`)).toBe('No decision on an inference recorded');
    // Phase 7 part B (V-3, A-2): no code writes engineer_corrected_accepted_item while D-16 is open, so a count of none reads as not counted.
    expect(textOf(displayObjects, `metric:${PROJECT}.engineer_corrections_of_accepted_items`)).toBe('not counted yet');
    expect(textOf(displayObjects, `guardrail_count:${PROJECT}.engineer_corrected_accepted_item`)).toBe('not counted yet');
    expect(textOf(displayObjects, 'guardrail_count:all.engineer_corrected_accepted_item')).toBe('not counted yet');
    expect(textOf(displayObjects, `guardrail_count:${PROJECT}.conflict_raised`)).toBe('0');
    expect(textOf(displayObjects, `metric:${PROJECT}.time_to_first_estimate`)).toBe('not counted yet');
    for (const metric of ADMIN_METRICS) expect(textOf(displayObjects, `metric:${PROJECT}.${metric}.target`)).toBe('Target not set');
    for (const display of displayObjects) expect(display.actions, display.valueId).toBeUndefined();
  });

  test('UD-41 · R-152 "Until decided" · G3-24 · G3-26: corrections per tier and item type, the threshold not set, every tier\'s wording unchanged', () => {
    const { view, displayObjects } = adminGuardrailEventsView(eventsInput());
    expect(textOf(displayObjects, 'calibration:all.threshold')).toBe(
      "Not set: the approver sets it (the guardrails propose 10% over the last 50 decisions). No tier's wording changes until then.",
    );
    expect(view.calibration.tiers.map((tier) => [tier.tier, tier.dropped])).toEqual([
      ['high', false],
      ['medium', false],
      ['low', false],
    ]);
    expect(textOf(displayObjects, 'calibration:high.wording')).toBe('Likely, unchanged');
    expect(textOf(displayObjects, 'calibration:medium.wording')).toBe('Possible, unchanged');
    expect(textOf(displayObjects, 'calibration:low.wording')).toBe('Please check or SOVITECH will check, unchanged');
    expect(view.calibration.tiers[0]?.items).toEqual([{ fieldKey: 'test.asset.type', corrections: 'calibration:high.items.test.asset.type.corrections' }]);
    expect(textOf(displayObjects, 'calibration:high.items.test.asset.type.corrections')).toBe('1');
    expect(textOf(displayObjects, 'calibration:medium.items.test.building.type.corrections')).toBe('1');
    expect(view.calibration.tiers[2]?.items).toEqual([]);
  });

  test('UD-41 · R-152: with a threshold set and a tier dropped (TEST: a calibration over a TEST setting of 10% over the last 50), the tier\'s wording names the lower step', () => {
    const dropped = calibrateTiers([{ tier: 'high', fieldKey: 'test.asset.type', outcome: 'corrected', by: 'owner', at: '2026-10-06T09:00:00.000000Z' }], { correctionRatePercent: 10, window: 50 });
    const { displayObjects } = adminGuardrailEventsView(eventsInput({ calibration: dropped, threshold: { correctionRatePercent: 10, window: 50 } }));
    expect(textOf(displayObjects, 'calibration:high.wording')).toBe('Likely now reads Possible');
    expect(textOf(displayObjects, 'calibration:all.threshold')).toBe('Set: 10% over the last 50 decisions.');
    // A calibration that says a tier dropped is never shown dropped while no threshold is set (R-152 "Until decided").
    const unset = adminGuardrailEventsView(eventsInput({ calibration: dropped, threshold: null }));
    expect(textOf(unset.displayObjects, 'calibration:high.wording')).toBe('Likely, unchanged');
    expect(unset.view.calibration.tiers[0]?.dropped).toBe(false);
  });

  test('UD-41 · R-151 · rule 13 · G13-15: one erasure entry per job, who asked or the system, when, the document\'s id and what was removed, as counts', () => {
    const { view, displayObjects } = adminGuardrailEventsView(eventsInput());
    expect(view.erasures.map((entry) => [entry.documentEventId, entry.role, entry.isDemo])).toEqual([
      [uuid(30), 'owner', false],
      [uuid(32), 'system', true],
    ]);
    expect(textOf(displayObjects, `erasure:${uuid(30)}.by`)).toBe('TEST owner 7');
    expect(textOf(displayObjects, `erasure:${uuid(32)}.by`)).toBe('The system');
    expect(textOf(displayObjects, `erasure:${uuid(30)}.document`)).toBe(uuid(31));
    expect(textOf(displayObjects, `erasure:${uuid(30)}.project`)).toBe(PROJECT);
    expect(textOf(displayObjects, `erasure:${uuid(30)}.at`)).toBe('6 Oct 2026, 10:00');
    expect(textOf(displayObjects, `erasure:${uuid(30)}.removed`)).toBe('2 excerpts erased, 1 text parts deleted, 2 values withdrawn');
  });
  test('G10-10 (extended) · rule 10 · P-7-ADMIN-ROW-DEMO-LINE: every admin row of the demo project carries 2.8\'s demo line as served, and no other row carries one', () => {
    const demoText = statusLineById('demo_data').text;
    const accounts = adminAccountsView({
      asOf: AS_OF,
      accounts: [],
      roleEvents: [],
      projects: [
        { projectId: PROJECT, isDemo: false, createdAt: '2026-10-06T09:00:00.000000Z', memberIds: [] },
        { projectId: DEMO, isDemo: true, createdAt: '2026-10-05T09:00:00.000000Z', memberIds: [] },
      ],
    });
    const events = adminGuardrailEventsView(eventsInput());
    const rows = [...accounts.view.projects, ...events.view.projects, ...events.view.metrics, ...events.view.erasures];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      if (row.isDemo) expect(row.demoLine).toEqual({ id: 'demo_data', kind: lineOf('demo_data').kind, text: demoText });
      else expect(row.demoLine).toBeNull();
    }
    expect(rows.filter((row) => row.isDemo)).toHaveLength(4);
    // The contract refuses a row whose line does not follow its flag.
    const [demoRow] = accounts.view.projects.filter((row) => row.isDemo);
    const broken = { ...accounts, view: { ...accounts.view, projects: accounts.view.projects.map((row) => (row === demoRow ? { ...row, demoLine: null } : row)) } };
    expect(AdminAccountsResponseSchema.safeParse(broken).success).toBe(false);
    const stray = { ...accounts, view: { ...accounts.view, projects: accounts.view.projects.map((row) => (row.isDemo ? row : { ...row, demoLine: demoRow?.demoLine ?? null })) } };
    expect(AdminAccountsResponseSchema.safeParse(stray).success).toBe(false);
  });
});
