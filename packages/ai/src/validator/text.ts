/**
 * Text helpers shared by the validator's checks: folding that keeps every index in
 * place, clause splitting, and whole-word search over folded text.
 */
import { LATIN_LETTER_FORMS } from './latin-forms';

const MARKS = /\p{M}/gu;

/**
 * `text` lower-cased and without diacritics, one UTF-16 unit for one unit, so an index
 * into the result is an index into `text`. A character whose folded form would change
 * length is only lower-cased (or kept) so the lengths stay equal.
 */
export function foldKeepingIndices(text: string): string {
  let folded = '';
  for (const character of text) {
    const stripped = character.normalize('NFD').replace(MARKS, '').toLowerCase();
    if (stripped.length === character.length) folded += stripped;
    else {
      const lower = character.toLowerCase();
      folded += lower.length === character.length ? lower : character;
    }
  }
  return folded;
}

export interface Span {
  readonly index: number;
  readonly length: number;
}

/** Every match of a global pattern, as spans. */
export function spansOf(pattern: RegExp, text: string): Span[] {
  if (!pattern.global) throw new TypeError('spansOf needs a global pattern');
  const spans: Span[] = [];
  pattern.lastIndex = 0;
  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    if (match[0].length === 0) {
      pattern.lastIndex += 1;
      continue;
    }
    spans.push({ index: match.index, length: match[0].length });
  }
  return spans;
}

/** Letters and digits, for whole-word boundaries that work with diacritics and the mask. */
export const WORD = String.raw`[\p{L}\p{N}_]`;

/** A whole-word pattern over folded text, from alternatives written in folded form. */
export function wholeWords(alternatives: readonly string[]): RegExp {
  const sorted = [...alternatives].sort((left, right) => right.length - left.length);
  return new RegExp(`(?<!${WORD})(?:${sorted.join('|')})(?!${WORD})`, 'gu');
}

// ---------------------------------------------------------------------------
// The text the prose checks read (phase 2 review, adversarial finding "homoglyphs and
// number glyphs pass the prose checks"): compatibility forms as their plain letters and
// digits (NFKC: "１２" is "12", "⁸⁰⁰" is "800", "Ⅻ" is "XII", "ﬁ" is "fi"), format
// characters dropped (a zero-width space or a soft hyphen inside a word), and the letters
// of other scripts that look like Latin ones read as those Latin letters (a Cyrillic "е"
// in "vеrified" reads "e"). A word that mixes scripts is reported on its own: no word
// in AI-written English or Romanian needs one.
// ---------------------------------------------------------------------------

/**
 * Letters of other scripts drawn like a Latin letter, as that letter: a skeleton in the
 * sense of Unicode's confusables (UTS #39), kept to the scripts a reader of English and
 * Romanian text would take for Latin (Cyrillic, Greek, Armenian) and a few Latin
 * look-alikes that NFKC keeps.
 */
export const CONFUSABLE_LATIN: Readonly<Record<string, string>> = Object.freeze({
  // Cyrillic, lower case
  а: 'a', в: 'b', г: 'r', д: 'd', е: 'e', ё: 'e', з: '3', и: 'u', й: 'u', к: 'k', л: 'n', м: 'm', н: 'h', о: 'o', п: 'n', р: 'p', с: 'c', т: 't',
  у: 'y', ф: 'f', х: 'x', ц: 'u', ч: 'y', ш: 'w', щ: 'w', ъ: 'b', ы: 'bl', ь: 'b', э: 'e', ю: 'io', я: 'r', ѐ: 'e', ђ: 'h', ѓ: 'r', є: 'e', ѕ: 's', і: 'i',
  ї: 'i', ј: 'j', љ: 'jb', њ: 'hb', ћ: 'h', ќ: 'k', ѝ: 'u', ў: 'y', џ: 'u', ѡ: 'w', ѵ: 'v', ґ: 'r', ғ: 'f', ҝ: 'k', ҟ: 'k', ң: 'h', ҥ: 'h', ү: 'y',
  ұ: 'y', ҳ: 'x', һ: 'h', ӏ: 'l', ӑ: 'a', ӓ: 'a', ӕ: 'ae', ӗ: 'e', ә: 'e', ӧ: 'o', ө: 'o', ӱ: 'y', ӳ: 'y', ԁ: 'd', ԃ: 'd', ԛ: 'q', ԝ: 'w',
  // Cyrillic, upper case
  А: 'A', В: 'B', Г: 'r', Е: 'E', Ё: 'E', З: '3', И: 'N', К: 'K', Л: 'N', М: 'M', Н: 'H', О: 'O', П: 'N', Р: 'P', С: 'C', Т: 'T', У: 'Y', Х: 'X',
  Ь: 'b', Ѕ: 'S', І: 'I', Ї: 'I', Ј: 'J', Ү: 'Y', Һ: 'H', Ӏ: 'I', Ԁ: 'D', Ԛ: 'Q', Ԝ: 'W',
  // Greek
  α: 'a', β: 'b', γ: 'y', δ: 'd', ε: 'e', ζ: 'z', η: 'n', ι: 'i', κ: 'k', ν: 'v', ο: 'o', ρ: 'p', σ: 'o', ς: 's', τ: 't', υ: 'u', χ: 'x', ω: 'w',
  ϲ: 'c', ϳ: 'j', Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X', Ϲ: 'C', Ϳ: 'J',
  // Armenian
  ա: 'w', գ: 'q', զ: 'q', հ: 'h', ո: 'n', ռ: 'n', ս: 'u', ց: 'g', օ: 'o', ք: 'p', Յ: '3', Ս: 'U', Օ: 'O',
  // Latin look-alikes that NFKC keeps
  ı: 'i', ȷ: 'j', ɑ: 'a', ɡ: 'g', ɩ: 'i', ɪ: 'i', ʀ: 'r', ʏ: 'y', ᴀ: 'a', ᴄ: 'c', ᴅ: 'd', ᴇ: 'e', ᴊ: 'j', ᴋ: 'k', ᴍ: 'm', ᴏ: 'o', ᴘ: 'p', ᴛ: 't',
  ᴜ: 'u', ᴠ: 'v', ᴡ: 'w', ᴢ: 'z', ſ: 's',
});

const FORMAT_CHARACTER = /^\p{Cf}$/u;
const LATIN_LETTER = /^\p{Script=Latin}$/u;
const LETTER_OR_MARK = /^[\p{L}\p{M}]$/u;
const MARK = /^\p{M}$/u;

/** A unit prefix or symbol of another script that sits inside a Latin unit ("µg", "kΩ"): not a mixed-script word. */
const UNIT_LETTERS = new Set(['μ', 'Ω']);

/** Text as the prose checks read it, with the way back to the text as written. */
export interface CheckedText {
  /** Compatibility forms as plain forms, format characters dropped, look-alike letters as Latin letters. */
  readonly text: string;
  /** Words (in `text` positions) whose letters come from more than one script. */
  readonly mixedScript: readonly Span[];
  /** A span of `text` as the span of the text as written that it came from. */
  readonly original: (span: Span) => Span;
}

/**
 * Reads `text` for the prose checks: NFKC per character, format characters dropped, the
 * confusables skeleton, and the Latin letter forms NFKC keeps (small capitals such as "ᴠ" and
 * "ꜰ", letters with a stroke or hook, the negative circled and squared letters) as ASCII
 * letters (latin-forms.ts; phase 2 fix round 3, "small-capital Latin letters pass
 * reserved_term").
 */
export function checkedText(text: string): CheckedText {
  let out = '';
  const start: number[] = [];
  const end: number[] = [];
  // Per output unit: the script of the letter as NFKC left it (before the skeleton), for the mixed-script test.
  const scripts: (string | undefined)[] = [];
  let position = 0;
  for (const character of text) {
    const from = position;
    position += character.length;
    if (FORMAT_CHARACTER.test(character)) continue;
    for (const plain of character.normalize('NFKC')) {
      const script = !LETTER_OR_MARK.test(plain) || MARK.test(plain) ? undefined : LATIN_LETTER.test(plain) || UNIT_LETTERS.has(plain) ? 'latin' : 'other';
      const skeleton = CONFUSABLE_LATIN[plain] ?? LATIN_LETTER_FORMS[plain] ?? plain;
      for (let unit = 0; unit < skeleton.length; unit += 1) {
        start.push(from);
        end.push(position);
        scripts.push(script);
      }
      out += skeleton;
    }
  }
  const mixedScript: Span[] = [];
  const WORD_RUN = /[\p{L}\p{M}]+/gu;
  for (let match = WORD_RUN.exec(out); match !== null; match = WORD_RUN.exec(out)) {
    const kinds = new Set(scripts.slice(match.index, match.index + match[0].length).filter((kind) => kind !== undefined));
    if (kinds.size > 1) mixedScript.push({ index: match.index, length: match[0].length });
  }
  const original = (span: Span): Span => {
    const index = start[span.index];
    const last = end[Math.min(span.index + Math.max(span.length, 1) - 1, end.length - 1)];
    // A span outside the read text (none is expected) is reported as it came.
    if (index === undefined || last === undefined) return span;
    return { index, length: last - index };
  };
  return { text: out, mixedScript, original };
}

// ---------------------------------------------------------------------------
// Letter-spaced words (phase 2 fix round 3, the verifier's finding "letter-spaced words pass
// reserved_term": "The design is c o m p l i a n t." passed, because the check reads whole
// words). Single letters separated by spaces, dots, hyphens or the like are read joined, so
// the whole-word check sees the word they spell.
// ---------------------------------------------------------------------------

/** What may stand between the letters of a letter-spaced word: one to three of these. */
const SPACING = String.raw`[\s.\-_·‧∙•*~/|'’‐‑‒–—]`;
/** Three or more single letters, each standing alone, joined by spacing. */
const SPACED_LETTERS = new RegExp(String.raw`(?<![\p{L}\p{N}])\p{L}(?![\p{L}\p{N}])(?:${SPACING}{1,3}\p{L}(?![\p{L}\p{N}])){2,}`, 'gu');
const SINGLE_LETTER = /\p{L}/gu;

/** Text with its letter-spaced words joined, and the way back to the text it was read from. */
export interface JoinedText {
  readonly text: string;
  /** Whether any letter-spaced word was joined. */
  readonly joined: boolean;
  /** A span of `text` as the span of the text it was read from. */
  readonly original: (span: Span) => Span;
}

/**
 * `text` with every run of three or more single letters read as one word: "c o m p l i a n t"
 * is "compliant", "V. E. R. I. F. I. E. D." is "VERIFIED". Within a run, a gap wider than its
 * narrowest gap is a space between words ("f i r m  p r i c e" is "firm price"). Nothing
 * outside the runs changes.
 */
export function joinLetterSpacing(text: string): JoinedText {
  let out = '';
  const start: number[] = [];
  const end: number[] = [];
  const keep = (from: number, to: number) => {
    for (let at = from; at < to; at += 1) {
      out += text.charAt(at);
      start.push(at);
      end.push(at + 1);
    }
  };
  let cursor = 0;
  let joined = false;
  SPACED_LETTERS.lastIndex = 0;
  for (let run = SPACED_LETTERS.exec(text); run !== null; run = SPACED_LETTERS.exec(text)) {
    keep(cursor, run.index);
    const letters: { index: number; end: number; letter: string }[] = [];
    SINGLE_LETTER.lastIndex = 0;
    for (let letter = SINGLE_LETTER.exec(run[0]); letter !== null; letter = SINGLE_LETTER.exec(run[0])) {
      const index = run.index + letter.index;
      letters.push({ index, end: index + letter[0].length, letter: letter[0] });
    }
    // The gap before each letter after the first, in code units; the narrowest one joins letters of one word.
    const gaps: number[] = [];
    let previous: (typeof letters)[number] | undefined;
    for (const letter of letters) {
      if (previous !== undefined) gaps.push(letter.index - previous.end);
      previous = letter;
    }
    const narrowest = Math.min(...gaps);
    previous = undefined;
    for (const letter of letters) {
      if (previous !== undefined && letter.index - previous.end > narrowest) {
        out += ' ';
        start.push(previous.end);
        end.push(letter.index);
      }
      out += letter.letter;
      for (let unit = 0; unit < letter.letter.length; unit += 1) {
        start.push(letter.index);
        end.push(letter.end);
      }
      previous = letter;
    }
    cursor = run.index + run[0].length;
    joined = true;
  }
  keep(cursor, text.length);
  const original = (span: Span): Span => {
    const index = start[span.index];
    const last = end[Math.min(span.index + Math.max(span.length, 1) - 1, end.length - 1)];
    if (index === undefined || last === undefined) return span;
    return { index, length: last - index };
  };
  return { text: out, joined, original };
}

// ---------------------------------------------------------------------------
// Stretches of a letter-spaced run (phase 2 fix round 4, the verifier's finding "a spaced reserved
// term right after a one-letter word is read joined with that word": "It is a q u o t e." was read
// "aquote", and "Este o o f e r t ă." "oofertă"). Each stretch of three or more letters inside a
// run is also read joined on its own, so a reserved term is found wherever in the run it starts
// and ends.
// ---------------------------------------------------------------------------

/** The letters of each letter-spaced run of `text`, with their positions. */
function spacedRuns(text: string): { index: number; end: number; letter: string }[][] {
  const runs: { index: number; end: number; letter: string }[][] = [];
  SPACED_LETTERS.lastIndex = 0;
  for (let run = SPACED_LETTERS.exec(text); run !== null; run = SPACED_LETTERS.exec(text)) {
    const letters: { index: number; end: number; letter: string }[] = [];
    SINGLE_LETTER.lastIndex = 0;
    for (let letter = SINGLE_LETTER.exec(run[0]); letter !== null; letter = SINGLE_LETTER.exec(run[0])) {
      const index = run.index + letter.index;
      letters.push({ index, end: index + letter[0].length, letter: letter[0] });
    }
    runs.push(letters);
  }
  return runs;
}

/**
 * `text` with every letter-spaced run read joined in place: its letters joined (a gap wider than the
 * run's narrowest gap is a space between words), then spaces up to the run's length, so every index
 * outside a run stays where it was and no sentence mark is added ("s t o p p e d by" is read
 * "stopped       by"). The rule 11 check's wide reading reads this (phase 2 fix round 4).
 */
export function joinLetterSpacingInPlace(text: string): string {
  let out = '';
  let cursor = 0;
  for (const letters of spacedRuns(text)) {
    const first = letters[0];
    const last = letters.at(-1);
    if (first === undefined || last === undefined) continue;
    const gaps = letters.slice(1).map((letter, at) => letter.index - (letters[at]?.end ?? letter.index));
    const narrowest = Math.min(...gaps);
    let word = '';
    letters.forEach((letter, at) => {
      const previous = letters[at - 1];
      if (previous !== undefined && letter.index - previous.end > narrowest) word += ' ';
      word += letter.letter;
    });
    out += text.slice(cursor, first.index) + word + ' '.repeat(last.end - first.index - word.length);
    cursor = last.end;
  }
  return out + text.slice(cursor);
}

/** One stretch of a letter-spaced run read joined, within the words around it. */
export interface JoinedStretch extends JoinedText {
  /** Where the joined stretch stands in `text`. */
  readonly stretch: Span;
}

/** How far on each side of a stretch its surroundings are read (then out to the next space), for reserved terms of more than one word. */
const STRETCH_CONTEXT = 48;

/**
 * Every stretch of `minLetters` to `maxLetters` letters inside each letter-spaced run of `text`,
 * other than the whole run (which joinLetterSpacing reads), joined on its own within the words
 * around it: "It is a q u o t e." gives, among others, "It is a quote.". Within a stretch, a gap
 * wider than its narrowest gap is a space between words, as in joinLetterSpacing. `worthReading`
 * (the stretch's letters, folded) skips stretches no term could be read in, so a long run costs
 * little.
 */
export function letterStretches(text: string, options: { readonly minLetters?: number; readonly maxLetters?: number; readonly worthReading?: (letters: string) => boolean } = {}): JoinedStretch[] {
  const { minLetters = 3, maxLetters = 24, worthReading = () => true } = options;
  const found: JoinedStretch[] = [];
  for (const letters of spacedRuns(text)) {
    const folded = letters.map((letter) => foldKeepingIndices(letter.letter)).join('');
    for (let from = 0; from < letters.length; from += 1) {
      for (let to = from + minLetters; to <= Math.min(letters.length, from + maxLetters); to += 1) {
        if ((from === 0 && to === letters.length) || !worthReading(folded.slice(from, to))) continue;
        found.push(joinStretch(text, letters.slice(from, to)));
      }
    }
  }
  return found;
}

function joinStretch(text: string, letters: readonly { index: number; end: number; letter: string }[]): JoinedStretch {
  const first = letters[0];
  const last = letters.at(-1);
  if (first === undefined || last === undefined) throw new TypeError('joinStretch needs letters');
  // Out to STRETCH_CONTEXT units on each side, then on to the next space, so no word is cut.
  let from = first.index;
  for (let steps = 0; from > 0 && steps < STRETCH_CONTEXT; steps += 1) from -= 1;
  while (from > 0 && !/\s/u.test(text.charAt(from - 1))) from -= 1;
  let to = last.end;
  for (let steps = 0; to < text.length && steps < STRETCH_CONTEXT; steps += 1) to += 1;
  while (to < text.length && !/\s/u.test(text.charAt(to))) to += 1;
  let out = '';
  const start: number[] = [];
  const end: number[] = [];
  const keep = (at: number, stop: number) => {
    for (let unit = at; unit < stop; unit += 1) {
      out += text.charAt(unit);
      start.push(unit);
      end.push(unit + 1);
    }
  };
  keep(from, first.index);
  const stretchStart = out.length;
  const gaps = letters.slice(1).map((letter, at) => letter.index - (letters[at]?.end ?? letter.index));
  const narrowest = Math.min(...gaps);
  letters.forEach((letter, at) => {
    const previous = letters[at - 1];
    if (previous !== undefined && letter.index - previous.end > narrowest) {
      out += ' ';
      start.push(previous.end);
      end.push(letter.index);
    }
    out += letter.letter;
    for (let unit = 0; unit < letter.letter.length; unit += 1) {
      start.push(letter.index);
      end.push(letter.end);
    }
  });
  const stretch = { index: stretchStart, length: out.length - stretchStart };
  keep(last.end, to);
  const original = (span: Span): Span => {
    const index = start[span.index];
    const stop = end[Math.min(span.index + Math.max(span.length, 1) - 1, end.length - 1)];
    if (index === undefined || stop === undefined) return span;
    return { index, length: stop - index };
  };
  return { text: out, joined: true, original, stretch };
}

/** A clause: a span of text between sentence marks or clause joiners. */
export interface Clause {
  readonly index: number;
  readonly text: string;
}

const CLAUSE_BREAK = new RegExp(
  [
    String.raw`[.;!?\n]+`,
    // ", and ...", ", while ..." and the like start a new clause.
    String.raw`,\s*(?=(?:and|but|while|whereas|iar|dar|si|in timp ce)(?!${WORD}))`,
    // "... and the BMS ..." starts a new clause: its own verbs are the BMS's.
    String.raw`\s(?=(?:and|but|while|whereas|iar|dar|si)\s+(?:the\s+)?(?:bms|building management|sistemul)(?!${WORD}))`,
    // "..., while ..." without a comma.
    String.raw`\s(?=(?:while|whereas|iar|in timp ce)(?!${WORD}))`,
  ].join('|'),
  'gu',
);

/** Splits folded text into clauses, keeping each clause's start index. */
export function clauses(folded: string): Clause[] {
  const found: Clause[] = [];
  let start = 0;
  CLAUSE_BREAK.lastIndex = 0;
  for (let match = CLAUSE_BREAK.exec(folded); match !== null; match = CLAUSE_BREAK.exec(folded)) {
    if (match[0].length === 0) {
      CLAUSE_BREAK.lastIndex += 1;
      continue;
    }
    if (match.index > start) found.push({ index: start, text: folded.slice(start, match.index) });
    start = match.index + match[0].length;
  }
  if (start < folded.length) found.push({ index: start, text: folded.slice(start) });
  return found.filter((clause) => clause.text.trim() !== '');
}
