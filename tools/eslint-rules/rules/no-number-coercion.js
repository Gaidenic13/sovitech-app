/**
 * sovitech/no-number-coercion
 *
 * Bans turning values into JavaScript numbers by hand: Number(), new Number(),
 * parseFloat(), parseInt(), Number.parseFloat(), Number.parseInt(), unary +,
 * and the bitwise idioms (`x | 0`, `~~x`, `x >>> 0`) that also turn a missing
 * value into 0. Numbers are read from text only by the rule 8 number parser in
 * packages/registry, and rounded only by the formatting module; those two paths
 * are allowlisted in tools/eslint-rules/allowlist.js.
 * Guardrails rules 1 ("Unknown propagates"), 8 ("Parsing") and 9 ("Rounding"); prompt 3 section 7.
 */
import { isTypePosition, keyName } from '../lib/ast.js';

const COERCERS = new Set(['Number', 'parseFloat', 'parseInt']);
const NUMBER_PARSERS = new Set(['parseFloat', 'parseInt']);
const GLOBAL_OBJECTS = new Set(['globalThis', 'window', 'self', 'global']);

/**
 * Whether the identifier resolves to the built-in global of that name, not to a local declaration.
 * @param {import('eslint').Scope.Scope} scope
 * @param {string} name
 */
function isGlobalBuiltin(scope, name) {
  /** @type {import('eslint').Scope.Scope | null} */
  let current = scope;
  while (current !== null) {
    const variable = current.set.get(name);
    if (variable !== undefined) return variable.defs.length === 0;
    current = current.upper;
  }
  return true;
}

/**
 * Whether an Identifier node is a value reference, not a key, a declaration name or a type.
 * @param {any} node
 */
function isValueReference(node) {
  const parent = node.parent;
  if (parent === undefined || parent === null) return false;
  if (isTypePosition(node)) return false;
  switch (parent.type) {
    case 'MemberExpression':
      return parent.object === node || parent.computed;
    case 'Property':
      return parent.value === node && (parent.shorthand || parent.key !== node);
    case 'PropertyDefinition':
    case 'MethodDefinition':
    case 'TSPropertySignature':
    case 'TSMethodSignature':
    case 'TSAbstractMethodDefinition':
      return parent.key !== node || parent.computed;
    case 'ImportSpecifier':
    case 'ImportDefaultSpecifier':
    case 'ImportNamespaceSpecifier':
    case 'ExportSpecifier':
    case 'LabeledStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
      return false;
    case 'VariableDeclarator':
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ClassDeclaration':
    case 'ClassExpression':
      return parent.id !== node;
    default:
      return true;
  }
}

/** @param {any} node */
function isZeroLiteral(node) {
  return node.type === 'Literal' && node.value === 0;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow Number(), parseFloat(), parseInt(), unary + and bitwise coercion outside the rule 8 number parser and the formatting module.',
    },
    schema: [],
    messages: {
      call: '`{{name}}()` turns a value into a number by hand. Numbers are read by the rule 8 parser in packages/registry and shown by the formatting module (guardrails rules 1, 8 and 9).',
      member:
        '`Number.{{name}}()` turns a value into a number by hand. Numbers are read by the rule 8 parser in packages/registry (guardrails rules 1 and 8).',
      reference:
        '`{{name}}` is passed as a function, which turns values into numbers by hand. Numbers are read by the rule 8 parser in packages/registry (guardrails rules 1 and 8).',
      global:
        '`{{name}}` reached through a global object turns a value into a number by hand. Numbers are read by the rule 8 parser in packages/registry (guardrails rules 1 and 8).',
      unaryPlus:
        'Unary `+` turns a value into a number by hand, and a missing value into NaN or 0. Numbers are read by the rule 8 parser in packages/registry (guardrails rules 1 and 8).',
      bitwise:
        '`{{operator}}` coerces a value to an integer and turns a missing value into 0 (guardrails rule 1, "Unknown propagates").',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Identifier(node) {
        if (!COERCERS.has(node.name)) return;
        if (!isValueReference(node)) return;
        if (!isGlobalBuiltin(sourceCode.getScope(node), node.name)) return;
        const parent = node.parent;
        if ((parent.type === 'CallExpression' || parent.type === 'NewExpression') && parent.callee === node) {
          context.report({ node: parent, messageId: 'call', data: { name: node.name } });
          return;
        }
        if (parent.type === 'MemberExpression' && parent.object === node) {
          const member = keyName(parent);
          if (node.name === 'Number' && member !== undefined && NUMBER_PARSERS.has(member)) {
            context.report({ node: parent, messageId: 'member', data: { name: member } });
          }
          return;
        }
        context.report({ node, messageId: 'reference', data: { name: node.name } });
      },
      MemberExpression(node) {
        if (node.object.type !== 'Identifier' || !GLOBAL_OBJECTS.has(node.object.name)) return;
        const member = keyName(node);
        if (member === undefined || !COERCERS.has(member)) return;
        const parent = node.parent;
        if (member === 'Number' && parent.type === 'MemberExpression' && parent.object === node) {
          const inner = keyName(parent);
          if (inner === undefined || !NUMBER_PARSERS.has(inner)) return;
        }
        context.report({ node, messageId: 'global', data: { name: member } });
      },
      UnaryExpression(node) {
        if (node.operator === '+') {
          const argument = node.argument;
          if (argument.type === 'Literal' && typeof argument.value === 'number') return;
          context.report({ node, messageId: 'unaryPlus' });
          return;
        }
        if (node.operator === '~' && node.argument.type === 'UnaryExpression' && node.argument.operator === '~') {
          context.report({ node, messageId: 'bitwise', data: { operator: '~~' } });
        }
      },
      BinaryExpression(node) {
        const either = node.operator === '|' || node.operator === '^';
        const rightOnly = node.operator === '>>' || node.operator === '>>>' || node.operator === '<<';
        if ((either && (isZeroLiteral(node.left) || isZeroLiteral(node.right))) || (rightOnly && isZeroLiteral(node.right))) {
          context.report({ node, messageId: 'bitwise', data: { operator: `${node.operator} 0` } });
        }
      },
    };
  },
};
