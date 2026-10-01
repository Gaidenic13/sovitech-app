/**
 * Open items (F-QUESTION-07; guardrails rule 7, "Open items are short, and say who acts"; PRD
 * R-046; US-REVIEW-12): "For you" holds only what the owner can resolve, ordered by its effect on
 * the estimate; "SOVITECH will check" holds engineer items, one line per group; counts count only
 * what the owner can act on; a labelled value rule 5 did not flag is not an open item.
 */
import { hasEligible, type IntakeField } from './model';
import type { ConfirmationCandidate } from './confirmations';

/** One "For you" item, ordered by its effect on the estimate (impactRank). */
export interface ForYouPlan {
  readonly fieldKey: string;
  readonly subjectId: string;
  readonly reason: 'confirmation' | 'conflict' | 'source_document_removed' | 'first_estimate_missing';
  readonly impactRank: number;
}

/** One "SOVITECH will check" group, one line (rule 7): its count where the group counts items. */
export interface EngineerGroupPlan {
  readonly group: 'equipment_classifications' | 'site_survey' | 'engineer_values';
  readonly count: number;
  /** For `engineer_values`: the field labels the line names (the nearest 2.8 form; listed for the owner). */
  readonly fieldLabels: readonly string[];
}

/** The order of reasons when one field has several: what the owner must decide first. */
const REASON_ORDER: readonly ForYouPlan['reason'][] = ['conflict', 'confirmation', 'source_document_removed', 'first_estimate_missing'];

/**
 * The review step's lists from field states (rule 7; US-REVIEW-12): "For you" holds only what the
 * owner can resolve (owner-routed conflicts, confirmations shown and left, "Source document
 * removed", first-estimate fields still missing), one item per field, ordered by impactRank,
 * counted as "<n> things for you to check" with the top three and "and <n> more"; engineer items
 * one line per group; a labelled value rule 5 did not flag is not an open item. A field whose only
 * source document was removed goes under "For you" as "Source document removed", whatever its
 * `confirmBy` (guardrails 2.3, "Deleting a document"; G4-15): derive's review entry routes it. PRD
 * R-046's interim (D-61: engineer fields to "SOVITECH will check") is not applied, since the
 * guardrails win (docs/build-log.md, phase 3, "Product doc issues"). A
 * first-estimate slot of several decision fields (the systems in scope) is one item, on its first
 * field. Confirmations over the budget stay labelled and go to the engineer (rule 5). Proves G7-5.
 */
export function openItems(input: {
  readonly fields: readonly IntakeField[];
  readonly confirmationsLeft: readonly ConfirmationCandidate[];
  readonly confirmationOverflow: readonly ConfirmationCandidate[];
  readonly unverifiedAssetTypes: number;
  readonly siteSurveyNeeded: boolean;
}): { readonly forYou: readonly ForYouPlan[]; readonly engineer: readonly EngineerGroupPlan[] } {
  const items = new Map<string, ForYouPlan>();
  const add = (item: ForYouPlan): void => {
    const key = `${item.subjectId}\u0000${item.fieldKey}`;
    const earlier = items.get(key);
    if (earlier === undefined || REASON_ORDER.indexOf(item.reason) < REASON_ORDER.indexOf(earlier.reason)) items.set(key, item);
  };
  const fieldByKey = (fieldKey: string): IntakeField | undefined => input.fields.find((field) => field.field.key === fieldKey);

  for (const confirmation of input.confirmationsLeft) {
    const field = fieldByKey(confirmation.fieldKey);
    if (field !== undefined) add({ fieldKey: field.field.key, subjectId: field.subjectId, reason: 'confirmation', impactRank: field.field.impactRank });
  }
  for (const field of input.fields) {
    const review = field.state.review;
    if (review?.list !== 'for_you') continue;
    if (review.reason === 'conflict') add({ fieldKey: field.field.key, subjectId: field.subjectId, reason: 'conflict', impactRank: field.field.impactRank });
    if (review.reason === 'source_document_removed') add({ fieldKey: field.field.key, subjectId: field.subjectId, reason: 'source_document_removed', impactRank: field.field.impactRank });
  }
  const slots = new Map<string, IntakeField[]>();
  for (const field of input.fields) {
    const slot = field.field.criticality === 'first_estimate' ? field.field.firstEstimateSlot : undefined;
    if (slot === undefined) continue;
    const list = slots.get(slot);
    if (list === undefined) slots.set(slot, [field]);
    else list.push(field);
  }
  for (const slotFields of slots.values()) {
    if (slotFields.some(hasEligible)) continue;
    const [first] = [...slotFields].sort((a, b) => a.field.impactRank - b.field.impactRank);
    if (first !== undefined) add({ fieldKey: first.field.key, subjectId: first.subjectId, reason: 'first_estimate_missing', impactRank: first.field.impactRank });
  }
  const forYou = [...items.values()].sort((a, b) => a.impactRank - b.impactRank || a.fieldKey.localeCompare(b.fieldKey));

  const engineerFields = new Map<string, IntakeField>();
  for (const field of input.fields) {
    if (field.state.review?.list === 'sovitech_will_check') engineerFields.set(`${field.subjectId}\u0000${field.field.key}`, field);
  }
  for (const confirmation of input.confirmationOverflow) {
    const field = fieldByKey(confirmation.fieldKey);
    if (field !== undefined) engineerFields.set(`${field.subjectId}\u0000${field.field.key}`, field);
  }
  const engineer: EngineerGroupPlan[] = [];
  if (Number.isInteger(input.unverifiedAssetTypes) && input.unverifiedAssetTypes > 0) {
    engineer.push({ group: 'equipment_classifications', count: input.unverifiedAssetTypes, fieldLabels: [] });
  }
  if (input.siteSurveyNeeded) engineer.push({ group: 'site_survey', count: 1, fieldLabels: [] });
  if (engineerFields.size > 0) {
    const labels = [...new Set([...engineerFields.values()].sort((a, b) => a.field.impactRank - b.field.impactRank).map((field) => field.field.label))];
    engineer.push({ group: 'engineer_values', count: engineerFields.size, fieldLabels: labels });
  }
  return { forYou, engineer };
}
