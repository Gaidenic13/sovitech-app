/**
 * The sealed IFC section, with the gates as they are: every gate closed
 * (packages/registry/gates/). The open path is proven only in tests/proposed/,
 * through the test-utils override (prompt 3 section 5.4).
 *
 * Ids: R-027 and R-030 (no IFC value and no mapping table while ifc-values is
 * closed), G1-13 and G12-5 (the gate-closed behaviour these build on), prompt 3
 * sections 5.4 and 8.
 */
import { GATE_IDS, isGateId, productionGateSource, readGate } from '@sovitech/registry/gates';
import { describe, expect, it } from 'vitest';
import { MECHANISM_RULES } from './generated/annotations';
import { IfcGateIdSchema, type IfcCandidateProposal } from './generated/zod';
import { gatesOf, openIfcValues, parseExtractionOutput, type SealedIfcValues } from './index';
import { CORPUS } from './samples/corpus';

const withValues = CORPUS.cases.find((corpusCase) => corpusCase.name === 'ifc-with-values')?.value;

describe('R-027 · prompt 3 section 5.4: IFC values open only through the ifc-values gate', () => {
  it('R-027: with the production gates (ifc-values closed), the section stays shut and says which gate holds it', () => {
    const gates = productionGateSource();
    expect(readGate(gates, 'ifc-values').open).toBe(false);
    const result = parseExtractionOutput(withValues);
    if (!result.ok) throw new Error('the corpus case is valid');
    const reading = openIfcValues(result.value.ifcValues, gates);
    expect(reading.open).toBe(false);
    if (reading.open) return;
    expect(reading.reason).toBe('gate_closed');
    expect(reading).not.toHaveProperty('facts');
    expect(reading).not.toHaveProperty('candidateProposals');
  });

  it('R-027: a handle the parser did not seal opens nothing, and a missing section reads closed first', () => {
    const forged: SealedIfcValues = { sealed: 'ifc-values' };
    const gates = productionGateSource();
    expect(openIfcValues(forged, gates)).toMatchObject({ open: false, reason: 'gate_closed' });
    expect(openIfcValues(undefined, gates)).toMatchObject({ open: false, reason: 'gate_closed' });
  });

  it('R-027 · prompt 3 section 5.4: a gate source the registry did not issue is refused', () => {
    const result = parseExtractionOutput(withValues);
    if (!result.ok) throw new Error('the corpus case is valid');
    expect(() => openIfcValues(result.value.ifcValues, { kind: 'production' })).toThrow(/gate source/);
  });

  it('R-027 · R-030 · prompt 3 section 5.4: every gate an IFC proposal can wait for is a registry gate, and every mechanism waits for ifc-values', () => {
    for (const id of IfcGateIdSchema.options) expect(isGateId(id)).toBe(true);
    expect(IfcGateIdSchema.options.every((id) => (GATE_IDS as readonly string[]).includes(id))).toBe(true);
    for (const rule of Object.values(MECHANISM_RULES)) expect(rule.gates).toContain('ifc-values');
  });

  it('R-030: a proposal waits for its mechanism\'s gates even when it declares fewer', () => {
    const proposal: IfcCandidateProposal = {
      id: 'p-probe',
      subject: { kind: 'asset', elementGlobalId: '0TESTGLOBALID000000041' },
      fieldKey: 'asset.type',
      sourceClaim: 'ai_inference',
      mechanism: 'name_term',
      requiresGates: ['ifc-values'],
      datasets: [{ id: 'TEST-glossary', version: '0.0.1' }],
      value: { kind: 'choice', choice: 'fcu' },
      evidenceFactIds: ['f-probe'],
      confidence: 'high',
    };
    expect([...gatesOf(proposal)].sort()).toEqual(['dataset-glossary', 'ifc-code-inference', 'ifc-values']);
  });
});
