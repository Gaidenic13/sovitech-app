/**
 * In-memory TEST builders for the Metrics cases (phase 6; docs/adr/0052; the build log, phase 6, "Cases"): a TEST
 * project whose fields are the production registry's (./proposal.ts `testProposalFields`), the engine's TEST catalogue
 * with the TEST chart series (packages/engine/test-formulas/series.ts) run over it with the TEST datasets, and the
 * stored version that run would give, read as the API reads it (`ProposalBuildInput`). The TEST catalogue runs only
 * inside the test runner (the engine refuses it elsewhere: G1-16); every value is visibly synthetic; nothing is stored.
 */
import type { Candidate } from '@sovitech/domain';
import { fieldKeyOf, headlineOutputOf, runEngine, snapshotRecordOf, type EngineField, type EngineRun, type FormulaCatalogue, type SnapshotRecord } from '@sovitech/engine';
import { FIELD, SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import type { PlotInput, ProposalBuildInput, ProposalField } from '@sovitech/view-model/server';
import { testDatasetAccess } from '../../../packages/engine/test-formulas/datasets';
import { testCatalogue } from '../../../packages/engine/test-formulas/engine';
import { testSeriesFieldDefinition } from '../../../packages/engine/test-formulas/series';
import { testEvents } from './builders';
import { BUILDING_ID, ENGINE_ACCOUNT, GENERATED_AT, PROJECT_ID, ownerAnswer, testProposalFields, testProposalInput } from './proposal';
import { uuid } from './view-model';

/** An owner's scope decision on a system, or none (Unknown). */
export type ScopeChoice = 'include' | 'exclude' | 'unknown';

/** The TEST project of a Metrics case: its building type (none: Unknown) and its scope decisions (a system not named: exclude). */
export interface MetricsProject {
  readonly buildingType?: string;
  readonly scope: Readonly<Partial<Record<string, ScopeChoice>>>;
}

/** The TEST catalogue of the Metrics cases: the six mirrors (so the stored proposal's own outputs exist) and the two TEST series formulas. */
export function metricsCatalogue(): FormulaCatalogue {
  return testCatalogue({ mirrored: true, extra: ['TEST-capexBySystem', 'TEST-cashFlow'] });
}

/** The TEST project's fields, derived now, with the owner's answers on the building type and the scope decisions. */
export function metricsFields(project: MetricsProject): ProposalField[] {
  const answers = [
    ...(project.buildingType === undefined ? [] : [ownerAnswer(301, FIELD.buildingType, { choice: project.buildingType })]),
    ...SYSTEMS.flatMap((system, index) => {
      const choice = project.scope[system.id] ?? 'exclude';
      return choice === 'unknown' ? [] : [ownerAnswer(310 + index, scopeFieldKey(system.id), { choice })];
    }),
  ];
  return testProposalFields({ candidates: answers.map((answer) => answer.candidate), events: testEvents({ candidate: answers.map((answer) => answer.event) }) });
}

/** The TEST catalogue run over the TEST project's fields, as Generate runs it, and the snapshot it would store. */
export function metricsRun(fields: readonly ProposalField[], catalogue: FormulaCatalogue = metricsCatalogue()): { readonly run: EngineRun; readonly record: SnapshotRecord } {
  const engineFields = new Map<string, EngineField>(fields.map((field) => [fieldKeyOf(field.subjectId, field.field.key), { definition: field.field, subjectId: field.subjectId, state: field.state, candidates: field.candidates }]));
  let ids = 500;
  const run = runEngine(
    catalogue,
    {
      projectId: PROJECT_ID,
      fields: engineFields,
      subjectOf: (key) => fields.find((field) => field.field.key === key)?.subjectId ?? (testSeriesFieldDefinition(key)?.subject === 'building' ? BUILDING_ID : testSeriesFieldDefinition(key) === undefined ? undefined : PROJECT_ID),
      closedGates: new Set(),
      datasets: testDatasetAccess(),
      author: ENGINE_ACCOUNT,
      fieldDefinition: testSeriesFieldDefinition,
    },
    { newId: () => uuid((ids += 1)), at: GENERATED_AT },
  );
  return { run, record: snapshotRecordOf(run, []) };
}

/** The candidates a run produced, as the store would hold them (written by the engine's account, as the system). */
export function producedCandidates(run: EngineRun): Candidate[] {
  return run.outputs.flatMap((output) => (output.kind === 'not_available' ? [] : [{ ...output.candidate, createdAt: GENERATED_AT, authorRole: 'system' as const }]));
}

/** The stored version of the TEST project's proposal generated with the TEST series catalogue, read as the API reads it. */
export function metricsProposalInput(project: MetricsProject): { readonly input: ProposalBuildInput; readonly run: EngineRun; readonly record: SnapshotRecord } {
  const catalogue = metricsCatalogue();
  const fields = metricsFields(project);
  const { run, record } = metricsRun(fields, catalogue);
  const used = fields.flatMap((field) => field.candidates.filter((candidate) => record.candidateIds.includes(candidate.id)));
  const base = testProposalInput({ fields, rows: record.outputs, snapshotCandidates: [...used, ...producedCandidates(run)] });
  const input: ProposalBuildInput = {
    ...base,
    snapshot: { ...base.snapshot, inputsHash: record.inputsHash },
    catalogue,
    headlineOutput: headlineOutputOf(record.outputs, false),
  };
  return { input, run, record };
}

/**
 * The numbers a figure's label shows, as a chart would place them (phase 6 part B, A-5 and A-7): "about <value> (<low>
 * to <high>)" or one exact value, read from the text the owner sees (TEST prefixes, the currency and the grouping
 * commas left out). Refuses a text that shows no figure.
 */
export function labelledPlotInput(text: string): PlotInput {
  const plain = text.replace(/TEST /gu, '').replace(/\s*\bEUR\b/gu, '').replace(/,/gu, '').replace(/\s+/gu, ' ').trim();
  const number = '(-?\\d+(?:\\.\\d+)?)';
  const estimate = new RegExp(`^about ${number} \\(${number} to ${number}\\)$`, 'u').exec(plain);
  if (estimate !== null) return { kind: 'estimate', value: Number(estimate[1]), low: Number(estimate[2]), high: Number(estimate[3]) };
  const exactValue = new RegExp(`^${number}$`, 'u').exec(plain);
  if (exactValue !== null) return { kind: 'value', value: Number(exactValue[1]) };
  throw new Error(`no labelled figure in "${text}"`);
}
