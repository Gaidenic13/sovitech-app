import repoConfig from '../../../../../vitest.config.ts';
import { withRootTest } from '../../../repo-config.ts';

// Seeded (TEST): the repository's config with the run guard taken out of the reporters.
export default withRootTest(repoConfig, (test) => ({ ...test, reporters: ['default'] }));
