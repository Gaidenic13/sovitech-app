/**
 * Config-exclusion check: no tool config, package script or check scan root
 * reaches into company/ (see inspect.ts).
 */
import { repoRoot } from '../lib';
import type { Check } from '../types';
import { repositoryTargets } from './discover';
import { inspectAll, toCheckResult } from './inspect';

const check: Check = async () => toCheckResult(await inspectAll(await repositoryTargets(repoRoot)));

export default check;
