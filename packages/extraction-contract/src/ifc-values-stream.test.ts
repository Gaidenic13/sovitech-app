/**
 * The per-line form of the sealed IFC section (./ifc-values-stream.ts; ADR 0034), with the gates
 * as they are: every gate closed (packages/registry/gates/). Here: the writer's lines, and that
 * the reader takes no line at all while `ifc-values` is closed or while no IFC values were asked
 * for. Reading the lines with the gate open, and every refusal of a line, is proven only in
 * tests/proposed/ifc-input-5.4-stream.test.ts, through the test-utils override (prompt 3 5.4).
 * TypeScript only: the Python extractor has no IFC role (ADR 0031). Every value is TEST data.
 *
 * Ids: F-INGEST-04 (the output the worker reads), F-IFC-03 and F-IFC-04 (the values it carries,
 * gated), R-027 (sealed while ifc-values is closed), rule 13 (codes, never values).
 */
import { productionGateSource } from '@sovitech/registry/gates';
import { describe, expect, it } from 'vitest';
import type { ExtractionOutput, ExtractionRequest, IfcFact } from './generated/zod';
import { IFC_FACT_EXCERPT_MAX, IFC_VALUES_LINE_MAX_BYTES, IfcValuesStreamError, ifcValuesStreamExpected, ifcValuesStreamLines, readIfcValuesStream, utf8Length } from './ifc-values-stream';
import { IfcFactSchema } from './generated/zod';
import { parseExtractionOutput } from './parse';
import { CORPUS } from './samples/corpus';

function corpusOutput(name: string): ExtractionOutput {
  const found = CORPUS.cases.find((corpusCase) => corpusCase.name === name)?.value;
  if (found === undefined) throw new Error(`no corpus case ${name}`);
  return structuredClone(found) as ExtractionOutput;
}

const withValues = (): ExtractionOutput => corpusOutput('ifc-with-values');

/** An output without its IFC section: the first line of the per-line form. */
function withoutSection(output: ExtractionOutput): ExtractionOutput {
  const rest = { ...output };
  delete rest.ifcValues;
  return rest;
}

function requestFor(output: ExtractionOutput, ifcValues: boolean): ExtractionRequest {
  return {
    contractVersion: '1.0.0',
    job: { ...output.job },
    declaredFormat: 'ifc',
    ifcValues,
    datasets: ifcValues ? [{ id: 'TEST-ifc-mapping', version: '0.0.1' }] : [],
    derivatives: [],
    limits: { maxPages: 10, maxCellsPerSheet: 10, wallClockSeconds: 60 },
  };
}

/** A line iterable that records every attempt to take a line from it. */
function watched(values: readonly unknown[]): { readonly lines: AsyncIterable<unknown>; readonly taken: () => number } {
  let taken = 0;
  const lines: AsyncIterable<unknown> = {
    [Symbol.asyncIterator]: () => {
      let index = 0;
      return {
        next: () => {
          taken += 1;
          const value = values[index];
          index += 1;
          return Promise.resolve(index > values.length ? { done: true as const, value: undefined } : { done: false as const, value });
        },
      };
    },
  };
  return { lines, taken: () => taken };
}

/** The line of a fact, as the form writes it: the fact without its locator's content hash and schema, and without its excerpt. */
function factLine(fact: IfcFact): string {
  const { locator } = fact;
  return JSON.stringify({ fact: { id: fact.id, globalId: locator.globalId, stepIds: locator.stepIds, path: locator.path, value: fact.value, ...(fact.declaredUnit === undefined ? {} : { declaredUnit: fact.declaredUnit }) } });
}

describe('F-INGEST-04 · F-IFC-04 · ADR 0034: the writer of the per-line form', () => {
  it('F-INGEST-04 · F-IFC-04: the output without its section first, then the header, each statement once, the facts without what they share, the proposals; every line within the bound', () => {
    const output = withValues();
    const facts = output.ifcValues?.facts ?? [];
    const proposals = output.ifcValues?.candidateProposals ?? [];
    // Two facts quoting one statement: it is written once.
    const [first] = facts;
    if (first === undefined) throw new Error('the corpus case has facts');
    const twin: IfcFact = { ...first, id: 'f-twin', locator: { ...first.locator, path: { kind: 'attribute', through: 'occurrence', attribute: 'Tag' } } };
    const all = [...facts, twin];
    output.ifcValues = { facts: all, candidateProposals: proposals };
    const rest = withoutSection(output);
    expect(parseExtractionOutput(rest).ok).toBe(true);
    // Each quoted statement once: a fact's excerpt is its statements, in order, joined by line ends.
    const statements = new Map(all.flatMap((fact) => fact.locator.stepIds.map((stepId, index) => [stepId, fact.excerpt.split('\n')[index] ?? ''] as const)));
    expect(statements.size).toBeLessThan(all.length);
    const lines = [...ifcValuesStreamLines(output)];
    const statementLines = lines.slice(2, 2 + statements.size);
    expect(lines).toEqual([
      JSON.stringify(rest),
      JSON.stringify({ ifcValuesStream: { contractVersion: '1.0.0', section: 'present', statements: statements.size, facts: all.length, candidateProposals: proposals.length } }),
      ...statementLines,
      ...all.map(factLine),
      ...proposals.map((proposal) => JSON.stringify({ proposal })),
    ]);
    expect(new Set(statementLines)).toEqual(new Set([...statements].map(([stepId, text]) => JSON.stringify({ statement: { stepId, text } }))));
    for (const line of lines) {
      expect(line).not.toContain('\n');
      expect(utf8Length(line)).toBeLessThanOrEqual(IFC_VALUES_LINE_MAX_BYTES);
    }
  });

  it('F-IFC-04: a section of a model that could not be opened is announced absent, with no line after the header', () => {
    const output = withoutSection(withValues());
    expect([...ifcValuesStreamLines(output)].slice(1)).toEqual([JSON.stringify({ ifcValuesStream: { contractVersion: '1.0.0', section: 'absent', statements: 0, facts: 0, candidateProposals: 0 } })]);
  });

  it('F-IFC-04 · rule 1: a fact whose excerpt is not its statements, or two facts that cite one statement differently, are not written', () => {
    const output = withValues();
    const [first, ...others] = output.ifcValues?.facts ?? [];
    if (first === undefined) throw new Error('the corpus case has facts');
    const proposals = output.ifcValues?.candidateProposals ?? [];
    const differently: IfcFact = { ...first, id: 'f-other', excerpt: `${first.excerpt} ` };
    expect(() => [...ifcValuesStreamLines({ ...output, ifcValues: { facts: [first, ...others, differently], candidateProposals: proposals } })]).toThrow(IfcValuesStreamError);
    const notItsOwn: IfcFact = { ...first, excerpt: `#99991=IFCTEST('x');` };
    expect(() => [...ifcValuesStreamLines({ ...output, ifcValues: { facts: [notItsOwn], candidateProposals: [] } })]).toThrow(/output\.not_streamable/u);
    // Several statements: the excerpt is them, in order, joined by line ends, and each is written once.
    const [a, b] = [101, 102];
    const joined: IfcFact = { ...first, id: 'f-joined', locator: { ...first.locator, stepIds: [a, b] }, excerpt: `#${String(a)}=IFCTEST(1);\n#${String(b)}=IFCTEST(2);` };
    const lines = [...ifcValuesStreamLines({ ...output, ifcValues: { facts: [joined], candidateProposals: [] } })];
    expect(lines.slice(2)).toEqual([
      JSON.stringify({ statement: { stepId: a, text: `#${String(a)}=IFCTEST(1);` } }),
      JSON.stringify({ statement: { stepId: b, text: `#${String(b)}=IFCTEST(2);` } }),
      factLine(joined),
    ]);
    const wrongOrder: IfcFact = { ...joined, id: 'f-wrong', excerpt: `#${String(b)}=IFCTEST(2);\n#${String(a)}=IFCTEST(1);` };
    expect(() => [...ifcValuesStreamLines({ ...output, ifcValues: { facts: [joined, wrongOrder], candidateProposals: [] } })]).toThrow(/output\.not_streamable/u);
  });

  it('F-IFC-04: a line that would pass the bound is not written (the reader keeps its values below it)', () => {
    const output = withValues();
    const [first] = output.ifcValues?.facts ?? [];
    if (first === undefined) throw new Error('the corpus case has facts');
    const long = `'${'A'.repeat(IFC_FACT_EXCERPT_MAX - 2)}'`;
    const huge: IfcFact = { ...first, value: { kind: 'list', items: Array.from({ length: 60 }, () => ({ kind: 'string' as const, token: long, text: 'A'.repeat(IFC_FACT_EXCERPT_MAX) })) } };
    expect(IfcFactSchema.safeParse(huge).success).toBe(true);
    expect(() => [...ifcValuesStreamLines({ ...output, ifcValues: { facts: [huge], candidateProposals: [] } })]).toThrow(/output\.line_too_long/u);
  });

  it('F-INGEST-04: only a request for IFC values of a model has the per-line form', () => {
    const output = withValues();
    expect(ifcValuesStreamExpected(requestFor(output, true), output)).toBe(true);
    expect(ifcValuesStreamExpected(requestFor(output, false), output)).toBe(false);
    expect(ifcValuesStreamExpected(requestFor(output, true), { format: 'pdf' })).toBe(false);
  });
});

describe('R-027 · prompt 3 section 5.4 · ADR 0034: while ifc-values is closed, no line of the section is read', () => {
  it('R-027: with the production gates, the reader takes not one line and says the gate holds them', async () => {
    const output = withValues();
    const section = output.ifcValues;
    const parsed = parseExtractionOutput(withoutSection(output));
    if (!parsed.ok) throw new Error('the first line is a valid output');
    const facts = section?.facts ?? [];
    const source = watched([{ ifcValuesStream: { contractVersion: '1.0.0', section: 'present', statements: facts.length, facts: facts.length, candidateProposals: 0 } }]);
    const result = await readIfcValuesStream(requestFor(output, true), parsed.value, source.lines, productionGateSource());
    expect(result).toEqual({ ok: false, reason: 'gate_closed', problems: [] });
    expect(source.taken()).toBe(0);
  });

  it('R-027: a request that asked for no IFC values takes not one line, whatever the gates', async () => {
    const output = withValues();
    const parsed = parseExtractionOutput(withoutSection(output));
    if (!parsed.ok) throw new Error('the first line is a valid output');
    const source = watched(['not even a line of the form']);
    expect(await readIfcValuesStream(requestFor(output, false), parsed.value, source.lines, productionGateSource())).toEqual({ ok: false, reason: 'not_asked', problems: [] });
    expect(source.taken()).toBe(0);
  });
});
