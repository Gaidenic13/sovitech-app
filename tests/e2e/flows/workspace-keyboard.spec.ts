/**
 * Phase 4 flow (f) (prompt 3 section 11, "Everything works from the keyboard"; phase 4 exit: "Every viewer interaction
 * has a keyboard path, and every selectable object has a list equivalent"; docs/build-log.md, phase 4 plan, B7): the
 * workspace from the keyboard alone, on a new project. Once a page is open, every action below is a key press: Tab to
 * reach a control, Enter or Space to press it, the arrow keys inside the tablists, menus, registers and listboxes,
 * Escape to close a disclosure, a menu or an inline panel, the focus returning where it came from.
 *
 * Phase 4 part B: "Skip to content" passes the header, the switcher and the sidebar, so the next Tab reaches the page's
 * first control (DR-3, V-7; WCAG 2.4.1, 2.4.3); and after a document is deleted from the keyboard the focus is on the
 * next row's control or on the register, never left on the page's body (A-6; WCAG 2.4.3). After the final verification
 * (NP-1, A-6's residual): deleting the last document leaves the focus on the page column (`main#main`), still there once
 * the page settles; the register's scroll region, a tab stop only while the open inspector makes it overflow (DR-12),
 * lost its tab stop when the inspector closed, and Chromium then moved the focus to the body. For that step the TEST
 * state `assets-listed` adds, through the control route, a TEST document whose row overflows beside the inspector, and
 * Documents is opened again; that setup is the only action below that is not a key press.
 *
 * No viewer is built (the owner's answer of 2026-10-02; R-078), so no camera path exists to test; every object a page
 * can select is a row or an option of a list here (the System Scope register, the Documents register, the switcher's
 * links, the floor and system listboxes). Screens reached pass the render test, axe and the reserved-term scan, with no
 * demo line (screen-checks.ts).
 */
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { REPO_ROOT } from '../setup/paths';
import { writeTestState } from '../support/control';
import { createProject, screenReady, signIn, testProject } from '../support/wizard';
import { openWorkspaceScreen } from '../support/workspace';
import { checkScreen, type CheckedScreens } from './screen-checks';

/**
 * Where the focus is, for the assertions below: the page's body (nothing focused), the page column (`main#main`), a
 * control of a document row, the Documents register itself (its table, its scroll region or its heading), or elsewhere
 * (with the element's name).
 */
async function focusOnDocuments(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (active === null || active === document.body || active === document.documentElement) return 'body';
    if (active.tagName === 'MAIN' && active.id === 'main') return 'page column';
    const row = active.closest('tr');
    if (row !== null && row.querySelector('[data-document-row]') !== null) return 'row';
    const table = [...document.querySelectorAll('table')].find((element) => element.getAttribute('aria-label') === 'Project documents' || element.caption?.textContent?.trim() === 'Project documents') ?? null;
    if (table !== null && (active === table || table.contains(active) || active.contains(table))) return 'register';
    return `elsewhere: ${active.tagName.toLowerCase()} ${(active.getAttribute('aria-label') ?? active.textContent ?? '').trim().slice(0, 60)}`;
  });
}

/** Presses Tab (or Shift+Tab) until the control has the focus; fails when it is not reached within the presses allowed. */
async function tabTo(page: Page, control: Locator, options: { readonly backwards?: boolean; readonly presses?: number } = {}): Promise<void> {
  const presses = options.presses ?? 80;
  for (let pressed = 0; pressed < presses; pressed += 1) {
    if (await control.evaluate((element) => element === document.activeElement).catch(() => false)) return;
    await page.keyboard.press(options.backwards === true ? 'Shift+Tab' : 'Tab');
  }
  await expect(control, `reached from the keyboard within ${String(presses)} presses`).toBeFocused();
}

test('prompt 3 section 11 · WCAG 2.2 AA (2.1.1, 2.4.1, 2.4.3, 2.4.7) · DR-3 · V-7 · A-6 · NP-1 · US-ADMIN-06 · US-ADMIN-13 · US-SCOPE-05 · US-SCOPE-07 · US-DOCS-12 · US-DOCS-13 · US-DOCS-15 · US-DOCS-21 · R-145 · R-146 · UD-21 · UD-22 · UD-32 · UD-42 · rule 7: the workspace from the keyboard alone (phase 4 flow (f))', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  const checked: CheckedScreens = [];
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });
  await signIn(page);
  const projectId = await createProject(page, testProject('Flow Keyboard'));
  await openWorkspaceScreen(page, projectId, 'system-scope');

  // "Skip to content" (DR-3, V-7; WCAG 2.4.1, 2.4.3): the first stop of the document, reached backwards from wherever the
  // page put the focus; Enter on it, then Tab, reaches the page's first control (System Scope's back link in its
  // header), never the switcher or a sidebar link. The page column is the one main; the sidebar is outside it.
  await tabTo(page, page.getByRole('link', { name: 'Skip to content', exact: true }), { backwards: true });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  const afterSkip = await page.evaluate(() => {
    const active = document.activeElement;
    const main = document.querySelector('main#main');
    const tabbable = main === null ? [] : [...main.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, summary, [tabindex]')].filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0);
    return {
      mains: document.querySelectorAll('main').length,
      inMain: main !== null && active !== null && active !== main && main.contains(active),
      inSidebar: active !== null && active.closest('aside') !== null,
      inPageHeader: active !== null && active.closest('.sov-page-header') !== null,
      firstControlOfThePage: active !== null && tabbable[0] === active,
    };
  });
  expect(afterSkip).toEqual({ mains: 1, inMain: true, inSidebar: false, inPageHeader: true, firstControlOfThePage: true });
  await expect(page.getByRole('button', { name: /^Switch project/u })).not.toBeFocused();

  // System Scope: "Include HVAC" pressed with Enter; then its switch reached and turned off with Space.
  await tabTo(page, page.getByRole('button', { name: 'Include HVAC', exact: true }));
  await page.keyboard.press('Enter');
  const hvacSwitch = page.getByRole('switch', { name: 'Include HVAC in the scope' });
  await expect(hvacSwitch).toBeChecked({ timeout: 30_000 });
  await expect(hvacSwitch).not.toHaveAttribute('aria-busy', 'true');
  await tabTo(page, hvacSwitch, { backwards: true });
  await page.keyboard.press('Space');
  const hvacRow = page.locator('tr', { has: page.locator('[data-scope-row="hvac"]') });
  await expect(hvacRow).toContainText('Not included', { timeout: 30_000 });
  await expect(hvacSwitch).not.toBeChecked();
  // The detail panel's tablist: the arrow keys move between Overview, Equipment and Zones (the kit's Tabs).
  const panel = page.getByRole('region', { name: 'HVAC' });
  await tabTo(page, panel.getByRole('tab', { name: 'Overview', exact: true }));
  await page.keyboard.press('ArrowRight');
  await expect(panel.getByRole('tab', { name: 'Equipment', exact: true })).toBeFocused();
  await expect(panel.getByRole('tab', { name: 'Equipment', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(panel.getByRole('link', { name: 'View the equipment', exact: true })).toBeVisible();
  await page.keyboard.press('End');
  await expect(panel.getByRole('tab', { name: 'Zones', exact: true })).toBeFocused();
  await screenReady(page);
  await checkScreen(page, { demo: false, label: 'f-DB-16-keyboard' }, checked);

  // The switcher (UD-32): Enter opens it, the arrow keys move between the projects, Escape closes it and returns the focus.
  const switcher = page.getByRole('button', { name: /^Switch project/u });
  await tabTo(page, switcher, { backwards: true });
  await page.keyboard.press('Enter');
  const entries = page.locator('[data-switcher-entry]');
  await expect(entries.first()).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('ArrowDown');
  await expect(entries.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(entries).toHaveCount(0);
  await expect(switcher).toBeFocused();

  // The sidebar: Tab to Documents, Enter opens it (the floor selection is not carried to Documents: ADR 0043).
  await tabTo(page, page.getByRole('navigation', { name: 'Project pages' }).getByRole('link', { name: 'Documents', exact: true }));
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => url.pathname.endsWith('/documents'));
  await screenReady(page);

  // Upload Document (UD-21): Enter opens the inline panel; "Browse files" is the dropzone's keyboard path.
  await tabTo(page, page.getByRole('button', { name: 'Upload Document', exact: true }));
  await page.keyboard.press('Enter');
  const browse = page.getByRole('button', { name: 'Browse files', exact: true });
  await tabTo(page, browse);
  const chooser = page.waitForEvent('filechooser');
  await page.keyboard.press('Enter');
  await (await chooser).setFiles([join(REPO_ROOT, 'fixtures/ifc/demo-hotel-arh.ifc'), join(REPO_ROOT, 'fixtures/ifc/demo-hotel-mep-rev-a.ifc')]);
  const register = page.getByRole('table', { name: 'Project documents' });
  await expect(register.locator('[data-document-row]')).toHaveCount(2, { timeout: 180_000 });
  await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 180_000 });
  await page.keyboard.press('Escape');
  await screenReady(page);
  await checkScreen(page, { demo: false, label: 'f-DB-15-uploaded-keyboard' }, checked);

  // The register: the arrow keys move to the same control in the next row; Enter opens that row's inspector, whose
  // close button takes the focus; Enter on it closes the inspector and returns the focus to the row's open button.
  const openButtons = register.getByRole('button', { name: 'Show details', exact: true });
  await tabTo(page, openButtons.first());
  await page.keyboard.press('ArrowDown');
  await expect(openButtons.nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  const inspector = page.locator('[data-document-inspector]');
  await expect(inspector).toBeVisible();
  const close = inspector.locator('.sov-inspector__close');
  await expect(close).toBeFocused();
  await checkScreen(page, { demo: false, label: 'f-DB-15-inspector-keyboard' }, checked);
  await page.keyboard.press('Enter');
  await expect(inspector).toHaveCount(0);
  await expect(openButtons.nth(1)).toBeFocused();

  // A row menu (UD-22): ArrowDown opens it on its first item, the arrows move, Enter chooses Delete; the inline
  // confirmation states its effect (UD-42); Escape closes it and nothing is deleted.
  const menu = register.getByRole('button', { name: 'More actions', exact: true }).first();
  await tabTo(page, menu);
  await page.keyboard.press('ArrowDown');
  const items = page.getByRole('menuitem');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: 'Delete', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  const confirmation = page.locator('[data-delete-confirmation]');
  await expect(confirmation.getByText(/^\d+ values? will return to Unknown$/u)).toBeVisible();
  await checkScreen(page, { demo: false, label: 'f-UD-42-keyboard' }, checked);
  await tabTo(page, confirmation.getByRole('button', { name: 'Cancel', exact: true }));
  await page.keyboard.press('Escape');
  await expect(confirmation).toHaveCount(0);
  await expect(register.locator('[data-document-row]')).toHaveCount(2);

  // Delete itself from the keyboard (A-6; WCAG 2.4.3): the first row's menu, Delete, then the confirmation's Delete with
  // Enter. Once the row is gone the focus is on the next row's control or on the register, never on the page's body.
  await tabTo(page, menu);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: 'Delete', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(confirmation.getByText(/^\d+ values? will return to Unknown$/u)).toBeVisible();
  await tabTo(page, confirmation.getByRole('button', { name: 'Delete', exact: true }));
  await page.keyboard.press('Enter');
  await expect(register.locator('[data-document-row]')).toHaveCount(1, { timeout: 60_000 });
  await expect(confirmation).toHaveCount(0);
  await expect.poll(() => focusOnDocuments(page), { timeout: 15_000 }).toMatch(/^(row|register)$/u);
  await screenReady(page);
  await checkScreen(page, { demo: false, label: 'f-DB-15-after-delete-keyboard' }, checked);

  // The last document deleted from the keyboard (NP-1, A-6's residual; WCAG 2.4.3): with no row left, the focus goes to
  // the page column (`main#main`, tabindex -1), which keeps its focusability, and is still there once the page has
  // settled; never the register's scroll region, never the body. The region is a tab stop only while it scrolls (DR-12):
  // the open inspector makes it overflow when a row is wider than the column beside it, and closing the inspector takes
  // its tab stop away, after which Chromium moved a focus left on the region to the body a few milliseconds later. The
  // page keeps its 1440 canvas at any window width, so whether it overflows depends on the rows: the IFC row left here
  // fits beside the inspector, and the TEST equipment list's row (the TEST state `assets-listed`, through the control
  // route, as the final verifier found it) does not. So that document is added, the IFC row deleted, and the TEST row
  // deleted last, with the overflow asserted first.
  await writeTestState('assets-listed', projectId);
  await openWorkspaceScreen(page, projectId, 'documents');
  await expect(register.locator('[data-document-row]')).toHaveCount(2, { timeout: 30_000 });
  const rowNamed = (name: string) => register.locator('tr', { has: page.getByText(name, { exact: true }) });
  await tabTo(page, rowNamed('demo-hotel-mep-rev-a.ifc').or(rowNamed('demo-hotel-arh.ifc')).getByRole('button', { name: 'More actions', exact: true }));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(confirmation.getByText(/^\d+ values? will return to Unknown$/u)).toBeVisible();
  await tabTo(page, confirmation.getByRole('button', { name: 'Delete', exact: true }));
  await page.keyboard.press('Enter');
  await expect(register.locator('[data-document-row]')).toHaveCount(1, { timeout: 60_000 });
  await expect.poll(() => focusOnDocuments(page), { timeout: 15_000 }).toBe('row');
  const registerRegion = page.getByRole('region', { name: 'Project documents', exact: true });
  await tabTo(page, rowNamed('TEST equipment list.pdf').getByRole('button', { name: 'More actions', exact: true }));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: 'Delete', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(confirmation.getByText(/^\d+ values? will return to Unknown$/u)).toBeVisible();
  await expect(registerRegion, 'the register overflows beside the open inspector, so it is a tab stop (DR-12)').toHaveAttribute('tabindex', '0');
  await tabTo(page, confirmation.getByRole('button', { name: 'Delete', exact: true }));
  await page.keyboard.press('Enter');
  await expect(register.locator('[data-document-row]')).toHaveCount(0, { timeout: 60_000 });
  await expect(confirmation).toHaveCount(0);
  await expect(registerRegion, 'the inspector closed: the register no longer scrolls and is no tab stop').not.toHaveAttribute('tabindex');
  await expect.poll(() => focusOnDocuments(page), { timeout: 15_000 }).toBe('page column');
  await screenReady(page);
  expect(await focusOnDocuments(page)).toBe('page column');
  await checkScreen(page, { demo: false, label: 'f-DB-15-after-last-delete-keyboard' }, checked);

  // Topology from the sidebar, then its action link back to System Scope.
  await tabTo(page, page.getByRole('navigation', { name: 'Project pages' }).getByRole('link', { name: 'Topology', exact: true }), { backwards: true });
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => url.pathname.endsWith('/topology'));
  await screenReady(page);
  // HVAC is not included now, so no group is drawn and Topology says what is missing, with its action (G7-15).
  await expect(page.locator('[data-topology-no-decision]')).toBeVisible();
  const choose = page.getByRole('link', { name: 'Choose the systems in scope', exact: true });
  await tabTo(page, choose);
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => url.pathname.endsWith('/system-scope'));
  await screenReady(page);
  await checkScreen(page, { demo: false, label: 'f-DB-16-from-topology-keyboard' }, checked);
  expect(checked).toHaveLength(7);
});
