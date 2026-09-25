// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
// A loader made by createRequire: dependency-cruiser does not see its calls, even with a
// literal path (phase 0 review round 2).
import { createRequire } from 'node:module';
const load = createRequire(import.meta.url);
export const gates = load('../../registry/src/gates/source');
