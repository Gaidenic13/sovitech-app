/**
 * Life-safety verbs in AI text (guardrails rule 11: "The BMS may monitor their status
 * and alarms. It never commands, resets, inhibits, delays or overrides them"; "Any action
 * triggered by a fire alarm, or affecting smoke control, dampers, pressurisation,
 * evacuation lighting or lifts in fire mode, counts as life-safety control. ... the only
 * allowed verbs are monitor, display, log and alarm"; "The fire system reacts, not the
 * BMS"; "Enforced by: The AI output validator. It checks life-safety verbs"; G11-2).
 *
 * An allowlist, not a list of forbidden verbs (phase 2 review, adversarial finding "the
 * rule 11 life-safety check is inverted": the passive "the AHUs are shut down by the BMS",
 * nominalisations, Romanian forms and verbs off the list all passed). A clause is checked
 * when both hold:
 * - it mentions the BMS in any position: as the one acting, as the agent or instrument of
 *   a passive ("by the BMS", "via the BMS", "prin BMS", "de sistemul BMS"), in a compound
 *   ("BMS-controlled"), as the object of another actor, in a negation, through "it" when
 *   the BMS was the last actor, or after a colon that follows the BMS ("BMS logic: ...");
 * - it names a life-safety system or the fire context, or its sentence does (a clause
 *   qualified as normal mode does not inherit it from its sentence; a sentence that starts
 *   with "then", "it" or the like inherits it from the sentence before).
 * In a checked clause every action word must be a read verb (monitor, display, show, log,
 * record, read, receive, alarm, raise an alarm, and their Romanian forms), be governed by
 * a negation, or be given to the fire system or a hardwired interlock: as the one acting
 * ("the fire system stops the AHUs"), or as the agent of a passive ("are stopped by the
 * fire system"). A clause with any other action word is refused whole.
 *
 * Action words are found four ways: a list of control verbs and nouns in English and
 * Romanian; position (the word after the BMS as subject, after a modal or "to", the
 * participle after a form of "be", a verb ending in -s before its object, a Romanian
 * verb ending); and, for words ending in -ed or -ing that are on no list, only when the
 * BMS is named as their agent. The check reads words and fails closed on doubt; the
 * reasons it gives are positions only (rule 13).
 *
 * Provision, scope and charge (phase 2 fix round 3, the verifier's finding "rule 11
 * residuals": "Smoke extraction is provided by the BMS.", "Desfumarea se face prin BMS.",
 * "Smoke control is the job of the BMS.", "The BMS includes smoke control.", "Smoke control is
 * part of the BMS." and "Fire dampers: BMS." passed). In a checked clause:
 * - a verb of provision or doing ("provided", "ensures", "looks after", "does", "se face",
 *   "se asigură", "revine", "ține de") and a verb of scope ("includes", "covers", "integrated
 *   into") are an action unless the fire system is their actor, or every life-safety
 *   function the clause names is a read ("the fire damper status", "monitoring of the smoke
 *   fans", "for monitoring"); the fire context alone ("fire mode", "fire alarm") is no function.
 *   That exception holds only where the word is not already an action by position (above): the
 *   word after the BMS as subject, after a modal or "to", a participle after a form of "be"
 *   that is not on the adjective list, or an -s verb before an article is an action whatever it
 *   provides, unless it is a read verb or one of the first version's verbs of scope (include,
 *   contain, comprise, cover, list). So "Monitoring of the smoke fans is provided by the BMS.",
 *   "The fire damper status is provided by the BMS." and "The BMS includes monitoring of the
 *   smoke fans." pass, while "The BMS provides monitoring of the smoke fans.", "The BMS provides
 *   the fire damper status.", "The BMS will provide monitoring of the smoke fans." and
 *   "Monitoring of the smoke fans is ensured by the BMS." are refused (proposal
 *   P-2-LS-PROVISION-OF-READS asks the approver whether they may pass);
 * - a noun of scope held by the BMS ("part of the BMS", "face parte din BMS") is an action on
 *   the same terms, and a noun of charge held by the BMS ("the job of the BMS", "a BMS
 *   function", "în sarcina BMS") unless a read verb fills it ("the role of the BMS is to
 *   monitor");
 * - a clause that has the BMS as a party (not overridden, not negated) must also say what it
 *   may do: a read word or status noun, a negation of its part, the fire system's reaction,
 *   or a connection of reads only ("the fire alarm panel is connected to the BMS"). A verbless
 *   pairing ("Fire dampers: BMS.", "Smoke extraction via BMS.", "BMS smoke extraction.") and a
 *   verb on no list with no read beside it ("Smoke control falls within the BMS.") are refused.
 *   Clauses joined by a colon answer for each other ("BMS: monitoring of the fire dampers").
 * These only add refusals: a clause the check refused before is still refused.
 *
 * The wide reading (phase 2 fix round 4, the verifier's findings "the check recognises the
 * BMS only by its listed names" and "the residual is broader than its examples": "The B.M.S.
 * shuts down the AHUs on fire alarm.", "The BAS ...", "GTC oprește desfumarea.", "The BMS covers
 * HVAC and lighting. This system also provides smoke extraction.", "The BMS monitors the fire
 * alarm; from there, operators start smoke extraction." and "Fire dampers move on a signal from
 * the BMS." passed). `lifeSafetyControl` reads each text twice and refuses a clause that either
 * reading refuses: the plain reading is the check above, unchanged; the wide reading also reads
 * - the BMS written letter by letter, dotted, spaced or hyphenated ("B.M.S.", "B M S", "B-M-S";
 *   and BAS, BEMS, BACS, GTC and DDC so written) as the acronym, and any other letter-spaced word
 *   read joined in place ("are s t o p p e d by the BMS");
 * - the BMS's other names (BMS_OTHER_NAMES: BAS, BEMS, GTC, SCADA, "building controls", "controls
 *   system", "head-end", "sistem(ul) de control / de automatizare / de management al clădirii",
 *   "gestiunea tehnică a clădirii", "tablourile de automatizare"), and generic names of its parts
 *   ("controllers", "automation", "controlerele") where no fire-system or life-safety name holds
 *   them ("the fire controllers" stay the fire system's), a name followed by the life-safety
 *   function it serves being that system's ("the automation panel for smoke extraction");
 * - "this system", "that system", "the same system", "the system", "acest sistem", "același
 *   sistem" as the last actor, as "it" is read;
 * - a clause that names no BMS but refers back to it, through "its" (not "its own", which stands
 *   for the clause's own subject) or "there"/"from there"/"acolo" (not "there is") while the BMS is
 *   the last actor ("smoke extraction is then started from its workstation"): its control verbs
 *   on the lists, its nouns of control held through "its", and its words of provision, scope,
 *   charge and signal are checked as in a clause that names the BMS (not its verbs found only by
 *   position, and not the rule that the BMS as a party must say what it may do);
 * - a signal, output or instruction from the BMS ("on a signal from the BMS", "a BMS output",
 *   "semnal de la BMS") in a clause that names a life-safety function that is not a read and has
 *   no read verb: control, whoever carries it out;
 * - "move" as a control verb (rule 11's own "dampers moving"); "follows", "follows from", "results
 *   from", "comes from", "happens", "occurs", "takes place", "goes ahead", "proceeds" and "done"
 *   as verbs of provision; "concern", "business", "affair" and the like as nouns of charge, also
 *   when the BMS holds them through "its" ("smoke extraction is its concern");
 * - a life-safety name with a predicate of its own after a finite read verb and "and" ("The BMS
 *   monitors the fire alarm and smoke extraction is its business.") as a clause of its own, not
 *   as the read verb's object.
 *
 * Residual (each run in scratchpad build/fix4/ai, and still accepted):
 * - a verb on no list, in no verb position, beside a read: "The BMS logs the fire alarm and then
 *   smoke extraction kicks in.";
 * - in a clause that names the BMS only through "its" or "there", a verb on no list found only by
 *   its position, or a noun of charge on no list: "The BMS monitors the fire alarm; smoke
 *   extraction is arranged from its workstation.", "The BMS covers HVAC. Smoke extraction is also
 *   arranged there.", "The BMS monitors the fire alarm; smoke extraction is its call.";
 * - Romanian possessives, which fold into "sau" ("or") and "sa" ("să"): "BMS-ul monitorizează
 *   alarma de incendiu; desfumarea este sarcina sa.";
 * - a name of the BMS that no list holds: "The plant controls stop the AHUs on fire alarm.".
 * The other way, "its" or "there" that stands for something else while the BMS was the last
 * actor is read as the BMS: a refusal, never a pass. The model-behaviour evals G11-1 and G11-4
 * are the second layer; they are not running while no API key is set.
 *
 * Also passed: verbs of scope over reads ("the BMS point list includes a fire-alarm input"),
 * nouns of control nobody gives to the BMS ("fire logic stays in the fire system"), a status
 * word before a status noun ("the open/closed position") and what a read verb reports ("logs
 * when the smoke fans stop"). The first reading's list (life-safety-list.ts) runs beside
 * this check and still refuses the last two, so the validator refuses everything it
 * refused before (guardrails section 10; build log, proposal P-2-LS-READ-COMPLEMENTS).
 */
import { WORD, foldKeepingIndices, joinLetterSpacingInPlace, spansOf, wholeWords, type Span } from './text';

// ---------------------------------------------------------------------------
// Word lists (folded: lower case, no diacritics)
// ---------------------------------------------------------------------------

/** Life-safety systems and the fire context, English and Romanian, with the Romanian inflections. */
export const LIFE_SAFETY_TERMS: readonly string[] = [
  'fire', 'fires', 'fire alarm', 'fire alarms', 'fire mode', 'fire detection', 'fire safety', 'life safety', 'life-safety', 'smoke',
  'smoke control', 'smoke extraction', 'smoke exhaust', 'smoke ventilation', 'smoke vent', 'smoke vents', 'smoke fan', 'smoke fans',
  'fire damper', 'fire dampers', 'smoke damper', 'smoke dampers', 'fire and smoke dampers', 'fire door', 'fire doors', 'fire shutter',
  'fire shutters', 'fire curtain', 'fire curtains', 'sprinkler', 'sprinklers', 'fire pump', 'fire pumps', 'fire fighting', 'fire-fighting',
  'firefighting', 'pressurisation', 'pressurization', 'stair pressurisation', 'evacuation', 'evacuation lighting', 'escape lighting',
  'emergency lighting', 'emergency luminaire', 'emergency luminaires', 'escape route', 'escape routes', 'fire-fighter lift',
  'fire-fighter lifts', 'firefighter lift', 'firefighter lifts', 'fire lift', 'fire lifts', 'gas detection', 'gas shut-off', 'gas shutoff',
  'door release', 'door releases',
  // Romanian
  'desfumare', 'desfumarea', 'desfumarii', 'desfumarile', 'incendiu', 'incendiul', 'incendiului', 'incendii', 'incendiilor', 'foc', 'focului',
  'alarma de incendiu', 'alarma la incendiu', 'mod incendiu', 'modul incendiu', 'modul de incendiu', 'fum', 'fumul', 'fumului', 'antifoc',
  'clapeta antifoc', 'clapete antifoc', 'clapetele antifoc', 'clapetei antifoc', 'clapetelor antifoc', 'clapeta de fum', 'clapete de fum',
  'clapetele de fum', 'clapetelor de fum', 'sprinkler', 'sprinklere', 'sprinklerele',
  'sprinklerul', 'sprinklerului', 'sprinklerelor', 'presurizare', 'presurizarea', 'presurizarii', 'evacuare', 'evacuarea', 'evacuarii',
  'iluminat de siguranta', 'iluminatul de siguranta', 'iluminat de urgenta', 'iluminatul de urgenta', 'iluminat de evacuare',
  'iluminatul de evacuare', 'lift de pompieri', 'liftul de pompieri', 'ascensor de pompieri', 'detectie gaz', 'detectie de gaz',
  'detectia de gaz', 'detectie gaze', 'deblocare usi', 'deblocarea usilor', 'stingere', 'stingerea', 'hidranti', 'pompieri',
];

/** The BMS, English and Romanian (a Romanian enclitic article, "BMS-ul", is part of the mention). */
export const BMS_TERMS: readonly string[] = [
  String.raw`bms(?:-ul(?:ui)?)?`, 'bacs', 'building management systems?', 'building management', 'building automation',
  'building automation systems?', 'automation stations?', 'automation systems?', 'ddc', 'sistemul bms', 'sistemului bms', 'sistem bms',
  'sistemul de management al cladirii', 'sistemului de management al cladirii', 'sistemul de automatizare', 'sistemului de automatizare',
  'automatizarea cladirii',
];

/**
 * Other names of the BMS, read by the wide reading only (phase 2 fix round 4, the verifier's
 * finding "the check recognises the BMS only by its listed names": "The BAS shuts down the AHUs
 * on fire alarm." and "GTC oprește desfumarea." passed). Romanian "GTC" is "gestiunea tehnică a
 * clădirii".
 */
export const BMS_OTHER_NAMES: readonly string[] = [
  'bas', 'bems', 'gtc', 'scada', 'building controls', String.raw`building controls? systems?`, String.raw`controls systems?`,
  String.raw`head-?ends?`, String.raw`head\s+ends?`, String.raw`automation\s+(?:panels?|controllers?|outstations?|servers?)`,
  String.raw`sovitech\s+(?:controls|systems?|automation)`,
  String.raw`sistem(?:ul|ului)?\s+de\s+control\s+al\s+cladirii`, String.raw`sistem(?:ul|ului)?\s+de\s+automatizare`,
  String.raw`sistem(?:ul|ului)?\s+de\s+management\s+al\s+cladirii`, String.raw`sistem(?:ul|ului)?\s+de\s+gestiune\s+tehnica\s+a\s+cladirii`,
  String.raw`gestiun(?:ea|ii|e)\s+tehnic(?:a|e|ii)\s+a\s+cladirii`, String.raw`tablou(?:l|lui|ri|rile|rilor)?\s+de\s+automatizare`,
  'automatizarea', 'automatizarii',
];

/**
 * Generic names of the BMS's parts, read by the wide reading as the BMS only where no
 * fire-system or life-safety name holds the words ("the controllers stop the AHUs", not "the fire
 * controllers"), and not where the life-safety function they serve follows them ("the automation
 * panel for smoke extraction" is that system's).
 */
export const BMS_GENERIC_NAMES: readonly string[] = [
  String.raw`controllers?`, 'automation', 'the controls', String.raw`controler(?:ul|ului|e|ele|elor)?`,
];

/** Words that stand for the last actor, as "it" does, in the wide reading ("The BMS covers HVAC. This system also ..."). */
export const SYSTEM_ANAPHORS: readonly string[] = [
  'this system', 'that system', 'the same system', 'this same system', 'the said system', 'the system', 'acest sistem', 'acelasi sistem',
  'sistemul acesta', 'sistemul respectiv', 'respectivul sistem',
];

/** Acronyms of the BMS that the wide reading also reads written letter by letter ("B.M.S.", "B M S", "B-M-S"). */
const SPELLED_ACRONYMS: readonly string[] = ['bms', 'bas', 'bems', 'bacs', 'gtc', 'ddc'];

/** The fire system and hardwired interlocks: the ones rule 11 gives the reaction to. */
export const FIRE_SYSTEM_TERMS: readonly string[] = [
  'fire systems?', 'fire alarm systems?', 'fire detection systems?', 'fire detection and alarm systems?', 'fire alarm and detection systems?',
  'fire safety systems?', 'fire alarm panels?', 'fire alarm control panels?', 'fire panels?', 'fire control panels?', 'fire controllers?',
  'fire relays?', 'hardwired interlocks?', 'hard-wired interlocks?', 'hardwired relays?', 'hardwired connections?', 'interlocks?',
  'sprinkler systems?', 'sistemul de incendiu', 'sistemului de incendiu', 'sistemul de detectie si alarmare la incendiu',
  'sistemul de detectie si alarmare incendiu', 'sistemul de detectie incendiu', 'sistemul de detectie la incendiu', 'sistemul de semnalizare incendiu',
  'sistemul de semnalizare a incendiului', 'sistemului de semnalizare a incendiului', 'centrala de incendiu', 'centrala de detectie incendiu',
  'centrala de semnalizare incendiu', 'centrala de detectie si alarmare la incendiu', 'interblocare cablata', 'interblocarea cablata',
  'interblocari cablate', 'interblocarile cablate', 'interblocari', 'interblocarile', 'interblocare',
];

/** Control verbs and nouns beyond monitor, display, log and alarm (patterns over folded text). */
export const CONTROL_PATTERNS: readonly string[] = [
  String.raw`stops?`, 'stopped', 'stopping', String.raw`shuts?`, 'shutting', String.raw`shut-?down`, String.raw`shut-?downs`,
  String.raw`switch(?:es|ed|ing)?`, String.raw`switch-?offs?`, String.raw`turns?\s+(?:off|on)`, String.raw`turned\s+(?:off|on)`,
  String.raw`clos(?:e|es|ed|ing|ure|ures)`, String.raw`open(?:s|ed|ing)?`, String.raw`start(?:s|ed|ing|-?ups?)?`, String.raw`restart\w*`,
  String.raw`command\w*`, String.raw`reset\w*`, String.raw`inhibit\w*`, String.raw`delay\w*`, String.raw`overrid\w*`, String.raw`overrode`,
  String.raw`control(?:s|led|ling)?`, String.raw`trigger\w*`, String.raw`activat\w*`, String.raw`deactivat\w*`, String.raw`actuat\w*`,
  String.raw`releas\w*`, String.raw`isolat\w*`, String.raw`disabl\w*`, String.raw`enabl\w*`, String.raw`silenc\w*`, String.raw`cuts?`, 'cutting',
  String.raw`operat(?:e|es|ed|ing|ion|ions)`, String.raw`sequenc\w*`, String.raw`manag\w*`, String.raw`handl\w*`, String.raw`driv(?:e|es|en|ing)`,
  'drove', String.raw`runs?`, 'ran', 'running', String.raw`sets?`, 'setting', String.raw`puts?`, 'putting', String.raw`takes?`, 'took', 'taken',
  'taking', String.raw`bring\w*`, 'brought', String.raw`cycl(?:e|es|ed|ing)`, String.raw`modulat\w*`, String.raw`adjust\w*`, String.raw`regulat\w*`,
  String.raw`govern\w*`, String.raw`coordinat\w*`, String.raw`supervis\w*`, String.raw`trips?`, 'tripped', 'tripping', String.raw`halt\w*`,
  String.raw`paus\w*`, String.raw`suspend\w*`, String.raw`dump\w*`, String.raw`purg\w*`, String.raw`energi[sz]\w*`, String.raw`de-?energi[sz]\w*`,
  String.raw`kill\w*`, String.raw`lock\w*`, String.raw`unlock\w*`, String.raw`interrupt\w*`, String.raw`terminat\w*`, String.raw`execut\w*`,
  String.raw`perform\w*`, String.raw`initiat\w*`, String.raw`launch\w*`, 'offline', 'online', 'takeover', String.raw`take-?over`,
  // Romanian
  'opreste', String.raw`opri\w*`, String.raw`inchide\w*`, String.raw`inchid\w*`, String.raw`deschide\w*`, String.raw`deschid\w*`, 'porneste',
  String.raw`porni\w*`, String.raw`comand\w*`, String.raw`reseteaz\w*`, String.raw`reseta\w*`, String.raw`inhib\w*`, String.raw`intarzi\w*`,
  String.raw`controleaz\w*`, String.raw`controlul\w*`, String.raw`declanseaz\w*`, String.raw`declans\w*`, String.raw`activeaz\w*`, String.raw`activar\w*`,
  String.raw`dezactiv\w*`, String.raw`actioneaz\w*`, String.raw`actionar\w*`, String.raw`elibereaz\w*`, String.raw`eliber\w*`, String.raw`izoleaz\w*`,
  String.raw`gestion\w*`, String.raw`administr\w*`, String.raw`comut\w*`, String.raw`regleaz\w*`, String.raw`reglar\w*`, String.raw`manevr\w*`,
  String.raw`seteaz\w*`, 'pune', 'pun', String.raw`ruleaz\w*`, 'preia', 'preiau', String.raw`prelu\w*`, 'trece', 'trec', String.raw`trecer\w*`,
  String.raw`decupl\w*`, String.raw`blocheaz\w*`, String.raw`blocar\w*`, String.raw`debloc\w*`,
];

/**
 * Nouns of control that are an action only when the BMS holds them ("the BMS logic", "the
 * BMS has priority", "responsibility of the BMS"): "fire logic stays in the fire system" is
 * not one.
 */
export const CONTROL_NOUN_PATTERNS: readonly string[] = [
  'logic', String.raw`responsib\w*`, 'charge', 'authority', 'priority', 'precedence', String.raw`logica\w*`, String.raw`prioritat\w*`,
  String.raw`responsabil\w*`,
];

/** Read verbs: what rule 11 lets the BMS do ("monitor, display, log and alarm", and "shows" as the rule itself says). */
export const READ_WORDS: ReadonlySet<string> = new Set([
  'monitor', 'monitors', 'monitored', 'monitoring', 'display', 'displays', 'displayed', 'displaying', 'show', 'shows', 'showed', 'shown',
  'showing', 'log', 'logs', 'logged', 'logging', 'record', 'records', 'recorded', 'recording', 'read', 'reads', 'reading', 'receive',
  'receives', 'received', 'receiving', 'alarm', 'alarms', 'alarmed', 'alarming',
  'monitorizeaza', 'monitorizeze', 'monitoriza', 'monitorizare', 'monitorizarea', 'monitorizat', 'monitorizata', 'monitorizate', 'monitorizati',
  'monitorizand', 'afiseaza', 'afiseze', 'afisa', 'afisare', 'afisarea', 'afisat', 'afisata', 'afisate', 'afisati', 'afisand', 'arata', 'arate',
  'aratat', 'aratata', 'aratate', 'aratand', 'inregistreaza', 'inregistreze', 'inregistra', 'inregistrare', 'inregistrarea', 'inregistrat',
  'inregistrata', 'inregistrate', 'inregistrand', 'jurnalizeaza', 'citeste', 'citesc', 'citit', 'citita', 'citite', 'primeste', 'primesc',
  'primit', 'primita', 'primite', 'alarmeaza', 'alarmeze', 'alarma', 'alarmare', 'alarmat', 'alarmata', 'alarmate', 'semnalizeaza', 'semnalizare',
]);

/**
 * Verbs of scope that the first version of this check read as no action at all ("the BMS
 * point list includes a fire-alarm input"). They are still never an action by position, and
 * they are checked as scope (SCOPE_VERB_PATTERNS below): what they include must be a read.
 */
const STATIC_WORDS: ReadonlySet<string> = new Set([
  'include', 'includes', 'included', 'including', 'contain', 'contains', 'contained', 'comprise', 'comprises', 'comprised', 'cover', 'covers',
  'covered', 'list', 'lists', 'listed', 'cuprinde', 'cuprind', 'contine', 'contin', 'includ',
]);

// Phase 2 fix round 3 (the verifier's finding "rule 11 residuals": "Smoke extraction is provided
// by the BMS.", "Desfumarea se face prin BMS.", "Smoke control is the job of the BMS.", "The BMS
// includes smoke control.", "Smoke control is part of the BMS.", "Fire dampers: BMS." and the like
// passed). Words of provision, scope and charge are actions on a life-safety function unless
// what they provide, include or hold is a read (a status, an alarm, monitoring); and a clause
// that pairs the BMS with a life-safety function and says nothing it may do is refused.

/** Verbs of provision and of doing: the BMS gives a function ("provided by", "se face prin", "looks after"). */
export const PROVISION_PATTERNS: readonly string[] = [
  String.raw`provid(?:e|es|ed|ing)`, String.raw`provision(?:s|ed|ing)?`, String.raw`ensur(?:e|es|ed|ing)`, String.raw`deliver(?:s|ed|ing|y|ies)?`,
  String.raw`achiev(?:e|es|ed|ing)`, String.raw`accomplish\w*`, String.raw`fulfil\w*`, String.raw`implement\w*`, String.raw`reali[sz](?:e|es|ed|ing|ation)`,
  String.raw`undertak\w*`, 'undertook', String.raw`carr(?:y|ies|ied|ying)\s+out`, String.raw`look(?:s|ed|ing)?\s+after`, String.raw`sees?\s+to`,
  String.raw`oversee\w*`, 'oversaw', String.raw`deal(?:s|t|ing)?\s+with`, String.raw`attend(?:s|ed|ing)?\s+to`, String.raw`car(?:e|es|ed|ing)\s+for`,
  String.raw`support(?:s|ed|ing)?`, String.raw`assign\w*`, String.raw`allocat\w*`, String.raw`delegat\w*`, String.raw`entrust\w*`, String.raw`attribut\w*`,
  String.raw`belong(?:s|ed|ing)?`, String.raw`(?:fall|falls|falling|fallen|fell)\s+(?:within|under|to|into)`, String.raw`(?:lie|lies|lay|lying)\s+with`,
  String.raw`rest(?:s|ed|ing)?\s+with`, String.raw`(?:sit|sits|sat|sitting)\s+with(?:in)?`, 'doing', String.raw`facilitat\w*`,
  String.raw`us(?:e|es|ed|ing)\s+(?:for|as|to)`, String.raw`utili[sz](?:e|es|ed|ing|ation)`, String.raw`employ\w*`, String.raw`serv(?:e|es|ed|ing)\s+(?:as|for)`,
  String.raw`rel(?:y|ies|ied|ying)\s+(?:on|upon)`, String.raw`depend(?:s|ed|ing)?\s+(?:on|upon)`, String.raw`based\s+on`, String.raw`run\s+(?:by|from|on)`,
  String.raw`tend(?:s|ed|ing)?\s+to`,
  // Romanian: "se face prin", "se realizează", "se asigură", "se ocupă", "revine", "ține de", "intră în"
  'face', 'fac', 'faca', String.raw`facut\w*`, String.raw`realiz\w*`, String.raw`asigur\w*`, String.raw`efectu\w*`, String.raw`ocup\w*`, 'revine', 'revin',
  String.raw`reveni\w*`, 'tine', 'intra', String.raw`furniz\w*`, String.raw`raspund\w*`, String.raw`sustin\w*`, String.raw`deserv\w*`, String.raw`presta\w*`,
  String.raw`folos\w*`, String.raw`utiliz\w*`, String.raw`bazat\w*\s+pe`, String.raw`depind\w*\s+de`, String.raw`depinde\s+de`,
];

/** Verbs of scope: the BMS holds a function ("includes smoke control", "integrated into the BMS"). */
export const SCOPE_VERB_PATTERNS: readonly string[] = [
  String.raw`includ(?:e|es|ed|ing)?`, String.raw`inclus\w*`, String.raw`contain\w*`, String.raw`contin(?:e|ut|uta|ute)?`, String.raw`compris\w*`,
  String.raw`cover(?:s|ed|ing)?`, String.raw`incorporat\w*`, String.raw`integrat\w*`, String.raw`integr(?:eaza|eze|are|area)`, String.raw`embed\w*`,
  String.raw`encompass\w*`, String.raw`cuprin[dsz]\w*`, String.raw`acoper\w*`, 'list', 'lists', 'listed', 'listing',
];

/** Nouns of scope, when the BMS holds them ("part of the BMS", "face parte din BMS", "a BMS component"). */
export const SCOPE_NOUN_PATTERNS: readonly string[] = [
  'part', 'parts', 'scope', 'scopes', 'remit', 'parte', String.raw`components?`, String.raw`componen(?:ta|te|tei|telor)`, String.raw`subsystems?`,
  String.raw`subsistem\w*`, String.raw`modules?`,
];

/** Nouns of charge, when the BMS holds them ("the job of the BMS", "a BMS function", "în sarcina BMS"). */
export const CHARGE_NOUN_PATTERNS: readonly string[] = [
  'job', 'jobs', 'task', 'tasks', 'duty', 'duties', 'role', 'roles', 'function', 'functions', 'hands', 'purview', String.raw`care\s+of`,
  String.raw`sarcin\w*`, String.raw`atributi\w*`, 'rol', 'rolul', 'rolului', String.raw`functi(?:a|e|i|ile|ilor|ei)`, String.raw`grij\w*`,
  String.raw`competent\w*`,
];

// Phase 2 fix round 4: words the wide reading adds to the lists above.

/** Control verbs: rule 11's own "dampers moving" ("Fire dampers move on a signal from the BMS."), English and Romanian. */
export const MORE_CONTROL_PATTERNS: readonly string[] = [
  String.raw`mov(?:e|es|ed|ing)`, 'misca', 'miscat', 'miscata', 'miscate', 'miscare', 'miscarea', 'deplaseaza', 'deplaseze',
  'deplasare', 'deplasarea', 'deplasat', 'deplasata', 'deplasate',
];

/**
 * Verbs of provision: what follows, results or comes from the BMS, or happens there ("smoke extraction follows from it",
 * "smoke extraction then happens from its workstation"); "done".
 */
export const MORE_PROVISION_PATTERNS: readonly string[] = [
  String.raw`follow(?:s|ed|ing)?\s+from`, String.raw`follow(?:s|ed)`, String.raw`result(?:s|ed|ing)?\s+from`, String.raw`(?:come|comes|coming|came)\s+from`,
  String.raw`happen(?:s|ed|ing)?`, String.raw`occur(?:s|red|ring)?`, String.raw`(?:take|takes|taking|took|taken)\s+place`, String.raw`go(?:es)?\s+ahead`,
  String.raw`proceed(?:s|ed|ing)?`, String.raw`are\s+loc`, String.raw`avea\s+loc`, String.raw`se\s+produc\w*`, String.raw`se\s+desfasoar\w*`,
  String.raw`(?:arise|arises|arising|arose|arisen)\s+from`, String.raw`stem(?:s|med|ming)?\s+from`, String.raw`originat(?:e|es|ed|ing)\s+(?:from|in|with)`,
  'done', String.raw`rezult\w*\s+din`, String.raw`provin\w*\s+(?:din|de\s+la)`, String.raw`decurg\w*\s+din`,
];

/** Nouns of charge: "smoke extraction is its concern", "its business", "its affair". */
export const MORE_CHARGE_NOUN_PATTERNS: readonly string[] = [
  'concern', 'concerns', 'business', 'affair', 'affairs', 'domain', 'province', 'department', 'territory', 'preocupare', 'preocuparea', 'treaba',
];

/** A signal, output or instruction: control when it comes from the BMS ("on a signal from the BMS", "a BMS output", "semnal de la BMS"). */
const SIGNAL_NOUNS: ReadonlySet<string> = new Set([
  'signal', 'signals', 'output', 'outputs', 'instruction', 'instructions', 'order', 'orders', 'pulse', 'pulses', 'request', 'requests',
  'trigger', 'triggers', 'semnal', 'semnalul', 'semnalului', 'semnale', 'semnalele', 'iesire', 'iesirea', 'iesiri', 'iesirile',
  'instructiune', 'instructiunea', 'instructiuni', 'ordin', 'ordinul', 'impuls', 'impulsul', 'impulsuri', 'cerere', 'cererea',
]);

/** Words of connection: said of the fire alarm system, a read ("connected to the BMS"); said of a life-safety function, nothing. */
const CONNECTION_PATTERNS: readonly string[] = [
  String.raw`connect\w*`, String.raw`interfac\w*`, String.raw`link\w*`, 'wired', 'hardwired', String.raw`hard-wired`, String.raw`network\w*`,
  String.raw`conect\w*`, String.raw`legat\w*`, 'legatura', String.raw`cablat\w*`, String.raw`interfat\w*`,
];

/**
 * The fire context rather than a life-safety function: naming only these, a clause says when
 * or where, not what the BMS would provide ("on fire alarm", "in fire mode").
 */
const CONTEXT_TERMS: ReadonlySet<string> = new Set([
  'fire', 'fires', 'fire alarm', 'fire alarms', 'fire mode', 'fire safety', 'life safety', 'life-safety', 'incendiu', 'incendiul', 'incendiului',
  'incendii', 'incendiilor', 'foc', 'focului', 'alarma de incendiu', 'alarma la incendiu', 'mod incendiu', 'modul incendiu', 'modul de incendiu',
  'pompieri',
]);

/**
 * "raise an alarm" and its Romanian forms, the alarm verb in more words; and "aims to
 * support", the wording rule 11 itself gives for a BAC class.
 */
const RAISE_ALARM = new RegExp(
  String.raw`(?<!${WORD})(?:rais(?:e|es|ed|ing)\s+(?:an?\s+|the\s+)?alarms?|genereaza\s+(?:o\s+)?alarma|da\s+alarma|aim(?:s|ed|ing)?\s+to\s+support|aimed\s+at\s+supporting|isi\s+propune\s+sa\s+sustina|urmareste\s+sa\s+sustina)(?!${WORD})`,
  'gu',
);

const ARTICLES = [
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'its', 'their', 'his', 'her', 'our', 'your', 'each', 'every', 'all', 'any', 'some', 'no',
  'both', 'either', 'neither', 'other', 'another', 'such', 'same', 'un', 'o', 'unui', 'unei', 'niste', 'acest', 'aceasta', 'aceste', 'acesti',
  'fiecare', 'toate', 'toti', 'tot', 'orice', 'lor', 'sai', 'sale', 'cel', 'cea', 'cei', 'cele',
];
const PREPOSITIONS = [
  'in', 'on', 'at', 'of', 'for', 'from', 'to', 'into', 'onto', 'by', 'via', 'through', 'with', 'without', 'under', 'over', 'per', 'during',
  'after', 'before', 'upon', 'across', 'between', 'within', 'about', 'against', 'toward', 'towards', 'as', 'than', 'including', 'like',
  'de', 'la', 'din', 'pe', 'cu', 'prin', 'pentru', 'fara', 'sub', 'peste', 'catre', 'spre', 'dupa', 'inainte', 'intre', 'pana', 'al', 'a',
  'ai', 'ale', 'in', 'printr', 'intr', 'dintre', 'despre', 'asupra',
];
const CONJUNCTIONS = [
  'and', 'or', 'but', 'nor', 'so', 'yet', 'while', 'whereas', 'if', 'when', 'whenever', 'once', 'because', 'since', 'unless', 'until', 'then',
  'whether', 'si', 'sau', 'dar', 'iar', 'ori', 'ca', 'daca', 'cand', 'care', 'ce', 'which', 'that', 'who', 'whose', 'where', 'what',
];
const PRONOUNS = ['it', 'they', 'them', 'itself', 'this', 'these', 'those', 'el', 'ea', 'ei', 'ele', 'acesta', 'aceasta', 'acestea', 'se', 'il', 'le', 'ii'];
const FUNCTION_WORDS: ReadonlySet<string> = new Set([...ARTICLES, ...PREPOSITIONS, ...CONJUNCTIONS, ...PRONOUNS]);

const ADVERBS: ReadonlySet<string> = new Set([
  'only', 'also', 'then', 'just', 'simply', 'automatically', 'continuously', 'always', 'immediately', 'directly', 'still', 'further',
  'additionally', 'typically', 'normally', 'merely', 'solely', 'already', 'however', 'therefore', 'thus', 'instead', 'sometimes', 'plus',
  'both', 'either', 'too', 'doar', 'numai', 'asemenea', 'apoi', 'automat', 'continuu', 'imediat', 'direct', 'mai', 'deja', 'totodata',
]);
const NEGATION_WORDS: ReadonlySet<string> = new Set(['never', 'not', 'no', 'cannot', 'nu', 'niciodata', 'nici', 'fara', 't']);
const MODALS: ReadonlySet<string> = new Set([
  'will', 'shall', 'can', 'could', 'may', 'might', 'must', 'should', 'would', 'does', 'do', 'did', 'doesn', 'don', 'didn', 'won', 'cannot',
  'va', 'vor', 'vom', 'vei', 'poate', 'pot', 'putea', 'trebuie', 'sa', 'ar',
]);
const BE: ReadonlySet<string> = new Set([
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'get', 'gets', 'got', 'gotten', 'become', 'becomes', 'este', 'e', 'sunt', 'era', 'erau',
  'fi', 'fie', 'fost', 'fiind', 'se',
]);
const HAVE_AND_STATE: ReadonlySet<string> = new Set([
  'has', 'have', 'had', 'having', 'au', 'avea', 'avand', 'remain', 'remains', 'remained', 'stay', 'stays', 'stayed', 'ramane', 'raman', 'ramas',
]);

/** Nouns that follow "BMS" in a name ("the BMS workstation displays ..."): the verb comes after them. */
const BMS_COMPOUND_NOUNS: ReadonlySet<string> = new Set([
  'workstation', 'workstations', 'operator', 'operators', 'screen', 'screens', 'graphics', 'interface', 'interfaces', 'server', 'servers',
  'software', 'network', 'head', 'front', 'end', 'dashboard', 'dashboards', 'panel', 'panels', 'controller', 'controllers', 'outstation',
  'outstations', 'station', 'stations', 'unit', 'units', 'point', 'points', 'list', 'side', 'integration', 'supervisor', 'user', 'users',
]);

/** Nouns an -s word before an article is likely to be, rather than a verb ("fans the"), and nouns after "to". */
const PLAIN_NOUNS: ReadonlySet<string> = new Set([
  'fans', 'dampers', 'pumps', 'units', 'ahus', 'lifts', 'elevators', 'doors', 'panels', 'valves', 'sensors', 'detectors', 'zones', 'floors',
  'levels', 'systems', 'points', 'signals', 'inputs', 'outputs', 'alarms', 'statuses', 'modes', 'luminaires', 'lights', 'sounders', 'beacons',
  'interfaces', 'contacts', 'relays', 'events', 'faults', 'data', 'status', 'state', 'mode', 'position', 'signal', 'input', 'contact', 'point',
  'plant', 'equipment', 'devices', 'rooms', 'areas', 'spaces', 'routes', 'stairs', 'lobbies', 'shafts', 'ducts', 'buildings', 'records',
  'logs', 'displays', 'reads', 'operators', 'workstations', 'graphics', 'screens', 'staff', 'engineers', 'services',
]);

/** A status a read verb reports ("the open/closed position", "run and fault status"), after which a control word is an adjective. */
const STATUS_ADJECTIVES: ReadonlySet<string> = new Set([
  'open', 'opened', 'closed', 'shut', 'on', 'off', 'run', 'running', 'stop', 'stopped', 'start', 'started', 'trip', 'tripped', 'fault',
  'enabled', 'disabled', 'active', 'inactive', 'activated', 'deactivated', 'released', 'deschis', 'deschisa', 'deschise', 'inchis',
  'inchisa', 'inchise', 'oprit', 'oprita', 'oprite', 'pornit', 'pornita', 'pornite', 'functionare', 'functiune',
]);
const STATUS_NOUNS: ReadonlySet<string> = new Set([
  'status', 'statuses', 'state', 'states', 'position', 'positions', 'feedback', 'indication', 'indications', 'signal', 'signals', 'contact',
  'contacts', 'input', 'inputs', 'stare', 'starea', 'stari', 'pozitie', 'pozitia', 'pozitii', 'semnal', 'semnalul', 'semnale', 'contactul',
  'intrare', 'intrarea', 'intrari', 'indicatie', 'indicatia',
]);

/** -ed words that are adjectives here, not actions (read participles are READ_WORDS). */
const ALLOWED_ED: ReadonlySet<string> = new Set([
  'hardwired', 'wired', 'related', 'based', 'dedicated', 'associated', 'affected', 'detected', 'integrated', 'connected', 'installed',
  'located', 'used', 'required', 'designated', 'rated', 'powered', 'networked', 'fed', 'shared', 'supplied', 'labelled', 'labeled', 'listed',
  'named', 'needed', 'included', 'excluded', 'stated', 'specified', 'documented', 'described', 'proposed', 'scoped', 'motorised', 'motorized',
  'centralised', 'centralized', 'addressed', 'addressable', 'provided', 'limited', 'restricted', 'intended', 'designed', 'approved',
  'protected', 'combined', 'served', 'fitted', 'equipped', 'mounted', 'placed', 'zoned', 'grouped', 'separated',
]);
const ALLOWED_ING: ReadonlySet<string> = new Set([
  'building', 'buildings', 'lighting', 'ceiling', 'heating', 'cooling', 'during', 'including', 'according', 'regarding', 'following',
  'existing', 'remaining', 'corresponding', 'depending', 'piping', 'wiring', 'ducting', 'housing', 'string', 'nothing', 'something',
  'anything', 'everything', 'morning', 'evening', 'spring', 'thing', 'warning', 'warnings', 'parking', 'serving', 'being', 'having',
  'ventilating', 'signalling', 'signaling', 'meaning', 'concerning', 'pending', 'missing', 'matching',
]);
const IRREGULAR_PARTICIPLES: ReadonlySet<string> = new Set([
  'shut', 'set', 'put', 'cut', 'run', 'held', 'kept', 'driven', 'taken', 'brought', 'made', 'done', 'sent', 'left', 'begun', 'overridden',
  'reset', 'given', 'let', 'thrown', 'broken', 'forced', 'stopped', 'started', 'switched', 'turned', 'closed', 'opened',
]);
/** Romanian words shaped like a participle or a verb that are nouns or adjectives here. */
const ROMANIAN_NOT_VERBS: ReadonlySet<string> = new Set([
  'parte', 'date', 'aceste', 'peste', 'este', 'teste', 'necesar', 'necesara', 'conectat', 'conectata', 'conectate', 'cablat', 'cablata',
  'cablate', 'dedicat', 'dedicata', 'dedicate', 'separat', 'separata', 'separate', 'inclus', 'inclusa', 'incluse', 'exclus', 'exclusa',
  'excluse', 'aferent', 'aferenta', 'aferente', 'automat', 'automata', 'automate', 'stat', 'stare', 'poate', 'fost', 'noapte', 'toate',
  'fiecare', 'frecvente', 'curent', 'curenta', 'existent', 'existenta', 'existente', 'normal', 'normala', 'normale',
]);

/** Words after which a word is an object ("overrides the BMS", "signal to the BMS"), not the one acting. */
const AS_OBJECT = new RegExp(
  String.raw`(?<!${WORD})(?:overrid\w*|overrode|over|than|bypass\w*|without|independent(?:ly)?\s+of|regardless\s+of|to|into|onto|with|on|at|la|catre|spre|pentru|cu|fata\s+de|asupra)\s+(?:the\s+|a\s+|an\s+)?$`,
  'u',
);
/** Words after which a mention is the agent or instrument of an action ("stopped by the BMS", "via the BMS", "prin BMS"). */
const AS_AGENT = new RegExp(
  String.raw`(?<!${WORD})(?:by|via|through|using|from|by\s+means\s+of|prin|printr-?un|printr-?o|de|de\s+catre|din\s+partea|cu\s+ajutorul)\s+(?:the\s+|a\s+|an\s+)?$`,
  'u',
);
/** Words after which a mention is negated ("not the BMS", "rather than the BMS"). */
const AS_NEGATED = new RegExp(
  String.raw`(?<!${WORD})(?:not|never|rather\s+than|instead\s+of|nu|niciodata|in\s+locul|in\s+loc\s+de)\s+(?:(?:by|via|through|in|within|from|de|prin|in|din)\s+)?(?:the\s+|a\s+|an\s+)?$`,
  'u',
);
/** A relative pronoun right after a mention: what follows is that actor's action ("the BMS, which stops ..."). */
const RELATIVE_AFTER = new RegExp(String.raw`^\s*,?\s*(?:which|that|who|care|ce)(?!${WORD})`, 'u');

const NEGATION = new RegExp(
  String.raw`(?<!${WORD})(?:never|not|no|cannot|can't|cant|don't|dont|doesn't|doesnt|won't|wont|without|nu|niciodata|fara)(?!${WORD})`,
  'gu',
);
const CONTRAST = new RegExp(String.raw`(?<!${WORD})(?:but|however|yet|although|dar|insa|ci)(?!${WORD})`, 'u');

const NORMAL_MODE = wholeWords([
  String.raw`normal\s+(?:mode|operation|operating\s+mode|running|conditions)`, String.raw`day-to-day\s+operation`,
  String.raw`regim(?:ul)?\s+normal`, String.raw`functionare(?:a)?\s+normala`, String.raw`mod(?:ul)?\s+normal`,
]);

/** A sentence that carries on from the one before ("Then it stops ...", "In that case ..."). */
const CARRY_ON = new RegExp(
  String.raw`^\s*(?:then|afterwards|after\s+that|subsequently|thereafter|next|in\s+that\s+case|in\s+this\s+case|at\s+that\s+point|it|this|they|apoi|ulterior|dupa\s+aceea|in\s+acest\s+caz|in\s+acel\s+caz|in\s+continuare|acesta|aceasta)(?!${WORD})`,
  'u',
);

const phrase = (terms: readonly string[]) => wholeWords(terms.map((term) => term.replace(/ /g, String.raw`\s+`)));
const LIFE_SAFETY = phrase(LIFE_SAFETY_TERMS);
const BMS = phrase(BMS_TERMS);
const FIRE_ACTOR = phrase(FIRE_SYSTEM_TERMS);
const CONTROL = wholeWords(CONTROL_PATTERNS);
const CONTROL_NOUN = wholeWords(CONTROL_NOUN_PATTERNS);
const PROVISION = wholeWords(PROVISION_PATTERNS);
const SCOPE_VERB = wholeWords(SCOPE_VERB_PATTERNS);
const SCOPE_NOUN = wholeWords(SCOPE_NOUN_PATTERNS);
const CHARGE_NOUN = wholeWords(CHARGE_NOUN_PATTERNS);
const CONNECTION = wholeWords(CONNECTION_PATTERNS);

/**
 * One reading of a text: the BMS's names and the word lists it reads with, and whether it follows
 * the BMS through anaphors, back-references and signals (phase 2 fix round 4). The plain reading
 * is the check as it stood before; the wide reading adds to it, and a clause either refuses is refused.
 */
interface Reading {
  /** The BMS's other names (BMS_OTHER_NAMES), taken after BMS_TERMS and before the fire system's. */
  readonly bmsOther: RegExp | undefined;
  /** Generic names of the BMS's parts, taken after the fire system's and the life-safety names. */
  readonly bmsAfter: RegExp | undefined;
  /** Words that stand for the last actor, as "it" does. */
  readonly anaphors: RegExp | undefined;
  readonly control: RegExp;
  readonly provision: RegExp;
  readonly charge: RegExp;
  /** Back-references ("its", "there"), signals from the BMS, and names with a predicate of their own after a read (lifeSafetyControl reads spelled names for this reading). */
  readonly wide: boolean;
}

const PLAIN_READING: Reading = { bmsOther: undefined, bmsAfter: undefined, anaphors: undefined, control: CONTROL, provision: PROVISION, charge: CHARGE_NOUN, wide: false };
const WIDE_READING: Reading = {
  bmsOther: phrase(BMS_OTHER_NAMES),
  bmsAfter: phrase(BMS_GENERIC_NAMES),
  anaphors: phrase(SYSTEM_ANAPHORS),
  control: wholeWords([...CONTROL_PATTERNS, ...MORE_CONTROL_PATTERNS]),
  provision: wholeWords([...PROVISION_PATTERNS, ...MORE_PROVISION_PATTERNS]),
  charge: wholeWords([...CHARGE_NOUN_PATTERNS, ...MORE_CHARGE_NOUN_PATTERNS]),
  wide: true,
};

/** What may stand between a name and the life-safety function or fire system it serves ("panel for the smoke extraction"). */
const SERVES_LEAD = /^\s+(?:(?:for|of|pentru|de|al|a|ai|ale)\s+)?(?:the\s+)?/u;

/**
 * Whether a name the wide reading reads, ending at `end`, is followed by the life-safety
 * function or the fire system it serves: then it is that system's part, not the BMS ("the
 * automation panel for smoke extraction", "tabloul de automatizare desfumare").
 */
function servesFunction(clause: string, end: number): boolean {
  const rest = clause.slice(end);
  const lead = SERVES_LEAD.exec(rest);
  if (lead === null) return false;
  const after = rest.slice(lead[0].length);
  const fire = spansOf(FIRE_ACTOR, after)[0];
  if (fire?.index === 0) return true;
  const named = spansOf(LIFE_SAFETY, after)[0];
  return named?.index === 0 && !CONTEXT_TERMS.has(after.slice(0, named.length).replace(/\s+/gu, ' '));
}

/** Where a letter of a spelled acronym may be followed by another: one to three spaces or marks, no line end. */
const LETTER_GAP = String.raw`(?:[^\S\n]|[.\-_·‧∙•*~/|'’‐‑‒–—]){1,3}`;
/**
 * An acronym of the BMS written letter by letter, with the dot after its last letter when the text
 * carries on in the same sentence (a lower-case word, a digit or a comma after it; the text as
 * written, so the case is known).
 */
const SPELLED_NAME = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(?:${SPELLED_ACRONYMS.map((acronym) =>
    [...acronym].map((letter) => `[${letter}${letter.toUpperCase()}]`).join(LETTER_GAP),
  ).join('|')})(?![\p{L}\p{N}])(?:\.(?=[^\S\n]*(?:[a-zà-ÿăâîșțş0-9,;:)\]-]|$)))?`,
  'gu',
);

/**
 * `folded` (the fold of `text`) with every acronym of the BMS written letter by letter read as the
 * acronym, padded with spaces before it so every index stays in place ("B.M.S. shuts" is read
 * "   bms shuts"). An acronym written whole is left as it is.
 */
function readSpelledNames(text: string, folded: string): string {
  let out = '';
  let cursor = 0;
  for (const span of spansOf(SPELLED_NAME, text)) {
    const written = text.slice(span.index, span.index + span.length);
    const acronym = written.replace(/[^\p{L}]/gu, '').toLowerCase();
    if (acronym.length === written.length) continue;
    out += folded.slice(cursor, span.index) + ' '.repeat(span.length - acronym.length) + acronym;
    cursor = span.index + span.length;
  }
  return out + folded.slice(cursor);
}

/** Words after which a BMS mention is overridden or set aside, not a party to the clause ("overriding the BMS"). */
const OVERRIDDEN = new RegExp(
  String.raw`(?<!${WORD})(?:overrid\w*|overrode|over|than|bypass\w*|without|independent(?:ly)?\s+of|regardless\s+of|in\s+place\s+of|instead\s+of)\s+(?:the\s+|a\s+|an\s+)?$`,
  'u',
);

/** What makes a life-safety name a thing the BMS reads: a read word, a status noun, an alarm, a point ("the fire damper status"). */
const READ_QUALIFIERS: ReadonlySet<string> = new Set([
  ...READ_WORDS, ...STATUS_NOUNS, 'fault', 'faults', 'point', 'points', 'event', 'events', 'punct', 'puncte', 'punctele', 'defect', 'defecte',
  // Romanian inflections of the read and status nouns ("starea" is listed; "stării" follows "monitorizarea").
  'starii', 'starile', 'starilor', 'pozitiei', 'pozitiile', 'pozitiilor', 'semnalului', 'semnalele', 'semnalelor', 'monitorizarii', 'afisarii',
  'inregistrarii', 'alarmei', 'alarme', 'alarmele', 'alarmelor', 'indicatiei', 'intrarii', 'intrarile', 'intrarilor', 'statusul', 'statusului',
  'defectului', 'defectelor',
]);
/** Words passed over between a life-safety name and the read word before it ("monitoring of the fire dampers and the smoke fans"). */
const QUALIFIER_SKIP: ReadonlySet<string> = new Set([
  'the', 'an', 'of', 'and', 'or', 'its', 'their', 'each', 'every', 'all', 'any', 'si', 'sau', 'al', 'ai', 'ale', 'a', 'lor', 'sale', 'de', 'din',
  'la', 'for', 'on', 'pentru', ...STATUS_ADJECTIVES,
]);
/** Words that may stand between a noun of charge and the read verb that fills it ("the role of the BMS in fire mode is limited to monitoring"). */
const CHARGE_TO_READ: ReadonlySet<string> = new Set([
  'limited', 'restricted', 'confined', 'reduced', 'strictly', 'purely', 'limitat', 'limitata', 'limitate', 'strict',
]);
const RELATIVES: ReadonlySet<string> = new Set(['which', 'that', 'who', 'care', 'ce']);
const COORDINATORS: ReadonlySet<string> = new Set(['and', 'or', 'si', 'sau', 'nor']);
/** Words between the BMS and a life-safety function it is said to be or have ("the BMS is the smoke control system", "BMS-ul este sistemul de desfumare"). */
const IDENTITY_SKIP: ReadonlySet<string> = new Set(['system', 'systems', 'sistemul', 'sistem', 'de', 'of', 'for', 'pentru', 'own', 'propriu', 'propria']);
/** Words that make "do" a main verb when they follow it ("the BMS does smoke extraction", "does the smoke control"). */
const DO_OBJECTS: ReadonlySet<string> = new Set(['the', 'a', 'an', 'all', 'any', 'its', 'their', 'this', 'these', 'those', 'some', 'both', 'each', 'every']);
const GENITIVES: ReadonlySet<string> = new Set(['of', 'al', 'a', 'ai', 'ale', 'lui', 'din']);

// ---------------------------------------------------------------------------
// Sentences, clauses and tokens
// ---------------------------------------------------------------------------

const SENTENCE_BREAK = /[.!?\n]+/gu;
const CLAUSE_BREAK = new RegExp(
  [
    String.raw`[;:]+`,
    // "..., the fire system overrides the BMS": the fire system starts a clause of its own after a comma (not in a list of actors).
    String.raw`(?<!(?:bms|bacs|ddc|systems?|panels?|interlocks?)\s*),\s*(?=(?:the\s+|a\s+)?(?:${FIRE_SYSTEM_TERMS.map((term) => term.replace(/ /g, String.raw`\s+`)).join('|')})(?!${WORD}))`,
    String.raw`,\s*(?=(?:and|but|while|whereas|iar|dar|si|in timp ce)(?!${WORD}))`,
    String.raw`\s(?=(?:and|but|while|whereas|iar|dar|si)\s+(?:the\s+)?(?:bms|building management|sistemul)(?!${WORD}))`,
    String.raw`\s(?=(?:while|whereas|iar|in timp ce)(?!${WORD}))`,
  ].join('|'),
  'gu',
);

interface Piece {
  readonly index: number;
  readonly text: string;
  /** The text between this piece and the one before (the break). */
  readonly breakBefore: string;
}

function split(text: string, offset: number, pattern: RegExp): Piece[] {
  const pieces: Piece[] = [];
  let start = 0;
  let breakBefore = '';
  pattern.lastIndex = 0;
  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    if (match[0].length === 0) {
      pattern.lastIndex += 1;
      continue;
    }
    pieces.push({ index: offset + start, text: text.slice(start, match.index), breakBefore });
    breakBefore = match[0];
    start = match.index + match[0].length;
  }
  pieces.push({ index: offset + start, text: text.slice(start), breakBefore });
  return pieces.filter((piece) => piece.text.trim() !== '');
}

type Actor = 'bms' | 'fire' | 'unknown';
type Role = 'subject' | 'object' | 'agent' | 'negated';

type Token =
  | { readonly kind: 'word'; readonly word: string; readonly index: number; readonly end: number }
  | { readonly kind: 'actor'; readonly actor: Actor; readonly role: Role; readonly index: number; readonly end: number }
  | { readonly kind: 'system'; readonly index: number; readonly end: number; readonly term: string };
type ActorToken = Extract<Token, { kind: 'actor' }>;
type WordToken = Extract<Token, { kind: 'word' }>;

const WORD_RUN = /[\p{L}\p{N}_]+/gu;
const PRONOUN_ACTORS: ReadonlySet<string> = new Set(['it', 'acesta', 'aceasta', 'el', 'ea']);

const isWord = (token: Token | undefined): token is WordToken => token?.kind === 'word';
const isActor = (token: Token | undefined): token is ActorToken => token?.kind === 'actor';
/** A word that carries meaning: not a function word, an adverb, a negation, a modal or a form of "be" or "have". */
const isContentWord = (word: string): boolean =>
  !FUNCTION_WORDS.has(word) && !ADVERBS.has(word) && !NEGATION_WORDS.has(word) && !MODALS.has(word) && !BE.has(word) && !HAVE_AND_STATE.has(word);

/**
 * The clause as words, actor mentions and life-safety system names, in order, each actor
 * with its role. `lastActor` resolves "it".
 */
function tokenize(clause: string, lastActor: Actor | undefined, reading: Reading = PLAIN_READING): Token[] {
  type Kind = 'bms' | 'fire' | 'system' | 'anaphor';
  const specials: { index: number; end: number; kind: Kind }[] = [];
  const take = (pattern: RegExp, kind: Kind, named = false) => {
    for (const span of spansOf(pattern, clause)) {
      const end = span.index + span.length;
      if (specials.some((taken) => span.index < taken.end && taken.index < end)) continue;
      specials.push({ index: span.index, end, kind: named && servesFunction(clause, end) ? 'fire' : kind });
    }
  };
  take(BMS, 'bms');
  if (reading.bmsOther !== undefined) take(reading.bmsOther, 'bms', true);
  if (reading.anaphors !== undefined) take(reading.anaphors, 'anaphor');
  take(FIRE_ACTOR, 'fire');
  take(LIFE_SAFETY, 'system');
  if (reading.bmsAfter !== undefined) take(reading.bmsAfter, 'bms', true);
  specials.sort((left, right) => left.index - right.index);

  const raw: Token[] = [];
  let cursor = 0;
  const words = (from: number, to: number) => {
    const part = clause.slice(from, to);
    WORD_RUN.lastIndex = 0;
    for (let match = WORD_RUN.exec(part); match !== null; match = WORD_RUN.exec(part)) {
      const word = match[0];
      const index = from + match.index;
      if (PRONOUN_ACTORS.has(word)) raw.push({ kind: 'actor', actor: 'unknown', role: 'subject', index, end: index + word.length });
      else raw.push({ kind: 'word', word, index, end: index + word.length });
    }
  };
  /** Positions of "this system" and the like: the last actor, as "it" is. */
  const anaphors = new Set<number>();
  for (const special of specials) {
    words(cursor, special.index);
    if (special.kind === 'system') raw.push({ kind: 'system', index: special.index, end: special.end, term: clause.slice(special.index, special.end).replace(/\s+/gu, ' ') });
    else if (special.kind === 'anaphor') {
      anaphors.add(raw.length);
      raw.push({ kind: 'actor', actor: 'unknown', role: 'subject', index: special.index, end: special.end });
    } else raw.push({ kind: 'actor', actor: special.kind, role: 'subject', index: special.index, end: special.end });
    cursor = special.end;
  }
  words(cursor, clause.length);

  // Roles, then "it" as the last actor that acted.
  let last = lastActor;
  return raw.map((token, at) => {
    if (!isActor(token)) return token;
    const pronoun = PRONOUN_ACTORS.has(clause.slice(token.index, token.end)) || anaphors.has(at);
    const role = roleOf(clause, raw, at);
    const actor = pronoun ? (last ?? 'unknown') : token.actor;
    if (role === 'subject' || role === 'agent') last = actor;
    return { ...token, actor, role };
  });
}

function roleOf(clause: string, tokens: readonly Token[], at: number): Role {
  const token = tokens[at];
  if (token === undefined) return 'subject';
  const before = clause.slice(0, token.index);
  if (AS_NEGATED.test(before)) return 'negated';
  if (RELATIVE_AFTER.test(clause.slice(token.end))) return 'subject';
  if (AS_AGENT.test(before)) return 'agent';
  if (AS_OBJECT.test(before)) return 'object';
  // Right after a word that carries meaning ("monitors the fire system", "logs it"), with no comma between: an object.
  let previous = at - 1;
  while (isWord(tokens[previous]) && ['the', 'a', 'an'].includes((tokens[previous] as WordToken).word)) previous -= 1;
  const word = tokens[previous];
  if (isWord(word) && isContentWord(word.word) && !/,/u.test(clause.slice(word.end, token.index))) return 'object';
  return 'subject';
}

// ---------------------------------------------------------------------------
// Action words
// ---------------------------------------------------------------------------

/** strong: an action unless read, negated or the fire system's; noun: only when the BMS holds it; weak: only when the BMS is its agent. */
type Strength = 'strong' | 'noun' | 'weak';
interface Item {
  readonly position: number;
  readonly strength: Strength;
}
const RANK: Readonly<Record<Strength, number>> = { strong: 3, noun: 2, weak: 1 };

const ROMANIAN_BE: ReadonlySet<string> = new Set(['este', 'e', 'sunt', 'era', 'erau', 'fi', 'fie', 'fost', 'fiind', 'se']);

function englishParticiple(word: string): boolean {
  return IRREGULAR_PARTICIPLES.has(word) || (word.length >= 5 && /(?:ed|en)$/u.test(word) && !ALLOWED_ED.has(word));
}
function romanianParticiple(word: string): boolean {
  return word.length >= 4 && /(?:t|ta|te|ti|s|sa|se|si)$/u.test(word) && !ROMANIAN_NOT_VERBS.has(word) && !FUNCTION_WORDS.has(word);
}
function romanianVerb(word: string): boolean {
  return word.length >= 6 && /(?:eaza|este)$/u.test(word) && !ROMANIAN_NOT_VERBS.has(word);
}

/** The first token from `from` on that is not a word in `skip`, and the forms of "be" or "have" passed on the way. */
function nextContent(tokens: readonly Token[], from: number, skip: (word: string) => boolean): { at: number; be: string | undefined } {
  let at = from;
  let be: string | undefined;
  while (at < tokens.length) {
    const token = tokens[at];
    if (!isWord(token) || !skip(token.word)) break;
    if (BE.has(token.word) || HAVE_AND_STATE.has(token.word)) be = token.word;
    at += 1;
  }
  return { at, be };
}

/** Word positions inside the spans a pattern finds in the clause. */
function wordsIn(tokens: readonly Token[], pattern: RegExp, clause: string): Set<number> {
  const found = new Set<number>();
  for (const span of spansOf(pattern, clause)) {
    const at = tokens.findIndex((token) => isWord(token) && token.index >= span.index && token.index < span.index + span.length);
    if (at >= 0) found.add(at);
  }
  return found;
}

/** The action words of a clause, with how sure the finding is. */
function actionItems(tokens: readonly Token[], clause: string, reading: Reading = PLAIN_READING): Item[] {
  const items = new Map<number, Strength>();
  const add = (position: number, strength: Strength) => {
    const current = items.get(position);
    if (current === undefined || RANK[strength] > RANK[current]) items.set(position, strength);
  };
  const lexicon = wordsIn(tokens, reading.control, clause);
  const nouns = wordsIn(tokens, CONTROL_NOUN, clause);
  /** The word at `at` is in a verb's place; after a form of "be" only a participle is. */
  const verbAt = (at: number, be: string | undefined) => {
    const token = tokens[at];
    if (!isWord(token) || FUNCTION_WORDS.has(token.word)) return;
    if (be === undefined || lexicon.has(at) || nouns.has(at) || READ_WORDS.has(token.word)) add(at, 'strong');
    else if (ROMANIAN_BE.has(be) ? romanianParticiple(token.word) : englishParticiple(token.word)) add(at, 'strong');
  };

  tokens.forEach((token, at) => {
    if (isActor(token) && token.actor === 'bms') {
      const next = tokens[at + 1];
      // A compound: "BMS-controlled", "BMS-driven".
      if (isWord(next) && clause.slice(token.end, next.index) === '-') add(at + 1, 'strong');
      // The BMS as subject: the word after it (and after the nouns of its name) is its verb.
      if (token.role === 'subject') {
        const { at: verb, be } = nextContent(
          tokens,
          at + 1,
          (word) => ADVERBS.has(word) || NEGATION_WORDS.has(word) || MODALS.has(word) || BE.has(word) || HAVE_AND_STATE.has(word) || BMS_COMPOUND_NOUNS.has(word),
        );
        verbAt(verb, be);
      }
    }
    if (!isWord(token)) return;
    const word = token.word;
    if (lexicon.has(at) || romanianVerb(word)) add(at, 'strong');
    if (nouns.has(at)) add(at, 'noun');
    // After a modal: "will manage", "va opri"; after "to" when a verb follows it: "to stop".
    if (MODALS.has(word)) {
      const { at: verb, be } = nextContent(tokens, at + 1, (next) => ADVERBS.has(next) || NEGATION_WORDS.has(next) || BE.has(next) || HAVE_AND_STATE.has(next));
      verbAt(verb, be);
    }
    if (word === 'to') {
      const target = tokens[at + 1];
      if (isWord(target) && !PLAIN_NOUNS.has(target.word) && !STATUS_NOUNS.has(target.word)) verbAt(at + 1, undefined);
    }
    // After a form of "be": the participle ("are shut down", "sunt oprite").
    if (BE.has(word)) {
      const { at: verb } = nextContent(tokens, at + 1, (next) => ADVERBS.has(next) || NEGATION_WORDS.has(next) || BE.has(next));
      verbAt(verb, word);
    }
    // A verb ending in -s before its object: "handles the", "drives sprinkler pumps".
    const next = tokens[at + 1];
    if (
      word.length >= 4 &&
      /s$/u.test(word) &&
      !/(?:ss|us|is)$/u.test(word) &&
      isContentWord(word) &&
      !PLAIN_NOUNS.has(word) &&
      !STATUS_NOUNS.has(word) &&
      ((isWord(next) && ARTICLES.includes(next.word)) || next?.kind === 'system' || isActor(next))
    ) {
      add(at, 'strong');
    }
    // Words that act only when the BMS is named as their agent.
    if (
      (word.length >= 5 && /ed$/u.test(word) && !ALLOWED_ED.has(word)) ||
      (word.length >= 5 && /ing$/u.test(word) && !ALLOWED_ING.has(word)) ||
      (word.length >= 6 && /(?:and|ind)$/u.test(word) && !['behind', 'remind'].includes(word))
    ) {
      add(at, 'weak');
    }
  });
  return [...items].map(([position, strength]) => ({ position, strength })).sort((left, right) => left.position - right.position);
}

/** Whether a read verb (or a verb of scope) covers the word: on the lists, or "raise an alarm". */
function isRead(tokens: readonly Token[], position: number, readPhrases: readonly Span[]): boolean {
  const token = tokens[position];
  if (!isWord(token)) return false;
  if (READ_WORDS.has(token.word) || STATIC_WORDS.has(token.word)) return true;
  return readPhrases.some((span) => token.index >= span.index && token.index < span.index + span.length);
}

/** A status word before a status noun ("the open/closed position", "run and fault status"): an adjective, not an action. */
function isStatusAdjective(tokens: readonly Token[], position: number): boolean {
  const token = tokens[position];
  if (!isWord(token) || !STATUS_ADJECTIVES.has(token.word)) return false;
  for (let at = position + 1; at <= position + 4 && at < tokens.length; at += 1) {
    const next = tokens[at];
    if (next?.kind === 'system') continue;
    if (!isWord(next)) return false;
    if (STATUS_NOUNS.has(next.word)) return true;
    if (!STATUS_ADJECTIVES.has(next.word) && !['and', 'or', 'si', 'sau', 'the', 'its', 'their', 'mode'].includes(next.word)) return false;
  }
  return false;
}

/** Whether a negation governs the word: before it since its actor, with no contrast word or relative pronoun between. */
function isNegated(tokens: readonly Token[], position: number, clause: string): boolean {
  const token = tokens[position];
  if (token === undefined) return false;
  let from = 0;
  for (let at = position - 1; at >= 0; at -= 1) {
    const before = tokens[at];
    if (isActor(before) && before.role !== 'negated' && before.role !== 'object') {
      // "No BMS command is sent": a negation before the actor's own mention governs its stretch too.
      const previous = tokens[at - 1];
      from = isWord(previous) && ['no', 'niciun', 'nicio', 'nici'].includes(previous.word) ? previous.index : before.end;
      break;
    }
    if (isWord(before) && ['which', 'that', 'care', 'who'].includes(before.word)) {
      from = before.end;
      break;
    }
  }
  const stretch = clause.slice(from, token.index);
  const last = spansOf(NEGATION, stretch).at(-1);
  return last !== undefined && !CONTRAST.test(stretch.slice(last.index + last.length));
}

/** Whether an actor mention stands with the BMS ("the BMS and the fire system stop ..."). */
function joinedWithBms(tokens: readonly Token[], at: number): boolean {
  const joiner = (word: string) => ['and', 'or', 'with', 'together', 'si', 'sau', 'impreuna', 'cu', 'the', 'a', 'an'].includes(word);
  for (const direction of [-1, 1]) {
    for (let step = at + direction; step >= 0 && step < tokens.length; step += direction) {
      const token = tokens[step];
      if (isActor(token)) {
        if (token.actor === 'bms' && token.role !== 'negated') return true;
        // A list of actors: "the BMS, the fire system and the interlocks".
        if (token.actor === 'fire') continue;
        break;
      }
      if (!isWord(token) || !joiner(token.word)) break;
    }
  }
  return false;
}

/** The agent a word's action is given to, named after it and before the next action word ("stopped by the BMS"). */
function agentOf(tokens: readonly Token[], items: readonly Item[], position: number): Actor | undefined {
  const nextItem = items.find((item) => item.position > position && item.strength !== 'weak')?.position ?? tokens.length;
  let agent: Actor | undefined;
  for (let at = position + 1; at < nextItem; at += 1) {
    const token = tokens[at];
    if (!isActor(token) || token.role !== 'agent') continue;
    if (token.actor === 'bms' || joinedWithBms(tokens, at)) return 'bms';
    agent ??= token.actor;
  }
  return agent;
}

/** The actor before a word that acts: the nearest mention that is neither an object nor negated. */
function actorBefore(tokens: readonly Token[], position: number): Actor | undefined {
  for (let at = position - 1; at >= 0; at -= 1) {
    const token = tokens[at];
    if (!isActor(token) || token.role === 'object' || token.role === 'negated') continue;
    return token.actor === 'fire' && joinedWithBms(tokens, at) ? 'bms' : token.actor;
  }
  return undefined;
}

/** A BMS mention right after a noun of control ("logic of the BMS", "responsibility of the BMS"). */
function heldByBmsAfter(tokens: readonly Token[], position: number): boolean {
  for (let at = position + 1; at <= position + 3 && at < tokens.length; at += 1) {
    const token = tokens[at];
    if (isActor(token)) return token.actor === 'bms' && token.role !== 'negated';
    if (!isWord(token) || !['of', 'in', 'the', 'a', 'al', 'a', 'ai', 'ale'].includes(token.word)) return false;
  }
  return false;
}

/** Items in what a read verb reports ("logs when the smoke fans stop"), unless the BMS acts inside it. */
function reportedByReadVerb(tokens: readonly Token[], position: number, readPhrases: readonly Span[]): boolean {
  for (let at = position - 1; at >= 1; at -= 1) {
    const token = tokens[at];
    if (isActor(token) && token.actor === 'bms' && token.role !== 'object' && token.role !== 'negated') return false;
    if (isWord(token) && ['whether', 'if', 'that', 'when', 'once', 'daca', 'ca', 'cand'].includes(token.word) && isRead(tokens, at - 1, readPhrases)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Provision, scope and charge (phase 2 fix round 3)
// ---------------------------------------------------------------------------

type Extra = 'provision' | 'scope' | 'scopeNoun' | 'charge' | 'signal';

/** Words of provision, scope and charge in the clause, by position. A word may be more than one. */
function extraItems(tokens: readonly Token[], clause: string, reading: Reading = PLAIN_READING, possessive: ReadonlySet<number> = NONE): Map<number, Set<Extra>> {
  const extras = new Map<number, Set<Extra>>();
  const add = (position: number, kind: Extra) => {
    const kinds = extras.get(position) ?? new Set<Extra>();
    kinds.add(kind);
    extras.set(position, kinds);
  };
  for (const at of wordsIn(tokens, reading.provision, clause)) add(at, 'provision');
  for (const at of wordsIn(tokens, SCOPE_VERB, clause)) add(at, 'scope');
  for (const at of wordsIn(tokens, SCOPE_NOUN, clause)) add(at, 'scopeNoun');
  for (const at of wordsIn(tokens, reading.charge, clause)) add(at, 'charge');
  // The BMS is or has a function: "the BMS is the smoke control system", "the BMS has smoke control".
  tokens.forEach((token, at) => {
    if (!isActor(token) || token.actor !== 'bms' || token.role !== 'subject') return;
    let next = at + 1;
    let linked = false;
    for (let word = tokens[next]; isWord(word); word = tokens[next]) {
      if (BE.has(word.word) || HAVE_AND_STATE.has(word.word)) linked = true;
      else if (!(ADVERBS.has(word.word) || ARTICLES.includes(word.word) || NEGATION_WORDS.has(word.word) || IDENTITY_SKIP.has(word.word) || BMS_COMPOUND_NOUNS.has(word.word))) break;
      next += 1;
    }
    if (linked && isFunction(tokens[next])) add(next, 'provision');
  });
  // "Do" as a main verb: "the BMS does smoke extraction", "does the smoke control".
  tokens.forEach((token, at) => {
    if (!isWord(token) || !['do', 'does', 'did'].includes(token.word)) return;
    const next = tokens[at + 1];
    if (next?.kind === 'system' || (isWord(next) && DO_OBJECTS.has(next.word))) add(at, 'provision');
  });
  // The wide reading: a signal, output or instruction from the BMS ("on a signal from the BMS", "a BMS output", "on its signal").
  if (reading.wide) {
    tokens.forEach((token, at) => {
      if (isWord(token) && SIGNAL_NOUNS.has(token.word) && fromBms(tokens, at, possessive)) add(at, 'signal');
    });
  }
  return extras;
}

const NONE: ReadonlySet<number> = new Set();

/** Words between a signal and the BMS it comes from ("a signal from the BMS", "semnalul de la BMS"). */
const SIGNAL_TO_SOURCE: ReadonlySet<string> = new Set(['from', 'of', 'by', 'the', 'an', 'a', 'de', 'la', 'din', 'al', 'ai', 'ale', 'coming', 'sent', 'issued', 'given']);

/** Whether the signal at `position` comes from the BMS: named after it, right before it ("BMS relay output"), or through "its". */
function fromBms(tokens: readonly Token[], position: number, possessive: ReadonlySet<number>): boolean {
  for (let at = position + 1; at <= position + 4 && at < tokens.length; at += 1) {
    const token = tokens[at];
    if (isActor(token)) {
      if (token.actor === 'bms' && token.role !== 'negated') return true;
      break;
    }
    if (!isWord(token) || !SIGNAL_TO_SOURCE.has(token.word)) break;
  }
  for (let at = position - 1, words = 0; at >= 0 && words <= 2; at -= 1) {
    const token = tokens[at];
    if (isActor(token)) return token.actor === 'bms' && token.role !== 'negated';
    if (!isWord(token)) return false;
    if (token.word === 'its') return possessive.has(at);
    if (token.word === 's' || token.word === 'own') continue;
    if (!isContentWord(token.word) || READ_WORDS.has(token.word)) return false;
    words += 1;
  }
  return false;
}

/** Whether "its", standing for the BMS, holds the noun at `position` ("its concern"; "its own" stands for the clause's subject, see backReferences). */
function heldThroughPossessive(tokens: readonly Token[], position: number, possessive: ReadonlySet<number>): boolean {
  for (let at = position - 1; at >= 0 && at >= position - 2; at -= 1) {
    const token = tokens[at];
    if (!isWord(token)) return false;
    if (token.word === 'its') return possessive.has(at);
    if (token.word !== 'own') return false;
  }
  return false;
}

/** A life-safety name that is a function or plant, not only the fire context ("smoke extraction", not "fire mode"). */
function isFunction(token: Token | undefined): token is Extract<Token, { kind: 'system' }> {
  return token?.kind === 'system' && !CONTEXT_TERMS.has(token.term);
}

/**
 * Whether the life-safety name at `position` is a thing the BMS reads: a status noun or read
 * word right after it ("the fire damper status", "smoke fan alarms"), a read verb in its own
 * predicate ("fire dampers are monitored"), or a read word before it over articles, "of",
 * "and" and other names ("monitoring of the fire dampers and the smoke fans", "starea
 * clapetelor antifoc").
 */
function readQualified(tokens: readonly Token[], position: number, ownPredicates?: ReadonlySet<number>): boolean {
  // A noun compound after the name, up to three words: "fire damper open/closed status".
  for (let at = position + 1, count = 0; at < tokens.length && count < 3; at += 1, count += 1) {
    const token = tokens[at];
    if (token?.kind === 'system') continue;
    if (!isWord(token)) break;
    if (READ_QUALIFIERS.has(token.word)) return true;
    if (!isContentWord(token.word)) break;
  }
  // Its predicate: "are monitored", "is only displayed", "sunt monitorizate".
  let at = position + 1;
  let passedBe = false;
  for (let token = tokens[at]; isWord(token) && (BE.has(token.word) || ADVERBS.has(token.word)); token = tokens[at]) {
    if (BE.has(token.word)) passedBe = true;
    at += 1;
  }
  const predicate = tokens[at];
  if (passedBe && isWord(predicate) && READ_WORDS.has(predicate.word)) return true;
  // The wide reading: a name with a predicate of its own that is not a read ("smoke extraction is its business",
  // "smoke extraction goes ahead") starts a clause of its own after a finite read verb and "and" ("monitors the fire
  // alarm and smoke extraction is its business"): it is not that verb's object.
  const ownPredicate = ownPredicates !== undefined && (passedBe || ownPredicates.has(at));
  // A read word before it, whose own object runs on to the name: not one closed by "and" ("fire alarm
  // monitoring and smoke extraction" reads the fire alarm, not smoke extraction).
  let coordinated = false;
  for (let back = position - 1; back >= 0; back -= 1) {
    const token = tokens[back];
    if (token?.kind === 'system') continue;
    if (!isWord(token)) return false;
    if (COORDINATORS.has(token.word)) coordinated = true;
    if (QUALIFIER_SKIP.has(token.word)) continue;
    const after = tokens[back + 1];
    if (ownPredicate && coordinated && FINITE_READS.has(token.word)) return false;
    return READ_QUALIFIERS.has(token.word) && !(isWord(after) && COORDINATORS.has(after.word));
  }
  return false;
}

/** Read verbs in a finite form: after one, "and" and a name with a predicate of its own start another clause (the wide reading). */
const FINITE_READS: ReadonlySet<string> = new Set([
  'monitors', 'monitored', 'displays', 'displayed', 'shows', 'showed', 'logs', 'logged', 'records', 'recorded', 'reads', 'receives', 'received',
  'alarms', 'monitorizeaza', 'afiseaza', 'arata', 'inregistreaza', 'jurnalizeaza', 'citeste', 'citesc', 'primeste', 'primesc', 'alarmeaza',
  'semnalizeaza',
]);

/** A purpose that makes the whole clause a read: "for monitoring", "for status monitoring", "as monitoring points", "pentru monitorizare". */
function readPurpose(tokens: readonly Token[]): boolean {
  return tokens.some((token, at) => {
    if (!isWord(token) || !['for', 'as', 'pentru', 'ca'].includes(token.word)) return false;
    for (let next = at + 1; next <= at + 3 && next < tokens.length; next += 1) {
      const word = tokens[next];
      if (!isWord(word)) return false;
      if (READ_WORDS.has(word.word)) return true;
    }
    return false;
  });
}

/** Whether what the clause provides, includes or connects is a read: every function it names is read-qualified, or its purpose is a read. */
function onlyReads(tokens: readonly Token[], ownPredicates?: ReadonlySet<number>): boolean {
  return readPurpose(tokens) || tokens.every((token, at) => !isFunction(token) || readQualified(tokens, at, ownPredicates));
}

/** A BMS mention that holds the noun at `position`: "part of the BMS", "în sarcina BMS", "a BMS function", "the BMS has the task of". */
function heldByBms(tokens: readonly Token[], position: number): boolean {
  for (let at = position + 1; at <= position + 3 && at < tokens.length; at += 1) {
    const token = tokens[at];
    if (isActor(token)) return token.actor === 'bms' && token.role !== 'negated';
    if (!isWord(token) || !['of', 'in', 'within', 'the', 'a', 'an', 'al', 'ai', 'ale', 'din', 'lui'].includes(token.word)) break;
  }
  for (let at = position - 1; at >= 0 && at >= position - 4; at -= 1) {
    const token = tokens[at];
    if (isActor(token)) return token.actor === 'bms' && token.role !== 'negated';
    if (!isWord(token)) return false;
    if (!(['the', 'a', 'an', 's', 'its'].includes(token.word) || BE.has(token.word) || HAVE_AND_STATE.has(token.word) || ADVERBS.has(token.word))) return false;
  }
  return false;
}

/** Whether a BMS mention stands after "of" (or a Romanian genitive): "the role of the BMS". */
function afterGenitive(tokens: readonly Token[], position: number): boolean {
  for (let at = position - 1; at >= 0; at -= 1) {
    const token = tokens[at];
    if (!isWord(token)) return false;
    if (['the', 'a', 'an'].includes(token.word)) continue;
    return GENITIVES.has(token.word);
  }
  return false;
}

/** Whether a read verb fills the noun of charge at `position`: "the BMS role in fire mode is limited to monitoring", "rolul de a monitoriza". */
function filledByRead(tokens: readonly Token[], position: number): boolean {
  for (let at = position + 1; at < tokens.length; at += 1) {
    const token = tokens[at];
    if (token?.kind === 'system') continue;
    if (isActor(token)) {
      if (token.actor === 'bms' && afterGenitive(tokens, at)) continue;
      return false;
    }
    if (!isWord(token)) return false;
    const word = token.word;
    if (READ_WORDS.has(word)) return true;
    if (RELATIVES.has(word)) return false;
    if (FUNCTION_WORDS.has(word) || BE.has(word) || ADVERBS.has(word) || HAVE_AND_STATE.has(word) || CHARGE_TO_READ.has(word)) continue;
    return false;
  }
  return false;
}

/** Whether the clause names a read as its subject matter: a read word or status noun ("the fire damper status is the job of the BMS"). */
function readSubject(tokens: readonly Token[]): boolean {
  return tokens.some((token) => isWord(token) && READ_QUALIFIERS.has(token.word));
}

/** Whether a negation governs what the BMS does: "the BMS never acts on", "the BMS has no role in", "BMS-ul nu". */
function bmsPredicateNegated(tokens: readonly Token[], clause: string): boolean {
  return tokens.some((token, at) => {
    if (!isActor(token) || token.actor !== 'bms' || token.role === 'negated' || token.role === 'object') return false;
    for (let next = at + 1; next < tokens.length; next += 1) {
      const word = tokens[next];
      if (!isWord(word)) return false;
      if (/[,;:()–—]/u.test(clause.slice(token.end, word.index))) return false;
      if (NEGATION_WORDS.has(word.word)) return true;
      if (!(MODALS.has(word.word) || BE.has(word.word) || HAVE_AND_STATE.has(word.word) || ADVERBS.has(word.word) || BMS_COMPOUND_NOUNS.has(word.word) || word.word === 's')) return false;
    }
    return false;
  });
}

/** Whether a word of provision, scope or charge of a checked clause breaks rule 11. */
function refusedExtra(
  tokens: readonly Token[],
  items: readonly Item[],
  position: number,
  kinds: ReadonlySet<Extra>,
  clause: string,
  inherited: Actor | undefined,
  reads: boolean,
  possessive: ReadonlySet<number> = NONE,
): boolean {
  const readPhrases = spansOf(RAISE_ALARM, clause);
  const token = tokens[position];
  if (isWord(token) && readPhrases.some((span) => token.index >= span.index && token.index < span.index + span.length)) return false;
  if (isNegated(tokens, position, clause) || reportedByReadVerb(tokens, position, readPhrases)) return false;
  const actor = agentOf(tokens, items, position) ?? actorBefore(tokens, position) ?? inherited;
  const held = heldByBms(tokens, position) || heldThroughPossessive(tokens, position, possessive);
  for (const kind of kinds) {
    if ((kind === 'provision' || kind === 'scope') && actor !== 'fire' && !reads) return true;
    if (kind === 'scopeNoun' && held && !reads) return true;
    if (kind === 'charge' && held && !filledByRead(tokens, position) && !(reads && readSubject(tokens))) return true;
    // A signal from the BMS that a life-safety function acts on is control, whoever carries it out (the wide reading),
    // unless the clause reads it ("the damper position is displayed on a signal from the BMS").
    if (kind === 'signal' && !reads && !tokens.some((word) => isWord(word) && READ_WORDS.has(word.word)) && readPhrases.length === 0) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------

/** Whether one action word of a checked clause breaks rule 11. */
function refusedItem(
  tokens: readonly Token[],
  items: readonly Item[],
  item: Item,
  clause: string,
  inherited: Actor | undefined,
  possessive: ReadonlySet<number> = NONE,
): boolean {
  const readPhrases = spansOf(RAISE_ALARM, clause);
  if (isRead(tokens, item.position, readPhrases) || isStatusAdjective(tokens, item.position)) return false;
  if (isNegated(tokens, item.position, clause) || reportedByReadVerb(tokens, item.position, readPhrases)) return false;
  const agent = agentOf(tokens, items, item.position);
  const actor = agent ?? actorBefore(tokens, item.position) ?? inherited;
  switch (item.strength) {
    case 'weak':
      return agent === 'bms';
    case 'noun':
      return actor === 'bms' || heldByBmsAfter(tokens, item.position) || heldThroughPossessive(tokens, item.position, possessive);
    case 'strong':
      return actor !== 'fire';
  }
}

interface ClauseRecord {
  readonly piece: Piece;
  readonly tokens: Token[];
  /** A fire or life-safety clause that mentions the BMS: its words are checked. */
  readonly checked: boolean;
  /**
   * The clause names no BMS and refers back to it only through "its" or "there" (the second
   * reading): only its control verbs on the lists and its words of provision, scope, charge and
   * signal are checked, and it need not say what the BMS may do.
   */
  readonly listsOnly: boolean;
  /** Positions of "its" that stand for the BMS (the wide reading). */
  readonly possessive: ReadonlySet<number>;
  /** What a colon hands on from the clause before ("BMS logic: ..."). */
  readonly fromColon: Actor | undefined;
  /** The sentence names a life-safety system or the fire context itself, not only through "it" or "then" after one that did. */
  readonly ownContext: boolean;
}

interface Verdict {
  /** A word of the clause breaks rule 11. */
  readonly refused: boolean;
  /** The clause pairs the BMS, as a party to it, with the fire context and must say what the BMS may do. */
  readonly needsRead: boolean;
  /** It says what the BMS may do: a read word or status, a negation of the BMS's part, the fire system's reaction, or a connection of reads only. */
  readonly saysRead: boolean;
}

function judge(record: ClauseRecord, reading: Reading): Verdict {
  const { tokens, piece, fromColon } = record;
  const clause = piece.text;
  const items = actionItems(tokens, clause, reading);
  const extras = extraItems(tokens, clause, reading, record.possessive);
  // The wide reading: a verb of provision or control right after a life-safety name is that name's own predicate.
  const reads = onlyReads(tokens, reading.wide ? new Set([...wordsIn(tokens, reading.provision, clause), ...wordsIn(tokens, reading.control, clause)]) : undefined);
  // A clause that refers back to the BMS only through "its" or "there": its control verbs on the lists, and its nouns of control held through "its".
  const listed = record.listsOnly ? wordsIn(tokens, reading.control, clause) : undefined;
  const considered = (item: Item) => listed === undefined || listed.has(item.position) || (item.strength === 'noun' && heldThroughPossessive(tokens, item.position, record.possessive));
  let refused = false;
  let fireReacts = false;
  for (const item of items) {
    const itemRefused = record.checked && considered(item) && refusedItem(tokens, items, item, clause, fromColon, record.possessive);
    if (itemRefused) refused = true;
    else if ((agentOf(tokens, items, item.position) ?? actorBefore(tokens, item.position) ?? fromColon) === 'fire' && !isNegated(tokens, item.position, clause)) fireReacts = true;
  }
  if (record.checked) {
    for (const [position, kinds] of extras) if (refusedExtra(tokens, items, position, kinds, clause, fromColon, reads, record.possessive)) refused = true;
  }
  const party = tokens.some(
    (token) => isActor(token) && token.actor === 'bms' && token.role !== 'negated' && !OVERRIDDEN.test(clause.slice(0, token.index)),
  );
  const readWord = tokens.some((token) => isWord(token) && (READ_WORDS.has(token.word) || STATUS_NOUNS.has(token.word))) || spansOf(RAISE_ALARM, clause).length > 0;
  const negatedPart = bmsPredicateNegated(tokens, clause) || items.some((item) => isNegated(tokens, item.position, clause)) || [...extras.keys()].some((position) => isNegated(tokens, position, clause));
  const connectsReads = reads && spansOf(CONNECTION, clause).length > 0;
  return {
    refused,
    needsRead: record.checked && record.ownContext && (party || fromColon === 'bms'),
    saysRead: readWord || negatedPart || fireReacts || connectsReads,
  };
}

/**
 * Clauses of `text` (tokens masked, as the prose checks read it) in which the BMS takes a
 * life-safety control action, or is paired with a life-safety function without a word of
 * what it may do ("Fire dampers: BMS."). Clauses joined by a colon answer for each other
 * ("BMS: monitoring of the fire dampers").
 */
export function lifeSafetyControl(text: string): Span[] {
  const folded = foldKeepingIndices(text);
  const found = controlClauses(folded, PLAIN_READING);
  for (const span of controlClauses(joinLetterSpacingInPlace(readSpelledNames(text, folded)), WIDE_READING)) {
    if (!found.some((taken) => taken.index === span.index && taken.length === span.length)) found.push(span);
  }
  return found.sort((left, right) => left.index - right.index || left.length - right.length);
}

/** What refers back to the BMS in a clause that may not name it: "its" and "there" while the BMS is the last actor (the wide reading). */
function backReferences(tokens: readonly Token[], lastActor: Actor | undefined): { readonly refers: boolean; readonly possessive: ReadonlySet<number> } {
  const possessive = new Set<number>();
  let refers = false;
  let last = lastActor;
  tokens.forEach((token, at) => {
    if (isActor(token)) {
      if (token.role === 'subject' || token.role === 'agent') last = token.actor;
      return;
    }
    if (!isWord(token) || last !== 'bms') return;
    const next = tokens[at + 1];
    // "its", not "its own", which stands for the clause's own subject ("each damper is tested with its own test switch").
    if (token.word === 'its' && !(isWord(next) && next.word === 'own')) {
      possessive.add(at);
      refers = true;
    }
    // "there" as a place ("from there", "done there"), not "there is"; Romanian "acolo".
    const existential = isWord(next) && (BE.has(next.word) || MODALS.has(next.word) || HAVE_AND_STATE.has(next.word) || EXISTENTIAL.has(next.word));
    if ((token.word === 'there' && !existential) || token.word === 'acolo') refers = true;
  });
  return { refers, possessive };
}

/** Verbs that make "there" existential ("there seems to be"), beside the forms of "be" and the modals. */
const EXISTENTIAL: ReadonlySet<string> = new Set(['seem', 'seems', 'seemed', 'appear', 'appears', 'appeared', 'exist', 'exists', 'existed', 's']);

/** The clauses one reading of the folded text refuses (the plain reading is the check as it stood before phase 2 fix round 4). */
function controlClauses(folded: string, reading: Reading): Span[] {
  const found: Span[] = [];
  let lastActor: Actor | undefined;
  let previousFire = false;
  for (const sentence of split(folded, 0, SENTENCE_BREAK)) {
    const ownContext = spansOf(LIFE_SAFETY, sentence.text).length > 0;
    const sentenceFire: boolean = ownContext || (CARRY_ON.test(sentence.text) && previousFire);
    let inherited: Actor | undefined;
    const records: ClauseRecord[] = [];
    for (const clause of split(sentence.text, sentence.index, CLAUSE_BREAK)) {
      const tokens = tokenize(clause.text, lastActor, reading);
      const ownFire = tokens.some((token) => token.kind === 'system' || (isActor(token) && token.actor === 'fire'));
      const fire = ownFire || (sentenceFire && spansOf(NORMAL_MODE, clause.text).length === 0);
      const fromColon = /:/u.test(clause.breakBefore) ? inherited : undefined;
      const bmsMentioned = tokens.some((token) => isActor(token) && token.actor === 'bms') || fromColon === 'bms';
      const back = reading.wide ? backReferences(tokens, lastActor) : { refers: false, possessive: NONE };
      records.push({
        piece: clause,
        tokens,
        checked: fire && (bmsMentioned || back.refers),
        listsOnly: !bmsMentioned && back.refers,
        possessive: back.possessive,
        fromColon,
        ownContext,
      });
      // The last actor that acted, for "it" and for what follows a colon.
      for (const token of tokens) if (isActor(token) && (token.role === 'subject' || token.role === 'agent')) lastActor = token.actor;
      inherited = [...tokens].reverse().find((token): token is ActorToken => isActor(token) && token.role === 'subject')?.actor ?? fromColon;
    }
    const verdicts = records.map((record) => judge(record, reading));
    // Colon groups: "Fire dampers: BMS." is one pairing; "BMS: monitoring of the fire dampers" is one read.
    const groups: number[][] = [];
    records.forEach((record, at) => {
      const last = groups.at(-1);
      if (last !== undefined && /:/u.test(record.piece.breakBefore)) last.push(at);
      else groups.push([at]);
    });
    for (const members of groups) {
      const groupSaysRead = members.some((at) => verdicts[at]?.saysRead === true);
      for (const at of members) {
        const verdict = verdicts[at];
        const record = records[at];
        if (verdict === undefined || record === undefined) continue;
        if (verdict.refused || (verdict.needsRead && !verdict.saysRead && !groupSaysRead)) found.push({ index: record.piece.index, length: record.piece.text.length });
      }
    }
    previousFire = sentenceFire;
  }
  return found;
}
