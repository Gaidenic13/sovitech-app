/**
 * G1-33 (new in phase 7; guardrails section 10: "Everything else needs explicit approval from the approver", "What
 * counts as approval", and "adding ... a reference dataset" is a loosening; rule 1, "Identifiers and prices ... come
 * only from reference data"; G1-12; PRD R-150 "Until decided": "The page lists each dataset and version with its
 * approval status, which reads that it has no approval record while no approver is named, and it has no review,
 * approval, edit or import control"; prompt 3 5.4: "No screen, admin page or script creates approval records").
 * Situation: the admin opens the datasets page while no approver is named in section 10.
 * Expected: each dataset listed reads that it has no approval record, and no control on the page approves, reviews, edits
 * or imports a dataset.
 * (The index row's words, verbatim; phase 7 part B, the verifier's V-7. Which datasets the page lists is the PRD's,
 * R-150 and R-132; this file also proves the list is not empty and holds every dataset the gates wait for, the IFC
 * mapping tables aside.)
 *
 * The view and API halves (the rendered page is the web's half, with axe and the render test): the approver table of
 * docs/guardrails.md section 10 names no one; the datasets the API lists for UD-40 (apps/api/src/admin/datasets.ts,
 * read through `readGate` on the start-up checked gate source) are the gates' dataset items, each "No approval record"
 * with no version received; no display object carries an action, and the contract has no admin route that writes.
 * One gate item is not listed, and the case says so: the IFC mapping tables `ifc-values` waits for, which PRD R-132's
 * "Until decided" line keeps off the page ("the datasets page lists no IFC mapping table as a dataset that shapes
 * candidates"; docs/adr/0053 decision 7). Every dataset here is a gate's item; none is loaded or approved.
 */
import { describe, expect, test } from 'vitest';
import { GATE_IDS, assertGatesStartupSafe, parseApprovalContext, readGate, readWorkingTreeApprovalDocuments } from '@sovitech/registry/gates';
import { AdminDatasetsResponseSchema, ROUTES } from '@sovitech/view-model/browser';
import { adminDatasetsView } from '@sovitech/view-model/server';
import { adminDatasetsOf } from '../../apps/api/src/admin/datasets';
import { PRODUCTION_API_REGISTRY } from '../../apps/api/src/wizard/registry';

describe('G1-33 · section 10 · rule 1 · R-150 "Until decided" · prompt 3 5.4', () => {
  test('G1-33: while no approver is named, each dataset the gates wait for is listed with no approval record, and nothing on the page approves, reviews, edits or imports one', () => {
    // The situation: section 10's approver table names no one.
    expect(parseApprovalContext(readWorkingTreeApprovalDocuments()).approvers).toEqual([]);

    const gates = assertGatesStartupSafe();
    const waitedFor = GATE_IDS.flatMap((gateId) => readGate(gates, gateId).waitsFor.filter((item) => item.kind === 'dataset').map((item) => item.item));
    const response = adminDatasetsView({ asOf: '2026-10-07T09:00:00.000000Z', datasets: adminDatasetsOf(gates, PRODUCTION_API_REGISTRY) });
    expect(AdminDatasetsResponseSchema.safeParse(response).success).toBe(true);
    const text = (valueId: string): string | undefined => response.displayObjects.find((display) => display.valueId === valueId)?.text;
    // V-7: never an empty page passing for a page that lists every dataset (R-150 "lists every reference dataset").
    expect(response.view.datasets.length).toBeGreaterThan(0);
    const listedNames = response.view.datasets.map((dataset) => text(dataset.name));
    // Each dataset item of the gates is listed, the IFC mapping tables aside (R-132 "Until decided").
    expect([...listedNames].sort()).toEqual(waitedFor.filter((item) => item !== 'IFC mapping tables (GAP-I)').sort());
    expect(waitedFor).toContain('IFC mapping tables (GAP-I)');
    for (const dataset of response.view.datasets) {
      expect(text(dataset.approval), dataset.datasetKey).toBe('No approval record');
      expect(text(dataset.version), dataset.datasetKey).toBe('No version received');
    }
    // No control: no display object carries an action, and the contract's admin routes are the three reads.
    for (const display of response.displayObjects) expect(display.actions, display.valueId).toBeUndefined();
    expect(ROUTES.filter((route) => route.path.startsWith('/api/admin')).every((route) => route.method === 'GET')).toBe(true);
  });
});
