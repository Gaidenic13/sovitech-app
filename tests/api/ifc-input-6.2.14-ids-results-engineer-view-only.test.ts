/**
 * ifc-input 6.2.14 (stricter choice built live, not indexed; prompt 3 section 10, phase 2:
 * "IDS results are shown on the engineer's view only (ifc-input 6.2.14) ... Their tests are
 * blocking tests outside tests/guardrails/, named after those proposals, and are not
 * indexed, because indexing them would enact the proposals"; prompt 3 5.4, `ifc-values`
 * closed; PRD R-022, R-023).
 *
 * A model's IDS results and schema-check outcome are stored with the document as engineer
 * items. They are served on the engineer's record of the document, to a person holding
 * `sovitech_engineer`, and nowhere the owner reads: not on the owner's document row, not on
 * any owner route. The owner asking for the engineer's record is refused.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestAccount } from '@sovitech/db/testing';
import { ScriptedRunner, documentList, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type Auth, type TestApi } from '../guardrails/_support/api';
import { idsReference, ifcOutput } from '../guardrails/_support/outputs';

let api: TestApi;
let projectId: string;
let ownerAuth: Auth;
let engineerAuth: Auth;
let modelId: string;

beforeAll(async () => {
  // The reader's path, with the tests-only switch: the live app reads no model until D-01 (apps/api/src/documents/model-reading.ts).
  api = await startTestApi({ readModels: true });
  const owner = await ownerWithProject(api, '6.2.14');
  projectId = owner.projectId;
  ownerAuth = await signIn(api, owner.ownerId);
  engineerAuth = await signIn(api, await createTestAccount(api.database, { label: '6.2.14 engineer', kind: 'person', roles: ['sovitech_engineer'] }));
  modelId = (await upload(api, ownerAuth, projectId, 'demo-hotel-mep-rev-a.ifc', fixtureBytes('fixtures/ifc/demo-hotel-mep-rev-a.ifc'))).body.documentId ?? '';
  const runner = new ScriptedRunner((_job, job) => ifcOutput(job, 'fixtures/ifc/ground-truth/demo-hotel-mep-rev-a.json', 'fixtures/ids/expected/demo-hotel-mep-rev-a.json'));
  await testWorker(api, runner, { ids: idsReference() }).drain();
}, 240_000);

afterAll(async () => {
  await api.stop();
});

describe('ifc-input 6.2.14 (stricter choice, not indexed): IDS results on the engineer\'s view only', { timeout: 120_000 }, () => {
  it("ifc-input 6.2.14: the engineer's record serves the IDS results as spec ids, counts and failing GlobalIds", async () => {
    const record = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/documents/${modelId}/engineer-record`, headers: { ...engineerAuth } });
    expect(record.statusCode).toBe(200);
    const body = record.json() as { modelRecord: { ifcSchema: string; idsResults: { ids: { draft: boolean; version: string }; specifications: { specId: string; failed: number; failingGlobalIds: string[] }[] } } };
    expect(body.modelRecord.ifcSchema).toBe('IFC4');
    expect(body.modelRecord.idsResults.ids).toMatchObject({ draft: true, version: '0.1' });
    expect(body.modelRecord.idsResults.specifications.find((spec) => spec.specId === 'S05')).toMatchObject({ failed: 8 });
    // Ids and counts only: no report text.
    expect(Object.keys(body.modelRecord.idsResults.specifications[0] ?? {}).sort()).toEqual(['applicable', 'failed', 'failingGlobalIds', 'outcome', 'passed', 'specId']);
  });

  it("ifc-input 6.2.14: the owner's row carries no model-check line, and the owner is refused the engineer's record", async () => {
    const rows = await documentList(api, ownerAuth, projectId);
    expect(rows).toEqual([
      {
        documentId: modelId,
        fileName: 'demo-hotel-mep-rev-a.ifc',
        format: 'ifc',
        stage: 'unknown',
        statusLine: { kind: 'status_line', statusLineId: 'not_analysed', text: 'Not analysed: IFC model stored, not analysed', slots: { fileType: 'IFC model' } },
      },
    ]);
    const refused = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/documents/${modelId}/engineer-record`, headers: { ...ownerAuth } });
    expect(refused.statusCode).toBe(403);
    expect(refused.json()).toEqual({ code: 'engineer_only' });
  });
});
