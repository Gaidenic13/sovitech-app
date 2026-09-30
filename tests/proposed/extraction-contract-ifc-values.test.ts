/**
 * Proposed behaviour, not indexed (prompt 3 section 5.4): the sealed IFC section
 * of an extraction output opens only through the gates, here opened by the
 * test-utils override. It waits for ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10, the
 * approved IFC mapping tables and the owner's revision of build-readiness
 * decision 4 (the ifc-values gate), and, proposal by proposal, for the gates of
 * each mechanism (ifc-input 6.2.4, 6.2.6, 6.2.9; ifc-identity, ifc-areas,
 * ifc-code-inference, dataset-asset-taxonomy).
 *
 * Ids: R-027, R-030, R-037, R-041 (gated), ifc-input 5.4 IFC-1 (the locator it
 * carries), prompt 3 sections 5.4 and 8.
 */
import { openIfcValues, parseExtractionOutput, type ExtractionOutput, type IfcFact } from '@sovitech/extraction-contract';
import { productionGateSource } from '@sovitech/registry/gates';
import { openGateForTest } from '@sovitech/registry/test-utils';
import { describe, expect, it } from 'vitest';

const PROJECT = '0192f0a0-0000-7000-8000-00000000c0a1';
const HASH = `sha256:${'c'.repeat(64)}`;
const ELEMENT = '0TESTGLOBALID000000041';
const SPACE = '0TESTGLOBALID000000043';

function fact(id: string, globalId: string, stepId: number, path: IfcFact['locator']['path'], token: string): IfcFact {
  return {
    id,
    locator: { contentHash: HASH, schema: 'IFC4', globalId, stepIds: [stepId], path },
    value: { kind: 'real', token },
    excerpt: `#${String(stepId)}=IFCTESTLINE(${token});`,
  };
}

/** A synthetic IFC output with facts and one proposal per mechanism family; every value is TEST data. */
function output(): ExtractionOutput {
  return {
    contractVersion: '1.0.0',
    producer: { name: 'sovitech-extractor', version: '0.1.0', libraries: [] },
    job: { projectId: PROJECT, documentId: '0192f0a0-0000-7000-8000-00000000d0c1', contentHash: HASH },
    format: 'ifc',
    analysis: { status: 'stored_only', formatWord: 'IFC model' },
    coverage: {},
    ifcModel: {
      header: { schema: 'IFC4' },
      classesPresent: ['IfcUnitaryEquipment', 'IfcSpace'],
      processing: 'complete',
      schemaCheck: { tool: { name: 'ifcopenshell.validate', version: '0.8.5' }, outcome: 'no_problems' },
    },
    ifcValues: {
      facts: [
        fact('f-flow', ELEMENT, 901, { kind: 'property', through: 'type_object', propertySet: 'Pset TEST', property: 'Debit TEST' }, '1.75'),
        fact('f-area', SPACE, 1203, { kind: 'quantity', through: 'occurrence', quantitySet: 'Qto_SpaceBaseQuantities', quantity: 'NetFloorArea' }, '13.5'),
        fact('f-class', ELEMENT, 812, { kind: 'attribute', through: 'occurrence', attribute: 'PredefinedType' }, '0.5'),
      ],
      candidateProposals: [
        {
          id: 'p-flow',
          subject: { kind: 'asset', elementGlobalId: ELEMENT },
          fieldKey: 'asset.airflow',
          sourceClaim: 'document',
          mechanism: 'direct_read',
          requiresGates: ['ifc-values'],
          datasets: [{ id: 'TEST-ifc-property-map', version: '0.0.1' }],
          value: { kind: 'fact', factId: 'f-flow' },
          evidenceFactIds: ['f-flow'],
        },
        {
          id: 'p-area',
          subject: { kind: 'zone', elementGlobalId: SPACE },
          fieldKey: 'zone.area',
          sourceClaim: 'document',
          mechanism: 'quantity_set_area',
          requiresGates: ['ifc-values', 'ifc-areas'],
          datasets: [{ id: 'TEST-ifc-property-map', version: '0.0.1' }],
          value: { kind: 'fact', factId: 'f-area' },
          evidenceFactIds: ['f-area'],
        },
        {
          id: 'p-type',
          subject: { kind: 'asset', elementGlobalId: ELEMENT },
          fieldKey: 'asset.type',
          sourceClaim: 'ai_inference',
          mechanism: 'class_mapping',
          requiresGates: ['ifc-values', 'ifc-code-inference', 'dataset-asset-taxonomy'],
          datasets: [{ id: 'TEST-ifc-class-map', version: '0.0.1' }],
          value: { kind: 'choice', choice: 'ahu' },
          evidenceFactIds: ['f-class'],
          confidence: 'high',
        },
      ],
    },
    findings: [],
    derivatives: [],
  };
}

function parsed() {
  const result = parseExtractionOutput(output());
  if (!result.ok) throw new Error(`the synthetic output is refused: ${JSON.stringify(result.problems)}`);
  return result.value;
}

describe('R-027 (gated: ifc-values): the sealed IFC section opens only through the gates', () => {
  it('R-027: with every gate closed, nothing opens', () => {
    expect(openIfcValues(parsed().ifcValues, productionGateSource())).toMatchObject({ open: false, reason: 'gate_closed' });
  });

  it('R-027: with ifc-values open, the facts open with their IFC locators, and each proposal waits for its own gates', () => {
    const reading = openIfcValues(parsed().ifcValues, openGateForTest('ifc-values'));
    if (!reading.open) throw new Error('ifc-values reads open');
    expect(reading.facts.map((item) => item.locator.globalId)).toEqual([ELEMENT, SPACE, ELEMENT]);
    expect(reading.facts[0]?.locator.stepIds).toEqual([901]);
    expect(reading.candidateProposals.map((proposal) => proposal.id)).toEqual(['p-flow']);
    expect(reading.withheld).toEqual([
      { proposalId: 'p-area', closedGates: ['ifc-areas'] },
      { proposalId: 'p-type', closedGates: ['ifc-code-inference', 'dataset-asset-taxonomy'] },
    ]);
  });

  it('R-041 (gated: ifc-areas): an area proposal opens only when ifc-areas opens too', () => {
    const reading = openIfcValues(parsed().ifcValues, openGateForTest('ifc-areas', openGateForTest('ifc-values')));
    if (!reading.open) throw new Error('ifc-values reads open');
    expect(reading.candidateProposals.map((proposal) => proposal.id)).toEqual(['p-flow', 'p-area']);
  });

  it('R-027: ifc-areas alone opens nothing: ifc-values comes first', () => {
    expect(openIfcValues(parsed().ifcValues, openGateForTest('ifc-areas'))).toMatchObject({ open: false, reason: 'gate_closed' });
  });

  it('R-027: a handle the parser did not seal opens nothing, even with the gate open', () => {
    expect(openIfcValues({ sealed: 'ifc-values' }, openGateForTest('ifc-values'))).toEqual({ open: false, reason: 'absent' });
  });
});
