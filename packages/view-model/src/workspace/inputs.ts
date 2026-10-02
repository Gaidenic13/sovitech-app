/**
 * What the workspace's view builders read (phase 4; docs/adr/0044-workspace-api-contract.md decision 5): the
 * project's stored state as the API derived it in the user's own request, with the registry and the closed gates
 * it was read with (the API's registry seam, ADR 0044 decision 4), and the one way every screen resolves a field
 * (`resolve`: the one resolver with the actions the owner has on it, so one value id with one filter shows one
 * display on every page, G2-7). Nothing here reads the store, a module-level registry or a gate source.
 */
import type { AssetAppearance, AssetRegister, Candidate, CandidateEvent, DocumentRecord, FieldState, SubjectKind } from '@sovitech/domain';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import type { DisplayObject } from '../browser/contract';
import type { Suggestion } from '../intake';

/** A registered field on one of the project's subjects, derived with the one derive function (2.4). */
export interface WorkspaceField {
  readonly field: RegistryFieldDefinition;
  readonly subjectId: string;
  readonly subjectKind: SubjectKind;
  readonly state: FieldState;
  readonly candidates: readonly Candidate[];
  readonly candidateEvents: readonly CandidateEvent[];
}

/** The project as the workspace reads it. */
export interface WorkspaceProject {
  readonly projectId: string;
  readonly buildingId: string;
  /** The project type the owner answered on step 1 (its key), for From design drawings (2.3). */
  readonly projectType: string | undefined;
  /** Every document of the project, withdrawn and erased ones included (an evidence entry may still name one). */
  readonly documents: readonly DocumentRecord[];
  /** The documents not withdrawn or erased, in id order. */
  readonly activeDocuments: readonly DocumentRecord[];
  /** The file name as served (`servedFileName`: no bidirectional or format controls, G2-14), undefined when nothing is left. */
  readonly fileName: (documentId: string) => string | undefined;
  /**
   * Whether a completed AI run searched any of the project's documents (rule 12; G12-8): until one did, no register
   * says anything was "not found", and an empty register says only what is stored (G12-10).
   */
  readonly searched: boolean;
  /** The gates that are closed (prompt 3 5.4), by id. */
  readonly closedGates: ReadonlySet<string>;
  /** A registered field on a subject of the project, derived; undefined when the registry declares no such field for that subject's kind. */
  readonly field: (subjectId: string, fieldKey: string) => WorkspaceField | undefined;
  /** Every registered field on every subject of the project, derived (for the delete effect, 2.3). */
  readonly fields: readonly WorkspaceField[];
  /**
   * A registered field's display objects (the field's own first), as every screen resolves it: the one resolver with
   * the owner's actions on it (Edit and the rule 5 confirmation on the project's and the building's fields, as the
   * wizard shows them; on a zone's fields Edit (UD-09); on an asset's fields only "Looks right" and "Something's
   * wrong", since every asset is treated as possibly life-safety, prompt 3 5.2). Undefined for an unregistered field.
   */
  readonly resolve: (subjectId: string, fieldKey: string) => readonly DisplayObject[] | undefined;
  /** The asset register, derived (2.5): one asset per tag; untagged appearances are never assets. */
  readonly register: AssetRegister;
  /** Every stored appearance, by id (the asset's tag as written and its evidence). */
  readonly appearances: readonly AssetAppearance[];
  /** The project's zone subjects (2.2), oldest first. */
  readonly zoneIds: readonly string[];
  /** The visible Suggested preselections that stand now (rule 3; the intake's one guard: never a life-safety or never-preselected system). */
  readonly suggestions: readonly Suggestion[];
  /** How many active documents are being read now (queued or analysing). */
  readonly readingCount: number;
}

/** What a view builder answers: the view and the display objects it names, one per value id. */
export interface Built<View> {
  readonly view: View;
  readonly displayObjects: readonly DisplayObject[];
}

/**
 * The registered field keys the workspace reads on assets and zones (ADR 0045 decision 1: none is in the production
 * registry; TEST registries declare them in tests). A key the registry does not declare reads Unknown.
 * - An asset's system holds a catalogue system id as its choice; its level a level key (`upper_3`) as its choice or
 *   text; its zone a zone subject id as its text: a filter matches only an asset whose value says so (filters write
 *   nothing, R-066; an asset whose value is unknown matches no filter).
 */
export const ASSET_FIELDS = {
  type: 'asset.type',
  system: 'asset.system',
  location: 'asset.location',
  level: 'asset.level',
  zone: 'asset.zone',
} as const;

/**
 * The zone's fields, in the order its details show them (R-061; US-ZONES-03 AC1): the row shows the first five; the
 * description (a text value with its source; stored text is data only, rule 14) is shown in the details only.
 */
export const ZONE_FIELDS = {
  code: 'zone.code',
  name: 'zone.name',
  level: 'zone.level',
  kind: 'zone.kind',
  area: 'zone.area',
  description: 'zone.description',
} as const;
