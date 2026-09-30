/**
 * G2-4 (docs/guardrails.md section 7; rule 2, "The schema. The AI output schema accepts
 * only the sources `document` and `ai_inference`"; 2.1, "The AI can only ever produce
 * `document` or `ai_inference` candidates"; F-EXTRACT-03).
 * Situation: AI output carries the source user, calculated, estimated or reference.
 * Expected: rejected by the schema.
 *
 * Two places hold the schema: the JSON schema sent with every request, which the API
 * applies, and the same schema checked again by the output validator on receipt.
 */
import { ExtractionOutputSchema, outputFormat, validateExtractionOutput, type AiCandidate } from '@sovitech/ai';
import { describe, expect, test } from 'vitest';

const PROJECT = 'test-project-g2-4';
const HASH = `sha256:${'4'.repeat(64)}`;

const candidate: AiCandidate = {
  fieldKey: 'TEST.building.gross_floor_area',
  subject: { kind: 'building', ref: null },
  value: { kind: 'quantity', quantity: { value: 7777, unit: 'm2', qualifier: 'gross_total', approximate: false }, alternatives: [] },
  original: { text: '7.777 mp', locale: 'ro' },
  source: 'document',
  inference: null,
  confidence: null,
  evidence: [{ documentId: 'test-doc-g2-4', contentHash: HASH, locator: { page: 1, sheet: null, cell: null }, excerpt: 'TEST Scd 7.777 mp' }],
};

const context = { projectId: PROJECT, fields: new Map(), documents: new Map(), units: new Set(['m2']), names: [] };

/** Every `source` property of a JSON schema, with the values it allows. */
function sourceValues(schema: unknown): unknown[] {
  const found: unknown[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (typeof node === 'object' && node !== null) {
      const properties = (node as { properties?: Record<string, { enum?: unknown }> }).properties;
      if (properties?.['source'] !== undefined) found.push(properties['source'].enum);
      Object.values(node).forEach(walk);
    }
  };
  walk(schema);
  return found;
}

describe('G2-4: a source the AI may not produce', () => {
  for (const source of ['user', 'calculated', 'estimated', 'reference']) {
    test(`F-EXTRACT-03 · G2-4: an output carrying the source ${source} is rejected by the schema`, () => {
      const raw = { candidates: [{ ...candidate, source }], notFound: [], missingFieldKeys: [], findings: [], notes: [] };
      expect(ExtractionOutputSchema.safeParse(raw).success).toBe(false);
      const result = validateExtractionOutput(raw, context);
      expect(result.output).toBeUndefined();
      expect(result.accepted.candidates).toEqual([]);
      expect(result.rejections).toEqual([{ item: { kind: 'output' }, rules: ['schema'], schemaPaths: ['candidates.0.source'] }]);
      expect(result.guardrailEvents).toEqual([{ type: 'ai_output_rejected', projectId: PROJECT, reason: 'schema' }]);
    });
  }

  test('F-EXTRACT-03 · G2-4: the schema sent with each request allows only document and ai_inference', () => {
    const values = sourceValues(outputFormat('extraction').schema);
    expect(values).toEqual([['document', 'ai_inference']]);
  });

  test('F-EXTRACT-03 · G2-4 (control): the same output with the source document passes the schema', () => {
    expect(ExtractionOutputSchema.safeParse({ candidates: [candidate], notFound: [], missingFieldKeys: [], findings: [], notes: [] }).success).toBe(true);
  });
});
