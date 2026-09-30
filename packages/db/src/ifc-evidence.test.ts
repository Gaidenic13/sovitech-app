/**
 * Migration 0013 and ./ifc-evidence.ts: the store of the gated IFC value path
 * (docs/adr/0033-ifc-value-path-api-half.md). Blocking: part of `pnpm test`. Every value is TEST
 * data; the database is a throwaway Testcontainers Postgres.
 *
 * - Every writer of the IFC value path reads `ifc-values` first and, closed (the production
 *   source, the only one outside tests/proposed/), refuses before it touches the request.
 * - No 2.4 path writes an IFC evidence entry: `insertCandidate` and `recordAssetAppearance`
 *   refuse one (G1-13's store side).
 * - The four tables are append-only, project-scoped and registered with the guards, which still
 *   hold. Their rows come from the extraction service account of the project only; an IFC entry
 *   belongs to a candidate its writer wrote, and is stored with its excerpt; a document value
 *   commits with a matched IFC entry, and nothing is stored for an erased document.
 * - The erasure (rule 13) erases the excerpt of every IFC entry that cites the document and
 *   withdraws the values that cite only removed documents.
 * The TypeScript gate cannot be opened here (only tests/proposed/ may), so the guards are
 * exercised with the rows the gated writer would write, inserted in the service account's request.
 */
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isIfcEvidence, type IfcEvidence } from '@sovitech/domain';
import { productionGateSource } from '@sovitech/registry/gates';
import { StoreRefusal } from './errors';
import { eraseDocument } from './guarded';
import { newId } from './ids';
import { IfcValuesClosed, insertIfcCandidate, recordIfcAppearance, recordIfcElement, recordIfcValueRefusal } from './ifc-evidence';
import { readAssetRegisterInputs, readFieldInputs } from './reads';
import { withRequest, type Request } from './request';
import { createTestAccount, createTestProject, createTestService, startTestDatabase, testContentHash, TEST_AREA_DEFINITION, type TestDatabase } from './testing';
import { createSubject, insertCandidate, recordAssetAppearance, registerDocument } from './writes';

const LONG = { timeout: 120_000 };
const GLOBAL_ID = 'TESTGID00000000000000P';
const FIELD = 'test.asset.power';

let database: TestDatabase;
let ownerId: string;
let otherOwnerId: string;
let projectId: string;
let otherProjectId: string;
let serviceId: string;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: '0013 owner', kind: 'person', roles: ['owner'] });
  otherOwnerId = await createTestAccount(database, { label: '0013 other owner', kind: 'person', roles: ['owner'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  otherProjectId = await createTestProject(database, { ownerId: otherOwnerId, isDemo: false });
  serviceId = await createTestService(database, { projectId, label: '0013' });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

async function refusalOf(work: Promise<unknown>): Promise<string | undefined> {
  try {
    await work;
  } catch (error) {
    if (error instanceof StoreRefusal) return error.refusal;
    throw error;
  }
  return undefined;
}

/** An owner's TEST model document. */
async function model(label: string): Promise<{ readonly documentId: string; readonly contentHash: string }> {
  const contentHash = testContentHash(`0013 ${label}`);
  const documentId = await withRequest(database.app, { userId: ownerId, projectId }, async (request) =>
    (await registerDocument(request, { contentHash, kind: 'other', stage: 'unknown', analysis: { status: 'stored_only', coverage: 'TEST' }, createdBy: ownerId })).id,
  );
  return { documentId, contentHash };
}

const STATEMENT = "#22=IFCPROPERTYSINGLEVALUE('TestPower',$,IFCPOWERMEASURE(7.5),$);";
const PATH = { kind: 'property', through: 'occurrence', propertySet: 'TEST_Pset', property: 'TestPower' } as const;

function ifcEntry(documentId: string, contentHash: string): IfcEvidence {
  return { documentId, contentHash, locator: {}, ifc: { schema: 'IFC4', globalId: GLOBAL_ID, stepIds: [22], path: PATH }, excerpt: STATEMENT, check: 'text_match' };
}

/** The rows the gated writer writes for a candidate's IFC entry, inserted as `writer` (the gate is not openable here). */
async function insertEntry(
  request: Request,
  input: { readonly owner: { readonly candidateId: string } | { readonly appearanceId: string }; readonly documentId: string; readonly contentHash: string; readonly writer: string; readonly excerpt?: boolean },
): Promise<string> {
  const id = newId();
  const candidateId = 'candidateId' in input.owner ? input.owner.candidateId : null;
  const appearanceId = 'appearanceId' in input.owner ? input.owner.appearanceId : null;
  await sql`INSERT INTO sovitech.ifc_evidence (id, project_id, candidate_id, appearance_id, ordinal, document_id, content_hash, ifc_schema, global_id, step_ids, path, evidence_check, created_by)
    VALUES (${id}, ${projectId}, ${candidateId}, ${appearanceId}, 0, ${input.documentId}, ${input.contentHash}, 'IFC4', ${GLOBAL_ID}, ${[22]}, ${JSON.stringify(PATH)}, 'text_match', ${input.writer})`.execute(request.trx);
  if (input.excerpt !== false) {
    await sql`INSERT INTO sovitech.ifc_evidence_excerpts (evidence_id, project_id, document_id, content_hash, text, created_by)
      VALUES (${id}, ${projectId}, ${input.documentId}, ${input.contentHash}, ${STATEMENT}, ${input.writer})`.execute(request.trx);
  }
  return id;
}

/** A TEST document value with one IFC entry, in the service account's request. */
async function ifcValue(documentId: string, contentHash: string, options: { readonly excerpt?: boolean; readonly writer?: string } = {}): Promise<{ readonly subjectId: string; readonly candidateId: string }> {
  return withRequest(database.app, { userId: serviceId, projectId }, async (request) => {
    const subject = await createSubject(request, { kind: 'asset', createdBy: serviceId });
    const candidateId = newId();
    await sql`INSERT INTO sovitech.candidates (id, project_id, subject_id, field_key, quantity_value, quantity_unit, source, original_text, created_by)
      VALUES (${candidateId}, ${projectId}, ${subject.id}, ${FIELD}, 7.5, 'kW', 'document', '7.5', ${serviceId})`.execute(request.trx);
    await insertEntry(request, { owner: { candidateId }, documentId, contentHash, writer: options.writer ?? serviceId, ...(options.excerpt === undefined ? {} : { excerpt: options.excerpt }) });
    return { subjectId: subject.id, candidateId };
  });
}

/** A request stand-in that fails any access: a closed gate must refuse before the store is touched. */
function untouchable(): { readonly request: Request; readonly touched: string[] } {
  const touched: string[] = [];
  const request = new Proxy({} as Request, {
    get(_target, property) {
      touched.push(String(property));
      throw new Error(`the store was reached (${String(property)}) with ifc-values closed`);
    },
  });
  return { request, touched };
}

describe('0013: the store of the gated IFC value path', LONG, () => {
  it('F-IFC-04 · F-VALUE-01: leaves every guard invariant holding, with the four tables registered, append-only and project-scoped', async () => {
    expect(await database.asAdministrator('SELECT problem FROM sovitech_guard.check_invariants()')).toEqual([]);
    expect(await database.asAdministrator('SELECT problem FROM sovitech_guard.unguarded_tables()')).toEqual([]);
    const tables = ['ifc_elements', 'ifc_evidence', 'ifc_evidence_excerpts', 'ifc_value_refusals'];
    const registered = await database.asAdministrator<{ table_name: string }>(
      'SELECT table_name FROM sovitech_guard.append_only_tables WHERE table_name = ANY ($1::text[]) ORDER BY 1',
      [tables],
    );
    expect(registered.map((row) => row.table_name)).toEqual(tables);
    const scoped = await database.asAdministrator<{ table_name: string }>('SELECT table_name FROM sovitech_guard.project_tables WHERE table_name = ANY ($1::text[]) ORDER BY 1', [tables]);
    expect(scoped.map((row) => row.table_name)).toEqual(tables);
  });

  it('R-027 · F-IFC-04 · F-IFC-05 · prompt 3 5.4 · with ifc-values closed, every writer of the IFC value path refuses before it touches the request', async () => {
    const gates = productionGateSource();
    const { documentId, contentHash } = { documentId: newId(), contentHash: testContentHash('0013 untouched') };
    const entry = ifcEntry(documentId, contentHash);
    const { request, touched } = untouchable();
    const writes: readonly (() => Promise<unknown>)[] = [
      () => insertIfcCandidate(request, gates, { id: newId(), subjectId: newId(), fieldKey: FIELD, quantity: { value: 7.5, unit: 'kW' }, source: 'document', evidence: [entry], createdBy: serviceId }, { key: FIELD, kind: 'quantity', unit: 'kW' }),
      () => recordIfcAppearance(request, gates, { tagAsWritten: 'P-T1', evidence: [entry], createdBy: serviceId }),
      () => recordIfcElement(request, gates, { documentId, contentHash, globalId: GLOBAL_ID, stepId: 21, ifcClass: 'IFCPUMP', kind: 'element', createdBy: serviceId }),
      () => recordIfcValueRefusal(request, gates, { documentId, contentHash, proposalId: 'p1', globalId: GLOBAL_ID, fieldKey: FIELD, stepIds: [22], code: 'unit_undeclared', createdBy: serviceId }),
    ];
    for (const write of writes) await expect(write()).rejects.toBeInstanceOf(IfcValuesClosed);
    expect(touched).toEqual([]);
  });

  it('G1-13 (store side) · no 2.4 path writes an IFC evidence entry: insertCandidate and recordAssetAppearance refuse one, and nothing is stored', async () => {
    const { documentId, contentHash } = await model('2.4 path');
    const candidateId = newId();
    await expect(
      withRequest(database.app, { userId: serviceId, projectId }, async (request) => {
        const subject = await createSubject(request, { kind: 'building', createdBy: serviceId });
        return insertCandidate(
          request,
          { id: candidateId, subjectId: subject.id, fieldKey: TEST_AREA_DEFINITION.key, quantity: { value: 7.5, unit: 'm2' }, source: 'document', evidence: [ifcEntry(documentId, contentHash)], createdBy: serviceId },
          TEST_AREA_DEFINITION,
        );
      }),
    ).rejects.toThrow(/insertCandidate refuses it/);
    await expect(
      withRequest(database.app, { userId: serviceId, projectId }, (request) => recordAssetAppearance(request, { tagAsWritten: 'P-T1', evidence: [ifcEntry(documentId, contentHash)], createdBy: serviceId })),
    ).rejects.toThrow(/recordAssetAppearance refuses it/);
    expect(await database.asAdministrator('SELECT id FROM sovitech.candidates WHERE id = $1', [candidateId])).toEqual([]);
  });

  it('F-IFC-04 · F-EXTRACT-04: commits a document value with its IFC entry and reads it back with no 2.4 locator; refuses one with no evidence, an entry with no excerpt, and an entry from another writer', async () => {
    const { documentId, contentHash } = await model('value');
    const { subjectId, candidateId } = await ifcValue(documentId, contentHash);
    const inputs = await withRequest(database.app, { userId: ownerId, projectId }, (request) => readFieldInputs(request, { subjectId, fieldKey: FIELD }));
    const [candidate] = inputs.candidates;
    expect(candidate?.id).toBe(candidateId);
    const [entry] = candidate?.evidence ?? [];
    expect(entry !== undefined && isIfcEvidence(entry)).toBe(true);
    expect(entry).toEqual(ifcEntry(documentId, contentHash));

    expect(
      await refusalOf(
        withRequest(database.app, { userId: serviceId, projectId }, async (request) => {
          const subject = await createSubject(request, { kind: 'asset', createdBy: serviceId });
          await sql`INSERT INTO sovitech.candidates (id, project_id, subject_id, field_key, text_value, source, created_by)
            VALUES (${newId()}, ${projectId}, ${subject.id}, ${FIELD}, 'TEST', 'document', ${serviceId})`.execute(request.trx);
        }),
      ),
    ).toBe('candidate_without_evidence');
    expect(await refusalOf(ifcValue(documentId, contentHash, { excerpt: false }))).toBe('evidence_without_excerpt');
    expect(await refusalOf(ifcValue(documentId, contentHash, { writer: ownerId }))).toBe('ingestion_record_not_from_its_writer');
  });

  it('F-VALUE-01 · F-AUTH-03: keeps IFC rows append-only for every role and invisible to another project', async () => {
    const { documentId, contentHash } = await model('append only');
    await ifcValue(documentId, contentHash);
    await expect(database.asAdministrator("UPDATE sovitech.ifc_evidence SET ifc_schema = 'IFC2X3' WHERE document_id = $1", [documentId])).rejects.toThrow(/append-only/);
    await expect(database.asAdministrator('DELETE FROM sovitech.ifc_evidence_excerpts WHERE document_id = $1', [documentId])).rejects.toThrow(/erasure function/);
    const seen = await withRequest(database.app, { userId: otherOwnerId, projectId: otherProjectId }, async (request) => {
      const rows = await sql<{ n: number }>`SELECT (SELECT count(*) FROM sovitech.ifc_evidence) + (SELECT count(*) FROM sovitech.ifc_evidence_excerpts) AS n`.execute(request.trx);
      return rows.rows[0]?.n;
    });
    expect(String(seen)).toBe('0');
  });

  it('F-IFC-05 · F-VALUE-08: records an asset appearance with an IFC entry, read back into the register', async () => {
    const { documentId, contentHash } = await model('appearance');
    const appearanceId = newId();
    await withRequest(database.app, { userId: serviceId, projectId }, async (request) => {
      await sql`INSERT INTO sovitech.asset_appearances (id, project_id, asset_id, tag_as_written, created_by) VALUES (${appearanceId}, ${projectId}, NULL, NULL, ${serviceId})`.execute(request.trx);
      await insertEntry(request, { owner: { appearanceId }, documentId, contentHash, writer: serviceId });
    });
    const inputs = await withRequest(database.app, { userId: ownerId, projectId }, (request) => readAssetRegisterInputs(request));
    expect(inputs.appearances.find((appearance) => appearance.id === appearanceId)?.evidence).toEqual([ifcEntry(documentId, contentHash)]);
  });

  it('F-INGEST-07 · rule 13 · the erasure erases the excerpt of every IFC entry that cites the document, withdraws the values that cite only it, and refuses its IFC rows afterwards', async () => {
    const { documentId, contentHash } = await model('erasure');
    const { candidateId } = await ifcValue(documentId, contentHash);
    await withRequest(database.app, { userId: ownerId, projectId }, (request) => eraseDocument(request, { documentId, role: 'owner', reason: 'TEST' }));
    const excerpts = await database.asAdministrator<{ text: string; erased: boolean }>(
      'SELECT text, erased_at IS NOT NULL AS erased FROM sovitech.ifc_evidence_excerpts WHERE document_id = $1',
      [documentId],
    );
    expect(excerpts).toEqual([{ text: '[erased]', erased: true }]);
    const events = await database.asAdministrator<{ type: string; role: string; reason: string }>(
      'SELECT type, role, reason FROM sovitech.candidate_events WHERE candidate_id = $1',
      [candidateId],
    );
    expect(events).toEqual([{ type: 'withdrawn', role: 'system', reason: 'document_erased' }]);
    expect(await refusalOf(ifcValue(documentId, contentHash))).toBe('document_erased');
  });
});
