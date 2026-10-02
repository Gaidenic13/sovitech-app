/**
 * Phase 4 flow (d) (prompt 3 section 10, phase 4 exit; docs/build-log.md, phase 4 plan, B7): the demo project's
 * workspace, entered through Generate and moved through by the sidebar, as the development owner (a member of the demo,
 * PRD R-136 interim). Nothing is written to the demo by the workspace: System Scope's switches are not pressed and the
 * delete confirmation is cancelled (the demo is shared by every spec of the run). Generate records step 8's skip of the
 * gross floor area's inline ask (rule 7; G7-11), as phase 3's flow (a) does, so the project card then shows "You can
 * provide this later." under it.
 *
 * On every page and state reached: the render test with its reserved-term scan, axe (WCAG 2.2 AA) and the demo line
 * (screen-checks.ts); the demo line shows once, in the 48px status footer, never under the header (ADR 0043; R-139);
 * no dialog. Then GS-1's half for the workspace: no `question_for_known_field` and no `confirmation_budget_exceeded`
 * event on the demo after it (guardrails section 8; rules 5 and 6), read through the stack's TEST-only control route.
 *
 * What the demo shows with no API key (the owner's answers in force): the decisions the seed stored (Provided by you);
 * every count by type "Not available yet: SOVITECH asset taxonomy"; SOVITECH's design levels "Not available yet";
 * Zones and Equipment empty, saying what is stored and never "not found" (G12-10); the documents with each Category
 * Unknown (G1-26); no model area on any page (the owner's answer of 2026-10-02; R-054, R-078, R-080).
 *
 * G2-7's e2e half: HVAC's scope decision, one value id, renders the same text on System Scope's row and in Topology's
 * group (the render test checks each against its one served display object on every screen).
 */
import { expect, test, type Page } from '@playwright/test';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { readGuardrailEvents } from '../support/control';
import { demoProjectId, signIn } from '../support/wizard';
import { followSidebar, generateIntoWorkspace, openSwitcher } from '../support/workspace';
import { DEMO_LINE, checkScreen, type CheckedScreens } from './screen-checks';

/** What no workspace page shows (R-054, R-073 to R-080 "Until decided"; R-139; D14; 7.2.10; rule 12). */
const NEVER = /\b3D\b|\b2D\b|Hybrid|Floor Plan|Isolate|BMS LIVE|Last sync|Last Update|Alarms|Open in BMS|proposed design|Export|not found/iu;

/** The frame as ADR 0043 draws it: the built pages in order, the current one marked; the demo line once, in the footer. */
async function frameHolds(page: Page, current: string): Promise<void> {
  const nav = page.getByRole('navigation', { name: 'Project pages' });
  await expect(nav.getByRole('link')).toHaveText(['Proposal', 'System Scope', 'Topology', 'Zones', 'Equipment', 'Documents']);
  await expect(nav.locator('a[aria-current="page"]')).toHaveText(current);
  await expect(page.getByText(DEMO_LINE, { exact: true })).toHaveCount(1);
  await expect(page.locator('.sov-status-footer').getByText(DEMO_LINE, { exact: true })).toBeVisible();
  await expect(page.getByRole('banner').getByText(DEMO_LINE)).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(NEVER);
}

test('G2-7 (e2e half) · US-ADMIN-13 · US-ADMIN-06 · US-ADMIN-12 · US-REVIEW-14 · US-SCOPE-05 · US-TOPO-01 · US-TOPO-05 · US-ZONES-02 · US-ASSETS-05 · US-DOCS-13 · R-146 · R-145 · R-049 · R-139 · R-071 · R-072 · G1-26 · G1-27 · G12-10 · G13-9 · GS-1 · rules 5, 6, 7, 10, 11 and 12: the demo\'s workspace through the sidebar, the demo line once in the footer on every page (phase 4 flow (d))', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  const checked: CheckedScreens = [];
  const demo = demoProjectId();
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });
  await signIn(page);

  // From Generate into the workspace: the proposal page is the landing (ADR 0043 decision 3).
  await generateIntoWorkspace(page, demo);
  await frameHolds(page, 'Proposal');
  // The project card (R-049): the step 1 and step 5 answers, bound, with no photo, Status or BMS Platform.
  const card = page.getByRole('region', { name: 'Building' });
  await expect(card.getByRole('group', { name: 'Project type' })).toContainText('Provided by you');
  await expect(card).not.toContainText(/Status|BMS Platform/u);
  await checkScreen(page, { demo: true, label: 'd-UD-07-proposal-in-frame' }, checked);

  // System Scope (DB-16): the eight systems, the seed's decisions, Fire Safety monitoring only and not included.
  await followSidebar(page, 'System Scope');
  await frameHolds(page, 'System Scope');
  const scope = page.getByRole('table', { name: 'Building systems and whether each is in scope' });
  await expect(scope.getByRole('rowheader')).toHaveCount(8);
  await expect(scope.getByRole('switch', { name: 'Include HVAC in the scope' })).toBeChecked();
  await expect(scope.getByRole('switch', { name: 'Include Fire Safety in the scope' })).not.toBeChecked();
  await expect(scope.getByRole('rowheader', { name: /^Fire Safety/u })).toContainText('Monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system.');
  await expect(page.getByRole('region', { name: 'HVAC' })).toBeVisible();
  // G2-7 (e2e half): one value id, one display: HVAC's decision as System Scope's row shows it, then on Topology.
  const hvacDecision = `project:${demo}.scope.hvac`;
  const onScope = await scope.locator(`[data-value-id="${hvacDecision}"]`).first().innerText();
  await checkScreen(page, { demo: true, label: 'd-DB-16-system-scope' }, checked);
  // The detail panel's tabs (US-SCOPE-07): Overview, Equipment, Zones; no Controllers or Network tab (R-058).
  const hvac = page.getByRole('region', { name: 'HVAC' });
  await expect(hvac.getByRole('tab')).toHaveText(['Overview', 'Equipment', 'Zones']);
  await hvac.getByRole('tab', { name: 'Zones', exact: true }).click();
  await expect(hvac.getByRole('link', { name: 'View the zones', exact: true })).toBeVisible();
  await checkScreen(page, { demo: true, label: 'd-DB-16-panel-zones-tab' }, checked);

  // Topology (DB-08, its Logical view): the design level "Not available yet", one group per included system.
  await followSidebar(page, 'Topology');
  await frameHolds(page, 'Topology');
  await expect(page.locator('[data-topology-band="design"]')).toContainText("Not available yet: SOVITECH's design of the controllers, networks and integrations");
  await expect(page.locator('[data-topology-group]')).toHaveCount(4);
  expect(await page.locator('[data-topology-group="hvac"]').locator(`[data-value-id="${hvacDecision}"]`).innerText()).toBe(onScope);
  await expect(page.locator('[data-monitoring-lane]')).toHaveCount(0);
  await checkScreen(page, { demo: true, label: 'd-DB-08-topology' }, checked);
  // "View in System Scope" opens that system's panel there (R-071).
  await page.locator('[data-topology-group="lighting"]').getByRole('link', { name: 'View in System Scope' }).click();
  await expect(page.getByRole('region', { name: 'Lighting' })).toBeVisible();
  await checkScreen(page, { demo: true, label: 'd-DB-16-from-topology' }, checked);

  // Zones (DB-20) and Equipment (DB-17): nothing read from the documents, said as stored (G12-10), never "not found".
  await followSidebar(page, 'Zones');
  await frameHolds(page, 'Zones');
  await expect(page.getByText('No zone has come from your documents yet.', { exact: true })).toBeVisible();
  await checkScreen(page, { demo: true, label: 'd-DB-20-zones' }, checked);
  await followSidebar(page, 'Equipment');
  await frameHolds(page, 'Equipment');
  await expect(page.getByText('No equipment has come from your documents yet.', { exact: true })).toBeVisible();
  await expect(page.getByText('Not available yet: SOVITECH asset taxonomy', { exact: true }).first()).toBeVisible();
  await checkScreen(page, { demo: true, label: 'd-DB-17-equipment' }, checked);

  // Documents (DB-15): the demo's files, each Category Unknown (G1-26), no Size or Uploaded By (R-017, R-018).
  await followSidebar(page, 'Documents');
  await frameHolds(page, 'Documents');
  const register = page.getByRole('table', { name: 'Project documents' });
  await expect(register.getByRole('columnheader')).not.toContainText(['Size']);
  await expect(register).not.toContainText(/Uploaded By|Size/u);
  const rows = register.locator('[data-document-row]');
  expect(await rows.count()).toBeGreaterThan(0);
  await checkScreen(page, { demo: true, label: 'd-DB-15-documents' }, checked);
  // A document's inspector: its details and Download, no preview, size, uploader or description.
  await page.getByRole('button', { name: 'Show details', exact: true }).first().click();
  const inspector = page.locator('[data-document-inspector]');
  await expect(inspector).toBeVisible();
  await expect(inspector.getByRole('link', { name: 'Download' })).toHaveAttribute('href', /^\/api\/projects\/[0-9a-f-]{36}\/documents\/[0-9a-f-]{36}\/file$/u);
  await expect(inspector).not.toContainText(/Preview|Size|Uploaded|Description/u);
  await checkScreen(page, { demo: true, label: 'd-DB-15-inspector' }, checked);
  // The delete confirmation states its effect before any Delete; Cancel removes nothing (UD-42; G4-39).
  await inspector.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  const confirmation = page.locator('[data-delete-confirmation]');
  await expect(confirmation.getByText(/^\d+ values? will return to Unknown$/u)).toBeVisible();
  await checkScreen(page, { demo: true, label: 'd-UD-42-delete-confirmation' }, checked);
  const before = await rows.count();
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(rows).toHaveCount(before);

  // The project switcher (UD-32): a disclosure listing the owner's projects, the demo current; Escape closes it.
  await openSwitcher(page);
  const entries = page.locator('[data-switcher-entry]');
  await expect(entries.filter({ hasText: 'Demo Hotel Bucharest' })).toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await checkScreen(page, { demo: true, label: 'd-UD-32-switcher' }, checked);
  await page.keyboard.press('Escape');
  await expect(entries).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Switch project/u })).toBeFocused();

  // GS-1's half for the workspace: the owner was asked nothing known, and no budget was exceeded.
  expect(await readGuardrailEvents(demo, 'question_for_known_field')).toEqual([]);
  expect(await readGuardrailEvents(demo, 'confirmation_budget_exceeded')).toEqual([]);
  expect(checked).toHaveLength(11);
});
