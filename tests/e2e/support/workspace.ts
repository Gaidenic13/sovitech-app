/**
 * Moves through the workspace (phase 4; docs/adr/0043-workspace-navigation-and-shell.md) the way an owner does, for the
 * render screens (tests/e2e/render/screens.ts) and the flows (tests/e2e/flows/workspace-*.spec.ts). Page actions only:
 * no assertion, no store, no typed display object, so the render test's screen list can import it.
 *
 * The workspace is entered through Generate (step 8's "Generate Proposal" leads to the proposal page, the workspace's
 * landing: ADR 0043 decision 3; the project list still opens step 1 until D-02 and D-14, PRD R-009), then moved
 * through by the sidebar's links. A screen opened by its address (a reload, a typed link, `?upload=open`) is the same
 * page.
 */
import type { Page } from '@playwright/test';
import { openProjectScreen, pressPrimary, screenReady } from './wizard';

/** The workspace's pages, as the sidebar names them (copy.workspace.pages), with their paths. */
export const WORKSPACE_PAGES = {
  Proposal: 'proposal',
  'System Scope': 'system-scope',
  Topology: 'topology',
  Zones: 'zones',
  Equipment: 'equipment',
  Documents: 'documents',
  Reports: 'reports',
  // Phase 6 (docs/adr/0052; ADR 0043 amended): the built Metrics pages, after Reports.
  'Financial Overview': 'metrics/financial-overview',
  'CAPEX Breakdown': 'metrics/capex',
  'OPEX & Savings': 'metrics/opex',
  'Payback Analysis': 'metrics/payback',
  'Lifecycle Cost': 'metrics/lifecycle',
} as const;
export type WorkspacePageName = keyof typeof WORKSPACE_PAGES;

/** Opens a workspace page of a project by its address, query included, and waits until it rendered. */
export async function openWorkspaceScreen(page: Page, projectId: string, screen: string): Promise<void> {
  const target = new URL(`/projects/${projectId}/${screen}`, 'http://127.0.0.1');
  await page.goto(`${target.pathname}${target.search}`);
  await page.waitForURL((url) => url.pathname === target.pathname);
  await screenReady(page);
}

/** From step 8 of a project, Generate: the proposal page, the workspace's landing, in the workspace frame. */
export async function generateIntoWorkspace(page: Page, projectId: string): Promise<void> {
  await openProjectScreen(page, projectId, 'steps/8');
  await pressPrimary(page, 'Generate Proposal', 'proposal');
  await page.getByRole('navigation', { name: 'Project pages' }).waitFor();
  await screenReady(page);
}

/** Follows a sidebar link to another workspace page and waits until it rendered. */
export async function followSidebar(page: Page, name: WorkspacePageName): Promise<void> {
  await page.getByRole('navigation', { name: 'Project pages' }).getByRole('link', { name, exact: true }).click();
  await page.waitForURL((url) => url.pathname.endsWith(`/${WORKSPACE_PAGES[name]}`));
  await page.locator(`nav[aria-label="Project pages"] a[aria-current="page"]`, { hasText: name }).waitFor();
  await screenReady(page);
}

/**
 * On System Scope, includes each named system whose decision is not recorded yet ("Include <system>", US-SCOPE-05 AC4),
 * one press each, waiting for its switch: the owner's own decision (Provided by you).
 */
export async function includeSystems(page: Page, systems: readonly string[]): Promise<void> {
  for (const system of systems) {
    await page.getByRole('button', { name: `Include ${system}`, exact: true }).click();
    await page.getByRole('switch', { name: `Include ${system} in the scope` }).waitFor();
  }
  await screenReady(page);
}

/** Opens the switcher (UD-32), a disclosure on the sidebar, and waits for the user's projects to be listed. */
export async function openSwitcher(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Switch project/u }).click();
  await page.locator('[data-switcher-entry]').first().waitFor({ timeout: 15_000 });
  await screenReady(page);
}
