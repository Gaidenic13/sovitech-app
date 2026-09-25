// @pending-until: phase 1 derive
import { verifyProposal } from '@sovitech/domain';
import { pendingCase } from './_support/pending';

// Seeded: a stale marker. Phase 1 built derive, so no domain stub declares it any more
// (ADR 0004); a case file whose marker still names it must fail to load, never be held out.
const pending = pendingCase(import.meta.url);

pending('G2-7 · seeded pending case whose marker names derive, which is built now', () => {
  (verifyProposal as unknown as () => unknown)();
});
