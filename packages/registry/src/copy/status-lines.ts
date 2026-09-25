/**
 * The status-line registry (docs/guardrails.md 2.8, "Status lines and stage
 * labels": "These appear as lines, banners or headings, not as badges. They are
 * also the only ones used").
 *
 * Each text is 2.8's, character for character, with two readings of a slot, as
 * ADR 0011 records them: a placeholder 2.8 writes as `<name>` is a `{slot}`, and
 * an example number 2.8 writes in a status line (the equipment count, "37 of 40") is a `{slot}`
 * too, because prompt 3 section 7 binds every number in a 2.8 status line to a
 * value id derived from stored state. Every word stays 2.8's word.
 * copy.test.ts reads 2.8 and fails when a text drifts from it.
 *
 * Ids that the domain's derive function names in `FieldState.statusLines`
 * (`out_of_date_recalculating`, `from_superseded_revision`,
 * `source_document_removed`) are the same ids here.
 *
 * Not here: the G12-1 forms that name another file type in place of "RVT model"
 * ("Not analysed: IFC model stored, not analysed", "... DWG drawing ...", "...
 * DOCX file ...", "... ZIP archive ..."). Prompt 3 5.3 lists those substitutions
 * for the approver as a wording clarification of 2.8; phase 2, which first shows
 * them, writes them with that listing.
 */

export const STATUS_LINE_IDS = [
  'provisional_inputs',
  'incomplete_exclusions',
  'out_of_date_recalculating',
  'superseded_inputs_changed',
  'from_superseded_revision',
  'source_document_removed',
  'partly_analysed',
  'not_analysed',
  'analysis_failed',
  'site_survey_needed',
  'indicative_range',
  'preliminary_investment_estimate',
  'formal_quotation',
  'demo_data',
] as const;
export type StatusLineId = (typeof STATUS_LINE_IDS)[number];

export interface StatusLineDefinition {
  readonly id: StatusLineId;
  /** 2.8's text, with `{slot}` where 2.8 writes a placeholder or an example number. */
  readonly text: string;
  /** The slots, in order; each is filled from stored state (a bound value id for a number). */
  readonly slots: readonly string[];
  /** A status line, a stage label of rule 10 (read from stored records), or the demo line. */
  readonly kind: 'status_line' | 'stage_label' | 'demo_line';
  /**
   * The stored record the text is derived from, where the guardrails name one: rule 10's
   * stage 3 label comes only from a stored quotation record ("Stage 3 is derived, not
   * passed"), and 2.8 allows "Formal quotation" at stage 3 only. Its reserved-term
   * allowance holds only where that record is named (./allowances.ts; ADR 0011).
   */
  readonly readsRecord?: 'quotation_record';
}

const SLOT = /\{([^{}]+)\}/gu;

const line = (
  id: StatusLineId,
  text: string,
  kind: StatusLineDefinition['kind'] = 'status_line',
  readsRecord?: StatusLineDefinition['readsRecord'],
): StatusLineDefinition =>
  Object.freeze({
    id,
    text,
    slots: Object.freeze([...text.matchAll(SLOT)].map((match) => match[1] ?? '')),
    kind,
    ...(readsRecord === undefined ? {} : { readsRecord }),
  });

/** Every status line and stage label of 2.8, in its table order. */
export const STATUS_LINES: readonly StatusLineDefinition[] = Object.freeze([
  line('provisional_inputs', 'Provisional: depends on {count} equipment items not yet checked'),
  line('incomplete_exclusions', 'Incomplete: excludes {itemNames}'),
  line('out_of_date_recalculating', 'Out of date, recalculating'),
  line('superseded_inputs_changed', 'Superseded: inputs changed on {date}'),
  line('from_superseded_revision', 'From a superseded revision'),
  line('source_document_removed', 'Source document removed'),
  line('partly_analysed', 'Partly analysed ({analysed} of {total} pages)'),
  line('not_analysed', 'Not analysed: RVT model stored, not analysed'),
  line('analysis_failed', 'Analysis failed'),
  line('site_survey_needed', 'Site survey needed'),
  line('indicative_range', 'Indicative range', 'stage_label'),
  line('preliminary_investment_estimate', 'Preliminary investment estimate', 'stage_label'),
  line('formal_quotation', 'Formal quotation', 'stage_label', 'quotation_record'),
  line('demo_data', 'Demo data, not an assessment of the real building', 'demo_line'),
]);

const BY_ID: ReadonlyMap<StatusLineId, StatusLineDefinition> = new Map(STATUS_LINES.map((entry) => [entry.id, entry]));

export function statusLineById(id: StatusLineId): StatusLineDefinition {
  const entry = BY_ID.get(id);
  if (entry === undefined) throw new Error(`packages/registry/src/copy/status-lines.ts: no status line ${id}`);
  return entry;
}
