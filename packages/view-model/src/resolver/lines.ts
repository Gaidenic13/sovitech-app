/**
 * Lines built from the registry's copy (docs/guardrails.md 2.8 and the rule lines): a 2.8 status
 * line or stage label (STATUS_LINES), a generated sentence (GENERATED_SENTENCES) or a rule line the
 * guardrails write word for word (RULE_LINES), with its slots filled from stored state. The words
 * are always the registry's; only a slot's value is ours to supply, and a number in a slot is a
 * whole count formatted by the formatting module (prompt 3 section 7: each number in a status line
 * or a rule 7 count is bound to a value id derived from stored state).
 */
import {
  GENERATED_SENTENCES,
  RULE_LINES,
  STATUS_LINES,
  type GeneratedSentenceDefinition,
  type RuleLineDefinition,
  type StatusLineDefinition,
} from '@sovitech/registry';
import type { Line, LineKind } from '../browser/contract';
import { formatCount, type FormatOptions } from '../formatting';

/** The words 2.8 writes in the "Not analysed" line's file-type slot; the G12-1 form replaces them (prompt 3 5.3). */
const NOT_ANALYSED_EXAMPLE = 'RVT model';

/** The file-type words the G12-1 line may name (prompt 3 5.3; apps/api/src/documents/coverage.ts). */
export const NOT_ANALYSED_FILE_TYPES: ReadonlySet<string> = new Set([
  'RVT model',
  'IFC model',
  'DWG drawing',
  'DOCX file',
  'JPG image',
  'PNG image',
  'ZIP archive',
  'PDF scan',
]);

type Source =
  | { readonly kind: 'status'; readonly definition: StatusLineDefinition }
  | { readonly kind: 'rule'; readonly definition: RuleLineDefinition }
  | { readonly kind: 'sentence'; readonly definition: GeneratedSentenceDefinition };

/** A line's registry entry by id; throws for an id no registry holds (no line is made up). */
function sourceOf(lineId: string): Source {
  const status = STATUS_LINES.find((entry) => entry.id === lineId);
  if (status !== undefined) return { kind: 'status', definition: status };
  const rule = RULE_LINES.find((entry) => entry.id === lineId);
  if (rule !== undefined) return { kind: 'rule', definition: rule };
  const sentence = GENERATED_SENTENCES.find((entry) => entry.id === lineId);
  if (sentence !== undefined) return { kind: 'sentence', definition: sentence };
  throw new Error(`view-model: no status line, rule line or generated sentence ${lineId} in the registry`);
}

/** The line kind of a registry entry (display.ts LINE_KINDS). */
function kindOf(source: Source): LineKind {
  if (source.kind === 'rule') return 'rule_line';
  if (source.kind === 'sentence') return 'generated_sentence';
  return source.definition.kind;
}

/** The template of a registry entry, with the G12-1 file-type substitution as a slot. */
function templateOf(source: Source): string {
  if (source.kind === 'status') {
    if (source.definition.id === 'not_analysed') return source.definition.text.replace(NOT_ANALYSED_EXAMPLE, '{fileType}');
    return source.definition.text;
  }
  return source.definition.template;
}

export interface FilledLine {
  readonly line: Line;
  /** The figures and digit-bearing values the slots put in the text: the parts a component may render apart. */
  readonly parts: readonly string[];
}

/**
 * A registry line with its slots filled. A `count` slot of exactly one takes the rule line's
 * singular variant (`<id>_one`, same words) when the registry holds one. A number slot takes a
 * whole count only; a text slot takes the stored name or label as it is. Every slot the template
 * names must be given, and no other; the "Not analysed" line's file type must be one of prompt 3
 * 5.3's words; the "Formal quotation" stage label is never filled here (rule 10: it is derived
 * from a stored quotation record, which phase 3 has none of).
 */
export function fillLine(lineId: string, slots: Readonly<Record<string, string | number>>, format: FormatOptions): FilledLine {
  const singular = slots['count'] === 1 ? RULE_LINES.find((entry) => entry.id === `${lineId}_one`) : undefined;
  const source = singular === undefined ? sourceOf(lineId) : sourceOf(singular.id);
  if (source.kind === 'status' && source.definition.readsRecord !== undefined) {
    throw new Error(`view-model: the stage label ${lineId} is derived from a stored ${source.definition.readsRecord}, never filled from a parameter (rule 10)`);
  }
  const template = templateOf(source);
  const names = [...template.matchAll(/\{([^{}]+)\}/gu)].map((match) => match[1] ?? '');
  for (const name of Object.keys(slots)) {
    if (!names.includes(name)) throw new Error(`view-model: the line ${lineId} has no slot ${name}`);
  }
  const parts: string[] = [];
  const text = template.replace(/\{([^{}]+)\}/gu, (_whole, name: string) => {
    const value = slots[name];
    if (value === undefined) throw new Error(`view-model: the line ${lineId} needs its slot ${name}`);
    if (typeof value === 'number') {
      const figure = formatCount(value, format).text;
      parts.push(figure);
      return figure;
    }
    if (value.trim() === '') throw new Error(`view-model: the slot ${name} of the line ${lineId} is empty`);
    if (name === 'fileType' && !NOT_ANALYSED_FILE_TYPES.has(value)) throw new Error(`view-model: "${value}" is not a file type the G12-1 line names`);
    if (/\d/u.test(value)) parts.push(value);
    return value;
  });
  return { line: { id: source.definition.id, kind: kindOf(source), text }, parts: [...new Set(parts)] };
}

/** Whether a text holds a digit (a line with one is served as a bound display object, never as a plain line). */
export function holdsDigit(text: string): boolean {
  return /\d/u.test(text);
}
