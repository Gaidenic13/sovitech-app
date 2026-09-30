/**
 * The Anthropic SDK boundary in eslint.config.js (block `sovitech/anthropic-sdk-boundary`):
 * only packages/ai/src/transport.ts, the AI boundary's transport, and its own test import
 * @anthropic-ai/sdk (prompt 3 section 6; ADRs 0021 and 0023). Lints probe sources at paths
 * across the workspace with the repository's own configuration; nothing is written.
 *
 * Test titles start with F-EXTRACT-03 (the AI call the transport makes, whose only route to the
 * SDK this boundary keeps) and ADR 0023 (the AI boundary): no section 7 case covers the import
 * boundary itself.
 *
 * The limit of this block (phase 2 fix round 3, the verifier's note "a computed specifier is not
 * flagged"): a specifier computed at run time, `import(name)` or `require(name)` with a built
 * string, names no package ESLint can read. In apps/ and packages/ the lint ban
 * `sovitech/no-computed-import` refuses every computed specifier, and `new Function` with it, so
 * app code cannot reach the SDK that way (proven below). In tools/, tests/, evals/ and fixtures/ no
 * lint rule sees one; there, and against a name spelt in pieces that do not include the package
 * scope, the only guard is the source-text scan in packages/ai/src/transport.test.ts, which finds
 * the package scope's text in no script but the transport. No runtime guard stops a module from
 * loading the SDK: a load-time check cannot see an import made later, and the build output keeps
 * a computed import as it was written.
 */
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { repoRoot } from './depcruise-harness';

const eslint = new ESLint({ cwd: repoRoot });

/** The rule ids ESLint reports for `code` linted as if it lived at `filePath`. */
async function rulesAt(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath, warnIgnored: true });
  return (result?.messages ?? []).map((message) => message.ruleId ?? 'fatal');
}

const IMPORTS = [
  "import Anthropic from '@anthropic-ai/sdk';\nexport const client = Anthropic;\n",
  "export { default } from '@anthropic-ai/sdk';\n",
  "import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';\nexport const format = zodOutputFormat;\n",
];

// Phase 2 review, adversarial finding "The SDK boundary misses dynamic imports and require":
// no-restricted-imports sees only static imports, so each of these reached the SDK unseen.
const OTHER_ROUTES = [
  "export async function load() { return import('@anthropic-ai/sdk'); }\n",
  'export async function load() { return import(`@anthropic-ai/sdk`); }\n',
  "const sdk = require('@anthropic-ai/sdk');\nexport default sdk;\n",
  "import { createRequire } from 'node:module';\nexport const sdk = createRequire(import.meta.url)('@anthropic-ai/sdk/helpers/zod');\n",
  "export const sdk = module.require('@anthropic-ai/sdk');\n",
];

// Typed linting builds the TypeScript program on first use; under a full, loaded run that took
// longer than Vitest's default 5 s (phase 2 fix round 3's full run), so the block waits longer.
describe('the Anthropic SDK boundary (eslint.config.js)', { timeout: 120_000 }, () => {
  it.each(['apps/api/src/sdk-probe.js', 'packages/domain/src/sdk-probe.js', 'packages/ai/src/boundary-probe.js', 'tools/checks/sdk-probe.js', 'tests/api/sdk-probe.js'])(
    'F-EXTRACT-03 · ADR 0023: refuses a dynamic import or a require of the SDK at %s',
    async (path) => {
      for (const code of OTHER_ROUTES) expect(await rulesAt(path, code), code).toContain('no-restricted-syntax');
      expect(await rulesAt(path, "export async function load() { return import('@sovitech/domain'); }\n")).toEqual([]);
    },
  );

  it("F-EXTRACT-03 · ADR 0023: refuses TypeScript's import-equals require of the SDK in a TypeScript source", async () => {
    // A path the TypeScript project holds, linted with probe text (nothing is written).
    const rules = await rulesAt('packages/ai/src/boundary.ts', "import sdk = require('@anthropic-ai/sdk');\nexport default sdk;\n");
    expect(rules.some((rule) => rule === 'no-restricted-syntax' || rule === 'no-restricted-imports')).toBe(true);
  });

  it.each(['apps/api/src/sdk-probe.js', 'packages/domain/src/sdk-probe.js', 'packages/ai/src/boundary-probe.js', 'tools/checks/sdk-probe.js', 'tests/api/sdk-probe.js'])(
    'F-EXTRACT-03 · ADR 0023: refuses an SDK import at %s',
    async (path) => {
      for (const code of IMPORTS) expect(await rulesAt(path, code)).toContain('no-restricted-imports');
    },
  );

  it('F-EXTRACT-03 · ADR 0023: lets the transport import it, and nothing else in its package', async () => {
    const transport = (await eslint.calculateConfigForFile(`${repoRoot}/packages/ai/src/transport.ts`)) as { rules?: Record<string, unknown> };
    expect(transport.rules?.['no-restricted-imports']).toBeUndefined();
    const other = (await eslint.calculateConfigForFile(`${repoRoot}/packages/ai/src/boundary.ts`)) as { rules?: Record<string, unknown> };
    expect(other.rules?.['no-restricted-imports']).toBeDefined();
  });
  // Phase 2 fix round 3, the verifier's note "a computed specifier is not flagged": the SDK boundary
  // block cannot read a built name, and in app code the lint ban on computed specifiers refuses it.
  const COMPUTED = [
    "const name = '@anthropic-ai/' + 'sdk';\nexport async function load() { return import(name); }\n",
    "const name = ['@anthropic-ai', 'sdk'].join('/');\nexport const load = () => require(name);\n",
    "export const load = new Function('p', 'return import(p)');\n",
  ];
  it.each(['apps/api/src/sdk-probe.js', 'packages/domain/src/sdk-probe.js', 'packages/ai/src/boundary-probe.js'])(
    'F-EXTRACT-03 · ADR 0023: refuses a computed specifier, from which the SDK could be loaded, at %s (sovitech/no-computed-import)',
    async (path) => {
      for (const code of COMPUTED) expect(await rulesAt(path, code), code).toContain('sovitech/no-computed-import');
    },
  );
});
