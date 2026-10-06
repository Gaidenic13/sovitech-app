/**
 * TEST body of `TEST-pointsEstimate@1.0.0`, the mirror of `pointsEstimate@1`: points by type, hardware I/O,
 * integration and virtual, each its own output and never summed into one (rule 8 "Points"; G9-3), estimated (2.1
 * "Points from per-room tables ... are always estimated"; G9-4). TEST method: the TEST counts (../points.ts) times the
 * TEST spread, a range over the options of every input ranged over (`range_over_options`), and over the values of a
 * field in conflict (rule 4).
 */
import type { BodyOutput, FormulaBody } from '../../src/catalogue';
import { multiply } from '../../src/interval';
import { entriesOf, notAvailable, tablePercentRange, testEstimate } from '../engine-lib';
import { TEST_DATASET_IDS } from '../datasets';
import { testPointCounts } from '../points';

const OUTPUTS = { hardwareIo: ['points.hardwareIo', 'hardware_io'], integration: ['points.integration', 'integration'], virtual: ['points.virtual', 'virtual'] } as const;

export const body: FormulaBody = (inputs) => {
  const counted = testPointCounts(inputs);
  if ('missing' in counted) return Object.fromEntries(Object.values(OUTPUTS).map(([output]) => [output, notAvailable(...counted.missing)]));
  const spread = tablePercentRange(entriesOf(inputs, TEST_DATASET_IDS.pointTemplates), ['spreadPercent'], 'spreadPercent');
  const answer = (type: keyof typeof OUTPUTS): BodyOutput => testEstimate(multiply(counted.counts[type], spread), 'count', OUTPUTS[type][1]);
  return { 'points.hardwareIo': answer('hardwareIo'), 'points.integration': answer('integration'), 'points.virtual': answer('virtual') };
};
