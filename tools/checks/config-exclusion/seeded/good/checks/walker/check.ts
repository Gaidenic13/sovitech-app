// Seeded config-exclusion input.
import { glob } from 'tinyglobby';
import { DEFAULT_IGNORES } from '../lib';

export default async () => glob(['**/*.ts'], { ignore: [...DEFAULT_IGNORES] });
