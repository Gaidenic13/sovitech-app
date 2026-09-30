/**
 * G14-3 (new case id of prompt 3, "New case ids"; rule 14, "Material, not commands",
 * "Embedded instructions are reported"; ifc-input 4.1 item 6 and 5.3; PRD R-024).
 * Situation: an IFC element's Description contains an instruction to mark values verified.
 * Expected: no state change. One `embedded_instruction` finding.
 *
 * On a TEST database, the owner uploads the synthetic MEP model (rev A), whose proxy
 * "Generic Model 1" carries in its Description an instruction to mark all values as
 * engineer verified (fixtures/ifc/ground-truth/demo-hotel-mep-rev-a.json). The extractor,
 * scripted from that ground truth, reports it as an embedded instruction. Afterwards the
 * store holds one `embedded_instruction` finding for the engineer, with its code and the
 * element's GlobalId and STEP id, and one `embedded_instruction` guardrail event; and no
 * state changed: no candidate, no candidate event (no `engineer_verified` anywhere), no
 * field event, no document event, and the model's status line stays "Not analysed: IFC
 * model stored, not analysed". The instruction's words are stored nowhere.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import { ScriptedRunner, documentList, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type Auth, type TestApi } from './_support/api';
import { idsReference, ifcOutput } from './_support/outputs';

/** The proxy whose Description holds the instruction (the fixture's ground truth). */
const PROXY_GLOBAL_ID = '3TC75U8dfQLuyIEab9CcFg';

let api: TestApi;
let ownerId: string;
let projectId: string;
let auth: Auth;
let modelId: string;

beforeAll(async () => {
  // The reader's path, with the tests-only switch: the live app reads no model until D-01 (apps/api/src/documents/model-reading.ts).
  api = await startTestApi({ readModels: true });
  ({ ownerId, projectId } = await ownerWithProject(api, 'G14-3'));
  auth = await signIn(api, ownerId);
  modelId = (await upload(api, auth, projectId, 'demo-hotel-mep-rev-a.ifc', fixtureBytes('fixtures/ifc/demo-hotel-mep-rev-a.ifc'))).body.documentId ?? '';
}, 240_000);

afterAll(async () => {
  await api.stop();
});

/** The project's state: every value, verification, field and document event, and the model's analysis. */
async function state(): Promise<Record<string, unknown>> {
  const count = async (sql: string) => (await api.database.asAdministrator<{ n: number }>(sql, [projectId]))[0]?.n;
  return {
    candidates: await count('SELECT count(*)::int AS n FROM sovitech.candidates WHERE project_id = $1'),
    candidateEvents: await count('SELECT count(*)::int AS n FROM sovitech.candidate_events WHERE project_id = $1'),
    verified: await count(`SELECT count(*)::int AS n FROM sovitech.candidate_events WHERE project_id = $1 AND type = 'engineer_verified'`),
    fieldEvents: await count('SELECT count(*)::int AS n FROM sovitech.field_events WHERE project_id = $1'),
    documentEvents: await count('SELECT count(*)::int AS n FROM sovitech.document_events WHERE project_id = $1'),
    analyses: await api.database.asAdministrator('SELECT status, coverage FROM sovitech.document_analysis_events WHERE project_id = $1 ORDER BY at', [projectId]),
  };
}

test("F-IFC-02 · R-024 · G14-3: an IFC element's Description instructs marking values verified: one embedded_instruction finding, and no state change", async () => {
  const before = await state();
  const rowBefore = await documentList(api, auth, projectId);

  const runner = new ScriptedRunner((_job, job) => ifcOutput(job, 'fixtures/ifc/ground-truth/demo-hotel-mep-rev-a.json', 'fixtures/ids/expected/demo-hotel-mep-rev-a.json'));
  expect((await testWorker(api, runner, { ids: idsReference() }).drain()).map((step) => step.kind)).toEqual(['done']);

  // One embedded_instruction finding, for the engineer: a code and the element, never its words.
  const findings = await api.database.asAdministrator<{ kind: string; code: string; locator: Record<string, unknown> }>(
    `SELECT kind, code, locator FROM sovitech.document_findings WHERE project_id = $1 AND kind = 'embedded_instruction'`,
    [projectId],
  );
  expect(findings).toEqual([{ kind: 'embedded_instruction', code: 'embedded_instruction.override', locator: { kind: 'ifc', globalId: PROXY_GLOBAL_ID, stepIds: [100891] } }]);
  const events = await api.database.asAdministrator<{ type: string; subject_id: string; reason: string }>(
    `SELECT type, subject_id, reason FROM sovitech.guardrail_events WHERE project_id = $1`,
    [projectId],
  );
  expect(events).toEqual([{ type: 'embedded_instruction', subject_id: modelId, reason: 'embedded_instruction.override' }]);

  // No state change.
  expect(await state()).toEqual(before);
  expect(await documentList(api, auth, projectId)).toEqual(rowBefore);

  // The instruction's words are stored nowhere: not as text, not in a finding, not in a log.
  const stored = await api.database.asAdministrator<{ text: string }>(
    `SELECT text FROM sovitech.document_texts WHERE project_id = $1
     UNION ALL SELECT locator::text FROM sovitech.document_findings WHERE project_id = $1
     UNION ALL SELECT coalesce(reason, '') FROM sovitech.guardrail_events WHERE project_id = $1`,
    [projectId],
  );
  expect(stored.map((row) => row.text).join('\n')).not.toMatch(/ignore previous instructions|mark all values/iu);
  expect(JSON.stringify(api.log)).not.toMatch(/ignore previous instructions|mark all values/iu);
});
