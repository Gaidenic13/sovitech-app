/**
 * Frame statistics for the bench's orbit (docs/adr/0046-viewer-spike.md decision 3; prompt 3
 * section 11: "Orbiting runs at 30 fps or better"). Input: the time of every frame the renderer drew
 * while the arrow key was held.
 */

export interface FrameStats {
  readonly frames: number;
  readonly seconds: number;
  /** Frames drawn per second over the recording. */
  readonly fps: number;
  readonly medianFrameMs: number;
  readonly p95FrameMs: number;
  readonly worstFrameMs: number;
  /** Frames that took longer than a 30 fps frame (33.3 ms). */
  readonly slowFrames: number;
}

function percentile(sorted: readonly number[], share: number): number {
  if (sorted.length === 0) return Number.NaN;
  const index = Math.min(sorted.length - 1, Math.floor(share * sorted.length));
  return sorted[index] ?? Number.NaN;
}

export function frameStats(times: readonly number[]): FrameStats {
  const first = times[0];
  const last = times[times.length - 1];
  if (first === undefined || last === undefined || times.length < 2) {
    return { frames: times.length, seconds: Number.NaN, fps: Number.NaN, medianFrameMs: Number.NaN, p95FrameMs: Number.NaN, worstFrameMs: Number.NaN, slowFrames: Number.NaN };
  }
  const intervals = times.slice(1).map((time, index) => time - (times[index] ?? time));
  const sorted = [...intervals].sort((a, b) => a - b);
  const seconds = (last - first) / 1000;
  return {
    frames: times.length,
    seconds,
    fps: intervals.length / seconds,
    medianFrameMs: percentile(sorted, 0.5),
    p95FrameMs: percentile(sorted, 0.95),
    worstFrameMs: sorted[sorted.length - 1] ?? Number.NaN,
    slowFrames: intervals.filter((interval) => interval > 1000 / 30).length,
  };
}
