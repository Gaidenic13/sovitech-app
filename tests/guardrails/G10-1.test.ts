/**
 * G10-1 (rule 10, "Pricing must never pretend to be a quotation"; 2.8 stage labels and reserved terms): "A proposal is
 * generated with no quotation record" → "'Preliminary investment estimate' as a range. No reserved pricing term
 * appears."
 *
 * Proven on the stored proposal (phase 5's view-model, with the engine's `priceStageOf` reading stored records): with
 * no quotation record, a TEST investment figure of this project's data carries "Preliminary investment estimate" as its
 * stage label, read from stored records, and is a range with its badge Estimated; nothing in the proposal's displays is
 * a reserved term outside the places 2.8 allows (no "quote", "quotation", "offer", "final", "firm price"...); and no
 * display names a quotation record. While no figure can be produced (every dataset gate closed: the live app), no stage
 * is named at all (G10-11) and the same holds.
 */
import { describe, expect, it } from 'vitest';
import { findReservedTerms } from '@sovitech/registry/reserved-terms';
import { servedDisplayOf } from '@sovitech/view-model/browser';
import { proposalView } from '@sovitech/view-model/server';
import { displayById, productionRows, testEstimate, testProposalFields, testProposalInput } from './_support/proposal';

/** Every text the displays serve (their text and every line), each checked as plain copy: no allowance is claimed. */
function reservedTermsIn(displays: readonly Parameters<typeof servedDisplayOf>[0][]): string[] {
  const texts = displays.flatMap((display) => {
    const served = servedDisplayOf(display);
    return [served.text, ...(served.lines ?? [])];
  });
  return texts.flatMap((text) => findReservedTerms(text).map((match) => `${match.term} in "${text}"`));
}

describe('G10-1 · rule 10: a proposal generated with no quotation record', () => {
  it('G10-1 · US-PROPOSAL-08 · R-112 · R-127: "Preliminary investment estimate" as a range, its stage from stored records, no reserved pricing term', () => {
    const fields = testProposalFields();
    const figure = testEstimate(220, { output: 'capex.preliminaryEstimate', value: 92000, low: 81000, high: 108000, unit: 'EUR' });
    const rows = productionRows(fields).rows.map((row) => (row.output === 'capex.preliminaryEstimate' ? { ...row, candidateId: figure.id, missing: [], incomplete: false } : row));
    const built = proposalView(testProposalInput({ fields, rows, snapshotCandidates: [figure], records: [] }));
    const price = built.view.headline.investment.price;
    expect(built.view.headline.investment.output).toBe('capex.preliminaryEstimate');
    expect(price.stageId).toBe('preliminary_investment_estimate');
    expect(price.quotationRecordId).toBeNull();
    expect(price.superseded).toBeNull();
    expect(displayById(built.displayObjects, price.stage ?? '').text).toBe('Preliminary investment estimate');
    const figureDisplay = displayById(built.displayObjects, price.figure);
    expect(figureDisplay.shape).toBe('range');
    expect(figureDisplay.text).toBe('about 92,000 EUR (81,000 to 110,000 EUR)');
    expect(figureDisplay.badge?.id).toBe('estimated');
    expect(figureDisplay.lines?.find((line) => line.kind === 'stage_label')?.text).toBe('Preliminary investment estimate');
    expect(built.displayObjects.some((display) => display.quotationRecordId !== undefined)).toBe(false);
    expect(reservedTermsIn(built.displayObjects)).toEqual([]);
  });

  it('G10-1 · G10-11 · rule 7: with every dataset gate closed, no figure and no stage: the investment reads "Not available yet", and no reserved term appears', () => {
    const built = proposalView(testProposalInput());
    const price = built.view.headline.investment.price;
    expect(price).toMatchObject({ stage: null, stageId: null, quotationRecordId: null, superseded: null });
    const display = displayById(built.displayObjects, price.figure);
    expect(display.text.startsWith('Not available yet: SOVITECH point templates; SOVITECH cost ranges and benchmarks')).toBe(true);
    expect(display.missing).toBe('not_available_yet');
    // No stage is stated for a figure that does not exist: the figure carries no stage label. The stage labels that are
    // served only name the investment outputs beside their "Not available yet" lines (G10-11; `label`).
    expect(display.lines?.some((line) => line.kind === 'stage_label') ?? false).toBe(false);
    const named = built.view.investment.outputs.map((output) => [output.output, output.label === undefined ? undefined : displayById(built.displayObjects, output.label).text]);
    expect(named).toEqual([
      ['capex.indicativeRange', 'Indicative range'],
      ['capex.preliminaryEstimate', 'Preliminary investment estimate'],
    ]);
    const labelIds = new Set(built.view.investment.outputs.flatMap((output) => (output.label === undefined ? [] : [output.label])));
    expect(built.displayObjects.filter((entry) => entry.lines?.some((line) => line.kind === 'stage_label')).every((entry) => labelIds.has(entry.valueId))).toBe(true);
    expect(reservedTermsIn(built.displayObjects)).toEqual([]);
  });
});
