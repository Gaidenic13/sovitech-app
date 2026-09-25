/**
 * A gate as stored in packages/registry/gates/<id>.yaml (prompt 3 section
 * 5.4): its id, whether it is open, what it waits for (proposal ids, dataset
 * ids, decision numbers, each with its PRD D id and one approval reference
 * that starts empty), and the behaviour while closed.
 */
import { z } from 'zod';

/**
 * The starting set of prompt 3 section 5.4. A new gate is added here and as a
 * data file only where gated code is written, and recorded in the loosening
 * snapshot (docs/adr/0005-gates-mechanism.md).
 */
export const GATE_IDS = [
  'ifc-values',
  'ifc-code-inference',
  'ifc-identity',
  'ifc-untagged-count',
  'ifc-areas',
  'ifc-geometry',
  'ifc-units',
  'ifc-hidden-content',
  'view-provenance',
  'dataset-asset-taxonomy',
  'dataset-glossary',
  'dataset-point-templates',
  'dataset-cost-ranges',
  'dataset-sauter-catalogue',
  'units-7.2.22',
  'financial-indicators',
  'operations',
  'ai-processor-route',
] as const;
export type GateId = (typeof GATE_IDS)[number];

export function isGateId(value: string): value is GateId {
  return (GATE_IDS as readonly string[]).includes(value);
}

/**
 * What an item waits for:
 * - `guardrail-proposal`: a dashboards 7.2 or ifc-input 6.2 proposal, approved in a docs/guardrails.md change-log row;
 * - `dataset`: a dataset version with an approval record (G1-12);
 * - `owner-decision`: the owner's decision, recorded in docs/product/prd.md section 15 or docs/build-readiness.md.
 */
export const WAIT_KINDS = ['guardrail-proposal', 'dataset', 'owner-decision'] as const;
export type WaitKind = (typeof WAIT_KINDS)[number];

export const waitsForSchema = z
  .strictObject({
    item: z.string().min(1),
    kind: z.enum(WAIT_KINDS),
    dId: z.string().regex(/^D-\d+$/, 'a PRD D id such as D-38'),
    dataset: z
      .string()
      .regex(/^[a-z][a-z0-9-]+$/)
      .optional(),
    /** Empty while waiting. Only a person's record fills it; code never does. */
    approvalRef: z.string(),
  })
  .refine((item) => (item.kind === 'dataset') === (item.dataset !== undefined), {
    message: 'a dataset item names its dataset id, and only a dataset item does',
    path: ['dataset'],
  });
export type WaitsForItem = z.infer<typeof waitsForSchema>;

export const gateSchema = z.strictObject({
  id: z.string().refine(isGateId, { message: 'not a gate of the starting set (GATE_IDS in packages/registry/src/gates/schema.ts)' }),
  open: z.boolean(),
  waitsFor: z.array(waitsForSchema).min(1),
  closedBehaviour: z.string().min(1),
  source: z.string().min(1),
});

export interface GateDefinition {
  id: GateId;
  open: boolean;
  waitsFor: WaitsForItem[];
  closedBehaviour: string;
  source: string;
}
