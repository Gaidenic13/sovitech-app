/**
 * A value from a workbook, verified against the text the real extractor stored (the phase 2 review,
 * verifier finding "PDF and XLSX companions produce verified candidates does not hold": no API-level
 * test ingested an XLSX cell proposal, or ingested over the real extractor's own output). With no
 * ANTHROPIC_API_KEY no model proposes anything, so the proposal here is hand-built: a TEST label,
 * never a model id (prompt 3 phase 2), and it goes through the one ingestion path, the verifier's
 * five checks included (rule 1; docs/adr/0027).
 *
 * On a TEST database, the owner uploads the synthetic room schedule (fixtures/xlsx/tabel-camere.xlsx);
 * the real Python extractor reads it in process (not in its sandbox, which this test does not need);
 * a TEST proposal citing the summary cell that states the guest-room count is stored as `document`,
 * and the same proposal citing a cell that does not state it is rejected and logged.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { ensureBuildingSubject, readCandidateAiOrigins, readProjectDocuments, withRequest } from '@sovitech/db';
import { productionRegistry, registryLookups } from '@sovitech/registry';
import { ingestProposals } from '../../apps/api/src/ingestion/proposals';
import type { ExtractorRunner, SandboxJob, SandboxOutcome } from '../../apps/api/src/jobs/sandbox';
import { REPOSITORY_ROOT, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type TestApi } from '../guardrails/_support/api';

const PYTHON = join(REPOSITORY_ROOT, 'services', 'extractor', '.venv', 'bin', 'python');
const SOURCE = join(REPOSITORY_ROOT, 'services', 'extractor', 'src');
const lookups = registryLookups(productionRegistry);

/** The real extractor, in process, on what the sandbox would mount. */
class InProcessExtractor implements ExtractorRunner {
  run(job: SandboxJob): Promise<SandboxOutcome> {
    const code = 'import sys; sys.path.insert(0, sys.argv[1]); from sovitech_extractor.cli import main; sys.exit(main(sys.argv[2:]))';
    const ran = spawnSync(PYTHON, ['-c', code, SOURCE, '--request', job.requestPath, '--document', job.inputPath, '--out', job.outputDirectory], { stdio: 'ignore' });
    return Promise.resolve(ran.status === 0 ? { outcome: 'finished' } : { outcome: 'failed', code: 'extractor_failed' });
  }
}

let api: TestApi;
let ownerId: string;
let projectId: string;
let documentId: string;

beforeAll(async () => {
  api = await startTestApi();
  ({ ownerId, projectId } = await ownerWithProject(api, 'xlsx proposal'));
  const auth = await signIn(api, ownerId);
  documentId = (await upload(api, auth, projectId, 'tabel-camere.xlsx', fixtureBytes('fixtures/xlsx/tabel-camere.xlsx'))).body.documentId ?? '';
}, 240_000);

afterAll(async () => {
  await api.stop();
});

it.runIf(existsSync(PYTHON))(
  'US-DOCS-07 · F-EXTRACT-01 · F-EXTRACT-04 · rule 1: a cell proposal verified against the text the real extractor stored is a document value; one citing a cell that does not state it is rejected and logged',
  { timeout: 120_000 },
  async () => {
    expect((await testWorker(api, new InProcessExtractor()).drain()).map((step) => step.kind)).toEqual(['done']);
    const contentHash = await withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => (await readProjectDocuments(request)).documents.find((document) => document.id === documentId)?.contentHash ?? '');
    const outcomes = await withRequest(api.database.app, { userId: api.extractionAccountId, projectId }, async (request) => {
      const building = await ensureBuildingSubject(request, api.extractionAccountId);
      const rooms = {
        subjectId: building,
        fieldKey: 'building.rooms',
        quantity: { value: 17, unit: 'count', qualifier: 'guest_rooms' },
        source: 'document' as const,
        evidence: [{ documentId, contentHash, locator: { sheet: 'Sumar', cell: 'B3' }, excerpt: '17' }],
      };
      return ingestProposals(request, {
        projectId,
        serviceId: api.extractionAccountId,
        field: lookups.field,
        proposals: [
          { proposal: rooms, modelId: 'TEST-hand-built-no-model' },
          { proposal: { ...rooms, evidence: [{ documentId, contentHash, locator: { sheet: 'Sumar', cell: 'B4' }, excerpt: '17' }] }, modelId: 'TEST-hand-built-no-model' },
        ],
      });
    });
    expect(outcomes).toMatchObject([
      { outcome: 'stored', source: 'document' },
      { outcome: 'rejected', code: 'excerpt_at_locator' },
    ]);
    const stored = outcomes[0];
    const candidateId = stored?.outcome === 'stored' ? stored.candidateId : '';
    const origins = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readCandidateAiOrigins(request, [candidateId]));
    expect(origins.get(candidateId)).toBe('TEST-hand-built-no-model');
    const [candidate] = await api.database.asAdministrator<{ quantity_value: string; quantity_qualifier: string | null; source: string }>(
      'SELECT quantity_value::text, quantity_qualifier, source FROM sovitech.candidates WHERE id = $1',
      [candidateId],
    );
    // The excerpt states the number and not what it counts, so code stores the qualifier as unknown (rule 8).
    expect(candidate).toMatchObject({ quantity_value: '17', source: 'document' });
    expect(candidate?.quantity_qualifier === null || candidate?.quantity_qualifier === 'unknown').toBe(true);
    const events = await api.database.asAdministrator<{ type: string; reason: string }>('SELECT type, reason FROM sovitech.guardrail_events WHERE project_id = $1 ORDER BY at', [projectId]);
    expect(events).toEqual([{ type: 'evidence_not_found', reason: 'excerpt_at_locator' }]);
  },
);
