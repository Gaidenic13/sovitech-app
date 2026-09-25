/**
 * The index check (docs/guardrails.md section 7, "The CI index check"; R-156),
 * run on the repository. See index-check.ts and docs/adr/0003-index-check-convention.md.
 *
 * On the repository it also checks the settings that keep the run-time half in
 * place (tools/vitest/config-integrity.ts): the run guard among the reporters,
 * the guardrails project's include, exclude, assertions and stub guard, and a
 * test script, pnpm check and CI that run it without an override. Each fault is a
 * `[run config]` problem, listed first with the other problems.
 */
import { checkConfigIntegrity } from '../../vitest/config-integrity';
import { repoRoot } from '../lib';
import type { Check } from '../types';
import { runIndexCheck, withRunConfigProblems } from './index-check';

const check: Check = async () => withRunConfigProblems(await runIndexCheck(repoRoot), await checkConfigIntegrity(repoRoot));

export default check;
