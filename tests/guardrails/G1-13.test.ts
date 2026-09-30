/**
 * G1-13 (new case id of prompt 3, "New case ids"; rule 1 "Enforced by": "The locator
 * exists"; 2.4 `Evidence.locator`, which has page, sheet, cell and bbox only; ifc-input
 * 6.2.1, a proposal that is not approved; PRD R-027 "Until decided").
 * Situation: a candidate from an IFC model cites a GlobalId, STEP ids and a property path.
 * Expected: rejected by the locator check and logged (`evidence_not_found`). The field
 * stays unknown.
 *
 * On a TEST database, the owner uploads the synthetic architectural model
 * (fixtures/ifc/demo-hotel-arh.ifc). The extraction job's TEST service account then puts
 * through the one ingestion path (apps/api, `ingestProposals`) the candidate the extractor
 * would propose from the model under ifc-input 6.2.1: the building's gross floor area from
 * `Pset_BuildingCommon.GrossPlannedArea`, with the element's GlobalId, the STEP ids and the
 * property path, and the verbatim STEP line as its excerpt (from the fixture's ground
 * truth). Written as an `ifc` object, as flat keys, and beside a page, each is rejected at
 * the locator check (`locator_exists.ifc_field`), logged as `evidence_not_found`, and
 * nothing is stored: the field reads unknown. A property over IFC locators of any shape
 * holds the verifier to the same answer. The control shows the same path storing a value
 * whose locator 2.4 names (a page of the synthetic area schedule).
 */
import fc from 'fast-check';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { ensureBuildingSubject, readFieldInputs, readProjectDocuments, withRequest } from '@sovitech/db';
import { derive, verifyProposal, type CandidateProposal, type EvidenceLocator } from '@sovitech/domain';
import { productionRegistry, registryLookups, unitByCode } from '@sovitech/registry';
import { contractLocatorParser, ingestProposals } from '../../apps/api/src/ingestion/proposals';
import { readQuantities } from '../../apps/api/src/ingestion/quantities';
import { ScriptedRunner, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type TestApi } from './_support/api';
import { pdfOutput } from './_support/outputs';

const lookups = registryLookups(productionRegistry);
const AREA = 'building.grossFloorArea';
function registered<T>(value: T | undefined): T {
  if (value === undefined) throw new Error(`the registry holds no ${AREA}`);
  return value;
}
const areaField = registered(lookups.field(AREA));

/** Pset_BuildingCommon.GrossPlannedArea of the ARH fixture (fixtures/ifc/ground-truth/demo-hotel-arh.json). */
const PSET_GLOBAL_ID = '3d5FVmRXbHywhmD5x4lMsK';
const STEP_LINE = "#100059=IFCPROPERTYSINGLEVALUE('GrossPlannedArea',$,IFCAREAMEASURE(6170.),$);";

let api: TestApi;
let projectId: string;
let ownerId: string;
let modelId: string;
let modelHash: string;
let scheduleId: string;
let scheduleHash: string;
let building: string;

beforeAll(async () => {
  api = await startTestApi();
  ({ ownerId, projectId } = await ownerWithProject(api, 'G1-13'));
  const auth = await signIn(api, ownerId);
  const model = await upload(api, auth, projectId, 'demo-hotel-arh.ifc', fixtureBytes('fixtures/ifc/demo-hotel-arh.ifc'));
  const schedule = await upload(api, auth, projectId, 'tabel-suprafete.pdf', fixtureBytes('fixtures/pdf/tabel-suprafete.pdf'));
  modelId = model.body.documentId ?? '';
  scheduleId = schedule.body.documentId ?? '';
  await testWorker(api, new ScriptedRunner((_job, job) => pdfOutput(job, 'fixtures/pdf/ground-truth/tabel-suprafete.json'))).drain();
  const documents = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readProjectDocuments(request));
  modelHash = documents.documents.find((document) => document.id === modelId)?.contentHash ?? '';
  scheduleHash = documents.documents.find((document) => document.id === scheduleId)?.contentHash ?? '';
  building = await withRequest(api.database.app, { userId: api.extractionAccountId, projectId }, (request) => ensureBuildingSubject(request, api.extractionAccountId));
}, 240_000);

afterAll(async () => {
  await api.stop();
});

/** The candidate the extractor would propose from the model under ifc-input 6.2.1, with the locator given. */
function fromModel(locator: unknown): CandidateProposal {
  return {
    subjectId: building,
    fieldKey: AREA,
    quantity: { value: 6170, unit: 'm2' },
    source: 'document',
    evidence: [{ documentId: modelId, contentHash: modelHash, locator: locator as EvidenceLocator, excerpt: STEP_LINE }],
    original: { text: 'IFCAREAMEASURE(6170.)' },
  };
}

const IFC_LOCATORS: readonly unknown[] = [
  { ifc: { globalId: PSET_GLOBAL_ID, stepIds: [100059, 100060], path: 'Pset_BuildingCommon.GrossPlannedArea' } },
  { globalId: PSET_GLOBAL_ID, stepIds: [100059, 100060], path: 'Pset_BuildingCommon.GrossPlannedArea' },
  { page: 1, ifc: { globalId: PSET_GLOBAL_ID, stepIds: [100059], path: 'Pset_BuildingCommon.GrossPlannedArea' } },
];

async function areaState() {
  const field = areaField;
  const inputs = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readFieldInputs(request, { subjectId: building, fieldKey: AREA }));
  return {
    candidates: inputs.candidates,
    state: derive(field, inputs.candidates, inputs.events, {
      subjectId: building,
      document: (id) => inputs.documents.find((document) => document.id === id),
      inputState: () => undefined,
      datasetApproved: () => false,
      unit: unitByCode,
    }).state,
  };
}

test('F-EXTRACT-04 · R-027 · G1-13: a candidate from an IFC model citing a GlobalId, STEP ids and a property path is rejected by the locator check, logged evidence_not_found, and the field stays unknown', async () => {
  const outcomes = await withRequest(api.database.app, { userId: api.extractionAccountId, projectId }, (request) =>
    ingestProposals(request, {
      projectId,
      serviceId: api.extractionAccountId,
      field: lookups.field,
      proposals: IFC_LOCATORS.map((locator) => ({ proposal: fromModel(locator) })),
    }),
  );
  // Rejected by the locator check ...
  expect(outcomes).toEqual(IFC_LOCATORS.map(() => ({ fieldKey: AREA, outcome: 'rejected', code: 'locator_exists.ifc_field' })));
  // ... and logged, with a code and never the model's text.
  const events = await api.database.asAdministrator<{ type: string; reason: string; field_key: string }>(
    `SELECT type, reason, field_key FROM sovitech.guardrail_events WHERE project_id = $1 AND field_key = $2 ORDER BY at`,
    [projectId, AREA],
  );
  expect(events).toEqual(IFC_LOCATORS.map(() => ({ type: 'evidence_not_found', reason: 'locator_exists.ifc_field', field_key: AREA })));
  // The field stays unknown: nothing was stored.
  const after = await areaState();
  expect(after.candidates).toEqual([]);
  expect(after.state).toBe('unknown');

  // Property: whatever shape the IFC locator takes, the verifier refuses it at the locator check.
  const context = {
    projectId,
    field: areaField,
    document: (id: string) => (id === modelId ? { id: modelId, projectId, contentHash: modelHash, kind: 'other' as const, stage: 'unknown' as const, analysis: { status: 'stored_only' as const, coverage: 'stored: IFC model' } } : undefined),
    textAt: () => ({ text: STEP_LINE, layer: 'text' as const }),
    readQuantities,
    parseLocator: contractLocatorParser,
    candidateId: 'test-cand-g1-13',
    createdBy: api.extractionAccountId,
    createdAt: '2026-09-26T10:00:00.000Z',
  };
  const globalId = fc.stringMatching(/^[0-9A-Za-z_$]{22}$/u);
  const stepIds = fc.array(fc.integer({ min: 1, max: 999_999 }), { minLength: 1, maxLength: 4 });
  const path = fc.constantFrom('Pset_BuildingCommon.GrossPlannedArea', 'Qto_SpaceBaseQuantities.NetFloorArea', 'attr:Tag', 'type:Pset_PumpTypeCommon.FlowRateRange');
  const shapes = fc.oneof(
    fc.record({ ifc: fc.record({ globalId, stepIds, path }) }),
    fc.record({ globalId, stepIds, path }),
    fc.record({ page: fc.integer({ min: 1, max: 40 }), globalId }),
    fc.record({ sheet: fc.constant('Camere'), stepIds }),
    fc.record({ page: fc.integer({ min: 1, max: 40 }), path }),
  );
  fc.assert(
    fc.property(shapes, (locator) => {
      const verdict = verifyProposal(fromModel(locator), context);
      expect(verdict.outcome).toBe('rejected');
      if (verdict.outcome !== 'rejected') return;
      expect(verdict.rejection).toMatchObject({ kind: 'evidence_check_failed', check: 'locator_exists', locatorProblem: 'ifc_field' });
      expect(verdict.guardrailEvents).toEqual([expect.objectContaining({ type: 'evidence_not_found', reason: 'locator_exists.ifc_field' })]);
    }),
  );
});

test('G1-13 control: the same path stores a value whose locator 2.4 names (a page of the synthetic area schedule)', async () => {
  const outcomes = await withRequest(api.database.app, { userId: api.extractionAccountId, projectId }, (request) =>
    ingestProposals(request, {
      projectId,
      serviceId: api.extractionAccountId,
      field: lookups.field,
      proposals: [
        {
          proposal: {
            subjectId: building,
            fieldKey: AREA,
            quantity: { value: 6170, unit: 'm2' },
            alternatives: [{ value: 6.17, unit: 'm2' }],
            source: 'document',
            evidence: [{ documentId: scheduleId, contentHash: scheduleHash, locator: { page: 1 }, excerpt: 'Suprafata cladirii: 6.170 mp' }],
            original: { text: '6.170 mp', locale: 'ro-RO' },
          },
        },
      ],
    }),
  );
  expect(outcomes).toMatchObject([{ outcome: 'stored', source: 'document' }]);
  expect((await areaState()).candidates).toHaveLength(1);
});
