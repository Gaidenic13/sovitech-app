/**
 * The demo seed over a TEST database and a TEST data folder (apps/api/src/seed/;
 * docs/adr/0029-demo-seed.md; prompt 3 section 10, phase 2, "The demo seed"; section 7,
 * "The demo is labelled and sourced"; guardrails rule 10, "Demo data"; rule 13).
 *
 * The seed account and the demo project are the seed's own; the extraction service account
 * is a TEST account. The documents are the generated synthetic fixtures (fixtures/manifest.json).
 * With Docker and the extractor image present, a second block runs the real extractor in its
 * sandbox on every demo PDF and XLSX, as the worker does. The demo's two models are stored and
 * not read: no model is read until the owner decides D-01 (PRD R-023, R-024;
 * apps/api/src/documents/model-reading.ts).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { rm, stat } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deriveContextFor, readAnalysisJobs, readDocumentFindings, readFieldInputs, withRequest } from '@sovitech/db';
import { createTestAccount, startTestDatabase, type TestDatabase } from '@sovitech/db/testing';
import { derive } from '@sovitech/domain';
import { productionRegistry, registryLookups, unitByCode } from '@sovitech/registry';
import { GateApprovalError, assertGatesStartupSafe, productionGateSource } from '@sovitech/registry/gates';
import { DockerExtractorRunner, type ExtractorRunner, type SandboxReader } from '../../apps/api/src/jobs/sandbox';
import { DEMO_DOCUMENTS, DEMO_SEED_ACCOUNT_NAME, DemoSeedError, seedDemo, type DemoSeedDeps, type DemoSeedReport } from '../../apps/api/src/seed/demo-seed';
import { DEMO_INPUT_REASON, readOwnerAnswers } from '../../apps/api/src/seed/owner-answers';
import type { ApiLogRecord } from '../../apps/api/src/services';
import { FileStore } from '../../apps/api/src/storage/file-store';
import { fixtureUploadGuard } from '../../apps/api/src/uploads/fixture-guard';
import { REPOSITORY_ROOT } from '../guardrails/_support/api';

const LONG = { timeout: 240_000 };
const lookups = registryLookups(productionRegistry);

function contentHashOf(path: string): string {
  return `sha256:${createHash('sha256').update(readFileSync(join(REPOSITORY_ROOT, path))).digest('hex')}`;
}

/** The two sandbox images the worker runs: the Python extractor's (ADR 0018) and the IFC reader's (ADR 0031). */
const IMAGES = { extractor: 'sovitech-extractor:dev', ifcReader: 'sovitech-ifc-reader:dev' } as const;

/** Whether the docker CLI answers and holds both sandbox images. */
function extractorImagePresent(): boolean {
  try {
    execFileSync('docker', ['image', 'inspect', IMAGES.extractor, IMAGES.ifcReader], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

interface Harness {
  readonly database: TestDatabase;
  readonly dataDirectory: string;
  readonly log: ApiLogRecord[];
  readonly deps: DemoSeedDeps;
}

async function harness(dataRoot: string, runner?: DemoSeedDeps['runner']): Promise<Harness> {
  const database = await startTestDatabase();
  const dataDirectory = mkdtempSync(join(dataRoot, 'sovitech-test-demo-seed-'));
  const log: ApiLogRecord[] = [];
  const extractionAccountId = await createTestAccount(database, { label: 'demo seed extraction service', kind: 'service', roles: [] });
  return {
    database,
    dataDirectory,
    log,
    deps: {
      gates: assertGatesStartupSafe(),
      app: database.app,
      operator: database.operator,
      files: new FileStore(dataDirectory),
      uploadGuard: fixtureUploadGuard(REPOSITORY_ROOT),
      extractionAccountId,
      repositoryRoot: REPOSITORY_ROOT,
      ...(runner === undefined ? {} : { runner }),
      log: (record) => {
        log.push(record);
      },
    },
  };
}

async function count(database: TestDatabase, text: string, values: readonly unknown[]): Promise<number> {
  const [row] = await database.asAdministrator<{ count: number }>(text, values);
  return row?.count ?? -1;
}

describe('the demo seed, with the analysis left queued for the worker', LONG, () => {
  let h: Harness;
  let report: DemoSeedReport;

  beforeAll(async () => {
    h = await harness(tmpdir());
  }, 240_000);

  afterAll(async () => {
    await h.database.stop();
    await rm(h.dataDirectory, { recursive: true, force: true });
  });

  it('US-ADMIN-15 · prompt 3 5.4: refuses a gate source that assertGatesStartupSafe() did not return, and writes nothing', async () => {
    await expect(seedDemo({ ...h.deps, gates: productionGateSource() })).rejects.toBeInstanceOf(GateApprovalError);
    expect(await count(h.database, "SELECT count(*)::int AS count FROM sovitech.app_users WHERE kind = 'seed'", [])).toBe(0);
  });

  it("US-DOCS-23 AC1 · ADR 0028: refuses before writing anything when the owner's upload guard refuses a demo document", async () => {
    await expect(seedDemo({ ...h.deps, uploadGuard: { accepts: () => false } })).rejects.toBeInstanceOf(DemoSeedError);
    expect(await count(h.database, "SELECT count(*)::int AS count FROM sovitech.app_users WHERE kind = 'seed'", [])).toBe(0);
    expect(await count(h.database, 'SELECT count(*)::int AS count FROM sovitech.projects', [])).toBe(0);
  });

  it('US-ADMIN-15 AC1 · rule 10 · F-INGEST-09: creates one project flagged demo, by a seed account labelled as demo input that holds owner only', async () => {
    report = await seedDemo(h.deps);
    expect(report.outcome).toBe('seeded');
    const [project] = await h.database.asAdministrator<{ is_demo: boolean; created_by: string }>('SELECT is_demo, created_by FROM sovitech.projects WHERE id = $1', [report.projectId]);
    expect(project).toEqual({ is_demo: true, created_by: report.seedAccountId });
    const [account] = await h.database.asAdministrator<{ kind: string; display_name: string }>('SELECT kind, display_name FROM sovitech.app_users WHERE id = $1', [report.seedAccountId]);
    expect(account).toEqual({ kind: 'seed', display_name: DEMO_SEED_ACCOUNT_NAME });
    const roles = await h.database.asAdministrator<{ role: string }>('SELECT role FROM sovitech.app_user_roles WHERE user_id = $1', [report.seedAccountId]);
    expect(roles).toEqual([{ role: 'owner' }]);
    const members = await h.database.asAdministrator<{ user_id: string }>('SELECT user_id FROM sovitech.project_members WHERE project_id = $1 ORDER BY user_id', [report.projectId]);
    expect(members.map((member) => member.user_id).sort()).toEqual([report.seedAccountId, h.deps.extractionAccountId].sort());
  });

  it('US-ADMIN-15 · F-INGEST-09 · prompt 3 section 7 · 2.1 · rule 3: writes each owner answer of the fixture file as a user candidate with its user_confirmed event, in the owner role, and derive reads it as known', async () => {
    const planned = readOwnerAnswers(REPOSITORY_ROOT);
    expect(report.answers.map((answer) => answer.fieldKey)).toEqual([
      ...planned.filter((answer) => answer.step === 1).map((answer) => answer.fieldKey),
      ...planned.filter((answer) => answer.step !== 1).map((answer) => answer.fieldKey),
    ]);
    const rows = await h.database.asAdministrator<{ source: string; author_role: string; created_by: string }>(
      'SELECT source, author_role, created_by FROM sovitech.candidates WHERE project_id = $1',
      [report.projectId],
    );
    expect(rows).toHaveLength(planned.length);
    expect(new Set(rows.map((row) => `${row.source}/${row.author_role}/${row.created_by}`))).toEqual(new Set([`user/owner/${report.seedAccountId}`]));
    const events = await h.database.asAdministrator<{ type: string; role: string; actor: string; reason: string }>(
      'SELECT type, role, actor, reason FROM sovitech.candidate_events WHERE project_id = $1',
      [report.projectId],
    );
    expect(events).toHaveLength(planned.length);
    expect(new Set(events.map((event) => `${event.type}/${event.role}/${event.actor}/${event.reason}`))).toEqual(new Set([`user_confirmed/owner/${report.seedAccountId}/${DEMO_INPUT_REASON}`]));

    for (const answer of report.answers) {
      const field = lookups.field(answer.fieldKey);
      if (field === undefined) throw new Error(`${answer.fieldKey} is not a registry field`);
      const state = await withRequest(h.database.app, { userId: report.seedAccountId, projectId: report.projectId }, async (request) => {
        const inputs = await readFieldInputs(request, { subjectId: answer.subjectId, fieldKey: answer.fieldKey });
        return derive(field, inputs.candidates, inputs.events, deriveContextFor(inputs, { unit: unitByCode, inputState: () => undefined, datasetApproved: () => false }));
      });
      expect({ key: answer.fieldKey, state: state.state, active: state.activeCandidateId, provisional: state.provisional }).toEqual({
        key: answer.fieldKey,
        state: 'known',
        active: answer.candidateId,
        provisional: false,
      });
      expect(state.candidates).toEqual([{ candidateId: answer.candidateId, verification: 'user_confirmed', status: 'eligible', refusal: null }]);
    }
  });

  it('US-DOCS-23 · F-INGEST-09 · rule 10 · rule 1: stores no value but the owner answers, no engineer_verified event, no AI origin and no question for a known field, and says why no AI value exists', async () => {
    expect(await count(h.database, "SELECT count(*)::int AS count FROM sovitech.candidates WHERE project_id = $1 AND source <> 'user'", [report.projectId])).toBe(0);
    expect(await count(h.database, "SELECT count(*)::int AS count FROM sovitech.candidate_events WHERE project_id = $1 AND type = 'engineer_verified'", [report.projectId])).toBe(0);
    expect(await count(h.database, 'SELECT count(*)::int AS count FROM sovitech.candidate_ai_origins WHERE project_id = $1', [report.projectId])).toBe(0);
    expect(await count(h.database, "SELECT count(*)::int AS count FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'question_for_known_field'", [report.projectId])).toBe(0);
    expect(report.ai.outcome).toBe('no_recordings');
    expect(report.ai.reason).toContain('no AI-proposed value');
  });

  it('US-DOCS-23 AC1 · rule 13 · ADR 0019 · R-023 · R-024: uploads every demo document through the upload protocol, stored under the project and its content hash, each PDF and XLSX with its analysis queued and each model with no reader job (no model is read until D-01)', async () => {
    expect(report.documents.map((document) => document.path).sort()).toEqual([...DEMO_DOCUMENTS].sort());
    for (const path of DEMO_DOCUMENTS) {
      const document = report.documents.find((row) => row.path === path);
      if (document === undefined) throw new Error(`${path} was not registered`);
      const contentHash = contentHashOf(path);
      expect((await stat(h.deps.files.originalPath(report.projectId, contentHash))).size).toBe(readFileSync(join(REPOSITORY_ROOT, path)).length);
      if (path.endsWith('.ifc')) {
        // G12-5: a model is stored, not analysed; and, until D-01, not read at all (PRD R-023, R-024).
        expect(await readAnalysisJobs(h.database.app.db, { projectId: report.projectId, documentId: document.documentId })).toEqual([]);
        expect(document.statusLine).toMatchObject({ kind: 'status_line', statusLineId: 'not_analysed', slots: { fileType: 'IFC model' } });
      } else {
        expect(await readAnalysisJobs(h.database.app.db, { projectId: report.projectId, documentId: document.documentId })).toMatchObject([{ state: 'queued', contentHash }]);
        expect(document.statusLine).toEqual({ kind: 'progress' });
      }
    }
    expect(report.analysis).toEqual([]);
    // Logs name codes and ids, never a file name or its text (rule 13).
    expect(JSON.stringify(h.log)).not.toMatch(/memoriu|tabel|lista|caiet|nota|plan-subsol|demo-hotel/u);
  });

  it('ADR 0048 · ADR 0050 · 7.1.1-D6 · rule 10: the seed generates the demo\'s first stored proposal and records one export, both by the demo account; nothing pending is regenerated by the seed', async () => {
    expect(report.proposal).not.toBeNull();
    const snapshots = await h.database.asAdministrator<{ id: string; created_by: string }>('SELECT id, created_by FROM sovitech.proposal_snapshots WHERE project_id = $1', [report.projectId]);
    expect(snapshots).toEqual([{ id: report.proposal?.snapshotId, created_by: report.seedAccountId }]);
    const outputs = await h.database.asAdministrator<{ id: string; snapshot_id: string; started_by: string; kind: string }>('SELECT id, snapshot_id, started_by, kind FROM sovitech.generated_outputs WHERE project_id = $1', [report.projectId]);
    expect(outputs).toEqual([{ id: report.proposal?.outputId, snapshot_id: report.proposal?.snapshotId, started_by: report.seedAccountId, kind: 'proposal_pdf' }]);
    // The documents were still queued when it was generated (rule 7): the worker's end of their analysis regenerates it.
    const pending = await h.database.asAdministrator<{ document_id: string }>('SELECT document_id FROM sovitech.proposal_snapshot_pending_documents WHERE snapshot_id = $1', [report.proposal?.snapshotId]);
    expect(pending.length).toBe(DEMO_DOCUMENTS.filter((document) => !document.endsWith('.ifc')).length);
  });

  it('F-INGEST-09: a second run finds the demo project the seed made and writes nothing', async () => {
    const before = await count(h.database, 'SELECT count(*)::int AS count FROM sovitech.candidates', []);
    const again = await seedDemo(h.deps);
    expect(again).toMatchObject({ outcome: 'already_seeded', projectId: report.projectId, seedAccountId: report.seedAccountId, answers: [] });
    expect(await count(h.database, 'SELECT count(*)::int AS count FROM sovitech.candidates', [])).toBe(before);
    expect(await count(h.database, 'SELECT count(*)::int AS count FROM sovitech.projects', [])).toBe(1);
  });
});

describe('the demo seed, with the extractor in its sandbox', LONG, () => {
  const present = extractorImagePresent();
  let h: Harness | undefined;
  // Each reader a sandbox job asked for (phase 2 review, ruling b): until D-01 none is the IFC reader.
  const readers: (SandboxReader | undefined)[] = [];

  beforeAll(async () => {
    if (!present) return;
    const docker = new DockerExtractorRunner(IMAGES);
    const recording: ExtractorRunner = {
      run: (job) => {
        readers.push(job.reader);
        return docker.run(job);
      },
    };
    // Under the home folder: Colima shares it with its virtual machine; the temp folder it does not.
    h = await harness(process.platform === 'darwin' ? join(homedir(), 'Library', 'Caches') : tmpdir(), recording);
  }, 240_000);

  afterAll(async () => {
    if (h === undefined) return;
    await h.database.stop();
    await rm(h.dataDirectory, { recursive: true, force: true });
  });

  it.runIf(present)(
    'F-INGEST-09 · rule 12 · rule 14 · G12-5 · R-023 · R-024: reads each PDF and XLSX in the sandbox, keeps the models "Not analysed" and reads none of them (until D-01), reports the fixtures\' findings, and stores no value but the owner answers',
    { timeout: 600_000 },
    async () => {
      if (h === undefined) throw new Error('no harness');
      const report = await seedDemo(h.deps);
      expect(report.analysis.map((step) => step.kind)).toEqual(DEMO_DOCUMENTS.filter((document) => !document.endsWith('.ifc')).map(() => 'done'));
      const line = (path: string) => report.documents.find((document) => document.path === path)?.statusLine;
      expect(line('fixtures/pdf/caiet-de-sarcini.pdf')).toMatchObject({ kind: 'status_line', statusLineId: 'partly_analysed', slots: { analysed: '37', total: '40' } });
      for (const path of DEMO_DOCUMENTS.filter((document) => !document.endsWith('.ifc') && !document.endsWith('caiet-de-sarcini.pdf'))) {
        expect({ path, kind: line(path)?.kind }).toEqual({ path, kind: 'coverage' });
      }
      for (const path of DEMO_DOCUMENTS.filter((document) => document.endsWith('.ifc'))) {
        expect(line(path)).toMatchObject({ kind: 'status_line', statusLineId: 'not_analysed', slots: { fileType: 'IFC model' } });
      }
      const findingKinds = async (path: string): Promise<string[]> => {
        const documentId = report.documents.find((document) => document.path === path)?.documentId;
        if (documentId === undefined || h === undefined) throw new Error(`${path} was not registered`);
        const findings = await withRequest(h.database.app, { userId: report.seedAccountId, projectId: report.projectId }, (request) => readDocumentFindings(request, documentId));
        return [...new Set(findings.map((finding) => finding.kind))];
      };
      expect(await findingKinds('fixtures/pdf/nota-proiectant.pdf')).toContain('embedded_instruction');
      expect(await findingKinds('fixtures/pdf/plan-subsol.pdf')).toContain('hidden_text');
      // No model is read until D-01 (PRD R-023, R-024): no job for either model, the IFC reader's sandbox never started,
      // and no finding and no engineer's record from either model.
      expect(readers).toEqual(DEMO_DOCUMENTS.filter((document) => !document.endsWith('.ifc')).map(() => 'extractor'));
      for (const path of DEMO_DOCUMENTS.filter((document) => document.endsWith('.ifc'))) {
        const documentId = report.documents.find((document) => document.path === path)?.documentId;
        if (documentId === undefined) throw new Error(`${path} was not registered`);
        expect({ path, jobs: await readAnalysisJobs(h.database.app.db, { projectId: report.projectId, documentId }) }).toEqual({ path, jobs: [] });
      }
      for (const path of DEMO_DOCUMENTS.filter((document) => document.endsWith('.ifc'))) expect({ path, kinds: await findingKinds(path) }).toEqual({ path, kinds: [] });
      expect(await count(h.database, 'SELECT count(*)::int AS count FROM sovitech.document_model_records WHERE project_id = $1', [report.projectId])).toBe(0);
      expect(await count(h.database, "SELECT count(*)::int AS count FROM sovitech.candidates WHERE project_id = $1 AND source <> 'user'", [report.projectId])).toBe(0);
      expect(await count(h.database, 'SELECT count(*)::int AS count FROM sovitech.candidate_ai_origins WHERE project_id = $1', [report.projectId])).toBe(0);
      expect(report.ai.outcome).toBe('no_recordings');
    },
  );
});
