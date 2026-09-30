/**
 * The shapes of the guardrail evals' fixture files, as the eval runner reads them
 * (packages/ai/src/evals/fixtures.ts; evals/guardrails/README.md, "Fixture formats"):
 *
 * - a document fixture (`sovitech-eval-document/1`): the extracted text of one synthetic
 *   document, block by block, as the extractor would store it. A block is a page, or a
 *   sheet and a cell; `hidden` marks text the extractor flags as hidden (rule 14). Two
 *   blocks never share a locator (packages/ai/src/blocks.ts).
 * - a drafting fixture (`sovitech-eval-drafting/1`): the slots, tokens and project facts
 *   of a drafting request, in words, never a figure.
 *
 * Each case's content lives in its own folder, fixtures/evals/<ID>/source.ts, so a case's
 * own numbers from guardrails section 7 stay under fixtures/evals/<ID>/, the only place
 * outside tests/guardrails/ where the figure checks allow them (prompt 3 section 14 item 3;
 * tools/checks/mockup-figures.txt). This file and the generator hold no figure.
 */

export const DOCUMENT_FIXTURE_FORMAT = 'sovitech-eval-document/1';
export const DRAFTING_FIXTURE_FORMAT = 'sovitech-eval-drafting/1';

export interface EvalDocumentBlock {
  readonly page?: number;
  readonly sheet?: string;
  readonly cell?: string;
  readonly text: string;
  readonly hidden?: boolean;
}

export interface EvalDocumentFixture {
  readonly format: typeof DOCUMENT_FIXTURE_FORMAT;
  /** Starts with "TEST-" (the runner's schema). */
  readonly documentId: string;
  /** The file name, as an owner's upload would carry it. */
  readonly name: string;
  readonly blocks: readonly EvalDocumentBlock[];
}

export interface EvalDraftingFixture {
  readonly format: typeof DRAFTING_FIXTURE_FORMAT;
  readonly slots: readonly { readonly id: string; readonly purpose: string }[];
  readonly tokens: readonly { readonly token: string; readonly label: string; readonly badge?: string | null; readonly status?: readonly string[] }[];
  readonly facts: readonly string[];
  readonly names?: readonly string[];
}

/** One fixture file of a case: its name inside fixtures/evals/<ID>/, and its content. */
export interface EvalFixtureFile {
  readonly file: string;
  readonly content: EvalDocumentFixture | EvalDraftingFixture;
}

/** A case's fixture files. */
export interface EvalCaseFixtures {
  readonly id: string;
  readonly files: readonly EvalFixtureFile[];
}

/** A page block: its lines joined by newlines, as the extractor stores a page's text layer. */
export function page(number: number, lines: readonly string[], options: { readonly hidden?: boolean } = {}): EvalDocumentBlock {
  return { page: number, text: lines.join('\n'), ...(options.hidden === true ? { hidden: true } : {}) };
}

/** A document fixture file. */
export function documentFile(file: string, content: Omit<EvalDocumentFixture, 'format'>): EvalFixtureFile {
  return { file, content: { format: DOCUMENT_FIXTURE_FORMAT, ...content } };
}

/** A drafting fixture file. */
export function draftingFile(file: string, content: Omit<EvalDraftingFixture, 'format'>): EvalFixtureFile {
  return { file, content: { format: DRAFTING_FIXTURE_FORMAT, ...content } };
}
