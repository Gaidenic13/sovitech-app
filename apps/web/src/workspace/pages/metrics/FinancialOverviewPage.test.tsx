/**
 * DB-02 Financial Overview (R-088, R-087, R-090 to R-094, R-099 to R-103 "Until decided"; docs/adr/0052), and the states
 * every snapshot-reading Metrics page shares (loading, failed, a version not in this project, an earlier version, no
 * stored proposal). The rendered halves of G10-15, G1-31 and G1-5 on a page. Written before the page (seen failing on
 * the planner's placeholder).
 */
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FinancialOverviewResponseSchema } from '@sovitech/view-model/browser';
import { heldHandler, json, renderAt } from '../../../test/harness';
import { M, checkPageState, metricsApi, openMetricsPage, pageText } from './test-support';
import {
  COST_PER_AREA,
  INVESTMENT_MISSING,
  NONE_GENERATED,
  OPERATING_MISSING,
  OTHER_SNAPSHOT,
  PAYBACK_MISSING,
  PROJECT,
  RANGE_TEXT,
  SAVINGS_MISSING,
  SERIES_MISSING,
  SNAPSHOT,
  STAGE_2,
  financialOverviewResponse,
  noneGenerated,
  sid,
} from './test-metrics';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const TITLE = 'BMS investment overview';
const FO = `${M}/financial-overview`;

function bound(text: string, root: HTMLElement | Document = document): string | null | undefined {
  const scope = root instanceof Document ? screen : within(root);
  return scope.getAllByText(text)[0]?.closest('[data-value-id]')?.getAttribute('data-value-id');
}

describe('DB-02 · R-088 · docs/adr/0052: Financial Overview of the stored proposal', () => {
  it('ADR 0052 · V-10 (phase 6 part B): the TEST responses are what the contract lets the API serve', () => {
    for (const response of [financialOverviewResponse(), financialOverviewResponse({ figure: 'range', seriesFigures: true }), noneGenerated()]) {
      expect(FinancialOverviewResponseSchema.safeParse(response).success).toBe(true);
    }
  });

  it('G10-15 (rendered half) · R-088 · R-090 · G2-7 · rule 10 · rule 7: with every dataset gate closed, TOTAL BMS INVESTMENT and the "CAPEX" row show the investment output\'s own "Not available yet" line, naming what is missing, under one value id, with its Add; no stage label and no reserved pricing term', async () => {
    metricsApi({ [`GET ${FO}`]: () => json(200, financialOverviewResponse()) });
    await openMetricsPage('financial-overview', TITLE);
    const figure = sid(SNAPSHOT, 'outputs.capex.preliminaryEstimate');
    const places = document.querySelectorAll(`[data-value-id="${figure}"]`);
    expect(places).toHaveLength(2);
    for (const place of places) expect(place.textContent).toContain(INVESTMENT_MISSING);
    const tile = screen.getByRole('group', { name: 'Total BMS investment' });
    expect(bound(INVESTMENT_MISSING, tile)).toBe(figure);
    expect(within(tile).getByRole('button', { name: 'TEST add the area' })).toBeTruthy();
    const indicators = screen.getByRole('region', { name: 'Key financial indicators' });
    expect(bound(INVESTMENT_MISSING, indicators)).toBe(figure);
    for (const stage of ['Indicative range', 'Preliminary investment estimate', 'Formal quotation']) expect(pageText()).not.toContain(stage);
    checkPageState();
  });

  it('R-087 · R-099 · R-100 · R-102 · US-FIN-01 AC3 AC4 · 7.1.1-S8: savings, payback, NPV, IRR, the BMS operating cost and the cost per square metre each read their "Not available yet" line, bound, in their tiles and rows; no ROI, no "% vs. baseline", no VALUE DRIVERS', async () => {
    metricsApi({ [`GET ${FO}`]: () => json(200, financialOverviewResponse()) });
    await openMetricsPage('financial-overview', TITLE);
    expect(bound(SAVINGS_MISSING, screen.getByRole('group', { name: 'Estimated annual savings' }))).toBe(sid(SNAPSHOT, 'metrics.savings.total'));
    expect(bound(PAYBACK_MISSING, screen.getByRole('group', { name: 'Payback period' }))).toBe(sid(SNAPSHOT, 'indicators.payback'));
    expect(bound(PAYBACK_MISSING, screen.getByRole('group', { name: 'Net present value (NPV)' }))).toBe(sid(SNAPSHOT, 'indicators.npv'));
    expect(bound(COST_PER_AREA, screen.getByRole('group', { name: 'Total BMS investment' }))).toBe(sid(SNAPSHOT, 'metrics.costPerArea'));
    expect(bound(COST_PER_AREA, screen.getByRole('region', { name: 'Cost per square metre' }))).toBe(sid(SNAPSHOT, 'metrics.costPerArea'));
    const indicators = screen.getByRole('region', { name: 'Key financial indicators' });
    const names = [...indicators.querySelectorAll('[data-indicator-name]')].map((element) => element.textContent);
    expect(names).toEqual([
      'CAPEX',
      'BMS operating cost',
      'Estimated energy savings',
      'Estimated operational savings',
      'Total annual savings',
      'Payback period',
      'Net present value (NPV)',
      'Internal rate of return (IRR)',
    ]);
    expect(bound(OPERATING_MISSING, indicators)).toBe(sid(SNAPSHOT, 'indicators.operating_cost'));
    const text = pageText();
    for (const absent of ['ROI', 'vs. baseline', 'Value drivers', 'VALUE DRIVERS', 'By Phase', 'OPEX', 'BMS LIVE', 'Base case', 'Scenario', 'Project context']) expect(text).not.toContain(absent);
    expect(screen.queryByRole('button', { name: 'CAPEX' })).toBeNull();
    checkPageState();
  });

  it('G1-31 (rendered half) · R-091 · R-094 · R-103 "Until decided": COST BREAKDOWN\'s two tabs and ANNUAL CASH FLOW each read one "Not available yet" line naming what is missing and the method, with no point, bar, axis, zero or table; the systems left out are listed (G10-7); the tabs move with the arrow keys', async () => {
    metricsApi({ [`GET ${FO}`]: () => json(200, financialOverviewResponse()) });
    await openMetricsPage('financial-overview', TITLE);
    const breakdown = screen.getByRole('region', { name: 'Cost breakdown' });
    const tabs = within(breakdown).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['By System', 'By Building Area']);
    expect(bound(SERIES_MISSING('investment by system'), breakdown)).toBe(sid(SNAPSHOT, 'series.capex.bySystem.notAvailable'));
    fireEvent.keyDown(tabs[0] as HTMLElement, { key: 'ArrowRight' });
    await waitFor(() => expect(within(breakdown).getByRole('tab', { name: 'By Building Area' }).getAttribute('aria-selected')).toBe('true'));
    expect(bound(SERIES_MISSING('investment by level'), breakdown)).toBe(sid(SNAPSHOT, 'series.capex.byLevel.notAvailable'));
    const cashFlow = screen.getByRole('region', { name: 'Annual cash flow' });
    expect(bound(SERIES_MISSING('annual cash flow'), cashFlow)).toBe(sid(SNAPSHOT, 'series.cashFlow.annual.notAvailable'));
    expect(document.querySelector('[data-series-point], [data-series-mark], [data-series-gap], [data-series-track], [data-series-zero]')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    // G10-7: the systems left out, listed by their decisions as the snapshot used them.
    const excluded = within(breakdown).getByRole('list', { name: 'Not in scope' });
    expect(bound('TEST left out', excluded)).toBe(sid(SNAPSHOT, 'inputs.project.scope.cctv'));
    checkPageState();
  });

  it('G10-7 · rule 8 "Every value states what it measures" · DR-2 (the integrator, phase 6): "Not in scope" names each excluded system by its system alone, as CAPEX and the stored proposal do, never the decision\'s label "System in scope: <system>" beside "Not included"', async () => {
    metricsApi({ [`GET ${FO}`]: () => json(200, financialOverviewResponse()) });
    await openMetricsPage('financial-overview', TITLE);
    const excluded = within(screen.getByRole('region', { name: 'Cost breakdown' })).getByRole('list', { name: 'Not in scope' });
    const row = excluded.querySelector<HTMLElement>('[data-excluded="cctv"]');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('CCTV')).toBeTruthy();
    expect(bound('TEST left out', row as HTMLElement)).toBe(sid(SNAPSHOT, 'inputs.project.scope.cctv'));
    expect(excluded.textContent).not.toContain('TEST System in scope');
  });

  it('G1-5 (rendered half, on the page) · G9-8 · G2-7: a TEST series with figures draws its part as a mark bound to its value id, each unknown part as a labelled gap, and its total as the page\'s own price, the same value id and display as the tile', async () => {
    metricsApi({ [`GET ${FO}`]: () => json(200, financialOverviewResponse({ figure: 'range', seriesFigures: true })) });
    await openMetricsPage('financial-overview', TITLE);
    const breakdown = screen.getByRole('region', { name: 'Cost breakdown' });
    const hvac = sid(SNAPSHOT, 'outputs.capex.preliminaryEstimate.system.hvac');
    expect(breakdown.querySelector(`[data-series-mark][data-value-id="${hvac}"]`)).not.toBeNull();
    const gaps = breakdown.querySelectorAll('[data-series-gap]');
    expect(gaps).toHaveLength(2);
    expect(within(gaps[0] as HTMLElement).getByText('Not available yet: TEST cost table for lighting')).toBeTruthy();
    expect(within(gaps[1] as HTMLElement).getByText('Unknown')).toBeTruthy();
    const figure = sid(SNAPSHOT, 'outputs.capex.preliminaryEstimate');
    const total = breakdown.querySelector('[data-series-total]') as HTMLElement;
    expect(bound(RANGE_TEXT, total)).toBe(figure);
    const tile = screen.getByRole('group', { name: 'Total BMS investment' });
    expect(tile.querySelector(`[data-value-id="${figure}"]`)?.textContent).toBe(total.querySelector(`[data-value-id="${figure}"]`)?.textContent);
    // The figure carries its stage label inside its price, once (rule 10; V-11).
    expect(within(tile).getAllByText(STAGE_2)).toHaveLength(1);
    // The parts of a priced total are prices, each with its stage (rule 10; A-3 of phase 6 part B).
    const part = breakdown.querySelector(`.sov-series__value [data-value-id="${hvac}"]`) as HTMLElement;
    expect(part.closest('.sov-price')).not.toBeNull();
    expect(within(part).getByText(STAGE_2)).toBeTruthy();
    // The table view (prompt 3 section 11), named by its tab (A-9: the two tabs' charts never share one name).
    fireEvent.click(within(breakdown).getByRole('button', { name: 'Show as a table' }));
    expect(within(breakdown).getByRole('table', { name: 'By System' })).toBeTruthy();
    checkPageState();
  });

  it('A-9 (phase 6 part B) · WCAG 2.4.6: each cost tab\'s chart is named by its tab, so the two never share one accessible name', async () => {
    metricsApi({ [`GET ${FO}`]: () => json(200, financialOverviewResponse({ figure: 'range', seriesFigures: true })) });
    await openMetricsPage('financial-overview', TITLE);
    const breakdown = screen.getByRole('region', { name: 'Cost breakdown' });
    expect(within(breakdown).getByRole('group', { name: 'By System' })).toBeTruthy();
    expect(within(breakdown).queryByRole('group', { name: 'Cost breakdown' })).toBeNull();
  });

  it('R-012 · rule 7: an Add under a "Not available yet" line opens step 8 at that field\'s inline ask, as on the stored proposal', async () => {
    metricsApi({ [`GET ${FO}`]: () => json(200, financialOverviewResponse()) });
    const view = await openMetricsPage('financial-overview', TITLE);
    fireEvent.click(within(screen.getByRole('group', { name: 'Total BMS investment' })).getByRole('button', { name: 'TEST add the area' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/8`));
    expect(view.router.state.location.state).toEqual({ add: 'building.grossFloorArea' });
  });

  it('US-PROPOSAL-11 AC3 · G9-8: the page names the version its figures come from, bound; an earlier version says so and links to the latest', async () => {
    metricsApi({ [`GET ${FO}`]: () => json(200, financialOverviewResponse({ latest: false })) });
    await openMetricsPage('financial-overview', TITLE);
    expect(bound('TEST 5 Oct 2026, 10:00')).toBe(sid(SNAPSHOT, 'generatedOn'));
    expect(screen.getByText('From the preliminary proposal generated on')).toBeTruthy();
    expect(screen.getByText('These figures come from an earlier version of your preliminary proposal.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open the latest version' }).getAttribute('href')).toBe(`/projects/${PROJECT}/metrics/financial-overview`);
    checkPageState();
  });
});

describe('the states of a snapshot-reading Metrics page (prompt 3 section 11: loading, empty and error states; rule 7; rule 13)', () => {
  it('rule 7 · R-088: with no stored proposal the page reads "Not available yet: a generated preliminary proposal", bound, with the way to the Proposal page, and nothing else: no tile, panel or figure', async () => {
    metricsApi({ [`GET ${FO}`]: () => json(200, noneGenerated()) });
    await openMetricsPage('financial-overview', TITLE);
    expect(bound(NONE_GENERATED)).toBe(`project:${PROJECT}.metrics.source`);
    expect(screen.getByRole('link', { name: 'Open the Proposal page' }).getAttribute('href')).toBe(`/projects/${PROJECT}/proposal`);
    expect(document.querySelector('[data-metric-tile], [data-metric-panel], [data-series]')).toBeNull();
    checkPageState();
  });

  it('prompt 3 section 11 · R-003: while loading, the title and one polite line, no figure and not ready; a failure says what could not be loaded and "Try again" reads again', async () => {
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    let calls = 0;
    const seen = metricsApi({
      [`GET ${FO}`]: async (request) => {
        calls += 1;
        return calls === 1 ? held.handler(request) : json(200, financialOverviewResponse());
      },
    });
    renderAt(`/projects/${PROJECT}/metrics/financial-overview`);
    await screen.findByRole('heading', { name: TITLE, level: 1 });
    expect(await screen.findByText('Loading the figures')).toBeTruthy();
    expect(document.body.hasAttribute('data-render-ready')).toBe(false);
    expect(document.querySelector('[data-value-id^="proposal:"]')).toBeNull();
    await act(async () => {
      held.answer();
      await Promise.resolve();
    });
    expect(await screen.findByText('This page could not be loaded. Nothing you entered is lost. Try again.')).toBeTruthy();
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
    checkPageState();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('group', { name: 'Total BMS investment' });
    expect(seen.filter((request) => request.path === FO)).toHaveLength(2);
  });

  it('G13-11 (web half) · rule 13: a version another project holds, named by `?snapshot=`, is asked for once and reads as not in this project, with the way to the latest; an id that is no id is never sent', async () => {
    const seen = metricsApi({ [`GET ${FO}`]: (request) => (request.url.searchParams.get('snapshot') === OTHER_SNAPSHOT ? json(404, { code: 'not_found' }) : json(200, financialOverviewResponse())) });
    renderAt(`/projects/${PROJECT}/metrics/financial-overview?snapshot=${OTHER_SNAPSHOT}`);
    expect(await screen.findByText('This version of the proposal is not in this project.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open the latest version' }).getAttribute('href')).toBe(`/projects/${PROJECT}/metrics/financial-overview`);
    expect(seen.filter((request) => request.path === FO).map((request) => request.url.searchParams.get('snapshot'))).toEqual([OTHER_SNAPSHOT]);
    expect(document.querySelector('[data-metric-tile]')).toBeNull();
    checkPageState();
    cleanup();
    const again = metricsApi({ [`GET ${FO}`]: () => json(200, financialOverviewResponse()) });
    renderAt(`/projects/${PROJECT}/metrics/financial-overview?snapshot=not-an-id`);
    expect(await screen.findByText('This version of the proposal is not in this project.')).toBeTruthy();
    expect(again.filter((request) => request.path === FO)).toHaveLength(0);
  });

  it('A-10 (phase 6 part B) · rule 13 · rule 12: with no version named in the address, a refusal (a project the user cannot see, a bad request) never reads as a version not in this project; it is the page\'s failure, with "Try again"', async () => {
    for (const status of [404, 400]) {
      metricsApi({ [`GET ${FO}`]: () => json(status, { code: status === 404 ? 'not_found' : 'request_invalid' }) });
      renderAt(`/projects/${PROJECT}/metrics/financial-overview`);
      expect(await screen.findByText('This page could not be loaded. Nothing you entered is lost. Try again.'), String(status)).toBeTruthy();
      expect(screen.queryByText('This version of the proposal is not in this project.'), String(status)).toBeNull();
      expect(screen.queryByRole('link', { name: 'Open the latest version' }), String(status)).toBeNull();
      checkPageState();
      cleanup();
    }
  });

  it('G10-10 · GS-1 · rule 10: on the demo project the demo line shows once, in the frame\'s footer, beside the page', async () => {
    metricsApi({ [`GET ${FO}`]: () => json(200, financialOverviewResponse({ demo: true })) }, { demo: true });
    await openMetricsPage('financial-overview', TITLE);
    await waitFor(() => expect(screen.getAllByText('TEST demo line')).toHaveLength(1));
    expect(screen.getByText('TEST demo line').closest('footer')).not.toBeNull();
  });
});
