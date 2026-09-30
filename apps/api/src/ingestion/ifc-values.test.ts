/**
 * The gated IFC value path's pure parts, and its closed gate (./ifc-values.ts;
 * docs/adr/0033-ifc-value-path-api-half.md). Blocking: part of `pnpm test`.
 *
 * - A STEP number token becomes a number only through the rule 8 parser, with the decimal mark
 *   STEP fixes (prompt 3 section 6: the extractor never parses numbers); a declared unit maps
 *   only to a registry unit it names exactly (2.7; ifc-input 4.1 item 4).
 * - With every gate closed (the production source), a full run of the four fixture models' outputs,
 *   their IFC values included, never reaches the store: the path returns before it reads or
 *   writes anything, and its store's writers refuse first (prompt 3 5.4). The store is a
 *   stand-in here that fails any access, so reaching it fails the test; the same run over a real
 *   TEST database, with no row written, is in tests/proposed/ifc-input-5.4-api.test.ts.
 *
 * The models are the generated synthetic fixtures; the mapping table is TEST data written here.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { Request } from '@sovitech/db';
import type { DocumentRecord } from '@sovitech/domain';
import { openIfcValues, parseExtractionOutput, type ExtractionOutputView } from '@sovitech/extraction-contract';
import { checkedRequest, contentHashOf, runIfcJob } from '@sovitech/ifc-reader';
import { productionGateSource } from '@sovitech/registry/gates';
import { EXTRACTION_LIMITS } from './extraction';
import { readStepNumber, registryUnitOf, stepNumberText, storeIfcValues } from './ifc-values';

const ROOT = new URL('../../../../', import.meta.url);
const WORK = mkdtempSync(join(tmpdir(), 'sovitech-ifc-values-unit-'));
const DATASET = { id: 'TEST-ifc-mapping', version: '0.0.1' };
const TEST_RULES = [
  { id: 'tag', mechanism: 'tag_source', fieldKey: 'asset.testTag', subjectKind: 'asset', sourceClaim: 'document', match: { attribute: 'Tag', requireLetter: true }, value: { kind: 'fact' } },
  { id: 'power', mechanism: 'direct_read', fieldKey: 'asset.testPower', subjectKind: 'asset', sourceClaim: 'document', match: { propertySet: 'Date tehnice', property: 'Putere electrică absorbită' }, value: { kind: 'fact' } },
  { id: 'area', mechanism: 'quantity_set_area', fieldKey: 'zone.testArea', subjectKind: 'zone', sourceClaim: 'document', match: { objectKind: 'space', quantitySet: 'Qto_SpaceBaseQuantities', quantity: 'NetFloorArea' }, value: { kind: 'fact' } },
];

afterAll(() => {
  rmSync(WORK, { recursive: true, force: true });
});

describe('numbers and units as the API reads them from a model', () => {
  it('F-IFC-04 · F-REGISTRY-03 · rule 8: turns a STEP number token into a plain decimal by moving the point, never by reading a number', () => {
    expect(stepNumberText('430000.')).toBe('430000');
    expect(stepNumberText('2.50')).toBe('2.5');
    expect(stepNumberText('-3250.')).toBe('-3250');
    expect(stepNumberText('1.5E3')).toBe('1500');
    expect(stepNumberText('1.5E-3')).toBe('0.0015');
    expect(stepNumberText('0.')).toBe('0');
    expect(stepNumberText('-0.')).toBe('0');
    expect(stepNumberText('1.2.3')).toBeUndefined();
    expect(stepNumberText('1.5E1234')).toBeUndefined();
    expect(stepNumberText("'7.5'")).toBeUndefined();
  });

  it('F-IFC-04 · F-REGISTRY-03 · rule 8: reads it through the rule 8 parser with the decimal point STEP fixes: one reading, never the Romanian thousands one', () => {
    expect(readStepNumber('123.456')).toBe(123.456);
    expect(readStepNumber('430000.')).toBe(430000);
    expect(readStepNumber('7')).toBe(7);
    expect(readStepNumber('.5')).toBeUndefined();
  });

  it('F-IFC-04 · F-REGISTRY-02 · rule 8: maps a declared SI unit to the registry unit it names, and nothing else (m³/s, J and absolute K are not in the registry: 6.2.11)', () => {
    const si = (unitType: string, name: string, prefix?: string) => ({ source: 'project_unit_assignment' as const, stepId: 1, unitKind: 'si' as const, unitType, name, ...(prefix === undefined ? {} : { prefix }) });
    expect(registryUnitOf(si('POWERUNIT', 'WATT'))).toBe('W');
    expect(registryUnitOf(si('POWERUNIT', 'WATT', 'KILO'))).toBe('kW');
    expect(registryUnitOf(si('LENGTHUNIT', 'METRE', 'MILLI'))).toBe('mm');
    expect(registryUnitOf(si('AREAUNIT', 'SQUARE_METRE'))).toBe('m2');
    expect(registryUnitOf(si('THERMODYNAMICTEMPERATUREUNIT', 'KELVIN'))).toBeUndefined();
    expect(registryUnitOf(si('ENERGYUNIT', 'JOULE'))).toBeUndefined();
    expect(registryUnitOf({ ...si('VOLUMETRICFLOWRATEUNIT', 'CUBIC_METRE^1 SECOND^-1'), unitKind: 'derived' })).toBeUndefined();
    expect(registryUnitOf({ ...si('POWERUNIT', 'WATT'), unitKind: 'conversion_based' })).toBeUndefined();
  });
});

/** The reader's output of a fixture model with IFC values asked for and a TEST table mounted, strictly parsed. */
async function readWithValues(model: string): Promise<{ readonly output: ExtractionOutputView; readonly document: DocumentRecord }> {
  const bytes = readFileSync(new URL(`fixtures/ifc/${model}.ifc`, ROOT));
  const folder = join(WORK, model);
  mkdirSync(join(folder, 'datasets'), { recursive: true });
  writeFileSync(join(folder, 'datasets', `${DATASET.id}@${DATASET.version}.json`), JSON.stringify({ ...DATASET, kind: 'ifc-mapping', rules: TEST_RULES }));
  const document: DocumentRecord = {
    id: '0192f0a0-0000-7000-8000-00000000c202',
    projectId: '0192f0a0-0000-7000-8000-00000000c201',
    contentHash: contentHashOf(bytes),
    kind: 'other',
    stage: 'unknown',
    analysis: { status: 'stored_only', coverage: 'TEST' },
  };
  const request = checkedRequest({
    contractVersion: '1.0.0',
    job: { projectId: document.projectId, documentId: document.id, contentHash: document.contentHash },
    declaredFormat: 'ifc',
    ifcValues: true,
    datasets: [DATASET],
    derivatives: [],
    limits: EXTRACTION_LIMITS,
  });
  const raw = await runIfcJob(request, bytes, { datasets: join(folder, 'datasets') });
  const parsed = parseExtractionOutput(parse(JSON.stringify(raw), { schema: 'json' }) as unknown);
  if (!parsed.ok) throw new Error(`the reader's output is refused: ${JSON.stringify(parsed.problems)}`);
  return { output: parsed.value, document };
}

/** A store stand-in that fails any access: the path must not reach the store while the gate is closed. */
function untouchableRequest(): { readonly request: Request; readonly touched: string[] } {
  const touched: string[] = [];
  const request = new Proxy({} as Request, {
    get(_target, property) {
      touched.push(String(property));
      throw new Error(`the IFC value path reached the store (${String(property)}) with ifc-values closed`);
    },
  });
  return { request, touched };
}

describe('prompt 3 5.4 · ifc-values closed: no path reaches the IFC value path\'s writes', { timeout: 120_000 }, () => {
  it('ifc-input 5.4 · waits for ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10 (ifc-values): for each of the four fixture models, the reader\'s values included, the path returns closed before it touches the store', async () => {
    for (const model of ['demo-hotel-arh', 'demo-hotel-mep-rev-a', 'demo-hotel-mep-rev-b', 'demo-hotel-mep-ifc2x3']) {
      const { output, document } = await readWithValues(model);
      const gates = productionGateSource();
      // The reader did emit values and proposals: only the gate keeps them out.
      expect(output.ifcValues, model).toBeDefined();
      expect(openIfcValues(output.ifcValues, gates), model).toMatchObject({ open: false, reason: 'gate_closed' });
      const { request, touched } = untouchableRequest();
      const report = await storeIfcValues(request, { document, output, serviceId: 'test-service', gates, field: () => undefined });
      expect(report, model).toEqual({ open: false, reason: 'gate_closed' });
      expect(touched, model).toEqual([]);
    }
  });
});
