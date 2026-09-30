/**
 * Scripted extractor outputs for the API's cases, built from the generated fixtures'
 * ground truth (fixtures/pdf/ground-truth/, fixtures/ifc/ground-truth/,
 * fixtures/ids/expected/): what the extractor would write for a job (the extraction
 * contract, ADR 0022), so a case can drive the worker and the ingestion path without a
 * sandbox. An IFC output carries the IFC reader's codes (web-ifc, owner decision 2026-09-26;
 * ADR 0031), and, where a case asks for them, the expected IDS results: no IDS result arises
 * live, because the IDS model check waits (D-36), so G12-6's situation exists only here. The
 * real reader's run of the same cases is tests/api/ifc-reader-gate-closed.test.ts. Every
 * text is the fixtures' own synthetic text; nothing here is a model output or carries a
 * model id.
 *
 * Tools are named as TEST tools (`test-ids-checker`), never as a tool that did not run.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPOSITORY_ROOT } from './api';
import { TEST_PRODUCER } from './api';

interface Job {
  readonly projectId: string;
  readonly documentId: string;
  readonly contentHash: string;
}

function json(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(REPOSITORY_ROOT, path), 'utf8')) as Record<string, unknown>;
}

const MEDIA_BOX = [0, 0, 595.28, 841.89] as const;

/** Consecutive runs of pages: [1,2,3,5] as 1-3 and 5. */
function runs(pages: readonly number[]): { first: number; last: number }[] {
  const sorted = [...pages].sort((a, b) => a - b);
  const out: { first: number; last: number }[] = [];
  for (const page of sorted) {
    const last = out.at(-1);
    if (last !== undefined && page === last.last + 1) last.last = page;
    else out.push({ first: page, last: page });
  }
  return out;
}

/**
 * A PDF companion's output from its ground truth: each page with a text layer carries the
 * ground truth's texts of that page as visible blocks; pages without one are unread
 * (`no_text_layer`; with no OCR, 5.2), and the file is partly analysed when any is unread.
 * `truncateAfter` reads the first pages only and records the rest as `truncated` (G12-4).
 */
export function pdfOutput(job: Job, groundTruth: string, options: { readonly truncateAfter?: number } = {}): Record<string, unknown> {
  const truth = json(groundTruth) as {
    pageCount: number;
    pagesWithTextLayer: number[];
    pagesWithoutTextLayer: number[];
    values: { page: number; text: string }[];
  };
  const limit = options.truncateAfter ?? truth.pageCount;
  const read = truth.pagesWithTextLayer.filter((page) => page <= limit);
  const noLayer = truth.pagesWithoutTextLayer.filter((page) => page <= limit);
  const truncated = limit < truth.pageCount ? [{ first: limit + 1, last: truth.pageCount, reason: 'truncated' }] : [];
  const unread = [...runs(noLayer).map((range) => ({ ...range, reason: 'no_text_layer' })), ...truncated].sort((a, b) => a.first - b.first);
  const pages = read.map((page) => ({
    page,
    mediaBox: [...MEDIA_BOX],
    rotation: 0,
    blocks: truth.values
      .filter((value) => value.page === page)
      .map((value, index) => ({ anchorId: `p${page}-b${index + 1}`, text: value.text, bbox: [50, 50 + 30 * index, 500, 70 + 30 * index], charBoxes: [], hidden: [] })),
  }));
  const partly = unread.length > 0;
  return {
    contractVersion: '1.0.0',
    producer: TEST_PRODUCER,
    job,
    format: 'pdf',
    analysis: partly ? { status: 'partly_analysed', unit: 'pages', read: read.length, total: truth.pageCount } : { status: 'analysed' },
    coverage: { pages: { total: truth.pageCount, read: runs(read), unread } },
    pdf: { pages },
    findings: [],
    derivatives: [],
  };
}

/** The draft IDS v0.1 file's reference, as the worker sends it with an IFC job (prompt 3 5.2). */
export const IDS_PATH = join(REPOSITORY_ROOT, 'fixtures', 'ids', 'sovitech-ifc-minimum-v0.1.ids');
export function idsReference(): { id: string; version: string; draft: boolean; sha256: string; path: string } {
  return {
    id: 'sovitech-ifc-minimum',
    version: '0.1',
    draft: true,
    sha256: `sha256:${createHash('sha256').update(readFileSync(IDS_PATH)).digest('hex')}`,
    path: IDS_PATH,
  };
}

/**
 * An IFC model's output from its ground truth while `ifc-values` is closed: stored and not
 * analysed ("IFC model"), the engineer-only record (header, classes, schema check not run,
 * the expected IDS results as spec ids, counts and failing GlobalIds), and the ground
 * truth's rule 14 findings (the embedded instruction; the element on a switched-off layer).
 */
/** One expected specification of fixtures/ids/expected/, as the contract's IdsSpecResult. */
interface ExpectedSpec {
  readonly identifier: string;
  readonly status: string;
  readonly applicableCount?: number;
  readonly passCount?: number;
  readonly failCount?: number;
  readonly failingGlobalIds?: string[];
}

/**
 * A specification skipped because its ifcVersion leaves out the model's schema applies to no
 * element of the model, so it is not applicable with no element counted (the expected file
 * holds no counts for it). Any other specification must carry its counts: a missing count is an
 * error, never a zero (rule 1, "Zero is a value"; phase 2 integrator's section 14 grep).
 */
function idsSpecResult(spec: ExpectedSpec): Record<string, unknown> {
  if (spec.status === 'skipped') return { specId: spec.identifier, outcome: 'not_applicable', applicable: 0, passed: 0, failed: 0, failingGlobalIds: [] };
  const { applicableCount, passCount, failCount, failingGlobalIds } = spec;
  if (applicableCount === undefined || passCount === undefined || failCount === undefined || failingGlobalIds === undefined) {
    throw new Error(`the expected IDS result ${spec.identifier} carries no counts`);
  }
  if (spec.status !== 'pass' && spec.status !== 'fail') throw new Error(`the expected IDS result ${spec.identifier} has the status ${spec.status}`);
  return { specId: spec.identifier, outcome: spec.status, applicable: applicableCount, passed: passCount, failed: failCount, failingGlobalIds };
}

export function ifcOutput(job: Job, groundTruth: string, idsExpected?: string): Record<string, unknown> {
  const truth = json(groundTruth) as {
    schema: string;
    header: { originatingSystem: string };
    project: { globalId: string };
    findings: { kind: string; globalId: string; stepId: number }[];
  };
  const expected =
    idsExpected === undefined
      ? undefined
      : (json(idsExpected) as {
          specifications: ExpectedSpec[];
        });
  const reference = idsReference();
  const classes = ['IfcProject', 'IfcSite', 'IfcBuilding', 'IfcBuildingStorey', 'IfcSpace', 'IfcBuildingElementProxy'];
  return {
    contractVersion: '1.0.0',
    producer: TEST_PRODUCER,
    job,
    format: 'ifc',
    analysis: { status: 'stored_only', formatWord: 'IFC model' },
    coverage: { ifc: { classesRead: classes, notRead: [{ scope: 'geometry', reason: 'geometry.not_processed', globalIds: [], stepIds: [] }] } },
    ifcModel: {
      header: { schema: truth.schema, authoringTool: truth.header.originatingSystem, ifcProjectGlobalId: truth.project.globalId },
      classesPresent: classes,
      // As the IFC reader records it: geometry is not processed, so the reading is partial (ADR 0031).
      processing: 'partial',
      schemaCheck: { tool: { name: 'test-schema-checker', version: '0' }, outcome: 'not_run' },
      ...(expected === undefined
        ? {}
        : {
            ids: {
              ids: { id: reference.id, version: reference.version, draft: reference.draft, sha256: reference.sha256 },
              tool: { name: 'test-ids-checker', version: '0' },
              specifications: expected.specifications.map(idsSpecResult),
            },
          }),
    },
    findings: truth.findings.map((finding) => ({
      kind: finding.kind === 'embedded_instruction' ? 'embedded_instruction' : 'hidden_content',
      // The IFC reader's codes (packages/ifc-reader/src/instructions.ts and reading.ts): the fixture's
      // Description tells the reader to ignore its instructions, an `override`.
      code: finding.kind === 'embedded_instruction' ? 'embedded_instruction.override' : 'hidden_content.layer_off',
      locator: { kind: 'ifc', globalId: finding.globalId, stepIds: [finding.stepId] },
    })),
    derivatives: [],
  };
}
