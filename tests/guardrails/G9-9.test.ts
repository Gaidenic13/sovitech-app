/**
 * G9-9 (docs/guardrails.md section 7; rule 9, "Arithmetic lives in code" and "Rounding"; 2.4, "A generated proposal
 * keeps a snapshot of the candidate ids and formula versions it used"; G9-8).
 * Situation: the cumulative cash-flow series behind a displayed payback is charted.
 * Expected: the chart is drawn from the engine series of the same snapshot and formula version as the figures beside
 * it. Its year-0 point equals the formula's year-0 cash flow, the zero crossing lies within the displayed payback
 * range, and every labelled point equals its plotted value.
 *
 * Phase 6 (the build log, phase 6, "Cases"; docs/adr/0052 decisions 4 and 5). No financial method is defined
 * (dashboards 8.6, proposal 7.2.12) and no unit for a duration exists (7.2.22), so live, every payback and cash flow
 * reads "Not available yet" (G1-31); the mechanism is proven with `TEST-cashFlow@1.0.0` and its TEST sequence
 * `cashFlow.TEST_cumulative` (packages/engine/test-formulas/series.ts), whose TEST payback is another output of the same
 * formula, inside the test runner only. The TEST project: a hotel with HVAC, Lighting, Energy, Water and CCTV included.
 * - Engine half: one run of one formula version gives the payback and every TEST year; TEST year 0 is the investment
 *   as a negative amount; the central values cross zero within the payback's range; the snapshot's rows of the series
 *   and of the payback name the same formula version (`seriesRowsOf`).
 * - View half (`seriesView`, `snapshotOutputView`, the formatting module's `plotPositions`): the series' source is the
 *   snapshot and formula version of the payback figure beside it; the year-0 point's value is the formula's year-0
 *   output, under its own value id, with the display the stored proposal's builder gives it (G2-7); every point's plot
 *   is the formatting module's position of the very candidate its display is formatted from; zero is plotted between
 *   the marks of the TEST years whose central values cross it, inside the displayed payback range.
 * - Rendered half (the kit's chart places each mark at its served position, bound to the point's value id): the web
 *   builder's component test of the kit's SeriesChart, titled "G9-9".
 *
 * Phase 6 part B (the review's findings; Expected unchanged):
 * - **The page half** (V-2, A-4): the figure beside a chart is the series' own formula's output of the same snapshot.
 *   Payback Analysis and Financial Overview, built over the TEST sequence (the page builders' series requests, which
 *   the test runner may point at a TEST series), show as their payback the TEST payback of the formula that drew the
 *   cash flow; a series with figures whose page names no output of its formula for the figure beside it is refused,
 *   never drawn beside a figure of another formula or of none.
 * - **Labelled, as plotted** (A-5): every point's plot is the formatting module's position of the numbers its label
 *   shows (the central value to rule 9's significant figures, the bounds rounded outward), so a labelled bound never
 *   falls off the axis.
 * - **The fixtures** (A-7): every chart the kit's harness page (read by the render test and axe in Chromium) and the web
 *   pages' tests draw with figures places each mark where the formatting module places the value its label shows. The
 *   kit's own component fixtures (packages/ui/src/components/test-series.ts) are internal to the kit, which no test
 *   outside it may import (the boundary rule), and the kit may not reach the formatting module: they were checked by
 *   hand against it in the fix round and agree.
 * Every value is TEST data.
 */
import { describe, expect, test } from 'vitest';
import { exact, interval, midpoint, multiply, point, seriesRowsOf, sum, type Interval } from '@sovitech/engine';
import { SeriesSchema, type DisplayObject, type Series } from '@sovitech/view-model/browser';
import {
  METRICS_SERIES,
  MetricsNotBuilt,
  financialOverviewView,
  formatEstimate,
  paybackView,
  plotPositions,
  rangeSignificantFigures,
  roundRangeOutward,
  seriesView,
  snapshotOutputView,
  type PlotInput,
  type SeriesRequest,
} from '@sovitech/view-model/server';
import { unitByCode } from '@sovitech/registry';
import { CUMULATIVE_CASH_FLOW_SERIES } from '../../packages/engine/test-formulas/series';
import * as WEB from '../../apps/web/src/workspace/pages/metrics/test-metrics';
import * as HARNESS from '../e2e/pages/ui/kit-series';
import { labelledPlotInput, metricsFields, metricsProposalInput, metricsRun, type MetricsProject } from './_support/metrics';
import { PROJECT_ID, SNAPSHOT_ID, displayById } from './_support/proposal';

const PROJECT: MetricsProject = { buildingType: 'hotel', scope: { hvac: 'include', lighting: 'include', energy: 'include', water: 'include', cctv: 'include' } };

/** TEST engine tables (fixtures/datasets, TEST-engine-tables): a hotel's per-building ranges of the five systems, and `perLineItem`. */
const INVESTMENT: Interval = sum([
  interval(exact(9001), exact(9002)),
  interval(exact(9002), exact(9003)),
  interval(exact(9003), exact(9004)),
  interval(exact(9006), exact(9007)),
  interval(exact(9008), exact(9009)),
]);
const YEARLY: Interval = interval(exact(9011), exact(9012));

/** The TEST cumulative cash flow as a page asks for it, with the TEST payback of its formula beside it (G9-9's page half). */
const CUMULATIVE: SeriesRequest = { key: 'cashFlow.TEST_cumulative', kind: 'sequence', totalOutput: null, label: 'TEST cumulative cash flow', beside: { payback: 'payback.TEST_periods' } };
const cumulativeOf = (year: number): Interval => sum([multiply(point(exact(year)), YEARLY), multiply(point(exact(-1)), INVESTMENT)]);

/** Where the central values cross zero, in TEST years (linear between the two TEST years around it). */
function crossingOf(centrals: readonly number[]): number {
  const index = centrals.findIndex((value, at) => value < 0 && (centrals[at + 1] ?? -1) >= 0);
  const before = centrals[index];
  const after = centrals[index + 1];
  if (index < 0 || before === undefined || after === undefined) throw new Error('the central values never cross zero');
  return index + -before / (after - before);
}

describe('G9-9 · rule 9: the cash-flow chart behind a payback is the engine series of the same snapshot and formula version', () => {
  test('G9-9 (engine half) · one formula version gives the payback and every TEST year; year 0 is the investment; the crossing lies in the payback range', () => {
    const { run, record } = metricsRun(metricsFields(PROJECT));
    const byOutput = new Map(run.outputs.map((output) => [output.output, output]));
    const payback = byOutput.get('payback.TEST_periods');
    if (payback?.kind !== 'figure') throw new Error('the TEST payback is no figure');
    expect(payback.candidate.range).toEqual({ low: 4, high: 5 });
    expect(payback.candidate.quantity).toEqual({ value: 4.5, unit: 'count' });
    const centrals: number[] = [];
    for (const declared of CUMULATIVE_CASH_FLOW_SERIES.points) {
      const year = Number.parseInt(declared.key.slice(1), 10);
      const output = byOutput.get(declared.output);
      if (output?.kind !== 'figure') throw new Error(`${declared.output} is no figure`);
      const expected = cumulativeOf(year);
      expect(output.candidate.range, declared.output).toEqual({ low: expected.low.toNumber(), high: expected.high.toNumber() });
      expect(output.candidate.quantity.value, declared.output).toBe(midpoint(expected).toNumber());
      expect(output.formula).toBe(payback.formula);
      centrals.push(output.candidate.quantity.value);
    }
    // TEST year 0: the investment as a negative amount (nothing returned yet).
    const yearZero = byOutput.get('cashFlow.TEST_cumulative.y00');
    if (yearZero?.kind !== 'figure') throw new Error('TEST year 0 is no figure');
    expect(yearZero.candidate.range).toEqual({ low: -INVESTMENT.high.toNumber(), high: -INVESTMENT.low.toNumber() });
    const crossing = crossingOf(centrals);
    expect(crossing).toBeGreaterThanOrEqual(payback.candidate.range?.low ?? Number.NaN);
    expect(crossing).toBeLessThanOrEqual(payback.candidate.range?.high ?? Number.NaN);
    // The snapshot: the series' rows and the payback's row name one formula version.
    const rows = seriesRowsOf(CUMULATIVE_CASH_FLOW_SERIES, record.outputs);
    expect(rows?.formula).toBe('TEST-cashFlow@1.0.0');
    expect(record.outputs.find((row) => row.output === 'payback.TEST_periods')?.formula).toBe(rows?.formula);
    expect(rows?.total).toBeNull();
  });

  test('G9-9 (view half) · the series names the payback\'s snapshot and formula version; year 0 is the formula\'s output; each plot is the formatting module\'s position of its own candidate', () => {
    const { input } = metricsProposalInput(PROJECT);
    const built = seriesView(input, CUMULATIVE);
    const series = SeriesSchema.parse(built.series);
    const payback = snapshotOutputView(input, 'payback.TEST_periods');
    const paybackRow = input.snapshot.outputs.find((row) => row.output === 'payback.TEST_periods');
    expect(series.state).toBe('figures');
    expect(series.source).toEqual({ snapshotId: SNAPSHOT_ID, formula: { id: paybackRow?.formulaId, version: paybackRow?.formulaVersion } });
    expect(series.source?.formula).toEqual({ id: 'TEST-cashFlow', version: '1.0.0' });
    expect(series.total).toBeNull();
    expect(series.points.map((entry) => entry.key)).toEqual(CUMULATIVE_CASH_FLOW_SERIES.points.map((entry) => entry.key));

    // Year 0: the formula's own year-0 output, under its own value id, with the one display the stored proposal's builder gives it (G2-7).
    const [first] = series.points;
    expect(first?.value).toBe(`proposal:${SNAPSHOT_ID}.outputs.cashFlow.TEST_cumulative.y00`);
    const yearZero = snapshotOutputView(input, 'cashFlow.TEST_cumulative.y00');
    expect(displayById(built.displayObjects, first?.value ?? '')).toEqual(displayById(yearZero.displayObjects, yearZero.valueId));
    expect(displayById(built.displayObjects, first?.name ?? '').text).toBe('TEST year 0');

    // Every labelled point equals its plotted value: its display is formatted from its own candidate, and its plot is the
    // formatting module's position of the very numbers that label shows (A-5: the central value as rounded, the bounds
    // as rounded outward), on an axis generated from those numbers.
    const eur = unitByCode('EUR');
    const inputs: PlotInput[] = series.points.map((entry) => {
      const row = input.snapshot.outputs.find((candidate) => `proposal:${SNAPSHOT_ID}.outputs.${candidate.output}` === entry.value);
      const candidate = row?.candidateId === null || row === undefined ? undefined : input.snapshotCandidates.get(row.candidateId);
      if (candidate?.quantity === undefined || candidate.range === undefined) throw new Error(`${entry.key} has no figure`);
      const text = displayById(built.displayObjects, entry.value).text;
      expect(text, entry.key).toBe(formatEstimate(candidate.quantity.value, candidate.range, eur, { numberFormat: 'en' }).text);
      return labelledPlotInput(text);
    });
    const positions = plotPositions('sequence', inputs);
    expect(series.points.map((entry) => entry.plot)).toEqual(positions.points);
    expect(series.zero).toBe(positions.zero);
    // A-5: no labelled bound falls off the axis: the lowest labelled low sits at its start, the highest labelled high at its end.
    expect(Math.min(...series.points.map((entry) => entry.plot?.low ?? Number.NaN))).toBe(0);
    expect(Math.max(...series.points.map((entry) => entry.plot?.high ?? Number.NaN))).toBe(1000);

    // The zero crossing: between the marks of the TEST years whose central values cross it, inside the displayed payback range.
    const centrals = inputs.map((entry) => (entry.kind === 'estimate' ? entry.value : Number.NaN));
    const crossing = crossingOf(centrals);
    const before = series.points[Math.floor(crossing)]?.plot?.mark;
    const after = series.points[Math.floor(crossing) + 1]?.plot?.mark;
    expect(series.zero).not.toBeNull();
    expect(before).toBeLessThanOrEqual(series.zero ?? Number.NaN);
    expect(after).toBeGreaterThanOrEqual(series.zero ?? Number.NaN);
    const paybackCandidate = input.snapshotCandidates.get(paybackRow?.candidateId ?? '');
    const stored = paybackCandidate?.range;
    if (stored === undefined) throw new Error('the payback has no range');
    const shown = roundRangeOutward(stored, rangeSignificantFigures(stored));
    const paybackDisplay = displayById(payback.displayObjects, payback.valueId);
    expect(paybackDisplay.text).toBe(`about 4.5 (${shown.low} to ${shown.high})`);
    expect(crossing).toBeGreaterThanOrEqual(Number.parseFloat(shown.low));
    expect(crossing).toBeLessThanOrEqual(Number.parseFloat(shown.high));
    expect(paybackDisplay.sourceLine?.text).toBe(`Method: ${paybackRow?.formulaId ?? ''}, version ${paybackRow?.formulaVersion ?? ''}`);
    // The series serves the payback beside it: the formula's own output, its one display (G2-7).
    expect(built.beside).toEqual({ payback: payback.valueId });
  });

  test('G9-9 (page half) · V-2 · A-4 (phase 6 part B): the payback beside the cash flow on Payback Analysis and on Financial Overview is the TEST payback of the formula that drew it, from the same snapshot', () => {
    const { input } = metricsProposalInput(PROJECT);
    const page = { projectId: PROJECT_ID, header: input.header, proposal: input };
    const paybackRow = input.snapshot.outputs.find((row) => row.output === 'payback.TEST_periods');
    const own = snapshotOutputView(input, 'payback.TEST_periods');
    const payback = paybackView(page, { ...METRICS_SERIES, cumulativeCashFlow: CUMULATIVE });
    if (payback.view.state !== 'generated') throw new Error('a stored version is read');
    expect(payback.view.cumulativeCashFlow.state).toBe('figures');
    expect(payback.view.cumulativeCashFlow.source).toEqual({ snapshotId: SNAPSHOT_ID, formula: { id: paybackRow?.formulaId, version: paybackRow?.formulaVersion } });
    expect(payback.view.payback).toBe(own.valueId);
    expect(displayById(payback.displayObjects, payback.view.payback)).toEqual(displayById(own.displayObjects, own.valueId));
    // The zero crossing of the drawn series lies within the payback range the tile shows.
    const marks = payback.view.cumulativeCashFlow.points.map((entry) => entry.plot?.mark ?? Number.NaN);
    const zero = payback.view.cumulativeCashFlow.zero ?? Number.NaN;
    const after = marks.findIndex((mark) => mark >= zero);
    expect(after).toBeGreaterThan(0);
    const shown = labelledPlotInput(displayById(payback.displayObjects, payback.view.payback).text);
    if (shown.kind !== 'estimate') throw new Error('the TEST payback is an estimate');
    expect(after - 1).toBeLessThanOrEqual(shown.high);
    expect(after).toBeGreaterThanOrEqual(shown.low);

    // Financial Overview over the same TEST sequence as its annual cash flow: its payback tile and row are that formula's.
    const overview = financialOverviewView(page, { ...METRICS_SERIES, annualCashFlow: CUMULATIVE });
    if (overview.view.state !== 'generated') throw new Error('a stored version is read');
    expect(overview.view.annualCashFlow.state).toBe('figures');
    expect(overview.view.indicators.payback).toBe(own.valueId);
  });

  test('G9-9 (page half) · V-2 · A-4 (phase 6 part B): a cash flow with figures whose page names no output of its formula for the payback beside it is refused, never drawn beside a payback of another formula or of none', () => {
    const { input } = metricsProposalInput(PROJECT);
    const page = { projectId: PROJECT_ID, header: input.header, proposal: input };
    expect(() => paybackView(page, { ...METRICS_SERIES, cumulativeCashFlow: { ...CUMULATIVE, beside: null } })).toThrow(MetricsNotBuilt);
    expect(() => paybackView(page, { ...METRICS_SERIES, cumulativeCashFlow: { ...CUMULATIVE, beside: null } })).toThrow(/G9-9/u);
    expect(() => financialOverviewView(page, { ...METRICS_SERIES, annualCashFlow: { ...CUMULATIVE, beside: null } })).toThrow(/G9-9/u);
    // A figure beside that is no output of the series' formula is refused the same way.
    expect(() => seriesView(input, { ...CUMULATIVE, beside: { payback: 'capex.TEST_bySystem.total' } })).toThrow(/G9-9/u);
    // The live pages name no output beside a cash flow, a savings breakdown or a lifecycle chart: none may be drawn yet.
    for (const key of ['annualCashFlow', 'cumulativeCashFlow', 'savingsByStream', 'lifecycleComparison', 'lifecycleBreakdown', 'lifecycleBySystem'] as const) expect(METRICS_SERIES[key].beside, key).toBeNull();
  });

  test('G9-9 · A-7 (phase 6 part B): every chart with figures that the kit\'s harness page and the web pages\' tests draw places each mark where the formatting module places the value its label shows', () => {
    const charts: readonly (readonly [string, Series, readonly DisplayObject[]])[] = [
      ['harness breakdown', HARNESS.CHART_BREAKDOWN, HARNESS.METRICS_DISPLAYS],
      ['harness sequence', HARNESS.CHART_SEQUENCE, HARNESS.METRICS_DISPLAYS],
      ...[WEB.financialOverviewResponse({ seriesFigures: true, figure: 'range' })].map((response) => {
        if (response.view.state !== 'generated') throw new Error('a stored version is read');
        return ['web investment by system', response.view.costBreakdown.bySystem, response.displayObjects] as const;
      }),
      ...[WEB.paybackResponse({ cashFlowFigures: true })].map((response) => {
        if (response.view.state !== 'generated') throw new Error('a stored version is read');
        return ['web cumulative cash flow', response.view.cumulativeCashFlow, response.displayObjects] as const;
      }),
    ];
    for (const [name, series, displays] of charts) {
      expect(series.state, name).toBe('figures');
      const inputs: PlotInput[] = series.points.map((entry) => {
        const display = displays.find((candidate) => candidate.valueId === entry.value);
        if (display === undefined) throw new Error(`${name}: ${entry.value} is not served`);
        return display.shape === 'missing' ? { kind: 'gap' } : labelledPlotInput(display.text);
      });
      const positions = plotPositions(series.kind, inputs);
      expect(series.points.map((entry) => entry.plot), name).toEqual(positions.points);
      expect(series.zero, name).toBe(positions.zero);
    }
  });
});
