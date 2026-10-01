import { describe, expect, it } from 'vitest';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { choiceFor, confirmationRows, factTree, fileNameIdOf, shownConfirmations } from './facts';

const B = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e60';
const C1 = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e61';
const C2 = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e62';

function display(valueId: string, extra: Partial<DisplayObject> = {}): DisplayObject {
  return { valueId, kind: 'field', text: 'TEST', shape: 'value', ...extra };
}

const index = (list: readonly DisplayObject[]) => new Map(list.map((entry) => [entry.valueId, entry]));

describe('R-045 · rule 2: step 3 facts laid out from their value ids', () => {
  it('US-REVIEW-04 AC4 · rule 4: a fact and a conflict value sit under the nearest id they extend; a display the view names but did not serve is dropped', () => {
    const floors = `building:${B}.floors`;
    const displays = index([
      display(floors),
      display(`${floors}.upper`, { actions: [{ kind: 'resolve_conflict', field: { subjectId: B, fieldKey: 'building.floors' }, choices: [{ candidateId: C1, valueId: `${floors}.upper.value1` }, { candidateId: C2, valueId: `${floors}.upper.value2` }] }] }),
      display(`${floors}.upper.value1`),
      display(`${floors}.upper.value2`),
      display(`building:${B}.rooms`),
    ]);
    const tree = factTree([floors, `${floors}.upper`, `${floors}.upper.value1`, `${floors}.upper.value2`, `building:${B}.rooms`, `building:${B}.missing`], displays);
    expect(tree.map((node) => node.display.valueId)).toEqual([floors, `building:${B}.rooms`]);
    const [upper] = tree[0]?.children ?? [];
    expect(upper?.display.valueId).toBe(`${floors}.upper`);
    expect(upper?.children.map((node) => node.display.valueId)).toEqual([`${floors}.upper.value1`, `${floors}.upper.value2`]);
    expect(choiceFor(upper?.display as DisplayObject, `${floors}.upper.value2`)?.candidateId).toBe(C2);
    expect(choiceFor(tree[0]?.display as DisplayObject, `${floors}.upper.value2`)).toBeUndefined();
  });

  it('rule 7 · US-REVIEW-06 AC1: the confirmations on screen are reported once each, in row order', () => {
    const wording = { id: 'TEST', kind: 'rule_line' as const, text: 'TEST wording' };
    const displays = index([
      display(`building:${B}.grossFloorArea`, { actions: [{ kind: 'confirm', candidateId: C1, wording }] }),
      display(`building:${B}.rooms`),
      display(`building:${B}.zones`, { actions: [{ kind: 'confirm', candidateId: C2, wording }] }),
    ]);
    const ids = [`building:${B}.grossFloorArea`, `building:${B}.rooms`, `building:${B}.zones`];
    const tree = factTree([...ids, ...ids], displays);
    expect(shownConfirmations(tree)).toEqual([C1, C2]);
    expect(confirmationRows(tree)).toEqual([`building:${B}.grossFloorArea`, `building:${B}.zones`]);
  });

  it('US-REVIEW-09 AC3: a file status line names its file through the document\'s file-name value id', () => {
    expect(fileNameIdOf(`document:${C1}.coverage`)).toBe(`document:${C1}.fileName`);
    expect(fileNameIdOf(`project:${C1}.documents.count`)).toBeUndefined();
  });
});
