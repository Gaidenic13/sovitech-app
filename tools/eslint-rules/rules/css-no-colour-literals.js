/**
 * sovitech/css-no-colour-literals (CSS)
 *
 * In CSS, colours come only from packages/ui/src/tokens.css; the config exempts
 * that one file. Reports hex colours and colour functions in any value, named
 * colours in colour properties and in custom properties whose whole value is a
 * colour name, and colour classes in @apply.
 * Prompt 3 section 6 ("Brand assets") and section 14 item 3.
 */
import { declarationVisitors } from '../lib/css.js';
import { colourClassProblem, findColourLiterals, findNamedColours, isColourProperty, NAMED_COLOURS } from '../lib/patterns.js';

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    languages: ['css/css'],
    docs: {
      description: 'Disallow colour literals in CSS outside packages/ui/src/tokens.css.',
    },
    schema: [
      {
        type: 'object',
        properties: { themeColours: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      literal:
        'Colour literal `{{literal}}` outside packages/ui/src/tokens.css. Use a token through its CSS custom property (prompt 3 section 6, "Brand assets").',
    },
  },
  create(context) {
    /** @type {{ themeColours?: string[] }} */
    const options = context.options[0] ?? {};
    const themeColours = new Set(options.themeColours ?? []);

    return declarationVisitors(
      context.sourceCode,
      (node, property, value) => {
        const literals = findColourLiterals(value).map((found) => found.literal);
        if (property.startsWith('--')) {
          const whole = value.trim().toLowerCase();
          if (NAMED_COLOURS.has(whole)) literals.push(value.trim());
        } else if (isColourProperty(property)) {
          literals.push(...findNamedColours(value));
        }
        for (const literal of literals) context.report({ node, messageId: 'literal', data: { literal } });
      },
      (node, classes) => {
        for (const token of classes) {
          const problem = colourClassProblem(token, themeColours);
          if (problem !== undefined) context.report({ node, messageId: 'literal', data: { literal: problem } });
        }
      },
    );
  },
};
