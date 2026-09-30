/**
 * `pnpm --filter @sovitech/extraction-contract generate`: writes the generated
 * files of the contract (generate.ts). Run it after every change to
 * src/extraction-contract.schema.json, then `pnpm test:py` and `pnpm test`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { REPO_ROOT, generateContractFiles } from './generate';

for (const [path, content] of generateContractFiles()) {
  const target = join(REPO_ROOT, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
  process.stdout.write(`wrote ${path}\n`);
}
