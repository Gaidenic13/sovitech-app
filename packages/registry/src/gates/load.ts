/**
 * Reads gate data files. The production folder is fixed: packages/registry/gates/.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { GATE_IDS, gateSchema, type GateDefinition } from './schema';

/** packages/registry/gates/, the only folder a production gate source is built from. */
export const PRODUCTION_GATES_DIR: string = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'gates');

export class GateFileError extends Error {
  override name = 'GateFileError';
}

/** Parses one gate file; the file name must be `<id>.yaml`. */
export function parseGateFile(path: string, text: string): GateDefinition {
  let data: unknown;
  try {
    data = parse(text);
  } catch (error) {
    throw new GateFileError(`${path}: not valid YAML: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  const parsed = gateSchema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`);
    throw new GateFileError(`${path}: not a valid gate: ${issues.join('; ')}`);
  }
  const gate = parsed.data as GateDefinition;
  if (basename(path) !== `${gate.id}.yaml`) {
    throw new GateFileError(`${path}: the file name must be ${gate.id}.yaml, the gate's id`);
  }
  return gate;
}

/** Every `*.yaml` gate file in `dir`, sorted by id. Throws, naming the file, on the first bad one. */
export function loadGateDefinitions(dir: string): GateDefinition[] {
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
    .sort();
  const gates = files.map((name) => parseGateFile(join(dir, name), readFileSync(join(dir, name), 'utf8')));
  const seen = new Set<string>();
  for (const gate of gates) {
    if (seen.has(gate.id)) throw new GateFileError(`${dir}: the gate ${gate.id} is defined twice`);
    seen.add(gate.id);
  }
  return gates.sort((left, right) => left.id.localeCompare(right.id));
}

/** Gates of the starting set that are missing. */
export function gateSetProblems(gates: readonly GateDefinition[]): string[] {
  const present = new Set(gates.map((gate) => gate.id));
  return GATE_IDS.filter((id) => !present.has(id)).map(
    (id) => `packages/registry/gates/${id}.yaml is missing: the gate ${id} belongs to the starting set of prompt 3 section 5.4`,
  );
}
