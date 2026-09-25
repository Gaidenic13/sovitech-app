/**
 * Scope helpers shared by the JS/TS rules: what a name refers to, and the value a
 * name holds when the name is never reassigned.
 */

/**
 * The variable an Identifier reference resolves to, through the scope manager.
 * @param {import('eslint').SourceCode} sourceCode
 * @param {any} identifier
 * @returns {import('eslint').Scope.Variable | undefined}
 */
export function resolveVariable(sourceCode, identifier) {
  /** @type {import('eslint').Scope.Scope | null} */
  let scope = sourceCode.getScope(identifier);
  const reference = scope.references.find((ref) => ref.identifier === identifier);
  if (reference !== undefined) return reference.resolved ?? undefined;
  while (scope !== null) {
    const variable = scope.set.get(identifier.name);
    if (variable !== undefined) return variable;
    scope = scope.upper;
  }
  return undefined;
}

/**
 * The initialiser of a variable that never changes after it: a const, or a let or
 * var whose only write is its initialiser. Undefined for anything else (parameters,
 * imports, destructuring, reassigned variables).
 * @param {import('eslint').Scope.Variable | undefined} variable
 * @returns {any}
 */
export function constantInitialiser(variable) {
  if (variable === undefined || variable.defs.length !== 1) return undefined;
  const def = variable.defs[0];
  if (def === undefined || def.type !== 'Variable') return undefined;
  const declarator = def.node;
  if (declarator.id.type !== 'Identifier' || declarator.init === null || declarator.init === undefined) return undefined;
  const kind = def.parent?.kind;
  if (kind !== 'const') {
    const writes = variable.references.filter((ref) => ref.isWrite());
    if (writes.length !== 1 || writes[0]?.init !== true) return undefined;
  }
  return declarator.init;
}
