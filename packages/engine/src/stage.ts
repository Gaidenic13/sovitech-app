/**
 * The pricing stage of an investment figure, read from stored records only (guardrails rule 10, "Stage 3 is derived,
 * not passed": "Templates read the stage from the record. They never accept it as a parameter"; rule 7's
 * `first_estimate` row; 2.8 stage labels; PRD R-127; G7-2a, G7-2b, G10-1, G10-2, G10-9, G10-11; docs/adr/0048).
 *
 * `priceStageOf` reads, for one investment output of a stored snapshot:
 * - the snapshot's row for that output (the figure the engine stored, or what was missing);
 * - the quotation records stored for the project that name this snapshot, with their standing (staleness.ts).
 * It answers:
 * - `formal_quotation` with the record's id, only for the output that carries this project's data (stage 2's, the
 *   preliminary investment estimate), only when it has a complete figure (not "Incomplete": rule 1), only when a
 *   record names the snapshot and is current (G10-9: the display then carries the record's id; the latest-issued
 *   current record when several are), and only while no input the output reads changed after generation (the row's
 *   `outOfDate`, set by the reader from staleness.ts `outOfDateOn`). A benchmark-only figure (stage 1) never becomes a
 *   formal quotation;
 * - else the output's own stage (OUTPUT_STAGES: `indicative_range` for the benchmark output,
 *   `preliminary_investment_estimate` for this project's data) when the output has a figure. A complete stage 2 figure
 *   carries the record's "Superseded: inputs changed on <date>" when a record names the snapshot and is superseded
 *   (G10-2; the latest-issued superseded record, when no record is current), or when the current record's figure is
 *   out of date (rule 10: "If any input changes after issue, it shows 'Superseded: inputs changed on <date>', and the
 *   figures return to stage 2 labels"; phase 5 part B, A-4: an input Unknown at issue, which the record could not list,
 *   that gets a value after issue), on the later of the first dated change and the record's issue day (the issue day
 *   when the change is not dated). Stage 1, and an incomplete figure, never carry "Superseded": no quotation covers
 *   them (phase 5 part B, V-4);
 * - else no stage (the output's "Not available yet" line carries the reason; G10-11). A row that is not an investment
 *   output has no stage either.
 * Which investment output the headline shows (`headlineOutputOf`): stage 2 when it has a complete figure; else stage 1
 * where rule 7 gives the fallback (`fallbackAllowed`: a first-estimate input missing, the registry allows an Indicative
 * range for it, its dataset approved: G7-2a) and stage 1 has a complete figure; else stage 2, whose row then gives the
 * "Not available yet" line naming every missing input with its Add action (G7-2b; G10-11), or, when it is incomplete,
 * no headline figure at all (rule 1: "no headline ... is computed from it"; G1-2).
 */
import { OUTPUT } from '@sovitech/registry';
import { OUTPUT_STAGES } from './catalogue';
import type { SnapshotOutputRow } from './snapshot';
import { issuedAtOf, laterOf, type QuotationStanding, type StoredQuotationRecord } from './staleness';

export type PriceStageId = 'indicative_range' | 'preliminary_investment_estimate' | 'formal_quotation';

export type PriceStageReading =
  | { readonly stage: PriceStageId; readonly quotationRecordId: string | null; readonly superseded: { readonly recordId: string; readonly changedOn: string } | null }
  | { readonly stage: null; readonly quotationRecordId: null; readonly superseded: null };

const NO_STAGE: PriceStageReading = Object.freeze({ stage: null, quotationRecordId: null, superseded: null });

/** The later-issued of two records (issue dates as stored: ISO dates compare as text), then the larger id, so the choice is total. */
const laterIssued = (a: StoredQuotationRecord, b: StoredQuotationRecord): number =>
  a.issuedOn === b.issuedOn ? (a.id < b.id ? 1 : a.id > b.id ? -1 : 0) : a.issuedOn < b.issuedOn ? 1 : -1;

export function priceStageOf(input: {
  readonly output: SnapshotOutputRow;
  readonly records: readonly { readonly record: StoredQuotationRecord; readonly standing: QuotationStanding }[];
  readonly snapshotId: string;
}): PriceStageReading {
  const own = OUTPUT_STAGES[input.output.output];
  if (own === undefined || input.output.candidateId === null) return NO_STAGE;
  // Only a complete stage 2 figure is ever covered by a quotation: "Formal quotation", or "Superseded" once it is stale.
  const quotable = own === 'preliminary_investment_estimate' && !input.output.incomplete;
  if (!quotable) return { stage: own, quotationRecordId: null, superseded: null };
  const naming = input.records.filter((entry) => entry.record.proposalSnapshotId === input.snapshotId);
  const current = naming.filter((entry) => entry.standing.state === 'current').map((entry) => entry.record).sort(laterIssued)[0];
  if (current !== undefined) {
    const outOfDate = input.output.outOfDate ?? null;
    if (outOfDate === null) return { stage: 'formal_quotation', quotationRecordId: current.id, superseded: null };
    const issuedAt = issuedAtOf(current);
    const changedOn = outOfDate.changedOn === null ? issuedAt : laterOf(outOfDate.changedOn, issuedAt);
    return { stage: own, quotationRecordId: null, superseded: { recordId: current.id, changedOn } };
  }
  const superseded = naming
    .flatMap((entry) => (entry.standing.state === 'superseded' ? [{ record: entry.record, changedOn: entry.standing.changedOn }] : []))
    .sort((a, b) => laterIssued(a.record, b.record))[0];
  if (superseded !== undefined) return { stage: own, quotationRecordId: null, superseded: { recordId: superseded.record.id, changedOn: superseded.changedOn } };
  return { stage: own, quotationRecordId: null, superseded: null };
}

/** The investment output the headline carries (stage 2, its stage 1 fallback, or stage 2's "Not available yet"). */
export function headlineOutputOf(rows: readonly SnapshotOutputRow[], fallbackAllowed: boolean): string {
  const complete = (output: string): boolean => rows.some((row) => row.output === output && row.candidateId !== null && !row.incomplete);
  if (complete(OUTPUT.preliminaryEstimate)) return OUTPUT.preliminaryEstimate;
  if (fallbackAllowed && complete(OUTPUT.indicativeRange)) return OUTPUT.indicativeRange;
  return OUTPUT.preliminaryEstimate;
}
