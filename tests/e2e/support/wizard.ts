/**
 * Moves through the app the way an owner does, for the render screens (tests/e2e/render/screens.ts)
 * and the flows (tests/e2e/flows/). Page actions only: no assertion, no store, no typed display
 * object, so the render test's screen list can import it (the checks read screens.ts outside the
 * Playwright runner). Specs sign in through the sign-in page, never by setting a cookie
 * (docs/adr/0037-e2e-setup.md, decision 4), and create their own projects through step 1.
 *
 * Every name typed here is free of digits and number words: what the owner types shows in the form's input before it
 * is stored and bound, and the render test reads it as a bare number (packages/ui TextField).
 */
import type { Page } from '@playwright/test';
import { readStackState } from '../setup/paths';

/** The development owner's account button on the sign-in page (UD-36). */
const DEV_OWNER = /Development owner/u;

/** Waits until the screen says it has rendered what it asked for (the render contract's marker). */
export async function screenReady(page: Page): Promise<void> {
  await page.locator('body[data-render-ready]').waitFor({ state: 'attached', timeout: 30_000 });
}

/**
 * Signs in as the development owner through the sign-in page; lands where the app sends the owner.
 * On a page of the app that needs a session, it waits for the app to send it to sign-in, so sign-in
 * returns to that page; from a blank page it opens sign-in.
 */
export async function signIn(page: Page): Promise<void> {
  const current = new URL(page.url());
  if (!current.protocol.startsWith('http')) await page.goto('/sign-in');
  else if (current.pathname !== '/sign-in') {
    const sent = await page.waitForURL((url) => url.pathname === '/sign-in', { timeout: 15_000 }).then(
      () => true,
      () => false,
    );
    if (!sent) await page.goto('/sign-in');
  }
  await page.getByRole('button', { name: DEV_OWNER }).click();
  await page.waitForURL((url) => url.pathname !== '/sign-in');
  await screenReady(page);
}

/** The demo project's id, from the stack's state. */
export function demoProjectId(): string {
  return readStackState().demoProjectId;
}

/** Opens a project's screen (a path under /projects/<id>/) and waits until it rendered. */
export async function openProjectScreen(page: Page, projectId: string, screen: string): Promise<void> {
  await page.goto(`/projects/${projectId}/${screen}`);
  await page.waitForURL((url) => url.pathname === `/projects/${projectId}/${screen}`);
  await screenReady(page);
}

/** The wizard step on screen, from the URL. */
export function stepOnScreen(page: Page): number | 'proposal' | undefined {
  const match = /\/projects\/[^/]+\/(?:steps\/(?<step>[1-8])|(?<proposal>proposal))$/u.exec(new URL(page.url()).pathname);
  if (match?.groups?.['proposal'] !== undefined) return 'proposal';
  const step = match?.groups?.['step'];
  return step === undefined ? undefined : Number.parseInt(step, 10);
}

/** Waits for a wizard step (or the proposal page) to open and render. */
export async function waitForStep(page: Page, step: number | 'proposal'): Promise<void> {
  await page.waitForURL((url) => url.pathname.endsWith(step === 'proposal' ? '/proposal' : `/steps/${String(step)}`), { timeout: 30_000 });
  await screenReady(page);
}

export interface NewProject {
  readonly name: string;
  readonly typeLabel: string;
  readonly countryCode: string;
  readonly city: string;
}

/** A TEST project with digit-free answers. */
export function testProject(label: string): NewProject {
  return { name: `TEST ${label}`, typeLabel: 'New construction', countryCode: 'RO', city: 'TEST Brasov' };
}

/** Fills step 1 of a new project and presses Next; returns the new project's id once step 2 is on screen. */
export async function createProject(page: Page, project: NewProject): Promise<string> {
  if (new URL(page.url()).pathname !== '/projects/new') await page.goto('/projects/new');
  await screenReady(page);
  await page.getByRole('textbox', { name: 'Project name' }).fill(project.name);
  await page.getByRole('radio', { name: project.typeLabel }).check();
  await page.getByRole('combobox', { name: 'Country' }).selectOption(project.countryCode);
  await page.getByRole('textbox', { name: 'City' }).fill(project.city);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}\/steps\/2$/u, { timeout: 30_000 });
  await screenReady(page);
  const match = /\/projects\/(?<id>[0-9a-f-]{36})\/steps\/2$/u.exec(new URL(page.url()).pathname);
  const id = match?.groups?.['id'];
  if (id === undefined) throw new Error(`no project id in ${page.url()}`);
  return id;
}

/** Presses the step's primary button (Continue, Next or Generate Proposal) and waits for the next screen. */
export async function pressPrimary(page: Page, name: 'Continue' | 'Next' | 'Generate Proposal', next: number | 'proposal'): Promise<void> {
  await page.getByRole('button', { name, exact: true }).click();
  await waitForStep(page, next);
}

/** Presses every "Skip for now" on the screen, one after the other, waiting for each to be answered. */
export async function skipEverything(page: Page): Promise<number> {
  let pressed = 0;
  for (;;) {
    const skip = page.getByRole('button', { name: 'Skip for now', exact: true });
    const count = await skip.count();
    if (count === 0) return pressed;
    await skip.first().click();
    pressed += 1;
    await page.waitForFunction((before) => document.querySelectorAll('button').length > 0 && [...document.querySelectorAll('button')].filter((button) => button.textContent?.trim() === 'Skip for now').length < before, count, {
      timeout: 15_000,
    });
    if (pressed > 20) throw new Error('more than twenty "Skip for now" presses on one screen');
  }
}

/** Arrange steps for the render screens: sign in, then open a project's screen. */
export async function signedInAt(page: Page, projectId: string, screen: string): Promise<void> {
  await signIn(page);
  await openProjectScreen(page, projectId, screen);
}

/** Arrange steps for the render screens: sign in, create a TEST project with no documents, and open one of its screens. */
export async function newProjectAt(page: Page, label: string, screen: string): Promise<string> {
  await signIn(page);
  const id = await createProject(page, testProject(label));
  if (screen !== 'steps/2') await openProjectScreen(page, id, screen);
  return id;
}
