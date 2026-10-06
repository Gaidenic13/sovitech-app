/** The stage of an investment figure from stored records (rule 10 "Stage 3 is derived, not passed"; docs/adr/0048). */
import { describe, expect, test } from 'vitest';
import { OUTPUT } from '@sovitech/registry';
import type { SnapshotOutputRow } from './snapshot';
import { headlineOutputOf, priceStageOf } from './stage';
import type { StoredQuotationRecord } from './staleness';

const row = (output: string, figure: boolean, incomplete = false): SnapshotOutputRow => ({ output, formula: 'TEST-f@1.0.0', candidateId: figure ? `test-${output}` : null, missing: figure ? [] : ['dataset:TEST-d'], incomplete });
const record = (id: string, snapshotId: string, issuedOn: string): StoredQuotationRecord => ({
  id,
  recordNumber: `TEST-${id}`,
  reviewingEngineerId: 'test-engineer',
  commercialReviewerId: 'test-commercial-reviewer',
  issuedOn,
  validUntil: '2026-12-31',
  currency: 'EUR',
  vatBasis: 'TEST',
  proposalSnapshotId: snapshotId,
  inputs: [],
});

describe('ADR 0048 · the price stage', () => {
  test('no figure, or not an investment output: no stage', () => {
    expect(priceStageOf({ output: row(OUTPUT.preliminaryEstimate, false), records: [], snapshotId: 'test-s' }).stage).toBeNull();
    expect(priceStageOf({ output: row(OUTPUT.pointsHardwareIo, true), records: [], snapshotId: 'test-s' }).stage).toBeNull();
  });

  test('the latest current record gives "Formal quotation" to a complete stage 2 figure only', () => {
    const records = [
      { record: record('test-q1', 'test-s', '2026-09-01'), standing: { state: 'current' as const } },
      { record: record('test-q2', 'test-s', '2026-09-20'), standing: { state: 'current' as const } },
    ];
    expect(priceStageOf({ output: row(OUTPUT.preliminaryEstimate, true), records, snapshotId: 'test-s' })).toEqual({ stage: 'formal_quotation', quotationRecordId: 'test-q2', superseded: null });
    expect(priceStageOf({ output: row(OUTPUT.preliminaryEstimate, true, true), records, snapshotId: 'test-s' }).stage).toBe('preliminary_investment_estimate');
    expect(priceStageOf({ output: row(OUTPUT.indicativeRange, true), records, snapshotId: 'test-s' }).stage).toBe('indicative_range');
  });

  test('a current record beats a superseded one; with only superseded records, the latest gives its date', () => {
    const superseded = { record: record('test-q1', 'test-s', '2026-09-01'), standing: { state: 'superseded' as const, changedOn: '2026-09-10T09:00:00.000Z' } };
    const later = { record: record('test-q3', 'test-s', '2026-09-05'), standing: { state: 'superseded' as const, changedOn: '2026-09-12T09:00:00.000Z' } };
    expect(priceStageOf({ output: row(OUTPUT.preliminaryEstimate, true), records: [superseded, later], snapshotId: 'test-s' })).toEqual({
      stage: 'preliminary_investment_estimate',
      quotationRecordId: null,
      superseded: { recordId: 'test-q3', changedOn: '2026-09-12T09:00:00.000Z' },
    });
    const current = { record: record('test-q2', 'test-s', '2026-09-03'), standing: { state: 'current' as const } };
    expect(priceStageOf({ output: row(OUTPUT.preliminaryEstimate, true), records: [superseded, current], snapshotId: 'test-s' }).stage).toBe('formal_quotation');
  });

  test('V-4 · rule 10 · stage 1, and an incomplete stage 2 total, never carry "Superseded": no quotation covers them', () => {
    const superseded = { record: record('test-q1', 'test-s', '2026-09-01'), standing: { state: 'superseded' as const, changedOn: '2026-09-10T09:00:00.000Z' } };
    expect(priceStageOf({ output: row(OUTPUT.indicativeRange, true), records: [superseded], snapshotId: 'test-s' })).toEqual({ stage: 'indicative_range', quotationRecordId: null, superseded: null });
    expect(priceStageOf({ output: row(OUTPUT.preliminaryEstimate, true, true), records: [superseded], snapshotId: 'test-s' })).toEqual({
      stage: 'preliminary_investment_estimate',
      quotationRecordId: null,
      superseded: null,
    });
    // Control: the complete stage 2 figure carries it.
    expect(priceStageOf({ output: row(OUTPUT.preliminaryEstimate, true), records: [superseded], snapshotId: 'test-s' }).superseded).toEqual({ recordId: 'test-q1', changedOn: '2026-09-10T09:00:00.000Z' });
  });

  test('A-4 · rule 10 · a current record over an out-of-date figure: stage 2 with "Superseded" on the later of the change and the issue day, never "Formal quotation"', () => {
    const current = [{ record: record('test-q2', 'test-s', '2026-09-20'), standing: { state: 'current' as const } }];
    const stale = (changedOn: string | null): SnapshotOutputRow => ({ ...row(OUTPUT.preliminaryEstimate, true), outOfDate: { changedOn } });
    expect(priceStageOf({ output: stale('2026-09-27T09:00:00.000Z'), records: current, snapshotId: 'test-s' })).toEqual({
      stage: 'preliminary_investment_estimate',
      quotationRecordId: null,
      superseded: { recordId: 'test-q2', changedOn: '2026-09-27T09:00:00.000Z' },
    });
    // No dated record of the change: the issue day, as a timestamp.
    expect(priceStageOf({ output: stale(null), records: current, snapshotId: 'test-s' }).superseded).toEqual({ recordId: 'test-q2', changedOn: '2026-09-20T00:00:00Z' });
    // A change dated before the issue day reads the issue day (the later of the two).
    expect(priceStageOf({ output: stale('2026-09-19T09:00:00.000Z'), records: current, snapshotId: 'test-s' }).superseded).toEqual({ recordId: 'test-q2', changedOn: '2026-09-20T00:00:00Z' });
    // Stage 1 out of date keeps its own label and no "Superseded"; a row with `outOfDate: null` behaves as before.
    expect(priceStageOf({ output: { ...row(OUTPUT.indicativeRange, true), outOfDate: { changedOn: null } }, records: current, snapshotId: 'test-s' })).toEqual({ stage: 'indicative_range', quotationRecordId: null, superseded: null });
    expect(priceStageOf({ output: { ...row(OUTPUT.preliminaryEstimate, true), outOfDate: null }, records: current, snapshotId: 'test-s' })).toEqual({ stage: 'formal_quotation', quotationRecordId: 'test-q2', superseded: null });
  });

  test('rule 7 · the headline: stage 2 when complete, else stage 1 where the fallback is allowed and complete, else stage 2', () => {
    expect(headlineOutputOf([row(OUTPUT.preliminaryEstimate, true), row(OUTPUT.indicativeRange, true)], true)).toBe(OUTPUT.preliminaryEstimate);
    expect(headlineOutputOf([row(OUTPUT.preliminaryEstimate, false), row(OUTPUT.indicativeRange, true)], true)).toBe(OUTPUT.indicativeRange);
    expect(headlineOutputOf([row(OUTPUT.preliminaryEstimate, false), row(OUTPUT.indicativeRange, true)], false)).toBe(OUTPUT.preliminaryEstimate);
    expect(headlineOutputOf([row(OUTPUT.preliminaryEstimate, false), row(OUTPUT.indicativeRange, false)], true)).toBe(OUTPUT.preliminaryEstimate);
    expect(headlineOutputOf([], true)).toBe(OUTPUT.preliminaryEstimate);
  });
});
