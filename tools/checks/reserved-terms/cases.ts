/**
 * The seeded inputs of the reserved-term check, shared by selftest.ts and the
 * unit tests. Each case is a small tree under seeded/<id>/.
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NO_ALLOWANCES,
  createAllowanceSet,
  registeredAllowances,
  type AllowanceSet,
  type ReservedTermAllowance,
} from '@sovitech/registry/reserved-terms';
import type { CheckResult } from '../types';
import { COPY_REGISTRIES, LIST_MODULE, PHASE_0_SCOPE, scanReservedTerms, type ReservedTermScan } from './scan';

const SEEDED = join(dirname(fileURLToPath(import.meta.url)), 'seeded');

export interface SeededCase {
  readonly id: string;
  /** Text the findings of a bad case must contain, so it fails for the reason it was seeded for. */
  readonly expect: readonly string[];
  /** Text the findings must not contain, for a part of the tree that must stay unflagged. */
  readonly notExpect?: readonly string[];
  readonly options?: Partial<Omit<ReservedTermScan, 'root' | 'label'>>;
  /**
   * Files written at run time into a temporary copy of the tree, for inputs that
   * may not sit in the repository (an .svg would be a document-type file outside
   * its home for the fixture-manifest check).
   */
  readonly extraFiles?: Readonly<Record<string, string>>;
}

function allowancesFrom(caseId: string): () => AllowanceSet {
  return () => createAllowanceSet(JSON.parse(readFileSync(join(SEEDED, caseId, 'allowances.json'), 'utf8')) as ReservedTermAllowance[]);
}

const CATALOGUE = [{ id: 'seeded-catalogue', files: 'catalogue/*.json', format: 'json' }] as const;

export const GOOD_CASE: SeededCase = {
  id: 'good',
  expect: [],
  options: {
    allowances: allowancesFrom('good'),
    guardrails: 'guardrails-excerpt.md',
    catalogues: CATALOGUE,
    machineKeyLists: [
      { path: 'apps/web/src/Summary.tsx', constant: 'STAGES', reason: 'TEST: stage keys, compared and never shown' },
      { path: 'apps/web/src/Summary.tsx', constant: 'Verification', reason: 'TEST: verification keys, never shown' },
    ],
    nonCopy: [{ files: '**/README.md', reason: 'TEST: developer notes, never shown' }],
  },
};

/** A seeded SVG stamp, written at run time (see SeededCase.extraFiles). */
const SVG_STAMP = '<svg xmlns="http://www.w3.org/2000/svg"><title>Certified stamp</title><text x="0" y="10">VERIFIED</text></svg>\n';

export const BAD_CASES: readonly SeededCase[] = [
  { id: 'bad-english-jsx', expect: ['"final"', '"binding"'] },
  { id: 'bad-romanian-diacritics', expect: ['"ofertă fermă"'] },
  { id: 'bad-romanian-plain-upper-case', expect: ['as "OFERTA FERMA"'] },
  { id: 'bad-romanian-cedilla', expect: ['"cotație"', 'as "Cota\u0163ie"'] },
  { id: 'bad-multiword-across-lines', expect: ['"in line with"'] },
  { id: 'bad-html-page', expect: ['"certified"', '"guaranteed"'] },
  { id: 'bad-copy-property', expect: ['"final"'] },
  { id: 'bad-catalogue', expect: ['"quote"'], options: { catalogues: CATALOGUE } },
  { id: 'bad-list-module-copy', expect: ['"verificat"'] },
  { id: 'bad-list-drift', expect: ['lacks "promised"', 'holds "deviz"'], options: { guardrails: 'guardrails-excerpt.md' } },
  { id: 'bad-allowance-free-text', expect: ['kind "free_text"'], options: { allowances: allowancesFrom('bad-allowance-free-text') } },
  // Lower-case single tokens used as labels (phase 0 review finding: they passed as machine keys).
  { id: 'bad-label-map', expect: ['as "final"', 'as "verified"', 'as "quote"', 'as "deviz"'] },
  { id: 'bad-ternary', expect: ['as "binding"'] },
  { id: 'bad-variable', expect: ['as "confirmat"'] },
  { id: 'bad-hyphenated-term', expect: ['"firm price" (en) as "firm-price" in string: "[[firm-price]]"', 'A [[firm-price]] estimate'] },
  {
    id: 'bad-machine-key-list',
    expect: ['as "Final"', 'as "offer"', 'Stages.ts GONE: no const array literal or enum', 'Missing.ts LIST: the file is not a scanned script'],
    notExpect: ['as "final"'],
    options: {
      machineKeyLists: [
        { path: 'apps/web/src/Stages.ts', constant: 'STAGES', reason: 'TEST: stage keys' },
        { path: 'apps/web/src/Stages.ts', constant: 'GONE', reason: 'TEST: a list that no longer exists' },
        { path: 'apps/web/src/Missing.ts', constant: 'LIST', reason: 'TEST: a file that does not exist' },
      ],
    },
  },
  // A scan with nothing to read (phase 0 review finding: the check passed with 0 files scanned).
  {
    id: 'bad-empty-scope',
    expect: ['scan root "apps/**" matches no file', 'scan root "packages/**" matches no file', '0 copy units were scanned (0 files)'],
  },
  { id: 'bad-no-copy-units', expect: ['0 copy units were scanned (2 files)'], notExpect: ['matches no file'] },
  {
    id: 'bad-catalogue-without-files',
    expect: ['string catalogue "seeded-missing" (catalogue/*.json) matches no file'],
    notExpect: ['0 copy units', 'scan root'],
    options: { catalogues: [{ id: 'seeded-missing', files: 'catalogue/*.json', format: 'json' }] },
  },
  // Copy in forms the source scan skipped (phase 0 round 2 review, probe adv0b/rt: each passed).
  {
    id: 'bad-object-key-label',
    expect: [
      'as "quotation" in object-key: "Formal [[quotation]]"',
      'as "Firm price" in object-key',
      'as "Guaranteed" in object-key: "[[Guaranteed]] savings"',
      'stage-copy.ts:4:25 reserved term "verified" (en) as "Verified" in object-key',
      'as "Certified" in object-key',
      'stage-copy.ts:5:17 reserved term "binding" (en) as "Binding" in object-key',
      'as "Oferta ferma" in object-key',
      'StageList.tsx:10:17 reserved term "final" (en, ro) as "final" in object-key',
    ],
  },
  {
    id: 'bad-tagged-template',
    expect: [
      'as "Final" in tagged-template: "[[Final]] price, verified"',
      'as "verified" in tagged-template',
      'as "Certified" in tagged-template',
      'as "compliant" in tagged-template',
      'as "Oferta ferma" in tagged-template: "[[Oferta ferma]] {} garantat"',
      'as "garantat" in tagged-template',
      'queries.ts:3:26 reserved term "firm price" (en) as "Firm price" in tagged-template',
    ],
  },
  {
    id: 'bad-component-attribute',
    expect: [
      'as "verified" in jsx-attribute',
      'as "Guaranteed" in jsx-attribute',
      'as "binding" in string',
      'as "Certified" in string',
      'as "Final" in jsx-attribute',
    ],
  },
  { id: 'bad-data-attribute', expect: ['Label.tsx:2:45 reserved term "final" (en, ro) as "Final" in jsx-attribute', 'index.html:3:13 reserved term "quotation" (en) as "quotation" in html-attribute'] },
  { id: 'bad-html-input-value', expect: ['as "Final" in html-attribute: "[[Final]] price"', 'as "Firm price" in html-attribute'] },
  {
    id: 'bad-svg-text',
    expect: ['apps/web/src/stamp.svg:1:', 'as "VERIFIED" in html-text', 'as "Certified" in html-text: "[[Certified]] stamp"'],
    extraFiles: { 'apps/web/src/stamp.svg': SVG_STAMP },
  },
  {
    id: 'bad-json-copy-file',
    expect: ['as "quotation" in data', 'as "will save" in data', 'as "Ofertă fermă" in data', 'as "garantat" in data', 'as "Final" in data-key: "[[Final]] offer"'],
  },
  {
    id: 'bad-unreadable-file',
    expect: ['apps/web/src/strings.xlf: a file in scope that the check cannot read as copy'],
    notExpect: ['README.md'],
    options: { nonCopy: [{ files: '**/README.md', reason: 'TEST: developer notes, never shown' }] },
  },
  {
    id: 'bad-template-outside-src',
    expect: [
      'packages/engine/templates/proposal.hbs:2:5 reserved term "firm price" (en) as "Firm price" in text-template',
      'proposal.hbs:3:', 'as "Final" in text-template: "[[Final]] offer"',
      'as "binding" in text-template',
      'packages/engine/templates/summary.md:1:1 reserved term "guaranteed" (en) as "guaranteed" in text',
    ],
    notExpect: ['Seeded bad input'],
  },
  {
    id: 'bad-sql-migration',
    expect: [
      'packages/db/migrations/0001_badges.sql:2:', 'as "Final" in sql-string: "[[Final]] quotation"',
      'as "Verified" in sql-string',
      'migrations/0002_notes.sql:2:', 'as "firm price" in sql-string: "It\'s a [[firm price]]"',
    ],
    notExpect: ['this comment is not read'],
  },
  {
    id: 'bad-seed-file',
    expect: ['seeds/demo-project.json:1:', 'as "Confirmed" in data', 'packages/db/seeds/demo.yaml:', 'as "Definitive" in data'],
  },
  {
    id: 'bad-non-copy-list',
    expect: ['non-copy entry "packages/core/src/**": gives no reason', 'non-copy entry "**/*.po": matches no file in scope'],
    options: {
      nonCopy: [
        { files: 'packages/core/src/**', reason: '' },
        { files: '**/*.po', reason: 'TEST: a translation file that does not exist' },
      ],
    },
  },
  // Allowances held everywhere (phase 1 review, adversarial finding 12, probe-terms): the
  // registered allowances' own texts written outside the copy registries passed.
  {
    id: 'bad-allowance-outside-copy-registry',
    expect: [
      'apps/web/src/ExportHeading.tsx:2:', "as \"quotation\" in jsx-text: \"Formal [[quotation]]\" (a registered allowance's text outside the copy registries",
      "apps/web/src/Pending.ts:2:29 reserved term \"confirmed\" (en) as \"Confirmed\" in string: \"[[Confirmed]] by you\" (a registered allowance's text outside the copy registries",
      'seeds/demo-lines.json:3:', 'as "Verified" in data: "[[Verified]] by SOVITECH" (a registered allowance',
      'seeds/demo-lines.json:4:', 'as "confirmed" in data: "AI inference, [[confirmed]] by you" (a registered allowance',
      'packages/engine/templates/export.hbs:2:', 'as "verified" in text-template',
    ],
    notExpect: ['packages/registry/src/copy/texts.ts'],
    options: { allowances: registeredAllowances },
  },
  // Untyped slots (phase 1 review, adversarial finding 12): a word, an impossible day or an
  // interpolation filled a template's {date} slot, and a word would have filled a number slot.
  {
    id: 'bad-allowance-slot-not-typed',
    expect: [
      'lines.ts:3:', 'as "verified" in string: "AI inference, [[verified]] by SOVITECH on request of the designer"',
      'lines.ts:4:', 'on 31 Feb',
      'lines.ts:5:', 'as "verified" in template',
      'lines.ts:6:', 'as "verified" in string: "TEST two values [[verified]] by SOVITECH"',
    ],
    notExpect: ['controls.ts'],
    options: { allowances: allowancesFrom('bad-allowance-slot-not-typed') },
  },
  { id: 'bad-allowance-untyped-slot', expect: ['has the slot {whenever}, which has no type'], options: { allowances: allowancesFrom('bad-allowance-untyped-slot') } },
];

/** Runs the check on one seeded tree, with the phase 0 scope (in a temporary copy when the case writes files at run time). */
export async function runCase(seededCase: SeededCase): Promise<CheckResult> {
  const seeded = join(SEEDED, seededCase.id);
  const temporary = seededCase.extraFiles === undefined ? undefined : mkdtempSync(join(tmpdir(), 'sovitech-reserved-terms-'));
  try {
    if (temporary !== undefined) {
      cpSync(seeded, temporary, { recursive: true });
      for (const [path, content] of Object.entries(seededCase.extraFiles ?? {})) {
        mkdirSync(dirname(join(temporary, path)), { recursive: true });
        writeFileSync(join(temporary, path), content);
      }
    }
    return await scanReservedTerms({
      root: temporary ?? seeded,
      include: PHASE_0_SCOPE.include,
      optional: PHASE_0_SCOPE.optional,
      ignore: PHASE_0_SCOPE.ignore,
      catalogues: [],
      allowances: () => NO_ALLOWANCES,
      allowanceScope: COPY_REGISTRIES,
      listModule: LIST_MODULE,
      label: seededCase.id,
      ...seededCase.options,
    });
  } finally {
    if (temporary !== undefined) rmSync(temporary, { recursive: true, force: true });
  }
}

/**
 * A bad case that fails without its expected finding, or with a finding it
 * must not have, failed for another reason; it is returned as passing so the
 * self-test run flags it.
 */
export function asSeededResult(seededCase: SeededCase, result: CheckResult): CheckResult {
  const details = result.details.join('\n');
  const missing = seededCase.expect.filter((text) => !details.includes(text));
  const unwanted = (seededCase.notExpect ?? []).filter((text) => details.includes(text));
  if (result.ok || (missing.length === 0 && unwanted.length === 0)) return result;
  return {
    ...result,
    ok: true,
    summary: `${result.summary}; but not for the seeded reason (missing: ${missing.join(', ') || 'none'}; unwanted: ${unwanted.join(', ') || 'none'})`,
  };
}
