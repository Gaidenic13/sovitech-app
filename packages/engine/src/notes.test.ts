/** The coded notes of an engine candidate's method (docs/adr/0047 "Built"): every note reads back as written. */
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { decodeNote, encodeNote, isIncompleteTotal, methodNotesOf, type MethodNote } from './notes';

const id = fc.stringMatching(/^[A-Za-z][A-Za-z0-9_.-]{0,20}$/u);
const note: fc.Arbitrary<MethodNote> = fc.oneof(
  fc.record({ kind: fc.constant('dataset' as const), id, version: id }),
  fc.record({ kind: fc.constant('range_over_options' as const), subjectId: id, fieldKey: id }),
  fc.record({ kind: fc.constant('range_over_values' as const), subjectId: id, fieldKey: id }),
  fc.record({ kind: fc.constant('excludes' as const), subjectId: id, fieldKey: id, minor: fc.boolean() }),
  fc.record({ kind: fc.constant('excludes_item' as const), name: fc.string({ minLength: 1 }) }),
  fc.record({ kind: fc.constant('note' as const), text: fc.string() }),
);

describe('ADR 0047 "Built" · method notes', () => {
  test('property · every note reads back as the note it was written from', () => {
    fc.assert(
      fc.property(note, (written) => {
        expect(decodeNote(encodeNote(written))).toEqual(written);
      }),
    );
  });

  test('an entry that follows no code is kept as a note, never dropped', () => {
    expect(decodeNote('an assumption in words')).toEqual({ kind: 'note', text: 'an assumption in words' });
    expect(methodNotesOf({ assumptions: ['dataset:TEST-x@TEST-1', 'free text'] })).toEqual([
      { kind: 'dataset', id: 'TEST-x', version: 'TEST-1' },
      { kind: 'note', text: 'free text' },
    ]);
  });

  test('an exclusion on no subject still reads back as an exclusion', () => {
    const written: MethodNote = { kind: 'excludes', subjectId: '', fieldKey: 'building.TEST_a', minor: false };
    expect(decodeNote(encodeNote(written))).toEqual(written);
    expect(isIncompleteTotal({ assumptions: [encodeNote(written)] })).toBe(true);
  });

  test('rule 1 "Material exclusions" · a total is incomplete when it left out an item that is not minor', () => {
    expect(isIncompleteTotal({ assumptions: ['excludes:test-subject:building.TEST_a'] })).toBe(true);
    expect(isIncompleteTotal({ assumptions: ['excludes_item:TEST item'] })).toBe(true);
    expect(isIncompleteTotal({ assumptions: ['excludes_minor:test-subject:building.TEST_a', 'note:TEST'] })).toBe(false);
    expect(isIncompleteTotal(undefined)).toBe(false);
  });
});
