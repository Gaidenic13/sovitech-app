/**
 * Copy units: the pieces of text a person could read, pulled out of source
 * files for the reserved-term check.
 *
 * Not copy: comments, module specifiers, type-level strings, class and
 * interface member names, and the key of an element access or an `in` test.
 *
 * Object keys (phase 0 round 2 review: labels held as keys passed): a key
 * written as a string that is not a machine key ('Formal quotation',
 * 'Firm price') is copy wherever it stands. Every key of an object whose keys
 * are handed out (Object.keys, Object.entries, Object.values,
 * Object.getOwnPropertyNames, Reflect.ownKeys, a for-in loop) is copy, the
 * identifier and lower-case keys included, because a page can render it. Such
 * an object is found by name across the scanned files (keyExposure below): a
 * name passed to one of those calls, every name in a property chain passed to
 * them, an imported name under its exported name, and every object spread into
 * one of them. An object handed out under a name no scanned file declares (a
 * prop, a function's return value) is not followed; its keys written as
 * display text are still copy, and its identifier and lower-case keys are not.
 *
 * A lower-case, single-token string (a machine key such as 'user_confirmed') is
 * not copy only where it can only be a key: one side of an ===/!== comparison, a
 * switch case, or a direct element of a registered machine-key list
 * (machine-keys.ts). Anywhere else, such as a label map, a ternary or a
 * variable, it may be rendered (upper-cased by CSS, for example), so it is copy.
 *
 * Tagged templates (t`...`, String.raw`...`, sql`...`) are copy: i18n
 * libraries use them for text, and SQL writes copy into the database.
 *
 * JSX attributes: on an intrinsic element (a lower-case tag such as <input>),
 * the technical attributes (className, id, type, ...) are not copy; on a
 * custom component (<Badge type="verified" />) every attribute but key and
 * ref is a prop the component may render, so it is read. data-* values are
 * read everywhere, because CSS attr() shows them.
 */
import ts from 'typescript';
import { parse as parseYaml } from 'yaml';

export type CopyUnitKind =
  | 'string'
  | 'template'
  | 'tagged-template'
  | 'object-key'
  | 'jsx-text'
  | 'jsx-attribute'
  | 'html-text'
  | 'html-attribute'
  | 'css-content'
  | 'catalogue'
  | 'data'
  | 'data-key'
  | 'sql-string'
  | 'text-template'
  | 'text';

export interface CopyUnit {
  /** One-based. */
  readonly line: number;
  /** One-based. */
  readonly column: number;
  readonly text: string;
  readonly kind: CopyUnitKind;
}

/** Stands for a filled slot: a template substitution or a JSX expression. */
export const SLOT = '{}';
/** Stands for a nested element inside JSX text; never part of a term. */
export const ELEMENT_BREAK = '\u0000';

/**
 * A lower-case token with no spaces, such as 'draft', 'user_confirmed' or
 * 'firm-price': it may be an identifier, enum key or event type, or a label
 * rendered through CSS text-transform. Its position decides (isCopy below).
 */
export const MACHINE_KEY = /^[a-z0-9]+(?:[._:/@#-][a-z0-9]+)*$/;

/** Property and attribute names whose string value is copy, even when it looks like a key. */
const COPY_NAMES = new Set([
  'label',
  'title',
  'text',
  'message',
  'description',
  'placeholder',
  'alt',
  'ariaLabel',
  'aria-label',
  'aria-description',
  'aria-valuetext',
  'heading',
  'subheading',
  'subtitle',
  'caption',
  'tooltip',
  'helper',
  'helperText',
  'hint',
  'summary',
  'body',
  'copy',
  'line',
  'sentence',
]);

/** Attributes that are never props a component renders: React consumes them. */
const REACT_RESERVED_ATTRIBUTES = new Set(['key', 'ref']);

/** Attributes of intrinsic elements (<div>, <input>, <svg>) that never hold copy. */
const TECHNICAL_ATTRIBUTES = new Set([
  'className',
  'class',
  'id',
  'key',
  'ref',
  'href',
  'src',
  'srcSet',
  'type',
  'role',
  'htmlFor',
  'for',
  'rel',
  'target',
  'method',
  'action',
  'name',
  'style',
  'lang',
  'dir',
  'tabIndex',
  'autoComplete',
  'inputMode',
  'form',
  'accept',
  'encType',
  'xmlns',
  'viewBox',
  'd',
  'fill',
  'stroke',
]);

/** Calls that hand out an object's own keys (or its values, which may be objects whose keys are then shown). */
const KEY_EXPOSING_CALLS: ReadonlyArray<readonly [string, string]> = [
  ['Object', 'keys'],
  ['Object', 'entries'],
  ['Object', 'values'],
  ['Object', 'getOwnPropertyNames'],
  ['Reflect', 'ownKeys'],
];

function scriptKind(fileName: string): ts.ScriptKind {
  if (fileName.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (fileName.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (/\.[cm]?js$/.test(fileName)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function parseScript(fileName: string, source: string): ts.SourceFile {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind(fileName));
}

function attributeName(node: ts.JsxAttribute): string {
  return ts.isIdentifier(node.name) ? node.name.text : `${node.name.namespace.text}:${node.name.name.text}`;
}

function nameText(name: ts.PropertyName | ts.JsxAttributeName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

/** True when the attribute sits on an intrinsic element: a lower-case tag, a custom element (with a hyphen) or a namespaced tag. */
function onIntrinsicElement(node: ts.JsxAttribute): boolean {
  const element = node.parent.parent;
  const tag = element.tagName;
  if (ts.isJsxNamespacedName(tag)) return true;
  if (ts.isIdentifier(tag)) return /^[a-z]/.test(tag.text) || tag.text.includes('-');
  return false;
}

/** True when `node` names a key rather than holding a value (object-literal keys are handled apart). */
function isKeyPosition(node: ts.Node): boolean {
  const parent = node.parent;
  if (parent === undefined) return false;
  if (
    (ts.isPropertyAssignment(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isMethodSignature(parent) ||
      ts.isEnumMember(parent) ||
      ts.isGetAccessorDeclaration(parent) ||
      ts.isSetAccessorDeclaration(parent)) &&
    parent.name === node
  ) {
    return true;
  }
  if (ts.isComputedPropertyName(parent) && parent.expression === node) return true;
  if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) return true;
  if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.InKeyword && parent.left === node) return true;
  return false;
}

/** The name of the property or copy attribute that `node` is the value of, if any. */
function holderName(node: ts.Node): string | undefined {
  const parent = node.parent;
  if (parent === undefined) return undefined;
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) return nameText(parent.name);
  if (ts.isJsxAttribute(parent)) return attributeName(parent);
  return undefined;
}

/** True when `node` is one side of an ===/!== comparison or the label of a switch case: a key being tested, never shown. */
function isComparedKey(node: ts.Node): boolean {
  const parent = node.parent;
  if (parent === undefined) return false;
  if (ts.isCaseClause(parent) && parent.expression === node) return true;
  if (!ts.isBinaryExpression(parent)) return false;
  const operator = parent.operatorToken.kind;
  const compares = operator === ts.SyntaxKind.EqualsEqualsEqualsToken || operator === ts.SyntaxKind.ExclamationEqualsEqualsToken;
  return compares && (parent.left === node || parent.right === node);
}

/** `child` sits directly inside `parent` as the thing a list declaration wraps: `as const`, `satisfies`, a type assertion, parentheses or Object.freeze(). */
function wrapsList(parent: ts.Node, child: ts.Node): boolean {
  if (ts.isAsExpression(parent) || ts.isSatisfiesExpression(parent) || ts.isTypeAssertionExpression(parent) || ts.isParenthesizedExpression(parent)) {
    return parent.expression === child;
  }
  if (ts.isCallExpression(parent) && parent.arguments.length === 1 && parent.arguments[0] === child) {
    const callee = parent.expression;
    return ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === 'Object' && callee.name.text === 'freeze';
  }
  return false;
}

/** The expression a declaration holds, with `as const`, `satisfies`, assertions, parentheses, `!` and Object.freeze() removed. */
function unwrapList(expression: ts.Expression): ts.Expression {
  let current = expression;
  for (;;) {
    if (
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      ts.isNonNullExpression(current)
    ) {
      current = current.expression;
      continue;
    }
    const argument = ts.isCallExpression(current) && current.arguments.length === 1 ? current.arguments[0] : undefined;
    if (argument !== undefined && wrapsList(current, argument)) {
      current = argument;
      continue;
    }
    return current;
  }
}

/**
 * True when `node` is a direct element of one of the named machine-key lists:
 * a string element of an array literal held by a `const` of that name, or a
 * string initialiser of an enum of that name. Nested objects are not covered.
 */
function inRegisteredList(node: ts.Node, lists: ReadonlySet<string>): boolean {
  if (lists.size === 0) return false;
  const parent = node.parent;
  if (parent === undefined) return false;
  if (ts.isEnumMember(parent) && parent.initializer === node) return lists.has(parent.parent.name.text);
  if (!ts.isArrayLiteralExpression(parent)) return false;
  let holder: ts.Node = parent;
  while (holder.parent !== undefined && wrapsList(holder.parent, holder)) holder = holder.parent;
  const declaration = holder.parent;
  return (
    declaration !== undefined &&
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer === holder &&
    ts.isIdentifier(declaration.name) &&
    lists.has(declaration.name.text)
  );
}

/**
 * The names in a file that can be registered as machine-key lists: `const`
 * declarations holding an array literal, and enums.
 */
export function listDeclarations(fileName: string, source: string): Set<string> {
  const file = parseScript(fileName, source);
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isEnumDeclaration(node)) names.add(node.name.text);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      if (ts.isArrayLiteralExpression(unwrapList(node.initializer))) names.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return names;
}

// ---------------------------------------------------------------------------
// Objects whose keys are handed out.

/** What one file says about objects whose keys are shown. */
export interface KeyExposure {
  /** Names of objects whose keys are handed out, as this file uses them (and, for imports, as they are exported). */
  readonly exposed: ReadonlySet<string>;
  /** For each variable this file declares with an object literal: the names spread into that literal. */
  readonly spreads: ReadonlyMap<string, ReadonlySet<string>>;
}

function isKeyExposingCall(node: ts.CallExpression): boolean {
  const callee = node.expression;
  if (!ts.isPropertyAccessExpression(callee) || !ts.isIdentifier(callee.expression)) return false;
  const owner = callee.expression.text;
  const method = callee.name.text;
  return KEY_EXPOSING_CALLS.some(([knownOwner, knownMethod]) => knownOwner === owner && knownMethod === method);
}

/** The names an expression refers to: an identifier, or every name along a property chain (`COPY.stages` gives COPY and stages). */
function namesIn(expression: ts.Expression): string[] {
  const current = unwrapList(expression);
  if (ts.isIdentifier(current)) return [current.text];
  if (ts.isPropertyAccessExpression(current)) return [...namesIn(current.expression), current.name.text];
  if (ts.isElementAccessExpression(current)) {
    const argument = current.argumentExpression;
    const key = ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument) ? [argument.text] : [];
    return [...namesIn(current.expression), ...key];
  }
  return [];
}

/** The expressions whose keys a file hands out: arguments of the key-exposing calls and for-in targets. */
function exposingTargets(file: ts.SourceFile): ts.Expression[] {
  const targets: ts.Expression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && isKeyExposingCall(node)) {
      const argument = node.arguments[0];
      if (argument !== undefined) targets.push(argument);
    }
    if (ts.isForInStatement(node)) targets.push(node.expression);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return targets;
}

/** Local import names mapped to the names they are exported under. */
function importedNames(file: ts.SourceFile): Map<string, string> {
  const names = new Map<string, string>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) names.set(element.name.text, (element.propertyName ?? element.name).text);
  }
  return names;
}

/** What `fileName` says about objects whose keys are shown (see KeyExposure). */
export function keyExposure(fileName: string, source: string): KeyExposure {
  const file = parseScript(fileName, source);
  const imports = importedNames(file);
  const exposed = new Set<string>();
  for (const target of exposingTargets(file)) {
    for (const name of namesIn(target)) {
      exposed.add(name);
      const exported = imports.get(name);
      if (exported !== undefined) exposed.add(exported);
    }
  }
  const spreads = new Map<string, Set<string>>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      const literal = unwrapList(node.initializer);
      if (ts.isObjectLiteralExpression(literal)) {
        const spread = spreads.get(node.name.text) ?? new Set<string>();
        for (const property of literal.properties) {
          if (!ts.isSpreadAssignment(property)) continue;
          for (const name of namesIn(property.expression)) {
            spread.add(name);
            const exported = imports.get(name);
            if (exported !== undefined) spread.add(exported);
          }
        }
        spreads.set(node.name.text, spread);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { exposed, spreads };
}

/** The names of every object whose keys are shown, following spreads to a fixed point across the given files. */
export function closeKeyExposure(exposures: readonly KeyExposure[]): Set<string> {
  const exposed = new Set<string>();
  const spreads = new Map<string, Set<string>>();
  for (const exposure of exposures) {
    for (const name of exposure.exposed) exposed.add(name);
    for (const [name, sources] of exposure.spreads) {
      const merged = spreads.get(name) ?? new Set<string>();
      for (const source of sources) merged.add(source);
      spreads.set(name, merged);
    }
  }
  const pending = [...exposed];
  while (pending.length > 0) {
    const name = pending.pop() ?? '';
    for (const source of spreads.get(name) ?? []) {
      if (exposed.has(source)) continue;
      exposed.add(source);
      pending.push(source);
    }
  }
  return exposed;
}

/** Object literals in `file` whose keys are shown: held by an exposed name, or passed inline to a key-exposing call; nested literals included. */
function exposedObjectLiterals(file: ts.SourceFile, exposedNames: ReadonlySet<string>): Set<ts.ObjectLiteralExpression> {
  const found = new Set<ts.ObjectLiteralExpression>();
  const mark = (node: ts.Node): void => {
    if (ts.isFunctionLike(node)) return;
    if (ts.isObjectLiteralExpression(node)) found.add(node);
    ts.forEachChild(node, mark);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined && exposedNames.has(node.name.text)) {
      const literal = unwrapList(node.initializer);
      if (ts.isObjectLiteralExpression(literal)) mark(literal);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  for (const target of exposingTargets(file)) {
    const literal = unwrapList(target);
    if (ts.isObjectLiteralExpression(literal)) mark(literal);
  }
  return found;
}

/** The key of an object-literal member as written, with the node to report it at; undefined for a numeric or computed non-literal key. */
function objectKey(member: ts.ObjectLiteralElementLike): { text: string; node: ts.Node; literal: boolean } | undefined {
  if (ts.isSpreadAssignment(member)) return undefined;
  const name = member.name;
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) return { text: name.text, node: name, literal: false };
  if (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) return { text: name.text, node: name, literal: true };
  if (ts.isComputedPropertyName(name)) {
    const inner = name.expression;
    if (ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner)) return { text: inner.text, node: inner, literal: true };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Scripts.

function isModuleLoad(node: ts.CallExpression): boolean {
  if (node.expression.kind === ts.SyntaxKind.ImportKeyword) return true;
  return ts.isIdentifier(node.expression) && node.expression.text === 'require';
}

function collapseJsxWhitespace(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ');
}

function isStringRaw(tag: ts.Expression): boolean {
  return ts.isPropertyAccessExpression(tag) && ts.isIdentifier(tag.expression) && tag.expression.text === 'String' && tag.name.text === 'raw';
}

/**
 * Copy units of a TypeScript or JavaScript file. `skipConstants` names
 * variables whose initialisers are skipped whole (used only for the
 * reserved-term list's own definition). `machineKeyLists` names the registered
 * machine-key lists declared in this file (machine-keys.ts). `exposedNames`
 * names the objects, across the scanned files, whose keys are handed out
 * (closeKeyExposure); the file's own key-exposing calls are always added.
 */
export function extractFromScript(
  fileName: string,
  source: string,
  skipConstants: ReadonlySet<string>,
  machineKeyLists: ReadonlySet<string> = new Set(),
  exposedNames: ReadonlySet<string> = new Set(),
): CopyUnit[] {
  const file = parseScript(fileName, source);
  const units: CopyUnit[] = [];
  const consumed = new Set<ts.Node>();
  const ownExposure = closeKeyExposure([keyExposure(fileName, source), { exposed: exposedNames, spreads: new Map() }]);
  const exposedObjects = exposedObjectLiterals(file, ownExposure);

  const push = (node: ts.Node, text: string, kind: CopyUnitKind): void => {
    if (text.trim() === '') return;
    const { line, character } = file.getLineAndCharacterOfPosition(node.getStart(file));
    units.push({ line: line + 1, column: character + 1, text, kind });
  };

  const isCopy = (node: ts.Node, text: string): boolean => {
    if (text.trim() === '') return false;
    if (!MACHINE_KEY.test(text)) return true;
    const holder = holderName(node);
    if (holder !== undefined && COPY_NAMES.has(holder)) return true;
    return !isComparedKey(node) && !inRegisteredList(node, machineKeyLists);
  };

  const jsxChildren = (children: ts.NodeArray<ts.JsxChild>): void => {
    let text = '';
    let anchor: ts.Node | undefined;
    for (const child of children) {
      if (ts.isJsxText(child)) {
        text += collapseJsxWhitespace(child.text);
        if (!child.containsOnlyTriviaWhiteSpaces) anchor ??= child;
      } else if (ts.isJsxExpression(child)) {
        const inner = child.expression;
        if (inner !== undefined && (ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner))) {
          text += inner.text;
          consumed.add(inner);
          anchor ??= inner;
        } else if (inner !== undefined) {
          text += SLOT;
        }
      } else {
        text += ELEMENT_BREAK;
      }
    }
    if (anchor !== undefined) push(anchor, text.trim(), 'jsx-text');
  };

  const objectKeys = (literal: ts.ObjectLiteralExpression): void => {
    const shown = exposedObjects.has(literal);
    for (const member of literal.properties) {
      const key = objectKey(member);
      if (key === undefined) continue;
      consumed.add(key.node);
      if (shown || (key.literal && !MACHINE_KEY.test(key.text))) push(key.node, key.text, 'object-key');
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isImportEqualsDeclaration(node)) return;
    if (ts.isLiteralTypeNode(node) || ts.isImportTypeNode(node) || ts.isExternalModuleReference(node)) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && skipConstants.has(node.name.text)) return;
    if (ts.isCallExpression(node) && isModuleLoad(node)) {
      node.arguments.slice(1).forEach(visit);
      return;
    }
    if (ts.isTaggedTemplateExpression(node)) {
      const template = node.template;
      const raw = isStringRaw(node.tag);
      const read = (part: ts.TemplateLiteralLikeNode): string => (raw ? (part.rawText ?? part.text) : part.text || (part.rawText ?? ''));
      const text = ts.isNoSubstitutionTemplateLiteral(template)
        ? read(template)
        : read(template.head) + template.templateSpans.map((span) => SLOT + read(span.literal)).join('');
      push(template, text, 'tagged-template');
      visit(node.tag);
      if (ts.isTemplateExpression(template)) template.templateSpans.forEach((span) => visit(span.expression));
      return;
    }
    if (ts.isJsxText(node) || consumed.has(node)) return;
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) jsxChildren(node.children);
    if (ts.isObjectLiteralExpression(node)) objectKeys(node);
    if (ts.isJsxAttribute(node)) {
      const name = attributeName(node);
      if (REACT_RESERVED_ATTRIBUTES.has(name)) return;
      if (onIntrinsicElement(node) && TECHNICAL_ATTRIBUTES.has(name)) return;
      const value = node.initializer;
      if (value !== undefined && ts.isStringLiteral(value)) {
        if (isCopy(value, value.text)) push(value, value.text, 'jsx-attribute');
        return;
      }
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isKeyPosition(node) && isCopy(node, node.text)) push(node, node.text, 'string');
      return;
    }
    if (ts.isTemplateExpression(node)) {
      const text = node.head.text + node.templateSpans.map((span) => SLOT + span.literal.text).join('');
      push(node, text, 'template');
      node.templateSpans.forEach((span) => visit(span.expression));
      return;
    }
    ts.forEachChild(node, visit);
  };

  visit(file);
  return units;
}

// ---------------------------------------------------------------------------
// Markup, styles, data, SQL, templates and text.

function lineAndColumn(source: string, index: number): { line: number; column: number } {
  const before = source.slice(0, index);
  const line = before.split('\n').length;
  return { line, column: index - before.lastIndexOf('\n') };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(parseInt(decimal, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Attributes whose values a page shows: text alternatives and labels, form values, and data-* values (CSS attr() renders them). */
const HTML_COPY_ATTRIBUTES =
  /\s(title|alt|placeholder|aria-label|aria-description|aria-valuetext|aria-placeholder|aria-roledescription|content|label|value|data-[\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

/** Blanks a matched span, keeping its line breaks so later line numbers hold. */
const blank = (match: string): string => match.replace(/[^\n]/g, ' ');

/**
 * Copy units of an HTML or SVG file: text between tags (and before the first
 * or after the last tag), and the copy attributes. Scripts, styles and comments
 * are not read.
 */
export function extractFromHtml(source: string): CopyUnit[] {
  const cleaned = source
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, blank)
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, blank)
    .replace(/<[!?][^>]*>/g, blank);
  const found: Array<{ index: number; text: string; kind: CopyUnitKind }> = [];
  for (const match of cleaned.matchAll(/(?:^|>)([^<>]+)(?=<|$)/g)) {
    const text = decodeEntities(match[1] ?? '').trim();
    const offset = match[0].startsWith('>') ? 1 : 0;
    if (text !== '') found.push({ index: match.index + offset, text, kind: 'html-text' });
  }
  for (const tag of cleaned.matchAll(/<[a-z][^>]*>/gi)) {
    for (const attribute of tag[0].matchAll(HTML_COPY_ATTRIBUTES)) {
      const text = decodeEntities(attribute[2] ?? attribute[3] ?? '').trim();
      if (text !== '') found.push({ index: tag.index + attribute.index, text, kind: 'html-attribute' });
    }
  }
  return found
    .sort((left, right) => left.index - right.index)
    .map(({ index, text, kind }) => ({ ...lineAndColumn(source, index), text, kind }));
}

/** Copy units of a CSS file: `content` strings. */
export function extractFromCss(source: string): CopyUnit[] {
  const units: CopyUnit[] = [];
  for (const match of source.matchAll(/\bcontent\s*:\s*(["'])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    const text = match[2] ?? '';
    if (text.trim() !== '') units.push({ ...lineAndColumn(source, match.index), text, kind: 'css-content' });
  }
  return units;
}

/** JSON with // and /* *\/ comments and trailing commas (tsconfig.json), made plain JSON. Strings are left as they are. */
export function stripJsonComments(source: string): string {
  let out = '';
  let index = 0;
  while (index < source.length) {
    const char = source[index] ?? '';
    const next = source[index + 1] ?? '';
    if (char === '"') {
      let end = index + 1;
      while (end < source.length && source[end] !== '"') end += source[end] === '\\' ? 2 : 1;
      out += source.slice(index, end + 1);
      index = end + 1;
    } else if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
    } else if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      const stop = end < 0 ? source.length : end + 2;
      out += blank(source.slice(index, stop));
      index = stop;
    } else if (char === ',' && /^\s*[}\]]/.test(source.slice(index + 1, index + 200).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, ''))) {
      out += ' ';
      index += 1;
    } else {
      out += char;
      index += 1;
    }
  }
  return out;
}

/**
 * Copy units of a data file (JSON or YAML): every string value, and every key
 * that is not a machine key. `keys: false` reads values only (a registered
 * string catalogue, whose keys are message ids).
 */
export function extractFromData(source: string, format: 'json' | 'yaml', options: { keys: boolean } = { keys: true }): CopyUnit[] {
  const data: unknown = format === 'json' ? JSON.parse(stripJsonComments(source)) : parseYaml(source);
  const strings: Array<{ text: string; kind: CopyUnitKind }> = [];
  const walk = (value: unknown): void => {
    if (typeof value === 'string') strings.push({ text: value, kind: options.keys ? 'data' : 'catalogue' });
    else if (Array.isArray(value)) value.forEach(walk);
    else if (typeof value === 'object' && value !== null) {
      for (const [key, inner] of Object.entries(value)) {
        if (options.keys && !MACHINE_KEY.test(key)) strings.push({ text: key, kind: 'data-key' });
        walk(inner);
      }
    }
  };
  walk(data);
  let searchFrom = 0;
  return strings
    .filter(({ text }) => text.trim() !== '')
    .map(({ text, kind }) => {
      const written = format === 'json' ? JSON.stringify(text) : text;
      const at = source.indexOf(written, searchFrom);
      const index = at >= 0 ? at : source.indexOf(written);
      if (at >= 0) searchFrom = at + written.length;
      return { ...lineAndColumn(source, index >= 0 ? index : 0), text, kind };
    });
}

/** Copy units of a registered string catalogue: every string value, keys excluded. */
export function extractFromCatalogue(source: string, format: 'json' | 'yaml'): CopyUnit[] {
  return extractFromData(source, format, { keys: false });
}

/** Copy units of an SQL file (a migration or a seed): every string literal. Comments are not read. */
export function extractFromSql(source: string): CopyUnit[] {
  const cleaned = source.replace(/\/\*[\s\S]*?\*\//g, blank);
  const units: CopyUnit[] = [];
  let index = 0;
  while (index < cleaned.length) {
    const char = cleaned[index];
    if (char === '-' && cleaned[index + 1] === '-') {
      while (index < cleaned.length && cleaned[index] !== '\n') index += 1;
      continue;
    }
    if (char === "'") {
      let end = index + 1;
      let text = '';
      while (end < cleaned.length) {
        if (cleaned[end] === "'" && cleaned[end + 1] === "'") {
          text += "'";
          end += 2;
        } else if (cleaned[end] === "'") {
          break;
        } else {
          text += cleaned[end];
          end += 1;
        }
      }
      if (text.trim() !== '') units.push({ ...lineAndColumn(source, index), text, kind: 'sql-string' });
      index = end + 1;
      continue;
    }
    index += 1;
  }
  return units;
}

/**
 * Copy units of a text template (Handlebars, Mustache, EJS, Nunjucks, Liquid,
 * Jinja): its markup and text as for HTML, with each expression read as a
 * slot, and every quoted string inside an expression (a helper's argument).
 */
export function extractFromTextTemplate(source: string): CopyUnit[] {
  const withoutComments = source
    .replace(/\{\{!--[\s\S]*?--\}\}/g, blank)
    .replace(/\{\{![\s\S]*?\}\}/g, blank)
    .replace(/<%#[\s\S]*?%>/g, blank)
    .replace(/\{#[\s\S]*?#\}/g, blank);
  const expression = /\{\{[\s\S]*?\}\}|<%[\s\S]*?%>|\{%[\s\S]*?%\}/g;
  const units: CopyUnit[] = [];
  for (const match of withoutComments.matchAll(expression)) {
    for (const quoted of match[0].matchAll(/"([^"\n]*)"|'([^'\n]*)'/g)) {
      const text = quoted[1] ?? quoted[2] ?? '';
      if (text.trim() !== '') units.push({ ...lineAndColumn(source, match.index + quoted.index), text, kind: 'text-template' });
    }
  }
  const markup = withoutComments.replace(expression, (match) => SLOT + match.replace(/[^\n]/g, ''));
  for (const unit of extractFromHtml(markup)) units.push({ ...unit, kind: unit.kind === 'html-text' ? 'text-template' : unit.kind });
  return units.sort((left, right) => left.line - right.line || left.column - right.column);
}

/** Copy units of a plain text or Markdown file: every line with text. */
export function extractFromText(source: string): CopyUnit[] {
  const units: CopyUnit[] = [];
  source.split('\n').forEach((line, index) => {
    const text = line.trim();
    if (text !== '') units.push({ line: index + 1, column: line.indexOf(text) + 1, text, kind: 'text' });
  });
  return units;
}
