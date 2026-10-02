import { describe, expect, it } from 'vitest';
import type { DocumentRow } from '@sovitech/view-model/browser';
import { documentIdOfValue, revisionCandidates } from './revisions';

/** TEST document ids, A, B, C, D and one no row lists. */
const A = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d0a01';
const B = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d0b01';
const C = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d0c01';
const D = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d0d01';
const GONE = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d0e01';
const NAMES: Readonly<Record<string, string>> = { [A]: 'A', [B]: 'B', [C]: 'C', [D]: 'D' };

/** A served row; `revisionOf` names the document the derive applies as its predecessor, as the API serves it. */
function row(documentId: string, revisionOf: string | null = null): DocumentRow {
  return {
    documentId,
    fileName: `document:${documentId}.fileName`,
    format: 'pdf',
    category: null,
    categoryValue: `document:${documentId}.kind`,
    revision: `document:${documentId}.revision`,
    stage: `document:${documentId}.stage`,
    addedAt: '2026-10-02T09:00:00.000Z',
    status: { kind: 'progress' },
    revisionOf: revisionOf === null ? null : `document:${revisionOf}.fileName`,
    downloadable: true,
  };
}

/** The names of the documents the panel offers on `on`. */
function offered(on: string, rows: readonly DocumentRow[]): string[] {
  const current = rows.find((each) => each.documentId === on);
  if (current === undefined) throw new Error('no such TEST row');
  return revisionCandidates(current, rows).map((each) => NAMES[each.documentId] ?? each.documentId);
}

describe('UD-43 · US-DOCS-20 AC2 · 2.3 "Revisions are declared, never guessed": the documents the revision panel offers', () => {
  it('NP-2 · ADR 0016 decision 17 · G4-44: B was declared a revision of A by mistake; on A the panel offers B, since on one pair the later declaration replaces the earlier one (a correction, not a cycle)', () => {
    const rows = [row(A), row(B, A)];
    expect(offered(A, rows)).toEqual(['B']);
    // Declaring B a revision of A again closes nothing either.
    expect(offered(B, rows)).toEqual(['A']);
  });

  it('NP-2 · A-5 · G4-44: a document whose chain reaches this one through another document is not offered, since declaring it would close a cycle the derive ignores with every declaration on it; its direct revision is offered', () => {
    // A <- B <- C: B declared a revision of A, C a revision of B; D stands alone.
    const rows = [row(A), row(B, A), row(C, B), row(D)];
    // On A: B is A's direct revision (a correction); C reaches A through B (A -> C -> B -> A would be a cycle).
    expect(offered(A, rows)).toEqual(['B', 'D']);
    // On B: A is its predecessor (declaring it again closes none); C is B's direct revision (a correction).
    expect(offered(B, rows)).toEqual(['A', 'C', 'D']);
    // On C: nothing reaches C.
    expect(offered(C, rows)).toEqual(['A', 'B', 'D']);
    expect(offered(D, rows)).toEqual(['A', 'B', 'C']);
  });

  it('A-5: a chain that leaves the list stops there, and the row itself is never offered', () => {
    const rows = [row(A), row(B, GONE), row(C, B)];
    expect(offered(A, rows)).toEqual(['B', 'C']);
    expect(offered(C, rows)).toEqual(['A', 'B']);
    expect(documentIdOfValue(`document:${A}.fileName`)).toBe(A);
    expect(documentIdOfValue(null)).toBeUndefined();
    expect(documentIdOfValue('project:x.name')).toBeUndefined();
  });
});
