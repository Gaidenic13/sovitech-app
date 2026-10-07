/**
 * Test support: stored proposals, their versions and Reports' rows in the contract's shapes (proposal.ts), with TEST
 * values only (no figure of the mockups, the specs or a real building; the stage labels and status lines are 2.8's
 * words where a case needs them, with TEST slots). Every response here is parsed with the contract's schema by the
 * app's client when the fake API serves it, so a shape the API cannot serve fails the test. Never imported by the app,
 * and it imports nothing at run time (no test runner needed).
 */
import type { Action, DisplayObject, Line, Price, ProposalResponse, ReportRow, ReportsResponse } from '@sovitech/view-model/browser';

/** As ../test/harness.tsx serves them (kept here, as ../workspace/test-views.ts does, so this file needs no test runner). */
export const PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9f';
const AS_OF = '2026-09-30T10:00:00.000Z';
const DEMO_LINE: Line = { id: 'demo_project', kind: 'demo_line', text: 'TEST demo line' };

function envelope(projectId: string, displayObjects: readonly DisplayObject[], options: { readonly demo?: boolean; readonly name?: string } = {}) {
  const name: DisplayObject = { valueId: `project:${projectId}.name`, kind: 'field', text: options.name ?? 'TEST project', shape: 'value', badge: { id: 'provided_by_you', label: 'TEST provided badge' } };
  return {
    asOf: AS_OF,
    project: { projectId, name: name.valueId, isDemo: options.demo === true, demoLine: options.demo === true ? DEMO_LINE : null },
    displayObjects: [name, ...displayObjects],
  };
}

export const SNAPSHOT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8a01';
export const EARLIER = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8a00';
export const RECORD = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8a99';
export const OUTPUT_A = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b01';
export const OUTPUT_B = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b02';
const BUILDING = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e01';

/** A value id of a snapshot (`proposal:<sid>.<path>`). */
export function sid(snapshotId: string, path: string): string {
  return `proposal:${snapshotId}.${path}`;
}

/** A standalone line (kind `line`). */
function line(valueId: string, text: string, extra: Partial<DisplayObject> = {}): DisplayObject {
  return { valueId, kind: 'line', text, shape: 'value', ...extra };
}

/** A "Not available yet" line naming what is missing (rule 7), with its Add actions when given, in the order given. */
function notAvailable(valueId: string, text: string, ...adds: Action[]): DisplayObject {
  return { valueId, kind: 'line', text, shape: 'missing', missing: 'not_available_yet', ...(adds.length === 0 ? {} : { actions: adds }) };
}

export const ADD_AREA: Action = { kind: 'add', field: { subjectId: BUILDING, fieldKey: 'building.grossFloorArea' }, label: 'TEST add the area', step: 8 };
export const ADD_TYPE: Action = { kind: 'add', field: { subjectId: BUILDING, fieldKey: 'building.type' }, label: 'TEST add the type', step: 8 };
export const ADD_SYSTEMS: Action = { kind: 'add', field: { subjectId: PROJECT, fieldKey: 'project.scope.hvac' }, label: 'TEST add the systems', step: 8 };

export const STAGE_2 = 'Preliminary investment estimate';
export const STAGE_1 = 'Indicative range';
export const STAGE_2_MISSING = 'Not available yet: TEST cost ranges and the area';
export const STAGE_1_MISSING = 'Not available yet: TEST cost ranges';
/** Stage 1's line when it waits for three owner inputs as well (DR-1: the live app's indicative range on a new project). */
export const STAGE_1_MISSING_INPUTS = 'Not available yet: TEST cost ranges; the area; the type; the systems';
/** Rule 1's "Incomplete: excludes <item names>" in place of the figure (V-1). */
export const INCOMPLETE_TEXT = 'Incomplete: excludes TEST item A, TEST item B';
export const RANGE_TEXT = 'about TEST 1,200 (TEST 1,100 to TEST 1,300) EUR';
export const SUPERSEDED_TEXT = 'Superseded: inputs changed on TEST 6 Oct 2026';
export const INTERFACE_POINTS_TEXT = 'TEST interface points sentence: a fire-alarm input and a fire-mode status per affected panel';
export const POINTS_MISSING = 'Not available yet: TEST point templates';
export const STILL_READING_TEXT = 'TEST still reading 2 files. Your estimate will update when they finish.';
export const OWNER_COUNT_TEXT = 'TEST 2 things for you to check';
export const ENGINEER_TEXT = 'TEST SOVITECH will check 3 equipment classifications';
export const OUT_OF_DATE = 'Out of date, recalculating';

export interface ProposalOptions {
  readonly snapshotId?: string;
  readonly demo?: boolean;
  /**
   * The investment figure: `none` (no approved dataset: "Not available yet", the live app), `range` (a TEST stage 2
   * range), `superseded` (the range with a stale TEST quotation record's line, back at stage 2), `formal` (stage 3
   * from a TEST record), `formal_unrecorded` (stage 3 naming no record: a fault G10-9 must refuse), `incomplete` (a
   * total with material exclusions, served as its "Incomplete: excludes …" line carrying its stage label in place of a
   * figure: rule 1, "no headline … is computed from it"; V-1).
   */
  readonly figure?: 'none' | 'range' | 'superseded' | 'formal' | 'formal_unrecorded' | 'incomplete';
  /** The stage 3 label's words (2.8), passed by the test that needs them: the copy registries hold them, and no app file writes them again. */
  readonly stage3Text?: string;
  /** Serve each investment output's 2.8 stage label (`ProposalOutput.label`) while it has no figure (to name it; G10-11). */
  readonly stageNames?: boolean;
  readonly stillReading?: boolean;
  readonly latest?: boolean;
  readonly versions?: readonly string[];
  readonly outOfDate?: boolean;
  readonly drafted?: boolean;
  /** Stage 1 also waits for three owner inputs, each with its served Add, in order (DR-1). */
  readonly missingInputs?: boolean;
  /** Three inputs in "What the estimate is based on", in the order served (DR-12), in place of one. */
  readonly basisMore?: boolean;
}

function stageLine(id: 'indicative_range' | 'preliminary_investment_estimate' | 'formal_quotation', text: string) {
  return { id, kind: 'stage_label' as const, text };
}

/** `GET …/proposals/:snapshotId` as the API could serve it. */
export function proposalResponse(options: ProposalOptions = {}): ProposalResponse {
  const s = options.snapshotId ?? SNAPSHOT;
  const figure = options.figure ?? 'none';
  const displays: DisplayObject[] = [];
  const add = (display: DisplayObject): string => {
    displays.push(display);
    return display.valueId;
  };

  // Investment (rule 10): stage 2 carries the headline; stage 1 beside it.
  const stage2Id = sid(s, 'outputs.capex.preliminaryEstimate');
  // With no figure, the API names an investment output by its 2.8 stage label (`label`, G10-11), never as its stage.
  const stage2LabelId = sid(s, 'outputs.capex.preliminaryEstimate.label');
  const stage1Id = sid(s, 'outputs.capex.indicativeRange');
  const stage1LabelId = sid(s, 'outputs.capex.indicativeRange.label');
  let stage2Price: Price;
  /** The head's price when it differs from the investment output's own (V-1: an incomplete total). */
  let headPrice: Price | undefined;
  if (figure === 'incomplete') {
    // V-1, as the API serves it (packages/view-model/src/proposal/view.ts `incompleteHeadline`): the Investment section
    // keeps the figure with its Incomplete line; the head gets its own display, `headline.investment`, reading rule 1's
    // line as its text under the stage label, with no figure (rule 1, "no headline ... is computed from it"). Each line
    // once in each display (phase 6, V-11): the head's text is the Incomplete line, which its lines do not repeat.
    const label = stageLine('preliminary_investment_estimate', STAGE_2);
    add({
      valueId: stage2Id,
      kind: 'field',
      text: RANGE_TEXT,
      shape: 'range',
      badge: { id: 'estimated', label: 'Estimated' },
      sourceLine: { id: 'based_on', kind: 'source_line', text: 'Based on TEST cost ranges v0 and TEST 3 equipment items' },
      lines: [label, { id: 'incomplete_exclusions', kind: 'status_line', text: INCOMPLETE_TEXT }],
    });
    stage2Price = { figure: stage2Id, stageId: 'preliminary_investment_estimate', quotationRecordId: null };
    const head = add(line(sid(s, 'headline.investment'), INCOMPLETE_TEXT, { lines: [label] }));
    headPrice = { figure: head, stageId: 'preliminary_investment_estimate', quotationRecordId: null };
  } else if (figure === 'none') {
    add(notAvailable(stage2Id, STAGE_2_MISSING, ADD_AREA));
    if (options.stageNames === true) add(line(stage2LabelId, STAGE_2, { lines: [stageLine('preliminary_investment_estimate', STAGE_2)] }));
    stage2Price = { figure: stage2Id, stageId: null, quotationRecordId: null };
  } else {
    const formal = figure === 'formal' || figure === 'formal_unrecorded';
    const label = formal ? stageLine('formal_quotation', options.stage3Text ?? 'TEST stage 3 label') : stageLine('preliminary_investment_estimate', STAGE_2);
    add({
      valueId: stage2Id,
      kind: 'field',
      text: RANGE_TEXT,
      shape: 'range',
      badge: { id: 'estimated', label: 'Estimated' },
      sourceLine: { id: 'based_on', kind: 'source_line', text: 'Based on TEST cost ranges v0 and TEST 3 equipment items' },
      // Phase 6, V-11: the stage label and, on a stale record, the Superseded line are the figure's own lines, served
      // once; no display of their own repeats them.
      lines: [
        label,
        ...(figure === 'superseded' ? [{ id: 'superseded_inputs_changed', kind: 'status_line' as const, text: SUPERSEDED_TEXT }] : []),
        { id: 'provisional', kind: 'status_line', text: 'Provisional: depends on TEST 3 equipment items not yet checked' },
        ...(options.outOfDate === true ? [{ id: 'out_of_date', kind: 'status_line' as const, text: OUT_OF_DATE }] : []),
      ],
      ...(figure === 'formal' ? { quotationRecordId: RECORD } : {}),
    });
    stage2Price = {
      figure: stage2Id,
      stageId: formal ? 'formal_quotation' : 'preliminary_investment_estimate',
      quotationRecordId: formal ? RECORD : null,
    };
  }
  if (options.missingInputs === true) add(notAvailable(stage1Id, STAGE_1_MISSING_INPUTS, ADD_AREA, ADD_TYPE, ADD_SYSTEMS));
  else add(notAvailable(stage1Id, STAGE_1_MISSING));
  if (options.stageNames === true) add(line(stage1LabelId, STAGE_1, { lines: [stageLine('indicative_range', STAGE_1)] }));
  const stage1Price: Price = { figure: stage1Id, stageId: null, quotationRecordId: null };

  const output = (key: string, text: string, price: Price | null = null, formula = 'TEST-formula') => ({
    output: key,
    formula: { id: formula, version: '1.0.0' },
    display: price === null ? add(notAvailable(sid(s, `outputs.${key}`), text)) : price.figure,
    availability: price !== null && figure !== 'none' && key === 'capex.preliminaryEstimate' ? ('figure' as const) : ('not_available_yet' as const),
    incomplete: figure === 'incomplete' && key === 'capex.preliminaryEstimate',
    outOfDate: options.outOfDate === true && key === 'capex.preliminaryEstimate',
    price,
    ...(options.stageNames === true && price !== null && price.stageId === null && (key === 'capex.preliminaryEstimate' || key === 'capex.indicativeRange')
      ? { label: key === 'capex.preliminaryEstimate' ? stage2LabelId : stage1LabelId }
      : {}),
  });

  const investment = [output('capex.preliminaryEstimate', '', stage2Price), output('capex.indicativeRange', '', stage1Price)];
  const points = ['points.hardwareIo', 'points.integration', 'points.virtual'].map((key) => output(key, POINTS_MISSING));
  const interfacePoints = add(line(sid(s, 'lifeSafety.interfacePoints'), INTERFACE_POINTS_TEXT));
  const energy = [output('energy.annualConsumption', 'Not available yet: TEST climate data'), output('savings.annualEnergy', 'Not available yet: TEST savings factors')];
  const indicators = (['operating_cost', 'payback', 'npv', 'irr'] as const).map((indicator) => ({
    indicator,
    display: add(notAvailable(sid(s, `indicators.${indicator}`), `Not available yet: TEST ${indicator === 'operating_cost' ? 'open question on annual amounts' : 'duration unit'}`)),
  }));
  const measures = [output('measures.priorityOrder', 'Not available yet: TEST function set')];
  const decision = (system: string, text: string) =>
    add({ valueId: sid(s, `inputs.project.scope.${system}`), kind: 'field', text, shape: 'value', badge: { id: 'provided_by_you', label: 'Provided by you' }, sourceLine: { id: 'source_step_4', kind: 'source_line', text: 'TEST chosen on step 4' } });
  const fireSentence = add(line(sid(s, 'lifeSafety.fire_safety'), 'TEST monitoring only sentence'));
  const systems = [
    { systemId: 'hvac', decision: decision('hvac', 'TEST included'), lifeSafety: false, sentence: null },
    { systemId: 'fire_safety', decision: decision('fire_safety', 'TEST included'), lifeSafety: true, sentence: fireSentence },
    { systemId: 'cctv', decision: decision('cctv', 'TEST left out'), lifeSafety: false, sentence: null },
  ];
  const basis = add({
    valueId: sid(s, 'inputs.building.grossFloorArea'),
    kind: 'field',
    text: 'TEST 1,234 m²',
    shape: 'value',
    badge: { id: 'from_document', label: 'From document' },
    measure: { label: 'TEST gross floor area', unit: { code: 'm2', symbol: 'm²' } },
    sourceLine: { id: 'found_in', kind: 'source_line', text: 'Found in TEST-1.pdf, page 1' },
  });
  // The basis by intake step, as the server serves it (DR-12): step 3's building facts, then step 5's building type.
  const rooms =
    options.basisMore === true
      ? add({ valueId: sid(s, 'inputs.building.rooms'), kind: 'field', text: 'Unknown', shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'Unknown' }, measure: { label: 'TEST rooms' } })
      : undefined;
  const buildingType =
    options.basisMore === true
      ? add({ valueId: sid(s, 'inputs.building.type'), kind: 'field', text: 'TEST hotel', shape: 'value', badge: { id: 'provided_by_you', label: 'Provided by you' }, measure: { label: 'TEST building type' } })
      : undefined;
  const basisGroups = [
    { step: 3 as const, values: rooms === undefined ? [basis] : [basis, rooms] },
    ...(buildingType === undefined ? [] : [{ step: 5 as const, values: [buildingType] }]),
  ];

  // The open items, the project's now (phase 3's ids; the same displays as step 8).
  const ownerCount = add(line(`project:${PROJECT}.openItems.owner`, OWNER_COUNT_TEXT));
  const engineer = add(line(`project:${PROJECT}.openItems.engineer.equipmentClassifications`, ENGINEER_TEXT));
  const area = add({
    valueId: `building:${BUILDING}.grossFloorArea`,
    kind: 'field',
    text: 'Not provided yet',
    shape: 'missing',
    missing: 'not_provided_yet',
    badge: { id: 'not_provided_yet', label: 'Not provided yet' },
    measure: { label: 'TEST gross floor area' },
    actions: [ADD_AREA],
    field: { subjectId: BUILDING, fieldKey: 'building.grossFloorArea' },
  });
  const openItems = { count: ownerCount, items: [{ itemId: 'TEST-item-area', reason: 'first_estimate_missing' as const, concerns: area }], more: null, sovitechWillCheck: [engineer] };
  const stillReading = options.stillReading === true ? add(line(`project:${PROJECT}.documents.stillReading`, STILL_READING_TEXT)) : null;

  const versionIds = options.versions ?? [s];
  const versions = versionIds.map((id, index) => ({ snapshotId: id, generatedOn: add(line(sid(id, 'generatedOn'), `TEST ${String(5 - index)} Oct 2026`, { kind: 'record' })) }));
  const generatedOn = versions.find((version) => version.snapshotId === s)?.generatedOn ?? add(line(sid(s, 'generatedOn'), 'TEST 5 Oct 2026', { kind: 'record' }));
  const drafted =
    options.drafted === true
      ? [{ slot: 'summary', segments: [{ kind: 'prose' as const, text: 'TEST drafted prose about the building of ' }, { kind: 'value' as const, valueId: basis }, { kind: 'prose' as const, text: ' as read.' }] }]
      : [];

  const unique = new Map(displays.map((display) => [display.valueId, display]));
  return {
    ...envelope(PROJECT, [...unique.values()], { demo: options.demo === true }),
    view: {
      snapshotId: s,
      generatedOn,
      latest: options.latest ?? true,
      headline: { investment: { output: 'capex.preliminaryEstimate', price: headPrice ?? stage2Price }, openItems, stillReading },
      investment: { outputs: investment, exclusions: [systems[2]?.decision ?? sid(s, 'inputs.project.scope.cctv')] },
      points: { outputs: points, interfacePoints },
      energy: { outputs: energy },
      indicators,
      measures: { outputs: measures },
      scope: { systems, exclusions: ['cctv'] },
      lifeSafety: [fireSentence, interfacePoints],
      basis: basisGroups.flatMap((group) => group.values),
      basisGroups,
      whatWeStillNeed: openItems,
      drafted,
      versions,
    },
  } as ProposalResponse;
}

/** `GET …/proposals`: the stored versions, newest first. */
export function versionsResponse(snapshotIds: readonly string[], demo = false) {
  const displays = snapshotIds.map((id, index) => line(sid(id, 'generatedOn'), `TEST ${String(5 - index)} Oct 2026`, { kind: 'record' }));
  return { ...envelope(PROJECT, displays, { demo }), view: { versions: snapshotIds.map((id) => ({ snapshotId: id, generatedOn: sid(id, 'generatedOn') })) } };
}

/** One generated output of Reports. */
export interface TestReport {
  readonly outputId: string;
  readonly name: string;
  readonly at: string;
  readonly by: string;
  readonly superseded?: boolean;
}

export function reportsResponse(rows: readonly TestReport[], options: { readonly demo?: boolean; readonly state?: 'none_generated' | 'listed'; readonly hasNext?: boolean; readonly hasPrevious?: boolean } = {}): ReportsResponse {
  const displays: DisplayObject[] = [];
  const record = (valueId: string, text: string) => {
    displays.push({ valueId, kind: 'record', text, shape: 'value' });
    return valueId;
  };
  const reportRows: ReportRow[] = rows.map((row) => ({
    outputId: row.outputId,
    kind: 'proposal_pdf',
    snapshotId: SNAPSHOT,
    name: record(`output:${row.outputId}.name`, row.name),
    generatedAt: record(`output:${row.outputId}.generatedAt`, row.at),
    generatedBy: record(`output:${row.outputId}.generatedBy`, row.by),
    superseded:
      row.superseded === true
        ? (() => {
            displays.push(line(`output:${row.outputId}.superseded`, SUPERSEDED_TEXT));
            return `output:${row.outputId}.superseded`;
          })()
        : null,
  }));
  return {
    ...envelope(PROJECT, displays, { demo: options.demo === true, name: 'TEST project for reports' }),
    view: { state: options.state ?? (rows.length === 0 ? 'none_generated' : 'listed'), rows: reportRows, page: { hasPrevious: options.hasPrevious === true, hasNext: options.hasNext === true } },
  } as ReportsResponse;
}
