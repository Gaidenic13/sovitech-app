/**
 * What every flow checks on every screen and state it reaches (prompt 3, phase 3 exit: "On every
 * step and state: the render test, axe with zero violations, the reserved-term scan and the demo
 * line (demo project)"):
 *
 * - the render test (G2-1, G2-8; rule 2), with the display objects the page received from the API;
 *   its report also carries the reserved-term scan of the rendered copy (2.8, "Reserved terms":
 *   text, accessible names, titles, placeholders and generated content), so a reserved term outside
 *   the places 2.8 allows fails it, and the scan must have read the screen's copy;
 * - axe under the WCAG 2.2 AA tags, zero violations (prompt 3 5.2 "Accessibility level");
 * - the demo line (rule 10, "Demo data"; GS-1; US-REVIEW-03 AC1, AC7): on the demo project's
 *   every screen, and on no other project's.
 *
 * With SOVITECH_E2E_SCREENSHOTS set to a folder, each checked screen is also saved there as a
 * full-page PNG on the 1440 canvas (the design comparison in docs/build-log.md, phase 3).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { statusLineById } from '@sovitech/registry';
import { formatRenderReport, resetRenderCheck, runRenderCheck } from '../render/render-check';
import { screenReady } from '../support/wizard';

/** WCAG 2.2 AA (prompt 3 5.2; ADR 0037, decision 6). */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** 2.8's demo line, as the registry holds it. */
export const DEMO_LINE = statusLineById('demo_data').text;

export interface ScreenCheck {
  /**
   * Which project the screen belongs to, for the demo line: `true` for the demo project's screens,
   * `false` for another project's, `'list'` for the project list, where only the demo's row carries it.
   */
  readonly demo: boolean | 'list';
  /** A short name, for the failure message and the screenshot's file name. */
  readonly label: string;
}

/** Every screen a flow checked, with its label, for the flow's own final assertion. */
export type CheckedScreens = string[];

/**
 * Checks the screen as it is now. Call after the screen opened or changed state; the render check
 * starts a new observation (`resetRenderCheck`) and waits for the screen's readiness marker.
 */
export async function checkScreen(page: Page, check: ScreenCheck, checked?: CheckedScreens): Promise<void> {
  await screenReady(page);
  await resetRenderCheck(page);
  const report = await runRenderCheck(page);
  expect(report.ok, `${check.label}: render test\n${formatRenderReport(report)}`).toBe(true);
  expect(report.stats.copyUnits, `${check.label}: the reserved-term scan read no copy`).toBeGreaterThan(0);

  const axe = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    axe.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`),
    `${check.label}: axe (WCAG 2.2 AA)`,
  ).toEqual([]);

  const demoLines = await page.getByText(DEMO_LINE, { exact: true }).count();
  if (check.demo === 'list') expect(demoLines, `${check.label}: the demo line on the demo's row only`).toBe(1);
  else if (check.demo) expect(demoLines, `${check.label}: the demo line`).toBeGreaterThan(0);
  else expect(demoLines, `${check.label}: no demo line on a project that is not the demo`).toBe(0);

  const folder = process.env['SOVITECH_E2E_SCREENSHOTS'];
  if (folder !== undefined && folder !== '') {
    mkdirSync(folder, { recursive: true });
    await page.screenshot({ path: join(folder, `${check.label.replace(/[^A-Za-z0-9-]+/gu, '-')}.png`), fullPage: true });
  }
  checked?.push(check.label);
}
