/**
 * The documented allowlist of the SOVITECH lint bans: the only files where a
 * ban does not apply, each with its reason. Inline `eslint-disable` comments do
 * not count: the lint-bans check (tools/checks/lint-bans/) runs the bans with
 * inline configuration switched off.
 *
 * An entry lets more code through, so adding one is reviewed like a loosening
 * (tools/eslint-rules/README.md, "Changing the allowlist"). Every entry is listed
 * in the README, and tools/eslint-rules/config.test.ts fails when one is not.
 */

/**
 * @typedef {object} AllowlistEntry
 * @property {string} rule the rule name without the `sovitech/` prefix
 * @property {string[]} files glob patterns relative to the repository root
 * @property {string} reason why these files carry no engineering value the ban protects,
 *   or why they are the one place the thing the ban forbids belongs
 */

/** @type {AllowlistEntry[]} */
export const allowlist = [
  {
    rule: 'no-number-coercion',
    files: ['packages/registry/src/number-parser/**'],
    reason:
      'The one Romanian and English number parser of guardrails rule 8 ("Parsing"), which prompt 3 section 6 places in packages/registry. It is where text becomes a number, with both readings of an ambiguous one.',
  },
  {
    rule: 'no-number-coercion',
    files: ['packages/view-model/src/formatting/**'],
    reason:
      'The formatting module of prompt 3 section 6 (view-model server side), which owns rounding at display and outward-rounded ranges (guardrails rule 9, "Rounding").',
  },
  {
    rule: 'no-number-coercion',
    files: ['apps/api/src/port.ts'],
    reason:
      'One function, readPort: the API listen port from SOVITECH_API_PORT. A port is configuration, not a field of the value model. The module holds that function and nothing else (config.test.ts checks it), so the exemption covers no other code.',
  },
  {
    rule: 'css-no-colour-literals',
    files: ['packages/ui/src/tokens.css'],
    reason:
      'The one tokens file, where the brand colours are written as CSS custom properties (prompt 3 section 6, "Brand assets"; section 14 item 3).',
  },
];

/**
 * The allowlisted file patterns of one rule.
 * @param {string} rule
 * @returns {string[]}
 */
export function allowlistedFiles(rule) {
  return allowlist.filter((entry) => entry.rule === rule).flatMap((entry) => entry.files);
}
