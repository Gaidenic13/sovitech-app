/**
 * The output validator (guardrails section 6, "AI boundary"; rules 1, 2, 3, 6, 9, 11,
 * 12, 14 and 2.8). The app and the eval runner use this one validator.
 */
export * from './output';
export { PROSE_RULES, proseIssues, type ProseContext, type ProseIssue, type ProseRule } from './prose';
export { identifiersNotInCatalogue, inCatalogue, productReferences, type ProductCatalogue, type ProductReference } from './products';
export { findTokens, TOKEN_KINDS, TOKEN_SHAPE, type TokenKind, type TokenMatch } from './tokens';
export { NUMBER_WORDS } from './numbers';
export { BMS_TERMS, CONTROL_PATTERNS, LIFE_SAFETY_TERMS } from './life-safety';
