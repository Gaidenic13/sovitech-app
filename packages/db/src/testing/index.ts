/**
 * @sovitech/db/testing: a throwaway TEST database for the store's own tests and
 * the guardrail cases that drive it (G1-14, G2-9, G3-16, G4-20 to G4-24, G4-31,
 * G8-4, G10-3, G10-8, G13-5 to G13-8). Never imported
 * by app code: dependency-cruiser's `db-testing-only-from-tests` rule lets only
 * tests/ and the store's own *.test.ts files reach it.
 *
 * Each call starts a Postgres container with Testcontainers (the image pinned by
 * digest in images.ts; the reaper too), applies the package's migrations and
 * opens a store per login role. Everything it creates is visibly synthetic: every
 * account and value is labelled TEST, and passwords are random per run.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import pg from 'pg';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';
import type { AppRole } from '@sovitech/domain';
import type { UnitCheckedField } from '@sovitech/registry';
import { openStore, type Store } from '../connection';
import { addProjectMember, createAppUser, createProject, grantAppRole } from '../guarded';
import { POSTGRES_IMAGE, RYUK_IMAGE } from '../images';
import { LOGIN_ROLES, loginUrl, runMigrations, type LoginRole } from '../migrate';
import { withRequest, type RequestScope } from '../request';
import type { AccountKind } from '../schema';
import { createSubject, insertCandidate, registerDocument, storeDocumentText } from '../writes';
import { newId } from '../ids';

/** The endpoint of the docker CLI's current context, when the CLI answers. */
function dockerContextHost(): string | undefined {
  try {
    return execFileSync('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}

/**
 * Points Testcontainers at the Docker engine the docker CLI uses, when
 * DOCKER_HOST is not set (Colima publishes its socket under the home folder, and
 * inside its VM at /var/run/docker.sock), and pins the reaper image.
 */
function configureTestcontainers(): void {
  process.env['RYUK_CONTAINER_IMAGE'] = RYUK_IMAGE;
  if (process.env['DOCKER_HOST'] !== undefined) return;
  const host = dockerContextHost();
  if (host === undefined || !host.startsWith('unix://')) return;
  process.env['DOCKER_HOST'] = host;
  if (host.includes('/.colima/') && process.env['TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE'] === undefined) {
    process.env['TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE'] = '/var/run/docker.sock';
  }
}

function randomPassword(): string {
  return randomBytes(24).toString('hex');
}

/** Who runs a raw statement: a login role, or the migrator acting as the table owner. */
export type TestActor = LoginRole | 'owner';

export interface TestDatabase {
  /** The database administrator's connection string (a superuser: sees every row). */
  readonly administratorUrl: string;
  /** A login role's connection string. */
  url(role: LoginRole): string;
  /** The app's store (sovitech_db_app), as the API uses it. */
  readonly app: Store;
  /** The operator's store (sovitech_db_admin). */
  readonly operator: Store;
  /** Runs one statement as the database administrator and returns its rows. */
  asAdministrator<R extends object = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<R[]>;
  /**
   * Runs one statement on a role's own connection, in a transaction that sets the
   * request scope when one is given. It rejects with the database's error.
   */
  as<R extends object = Record<string, unknown>>(
    actor: TestActor,
    text: string,
    values?: readonly unknown[],
    scope?: RequestScope,
  ): Promise<R[]>;
  /** Everything the Postgres server has logged so far (the container's output), to prove what it leaves out. */
  serverLog(): string;
  stop(): Promise<void>;
}

/** Starts a TEST database and applies every migration. Allow a minute for the first image start. */
export async function startTestDatabase(): Promise<TestDatabase> {
  configureTestcontainers();
  const administratorPassword = randomPassword();
  const container: StartedTestContainer = await new GenericContainer(POSTGRES_IMAGE)
    .withEnvironment({
      POSTGRES_USER: 'test_administrator',
      POSTGRES_PASSWORD: administratorPassword,
      POSTGRES_DB: 'sovitech_test',
    })
    .withCommand(['postgres', '-c', 'fsync=off', '-c', 'synchronous_commit=off', '-c', 'full_page_writes=off'])
    .withTmpFs({ '/var/lib/postgresql': 'rw' })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 2))
    .start();
  const administratorUrl = `postgres://test_administrator:${administratorPassword}@${container.getHost()}:${String(
    container.getMappedPort(5432),
  )}/sovitech_test`;
  const passwords: Record<LoginRole, string> = { migrator: randomPassword(), app: randomPassword(), operator: randomPassword() };
  try {
    await runMigrations({ administratorUrl, passwords });
  } catch (error) {
    await container.stop();
    throw error;
  }
  const url = (role: LoginRole): string => loginUrl(administratorUrl, LOGIN_ROLES[role], passwords[role]);
  const app = openStore(url('app'));
  const operator = openStore(url('operator'));

  async function run<R extends object>(
    connectionString: string,
    setup: readonly string[],
    text: string,
    values: readonly unknown[],
    scope: RequestScope | undefined,
  ): Promise<R[]> {
    const client = new pg.Client({ connectionString, options: '-c TimeZone=UTC' });
    await client.connect();
    try {
      for (const statement of setup) await client.query(statement);
      if (scope === undefined) return (await client.query<R>(text, [...values])).rows;
      await client.query('BEGIN');
      await client.query(
        `SELECT pg_catalog.set_config('sovitech.user_id', $1, true), pg_catalog.set_config('sovitech.project_id', $2, true)`,
        [scope.userId, scope.projectId ?? ''],
      );
      const rows = (await client.query<R>(text, [...values])).rows;
      await client.query('COMMIT');
      return rows;
    } finally {
      await client.end();
    }
  }

  return {
    administratorUrl,
    url,
    app,
    operator,
    asAdministrator: (text, values = []) => run(administratorUrl, [], text, values, undefined),
    as: (actor, text, values = [], scope) =>
      actor === 'owner'
        ? run(url('migrator'), ['SET ROLE sovitech_db_owner'], text, values, scope)
        : run(url(actor), [], text, values, scope),
    serverLog: () => {
      // Postgres logs to the container's stderr; `docker logs` returns all of it so far.
      const result = spawnSync('docker', ['logs', container.getId()], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      if (result.status !== 0) throw new Error(`docker logs failed: ${result.stderr}`);
      return `${result.stdout}${result.stderr}`;
    },
    stop: async () => {
      await app.close();
      await operator.close();
      await container.stop();
    },
  };
}

/** A TEST account with the given app roles, created and granted on the operator's login (audited). */
export async function createTestAccount(
  database: TestDatabase,
  input: { readonly label: string; readonly kind: AccountKind; readonly roles: readonly AppRole[] },
): Promise<string> {
  const userId = await createAppUser(database.operator.db, {
    displayName: `TEST ${input.label}`,
    kind: input.kind,
    reason: 'TEST setup',
  });
  for (const role of input.roles) {
    await grantAppRole(database.operator.db, { userId, role, reason: 'TEST setup' });
  }
  return userId;
}

/** A TEST project created by `ownerId`, who becomes its member. */
export async function createTestProject(
  database: TestDatabase,
  input: { readonly ownerId: string; readonly isDemo: boolean },
): Promise<string> {
  return withRequest(database.app, { userId: input.ownerId }, (request) => createProject(request, { isDemo: input.isDemo }));
}

/** A content hash for TEST bytes that exist nowhere: the SHA-256 of the label. */
export function testContentHash(label: string): string {
  return `sha256:${createHash('sha256').update(`TEST ${label}`, 'utf8').digest('hex')}`;
}

export const TEST_AREA_FIELD = 'test.building.gross_floor_area';

/** The TEST area field as the unit check reads it (insertCandidate): a quantity in m² (2.7). */
export const TEST_AREA_DEFINITION: UnitCheckedField = { key: TEST_AREA_FIELD, kind: 'quantity', unit: 'm2' };

/**
 * A TEST extraction service account, made a member of the project on the
 * operator's login (a job's account never decides who belongs to a project:
 * add_project_member, 0006). Document, AI, calculated, estimated and reference
 * values come only from such an account (2.1; the candidate guard of 0009).
 */
export async function createTestService(database: TestDatabase, input: { readonly projectId: string; readonly label: string }): Promise<string> {
  const serviceId = await createTestAccount(database, { label: `${input.label} extraction service`, kind: 'service', roles: [] });
  await addProjectMember(database.operator.db, { projectId: input.projectId, userId: serviceId });
  return serviceId;
}

/** What createTestDocumentValue stored. */
export interface TestDocumentValue {
  readonly subjectId: string;
  readonly documentId: string;
  readonly contentHash: string;
  readonly candidateId: string;
  /** The TEST extraction service account that wrote it, a member of the project. */
  readonly serviceId: string;
}

/**
 * One TEST value read from one TEST document, stored through the data-access
 * layer by a TEST extraction service account that is a member of the project
 * (as the ingestion path will write it): a building subject, a document with
 * its first analysis event and its extracted text, and a `document` candidate
 * with its verified evidence. Values are TEST values, never figures from the
 * mockups or the company files.
 */
export async function createTestDocumentValue(
  database: TestDatabase,
  input: { readonly projectId: string; readonly label: string },
): Promise<TestDocumentValue> {
  const contentHash = testContentHash(`${input.projectId} ${input.label}`);
  const excerpt = `TEST ${input.label}: Suprafata construita desfasurata 1.234,5 mp`;
  const serviceId = await createTestService(database, { projectId: input.projectId, label: input.label });
  return withRequest(database.app, { userId: serviceId, projectId: input.projectId }, async (request) => {
    const subject = await createSubject(request, { kind: 'building', createdBy: serviceId });
    const document = await registerDocument(request, {
      contentHash,
      kind: 'architectural',
      stage: 'technical_design',
      analysis: { status: 'analysed', coverage: 'TEST page 1 of 1' },
      createdBy: serviceId,
    });
    await storeDocumentText(request, { contentHash, part: 'page:1', text: excerpt, createdBy: serviceId });
    const candidateId = newId();
    const written = await insertCandidate(
      request,
      {
        id: candidateId,
        subjectId: subject.id,
        fieldKey: TEST_AREA_FIELD,
        quantity: { value: 1234.5, unit: 'm2', qualifier: 'gross_total' },
        source: 'document',
        evidence: [{ documentId: document.id, contentHash, locator: { page: 1 }, excerpt, check: 'text_match' }],
        original: { text: '1.234,5 mp', locale: 'ro-RO' },
        createdBy: serviceId,
      },
      TEST_AREA_DEFINITION,
    );
    if (written.outcome !== 'stored') throw new Error(`the TEST value was refused: ${written.refusal}`);
    return { subjectId: subject.id, documentId: document.id, contentHash, candidateId, serviceId };
  });
}
