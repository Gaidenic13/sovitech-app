/**
 * The text of the document files the figure checks meet in their scope
 * (phase 2 review, adversarial finding 16): before this, both checks skipped
 * every binary file and read a PDF only as raw bytes, so a figure in a
 * workbook's cells, in a compressed PDF content stream, in a hex string or in a
 * kerned text array was never seen.
 *
 * - ZIP archives, and so XLSX, DOCX, PPTX and ODF files: a small reader of the
 *   central directory (stored and deflated members, no ZIP64, no encryption)
 *   and of each XML part's text: shared strings, inline strings, cell values
 *   and formulas, paragraphs, and the attributes that carry words (sheet and
 *   defined names, number format codes, tooltips, alt text). Rich-text runs are
 *   joined within their string or paragraph, so "34." and "500" in two runs read
 *   as one figure. A workbook's numeric cells are also read as they display
 *   (percent formats times 100 with "%", the format's decimals, thousands
 *   scaling and quoted literals such as "kW"), so 0.137 formatted "0.0%" reads
 *   as "13.7%". Archives inside an archive are read three levels deep; PDFs
 *   inside one are read as below.
 * - PDFs: the text of every page (annotations and form fields flattened in
 *   memory first), the document information dictionary and the outline titles,
 *   read with pypdfium2 from the extractor's environment (pdf_text.py).
 *
 * Fails closed: a document in scope whose text cannot be read (a damaged or
 * encrypted archive, a member in another compression, a PDF PDFium cannot open,
 * or no extractor environment to read PDFs with) is a problem, and the check
 * fails. Not read: images, legacy binary office files (.xls, .doc), and text a
 * PDF draws as curves or images; a figure split across two cells, like one split
 * across two lines, is missed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import Decimal from 'decimal.js';
import { repoRoot } from '../lib';

/** One piece of a document's text, named for findings: `<file>!<member>` or `<file>#page=<n>`. */
export interface DocumentPart {
  readonly where: string;
  readonly text: string;
}

export interface DocumentText {
  readonly parts: readonly DocumentPart[];
  /** Why some or all of the text could not be read. Each fails the check. */
  readonly problems: readonly string[];
  /** Members of archives that are neither text, archives nor PDFs (images, OLE files), counted. */
  readonly unread: number;
}

export type DocumentKind = 'pdf' | 'zip';

/**
 * A PDF starts with %PDF-, after any whitespace, as the extractor detects it
 * (services/extractor/src/sovitech_extractor/formats.py); a ZIP archive starts
 * with a local file header. A source file that mentions the signature is not a PDF.
 */
export function documentKind(bytes: Buffer): DocumentKind | undefined {
  if (/^\s*%PDF-/u.test(bytes.subarray(0, 1024).toString('latin1'))) return 'pdf';
  if (bytes.length >= 4 && bytes.readUInt32LE(0) === 0x04034b50) return 'zip';
  return undefined;
}

// ---------------------------------------------------------------------------
// ZIP archives.

/** The most a member may inflate to, and the most an archive may hold, so a ZIP bomb stops the read instead of the machine. */
const MEMBER_LIMIT = 64 * 1024 * 1024;
const ARCHIVE_LIMIT = 256 * 1024 * 1024;
const MAX_DEPTH = 3;

interface ZipMember {
  readonly name: string;
  readonly data: Buffer;
}

function findEndOfCentralDirectory(bytes: Buffer): number {
  const lowest = Math.max(0, bytes.length - 22 - 0xffff);
  for (let offset = bytes.length - 22; offset >= lowest; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

/** The members of a ZIP archive; a problem instead when any member cannot be read. */
export function readZip(bytes: Buffer, name: string): { members: ZipMember[]; problems: string[] } {
  const problems: string[] = [];
  const members: ZipMember[] = [];
  const end = bytes.length >= 22 ? findEndOfCentralDirectory(bytes) : -1;
  if (end < 0) return { members, problems: [`${name}: not a readable ZIP archive (no end of central directory), so its text was not read`] };
  const count = bytes.readUInt16LE(end + 10);
  const directoryOffset = bytes.readUInt32LE(end + 16);
  if (count === 0xffff || directoryOffset === 0xffffffff) return { members, problems: [`${name}: a ZIP64 archive, which this reader does not read, so its text was not read`] };
  let offset = directoryOffset;
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== 0x02014b50) {
      problems.push(`${name}: its central directory is damaged, so its text was not read`);
      break;
    }
    const flags = bytes.readUInt16LE(offset + 8);
    const method = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const size = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const memberName = bytes.subarray(offset + 46, offset + 46 + nameLength).toString((flags & 0x800) !== 0 ? 'utf8' : 'latin1');
    offset += 46 + nameLength + extraLength + commentLength;
    if (memberName.endsWith('/')) continue;
    const where = `${name}!${memberName}`;
    if ((flags & 0x1) !== 0) {
      problems.push(`${where}: encrypted, so its text was not read`);
      continue;
    }
    if (compressedSize === 0xffffffff || size === 0xffffffff || localOffset === 0xffffffff) {
      problems.push(`${where}: a ZIP64 member, which this reader does not read`);
      continue;
    }
    if (localOffset + 30 > bytes.length || bytes.readUInt32LE(localOffset) !== 0x04034b50) {
      problems.push(`${where}: its local header is missing, so its text was not read`);
      continue;
    }
    const dataStart = localOffset + 30 + bytes.readUInt16LE(localOffset + 26) + bytes.readUInt16LE(localOffset + 28);
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);
    if (raw.length !== compressedSize) {
      problems.push(`${where}: truncated, so its text was not read`);
      continue;
    }
    let data: Buffer;
    try {
      if (method === 0) data = Buffer.from(raw);
      else if (method === 8) data = inflateRawSync(raw, { maxOutputLength: MEMBER_LIMIT });
      else {
        problems.push(`${where}: compressed with method ${method}, which this reader does not read`);
        continue;
      }
    } catch (error) {
      problems.push(`${where}: could not be inflated (${error instanceof Error ? error.message : String(error)}), or is larger than ${MEMBER_LIMIT} bytes`);
      continue;
    }
    total += data.length;
    if (total > ARCHIVE_LIMIT) {
      problems.push(`${name}: holds more than ${ARCHIVE_LIMIT} bytes, so the rest of its text was not read`);
      break;
    }
    members.push({ name: memberName, data });
  }
  return { members, problems };
}

// ---------------------------------------------------------------------------
// XML text.

const ENTITIES: Readonly<Record<string, string>> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    if (body.startsWith('#')) return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    return ENTITIES[body] ?? whole;
  });
}

/** Elements whose text runs read as one string: a shared string, an inline string, a paragraph (OOXML and ODF). */
const JOINED = new Set(['si', 'is', 'p', 'h']);
/** Attributes that carry words or figures rather than positions, sizes or ids. */
const WORD_ATTRIBUTES = new Set(['name', 'displayname', 'tooltip', 'display', 'formatcode', 'descr', 'title', 'caption', 'prompt', 'prompttitle', 'error', 'errortitle', 'alt']);

const localName = (qualified: string): string => qualified.slice(qualified.indexOf(':') + 1).toLowerCase();

/**
 * The text of one XML part, one line per string: the text of each element,
 * with the runs of a shared string, an inline string or a paragraph joined, and
 * each word-carrying attribute on a line of its own. Tags, other attributes,
 * comments and processing instructions are not text.
 */
export function xmlText(xml: string): string {
  const lines: string[] = [];
  const body = xml.replace(/<!--[\s\S]*?-->/gu, '').replace(/<\?[\s\S]*?\?>/gu, '');
  let joined = 0;
  let buffer = '';
  const flush = (): void => {
    const text = decodeEntities(buffer).replace(/\s+/gu, ' ').trim();
    if (text !== '') lines.push(text);
    buffer = '';
  };
  for (const token of body.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>|<(\/?)([^\s/>]+)([^>]*?)(\/?)>|([^<]+)/gu)) {
    const [, cdata, closing, tag, attributes, selfClosing, text] = token;
    if (cdata !== undefined || text !== undefined) {
      buffer += cdata ?? text ?? '';
      if (joined === 0) flush();
      continue;
    }
    const name = localName(tag ?? '');
    if (closing === '/') {
      if (JOINED.has(name) && joined > 0) {
        joined -= 1;
        if (joined === 0) flush();
      }
      continue;
    }
    for (const attribute of (attributes ?? '').matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu)) {
      if (!WORD_ATTRIBUTES.has(localName(attribute[1] ?? ''))) continue;
      const value = decodeEntities(attribute[2] ?? attribute[3] ?? '').trim();
      if (value !== '') lines.push(value);
    }
    if (JOINED.has(name) && selfClosing !== '/') {
      if (joined === 0) flush();
      joined += 1;
    }
  }
  flush();
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Workbook cells as they display.

const BUILT_IN_FORMATS: Readonly<Record<string, string>> = {
  '1': '0',
  '2': '0.00',
  '3': '#,##0',
  '4': '#,##0.00',
  '9': '0%',
  '10': '0.00%',
  '11': '0.00E+00',
  '37': '#,##0 ;(#,##0)',
  '38': '#,##0 ;[Red](#,##0)',
  '39': '#,##0.00;(#,##0.00)',
  '40': '#,##0.00;[Red](#,##0.00)',
};

function attributeOf(attributes: string, name: string): string | undefined {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'u').exec(attributes);
  return match === null ? undefined : decodeEntities(match[1] ?? match[2] ?? '');
}

/** The format code of each cell style index (xl/styles.xml: numFmts and cellXfs). */
function cellFormats(styles: string): string[] {
  const custom = new Map<string, string>();
  for (const match of styles.matchAll(/<(?:\w+:)?numFmt\s([^>]*?)\/?>/gu)) {
    const id = attributeOf(match[1] ?? '', 'numFmtId');
    const code = attributeOf(match[1] ?? '', 'formatCode');
    if (id !== undefined && code !== undefined) custom.set(id, code);
  }
  const cellXfs = /<(?:\w+:)?cellXfs\b[^>]*>([\s\S]*?)<\/(?:\w+:)?cellXfs>/u.exec(styles)?.[1] ?? '';
  return [...cellXfs.matchAll(/<(?:\w+:)?xf\s([^>]*?)\/?>/gu)].map((match) => {
    const id = attributeOf(match[1] ?? '', 'numFmtId') ?? '0';
    return custom.get(id) ?? BUILT_IN_FORMATS[id] ?? 'General';
  });
}

/**
 * How a number displays under a format code, as far as the figure checks need:
 * the first section, percent (times 100, with "%"), the format's decimals,
 * thousands scaling by trailing commas, and its literal text before and after.
 * Dates, times, fractions and scientific formats give nothing.
 */
export function displayForms(value: string, formatCode: string): string[] {
  if (!/^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/u.test(value)) return [];
  const section = (formatCode.match(/(?:"[^"]*"|\\.|[^;])+/gu) ?? [''])[0] ?? '';
  if (section === '' || /^general$/iu.test(section.trim())) return [];
  // Each literal becomes one private-use character, so no placeholder or date letter is read inside it.
  const literals: string[] = [];
  const mark = (text: string): string => String.fromCharCode(0xe000 + literals.push(text) - 1);
  const skeleton = section
    .replace(/\[\$([^\]-]*)[^\]]*\]/gu, (_whole, symbol: string) => mark(symbol))
    .replace(/\[[^\]]*\]/gu, '')
    .replace(/"([^"]*)"/gu, (_whole, text: string) => mark(text))
    .replace(/\\(.)/gu, (_whole, text: string) => mark(text))
    .replace(/_.|\*./gu, ' ');
  const bare = skeleton.replace(/[\ue000-\uefff]/gu, '');
  if (/[ymdhsAaEe/]/u.test(bare) || !/[0#?]/u.test(bare)) return [];
  const numeric = /[0#?,.]*[0#?][0#?,.]*/u.exec(bare)?.[0] ?? '';
  const decimals = (numeric.split('.')[1] ?? '').replace(/[^0#?]/gu, '').length;
  const scaling = (/(,+)$/u.exec(numeric)?.[1] ?? '').length;
  const percent = bare.includes('%');
  let number = new Decimal(value);
  if (percent) number = number.times(100);
  if (scaling > 0) number = number.dividedBy(new Decimal(1000).pow(scaling));
  const shown = [number.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toFixed(decimals)];
  if (percent && !number.equals(new Decimal(shown[0] ?? '0'))) shown.push(number.toString());
  const expand = (text: string): string => text.replace(/[\ue000-\uefff]/gu, (marker) => literals[marker.charCodeAt(0) - 0xe000] ?? '');
  const firstPlaceholder = skeleton.search(/[0#?]/u);
  const before = expand(skeleton.slice(0, firstPlaceholder)).replace(/[0#?,.%]/gu, '');
  const lastPlaceholder = skeleton.length - [...skeleton].reverse().join('').search(/[0#?]/u);
  const after = expand(skeleton.slice(lastPlaceholder)).replace(/^[,.]+/u, '');
  return shown.map((digits) => `${before}${digits}${after}`.replace(/\s+/gu, ' ').trim());
}

/** A workbook's numeric cells as they display: one line per cell, for each worksheet part. */
function workbookDisplay(members: readonly ZipMember[], name: string): DocumentPart[] {
  const styles = members.find((member) => member.name === 'xl/styles.xml');
  const formats = styles === undefined ? [] : cellFormats(styles.data.toString('utf8'));
  const parts: DocumentPart[] = [];
  for (const member of members) {
    if (!/^xl\/worksheets\/[^/]+\.xml$/u.test(member.name)) continue;
    const lines: string[] = [];
    for (const cell of member.data.toString('utf8').matchAll(/<(?:\w+:)?c\s([^>]*?)>([\s\S]*?)<\/(?:\w+:)?c>/gu)) {
      const type = attributeOf(cell[1] ?? '', 't') ?? 'n';
      const style = attributeOf(cell[1] ?? '', 's');
      if (type !== 'n' || style === undefined) continue;
      const format = formats[Number.parseInt(style, 10)];
      const value = /<(?:\w+:)?v>([^<]*)<\/(?:\w+:)?v>/u.exec(cell[2] ?? '')?.[1];
      if (format === undefined || value === undefined) continue;
      // A form that reads as the stored value adds nothing: the cell's own line already holds it.
      lines.push(...displayForms(value.trim(), format).filter((form) => form !== value.trim()));
    }
    if (lines.length > 0) parts.push({ where: `${name}!${member.name} (as displayed)`, text: lines.join('\n') });
  }
  return parts;
}

// ---------------------------------------------------------------------------
// PDFs.

const PDF_TEXT = join(dirname(fileURLToPath(import.meta.url)), 'pdf_text.py');

/** The Python that reads PDFs: the extractor's own, which holds pypdfium2. */
export const EXTRACTOR_PYTHON = join(repoRoot, 'services', 'extractor', '.venv', 'bin', 'python');

interface PdfReading {
  readonly path: string;
  readonly pages?: readonly string[];
  readonly metadata?: Readonly<Record<string, string>>;
  readonly outline?: readonly string[];
  readonly error?: string;
}

/** Reads the text of PDFs, named for findings, in one Python run. */
export function readPdfs(pdfs: ReadonlyArray<{ readonly name: string; readonly path: string }>, python: string = EXTRACTOR_PYTHON): DocumentText {
  if (pdfs.length === 0) return { parts: [], problems: [], unread: 0 };
  const cannot = (why: string): DocumentText => ({ parts: [], problems: pdfs.map((pdf) => `${pdf.name}: a PDF whose text could not be read: ${why}`), unread: 0 });
  if (!existsSync(python)) return cannot(`no extractor environment at ${python} (create it with \`pnpm setup:py\`)`);
  // -I: ignore the environment and the user site; -B: write no bytecode.
  const run = spawnSync(python, ['-I', '-B', PDF_TEXT, ...pdfs.map((pdf) => pdf.path)], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 300_000 });
  if (run.status !== 0) return cannot(`pdf_text.py failed: ${(run.stderr ?? '').trim().split('\n').pop() ?? run.error?.message ?? 'no output'}`);
  let readings: PdfReading[];
  try {
    readings = JSON.parse(run.stdout) as PdfReading[];
  } catch (error) {
    return cannot(`pdf_text.py output could not be read: ${error instanceof Error ? error.message : String(error)}`);
  }
  const parts: DocumentPart[] = [];
  const problems: string[] = [];
  pdfs.forEach((pdf, index) => {
    const reading = readings[index];
    if (reading === undefined || reading.error !== undefined || reading.pages === undefined) {
      problems.push(`${pdf.name}: a PDF whose text could not be read: ${reading?.error ?? 'no reading returned'}`);
      return;
    }
    reading.pages.forEach((text, page) => parts.push({ where: `${pdf.name}#page=${page + 1}`, text: text.replace(/\r\n?/gu, '\n') }));
    const metadata = Object.entries(reading.metadata ?? {}).map(([key, value]) => `${key}: ${value}`);
    if (metadata.length > 0) parts.push({ where: `${pdf.name}#metadata`, text: metadata.join('\n') });
    if ((reading.outline ?? []).length > 0) parts.push({ where: `${pdf.name}#outline`, text: (reading.outline ?? []).join('\n') });
  });
  return { parts, problems, unread: 0 };
}

// ---------------------------------------------------------------------------
// One file.

function isBinary(bytes: Buffer): boolean {
  return bytes.subarray(0, 8000).includes(0);
}

/**
 * The text of the document files in scope, by kind: archives are read here,
 * and every PDF (on its own or inside an archive) is read in one Python run.
 * `files` are named for findings by `name` and read from `path`.
 */
export function documentTexts(files: ReadonlyArray<{ readonly name: string; readonly path: string; readonly bytes: Buffer }>, python?: string): DocumentText {
  const parts: DocumentPart[] = [];
  const problems: string[] = [];
  let unread = 0;
  const pdfs: Array<{ name: string; path: string }> = [];
  const temporary = mkdtempSync(join(tmpdir(), 'sovitech-figure-pdfs-'));
  try {
    const archive = (bytes: Buffer, name: string, depth: number): void => {
      const zip = readZip(bytes, name);
      problems.push(...zip.problems);
      parts.push(...workbookDisplay(zip.members, name));
      for (const member of zip.members) {
        const where = `${name}!${member.name}`;
        const kind = documentKind(member.data);
        if (kind === 'zip') {
          if (depth >= MAX_DEPTH) problems.push(`${where}: an archive nested more than ${MAX_DEPTH} deep, so its text was not read`);
          else archive(member.data, where, depth + 1);
        } else if (kind === 'pdf') {
          const path = join(temporary, `${pdfs.length}.pdf`);
          writeFileSync(path, member.data);
          pdfs.push({ name: where, path });
        } else if (isBinary(member.data)) {
          unread += 1;
        } else {
          const text = member.data.toString('utf8');
          parts.push({ where, text: /^\s*</u.test(text) ? xmlText(text) : text });
        }
      }
    };
    for (const file of files) {
      const kind = documentKind(file.bytes);
      if (kind === 'zip') archive(file.bytes, file.name, 1);
      else if (kind === 'pdf') pdfs.push({ name: file.name, path: file.path });
    }
    const read = readPdfs(pdfs, python);
    parts.push(...read.parts);
    problems.push(...read.problems);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  return { parts, problems, unread };
}
