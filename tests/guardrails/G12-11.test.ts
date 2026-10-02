/**
 * G12-11 (new in phase 4 part B; rule 12, "Say what the app could not do"; rule 1, a value exists only if it comes
 * from the project data: a page's statement about the project is true of what is stored; finding A-10).
 * Situation: the owner uploaded documents and then deleted every one of them.
 * Expected: Equipment and Zones never say that no documents were uploaded.
 *
 * The register state (packages/view-model/src/workspace/shared.ts `registerState`) reads `no_documents` ("No documents
 * were uploaded, so no equipment was read from them.") only for a project that never had a document, removed ones
 * counting; otherwise, with nothing listed and nothing being read, `none_read` ("No equipment has come from your
 * documents yet."). No new wording. Before the fix, deleting every document turned both pages to `no_documents`. Beside
 * the case: a project that never had a document still reads `no_documents`. Every value is TEST data.
 */
import { expect, test } from 'vitest';
import { equipmentView, zonesView } from '@sovitech/view-model/server';
import { testDocument, testTime } from './_support/builders';
import { uuid } from './_support/view-model';
import { testWorkspace } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const documents = [10, 11].map((n) => ({ ...testDocument(uuid(n), PROJECT, 'unknown'), contentHash: `sha256:${n.toString(16).padStart(64, '0')}` }));

test('A-10 · rule 12 · G12-11: after every document is deleted, Equipment and Zones never say no documents were uploaded', () => {
  const project = testWorkspace({
    projectId: PROJECT,
    buildingId: BUILDING,
    documents,
    documentEvents: documents.map((document, index) => ({ documentId: document.id, type: 'withdrawn' as const, by: 'test-owner', role: 'owner' as const, at: testTime(index + 1), reason: 'owner_deleted_document' })),
  });
  expect(project.activeDocuments).toEqual([]);
  expect(equipmentView(project, {}).view.state).toBe('none_read');
  expect(zonesView(project, {}).view.state).toBe('none_read');
});

test('rule 12 · G12-11 (beside the case): a project that never had a document reads no_documents', () => {
  const project = testWorkspace({ projectId: PROJECT, buildingId: BUILDING });
  expect(equipmentView(project, {}).view.state).toBe('no_documents');
  expect(zonesView(project, {}).view.state).toBe('no_documents');
});
