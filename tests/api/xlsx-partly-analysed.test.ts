/**
 * A workbook with a sheet not read is stored as partly analysed, counted in sheets (the phase 2
 * review): rule 12, "Partial processing is shown with its coverage"; 2.3's `partly_analysed`;
 * the extraction contract (ADR 0022) allows it for XLSX in both languages. The owner's row keeps
 * showing the sheet coverage as recorded: 2.8's "Partly analysed" line counts pages, and a line
 * for sheets waits for the approver (build log, P-2-XLSX-SHEETS), so no new wording is shown.
 *
 * On a TEST database, the owner uploads the synthetic room schedule (fixtures/xlsx/tabel-camere.xlsx),
 * and the real Python extractor reads it in process (not in its sandbox, which this test does not
 * need), with the cell limit per sheet lowered below the size of its first sheet: that sheet is
 * not read (`cell_limit`), the second is.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { fileNamePart, readDocumentTexts, readProjectDocuments, withRequest } from '@sovitech/db';
import type { ExtractorRunner, SandboxJob, SandboxOutcome } from '../../apps/api/src/jobs/sandbox';
import { REPOSITORY_ROOT, documentList, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type Auth, type TestApi } from '../guardrails/_support/api';

const PYTHON = join(REPOSITORY_ROOT, 'services', 'extractor', '.venv', 'bin', 'python');
const SOURCE = join(REPOSITORY_ROOT, 'services', 'extractor', 'src');
/** Below the first sheet's cells (133), above the second's (7): TEST limit. */
const TEST_CELL_LIMIT = 100;

/** The real extractor, in process, with a lower cell limit than the API asks for. */
class LimitedExtractor implements ExtractorRunner {
  run(job: SandboxJob): Promise<SandboxOutcome> {
    return (async () => {
      const request = JSON.parse(await readFile(job.requestPath, 'utf8')) as { limits: { maxCellsPerSheet: number } };
      request.limits.maxCellsPerSheet = TEST_CELL_LIMIT;
      const limited = join(dirname(job.requestPath), 'request-test-limit.json');
      await writeFile(limited, JSON.stringify(request));
      const code = 'import sys; sys.path.insert(0, sys.argv[1]); from sovitech_extractor.cli import main; sys.exit(main(sys.argv[2:]))';
      const ran = spawnSync(PYTHON, ['-c', code, SOURCE, '--request', limited, '--document', job.inputPath, '--out', job.outputDirectory], { stdio: 'ignore' });
      return ran.status === 0 ? { outcome: 'finished' } : { outcome: 'failed', code: 'extractor_failed' };
    })();
  }
}

let api: TestApi;
let ownerId: string;
let projectId: string;
let auth: Auth;
let documentId: string;

beforeAll(async () => {
  api = await startTestApi();
  ({ ownerId, projectId } = await ownerWithProject(api, 'xlsx partly analysed'));
  auth = await signIn(api, ownerId);
  documentId = (await upload(api, auth, projectId, 'tabel-camere.xlsx', fixtureBytes('fixtures/xlsx/tabel-camere.xlsx'))).body.documentId ?? '';
}, 240_000);

afterAll(async () => {
  await api.stop();
});

it.runIf(existsSync(PYTHON))(
  'US-DOCS-06 · F-INGEST-05 · R-015 · rule 12 · G12-4: a workbook with a sheet over the cell limit is stored partly analysed in sheets, its row shows the sheet coverage, and nothing of the unread sheet is stored',
  { timeout: 120_000 },
  async () => {
    const steps = await testWorker(api, new LimitedExtractor()).drain();
    expect(steps.map((step) => step.kind)).toEqual(['done']);
    const analyses = await api.database.asAdministrator<{ status: string; coverage: string }>(
      'SELECT status, coverage FROM sovitech.document_analysis_events WHERE document_id = $1 ORDER BY at',
      [documentId],
    );
    expect(analyses.at(-1)).toEqual({ status: 'partly_analysed', coverage: 'sheets 2 of 2' });
    const row = (await documentList(api, auth, projectId)).find((document) => document['documentId'] === documentId);
    expect(row).toMatchObject({ statusLine: { kind: 'coverage', coverage: 'sheets 2 of 2' } });
    expect(JSON.stringify(row)).not.toMatch(/Partly analysed|pages/u);
    // Only the sheet read is stored as text: nothing of the first sheet, which was not read.
    const parts = await withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => {
      const { documents } = await readProjectDocuments(request);
      const contentHash = documents.find((document) => document.id === documentId)?.contentHash ?? '';
      return (await readDocumentTexts(request, contentHash, '')).map((part) => part.part);
    });
    expect(parts.filter((part) => part !== fileNamePart(documentId)).every((part) => part === 'sheet:Sumar' || part.startsWith('cell:Sumar!'))).toBe(true);
    expect(parts).toContain('sheet:Sumar');
  },
);
