/**
 * G1-32 (new in phase 6; docs/guardrails.md section 7 at 1.12; T).
 * Situation: an unknown value on an exported Metrics page (Export Report: Payback Analysis or Lifecycle Analysis).
 * Expected: it reads its 2.8 wording, "Unknown" or "Not available yet: …" naming what is missing, on its badge's line,
 * never 0 or blank.
 * Follows from rule 1, "Unknown propagates": "No numeric stand-in ... This covers sums, averages, ratios, charts, sorting
 * and exports"; 2.8 "Prominence" (the badge on the figure's line); rule 7, "'Not available yet' never appears alone. It
 * names what is missing"; G1-29's reading for the Equipment register's export; PRD R-121 ("unknowns as 'Unknown' and
 * never 0, and each badge on the same line as its figure").
 *
 * The page and PDF half (phase 6, the integrator in the print builder's place): a TEST Payback print view in the
 * contract's shapes (apps/web/src/workspace/pages/metrics/test-metrics.ts, `cashFlowFigures`: a cumulative cash flow
 * whose TEST year one reads Unknown and TEST year two "Not available yet: …", beside a TEST year with a range; every
 * other value "Not available yet: …"), and the TEST Lifecycle print view, each printed as the app's print route renders
 * it, by the API's own printer, to an A4 PDF (tests/guardrails/_support/print.tsx), read back with pypdfium2. In the
 * PDF's text: the Unknown point prints "Unknown" in its row; each missing value prints its whole "Not available yet:
 * <what is missing>" wording; no "Not available yet" stands alone; no line is a bare 0 or dash; the figure beside them
 * prints on one line with its badge; no reserved term. The page's markup half is apps/web's print route test
 * ("G1-32 (page half)"). Every value is TEST data.
 *
 * It launches Chromium: run it under the e2e lock with one worker.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LifecycleResponseSchema, PaybackResponseSchema } from '@sovitech/view-model/browser';
import {
  CARBON_MISSING,
  CASH_FLOW_TEXT,
  INVESTMENT_MISSING,
  LIFECYCLE_MISSING,
  PAYBACK_MISSING,
  SAVINGS_MISSING,
  TAXONOMY_MISSING,
  lifecycleResponse,
  paybackResponse,
} from '../../apps/web/src/workspace/pages/metrics/test-metrics';
import { linesOf, printMetricsPage, reservedTermsInPrint, type PrintedProposal } from './_support/print';

let payback: PrintedProposal | undefined;
let lifecycle: PrintedProposal | undefined;

beforeAll(async () => {
  payback = await printMetricsPage({ page: 'payback', response: PaybackResponseSchema.parse(paybackResponse({ cashFlowFigures: true })) });
  lifecycle = await printMetricsPage({ page: 'lifecycle', response: LifecycleResponseSchema.parse(lifecycleResponse()) });
}, 180_000);

afterAll(() => {
  payback = undefined;
  lifecycle = undefined;
});

function printed(which: PrintedProposal | undefined): { readonly lines: string[]; readonly text: string } {
  if (which === undefined) throw new Error('G1-32: the page was not printed');
  const lines = which.pages.flatMap(linesOf);
  // A PDF's text breaks long lines where the page wraps them: also read as one run of words.
  return { lines, text: lines.join(' ').replace(/\s+/gu, ' ') };
}

describe('G1-32 · R-121 · rule 1 · 2.8: an unknown value on an exported Metrics page', () => {
  it('G1-32: the Unknown point prints "Unknown" in its own row, between its name and the next point\'s', () => {
    const { lines } = printed(payback);
    const account = lines.join('\n');
    const from = lines.findIndex((line) => line.includes(CASH_FLOW_TEXT.yearUnknownName));
    const to = lines.findIndex((line, index) => index > from && line.includes(CASH_FLOW_TEXT.yearMissingName));
    expect(from, account).toBeGreaterThanOrEqual(0);
    expect(to, account).toBeGreaterThan(from);
    const row = lines.slice(from, to).join(' ').replace(CASH_FLOW_TEXT.yearUnknownName, '').trim();
    expect(row, account).toBe('Unknown');
  });

  it('G1-32 · rule 7: each missing value prints its whole "Not available yet" wording, naming what is missing; none stands alone', () => {
    for (const [page, wordings] of [
      ['payback', [CASH_FLOW_TEXT.yearMissing, INVESTMENT_MISSING, SAVINGS_MISSING, PAYBACK_MISSING, CARBON_MISSING]],
      ['lifecycle', ['Not available yet: TEST duration unit', LIFECYCLE_MISSING, TAXONOMY_MISSING]],
    ] as const) {
      const { text } = printed(page === 'payback' ? payback : lifecycle);
      for (const wording of wordings) expect(text, `${page}: ${wording}`).toContain(wording);
      const alone = text.split('Not available yet').slice(1).filter((rest) => !rest.startsWith(':'));
      expect(alone, `${page}: "Not available yet" with nothing named`).toEqual([]);
    }
  });

  it('G1-32 · rule 1 "No numeric stand-in": no line of either printed page is a bare 0 or dash in place of a value', () => {
    for (const which of [payback, lifecycle]) {
      const { lines } = printed(which);
      expect(lines.filter((line) => /^(?:0|0\.0+|-|–|—)$/u.test(line))).toEqual([]);
    }
  });

  it('G1-32 (beside the case) · 2.8 "Prominence": the figure beside the gaps prints on one line with its badge', () => {
    const { lines } = printed(payback);
    const at = lines.findIndex((line) => line.includes(CASH_FLOW_TEXT.yearRange));
    expect(at, lines.join('\n')).toBeGreaterThanOrEqual(0);
    expect(lines[at]).toContain('Estimated');
  });

  it('G1-32 (beside the case) · 2.8 "Reserved terms": no page holds a reserved term outside 2.8\'s own badge labels', () => {
    for (const which of [payback, lifecycle]) {
      if (which === undefined) throw new Error('G1-32: the page was not printed');
      for (const page of which.pages) expect(reservedTermsInPrint(page)).toEqual([]);
    }
  });
});
