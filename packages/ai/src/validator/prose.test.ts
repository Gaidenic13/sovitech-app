/**
 * The prose rules of the output validator, rule by rule. The indexed cases are G2-3, G2-5,
 * G9-5, G11-2 and G11-6 (tests/guardrails/); these tests pin each check's reading.
 * All figures are TEST figures.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lifeSafetyControl } from './life-safety';
import { lifeSafetyControlByList } from './life-safety-list';
import { proseIssues, type ProseContext } from './prose';
import { checkedText } from './text';

const TOKENS: ProseContext = { tokens: new Set(['{{value:TEST.area}}', '{{value:TEST.low}}', '{{value:TEST.high}}', '{{calc:TEST.points}}']) };
const rules = (text: string, context: ProseContext = TOKENS): string[] => [...new Set(proseIssues(text, context).map((issue) => issue.rule))].sort();

describe('tokens and digits (rule 2)', () => {
  it('F-PROPOSAL-04 · rule 2: passes a figure given as a known token and refuses one typed as text', () => {
    expect(rules('The area is {{value:TEST.area}}.')).toEqual([]);
    expect(rules('The area is 7,777 m².')).toEqual(['digit_outside_token']);
    expect(rules('The area is 7.777,5 mp.')).toEqual(['digit_outside_token']);
  });

  it('F-PROPOSAL-04 · rule 2: refuses unknown tokens, malformed tokens and value tokens where none were offered', () => {
    expect(rules('The area is {{value:TEST.other}}.')).toEqual(['unknown_token']);
    expect(rules('The area is {{value TEST.area}}.')).toEqual(['malformed_token']);
    expect(rules('The area is {{value:TEST.area}}.', {})).toEqual(['unknown_token']);
  });

  it('F-PROPOSAL-04 · rule 2: exempts a year written as a year, a listed document name and a listed standard identifier', () => {
    expect(rules('The design drawings from 2007 show the plant rooms.')).toEqual([]);
    expect(rules('The drawings (2007) show the plant rooms.')).toEqual([]);
    expect(rules('The drawings show 2007 rooms.')).toEqual(['digit_outside_token']);
    expect(rules('Sheet M-201 shows the plant rooms.', { ...TOKENS, names: ['M-201'] })).toEqual([]);
    expect(rules('Sheet M-201 shows the plant rooms.')).toEqual(['digit_outside_token']);
    expect(rules('It aims to support BAC class B (TEST-STD 9999-1:2099).', { ...TOKENS, standardIdentifiers: ['TEST-STD 9999-1:2099'] })).toEqual([]);
  });
});

describe('ranges, number words and arithmetic (rule 9)', () => {
  it('F-PROPOSAL-04 · rule 9: refuses a range composed from two tokens, and passes the engine token that carries the range', () => {
    expect(rules('Points run from {{value:TEST.low}} to {{value:TEST.high}}.')).toEqual(['composed_range']);
    expect(rules('Points are between {{value:TEST.low}} and {{value:TEST.high}}.')).toEqual(['composed_range']);
    expect(rules('Points: {{value:TEST.low}}–{{value:TEST.high}}.')).toEqual(['composed_range']);
    expect(rules('The points estimate is {{calc:TEST.points}}.')).toEqual([]);
  });

  it('F-PROPOSAL-04 · rule 2: refuses numbers written in words and percent signs', () => {
    expect(rules('Somewhere between five and six thousand points.')).toEqual(['number_word']);
    expect(rules('Între trei și patru sute de puncte.')).toEqual(['number_word']);
    expect(rules('Savings could reach {{calc:TEST.points}} %.')).toEqual(['number_word']);
  });

  it('F-PROPOSAL-04 · rule 9: refuses arithmetic in text: a ratio after a token, an operator between tokens, a sum of tokens', () => {
    expect(rules('That is about {{value:TEST.area}} per room.')).toEqual(['arithmetic_in_text']);
    expect(rules('{{value:TEST.low}} plus {{value:TEST.high}} is the total.')).toEqual(['arithmetic_in_text']);
    expect(rules('The sum of {{value:TEST.low}} and {{value:TEST.high}} is shown.')).toEqual(['arithmetic_in_text']);
  });
});

describe('reserved terms (2.8, no allowance for AI text)', () => {
  it('F-PROPOSAL-04 · F-REGISTRY-05 · 2.8: refuses reserved terms in English and Romanian, with or without diacritics, even the 2.8 labels', () => {
    expect(rules('The capacity is verified.')).toEqual(['reserved_term']);
    expect(rules('Valoarea este verificat și garantat.')).toEqual(['reserved_term']);
    expect(rules('Valoarea este verificata.')).toEqual([]); // inflected forms: proposal 7.2.29, not the 2.8 list
    expect(rules('Verified by SOVITECH')).toEqual(['reserved_term']);
    expect(rules('This is the firm-price offer.')).toEqual(['reserved_term']);
  });
});

describe('product names (rule 2; G1-3, G2-5)', () => {
  it('F-PROPOSAL-04 · rule 1: refuses the brand followed by a name or code, and passes the company description', () => {
    expect(rules('The plant uses SAUTER Zentrix TEST controllers.')).toEqual(['product_name_outside_token']);
    expect(rules('An existing SAUTER product ZX-TEST9 is installed.')).toEqual(['digit_outside_token', 'product_name_outside_token'].sort());
    expect(rules('SOVITECH designs SAUTER-based systems built on SAUTER products.')).toEqual([]);
    expect(rules('The panels are from SAUTER and another maker.')).toEqual([]);
  });

  it('F-PROPOSAL-04 · rule 1: refuses a product token while no catalogue is approved, and a catalogue name outside its token', () => {
    expect(rules('The controller is {{product:TEST-P1}}.')).toEqual(['product_token_not_in_catalogue']);
    const catalogue = { dataset: 'TEST-catalogue', version: 'TEST-1', ids: new Set(['TEST-P1']), names: ['Zentrix'] };
    expect(rules('The controller is {{product:TEST-P1}}.', { ...TOKENS, catalogue })).toEqual([]);
    expect(rules('The controller is a Zentrix unit.', { ...TOKENS, catalogue })).toEqual(['product_name_outside_token']);
  });
});

describe('life-safety verbs (rule 11; G11-2)', () => {
  it('F-PROPOSAL-04 · rule 11: refuses BMS control of life-safety plant in English and Romanian', () => {
    expect(rules('The BMS stops the AHUs on fire alarm.')).toEqual(['life_safety_control']);
    expect(rules('On fire alarm the BMS closes the fire dampers.')).toEqual(['life_safety_control']);
    expect(rules('The BMS controls the smoke extraction fans.')).toEqual(['life_safety_control']);
    expect(rules('The BMS resets the sprinkler pumps after a fire.')).toEqual(['life_safety_control']);
    expect(rules('La alarma de incendiu, BMS oprește centralele de tratare a aerului.')).toEqual(['life_safety_control']);
    expect(rules('The AHU shutdown on fire alarm is part of the BMS logic.')).toEqual(['life_safety_control']);
  });

  it('F-PROPOSAL-04 · rule 11: passes the fire system acting and the BMS monitoring, displaying, logging and alarming', () => {
    expect(rules('On fire alarm the fire system stops the AHUs through a hardwired interlock; the BMS displays the fire mode.')).toEqual([]);
    expect(rules('The fire system stops the AHUs and the BMS displays the fire mode.')).toEqual([]);
    expect(rules('The BMS monitors the fire alarm, logs it and raises an alarm.')).toEqual([]);
    expect(rules('The BMS never commands, resets, inhibits, delays or overrides the fire system.')).toEqual([]);
    expect(rules('The BMS monitors the door release on escape routes.')).toEqual([]);
    expect(rules('The BMS controls the AHUs for comfort.')).toEqual([]);
  });
});

// Phase 2 review, adversarial finding "the rule 11 life-safety check is inverted": the check
// was a list of forbidden verbs after the BMS as subject, so the passive, nominalisations,
// Romanian forms and verbs off the list passed. It is now an allowlist over every clause that
// mentions the BMS in any position in a fire context (life-safety.ts).
describe('life-safety verbs: an allowlist in any clause that mentions the BMS (rule 11; G11-2)', () => {
  const REFUSED = [
    // The passive, with the BMS as agent or instrument.
    'On fire alarm, the AHUs are shut down by the BMS.',
    'On fire alarm, the air handling units are stopped by the BMS.',
    'Smoke dampers are closed by the BMS on fire alarm.',
    'Stair pressurisation fans: started via the BMS on alarm.',
    'The AHUs are shut down on fire alarm via the BMS.',
    'The AHUs are de-energised by the BMS on fire alarm.',
    'Gas detection shut-off valves are commanded by the BMS.',
    // Nominalisations and compounds.
    'Shutdown of the AHUs by the BMS on fire alarm.',
    'The BMS-controlled smoke dampers close on alarm.',
    'On fire alarm, the AHUs stop under BMS control.',
    'On fire alarm the BMS has priority over the smoke fans.',
    'The BMS is responsible for the smoke dampers in fire mode.',
    // Verbs off the old list, after the BMS, a modal or "to".
    'On fire alarm the BMS takes the AHUs offline.',
    'The BMS handles the smoke extraction fans in fire mode.',
    'The BMS will manage the fire dampers.',
    'The BMS drives the sprinkler pumps.',
    'The BMS will run the fire pumps weekly.',
    'The BMS sets the smoke dampers to their fire position.',
    'The BMS puts the AHUs into fire mode.',
    'The BMS supervises the stair pressurisation fans.',
    'The BMS monitors the fire alarm and kills the AHUs.',
    'A signal goes to the BMS to stop the AHUs on fire alarm.',
    // Through a relative pronoun, "it", a colon, or a list of actors.
    'The fire system signals the BMS, which stops the AHUs.',
    'The BMS monitors the fire alarm. It then stops the AHUs.',
    'BMS: stop the AHUs on fire alarm.',
    'The BMS, the fire system and the interlocks stop the AHUs on fire alarm.',
    'The fire system stops the AHUs via the BMS.',
    'The BMS does not monitor, it stops the smoke fans on fire alarm.',
    // Romanian, with the inflected system names.
    'La alarma de incendiu, centralele de tratare a aerului sunt oprite de sistemul BMS.',
    'Sistemul BMS va opri desfumarea.',
    'Desfumarea este oprită de sistemul BMS.',
    'La alarma de incendiu BMS-ul oprește centralele.',
    'Pe alarma de incendiu, clapetele antifoc sunt închise prin BMS.',
  ];
  for (const text of REFUSED) {
    it(`F-PROPOSAL-04 · rule 11: refuses "${text}"`, () => {
      expect(rules(text)).toContain('life_safety_control');
    });
  }

  const PASSED = [
    'In fire mode the BMS is read-only: fire-mode reactions are carried out by the fire system through hardwired interlocks.',
    'In normal operation the BMS controls the car-park fans on CO levels. In fire mode, a hardwired interlock from the fire system takes priority and switches the fans to smoke extraction, overriding the BMS; the BMS is read-only in fire mode and only displays the fire-mode status of the fans.',
    'The BMS receives a volt-free fire-alarm signal from the fire alarm panel and displays the fire mode on the operator workstation.',
    'The BMS point list includes a fire-alarm input and a fire-mode status for each AHU panel.',
    'The BMS monitors the run and fault status of the smoke extraction fans.',
    'Fire logic stays in the fire system, not in the BMS.',
    'The BMS does not stop the AHUs or close dampers in a fire; these actions are carried out by the fire system through hardwired interlocks.',
    'No BMS command is sent to life-safety equipment.',
    'Gas detection alarms are displayed and logged by the BMS.',
    'Sistemul BMS monitorizează starea sistemului de detecție și alarmare la incendiu și afișează modul incendiu; oprirea centralelor de tratare a aerului se face prin interblocări cablate ale sistemului de incendiu.',
  ];
  for (const text of PASSED) {
    it(`F-PROPOSAL-04 · rule 11: passes "${text}"`, () => {
      expect(rules(text)).toEqual([]);
    });
  }

  // The first reading's list still runs beside the allowlist (life-safety-list.ts), so the validator
  // lets nothing through that it refused before (guardrails section 10). These clauses describe
  // monitoring, and the allowlist alone would pass them; whether it may decide alone is the
  // approver's (build log, proposal P-2-LS-READ-COMPLEMENTS). Pinned here until then.
  it.each([
    'The BMS monitors whether the fire dampers are open or closed.',
    'The BMS logs when the smoke fans stop.',
    'Where the car-park fans run in normal mode under BMS control for CO ventilation, the fire system overrides the BMS in fire mode.',
  ])('F-PROPOSAL-04 · rule 11: keeps refusing, by the first reading\'s list only: "%s"', (text) => {
    expect(rules(text)).toEqual(['life_safety_control']);
    expect(lifeSafetyControl(checkedText(text).text)).toEqual([]);
    expect(lifeSafetyControlByList(checkedText(text).text)).not.toEqual([]);
  });
});

// Phase 2 fix round 3, the verifier's finding "rule 11 residuals": a verb of provision or scope, a
// noun of charge, a reflexive Romanian passive and a verbless pairing of a life-safety function
// with the BMS all passed (verify2c/ai/g112b.out and g112c.out). Each is now refused unless what
// the clause provides or includes is a read (life-safety.ts, "Provision, scope and charge").
describe('life-safety verbs: provision, scope, charge and verbless pairings (rule 11; G11-7)', () => {
  const REFUSED = [
    // The verifier's eight.
    'Smoke extraction is provided by the BMS.',
    'Stairwell pressurisation is provided by the BMS.',
    'Desfumarea se face prin BMS.',
    'Evacuarea fumului se face prin BMS.',
    'Smoke control is the job of the BMS.',
    'The BMS includes smoke control.',
    'Smoke control is part of the BMS.',
    'Fire dampers: BMS.',
    // Provision and doing.
    'Smoke control is provided through the BMS.',
    'The fire dampers are served by the BMS.',
    'The BMS does smoke extraction.',
    'The BMS monitors the fire alarm and looks after the smoke fans.',
    'Smoke control falls within the BMS.',
    'Smoke control belongs to the BMS.',
    // Romanian: the reflexive passive, "intră în sarcina", "ține de", "revine", "face parte din".
    'Desfumarea se asigură prin BMS.',
    'Desfumarea se face de către sistemul BMS.',
    'Presurizarea scărilor se face din BMS.',
    'Desfumarea intră în sarcina BMS.',
    'Desfumarea ține de BMS.',
    'Desfumarea revine sistemului BMS.',
    'Desfumarea face parte din BMS.',
    'Sistemul BMS include desfumarea.',
    // Scope and charge.
    'The BMS monitors the fire alarm and includes smoke extraction.',
    'The BMS covers the fire dampers.',
    'Smoke extraction is included in the BMS.',
    'Smoke control is integrated into the BMS.',
    'Smoke extraction is a part of the BMS.',
    'Smoke control is the task of the BMS.',
    'Smoke control is the role of the BMS.',
    'Smoke extraction is the duty of the BMS.',
    // Verbless pairings: a heading, a list item, a label.
    'Clapetele antifoc: BMS.',
    'Sprinklers: BMS',
    'Fire dampers - BMS',
    'Smoke dampers — BMS.',
    'Smoke extraction (BMS).',
    'Smoke extraction via BMS.',
    'Smoke extraction with the BMS.',
    'BMS: smoke control.',
    'BMS smoke extraction.',
    'Smoke control: via the BMS.',
    // What a read beside it does not excuse: the BMS being or having the function, relying on it,
    // and a read that belongs to another name in the list.
    'The BMS is the smoke control system and displays fire alarms.',
    'The BMS has smoke control and logs the fire alarm.',
    'BMS-ul este sistemul de desfumare și afișează alarmele.',
    'The BMS is used for smoke extraction and fire alarm monitoring.',
    'Sistemul BMS este folosit pentru desfumare și monitorizează alarmele.',
    'Smoke extraction relies on the BMS, which monitors the fire alarm.',
    'Smoke extraction depends on the BMS and is monitored by it.',
    'The BMS covers fire alarm monitoring and smoke extraction.',
    'The BMS includes fire damper status and smoke control.',
  ];
  for (const text of REFUSED) {
    it(`F-PROPOSAL-04 · G11-7 · rule 11: refuses "${text}"`, () => {
      expect(rules(text)).toContain('life_safety_control');
    });
  }

  // What the clause provides, includes or connects is a read, or the BMS's part is negated.
  const PASSED = [
    'The fire-alarm input and the fire-mode status for each affected panel are included in the BMS point list.',
    'The fire-alarm input and the fire-mode status for each affected panel are part of the BMS point list.',
    'The BMS includes monitoring of the fire dampers and the smoke fans.',
    'The fire detection and alarm system is integrated with the BMS for monitoring only.',
    'Fire alarm signals are integrated into the BMS as monitoring points.',
    'The fire alarm panel is connected to the BMS.',
    'The BMS will be connected to the fire detection and alarm system through volt-free contacts.',
    'Monitorizarea desfumării se face prin BMS.',
    'Monitorizarea stării clapetelor antifoc se face prin BMS.',
    'The role of the BMS in fire mode is limited to monitoring.',
    'The role of the BMS for Fire Safety is to monitor, display, log and alarm.',
    'Pentru siguranța la incendiu, BMS-ul are rolul de a monitoriza și de a afișa starea.',
    'The BMS never acts on life-safety systems.',
    'The BMS has no role in smoke control.',
    'Fire Safety: monitoring only (read-only).',
    'BMS: monitoring of the fire dampers and of the smoke fans.',
    'Smoke extraction in fire mode is carried out by the fire alarm system through hardwired interlocks.',
    'The BMS has a fire-alarm input and a fire-mode status for each AHU panel.',
    'The BMS has no control over smoke extraction.',
    'The BMS is not the smoke control system.',
    'The BMS displays the fire mode based on the fire-alarm input.',
    'The BMS relies on volt-free contacts from the fire alarm panel to show the fire mode.',
  ];
  for (const text of PASSED) {
    it(`F-PROPOSAL-04 · G11-7 · rule 11: passes "${text}"`, () => {
      expect(rules(text)).toEqual([]);
    });
  }
});

// Phase 2 fix round 4, the verifier's findings "the check recognises the BMS only by its listed names"
// and "the residual is broader than its examples" (verify2d/ai/fresh3.out, prose2.out, fresh/natural.out):
// each sentence below passed. The wide reading of life-safety.ts reads the BMS's other names, the BMS
// spelled letter by letter, "this system" and the like, "its" and "there", and signals from the BMS.
describe('life-safety verbs: the BMS by any name, anaphor or back-reference (rule 11; G11-2, G11-7, G11-8)', () => {
  const REFUSED = [
    // The BMS spelled letter by letter, and its other names (G11-2's situation).
    'The B.M.S. shuts down the AHUs on fire alarm.',
    'The B M S shuts down the AHUs on fire alarm.',
    'The B-M-S shuts down the AHUs on fire alarm.',
    'The BAS shuts down the AHUs on fire alarm.',
    'The BEMS shuts down the AHUs on fire alarm.',
    'The building controls shut down the AHUs on fire alarm.',
    'On fire alarm, the AHUs are shut down by the B.M.S.',
    'On fire alarm, the AHUs are shut down by the BAS.',
    'Sistemul B.M.S. oprește centralele de tratare a aerului la alarma de incendiu.',
    'Sistemul de control al clădirii oprește CTA-urile la alarmă de incendiu.',
    'GTC oprește desfumarea.',
    'Gestiunea tehnică a clădirii oprește desfumarea.',
    'The B.M.S. stops the smoke fans.',
    'The SCADA stops the AHUs on fire alarm.',
    'The controls system shuts the fire dampers.',
    'The automation panels stop the AHUs on fire alarm.',
    'On fire alarm, the controllers stop the AHUs.',
    'The head-end resets the fire alarm panel.',
    'SOVITECH controls reset the fire alarm panel.',
    'Tablourile de automatizare opresc desfumarea.',
    'Fire dampers: BAS.',
    // An anaphor for the BMS, as "it".
    'The BMS covers HVAC and lighting. This system also provides smoke extraction.',
    'The BMS covers HVAC and lighting. The same system handles smoke extraction.',
    'The BMS covers HVAC and lighting. That system also stops the smoke fans.',
    'BMS-ul acoperă HVAC și iluminatul. Acest sistem oprește desfumarea.',
    'BMS-ul acoperă HVAC și iluminatul. Același sistem asigură desfumarea.',
    // A clause that refers back to the BMS through "its" or "there".
    'The BMS covers HVAC. Smoke extraction is also done there.',
    'The BMS monitors the fire alarm, and smoke extraction is then started from its workstation.',
    'The BMS monitors the fire alarm; from there, operators start smoke extraction.',
    'The BMS monitors the fire alarm; smoke extraction is its concern.',
    'The BMS monitors the fire alarm; smoke extraction is its job.',
    'The BMS monitors the fire alarm; smoke extraction is its business.',
    'The BMS monitors the fire alarm; smoke extraction is its responsibility.',
    'The BMS monitors the fire alarm and smoke extraction is its business.',
    // A signal from the BMS, "move", and verbs of provision off the earlier lists.
    'Fire dampers move on a signal from the BMS.',
    'The smoke fans respond to a BMS output in fire mode.',
    'Clapetele antifoc reacționează la un semnal de la BMS.',
    'The BMS monitors the fire alarm and then smoke extraction follows from it.',
    'The BMS logs the fire alarm and then smoke extraction follows from it.',
    'The BMS logs the fire alarm and smoke extraction goes ahead.',
    'The BMS monitors the fire alarm; smoke extraction then happens from its workstation.',
    // Letter by letter, through the joined text.
    'The AHUs are s t o p p e d by the BMS on fire alarm.',
  ];
  for (const text of REFUSED) {
    it(`F-PROPOSAL-04 · rule 11: refuses "${text}"`, () => {
      expect(rules(text)).toContain('life_safety_control');
    });
  }

  // The same names, anaphors and back-references with a read only; and the fire system's own parts.
  const PASSED = [
    'The BAS monitors the fire alarm.',
    'The B.M.S. displays the fire mode.',
    'The building controls display the fire mode and log the fire alarm.',
    'Sistemul de automatizare monitorizează alarma de incendiu.',
    'The BMS covers HVAC and lighting. This system also displays the fire mode.',
    'The BMS covers HVAC and lighting. The fire system stops the smoke fans.',
    'The fire controllers stop the smoke fans on fire alarm.',
    'The automation panel for smoke extraction stops the fans on fire alarm.',
    'The BMS monitors the fire dampers; each damper is tested with its own test switch.',
    'The BMS monitors the fire alarm. There is no BMS control of smoke extraction.',
    'The BMS workstation displays the fire alarms; the fire alarm repeater panel is installed there.',
    'The BMS displays the fire mode; the fire dampers close on a signal from the fire alarm panel.',
    'The BMS monitors the fire alarm, and the fire damper position is displayed on a signal from the BMS.',
    'The BMS displays the fire mode. Smoke extraction is not its concern.',
    'Monitoring of the fire dampers and the smoke fans is provided by the BMS.',
    'The BMS logs when smoke extraction happens.',
  ];
  for (const text of PASSED) {
    it(`F-PROPOSAL-04 · rule 11: passes "${text}"`, () => {
      expect(rules(text)).toEqual([]);
    });
  }

  // Documented in the header of life-safety.ts as the residual: each still passes, and the evals are the second layer.
  it.each([
    'The BMS logs the fire alarm and then smoke extraction kicks in.',
    'The BMS monitors the fire alarm; smoke extraction is arranged from its workstation.',
    'The BMS covers HVAC. Smoke extraction is also arranged there.',
    'The BMS monitors the fire alarm; smoke extraction is its call.',
    'BMS-ul monitorizează alarma de incendiu; desfumarea este sarcina sa.',
    'The plant controls stop the AHUs on fire alarm.',
  ])('F-PROPOSAL-04 · rule 11: the header of life-safety.ts lists this residual word for word, and it still passes: "%s"', (text) => {
    expect(lifeSafetyControl(checkedText(text).text)).toEqual([]);
    expect(readFileSync(new URL('./life-safety.ts', import.meta.url), 'utf8').replace(/\s*\n\s*\*\s*/gu, ' ')).toContain(text);
  });
});

// Phase 2 review, adversarial finding "homoglyphs and number glyphs pass the prose checks".
describe('the text the checks read: NFKC, format characters, look-alike letters (2.8; rule 2)', () => {
  it('F-PROPOSAL-04 · F-REGISTRY-05 · 2.8: reads a reserved term spelt with Cyrillic or Greek look-alike letters, and refuses the word that mixes scripts', () => {
    expect(rules('The chiller capacity is v\u0435rified.')).toEqual(['mixed_script', 'reserved_term']);
    expect(rules('The building is c\u043Empliant.')).toEqual(['mixed_script', 'reserved_term']);
    expect(rules('The value is c\u043E\u0578firmed.')).toContain('reserved_term');
    expect(rules('Oferta este ferm\u0103 \u0455i fin\u0430l\u0103.')).toContain('mixed_script');
    expect(rules('The capacity is \u0432\u0435\u0433\u0456fi\u0435d.')).toContain('mixed_script');
  });

  // Phase 2 fix round 3, the verifier's finding "small-capital Latin letters and letter-spaced
  // words pass reserved_term" (verify2c/ai/prose.out).
  it('F-PROPOSAL-04 · F-REGISTRY-05 · G2-11 · 2.8: reads small capitals, other Latin letter forms NFKC keeps, modifier letters and fullwidth forms as their letters', () => {
    for (const text of [
      'The value is ᴠᴇʀɪꜰɪᴇᴅ.', // ᴠᴇʀɪꜰɪᴇᴅ
      'The building is ᴄᴏᴍᴘʟɪᴀɴᴛ.', // ᴄᴏᴍᴘʟɪᴀɴᴛ
      'This is a ꜰɪʀᴍ ᴘʀɪᴄᴇ.', // ꜰɪʀᴍ ᴘʀɪᴄᴇ
      'The value is ᵛᵉʳⁱᶠⁱᵉᵈ.', // ᵛᵉʳⁱᶠⁱᵉᵈ
      'The value is ｖｅｒｉｆｉｅｄ.', // ｖｅｒｉｆｉｅｄ
      'The value is \u{1F185}erified.', // a negative squared V
      'The value is veɍified.', // an R with a stroke
    ]) {
      expect(rules(text), text).toContain('reserved_term');
    }
  });

  it('F-PROPOSAL-04 · F-REGISTRY-05 · G2-11 · 2.8: reads letter-spaced words joined, and reports them where they are written', () => {
    for (const text of [
      'The design is c o m p l i a n t.',
      'The value is V E R I F I E D.',
      'The value is v.e.r.i.f.i.e.d.',
      'The value is v-e-r-i-f-i-e-d.',
      'The value is V. E. R. I. F. I. E. D.',
      'Valoarea este v e r i f i c a t.',
      'This is the f i n a l figure.',
      'This is the f i r m  p r i c e.',
    ]) {
      expect(rules(text), text).toContain('reserved_term');
    }
    const spaced = 'The design is c o m p l i a n t.';
    expect(proseIssues(spaced, TOKENS)).toEqual([{ rule: 'reserved_term', index: spaced.indexOf('c o m'), length: 'c o m p l i a n t'.length, term: 'compliant' }]);
    expect(rules('The building has t w e l v e floors.')).toEqual(['number_word']);
    // Single letters that spell no reserved term or number stay what they were.
    expect(rules('The rooms of wing C are listed in the schedule.')).toEqual([]);
    expect(rules('Rooms A, B and C are listed in the schedule.')).toEqual([]);
    expect(rules('Zones A / B / D are served by the same plant.')).toEqual([]);
  });

  // Phase 2 fix round 4, the verifier's finding "a spaced reserved term right after a one-letter word is read
  // joined with that word" (verify2d/ai/fresh3.out): "It is a q u o t e." was read "aquote".
  it('F-PROPOSAL-04 · F-REGISTRY-05 · G2-12 · 2.8: reads every stretch of a letter-spaced run joined, so a term after a one-letter word is found', () => {
    for (const text of [
      'It is a q u o t e.',
      'This is a f i n a l figure.',
      'It is a c e r t i f i e d design.',
      'This is a q u o t a t i o n.',
      'The price is a b i n d i n g figure.',
      'Este o o f e r t ă.',
      'It is a f i r m  p r i c e.',
      'The price is a q u o t e a b c.',
    ]) {
      expect(rules(text), text).toEqual(['reserved_term']);
    }
    const afterArticle = 'It is a q u o t e.';
    expect(proseIssues(afterArticle, TOKENS)).toEqual([{ rule: 'reserved_term', index: afterArticle.indexOf('q u o'), length: 'q u o t e'.length, term: 'quote' }]);
    // Single letters and one-letter words that hold no reserved term stay what they were.
    for (const text of ['It is a b c list.', 'I am the owner.', 'See sheet A B C.', 'The labels run a b c d e f g h i j k l m n o p q r s t u v w x y z.', 'Zones A / B / D are served by the same plant.']) {
      expect(rules(text), text).toEqual([]);
    }
  });

  it('F-PROPOSAL-04 · rule 2: reads numerals in any Unicode form as digits: fullwidth, superscript, mathematical, dingbat and Roman numeral characters', () => {
    for (const text of ['The building has \uFF11\uFF12 floors.', 'Capacity is \u2078\u2070\u2070 kW.', 'Capacity is \u2791 kW.', 'Capacity is \u{1D7F4}\u{1D7EC}\u{1D7EC} kW.', 'The building has \u216B floors.', 'The building has \u2467 floors.']) {
      expect(rules(text), text).toContain('digit_outside_token');
    }
  });

  it('F-PROPOSAL-04 · rule 2: reads a Roman numeral before a counted noun as a number in words, and a label letter as a label', () => {
    expect(rules('The building has XII floors.')).toEqual(['number_word']);
    expect(rules('Clădirea are XII etaje.')).toEqual(['number_word']);
    expect(rules('The plant has IV pumps.')).toEqual(['number_word']);
    expect(rules('The rooms of wing C are listed in the schedule.')).toEqual([]);
    expect(rules('Level II rooms are listed in the schedule.')).toEqual([]);
  });

  it('F-PROPOSAL-04 · rule 2: keeps the power of a unit symbol and a listed document name as written, and positions in the text as written', () => {
    expect(rules('The gross floor area is given in m² in the schedule.')).toEqual([]);
    expect(rules('The volume is given in m³.')).toEqual([]);
    const spaced = 'Caution: a soft\u200Bspace, then 7,777 m².';
    expect(proseIssues(spaced, TOKENS)).toEqual([{ rule: 'digit_outside_token', index: spaced.indexOf('7,777'), length: 5 }]);
    const shifted = proseIssues('The ﬁnal area is 7,777 m².', TOKENS);
    expect(shifted.map((entry) => [entry.rule, entry.index, entry.length])).toEqual([
      ['reserved_term', 4, 4],
      ['digit_outside_token', 17, 5],
    ]);
  });
});

describe('compliance claims (rule 11; G11-6)', () => {
  it('F-PROPOSAL-04 · rule 11: refuses a BAC class claimed, and passes "aims to support"', () => {
    expect(rules('The design reaches BAC class A.')).toEqual(['bac_class_claim']);
    expect(rules('The building is a BAC class B building.')).toEqual(['bac_class_claim']);
    expect(rules('The design aims to support BAC class A.')).toEqual([]);
    expect(rules('The energy certificate shows energy class B.')).toEqual([]);
  });

  it('F-PROPOSAL-04 · rule 11: refuses compliance claimed in words the reserved-term list does not hold', () => {
    expect(rules('The system ensures compliance with the law on building automation.')).toEqual(['compliance_claim']);
    expect(rules('The design fulfils the requirements of the directive.')).toEqual(['compliance_claim']);
    expect(rules('Whether the directive applies depends on the rated outputs.')).toEqual([]);
  });
});

describe('questions (rule 6; G6-3)', () => {
  it('F-PROPOSAL-04 · F-EXTRACT-03 · rule 6: refuses question text', () => {
    expect(rules('Should the owner confirm the area?')).toEqual(['question_text']);
    expect(rules('Is the plant room on the roof?')).toEqual(['question_text']);
  });
});

describe('positions', () => {
  it('F-PROPOSAL-04 · rule 13: reports rule and position only', () => {
    const [issue] = proseIssues('The area is 7,777 m².', TOKENS);
    expect(issue).toEqual({ rule: 'digit_outside_token', index: 12, length: 5 });
  });
});
