/**
 * G2-14 (docs/guardrails.md section 7; new in phase 3, from the final verification of part B, its fourth new
 * problem, and the fix round after it; rule 2, "Every value has a source and a verification level (2.1), and the
 * owner sees both (2.8)", which holds only while the source line names the file as it was stored; rule 14,
 * "Material, not commands"; rule 7, nobody is blocked except by the four required fields; the same reading as
 * G2-13, for a file's name).
 * Situation: a file is uploaded with bidirectional or format controls in its name (U+202E, U+2066 to U+2069,
 * U+200F), and a value is read from a document whose stored name holds them.
 * Expected: the upload is accepted and the name kept as uploaded. Every display that names the file (its step 2
 * row, a value's source line) shows it without those controls; a name of controls only shows the missing wording,
 * never an empty text.
 *
 * Found by the final verification: "TEST plan" U+202E "fdp.xlsx.pdf" was stored and shown on step 2 as
 * "TEST planfdp.xslx.pdf", a PDF named like a spreadsheet. The API now serves every file name through
 * `servedFileName` (apps/api/src/documents/file-names.ts), which drops those characters; the stored name is kept.
 *
 * Over a TEST database, through the API. Every value is TEST data; the uploaded file is a synthetic fixture. The
 * controls are written as escapes in this file, never as the characters themselves.
 *
 * Phase 4 extends it to the workspace (docs/adr/0044 decision 2; NP-4): Documents' rows and the delete confirmation, a
 * declared revision's "Revision of" and an asset's evidence (UD-08) name the file without the controls, through the
 * same `servedFileName`; the stored name is kept.
 *
 * The viewer step (part 1) adds a component half, not repeated here: the kit's model area shows a model's served file
 * name in its document line exactly as served, isolated in its value element, and names the view by aria-labelledby,
 * never by an aria-label holding the name (packages/ui/src/components/ModelArea.test.tsx, titles "G2-14 ·"). The model
 * area's served document line (the view-model half) and the page half are part 2's.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fileNamePart, insertCandidate, newId, recordAssetAppearance, registerDocument, storeDocumentTexts, withRequest } from '@sovitech/db';
import { createTestService, testContentHash } from '@sovitech/db/testing';
import { productionRegistry } from '@sovitech/registry';
import { AssetResponseSchema, DeleteEffectResponseSchema, DocumentsResponseSchema, StepResponseSchema, type DisplayObject } from '@sovitech/view-model/browser';
import { fixtureBytes, signIn, startTestApi, upload, type Auth, type TestApi } from './_support/api';

const CONTROL = /[\p{Bidi_Control}\p{Cf}]/u;

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

async function newProject(label: string): Promise<{ readonly projectId: string; readonly buildingId: string }> {
  const created = await api.app.inject({ method: 'POST', url: '/api/projects', headers: { ...owner }, payload: { name: `TEST G2-14 ${label}`, projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G2-14' } });
  expect(created.statusCode, created.body).toBe(201);
  const { projectId } = created.json() as { projectId: string };
  const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
  if (building === undefined) throw new Error('no building subject');
  return { projectId, buildingId: building.id };
}

async function displays(projectId: string, step: number): Promise<readonly DisplayObject[]> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/${String(step)}`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  return StepResponseSchema.parse(response.json()).displayObjects;
}

function texts(served: readonly DisplayObject[]): string[] {
  return served.flatMap((display) => [display.text, ...(display.lines ?? []).map((line) => line.text), ...(display.sourceLine === undefined ? [] : [display.sourceLine.text])]);
}

describe('G2-14 · rule 2: a file name is shown as stored, never reordered', { timeout: 90_000 }, () => {
  it('G2-14 · an upload named with U+202E, U+2066 to U+2069 and U+200F is accepted, stored as uploaded, and shown without them', async () => {
    const { projectId } = await newProject('upload');
    const name = 'TEST plan\u202efdp \u2066a\u2069\u2067b\u2069\u2068c\u2069\u200f.xlsx.pdf';
    const uploaded = await upload(api, owner, projectId, name, fixtureBytes('fixtures/pdf/plan-subsol.pdf'));
    expect(uploaded.status).toBe(201);
    const documentId = uploaded.body.documentId as string;
    const [stored] = await api.database.asAdministrator<{ text: string }>('SELECT text FROM sovitech.document_texts WHERE project_id = $1 AND part = $2', [projectId, fileNamePart(documentId)]);
    expect(stored?.text).toBe(name);
    const served = await displays(projectId, 2);
    expect(served.find((display) => display.valueId === `document:${documentId}.fileName`)?.text).toBe('TEST planfdp abc.xlsx.pdf');
    expect(texts(served).filter((text) => CONTROL.test(text))).toEqual([]);
  });

  it('G2-14 · a value\'s source line names its file without the controls; a name of controls only reads as no name', async () => {
    const { projectId, buildingId } = await newProject('source line');
    const area = productionRegistry.fields.find((entry) => entry.key === 'building.grossFloorArea');
    if (area === undefined) throw new Error('no gross floor area field');
    const serviceId = await createTestService(api.database, { projectId, label: 'G2-14' });
    const ids: string[] = [];
    for (const [index, name] of ['TEST \u2067tabel\u2069\u202efdp.pdf', '\u202e\u2066\u2069\u200f'].entries()) {
      const contentHash = testContentHash(`${projectId} G2-14 ${String(index)}`);
      const excerpt = `TEST Suprafata construita desfasurata: ${String(1200 + index)} mp`;
      await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
        const document = await registerDocument(request, { contentHash, kind: 'architectural', stage: 'technical_design', analysis: { status: 'analysed', coverage: 'pages 1-1 of 1' }, createdBy: serviceId });
        ids.push(document.id);
        await storeDocumentTexts(request, { contentHash, parts: [{ part: 'page:1', text: excerpt }, { part: fileNamePart(document.id), text: name }], createdBy: serviceId });
        if (index > 0) return;
        const written = await insertCandidate(
          request,
          { id: newId(), subjectId: buildingId, fieldKey: area.key, quantity: { value: 1200, unit: 'm2', qualifier: 'gross_total' }, source: 'document', evidence: [{ documentId: document.id, contentHash, locator: { page: 1 }, excerpt, check: 'text_match' }], createdBy: serviceId },
          area,
        );
        expect(written.outcome).toBe('stored');
      });
    }
    const step3 = await displays(projectId, 3);
    expect(step3.find((display) => display.valueId === `building:${buildingId}.grossFloorArea`)?.sourceLine?.text).toContain('TEST tabelfdp.pdf, page 1');
    expect(texts(step3).filter((text) => CONTROL.test(text))).toEqual([]);
    const step2 = await displays(projectId, 2);
    expect(step2.find((display) => display.valueId === `document:${ids[1] ?? ''}.fileName`)).toMatchObject({ shape: 'missing', missing: 'unknown' });
  });

  it('G2-14 · NP-4 · UD-43 · UD-08: Documents\' rows, the delete confirmation, a declared revision\'s "Revision of" and an asset\'s evidence name the file without the controls', async () => {
    const { projectId } = await newProject('workspace');
    const serviceId = await createTestService(api.database, { projectId, label: 'G2-14 workspace' });
    const names = ['TEST \u2067schema\u2069\u202efdp.pdf', 'TEST \u2066rev B\u2069\u200f.pdf'];
    const ids: string[] = [];
    for (const [index, name] of names.entries()) {
      const contentHash = testContentHash(`${projectId} G2-14 workspace ${String(index)}`);
      const excerpt = `TEST CTA-0${String(index + 1)}`;
      await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
        const document = await registerDocument(request, { contentHash, kind: 'other', stage: 'unknown', analysis: { status: 'analysed', coverage: 'pages 1-1 of 1' }, createdBy: serviceId });
        ids.push(document.id);
        await storeDocumentTexts(request, { contentHash, parts: [{ part: 'page:1', text: excerpt }, { part: fileNamePart(document.id), text: name }], createdBy: serviceId });
        await recordAssetAppearance(request, { tagAsWritten: 'CTA-01', evidence: [{ documentId: document.id, contentHash, locator: { page: 1 }, excerpt, check: 'text_match' }], createdBy: serviceId });
      });
    }
    const [first = '', second = ''] = ids;
    const declared = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/documents/${second}/revision-of`, headers: { ...owner }, payload: { revisionOf: first } });
    expect(declared.statusCode, declared.body).toBe(204);

    const documents = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/documents`, headers: { ...owner } });
    expect(documents.statusCode, documents.body).toBe(200);
    const listed = DocumentsResponseSchema.parse(documents.json());
    const byId = new Map(listed.displayObjects.map((display) => [display.valueId, display]));
    expect(byId.get(`document:${first}.fileName`)?.text).toBe('TEST schemafdp.pdf');
    expect(byId.get(`document:${second}.fileName`)?.text).toBe('TEST rev B.pdf');
    expect(listed.view.rows.find((row) => row.documentId === second)?.revisionOf).toBe(`document:${first}.fileName`);
    expect(texts(listed.displayObjects).filter((text) => CONTROL.test(text))).toEqual([]);

    const effect = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/documents/${first}/delete-effect`, headers: { ...owner } });
    expect(effect.statusCode, effect.body).toBe(200);
    const stated = DeleteEffectResponseSchema.parse(effect.json());
    expect(stated.displayObjects.find((display) => display.valueId === stated.view.fileName)?.text).toBe('TEST schemafdp.pdf');

    const [asset] = await api.database.asAdministrator<{ asset_id: string }>('SELECT asset_id FROM sovitech.asset_identities WHERE project_id = $1', [projectId]);
    const detail = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/equipment/${asset?.asset_id ?? ''}`, headers: { ...owner } });
    expect(detail.statusCode, detail.body).toBe(200);
    const shown = AssetResponseSchema.parse(detail.json());
    expect(shown.view.evidence).toHaveLength(2);
    expect(texts(shown.displayObjects).filter((text) => CONTROL.test(text))).toEqual([]);
    expect(shown.displayObjects.find((display) => display.valueId === shown.view.tag)?.sourceLine?.text).toBe('Found in TEST schemafdp.pdf, page 1; TEST rev B.pdf, page 1');
  });
});
