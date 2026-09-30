/**
 * The `ai-processor-route` gate's runtime guard (prompt 3 section 5.4): while the gate is
 * closed, only documents whose hash fixtures/manifest.json lists, values and text of the
 * demo project, and manifest-listed fixture files may be sent; everything else is refused.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, productionGateSource, readGate } from '@sovitech/registry/gates';
import { describe, expect, it } from 'vitest';
import { checkProcessorRoute, codeSetNames, contentHashOf, loadFixtureManifest, nameForModel, sha256Hex, type RouteContext } from './guard';

const manifest = loadFixtureManifest(REPO_ROOT);
const FIXTURE_PATH = [...manifest.files.keys()][0] ?? '';
const FIXTURE_HASH = manifest.files.get(FIXTURE_PATH) ?? '';

function context(demo: boolean): RouteContext {
  return { gates: productionGateSource(), manifest, project: { id: 'test-project-route', demo }, root: REPO_ROOT };
}

describe('the ai-processor-route guard', () => {
  it('US-ADMIN-17 · prompt 3 5.4: reads the gate closed', () => {
    expect(readGate(productionGateSource(), 'ai-processor-route').open).toBe(false);
    expect(FIXTURE_PATH).not.toBe('');
  });

  it('US-ADMIN-17 · F-EXTRACT-02: lets a document through only when the manifest lists its hash', () => {
    const fixture = { kind: 'document' as const, projectId: 'test-project-route', documentId: 'test-doc-fixture', contentHash: `sha256:${FIXTURE_HASH}`, name: 'test-doc-fixture' };
    expect(checkProcessorRoute([fixture], context(false))).toEqual({ allowed: true, gateOpen: false });
    const owner = { ...fixture, documentId: 'test-doc-owner', contentHash: contentHashOf('TEST bytes that no fixture has') };
    expect(checkProcessorRoute([fixture, owner], context(false))).toEqual({
      allowed: false,
      refusals: [{ code: 'document_not_fixture', documentId: 'test-doc-owner' }],
    });
  });

  // Phase 2 review, adversarial finding "the owner-typed file name reaches the model while the gate is closed".
  it("US-ADMIN-17 · F-EXTRACT-02: lets a document's name through only when code set it, or on the demo project, or when its own fixture file states it", () => {
    const fixture = { kind: 'document' as const, projectId: 'test-project-route', documentId: 'test-doc-fixture', contentHash: `sha256:${FIXTURE_HASH}`, name: 'test-doc-fixture' };
    const basename = FIXTURE_PATH.split('/').at(-1) ?? '';
    expect(checkProcessorRoute([{ ...fixture, name: basename }], context(false)).allowed).toBe(true);
    const typed = { ...fixture, name: 'TEST owner typed name, Hotel Example.pdf' };
    expect(checkProcessorRoute([typed], context(false))).toEqual({ allowed: false, refusals: [{ code: 'document_name_not_fixture', documentId: 'test-doc-fixture' }] });
    expect(checkProcessorRoute([typed], context(true))).toEqual({ allowed: true, gateOpen: false });
    // An eval's document fixture states its own name, which is fixture content.
    const evalPath = [...manifest.files.keys()].find((path) => path.startsWith('fixtures/evals/G1-1/') && path.endsWith('.yaml')) ?? '';
    const evalHash = manifest.files.get(evalPath) ?? '';
    const stated = /^name: (.+)$/mu.exec(readFileSync(join(REPO_ROOT, evalPath), 'utf8'))?.[1] ?? '';
    expect(stated).not.toBe('');
    expect(checkProcessorRoute([{ ...fixture, contentHash: `sha256:${evalHash}`, name: stated }], context(false)).allowed).toBe(true);
    expect(checkProcessorRoute([{ ...fixture, contentHash: `sha256:${evalHash}`, name: `${stated} (edited)` }], context(false)).allowed).toBe(false);
  });

  it("US-ADMIN-17 · F-EXTRACT-02: sends a code-set name while the gate is closed: the fixture's file name, else the document id", () => {
    const gates = productionGateSource();
    expect(codeSetNames({ documentId: 'test-doc', contentHash: `sha256:${FIXTURE_HASH}` }, manifest)).toContain(FIXTURE_PATH.split('/').at(-1));
    expect(nameForModel({ documentId: 'test-doc', contentHash: `sha256:${FIXTURE_HASH}`, uploadedName: 'TEST typed.pdf' }, { gates, manifest })).toBe(
      codeSetNames({ documentId: 'test-doc', contentHash: `sha256:${FIXTURE_HASH}` }, manifest)[0],
    );
    expect(nameForModel({ documentId: 'test-doc', contentHash: contentHashOf('TEST no fixture'), uploadedName: 'TEST typed.pdf' }, { gates, manifest })).toBe('test-doc');
  });

  it("US-ADMIN-17 · US-ADMIN-04 · F-PROPOSAL-03: lets project values through only for the demo project, and never another project's", () => {
    expect(checkProcessorRoute([{ kind: 'project_values', projectId: 'test-project-route' }], context(true)).allowed).toBe(true);
    expect(checkProcessorRoute([{ kind: 'project_values', projectId: 'test-project-route' }], context(false))).toEqual({
      allowed: false,
      refusals: [{ code: 'project_not_demo', projectId: 'test-project-route' }],
    });
    expect(checkProcessorRoute([{ kind: 'project_values', projectId: 'test-project-other' }], context(true))).toEqual({
      allowed: false,
      refusals: [{ code: 'other_project', projectId: 'test-project-other' }],
    });
  });

  it('US-ADMIN-17 · F-PROPOSAL-03: lets a fixture file through only when the manifest lists it with the bytes on disk', () => {
    const bytes = readFileSync(join(REPO_ROOT, FIXTURE_PATH));
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    expect(checkProcessorRoute([{ kind: 'fixture_values', path: FIXTURE_PATH, sha256 }], context(false)).allowed).toBe(true);
    expect(checkProcessorRoute([{ kind: 'fixture_values', path: FIXTURE_PATH, sha256: 'b'.repeat(64) }], context(false))).toEqual({
      allowed: false,
      refusals: [{ code: 'fixture_file_not_in_manifest', path: FIXTURE_PATH }],
    });
    expect(checkProcessorRoute([{ kind: 'fixture_values', path: 'docs/guardrails.md', sha256 }], context(false))).toEqual({
      allowed: false,
      refusals: [{ code: 'fixture_file_outside_fixtures', path: 'docs/guardrails.md' }],
    });
  });

  it('US-ADMIN-17 · F-EXTRACT-02: reads a content hash with or without its prefix, and nothing else', () => {
    expect(sha256Hex(`sha256:${'A'.repeat(64)}`)).toBe('a'.repeat(64));
    expect(sha256Hex('c'.repeat(64))).toBe('c'.repeat(64));
    expect(sha256Hex('sha256:test')).toBeUndefined();
  });
});
