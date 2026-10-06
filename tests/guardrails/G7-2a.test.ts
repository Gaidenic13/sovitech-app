/**
 * G7-2a (rule 7, the `first_estimate` row: "If it is still missing, the output falls back to a stage 1 Indicative range
 * where the registry allows one"; rule 10, stage 1 "Benchmarks only, before documents are analysed or when
 * first-estimate data is missing"): "The area is skipped, the owner reaches step 8 and skips it again. The registry
 * allows an Indicative range for area." → "Asked inline once, then an Indicative range".
 *
 * The "then" half, on the stored proposal (phase 5's view-model with the engine's `headlineOutputOf` and
 * `priceStageOf`): the area skipped twice (once on step 3's Continue, once at step 8's inline ask: "asked inline once" is
 * the question engine's, proven through the API by G7-10 and G7-11), a TEST registry whose stage 1 formula runs without
 * the area (its `unknownPolicy` is not `refuse` for it) and whose TEST cost ranges are approved (no closed gate holds
 * them), so the TEST engine produced a stage 1 figure and no stage 2 one: the headline carries the stage 1 output,
 * "Indicative range", as a range with its badge; stage 2 reads "Not available yet", naming the area with its Add action.
 * With the production registry (no Indicative range allowed while `dataset-cost-ranges` is closed) the headline stays
 * stage 2's line: G7-2b.
 */
import { describe, expect, it } from 'vitest';
import { productionRegistry } from '@sovitech/registry';
import { proposalStage, proposalView, type IntakeField } from '@sovitech/view-model/server';
import { testEvents } from './_support/builders';
import { allGatesClosed, BUILDING_ID, displayById, productionRows, testEstimate, testProposalFields, testProposalInput } from './_support/proposal';
import { uuid } from './_support/view-model';

const AREA = 'building.grossFloorArea';

describe('G7-2a · rule 7 · rule 10: the area skipped twice, the registry allowing an Indicative range', () => {
  it('G7-2a · US-INTAKE-17 · R-112 · R-127: the headline carries "Indicative range" as a range; stage 2 names the area with its Add action', () => {
    const skips = [
      { subjectId: BUILDING_ID, fieldKey: AREA, type: 'skipped' as const, by: uuid(80), role: 'owner' as const, at: '2026-09-30T09:03:00.000000Z' },
      { subjectId: BUILDING_ID, fieldKey: AREA, type: 'skipped' as const, by: uuid(80), role: 'owner' as const, at: '2026-09-30T09:08:00.000000Z', reason: 'generate_without_it' },
    ];
    const fields = testProposalFields({ events: testEvents({ field: skips }) });
    expect(fields.find((field) => field.field.key === AREA)?.state.state).toBe('skipped');

    // The TEST registry: the stage 1 formula ranges over what it lacks instead of refusing; its cost ranges approved.
    const formulas = productionRegistry.formulas.map((formula) => (formula.id === 'capexIndicativeRange' ? { ...formula, unknownPolicy: 'range_over_options' as const } : formula));
    const gates = new Set([...allGatesClosed()].filter((gate) => gate !== 'dataset-cost-ranges'));
    const intake: IntakeField[] = fields.map((field) => ({ field: field.field, subjectId: field.subjectId, state: field.state, candidates: field.candidates, skippedAt: field.field.key === AREA ? skips.map((skip) => skip.at) : [] }));
    const fallbackAllowed = proposalStage({ fields: intake, closedGates: gates, formulas }) === 'indicative_range';
    expect(fallbackAllowed).toBe(true);

    const figure = testEstimate(270, { output: 'capex.indicativeRange', value: 61000, low: 48000, high: 79000, unit: 'EUR' });
    const rows = productionRows(fields).rows.map((row) => {
      if (row.output === 'capex.indicativeRange') return { ...row, candidateId: figure.id, missing: [], incomplete: false };
      if (row.output === 'capex.preliminaryEstimate') return { ...row, missing: [`input:${BUILDING_ID}:${AREA}:skipped`] };
      return row;
    });
    const built = proposalView(testProposalInput({ fields, rows, snapshotCandidates: [figure], fallbackAllowed }));
    const headline = built.view.headline.investment;
    expect(headline.output).toBe('capex.indicativeRange');
    expect(headline.price.stageId).toBe('indicative_range');
    expect(displayById(built.displayObjects, headline.price.stage ?? '').text).toBe('Indicative range');
    const shown = displayById(built.displayObjects, headline.price.figure);
    expect(shown.shape).toBe('range');
    expect(shown.text).toBe('about 61,000 EUR (48,000 to 79,000 EUR)');
    expect(shown.badge?.id).toBe('estimated');

    const stage2 = built.view.investment.outputs.find((output) => output.output === 'capex.preliminaryEstimate');
    expect(stage2?.price?.stage).toBeNull();
    const line = displayById(built.displayObjects, stage2?.display ?? '');
    expect(line.text).toContain('gross floor area');
    expect(line.actions).toContainEqual({ kind: 'add', field: { subjectId: BUILDING_ID, fieldKey: AREA }, label: 'Add gross floor area', step: 8 });
  });
});
