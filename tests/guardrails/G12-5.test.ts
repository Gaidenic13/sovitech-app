/**
 * G12-5 (new case id of prompt 3, "New case ids"; rule 12, "Partial processing is shown
 * with its coverage" and "Absence of evidence is not evidence of absence"; 2.8, "File
 * stored but not analysed"; G12-1; prompt 3 5.4, `ifc-values` closed; PRD R-022, R-029
 * "Until decided").
 * Situation: an IFC file is uploaded, and `Evidence.locator` has no IFC fields.
 * Expected: status line in the G12-1 form. No "Not found in the analysed documents"
 * statement counts the model as analysed.
 *
 * On a TEST database, the owner uploads the synthetic architectural model and a synthetic
 * PDF companion through the upload protocol. The extractor (scripted from the fixtures'
 * ground truth) reads the model for the engineer's record, completely, and the PDF's text.
 * The model's row reads "Not analysed: IFC model stored, not analysed" before and after
 * that reading, its analysis events hold nothing but that, and the coverage a "not found"
 * statement may cite holds the PDF's pages and never the model.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import { readProjectDocuments, withRequest } from '@sovitech/db';
import { readAiSearches, readCoverage, searchedCoverage } from '../../apps/api/src/documents/coverage';
import { projectDocuments } from '../../apps/api/src/documents/service';
import { ScriptedRunner, documentList, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type Auth, type TestApi } from './_support/api';
import { idsReference, ifcOutput, pdfOutput } from './_support/outputs';

let api: TestApi;
let ownerId: string;
let projectId: string;
let auth: Auth;
let modelId: string;
let memoriuId: string;

beforeAll(async () => {
  // The reader's path, with the tests-only switch: the live app reads no model until D-01 (apps/api/src/documents/model-reading.ts).
  api = await startTestApi({ readModels: true });
  ({ ownerId, projectId } = await ownerWithProject(api, 'G12-5'));
  auth = await signIn(api, ownerId);
  modelId = (await upload(api, auth, projectId, 'demo-hotel-arh.ifc', fixtureBytes('fixtures/ifc/demo-hotel-arh.ifc'))).body.documentId ?? '';
  memoriuId = (await upload(api, auth, projectId, 'memoriu-tehnic.pdf', fixtureBytes('fixtures/pdf/memoriu-tehnic.pdf'))).body.documentId ?? '';
}, 240_000);

afterAll(async () => {
  await api.stop();
});

const G12_1_IFC = 'Not analysed: IFC model stored, not analysed';

async function modelRow(): Promise<Record<string, unknown> | undefined> {
  return (await documentList(api, auth, projectId)).find((row) => row['documentId'] === modelId);
}

test('F-INGEST-03 · F-INGEST-05 · R-022 · R-029 · G12-5: an IFC model reads "Not analysed: IFC model stored, not analysed", and no "not found" statement counts it as analysed', async () => {
  // As stored, before any reading.
  expect(await modelRow()).toMatchObject({ statusLine: { kind: 'status_line', statusLineId: 'not_analysed', text: G12_1_IFC, slots: { fileType: 'IFC model' } } });

  // The extractor reads the model for the engineer's record (completely) and the PDF's text.
  const runner = new ScriptedRunner((_job, job) =>
    job.documentId === modelId
      ? ifcOutput(job, 'fixtures/ifc/ground-truth/demo-hotel-arh.json', 'fixtures/ids/expected/demo-hotel-arh.json')
      : pdfOutput(job, 'fixtures/pdf/ground-truth/memoriu-tehnic.json'),
  );
  const steps = await testWorker(api, runner, { ids: idsReference() }).drain();
  expect(steps.map((step) => step.kind)).toEqual(['done', 'done']);

  // The status line in the G12-1 form still, and nothing else ever recorded for the model.
  expect(await modelRow()).toMatchObject({ statusLine: { statusLineId: 'not_analysed', text: G12_1_IFC } });
  const analyses = await api.database.asAdministrator<{ status: string; coverage: string }>(
    'SELECT status, coverage FROM sovitech.document_analysis_events WHERE document_id = $1 ORDER BY at',
    [modelId],
  );
  expect(analyses).toEqual([{ status: 'stored_only', coverage: 'stored: IFC model' }]);

  // What a "Not found in the analysed documents (<coverage>)" statement may count as searched.
  // At most what the extractor read (readCoverage, the upper bound), and for a field only what a
  // completed AI run searched (searchedCoverage; none has run here, so nothing).
  const { searched, searchedForField } = await withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => {
    const { documents, statuses } = await projectDocuments(request);
    const search = await readAiSearches(request, documents);
    return {
      searched: readCoverage(documents, statuses.status),
      searchedForField: searchedCoverage(documents, statuses.status, { fieldKey: 'building.grossFloorArea', ...search }),
    };
  });
  expect(searched).toEqual([{ documentId: memoriuId, unit: 'pages', ranges: [{ first: 1, last: 3 }], total: 3 }]);
  expect(searched.some((entry) => entry.documentId === modelId)).toBe(false);
  expect(searchedForField).toEqual([]);

  // The model's record read the model completely; it still counts nowhere as analysed coverage.
  const documents = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readProjectDocuments(request));
  expect(documents.documents.find((document) => document.id === modelId)?.analysis.status).toBe('stored_only');
});
