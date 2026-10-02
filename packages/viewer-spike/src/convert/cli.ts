/**
 * The converter's command line, run in the viewer spike's sandbox image
 * (services/viewer-spike/Dockerfile; docs/adr/0046-viewer-spike.md decision 2):
 *
 *   --input <model.ifc> --out <folder> --wasm <web-ifc folder/> [--profile view|library-defaults] [--plans yes]
 *
 * It writes `<out>/viewer.frag` (the Fragments file) and `<out>/summary.json` (sizes, times and
 * memory only), each through a temporary file and a rename. With `--plans yes` it also cuts every
 * storey's plan from the converted file (../plan/section.ts) and records how long that took and
 * each plan's size; the plans themselves are not written. It prints nothing but a code: no line
 * it writes carries model text (rule 13: logs carry codes, GlobalIds and STEP ids only). Exit
 * status: 0 written, 2 arguments refused, 3 input refused, 4 conversion failed.
 */
import { existsSync, lstatSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { storeyPlans } from '../plan/section';
import { convertModel } from './convert';
import type { ConversionProfile } from './importer';

/** The files the converter writes, in the output folder. */
export const OUTPUT_FILES = { fragments: 'viewer.frag', summary: 'summary.json' } as const;

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
    process.stderr.write('viewer-spike: arguments_refused\n');
    return 2;
  }
  if (!existsSync(args.input) || !lstatSync(args.input).isFile()) {
    process.stderr.write('viewer-spike: input_refused\n');
    return 3;
  }
  const started = performance.now();
  try {
    const conversion = await convertModel(args.input, args.wasm, args.profile);
    writeAtomically(join(args.out, OUTPUT_FILES.fragments), conversion.fragments);
    const plansStarted = performance.now();
    const plans = args.plans ? storeyPlans(conversion.fragments) : [];
    const planMs = args.plans ? performance.now() - plansStarted : null;
    const usage = process.resourceUsage();
    const summary = {
      about: 'viewer-spike conversion: sizes, times and memory only',
      profile: args.profile,
      inputBytes: conversion.inputBytes,
      fragmentsBytes: conversion.fragments.byteLength,
      importMs: conversion.times.importMs,
      metadataMs: conversion.times.metadataMs,
      planMs,
      planSegments: plans.map((plan) => plan.segments),
      planBytes: plans.map((plan) => (plan.svg === undefined ? null : Buffer.byteLength(plan.svg))),
      totalMs: performance.now() - started,
      maxRssKiB: usage.maxRSS,
      cgroupMemoryPeak: cgroupMemoryPeak(),
      node: process.version,
    };
    writeAtomically(join(args.out, OUTPUT_FILES.summary), `${JSON.stringify(summary, null, 2)}\n`);
    process.stdout.write('viewer-spike: written\n');
    return 0;
  } catch (error) {
    // The error's class only: a message may quote the model (rule 13).
    const kind = error instanceof Error ? error.constructor.name : typeof error;
    process.stderr.write(`viewer-spike: conversion_failed ${kind}\n`);
    return 4;
  }
}
