/**
 * Names of functions that test whether a value is present (not undefined or
 * null, or a real number), shared by no-zero-fallback (conditionals that test a
 * value, then fall back to 0) and no-filtered-sum (filters that drop missing
 * values before a total). Matching ignores case and anything but letters, so
 * `isDefined`, `is_defined` and `IS_DEFINED` are one name.
 */

/** Presence checks, written in their folded form (lower case, letters only). */
const PRESENCE_CHECKS = new Set([
  'boolean',
  'defined',
  'isdefined',
  'known',
  'isknown',
  'present',
  'ispresent',
  'exists',
  'hasvalue',
  'notnull',
  'isnotnull',
  'nonnull',
  'isnonnull',
  'notnullish',
  'isnotnullish',
  'nonnullish',
  'isnonnullish',
  'notnil',
  'isnotnil',
  'notundefined',
  'isnotundefined',
  'nonnullable',
  'isnonnullable',
  'isnumber',
  'isfinite',
  'isfinitenumber',
  'isinteger',
  'issafeinteger',
  'isdecimal',
]);

/**
 * Whether a function name reads as a presence check.
 * @param {string | undefined} name
 * @returns {boolean}
 */
export function isPresenceCheckName(name) {
  if (name === undefined) return false;
  return PRESENCE_CHECKS.has(name.toLowerCase().replace(/[^a-z]/g, ''));
}

/**
 * The name a callee is called by: `f` for `f(x)`, `isFinite` for `Number.isFinite(x)`.
 * @param {any} callee
 * @returns {string | undefined}
 */
export function calleeName(callee) {
  if (callee === null || callee === undefined) return undefined;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') return callee.property.name;
  if (callee.type === 'ChainExpression') return calleeName(callee.expression);
  return undefined;
}
