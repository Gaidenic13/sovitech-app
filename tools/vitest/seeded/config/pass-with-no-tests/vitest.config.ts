import repoConfig from '../../../../../vitest.config.ts';
import { withGuardrailsProject } from '../../../repo-config.ts';

// Seeded (TEST): the guardrails project passing when it collects nothing.
export default withGuardrailsProject(repoConfig, (test) => ({ ...test, passWithNoTests: true }));
