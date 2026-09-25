/**
 * G2-8 analysis of a value timeline recorded by the in-page harness (in-page.ts).
 *
 * The reading (docs/adr/0006-render-test.md): only the formatted bound value is ever shown.
 * For each value id, the texts its elements show over the observation are replayed in
 * order. A value id fails when one text holding a number stopped being shown while the
 * same id showed a different text holding a number. That catches a count-up in place,
 * a count-up that swaps elements, and a flip-book of hidden elements, and it lets through
 * a pending value that later shows its number, and the same value shown in two places.
 */
import { NUMBER_WORDS, type TimelineRecord } from './contract';

const NUMBER_CHAR = /\p{N}/u;
/** Number words of both languages: a value element's text holds a number when it has one. */
const NUMBER_WORD = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${[...new Set([...NUMBER_WORDS.en, ...NUMBER_WORDS.ro])].join('|')})(?![\\p{L}\\p{N}_])`, 'u');

function holdsNumber(text: string): boolean {
  return NUMBER_CHAR.test(text) || NUMBER_WORD.test(text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase());
}

export interface ValueChange {
  valueId: string;
  /** Texts holding a number, in the order they first appeared. */
  texts: string[];
  /** Of those, the texts that stopped being shown during the observation. */
  left: string[];
  /** Where the first element showing this value id sits. */
  where: string;
}

/** Value ids that showed one number and then another. Records must be in time order. */
export function findValueChanges(records: readonly TimelineRecord[]): ValueChange[] {
  const current = new Map<number, { valueId: string; text: string | null }>();
  const perId = new Map<string, { texts: string[]; left: Set<string>; where: string }>();

  const numberTextsOf = (valueId: string): Set<string> => {
    const texts = new Set<string>();
    for (const state of current.values()) {
      if (state.valueId === valueId && state.text !== null && holdsNumber(state.text)) texts.add(state.text);
    }
    return texts;
  };

  for (const record of records) {
    const previous = current.get(record.key);
    const affected = new Set<string>([record.valueId]);
    if (previous !== undefined) affected.add(previous.valueId);
    affected.delete('');
    const before = new Map<string, Set<string>>();
    for (const valueId of affected) before.set(valueId, numberTextsOf(valueId));
    current.set(record.key, { valueId: record.valueId, text: record.text });
    for (const valueId of affected) {
      let info = perId.get(valueId);
      if (info === undefined) {
        info = { texts: [], left: new Set<string>(), where: record.where };
        perId.set(valueId, info);
      }
      const after = numberTextsOf(valueId);
      for (const text of after) {
        if (!info.texts.includes(text)) info.texts.push(text);
      }
      for (const text of before.get(valueId) ?? []) {
        if (!after.has(text)) info.left.add(text);
      }
    }
  }

  const changes: ValueChange[] = [];
  for (const [valueId, info] of perId) {
    if (info.texts.length >= 2 && info.left.size >= 1) {
      changes.push({ valueId, texts: info.texts, left: [...info.left], where: info.where });
    }
  }
  return changes;
}

/** "a" → "b" → … → "z", keeping the first three and the last. */
export function summariseTexts(texts: readonly string[]): string {
  const quoted = texts.map((text) => `"${text.length > 60 ? `${text.slice(0, 57)}...` : text}"`);
  if (quoted.length <= 5) return quoted.join(' → ');
  return [...quoted.slice(0, 3), `… ${quoted.length - 4} more …`, quoted[quoted.length - 1]].join(' → ');
}
