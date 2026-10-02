/**
 * Samples the resident memory of Chromium's processes while the bench runs (docs/adr/0046-viewer-spike.md
 * decision 3: "the tab's JavaScript heap and the renderer process's memory"). Every interval it lists
 * the processes descending from the browser's own (`ps`), sorts them by Chromium's `--type=` switch
 * and keeps each kind's highest resident size seen. Resident size (RSS) counts pages shared with other
 * processes, so it reads a little above the "memory footprint" the browser's task manager shows.
 */
import { execFile } from 'node:child_process';

export type ProcessKind = 'browser' | 'renderer' | 'gpu' | 'utility' | 'other';

export interface MemoryPeaks {
  /** The highest RSS of any one process of each kind, in bytes. */
  readonly peakBytes: Record<ProcessKind, number>;
  readonly samples: number;
}

interface Row {
  readonly pid: number;
  readonly parent: number;
  readonly rssBytes: number;
  readonly command: string;
}

function listProcesses(): Promise<Row[]> {
  return new Promise((resolve) => {
    execFile('ps', ['-A', '-o', 'pid=,ppid=,rss=,command='], { maxBuffer: 16 * 1024 * 1024 }, (error, stdout) => {
      if (error !== null) {
        resolve([]);
        return;
      }
      const rows: Row[] = [];
      for (const line of stdout.split('\n')) {
        const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line);
        if (match === null) continue;
        rows.push({ pid: Number(match[1]), parent: Number(match[2]), rssBytes: Number(match[3]) * 1024, command: match[4] ?? '' });
      }
      resolve(rows);
    });
  });
}

export function kindOf(command: string): ProcessKind {
  const type = /--type=([a-z-]+)/.exec(command)?.[1];
  if (type === undefined) return 'browser';
  if (type === 'renderer') return 'renderer';
  if (type === 'gpu-process') return 'gpu';
  if (type === 'utility') return 'utility';
  return 'other';
}

/** The processes under `root`, the root included. */
export function descendantsOf(rows: readonly Row[], root: number): Row[] {
  const children = new Map<number, Row[]>();
  for (const row of rows) children.set(row.parent, [...(children.get(row.parent) ?? []), row]);
  const found = rows.filter((row) => row.pid === root);
  for (let index = 0; index < found.length; index += 1) {
    const current = found[index];
    if (current !== undefined) found.push(...(children.get(current.pid) ?? []));
  }
  return found;
}

export interface Sampler {
  stop(): Promise<MemoryPeaks>;
}

export function sampleMemory(rootPid: number, intervalMs = 250): Sampler {
  const peakBytes: Record<ProcessKind, number> = { browser: 0, renderer: 0, gpu: 0, utility: 0, other: 0 };
  let samples = 0;
  let running = true;
  const loop = (async () => {
    while (running) {
      for (const row of descendantsOf(await listProcesses(), rootPid)) {
        const kind = kindOf(row.command);
        peakBytes[kind] = Math.max(peakBytes[kind], row.rssBytes);
      }
      samples += 1;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  })();
  return {
    stop: async () => {
      running = false;
      await loop;
      return { peakBytes: { ...peakBytes }, samples };
    },
  };
}
