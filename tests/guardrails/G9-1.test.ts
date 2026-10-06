/**
 * G9-1 (rule 9, "Rounding"; 2.8 "Estimated"): "Points estimate computed as 5,812, range 5,230 to 6,380" → "about 5,800
 * (5,200 to 6,400)", Estimated and Provisional, with its basis.
 *
 * Proven on the stored proposal (the view-model half; phase 5): a TEST points figure the engine would write from TEST
 * point templates (no SOVITECH template version is approved: the live app shows "Not available yet"), read from the
 * snapshot, resolved by the proposal's builder: the figure rounded outward at display, the badge Estimated, the
 * Provisional line counting the equipment items it rests on that SOVITECH has not checked, its method line and its
 * basis naming the inputs' labels and the dataset version.
 */
import { describe, expect, it } from 'vitest';
import type { Candidate } from '@sovitech/domain';
import { proposalView } from '@sovitech/view-model/server';
import { ProposalResponseSchema } from '@sovitech/view-model/browser';
import { displayById, productionRows, SNAPSHOT_ID, testEstimate, testProposalFields, testProposalInput } from './_support/proposal';
import { uuid } from './_support/view-model';

/** Three TEST equipment items (asset subjects) the figure rests on, none checked by SOVITECH. */
function equipmentItems(): Candidate[] {
  return [1, 2, 3].map((n) => ({
    id: uuid(300 + n),
    subjectId: uuid(400 + n),
    fieldKey: 'asset.type',
    choice: 'fcu',
    source: 'ai_inference',
    evidence: [],
    createdBy: uuid(91),
    authorRole: 'system',
    createdAt: '2026-09-30T09:00:00.000000Z',
  }));
}

describe('G9-1 · rule 9 · 2.8: an estimated points figure on the stored proposal', () => {
  it('G9-1 · US-PROPOSAL-07 · R-112: 5,812 (5,230 to 6,380) reads "about 5,800 (5,200 to 6,400)", Estimated, Provisional, with its method and basis', () => {
    const fields = testProposalFields();
    const items = equipmentItems();
    const figure = testEstimate(200, { output: 'points.hardwareIo', value: 5812, low: 5230, high: 6380, unit: 'count', inputCandidateIds: items.map((item) => item.id), assumptions: ['dataset:TEST-point-templates@1'] });
    const rows = productionRows(fields).rows.map((row) => (row.output === 'points.hardwareIo' ? { ...row, candidateId: figure.id, missing: [], incomplete: false } : row));
    const built = proposalView(testProposalInput({ fields, rows, snapshotCandidates: [...items, figure] }));
    const view = ProposalResponseSchema.shape.view.parse(built.view);
    const output = view.points.outputs.find((entry) => entry.output === 'points.hardwareIo');
    expect(output).toMatchObject({ availability: 'figure', outOfDate: false, price: null });
    const display = displayById(built.displayObjects, output?.display ?? '');
    expect(display.valueId).toBe(`proposal:${SNAPSHOT_ID}.outputs.points.hardwareIo`);
    expect(display.text).toBe('about 5,800 (5,200 to 6,400)');
    expect(display.shape).toBe('range');
    expect(display.badge).toEqual({ id: 'estimated', label: 'Estimated' });
    const lines = (display.lines ?? []).map((line) => line.text);
    expect(lines).toContain('Provisional: depends on 3 equipment items not yet checked');
    expect(display.sourceLine?.text).toBe('Method: TEST-pointsEstimate, version 1');
    expect(lines.some((line) => line.startsWith('Based on ') && line.includes('TEST-point-templates, version 1'))).toBe(true);
    // No intermediate digits: the figure, its bounds and the count are the only numbers, each bound to this display.
    expect(display.parts).toEqual(expect.arrayContaining(['5,800', '5,200', '6,400', '3']));
  });

  it('G9-1 · rule 9 · rule 1: no point figure while no template is approved: "Not available yet", naming the templates, never 0', () => {
    const built = proposalView(testProposalInput());
    const view = ProposalResponseSchema.shape.view.parse(built.view);
    for (const output of view.points.outputs) {
      const display = displayById(built.displayObjects, output.display);
      expect(output.availability, output.output).toBe('not_available_yet');
      expect(display.text.startsWith('Not available yet: SOVITECH point templates'), display.text).toBe(true);
      expect(display.text).not.toMatch(/\b0\b|—|–/u);
    }
  });
});
