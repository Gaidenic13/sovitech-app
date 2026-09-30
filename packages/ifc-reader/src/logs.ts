/**
 * Logs that carry codes, never document text (guardrails rule 13; prompt 3 section 8).
 *
 * The reader's own log lines are JSON objects with a level and a code, and at most a name
 * (an error class), a count, STEP ids and GlobalIds. Everything else that could print is
 * silenced while a job runs: the process's standard output and standard error writers, and
 * the console, point nowhere; the log lines go to the writer kept aside before the job
 * started. web-ifc's own logging is switched off as well (./model.ts).
 */

const CODE = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/u;
const NAME = /^[A-Za-z_][A-Za-z0-9_.]{0,79}$/u;
const GLOBAL_ID = /^[0-9A-Za-z_$]{22}$/u;

export type LogWriter = (line: string) => void;

export interface LogFields {
  readonly level?: 'info' | 'warning' | 'error';
  readonly name?: string;
  readonly count?: number;
  readonly stepIds?: readonly number[];
  readonly globalIds?: readonly string[];
}

/** Writes one JSON object per line: a level, a code and ids; never free text. */
export class CodeLog {
  constructor(private readonly write: LogWriter) {}

  emit(code: string, fields: LogFields = {}): void {
    const line: Record<string, unknown> = { level: fields.level ?? 'info', code: CODE.test(code) ? code : 'log.invalid_code' };
    if (fields.name !== undefined && NAME.test(fields.name)) line['name'] = fields.name;
    if (fields.count !== undefined && Number.isInteger(fields.count)) line['count'] = fields.count;
    const stepIds = (fields.stepIds ?? []).filter((id) => Number.isInteger(id) && id > 0).slice(0, 64);
    if (stepIds.length > 0) line['stepIds'] = stepIds;
    const globalIds = (fields.globalIds ?? []).filter((id) => GLOBAL_ID.test(id)).slice(0, 64);
    if (globalIds.length > 0) line['globalIds'] = globalIds;
    this.write(`${JSON.stringify(line)}\n`);
  }
}

type Writer = typeof process.stdout.write;

/**
 * Runs a job with every other output silenced; the job gets the CodeLog. The standard streams'
 * writers and the console are restored afterwards, whatever happened.
 */
export async function silenced<T>(run: (log: CodeLog) => Promise<T>, write?: LogWriter): Promise<T> {
  const stdoutWrite: Writer = process.stdout.write.bind(process.stdout);
  const stderrWrite: Writer = process.stderr.write.bind(process.stderr);
  const kept: LogWriter = write ?? ((line) => void stderrWrite(line));
  const quiet = (() => true) as unknown as Writer;
  const consoleMethods = ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const;
  const saved = consoleMethods.map((method) => [method, console[method]] as const);
  process.stdout.write = quiet;
  process.stderr.write = quiet;
  for (const method of consoleMethods) console[method] = () => undefined;
  try {
    return await run(new CodeLog(kept));
  } finally {
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
    for (const [method, original] of saved) console[method] = original;
  }
}
