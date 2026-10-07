/**
 * The print route of a Metrics page with "Export Report" (`/projects/:projectId/print/metrics/:page/:snapshotId`; PRD
 * R-121; docs/adr/0052 decision 7; docs/adr/0050, amended in phase 6): what the API's printer opens and prints to PDF.
 * The PDF halves are G1-32 and G10-16 (tests/guardrails/), the printer's own tests (apps/api/src/proposal/export.test.ts)
 * and flow (j) on the e2e stack. Every value is TEST data.
 */
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LifecycleResponseSchema, PaybackResponseSchema, type LifecycleResponse, type PaybackResponse } from '@sovitech/view-model/browser';
import { copy } from '../../../../copy';
import { PRINT_PAGE_ATTRIBUTE, PRINT_READY_ATTRIBUTE } from '../../../../proposal/ProposalPrintPage';
import { DEMO_LINE, installFakeApi, json, projectList, renderAt, type Seen } from '../../../../test/harness';
import { CARBON_MISSING, CASH_FLOW_TEXT, INVESTMENT_MISSING, LIFECYCLE_MISSING, PAYBACK_MISSING, PROJECT, RANGE_TEXT, SAVINGS_MISSING, SNAPSHOT, STAGE_2, TAXONOMY_MISSING, lifecycleResponse, paybackResponse, sid } from '../test-metrics';

const PAY = copy.metrics.payback;
const LIFE = copy.metrics.lifecycle;
const path = (page: string, snapshotId = SNAPSHOT) => `/projects/${PROJECT}/print/metrics/${page}/${snapshotId}`;
const api = (page: 'payback' | 'lifecycle') => `GET /api/projects/${PROJECT}/metrics/${page}/print`;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const root = () => document.documentElement;

function servePayback(response: PaybackResponse): Seen[] {
  // A response the contract accepts, as the API's answerWith would send it.
  return installFakeApi({ [api('payback')]: () => json(200, PaybackResponseSchema.parse(response)) });
}

function serveLifecycle(response: LifecycleResponse): Seen[] {
  return installFakeApi({ [api('lifecycle')]: () => json(200, LifecycleResponseSchema.parse(response)) });
}

async function printed(page: 'payback' | 'lifecycle'): Promise<HTMLElement> {
  await waitFor(() => expect(root().getAttribute(PRINT_READY_ATTRIBUTE)).toBe('true'));
  const main = document.querySelector<HTMLElement>(`main[data-metrics-print="${page}"]`);
  expect(main).not.toBeNull();
  return main as HTMLElement;
}

/** The value element bound to a value id (not a chart's mark, which is bound to it too and holds no text). */
function bound(id: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-value-id="${id}"]:not([data-series-mark])`);
  expect(element, id).not.toBeNull();
  return element as HTMLElement;
}

describe('R-121 · US-REPORTS-13 · ADR 0052 decision 7: the print route of Payback and Lifecycle Analysis', () => {
  it('ADR 0050 · R-121: while the print view loads, the page is light (data-print-page), shows "Loading" and no figure, and sets no ready marker', async () => {
    installFakeApi({ [api('payback')]: () => new Promise<Response>(() => undefined) });
    renderAt(path('payback'));
    await screen.findByRole('status');
    expect(root().hasAttribute(PRINT_PAGE_ATTRIBUTE)).toBe(true);
    expect(root().hasAttribute(PRINT_READY_ATTRIBUTE)).toBe(false);
    expect(document.querySelector('[data-value-id]')).toBeNull();
    expect(document.body.hasAttribute('data-render-ready')).toBe(false);
  });

  it('R-121 · G9-8: the print view of the version the address names is read (`?snapshot=`), never the latest', async () => {
    const seen = servePayback(paybackResponse());
    renderAt(path('payback'));
    await printed('payback');
    const read = seen.filter((request) => request.path === `/api/projects/${PROJECT}/metrics/payback/print`);
    expect(read).toHaveLength(1);
    expect(read[0]?.url.searchParams.get('snapshot')).toBe(SNAPSHOT);
  });

  it('rule 10 · G10-16 (page half) · US-REVIEW-03: on the demo project the one demo line sits in the frame\'s header row, which the print repeats on every page, read first', async () => {
    servePayback(paybackResponse({ demo: true }));
    renderAt(path('payback'));
    const main = await printed('payback');
    const lines = within(main).getAllByText(DEMO_LINE.text);
    expect(lines).toHaveLength(1);
    const header = lines[0]?.closest('thead');
    expect(header?.closest('table')?.getAttribute('role')).toBe('presentation');
    expect(header?.closest('table')?.classList.contains('sov-print-frame')).toBe(true);
    expect(main.textContent?.indexOf(DEMO_LINE.text)).toBeLessThan(main.textContent?.indexOf(PAY.title) ?? -1);
    expect(document.body.hasAttribute('data-render-ready')).toBe(true);
  });

  it('G10-10 · US-REVIEW-03 AC7: on any other project there is no demo line and no running header', async () => {
    serveLifecycle(lifecycleResponse({ demo: false }));
    renderAt(path('lifecycle'));
    const main = await printed('lifecycle');
    expect(within(main).queryByText(DEMO_LINE.text)).toBeNull();
    expect(main.querySelector('thead.sov-print-frame__running')).toBeNull();
  });

  it('R-121 · R-096 · ADR 0050 decision 1: Payback prints its title, the project and version (bound), and every value of the page with no action: no button, link or Add on paper', async () => {
    servePayback(paybackResponse({ demo: true }));
    renderAt(path('payback'));
    const main = await printed('payback');
    expect(within(main).getByRole('heading', { level: 1, name: PAY.title })).toBeTruthy();
    expect(bound(`project:${PROJECT}.name`).textContent).toContain('TEST project for metrics');
    expect(bound(sid(SNAPSHOT, 'generatedOn')).textContent).toContain('TEST 5 Oct 2026, 10:00');
    expect(main.textContent).toContain(copy.metrics.generatedFrom);
    for (const [id, text] of [
      [sid(SNAPSHOT, 'outputs.capex.preliminaryEstimate'), INVESTMENT_MISSING],
      [sid(SNAPSHOT, 'metrics.savings.total'), SAVINGS_MISSING],
      [sid(SNAPSHOT, 'indicators.payback'), PAYBACK_MISSING],
      [sid(SNAPSHOT, 'metrics.carbon.reduction'), CARBON_MISSING],
      [sid(SNAPSHOT, 'metrics.carbon.trees'), CARBON_MISSING],
      [sid(SNAPSHOT, 'metrics.carbon.cars'), CARBON_MISSING],
      [sid(SNAPSHOT, 'series.savings.byStream.notAvailable'), 'Not available yet: TEST cost ranges; SOVITECH\'s method for TEST savings by stream'],
      [sid(SNAPSHOT, 'series.cashFlow.cumulative.notAvailable'), 'Not available yet: TEST cost ranges; SOVITECH\'s method for TEST cumulative cash flow'],
    ] as const) {
      expect(bound(id).textContent, id).toContain(text);
    }
    for (const heading of [PAY.totalInvestment, PAY.savings, PAY.payback, PAY.cumulativeCashFlow, PAY.savingsBreakdown, PAY.environmental, PAY.carbon, PAY.trees, PAY.cars]) {
      expect(main.textContent, heading).toContain(heading);
    }
    // Paper has no button (ADR 0050 decision 1): no Add, view switch, Export Report or link, though the TEST lines serve Adds.
    expect(within(main).queryAllByRole('button')).toEqual([]);
    expect(within(main).queryAllByRole('link')).toEqual([]);
    expect(main.textContent).not.toContain(copy.metrics.exportReport);
    expect(main.textContent).not.toContain(copy.metrics.showTable);
    expect(document.querySelector('img, svg image, canvas, picture')).toBeNull();
  });

  it('R-121 · R-097 · R-105: Lifecycle prints its title, the analysis period, its figures, charts, insights and equipment lines, each naming what is missing', async () => {
    serveLifecycle(lifecycleResponse());
    renderAt(path('lifecycle'));
    const main = await printed('lifecycle');
    expect(within(main).getByRole('heading', { level: 1, name: LIFE.title })).toBeTruthy();
    expect(bound(sid(SNAPSHOT, 'metrics.lifecycle.analysisPeriod')).textContent).toContain('Not available yet: TEST duration unit');
    for (const id of ['metrics.lifecycle.totalCost', 'metrics.lifecycle.netSavings', 'metrics.lifecycle.averageLife', 'metrics.lifecycle.keyInsights']) {
      expect(bound(sid(SNAPSHOT, id)).textContent, id).toContain(LIFECYCLE_MISSING);
    }
    expect(bound(sid(SNAPSHOT, 'metrics.lifecycle.equipment')).textContent).toContain(TAXONOMY_MISSING);
    for (const key of ['lifecycle.costComparison', 'lifecycle.costBreakdown', 'lifecycle.bySystem']) {
      expect(bound(sid(SNAPSHOT, `series.${key}.notAvailable`)).textContent, key).toMatch(/^Not available yet: .+SOVITECH's method for /u);
    }
    for (const heading of [LIFE.analysisPeriod, LIFE.totalCost, LIFE.netSavings, LIFE.averageLife, LIFE.costComparison, LIFE.costBreakdown, LIFE.bySystem, LIFE.keyInsights, LIFE.equipment]) {
      expect(main.textContent, heading).toContain(heading);
    }
    expect(within(main).queryAllByRole('button')).toEqual([]);
  });

  it('G1-32 (page half) · rule 1 · 2.8 "Prominence" · R-121: an unknown value on the printed page reads "Unknown" as its badge on its line, a missing one its "Not available yet" wording naming what is missing; never 0 or blank', async () => {
    servePayback(paybackResponse({ cashFlowFigures: true }));
    renderAt(path('payback'));
    const main = await printed('payback');
    const unknown = bound(sid(SNAPSHOT, 'outputs.cashFlow.TEST_cumulative.year1'));
    const line = unknown.querySelector('.sov-value__line');
    expect(line?.querySelector('[data-copy-kind="badge"]')?.textContent).toBe('Unknown');
    expect(unknown.textContent).not.toMatch(/\b0\b/u);
    const missing = bound(sid(SNAPSHOT, 'outputs.cashFlow.TEST_cumulative.year2'));
    expect(missing.textContent).toContain(CASH_FLOW_TEXT.yearMissing);
    // Each point named on paper, the figure with its badge on its own line.
    for (const name of [CASH_FLOW_TEXT.yearRangeName, CASH_FLOW_TEXT.yearUnknownName, CASH_FLOW_TEXT.yearMissingName]) expect(main.textContent).toContain(name);
    const figure = bound(sid(SNAPSHOT, 'outputs.cashFlow.TEST_cumulative.year0'));
    expect(figure.querySelector('.sov-value__line [data-copy-kind="badge"]')?.textContent).toBe('Estimated');
    expect(figure.querySelector('.sov-value__line')?.textContent).toContain(CASH_FLOW_TEXT.yearRange);
    // No value element is empty, and none reads a bare zero or dash in place of a value (a chart's marks are bound,
    // empty elements drawn at the served positions: G9-9; their values print beside them).
    for (const element of main.querySelectorAll<HTMLElement>('[data-value-id]:not([data-series-mark])')) {
      const text = (element.textContent ?? '').trim();
      expect(text, element.dataset['valueId']).not.toBe('');
      expect(text, element.dataset['valueId']).not.toMatch(/^(?:0|-|–|—)$/u);
    }
    expect(within(main).queryAllByRole('button')).toEqual([]);
  });

  it('rule 10 · G10-15 · R-121: a TEST stage 2 investment prints through the Price component with its stage label on paper, as on the page', async () => {
    servePayback(paybackResponse({ figure: 'range' }));
    renderAt(path('payback'));
    await printed('payback');
    const figure = bound(sid(SNAPSHOT, 'outputs.capex.preliminaryEstimate'));
    expect(figure.textContent).toContain(RANGE_TEXT);
    expect(figure.closest('.sov-price')?.textContent).toContain(STAGE_2);
  });

  it('ADR 0050 · rule 7 · rule 10: a print view that cannot be loaded sets the refusal marker, says the report could not be prepared with "Try again", and carries the demo line the project list served', async () => {
    installFakeApi({
      [api('lifecycle')]: () => json(500, { code: 'internal_error' }),
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project', demo: true }])),
    });
    renderAt(path('lifecycle'));
    await waitFor(() => expect(root().getAttribute(PRINT_READY_ATTRIBUTE)).toBe('failed'));
    expect(await screen.findByText(copy.print.loadFailed)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    await screen.findByText(DEMO_LINE.text);
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  });

  it('ADR 0050 · R-121: a page with no Export Report, or an id that is not one, shows "Page not found" with the refusal marker, and reads nothing', async () => {
    for (const address of [path('capex'), path('opex'), path('financial-overview'), path('payback', 'not-an-id'), `/projects/not-a-project/print/metrics/payback/${SNAPSHOT}`]) {
      root().removeAttribute(PRINT_READY_ATTRIBUTE);
      const seen = installFakeApi({});
      renderAt(address);
      await waitFor(() => expect(root().getAttribute(PRINT_READY_ATTRIBUTE), address).toBe('failed'));
      expect(await screen.findByRole('heading', { level: 1, name: copy.app.notFound }), address).toBeTruthy();
      expect(seen.filter((request) => request.path.includes('/metrics/')), address).toEqual([]);
      cleanup();
      vi.unstubAllGlobals();
    }
  });
});
