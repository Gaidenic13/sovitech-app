/**
 * The runtime guard of the `ai-processor-route` gate (prompt 3 section 5.4; build-readiness
 * decision 2, D-09; rule 13, "Processing").
 *
 * While the gate is closed, "the AI boundary sends only fixture content: documents whose
 * content hash is in `fixtures/manifest.json`, and, for drafting and every other task,
 * values and text from the demo project only. Everything else is refused before the call
 * and logged." The boundary asks this guard about every item of a request before the
 * transport is called; one refused item refuses the whole request. The gate is read
 * through the one gate function (readGate); nothing here can open it.
 *
 * Reading recorded for the owner (docs/adr/0023): a drafting eval's input is a fixture
 * file whose SHA-256 the manifest lists (`fixture_values`), re-read and re-hashed here.
 * That is fixture content in the gate's first sentence, as the prompt's section 13 item 3
 * allows ("Evals that send fixtures to the Anthropic API with a configured key are
 * allowed"); no project's values reach the model that way.
 *
 * A document's name travels with its text (the `name` attribute of its block). The name
 * the owner typed is owner text, neither fixture content nor, outside the demo project,
 * demo-project text, so while the gate is closed a document may carry only a name code
 * set: its document id, or the file name of the fixture whose hash it has (the basename of
 * that manifest path); or, in an eval, the name its own fixture file states. Anything else
 * is refused (`document_name_not_fixture`) on a project that is not the demo (phase 2
 * review, adversarial finding "the owner-typed file name reaches the model"). The app
 * sends the code-set name to begin with (`nameForModel`).
 *
 * The refusal log names codes and ids only, never document text (rule 13).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { readGate, type GateSource } from '@sovitech/registry/gates';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

/** The fixture manifest, relative to the repository root (the fixture-manifest check's MANIFEST). */
export const FIXTURE_MANIFEST_FILE = 'fixtures/manifest.json';

/** The files the manifest lists, by root-relative path, with their SHA-256 (hex). */
export interface FixtureManifest {
  readonly files: ReadonlyMap<string, string>;
  readonly hashes: ReadonlySet<string>;
}

const manifestSchema = z.object({
  files: z.array(z.object({ path: z.string().min(1), sha256: z.string().regex(/^[0-9a-f]{64}$/) })),
});

export class FixtureManifestError extends Error {
  override name = 'FixtureManifestError';
}

/**
 * Reads fixtures/manifest.json under `root`. The file is JSON, read with the YAML reader
 * the gates and eval cases use (JSON is YAML) and checked against its schema; it holds
 * paths and hashes, no engineering value. A missing or malformed manifest lists nothing,
 * so every document is refused (the guard fails closed).
 */
export function loadFixtureManifest(root: string): FixtureManifest {
  const path = join(root, FIXTURE_MANIFEST_FILE);
  if (!existsSync(path) || !statSync(path).isFile()) return { files: new Map(), hashes: new Set() };
  const parsed = manifestSchema.safeParse(parseYaml(readFileSync(path, 'utf8')));
  if (!parsed.success) throw new FixtureManifestError(`${FIXTURE_MANIFEST_FILE} does not match its schema`);
  const files = new Map(parsed.data.files.map((file) => [file.path, file.sha256] as const));
  return { files, hashes: new Set(files.values()) };
}

/** The hex digest of `sha256:<hex>` or `<hex>`, lower case; undefined when it is neither. */
export function sha256Hex(contentHash: string): string | undefined {
  const match = /^(?:sha256:)?([0-9a-fA-F]{64})$/.exec(contentHash);
  return match?.[1]?.toLowerCase();
}

/** SHA-256 of bytes as `sha256:<hex>`. */
export function contentHashOf(bytes: Uint8Array | string): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

/** One item a request would send. */
export type RouteItem =
  /** A document's extracted text, and the name its block carries (the context builder always names it). */
  | { readonly kind: 'document'; readonly projectId: string; readonly documentId: string; readonly contentHash: string; readonly name?: string }
  /** Values or text of a project: owner texts, drafting facts and tokens. */
  | { readonly kind: 'project_values'; readonly projectId: string }
  /** A drafting eval's input: a fixture file listed in the manifest. */
  | { readonly kind: 'fixture_values'; readonly path: string; readonly sha256: string };

export type RouteRefusalCode =
  | 'document_not_fixture'
  | 'document_name_not_fixture'
  | 'project_not_demo'
  | 'other_project'
  | 'fixture_file_not_in_manifest'
  | 'fixture_file_outside_fixtures'
  | 'fixture_file_changed';

export interface RouteRefusal {
  readonly code: RouteRefusalCode;
  readonly documentId?: string;
  readonly projectId?: string;
  readonly path?: string;
}

export type RouteDecision =
  | { readonly allowed: true; readonly gateOpen: boolean }
  | { readonly allowed: false; readonly refusals: readonly RouteRefusal[] };

export interface RouteContext {
  readonly gates: GateSource;
  readonly manifest: FixtureManifest;
  /** The project the request is for, with its demo flag as the store holds it. */
  readonly project: { readonly id: string; readonly demo: boolean };
  /** The repository root, for re-hashing fixture files. */
  readonly root: string;
}

function refuseFixtureFile(root: string, manifest: FixtureManifest, path: string, sha256: string): RouteRefusal | undefined {
  const normalised = posix.normalize(path);
  if (!normalised.startsWith('fixtures/') || normalised.split('/').includes('..')) return { code: 'fixture_file_outside_fixtures', path };
  const listed = manifest.files.get(normalised);
  if (listed === undefined || listed !== sha256Hex(sha256)) return { code: 'fixture_file_not_in_manifest', path };
  const absolute = join(root, normalised);
  if (!existsSync(absolute) || !statSync(absolute).isFile() || sha256Hex(contentHashOf(readFileSync(absolute))) !== listed) {
    return { code: 'fixture_file_changed', path };
  }
  return undefined;
}

/** The manifest paths whose SHA-256 is `hex`, in order. */
function manifestPathsOf(manifest: FixtureManifest, hex: string): string[] {
  return [...manifest.files].filter(([, sha256]) => sha256 === hex).map(([path]) => path).sort();
}

/**
 * The names a document may carry while the gate is closed, set by code: its document id,
 * and the file name of each fixture with its hash.
 */
export function codeSetNames(document: { readonly documentId: string; readonly contentHash: string }, manifest: FixtureManifest): string[] {
  const hex = sha256Hex(document.contentHash);
  const fixtureNames = hex === undefined ? [] : manifestPathsOf(manifest, hex).map((path) => posix.basename(path));
  return [...new Set([...fixtureNames, document.documentId])];
}

/**
 * The name the app sends with a document: the name as uploaded once the gate is open (an
 * approved processor route), and until then a code-set name, the fixture's file name or the
 * document id (rule 13, "Processing"; D-09). The owner's typed name never reaches the model
 * while the gate is closed.
 */
export function nameForModel(
  document: { readonly documentId: string; readonly contentHash: string; readonly uploadedName: string | undefined },
  context: { readonly gates: GateSource; readonly manifest: FixtureManifest },
): string {
  if (readGate(context.gates, 'ai-processor-route').open && document.uploadedName !== undefined) return document.uploadedName;
  return codeSetNames(document, context.manifest)[0] ?? document.documentId;
}

/** Whether a fixture file with this hash states the name itself (an eval's document fixture: `name: <name>`). */
function nameStatedByFixture(root: string, manifest: FixtureManifest, hex: string, name: string): boolean {
  return manifestPathsOf(manifest, hex).some((path) => {
    const absolute = join(root, path);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) return false;
    const bytes = readFileSync(absolute);
    if (sha256Hex(contentHashOf(bytes)) !== hex) return false;
    const stated = [`name: ${name}`, `name: ${JSON.stringify(name)}`, `name: '${name.replace(/'/g, "''")}'`];
    return bytes.toString('utf8').split(/\r?\n/u).some((line) => stated.includes(line));
  });
}

/** Whether a request's items may be sent. Pure apart from reading the gate and re-hashing fixture files. */
export function checkProcessorRoute(items: readonly RouteItem[], context: RouteContext): RouteDecision {
  if (readGate(context.gates, 'ai-processor-route').open) return { allowed: true, gateOpen: true };
  const refusals: RouteRefusal[] = [];
  for (const item of items) {
    switch (item.kind) {
      case 'document': {
        if (item.projectId !== context.project.id) {
          refusals.push({ code: 'other_project', documentId: item.documentId, projectId: item.projectId });
          break;
        }
        const hex = sha256Hex(item.contentHash);
        if (hex === undefined || !context.manifest.hashes.has(hex)) {
          refusals.push({ code: 'document_not_fixture', documentId: item.documentId });
          break;
        }
        const name = item.name;
        const named =
          name === undefined ||
          context.project.demo ||
          codeSetNames(item, context.manifest).includes(name) ||
          nameStatedByFixture(context.root, context.manifest, hex, name);
        if (!named) refusals.push({ code: 'document_name_not_fixture', documentId: item.documentId });
        break;
      }
      case 'project_values': {
        if (item.projectId !== context.project.id) refusals.push({ code: 'other_project', projectId: item.projectId });
        else if (!context.project.demo) refusals.push({ code: 'project_not_demo', projectId: item.projectId });
        break;
      }
      case 'fixture_values': {
        const refusal = refuseFixtureFile(context.root, context.manifest, item.path, item.sha256);
        if (refusal !== undefined) refusals.push(refusal);
        break;
      }
    }
  }
  return refusals.length === 0 ? { allowed: true, gateOpen: false } : { allowed: false, refusals };
}
