/**
 * G13-15 (new in phase 7; rule 13, "Erasure": "one audited erasure job does all of the following: removes the file,
 * its extracted text and its embeddings; replaces the excerpt text in every evidence entry that cites it with
 * '[erased]'; writes an `erased` document event; withdraws the affected candidates"; rule 13, "Isolation": "Logs and
 * error reports never contain document text"; 2.3's `DocumentEvent` roles; PRD R-151: "one erasure log entry per
 * erasure job, built from its `erased` document event (who asked, in which role, when, which document and what was
 * removed); no entry shows document text or an excerpt"; US-ADMIN-23).
 * Situation: an owner deletes a document whose extracted text and excerpts hold words, and the admin opens the
 * erasure log.
 * Expected: one entry for that erasure names who asked, in which role, when, the document's id and what was removed,
 * and holds none of the document's text or excerpts.
 *
 * The store half (`readAdminErasures`, migration 0018) and the API half (`GET /api/admin/guardrail-events`), over a TEST
 * database: the TEST owner deletes, through the API's Delete, a TEST document whose page text, excerpts and file name
 * hold distinctive TEST words, cited by a document value and an inference. The rendered half is the web's. Every
 * account, document and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readAdminErasures, withRequest } from '@sovitech/db';
import { FIELD } from '@sovitech/registry';
import { AdminGuardrailEventsResponseSchema } from '@sovitech/view-model/browser';
import { adminGet, adminOf, inferredValue, wordsOf } from './_support/admin';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { registryField } from './_support/view-model';
import { documentValue, newOwnerProject, productionFieldOf, serviceOf, testDocumentIn, testRegistry } from './_support/workspace-store';

const LONG = { timeout: 120_000 };
/** The TEST words the document holds: none may reach the erasure log. */
const SECRET = /quillwort|marshmere|Destinatia/iu;
const NOTE = registryField('building.testNote', { kind: 'text', subject: 'building', confirmBy: 'engineer' });

let api: TestApi;
let owner: Auth;
let ownerId: string;
let admin: Auth;
let adminId: string;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true, registry: testRegistry({ fields: [NOTE] }) });
  const [devOwner] = api.devAccountIds;
  if (devOwner === undefined) throw new Error('no TEST development owner');
  ownerId = devOwner;
  owner = await signIn(api, ownerId);
  ({ admin, adminId } = await adminOf(api, 'G13-15'));
}, 240_000);

afterAll(async () => {
  await api.stop();
});

describe('G13-15 · rule 13 · R-151 · US-ADMIN-23', LONG, () => {
  it('G13-15: the owner deletes a document that holds words; the erasure log\'s one entry names who asked, the role, when, the document and what was removed, and holds none of its text', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G13-15');
    const serviceId = await serviceOf(api, projectId, 'G13-15');
    const page = 'TEST quillwort note: marshmere. Destinatia cladirii: hotel';
    const document = await testDocumentIn(api, { projectId, serviceId, label: 'G13-15 page', fileName: 'TEST quillwort-marshmere.pdf', pages: [page] });
    await documentValue(api, { projectId, serviceId, subjectId: buildingId, field: NOTE, value: { text: 'marshmere' }, from: [{ document, page: 1, excerpt: page }] });
    await inferredValue(api, { projectId, serviceId, subjectId: buildingId, field: productionFieldOf(FIELD.buildingType), choice: 'hotel', confidence: 'high', from: [{ document, page: 1, excerpt: page }] });

    const deleted = await api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${document.id}`, headers: { ...owner } });
    expect(deleted.statusCode, deleted.body).toBeLessThan(300);
    const erased = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.document_events WHERE document_id = $1 AND type = 'erased'`, [document.id]);
    expect(erased).toHaveLength(1);
    const documentEventId = erased[0]?.id ?? '';

    // The store half: one entry, ids, the role, the time and counts only.
    const rows = (await withRequest(api.database.app, { userId: adminId }, (request) => readAdminErasures(request))).filter((row) => row.documentId === document.id);
    expect(rows).toEqual([
      {
        documentEventId,
        projectId,
        isDemo: false,
        documentId: document.id,
        role: 'owner',
        byUserId: ownerId,
        at: expect.stringMatching(/Z$/u) as unknown as string,
        excerptsErased: 2,
        textPartsDeleted: 2,
        candidatesWithdrawn: 2,
      },
    ]);
    expect(wordsOf(rows).filter((word) => SECRET.test(word))).toEqual([]);

    // The API half: the entry as the admin reads it, and nothing of the document's text anywhere in the response.
    const response = await adminGet(api, admin, 'guardrail-events');
    expect(response.statusCode, response.body).toBe(200);
    expect(SECRET.test(response.body)).toBe(false);
    const { view, displayObjects } = AdminGuardrailEventsResponseSchema.parse(response.json());
    const entries = view.erasures.filter((entry) => entry.documentEventId === documentEventId);
    expect(entries).toHaveLength(1);
    const [entry] = entries;
    const text = (valueId: string | undefined): string | undefined => displayObjects.find((display) => display.valueId === valueId)?.text;
    expect(entry?.role).toBe('owner');
    expect(text(entry?.by)).toBe('TEST development owner');
    expect(text(entry?.document)).toBe(document.id);
    expect(text(entry?.project)).toBe(projectId);
    expect(text(entry?.at)).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}$/u);
    expect(text(entry?.removed)).toBe('2 excerpts erased, 2 text parts deleted, 2 values withdrawn');
    // The control: the words were there before (the erased excerpts now read "[erased]").
    const excerpts = await api.database.asAdministrator<{ text: string }>(
      `SELECT excerpt.text FROM sovitech.evidence_excerpts AS excerpt JOIN sovitech.evidence_locators AS locator ON locator.id = excerpt.evidence_id WHERE locator.document_id = $1`,
      [document.id],
    );
    expect(excerpts.map((row) => row.text)).toEqual(['[erased]', '[erased]']);
  });
});
