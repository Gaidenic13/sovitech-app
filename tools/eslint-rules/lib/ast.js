/**
 * Small helpers over ESTree nodes, shared by the JS/TS rules.
 */

/** Functions that build class lists. */
const CLASS_HELPERS = new Set(['cn', 'clsx', 'classnames', 'classNames', 'cx', 'twMerge', 'twJoin', 'cva', 'tv']);

/** Names that hold class lists: className, cardClass, buttonClasses, ... */
const CLASS_NAME_PATTERN = /(?:^|[a-z0-9_])(?:class(?:name)?(?:es|s|list)?)$/i;

/**
 * The string value of a Literal or a template without expressions.
 * @param {any} node
 * @returns {string | undefined}
 */
export function staticString(node) {
  if (node === null || node === undefined) return undefined;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined;
  }
  return undefined;
}

/**
 * The name of a non-computed property key, or of a string-literal key.
 * @param {any} node a Property, PropertyDefinition or MemberExpression
 * @returns {string | undefined}
 */
export function keyName(node) {
  const key = node.type === 'MemberExpression' ? node.property : node.key;
  if (key === null || key === undefined) return undefined;
  if (key.type === 'Identifier' && !node.computed) return key.name;
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
  if (key.type === 'PrivateIdentifier') return undefined;
  return undefined;
}

/**
 * Whether `node` is the source of an import or export, or the argument of require().
 * @param {any} node
 * @returns {boolean}
 */
export function isModuleSource(node) {
  const parent = node.parent;
  if (parent === undefined || parent === null) return false;
  if (
    (parent.type === 'ImportDeclaration' ||
      parent.type === 'ExportNamedDeclaration' ||
      parent.type === 'ExportAllDeclaration' ||
      parent.type === 'ImportExpression') &&
    parent.source === node
  ) {
    return true;
  }
  if (parent.type === 'TSExternalModuleReference' || parent.type === 'TSImportType') return true;
  if (parent.type === 'TSLiteralType' && parent.parent?.type === 'TSImportType') return true;
  return (
    parent.type === 'CallExpression' &&
    parent.callee.type === 'Identifier' &&
    parent.callee.name === 'require' &&
    parent.arguments[0] === node
  );
}

/**
 * The JSX attribute name `node` is the value of, directly or through an expression container.
 * @param {any} node
 * @returns {string | undefined}
 */
export function jsxAttributeName(node) {
  let current = node.parent;
  if (current?.type === 'JSXExpressionContainer') current = current.parent;
  if (current?.type !== 'JSXAttribute') return undefined;
  const name = current.name;
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXNamespacedName') return `${name.namespace.name}:${name.name.name}`;
  return undefined;
}

/**
 * Whether the string `node` sits in a class list: a className or class attribute,
 * a class-building helper call, or a variable or property whose name says it holds classes.
 * @param {any} node
 * @returns {boolean}
 */
export function isInClassList(node) {
  let child = node;
  let current = node.parent;
  while (current !== undefined && current !== null) {
    switch (current.type) {
      case 'JSXAttribute': {
        const name = current.name.type === 'JSXIdentifier' ? current.name.name : '';
        return name === 'className' || name === 'class';
      }
      case 'CallExpression': {
        const callee = current.callee;
        const calleeName =
          callee.type === 'Identifier' ? callee.name : callee.type === 'MemberExpression' ? keyName(callee) : undefined;
        if (current.callee === child) break;
        if (calleeName !== undefined && CLASS_HELPERS.has(calleeName)) return true;
        // el.classList.add('...'), toggle, replace
        if (callee.type === 'MemberExpression' && callee.object.type === 'MemberExpression' && keyName(callee.object) === 'classList') {
          return true;
        }
        break;
      }
      case 'VariableDeclarator':
        return current.id.type === 'Identifier' && CLASS_NAME_PATTERN.test(current.id.name);
      case 'Property':
      case 'PropertyDefinition': {
        if (current.value === child) {
          const name = keyName(current);
          if (name !== undefined && CLASS_NAME_PATTERN.test(name)) return true;
        }
        break;
      }
      case 'AssignmentExpression': {
        if (current.left.type === 'MemberExpression') {
          const name = keyName(current.left);
          return name !== undefined && CLASS_NAME_PATTERN.test(name);
        }
        return current.left.type === 'Identifier' && CLASS_NAME_PATTERN.test(current.left.name);
      }
      case 'Program':
      case 'BlockStatement':
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
      case 'ClassBody':
        return false;
      default:
        break;
    }
    child = current;
    current = current.parent;
  }
  return false;
}

/**
 * Whether an Identifier node sits in a type position (TypeScript), where it names a type, not a value.
 * @param {any} node
 * @returns {boolean}
 */
export function isTypePosition(node) {
  const parent = node.parent;
  if (parent === undefined || parent === null) return false;
  return (
    parent.type === 'TSTypeReference' ||
    parent.type === 'TSTypeQuery' ||
    parent.type === 'TSQualifiedName' ||
    parent.type === 'TSInterfaceHeritage' ||
    parent.type === 'TSClassImplements' ||
    parent.type === 'TSExpressionWithTypeArguments' ||
    parent.type === 'TSTypePredicate'
  );
}
