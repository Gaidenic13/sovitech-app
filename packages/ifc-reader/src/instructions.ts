/**
 * Detecting text that addresses the reader: an embedded instruction (guardrails rule 14).
 *
 * The same detector as the Python extractor's (services/extractor/src/sovitech_extractor/
 * instructions.py), for a model's free text: Name, Description, ObjectType, LongName, text
 * property values and the file header. When a text tries to instruct the AI or the app (to
 * ignore its instructions, to mark values as verified or confirmed, to issue a quotation, or
 * when it speaks to the AI as its reader), the reader reports one `embedded_instruction`
 * finding for the engineer, with a code and a location, never the text (rule 13). A finding
 * creates no candidate, badge, verification or field state; a miss changes nothing either,
 * because document text never sets state.
 *
 * Matching is on a normalised form: lower case, diacritics removed (ș and ş, ț and ţ alike),
 * whitespace collapsed. English and Romanian. ./instructions.test.ts reads the same cases as
 * the Python detector's tests.
 */

/**
 * One code per kind of instruction. The first pattern that matches names the finding. The
 * patterns are regular expressions over the normalised text, word for word the Python
 * detector's; the words they look for are what an instruction in a document says, never app copy.
 */
const PATTERNS: readonly (readonly [string, RegExp])[] = [
  [
    'embedded_instruction.override',
    /\b(?:ignore|disregard|forget|override|bypass)\b[^.;:]{0,40}?\b(?:previous|prior|above|earlier|preceding|all|any|your|the|these|those)\b[^.;:]{0,20}?\b(?:instructions?|prompts?|rules|guidelines|directions|guardrails)\b/,
  ],
  ['embedded_instruction.override', /\b(?:ignora|ignorati|ignorat|ignora-ti|nu tineti cont de|neglijati|uitati)\b[^.;:]{0,40}?\b(?:instructiunile|instructiuni|regulile|reguli|indicatiile|indicatii)\b/],
  [
    'embedded_instruction.set_state',
    /\b(?:mark|set|flag|treat|record|label|consider|tag)\b[^.;:]{0,40}?\b(?:values?|items?|fields?|data|everything|entries|results|figures)\b[^.;:]{0,40}?\b(?:verified|confirmed|approved|validated|checked|certified)\b/,
  ],
  [
    'embedded_instruction.set_state',
    /\b(?:marcati|marcheaza|setati|considerati|tratati|inregistrati|bifati)\b[^.;:]{0,40}?\b(?:valorile|valori|datele|date|toate|elementele|rezultatele)\b[^.;:]{0,40}?\b(?:verificate|verificata|verificat|confirmate|confirmata|aprobate|validate|certificate)\b/,
  ],
  ['embedded_instruction.set_stage', /\b(?:issue|generate|produce|create|send|make)\b[^.;:]{0,30}?\b(?:formal quotation|quotation|firm price|binding offer|final offer)\b/],
  ['embedded_instruction.set_stage', /\b(?:emiteti|generati|trimiteti|faceti|intocmiti)\b[^.;:]{0,30}?\b(?:oferta ferma|oferta finala|cotatie|cotatia|deviz)\b/],
  ['embedded_instruction.addresses_reader', /\b(?:you are|act as|behave as|pretend to be)\b[^.;:]{0,12}?\b(?:an?|the)\b[^.;:]{0,12}?\b(?:ai|assistant|language model|model|chatbot)\b/],
  [
    'embedded_instruction.addresses_reader',
    /\b(?:note|message|instruction|instructions|request)s? (?:for|to) the (?:automated (?:reviewer|system|assistant)|ai|artificial intelligence|assistant|language model|chatbot)\b/,
  ],
  ['embedded_instruction.addresses_reader', /\b(?:system prompt|developer message|as an ai|as a language model)\b/],
];

/** Lower case, diacritics removed, whitespace collapsed: for matching only. */
export function normalise(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/ß/gu, 'ss')
    .replace(/\s+/gu, ' ')
    .trim();
}

/** The finding code when the text addresses the reader, else undefined. */
export function detect(text: string): string | undefined {
  if (text === '') return undefined;
  const normalised = normalise(text);
  return PATTERNS.find(([, pattern]) => pattern.test(normalised))?.[0];
}
