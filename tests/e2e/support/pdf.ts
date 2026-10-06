/**
 * Reading a downloaded PDF in the e2e flows (phase 5; docs/adr/0050-exports-print-route-and-pdf.md): each page's text,
 * as pypdfium2 reads it in the extractor's environment, through the reviewed reader the mockup-figure and company-figure
 * checks use (tools/checks/mockup-figures/document-text.ts `readPdfs`; no new dependency), and the reserved-term scan of
 * that text (prompt 3 phase 5: "Every export passes the reserved-term scan"; 2.8 "Reserved terms").
 *
 * A PDF's text carries no element marks, so the scan allows less than the render test does on the print route: only the
 * badge labels 2.8 lists ("Verified by SOVITECH", "Confirmed by you"), never a status line or a generated sentence, as
 * the print cases' scan does (tests/guardrails/_support/print.tsx `reservedTermsInPrint`). No assertion here: the flows
 * assert. The PDF is written to a temporary folder only for the reader, and removed.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findReservedTerms, REGISTERED_ALLOWANCE_ENTRIES, type ReservedTermMatch } from '@sovitech/registry/reserved-terms';
import { readPdfs } from '../../../tools/checks/mockup-figures/document-text';

/** Each page's text, in order (line breaks as `\n`). Throws when the PDF cannot be read. */
export function pdfPages(bytes: Uint8Array): string[] {
  const folder = mkdtempSync(join(tmpdir(), 'sovitech-e2e-pdf-'));
  try {
    const path = join(folder, 'download.pdf');
    writeFileSync(path, bytes);
    const read = readPdfs([{ name: 'download.pdf', path }]);
    if (read.problems.length > 0) throw new Error(`the downloaded PDF could not be read: ${read.problems.join('; ')}`);
    return read.parts.filter((part) => /#page=\d+$/u.test(part.where)).map((part) => part.text);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

/** A page's lines, trimmed, with no empty line. */
export function linesOf(page: string): string[] {
  return page
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** The badge labels 2.8 allows to hold a reserved term (the registered allowances of the badge kind). */
const ALLOWED_BADGE_LABELS = REGISTERED_ALLOWANCE_ENTRIES.flatMap((entry) => (entry.kind === 'badge' ? [entry.label] : []));

/** The reserved terms in a PDF's text, outside 2.8's own badge labels. */
export function reservedTermsInPdf(text: string): ReservedTermMatch[] {
  let rest = text.replace(/\s+/gu, ' ');
  for (const label of ALLOWED_BADGE_LABELS) rest = rest.split(label).join(' ');
  return findReservedTerms(rest);
}
