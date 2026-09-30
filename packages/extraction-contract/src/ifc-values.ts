/**
 * The sealed IFC section of an extraction output (IfcValues: IFC facts with
 * their IFC locators, and the table-driven IFC candidate proposals).
 *
 * The API may use it only while the `ifc-values` gate is open (prompt 3
 * sections 5.4 and 8): under guardrails v1.6 Evidence.locator has no IFC field,
 * so no value read from a model can be stored (ifc-input 6.2.1; G1-13, G12-5).
 * parseExtractionOutput() therefore never hands the section out as data: it
 * returns a sealed handle, an empty frozen object whose JSON is
 * `{"sealed":"ifc-values"}`, so logging an output leaks no model text either
 * (rule 13). openIfcValues() is the one way in. It reads the gate through the
 * registry's one gate function with the caller's gate source, and it withholds
 * each proposal whose own gates (its mechanism's, ifc-input 6.2.x) are not all
 * open. No environment variable or option opens anything here: only a gate
 * source that reads the gate open does, and outside tests/proposed/ that is
 * only an approved gate file (docs/adr/0005-gates-mechanism.md).
 */
import { readGate, type GateReading, type GateSource } from '@sovitech/registry/gates';
import type { IfcCandidateProposal, IfcFact, IfcGateId, IfcValues } from './generated/zod';
import { mechanismRule } from './invariants';

/** The sealed handle. It holds nothing readable. */
export interface SealedIfcValues {
  readonly sealed: 'ifc-values';
}

const sealedValues = new WeakMap<SealedIfcValues, IfcValues>();

/** Seals a parsed IfcValues section. Module-internal to the contract package (not exported by its entry). */
export function sealIfcValues(values: IfcValues): SealedIfcValues {
  const handle: SealedIfcValues = Object.freeze({ sealed: 'ifc-values' });
  sealedValues.set(handle, values);
  return handle;
}

/**
 * The positions of the sealed proposals shaped by a dataset outside `mounted`
 * (keys `<id>@<version>`), for outputAnswersRequest(). Positions only: nothing
 * from the model leaves the seal.
 */
export function proposalsOutsideDatasets(sealed: SealedIfcValues, mounted: ReadonlySet<string>): readonly number[] {
  const values = sealedValues.get(sealed);
  if (values === undefined) return [];
  return values.candidateProposals.flatMap((proposal, index) =>
    proposal.datasets.some((dataset) => !mounted.has(`${dataset.id}@${dataset.version}`)) ? [index] : [],
  );
}

export interface WithheldProposal {
  readonly proposalId: string;
  /** The gates, of those the proposal waits for, that read closed. */
  readonly closedGates: readonly IfcGateId[];
}

export type IfcValuesReading =
  | {
      /** ifc-values reads closed: nothing from the model may be used. */
      readonly open: false;
      readonly reason: 'gate_closed';
      readonly gate: GateReading;
    }
  | {
      /** The gate reads open, but the output carries no IFC section (not an IFC file, or not asked for). */
      readonly open: false;
      readonly reason: 'absent';
    }
  | {
      readonly open: true;
      readonly facts: readonly IfcFact[];
      /** The proposals whose every gate reads open. */
      readonly candidateProposals: readonly IfcCandidateProposal[];
      /** The rest, by id, with the gates that hold each back. */
      readonly withheld: readonly WithheldProposal[];
    };

/** The gates a proposal waits for: those it declares, and at least those of its mechanism. */
export function gatesOf(proposal: IfcCandidateProposal): readonly IfcGateId[] {
  return [...new Set<IfcGateId>([...mechanismRule(proposal.mechanism).gates, ...proposal.requiresGates])];
}

/**
 * Opens the IFC section of a parsed output, only while `ifc-values` reads open
 * in the given gate source, and only the proposals whose own gates all read open.
 */
export function openIfcValues(sealed: SealedIfcValues | undefined, gates: GateSource): IfcValuesReading {
  const gate = readGate(gates, 'ifc-values');
  if (!gate.open) return { open: false, reason: 'gate_closed', gate };
  const values = sealed === undefined ? undefined : sealedValues.get(sealed);
  if (values === undefined) return { open: false, reason: 'absent' };
  const candidateProposals: IfcCandidateProposal[] = [];
  const withheld: WithheldProposal[] = [];
  for (const proposal of values.candidateProposals) {
    const closedGates = gatesOf(proposal).filter((id) => !readGate(gates, id).open);
    if (closedGates.length === 0) candidateProposals.push(proposal);
    else withheld.push({ proposalId: proposal.id, closedGates });
  }
  return { open: true, facts: values.facts, candidateProposals, withheld };
}
