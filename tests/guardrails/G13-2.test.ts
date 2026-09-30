/**
 * G13-2 (docs/guardrails.md section 7; rule 13, "Project boundary: The AI context for one
 * project never contains another project's documents or values"; "Enforced by: Context
 * building. AI context is built per project"; F-EXTRACT-02).
 * Situation: AI context built for project B.
 * Expected: contains nothing from project A.
 *
 * The context builder is the boundary's own check behind the store's row-level security
 * (G13-5): anything of project A handed to project B's request refuses the whole request
 * before anything is built or sent.
 */
import fc from 'fast-check';
import { REPO_ROOT, productionGateSource } from '@sovitech/registry/gates';
import {
  CrossProjectContextError,
  buildDraftingContext,
  buildExtractionContext,
  loadFixtureManifest,
  loadSystemPrompt,
  runExtraction,
  type DocumentForAi,
  type FieldForAi,
} from '@sovitech/ai';
import { describe, expect, test, vi } from 'vitest';

const A = 'test-project-g13-2-a';
const B = 'test-project-g13-2-b';
const FIELDS: FieldForAi[] = [{ key: 'TEST.building.rooms', label: 'TEST guest rooms', subject: 'building', kind: 'count', unit: 'count' }];

function documentOf(project: string, index: number): DocumentForAi {
  return {
    projectId: project,
    documentId: `test-doc-${project}-${index}`,
    contentHash: `sha256:${(project === A ? 'a' : 'b').repeat(63)}${index % 10}`,
    name: `TEST ${project} file ${index}.pdf`,
    blocks: [{ locator: { page: 1 }, text: `TEST text of ${project}, document ${index}` }],
  };
}

describe('G13-2: the AI context for project B', () => {
  test("F-EXTRACT-02 · G13-2: built from project B's documents, it holds nothing of project A", () => {
    const context = buildExtractionContext({ project: { id: B, demo: false }, documents: [documentOf(B, 1), documentOf(B, 2)], fields: FIELDS });
    const sent = context.content.join('\n');
    expect(sent).toContain(`TEST text of ${B}, document 1`);
    expect(sent).not.toContain(A);
    expect(sent).not.toContain('a'.repeat(63));
    expect(context.coverage.map((entry) => entry.documentId)).toEqual([`test-doc-${B}-1`, `test-doc-${B}-2`]);
    expect(context.routeItems.every((item) => item.kind !== 'document' || item.projectId === B)).toBe(true);
  });

  test("F-EXTRACT-02 · G13-2: a project A document, owner text, token or fact handed to B's request refuses it, naming ids only", () => {
    const documentText = `TEST text of ${A}, document 1`;
    let refusal: unknown;
    try {
      buildExtractionContext({ project: { id: B, demo: false }, documents: [documentOf(B, 1), documentOf(A, 1)], fields: FIELDS });
    } catch (error) {
      refusal = error;
    }
    expect(refusal).toBeInstanceOf(CrossProjectContextError);
    expect((refusal as CrossProjectContextError).foreign).toEqual([{ kind: 'document', id: `test-doc-${A}-1`, projectId: A }]);
    expect((refusal as Error).message).not.toContain(documentText);

    expect(() =>
      buildExtractionContext({
        project: { id: B, demo: true },
        documents: [documentOf(B, 1)],
        fields: FIELDS,
        ownerTexts: [{ projectId: A, key: 'step5.notes', text: 'TEST owner note of project A' }],
      }),
    ).toThrow(CrossProjectContextError);
    expect(() =>
      buildDraftingContext({
        project: { id: B, demo: true },
        slots: [{ id: 'scope', purpose: 'TEST' }],
        tokens: [{ projectId: A, token: '{{value:TEST.rooms}}', label: 'TEST rooms', badge: null, status: [] }],
        facts: [],
        provenance: { kind: 'project' },
      }),
    ).toThrow(CrossProjectContextError);
    expect(() =>
      buildDraftingContext({
        project: { id: B, demo: true },
        slots: [{ id: 'scope', purpose: 'TEST' }],
        tokens: [],
        facts: [{ projectId: A, text: 'TEST fact of project A' }],
        provenance: { kind: 'project' },
      }),
    ).toThrow(CrossProjectContextError);
  });

  test('F-EXTRACT-02 · G13-2 (property): for any mix of documents, a context built for B holds nothing of A, or none is built', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.constantFrom(A, B), fc.integer({ min: 1, max: 9 })), { minLength: 1, maxLength: 6 }), (picks) => {
        const documents = [...new Map(picks.map(([project, index]) => [`${project}-${index}`, documentOf(project, index)])).values()];
        const hasA = documents.some((document) => document.projectId === A);
        if (hasA) {
          expect(() => buildExtractionContext({ project: { id: B, demo: false }, documents, fields: FIELDS })).toThrow(CrossProjectContextError);
        } else {
          const sent = buildExtractionContext({ project: { id: B, demo: false }, documents, fields: FIELDS }).content.join('\n');
          expect(sent).not.toContain(A);
        }
      }),
    );
  });

  test('F-EXTRACT-02 · G13-2: through the boundary, the request is refused before any call', async () => {
    const transport = vi.fn();
    const deps = {
      transport,
      gates: productionGateSource(),
      manifest: loadFixtureManifest(REPO_ROOT),
      systemPrompt: loadSystemPrompt(REPO_ROOT),
      root: REPO_ROOT,
      log: vi.fn(),
    };
    await expect(runExtraction({ project: { id: B, demo: false }, documents: [documentOf(A, 1)], fields: FIELDS }, deps)).rejects.toThrow(CrossProjectContextError);
    expect(transport).not.toHaveBeenCalled();
  });
});
