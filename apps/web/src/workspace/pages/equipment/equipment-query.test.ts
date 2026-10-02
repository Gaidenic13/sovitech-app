import { describe, expect, it } from 'vitest';
import type { DisplayObject, EquipmentRow } from '@sovitech/view-model/browser';
import { answersOf, badgeLabelOf, offersAnswers, queryOfSearch, requestQuery, searchWith } from './equipment-query';

const ASSET = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b01';
const ZONE = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8d01';
const CANDIDATE = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8c01';

describe('R-066 · US-ASSETS-11 AC4 · ADR 0043 decision 6: the register query held in the address', () => {
  it('reads each key with the contract schema and leaves out a malformed one (never sent)', () => {
    const search = new URLSearchParams({ system: 'hvac', level: 'upper_3', zone: ZONE, badge: 'unknown', search: 'cta', page: '2' });
    expect(queryOfSearch(search)).toEqual({ system: 'hvac', level: 'upper_3', zone: ZONE, badge: 'unknown', search: 'cta', page: 2 });
    const bad = new URLSearchParams({ system: 'HVAC!', level: 'E1', zone: 'not-a-zone', page: 'zero', search: '' });
    expect(queryOfSearch(bad)).toEqual({});
  });

  it('a filter or search change goes back to the first page; a page change keeps the rest; the first page is not sent', () => {
    const search = new URLSearchParams({ system: 'hvac', page: '3' });
    expect(searchWith(search, { level: 'ground_1' }).toString()).toBe('system=hvac&level=ground_1');
    expect(searchWith(search, { page: '4' }).toString()).toBe('system=hvac&page=4');
    expect(searchWith(search, { system: undefined }).toString()).toBe('');
    expect(requestQuery({ page: 1, system: 'hvac' })).toEqual({ system: 'hvac', level: undefined, zone: undefined, badge: undefined, search: undefined, page: undefined });
    expect(requestQuery({ page: 2 }).page).toBe('2');
  });
});

describe('R-065 · rule 3 · G3-3 · G3-10: the selection answers only what the API served', () => {
  const row: EquipmentRow = { assetId: ASSET, tag: `asset:${ASSET}.tag`, type: `asset:${ASSET}.type`, system: `asset:${ASSET}.system`, location: `asset:${ASSET}.location`, level: `asset:${ASSET}.level`, zone: `asset:${ASSET}.zone` };
  const unknown = (valueId: string): DisplayObject => ({ valueId, kind: 'field', text: 'TEST', shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'TEST unknown' } });

  it('gathers the served "Looks right" and "Something\'s wrong" candidates; a row with none offers nothing', () => {
    const plain = new Map([row.tag, row.type, row.system, row.location, row.level, row.zone].map((id) => [id, unknown(id)]));
    expect(offersAnswers([row], plain)).toBe(false);
    expect(answersOf([row], plain)).toEqual({ acknowledge: [], concern: [] });
    const answered = new Map(plain);
    answered.set(row.system, {
      ...unknown(row.system),
      actions: [
        { kind: 'acknowledge', candidateIds: [CANDIDATE] },
        { kind: 'concern', candidateId: CANDIDATE },
        { kind: 'edit', field: { subjectId: ASSET, fieldKey: 'asset.system' }, input: { kind: 'text', maxLength: 10 }, shownCandidateIds: [] },
      ],
    });
    expect(offersAnswers([row], answered)).toBe(true);
    expect(answersOf([row], answered)).toEqual({ acknowledge: [CANDIDATE], concern: [CANDIDATE] });
  });

  it('2.8: a badge filter option takes its label from a served display, never from the catalogue', () => {
    const displays = new Map([[row.type, unknown(row.type)]]);
    expect(badgeLabelOf('unknown', displays)).toEqual({ id: 'unknown', label: 'TEST unknown' });
    expect(badgeLabelOf('likely', displays)).toBeUndefined();
  });
});
