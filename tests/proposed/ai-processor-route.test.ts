/**
 * Proposed behaviour, not indexed (prompt 3 section 5.4): the `ai-processor-route` gate
 * open. It waits for build-readiness decision 2 (the AI processor route, D-09), the
 * owner's decision, recorded with its date and words. While it is closed the boundary
 * sends fixture content only (packages/ai/src/guard.ts; its unit tests run the closed
 * behaviour in the blocking suite). Opened by the test-utils override only.
 */
import { REPO_ROOT, productionGateSource } from '@sovitech/registry/gates';
import { openGateForTest } from '@sovitech/registry/test-utils';
import { checkProcessorRoute, contentHashOf, loadFixtureManifest } from '@sovitech/ai';
import { describe, expect, it } from 'vitest';

const manifest = loadFixtureManifest(REPO_ROOT);
const PROJECT = { id: 'test-project-route-open', demo: false };
const document = { kind: 'document' as const, projectId: PROJECT.id, documentId: 'test-doc-owner', contentHash: contentHashOf('TEST bytes no fixture has') };

describe('ai-processor-route, open (build-readiness decision 2)', () => {
  it('US-ADMIN-17 · F-EXTRACT-02 · closed: a document the manifest does not list is refused', () => {
    expect(checkProcessorRoute([document], { gates: productionGateSource(), manifest, project: PROJECT, root: REPO_ROOT }).allowed).toBe(false);
  });

  it('US-ADMIN-17 · F-EXTRACT-02 · open: the same document and a non-demo project\'s values may be sent', () => {
    const gates = openGateForTest('ai-processor-route');
    const decision = checkProcessorRoute([document, { kind: 'project_values', projectId: PROJECT.id }], { gates, manifest, project: PROJECT, root: REPO_ROOT });
    expect(decision).toEqual({ allowed: true, gateOpen: true });
  });
});
