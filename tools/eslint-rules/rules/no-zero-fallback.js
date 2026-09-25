/**
 * sovitech/no-zero-fallback
 *
 * Bans a zero standing in for a value that may be missing: `x ?? 0`, `x || 0`,
 * `x ??= 0`, `x ||= 0`, a default of 0 in a parameter or destructuring, and the
 * conditional forms such as `x != null ? x : 0`. Zero here means any spelling of
 * it: 0, 0.0, -0, 0n, '0', `0`, Decimal(0), and a name bound to one of those:
 * a const (or a let or var never reassigned) initialised to a zero, a property of
 * a const object literal whose value is a zero, and, when the lint run has type
 * information, any name or property whose type is the literal type 0 (which
 * catches a zero constant imported from another module).
 *
 * Since phase 1 (the rest of adversarial finding 7 of the phase 0 review, round 2)
 * it also bans a zero floor, `Math.max(x, 0)` (a zero among its arguments, which
 * turns a null into 0 and a shortfall into nothing), and an empty list standing in
 * for a missing one, `x || []` and `x ||= []`, whose total or count then reads 0.
 *
 * Engineering values cannot be told apart from other numbers at lint time, so the
 * ban covers all app and package code (tools/eslint-rules/README.md).
 * Guardrails rule 1, "Unknown propagates"; prompt 3 section 7.
 */
import { keyName } from '../lib/ast.js';
import { calleeName, isPresenceCheckName } from '../lib/presence.js';
import { constantInitialiser, resolveVariable } from '../lib/scope.js';

/** How many name-to-initialiser hops a zero is followed through (`const A = 0; const B = A;`). */
const MAX_HOPS = 8;

/** @param {string} text */
function isZeroText(text) {
  return /^\s*[+-]?0+(?:[.,]0*)?\s*$/.test(text);
}

/**
 * Strips wrappers that do not change a value: `as`, `satisfies`, `!`, type assertions,
 * `Object.freeze(...)` around an object literal.
 * @param {any} node
 * @returns {any}
 */
function unwrap(node) {
  let current = node;
  while (current !== null && current !== undefined) {
    if (
      current.type === 'TSAsExpression' ||
      current.type === 'TSSatisfiesExpression' ||
      current.type === 'TSNonNullExpression' ||
      current.type === 'TSTypeAssertion' ||
      current.type === 'ChainExpression'
    ) {
      current = current.expression;
    } else if (
      current.type === 'CallExpression' &&
      current.callee.type === 'MemberExpression' &&
      current.callee.object.type === 'Identifier' &&
      current.callee.object.name === 'Object' &&
      keyName(current.callee) === 'freeze' &&
      current.arguments.length === 1
    ) {
      current = current.arguments[0];
    } else {
      return current;
    }
  }
  return current;
}

/**
 * Whether a TypeScript type is a literal zero: the number 0, the bigint 0n or the string '0'.
 * @param {any} type
 */
function isZeroType(type) {
  if (type === undefined || type === null || typeof type.isLiteral !== 'function' || !type.isLiteral()) return false;
  const value = type.value;
  if (typeof value === 'number') return value === 0;
  if (typeof value === 'string') return isZeroText(value);
  if (value !== null && typeof value === 'object' && typeof value.base10Value === 'string') return /^0+$/.test(value.base10Value);
  return false;
}

/**
 * A zero test bound to one rule context: literal spellings, names bound to a zero,
 * and (with type information) names and properties of the literal type 0.
 * @param {import('eslint').Rule.RuleContext} context
 * @returns {(node: any) => boolean}
 */
export function zeroTest(context) {
  const sourceCode = context.sourceCode;
  const services = /** @type {any} */ (sourceCode.parserServices);
  const typed =
    services !== undefined && services !== null && services.program !== undefined && services.program !== null && services.esTreeNodeToTSNodeMap !== undefined;
  const checker = typed ? services.program.getTypeChecker() : undefined;

  /** @param {any} node */
  function hasZeroType(node) {
    if (checker === undefined) return false;
    const tsNode = services.esTreeNodeToTSNodeMap.get(node);
    if (tsNode === undefined) return false;
    return isZeroType(checker.getTypeAtLocation(tsNode));
  }

  /**
   * @param {any} node
   * @param {number} hops
   * @returns {boolean}
   */
  function isZero(node, hops) {
    if (node === null || node === undefined) return false;
    switch (node.type) {
      case 'Literal':
        if (typeof node.value === 'number') return node.value === 0;
        if (typeof node.value === 'bigint') return node.value === 0n;
        if (typeof node.bigint === 'string') return /^0+$/.test(node.bigint);
        if (typeof node.value === 'string') return isZeroText(node.value);
        return false;
      case 'TemplateLiteral':
        return node.expressions.length === 0 && isZeroText(node.quasis[0]?.value.cooked ?? '');
      case 'UnaryExpression':
        return (node.operator === '-' || node.operator === '+') && isZero(node.argument, hops);
      case 'TSAsExpression':
      case 'TSSatisfiesExpression':
      case 'TSNonNullExpression':
      case 'TSTypeAssertion':
        return isZero(node.expression, hops);
      case 'NewExpression':
      case 'CallExpression': {
        const callee = node.callee;
        const name =
          callee.type === 'Identifier'
            ? callee.name
            : callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
              ? callee.property.name
              : '';
        return name === 'Decimal' && node.arguments.length === 1 && isZero(node.arguments[0], hops);
      }
      case 'Identifier': {
        if (node.name === 'undefined') return false;
        if (hops < MAX_HOPS) {
          const init = constantInitialiser(resolveVariable(sourceCode, node));
          if (init !== undefined && isZero(init, hops + 1)) return true;
        }
        return hasZeroType(node);
      }
      case 'MemberExpression': {
        if (hops < MAX_HOPS && node.object.type === 'Identifier') {
          const init = unwrap(constantInitialiser(resolveVariable(sourceCode, node.object)));
          const name = keyName(node);
          if (init?.type === 'ObjectExpression' && name !== undefined) {
            const property = init.properties.find(
              (/** @type {any} */ candidate) => candidate.type === 'Property' && !candidate.computed && keyName(candidate) === name,
            );
            if (property !== undefined && isZero(property.value, hops + 1)) return true;
          }
        }
        return hasZeroType(node);
      }
      case 'ChainExpression':
        return isZero(node.expression, hops);
      default:
        return false;
    }
  }

  return (node) => isZero(node, 0);
}

/**
 * The source text of a node with whitespace removed and optional chaining read as
 * plain member access, so `a?.b` and `a.b` compare equal.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} node
 */
function flatText(sourceCode, node) {
  return sourceCode.getText(node).replace(/\s+/g, '').replace(/\?\.(?=[\w$[])/g, '.');
}

/**
 * The texts of the objects a member chain reads from: `a.b.c` gives `a.b` and `a`.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} node
 * @returns {string[]}
 */
function memberPrefixes(sourceCode, node) {
  const prefixes = [];
  let current = node.type === 'ChainExpression' ? node.expression : node;
  while (current?.type === 'MemberExpression') {
    current = current.object.type === 'ChainExpression' ? current.object.expression : current.object;
    if (current.type === 'Identifier' || current.type === 'MemberExpression') prefixes.push(flatText(sourceCode, current));
  }
  return prefixes;
}

/** @param {any} node */
function isNothing(node) {
  if (node.type === 'Identifier') return node.name === 'undefined';
  if (node.type === 'Literal') return node.value === null && node.regex === undefined && node.bigint === undefined;
  return node.type === 'UnaryExpression' && node.operator === 'void';
}

/**
 * The expressions a condition tests for being present: `x` in `x === undefined`,
 * `x != null`, `typeof x === 'number'`, `x` (truthiness), `!x`, and each side of
 * `&&` and `||`.
 * @param {any} test
 * @returns {any[]}
 */
function testedOperands(test) {
  const node = test.type === 'ChainExpression' ? test.expression : test;
  switch (node.type) {
    case 'LogicalExpression':
      return [...testedOperands(node.left), ...testedOperands(node.right)];
    case 'UnaryExpression':
      return node.operator === '!' ? testedOperands(node.argument) : [];
    case 'BinaryExpression': {
      if (!['===', '!==', '==', '!='].includes(node.operator)) return [];
      if (isNothing(node.right)) return [node.left];
      if (isNothing(node.left)) return [node.right];
      const typeofSide = [node.left, node.right].find((side) => side.type === 'UnaryExpression' && side.operator === 'typeof');
      return typeofSide === undefined ? [] : [typeofSide.argument];
    }
    case 'Identifier':
    case 'MemberExpression':
      return [node];
    case 'CallExpression':
      // Boolean(x), Number.isFinite(x), isDefined(x): a presence check on its one argument.
      return isPresenceCheckName(calleeName(node.callee)) && node.arguments.length === 1 && node.arguments[0].type !== 'SpreadElement'
        ? [node.arguments[0]]
        : [];
    default:
      return [];
  }
}

/**
 * Whether a node is an empty array: `[]`, `Array()`, `new Array()`, `Array.of()`, and those behind `as` or `!`.
 * @param {any} node
 */
function isEmptyArray(node) {
  const inner = unwrap(node);
  if (inner === null || inner === undefined) return false;
  if (inner.type === 'ArrayExpression') return inner.elements.length === 0;
  if ((inner.type === 'NewExpression' || inner.type === 'CallExpression') && inner.arguments.length === 0) {
    const callee = inner.callee;
    if (callee.type === 'Identifier' && callee.name === 'Array') return true;
    return callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.name === 'Array' && keyName(callee) === 'of';
  }
  return false;
}

/**
 * Whether a callee is `Math.max`, also through `globalThis.Math`.
 * @param {any} callee
 */
function isMathMax(callee) {
  if (callee.type !== 'MemberExpression' || keyName(callee) !== 'max') return false;
  const object = callee.object;
  if (object.type === 'Identifier') return object.name === 'Math';
  return object.type === 'MemberExpression' && keyName(object) === 'Math' && object.object.type === 'Identifier' && ['globalThis', 'window', 'self', 'global'].includes(object.object.name);
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow a zero standing in for a missing value (guardrails rule 1, "Unknown propagates").',
    },
    schema: [
      {
        type: 'object',
        properties: {
          // true by default. A default of 0 is `?? 0` in another spelling; switching it off is a
          // narrowing of the ban, recorded in tools/eslint-rules/README.md ("How to reverse").
          defaults: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      nullish:
        '`?? 0` puts a zero where a value may be missing. Keep it unknown and let the view-model show Unknown (guardrails rule 1, "Unknown propagates").',
      or: '`|| 0` puts a zero where a value may be missing, or turns a real value into zero. Keep it unknown (guardrails rule 1, "Unknown propagates").',
      assignment:
        'Assigning 0 as a fallback puts a zero where a value may be missing. Keep it unknown (guardrails rule 1, "Unknown propagates").',
      default:
        'A default of 0 puts a zero where a value may be missing. Leave the default out and handle the missing value (guardrails rule 1, "Unknown propagates").',
      conditional:
        'This conditional falls back to 0 when the value is missing. Keep it unknown (guardrails rule 1, "Unknown propagates").',
      zeroFloor:
        '`Math.max(..., 0)` puts a floor of 0 under a value: a null becomes 0 and a missing shortfall disappears. Keep the value as it is and let the engine or the view-model handle it (guardrails rule 1, "Unknown propagates").',
      emptyList:
        '`|| []` puts an empty list where a list may be missing, so its total or count reads 0. Keep it unknown (guardrails rule 1, "Unknown propagates"; "Zero is a value").',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    /** @type {{ defaults?: boolean }} */
    const options = context.options[0] ?? {};
    const checkDefaults = options.defaults !== false;
    const isZero = zeroTest(context);
    return {
      LogicalExpression(node) {
        if ((node.operator === '??' || node.operator === '||') && isZero(node.right)) {
          context.report({ node, messageId: node.operator === '??' ? 'nullish' : 'or' });
        } else if (node.operator === '||' && isEmptyArray(node.right)) {
          context.report({ node, messageId: 'emptyList' });
        }
      },
      AssignmentExpression(node) {
        if ((node.operator === '??=' || node.operator === '||=') && isZero(node.right)) {
          context.report({ node, messageId: 'assignment' });
        } else if (node.operator === '||=' && isEmptyArray(node.right)) {
          context.report({ node, messageId: 'emptyList' });
        }
      },
      CallExpression(node) {
        if (!isMathMax(node.callee)) return;
        if (node.arguments.some((argument) => argument.type !== 'SpreadElement' && isZero(argument))) {
          context.report({ node, messageId: 'zeroFloor' });
        }
      },
      AssignmentPattern(node) {
        if (checkDefaults && isZero(node.right)) context.report({ node, messageId: 'default' });
      },
      ConditionalExpression(node) {
        const zeroOnRight = isZero(node.alternate);
        const zeroOnLeft = isZero(node.consequent);
        if (zeroOnRight === zeroOnLeft) return;
        const other = zeroOnRight ? node.consequent : node.alternate;
        if (other.type === 'Literal' || other.type === 'TemplateLiteral') return;
        const otherText = sourceCode.getText(other).replace(/\s+/g, '');
        const testText = sourceCode.getText(node.test).replace(/\s+/g, '');
        if (otherText.length > 0 && testText.includes(otherText)) {
          context.report({ node, messageId: 'conditional' });
          return;
        }
        // `x === undefined ? 0 : x.area`, `x?.area !== undefined ? x.area : NONE`: the branch reads
        // the value, or a property of the value, that the test checks for being present.
        const tested = new Set(testedOperands(node.test).map((operand) => flatText(sourceCode, operand)));
        const reads = [flatText(sourceCode, other), ...memberPrefixes(sourceCode, other)];
        if (reads.some((text) => tested.has(text))) context.report({ node, messageId: 'conditional' });
      },
    };
  },
};
