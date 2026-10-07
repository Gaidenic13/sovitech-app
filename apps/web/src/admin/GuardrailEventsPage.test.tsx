/**
 * UD-41, guardrail events, paired metrics, calibration counts and the erasure log, read-only (phase 7;
 * ./GuardrailEventsPage.tsx; docs/adr/0053 decision 7, docs/adr/0054; PRD R-151, R-152 and R-155 "Until decided").
 * The rendered halves of GS-2, G3-26 and G13-15 (new at phase 7; the build log, phase 7, "Cases"; their view, API and
 * store halves are the other builders'), against the fake API of ../test/harness.ts with TEST responses the contract
 * accepts (./test-admin.ts).
 */
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_GUARDRAIL_EVENT_TYPES, AdminGuardrailEventsResponseSchema, SPEED_TRUTH_PAIRS } from '@sovitech/view-model/browser';
import { copy } from '../copy';
import { json } from '../test/harness';
import { ADMIN_ROUTES, adminApi, controlsIn, openAdminPage, pageColumn, rowOf, tableNamed } from './admin-test-support';
import { DEMO_PROJECT, ERASED_DOCUMENT, ERASED_EVENT, NOT_COUNTED, OWN_PROJECT, REMOVED, TARGET_NOT_SET, TEST_DEMO_LINE, THRESHOLD_NOT_SET, guardrailEventsResponse } from './test-admin';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PATH = '/admin/guardrail-events';

/** The texts holding a digit that sit outside every element bound to a value id. */
function unboundDigits(element: Element): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    if (/\d/u.test(text) && node.parentElement?.closest('[data-value-id]') === null) found.push(text);
  }
  return found;
}
const TITLE = 'Guardrail events';

describe('UD-41 · R-151 · R-152 · R-155: guardrail events, read-only', () => {
  it('UD-41 · ADR 0053 (contract admin.guardrailEvents): the TEST fixture is a response the contract accepts', () => {
    expect(() => AdminGuardrailEventsResponseSchema.parse(guardrailEventsResponse())).not.toThrow();
  });

  it('R-151 · section 8 · rule 2: one row for all projects and one per project, a column for each event type in section 8\'s order, every count bound; the split by release as served', async () => {
    adminApi();
    await openAdminPage(PATH, TITLE);
    const table = tableNamed('Events by type');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Project', ...ADMIN_GUARDRAIL_EVENT_TYPES.map((type) => copy.admin.guardrailEvents.type[type])]);
    const all = rowOf(table, 'All projects');
    for (const [index, type] of ADMIN_GUARDRAIL_EVENT_TYPES.entries()) {
      expect(all.querySelector(`[data-value-id="guardrail_count:all.${type}"]`)?.textContent).toBe(`TEST ${String(index + 10)}`);
    }
    for (const project of [DEMO_PROJECT, OWN_PROJECT]) {
      const row = rowOf(table, project);
      expect(row.querySelector(`[data-value-id="admin_project:${project}.id"]`)?.textContent).toBe(project);
      for (const [index, type] of ADMIN_GUARDRAIL_EVENT_TYPES.entries()) {
        expect(row.querySelector(`[data-value-id="guardrail_count:${project}.${type}"]`)?.textContent).toBe(`TEST ${String(index)}`);
      }
    }
    expect(rowOf(table, OWN_PROJECT).querySelector('[data-demo-line]')).toBeNull();
    // G10-10 (extended) · rule 10: the demo's row carries the line served with it, and no other row does.
    expect(rowOf(table, DEMO_PROJECT).querySelector('[data-demo-line]')?.textContent).toBe(TEST_DEMO_LINE.text);
    expect(table.querySelectorAll('[data-demo-line]')).toHaveLength(1);
    expect(screen.getByText('TEST by release: not counted yet.').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe('guardrail_count:all.byRelease');
  });

  it('GS-2 (rendered half) · section 4 "Measure it" · rule 1: for each project, each speed metric sits on one row beside its truth metric, each with its value and target as served; "not counted yet" and "Target not set" read as words, never a zero', async () => {
    adminApi();
    await openAdminPage(PATH, TITLE);
    const table = tableNamed('Speed and truth');
    expect(within(table).getByRole('columnheader', { name: 'Speed' }).getAttribute('colspan')).toBe('3');
    expect(within(table).getByRole('columnheader', { name: 'Truth' }).getAttribute('colspan')).toBe('3');
    for (const project of [DEMO_PROJECT, OWN_PROJECT]) {
      const group = table.querySelector(`tbody[data-admin-metrics-project="${project}"]`);
      if (group === null) throw new Error(`no row group for ${project}`);
      const rows = [...group.querySelectorAll('tr')];
      expect(rows).toHaveLength(SPEED_TRUTH_PAIRS.length);
      for (const [index, pair] of SPEED_TRUTH_PAIRS.entries()) {
        const row = rows[index] as HTMLTableRowElement;
        // The speed metric's name, value and target, then the truth metric's: one row, speed beside truth.
        expect([...row.querySelectorAll('[data-metric]')].map((cell) => cell.getAttribute('data-metric'))).toEqual([pair.speed, pair.truth]);
        for (const metric of [pair.speed, pair.truth]) {
          const value = row.querySelector(`[data-value-id="metric:${project}.${metric}"]`);
          expect(value?.textContent).toBe(metric === 'owner_correction_rate' ? 'TEST 1 of 4 decisions corrected (25%)' : NOT_COUNTED);
          expect(row.querySelector(`[data-value-id="metric:${project}.${metric}.target"]`)?.textContent).toBe(TARGET_NOT_SET);
          // Each value cell names its own half's metric among its headers, never the other half's.
          const headers = value?.closest('td')?.getAttribute('headers')?.split(' ') ?? [];
          const metricHeader = row.querySelector(`th[data-metric="${metric}"]`)?.id;
          expect(metricHeader === undefined ? false : headers.includes(metricHeader)).toBe(true);
        }
      }
      // The page adds no number of its own: every digit in the group sits inside an element bound to a value id (rule 2).
      expect(unboundDigits(group)).toEqual([]);
    }
  });

  it('G3-26 (rendered half) · rule 3 · R-152 "Until decided": the threshold\'s state as served, and for each tier its wording and the corrections per item type, bound; a tier with none says so', async () => {
    adminApi();
    await openAdminPage(PATH, TITLE);
    expect(screen.getByText(THRESHOLD_NOT_SET).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe('calibration:all.threshold');
    const table = tableNamed('Confidence wording');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Tier', 'Wording shown', 'Item type', 'Corrections']);
    const high = table.querySelector('tbody[data-tier="high"]');
    expect(high?.querySelector('[data-value-id="calibration:high.wording"]')?.textContent).toBe('TEST high wording, unchanged');
    expect(high?.querySelector('[data-value-id="calibration:high.items.building.floors.corrections"]')?.textContent).toBe('TEST 2');
    expect(high?.querySelector('[data-value-id="calibration:high.items.building.zones.corrections"]')?.textContent).toBe('TEST 3');
    expect(within(high as HTMLElement).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(['High', 'building.floors', 'building.zones']);
    const low = table.querySelector('tbody[data-tier="low"]');
    expect(low?.textContent).toContain('No correction recorded for this tier.');
  });

  it('G3-26 (rendered half) · guardrails section 10 ("Metrics prompt a review, never an edit") · US-ADMIN-21 AC3 · US-ADMIN-22 AC4: no control on the page sets, lowers or changes the threshold, widens a tolerance, allows estimation or raises the budget', async () => {
    adminApi();
    await openAdminPage(PATH, TITLE);
    expect(controlsIn(pageColumn())).toEqual([]);
    for (const name of [/threshold/iu, /tolerance/iu, /estimat/iu, /budget/iu, /lower/iu, /raise/iu, /set/iu]) expect(screen.queryByRole('button', { name })).toBeNull();
    expect(pageColumn().querySelectorAll('input, select, [role="slider"], [role="spinbutton"]')).toHaveLength(0);
  });

  it('G13-15 (rendered half) · rule 13 "Erasure" · US-ADMIN-23: one entry per erasure with the project and the document by id, the role, who asked, when and what was removed as served, bound; no document text, excerpt or file name', async () => {
    adminApi();
    await openAdminPage(PATH, TITLE);
    const table = tableNamed('Erasure log');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Project', 'Document', 'Role', 'Asked by', 'When', 'Removed']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    const row = rows[0] as HTMLElement;
    for (const [field, text] of [
      ['project', OWN_PROJECT],
      ['document', ERASED_DOCUMENT],
      ['by', 'TEST development owner'],
      ['at', 'TEST 6 Oct 2026'],
      ['removed', REMOVED],
    ] as const) {
      expect(row.querySelector(`[data-value-id="erasure:${ERASED_EVENT}.${field}"]`)?.textContent).toBe(text);
    }
    expect(within(row).getByText('Owner')).toBeTruthy();
    expect(row.querySelector('[data-copy-kind="evidence-excerpt"], blockquote, [data-document-id]')).toBeNull();
    expect(row.querySelector('[data-demo-line]')).toBeNull();
  });

  it('UD-41 · prompt 3 section 11: with no erasure and no correction counted, each table says so in words', async () => {
    adminApi({ [`GET ${ADMIN_ROUTES.guardrailEvents}`]: () => json(200, guardrailEventsResponse({ erasures: false, corrections: false })) });
    await openAdminPage(PATH, TITLE);
    expect(within(tableNamed('Erasure log')).getByText('No erasure has run.')).toBeTruthy();
    const calibration = tableNamed('Confidence wording');
    expect(within(calibration).getAllByText('No correction recorded for this tier.')).toHaveLength(3);
  });
});
