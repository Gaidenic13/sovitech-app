/**
 * G12-4 (docs/guardrails.md section 7; rule 12, "Code records coverage": "A truncated
 * document can never support a 'none found' statement"; F-INGEST-05; PRD R-014, R-022,
 * R-029).
 * Situation: a document is truncated before analysis.
 * Expected: no "not found" claim covers the unread pages.
 *
 * On a TEST database, the owner uploads the synthetic specification
 * (fixtures/pdf/caiet-de-sarcini.pdf, 40 pages). The extractor (scripted from its ground
 * truth) reads it only up to page 20 and records pages 21 to 40 as `truncated` (and page 12,
 * which has no text layer, as unread). The row reads "Partly analysed (19 of 40 pages)",
 * and the coverage a "Not found in the analysed documents (<coverage>)" statement may cite
 * holds pages 1-11 and 13-20 of this document and never a page it did not read.
 */
import fc from 'fast-check';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { withRequest } from '@sovitech/db';
import { covers, readAiSearches, readCoverage, searchedCoverage } from '../../apps/api/src/documents/coverage';
import { projectDocuments } from '../../apps/api/src/documents/service';
import { ScriptedRunner, documentList, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type Auth, type TestApi } from './_support/api';
import { pdfOutput } from './_support/outputs';

let api: TestApi;
let ownerId: string;
let projectId: string;
let auth: Auth;
let documentId: string;

beforeAll(async () => {
  api = await startTestApi();
  ({ ownerId, projectId } = await ownerWithProject(api, 'G12-4'));
  auth = await signIn(api, ownerId);
  documentId = (await upload(api, auth, projectId, 'caiet-de-sarcini.pdf', fixtureBytes('fixtures/pdf/caiet-de-sarcini.pdf'))).body.documentId ?? '';
  const runner = new ScriptedRunner((_job, job) => pdfOutput(job, 'fixtures/pdf/ground-truth/caiet-de-sarcini.json', { truncateAfter: 20 }));
  await testWorker(api, runner).drain();
}, 240_000);

afterAll(async () => {
  await api.stop();
});

test('F-INGEST-05 · R-029 · G12-4: a document truncated before analysis: no "not found" claim covers its unread pages', async () => {
  expect(await documentList(api, auth, projectId)).toMatchObject([
    { documentId, statusLine: { statusLineId: 'partly_analysed', text: 'Partly analysed (19 of 40 pages)' } },
  ]);
  // What any "not found" statement may cite at most: the pages the extractor read (readCoverage,
  // the upper bound). What a statement about a field may cite: only what a completed AI run searched
  // for it there (searchedCoverage); with no AI run, nothing.
  const { searched, searchedForField } = await withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => {
    const { documents, statuses } = await projectDocuments(request);
    const search = await readAiSearches(request, documents);
    return {
      searched: readCoverage(documents, statuses.status),
      searchedForField: searchedCoverage(documents, statuses.status, { fieldKey: 'building.grossFloorArea', ...search }),
    };
  });
  expect(searched).toEqual([
    { documentId, unit: 'pages', ranges: [{ first: 1, last: 11 }, { first: 13, last: 20 }], total: 40 },
  ]);
  expect(searchedForField).toEqual([]);
  // Property: a page the extractor did not read is never covered; a page it read is.
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 40 }), (page) => {
      const read = page <= 20 && page !== 12;
      expect(covers(searched, documentId, page)).toBe(read);
    }),
  );
});
