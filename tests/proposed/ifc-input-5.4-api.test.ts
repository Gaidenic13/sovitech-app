/**
 * Proposed behaviour, not indexed (prompt 3 sections 5.4, 8 and 10, phase 2): ifc-input 5.4's
 * IFC-1 to IFC-14 through the API half of the IFC value path (apps/api/src/ingestion/ifc-values.ts,
 * packages/db/src/ifc-evidence.ts, packages/domain/src/ifc-evidence.ts; docs/adr/0033-ifc-value-path-api-half.md),
 * with gates opened by the test-utils override. The API server keeps the production gate source
 * (it refuses any other at start, prompt 3 5.4); the value path is driven here in process.
 *
 * How each model reaches the API half. Until the owner decides D-01, the live app registers an
 * uploaded model stored-only and queues no reader job (PRD R-023 and R-024, "Until decided";
 * apps/api/src/documents/model-reading.ts). So this suite uploads the fixture models through
 * the real upload routes (stored-only, "Not analysed: IFC model stored, not analysed"), runs the
 * IFC reader in this process on the stored bytes (its command line's job, packages/ifc-reader,
 * the container's entry point), with a request that asks for IFC values, mounts the draft IDS
 * and a TEST mapping table written here (its id says TEST: no SOVITECH table exists, and the API
 * itself mounts none, 6.2.10), and stores the output through the API's own
 * `storeExtractionOutput` in the extraction service account's request, as the worker would.
 *
 * The scenarios, one TEST project each, differ only in their gates:
 * - closed: the production source (every gate closed): nothing of the value path is stored;
 * - values: `ifc-values` only; the API's own request (no table) and the TEST table;
 * - full: `ifc-values`, `ifc-identity`, `ifc-code-inference`, `dataset-glossary`,
 *   `dataset-asset-taxonomy`, `ifc-areas` (not `ifc-units`, `ifc-geometry`, `ifc-untagged-count`,
 *   `ifc-hidden-content`);
 * - units: full and `ifc-units`; its IFC2X3 twin, for IFC-11;
 * - revision: full, rev A then rev B declared a revision of it (IFC-13).
 * What waits for later phases (the engine's sums, counts, conversions and points in phase 5; the
 * plan component in phase 4) is named in each title; the API half's part of the case is asserted.
 *
 * Every account, project, field and table is TEST data; the models are the generated synthetic
 * fixtures (fixtures/ifc/), with their ground truth (fixtures/ifc/ground-truth/).
 *
 * Ids: ifc-input 5.4 IFC-1 to IFC-14; R-022, R-023, R-027 to R-030, R-033, R-037 to R-039, R-041
 * (gated); F-INGEST-04, F-IFC-01, F-IFC-03 to F-IFC-05, F-IFC-08.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  addProjectMember,
  appendDocumentEvent,
  ensureBuildingSubject,
  eraseDocument,
  readAssetRegisterInputs,
  readFieldInputs,
  readIfcElements,
  readIfcValueRefusals,
  readProjectDocuments,
  withRequest,
  type Request,
  type StoredIfcElement,
} from '@sovitech/db';
import {
  derive,
  deriveAssetRegister,
  isIfcEvidence,
  revisionNotice,
  verifyIfcEvidence,
  type Candidate,
  type DocumentRecord,
  type EvidenceLocator,
  type FieldDefinition,
  type IfcProposal,
  type SubjectKind,
} from '@sovitech/domain';
import { openIfcValues, parseExtractionOutput, type ExtractionOutputView } from '@sovitech/extraction-contract';
import { checkedRequest, contentHashOf, runIfcJob } from '@sovitech/ifc-reader';
import { FIELD, productionRegistry, registryLookups, unitByCode } from '@sovitech/registry';
import { productionGateSource, REPO_ROOT, type GateId, type GateSource } from '@sovitech/registry/gates';
import { findReservedTerms } from '@sovitech/registry/reserved-terms';
import { openGateForTest } from '@sovitech/registry/test-utils';
import { readAiSearches, readCoverage, searchedCoverage } from '../../apps/api/src/documents/coverage';
import { projectDocuments } from '../../apps/api/src/documents/service';
import { EXTRACTION_LIMITS, extractionRequestFor, storeExtractionOutput, type OutputStored } from '../../apps/api/src/ingestion/extraction';
import { IFC_VALUE_PARTS, ifcEvidenceContext, ingestIfcProposal, statementPart } from '../../apps/api/src/ingestion/ifc-values';
import { ingestProposals } from '../../apps/api/src/ingestion/proposals';
import { documentList, fixtureBytes, ownerWithProject, signIn, startTestApi, upload, type Auth, type TestApi } from '../guardrails/_support/api';
import { idsReference } from '../guardrails/_support/outputs';

const G12_1_IFC = 'Not analysed: IFC model stored, not analysed';
const lookups = registryLookups(productionRegistry);
const WORK = mkdtempSync(join(tmpdir(), 'sovitech-proposed-ifc-api-'));
const DATASET = { id: 'TEST-ifc-mapping', version: '0.0.1' };

/** A TEST mapping table: synthetic field keys and choices, for this suite only (no SOVITECH table exists). */
const TEST_RULES = [
  { id: 'tag', mechanism: 'tag_source', fieldKey: 'asset.testTag', subjectKind: 'asset', sourceClaim: 'document', match: { attribute: 'Tag', requireLetter: true }, value: { kind: 'fact' } },
  { id: 'location', mechanism: 'relation', fieldKey: 'asset.testLocation', subjectKind: 'asset', sourceClaim: 'document', match: { relation: 'contained_in_spatial_structure' }, value: { kind: 'fact' } },
  { id: 'chiller', mechanism: 'direct_read', fieldKey: 'asset.testCoolingOutput', subjectKind: 'asset', sourceClaim: 'document', match: { propertySet: 'Pset_ChillerTypeCommon', property: 'ChillerCapacity' }, value: { kind: 'fact' } },
  { id: 'power', mechanism: 'direct_read', fieldKey: 'asset.testElectricalInput', subjectKind: 'asset', sourceClaim: 'document', match: { propertySet: 'Date tehnice', property: 'Putere electrică absorbită' }, value: { kind: 'fact' } },
  { id: 'airflow', mechanism: 'direct_read', fieldKey: 'asset.testAirflow', subjectKind: 'asset', sourceClaim: 'document', gates: ['ifc-units'], match: { propertySet: 'Date tehnice', property: 'Debit aer' }, value: { kind: 'fact' } },
  { id: 'net-area', mechanism: 'quantity_set_area', fieldKey: 'zone.testArea', subjectKind: 'zone', sourceClaim: 'document', match: { objectKind: 'space', quantitySet: 'Qto_SpaceBaseQuantities', quantity: 'NetFloorArea' }, value: { kind: 'fact' } },
  { id: 'gross-area', mechanism: 'quantity_set_area', fieldKey: 'zone.testArea', subjectKind: 'zone', sourceClaim: 'document', match: { objectKind: 'space', quantitySet: 'Qto_SpaceBaseQuantities', quantity: 'GrossFloorArea' }, value: { kind: 'fact' } },
  { id: 'ahu', mechanism: 'class_mapping', fieldKey: 'asset.testType', subjectKind: 'asset', sourceClaim: 'ai_inference', confidence: 'high', match: { ifcClass: 'IfcUnitaryEquipment', predefinedType: 'AIRHANDLER' }, value: { kind: 'choice', choice: 'test_ahu' } },
  { id: 'cta', mechanism: 'name_term', fieldKey: 'asset.testType', subjectKind: 'asset', sourceClaim: 'ai_inference', confidence: 'high', match: { tagPrefix: 'CTA' }, value: { kind: 'choice', choice: 'test_ahu' } },
  { id: 'vcv', mechanism: 'name_term', fieldKey: 'asset.testType', subjectKind: 'asset', sourceClaim: 'ai_inference', confidence: 'high', match: { tagPrefix: 'VCV' }, value: { kind: 'choice', choice: 'test_fan_coil' } },
  { id: 'ls-term', mechanism: 'name_term', fieldKey: 'asset.testLifeSafety', subjectKind: 'asset', sourceClaim: 'ai_inference', confidence: 'high', gates: ['dataset-asset-taxonomy'], match: { nameTerm: ['clapetă antifoc', 'desfumare'] }, value: { kind: 'choice', choice: 'test_life_safety' } },
  { id: 'ls-dual-use', mechanism: 'relation', fieldKey: 'asset.testLifeSafety', subjectKind: 'asset', sourceClaim: 'ai_inference', confidence: 'high', gates: ['dataset-asset-taxonomy'], match: { relation: 'assigns_to_group', groupNameTerm: ['desfumare'] }, value: { kind: 'choice', choice: 'test_life_safety' } },
  { id: 'storeys', mechanism: 'direct_read', fieldKey: FIELD.floors, subjectKind: 'building', sourceClaim: 'document', match: { objectKind: 'building', propertySet: 'Pset_BuildingCommon', property: 'NumberOfStoreys' }, value: { kind: 'fact' } },
  { id: 'level-type', mechanism: 'name_term', fieldKey: 'level.testLevelType', subjectKind: 'level', sourceClaim: 'ai_inference', confidence: 'low', match: { objectKind: 'storey', nameTerm: ['cotă atic'] }, value: { kind: 'choice', choice: 'test_not_a_floor' } },
];

/** A TEST field: an engineer's field that no output reads (the registry grows these fields in later phases). */
function testField(key: string, subject: SubjectKind, kind: FieldDefinition['kind'], extra: Partial<FieldDefinition> = {}): FieldDefinition {
  return { key, label: `TEST ${key}`, subject, kind, estimation: 'forbidden', criticality: 'optional', affects: [], impactRank: 900, confirmBy: 'engineer', ...extra };
}

const TEST_FIELDS: ReadonlyMap<string, FieldDefinition> = new Map(
  [
    testField('asset.testTag', 'asset', 'text'),
    testField('asset.testLocation', 'asset', 'text'),
    testField('asset.testCoolingOutput', 'asset', 'quantity', { unit: 'kW' }),
    testField('asset.testElectricalInput', 'asset', 'quantity', { unit: 'kW' }),
    testField('asset.testAirflow', 'asset', 'quantity', { unit: 'm3/h' }),
    testField('zone.testArea', 'zone', 'quantity', { unit: 'm2', qualifierRequired: true, qualifiers: ['ifc_net_floor_area', 'ifc_gross_floor_area'] }),
    testField('asset.testType', 'asset', 'enum', { options: ['test_ahu', 'test_fan_coil'] }),
    testField('asset.testLifeSafety', 'asset', 'enum', { options: ['test_life_safety'] }),
    testField('level.testLevelType', 'level', 'enum', { options: ['test_not_a_floor'] }),
    lookups.field(FIELD.floors) ?? testField(FIELD.floors, 'building', 'count'),
    lookups.field(FIELD.grossFloorArea) ?? testField(FIELD.grossFloorArea, 'building', 'quantity'),
  ].map((field) => [field.key, field]),
);
const testFields = (key: string): FieldDefinition | undefined => TEST_FIELDS.get(key);
function fieldOf(key: string): FieldDefinition {
  const field = TEST_FIELDS.get(key);
  if (field === undefined) throw new Error(`no TEST field ${key}`);
  return field;
}

const MODELS = {
  arh: 'demo-hotel-arh',
  revA: 'demo-hotel-mep-rev-a',
  revB: 'demo-hotel-mep-rev-b',
  x3: 'demo-hotel-mep-ifc2x3',
} as const;
type ModelKey = keyof typeof MODELS;

const truth = (model: string) =>
  JSON.parse(readFileSync(join(REPO_ROOT, 'fixtures/ifc/ground-truth', `${model}.json`), 'utf8')) as {
    elements: { key: string; globalId: string; tag: string | null; tagIsAuthoringId: boolean; hiddenLayer: boolean }[];
    storeys: { key: string; globalId: string; name: string }[];
    spaces: { key: string; globalId: string; name: string }[];
  };
function gid(model: string, key: string): string {
  const found = truth(model).elements.find((element) => element.key === key)?.globalId;
  if (found === undefined) throw new Error(`${model} has no element ${key}`);
  return found;
}

let api: TestApi;

interface Scenario {
  readonly projectId: string;
  readonly ownerId: string;
  readonly auth: Auth;
  readonly gates: GateSource;
  readonly documents: Map<ModelKey, string>;
  readonly outputs: Map<ModelKey, ExtractionOutputView>;
  readonly stored: Map<ModelKey, OutputStored>;
}

/** Gate sources opened by the test-utils override: ifc-values, and the others named, in order. */
function gatesWith(...more: readonly GateId[]): GateSource {
  return more.reduce<GateSource>((source, id) => openGateForTest(id, source), openGateForTest('ifc-values'));
}

async function newScenario(label: string, gates: GateSource): Promise<Scenario> {
  const { ownerId, projectId } = await ownerWithProject(api, label);
  // The extraction job's account, a member of the project (an upload adds it only when it queues a job:
  // no model is queued until D-01), on the operator's login as a test service is added.
  await addProjectMember(api.database.operator.db, { projectId, userId: api.extractionAccountId });
  const auth = await signIn(api, ownerId);
  return { projectId, ownerId, auth, gates, documents: new Map(), outputs: new Map(), stored: new Map() };
}

async function uploadModel(scenario: Scenario, key: ModelKey): Promise<string> {
  const name = `${MODELS[key]}.ifc`;
  const uploaded = await upload(api, scenario.auth, scenario.projectId, name, fixtureBytes(`fixtures/ifc/${name}`));
  const documentId = uploaded.body.documentId;
  if (documentId === undefined) throw new Error(`${name} was not uploaded: ${String(uploaded.status)}`);
  scenario.documents.set(key, documentId);
  return documentId;
}

function documentIdOf(scenario: Scenario, key: ModelKey): string {
  const id = scenario.documents.get(key);
  if (id === undefined) throw new Error(`${key} is not in this scenario`);
  return id;
}

/** The IFC reader on a stored model, with IFC values asked for and the TEST table mounted (or none), strictly parsed. */
async function readModel(scenario: Scenario, key: ModelKey, table: boolean): Promise<ExtractionOutputView> {
  const bytes = fixtureBytes(`fixtures/ifc/${MODELS[key]}.ifc`);
  const folder = mkdtempSync(join(WORK, `${key}-`));
  mkdirSync(join(folder, 'datasets'));
  writeFileSync(join(folder, 'datasets', `${DATASET.id}@${DATASET.version}.json`), JSON.stringify({ ...DATASET, kind: 'ifc-mapping', rules: TEST_RULES }));
  const ids = idsReference();
  const request = checkedRequest({
    contractVersion: '1.0.0',
    job: { projectId: scenario.projectId, documentId: documentIdOf(scenario, key), contentHash: contentHashOf(bytes) },
    declaredFormat: 'ifc',
    ifcValues: true,
    datasets: table ? [DATASET] : [],
    ids: { id: ids.id, version: ids.version, draft: ids.draft, sha256: ids.sha256 },
    derivatives: [],
    limits: EXTRACTION_LIMITS,
  });
  const output = await runIfcJob(request, bytes, { datasets: join(folder, 'datasets'), ids: ids.path });
  // Through JSON text, as the worker reads output.json.
  const parsed = parseExtractionOutput(parse(JSON.stringify(output), { schema: 'json' }) as unknown);
  if (!parsed.ok) throw new Error(`the reader's output is refused: ${JSON.stringify(parsed.problems)}`);
  return parsed.value;
}

async function asService<T>(scenario: Scenario, work: (request: Request) => Promise<T>): Promise<T> {
  return withRequest(api.database.app, { userId: api.extractionAccountId, projectId: scenario.projectId }, work);
}

async function documentOf(request: Request, documentId: string): Promise<DocumentRecord> {
  const found = (await readProjectDocuments(request)).documents.find((document) => document.id === documentId);
  if (found === undefined) throw new Error(`document ${documentId} is not in the project in scope`);
  return found;
}

/** Reads and stores one model of a scenario, through the API's own storeExtractionOutput. */
async function readAndStore(scenario: Scenario, key: ModelKey, options: { readonly table?: boolean; readonly gates?: GateSource } = {}): Promise<OutputStored> {
  const output = await readModel(scenario, key, options.table ?? true);
  scenario.outputs.set(key, output);
  const stored = await asService(scenario, async (request) =>
    storeExtractionOutput(request, {
      document: await documentOf(request, documentIdOf(scenario, key)),
      output,
      serviceId: api.extractionAccountId,
      gates: options.gates ?? scenario.gates,
      ifcFields: testFields,
    }),
  );
  scenario.stored.set(key, stored);
  return stored;
}

async function count(sql: string, parameters: readonly unknown[]): Promise<number | undefined> {
  return (await api.database.asAdministrator<{ n: number }>(sql, [...parameters]))[0]?.n;
}

async function candidatesOf(scenario: Scenario, subjectId: string, fieldKey: string): Promise<readonly Candidate[]> {
  return (await withRequest(api.database.app, { userId: scenario.ownerId, projectId: scenario.projectId }, (request) => readFieldInputs(request, { subjectId, fieldKey }))).candidates;
}

async function stateOf(scenario: Scenario, subjectId: string, fieldKey: string) {
  const inputs = await withRequest(api.database.app, { userId: scenario.ownerId, projectId: scenario.projectId }, (request) => readFieldInputs(request, { subjectId, fieldKey }));
  return {
    inputs,
    state: derive(fieldOf(fieldKey), inputs.candidates, inputs.events, {
      subjectId,
      document: (id) => inputs.documents.find((candidate) => candidate.id === id),
      inputState: () => undefined,
      datasetApproved: () => false,
      unit: unitByCode,
    }),
  };
}

async function elementsOf(scenario: Scenario, key?: ModelKey): Promise<StoredIfcElement[]> {
  return withRequest(api.database.app, { userId: scenario.ownerId, projectId: scenario.projectId }, (request) =>
    readIfcElements(request, key === undefined ? undefined : documentIdOf(scenario, key)),
  );
}

async function elementFor(scenario: Scenario, key: ModelKey, globalId: string): Promise<StoredIfcElement> {
  const found = (await elementsOf(scenario, key)).find((element) => element.globalId === globalId);
  if (found === undefined) throw new Error(`${globalId} is not in the register of ${key}`);
  return found;
}

async function subjectFor(scenario: Scenario, key: ModelKey, globalId: string): Promise<string> {
  const subjectId = (await elementFor(scenario, key, globalId)).subjectId;
  if (subjectId === undefined) throw new Error(`${globalId} of ${key} has no subject`);
  return subjectId;
}

async function refusalsOf(scenario: Scenario, key: ModelKey) {
  return withRequest(api.database.app, { userId: scenario.ownerId, projectId: scenario.projectId }, (request) => readIfcValueRefusals(request, documentIdOf(scenario, key)));
}

function reportOf(scenario: Scenario, key: ModelKey) {
  const report = scenario.stored.get(key)?.ifcValues;
  if (report === undefined || !report.open || !('outcomes' in report)) throw new Error(`${key} has no value path report`);
  return report;
}

let closed: Scenario;
let values: Scenario;
let noTable: Scenario;
let full: Scenario;
let units: Scenario;
let twin: Scenario;
let revision: Scenario;
let FULL: readonly GateId[];

beforeAll(async () => {
  api = await startTestApi();
  FULL = ['ifc-identity', 'ifc-code-inference', 'dataset-glossary', 'dataset-asset-taxonomy', 'ifc-areas'];

  closed = await newScenario('proposed IFC API, every gate closed', productionGateSource());
  for (const key of ['arh', 'revA', 'revB', 'x3'] as const) await uploadModel(closed, key);
  for (const key of ['arh', 'revA', 'revB', 'x3'] as const) await readAndStore(closed, key);

  noTable = await newScenario('proposed IFC API, ifc-values, no table', gatesWith());
  await uploadModel(noTable, 'arh');
  await uploadModel(noTable, 'revA');
  await readAndStore(noTable, 'arh', { table: false });
  await readAndStore(noTable, 'revA', { table: false });

  values = await newScenario('proposed IFC API, ifc-values only', gatesWith());
  await uploadModel(values, 'arh');
  await uploadModel(values, 'revA');
  await readAndStore(values, 'arh');
  await readAndStore(values, 'revA');

  full = await newScenario('proposed IFC API, full', gatesWith(...FULL));
  await uploadModel(full, 'arh');
  await uploadModel(full, 'revA');
  await readAndStore(full, 'arh');
  await readAndStore(full, 'revA');

  units = await newScenario('proposed IFC API, full with ifc-units', gatesWith(...FULL, 'ifc-units'));
  await uploadModel(units, 'revA');
  await readAndStore(units, 'revA');
  twin = await newScenario('proposed IFC API, IFC2X3 twin', gatesWith(...FULL, 'ifc-units'));
  await uploadModel(twin, 'x3');
  await readAndStore(twin, 'x3');

  revision = await newScenario('proposed IFC API, revision', gatesWith(...FULL));
  await uploadModel(revision, 'revA');
  await readAndStore(revision, 'revA');
  const revB = await uploadModel(revision, 'revB');
  await withRequest(api.database.app, { userId: revision.ownerId, projectId: revision.projectId }, (request) =>
    appendDocumentEvent(request, { documentId: revB, type: 'declared_revision_of', revisionOf: documentIdOf(revision, 'revA'), by: revision.ownerId, role: 'owner', reason: 'TEST declared revision' }),
  );
  await readAndStore(revision, 'revB');
}, 600_000);

afterAll(async () => {
  await api.stop();
  rmSync(WORK, { recursive: true, force: true });
});

const IFC_ROWS = `
  SELECT ((SELECT count(*) FROM sovitech.ifc_evidence WHERE project_id = $1)
       + (SELECT count(*) FROM sovitech.ifc_evidence_excerpts WHERE project_id = $1)
       + (SELECT count(*) FROM sovitech.ifc_elements WHERE project_id = $1)
       + (SELECT count(*) FROM sovitech.ifc_value_refusals WHERE project_id = $1)
       + (SELECT count(*) FROM sovitech.document_texts WHERE project_id = $1 AND (starts_with(part, $2) OR starts_with(part, $3))))::int AS n`;

describe('ifc-input 5.4 through the API half of the IFC value path, gates opened by the test-utils override', { timeout: 240_000 }, () => {
  it('IFC-1 · R-027 · prompt 3 5.4 · waits for ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10 (ifc-values): with every gate closed, a full run of all four fixture models, the reader\'s values included, stores nothing of the value path', async () => {
    for (const key of ['arh', 'revA', 'revB', 'x3'] as const) {
      expect(closed.stored.get(key)).toMatchObject({ ifcValuesOpen: false, modelRecord: true });
      expect(closed.stored.get(key)?.ifcValues).toBeUndefined();
      expect(openIfcValues(closed.outputs.get(key)?.ifcValues, productionGateSource())).toMatchObject({ open: false, reason: 'gate_closed' });
    }
    expect(await count(IFC_ROWS, [closed.projectId, ...IFC_VALUE_PARTS])).toBe(0);
    expect(await count('SELECT count(*)::int AS n FROM sovitech.candidates WHERE project_id = $1', [closed.projectId])).toBe(0);
    expect(await count('SELECT count(*)::int AS n FROM sovitech.asset_appearances WHERE project_id = $1', [closed.projectId])).toBe(0);
  });

  it('IFC-1 · IFC-7 · waits for ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10 (ifc-values) · R-027: the API asks for IFC values only while ifc-values reads open and mounts no mapping table (none is approved, GAP-I); with none mounted, the opened facts give no candidate', async () => {
    const job = { projectId: noTable.projectId, documentId: documentIdOf(noTable, 'arh'), contentHash: contentHashOf(fixtureBytes('fixtures/ifc/demo-hotel-arh.ifc')) };
    expect(extractionRequestFor(job, 'ifc', productionGateSource(), undefined)).toMatchObject({ ifcValues: false, datasets: [] });
    expect(extractionRequestFor(job, 'ifc', noTable.gates, undefined)).toMatchObject({ ifcValues: true, datasets: [] });
    for (const key of ['arh', 'revA'] as const) {
      const reading = openIfcValues(noTable.outputs.get(key)?.ifcValues, noTable.gates);
      expect(reading).toMatchObject({ open: true, candidateProposals: [], withheld: [] });
      expect(reading.open && reading.facts.length > 0).toBe(true);
      expect(reportOf(noTable, key).outcomes).toEqual([]);
    }
    expect(await count('SELECT count(*)::int AS n FROM sovitech.candidates WHERE project_id = $1', [noTable.projectId])).toBe(0);
  });

  it('IFC-1 · IFC-13 · waits for ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.4 (ifc-values, ifc-identity) · R-022 · R-023: each model keeps its G12-1 line and an unknown stage; with ifc-values alone, a direct read waits for a tag to find its asset (2.5), and every other mechanism waits for its own gate', async () => {
    for (const scenario of [values, full]) {
      const rows = await documentList(api, scenario.auth, scenario.projectId);
      for (const key of ['arh', 'revA'] as const) {
        expect(rows.find((row) => row['documentId'] === documentIdOf(scenario, key))).toMatchObject({ statusLine: { statusLineId: 'not_analysed', text: G12_1_IFC } });
      }
      const { documents } = await withRequest(api.database.app, { userId: scenario.ownerId, projectId: scenario.projectId }, (request) => readProjectDocuments(request));
      expect(documents.map((document) => [document.analysis.status, document.stage])).toEqual([
        ['stored_only', 'unknown'],
        ['stored_only', 'unknown'],
      ]);
    }
    expect(await count('SELECT count(*)::int AS n FROM sovitech.candidates WHERE project_id = $1', [values.projectId])).toBe(0);
    const revA = reportOf(values, 'revA');
    expect(new Set(revA.withheld.flatMap((item) => item.closedGates))).toEqual(
      new Set(['ifc-identity', 'ifc-code-inference', 'dataset-glossary', 'dataset-asset-taxonomy', 'ifc-units', 'ifc-areas']),
    );
    const codes = new Set(revA.outcomes.flatMap((outcome) => (outcome.outcome === 'refused' ? [outcome.code] : [])));
    expect(codes).toEqual(new Set(['subject_unresolved']));
    expect(revA.outcomes.every((outcome) => outcome.outcome !== 'stored')).toBe(true);
  });

  it('IFC-5 · waits for ifc-input 6.2.3 (ifc-values) · R-029: with ifc-values open the models are still no searched coverage, so no "Not found in the analysed documents" statement cites them, and the architectural model holds no chiller value', async () => {
    const { read, searched } = await withRequest(api.database.app, { userId: full.ownerId, projectId: full.projectId }, async (request) => {
      const { documents, statuses } = await projectDocuments(request);
      const searches = await readAiSearches(request, documents);
      return { read: readCoverage(documents, statuses.status), searched: searchedCoverage(documents, statuses.status, { ...searches, fieldKey: 'asset.testCoolingOutput' }) };
    });
    // Not even the upper bound of a "not found" statement holds a model (rule 12; G12-5).
    expect(read).toEqual([]);
    expect(searched).toEqual([]);
    const reading = openIfcValues(full.outputs.get('arh')?.ifcValues, full.gates);
    expect(reading.open && reading.facts.some((fact) => fact.locator.path.kind === 'property' && fact.locator.path.property === 'ChillerCapacity')).toBe(false);
  });

  it('IFC-1 · G1-13 · waits for ifc-input 6.2.1 (ifc-values): an IFC locator through the 2.4 ingestion path is refused at the locator check and logged evidence_not_found, and the field stays unknown', async () => {
    const reading = openIfcValues(noTable.outputs.get('arh')?.ifcValues, noTable.gates);
    const area = reading.open ? reading.facts.find((fact) => fact.locator.path.kind === 'property' && fact.locator.path.property === 'GrossPlannedArea') : undefined;
    if (area === undefined || area.value.kind !== 'real') throw new Error('the architectural model opened no GrossPlannedArea value');
    const building = await asService(noTable, (request) => ensureBuildingSubject(request, api.extractionAccountId));
    const outcomes = await asService(noTable, (request) =>
      ingestProposals(request, {
        projectId: noTable.projectId,
        serviceId: api.extractionAccountId,
        field: lookups.field,
        proposals: [
          {
            proposal: {
              subjectId: building,
              fieldKey: FIELD.grossFloorArea,
              quantity: { value: 1, unit: 'm2' },
              source: 'document',
              evidence: [
                {
                  documentId: documentIdOf(noTable, 'arh'),
                  contentHash: area.locator.contentHash,
                  locator: { ifc: { globalId: area.locator.globalId, stepIds: area.locator.stepIds, path: area.locator.path } } as unknown as EvidenceLocator,
                  excerpt: area.excerpt,
                },
              ],
            },
          },
        ],
      }),
    );
    expect(outcomes).toEqual([{ fieldKey: FIELD.grossFloorArea, outcome: 'rejected', code: 'locator_exists.ifc_field' }]);
    const events = await api.database.asAdministrator<{ type: string; reason: string }>(
      'SELECT type, reason FROM sovitech.guardrail_events WHERE project_id = $1 AND field_key = $2',
      [noTable.projectId, FIELD.grossFloorArea],
    );
    expect(events).toEqual([{ type: 'evidence_not_found', reason: 'locator_exists.ifc_field' }]);
    expect(await candidatesOf(noTable, building, FIELD.grossFloorArea)).toEqual([]);
  });

  it('IFC-1 · waits for ifc-input 6.2.1 (ifc-values): the IFC verifier compares an excerpt with the stored statement at its STEP id, so a changed line is refused at that check and logged, a GlobalId absent from the model at the locator check, and a path through the type object passes', async () => {
    const assetId = await subjectFor(full, 'revA', gid(MODELS.revA, 'CH-01'));
    const [stored] = await candidatesOf(full, assetId, 'asset.testCoolingOutput');
    const [entry] = stored?.evidence ?? [];
    if (stored === undefined || entry === undefined || !isIfcEvidence(entry)) throw new Error('CH-01 has no IFC-evidenced capacity');
    expect(stored).toMatchObject({ source: 'document', evidence: [{ check: 'text_match', locator: {}, ifc: { globalId: gid(MODELS.revA, 'CH-01'), path: { kind: 'property', property: 'ChillerCapacity' } } }] });
    const proposalWith = (excerpt: string, globalId: string): IfcProposal => ({
      subjectId: assetId,
      fieldKey: 'asset.testCoolingOutput',
      mechanism: 'direct_read',
      source: 'document',
      quantity: { value: 430000, unit: 'W' },
      evidence: [{ documentId: entry.documentId, contentHash: entry.contentHash, ifc: { ...entry.ifc, globalId }, excerpt }],
      valueFrom: { evidenceIndex: 0, literal: { typeName: 'IFCPOWERMEASURE', token: '430000.' } },
    });
    const place = { documentId: entry.documentId, contentHash: entry.contentHash, proposalId: 'test-tampered', globalId: entry.ifc.globalId, stepIds: entry.ifc.stepIds };
    const tampered = entry.excerpt.replace('430000.', '480000.');
    expect(tampered).not.toBe(entry.excerpt);
    const outcomes = await asService(full, async (request) => {
      const document = await documentOf(request, entry.documentId);
      const context = await ifcEvidenceContext(request, document);
      const field = fieldOf('asset.testCoolingOutput');
      return [
        await ingestIfcProposal(request, { gates: full.gates, serviceId: api.extractionAccountId, context, field, proposal: proposalWith(tampered, entry.ifc.globalId), refusal: place }),
        await ingestIfcProposal(request, { gates: full.gates, serviceId: api.extractionAccountId, context, field, proposal: proposalWith(entry.excerpt, 'TESTTESTTESTTESTTEST00'), refusal: place }),
      ];
    });
    expect(outcomes).toEqual([
      { outcome: 'refused', code: 'excerpt_at_locator' },
      { outcome: 'refused', code: 'locator_exists.global_id' },
    ]);
    const events = await api.database.asAdministrator<{ type: string; reason: string }>(
      `SELECT type, reason FROM sovitech.guardrail_events WHERE project_id = $1 AND subject_id = $2 AND field_key = 'asset.testCoolingOutput' ORDER BY at`,
      [full.projectId, assetId],
    );
    expect(events).toEqual([
      { type: 'evidence_not_found', reason: 'ifc.excerpt_at_locator' },
      { type: 'evidence_not_found', reason: 'ifc.locator_exists.global_id' },
    ]);
    expect((await candidatesOf(full, assetId, 'asset.testCoolingOutput')).map((candidate) => candidate.id)).toEqual([stored.id]);
    // A value held by the element's type object: its path goes through the type object, and it passes checks 1 to 4.
    const reading = openIfcValues(full.outputs.get('revA')?.ifcValues, full.gates);
    const typed = reading.open ? reading.facts.find((fact) => fact.locator.globalId === gid(MODELS.revA, 'P1.1') && fact.locator.path.kind === 'attribute' && fact.locator.path.through === 'type_object') : undefined;
    if (typed === undefined) throw new Error('P1.1 has no type-object attribute');
    const verdict = await asService(full, async (request) =>
      verifyIfcEvidence(
        [{ documentId: documentIdOf(full, 'revA'), contentHash: typed.locator.contentHash, ifc: { ...typed.locator, stepIds: [...typed.locator.stepIds] }, excerpt: typed.excerpt }],
        await ifcEvidenceContext(request, await documentOf(request, documentIdOf(full, 'revA'))),
      ),
    );
    expect(verdict.ok).toBe(true);
  });

  it('IFC-2 · waits for ifc-input 6.2.6 and 6.2.7 (ifc-areas, ifc-geometry) and the engine (phase 5): Cameră 104\'s quantity-set areas are stored under their IFC bases with no rule 4 conflict and nothing computed from shapes; the cross-check that makes both Please check and Etaj 1\'s "Incomplete: excludes Cameră 104" wait for 6.2.6, 6.2.7 and the engine', async () => {
    const space = truth(MODELS.arh).spaces.find((item) => item.name === '104');
    if (space === undefined) throw new Error('the architectural model has no space 104');
    const zone = await subjectFor(full, 'arh', space.globalId);
    const { inputs, state } = await stateOf(full, zone, 'zone.testArea');
    const byBasis = [...inputs.candidates].sort((a, b) => (a.quantity?.qualifier ?? '').localeCompare(b.quantity?.qualifier ?? ''));
    expect(byBasis.map((candidate) => [candidate.source, candidate.quantity])).toEqual([
      ['document', { value: 26.4, unit: 'm2', qualifier: 'ifc_gross_floor_area' }],
      ['document', { value: 26.4, unit: 'm2', qualifier: 'ifc_net_floor_area' }],
    ]);
    expect(state.state).toBe('known');
    expect(state.conflicts).toEqual([]);
    expect(await count(`SELECT count(*)::int AS n FROM sovitech.candidates WHERE project_id = $1 AND source <> 'document' AND source <> 'ai_inference'`, [full.projectId])).toBe(0);
    // With ifc-areas closed, no area from a quantity set.
    expect(await count(`SELECT count(*)::int AS n FROM sovitech.candidates WHERE project_id = $1 AND field_key = 'zone.testArea'`, [values.projectId])).toBe(0);
  });

  it('IFC-3 · waits for ifc-input 6.2.6 (ifc-areas) and the engine (phase 5): the register holds Subsol 2 as a level with no space in it, and no building area is summed from the model (the sum and its "Incomplete: excludes Subsol 2" are the engine\'s)', async () => {
    const storeys = (await elementsOf(full, 'arh')).filter((element) => element.kind === 'storey');
    expect(storeys).toHaveLength(6);
    expect(storeys.every((storey) => storey.subjectId !== undefined)).toBe(true);
    const subsol2 = truth(MODELS.arh).storeys.find((storey) => storey.key === 'S2')?.globalId;
    const spaces = (await elementsOf(full, 'arh')).filter((element) => element.kind === 'space');
    expect(spaces.length).toBeGreaterThan(0);
    expect(spaces.every((element) => element.container !== undefined)).toBe(true);
    expect(spaces.some((element) => element.container?.globalId === subsol2)).toBe(false);
    expect(await count('SELECT count(*)::int AS n FROM sovitech.candidates WHERE project_id = $1 AND field_key = $2', [full.projectId, FIELD.grossFloorArea])).toBe(0);
  });

  it('IFC-4 · waits for ifc-input 6.2.8 and 6.2.9 (ifc-code-inference, dataset-glossary): the six storeys are six levels and never a floor count, which is refused from the model and recorded for the engineer; "Cotă atic" is typed as not a floor by an inference, low', async () => {
    const building = await asService(full, (request) => ensureBuildingSubject(request, api.extractionAccountId));
    expect(await candidatesOf(full, building, FIELD.floors)).toEqual([]);
    expect((await refusalsOf(full, 'arh')).filter((refusal) => refusal.fieldKey === FIELD.floors).map((refusal) => refusal.code)).toEqual(['storey_count_not_floor_count']);
    const levels = new Set((await elementsOf(full, 'arh')).filter((element) => element.kind === 'storey').map((element) => element.subjectId));
    expect(levels.size).toBe(6);
    const atic = truth(MODELS.arh).storeys.find((storey) => storey.key === 'AT')?.globalId ?? '';
    const typed = await candidatesOf(full, await subjectFor(full, 'arh', atic), 'level.testLevelType');
    expect(typed.map((candidate) => [candidate.source, candidate.choice, candidate.confidence])).toEqual([['ai_inference', 'test_not_a_floor', 'low']]);
  });

  it('IFC-6 · waits for ifc-input 6.2.9, 6.2.12, dashboards 7.2.23 (ifc-code-inference, dataset-glossary, dataset-asset-taxonomy), a tag source from Name (6.2.4) and the points engine (phase 5): a life-safety signal on a tagged damper and on the dual-use fan is a capped inference; CA-2.04, whose Tag is an authoring id, is an untagged appearance, and its signal is refused and listed for the engineer, never lost silently', async () => {
    for (const key of ['CA-2.03', 'VE-P1']) {
      const flags = await candidatesOf(full, await subjectFor(full, 'revA', gid(MODELS.revA, key)), 'asset.testLifeSafety');
      expect(flags.length, key).toBeGreaterThan(0);
      expect(flags.every((flag) => flag.source === 'ai_inference' && flag.choice === 'test_life_safety' && flag.confidence === 'high'), key).toBe(true);
    }
    const ca204 = await elementFor(full, 'revA', gid(MODELS.revA, 'CA-2.04'));
    expect(ca204).toMatchObject({ kind: 'element' });
    expect(ca204.appearanceId).toBeDefined();
    expect(ca204.subjectId).toBeUndefined();
    const refused = (await refusalsOf(full, 'revA')).filter((refusal) => refusal.globalId === gid(MODELS.revA, 'CA-2.04') && refusal.fieldKey === 'asset.testLifeSafety');
    expect(refused.map((refusal) => refusal.code)).toContain('subject_unresolved');
  });

  it('IFC-7 · waits for ifc-input 6.2.1 (ifc-values) and the engine (phase 5): CH-01\'s capacity declared in W is stored as written, in W, with its STEP token kept as the original; the calculated kW is the engine\'s', async () => {
    const [capacity, ...rest] = await candidatesOf(full, await subjectFor(full, 'revA', gid(MODELS.revA, 'CH-01')), 'asset.testCoolingOutput');
    expect(rest).toEqual([]);
    expect(capacity).toMatchObject({ source: 'document', quantity: { value: 430000, unit: 'W' }, original: { text: '430000.' } });
    expect(await count(`SELECT count(*)::int AS n FROM sovitech.candidates WHERE project_id = $1 AND source = 'calculated'`, [full.projectId])).toBe(0);
  });

  it('IFC-8 · waits for ifc-input 6.2.11 (ifc-units) and the engine (phase 5): the airflow declared in m³/s gives no candidate: withheld with ifc-units named while that gate is closed, and refused and recorded for the engineer when it opens, since the registry has no m³/s and the conversion is the engine\'s', async () => {
    const cta01 = gid(MODELS.revA, 'CTA-01');
    expect(reportOf(full, 'revA').withheld.some((item) => item.closedGates.includes('ifc-units'))).toBe(true);
    expect(await candidatesOf(full, await subjectFor(full, 'revA', cta01), 'asset.testAirflow')).toEqual([]);
    expect(await candidatesOf(units, await subjectFor(units, 'revA', cta01), 'asset.testAirflow')).toEqual([]);
    const refused = (await refusalsOf(units, 'revA')).filter((refusal) => refusal.globalId === cta01 && refusal.fieldKey === 'asset.testAirflow');
    expect(refused.map((refusal) => refusal.code)).toEqual(['unit_conversion_not_built']);
  });

  it('IFC-9 · waits for ifc-input 6.2.1 (ifc-values) and 2.7: a power typed IfcReal gives no quantity candidate, is listed for the engineer at its statement, whose text stays in the model\'s extracted text; the same power with its unit is a document value', async () => {
    const p12 = gid(MODELS.revA, 'P1.2');
    expect(await candidatesOf(full, await subjectFor(full, 'revA', p12), 'asset.testElectricalInput')).toEqual([]);
    const [refusal, ...others] = (await refusalsOf(full, 'revA')).filter((item) => item.globalId === p12 && item.fieldKey === 'asset.testElectricalInput');
    expect(others).toEqual([]);
    expect(refusal?.code).toBe('unit_undeclared');
    const [stepId] = refusal?.stepIds ?? [];
    if (stepId === undefined) throw new Error('the refusal names no STEP id');
    const kept = await api.database.asAdministrator<{ text: string }>('SELECT text FROM sovitech.document_texts WHERE project_id = $1 AND part = $2', [
      full.projectId,
      statementPart(stepId),
    ]);
    expect(kept.map((row) => row.text.includes('IFCREAL('))).toEqual([true]);
    const [p11] = await candidatesOf(full, await subjectFor(full, 'revA', gid(MODELS.revA, 'P1.1')), 'asset.testElectricalInput');
    expect(p11).toMatchObject({ source: 'document', quantity: { value: 5.5, unit: 'kW' } });
  });

  it('IFC-10 · waits for ifc-input 6.2.4 and 6.2.5 (ifc-identity, ifc-untagged-count) and the engine (phase 5): the eight Etaj 2 fan coils, whose Tag is an authoring id, are untagged appearances listed as possible duplicates and never counted; the calculated, provisional count of 8 waits for 6.2.5 and the engine', async () => {
    const fanCoils = truth(MODELS.revA).elements.filter((element) => element.key.startsWith('FCU-E2#'));
    expect(fanCoils).toHaveLength(8);
    const appearances = await Promise.all(fanCoils.map(async (element) => elementFor(full, 'revA', element.globalId)));
    expect(appearances.every((element) => element.appearanceId !== undefined && element.subjectId === undefined)).toBe(true);
    const register = deriveAssetRegister(await withRequest(api.database.app, { userId: full.ownerId, projectId: full.projectId }, (request) => readAssetRegisterInputs(request)));
    for (const element of appearances) expect(register.possibleDuplicates).toContain(element.appearanceId);
    const vcv = await Promise.all(truth(MODELS.revA).elements.filter((element) => element.key.startsWith('VCV-1.')).map(async (element) => subjectFor(full, 'revA', element.globalId)));
    expect(new Set(vcv).size).toBe(8);
    for (const assetId of vcv) expect(register.countable).toContain(assetId);
  });

  it('IFC-11 · waits for ifc-input 6.2.1 and 6.2.4 (ifc-values, ifc-identity): the IFC2X3 copy gives the stored asset register rev A gives: the same tags, one asset each, and the same untagged appearances', async () => {
    const summary = async (scenario: Scenario) => {
      const inputs = await withRequest(api.database.app, { userId: scenario.ownerId, projectId: scenario.projectId }, (request) => readAssetRegisterInputs(request));
      const register = deriveAssetRegister(inputs);
      return {
        tags: inputs.identities.map((identity) => identity.normalisedTag).sort(),
        countable: register.countable.length,
        untagged: register.possibleDuplicates.length,
      };
    };
    const revA = await summary(units);
    expect(revA.tags.length).toBeGreaterThan(0);
    expect(await summary(twin)).toEqual(revA);
  });

  // IFC-12 runs in tests/proposed/IFC-12.test.ts (phase 4): the viewer spike's storey plan of the ARH fixture, with a
  // space's area printed into it, fails the render test (docs/adr/0046-viewer-spike.md).

  it('IFC-13 · waits for ifc-input 6.2.1, 6.2.2 and 6.2.4 (ifc-values, ifc-identity) · R-028: rev B, declared a revision of rev A, supersedes the one changed value (CH-01\'s capacity) with no conflict, and its one notice lists that change alone', async () => {
    const assetId = await subjectFor(revision, 'revA', gid(MODELS.revA, 'CH-01'));
    expect(await subjectFor(revision, 'revB', gid(MODELS.revB, 'CH-01'))).toBe(assetId);
    const { inputs, state } = await stateOf(revision, assetId, 'asset.testCoolingOutput');
    expect(state.state).toBe('known');
    expect(state.conflicts).toEqual([]);
    const active = inputs.candidates.find((candidate) => candidate.id === state.activeCandidateId);
    expect(active?.quantity).toEqual({ value: 450000, unit: 'W' });
    const revB = documentIdOf(revision, 'revB');
    const fields = await api.database.asAdministrator<{ subject_id: string; field_key: string }>(
      'SELECT DISTINCT subject_id, field_key FROM sovitech.candidates WHERE project_id = $1 ORDER BY subject_id, field_key',
      [revision.projectId],
    );
    const derived = await Promise.all(fields.map(async (row) => {
      const { inputs: fieldInputs, state: fieldState } = await stateOf(revision, row.subject_id, row.field_key);
      return { state: fieldState, candidates: fieldInputs.candidates };
    }));
    const { documents, events } = await withRequest(api.database.app, { userId: revision.ownerId, projectId: revision.projectId }, (request) => readProjectDocuments(request));
    const record = documents.find((document) => document.id === revB);
    if (record === undefined) throw new Error('rev B is not stored');
    const notice = revisionNotice(record, derived, events, (id) => documents.find((document) => document.id === id));
    expect(notice.changes).toEqual([expect.objectContaining({ subjectId: assetId, fieldKey: 'asset.testCoolingOutput', outcome: 'superseded' })]);
  });

  it('IFC-14 · waits for ifc-input 6.2.14: no model-check result arises (the IDS check waits, D-36), none reaches a candidate, event, question or open item, and the one owner-facing line about each model holds no reserved term', async () => {
    for (const scenario of [values, full, units, revision]) {
      expect(await count('SELECT count(*)::int AS n FROM sovitech.document_model_records WHERE project_id = $1 AND ids_results IS NOT NULL', [scenario.projectId])).toBe(0);
      for (const stored of scenario.stored.values()) expect(scenario.outputs.size > 0 && stored.modelRecord).toBe(true);
      for (const output of scenario.outputs.values()) expect(output.ifcModel?.ids).toBeUndefined();
      const rows = await documentList(api, scenario.auth, scenario.projectId);
      for (const row of rows) {
        const line = (row['statusLine'] as { text?: string } | undefined)?.text ?? '';
        expect(line).toBe(G12_1_IFC);
        expect(findReservedTerms(line)).toEqual([]);
      }
    }
    expect(await count(`SELECT count(*)::int AS n FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'question_for_known_field'`, [full.projectId])).toBe(0);
  });

  it('F-INGEST-07 · rule 13 · waits for ifc-input 6.2.1 (ifc-values): erasing a model erases the excerpt of every IFC evidence entry that cites it, withdraws its values, and leaves none of its statements', async () => {
    const documentId = documentIdOf(units, 'revA');
    const assetId = await subjectFor(units, 'revA', gid(MODELS.revA, 'CH-01'));
    await withRequest(api.database.app, { userId: units.ownerId, projectId: units.projectId }, (request) =>
      eraseDocument(request, { documentId, role: 'owner', reason: 'TEST erasure of a model' }),
    );
    expect(await count(`SELECT count(*)::int AS n FROM sovitech.ifc_evidence_excerpts WHERE project_id = $1 AND text <> '[erased]'`, [units.projectId])).toBe(0);
    expect(await count(`SELECT count(*)::int AS n FROM sovitech.ifc_evidence_excerpts WHERE project_id = $1`, [units.projectId])).toBeGreaterThan(0);
    expect(await count(`SELECT count(*)::int AS n FROM sovitech.document_texts WHERE project_id = $1 AND (starts_with(part, $2) OR starts_with(part, $3))`, [units.projectId, ...IFC_VALUE_PARTS])).toBe(0);
    const { state } = await stateOf(units, assetId, 'asset.testCoolingOutput');
    expect(state.state).toBe('unknown');
    const withdrawn = await count(
      `SELECT count(*)::int AS n FROM sovitech.candidate_events WHERE project_id = $1 AND type = 'withdrawn' AND reason = 'document_erased'`,
      [units.projectId],
    );
    expect(withdrawn).toBe(await count('SELECT count(*)::int AS n FROM sovitech.candidates WHERE project_id = $1', [units.projectId]));
  });
});
