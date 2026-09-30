/**
 * The sealed IFC values: facts with their IFC locator, and table-driven proposals.
 *
 * Proposed behaviour, not indexed (prompt 3 section 5.4): this output is built only when the
 * request asks for IFC values, which the API does only while the `ifc-values` gate reads open;
 * under guardrails v1.6 it is closed, so none of this reaches a live output. It waits for
 * ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10, the approved IFC mapping tables (GAP-I) and the
 * owner's revision of build-readiness decision 4; each proposal also waits for its mechanism's
 * gates (the contract's x-mechanism-rules). The mapping table below is a TEST dataset written
 * for this test: its id says TEST, and it is no SOVITECH table. The end-to-end check through the
 * API's gate reading is tests/proposed/ifc-input-5.4-reader.test.ts (and the API half, tests/proposed/ifc-input-5.4-api.test.ts).
 *
 * Ids (all proposed, not indexed): ifc-input 5.4 IFC-1, IFC-4, IFC-6, IFC-7, IFC-8, IFC-9,
 * IFC-10 (today's version), IFC-11 (at the level of values), ifc-input 6.2.12 and 6.2.13;
 * R-027, R-030, R-032, R-037, R-038, R-039, R-041 (gated).
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { mechanismRule, type ExtractionOutput, type ExtractionRequest, type IfcCandidateProposal, type IfcFact } from '@sovitech/extraction-contract';
import { DatasetError, loadDataset } from './datasets';
import { checkOutput, checkedRequest, contentHashOf, runIfcJob } from './job';

const ROOT = new URL('../../../', import.meta.url);
const WORK = mkdtempSync(join(tmpdir(), 'sovitech-test-ifc-values-'));
const TEST_ID = 'TEST-ifc-mapping';
const TEST_VERSION = '0.0.1';
const MODELS = ['demo-hotel-arh', 'demo-hotel-mep-rev-a', 'demo-hotel-mep-rev-b', 'demo-hotel-mep-ifc2x3'] as const;

/** A TEST mapping table: synthetic, for these tests only. Field keys and choices are TEST names. */
const TEST_RULES = [
  { id: 'tag', mechanism: 'tag_source', fieldKey: 'asset.tag', subjectKind: 'asset', sourceClaim: 'document', match: { attribute: 'Tag', requireLetter: true }, value: { kind: 'fact' } },
  { id: 'location', mechanism: 'relation', fieldKey: 'asset.location', subjectKind: 'asset', sourceClaim: 'document', match: { relation: 'contained_in_spatial_structure' }, value: { kind: 'fact' } },
  { id: 'chiller-capacity', mechanism: 'direct_read', fieldKey: 'asset.testCoolingOutput', subjectKind: 'asset', sourceClaim: 'document', match: { propertySet: 'Pset_ChillerTypeCommon', property: 'ChillerCapacity' }, value: { kind: 'fact' } },
  { id: 'space-net-area', mechanism: 'quantity_set_area', fieldKey: 'zone.testArea', subjectKind: 'zone', sourceClaim: 'document', match: { objectKind: 'space', quantitySet: 'Qto_SpaceBaseQuantities', quantity: 'NetFloorArea' }, value: { kind: 'fact' } },
  { id: 'ahu-class', mechanism: 'class_mapping', fieldKey: 'asset.type', subjectKind: 'asset', sourceClaim: 'ai_inference', confidence: 'high', match: { ifcClass: 'IfcUnitaryEquipment', predefinedType: 'AIRHANDLER' }, value: { kind: 'choice', choice: 'test_ahu' } },
  { id: 'cta-prefix', mechanism: 'name_term', fieldKey: 'asset.type', subjectKind: 'asset', sourceClaim: 'ai_inference', confidence: 'high', match: { tagPrefix: 'CTA' }, value: { kind: 'choice', choice: 'test_ahu' } },
  {
    id: 'ls-damper',
    mechanism: 'class_mapping',
    fieldKey: 'asset.lifeSafety',
    subjectKind: 'asset',
    sourceClaim: 'ai_inference',
    confidence: 'high',
    gates: ['dataset-asset-taxonomy'],
    match: { ifcClass: 'IfcDamper', predefinedType: ['FIREDAMPER', 'SMOKEDAMPER', 'FIRESMOKEDAMPER'] },
    value: { kind: 'choice', choice: 'life_safety' },
  },
  {
    id: 'ls-term',
    mechanism: 'name_term',
    fieldKey: 'asset.lifeSafety',
    subjectKind: 'asset',
    sourceClaim: 'ai_inference',
    confidence: 'high',
    gates: ['dataset-asset-taxonomy'],
    match: { nameTerm: ['clapetă antifoc', 'ascensor pompieri', 'desfumare'] },
    value: { kind: 'choice', choice: 'life_safety' },
  },
  {
    id: 'ls-smoke-system',
    mechanism: 'relation',
    fieldKey: 'asset.lifeSafety',
    subjectKind: 'asset',
    sourceClaim: 'ai_inference',
    confidence: 'high',
    gates: ['dataset-asset-taxonomy'],
    match: { relation: 'assigns_to_group', groupNameTerm: ['desfumare'] },
    value: { kind: 'choice', choice: 'life_safety' },
  },
  {
    id: 'ls-fire-system',
    mechanism: 'relation',
    fieldKey: 'asset.lifeSafety',
    subjectKind: 'asset',
    sourceClaim: 'ai_inference',
    confidence: 'high',
    gates: ['dataset-asset-taxonomy'],
    match: { relation: 'assigns_to_group', groupPredefinedType: ['FIREPROTECTION'] },
    value: { kind: 'choice', choice: 'life_safety' },
  },
  {
    id: 'ls-door',
    mechanism: 'direct_read',
    fieldKey: 'asset.lifeSafety',
    subjectKind: 'asset',
    sourceClaim: 'ai_inference',
    confidence: 'high',
    gates: ['dataset-asset-taxonomy'],
    match: { ifcClass: 'IfcDoor', propertiesTrue: [['Pset_DoorCommon', 'FireExit'], ['Pset_DoorCommon', 'HasDrive']] },
    value: { kind: 'choice', choice: 'life_safety' },
  },
];

const DATASETS = join(WORK, 'datasets');
writeDataset(DATASETS, { id: TEST_ID, version: TEST_VERSION, kind: 'ifc-mapping', rules: TEST_RULES });

/** One folder per table set, the file named <id>@<version>.json as the sandbox mounts it. */
function writeDataset(folder: string, dataset: { readonly id: string; readonly version: string } & Record<string, unknown>): void {
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, `${dataset.id}@${dataset.version}.json`), JSON.stringify(dataset));
}

afterAll(() => {
  rmSync(WORK, { recursive: true, force: true });
});

function bytesOf(name: string): Uint8Array {
  return readFileSync(new URL(`fixtures/ifc/${name}.ifc`, ROOT));
}

function requestFor(bytes: Uint8Array, withDatasets = true): ExtractionRequest {
  return checkedRequest({
    contractVersion: '1.0.0',
    job: { projectId: '0192f0a0-0000-7000-8000-00000000f101', documentId: '0192f0a0-0000-7000-8000-00000000f102', contentHash: contentHashOf(bytes) },
    declaredFormat: 'ifc',
    ifcValues: true,
    datasets: withDatasets ? [{ id: TEST_ID, version: TEST_VERSION }] : [],
    derivatives: [],
    limits: { maxPages: 10, maxCellsPerSheet: 10, wallClockSeconds: 600 },
  });
}

const outputs = new Map<string, Promise<ExtractionOutput>>();
function output(name: string): Promise<ExtractionOutput> {
  let found = outputs.get(name);
  if (found === undefined) {
    found = (async () => {
      const bytes = bytesOf(name);
      const request = requestFor(bytes);
      const read = await runIfcJob(request, bytes, { datasets: DATASETS });
      checkOutput(request, read);
      return read;
    })();
    outputs.set(name, found);
  }
  return found;
}

interface ElementTruth {
  readonly key: string;
  readonly globalId: string;
  readonly tag: string | null;
  readonly tagIsAuthoringId: boolean;
  readonly hiddenLayer: boolean;
  readonly lifeSafetySignals?: readonly string[];
  readonly psets: Readonly<Record<string, { readonly properties: Readonly<Record<string, { readonly literal: string }>> }>>;
}
interface Truth {
  readonly schema: string;
  readonly elements: readonly ElementTruth[];
  readonly storeys: readonly { readonly globalId: string }[];
}
const truths = new Map<string, Truth>();
function truth(name: string): Truth {
  let found = truths.get(name);
  if (found === undefined) {
    found = parse(readFileSync(new URL(`fixtures/ifc/ground-truth/${name}.json`, ROOT), 'utf8'), { schema: 'json' }) as Truth;
    truths.set(name, found);
  }
  return found;
}
function element(name: string, key: string): ElementTruth {
  const found = truth(name).elements.find((item) => item.key === key);
  if (found === undefined) throw new Error(`${key} is not in ${name}`);
  return found;
}

async function factsOf(name: string, key: string): Promise<Map<string, IfcFact>> {
  const values = (await output(name)).ifcValues;
  const globalId = element(name, key).globalId;
  const found = new Map<string, IfcFact>();
  for (const fact of values?.facts ?? []) {
    if (fact.locator.globalId !== globalId) continue;
    const path = fact.locator.path;
    if (path.kind === 'attribute') found.set(`attribute ${path.through} ${path.attribute}`, fact);
    else if (path.kind === 'property') found.set(`property ${path.through} ${path.propertySet} ${path.property}`, fact);
  }
  return found;
}

async function proposals(name: string, field: string): Promise<Map<string, IfcCandidateProposal[]>> {
  const found = new Map<string, IfcCandidateProposal[]>();
  for (const proposal of (await output(name)).ifcValues?.candidateProposals ?? []) {
    if (proposal.fieldKey !== field) continue;
    found.set(proposal.subject.elementGlobalId, [...(found.get(proposal.subject.elementGlobalId) ?? []), proposal]);
  }
  return found;
}

describe('IFC-1 · R-027 (gated: ifc-values): facts carry their locator and the verbatim line', () => {
  it.each(MODELS)('IFC-1: every fact of %s names the file by its hash and schema, and quotes its own line', async (name) => {
    const read = await output(name);
    const text = new TextDecoder().decode(bytesOf(name));
    const lines = new Map(text.split('\n').filter((line) => line.startsWith('#')).map((line) => [line.slice(1, line.indexOf('=')), line]));
    expect(read.ifcValues?.facts.length).toBeGreaterThan(0);
    for (const fact of read.ifcValues?.facts ?? []) {
      expect(fact.locator.contentHash).toBe(read.job.contentHash);
      expect(fact.locator.schema).toBe(truth(name).schema);
      expect(fact.locator.stepIds).toHaveLength(1);
      expect(fact.excerpt).toBe(lines.get(`${String(fact.locator.stepIds[0])}`));
    }
  });
});

describe('IFC-7 · IFC-8 · IFC-9 · R-039 (gated): values are tokens with the unit the file declares, never numbers', () => {
  it('IFC-7: a capacity in W is its token with the declared unit', async () => {
    const fact = (await factsOf('demo-hotel-mep-rev-a', 'CH-01')).get('property occurrence Pset_ChillerTypeCommon ChillerCapacity');
    expect(fact?.value).toEqual({ kind: 'real', token: '430000.', ifcType: 'IFCPOWERMEASURE' });
    expect(fact?.declaredUnit).toEqual({ source: 'project_unit_assignment', stepId: 100011, unitKind: 'si', unitType: 'POWERUNIT', name: 'WATT' });
  });

  it('IFC-8: an airflow in m³/s declares the derived unit as written', async () => {
    const fact = (await factsOf('demo-hotel-mep-rev-a', 'CTA-01')).get('property occurrence Date tehnice Debit aer');
    expect(fact?.value).toEqual({ kind: 'real', token: '2.5', ifcType: 'IFCVOLUMETRICFLOWRATEMEASURE' });
    expect(fact?.declaredUnit).toMatchObject({ unitKind: 'derived', unitType: 'VOLUMETRICFLOWRATEUNIT', name: 'CUBIC_METRE^1 SECOND^-1' });
  });

  it('R-039: a value with its own unit declares that unit', async () => {
    const fact = (await factsOf('demo-hotel-mep-rev-a', 'P1.1')).get('property occurrence Date tehnice Putere electrică absorbită');
    expect(fact?.value).toEqual({ kind: 'real', token: '5.5', ifcType: 'IFCPOWERMEASURE' });
    expect(fact?.declaredUnit).toMatchObject({ source: 'value_unit', prefix: 'KILO', name: 'WATT' });
  });

  it('IFC-9: an IfcReal or a label declares no unit', async () => {
    const real = [...(await factsOf('demo-hotel-mep-rev-a', 'P1.2')).entries()].find(([key, fact]) => key.startsWith('property') && 'ifcType' in fact.value && fact.value.ifcType === 'IFCREAL');
    expect(real?.[1].declaredUnit).toBeUndefined();
    const labels = [...(await factsOf('demo-hotel-mep-rev-a', 'P2')).entries()].filter(([key, fact]) => key.startsWith('property') && 'ifcType' in fact.value && fact.value.ifcType === 'IFCLABEL');
    expect(labels.length).toBeGreaterThan(0);
    for (const [, fact] of labels) {
      expect(fact.declaredUnit).toBeUndefined();
      expect(fact.value.kind).toBe('string');
    }
  });
});

describe('ifc-input 6.2.13 (gated: ifc-hidden-content): hidden content gives no fact and no proposal', () => {
  it('US-IFC-04 · F-IFC-02 · rule 14: CH-03 on a switched-off layer gives a hidden_content finding and nothing else', async () => {
    const read = await output('demo-hotel-mep-rev-a');
    const hidden = element('demo-hotel-mep-rev-a', 'CH-03');
    expect(read.ifcValues?.facts.some((fact) => fact.locator.globalId === hidden.globalId)).toBe(false);
    expect(read.ifcValues?.candidateProposals.some((proposal) => proposal.subject.elementGlobalId === hidden.globalId)).toBe(false);
    const [capacity] = Object.values(hidden.psets['Date tehnice']?.properties ?? {});
    const token = capacity?.literal.split('(')[1]?.replace(/\)$/u, '');
    expect(token).toBeDefined();
    expect(JSON.stringify(read.ifcValues)).not.toContain(`"token":"${token ?? ''}"`);
    expect(read.findings.filter((finding) => finding.kind === 'hidden_content').map((finding) => (finding.locator.kind === 'ifc' ? finding.locator.globalId : undefined))).toEqual([hidden.globalId]);
  });
});

describe('R-030 · R-037 · R-038 (gated): table-driven proposals', () => {
  it('IFC-10 · R-037: an authoring id in Tag gives no tag proposal, and nothing is counted', async () => {
    const tags = await proposals('demo-hotel-mep-rev-a', 'asset.tag');
    for (const item of truth('demo-hotel-mep-rev-a').elements) {
      const tagged = item.tag !== null && !item.tagIsAuthoringId && !item.hiddenLayer;
      expect(tags.has(item.globalId), item.key).toBe(tagged);
    }
    for (const proposal of (await output('demo-hotel-mep-rev-a')).ifcValues?.candidateProposals ?? []) expect(proposal.fieldKey.toLowerCase()).not.toContain('count');
  });

  it('R-030: every proposal waits for its mechanism\'s gates, names its table, and cites facts of the output', async () => {
    const values = (await output('demo-hotel-mep-rev-a')).ifcValues;
    const facts = new Set(values?.facts.map((fact) => fact.id));
    expect(values?.candidateProposals.length).toBeGreaterThan(0);
    for (const proposal of values?.candidateProposals ?? []) {
      for (const gate of mechanismRule(proposal.mechanism).gates) expect(proposal.requiresGates).toContain(gate);
      expect(proposal.datasets).toEqual([{ id: TEST_ID, version: TEST_VERSION }]);
      for (const id of proposal.evidenceFactIds) expect(facts.has(id)).toBe(true);
      expect(proposal.sourceClaim === 'ai_inference').toBe(proposal.confidence !== undefined);
      if (proposal.fieldKey === 'asset.lifeSafety') expect(proposal.requiresGates).toContain('dataset-asset-taxonomy');
    }
  });

  it('IFC-6 · R-038: life-safety signals flag the ifc-input 4.4 assets, and the ARH doors by their properties', async () => {
    const flagged = await proposals('demo-hotel-mep-rev-a', 'asset.lifeSafety');
    for (const key of ['CA-1.01', 'CA-1.02', 'CFD-S1-01', 'CA-2.03', 'CA-2.04', 'VE-P1', 'CDI-01', 'BG-E1-01', 'DF-E1-01']) {
      expect(flagged.has(element('demo-hotel-mep-rev-a', key).globalId), key).toBe(true);
    }
    for (const key of ['CTA-01', 'CH-01', 'P1.1', 'TA-01']) expect(flagged.has(element('demo-hotel-mep-rev-a', key).globalId), key).toBe(false);
    const doors = await proposals('demo-hotel-arh', 'asset.lifeSafety');
    for (const item of truth('demo-hotel-arh').elements) expect(doors.has(item.globalId), item.key).toBe((item.lifeSafetySignals ?? []).length > 0);
  });

  it('IFC-11: the IFC2X3 copy gives the same tag, location and type proposals as rev A', async () => {
    const summary = async (name: string, field: string) =>
      [...(await proposals(name, field)).entries()].flatMap(([globalId, items]) => items.map((item) => `${globalId} ${item.value.kind === 'choice' ? item.value.choice : 'fact'}`)).sort();
    for (const field of ['asset.tag', 'asset.location', 'asset.type']) {
      expect(await summary('demo-hotel-mep-ifc2x3', field), field).toEqual(await summary('demo-hotel-mep-rev-a', field));
    }
  });

  it('IFC-4 · R-033: no proposal is about a storey, and none is a count', async () => {
    const storeys = new Set(truth('demo-hotel-arh').storeys.map((storey) => storey.globalId));
    for (const proposal of (await output('demo-hotel-arh')).ifcValues?.candidateProposals ?? []) {
      expect(storeys.has(proposal.subject.elementGlobalId)).toBe(false);
      expect(['fact', 'choice']).toContain(proposal.value.kind);
    }
  });

  it('R-027: with no dataset there is no proposal; a named dataset that is not mounted refuses the job', async () => {
    const bytes = bytesOf('demo-hotel-mep-rev-a');
    const bare = await runIfcJob(requestFor(bytes, false), bytes);
    expect(bare.ifcValues?.facts.length).toBeGreaterThan(0);
    expect(bare.ifcValues?.candidateProposals).toEqual([]);
    await expect(runIfcJob(requestFor(bytes), bytes, {})).rejects.toMatchObject({ code: 'job.datasets_not_mounted' });
  });
});

describe('ifc-input 6.2.10: a dataset the format does not name is refused whole', () => {
  it.each([
    [{ extra: 1 }, 'dataset.rule'],
    [{ mechanism: 'geometry' }, 'dataset.mechanism'],
    [{ sourceClaim: 'calculated' }, 'dataset.rule'],
    [{ fieldKey: 'Not A Key' }, 'dataset.field_key'],
    [{ confidence: 'high' }, 'dataset.confidence'],
    [{ gates: ['ifc-everything'] }, 'dataset.gates'],
    [{ match: { unknownMatcher: 'x' } }, 'dataset.match'],
    [{ value: { kind: 'choice', choice: 'Not A Choice' } }, 'dataset.value'],
  ])('ifc-input 6.2.10: a rule changed by %j is refused with %s', (change, code) => {
    const folder = join(WORK, `bad-${code}-${Object.keys(change).join('-')}`);
    writeDataset(folder, { id: 'TEST-bad', version: '0.0.1', kind: 'ifc-mapping', rules: [{ ...TEST_RULES[0], ...change }] });
    let refused: string | undefined;
    try {
      loadDataset(folder, 'TEST-bad', '0.0.1');
    } catch (error) {
      if (error instanceof DatasetError) refused = error.code;
      else throw error;
    }
    expect(refused).toBe(code);
  });
});
