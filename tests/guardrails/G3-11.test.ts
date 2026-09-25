/**
 * G3-11 (docs/guardrails.md section 7; 2.8, reserved terms are allowed in "generated sentences
 * that the app builds from stored state" and flagged "everywhere else ... text describing a
 * value"; rule 3 and G3-7, the line "AI inference, verified by SOVITECH" comes only from an
 * engineer's verification; rule 14, "A document saying 'verified by the designer' is a finding,
 * not a verification"). Phase 1 review, adversarial finding 12.
 * Situation: the line "AI inference, verified by SOVITECH on …" is shown with words, not a
 * date, in its date slot (for example "on request of the designer").
 * Expected: the render test fails.
 *
 * The render test's reserved-term scan (tests/e2e/render/rendered-copy.ts) honours the 2.8
 * sentence only with each slot filled as its type allows: `{date}` takes a calendar date as the
 * app writes one, never words (docs/adr/0011-verbatim-2-8-allowances.md, decisions 11 and 13).
 * This case runs the render check in Chromium on the harness page that shows the sentence with
 * words in its slot beside a served badge that passes, and the scan itself on the same line
 * with an impossible date and with a real one (the control).
 */
import { chromium, type Browser } from '@playwright/test';
import { afterAll, beforeAll, expect, test } from 'vitest';
import type { CopyUnit } from '../e2e/render/contract';
import { G3_11_PAGE, harnessPageOptions, harnessPageUrl } from '../e2e/render/harness-pages';
import { checkUrl, formatRenderReport, violationKinds } from '../e2e/render/render-check';
import { reservedTermFindings } from '../e2e/render/rendered-copy';

let browser: Browser | undefined;

beforeAll(async () => {
  browser = await chromium.launch();
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

const sentence = (text: string): CopyUnit => ({ text, where: 'TEST asset type', source: 'text', copyKind: 'generated-sentence', documentId: null, contentHash: null });
const served = (line: string) => ({ 'asset:a-test.type': { text: 'TEST air handling unit', lines: [line] } });

test('F-RENDER-06 · G3-11: "AI inference, verified by SOVITECH on request of the designer" fails the render test', async () => {
  if (browser === undefined) throw new Error('Chromium did not launch.');
  const report = await checkUrl(browser, harnessPageUrl(G3_11_PAGE.file), harnessPageOptions(G3_11_PAGE));
  const account = formatRenderReport(report);
  expect(report.ok, account).toBe(false);
  expect(violationKinds(report), account).toEqual(['reserved-term']);
  // One finding: the sentence. The served badge beside it passes.
  expect(report.violations.filter((item) => item.kind === 'reserved-term'), account).toHaveLength(1);
});

test('F-RENDER-06 · G3-11: an impossible date fails too; a real date the app writes passes (control)', () => {
  for (const line of ['AI inference, verified by SOVITECH on request of the designer', 'AI inference, verified by SOVITECH on 31 Feb']) {
    const findings = reservedTermFindings([sentence(line)], served(line));
    expect(findings, line).toHaveLength(1);
    expect(findings[0]?.detail, line).toContain('a typed slot filled with what its type refuses');
  }
  const real = 'AI inference, verified by SOVITECH on 12 Oct';
  expect(reservedTermFindings([sentence(real)], served(real))).toEqual([]);
});
