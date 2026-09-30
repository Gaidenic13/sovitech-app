/**
 * Eval fixtures (guardrails rule 13, "Fixtures are synthetic"; prompt 3 section 8,
 * "Fixtures"). Every file an eval sends is a generated synthetic fixture that
 * fixtures/manifest.json lists with its SHA-256; the runner re-hashes each file and
 * refuses one the manifest does not list or that changed since. Its hash is the document's
 * content hash, so the boundary's route guard sees fixture content only.
 *
 * Formats (YAML, read with the same reader as the eval cases, then checked by schema):
 * - a document fixture: the extracted text of one synthetic document, block by block, as
 *   the extractor would store it (a page, or a sheet and cell; `hidden` for text the
 *   extractor flags as hidden, rule 14);
 * - a drafting fixture: the slots, tokens and project facts of a drafting request;
 * - a TEST glossary: a TEST dataset file under fixtures/datasets/ whose entries map an
 *   abbreviation to its expansion (G3-8).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { SUBJECT_KINDS } from '@sovitech/domain';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { DocumentForAi } from '../blocks';
import { PRICING_STAGES, type GlossaryForAi } from '../context';
import type { FixtureManifest } from '../guard';

export const DOCUMENT_FIXTURE_FORMAT = 'sovitech-eval-document/1';
export const DRAFTING_FIXTURE_FORMAT = 'sovitech-eval-drafting/1';

const nonEmpty = z.string().trim().min(1);

export const DocumentFixtureSchema = z.strictObject({
  format: z.literal(DOCUMENT_FIXTURE_FORMAT),
  documentId: z.string().regex(/^TEST-[A-Za-z0-9_.:-]+$/),
  name: nonEmpty,
  blocks: z
    .array(
      z.strictObject({
        page: z.int().min(1).optional(),
        sheet: nonEmpty.optional(),
        cell: nonEmpty.optional(),
        text: z.string(),
        hidden: z.boolean().optional(),
      }),
    )
    .min(1),
});

export const DraftingFixtureSchema = z.strictObject({
  format: z.literal(DRAFTING_FIXTURE_FORMAT),
  slots: z.array(z.strictObject({ id: nonEmpty, purpose: nonEmpty })).min(1),
  tokens: z.array(
    z.strictObject({
      token: nonEmpty,
      label: nonEmpty,
      badge: z.string().nullable().optional(),
      status: z.array(nonEmpty).optional(),
    }),
  ),
  facts: z.array(nonEmpty),
  names: z.array(nonEmpty).optional(),
  verifications: z
    .array(
      z.strictObject({
        subject: z.strictObject({ kind: z.enum(SUBJECT_KINDS), ref: z.string().nullable() }),
        fieldKey: nonEmpty,
        verification: z.enum(['unverified', 'owner_acknowledged', 'user_confirmed', 'engineer_verified']),
      }),
    )
    .optional(),
  pricingStage: z.enum(PRICING_STAGES).nullable().optional(),
});
export type DraftingFixture = z.infer<typeof DraftingFixtureSchema>;

const GlossaryFixtureSchema = z.strictObject({
  id: z.string().regex(/^TEST-[A-Za-z0-9_.-]+$/),
  version: nonEmpty,
  description: nonEmpty,
  entries: z.record(nonEmpty, nonEmpty),
});

export class EvalFixtureError extends Error {
  override name = 'EvalFixtureError';
}

/** A fixture file's bytes, after the manifest check. */
export interface CheckedFixture {
  readonly path: string;
  readonly sha256: string;
  readonly text: string;
}

/** Reads a fixture file under fixtures/, refusing one the manifest does not list with these bytes. */
export function readCheckedFixture(root: string, path: string, manifest: FixtureManifest): CheckedFixture {
  const normalised = posix.normalize(path);
  if (!normalised.startsWith('fixtures/') || normalised.split('/').includes('..')) throw new EvalFixtureError(`${path} is not under fixtures/`);
  const absolute = join(root, normalised);
  if (!existsSync(absolute) || !statSync(absolute).isFile()) throw new EvalFixtureError(`${path} does not exist`);
  const bytes = readFileSync(absolute);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const listed = manifest.files.get(normalised);
  if (listed === undefined) throw new EvalFixtureError(`${path} is not listed in fixtures/manifest.json, so it is not fixture content and is never sent`);
  if (listed !== sha256) throw new EvalFixtureError(`${path} does not match its SHA-256 in fixtures/manifest.json`);
  return { path: normalised, sha256, text: bytes.toString('utf8') };
}

function parsed<T>(schema: z.ZodType<T>, fixture: CheckedFixture, what: string): T {
  const result = schema.safeParse(parseYaml(fixture.text));
  if (!result.success) {
    const paths = result.error.issues.map((issue) => issue.path.map(String).join('.') || '(root)');
    throw new EvalFixtureError(`${fixture.path} is not a ${what}: ${[...new Set(paths)].join(', ')}`);
  }
  return result.data;
}

/** A document fixture as a document of the eval's project, with the file's hash as its content hash. */
export function documentFromFixture(fixture: CheckedFixture, projectId: string): DocumentForAi {
  const document = parsed(DocumentFixtureSchema, fixture, 'document fixture');
  return {
    projectId,
    documentId: document.documentId,
    contentHash: `sha256:${fixture.sha256}`,
    name: document.name,
    blocks: document.blocks.map((block) => ({
      locator: {
        ...(block.page === undefined ? {} : { page: block.page }),
        ...(block.sheet === undefined ? {} : { sheet: block.sheet }),
        ...(block.cell === undefined ? {} : { cell: block.cell }),
      },
      text: block.text,
      ...(block.hidden === true ? { hidden: true } : {}),
    })),
  };
}

export function draftingFromFixture(fixture: CheckedFixture): DraftingFixture {
  return parsed(DraftingFixtureSchema, fixture, 'drafting fixture');
}

export function glossaryFromFixture(fixture: CheckedFixture): GlossaryForAi {
  const glossary = parsed(GlossaryFixtureSchema, fixture, 'TEST glossary dataset');
  return {
    dataset: glossary.id,
    version: glossary.version,
    entries: Object.entries(glossary.entries).map(([abbreviation, expansion]) => ({ abbreviation, expansion })),
  };
}
