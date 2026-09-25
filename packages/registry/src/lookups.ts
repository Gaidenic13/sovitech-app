/**
 * The registry as the domain takes it: lookups injected into derive and the
 * verifier, never an import (packages/domain depends on no package; its
 * `FieldLookup`, `UnitLookup` and `DeriveContext.stageOrder`).
 *
 * - `field`: the registry's field entry, which is a 2.6 FieldDefinition
 *   (RegistryFieldIsFieldDefinition in ./validation/schema.ts proves it at
 *   compile time).
 * - `unit`: the closed unit registry (2.7).
 * - `stageOrder`: rule 4's document-stage order, the registry's approver
 *   setting 4 (proposed, not approved; D-53). Derive proposes no active
 *   candidate by stage without it.
 * The dataset approval lookup needs the approval records as well:
 * `datasetApprovalLookup` in ./datasets/datasets.ts.
 */
import type { DocumentStage, FieldLookup, UnitLookup } from '@sovitech/domain';
import { UNIT_DEFINITIONS } from './units/units';
import type { RegistryBundle, RegistryFieldDefinition } from './validation/schema';

export interface RegistryLookups {
  readonly field: FieldLookup & ((key: string) => RegistryFieldDefinition | undefined);
  readonly unit: UnitLookup;
  readonly stageOrder: readonly (readonly DocumentStage[])[];
}

export function registryLookups(registry: RegistryBundle): RegistryLookups {
  const fields = new Map(registry.fields.map((field) => [field.key, field]));
  const units = new Map(UNIT_DEFINITIONS.map((unit) => [unit.code, unit]));
  return {
    field: (key: string) => fields.get(key),
    unit: (code) => units.get(code),
    stageOrder: registry.settings.documentStageOrder.tiers.map((tier) => [...tier]),
  };
}
