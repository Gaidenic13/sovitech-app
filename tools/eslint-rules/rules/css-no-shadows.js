/**
 * sovitech/css-no-shadows (CSS)
 *
 * No shadows in any CSS file, the tokens file included: box-shadow and
 * text-shadow (except `none`), drop-shadow() filters, custom properties that
 * define a shadow (a theme reset to `initial` is allowed), and shadow or ring
 * utilities in @apply.
 * Prompt 3 sections 5.1 (brand: no shadows) and 6 ("Brand assets"); section 14 item 3.
 */
import { declarationVisitors } from '../lib/css.js';
import { isShadowProperty, SHADOW_FREE_VALUES, shadowClassProblem } from '../lib/patterns.js';

const NO_THEME = new Set();

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    languages: ['css/css'],
    docs: {
      description: 'Disallow shadows in CSS: box-shadow, text-shadow, drop-shadow() and shadow or ring utilities in @apply.',
    },
    schema: [],
    messages: {
      shadow: '`{{what}}` draws a shadow. The brand has no shadows; focus rings use outline (prompt 3 sections 5.1 and 6).',
    },
  },
  create(context) {
    return declarationVisitors(
      context.sourceCode,
      (node, property, value) => {
        const cleanValue = value.trim().replace(/\s*!important$/i, '').toLowerCase();
        const shadowFree = SHADOW_FREE_VALUES.has(cleanValue);
        if (isShadowProperty(property) && !shadowFree) {
          context.report({ node, messageId: 'shadow', data: { what: property } });
          return;
        }
        if (/\bdrop-shadow\(/i.test(value)) {
          context.report({ node, messageId: 'shadow', data: { what: 'drop-shadow()' } });
          return;
        }
        if (property.startsWith('--') && /(?:^|-)shadow(?:-|$)/i.test(property.slice(2)) && !shadowFree) {
          context.report({ node, messageId: 'shadow', data: { what: property } });
        }
      },
      (node, classes) => {
        for (const token of classes) {
          const utility = shadowClassProblem(token, true, NO_THEME);
          if (utility !== undefined) context.report({ node, messageId: 'shadow', data: { what: utility } });
        }
      },
    );
  },
};
