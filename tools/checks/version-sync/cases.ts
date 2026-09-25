/**
 * The seeded inputs of the version-sync check, shared by selftest.ts and the
 * unit tests. Each case is a small tree under seeded/<id>/, with neutral file
 * names so no tool mistakes a seeded file for a real instructions file or skill.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CheckResult } from '../types';
import { checkVersionSync, type VersionSyncLayout } from './sync';

const SEEDED = join(dirname(fileURLToPath(import.meta.url)), 'seeded');

export interface SeededCase {
  readonly id: string;
  /** Text the findings of a bad case must contain, so it fails for the reason it was seeded for. */
  readonly expect: readonly string[];
  readonly skills?: readonly string[];
  readonly agents?: readonly string[];
}

export const GOOD_CASE: SeededCase = {
  id: 'good',
  expect: [],
  skills: ['skills/guardrail-check/SKILL.md', 'skills/frontend-design/SKILL.md'],
  agents: ['agents/guardrail-auditor.md'],
};

export const BAD_CASES: readonly SeededCase[] = [
  { id: 'bad-instructions-behind', expect: ['project-instructions.md:3: checked against v1.4'] },
  { id: 'bad-instructions-missing', expect: ['project-instructions.md: no "Checked against'] },
  { id: 'bad-instructions-two-lines', expect: ['project-instructions.md:5: checked against v1.4'] },
  { id: 'bad-prompt-behind', expect: ['ai-system-prompt.md:3: checked against v1.3'] },
  { id: 'bad-prompt-line-outside-header', expect: ['does not open with a header comment'] },
  { id: 'bad-project-skill-behind', expect: ['SKILL.md:7: checked against v1.2'], skills: ['skills/guardrail-check/SKILL.md'] },
  { id: 'bad-project-skill-without-line', expect: ['a project skill without'], skills: ['skills/synthetic-fixtures/SKILL.md'] },
  { id: 'bad-third-party-skill-behind', expect: ['checked against v1.4'], skills: ['skills/frontend-design/SKILL.md'] },
  { id: 'bad-agent-unreadable', expect: ['whose version cannot be read'], agents: ['agents/guardrail-auditor.md'] },
  { id: 'bad-guardrails-without-version', expect: ['the version line is missing'] },
];

export function layoutOf(seededCase: SeededCase): VersionSyncLayout {
  return {
    root: join(SEEDED, seededCase.id),
    guardrails: 'guardrails.md',
    instructions: 'project-instructions.md',
    prompt: 'ai-system-prompt.md',
    skillFiles: seededCase.skills ?? [],
    agentFiles: seededCase.agents ?? [],
    skillsLock: 'skills-lock.json',
    label: seededCase.id,
  };
}

export function runCase(seededCase: SeededCase): Promise<CheckResult> {
  return checkVersionSync(layoutOf(seededCase));
}

/**
 * A bad case that fails without its expected finding failed for another
 * reason; it is returned as passing so the self-test run flags it.
 */
export function asSeededResult(seededCase: SeededCase, result: CheckResult): CheckResult {
  const details = result.details.join('\n');
  const missing = seededCase.expect.filter((text) => !details.includes(text));
  if (result.ok || missing.length === 0) return result;
  return { ...result, ok: true, summary: `${result.summary}; but not for the seeded reason (no finding with ${missing.join(', ')})` };
}
