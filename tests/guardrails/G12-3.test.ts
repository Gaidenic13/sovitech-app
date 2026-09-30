/**
 * G12-3 (docs/guardrails.md section 7; rule 12, "Partial processing is shown with its
 * coverage"; 2.8, "File partly analysed"; F-INGEST-05; PRD R-013, R-015).
 * Situation: 3 of 40 pages fail OCR.
 * Expected: "Partly analysed (37 of 40 pages)". Fields sourced only from failed pages stay
 * unknown.
 *
 * Reading of the situation, recorded in the build log (prompt 3 section 10, phase 2): this
 * build has no OCR (prompt 3 5.2), so the synthetic specification
 * fixtures/pdf/caiet-de-sarcini.pdf has 3 pages with no text layer (12, 25, 33), which give
 * the same expected result. The case text is unchanged.
 *
 * On a TEST database, the owner uploads the fixture; the extractor (scripted from its
 * ground truth) reads the 37 pages with a text layer and records the 3 others as unread.
 * The row reads "Partly analysed (37 of 40 pages)". A value found only on an unread page
 * (page 12's reservoir volume, fixtures/pdf/ground-truth/caiet-de-sarcini.json) cannot be
 * stored: the one ingestion path finds no text at that page (rule 1, "The locator
 * exists"), rejects it and logs it, and the field stays unknown.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import { readDocumentTexts, readProjectDocuments, withRequest } from '@sovitech/db';
import { NO_EVENTS, derive, type FieldDefinition } from '@sovitech/domain';
import { productionRegistry, registryLookups, unitByCode } from '@sovitech/registry';
import { ingestProposals } from '../../apps/api/src/ingestion/proposals';
import { ScriptedRunner, documentList, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type Auth, type TestApi } from './_support/api';
import { pdfOutput } from './_support/outputs';

const lookups = registryLookups(productionRegistry);

/** A TEST field for a reservoir's volume: the production registry holds no asset fields yet. */
const VOLUME: FieldDefinition = {
  key: 'test.asset.volume',
  label: 'TEST reservoir volume',
  subject: 'asset',
  kind: 'quantity',
  unit: 'm3',
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'engineer',
};

let api: TestApi;
let ownerId: string;
let projectId: string;
let auth: Auth;
let documentId: string;

beforeAll(async () => {
  api = await startTestApi();
  ({ ownerId, projectId } = await ownerWithProject(api, 'G12-3'));
  auth = await signIn(api, ownerId);
  documentId = (await upload(api, auth, projectId, 'caiet-de-sarcini.pdf', fixtureBytes('fixtures/pdf/caiet-de-sarcini.pdf'))).body.documentId ?? '';
  const runner = new ScriptedRunner((_job, job) => pdfOutput(job, 'fixtures/pdf/ground-truth/caiet-de-sarcini.json'));
  await testWorker(api, runner).drain();
}, 240_000);

afterAll(async () => {
  await api.stop();
});

test('F-INGEST-05 · R-013 · G12-3: 3 of 40 pages cannot be read: "Partly analysed (37 of 40 pages)", and a field sourced only from those pages stays unknown', async () => {
  expect(await documentList(api, auth, projectId)).toMatchObject([
    {
      documentId,
      statusLine: { kind: 'status_line', statusLineId: 'partly_analysed', text: 'Partly analysed (37 of 40 pages)', slots: { analysed: '37', total: '40' } },
    },
  ]);

  const document = (await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readProjectDocuments(request))).documents[0];
  const contentHash = document?.contentHash ?? '';
  const pages = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readDocumentTexts(request, contentHash, 'page:'));
  expect(pages).toHaveLength(37);
  expect(pages.map((part) => part.part)).not.toEqual(expect.arrayContaining(['page:12', 'page:25', 'page:33']));

  // The value only an unread page holds cannot be stored: no text at that page.
  const outcomes = await withRequest(api.database.app, { userId: api.extractionAccountId, projectId }, async (request) => {
    return ingestProposals(request, {
      projectId,
      serviceId: api.extractionAccountId,
      field: (key) => (key === VOLUME.key ? { ...VOLUME } : lookups.field(key)),
      proposals: [
        {
          proposal: {
            subjectId: documentId,
            fieldKey: VOLUME.key,
            quantity: { value: 12, unit: 'm3' },
            source: 'document',
            evidence: [{ documentId, contentHash, locator: { page: 12 }, excerpt: 'Rezervor RZ-01: volum util 12 mc' }],
          },
        },
      ],
    });
  });
  expect(outcomes).toEqual([{ fieldKey: VOLUME.key, outcome: 'rejected', code: 'locator_exists' }]);
  const events = await api.database.asAdministrator<{ type: string; reason: string }>(
    'SELECT type, reason FROM sovitech.guardrail_events WHERE project_id = $1 AND field_key = $2',
    [projectId, VOLUME.key],
  );
  expect(events).toEqual([{ type: 'evidence_not_found', reason: 'locator_exists' }]);
  const candidates = await api.database.asAdministrator('SELECT id FROM sovitech.candidates WHERE project_id = $1 AND field_key = $2', [projectId, VOLUME.key]);
  expect(candidates).toEqual([]);
  expect(
    derive(VOLUME, [], NO_EVENTS, { subjectId: documentId, document: () => document, inputState: () => undefined, datasetApproved: () => false, unit: unitByCode }).state,
  ).toBe('unknown');
});
