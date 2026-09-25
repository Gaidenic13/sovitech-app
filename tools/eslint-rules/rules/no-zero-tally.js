/**
 * sovitech/no-zero-tally
 *
 * Bans tallies that start every key or slot at zero: a count or total per asset
 * type, system, floor or month written as 0 before anything was found for it. A key
 * nothing was found for then reads 0, where rule 1 says "None found is not zero" and
 * "A count of 0 needs a document, the owner or an engineer saying so"; and a total
 * built on the tally cannot tell an item that was 0 from one that was never known.
 * Counts come from the register, by type, only for what is there (2.5), in the
 * engine (packages/engine; the no-total-outside-engine ban), so this ban applies
 * there too.
 *
 * Banned (zero in any spelling, and names bound to one, as no-zero-fallback reads it):
 * - `.fill(0)` on anything: `new Array(n).fill(0)`, `Array(n).fill(0)`, `new Float64Array(n).fill(0)`;
 * - `Array.from(source, () => 0)` and `Array.from({ length: n }, () => 0)`;
 * - a key and zero pair built for every key: `Object.fromEntries(keys.map((k) => [k, 0]))`,
 *   `new Map(keys.map((k) => [k, 0]))`, and a literal list of such pairs;
 * - an object literal with a computed key set to zero: `{ [key]: 0 }` (the reducer form
 *   `keys.reduce((acc, k) => ({ ...acc, [k]: 0 }), {})` among them);
 * - a computed member set to zero: `tally[key] = 0`, and `tally.set(key, 0)`.
 * A literal 0 in any other place (a loop counter, a reduce seed, a named property
 * `{ page: 0 }`) is not a tally and passes.
 * Not covered: typed arrays, which JavaScript fills with zeros by itself
 * (`new Float64Array(n)`); the viewer's geometry buffers need them (phase 4).
 * Guardrails rule 1 ("Unknown propagates", "Zero is a value"), 2.5 ("Counting"); prompt 3 section 7.
 */
import { keyName } from '../lib/ast.js';
import { zeroTest } from './no-zero-fallback.js';

/**
 * The value an arrow or function returns when its body is one expression or one return statement.
 * @param {any} fn
 * @returns {any}
 */
function returnedValue(fn) {
  if (fn === undefined || fn === null) return undefined;
  if (fn.type !== 'ArrowFunctionExpression' && fn.type !== 'FunctionExpression') return undefined;
  if (fn.body.type !== 'BlockStatement') return fn.body;
  const statements = fn.body.body;
  const last = statements[statements.length - 1];
  return last?.type === 'ReturnStatement' ? last.argument : undefined;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow tallies that start every key at zero (guardrails rule 1, "Zero is a value").',
    },
    schema: [],
    messages: {
      tally:
        '{{what}} starts a tally at zero for keys nothing was found for yet, so each of them reads 0. "None found" is not zero: count from what is there, and leave the rest unknown (guardrails rule 1, "Zero is a value"; 2.5).',
    },
  },
  create(context) {
    const isZero = zeroTest(context);
    const report = (/** @type {any} */ node, /** @type {string} */ what) => context.report({ node, messageId: 'tally', data: { what } });

    /**
     * Whether a node is a key and zero pair: `[k, 0]`.
     * @param {any} node
     */
    const isZeroPair = (node) => node?.type === 'ArrayExpression' && node.elements.length === 2 && node.elements[1] !== null && isZero(node.elements[1]);

    /**
     * Whether an expression builds key and zero pairs: `keys.map((k) => [k, 0])`, `[[a, 0], [b, 0]]`.
     * @param {any} node
     */
    const buildsZeroPairs = (node) => {
      if (node === undefined || node === null) return false;
      if (node.type === 'ArrayExpression') return node.elements.length > 0 && node.elements.every((element) => element !== null && isZeroPair(element));
      if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && ['map', 'flatMap'].includes(keyName(node.callee) ?? '')) {
        return isZeroPair(returnedValue(node.arguments[0]));
      }
      if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && keyName(node.callee) === 'from' && node.callee.object.type === 'Identifier' && node.callee.object.name === 'Array') {
        return isZeroPair(returnedValue(node.arguments[1]));
      }
      return false;
    };

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression') return;
        const name = keyName(callee);
        // x.fill(0)
        if (name === 'fill' && node.arguments[0] !== undefined && isZero(node.arguments[0])) {
          report(node, '`.fill(0)`');
          return;
        }
        // Array.from(source, () => 0)
        if (name === 'from' && callee.object.type === 'Identifier' && callee.object.name === 'Array') {
          const value = returnedValue(node.arguments[1]);
          if (value !== undefined && value !== null && isZero(value)) report(node, '`Array.from(..., () => 0)`');
          return;
        }
        // Object.fromEntries(keys.map((k) => [k, 0]))
        if (name === 'fromEntries' && callee.object.type === 'Identifier' && callee.object.name === 'Object' && buildsZeroPairs(node.arguments[0])) {
          report(node, '`Object.fromEntries(... [key, 0] ...)`');
          return;
        }
        // tally.set(key, 0)
        if (name === 'set' && node.arguments.length === 2 && node.arguments[1] !== undefined && isZero(node.arguments[1])) {
          report(node, '`.set(key, 0)`');
        }
      },
      NewExpression(node) {
        // new Map(keys.map((k) => [k, 0]))
        if (node.callee.type === 'Identifier' && node.callee.name === 'Map' && buildsZeroPairs(node.arguments[0])) {
          report(node, '`new Map(... [key, 0] ...)`');
        }
      },
      Property(node) {
        // { [key]: 0 }
        if (node.parent?.type === 'ObjectExpression' && node.computed && node.kind === 'init' && isZero(node.value)) {
          report(node, '`{ [key]: 0 }`');
        }
      },
      AssignmentExpression(node) {
        // tally[key] = 0
        if (node.operator !== '=' || node.left.type !== 'MemberExpression' || !node.left.computed) return;
        if (node.left.property.type === 'Literal') return;
        if (isZero(node.right)) report(node, '`tally[key] = 0`');
      },
    };
  },
};
