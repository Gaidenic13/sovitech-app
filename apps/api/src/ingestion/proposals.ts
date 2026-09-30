/**
 * The one ingestion path for `document` and `ai_inference` candidates (prompt 3
 * section 6: "Only the ingestion path in `apps/api` creates `document` and
 * `ai_inference` candidates, and only after code verifies the evidence. The extractor
 * and the AI propose; the API verifies and writes. One verifier serves both.";
 * guardrails rule 1 "Enforced by", 2.1, rule 13, rule 14; F-EXTRACT-04, F-EXTRACT-05;
 * docs/adr/0027-evidence-verifier-and-ingestion.md).
 *
 * For each proposal, in the extraction service account's request (the system, a member
 * of the project; 2.1 "Who can create it"):
 * 1. the field must be a registry field;
 * 2. the domain's verifier runs rule 1's five checks against what the store holds for
 *    this project, with no "direct count" the proposer names (`proposalForVerifier`): its
 *    documents (another project's are invisible, so check 1 fails,
 *    G13-1), the extracted text at each locator (visible text only, rule 14, G14-2), the
 *    strict runtime locator schema of the extraction contract (an IFC locator is refused,
 *    G1-13), and the rule 8 parser for check 5; it decides the source and caps the
 *    confidence;
 * 3. an accepted candidate is stored with its evidence (the store checks the unit's
 *    dimension against the field, 2.7, and the evidence's project and revision again),
 *    and a proposal from the AI records the model id the API returned with it
 *    (build-readiness 3 item 6);
 * 4. a rejection stores nothing but its guardrail events, with codes, never text.
 */
import {
  appendGuardrailEvent,
  existingSubjects,
  insertCandidate,
  newId,
  readDocumentTexts,
  readProjectDocuments,
  recordCandidateAiOrigin,
  type Request,
} from '@sovitech/db';
import {
  verifyProposal,
  type CandidateProposal,
  type EvidenceLocator,
  type FieldDefinition,
  type GuardrailEvent,
  type LocatedText,
  type LocatorParse,
  type ProposalContext,
} from '@sovitech/domain';
import { parseEvidenceLocator } from '@sovitech/extraction-contract';
import type { UnitCheckedField } from '@sovitech/registry';
import { readQuantities } from './quantities';

/** A proposal as it reaches the ingestion path, its subject resolved by code. */
export interface IncomingProposal {
  readonly proposal: CandidateProposal;
  /** For a proposal from the AI: the model id the API returned with it. */
  readonly modelId?: string;
}

export type ProposalOutcome =
  | { readonly fieldKey: string; readonly outcome: 'stored'; readonly candidateId: string; readonly source: 'document' | 'ai_inference' }
  | { readonly fieldKey: string; readonly outcome: 'rejected'; readonly code: string };

/** The extraction contract's strict Evidence.locator, as the verifier reads it (G1-13). */
export const contractLocatorParser = (input: unknown): LocatorParse => {
  const parsed = parseEvidenceLocator(input);
  if (parsed.ok) return { ok: true, locator: parsed.value as EvidenceLocator };
  const codes = new Set(parsed.problems.map((problem) => problem.code));
  return { ok: false, problem: codes.has('ifc_field') ? 'ifc_field' : codes.has('unknown_key') ? 'unknown_key' : 'shape' };
};

/** The stored text part a locator names: a page, a sheet's cell, or a whole sheet. A region is not resolved (fail closed). */
export function partOf(locator: EvidenceLocator): string | undefined {
  if (locator.bbox !== undefined) return undefined;
  if (locator.page !== undefined) return `page:${locator.page}`;
  if (locator.sheet !== undefined) return locator.cell === undefined ? `sheet:${locator.sheet}` : `cell:${locator.sheet}!${locator.cell}`;
  return undefined;
}

/**
 * The proposal as the verifier gets it on the one ingestion path: an inferred quantity without the name "direct count"
 * its proposer gives it. The verifier accepts an inferred count cited to excerpts that hold digits only when it is named
 * a direct count, and neither the validator nor the verifier can tell a count of the items at a place from a sum of the
 * numbers written there (rule 1: "Sums ... are never produced by the AI"). So until a check tells them apart (proposal
 * P-2-INFERENCE-KIND, build log phase 2), the name reaches the verifier from no caller, and every such count is refused,
 * as the AI boundary, which drops every kind, already makes it (packages/ai, `toCandidateProposal`). Only that name is
 * removed, so nothing else the verifier refuses is let through: a direct count on a `document` proposal or on a value
 * that is not a quantity is still refused as malformed, and a count named another kind is still refused.
 */
export function proposalForVerifier(proposal: CandidateProposal): CandidateProposal {
  if (proposal.source !== 'ai_inference' || proposal.quantity === undefined || proposal.inference !== 'direct_count') return proposal;
  const copy: { -readonly [Key in keyof CandidateProposal]: CandidateProposal[Key] } = { ...proposal };
  delete copy.inference;
  return copy;
}

/** Only the extracted text parts a locator can name; a file name or a model header never resolves as evidence. */
const EVIDENCE_PART = /^(?:page|cell|sheet):/u;

/** Stores the proposals that pass the verifier; rejects and logs the rest. Runs in the service account's request. */
export async function ingestProposals(
  request: Request,
  input: {
    readonly projectId: string;
    readonly serviceId: string;
    readonly proposals: readonly IncomingProposal[];
    readonly field: (key: string) => (FieldDefinition & UnitCheckedField) | undefined;
  },
): Promise<ProposalOutcome[]> {
  const { documents } = await readProjectDocuments(request);
  const byId = new Map(documents.map((document) => [document.id, document]));
  const hashes = new Set(
    input.proposals.flatMap((incoming) => (Array.isArray(incoming.proposal.evidence) ? incoming.proposal.evidence.map((entry) => entry.contentHash) : [])),
  );
  const texts = new Map<string, Map<string, string>>();
  for (const hash of hashes) {
    if (typeof hash !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(hash)) continue;
    const parts = await readDocumentTexts(request, hash, '');
    texts.set(hash, new Map(parts.filter((part) => EVIDENCE_PART.test(part.part)).map((part) => [part.part, part.text])));
  }
  const textAt = (documentId: string, contentHash: string, locator: EvidenceLocator): LocatedText | undefined => {
    const document = byId.get(documentId);
    if (document === undefined || document.contentHash !== contentHash) return undefined;
    const part = partOf(locator);
    const text = part === undefined ? undefined : texts.get(contentHash)?.get(part);
    return text === undefined ? undefined : { text, layer: 'text' };
  };
  const subjects = await existingSubjects(request, input.proposals.map((incoming) => incoming.proposal.subjectId));

  const log = async (events: readonly GuardrailEvent[]): Promise<void> => {
    for (const event of events) {
      await appendGuardrailEvent(request, {
        type: event.type,
        ...(event.subjectId !== undefined && subjects.has(event.subjectId) ? { subjectId: event.subjectId } : {}),
        ...(event.fieldKey === undefined ? {} : { fieldKey: event.fieldKey }),
        ...(event.reason === undefined ? {} : { reason: event.reason }),
        actor: input.serviceId,
      });
    }
  };

  const outcomes: ProposalOutcome[] = [];
  for (const incoming of input.proposals) {
    const proposal = incoming.proposal;
    const field = input.field(proposal.fieldKey);
    if (field === undefined || !subjects.has(proposal.subjectId)) {
      const code = field === undefined ? 'unknown_field' : 'subject_unresolved';
      await log([{ type: 'ai_output_rejected', projectId: input.projectId, subjectId: proposal.subjectId, reason: code }]);
      outcomes.push({ fieldKey: proposal.fieldKey, outcome: 'rejected', code });
      continue;
    }
    const context: ProposalContext = {
      projectId: input.projectId,
      field,
      document: (documentId) => byId.get(documentId),
      textAt,
      readQuantities,
      parseLocator: contractLocatorParser,
      candidateId: newId(),
      createdBy: input.serviceId,
      createdAt: new Date().toISOString(),
    };
    const verdict = verifyProposal(proposalForVerifier(proposal), context);
    if (verdict.outcome === 'rejected') {
      await log(verdict.guardrailEvents);
      const rejection = verdict.rejection;
      const code =
        rejection.kind === 'evidence_check_failed'
          ? rejection.locatorProblem === undefined
            ? rejection.check
            : `${rejection.check}.${rejection.locatorProblem}`
          : rejection.kind === 'malformed'
            ? `proposal_${rejection.problem}`
            : rejection.kind;
      outcomes.push({ fieldKey: proposal.fieldKey, outcome: 'rejected', code });
      continue;
    }
    const candidate = verdict.candidate;
    const written = await insertCandidate(request, candidate, field);
    if (written.outcome === 'stored') {
      if (incoming.modelId !== undefined) await recordCandidateAiOrigin(request, { candidateId: candidate.id, modelId: incoming.modelId, createdBy: input.serviceId });
      outcomes.push({ fieldKey: proposal.fieldKey, outcome: 'stored', candidateId: candidate.id, source: candidate.source === 'document' ? 'document' : 'ai_inference' });
    } else if (written.outcome === 'rejected') {
      outcomes.push({ fieldKey: proposal.fieldKey, outcome: 'rejected', code: written.refusal });
    } else {
      await log([{ type: 'ai_output_rejected', projectId: input.projectId, subjectId: proposal.subjectId, fieldKey: proposal.fieldKey, reason: `unit_${written.refusal}` }]);
      outcomes.push({ fieldKey: proposal.fieldKey, outcome: 'rejected', code: `unit_${written.refusal}` });
    }
  }
  return outcomes;
}
