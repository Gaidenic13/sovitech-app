/**
 * What the admin builders read (phase 7; docs/adr/0053): plain data the API reads through the store's admin definer
 * functions (`@sovitech/db`'s admin reads, migration 0018) and the registry's gates and datasets, in the admin's own
 * request. Ids, codes, counts, times and stored texts (an account's name as created, a role event's reason as recorded)
 * only: no candidate's value, evidence, excerpt, extracted text, file name or project name (rule 13; ADR 0013 decision 5).
 *
 * The types are the phase 7 planner's, with the view-model builder's changes: UD-41 takes the three tiers' calibration
 * (counts per tier and item type, from `calibrateTiers` over the recorded decisions) rather than the raw corrections, and
 * the threshold the guardrails propose (the registry's `settings.calibrationThreshold`), for the line that says it is
 * not set.
 */
import type { AppRole, Calibration, CalibrationSetting, GuardrailEventType } from '@sovitech/domain';

export interface AdminAccountInput {
  readonly userId: string;
  readonly displayName: string;
  readonly kind: 'person' | 'service' | 'seed';
  readonly roles: readonly { readonly role: AppRole; readonly since: string }[];
  /** Listed in SOVITECH_DEV_ACCOUNTS: a synthetic development account. */
  readonly development: boolean;
}

export interface AdminRoleEventInput {
  readonly eventId: string;
  readonly userId: string;
  readonly role: AppRole;
  readonly change: 'granted' | 'revoked';
  /** The acting account's id, or null for the operator's login. */
  readonly byUserId: string | null;
  readonly at: string;
  readonly reason: string;
}

export interface AdminProjectInput {
  readonly projectId: string;
  readonly isDemo: boolean;
  readonly createdAt: string;
  readonly memberIds: readonly string[];
}

/** UD-39's input. */
export interface AdminAccountsInput {
  readonly asOf: string;
  readonly accounts: readonly AdminAccountInput[];
  readonly roleEvents: readonly AdminRoleEventInput[];
  readonly projects: readonly AdminProjectInput[];
}

/** One dataset a gate waits for (`waitsFor[].kind === 'dataset'`) or the registry declares, with what is known of it. */
export interface AdminDatasetInput {
  readonly datasetKey: string;
  /** The gate item's own words ("SOVITECH cost ranges and benchmarks"). */
  readonly name: string;
  /** The declared version, or null while none is received. */
  readonly version: string | null;
  /** Whether a stored approval record resolves for it (never while no approver is named, D-05). */
  readonly approved: boolean;
  /** The gates that wait for it, and the D id the gate names. */
  readonly gates: readonly { readonly gateId: string; readonly dId: string }[];
}

/** UD-40's input. */
export interface AdminDatasetsInput {
  readonly asOf: string;
  readonly datasets: readonly AdminDatasetInput[];
}

/** UD-41's input. */
export interface AdminGuardrailEventsInput {
  readonly asOf: string;
  readonly projects: readonly { readonly projectId: string; readonly isDemo: boolean }[];
  /** Counts per project and event type, every type for every project, as the store counted them (a count of none included). */
  readonly counts: readonly { readonly projectId: string; readonly type: GuardrailEventType; readonly count: number }[];
  /** Counts per event type in all projects, as the store counted them. */
  readonly totals: readonly { readonly type: GuardrailEventType; readonly count: number }[];
  /** The owner's decisions on inferences per project, every project (confirmations and corrections), for the owner correction rate. */
  readonly inferenceDecisions: readonly { readonly projectId: string; readonly confirmations: number; readonly corrections: number }[];
  /**
   * The three tiers' calibration (ADR 0054): corrections per tier and item type over every recorded decision, and whether
   * each tier's wording dropped (never while no threshold is set: R-152 "Until decided"). A decision recorded with no
   * tier is not counted under a tier.
   */
  readonly calibration: Calibration;
  /** The threshold the approver set (D-53), or null while it is not set: null in this build (ADR 0054 decision 1). */
  readonly threshold: CalibrationSetting | null;
  /** The threshold the guardrails propose (rule 3: "proposed: 10% over the last 50 decisions"), as the registry records it, for the line that says it is not set. */
  readonly proposedThreshold: CalibrationSetting;
  readonly erasures: readonly {
    readonly documentEventId: string;
    readonly projectId: string;
    readonly isDemo: boolean;
    readonly documentId: string;
    readonly role: 'owner' | 'system';
    /** The owner's account name when the owner asked; null for the system. */
    readonly byName: string | null;
    readonly at: string;
    readonly excerptsErased: number;
    readonly textPartsDeleted: number;
    readonly candidatesWithdrawn: number;
  }[];
}
