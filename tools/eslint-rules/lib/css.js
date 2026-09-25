/**
 * Helpers for the CSS rules (@eslint/css, CSSTree AST).
 *
 * The repository parses CSS in tolerant mode, because Tailwind's at-rules
 * (@theme, @source, `--color-*: initial`) are not standard CSS. Tolerant mode
 * keeps the parts it cannot parse as Raw nodes, so each rule reads Raw text too:
 * a colour or a shadow cannot hide in a block the parser gave up on.
 */

/**
 * Removes comments and quoted strings, which never carry a style value.
 * @param {string} text
 */
export function stripCommentsAndStrings(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
}

/**
 * Splits text the parser left raw into `property: value` pairs.
 * @param {string} text
 * @returns {Array<{ property: string, value: string }>}
 */
export function rawDeclarations(text) {
  const pairs = [];
  for (const part of stripCommentsAndStrings(text).split(/[;{}]/)) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const property = part.slice(0, colon).trim();
    if (!/^-{0,2}[a-z_*][\w*-]*$/i.test(property)) continue;
    pairs.push({ property, value: part.slice(colon + 1).trim() });
  }
  return pairs;
}

/**
 * Visitors that call `check(node, property, value)` for every declaration, parsed or raw,
 * and `apply(node, classes)` for every @apply.
 * @param {any} sourceCode
 * @param {(node: any, property: string, value: string) => void} check
 * @param {(node: any, classes: string[]) => void} apply
 */
export function declarationVisitors(sourceCode, check, apply) {
  let insideDeclaration = 0;
  return {
    /** @param {any} node */
    Declaration(node) {
      insideDeclaration += 1;
      check(node, String(node.property), stripCommentsAndStrings(sourceCode.getText(node.value)));
    },
    'Declaration:exit'() {
      insideDeclaration -= 1;
    },
    /** @param {any} node */
    Raw(node) {
      if (insideDeclaration > 0) return;
      for (const pair of rawDeclarations(String(node.value))) check(node, pair.property, pair.value);
    },
    /** @param {any} node */
    Atrule(node) {
      if (String(node.name).toLowerCase() !== 'apply' || node.prelude === null || node.prelude === undefined) return;
      const classes = sourceCode.getText(node.prelude).split(/\s+/).filter((token) => token !== '');
      apply(node, classes);
    },
  };
}
