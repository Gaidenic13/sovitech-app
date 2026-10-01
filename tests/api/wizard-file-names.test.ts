/**
 * File names as the API serves them, through the wizard API over a TEST database (phase 3 part B, the final
 * verification's fourth new problem; guardrails rule 2, the source the owner sees names its file; rule 14, what
 * the owner writes never changes how the app's copy reads; G2-13 holds it for the owner's typed text; rule 7, no
 * new blocked state). A file uploaded as "TEST plan" U+202E "fdp.xlsx.pdf" was stored and showed on step 2 as
 * "TEST planfdp.xslx.pdf". Now every file name served in a display object (a step 2 row, an upload still being
 * sent, the refused upload's name, a source line) drops the format and bidirectional controls
 * (`apps/api/src/documents/file-names.ts`), the stored name stays as uploaded, the upload is accepted as before,
 * and the log names no file.
 *
 * TEST accounts and projects only; the uploaded files are generated synthetic fixtures and TEST bytes.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fileNamePart, insertCandidate, newId, registerDocument, storeDocumentTexts, withRequest } from '@sovitech/db';
import { createTestService, testContentHash } from '@sovitech/db/testing';
import { productionRegistry } from '@sovitech/registry';
import { RefusalBodySchema, StepResponseSchema, type DisplayObject } from '@sovitech/view-model/browser';
import { fixtureBytes, signIn, startTestApi, upload, type Auth, type TestApi } from '../guardrails/_support/api';

/** Each test reads and writes a TEST database; under a loaded run a request can take seconds. */
const LONG = { timeout: 90_000 };

// The controls the final verification named, written as escapes: the right-to-left override, the four isolates and the right-to-left mark.
const RLO = '\u202e';
const LRI = '\u2066';
const RLI = '\u2067';
const FSI = '\u2068';
const PDI = '\u2069';
const RLM = '\u200f';
/** Any format or bidirectional control (what is never served in a file name). */
const CONTROL = /[\p{Bidi_Control}\p{Cf}]/u;

let api: TestApi;
let ownerId: string;
let owner: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [id] = api.devAccountIds;
  if (id === undefined) throw new Error('no TEST development owner');
  ownerId = id;
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

async function newProject(label: string): Promise<{ readonly projectId: string; readonly buildingId: string }> {
  const created = await api.app.inject({ method: 'POST', url: '/api/projects', headers: { ...owner }, payload: { name: `TEST ${label}`, projectType: 'new_construction', countryCode: 'RO', city: 'TEST city file names' } });
  expect(created.statusCode, created.body).toBe(201);
  const { projectId } = created.json() as { projectId: string };
  const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
  if (building === undefined) throw new Error('no building subject');
  return { projectId, buildingId: building.id };
}

async function step(projectId: string, number: number) {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/${String(number)}`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  return StepResponseSchema.parse(response.json());
}

function byId(displays: readonly DisplayObject[], valueId: string): DisplayObject | undefined {
  return displays.find((display) => display.valueId === valueId);
}

/** Every text a display object serves: its text, its parts, its lines and its source line. */
function servedTexts(displays: readonly DisplayObject[]): string[] {
  return displays.flatMap((display) => [display.text, ...(display.parts ?? []), ...(display.lines ?? []).map((line) => line.text), ...(display.sourceLine === undefined ? [] : [display.sourceLine.text])]);
}

async function storedName(projectId: string, documentId: string): Promise<string | undefined> {
  const [row] = await api.database.asAdministrator<{ text: string }>('SELECT text FROM sovitech.document_texts WHERE project_id = $1 AND part = $2', [projectId, fileNamePart(documentId)]);
  return row?.text;
}

describe('A-8 (file names) · rule 2 · rule 14: a file name is served without format and bidirectional controls, and stored as uploaded', LONG, () => {
  it('A-8 · rule 2 · rule 14 · R-013: an upload named with U+202E, U+2066 to U+2069 and U+200F is accepted and stored as uploaded; step 2 serves its name without them', async () => {
    const { projectId } = await newProject('file names step 2');
    const reordered = `TEST plan${RLO}fdp.xlsx.pdf`;
    const isolated = `TEST ${LRI}memoriu${PDI} ${RLI}tehnic${PDI} ${FSI}rev${PDI}${RLM}.pdf`;
    const first = await upload(api, owner, projectId, reordered, fixtureBytes('fixtures/pdf/plan-subsol.pdf'));
    const second = await upload(api, owner, projectId, isolated, fixtureBytes('fixtures/pdf/memoriu-tehnic.pdf'));
    expect([first.status, second.status]).toEqual([201, 201]);
    const firstId = first.body.documentId as string;
    const secondId = second.body.documentId as string;
    // Stored as uploaded (no control dropped from what is kept).
    expect(await storedName(projectId, firstId)).toBe(reordered);
    expect(await storedName(projectId, secondId)).toBe(isolated);

    // An upload still being sent: its own row, named the same way.
    const opened = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { ...owner }, payload: { fileName: `TEST report${RLO}xslx.pdf`, size: 10 } });
    expect(opened.statusCode, opened.body).toBe(201);
    const { uploadId } = opened.json() as { uploadId: string };

    const { view, displayObjects } = await step(projectId, 2);
    if (view.step !== 2) throw new Error('not step 2');
    expect(byId(displayObjects, `document:${firstId}.fileName`)?.text).toBe('TEST planfdp.xlsx.pdf');
    expect(byId(displayObjects, `document:${secondId}.fileName`)?.text).toBe('TEST memoriu tehnic rev.pdf');
    expect(byId(displayObjects, `upload:${uploadId}.fileName`)?.text).toBe('TEST reportxslx.pdf');
    expect(servedTexts(displayObjects).filter((text) => CONTROL.test(text))).toEqual([]);
    // The log carries codes and ids only (rule 13): no file name, no control.
    const logged = JSON.stringify(api.log);
    expect(logged.includes('TEST plan') || logged.includes('TEST report') || CONTROL.test(logged)).toBe(false);
  });

  it('A-8 · rule 2 · DR-10: a file the fixtures-only guard refuses is named without the controls in its bound display object', async () => {
    const { projectId } = await newProject('file names refused');
    const refused = await upload(api, owner, projectId, `TEST refused${RLO}fdp.pdf`, new TextEncoder().encode('TEST bytes that are no fixture'));
    expect(refused.status).toBe(422);
    const body = RefusalBodySchema.parse(refused.body);
    expect(body.code).toBe('not_a_fixture');
    const named = byId(body.displayObjects ?? [], body.fileName ?? '');
    expect(named?.text).toBe('TEST refusedfdp.pdf');
    expect(CONTROL.test(JSON.stringify(body))).toBe(false);
  });

  it('A-8 · rule 2 "the owner sees both (2.8)": a value\'s source line names its file without the controls; a name made only of controls reads as no name', async () => {
    const { projectId, buildingId } = await newProject('file names source line');
    const area = productionRegistry.fields.find((entry) => entry.key === 'building.grossFloorArea');
    if (area === undefined) throw new Error('no gross floor area field');
    const serviceId = await createTestService(api.database, { projectId, label: 'file names' });
    const documents: string[] = [];
    for (const [index, name] of [`TEST ${RLI}tabel${PDI}${RLO}fdp.pdf`, `${RLO}${LRI}${PDI}${RLM}`].entries()) {
      const contentHash = testContentHash(`${projectId} file names ${String(index)}`);
      const excerpt = `TEST Suprafata construita desfasurata: ${String(1200 + index)} mp`;
      await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
        const document = await registerDocument(request, { contentHash, kind: 'architectural', stage: 'technical_design', analysis: { status: 'analysed', coverage: 'pages 1-1 of 1' }, createdBy: serviceId });
        documents.push(document.id);
        await storeDocumentTexts(request, { contentHash, parts: [{ part: 'page:1', text: excerpt }, { part: fileNamePart(document.id), text: name }], createdBy: serviceId });
        if (index > 0) return;
        const written = await insertCandidate(
          request,
          {
            id: newId(),
            subjectId: buildingId,
            fieldKey: area.key,
            quantity: { value: 1200, unit: 'm2', qualifier: 'gross_total' },
            source: 'document',
            evidence: [{ documentId: document.id, contentHash, locator: { page: 1 }, excerpt, check: 'text_match' }],
            createdBy: serviceId,
          },
          area,
        );
        expect(written.outcome).toBe('stored');
      });
    }
    const [named, blank] = documents;
    const { displayObjects } = await step(projectId, 3);
    const value = byId(displayObjects, `building:${buildingId}.grossFloorArea`);
    expect(value?.sourceLine?.text).toContain('TEST tabelfdp.pdf, page 1');
    expect(servedTexts(displayObjects).filter((text) => CONTROL.test(text))).toEqual([]);
    const rows = (await step(projectId, 2)).displayObjects;
    expect(byId(rows, `document:${named ?? ''}.fileName`)?.text).toBe('TEST tabelfdp.pdf');
    // Nothing left to show: the missing wording, never an empty text.
    expect(byId(rows, `document:${blank ?? ''}.fileName`)).toMatchObject({ shape: 'missing', missing: 'unknown' });
  });
});
