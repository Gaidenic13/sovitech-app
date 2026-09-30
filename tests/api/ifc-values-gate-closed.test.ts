/**
 * With `ifc-values` closed, no path reaches the writes of the gated IFC value path
 * (apps/api/src/ingestion/ifc-values.ts, packages/db/src/ifc-evidence.ts;
 * docs/adr/0033-ifc-value-path-api-half.md; prompt 3 5.4: every gate starts closed, and gated
 * code is reachable only through the test-utils override of tests/proposed/). A blocking API test
 * over a TEST database, named after what it proves; not a case file (the value path is ifc-input
 * 6.2.1 to 6.2.3 and 6.2.10, proposals that indexing it would enact).
 *
 * A full pipeline run of all four fixture models, twice:
 * - the live dispatch path with the tests-only model-reading switch (the app reads no model until
 *   D-01: apps/api/src/documents/model-reading.ts): upload, the worker, the real IFC reader in this
 *   process, and the API's storing of its output, all with the production gate source;
 * - the worst case: the reader asked for IFC values with a TEST mapping table mounted (which the
 *   API never asks while the gate is closed), its output stored by the API's
 *   `storeExtractionOutput` with the production gate source.
 * Afterwards `insertCandidate` was never called with an IFC evidence entry (nor at all), no
 * writer of the value path was called, and the value path's tables and extracted-text parts hold
 * no row. The spies wrap the store's own functions (a dependency of the code under test), and the
 * rows are read back from the database.
 *
 * Every account, project and table is TEST data; the models are the generated synthetic fixtures.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';
import * as db from '@sovitech/db';
import { isIfcEvidence } from '@sovitech/domain';
import { parseExtractionOutput } from '@sovitech/extraction-contract';
import { checkedRequest, contentHashOf, main as readIfc, runIfcJob } from '@sovitech/ifc-reader';
import { productionGateSource } from '@sovitech/registry/gates';
import { EXTRACTION_LIMITS, storeExtractionOutput } from '../../apps/api/src/ingestion/extraction';
import { IFC_VALUE_PARTS } from '../../apps/api/src/ingestion/ifc-values';
import type { ExtractorRunner, SandboxJob, SandboxOutcome } from '../../apps/api/src/jobs/sandbox';
import { fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type TestApi } from '../guardrails/_support/api';
import { idsReference } from '../guardrails/_support/outputs';

vi.mock('@sovitech/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sovitech/db')>();
  return {
    ...actual,
    insertCandidate: vi.fn(actual.insertCandidate),
    insertIfcCandidate: vi.fn(actual.insertIfcCandidate),
    recordIfcAppearance: vi.fn(actual.recordIfcAppearance),
    recordIfcElement: vi.fn(actual.recordIfcElement),
    recordIfcValueRefusal: vi.fn(actual.recordIfcValueRefusal),
    // A control: the store's function the API does call for each model, spied the same way.
    recordModelRecord: vi.fn(actual.recordModelRecord),
  };
});

const MODELS = ['demo-hotel-arh', 'demo-hotel-mep-rev-a', 'demo-hotel-mep-rev-b', 'demo-hotel-mep-ifc2x3'] as const;
const WORK = mkdtempSync(join(tmpdir(), 'sovitech-ifc-values-closed-'));
const DATASET = { id: 'TEST-ifc-mapping', version: '0.0.1' };
const TEST_RULES = [
  { id: 'tag', mechanism: 'tag_source', fieldKey: 'asset.testTag', subjectKind: 'asset', sourceClaim: 'document', match: { attribute: 'Tag', requireLetter: true }, value: { kind: 'fact' } },
  { id: 'chiller', mechanism: 'direct_read', fieldKey: 'asset.testCoolingOutput', subjectKind: 'asset', sourceClaim: 'document', match: { propertySet: 'Pset_ChillerTypeCommon', property: 'ChillerCapacity' }, value: { kind: 'fact' } },
  { id: 'area', mechanism: 'quantity_set_area', fieldKey: 'zone.testArea', subjectKind: 'zone', sourceClaim: 'document', match: { objectKind: 'space', quantitySet: 'Qto_SpaceBaseQuantities', quantity: 'NetFloorArea' }, value: { kind: 'fact' } },
];

/** The worker's sandbox, with the IFC reader's command line run in this process on what the container would mount. */
class ReaderRunner implements ExtractorRunner {
  readonly jobs: SandboxJob[] = [];
  async run(job: SandboxJob): Promise<SandboxOutcome> {
    this.jobs.push(job);
    if (job.reader !== 'ifc-reader') return { outcome: 'failed', code: 'extractor_failed' };
    const status = await readIfc(
      ['--request', job.requestPath, '--document', job.inputPath, '--out', job.outputDirectory, ...(job.idsPath === undefined ? [] : ['--ids', job.idsPath])],
      () => undefined,
    );
    return status === 0 ? { outcome: 'finished' } : { outcome: 'failed', code: 'extractor_failed' };
  }
}

let api: TestApi;
let projectId: string;
const documents = new Map<string, string>();

beforeAll(async () => {
  api = await startTestApi({ readModels: true });
  const owner = await ownerWithProject(api, 'ifc-values closed, full pipeline');
  projectId = owner.projectId;
  const auth = await signIn(api, owner.ownerId);
  for (const model of MODELS) {
    const uploaded = await upload(api, auth, projectId, `${model}.ifc`, fixtureBytes(`fixtures/ifc/${model}.ifc`));
    documents.set(model, uploaded.body.documentId ?? '');
  }
}, 240_000);

afterAll(async () => {
  await api.stop();
  rmSync(WORK, { recursive: true, force: true });
});

describe('prompt 3 5.4 · ifc-values closed: no path reaches the IFC value path\'s writes', { timeout: 240_000 }, () => {
  it('US-IFC-01 · F-IFC-04 · ifc-input 6.2.1 · a full pipeline run of all four fixture models, the reader\'s values included, calls no writer of the value path and leaves its structure with no row', async () => {
    const runner = new ReaderRunner();
    const steps = await testWorker(api, runner, { ids: idsReference() }).drain();
    expect(steps.map((step) => step.kind)).toEqual(['done', 'done', 'done', 'done']);
    expect(runner.jobs.filter((job) => job.reader === 'ifc-reader')).toHaveLength(4);

    // The worst case: the reader asked for IFC values, with a TEST table mounted, and the output stored with every gate closed.
    const ids = idsReference();
    for (const model of MODELS) {
      const bytes = fixtureBytes(`fixtures/ifc/${model}.ifc`);
      const documentId = documents.get(model) ?? '';
      const folder = join(WORK, model);
      mkdirSync(join(folder, 'datasets'), { recursive: true });
      writeFileSync(join(folder, 'datasets', `${DATASET.id}@${DATASET.version}.json`), JSON.stringify({ ...DATASET, kind: 'ifc-mapping', rules: TEST_RULES }));
      const request = checkedRequest({
        contractVersion: '1.0.0',
        job: { projectId, documentId, contentHash: contentHashOf(bytes) },
        declaredFormat: 'ifc',
        ifcValues: true,
        datasets: [DATASET],
        ids: { id: ids.id, version: ids.version, draft: ids.draft, sha256: ids.sha256 },
        derivatives: [],
        limits: EXTRACTION_LIMITS,
      });
      const parsed = parseExtractionOutput(parse(JSON.stringify(await runIfcJob(request, bytes, { datasets: join(folder, 'datasets'), ids: ids.path })), { schema: 'json' }) as unknown);
      if (!parsed.ok) throw new Error(`${model}: the reader's output is refused`);
      expect(parsed.value.ifcValues, model).toBeDefined();
      const stored = await db.withRequest(api.database.app, { userId: api.extractionAccountId, projectId }, async (store) => {
        const document = (await db.readProjectDocuments(store)).documents.find((record) => record.id === documentId);
        if (document === undefined) throw new Error(`${model} is not stored`);
        return storeExtractionOutput(store, { document, output: parsed.value, serviceId: api.extractionAccountId, gates: productionGateSource() });
      });
      expect(stored, model).toMatchObject({ ifcValuesOpen: false });
      expect(stored.ifcValues, model).toBeUndefined();
    }

    // Control: the spies see the API's own calls (the worker's and storeExtractionOutput's model records).
    expect(vi.mocked(db.recordModelRecord).mock.calls.length).toBe(MODELS.length * 2);
    const insertCandidate = vi.mocked(db.insertCandidate);
    expect(insertCandidate.mock.calls.flatMap(([, candidate]) => candidate.evidence).some(isIfcEvidence)).toBe(false);
    expect(insertCandidate).not.toHaveBeenCalled();
    for (const writer of [db.insertIfcCandidate, db.recordIfcAppearance, db.recordIfcElement, db.recordIfcValueRefusal]) expect(vi.mocked(writer)).not.toHaveBeenCalled();

    const [rows] = await api.database.asAdministrator<{ n: number }>(
      `SELECT ((SELECT count(*) FROM sovitech.ifc_evidence WHERE project_id = $1)
       + (SELECT count(*) FROM sovitech.ifc_evidence_excerpts WHERE project_id = $1)
       + (SELECT count(*) FROM sovitech.ifc_elements WHERE project_id = $1)
       + (SELECT count(*) FROM sovitech.ifc_value_refusals WHERE project_id = $1)
       + (SELECT count(*) FROM sovitech.document_texts WHERE project_id = $1 AND (starts_with(part, $2) OR starts_with(part, $3)))
       + (SELECT count(*) FROM sovitech.candidates WHERE project_id = $1)
       + (SELECT count(*) FROM sovitech.asset_appearances WHERE project_id = $1))::int AS n`,
      [projectId, ...IFC_VALUE_PARTS],
    );
    expect(rows?.n).toBe(0);
  });
});
