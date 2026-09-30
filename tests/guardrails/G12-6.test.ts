/**
 * G12-6 (new case id of prompt 3, "New case ids"; rule 1, "A value exists only if it comes
 * from ... a verified document location"; rule 6, "Ask only questions that change the
 * result"; rule 7, "Open items are short, and say who acts"; 2.8, "Reserved terms"; prompt
 * 3 5.4, `ifc-values` closed: "Schema errors and IDS results are stored with the document
 * as engineer items, shown on the engineer's view only"; PRD R-023).
 * Situation: the draft IDS reports failed checks on a model.
 * Expected: no candidate, candidate event, field event, question or open item is created.
 * No rendered copy about the results contains a reserved term.
 *
 * On a TEST database, the owner uploads the synthetic MEP model (rev A). The extractor,
 * scripted from the fixture's ground truth and the draft IDS v0.1's expected results
 * (fixtures/ids/expected/), reports failed checks (S05 to S09). Afterwards the store holds
 * exactly what it held before, plus the engineer's record of the model: no candidate, no
 * candidate or field event, no guardrail event of a question for a known field, and no line
 * about the results on the owner's document row. The engineer's record serves the results
 * as spec ids, counts and failing GlobalIds, and no text served to the owner or the
 * engineer about them holds a reserved term (guardrails 2.8, matched as the copy check
 * matches: whole word, ignoring case and diacritics).
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import { createTestAccount } from '@sovitech/db/testing';
import { findReservedTerms } from '@sovitech/registry/reserved-terms';
import { ScriptedRunner, documentList, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type Auth, type TestApi } from './_support/api';
import { idsReference, ifcOutput } from './_support/outputs';

let api: TestApi;
let ownerId: string;
let projectId: string;
let auth: Auth;
let modelId: string;

beforeAll(async () => {
  // The reader's path, with the tests-only switch: the live app reads no model until D-01 (apps/api/src/documents/model-reading.ts).
  api = await startTestApi({ readModels: true });
  ({ ownerId, projectId } = await ownerWithProject(api, 'G12-6'));
  auth = await signIn(api, ownerId);
  modelId = (await upload(api, auth, projectId, 'demo-hotel-mep-rev-a.ifc', fixtureBytes('fixtures/ifc/demo-hotel-mep-rev-a.ifc'))).body.documentId ?? '';
}, 240_000);

afterAll(async () => {
  await api.stop();
});

/** Every value-bearing row of the project: candidates, their events, field events, and questions logged for known fields. */
async function valueRows(): Promise<Record<string, unknown>> {
  const count = async (sql: string) => (await api.database.asAdministrator<{ n: number }>(sql, [projectId]))[0]?.n;
  return {
    candidates: await count('SELECT count(*)::int AS n FROM sovitech.candidates WHERE project_id = $1'),
    candidateEvents: await count('SELECT count(*)::int AS n FROM sovitech.candidate_events WHERE project_id = $1'),
    fieldEvents: await count('SELECT count(*)::int AS n FROM sovitech.field_events WHERE project_id = $1'),
    questions: await count(`SELECT count(*)::int AS n FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'question_for_known_field'`),
  };
}

/** Every string value in a JSON value. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(strings);
  return [];
}

test('R-023 · F-IFC-01 · G12-6: the draft IDS reports failed checks on a model: no candidate, candidate event, field event, question or open item is created, and no copy about the results holds a reserved term', async () => {
  const before = await valueRows();
  const ownerRowBefore = await documentList(api, auth, projectId);

  const runner = new ScriptedRunner((_job, job) => ifcOutput(job, 'fixtures/ifc/ground-truth/demo-hotel-mep-rev-a.json', 'fixtures/ids/expected/demo-hotel-mep-rev-a.json'));
  const steps = await testWorker(api, runner, { ids: idsReference() }).drain();
  expect(steps.map((step) => step.kind)).toEqual(['done']);

  // The results were stored, and they report failed checks.
  const engineer = await createTestAccount(api.database, { label: 'G12-6 engineer', kind: 'person', roles: ['sovitech_engineer'] });
  const engineerAuth = await signIn(api, engineer);
  const record = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/documents/${modelId}/engineer-record`, headers: { ...engineerAuth } });
  expect(record.statusCode).toBe(200);
  const specifications = (record.json() as { modelRecord: { idsResults: { specifications: { specId: string; outcome: string; failed: number }[] } } }).modelRecord.idsResults.specifications;
  expect(specifications.filter((spec) => spec.outcome === 'fail').map((spec) => spec.specId)).toEqual(['S05', 'S06', 'S07', 'S08', 'S09']);

  // No candidate, candidate event, field event or question.
  expect(await valueRows()).toEqual(before);
  // No open item: the owner's row is the row it was, with no line about the results.
  const ownerRowAfter = await documentList(api, auth, projectId);
  expect(ownerRowAfter).toEqual(ownerRowBefore);
  expect(JSON.stringify(ownerRowAfter)).not.toMatch(/S0\d|ids|check/iu);

  // No copy about the results holds a reserved term: not the owner's, not the engineer's.
  for (const text of [...strings(ownerRowAfter), ...strings(record.json())]) {
    expect(findReservedTerms(text), text).toEqual([]);
  }
});
