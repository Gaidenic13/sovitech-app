/**
 * One source, two languages: the committed zod schemas, the Python dataclasses
 * and the Python copy of the schema are exactly what the generator makes from
 * src/extraction-contract.schema.json today, and the loader refuses any keyword
 * one side would ignore.
 *
 * Ids: F-EXTRACT-01, F-EXTRACT-03 (the structured output reaches the API through a
 * schema checked by code), prompt 3 section 6 ("services/extractor" emits JSON).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import schemaSource from '../extraction-contract.schema.json' with { type: 'json' };
import { INVARIANT_IDS } from '../generated/annotations';
import { INVARIANTS } from '../invariants';
import { CONTRACT_PATHS, REPO_ROOT, contractSchema, generateContractFiles } from './generate';
import { SchemaSubsetError, camelCase, loadContractSchema, snakeCase } from './subset';

function withDef(name: string, def: unknown): unknown {
  const copy = structuredClone(schemaSource) as { $defs: Record<string, unknown> };
  copy.$defs[name] = def;
  return copy;
}

describe('F-EXTRACT-03: the generated files match the one schema source (drift test)', () => {
  it.each(Object.entries(CONTRACT_PATHS).filter(([key]) => key !== 'source'))(
    'F-EXTRACT-03: %s (%s) is what the generator writes now',
    (_key, path) => {
      const generated = generateContractFiles().get(path);
      expect(generated).toBeDefined();
      expect(readFileSync(join(REPO_ROOT, path), 'utf8')).toBe(generated);
    },
  );

  it('F-EXTRACT-03: the Python copy of the schema is the source, byte for byte', () => {
    expect(readFileSync(join(REPO_ROOT, CONTRACT_PATHS.pythonSchema))).toEqual(readFileSync(join(REPO_ROOT, CONTRACT_PATHS.source)));
  });

  it('F-EXTRACT-03: every invariant the schema names has exactly one TypeScript implementation', () => {
    expect(Object.keys(INVARIANTS).sort()).toEqual([...INVARIANT_IDS].sort());
    expect([...contractSchema().invariantIds].sort()).toEqual([...INVARIANT_IDS].sort());
  });

  it('F-EXTRACT-03: every object in the contract is closed, so an unknown key is refused in both languages', () => {
    const text = readFileSync(join(REPO_ROOT, CONTRACT_PATHS.zod), 'utf8');
    expect(text).not.toMatch(/z\.object\(|passthrough|catchall|looseObject/);
    const objects = contractSchema().defs.filter((def) => def.node.kind === 'object');
    expect(objects.length).toBeGreaterThan(40);
    for (const def of objects) expect(text).toContain(`export const ${def.name}Schema = ${def.invariants.length > 0 ? 'withInvariants(' : ''}z.strictObject(`);
  });

  it('F-EXTRACT-03 · prompt 3 section 6: no engineering value travels as a JSON number (numbers are pages, offsets, ids, counts and PDF coordinates)', () => {
    const numeric = new Set<string>();
    for (const def of contractSchema().defs) {
      const node = def.node;
      if (node.kind === 'integer' || node.kind === 'number') numeric.add(def.name);
      if (node.kind !== 'object') continue;
      for (const property of node.properties) {
        const kind = property.node.kind;
        if (kind === 'integer' || kind === 'number') numeric.add(`${def.name}.${property.key}`);
      }
    }
    expect([...numeric].sort()).toEqual(
      [
        'CharBox.end',
        'CharBox.start',
        'Coordinate',
        'IdsSpecResult.applicable',
        'IdsSpecResult.failed',
        'IdsSpecResult.passed',
        'Limits.maxCellsPerSheet',
        'Limits.maxPages',
        'Limits.wallClockSeconds',
        'PageNumber',
        'PartlyAnalysedStatus.read',
        'PartlyAnalysedStatus.total',
        'PdfPage.rotation',
        'StepId',
      ].sort(),
    );
  });
});

describe('F-EXTRACT-03: the loader refuses what one language would ignore', () => {
  it.each([
    ['an open object', { type: 'object', properties: {}, required: [], additionalProperties: true }],
    ['an object without additionalProperties', { type: 'object', properties: {}, required: [] }],
    ['an object without a required list', { type: 'object', properties: {}, additionalProperties: false }],
    ['a format keyword', { type: 'string', format: 'uuid' }],
    ['an unanchored pattern', { type: 'string', pattern: '[0-9]+' }],
    ['a \\d class', { type: 'string', pattern: '^\\d+$' }],
    ['a multipleOf', { type: 'number', multipleOf: 0.5 }],
    ['a null type', { type: 'null' }],
    ['a type list', { type: ['string', 'null'] }],
    ['allOf', { allOf: [{ $ref: '#/$defs/Uuid' }] }],
    ['a oneOf of inline schemas', { oneOf: [{ type: 'string' }, { type: 'integer' }] }],
    ['uniqueItems on objects', { type: 'array', items: { $ref: '#/$defs/Job' }, uniqueItems: true }],
    ['a $ref outside $defs', { $ref: 'https://example.invalid/schema.json' }],
    ['a snake_case property', { type: 'object', properties: { content_hash: { type: 'string' } }, required: [], additionalProperties: false }],
    ['a property that is a Python keyword', { type: 'object', properties: { from: { type: 'string' } }, required: [], additionalProperties: false }],
  ])('F-EXTRACT-03: %s is refused', (_label, def) => {
    expect(() => loadContractSchema(withDef('ProbeDef', def))).toThrow(SchemaSubsetError);
  });

  it('F-EXTRACT-03: a discriminated oneOf whose branch lacks the discriminator as a const is refused', () => {
    const schema = withDef('ProbeUnion', { oneOf: [{ $ref: '#/$defs/Job' }, { $ref: '#/$defs/AnalysedStatus' }], discriminator: { propertyName: 'status' } });
    expect(() => loadContractSchema(schema)).toThrow(/discriminator/);
  });

  it('F-EXTRACT-03: camelCase keys survive the snake_case round trip the Python side uses', () => {
    for (const key of ['contentHash', 'ifcProjectGlobalId', 'stepIds', 'sha256', 'maxCellsPerSheet']) {
      expect(camelCase(snakeCase(key))).toBe(key);
    }
  });
});
