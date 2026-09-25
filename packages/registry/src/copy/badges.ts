/**
 * The badge registry (docs/guardrails.md 2.8, "Badge labels": "These are the
 * only badges the owner sees on values. A new one is added here before any
 * design or code uses it"; "One badge per value. When several apply, the badge
 * is the first match in the table order above").
 *
 * Each label is 2.8's text, character for character; `rank` is its row in 2.8's
 * table, so the first match is the lowest rank. Two rows hold two labels each
 * ("Unknown" / "Not provided yet", "Likely" / "Possible"); both labels of a row
 * share its rank. copy.test.ts reads 2.8 and fails when a label or the order
 * drifts from it. The situations and example lines stay in 2.8: the view-model
 * (phase 3) decides which badge applies from stored state, and builds each line
 * from the generated-sentence registry (./sentences.ts) or its own templates.
 */

export const BADGE_IDS = [
  'two_values',
  'reading_documents',
  'not_applicable',
  'unknown',
  'not_provided_yet',
  'estimated',
  'verified_by_sovitech',
  'confirmed_by_you',
  'provided_by_you',
  'please_check',
  'likely',
  'possible',
  'sovitech_will_check',
  'from_design_drawings',
  'from_document',
  'calculated',
  'reference',
  'suggested',
  'not_found_in_documents',
  'not_available_yet',
] as const;
export type BadgeId = (typeof BADGE_IDS)[number];

export interface BadgeDefinition {
  readonly id: BadgeId;
  /** 2.8's label, character for character. */
  readonly label: string;
  /** 2.8's table row, from 1: the first match wins (lowest rank). */
  readonly rank: number;
}

const badge = (id: BadgeId, label: string, rank: number): BadgeDefinition => Object.freeze({ id, label, rank });

/** Every badge of 2.8, in its table order. */
export const BADGES: readonly BadgeDefinition[] = Object.freeze([
  badge('two_values', 'Two values', 1),
  badge('reading_documents', 'Reading documents…', 2),
  badge('not_applicable', 'Not applicable', 3),
  badge('unknown', 'Unknown', 4),
  badge('not_provided_yet', 'Not provided yet', 4),
  badge('estimated', 'Estimated', 5),
  badge('verified_by_sovitech', 'Verified by SOVITECH', 6),
  badge('confirmed_by_you', 'Confirmed by you', 7),
  badge('provided_by_you', 'Provided by you', 8),
  badge('please_check', 'Please check', 9),
  badge('likely', 'Likely', 10),
  badge('possible', 'Possible', 10),
  badge('sovitech_will_check', 'SOVITECH will check', 11),
  badge('from_design_drawings', 'From design drawings', 12),
  badge('from_document', 'From document', 13),
  badge('calculated', 'Calculated', 14),
  badge('reference', 'Reference', 15),
  badge('suggested', 'Suggested', 16),
  badge('not_found_in_documents', 'Not found in documents', 17),
  badge('not_available_yet', 'Not available yet', 18),
]);

const BY_ID: ReadonlyMap<BadgeId, BadgeDefinition> = new Map(BADGES.map((entry) => [entry.id, entry]));

export function badgeById(id: BadgeId): BadgeDefinition {
  const entry = BY_ID.get(id);
  if (entry === undefined) throw new Error(`packages/registry/src/copy/badges.ts: no badge ${id}`);
  return entry;
}

/** 2.8 "One badge per value": of the badges that apply, the first in 2.8's table order. */
export function firstBadge(applicable: readonly BadgeId[]): BadgeDefinition | undefined {
  let first: BadgeDefinition | undefined;
  for (const id of applicable) {
    const entry = badgeById(id);
    if (first === undefined || entry.rank < first.rank) first = entry;
  }
  return first;
}
