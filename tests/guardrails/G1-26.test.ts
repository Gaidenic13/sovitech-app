/**
 * G1-26 (new in phase 4, from a near miss found while planning it; rule 1, "Otherwise the field stays Unknown. It is
 * never filled with a zero, a blank, a typical value, a value from another project, or a guess"; 2.3: the record's
 * `kind` has no unknown value; 2.8, Unknown).
 * Situation: a document stored with no classification of its kind (the upload's stored default).
 * Expected: its category reads Unknown.
 *
 * The near miss: the upload stores `kind: 'other'` because 2.3's kind offers no unknown, and no classifier runs in
 * this build (US-DOCS-08), so a Documents page mapping kinds to chips (ADR 0045 decision 6) would have shown "Other"
 * as if it were read from the file. Documents (packages/view-model/src/workspace/documents.ts) serves the category as
 * `document:<id>.kind`, Unknown with its badge, and no chip (`category: null`), whatever the stored kind. The served
 * view over a TEST database is tests/api/workspace-routes.test.ts ("… G1-26 · …"). Proposal
 * P-4-DOCUMENT-KIND-UNKNOWN asks the approver to add `unknown` to 2.3's kind.
 */
import { expect, test } from 'vitest';
import { DOCUMENT_KINDS } from '@sovitech/domain';
import { documentsView } from '@sovitech/view-model/server';
import { testDocument } from './_support/builders';
import { uuid } from './_support/view-model';
import { displayOf, testWorkspace } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);

test('US-DOCS-12 · R-016 · ADR 0045 decision 6 · G1-26: a document stored with the upload\'s default kind reads Unknown in its Category cell, with no chip', () => {
  // The stored default is `other`; the same holds for any kind the store holds while nothing classified it.
  for (const kind of DOCUMENT_KINDS) {
    const document = { ...testDocument(uuid(10), PROJECT, 'unknown', { kind }), contentHash: `sha256:${'f'.repeat(64)}` };
    const project = testWorkspace({ projectId: PROJECT, buildingId: BUILDING, documents: [document], fileNames: { [document.id]: 'TEST plan.pdf' } });
    const { view, displayObjects } = documentsView(project, [{ documentId: document.id, format: 'pdf', addedAt: '2026-10-02T09:00:00.000Z', downloadable: true, declaredRevisionOf: null, kindSource: 'stored_default' }]);
    const [row] = view.rows;
    expect(row?.category, kind).toBeNull();
    const category = displayOf(displayObjects, row?.categoryValue ?? '');
    expect(category.valueId).toBe(`document:${document.id}.kind`);
    expect(category.text, kind).toBe('Unknown');
    expect(category.badge?.id, kind).toBe('unknown');
    expect(category.missing, kind).toBe('unknown');
    expect(JSON.stringify(displayObjects), kind).not.toMatch(/"text":"(Other|Architectural|MEP|Operational|Regulatory)"/u);
  }
});
