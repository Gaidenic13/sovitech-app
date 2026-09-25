/**
 * Helpers shared by no-filtered-sum and no-total-outside-engine: what an
 * accumulation is (a running value that an assignment folds a step into, in a
 * loop or in a callback that runs once per item), which steps only count or
 * build text, and what a test for a missing value (undefined, null or NaN)
 * looks like. Guardrails rule 1 ("Unknown propagates": no numeric stand-in;
 * material exclusions); phase 0 review round 2, adversarial finding 7.
 */
import { calleeName, isPresenceCheckName } from './presence.js';
import { resolveVariable } from './scope.js';

/** Loop statements: their body runs once per item. */
export const LOOPS = new Set(['ForStatement', 'ForOfStatement', 'ForInStatement', 'WhileStatement', 'DoWhileStatement']);

/** Methods whose function argument runs once per item (the reduce family is read separately). */
export const PER_ITEM_METHODS = new Set([
  'forEach',
  'map',
  'flatMap',
  'filter',
  'some',
  'every',
  'find',
  'findLast',
  'findIndex',
  'findLastIndex',
  'each',
  'from',
]);

/** Absence checks: `isNil(x)` is true for a missing value. */
export const ABSENCE_CHECKS = new Set(['isnil', 'isnull', 'isundefined', 'isnullish', 'ismissing', 'isunknown']);

const ARITHMETIC_OPERATORS = new Set(['+', '-', '*', '/', '%', '**']);
const ADDITIVE_OPERATORS = new Set(['+', '-']);

/** Methods that do arithmetic on a number-like object (decimal.js and the like), folded. */
export const ARITHMETIC_METHODS = new Set(['plus', 'add', 'minus', 'sub', 'times', 'mul', 'dividedby', 'div', 'max', 'min', 'sum']);
/** The additive ones: what a total is made of. */
export const ADDITIVE_METHODS = new Set(['plus', 'add', 'minus', 'sub', 'sum']);

/** @param {string | undefined} name */
export function fold(name) {
  return name === undefined ? '' : name.toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Strips wrappers that do not change a value.
 * @param {any} node
 * @returns {any}
 */
export function unwrap(node) {
  let current = node;
  while (
    current !== null &&
    current !== undefined &&
    (current.type === 'TSAsExpression' ||
      current.type === 'TSSatisfiesExpression' ||
      current.type === 'TSNonNullExpression' ||
      current.type === 'TSTypeAssertion' ||
      current.type === 'ChainExpression')
  ) {
    current = current.expression;
  }
  return current;
}

/**
 * `undefined`, `null` or `void ...`.
 * @param {any} node
 */
export function isNothing(node) {
  const bare = unwrap(node);
  if (bare === null || bare === undefined) return false;
  if (bare.type === 'Identifier') return bare.name === 'undefined';
  if (bare.type === 'Literal') return bare.value === null && bare.regex === undefined && bare.bigint === undefined;
  return bare.type === 'UnaryExpression' && bare.operator === 'void';
}

/**
 * The source text of a node, with the wrappers of unwrap() removed and no whitespace.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} node
 */
export function flatText(sourceCode, node) {
  return sourceCode.getText(unwrap(node)).replace(/\s+/g, '');
}

/**
 * Every node under `root`, root included, nested functions included.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} root
 * @returns {Generator<any>}
 */
export function* descendants(sourceCode, root) {
  if (root === null || root === undefined) return;
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === null || typeof current !== 'object' || typeof current.type !== 'string') continue;
    yield current;
    for (const key of sourceCode.visitorKeys[current.type] ?? []) {
      const child = current[key];
      if (Array.isArray(child)) stack.push(...child);
      else if (child !== null && child !== undefined) stack.push(child);
    }
  }
}

/**
 * Whether a function is the per-item callback of an array method: `xs.forEach((x) => ...)`.
 * @param {any} fn
 */
export function isPerItemCallback(fn) {
  const call = fn.parent;
  if (call?.type !== 'CallExpression' || !call.arguments.includes(fn)) return false;
  const callee = unwrap(call.callee);
  return callee?.type === 'MemberExpression' && PER_ITEM_METHODS.has(calleeName(callee) ?? '');
}

/**
 * The source range inside which a variable is fresh on every item: the loop's
 * own node (its per-iteration bindings included), except a `for (;;)` loop,
 * whose initialiser runs once; for a callback, the function with its parameters.
 * @param {any} scopeNode a loop statement or a per-item callback
 * @returns {[number, number]}
 */
function perItemRange(scopeNode) {
  return scopeNode.type === 'ForStatement' ? scopeNode.body.range : scopeNode.range;
}

/**
 * The identifier an assignment target is rooted at: `total` for `total`, `totals[key]` or `acc.area`.
 * @param {any} target
 */
function rootIdentifier(target) {
  let current = unwrap(target);
  while (current?.type === 'MemberExpression') current = unwrap(current.object);
  return current?.type === 'Identifier' ? current : undefined;
}

/**
 * Whether the running value outlives one item: declared outside the loop body or callback.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} target
 * @param {any} scopeNode
 */
export function outlivesOneItem(sourceCode, target, scopeNode) {
  const root = rootIdentifier(target);
  if (root === undefined) return true;
  const variable = resolveVariable(sourceCode, root);
  const def = variable?.defs[0];
  if (def === undefined) return true;
  const [start, end] = perItemRange(scopeNode);
  return !(def.name.range[0] >= start && def.name.range[1] <= end);
}

/**
 * The operands of a chain of binary operators of one family: `a + b - c` gives a, b, c.
 * @param {any} node
 * @param {Set<string>} operators
 * @returns {any[]}
 */
function chainOperands(node, operators) {
  const bare = unwrap(node);
  if (bare?.type === 'BinaryExpression' && operators.has(bare.operator)) {
    return [...chainOperands(bare.left, operators), ...chainOperands(bare.right, operators)];
  }
  return [bare];
}

/**
 * The steps an expression adds to `targetText`: for `x + a + b` with x the target, a and b;
 * for `x.plus(a)`, a; for `Math.max(x, a)`, a. Undefined when the expression does no
 * arithmetic on the target.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} expression
 * @param {string} targetText
 * @param {'arithmetic' | 'additive'} kind
 * @returns {any[] | undefined}
 */
function stepsOnto(sourceCode, expression, targetText, kind) {
  const operators = kind === 'additive' ? ADDITIVE_OPERATORS : ARITHMETIC_OPERATORS;
  const methods = kind === 'additive' ? ADDITIVE_METHODS : ARITHMETIC_METHODS;
  const node = unwrap(expression);
  if (node?.type === 'BinaryExpression' && operators.has(node.operator)) {
    const operands = chainOperands(node, operators);
    const at = operands.findIndex((operand) => flatText(sourceCode, operand) === targetText);
    if (at !== -1) return operands.filter((_, index) => index !== at);
    for (const operand of operands) {
      const inner = stepsOnto(sourceCode, operand, targetText, kind);
      if (inner !== undefined) return [...inner, ...operands.filter((other) => other !== operand)];
    }
    return undefined;
  }
  if (node?.type === 'CallExpression' && methods.has(fold(calleeName(node.callee)))) {
    const callee = unwrap(node.callee);
    if (callee?.type === 'MemberExpression') {
      // x.plus(a), x.plus(a).plus(b)
      if (flatText(sourceCode, callee.object) === targetText) return [...node.arguments];
      const inner = stepsOnto(sourceCode, callee.object, targetText, kind);
      if (inner !== undefined) return [...inner, ...node.arguments];
    }
    // Math.max(x, a), Decimal.add(x, a), sum(x, a)
    const at = node.arguments.findIndex((argument) => flatText(sourceCode, argument) === targetText);
    if (at !== -1) return node.arguments.filter((_, index) => index !== at);
  }
  return undefined;
}

/**
 * An accumulation: an assignment that folds steps into a running value, such as
 * `total += x`, `total = total + x`, `total = total.plus(x)` or `m = Math.max(m, x)`.
 * `kind` 'additive' keeps only sums and differences.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} node
 * @param {'arithmetic' | 'additive'} kind
 * @returns {{ target: any, steps: any[] } | undefined}
 */
export function accumulation(sourceCode, node, kind) {
  if (node.type !== 'AssignmentExpression') return undefined;
  if (node.operator !== '=') {
    const operator = node.operator.slice(0, -1);
    const operators = kind === 'additive' ? ADDITIVE_OPERATORS : ARITHMETIC_OPERATORS;
    return operators.has(operator) ? { target: node.left, steps: [node.right] } : undefined;
  }
  const steps = stepsOnto(sourceCode, node.right, flatText(sourceCode, node.left), kind);
  return steps === undefined ? undefined : { target: node.left, steps };
}

/**
 * A step that counts rather than adds a value: a number written in the code, or a
 * `.length` or `.size`. A count of present items is not a total of values, as the
 * `.length` of a filtered array is not (tools/eslint-rules/README.md).
 * @param {any} node
 * @returns {boolean}
 */
export function isCountingStep(node) {
  const bare = unwrap(node);
  if (bare === null || bare === undefined) return false;
  if (bare.type === 'Literal') return typeof bare.value === 'number' || typeof bare.value === 'bigint';
  if (bare.type === 'UnaryExpression' && (bare.operator === '-' || bare.operator === '+')) return isCountingStep(bare.argument);
  if (bare.type === 'MemberExpression' && !bare.computed && bare.property.type === 'Identifier') {
    return bare.property.name === 'length' || bare.property.name === 'size';
  }
  return false;
}

/**
 * A step that builds text: a string or a template.
 * @param {any} node
 */
export function isTextStep(node) {
  const bare = unwrap(node);
  return (bare?.type === 'Literal' && typeof bare.value === 'string') || bare?.type === 'TemplateLiteral';
}

/**
 * Whether the running value was declared with text as its first value (`let out = ''`).
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} target
 */
export function startsAsText(sourceCode, target) {
  const bare = unwrap(target);
  if (bare?.type !== 'Identifier') return false;
  const def = resolveVariable(sourceCode, bare)?.defs[0];
  if (def?.type !== 'Variable') return false;
  return isTextStep(def.node.init);
}

/**
 * Whether an accumulation adds values, as opposed to counting or building text.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {{ target: any, steps: any[] }} found
 */
export function addsValues(sourceCode, found) {
  if (found.steps.length === 0) return false;
  if (found.steps.some(isTextStep) || startsAsText(sourceCode, found.target)) return false;
  return !found.steps.every(isCountingStep);
}

/** @param {any} node */
function isTypeofOperand(node) {
  const bare = unwrap(node);
  return bare?.type === 'UnaryExpression' && bare.operator === 'typeof';
}

/**
 * Whether a node tests a value for being missing: a comparison with undefined or
 * null, `typeof`, `x !== x` (NaN), `isNaN`, a presence or absence check
 * (`isDefined`, `Boolean`, `Number.isFinite`, `isNil`, ...), `instanceof`, `in`,
 * `??` and `??=`.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} node
 * @returns {boolean}
 */
export function isMissingTest(sourceCode, node) {
  const bare = unwrap(node);
  if (bare === null || bare === undefined) return false;
  switch (bare.type) {
    case 'BinaryExpression':
      if (['===', '!==', '==', '!='].includes(bare.operator)) {
        if (isNothing(bare.left) || isNothing(bare.right)) return true;
        if (isTypeofOperand(bare.left) || isTypeofOperand(bare.right)) return true;
        if ([bare.left, bare.right].some((side) => unwrap(side)?.type === 'Identifier' && unwrap(side).name === 'NaN')) return true;
        // x !== x is true only for NaN.
        return flatText(sourceCode, bare.left) === flatText(sourceCode, bare.right);
      }
      return bare.operator === 'instanceof' || bare.operator === 'in';
    case 'LogicalExpression':
      return bare.operator === '??';
    case 'AssignmentExpression':
      return bare.operator === '??=';
    case 'CallExpression': {
      const name = calleeName(bare.callee);
      return fold(name) === 'isnan' || isPresenceCheckName(name) || ABSENCE_CHECKS.has(fold(name));
    }
    default:
      return false;
  }
}

/**
 * Whether a node is the test of a branch: an if, a conditional, a loop test, or the
 * left side of `&&` or `||`.
 * @param {any} node
 */
function isBranchTest(node) {
  const parent = node.parent;
  if (parent === null || parent === undefined) return false;
  switch (parent.type) {
    case 'IfStatement':
    case 'ConditionalExpression':
    case 'WhileStatement':
    case 'DoWhileStatement':
    case 'ForStatement':
      return parent.test === node;
    case 'LogicalExpression':
      return (parent.operator === '&&' || parent.operator === '||') && parent.left === node;
    default:
      return false;
  }
}

/**
 * Whether a branch test reads the truthiness of one of `texts`: `if (v)`, `if (!v)`,
 * `if (!!row.area)`. A test of another property (`if (row.visible)`) is a flag, not a
 * presence test.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} node
 * @param {ReadonlySet<string>} texts
 */
function testsTruthinessOf(sourceCode, node, texts) {
  let bare = unwrap(node);
  while (bare?.type === 'UnaryExpression' && bare.operator === '!') bare = unwrap(bare.argument);
  return bare !== undefined && bare !== null && texts.has(flatText(sourceCode, bare));
}

/**
 * The names and texts a truthiness test is read against: the item names given,
 * and each step with every object it is read from (`row.area.value`, `row.area`
 * and `row`).
 * @param {import('eslint').SourceCode} sourceCode
 * @param {readonly string[]} itemNames
 * @param {readonly any[]} steps
 * @returns {Set<string>}
 */
export function itemTexts(sourceCode, itemNames, steps) {
  const texts = new Set(itemNames);
  for (const step of steps) {
    let current = unwrap(step);
    while (current !== undefined && current !== null) {
      texts.add(flatText(sourceCode, current));
      current = current.type === 'MemberExpression' ? unwrap(current.object) : undefined;
    }
  }
  return texts;
}

/**
 * Whether anything under `body` (nested functions included) branches on a missing value.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} body
 * @param {ReadonlySet<string>} texts the item names and step texts a truthiness test is read against
 */
export function branchesOnMissing(sourceCode, body, texts) {
  for (const node of descendants(sourceCode, body)) {
    if (isMissingTest(sourceCode, node)) return true;
    if (isBranchTest(node) && testsTruthinessOf(sourceCode, node, texts)) return true;
  }
  return false;
}

/**
 * The names a pattern binds: `v` for `v`, `area` and `rest` for `{ area, ...rest }`.
 * @param {any} pattern
 * @returns {string[]}
 */
export function boundNames(pattern) {
  if (pattern === null || pattern === undefined) return [];
  switch (pattern.type) {
    case 'Identifier':
      return [pattern.name];
    case 'VariableDeclaration':
      return pattern.declarations.flatMap((/** @type {any} */ declaration) => boundNames(declaration.id));
    case 'ObjectPattern':
      return pattern.properties.flatMap((/** @type {any} */ property) =>
        property.type === 'RestElement' ? boundNames(property.argument) : boundNames(property.value),
      );
    case 'ArrayPattern':
      return pattern.elements.flatMap((/** @type {any} */ element) => boundNames(element));
    case 'RestElement':
      return boundNames(pattern.argument);
    case 'AssignmentPattern':
      return boundNames(pattern.left);
    default:
      return [];
  }
}

/**
 * The item names of a loop or per-item callback: the loop variable of `for ... of`
 * and `for ... in`, or the callback's first parameter.
 * @param {any} scopeNode
 * @returns {string[]}
 */
export function perItemNames(scopeNode) {
  if (scopeNode.type === 'ForOfStatement' || scopeNode.type === 'ForInStatement') return boundNames(scopeNode.left);
  if (scopeNode.type === 'ArrowFunctionExpression' || scopeNode.type === 'FunctionExpression') return boundNames(scopeNode.params[0]);
  return [];
}

/**
 * The accumulations under a loop body or callback that carry a running value
 * past one item.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} scopeNode a loop statement or a per-item callback
 * @param {'arithmetic' | 'additive'} kind
 * @returns {Array<{ node: any, target: any, steps: any[] }>}
 */
export function accumulationsIn(sourceCode, scopeNode, kind) {
  const found = [];
  for (const node of descendants(sourceCode, scopeNode.body)) {
    if (node.type !== 'AssignmentExpression') continue;
    const step = accumulation(sourceCode, node, kind);
    if (step === undefined || !addsValues(sourceCode, step)) continue;
    if (!outlivesOneItem(sourceCode, step.target, scopeNode)) continue;
    found.push({ node, ...step });
  }
  return found;
}
