/**
 * The data-access layer against a throwaway TEST database: what it stores reads
 * back as the domain's types and derives as the domain says; the storage checks
 * of rule 1, 2.4, 2.5, 2.7 and rule 8 (the unit check, verified evidence, the
 * first analysis event, the shape of alternative readings); the store's side of
 * G13-1 (evidence from another project); an asset seen in several documents
 * (2.3); and the one audited erasure of rule 13, with the writes that may no
 * longer follow it.
 *
 * Document values are written, as the ingestion path will write them, by a TEST
 * extraction service account that is a member of the project (2.1; the
 * candidate guard of 0009); owner values by the owner in their own name.
 */
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { derive, deriveAssetRegister, type Evidence, type FieldDefinition } from '@sovitech/domain';
import { unitByCode } from '@sovitech/registry';
import { addProjectMember, eraseDocument, openReviewItem } from './guarded';
import { newId } from './ids';
import { deriveContextFor, readAssetRegisterInputs, readFieldInputs, readProjectDocuments } from './reads';
import { withRequest, type Request, type RequestScope } from './request';
import {
  appendAssetEvent,
  appendCandidateEvent,
  appendDocumentEvent,
  assetForTag,
  createSubject,
  insertCandidate,
  recordAssetAppearance,
  recordProposalSnapshot,
  registerDocument,
  storeDocumentText,
  type NewCandidate,
} from './writes';
import {
  createTestAccount,
  createTestDocumentValue,
  createTestProject,
  createTestService,
  startTestDatabase,
  testContentHash,
  TEST_AREA_DEFINITION,
  TEST_AREA_FIELD,
  type TestDatabase,
} from './testing';

const LONG = { timeout: 120_000 };

/** A TEST registry entry: the strict defaults (no tolerance, estimation forbidden). */
const AREA: FieldDefinition = {
  key: TEST_AREA_FIELD,
  label: 'TEST gross floor area',
  subject: 'building',
  kind: 'quantity',
  unit: 'm2',
  qualifierRequired: true,
  qualifiers: ['gross_total', 'usable'],
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'owner',
};
const USABLE_AREA: FieldDefinition = { ...AREA, key: 'test.building.usable_area' };

let database: TestDatabase;
let ownerId: string;
let engineerId: string;
let serviceId: string;
let projectId: string;
let scope: RequestScope;
let serviceScope: RequestScope;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: 'store owner', kind: 'person', roles: ['owner'] });
  engineerId = await createTestAccount(database, { label: 'store engineer', kind: 'person', roles: ['sovitech_engineer'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  serviceId = await createTestService(database, { projectId, label: 'store' });
  scope = { userId: ownerId, projectId };
  serviceScope = { userId: serviceId, projectId };
}, 240_000);

afterAll(async () => {
  await database.stop();
});

function evidenceFrom(documentId: string, contentHash: string, excerpt: string, page = 1): Evidence {
  return { documentId, contentHash, locator: { page }, excerpt, check: 'text_match' };
}

/** A TEST document registered by the owner (an upload), with its first analysis event. */
function registerTestDocument(request: Request, contentHash: string) {
  return registerDocument(request, {
    contentHash,
    kind: 'architectural',
    stage: 'technical_design',
    analysis: { status: 'analysed', coverage: 'TEST page 1 of 1' },
    createdBy: request.userId,
  });
}

async function rowCount(table: string): Promise<number> {
  const [row] = await database.asAdministrator<{ count: number }>(`SELECT count(*)::int AS count FROM sovitech.${table} WHERE project_id = $1`, [projectId]);
  return row?.count ?? -1;
}

async function countableAssets(): Promise<{ readonly countable: readonly string[]; readonly withoutLiveEvidence: readonly string[] }> {
  return withRequest(database.app, scope, async (request) => deriveAssetRegister(await readAssetRegisterInputs(request)));
}

describe('what the layer stores reads back and derives', LONG, () => {
  it('a document value derives as known, with its evidence read back verbatim', async () => {
    const value = await createTestDocumentValue(database, { projectId, label: 'store derive' });
    await withRequest(database.app, scope, async (request) => {
      const inputs = await readFieldInputs(request, { subjectId: value.subjectId, fieldKey: TEST_AREA_FIELD });
      expect(inputs.candidates).toHaveLength(1);
      expect(inputs.candidates[0]).toMatchObject({
        id: value.candidateId,
        source: 'document',
        quantity: { value: 1234.5, unit: 'm2', qualifier: 'gross_total' },
        original: { text: '1.234,5 mp', locale: 'ro-RO' },
        evidence: [{ documentId: value.documentId, contentHash: value.contentHash, locator: { page: 1 }, check: 'text_match' }],
        createdBy: value.serviceId,
      });
      expect(inputs.candidates[0]?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/);
      const state = derive(AREA, inputs.candidates, inputs.events, deriveContextFor(inputs, { unit: unitByCode, inputState: () => undefined, datasetApproved: () => false }));
      expect(state).toMatchObject({ state: 'known', activeCandidateId: value.candidateId });
    });
  });

  it('a declared revision reads back as the record\'s supersedes, and code\'s proposal alone as a proposal', async () => {
    await withRequest(database.app, scope, async (request) => {
      const revA = await registerDocument(request, {
        contentHash: testContentHash('store rev A'),
        kind: 'mep',
        stage: 'technical_design',
        revision: 'TEST Rev. A',
        analysis: { status: 'analysed', coverage: 'TEST page 1 of 1' },
        createdBy: ownerId,
      });
      const revB = await registerDocument(request, {
        contentHash: testContentHash('store rev B'),
        kind: 'mep',
        stage: 'technical_design',
        revision: 'TEST Rev. B',
        supersedesProposed: revA.id,
        analysis: { status: 'analysed', coverage: 'TEST page 1 of 1' },
        createdBy: ownerId,
      });
      await appendDocumentEvent(request, { documentId: revB.id, type: 'declared_revision_of', revisionOf: revA.id, by: ownerId, role: 'owner' });
      const { documents, events } = await readProjectDocuments(request);
      expect(documents.find((document) => document.id === revB.id)).toMatchObject({ supersedes: revA.id, revision: 'TEST Rev. B' });
      expect(events).toContainEqual(expect.objectContaining({ documentId: revB.id, type: 'declared_revision_of', role: 'owner' }));
    });
  });

  it('a proposal snapshot keeps its candidate ids and formula versions', async () => {
    const value = await createTestDocumentValue(database, { projectId, label: 'store snapshot' });
    const snapshotId = await withRequest(database.app, scope, (request) =>
      recordProposalSnapshot(request, {
        inputsHash: testContentHash('store snapshot inputs'),
        candidateIds: [value.candidateId],
        formulas: [{ formulaId: 'test.formula', formulaVersion: '1.0.0' }],
        createdBy: ownerId,
      }),
    );
    const rows = await database.asAdministrator<{ candidate_id: string }>(
      'SELECT candidate_id FROM sovitech.proposal_snapshot_candidates WHERE snapshot_id = $1',
      [snapshotId],
    );
    expect(rows).toEqual([{ candidate_id: value.candidateId }]);
  });
});

describe('storage checks', LONG, () => {
  it('rule 1: a document candidate without evidence does not commit', async () => {
    const subject = await withRequest(database.app, serviceScope, (request) => createSubject(request, { kind: 'building', createdBy: serviceId }));
    const insert = `INSERT INTO sovitech.candidates (id, project_id, subject_id, field_key, quantity_value, quantity_unit, source, created_by)
                    VALUES ('${newId()}', '${projectId}', '${subject.id}', '${TEST_AREA_FIELD}', 1, 'm2', 'document', '${serviceId}')`;
    await expect(database.as('app', insert, [], serviceScope)).rejects.toMatchObject({ code: 'SVX01' });
  });

  it('rule 1 and 2.4: a document candidate whose only evidence is unverifiable does not commit; an inference on it does (capped low)', async () => {
    const value = await createTestDocumentValue(database, { projectId, label: 'store unverifiable' });
    const unverifiable: Evidence = { ...evidenceFrom(value.documentId, value.contentHash, 'TEST 9031 m2'), check: 'unverifiable' };
    const before = await rowCount('candidates');
    const documentOnUnverifiable = withRequest(database.app, serviceScope, (request) =>
      insertCandidate(
        request,
        {
          id: newId(),
          subjectId: value.subjectId,
          fieldKey: TEST_AREA_FIELD,
          quantity: { value: 9031, unit: 'm2', qualifier: 'gross_total' },
          source: 'document',
          evidence: [unverifiable],
          createdBy: serviceId,
        },
        TEST_AREA_DEFINITION,
      ),
    );
    await expect(documentOnUnverifiable).rejects.toMatchObject({ refusal: 'candidate_without_evidence', sqlState: 'SVX01' });
    expect(await rowCount('candidates')).toBe(before);

    // Controls: the same value with one matched entry beside it; an inference on unverifiable evidence, at low confidence.
    const withMatch = await withRequest(database.app, serviceScope, (request) =>
      insertCandidate(
        request,
        {
          id: newId(),
          subjectId: value.subjectId,
          fieldKey: TEST_AREA_FIELD,
          quantity: { value: 9031, unit: 'm2', qualifier: 'gross_total' },
          source: 'document',
          evidence: [unverifiable, evidenceFrom(value.documentId, value.contentHash, 'TEST 9031 m2', 2)],
          createdBy: serviceId,
        },
        TEST_AREA_DEFINITION,
      ),
    );
    expect(withMatch.outcome).toBe('stored');
    const inference = await withRequest(database.app, serviceScope, (request) =>
      insertCandidate(
        request,
        {
          id: newId(),
          subjectId: value.subjectId,
          fieldKey: TEST_AREA_FIELD,
          quantity: { value: 9032, unit: 'm2', qualifier: 'gross_total' },
          source: 'ai_inference',
          confidence: 'low',
          evidence: [unverifiable],
          createdBy: serviceId,
        },
        TEST_AREA_DEFINITION,
      ),
    );
    expect(inference.outcome).toBe('stored');
  });

  it('2.7 and rule 8: a unit outside the registry, or of another dimension, on the quantity or an alternative reading, is refused and nothing is stored', async () => {
    const subject = await withRequest(database.app, scope, (request) => createSubject(request, { kind: 'building', createdBy: ownerId }));
    const answer = (quantity: NewCandidate['quantity'], extra: Partial<NewCandidate> = {}): NewCandidate => ({
      id: newId(),
      subjectId: subject.id,
      fieldKey: TEST_AREA_FIELD,
      ...(quantity === undefined ? {} : { quantity }),
      source: 'user',
      evidence: [],
      createdBy: ownerId,
      ...extra,
    });
    const before = await rowCount('candidates');
    const write = (candidate: NewCandidate, field = TEST_AREA_DEFINITION) =>
      withRequest(database.app, scope, (request) => insertCandidate(request, candidate, field));

    expect(await write(answer({ value: 9041, unit: 'TEST-banana', qualifier: 'gross_total' }))).toMatchObject({
      outcome: 'refused',
      refusal: 'unit_unknown',
      reading: 'quantity',
    });
    expect(await write(answer({ value: 9042, unit: 'kW', qualifier: 'gross_total' }))).toMatchObject({
      outcome: 'refused',
      refusal: 'dimension_mismatch',
      reading: 'quantity',
    });
    expect(
      await write(
        answer({ value: 9043, unit: 'm2', qualifier: 'gross_total' }, {
          alternatives: [
            { value: 9.043, unit: 'm2' },
            { value: 9043, unit: 'kWh' },
          ],
          confidence: 'low',
        }),
      ),
    ).toMatchObject({ outcome: 'refused', refusal: 'dimension_mismatch', reading: { alternative: 1 } });
    // A quantity on a field that takes none (a text field).
    const textField = { key: TEST_AREA_FIELD, kind: 'text' as const };
    expect(await write(answer({ value: 9044, unit: 'm2' }), textField)).toMatchObject({ outcome: 'refused', refusal: 'field_takes_no_quantity' });
    expect(await rowCount('candidates')).toBe(before);

    // The field handed in is the candidate's own.
    await expect(write(answer({ value: 9045, unit: 'm2' }), { ...TEST_AREA_DEFINITION, key: 'test.other_field' })).rejects.toThrow(
      /handed the field test\.other_field/,
    );
    // Control: the same answer in m2 is stored.
    expect(await write(answer({ value: 9046, unit: 'm2', qualifier: 'gross_total' }))).toMatchObject({ outcome: 'stored' });
  });

  it('rule 8: alternative readings that are not quantities (a text value, no unit, a blank unit) are refused by the store', async () => {
    const subject = await withRequest(database.app, scope, (request) => createSubject(request, { kind: 'building', createdBy: ownerId }));
    const insert = (alternatives: string): string =>
      `INSERT INTO sovitech.candidates (id, project_id, subject_id, field_key, quantity_value, quantity_unit, source, alternatives, confidence, created_by)
       VALUES ('${newId()}', '${projectId}', '${subject.id}', 'test.building.rooms', 9051, 'count', 'user', '${alternatives}', 'low', '${ownerId}')`;
    for (const malformed of [
      '[{"value":"TEST"},{"value":"TEST"}]',
      '[{"value":9051},{"value":9052}]',
      '[{"value":9051,"unit":" "},{"value":9052,"unit":"count"}]',
      '[[{"value":9051,"unit":"count"}],{"value":9052,"unit":"count"}]',
    ]) {
      await expect(database.as('app', insert(malformed), [], scope), malformed).rejects.toMatchObject({
        code: '23514',
        constraint: 'candidates_alternatives_shape',
      });
    }
    await expect(database.as('app', insert('[{"value":9.051,"unit":"count"},{"value":9051,"unit":"count","approximate":true}]'), [], scope)).resolves.toEqual([]);
  });

  it('2.3 and rule 12: a document is stored only with its first analysis event', async () => {
    const id = newId();
    const statements = [
      `INSERT INTO sovitech.subjects (id, project_id, kind, created_by) VALUES ('${id}', '${projectId}', 'document', '${ownerId}')`,
      `INSERT INTO sovitech.documents (id, project_id, content_hash, kind, stage, created_by)
       VALUES ('${id}', '${projectId}', '${testContentHash('store no analysis')}', 'other', 'unknown', '${ownerId}')`,
    ];
    await expect(database.as('app', statements.join(';'), [], scope)).rejects.toMatchObject({ code: 'SVX12' });
    expect(await database.asAdministrator('SELECT 1 FROM sovitech.documents WHERE id = $1', [id])).toEqual([]);
    // Control: registered with its analysis event, every read of the project still works.
    await withRequest(database.app, scope, async (request) => {
      await registerTestDocument(request, testContentHash('store with analysis'));
      expect((await readProjectDocuments(request)).documents.length).toBeGreaterThan(0);
    });
  });

  it('2.4: an evidence entry without its excerpt does not commit', async () => {
    const value = await createTestDocumentValue(database, { projectId, label: 'store excerpt' });
    const insert = `INSERT INTO sovitech.evidence_locators (id, project_id, candidate_id, ordinal, document_id, content_hash, page, evidence_check)
                    VALUES ('${newId()}', '${projectId}', '${value.candidateId}', 5, '${value.documentId}', '${value.contentHash}', 1, 'text_match')`;
    await expect(database.as('app', insert, [], serviceScope)).rejects.toMatchObject({ code: 'SVX02' });
  });

  it('rule 13 and G13-1 at the store: evidence citing another project\'s document is refused and logged, and nothing is stored', async () => {
    const otherOwner = await createTestAccount(database, { label: 'store other owner', kind: 'person', roles: ['owner'] });
    const otherProject = await createTestProject(database, { ownerId: otherOwner, isDemo: false });
    const foreign = await createTestDocumentValue(database, { projectId: otherProject, label: 'store foreign' });
    const candidateId = newId();
    const written = await withRequest(database.app, serviceScope, async (request) => {
      const subject = await createSubject(request, { kind: 'building', createdBy: serviceId });
      return insertCandidate(
        request,
        {
          id: candidateId,
          subjectId: subject.id,
          fieldKey: TEST_AREA_FIELD,
          quantity: { value: 1234.5, unit: 'm2', qualifier: 'gross_total' },
          source: 'document',
          evidence: [evidenceFrom(foreign.documentId, foreign.contentHash, 'TEST foreign excerpt')],
          createdBy: serviceId,
        },
        TEST_AREA_DEFINITION,
      );
    });
    expect(written).toMatchObject({ outcome: 'rejected', refusal: 'document_in_project', evidenceIndex: 0 });
    const logged = await database.asAdministrator<{ project_id: string; type: string; reason: string }>(
      'SELECT project_id, type, reason FROM sovitech.guardrail_events WHERE id = $1',
      [written.outcome === 'rejected' ? written.guardrailEventId : ''],
    );
    expect(logged).toEqual([{ project_id: projectId, type: 'evidence_not_found', reason: 'document_in_project' }]);
    expect(await database.asAdministrator('SELECT 1 FROM sovitech.candidates WHERE id = $1', [candidateId])).toEqual([]);
  });

  it('rule 1 check 2 at the store: evidence naming another revision of a document of this project is refused and logged', async () => {
    const value = await createTestDocumentValue(database, { projectId, label: 'store revision hash' });
    const written = await withRequest(database.app, serviceScope, (request) =>
      insertCandidate(
        request,
        {
          id: newId(),
          subjectId: value.subjectId,
          fieldKey: TEST_AREA_FIELD,
          quantity: { value: 1234.5, unit: 'm2', qualifier: 'gross_total' },
          source: 'document',
          evidence: [evidenceFrom(value.documentId, testContentHash('another revision'), 'TEST excerpt')],
          createdBy: serviceId,
        },
        TEST_AREA_DEFINITION,
      ),
    );
    expect(written).toMatchObject({ outcome: 'rejected', refusal: 'content_hash' });
  });

  it('section 8 and rule 13: a guardrail event whose reason is document text is refused', async () => {
    const insert = `INSERT INTO sovitech.guardrail_events (id, project_id, type, reason, actor)
                    VALUES ('${newId()}', '${projectId}', 'evidence_not_found', 'Suprafata construita 1.234,5 mp', 'test')`;
    await expect(database.as('app', insert, [], scope)).rejects.toMatchObject({ code: '23514' });
  });

  it('2.4: not applicable only from a named owner or engineer with a reason', async () => {
    const subject = await withRequest(database.app, scope, (request) => createSubject(request, { kind: 'building', createdBy: ownerId }));
    const otherService = await createTestAccount(database, { label: 'store analysis service', kind: 'service', roles: [] });
    await withRequest(database.app, scope, (request) => addProjectMember(request, { projectId, userId: otherService }));
    const markedBy = (actor: string, role: string, reason: string): string =>
      `INSERT INTO sovitech.field_events (id, project_id, subject_id, field_key, type, actor, role, reason)
       VALUES ('${newId()}', '${projectId}', '${subject.id}', '${TEST_AREA_FIELD}', 'marked_not_applicable', '${actor}', '${role}', '${reason}')`;
    // The system (a service account's request) never marks a field not applicable: the CHECK refuses it.
    await expect(
      database.as('app', markedBy(otherService, 'system', 'TEST no parking'), [], { userId: otherService, projectId }),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(database.as('app', markedBy(ownerId, 'owner', ' '), [], scope)).rejects.toMatchObject({ code: '23514' });
    await expect(database.as('app', markedBy(ownerId, 'owner', 'TEST no parking on this site'), [], scope)).resolves.toEqual([]);
  });
});

describe('assets: one tag, one asset; engineer-only events (2.5)', LONG, () => {
  it('two spellings of one tag are one asset, and a second identity for the tag cannot be stored', async () => {
    const [first, second] = await withRequest(database.app, serviceScope, async (request) => [
      await assetForTag(request, { tagAsWritten: 'TEST-FCU-1', createdBy: serviceId }),
      await assetForTag(request, { tagAsWritten: ' test-fcu-1 ', createdBy: serviceId }),
    ]);
    expect(second).toEqual({ assetId: first?.assetId, normalisedTag: 'TEST-FCU-1', created: false });
    const insert = `WITH subject AS (
                      INSERT INTO sovitech.subjects (id, project_id, kind, created_by) VALUES ('${newId()}', '${projectId}', 'asset', 'test') RETURNING id)
                    INSERT INTO sovitech.asset_identities (asset_id, project_id, normalised_tag, created_by)
                    SELECT id, '${projectId}', 'TEST-FCU-1', 'test' FROM subject`;
    await expect(database.as('app', insert, [], scope)).rejects.toMatchObject({ code: '23505' });
  });

  it('an asset event from the owner is refused by the domain when it says so, and by the store when it claims the engineer role', async () => {
    const value = await createTestDocumentValue(database, { projectId, label: 'store assets' });
    const assetId = await withRequest(database.app, serviceScope, async (request: Request) => {
      await recordAssetAppearance(request, {
        tagAsWritten: 'TEST-AHU-9',
        evidence: [evidenceFrom(value.documentId, value.contentHash, 'TEST-AHU-9')],
        createdBy: serviceId,
      });
      return (await assetForTag(request, { tagAsWritten: 'TEST-AHU-9', createdBy: serviceId })).assetId;
    });
    const asOwner = await withRequest(database.app, scope, (request) =>
      appendAssetEvent(request, { assetId, type: 'removed', relatedAssetIds: [], by: ownerId, role: 'owner', reason: 'TEST' }),
    );
    expect(asOwner).toEqual({ outcome: 'refused', refusal: 'role_not_engineer' });
    const claimed = withRequest(database.app, scope, (request) =>
      appendAssetEvent(request, { assetId, type: 'removed', relatedAssetIds: [], by: ownerId, role: 'sovitech_engineer', reason: 'TEST' }),
    );
    await expect(claimed).rejects.toMatchObject({ refusal: 'asset_event_not_from_the_requesting_engineer' });
    const byEngineer = await withRequest(database.app, { userId: engineerId, projectId }, (request) =>
      appendAssetEvent(request, { assetId, type: 'removed', relatedAssetIds: [], by: engineerId, role: 'sovitech_engineer', reason: 'TEST duplicate' }),
    );
    expect(byEngineer).toMatchObject({ outcome: 'appended', event: { assetId, type: 'removed', by: engineerId } });
    const register = await withRequest(database.app, scope, readAssetRegisterInputs);
    expect(register.events).toHaveLength(1);
  });
});

describe('an asset seen in several documents keeps its evidence while any of them remains (2.3)', LONG, () => {
  it('the register carries every evidence entry of an appearance; the asset drops only when all its documents are removed', async () => {
    const [first, second] = await withRequest(database.app, scope, async (request) => [
      await registerTestDocument(request, testContentHash('store asset plan')),
      await registerTestDocument(request, testContentHash('store asset schedule')),
    ]);
    if (first === undefined || second === undefined) throw new Error('the TEST documents were not registered');
    const [shown, single] = await withRequest(database.app, serviceScope, async (request) => [
      await recordAssetAppearance(request, {
        tagAsWritten: 'TEST-CTA-77',
        evidence: [evidenceFrom(first.id, first.contentHash, 'TEST-CTA-77'), evidenceFrom(second.id, second.contentHash, 'TEST-CTA-77')],
        createdBy: serviceId,
      }),
      await recordAssetAppearance(request, {
        tagAsWritten: 'TEST-CTA-78',
        evidence: [evidenceFrom(first.id, first.contentHash, 'TEST-CTA-78')],
        createdBy: serviceId,
      }),
    ]);
    const both = shown?.assetId;
    const onlyFirst = single?.assetId;
    if (typeof both !== 'string' || typeof onlyFirst !== 'string') throw new Error('the TEST appearances joined no asset');
    const inputs = await withRequest(database.app, scope, readAssetRegisterInputs);
    const appearance = inputs.appearances.find((entry) => entry.tagAsWritten === 'TEST-CTA-77');
    expect(appearance?.evidence.map((entry) => entry.documentId)).toEqual([first.id, second.id]);
    expect((await countableAssets()).countable).toEqual(expect.arrayContaining([both, onlyFirst]));

    // The owner deletes the first document: the asset shown in both stays counted; the other drops.
    await withRequest(database.app, scope, (request) => appendDocumentEvent(request, { documentId: first.id, type: 'withdrawn', by: ownerId, role: 'owner' }));
    const afterDelete = await countableAssets();
    expect(afterDelete.countable).toContain(both);
    expect(afterDelete.countable).not.toContain(onlyFirst);
    expect(afterDelete.withoutLiveEvidence).toContain(onlyFirst);

    // The owner erases the second: now no document shows it, and it is not counted.
    await withRequest(database.app, scope, (request) => eraseDocument(request, { documentId: second.id, role: 'owner', reason: 'TEST owner request' }));
    const afterErasure = await countableAssets();
    expect(afterErasure.countable).not.toContain(both);
    expect(afterErasure.withoutLiveEvidence).toContain(both);
  });
});

describe('the one audited erasure (rule 13)', LONG, () => {
  interface Stored {
    readonly documentId: string;
    readonly candidateIds: string[];
  }

  const TEXT = 'TEST Suprafata utila 321,5 mp';
  let hashShared: string;
  let d1: Stored;
  let d2: Stored;
  let d3: string;
  let onlyD1: string;
  let d1AndD3: string;
  let onlyD2: string;
  let subjectId: string;

  async function candidateWith(request: Request, evidence: Evidence[]): Promise<string> {
    const id = newId();
    const written = await insertCandidate(
      request,
      {
        id,
        subjectId,
        fieldKey: USABLE_AREA.key,
        quantity: { value: 321.5, unit: 'm2', qualifier: 'usable' },
        source: 'document',
        evidence,
        createdBy: serviceId,
      },
      USABLE_AREA,
    );
    if (written.outcome !== 'stored') throw new Error(written.refusal);
    return id;
  }

  beforeAll(async () => {
    hashShared = testContentHash(`erasure shared ${projectId}`);
    const hash3 = testContentHash(`erasure third ${projectId}`);
    const [first, second, third] = await withRequest(database.app, scope, async (request) => {
      subjectId = (await createSubject(request, { kind: 'building', createdBy: ownerId })).id;
      // The same bytes uploaded twice (traceability 10.3 near miss 5).
      return [await registerTestDocument(request, hashShared), await registerTestDocument(request, hashShared), await registerTestDocument(request, hash3)];
    });
    if (first === undefined || second === undefined || third === undefined) throw new Error('the TEST documents were not registered');
    d3 = third.id;
    await withRequest(database.app, serviceScope, async (request) => {
      await storeDocumentText(request, { contentHash: hashShared, part: 'page:1', text: TEXT, createdBy: serviceId });
      await storeDocumentText(request, { contentHash: hash3, part: 'page:1', text: TEXT, createdBy: serviceId });
      onlyD1 = await candidateWith(request, [evidenceFrom(first.id, hashShared, TEXT)]);
      d1AndD3 = await candidateWith(request, [evidenceFrom(first.id, hashShared, TEXT), evidenceFrom(d3, hash3, TEXT)]);
      onlyD2 = await candidateWith(request, [evidenceFrom(second.id, hashShared, TEXT)]);
    });
    d1 = { documentId: first.id, candidateIds: [onlyD1, d1AndD3] };
    d2 = { documentId: second.id, candidateIds: [onlyD2] };
    await withRequest(database.app, scope, (request) =>
      appendCandidateEvent(request, { candidateId: onlyD1, type: 'user_confirmed', by: ownerId, role: 'owner' }),
    );
    await withRequest(database.app, { userId: engineerId, projectId }, (request) => openReviewItem(request, { candidateId: d1AndD3 }));
  });

  async function candidateRows(): Promise<string[]> {
    const rows = await database.asAdministrator<{ row: string }>(
      `SELECT row_to_json(candidate)::text AS row FROM sovitech.candidates AS candidate WHERE project_id = $1 ORDER BY id`,
      [projectId],
    );
    return rows.map((entry) => entry.row);
  }

  async function excerptOf(candidateId: string, documentId: string): Promise<string | undefined> {
    const [row] = await database.asAdministrator<{ text: string }>(
      `SELECT excerpt.text FROM sovitech.evidence_excerpts AS excerpt
         JOIN sovitech.evidence_locators AS locator ON locator.id = excerpt.evidence_id
        WHERE locator.candidate_id = $1 AND locator.document_id = $2`,
      [candidateId, documentId],
    );
    return row?.text;
  }

  async function withdrawnCandidates(): Promise<string[]> {
    const rows = await database.asAdministrator<{ candidate_id: string; role: string; reason: string }>(
      `SELECT candidate_id, role, reason FROM sovitech.candidate_events
        WHERE project_id = $1 AND type = 'withdrawn' AND candidate_id = ANY ($2::uuid[]) ORDER BY candidate_id`,
      [projectId, [onlyD1, d1AndD3, onlyD2]],
    );
    expect(rows.every((row) => row.role === 'system' && row.reason === 'document_erased')).toBe(true);
    return rows.map((row) => row.candidate_id);
  }

  it('refuses a caller who is neither the owner who asks nor the system', async () => {
    await expect(
      withRequest(database.app, { userId: engineerId, projectId }, (request) => eraseDocument(request, { documentId: d1.documentId, role: 'owner' })),
    ).rejects.toMatchObject({ refusal: 'erasure_role' });
    await expect(
      withRequest(database.app, scope, (request) => eraseDocument(request, { documentId: d1.documentId, role: 'system' })),
    ).rejects.toMatchObject({ refusal: 'erasure_role' });
  });

  it('erases the excerpts citing the document, keeps text another document of the project holds, withdraws what only it supported, and changes no value', async () => {
    const before = await candidateRows();
    const report = await withRequest(database.app, scope, (request) =>
      eraseDocument(request, { documentId: d1.documentId, role: 'owner', reason: 'TEST owner request' }),
    );
    expect(report).toMatchObject({
      role: 'owner',
      excerptsErased: 2,
      textPartsDeleted: 0,
      textKeptForAnotherDocument: true,
      candidatesWithdrawn: 1,
    });
    expect(await excerptOf(onlyD1, d1.documentId)).toBe('[erased]');
    expect(await excerptOf(d1AndD3, d1.documentId)).toBe('[erased]');
    expect(await excerptOf(d1AndD3, d3)).toBe(TEXT);
    expect(await excerptOf(onlyD2, d2.documentId)).toBe(TEXT);
    expect(await withdrawnCandidates()).toEqual([onlyD1]);
    expect(await candidateRows()).toEqual(before);
    const text = await database.asAdministrator('SELECT 1 FROM sovitech.document_texts WHERE project_id = $1 AND content_hash = $2', [
      projectId,
      hashShared,
    ]);
    expect(text).toHaveLength(1);
  });

  it('records one erased document event naming the owner, and an audit event with ids and counts, no document text', async () => {
    const events = await database.asAdministrator<{ actor: string; role: string }>(
      `SELECT actor, role FROM sovitech.document_events WHERE document_id = $1 AND type = 'erased'`,
      [d1.documentId],
    );
    expect(events).toEqual([{ actor: ownerId, role: 'owner' }]);
    const [audit] = await database.asAdministrator<{ actor_user_id: string; details: Record<string, unknown> }>(
      `SELECT actor_user_id, details FROM sovitech.audit_events WHERE document_id = $1 AND type = 'document_erased'`,
      [d1.documentId],
    );
    expect(audit?.actor_user_id).toBe(ownerId);
    expect(JSON.stringify(audit?.details)).not.toMatch(/Suprafata|TEST/);
  });

  it('refuses a second erasure of the same document', async () => {
    await expect(
      withRequest(database.app, scope, (request) => eraseDocument(request, { documentId: d1.documentId, role: 'owner' })),
    ).rejects.toMatchObject({ refusal: 'already_erased' });
  });

  it('deletes the shared text once no document of the project holds it, and derive reads the withdrawn values as removed', async () => {
    const report = await withRequest(database.app, scope, (request) =>
      eraseDocument(request, { documentId: d2.documentId, role: 'owner' }),
    );
    expect(report).toMatchObject({ textPartsDeleted: 1, textKeptForAnotherDocument: false, candidatesWithdrawn: 1 });
    expect(await withdrawnCandidates()).toEqual([onlyD1, onlyD2].sort());
    const text = await database.asAdministrator('SELECT 1 FROM sovitech.document_texts WHERE content_hash = $1', [hashShared]);
    expect(text).toEqual([]);
    await withRequest(database.app, scope, async (request) => {
      const inputs = await readFieldInputs(request, { subjectId, fieldKey: USABLE_AREA.key });
      const state = derive(USABLE_AREA, inputs.candidates, inputs.events, deriveContextFor(inputs, { unit: unitByCode, inputState: () => undefined, datasetApproved: () => false }));
      const statusOf = new Map(state.candidates.map((candidate) => [candidate.candidateId, candidate.status]));
      expect(statusOf.get(onlyD1)).toBe('withdrawn');
      expect(statusOf.get(onlyD2)).toBe('withdrawn');
      expect(statusOf.get(d1AndD3)).toBe('eligible');
    });
  });

  it('a project cannot see another project\'s erasure audit, and the operator sees the account events', async () => {
    const otherOwner = await createTestAccount(database, { label: 'store audit outsider', kind: 'person', roles: ['owner'] });
    const otherProject = await createTestProject(database, { ownerId: otherOwner, isDemo: false });
    const seen = await database.as<{ type: string }>('app', 'SELECT type FROM sovitech.audit_events', [], { userId: otherOwner, projectId: otherProject });
    expect(seen).toEqual([{ type: 'project_created' }]);
    const global = await database.as<{ type: string }>('operator', `SELECT DISTINCT type FROM sovitech.audit_events WHERE project_id IS NULL ORDER BY type`);
    expect(global.map((row) => row.type)).toEqual(['app_role_granted', 'app_user_created']);
  });
});

/**
 * Proposed case (for the integrator): after a document is erased, the extraction
 * job stores extracted text, a candidate's evidence excerpt or an asset
 * appearance that cites it: refused, and no text of the erased document is
 * stored (rule 13, "Erasure"; 2.3, "Erasure"). Phase 1 round 3, adversarial
 * finding "erasure then late writes" (probe E0 to E3).
 */
describe('nothing of an erased document comes back (rule 13, "Erasure")', LONG, () => {
  const LATE = 'TEST late text of the erased document';

  async function clearTextOf(contentHash: string): Promise<unknown[]> {
    return database.asAdministrator(
      `SELECT 'document_texts' AS at, text FROM sovitech.document_texts WHERE project_id = $1 AND content_hash = $2
       UNION ALL
       SELECT 'evidence_excerpts', text FROM sovitech.evidence_excerpts WHERE project_id = $1 AND content_hash = $2 AND text <> '[erased]'`,
      [projectId, contentHash],
    );
  }

  it('E0 to E3: after the owner erases a document, its extracted text, a new value citing it and an asset appearance citing it are refused', async () => {
    const value = await createTestDocumentValue(database, { projectId, label: 'store late writes' });
    const jobScope: RequestScope = { userId: value.serviceId, projectId };
    await withRequest(database.app, scope, (request) => eraseDocument(request, { documentId: value.documentId, role: 'owner', reason: 'TEST owner request' }));
    expect(await clearTextOf(value.contentHash)).toEqual([]);
    const cites: Evidence = evidenceFrom(value.documentId, value.contentHash, LATE, 2);
    const refused = { refusal: 'document_erased', sqlState: 'SVE11' };

    // E1: the extraction job, still running or retried, stores the text again.
    await expect(
      withRequest(database.app, jobScope, (request) => storeDocumentText(request, { contentHash: value.contentHash, part: 'page:2', text: LATE, createdBy: value.serviceId })),
    ).rejects.toMatchObject(refused);
    // E2: a new document value whose evidence cites the erased document, with its excerpt in clear.
    await expect(
      withRequest(database.app, jobScope, (request) =>
        insertCandidate(
          request,
          {
            id: newId(),
            subjectId: value.subjectId,
            fieldKey: TEST_AREA_FIELD,
            quantity: { value: 9061, unit: 'm2', qualifier: 'gross_total' },
            source: 'document',
            evidence: [cites],
            createdBy: value.serviceId,
          },
          TEST_AREA_DEFINITION,
        ),
      ),
    ).rejects.toMatchObject(refused);
    // E3: an asset appearance citing it.
    await expect(
      withRequest(database.app, jobScope, (request) => recordAssetAppearance(request, { tagAsWritten: 'TEST-VCV-61', evidence: [cites], createdBy: value.serviceId })),
    ).rejects.toMatchObject(refused);
    // An excerpt written after the erasure in the same transaction as its evidence entry.
    await expect(
      withRequest(database.app, jobScope, async (request) => {
        const other = await registerTestDocument(request, testContentHash('store late same transaction'));
        const candidateId = newId();
        const evidenceId = newId();
        await request.trx
          .insertInto('candidates')
          .values({ id: candidateId, project_id: projectId, subject_id: value.subjectId, field_key: TEST_AREA_FIELD, text_value: 'TEST', source: 'document', created_by: value.serviceId })
          .execute();
        await request.trx
          .insertInto('evidence_locators')
          .values({ id: evidenceId, project_id: projectId, candidate_id: candidateId, ordinal: 0, document_id: other.id, content_hash: other.contentHash, page: 1, evidence_check: 'text_match' })
          .execute();
        await eraseDocument(request, { documentId: other.id, role: 'system', reason: 'TEST job erasure' });
        await request.trx.insertInto('evidence_excerpts').values({ evidence_id: evidenceId, project_id: projectId, content_hash: other.contentHash, text: LATE }).execute();
      }),
    ).rejects.toMatchObject(refused);

    // E4: no text of the erased document is stored.
    expect(await clearTextOf(value.contentHash)).toEqual([]);
  });

  it('control: the same bytes uploaded again as a new document take text and evidence; the erased one still takes none (US-DOCS-21 AC8)', async () => {
    const value = await createTestDocumentValue(database, { projectId, label: 'store upload again' });
    const jobScope: RequestScope = { userId: value.serviceId, projectId };
    await withRequest(database.app, scope, (request) => eraseDocument(request, { documentId: value.documentId, role: 'owner' }));
    const again = await withRequest(database.app, scope, (request) => registerTestDocument(request, value.contentHash));
    await withRequest(database.app, jobScope, (request) =>
      storeDocumentText(request, { contentHash: value.contentHash, part: 'page:1', text: 'TEST text of the new upload', createdBy: value.serviceId }),
    );
    const written = await withRequest(database.app, jobScope, (request) =>
      insertCandidate(
        request,
        {
          id: newId(),
          subjectId: value.subjectId,
          fieldKey: TEST_AREA_FIELD,
          quantity: { value: 9062, unit: 'm2', qualifier: 'gross_total' },
          source: 'document',
          evidence: [evidenceFrom(again.id, value.contentHash, 'TEST text of the new upload')],
          createdBy: value.serviceId,
        },
        TEST_AREA_DEFINITION,
      ),
    );
    expect(written.outcome).toBe('stored');
    await expect(
      withRequest(database.app, jobScope, (request) =>
        recordAssetAppearance(request, { tagAsWritten: 'TEST-VCV-62', evidence: [evidenceFrom(value.documentId, value.contentHash, 'TEST')], createdBy: value.serviceId }),
      ),
    ).rejects.toMatchObject({ refusal: 'document_erased' });
  });

  /** Waits until a session waits on an advisory lock (the erasure lock). */
  async function someoneWaitsOnTheErasureLock(): Promise<boolean> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const [row] = await database.asAdministrator<{ waiting: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_locks WHERE locktype = 'advisory' AND NOT granted) AS waiting`,
      );
      if (row?.waiting === true) return true;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return false;
  }

  /** A promise and the function that settles it. */
  function gate(): { readonly opened: Promise<void>; readonly open: () => void } {
    let open = (): void => undefined;
    const opened = new Promise<void>((resolve) => {
      open = resolve;
    });
    return { opened, open };
  }

  it('a value written while the erasure runs: the erasure waits for it, then erases its excerpt and withdraws it', async () => {
    const value = await createTestDocumentValue(database, { projectId, label: 'store in flight' });
    const jobScope: RequestScope = { userId: value.serviceId, projectId };
    const inFlight = newId();
    const wrote = gate();
    const release = gate();
    const job = withRequest(database.app, jobScope, async (request) => {
      const written = await insertCandidate(
        request,
        {
          id: inFlight,
          subjectId: value.subjectId,
          fieldKey: TEST_AREA_FIELD,
          quantity: { value: 9063, unit: 'm2', qualifier: 'gross_total' },
          source: 'document',
          evidence: [evidenceFrom(value.documentId, value.contentHash, LATE, 3)],
          createdBy: value.serviceId,
        },
        TEST_AREA_DEFINITION,
      );
      wrote.open();
      await release.opened;
      return written;
    });
    await wrote.opened;
    const erasure = withRequest(database.app, scope, (request) => eraseDocument(request, { documentId: value.documentId, role: 'owner' }));
    expect(await someoneWaitsOnTheErasureLock()).toBe(true);
    release.open();
    expect((await job).outcome).toBe('stored');
    expect(await erasure).toMatchObject({ excerptsErased: 2, candidatesWithdrawn: 2 });
    expect(await clearTextOf(value.contentHash)).toEqual([]);
    const withdrawn = await database.asAdministrator('SELECT 1 FROM sovitech.candidate_events WHERE candidate_id = $1 AND type = $2', [inFlight, 'withdrawn']);
    expect(withdrawn).toHaveLength(1);
  });

  it('a value written while the erasure has not committed: it waits, then is refused', async () => {
    const value = await createTestDocumentValue(database, { projectId, label: 'store erasure first' });
    const jobScope: RequestScope = { userId: value.serviceId, projectId };
    const erased = gate();
    const release = gate();
    const erasure = withRequest(database.app, scope, async (request) => {
      const report = await eraseDocument(request, { documentId: value.documentId, role: 'owner' });
      erased.open();
      await release.opened;
      return report;
    });
    await erased.opened;
    const job = withRequest(database.app, jobScope, (request) =>
      storeDocumentText(request, { contentHash: value.contentHash, part: 'page:3', text: LATE, createdBy: value.serviceId }),
    );
    expect(await someoneWaitsOnTheErasureLock()).toBe(true);
    release.open();
    await erasure;
    await expect(job).rejects.toMatchObject({ refusal: 'document_erased' });
    expect(await clearTextOf(value.contentHash)).toEqual([]);
  });

  it('a write of text or evidence, or an erasure, in a REPEATABLE READ transaction is refused (its snapshot could miss the erasure)', async () => {
    const value = await createTestDocumentValue(database, { projectId, label: 'store repeatable read' });
    /** A request in a REPEATABLE READ transaction, as a caller could open one. */
    const repeatableRead = <T>(userId: string, work: (request: Request) => Promise<T>): Promise<T> =>
      database.app.db
        .transaction()
        .setIsolationLevel('repeatable read')
        .execute(async (trx) => {
          await sql`SELECT pg_catalog.set_config('sovitech.user_id', ${userId}, true), pg_catalog.set_config('sovitech.project_id', ${projectId}, true)`.execute(trx);
          return work({ trx, userId, projectId });
        });
    await expect(
      repeatableRead(value.serviceId, (request) =>
        storeDocumentText(request, { contentHash: value.contentHash, part: 'page:4', text: LATE, createdBy: value.serviceId }),
      ),
    ).rejects.toMatchObject({ refusal: 'erasure_needs_read_committed', sqlState: 'SVE12' });
    await expect(
      repeatableRead(value.serviceId, (request) =>
        recordAssetAppearance(request, { tagAsWritten: 'TEST-VCV-64', evidence: [evidenceFrom(value.documentId, value.contentHash, LATE)], createdBy: value.serviceId }),
      ),
    ).rejects.toMatchObject({ sqlState: 'SVE12' });
    await expect(
      repeatableRead(ownerId, (request) => eraseDocument(request, { documentId: value.documentId, role: 'owner' })),
    ).rejects.toMatchObject({ sqlState: 'SVE12' });
    expect(await clearTextOf(value.contentHash)).toHaveLength(2);
  });
});
