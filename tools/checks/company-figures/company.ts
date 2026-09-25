/**
 * Company-figure check (prompt 3 section 7: "Never copy a figure from the
 * mockups, from the specs' transcriptions of them, or from company/"; guardrails
 * rule 1, "Identifiers and prices": SAUTER model numbers, product names and
 * product lines come only from reference data; G1-3, G1-12, G2-5; gate
 * dataset-sauter-catalogue, closed: "No SAUTER product line, product or model
 * name anywhere").
 *
 * Imports from company/ are blocked by dependency-cruiser; this check covers
 * what is typed by hand (phase 0 round 2 review). tools/checks/company-figures.txt
 * lists the distinctive figures of company/ (website statistics, case-study and
 * reference-project numbers, project counts, savings, payback and price claims)
 * and the SAUTER product lines, product and model names and article codes of
 * company/products/, each with the company/ file and line it was read from. It
 * is a check list, not app data: nothing imports it.
 *
 * The check never reads company/ (build-readiness decision 12), so, unlike the
 * mockup list, the cited lines are not re-read at run time: they were checked
 * once, when the list was built, by matching each entry on its cited line. The
 * self-test plants every entry of the real list in a temporary tree and
 * requires each to be found.
 *
 * Scope: the mockup-figure scope (apps/, packages/*\/src, services/extractor/src,
 * seeds and demo fixtures, without the case folders fixtures/evals/<ID>/). It
 * fails on any hit, on a missing, empty or malformed list, and on an empty scope.
 */
import { checkFigureList, type FigureCheckInputs, type FigureHit, type ListSyntax } from '../mockup-figures/figures';
import type { CheckResult } from '../types';

export const NAME = 'company-figures';

/** Entries come from company/ files; figures and product names; sources are not re-read (the check never reads company/). */
export const COMPANY_LIST_SYNTAX: ListSyntax = {
  sourceFormat: 'company/<file>:<line>',
  source: /^(company\/[\w./-]+):(\d+)$/u,
  verifySources: false,
  kinds: ['number', 'quantity', 'text', 'product'],
};

/** The finding for one hit: a product name names the closed gate; a figure names rule 1 and G1-12. */
export function describeCompanyHit(hit: FigureHit): string {
  const where = `"${hit.entry.figure}" (${hit.entry.source}) as "${hit.text}"`;
  if (hit.entry.kind === 'product') {
    return `SAUTER product name ${where}: while gate dataset-sauter-catalogue is closed, no SAUTER product line, product or model name appears anywhere; once a catalogue is approved, names reach the app only as {{product:…}} tokens from it (rule 1, G1-3, G2-5)`;
  }
  return `company figure ${where}: website marketing copy from company/, never an app value (rule 1, G1-12; prompt 3 section 7)`;
}

/** The company-figure check on one tree. */
export function checkCompanyFigures(inputs: FigureCheckInputs): Promise<CheckResult> {
  return checkFigureList({
    ...inputs,
    name: NAME,
    syntax: COMPANY_LIST_SYNTAX,
    describeHit: describeCompanyHit,
    hitNoun: 'company figures and SAUTER product names',
    entryNoun: 'figures and product names',
    passSummary: 'no company figure or SAUTER product name in the app, packages, extractor, seeds or demo fixtures',
  });
}
