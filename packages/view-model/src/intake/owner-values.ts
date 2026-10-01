/**
 * The owner's typed or chosen value, read against its field before anything is stored (guardrails
 * 2.1, 2.7, rule 8; US-REVIEW-07 AC6, US-INTAKE-17 AC7; F-VALUE-05): a choice among the field's
 * registered options, a text, or a quantity typed as text and read by the one rule 8 parser with the
 * dimension check. An entry that reads two ways ("1.500") is refused `number_ambiguous`, never
 * stored as one reading (rule 8, "Ambiguous readings keep both ... It is never silently read one
 * way"; G8-21); a unit of another dimension is refused `unit_mismatch` (2.7; G8-4); a field that
 * requires a qualifier takes one of its registered qualifiers or is refused `qualifier_required`; an
 * area, a volume or a length below zero is refused `answer_invalid` (rule 8, units and meaning
 * explicit: such a quantity measures a size, which is never negative; G8-22), while zero and very
 * large values stay the plausibility check's (rule 8, "Please check"; D-93). A typed quantity keeps
 * its entry exactly as written (rule 8: "plus the original text exactly as written"; G8-23). Owner
 * text that would not be stored or shown as typed, or that shows nothing, is refused (G2-13, G7-9).
 */
import type { OwnerValue } from '@sovitech/domain';
import { checkQuantityUnit, parseNumber, parseQuantityText, unitByCode } from '@sovitech/registry';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import { holdsRefusedOwnerTextCharacter, isBlankOwnerText, type AnswerValue } from '../browser/contract';
import { IntakeRefusal } from './model';

/** The owner's value as the field takes it (the domain's `OwnerValue`), or a refusal the API answers with its code. */
export function parseOwnerAnswer(field: RegistryFieldDefinition, value: AnswerValue): OwnerValue {
  switch (value.kind) {
    case 'choice': {
      if (field.kind !== 'enum' && field.kind !== 'decision') throw new IntakeRefusal('answer_invalid', `${field.key} takes no choice`);
      if (!(field.options ?? []).includes(value.choice)) throw new IntakeRefusal('answer_invalid', `${field.key} lists no option ${value.choice}`);
      return { choice: value.choice };
    }
    case 'text':
      return { text: ownerText(field, value.text) };
    case 'quantity':
      return { quantity: parseOwnerQuantity(field, value.raw, value.qualifier), original: { text: value.raw } };
  }
}

/** The dimensions whose quantities measure a size, which is never below zero (rule 8's "Area, volume, length"; G8-22). */
const NEVER_NEGATIVE_DIMENSIONS: ReadonlySet<string> = new Set(['area', 'volume', 'length']);

/**
 * The owner's text as a text field stores it, the one reading of owner text (parseOwnerAnswer's text
 * branch, and project creation, which builds its answers through parseOwnerAnswer too): refused
 * `answer_invalid` when it holds a character that would not be stored or shown as typed (control
 * characters, NUL among them; lone surrogates; bidirectional embedding, override and isolate controls:
 * G2-13), or when it shows nothing (only white space or characters that show as nothing: G7-9); runs of
 * white space read as one space, and the ends are trimmed. Romanian diacritics and every other letter pass.
 */
export function ownerText(field: RegistryFieldDefinition, raw: string): string {
  if (field.kind !== 'text') throw new IntakeRefusal('answer_invalid', `${field.key} takes no text answer`);
  if (holdsRefusedOwnerTextCharacter(raw)) throw new IntakeRefusal('answer_invalid', `${field.key}: the text holds a character that is not stored as typed (rule 2)`);
  const text = raw.replace(/\s+/gu, ' ').trim();
  if (isBlankOwnerText(text)) throw new IntakeRefusal('answer_invalid', `${field.key}: the text shows nothing`);
  return text;
}

function parseOwnerQuantity(field: RegistryFieldDefinition, raw: string, qualifier: string | undefined): NonNullable<OwnerValue['quantity']> {
  if ((field.kind !== 'quantity' && field.kind !== 'count') || field.unit === undefined) {
    throw new IntakeRefusal('answer_invalid', `${field.key} takes no quantity`);
  }
  if (qualifier !== undefined && !(field.qualifiers ?? []).includes(qualifier)) {
    throw new IntakeRefusal('answer_invalid', `${field.key} registers no qualifier ${qualifier}`);
  }
  if (qualifier === undefined && field.qualifierRequired === true) {
    throw new IntakeRefusal('qualifier_required', `${field.key} needs what it measures stated (rule 8)`);
  }
  // The entry is kept as written (G8-23), so it may hold nothing the store cannot hold or would show otherwise (G2-13).
  if (holdsRefusedOwnerTextCharacter(raw)) throw new IntakeRefusal('answer_invalid', `${field.key}: the entry holds a character that is not stored as typed`);
  const text = raw.normalize('NFC').trim();
  const withUnit = /\d\s*[^\d\s.,]/u.test(text);
  let unit = field.unit;
  let readings: readonly { readonly value: number }[];
  let ambiguous: boolean;
  let approximate: boolean;
  if (withUnit) {
    const parsed = parseQuantityText(text);
    if (!parsed.ok) throw new IntakeRefusal(parsed.reason === 'unit_unknown' ? 'unit_mismatch' : 'answer_invalid', `${field.key}: the entry does not read as a quantity`);
    const [first] = parsed.readings;
    if (first === undefined) throw new IntakeRefusal('answer_invalid', `${field.key}: the entry does not read as a quantity`);
    unit = first.unit;
    readings = parsed.readings;
    ambiguous = parsed.ambiguous;
    approximate = parsed.approximate;
  } else {
    const parsed = parseNumber(text);
    if (!parsed.ok) throw new IntakeRefusal('answer_invalid', `${field.key}: the entry does not read as a number`);
    readings = parsed.readings;
    ambiguous = parsed.ambiguous;
    approximate = parsed.approximate;
  }
  if (ambiguous || readings.length !== 1) throw new IntakeRefusal('number_ambiguous', `${field.key}: the entry reads two ways (rule 8)`);
  const check = checkQuantityUnit(field, { unit });
  if (!check.ok) throw new IntakeRefusal('unit_mismatch', `${field.key}: ${check.reason}`);
  const [reading] = readings;
  if (reading === undefined) throw new IntakeRefusal('answer_invalid', `${field.key}: the entry does not read as a number`);
  if (field.kind === 'count' && !(Number.isInteger(reading.value) && reading.value >= 0)) {
    throw new IntakeRefusal('answer_invalid', `${field.key}: a count is a whole number of zero or more`);
  }
  const dimension = unitByCode(unit)?.dimension;
  if (dimension !== undefined && NEVER_NEGATIVE_DIMENSIONS.has(dimension) && reading.value < 0) {
    throw new IntakeRefusal('answer_invalid', `${field.key}: a quantity of ${dimension} is never below zero (rule 8)`);
  }
  return {
    value: reading.value,
    unit,
    ...(qualifier === undefined ? {} : { qualifier }),
    ...(approximate ? { approximate: true } : {}),
  };
}
