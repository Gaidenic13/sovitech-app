/**
 * G1-7 (docs/guardrails.md section 7; rule 1 "Reuse": "Reuse of existing field devices, wiring or controllers is never
 * assumed. Until a survey, the estimate shows reuse and replacement as a range"; Speed Rule step 9: "Site survey
 * needed").
 * Situation: BMS modernization with no site survey.
 * Expected: CAPEX is a range covering reuse and replacement. "Site survey needed" is under SOVITECH will check.
 *
 * Engine half (this file; the engine builder), with `TEST-capexFieldDevices@1.0.0` (a TEST method over TEST ranges per
 * device): while no site survey has recorded whether the existing field devices are reused, the estimate ranges over
 * both options, covering the cheaper reuse and the dearer replacement, and records the reuse field as the basis of the
 * range; once a survey records it, the range runs over that option alone.
 *
 * The API half (phase 5 part B, V-6: the B2 half the header once left open was never written), at the end of this file,
 * over a TEST database with the production registry and catalogue: a BMS modernization TEST project with no site survey
 * among its documents generates (rule 7: never blocked), and the stored proposal's "What we still need" lists "Site
 * survey needed" under SOVITECH will check (`sovitechWillCheck`, the step 8 group the PDF prints under that heading),
 * never among the owner's items; its print view's appendix lists it too. Controls: a new construction project, and a
 * BMS modernization whose TEST site survey document is among its documents, list no such line. Every account, document
 * and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it, test } from 'vitest';
import { registerDocument, withRequest } from '@sovitech/db';
import { createTestService, testContentHash } from '@sovitech/db/testing';
import { FIELD } from '@sovitech/registry';
import { GenerateResponseSchema, ProposalPrintResponseSchema, ProposalResponseSchema, type DisplayObject } from '@sovitech/view-model/browser';
import { exact, interval, methodNotesOf, multiply, point, runEngine, type EngineRun } from '@sovitech/engine';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { productionField, TEST_FIELDS } from '../../packages/engine/test-formulas/fields';
import { testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { documentReading, engineerEntry, ownerAnswer, testDocument } from './_support/builders';

const PROJECT = 'test-project-g1-7';
const BUILDING = 'test-building-g1-7';
const asBuilt = testDocument('test-doc-g1-7', PROJECT, 'as_built');
const DEVICES = 140;

function project(survey: 'reuse' | 'replace' | null): TestEntry[] {
  const type = productionField(FIELD.projectType);
  return [
    { definition: type, subjectId: PROJECT, candidates: [ownerAnswer({ id: 'test-cand-g1-7-type', subjectId: PROJECT, field: type, value: { choice: 'bms_modernization' }, minute: 1 })] },
    {
      definition: TEST_FIELDS.fieldDevices,
      subjectId: BUILDING,
      candidates: [documentReading({ id: 'test-cand-g1-7-devices', subjectId: BUILDING, field: TEST_FIELDS.fieldDevices, document: asBuilt, value: { quantity: { value: DEVICES, unit: 'count' } }, minute: 2 })],
    },
    {
      definition: TEST_FIELDS.fieldDevicesReuse,
      subjectId: BUILDING,
      candidates: survey === null ? [] : [engineerEntry({ id: 'test-cand-g1-7-survey', subjectId: BUILDING, field: TEST_FIELDS.fieldDevicesReuse, value: { choice: survey }, minute: 3 })],
    },
  ];
}

let ids = 0;
function run(survey: 'reuse' | 'replace' | null): EngineRun {
  return runEngine(testCatalogue({ mirrored: false, extra: ['TEST-capexFieldDevices'] }), testEngineInput({ projectId: PROJECT, entries: project(survey), subjects: { building: BUILDING } }), {
    newId: () => `test-cand-g1-7-out-${String((ids += 1))}`,
    at: '2026-10-05T09:00:00Z',
  });
}
const capexOf = (result: EngineRun) => {
  const output = result.outputs.find((item) => item.output === 'capex.TEST_fieldDevices');
  if (output?.kind !== 'figure' || output.candidate.range === undefined) throw new Error(`no TEST CAPEX figure: ${JSON.stringify(output)}`);
  return output.candidate;
};

describe('G1-7 · a BMS modernization with no site survey: CAPEX is a range covering reuse and replacement', () => {
  test('G1-7 · with no survey, the estimate covers reuse and replacement, and names the reuse field as the basis of its range', () => {
    const candidate = capexOf(run(null));
    expect(candidate.source).toBe('estimated');
    // TEST tables: reuse 9013 to 9014 per device, replacement 9015 to 9017 per device.
    const reuse = multiply(point(exact(DEVICES)), interval(exact(9013), exact(9014)));
    const replace = multiply(point(exact(DEVICES)), interval(exact(9015), exact(9017)));
    expect(candidate.range).toEqual({ low: reuse.low.toNumber(), high: replace.high.toNumber() });
    expect(methodNotesOf(candidate.method)).toContainEqual({ kind: 'range_over_options', subjectId: BUILDING, fieldKey: TEST_FIELDS.fieldDevicesReuse.key });
    // Reuse is not assumed: no reuse value is among the inputs, and the field stays an engineer's to settle.
    expect(candidate.method.inputCandidateIds).toEqual(['test-cand-g1-7-devices']);
    expect(TEST_FIELDS.fieldDevicesReuse.confirmBy).toBe('engineer');
  });

  test('G1-7 · control: once a site survey records replacement, the range runs over replacement alone', () => {
    const surveyed = capexOf(run('replace'));
    const replace = multiply(point(exact(DEVICES)), interval(exact(9015), exact(9017)));
    expect(surveyed.range).toEqual({ low: replace.low.toNumber(), high: replace.high.toNumber() });
    expect(methodNotesOf(surveyed.method).some((note) => note.kind === 'range_over_options')).toBe(false);
    expect(surveyed.method.inputCandidateIds).toEqual(['test-cand-g1-7-devices', 'test-cand-g1-7-survey']);
    // The unsurveyed range covers the surveyed one.
    const open = capexOf(run(null));
    expect(open.range?.low).toBeLessThanOrEqual(surveyed.range?.low ?? Number.NaN);
    expect(open.range?.high).toBeGreaterThanOrEqual(surveyed.range?.high ?? Number.NaN);
  });
});

// ---- The API half (phase 5 part B, V-6): "Site survey needed" under SOVITECH will check on the stored proposal ----

const SITE_SURVEY_NEEDED = 'Site survey needed';

describe('G1-7 (the API half) · a BMS modernization with no site survey: "Site survey needed" is under SOVITECH will check', { timeout: 120_000 }, () => {
  let api: TestApi;
  let owner: Auth;

  beforeAll(async () => {
    api = await startTestApi({ devLogin: true });
    const [ownerId] = api.devAccountIds;
    if (ownerId === undefined) throw new Error('no TEST development owner');
    owner = await signIn(api, ownerId);
  }, 180_000);

  afterAll(async () => {
    await api.stop();
  });

  /** A TEST project of the given type, created through step 1's four answers. */
  async function projectOfType(label: string, projectType: 'bms_modernization' | 'new_construction'): Promise<string> {
    const created = await api.app.inject({ method: 'POST', url: '/api/projects', headers: { ...owner }, payload: { name: `TEST ${label}`, projectType, countryCode: 'RO', city: `TEST city ${label}` } });
    expect(created.statusCode, created.body).toBe(201);
    return (created.json() as { projectId: string }).projectId;
  }

  /** A TEST site survey document, registered and analysed by a TEST extraction service of the project. */
  async function siteSurveyIn(projectId: string, label: string): Promise<void> {
    const serviceId = await createTestService(api.database, { projectId, label });
    await withRequest(api.database.app, { userId: serviceId, projectId }, (request) =>
      registerDocument(request, { contentHash: testContentHash(`${projectId} ${label}`), kind: 'other', stage: 'site_survey', analysis: { status: 'analysed', coverage: 'pages 1-1 of 1' }, createdBy: serviceId }),
    );
  }

  /** Generate, then the stored proposal and its print view as the API serves them: the open items' "SOVITECH will check" and "For you" texts. */
  async function generatedOpenItems(projectId: string): Promise<{ readonly sovitech: readonly string[]; readonly forYou: readonly string[]; readonly printed: readonly string[] }> {
    const generated = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/proposals`, headers: { ...owner }, payload: {} });
    expect(generated.statusCode, generated.body).toBe(201);
    const { snapshotId } = GenerateResponseSchema.parse(generated.json());
    const stored = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposals/${snapshotId}`, headers: { ...owner } });
    expect(stored.statusCode, stored.body).toBe(200);
    const proposal = ProposalResponseSchema.parse(stored.json());
    const text = (displays: readonly DisplayObject[], valueId: string): string => {
      const display = displays.find((entry) => entry.valueId === valueId);
      if (display === undefined) throw new Error(`no display ${valueId}`);
      return display.text;
    };
    const needs = proposal.view.whatWeStillNeed;
    const print = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposals/${snapshotId}/print`, headers: { ...owner } });
    expect(print.statusCode, print.body).toBe(200);
    const printed = ProposalPrintResponseSchema.parse(print.json());
    return {
      sovitech: needs.sovitechWillCheck.map((valueId) => text(proposal.displayObjects, valueId)),
      forYou: needs.items.map((item) => text(proposal.displayObjects, item.concerns)),
      printed: printed.view.appendix.openItems.sovitechWillCheck.map((valueId) => text(printed.displayObjects, valueId)),
    };
  }

  it('G1-7 · V-6 · rule 1 "Reuse" · Speed Rule step 9: a BMS modernization with no site survey generates, and its stored proposal lists "Site survey needed" under SOVITECH will check, never for the owner', async () => {
    const projectId = await projectOfType('G1-7 modernization', 'bms_modernization');
    const items = await generatedOpenItems(projectId);
    expect(items.sovitech.filter((line) => line === SITE_SURVEY_NEEDED)).toHaveLength(1);
    expect(items.forYou).not.toContain(SITE_SURVEY_NEEDED);
    // The exported proposal's appendix lists the same open items ("What we still need", rule 7).
    expect(items.printed.filter((line) => line === SITE_SURVEY_NEEDED)).toHaveLength(1);
  });

  it('G1-7 · V-6 · control: a new construction, and a BMS modernization whose site survey is among its documents, list no "Site survey needed"', async () => {
    const fresh = await generatedOpenItems(await projectOfType('G1-7 new construction', 'new_construction'));
    expect(fresh.sovitech).not.toContain(SITE_SURVEY_NEEDED);
    const surveyedId = await projectOfType('G1-7 surveyed', 'bms_modernization');
    await siteSurveyIn(surveyedId, 'G1-7 site survey');
    const surveyed = await generatedOpenItems(surveyedId);
    expect(surveyed.sovitech).not.toContain(SITE_SURVEY_NEEDED);
    expect(surveyed.printed).not.toContain(SITE_SURVEY_NEEDED);
  });
});
