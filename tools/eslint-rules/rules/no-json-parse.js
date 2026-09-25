/**
 * sovitech/no-json-parse
 *
 * Bans `JSON.parse` on text in app and package code, except in the files of the
 * reviewed list (JSON_PARSE_REVIEWED in tools/eslint-rules/index.js). JSON.parse
 * turns the numbers written in text into JavaScript numbers in one reading, outside
 * the rule 8 parser, and it returns an untyped value that no schema has checked:
 * AI output, a document export or an API body read this way reaches the value model
 * unverified. Such text is parsed only where a reviewed reader validates what comes
 * out (the AI boundary's output validator, a snapshot loader with its schema).
 *
 * Banned: `JSON.parse(...)`, `globalThis.JSON.parse(...)` (and `window`, `self`,
 * `global`), `JSON['parse']`, `JSON[name]` with a name computed from code, `JSON.parse` passed or kept as a value
 * (`texts.map(JSON.parse)`, `const read = JSON.parse`), and `const { parse } = JSON`.
 * Not covered: `Response.json()` and `Request.json()`, which parse a body the same
 * way; the API returns display objects only (prompt 3 section 6), and the browser
 * reads them through the one view-model client.
 * Guardrails rule 8 ("Parsing"), rule 1 ("Enforced by": evidence is checked by code),
 * rule 14; prompt 3 sections 6 and 7.
 */
import { keyName } from '../lib/ast.js';

const GLOBAL_OBJECTS = new Set(['globalThis', 'window', 'self', 'global']);

/**
 * Whether a node is the global JSON object: `JSON`, or `globalThis.JSON`.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} node
 */
function isJson(sourceCode, node) {
  if (node.type === 'Identifier') {
    if (node.name !== 'JSON') return false;
    /** @type {import('eslint').Scope.Scope | null} */
    let scope = sourceCode.getScope(node);
    while (scope !== null) {
      const variable = scope.set.get('JSON');
      if (variable !== undefined) return variable.defs.length === 0;
      scope = scope.upper;
    }
    return true;
  }
  return (
    node.type === 'MemberExpression' &&
    keyName(node) === 'JSON' &&
    node.object.type === 'Identifier' &&
    GLOBAL_OBJECTS.has(node.object.name)
  );
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow JSON.parse on text outside the reviewed readers (guardrails rule 8, "Parsing").',
    },
    schema: [],
    messages: {
      parse:
        '`JSON.parse` turns text into values, its numbers in one reading and unchecked, outside the rule 8 parser. Parse text only in a reviewed reader that validates what comes out (JSON_PARSE_REVIEWED in tools/eslint-rules/index.js; guardrails rules 1 and 8).',
      destructured:
        '`parse` taken out of JSON is JSON.parse under another name. Parse text only in a reviewed reader (guardrails rules 1 and 8).',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      MemberExpression(node) {
        const name = keyName(node);
        const computedName = node.computed && name === undefined && node.property.type !== 'Literal';
        if ((name !== 'parse' && !computedName) || !isJson(sourceCode, node.object)) return;
        context.report({ node, messageId: 'parse' });
      },
      VariableDeclarator(node) {
        if (node.id.type !== 'ObjectPattern' || node.init === null || node.init === undefined) return;
        if (!isJson(sourceCode, node.init)) return;
        for (const property of node.id.properties) {
          if (property.type === 'Property' && (keyName(property) === 'parse' || property.computed)) {
            context.report({ node: property, messageId: 'destructured' });
          }
        }
      },
    };
  },
};
