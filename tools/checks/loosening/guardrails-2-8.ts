/**
 * The texts docs/guardrails.md 2.8 itself lists as places a reserved term may appear,
 * read at run time, for the exception-list part of the loosening check
 * (docs/adr/0011-verbatim-2-8-allowances.md).
 *
 * The orchestrator's ruling (2026-09-25, recorded as ADR 0011): an allowance whose text
 * is word for word a text 2.8 lists, and whose kind matches the place 2.8 allows it,
 * is 2.8 itself, not an exception beyond it. So the loosening check accepts it without
 * an approval reference when it can match it verbatim against 2.8; every other
 * allowance still waits for the approver (guardrails section 10).
 *
 * What is read, and the allowance kind each place gives (ReservedTermAllowance in
 * packages/registry/src/reserved-terms.ts):
 * - the badge table ("| Situation | Badge | Example line |"): each bold label in the
 *   Badge column is a `badge`; each quoted sentence in the Example line column is a
 *   `generated_sentence` (the line the app builds under the badge from stored state);
 * - the status-line table ("| Situation | Text |"): each quoted text is a `status_line`;
 * - the "Where they are allowed" list of the "Reserved terms" part: each quoted
 *   example of the action-label bullet is an `action_label`; each quoted example of the
 *   bullet on badges, status lines and generated sentences that neither table already
 *   lists is a `generated_sentence` (today: the BAC-class sentence of rule 11).
 * Registry qualifier labels ("final energy") are named in that list too, but the
 * ruling names badge labels, status lines, action labels and generated sentences
 * only, so a `qualifier_label` allowance always waits for the approver.
 * A text the list allows only "at stage 3" ("Formal quotation") is 2.8's text only as an
 * allowance bound to the stored quotation record rule 10 derives stage 3 from
 * (`requiresRecord: 'quotation_record'`); unbound, it waits for the approver (phase 1
 * review, adversarial finding 12).
 *
 * How a text matches (`matches2_8`): after Unicode NFC and single spaces, the
 * allowance's text equals the 2.8 text character for character, with two readings of
 * a slot:
 * - a placeholder 2.8 writes as `<name>` ("Superseded: inputs changed on <date>") is a
 *   `{slot}` in the allowance, whatever the slot's name;
 * - in a status line and a generated sentence, an example value 2.8 writes as digits or
 *   as a day and month ("126", "37 of 40" as two, "12 Oct") may be a `{slot}`: the
 *   ruling's "a status line or its template with placeholders" and "a generated
 *   sentence 2.8 gives as an example form". Nothing else may: a word of 2.8's example
 *   ("class B") stays a word.
 * Case, punctuation and every other character count. The allowance's kind must be the
 * kind of the place the text comes from.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readBaseApprovalDocuments } from '@sovitech/registry/gates';
import { repoRoot } from '../lib';

/** The allowance kinds a 2.8 text can give (ReservedTermAllowance['kind'] of @sovitech/registry/reserved-terms). */
export type Place2_8Kind = 'badge' | 'status_line' | 'action_label' | 'generated_sentence';

export interface Text2_8 {
  kind: Place2_8Kind;
  /** The text as 2.8 writes it, placeholders and example values included. */
  text: string;
  /** Where in 2.8 it was read, for reports. */
  where: string;
  /**
   * The stored record 2.8 ties the text to: `quotation_record` for a text the "Where they are
   * allowed" list allows only "at stage 3" (rule 10: stage 3 comes from a stored quotation record).
   */
  requiresRecord?: 'quotation_record';
}

export interface Texts2_8 {
  texts: Text2_8[];
  /** Anything that could not be read: each is a problem, and nothing is accepted from an unread 2.8. */
  problems: string[];
}

function canonical(text: string): string {
  return text.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

/** The lines of 2.8: from its heading to the next section heading. */
function sectionLines(markdown: string): string[] | undefined {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => /^### 2\.8\b/.test(line));
  if (start < 0) return undefined;
  const end = lines.findIndex((line, index) => index > start && /^#{2,3} /.test(line));
  return lines.slice(start, end < 0 ? undefined : end);
}

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim());
}

function isSeparator(line: string): boolean {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line.trim());
}

/** The body rows of the table whose header row matches. */
function tableRows(lines: readonly string[], header: RegExp): string[][] | undefined {
  const start = lines.findIndex((line) => header.test(line));
  if (start < 0) return undefined;
  const rows: string[][] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (!line.trim().startsWith('|')) break;
    if (isSeparator(line)) continue;
    rows.push(cells(line));
  }
  return rows;
}

function bold(cell: string): string[] {
  return [...cell.matchAll(/\*\*([^*]+)\*\*/g)].map((match) => canonical(match[1] ?? '')).filter((text) => text !== '');
}

function quoted(cell: string): string[] {
  return [...cell.matchAll(/["“]([^"”]+)["”]/g)].map((match) => canonical(match[1] ?? '')).filter((text) => text !== '');
}

const BADGE_HEADER = /^\|\s*Situation\s*\|\s*Badge\s*\|\s*Example line\s*\|/;
const STATUS_HEADER = /^\|\s*Situation\s*\|\s*Text\s*\|\s*$/;

/** Reads the texts of 2.8 from the text of docs/guardrails.md. */
export function parse2_8(markdown: string, label = 'docs/guardrails.md'): Texts2_8 {
  const problems: string[] = [];
  const lines = sectionLines(markdown);
  if (lines === undefined) return { texts: [], problems: [`${label}: no "### 2.8" section, so no allowance can be matched against 2.8`] };
  const texts: Text2_8[] = [];
  const add = (kind: Place2_8Kind, text: string, where: string): void => {
    if (!texts.some((entry) => entry.kind === kind && entry.text === text)) texts.push({ kind, text, where });
  };

  const badges = tableRows(lines, BADGE_HEADER);
  if (badges === undefined || badges.length === 0) problems.push(`${label} 2.8: the badge table ("| Situation | Badge | Example line |") was not found`);
  for (const row of badges ?? []) {
    for (const text of bold(row[1] ?? '')) add('badge', text, `2.8 badge table, row "${row[0] ?? ''}", Badge`);
    for (const text of quoted(row[2] ?? '')) add('generated_sentence', text, `2.8 badge table, row "${row[0] ?? ''}", Example line`);
  }

  const statuses = tableRows(lines, STATUS_HEADER);
  if (statuses === undefined || statuses.length === 0) problems.push(`${label} 2.8: the status-line table ("| Situation | Text |") was not found`);
  for (const row of statuses ?? []) {
    for (const text of quoted(row[1] ?? '')) add('status_line', text, `2.8 status-line table, row "${row[0] ?? ''}"`);
  }

  // "Where they are allowed", in the "Reserved terms" part.
  const allowedStart = lines.findIndex((line) => /\*\*Where they are allowed:\*\*/.test(line));
  if (allowedStart < 0) {
    problems.push(`${label} 2.8: the "Where they are allowed" list was not found`);
  } else {
    const bullets: string[] = [];
    for (let index = allowedStart + 1; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      const bullet = /^\s{2,}-\s+(.*)$/.exec(line);
      if (bullet !== null) bullets.push(bullet[1] ?? '');
      else if (/^\s{4,}\S/.test(line) && bullets.length > 0) bullets[bullets.length - 1] += ` ${line.trim()}`;
      else break;
    }
    const fromTables = new Set(texts.filter((entry) => entry.kind === 'badge' || entry.kind === 'status_line').map((entry) => entry.text));
    for (const bullet of bullets) {
      if (/^action labels\b/i.test(bullet)) {
        for (const text of quoted(bullet)) add('action_label', text, '2.8 "Where they are allowed", action labels');
      } else if (/^badges, status lines and generated sentences\b/i.test(bullet)) {
        for (const text of quoted(bullet)) {
          if (!fromTables.has(text)) add('generated_sentence', text, '2.8 "Where they are allowed", generated sentences');
        }
        // A text allowed only "at stage 3" is bound to the stored quotation record (rule 10).
        for (const match of bullet.matchAll(/["“]([^"”]+)["”]\s+at stage 3\b/g)) {
          const text = canonical(match[1] ?? '');
          for (const entry of texts) if (entry.text === text) entry.requiresRecord = 'quotation_record';
        }
      }
    }
  }
  return { texts, problems };
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 2.8's placeholders, `<name>`. */
const PLACEHOLDER_2_8 = /<[^<>]+>/g;
/** Example values in 2.8's texts: a day and month ("12 Oct", "12 October 2026"), or digits with their separators. */
const EXAMPLE_VALUE = /\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?(?: \d{4})?\b|\d+(?:[.,]\d+)*/g;
/** A slot in an allowance: `{name}`. */
const SLOT = String.raw`\{[^{}]*\}`;

/** The pattern an allowance text must match to be the 2.8 text `entry`. */
function patternOf(entry: Text2_8): RegExp {
  const text = entry.text;
  const examples = entry.kind === 'status_line' || entry.kind === 'generated_sentence';
  let source = '';
  let position = 0;
  const spans: Array<{ start: number; end: number; kind: 'placeholder' | 'example'; raw: string }> = [];
  for (const match of text.matchAll(PLACEHOLDER_2_8)) spans.push({ start: match.index, end: match.index + match[0].length, kind: 'placeholder', raw: match[0] });
  if (examples) {
    for (const match of text.matchAll(EXAMPLE_VALUE)) {
      const start = match.index;
      const end = start + match[0].length;
      if (!spans.some((span) => start < span.end && end > span.start)) spans.push({ start, end, kind: 'example', raw: match[0] });
    }
  }
  spans.sort((left, right) => left.start - right.start);
  for (const span of spans) {
    source += escape(text.slice(position, span.start));
    source += span.kind === 'placeholder' ? SLOT : `(?:${SLOT}|${escape(span.raw)})`;
    position = span.end;
  }
  source += escape(text.slice(position));
  return new RegExp(`^${source}$`, 'u');
}

/** The copy of an allowance entry, its kind and its stored-record binding, or undefined for a malformed entry. */
export function allowanceCopy(content: unknown): { kind: string; text: string; requiresRecord?: unknown } | undefined {
  if (typeof content !== 'object' || content === null) return undefined;
  const record = content as Record<string, unknown>;
  const kind = record['kind'];
  const field = kind === 'status_line' ? 'text' : kind === 'generated_sentence' ? 'template' : 'label';
  const text = record[field];
  if (typeof kind !== 'string' || typeof text !== 'string') return undefined;
  return { kind, text: canonical(text), ...('requiresRecord' in record ? { requiresRecord: record['requiresRecord'] } : {}) };
}

/**
 * The 2.8 text an allowance entry is, word for word and of the same kind, or undefined. A 2.8
 * text bound to a stored record matches only an allowance bound to that same record.
 */
export function matches2_8(content: unknown, texts: readonly Text2_8[]): Text2_8 | undefined {
  const copy = allowanceCopy(content);
  if (copy === undefined) return undefined;
  return texts.find(
    (entry) => entry.kind === copy.kind && patternOf(entry).test(copy.text) && (entry.requiresRecord === undefined || copy.requiresRecord === entry.requiresRecord),
  );
}

/** The texts both sides hold, the same kind and text on each: what the build branch cannot add to alone. */
export function common2_8(left: Texts2_8, right: Texts2_8): Texts2_8 {
  const texts = left.texts
    .filter((entry) => right.texts.some((other) => other.kind === entry.kind && other.text === entry.text))
    .map((entry) => {
      // A binding either side names holds: the stricter reading of the two.
      const binding = entry.requiresRecord ?? right.texts.find((other) => other.kind === entry.kind && other.text === entry.text)?.requiresRecord;
      return binding === undefined ? entry : { ...entry, requiresRecord: binding };
    });
  return { texts, problems: [...left.problems, ...right.problems] };
}

/**
 * The repository's 2.8 texts: those that 2.8 lists both at the merge base of main and
 * HEAD (where approvals are read from; the build branch cannot add to it) and in the
 * working tree (so a text 2.8 no longer lists is not accepted either). When git cannot
 * give the merge base, nothing is accepted, and that is a problem.
 */
export function repo2_8(root: string = repoRoot, workingTreeText?: string): Texts2_8 {
  const working = parse2_8(workingTreeText ?? readFileSync(join(root, 'docs/guardrails.md'), 'utf8'), 'docs/guardrails.md (working tree)');
  const base = readBaseApprovalDocuments(root);
  if ('problem' in base) {
    return { texts: [], problems: [`2.8 texts: ${base.problem}; no allowance is accepted as a 2.8 text until main's 2.8 can be read`, ...working.problems] };
  }
  const atBase = parse2_8(base.documents.guardrails, `docs/guardrails.md (${base.documents.readFrom ?? 'merge base'})`);
  return common2_8(atBase, working);
}
