/**
 * An inference's confidence against the evidence that remains (docs/guardrails.md rule 3, "Confidence is set by the
 * evidence and capped by code"; 2.3, "A candidate or asset with evidence from other active documents keeps that
 * evidence"; case G3-18). The fix round 3 finding: "hotel" inferred from a label that names the building's use and from
 * a room schedule, claimed high, was stored high, and after the label's document was deleted the candidate stayed,
 * still high, although the room schedule alone supports at most medium (G3-17). Derive now reads the stored confidence
 * capped again by the evidence that remains, never higher than stored. Every value is TEST data.
 */
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
  NO_EVENTS,
  confidenceCap,
  derive,
  derivedConfidence,
  evidenceCap,
  lowerConfidence,
  verifyProposal,
  type Candidate,
  type CandidateProposal,
  type Confidence,
  type DeriveContext,
  type DocumentEvent,
  type DocumentRecord,
  type Evidence,
  type FieldDefinition,
  type ProposalContext,
} from './index';

const PROJECT = 'test-project-confidence';
const BUILDING = 'test-building-confidence';
const typeField: FieldDefinition = {
  key: 'test.building.type',
  label: 'TEST building type',
  subject: 'building',
  kind: 'enum',
  options: ['hotel', 'office'],
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'owner',
};

const doc = (id: string): DocumentRecord => ({
  id,
  projectId: PROJECT,
  contentHash: `sha256:${id}`,
  kind: 'other',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST' },
});
const label = doc('test-doc-label');
const rooms = doc('test-doc-rooms');
const negating = doc('test-doc-negating');
const named = doc('test-doc-named');
const DOCUMENTS = [label, rooms, negating, named];
const PAGES = new Map<string, string>([
  [label.id, 'TEST Destinatia cladirii: hotel'],
  [rooms.id, 'TEST Tabel camere: 212 camere'],
  [negating.id, 'TEST Cladirea nu este un hotel. Alt capitol TEST'],
  [named.id, 'TEST Hotel de categoria TEST'],
]);

const proposalContext = (candidateId: string): ProposalContext => ({
  projectId: PROJECT,
  field: typeField,
  document: (id) => DOCUMENTS.find((document) => document.id === id),
  textAt: (documentId, contentHash, locator) => {
    const text = PAGES.get(documentId);
    return text === undefined || contentHash !== `sha256:${documentId}` || locator.page !== 1 ? undefined : { text, layer: 'text' };
  },
  readQuantities: () => [],
  candidateId,
  createdBy: 'test-service',
  createdAt: '2026-09-30T10:00:00.000Z',
});

const deriveContext: DeriveContext = {
  subjectId: BUILDING,
  document: (id) => DOCUMENTS.find((document) => document.id === id),
  inputState: () => undefined,
  datasetApproved: () => false,
  unit: () => undefined,
};

const entry = (document: DocumentRecord, excerpt: string) => ({ documentId: document.id, contentHash: document.contentHash, locator: { page: 1 }, excerpt });

/** The entries a proposal may cite: a label naming the type, a room count, a negation shown and one left out, a name. */
const ENTRIES = [
  entry(label, 'Destinatia cladirii: hotel'),
  entry(rooms, '212 camere'),
  entry(negating, 'Cladirea nu este un hotel.'),
  entry(negating, 'este un hotel'),
  entry(named, 'Hotel de categoria TEST'),
] as const;

const hotel = (evidence: CandidateProposal['evidence'], confidence?: Confidence): CandidateProposal => ({
  subjectId: BUILDING,
  fieldKey: typeField.key,
  choice: 'hotel',
  source: 'ai_inference',
  inference: 'classification',
  ...(confidence === undefined ? {} : { confidence }),
  evidence,
});

const deleted = (documents: readonly DocumentRecord[]): DocumentEvent[] =>
  documents.map((document) => ({ documentId: document.id, type: 'withdrawn', by: 'test-owner', role: 'owner', at: '2026-09-30T11:00:00.000Z' }));

const RANK: readonly Confidence[] = ['low', 'medium', 'high'];
const atMost = (value: Confidence | undefined, bound: Confidence): boolean => value !== undefined && RANK.indexOf(value) <= RANK.indexOf(bound);

const stored = (evidence: readonly Evidence[], confidence: Confidence | undefined, source: Candidate['source'] = 'ai_inference'): Candidate => ({
  id: 'test-cand-stored',
  subjectId: BUILDING,
  fieldKey: typeField.key,
  choice: 'hotel',
  source,
  evidence,
  ...(confidence === undefined ? {} : { confidence }),
  authorRole: 'system',
  createdBy: 'test-service',
  createdAt: '2026-09-30T10:00:00.000Z',
});
const verifiedEntry = (document: DocumentRecord, excerpt: string, check: Evidence['check'] = 'text_match'): Evidence => ({ ...entry(document, excerpt), check });

describe('F-VALUE-02 · rule 3: the cap an entry supports, read from the entry as stored', () => {
  test('F-VALUE-02: low on unverifiable evidence, high when the excerpt names the option with no negation governing it, otherwise medium', () => {
    expect(evidenceCap(verifiedEntry(label, 'Destinatia cladirii: hotel', 'unverifiable'), 'hotel')).toBe('low');
    expect(evidenceCap(verifiedEntry(label, 'Destinatia cladirii: hotel'), 'hotel')).toBe('high');
    expect(evidenceCap(verifiedEntry(label, 'Destinatia cladirii: hotel'), 'office')).toBe('medium');
    expect(evidenceCap(verifiedEntry(negating, 'Cladirea nu este un hotel.'), 'hotel')).toBe('medium');
    expect(evidenceCap(verifiedEntry(rooms, '212 camere'), 'hotel')).toBe('medium');
    expect(evidenceCap(verifiedEntry(label, '[erased]'), 'hotel')).toBe('medium');
    // A quantity or a text has no option to name.
    expect(evidenceCap(verifiedEntry(label, 'Destinatia cladirii: hotel'), undefined)).toBe('medium');
  });

  test('F-VALUE-02: several entries: low when any supports only low, else the highest; low when none is left', () => {
    const high = verifiedEntry(label, 'Destinatia cladirii: hotel');
    const medium = verifiedEntry(rooms, '212 camere');
    const low = verifiedEntry(named, 'Hotel de categoria TEST', 'unverifiable');
    expect(confidenceCap([high, medium], 'hotel')).toBe('high');
    expect(confidenceCap([medium], 'hotel')).toBe('medium');
    expect(confidenceCap([high, low], 'hotel')).toBe('low');
    expect(confidenceCap([], 'hotel')).toBe('low');
    expect(lowerConfidence('high', 'medium')).toBe('medium');
    expect(lowerConfidence('low', 'high')).toBe('low');
  });
});

describe('F-VALUE-02 · rule 3 and 2.3: derivedConfidence, the stored confidence capped by the evidence that remains', () => {
  test('F-VALUE-02 · G3-18: the label\'s document deleted, the room schedule left: high reads medium; nothing deleted: as stored', () => {
    const candidate = stored([verifiedEntry(label, 'Destinatia cladirii: hotel'), verifiedEntry(rooms, '212 camere')], 'high');
    expect(derivedConfidence(candidate, () => false)).toBe('high');
    expect(derivedConfidence(candidate, (id) => id === label.id)).toBe('medium');
    expect(derivedConfidence(candidate, (id) => id === rooms.id)).toBe('high');
  });

  test('F-VALUE-02: never raises a stored confidence, and an inference with none stored reads low', () => {
    const candidate = stored([verifiedEntry(label, 'Destinatia cladirii: hotel')], 'medium');
    expect(derivedConfidence(candidate, () => false)).toBe('medium');
    expect(derivedConfidence(stored([verifiedEntry(label, 'Destinatia cladirii: hotel')], undefined), () => false)).toBe('low');
  });

  test('F-VALUE-02: another source keeps its stored confidence (an ambiguous reading is low whatever remains)', () => {
    expect(derivedConfidence(stored([verifiedEntry(rooms, '212 camere')], 'low', 'document'), () => false)).toBe('low');
    expect(derivedConfidence(stored([], undefined, 'user'), () => true)).toBeUndefined();
  });

  test('F-VALUE-02: property: deterministic, never above stored or the cap of what remains, and removing more never raises it', () => {
    const pool = [
      verifiedEntry(label, 'Destinatia cladirii: hotel'),
      verifiedEntry(rooms, '212 camere'),
      verifiedEntry(negating, 'Cladirea nu este un hotel.'),
      verifiedEntry(named, 'Hotel de categoria TEST'),
      verifiedEntry(named, 'Hotel de categoria TEST', 'unverifiable'),
    ];
    fc.assert(
      fc.property(
        fc.subarray(pool, { minLength: 1 }),
        fc.constantFrom<Confidence | undefined>('high', 'medium', 'low', undefined),
        fc.subarray(DOCUMENTS.map((document) => document.id)),
        fc.subarray(DOCUMENTS.map((document) => document.id)),
        (evidence, confidence, first, more) => {
          const candidate = stored(evidence, confidence);
          const removed = new Set(first);
          const removedMore = new Set([...first, ...more]);
          const read = derivedConfidence(candidate, (id) => removed.has(id));
          const again = derivedConfidence(candidate, (id) => removed.has(id));
          const later = derivedConfidence(candidate, (id) => removedMore.has(id));
          const remaining = evidence.filter((item) => !removed.has(item.documentId));
          return (
            read === again &&
            atMost(read, confidence ?? 'low') &&
            atMost(read, confidenceCap(remaining, 'hotel')) &&
            later !== undefined &&
            read !== undefined &&
            RANK.indexOf(later) <= RANK.indexOf(read)
          );
        },
      ),
    );
  });
});

describe('F-VALUE-02 · F-EXTRACT-05 · the verifier and derive agree: what remains never reads higher than it would be verified (G3-18)', () => {
  test('F-VALUE-02 · F-EXTRACT-05: property: for any accepted inference and any documents deleted, derive reads at most the stored tier, and at most the tier the remaining evidence is verified with', () => {
    fc.assert(
      fc.property(fc.subarray([...ENTRIES], { minLength: 1 }), fc.constantFrom<Confidence | undefined>('high', 'medium', 'low', undefined), fc.subarray(DOCUMENTS), (evidence, claimed, gone) => {
        const verdict = verifyProposal(hotel(evidence, claimed), proposalContext('test-cand-property'));
        if (verdict.outcome !== 'accepted') return true;
        const candidate: Candidate = { ...verdict.candidate, authorRole: 'system' };
        const state = derive(typeField, [candidate], { ...NO_EVENTS, document: deleted(gone) }, deriveContext);
        const derived = state.candidates[0];
        const goneIds = new Set(gone.map((document) => document.id));
        const remaining = evidence.filter((item) => !goneIds.has(item.documentId));
        if (remaining.length === 0) return derived?.status === 'withdrawn' && derived.confidence === undefined;
        if (derived?.status !== 'eligible' || !atMost(derived.confidence, candidate.confidence ?? 'low')) return false;
        const again = verifyProposal(hotel(remaining, claimed), proposalContext('test-cand-again'));
        // What remains verified afresh: the tier it would get; negated in every mention, it would be refused, so at most medium.
        const bound: Confidence = again.outcome === 'accepted' ? (again.candidate.confidence ?? 'low') : 'medium';
        return atMost(derived.confidence, bound);
      }),
    );
  });

  test('F-VALUE-02: derive lists the tier only on an eligible candidate: a withdrawn value is never shown as current', () => {
    const verdict = verifyProposal(hotel([ENTRIES[0], ENTRIES[1]], 'high'), proposalContext('test-cand-eligible'));
    expect(verdict.outcome).toBe('accepted');
    if (verdict.outcome !== 'accepted') return;
    const candidate: Candidate = { ...verdict.candidate, authorRole: 'system' };
    expect(derive(typeField, [candidate], NO_EVENTS, deriveContext).candidates).toEqual([
      { candidateId: candidate.id, verification: 'unverified', status: 'eligible', refusal: null, confidence: 'high' },
    ]);
    expect(derive(typeField, [candidate], { ...NO_EVENTS, document: deleted([label]) }, deriveContext).candidates).toEqual([
      { candidateId: candidate.id, verification: 'unverified', status: 'eligible', refusal: null, confidence: 'medium' },
    ]);
    expect(derive(typeField, [candidate], { ...NO_EVENTS, document: deleted([label, rooms]) }, deriveContext).candidates).toEqual([
      { candidateId: candidate.id, verification: 'unverified', status: 'withdrawn', refusal: null },
    ]);
  });
});
