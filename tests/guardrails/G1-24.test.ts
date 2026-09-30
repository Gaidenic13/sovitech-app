/**
 * G1-24 (docs/guardrails.md section 7; rule 1, "Enforced by": "Before a candidate is stored, code
 * checks five things ... The locator exists"; 2.4, whose `Evidence.locator` holds a page, a sheet, a
 * cell and a box only; G1-13 is the verifier's side). Phase 2 fix round, the gated IFC value path:
 * its store keeps IFC entries apart from 2.4's, and the 2.4 write must never take one.
 * Situation: a candidate reaches the store's 2.4 write (`insertCandidate`) with an evidence entry that
 * carries an IFC locator (a GlobalId, STEP ids and a path), and no page, sheet, cell or box.
 * Expected: refused. Nothing is stored.
 *
 * On a TEST database, the project's TEST extraction service account writes, through the data-access
 * layer, a TEST document value and an asset appearance citing a TEST model with an IFC entry; each is
 * refused and no row is left. The control: the same value with a page locator is stored.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import type { IfcEvidence } from '@sovitech/domain';
import { createSubject, insertCandidate, newId, recordAssetAppearance, registerDocument, storeDocumentText, withRequest } from '@sovitech/db';
import { createTestAccount, createTestProject, createTestService, startTestDatabase, testContentHash, TEST_AREA_DEFINITION, type TestDatabase } from '@sovitech/db/testing';

const STATEMENT = "#22=IFCPROPERTYSINGLEVALUE('TestArea',$,IFCAREAMEASURE(7.5),$);";

let database: TestDatabase;
let projectId: string;
let serviceId: string;

beforeAll(async () => {
  database = await startTestDatabase();
  const ownerId = await createTestAccount(database, { label: 'G1-24 owner', kind: 'person', roles: ['owner'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  serviceId = await createTestService(database, { projectId, label: 'G1-24' });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

/** A TEST document of the project, with the statement stored as its text. */
async function testModel(label: string): Promise<{ readonly documentId: string; readonly contentHash: string }> {
  const contentHash = testContentHash(`G1-24 ${label}`);
  return withRequest(database.app, { userId: serviceId, projectId }, async (request) => {
    const document = await registerDocument(request, { contentHash, kind: 'other', stage: 'unknown', analysis: { status: 'analysed', coverage: 'TEST page 1 of 1' }, createdBy: serviceId });
    await storeDocumentText(request, { contentHash, part: 'page:1', text: STATEMENT, createdBy: serviceId });
    return { documentId: document.id, contentHash };
  });
}

function ifcEntry(documentId: string, contentHash: string): IfcEvidence {
  return {
    documentId,
    contentHash,
    locator: {},
    ifc: { schema: 'IFC4', globalId: 'TESTGID00000000000G124', stepIds: [22], path: { kind: 'property', through: 'occurrence', propertySet: 'TEST_Pset', property: 'TestArea' } },
    excerpt: STATEMENT,
    check: 'text_match',
  };
}

test('F-EXTRACT-04 · F-IFC-04 · G1-24: a candidate or an asset appearance whose evidence carries an IFC locator is refused by the 2.4 write, and nothing is stored', async () => {
  const { documentId, contentHash } = await testModel('ifc');
  const candidateId = newId();
  await expect(
    withRequest(database.app, { userId: serviceId, projectId }, async (request) => {
      const subject = await createSubject(request, { kind: 'building', createdBy: serviceId });
      return insertCandidate(
        request,
        { id: candidateId, subjectId: subject.id, fieldKey: TEST_AREA_DEFINITION.key, quantity: { value: 7.5, unit: 'm2' }, source: 'document', evidence: [ifcEntry(documentId, contentHash)], createdBy: serviceId },
        TEST_AREA_DEFINITION,
      );
    }),
  ).rejects.toThrow(/insertCandidate refuses it/u);
  await expect(
    withRequest(database.app, { userId: serviceId, projectId }, (request) => recordAssetAppearance(request, { tagAsWritten: 'TEST-G124', evidence: [ifcEntry(documentId, contentHash)], createdBy: serviceId })),
  ).rejects.toThrow(/recordAssetAppearance refuses it/u);
  expect(await database.asAdministrator('SELECT id FROM sovitech.candidates WHERE project_id = $1', [projectId])).toEqual([]);
  expect(await database.asAdministrator('SELECT id FROM sovitech.asset_appearances WHERE project_id = $1', [projectId])).toEqual([]);
  expect(await database.asAdministrator('SELECT id FROM sovitech.evidence_locators WHERE project_id = $1', [projectId])).toEqual([]);
});

test('F-EXTRACT-04 · G1-24 (control): the same value cited at a page of the document is stored', async () => {
  const { documentId, contentHash } = await testModel('page');
  const written = await withRequest(database.app, { userId: serviceId, projectId }, async (request) => {
    const subject = await createSubject(request, { kind: 'building', createdBy: serviceId });
    return insertCandidate(
      request,
      {
        id: newId(),
        subjectId: subject.id,
        fieldKey: TEST_AREA_DEFINITION.key,
        quantity: { value: 7.5, unit: 'm2' },
        source: 'document',
        evidence: [{ documentId, contentHash, locator: { page: 1 }, excerpt: STATEMENT, check: 'text_match' }],
        createdBy: serviceId,
      },
      TEST_AREA_DEFINITION,
    );
  });
  expect(written.outcome).toBe('stored');
});
