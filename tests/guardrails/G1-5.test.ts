/**
 * G1-5 (docs/guardrails.md section 7; rule 1, "Unknown propagates": "No numeric stand-in. Code never substitutes 0, a
 * null read as 0, an average or a typical value for an unknown. This covers sums, averages, ratios, charts, sorting and
 * exports. A chart shows an unknown as a labelled gap").
 * Situation: a chart has one unknown line item.
 * Expected: rendered as a labelled gap, not a zero.
 *
 * Phase 6 (the build log, phase 6, "Cases"; docs/adr/0052 decision 4). No production formula declares a chart series
 * (every live Metrics chart reads one "Not available yet" line: G1-31), so the mechanism is proven with the TEST
 * breakdown `capex.TEST_bySystem` of `TEST-capexBySystem@1.0.0` (packages/engine/test-formulas/series.ts), its TEST
 * datasets, inside the test runner only. The TEST project: a hotel with HVAC and Lighting included, CCTV's decision
 * unknown (one unknown line item), every other system excluded.
 * - Engine half: the run gives HVAC's and Lighting's lines as estimates with their ranges, CCTV's line no candidate,
 *   naming its unknown decision, and the total a range over CCTV's two options; no output is a zero. The snapshot keeps
 *   CCTV's row with what it was missing (`seriesRowsOf`: a row with no candidate is never dropped).
 * - View half (`seriesView`): CCTV is a point with its name bound, its value the output's own "Not available yet"
 *   display naming the decision (with the owner's Add action, rule 7) and no plot position: a labelled gap, never a
 *   zero; the excluded systems are no points (G10-7). The other points are plotted from their candidates.
 * - Rendered half (the kit's chart draws the gap with its label and a dashed outline, no bar and no "0", and its table
 *   view shows the same display): the web builder's component test of the kit's SeriesChart, titled "G1-5".
 * Every value is TEST data.
 */
import { describe, expect, test } from 'vitest';
import { exact, hull, interval, midpoint, point, seriesRowsOf, sum } from '@sovitech/engine';
import { scopeFieldKey } from '@sovitech/registry';
import { SeriesSchema, servedDisplayOf, type DisplayObject } from '@sovitech/view-model/browser';
import { seriesView } from '@sovitech/view-model/server';
import { CAPEX_BY_SYSTEM_SERIES } from '../../packages/engine/test-formulas/series';
import { metricsFields, metricsProposalInput, metricsRun, type MetricsProject } from './_support/metrics';
import { PROJECT_ID, SNAPSHOT_ID, displayById } from './_support/proposal';

const PROJECT: MetricsProject = { buildingType: 'hotel', scope: { hvac: 'include', lighting: 'include', cctv: 'unknown' } };

/** TEST engine tables (fixtures/datasets, TEST-engine-tables): the per-building range of each system for a hotel. */
const TABLE = { hvac: { low: 9001, high: 9002 }, lighting: { low: 9002, high: 9003 }, cctv: { low: 9008, high: 9009 } };

/** Every text a display may show (the render contract's projection). */
const shownTexts = (display: DisplayObject): string[] => {
  const served = servedDisplayOf(display);
  return [served.text, ...(served.lines ?? []), ...(served.parts ?? [])];
};

describe('G1-5 · rule 1: a chart\'s unknown line item is a labelled gap, never a zero', () => {
  test('G1-5 (engine half) · the unknown line has no candidate and names what it waits for; the known lines are ranges; the total ranges over the unknown; nothing is zero', () => {
    const { run, record } = metricsRun(metricsFields(PROJECT));
    const byOutput = new Map(run.outputs.map((output) => [output.output, output]));
    for (const system of ['hvac', 'lighting'] as const) {
      const line = byOutput.get(`capex.TEST_bySystem.${system}`);
      if (line?.kind !== 'figure') throw new Error(`${system}'s line is no figure`);
      expect(line.candidate.source).toBe('estimated');
      expect(line.candidate.range).toEqual(TABLE[system]);
      expect(line.candidate.quantity).toEqual({ value: midpoint(interval(exact(TABLE[system].low), exact(TABLE[system].high))).toNumber(), unit: 'EUR' });
    }
    const cctv = byOutput.get('capex.TEST_bySystem.cctv');
    expect(cctv?.kind).toBe('not_available');
    if (cctv?.kind === 'not_available') expect(cctv.missing).toEqual([{ kind: 'input', fieldKey: scopeFieldKey('cctv'), subjectId: PROJECT_ID, reason: 'unknown' }]);
    for (const system of ['energy', 'access_control', 'fire_safety', 'water', 'elevators']) expect(byOutput.get(`capex.TEST_bySystem.${system}`)?.kind, system).toBe('not_available');
    // The total: HVAC and Lighting for certain, CCTV's line or nothing (its two options): a range, never a zero for CCTV.
    const total = byOutput.get('capex.TEST_bySystem.total');
    if (total?.kind !== 'figure') throw new Error('the total is no figure');
    const expected = sum([
      interval(exact(TABLE.hvac.low), exact(TABLE.hvac.high)),
      interval(exact(TABLE.lighting.low), exact(TABLE.lighting.high)),
      hull([point(exact(0)), interval(exact(TABLE.cctv.low), exact(TABLE.cctv.high))]),
    ]);
    expect(total.candidate.range).toEqual({ low: expected.low.toNumber(), high: expected.high.toNumber() });
    expect(total.candidate.quantity.value).toBe(midpoint(expected).toNumber());
    for (const output of run.outputs) if (output.kind !== 'not_available') expect(output.candidate.quantity.value, output.output).not.toBe(0);
    // The snapshot keeps the gap's row, with what it was missing; one formula version gives every row.
    const rows = seriesRowsOf(CAPEX_BY_SYSTEM_SERIES, record.outputs);
    expect(rows?.formula).toBe('TEST-capexBySystem@1.0.0');
    const gap = rows?.points.find((entry) => entry.point.key === 'cctv');
    expect(gap?.row.candidateId).toBeNull();
    expect(gap?.row.missing).toEqual([`input:${PROJECT_ID}:${scopeFieldKey('cctv')}:unknown`]);
    expect(rows?.points.map((entry) => entry.point.key)).toEqual(CAPEX_BY_SYSTEM_SERIES.points.map((entry) => entry.key));
  });

  test('G1-5 (view half) · the unknown line is a point with its name and its "Not available yet" display and no plot position; no point or label reads zero', () => {
    const { input } = metricsProposalInput(PROJECT);
    const built = seriesView(input, { key: 'capex.TEST_bySystem', kind: 'breakdown', totalOutput: 'capex.TEST_bySystem.total', label: 'TEST cost by system', beside: {} });
    const series = SeriesSchema.parse(built.series);
    expect(series.state).toBe('figures');
    expect(series.source).toEqual({ snapshotId: SNAPSHOT_ID, formula: { id: 'TEST-capexBySystem', version: '1.0.0' } });
    // G10-7: an excluded system is no point; the known lines and the unknown one are, in the declared order.
    expect(series.points.map((entry) => entry.key)).toEqual(['hvac', 'lighting', 'cctv']);
    const gap = series.points.find((entry) => entry.key === 'cctv');
    expect(gap?.plot).toBeNull();
    expect(gap?.value).toBe(`proposal:${SNAPSHOT_ID}.outputs.capex.TEST_bySystem.cctv`);
    expect(gap?.name).toBe(`proposal:${SNAPSHOT_ID}.series.capex.TEST_bySystem.points.cctv.name`);
    const name = displayById(built.displayObjects, gap?.name ?? '');
    expect(name.text).toBe('CCTV');
    const value = displayById(built.displayObjects, gap?.value ?? '');
    expect(value.shape).toBe('missing');
    expect(value.missing).toBe('not_available_yet');
    expect(value.text).toBe('Not available yet: systems in scope');
    // Rule 7: "It names what is missing and offers the action": the owner's Add on the decision still missing.
    expect(value.actions?.map((action) => action.kind)).toEqual(['add']);
    // The known lines are plotted from their candidates; the gap draws nothing.
    for (const key of ['hvac', 'lighting']) {
      const entry = series.points.find((candidate) => candidate.key === key);
      expect(entry?.plot, key).not.toBeNull();
      expect(displayById(built.displayObjects, entry?.value ?? '').shape, key).toBe('range');
    }
    expect(series.total).toEqual({ kind: 'value', output: 'capex.TEST_bySystem.total', display: `proposal:${SNAPSHOT_ID}.outputs.capex.TEST_bySystem.total` });
    // Never a zero: no display of the series shows "0" as a figure, a part or a line.
    for (const display of built.displayObjects) for (const text of shownTexts(display)) expect(text, display.valueId).not.toMatch(/(^|[^\d.,])0($|[^\d.,])/u);
  });
});
