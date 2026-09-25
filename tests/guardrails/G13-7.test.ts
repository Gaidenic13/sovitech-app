/**
 * G13-7 (docs/guardrails.md section 7; rule 13, "Isolation": "Logs and error reports never
 * contain document text"). Phase 1 review, adversarial finding 21.
 * Situation: a store write fails a check whose failing row holds document text.
 * Expected: neither the error the app receives nor the database server's log contains the text.
 *
 * A TEST database; each write goes through the data-access layer, the way the API writes. The
 * text is a visibly synthetic TEST excerpt with a distinctive mark. Three failing writes carry
 * it: a candidate whose original text is the excerpt and which fails a CHECK constraint; an
 * evidence entry whose excerpt is the text and whose locator fails a CHECK constraint; and an
 * account whose display name is the text (a table without row security, where Postgres would
 * otherwise put the failing row into the error detail). The error the layer throws carries
 * only the SQLSTATE and the names of the constraint, table and column, and the server log,
 * read past a marker logged after the failures, names the constraint but never the text.
 */
import { inspect } from 'node:util';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { StoreError, createAppUser, insertCandidate, newId, withRequest, type AccountKind, type RequestScope } from '@sovitech/db';
import {
  createTestAccount,
  createTestDocumentValue,
  createTestProject,
  startTestDatabase,
  TEST_AREA_DEFINITION,
  TEST_AREA_FIELD,
  type TestDatabase,
  type TestDocumentValue,
} from '@sovitech/db/testing';

const MARK = '9.876,5';
const DOCUMENT_TEXT = `TEST excerpt: Suprafata construita desfasurata ${MARK} mp`;

let database: TestDatabase;
let ownerId: string;
let projectId: string;
let scope: RequestScope;
let value: TestDocumentValue;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: 'G13-7 owner', kind: 'person', roles: ['owner'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  scope = { userId: ownerId, projectId };
  value = await createTestDocumentValue(database, { projectId, label: 'G13-7 schedule' });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

/** Every way the error could carry the text: its own fields, hidden ones, and its causes. */
function expectNoText(caught: unknown): void {
  expect(inspect(caught, { depth: 10, showHidden: true })).not.toContain(MARK);
  expect(JSON.stringify(caught)).not.toContain(MARK);
  expect(String(caught)).not.toContain(MARK);
  expect(caught).not.toHaveProperty('detail');
  expect(caught).not.toHaveProperty('cause');
}

async function failure(write: () => Promise<unknown>): Promise<unknown> {
  return write().then(
    () => new Error('TEST: the write was expected to fail'),
    (error: unknown) => error,
  );
}

test('F-AUDIT-01 · G13-7: failing writes that hold document text reach the app with no text, and the server log holds none', async () => {
  const candidate = await failure(() =>
    withRequest(database.app, scope, (request) =>
      insertCandidate(
        request,
        {
          id: newId(),
          subjectId: value.subjectId,
          fieldKey: TEST_AREA_FIELD,
          quantity: { value: 9876.5, unit: 'm2', qualifier: 'gross_total' },
          source: 'user',
          // A confidence belongs to an AI inference or an ambiguous reading only: the row fails a CHECK constraint.
          confidence: 'high',
          evidence: [],
          original: { text: DOCUMENT_TEXT, locale: 'ro-RO' },
          createdBy: ownerId,
        },
        TEST_AREA_DEFINITION,
      ),
    ),
  );
  expect(candidate).toBeInstanceOf(StoreError);
  expect(candidate).toMatchObject({ code: '23514' });
  expectNoText(candidate);

  // A document value comes from the extraction job's account (2.1), as the ingestion path will write it.
  const evidence = await failure(() =>
    withRequest(database.app, { userId: value.serviceId, projectId }, (request) =>
      insertCandidate(
        request,
        {
          id: newId(),
          subjectId: value.subjectId,
          fieldKey: TEST_AREA_FIELD,
          quantity: { value: 9876.5, unit: 'm2', qualifier: 'gross_total' },
          source: 'document',
          // Page 0 does not exist: the locator fails a CHECK constraint, with the excerpt in the same statement.
          evidence: [{ documentId: value.documentId, contentHash: value.contentHash, locator: { page: 0 }, excerpt: DOCUMENT_TEXT, check: 'text_match' }],
          original: { text: DOCUMENT_TEXT, locale: 'ro-RO' },
          createdBy: value.serviceId,
        },
        TEST_AREA_DEFINITION,
      ),
    ),
  );
  expect(evidence).toBeInstanceOf(StoreError);
  expect(evidence).toMatchObject({ code: '23514' });
  expectNoText(evidence);

  const account = await failure(() =>
    createAppUser(database.operator.db, { displayName: DOCUMENT_TEXT, kind: 'robot' as AccountKind, reason: 'TEST probe' }),
  );
  expect(account).toBeInstanceOf(StoreError);
  expect(account).toMatchObject({ code: '23514', constraint: 'app_users_kind_check' });
  expectNoText(account);

  // A marker the server logs after the failures, so the log is read past them.
  const marker = `TEST G13-7 log marker ${newId()}`;
  await database.asAdministrator(`DO $body$ BEGIN RAISE WARNING '${marker}'; END $body$`);
  let log = '';
  for (let attempt = 0; attempt < 50 && !log.includes(marker); attempt += 1) {
    log = database.serverLog();
    if (!log.includes(marker)) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  expect(log).toContain(marker);
  expect(log).toContain('app_users_kind_check');
  expect(log).not.toContain(MARK);
});

test('F-AUDIT-01 · G13-7: the database the app writes to logs tersely and never logs a failing statement', async () => {
  const settings = await database.as<{ verbosity: string; statement: string }>(
    'app',
    `SELECT current_setting('log_error_verbosity') AS verbosity, current_setting('log_min_error_statement') AS statement`,
  );
  expect(settings).toEqual([{ verbosity: 'terse', statement: 'panic' }]);
});
