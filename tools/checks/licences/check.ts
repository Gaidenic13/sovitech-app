/**
 * Licence check: no AGPL or GPL dependency, npm or Python; LGPL and MPL
 * reported (see licences.ts).
 */
import { repoRoot } from '../lib';
import type { Check } from '../types';
import { evaluateLicences, extractorSitePackages, loadNpm, loadPython } from './licences';

const check: Check = async () =>
  evaluateLicences({
    npm: loadNpm(repoRoot),
    python: loadPython(repoRoot, extractorSitePackages(repoRoot), 'services/extractor/.venv'),
    root: repoRoot,
  });

export default check;
