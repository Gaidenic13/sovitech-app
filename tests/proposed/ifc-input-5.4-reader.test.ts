/**
 * Proposed behaviour, not indexed (prompt 3 sections 5.4, 8 and 10, phase 2): the IFC value path
 * at the IFC reader, for ifc-input 5.4's IFC-1 to IFC-14 and the fixture's IFC settings of G3-8.
 * The IFC reader (web-ifc; owner decision 2026-09-26; docs/adr/0031) reads the synthetic models
 * (fixtures/ifc/) with a request that asks for IFC values, as the API does only while the
 * `ifc-values` gate reads open, and a TEST mapping table written here (its id says TEST; it is no
 * SOVITECH table). The output goes through the contract's strict parser, as the worker reads it,
 * and is opened only through openIfcValues() with gates opened by the test-utils override.
 *
 * Every title names its IFC-n id and the proposals it waits for. The whole path waits for
 * ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10, the approved IFC mapping tables (GAP-I) and the
 * owner's revision of build-readiness decision 4 (the `ifc-values` gate); each mechanism also
 * waits for its own: 6.2.4 for tags (`ifc-identity`), 6.2.5 for counts of untagged objects
 * (`ifc-untagged-count`), 6.2.6 for areas (`ifc-areas`), 6.2.7 for geometry (`ifc-geometry`),
 * 6.2.8 for storeys against floors, 6.2.9 for types and terms (`ifc-code-inference`, with the
 * glossary and taxonomy datasets), 6.2.11 for declared units (`ifc-units`), 6.2.12 and dashboards
 * 7.2.23 for life-safety flags. The API half of the same cases is ./ifc-input-5.4-api.test.ts;
 * the reader's own tests are packages/ifc-reader/src/{ground-truth,values}.test.ts.
 *
 * Ids: ifc-input 5.4 IFC-1 to IFC-11 and IFC-13 (IFC-12 and IFC-14 are in the API file); G3-8's
 * IFC setting; R-027, R-028, R-030, R-033, R-037, R-038, R-039, R-041 (gated).
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openIfcValues,
  parseExtractionOutput,
  type ExtractionOutputView,
  type IfcCandidateProposal,
  type IfcFact,
} from '@sovitech/extraction-contract';
import { checkedRequest, contentHashOf, runIfcJob } from '@sovitech/ifc-reader';
import { REPO_ROOT, productionGateSource, type GateId, type GateSource } from '@sovitech/registry/gates';
import { openGateForTest } from '@sovitech/registry/test-utils';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const WORK = mkdtempSync(join(tmpdir(), 'sovitech-proposed-ifc-'));
const DATASET = { id: 'TEST-ifc-mapping', version: '0.0.1' };

/** A TEST mapping table: synthetic field keys and choices, for this suite only. */
const TEST_RULES = [
  { id: 'tag', mechanism: 'tag_source', fieldKey: 'asset.tag', subjectKind: 'asset', sourceClaim: 'document', match: { attribute: 'Tag', requireLetter: true }, value: { kind: 'fact' } },
  { id: 'location', mechanism: 'relation', fieldKey: 'asset.location', subjectKind: 'asset', sourceClaim: 'document', match: { relation: 'contained_in_spatial_structure' }, value: { kind: 'fact' } },
  { id: 'chiller', mechanism: 'direct_read', fieldKey: 'asset.testCoolingOutput', subjectKind: 'asset', sourceClaim: 'document', match: { propertySet: 'Pset_ChillerTypeCommon', property: 'ChillerCapacity' }, value: { kind: 'fact' } },
  { id: 'power', mechanism: 'direct_read', fieldKey: 'asset.testElectricalInput', subjectKind: 'asset', sourceClaim: 'document', match: { propertySet: 'Date tehnice', property: 'Putere electrică absorbită' }, value: { kind: 'fact' } },
  { id: 'airflow', mechanism: 'direct_read', fieldKey: 'asset.testAirflow', subjectKind: 'asset', sourceClaim: 'document', gates: ['ifc-units'], match: { propertySet: 'Date tehnice', property: 'Debit aer' }, value: { kind: 'fact' } },
  { id: 'area', mechanism: 'quantity_set_area', fieldKey: 'zone.testArea', subjectKind: 'zone', sourceClaim: 'document', match: { objectKind: 'space', quantitySet: 'Qto_SpaceBaseQuantities', quantity: 'NetFloorArea' }, value: { kind: 'fact' } },
  { id: 'ahu', mechanism: 'class_mapping', fieldKey: 'asset.type', subjectKind: 'asset', sourceClaim: 'ai_inference', confidence: 'high', match: { ifcClass: 'IfcUnitaryEquipment', predefinedType: 'AIRHANDLER' }, value: { kind: 'choice', choice: 'test_ahu' } },
  { id: 'cta', mechanism: 'name_term', fieldKey: 'asset.type', subjectKind: 'asset', sourceClaim: 'ai_inference', confidence: 'high', match: { tagPrefix: 'CTA' }, value: { kind: 'choice', choice: 'test_ahu' } },
  { id: 'vcv', mechanism: 'name_term', fieldKey: 'asset.type', subjectKind: 'asset', sourceClaim: 'ai_inference', confidence: 'high', match: { tagPrefix: 'VCV' }, value: { kind: 'choice', choice: 'test_fan_coil' } },
  { id: 'ls-term', mechanism: 'name_term', fieldKey: 'asset.lifeSafety', subjectKind: 'asset', sourceClaim: 'ai_inference', confidence: 'high', gates: ['dataset-asset-taxonomy'], match: { nameTerm: ['clapetă antifoc', 'desfumare'] }, value: { kind: 'choice', choice: 'life_safety' } },
  { id: 'ls-dual-use', mechanism: 'relation', fieldKey: 'asset.lifeSafety', subjectKind: 'asset', sourceClaim: 'ai_inference', confidence: 'high', gates: ['dataset-asset-taxonomy'], match: { relation: 'assigns_to_group', groupNameTerm: ['desfumare'] }, value: { kind: 'choice', choice: 'life_safety' } },
];

const MODELS = ['demo-hotel-arh', 'demo-hotel-mep-rev-a', 'demo-hotel-mep-rev-b', 'demo-hotel-mep-ifc2x3'] as const;
const outputs = new Map<string, ExtractionOutputView>();

const modelBytes = (model: string): Buffer => readFileSync(join(REPO_ROOT, 'fixtures/ifc', `${model}.ifc`));

/** Runs the IFC reader on a model's bytes with IFC values asked for, and parses its output strictly, as the API does. */
async function extract(name: string, document: Uint8Array): Promise<ExtractionOutputView> {
  const folder = join(WORK, name);
  mkdirSync(join(folder, 'datasets'), { recursive: true });
  writeFileSync(join(folder, 'datasets', `${DATASET.id}@${DATASET.version}.json`), JSON.stringify({ ...DATASET, kind: 'ifc-mapping', rules: TEST_RULES }));
  const request = checkedRequest({
    contractVersion: '1.0.0',
    job: { projectId: '0192f0a0-0000-7000-8000-00000000c101', documentId: '0192f0a0-0000-7000-8000-00000000c102', contentHash: contentHashOf(document) },
    declaredFormat: 'ifc',
    ifcValues: true,
    datasets: [DATASET],
    derivatives: [],
    limits: { maxPages: 10, maxCellsPerSheet: 10, wallClockSeconds: 600 },
  });
  const output = await runIfcJob(request, document, { datasets: join(folder, 'datasets') });
  // Through JSON text, as the worker reads output.json.
  const parsed = parseExtractionOutput(parse(JSON.stringify(output), { schema: 'json' }) as unknown);
  if (!parsed.ok) throw new Error(`the reader's output is refused: ${JSON.stringify(parsed.problems)}`);
  return parsed.value;
}

beforeAll(async () => {
  for (const model of MODELS) outputs.set(model, await extract(model, modelBytes(model)));
}, 120_000);

afterAll(() => {
  rmSync(WORK, { recursive: true, force: true });
});

function output(model: string): ExtractionOutputView {
  const found = outputs.get(model);
  if (found === undefined) throw new Error(`${model} was not read`);
  return found;
}

function openWith(view: ExtractionOutputView, gates: GateSource) {
  const reading = openIfcValues(view.ifcValues, gates);
  if (!reading.open) throw new Error(`ifc-values reads ${reading.reason}`);
  return reading;
}
const open = (model: string, gates: GateSource) => openWith(output(model), gates);

/** Gate sources opened by the test-utils override: ifc-values, and the others named, in order. */
function gates(...more: readonly GateId[]): GateSource {
  return more.reduce<GateSource>((source, id) => openGateForTest(id, source), openGateForTest('ifc-values'));
}

const truth = (model: string) =>
  JSON.parse(readFileSync(join(REPO_ROOT, 'fixtures/ifc/ground-truth', `${model}.json`), 'utf8')) as {
    elements: { key: string; globalId: string; tag: string | null; tagIsAuthoringId: boolean; hiddenLayer: boolean }[];
    storeys: { key: string; globalId: string }[];
    spaces: { key: string; globalId: string; name?: string }[];
  };
function gid(model: string, key: string): string {
  const found = truth(model).elements.find((element) => element.key === key)?.globalId;
  if (found === undefined) throw new Error(`${model} has no element ${key}`);
  return found;
}
const factOf = (facts: readonly IfcFact[], globalId: string, property: string) =>
  facts.find((fact) => fact.locator.globalId === globalId && fact.locator.path.kind === 'property' && fact.locator.path.property === property);
const byField = (proposals: readonly IfcCandidateProposal[], field: string) => proposals.filter((proposal) => proposal.fieldKey === field);
/** The file's statements, one per line, as the reader's STEP text reader quotes them. */
const statements = (bytes: Uint8Array) => new Set(Buffer.from(bytes).toString('latin1').split(/\r?\n/u));

describe('ifc-input 5.4 at the IFC reader, with gates opened by the test-utils override', () => {
  it('IFC-1 · waits for ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10 (ifc-values) · R-027: with every gate closed, nothing from the model opens', () => {
    for (const model of MODELS) expect(openIfcValues(output(model).ifcValues, productionGateSource())).toMatchObject({ open: false, reason: 'gate_closed' });
  });

  it("IFC-1 · waits for ifc-input 6.2.1 (ifc-values): each opened value quotes its own statement, at a STEP id it names, in the file whose content hash it names", () => {
    const model = 'demo-hotel-mep-rev-a';
    const bytes = modelBytes(model);
    const lines = statements(bytes);
    const { facts } = open(model, gates());
    expect(facts.length).toBeGreaterThan(0);
    for (const fact of facts) {
      expect(fact.locator.contentHash, fact.id).toBe(contentHashOf(bytes));
      expect(lines.has(fact.excerpt), fact.id).toBe(true);
      const quoted = /^#([0-9]+)=/u.exec(fact.excerpt)?.[1];
      expect(fact.locator.stepIds.map(String), fact.id).toContain(quoted);
    }
  });

  it('IFC-1 · waits for ifc-input 6.2.1 (ifc-values): a copy with one STEP line changed and the same GlobalId names another content hash and quotes another line, so evidence from the original matches it nowhere', async () => {
    const model = 'demo-hotel-mep-rev-a';
    const original = modelBytes(model);
    const chiller = gid(model, 'CH-01');
    const before = factOf(open(model, gates()).facts, chiller, 'ChillerCapacity');
    if (before === undefined) throw new Error('CH-01 has no ChillerCapacity value');
    const tamperedLine = before.excerpt.replace(/IFCPOWERMEASURE\(([0-9]+)\.\)/u, 'IFCPOWERMEASURE($10.)');
    expect(tamperedLine).not.toBe(before.excerpt);
    const tampered = Buffer.from(original.toString('latin1').replace(before.excerpt, tamperedLine), 'latin1');
    const after = factOf(openWith(await extract('tampered', tampered), gates()).facts, chiller, 'ChillerCapacity');
    expect(after?.locator.globalId).toBe(before.locator.globalId);
    expect(after?.locator.path).toEqual(before.locator.path);
    expect(after?.locator.contentHash).not.toBe(before.locator.contentHash);
    expect(after?.excerpt).toBe(tamperedLine);
    expect(statements(tampered).has(before.excerpt)).toBe(false);
  });

  it('IFC-7 · IFC-8 · IFC-9 · waits for ifc-input 6.2.1 and 6.2.11 (ifc-values, ifc-units) · R-039: values open as STEP tokens with the unit the file declares, never as numbers', () => {
    const model = 'demo-hotel-mep-rev-a';
    const { facts } = open(model, gates());
    const capacity = factOf(facts, gid(model, 'CH-01'), 'ChillerCapacity');
    expect(capacity?.value).toMatchObject({ kind: 'real', ifcType: 'IFCPOWERMEASURE' });
    expect(capacity?.declaredUnit).toMatchObject({ source: 'project_unit_assignment', unitType: 'POWERUNIT', name: 'WATT' });
    expect(capacity?.excerpt).toMatch(/^#[0-9]+=IFCPROPERTYSINGLEVALUE\('ChillerCapacity',/u);
    const airflow = factOf(facts, gid(model, 'CTA-01'), 'Debit aer');
    expect(airflow?.declaredUnit).toMatchObject({ unitKind: 'derived', unitType: 'VOLUMETRICFLOWRATEUNIT' });
    const real = facts.find((fact) => fact.locator.globalId === gid(model, 'P1.2') && fact.value.kind === 'real' && fact.value.ifcType === 'IFCREAL');
    expect(real?.declaredUnit).toBeUndefined();
  });

  it('IFC-8 · waits for ifc-input 6.2.11 (ifc-units): a value the file declares in m³/s opens only with ifc-units; until then it is withheld, and the gate that holds it is named', () => {
    const model = 'demo-hotel-mep-rev-a';
    const closed = open(model, gates());
    expect(byField(closed.candidateProposals, 'asset.testAirflow')).toEqual([]);
    expect(closed.withheld.some((item) => item.closedGates.includes('ifc-units'))).toBe(true);
    const opened = byField(open(model, gates('ifc-units')).candidateProposals, 'asset.testAirflow');
    expect(opened.map((proposal) => proposal.subject.elementGlobalId)).toContain(gid(model, 'CTA-01'));
  });

  it('IFC-9 · waits for ifc-input 6.2.1 (ifc-values) and 2.7: a power typed IfcReal opens with no declared unit, beside one with its unit, so no quantity can be read from it', () => {
    const model = 'demo-hotel-mep-rev-a';
    const reading = open(model, gates());
    const facts = new Map(reading.facts.map((fact) => [fact.id, fact]));
    const unitOf = (key: string) => {
      const proposal = byField(reading.candidateProposals, 'asset.testElectricalInput').find((item) => item.subject.elementGlobalId === gid(model, key));
      if (proposal === undefined || proposal.value.kind !== 'fact') throw new Error(`${key} has no power proposal`);
      return facts.get(proposal.value.factId)?.declaredUnit;
    };
    expect(unitOf('P1.1')).toMatchObject({ source: 'value_unit' });
    expect(unitOf('P1.2')).toBeUndefined();
  });

  it('R-027 · R-030 · R-039 · waits for ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10 (ifc-values): a direct read and a relation open; every other mechanism waits for its own gates', () => {
    const reading = open('demo-hotel-mep-rev-a', gates());
    expect([...new Set(reading.candidateProposals.map((proposal) => proposal.mechanism))].sort()).toEqual(['direct_read', 'relation']);
    const closed = new Set(reading.withheld.flatMap((item) => item.closedGates));
    expect([...closed].sort()).toEqual(['dataset-asset-taxonomy', 'dataset-glossary', 'ifc-areas', 'ifc-code-inference', 'ifc-identity', 'ifc-units']);
  });

  it('IFC-10 · waits for ifc-input 6.2.4 (ifc-identity), and for the count 6.2.5 (ifc-untagged-count) · R-037: tags open only with ifc-identity, and the eight Etaj 2 fan coils, whose Tag holds an authoring id, give none', () => {
    const model = 'demo-hotel-mep-rev-a';
    expect(byField(open(model, gates()).candidateProposals, 'asset.tag')).toEqual([]);
    const tagged = new Set(byField(open(model, gates('ifc-identity')).candidateProposals, 'asset.tag').map((proposal) => proposal.subject.elementGlobalId));
    for (const element of truth(model).elements) {
      const expected = element.tag !== null && !element.tagIsAuthoringId && !element.hiddenLayer;
      expect(tagged.has(element.globalId), element.key).toBe(expected);
    }
    const fanCoils = truth(model).elements.filter((element) => element.key.startsWith('FCU-E2#'));
    expect(fanCoils).toHaveLength(8);
    expect(fanCoils.some((element) => tagged.has(element.globalId))).toBe(false);
  });

  it('G3-8 (IFC setting) · waits for ifc-input 6.2.9 (ifc-code-inference, dataset-glossary): the VCV fan coils read Likely (high) from a TEST glossary prefix, and only with both gates', () => {
    const model = 'demo-hotel-mep-rev-a';
    const vcv = truth(model).elements.filter((element) => element.key.startsWith('VCV-1.'));
    expect(vcv).toHaveLength(8);
    const fanCoil = (source: GateSource) =>
      byField(open(model, source).candidateProposals, 'asset.type').filter((proposal) => proposal.value.kind === 'choice' && proposal.value.choice === 'test_fan_coil');
    expect(fanCoil(gates('ifc-code-inference'))).toEqual([]);
    const likely = fanCoil(gates('ifc-code-inference', 'dataset-glossary'));
    expect(new Set(likely.map((proposal) => proposal.subject.elementGlobalId))).toEqual(new Set(vcv.map((element) => element.globalId)));
    expect(likely.every((proposal) => proposal.sourceClaim === 'ai_inference' && proposal.confidence === 'high')).toBe(true);
  });

  it('IFC-6 · waits for ifc-input 6.2.9, 6.2.12 and dashboards 7.2.23 (ifc-code-inference, dataset-glossary, dataset-asset-taxonomy) · R-038: a life-safety flag opens only with the taxonomy gate too', () => {
    const model = 'demo-hotel-mep-rev-a';
    const base = gates('ifc-code-inference', 'dataset-glossary');
    expect(byField(open(model, base).candidateProposals, 'asset.lifeSafety')).toEqual([]);
    const flagged = byField(open(model, openGateForTest('dataset-asset-taxonomy', base)).candidateProposals, 'asset.lifeSafety');
    const subjects = new Set(flagged.map((proposal) => proposal.subject.elementGlobalId));
    for (const key of ['CA-2.03', 'CA-2.04', 'VE-P1']) expect(subjects.has(gid(model, key)), key).toBe(true);
  });

  it('IFC-2 · waits for ifc-input 6.2.6 and 6.2.7 (ifc-areas, ifc-geometry) · R-041: a quantity-set area opens with ifc-areas; nothing is computed from shapes', () => {
    const model = 'demo-hotel-arh';
    expect(byField(open(model, gates()).candidateProposals, 'zone.testArea')).toEqual([]);
    const reading = open(model, gates('ifc-areas'));
    expect(byField(reading.candidateProposals, 'zone.testArea').length).toBeGreaterThan(0);
    expect(reading.candidateProposals.some((proposal) => proposal.mechanism === 'geometry' || proposal.sourceClaim === 'calculated')).toBe(false);
  });

  it('IFC-3 · IFC-4 · waits for ifc-input 6.2.8 and 6.2.9 (ifc-values, ifc-code-inference) · R-033: storeys are read as storeys; no proposal counts them, and a storey with no space has no space in it', () => {
    const model = 'demo-hotel-arh';
    const reading = open(model, gates('ifc-code-inference', 'dataset-glossary', 'dataset-asset-taxonomy', 'ifc-identity', 'ifc-areas'));
    const storeys = new Set(truth(model).storeys.map((storey) => storey.globalId));
    expect(storeys.size).toBe(6);
    expect(reading.candidateProposals.some((proposal) => storeys.has(proposal.subject.elementGlobalId))).toBe(false);
    const subsol2 = truth(model).storeys.find((storey) => storey.key === 'S2')?.globalId;
    const spacesInIt = reading.facts.filter(
      (fact) => fact.locator.path.kind === 'relation' && fact.locator.path.relation === 'aggregates' && fact.locator.path.relatedGlobalId === subsol2,
    );
    expect(spacesInIt).toEqual([]);
  });

  it('IFC-5 · waits for ifc-input 6.2.3 (ifc-values): the architectural model holds no building-services element and no chiller value, and stays stored, never analysed coverage', () => {
    const view = output('demo-hotel-arh');
    expect(view.analysis).toEqual({ status: 'stored_only', formatWord: 'IFC model' });
    const classes = view.coverage.ifc?.classesRead ?? [];
    expect(classes.length).toBeGreaterThan(0);
    expect(classes.filter((name) => /^Ifc(?:Chiller|UnitaryEquipment|Pump|Fan|Damper|Boiler|Valve|Sensor|FlowMeter|AirTerminal)/u.test(name))).toEqual([]);
    const { facts } = open('demo-hotel-arh', gates());
    expect(facts.some((fact) => fact.locator.path.kind === 'property' && fact.locator.path.property === 'ChillerCapacity')).toBe(false);
  });

  it('IFC-11 · waits for ifc-input 6.2.1 and 6.2.4 (ifc-values, ifc-identity) · R-027: the IFC2X3 copy opens the same tag and location proposals as rev A', () => {
    const source = gates('ifc-identity');
    const summary = (model: string) =>
      open(model, source)
        .candidateProposals.filter((proposal) => proposal.fieldKey === 'asset.tag' || proposal.fieldKey === 'asset.location')
        .map((proposal) => `${proposal.fieldKey} ${proposal.subject.elementGlobalId}`)
        .sort();
    expect(summary('demo-hotel-mep-ifc2x3')).toEqual(summary('demo-hotel-mep-rev-a'));
  });

  it('IFC-13 · waits for ifc-input 6.2.1 and 6.2.2 (ifc-values) · R-028: rev B keeps the GlobalIds, and its one changed value is a different token on the same path', () => {
    const chiller = gid('demo-hotel-mep-rev-a', 'CH-01');
    const a = factOf(open('demo-hotel-mep-rev-a', gates()).facts, chiller, 'ChillerCapacity');
    const b = factOf(open('demo-hotel-mep-rev-b', gates()).facts, chiller, 'ChillerCapacity');
    expect(a?.value).not.toEqual(b?.value);
    expect(a?.locator.path).toEqual(b?.locator.path);
    expect(a?.locator.contentHash).not.toEqual(b?.locator.contentHash);
  });
});
