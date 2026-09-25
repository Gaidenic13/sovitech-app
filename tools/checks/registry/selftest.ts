/**
 * Self-test of the registry check (`pnpm check:selftest`).
 *
 * 1. The control input, seeded/good/ (a field, a question, a declared formula
 *    and a TEST implementation that the answer reaches), must pass. If it
 *    does not, the self-test throws.
 * 2. Each seeded bad input must fail, and for its own seeded reason: every
 *    line of its `expected.txt` must appear in the details. A seed that fails
 *    for another reason throws too.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CheckResult, SelfTest } from '../types';
import { runRegistry, seededInputs } from './core';

const SEEDED = join(dirname(fileURLToPath(import.meta.url)), 'seeded');

export function badSeeds(): string[] {
  return readdirSync(SEEDED, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'good')
    .map((entry) => entry.name)
    .sort();
}

export function expectedReasons(name: string): string[] {
  const path = join(SEEDED, name, 'expected.txt');
  if (!existsSync(path)) throw new Error(`seeded/${name}/expected.txt is missing: every seed states the reason it must fail for`);
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
}

export async function runSeed(name: string): Promise<CheckResult> {
  const result = runRegistry(await seededInputs(join(SEEDED, name)));
  return { ...result, summary: `seeded/${name}: ${result.summary}` };
}

const selfTest: SelfTest = async () => {
  const control = await runSeed('good');
  if (!control.ok) {
    throw new Error(`The registry check did not pass its control input seeded/good/:\n${control.details.join('\n')}`);
  }
  const results: CheckResult[] = [];
  for (const name of badSeeds()) {
    const result = await runSeed(name);
    const text = result.details.join('\n');
    const missing = expectedReasons(name).filter((reason) => !text.includes(reason));
    if (!result.ok && missing.length > 0) {
      throw new Error(
        `seeded/${name}/ failed, but not for its seeded reason (missing: ${missing.join(' | ')}), so it proves nothing:\n${text}`,
      );
    }
    results.push(result);
  }
  return results;
};

export default selfTest;
