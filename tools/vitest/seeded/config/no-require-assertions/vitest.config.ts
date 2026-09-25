import repoConfig from '../../../../../vitest.config.ts';
import { withGuardrailsProject } from '../../../repo-config.ts';

// Seeded (TEST): the guardrails project without expect.requireAssertions.
export default withGuardrailsProject(repoConfig, (test) => ({ ...test, expect: {} }));
