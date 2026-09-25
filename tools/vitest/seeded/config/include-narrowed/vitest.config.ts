import repoConfig from '../../../../../vitest.config.ts';
import { withGuardrailsProject } from '../../../repo-config.ts';

// Seeded (TEST): the guardrails project collecting only .tsx case files.
export default withGuardrailsProject(repoConfig, (test) => ({ ...test, include: ['tests/guardrails/**/*.test.tsx'] }));
