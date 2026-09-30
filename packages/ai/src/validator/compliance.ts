/**
 * Compliance claims in AI text (guardrails rule 11, "Compliance": "Before engineer
 * verification, the wording is 'aims to support BAC class B (EN ISO 52120-1:2021)'. After
 * verification, the app generates 'designed to provide the functions of BAC class B,
 * verified by SOVITECH' from the verification record. The AI never writes it"; "The app
 * never attests compliance"; G11-6).
 *
 * Reserved terms ("compliant", "complies", "meets", "conforms", "achieves class", ...) are
 * refused by the reserved-term check. These two checks cover what the list does not:
 * - a BAC class named with its letter, in a clause that does not say it aims to support
 *   it (so "the design reaches BAC class A" is refused, "aims to support BAC class A"
 *   passes, and the energy certificate's class, which names no BAC class, passes);
 * - a clause that claims compliance with a standard, a law or a class in other words
 *   ("ensures compliance with", "fulfils the requirements of", "respectă normativul").
 * The AI never writes the post-verification sentence, whatever verification is in
 * context: the app builds it from the record.
 */
import { WORD, clauses, foldKeepingIndices, spansOf, wholeWords, type Span } from './text';

const BAC_REFERENCE = wholeWords([
  'bac',
  'bacs',
  String.raw`en\s+iso\s+52120\S*`,
  String.raw`iso\s+52120\S*`,
  String.raw`en\s+15232\S*`,
  String.raw`building\s+automation\s+and\s+control`,
  String.raw`automation\s+class(?:es)?`,
  String.raw`efficiency\s+class(?:es)?`,
  String.raw`clasa\s+(?:de\s+)?(?:eficienta|automatizare)`,
  String.raw`clasa\s+bac`,
]);

const CLASS_LETTER = new RegExp(String.raw`(?<!${WORD})(?:class|clasa|clasei)\s+(?:bac\s+)?[a-d](?![\p{L}\p{N}_+])`, 'gu');

const AIMS_TO_SUPPORT = wholeWords([
  String.raw`aims?\s+to\s+support`,
  String.raw`aimed\s+at\s+supporting`,
  String.raw`isi\s+propune\s+sa\s+sustina`,
  String.raw`urmareste\s+sa\s+sustina`,
  String.raw`vizeaza\s+sa\s+sustina`,
]);

/** BAC classes named without "aims to support" before them in their clause. */
export function bacClassClaims(masked: string): Span[] {
  const folded = foldKeepingIndices(masked);
  const found: Span[] = [];
  for (const clause of clauses(folded)) {
    if (spansOf(BAC_REFERENCE, clause.text).length === 0) continue;
    for (const letter of spansOf(CLASS_LETTER, clause.text)) {
      const before = clause.text.slice(0, letter.index);
      if (spansOf(AIMS_TO_SUPPORT, before).length === 0) found.push({ index: clause.index + letter.index, length: letter.length });
    }
  }
  return found;
}

const COMPLIANCE_WORD = wholeWords([
  'compliance',
  'comply',
  'complying',
  String.raw`satisf(?:y|ies|ied|ying)`,
  String.raw`fulfil(?:s|ls|led|ling)?`,
  String.raw`fulfill(?:s|ed|ing)?`,
  'accordance',
  String.raw`respect(?:a|and|a\s+integral)`,
  String.raw`indeplines(?:te|c)`,
]);

const NORM_REFERENCE = wholeWords([
  'en',
  'iso',
  String.raw`standards?`,
  String.raw`norms?`,
  'law',
  'laws',
  'legea',
  'lege',
  'directive',
  'directiva',
  'epbd',
  String.raw`regulations?`,
  String.raw`regulament\w*`,
  String.raw`normativ\w*`,
  String.raw`codes?`,
  'class',
  'clasa',
  String.raw`requirements?`,
  String.raw`cerint\w*`,
  String.raw`obligations?`,
  String.raw`obligati\w*`,
]);

/** Words that make a clause a question of fact rather than a claim. */
const OPEN_QUESTION = wholeWords(['whether', 'if', String.raw`depends?`, 'unknown', 'daca', String.raw`depinde`, 'necunoscut']);

/** Clauses that claim compliance in words the reserved-term list does not hold. */
export function complianceClaims(masked: string): Span[] {
  const folded = foldKeepingIndices(masked);
  const found: Span[] = [];
  for (const clause of clauses(folded)) {
    if (spansOf(COMPLIANCE_WORD, clause.text).length === 0 || spansOf(NORM_REFERENCE, clause.text).length === 0) continue;
    if (spansOf(OPEN_QUESTION, clause.text).length > 0 || spansOf(AIMS_TO_SUPPORT, clause.text).length > 0) continue;
    found.push({ index: clause.index, length: clause.text.length });
  }
  return found;
}
