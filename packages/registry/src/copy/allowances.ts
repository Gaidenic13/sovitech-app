/**
 * The reserved-term allowances the copy registries need (docs/guardrails.md 2.8,
 * "Where they are allowed"; ADR 0008 decision 4; ADR 0011).
 *
 * Built from the badge, status-line and generated-sentence registries: one
 * allowance for each of their texts that holds a reserved term, of the kind of
 * the place 2.8 gives it. Each is word for word a text 2.8 lists for that kind,
 * so under ADR 0011 (Accepted: default, reversible) the loosening check accepts
 * it as 2.8 itself, matched against 2.8 at run time, and lists it for the owner.
 * A registry text that holds a reserved term and is not one of these fails the
 * reserved-term check, because no allowance covers it.
 *
 * Where they hold (phase 1 review): the source scan applies them only inside these
 * copy registries (packages/registry/src/copy/**), so the same text anywhere else in
 * source is flagged; a template's slots take typed values only (`{date}` a calendar
 * date); and "Formal quotation", rule 10's stage 3 label, holds only with a stored
 * quotation record (`requiresRecord`), which the loosening check also requires before
 * it accepts the entry as 2.8's text "at stage 3" (ADR 0011).
 *
 * `REGISTERED_ALLOWANCE_ENTRIES` in ../reserved-terms.ts is this list.
 */
import type { ReservedTermAllowance } from '../reserved-terms';
import { badgeById } from './badges';
import { GENERATED_SENTENCES } from './sentences';
import { statusLineById } from './status-lines';

function sentence(id: string): ReservedTermAllowance {
  const entry = GENERATED_SENTENCES.find((item) => item.id === id);
  if (entry === undefined) throw new Error(`packages/registry/src/copy/allowances.ts: no generated sentence ${id}`);
  return { kind: 'generated_sentence', templateId: entry.id, template: entry.template, readsStoredState: entry.readsStoredState };
}

/** A stage label's allowance, bound to the stored record the label is derived from. */
function stageLabel(id: 'formal_quotation'): ReservedTermAllowance {
  const entry = statusLineById(id);
  if (entry.readsRecord === undefined) throw new Error(`packages/registry/src/copy/allowances.ts: the stage label ${id} names no stored record`);
  return { kind: 'status_line', statusLineId: entry.id, text: entry.text, requiresRecord: entry.readsRecord };
}

export const COPY_ALLOWANCES: readonly ReservedTermAllowance[] = Object.freeze([
  { kind: 'badge', badgeId: 'verified_by_sovitech', label: badgeById('verified_by_sovitech').label },
  { kind: 'badge', badgeId: 'confirmed_by_you', label: badgeById('confirmed_by_you').label },
  stageLabel('formal_quotation'),
  sentence('ai_inference_engineer_verified_line'),
  sentence('ai_inference_user_confirmed_line'),
]);
