/**
 * The wait for the whole model before the first frame (docs/build-log.md, the viewer step, item 2: "No partial model";
 * US-MODEL-05 AC4). The engine's Fragments objects are handed in as dependencies with only the fields the wait reads
 * (a TEST stand-in, not the code under test): an update that resolves, a busy flag and a tile count, as the test
 * scripts them.
 */
import { describe, expect, test } from 'vitest';
import { ViewUnavailableError } from './engine-types';
import { SETTLE_ATTEMPTS, wholeModel, type SettlingFragments, type SettlingModel } from './settle';

/** Fragments that report the model busy, with no tiles, until `readyAfter` forced updates, and count them. */
function scripted(readyAfter: number): { readonly fragments: SettlingFragments; readonly model: SettlingModel; readonly updates: () => number } {
  let updates = 0;
  const model = {
    get isBusy(): boolean {
      return updates < readyAfter;
    },
    tiles: {
      get size(): number {
        return updates < readyAfter ? 0 : 3;
      },
    },
  };
  const fragments = {
    settings: { maxUpdateRate: 0 },
    update: (force?: boolean): Promise<void> => {
      if (force === true) updates += 1;
      return Promise.resolve();
    },
  };
  return { fragments, model, updates: () => updates };
}

describe('D-03 · US-MODEL-05 AC4: no partial model is shown', () => {
  test('US-MODEL-05 AC4: the wait ends once the model is no longer busy and has tiles', async () => {
    const run = scripted(3);
    await wholeModel(run.fragments, run.model, new AbortController().signal, 10);
    expect(run.updates()).toBe(3);
  });

  test('US-MODEL-05 AC4 · rule 7: a model still busy when the wait runs out is not shown in part: the view cannot load ("load"), and the area falls back to the stored model\'s line', async () => {
    // Found by the review of part 1 (V-4): after its cap the view was shown as it was, possibly incomplete.
    const run = scripted(Number.POSITIVE_INFINITY);
    const waited = wholeModel(run.fragments, run.model, new AbortController().signal, 5);
    await expect(waited).rejects.toBeInstanceOf(ViewUnavailableError);
    await expect(waited).rejects.toMatchObject({ reason: 'load' });
    expect(run.updates()).toBe(5);
  });

  test('US-MODEL-05 AC4: a view unmounted while it waits stops waiting, and is not shown', async () => {
    const run = scripted(Number.POSITIVE_INFINITY);
    const controller = new AbortController();
    controller.abort();
    await expect(wholeModel(run.fragments, run.model, controller.signal, 5)).rejects.toMatchObject({ reason: 'load' });
    expect(run.updates()).toBe(0);
  });

  test('D-03: the wait is long enough for a large model\'s tiles on integrated graphics (about a minute at Fragments\' default update interval), listed for the design review', () => {
    expect(SETTLE_ATTEMPTS).toBe(600);
  });
});
