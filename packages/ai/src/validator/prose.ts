/**
 * The prose checks of the output validator, for every piece of text the AI writes
 * (drafted paragraphs, notes, suggestions, and inferred text values): guardrails rule 2
 * (tokens, digits, product names), rule 9 (ranges and arithmetic), 2.8 (reserved terms,
 * with no allowance: "all AI-written text" is flagged, and the app, not the AI, builds
 * every badge, status line and generated sentence), rule 11 (life-safety verbs and
 * compliance claims) and rule 6 (the AI writes no question). F-PROPOSAL-04.
 *
 * The checks read the text as checkedText (text.ts) gives it: compatibility forms as plain
 * letters and digits (NFKC), format characters dropped, and look-alike letters of other
 * scripts as the Latin letters they imitate, so "vеrified" with a Cyrillic "е", "⁸⁰⁰" and
 * "Ⅻ" are read as what they show (phase 2 review, adversarial finding "homoglyphs and
 * number glyphs pass the prose checks"). A word that mixes scripts is refused on its own
 * (`mixed_script`), and a Roman numeral before a counted noun is a number in words. Small
 * capitals and the other Latin letter forms NFKC keeps ("ᴠᴇʀɪꜰɪᴇᴅ") read as ASCII letters, and
 * letter-spaced words ("c o m p l i a n t") are read joined for the reserved terms and numbers
 * in words (phase 2 fix round 3).
 *
 * The result lists each issue with its rule and its position in the text as written; it
 * never quotes the text, so a rejection can be logged (rule 13).
 */
import { NO_ALLOWANCES, RESERVED_TERMS, scanCopy, type ReservedTerm } from '@sovitech/registry/reserved-terms';
import { bacClassClaims, complianceClaims } from './compliance';
import { lifeSafetyControl } from './life-safety';
import { lifeSafetyControlByList } from './life-safety-list';
import { arithmeticInText, composedRanges, digitsOutsideTokens, isUnitPower, numberWords, romanCounts } from './numbers';
import { productReferences, type ProductCatalogue } from './products';
import { checkedText, foldKeepingIndices, joinLetterSpacing, letterStretches, spansOf, type Span } from './text';
import { findTokens, maskSpans, strayBraces } from './tokens';

export const PROSE_RULES = [
  'malformed_token',
  'unknown_token',
  'product_token_not_in_catalogue',
  'digit_outside_token',
  'number_word',
  'composed_range',
  'arithmetic_in_text',
  'reserved_term',
  'product_name_outside_token',
  'life_safety_control',
  'bac_class_claim',
  'compliance_claim',
  'question_text',
  'mixed_script',
] as const;
export type ProseRule = (typeof PROSE_RULES)[number];

export interface ProseIssue {
  readonly rule: ProseRule;
  readonly index: number;
  readonly length: number;
  /** For `reserved_term`: the term as 2.8 spells it. */
  readonly term?: ReservedTerm;
}

export interface ProseContext {
  /** The value and calculation tokens the request offered. None offered: every value or calculation token is unknown. */
  readonly tokens?: ReadonlySet<string>;
  /** The approved SAUTER catalogue; undefined while `dataset-sauter-catalogue` is closed, so every product token is refused. */
  readonly catalogue?: ProductCatalogue;
  /** Document and sheet names the request carries (rule 2's exemption). */
  readonly names?: readonly string[];
  /** Standard identifiers from an approved standards dataset (rule 2's allowlist); none is approved today (build-readiness decision 9). */
  readonly standardIdentifiers?: readonly string[];
}

const QUESTION_MARK = /[?¿;？]/gu;

/** Each reserved term's letters, folded, without spaces: a stretch of spaced letters is read only when a term holds its letters. */
const TERM_LETTERS: readonly string[] = RESERVED_TERMS.map((entry) => foldKeepingIndices(entry.term).replace(/[^\p{L}]/gu, ''));

/** Each issue once per rule and position. */
function once(issues: readonly ProseIssue[]): ProseIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.rule}:${issue.index}:${issue.length}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Where `needle` occurs in `text`, case-sensitive. */
function occurrences(text: string, needle: string): Span[] {
  if (needle === '') return [];
  const spans: Span[] = [];
  for (let index = text.indexOf(needle); index >= 0; index = text.indexOf(needle, index + needle.length)) spans.push({ index, length: needle.length });
  return spans;
}

/** Every issue of one piece of AI-written text, in text order. Empty when it passes. */
export function proseIssues(text: string, context: ProseContext = {}): ProseIssue[] {
  const issues: ProseIssue[] = [];
  const tokens = findTokens(text);
  for (const token of tokens) {
    if (token.kind === 'product') {
      if (context.catalogue === undefined || !context.catalogue.ids.has(token.id)) {
        issues.push({ rule: 'product_token_not_in_catalogue', index: token.index, length: token.length });
      }
    } else if (context.tokens === undefined || !context.tokens.has(token.raw)) {
      issues.push({ rule: 'unknown_token', index: token.index, length: token.length });
    }
  }
  const masked = maskSpans(text, tokens);
  // Every check reads the text as written and as checkedText reads it (NFKC, format characters
  // dropped, look-alike letters as Latin letters), and an issue found in either counts: reading
  // the normalised text only adds findings, never removes one the text as written gives.
  const read = checkedText(masked);
  const exempt = [...(context.names ?? []), ...(context.standardIdentifiers ?? [])];
  const exemptRead = exempt.map((name) => checkedText(name).text);
  const both = (rule: ProseRule, check: (subject: string) => readonly Span[]): void => {
    for (const span of check(masked)) issues.push({ rule, index: span.index, length: span.length });
    for (const span of check(read.text)) issues.push({ rule, ...read.original(span) });
  };
  both('malformed_token', strayBraces);
  // Digits: every numeral (\p{N}: superscripts, circled, dingbat and Roman numeral characters), as written and as NFKC reads it.
  for (const span of digitsOutsideTokens(masked, exempt)) issues.push({ rule: 'digit_outside_token', ...span });
  for (const span of digitsOutsideTokens(read.text, exemptRead)) {
    const written = read.original(span);
    if (!isUnitPower(masked, written)) issues.push({ rule: 'digit_outside_token', ...written });
  }
  both('number_word', numberWords);
  both('number_word', romanCounts);
  both('composed_range', composedRanges);
  both('arithmetic_in_text', arithmeticInText);
  for (const match of scanCopy(masked, { allowances: NO_ALLOWANCES })) issues.push({ rule: 'reserved_term', index: match.index, length: match.length, term: match.term });
  for (const match of scanCopy(read.text, { allowances: NO_ALLOWANCES })) {
    issues.push({ rule: 'reserved_term', ...read.original({ index: match.index, length: match.length }), term: match.term });
  }
  // Letter-spaced words read joined ("c o m p l i a n t", "V. E. R. I. F. I. E. D."): the reserved
  // terms and the numbers in words they spell.
  const spaced = joinLetterSpacing(read.text);
  if (spaced.joined) {
    const back = (span: Span): Span => read.original(spaced.original(span));
    for (const match of scanCopy(spaced.text, { allowances: NO_ALLOWANCES })) {
      issues.push({ rule: 'reserved_term', ...back({ index: match.index, length: match.length }), term: match.term });
    }
    for (const span of numberWords(spaced.text)) issues.push({ rule: 'number_word', ...back(span) });
    // Each stretch of a run joined on its own: a reserved term after a one-letter word ("It is a q u o t e.", "Este o o f e r t ă."),
    // or before another spaced word, is found where the whole run read joined hides it (phase 2 fix round 4).
    for (const variant of letterStretches(read.text, { worthReading: (letters) => TERM_LETTERS.some((term) => term.includes(letters)) })) {
      const { stretch } = variant;
      for (const match of scanCopy(variant.text, { allowances: NO_ALLOWANCES })) {
        if (match.index >= stretch.index + stretch.length || match.index + match.length <= stretch.index) continue;
        issues.push({ rule: 'reserved_term', ...read.original(variant.original({ index: match.index, length: match.length })), term: match.term });
      }
    }
  }
  both('product_name_outside_token', (subject) => productReferences(subject, context.catalogue));
  // Rule 11: the allowlist, and the first reading's list, which it must never let more through than.
  both('life_safety_control', lifeSafetyControl);
  both('life_safety_control', lifeSafetyControlByList);
  both('bac_class_claim', bacClassClaims);
  both('compliance_claim', complianceClaims);
  both('question_text', (subject) => spansOf(QUESTION_MARK, subject));
  both('question_text', (subject) => spansOf(/[?]/gu, subject));
  // A word in two scripts, unless it is a listed document name.
  const names = exemptRead.flatMap((name) => occurrences(read.text, name));
  for (const span of read.mixedScript) {
    if (!names.some((name) => name.index <= span.index && span.index + span.length <= name.index + name.length)) issues.push({ rule: 'mixed_script', ...read.original(span) });
  }
  return once(issues).sort((left, right) => left.index - right.index || PROSE_RULES.indexOf(left.rule) - PROSE_RULES.indexOf(right.rule));
}
