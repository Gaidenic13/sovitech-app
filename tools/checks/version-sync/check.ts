/**
 * Version-sync check: CLAUDE.md, the in-app prompt's header, project skills and
 * agents state the guardrails version at the top of docs/guardrails.md.
 */
import { repoRoot } from '../lib';
import type { Check } from '../types';
import { checkVersionSync, discoverRepositoryLayout } from './sync';

const check: Check = async () => checkVersionSync(await discoverRepositoryLayout(repoRoot));

export default check;
