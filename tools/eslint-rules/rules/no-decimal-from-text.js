/**
 * sovitech/no-decimal-from-text
 *
 * Bans building a decimal from text outside the rule 8 number parser
 * (packages/registry/src/number-parser/, prompt 3 section 6): `new Decimal(text)`
 * and `Decimal(text)` (and the same for Big and BigNumber) whose argument is a
 * string that is not written in the code. A decimal library reads "1.500" one way
 * only, as one and a half, where rule 8 keeps both readings of an ambiguous number
 * and reads the locale per value; only the parser does that. A literal string
 * (`new Decimal('0.1')`) passes: it is a constant written in the code, not text read
 * from a document.
 *
 * What counts as text:
 * - always: a template literal with an expression, a string joined with `+`,
 *   `String(...)`, `JSON.stringify(...)`, and a call of `toString`, `toFixed`,
 *   `toPrecision`, `toExponential`, `toLocaleString`, `trim`, `replace`, `replaceAll`,
 *   `slice`, `substring`, `padStart`, `padEnd`, `normalize`, `join`, `at` or `charAt`
 *   on anything; and a name or member whose name says it holds text (`text`,
 *   `excerpt`, `original`, `raw`, `cell`, `label`, `str`, `string`, or ending in
 *   `Text`, `String`, `Str`, `Raw`, `Excerpt`);
 * - with type information (`pnpm lint:eslint`): any argument whose type is a string,
 *   holds one in a union, or is `any` or `unknown`.
 * The lint-bans check lints without type information, so there only the first list
 * applies; `pnpm check` runs both.
 *
 * The constructor is recognised by name (`Decimal`, `Big`, `BigNumber`, a namespace
 * member of that name) and by import from decimal.js, decimal.js-light, big.js or
 * bignumber.js under any local name.
 * Guardrails rule 8 ("Parsing"), rule 1 ("Unknown propagates"); prompt 3 sections 6 and 7.
 */
import ts from 'typescript';
import { keyName } from '../lib/ast.js';

const CONSTRUCTOR_NAMES = new Set(['Decimal', 'Big', 'BigNumber']);
const DECIMAL_PACKAGES = new Set(['decimal.js', 'decimal.js-light', 'big.js', 'bignumber.js']);
const TEXT_METHODS = new Set([
  'toString',
  'toFixed',
  'toPrecision',
  'toExponential',
  'toLocaleString',
  'trim',
  'trimStart',
  'trimEnd',
  'replace',
  'replaceAll',
  'slice',
  'substring',
  'substr',
  'padStart',
  'padEnd',
  'normalize',
  'join',
  'at',
  'charAt',
  'toLowerCase',
  'toUpperCase',
]);
const TEXT_NAMES = new Set(['text', 'excerpt', 'original', 'raw', 'cell', 'label', 'str', 'string', 'value_text', 'input']);
const TEXT_SUFFIX = /(?:Text|String|Str|Raw|Excerpt)$/;

/**
 * @param {any} node
 * @returns {any}
 */
function unwrap(node) {
  let current = node;
  while (
    current?.type === 'TSAsExpression' ||
    current?.type === 'TSSatisfiesExpression' ||
    current?.type === 'TSNonNullExpression' ||
    current?.type === 'TSTypeAssertion' ||
    current?.type === 'ChainExpression'
  ) {
    current = current.expression;
  }
  return current;
}

/**
 * Whether a TypeScript type is text: a string, a string literal, a template type, a
 * union holding one, or any or unknown.
 * @param {any} type
 * @returns {boolean}
 */
function isTextType(type) {
  if (type === undefined || type === null) return false;
  if (typeof type.isUnion === 'function' && type.isUnion()) return type.types.some((/** @type {any} */ part) => isTextType(part));
  const flags = type.flags;
  return (flags & ts.TypeFlags.StringLike) !== 0 || (flags & ts.TypeFlags.Any) !== 0 || (flags & ts.TypeFlags.Unknown) !== 0;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow building a decimal from text outside the rule 8 number parser (guardrails rule 8, "Parsing").',
    },
    schema: [],
    messages: {
      text:
        '`{{name}}({{argument}})` builds a number from text, which a decimal library reads one way only. Text becomes a number only in the rule 8 parser (packages/registry/src/number-parser/), which keeps both readings of an ambiguous number (guardrails rule 8, "Parsing").',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const services = /** @type {any} */ (sourceCode.parserServices);
    const typed = services !== undefined && services !== null && services.program !== undefined && services.program !== null && services.esTreeNodeToTSNodeMap !== undefined;
    const checker = typed ? services.program.getTypeChecker() : undefined;
    /** Local names bound to a decimal constructor by import. */
    const imported = new Set();

    /** @param {any} node */
    function isTextByType(node) {
      if (checker === undefined) return false;
      const tsNode = services.esTreeNodeToTSNodeMap.get(node);
      if (tsNode === undefined) return false;
      return isTextType(checker.getTypeAtLocation(tsNode));
    }

    /**
     * Whether an argument is text by its form.
     * @param {any} raw
     * @returns {boolean}
     */
    function isTextByForm(raw) {
      const node = unwrap(raw);
      if (node === null || node === undefined) return false;
      switch (node.type) {
        case 'TemplateLiteral':
          return node.expressions.length > 0;
        case 'BinaryExpression':
          if (node.operator !== '+') return false;
          return [node.left, node.right].some(
            (side) =>
              (side.type === 'Literal' && typeof side.value === 'string') || side.type === 'TemplateLiteral' || isTextByForm(side),
          );
        case 'CallExpression': {
          const callee = unwrap(node.callee);
          if (callee.type === 'Identifier' && callee.name === 'String') return true;
          if (callee.type === 'MemberExpression') {
            const name = keyName(callee);
            if (name !== undefined && TEXT_METHODS.has(name)) return true;
            if (name === 'stringify' && callee.object.type === 'Identifier' && callee.object.name === 'JSON') return true;
          }
          return false;
        }
        case 'Identifier':
          return TEXT_NAMES.has(node.name) || TEXT_SUFFIX.test(node.name);
        case 'MemberExpression': {
          const name = keyName(node);
          return name !== undefined && (TEXT_NAMES.has(name) || TEXT_SUFFIX.test(name));
        }
        case 'ConditionalExpression':
          return isTextByForm(node.consequent) || isTextByForm(node.alternate);
        case 'LogicalExpression':
          return isTextByForm(node.left) || isTextByForm(node.right);
        default:
          return false;
      }
    }

    /** @param {any} callee */
    function constructorName(callee) {
      const inner = unwrap(callee);
      if (inner.type === 'Identifier') return CONSTRUCTOR_NAMES.has(inner.name) || imported.has(inner.name) ? inner.name : undefined;
      if (inner.type === 'MemberExpression') {
        const name = keyName(inner);
        return name !== undefined && CONSTRUCTOR_NAMES.has(name) ? sourceCode.getText(inner) : undefined;
      }
      return undefined;
    }

    /** @param {any} node */
    function check(node) {
      const name = constructorName(node.callee);
      if (name === undefined) return;
      const argument = node.arguments[0];
      if (argument === undefined || argument.type === 'SpreadElement') return;
      const literal = unwrap(argument);
      if (literal.type === 'Literal' || (literal.type === 'TemplateLiteral' && literal.expressions.length === 0)) return;
      if (isTextByForm(argument) || isTextByType(argument)) {
        const shown = sourceCode.getText(argument);
        context.report({ node, messageId: 'text', data: { name, argument: shown.length > 40 ? `${shown.slice(0, 37)}...` : shown } });
      }
    }

    return {
      ImportDeclaration(node) {
        if (typeof node.source.value !== 'string' || !DECIMAL_PACKAGES.has(node.source.value)) return;
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportDefaultSpecifier' || specifier.type === 'ImportNamespaceSpecifier') imported.add(specifier.local.name);
          else if (specifier.type === 'ImportSpecifier') imported.add(specifier.local.name);
        }
      },
      NewExpression: check,
      CallExpression: check,
    };
  },
};
