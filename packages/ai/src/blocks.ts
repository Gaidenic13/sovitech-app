/**
 * Delimited data blocks (guardrails rule 14, "Separation: Documents reach the AI inside
 * delimited data blocks"; section 6, "Documents are sent as delimited data").
 *
 * Document text is sent verbatim, never escaped or rewritten, because the evidence
 * verifier compares the model's excerpts with the stored text (rule 1). What keeps a
 * document from closing its own block is the delimiter: every tag of a request carries
 * a nonce derived from the whole request's content (a SHA-256 prefix), which a document
 * cannot contain without containing a hash of itself. A request whose text holds its
 * own nonce is refused. Attribute values (ids, hashes, file names) are written by code
 * and escaped.
 */
import { createHash } from 'node:crypto';

/** Where a text block sits in its document: a page, or a sheet and cell. */
export interface BlockLocator {
  readonly page?: number;
  readonly sheet?: string;
  readonly cell?: string;
}

/** One block of extracted text, as the extractor stored it. */
export interface TextBlockForAi {
  readonly locator: BlockLocator;
  /** Verbatim text of the stored revision. */
  readonly text: string;
  /** Text the extractor flagged as hidden (white or tiny text, outside the page, a hidden layer; rule 14). */
  readonly hidden?: boolean;
}

/** A document's extracted text, for one project. */
export interface DocumentForAi {
  readonly projectId: string;
  readonly documentId: string;
  /** `sha256:<64 hex>` of the stored file: the revision that was read. */
  readonly contentHash: string;
  /**
   * The name the document's block carries. While `ai-processor-route` is closed, a name code
   * set (the fixture's file name or the document id: guard.ts, nameForModel); the owner's
   * typed name only once the gate is open.
   */
  readonly name: string;
  readonly blocks: readonly TextBlockForAi[];
}

export class DataBlockError extends Error {
  override name = 'DataBlockError';
}

const DOCUMENT_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;
export const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/;

/** The key of a locator, for comparing what was sent with what the model cites. Nulls read as absent. */
export function locatorKey(locator: { readonly page?: number | null; readonly sheet?: string | null; readonly cell?: string | null }): string {
  const page = locator.page === null || locator.page === undefined ? '' : `${locator.page}`;
  return `p:${page}|s:${locator.sheet ?? ''}|c:${locator.cell ?? ''}`;
}

/** Whether a block locator names a place: a page of one or more, or a sheet (with or without a cell). */
export function isUsableLocator(locator: BlockLocator): boolean {
  const page = locator.page;
  const pageOk = page === undefined || (Number.isInteger(page) && page >= 1);
  const hasPlace = page !== undefined || (locator.sheet !== undefined && locator.sheet !== '');
  const cellOk = locator.cell === undefined || (locator.sheet !== undefined && locator.cell !== '');
  return pageOk && hasPlace && cellOk;
}

/** The request nonce: the first 16 hex digits of SHA-256 over every part of the request, in order. */
export function requestNonce(parts: readonly string[]): string {
  const hash = createHash('sha256');
  for (const part of parts) {
    hash.update(part);
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

/** Escapes an attribute value written by code. */
export function attribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function locatorAttributes(locator: BlockLocator): string {
  const parts: string[] = [];
  if (locator.page !== undefined) parts.push(`page="${locator.page}"`);
  if (locator.sheet !== undefined) parts.push(`sheet="${attribute(locator.sheet)}"`);
  if (locator.cell !== undefined) parts.push(`cell="${attribute(locator.cell)}"`);
  return parts.join(' ');
}

/** Checks a document's shape before it is sent. Messages name ids only, never text. */
export function assertSendableDocument(document: DocumentForAi): void {
  if (!DOCUMENT_ID.test(document.documentId)) throw new DataBlockError(`document id ${JSON.stringify(document.documentId)} is not an id`);
  if (!CONTENT_HASH.test(document.contentHash)) {
    throw new DataBlockError(`document ${document.documentId}: its content hash is not "sha256:" and 64 hex digits`);
  }
  if (document.blocks.length === 0) throw new DataBlockError(`document ${document.documentId} has no text block`);
  const seen = new Set<string>();
  document.blocks.forEach((block, index) => {
    if (!isUsableLocator(block.locator)) throw new DataBlockError(`document ${document.documentId}, block ${index}: the locator names no page or sheet`);
    const key = locatorKey(block.locator);
    if (seen.has(key)) throw new DataBlockError(`document ${document.documentId}, block ${index}: two blocks share one locator`);
    seen.add(key);
  });
}

/** A document as one delimited block, its text verbatim. */
export function renderDocumentBlock(document: DocumentForAi, nonce: string): string {
  const lines = [
    `<document_${nonce} id="${attribute(document.documentId)}" content_hash="${attribute(document.contentHash)}" name="${attribute(document.name)}">`,
  ];
  for (const block of document.blocks) {
    const hidden = block.hidden === true ? ' hidden="true"' : '';
    lines.push(`<block_${nonce} ${locatorAttributes(block.locator)}${hidden}>`, block.text, `</block_${nonce}>`);
  }
  lines.push(`</document_${nonce}>`);
  return lines.join('\n');
}

/** A delimited block of data written by code (the request state, reference material, project facts). */
export function renderCodeBlock(tag: string, nonce: string, body: string, attributes: Readonly<Record<string, string>> = {}): string {
  if (!/^[a-z_]+$/.test(tag)) throw new DataBlockError(`block tag ${JSON.stringify(tag)} is not a tag name`);
  const attrs = Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${attribute(value)}"`)
    .join('');
  return `<${tag}_${nonce}${attrs}>\n${body}\n</${tag}_${nonce}>`;
}

/** Throws when any text of the request contains its nonce: the text could then close a block. */
export function assertNonceAbsent(nonce: string, texts: readonly string[]): void {
  if (texts.some((text) => text.includes(nonce))) {
    throw new DataBlockError('a text of the request contains the request nonce, so its blocks could not be delimited; the request is refused');
  }
}
