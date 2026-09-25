/**
 * The reserved-term scan of rendered pages (guardrails 2.8 "Reserved terms"; prompt 3
 * section 7; docs/adr/0006-render-test.md, decision 8). Its indexed cases (G10-1, G11-6) have
 * no case file yet, so this test proves the scan until they do.
 *
 * - Without a browser: the matcher from @sovitech/registry/reserved-terms flags unmarked copy;
 *   a 2.8 marker is honoured only through a registered allowance of its own kind (TEST
 *   allowances here, and the registered ones), and, for a badge, status line or generated
 *   sentence, only when a served display object carries the text among its lines (since the
 *   phase 1 review; the stage 3 label only with its stored quotation record), or, for an
 *   evidence excerpt, only when the served display objects declare it with its document id
 *   and content hash.
 * - In Chromium: the seeded pages under tests/e2e/pages/reserved-terms/ (capitalised terms
 *   rendered through Object.keys and tagged templates, shown attributes, markers without an
 *   allowance, excerpts the screen was not served) fail with exactly their expected findings,
 *   and the clean page, whose one reserved term is a served evidence excerpt, passes.
 */
import { chromium, type Browser } from '@playwright/test';
import { createAllowanceSet } from '@sovitech/registry/reserved-terms';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { CopyUnit } from '../../../tests/e2e/render/contract';
import { CLEAN_PAGE, RESERVED_TERM_PAGES, harnessPageOptions, harnessPageUrl } from '../../../tests/e2e/render/harness-pages';
import { checkUrl, formatRenderReport, violationKinds } from '../../../tests/e2e/render/render-check';
import { reservedTermFindings } from '../../../tests/e2e/render/rendered-copy';

const unit = (text: string, copyKind: string | null = null, documentId: string | null = null, contentHash: string | null = null): CopyUnit => ({
  text,
  where: 'TEST',
  source: 'text',
  copyKind,
  documentId,
  contentHash,
});

const TEST_ALLOWANCES = createAllowanceSet([
  { kind: 'badge', badgeId: 'test-verified-by-sovitech', label: 'Verified by SOVITECH' },
  { kind: 'action_label', actionId: 'test-confirm-values', label: 'Mark values confirmed' },
]);

const SERVED = {
  'document:d-test.stage': {
    text: 'TEST Tender',
    evidence: [{ documentId: 'd-test-1', contentHash: 'sha256-TEST-1', excerpt: 'TEST faza conform TEST' }],
  },
};

/** Display objects serving 2.8's lines: a verified value, and a stage 2 and a stage 3 price. TEST values only. */
const SERVED_LINES = {
  'asset:a-test.type': { text: 'TEST type', lines: ['Verified by SOVITECH', 'AI inference, verified by SOVITECH on 12 Oct'] },
  'proposal:p-test.capexStage2': { text: 'TEST stage 2 price', lines: ['Formal quotation'] },
  'proposal:p-test.capexStage3': { text: 'TEST stage 3 price', lines: ['Formal quotation'], quotationRecordId: 'q-TEST-1' },
};

describe('2.8 · F-RENDER-06: reserved terms in rendered copy, without a browser', () => {
  test('2.8: unmarked copy with a reserved term is a finding, in English and Romanian, whatever its case', () => {
    const findings = reservedTermFindings([unit('Formal Quotation'), unit('Ofertă fermă'), unit('TEST pricing stages')], {}, TEST_ALLOWANCES);
    expect(findings.map((finding) => finding.terms)).toEqual([['Quotation'], ['Ofertă fermă']]);
    expect(findings[0]?.detail).toContain('unmarked copy');
  });

  test('2.8: a marker is honoured only through a registered allowance of its own kind that covers the whole unit', () => {
    expect(reservedTermFindings([unit('Verified by SOVITECH', 'badge')], SERVED_LINES, TEST_ALLOWANCES)).toEqual([]);
    expect(reservedTermFindings([unit('Mark values confirmed', 'action-label')], {}, TEST_ALLOWANCES)).toEqual([]);
    // The badge's text marked as a status line borrows nothing from the badge entry.
    expect(reservedTermFindings([unit('Verified by SOVITECH', 'status-line')], SERVED_LINES, TEST_ALLOWANCES)).toHaveLength(1);
    // More than the allowance's whole text.
    expect(reservedTermFindings([unit('Verified by SOVITECH, final', 'badge')], SERVED_LINES, TEST_ALLOWANCES)).toHaveLength(1);
    // A marker naming no place of 2.8.
    expect(reservedTermFindings([unit('Verified by SOVITECH', 'made-up-place')], {}, TEST_ALLOWANCES)[0]?.detail).toContain('names no place');
    // The registered allowances are the default. Since phase 1 they are 2.8's own texts
    // (ADR 0011): the 2.8 badge passes when served, and a text 2.8 does not list is still a finding.
    expect(reservedTermFindings([unit('Verified by SOVITECH', 'badge')], SERVED_LINES)).toEqual([]);
    expect(reservedTermFindings([unit('Verified by SOVITECH engineers', 'badge')], SERVED_LINES)).toHaveLength(1);
    expect(reservedTermFindings([unit('Verified by SOVITECH', 'status-line')], SERVED_LINES)).toHaveLength(1);
  });

  // Phase 1 review, adversarial finding 12: a marked badge or sentence passed whatever the screen
  // was served, and "Formal quotation" passed with no stage 3 record.
  test('2.8: a marked badge, status line or generated sentence passes only when the screen was served it (built from stored state)', () => {
    const notServed = reservedTermFindings([unit('Verified by SOVITECH', 'badge')], {});
    expect(notServed).toHaveLength(1);
    expect(notServed[0]?.detail).toContain('no display object the screen was served carries this text among its lines');
    expect(reservedTermFindings([unit('Confirmed by you', 'badge')], SERVED_LINES)).toHaveLength(1);
    expect(reservedTermFindings([unit('AI inference, verified by SOVITECH on 12 Oct', 'generated-sentence')], SERVED_LINES)).toEqual([]);
    expect(reservedTermFindings([unit('AI inference, verified by SOVITECH on 13 Oct', 'generated-sentence')], SERVED_LINES)).toHaveLength(1);
  });

  test('2.8, rule 3: a served generated sentence passes only with its slots filled as their types allow', () => {
    const served = { 'asset:a-test.type': { text: 'TEST type', lines: ['AI inference, verified by SOVITECH on request of the designer', 'AI inference, verified by SOVITECH on 31 Feb'] } };
    const findings = reservedTermFindings(
      [unit('AI inference, verified by SOVITECH on request of the designer', 'generated-sentence'), unit('AI inference, verified by SOVITECH on 31 Feb', 'generated-sentence')],
      served,
    );
    expect(findings).toHaveLength(2);
    expect(findings[0]?.detail).toContain('a typed slot filled with what its type refuses');
  });

  test('rule 10: "Formal quotation" passes only where the served display object names its stored quotation record', () => {
    const stage2Only = { 'proposal:p-test.capexStage2': SERVED_LINES['proposal:p-test.capexStage2'] };
    const stage2 = reservedTermFindings([unit('Formal quotation', 'status-line')], stage2Only);
    expect(stage2).toHaveLength(1);
    expect(stage2[0]?.detail).toContain('the stage 3 label without its stored quotation record');
    expect(reservedTermFindings([unit('Formal quotation', 'status-line')], SERVED_LINES)).toEqual([]);
  });

  test('2.8: an evidence excerpt passes only when the served display objects declare it with its document id and content hash', () => {
    expect(reservedTermFindings([unit('TEST faza conform TEST', 'evidence-excerpt', 'd-test-1', 'sha256-TEST-1')], SERVED)).toEqual([]);
    expect(reservedTermFindings([unit('TEST faza conform TEST', 'evidence-excerpt', 'd-test-1', 'sha256-TEST-2')], SERVED)).toHaveLength(1);
    expect(reservedTermFindings([unit('TEST faza conform TEST', 'evidence-excerpt', 'd-test-1', null)], SERVED)[0]?.detail).toContain(
      'without data-document-id and data-content-hash',
    );
    expect(reservedTermFindings([unit('TEST ofertă TEST', 'evidence-excerpt', 'd-test-1', 'sha256-TEST-1')], SERVED)).toHaveLength(1);
  });
});

let browser: Browser | undefined;

function launched(): Browser {
  if (browser === undefined) throw new Error('Chromium did not launch.');
  return browser;
}

describe.concurrent('2.8 · F-RENDER-06: reserved terms on rendered pages, in Chromium', { timeout: 60_000 }, () => {
  beforeAll(async () => {
    browser = await chromium.launch();
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  test.for(RESERVED_TERM_PAGES)('2.8: $file fails: $about', async (page, { expect: expectHere }) => {
    const report = await checkUrl(launched(), harnessPageUrl(page.file), harnessPageOptions(page));
    const account = formatRenderReport(report);
    expectHere(report.ok, account).toBe(false);
    expectHere(violationKinds(report), account).toEqual(page.expectKinds);
    for (const [kind, count] of Object.entries(page.expectCounts ?? {})) {
      expectHere(report.violations.filter((item) => item.kind === kind).length, `${kind} count\n${account}`).toBe(count);
    }
  });

  test('2.8: the clean page, whose one reserved term is a served evidence excerpt, passes', async ({ expect: expectHere }) => {
    const report = await checkUrl(launched(), harnessPageUrl(CLEAN_PAGE.file), harnessPageOptions(CLEAN_PAGE));
    const account = formatRenderReport(report);
    expectHere(report.ok, account).toBe(true);
    expectHere(report.stats.copyUnits, account).toBeGreaterThan(10);
  });
});
