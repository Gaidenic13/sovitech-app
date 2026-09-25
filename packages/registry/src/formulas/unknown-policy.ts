/**
 * How a formula treats an unknown input (docs/guardrails.md rule 1, "Formulas
 * declare how they handle unknowns": "Each formula's `unknownPolicy` must be
 * declared, and the default is `refuse`"; "Ranges need a basis"; G1-9).
 *
 * Phase 1 declares every formula signature an `affects` entry names before its
 * body exists (prompt 3 section 10). The run plan here is read from the
 * signature, so the sensitivity test (../validation/sensitivity.ts) and, from
 * phase 5, the engine run a formula the same way:
 * - `refuse`, and a signature that declares nothing: any unknown input refuses
 *   the run, naming what is missing ("Not available yet", rule 7);
 * - `range_over_options`: an unknown input that is an enum or decision with
 *   options gives a range over them (G7-1); an unknown input with no options
 *   has no basis for a range, so the run is refused for it (rule 1, "Ranges
 *   need a basis");
 * - `exclude_and_count`: unknown inputs are left out and counted; whether the
 *   total may still show one figure is the engine's (rule 1, "Material
 *   exclusions"; phase 5).
 * Nothing here computes a value.
 */
import type { FormulaSignature, RegistryFieldDefinition } from '../validation/schema';

export type UnknownPolicy = NonNullable<FormulaSignature['unknownPolicy']>;

/** The declared policy, or `refuse` when the signature declares none (rule 1; G1-9). */
export function resolveUnknownPolicy(signature: { readonly inputs: readonly string[]; readonly unknownPolicy?: UnknownPolicy | undefined }): UnknownPolicy {
  return signature.unknownPolicy ?? 'refuse';
}

export type FormulaRunPlan =
  | { readonly action: 'run'; readonly policy: UnknownPolicy }
  | { readonly action: 'refuse'; readonly policy: UnknownPolicy; readonly missing: readonly string[] }
  | {
      readonly action: 'range_over_options';
      readonly policy: 'range_over_options';
      readonly over: readonly { readonly fieldKey: string; readonly options: readonly string[] }[];
    }
  | { readonly action: 'exclude_and_count'; readonly policy: 'exclude_and_count'; readonly excluded: readonly string[] };

/**
 * How a run of `signature` goes, given which inputs are known. `known` says
 * whether an input field has a value the formula may use; `field` looks up an
 * input's registry entry, for the options a range would run over.
 */
export function planFormulaRun(
  signature: { readonly inputs: readonly string[]; readonly unknownPolicy?: UnknownPolicy | undefined },
  known: (fieldKey: string) => boolean,
  field: (fieldKey: string) => Pick<RegistryFieldDefinition, 'kind' | 'options'> | undefined,
): FormulaRunPlan {
  const policy = resolveUnknownPolicy(signature);
  const unknown = signature.inputs.filter((input) => !known(input));
  if (unknown.length === 0) return { action: 'run', policy };
  switch (policy) {
    case 'refuse':
      return { action: 'refuse', policy, missing: unknown };
    case 'exclude_and_count':
      return { action: 'exclude_and_count', policy, excluded: unknown };
    case 'range_over_options': {
      const over: { fieldKey: string; options: readonly string[] }[] = [];
      const noBasis: string[] = [];
      for (const fieldKey of unknown) {
        const entry = field(fieldKey);
        const options = entry !== undefined && (entry.kind === 'enum' || entry.kind === 'decision') ? entry.options : undefined;
        if (options !== undefined && options.length >= 2) over.push({ fieldKey, options: [...options] });
        else noBasis.push(fieldKey);
      }
      if (noBasis.length > 0) return { action: 'refuse', policy, missing: noBasis };
      return { action: 'range_over_options', policy, over };
    }
  }
}
