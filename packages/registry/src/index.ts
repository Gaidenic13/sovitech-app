/**
 * @sovitech/registry: field, unit, question, badge and status-line registries,
 * the reserved-term list, the rule 8 number parser, datasets with approval
 * records, gates, registry validation, the sensitivity test and the loosening
 * snapshot (prompt 3 section 6).
 *
 * This entry holds the registries themselves (phase 1). Other entries:
 * `./reserved-terms` (the list and matcher), `./gates` (gates and approvals),
 * `./validation` (registry validation, the sensitivity test, the snapshot) and
 * `./test-utils` (tests/proposed/ only). Gate data lives in
 * packages/registry/gates/, outside src/ (prompt 3 section 5.4).
 */
export * from './units/units';
export * from './units/check';
export * from './units/plausibility';
export * from './number-parser';
export * from './copy';
export * from './formulas/unknown-policy';
export * from './datasets/datasets';
export * from './lookups';
export * from './production';
