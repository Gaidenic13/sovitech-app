/**
 * The documents the revision panel offers (UD-43; US-DOCS-20 AC2; 2.3 "Revisions are declared, never guessed";
 * findings A-5 and NP-2). Pure functions over the contract's rows: the served `revisionOf` is the derive's own reading
 * of the declarations (`DocumentStatuses.predecessor`, packages/domain/src/documents.ts; ADR 0044), never a raw
 * declaration, so the panel offers exactly what the derive will apply (ADR 0016 decision 17).
 */
import type { DocumentRow } from '@sovitech/view-model/browser';

/** The document id a served `revisionOf` names (`document:<id>.<field>`), or undefined. */
export function documentIdOfValue(valueId: string | null): string | undefined {
  if (valueId === null) return undefined;
  return /^document:([^.]+)\./u.exec(valueId)?.[1];
}

/**
 * The documents `row` may be declared a revision of: every other listed document except each whose served revision
 * chain (its `revisionOf`, then that document's, and so on) reaches `row` through another document, since declaring
 * `row` its revision would close a cycle, which the derive ignores with every declaration on it (A-5; G4-44's second
 * project). A document whose own `revisionOf` is `row` stays offered: on one pair of documents the later declaration
 * replaces the earlier one, so declaring `row` a revision of it corrects a direction declared by mistake, as the derive
 * applies it (NP-2; ADR 0016 decision 17; G4-44's first project). A chain that leaves the list, or loops without
 * reaching `row`, stops there.
 */
export function revisionCandidates(row: DocumentRow, rows: readonly DocumentRow[]): DocumentRow[] {
  const byId = new Map(rows.map((each) => [each.documentId, each]));
  const closesCycle = (start: DocumentRow): boolean => {
    const first = documentIdOfValue(start.revisionOf);
    // The reverse of a direct pair: the later declaration on the pair stands, a correction, never a cycle.
    if (first === row.documentId) return false;
    const seen = new Set<string>();
    let next = first;
    while (next !== undefined && !seen.has(next)) {
      if (next === row.documentId) return true;
      seen.add(next);
      next = documentIdOfValue(byId.get(next)?.revisionOf ?? null);
    }
    return false;
  };
  return rows.filter((other) => other.documentId !== row.documentId && !closesCycle(other));
}
