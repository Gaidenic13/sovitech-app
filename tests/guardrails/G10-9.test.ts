/**
 * G10-9 (docs/guardrails.md section 7; rule 10, "Stage 3 is derived, not passed. It comes from a
 * stored quotation record" and "Templates read the stage from the record. They never accept it
 * as a parameter"; 2.8, "'Formal quotation' at stage 3" and "Where they are flagged: everywhere
 * else"). Phase 1 review, adversarial finding 12.
 * Situation: a price's stage label "Formal quotation" is shown on a screen whose display object
 * names no stored quotation record.
 * Expected: the render test fails.
 *
 * The render test's reserved-term scan (tests/e2e/render/rendered-copy.ts) honours the stage 3
 * label only when the display object that serves it names its stored quotation record
 * (docs/adr/0011-verbatim-2-8-allowances.md, decision 13). This case runs the render check in
 * Chromium on the harness page that shows the label without its record, and the scan itself on
 * the same copy with and without the record (the control).
 */
import { chromium, type Browser } from '@playwright/test';
import { afterAll, beforeAll, expect, test } from 'vitest';
import type { CopyUnit } from '../e2e/render/contract';
import { G10_9_PAGE, harnessPageOptions, harnessPageUrl } from '../e2e/render/harness-pages';
import { checkUrl, formatRenderReport, violationKinds } from '../e2e/render/render-check';
import { reservedTermFindings } from '../e2e/render/rendered-copy';

let browser: Browser | undefined;

beforeAll(async () => {
  browser = await chromium.launch();
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

const statusLine = (text: string): CopyUnit => ({ text, where: 'TEST price', source: 'text', copyKind: 'status-line', documentId: null, contentHash: null });

test('F-RENDER-06 · G10-9: "Formal quotation" served with no stored quotation record fails the render test', async () => {
  if (browser === undefined) throw new Error('Chromium did not launch.');
  const report = await checkUrl(browser, harnessPageUrl(G10_9_PAGE.file), harnessPageOptions(G10_9_PAGE));
  const account = formatRenderReport(report);
  expect(report.ok, account).toBe(false);
  expect(violationKinds(report), account).toEqual(['reserved-term']);
  expect(report.violations.filter((item) => item.kind === 'reserved-term'), account).toHaveLength(1);
});

test('F-RENDER-06 · G10-9: the scan names why, and passes the same label once its display object names the stored record (control)', () => {
  const withoutRecord = reservedTermFindings([statusLine('Formal quotation')], {
    'proposal:p-test.capex': { text: 'TEST price range', lines: ['Formal quotation'] },
  });
  expect(withoutRecord).toHaveLength(1);
  expect(withoutRecord[0]?.detail).toContain('the stage 3 label without its stored quotation record');

  const withRecord = reservedTermFindings([statusLine('Formal quotation')], {
    'proposal:p-test.capex': { text: 'TEST price range', lines: ['Formal quotation'], quotationRecordId: 'q-TEST-1' },
  });
  expect(withRecord).toEqual([]);
});
