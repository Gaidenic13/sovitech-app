/**
 * What changed since a stored proposal or a quotation record (guardrails 2.4 "A calculated candidate whose inputs are no
 * longer all active is stale. It renders as 'Out of date, recalculating' and never as current"; rule 10 "A quotation
 * goes stale when its inputs change. If any input changes after issue, it shows 'Superseded: inputs changed on <date>',
 * and the figures return to stage 2 labels"; PRD R-110, R-129; US-PROPOSAL-10; G9-10, G10-2; docs/adr/0048).
 *
 * - `snapshotChanges`: compares, for each field the caller hands it, the candidates that decided it when the snapshot
 *   was taken (the snapshot's candidate ids that belong to the field) with those that decide it now
 *   (`decidingCandidateIds`, the reading `inputsHashOf` uses); answers the changed fields, the outputs whose formula
 *   reads one of them (each then carries "Out of date, recalculating"; nothing is recomputed into the stored proposal:
 *   US-PROPOSAL-03 AC3), and the moment of the first change after generation: the earliest `createdAt` of a candidate,
 *   or `at` of a candidate, field or document event, after the snapshot was taken, among the changed fields (null when
 *   no such record exists, as for a change of the registry or of a dataset approval; the figures still read "Out of
 *   date, recalculating"). Nothing regenerates here (prompt 3 5.2 "After Generate": nothing regenerates silently).
 *   `outOfDateOn` gives the same moment per out-of-date output, over the changed fields that output reads (phase 5 part
 *   B, A-4: an input Unknown when a quotation was issued, which its record could not list, that gets a value after
 *   issue; stage.ts then returns the figure to its stage 2 label with "Superseded", rule 10).
 * - `quotationStanding`: a stored quotation record is current while every input candidate it lists still has the
 *   content its hash names, is still a deciding candidate of a known field, and no such field is in conflict; else
 *   superseded, on the date of the first change on or after its issue date (the issue date when no dated record of the
 *   change exists: the earliest day the change can have happened, so the line never reads later than the change). The
 *   record itself is never changed (rule 4).
 * Every moment these answer is an ISO 8601 date-time with a zone, as the formatting module reads it: a date-only issue
 * day as stored (a DATE column, 'YYYY-MM-DD') is answered as the start of that day in UTC, by its text only (phase 5
 * part B, V-2 and A-3: the bare date made the proposal, its print view and Reports fail).
 */
import { timeInNanos, type Candidate, type CandidateEvent, type DocumentEvent, type FieldEvent, type FieldState } from '@sovitech/domain';
import { decidingCandidateIds } from './reading';
import { candidateHashOf, type SnapshotRecord } from './snapshot';

/** A stored snapshot as the staleness check reads it (packages/db reads, migration 0005 and 0015). */
export interface StoredSnapshot {
  readonly id: string;
  readonly createdAt: string;
  readonly inputsHash: string;
  readonly candidateIds: readonly string[];
  readonly outputs: readonly { readonly output: string; readonly formulaId: string; readonly formulaVersion: string; readonly candidateId: string | null; readonly missing: readonly string[]; readonly incomplete: boolean }[];
}

/** A snapshot record as the store returns it once kept (its id and the time the store stamped): the shape the staleness check reads. */
export function storedSnapshotOf(stored: { readonly id: string; readonly createdAt: string }, record: SnapshotRecord): StoredSnapshot {
  return {
    id: stored.id,
    createdAt: stored.createdAt,
    inputsHash: record.inputsHash,
    candidateIds: [...record.candidateIds],
    outputs: record.outputs.map((row) => {
      const at = row.formula.lastIndexOf('@');
      return { output: row.output, formulaId: row.formula.slice(0, at), formulaVersion: row.formula.slice(at + 1), candidateId: row.candidateId, missing: [...row.missing], incomplete: row.incomplete };
    }),
  };
}

/** The current derived state of the fields a snapshot read, with the events that changed them. */
export interface CurrentInputs {
  readonly fields: readonly {
    readonly subjectId: string;
    readonly fieldKey: string;
    readonly state: FieldState;
    readonly candidates: readonly Candidate[];
    readonly events: readonly CandidateEvent[];
    /** The field's own events (a skip, a resolution of a conflict): dates a change that writes no candidate. */
    readonly fieldEvents?: readonly FieldEvent[];
  }[];
  /** The project's document events (a document deleted, erased or declared a revision changes its candidates: 2.3). */
  readonly documentEvents?: readonly DocumentEvent[];
}

export interface SnapshotChanges {
  readonly changedFields: readonly { readonly subjectId: string; readonly fieldKey: string }[];
  /** Outputs whose inputs changed: "Out of date, recalculating". */
  readonly outOfDateOutputs: ReadonlySet<string>;
  /**
   * For each out-of-date output: the first dated change after generation among the changed fields that output reads
   * (ISO 8601 with a zone), or null when no dated record of the change exists. What a row's `outOfDate` carries
   * (snapshot.ts `SnapshotOutputRow`; stage.ts).
   */
  readonly outOfDateOn: ReadonlyMap<string, string | null>;
  /** The first change after generation (ISO 8601), or null when nothing changed. */
  readonly changedOn: string | null;
}

type CurrentField = CurrentInputs['fields'][number];

/** A time on the store's clock as an ISO date-time with a zone: a calendar date reads as the start of that day (UTC), by its text only. */
export function timestampOf(time: string): string {
  return /^\d{4}-\d{2}-\d{2}$/u.test(time) ? `${time}T00:00:00Z` : time;
}

/** A time on the store's clock: an ISO date-time, or a calendar date read as the start of that day (UTC). */
function nanos(time: string): bigint | null {
  return timeInNanos(timestampOf(time));
}

/** The later of two times on the store's clock (either when equal), as an ISO date-time with a zone. Throws for a time it cannot read. */
export function laterOf(a: string, b: string): string {
  const first = nanos(a);
  const second = nanos(b);
  if (first === null || second === null) throw new RangeError(`@sovitech/engine: a time that cannot be read: ${first === null ? a : b}`);
  return timestampOf(second > first ? b : a);
}

/** The earliest dated record that changed `field` at or after `since`, or null. */
function firstChange(field: CurrentField, documentEvents: readonly DocumentEvent[], since: bigint, inclusive: boolean): { readonly at: string; readonly nanos: bigint } | null {
  const cited = new Set(field.candidates.flatMap((candidate) => candidate.evidence.map((evidence) => evidence.documentId)));
  const times = [
    ...field.candidates.map((candidate) => candidate.createdAt),
    ...field.events.map((event) => event.at),
    ...(field.fieldEvents ?? []).map((event) => event.at),
    ...documentEvents.filter((event) => cited.has(event.documentId)).map((event) => event.at),
  ];
  let first: { at: string; nanos: bigint } | null = null;
  for (const at of times) {
    const value = nanos(at);
    if (value === null || value < since || (!inclusive && value === since)) continue;
    if (first === null || value < first.nanos) first = { at, nanos: value };
  }
  return first;
}

const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((item) => b.includes(item));

export function snapshotChanges(snapshot: StoredSnapshot, current: CurrentInputs, readsOf: (output: string) => readonly string[]): SnapshotChanges {
  const taken = nanos(snapshot.createdAt);
  if (taken === null) throw new RangeError(`@sovitech/engine: the snapshot ${snapshot.id} has no readable time: ${snapshot.createdAt}`);
  const recorded = new Set(snapshot.candidateIds);
  const changedFields: { subjectId: string; fieldKey: string }[] = [];
  /** Each changed field's first dated change after generation, by field key (the earliest where several subjects share it). */
  const firstByKey = new Map<string, { at: string; nanos: bigint } | null>();
  let first: { at: string; nanos: bigint } | null = null;
  for (const field of current.fields) {
    const own = new Set(field.candidates.map((candidate) => candidate.id));
    const then = [...recorded].filter((id) => own.has(id)).sort();
    const now = decidingCandidateIds(field.state);
    if (sameSet(then, now)) continue;
    changedFields.push({ subjectId: field.subjectId, fieldKey: field.fieldKey });
    const change = firstChange(field, current.documentEvents ?? [], taken, false);
    const known = firstByKey.get(field.fieldKey) ?? null;
    firstByKey.set(field.fieldKey, change !== null && (known === null || change.nanos < known.nanos) ? change : known);
    if (change !== null && (first === null || change.nanos < first.nanos)) first = change;
  }
  const outOfDateOutputs = new Set<string>();
  const outOfDateOn = new Map<string, string | null>();
  for (const output of new Set(snapshot.outputs.map((row) => row.output))) {
    const read = readsOf(output).filter((key) => firstByKey.has(key));
    if (read.length === 0) continue;
    outOfDateOutputs.add(output);
    let earliest: { at: string; nanos: bigint } | null = null;
    for (const key of read) {
      const change = firstByKey.get(key) ?? null;
      if (change !== null && (earliest === null || change.nanos < earliest.nanos)) earliest = change;
    }
    outOfDateOn.set(output, earliest === null ? null : timestampOf(earliest.at));
  }
  return { changedFields, outOfDateOutputs, outOfDateOn, changedOn: first === null ? null : timestampOf(first.at) };
}

/** A stored quotation record as rule 10 lists it (migration 0005 `quotation_records`, `quotation_record_inputs`). */
export interface StoredQuotationRecord {
  readonly id: string;
  readonly recordNumber: string;
  readonly reviewingEngineerId: string;
  readonly commercialReviewerId: string;
  readonly issuedOn: string;
  readonly validUntil: string;
  readonly currency: string;
  readonly vatBasis: string;
  readonly proposalSnapshotId: string | null;
  readonly inputs: readonly { readonly candidateId: string; readonly candidateHash: string }[];
}

export type QuotationStanding = { readonly state: 'current' } | { readonly state: 'superseded'; readonly changedOn: string };

/** A record's issue moment as an ISO date-time with a zone (a date-only issue day as the start of that day, UTC). */
export function issuedAtOf(record: Pick<StoredQuotationRecord, 'id' | 'issuedOn'>): string {
  if (nanos(record.issuedOn) === null) throw new RangeError(`@sovitech/engine: the record ${record.id} has no readable issue date: ${record.issuedOn}`);
  return timestampOf(record.issuedOn);
}

export function quotationStanding(record: StoredQuotationRecord, current: CurrentInputs): QuotationStanding {
  const issuedAt = issuedAtOf(record);
  const issued = nanos(issuedAt);
  if (issued === null) throw new RangeError(`@sovitech/engine: the record ${record.id} has no readable issue date: ${record.issuedOn}`);
  if (record.inputs.length === 0) return { state: 'superseded', changedOn: issuedAt };
  const broken: CurrentField[] = [];
  let unplaced = false;
  for (const item of record.inputs) {
    const field = current.fields.find((entry) => entry.candidates.some((candidate) => candidate.id === item.candidateId));
    const candidate = field?.candidates.find((entry) => entry.id === item.candidateId);
    if (field === undefined || candidate === undefined) {
      unplaced = true;
      continue;
    }
    const intact = candidateHashOf(candidate) === item.candidateHash;
    const deciding = field.state.state === 'known' && field.state.conflicts.length === 0 && decidingCandidateIds(field.state).includes(item.candidateId);
    if (!intact || !deciding) broken.push(field);
  }
  if (broken.length === 0 && !unplaced) return { state: 'current' };
  let first: { at: string; nanos: bigint } | null = null;
  for (const field of broken) {
    const change = firstChange(field, current.documentEvents ?? [], issued, true);
    if (change !== null && (first === null || change.nanos < first.nanos)) first = change;
  }
  return { state: 'superseded', changedOn: first === null ? issuedAt : timestampOf(first.at) };
}
