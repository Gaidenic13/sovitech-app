import repoConfig from '../../../../../vitest.config.ts';
import { withGuardrailsProject } from '../../../repo-config.ts';

// Seeded (TEST): the guardrails project renamed, so the guards no longer find it.
export default withGuardrailsProject(repoConfig, (test) => ({ ...test, name: 'cases' }));
