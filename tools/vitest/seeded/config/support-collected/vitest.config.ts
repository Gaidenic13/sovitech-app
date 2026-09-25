import repoConfig from '../../../../../vitest.config.ts';
import { withGuardrailsProject } from '../../../repo-config.ts';

// Seeded (TEST): the guardrails project without its _support exclude.
export default withGuardrailsProject(repoConfig, (test) => ({ ...test, exclude: [] }));
