/**
 * The shared corpus (corpus.json) for the TypeScript tests: its cases with the
 * patches applied. services/extractor/tests/test_contract.py reads the same
 * file and applies the same patches, so both languages judge the same values.
 */
import corpusSource from './corpus.json' with { type: 'json' };

export type Entry = 'ExtractionOutput' | 'ExtractionRequest' | 'EvidenceLocator';
export type Expectation = 'valid' | 'schema' | readonly string[];

interface PatchOperation {
  readonly op: 'set' | 'remove';
  readonly path: string;
  readonly value?: unknown;
}

interface RawCase {
  readonly name: string;
  readonly entry?: string;
  readonly base?: string;
  readonly value?: unknown;
  readonly patch?: readonly PatchOperation[];
  readonly expect: string | readonly string[];
}

export interface CorpusCase {
  readonly name: string;
  readonly entry: Entry;
  readonly value: unknown;
  readonly expect: Expectation;
}

export interface CorpusPair {
  readonly name: string;
  readonly request: string;
  readonly output: string;
  readonly expect: readonly string[];
}

function isEntry(value: unknown): value is Entry {
  return value === 'ExtractionOutput' || value === 'ExtractionRequest' || value === 'EvidenceLocator';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The position in a list that a pointer token names (tokens are decimal positions; no number is parsed). */
function position(list: readonly unknown[], token: string): number {
  const index = [...list.keys()].find((key) => String(key) === token);
  if (index === undefined) throw new Error(`patch token ${token} names no position of the list`);
  return index;
}

function tokens(pointer: string): readonly string[] {
  return pointer === '' ? [] : pointer.slice(1).split('/').map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/** Applies one patch operation to a deep copy of the document and returns the result. */
function apply(document: unknown, operation: PatchOperation): unknown {
  const path = tokens(operation.path);
  if (path.length === 0) {
    if (operation.op === 'remove') throw new Error('cannot remove the document itself');
    return structuredClone(operation.value);
  }
  const copy = structuredClone(document);
  let parent: unknown = copy;
  for (const token of path.slice(0, -1)) {
    if (Array.isArray(parent)) parent = parent[position(parent, token)];
    else if (isRecord(parent)) parent = parent[token];
    else throw new Error(`patch path ${operation.path} runs through a scalar`);
  }
  const last = path[path.length - 1] ?? '';
  if (Array.isArray(parent)) {
    if (operation.op === 'set' && last === '-') parent.push(structuredClone(operation.value));
    else if (operation.op === 'set') parent[position(parent, last)] = structuredClone(operation.value);
    else parent.splice(position(parent, last), 1);
  } else if (isRecord(parent)) {
    if (operation.op === 'set') parent[last] = structuredClone(operation.value);
    else delete parent[last];
  } else {
    throw new Error(`patch path ${operation.path} ends in a scalar`);
  }
  return copy;
}

function load(): { readonly cases: readonly CorpusCase[]; readonly pairs: readonly CorpusPair[] } {
  const rawCases = corpusSource.cases as unknown as readonly RawCase[];
  const byName = new Map<string, CorpusCase>();
  for (const raw of rawCases) {
    if (byName.has(raw.name)) throw new Error(`corpus case ${raw.name} appears twice`);
    const base = raw.base === undefined ? undefined : byName.get(raw.base);
    if (raw.base !== undefined && base === undefined) throw new Error(`corpus case ${raw.name}: base ${raw.base} comes later or is missing`);
    const entry = base === undefined ? raw.entry : base.entry;
    if (!isEntry(entry)) throw new Error(`corpus case ${raw.name}: unknown entry`);
    const patch = raw.patch;
    if ((base === undefined) !== (patch === undefined)) throw new Error(`corpus case ${raw.name}: a base goes with a patch`);
    const value = base === undefined || patch === undefined ? raw.value : patch.reduce<unknown>((document, operation) => apply(document, operation), base.value);
    const expect: Expectation = typeof raw.expect === 'string' ? (raw.expect === 'valid' ? 'valid' : 'schema') : [...raw.expect].sort();
    byName.set(raw.name, { name: raw.name, entry, value, expect });
  }
  return { cases: [...byName.values()], pairs: corpusSource.pairs as unknown as readonly CorpusPair[] };
}

export const CORPUS = load();
