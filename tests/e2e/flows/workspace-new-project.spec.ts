/**
 * Phase 4 flow (e) (prompt 3 section 10, phase 4 exit; docs/build-log.md, phase 4 plan, B7): a new project with
 * fixture uploads, from Generate into the workspace, as the development owner. Every page the phase builds is used
 * the way an owner would, within what the closed gates allow:
 * - Documents (DB-15): three synthetic fixtures uploaded through the inline upload panel (UD-21; step 2's dropzone;
 *   only fixture hashes are stored, ADR 0028): a PDF read in the extractor's sandbox and two IFC models stored and
 *   not read (until D-01; the G12-1 line); MEP rev B declared a revision of rev A (UD-43; R-028: only a person's
 *   declaration links two models); the PDF deleted after the confirmation stated its effect (UD-42; G4-39);
 * - System Scope (DB-16): HVAC and Fire Safety included by the owner's own presses (Provided by you; Fire Safety is
 *   never preselected, rule 11), HVAC switched off and on again (each a new decision, the earlier kept: G4-40);
 *   "Save and Continue" opens Zones;
 * - Topology (DB-08): one group per included system, Fire Safety in its own monitoring lane with one link in the
 *   monitoring direction only (G11-11), SOVITECH's design levels "Not available yet" (G1-27);
 * - Zones (DB-20) and Equipment (DB-17): empty, saying what is stored (G12-10); then, through the stack's control
 *   route, a TEST equipment list with three tags (`assets-listed`): the register, the inspector and the asset record
 *   (UD-08), every type Unknown under the closed taxonomy gate (R-067);
 * - the project switcher (UD-32): from this project to the demo, whose page then shows the demo line in its footer.
 * Every screen reached passes the render test, axe and the reserved-term scan, with no demo line except the demo's
 * (screen-checks.ts). With no API key, no value comes from a document.
 */
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { REPO_ROOT } from '../setup/paths';
import { writeTestState } from '../support/control';
import { createProject, demoProjectId, screenReady, signIn, testProject } from '../support/wizard';
import { followSidebar, generateIntoWorkspace, includeSystems, openSwitcher } from '../support/workspace';
import { DEMO_LINE, checkScreen, type CheckedScreens } from './screen-checks';

/** Synthetic fixtures, each listed with its hash in fixtures/manifest.json. */
const FIXTURES = ['fixtures/pdf/tabel-suprafete.pdf', 'fixtures/ifc/demo-hotel-mep-rev-a.ifc', 'fixtures/ifc/demo-hotel-mep-rev-b.ifc'];

test('US-DOCS-12 · US-DOCS-13 · US-DOCS-14 · US-DOCS-15 · US-DOCS-20 · US-DOCS-21 · US-SCOPE-05 · US-SCOPE-06 · US-TOPO-05 · US-ASSETS-03 · US-ASSETS-05 · US-ASSETS-06 · US-ASSETS-07 · US-ADMIN-06 · R-016 · R-022 · R-028 · R-052 · R-065 · R-068 · R-072 · G4-39 · G4-40 · G11-11 · G12-10 · G13-9 · rules 4, 7, 11 and 13: a new project with fixture uploads, through every workspace page (phase 4 flow (e))', async ({
  page,
}) => {
  test.setTimeout(10 * 60_000);
  const checked: CheckedScreens = [];
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });
  await signIn(page);
  const projectId = await createProject(page, testProject('Flow Workspace'));

  // From Generate into the workspace: the proposal page in the frame, no demo line.
  await generateIntoWorkspace(page, projectId);
  await checkScreen(page, { demo: false, label: 'e-UD-07-proposal' }, checked);

  // Documents: empty; the upload panel inline (UD-21), three fixtures.
  await followSidebar(page, 'Documents');
  await expect(page.getByText('No documents yet. Upload your drawings, schedules and other files to start.', { exact: true })).toBeVisible();
  await checkScreen(page, { demo: false, label: 'e-DB-15-empty' }, checked);
  await page.getByRole('button', { name: 'Upload Document', exact: true }).click();
  await expect(page.locator('.sov-dropzone')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('input[type="file"]').setInputFiles(FIXTURES.map((path) => join(REPO_ROOT, path)));
  const register = page.getByRole('table', { name: 'Project documents' });
  for (const name of ['tabel-suprafete.pdf', 'demo-hotel-mep-rev-a.ifc', 'demo-hotel-mep-rev-b.ifc']) await expect(register.getByText(name, { exact: true })).toBeVisible({ timeout: 180_000 });
  // Every file stored and read: no progress bar left (the register reads itself again while one is).
  await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 180_000 });
  await expect(register.getByText('Not analysed: IFC model stored, not analysed')).toHaveCount(2);
  await checkScreen(page, { demo: false, label: 'e-DB-15-uploaded' }, checked);

  // UD-43: rev B declared a revision of rev A, from its row menu; the inspector then names rev A.
  const revB = register.locator('tr', { hasText: 'demo-hotel-mep-rev-b.ifc' });
  await revB.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Mark as a revision of another document', exact: true }).click();
  await page.getByRole('heading', { name: 'Which document does this file revise?' }).waitFor();
  await checkScreen(page, { demo: false, label: 'e-UD-43-revision-panel' }, checked);
  await page.getByRole('radio', { name: 'demo-hotel-mep-rev-a.ifc' }).check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Which document does this file revise?' })).toHaveCount(0, { timeout: 30_000 });
  const inspector = page.locator('[data-document-inspector]');
  await expect(inspector.getByText('Revision of', { exact: true })).toBeVisible();
  await expect(inspector).toContainText('demo-hotel-mep-rev-a.ifc');
  await checkScreen(page, { demo: false, label: 'e-DB-15-revision-declared' }, checked);

  // UD-42: the PDF deleted after its effect is stated (no value came from it: "0 values will return to Unknown").
  const pdf = register.locator('tr', { hasText: 'tabel-suprafete.pdf' });
  await pdf.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  const confirmation = page.locator('[data-delete-confirmation]');
  await expect(confirmation.getByText('0 values will return to Unknown', { exact: true })).toBeVisible();
  await checkScreen(page, { demo: false, label: 'e-UD-42-delete-confirmation' }, checked);
  await confirmation.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(register.getByText('tabel-suprafete.pdf', { exact: true })).toHaveCount(0, { timeout: 60_000 });
  await expect(register.locator('[data-document-row]')).toHaveCount(2);
  await checkScreen(page, { demo: false, label: 'e-DB-15-after-delete' }, checked);

  // System Scope: nothing decided; HVAC and Fire Safety included by the owner; HVAC off and on again (G4-40).
  await followSidebar(page, 'System Scope');
  const scope = page.getByRole('table', { name: 'Building systems and whether each is in scope' });
  await expect(scope.getByRole('switch')).toHaveCount(0);
  await includeSystems(page, ['HVAC', 'Fire Safety']);
  const hvacSwitch = scope.getByRole('switch', { name: 'Include HVAC in the scope' });
  await expect(hvacSwitch).toBeChecked();
  const hvacRow = scope.locator('tr', { has: page.locator('[data-scope-row="hvac"]') });
  await expect(hvacRow).toContainText('Provided by you');
  // One write of the page at a time (ADR 0039 decision 11): each press is answered before the next.
  await hvacSwitch.click();
  await expect(hvacRow).toContainText('Not included', { timeout: 30_000 });
  await expect(hvacSwitch).not.toHaveAttribute('aria-busy', 'true');
  await expect(hvacSwitch).not.toBeChecked();
  await hvacSwitch.click();
  await expect(hvacRow).not.toContainText('Not included', { timeout: 30_000 });
  await expect(hvacSwitch).not.toHaveAttribute('aria-busy', 'true');
  await expect(hvacSwitch).toBeChecked();
  await expect(scope.getByRole('switch', { name: 'Include Fire Safety in the scope' })).toBeChecked();
  await screenReady(page);
  await checkScreen(page, { demo: false, label: 'e-DB-16-decided' }, checked);
  await page.getByRole('button', { name: 'Save and Continue' }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/zones'));
  await screenReady(page);
  await expect(page.getByText('No zone has come from your documents yet.', { exact: true })).toBeVisible();
  await checkScreen(page, { demo: false, label: 'e-DB-20-zones' }, checked);

  // Topology: HVAC's group and Fire Safety's monitoring lane, one link, monitoring direction only (G11-11).
  await followSidebar(page, 'Topology');
  await expect(page.locator('[data-topology-group]')).toHaveCount(2);
  const lane = page.locator('[data-monitoring-lane]');
  await expect(lane.locator('[data-topology-group]')).toHaveCount(1);
  await expect(lane).toContainText('monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system', { ignoreCase: true });
  await expect(page.locator('[data-monitoring-link]')).toHaveCount(1);
  await expect(page.locator('[data-monitoring-link]')).toHaveAttribute('data-direction', 'to-bms');
  await expect(lane.getByRole('button')).toHaveCount(0);
  await checkScreen(page, { demo: false, label: 'e-DB-08-topology' }, checked);

  // Equipment: empty, then the TEST equipment list's three tags (the control route; TEST data only).
  await followSidebar(page, 'Equipment');
  await expect(page.getByText('No equipment has come from your documents yet.', { exact: true })).toBeVisible();
  await writeTestState('assets-listed', projectId);
  await page.reload();
  await screenReady(page);
  const equipment = page.getByRole('table', { name: 'Equipment' });
  await expect(equipment.locator('[data-equipment-row]')).toHaveCount(3);
  await expect(equipment).not.toContainText('A fan coil with no tag');
  await checkScreen(page, { demo: false, label: 'e-DB-17-listed' }, checked);
  await page.getByRole('searchbox', { name: 'Search equipment' }).fill('fcu');
  await expect(equipment.locator('[data-equipment-row]')).toHaveCount(2, { timeout: 15_000 });
  await page.getByRole('button', { name: 'Show details', exact: true }).first().click();
  const assetInspector = page.locator('[data-equipment-inspector]');
  await expect(assetInspector.getByRole('tab')).toHaveText(['Overview', 'Points', 'Documents']);
  await checkScreen(page, { demo: false, label: 'e-DB-17-inspector' }, checked);
  await assetInspector.getByRole('link', { name: 'Open the full record' }).click();
  await page.locator('[data-asset-record]').waitFor();
  await screenReady(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('TEST-FCU-');
  await expect(page.getByText('TEST equipment list.pdf').first()).toBeVisible();
  await checkScreen(page, { demo: false, label: 'e-UD-08-asset-record' }, checked);

  // The switcher (UD-32): this project and the demo; choosing the demo opens its same page, with the demo line.
  await openSwitcher(page);
  const entries = page.locator('[data-switcher-entry]');
  await expect(page.locator('[data-switcher-entry][aria-current="true"]')).toHaveAttribute('href', `/projects/${projectId}/equipment`);
  await expect(page.getByText(DEMO_LINE, { exact: true })).toHaveCount(0);
  await checkScreen(page, { demo: false, label: 'e-UD-32-switcher' }, checked);
  await entries.filter({ hasText: 'Demo Hotel Bucharest' }).click();
  await page.waitForURL((url) => url.pathname === `/projects/${demoProjectId()}/equipment`);
  await screenReady(page);
  await expect(page.locator('.sov-status-footer').getByText(DEMO_LINE, { exact: true })).toBeVisible();
  await checkScreen(page, { demo: true, label: 'e-DB-17-demo-after-switch' }, checked);
  expect(checked).toHaveLength(15);
});
