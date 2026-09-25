/**
 * sovitech/no-rounding-outside-formatting
 *
 * Bans rounding outside the formatting module (packages/view-model/src/formatting/,
 * FORMATTING_MODULE in tools/eslint-rules/index.js): rule 9 says stored values are
 * never rounded, rounding happens only when a value is displayed, ranges round
 * outward, and "the formatting module owns rounding". A rounding call anywhere else
 * would round a value before it is stored or computed with, or round a range inward.
 *
 * Banned, called or read as a value:
 * - `Math.round`, `Math.floor`, `Math.ceil`, `Math.trunc` and `Math.fround`, also through
 *   `globalThis.Math` and destructuring (`const { round } = Math`);
 * - `toFixed`, `toPrecision` and `toLocaleString` on anything;
 * - `Intl.NumberFormat`, called or constructed, also through `globalThis.Intl`;
 * - decimal rounding: `toDecimalPlaces`, `toDP`, `toSignificantDigits`, `toSD`,
 *   `toNearest`, `round`, `floor`, `ceil` and `trunc` called on anything
 *   (`Decimal.round(x)`, `amount.toDP(2)`).
 * Guardrails rule 9 ("Rounding"; "Enforced by": the formatting module owns rounding);
 * prompt 3 sections 6 and 7.
 */
import { keyName } from '../lib/ast.js';

const MATH_ROUNDING = new Set(['round', 'floor', 'ceil', 'trunc', 'fround']);
const TEXT_ROUNDING = new Set(['toFixed', 'toPrecision', 'toLocaleString']);
const DECIMAL_ROUNDING = new Set(['toDecimalPlaces', 'toDP', 'toSignificantDigits', 'toSD', 'toNearest', 'round', 'floor', 'ceil', 'trunc']);
const GLOBAL_OBJECTS = new Set(['globalThis', 'window', 'self', 'global']);

/**
 * Whether the identifier resolves to the built-in global of that name, not to a local declaration.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} identifier
 */
function isGlobalBuiltin(sourceCode, identifier) {
  /** @type {import('eslint').Scope.Scope | null} */
  let scope = sourceCode.getScope(identifier);
  while (scope !== null) {
    const variable = scope.set.get(identifier.name);
    if (variable !== undefined) return variable.defs.length === 0;
    scope = scope.upper;
  }
  return true;
}

/**
 * Whether a node is the global object `name` (`Math`, `Intl`), directly or through globalThis.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} node
 * @param {string} name
 */
function isGlobal(sourceCode, node, name) {
  if (node.type === 'Identifier') return node.name === name && isGlobalBuiltin(sourceCode, node);
  return node.type === 'MemberExpression' && keyName(node) === name && node.object.type === 'Identifier' && GLOBAL_OBJECTS.has(node.object.name);
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow rounding outside the formatting module (guardrails rule 9, "Rounding").',
    },
    schema: [],
    messages: {
      rounding:
        '`{{name}}` rounds a value outside the formatting module. Stored values are never rounded; rounding happens only at display, in packages/view-model/src/formatting/, and ranges round outward (guardrails rule 9, "Rounding").',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const report = (/** @type {any} */ node, /** @type {string} */ name) => context.report({ node, messageId: 'rounding', data: { name } });
    return {
      MemberExpression(node) {
        const name = keyName(node);
        if (name === undefined) {
          // Math[name] with a name computed from code can be any of the rounding functions.
          if (node.computed && node.property.type !== 'Literal' && isGlobal(sourceCode, node.object, 'Math')) report(node, sourceCode.getText(node));
          return;
        }
        if (isGlobal(sourceCode, node.object, 'Math')) {
          if (MATH_ROUNDING.has(name)) report(node, `Math.${name}`);
          return;
        }
        if (isGlobal(sourceCode, node.object, 'Intl')) {
          if (name === 'NumberFormat') report(node, 'Intl.NumberFormat');
          return;
        }
        if (TEXT_ROUNDING.has(name)) {
          report(node, `.${name}`);
          return;
        }
        const parent = node.parent;
        if (DECIMAL_ROUNDING.has(name) && parent.type === 'CallExpression' && parent.callee === node) report(node, `.${name}()`);
      },
      VariableDeclarator(node) {
        // const { round } = Math;  const { NumberFormat } = Intl;
        if (node.id.type !== 'ObjectPattern' || node.init === null || node.init === undefined) return;
        const fromMath = isGlobal(sourceCode, node.init, 'Math');
        const fromIntl = isGlobal(sourceCode, node.init, 'Intl');
        if (!fromMath && !fromIntl) return;
        for (const property of node.id.properties) {
          if (property.type !== 'Property') continue;
          const name = keyName(property);
          if (property.computed && name === undefined) report(property, fromMath ? 'Math[...]' : 'Intl[...]');
          else if (name !== undefined && ((fromMath && MATH_ROUNDING.has(name)) || (fromIntl && name === 'NumberFormat'))) {
            report(property, `${fromMath ? 'Math' : 'Intl'}.${name}`);
          }
        }
      },
    };
  },
};
