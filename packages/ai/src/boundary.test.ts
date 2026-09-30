/**
 * The boundary's call path: the route guard refuses before the call, the model id is
 * checked, retries never lead, and every proposal carries the model id the response named.
 *
 * The transport is a vi.fn() handed in as a dependency. Its hand-built responses name a
 * TEST model, never a real one, and are read with a TEST expected model id through the
 * run policy (prompt 3 phase 2: hand-built outputs carry no model id).
 */
import { REPO_ROOT, productionGateSource } from '@sovitech/registry/gates';
import { describe, expect, it, vi } from 'vitest';
import { APP_POLICY, GateClosedError, runDrafting, runExtraction, runExtractionWith, toCandidateProposal, type BoundaryDeps, type RunPolicy } from './boundary';
import { CrossProjectContextError, type ExtractionInput, type FieldForAi } from './context';
import { contentHashOf, loadFixtureManifest } from './guard';
import { loadSystemPrompt } from './prompt';
import type { AiCandidate, ExtractionOutput } from './schema';
import type { ModelRequest, ModelResponse } from './transport';

const manifest = loadFixtureManifest(REPO_ROOT);
const FIXTURE_HASH = `sha256:${[...manifest.hashes][0] ?? ''}`;
const PROJECT = { id: 'test-project-boundary', demo: false };
const TEST_MODEL = 'TEST-model-not-a-real-id';
const TEST_POLICY: RunPolicy = { testGlossary: false, maxAttempts: 2, expectedModelId: TEST_MODEL, fixtureProvenance: false };

const FIELDS: FieldForAi[] = [
  { key: 'TEST.asset.type', label: 'TEST asset type', subject: 'asset', kind: 'enum', options: ['ahu', 'fcu'] },
  { key: 'TEST.asset.interface', label: 'TEST interface', subject: 'asset', kind: 'text' },
];

function input(overrides: Partial<ExtractionInput> = {}): ExtractionInput {
  return {
    project: PROJECT,
    documents: [
      {
        projectId: PROJECT.id,
        documentId: 'test-doc-boundary',
        contentHash: FIXTURE_HASH,
        // While ai-processor-route is closed a document carries a code-set name (guard.ts, nameForModel).
        name: 'test-doc-boundary',
        blocks: [{ locator: { page: 1 }, text: 'TEST CTA-01 centrala de tratare aer, compatibil BMS' }],
      },
    ],
    fields: FIELDS,
    ...overrides,
  };
}

function deps(transport: BoundaryDeps['transport'], log = vi.fn()): BoundaryDeps {
  return { transport, gates: productionGateSource(), manifest, systemPrompt: loadSystemPrompt(REPO_ROOT), root: REPO_ROOT, log };
}

const evidence = [{ documentId: 'test-doc-boundary', contentHash: FIXTURE_HASH, locator: { page: 1, sheet: null, cell: null }, excerpt: 'TEST CTA-01' }];

function typeCandidate(): AiCandidate {
  return {
    fieldKey: 'TEST.asset.type',
    subject: { kind: 'asset', ref: 'CTA-01' },
    value: { kind: 'choice', choice: 'ahu' },
    original: null,
    source: 'ai_inference',
    inference: 'type_from_text',
    confidence: 'high',
    evidence,
  };
}

function interfaceCandidate(text: string): AiCandidate {
  return { ...typeCandidate(), fieldKey: 'TEST.asset.interface', value: { kind: 'text', text }, inference: 'classification' };
}

function response(output: Partial<ExtractionOutput>, model = TEST_MODEL): ModelResponse {
  return {
    model,
    receivedAt: '2026-09-26T10:00:00.000Z',
    stopReason: 'end_turn',
    output: { candidates: [], notFound: [], missingFieldKeys: [], findings: [], notes: [], ...output },
  };
}

describe('the route guard runs before the call', () => {
  it('US-ADMIN-17 · F-EXTRACT-02 · prompt 3 5.4: refuses a document the manifest does not list, calls nothing, and logs codes and ids only', async () => {
    const transport = vi.fn();
    const log = vi.fn();
    const text = 'TEST owner text that must never be logged';
    const owner = input({
      documents: [{ projectId: PROJECT.id, documentId: 'test-doc-owner', contentHash: contentHashOf(text), name: 'TEST.pdf', blocks: [{ locator: { page: 1 }, text }] }],
    });
    const run = await runExtraction(owner, deps(transport, log));
    expect(run).toEqual({ outcome: 'refused', refusals: [{ code: 'document_not_fixture', documentId: 'test-doc-owner' }] });
    expect(transport).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith({
      event: 'ai_route_refused',
      task: 'extract',
      projectId: PROJECT.id,
      codes: ['document_not_fixture'],
      documentIds: ['test-doc-owner'],
      paths: [],
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain(text);
  });

  // Phase 2 review, adversarial finding "the owner-typed file name reaches the model while the gate is closed".
  it("US-ADMIN-17 · F-EXTRACT-02 · prompt 3 5.4: refuses a fixture document that carries the owner's typed name on a project that is not the demo, before any call", async () => {
    const transport = vi.fn();
    const log = vi.fn();
    const typed = input({ documents: [{ ...input().documents[0]!, name: 'TEST owner typed name of a hotel.pdf' }] });
    const run = await runExtraction(typed, deps(transport, log));
    expect(run).toEqual({ outcome: 'refused', refusals: [{ code: 'document_name_not_fixture', documentId: 'test-doc-boundary' }] });
    expect(transport).not.toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain('TEST owner typed name');
    // On the demo project its text is demo-project text, which the gate lets through.
    transport.mockResolvedValue(response({}));
    const demo = await runExtractionWith({ ...typed, project: { ...PROJECT, demo: true } }, deps(transport), TEST_POLICY);
    expect(demo.outcome).toBe('completed');
  });

  it("US-ADMIN-04 · F-EXTRACT-02 · rule 13: refuses another project's document before building anything", async () => {
    const transport = vi.fn();
    const foreign = input({ documents: [{ ...input().documents[0]!, projectId: 'test-project-a' }] });
    await expect(runExtraction(foreign, deps(transport))).rejects.toThrow(CrossProjectContextError);
    expect(transport).not.toHaveBeenCalled();
  });

  it('US-ADMIN-18 · F-REGISTRY-04 · F-EXTRACT-02: refuses a glossary while the dataset-glossary gate is closed', async () => {
    const transport = vi.fn();
    const withGlossary = input({ glossary: { dataset: 'TEST-glossary', version: 'TEST-1', entries: [{ abbreviation: 'TST', expansion: 'TEST unit' }] } });
    await expect(runExtraction(withGlossary, deps(transport))).rejects.toThrow(GateClosedError);
    expect(transport).not.toHaveBeenCalled();
  });

  it('US-ADMIN-17 · F-PROPOSAL-03 · prompt 3 5.4: refuses, in the app, a drafting request that names a fixture file as its source', async () => {
    const transport = vi.fn();
    const drafting = runDrafting(
      {
        project: PROJECT,
        slots: [{ id: 'scope', purpose: 'TEST' }],
        tokens: [],
        facts: [{ projectId: PROJECT.id, text: 'TEST fact of a real project' }],
        provenance: { kind: 'fixture_file', path: [...manifest.files.keys()][0] ?? '', sha256: [...manifest.hashes][0] ?? '' },
      },
      deps(transport),
    );
    await expect(drafting).rejects.toThrow(GateClosedError);
    expect(transport).not.toHaveBeenCalled();
  });

  it('US-ADMIN-17 · F-PROPOSAL-03 · prompt 3 5.4: refuses drafting from a project that is not the demo project', async () => {
    const transport = vi.fn();
    const run = await runDrafting(
      { project: PROJECT, slots: [{ id: 'scope', purpose: 'TEST' }], tokens: [], facts: [{ projectId: PROJECT.id, text: 'TEST fact' }], provenance: { kind: 'project' } },
      deps(transport),
    );
    expect(run).toEqual({ outcome: 'refused', refusals: [{ code: 'project_not_demo', projectId: PROJECT.id }] });
    expect(transport).not.toHaveBeenCalled();
  });
});

describe('the model id', () => {
  it('F-EXTRACT-03: refuses a response that names another model than MODEL_ID, and asks again with the identical request', async () => {
    const transport = vi.fn(async (): Promise<ModelResponse> => response({ candidates: [typeCandidate()] }, TEST_MODEL));
    const run = await runExtraction(input(), deps(transport));
    expect(run.outcome).toBe('failed');
    if (run.outcome === 'failed') expect(run.problem).toBe('model_mismatch');
    expect(transport).toHaveBeenCalledTimes(APP_POLICY.maxAttempts);
    expect(transport.mock.calls[0]).toEqual(transport.mock.calls[1]);
  });

  it('F-EXTRACT-02 · F-EXTRACT-03: stores with every proposal the model id and time the response named', async () => {
    const transport = vi.fn(async (): Promise<ModelResponse> => response({ candidates: [typeCandidate()] }));
    const run = await runExtractionWith(input(), deps(transport), TEST_POLICY);
    expect(run.outcome).toBe('completed');
    if (run.outcome !== 'completed') return;
    expect(run.proposals).toEqual([{ candidate: typeCandidate(), modelId: TEST_MODEL, proposedAt: '2026-09-26T10:00:00.000Z', attempt: 1 }]);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('F-EXTRACT-03: gives nothing for a refusal or a cut-off output', async () => {
    const refusal = vi.fn(async (): Promise<ModelResponse> => ({ model: TEST_MODEL, receivedAt: '2026-09-26T10:00:00.000Z', stopReason: 'refusal', output: undefined, problem: 'refusal' }));
    const run = await runExtractionWith(input(), deps(refusal), { ...TEST_POLICY, maxAttempts: 1 });
    expect(run.outcome === 'failed' && run.problem).toBe('refusal');
  });
});

describe('retries never lead the model (rule 12)', () => {
  it('F-EXTRACT-02 · rule 12: asks again only for the refused field, with the same documents and instruction and no word of what failed', async () => {
    const replies = [
      response({ candidates: [typeCandidate(), interfaceCandidate('TEST verified interface')] }),
      response({ candidates: [interfaceCandidate('TEST unnamed interface')] }),
    ];
    const transport = vi.fn(async (): Promise<ModelResponse> => replies.shift() ?? response({}));
    const run = await runExtractionWith(input(), deps(transport), TEST_POLICY);
    expect(transport).toHaveBeenCalledTimes(2);
    const [first, second] = transport.mock.calls.map((call) => (call as unknown as [ModelRequest])[0]);
    const withoutNonce = (blocks: readonly string[] | undefined) => (blocks ?? []).map((block) => block.replaceAll(/_[0-9a-f]{16}\b/g, '_NONCE'));
    expect(first?.content.at(-1)).toBe(second?.content.at(-1));
    expect(withoutNonce(second?.content.slice(1, -1))).toEqual(withoutNonce(first?.content.slice(1, -1)));
    expect(second?.content[0]).toContain('TEST.asset.interface');
    expect(second?.content[0]).not.toContain('TEST.asset.type');
    const secondText = second?.content.join('\n') ?? '';
    expect(secondText).not.toContain('reserved');
    expect(secondText).not.toContain('verified interface');
    expect(run.outcome).toBe('completed');
    if (run.outcome !== 'completed') return;
    expect(run.proposals.map((proposal) => [proposal.candidate.fieldKey, proposal.attempt])).toEqual([
      ['TEST.asset.type', 1],
      ['TEST.asset.interface', 2],
    ]);
    expect(run.guardrailEvents.some((event) => event.reason === 'failed_validation_twice')).toBe(false);
  });

  it('F-EXTRACT-03 · F-AUDIT-01 · rule 12: leaves a field refused in both attempts unknown, with a failed_validation_twice event', async () => {
    const transport = vi.fn(async (): Promise<ModelResponse> => response({ candidates: [interfaceCandidate('TEST final interface')] }));
    const run = await runExtractionWith(input(), deps(transport), TEST_POLICY);
    expect(run.outcome).toBe('completed');
    if (run.outcome !== 'completed') return;
    expect(run.proposals).toEqual([]);
    expect(run.guardrailEvents).toContainEqual({ type: 'ai_output_rejected', projectId: PROJECT.id, fieldKey: 'TEST.asset.interface', reason: 'failed_validation_twice' });
  });
});

describe('toCandidateProposal', () => {
  it('F-EXTRACT-03 · F-EXTRACT-04: maps an accepted AI candidate to the verifier input, dropping nulls', () => {
    const proposal = toCandidateProposal({ candidate: typeCandidate(), modelId: TEST_MODEL, proposedAt: '2026-09-26T10:00:00.000Z', attempt: 1 }, 'test-subject-cta-01');
    expect(proposal).toEqual({
      subjectId: 'test-subject-cta-01',
      fieldKey: 'TEST.asset.type',
      choice: 'ahu',
      source: 'ai_inference',
      evidence: [{ documentId: 'test-doc-boundary', contentHash: FIXTURE_HASH, locator: { page: 1 }, excerpt: 'TEST CTA-01' }],
      confidence: 'high',
    });
  });

  it('F-EXTRACT-05 · rule 1: does not pass the kind of inference the model names, so the verifier refuses an inferred count cited to excerpts that hold digits (P-2-INFERENCE-KIND)', () => {
    const count: AiCandidate = { ...typeCandidate(), fieldKey: 'TEST.building.rooms', value: { kind: 'quantity', quantity: { value: 3, unit: 'count', qualifier: null, approximate: false }, alternatives: [] }, inference: 'direct_count' };
    expect(toCandidateProposal({ candidate: count, modelId: TEST_MODEL, proposedAt: '2026-09-26T10:00:00.000Z', attempt: 1 }, 'test-subject-building')).not.toHaveProperty('inference');
  });
});
