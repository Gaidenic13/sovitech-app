/**
 * sovitech/no-filtered-sum
 *
 * Bans totals that leave out the missing values and add up the rest:
 * `xs.filter((x) => x !== undefined).reduce((sum, x) => sum + x, ...)`,
 * `values.filter(Boolean).reduce(...)`, `Math.max(...xs.filter(isDefined))`, and
 * the same through `map`, `flatMap` and other array steps, or through a const that
 * holds the filtered array. The unknown items vanish from the figure without a
 * trace. Rule 1 wants the opposite: a total that leaves unknown items out says so
 * ("Incomplete: excludes ..."), unless every excluded item is `minorForTotals`,
 * and each formula declares its `unknownPolicy`.
 *
 * Since the phase 0 review round 2 (adversarial finding 7; the finding 22 residual
 * of the second verification) it also bans any accumulation whose body branches on
 * a missing value:
 * - a reduce callback that does arithmetic and tests for undefined, null or NaN
 *   (`xs.reduce((s, v) => (v === undefined ? s : s + v), start)`);
 * - a loop (`for`, `for ... of`, `for ... in`, `while`, `do ... while`) or a per-item
 *   callback (`forEach`, `map` and the like) that folds a value into a running total
 *   (`s += v`, `s = s + v`, `s = s.plus(v)`, `m = Math.max(m, v)`) and tests for a
 *   missing value anywhere in its body (`if (v === undefined) continue;`,
 *   `if (v !== undefined) s += v;`, `if (!v) continue;`);
 * - the same loop or callback over an array that already dropped its missing values
 *   (`for (const v of xs.filter(isDefined)) s += v;`, `known.forEach(...)`).
 * Steps that only count (`n += 1`, `n += list.length`) or build text pass, as a
 * `.length` of a filtered array does.
 *
 * Totals go through the engine helper that applies a formula's unknownPolicy
 * (prompt 3 section 6, packages/engine; written in phase 5). Any other file needs
 * a reviewed entry in tools/eslint-rules/allowlist.js. Outside packages/engine,
 * sovitech/no-total-outside-engine also bans totals that do not branch at all.
 *
 * What counts as dropping missing values: a filter whose callback tests its
 * argument (or a property of it) for being present (`!== undefined`, `!= null`,
 * `typeof ... === 'number'`, `instanceof`, `!!`, a presence-check function such as
 * `Boolean`, `isDefined` or `Number.isFinite`, or the truthiness of the item
 * itself, `filter((x) => x)`), and a flatMap that returns
 * `[]` for a missing value. What counts as a total: a reduce whose callback does
 * arithmetic (or is not written inline), and a call to sum, total, mean, average,
 * max or min (Math.max, Decimal.sum and the like) that takes the filtered array.
 * A filter on anything else (`items.filter((item) => item.inScope)`) passes.
 *
 * Guardrails rule 1 ("Unknown propagates": no numeric stand-in, material
 * exclusions); prompt 3 section 7.
 */
import { calleeName, isPresenceCheckName } from '../lib/presence.js';
import { constantInitialiser, resolveVariable } from '../lib/scope.js';
import {
  ABSENCE_CHECKS,
  ARITHMETIC_METHODS,
  LOOPS,
  accumulationsIn,
  boundNames,
  branchesOnMissing,
  descendants,
  fold,
  isNothing,
  isPerItemCallback,
  itemTexts,
  perItemNames,
  unwrap,
} from '../lib/totals.js';

/** Array steps a dropped value stays dropped through. */
const PASS_THROUGH = new Set([
  'map',
  'filter',
  'flatMap',
  'flat',
  'slice',
  'sort',
  'toSorted',
  'reverse',
  'toReversed',
  'concat',
  'with',
]);

/** Folded names of calls that aggregate an array they are given. */
const AGGREGATES = new Set(['sum', 'sumby', 'sumof', 'total', 'totalof', 'mean', 'meanby', 'average', 'avg', 'max', 'maxby', 'min', 'minby']);

/** How many const hops the array is followed through. */
const MAX_HOPS = 8;

/**
 * Whether an expression reads the parameter `name` or a property of it.
 * @param {any} node
 * @param {string} name
 */
function readsParameter(node, name) {
  let current = unwrap(node);
  while (current?.type === 'MemberExpression') current = unwrap(current.object);
  return current?.type === 'Identifier' && current.name === name;
}

/**
 * Whether `test` keeps only the items whose `name` (or a property of it) is present.
 * @param {any} test
 * @param {string} name
 * @returns {boolean}
 */
function keepsPresent(test, name) {
  const node = unwrap(test);
  if (node === null || node === undefined) return false;
  switch (node.type) {
    case 'LogicalExpression':
      if (node.operator === '&&') return keepsPresent(node.left, name) || keepsPresent(node.right, name);
      return keepsPresent(node.left, name) && keepsPresent(node.right, name);
    case 'BinaryExpression': {
      if (node.operator === '!==' || node.operator === '!=') {
        if (isNothing(node.right)) return readsParameter(node.left, name);
        if (isNothing(node.left)) return readsParameter(node.right, name);
      }
      if (node.operator === 'instanceof') return readsParameter(node.left, name);
      const typeofSide = [node.left, node.right].find((side) => side.type === 'UnaryExpression' && side.operator === 'typeof');
      if (typeofSide !== undefined && readsParameter(typeofSide.argument, name)) {
        const other = typeofSide === node.left ? node.right : node.left;
        const kind = other.type === 'Literal' ? other.value : undefined;
        if (node.operator === '===' || node.operator === '==') return kind !== 'undefined';
        if (node.operator === '!==' || node.operator === '!=') return kind === 'undefined';
      }
      return false;
    }
    case 'UnaryExpression': {
      if (node.operator !== '!') return false;
      const inner = unwrap(node.argument);
      // !!x
      if (inner.type === 'UnaryExpression' && inner.operator === '!') return readsParameter(inner.argument, name) || keepsPresent(inner.argument, name);
      // !(x === undefined), !(x == null)
      if (inner.type === 'BinaryExpression' && (inner.operator === '===' || inner.operator === '==')) {
        return (isNothing(inner.right) && readsParameter(inner.left, name)) || (isNothing(inner.left) && readsParameter(inner.right, name));
      }
      // !isNil(x)
      if (inner.type === 'CallExpression' && ABSENCE_CHECKS.has(fold(calleeName(inner.callee)))) {
        return inner.arguments.some((argument) => readsParameter(argument, name));
      }
      return false;
    }
    case 'CallExpression':
      return isPresenceCheckName(calleeName(node.callee)) && node.arguments.some((argument) => readsParameter(argument, name));
    case 'Identifier':
      // Truthiness of the item itself: filter((x) => x). A property read alone, such as
      // filter((item) => item.inScope), is a flag test, not a presence test.
      return node.name === name;
    default:
      return false;
  }
}

/**
 * The expression a one-expression function returns, and its first parameter's name.
 * @param {any} fn
 * @returns {{ body: any, name: string } | undefined}
 */
function simpleFunction(fn) {
  const node = unwrap(fn);
  if (node?.type !== 'ArrowFunctionExpression' && node?.type !== 'FunctionExpression') return undefined;
  const first = node.params[0];
  const param = first?.type === 'AssignmentPattern' ? first.left : first;
  if (param?.type !== 'Identifier') return undefined;
  if (node.body.type !== 'BlockStatement') return { body: node.body, name: param.name };
  const statements = node.body.body;
  const last = statements[statements.length - 1];
  if (statements.length === 1 && last?.type === 'ReturnStatement' && last.argument !== null) return { body: last.argument, name: param.name };
  return undefined;
}

/**
 * Whether a filter callback drops missing values.
 * @param {any} callback
 */
function dropsMissing(callback) {
  const node = unwrap(callback);
  if (node === undefined || node === null) return false;
  if (node.type === 'Identifier' || node.type === 'MemberExpression') return isPresenceCheckName(calleeName(node));
  const fn = simpleFunction(node);
  return fn !== undefined && keepsPresent(fn.body, fn.name);
}

/** @param {any} node */
function isEmptyArray(node) {
  const bare = unwrap(node);
  return bare?.type === 'ArrayExpression' && bare.elements.length === 0;
}

/**
 * Whether a flatMap callback returns [] for a missing value: `(x) => x === undefined ? [] : [x]`,
 * `(x) => x ?? []`.
 * @param {any} callback
 */
function flatMapDropsMissing(callback) {
  const fn = simpleFunction(callback);
  if (fn === undefined) return false;
  const body = unwrap(fn.body);
  if (body.type === 'LogicalExpression' && body.operator === '??') return isEmptyArray(body.right) && readsParameter(body.left, fn.name);
  if (body.type !== 'ConditionalExpression') return false;
  if (isEmptyArray(body.alternate)) return keepsPresent(body.test, fn.name);
  if (isEmptyArray(body.consequent)) {
    const test = unwrap(body.test);
    // x === undefined ? [] : [x]  or  !x ? [] : [x]
    if (test.type === 'UnaryExpression' && test.operator === '!') return keepsPresent(test.argument, fn.name);
    if (test.type === 'BinaryExpression' && (test.operator === '===' || test.operator === '==')) {
      return (isNothing(test.right) && readsParameter(test.left, fn.name)) || (isNothing(test.left) && readsParameter(test.right, fn.name));
    }
  }
  return false;
}

/**
 * Whether a reducer does arithmetic: `+`, `-`, `*`, `/`, `%`, `**`, their assignments,
 * or a decimal method such as `plus`. A reducer that is not written inline counts.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} callback
 */
function doesArithmetic(sourceCode, callback) {
  const node = unwrap(callback);
  if (node?.type !== 'ArrowFunctionExpression' && node?.type !== 'FunctionExpression') return true;
  let found = false;
  /** @param {any} current */
  const visit = (current) => {
    if (found || current === null || typeof current !== 'object' || typeof current.type !== 'string') return;
    if (current.type === 'BinaryExpression' && ['+', '-', '*', '/', '%', '**'].includes(current.operator)) found = true;
    else if (current.type === 'AssignmentExpression' && ['+=', '-=', '*=', '/=', '%=', '**='].includes(current.operator)) found = true;
    else if (current.type === 'CallExpression' && ARITHMETIC_METHODS.has(fold(calleeName(current.callee)))) found = true;
    if (found) return;
    for (const key of sourceCode.visitorKeys[current.type] ?? []) {
      const child = current[key];
      if (Array.isArray(child)) child.forEach(visit);
      else visit(child);
    }
  };
  visit(node.body);
  return found;
}

/**
 * Whether an inline reducer tests its accumulator or its item for being missing.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} callback
 */
function reducerBranchesOnMissing(sourceCode, callback) {
  const node = unwrap(callback);
  if (node?.type !== 'ArrowFunctionExpression' && node?.type !== 'FunctionExpression') return false;
  const names = [...boundNames(node.params[0]), ...boundNames(node.params[1])];
  return branchesOnMissing(sourceCode, node.body, new Set(names));
}

const ADVICE =
  'Total through the engine helper that applies the formula\'s unknownPolicy (phase 5), or add a reviewed entry to tools/eslint-rules/allowlist.js.';

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow totals that leave out missing values and add up the rest (guardrails rule 1, "Unknown propagates").',
    },
    schema: [],
    messages: {
      filteredSum: `This total drops the missing values, then adds up the rest, so unknown items vanish from the figure (guardrails rule 1, "Unknown propagates"). ${ADVICE}`,
      reducerSkipsMissing: `This reduce does arithmetic and branches on a missing value (undefined, null or NaN), so unknown items drop out of the figure (guardrails rule 1, "Unknown propagates"). ${ADVICE}`,
      loopSkipsMissing: `This loop folds values into a running total and branches on a missing value (undefined, null or NaN), or runs over an array that dropped its missing values, so unknown items drop out of the figure (guardrails rule 1, "Unknown propagates"). ${ADVICE}`,
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    /** Accumulations already reported, so a loop inside a loop reports each once. */
    const reported = new Set();

    /**
     * Whether an array expression has had its missing values dropped on the way here.
     * @param {any} node
     * @param {number} hops
     * @returns {boolean}
     */
    function hasDroppedMissing(node, hops) {
      const bare = unwrap(node);
      if (bare === null || bare === undefined) return false;
      if (bare.type === 'Identifier') {
        if (hops >= MAX_HOPS) return false;
        const init = constantInitialiser(resolveVariable(sourceCode, bare));
        return init !== undefined && hasDroppedMissing(init, hops + 1);
      }
      if (bare.type === 'ArrayExpression') {
        return bare.elements.some((element) => element?.type === 'SpreadElement' && hasDroppedMissing(element.argument, hops));
      }
      if (bare.type !== 'CallExpression') return false;
      const callee = unwrap(bare.callee);
      if (callee?.type === 'MemberExpression') {
        const method = calleeName(callee);
        if (method === 'filter' && dropsMissing(bare.arguments[0])) return true;
        if (method === 'flatMap' && flatMapDropsMissing(bare.arguments[0])) return true;
        if (method !== undefined && PASS_THROUGH.has(method)) return hasDroppedMissing(callee.object, hops);
        // Array.from(filtered), [...filtered]
        if (method === 'from' && callee.object.type === 'Identifier' && callee.object.name === 'Array') {
          return hasDroppedMissing(bare.arguments[0], hops);
        }
      }
      return false;
    }

    /**
     * Whether a step reads an element of an array that dropped its missing values: `known[i]`.
     * @param {readonly any[]} steps
     */
    function readsDropped(steps) {
      for (const step of steps) {
        for (const node of descendants(sourceCode, step)) {
          if (node.type === 'MemberExpression' && node.computed && hasDroppedMissing(node.object, 0)) return true;
        }
      }
      return false;
    }

    /**
     * The array a loop or per-item callback runs over, when the code names it.
     * @param {any} scopeNode
     */
    function perItemSource(scopeNode) {
      if (scopeNode.type === 'ForOfStatement') return scopeNode.right;
      if (!LOOPS.has(scopeNode.type)) {
        const call = scopeNode.parent;
        const callee = unwrap(call.callee);
        return calleeName(callee) === 'from' ? call.arguments[0] : callee.object;
      }
      return undefined;
    }

    /**
     * Reports every accumulation in a loop or per-item callback that branches on a
     * missing value, or that runs over an array that dropped its missing values.
     * @param {any} scopeNode
     */
    function checkPerItem(scopeNode) {
      const found = accumulationsIn(sourceCode, scopeNode, 'arithmetic');
      if (found.length === 0) return;
      const source = perItemSource(scopeNode);
      const overDropped = source !== undefined && hasDroppedMissing(source, 0);
      const names = perItemNames(scopeNode);
      for (const item of found) {
        if (reported.has(item.node)) continue;
        const skips =
          overDropped || readsDropped(item.steps) || branchesOnMissing(sourceCode, scopeNode.body, itemTexts(sourceCode, names, item.steps));
        if (!skips) continue;
        reported.add(item.node);
        context.report({ node: item.node, messageId: 'loopSkipsMissing' });
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
          if (!doesArithmetic(sourceCode, node.arguments[0])) return;
          if (hasDroppedMissing(callee.object, 0)) context.report({ node, messageId: 'filteredSum' });
          else if (reducerBranchesOnMissing(sourceCode, node.arguments[0])) context.report({ node, messageId: 'reducerSkipsMissing' });
          return;
        }
        if (AGGREGATES.has(fold(method))) {
          const takesDropped = node.arguments.some((argument) =>
            argument.type === 'SpreadElement' ? hasDroppedMissing(argument.argument, 0) : hasDroppedMissing(argument, 0),
          );
          if (takesDropped) context.report({ node, messageId: 'filteredSum' });
        }
      },
      ForStatement: checkPerItem,
      ForOfStatement: checkPerItem,
      ForInStatement: checkPerItem,
      WhileStatement: checkPerItem,
      DoWhileStatement: checkPerItem,
      ArrowFunctionExpression: checkCallback,
      FunctionExpression: checkCallback,
    };
  },
};
