/**
 * The evidence verifier (docs/guardrails.md rule 1 "Enforced by", 2.1, rule 3, rule 8, rule 13;
 * G1-4, G1-10, G1-13, G2-2 and G13-1 are the indexed cases). Unit tests of each check,
 * of the source decision, of rule 8 at verification and of the confidence cap, with the
 * phase 2 review's attacks (adversarial findings 0, 3 to 7 and 14). Every value is TEST data.
 */
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
  NO_EVENTS,
  derive,
  excerptNamesChoice,
  excerptOccurs,
  locatorShapeProblem,
  normaliseForExcerpt,
  notImplementedFeature,
  verifyProposal,
  type CandidateProposal,
  type DeriveContext,
  type DocumentRecord,
  type EvidenceLocator,
  type FieldDefinition,
  type LocatorParser,
  type ProposalContext,
  type QuantityReading,
} from './index';

const areaField: FieldDefinition = {
  key: 'test.building.area',
  label: 'TEST area',
  subject: 'building',
  kind: 'quantity',
  unit: 'm2',
  qualifiers: ['gross_total'],
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'owner',
};
const countField: FieldDefinition = { ...areaField, key: 'test.building.rooms', kind: 'count', unit: 'count', qualifiers: ['guest_rooms'] };
const floorsField: FieldDefinition = {
  ...areaField,
  key: 'test.building.floors',
  kind: 'count',
  unit: 'count',
  qualifiers: ['below_ground', 'ground', 'mezzanine', 'upper', 'setback_or_technical'],
};
const powerField: FieldDefinition = { ...areaField, key: 'test.asset.power', subject: 'asset', unit: 'kW', qualifiers: undefined };
const temperatureField: FieldDefinition = { ...areaField, key: 'test.zone.setpoint', subject: 'zone', unit: 'degC', qualifiers: undefined };
const typeField: FieldDefinition = {
  ...areaField,
  key: 'test.building.type',
  kind: 'enum',
  unit: undefined,
  qualifiers: undefined,
  options: ['hotel', 'office'],
};
const textField: FieldDefinition = { ...typeField, key: 'test.asset.interface', kind: 'text', options: undefined };
const decisionField: FieldDefinition = { ...typeField, key: 'test.scope.fire', kind: 'decision', options: ['include', 'exclude'] };

const own: DocumentRecord = {
  id: 'test-doc-own',
  projectId: 'test-project-a',
  contentHash: 'sha256:own',
  kind: 'architectural',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST' },
};
const other: DocumentRecord = { ...own, id: 'test-doc-other', contentHash: 'sha256:other' };
const foreign: DocumentRecord = { ...own, id: 'test-doc-foreign', projectId: 'test-project-b' };

/** The stored text of `own`, by page. */
const PAGES = new Map<number, string>([
  [1, 'TEST Tablou de suprafeţe. Suprafaţa construită\n desfăşurată:   2.345 mp'],
  [2, 'TEST Destinația clădirii: Hotel de categoria TEST'],
  [3, 'TEST Plan etaj curent'],
  [4, 'TEST Interfață: pregătit pentru BMS'],
  [5, 'TEST Suprafata construita desfasurata: 12.345 mp. An proiect 2025, Etaj 1'],
  [6, 'TEST Putere motor: 1.500 kW'],
  [7, 'TEST Scd cca. 2350 mp'],
  [8, 'TEST 45.600 mp'],
  [9, 'TEST Sc 2.350 mp, Scd 45.600 mp, Su 27.600 mp'],
  [10, 'TEST Regim de inaltime: 3S+P+Mz+12E+Er'],
  [11, 'TEST Temperatura exterioara de calcul: -15 °C'],
  [12, 'TEST Scd: 12 345 mp'],
  [13, 'TEST Cladirea nu este un hotel. Parcare: nu. Hotel de categoria TEST'],
  [14, 'TEST Etaj 1: 17 camere; Etaj 2: 17 camere'],
  [15, 'TEST Centrala CTA-01'],
  [16, 'TEST 212 camere'],
  [17, 'TEST 3 subsoluri si 12 etaje'],
  [18, 'TEST Scd 2345 mp'],
]);
/** The stored text of `other`, by page. */
const OTHER_PAGES = new Map<number, string>([
  [1, 'TEST Hotel de categoria TEST'],
  [2, 'TEST Scd 2345 mp'],
]);
/** Sheets of `own`: a sheet read as a whole holds its cells one per line. */
const SHEETS = new Map<string, string>([['Arii', 'Suprafata construita desfasurata:\n999 mp\nSuprafata utila']]);
const CELLS = new Map<string, string>([['Arii!B2', 'Suprafata construita desfasurata: 999 mp']]);

/**
 * The rule 8 parser's readings, as a stand-in: the number texts this TEST text holds, as the verifier hands them over
 * (one token, its approximate word and the word after it). "12 345 mp" is read the way a reader that splits a
 * space-grouped number would, into readings of its parts, which the verifier must not take.
 */
const READINGS = new Map<string, QuantityReading[]>([
  ['2.345 mp', [{ value: 2345, unit: 'm2' }, { value: 2.345, unit: 'm2' }]],
  ['2345 mp', [{ value: 2345, unit: 'm2' }]],
  ['12.345 mp', [{ value: 12345, unit: 'm2' }, { value: 12.345, unit: 'm2' }]],
  ['2025', [{ value: 2025, unit: null }]],
  ['1', [{ value: 1, unit: null }]],
  ['1.500 kW', [{ value: 1500, unit: 'kW' }, { value: 1.5, unit: 'kW' }]],
  ['cca. 2350 mp', [{ value: 2350, unit: 'm2' }]],
  ['45.600 mp', [{ value: 45600, unit: 'm2' }, { value: 45.6, unit: 'm2' }]],
  ['2.350 mp', [{ value: 2350, unit: 'm2' }, { value: 2.35, unit: 'm2' }]],
  ['27.600 mp', [{ value: 27600, unit: 'm2' }, { value: 27.6, unit: 'm2' }]],
  ['3S', [{ value: 3, unit: null }]],
  ['12E', [{ value: 12, unit: null }]],
  ['-15 °C', [{ value: 15, unit: 'degC' }]],
  ['12 345 mp', [{ value: 12, unit: null }, { value: 345, unit: 'm2' }]],
  ['17 camere', [{ value: 17, unit: null }]],
  ['2 17 camere', [{ value: 2, unit: null }]],
  ['212 camere', [{ value: 212, unit: null }]],
  ['3 subsoluri', [{ value: 3, unit: null }]],
  ['12 etaje', [{ value: 12, unit: null }]],
  ['999 mp', [{ value: 999, unit: 'm2' }]],
]);

function contextFor(field: FieldDefinition, overrides: Partial<ProposalContext> = {}): ProposalContext & { readonly asked: string[] } {
  const asked: string[] = [];
  return {
    projectId: own.projectId,
    field,
    document: (id) => [own, other, foreign].find((document) => document.id === id),
    textAt: (documentId, contentHash, locator) => {
      const record = [own, other].find((document) => document.id === documentId);
      if (record === undefined || contentHash !== record.contentHash) return undefined;
      let text: string | undefined;
      if (locator.page !== undefined) text = (record === own ? PAGES : OTHER_PAGES).get(locator.page);
      else if (record === own && locator.sheet !== undefined) text = locator.cell === undefined ? SHEETS.get(locator.sheet) : CELLS.get(`${locator.sheet}!${locator.cell}`);
      return text === undefined ? undefined : { text, layer: 'text' };
    },
    readQuantities: (text) => {
      asked.push(text);
      return READINGS.get(text) ?? [];
    },
    candidateId: 'test-cand',
    createdBy: 'test-service',
    createdAt: '2026-09-26T10:00:00.000Z',
    ...overrides,
    asked,
  };
}

const at = (page: number, excerpt: string, document: DocumentRecord = own) => ({ documentId: document.id, contentHash: document.contentHash, locator: { page }, excerpt });

const area = (overrides: Partial<CandidateProposal> = {}): CandidateProposal => ({
  subjectId: 'test-building',
  fieldKey: areaField.key,
  quantity: { value: 2345, unit: 'm2', qualifier: 'gross_total' },
  alternatives: [{ value: 2.345, unit: 'm2', qualifier: 'gross_total' }],
  source: 'document',
  evidence: [at(1, 'Suprafata construita desfasurata: 2.345 mp')],
  original: { text: '2.345 mp', locale: 'ro-RO' },
  ...overrides,
});

const choiceOf = (choice: string, page: number, excerpt: string, overrides: Partial<CandidateProposal> = {}): CandidateProposal => ({
  subjectId: 'test-building',
  fieldKey: typeField.key,
  choice,
  source: 'document',
  evidence: [at(page, excerpt)],
  ...overrides,
});

const countOf = (value: number, overrides: Partial<CandidateProposal> = {}): CandidateProposal => ({
  subjectId: 'test-building',
  fieldKey: countField.key,
  quantity: { value, unit: 'count', qualifier: 'guest_rooms' },
  source: 'ai_inference',
  confidence: 'medium',
  evidence: [1, 2, 3].map((page) => at(page, 'TEST')),
  ...overrides,
});

describe('F-EXTRACT-04 · verifyProposal, check 1: the document belongs to this project', () => {
  test("F-EXTRACT-04 · G13-1: any entry citing another project's document, or an unknown one, rejects the proposal and logs it without document text", () => {
    for (const [ids, index] of [
      [[foreign.id], 0],
      [[own.id, foreign.id], 1],
      [['test-doc-missing'], 0],
    ] as const) {
      const proposal = area({
        evidence: ids.map((documentId) => ({ documentId, contentHash: 'sha256:x', locator: { page: 1 }, excerpt: 'TEST excerpt' })),
      });
      const verdict = verifyProposal(proposal, contextFor(areaField));
      expect(verdict).toEqual({
        outcome: 'rejected',
        rejection: { kind: 'evidence_check_failed', check: 'document_in_project', evidenceIndex: index },
        guardrailEvents: [
          { type: 'evidence_not_found', projectId: own.projectId, subjectId: 'test-building', fieldKey: areaField.key, reason: 'document_in_project' },
        ],
      });
      expect(JSON.stringify(verdict)).not.toContain('TEST excerpt');
    }
  });
});

describe('F-EXTRACT-04 · verifyProposal, checks 2 to 5', () => {
  test('F-EXTRACT-04 · F-EXTRACT-06: a value written in the excerpt, at a place the stored revision holds, is accepted as document, with its check and its original set by code', () => {
    const verdict = verifyProposal(area({ original: { text: 'TEST not what the page says: 9.999 mp' } }), contextFor(areaField));
    expect(verdict.outcome).toBe('accepted');
    if (verdict.outcome !== 'accepted') return;
    expect(verdict.candidate).toMatchObject({
      id: 'test-cand',
      source: 'document',
      quantity: { value: 2345, unit: 'm2', qualifier: 'gross_total' },
      // Every reading, the quantity's own included, as 2.4 stores an ambiguous reading (rule 8).
      alternatives: [
        { value: 2345, unit: 'm2', qualifier: 'gross_total' },
        { value: 2.345, unit: 'm2', qualifier: 'gross_total' },
      ],
      confidence: 'low',
      // The matched token as the page writes it; the proposer's copy is never stored.
      original: { text: '2.345 mp' },
      createdBy: 'test-service',
    });
    // 2.4: the excerpt as the page writes it (its cedillas, breves and circumflexes, its line break and spaces), at the
    // place check 4 matched; the proposer's copy without them matched only after normalisation and is not stored.
    expect(verdict.candidate.evidence).toEqual([
      { documentId: own.id, contentHash: own.contentHash, locator: { page: 1 }, excerpt: 'Suprafaţa construită\n desfăşurată:   2.345 mp', check: 'text_match' },
    ]);
    expect(verdict).not.toHaveProperty('inference');
  });

  test('F-EXTRACT-04 · F-EXTRACT-06: a number that reads one way only is not ambiguous: no alternatives and no confidence, whatever the proposal repeats', () => {
    const proposal = area({ alternatives: [{ value: 2345, unit: 'm2', qualifier: 'gross_total' }], evidence: [at(18, 'Scd 2345 mp')] });
    const verdict = verifyProposal(proposal, contextFor(areaField));
    expect(verdict.outcome).toBe('accepted');
    if (verdict.outcome !== 'accepted') return;
    expect(verdict.candidate).not.toHaveProperty('alternatives');
    expect(verdict.candidate).not.toHaveProperty('confidence');
    expect(verdict.candidate.original).toEqual({ text: '2345 mp' });
  });

  test('F-EXTRACT-04: check 2: evidence naming another revision of the document is rejected', () => {
    const proposal = area({ evidence: [{ documentId: own.id, contentHash: 'sha256:another-revision', locator: { page: 1 }, excerpt: '2.345 mp' }] });
    const verdict = verifyProposal(proposal, contextFor(areaField));
    expect(verdict).toMatchObject({ outcome: 'rejected', rejection: { kind: 'evidence_check_failed', check: 'content_hash_matches', evidenceIndex: 0 } });
    expect(verdict.guardrailEvents).toEqual([expect.objectContaining({ type: 'evidence_not_found', reason: 'content_hash_matches' })]);
  });

  test('F-EXTRACT-04: check 3: a page the stored text does not hold is rejected', () => {
    const proposal = area({ evidence: [at(99, '2.345 mp')] });
    expect(verifyProposal(proposal, contextFor(areaField))).toMatchObject({
      outcome: 'rejected',
      rejection: { kind: 'evidence_check_failed', check: 'locator_exists', evidenceIndex: 0 },
    });
  });

  test('F-EXTRACT-04 · G1-13: check 3: a locator carrying an IFC locator or any key 2.4 does not name is refused by its shape, with or without the injected schema', () => {
    const ifc = { page: 1, ifc: { globalId: '2O2Fr$t4X7Zf8NOew3FNr2', stepIds: [100420], path: 'attr:Tag' } } as unknown as EvidenceLocator;
    const flat = { globalId: '2O2Fr$t4X7Zf8NOew3FNr2', stepIds: [100420], path: 'Pset_ChillerTypeCommon.ChillerCapacity' } as unknown as EvidenceLocator;
    const extra = { page: 1, region: 'north' } as unknown as EvidenceLocator;
    const refuseAll: LocatorParser = () => ({ ok: false, problem: 'shape' });
    for (const parseLocator of [undefined, refuseAll]) {
      for (const [locator, problem] of [
        [ifc, 'ifc_field'],
        [flat, 'ifc_field'],
        [extra, 'unknown_key'],
      ] as const) {
        const context = contextFor(areaField, parseLocator === undefined ? {} : { parseLocator });
        const verdict = verifyProposal(area({ evidence: [{ documentId: own.id, contentHash: own.contentHash, locator, excerpt: '2.345 mp' }] }), context);
        expect(verdict).toMatchObject({
          outcome: 'rejected',
          rejection: { kind: 'evidence_check_failed', check: 'locator_exists', evidenceIndex: 0, locatorProblem: problem },
        });
        expect(verdict.guardrailEvents).toEqual([expect.objectContaining({ type: 'evidence_not_found', reason: `locator_exists.${problem}` })]);
        expect(JSON.stringify(verdict)).not.toContain('2O2Fr');
      }
    }
  });

  test("F-EXTRACT-04: check 3: the injected strict schema is applied after the domain's floor", () => {
    const refuseAll: LocatorParser = () => ({ ok: false, problem: 'shape' });
    expect(verifyProposal(area(), contextFor(areaField, { parseLocator: refuseAll }))).toMatchObject({
      rejection: { check: 'locator_exists', locatorProblem: 'shape' },
    });
  });

  test('F-EXTRACT-04 · G1-4: check 4: an excerpt that does not occur at its place is rejected; whitespace and diacritics are normalised, case is not', () => {
    const wrong = area({ evidence: [at(2, '2.345 mp')] });
    expect(verifyProposal(wrong, contextFor(areaField))).toMatchObject({ rejection: { check: 'excerpt_at_locator' } });
    const page1 = PAGES.get(1) ?? '';
    expect(excerptOccurs('Suprafata  construita\tdesfasurata', page1)).toBe(true);
    expect(excerptOccurs('Suprafaţa construită desfăşurată', page1)).toBe(true);
    expect(excerptOccurs('Suprafața construită desfășurată', page1)).toBe(true);
    expect(excerptOccurs('SUPRAFATA CONSTRUITA', page1)).toBe(false);
    expect(excerptOccurs('   ', page1)).toBe(false);
    expect(normaliseForExcerpt(' a\n\tb ')).toBe('a b');
  });

  test('F-EXTRACT-04 · G1-10: check 5: a quantity that does not parse from its excerpt is not written literally, so it cannot stay document; an inferred quantity is rejected', () => {
    const verdict = verifyProposal(area({ quantity: { value: 2400, unit: 'm2', qualifier: 'gross_total' }, alternatives: undefined }), contextFor(areaField));
    expect(verdict).toMatchObject({ outcome: 'rejected', rejection: { kind: 'inferred_quantity_not_direct_count' } });
    expect(verdict.guardrailEvents).toEqual([expect.objectContaining({ type: 'ai_output_rejected', reason: 'inferred_quantity_not_direct_count' })]);
  });

  test('F-EXTRACT-04: check 5: a quantity in another unit than the excerpt names is not written literally', () => {
    const verdict = verifyProposal(area({ quantity: { value: 2345, unit: 'm3', qualifier: 'gross_total' }, alternatives: undefined }), contextFor(areaField));
    expect(verdict).toMatchObject({ outcome: 'rejected', rejection: { kind: 'inferred_quantity_not_direct_count' } });
  });

  test('F-EXTRACT-04 · F-EXTRACT-05: a text written in its excerpt is document and stored as the page writes it ("pregătit pentru BMS"); one that is not written is refused', () => {
    const proposal: CandidateProposal = {
      subjectId: 'test-asset',
      fieldKey: textField.key,
      text: 'pregatit pentru BMS',
      source: 'document',
      evidence: [at(4, 'Interfata: pregatit pentru BMS')],
    };
    expect(verifyProposal(proposal, contextFor(textField))).toMatchObject({ outcome: 'accepted', candidate: { source: 'document', text: 'pregătit pentru BMS' } });

    // Adversarial finding 14: a text labelled document that is not written would have become an inference with no
    // prose checks (AI-written words, reserved terms, digits). It is refused.
    const invented = verifyProposal({ ...proposal, text: 'BACnet/IP, certified compliant' }, contextFor(textField));
    expect(invented).toMatchObject({ outcome: 'rejected', rejection: { kind: 'text_not_written' } });
    expect(invented.guardrailEvents).toEqual([expect.objectContaining({ type: 'ai_output_rejected', reason: 'text_not_written' })]);
    // A fragment of a word is not the text written.
    expect(verifyProposal({ ...proposal, text: 'regatit pentru BMS' }, contextFor(textField))).toMatchObject({ rejection: { kind: 'text_not_written' } });
    // Every entry bears it: a second entry that does not write it is padding.
    expect(verifyProposal({ ...proposal, evidence: [at(4, 'Interfata: pregatit pentru BMS'), at(1, 'Hotel', other)] }, contextFor(textField))).toMatchObject({
      rejection: { kind: 'text_not_written' },
    });

    // A text the proposer calls an inference (the validator ran the prose checks on it) is capped at medium.
    expect(verifyProposal({ ...proposal, text: 'volt-free contacts', source: 'ai_inference', confidence: 'high' }, contextFor(textField))).toMatchObject({
      outcome: 'accepted',
      candidate: { source: 'ai_inference', text: 'volt-free contacts', confidence: 'medium' },
    });
  });

  test('F-EXTRACT-05 · G1-10: a direct count of items at the cited places may be an inference, capped at medium, never above what the proposal claimed', () => {
    for (const [claimed, stored] of [
      ['high', 'medium'],
      ['medium', 'medium'],
      ['low', 'low'],
    ] as const) {
      const verdict = verifyProposal(countOf(3, { confidence: claimed }), contextFor(countField));
      expect(verdict, claimed).toMatchObject({
        outcome: 'accepted',
        candidate: { source: 'ai_inference', confidence: stored, quantity: { value: 3, unit: 'count', qualifier: 'guest_rooms' } },
        inference: 'direct_count',
      });
      if (verdict.outcome === 'accepted') expect(verdict.candidate).not.toHaveProperty('original');
    }
    // Not a whole count of one or more: 2.5, -1, and 0 (rule 1, "Zero is a value": none found is not zero).
    for (const value of [2.5, -1, 0]) {
      expect(verifyProposal(countOf(value), contextFor(countField)), String(value)).toMatchObject({ rejection: { kind: 'inferred_quantity_not_direct_count' } });
    }
  });
});

describe('F-EXTRACT-04 · rule 1, check 4: the excerpt occurs on token boundaries (phase 2 review, adversarial finding 0)', () => {
  test('F-EXTRACT-04: a fragment of a longer number or word on the page is not an excerpt of it: "2.345 mp" of "12.345 mp", "5" of "2025", "12" of "12.345", "345 mp" of "12 345 mp", "15 °C" of "-15 °C", "otel" of "Hotel"', () => {
    const cases: [number, string, CandidateProposal, FieldDefinition][] = [
      [5, '2.345 mp', area({ evidence: [at(5, '2.345 mp')] }), areaField],
      [5, '5', { ...countOf(5, { source: 'document', evidence: [at(5, '5')] }), fieldKey: floorsField.key, quantity: { value: 5, unit: 'count', qualifier: 'upper' } }, floorsField],
      [5, 'desfasurata: 12', area({ evidence: [at(5, 'desfasurata: 12')] }), areaField],
      [5, '12.345 m', area({ evidence: [at(5, '12.345 m')] }), areaField],
      [12, '345 mp', area({ quantity: { value: 345, unit: 'm2', qualifier: 'gross_total' }, alternatives: undefined, evidence: [at(12, '345 mp')] }), areaField],
      [11, '15 °C', { ...area(), fieldKey: temperatureField.key, quantity: { value: 15, unit: 'degC' }, alternatives: undefined, evidence: [at(11, '15 °C')] }, temperatureField],
      [2, 'otel', choiceOf('hotel', 2, 'otel'), typeField],
    ];
    for (const [page, excerpt, proposal, field] of cases) {
      expect(excerptOccurs(excerpt, PAGES.get(page) ?? ''), excerpt).toBe(false);
      const verdict = verifyProposal(proposal, contextFor(field));
      expect(verdict, excerpt).toMatchObject({ outcome: 'rejected', rejection: { kind: 'evidence_check_failed', check: 'excerpt_at_locator', evidenceIndex: 0 } });
      expect(verdict.guardrailEvents, excerpt).toEqual([expect.objectContaining({ type: 'evidence_not_found', reason: 'excerpt_at_locator' })]);
    }
    // The whole token is an excerpt of it.
    for (const [page, excerpt] of [
      [5, '12.345 mp'],
      [5, 'desfasurata: 12.345 mp'],
      [5, '2025'],
      [11, '-15 °C'],
      [2, 'Hotel'],
      [12, ': 12 345 mp'],
    ] as const) {
      expect(excerptOccurs(excerpt, PAGES.get(page) ?? ''), excerpt).toBe(true);
    }
  });

  test('F-EXTRACT-04: property: an excerpt that starts or ends inside a number of the page never occurs there', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999 }),
        fc.integer({ min: 0, max: 999 }),
        fc.constantFrom('.', ','),
        fc.constantFrom(' mp', ' kW', ' camere', ''),
        fc.nat(),
        fc.nat(),
        (head, tail, separator, unit, cutA, cutB) => {
          const number = `${String(head)}${separator}${String(tail).padStart(3, '0')}`;
          const page = `TEST Valoare: ${number}${unit} (TEST)`;
          const start = page.indexOf(number);
          const end = start + number.length;
          // A cut strictly inside the number, as the excerpt's start or its end.
          const inside = start + 1 + (cutA % (number.length - 1));
          const fromInside = page.slice(inside, end + unit.length);
          const toInside = page.slice(start, start + 1 + (cutB % (number.length - 1)));
          return !excerptOccurs(fromInside, page) && !excerptOccurs(toInside, page) && excerptOccurs(page.slice(start, end + unit.length), page);
        },
      ),
    );
  });

  test('F-EXTRACT-04: a sheet cited as a whole is read one cell at a time: an excerpt joining a label cell and a number from another row does not occur; the cell itself holds it', () => {
    const excerpt = 'Suprafata construita desfasurata: 999 mp';
    const joined = area({
      quantity: { value: 999, unit: 'm2', qualifier: 'gross_total' },
      alternatives: undefined,
      evidence: [{ documentId: own.id, contentHash: own.contentHash, locator: { sheet: 'Arii' }, excerpt }],
    });
    expect(verifyProposal(joined, contextFor(areaField))).toMatchObject({ rejection: { kind: 'evidence_check_failed', check: 'excerpt_at_locator' } });
    const cell = { ...joined, evidence: [{ documentId: own.id, contentHash: own.contentHash, locator: { sheet: 'Arii', cell: 'B2' }, excerpt }] };
    expect(verifyProposal(cell, contextFor(areaField))).toMatchObject({ outcome: 'accepted', candidate: { source: 'document', quantity: { value: 999, qualifier: 'gross_total' } } });
  });

  test('F-EXTRACT-04: property: normalisation keeps its meaning (NFD, marks dropped, whitespace runs one space, trimmed), with each character mapped to where it is written', () => {
    fc.assert(
      fc.property(fc.string({ unit: fc.constantFrom('a', 'ă', 'ș', 'ş', 'T', ' ', '\n', '\t', ' ', '́', '1', '.', ',') }), (text) => {
        const expected = text.normalize('NFD').replace(/\p{M}+/gu, '').replace(/\s+/gu, ' ').trim();
        return normaliseForExcerpt(text) === expected;
      }),
    );
  });
});

describe('F-EXTRACT-04 · F-EXTRACT-06 · rule 1, check 5: the value parses from a whole number token of the excerpt (adversarial findings 0 and 3)', () => {
  test('F-EXTRACT-06: the parser is handed one token at a time, with its approximate word and the word after it', () => {
    const context = contextFor(areaField);
    verifyProposal(area({ quantity: { value: 45600, unit: 'm2', qualifier: 'gross_total' }, alternatives: undefined, evidence: [at(9, 'Sc 2.350 mp, Scd 45.600 mp')] }), context);
    expect(context.asked).toEqual(['2.350 mp', '45.600 mp']);
  });

  test('F-EXTRACT-06: only the readings of the token itself count: a reader that splits "12 345 mp" into 12 and 345 gives 345 m² no reading', () => {
    for (const value of [345, 12345]) {
      const verdict = verifyProposal(area({ quantity: { value, unit: 'm2', qualifier: 'gross_total' }, alternatives: undefined, evidence: [at(12, 'Scd: 12 345 mp')] }), contextFor(areaField));
      expect(verdict, String(value)).toMatchObject({ outcome: 'rejected', rejection: { kind: 'inferred_quantity_not_direct_count' } });
    }
  });

  test('F-EXTRACT-06: a sign is part of its number: "-15 °C" gives 15 °C no reading', () => {
    const proposal: CandidateProposal = { ...area(), fieldKey: temperatureField.key, quantity: { value: 15, unit: 'degC' }, alternatives: undefined, evidence: [at(11, '-15 °C')] };
    expect(verifyProposal(proposal, contextFor(temperatureField))).toMatchObject({ outcome: 'rejected', rejection: { kind: 'inferred_quantity_not_direct_count' } });
  });

  test('F-EXTRACT-05 · F-EXTRACT-06: a number glued to a tag states no quantity: a count of 1 read from "CTA-01" as document is no document value, and an inference cited to digits is refused unless named a direct count', () => {
    const proposal = countOf(1, { source: 'document', confidence: undefined, evidence: [at(15, 'Centrala CTA-01')] });
    const context = contextFor(countField);
    expect(verifyProposal(proposal, context)).toMatchObject({ outcome: 'rejected', rejection: { kind: 'inferred_quantity_not_direct_count' } });
    expect(context.asked).toEqual([]);
    // Named a direct count by the proposer (one AHU tag visible at the cited place), it may be an inference.
    expect(verifyProposal({ ...proposal, source: 'ai_inference', inference: 'direct_count', confidence: 'medium' }, contextFor(countField))).toMatchObject({
      outcome: 'accepted',
      candidate: { source: 'ai_inference', quantity: { value: 1 } },
      inference: 'direct_count',
    });
  });
});

describe('F-EXTRACT-06 · rule 8 at verification: both readings, the approximate word, the stated qualifier, the original (adversarial findings 3 and 4)', () => {
  test('F-EXTRACT-06: "1.500 kW" proposed as the single reading 1500 keeps both readings, with low confidence: it is never read one way silently', () => {
    const proposal: CandidateProposal = { ...area(), fieldKey: powerField.key, quantity: { value: 1500, unit: 'kW' }, alternatives: undefined, evidence: [at(6, 'Putere motor: 1.500 kW')] };
    expect(verifyProposal(proposal, contextFor(powerField))).toMatchObject({
      outcome: 'accepted',
      candidate: {
        source: 'document',
        quantity: { value: 1500, unit: 'kW' },
        alternatives: [
          { value: 1500, unit: 'kW' },
          { value: 1.5, unit: 'kW' },
        ],
        confidence: 'low',
        original: { text: '1.500 kW' },
      },
    });
    // An alternative the token does not read is no reading of it.
    expect(verifyProposal({ ...proposal, alternatives: [{ value: 15, unit: 'kW' }] }, contextFor(powerField))).toMatchObject({ outcome: 'rejected' });
  });

  test('F-EXTRACT-06: the approximate word is kept from the page, and a claim of it with no such word is not', () => {
    const approximate = area({ quantity: { value: 2350, unit: 'm2', qualifier: 'gross_total' }, alternatives: undefined, evidence: [at(7, 'Scd cca. 2350 mp')] });
    expect(verifyProposal(approximate, contextFor(areaField))).toMatchObject({
      candidate: { quantity: { value: 2350, unit: 'm2', qualifier: 'gross_total', approximate: true }, original: { text: 'cca. 2350 mp' } },
    });
    // The word just before an excerpt that leaves it out still marks the value approximate (the safe side).
    const cut = verifyProposal({ ...approximate, evidence: [at(7, '2350 mp')] }, contextFor(areaField));
    expect(cut).toMatchObject({ outcome: 'accepted', candidate: { quantity: { approximate: true }, original: { text: 'cca. 2350 mp' } } });
    const claimed = verifyProposal(area({ quantity: { value: 2345, unit: 'm2', qualifier: 'gross_total', approximate: true }, alternatives: undefined, evidence: [at(18, 'Scd 2345 mp')] }), contextFor(areaField));
    expect(claimed.outcome).toBe('accepted');
    if (claimed.outcome === 'accepted') expect(claimed.candidate.quantity).toEqual({ value: 2345, unit: 'm2', qualifier: 'gross_total' });
  });

  test('F-EXTRACT-06: a basis the excerpt does not state is unknown ("45.600 mp" alone); one it states is kept or set; another basis than the field holds is no value of it', () => {
    const bare = verifyProposal(area({ quantity: { value: 45600, unit: 'm2', qualifier: 'gross_total' }, alternatives: undefined, evidence: [at(8, '45.600 mp')] }), contextFor(areaField));
    expect(bare.outcome).toBe('accepted');
    if (bare.outcome === 'accepted') {
      expect(bare.candidate.quantity).toEqual({ value: 45600, unit: 'm2' });
      expect(bare.candidate.original).toEqual({ text: '45.600 mp' });
    }
    // Stated: kept, and set by code when the proposal names none.
    for (const qualifier of ['gross_total', undefined]) {
      const quantity = { value: 45600, unit: 'm2', ...(qualifier === undefined ? {} : { qualifier }) };
      expect(verifyProposal(area({ quantity, alternatives: undefined, evidence: [at(9, 'Sc 2.350 mp, Scd 45.600 mp')] }), contextFor(areaField)), String(qualifier)).toMatchObject({
        outcome: 'accepted',
        candidate: { quantity: { value: 45600, qualifier: 'gross_total' } },
      });
    }
    // The nearest basis is the number's own: Sc's 2350 is no gross area, and Su's 27600 neither.
    for (const [value, excerpt] of [
      [2350, 'Sc 2.350 mp'],
      [27600, 'Su 27.600 mp'],
    ] as const) {
      for (const qualifier of ['gross_total', undefined]) {
        const quantity = { value, unit: 'm2', ...(qualifier === undefined ? {} : { qualifier }) };
        const verdict = verifyProposal(area({ quantity, alternatives: undefined, evidence: [at(9, excerpt)] }), contextFor(areaField));
        expect(verdict, `${excerpt} ${String(qualifier)}`).toMatchObject({ outcome: 'rejected', rejection: { kind: 'evidence_check_failed', check: 'value_in_excerpt', evidenceIndex: 0 } });
        expect(verdict.guardrailEvents).toEqual([expect.objectContaining({ type: 'evidence_not_found', reason: 'value_in_excerpt' })]);
      }
    }
  });

  test('F-EXTRACT-06: floors by level type: the regim letters of rule 8\'s example and the level words state the level type', () => {
    const floors = (value: number, qualifier: string, page: number, excerpt: string): CandidateProposal => ({
      subjectId: 'test-building',
      fieldKey: floorsField.key,
      quantity: { value, unit: 'count', qualifier },
      source: 'document',
      evidence: [at(page, excerpt)],
    });
    for (const [proposal, stated] of [
      [floors(12, 'upper', 10, 'Regim de inaltime: 3S+P+Mz+12E+Er'), 'upper'],
      [floors(3, 'below_ground', 10, 'Regim de inaltime: 3S+P+Mz+12E+Er'), 'below_ground'],
      [floors(3, 'below_ground', 17, '3 subsoluri si 12 etaje'), 'below_ground'],
      [floors(12, 'upper', 17, '3 subsoluri si 12 etaje'), 'upper'],
    ] as const) {
      expect(verifyProposal(proposal, contextFor(floorsField)), JSON.stringify(proposal.quantity)).toMatchObject({
        outcome: 'accepted',
        candidate: { source: 'document', quantity: { value: proposal.quantity?.value, qualifier: stated } },
      });
    }
    const wrongLevel = verifyProposal(floors(12, 'below_ground', 10, 'Regim de inaltime: 3S+P+Mz+12E+Er'), contextFor(floorsField));
    expect(wrongLevel).toMatchObject({ outcome: 'rejected', rejection: { check: 'value_in_excerpt' } });
    const regim = verifyProposal(floors(12, 'upper', 10, 'Regim de inaltime: 3S+P+Mz+12E+Er'), contextFor(floorsField));
    if (regim.outcome === 'accepted') expect(regim.candidate.original).toEqual({ text: '12E' });
  });
});

describe('F-EXTRACT-05 · sources, confidence and inference limits (adversarial findings 4 to 7)', () => {
  test('F-EXTRACT-05: every evidence entry of a document value bears it: a value padded with another document\'s unrelated excerpt is rejected', () => {
    const padded = area({ quantity: { value: 2345, unit: 'm2', qualifier: 'gross_total' }, alternatives: undefined, evidence: [at(18, 'Scd 2345 mp'), at(1, 'Hotel', other)] });
    const verdict = verifyProposal(padded, contextFor(areaField));
    expect(verdict).toMatchObject({ outcome: 'rejected', rejection: { kind: 'evidence_check_failed', check: 'value_in_excerpt', evidenceIndex: 1 } });
    expect(verdict.guardrailEvents).toEqual([expect.objectContaining({ type: 'evidence_not_found', reason: 'value_in_excerpt' })]);
    // Two documents that both state it: one value with two value-bearing entries.
    const both = verifyProposal({ ...padded, evidence: [at(18, 'Scd 2345 mp'), at(2, 'Scd 2345 mp', other)] }, contextFor(areaField));
    expect(both).toMatchObject({ outcome: 'accepted', candidate: { source: 'document', evidence: [{ documentId: own.id }, { documentId: other.id }] } });
  });

  test('F-EXTRACT-05: deleting the only document that bears a value withdraws it: the field returns to unknown (2.3, "Deleting a document"), since no padding entry can keep it', () => {
    const verdict = verifyProposal(area({ quantity: { value: 2345, unit: 'm2', qualifier: 'gross_total' }, alternatives: undefined, evidence: [at(18, 'Scd 2345 mp')] }), contextFor(areaField));
    expect(verdict.outcome).toBe('accepted');
    if (verdict.outcome !== 'accepted') return;
    const deriveContext: DeriveContext = {
      subjectId: 'test-building',
      document: (id) => [own, other].find((document) => document.id === id),
      inputState: () => undefined,
      datasetApproved: () => false,
      unit: (code) => (code === 'm2' ? { code, symbol: 'm²', dimension: 'area' } : undefined),
    };
    const candidate = { ...verdict.candidate, authorRole: 'system' as const };
    expect(derive(areaField, [candidate], NO_EVENTS, deriveContext).state).toBe('known');
    const deleted = derive(
      areaField,
      [candidate],
      { ...NO_EVENTS, document: [{ documentId: own.id, type: 'withdrawn', by: 'test-owner', role: 'owner', at: '2026-09-26T11:00:00.000Z' }] },
      deriveContext,
    );
    expect(deleted).toMatchObject({ state: 'unknown', activeCandidateId: null });
    expect(deleted.statusLines).toContain('source_document_removed');
  });

  test('F-EXTRACT-05: a choice is never document from a word alone: it is an inference, high only when an excerpt names the option; a registered label-value pattern makes it document', () => {
    const hotel = choiceOf('hotel', 2, 'Destinatia cladirii: Hotel');
    const named = verifyProposal({ ...hotel, confidence: 'high' }, contextFor(typeField));
    expect(named).toMatchObject({ outcome: 'accepted', candidate: { source: 'ai_inference', choice: 'hotel', confidence: 'high' } });
    // Claimed as written, with no confidence: the tier its evidence gives, high where the excerpt names it (section 4).
    expect(verifyProposal(hotel, contextFor(typeField))).toMatchObject({ outcome: 'accepted', candidate: { source: 'ai_inference', confidence: 'high' } });
    // An inference that claims no confidence is low.
    expect(verifyProposal({ ...hotel, source: 'ai_inference' }, contextFor(typeField))).toMatchObject({ outcome: 'accepted', candidate: { source: 'ai_inference', confidence: 'low' } });

    // The option is not named: capped at medium, whatever the proposal claims, and low when it claims none.
    expect(verifyProposal({ ...hotel, choice: 'office', confidence: 'high' }, contextFor(typeField))).toMatchObject({
      outcome: 'accepted',
      candidate: { source: 'ai_inference', choice: 'office', confidence: 'medium' },
    });
    expect(verifyProposal({ ...hotel, choice: 'office' }, contextFor(typeField))).toMatchObject({ outcome: 'accepted', candidate: { confidence: 'low' } });

    // With a label-value pattern of the registry (a TEST one here), the choice written literally is document.
    const labelValue = (choice: string, excerpt: string): boolean => new RegExp(`Destinatia cladirii: ${choice}\\b`, 'iu').test(excerpt);
    const document = verifyProposal(hotel, contextFor(typeField, { labelValue }));
    expect(document).toMatchObject({ outcome: 'accepted', candidate: { source: 'document', choice: 'hotel' } });
    if (document.outcome === 'accepted') expect(document.candidate).not.toHaveProperty('confidence');
  });

  test('F-EXTRACT-05: section 4\'s example: a building type inferred from "212 camere" is Possible (medium), never Likely, whatever the proposal claims', () => {
    const verdict = verifyProposal(choiceOf('hotel', 16, '212 camere', { source: 'ai_inference', inference: 'classification', confidence: 'high' }), contextFor(typeField));
    expect(verdict).toMatchObject({ outcome: 'accepted', candidate: { source: 'ai_inference', choice: 'hotel', confidence: 'medium' }, inference: 'classification' });
  });

  test('F-EXTRACT-05: a choice whose every mention in the evidence is negated is refused ("nu este un hotel"), also when the excerpt leaves the negation out', () => {
    for (const excerpt of ['Cladirea nu este un hotel.', 'este un hotel']) {
      for (const source of ['document', 'ai_inference'] as const) {
        const verdict = verifyProposal(choiceOf('hotel', 13, excerpt, { source, confidence: 'high' }), contextFor(typeField));
        expect(verdict, `${excerpt} ${source}`).toMatchObject({ outcome: 'rejected', rejection: { kind: 'choice_negated' } });
        expect(verdict.guardrailEvents).toEqual([expect.objectContaining({ type: 'ai_output_rejected', reason: 'choice_negated' })]);
      }
    }
    // A negation in another clause does not govern the mention.
    expect(verifyProposal(choiceOf('hotel', 13, 'Parcare: nu. Hotel', { confidence: 'high' }), contextFor(typeField))).toMatchObject({
      outcome: 'accepted',
      candidate: { source: 'ai_inference', confidence: 'high' },
    });
    // With a mention that is not negated as well, the option is named.
    const mixed = verifyProposal({ ...choiceOf('hotel', 13, 'Cladirea nu este un hotel.', { confidence: 'high' }), evidence: [at(13, 'Cladirea nu este un hotel.'), at(1, 'Hotel', other)] }, contextFor(typeField));
    expect(mixed).toMatchObject({ outcome: 'accepted', candidate: { confidence: 'high' } });
  });

  test('F-EXTRACT-05: an inferred count needs its basis: a sum labelled document is refused, and so is a count named another kind of inference', () => {
    // Adversarial finding 7: "17 camere" and "17 camere" summed to 34 and labelled document.
    const sum = countOf(34, { source: 'document', confidence: undefined, evidence: [at(14, 'Etaj 1: 17 camere; Etaj 2: 17 camere')] });
    expect(verifyProposal(sum, contextFor(countField))).toMatchObject({ outcome: 'rejected', rejection: { kind: 'inferred_quantity_not_direct_count' } });
    // A count cited to digits without the name of a direct count is refused; with it, it may stand.
    expect(verifyProposal({ ...sum, source: 'ai_inference' }, contextFor(countField))).toMatchObject({ rejection: { kind: 'inferred_quantity_not_direct_count' } });
    expect(verifyProposal(countOf(3, { inference: 'type_from_symbol' }), contextFor(countField))).toMatchObject({ rejection: { kind: 'inferred_quantity_not_direct_count' } });
    // The literal value itself is document: 17 guest rooms read from "17 camere", its qualifier unknown (rule 8 names no word for it).
    const literal = verifyProposal(countOf(17, { source: 'document', confidence: undefined, evidence: [at(14, 'Etaj 1: 17 camere')] }), contextFor(countField));
    expect(literal).toMatchObject({ outcome: 'accepted', candidate: { source: 'document', quantity: { value: 17, unit: 'count' }, original: { text: '17 camere' } } });
    if (literal.outcome === 'accepted') expect(literal.candidate.quantity).not.toHaveProperty('qualifier');
  });
});

describe('F-EXTRACT-04 · verifyProposal, the shape of a proposal', () => {
  test('F-EXTRACT-04: a source the AI and the extractor may not propose, another field, a value of the wrong kind, an unlisted choice or an inference kind that does not fit is refused', () => {
    const base = area();
    const cases: [CandidateProposal, FieldDefinition, string][] = [
      [{ ...base, source: 'user' as never }, areaField, 'source'],
      [{ ...base, source: 'reference' as never }, areaField, 'source'],
      [{ ...base, fieldKey: 'test.other' }, areaField, 'field'],
      [{ ...base, choice: 'hotel' }, areaField, 'value_kind'],
      [choiceOf('castle', 2, 'Hotel'), typeField, 'choice_not_listed'],
      [{ ...base, inference: 'direct_count' }, areaField, 'inference_kind'],
      [choiceOf('hotel', 2, 'Hotel', { source: 'ai_inference', inference: 'direct_count' }), typeField, 'inference_kind'],
      [choiceOf('hotel', 2, 'Hotel', { source: 'ai_inference', inference: 'guess' as never }), typeField, 'inference_kind'],
    ];
    for (const [proposal, field, problem] of cases) {
      const verdict = verifyProposal(proposal, contextFor(field));
      expect(verdict, problem).toMatchObject({ outcome: 'rejected', rejection: { kind: 'malformed', problem } });
      expect(verdict.guardrailEvents).toEqual([expect.objectContaining({ type: 'ai_output_rejected', reason: `proposal_${problem}` })]);
    }
  });

  test("F-EXTRACT-04 · G3-9: no document or inference ever sets an owner's decision", () => {
    const include: CandidateProposal = { subjectId: 'test-project-a', fieldKey: decisionField.key, choice: 'include', source: 'document', evidence: [at(2, 'Hotel')] };
    for (const source of ['document', 'ai_inference'] as const) {
      expect(verifyProposal({ ...include, source }, contextFor(decisionField))).toMatchObject({
        outcome: 'rejected',
        rejection: { kind: 'malformed', problem: 'decision_field' },
      });
    }
  });

  test('F-EXTRACT-04: a proposal with no evidence is rejected and logged', () => {
    expect(verifyProposal(area({ evidence: [] }), contextFor(areaField))).toMatchObject({
      outcome: 'rejected',
      rejection: { kind: 'no_evidence' },
      guardrailEvents: [expect.objectContaining({ type: 'evidence_not_found', reason: 'no_evidence' })],
    });
  });

  test('F-EXTRACT-04: the harness probe: a call with no proposal, or with no context, reaches the verify-proposal stub, and nothing else does', () => {
    const probe = (call: () => unknown): string | undefined => {
      try {
        call();
      } catch (error) {
        return notImplementedFeature(error);
      }
      return undefined;
    };
    const loose = verifyProposal as unknown as (...args: unknown[]) => unknown;
    expect(probe(() => loose())).toBe('verify-proposal');
    expect(probe(() => loose(undefined, {}))).toBe('verify-proposal');
    expect(probe(() => loose({}, {}))).toBe('verify-proposal');
    expect(probe(() => loose({}, { document: () => undefined }))).toBe('verify-proposal');
  });
});

describe('F-EXTRACT-04 · the locator shape floor (2.4 Evidence.locator)', () => {
  test('F-EXTRACT-04: accepts a page with an optional ordered box, and a sheet with an optional cell; refuses every other shape', () => {
    expect(locatorShapeProblem({ page: 3 })).toBeUndefined();
    expect(locatorShapeProblem({ page: 3, bbox: [0, 0, 10, 10] })).toBeUndefined();
    expect(locatorShapeProblem({ sheet: 'Camere' })).toBeUndefined();
    expect(locatorShapeProblem({ sheet: 'Camere', cell: 'B4' })).toBeUndefined();
    for (const bad of [null, [], 'page:3', {}, { page: 0 }, { page: 1.5 }, { page: 1, sheet: 'A' }, { cell: 'B4' }, { page: 1, bbox: [10, 0, 0, 10] }, { sheet: 'A', bbox: [0, 0, 1, 1] }, { sheet: '  ' }]) {
      expect(locatorShapeProblem(bad), JSON.stringify(bad)).toBe('shape');
    }
  });

  test('F-EXTRACT-04 · G1-13: property: any IFC key refuses the locator as ifc_field, whatever else it carries', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('ifc', 'globalId', 'globalIds', 'guid', 'stepId', 'stepIds', 'step', 'path', 'GlobalId', 'STEPIDS'),
        fc.anything(),
        fc.record({ page: fc.integer({ min: 1, max: 99 }) }, { requiredKeys: [] }),
        (key, value, rest) => locatorShapeProblem({ ...rest, [key]: value }) === 'ifc_field',
      ),
    );
  });
});

describe('F-EXTRACT-04 · 2.4: the stored excerpt is verbatim, the located text as written (fix round 3)', () => {
  test('F-EXTRACT-04 · rule 13: the excerpt stored is the slice of the page check 4 matched, with its diacritics, never the proposer\'s copy without them', () => {
    const page = 'TEST Suprafață construită desfășurată: 2345 mp';
    const verdict = verifyProposal(
      area({ quantity: { value: 2345, unit: 'm2', qualifier: 'gross_total' }, alternatives: undefined, evidence: [at(1, 'Suprafata construita desfasurata: 2345 mp')] }),
      contextFor(areaField, { textAt: () => ({ text: page, layer: 'text' }) }),
    );
    expect(verdict.outcome).toBe('accepted');
    if (verdict.outcome !== 'accepted') return;
    expect(verdict.candidate.evidence.map((entry) => entry.excerpt)).toEqual(['Suprafață construită desfășurată: 2345 mp']);
    expect(page).toContain(verdict.candidate.evidence[0]?.excerpt);
  });

  test('F-EXTRACT-04: a diacritic written as a combining mark after the excerpt\'s last letter is kept with it', () => {
    // "zonă" and "clădire" in NFD: the breve is its own character, after its letter.
    const page = 'TEST Scd 2345 mp, zonă clădire';
    const verdict = verifyProposal(
      area({ quantity: { value: 2345, unit: 'm2', qualifier: 'gross_total' }, alternatives: undefined, evidence: [at(1, 'Scd 2345 mp, zona')] }),
      contextFor(areaField, { textAt: () => ({ text: page, layer: 'text' }) }),
    );
    expect(verdict.outcome).toBe('accepted');
    if (verdict.outcome !== 'accepted') return;
    expect(verdict.candidate.evidence[0]?.excerpt).toBe('Scd 2345 mp, zonă');
  });

  test('F-EXTRACT-04: a choice, a text and a sheet cell: each entry stores the place it was matched at, as written', () => {
    const choice = verifyProposal(choiceOf('hotel', 2, 'Destinatia cladirii: Hotel', { source: 'ai_inference', confidence: 'high' }), contextFor(typeField));
    expect(choice).toMatchObject({ outcome: 'accepted', candidate: { evidence: [{ excerpt: 'Destinația clădirii: Hotel' }] } });
    const text = verifyProposal(
      { subjectId: 'test-building', fieldKey: textField.key, text: 'pregatit pentru BMS', source: 'document', evidence: [at(4, 'Interfata: pregatit pentru BMS')] },
      contextFor(textField),
    );
    expect(text).toMatchObject({ outcome: 'accepted', candidate: { text: 'pregătit pentru BMS', evidence: [{ excerpt: 'Interfață: pregătit pentru BMS' }] } });
    const cell = verifyProposal(
      area({ quantity: { value: 999, unit: 'm2' }, alternatives: undefined, evidence: [{ documentId: own.id, contentHash: own.contentHash, locator: { sheet: 'Arii' }, excerpt: '999  mp' }] }),
      contextFor(areaField),
    );
    expect(cell).toMatchObject({ outcome: 'accepted', candidate: { evidence: [{ excerpt: '999 mp', locator: { sheet: 'Arii' } }] } });
  });

  test('F-EXTRACT-04: property: the stored excerpt is a slice of the located text, and reads as the proposer\'s excerpt after normalisation', () => {
    const label = fc.constantFrom('Suprafață construită desfășurată', 'Suprafaţa construită desfăşurată', 'Suprafata construita desfasurata', 'Supráfată construită desfăşurată');
    const space = fc.constantFrom(' ', '  ', '\n ', '\t');
    fc.assert(
      fc.property(label, space, space, (written, gap, after) => {
        const page = `TEST Tablou.${gap}${written}:${after}2345 mp (TEST)`;
        const proposed = 'Suprafata construita desfasurata: 2345 mp';
        const verdict = verifyProposal(
          area({ quantity: { value: 2345, unit: 'm2', qualifier: 'gross_total' }, alternatives: undefined, evidence: [at(1, proposed)] }),
          contextFor(areaField, { textAt: () => ({ text: page, layer: 'text' }) }),
        );
        if (verdict.outcome !== 'accepted') return false;
        const stored = verdict.candidate.evidence[0]?.excerpt ?? '';
        return page.includes(stored) && stored.startsWith(written) && stored.endsWith('2345 mp') && normaliseForExcerpt(stored) === normaliseForExcerpt(proposed);
      }),
    );
  });
});

describe('F-EXTRACT-05 · rule 3 and 2.3: the cap holds again from what is stored (fix round 3)', () => {
  test('F-EXTRACT-05: an excerpt read on its own names the option unless a negation governs it there', () => {
    expect(excerptNamesChoice('hotel', 'Destinația clădirii: Hotel')).toBe(true);
    expect(excerptNamesChoice('hotel', 'un hotel.')).toBe(true);
    expect(excerptNamesChoice('hotel', 'Cladirea nu este un hotel.')).toBe(false);
    expect(excerptNamesChoice('hotel', 'Parcare: nu. Hotel')).toBe(true);
    expect(excerptNamesChoice('hotel', '212 camere')).toBe(false);
    expect(excerptNamesChoice('hotel', 'Hotelier')).toBe(false);
    expect(excerptNamesChoice('hotel', '[erased]')).toBe(false);
  });

  test('F-EXTRACT-05: an entry whose excerpt leaves out the negation its page writes keeps the inference below high, beside an entry that names the option', () => {
    // Page 13 writes "Cladirea nu este un hotel."; the excerpt "este un hotel" leaves the negation out.
    const hidden = verifyProposal(
      { ...choiceOf('hotel', 13, 'este un hotel', { source: 'ai_inference', confidence: 'high' }), evidence: [at(13, 'este un hotel'), at(1, 'Hotel', other)] },
      contextFor(typeField),
    );
    expect(hidden).toMatchObject({ outcome: 'accepted', candidate: { confidence: 'medium', evidence: [{ excerpt: 'este un hotel' }, { excerpt: 'Hotel' }] } });
    // With the negation inside its excerpt, the entry reads as negated on its own too: the other entry's name gives high.
    const shown = verifyProposal(
      { ...choiceOf('hotel', 13, 'Cladirea nu este un hotel.', { source: 'ai_inference', confidence: 'high' }), evidence: [at(13, 'Cladirea nu este un hotel.'), at(1, 'Hotel', other)] },
      contextFor(typeField),
    );
    expect(shown).toMatchObject({ outcome: 'accepted', candidate: { confidence: 'high' } });
  });
});
