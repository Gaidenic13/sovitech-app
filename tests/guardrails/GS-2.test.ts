/**
 * GS-2 (new in phase 7; section 4, "Measure it. Each speed metric is read next to a truth metric", its table:
 * questions per project with the owner correction rate on inferences, confirmations per project with how often
 * engineers later correct accepted items, time from upload to first estimate with the share of estimated and provisional
 * values in that estimate; rule 1, "No numeric stand-in"; PRD R-151; D-34's interim: "The speed metrics that no event
 * records are reported as 'not counted yet', never estimated, and every target reads 'Target not set'").
 * Situation: the admin opens the guardrail event review.
 * Expected: each speed metric of section 4 shows next to its truth metric for each project, and a metric no stored
 * record counts reads as not counted, never as an estimate or a zero.
 *
 * The view half (UD-41's builder over TEST inputs) and the API half (`GET /api/admin/guardrail-events` over a TEST
 * database with two TEST projects, one with an owner's correction of an inference). Of the six metrics, one is counted
 * from stored records in this build: the owner correction rate on inferences (the owner's confirmations and corrections
 * of inferences). The engineers' corrections of accepted items (section 8's `engineer_corrected_accepted_item`) need an
 * engineer action, and none exists while PRD D-16 is open (R-128 "Until decided"), so no code writes that event: its
 * count of none is no measurement and reads "not counted yet", like the other four no stored record counts, each with
 * no digit; a count the store does hold would read as counted (phase 7 part B, findings V-3, A-1 and A-2). The same
 * holds for the counts table: a type no code writes reads "not counted yet" where the store counts none, and the list
 * of such types is checked against the app's source. A rate with no decision to rest on reads that no decision is
 * recorded, never 0%. The rendered half is the web's. Every value is TEST data.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, test } from 'vitest';
import { calibrateTiers } from '@sovitech/domain';
import { FIELD } from '@sovitech/registry';
import { ADMIN_GUARDRAIL_EVENT_TYPES, ADMIN_METRICS, AdminGuardrailEventsResponseSchema, SPEED_TRUTH_PAIRS, type DisplayObject, type GuardrailEventsView } from '@sovitech/view-model/browser';
import { GUARDRAIL_EVENT_TYPES_NOT_WRITTEN, adminGuardrailEventsView } from '@sovitech/view-model/server';
import { adminGet, adminOf, inferredValue } from './_support/admin';
import { REPOSITORY_ROOT, signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { newOwnerProject, productionFieldOf, serviceOf, testDocumentIn } from './_support/workspace-store';

const LONG = { timeout: 120_000 };
const NOT_RECORDED = ['questions_per_project', 'confirmations_per_project', 'time_to_first_estimate', 'estimated_share_of_first_estimate'] as const;

/** Each project's row: the three pairs in section 4's order, speed next to truth; and what each metric reads. */
function checkRows(view: GuardrailEventsView, displayObjects: readonly DisplayObject[], projectIds: readonly string[]): Map<string, Map<string, DisplayObject>> {
  const byId = new Map(displayObjects.map((display) => [display.valueId, display]));
  const read = new Map<string, Map<string, DisplayObject>>();
  expect(view.metrics.map((row) => row.projectId)).toEqual(expect.arrayContaining([...projectIds]));
  for (const projectId of projectIds) {
    const row = view.metrics.find((entry) => entry.projectId === projectId);
    expect(row?.pairs.map((pair) => [pair.speed.metric, pair.truth.metric])).toEqual(SPEED_TRUTH_PAIRS.map((pair) => [pair.speed, pair.truth]));
    const cells = new Map<string, DisplayObject>();
    for (const pair of row?.pairs ?? []) {
      for (const cell of [pair.speed, pair.truth]) {
        const display = byId.get(cell.value);
        if (display === undefined) throw new Error(`no display ${cell.value}`);
        cells.set(cell.metric, display);
        expect(byId.get(cell.target)?.text, cell.target).toBe('Target not set');
      }
    }
    for (const metric of NOT_RECORDED) {
      const display = cells.get(metric);
      // Not counted: its own words, no digit, never an estimate or a zero.
      expect(display?.text, `${projectId} ${metric}`).toBe('not counted yet');
      expect(display?.shape, `${projectId} ${metric}`).toBe('missing');
      expect(/\d/u.test(display?.text ?? ''), `${projectId} ${metric}`).toBe(false);
    }
    expect([...cells.keys()].sort()).toEqual([...ADMIN_METRICS].sort());
    read.set(projectId, cells);
  }
  return read;
}

describe('GS-2 · section 4 · rule 1 · R-151 · D-34', () => {
  test('GS-2 (the view half): each speed metric next to its truth metric for each project; the four no record counts read "not counted yet", the rate with no decision says so, never 0%', () => {
    const projects = ['0192f0e4-7e57-7000-8000-00000000000a', '0192f0e4-7e57-7000-8000-00000000000b'];
    const response = adminGuardrailEventsView({
      asOf: '2026-10-07T09:00:00.000000Z',
      projects: projects.map((projectId) => ({ projectId, isDemo: false })),
      // As the store counts them (migration 0018): every type for every project, and per type in all.
      counts: projects.flatMap((projectId, index) => ADMIN_GUARDRAIL_EVENT_TYPES.map((type) => ({ projectId, type, count: index === 0 && type === 'engineer_corrected_accepted_item' ? 2 : 0 }))),
      totals: ADMIN_GUARDRAIL_EVENT_TYPES.map((type) => ({ type, count: type === 'engineer_corrected_accepted_item' ? 2 : 0 })),
      inferenceDecisions: [
        { projectId: projects[0] ?? '', confirmations: 3, corrections: 1 },
        { projectId: projects[1] ?? '', confirmations: 0, corrections: 0 },
      ],
      calibration: calibrateTiers([], null),
      threshold: null,
      proposedThreshold: { correctionRatePercent: 10, window: 50 },
      erasures: [],
    });
    expect(AdminGuardrailEventsResponseSchema.safeParse(response).success).toBe(true);
    const read = checkRows(response.view, response.displayObjects, projects);
    expect(read.get(projects[0] ?? '')?.get('owner_correction_rate')?.text).toBe('1 of 4 decisions corrected (25%)');
    expect(read.get(projects[0] ?? '')?.get('engineer_corrections_of_accepted_items')?.text).toBe('2');
    expect(read.get(projects[1] ?? '')?.get('owner_correction_rate')?.text).toBe('No decision on an inference recorded');
  });

  test('GS-2 (V-3, A-2): with no code that writes engineer_corrected_accepted_item, the engineers\' corrections of accepted items and that type\'s count read "not counted yet" where the store counts none, never 0; a type with a writer reads its count of none', () => {
    const projectId = '0192f0e4-7e57-7000-8000-00000000000c';
    const response = adminGuardrailEventsView({
      asOf: '2026-10-07T09:00:00.000000Z',
      projects: [{ projectId, isDemo: false }],
      counts: ADMIN_GUARDRAIL_EVENT_TYPES.map((type) => ({ projectId, type, count: 0 })),
      totals: ADMIN_GUARDRAIL_EVENT_TYPES.map((type) => ({ type, count: 0 })),
      inferenceDecisions: [{ projectId, confirmations: 0, corrections: 0 }],
      calibration: calibrateTiers([], null),
      threshold: null,
      proposedThreshold: { correctionRatePercent: 10, window: 50 },
      erasures: [],
    });
    expect(AdminGuardrailEventsResponseSchema.safeParse(response).success).toBe(true);
    const byId = new Map(response.displayObjects.map((display) => [display.valueId, display]));
    const metric = byId.get(`metric:${projectId}.engineer_corrections_of_accepted_items`);
    expect(metric?.text).toBe('not counted yet');
    expect(metric?.shape).toBe('missing');
    for (const scope of [projectId, 'all']) {
      for (const type of ADMIN_GUARDRAIL_EVENT_TYPES) {
        const cell = byId.get(`guardrail_count:${scope}.${type}`);
        if (GUARDRAIL_EVENT_TYPES_NOT_WRITTEN.includes(type)) {
          expect(cell?.text, `${scope} ${type}`).toBe('not counted yet');
          expect(cell?.shape, `${scope} ${type}`).toBe('missing');
        } else expect(cell?.text, `${scope} ${type}`).toBe('0');
      }
    }
  });

  test('GS-2 (A-1, A-2): the types read as "not counted yet" are exactly the section 8 types no source of the app names outside the type lists', () => {
    // The files that only list the types (the domain's model, the admin contract, and the admin view's own list).
    const typeLists = new Set(['packages/domain/src/model.ts', 'packages/view-model/src/browser/contract/admin.ts', 'packages/view-model/src/admin/index.ts']);
    const sources: { path: string; text: string }[] = [];
    const walk = (folder: string): void => {
      for (const entry of readdirSync(folder, { withFileTypes: true })) {
        const path = join(folder, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== 'testing' && entry.name !== 'dist') walk(path);
        } else if (/\.tsx?$/u.test(entry.name) && !/\.test\.tsx?$/u.test(entry.name)) sources.push({ path: relative(REPOSITORY_ROOT, path), text: readFileSync(path, 'utf8') });
      }
    };
    for (const root of ['apps', 'packages']) {
      for (const entry of readdirSync(join(REPOSITORY_ROOT, root), { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const src = join(REPOSITORY_ROOT, root, entry.name, 'src');
          try {
            readdirSync(src);
          } catch {
            continue;
          }
          walk(src);
        }
      }
    }
    expect(sources.length).toBeGreaterThan(100);
    const unwritten = ADMIN_GUARDRAIL_EVENT_TYPES.filter((type) => !sources.some((source) => !typeLists.has(source.path) && source.text.includes(`'${type}'`)));
    expect([...GUARDRAIL_EVENT_TYPES_NOT_WRITTEN].sort()).toEqual([...unwritten].sort());
    expect(unwritten).toEqual(['engineer_corrected_accepted_item']);
  });
});

describe('GS-2 (the API half)', LONG, () => {
  let api: TestApi;
  let owner: Auth;
  let admin: Auth;

  beforeAll(async () => {
    api = await startTestApi({ devLogin: true });
    const [ownerId] = api.devAccountIds;
    if (ownerId === undefined) throw new Error('no TEST development owner');
    owner = await signIn(api, ownerId);
    ({ admin } = await adminOf(api, 'GS-2'));
  }, 240_000);

  afterAll(async () => {
    await api.stop();
  });

  it('GS-2: the served review pairs each speed metric with its truth metric for each project, and a metric no stored record counts reads "not counted yet"', async () => {
    const corrected = await newOwnerProject(api, owner, 'GS-2 corrected');
    const quiet = await newOwnerProject(api, owner, 'GS-2 quiet');
    const serviceId = await serviceOf(api, corrected.projectId, 'GS-2');
    const memo = await testDocumentIn(api, { projectId: corrected.projectId, serviceId, label: 'GS-2 memo', fileName: 'TEST memoriu.pdf', pages: ['TEST Destinatia cladirii: hotel'] });
    const inferenceId = await inferredValue(api, {
      projectId: corrected.projectId,
      serviceId,
      subjectId: corrected.buildingId,
      field: productionFieldOf(FIELD.buildingType),
      choice: 'hotel',
      confidence: 'high',
      from: [{ document: memo, page: 1, excerpt: 'TEST Destinatia cladirii: hotel' }],
    });
    const edit = await api.app.inject({
      method: 'POST',
      url: `/api/projects/${corrected.projectId}/fields/edit`,
      headers: { ...owner },
      payload: { field: { subjectId: corrected.buildingId, fieldKey: FIELD.buildingType }, value: { kind: 'choice', choice: 'office' }, corrects: [inferenceId] },
    });
    expect(edit.statusCode, edit.body).toBe(200);

    const response = await adminGet(api, admin, 'guardrail-events');
    expect(response.statusCode, response.body).toBe(200);
    const { view, displayObjects } = AdminGuardrailEventsResponseSchema.parse(response.json());
    const read = checkRows(view, displayObjects, [corrected.projectId, quiet.projectId]);
    expect(read.get(corrected.projectId)?.get('owner_correction_rate')?.text).toBe('1 of 1 decisions corrected (100%)');
    // V-3, A-2: no engineer action exists (D-16), so no code writes the event this metric counts: not counted, never 0.
    expect(read.get(corrected.projectId)?.get('engineer_corrections_of_accepted_items')?.text).toBe('not counted yet');
    const byId = new Map(displayObjects.map((display) => [display.valueId, display]));
    expect(byId.get(`guardrail_count:${corrected.projectId}.engineer_corrected_accepted_item`)?.text).toBe('not counted yet');
    expect(byId.get(`guardrail_count:${corrected.projectId}.owner_corrected_inference`)?.text).toBe('1');
    expect(byId.get(`guardrail_count:${quiet.projectId}.conflict_raised`)?.text).toBe('0');
    expect(read.get(quiet.projectId)?.get('owner_correction_rate')?.text).toBe('No decision on an inference recorded');
  });
});
