/**
 * The registry check (`pnpm checks -- --only registry`): registry validation
 * of the production registry, the gate files, and the sensitivity test.
 * See core.ts and docs/adr/0005-gates-mechanism.md.
 */
import type { Check } from '../types';
import { repoInputs, runRegistry } from './core';

const check: Check = async () => runRegistry(await repoInputs());

export default check;
