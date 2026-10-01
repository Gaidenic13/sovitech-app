/**
 * The one resolver (guardrails rule 2, 2.8; F-VALUE-10; F-RENDER-01, F-RENDER-03; PRD R-043):
 * derived field states, candidates and document records in, display objects
 * (`@sovitech/view-model/browser` DisplayObject) out. Runs in apps/api only (prompt 3 section 6).
 *
 * The rules each function keeps:
 * - One value id per value (valueIdOf), and one display for one value id with one filter, wherever
 *   it is shown (G2-7): step 3's summary and details, step 8's cards and UD-45 use the same object,
 *   because the resolver is a pure function of stored state and reads nothing about the screen.
 * - One badge: the registry's `firstBadge` over the badges that apply (2.8), read from the derived
 *   state, never from a stored field. Which apply:
 *   conflict → Two values; pending → Reading documents…; not_applicable → Not applicable;
 *   no eligible candidate → Unknown (never asked) or Not provided yet (asked or skipped);
 *   estimated → Estimated; engineer_verified → Verified by SOVITECH; user_confirmed on another
 *   source → Confirmed by you; `user` by the owner (`authorRole` owner) → Provided by you, and an
 *   engineer's own site entry, not yet verified, SOVITECH will check (phase 1 R5-6: "Provided by you"
 *   is "Owner entered or accepted"; the nearest 2.8 form for a SOVITECH entry awaiting its check);
 *   ai_inference on an owner field at low derived confidence → Please check (on an engineer field
 *   SOVITECH will check: rule 3, "Low ('Please check' for the owner, 'SOVITECH will check' for
 *   engineer fields)"); ai_inference high or medium → Likely or Possible, from
 *   `DerivedCandidate.confidence` (G3-18), never `Candidate.confidence`; an ambiguous reading
 *   (rule 8: "carries both alternatives with low confidence") on an owner field → Please check; an
 *   unverified engineer field → SOVITECH will check; a design-stage document on an existing
 *   building or BMS modernization project → From design drawings, the line naming the stage and
 *   revision (2.3; G2-6); document → From document; calculated → Calculated; reference → Reference.
 *   Step 4 (resolveDetection, and a decision shown with a visible suggestion): Suggested and Not
 *   found in documents are shown where section 5 puts them (PRD R-051 Sources).
 * - The source line (2.8: "The source always shows in the line below the value"), built from stored
 *   state: "Found in <file>, page <n>" (or sheet and cell) for a document value; "Inferred from
 *   <file>, page <n>" for an inference; the origin kept after checks ("AI inference, confirmed by
 *   you"; "AI inference, verified by SOVITECH on <date>", from GENERATED_SENTENCES, G3-7); the stage
 *   and revision named for a design-stage document; on an existing building or BMS modernization
 *   project, and on a value from a superseded revision, a document whose stage is unknown says so
 *   (2.3, "When the stage is unknown, the source line says so"). The owner's own answer has no
 *   source line: its badge, Provided by you, names its source.
 * - Status lines from `FieldState.statusLines` in the registry's wording: "Out of date,
 *   recalculating" (never shown as current), "From a superseded revision", "Source document
 *   removed" (2.4), and the rule 4 lines of a conflict ("Documents say <a>. You entered <b>. Which is
 *   right?", "Documents disagree on this. A SOVITECH engineer will check it.", the latter only when a
 *   value in the conflict was read from a document or inferred from one, `document` or `ai_inference`:
 *   G4-36).
 * - The missing wording, never a zero, a blank or a dash (rule 1, rule 7): the display object's
 *   `text` is the badge label and `shape` is `missing`; after a skip it carries "You can provide
 *   this later." (rule 7), except on a decision field, whose multi-select question carries it once
 *   (G7-12); "Not found in the analysed documents (<coverage>)." only over what a
 *   completed AI run searched (rule 12; `searchedCoverage`).
 * - Rounding and number text only through ../formatting (rule 9); a document value as written.
 * - A multi-fact field (floors by level type, rooms and zones by what they count, an area with two
 *   bases): one display object per fact (`valueIdOf(..., qualifier)`) and one for the field, whose
 *   text joins the known facts with their qualifier labels and, for the floor structure, names the
 *   level types no document states as Unknown (rule 8: "Parts with no source are Unknown").
 * - Lines that hold a number and stand alone (counts, "Still reading <n> files…", the late-findings
 *   notice, coverage lines, output lines) are `line` display objects (resolveLine).
 */
import {
  UNKNOWN_QUALIFIER,
  type Candidate,
  type CandidateEvent,
  type Confidence,
  type DerivedCandidate,
  type DocumentRecord,
  type Evidence,
  type FactState,
  type FieldState,
  type SubjectKind,
} from '@sovitech/domain';
import { LEVEL_TYPES, badgeById, firstBadge, parseNumber, unitByCode, type BadgeId as RegistryBadgeId } from '@sovitech/registry';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import {
  VALUE_ID_PATTERN,
  type Action,
  type Badge,
  type BadgeId,
  type DisplayObject,
  type EvidenceExcerpt,
  type InputSpec,
  type Line,
  type Measure,
  type MissingKind,
  type ValueId,
} from '../browser/contract';
import {
  COUNT_UNIT_CODE,
  formatAsWritten,
  formatCalculated,
  formatCount,
  formatDate,
  formatEstimate,
  formatOwnerQuantity,
  formatRangeOverValues,
  type FormatOptions,
  type FormattedValue,
} from '../formatting';
import { countryLabel, DESIGN_STAGES, EXISTING_BUILDING_PROJECT_TYPES, optionLabel, qualifierLabel, stageLabel } from './labels';
import { fillLine, holdsDigit } from './lines';

export { OPTION_LABELS, DECISION_LABELS, QUALIFIER_LABELS, STAGE_LABELS, optionLabel, qualifierLabel, stageLabel, countryLabel } from './labels';
export { NOT_ANALYSED_FILE_TYPES } from './lines';

// ---------------------------------------------------------------------------------------------
// Value ids
// ---------------------------------------------------------------------------------------------

/**
 * The value id of a field on its subject, or of one fact of it (display.ts, "How the view-model
 * forms them"): `<subject kind>:<subject id>.<field key without its subject prefix>[.<qualifier>]`.
 * A key that does not start with its subject's kind keeps its whole key as the path. Throws for a
 * key or qualifier the value-id pattern cannot carry (never silently changed).
 */
export function valueIdOf(subjectKind: SubjectKind, subjectId: string, fieldKey: string, qualifier?: string): ValueId {
  const prefix = `${subjectKind}.`;
  const path = fieldKey.startsWith(prefix) ? fieldKey.slice(prefix.length) : fieldKey;
  const id = `${subjectKind}:${subjectId}.${path}${qualifier === undefined ? '' : `.${qualifier}`}`;
  if (!VALUE_ID_PATTERN.test(id)) throw new Error(`view-model: "${id}" cannot be a value id (display.ts VALUE_ID_PATTERN)`);
  return id;
}

/** A value id with one more path segment (a conflict's choice, a document's own value). */
function childId(parent: ValueId, segment: string): ValueId {
  const id = `${parent}.${segment}`;
  if (!VALUE_ID_PATTERN.test(id)) throw new Error(`view-model: "${id}" cannot be a value id (display.ts VALUE_ID_PATTERN)`);
  return id;
}

/** The value id of a document record's own shown value (display.ts): `document:<id>.<what>`. */
export function documentValueId(documentId: string, what: 'fileName' | 'coverage' | 'stage' | 'revision' | 'revisionNotice'): ValueId {
  return childId(`document:${documentId}` as ValueId, what);
}

/** The value id of a project's derived line or count (display.ts): `project:<id>.<path>`. */
export function projectValueId(projectId: string, path: string): ValueId {
  const id = `project:${projectId}.${path}`;
  if (!VALUE_ID_PATTERN.test(id)) throw new Error(`view-model: "${id}" cannot be a value id (display.ts VALUE_ID_PATTERN)`);
  return id;
}

// ---------------------------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------------------------

/** A 2.8 badge with its registry label. */
export function badgeOf(id: BadgeId): Badge {
  return { id, label: badgeById(id as RegistryBadgeId).label };
}

/** The first badge in 2.8's order among those that apply; throws when none applies (every value has one). */
function chosenBadge(applicable: readonly BadgeId[]): Badge {
  const first = firstBadge(applicable as readonly RegistryBadgeId[]);
  if (first === undefined) throw new Error('view-model: no 2.8 badge applies to a value, which 2.8 does not allow');
  return { id: first.id, label: first.label };
}

// ---------------------------------------------------------------------------------------------
// The input
// ---------------------------------------------------------------------------------------------

/** What the resolver needs besides the derived state: all of it read from stored state by the API. */
export interface ResolveFieldInput {
  readonly field: RegistryFieldDefinition;
  readonly subject: { readonly id: string; readonly kind: SubjectKind };
  readonly state: FieldState;
  /** The field's candidates, with their evidence (the store's `readFieldInputs`). */
  readonly candidates: readonly Candidate[];
  /** Document records by id (stage, revision, supersession, coverage). */
  readonly document: (documentId: string) => DocumentRecord | undefined;
  /** The file name as uploaded, by document id (owner text; shown in source lines). */
  readonly fileName: (documentId: string) => string | undefined;
  /** The project's type (step 1), for From design drawings (2.3: existing building and BMS modernization). */
  readonly projectType: string | undefined;
  /**
   * Whether the owner was asked for the field (a question shown or skipped): Not provided yet rather
   * than Unknown. The API passes true for step 3's facts when no document was uploaded, since their
   * Edit is how the owner provides them there (PRD R-047 "Until decided": "each fact as 'Not
   * provided yet' with Edit").
   */
  readonly asked: boolean;
  /**
   * The coverage a completed AI run searched for this field, as the "Not found in the analysed
   * documents (<coverage>)" line may cite it (rule 12; apps/api/src/documents/coverage.ts
   * `searchedCoverage`); undefined while nothing was searched (no AI run), so no not-found line.
   */
  readonly searchedCoverage: string | undefined;
  /** The actions the intake planner allows on this value on this screen (edit, confirm, …). */
  readonly actions: readonly Action[];
  readonly format: FormatOptions;
  /**
   * The field's candidate events, for the dates 2.8's generated sentences name ("AI inference,
   * verified by SOVITECH on <date>"). Without them, a verified inference keeps its evidence line
   * as its origin instead of the dated sentence.
   */
  readonly candidateEvents?: readonly CandidateEvent[];
  /**
   * For a calculated quantity that is not a count: the significant figures of its least precise
   * input (rule 9, "Calculated values"), which the engine's caller reads from the inputs. A count
   * from the register is exact and needs none. Without it such a value is not shown (the resolver
   * refuses rather than show more figures than its inputs hold).
   */
  readonly calculatedSignificantFigures?: number;
  /**
   * A visible Suggested preselection on this decision field, with its one-line reason (rule 3;
   * section 5, step 4): shown with the badge Suggested while the field has no answer. Never on a
   * fact, a life-safety system or a system `neverPreselected` (the intake's suggestion guard).
   */
  readonly suggestion?: { readonly choice: string; readonly reason: Line };
  /** Another value id for the field's own display (step 4's detections use `building:<id>.detection.<system>`). */
  readonly valueId?: ValueId;
  /** Step 4's detection reading: Not found in documents with "You can still include it." (2.8; section 5, step 4). */
  readonly detection?: boolean;
}

// ---------------------------------------------------------------------------------------------
// One candidate's value, badges and source line
// ---------------------------------------------------------------------------------------------

interface Reading {
  readonly text: string;
  readonly parts: readonly string[];
  readonly shape: 'value' | 'range';
}

const EXISTING = (projectType: string | undefined): boolean => projectType !== undefined && EXISTING_BUILDING_PROJECT_TYPES.has(projectType);

function unitOf(code: string): { readonly code: string; readonly symbol: string; readonly dimension: string } {
  const unit = unitByCode(code);
  if (unit === undefined) throw new Error(`view-model: the unit ${code} is not in the closed unit registry (2.7)`);
  return unit;
}

/** "about" before a value the owner or a source wrote as approximate, where no original carries the word (rule 8). */
function approximately(formatted: FormattedValue, approximate: boolean | undefined): FormattedValue {
  return approximate === true ? { text: `about ${formatted.text}`, parts: formatted.parts } : formatted;
}

/** The readings of an ambiguous quantity (rule 8: "keeps both"), as a range over them. */
function ambiguousReading(candidate: Candidate, format: FormatOptions): Reading | undefined {
  const quantity = candidate.quantity;
  if (quantity === undefined) return undefined;
  const values = [quantity.value, ...(candidate.alternatives ?? []).map((alternative) => alternative.value)];
  const formatted = formatRangeOverValues(values, unitOf(quantity.unit), format);
  return { text: formatted.text, parts: formatted.parts, shape: 'range' };
}

/** One candidate's value as its element shows it. */
function readingOf(input: ResolveFieldInput, candidate: Candidate, ambiguous: boolean): Reading {
  const { field, format } = input;
  const quantity = candidate.quantity;
  if (quantity !== undefined) {
    if (ambiguous) {
      const range = ambiguousReading(candidate, format);
      if (range !== undefined) return range;
    }
    const unit = unitOf(quantity.unit);
    const fieldUnit = field.unit === undefined ? undefined : unitByCode(field.unit);
    if (fieldUnit !== undefined && fieldUnit.dimension !== unit.dimension) {
      throw new Error(`view-model: ${unit.code} does not measure what ${field.key} measures (2.7, the dimension check)`);
    }
    let formatted: FormattedValue;
    switch (candidate.source) {
      case 'document':
        // A level of the floor structure is its count, read from the regim de înălțime; the notation shows as
        // written in the evidence excerpt beside it (rule 8, "Floors"; US-REVIEW-04 AC4). Any other document value
        // shows as written (rule 9).
        if (isFloorStructure(field)) formatted = formatCount(quantity.value, format);
        else if (candidate.original === undefined) formatted = approximately(formatOwnerQuantity(quantity.value, unit, format), quantity.approximate);
        else formatted = formatAsWritten(candidate.original);
        break;
      case 'user':
        formatted = approximately(formatOwnerQuantity(quantity.value, unit, format), quantity.approximate);
        break;
      case 'estimated': {
        if (candidate.range === undefined) throw new Error('view-model: an estimated value without its range is not shown (rule 9)');
        const estimate = formatEstimate(quantity.value, candidate.range, unit, format);
        return { text: estimate.text, parts: estimate.parts, shape: 'range' };
      }
      case 'calculated':
        if (unit.code === COUNT_UNIT_CODE || field.kind === 'count') formatted = formatCount(quantity.value, format);
        else if (input.calculatedSignificantFigures !== undefined) formatted = formatCalculated(quantity.value, input.calculatedSignificantFigures, unit, format);
        else throw new Error('view-model: a calculated quantity needs the significant figures its inputs allow (rule 9)');
        break;
      case 'ai_inference':
      case 'reference':
        formatted = formatOwnerQuantity(quantity.value, unit, format);
        break;
    }
    return { text: formatted.text, parts: formatted.parts, shape: 'value' };
  }
  if (candidate.choice !== undefined) return { text: optionLabel(field.key, field.kind, candidate.choice), parts: [], shape: 'value' };
  if (candidate.text !== undefined && candidate.text.trim() !== '') {
    const text = field.key === 'project.country' ? countryLabel(candidate.text) : candidate.text.replace(/\s+/gu, ' ').trim();
    return { text, parts: holdsDigit(text) ? [text] : [], shape: 'value' };
  }
  throw new Error(`view-model: candidate ${candidate.id} carries no value to show`);
}

/** Whether every document a candidate cites is a design-stage document (2.3). */
function fromDesignStage(candidate: Candidate, input: ResolveFieldInput): boolean {
  if (candidate.evidence.length === 0) return false;
  return candidate.evidence.every((entry) => {
    const document = input.document(entry.documentId);
    return document !== undefined && DESIGN_STAGES.has(document.stage);
  });
}

/** The 2.8 badges that apply to one candidate as the field's value (firstBadge picks among them). */
function candidateBadges(input: ResolveFieldInput, candidate: Candidate, derived: DerivedCandidate | undefined, ambiguous: boolean): BadgeId[] {
  const applicable: BadgeId[] = [];
  const verification = derived?.verification ?? 'unverified';
  const ownerField = input.field.confirmBy !== 'engineer';
  if (candidate.source === 'estimated') applicable.push('estimated');
  if (verification === 'engineer_verified') applicable.push('verified_by_sovitech');
  if (candidate.source === 'user') {
    if (candidate.authorRole === 'owner') applicable.push('provided_by_you');
    else if (verification !== 'engineer_verified') applicable.push('sovitech_will_check');
  } else if (verification === 'user_confirmed') {
    applicable.push('confirmed_by_you');
  }
  if (candidate.source === 'ai_inference') {
    const confidence: Confidence = derived?.confidence ?? 'low';
    if (confidence === 'high') applicable.push('likely');
    else if (confidence === 'medium') applicable.push('possible');
    else applicable.push(ownerField ? 'please_check' : 'sovitech_will_check');
  }
  if (ambiguous) applicable.push(ownerField ? 'please_check' : 'sovitech_will_check');
  if (!ownerField && verification !== 'engineer_verified') applicable.push('sovitech_will_check');
  if ((candidate.source === 'document' || candidate.source === 'ai_inference') && EXISTING(input.projectType) && fromDesignStage(candidate, input)) {
    applicable.push('from_design_drawings');
  }
  if (candidate.source === 'document') applicable.push('from_document');
  if (candidate.source === 'calculated') applicable.push('calculated');
  if (candidate.source === 'reference') applicable.push('reference');
  return applicable;
}

/** Where one evidence entry sits: "<file>, page <n>", or its sheet and cell. */
function placeOf(entry: Evidence, input: ResolveFieldInput): string {
  const name = input.fileName(entry.documentId) ?? 'an uploaded document';
  const { page, sheet, cell } = entry.locator;
  if (sheet !== undefined && cell !== undefined) return `${name}, sheet ${sheet}, cell ${cell}`;
  if (sheet !== undefined) return `${name}, sheet ${sheet}`;
  if (page !== undefined) return `${name}, page ${String(page)}`;
  return name;
}

/** The places a candidate's evidence names, each once, in order. */
function placesOf(candidate: Candidate, input: ResolveFieldInput): string {
  return [...new Set(candidate.evidence.map((entry) => placeOf(entry, input)))].join('; ');
}

/** "stage unknown" where 2.3 asks the source line to say so. */
function stageUnknownNote(candidate: Candidate, input: ResolveFieldInput): string {
  const says =
    (EXISTING(input.projectType) || input.state.statusLines.includes('from_superseded_revision')) &&
    candidate.evidence.some((entry) => input.document(entry.documentId)?.stage === 'unknown');
  return says ? ' (stage unknown)' : '';
}

/** The design-stage line: "<stage> <revision> (<year>): <places>" (2.3: "labels name the stage"; G2-6). */
function designStageLine(candidate: Candidate, input: ResolveFieldInput): string {
  const first = candidate.evidence[0];
  const document = first === undefined ? undefined : input.document(first.documentId);
  const stage = document === undefined ? undefined : stageLabel(document.stage);
  const revision = document?.revision === undefined || document.revision.trim() === '' ? '' : ` ${document.revision.trim()}`;
  const year = document?.issueDate !== undefined && /^\d{4}/u.test(document.issueDate) ? ` (${document.issueDate.slice(0, 4)})` : '';
  return `${stage ?? 'Design drawings'}${revision}${year}: ${placesOf(candidate, input)}`;
}

/** The date of a candidate's newest event of a type, from the events the caller passed. */
function eventDate(input: ResolveFieldInput, candidateId: string, type: CandidateEvent['type']): string | undefined {
  const events = (input.candidateEvents ?? []).filter((event) => event.candidateId === candidateId && event.type === type);
  return events.at(-1)?.at;
}

/** The source line of a candidate shown as the field's value (2.8: "The source always shows in the line below the value"). */
function sourceLineOf(input: ResolveFieldInput, candidate: Candidate, derived: DerivedCandidate | undefined, badge: BadgeId): Line | undefined {
  const verification = derived?.verification ?? 'unverified';
  if (candidate.source === 'ai_inference' && verification === 'engineer_verified') {
    const at = eventDate(input, candidate.id, 'engineer_verified');
    if (at !== undefined) return fillLine('ai_inference_engineer_verified_line', { date: formatDate(at).text }, input.format).line;
  }
  if (candidate.source === 'ai_inference' && verification === 'user_confirmed') {
    return fillLine('ai_inference_user_confirmed_line', {}, input.format).line;
  }
  switch (candidate.source) {
    case 'document':
    case 'ai_inference': {
      if (candidate.evidence.length === 0) return undefined;
      if (badge === 'from_design_drawings') return { id: 'design_stage', kind: 'source_line', text: designStageLine(candidate, input) };
      const verb = candidate.source === 'document' ? 'Found in' : 'Inferred from';
      return { id: candidate.source, kind: 'source_line', text: `${verb} ${placesOf(candidate, input)}${stageUnknownNote(candidate, input)}` };
    }
    case 'user':
      return candidate.authorRole === 'sovitech_engineer' ? { id: 'engineer_entry', kind: 'source_line', text: 'Entered by a SOVITECH engineer' } : undefined;
    case 'calculated':
    case 'estimated':
      return candidate.method === undefined
        ? undefined
        : { id: candidate.source, kind: 'source_line', text: `Method: ${candidate.method.formulaId}, version ${candidate.method.formulaVersion}` };
    case 'reference':
      return candidate.reference === undefined
        ? undefined
        : { id: 'reference', kind: 'source_line', text: `From ${candidate.reference.dataset}, version ${candidate.reference.version}` };
  }
}

const HEX_HASH = /^[0-9a-f]{64}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

/** The verbatim excerpts shown with a document value or an inference (2.4; the render contract's evidence). */
function evidenceOf(candidate: Candidate): EvidenceExcerpt[] {
  if (candidate.source !== 'document' && candidate.source !== 'ai_inference') return [];
  const shown: EvidenceExcerpt[] = [];
  for (const entry of candidate.evidence) {
    const contentHash = entry.contentHash.replace(/^sha256:/u, '');
    if (!UUID.test(entry.documentId) || !HEX_HASH.test(contentHash) || entry.excerpt.trim() === '') continue;
    shown.push({ documentId: entry.documentId, contentHash, excerpt: entry.excerpt });
  }
  return shown;
}

/** What a candidate shows as one value: its reading, its badge, its source line, its evidence. */
interface CandidateView {
  readonly candidate: Candidate;
  readonly reading: Reading;
  readonly badges: readonly BadgeId[];
  readonly badge: Badge;
  readonly sourceLine: Line | undefined;
  readonly evidence: readonly EvidenceExcerpt[];
}

function viewOf(input: ResolveFieldInput, candidate: Candidate, ambiguous: boolean): CandidateView {
  const derived = input.state.candidates.find((entry) => entry.candidateId === candidate.id);
  const badges = candidateBadges(input, candidate, derived, ambiguous);
  const badge = chosenBadge(badges);
  return {
    candidate,
    reading: readingOf(input, candidate, ambiguous),
    badges,
    badge,
    sourceLine: sourceLineOf(input, candidate, derived, badge.id),
    evidence: evidenceOf(candidate),
  };
}

// ---------------------------------------------------------------------------------------------
// The field's display objects
// ---------------------------------------------------------------------------------------------

/** What the field measures (rule 8): its label, its unit, and the qualifier label when one fact is shown. */
function measureOf(field: RegistryFieldDefinition, qualifier?: string | null): Measure {
  const unitCode = field.kind === 'quantity' || field.kind === 'count' ? field.unit : undefined;
  const unit = unitCode === undefined ? undefined : unitByCode(unitCode);
  return {
    label: field.label,
    ...(unit === undefined ? {} : { unit: { code: unit.code, symbol: unit.symbol } }),
    ...(qualifier === undefined ? {} : { qualifierLabel: qualifierLabel(qualifier) }),
  };
}

/** The registry's status lines of the field (2.4, 2.8). */
function statusLinesOf(input: ResolveFieldInput): Line[] {
  return input.state.statusLines.map((id) => fillLine(id, {}, input.format).line);
}

function candidateById(input: ResolveFieldInput, id: string | null | undefined): Candidate | undefined {
  return id === null || id === undefined ? undefined : input.candidates.find((candidate) => candidate.id === id);
}

/** The qualifier a quantity candidate states, or null when unknown (rule 8, "stored with basis unknown"). */
function statedQualifier(candidate: Candidate): string | null {
  const qualifier = candidate.quantity?.qualifier;
  return qualifier === undefined || qualifier.trim() === '' || qualifier === UNKNOWN_QUALIFIER ? null : qualifier;
}

function base(input: ResolveFieldInput, valueId: ValueId): Pick<DisplayObject, 'valueId' | 'kind' | 'field'> {
  return { valueId, kind: 'field', field: { subjectId: input.subject.id, fieldKey: input.field.key } };
}

function withOptional<T extends object>(target: T, extras: { lines?: readonly Line[]; parts?: readonly string[]; evidence?: readonly EvidenceExcerpt[]; actions?: readonly Action[]; sourceLine?: Line | undefined }): T {
  return {
    ...target,
    ...(extras.parts === undefined || extras.parts.length === 0 ? {} : { parts: [...extras.parts] }),
    ...(extras.sourceLine === undefined ? {} : { sourceLine: extras.sourceLine }),
    ...(extras.lines === undefined || extras.lines.length === 0 ? {} : { lines: [...extras.lines] }),
    ...(extras.evidence === undefined || extras.evidence.length === 0 ? {} : { evidence: [...extras.evidence] }),
    ...(extras.actions === undefined || extras.actions.length === 0 ? {} : { actions: [...extras.actions] }),
  };
}

/** The display of a field or fact with no eligible candidate: the missing wording (rule 1, rule 7, rule 12). */
function missingDisplay(input: ResolveFieldInput, valueId: ValueId, qualifier?: string | null): DisplayObject {
  const { state } = input;
  const applicable: BadgeId[] = [];
  if (state.state === 'pending') applicable.push('reading_documents');
  if (state.state === 'not_applicable') applicable.push('not_applicable');
  const searched = input.searchedCoverage !== undefined && input.searchedCoverage.trim() !== '';
  if (input.detection === true && searched) applicable.push('not_found_in_documents');
  else applicable.push(state.state === 'skipped' || input.asked ? 'not_provided_yet' : 'unknown');
  let badge = chosenBadge(applicable);
  const lines: Line[] = [];
  let parts: readonly string[] = [];
  if (searched && state.state !== 'not_applicable') {
    const filled = fillLine(input.detection === true ? 'not_found_can_include' : 'not_found_coverage', { coverage: input.searchedCoverage ?? '' }, input.format);
    lines.push(filled.line);
    parts = filled.parts;
  }
  // Rule 7: "The question then shows 'You can provide this later.' once, inline". A decision field is one option of a
  // multi-select (2.6), whose question shows the line once (steps 4 to 7, and step 8's card: `skippedQuestions`), so
  // the option's own display never repeats it (G7-12); it stays on the display of a question of one field.
  if (state.state === 'skipped' && badge.id === 'not_provided_yet' && input.field.kind !== 'decision') lines.push(fillLine('provide_later', {}, input.format).line);
  lines.push(...statusLinesOf(input));
  let text = badge.label;
  let shape: DisplayObject['shape'] = 'missing';
  if (input.suggestion !== undefined && state.state !== 'pending' && qualifier === undefined) {
    // Section 5, step 4, and rule 3: a visible preselection on a choice, labelled Suggested with its reason.
    badge = badgeOf('suggested');
    text = optionLabel(input.field.key, input.field.kind, input.suggestion.choice);
    shape = 'value';
    lines.unshift(input.suggestion.reason);
  }
  const missing: MissingKind =
    badge.id === 'reading_documents'
      ? 'reading_documents'
      : badge.id === 'not_applicable'
        ? 'not_applicable'
        : badge.id === 'not_found_in_documents'
          ? 'not_found_in_documents'
          : badge.id === 'not_provided_yet'
            ? 'not_provided_yet'
            : 'unknown';
  return withOptional(
    {
      ...base(input, valueId),
      text,
      shape,
      ...(shape === 'missing' ? { missing } : {}),
      badge,
      measure: measureOf(input.field, qualifier),
    },
    { lines, parts, actions: input.actions },
  );
}

/**
 * A known fact (or single-fact field) shown through its active candidate, or its ambiguous one as a
 * range over its readings. A stale calculated or estimated value is never shown as current (2.4,
 * "Recalculation": it "renders as 'Out of date, recalculating' and never as current"): its text is
 * that status line, with no figure, and its badge and method line stay.
 */
function knownDisplay(
  input: ResolveFieldInput,
  valueId: ValueId,
  candidate: Candidate,
  ambiguous: boolean,
  qualifier: string | null | undefined,
  actions: readonly Action[],
  stale = false,
): DisplayObject {
  const view = viewOf(input, candidate, ambiguous);
  const lines = statusLinesOf(input);
  if (stale) {
    const outOfDate = fillLine('out_of_date_recalculating', {}, input.format).line;
    return withOptional(
      { ...base(input, valueId), text: outOfDate.text, shape: 'value' as const, badge: view.badge, measure: measureOf(input.field, qualifier) },
      { sourceLine: view.sourceLine, lines: lines.filter((line) => line.id !== outOfDate.id), actions },
    );
  }
  return withOptional(
    {
      ...base(input, valueId),
      text: view.reading.text,
      shape: view.reading.shape,
      badge: view.badge,
      measure: measureOf(input.field, qualifier),
    },
    { parts: view.reading.parts, sourceLine: view.sourceLine, lines, evidence: view.evidence, actions },
  );
}

/** A conflict's displays: the field's (Two values, a range over the values where they are quantities of one unit) and one per value in conflict. */
function conflictDisplays(
  input: ResolveFieldInput,
  valueId: ValueId,
  candidateIds: readonly string[],
  routedTo: 'owner' | 'engineer',
  qualifier: string | null | undefined,
  actions: readonly Action[],
): DisplayObject[] {
  const candidates = candidateIds.map((id) => candidateById(input, id)).filter((candidate): candidate is Candidate => candidate !== undefined);
  const views = candidates.map((candidate) => viewOf(input, candidate, false));
  const choices = views.map((view, index) =>
    withOptional(
      { ...base(input, childId(valueId, `value${String(index + 1)}`)), text: view.reading.text, shape: view.reading.shape, badge: view.badge, measure: measureOf(input.field, statedQualifier(view.candidate)) },
      { parts: view.reading.parts, sourceLine: view.sourceLine, evidence: view.evidence },
    ),
  );
  const quantities = candidates.map((candidate) => candidate.quantity);
  const units = new Set(quantities.map((quantity) => quantity?.unit));
  let reading: FormattedValue;
  if (quantities.every((quantity) => quantity !== undefined) && units.size === 1) {
    const unitCode = quantities[0]?.unit ?? '';
    reading = formatRangeOverValues(
      quantities.flatMap((quantity) => (quantity === undefined ? [] : [quantity.value])),
      unitOf(unitCode),
      input.format,
    );
  } else {
    const texts = [...new Set(views.map((view) => view.reading.text))];
    reading = { text: texts.join(' or '), parts: [...new Set(views.flatMap((view) => view.reading.parts))] };
  }
  const lines: Line[] = [];
  const parts: string[] = [...reading.parts];
  const owners = views.filter((view) => view.candidate.source === 'user' && view.candidate.authorRole === 'owner');
  const others = views.filter((view) => view.candidate.source !== 'user');
  if (routedTo === 'engineer') {
    // Rule 4's owner line names documents: "Documents disagree on this." It is true only when a value in the conflict
    // was read from a document or inferred from one (`document` or `ai_inference`); between values that are not (two
    // owner entries, G4-36; a person's entry against a calculated, estimated or reference value) no 2.8 or rule line
    // fits, so none is shown (proposal P-3B-CONFLICT-NO-DOCUMENT): the Two values badge, each value's source line and
    // step 8's "SOVITECH will check" listing stay.
    if (candidates.some((candidate) => candidate.source === 'document' || candidate.source === 'ai_inference')) lines.push(fillLine('conflict_for_engineer', {}, input.format).line);
  } else if (owners.length > 0 && others.length > 0) {
    const documentValue = [...new Set(others.map((view) => view.reading.text))].join(' or ');
    const ownerValue = [...new Set(owners.map((view) => view.reading.text))].join(' or ');
    const filled = fillLine('conflict_for_owner', { documentValue, ownerValue }, input.format);
    lines.push(filled.line);
    parts.push(...filled.parts);
  }
  lines.push(...statusLinesOf(input));
  const resolve: Action[] =
    routedTo === 'owner' && choices.length >= 2 && UUID.test(input.subject.id) && candidates.every((candidate) => UUID.test(candidate.id))
      ? [
          {
            kind: 'resolve_conflict',
            field: { subjectId: input.subject.id, fieldKey: input.field.key },
            choices: candidates.map((candidate, index) => ({ candidateId: candidate.id, valueId: choices[index]?.valueId ?? valueId })),
          },
        ]
      : [];
  const sources = [...new Set(views.flatMap((view) => (view.sourceLine === undefined ? [] : [view.sourceLine.text])))];
  const field = withOptional(
    { ...base(input, valueId), text: reading.text, shape: 'range' as const, badge: badgeOf('two_values'), measure: measureOf(input.field, qualifier) },
    {
      parts: [...new Set(parts)],
      sourceLine: sources.length === 0 ? undefined : { id: 'conflict_sources', kind: 'source_line', text: sources.join('; ') },
      lines,
      evidence: views.flatMap((view) => view.evidence),
      actions: [...resolve, ...actions],
    },
  );
  return [field, ...choices];
}

/** The display of one fact (a qualifier's eligible candidates). */
function factDisplays(input: ResolveFieldInput, valueId: ValueId, fact: FactState, actions: readonly Action[]): DisplayObject[] {
  if (fact.state === 'conflict' && fact.conflict !== null) {
    return conflictDisplays(input, valueId, fact.conflict.candidateIds, fact.conflict.routedTo, fact.qualifier, actions);
  }
  const activeId = fact.activeCandidateId ?? (fact.ambiguous ? fact.candidateIds[0] : undefined);
  const candidate = candidateById(input, activeId);
  if (candidate === undefined) return [missingDisplay(input, valueId, fact.qualifier)];
  return [knownDisplay(input, valueId, candidate, fact.ambiguous, fact.qualifier, actions, fact.stale)];
}

/** Whether the field's qualifiers are the level types of the floor structure (rule 8, "Floors": parts with no source are Unknown). */
function isFloorStructure(field: RegistryFieldDefinition): boolean {
  const qualifiers = field.qualifiers ?? [];
  const levels: readonly string[] = LEVEL_TYPES;
  return qualifiers.length > 1 && qualifiers.every((qualifier) => levels.includes(qualifier));
}

/** Whether a conflict is about a value with an unknown qualifier (rule 4, "An unknown qualifier is still compared"). */
function unqualifiedConflict(conflict: { readonly kind: string; readonly qualifier: string | null }): boolean {
  return conflict.qualifier === null && (conflict.kind === 'unqualified_matches_none' || conflict.kind === 'unqualified_matches_several');
}

/** The value id segment of a fact: its qualifier, or `unknown` for a fact whose qualifier no one stated. */
function factSegment(qualifier: string | null): string {
  return qualifier ?? UNKNOWN_QUALIFIER;
}

/**
 * The displays of a field that holds several facts, and the field's own summary first: each fact by
 * its qualifier; each value with an unknown qualifier that rule 4 compared (in conflict, or matching
 * one reading, G4-11) as `<value id>.unqualified<n>`; and, for the floor structure, each level type
 * no document states, read Unknown (rule 8).
 */
function multiFactDisplays(input: ResolveFieldInput, valueId: ValueId): DisplayObject[] {
  const { field, state } = input;
  const floors = isFloorStructure(field);
  const registered = field.qualifiers ?? [];
  const rank = (qualifier: string | null): number => (qualifier === null ? registered.length : registered.indexOf(qualifier));
  const facts = [...state.facts].sort((a, b) => rank(a.qualifier) - rank(b.qualifier));
  const parts: { readonly qualifier: string | null; readonly displays: DisplayObject[] }[] = facts.map((fact) => ({
    qualifier: fact.qualifier,
    displays: factDisplays(input, childId(valueId, factSegment(fact.qualifier)), fact, []),
  }));
  let extra = 0;
  for (const conflict of state.conflicts.filter(unqualifiedConflict)) {
    extra += 1;
    parts.push({ qualifier: null, displays: conflictDisplays(input, childId(valueId, `unqualified${String(extra)}`), conflict.candidateIds, conflict.routedTo, null, []) });
  }
  for (const reading of state.readingsToConfirm) {
    const candidate = candidateById(input, reading.candidateId);
    if (candidate === undefined) continue;
    extra += 1;
    parts.push({ qualifier: null, displays: [knownDisplay({ ...input, actions: [] }, childId(valueId, `unqualified${String(extra)}`), candidate, false, null, [])] });
  }
  const known = new Set(facts.map((fact) => fact.qualifier));
  const unstated = floors ? registered.filter((qualifier) => !known.has(qualifier)) : [];
  const unstatedDisplays = unstated.map((qualifier) => missingDisplay({ ...input, actions: [], searchedCoverage: undefined }, childId(valueId, qualifier), qualifier));
  const own = parts.flatMap((part) => (part.displays[0] === undefined ? [] : [{ qualifier: part.qualifier, display: part.displays[0] }]));
  const phrases = own.map(({ qualifier, display }) => (qualifier === null ? `${display.text} (${qualifierLabel(null)})` : `${display.text} ${qualifierLabel(qualifier)}`));
  const unknownPart = unstated.length === 0 ? '' : `; ${qualifierLabel(null)}: ${unstated.map((qualifier) => qualifierLabel(qualifier)).join(', ')}`;
  const badges = own.flatMap(({ display }) => (display.badge === undefined ? [] : [display.badge.id]));
  const lines: Line[] = [];
  for (const { display } of own) for (const line of display.lines ?? []) if (!lines.some((kept) => kept.text === line.text)) lines.push(line);
  const sources = [...new Set(own.flatMap(({ display }) => (display.sourceLine === undefined ? [] : [display.sourceLine.text])))];
  const summary = withOptional(
    {
      ...base(input, valueId),
      text: `${phrases.join(', ')}${unknownPart}`,
      shape: own.some(({ display }) => display.shape === 'range') ? ('range' as const) : ('value' as const),
      badge: chosenBadge(badges),
      measure: measureOf(field),
    },
    {
      parts: [...new Set(own.flatMap(({ display }) => display.parts ?? []))],
      sourceLine: sources.length === 0 ? undefined : { id: 'facts_sources', kind: 'source_line', text: sources.join('; ') },
      lines,
      evidence: own.flatMap(({ display }) => display.evidence ?? []),
      actions: input.actions,
    },
  );
  return [summary, ...parts.flatMap((part) => part.displays), ...unstatedDisplays];
}

/**
 * One field (or, for a multi-fact field, the field and each fact) as display objects. The first is
 * the field's own; a conflict adds one display per value in conflict (`<value id>.value<n>`), which
 * the `resolve_conflict` action names.
 */
export function resolveField(input: ResolveFieldInput): readonly DisplayObject[] {
  const { field, state, subject } = input;
  const valueId = input.valueId ?? valueIdOf(subject.kind, subject.id, field.key);
  if (state.facts.length === 0 || (state.state !== 'known' && state.state !== 'conflict')) return [missingDisplay(input, valueId)];
  const multiFact = (field.qualifiers ?? []).length > 1 || state.facts.length > 1 || state.readingsToConfirm.length > 0;
  if (multiFact) return multiFactDisplays(input, valueId);
  const [fact] = state.facts;
  if (fact === undefined) return [missingDisplay(input, valueId)];
  if (state.state === 'conflict' && state.conflict !== null) {
    return conflictDisplays(input, valueId, state.conflict.candidateIds, state.conflict.routedTo, fact.qualifier ?? undefined, input.actions);
  }
  const activeId = state.activeCandidateId ?? fact.activeCandidateId ?? (fact.ambiguous ? fact.candidateIds[0] : undefined);
  const candidate = candidateById(input, activeId);
  if (candidate === undefined) return [missingDisplay(input, valueId)];
  const qualified = (field.kind === 'quantity' || field.kind === 'count') && (field.qualifierRequired === true || (field.qualifiers ?? []).length > 0);
  return [knownDisplay(input, valueId, candidate, fact.ambiguous, qualified ? statedQualifier(candidate) : undefined, input.actions, fact.stale)];
}

// ---------------------------------------------------------------------------------------------
// Step 4's detection of a system
// ---------------------------------------------------------------------------------------------

/**
 * Step 4's detection display of one system (`building:<id>.detection.<system>`; section 5, step 4;
 * PRD R-051): From document, Likely, Possible, Please check or SOVITECH will check by `confirmBy`,
 * From design drawings, Reading documents…, Not found in documents with "Not found in the analysed
 * documents (<coverage>). You can still include it." only over what a completed AI run searched,
 * or Unknown. No "Detected" or "Optional" (section 5, step 4). While the registry declares no
 * detection field (proposal P-3-DETECTION-FIELDS), `detection` is undefined and every card reads
 * Unknown (US-SCOPE-01 AC8).
 */
export function resolveDetection(input: {
  readonly buildingId: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly detection: Omit<ResolveFieldInput, 'valueId' | 'detection' | 'suggestion'> | undefined;
  readonly format: FormatOptions;
}): DisplayObject {
  const valueId = childId(`building:${input.buildingId}.detection` as ValueId, input.systemId);
  if (input.detection !== undefined) {
    const [own] = resolveField({ ...input.detection, valueId, detection: true, actions: [] });
    if (own !== undefined) return own;
  }
  return { valueId, kind: 'field', text: badgeOf('unknown').label, shape: 'missing', missing: 'unknown', badge: badgeOf('unknown'), measure: { label: input.systemName } };
}

// ---------------------------------------------------------------------------------------------
// Standalone lines
// ---------------------------------------------------------------------------------------------

/**
 * A standalone line with its slots filled from stored state, as a `line` display object: a 2.8
 * status line (STATUS_LINES), a rule line (RULE_LINES) or a stage label. Each number slot is filled
 * with a formatted count; `valueId` is the id the view-model derives from the stored state the
 * number counts (`project:<id>.openItems.owner`). A count of one takes the line's singular form.
 * `extra` adds what the line needs beyond its words: the missing kind of an output's "Not
 * available yet" line, its lines ("Add the <field> to see this.") and its actions (`add`).
 */
export function resolveLine(
  valueId: ValueId,
  lineId: string,
  slots: Readonly<Record<string, string | number>>,
  format: FormatOptions,
  extra: { readonly missing?: MissingKind; readonly lines?: readonly Line[]; readonly actions?: readonly Action[] } = {},
): DisplayObject {
  if (!VALUE_ID_PATTERN.test(valueId)) throw new Error(`view-model: "${valueId}" is not a value id`);
  const filled = fillLine(lineId, slots, format);
  return withOptional(
    {
      valueId,
      kind: 'line' as const,
      text: filled.line.text,
      shape: extra.missing === undefined ? ('value' as const) : ('missing' as const),
      ...(extra.missing === undefined ? {} : { missing: extra.missing }),
    },
    { parts: filled.parts, lines: extra.lines, actions: extra.actions },
  );
}

/** The two stage labels of rule 10 a screen may name without a stored quotation record (2.8; "Formal quotation" never: G10-9). */
export type StageLabelId = 'indicative_range' | 'preliminary_investment_estimate';

/**
 * A rule 10 stage label as its own `line` display object (2.8, "Status lines and stage labels": "Indicative
 * range", "Preliminary investment estimate"; G10-11): its text is the registry's label, and its one line carries
 * the same words with the stage-label kind, so the component marks its copy kind from it (StatusLine) and the
 * reserved-term check reads it as a stage label. "Formal quotation" is never made here: it is derived from a
 * stored quotation record only (rule 10; fillLine refuses it).
 */
export function resolveStageLabel(valueId: ValueId, lineId: StageLabelId, format: FormatOptions): DisplayObject {
  if (!VALUE_ID_PATTERN.test(valueId)) throw new Error(`view-model: "${valueId}" is not a value id`);
  const filled = fillLine(lineId, {}, format);
  if (filled.line.kind !== 'stage_label') throw new Error(`view-model: ${lineId} is not a stage label (2.8)`);
  return { valueId, kind: 'line', text: filled.line.text, shape: 'value', lines: [filled.line] };
}

/**
 * A line with no number (served inline in a view, not as a display object): the demo line, "You
 * can provide this later.", a suggestion's reason, the G12-1 line of a stored model. Throws when the
 * filled text holds a digit: such a line is bound to a value id and served by resolveLine
 * (prompt 3 section 7).
 */
export function lineOf(lineId: string, slots?: Readonly<Record<string, string>>): Line {
  const filled = fillLine(lineId, slots ?? {}, { numberFormat: 'en' });
  if (holdsDigit(filled.line.text)) throw new Error(`view-model: the line ${lineId} holds a number, so it is a bound display object (resolveLine)`);
  return filled.line;
}

/** A whole count bound to its value id (the documents stored, US-DOCS-03 AC8), with what it counts. */
export function resolveCount(valueId: ValueId, count: number, label: string, format: FormatOptions): DisplayObject {
  if (!VALUE_ID_PATTERN.test(valueId)) throw new Error(`view-model: "${valueId}" is not a value id`);
  const formatted = formatCount(count, format);
  return { valueId, kind: 'line', text: formatted.text, parts: [...formatted.parts], shape: 'value', measure: { label } };
}

// ---------------------------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------------------------

/** What a document row shows (step 2): the file name as uploaded, its status or coverage line, its stage and its revision. */
export interface ResolvedDocument {
  readonly fileName: DisplayObject;
  /** Absent while queued or analysing (a progress state: see `reading`). */
  readonly status: DisplayObject | undefined;
  /**
   * While queued or analysing: the progress state's own words, 2.8's pending wording ("Reading documents…",
   * the `pending` badge; US-DOCS-03 AC1: no percentage, no size), bound to the document's coverage value id;
   * absent otherwise.
   */
  readonly reading?: DisplayObject;
  /** Its stage through the value component with one badge: Unknown while nothing states it (no classifier yet). */
  readonly stage: DisplayObject;
  /** Its revision as written, or Unknown (never "none stated" while no classifier read its title block). */
  readonly revision: DisplayObject;
}

/** A stored name as uploaded (owner text), bound: it may hold digits. */
function nameDisplay(valueId: ValueId, fileName: string | null): DisplayObject {
  const name = fileName === null ? '' : fileName.replace(/\s+/gu, ' ').trim();
  if (name === '') return { valueId, kind: 'record', text: badgeOf('unknown').label, shape: 'missing', missing: 'unknown', badge: badgeOf('unknown') };
  return { valueId, kind: 'record', text: name, shape: 'value', ...(holdsDigit(name) ? { parts: [name] } : {}) };
}

/** A page or sheet position written in digits, read by the rule 8 parser (the one place text becomes a number). */
function wholeNumber(text: string): number | undefined {
  const parsed = parseNumber(text);
  if (!parsed.ok || parsed.readings.length !== 1) return undefined;
  const value = parsed.readings[0]?.value;
  return value !== undefined && Number.isInteger(value) && value >= 1 ? value : undefined;
}

/** The pages or sheets a coverage text counts as read: "pages 1-11, 13-40 of 40" names 39 of 40. */
function coverageCount(coverage: string): { readonly read: number; readonly total: number; readonly unit: 'pages' | 'sheets' } | undefined {
  const match = /^(pages|sheets) (none|\d{1,6}(?:-\d{1,6})?(?:, \d{1,6}(?:-\d{1,6})?)*) of (\d{1,6})$/u.exec(coverage);
  const [, unit, list, totalText] = match ?? [];
  if ((unit !== 'pages' && unit !== 'sheets') || list === undefined || totalText === undefined) return undefined;
  const total = wholeNumber(totalText);
  if (total === undefined) return undefined;
  const positions = new Set<number>();
  if (list !== 'none') {
    for (const range of list.split(', ')) {
      const [firstText = '', lastText] = range.split('-');
      const first = wholeNumber(firstText);
      const last = lastText === undefined ? first : wholeNumber(lastText);
      if (first === undefined || last === undefined || last < first || last > total) return undefined;
      for (let position = first; position <= last; position += 1) positions.add(position);
    }
  }
  return { read: positions.size, total, unit };
}

/**
 * A document's row (step 2; US-DOCS-03, US-DOCS-04; rule 12; G12-1, G12-3):
 * - queued or analysing: no status line; a progress state whose words are 2.8's pending wording,
 *   "Reading documents…" (`reading`; no percentage or size, US-DOCS-03 AC1);
 * - analysed: its coverage as code recorded it ("pages 1-40 of 40", US-DOCS-03 AC2);
 * - partly analysed: "Partly analysed (<read> of <total> pages)" (G12-3); a workbook shows its
 *   coverage as recorded (2.8's line counts pages; apps/api's statusLineOf does the same);
 * - stored and not analysed: the G12-1 line naming its file type ("Not analysed: IFC model stored,
 *   not analysed");
 * - failed, or a coverage no reader wrote: "Analysis failed".
 * Stage and revision read Unknown unless recorded (no classifier: US-DOCS-08 not built), then the
 * stage's word with From document and the revision exactly as written (US-DOCS-03 AC6); never
 * "none stated" (US-DOCS-04 AC7). No Edit on either (proposal 7.2.26).
 */
export function resolveDocument(input: { readonly document: DocumentRecord; readonly fileName: string | null; readonly format: FormatOptions }): ResolvedDocument {
  const { document, format } = input;
  const statusId = documentValueId(document.id, 'coverage');
  let status: DisplayObject | undefined;
  const { status: analysis, coverage } = document.analysis;
  if (analysis === 'analysed') {
    const text = coverage.replace(/\s+/gu, ' ').trim();
    status =
      text === ''
        ? resolveLine(statusId, 'analysis_failed', {}, format)
        : { valueId: statusId, kind: 'record', text, shape: 'value', ...(holdsDigit(text) ? { parts: [...new Set(text.match(/\d+/gu) ?? [])] } : {}) };
  } else if (analysis === 'partly_analysed') {
    const read = coverageCount(coverage);
    if (read === undefined) status = resolveLine(statusId, 'analysis_failed', {}, format);
    else if (read.unit === 'sheets') status = { valueId: statusId, kind: 'record', text: coverage, shape: 'value', parts: [...new Set(coverage.match(/\d+/gu) ?? [])] };
    else status = resolveLine(statusId, 'partly_analysed', { analysed: read.read, total: read.total }, format);
  } else if (analysis === 'stored_only') {
    const fileType = coverage.startsWith('stored: ') ? coverage.slice('stored: '.length) : '';
    status = resolveLine(statusId, 'not_analysed', { fileType }, format);
  } else if (analysis === 'failed') {
    status = resolveLine(statusId, 'analysis_failed', {}, format);
  }
  const stageId = documentValueId(document.id, 'stage');
  const stageWord = stageLabel(document.stage);
  const stage: DisplayObject =
    stageWord === undefined
      ? { valueId: stageId, kind: 'record', text: badgeOf('unknown').label, shape: 'missing', missing: 'unknown', badge: badgeOf('unknown') }
      : { valueId: stageId, kind: 'record', text: stageWord, shape: 'value', badge: badgeOf('from_document') };
  const revisionId = documentValueId(document.id, 'revision');
  const written = document.revision?.replace(/\s+/gu, ' ').trim() ?? '';
  const revision: DisplayObject =
    written === ''
      ? { valueId: revisionId, kind: 'record', text: badgeOf('unknown').label, shape: 'missing', missing: 'unknown', badge: badgeOf('unknown') }
      : { valueId: revisionId, kind: 'record', text: written, shape: 'value', badge: badgeOf('from_document'), ...(holdsDigit(written) ? { parts: [written] } : {}) };
  const reading: DisplayObject | undefined =
    analysis === 'queued' || analysis === 'analysing'
      ? { valueId: statusId, kind: 'record', text: badgeOf('reading_documents').label, shape: 'missing', missing: 'reading_documents', badge: badgeOf('reading_documents') }
      : undefined;
  return { fileName: nameDisplay(documentValueId(document.id, 'fileName'), input.fileName), status, ...(reading === undefined ? {} : { reading }), stage, revision };
}

/** An upload's file name while it is still being sent (`upload:<id>.fileName`), bound. */
export function resolveUploadFileName(uploadId: string, fileName: string): DisplayObject {
  return nameDisplay(childId(`upload:${uploadId}` as ValueId, 'fileName'), fileName);
}

// ---------------------------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------------------------

/** The longest text an owner answer may carry (actions.ts AnswerValueSchema). */
export const TEXT_ANSWER_MAX_LENGTH = 500;

/**
 * How an owner's input is taken for a field (display.ts InputSpec): its options for an enum or a
 * decision, text, or a quantity typed as text with the registry's unit and qualifiers (rule 8; the
 * server parses it: US-REVIEW-07 AC6).
 */
export function inputSpecOf(field: RegistryFieldDefinition): InputSpec {
  if (field.kind === 'enum' || field.kind === 'decision') {
    const options = field.options ?? [];
    if (options.length === 0) throw new Error(`view-model: the field ${field.key} lists no options`);
    return { kind: 'choice', options: [...options] };
  }
  if (field.kind === 'text') return { kind: 'text', maxLength: TEXT_ANSWER_MAX_LENGTH };
  const unit = field.unit === undefined ? undefined : unitByCode(field.unit);
  if (unit === undefined) throw new Error(`view-model: the field ${field.key} names no unit of the closed registry`);
  return { kind: 'quantity', unit: { code: unit.code, symbol: unit.symbol }, qualifiers: [...(field.qualifiers ?? [])], qualifierRequired: field.qualifierRequired === true };
}

/** Edit on a shown value (section 5, step 3; US-REVIEW-07): the candidates shown are those a correction rejects (rule 4; G4-5). */
export function editActionOf(field: RegistryFieldDefinition, subjectId: string, shownCandidateIds: readonly string[]): Action {
  return { kind: 'edit', field: { subjectId, fieldKey: field.key }, input: inputSpecOf(field), shownCandidateIds: [...shownCandidateIds] };
}

/**
 * The confirmation on a value that passes rule 5's test within the budget (F-QUESTION-02): "Yes,
 * it's a <type>" for the building type (section 4's example; section 5, step 5), "Is this right?"
 * for any other field (section 5, step 3).
 */
export function confirmActionOf(field: RegistryFieldDefinition, candidate: Candidate): Action {
  const typeWord = field.key === 'building.type' && candidate.choice !== undefined ? optionLabel(field.key, field.kind, candidate.choice).toLowerCase() : undefined;
  const wording =
    typeWord === undefined
      ? lineOf('is_this_right')
      : lineOf(/^[aeiou]/u.test(typeWord) ? 'yes_building_type_vowel' : 'yes_building_type', { buildingType: typeWord });
  return { kind: 'confirm', candidateId: candidate.id, wording };
}
