/**
 * G8-4 (docs/guardrails.md section 7; 2.7 "Units"; rule 8 "Units come from the registry, grouped by dimension").
 * Situation: 1,250,000 kW returned for annual energy.
 * Expected: rejected, because the dimension does not match.
 *
 * The annual-energy field is a TEST registry entry measured in kWh/a (energy
 * over time, rule 8's table). The value is read from its text by the rule 8
 * number parser, its unit mapped by the closed unit registry, and the
 * candidate checked by the registry's dimension check, the check 2.7 says
 * enforces "kW and kWh are never interchangeable". The property runs every
 * pair of registered units: a unit of another dimension is always rejected,
 * whatever the value. derive applies the same check on read (with the closed
 * unit registry in its context), so a stored candidate in the wrong dimension
 * never becomes the field's value either. And the store's writer refuses it
 * before any row is written (`insertCandidate` runs the same check on the
 * quantity and every alternative reading; phase 1 review, round 3), on a TEST
 * database, with the same value in kWh/a stored as the control.
 */
import fc from 'fast-check';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { derive } from '@sovitech/domain';
import { createSubject, insertCandidate, newId, withRequest, type NewCandidate } from '@sovitech/db';
import { createTestAccount, createTestProject, startTestDatabase, type TestDatabase } from '@sovitech/db/testing';
import { UNIT_REGISTRY, checkQuantityUnit, mapWrittenUnit, parseNumber, unitByCode } from '@sovitech/registry';
import { ownerAnswer, testContext, testEvents, testField } from './_support/builders';

/** A TEST field: a metering point's annual energy, in kWh/a. */
const annualEnergy = testField('metering_point.TEST_annualEnergy', {
  kind: 'quantity',
  subject: 'metering_point',
  unit: 'kWh/a',
  qualifierRequired: true,
  confirmBy: 'engineer',
});

test('G8-4 · 1,250,000 kW returned for annual energy is rejected: power is not energy over time', () => {
  const reading = parseNumber('1,250,000');
  // Written with two thousands separators, the text reads one way only.
  expect(reading.ok && reading.readings.map((item) => item.value)).toEqual([1_250_000]);
  const unit = mapWrittenUnit('kW');
  expect(unit?.code).toBe('kW');

  const verdict = checkQuantityUnit(annualEnergy, { value: 1_250_000, unit: 'kW' });
  expect(verdict.ok).toBe(false);
  if (verdict.ok) return;
  expect(verdict.reason).toBe('dimension_mismatch');
  expect(verdict.fieldDimension).toBe('energy_per_year');
  expect(verdict.candidateDimension).toBe('power');
  expect(verdict.message).toContain('kW');
});

test('G8-4 · the same value in kWh/a, or in MWh/a, is accepted: only the dimension decides', () => {
  expect(checkQuantityUnit(annualEnergy, { value: 1_250_000, unit: 'kWh/a' })).toMatchObject({ ok: true });
  expect(checkQuantityUnit(annualEnergy, { value: 1_250, unit: 'MWh/a' })).toMatchObject({ ok: true });
  // kWh alone is energy, not energy over a year: rejected as well.
  expect(checkQuantityUnit(annualEnergy, { value: 1_250_000, unit: 'kWh' })).toMatchObject({ ok: false, reason: 'dimension_mismatch' });
});

test('G8-4 · a unit the closed registry cannot map gives no quantity candidate', () => {
  expect(mapWrittenUnit('kW-an')).toBeUndefined();
  expect(checkQuantityUnit(annualEnergy, { value: 1_250_000, unit: 'kW-an' })).toMatchObject({ ok: false, reason: 'unit_unknown' });
});

test('G8-4 · every registered unit of another dimension is rejected for annual energy, whatever the value', () => {
  const fieldDimension = unitByCode('kWh/a')?.dimension;
  expect(fieldDimension).toBe('energy_per_year');
  const units = UNIT_REGISTRY.map((unit) => unit.code);
  fc.assert(
    fc.property(fc.constantFrom(...units), fc.integer({ min: 1, max: 10_000_000 }), (code, value) => {
      const verdict = checkQuantityUnit(annualEnergy, { value, unit: code });
      const same = unitByCode(code)?.dimension === fieldDimension;
      expect(verdict.ok).toBe(same);
      if (!verdict.ok) expect(verdict.reason).toBe('dimension_mismatch');
    }),
  );
});

test('G8-4 · derive refuses the same value on read: 1,250,000 kW on annual energy is never the field\'s value', () => {
  const candidate = ownerAnswer({
    id: 'test-cand-g8-4-kw',
    subjectId: 'test-meter-g8-4',
    field: annualEnergy,
    value: { quantity: { value: 1_250_000, unit: 'kW' } },
    minute: 0,
  });
  const state = derive(annualEnergy, [candidate], testEvents({}), testContext({ subjectId: 'test-meter-g8-4' }));
  expect(state.state).toBe('unknown');
  expect(state.candidates).toEqual([
    { candidateId: candidate.id, verification: 'unverified', status: 'refused', refusal: 'unit_dimension' },
  ]);
});

let database: TestDatabase;
let ownerId: string;
let projectId: string;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: 'G8-4 owner', kind: 'person', roles: ['owner'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

async function candidateRows(): Promise<number> {
  const [row] = await database.asAdministrator<{ count: number }>('SELECT count(*)::int AS count FROM sovitech.candidates WHERE project_id = $1', [projectId]);
  return row?.count ?? -1;
}

test('G8-4 · at the store: 1,250,000 kW for annual energy is refused before any write, and nothing is stored', async () => {
  const before = await candidateRows();
  const written = await withRequest(database.app, { userId: ownerId, projectId }, async (request) => {
    const meter = await createSubject(request, { kind: 'metering_point', createdBy: ownerId });
    const candidate = (unit: string): NewCandidate => ({
      id: newId(),
      subjectId: meter.id,
      fieldKey: annualEnergy.key,
      quantity: { value: 1_250_000, unit },
      source: 'user',
      evidence: [],
      createdBy: ownerId,
    });
    return { kW: await insertCandidate(request, candidate('kW'), annualEnergy), kWhPerYear: await insertCandidate(request, candidate('kWh/a'), annualEnergy) };
  });
  expect(written.kW).toMatchObject({ outcome: 'refused', refusal: 'dimension_mismatch', reading: 'quantity' });
  // The control: the same value in kWh/a is stored, and it is the only row added.
  expect(written.kWhPerYear).toMatchObject({ outcome: 'stored' });
  expect(await candidateRows()).toBe(before + 1);
});
