/**
 * G3-21 (new in phase 4 part B; rule 3: "Anything the AI derives rather than reads is phrased as a possibility ('Possible
 * AHU detected')"; rule 2: "Every value has a source and a verification level (2.1), and the owner sees both (2.8)";
 * 2.3, "Deleting a document": "Withdrawn values are never shown as current"; 2.3, "Old-only values stay visible, marked
 * 'from a superseded revision'"; 2.8's badges and status lines "From a superseded revision" and "Source document
 * removed"; PRD R-068: each field's history; finding V-3, its server half).
 * Situation: an asset's field holds an AI-inferred value of medium confidence, a value whose only document was deleted,
 * a value of a revision that a declared newer one superseded, and a value an engineer rejected; the owner opens the
 * asset's record.
 * Expected (as indexed in section 7): each history entry shows its own badge and source line: the AI-inferred one
 * Possible, the withdrawn one "Source document removed", the superseded one "From a superseded revision". No entry that
 * is not current reads as current.
 *
 * Beside the case: the rejected entry, for which 2.8 has no wording, is left out of the history for now (triage proposal
 * P-4B-HISTORY-ENTRY-WORDING would give it a line).
 *
 * The asset record (packages/view-model/src/workspace/equipment.ts `assetView`) resolves each entry with the one
 * resolver (`resolveCandidateEntry`): its own 2.8 badge and source line, and a 2.8 status line for a value that is no
 * longer current. Before the fix every entry was a bare text with no badge, no source and no status. Every value is
 * TEST data; the asset field is a TEST field (no asset field is in the production registry, ADR 0045 decision 1).
 */
import { expect, test } from 'vitest';
import { SYSTEMS } from '@sovitech/registry';
import { assetView } from '@sovitech/view-model/server';
import { declaredRevision, documentReading, testDocument } from './_support/builders';
import { registryField, uuid } from './_support/view-model';
import { displayOf, testWorkspace } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const ASSET = uuid(3);
const system = registryField('asset.system', { kind: 'enum', subject: 'asset', options: SYSTEMS.map((entry) => entry.id), confirmBy: 'engineer' });
const doc = (n: number, extra: Parameters<typeof testDocument>[3] = {}) => ({ ...testDocument(uuid(n), PROJECT, 'unknown', extra), contentHash: `sha256:${n.toString(16).padStart(64, '0')}` });
const list = doc(10);
const gone = doc(11);
const older = doc(12);
const newer = doc(13, { supersedes: older.id });

test('V-3 · R-068 · rule 2 · rule 3 · 2.3 · G3-21: an asset\'s history shows each value with its own badge and source line, and no value that is not current reads as current', () => {
  const removed = documentReading({ id: uuid(20), subjectId: ASSET, field: system, document: gone, value: { choice: 'lighting' }, minute: 1 });
  const old = documentReading({ id: uuid(21), subjectId: ASSET, field: system, document: older, value: { choice: 'hvac' }, minute: 2 });
  const current = documentReading({ id: uuid(22), subjectId: ASSET, field: system, document: newer, value: { choice: 'hvac' }, minute: 3 });
  const inferred = documentReading({ id: uuid(23), subjectId: ASSET, field: system, document: list, value: { choice: 'hvac' }, minute: 4, source: 'ai_inference', confidence: 'medium' });
  const rejected = documentReading({ id: uuid(24), subjectId: ASSET, field: system, document: list, value: { choice: 'fire_safety' }, minute: 5 });
  const project = testWorkspace({
    projectId: PROJECT,
    buildingId: BUILDING,
    documents: [list, gone, older, newer],
    documentEvents: [declaredRevision(newer, 6), { documentId: gone.id, type: 'withdrawn', by: 'test-owner', role: 'owner', at: '2026-09-25T09:07:00.000Z', reason: 'owner_deleted_document' }],
    fileNames: { [list.id]: 'TEST lista.pdf', [older.id]: 'TEST schema rev A.pdf', [newer.id]: 'TEST schema rev B.pdf' },
    identities: [{ assetId: ASSET, projectId: PROJECT, normalisedTag: 'TEST-CTA-01' }],
    appearances: [{ id: uuid(30), projectId: PROJECT, tagAsWritten: 'TEST-CTA-01', evidence: [{ documentId: list.id, contentHash: list.contentHash, locator: { page: 1 }, excerpt: 'TEST CTA-01', check: 'text_match' }] }],
    fields: [
      {
        field: system,
        subjectId: ASSET,
        subjectKind: 'asset',
        candidates: [removed, old, current, inferred, rejected],
        candidateEvents: [{ candidateId: rejected.id, type: 'rejected', by: 'test-engineer', role: 'sovitech_engineer', at: '2026-09-25T09:08:00.000Z', reason: 'TEST not this system' }],
      },
    ],
  });
  const record = assetView(project, ASSET);
  if (record === undefined) throw new Error('the asset is listed');
  const [history] = record.view.history;
  expect(history?.field).toBe(`asset:${ASSET}.system`);
  const entries = (history?.entries ?? []).map((entry) => displayOf(record.displayObjects, entry.display));
  // The rejected value is not listed: 2.8 has no wording for it.
  expect(entries.map((entry) => entry.valueId)).toEqual([1, 2, 3, 4].map((n) => `asset:${ASSET}.system.history${String(n)}`));
  const [withdrawn, superseded, fromDocument, possible] = entries;

  // The AI-inferred value: Possible, with its source line.
  expect(possible?.badge?.id).toBe('possible');
  expect(possible?.sourceLine?.text).toBe('Inferred from TEST lista.pdf, page 1');
  expect(possible?.lines ?? []).toEqual([]);
  // The value whose only document was deleted: "Source document removed".
  expect((withdrawn?.lines ?? []).map((line) => line.text)).toEqual(['Source document removed']);
  expect(withdrawn?.lines?.[0]?.kind).toBe('status_line');
  // The value of the superseded revision: "From a superseded revision".
  expect((superseded?.lines ?? []).map((line) => line.text)).toEqual(['From a superseded revision']);
  // The current value read from the newer revision: its badge and source line, no status line.
  expect(fromDocument?.sourceLine?.text).toBe('Found in TEST schema rev B.pdf, page 1');
  expect(fromDocument?.lines ?? []).toEqual([]);
  // Every entry carries one 2.8 badge and a source line; none carries an action.
  for (const entry of entries) {
    expect(entry.badge, entry.valueId).toBeDefined();
    expect(entry.sourceLine, entry.valueId).toBeDefined();
    expect(entry.actions, entry.valueId).toBeUndefined();
  }
  expect(record.displayObjects.some((display) => display.text === 'Fire Safety' || display.text === 'fire_safety')).toBe(false);
});
