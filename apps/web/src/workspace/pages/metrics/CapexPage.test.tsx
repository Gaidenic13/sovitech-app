/**
 * DB-13 CAPEX Breakdown (R-089, R-090, R-091, R-087; US-FIN-21; 7.1.1-P10; docs/adr/0052): an ordinary Metrics page of
 * the stored proposal. Written before the page (seen failing on the planner's placeholder).
 */
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CapexResponseSchema } from '@sovitech/view-model/browser';
import { heldHandler, json, pressTwice, sentTo } from '../../../test/harness';
import { M, checkPageState, metricsApi, openMetricsPage, pageText } from './test-support';
import { CARBON_MISSING, INVESTMENT_MISSING, NONE_GENERATED, PAYBACK_MISSING, PROJECT, SAVINGS_MISSING, SELECTED_MISSING, SERIES_MISSING, SNAPSHOT, capexResponse, noneGenerated, sid } from './test-metrics';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const TITLE = 'CAPEX breakdown';
const CAPEX = `${M}/capex`;
const P = `/api/projects/${PROJECT}`;
const OUTPUT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b01';

function bound(text: string, root: HTMLElement): string | null | undefined {
  return within(root).getAllByText(text)[0]?.closest('[data-value-id]')?.getAttribute('data-value-id');
}

function stubObjectUrls(): void {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:TEST', revokeObjectURL: () => undefined }));
}

describe('DB-13 · R-089 · US-FIN-21 · docs/adr/0052: CAPEX Breakdown of the stored proposal', () => {
  it('ADR 0052 · V-10 (phase 6 part B): the TEST responses are what the contract lets the API serve', () => {
    for (const response of [capexResponse(), capexResponse({ seriesFigures: true, figure: 'range' }), capexResponse({ selectedSystems: 'missing' }), noneGenerated()]) expect(CapexResponseSchema.safeParse(response).success).toBe(true);
  });

  it('G10-15 (rendered half) · R-089 · R-087 · R-091 · G1-31 · G10-7: INVESTMENT SUMMARY shows Total CAPEX as the investment output\'s "Not available yet" line (no stage), the cost per square metre\'s line, the investment by system as one line, and the systems left out; no "Automation Level", package, level, slider or "Powered by"', async () => {
    metricsApi({ [`GET ${CAPEX}`]: () => json(200, capexResponse()) });
    await openMetricsPage('capex', TITLE);
    const summary = screen.getByRole('region', { name: 'Investment summary' });
    expect(bound(INVESTMENT_MISSING, summary)).toBe(sid(SNAPSHOT, 'outputs.capex.preliminaryEstimate'));
    expect(within(summary).getByRole('group', { name: 'Total CAPEX' })).toBeTruthy();
    expect(bound('Not available yet: TEST unit for cost per area', summary)).toBe(sid(SNAPSHOT, 'metrics.costPerArea'));
    const bySystem = screen.getByRole('region', { name: 'Investment by system' });
    expect(bound(SERIES_MISSING('investment by system'), bySystem)).toBe(sid(SNAPSHOT, 'series.capex.bySystem.notAvailable'));
    expect(bySystem.querySelector('[data-series-mark], [data-series-gap], [data-series-track]')).toBeNull();
    const excluded = within(bySystem).getByRole('list', { name: 'Not in scope' });
    expect(within(excluded).getByText('CCTV')).toBeTruthy();
    expect(bound('TEST left out', excluded)).toBe(sid(SNAPSHOT, 'inputs.project.scope.cctv'));
    const text = pageText();
    for (const absent of ['Automation Level', 'Level ', 'Most popular', 'Recommended', 'Select Package', 'Powered by', 'SAUTER', 'Reset', 'View details', 'Analysis', 'Preliminary investment estimate', 'Indicative range']) {
      expect(text, absent).not.toContain(absent);
    }
    expect(screen.queryByRole('slider')).toBeNull();
    checkPageState();
  });

  it('R-089 · US-FIN-21 AC6 · G2-7 · V-3 (phase 6 part B): INVESTMENT SUMMARY\'s "Selected systems" shows the served count of the include decisions, bound to its own value id; while a decision as used was not recorded, its "Not available yet" line with the owner\'s Add', async () => {
    metricsApi({ [`GET ${CAPEX}`]: () => json(200, capexResponse()) });
    const first = await openMetricsPage('capex', TITLE);
    const summary = screen.getByRole('region', { name: 'Investment summary' });
    const selected = within(summary).getByRole('group', { name: 'Selected systems' });
    expect(bound('TEST 2', selected)).toBe(sid(SNAPSHOT, 'metrics.selectedSystems'));
    checkPageState();
    first.unmount();
    cleanup();
    metricsApi({ [`GET ${CAPEX}`]: () => json(200, capexResponse({ selectedSystems: 'missing' })) });
    const view = await openMetricsPage('capex', TITLE);
    const missing = within(screen.getByRole('region', { name: 'Investment summary' })).getByRole('group', { name: 'Selected systems' });
    expect(bound(SELECTED_MISSING, missing)).toBe(sid(SNAPSHOT, 'metrics.selectedSystems'));
    checkPageState();
    // Rule 7: the Add opens step 8 at the decision's inline ask, as on the stored proposal (R-012).
    fireEvent.click(within(missing).getByRole('button', { name: 'TEST add the systems in scope' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/8`));
  });

  it('R-089 Sources (E-SCOPE) · rule 11 · 7.1.1-L1: the systems as the snapshot used the decisions, read-only, each decision bound with its badge, Fire Safety\'s monitoring-only sentence, and the way to System Scope, the only editor after Generate', async () => {
    metricsApi({ [`GET ${CAPEX}`]: () => json(200, capexResponse()) });
    await openMetricsPage('capex', TITLE);
    const systems = screen.getByRole('region', { name: 'Systems' });
    const rows = within(systems).getAllByRole('listitem');
    expect(rows.map((row) => row.getAttribute('data-system'))).toEqual(['hvac', 'fire_safety', 'cctv']);
    expect(bound('TEST monitoring only sentence', systems)).toBe(sid(SNAPSHOT, 'lifeSafety.fire_safety'));
    expect(within(rows[0] as HTMLElement).getByText('Provided by you')).toBeTruthy();
    expect(systems.querySelector('input, [role="switch"], [role="checkbox"]')).toBeNull();
    expect(within(systems).getByRole('link', { name: 'Edit in System Scope' }).getAttribute('href')).toBe(`/projects/${PROJECT}/system-scope`);
    checkPageState();
  });

  it('US-FIN-21 AC8 · R-101 · R-102 · G2-7: the KPI strip reads the savings, the payback and the carbon dioxide reduction as their lines, the savings and payback under the same value ids as the other pages', async () => {
    metricsApi({ [`GET ${CAPEX}`]: () => json(200, capexResponse()) });
    await openMetricsPage('capex', TITLE);
    expect(bound(SAVINGS_MISSING, screen.getByRole('group', { name: 'Estimated annual savings' }))).toBe(sid(SNAPSHOT, 'metrics.savings.total'));
    expect(bound(PAYBACK_MISSING, screen.getByRole('group', { name: 'Payback period' }))).toBe(sid(SNAPSHOT, 'indicators.payback'));
    expect(bound(CARBON_MISSING, screen.getByRole('group', { name: 'Carbon dioxide reduction' }))).toBe(sid(SNAPSHOT, 'metrics.carbon.reduction'));
    checkPageState();
  });

  it('R-118 · 7.1.1-P10 · rule 7: "Download Proposal" exports the stored proposal of the page\'s snapshot, one request per press, never disabled; a failure says so beside it and the button takes presses again', async () => {
    stubObjectUrls();
    const held = heldHandler(() => json(201, { outputId: OUTPUT }));
    let fail = true;
    const seen = metricsApi({
      [`GET ${CAPEX}`]: () => json(200, capexResponse()),
      [`POST ${P}/proposals/${SNAPSHOT}/exports`]: held.handler,
      [`GET ${P}/exports/${OUTPUT}/file`]: () => (fail ? json(503, { code: 'export_unavailable' }) : new Response('TEST pdf', { status: 200, headers: { 'content-type': 'application/pdf' } })),
    });
    await openMetricsPage('capex', TITLE);
    const button = screen.getByRole('button', { name: 'Download Proposal' });
    pressTwice(button);
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('true'));
    held.answer();
    expect(await screen.findByText('The PDF could not be prepared. Your proposal is unchanged. Try again.')).toBeTruthy();
    expect(sentTo(seen, 'POST', `/proposals/${SNAPSHOT}/exports`)).toBe(1);
    expect(button.hasAttribute('disabled')).toBe(false);
    fail = false;
    fireEvent.click(button);
    await waitFor(() => expect(sentTo(seen, 'GET', `/exports/${OUTPUT}/file`)).toBe(2));
    await waitFor(() => expect(screen.queryByText('The PDF could not be prepared. Your proposal is unchanged. Try again.')).toBeNull());
  });

  it('rule 7: with no stored proposal, the one line and the way to the Proposal page; no Download Proposal', async () => {
    metricsApi({ [`GET ${CAPEX}`]: () => json(200, noneGenerated()) });
    await openMetricsPage('capex', TITLE);
    expect(bound(NONE_GENERATED, document.getElementById('main') as HTMLElement)).toBe(`project:${PROJECT}.metrics.source`);
    expect(screen.queryByRole('button', { name: 'Download Proposal' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Open the Proposal page' })).toBeTruthy();
    checkPageState();
  });
});
