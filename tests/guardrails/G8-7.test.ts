/**
 * G8-7 (docs/guardrails.md section 7; rule 8 "Energy data": "Annual totals are calculated. They come from
 * non-overlapping periods of one metering point"; "Corrections replace, never add. Regularisation and credit invoices
 * ('factură de regularizare', storno) replace the periods they correct"; F-CALC-07).
 * Situation: 12 monthly bills plus one regularisation invoice.
 * Expected: the annual total replaces the corrected periods, and nothing is double counted.
 *
 * Engine case (the engine builder; moved here from phase 1: totals are the engine's), with
 * `TEST-annualConsumptionFromBills@1.0.0`, a calculated total over one TEST metering point's twelve monthly bills and a
 * regularisation invoice for months 10 to 12. The total is `calculated` (2.1: "annual totals from billing periods"),
 * exact, and counts each month once; a month with no bill makes it incomplete, naming the month (F-CALC-07: "no total is
 * presented as a full year when a period is missing").
 */
import { describe, expect, test } from 'vitest';
import { runEngine, type EngineRun } from '@sovitech/engine';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { BILL_FIELDS, TEST_FIELDS } from '../../packages/engine/test-formulas/fields';
import { testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { documentReading, testDocument } from './_support/builders';

const PROJECT = 'test-project-g8-7';
const METER = 'test-meter-g8-7';
const bills = testDocument('test-doc-g8-7-bills', PROJECT, 'bill');
const regularisation = testDocument('test-doc-g8-7-regularisation', PROJECT, 'bill');
/** TEST monthly readings in kWh: month n reads 1000 + n. */
const monthly = (index: number): number => 1000 + index + 1;
const CORRECTION = 2500;

function meter(options: { readonly regularisation: boolean; readonly missing?: number }): TestEntry[] {
  const entries = BILL_FIELDS.map((field, index): TestEntry => ({
    definition: field,
    subjectId: METER,
    candidates:
      options.missing === index
        ? []
        : [documentReading({ id: `test-cand-g8-7-m${String(index + 1)}`, subjectId: METER, field, document: bills, value: { quantity: { value: monthly(index), unit: 'kWh' } }, minute: 1, page: index + 1 })],
  }));
  const correction = TEST_FIELDS.regularisationM10M12;
  entries.push({
    definition: correction,
    subjectId: METER,
    candidates: options.regularisation
      ? [documentReading({ id: 'test-cand-g8-7-reg', subjectId: METER, field: correction, document: regularisation, value: { quantity: { value: CORRECTION, unit: 'kWh' } }, minute: 2 })]
      : [],
  });
  return entries;
}

let ids = 0;
function total(options: { readonly regularisation: boolean; readonly missing?: number }) {
  const run: EngineRun = runEngine(
    testCatalogue({ mirrored: false, extra: ['TEST-annualConsumptionFromBills'] }),
    testEngineInput({ projectId: PROJECT, entries: meter(options), subjects: { metering_point: METER } }),
    { newId: () => `test-cand-g8-7-out-${String((ids += 1))}`, at: '2026-10-05T09:00:00Z' },
  );
  const [output] = run.outputs;
  if (output === undefined) throw new Error('no output');
  return output;
}

const sumOf = (indexes: readonly number[]): number => indexes.reduce((running, index) => running + monthly(index), 0);
const MONTHS = Array.from({ length: 12 }, (_, index) => index);

describe('G8-7 · 12 monthly bills plus one regularisation invoice: the correction replaces the periods it corrects', () => {
  test('G8-7 · the annual total adds months 1 to 9 and the regularisation, never the three bills it replaces', () => {
    const output = total({ regularisation: true });
    expect(output.kind).toBe('figure');
    if (output.kind !== 'figure') return;
    expect(output.candidate.source).toBe('calculated');
    expect(output.candidate.range).toBeUndefined();
    expect(output.candidate.quantity).toEqual({ value: sumOf(MONTHS.slice(0, 9)) + CORRECTION, unit: 'kWh' });
    // Nothing double counted: the replaced bills plus the regularisation is not the total.
    expect(output.candidate.quantity.value).not.toBe(sumOf(MONTHS) + CORRECTION);
  });

  test('G8-7 · control: with no regularisation the twelve bills are the total, and its absence leaves nothing incomplete', () => {
    const output = total({ regularisation: false });
    expect(output.kind).toBe('figure');
    if (output.kind === 'figure') expect(output.candidate.quantity).toEqual({ value: sumOf(MONTHS), unit: 'kWh' });
  });

  test('G8-7 · a month with no bill is never presented as a full year: the total reads incomplete, naming the month', () => {
    const output = total({ regularisation: false, missing: 4 });
    expect(output.kind).toBe('incomplete');
    if (output.kind === 'incomplete') expect(output.excluded).toEqual(['TEST bill for month 05']);
  });
});
