/**
 * `pnpm evals [<ID> ...]`: runs the guardrail evals (runner.ts). Without an API key it
 * prints "not running" for every eval and exits 0, having called nothing and written
 * nothing. With a key it exits 1 when any eval that ran failed or was invalid.
 */
import { formatEvalReport, runEvals } from './runner';

const ids = process.argv.slice(2).filter((argument) => !argument.startsWith('-'));
const report = await runEvals({ ids });
for (const line of formatEvalReport(report)) process.stdout.write(`${line}\n`);
const bad = report.cases.some((entry) => entry.status === 'failed' || entry.status === 'invalid');
process.exitCode = report.running && bad ? 1 : 0;
