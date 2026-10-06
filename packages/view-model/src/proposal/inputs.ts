/**
 * What the stored proposal's builders read (phase 5; docs/adr/0048, 0049): the stored snapshot, the candidates it names,
 * the project's fields as they are now, the engine's readings (stage, changes, headline), the open items as step 8 plans
 * them, the stored versions and the generated outputs. The API assembles all of it from the store in the user's own
 * request; nothing here reads the store, a module-level registry or a gate source.
 */
import type { Candidate, CandidateEvent, DocumentRecord, FieldState, SubjectKind } from '@sovitech/domain';
import type { FormulaCatalogue, PriceStageReading, QuotationStanding, SnapshotChanges, StoredQuotationRecord, StoredSnapshot } from '@sovitech/engine';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import type { DisplayObject, ProjectHeader, ProposalView } from '../browser/contract';

/** The open items' shape (proposal.ts OpenItemsSchema). */
export type OpenItems = ProposalView['whatWeStillNeed'];

/** Thrown by a builder asked for something its input cannot give (the API answers 500, never a guess). */
export class ProposalNotBuilt extends Error {
  constructor(what: string) {
    super(`@sovitech/view-model: ${what}`);
    this.name = 'ProposalNotBuilt';
  }
}

/** One stored version, for the versions list (newest first). */
export interface StoredVersion {
  readonly snapshotId: string;
  readonly createdAt: string;
}

/** A registered field of the project or its building as it is now, derived with the one derive function (2.4). */
export interface ProposalField {
  readonly field: RegistryFieldDefinition;
  readonly subjectId: string;
  readonly subjectKind: SubjectKind;
  readonly state: FieldState;
  /** Every candidate of the field, eligible or not (a snapshot's input stays readable after it is superseded). */
  readonly candidates: readonly Candidate[];
  readonly candidateEvents: readonly CandidateEvent[];
  /** Whether the owner was asked for it (Not provided yet rather than Unknown; 2.8), as the wizard reads it. */
  readonly asked: boolean;
  /** Whether the field has no eligible candidate now (rule 7: an output's Add action only where the input is still missing now). */
  readonly missingNow: boolean;
}

/** The open items, the project's now, as step 8 plans and resolves them (rule 7; ADR 0048 decision 7). */
export interface OpenItemsNow {
  readonly view: OpenItems;
  /** The display objects the items name (the same value ids as step 8: G2-7). */
  readonly displays: readonly DisplayObject[];
}

/** What the proposal builders read (the API assembles it from the store; ADR 0048). */
export interface ProposalBuildInput {
  readonly projectId: string;
  readonly buildingId: string;
  readonly header: ProjectHeader;
  /** The snapshot as stored (engine `StoredSnapshot`), with its pending documents and drafted paragraphs. */
  readonly snapshot: StoredSnapshot & {
    readonly pendingDocumentIds: readonly string[];
    readonly drafted: readonly { readonly slot: string; readonly ordinal: number; readonly text: string }[];
  };
  /** Every candidate the snapshot names, by id (inputs and outputs), as stored (excerpts "[erased]" after erasure). */
  readonly snapshotCandidates: ReadonlyMap<string, Candidate>;
  /** The project's and the building's registered fields as they are now. */
  readonly current: readonly ProposalField[];
  /** What changed since generation (engine `snapshotChanges`): the outputs that read "Out of date, recalculating". */
  readonly changes: SnapshotChanges;
  readonly quotations: readonly { readonly record: StoredQuotationRecord; readonly standing: QuotationStanding }[];
  /** The stage of an investment output, from stored records only (engine `priceStageOf`; rule 10). */
  readonly stage: (output: string) => PriceStageReading;
  /** The investment output the headline carries (engine `headlineOutputOf`). */
  readonly headlineOutput: string;
  /** The catalogue the snapshot was generated with: the names of what was missing (the production one in the app). */
  readonly catalogue: FormulaCatalogue;
  readonly versions: readonly StoredVersion[];
  /** "Still reading <n> files. Your estimate will update when they finish." now (phase 3's display), or null. */
  readonly stillReading: DisplayObject | null;
  readonly openItems: OpenItemsNow;
  readonly closedGates: ReadonlySet<string>;
  /** Every document of the project (an input's source line names its file, stage and revision). */
  readonly documents: readonly DocumentRecord[];
  readonly activeDocumentIds: ReadonlySet<string>;
  readonly fileName: (documentId: string) => string | undefined;
  readonly projectType: string | undefined;
  /**
   * A candidate's verification now, derived (2.4: provisional status is "computed on read"), on any subject of the
   * project (an asset's too), or undefined for a candidate no derived field holds.
   */
  readonly verificationOf: (candidateId: string) => 'unverified' | 'owner_acknowledged' | 'user_confirmed' | 'engineer_verified' | undefined;
}

/** A generated output as Reports reads it (migration 0015 `generated_outputs`). */
export interface GeneratedOutput {
  readonly id: string;
  readonly kind: 'proposal_pdf';
  readonly snapshotId: string;
  readonly startedAt: string;
  /** The generation date of the snapshot it prints. */
  readonly snapshotCreatedAt: string;
  /** The display name of the account that started it (a development or demo account's synthetic name; never a reviewer's role). */
  readonly startedByName: string;
  /** "Superseded: inputs changed on <date>" when the snapshot's quotation record is superseded (none in the live app). */
  readonly superseded: { readonly changedOn: string } | null;
}
