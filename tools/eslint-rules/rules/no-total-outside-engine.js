/**
 * sovitech/no-total-outside-engine
 *
 * Totals are made in packages/engine, by the helper that applies a formula's
 * `unknownPolicy` (refuse, exclude and count, or range over options), so an
 * unknown item is never dropped from a figure without a trace (guardrails rule 1,
 * "Unknown propagates" and "Material exclusions"; 2.1: `calculated` candidates come
 * from the calculation engine only; prompt 3 sections 6 and 7). This rule applies
 * to apps/ and to every package but packages/engine (tools/eslint-rules/index.js)
 * and bans a total made anywhere else:
 * - a `reduce` or `reduceRight` whose callback adds or subtracts values (`+`, `-`,
 *   `+=`, `-=`, or a decimal method such as `plus`, `add`, `minus`, `sub`, `sum`),
 *   or whose callback is not written inline and whose start is not text, an array
 *   or an object;
 * - a loop (`for`, `for ... of`, `for ... in`, `while`, `do ... while`) or a per-item
 *   callback (`forEach`, `map` and the like) that adds values into a running total
 *   declared outside it (`total += row.area`, `total = total.plus(v)`,
 *   `totals[key] += v`);
 * - `Decimal.sum(...)` and `Math.sumPrecise(...)`.
 *
 * Passes: counting (`n += 1`, `n++`, `n += list.length`, `.length` itself), text
 * built with `+` (a string or template step, or a running value that starts as
 * text), maxima and minima (the conflict test's spread), and arithmetic that folds
 * no running value (`a * b`, `index + 1`).
 *
 * The rule cannot tell an engineering total from other arithmetic, so it bans
 * both. Adding up layout offsets or other non-engineering numbers needs a reviewed
 * entry in tools/eslint-rules/allowlist.js, or code that does not add them up.
 * Phase 0 review round 2, adversarial finding 7.
 */
import { calleeName } from '../lib/presence.js';
import {
  ADDITIVE_METHODS,
  LOOPS,
  accumulationsIn,
  boundNames,
  descendants,
  flatText,
  fold,
  isCountingStep,
  isPerItemCallback,
  isTextStep,
  unwrap,
} from '../lib/totals.js';

/** decimal.js and similar libraries that add up their arguments. */
const LIBRARY_SUMS = new Set(['Decimal.sum', 'Big.sum', 'BigNumber.sum', 'Math.sumPrecise']);

/**
 * The operands of a chain of `+` and `-`.
 * @param {any} node
 * @returns {any[]}
 */
function additiveOperands(node) {
  const bare = unwrap(node);
  if (bare?.type === 'BinaryExpression' && (bare.operator === '+' || bare.operator === '-')) {
    return [...additiveOperands(bare.left), ...additiveOperands(bare.right)];
  }
  return [bare];
}

/**
 * Whether a start value rules out a sum of numbers: text, an array, an object, or a
 * new collection (`new Map()`).
 * @param {any} start
 */
function startIsNotANumber(start) {
  const bare = unwrap(start);
  if (bare === undefined || bare === null) return false;
  if (isTextStep(bare) || bare.type === 'ArrayExpression' || bare.type === 'ObjectExpression') return true;
  if (bare.type === 'NewExpression') {
    const name = calleeName(bare.callee);
    return name !== undefined && !['Decimal', 'Big', 'BigNumber', 'Number'].includes(name);
  }
  return false;
}

/**
 * Whether an inline reducer adds values onto its accumulator: an additive chain, an
 * additive method or a `+=` / `-=` with a step that neither counts nor builds text.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} fn
 */
function reducerAddsValues(sourceCode, fn) {
  const accumulator = new Set(boundNames(fn.params[0]));
  /** @param {any} step */
  const readsAccumulator = (step) => {
    let root = unwrap(step);
    while (root?.type === 'MemberExpression') root = unwrap(root.object);
    return root?.type === 'Identifier' && accumulator.has(root.name);
  };
  /** @param {any} step */
  const isValue = (step) => !readsAccumulator(step) && !isCountingStep(step) && !isTextStep(step);
  for (const node of descendants(sourceCode, fn.body)) {
    if (node.type === 'BinaryExpression' && (node.operator === '+' || node.operator === '-')) {
      // Only the top of a chain: a + b + c is read once.
      const parent = node.parent;
      if (parent?.type === 'BinaryExpression' && (parent.operator === '+' || parent.operator === '-')) continue;
      const operands = additiveOperands(node);
      if (operands.some(isTextStep) || !operands.some(readsAccumulator)) continue;
      if (operands.some(isValue)) return true;
    } else if (node.type === 'AssignmentExpression' && (node.operator === '+=' || node.operator === '-=')) {
      if (!isTextStep(node.right) && !isCountingStep(node.right)) return true;
    } else if (node.type === 'CallExpression' && ADDITIVE_METHODS.has(fold(calleeName(node.callee)))) {
      const callee = unwrap(node.callee);
      const onAccumulator = (callee?.type === 'MemberExpression' && readsAccumulator(callee.object)) || node.arguments.some(readsAccumulator);
      if (onAccumulator && node.arguments.some(isValue)) return true;
    }
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow totals outside packages/engine: they go through the engine helper that applies the formula\'s unknownPolicy (guardrails rule 1, "Unknown propagates").',
    },
    schema: [],
    messages: {
      reduceTotal:
        'This reduce adds up values outside packages/engine. Totals go through the engine helper that applies the formula\'s unknownPolicy (phase 5), so an unknown item is refused, counted or ranged, never dropped (guardrails rule 1, "Unknown propagates"). Call the engine, or add a reviewed entry to tools/eslint-rules/allowlist.js.',
      loopTotal:
        'This loop adds values into a running total outside packages/engine. Totals go through the engine helper that applies the formula\'s unknownPolicy (phase 5), so an unknown item is refused, counted or ranged, never dropped (guardrails rule 1, "Unknown propagates"). Call the engine, or add a reviewed entry to tools/eslint-rules/allowlist.js.',
      librarySum:
        '`{{name}}` adds up values outside packages/engine. Totals go through the engine helper that applies the formula\'s unknownPolicy (phase 5; guardrails rule 1, "Unknown propagates"). Call the engine, or add a reviewed entry to tools/eslint-rules/allowlist.js.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    /** Accumulations already reported, so a loop inside a loop reports each once. */
    const reported = new Set();

    /** @param {any} scopeNode */
    function checkPerItem(scopeNode) {
      for (const item of accumulationsIn(sourceCode, scopeNode, 'additive')) {
        if (reported.has(item.node)) continue;
        reported.add(item.node);
        context.report({ node: item.node, messageId: 'loopTotal' });
      }
    }

    /** @param {any} node */
    function checkCallback(node) {
      if (isPerItemCallback(node)) checkPerItem(node);
    }

    return {
      CallExpression(node) {
        const callee = unwrap(node.callee);
        const method = calleeName(callee);
        if (callee?.type === 'MemberExpression' && (method === 'reduce' || method === 'reduceRight')) {
          const reducer = unwrap(node.arguments[0]);
          const start = node.arguments[1];
          const inline = reducer?.type === 'ArrowFunctionExpression' || reducer?.type === 'FunctionExpression';
          const adds = inline
            ? !isTextStep(start) && reducerAddsValues(sourceCode, reducer)
            : reducer !== undefined && !startIsNotANumber(start);
          if (adds) context.report({ node, messageId: 'reduceTotal' });
          return;
        }
        if (callee?.type === 'MemberExpression' && !callee.computed) {
          const name = flatText(sourceCode, callee);
          if (LIBRARY_SUMS.has(name)) context.report({ node, messageId: 'librarySum', data: { name } });
        }
      },
      ...Object.fromEntries([...LOOPS].map((type) => [type, checkPerItem])),
      ArrowFunctionExpression: checkCallback,
      FunctionExpression: checkCallback,
    };
  },
};
