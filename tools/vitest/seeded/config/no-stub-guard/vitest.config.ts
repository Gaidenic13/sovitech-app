import repoConfig from '../../../../../vitest.config.ts';
import { withGuardrailsProject } from '../../../repo-config.ts';

// Seeded (TEST): the guardrails project without its setup files, so the stub guard does not run.
export default withGuardrailsProject(repoConfig, (test) => ({ ...test, setupFiles: [] }));
