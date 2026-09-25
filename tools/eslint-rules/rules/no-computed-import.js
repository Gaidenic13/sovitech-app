/**
 * sovitech/no-computed-import
 *
 * The package boundaries of prompt 3 sections 5.4 and 6 are enforced by
 * dependency-cruiser (.dependency-cruiser.cjs), which reads import and require
 * statements whose module path is written in the code. A path it cannot read is an
 * edge it cannot see: `await import(dir + 'source')` from apps/api reached the
 * registry's gate issuer with no violation (phase 0 review round 2, second
 * verification). This rule bans every way of loading a module whose path is not
 * written as one string in the code:
 * - `import(x)` where x is not a string (or a template without `${}`);
 * - `require(x)` (or `module.require(x)`) where x is not a string, and `require`
 *   used as a value;
 * - `createRequire(...)`, whose result loads modules under any name;
 * - `import.meta.glob(...)` (Vite), which dependency-cruiser does not expand;
 * - `eval(...)`, `Function(...)` and `new Function(...)`, which can load modules
 *   from text.
 * A local declaration named `require` or `eval` passes.
 */
import { isTypePosition, staticString } from '../lib/ast.js';

const GLOBAL_OBJECTS = new Set(['globalThis', 'window', 'self', 'global']);
const CODE_FROM_TEXT = new Set(['eval', 'Function']);

/**
 * Whether the identifier resolves to a global, not to a local declaration.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} identifier
 */
function isGlobal(sourceCode, identifier) {
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
 * The global a callee names: `eval` for `eval` and `globalThis.eval`.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} callee
 * @returns {string | undefined}
 */
function globalName(sourceCode, callee) {
  if (callee.type === 'Identifier') return isGlobal(sourceCode, callee) ? callee.name : undefined;
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    callee.object.type === 'Identifier' &&
    GLOBAL_OBJECTS.has(callee.object.name) &&
    isGlobal(sourceCode, callee.object)
  ) {
    return callee.property.name;
  }
  return undefined;
}

/** @param {any} node */
function isImportMeta(node) {
  return node?.type === 'MetaProperty' && node.meta.name === 'import' && node.property.name === 'meta';
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow loading a module whose path is not written in the code: dependency-cruiser cannot check the boundaries of an edge it cannot see (prompt 3 sections 5.4 and 6).',
    },
    schema: [],
    messages: {
      computedImport:
        '`import()` with a path computed at run time: dependency-cruiser cannot see this edge, so the package boundaries (prompt 3 sections 5.4 and 6) are not checked on it. Write the path as one string.',
      computedRequire:
        '`require` with a path computed at run time, or used as a value: dependency-cruiser cannot see this edge, so the package boundaries (prompt 3 sections 5.4 and 6) are not checked on it. Use a static import.',
      createRequire:
        '`createRequire` makes a loader whose calls dependency-cruiser cannot see, so the package boundaries (prompt 3 sections 5.4 and 6) are not checked on them. Use a static import.',
      globImport:
        '`import.meta.{{name}}` loads modules dependency-cruiser does not expand, so the package boundaries (prompt 3 sections 5.4 and 6) are not checked on them. Import each module by name.',
      codeFromText:
        '`{{name}}` runs code built from text, which can load a module dependency-cruiser cannot see (prompt 3 sections 5.4 and 6).',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    /** @param {any} node @param {any} callee */
    function checkCodeFromText(node, callee) {
      const name = globalName(sourceCode, callee);
      if (name !== undefined && CODE_FROM_TEXT.has(name)) context.report({ node, messageId: 'codeFromText', data: { name } });
    }

    return {
      ImportExpression(node) {
        if (staticString(node.source) === undefined) context.report({ node, messageId: 'computedImport' });
      },
      CallExpression(node) {
        const callee = node.callee;
        checkCodeFromText(node, callee);
        const name = callee.type === 'Identifier' ? callee.name : callee.type === 'MemberExpression' && !callee.computed ? callee.property.name : undefined;
        // require(x), and module.require(x) or require.main.require(x).
        const isRequire = name === 'require' && (callee.type === 'MemberExpression' || isGlobal(sourceCode, callee));
        if (isRequire) {
          const [first] = node.arguments;
          if (node.arguments.length !== 1 || staticString(first) === undefined) context.report({ node, messageId: 'computedRequire' });
          return;
        }
        if (name === 'createRequire') context.report({ node, messageId: 'createRequire' });
      },
      NewExpression(node) {
        checkCodeFromText(node, node.callee);
      },
      Identifier(node) {
        // `require` used as a value: const load = require; load(path).
        if (node.name !== 'require' || isTypePosition(node) || !isGlobal(sourceCode, node)) return;
        const parent = node.parent;
        if (parent?.type === 'CallExpression' && parent.callee === node) return;
        if (parent?.type === 'MemberExpression' && parent.property === node && !parent.computed) return;
        if (parent?.type === 'Property' && parent.key === node && !parent.computed && !parent.shorthand) return;
        if (parent?.type === 'MemberExpression' && parent.object === node) {
          // require.resolve() names a path without loading it.
          return;
        }
        context.report({ node, messageId: 'computedRequire' });
      },
      MemberExpression(node) {
        if (!isImportMeta(node.object) || node.computed || node.property.type !== 'Identifier') return;
        if (node.property.name === 'glob' || node.property.name === 'globEager') {
          context.report({ node, messageId: 'globImport', data: { name: node.property.name } });
        }
      },
    };
  },
};
