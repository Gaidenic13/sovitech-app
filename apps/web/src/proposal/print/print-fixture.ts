/**
 * Test support: the print view of a stored proposal (`proposals.print`) in the contract's shapes, with TEST values only
 * (TEST words and TEST digits; no figure of the mockups, of the company or of a real building), for the print page's
 * component tests (../ProposalPrintPage.test.tsx) and the guardrail cases that print it (tests/guardrails/G10-5,
 * tests/guardrails/_support/print.tsx). Never imported by the app.
 *
 * It holds every kind of thing a printed proposal shows: an investment figure as a range at its stage (the stage label
 * among its lines, as the server derives it from stored records), an output with an estimated range and a provisional
 * line, outputs that read "Not available yet" naming what is missing, the indicators, the scope with Fire Safety's
 * monitoring-only sentence and a system not in scope (the investment's exclusions are the excluded systems' decisions,
 * as the view-model serves them: G10-7), rule 11's sentences among the life-safety values as the view-model lists them
 * (each also printed elsewhere), the basis (the scope decisions, a value whose excerpt was erased and one whose excerpt
 * is kept, each with what it measures), the open items (a count, an item for the owner, a "SOVITECH will check" line),
 * and, where asked, an AI-drafted paragraph, "Still reading" and a headline whose investment figure is an incomplete
 * total (V-1: the head then shows the "Incomplete" line with its stage label, no figure). The generation date reads
 * "D MMM YYYY, HH:MM", as the API serves it. The badge labels are TEST labels (the web never holds 2.8's words; the
 * server serves them).
 */
import type { DisplayObject, Line, ProposalOutput, ProposalPrintResponse } from '@sovitech/view-model/browser';

export const PRINT_PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9f';
export const PRINT_SNAPSHOT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e01';
export const PRINT_EARLIER_SNAPSHOT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e00';
export const PRINT_DOCUMENT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8ed0';
export const PRINT_BUILDING = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8eb0';
const HASH = 'a'.repeat(64);
const ERASED_HASH = 'b'.repeat(64);

const P = `proposal:${PRINT_SNAPSHOT}`;

/** The value ids the fixture serves, for the tests' assertions. */
export const PRINT_IDS = {
  projectName: `project:${PRINT_PROJECT}.name`,
  generatedOn: `${P}.generatedOn`,
  earlierGeneratedOn: `proposal:${PRINT_EARLIER_SNAPSHOT}.generatedOn`,
  capexIndicative: `${P}.outputs.capex.indicativeRange`,
  capexPreliminary: `${P}.outputs.capex.preliminaryEstimate`,
  capexStage: `${P}.outputs.capex.preliminaryEstimate.stage`,
  headlineIncomplete: `${P}.headline.investment`,
  /** The decision of the system not in scope (Water), the investment's one exclusion. */
  exclusion: `${P}.inputs.project.scope.water`,
  pointsHardware: `${P}.outputs.points.hardwareIo`,
  pointsIntegration: `${P}.outputs.points.integration`,
  pointsVirtual: `${P}.outputs.points.virtual`,
  interfacePoints: `${P}.lifeSafety.interfacePoints`,
  energy: `${P}.outputs.energy.annualConsumption`,
  savings: `${P}.outputs.savings.annualEnergy`,
  measures: `${P}.outputs.measures.priorityOrder`,
  operatingCost: `${P}.indicators.operating_cost`,
  payback: `${P}.indicators.payback`,
  npv: `${P}.indicators.npv`,
  irr: `${P}.indicators.irr`,
  scopeHvac: `${P}.inputs.project.scope.hvac`,
  scopeFire: `${P}.inputs.project.scope.fire_safety`,
  scopeWater: `${P}.inputs.project.scope.water`,
  fireSentence: `${P}.lifeSafety.fire_safety`,
  area: `${P}.inputs.building.grossFloorArea`,
  floors: `${P}.inputs.building.floors`,
  drafted: `${P}.drafted.summary`,
  ownerCount: `project:${PRINT_PROJECT}.openItems.owner`,
  ownerItem: `building:${PRINT_BUILDING}.grossFloorArea`,
  engineerLine: `project:${PRINT_PROJECT}.openItems.engineer.equipmentClassifications`,
  stillReading: `project:${PRINT_PROJECT}.documents.stillReading`,
} as const;

/** The TEST words the tests look for. */
export const PRINT_TEXT = {
  projectName: 'TEST Print Project',
  generatedOn: '5 Oct 2026, 10:00',
  demoLine: 'TEST demo line for printing',
  estimatedBadge: 'TEST estimated badge',
  providedBadge: 'TEST provided badge',
  documentBadge: 'TEST document badge',
  stageLabel: 'TEST preliminary estimate stage label',
  capexRange: 'TEST 1111 to 2222 EUR',
  capexSource: 'TEST calculated source line',
  capexMethod: 'TEST method line: formula TEST-capex, version TEST-1',
  capexBasis: 'TEST basis line: area and systems',
  pointsRange: 'TEST about 3300 (3200 to 3400) points',
  pointsProvisional: 'TEST provisional line',
  capexMissing: 'Not available yet: TEST cost ranges',
  interfacePoints: 'TEST interface points line: a fire-alarm input and a fire-mode status per affected panel',
  fireSentence: 'TEST monitoring only sentence',
  excerptKept: 'TEST excerpt kept as stored',
  erased: '[erased]',
  areaText: 'TEST 4321 m²',
  floorsText: 'TEST P+4E',
  ownerCount: 'TEST 2 things for you to check',
  engineerLine: 'TEST SOVITECH will check line',
  stillReading: 'TEST still reading 1 file',
  draftedProse: 'TEST drafted prose before the value ',
  scopeHvacName: 'TEST system in scope: HVAC',
  scopeFireName: 'TEST system in scope: Fire Safety',
  scopeWaterName: 'TEST system in scope: Water',
  notInScope: 'TEST not in scope',
  incompleteLine: 'TEST Incomplete: excludes TEST item A, TEST item B',
} as const;

const badge = (id: NonNullable<DisplayObject['badge']>['id'], label: string) => ({ id, label });
const line = (id: string, kind: Line['kind'], text: string): Line => ({ id, kind, text });

/** An output's "Not available yet" line naming what is missing, as the resolver serves it (a line display, no badge, no action on paper). */
function notAvailable(valueId: string, what: string): DisplayObject {
  return { valueId, kind: 'line', text: `Not available yet: ${what}`, shape: 'missing', missing: 'not_available_yet' };
}

function lineDisplay(valueId: string, text: string, kind: Line['kind'] = 'status_line', id = 'test_line'): DisplayObject {
  return { valueId, kind: 'line', text, shape: 'value', lines: [line(id, kind, text)] };
}

const output = (name: string, display: string, availability: ProposalOutput['availability'], price: ProposalOutput['price'] = null): ProposalOutput => ({
  output: name,
  formula: { id: `formula.${name}`, version: 'TEST-1' },
  display,
  availability,
  incomplete: false,
  outOfDate: false,
  price,
});

export interface PrintFixtureOptions {
  readonly demo?: boolean;
  readonly latest?: boolean;
  readonly drafted?: boolean;
  readonly stillReading?: boolean;
  /** V-1: the headline's investment output is an incomplete total; the head's price display is its "Incomplete" line, carrying the stage label. */
  readonly incompleteHeadline?: boolean;
}

/** The print view of the TEST stored proposal. */
export function printResponse(options: PrintFixtureOptions = {}): ProposalPrintResponse {
  const demo = options.demo === true;
  const incomplete = options.incompleteHeadline === true;
  const displays: DisplayObject[] = [
    { valueId: PRINT_IDS.projectName, kind: 'field', text: PRINT_TEXT.projectName, shape: 'value', badge: badge('provided_by_you', PRINT_TEXT.providedBadge) },
    { valueId: PRINT_IDS.generatedOn, kind: 'record', text: PRINT_TEXT.generatedOn, parts: [PRINT_TEXT.generatedOn], shape: 'value' },
    { valueId: PRINT_IDS.earlierGeneratedOn, kind: 'record', text: '4 Oct 2026, 09:30', parts: ['4 Oct 2026, 09:30'], shape: 'value' },
    notAvailable(PRINT_IDS.capexIndicative, 'TEST cost ranges'),
    {
      valueId: PRINT_IDS.capexPreliminary,
      kind: 'field',
      text: PRINT_TEXT.capexRange,
      shape: 'range',
      badge: badge('estimated', PRINT_TEXT.estimatedBadge),
      sourceLine: line('calculated', 'source_line', PRINT_TEXT.capexSource),
      lines: [
        line('preliminary_investment_estimate', 'stage_label', PRINT_TEXT.stageLabel),
        ...(incomplete ? [line('incomplete_exclusions', 'status_line', PRINT_TEXT.incompleteLine)] : []),
        line('based_on', 'rule_line', PRINT_TEXT.capexBasis),
        line('method', 'rule_line', PRINT_TEXT.capexMethod),
      ],
    },
    lineDisplay(PRINT_IDS.capexStage, PRINT_TEXT.stageLabel, 'stage_label', 'preliminary_investment_estimate'),
    {
      valueId: PRINT_IDS.pointsHardware,
      kind: 'field',
      text: PRINT_TEXT.pointsRange,
      shape: 'range',
      badge: badge('estimated', PRINT_TEXT.estimatedBadge),
      sourceLine: line('estimated', 'source_line', 'TEST estimated from TEST point templates'),
      lines: [line('provisional', 'status_line', PRINT_TEXT.pointsProvisional)],
    },
    notAvailable(PRINT_IDS.pointsIntegration, 'TEST point templates'),
    notAvailable(PRINT_IDS.pointsVirtual, 'TEST point templates'),
    lineDisplay(PRINT_IDS.interfacePoints, PRINT_TEXT.interfacePoints, 'rule_line', 'interface_points'),
    notAvailable(PRINT_IDS.energy, 'TEST climate data'),
    notAvailable(PRINT_IDS.savings, 'TEST savings factors'),
    notAvailable(PRINT_IDS.measures, 'TEST function set'),
    notAvailable(PRINT_IDS.operatingCost, 'TEST open question on annual amounts'),
    notAvailable(PRINT_IDS.payback, 'TEST duration unit'),
    notAvailable(PRINT_IDS.npv, 'TEST duration unit'),
    notAvailable(PRINT_IDS.irr, 'TEST duration unit'),
    {
      valueId: PRINT_IDS.scopeHvac,
      kind: 'field',
      text: 'TEST in scope',
      shape: 'value',
      measure: { label: PRINT_TEXT.scopeHvacName },
      badge: badge('provided_by_you', PRINT_TEXT.providedBadge),
      sourceLine: line('owner', 'source_line', 'TEST entered by you'),
    },
    {
      valueId: PRINT_IDS.scopeFire,
      kind: 'field',
      text: 'TEST in scope, monitoring only',
      shape: 'value',
      measure: { label: PRINT_TEXT.scopeFireName },
      badge: badge('provided_by_you', PRINT_TEXT.providedBadge),
      sourceLine: line('owner', 'source_line', 'TEST entered by you'),
    },
    {
      valueId: PRINT_IDS.scopeWater,
      kind: 'field',
      text: PRINT_TEXT.notInScope,
      shape: 'value',
      measure: { label: PRINT_TEXT.scopeWaterName },
      badge: badge('provided_by_you', PRINT_TEXT.providedBadge),
      sourceLine: line('owner', 'source_line', 'TEST entered by you'),
    },
    lineDisplay(PRINT_IDS.fireSentence, PRINT_TEXT.fireSentence, 'generated_sentence', 'fire_safety_monitoring'),
    {
      valueId: PRINT_IDS.area,
      kind: 'field',
      text: PRINT_TEXT.areaText,
      shape: 'value',
      measure: { label: 'TEST gross floor area', unit: { code: 'm2', symbol: 'm²' } },
      badge: badge('from_document', PRINT_TEXT.documentBadge),
      sourceLine: line('document', 'source_line', 'TEST found in TEST-plan.pdf, page 1'),
      evidence: [{ documentId: PRINT_DOCUMENT, contentHash: HASH, excerpt: PRINT_TEXT.excerptKept }],
    },
    {
      valueId: PRINT_IDS.floors,
      kind: 'field',
      text: PRINT_TEXT.floorsText,
      shape: 'value',
      measure: { label: 'TEST floors' },
      badge: badge('from_document', PRINT_TEXT.documentBadge),
      sourceLine: line('document', 'source_line', 'TEST found in TEST-erased.pdf'),
      evidence: [{ documentId: PRINT_DOCUMENT, contentHash: ERASED_HASH, excerpt: PRINT_TEXT.erased }],
    },
    lineDisplay(PRINT_IDS.ownerCount, PRINT_TEXT.ownerCount, 'rule_line', 'owner_items'),
    {
      valueId: PRINT_IDS.ownerItem,
      kind: 'field',
      text: 'TEST not provided yet',
      shape: 'missing',
      missing: 'not_provided_yet',
      measure: { label: 'TEST gross floor area', unit: { code: 'm2', symbol: 'm²' } },
      badge: badge('not_provided_yet', 'TEST not provided badge'),
    },
    lineDisplay(PRINT_IDS.engineerLine, PRINT_TEXT.engineerLine, 'status_line', 'sovitech_will_check'),
  ];
  if (options.stillReading === true) displays.push(lineDisplay(PRINT_IDS.stillReading, PRINT_TEXT.stillReading, 'rule_line', 'still_reading'));
  // V-1: the head's price display of an incomplete total, its "Incomplete" line carrying the stage label (no figure).
  if (incomplete) {
    displays.push({ valueId: PRINT_IDS.headlineIncomplete, kind: 'line', text: PRINT_TEXT.incompleteLine, shape: 'value', lines: [line('preliminary_investment_estimate', 'stage_label', PRINT_TEXT.stageLabel)] });
  }

  const capexPrice = {
    figure: PRINT_IDS.capexPreliminary,
    stage: PRINT_IDS.capexStage,
    stageId: 'preliminary_investment_estimate' as const,
    quotationRecordId: null,
    superseded: null,
  };
  const indicativePrice = { figure: PRINT_IDS.capexIndicative, stage: null, stageId: null, quotationRecordId: null, superseded: null };
  const headlinePrice = incomplete ? { ...capexPrice, figure: PRINT_IDS.headlineIncomplete } : capexPrice;
  const openItems = {
    count: PRINT_IDS.ownerCount,
    items: [{ itemId: 'TEST-item', reason: 'first_estimate_missing' as const, concerns: PRINT_IDS.ownerItem }],
    more: null,
    sovitechWillCheck: [PRINT_IDS.engineerLine],
  };
  const versions = [
    { snapshotId: PRINT_SNAPSHOT, generatedOn: PRINT_IDS.generatedOn },
    { snapshotId: PRINT_EARLIER_SNAPSHOT, generatedOn: PRINT_IDS.earlierGeneratedOn },
  ];
  return {
    asOf: '2026-10-05T10:00:00.000Z',
    project: {
      projectId: PRINT_PROJECT,
      name: PRINT_IDS.projectName,
      isDemo: demo,
      demoLine: demo ? { id: 'demo_data', kind: 'demo_line', text: PRINT_TEXT.demoLine } : null,
    },
    displayObjects: displays,
    view: {
      proposal: {
        snapshotId: PRINT_SNAPSHOT,
        generatedOn: PRINT_IDS.generatedOn,
        latest: options.latest !== false,
        headline: {
          investment: { output: 'capex.preliminaryEstimate', price: headlinePrice },
          openItems,
          stillReading: options.stillReading === true ? PRINT_IDS.stillReading : null,
        },
        investment: {
          outputs: [
            output('capex.indicativeRange', PRINT_IDS.capexIndicative, 'not_available_yet', indicativePrice),
            { ...output('capex.preliminaryEstimate', PRINT_IDS.capexPreliminary, 'figure', capexPrice), incomplete },
          ],
          exclusions: [PRINT_IDS.scopeWater],
        },
        points: {
          outputs: [
            output('points.hardwareIo', PRINT_IDS.pointsHardware, 'figure'),
            output('points.integration', PRINT_IDS.pointsIntegration, 'not_available_yet'),
            output('points.virtual', PRINT_IDS.pointsVirtual, 'not_available_yet'),
          ],
          interfacePoints: PRINT_IDS.interfacePoints,
        },
        energy: {
          outputs: [output('energy.annualConsumption', PRINT_IDS.energy, 'not_available_yet'), output('savings.annualEnergy', PRINT_IDS.savings, 'not_available_yet')],
        },
        indicators: [
          { indicator: 'operating_cost', display: PRINT_IDS.operatingCost },
          { indicator: 'payback', display: PRINT_IDS.payback },
          { indicator: 'npv', display: PRINT_IDS.npv },
          { indicator: 'irr', display: PRINT_IDS.irr },
        ],
        measures: { outputs: [output('measures.priorityOrder', PRINT_IDS.measures, 'not_available_yet')] },
        scope: {
          systems: [
            { systemId: 'hvac', decision: PRINT_IDS.scopeHvac, lifeSafety: false, sentence: null },
            { systemId: 'fire_safety', decision: PRINT_IDS.scopeFire, lifeSafety: true, sentence: PRINT_IDS.fireSentence },
            { systemId: 'water', decision: PRINT_IDS.scopeWater, lifeSafety: false, sentence: null },
          ],
          exclusions: ['water'],
        },
        lifeSafety: [PRINT_IDS.fireSentence, PRINT_IDS.interfacePoints],
        basis: [PRINT_IDS.area, PRINT_IDS.scopeHvac, PRINT_IDS.scopeFire, PRINT_IDS.scopeWater, PRINT_IDS.floors],
        whatWeStillNeed: openItems,
        drafted: options.drafted === true ? [{ slot: 'summary', segments: [{ kind: 'prose', text: PRINT_TEXT.draftedProse }, { kind: 'value', valueId: PRINT_IDS.area }] }] : [],
        versions,
      },
      cover: { projectName: PRINT_IDS.projectName },
      appendix: {
        values: [
          PRINT_IDS.capexIndicative,
          PRINT_IDS.capexPreliminary,
          PRINT_IDS.pointsHardware,
          PRINT_IDS.pointsIntegration,
          PRINT_IDS.pointsVirtual,
          PRINT_IDS.energy,
          PRINT_IDS.savings,
          PRINT_IDS.measures,
          PRINT_IDS.operatingCost,
          PRINT_IDS.payback,
          PRINT_IDS.npv,
          PRINT_IDS.irr,
          PRINT_IDS.area,
          PRINT_IDS.scopeHvac,
          PRINT_IDS.scopeFire,
          PRINT_IDS.scopeWater,
          PRINT_IDS.floors,
        ],
        openItems,
      },
    },
  };
}
