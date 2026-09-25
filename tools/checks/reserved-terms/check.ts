/**
 * Reserved-term check (docs/guardrails.md 2.8; prompt 3 sections 7 and 10).
 * Scope (PHASE_0_SCOPE in scan.ts): every file under apps/ and packages/, and
 * top-level seeds, migrations and templates when they exist: string literals,
 * template text (tagged templates included), JSX text and attributes, object
 * keys that are shown, HTML and SVG text and copy attributes, CSS content
 * strings, JSON and YAML data, SQL strings, text templates, Markdown and text,
 * and every registered string catalogue. company, docs, tests and seeded
 * inputs are not read. Lower-case single-token strings are copy except in the
 * key positions and registered lists that machine-keys.ts describes. A file
 * the check cannot read fails unless non-copy.ts lists it. A scan root with no
 * file, a registered catalogue with no file, or a run with no copy unit fails.
 */
import { registeredAllowances } from '@sovitech/registry/reserved-terms';
import { repoRoot } from '../lib';
import type { Check } from '../types';
import { STRING_CATALOGUES } from './catalogues';
import { MACHINE_KEY_LISTS } from './machine-keys';
import { NON_COPY_FILES } from './non-copy';
import { LIST_MODULE, PHASE_0_SCOPE, scanReservedTerms } from './scan';

const check: Check = () =>
  scanReservedTerms({
    root: repoRoot,
    include: PHASE_0_SCOPE.include,
    optional: PHASE_0_SCOPE.optional,
    ignore: PHASE_0_SCOPE.ignore,
    catalogues: STRING_CATALOGUES,
    allowances: registeredAllowances,
    listModule: LIST_MODULE,
    machineKeyLists: MACHINE_KEY_LISTS,
    nonCopy: NON_COPY_FILES,
    guardrails: 'docs/guardrails.md',
  });

export default check;
