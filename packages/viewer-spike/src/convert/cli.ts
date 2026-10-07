/**
 * The converter's command line, run in the conversion sandbox image (services/model-converter/Dockerfile; the viewer
 * step's production converter, and the spike's bench runner's: docs/adr/0046-viewer-spike.md decision 2):
 *
 *   --input <model.ifc> --out <folder> --wasm <web-ifc folder/> [--profile view|library-defaults] [--plans yes]
 *
 * It writes, each through a temporary file and a rename:
 * - `<out>/viewer.frag`: the Fragments file in the view profile (./importer.ts, ./convert.ts);
 * - `<out>/storeys.json`: the storey index (./storeys.ts): GlobalIds only, in the order of the storeys' shapes;
 * - `<out>/summary.json`: its code, sizes, times and memory only.
 * With `--plans yes` (the spike's bench only) it also cuts every storey's plan from the converted file
 * (../plan/section.ts) and records how long that took and each plan's size; the plans themselves are not written. It
 * prints nothing but a code: no line it writes carries model text (rule 13: logs carry codes, GlobalIds and STEP ids
 * only; G13-13). Exit status, which the conversion job reads as the code it records: 0 written, 2 arguments refused,
 * 3 input refused, 4 conversion failed (`parse_failed`), 5 no item with a shape (`no_geometry`). The sandbox's own
 * limits (the wall clock, the memory) end it from outside.
 */
import { existsSync, lstatSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { storeyPlans } from '../plan/section';
import { convertModel } from './convert';
import type { ConversionProfile } from './importer';
import { hasGeometry, storeyIndex } from './storeys';

/** The files the converter writes, in the output folder. */
export const OUTPUT_FILES = { fragments: 'viewer.frag', storeys: 'storeys.json', summary: 'summary.json' } as const;

/** The converter's exit statuses, each the code the conversion job records (apps/api/src/jobs/model-view/). */
export const EXIT_STATUS = { written: 0, argumentsRefused: 2, inputRefused: 3, conversionFailed: 4, noGeometry: 5 } as const;

/** The prefix of every line the converter prints: a code follows, and nothing from the model. */
const PRINTED = 'model-converter:';

/** The cgroup v2 file holding the container's peak memory, in bytes, as text (Linux 5.19 and later). */
const CGROUP_MEMORY_PEAK = '/sys/fs/cgroup/memory.peak';

export interface CliArguments {
  readonly input: string;
  readonly out: string;
  readonly wasm: string;
  readonly profile: ConversionProfile;
  readonly plans: boolean;
}

/** Reads the arguments, or returns undefined when they do not have the one form above. */
export function parseArguments(argv: readonly string[]): CliArguments | undefined {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === undefined || value === undefined || !flag.startsWith('--') || values.has(flag)) return undefined;
    values.set(flag, value);
  }
  const input = values.get('--input');
  const out = values.get('--out');
  const wasm = values.get('--wasm');
  const profile = values.get('--profile') ?? 'view';
  const plans = values.get('--plans') ?? 'no';
  const known = new Set(['--input', '--out', '--wasm', '--profile', '--plans']);
  if ([...values.keys()].some((flag) => !known.has(flag))) return undefined;
  if (input === undefined || out === undefined || wasm === undefined) return undefined;
  if (profile !== 'view' && profile !== 'library-defaults') return undefined;
  if (plans !== 'yes' && plans !== 'no') return undefined;
  return { input, out, wasm, profile, plans: plans === 'yes' };
}

/** The container's peak memory as the kernel wrote it (text, read by the runner), or null outside a cgroup v2 container. */
function cgroupMemoryPeak(): string | null {
  if (!existsSync(CGROUP_MEMORY_PEAK)) return null;
  return readFileSync(CGROUP_MEMORY_PEAK, 'utf8').trim();
}

function writeAtomically(path: string, data: Uint8Array | string): void {
  const temporary = `${path}.partial`;
  writeFileSync(temporary, data, { flag: 'wx' });
  renameSync(temporary, path);
}

/** Runs one conversion; returns the exit status. */
export async function main(argv: readonly string[]): Promise<number> {
  const args = parseArguments(argv);
  if (args === undefined) {
    process.stderr.write(`${PRINTED} arguments_refused\n`);
    return EXIT_STATUS.argumentsRefused;
  }
  if (!existsSync(args.input) || !lstatSync(args.input).isFile()) {
    process.stderr.write(`${PRINTED} input_refused\n`);
    return EXIT_STATUS.inputRefused;
  }
  const started = performance.now();
  try {
    const conversion = await convertModel(args.input, args.wasm, args.profile);
    if (!hasGeometry(conversion.fragments)) {
      process.stderr.write(`${PRINTED} no_geometry\n`);
      return EXIT_STATUS.noGeometry;
    }
    const indexStarted = performance.now();
    const index = `${JSON.stringify(storeyIndex(conversion.fragments))}\n`;
    const indexMs = performance.now() - indexStarted;
    writeAtomically(join(args.out, OUTPUT_FILES.fragments), conversion.fragments);
    writeAtomically(join(args.out, OUTPUT_FILES.storeys), index);
    const plansStarted = performance.now();
    const plans = args.plans ? storeyPlans(conversion.fragments) : [];
    const planMs = args.plans ? performance.now() - plansStarted : null;
    const usage = process.resourceUsage();
    const summary = {
      about: 'model conversion: a code, sizes, times and memory only',
      code: 'written',
      profile: args.profile,
      inputBytes: conversion.inputBytes,
      fragmentsBytes: conversion.fragments.byteLength,
      indexBytes: Buffer.byteLength(index),
      importMs: conversion.times.importMs,
      metadataMs: conversion.times.metadataMs,
      indexMs,
      planMs,
      planSegments: plans.map((plan) => plan.segments),
      planBytes: plans.map((plan) => (plan.svg === undefined ? null : Buffer.byteLength(plan.svg))),
      totalMs: performance.now() - started,
      maxRssKiB: usage.maxRSS,
      cgroupMemoryPeak: cgroupMemoryPeak(),
      node: process.version,
    };
    // One line: the job reads it with the API's reviewed reader of one JSON value per line (apps/api/src/jobs/read-output.ts).
    writeAtomically(join(args.out, OUTPUT_FILES.summary), `${JSON.stringify(summary)}\n`);
    process.stdout.write(`${PRINTED} written\n`);
    return EXIT_STATUS.written;
  } catch (error) {
    // The error's class only: a message may quote the model (rule 13).
    const kind = error instanceof Error ? error.constructor.name : typeof error;
    process.stderr.write(`${PRINTED} conversion_failed ${kind}\n`);
    return EXIT_STATUS.conversionFailed;
  }
}
