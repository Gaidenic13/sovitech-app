/**
 * UD-40, datasets read-only (phase 7; ./DatasetsPage.tsx; docs/adr/0053 decision 7; PRD R-150 "Until decided", R-141).
 * The rendered half of G1-33 (new at phase 7; the build log, phase 7, "Cases"; its view and API halves are the API
 * builder's), against the fake API of ../test/harness.ts with TEST responses the contract accepts (./test-admin.ts).
 */
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminDatasetsResponseSchema } from '@sovitech/view-model/browser';
import { json } from '../test/harness';
import { ADMIN_ROUTES, adminApi, controlsIn, openAdminPage, pageColumn, tableNamed } from './admin-test-support';
import { DATASET_KEYS, datasetsResponse } from './test-admin';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PATH = '/admin/datasets';
const TITLE = 'Datasets';

describe('UD-40 · R-150 "Until decided" · R-141: datasets and their approval status, read-only', () => {
  it('UD-40 · ADR 0053 (contract admin.datasets): the TEST fixture is a response the contract accepts', () => {
    expect(() => AdminDatasetsResponseSchema.parse(datasetsResponse())).not.toThrow();
  });

  it('G1-33 (rendered half) · US-ADMIN-19 AC1 AC2 · rule 2: each dataset the gates wait for is listed by its served name, with its version, "No approval record" and what waits for it, each bound to its value id', async () => {
    adminApi();
    await openAdminPage(PATH, TITLE);
    const table = tableNamed('Datasets');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Dataset', 'Version', 'Approval status', 'Waited for by']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(DATASET_KEYS.length);
    for (const [index, key] of DATASET_KEYS.entries()) {
      const row = rows[index] as HTMLElement;
      expect(within(row).getByRole('rowheader').textContent).toBe(`TEST dataset ${String(index + 1)}`);
      for (const [field, text] of [
        ['name', `TEST dataset ${String(index + 1)}`],
        ['version', 'No version received'],
        ['approval', 'No approval record'],
        ['waitsFor', `Waited for by TEST gate ${String(index + 1)} (D-92)`],
      ] as const) {
        expect(row.querySelector(`[data-value-id="dataset:${key}.${field}"]`)?.textContent).toBe(text);
      }
    }
  });

  it('G1-33 (rendered half) · guardrails section 10 ("What counts as approval") · prompt 3 5.4: no control on the page reviews, approves, edits or imports a dataset', async () => {
    adminApi();
    await openAdminPage(PATH, TITLE);
    expect(controlsIn(pageColumn())).toEqual([]);
    for (const name of [/approve/iu, /review/iu, /edit/iu, /import/iu, /upload/iu]) expect(screen.queryByRole('button', { name })).toBeNull();
    // The page states who approves, and claims no approval of its own.
    expect(pageColumn().textContent).toContain('Only the approver approves a dataset.');
  });

  it('UD-40 · prompt 3 section 11: with no dataset declared or waited for, the table says so in words', async () => {
    adminApi({ [`GET ${ADMIN_ROUTES.datasets}`]: () => json(200, datasetsResponse({ none: true })) });
    await openAdminPage(PATH, TITLE);
    expect(within(tableNamed('Datasets')).getByText('No dataset is declared, and no gate waits for one.')).toBeTruthy();
  });
});
