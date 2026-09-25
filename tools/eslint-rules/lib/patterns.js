/**
 * Shared matchers for the brand bans: colour literals, Tailwind colour classes,
 * shadows and rings. Used by the JS/TS rules and the CSS rules alike.
 */

/** The named colours of CSS Color Module Level 4. System colours (Canvas, Highlight, ...) are not here: they defer to the user's system. */
export const NAMED_COLOURS = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood ' +
    'cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray ' +
    'darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen ' +
    'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue ' +
    'firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew ' +
    'hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
    'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray ' +
    'lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue ' +
    'mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred ' +
    'midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
    'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple ' +
    'rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue ' +
    'slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white ' +
    'whitesmoke yellow yellowgreen'
  ).split(' '),
);

/** Tailwind's default palette names (v4), which the app's theme switches off. */
export const TAILWIND_PALETTE = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'mauve', 'olive', 'mist', 'taupe',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'black', 'white',
];

const PALETTE_CLASS_VALUE = new RegExp(`^(?:${TAILWIND_PALETTE.join('|')})(?:-(?:50|[1-9]00|950))?$`);

/** Hex colours: #rgb, #rgba, #rrggbb, #rrggbbaa, not inside a word, a path, an entity or a fragment link. */
const HEX_COLOUR = /(?<![\w&#/.-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;

/** CSS colour functions. color-mix() and light-dark() are not literals by themselves; their arguments are checked. */
const COLOUR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;

/** Tailwind utilities that take a colour, longest first so `border-x-` wins over `border-`. */
const COLOUR_CLASS_PREFIXES = [
  'inset-shadow', 'drop-shadow', 'text-shadow', 'inset-ring', 'ring-offset', 'decoration', 'placeholder',
  'border-bs', 'border-be', 'border-x', 'border-y', 'border-s', 'border-e', 'border-t', 'border-r', 'border-b',
  'border-l', 'outline', 'border', 'accent', 'divide', 'stroke', 'shadow', 'caret', 'fill', 'from', 'ring', 'text',
  'via', 'bg', 'to',
];

/**
 * @typedef {{ literal: string, index: number }} Found
 */

/**
 * Hex colours and colour functions anywhere in `text`.
 * @param {string} text
 * @returns {Found[]}
 */
export function findColourLiterals(text) {
  /** @type {Found[]} */
  const found = [];
  for (const match of text.matchAll(HEX_COLOUR)) {
    const before = text.slice(0, match.index);
    if (/url\(\s*['"]?$/i.test(before)) continue;
    found.push({ literal: match[0], index: match.index });
  }
  for (const match of text.matchAll(COLOUR_FUNCTION)) {
    found.push({ literal: match[0].slice(0, -1), index: match.index });
  }
  return found.sort((left, right) => left.index - right.index);
}

/**
 * Named colours used as values in `value` (a CSS value, or a style-object string).
 * url(...) and quoted text are skipped; a var() name is skipped but its fallback is read.
 * @param {string} value
 * @returns {string[]}
 */
export function findNamedColours(value) {
  const cleaned = value
    .replace(/url\([^)]*\)/gi, ' ')
    .replace(/"[^"]*"|'[^']*'/g, ' ')
    .replace(/var\(\s*--[\w-]+\s*,?/gi, ' ');
  const names = [];
  for (const match of cleaned.matchAll(/(?<![\w-])[a-z][a-z-]*(?![\w-])/gi)) {
    if (NAMED_COLOURS.has(match[0].toLowerCase())) names.push(match[0]);
  }
  return names;
}

/**
 * CSS property names that take a colour, in any spelling: camelCase, kebab-case, vendor-prefixed.
 * Also three.js and canvas colour properties.
 * @param {string} name
 * @returns {boolean}
 */
export function isColourProperty(name) {
  const kebab = name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/^-+/, '')
    .replace(/^(?:webkit|moz|ms|o)-/, '');
  if (kebab === 'emissive' || kebab === 'specular') return true;
  return /(?:^|-)(?:colou?r|background|border|outline|fill|stroke|shadow|decoration|emphasis|rule|filter|caret|accent|scrollbar)(?:-|$)/.test(
    kebab,
  );
}

/**
 * Removes Tailwind variants (`hover:`, `md:`, `[&>*]:`), the important mark and a leading minus.
 * @param {string} token
 * @returns {string}
 */
export function stripVariants(token) {
  let depth = 0;
  let lastColon = -1;
  for (let position = 0; position < token.length; position += 1) {
    const character = token[position];
    if (character === '[' || character === '(') depth += 1;
    else if (character === ']' || character === ')') depth -= 1;
    else if (character === ':' && depth === 0) lastColon = position;
  }
  return token
    .slice(lastColon + 1)
    .replace(/^!/, '')
    .replace(/!$/, '')
    .replace(/^-/, '');
}

/**
 * The colour class in `token`, if it names a colour that is not one of the theme's tokens.
 * @param {string} token one whitespace-separated class token
 * @param {ReadonlySet<string>} themeColours colour names the app theme defines (`--color-<name>`)
 * @returns {string | undefined}
 */
export function colourClassProblem(token, themeColours) {
  const utility = stripVariants(token);
  if (utility.startsWith('[') && utility.endsWith(']')) {
    const inner = utility.slice(1, -1).replace(/_/g, ' ');
    const property = /^([a-z-]+):(.*)$/i.exec(inner);
    if (property?.[1] !== undefined && property[2] !== undefined && isColourProperty(property[1]) && findNamedColours(property[2]).length > 0) {
      return utility;
    }
    return undefined;
  }
  for (const prefix of COLOUR_CLASS_PREFIXES) {
    if (!utility.startsWith(`${prefix}-`)) continue;
    const value = utility.slice(prefix.length + 1).replace(/\/(?:\d+|\[[^\]]*\]|\([^)]*\))$/, '');
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).replace(/_/g, ' ').replace(/^colou?r:/i, '');
      if (findNamedColours(inner).length > 0) return utility;
      continue;
    }
    if (themeColours.has(value)) continue;
    if (NAMED_COLOURS.has(value) || PALETTE_CLASS_VALUE.test(value)) return utility;
  }
  return undefined;
}

const SHADOW_OR_RING_CLASS = /^(?:shadow|inset-shadow|drop-shadow|text-shadow|ring|inset-ring|ring-offset)(?:-.*)?$/;
const SHADOW_OR_RING_SHAPE =
  /^(?:shadow|inset-shadow|drop-shadow|text-shadow|ring|inset-ring|ring-offset)-(?:2xs|xs|sm|md|lg|xl|2xl|3xl|none|inner|inset|\d+|\[.+\]|\(.+\))$/;
const SHADOW_OR_RING_COLOUR = /^(?:shadow|inset-shadow|drop-shadow|text-shadow|ring|inset-ring|ring-offset)-([a-z]+(?:-[a-z]+)*?)(?:-(?:50|[1-9]00|950))?(?:\/\d+)?$/;

/**
 * The shadow or ring utility in `token`, if any.
 * In a known class list every `shadow*` and `ring*` utility counts. Elsewhere only
 * tokens shaped like a Tailwind utility count (a size, a width, an arbitrary value,
 * or a colour name), so prose such as "ring-fenced" passes.
 * @param {string} token
 * @param {boolean} inClassList
 * @param {ReadonlySet<string>} themeColours
 * @returns {string | undefined}
 */
export function shadowClassProblem(token, inClassList, themeColours) {
  const utility = stripVariants(token);
  if (!SHADOW_OR_RING_CLASS.test(utility)) return undefined;
  if (inClassList || SHADOW_OR_RING_SHAPE.test(utility)) return utility;
  const colour = SHADOW_OR_RING_COLOUR.exec(utility)?.[1];
  if (colour !== undefined && (themeColours.has(colour) || NAMED_COLOURS.has(colour) || TAILWIND_PALETTE.includes(colour))) {
    return utility;
  }
  return undefined;
}

/**
 * CSS declarations of box-shadow or text-shadow in CSS text, and drop-shadow() filters.
 * `none` is allowed: it removes a shadow.
 * @param {string} text
 * @returns {string[]}
 */
export function findShadowCss(text) {
  const found = [];
  for (const match of text.matchAll(/(?:^|[\s;{"'`])((?:-(?:webkit|moz)-)?(?:box|text)-shadow)\s*:\s*([^;}"'`]*)/gi)) {
    const value = (match[2] ?? '').trim().replace(/\s*!important$/i, '');
    if (value.toLowerCase() !== 'none') found.push(match[1] ?? 'box-shadow');
  }
  for (const match of text.matchAll(/\bdrop-shadow\(/gi)) found.push(match[0].slice(0, -1));
  return found;
}

/**
 * Whether a CSS or style property is a shadow property.
 * @param {string} name
 * @returns {boolean}
 */
export function isShadowProperty(name) {
  const kebab = name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/^-+/, '')
    .replace(/^(?:webkit|moz|ms|o)-/, '');
  return kebab === 'box-shadow' || kebab === 'text-shadow';
}

/** Values that remove a shadow or leave a theme reset in place. */
export const SHADOW_FREE_VALUES = new Set(['none', 'initial', 'unset', '0']);
