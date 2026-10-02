/**
 * In-memory TEST projects for the workspace's view-model cases (phase 4): a `WorkspaceProject` as the API would read
 * it, built from TEST fields, candidates, documents and asset appearances, derived with the domain's one derive
 * function (./builders.ts `testContext`) and resolved with the one resolver. `resolve` stands in for the API's
 * resolution of a field (the same resolver, the asked reading of a registered question's field, a visible suggestion
 * on a decision); the cases prove what the view builders make of it. Nothing is written anywhere.
 */
import {
  deriveAssetRegister,
  type AssetAppearance,
  type AssetIdentity,
  type Candidate,
  type CandidateEvent,
  type DocumentEvent,
  type DocumentRecord,
  type FieldEvent,
  type SubjectKind,
} from '@sovitech/domain';
import { GATE_IDS } from '@sovitech/registry/gates';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { DEFAULT_FORMAT_OPTIONS, editActionOf, lineOf, resolveField, shownCandidateIdsOf, type Suggestion, type WorkspaceField, type WorkspaceProject } from '@sovitech/view-model/server';
import { testDocumentStatuses, testEvents } from './builders';
import { derived } from './view-model';

/** One TEST field on a subject, with its candidates and events. */
export interface TestSubjectField {
  readonly field: RegistryFieldDefinition;
  readonly subjectId: string;
  readonly subjectKind: SubjectKind;
  readonly candidates?: readonly Candidate[];
  readonly candidateEvents?: readonly CandidateEvent[];
  readonly fieldEvents?: readonly FieldEvent[];
}

export interface TestWorkspaceInput {
  readonly projectId: string;
  readonly buildingId: string;
  readonly projectType?: string;
  readonly fields?: readonly TestSubjectField[];
  readonly documents?: readonly DocumentRecord[];
  readonly documentEvents?: readonly DocumentEvent[];
  readonly fileNames?: Readonly<Record<string, string>>;
  readonly identities?: readonly AssetIdentity[];
  readonly appearances?: readonly AssetAppearance[];
  readonly zoneIds?: readonly string[];
  readonly suggestions?: readonly Suggestion[];
  /** The gates read closed; every gate unless the case says otherwise (prompt 3 5.4: all start closed). */
  readonly closedGates?: ReadonlySet<string>;
}

/** A TEST project as the workspace reads it. */
export function testWorkspace(input: TestWorkspaceInput): WorkspaceProject {
  const documents = input.documents ?? [];
  const documentEvents = input.documentEvents ?? [];
  const statuses = testDocumentStatuses(documentEvents, documents);
  const activeDocuments = documents.filter((document) => !statuses.removed(document.id));
  const fields: WorkspaceField[] = (input.fields ?? []).map((entry) => {
    const candidates = entry.candidates ?? [];
    const candidateEvents = entry.candidateEvents ?? [];
    const events = testEvents({ candidate: candidateEvents, field: entry.fieldEvents ?? [], document: documentEvents });
    return {
      field: entry.field,
      subjectId: entry.subjectId,
      subjectKind: entry.subjectKind,
      state: derived(entry.field, entry.subjectId, candidates, events, documents),
      candidates,
      candidateEvents,
    };
  });
  const fieldOf = (subjectId: string, fieldKey: string): WorkspaceField | undefined => fields.find((entry) => entry.subjectId === subjectId && entry.field.key === fieldKey);
  const suggestions = input.suggestions ?? [];
  const fileName = (documentId: string): string | undefined => input.fileNames?.[documentId];
  const resolve = (subjectId: string, fieldKey: string): readonly DisplayObject[] | undefined => {
    const entry = fieldOf(subjectId, fieldKey);
    if (entry === undefined) return undefined;
    const suggestion = suggestions.find((item) => item.subjectId === subjectId && item.fieldKey === fieldKey);
    const editable = entry.subjectKind === 'project' || entry.subjectKind === 'building' || entry.subjectKind === 'zone';
    return resolveField({
      field: entry.field,
      subject: { id: subjectId, kind: entry.subjectKind },
      state: entry.state,
      candidates: entry.candidates,
      candidateEvents: entry.candidateEvents,
      document: (id) => documents.find((document) => document.id === id),
      fileName,
      projectType: input.projectType ?? 'new_construction',
      asked: entry.field.kind === 'decision',
      searchedCoverage: undefined,
      actions: editable ? [editActionOf(entry.field, subjectId, shownCandidateIdsOf(entry.state))] : [],
      format: DEFAULT_FORMAT_OPTIONS,
      ...(suggestion === undefined ? {} : { suggestion: { choice: suggestion.choice, reason: lineOf(suggestion.reasonLineId, suggestion.reasonSlots) } }),
    });
  };
  const register = deriveAssetRegister({
    projectId: input.projectId,
    identities: input.identities ?? [],
    appearances: input.appearances ?? [],
    events: [],
    documents: statuses,
  });
  return {
    projectId: input.projectId,
    buildingId: input.buildingId,
    projectType: input.projectType ?? 'new_construction',
    documents,
    activeDocuments,
    fileName,
    searched: false,
    closedGates: input.closedGates ?? new Set(GATE_IDS),
    field: fieldOf,
    fields,
    resolve,
    register,
    appearances: input.appearances ?? [],
    zoneIds: input.zoneIds ?? [],
    suggestions,
    readingCount: activeDocuments.filter((document) => document.analysis.status === 'queued' || document.analysis.status === 'analysing').length,
  };
}

/** The display a response names by value id; throws when it names none (a case reads only what was served). */
export function displayOf(displays: readonly DisplayObject[], valueId: string): DisplayObject {
  const found = displays.find((display) => display.valueId === valueId);
  if (found === undefined) throw new Error(`no display ${valueId} in the response`);
  return found;
}

/** Every text a response's display objects would put on screen (text, lines, source lines). */
export function shownTexts(displays: readonly DisplayObject[]): string[] {
  return displays.flatMap((display) => [display.text, ...(display.lines ?? []).map((line) => line.text), ...(display.sourceLine === undefined ? [] : [display.sourceLine.text])]);
}
