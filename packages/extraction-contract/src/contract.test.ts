/**
 * The extraction contract against its shared corpus (src/samples/corpus.json),
 * which services/extractor/tests/test_contract.py reads too: every case reaches
 * the same verdict in both languages ('valid', 'schema', or the invariant ids),
 * and every valid value comes back from a strict parse unchanged.
 *
 * Ids: F-EXTRACT-01 (text blocks, cells, locators), F-INGEST-03 and F-INGEST-05
 * (status and coverage in the 2.8 terms), F-IFC-01, F-IFC-02, F-IFC-09 (the
 * engineer record, findings, IDS results), F-IFC-10 (derivatives keyed by project
 * id plus content hash), R-027 (the IFC locator, sealed), G1-13 (Evidence.locator
 * has no IFC field), G12-1 and G12-5 (stored-only lines; an IFC file never reads
 * as analysed), rule 13 (problems carry no values).
 */
import { describe, expect, it } from 'vitest';
import {
  EvidenceLocatorSchema,
  ExtractionOutputSchema,
  ExtractionRequestSchema,
} from './generated/zod';
import {
  outputAnswersRequest,
  parseEvidenceLocator,
  parseExtractionOutput,
  parseExtractionRequest,
  type ContractProblem,
  type ExtractionOutputView,
  type ParseResult,
} from './index';
import { CORPUS, type CorpusCase, type Expectation } from './samples/corpus';

function parse(entry: CorpusCase['entry'], value: unknown): ParseResult<unknown> {
  switch (entry) {
    case 'ExtractionOutput':
      return parseExtractionOutput(value);
    case 'ExtractionRequest':
      return parseExtractionRequest(value);
    case 'EvidenceLocator':
      return parseEvidenceLocator(value);
  }
}

/** The verdict of a parse, in the corpus's terms. */
function verdict(result: ParseResult<unknown>): Expectation {
  if (result.ok) return 'valid';
  const codes = result.problems.map((problem) => problem.code);
  if (codes.some((code) => !code.startsWith('invariant:'))) return 'schema';
  return [...new Set(codes.map((code) => code.slice('invariant:'.length)))].sort();
}

function caseByName(name: string): CorpusCase {
  const found = CORPUS.cases.find((candidate) => candidate.name === name);
  if (found === undefined) throw new Error(`no corpus case ${name}`);
  return found;
}

describe('F-EXTRACT-01 · F-INGEST-05 · R-027 · G1-13: the shared corpus', () => {
  it('F-EXTRACT-01: the corpus holds valid and invalid cases of every entry point', () => {
    for (const entry of ['ExtractionOutput', 'ExtractionRequest', 'EvidenceLocator'] as const) {
      const cases = CORPUS.cases.filter((candidate) => candidate.entry === entry);
      expect(cases.some((candidate) => candidate.expect === 'valid')).toBe(true);
      expect(cases.some((candidate) => candidate.expect === 'schema')).toBe(true);
      expect(cases.some((candidate) => Array.isArray(candidate.expect))).toBe(true);
    }
  });

  it.each(CORPUS.cases.map((corpusCase) => [corpusCase.name, corpusCase] as const))('%s reaches its expected verdict', (_name, corpusCase) => {
    expect(verdict(parse(corpusCase.entry, corpusCase.value))).toEqual(corpusCase.expect);
  });

  it.each(CORPUS.cases.filter((corpusCase) => corpusCase.expect === 'valid').map((corpusCase) => [corpusCase.name, corpusCase] as const))(
    '%s comes back unchanged from the strict schema (round trip)',
    (_name, corpusCase) => {
      const schema =
        corpusCase.entry === 'ExtractionOutput' ? ExtractionOutputSchema : corpusCase.entry === 'ExtractionRequest' ? ExtractionRequestSchema : EvidenceLocatorSchema;
      const parsed = schema.parse(corpusCase.value);
      expect(parsed).toStrictEqual(corpusCase.value);
      expect(JSON.stringify(parsed)).toBe(JSON.stringify(corpusCase.value));
    },
  );
});

describe('rule 13: a refused value is described by paths and codes only', () => {
  it('F-EXTRACT-01 · rule 13: no problem of any invalid case carries a value or a key the input chose', () => {
    const allowedCodes = /^(unknown_key|ifc_field|type|value|pattern|length|range|items|unique|union|invariant:[a-z_]+)$/;
    for (const corpusCase of CORPUS.cases) {
      const result = parse(corpusCase.entry, corpusCase.value);
      if (result.ok) continue;
      for (const problem of result.problems) {
        expect(Object.keys(problem).sort()).toEqual(['code', 'path']);
        expect(problem.code).toMatch(allowedCodes);
        expect(problem.path).toMatch(/^(\/[A-Za-z0-9_-]+)*$/);
        expect(problem.path).not.toMatch(/TEST|[Gg]lobal[A-Z0-9]{3,}|CTA-T1|Camere/);
      }
    }
  });

  it('F-EXTRACT-01 · rule 13: an unknown key named with document text is reported at its object, without the key', () => {
    const base = caseByName('pdf-analysed').value;
    const withKey = structuredClone(base) as Record<string, unknown>;
    withKey['Nota TEST pentru cititor'] = true;
    const result = parseExtractionOutput(withKey);
    expect(result).toEqual({ ok: false, problems: [{ path: '', code: 'unknown_key' }] });
  });
});

describe('G12-1 · G12-5 · F-INGEST-03: status lines in the 2.8 terms', () => {
  it('G12-5: an IFC output is stored only, with the word "IFC model", and any other status is refused', () => {
    const closed = parseExtractionOutput(caseByName('ifc-gate-closed').value);
    expect(closed.ok && closed.value.analysis).toEqual({ status: 'stored_only', formatWord: 'IFC model' });
    expect(verdict(parseExtractionOutput(caseByName('ifc-analysed').value))).toEqual(['status_matches_format']);
  });

  it('G12-1: a stored-only file names its format in the G12-1 slot, from the closed list of words', () => {
    const rvt = parseExtractionOutput(caseByName('rvt-stored-only').value);
    expect(rvt.ok && rvt.value.analysis).toEqual({ status: 'stored_only', formatWord: 'RVT model' });
    expect(verdict(parseExtractionOutput(caseByName('output-stored-only-free-word').value))).toBe('schema');
  });
});

describe('R-027 · G1-13 · rule 13: the IFC section is sealed in a parsed output', () => {
  it('R-027: the parsed output holds a sealed handle, whose JSON carries no model data', () => {
    const result = parseExtractionOutput(caseByName('ifc-with-values').value);
    if (!result.ok) throw new Error('the corpus case is valid');
    const view: ExtractionOutputView = result.value;
    expect(JSON.stringify(view.ifcValues)).toBe('{"sealed":"ifc-values"}');
    expect(Object.keys(view.ifcValues ?? {})).toEqual(['sealed']);
    expect(JSON.stringify(view)).not.toContain('f-cta-flow');
    expect(JSON.stringify(view)).not.toContain('IFCVOLUMETRICFLOWRATEMEASURE');
  });

  it('R-027: the readable part of a parsed output equals the input without its IFC section, deeply frozen', () => {
    const input = caseByName('ifc-with-values').value as Record<string, unknown>;
    const result = parseExtractionOutput(input);
    if (!result.ok) throw new Error('the corpus case is valid');
    const withoutIfcValues = (value: object): Record<string, unknown> =>
      Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'ifcValues'));
    expect(withoutIfcValues(result.value)).toStrictEqual(withoutIfcValues(input));
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.findings)).toBe(true);
    expect(Object.isFrozen(result.value.ifcModel?.ids?.specifications[0])).toBe(true);
  });
});

describe('G1-13: Evidence.locator is strict and has no IFC field', () => {
  it.each([
    ['locator-ifc-object', ['/ifc']],
    ['locator-globalid-key', ['/globalId']],
    ['locator-step-ids-key', ['/stepIds']],
    ['locator-path-key', ['/path']],
  ] as const)('G1-13: %s is refused with ifc_field at the IFC key', (name, paths) => {
    const result = parseEvidenceLocator(caseByName(name).value);
    expect(result.ok).toBe(false);
    const ifcProblems = result.ok ? [] : result.problems.filter((problem: ContractProblem) => problem.code === 'ifc_field');
    expect(ifcProblems.map((problem) => problem.path)).toEqual(paths);
  });

  it('G1-13: an unknown key that is not an IFC key is refused as unknown_key', () => {
    const result = parseEvidenceLocator(caseByName('locator-unknown-key').value);
    expect(result.ok ? [] : result.problems.map((problem) => problem.code)).toContain('unknown_key');
    expect(result.ok ? [] : result.problems.map((problem) => problem.code)).not.toContain('ifc_field');
  });

  it('G1-13: every locator the schema accepts is a 2.4 locator of the domain (page, sheet, cell, bbox only)', () => {
    for (const corpusCase of CORPUS.cases.filter((candidate) => candidate.entry === 'EvidenceLocator' && candidate.expect === 'valid')) {
      const result = parseEvidenceLocator(corpusCase.value);
      if (!result.ok) throw new Error(`${corpusCase.name} is valid`);
      const domainLocator: import('@sovitech/domain').EvidenceLocator = result.value;
      expect(Object.keys(domainLocator).every((key) => ['page', 'sheet', 'cell', 'bbox'].includes(key))).toBe(true);
    }
  });
});

describe('F-INGEST-04 · R-027: an output answers its request', () => {
  it.each(CORPUS.pairs.map((pair) => [pair.name, pair] as const))('%s', (_name, pair) => {
    const request = parseExtractionRequest(caseByName(pair.request).value);
    const output = parseExtractionOutput(caseByName(pair.output).value);
    if (!request.ok || !output.ok) throw new Error('the pair names valid cases');
    expect(outputAnswersRequest(request.value, output.value).map((problem) => problem.path)).toEqual(pair.expect);
  });
});
