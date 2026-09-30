/**
 * Figures in AI prose (guardrails rule 2, "The output validator rejects any digit
 * sequence in AI prose that is not a token. Years, document and sheet names, and
 * standard identifiers on an allowlist are exempt"; rule 9, "It never writes a number it
 * was not given, and that includes range bounds and percentages", and "The AI never does
 * arithmetic in text"; G2-3, G9-5).
 *
 * Four checks, each over the text with its tokens masked:
 * - digits: any digit outside a token, a listed name or standard identifier, or a year
 *   written as a year ("in 2019", "(2007)");
 * - number words: numbers written in words, English or Romanian, and the percent sign,
 *   so a figure cannot come back spelled out;
 * - composed ranges: two tokens joined into a range ("from T to T", "between T and T"),
 *   a range the engine did not return;
 * - arithmetic: two tokens joined by an operator, a ratio after a token ("T per room"),
 *   or a sum, average or ratio of tokens.
 */
import { MASK } from './tokens';
import { WORD, foldKeepingIndices, spansOf, wholeWords, type Span } from './text';

/**
 * A run of numerals: any character Unicode counts as a number (\p{N}), so superscripts,
 * circled and dingbat numerals, fractions and Roman numeral characters count as digits
 * even before the prose checks read them through NFKC (text.ts, checkedText).
 */
const DIGIT_RUN = /\p{N}+(?:[.,\u00A0\u202F' ]\p{N}+)*/gu;

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
];

/** Words after which a four-digit number reads as a year (folded). */
const YEAR_PREFIX = new RegExp(
  String.raw`(?:(?<!${WORD})(?:in|since|from|until|before|after|year|of|by|din|anul|pana in|dupa|inainte de|${MONTHS.join('|')})\s+|\(\s*)$`,
  'u',
);

/** What must not follow a year: a unit or a counted noun, which makes it a quantity. */
const QUANTITY_AFTER = /^\s*(?:%|‰|€|\$|m²|m³|m2|m3|mp|mc|kw|kwh|mw|mwh|w|kva|va|l\/s|m3\/h|ron|eur|euro|lei|h|pts|points|puncte|rooms|camere|units|buc|pieces|items|assets|echipamente)(?![\p{L}\p{N}_])/iu;

function isYear(masked: string, folded: string, run: Span): boolean {
  const digits = masked.slice(run.index, run.index + run.length);
  if (!/^(?:19|20)\p{Nd}{2}$/u.test(digits)) return false;
  if (!YEAR_PREFIX.test(folded.slice(0, run.index))) return false;
  return !QUANTITY_AFTER.test(masked.slice(run.index + run.length));
}

/** Where `needle` occurs in `text`, case-sensitive. */
function occurrences(text: string, needle: string): Span[] {
  if (needle === '') return [];
  const spans: Span[] = [];
  for (let index = text.indexOf(needle); index >= 0; index = text.indexOf(needle, index + needle.length)) spans.push({ index, length: needle.length });
  return spans;
}

/** A superscript two or three right after a letter: the power of a unit symbol ("m²", "m³"), not a figure. */
export function isUnitPower(text: string, run: Span): boolean {
  return /^[\u00B2\u00B3]$/u.test(text.slice(run.index, run.index + run.length)) && /\p{L}$/u.test(text.slice(0, run.index));
}

/** Digit runs in `masked` (tokens already masked) that no exemption covers. */
export function digitsOutsideTokens(masked: string, exemptNames: readonly string[]): Span[] {
  const exempt = exemptNames.flatMap((name) => occurrences(masked, name));
  const covered = (run: Span): boolean => exempt.some((span) => span.index <= run.index && run.index + run.length <= span.index + span.length);
  const folded = foldKeepingIndices(masked);
  return spansOf(DIGIT_RUN, masked).filter((run) => !covered(run) && !isYear(masked, folded, run) && !isUnitPower(masked, run));
}

/**
 * What a count counts (folded, English and Romanian): a Roman numeral before one of these
 * is a count written in letters ("XII floors", "XII etaje").
 */
export const COUNTED_NOUNS: readonly string[] = [
  'floors', 'floor', 'levels', 'level', 'storeys', 'storey', 'stories', 'basements', 'rooms', 'room', 'keys', 'beds', 'apartments', 'units', 'unit',
  'zones', 'points', 'panels', 'controllers', 'sensors', 'meters', 'pumps', 'fans', 'ahus', 'ahu', 'chillers', 'boilers', 'dampers', 'lifts',
  'elevators', 'items', 'assets', 'pieces', 'systems', 'buildings', 'wings', 'blocks', 'kw', 'kwh', 'mw', 'm2', 'mp', 'sqm',
  'etaje', 'etaj', 'niveluri', 'nivele', 'subsoluri', 'camere', 'unitati', 'zone', 'puncte', 'tablouri', 'senzori', 'contoare', 'pompe',
  'ventilatoare', 'centrale', 'clapete', 'lifturi', 'ascensoare', 'echipamente', 'bucati', 'buc', 'corpuri', 'cladiri', 'apartamente',
];

/** A Roman numeral, whole word (folded text): one to many letters in the numeral's order. */
const ROMAN = String.raw`(?=[mdclxvi])m{0,4}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})`;
/** Words after which a letter is a label, not a count ("wing C rooms", "level II rooms", "corp B camere"). */
const LABEL_WORDS = [
  'block', 'wing', 'zone', 'type', 'class', 'level', 'sector', 'sheet', 'axis', 'grid', 'phase', 'stage', 'annex', 'appendix', 'section', 'part',
  'corp', 'bloc', 'tronson', 'scara', 'zona', 'tip', 'clasa', 'nivel', 'nivelul', 'etajul', 'plansa', 'ax', 'faza', 'anexa', 'sectiunea', 'partea',
];
const ROMAN_BEFORE_COUNT = new RegExp(
  String.raw`(?<!${WORD})(?<!(?:${LABEL_WORDS.join('|')})\s+)${ROMAN}(?!${WORD})(?=\s+(?:${COUNTED_NOUNS.join('|')})(?!${WORD}))`,
  'gu',
);

/** Roman numerals before a counted noun ("XII floors"): a count written in letters (rule 2). */
export function romanCounts(masked: string): Span[] {
  return spansOf(ROMAN_BEFORE_COUNT, foldKeepingIndices(masked)).filter((span) => span.length > 0);
}

/** Numbers written as words (folded forms). "one", "un", "o" and "nouă" are left out: they are also articles or other words. */
export const NUMBER_WORDS: readonly string[] = [
  // English
  'zero', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
  'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty',
  'ninety', 'hundred', 'hundreds', 'thousand', 'thousands', 'million', 'millions', 'billion', 'billions', 'dozen', 'dozens',
  'half', 'twice', 'thrice', 'triple', 'percent', 'per cent', 'percentage',
  // Romanian
  'doi', 'doua', 'trei', 'patru', 'cinci', 'sase', 'sapte', 'zece', 'unsprezece', 'doisprezece', 'douasprezece', 'treisprezece',
  'paisprezece', 'cincisprezece', 'saisprezece', 'saptesprezece', 'optsprezece', 'nouasprezece', 'douazeci', 'treizeci', 'patruzeci',
  'cincizeci', 'saizeci', 'saptezeci', 'optzeci', 'nouazeci', 'suta', 'sute', 'mii', 'milion', 'milioane', 'miliard', 'miliarde',
  'jumatate', 'procent', 'procente', 'dublu', 'triplu',
];

const NUMBER_WORD = wholeWords(NUMBER_WORDS.map((word) => word.replace(/ /g, String.raw`\s+`)));
const PERCENT_SIGN = /[%‰]/gu;

/** Number words and percent signs in `masked` (tokens already masked). */
export function numberWords(masked: string): Span[] {
  const folded = foldKeepingIndices(masked);
  return [...spansOf(NUMBER_WORD, folded), ...spansOf(PERCENT_SIGN, masked)];
}

const T = `${MASK}+`;

/** Two tokens made into a range (folded text with tokens masked). */
const COMPOSED_RANGE = new RegExp(
  [
    String.raw`(?<!${WORD})between\s+${T}\s+and\s+${T}`,
    String.raw`(?<!${WORD})from\s+${T}\s+(?:to|until|through|up to)\s+${T}`,
    String.raw`${T}\s*(?:-|–|—|to|until|through)\s*${T}`,
    String.raw`(?<!${WORD})intre\s+${T}\s+si\s+${T}`,
    String.raw`(?<!${WORD})de la\s+${T}\s+(?:la|pana la)\s+${T}`,
    String.raw`${T}\s+pana la\s+${T}`,
  ].join('|'),
  'gu',
);

/** Ranges composed from tokens. */
export function composedRanges(masked: string): Span[] {
  return spansOf(COMPOSED_RANGE, foldKeepingIndices(masked));
}

/** Arithmetic on tokens, or a ratio after one (folded text with tokens masked). */
const ARITHMETIC = new RegExp(
  [
    String.raw`${T}\s*(?:\+|×|÷|\*|\/|(?<!${WORD})(?:plus|minus|times|x|multiplied by|divided by|ori|impartit la|inmultit cu)(?!${WORD}))\s*${T}`,
    String.raw`${T}\s*(?:\/|(?<!${WORD})(?:per|pe|for each|for every|each|pentru fiecare)(?!${WORD}))\s*\p{L}`,
    String.raw`(?<!${WORD})(?:sum|average|mean|ratio|difference|product|suma|media|raportul|diferenta)\s+(?:of|dintre|a|al)\s+${T}`,
    String.raw`${T}(?:\s*,\s*${T})*\s*(?:and|si)\s+${T}\s+(?:add up to|adds up to|make|makes|give|gives|total|totals|insumeaza|dau)(?!${WORD})`,
  ].join('|'),
  'gu',
);

/** Arithmetic done in text over tokens. */
export function arithmeticInText(masked: string): Span[] {
  return spansOf(ARITHMETIC, foldKeepingIndices(masked));
}
