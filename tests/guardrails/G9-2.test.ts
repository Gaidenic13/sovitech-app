// @pending-until: phase 1 derive
/**
 * G9-2 (docs/guardrails.md section 7; 2.4 "Provisional"; rule 9 "No laundering").
 * Situation: floors enter conflict after the points estimate was calculated.
 * Expected: the estimate shows Provisional with no manual step.
 *
 * "No manual step": the estimate's own candidates and events are the same before
 * and after; only the floors field gains a disagreeing document reading.
 */
import fc from 'fast-check';
import { expect } from 'vitest';
import {
  NO_EVENTS,
  derive,
  type Candidate,
  type CandidateEvent,
  type DeriveContext,
  type DeriveEvents,
  type DocumentRecord,
  type FieldDefinition,
  type FieldState,
} from '@sovitech/domain';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

const BUILDING = 'test-building-g9-2';

const ownerCount = (key: string, label: string): FieldDefinition => ({
  key,
  label,
  subject: 'building',
  kind: 'count',
  unit: 'count',
  qualifierRequired: true,
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [{ output: 'test.points.hardware_io', via: 'formula:TEST-points@1.0.0' }],
  impactRank: 1,
  confirmBy: 'owner',
});

const floorsField = ownerCount('test.building.upper_floors', 'TEST upper floors');
const roomsField = ownerCount('test.building.guest_rooms', 'TEST guest rooms');

const pointsField: FieldDefinition = {
  key: 'test.points.hardware_io',
  label: 'TEST hardware points',
  subject: 'project',
  kind: 'count',
  unit: 'count',
  qualifierRequired: true,
  estimation: 'allowed',
  criticality: 'optional',
  affects: [],
  impactRank: 2,
  confirmBy: 'engineer',
};

const memoriu: DocumentRecord = {
  id: 'test-doc-g9-2-memoriu',
  projectId: 'test-project-g9-2',
  contentHash: 'sha256:test-g9-2-memoriu',
  kind: 'architectural',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST full coverage' },
};

function ownerAnswer(field: FieldDefinition, id: string, value: number, qualifier: string): Candidate {
  return {
    id,
    subjectId: BUILDING,
    fieldKey: field.key,
    quantity: { value, unit: 'count', qualifier },
    source: 'user',
    evidence: [],
    createdBy: 'test-owner',
    createdAt: '2026-09-25T09:00:00.000Z',
  };
}

const confirmedByOwner = (candidate: Candidate): CandidateEvent => ({
  candidateId: candidate.id,
  type: 'user_confirmed',
  by: 'test-owner',
  role: 'owner',
  at: candidate.createdAt,
});

function laterDocumentFloors(value: number): Candidate {
  return {
    id: 'test-cand-g9-2-floors-document',
    subjectId: BUILDING,
    fieldKey: floorsField.key,
    quantity: { value, unit: 'count', qualifier: 'upper_floors' },
    source: 'document',
    evidence: [
      {
        documentId: memoriu.id,
        contentHash: memoriu.contentHash,
        locator: { page: 2 },
        excerpt: `Etaje supraterane: ${value}`,
        check: 'text_match',
      },
    ],
    createdBy: 'test-extractor',
    createdAt: '2026-09-25T14:00:00.000Z',
  };
}

const plainContext: DeriveContext = {
  document: (id) => (id === memoriu.id ? memoriu : undefined),
  inputState: () => undefined,
  datasetApproved: () => false,
};

function checkScenario(ownerFloors: number, documentFloors: number, rooms: number): void {
  const floorsAnswer = ownerAnswer(floorsField, 'test-cand-g9-2-floors-owner', ownerFloors, 'upper_floors');
  const roomsAnswer = ownerAnswer(roomsField, 'test-cand-g9-2-rooms-owner', rooms, 'guest_rooms');
  const floorsEvents: DeriveEvents = { ...NO_EVENTS, candidate: [confirmedByOwner(floorsAnswer)] };
  const roomsEvents: DeriveEvents = { ...NO_EVENTS, candidate: [confirmedByOwner(roomsAnswer)] };

  // The points estimate, calculated while both inputs were known, each with the owner's user_confirmed event.
  const estimate: Candidate = {
    id: 'test-cand-g9-2-points',
    subjectId: 'test-project-g9-2',
    fieldKey: pointsField.key,
    quantity: { value: 120, unit: 'count', qualifier: 'hardware_io' },
    source: 'estimated',
    evidence: [],
    method: {
      formulaId: 'TEST-points',
      formulaVersion: '1.0.0',
      inputCandidateIds: [floorsAnswer.id, roomsAnswer.id],
      unknownPolicy: 'refuse',
      assumptions: ['TEST assumption for case G9-2'],
    },
    range: { low: 100, high: 140 },
    createdBy: 'test-engine',
    createdAt: '2026-09-25T10:00:00.000Z',
  };
  const estimateCandidates = [estimate];
  const estimateEvents = NO_EVENTS;

  const roomsState = derive(roomsField, [roomsAnswer], roomsEvents, plainContext);
  const pointsContext = (floorsState: FieldState): DeriveContext => ({
    ...plainContext,
    inputState: (candidateId) =>
      candidateId === floorsAnswer.id ? floorsState : candidateId === roomsAnswer.id ? roomsState : undefined,
  });

  const floorsBefore = derive(floorsField, [floorsAnswer], floorsEvents, plainContext);
  const before = derive(pointsField, estimateCandidates, estimateEvents, pointsContext(floorsBefore));
  expect(before.provisional).toBe(false);

  // A document analysed later disagrees: floors enter conflict.
  const floorsAfter = derive(floorsField, [floorsAnswer, laterDocumentFloors(documentFloors)], floorsEvents, plainContext);
  expect(floorsAfter.state).toBe('conflict');

  // Same estimate candidates, same estimate events: nobody did anything to the estimate.
  const after = derive(pointsField, estimateCandidates, estimateEvents, pointsContext(floorsAfter));
  expect(after.provisional).toBe(true);
}

pending('F-VALUE-02 · G9-2: floors enter conflict after the points estimate: Provisional with no manual step', () => {
  checkScenario(12, 14, 80);

  fc.assert(
    fc.property(fc.nat({ max: 100 }), fc.nat({ max: 100 }), fc.nat({ max: 2000 }), (ownerFloors, documentFloors, rooms) => {
      fc.pre(ownerFloors !== documentFloors);
      checkScenario(ownerFloors, documentFloors, rooms);
    }),
  );
});
