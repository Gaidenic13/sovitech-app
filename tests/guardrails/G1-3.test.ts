/**
 * G1-3 (docs/guardrails.md section 7; rule 1, "Identifiers and prices: SAUTER model
 * numbers, product names and product lines ... come only from reference data"; gate
 * `dataset-sauter-catalogue`: "No SAUTER product line, product or model name anywhere";
 * F-EXTRACT-05: "SAUTER model numbers and product names not in the approved catalogue are
 * rejected and flagged").
 * Situation: AI output names a SAUTER model number not in the catalogue.
 * Expected: rejected, and flagged for the engineer.
 *
 * The model number here is synthetic ("TQZ 918"): no product name from company/ or any
 * catalogue is written in the repository (G1-12, G2-5). No catalogue is approved, so the
 * case runs first as the app runs today (no catalogue), then against a TEST catalogue that
 * lists other products, and a control where the TEST catalogue lists this one.
 */
import {
  buildExtractionContext,
  readExtractionResponse,
  validateExtractionOutput,
  type AiCandidate,
  type ExtractionValidationContext,
  type ModelResponse,
  type ProductCatalogue,
} from '@sovitech/ai';
import { describe, expect, test } from 'vitest';

const PROJECT = 'test-project-g1-3';
const HASH = `sha256:${'3'.repeat(64)}`;
const EXCERPT = 'TEST Automatizare existenta: controler SAUTER TQZ 918';

const built = buildExtractionContext({
  project: { id: PROJECT, demo: false },
  documents: [{ projectId: PROJECT, documentId: 'test-doc-g1-3', contentHash: HASH, name: 'TEST BMS existent.pdf', blocks: [{ locator: { page: 1 }, text: EXCERPT }] }],
  fields: [{ key: 'TEST.asset.controller_model', label: 'TEST existing controller model', subject: 'asset', kind: 'text' }],
});

function contextWith(catalogue?: ProductCatalogue): ExtractionValidationContext {
  return {
    projectId: PROJECT,
    fields: built.fields,
    documents: built.documents,
    units: built.units,
    names: built.names,
    ...(catalogue === undefined ? {} : { catalogue }),
  };
}

const modelNumber: AiCandidate = {
  fieldKey: 'TEST.asset.controller_model',
  subject: { kind: 'asset', ref: 'TA-01' },
  value: { kind: 'text', text: 'SAUTER TQZ 918' },
  original: { text: 'SAUTER TQZ 918', locale: 'ro' },
  source: 'document',
  inference: null,
  confidence: null,
  evidence: [{ documentId: 'test-doc-g1-3', contentHash: HASH, locator: { page: 1, sheet: null, cell: null }, excerpt: EXCERPT }],
};

const output = { candidates: [modelNumber], notFound: [], missingFieldKeys: [], findings: [], notes: [] };

function expectRejectedAndFlagged(context: ExtractionValidationContext): void {
  const result = validateExtractionOutput(output, context);
  // Rejected: no candidate reaches the verifier.
  expect(result.accepted.candidates).toEqual([]);
  expect(result.rejections).toEqual([{ item: { kind: 'candidate', index: 0, fieldKey: 'TEST.asset.controller_model' }, rules: ['product_not_in_catalogue'] }]);
  // Flagged for the engineer, with where the documents show it and no text.
  expect(result.engineerFlags).toEqual([
    {
      kind: 'catalogue_identifier_not_in_catalogue',
      fieldKey: 'TEST.asset.controller_model',
      subject: { kind: 'asset', ref: 'TA-01' },
      locations: [{ documentId: 'test-doc-g1-3', locator: { page: 1, sheet: null, cell: null } }],
    },
  ]);
  expect(result.guardrailEvents).toEqual([{ type: 'ai_output_rejected', projectId: PROJECT, fieldKey: 'TEST.asset.controller_model', reason: 'product_not_in_catalogue' }]);
  expect(JSON.stringify([result.rejections, result.engineerFlags, result.guardrailEvents])).not.toContain('TQZ');
}

describe('G1-3: a SAUTER model number not in the catalogue', () => {
  test('F-EXTRACT-05 · G1-3: with no approved catalogue (the gate closed), the model number is rejected and flagged for the engineer', () => {
    expectRejectedAndFlagged(contextWith());
  });

  test('F-EXTRACT-05 · G1-3: against a TEST catalogue that lists other products, it is rejected and flagged', () => {
    expectRejectedAndFlagged(contextWith({ dataset: 'TEST-catalogue', version: 'TEST-1', ids: new Set(['TEST-P1']), names: ['TQZ 100', 'Zentrix'] }));
  });

  test('F-EXTRACT-05 · G1-3: through the boundary reading of a response, the same', () => {
    const response: ModelResponse = { model: 'TEST-model', receivedAt: '2026-09-26T10:00:00.000Z', stopReason: 'end_turn', output };
    const reading = readExtractionResponse(response, contextWith(), 'TEST-model');
    expect(reading.usable).toBe(true);
    if (!reading.usable) return;
    expect(reading.validation.accepted.candidates).toEqual([]);
    expect(reading.validation.engineerFlags).toHaveLength(1);
  });

  test('F-PROPOSAL-04 · G1-3: in AI prose the model number is rejected too', () => {
    const note = { audience: 'engineer' as const, text: 'The existing controller is a SAUTER TQZ 918.', wouldChange: null, locations: [] };
    const result = validateExtractionOutput({ ...output, candidates: [], notes: [note] }, contextWith());
    expect(result.accepted.notes).toEqual([]);
    expect([...(result.rejections[0]?.rules ?? [])].sort()).toEqual(['digit_outside_token', 'product_name_outside_token']);
  });

  test('F-EXTRACT-05 · G1-3 (control): a model number the catalogue lists is not refused on that ground', () => {
    const result = validateExtractionOutput(output, contextWith({ dataset: 'TEST-catalogue', version: 'TEST-1', ids: new Set(['TEST-P2']), names: ['TQZ 918'] }));
    expect(result.rejections).toEqual([]);
    expect(result.engineerFlags).toEqual([]);
    expect(result.accepted.candidates).toEqual([modelNumber]);
  });
});
