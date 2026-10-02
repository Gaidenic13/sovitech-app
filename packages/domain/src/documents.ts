/**
 * Document status, derived from document events (docs/guardrails.md 2.3:
 * "document status (superseded, withdrawn, erased) is derived from these";
 * F-INGEST-06, F-INGEST-07, F-VALUE-07). Never stored.
 *
 * A document is superseded only through a declared revision: a
 * `declared_revision_of` event on the newer document, by the owner or an
 * engineer, naming the document it revises (the event's `revisionOf`, or the
 * newer record's `supersedes`) (2.3, "Revisions are declared, never guessed"). A
 * `supersedes` that code proposed and nobody declared, or a declaration by the
 * system, supersedes nothing. Upload order never does.
 *
 * Declarations are read so that a mistake can be corrected and never removes
 * values silently (phase 1 adversarial finding on revision cycles; 2.3 "Old-only
 * values stay visible", rule 4):
 * - a document revises one document: its latest declaration stands, and two
 *   declarations on it at the same time cancel each other;
 * - on one pair of documents the later declaration replaces the earlier one
 *   (declaring B a revision of A after A a revision of B corrects the first), and
 *   two at the same time cancel each other;
 * - a declaration that closes a cycle of revisions is ignored, with every other
 *   declaration on that cycle, so no document of the cycle is superseded.
 *
 * A document is removed only by a person's action (2.3 "Deleting a document"; rule 13
 * "Erasure"; rule 4; phase 1 review, rounds 4 and 5):
 * - a `withdrawn` event holds from the owner or an engineer, the two people 2.3's
 *   `DocumentEvent` names, and from the system only when it names, in
 *   `requestEventId`, that person's own `withdrawn` event on the same document (the
 *   job carrying out a person's deletion);
 * - an `erased` event holds from the owner, or from the audited erasure function as
 *   the system, with its own reason ({@link ERASURE_EVENT_REASON}).
 * Any other withdrawal or erasure removes nothing, so no job can take one side of a
 * conflict away on its own; it is listed in {@link DocumentStatuses.refused}.
 */
import type { DocumentEvent, DocumentRecord } from './model';
import { olderFirst } from './time';

/** A document's derived status. */
export const DOCUMENT_STATUSES = ['active', 'superseded', 'withdrawn', 'erased'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/**
 * The reason the audited erasure function writes on its `erased` event, whether it
 * names the owner who asked or the system (rule 13, "Erasure"; migration 0008,
 * `sovitech.erase_document`; the store refuses an erased event with any other reason).
 */
export const ERASURE_EVENT_REASON = 'document_erased';

/**
 * Why a document's `withdrawn` or `erased` event does not hold:
 * - `withdrawal_without_request`: a `withdrawn` event by the system that does not name
 *   the owner's or an engineer's own withdrawal of the same document
 *   (`requestEventId`): nothing in 2.3 or rule 13 lets a document, and the values only
 *   it supports, go with no person's action, and rule 4 keeps a value from going
 *   silently;
 * - `erasure_outside_function`: an `erased` event from anyone but the owner, or from the
 *   system without the erasure function's own reason (rule 13: "When an owner deletes a
 *   document or asks for erasure, one audited erasure job ...");
 * - `by_missing`: it names nobody.
 */
export const DOCUMENT_EVENT_REFUSALS = ['withdrawal_without_request', 'erasure_outside_function', 'by_missing'] as const;
export type DocumentEventRefusal = (typeof DOCUMENT_EVENT_REFUSALS)[number];

/** A document event that does not hold, and why. */
export interface RefusedDocumentEvent {
  readonly event: DocumentEvent;
  readonly refusal: DocumentEventRefusal;
}

/** The derived statuses of the documents a set of events concerns. Every lookup is read-only. */
export interface DocumentStatuses {
  /** The derived status of one document. A document no event concerns is active. */
  readonly status: (documentId: string) => DocumentStatus;
  /**
   * Whether a withdrawn or erased event that holds concerns the document (2.3 "Deleting
   * a document"; rule 13 "Erasure"): a person's withdrawal, the system's carrying one
   * out, the owner's erasure, or the erasure function's as the system.
   */
  readonly removed: (documentId: string) => boolean;
  /** The declared revisions that supersede the document, directly or through a chain of declared revisions. */
  readonly successors: (documentId: string) => ReadonlySet<string>;
  /**
   * The document this one is a declared revision of, as derive applies the declarations (2.3, "Revisions are declared,
   * never guessed"): the declaration that stands for it (its latest; on a pair, the later direction) and is on no cycle;
   * undefined when none stands. A screen that names a document's predecessor reads this, never a raw declaration, so it
   * shows only what supersedes a value (G4-44).
   */
  readonly predecessor: (documentId: string) => string | undefined;
  /** The withdrawn and erased events that do not hold, with why, in the order given. They remove nothing. */
  readonly refused: readonly RefusedDocumentEvent[];
}

/** The people 2.3's `DocumentEvent` names who withdraw a document themselves. */
const PERSON_REMOVERS: ReadonlySet<string> = new Set(['owner', 'sovitech_engineer']);

/** Whether an event is a person's own withdrawal of a document, naming its author. */
const isPersonWithdrawal = (event: DocumentEvent): boolean =>
  event.type === 'withdrawn' && PERSON_REMOVERS.has(event.role) && event.by.trim() !== '';

/**
 * Whether a document's withdrawal or erasure holds, or why not (see the module
 * comment). `personWithdrawals` holds, by id, every person's own withdrawal among the
 * events, which a system withdrawal must name on the same document.
 */
function removalRefusal(event: DocumentEvent, personWithdrawals: ReadonlyMap<string, DocumentEvent>): DocumentEventRefusal | null {
  if (event.by.trim() === '') return 'by_missing';
  if (event.type === 'withdrawn') {
    if (PERSON_REMOVERS.has(event.role)) return null;
    const request = event.requestEventId === undefined ? undefined : personWithdrawals.get(event.requestEventId);
    return request !== undefined && request.documentId === event.documentId ? null : 'withdrawal_without_request';
  }
  if (event.role === 'owner') return null;
  if (event.role === 'system' && event.reason === ERASURE_EVENT_REASON) return null;
  return 'erasure_outside_function';
}

const DECLARERS: ReadonlySet<string> = new Set(['owner', 'sovitech_engineer']);

/** One declaration as read: `revision` declares that it revises `predecessor`, at `at`. */
interface Declaration {
  readonly revision: string;
  readonly predecessor: string;
  readonly at: string;
}

/** The unordered pair a declaration concerns. */
const pairOf = (declaration: Declaration): string =>
  [declaration.revision, declaration.predecessor].sort().join('\u0000');

/**
 * Keeps, per key, the latest declarations; when the latest time is shared by
 * declarations that disagree, none of them stands.
 */
function latestPer(declarations: readonly Declaration[], keyOf: (declaration: Declaration) => string): Declaration[] {
  const groups = new Map<string, Declaration[]>();
  for (const declaration of declarations) {
    const key = keyOf(declaration);
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [declaration]);
    else group.push(declaration);
  }
  const kept: Declaration[] = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => olderFirst(b.at, a.at));
    const [latest] = sorted;
    if (latest === undefined) continue;
    const tied = sorted.filter((declaration) => olderFirst(declaration.at, latest.at) === 0);
    const agree = tied.every((declaration) => declaration.revision === latest.revision && declaration.predecessor === latest.predecessor);
    if (agree) kept.push(latest);
  }
  return kept;
}

/**
 * Derives document statuses from the project's document events. `record`
 * looks up a document record by id; pass every document event of the project,
 * so a revision declared on a document no candidate cites still supersedes
 * its predecessor.
 */
export function documentStatuses(
  events: readonly DocumentEvent[],
  record: (documentId: string) => DocumentRecord | undefined,
): DocumentStatuses {
  const withdrawn = new Set<string>();
  const erased = new Set<string>();
  const refused: RefusedDocumentEvent[] = [];
  const personWithdrawals = new Map<string, DocumentEvent>();
  for (const event of events) {
    if (event.id !== undefined && event.id.trim() !== '' && isPersonWithdrawal(event)) personWithdrawals.set(event.id, event);
  }
  for (const event of events) {
    if (event.type !== 'withdrawn' && event.type !== 'erased') continue;
    const refusal = removalRefusal(event, personWithdrawals);
    if (refusal !== null) refused.push({ event, refusal });
    else if (event.type === 'withdrawn') withdrawn.add(event.documentId);
    else erased.add(event.documentId);
  }
  const removed = (documentId: string): boolean => withdrawn.has(documentId) || erased.has(documentId);

  // Every declaration by a named owner or engineer, on a known revision that is not removed.
  const declarations: Declaration[] = [];
  for (const event of events) {
    if (event.type !== 'declared_revision_of' || !DECLARERS.has(event.role) || event.by.trim() === '') continue;
    const revision = record(event.documentId);
    if (revision === undefined || removed(revision.id)) continue;
    const predecessor = event.revisionOf ?? revision.supersedes;
    if (predecessor === undefined || predecessor.trim() === '' || predecessor === revision.id) continue;
    declarations.push({ revision: revision.id, predecessor, at: event.at });
  }

  // One predecessor per revision, then one direction per pair.
  const perRevision = latestPer(declarations, (declaration) => declaration.revision);
  const perPair = latestPer(perRevision, pairOf);

  // Each revision now names at most one predecessor: ignore every declaration on a cycle.
  const predecessorOf = new Map(perPair.map((declaration) => [declaration.revision, declaration.predecessor]));
  const onCycle = new Set<string>();
  for (const start of predecessorOf.keys()) {
    const path: string[] = [];
    const seen = new Set<string>();
    let current: string | undefined = start;
    while (current !== undefined && !seen.has(current)) {
      seen.add(current);
      path.push(current);
      current = predecessorOf.get(current);
    }
    if (current !== undefined) {
      // `current` was reached twice: the path from its first visit closes a cycle.
      for (const node of path.slice(path.indexOf(current))) onCycle.add(node);
    }
  }

  /** Direct successors: predecessor id to the ids of the declared revisions that name it. */
  const direct = new Map<string, Set<string>>();
  for (const [revision, predecessor] of predecessorOf) {
    if (onCycle.has(revision)) continue;
    const known = direct.get(predecessor);
    if (known === undefined) direct.set(predecessor, new Set([revision]));
    else known.add(revision);
  }

  const successors = (documentId: string): ReadonlySet<string> => {
    const found = new Set<string>();
    const queue = [...(direct.get(documentId) ?? new Set<string>())];
    while (queue.length > 0) {
      const next = queue.shift();
      if (next === undefined || found.has(next) || next === documentId) continue;
      found.add(next);
      for (const later of direct.get(next) ?? new Set<string>()) queue.push(later);
    }
    return found;
  };

  const status = (documentId: string): DocumentStatus => {
    if (erased.has(documentId)) return 'erased';
    if (withdrawn.has(documentId)) return 'withdrawn';
    return successors(documentId).size > 0 ? 'superseded' : 'active';
  };

  const predecessor = (documentId: string): string | undefined => (onCycle.has(documentId) ? undefined : predecessorOf.get(documentId));

  return { status, removed, successors, predecessor, refused };
}
