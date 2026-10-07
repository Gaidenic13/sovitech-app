/**
 * G13-16 (new in phase 7; rule 13, "Project boundary": "Uploaded documents, excerpts and extracted values serve only the
 * project they were uploaded to", and "Isolation"; docs/adr/0013 decision 5: "Holding `sovitech_admin` alone gives no
 * access to a project's documents and values"; docs/adr/0053 decision 6).
 * Situation: a user holding `sovitech_admin` and a member of no project reads the admin area.
 * Expected: no candidate value, evidence excerpt, extracted text, file name or project name of any project is returned.
 *
 * The store half (every admin read of migration 0018) and the API half (the three admin routes), over a TEST database:
 * a TEST owner's project whose name, city, file names, page text, excerpts and values (a document value, an inference,
 * the owner's correction of it) each hold a distinctive TEST word, one document of it erased through the API's Delete,
 * so every admin read has rows. The admin reads everything the area serves; no string of it holds any of those words.
 * The control: the owner's own step 1 serves the project's name with the word. Every account, document and value is
 * TEST data; the account names hold none of the words (an account's name is a stored text the admin manages).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  readAdminAccounts,
  readAdminCalibrationDecisions,
  readAdminErasures,
  readAdminGuardrailCounts,
  readAdminInferenceDecisions,
  readAdminProjects,
  readAdminRoleEvents,
  withRequest,
} from '@sovitech/db';
import { FIELD } from '@sovitech/registry';
import { adminGet, adminOf, inferredValue, wordsOf, type AdminPath } from './_support/admin';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { registryField } from './_support/view-model';
import { documentValue, newOwnerProject, productionFieldOf, serviceOf, testDocumentIn, testRegistry } from './_support/workspace-store';

const LONG = { timeout: 120_000 };
/** The TEST words of the project: in its name and city (zephyrhall), its file names (cobaltfern), its page text and excerpts (tamarisk), and its values (tamarisk; hotel and office). */
const SECRET = /zephyrhall|cobaltfern|tamarisk|\bhotel\b|\boffice\b/iu;
const NOTE = registryField('building.testNote', { kind: 'text', subject: 'building', confirmBy: 'engineer' });

let api: TestApi;
let owner: Auth;
let admin: Auth;
let adminId: string;
let projectId: string;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true, registry: testRegistry({ fields: [NOTE] }) });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
  ({ admin, adminId } = await adminOf(api, 'G13-16'));
  const created = await newOwnerProject(api, owner, 'zephyrhall');
  projectId = created.projectId;
  const serviceId = await serviceOf(api, projectId, 'G13-16');
  const page = 'TEST tamarisk note. Destinatia cladirii: hotel';
  const kept = await testDocumentIn(api, { projectId, serviceId, label: 'G13-16 kept', fileName: 'TEST cobaltfern-kept.pdf', pages: [page] });
  const gone = await testDocumentIn(api, { projectId, serviceId, label: 'G13-16 gone', fileName: 'TEST cobaltfern-gone.pdf', pages: ['TEST tamarisk erased page'] });
  await documentValue(api, { projectId, serviceId, subjectId: created.buildingId, field: NOTE, value: { text: 'tamarisk' }, from: [{ document: kept, page: 1, excerpt: page }] });
  await documentValue(api, { projectId, serviceId, subjectId: created.buildingId, field: NOTE, value: { text: 'tamarisk gone' }, from: [{ document: gone, page: 1, excerpt: 'TEST tamarisk erased page' }] });
  const inferenceId = await inferredValue(api, { projectId, serviceId, subjectId: created.buildingId, field: productionFieldOf(FIELD.buildingType), choice: 'hotel', confidence: 'high', from: [{ document: kept, page: 1, excerpt: page }] });
  const edit = await api.app.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/fields/edit`,
    headers: { ...owner },
    payload: { field: { subjectId: created.buildingId, fieldKey: FIELD.buildingType }, value: { kind: 'choice', choice: 'office' }, corrects: [inferenceId] },
  });
  if (edit.statusCode !== 200) throw new Error(`the TEST correction answered ${String(edit.statusCode)}`);
  const deleted = await api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${gone.id}`, headers: { ...owner } });
  if (deleted.statusCode >= 300) throw new Error(`the TEST deletion answered ${String(deleted.statusCode)}`);
}, 240_000);

afterAll(async () => {
  await api.stop();
});

describe('G13-16 · rule 13 · ADR 0013 decision 5 · ADR 0053 decision 6', LONG, () => {
  it('G13-16 (the store half): every admin read returns rows, and none holds a value, an excerpt, extracted text, a file name or a project\'s name', async () => {
    const rows = await withRequest(api.database.app, { userId: adminId }, async (request) => ({
      accounts: await readAdminAccounts(request),
      roleEvents: await readAdminRoleEvents(request),
      projects: await readAdminProjects(request),
      counts: await readAdminGuardrailCounts(request),
      decisions: await readAdminCalibrationDecisions(request),
      inferences: await readAdminInferenceDecisions(request),
      erasures: await readAdminErasures(request),
    }));
    // Each read has rows of this project (the case is not proven on empty reads).
    expect(rows.projects.some((row) => row.projectId === projectId)).toBe(true);
    expect(rows.counts.projects.some((row) => row.projectId === projectId && row.type === 'owner_corrected_inference' && row.count > 0)).toBe(true);
    expect(rows.decisions.some((row) => row.fieldKey === FIELD.buildingType && row.outcome === 'corrected')).toBe(true);
    expect(rows.erasures.some((row) => row.projectId === projectId)).toBe(true);
    expect(wordsOf(rows).filter((word) => SECRET.test(word))).toEqual([]);
  });

  it('G13-16 (the API half): the three admin routes serve none of them either; the owner\'s own step 1 serves the name (the control)', async () => {
    for (const page of ['accounts', 'datasets', 'guardrail-events'] as const satisfies readonly AdminPath[]) {
      const response = await adminGet(api, admin, page);
      expect(response.statusCode, page).toBe(200);
      expect(wordsOf(response.json()).filter((word) => SECRET.test(word)), page).toEqual([]);
      expect(SECRET.test(response.body), page).toBe(false);
    }
    const stepOne = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/1`, headers: { ...owner } });
    expect(stepOne.statusCode).toBe(200);
    expect(stepOne.body).toContain('zephyrhall');
  });
});
