/**
 * The badge, status-line and generated-sentence registries against
 * docs/guardrails.md 2.8, read at test time, and the allowances they register
 * (2.8 "Reserved terms", "Where they are allowed"; ADR 0011).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createAllowanceSet, findReservedTerms, registeredAllowances, scanCopy } from '../reserved-terms';
import { COPY_ALLOWANCES } from './allowances';
import { BADGES, firstBadge } from './badges';
import { GENERATED_SENTENCES } from './sentences';
import { STATUS_LINES } from './status-lines';

const guardrails = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../../docs/guardrails.md'), 'utf8');

/** The rows of the 2.8 table whose header matches, as cells. */
function rows(header: RegExp): string[][] {
  const lines = guardrails.split('\n');
  const start = lines.findIndex((line) => header.test(line));
  const found: string[][] = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith('|')) break;
    found.push(line.split('|').slice(1, -1).map((cell) => cell.trim()));
  }
  return found;
}

const bold = (cell: string): string[] => [...cell.matchAll(/\*\*([^*]+)\*\*/g)].map((match) => match[1] ?? '');
const quoted = (cell: string): string[] => [...cell.matchAll(/"([^"]+)"/g)].map((match) => match[1] ?? '');

/** A registry text matches a 2.8 text when every `{slot}` stands where 2.8 has a `<placeholder>` or an example number. */
function matches2_8(registryText: string, text2_8: string): boolean {
  const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = registryText
    .split(/\{[^{}]+\}/u)
    .map(escape)
    .join('(?:<[^<>]+>|\\d+(?:[.,]\\d+)*|\\d{1,2} [A-Z][a-z]{2})');
  return new RegExp(`^${pattern}$`, 'u').test(text2_8);
}

describe('the badge registry (2.8, "Badge labels")', () => {
  const table = rows(/^\|\s*Situation\s*\|\s*Badge\s*\|\s*Example line\s*\|/);

  it('holds every badge of 2.8, word for word, in its table order, and no other', () => {
    const labels2_8 = table.flatMap((row, position) => bold(row[1] ?? '').map((label) => ({ label, rank: position + 1 })));
    expect(labels2_8.length).toBeGreaterThan(0);
    expect(BADGES.map((badge) => ({ label: badge.label, rank: badge.rank }))).toEqual(labels2_8);
  });

  it('picks the first match in the table order when several apply (2.8, "One badge per value")', () => {
    expect(firstBadge(['from_document', 'two_values', 'likely'])?.id).toBe('two_values');
    expect(firstBadge(['provided_by_you', 'verified_by_sovitech'])?.id).toBe('verified_by_sovitech');
    expect(firstBadge([])).toBeUndefined();
  });
});

describe('the status-line registry (2.8, "Status lines and stage labels")', () => {
  const table = rows(/^\|\s*Situation\s*\|\s*Text\s*\|\s*$/);

  it('holds every text of 2.8, in its order, word for word but for the slots 2.8 marks', () => {
    const texts2_8 = table.flatMap((row) => quoted(row[1] ?? ''));
    expect(texts2_8).toHaveLength(STATUS_LINES.length);
    STATUS_LINES.forEach((line, position) => {
      const text2_8 = texts2_8[position] ?? '';
      expect(matches2_8(line.text, text2_8), `${line.id}: "${line.text}" against "${text2_8}"`).toBe(true);
    });
  });

  it('keeps every word of 2.8 as a word: a slot stands only for a placeholder or a number', () => {
    for (const line of STATUS_LINES) {
      const words = line.text.replace(/\{[^{}]+\}/gu, ' ').split(/\s+/u);
      for (const word of words) expect(word, line.id).not.toMatch(/\d/u);
    }
  });
});

describe('the generated sentences and the allowances they need (2.8; ADR 0011)', () => {
  const exampleLines = rows(/^\|\s*Situation\s*\|\s*Badge\s*\|\s*Example line\s*\|/).flatMap((row) => quoted(row[2] ?? ''));

  it('holds each generated sentence as 2.8 writes it in the badge table, with the date as its slot', () => {
    for (const sentence of GENERATED_SENTENCES) {
      expect(exampleLines.some((line) => matches2_8(sentence.template, line)), sentence.id).toBe(true);
    }
  });

  it('registers one allowance for every registry text that holds a reserved term, and none for any other', () => {
    const texts = [
      ...BADGES.map((badge) => badge.label),
      ...STATUS_LINES.map((line) => line.text),
      ...GENERATED_SENTENCES.map((sentence) => sentence.template.replace(/\{[^{}]+\}/gu, 'TEST')),
    ];
    const holding = texts.filter((text) => findReservedTerms(text).length > 0);
    expect(holding).toEqual(['Verified by SOVITECH', 'Confirmed by you', 'Formal quotation', 'AI inference, verified by SOVITECH on TEST', 'AI inference, confirmed by you']);
    expect(COPY_ALLOWANCES).toHaveLength(holding.length);
    const set = createAllowanceSet(COPY_ALLOWANCES);
    // Each registry text passes as its own definition in the copy registry (slots as written).
    const definitions = [
      ...BADGES.map((badge) => badge.label),
      ...STATUS_LINES.map((line) => line.text),
      ...GENERATED_SENTENCES.map((sentence) => sentence.template),
    ].filter((text) => findReservedTerms(text).length > 0);
    for (const text of definitions) expect(scanCopy(text, { allowances: set, context: { kind: 'copy_registry' } }), text).toEqual([]);
    // As shown: a date fills the slot, and the stage 3 label needs its stored quotation record.
    expect(scanCopy('AI inference, verified by SOVITECH on 12 Oct', { allowances: set })).toEqual([]);
    expect(scanCopy('AI inference, verified by SOVITECH on TEST', { allowances: set })).not.toEqual([]);
    expect(scanCopy('Formal quotation', { allowances: set })).not.toEqual([]);
    expect(scanCopy('Formal quotation', { allowances: set, quotationRecordId: 'q-TEST-1' })).toEqual([]);
  });

  it('binds the stage 3 label to the stored quotation record, as rule 10 derives it', () => {
    expect(STATUS_LINES.filter((line) => line.readsRecord !== undefined).map((line) => [line.id, line.readsRecord])).toEqual([['formal_quotation', 'quotation_record']]);
    expect(COPY_ALLOWANCES.find((entry) => entry.kind === 'status_line')).toEqual({
      kind: 'status_line',
      statusLineId: 'formal_quotation',
      text: 'Formal quotation',
      requiresRecord: 'quotation_record',
    });
  });

  it('is what the reserved-term module registers', () => {
    expect(registeredAllowances().entries).toEqual(COPY_ALLOWANCES);
  });

  it('never lets a slot carry a reserved term or words through', () => {
    const set = createAllowanceSet(COPY_ALLOWANCES);
    expect(scanCopy('AI inference, verified by SOVITECH on a firm price', { allowances: set })).not.toEqual([]);
    expect(scanCopy('AI inference, verified by SOVITECH on request of the designer', { allowances: set })).not.toEqual([]);
    expect(scanCopy('Formal quotation, final', { allowances: set, quotationRecordId: 'q-TEST-1' })).not.toEqual([]);
  });
});
