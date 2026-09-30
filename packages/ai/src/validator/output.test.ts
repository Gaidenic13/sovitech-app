/**
 * The output validator on whole outputs: the schema, item by item, and the guardrail
 * events. Hand-built outputs, which carry no model id (prompt 3 phase 2: hand-built
 * structured outputs for tests live in the test files and never feed the seed).
 */
import { describe, expect, it } from 'vitest';
import { buildExtractionContext, type FieldForAi } from '../context';
import type { AiCandidate, ExtractionOutput } from '../schema';
import { validateDraftingOutput, validateExtractionOutput, type ExtractionValidationContext } from './output';

const HASH = `sha256:${'d'.repeat(64)}`;
const PROJECT = 'test-project-validator';
const FIELDS: FieldForAi[] = [
  { key: 'TEST.asset.type', label: 'TEST asset type', subject: 'asset', kind: 'enum', options: ['ahu', 'fcu'] },
  { key: 'TEST.asset.count', label: 'TEST fan coil count', subject: 'building', kind: 'count', unit: 'count', qualifiers: ['fan_coil_units'] },
  { key: 'TEST.asset.capacity', label: 'TEST cooling capacity', subject: 'asset', kind: 'quantity', unit: 'kW', qualifiers: ['cooling_output'] },
  { key: 'TEST.asset.interface', label: 'TEST interface', subject: 'asset', kind: 'text' },
];

const context: ExtractionValidationContext = (() => {
  const built = buildExtractionContext({
    project: { id: PROJECT, demo: false },
    documents: [
      {
        projectId: PROJECT,
        documentId: 'test-doc-schedule',
        contentHash: HASH,
        name: 'TEST schedule.pdf',
        blocks: [
          { locator: { page: 1 }, text: 'TEST CTA-01 centrala de tratare aer' },
          { locator: { page: 2 }, text: 'TEST white text', hidden: true },
        ],
      },
    ],
    fields: FIELDS,
  });
  return { projectId: PROJECT, fields: built.fields, documents: built.documents, units: built.units, names: built.names };
})();

const evidence = (page: number, excerpt = 'TEST CTA-01 centrala de tratare aer') => ({
  documentId: 'test-doc-schedule',
  contentHash: HASH,
  locator: { page, sheet: null, cell: null },
  excerpt,
});

function candidate(overrides: Partial<AiCandidate> = {}): AiCandidate {
  return {
    fieldKey: 'TEST.asset.type',
    subject: { kind: 'asset', ref: 'CTA-01' },
    value: { kind: 'choice', choice: 'ahu' },
    original: null,
    source: 'ai_inference',
    inference: 'type_from_text',
    confidence: 'high',
    evidence: [evidence(1)],
    ...overrides,
  };
}

function output(overrides: Partial<ExtractionOutput> = {}): ExtractionOutput {
  return { candidates: [], notFound: [], missingFieldKeys: [], findings: [], notes: [], ...overrides };
}

const rulesOf = (raw: unknown) => validateExtractionOutput(raw, context).rejections.map((rejection) => rejection.rules);

describe('validateExtractionOutput', () => {
  it('F-EXTRACT-03: accepts a well-formed inference with evidence in a block that was sent', () => {
    const result = validateExtractionOutput(output({ candidates: [candidate()] }), context);
    expect(result.rejections).toEqual([]);
    expect(result.accepted.candidates).toHaveLength(1);
    expect(result.guardrailEvents).toEqual([]);
  });

  it('F-EXTRACT-03 · rule 13: refuses an output that fails the schema, naming paths and never values', () => {
    const result = validateExtractionOutput({ ...output(), candidates: [{ ...candidate(), source: 'calculated' }] }, context);
    expect(result.output).toBeUndefined();
    expect(result.rejections).toEqual([{ item: { kind: 'output' }, rules: ['schema'], schemaPaths: ['candidates.0.source'] }]);
    expect(result.guardrailEvents).toEqual([{ type: 'ai_output_rejected', projectId: PROJECT, reason: 'schema' }]);
  });

  it('F-EXTRACT-03 · rule 14: refuses evidence outside the request, in hidden text, or missing', () => {
    expect(rulesOf(output({ candidates: [candidate({ evidence: [evidence(9)] })] }))).toEqual([['evidence_outside_request']]);
    expect(rulesOf(output({ candidates: [candidate({ evidence: [{ ...evidence(1), contentHash: `sha256:${'e'.repeat(64)}` }] })] }))).toEqual([
      ['evidence_outside_request'],
    ]);
    expect(rulesOf(output({ candidates: [candidate({ evidence: [evidence(2, 'TEST white text')] })] }))).toEqual([['evidence_in_hidden_text']]);
    expect(rulesOf(output({ candidates: [candidate({ evidence: [] })] }))).toEqual([['no_evidence']]);
  });

  it('F-EXTRACT-05 · rule 1: refuses an inferred quantity that is not a direct count, and passes a direct count', () => {
    const capacity = candidate({
      fieldKey: 'TEST.asset.capacity',
      value: { kind: 'quantity', quantity: { value: 777, unit: 'kW', qualifier: 'cooling_output', approximate: false }, alternatives: [] },
      inference: 'classification',
    });
    expect(rulesOf(output({ candidates: [capacity] }))).toEqual([['inferred_quantity_not_direct_count']]);
    const count = candidate({
      fieldKey: 'TEST.asset.count',
      subject: { kind: 'building', ref: null },
      value: { kind: 'quantity', quantity: { value: 9, unit: 'count', qualifier: 'fan_coil_units', approximate: false }, alternatives: [] },
      inference: 'direct_count',
    });
    expect(rulesOf(output({ candidates: [count] }))).toEqual([]);
    const partial = candidate({ ...count, value: { kind: 'quantity', quantity: { value: 9.5, unit: 'count', qualifier: 'fan_coil_units', approximate: false }, alternatives: [] } });
    expect(rulesOf(output({ candidates: [partial] }))).toEqual([['inferred_quantity_not_direct_count']]);
  });

  it('F-EXTRACT-03 · F-REGISTRY-02: refuses fields not requested, wrong subjects, choices outside the options and unregistered units', () => {
    expect(rulesOf(output({ candidates: [candidate({ fieldKey: 'TEST.other' })] }))).toEqual([['field_not_requested']]);
    expect(rulesOf(output({ candidates: [candidate({ subject: { kind: 'building', ref: null } })] }))).toEqual([['subject_kind_mismatch']]);
    expect(rulesOf(output({ candidates: [candidate({ value: { kind: 'choice', choice: 'maybe' } })] }))).toEqual([['choice_not_in_options']]);
    const unit = candidate({
      fieldKey: 'TEST.asset.capacity',
      source: 'document',
      inference: null,
      value: { kind: 'quantity', quantity: { value: 777, unit: 'TEST-unit', qualifier: 'cooling_output', approximate: false }, alternatives: [] },
    });
    expect(rulesOf(output({ candidates: [unit] }))).toEqual([['unit_not_registered']]);
  });

  it('F-EXTRACT-05 · rule 3: refuses a document candidate carrying an inference, and an inference without its kind or confidence', () => {
    expect(rulesOf(output({ candidates: [candidate({ source: 'document' })] }))).toEqual([['inference_on_document']]);
    expect(rulesOf(output({ candidates: [candidate({ inference: null, confidence: null })] }))).toEqual([['inference_kind_missing', 'confidence_missing']]);
  });

  it('F-EXTRACT-03 · F-PROPOSAL-04: holds AI-written text values to the prose rules, and leaves document text values verbatim', () => {
    const inferred = candidate({ fieldKey: 'TEST.asset.interface', value: { kind: 'text', text: 'Verified BMS interface' } });
    expect(rulesOf(output({ candidates: [inferred] }))).toEqual([['reserved_term']]);
    const read = candidate({ fieldKey: 'TEST.asset.interface', source: 'document', inference: null, value: { kind: 'text', text: 'TEST conform 99' } });
    expect(rulesOf(output({ candidates: [read] }))).toEqual([]);
  });

  it('F-EXTRACT-03 · rule 12: checks not-found answers, missing keys, findings and notes against the request', () => {
    const result = validateExtractionOutput(
      output({
        notFound: [
          { fieldKey: 'TEST.asset.capacity', subject: null, searched: [{ documentId: 'test-doc-schedule', locators: [{ page: 1, sheet: null, cell: null }] }] },
          { fieldKey: 'TEST.asset.interface', subject: null, searched: [] },
          { fieldKey: 'TEST.asset.type', subject: null, searched: [{ documentId: 'test-doc-other', locators: [] }] },
        ],
        missingFieldKeys: ['TEST.asset.capacity', 'TEST.unknown'],
        findings: [
          { kind: 'embedded_instruction', documentId: 'test-doc-schedule', locator: { page: 1, sheet: null, cell: null } },
          { kind: 'hidden_text', documentId: 'test-doc-schedule', locator: { page: 7, sheet: null, cell: null } },
        ],
        notes: [
          { audience: 'engineer', text: 'The schedule names the unit type in words.', wouldChange: null, locations: [] },
          { audience: 'sovitech_team', text: 'Ask about page 7?', wouldChange: null, locations: [] },
        ],
      }),
      context,
    );
    expect(result.accepted.notFound.map((answer) => answer.fieldKey)).toEqual(['TEST.asset.capacity']);
    expect(result.accepted.missingFieldKeys).toEqual(['TEST.asset.capacity']);
    expect(result.accepted.findings.map((finding) => finding.kind)).toEqual(['embedded_instruction']);
    expect(result.accepted.notes).toHaveLength(1);
    expect(result.rejections.map((rejection) => [rejection.item.kind, rejection.rules])).toEqual([
      ['not_found', ['nothing_searched']],
      ['not_found', ['searched_outside_request']],
      ['missing_field_key', ['field_not_requested']],
      ['finding', ['finding_outside_request']],
      ['note', ['digit_outside_token', 'question_text']],
    ]);
    expect(result.guardrailEvents.filter((event) => event.type === 'embedded_instruction')).toEqual([
      { type: 'embedded_instruction', projectId: PROJECT, reason: 'embedded_instruction' },
    ]);
  });

  it('F-EXTRACT-03 · rule 12: refuses a not-found answer for a subject the same output answered', () => {
    const result = validateExtractionOutput(
      output({
        candidates: [candidate()],
        notFound: [{ fieldKey: 'TEST.asset.type', subject: { kind: 'asset', ref: 'CTA-01' }, searched: [{ documentId: 'test-doc-schedule', locators: [] }] }],
      }),
      context,
    );
    expect(result.rejections.map((rejection) => rejection.rules)).toEqual([['not_found_with_candidate']]);
  });

  it('F-EXTRACT-03 · F-AUDIT-01 · rule 13: logs rejections with codes and field keys only, and a reserved-term block where one fired', () => {
    const inferred = candidate({ fieldKey: 'TEST.asset.interface', value: { kind: 'text', text: 'TEST final interface' } });
    const events = validateExtractionOutput(output({ candidates: [inferred] }), context).guardrailEvents;
    expect(events).toEqual([
      { type: 'ai_output_rejected', projectId: PROJECT, fieldKey: 'TEST.asset.interface', reason: 'reserved_term' },
      { type: 'reserved_term_blocked', projectId: PROJECT, fieldKey: 'TEST.asset.interface', reason: 'reserved_term' },
    ]);
    expect(JSON.stringify(events)).not.toContain('TEST final interface');
  });
});

describe('validateDraftingOutput', () => {
  const drafting = { projectId: PROJECT, slots: new Set(['scope']), tokens: new Set(['{{value:TEST.area}}']), names: [] };

  it('F-PROPOSAL-03 · F-PROPOSAL-04: accepts a paragraph with its tokens and refuses slots not asked for, twice, or with prose issues', () => {
    const result = validateDraftingOutput(
      {
        paragraphs: [
          { slot: 'scope', text: 'The building area is {{value:TEST.area}}.' },
          { slot: 'scope', text: 'Again.' },
          { slot: 'other', text: 'The area is 7,777 m².' },
        ],
        notes: [],
      },
      drafting,
    );
    expect(result.accepted.paragraphs).toEqual([{ slot: 'scope', text: 'The building area is {{value:TEST.area}}.' }]);
    expect(result.rejections.map((rejection) => rejection.rules)).toEqual([['slot_twice'], ['slot_not_requested', 'digit_outside_token']]);
  });

  it('F-EXTRACT-03 · rule 2: refuses tokens in notes: notes carry no figure', () => {
    const result = validateDraftingOutput(
      { paragraphs: [], notes: [{ audience: 'engineer', text: 'The area is {{value:TEST.area}}.', wouldChange: null, locations: [] }] },
      drafting,
    );
    expect(result.rejections.map((rejection) => rejection.rules)).toEqual([['unknown_token']]);
  });
});

// Found while fixing the phase 2 review's prose findings: a rejection with two rules (a
// homoglyph gives "reserved_term" and "mixed_script") was logged with the reason
// "mixed_script+reserved_term", which the store's reason check (migration 0005) refuses,
// so the whole AI step's transaction, events included, would fail.
describe('the guardrail events of a rejection', () => {
  it('F-EXTRACT-03 · F-AUDIT-01: logs one ai_output_rejected event per rule, each reason one code the store takes', () => {
    const result = validateDraftingOutput(
      { paragraphs: [{ slot: 'TEST.slot', text: 'The capacity is v\u0435rified at 7,777 m².' }], notes: [] },
      { projectId: PROJECT, slots: new Set(['TEST.slot']), tokens: new Set(), names: [] },
    );
    expect(result.rejections[0]?.rules).toEqual(['reserved_term', 'mixed_script', 'digit_outside_token']);
    expect(result.guardrailEvents.filter((event) => event.type === 'ai_output_rejected').map((event) => event.reason)).toEqual(['reserved_term', 'mixed_script', 'digit_outside_token']);
    expect(result.guardrailEvents).toContainEqual({ type: 'reserved_term_blocked', projectId: PROJECT, reason: 'reserved_term' });
    for (const event of result.guardrailEvents) expect(event.reason ?? '').toMatch(/^[a-z0-9][a-z0-9_.:-]{0,127}$/u);
  });
});
