/**
 * Generates every derived file of the contract from the one JSON Schema source
 * (src/extraction-contract.schema.json):
 *
 * - src/generated/zod.ts and src/generated/annotations.ts (TypeScript);
 * - services/extractor/src/sovitech_extractor/contract/_generated.py (the
 *   dataclasses) and schema.json beside it (a byte copy of the source, which the
 *   Python validator reads; the extractor image copies only services/extractor/src).
 *
 * The drift test (generate.test.ts) regenerates in memory and fails on any
 * difference with the committed files, so the two languages cannot drift apart.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import schemaSource from '../extraction-contract.schema.json' with { type: 'json' };
import { emitAnnotations, emitZod } from './emit-zod';
import { emitPython } from './emit-python';
import { loadContractSchema, type ContractSchema } from './subset';

/** The repository root, four folders up from this file. */
export const REPO_ROOT: string = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

/** Paths from the repository root. */
export const CONTRACT_PATHS = {
  source: 'packages/extraction-contract/src/extraction-contract.schema.json',
  zod: 'packages/extraction-contract/src/generated/zod.ts',
  annotations: 'packages/extraction-contract/src/generated/annotations.ts',
  python: 'services/extractor/src/sovitech_extractor/contract/_generated.py',
  pythonSchema: 'services/extractor/src/sovitech_extractor/contract/schema.json',
} as const;

/** The loaded source schema (throws SchemaSubsetError on anything outside the subset). */
export function contractSchema(): ContractSchema {
  return loadContractSchema(schemaSource);
}

/** Every generated file, by path from the repository root, as the generator writes it now. */
export function generateContractFiles(root: string = REPO_ROOT): ReadonlyMap<string, string> {
  const schema = contractSchema();
  return new Map([
    [CONTRACT_PATHS.zod, emitZod(schema)],
    [CONTRACT_PATHS.annotations, emitAnnotations(schema)],
    [CONTRACT_PATHS.python, emitPython(schema)],
    [CONTRACT_PATHS.pythonSchema, readFileSync(join(root, CONTRACT_PATHS.source), 'utf8')],
  ]);
}
