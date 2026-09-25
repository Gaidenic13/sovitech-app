/**
 * sovitech/no-shadows (JS and TS)
 *
 * The brand has no shadows, and focus rings use `outline` because Tailwind's
 * ring-* utilities are built on box-shadow. This rule reports, in app and package code:
 * - Tailwind shadow-*, inset-shadow-*, drop-shadow-*, text-shadow-*, ring-*,
 *   inset-ring-* and ring-offset-* utilities (bare `shadow` and `ring` too, in class lists);
 * - boxShadow and textShadow in style objects, style assignments and style.setProperty();
 * - box-shadow and text-shadow declarations and drop-shadow() in CSS written as strings;
 * - the SVG feDropShadow filter.
 * `none` is allowed: it removes a shadow.
 * Prompt 3 sections 5.1 (brand: no shadows) and 6 ("Brand assets"); section 14 item 3.
 */
import { isInClassList, keyName, staticString } from '../lib/ast.js';
import { findShadowCss, isShadowProperty, shadowClassProblem } from '../lib/patterns.js';

/** @param {any} node */
function isNone(node) {
  return staticString(node)?.trim().toLowerCase() === 'none';
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow shadows: box-shadow, text-shadow, drop-shadow and the Tailwind shadow and ring utilities.',
    },
    schema: [
      {
        type: 'object',
        properties: { themeColours: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      class:
        '`{{utility}}` draws a shadow (Tailwind ring-* is built on box-shadow). The brand has no shadows; focus rings use outline (prompt 3 section 6, "Brand assets").',
      property: '`{{property}}` draws a shadow. The brand has no shadows (prompt 3 section 5.1).',
      css: '`{{property}}` in this CSS text draws a shadow. The brand has no shadows (prompt 3 section 5.1).',
      svg: '`feDropShadow` draws a shadow. The brand has no shadows (prompt 3 section 5.1).',
    },
  },
  create(context) {
    /** @type {{ themeColours?: string[] }} */
    const options = context.options[0] ?? {};
    const themeColours = new Set(options.themeColours ?? []);

    /**
     * @param {any} node
     * @param {string} text
     */
    function scanText(node, text) {
      const found = findShadowCss(text);
      if (found.length > 0) {
        context.report({ node, messageId: 'css', data: { property: found[0] ?? 'box-shadow' } });
      }
      const inClassList = isInClassList(node.type === 'TemplateElement' ? node.parent : node);
      for (const token of text.split(/\s+/)) {
        if (token === '') continue;
        const utility = shadowClassProblem(token, inClassList, themeColours);
        if (utility !== undefined) context.report({ node, messageId: 'class', data: { utility } });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') scanText(node, node.value);
      },
      TemplateElement(node) {
        scanText(node, node.value.cooked ?? node.value.raw);
      },
      Property(node) {
        const name = keyName(node);
        if (name === undefined || !isShadowProperty(name) || isNone(node.value)) return;
        context.report({ node, messageId: 'property', data: { property: name } });
      },
      AssignmentExpression(node) {
        if (node.left.type !== 'MemberExpression') return;
        const name = keyName(node.left);
        if (name === undefined || !isShadowProperty(name) || isNone(node.right)) return;
        context.report({ node, messageId: 'property', data: { property: name } });
      },
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression' || keyName(node.callee) !== 'setProperty') return;
        const property = staticString(node.arguments[0]);
        if (property === undefined || !isShadowProperty(property) || isNone(node.arguments[1])) return;
        context.report({ node, messageId: 'property', data: { property } });
      },
      JSXOpeningElement(node) {
        if (node.name.type === 'JSXIdentifier' && node.name.name === 'feDropShadow') {
          context.report({ node, messageId: 'svg' });
        }
      },
    };
  },
};
