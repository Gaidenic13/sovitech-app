/**
 * The regim de înălțime (docs/guardrails.md rule 8, "Floors": "Store floors as
 * counts by level type ... The regim de înălțime is the first source. An example
 * is '3S+P+Mz+12E+Er'"; F-REGISTRY-03; G8-9 is its phase 2 eval).
 *
 * Each part names one level type of rule 8's list, with a count in front where
 * there is more than one. Only the letters of rule 8's own example
 * "3S+P+Mz+12E+Er" are read: S subsol (below ground), P parter (ground), Mz
 * mezanin (mezzanine), E etaj (upper floors), Er etaj retras (setback or
 * technical floor). Rule 8 expands abbreviations only from the glossary in
 * reference data, and the Romanian glossary is not approved (gate
 * `dataset-glossary`, closed; D-92, D-37), so a letter the example does not show
 * (D for demisol, Et for etaj tehnic, M for mansardă, or any other) is not
 * expanded in code: its part is `unrecognised`, its level type stays Unknown and
 * the text is kept as written (phase 1 review, verifier finding 9). Whether
 * those letters join once the glossary is approved is the approver's (D-18 for
 * the floors notation). Roof plant has no letter in the notation, so the
 * notation never gives it.
 *
 * Nothing is guessed. A part the grammar does not know is returned as
 * `unrecognised`, and its level type stays unknown (rule 8: "Parts with no
 * source are Unknown"). A level type written twice ("Er" and "2Er") is
 * returned in `repeated` and given no count, rather than added up: totals are
 * the engine's. No part is ever read as zero: a level type the notation does not
 * name is absent from `counts`, not 0 (rule 1, "Zero is a value").
 */
import { parseNumber } from './parse-number';

/** Rule 8's level types, in its order. */
export const LEVEL_TYPES = [
  'below_ground',
  'semi_basement',
  'ground',
  'mezzanine',
  'upper',
  'setback_or_technical',
  'attic',
  'roof_plant',
] as const;
export type LevelType = (typeof LEVEL_TYPES)[number];

/**
 * The letters of the notation, as written, and the level type each names: only those
 * rule 8's example "3S+P+Mz+12E+Er" shows, until an approved glossary names more.
 */
const LETTERS: ReadonlyMap<string, LevelType> = new Map([
  ['S', 'below_ground'],
  ['P', 'ground'],
  ['Mz', 'mezzanine'],
  ['E', 'upper'],
  ['Er', 'setback_or_technical'],
]);

/** The letters the parser reads, for tests and reports. */
export const FLOOR_NOTATION_LETTERS: readonly string[] = Object.freeze([...LETTERS.keys()]);

/**
 * Each letter the parser reads with the level type it names. The loosening
 * snapshot records it (phase 1 review, round 3, adversarial finding 4): a letter
 * added, or a letter that names another level type, expands an abbreviation
 * rule 8 routes through the glossary, a loosening that needs the approver.
 */
export const FLOOR_NOTATION_LEVEL_TYPES: Readonly<Record<string, LevelType>> = Object.freeze(Object.fromEntries(LETTERS));

/** Level types that are one level by nature: a count in front of them is not read. */
const SINGLE: ReadonlySet<LevelType> = new Set(['ground']);

export interface FloorNotation {
  /** The notation exactly as written. */
  readonly original: string;
  /** Counts by level type, for the parts read. */
  readonly counts: Readonly<Partial<Record<LevelType, number>>>;
  /** Parts the grammar does not know, as written. */
  readonly unrecognised: readonly string[];
  /** Level types named by more than one part, left without a count. */
  readonly repeated: readonly LevelType[];
}

const PART = /^(\d+)?\s*([A-Za-z]+)$/u;

/** Reads a regim de înălțime. Returns undefined for text that is not one (no "+"-joined parts at all). */
export function parseFloorNotation(text: string): FloorNotation | undefined {
  const parts = text
    .normalize('NFC')
    .trim()
    .split('+')
    .map((part) => part.trim());
  if (parts.length < 2 || parts.some((part) => part === '')) return undefined;
  const seen = new Map<LevelType, number[]>();
  const unrecognised: string[] = [];
  for (const part of parts) {
    const match = PART.exec(part);
    const letters = match?.[2];
    const type = letters === undefined ? undefined : LETTERS.get(letters);
    if (match === null || type === undefined) {
      unrecognised.push(part);
      continue;
    }
    const countText = match[1];
    let count = 1;
    if (countText !== undefined) {
      const parsed = parseNumber(countText);
      const reading = parsed.ok && !parsed.ambiguous ? parsed.readings[0] : undefined;
      if (reading === undefined || !Number.isInteger(reading.value) || reading.value < 1 || SINGLE.has(type)) {
        unrecognised.push(part);
        continue;
      }
      count = reading.value;
    }
    seen.set(type, [...(seen.get(type) ?? []), count]);
  }
  const counts: Partial<Record<LevelType, number>> = {};
  const repeated: LevelType[] = [];
  for (const type of LEVEL_TYPES) {
    const found = seen.get(type);
    if (found === undefined) continue;
    const [only] = found;
    if (found.length === 1 && only !== undefined) counts[type] = only;
    else repeated.push(type);
  }
  return Object.freeze({
    original: text,
    counts: Object.freeze(counts),
    unrecognised: Object.freeze(unrecognised),
    repeated: Object.freeze(repeated),
  });
}
