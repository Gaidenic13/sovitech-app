/**
 * A file is read only as the format it was uploaded as (the phase 2 review): a workbook uploaded
 * as "….pdf" was analysed and stored with XLSX text, sheet coverage and status under a document
 * whose recorded format is PDF, so its status and coverage misdescribed the file (rule 12; 2.3).
 * Now the extractor fails it with `format_mismatch`, reading nothing, and the contract refuses an
 * output whose format is not the declared one (outputAnswersRequest, both languages).
 *
 * On a TEST database, the owner uploads the synthetic room schedule (fixtures/xlsx/tabel-camere.xlsx)
 * under a name ending in ".pdf" (the owner's fixtures-only guard takes it: its hash is a fixture's).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fileNamePart, readDocumentTexts, readProjectDocuments, withRequest } from '@sovitech/db';
import type { ExtractorRunner, SandboxJob, SandboxOutcome } from '../../apps/api/src/jobs/sandbox';
import {
  REPOSITORY_ROOT,
  ScriptedRunner,
  TEST_PRODUCER,
  documentList,
  fixtureBytes,
  ownerWithProject,
  signIn,
  startTestApi,
  testWorker,
  upload,
  type Auth,
  type TestApi,
} from '../guardrails/_support/api';

const PYTHON = join(REPOSITORY_ROOT, 'services', 'extractor', '.venv', 'bin', 'python');
const SOURCE = join(REPOSITORY_ROOT, 'services', 'extractor', 'src');

/** The real extractor, in process (not in its sandbox, which this test does not need). */
class InProcessExtractor implements ExtractorRunner {
  run(job: SandboxJob): Promise<SandboxOutcome> {
    const code = 'import sys; sys.path.insert(0, sys.argv[1]); from sovitech_extractor.cli import main; sys.exit(main(sys.argv[2:]))';
    const ran = spawnSync(PYTHON, ['-c', code, SOURCE, '--request', job.requestPath, '--document', job.inputPath, '--out', job.outputDirectory], { stdio: 'ignore' });
    return Promise.resolve(ran.status === 0 ? { outcome: 'finished' } : { outcome: 'failed', code: 'extractor_failed' });
  }
}

let api: TestApi;

beforeAll(async () => {
  api = await startTestApi();
}, 240_000);

afterAll(async () => {
  await api.stop();
});

async function renamedWorkbook(label: string): Promise<{ ownerId: string; projectId: string; auth: Auth; documentId: string }> {
  const { ownerId, projectId } = await ownerWithProject(api, label);
  const auth = await signIn(api, ownerId);
  const uploaded = await upload(api, auth, projectId, 'tabel-camere.pdf', fixtureBytes('fixtures/xlsx/tabel-camere.xlsx'));
  expect(uploaded.status).toBe(201);
  return { ownerId, projectId, auth, documentId: uploaded.body.documentId ?? '' };
}

async function storedParts(ownerId: string, projectId: string, documentId: string): Promise<string[]> {
  return withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => {
    const { documents } = await readProjectDocuments(request);
    const contentHash = documents.find((document) => document.id === documentId)?.contentHash ?? '';
    return (await readDocumentTexts(request, contentHash, '')).map((part) => part.part);
  });
}

describe('a file uploaded as another format', () => {
  it.runIf(existsSync(PYTHON))(
    'F-INGEST-03 · F-INGEST-05 · rule 12 · 2.3: a workbook uploaded as a PDF is not read: "Analysis failed", and no sheet text, coverage or workbook status is stored under the PDF record',
    { timeout: 120_000 },
    async () => {
      const { ownerId, projectId, auth, documentId } = await renamedWorkbook('declared pdf, a workbook');
      expect((await testWorker(api, new InProcessExtractor()).drain()).map((step) => step.kind)).toEqual(['done']);
      const analyses = await api.database.asAdministrator<{ status: string; coverage: string }>(
        'SELECT status, coverage FROM sovitech.document_analysis_events WHERE document_id = $1 ORDER BY at',
        [documentId],
      );
      expect(analyses.at(-1)).toEqual({ status: 'failed', coverage: 'none' });
      const row = (await documentList(api, auth, projectId)).find((document) => document['documentId'] === documentId);
      expect(row).toMatchObject({ format: 'pdf', statusLine: { statusLineId: 'analysis_failed' } });
      expect(await storedParts(ownerId, projectId, documentId)).toEqual([fileNamePart(documentId)]);
    },
  );

  it('F-INGEST-04 · ADR 0022: an output whose format is not the declared one does not answer its request: nothing is stored, and the file reads "Analysis failed"', async () => {
    const { ownerId, projectId, documentId } = await renamedWorkbook('declared pdf, an xlsx output');
    // What the extractor wrote before the review: the workbook read as a workbook (TEST cells).
    const runner = new ScriptedRunner((_job, job) => ({
      contractVersion: '1.0.0',
      producer: TEST_PRODUCER,
      job,
      format: 'xlsx',
      analysis: { status: 'analysed' },
      coverage: { sheets: [{ sheet: 'TEST', status: 'read' }] },
      xlsx: { sheets: [{ name: 'TEST', visibility: 'visible', cells: [{ ref: 'A1', valueType: 'shared_string', raw: 'TEST cell', numberFormat: 'General', hidden: [] }], mergedRanges: [] }] },
      findings: [],
      derivatives: [],
    }));
    const steps = await testWorker(api, runner).drain();
    expect(steps.map((step) => ('code' in step ? [step.kind, step.code] : [step.kind]))).toEqual([['failed', 'output_not_answering_request']]);
    expect(api.log).toContainEqual(expect.objectContaining({ event: 'extractor_output_refused', code: 'output_not_answering_request', codes: ['value@/format'] }));
    expect(await storedParts(ownerId, projectId, documentId)).toEqual([fileNamePart(documentId)]);
    const analyses = await api.database.asAdministrator<{ status: string }>('SELECT status FROM sovitech.document_analysis_events WHERE document_id = $1 ORDER BY at', [documentId]);
    expect(analyses.at(-1)?.status).toBe('failed');
  });
});
