/**
 * (The contract's sample corpus is read with the YAML reader restricted to JSON, as the
 * API reads the extractor's output: no-json-parse.)
 *
 * The pure parts of ingestion: the readings the verifier's check 5 reads from an excerpt
 * (the rule 8 parser; G8-1, G8-3 as data), the extraction request (prompt 3 5.4: no IFC
 * values and no dataset while `ifc-values` is closed), the text parts and coverage taken
 * from an output (rule 12, rule 14), and the strict locator parser the verifier gets
 * (G1-13). Every value is TEST data or the extraction contract's own samples.
 */
import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { parseExtractionOutput } from '@sovitech/extraction-contract';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { coverageOf, extractionRequestFor, textPartsOf } from './extraction';
import { verifyProposal, type CandidateProposal, type FieldDefinition, type ProposalContext } from '@sovitech/domain';
import { contractLocatorParser, partOf, proposalForVerifier } from './proposals';
import { readQuantities } from './quantities';

const corpus = parse(readFileSync(new URL('../../../../packages/extraction-contract/src/samples/corpus.json', import.meta.url), 'utf8'), { schema: 'json' }) as {
  cases: { name: string; value?: unknown }[];
};
function sample(name: string) {
  const parsed = parseExtractionOutput(corpus.cases.find((entry) => entry.name === name)?.value);
  if (!parsed.ok) throw new Error(`the contract sample ${name} does not parse`);
  return parsed.value;
}

describe('the readings of an excerpt (rule 8 parser)', () => {
  it('F-EXTRACT-06 · F-REGISTRY-03 · rule 8: reads a quantity with its unit, both readings of an ambiguous number, and a bare number with no unit', () => {
    expect(readQuantities('Sc 1.234 mp, Scd 6.170 mp')).toEqual(
      expect.arrayContaining([
        { value: 6170, unit: 'm2' },
        { value: 6.17, unit: 'm2' },
        { value: 1234, unit: 'm2' },
      ]),
    );
    expect(readQuantities('Putere motor: 1.500 kW')).toEqual(expect.arrayContaining([{ value: 1500, unit: 'kW' }, { value: 1.5, unit: 'kW' }]));
    expect(readQuantities('H = 8 mCA')).toEqual([expect.objectContaining({ value: 8 })]);
    expect(readQuantities('Regim de inaltime: 2S+P+2E')).toEqual([{ value: 2, unit: null }]);
    expect(readQuantities('Numar camere: 17')).toEqual([{ value: 17, unit: null }]);
    expect(readQuantities('TEST fara numere')).toEqual([]);
  });

  it('F-EXTRACT-06 · F-REGISTRY-03 · rule 8: reads a whole number token: thousands groups joined by a space, and a minus sign that belongs to the number', () => {
    expect(readQuantities('1 500 kW')).toEqual([{ value: 1500, unit: 'kW' }]);
    expect(readQuantities('12 345,5 mp')).toEqual([{ value: 12345.5, unit: 'm2' }]);
    expect(readQuantities('-15 °C')).toEqual([expect.objectContaining({ value: -15 })]);
    expect(readQuantities('\u221215 °C')).toEqual([expect.objectContaining({ value: -15 })]);
    // A minus glued to a word is a tag's hyphen, not a sign; a space before a group of other than three digits ends the number.
    expect(readQuantities('CTA-01')).toEqual([{ value: 1, unit: null }]);
    expect(readQuantities('Etaj 3 subsoluri')).toEqual([{ value: 3, unit: null }]);
    expect(readQuantities('2 camere')).toEqual([{ value: 2, unit: null }]);
  });
});

describe('the extraction request', () => {
  it('US-IFC-01 · US-IFC-05 · F-INGEST-03 · prompt 3 5.4: asks for no IFC values, mounts no dataset and asks for no derivative while ifc-values is closed; the IDS goes with a model only', () => {
    const job = { projectId: '0192f0a0-0000-7000-8000-00000000c0a1', documentId: '0192f0a0-0000-7000-8000-00000000d0c1', contentHash: `sha256:${'c'.repeat(64)}` };
    const ids = { id: 'sovitech-ifc-minimum', version: '0.1', draft: true, sha256: `sha256:${'d'.repeat(64)}`, path: '/TEST/ids.ids' };
    const model = extractionRequestFor(job, 'ifc', assertGatesStartupSafe(), ids);
    expect(model).toMatchObject({ declaredFormat: 'ifc', ifcValues: false, datasets: [], derivatives: [], ids: { id: ids.id, version: '0.1', draft: true, sha256: ids.sha256 } });
    expect(model.ids).not.toHaveProperty('path');
    expect(extractionRequestFor(job, 'pdf', assertGatesStartupSafe(), ids)).not.toHaveProperty('ids');
  });
});

describe('what the API takes from an output', () => {
  it("US-DOCS-10 · F-EXTRACT-01 · F-EXTRACT-10 · rule 14: stores each page's visible text and each visible cell, never hidden text", () => {
    const pdf = textPartsOf(sample('pdf-partly-analysed'));
    expect(pdf.map((part) => part.part)).toEqual(['page:1', 'page:2', 'page:4']);
    const xlsx = textPartsOf(sample('xlsx-analysed'));
    expect(xlsx).toEqual([
      { part: 'cell:Camere!A1', text: 'Camera TEST' },
      { part: 'cell:Camere!B2', text: '17.25' },
      { part: 'sheet:Camere', text: 'Camera TEST\n17.25' },
    ]);
  });

  it('US-DOCS-03 · F-INGEST-05 · rule 12: records the coverage the extractor recorded: pages read, sheets read, a stored model, a failure', () => {
    expect(coverageOf(sample('pdf-partly-analysed'))).toEqual({ status: 'partly_analysed', coverage: { kind: 'read', unit: 'pages', ranges: [{ first: 1, last: 2 }, { first: 4, last: 4 }], total: 5 } });
    expect(coverageOf(sample('xlsx-analysed'))).toEqual({ status: 'analysed', coverage: { kind: 'read', unit: 'sheets', ranges: [{ first: 1, last: 1 }, { first: 2, last: 2 }], total: 2 } });
    // A workbook with a sheet not read is partly analysed, in sheets (the phase 2 review; the contract's corpus).
    expect(coverageOf(sample('xlsx-partly-analysed-sheets'))).toEqual({ status: 'partly_analysed', coverage: { kind: 'read', unit: 'sheets', ranges: [{ first: 1, last: 1 }, { first: 2, last: 2 }], total: 3 } });
    expect(coverageOf(sample('ifc-gate-closed'))).toEqual({ status: 'stored_only', coverage: { kind: 'stored', word: 'IFC model' } });
    expect(coverageOf(sample('pdf-failed'))).toEqual({ status: 'failed', coverage: { kind: 'none' } });
  });
});

describe('the locator as the verifier reads it', () => {
  it('US-DOCS-07 · F-EXTRACT-04 · rule 1: names a stored text part only for a page, a cell or a sheet; a region resolves to nothing', () => {
    expect(partOf({ page: 3 })).toBe('page:3');
    expect(partOf({ sheet: 'Camere', cell: 'B4' })).toBe('cell:Camere!B4');
    expect(partOf({ sheet: 'Camere' })).toBe('sheet:Camere');
    expect(partOf({ page: 3, bbox: [0, 0, 1, 1] })).toBeUndefined();
  });

  it("G1-13 · US-DOCS-07 · F-EXTRACT-04: refuses an IFC locator with the contract's own code", () => {
    expect(contractLocatorParser({ page: 2 })).toEqual({ ok: true, locator: { page: 2 } });
    expect(contractLocatorParser({ globalId: '2O2Fr$t4X7Zf8NOew3FNr2', stepIds: [100] })).toEqual({ ok: false, problem: 'ifc_field' });
    expect(contractLocatorParser({ page: 1, region: 'north' })).toEqual({ ok: false, problem: 'unknown_key' });
    expect(contractLocatorParser({ page: 1, sheet: 'A' })).toEqual({ ok: false, problem: 'shape' });
  });
});

describe('the inference kind on the one ingestion path (P-2-INFERENCE-KIND stays a proposal)', () => {
  const roomsField: FieldDefinition = {
    key: 'test.building.rooms',
    label: 'TEST rooms',
    subject: 'building',
    kind: 'count',
    unit: 'count',
    qualifiers: ['guest_rooms'],
    estimation: 'forbidden',
    criticality: 'optional',
    affects: [],
    impactRank: 1,
    confirmBy: 'owner',
  };
  const typeField: FieldDefinition = { ...roomsField, key: 'test.building.type', kind: 'enum', unit: undefined, qualifiers: undefined, options: ['hotel', 'office'] };
  const record = { id: 'test-doc', projectId: 'test-project', contentHash: 'sha256:test-doc', kind: 'other', stage: 'unknown', analysis: { status: 'analysed', coverage: 'TEST' } } as const;
  const PAGES = new Map<number, string>([
    [1, 'TEST Tabel camere: 212 camere'],
    [2, 'TEST ventilator de perete, ventilator de perete, ventilator de perete'],
  ]);
  const contextFor = (field: FieldDefinition): ProposalContext => ({
    projectId: record.projectId,
    field,
    document: (id) => (id === record.id ? record : undefined),
    textAt: (documentId, contentHash, locator) => {
      const text = locator.page === undefined ? undefined : PAGES.get(locator.page);
      return documentId !== record.id || contentHash !== record.contentHash || text === undefined ? undefined : { text, layer: 'text' };
    },
    readQuantities,
    parseLocator: contractLocatorParser,
    candidateId: 'test-cand',
    createdBy: 'test-service',
    createdAt: '2026-09-30T10:00:00.000Z',
  });
  const cite = (page: number, excerpt: string) => [{ documentId: record.id, contentHash: record.contentHash, locator: { page }, excerpt }];
  const count = (value: number, overrides: Partial<CandidateProposal> = {}): CandidateProposal => ({
    subjectId: 'test-building',
    fieldKey: roomsField.key,
    quantity: { value, unit: 'count' },
    source: 'ai_inference',
    inference: 'direct_count',
    confidence: 'medium',
    evidence: cite(1, '212 camere'),
    ...overrides,
  });

  it('F-EXTRACT-05 · rule 1 · G1-21: the domain verifier accepts a count named a direct count over "212 camere"; the one ingestion path hands it over without the name, so it is refused', () => {
    // Latent in the domain (G1-21's control pins it there) ...
    expect(verifyProposal(count(212), contextFor(roomsField))).toMatchObject({ outcome: 'accepted', candidate: { source: 'ai_inference' } });
    // ... and unreachable through ingestion: the name is not passed, as the AI boundary does not pass it.
    expect(proposalForVerifier(count(212))).not.toHaveProperty('inference');
    expect(verifyProposal(proposalForVerifier(count(212)), contextFor(roomsField))).toMatchObject({
      outcome: 'rejected',
      rejection: { kind: 'inferred_quantity_not_direct_count' },
    });
    // A count over excerpts that hold no digit stands as before.
    const symbols = count(3, { evidence: cite(2, 'ventilator de perete, ventilator de perete, ventilator de perete') });
    expect(verifyProposal(proposalForVerifier(symbols), contextFor(roomsField))).toEqual(verifyProposal(symbols, contextFor(roomsField)));
  });

  it('F-EXTRACT-05 · rule 1: property: what the ingestion path hands the verifier is never let through where the proposal as named would be refused, and an accepted one is stored unchanged', () => {
    const proposals = fc.record({
      source: fc.constantFrom<'document' | 'ai_inference'>('document', 'ai_inference'),
      inference: fc.constantFrom<CandidateProposal['inference'] | 'none'>('none', 'direct_count', 'type_from_text', 'type_from_symbol', 'abbreviation_expansion', 'classification'),
      value: fc.constantFrom<'count' | 'choice'>('count', 'choice'),
      amount: fc.constantFrom(0, 3, 212),
      page: fc.constantFrom(1, 2),
      confidence: fc.constantFrom<CandidateProposal['confidence'] | 'none'>('none', 'high', 'medium', 'low'),
    });
    fc.assert(
      fc.property(proposals, (drawn) => {
        const field = drawn.value === 'count' ? roomsField : typeField;
        const excerpt = drawn.page === 1 ? '212 camere' : 'ventilator de perete';
        const proposal: CandidateProposal = {
          subjectId: 'test-building',
          fieldKey: field.key,
          ...(drawn.value === 'count' ? { quantity: { value: drawn.amount, unit: 'count' } } : { choice: 'hotel' }),
          source: drawn.source,
          ...(drawn.inference === 'none' ? {} : { inference: drawn.inference }),
          ...(drawn.confidence === 'none' ? {} : { confidence: drawn.confidence }),
          evidence: cite(drawn.page, excerpt),
        };
        const handed = verifyProposal(proposalForVerifier(proposal), contextFor(field));
        const named = verifyProposal(proposal, contextFor(field));
        return handed.outcome === 'rejected' || (named.outcome === 'accepted' && JSON.stringify(handed.candidate) === JSON.stringify(named.candidate));
      }),
    );
  });
});
