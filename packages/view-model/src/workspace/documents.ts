/**
 * Documents (DB-15; PRD R-016 to R-019, R-022, R-028; US-DOCS-12 to US-DOCS-21; UD-21, UD-22, UD-42, UD-43; docs/adr/
 * 0045 decisions 6 to 8).
 *
 * - Each row names its file as uploaded through the API's `servedFileName` (bidirectional and format controls
 *   dropped, G2-14), its stage and revision as phase 3 resolves them (Unknown unless recorded; no classifier reads a
 *   title block, US-DOCS-08), its status line or coverage as step 2 shows it (2.8; G12-1, G12-5: a model is "Not
 *   analysed: IFC model stored, not analysed"), the date it was added (record metadata), and the document it was
 *   declared a revision of by a person (2.3: "Revisions are declared, never guessed"; R-028).
 * - The category (`document:<id>.kind`) reads Unknown while no classifier set the kind: the upload stores the record's
 *   default `other` because 2.3's kind has no unknown, and showing "Other" would present a stored default as a
 *   reading (rule 1: never "a guess"; G1-26; proposal P-4-DOCUMENT-KIND-UNKNOWN). Such a row has no category chip.
 * - No size, uploader, description, preview, model-check, schema or IDS line on any row (R-017 to R-019; ifc-input
 *   6.2.14; P-4-DOCUMENT-PREVIEW).
 * - The delete effect (UD-42; 2.3 "Deleting a document"; G4-39, G4-41, G4-42): what Delete does, derived, never
 *   guessed: the caller derives the project with the document removed (the one derive function, 2.4, and the asset
 *   register, 2.5, over the stored candidates and events with the document's removal added, so its revision
 *   declarations no longer supersede an older value), and the count is (i) each field with a value now (known or in
 *   conflict) that has none after (unknown, or skipped: "The field stays unknown", 2.4), and (ii) each asset counted now
 *   and not after: its tag, a value read only from this document (2.5 `tag: FieldRef`), returns to unknown with it. A
 *   value another active document or the owner holds is kept (US-DOCS-21 AC4); a declared newer revision's deletion
 *   brings the older value back, so it counts nothing (G4-42).
 */
import type { DocumentRecord, FieldState } from '@sovitech/domain';
import type { DeleteEffectResponse, DocumentRow, DocumentsResponse, ValueId } from '../browser/contract';
import { resolveDocument } from '../resolver';
import { deleteEffectDisplay } from './copy';
import type { Built, WorkspaceProject } from './inputs';
import { stillReading } from './frame';
import { DisplaySet, FORMAT, unknownDisplay, valueIdFor } from './shared';

/** What the store holds about a document besides its record (the API reads it): its format, when it was added, whether its original is stored. */
export interface DocumentFacts {
  readonly documentId: string;
  readonly format: DocumentRow['format'];
  /** When the store registered it (the database's clock): record metadata shown as a date. */
  readonly addedAt: string;
  /** The stored original exists, so Download can serve it after the project access check (US-DOCS-14 AC5). */
  readonly downloadable: boolean;
  /** The document a person declared this one a revision of (a `declared_revision_of` event, never code's proposal), if any. */
  readonly declaredRevisionOf: string | null;
  /**
   * How the stored kind was set: `stored_default` is the upload's `other`, set because 2.3's kind has no unknown
   * (every document of this build: no classifier runs, US-DOCS-08). Nothing else is stored yet.
   */
  readonly kindSource: 'stored_default';
}

/** The category's value id (`document:<id>.kind`). */
export function categoryValueId(documentId: string): ValueId {
  return valueIdFor('document', documentId, 'kind');
}

/** One document's row displays (step 2's resolver) and its row. */
function documentRow(project: WorkspaceProject, displays: DisplaySet, document: DocumentRecord, facts: DocumentFacts, active: ReadonlySet<string>): DocumentRow {
  const resolved = resolveDocument({ document, fileName: project.fileName(document.id) ?? null, format: FORMAT });
  const status =
    resolved.status !== undefined
      ? ({ kind: 'line', valueId: displays.add(resolved.status) } as const)
      : ({ kind: 'progress', ...(resolved.reading === undefined ? {} : { line: displays.add(resolved.reading) }) } as const);
  // G1-26: the stored default is never shown as a reading of the document.
  const categoryValue = displays.add(unknownDisplay(categoryValueId(document.id), 'record'));
  let revisionOf: ValueId | null = null;
  const target = facts.declaredRevisionOf === null ? undefined : project.documents.find((entry) => entry.id === facts.declaredRevisionOf);
  if (target !== undefined && active.has(target.id)) {
    revisionOf = displays.add(resolveDocument({ document: target, fileName: project.fileName(target.id) ?? null, format: FORMAT }).fileName);
  }
  return {
    documentId: document.id,
    fileName: displays.add(resolved.fileName),
    format: facts.format,
    category: null,
    categoryValue,
    revision: displays.add(resolved.revision),
    stage: displays.add(resolved.stage),
    addedAt: facts.addedAt,
    status,
    revisionOf,
    downloadable: facts.downloadable,
  };
}

/** Newest first by when it was added, then by id (UUIDv7), so the order never depends on the store's. */
function newestFirst(a: DocumentFacts, b: DocumentFacts): number {
  return b.addedAt.localeCompare(a.addedAt) || b.documentId.localeCompare(a.documentId);
}

export function documentsView(project: WorkspaceProject, facts: readonly DocumentFacts[]): Built<DocumentsResponse['view']> {
  const displays = new DisplaySet();
  const active = new Set(project.activeDocuments.map((document) => document.id));
  const rows: DocumentRow[] = [];
  // A listed document is an active one the store holds facts for (never a row with a made-up date).
  for (const entry of [...facts].sort(newestFirst)) {
    const document = project.activeDocuments.find((candidate) => candidate.id === entry.documentId);
    if (document === undefined) continue;
    rows.push(documentRow(project, displays, document, entry, active));
  }
  return { view: { state: rows.length > 0 ? 'listed' : 'no_documents', rows, stillReading: stillReading(project, displays) }, displayObjects: displays.list() };
}

/**
 * The project as it would stand with one document removed (2.3 "Deleting a document"), derived by the caller with the
 * one derive function (2.4) and the asset register's derive (2.5) over the stored candidates and events, the
 * document's removal added to the document events (so `documentStatuses` drops its revision declarations). Nothing is
 * written to derive it.
 */
export interface WithoutDocument {
  /** A registered field's state with the document removed, by subject and key; undefined for a field the project does not hold. */
  readonly state: (subjectId: string, fieldKey: string) => FieldState | undefined;
  /** The assets the register would count (2.5: neither removed nor merged, with live evidence; G4-28, G4-31). */
  readonly countable: readonly string[];
}

/** The states in which a field shows a value (2.4). */
const HOLDS_A_VALUE: ReadonlySet<FieldState['state']> = new Set(['known', 'conflict']);
/** The states in which a field shows no value and is Unknown (2.4: `unknown`; `skipped` "stays unknown"). */
const UNKNOWN_AGAIN: ReadonlySet<FieldState['state']> = new Set(['unknown', 'skipped']);

/**
 * How many values Delete returns to Unknown (2.3, "Deleting a document"), from the project now and as derived with the
 * document removed: (i) each field that holds a value now and is Unknown after; (ii) each asset counted now and not
 * after (its tag returns to unknown with the document: 2.5, G4-28). A field still holding a value after (another
 * document's, the owner's, or an older revision's once the newer is gone, G4-42) counts nothing. The erasure job itself
 * is rule 13's, unchanged.
 */
export function deleteEffectCount(project: Pick<WorkspaceProject, 'fields' | 'register'>, after: WithoutDocument): number {
  let count = 0;
  for (const field of project.fields) {
    if (!HOLDS_A_VALUE.has(field.state.state)) continue;
    const later = after.state(field.subjectId, field.field.key);
    if (later !== undefined && UNKNOWN_AGAIN.has(later.state)) count += 1;
  }
  const counted = new Set(after.countable);
  for (const assetId of project.register.countable) if (!counted.has(assetId)) count += 1;
  return count;
}

/**
 * `workspace.documents.deleteEffect` (UD-42): what Delete will do, stated before anything is removed, from the project
 * as derived with the document removed (`after`, the caller's). Undefined for a document that is not listed.
 */
export function deleteEffectView(project: WorkspaceProject, documentId: string, after: WithoutDocument): Built<DeleteEffectResponse['view']> | undefined {
  const document = project.activeDocuments.find((entry) => entry.id === documentId);
  if (document === undefined) return undefined;
  const displays = new DisplaySet();
  const count = deleteEffectCount(project, after);
  const fileName = displays.add(resolveDocument({ document, fileName: project.fileName(document.id) ?? null, format: FORMAT }).fileName);
  const effect = displays.add(deleteEffectDisplay(valueIdFor('document', documentId, 'deleteEffect'), count, FORMAT));
  return { view: { documentId, fileName, effect }, displayObjects: displays.list() };
}
