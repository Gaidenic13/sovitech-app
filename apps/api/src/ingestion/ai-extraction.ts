/**
 * The AI's extraction of a document's values, after the extractor stored its text
 * (prompt 3 section 10, phase 2, "The AI boundary"; F-EXTRACT-02 to F-EXTRACT-05;
 * docs/adr/0021, 0023, 0027).
 *
 * It runs only with an API key configured (the owner's answer of 2026-09-25); without one
 * it reports "not running" and nothing is sent. The boundary (packages/ai) builds the
 * request from this one project in delimited blocks of the stored, visible text only,
 * guards the `ai-processor-route` gate (fixture content only while it is closed), and
 * validates the output. What it proposes then goes through the one ingestion path, with
 * the model id the API returned (./proposals.ts): nothing the AI says is stored unverified.
 * The AI's findings and refusals become guardrail events, with codes (rule 14; section 8).
 *
 * The name sent with the document is set by code while `ai-processor-route` is closed: the
 * fixture's file name, or the document id, never the name the owner typed (rule 13,
 * "Processing"; D-09; phase 2 review, adversarial finding on the owner-typed file name).
 * Each completed run leaves a search record with the document's text: the parts it sent and
 * the fields it answered "not found" (rule 12, "Code records coverage"), which is all a
 * "Not found in the analysed documents" statement may count as searched
 * (documents/coverage.ts, searchedCoverage).
 *
 * Asked fields: the registry's fields of the project and the building that are neither the
 * owner's four step 1 answers (rule 7; the project name is never evidence, rule 1) nor an
 * owner's decision (rule 3).
 */
import {
  appendGuardrailEvent,
  ensureBuildingSubject,
  fileNamePart,
  newId,
  projectIsDemo,
  readDocumentTexts,
  readProjectDocuments,
  storeDocumentTexts,
  withRequest,
  type Request,
  type Store,
} from '@sovitech/db';
import { nameForModel, runExtraction, toCandidateProposal, type BlockLocator, type BoundaryDeps, type ExtractionRun, type FieldForAi, type TextBlockForAi } from '@sovitech/ai';
import { productionRegistry, registryLookups } from '@sovitech/registry';
import { AI_SEARCH_FORMAT, AI_SEARCH_PART_PREFIX, formatAiSearchRecord, wholeNumber, type AiSearchRecord } from '../documents/coverage';
import { ingestProposals, type IncomingProposal, type ProposalOutcome } from './proposals';

const lookups = registryLookups(productionRegistry);

/** The fields the AI is asked about: the project's and the building's, not the owner's answers or decisions. */
export function fieldsForAi(): FieldForAi[] {
  return productionRegistry.fields
    .filter((field) => (field.subject === 'project' || field.subject === 'building') && field.kind !== 'decision' && field.criticality !== 'required')
    .map((field) => ({
      key: field.key,
      label: field.label,
      subject: field.subject,
      kind: field.kind,
      ...(field.unit === undefined ? {} : { unit: field.unit }),
      ...(field.qualifiers === undefined ? {} : { qualifiers: field.qualifiers }),
      ...(field.options === undefined ? {} : { options: field.options }),
    }));
}

/** A stored text part as the AI's data block locator: a page, or a sheet's cell. Whole-sheet parts are not sent twice. */
function blockOf(part: string, text: string): TextBlockForAi | undefined {
  const page = /^page:(\d{1,6})$/u.exec(part);
  const position = page?.[1] === undefined ? undefined : wholeNumber(page[1]);
  if (position !== undefined) return { locator: { page: position }, text };
  const cell = /^cell:(.+)!([A-Z]{1,3}[1-9][0-9]{0,6})$/u.exec(part);
  if (cell?.[1] !== undefined && cell[2] !== undefined) return { locator: { sheet: cell[1], cell: cell[2] }, text };
  return undefined;
}

export type AiStep =
  | { readonly outcome: 'not_running'; readonly reason: string }
  | { readonly outcome: 'refused' | 'failed'; readonly codes: readonly string[] }
  | { readonly outcome: 'completed'; readonly modelId: string; readonly proposals: readonly ProposalOutcome[] };

/** Runs the AI's extraction of one document and ingests what it proposes. */
export async function extractWithAi(
  input: { readonly store: Store; readonly serviceId: string; readonly projectId: string; readonly documentId: string },
  deps: BoundaryDeps | { readonly notRunning: string },
): Promise<AiStep> {
  if ('notRunning' in deps) return { outcome: 'not_running', reason: deps.notRunning };
  const scope = { userId: input.serviceId, projectId: input.projectId };
  const prepared = await withRequest(input.store, scope, async (request) => {
    const { documents } = await readProjectDocuments(request);
    const document = documents.find((candidate) => candidate.id === input.documentId);
    if (document === undefined) return undefined;
    const parts = await readDocumentTexts(request, document.contentHash, '');
    const blocks = parts.flatMap((part) => blockOf(part.part, part.text) ?? []);
    const uploadedName = parts.find((part) => part.part === fileNamePart(document.id))?.text;
    const name = nameForModel({ documentId: document.id, contentHash: document.contentHash, uploadedName }, deps);
    return { document, blocks, name, demo: (await projectIsDemo(request)) === true };
  });
  if (prepared === undefined) return { outcome: 'failed', codes: ['document_unavailable'] };

  const run: ExtractionRun = await runExtraction(
    {
      project: { id: input.projectId, demo: prepared.demo },
      documents: [{ projectId: input.projectId, documentId: prepared.document.id, contentHash: prepared.document.contentHash, name: prepared.name, blocks: prepared.blocks }],
      fields: fieldsForAi(),
    },
    deps,
  );
  if (run.outcome === 'refused') return { outcome: 'refused', codes: run.refusals.map((refusal) => refusal.code) };

  return withRequest(input.store, scope, async (request) => {
    for (const event of run.guardrailEvents) {
      await appendGuardrailEvent(request, {
        type: event.type,
        ...(event.reason === undefined ? {} : { reason: event.reason }),
        ...(event.fieldKey !== undefined && lookups.field(event.fieldKey) !== undefined ? { fieldKey: event.fieldKey } : {}),
        actor: input.serviceId,
      });
    }
    if (run.outcome === 'failed') return { outcome: 'failed' as const, codes: [run.problem] };
    await recordAiSearch(request, { documentId: prepared.document.id, contentHash: prepared.document.contentHash, serviceId: input.serviceId, run });

    for (const finding of run.findings) {
      if (finding.kind === 'embedded_instruction' && finding.documentId === prepared.document.id) {
        await appendGuardrailEvent(request, { type: 'embedded_instruction', subjectId: prepared.document.id, reason: 'ai_finding', actor: input.serviceId });
      }
    }
    const building = await ensureBuildingSubject(request, input.serviceId);
    const incoming: IncomingProposal[] = run.proposals.map((proposal) => {
      const subject = proposal.candidate.subject;
      const subjectId =
        subject.kind === 'project'
          ? input.projectId
          : subject.kind === 'building'
            ? building
            : subject.kind === 'document' && subject.ref === prepared.document.id
              ? prepared.document.id
              : '';
      return { proposal: toCandidateProposal(proposal, subjectId), modelId: proposal.modelId };
    });
    const proposals = await ingestProposals(request, { projectId: input.projectId, serviceId: input.serviceId, proposals: incoming, field: lookups.field });
    return { outcome: 'completed' as const, modelId: run.modelId, proposals };
  });
}

/** A block locator as the stored text part it was built from: `page:<n>` or `cell:<sheet>!<cell>`. */
function partOfBlock(locator: { readonly page?: number | null; readonly sheet?: string | null; readonly cell?: string | null }): string | undefined {
  if (locator.page !== undefined && locator.page !== null) return `page:${locator.page}`;
  if (locator.sheet !== undefined && locator.sheet !== null && locator.cell !== undefined && locator.cell !== null) return `cell:${locator.sheet}!${locator.cell}`;
  return undefined;
}

/**
 * The search record of a completed run over one document revision (rule 12, "Code records
 * coverage"): the fields it asked, the parts code sent, and for each field it answered "not
 * found" the sent parts that answer named as read (the whole document, a sheet, a page or a
 * cell; a whole document or sheet means every sent part of it). Stored with the document's
 * text, under `ai:searched:<run id>`, so the erasure takes it with the rest.
 */
export function aiSearchRecord(
  input: { readonly documentId: string; readonly contentHash: string; readonly run: Extract<ExtractionRun, { outcome: 'completed' }> },
): AiSearchRecord | undefined {
  const { run } = input;
  const coverage = run.coverage.find((entry) => entry.documentId === input.documentId && entry.contentHash === input.contentHash);
  if (coverage === undefined) return undefined;
  const sent = [...new Set(coverage.locators.flatMap((locator: BlockLocator) => partOfBlock(locator) ?? []))];
  const named = (locator: { readonly page: number | null; readonly sheet: string | null; readonly cell: string | null }): string[] => {
    if (locator.page === null && locator.sheet === null && locator.cell === null) return sent;
    if (locator.page === null && locator.sheet !== null && locator.cell === null) return sent.filter((part) => part.startsWith(`cell:${locator.sheet}!`));
    const part = partOfBlock(locator);
    return part !== undefined && sent.includes(part) ? [part] : [];
  };
  const notFound = new Map<string, Set<string>>();
  for (const answer of run.notFound) {
    for (const searched of answer.searched) {
      if (searched.documentId !== input.documentId) continue;
      const parts = notFound.get(answer.fieldKey) ?? new Set<string>();
      for (const locator of searched.locators) for (const part of named(locator)) parts.add(part);
      notFound.set(answer.fieldKey, parts);
    }
  }
  const receivedAt = run.attempts.flatMap((attempt) => (attempt.receivedAt === undefined ? [] : [attempt.receivedAt])).at(-1);
  return {
    format: AI_SEARCH_FORMAT,
    documentId: input.documentId,
    contentHash: input.contentHash,
    modelId: run.modelId,
    completedAt: receivedAt ?? new Date().toISOString(),
    fields: [...new Set(run.attempts.flatMap((attempt) => attempt.fieldKeys ?? []))],
    sent,
    notFound: [...notFound].map(([fieldKey, parts]) => ({ fieldKey, parts: [...parts] })),
  };
}

/** Stores the search record of a completed run with the document's text (the service account's request). */
export async function recordAiSearch(
  request: Request,
  input: { readonly documentId: string; readonly contentHash: string; readonly serviceId: string; readonly run: Extract<ExtractionRun, { outcome: 'completed' }> },
): Promise<void> {
  const record = aiSearchRecord(input);
  if (record === undefined) return;
  await storeDocumentTexts(request, {
    contentHash: input.contentHash,
    parts: [{ part: `${AI_SEARCH_PART_PREFIX}${newId()}`, text: formatAiSearchRecord(record) }],
    createdBy: input.serviceId,
  });
}
