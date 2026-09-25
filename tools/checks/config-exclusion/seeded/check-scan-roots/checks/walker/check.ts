// Seeded config-exclusion input.
import { glob } from 'tinyglobby';

export default async () => glob(['**/*.ts'], { ignore: ['**/node_modules/**'] });
