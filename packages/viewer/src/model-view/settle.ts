/**
 * The wait for the whole model before the first frame (docs/build-log.md, the viewer step, item 2: "No partial model";
 * US-MODEL-05 AC4). Part of the lazily loaded chunk (./engine.ts).
 *
 * Fragments delivers a model's tiles for the camera as it is, a little at a time, and drops an update asked for within
 * its update interval of the last one, so each forced update waits that interval out first. The wait ends once the
 * model is no longer busy and has tiles. A model still busy when the wait runs out is never shown in part: the view
 * reports it could not load (`load`), so the area shows the stored model's line instead of a partial model (the
 * review of part 1, V-4: after its cap of about 10 seconds the view was shown as it was). The cap is about a minute at
 * Fragments' default interval, listed for part 2's design review with the loading line shown meanwhile.
 */
import { ViewUnavailableError } from './engine-types';

/** How many forced updates the first frame waits for at most (each after Fragments' update interval): about a minute. */
export const SETTLE_ATTEMPTS = 600;

/** What the wait reads of Fragments' models (`FragmentsModels`). */
export interface SettlingFragments {
  readonly settings: { readonly maxUpdateRate: number };
  update(force?: boolean): Promise<void>;
}

/** What the wait reads of the loaded model (`FragmentsModel`). */
export interface SettlingModel {
  readonly isBusy: boolean;
  readonly tiles: { readonly size: number };
}

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** Waits until Fragments has delivered the whole model's tiles; refuses with `load` when it has not after `attempts`. */
export async function wholeModel(fragments: SettlingFragments, model: SettlingModel, signal: AbortSignal, attempts: number = SETTLE_ATTEMPTS): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (signal.aborted) throw new ViewUnavailableError('load');
    await pause(fragments.settings.maxUpdateRate + 1);
    if (signal.aborted) throw new ViewUnavailableError('load');
    await fragments.update(true);
    if (!model.isBusy && model.tiles.size > 0) return;
  }
  throw new ViewUnavailableError('load');
}
