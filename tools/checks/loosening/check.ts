/**
 * The loosening check (`pnpm checks -- --only loosening`): the production
 * registry and gates against the last approved snapshot, or, while no
 * approver is named, against "unapproved baseline v0"; the approval tripwire
 * (approvals are read from git, and the build branch may not write them); and
 * every exception list against its part of the snapshot. See core.ts,
 * docs/adr/0005-gates-mechanism.md (the mechanism) and
 * docs/adr/0010-registry-values-unapproved-baseline.md (the values).
 */
import type { Check } from '../types';
import { repoCheckInputs, runLoosening } from './core';

const check: Check = async () => runLoosening(await repoCheckInputs());

export default check;
