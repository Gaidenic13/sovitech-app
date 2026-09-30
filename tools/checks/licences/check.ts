/**
 * Licence check: no AGPL or GPL dependency, npm or Python, and none bundled in
 * a native binary or WebAssembly module; LGPL and MPL reported, with the
 * components listed for the notices page (see licences.ts).
 */
import { join } from 'node:path';
import { repoRoot } from '../lib';
import type { Check } from '../types';
import { evaluateLicences, extractorSitePackages, loadBundledNotices, loadNpm, loadPython, scanNpmBinaries } from './licences';

const check: Check = async () => {
  const notices = loadBundledNotices();
  return evaluateLicences({
    npm: loadNpm(repoRoot),
    npmBinaries: scanNpmBinaries(join(repoRoot, 'node_modules'), notices),
    notices,
    python: loadPython(repoRoot, extractorSitePackages(repoRoot), 'services/extractor/.venv'),
    root: repoRoot,
  });
};

export default check;
