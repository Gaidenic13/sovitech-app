/**
 * G1-2 (docs/guardrails.md section 7; rule 1 "Material exclusions": "A total may leave out unknown items and still show
 * one figure only if every excluded item is marked `minorForTotals`. Otherwise it reads 'Incomplete: excludes <item
 * names>', with the same prominence as the figure, and no headline, payback or ROI is computed from it").
 * Situation: a CAPEX formula with `exclude_and_count`, 2 of 40 items unknown and not minor.
 * Expected: "Incomplete: excludes <names>". No headline, payback or ROI.
 *
 * Engine half (this file; the engine builder), with the TEST formula `TEST-capexLineItems@1.0.0` (a TEST method over
 * TEST line items) and `TEST-annualReturn@1.0.0` (a TEST return computed from that total):
 * - the total is `incomplete`, naming exactly the two items left out, and its candidate records them (`excludes:`
 *   notes), so it is known as incomplete wherever it is read;
 * - no headline: `headlineOutputOf` never names an incomplete investment figure;
 * - no payback or ROI: a formula that reads the stored incomplete total refuses it (`incomplete`), and runs on the
 *   complete one.
 * The rendered line ("Incomplete: excludes …", the same prominence) is the view-model's (B2).
 *
 * The view-model half (new in phase 5 part B, V-1; Expected unchanged; for the integrator to index): the stored
 * proposal as `@sovitech/view-model/server` builds it over a TEST project (tests/guardrails/_support/proposal.ts), with
 * an incomplete TEST stage 2 total and rule 7's stage 1 fallback not allowed, so `headlineOutputOf` names stage 2. The
 * head's price is its own display, `proposal:<sid>.headline.investment`: the stage label with "Incomplete: excludes
 * <names>", and none of the figure's text or parts (before the fix the head read the figure, "about 9,050 EUR (9,010 to
 * 9,090 EUR)"). The Investment section keeps the figure with its Incomplete line. The rendered halves are the web's.
 */
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { OUTPUT } from '@sovitech/registry';
import { encodeNote, headlineOutputOf, isIncompleteTotal, methodNotesOf, runEngine, snapshotRecordOf, type EngineCandidate, type EngineRun, type SnapshotOutputRow } from '@sovitech/engine';
import type { Candidate, FieldDefinition } from '@sovitech/domain';
import { proposalView } from '@sovitech/view-model/server';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { LINE_ITEM_FIELDS, TEST_FIELDS } from '../../packages/engine/test-formulas/fields';
import { testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { documentReading, testDocument, testTime } from './_support/builders';
import { displayById, productionRows, testEstimate, testProposalFields, testProposalInput } from './_support/proposal';

const PROJECT = 'test-project-g1-2';
const BUILDING = 'test-building-g1-2';
const schedule = testDocument('test-doc-g1-2', PROJECT, 'technical_design');
const catalogue = testCatalogue({ mirrored: false, extra: ['TEST-capexLineItems', 'TEST-annualReturn'] });

/** The 40 line items, those in `unknown` with no candidate, those in `minor` marked minorForTotals. */
function lineItems(unknown: ReadonlySet<number>, minor: ReadonlySet<number> = new Set()): TestEntry[] {
  return LINE_ITEM_FIELDS.map((field, index): TestEntry => {
    const definition: FieldDefinition = minor.has(index) ? { ...field, minorForTotals: true } : field;
    if (unknown.has(index)) return { definition, subjectId: BUILDING, candidates: [] };
    const reading = documentReading({ id: `test-cand-g1-2-item-${String(index + 1)}`, subjectId: BUILDING, field: definition, document: schedule, value: { quantity: { value: index + 1, unit: 'count' } }, minute: 1, page: index + 1 });
    return { definition, subjectId: BUILDING, candidates: [reading] };
  });
}

let ids = 0;
const newId = (): string => `test-cand-g1-2-out-${String((ids += 1))}`;
function run(entries: readonly TestEntry[]): EngineRun {
  return runEngine(catalogue, testEngineInput({ projectId: PROJECT, entries, subjects: { building: BUILDING } }), { newId, at: '2026-10-05T09:00:00Z' });
}
const totalOf = (result: EngineRun) => result.outputs.find((output) => output.output === 'capex.TEST_lineItems');
const returnOf = (result: EngineRun) => result.outputs.find((output) => output.output === 'return.TEST_annual');

/** A candidate as the store keeps it (the engine's, with the time and role the store stamps). */
const stored = (candidate: EngineCandidate): Candidate => ({ ...candidate, createdAt: testTime(30), authorRole: 'system' });

const UNKNOWN = new Set([6, 22]);
const NAMES = ['TEST line item 07', 'TEST line item 23'];

describe('G1-2 · a total with 2 of 40 items unknown and not minor reads "Incomplete: excludes <names>"; no headline, payback or ROI', () => {
  test('G1-2 · the total is incomplete and names exactly the two items it leaves out', () => {
    const result = run(lineItems(UNKNOWN));
    const total = totalOf(result);
    expect(total?.kind).toBe('incomplete');
    if (total?.kind !== 'incomplete') return;
    expect(total.excluded).toEqual(NAMES);
    // The candidate is kept for the record, and carries the items it leaves out, so every reader knows it is incomplete.
    expect(isIncompleteTotal(total.candidate.method)).toBe(true);
    expect(methodNotesOf(total.candidate.method).filter((note) => note.kind === 'excludes')).toEqual([
      { kind: 'excludes', subjectId: BUILDING, fieldKey: LINE_ITEM_FIELDS[6]?.key, minor: false },
      { kind: 'excludes', subjectId: BUILDING, fieldKey: LINE_ITEM_FIELDS[22]?.key, minor: false },
    ]);
    // It used the 38 known items, and nothing stood in for the two (rule 1: no numeric stand-in).
    expect(total.candidate.method.inputCandidateIds).toHaveLength(38);
    expect(snapshotRecordOf(result, []).outputs.find((row) => row.output === 'capex.TEST_lineItems')?.incomplete).toBe(true);
  });

  test('G1-2 · no headline: an incomplete investment figure is never the headline', () => {
    const row = (output: string, incomplete: boolean): SnapshotOutputRow => ({ output, formula: 'TEST-x@1.0.0', candidateId: `test-cand-${output}`, missing: [], incomplete });
    // Stage 2 incomplete: the headline falls back to a complete stage 1 figure where rule 7 allows it ...
    expect(headlineOutputOf([row(OUTPUT.preliminaryEstimate, true), row(OUTPUT.indicativeRange, false)], true)).toBe(OUTPUT.indicativeRange);
    // ... and otherwise stays on stage 2, whose row is incomplete, so the headline shows no figure.
    expect(headlineOutputOf([row(OUTPUT.preliminaryEstimate, true), row(OUTPUT.indicativeRange, false)], false)).toBe(OUTPUT.preliminaryEstimate);
    expect(headlineOutputOf([row(OUTPUT.preliminaryEstimate, true), row(OUTPUT.indicativeRange, true)], true)).toBe(OUTPUT.preliminaryEstimate);
  });

  test('G1-2 · no payback or ROI: a formula reading the stored incomplete total refuses it; on the complete total it runs', () => {
    const items = lineItems(UNKNOWN);
    const first = totalOf(run(items));
    if (first?.kind !== 'incomplete') throw new Error('the total is not incomplete');
    const withTotal = [...items, { definition: TEST_FIELDS.capexLineItems, subjectId: BUILDING, candidates: [stored(first.candidate)] }];
    const refused = returnOf(run(withTotal));
    expect(refused).toEqual({
      kind: 'not_available',
      output: 'return.TEST_annual',
      formula: 'TEST-annualReturn@1.0.0',
      missing: [{ kind: 'input', fieldKey: TEST_FIELDS.capexLineItems.key, subjectId: BUILDING, reason: 'incomplete' }],
    });

    // Control: every item known, the total is a figure, and the return is computed from it.
    const complete = lineItems(new Set());
    const total = totalOf(run(complete));
    expect(total?.kind).toBe('figure');
    if (total?.kind !== 'figure') return;
    expect(isIncompleteTotal(total.candidate.method)).toBe(false);
    const computed = returnOf(run([...complete, { definition: TEST_FIELDS.capexLineItems, subjectId: BUILDING, candidates: [stored(total.candidate)] }]));
    expect(computed?.kind).toBe('figure');
  });

  test('G1-2 · control: the same two items marked minorForTotals leave one figure, with the exclusions counted', () => {
    const total = totalOf(run(lineItems(UNKNOWN, UNKNOWN)));
    expect(total?.kind).toBe('figure');
    if (total?.kind !== 'figure') return;
    expect(methodNotesOf(total.candidate.method).filter((note) => note.kind === 'excludes').map((note) => note.kind === 'excludes' && note.minor)).toEqual([true, true]);
  });

  test('G1-2 · whichever items are unknown and not minor, the total is incomplete and names exactly those', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer({ min: 0, max: 39 }), { minLength: 1, maxLength: 39 }), (indexes) => {
        const total = totalOf(run(lineItems(new Set(indexes))));
        expect(total?.kind).toBe('incomplete');
        if (total?.kind !== 'incomplete') return;
        const expected = [...indexes].sort((a, b) => a - b).map((index) => `TEST line item ${String(index + 1).padStart(2, '0')}`);
        expect(total.excluded).toEqual(expected);
      }),
      { numRuns: 40 },
    );
  });
});

// ---- The view-model half (phase 5 part B, V-1): the stored proposal's head ----

describe('G1-2 (the view-model half) · the stored proposal\'s head never shows an incomplete total\'s figure', () => {
  const fields = testProposalFields();
  const total = testEstimate(500, {
    output: OUTPUT.preliminaryEstimate,
    value: 9050,
    low: 9010,
    high: 9090,
    unit: 'EUR',
    assumptions: [encodeNote({ kind: 'excludes_item', name: NAMES[0] ?? '' }), encodeNote({ kind: 'excludes_item', name: NAMES[1] ?? '' })],
  });
  const rows = productionRows(fields).rows.map((row) => (row.output === OUTPUT.preliminaryEstimate ? { ...row, candidateId: total.id, missing: [], incomplete: true } : row));
  const built = proposalView(testProposalInput({ fields, rows, snapshotCandidates: [total], fallbackAllowed: false }));
  const figure = displayById(built.displayObjects, `proposal:${built.view.snapshotId}.outputs.${OUTPUT.preliminaryEstimate}`);

  test('G1-2 · V-1 · the head reads the stage label and "Incomplete: excludes <names>", with no figure text or parts', () => {
    const head = built.view.headline.investment;
    expect(head.output).toBe(OUTPUT.preliminaryEstimate);
    expect(head.price.figure).toBe(`proposal:${built.view.snapshotId}.headline.investment`);
    expect(head.price).toMatchObject({ stageId: 'preliminary_investment_estimate', quotationRecordId: null, superseded: null });
    const shown = displayById(built.displayObjects, head.price.figure);
    expect(shown.kind).toBe('line');
    expect(shown.text).toBe(`Incomplete: excludes ${NAMES.join(', ')}`);
    expect((shown.lines ?? []).map((line) => [line.kind, line.text])).toEqual([['stage_label', 'Preliminary investment estimate']]);
    // None of the figure: not its text, not one of its parts, not its badge.
    for (const part of figure.parts ?? []) expect(shown.text).not.toContain(part);
    expect(shown.text).not.toContain(figure.text);
    expect(shown.badge).toBeUndefined();
    // Its only part is the item names it binds (they hold digits), never a figure's.
    expect(shown.parts).toEqual([NAMES.join(', ')]);
    for (const part of shown.parts ?? []) expect(figure.parts ?? []).not.toContain(part);
  });

  test('G1-2 · V-1 · the Investment section keeps the figure with its Incomplete line, the same prominence', () => {
    const section = built.view.investment.outputs.find((output) => output.output === OUTPUT.preliminaryEstimate);
    expect(section).toMatchObject({ availability: 'figure', incomplete: true, display: figure.valueId });
    expect(figure.text).toBe('about 9,050 EUR (9,010 to 9,090 EUR)');
    expect((figure.lines ?? []).map((line) => line.text)).toEqual(expect.arrayContaining(['Preliminary investment estimate', `Incomplete: excludes ${NAMES.join(', ')}`]));
  });

  test('G1-2 · V-1 · 2.4: an incomplete total whose inputs changed reads, at the head, its stage label, the Incomplete line and "Out of date, recalculating", still with no figure', () => {
    const changes = { changedFields: [], outOfDateOutputs: new Set([OUTPUT.preliminaryEstimate]), outOfDateOn: new Map([[OUTPUT.preliminaryEstimate, null]]), changedOn: null };
    const stale = proposalView(testProposalInput({ fields, rows, snapshotCandidates: [total], fallbackAllowed: false, changes }));
    const shown = displayById(stale.displayObjects, stale.view.headline.investment.price.figure);
    expect(shown.text).toBe(`Incomplete: excludes ${NAMES.join(', ')}`);
    expect((shown.lines ?? []).map((line) => line.text)).toEqual(['Preliminary investment estimate', 'Out of date, recalculating']);
    for (const part of figure.parts ?? []) expect(shown.text).not.toContain(part);
  });

  test('G1-2 · control: a complete stage 2 figure is the head\'s own figure', () => {
    const completeRows = rows.map((row) => (row.output === OUTPUT.preliminaryEstimate ? { ...row, incomplete: false } : row));
    const complete = proposalView(testProposalInput({ fields, rows: completeRows, snapshotCandidates: [total], fallbackAllowed: false }));
    expect(complete.view.headline.investment.price.figure).toBe(`proposal:${complete.view.snapshotId}.outputs.${OUTPUT.preliminaryEstimate}`);
    expect(complete.displayObjects.some((display) => display.valueId.endsWith('.headline.investment'))).toBe(false);
  });
});
