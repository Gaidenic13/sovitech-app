/**
 * Readers for the small parts of TOML and INI the Python tool configs use:
 * tables or sections, and keys whose values are strings, numbers, booleans or
 * arrays of those (arrays may span lines). Anything else is kept as raw text.
 */

export type Tables = Record<string, Record<string, unknown>>;

function stripComment(line: string): string {
  let quote: string | undefined;
  for (let position = 0; position < line.length; position += 1) {
    const character = line[position];
    if (quote !== undefined) {
      if (character === '\\' && quote === '"') position += 1;
      else if (character === quote) quote = undefined;
    } else if (character === '"' || character === "'") quote = character;
    else if (character === '#') return line.slice(0, position);
  }
  return line;
}

function bracketBalance(text: string): number {
  let depth = 0;
  let quote: string | undefined;
  for (let position = 0; position < text.length; position += 1) {
    const character = text[position];
    if (quote !== undefined) {
      if (character === '\\' && quote === '"') position += 1;
      else if (character === quote) quote = undefined;
    } else if (character === '"' || character === "'") quote = character;
    else if (character === '[') depth += 1;
    else if (character === ']') depth -= 1;
  }
  return depth;
}

function splitTopLevel(inner: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | undefined;
  let current = '';
  for (let position = 0; position < inner.length; position += 1) {
    const character = inner[position] ?? '';
    if (quote !== undefined) {
      current += character;
      if (character === '\\' && quote === '"') {
        current += inner[position + 1] ?? '';
        position += 1;
      } else if (character === quote) quote = undefined;
    } else if (character === '"' || character === "'") {
      quote = character;
      current += character;
    } else if (character === '[' || character === '{') {
      depth += 1;
      current += character;
    } else if (character === ']' || character === '}') {
      depth -= 1;
      current += character;
    } else if (character === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else current += character;
  }
  if (current.trim() !== '') parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part !== '');
}

function parseValue(raw: string): unknown {
  const value = raw.trim();
  if (value.startsWith('"""') || value.startsWith("'''")) return value.slice(3, -3);
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1).replace(/\\(["\\])/g, '$1');
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  if (value.startsWith('[') && value.endsWith(']')) return splitTopLevel(value.slice(1, -1)).map(parseValue);
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^[+-]?\d+(\.\d+)?$/.test(value)) return parseFloat(value);
  return value;
}

/** Reads a TOML file into tables; top-level keys sit in table ''. Dotted keys extend the table name. */
export function parseTomlSubset(text: string): Tables {
  const tables: Tables = { '': {} };
  let table = '';
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    let line = stripComment(lines[index] ?? '').trim();
    if (line === '') continue;
    const header = /^\[\[?\s*([^\]]+?)\s*\]\]?$/.exec(line);
    if (header !== null) {
      table = (header[1] ?? '').replace(/["']/g, '');
      tables[table] ??= {};
      continue;
    }
    const equals = line.indexOf('=');
    if (equals < 0) continue;
    while (bracketBalance(line) > 0 && index + 1 < lines.length) {
      index += 1;
      line += ` ${stripComment(lines[index] ?? '').trim()}`;
    }
    const key = line.slice(0, equals).trim().replace(/["']/g, '');
    const value = parseValue(line.slice(equals + 1));
    const dot = key.lastIndexOf('.');
    const target = dot < 0 ? table : [table, key.slice(0, dot)].filter((part) => part !== '').join('.');
    const name = dot < 0 ? key : key.slice(dot + 1);
    tables[target] ??= {};
    (tables[target] as Record<string, unknown>)[name] = value;
  }
  return tables;
}

/** Reads an INI file (pytest.ini, tox.ini, setup.cfg) into sections; indented lines continue a value. */
export function parseIni(text: string): Tables {
  const sections: Tables = { '': {} };
  let section = '';
  let lastKey: string | undefined;
  for (const rawLine of text.split('\n')) {
    if (/^\s*[#;]/.test(rawLine) || rawLine.trim() === '') continue;
    const header = /^\s*\[([^\]]+)\]\s*$/.exec(rawLine);
    if (header !== null) {
      section = (header[1] ?? '').trim();
      sections[section] ??= {};
      lastKey = undefined;
      continue;
    }
    const current = sections[section] ?? {};
    if (/^\s/.test(rawLine) && lastKey !== undefined) {
      current[lastKey] = `${String(current[lastKey] ?? '')}\n${rawLine.trim()}`;
      continue;
    }
    const pair = /^([^=:]+)[=:](.*)$/.exec(rawLine);
    if (pair === null) continue;
    lastKey = (pair[1] ?? '').trim();
    current[lastKey] = (pair[2] ?? '').trim();
    sections[section] = current;
  }
  return sections;
}

/** A TOML list, or an INI value split on whitespace and commas. */
export function listOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string') return value.split(/[\s,]+/).filter((item) => item !== '');
  return [];
}
