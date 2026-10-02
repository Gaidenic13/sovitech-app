/**
 * dependency-cruiser: the package boundaries of prompt 3 section 6 ("Boundaries").
 *
 * - apps/web imports only @sovitech/view-model/browser, @sovitech/ui and @sovitech/viewer;
 * - only apps/api imports @sovitech/db and @sovitech/view-model/server;
 * - ui and viewer import nothing from domain, engine or registry;
 * - nothing imports from company/ (build-readiness decision 12);
 * - the gate-opening test-utils entry is reached only from tests/proposed/, through any chain of
 *   imports; tests/proposed/ is imported only from tests/proposed/; apps/ and packages/ import
 *   nothing from tests/ (prompt 3 section 5.4; phase 0 review, round 2);
 * - outside its own package, a file under packages/<pkg>/src/ is imported only through
 *   an entry of that package's package.json `exports` (phase 0 review: a relative deep
 *   import of packages/registry/src/gates/source.ts reached the gate issuer, which
 *   no entry exports);
 * - the store's TEST machinery, @sovitech/db/testing, is reached only from tests/ and the
 *   store's own *.test.ts files, through any chain of imports (phase 1 review);
 * - the e2e stack (tests/e2e/setup/) imports the store only through @sovitech/db/testing
 *   (phase 3 part B, V-13);
 * - the phase 4 viewer spike (@sovitech/viewer-spike) is imported by nothing but itself and the
 *   proposed suite (docs/adr/0046-viewer-spike.md).
 *
 * Two more rules close gaps the list above leaves open, and are recorded in
 * tools/eslint-rules/README.md: browser-side code never reaches server-side code
 * through any chain of imports, and an import that cannot be resolved fails (so
 * a typo cannot slip past the path rules). A package never imports an app.
 *
 * Each rule is proven by a seeded import in tools/eslint-rules/fixtures/seeded/depcruise/
 * or in tools/checks/loosening/seeded/boundary-imports/ (same format), both run by the
 * lint-bans check's self-test; tools/eslint-rules/depcruise.test.ts fails a rule that
 * neither set proves. package-internals-only-through-exports, gate-test-utils-only-from-proposed,
 * proposed-tests-only-from-proposed and no-tests-from-apps-or-packages are proven by the second
 * set (tools/checks/loosening/boundary-seeds.test.ts), which also shows that the configuration
 * before each fix let the review's probes through (the deep imports; the chain through a
 * tests/proposed/ helper).
 *
 * Paths are matched in the three forms an import can resolve to: the real path under
 * packages/ (pnpm links resolved), a path through node_modules/@sovitech/ (links kept),
 * and the bare package name (resolution failed).
 *
 * Scan roots are listed in the root `lint:deps` script (apps packages tools tests
 * evals fixtures); company/ is not among them.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */

const { existsSync, readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

/** A file ending that marks a module file rather than a folder, for the entry-point patterns. */
const MODULE_END = '(?:\\.[cm]?[jt]sx?$|/)';

/** Every resolved form of a workspace package's files. `name` may be an alternation group. */
function pkg(name) {
  return `^packages/${name}/|(^|/)node_modules/@sovitech/${name}/|^@sovitech/${name}(/|$)`;
}

/** The view-model browser entry and its folder. */
const VIEW_MODEL_BROWSER = `^packages/view-model/src/browser${MODULE_END}|(^|/)node_modules/@sovitech/view-model/src/browser${MODULE_END}`;

/** Everything in view-model that is not its browser side: the server entry, the resolver, the formatting module. */
const VIEW_MODEL_SERVER = [
  `^packages/view-model/src/(?!browser${MODULE_END})`,
  `(^|/)node_modules/@sovitech/view-model/src/(?!browser${MODULE_END})`,
  '^@sovitech/view-model/server(/|$)',
].join('|');

/** What apps/web may import from the workspace. */
const WEB_ALLOWED = [
  '^apps/web/',
  `^packages/(?:ui|viewer)/src/|(^|/)node_modules/@sovitech/(?:ui|viewer)/src/`,
  VIEW_MODEL_BROWSER,
  // Third-party npm packages (react and the like) are outside these boundaries.
  '(^|/)node_modules/(?!@sovitech/)',
];

/** Code that ends up in the browser bundle. */
const BROWSER_SIDE = `^apps/web/|^packages/(?:ui|viewer)/|^packages/view-model/src/browser${MODULE_END}`;

/**
 * Code that must never reach the browser bundle. extraction-contract (phase 2) parses the
 * extractor's output, document text and sealed IFC values included, on the server only; the
 * IFC reader (phase 2, web-ifc; ADR 0031) reads owner models in its sandbox only: the browser
 * never parses the owner's IFC (prompt 3 section 8).
 */
const SERVER_SIDE = [pkg('(?:domain|engine|registry|db|ai|extraction-contract|ifc-reader)'), VIEW_MODEL_SERVER, '^apps/api/|(^|/)node_modules/@sovitech/api/|^@sovitech/api(/|$)'].join(
  '|',
);

/**
 * Guardrail case folders: indexed cases and gated proposed cases; and, since phase 2, the API's
 * integration tests (tests/api/), which drive the API over a TEST database as the API's cases do.
 * Not tests/e2e/, which drives the app from outside.
 */
const CASE_FOLDERS = 'tests/(?:guardrails|proposed|api)/';

const TEST_UTILS =
  '^packages/registry/src/test-utils/|(^|/)node_modules/@sovitech/registry/src/test-utils/|^@sovitech/registry/test-utils(/|$)';

/** The store's TEST machinery, @sovitech/db/testing, in every resolved form. */
const DB_TESTING = '^packages/db/src/testing/|(^|/)node_modules/@sovitech/db/src/testing/|^@sovitech/db/testing(/|$)';

/** Escapes a path for use inside a regular expression. */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Every file path a package.json `exports` field points at (conditions and subpaths included). */
function exportTargets(exportsField) {
  if (typeof exportsField === 'string') return [exportsField];
  if (typeof exportsField !== 'object' || exportsField === null) return [];
  return Object.values(exportsField).flatMap(exportTargets);
}

/**
 * The entry files of every workspace package under packages/, read from each
 * package.json `exports`, in the resolved forms an import reaches them by: the
 * real path under packages/ and a path through node_modules/@sovitech/. Read
 * when the configuration loads, so an entry added to `exports` is allowed at
 * once and nothing else is.
 */
function packageEntryPatterns() {
  const root = join(__dirname, 'packages');
  if (!existsSync(root)) return [];
  const patterns = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(root, entry.name, 'package.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const target of exportTargets(manifest.exports)) {
      const file = escapeRegExp(target.replace(/^\.\//, ''));
      patterns.push(`^packages/${escapeRegExp(entry.name)}/${file}$`);
      if (typeof manifest.name === 'string') patterns.push(`(^|/)node_modules/${escapeRegExp(manifest.name)}/${file}$`);
    }
  }
  return patterns;
}

/**
 * The importing file's own top folder: packages/<pkg>/ or apps/<app>/, else its first
 * path segment. It is always captured, so `$1` below is always the importer's own package.
 */
const IMPORTER_PACKAGE = '^((?:apps|packages)/[^/]+/|[^/]*)';

module.exports = {
  forbidden: [
    {
      name: 'no-company-imports',
      comment: 'Nothing imports from company/ (prompt 3 section 6; build-readiness decision 12).',
      severity: 'error',
      from: {},
      to: { path: '^company/' },
    },
    {
      name: 'web-imports-only-browser-entries',
      comment:
        'apps/web imports only @sovitech/view-model/browser, @sovitech/ui and @sovitech/viewer from the workspace (prompt 3 section 6; guardrails rule 2, "Enforced by").',
      severity: 'error',
      from: { path: '^apps/web/' },
      to: { pathNot: WEB_ALLOWED, dependencyTypesNot: ['core'] },
    },
    {
      name: 'db-only-from-api',
      comment:
        'Only apps/api imports @sovitech/db (prompt 3 section 6). Guardrail cases (tests/guardrails/, tests/proposed/) may drive it directly; tools/eslint-rules/README.md records this reading. The e2e stack (tests/e2e/setup/, phase 3, docs/adr/0037-e2e-setup.md) is let through here only for the store\'s TEST machinery: e2e-setup-reaches-db-only-through-testing refuses any other @sovitech/db import from it, and no spec imports the store.',
      severity: 'error',
      from: { pathNot: `^(?:apps/api/|packages/db/|${CASE_FOLDERS}|tests/e2e/setup/)` },
      to: { path: pkg('db') },
    },
    {
      name: 'e2e-setup-reaches-db-only-through-testing',
      comment:
        'The e2e stack (tests/e2e/setup/; docs/adr/0037-e2e-setup.md decisions 8 and 11) imports the store only through its TEST machinery, @sovitech/db/testing (a throwaway database, TEST accounts, statements on a login role in a request scope); any other @sovitech/db import from there is refused (phase 3 part B, V-13: db-only-from-api let tests/e2e/setup/ import the whole store while its comment and ADR 0037 said the stack imports only /testing).',
      severity: 'error',
      from: { path: '^tests/e2e/setup/' },
      to: { path: pkg('db'), pathNot: DB_TESTING },
    },
    {
      name: 'view-model-server-only-from-api',
      comment:
        'Only apps/api imports the view-model server side (prompt 3 section 6). Guardrail cases (tests/guardrails/, tests/proposed/) may call it directly; the browser side of view-model never does.',
      severity: 'error',
      from: { pathNot: [`^(?:apps/api/|${CASE_FOLDERS})`, `^packages/view-model/src/(?!browser${MODULE_END})`] },
      to: { path: VIEW_MODEL_SERVER },
    },
    {
      name: 'ui-viewer-no-domain-engine-registry',
      comment: 'ui and viewer import nothing from domain, engine or registry (prompt 3 section 6; guardrails rule 2, "Enforced by").',
      severity: 'error',
      from: { path: '^packages/(?:ui|viewer)/' },
      to: { path: pkg('(?:domain|engine|registry)') },
    },
    {
      name: 'gate-test-utils-only-from-proposed',
      comment:
        'The registry test-utils entry, the only place a gate can be opened, is reached only from tests/proposed/ (prompt 3 section 5.4), directly or through any chain of imports (phase 0 review, round 2: apps/api -> tests/proposed/<helper> -> test-utils passed the direct-import rule).',
      severity: 'error',
      from: { pathNot: '^(?:tests/proposed/|packages/registry/src/test-utils/)' },
      to: { path: TEST_UTILS, reachable: true },
    },
    {
      name: 'proposed-tests-only-from-proposed',
      comment:
        'Code under tests/proposed/ runs gated behaviour with gates opened by the test-utils override; it is imported only from tests/proposed/, so an indexed case or app code cannot borrow an open gate (prompt 3 section 5.4: gated tests are not indexed and do not block).',
      severity: 'error',
      from: { pathNot: '^tests/proposed/' },
      to: { path: '^tests/proposed/' },
    },
    {
      name: 'no-tests-from-apps-or-packages',
      comment: 'App and package code never imports test code under tests/ (prompt 3 section 6: tests drive the code, never the other way round).',
      severity: 'error',
      from: { path: '^(?:apps|packages)/' },
      to: { path: '^tests/' },
    },
    {
      name: 'package-internals-only-through-exports',
      comment:
        "Outside its own package, a file under packages/<pkg>/src/ is imported only through an entry in that package's package.json exports. A relative path into another package's internals (for example packages/registry/src/gates/source.ts, which issues gate sources) is refused, so a gate cannot be opened by import (prompt 3 section 5.4; phase 0 review).",
      severity: 'error',
      from: { path: IMPORTER_PACKAGE },
      to: {
        path: '^packages/[^/]+/src/|(^|/)node_modules/@sovitech/[^/]+/src/|^@sovitech/[^/]+/src/',
        pathNot: [...packageEntryPatterns(), '^$1'],
      },
    },
    {
      name: 'packages-do-not-import-apps',
      comment: 'Apps depend on packages, never the other way round (prompt 3 section 6, "Architecture").',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/|(^|/)node_modules/@sovitech/(?:api|web)(/|$)|^@sovitech/(?:api|web)(/|$)' },
    },
    {
      name: 'browser-code-reaches-no-server-code',
      comment:
        'No chain of imports takes domain, engine, registry, db, ai, the view-model server side or apps/api into browser code (prompt 3 section 6: no candidate, event or bare engineering number reaches the browser).',
      severity: 'error',
      from: { path: BROWSER_SIDE },
      to: { path: SERVER_SIDE, reachable: true },
    },
    {
      name: 'test-formulas-and-fixtures-only-from-tests',
      comment:
        'TEST formulas (packages/engine/test-formulas/) and fixtures, the TEST datasets in fixtures/datasets/ among them, load only inside the test runner (prompt 3 sections 5.4 and 10): no chain of imports reaches them from app or package source (phase 1; until then this held by convention, backed by loadDataset refusing any TEST id).',
      severity: 'error',
      from: { path: '^(?:apps|packages)/[^/]+/src/' },
      to: { path: '^(?:packages/engine/test-formulas/|fixtures/)', reachable: true },
    },
    {
      name: 'db-testing-only-from-tests',
      comment:
        "The store's TEST machinery (@sovitech/db/testing: throwaway databases, TEST accounts, and engineer grants on the operator login) is reached only from tests/ and from the store's own *.test.ts files, through any chain of imports (prompt 3 section 5.4: TEST data loads only inside the test runner; rule 10: no script creates engineers). Phase 1 review: until then only a comment kept apps/api or a package from importing it.",
      severity: 'error',
      from: { pathNot: ['^tests/', '^packages/db/src/testing/', '^packages/db/src/.*\\.test\\.ts$'] },
      to: {
        path: DB_TESTING,
        reachable: true,
      },
    },
    {
      name: 'viewer-spike-imported-by-nothing',
      comment:
        'The phase 4 viewer spike (@sovitech/viewer-spike; docs/adr/0046-viewer-spike.md) is wired into nothing: no app, package, tool, indexed case or e2e spec imports it, so no viewer reaches the live app (the owner\'s answer of 2026-10-02, "Trial now, decide later"; PRD R-078 "Until decided"). Its own files may import each other, and the proposed suite (tests/proposed/) may read its plan input for ifc-input 5.4\'s IFC-12, which waits for D-03, D-04 and D-01. Its runner (tools/viewer-spike/) reaches it by path (esbuild and docker), never by import.',
      severity: 'error',
      from: { pathNot: ['^packages/viewer-spike/', '^tests/proposed/'] },
      to: { path: pkg('viewer-spike') },
    },
    {
      name: 'not-to-unresolvable',
      comment: 'An import that cannot be resolved could hide a boundary crossing, so it fails.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: ['node_modules', '^company/'] },
    exclude: {
      path: [
        // Third-party packages only: a workspace package reached through a kept
        // node_modules/@sovitech/ link must stay visible to the rules above.
        '(^|/)node_modules/(?!@sovitech/)',
        '^services/extractor/\\.venv/',
        '(^|/)dist/',
        // Seeded bad inputs of the checks and of the lint rules are wrong on purpose.
        '^tools/.*/seeded/',
        '^tools/eslint-rules/fixtures/',
      ],
    },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
