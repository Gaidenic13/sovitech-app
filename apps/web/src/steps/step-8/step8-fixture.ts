/**
 * Test support: a step 8 view and the proposal page's view in the contract's shapes, with TEST values
 * only (no figure of the mockups or of a real building). Used by Step8.test.tsx and
 * ProposalPage.test.tsx; never imported by the app.
 */
import type { DisplayObject, Line, OutputAvailability, StepView } from '@sovitech/view-model/browser';
import { PROJECT, envelope } from '../../test/harness';
import {
  AREAS,
  BUILDING_TYPE_OPTIONS,
  CANDIDATE_A,
  CANDIDATE_B,
  GOALS,
  OCCUPANCY_OPTIONS,
  PROVIDE_LATER,
  SCHEDULE_OPTIONS,
  SYSTEMS,
  editOf,
  fieldValueId,
  lineDisplay,
  notProvided,
  provided,
  refOf,
} from '../../review/test-views';

type Step8View = Extract<StepView, { step: 8 }>;

export const SCOPE_KEYS = SYSTEMS.map((id) => `project.scope.${id}`);
const GOAL_KEYS = GOALS.map((id) => `project.goal.${id}`);
const AREA_KEYS = AREAS.map((id) => `project.automation.${id}`);

export const AREA_ID = fieldValueId('building.grossFloorArea');
export const OCCUPANCY_ID = fieldValueId('project.occupancy');
export const CHOICE_A = `project:${PROJECT}.occupancy.value1`;
export const CHOICE_B = `project:${PROJECT}.occupancy.value2`;
export const DOCUMENT_COUNT = `project:${PROJECT}.documents.count`;
export const OWNER_COUNT = `project:${PROJECT}.openItems.owner`;
export const OWNER_MORE = `project:${PROJECT}.openItems.ownerMore`;
export const ENGINEER_LINE = `project:${PROJECT}.openItems.engineer.equipmentClassifications`;
export const STILL_READING = `project:${PROJECT}.documents.stillReading`;
export const CAPEX_LINE = `project:${PROJECT}.outputs.capex.indicativeRange`;
/** The benchmark investment output's served stage label (rule 10; 2.8 "Indicative range"), a line display object. */
export const CAPEX_LABEL = `project:${PROJECT}.outputs.capex.indicativeRange.stage`;
export const CAPEX_LABEL_TEXT = 'TEST indicative range stage label';
/** The Proposal card's served stage label (`proposal.stageLabel`). */
export const PROPOSAL_STAGE = `project:${PROJECT}.proposal.stage`;
/** The investment output from the project's data (rule 10 stage 2), served only where a test asks for it (`stage2`). */
export const CAPEX_STAGE2_LINE = `project:${PROJECT}.outputs.capex.preliminaryEstimate`;
export const CAPEX_STAGE2_LABEL = `project:${PROJECT}.outputs.capex.preliminaryEstimate.stage`;
export const CAPEX_STAGE2_LABEL_TEXT = 'TEST preliminary estimate output label';
/** The stage 2 output's served "Not available yet" line and its owner action. */
export const CAPEX_STAGE2_MISSING = 'TEST not available: two datasets and the area';
export const CAPEX_STAGE2_ADD = 'TEST add the area for the estimate';
/** The line an investment output carries when it is served as a range (no figure: TEST words only). */
export const RANGE_LINE_TEXT = 'TEST output served as a range';
export const ENERGY_LINE = `project:${PROJECT}.outputs.energy.annualConsumption`;
/** The gross floor area ask's box, named with its unit's name from the catalogue (`edit.inUnit`, `units.m2`; DR-5). */
export const AREA_BOX = 'Gross floor area, in square metres';

const AREA: DisplayObject = {
  valueId: AREA_ID,
  kind: 'field',
  text: 'TEST not provided',
  shape: 'missing',
  missing: 'not_provided_yet',
  badge: { id: 'not_provided_yet', label: 'TEST not provided' },
  measure: { label: 'TEST gross floor area' },
  lines: [PROVIDE_LATER],
  actions: [{ kind: 'edit', field: refOf('building.grossFloorArea'), input: { kind: 'quantity', unit: { code: 'm2', symbol: 'TEST unit' }, qualifiers: ['gross_total'], qualifierRequired: true }, shownCandidateIds: [] }],
  field: refOf('building.grossFloorArea'),
};

/** The occupancy in conflict, routed to the owner (rule 4): both values with their sources, and the owner's choice. */
const OCCUPANCY_CONFLICT: DisplayObject = {
  valueId: OCCUPANCY_ID,
  kind: 'field',
  text: 'TEST two values',
  shape: 'missing',
  badge: { id: 'two_values', label: 'TEST two values' },
  measure: { label: 'TEST occupancy' },
  lines: [{ id: 'documents_say', kind: 'rule_line', text: 'TEST documents say and you entered' }],
  actions: [
    editOf('project.occupancy', OCCUPANCY_OPTIONS, [CANDIDATE_A, CANDIDATE_B]),
    { kind: 'resolve_conflict', field: refOf('project.occupancy'), choices: [{ candidateId: CANDIDATE_A, valueId: CHOICE_A }, { candidateId: CANDIDATE_B, valueId: CHOICE_B }] },
  ],
  field: refOf('project.occupancy'),
};

const CONFLICT_VALUES: DisplayObject[] = [
  { valueId: CHOICE_A, kind: 'field', text: 'TEST value from a document', shape: 'value', badge: { id: 'from_document', label: 'TEST document badge' }, sourceLine: { id: 'found_in', kind: 'source_line', text: 'TEST source of the first value' } },
  { valueId: CHOICE_B, kind: 'field', text: 'TEST value you entered', shape: 'value', badge: { id: 'provided_by_you', label: 'TEST provided badge' } },
];

const OUTPUTS: OutputAvailability[] = [
  { output: 'capex.indicativeRange', availability: 'not_available_yet', line: CAPEX_LINE, label: CAPEX_LABEL },
  { output: 'energy.annualConsumption', availability: 'not_available_yet', line: ENERGY_LINE },
];

const CAPEX_MISSING: DisplayObject = {
  valueId: CAPEX_LINE,
  kind: 'line',
  text: 'TEST not available: a dataset and the area',
  shape: 'missing',
  missing: 'not_available_yet',
  actions: [{ kind: 'add', field: refOf('building.grossFloorArea'), label: 'TEST add the area', step: 8 }],
};

const OUTPUT_LINES: DisplayObject[] = [
  CAPEX_MISSING,
  { valueId: ENERGY_LINE, kind: 'line', text: 'TEST not available: a dataset', shape: 'missing', missing: 'not_available_yet' },
  { valueId: CAPEX_LABEL, kind: 'line', text: CAPEX_LABEL_TEXT, shape: 'value', lines: [{ id: 'indicative_range', kind: 'stage_label', text: CAPEX_LABEL_TEXT }] },
];

type Availability = OutputAvailability['availability'];

/** An investment output's served line: its "Not available yet" line, or a TEST line where it is served as a range. */
function rangeLine(valueId: string): DisplayObject {
  return { valueId, kind: 'line', text: RANGE_LINE_TEXT, shape: 'value' };
}

/** The outputs and their lines, with the investment outputs served as the options ask (rule 10's two stages). */
function outputsOf(options: Step8Options): { readonly outputs: OutputAvailability[]; readonly lines: DisplayObject[] } {
  const indicative = options.indicative ?? 'not_available_yet';
  const outputs: OutputAvailability[] = OUTPUTS.map((entry) => (entry.output === 'capex.indicativeRange' ? { ...entry, availability: indicative } : entry));
  const lines: DisplayObject[] = OUTPUT_LINES.map((display) => (display.valueId === CAPEX_LINE && indicative === 'range' ? rangeLine(CAPEX_LINE) : display));
  if (options.stage2 !== undefined) {
    outputs.splice(1, 0, { output: 'capex.preliminaryEstimate', availability: options.stage2, line: CAPEX_STAGE2_LINE, label: CAPEX_STAGE2_LABEL });
    lines.push(
      options.stage2 === 'range'
        ? rangeLine(CAPEX_STAGE2_LINE)
        : {
            valueId: CAPEX_STAGE2_LINE,
            kind: 'line',
            text: CAPEX_STAGE2_MISSING,
            shape: 'missing',
            missing: 'not_available_yet',
            actions: [{ kind: 'add', field: refOf('building.grossFloorArea'), label: CAPEX_STAGE2_ADD, step: 8 }],
          },
      { valueId: CAPEX_STAGE2_LABEL, kind: 'line', text: CAPEX_STAGE2_LABEL_TEXT, shape: 'value', lines: [{ id: 'preliminary_investment_estimate', kind: 'stage_label', text: CAPEX_STAGE2_LABEL_TEXT }] },
    );
  }
  return { outputs, lines };
}

export interface Step8Options {
  /** Include the inline asks (default true). */
  readonly asks?: boolean;
  readonly demo?: boolean;
  /** The stage label the Proposal card names (rule 10), as served (`proposal.stage`); none by default. */
  readonly stage?: Line;
  /** The Proposal card's stage label as its own bound display object (`proposal.stageLabel`), with this text. */
  readonly stageLabel?: string;
  /** The stage the served `proposal.stageLabel` names (its stage-label line's id); stage 2 by default. */
  readonly stageLabelId?: 'indicative_range' | 'preliminary_investment_estimate';
  /** How the benchmark investment output (stage 1) is served; "Not available yet" by default. */
  readonly indicative?: Availability;
  /** Serve the investment output from the project's data (stage 2) too, with this availability. */
  readonly stage2?: Availability;
}

export function step8View(options: Step8Options = {}): { asOf: string; project: unknown; displayObjects: DisplayObject[]; view: Step8View } {
  const served = outputsOf(options);
  const displays: DisplayObject[] = [
    provided('project.type', 'TEST project type', 'TEST renovation', ['new_construction', 'renovation']),
    provided('project.country', 'TEST country', 'TEST country value', ['RO']),
    provided('project.city', 'TEST city', 'TEST city value', ['x']),
    { ...lineDisplay('documents.count', 'TEST document count'), measure: { label: 'TEST documents' } },
    AREA,
    notProvided('building.floors', 'TEST floors', ['x']),
    notProvided('building.rooms', 'TEST rooms', ['x']),
    notProvided('building.zones', 'TEST zones', ['x']),
    // The systems question was skipped: its line is served once for the question (the card's skippedQuestions), not per option.
    ...SCOPE_KEYS.map((key) => notProvided(key, `TEST system ${key}`, ['include', 'exclude'])),
    notProvided('building.type', 'TEST building type', BUILDING_TYPE_OPTIONS),
    notProvided('project.operatingSchedule', 'TEST schedule', SCHEDULE_OPTIONS),
    OCCUPANCY_CONFLICT,
    ...CONFLICT_VALUES,
    ...GOAL_KEYS.map((key) => notProvided(key, `TEST goal ${key}`, ['selected', 'not_selected'])),
    ...AREA_KEYS.map((key) => notProvided(key, `TEST area ${key}`, ['selected', 'not_selected'])),
    ...served.lines,
    lineDisplay('openItems.owner', 'TEST owner count line'),
    lineDisplay('openItems.ownerMore', 'TEST and more line'),
    lineDisplay('openItems.engineer.equipmentClassifications', 'TEST engineer group line'),
    lineDisplay('documents.stillReading', 'TEST still reading line'),
    ...(options.stageLabel === undefined
      ? []
      : [{ ...lineDisplay('proposal.stage', options.stageLabel), lines: [{ id: options.stageLabelId ?? 'preliminary_investment_estimate', kind: 'stage_label' as const, text: options.stageLabel }] }]),
  ];
  const view: Step8View = {
    step: 8,
    cards: [
      { cardId: 'project', editStep: 1, rows: [`project:${PROJECT}.name`, fieldValueId('project.type'), fieldValueId('project.country'), fieldValueId('project.city')] },
      { cardId: 'documents', editStep: 2, rows: [DOCUMENT_COUNT] },
      { cardId: 'building', editStep: 3, rows: [AREA_ID, fieldValueId('building.floors'), fieldValueId('building.rooms'), fieldValueId('building.zones')] },
      { cardId: 'systems', editStep: 4, rows: SCOPE_KEYS.map(fieldValueId), skippedQuestions: [{ questionId: 'q.project.systemsInScope', line: PROVIDE_LATER }] },
      { cardId: 'operations', editStep: 5, rows: [fieldValueId('building.type'), fieldValueId('project.operatingSchedule'), OCCUPANCY_ID] },
      { cardId: 'goals', editStep: 6, rows: GOAL_KEYS.map(fieldValueId) },
      { cardId: 'automation', editStep: 7, rows: AREA_KEYS.map(fieldValueId) },
    ],
    proposal: {
      stage: options.stage ?? null,
      ...(options.stageLabel === undefined ? {} : { stageLabel: PROPOSAL_STAGE }),
      outputs: served.outputs,
      inlineAsks:
        options.asks === false
          ? []
          : [
              {
                questionId: 'q.building.grossFloorArea',
                fields: [refOf('building.grossFloorArea')],
                ask: { id: 'inline_ask', kind: 'rule_line', text: 'TEST ask for the area' },
                input: { kind: 'quantity', unit: { code: 'm2', symbol: 'TEST unit' }, qualifiers: ['gross_total'], qualifierRequired: true },
              },
              {
                questionId: 'q.building.type',
                fields: [refOf('building.type')],
                ask: { id: 'inline_ask', kind: 'rule_line', text: 'TEST ask for the type' },
                input: { kind: 'choice', options: [...BUILDING_TYPE_OPTIONS] },
              },
              {
                questionId: 'q.project.systemsInScope',
                fields: SCOPE_KEYS.map(refOf),
                ask: { id: 'inline_ask', kind: 'rule_line', text: 'TEST ask for the systems' },
                input: { kind: 'multi', options: [...SCOPE_KEYS] },
              },
            ],
    },
    forYou: {
      count: OWNER_COUNT,
      items: [
        { itemId: 'conflict:project.occupancy', reason: 'conflict', concerns: OCCUPANCY_ID },
        { itemId: 'first_estimate_missing:building.grossFloorArea', reason: 'first_estimate_missing', concerns: AREA_ID },
        { itemId: 'first_estimate_missing:project.scope.hvac', reason: 'first_estimate_missing', concerns: fieldValueId('project.scope.hvac') },
      ],
      more: OWNER_MORE,
    },
    sovitechWillCheck: [ENGINEER_LINE],
    revisionNotices: [],
    stillReading: STILL_READING,
  };
  return { ...envelope(PROJECT, displays, { demo: options.demo === true }), view };
}

/** The proposal page's view (steps.ts ProposalPreviewResponse). */
export function proposalView(demo = false) {
  return {
    ...envelope(PROJECT, [...OUTPUT_LINES, lineDisplay('documents.stillReading', 'TEST still reading line')], { demo }),
    view: { outputs: OUTPUTS, stillReading: STILL_READING },
  };
}
