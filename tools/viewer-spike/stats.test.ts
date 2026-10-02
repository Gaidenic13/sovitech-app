import { describe, expect, it } from 'vitest';
import { descendantsOf, kindOf } from './processes';
import { frameStats } from './stats';

describe('the viewer spike runner', () => {
  it('ADR 0046 · frame statistics: frames per second, median, 95th percentile and slow frames of a recorded orbit', () => {
    const times = [1000, 1016, 1033, 1050, 1100, 1116];
    const stats = frameStats(times);
    expect(stats.frames).toBe(6);
    expect(stats.seconds).toBeCloseTo(0.116);
    expect(stats.fps).toBeCloseTo(5 / 0.116);
    expect(stats.medianFrameMs).toBe(17);
    expect(stats.worstFrameMs).toBe(50);
    expect(stats.slowFrames).toBe(1);
    expect(Number.isNaN(frameStats([1000]).fps)).toBe(true);
  });

  it("ADR 0046 · Chromium's processes are told apart by their type switch, and only the browser's own tree is read", () => {
    expect(kindOf('/x/Chromium --type=renderer --lang=en')).toBe('renderer');
    expect(kindOf('/x/Chromium --type=gpu-process')).toBe('gpu');
    expect(kindOf('/x/Chromium --type=utility --utility-sub-type=network.mojom.NetworkService')).toBe('utility');
    expect(kindOf('/x/Chromium --headless')).toBe('browser');
    const rows = [
      { pid: 10, parent: 1, rssBytes: 1, command: 'browser' },
      { pid: 11, parent: 10, rssBytes: 2, command: 'gpu' },
      { pid: 12, parent: 10, rssBytes: 3, command: 'renderer' },
      { pid: 13, parent: 12, rssBytes: 4, command: 'child' },
      { pid: 20, parent: 1, rssBytes: 5, command: 'other browser' },
    ];
    expect(descendantsOf(rows, 10).map((row) => row.pid).sort()).toEqual([10, 11, 12, 13]);
  });
});
