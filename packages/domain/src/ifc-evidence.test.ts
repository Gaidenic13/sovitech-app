/**
 * The IFC evidence verifier of the gated IFC value path (./ifc-evidence.ts; ifc-input 6.2.1, a
 * proposal; docs/adr/0033-ifc-value-path-api-half.md): rule 1's five checks over an IFC locator,
 * the source code decides, and the confidence code caps. Every statement, GlobalId and value is
 * TEST data written here; the rule 8 parser and the STEP number reader are handed in as TEST
 * lookups, as the API hands in the registry's.
 */
import { describe, expect, it } from 'vitest';
import {
  decodeStepString,
  ifcLocatorShapeProblem,
  isIfcEvidence,
  normaliseStepExcerpt,
  readStepStatement,
  stepLiteral,
  verifyIfcEvidence,
  verifyIfcProposal,
  type IfcProposal,
  type IfcProposalContext,
  type ProposedIfcEvidence,
} from './ifc-evidence';
import type { DocumentRecord, FieldDefinition } from './model';

const HASH = `sha256:${'a'.repeat(64)}`;
const OTHER_HASH = `sha256:${'b'.repeat(64)}`;
const PROJECT = 'test-project';
const DOCUMENT: DocumentRecord = {
  id: 'test-model',
  projectId: PROJECT,
  contentHash: HASH,
  kind: 'other',
  stage: 'unknown',
  analysis: { status: 'stored_only', coverage: 'TEST' },
};
const FOREIGN: DocumentRecord = { ...DOCUMENT, id: 'test-foreign-model', projectId: 'another-test-project' };

const PUMP = 'TESTGID00000000000000P';
const PUMP_TYPE = 'TESTGID00000000000000T';
const STOREY = 'TESTGID00000000000000S';
const PROXY = 'TESTGID00000000000000X';
const RELATION = 'TESTGID00000000000000R';

/** A TEST model's statements, by STEP id, as the reader would quote them. */
const STATEMENTS: ReadonlyMap<number, string> = new Map([
  [21, `#21=IFCPUMP('${PUMP}',#2,'Pomp\\X2\\0103\\X0\\ TEST',$,$,#3,#4,'P-T1',$);`],
  [22, "#22=IFCPROPERTYSINGLEVALUE('TestPower',$,IFCPOWERMEASURE(7.5),$);"],
  [24, `#24=IFCPUMPTYPE('${PUMP_TYPE}',#2,'Tip TEST',$,$,$,$,$,$,.CIRCULATOR.);`],
  [25, `#25=IFCRELCONTAINEDINSPATIALSTRUCTURE('${RELATION}',#2,$,$,(#21),#26);`],
  [26, `#26=IFCBUILDINGSTOREY('${STOREY}',#2,'Etaj TEST',$,$,#5,$,$,.ELEMENT.,3000.);`],
  [27, `#27=IFCBUILDINGELEMENTPROXY('${PROXY}',#2,'Proxy TEST',$,$,#6,#7,'X-T1',.NOTDEFINED.);`],
  [28, "#28=IFCQUANTITYAREA('NetFloorArea',$,$,12.5,$);"],
  [29, "#29=IFCPROPERTYSINGLEVALUE('TestLabel',$,IFCLABEL('cca. 1.500 kW'),$);"],
]);
const ELEMENTS: ReadonlyMap<string, number> = new Map([
  [PUMP, 21],
  [PUMP_TYPE, 24],
  [RELATION, 25],
  [STOREY, 26],
  [PROXY, 27],
]);

function testField(key: string, kind: FieldDefinition['kind'], extra: Partial<FieldDefinition> = {}): FieldDefinition {
  return { key, label: `TEST ${key}`, subject: 'asset', kind, estimation: 'forbidden', criticality: 'optional', affects: [], impactRank: 900, confirmBy: 'engineer', ...extra };
}
const POWER = testField('asset.testPower', 'quantity', { unit: 'kW' });

function context(field: FieldDefinition, overrides: Partial<IfcProposalContext> = {}): IfcProposalContext {
  return {
    projectId: PROJECT,
    field,
    document: (id) => [DOCUMENT, FOREIGN].find((record) => record.id === id),
    modelSchema: (id, hash) => (id === DOCUMENT.id && hash === HASH ? 'IFC4' : undefined),
    statementAt: (id, hash, stepId) => (id === DOCUMENT.id && hash === HASH ? STATEMENTS.get(stepId) : undefined),
    elementStep: (id, hash, globalId) => (id === DOCUMENT.id && hash === HASH ? ELEMENTS.get(globalId) : undefined),
    readQuantities: (text) => (text === 'cca. 1.500 kW' ? [{ value: 1.5, unit: 'kW' }, { value: 1500, unit: 'kW' }] : []),
    readStepNumber: (token) => new Map([['7.5', 7.5], ['12.5', 12.5], ['3000.', 3000]]).get(token),
    candidateId: 'test-candidate',
    createdBy: 'test-service',
    createdAt: '2026-09-30T00:00:00.000Z',
    ...overrides,
  };
}

function entry(stepId: number, globalId: string, path: ProposedIfcEvidence['ifc']['path'], overrides: Partial<ProposedIfcEvidence> = {}): ProposedIfcEvidence {
  return { documentId: DOCUMENT.id, contentHash: HASH, ifc: { schema: 'IFC4', globalId, stepIds: [stepId], path }, excerpt: STATEMENTS.get(stepId) ?? '', ...overrides };
}

const POWER_PATH = { kind: 'property', through: 'occurrence', propertySet: 'TEST_Pset', property: 'TestPower' } as const;

function powerProposal(overrides: Partial<IfcProposal> = {}): IfcProposal {
  return {
    subjectId: 'test-asset',
    fieldKey: POWER.key,
    mechanism: 'direct_read',
    source: 'document',
    quantity: { value: 7.5, unit: 'kW' },
    evidence: [entry(22, PUMP, POWER_PATH)],
    valueFrom: { evidenceIndex: 0, literal: { typeName: 'IFCPOWERMEASURE', token: '7.5' } },
    ...overrides,
  };
}

describe('STEP statements read as text (ISO 10303-21)', () => {
  it('F-IFC-04: reads a statement into its id, entity and top-level arguments, strings and nested lists kept whole', () => {
    expect(readStepStatement(STATEMENTS.get(25) ?? '')).toEqual({ stepId: '25', entity: 'IFCRELCONTAINEDINSPATIALSTRUCTURE', args: [`'${RELATION}'`, '#2', '$', '$', '(#21)', '#26'] });
    expect(readStepStatement("#1=IFCLABEL('a,(b)'')',$);")?.args).toEqual(["'a,(b)'')'", '$']);
    expect(readStepStatement('#1=IFCLABEL((a,b);')).toBeUndefined();
    expect(readStepStatement('not a statement')).toBeUndefined();
  });

  it('F-IFC-04: unwraps a typed literal, and decodes STEP string escapes (\\X2\\, \\X\\, doubled quotes)', () => {
    expect(stepLiteral('IFCPOWERMEASURE(7.5)')).toEqual({ typeName: 'IFCPOWERMEASURE', token: '7.5' });
    expect(stepLiteral("'P-T1'")).toEqual({ token: "'P-T1'" });
    expect(decodeStepString("'Pomp\\X2\\0103\\X0\\ TEST'")).toBe('Pompă TEST');
    expect(decodeStepString("'It''s \\X\\E9'")).toBe("It's é");
    expect(decodeStepString("'\\PB\\TEST'")).toBeUndefined();
    expect(decodeStepString('7.5')).toBeUndefined();
  });

  it('F-EXTRACT-04: compares excerpts after decoding escapes and normalising whitespace and diacritics (6.2.1)', () => {
    expect(normaliseStepExcerpt("#21=IFCPUMP('Pompă TEST');")).toBe(normaliseStepExcerpt("#21=IFCPUMP('Pomp\\X2\\0103\\X0\\   TEST');"));
  });

  it('F-EXTRACT-04: refuses an IFC locator that is not one: a GlobalId, STEP ids and a path of its kinds', () => {
    expect(ifcLocatorShapeProblem({ schema: 'IFC4', globalId: PUMP, stepIds: [22], path: POWER_PATH })).toBeUndefined();
    expect(ifcLocatorShapeProblem({ schema: 'IFC4', globalId: 'short', stepIds: [22], path: POWER_PATH })).toBe('shape');
    expect(ifcLocatorShapeProblem({ schema: 'IFC4', globalId: PUMP, stepIds: [], path: POWER_PATH })).toBe('shape');
    expect(ifcLocatorShapeProblem({ schema: 'IFC4', globalId: PUMP, stepIds: [22, 22], path: POWER_PATH })).toBe('shape');
    expect(ifcLocatorShapeProblem({ schema: 'IFC4', globalId: PUMP, stepIds: [22], path: { kind: 'page' } })).toBe('shape');
  });
});

describe('the IFC evidence verifier: rule 1\'s five checks over an IFC locator', () => {
  it('F-EXTRACT-04 · F-IFC-04: accepts a value written in the model at its property statement as a document value, with an IFC entry and no 2.4 locator', () => {
    const verdict = verifyIfcProposal(powerProposal(), context(POWER));
    expect(verdict.outcome).toBe('accepted');
    if (verdict.outcome !== 'accepted') return;
    expect(verdict.candidate).toMatchObject({ source: 'document', quantity: { value: 7.5, unit: 'kW' }, evidence: [{ check: 'text_match', locator: {}, ifc: { globalId: PUMP, stepIds: [22] } }] });
    expect(verdict.candidate.confidence).toBeUndefined();
    const [stored] = verdict.candidate.evidence;
    expect(stored !== undefined && isIfcEvidence(stored)).toBe(true);
  });

  it('F-EXTRACT-04 · check 1: another project\'s model is refused before anything else is read (rule 13)', () => {
    const verdict = verifyIfcProposal(powerProposal({ evidence: [entry(22, PUMP, POWER_PATH, { documentId: FOREIGN.id })] }), context(POWER));
    expect(verdict).toMatchObject({ outcome: 'rejected', rejection: { check: 'document_in_project' }, guardrailEvents: [{ type: 'evidence_not_found', reason: 'ifc.document_in_project' }] });
  });

  it('F-EXTRACT-04 · check 2: another revision\'s content hash, or a schema the model record does not declare, is refused', () => {
    expect(verifyIfcProposal(powerProposal({ evidence: [entry(22, PUMP, POWER_PATH, { contentHash: OTHER_HASH })] }), context(POWER))).toMatchObject({ rejection: { check: 'content_hash_matches' } });
    const ifc2x3 = entry(22, PUMP, POWER_PATH);
    expect(verifyIfcProposal(powerProposal({ evidence: [{ ...ifc2x3, ifc: { ...ifc2x3.ifc, schema: 'IFC2X3' } }] }), context(POWER))).toMatchObject({
      rejection: { check: 'content_hash_matches', locatorProblem: 'schema' },
    });
  });

  it('F-EXTRACT-04 · check 3: a GlobalId absent from the model, a STEP id with no statement, and a path that does not resolve there are refused at the locator check', () => {
    const absent = entry(22, 'TESTGID0000000000000ZZ', POWER_PATH);
    expect(verifyIfcProposal(powerProposal({ evidence: [absent] }), context(POWER))).toMatchObject({ rejection: { check: 'locator_exists', locatorProblem: 'global_id' } });
    const missing = entry(23, PUMP, POWER_PATH);
    expect(verifyIfcProposal(powerProposal({ evidence: [missing] }), context(POWER))).toMatchObject({ rejection: { check: 'locator_exists', locatorProblem: 'step_id' } });
    const renamed = entry(22, PUMP, { ...POWER_PATH, property: 'OtherPower' });
    expect(verifyIfcProposal(powerProposal({ evidence: [renamed] }), context(POWER))).toMatchObject({ rejection: { check: 'locator_exists', locatorProblem: 'path' } });
    const wrongRelation = entry(25, PUMP, { kind: 'relation', relation: 'contained_in_spatial_structure', relatedGlobalId: PROXY });
    expect(verifyIfcEvidence([wrongRelation], context(POWER))).toMatchObject({ ok: false, check: 'locator_exists', locatorProblem: 'path' });
    const relation = entry(25, PUMP, { kind: 'relation', relation: 'contained_in_spatial_structure', relatedGlobalId: STOREY });
    expect(verifyIfcEvidence([relation], context(POWER)).ok).toBe(true);
  });

  it('F-EXTRACT-04 · check 4 (IFC-1): a STEP line changed after reading, with the same GlobalId, is refused at the excerpt check; the same text with its escapes decoded passes', () => {
    const changed = entry(22, PUMP, POWER_PATH, { excerpt: "#22=IFCPROPERTYSINGLEVALUE('TestPower',$,IFCPOWERMEASURE(8.5),$);" });
    expect(verifyIfcProposal(powerProposal({ evidence: [changed] }), context(POWER))).toMatchObject({
      outcome: 'rejected',
      rejection: { check: 'excerpt_at_locator' },
      guardrailEvents: [{ type: 'evidence_not_found', reason: 'ifc.excerpt_at_locator' }],
    });
    const decoded = entry(21, PUMP, { kind: 'attribute', through: 'occurrence', attribute: 'Name' }, { excerpt: `#21=IFCPUMP('${PUMP}',#2,'Pompă TEST',$,$,#3,#4,'P-T1',$);` });
    expect(verifyIfcEvidence([decoded], context(POWER)).ok).toBe(true);
  });

  it('F-EXTRACT-04 · check 5: a value that is not the literal at its path is refused, never re-sourced as an inference', () => {
    expect(verifyIfcProposal(powerProposal({ quantity: { value: 8.5, unit: 'kW' } }), context(POWER))).toMatchObject({ rejection: { check: 'value_in_excerpt' } });
    expect(verifyIfcProposal(powerProposal({ valueFrom: { evidenceIndex: 0, literal: { typeName: 'IFCREAL', token: '7.5' } } }), context(POWER))).toMatchObject({
      rejection: { check: 'value_in_excerpt' },
    });
  });

  it('F-EXTRACT-06 · keeps both readings of a rating written as text (an IfcLabel "1.500 kW"), low, and reads an attribute through the type object', () => {
    const label = verifyIfcProposal(
      powerProposal({
        quantity: { value: 1.5, unit: 'kW', approximate: true },
        alternatives: [{ value: 1500, unit: 'kW', approximate: true }],
        evidence: [entry(29, PUMP, { ...POWER_PATH, property: 'TestLabel' })],
        valueFrom: { evidenceIndex: 0, literal: { typeName: 'IFCLABEL', token: "'cca. 1.500 kW'" } },
      }),
      context(POWER),
    );
    expect(label).toMatchObject({ outcome: 'accepted', candidate: { source: 'document', confidence: 'low', alternatives: [{ value: 1.5 }, { value: 1500 }] } });
    const name = testField('asset.testTypeName', 'text');
    const typed = verifyIfcProposal(
      {
        subjectId: 'test-asset',
        fieldKey: name.key,
        mechanism: 'direct_read',
        source: 'document',
        text: 'Tip TEST',
        evidence: [entry(24, PUMP, { kind: 'attribute', through: 'type_object', attribute: 'Name' })],
        valueFrom: { evidenceIndex: 0, literal: { token: "'Tip TEST'" } },
      },
      context(name),
    );
    expect(typed).toMatchObject({ outcome: 'accepted', candidate: { source: 'document', text: 'Tip TEST' } });
  });

  it('F-EXTRACT-05 · F-IFC-05: an asset type from an IFC class is always an inference, capped; a proxy\'s class supports no type (6.2.9); an inferred quantity is refused (rule 1)', () => {
    const type = testField('asset.testType', 'enum', { options: ['test_pump'] });
    const classMapped = (evidence: ProposedIfcEvidence, confidence?: 'high'): IfcProposal => ({
      subjectId: 'test-asset',
      fieldKey: type.key,
      mechanism: 'class_mapping',
      source: 'document',
      choice: 'test_pump',
      evidence: [evidence],
      ...(confidence === undefined ? {} : { confidence }),
    });
    const onPump = entry(21, PUMP, { kind: 'attribute', through: 'occurrence', attribute: 'Name' });
    expect(verifyIfcProposal(classMapped(onPump, 'high'), context(type))).toMatchObject({ outcome: 'accepted', candidate: { source: 'ai_inference', confidence: 'high', choice: 'test_pump' } });
    expect(verifyIfcProposal(classMapped(onPump), context(type))).toMatchObject({ outcome: 'accepted', candidate: { source: 'ai_inference', confidence: 'low' } });
    const onProxy = entry(27, PROXY, { kind: 'attribute', through: 'occurrence', attribute: 'Name' });
    expect(verifyIfcProposal(classMapped(onProxy, 'high'), context(type))).toMatchObject({ outcome: 'rejected', rejection: { kind: 'proxy_class' } });
    expect(verifyIfcProposal(powerProposal({ mechanism: 'name_term', source: 'ai_inference' }), context(POWER))).toMatchObject({
      outcome: 'rejected',
      rejection: { kind: 'inferred_quantity' },
    });
  });

  it('F-EXTRACT-05: refuses any value on an owner\'s decision field (rule 3; G3-9) and a proposal with no evidence', () => {
    const decision = testField('project.testDecision', 'decision', { options: ['include'], confirmBy: 'owner' });
    expect(verifyIfcProposal({ subjectId: 'test-project', fieldKey: decision.key, mechanism: 'name_term', source: 'ai_inference', choice: 'include', evidence: [entry(21, PUMP, { kind: 'attribute', through: 'occurrence', attribute: 'Name' })] }, context(decision))).toMatchObject({
      rejection: { kind: 'malformed', problem: 'decision_field' },
    });
    expect(verifyIfcProposal(powerProposal({ evidence: [], valueFrom: undefined }), context(POWER))).toMatchObject({ rejection: { kind: 'malformed', problem: 'value_from' } });
  });
});
