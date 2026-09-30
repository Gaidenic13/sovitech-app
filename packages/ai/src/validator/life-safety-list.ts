/**
 * The first reading of rule 11's verbs, kept beside the allowlist (life-safety.ts) so that
 * the validator refuses everything it refused before: a clause that names a life-safety
 * system or the fire context, names the BMS as an actor (not as the object of an
 * override), and carries a control verb after that actor, or a control noun such as
 * "shutdown" anywhere, that no negation earlier in the clause governs.
 *
 * The allowlist lets through some clauses this list refuses ("the BMS monitors whether
 * the fire dampers are open or closed", "the BMS logs when the smoke fans stop"). Letting
 * them through would let more AI text through, a loosening in the sense of guardrails
 * section 10 ("When unsure, treat the change as loosening"), so both run and either
 * refuses; the build log's proposal P-2-LS-READ-COMPLEMENTS asks the approver whether the
 * allowlist alone may decide. The word lists below are the ones this reading shipped with,
 * unchanged.
 */
import { WORD, clauses, foldKeepingIndices, spansOf, wholeWords, type Span } from './text';
import { maskSpans } from './tokens';

const LIFE_SAFETY_TERMS: readonly string[] = [
  'fire', 'fires', 'fire alarm', 'fire alarms', 'fire mode', 'fire detection', 'smoke', 'smoke control', 'smoke extraction',
  'desfumare', 'desfumarii', 'fire damper', 'fire dampers', 'smoke damper', 'smoke dampers', 'fire and smoke dampers',
  'sprinkler', 'sprinklers', 'fire pump', 'fire pumps', 'pressurisation', 'pressurization', 'stair pressurisation',
  'evacuation', 'evacuation lighting', 'escape lighting', 'emergency lighting', 'emergency luminaire', 'emergency luminaires',
  'fire-fighter lift', 'fire-fighter lifts', 'firefighter lift', 'firefighter lifts', 'fire lift', 'fire lifts',
  'gas detection', 'gas shut-off', 'gas shutoff', 'door release', 'door releases',
  'incendiu', 'incendiului', 'incendii', 'alarma de incendiu', 'mod incendiu', 'modul incendiu', 'fum', 'fumului',
  'clapeta antifoc', 'clapete antifoc', 'presurizare', 'presurizarea', 'evacuare', 'iluminat de siguranta', 'iluminat de urgenta',
  'iluminat de evacuare', 'lift de pompieri', 'liftul de pompieri', 'detectie gaz', 'detectie de gaz', 'deblocare usi',
];

const BMS_TERMS: readonly string[] = [
  'bms', 'bacs', 'building management system', 'building management', 'building automation', 'building automation system',
  'automation station', 'automation stations', 'automation system', 'ddc', 'sistemul bms', 'sistem bms',
  'sistemul de management al cladirii', 'sistemul de automatizare', 'automatizarea cladirii',
];

const CONTROL_PATTERNS: readonly string[] = [
  String.raw`stops?`, 'stopped', 'stopping', String.raw`shuts?`, 'shutting', String.raw`shut-?down`, String.raw`shut-?downs`,
  String.raw`switch(?:es|ed|ing)?\s+(?:off|on|over|to)`, String.raw`switch-?off`, String.raw`turns?\s+(?:off|on)`, String.raw`turned\s+(?:off|on)`,
  String.raw`clos(?:e|es|ed|ing|ure)`, String.raw`open(?:s|ed|ing)?`, String.raw`start(?:s|ed|ing|-?up)?`, String.raw`restart\w*`,
  String.raw`command\w*`, String.raw`reset\w*`, String.raw`inhibit\w*`, String.raw`delay\w*`, String.raw`overrid\w*`,
  String.raw`control(?:s|led|ling)?`, String.raw`trigger\w*`, String.raw`activat\w*`, String.raw`deactivat\w*`, String.raw`actuat\w*`,
  String.raw`releas\w*`, String.raw`isolat\w*`, String.raw`disabl\w*`, String.raw`enabl\w*`, String.raw`silenc\w*`, String.raw`cuts?\s+off`,
  String.raw`operat(?:e|es|ed|ing)`, String.raw`sequenc\w*`,
  String.raw`opreste`, String.raw`opri\w*`, String.raw`inchide\w*`, String.raw`inchid\w*`, String.raw`deschide\w*`, String.raw`porneste`,
  String.raw`porni\w*`, String.raw`comand\w*`, String.raw`reseteaz\w*`, String.raw`inhib\w*`, String.raw`intarzi\w*`, String.raw`controleaz\w*`,
  String.raw`declanseaz\w*`, String.raw`activeaz\w*`, String.raw`dezactiveaz\w*`, String.raw`actioneaz\w*`, String.raw`elibereaz\w*`,
  String.raw`izoleaz\w*`,
];

const CONTROL_NOUN_PATTERNS: readonly string[] = [
  String.raw`shut-?downs?`, String.raw`switch-?offs?`, String.raw`closures?`, String.raw`start-?ups?`, 'override', 'inhibition',
  'activation', 'deactivation', 'actuation', 'isolation', String.raw`stop\s+commands?`, String.raw`oprirea?`, String.raw`inchiderea?`,
  String.raw`pornirea?`, String.raw`resetarea?`,
];

const LIFE_SAFETY = wholeWords(LIFE_SAFETY_TERMS.map((term) => term.replace(/ /g, String.raw`\s+`)));
const BMS = wholeWords(BMS_TERMS.map((term) => term.replace(/ /g, String.raw`\s+`)));
const CONTROL = wholeWords(CONTROL_PATTERNS);
const CONTROL_NOUN = wholeWords(CONTROL_NOUN_PATTERNS);

const BMS_AS_OBJECT = new RegExp(
  String.raw`(?<!${WORD})(?:overrid\w*|over|than|bypass\w*|without|independent(?:ly)?\s+of|regardless\s+of)\s+(?:the\s+)?$`,
  'u',
);

const NEGATION = new RegExp(
  String.raw`(?<!${WORD})(?:never|not|no|cannot|can't|cant|don't|dont|doesn't|doesnt|won't|wont|without|nu|niciodata|fara)(?!${WORD})`,
  'gu',
);

const CONTRAST = new RegExp(String.raw`(?<!${WORD})(?:but|however|yet|although|dar|insa|ci)(?!${WORD})`, 'u');

function negated(clauseBefore: string): boolean {
  const negations = spansOf(NEGATION, clauseBefore);
  const last = negations.at(-1);
  return last !== undefined && !CONTRAST.test(clauseBefore.slice(last.index + last.length));
}

/** Clauses of `masked` (tokens masked) in which the BMS takes a life-safety control action, by the first reading's lists. */
export function lifeSafetyControlByList(masked: string): Span[] {
  const folded = foldKeepingIndices(masked);
  const found: Span[] = [];
  for (const clause of clauses(folded)) {
    const lifeSafetySpans = spansOf(LIFE_SAFETY, clause.text);
    const actors = spansOf(BMS, clause.text).filter((mention) => !BMS_AS_OBJECT.test(clause.text.slice(0, mention.index)));
    if (lifeSafetySpans.length === 0 || actors.length === 0) continue;
    const withoutSystems = maskSpans(clause.text, lifeSafetySpans);
    const firstActor = Math.min(...actors.map((mention) => mention.index));
    const verbs = spansOf(CONTROL, withoutSystems).filter((verb) => verb.index > firstActor && !negated(withoutSystems.slice(0, verb.index)));
    const nouns = spansOf(CONTROL_NOUN, withoutSystems).filter((noun) => !negated(withoutSystems.slice(0, noun.index)));
    if (verbs.length > 0 || nouns.length > 0) found.push({ index: clause.index, length: clause.text.length });
  }
  return found;
}
