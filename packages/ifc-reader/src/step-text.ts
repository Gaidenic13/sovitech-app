/**
 * The in-house STEP text reader: word-for-word evidence excerpts only (owner decision,
 * 2026-09-26: "web-ifc instead"; docs/adr/0018 and docs/adr/0031).
 *
 * web-ifc reads the model: its classes, attributes, relations and values. This reader
 * reads the file's text, for three things web-ifc does not give back as written:
 * - the verbatim statement of an instance, from "#" to ";", which is a fact's excerpt
 *   (ifc-input 4.1 item 3);
 * - the literal tokens of that statement: a real or an integer stays its token
 *   (`430000.`, `+007`), and a string keeps its token, escapes included, beside its decoded
 *   text (the contract's typed STEP literals); the reader never turns text into a number
 *   (prompt 3 section 6);
 * - what in the text breaks ISO 10303-21 (a statement that cannot be read, a duplicate or
 *   complex instance, text outside the 7-bit form), as codes and STEP ids, never text
 *   (guardrails rule 13).
 *
 * It decides nothing about the model: which instances are what, and how they relate, comes
 * from web-ifc. A statement's tokens are compared with what web-ifc read (./model.ts), and a
 * disagreement gives no fact.
 *
 * The same reader exists in Python (services/extractor/src/sovitech_extractor/ifc/step.py),
 * and both read the shared corpus in ./step-text-corpus.json the same way.
 *
 * The index is one pass that finds where each statement starts and ends; tokens are read
 * only when asked, so the geometry that makes up most of a large model is never tokenised.
 */

import { TextDecoder } from 'node:util';

export type StepToken =
  | { readonly kind: 'unset' }
  | { readonly kind: 'derived' }
  | { readonly kind: 'ref'; readonly id: string }
  | { readonly kind: 'enum'; readonly token: string }
  | { readonly kind: 'real'; readonly token: string }
  | { readonly kind: 'integer'; readonly token: string }
  | { readonly kind: 'string'; readonly token: string; readonly text: string }
  | { readonly kind: 'binary'; readonly token: string }
  | { readonly kind: 'typed'; readonly typeName: string; readonly value: StepToken }
  | { readonly kind: 'list'; readonly items: readonly StepToken[] };

/** A statement or a string that breaks the ISO 10303-21 grammar. The message is a code. */
export class StepSyntaxError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'StepSyntaxError';
  }
}

/** The text is not an ISO 10303-21 exchange file (no magic, header or data section). */
export class NotStepError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'NotStepError';
  }
}

/** Something the reader could not read: a code and the STEP ids it concerns, never text. */
export interface ReadProblem {
  readonly code: string;
  readonly stepIds: readonly string[];
}

/**
 * The ISO 10303-21 code pages of the \S\ and \P?\ escapes: A is ISO 8859-1, B to I are
 * ISO 8859-2 to -9. \S\ only reaches the upper half from 0xA0 on, where the WHATWG decoders
 * of these labels agree with the ISO tables (they differ only between 0x80 and 0x9F).
 */
const CODE_PAGES: Readonly<Record<string, string>> = {
  A: 'iso-8859-1',
  B: 'iso-8859-2',
  C: 'iso-8859-3',
  D: 'iso-8859-4',
  E: 'iso-8859-5',
  F: 'iso-8859-6',
  G: 'iso-8859-7',
  H: 'iso-8859-8',
  I: 'iso-8859-9',
};

const decoders = new Map<string, TextDecoder>();
function decoder(label: string): TextDecoder {
  let found = decoders.get(label);
  if (found === undefined) {
    found = new TextDecoder(label, { fatal: true });
    decoders.set(label, found);
  }
  return found;
}

function bytesOfHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    const pair = hex.slice(index * 2, index * 2 + 2);
    bytes[index] = HEX_PAIRS.get(pair.toUpperCase()) ?? failHex();
  }
  return bytes;
}

function failHex(): never {
  throw new StepSyntaxError('step.string_escape');
}

/** Every two-digit hex pair and its byte, built from text so no text is read as a number. */
const HEX_PAIRS: ReadonlyMap<string, number> = (() => {
  const digits = '0123456789ABCDEF';
  const pairs = new Map<string, number>();
  for (let high = 0; high < 16; high += 1) {
    for (let low = 0; low < 16; low += 1) pairs.set(`${digits.charAt(high)}${digits.charAt(low)}`, high * 16 + low);
  }
  return pairs;
})();

const STRING_PART =
  /(?<quote>'')|(?<backslash>\\\\)|\\S\\(?<upper>[\x20-\x7e])|\\P(?<page>[A-I])\\|\\X2\\(?<ucs2>(?:[0-9A-Fa-f]{4})*)\\X0\\|\\X4\\(?<ucs4>(?:[0-9A-Fa-f]{8})*)\\X0\\|\\X\\(?<byte>[0-9A-Fa-f]{2})|(?<plain>[^'\\]+)/y;

/** The text of a STEP string token (ISO 10303-21 7.3.3), quotes and escapes resolved. */
export function decodeString(token: string): string {
  if (token.length < 2 || !token.startsWith("'") || !token.endsWith("'")) throw new StepSyntaxError('step.string_token');
  const body = token.slice(1, -1);
  const out: string[] = [];
  let page = 'A';
  let position = 0;
  while (position < body.length) {
    STRING_PART.lastIndex = position;
    const part = STRING_PART.exec(body);
    const groups = part?.groups;
    if (part === null || groups === undefined) throw new StepSyntaxError('step.string_escape');
    position = STRING_PART.lastIndex;
    if (groups['plain'] !== undefined) out.push(groups['plain']);
    else if (groups['quote'] !== undefined) out.push("'");
    else if (groups['backslash'] !== undefined) out.push('\\');
    else if (groups['page'] !== undefined) page = groups['page'];
    else if (groups['upper'] !== undefined) {
      const high = new Uint8Array([groups['upper'].charCodeAt(0) + 128]);
      out.push(decodeWith(CODE_PAGES[page] ?? 'iso-8859-1', high));
    } else if (groups['byte'] !== undefined) out.push(decodeWith('iso-8859-1', bytesOfHex(groups['byte'])));
    else if (groups['ucs2'] !== undefined) out.push(decodeWith('utf-16be', bytesOfHex(groups['ucs2'])));
    else if (groups['ucs4'] !== undefined) out.push(decodeUcs4(groups['ucs4']));
  }
  return out.join('');
}

function decodeWith(label: string, bytes: Uint8Array): string {
  // ISO 8859-1 maps each byte to the code point of the same value (WHATWG's "latin1" is
  // windows-1252, which differs between 0x80 and 0x9F), as Python's iso8859-1 does.
  if (label === 'iso-8859-1') return Buffer.from(bytes).toString('latin1');
  try {
    return decoder(label).decode(bytes);
  } catch {
    throw new StepSyntaxError('step.string_escape');
  }
}

/** UTF-32 big-endian has no TextDecoder: each 8-digit group is one code point. */
function decodeUcs4(hex: string): string {
  const out: string[] = [];
  for (let index = 0; index < hex.length; index += 8) {
    const bytes = bytesOfHex(hex.slice(index, index + 8));
    const [b0, b1, b2, b3] = [bytes[0], bytes[1], bytes[2], bytes[3]];
    if (b0 === undefined || b1 === undefined || b2 === undefined || b3 === undefined) throw new StepSyntaxError('step.string_escape');
    const codePoint = b0 * 16777216 + b1 * 65536 + b2 * 256 + b3;
    if (codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) throw new StepSyntaxError('step.string_escape');
    out.push(String.fromCodePoint(codePoint));
  }
  return out.join('');
}

// Character codes the scanners compare against.
const HASH = 35;
const EQUALS = 61;
const SEMICOLON = 59;
const QUOTE = 39;
const SLASH = 47;
const STAR = 42;
const OPEN = 40;

function isSpace(code: number): boolean {
  return code === 32 || code === 9 || code === 10 || code === 13;
}
function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}
function isKeywordStart(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95;
}
function isKeywordPart(code: number): boolean {
  return isKeywordStart(code) || isDigit(code);
}

/** Skips whitespace and comments; returns the next position, or -1 inside an unclosed comment. */
function skip(text: string, from: number, end: number): number {
  let position = from;
  while (position < end) {
    const code = text.charCodeAt(position);
    if (isSpace(code)) position += 1;
    else if (code === SLASH && text.charCodeAt(position + 1) === STAR) {
      const close = text.indexOf('*/', position + 2);
      if (close < 0 || close + 2 > end) return -1;
      position = close + 2;
    } else break;
  }
  return position;
}

/** The position just after the ";" that ends a statement, skipping strings and comments; -1 when none. */
function statementEnd(text: string, from: number): number {
  let position = from;
  const length = text.length;
  while (position < length) {
    const code = text.charCodeAt(position);
    if (code === SEMICOLON) return position + 1;
    if (code === QUOTE) {
      // A string runs to the next quote that is not doubled.
      let inside = position + 1;
      for (;;) {
        const close = text.indexOf("'", inside);
        if (close < 0) return -1;
        if (text.charCodeAt(close + 1) === QUOTE) inside = close + 2;
        else {
          position = close + 1;
          break;
        }
      }
    } else if (code === SLASH && text.charCodeAt(position + 1) === STAR) {
      const close = text.indexOf('*/', position + 2);
      if (close < 0) return -1;
      position = close + 2;
    } else position += 1;
  }
  return -1;
}

const MAGIC = /^(?:\uFEFF)?[ \t\r\n]*ISO-10303-21[ \t\r\n]*;/u;
const SECTION = (name: string) => new RegExp(`(?:^|[;\\s])${name}[ \\t\\r\\n]*;`, 'gu');

function sectionStart(text: string, name: string, from: number): number {
  const pattern = SECTION(name);
  pattern.lastIndex = from;
  const found = pattern.exec(text);
  if (found === null) throw new NotStepError(`step.no_${name.toLowerCase()}_section`);
  return found.index + found[0].length;
}

/** A read STEP file's text: where each statement is, its keyword, its problems; tokens on request. */
export class StepText {
  private readonly slots = new Map<string, number>();
  private readonly order: string[] = [];
  private readonly starts: number[] = [];
  private readonly ends: number[] = [];
  /** Where the parameter list's "(" is, or -1 for a complex instance. */
  private readonly params: number[] = [];
  private readonly keywordStarts: number[] = [];
  private readonly keywordEnds: number[] = [];
  readonly problems: ReadProblem[] = [];
  private readonly headerStart: number;
  private readonly headerEnd: number;

  constructor(readonly text: string) {
    if (!MAGIC.test(text)) throw new NotStepError('step.not_step');
    const headerStart = sectionStart(text, 'HEADER', 0);
    const headerEnd = text.indexOf('ENDSEC', headerStart);
    if (headerEnd < 0) throw new NotStepError('step.no_header_section');
    this.headerStart = headerStart;
    this.headerEnd = headerEnd;
    const dataStart = sectionStart(text, 'DATA', headerEnd);
    this.index(dataStart);
    if (!isAscii(text)) this.problems.push({ code: 'step.non_ascii_text', stepIds: [] });
  }

  private index(from: number): void {
    const { text } = this;
    const length = text.length;
    let position = from;
    let ended = false;
    while (position < length) {
      const next = skip(text, position, length);
      if (next < 0) break;
      position = next;
      if (position >= length) break;
      if (text.startsWith('ENDSEC', position)) {
        ended = true;
        break;
      }
      const statement = this.statementAt(position);
      if (statement === undefined) {
        this.problems.push({ code: 'step.unexpected_text', stepIds: [] });
        const resync = statementEnd(text, position);
        if (resync < 0) break;
        position = resync;
        continue;
      }
      position = statement.end;
    }
    if (!ended) this.problems.push({ code: 'step.no_endsec', stepIds: [] });
  }

  /** Reads "#id = body ;" at a position; records it and returns its end, or undefined. */
  private statementAt(start: number): { readonly end: number } | undefined {
    const { text } = this;
    if (text.charCodeAt(start) !== HASH) return undefined;
    let position = start + 1;
    const idStart = position;
    while (isDigit(text.charCodeAt(position))) position += 1;
    if (position === idStart) return undefined;
    const id = text.slice(idStart, position);
    position = skip(text, position, text.length);
    if (position < 0 || text.charCodeAt(position) !== EQUALS) return undefined;
    const bodyStart = skip(text, position + 1, text.length);
    if (bodyStart < 0) return undefined;
    const end = statementEnd(text, bodyStart);
    if (end < 0) return undefined;
    let keywordEnd = bodyStart;
    let paramStart = -1;
    if (isKeywordStart(text.charCodeAt(bodyStart))) {
      keywordEnd = bodyStart + 1;
      while (isKeywordPart(text.charCodeAt(keywordEnd))) keywordEnd += 1;
      const open = skip(text, keywordEnd, end);
      if (open >= 0 && text.charCodeAt(open) === OPEN) paramStart = open;
    }
    if (this.slots.has(id)) {
      this.problems.push({ code: 'step.duplicate_id', stepIds: [id] });
      return { end };
    }
    if (paramStart < 0) this.problems.push({ code: 'step.complex_instance', stepIds: [id] });
    this.slots.set(id, this.order.length);
    this.order.push(id);
    this.starts.push(start);
    this.ends.push(end);
    this.params.push(paramStart);
    this.keywordStarts.push(bodyStart);
    this.keywordEnds.push(paramStart < 0 ? bodyStart : keywordEnd);
    return { end };
  }

  /**
   * The first schema name the header's FILE_SCHEMA declares, as written, or undefined. The
   * data pass takes the schema from web-ifc; this is for the engineer's record of a file whose
   * schema web-ifc does not read, which says what the file declares.
   */
  declaredSchema(): string | undefined {
    const found = /FILE_SCHEMA[ \t\r\n]*\(/u.exec(this.text.slice(this.headerStart, this.headerEnd));
    if (found === null) return undefined;
    const open = this.headerStart + found.index + found[0].length - 1;
    const end = statementEnd(this.text, open);
    if (end < 0 || end > this.headerEnd) return undefined;
    try {
      const [schemas] = new Tokenizer(this.text, open + 1, end - 1).list();
      const [first] = schemas?.kind === 'list' ? schemas.items : [];
      return first?.kind === 'string' ? first.text : undefined;
    } catch (error) {
      if (error instanceof StepSyntaxError) return undefined;
      throw error;
    }
  }

  /** Every instance id, in file order. */
  ids(): readonly string[] {
    return this.order;
  }

  get size(): number {
    return this.order.length;
  }

  has(id: string): boolean {
    return this.slots.has(id);
  }

  private slot(id: string): number {
    const slot = this.slots.get(id);
    if (slot === undefined) throw new StepSyntaxError('step.unresolved_reference');
    return slot;
  }

  /** The entity keyword of an instance, upper case, or undefined for a complex instance. */
  keyword(id: string): string | undefined {
    const slot = this.slot(id);
    if ((this.params[slot] ?? -1) < 0) return undefined;
    return this.text.slice(this.keywordStarts[slot], this.keywordEnds[slot]).toUpperCase();
  }

  /** Where the instance's statement starts in the file (for file order). */
  position(id: string): number {
    return this.starts[this.slot(id)] ?? -1;
  }

  /** The instance's statement exactly as the file writes it, from "#" to ";". */
  excerpt(id: string): string {
    const slot = this.slot(id);
    return this.text.slice(this.starts[slot], this.ends[slot]);
  }

  /** The instance's attribute tokens; throws StepSyntaxError. */
  attributes(id: string): readonly StepToken[] {
    const slot = this.slot(id);
    const open = this.params[slot] ?? -1;
    if (open < 0) throw new StepSyntaxError('step.complex_instance');
    const end = (this.ends[slot] ?? open) - 1;
    const tokenizer = new Tokenizer(this.text, open + 1, end);
    const values = tokenizer.list();
    tokenizer.expectEnd();
    return values;
  }
}

/** Whether every character is 7-bit (ISO 10303-21 writes other characters as escapes). */
function isAscii(text: string): boolean {
  return !/\P{ASCII}/u.test(text);
}

const REAL = /[+-]?[0-9]+\.[0-9]*(?:[Ee][+-]?[0-9]+)?/y;
const INTEGER = /[+-]?[0-9]+/y;
const ENUM = /\.[A-Za-z_][A-Za-z0-9_]*\./y;
const BINARY = /"[0-9A-Fa-f]*"/y;
const KEYWORD = /[A-Za-z_][A-Za-z0-9_]*/y;
const STRING = /'(?:[^']|'')*'/y;

/** A recursive-descent reader of one parameter list: the "(" is consumed before `from`. */
class Tokenizer {
  private position: number;

  constructor(
    private readonly text: string,
    from: number,
    private readonly end: number,
  ) {
    this.position = from;
  }

  private skip(): void {
    const next = skip(this.text, this.position, this.end);
    if (next < 0) throw new StepSyntaxError('step.token');
    this.position = next;
  }

  private match(pattern: RegExp): string | undefined {
    pattern.lastIndex = this.position;
    const found = pattern.exec(this.text);
    if (found === null || found.index !== this.position || pattern.lastIndex > this.end) return undefined;
    this.position = pattern.lastIndex;
    return found[0];
  }

  /** The values up to and including the closing ")". */
  list(): StepToken[] {
    const items: StepToken[] = [];
    let expectValue = true;
    for (;;) {
      this.skip();
      if (this.position >= this.end) throw new StepSyntaxError('step.token');
      const code = this.text.charCodeAt(this.position);
      if (code === 41) {
        if (expectValue && items.length > 0) throw new StepSyntaxError('step.token');
        this.position += 1;
        return items;
      }
      if (code === 44) {
        if (expectValue) throw new StepSyntaxError('step.token');
        expectValue = true;
        this.position += 1;
        continue;
      }
      if (!expectValue) throw new StepSyntaxError('step.token');
      items.push(this.value());
      expectValue = false;
    }
  }

  private value(): StepToken {
    const code = this.text.charCodeAt(this.position);
    if (code === QUOTE) {
      const token = this.match(STRING);
      if (token === undefined) throw new StepSyntaxError('step.token');
      return { kind: 'string', token, text: decodeString(token) };
    }
    if (code === HASH) {
      this.position += 1;
      const start = this.position;
      while (this.position < this.end && isDigit(this.text.charCodeAt(this.position))) this.position += 1;
      if (this.position === start) throw new StepSyntaxError('step.token');
      return { kind: 'ref', id: this.text.slice(start, this.position) };
    }
    if (code === 36) {
      this.position += 1;
      return { kind: 'unset' };
    }
    if (code === STAR) {
      this.position += 1;
      return { kind: 'derived' };
    }
    if (code === OPEN) {
      this.position += 1;
      return { kind: 'list', items: this.list() };
    }
    if (code === 46) {
      const token = this.match(ENUM);
      if (token === undefined) throw new StepSyntaxError('step.token');
      return { kind: 'enum', token: token.toUpperCase() };
    }
    if (code === 34) {
      const token = this.match(BINARY);
      if (token === undefined) throw new StepSyntaxError('step.token');
      return { kind: 'binary', token: token.toUpperCase() };
    }
    const real = this.match(REAL);
    if (real !== undefined) return { kind: 'real', token: real };
    const integer = this.match(INTEGER);
    if (integer !== undefined) return { kind: 'integer', token: integer };
    const keyword = this.match(KEYWORD);
    if (keyword !== undefined) {
      this.skip();
      if (this.text.charCodeAt(this.position) !== OPEN) throw new StepSyntaxError('step.token');
      this.position += 1;
      const inner = this.list();
      const [only] = inner;
      if (inner.length !== 1 || only === undefined) throw new StepSyntaxError('step.typed_parameter');
      return { kind: 'typed', typeName: keyword.toUpperCase(), value: only };
    }
    throw new StepSyntaxError('step.token');
  }

  expectEnd(): void {
    this.skip();
    if (this.position !== this.end) throw new StepSyntaxError('step.trailing_text');
  }
}

/** The file's text: UTF-8 when the bytes decode as UTF-8, else ISO 8859-1 (as the Python reader). */
export function textOfBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('latin1');
  }
}

/** Reads a STEP file's text. Throws NotStepError when it is not one. */
export function readStepText(text: string): StepText {
  return new StepText(text);
}
