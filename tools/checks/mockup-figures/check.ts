/**
 * Mockup-figure check (prompt 3 section 14, item 3): no figure listed in
 * tools/checks/mockup-figures.txt appears in apps/, packages/*\/src,
 * services/extractor/src, a seed or a demo fixture. See figures.ts.
 */
import { join } from 'node:path';
import { repoRoot } from '../lib';
import type { Check } from '../types';
import { SCOPE, checkMockupFigures } from './figures';

export const LIST_NAME = 'tools/checks/mockup-figures.txt';

const check: Check = () =>
  checkMockupFigures({
    root: repoRoot,
    listFile: join(repoRoot, LIST_NAME),
    listName: LIST_NAME,
    specRoot: repoRoot,
    scope: SCOPE,
  });

export default check;
