/**
 * G13-8 (docs/guardrails.md section 7; rule 13, "Erasure": one audited erasure job "removes the file, its
 * extracted text" and "replaces the excerpt text in every evidence entry that cites it with '[erased]'";
 * 2.3, "Erasure. Erasure follows rule 13"). Phase 1 review, round 3, adversarial finding (high) on writes
 * after an erasure (probe E0 to E4).
 * Situation: after a document is erased, the extraction job stores extracted text, a candidate's evidence
 * excerpt or an asset appearance that cites it.
 * Expected: refused; no text of the erased document is stored.
 *
 * On a TEST database, the owner erases a TEST document; the extraction job's TEST service account, a
 * member of the project and still running or retried, then writes through the data-access layer the
 * document's text again (E1), a new document value whose evidence cites it with its excerpt in clear
 * (E2), and an asset appearance citing it (E3). The store refuses each (`SVE11`, `document_erased`), and
 * the administrator, who reads every row, finds no text of the erased document in the extracted text or
 * in any excerpt (E4). The control: the same bytes uploaded again as a new document take text and
 * evidence (US-DOCS-21 AC8), while the erased document still takes none. The store's own tests
 * (`packages/db/src/store.test.ts`) add the concurrent writes and the isolation level.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import type { Evidence } from '@sovitech/domain';
import { eraseDocument, insertCandidate, newId, recordAssetAppearance, registerDocument, storeDocumentText, withRequest, type RequestScope } from '@sovitech/db';
import {
  createTestAccount,
  createTestDocumentValue,
  createTestProject,
  startTestDatabase,
  TEST_AREA_DEFINITION,
  TEST_AREA_FIELD,
  type TestDatabase,
} from '@sovitech/db/testing';

const LATE = 'TEST late text of the erased document';

let database: TestDatabase;
let ownerId: string;
let projectId: string;
let ownerScope: RequestScope;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: 'G13-8 owner', kind: 'person', roles: ['owner'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  ownerScope = { userId: ownerId, projectId };
}, 240_000);

afterAll(async () => {
  await database.stop();
});

/** Every text of the content hash still in clear: extracted text, and excerpts not "[erased]". */
async function clearTextOf(contentHash: string): Promise<unknown[]> {
  return database.asAdministrator(
    `SELECT 'document_texts' AS at, text FROM sovitech.document_texts WHERE project_id = $1 AND content_hash = $2
     UNION ALL
     SELECT 'evidence_excerpts', text FROM sovitech.evidence_excerpts WHERE project_id = $1 AND content_hash = $2 AND text <> '[erased]'`,
    [projectId, contentHash],
  );
}

function citing(documentId: string, contentHash: string, excerpt: string): Evidence {
  return { documentId, contentHash, locator: { page: 2 }, excerpt, check: 'text_match' };
}

test('F-AUDIT-04 · G13-8: after the owner erases a document, its extracted text, a value citing it and an asset appearance citing it are refused, and none of its text is stored', async () => {
  const value = await createTestDocumentValue(database, { projectId, label: 'G13-8 schedule' });
  const jobScope: RequestScope = { userId: value.serviceId, projectId };
  await withRequest(database.app, ownerScope, (request) => eraseDocument(request, { documentId: value.documentId, role: 'owner', reason: 'TEST owner request' }));
  expect(await clearTextOf(value.contentHash)).toEqual([]);
  const refused = { refusal: 'document_erased', sqlState: 'SVE11' };

  // E1: the extraction job, still running or retried, stores the text again.
  await expect(
    withRequest(database.app, jobScope, (request) => storeDocumentText(request, { contentHash: value.contentHash, part: 'page:2', text: LATE, createdBy: value.serviceId })),
  ).rejects.toMatchObject(refused);
  // E2: a new document value whose evidence cites the erased document, with its excerpt in clear.
  await expect(
    withRequest(database.app, jobScope, (request) =>
      insertCandidate(
        request,
        {
          id: newId(),
          subjectId: value.subjectId,
          fieldKey: TEST_AREA_FIELD,
          quantity: { value: 9081, unit: 'm2', qualifier: 'gross_total' },
          source: 'document',
          evidence: [citing(value.documentId, value.contentHash, LATE)],
          createdBy: value.serviceId,
        },
        TEST_AREA_DEFINITION,
      ),
    ),
  ).rejects.toMatchObject(refused);
  // E3: an asset appearance citing it.
  await expect(
    withRequest(database.app, jobScope, (request) =>
      recordAssetAppearance(request, { tagAsWritten: 'TEST-VCV-81', evidence: [citing(value.documentId, value.contentHash, LATE)], createdBy: value.serviceId }),
    ),
  ).rejects.toMatchObject(refused);

  // E4: no text of the erased document is stored anywhere.
  expect(await clearTextOf(value.contentHash)).toEqual([]);
  const [appearances] = await database.asAdministrator<{ count: number }>(
    `SELECT count(*)::int AS count FROM sovitech.evidence_locators WHERE project_id = $1 AND document_id = $2 AND appearance_id IS NOT NULL`,
    [projectId, value.documentId],
  );
  expect(appearances?.count).toBe(0);
});

test('F-AUDIT-04 · G13-8 control: the same bytes uploaded again as a new document take text and evidence; the erased one still takes none (US-DOCS-21 AC8)', async () => {
  const value = await createTestDocumentValue(database, { projectId, label: 'G13-8 upload again' });
  const jobScope: RequestScope = { userId: value.serviceId, projectId };
  await withRequest(database.app, ownerScope, (request) => eraseDocument(request, { documentId: value.documentId, role: 'owner' }));
  const again = await withRequest(database.app, ownerScope, (request) =>
    registerDocument(request, {
      contentHash: value.contentHash,
      kind: 'architectural',
      stage: 'technical_design',
      analysis: { status: 'analysed', coverage: 'TEST page 1 of 1' },
      createdBy: ownerId,
    }),
  );
  const text = 'TEST text of the new upload';
  await withRequest(database.app, jobScope, (request) => storeDocumentText(request, { contentHash: value.contentHash, part: 'page:1', text, createdBy: value.serviceId }));
  const written = await withRequest(database.app, jobScope, (request) =>
    insertCandidate(
      request,
      {
        id: newId(),
        subjectId: value.subjectId,
        fieldKey: TEST_AREA_FIELD,
        quantity: { value: 9082, unit: 'm2', qualifier: 'gross_total' },
        source: 'document',
        evidence: [citing(again.id, value.contentHash, text)],
        createdBy: value.serviceId,
      },
      TEST_AREA_DEFINITION,
    ),
  );
  expect(written.outcome).toBe('stored');
  await expect(
    withRequest(database.app, jobScope, (request) =>
      recordAssetAppearance(request, { tagAsWritten: 'TEST-VCV-82', evidence: [citing(value.documentId, value.contentHash, text)], createdBy: value.serviceId }),
    ),
  ).rejects.toMatchObject({ refusal: 'document_erased' });
});
