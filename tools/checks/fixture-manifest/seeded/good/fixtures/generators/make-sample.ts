// Seeded fixture generator (TEST) for the fixture-manifest self-test: the check runs it as
// `tsx make-sample.ts --out <folder>` and compares what it writes with fixtures/manifest.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const out = process.argv[process.argv.indexOf('--out') + 1] ?? '';
const target = join(out, 'fixtures/data/sample.txt');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, 'id,label\n1,synthetic row\n');
