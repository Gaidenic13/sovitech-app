/**
 * Company-figure check (prompt 3 section 7; guardrails rule 1 "Identifiers and
 * prices", G1-3, G1-12, G2-5; gate dataset-sauter-catalogue): no figure or
 * SAUTER product name listed in tools/checks/company-figures.txt appears in
 * apps/, packages/*\/src, services/extractor/src, a seed or a demo fixture. See
 * company.ts.
 */
import { join } from 'node:path';
import { repoRoot } from '../lib';
import { SCOPE } from '../mockup-figures/figures';
import type { Check } from '../types';
import { checkCompanyFigures } from './company';

export const LIST_NAME = 'tools/checks/company-figures.txt';

const check: Check = () =>
  checkCompanyFigures({
    root: repoRoot,
    listFile: join(repoRoot, LIST_NAME),
    listName: LIST_NAME,
    specRoot: repoRoot,
    scope: SCOPE,
  });

export default check;
