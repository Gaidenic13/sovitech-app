/**
 * What the owner sees, as registries (docs/guardrails.md 2.8): badges, status
 * lines and stage labels, generated sentences, and the reserved-term allowances
 * their texts need.
 */
export { BADGES, BADGE_IDS, badgeById, firstBadge, type BadgeDefinition, type BadgeId } from './badges';
export { STATUS_LINES, STATUS_LINE_IDS, statusLineById, type StatusLineDefinition, type StatusLineId } from './status-lines';
export { GENERATED_SENTENCES, type GeneratedSentenceDefinition } from './sentences';
export { COPY_ALLOWANCES } from './allowances';
export { RULE_LINES, ruleLineById, type RuleLineDefinition, type RuleLineId } from './rule-lines';
