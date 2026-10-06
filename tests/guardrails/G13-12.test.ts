/**
 * G13-12 (new in phase 5, for the integrator to index; rule 13, "Erasure": "removes the file, its extracted text ...;
 * replaces the excerpt text in every evidence entry that cites it with '[erased]' ... This is the only path that alters
 * stored evidence"; PRD R-118, US-REPORTS-03 AC3; docs/adr/0050 decision 3: exports are printed from stored records
 * when they are downloaded, and no export file is stored).
 * Situation: a document cited by a stored proposal is erased, and the proposal is exported again.
 * Expected: the export holds no text of the erased document (its excerpts read "[erased]"), and no stored file holds it.
 *
 * The API half, over a TEST database: a TEST document's gross floor area (a `document` value with its verified
 * excerpt) is an input of the stored proposal; its print view (what the print route renders and the PDF prints) shows
 * the excerpt verbatim; the owner deletes the document (the audited erasure); the same stored proposal's print view, the
 * export's source, now shows the input's excerpt as "[erased]", with "Source document removed", and holds the erased
 * text nowhere; recording the export again stores no file, and no file in the project's folder holds the text.
 * The PDF half (the integrator): that view printed by the API's printer (apps/api/src/proposal/export.ts) from the app's
 * print document (./_support/print.tsx) and read back with pypdfium2 holds "[erased]" and no text of the erased
 * document. It launches Chromium: run it under the e2e lock with one worker. Every account and value is TEST data.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ExportResponseSchema, GenerateResponseSchema, ProposalPrintResponseSchema } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { printProposal } from './_support/print';
import { documentValue, newOwnerProject, productionFieldOf, serviceOf, testDocumentIn } from './_support/workspace-store';

const EXCERPT = 'TEST Suprafata construita desfasurata 2345 mp G13-12';

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

/** Every file under a folder, recursively. */
async function filesUnder(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => []);
  const found: string[] = [];
  for (const entry of entries) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) found.push(...(await filesUnder(path)));
    else found.push(path);
  }
  return found;
}

describe('G13-12 · rule 13: a stored proposal exported again after its document was erased', { timeout: 90_000 }, () => {
  it('G13-12 · US-REPORTS-03 AC3 · R-118 · G13-3: the print view shows the excerpt as "[erased]" and holds no text of the erased document; no stored file holds it', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G13-12');
    const serviceId = await serviceOf(api, projectId, 'G13-12');
    const document = await testDocumentIn(api, { projectId, serviceId, label: 'G13-12 memoriu', fileName: 'TEST memoriu G13-12.pdf', pages: [EXCERPT] });
    const candidateId = await documentValue(api, {
      projectId,
      serviceId,
      subjectId: buildingId,
      field: productionFieldOf('building.grossFloorArea'),
      value: { quantity: { value: 2345, unit: 'm2', qualifier: 'gross_total' } },
      from: [{ document, page: 1, excerpt: EXCERPT }],
    });
    const generated = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/proposals`, headers: { ...owner }, payload: {} });
    const { snapshotId } = GenerateResponseSchema.parse(generated.json());
    const [cited] = await api.database.asAdministrator<{ candidate_id: string }>('SELECT candidate_id FROM sovitech.proposal_snapshot_candidates WHERE snapshot_id = $1 AND candidate_id = $2', [snapshotId, candidateId]);
    expect(cited?.candidate_id).toBe(candidateId);
    const areaId = `proposal:${snapshotId}.inputs.building.grossFloorArea`;

    const before = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposals/${snapshotId}/print`, headers: { ...owner } });
    const shown = ProposalPrintResponseSchema.parse(before.json()).displayObjects.find((display) => display.valueId === areaId);
    expect(shown?.evidence?.map((entry) => entry.excerpt)).toEqual([EXCERPT]);

    const deleted = await api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${document.id}`, headers: { ...owner } });
    expect(deleted.statusCode, deleted.body).toBe(200);

    const after = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposals/${snapshotId}/print`, headers: { ...owner } });
    expect(after.statusCode, after.body).toBe(200);
    expect(after.body).not.toContain(EXCERPT);
    expect(after.body).not.toContain('Suprafata');
    const print = ProposalPrintResponseSchema.parse(after.json());
    const area = print.displayObjects.find((display) => display.valueId === areaId);
    expect(area?.evidence?.map((entry) => entry.excerpt)).toEqual(['[erased]']);
    expect(area?.lines?.map((line) => line.text)).toContain('Source document removed');
    expect(print.view.appendix.values).toContain(areaId);

    // The PDF half (the integrator, phase 5 part A; ADR 0050 decision 3: the PDF is this view printed when it is
    // downloaded): printed by the API's printer from the print document the app renders for it, and read back, no page
    // holds the erased text, and the input's excerpt reads "[erased]" in the appendix.
    const printed = await printProposal(print);
    const pdfText = printed.pages.join('\n').replace(/\s+/gu, ' ');
    expect(pdfText).toContain('[erased]');
    expect(pdfText).toContain('Source document removed');
    expect(pdfText).not.toContain('Suprafata');
    expect(pdfText).not.toContain('2345 mp');

    // Exporting again records the output only: no file is stored, and no file of the project holds the erased text.
    const exported = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/proposals/${snapshotId}/exports`, headers: { ...owner }, payload: {} });
    ExportResponseSchema.parse(exported.json());
    for (const file of await filesUnder(join(api.dataDirectory, projectId))) {
      expect((await readFile(file)).includes(Buffer.from(EXCERPT, 'utf8')), file).toBe(false);
    }
    expect(await api.files.filesKeyedTo(projectId, document.contentHash)).toEqual([]);
  });
});
