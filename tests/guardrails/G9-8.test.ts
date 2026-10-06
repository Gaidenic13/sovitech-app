/**
 * G9-8 (rule 9; 2.4 "A generated proposal keeps a snapshot"): "A breakdown and its total are displayed together, for
 * example CAPEX by system and total CAPEX" → "Parts and total come from the same snapshot id".
 *
 * Proven on the stored proposal (phase 5's view-model): every figure of a version, the points by type (the proposal's
 * breakdown: rule 8, "a headline total always shows its breakdown") and the investment figure the headline carries,
 * is the display of one stored snapshot (`proposal:<snapshot id>.outputs.<output>`), read from that snapshot's rows
 * only; a second version's figures are its own and never mixed into the first. TEST figures (no SOVITECH dataset is
 * approved: the live app shows "Not available yet").
 */
import { describe, expect, it } from 'vitest';
import { proposalView } from '@sovitech/view-model/server';
import { displayById, productionRows, SNAPSHOT_ID, testEstimate, testProposalFields, testProposalInput } from './_support/proposal';
import { uuid } from './_support/view-model';

const OTHER_SNAPSHOT = uuid(101);

describe('G9-8 · rule 9: a breakdown and its total come from one snapshot', () => {
  it('G9-8 · US-PROPOSAL-03 · R-110: the points by type and the investment figure of a version are that snapshot\'s, and another version\'s are its own', () => {
    const fields = testProposalFields();
    const parts = [
      testEstimate(210, { output: 'points.hardwareIo', value: 120, low: 100, high: 150, unit: 'count' }),
      testEstimate(211, { output: 'points.integration', value: 40, low: 30, high: 50, unit: 'count' }),
      testEstimate(212, { output: 'points.virtual', value: 70, low: 60, high: 90, unit: 'count' }),
    ];
    const total = testEstimate(213, { output: 'capex.preliminaryEstimate', value: 90000, low: 80000, high: 110000, unit: 'EUR' });
    const byOutput = new Map([...parts, total].map((candidate) => [candidate.fieldKey.replace('test.output.', ''), candidate.id]));
    const rows = productionRows(fields).rows.map((row) => {
      const id = byOutput.get(row.output);
      return id === undefined ? row : { ...row, candidateId: id, missing: [], incomplete: false };
    });
    const first = proposalView(testProposalInput({ fields, rows, snapshotCandidates: [...parts, total] }));
    const figures = [...first.view.points.outputs, ...first.view.investment.outputs].filter((output) => output.availability === 'figure');
    expect(figures.map((output) => output.output).sort()).toEqual(['capex.preliminaryEstimate', 'points.hardwareIo', 'points.integration', 'points.virtual']);
    for (const output of figures) expect(output.display.startsWith(`proposal:${SNAPSHOT_ID}.outputs.`), output.output).toBe(true);
    // The headline's figure is the investment output's own display of the same snapshot (one value id, one display: G2-7).
    expect(first.view.headline.investment.price.figure).toBe(`proposal:${SNAPSHOT_ID}.outputs.capex.preliminaryEstimate`);
    expect(displayById(first.displayObjects, first.view.headline.investment.price.figure).text).toBe('about 90,000 EUR (80,000 to 110,000 EUR)');
    for (const part of parts) {
      const output = part.fieldKey.replace('test.output.', '');
      expect(displayById(first.displayObjects, `proposal:${SNAPSHOT_ID}.outputs.${output}`).text, output).not.toContain('Not available yet');
    }

    // A second version, generated later with nothing produced: its displays are its own; the first version's stay.
    const input = testProposalInput({ fields });
    const second = proposalView({ ...input, snapshot: { ...input.snapshot, id: OTHER_SNAPSHOT }, versions: [{ snapshotId: OTHER_SNAPSHOT, createdAt: '2026-10-02T09:00:00.000000Z' }, ...input.versions] });
    expect(second.displayObjects.some((display) => display.valueId.startsWith(`proposal:${SNAPSHOT_ID}.outputs.`))).toBe(false);
    for (const output of [...second.view.points.outputs, ...second.view.investment.outputs]) {
      expect(output.display.startsWith(`proposal:${OTHER_SNAPSHOT}.`)).toBe(true);
      expect(output.availability).toBe('not_available_yet');
    }
  });
});
