/**
 * The demo seed (prompt 3 section 10, phase 2, "The demo seed"; section 7, "The demo is
 * labelled and sourced"; section 5.4; guardrails rule 10, "Demo data"; rule 13; F-INGEST-09;
 * US-ADMIN-15, US-DOCS-23; docs/adr/0029-demo-seed.md).
 *
 * It builds the one demo project, "Demo Hotel Bucharest" (OD-5), flagged `demo`:
 * 1. It refuses to run without the gate source that assertGatesStartupSafe() returned, as the
 *    API does (prompt 3 5.4: "The API server and the demo seed refuse to start while any gate
 *    fails this check"). Every gate is closed; nothing here opens one.
 * 2. It reads and checks everything before it writes: the owner answers
 *    (./owner-answers.ts) and each demo document, which must pass the owner's fixtures-only
 *    upload guard (docs/adr/0028) with the bytes on disk.
 * 3. On the operator's login, the demo seed account (kind `seed`, labelled as demo input)
 *    is created and holds `owner`; on the app's login, that account creates the project,
 *    and the store flags it demo because the seed made it (0006; ADR 0015 decision 4). The
 *    operator's login makes the extraction service account a member, since the seed never
 *    decides who belongs to a project (0006, `add_project_member`; ADR 0013).
 * 4. The step 1 answers are written, then each document goes through the upload protocol
 *    of ADR 0019 in the seed's request (the fixtures-only guard at "complete", storage
 *    under <projectId>/<contentHash>/, registration and a queued analysis), then the answers
 *    of steps 4 to 7: the order an owner would give them.
 * 5. With a sandbox runner, the analysis worker drains the queue: each PDF and XLSX file is
 *    read by the extractor in its sandbox and what it produced is stored (text, coverage,
 *    findings). Without one, the jobs stay queued for the worker. The IFC models are
 *    registered stored-only with no reader job: until the owner decides D-01, the live app
 *    reads no model (PRD R-023 and R-024, "Until decided"; apps/api/src/documents/model-reading.ts;
 *    ADR 0025 decision 4, ADR 0029 decision 7), so the demo has no model record or model finding.
 *
 * What it never does: write an AI-proposed value. A value from a PDF or XLSX document comes
 * only from the AI, through the verifier and the one ingestion path (prompt 3 section 6);
 * the extractor maps no text to a field, and IFC values wait behind `ifc-values`. The seed
 * may replay recordings from fixtures/ai-recordings/, which come only from a real model run
 * on a fixture; none exists (no ANTHROPIC_API_KEY when phase 2 ran), so the demo has no
 * AI-proposed value, and the seed says so. It never calls the model itself, never writes a
 * recording or a value by hand, never writes `engineer_verified` (rule 10; the store refuses
 * it on a demo project anyway), and logs codes and ids only (rule 13).
 *
 * It runs once per database: a second run finds the demo project the seed account made and
 * reports it, writing nothing.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Readable } from 'node:stream';
import { addProjectMember, createAppUser, createProject, grantAppRole, withRequest, type Store } from '@sovitech/db';
import { contentHashOf } from '@sovitech/ai';
import { GateApprovalError, isStartupCheckedSource, type GateSource } from '@sovitech/registry/gates';
import { SessionStore } from '../auth/sessions';
import { generateProposal, recordExport } from '../proposal/service';
import { ownerDocumentList, type OwnerDocumentRow } from '../documents/service';
import { AnalysisWorker, type WorkerStep } from '../jobs/worker';
import type { ExtractorRunner } from '../jobs/sandbox';
import type { ApiLog, ApiServices } from '../services';
import type { FileStore } from '../storage/file-store';
import type { UploadGuard } from '../uploads/fixture-guard';
import { appendUpload, completeUpload, createUpload } from '../uploads/service';
import { readOwnerAnswers, writeOwnerAnswers, type WrittenAnswer } from './owner-answers';

/** The demo seed account's name: labelled as demo input (prompt 3 section 7). */
export const DEMO_SEED_ACCOUNT_NAME = 'Demo seed (demo input, not a person)';

/**
 * The demo's documents: the synthetic PDF and XLSX companions and the two IFC models of the
 * building (fixtures/README.md; ifc-input 5.2 and 5.3, the `test` profile; prompt 3 5.2,
 * "Demo building"). Left out: MEP rev B and the IFC2X3 copy, which are variants of rev A for
 * the revision and schema cases (G4-13, G4-14, IFC-11, IFC-13), not more documents of the
 * building; and the ground truth, IDS and expected-result files, which are no one's upload.
 */
export const DEMO_DOCUMENTS: readonly string[] = [
  'fixtures/pdf/memoriu-tehnic.pdf',
  'fixtures/pdf/tabel-suprafete.pdf',
  'fixtures/pdf/lista-echipamente.pdf',
  'fixtures/pdf/plan-subsol.pdf',
  'fixtures/pdf/nota-proiectant.pdf',
  'fixtures/pdf/caiet-de-sarcini.pdf',
  'fixtures/xlsx/tabel-camere.xlsx',
  'fixtures/xlsx/lista-echipamente.xlsx',
  'fixtures/ifc/demo-hotel-arh.ifc',
  'fixtures/ifc/demo-hotel-mep-rev-a.ifc',
];

/** Where recordings of real model runs on fixtures would live (prompt 3 section 10, phase 2). */
export const AI_RECORDINGS_DIR = 'fixtures/ai-recordings';

export class DemoSeedError extends Error {
  override name = 'DemoSeedError';
}

export interface DemoSeedDeps {
  /** The gate source assertGatesStartupSafe() returned; nothing else is accepted. */
  readonly gates: GateSource;
  /** The store on the app's login (sovitech_db_app). */
  readonly app: Store;
  /** The store on the operator's login (sovitech_db_admin): the account, role and member functions. */
  readonly operator: Store;
  readonly files: FileStore;
  /** The owner's fixtures-only guard (docs/adr/0028). */
  readonly uploadGuard: UploadGuard;
  /** The extraction job's service account (SOVITECH_EXTRACTION_ACCOUNT_ID). */
  readonly extractionAccountId: string;
  readonly repositoryRoot: string;
  /** The extractor's sandbox. Absent: the documents stay queued for the analysis worker. */
  readonly runner?: ExtractorRunner;
  readonly log: ApiLog;
  /** The seed account's name; the demo's own by default. */
  readonly seedAccountName?: string;
}

export interface DemoSeedAiReport {
  readonly outcome: 'no_recordings' | 'recordings_not_replayed';
  readonly reason: string;
}

export interface DemoSeedReport {
  readonly outcome: 'seeded' | 'already_seeded';
  readonly projectId: string;
  readonly seedAccountId: string;
  readonly answers: readonly WrittenAnswer[];
  readonly documents: readonly (OwnerDocumentRow & { readonly path: string | null })[];
  /** The worker's steps, when a runner was given; empty when the jobs were left queued. */
  readonly analysis: readonly { readonly kind: WorkerStep['kind']; readonly documentId?: string; readonly code?: string }[];
  readonly ai: DemoSeedAiReport;
  /**
   * The demo's first stored proposal, generated by the seed account as the demo's owner, and one exported proposal it
   * recorded (phase 5; docs/adr/0048, 0050), so the stored proposal and Reports show on the demo with a demo account,
   * never a real person (7.1.1-D6). Null when the demo was already seeded.
   */
  readonly proposal: { readonly snapshotId: string; readonly outputId: string } | null;
}

/** A demo document, read and hashed before anything is written. */
interface DemoFile {
  readonly path: string;
  readonly fileName: string;
  readonly bytes: Buffer;
  readonly contentHash: string;
}

function readDemoFiles(root: string, guard: UploadGuard): DemoFile[] {
  const refused: string[] = [];
  const files = DEMO_DOCUMENTS.map((path) => {
    const bytes = readFileSync(join(root, path));
    const contentHash = contentHashOf(bytes);
    if (!guard.accepts(contentHash)) refused.push(path);
    return { path, fileName: basename(path), bytes, contentHash };
  });
  if (refused.length > 0) {
    throw new DemoSeedError(`The upload guard refuses ${refused.join(', ')}: regenerate the fixtures or fixtures/manifest.json. Nothing was written.`);
  }
  return files;
}

/** Why no AI-proposed value exists, read from the recordings folder. */
function aiReport(root: string): DemoSeedAiReport {
  const folder = join(root, AI_RECORDINGS_DIR);
  const recordings = existsSync(folder) && statSync(folder).isDirectory() ? readdirSync(folder).filter((name) => !name.startsWith('.')) : [];
  if (recordings.length === 0) {
    return {
      outcome: 'no_recordings',
      reason:
        'No AI recording exists under fixtures/ai-recordings/ (a recording comes only from a real model run on a fixture, and none has been made). The demo has no AI-proposed value: the seed writes none by hand and never calls the model.',
    };
  }
  return {
    outcome: 'recordings_not_replayed',
    reason: 'Recordings exist under fixtures/ai-recordings/, but replaying them through the validator and the verifier is not built yet: nothing was replayed, and the demo has no AI-proposed value.',
  };
}

/** The seed account (created on the operator's login when missing) holding `owner`. */
async function seedAccount(operator: Store, name: string): Promise<string> {
  const existing = await operator.db.selectFrom('app_users').select('id').where('kind', '=', 'seed').where('display_name', '=', name).orderBy('created_at').executeTakeFirst();
  const seedId =
    existing?.id ??
    (await createAppUser(operator.db, {
      displayName: name,
      kind: 'seed',
      reason: 'the demo seed: it creates the demo project and writes its owner answers as demo input (prompt 3 section 7)',
    }));
  const holds = await operator.db.selectFrom('app_user_roles').select('role').where('user_id', '=', seedId).where('role', '=', 'owner').executeTakeFirst();
  if (holds === undefined) {
    await grantAppRole(operator.db, { userId: seedId, role: 'owner', reason: 'the demo seed acts as the owner of the demo project only (0006, request_user_acts_as)' });
  }
  return seedId;
}

/** The demo project the seed account already made, if any (the operator's login reads every audit event). */
async function existingDemoProject(operator: Store, seedId: string): Promise<string | undefined> {
  const row = await operator.db
    .selectFrom('audit_events')
    .select('project_id')
    .where('type', '=', 'project_created')
    .where('actor_user_id', '=', seedId)
    .orderBy('at')
    .executeTakeFirst();
  return row?.project_id ?? undefined;
}

/**
 * The demo project the demo seed made, if any, found on the operator's login as the seed's second
 * run finds it (the seed account by its name, then the project it created). Reads only: it creates
 * no account. For the development accounts' CLI and the e2e setup (docs/adr/0038, 0037), which add
 * development accounts as members of the demo (PRD R-136 interim).
 */
export async function findDemoProject(operator: Store, seedAccountName: string = DEMO_SEED_ACCOUNT_NAME): Promise<string | undefined> {
  const seed = await operator.db.selectFrom('app_users').select('id').where('kind', '=', 'seed').where('display_name', '=', seedAccountName).orderBy('created_at').executeTakeFirst();
  return seed === undefined ? undefined : existingDemoProject(operator, seed.id);
}

async function documentsOf(deps: DemoSeedDeps, scope: { readonly userId: string; readonly projectId: string }, files: readonly DemoFile[]): Promise<DemoSeedReport['documents']> {
  const rows = await withRequest(deps.app, scope, (request) => ownerDocumentList(request));
  return rows.map((row) => ({ ...row, path: files.find((file) => file.fileName === row.fileName)?.path ?? null }));
}

/** Builds the demo project. See the module comment for the order and what it never does. */
export async function seedDemo(deps: DemoSeedDeps): Promise<DemoSeedReport> {
  if (!isStartupCheckedSource(deps.gates)) {
    throw new GateApprovalError('Refusing to seed the demo: pass the gate source that assertGatesStartupSafe() returned (prompt 3 section 5.4).');
  }
  const answers = readOwnerAnswers(deps.repositoryRoot);
  const files = readDemoFiles(deps.repositoryRoot, deps.uploadGuard);
  const ai = aiReport(deps.repositoryRoot);

  const seedId = await seedAccount(deps.operator, deps.seedAccountName ?? DEMO_SEED_ACCOUNT_NAME);
  const existing = await existingDemoProject(deps.operator, seedId);
  if (existing !== undefined) {
    deps.log({ event: 'demo_seed_skipped', code: 'already_seeded', projectId: existing });
    return { outcome: 'already_seeded', projectId: existing, seedAccountId: seedId, answers: [], documents: await documentsOf(deps, { userId: seedId, projectId: existing }, files), analysis: [], ai, proposal: null };
  }

  const projectId = await withRequest(deps.app, { userId: seedId }, (request) => createProject(request, { isDemo: true }));
  await addProjectMember(deps.operator.db, { projectId, userId: deps.extractionAccountId });
  deps.log({ event: 'demo_project_created', projectId });
  const scope = { userId: seedId, projectId };

  // Step 1, then the documents of step 2, then steps 4 to 7.
  const written: WrittenAnswer[] = [];
  written.push(...(await withRequest(deps.app, scope, (request) => writeOwnerAnswers(request, { seedId, answers: answers.filter((answer) => answer.step === 1) }))));
  const services: ApiServices = {
    store: deps.app,
    files: deps.files,
    uploadGuard: deps.uploadGuard,
    extractionAccountId: deps.extractionAccountId,
    sessions: new SessionStore(),
    cookieSecret: randomBytes(32).toString('hex'),
    log: deps.log,
  };
  for (const file of files) {
    const opened = await createUpload(services, scope, { fileName: file.fileName, size: file.bytes.length });
    for (let offset = 0; offset < file.bytes.length; offset += opened.chunkBytes) {
      await appendUpload(services, scope, opened.uploadId, offset, Readable.from([file.bytes.subarray(offset, offset + opened.chunkBytes)]));
    }
    const completed = await completeUpload(services, scope, opened.uploadId);
    if (completed.document.contentHash !== file.contentHash) throw new DemoSeedError(`${file.path} was stored under another content hash`);
  }
  written.push(...(await withRequest(deps.app, scope, (request) => writeOwnerAnswers(request, { seedId, answers: answers.filter((answer) => answer.step !== 1) }))));
  deps.log({ event: 'demo_answers_written', projectId, codes: [`answers:${written.length}`] });

  const analysis: DemoSeedReport['analysis'][number][] = [];
  if (deps.runner !== undefined) {
    // The worker's own step, as the analysis worker runs it (apps/api/src/worker-main.ts), with
    // no AI step after it: no recording exists to replay, and the seed never calls the model.
    const worker = new AnalysisWorker({ store: deps.app, files: deps.files, log: deps.log }, deps.runner, {
      workerId: 'demo-seed',
      serviceId: deps.extractionAccountId,
      gates: deps.gates,
      maxAttempts: 2,
      retryAfterSeconds: 0,
      staleAfterSeconds: 900,
    });
    for (const step of await worker.drain(files.length * 3)) {
      analysis.push({ kind: step.kind, ...('job' in step ? { documentId: step.job.documentId } : {}), ...('code' in step ? { code: step.code } : {}) });
    }
  }
  // Phase 5: the demo's first stored proposal, by the seed account as the demo's owner (no dialog, nothing blocked: rule
  // 7; every output "Not available yet" while no dataset is approved), and one exported proposal recorded by it.
  const { snapshotId } = await generateProposal(services, deps.gates, scope);
  const { outputId } = await recordExport(services, scope, snapshotId);
  deps.log({ event: 'demo_proposal_generated', projectId });
  deps.log({ event: 'demo_seed_finished', code: ai.outcome, projectId });
  return { outcome: 'seeded', projectId, seedAccountId: seedId, answers: written, documents: await documentsOf(deps, scope, files), analysis, ai, proposal: { snapshotId, outputId } };
}
