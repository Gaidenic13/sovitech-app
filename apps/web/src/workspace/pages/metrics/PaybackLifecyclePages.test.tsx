/**
 * DB-21 Payback Analysis (R-096, R-099 to R-103 "Until decided") and DB-22 Lifecycle Analysis (R-097, R-105 "Until
 * decided"), with Export Report (R-121; docs/adr/0052 decision 7). Written before the pages (seen failing on the
 * planner's placeholders).
 */
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LifecycleResponseSchema, PaybackResponseSchema } from '@sovitech/view-model/browser';
import { heldHandler, json, pressTwice, sentTo } from '../../../test/harness';
import { M, checkPageState, metricsApi, openMetricsPage, pageText } from './test-support';
import {
  CARBON_MISSING,
  INVESTMENT_MISSING,
  LIFECYCLE_MISSING,
  PAYBACK_MISSING,
  PROJECT,
  SAVINGS_MISSING,
  SERIES_MISSING,
  SNAPSHOT,
  TAXONOMY_MISSING,
  lifecycleResponse,
  noneGenerated,
  paybackResponse,
  sid,
} from './test-metrics';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const P = `/api/projects/${PROJECT}`;

function bound(text: string, root: HTMLElement): string | null | undefined {
  return within(root).getAllByText(text)[0]?.closest('[data-value-id]')?.getAttribute('data-value-id');
}

function stubObjectUrls(): Blob[] {
  const created: Blob[] = [];
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: (blob: Blob) => (created.push(blob), 'blob:TEST'), revokeObjectURL: () => undefined }));
  return created;
}

const PDF = () => new Response('TEST pdf', { status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="TEST.pdf"' } });

describe('DB-21 · R-096 · docs/adr/0052: Payback Analysis', () => {
  it('ADR 0052 · V-10 (phase 6 part B): the TEST responses are what the contract lets the API serve', () => {
    for (const response of [paybackResponse(), noneGenerated()]) expect(PaybackResponseSchema.safeParse(response).success).toBe(true);
  });

  it('G10-15 (rendered half) · R-096 · R-100 · R-101 · R-102 · G1-31: the investment as its "Not available yet" line (no stage), the payback and savings as their lines, SAVINGS BREAKDOWN and CUMULATIVE CASH FLOW as one line each, the environmental figures as theirs; no ROI, SCENARIO COMPARISON, KEY ASSUMPTIONS, "Compare Scenarios", "Edit" or "Back to Metrics"', async () => {
    metricsApi({ [`GET ${M}/payback`]: () => json(200, paybackResponse()) });
    await openMetricsPage('payback', 'Payback Analysis');
    expect(bound(INVESTMENT_MISSING, screen.getByRole('group', { name: 'Total investment (CAPEX)' }))).toBe(sid(SNAPSHOT, 'outputs.capex.preliminaryEstimate'));
    expect(bound(PAYBACK_MISSING, screen.getByRole('group', { name: 'Payback period' }))).toBe(sid(SNAPSHOT, 'indicators.payback'));
    expect(bound(SAVINGS_MISSING, screen.getByRole('group', { name: 'Estimated annual savings' }))).toBe(sid(SNAPSHOT, 'metrics.savings.total'));
    expect(bound(SERIES_MISSING('savings by stream'), screen.getByRole('region', { name: 'Savings breakdown (annual)' }))).toBe(sid(SNAPSHOT, 'series.savings.byStream.notAvailable'));
    expect(bound(SERIES_MISSING('cumulative cash flow'), screen.getByRole('region', { name: 'Cumulative cash flow' }))).toBe(sid(SNAPSHOT, 'series.cashFlow.cumulative.notAvailable'));
    const environment = screen.getByRole('region', { name: 'Environmental impact (annual)' });
    for (const [label, path] of [
      ['Carbon dioxide reduction', 'metrics.carbon.reduction'],
      ['Equivalent trees', 'metrics.carbon.trees'],
      ['Cars off the road', 'metrics.carbon.cars'],
    ] as const) {
      expect(bound(CARBON_MISSING, within(environment).getByRole('group', { name: label }))).toBe(sid(SNAPSHOT, path));
    }
    const text = pageText();
    for (const absent of ['ROI', 'Scenario', 'Key assumptions', 'Compare', 'Back to Metrics', 'BMS Live', 'Preliminary investment estimate']) expect(text, absent).not.toContain(absent);
    expect(screen.queryByRole('button', { name: /edit/iu })).toBeNull();
    expect(document.querySelector('[data-series-mark], [data-series-track]')).toBeNull();
    checkPageState();
  });

  it('R-121 · F-EXPORT-01 · rule 7: "Export Report" reads the page of the snapshot shown as a PDF, one request per press, never disabled, a polite line while it is prepared; a failure says so beside it and the button takes presses again', async () => {
    const files = stubObjectUrls();
    const held = heldHandler(() => json(503, { code: 'export_unavailable' }));
    let calls = 0;
    const seen = metricsApi({
      [`GET ${M}/payback`]: () => json(200, paybackResponse()),
      [`GET ${P}/exports/metrics/payback`]: async (request) => {
        calls += 1;
        return calls === 1 ? held.handler(request) : PDF();
      },
    });
    await openMetricsPage('payback', 'Payback Analysis');
    const button = screen.getByRole('button', { name: 'Export Report' });
    pressTwice(button);
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('true'));
    expect(screen.getByText('Preparing the report')).toBeTruthy();
    held.answer();
    expect(await screen.findByText('The report could not be prepared. Nothing was lost. Try again.')).toBeTruthy();
    const exports = seen.filter((request) => request.path === `${P}/exports/metrics/payback`);
    expect(exports).toHaveLength(1);
    expect(exports[0]?.url.searchParams.get('snapshot')).toBe(SNAPSHOT);
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.getAttribute('aria-describedby')).not.toBeNull();
    fireEvent.click(button);
    await waitFor(() => expect(files).toHaveLength(1));
    expect(sentTo(seen, 'GET', '/exports/metrics/payback')).toBe(2);
    await waitFor(() => expect(screen.queryByText('The report could not be prepared. Nothing was lost. Try again.')).toBeNull());
  });

  it('rule 7: with no stored proposal, the one line and the way to the Proposal page; no Export Report', async () => {
    metricsApi({ [`GET ${M}/payback`]: () => json(200, noneGenerated()) });
    await openMetricsPage('payback', 'Payback Analysis');
    expect(screen.queryByRole('button', { name: 'Export Report' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Open the Proposal page' })).toBeTruthy();
    checkPageState();
  });
});

describe('DB-22 · R-097 · R-105 "Until decided" · docs/adr/0052: Lifecycle Analysis', () => {
  it('ADR 0052 · V-10 (phase 6 part B): the TEST responses are what the contract lets the API serve', () => {
    for (const response of [lifecycleResponse(), noneGenerated()]) expect(LifecycleResponseSchema.safeParse(response).success).toBe(true);
  });

  it('R-097 · R-105 · US-FIN-04 AC5 · US-FIN-26 AC3 · G1-31: the analysis period, the three tiles and KEY INSIGHTS read their lines; the three charts one line each; EQUIPMENT LIFECYCLE names the taxonomy, with no row, chevron or pager; no ROI, selector or "Configure"', async () => {
    metricsApi({ [`GET ${M}/lifecycle`]: () => json(200, lifecycleResponse()) });
    await openMetricsPage('lifecycle', 'Lifecycle Analysis');
    expect(bound('Not available yet: TEST duration unit', screen.getByRole('group', { name: 'Analysis period' }))).toBe(sid(SNAPSHOT, 'metrics.lifecycle.analysisPeriod'));
    for (const [label, path] of [
      ['Total lifecycle cost', 'totalCost'],
      ['Net savings', 'netSavings'],
      ['Average equipment life', 'averageLife'],
    ] as const) {
      expect(bound(LIFECYCLE_MISSING, screen.getByRole('group', { name: label }))).toBe(sid(SNAPSHOT, `metrics.lifecycle.${path}`));
    }
    expect(bound(LIFECYCLE_MISSING, screen.getByRole('region', { name: 'Key insights' }))).toBe(sid(SNAPSHOT, 'metrics.lifecycle.keyInsights'));
    for (const [heading, key, what] of [
      ['Lifecycle cost comparison', 'lifecycle.costComparison', 'lifecycle cost comparison'],
      ['Cost breakdown (lifecycle)', 'lifecycle.costBreakdown', 'lifecycle cost breakdown'],
      ['Lifecycle by system', 'lifecycle.bySystem', 'lifecycle cost by system'],
    ] as const) {
      expect(bound(SERIES_MISSING(what), screen.getByRole('region', { name: heading }))).toBe(sid(SNAPSHOT, `series.${key}.notAvailable`));
    }
    const equipment = screen.getByRole('region', { name: 'Equipment lifecycle' });
    expect(bound(TAXONOMY_MISSING, equipment)).toBe(sid(SNAPSHOT, 'metrics.lifecycle.equipment'));
    expect(within(equipment).queryByRole('table')).toBeNull();
    expect(within(equipment).queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    const text = pageText();
    for (const absent of ['ROI', 'Configure', 'Back to Metrics', 'Showing', 'BMS Live']) expect(text, absent).not.toContain(absent);
    checkPageState();
  });

  it('R-121: "Export Report" reads the lifecycle page of the snapshot shown', async () => {
    stubObjectUrls();
    const seen = metricsApi({ [`GET ${M}/lifecycle`]: () => json(200, lifecycleResponse()), [`GET ${P}/exports/metrics/lifecycle`]: () => PDF() });
    await openMetricsPage('lifecycle', 'Lifecycle Analysis');
    fireEvent.click(screen.getByRole('button', { name: 'Export Report' }));
    await waitFor(() => expect(sentTo(seen, 'GET', '/exports/metrics/lifecycle')).toBe(1));
    expect(seen.find((request) => request.path === `${P}/exports/metrics/lifecycle`)?.url.searchParams.get('snapshot')).toBe(SNAPSHOT);
  });
});
