/**
 * The gate part of the loosening check (prompt 3 section 5.4): a gate may be
 * open only while an approver is named and every item it waits for carries
 * an approval reference that resolves. Any reference, open gate or closed,
 * must resolve when it is filled in.
 */
import { resolveApprovalRef, type ApprovalContext, type ApprovalTarget } from '../approvals';
import type { GateDefinition, WaitsForItem } from './schema';

export function targetOf(item: WaitsForItem): ApprovalTarget {
  switch (item.kind) {
    case 'guardrail-proposal':
      return { kind: 'guardrail-proposal', item: item.item };
    case 'dataset':
      return { kind: 'dataset', dataset: item.dataset ?? '' };
    case 'owner-decision':
      return { kind: 'owner-decision', item: item.item, dId: item.dId };
  }
}

/** One line per problem, naming the gate file and the item. An empty list means every gate may stand as it is. */
export function verifyGates(gates: readonly GateDefinition[], context: ApprovalContext): string[] {
  const problems: string[] = [];
  for (const gate of gates) {
    const file = `packages/registry/gates/${gate.id}.yaml`;
    if (gate.open && context.approvers.length === 0) {
      problems.push(
        `${file}: the gate ${gate.id} is open while no approver is named in docs/guardrails.md section 10 (D-05); any open gate fails until then`,
      );
    }
    for (const item of gate.waitsFor) {
      const label = `${file}: ${gate.id} waits for ${item.item} (${item.dId})`;
      if (item.approvalRef.trim() === '') {
        if (gate.open) problems.push(`${label}: the gate is open, but this item has no approval reference`);
        continue;
      }
      const resolution = resolveApprovalRef(item.approvalRef, targetOf(item), context);
      if (!resolution.ok) problems.push(`${label}: the reference "${item.approvalRef}" does not resolve: ${resolution.reason}`);
    }
  }
  return problems;
}
