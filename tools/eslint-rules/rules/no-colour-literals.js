/**
 * sovitech/no-colour-literals (JS and TS)
 *
 * Colours come only from packages/ui/src/tokens.css, through CSS custom
 * properties and the theme's Tailwind classes. This rule reports, in app and
 * package code:
 * - hex colours and colour functions (rgb(), hsl(), oklch(), ...) in any string;
 * - Tailwind classes that name a colour the theme does not define (bg-red-500,
 *   text-white, bg-[red]), in any string;
 * - named CSS colours in style values: style objects, colour properties, SVG
 *   colour attributes, style.setProperty() and assignments to colour properties;
 * - colour arguments to three.js (new Color(...), setHex(), setStyle(), ...) and
 *   numeric colours (0xff0000) on colour properties, because the viewer reads its
 *   colours from the CSS custom properties at runtime.
 * Prompt 3 section 6 ("Brand assets") and section 14 item 3.
 */
import { isModuleSource, jsxAttributeName, keyName, staticString } from '../lib/ast.js';
import { colourClassProblem, findColourLiterals, findNamedColours, isColourProperty } from '../lib/patterns.js';

/** JSX attributes whose value may carry a fragment link (#id) rather than a colour. */
const LINK_ATTRIBUTES = new Set(['href', 'to', 'xlinkHref', 'xlink:href', 'src', 'action', 'formAction']);

/** DOM calls whose first argument is a selector (#id). */
const SELECTOR_CALLS = new Set(['querySelector', 'querySelectorAll', 'closest', 'matches']);

/** SVG and component attributes that take a colour. */
const COLOUR_ATTRIBUTES = new Set([
  'fill',
  'stroke',
  'color',
  'stopColor',
  'stop-color',
  'floodColor',
  'flood-color',
  'lightingColor',
  'lighting-color',
  'backgroundColor',
]);

/** three.js Color setters. */
const COLOUR_SETTERS = new Set(['setHex', 'setStyle', 'setRGB', 'setHSL', 'setColorName', 'setScalar']);

/**
 * Properties that take a colour as a number (three.js `color: 0xff0000`), as opposed to
 * colour-related properties whose numbers are widths or opacities (borderWidth, fillOpacity).
 * @param {string} name
 */
function isNumericColourProperty(name) {
  return /colou?r$/i.test(name) || name === 'emissive' || name === 'specular' || name === 'background';
}

/** @param {any} node */
function isLiteralArgument(node) {
  return node.type === 'Literal' || node.type === 'TemplateLiteral' || (node.type === 'UnaryExpression' && node.argument.type === 'Literal');
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow colour literals outside packages/ui/src/tokens.css.',
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
        'Colour literal `{{literal}}` outside packages/ui/src/tokens.css. Use a token from the tokens file through its CSS custom property or theme class (prompt 3 section 6, "Brand assets").',
    },
  },
  create(context) {
    /** @type {{ themeColours?: string[] }} */
    const options = context.options[0] ?? {};
    const themeColours = new Set(options.themeColours ?? []);
    /** @type {Set<string>} */
    const reported = new Set();

    /**
     * @param {any} node
     * @param {string} literal
     */
    function report(node, literal) {
      // One report per node: a string with several colours is fixed in one place.
      const key = `${node.range?.[0] ?? ''}:${node.range?.[1] ?? ''}`;
      if (reported.has(key)) return;
      reported.add(key);
      context.report({ node, messageId: 'literal', data: { literal } });
    }

    /**
     * @param {any} node
     * @param {string} text
     * @param {{ skipHex: boolean }} how
     */
    function scanText(node, text, how) {
      if (!how.skipHex) {
        for (const found of findColourLiterals(text)) report(node, found.literal);
      }
      for (const token of text.split(/\s+/)) {
        if (token === '') continue;
        const problem = colourClassProblem(token, themeColours);
        if (problem !== undefined) report(node, problem);
      }
    }

    /**
     * Named colours in a value that is known to be a colour or style value.
     * @param {any} valueNode
     * @param {string} name the property or attribute the value is set on
     */
    function checkStyleValue(valueNode, name) {
      if (valueNode === null || valueNode === undefined) return;
      if (valueNode.type === 'AssignmentPattern') {
        checkStyleValue(valueNode.right, name);
        return;
      }
      if (valueNode.type === 'Literal' && typeof valueNode.value === 'number') {
        // Only a colour property takes a number as a colour (0xff0000); widths and opacities do not.
        if (isNumericColourProperty(name)) report(valueNode, valueNode.raw ?? String(valueNode.value));
        return;
      }
      const text = staticString(valueNode);
      if (text === undefined) return;
      for (const colour of findNamedColours(text)) report(valueNode, colour);
    }

    /** @param {any} node */
    function isSelectorArgument(node) {
      const parent = node.parent;
      if (parent?.type !== 'CallExpression' || parent.arguments[0] !== node) return false;
      const callee = parent.callee;
      const name = callee.type === 'MemberExpression' ? keyName(callee) : callee.type === 'Identifier' ? callee.name : undefined;
      return name !== undefined && SELECTOR_CALLS.has(name);
    }

    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        if (isModuleSource(node)) return;
        const attribute = jsxAttributeName(node);
        const skipHex = (attribute !== undefined && LINK_ATTRIBUTES.has(attribute)) || isSelectorArgument(node);
        scanText(node, node.value, { skipHex });
      },
      TemplateElement(node) {
        scanText(node, node.value.cooked ?? node.value.raw, { skipHex: false });
      },
      Property(node) {
        const name = keyName(node);
        if (name === undefined || !isColourProperty(name)) return;
        checkStyleValue(node.value, name);
      },
      JSXAttribute(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : `${node.name.namespace.name}-${node.name.name.name}`;
        if (!COLOUR_ATTRIBUTES.has(name)) return;
        const value = node.value?.type === 'JSXExpressionContainer' ? node.value.expression : node.value;
        checkStyleValue(value, name);
      },
      AssignmentExpression(node) {
        if (node.left.type !== 'MemberExpression') return;
        const name = keyName(node.left);
        if (name === undefined || !isColourProperty(name)) return;
        checkStyleValue(node.right, name);
      },
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') return;
        const method = keyName(node.callee);
        if (method === 'setProperty') {
          const property = staticString(node.arguments[0]);
          if (property !== undefined && isColourProperty(property)) checkStyleValue(node.arguments[1], property);
          return;
        }
        if (method !== undefined && COLOUR_SETTERS.has(method)) {
          for (const argument of node.arguments) if (isLiteralArgument(argument)) report(argument, context.sourceCode.getText(argument));
          return;
        }
        if (method === 'set' && node.callee.object.type === 'MemberExpression') {
          const owner = keyName(node.callee.object);
          if (owner !== undefined && isColourProperty(owner)) {
            for (const argument of node.arguments) if (isLiteralArgument(argument)) report(argument, context.sourceCode.getText(argument));
          }
        }
      },
      NewExpression(node) {
        const callee = node.callee;
        const name = callee.type === 'Identifier' ? callee.name : callee.type === 'MemberExpression' ? keyName(callee) : undefined;
        if (name !== 'Color') return;
        for (const argument of node.arguments) if (isLiteralArgument(argument)) report(argument, context.sourceCode.getText(argument));
      },
    };
  },
};
