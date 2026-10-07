/**
 * G1-30 (new in the viewer step, part 1, for the integrator to index; rule 1, "A value exists only if it comes from ...
 * a verified document location"; 2.4, `Evidence.locator` has no IFC fields (G1-13); PRD R-025: "shown only as a
 * document"; US-IFC-08 AC6).
 * Situation: a stored IFC model is converted for viewing.
 * Expected: no candidate is created.
 *
 * On a TEST database, the owner uploads the synthetic architectural model (fixtures/ifc/demo-hotel-arh.ifc). Its
 * registration queues its conversion for viewing, and the conversion worker runs it in the TEST sandbox (scripted:
 * the view file, the storey index of TEST GlobalIds and the summary the converter writes). The model is converted: its
 * view files are kept under the project and content hash, and its record reads `converted`. And nothing else: no
 * candidate, candidate event, field event, evidence, asset appearance, finding or guardrail event; the model's analysis
 * events hold its stored-only line alone; and the record holds no value field at all (sizes, times and codes).
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import { readModelViewEvents, withRequest } from '@sovitech/db';
import { fixtureBytes, ownerWithProject, signIn, startTestApi, upload, type TestApi } from './_support/api';
import { ScriptedConverter, testConverterWorker } from './_support/model-view';

let api: TestApi;
let ownerId: string;
let projectId: string;
let modelId: string;

beforeAll(async () => {
  api = await startTestApi();
  ({ ownerId, projectId } = await ownerWithProject(api, 'G1-30'));
  const auth = await signIn(api, ownerId);
  modelId = (await upload(api, auth, projectId, 'demo-hotel-arh.ifc', fixtureBytes('fixtures/ifc/demo-hotel-arh.ifc'))).body.documentId ?? '';
}, 240_000);

afterAll(async () => {
  await api.stop();
});

/** Every value-store row a candidate could come with, counted in the project. */
async function valueRows(): Promise<Record<string, number | undefined>> {
  const count = async (table: string): Promise<number | undefined> =>
    (await api.database.asAdministrator<{ n: number }>(`SELECT count(*)::int AS n FROM sovitech.${table} WHERE project_id = $1`, [projectId]))[0]?.n;
  return {
    candidates: await count('candidates'),
    candidateEvents: await count('candidate_events'),
    fieldEvents: await count('field_events'),
    evidenceLocators: await count('evidence_locators'),
    ifcEvidence: await count('ifc_evidence'),
    assetAppearances: await count('asset_appearances'),
    findings: await count('document_findings'),
    modelRecords: await count('document_model_records'),
    guardrailEvents: await count('guardrail_events'),
  };
}

test('F-VALUE-01 · R-025 · US-IFC-08 · G1-30: a stored IFC model converted for viewing creates no candidate, and nothing a value could come with', async () => {
  const before = await valueRows();
  expect(before).toEqual({ candidates: 0, candidateEvents: 0, fieldEvents: 0, evidenceLocators: 0, ifcEvidence: 0, assetAppearances: 0, findings: 0, modelRecords: 0, guardrailEvents: 0 });

  const converter = new ScriptedConverter();
  const steps = await testConverterWorker(api, converter).drain();
  expect(steps.map((step) => step.kind)).toEqual(['converted']);
  expect(converter.jobs).toHaveLength(1);

  // Converted, and kept as a document's derived files under its project and content hash.
  const events = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readModelViewEvents(request));
  expect(events.map((event) => event.type)).toEqual(['queued', 'started', 'converted']);
  const contentHash = events[0]?.contentHash ?? '';
  expect(await api.files.exists(api.files.derivedPath(projectId, contentHash, 'viewer.frag'))).toBe(true);
  expect(await api.files.exists(api.files.derivedPath(projectId, contentHash, 'storeys.json'))).toBe(true);

  // No candidate, and nothing a value could come with.
  expect(await valueRows()).toEqual(before);
  const analyses = await api.database.asAdministrator('SELECT status, coverage FROM sovitech.document_analysis_events WHERE document_id = $1 ORDER BY at', [modelId]);
  expect(analyses).toEqual([{ status: 'stored_only', coverage: 'stored: IFC model' }]);
  // The record's own columns: codes, ids, sizes and times; no value, unit, field key or text column exists to hold one.
  const columns = await api.database.asAdministrator<{ column_name: string }>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'sovitech' AND table_name = 'model_view_events' ORDER BY ordinal_position",
  );
  expect(columns.map((column) => column.column_name)).toEqual([
    'id',
    'project_id',
    'document_id',
    'content_hash',
    'type',
    'code',
    'job_id',
    'converter_name',
    'converter_version',
    'image_digest',
    'input_bytes',
    'view_bytes',
    'index_bytes',
    'peak_rss_kib',
    'import_ms',
    'derivative_ms',
    'index_ms',
    'wall_ms',
    'created_by',
    'created_at',
  ]);
});
