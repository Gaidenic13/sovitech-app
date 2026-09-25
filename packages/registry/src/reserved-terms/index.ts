/**
 * @sovitech/registry/reserved-terms: the one reserved-term list of
 * docs/guardrails.md 2.8 (English and Romanian) and its matcher (whole word,
 * ignoring case and diacritics). Used by the copy check and the AI output
 * validator alike.
 *
 * The list and the matcher live in ../reserved-terms.ts, the one module the
 * reserved-term check skips for the list constants (LIST_MODULE in
 * tools/checks/reserved-terms/scan.ts). This entry only re-exports it.
 */
export * from '../reserved-terms';
