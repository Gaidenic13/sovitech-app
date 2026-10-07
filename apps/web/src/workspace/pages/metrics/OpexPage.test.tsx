/**
 * DB-12 OPEX & Savings (R-095 with D-27's "Until decided"; US-FIN-12, US-FIN-13, US-FIN-14; 7.1.1-S8; docs/adr/0052):
 * the building's operating cost before any BMS, from its documents now. Written before the page (seen failing on the
 * planner's placeholder).
 */
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpexResponseSchema } from '@sovitech/view-model/browser';
import { json, renderAt } from '../../../test/harness';
import { M, checkPageState, metricsApi, openMetricsPage, pageText } from './test-support';
import { BUILDING, NO_SYSTEMS, OPERATING_MISSING, PROJECT, opexResponse } from './test-metrics';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const TITLE = 'OPEX & Savings';
const OPEX = `${M}/opex`;

function bound(text: string, root: HTMLElement): string | null | undefined {
  return within(root).getAllByText(text)[0]?.closest('[data-value-id]')?.getAttribute('data-value-id');
}

describe('DB-12 · R-095 "Until decided" · docs/adr/0052: OPEX & Savings', () => {
  it('ADR 0052 · V-10 (phase 6 part B): the TEST responses are what the contract lets the API serve', () => {
    for (const response of [opexResponse(), opexResponse({ existing: false }), opexResponse({ included: false })]) expect(OpexResponseSchema.safeParse(response).success).toBe(true);
  });

  it('G7-24 (rendered half) · R-095 · US-FIN-12 AC10 · rule 7 "An empty card ... is never shown": with no system included, "Building operating cost by system" reads its served line with the way to choose the systems, and draws no table and no filter', async () => {
    metricsApi({ [`GET ${OPEX}`]: () => json(200, opexResponse({ included: false })) });
    await openMetricsPage('opex', TITLE);
    const panel = screen.getByRole('region', { name: 'Building operating cost by system' });
    expect(bound(NO_SYSTEMS, panel)).toBe(`building:${BUILDING}.operatingCost.systems`);
    expect(within(panel).getByRole('link', { name: 'Choose the systems in scope' }).getAttribute('href')).toBe(`/projects/${PROJECT}/system-scope`);
    expect(panel.querySelector('table, [role="table"], [role="grid"]')).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'System' })).toBeNull();
    checkPageState();
  });

  it('R-095 · 7.1.1-S8 · US-FIN-14 AC1 · rule 1: "Building operating cost" reads the open question on annual amounts; maintenance, staff and other costs read Unknown, never 0; "OPEX" never stands alone as a value\'s label; no "% vs. baseline", trend, "Last 12 Months" or savings opportunity', async () => {
    metricsApi({ [`GET ${OPEX}`]: () => json(200, opexResponse()) });
    await openMetricsPage('opex', TITLE);
    expect(bound(OPERATING_MISSING, screen.getByRole('group', { name: 'Building operating cost' }))).toBe(`building:${BUILDING}.operatingCost.total`);
    for (const [label, path] of [
      ['Maintenance cost', 'maintenance'],
      ['Operations (staff)', 'staff'],
      ['Other costs', 'other'],
    ] as const) {
      const tile = screen.getByRole('group', { name: label });
      expect(bound('Unknown', tile)).toBe(`building:${BUILDING}.operatingCost.${path}`);
      expect(tile.textContent ?? '').not.toMatch(/\p{N}/u);
    }
    const labels = [...document.querySelectorAll('.sov-metric-tile__label, .sov-metric-panel__heading')].map((element) => element.textContent?.trim());
    expect(labels).not.toContain('OPEX');
    expect(labels).not.toContain('Total annual OPEX');
    const text = pageText();
    for (const absent of ['vs. baseline', 'Monthly', 'Last 12 Months', 'Top savings', 'Baseline', 'Savings opportunities', 'Market benchmark', 'Real-time']) expect(text, absent).not.toContain(absent);
    checkPageState();
  });

  it('US-FIN-13 AC8 · rule 7: an existing building\'s energy cost reads its "Not available yet" line with the way to upload a document; new construction\'s names what an estimate lacks, with no upload', async () => {
    metricsApi({ [`GET ${OPEX}`]: () => json(200, opexResponse()) });
    await openMetricsPage('opex', TITLE);
    const energy = screen.getByRole('group', { name: 'Energy cost' });
    expect(bound('Not available yet: TEST energy data read from bills', energy)).toBe(`building:${BUILDING}.operatingCost.energy`);
    expect(within(energy).getByRole('link', { name: 'Upload a document' }).getAttribute('href')).toBe(`/projects/${PROJECT}/documents?upload=open`);
    cleanup();
    metricsApi({ [`GET ${OPEX}`]: () => json(200, opexResponse({ existing: false })) });
    await openMetricsPage('opex', TITLE);
    const newBuild = screen.getByRole('group', { name: 'Energy cost' });
    expect(bound('Not available yet: TEST energy-price unit', newBuild)).toBe(`building:${BUILDING}.operatingCost.energy`);
    expect(within(newBuild).queryByRole('link')).toBeNull();
    checkPageState();
  });

  it('US-FIN-14 AC4 AC5 · R-098: the breakdown and the intensity read their lines on their panel, with no ⓘ, no benchmark marker and no chart', async () => {
    metricsApi({ [`GET ${OPEX}`]: () => json(200, opexResponse()) });
    await openMetricsPage('opex', TITLE);
    const breakdown = screen.getByRole('region', { name: 'Building operating cost breakdown' });
    expect(bound(OPERATING_MISSING, breakdown)).toBe(`building:${BUILDING}.operatingCost.breakdown`);
    expect(bound('Not available yet: TEST unit for cost per area per year; TEST open question on annual amounts', screen.getByRole('region', { name: 'Building operating cost intensity' }))).toBe(
      `building:${BUILDING}.operatingCost.intensity`,
    );
    expect(pageText()).not.toContain('ⓘ');
    expect(document.querySelector('[data-series-mark], [data-series-track]')).toBeNull();
    checkPageState();
  });

  it('US-FIN-12 AC7 AC10 AC11 · G10-7: one row per included system with its decision and its current cost\'s line, no Baseline or Savings column; "All Systems" narrows the rows in the page only, with no request', async () => {
    const seen = metricsApi({ [`GET ${OPEX}`]: () => json(200, opexResponse()) });
    await openMetricsPage('opex', TITLE);
    const table = screen.getByRole('table', { name: 'Building operating cost by system' });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['System', 'Scope', 'Current cost']);
    const rows = () => within(table).getAllByRole('row').slice(1);
    expect(rows().map((row) => within(row).getByRole('rowheader').textContent)).toEqual(['HVAC', 'Lighting', 'Water']);
    expect(bound('Not available yet: TEST per-system metering', rows()[0] as HTMLElement)).toBe(`building:${BUILDING}.operatingCost.systems.hvac`);
    expect(bound('TEST included', rows()[0] as HTMLElement)).toBe(`project:${PROJECT}.scope.hvac`);
    const before = seen.length;
    const filter = screen.getByRole('combobox', { name: 'System' });
    expect((filter as HTMLSelectElement).value).toBe('');
    expect(within(filter).getAllByRole('option').map((option) => option.textContent)).toEqual(['All Systems', 'HVAC', 'Lighting', 'Water']);
    fireEvent.change(filter, { target: { value: 'lighting' } });
    expect(rows().map((row) => within(row).getByRole('rowheader').textContent)).toEqual(['Lighting']);
    fireEvent.change(filter, { target: { value: '' } });
    expect(rows()).toHaveLength(3);
    expect(seen.length).toBe(before);
    checkPageState();
  });

  it('prompt 3 section 11 · rule 7: the page reads no stored version, so a `snapshot` in the address is not sent and never reads as not found; a failure says what could not be loaded and "Try again" reads again', async () => {
    let calls = 0;
    const seen = metricsApi({
      [`GET ${OPEX}`]: () => {
        calls += 1;
        return calls === 1 ? json(500, { code: 'internal_error' }) : json(200, opexResponse());
      },
    });
    renderAt(`/projects/${PROJECT}/metrics/opex?snapshot=not-an-id`);
    expect(await screen.findByText('This page could not be loaded. Nothing you entered is lost. Try again.')).toBeTruthy();
    expect(screen.queryByText('This version of the proposal is not in this project.')).toBeNull();
    expect(seen.filter((request) => request.path === OPEX).map((request) => request.url.searchParams.get('snapshot'))).toEqual([null]);
    checkPageState();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('group', { name: 'Building operating cost' });
  });

  it('G10-10 · GS-1: on the demo project the demo line shows once, in the footer', async () => {
    metricsApi({ [`GET ${OPEX}`]: () => json(200, opexResponse({ demo: true })) }, { demo: true });
    await openMetricsPage('opex', TITLE);
    expect(screen.getAllByText('TEST demo line')).toHaveLength(1);
  });
});
