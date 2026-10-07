/**
 * In-memory TEST builders for the stored proposal's guardrail cases (phase 5): the proposal's builders of
 * `@sovitech/view-model/server` over a TEST project whose fields are the production registry's, derived by the one
 * derive function from TEST records (./view-model.ts), with the engine's own readings (`runEngine` over the production
 * catalogue for a snapshot as Generate stores it; `priceStageOf`, `headlineOutputOf`, `snapshotChanges`,
 * `quotationStanding` for what the API reads).
 *
 * A figure the engine would produce from a SOVITECH dataset no one has approved is a TEST candidate here, written by a
 * TEST engine account on a TEST formula id (`TEST-…`, never a production one: G1-16), with visibly synthetic values;
 * nothing is stored anywhere. Ids are UUID-shaped (`0192f0e4-7e57-…`), so every display satisfies the contract.
 */
import type { Candidate, CandidateEvent, DeriveEvents, Verification } from '@sovitech/domain';
import {
  PRODUCTION_CATALOGUE,
  fieldKeyOf,
  headlineOutputOf,
  priceStageOf,
  quotationStanding,
  runEngine,
  snapshotChanges,
  snapshotRecordOf,
  type CurrentInputs,
  type EngineField,
  type QuotationStanding,
  type SnapshotChanges,
  type SnapshotOutputRow,
  type StoredQuotationRecord,
  type StoredSnapshot,
} from '@sovitech/engine';
import { productionRegistry } from '@sovitech/registry';
import type { DisplayObject, ProjectHeader } from '@sovitech/view-model/browser';
import { lineOf, type ProposalBuildInput, type ProposalField } from '@sovitech/view-model/server';
import { testEvents } from './builders';
import { derived, uuid } from './view-model';

export const PROJECT_ID = uuid(1);
export const BUILDING_ID = uuid(2);
export const SNAPSHOT_ID = uuid(100);
/** The TEST engine account (a service account of the TEST project). */
export const ENGINE_ACCOUNT = uuid(90);
/** The generation time of the TEST snapshot. */
export const GENERATED_AT = '2026-10-01T09:00:00.000000Z';

/** The subject a production field lives on in the TEST project. */
export function subjectOf(fieldKey: string): string {
  return fieldKey.startsWith('building.') ? BUILDING_ID : PROJECT_ID;
}

export interface TestProjectInput {
  /** Candidates of the project's and the building's fields. */
  readonly candidates?: readonly Candidate[];
  readonly events?: DeriveEvents;
  readonly isDemo?: boolean;
}

/** The TEST project's production fields, derived now. */
export function testProposalFields(input: TestProjectInput = {}): ProposalField[] {
  const candidates = input.candidates ?? [];
  const events = input.events ?? testEvents({});
  return productionRegistry.fields
    .filter((field) => field.subject === 'project' || field.subject === 'building')
    .map((field) => {
      const subjectId = field.subject === 'building' ? BUILDING_ID : PROJECT_ID;
      const own = candidates.filter((candidate) => candidate.fieldKey === field.key && candidate.subjectId === subjectId);
      const fieldEvents: DeriveEvents = {
        candidate: events.candidate.filter((event) => own.some((candidate) => candidate.id === event.candidateId)),
        field: events.field.filter((event) => event.fieldKey === field.key && event.subjectId === subjectId),
        document: events.document,
      };
      const state = derived(field, subjectId, own, fieldEvents);
      return {
        field,
        subjectId,
        subjectKind: field.subject,
        state,
        candidates: own,
        candidateEvents: fieldEvents.candidate,
        asked: true,
        missingNow: !state.candidates.some((entry) => entry.status === 'eligible'),
      };
    });
}

/** The owner's own answer on a field of the TEST project (user_confirmed on an owner field when created: 2.1). */
export function ownerAnswer(n: number, fieldKey: string, value: Pick<Candidate, 'choice'> | Pick<Candidate, 'quantity'>): { readonly candidate: Candidate; readonly event: CandidateEvent } {
  const candidate: Candidate = {
    id: uuid(n),
    subjectId: subjectOf(fieldKey),
    fieldKey,
    ...value,
    source: 'user',
    evidence: [],
    createdBy: uuid(80),
    authorRole: 'owner',
    createdAt: '2026-09-30T09:00:00.000000Z',
  };
  return { candidate, event: { candidateId: candidate.id, type: 'user_confirmed', by: uuid(80), role: 'owner', at: candidate.createdAt } };
}

/** A TEST estimated figure on an output, as the engine would write it: TEST formula, TEST inputs, synthetic values. */
export function testEstimate(n: number, input: {
  readonly output: string;
  readonly value: number;
  readonly low: number;
  readonly high: number;
  readonly unit: string;
  readonly inputCandidateIds?: readonly string[];
  readonly assumptions?: readonly string[];
}): Candidate {
  return {
    id: uuid(n),
    subjectId: PROJECT_ID,
    fieldKey: `test.output.${input.output}`,
    quantity: { value: input.value, unit: input.unit },
    range: { low: input.low, high: input.high },
    source: 'estimated',
    evidence: [],
    method: {
      formulaId: 'TEST-pointsEstimate',
      formulaVersion: '1',
      inputCandidateIds: [...(input.inputCandidateIds ?? [])],
      unknownPolicy: 'range_over_options',
      assumptions: [...(input.assumptions ?? ['dataset:TEST-point-templates@1'])],
    },
    createdBy: ENGINE_ACCOUNT,
    authorRole: 'system',
    createdAt: GENERATED_AT,
  };
}

/** The snapshot's rows as Generate stores them for the TEST project now: the production catalogue run by the engine. */
export function productionRows(fields: readonly ProposalField[], closedGates: ReadonlySet<string> = allGatesClosed()): { readonly rows: SnapshotOutputRow[]; readonly candidateIds: readonly string[]; readonly inputsHash: string } {
  const engineFields = new Map<string, EngineField>(fields.map((field) => [fieldKeyOf(field.subjectId, field.field.key), { definition: field.field, subjectId: field.subjectId, state: field.state, candidates: field.candidates }]));
  const run = runEngine(
    PRODUCTION_CATALOGUE,
    { projectId: PROJECT_ID, fields: engineFields, subjectOf: (key) => fields.find((field) => field.field.key === key)?.subjectId, closedGates, datasets: () => undefined, author: ENGINE_ACCOUNT },
    { newId: () => uuid(999), at: GENERATED_AT },
  );
  const record = snapshotRecordOf(run, []);
  return { rows: [...record.outputs], candidateIds: record.candidateIds, inputsHash: record.inputsHash };
}

/** Every gate of prompt 3 5.4 closed, as in the app. */
export function allGatesClosed(): ReadonlySet<string> {
  return new Set([
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
  ]);
}

export interface TestProposalInput {
  readonly fields?: readonly ProposalField[];
  readonly rows?: readonly SnapshotOutputRow[];
  readonly snapshotCandidates?: readonly Candidate[];
  readonly records?: readonly { readonly record: StoredQuotationRecord; readonly standing: QuotationStanding }[];
  readonly changes?: SnapshotChanges;
  readonly fallbackAllowed?: boolean;
  readonly isDemo?: boolean;
  readonly verification?: Readonly<Record<string, Verification>>;
  readonly openItems?: ProposalBuildInput['openItems'];
  readonly drafted?: ProposalBuildInput['snapshot']['drafted'];
}

/** A stored version of the TEST project's proposal, read as the API reads it. */
export function testProposalInput(input: TestProposalInput = {}): ProposalBuildInput {
  const fields = input.fields ?? testProposalFields();
  const production = productionRows(fields);
  const rows = input.rows ?? production.rows;
  const snapshotCandidates = input.snapshotCandidates ?? fields.flatMap((field) => field.candidates.filter((candidate) => production.candidateIds.includes(candidate.id)));
  const snapshot: StoredSnapshot = {
    id: SNAPSHOT_ID,
    createdAt: GENERATED_AT,
    inputsHash: production.inputsHash,
    candidateIds: snapshotCandidates.map((candidate) => candidate.id),
    outputs: rows.map((row) => {
      const at = row.formula.lastIndexOf('@');
      return { output: row.output, formulaId: row.formula.slice(0, at), formulaVersion: row.formula.slice(at + 1), candidateId: row.candidateId, missing: [...row.missing], incomplete: row.incomplete };
    }),
  };
  const records = input.records ?? [];
  const name: ProjectHeader['name'] = `project:${PROJECT_ID}.name`;
  return {
    projectId: PROJECT_ID,
    buildingId: BUILDING_ID,
    header: { projectId: PROJECT_ID, name, isDemo: input.isDemo === true, demoLine: input.isDemo === true ? lineOf('demo_data') : null },
    snapshot: { ...snapshot, pendingDocumentIds: [], drafted: input.drafted ?? [] },
    snapshotCandidates: new Map(snapshotCandidates.map((candidate) => [candidate.id, candidate])),
    current: fields,
    changes: input.changes ?? { changedFields: [], outOfDateOutputs: new Set(), outOfDateOn: new Map(), changedOn: null },
    quotations: records,
    stage: (output) => {
      const row = rows.find((entry) => entry.output === output);
      return row === undefined ? { stage: null, quotationRecordId: null, superseded: null } : priceStageOf({ output: row, records, snapshotId: SNAPSHOT_ID });
    },
    headlineOutput: headlineOutputOf(rows, input.fallbackAllowed ?? false),
    catalogue: PRODUCTION_CATALOGUE,
    versions: [{ snapshotId: SNAPSHOT_ID, createdAt: GENERATED_AT }],
    stillReading: null,
    openItems: input.openItems ?? { view: { count: null, items: [], more: null, sovitechWillCheck: [] }, displays: [] },
    closedGates: allGatesClosed(),
    documents: [],
    activeDocumentIds: new Set(),
    fileName: () => undefined,
    projectType: 'new_construction',
    verificationOf: (candidateId) => input.verification?.[candidateId] ?? 'unverified',
  };
}

/** The current inputs of the TEST project, as the staleness checks read them. */
export function currentInputsOf(fields: readonly ProposalField[]): CurrentInputs {
  return { fields: fields.map((field) => ({ subjectId: field.subjectId, fieldKey: field.field.key, state: field.state, candidates: field.candidates, events: field.candidateEvents })) };
}

/** The engine's reading of what changed since the TEST snapshot. */
export function changesSince(snapshot: StoredSnapshot, fields: readonly ProposalField[], readsOf: (output: string) => readonly string[]): SnapshotChanges {
  return snapshotChanges(snapshot, currentInputsOf(fields), readsOf);
}

/** A stored record's standing now (engine `quotationStanding`). */
export function standingOf(record: StoredQuotationRecord, fields: readonly ProposalField[]): QuotationStanding {
  return quotationStanding(record, currentInputsOf(fields));
}

/** A display by value id, or a failure naming the id. */
export function displayById(displays: readonly DisplayObject[], valueId: string): DisplayObject {
  const found = displays.find((display) => display.valueId === valueId);
  if (found === undefined) throw new Error(`no display ${valueId}`);
  return found;
}

/**
 * The stage label a price's figure display carries among its own lines (kind `stage_label`), or undefined: the one
 * place it is served (phase 6, V-11; the contract's `PriceSchema`).
 */
export function stageTextOf(displays: readonly DisplayObject[], price: { readonly figure: string }): string | undefined {
  return displayById(displays, price.figure).lines?.find((line) => line.kind === 'stage_label')?.text;
}

/**
 * "Superseded: inputs changed on <date>" as a price's figure display carries it among its own lines (status line
 * `superseded_inputs_changed`), or undefined: the one place it is served (phase 6, V-11).
 */
export function supersededTextOf(displays: readonly DisplayObject[], price: { readonly figure: string }): string | undefined {
  return displayById(displays, price.figure).lines?.find((line) => line.id === 'superseded_inputs_changed')?.text;
}

/**
 * The displays of a response that hold a line (a stage label or the Superseded line) also served inside a price's
 * figure, other than that figure itself: none, since phase 6 (V-11: each line once).
 */
export function copiesOfFigureLines(displays: readonly DisplayObject[], price: { readonly figure: string }): DisplayObject[] {
  const figure = displayById(displays, price.figure);
  const served = new Set((figure.lines ?? []).filter((line) => line.kind === 'stage_label' || line.id === 'superseded_inputs_changed').map((line) => `${line.kind}:${line.id}`));
  return displays.filter((display) => display.valueId !== figure.valueId && (display.lines ?? []).some((line) => served.has(`${line.kind}:${line.id}`)) && display.valueId.startsWith(figure.valueId));
}
