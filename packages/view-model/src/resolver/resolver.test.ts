/**
 * The one resolver (F-VALUE-10; F-RENDER-01, F-RENDER-03; guardrails rule 2, 2.8, rules 1, 3, 7, 8,
 * 12): badges from the derived state in 2.8's order, source lines, status and rule lines, the
 * missing wording, multi-fact fields, conflicts, documents and standalone lines. Every display
 * object it returns is checked against the contract's schema.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BADGE_IDS as REGISTRY_BADGE_IDS, unitByCode } from '@sovitech/registry';
import { derive, type Candidate, type CandidateEvent, type DocumentRecord } from '@sovitech/domain';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import { BADGE_IDS, DisplayObjectSchema, servedDisplayOf, type DisplayObject } from '../browser/contract';
import { DEFAULT_FORMAT_OPTIONS } from '../formatting';
import {
  answered,
  confirmedByOwner,
  events,
  found,
  productionField,
  skippedByOwner,
  stateOf,
  testDocument,
  testField,
  testId,
  testTime,
} from '../test-builders';
import {
  confirmActionOf,
  editActionOf,
  inputSpecOf,
  lineOf,
  resolveCount,
  resolveDetection,
  resolveDocument,
  resolveField,
  resolveLine,
  resolveStageLabel,
  resolveUploadFileName,
  valueIdOf,
  type ResolveFieldInput,
} from './index';

const BUILDING = testId(2);
const PROJECT = testId(1);
const AREA_SCHEDULE = testDocument(10, 'unknown');
const MEMORIU = testDocument(11, 'technical_design', { revision: 'Rev. 02', issueDate: '2007-03-01' });
const FILE_NAMES: Record<string, string> = { [AREA_SCHEDULE.id]: 'Area Schedule.pdf', [MEMORIU.id]: 'Memoriu tehnic.pdf' };

/** Every display object satisfies the contract, and its parts lie in its text or lines (the render contract). */
function valid(displays: readonly DisplayObject[]): readonly DisplayObject[] {
  for (const display of displays) {
    DisplayObjectSchema.parse(display);
    const served = servedDisplayOf(display);
    for (const part of served.parts ?? []) expect([served.text, ...(served.lines ?? [])].some((text) => text.includes(part)), `${display.valueId}: part ${part}`).toBe(true);
  }
  return displays;
}

function input(field: RegistryFieldDefinition, candidates: readonly Candidate[], extra: Partial<ResolveFieldInput> & { readonly derivedEvents?: ReturnType<typeof events>; readonly documents?: readonly DocumentRecord[] } = {}): ResolveFieldInput {
  const subjectId = field.subject === 'project' ? PROJECT : BUILDING;
  const documents = extra.documents ?? [AREA_SCHEDULE, MEMORIU];
  const { derivedEvents, documents: _documents, ...rest } = extra;
  void _documents;
  return {
    field,
    subject: { id: subjectId, kind: field.subject },
    state: stateOf(field, subjectId, candidates, derivedEvents ?? events(), documents),
    candidates,
    document: (id) => documents.find((document) => document.id === id),
    fileName: (id) => FILE_NAMES[id],
    projectType: 'new_construction',
    asked: false,
    searchedCoverage: undefined,
    actions: [],
    format: DEFAULT_FORMAT_OPTIONS,
    ...rest,
  };
}

function first(displays: readonly DisplayObject[]): DisplayObject {
  const [display] = valid(displays);
  if (display === undefined) throw new Error('no display');
  return display;
}

const area = productionField('building.grossFloorArea');
const buildingType = productionField('building.type');
const floors = productionField('building.floors');
const hvacInScope = productionField('project.scope.hvac');
const country = productionField('project.country');
const ownerArea = testField('building.testArea', { kind: 'quantity', subject: 'building', unit: 'm2', qualifierRequired: true, qualifiers: ['gross_total'], confirmBy: 'owner' });
const ownerCount = testField('building.testCount', { kind: 'count', subject: 'building', unit: 'count', confirmBy: 'owner', valueShape: 'non_negative_integer' });
const engineerCount = testField('building.testEngineerCount', { kind: 'count', subject: 'building', unit: 'count', confirmBy: 'engineer', valueShape: 'non_negative_integer' });
const engineerType = testField('building.testEngineerType', { kind: 'enum', subject: 'building', options: ['hotel', 'office'], confirmBy: 'engineer' });

describe('F-VALUE-10 · valueIdOf (display.ts value ids)', () => {
  it('ADR 0036 · G2-7: a field on its subject, one fact of it, and nothing the value-id pattern cannot carry', () => {
    expect(valueIdOf('building', BUILDING, 'building.grossFloorArea')).toBe(`building:${BUILDING}.grossFloorArea`);
    expect(valueIdOf('project', PROJECT, 'project.scope.fire_safety')).toBe(`project:${PROJECT}.scope.fire_safety`);
    expect(valueIdOf('building', BUILDING, 'building.floors', 'upper')).toBe(`building:${BUILDING}.floors.upper`);
    expect(() => valueIdOf('project', PROJECT, 'project.goal.24_7')).toThrow(/value id/u);
    expect(() => valueIdOf('project', 'not an id', 'project.name')).toThrow(/value id/u);
  });

  it('ADR 0036: the contract\'s badge ids mirror the registry\'s, in 2.8\'s order', () => {
    expect([...BADGE_IDS]).toEqual([...REGISTRY_BADGE_IDS]);
  });
});

describe('F-VALUE-10 · rules 1, 7 and 12: a value that is missing says why, never 0, a blank or a dash', () => {
  it('US-REVIEW-01 AC5 · G1-1: no candidate and never asked reads Unknown', () => {
    const display = first(resolveField(input(area, [])));
    expect(display).toMatchObject({ text: 'Unknown', shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'Unknown' } });
    expect(display.measure).toEqual({ label: 'Gross floor area', unit: { code: 'm2', symbol: 'm²' } });
  });

  it('US-REVIEW-01 AC16 · rule 7: asked, or skipped, reads Not provided yet; after a skip, "You can provide this later."', () => {
    expect(first(resolveField(input(area, [], { asked: true }))).badge?.id).toBe('not_provided_yet');
    const skipped = first(resolveField(input(buildingType, [], { derivedEvents: events({ field: [skippedByOwner(BUILDING, buildingType.key, 1)] }) })));
    expect(skipped).toMatchObject({ text: 'Not provided yet', missing: 'not_provided_yet' });
    expect(skipped.lines).toEqual([{ id: 'provide_later', kind: 'rule_line', text: 'You can provide this later.' }]);
  });

  it('US-REVIEW-01 AC20 · 2.8: analysis still running reads Reading documents…', () => {
    const started = { subjectId: BUILDING, fieldKey: area.key, type: 'analysis_started' as const, by: 'test-job', role: 'system' as const, at: testTime(1) };
    expect(first(resolveField(input(area, [], { derivedEvents: events({ field: [started] }) })))).toMatchObject({ text: 'Reading documents…', missing: 'reading_documents' });
  });

  it('US-REVIEW-01 AC6 · G12-2: "Not found in the analysed documents (<coverage>)." only over what a completed run searched', () => {
    expect(first(resolveField(input(area, []))).lines).toBeUndefined();
    const display = first(resolveField(input(area, [], { searchedCoverage: 'pages 1-60 of 200' })));
    expect(display.badge?.id).toBe('unknown');
    expect(display.lines?.[0]?.text).toBe('Not found in the analysed documents (pages 1-60 of 200).');
    expect(display.parts).toEqual(['pages 1-60 of 200']);
  });

  it('US-SCOPE-01 AC8 · §5-4a: step 4\'s detection reads Unknown with no detection field, Not found in documents only over a searched coverage', () => {
    const none = resolveDetection({ buildingId: BUILDING, systemId: 'hvac', systemName: 'HVAC', detection: undefined, format: DEFAULT_FORMAT_OPTIONS });
    expect(valid([none])[0]).toMatchObject({ valueId: `building:${BUILDING}.detection.hvac`, text: 'Unknown', badge: { id: 'unknown' } });
    const detectionField = testField('building.system.hvac', { kind: 'enum', subject: 'building', options: ['present'], confirmBy: 'owner' });
    const searched = resolveDetection({
      buildingId: BUILDING,
      systemId: 'hvac',
      systemName: 'HVAC',
      detection: input(detectionField, [], { searchedCoverage: 'pages 1-60 of 200' }),
      format: DEFAULT_FORMAT_OPTIONS,
    });
    expect(valid([searched])[0]).toMatchObject({ text: 'Not found in documents', badge: { id: 'not_found_in_documents' } });
    expect(searched.lines?.[0]?.text).toBe('Not found in the analysed documents (pages 1-60 of 200). You can still include it.');
  });
});

describe('F-VALUE-10 · 2.8: one badge, the first in the table order, read from the derived state', () => {
  it('US-REVIEW-02 AC2 · G5-1: a document area shows as written, what it measures, its source line and evidence; on an engineer field SOVITECH will check', () => {
    const value = found({ id: 20, subjectId: BUILDING, field: area, document: AREA_SCHEDULE, value: { quantity: { value: 45600, unit: 'm2', qualifier: 'gross_total' }, original: '45.600 mp' }, minute: 1, page: 4, excerpt: 'Suprafață construită desfășurată: 45.600 mp' });
    const display = first(resolveField(input(area, [value])));
    expect(display).toMatchObject({ text: '45.600 mp', parts: ['45.600'], shape: 'value', badge: { id: 'sovitech_will_check' } });
    expect(display.measure).toEqual({ label: 'Gross floor area', unit: { code: 'm2', symbol: 'm²' }, qualifierLabel: 'gross total (Scd)' });
    expect(display.sourceLine).toEqual({ id: 'document', kind: 'source_line', text: 'Found in Area Schedule.pdf, page 4' });
    expect(display.evidence).toEqual([{ documentId: AREA_SCHEDULE.id, contentHash: AREA_SCHEDULE.contentHash.slice('sha256:'.length), excerpt: 'Suprafață construită desfășurată: 45.600 mp' }]);
    const onOwnerField = first(resolveField(input(ownerArea, [{ ...value, fieldKey: ownerArea.key }])));
    expect(onOwnerField.badge?.id).toBe('from_document');
  });

  it('G3-18 · rule 3: Likely or Possible from the derived confidence, never the stored one; low on an owner field is Please check, on an engineer field SOVITECH will check', () => {
    const named = found({ id: 21, subjectId: BUILDING, field: buildingType, document: AREA_SCHEDULE, value: { choice: 'hotel' }, minute: 1, source: 'ai_inference', confidence: 'high', excerpt: 'Destinația clădirii: hotel' });
    expect(first(resolveField(input(buildingType, [named]))).badge?.id).toBe('likely');
    const counted = { ...named, evidence: [{ ...named.evidence[0]!, excerpt: '212 camere' }] } as Candidate;
    const display = first(resolveField(input(buildingType, [counted])));
    expect(display.badge?.id).toBe('possible');
    expect(display.text).toBe('Hotel');
    expect(display.sourceLine?.text).toBe('Inferred from Area Schedule.pdf, page 1');
    const low = { ...named, confidence: 'low' as const };
    expect(first(resolveField(input(buildingType, [low]))).badge?.id).toBe('please_check');
    const onEngineer = { ...low, fieldKey: engineerType.key };
    expect(first(resolveField(input(engineerType, [onEngineer]))).badge?.id).toBe('sovitech_will_check');
  });

  it('US-REVIEW-01 AC3 · G3-7 · US-REVIEW-05 AC4: the origin is kept after checks, "AI inference, confirmed by you", "AI inference, verified by SOVITECH on <date>"', () => {
    const inferred = found({ id: 22, subjectId: BUILDING, field: buildingType, document: AREA_SCHEDULE, value: { choice: 'hotel' }, minute: 1, source: 'ai_inference', confidence: 'medium' });
    const confirmation: CandidateEvent = { candidateId: inferred.id, type: 'user_confirmed', by: 'test-owner', role: 'owner', at: testTime(5) };
    const confirmed = first(resolveField(input(buildingType, [inferred], { derivedEvents: events({ candidate: [confirmation] }) })));
    expect(confirmed.badge?.id).toBe('confirmed_by_you');
    expect(confirmed.sourceLine).toEqual({ id: 'ai_inference_user_confirmed_line', kind: 'generated_sentence', text: 'AI inference, confirmed by you' });
    const verification: CandidateEvent = { candidateId: inferred.id, type: 'engineer_verified', by: 'test-engineer', role: 'sovitech_engineer', at: '2026-10-12T08:00:00.000000Z' };
    const verified = first(resolveField(input(engineerType, [{ ...inferred, fieldKey: engineerType.key }], { derivedEvents: events({ candidate: [verification] }), candidateEvents: [verification] })));
    expect(verified.badge?.id).toBe('verified_by_sovitech');
    expect(verified.sourceLine).toEqual({ id: 'ai_inference_engineer_verified_line', kind: 'generated_sentence', text: 'AI inference, verified by SOVITECH on 12 Oct 2026' });
  });

  it('R5-6 · 2.8 "Owner entered or accepted": Provided by you only for the owner\'s own entry; an engineer\'s site entry is SOVITECH will check', () => {
    const own = answered({ id: 23, subjectId: BUILDING, field: area, value: { quantity: { value: 27600, unit: 'm2', qualifier: 'gross_total' } }, minute: 1 });
    const display = first(resolveField(input(area, [own])));
    expect(display).toMatchObject({ text: '27,600 m²', parts: ['27,600', 'm²'], badge: { id: 'provided_by_you' } });
    expect(display.sourceLine).toBeUndefined();
    const engineer: Candidate = { ...own, id: testId(24), createdBy: 'test-engineer', authorRole: 'sovitech_engineer' };
    const survey = first(resolveField(input(engineerCount, [{ ...engineer, fieldKey: engineerCount.key, quantity: { value: 3, unit: 'count' } }])));
    expect(survey.badge?.id).toBe('sovitech_will_check');
    expect(survey.sourceLine?.text).toBe('Entered by a SOVITECH engineer');
  });

  it('G2-6 · US-REVIEW-01 AC4 · 2.3: a design-stage document on an existing building reads From design drawings, the line naming stage and revision', () => {
    const value = found({ id: 25, subjectId: BUILDING, field: ownerCount, document: MEMORIU, value: { quantity: { value: 6, unit: 'count' } }, minute: 1, page: 4 });
    const existing = first(resolveField(input(ownerCount, [value], { projectType: 'existing_building' })));
    expect(existing.badge?.id).toBe('from_design_drawings');
    expect(existing.sourceLine?.text).toBe('Technical design Rev. 02 (2007): Memoriu tehnic.pdf, page 4');
    const newBuild = first(resolveField(input(ownerCount, [value])));
    expect(newBuild.badge?.id).toBe('from_document');
    const unknownStage = { ...value, evidence: [{ ...value.evidence[0]!, documentId: AREA_SCHEDULE.id, contentHash: AREA_SCHEDULE.contentHash }] } as Candidate;
    expect(first(resolveField(input(ownerCount, [unknownStage], { projectType: 'bms_modernization' }))).sourceLine?.text).toBe('Found in Area Schedule.pdf, page 4 (stage unknown)');
  });

  it('G8-13 · rule 8: an ambiguous reading shows a range over its readings, never one of them, and Please check on an owner field', () => {
    const reading = found({ id: 26, subjectId: BUILDING, field: ownerArea, document: AREA_SCHEDULE, value: { quantity: { value: 1.5, unit: 'm2', qualifier: 'gross_total' }, original: '1.500 mp' }, alternatives: [{ value: 1500, unit: 'm2', qualifier: 'gross_total' }], minute: 1, confidence: 'low' });
    const display = first(resolveField(input(ownerArea, [reading])));
    expect(display).toMatchObject({ text: '1.5 to 1,500 m²', shape: 'range', badge: { id: 'please_check' } });
  });

  it('F-VALUE-12 · rule 3: a decision is the owner\'s, and a visible suggestion reads Suggested with its reason while unanswered', () => {
    const include = answered({ id: 27, subjectId: PROJECT, field: hvacInScope, value: { choice: 'include' }, minute: 1 });
    const decided = first(resolveField(input(hvacInScope, [include], { derivedEvents: events({ candidate: [confirmedByOwner(include)] }) })));
    expect(decided).toMatchObject({ text: 'Included', badge: { id: 'provided_by_you' } });
    const reason = lineOf('suggested_because_document_names', { document: 'Schema HVAC.pdf', system: 'HVAC' });
    const suggested = first(resolveField(input(hvacInScope, [], { suggestion: { choice: 'include', reason } })));
    expect(suggested).toMatchObject({ text: 'Included', shape: 'value', badge: { id: 'suggested' } });
    expect(suggested.lines?.[0]).toEqual({ id: 'suggested_because_document_names', kind: 'rule_line', text: 'Suggested because Schema HVAC.pdf names HVAC' });
  });

  it('F-VALUE-10: a country is named from the owner\'s ISO code; a text answer shows as entered', () => {
    const ro = answered({ id: 28, subjectId: PROJECT, field: country, value: { text: 'RO' }, minute: 1 });
    expect(first(resolveField(input(country, [ro]))).text).toBe('Romania');
  });
});

describe('F-VALUE-10 · rule 4: conflicts show both values with their sources, routed', () => {
  it('US-REVIEW-11 · G4-1: an owner field in conflict reads Two values, the rule 4 line, and a choice for the owner', () => {
    const owner = answered({ id: 30, subjectId: BUILDING, field: ownerCount, value: { quantity: { value: 28, unit: 'count' } }, minute: 1 });
    const document = found({ id: 31, subjectId: BUILDING, field: ownerCount, document: AREA_SCHEDULE, value: { quantity: { value: 30, unit: 'count' } }, minute: 9, page: 2 });
    const displays = valid(resolveField(input(ownerCount, [owner, document], { derivedEvents: events({ candidate: [confirmedByOwner(owner)] }) })));
    const [field, one, two] = displays;
    expect(field).toMatchObject({ text: '28 to 30', shape: 'range', badge: { id: 'two_values' } });
    expect(field?.lines?.[0]?.text).toBe('Documents say 30. You entered 28. Which is right?');
    expect(field?.actions?.[0]).toMatchObject({ kind: 'resolve_conflict', choices: [{ candidateId: owner.id, valueId: `${field?.valueId ?? ''}.value1` }, { candidateId: document.id, valueId: `${field?.valueId ?? ''}.value2` }] });
    expect(one).toMatchObject({ text: '28', badge: { id: 'provided_by_you' } });
    expect(two).toMatchObject({ text: '30', badge: { id: 'from_document' } });
    expect(two?.sourceLine?.text).toBe('Found in Area Schedule.pdf, page 2');
  });

  it('G4-8 · rule 4 "Routing": an engineer field\'s conflict tells the owner an engineer will check it, and offers no choice', () => {
    const a = found({ id: 32, subjectId: BUILDING, field: engineerCount, document: AREA_SCHEDULE, value: { quantity: { value: 6, unit: 'count' } }, minute: 1 });
    const b = found({ id: 33, subjectId: BUILDING, field: engineerCount, document: MEMORIU, value: { quantity: { value: 5, unit: 'count' } }, minute: 2 });
    const [field] = valid(resolveField(input(engineerCount, [a, b])));
    expect(field?.lines?.[0]?.text).toBe('Documents disagree on this. A SOVITECH engineer will check it.');
    expect(field?.actions).toBeUndefined();
  });
});

describe('F-VALUE-10 · rule 8 "Floors": one display per level type, the rest Unknown', () => {
  it('G8-9 · US-REVIEW-04 AC4 AC5: the floor structure by level type, parts no document states read Unknown', () => {
    const facts = [
      { id: 40, qualifier: 'below_ground', value: 3 },
      { id: 41, qualifier: 'ground', value: 1 },
      { id: 42, qualifier: 'upper', value: 12 },
    ].map((fact) => found({ id: fact.id, subjectId: BUILDING, field: floors, document: AREA_SCHEDULE, value: { quantity: { value: fact.value, unit: 'count', qualifier: fact.qualifier }, original: '3S+P+12E' }, minute: 1, excerpt: 'Regim de înălțime: 3S+P+12E' }));
    const displays = valid(resolveField(input(floors, facts)));
    const [summary] = displays;
    expect(summary?.text).toBe('3 below ground, 1 ground floor, 12 upper floors; Unknown: semi-basement, mezzanine, setback or technical floor, attic, roof plant');
    expect(summary?.badge?.id).toBe('sovitech_will_check');
    const byId = new Map(displays.map((display) => [display.valueId, display]));
    expect(byId.get(`building:${BUILDING}.floors.upper`)).toMatchObject({ text: '12', measure: { qualifierLabel: 'upper floors' } });
    expect(byId.get(`building:${BUILDING}.floors.attic`)).toMatchObject({ text: 'Unknown', shape: 'missing', measure: { qualifierLabel: 'attic' } });
    expect(displays).toHaveLength(1 + 3 + 5);
    expect(byId.get(`building:${BUILDING}.floors.ground`)?.evidence?.[0]?.excerpt).toBe('Regim de înălțime: 3S+P+12E');
  });
});

describe('F-VALUE-10 · no bare number: every display carries what it measures and its badge (property)', () => {
  const SOURCES = ['document', 'user', 'ai_inference'] as const;
  const FIELDS = [area, ownerArea, ownerCount, engineerCount, buildingType, hvacInScope, country] as const;

  const candidateFor = (field: RegistryFieldDefinition, n: number, source: (typeof SOURCES)[number], amount: number, confidence: 'high' | 'medium' | 'low'): Candidate | undefined => {
    const subjectId = field.subject === 'project' ? PROJECT : BUILDING;
    let value;
    if (field.kind === 'quantity') value = { quantity: { value: amount, unit: 'm2', qualifier: 'gross_total' } };
    else if (field.kind === 'count') value = { quantity: { value: amount, unit: 'count' } };
    else if (field.kind === 'text') value = { text: `TEST ${String(amount)}` };
    else value = { choice: field.options?.[amount % (field.options.length)] ?? 'unknown' };
    if (source === 'user' || field.kind === 'decision') return answered({ id: n, subjectId, field, value, minute: n });
    if (source === 'ai_inference' && field.kind === 'quantity') return undefined;
    return found({ id: n, subjectId, field, document: AREA_SCHEDULE, value, minute: n, source, confidence });
  };

  it('G2-1 · rule 2 · rule 8: whatever the field, sources, verification or skips, a display with a figure has its badge and, for a quantity or count, its unit; a missing one reads its badge, never 0', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FIELDS),
        fc.array(fc.record({ source: fc.constantFrom(...SOURCES), amount: fc.integer({ min: 0, max: 99_999 }), confidence: fc.constantFrom('high' as const, 'medium' as const, 'low' as const), confirm: fc.boolean() }), { maxLength: 3 }),
        fc.boolean(),
        fc.boolean(),
        (field, entries, skipped, asked) => {
          const candidates = entries.flatMap((entry, index) => {
            const candidate = candidateFor(field, 100 + index, entry.source, entry.amount, entry.confidence);
            return candidate === undefined ? [] : [candidate];
          });
          const confirmations = candidates.filter((_candidate, index) => entries[index]?.confirm === true).map((candidate) => ({ ...confirmedByOwner(candidate), at: testTime(99) }));
          const subjectId = field.subject === 'project' ? PROJECT : BUILDING;
          const fieldEvents = skipped ? [skippedByOwner(subjectId, field.key, 50)] : [];
          const displays = valid(resolveField(input(field, candidates, { asked, derivedEvents: events({ candidate: confirmations, field: fieldEvents }) })));
          for (const display of displays) {
            expect(display.text.trim()).not.toBe('');
            expect(display.badge).toBeDefined();
            expect(display.measure?.label).toBeTruthy();
            if (display.shape === 'missing') {
              expect(display.text).toBe(display.badge?.label);
              expect(display.text).not.toMatch(/\d/u);
            }
            if (/\d/u.test(display.text) && (field.kind === 'quantity' || field.kind === 'count')) expect(display.measure?.unit).toBeDefined();
          }
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe('F-INGEST-05 · US-DOCS-03 · US-DOCS-04: a document\'s row', () => {
  it('US-DOCS-03 AC1 AC2 AC3 AC4 · G12-1 · G12-3: progress, coverage as recorded, and the 2.8 lines with their numbers bound', () => {
    const format = DEFAULT_FORMAT_OPTIONS;
    const queued = resolveDocument({ document: testDocument(50, 'unknown', { analysis: { status: 'queued', coverage: 'pending' } }), fileName: 'A-101.pdf', format });
    expect(queued.status).toBeUndefined();
    // DR-4: a document being read shows 2.8's pending wording as its progress state, bound to its coverage value id.
    expect(valid([queued.reading!])[0]).toMatchObject({ valueId: `document:${testId(50)}.coverage`, text: 'Reading documents…', shape: 'missing', missing: 'reading_documents', badge: { id: 'reading_documents' } });
    const analysed = resolveDocument({ document: testDocument(51, 'unknown', { analysis: { status: 'analysed', coverage: 'pages 1-40 of 40' } }), fileName: 'A-101.pdf', format });
    expect(valid([analysed.status!, analysed.fileName, analysed.stage, analysed.revision])).toHaveLength(4);
    expect(analysed.status).toMatchObject({ valueId: `document:${testId(51)}.coverage`, kind: 'record', text: 'pages 1-40 of 40' });
    expect(analysed.fileName).toMatchObject({ valueId: `document:${testId(51)}.fileName`, text: 'A-101.pdf', parts: ['A-101.pdf'] });
    expect(analysed.stage).toMatchObject({ text: 'Unknown', badge: { id: 'unknown' } });
    expect(analysed.revision).toMatchObject({ text: 'Unknown', badge: { id: 'unknown' } });
    const partly = resolveDocument({ document: testDocument(52, 'unknown', { analysis: { status: 'partly_analysed', coverage: 'pages 1-37 of 40' } }), fileName: 'M.pdf', format });
    expect(partly.status).toMatchObject({ kind: 'line', text: 'Partly analysed (37 of 40 pages)', parts: ['37', '40'] });
    const gap = resolveDocument({ document: testDocument(53, 'unknown', { analysis: { status: 'partly_analysed', coverage: 'pages 1-11, 13-40 of 40' } }), fileName: 'M.pdf', format });
    expect(gap.status?.text).toBe('Partly analysed (39 of 40 pages)');
    const ifc = resolveDocument({ document: testDocument(54, 'unknown', { analysis: { status: 'stored_only', coverage: 'stored: IFC model' } }), fileName: 'model.ifc', format });
    expect(ifc.status?.text).toBe('Not analysed: IFC model stored, not analysed');
    const failed = resolveDocument({ document: testDocument(55, 'unknown', { analysis: { status: 'failed', coverage: 'none' } }), fileName: 'x.pdf', format });
    expect(failed.status?.text).toBe('Analysis failed');
  });

  it('US-DOCS-03 AC6 · US-DOCS-04 AC7: a recorded stage shows its word with From document and a revision exactly as written; otherwise Unknown, never "none stated"', () => {
    const row = resolveDocument({ document: MEMORIU, fileName: 'Memoriu tehnic.pdf', format: DEFAULT_FORMAT_OPTIONS });
    expect(row.stage).toMatchObject({ text: 'Technical design', badge: { id: 'from_document' } });
    expect(row.revision).toMatchObject({ text: 'Rev. 02', parts: ['Rev. 02'], badge: { id: 'from_document' } });
    expect(valid([resolveUploadFileName(testId(60), 'Plan etaj 3.pdf')])[0]).toMatchObject({ valueId: `upload:${testId(60)}.fileName`, text: 'Plan etaj 3.pdf' });
  });
});

describe('F-RENDER-03 · prompt 3 section 7: standalone lines with their numbers bound', () => {
  it('G7-5 · rule 7: counts in the registry\'s words, the singular with one', () => {
    const format = DEFAULT_FORMAT_OPTIONS;
    expect(resolveLine(`project:${PROJECT}.openItems.owner`, 'things_for_you', { count: 2 }, format)).toMatchObject({ kind: 'line', text: '2 things for you to check', parts: ['2'] });
    expect(resolveLine(`project:${PROJECT}.openItems.owner`, 'things_for_you', { count: 1 }, format).text).toBe('1 thing for you to check');
    expect(resolveLine(`project:${PROJECT}.documents.stillReading`, 'still_reading', { count: 2 }, format).text).toBe('Still reading 2 files. Your estimate will update when they finish.');
    expect(resolveLine(`project:${PROJECT}.lateFindings.notice`, 'late_findings_notice', { count: 2 }, format).text).toBe("We found 2 more things in your documents. You'll see them on the review step.");
    expect(valid([resolveCount(`project:${PROJECT}.documents.count`, 3, 'Documents', format)])[0]).toMatchObject({ text: '3', parts: ['3'] });
  });

  it('2.8 · rule 10 · prompt 3 5.3: only registry lines; no stage 3 label from a parameter; a line with a number is never a plain line', () => {
    const format = DEFAULT_FORMAT_OPTIONS;
    expect(() => resolveLine(`project:${PROJECT}.outputs.x`, 'formal_quotation', {}, format)).toThrow(/quotation_record/u);
    expect(() => resolveLine(`project:${PROJECT}.outputs.x`, 'building_data_extracted', {}, format)).toThrow(/no status line/u);
    expect(() => resolveLine(`document:${testId(3)}.coverage`, 'not_analysed', { fileType: 'Word file' }, format)).toThrow(/file type/u);
    expect(() => lineOf('things_for_you', { count: '2' })).toThrow(/number/u);
    expect(lineOf('demo_data')).toEqual({ id: 'demo_data', kind: 'demo_line', text: 'Demo data, not an assessment of the real building' });
    expect(lineOf('not_analysed', { fileType: 'IFC model' }).text).toBe('Not analysed: IFC model stored, not analysed');
  });
});

describe('F-VALUE-10 · actions: how the owner edits and confirms', () => {
  it('US-REVIEW-07 · US-INTAKE-07 AC5: Edit takes the field\'s own input; the building type\'s confirmation reads "Yes, it\'s a hotel"', () => {
    expect(inputSpecOf(area)).toEqual({ kind: 'quantity', unit: { code: 'm2', symbol: 'm²' }, qualifiers: ['gross_total'], qualifierRequired: true });
    expect(inputSpecOf(buildingType)).toEqual({ kind: 'choice', options: ['hotel', 'office', 'retail', 'hospital', 'residential', 'other'] });
    expect(inputSpecOf(country)).toEqual({ kind: 'text', maxLength: 500 });
    const edit = editActionOf(area, BUILDING, [testId(20)]);
    const inferred = found({ id: 61, subjectId: BUILDING, field: buildingType, document: AREA_SCHEDULE, value: { choice: 'hotel' }, minute: 1, source: 'ai_inference', confidence: 'medium' });
    const confirm = confirmActionOf(buildingType, inferred);
    expect(confirm).toMatchObject({ kind: 'confirm', candidateId: inferred.id, wording: { kind: 'rule_line', text: "Yes, it's a hotel" } });
    const display = first(resolveField(input(buildingType, [inferred], { actions: [edit, confirm] })));
    expect(servedDisplayOf(display).lines).toContain("Yes, it's a hotel");
    const office = found({ id: 62, subjectId: BUILDING, field: buildingType, document: AREA_SCHEDULE, value: { choice: 'office' }, minute: 1, source: 'ai_inference', confidence: 'medium' });
    expect(confirmActionOf(buildingType, office)).toMatchObject({ wording: { text: "Yes, it's an office" } });
    expect(confirmActionOf(area, inferred)).toMatchObject({ wording: { text: 'Is this right?' } });
  });
});

describe('phase 3 part B: the resolver\'s side of G4-36, G8-23, G7-12 and G10-11', () => {
  it('G4-36 · rule 4 "Routing": two values that are both the owner\'s own entries, on an engineer field, read Two values with no line about documents', () => {
    const engineerArea = testField('building.testEngineerArea', { kind: 'quantity', subject: 'building', unit: 'm2', qualifierRequired: true, qualifiers: ['gross_total'], confirmBy: 'engineer' });
    const a = answered({ id: 140, subjectId: BUILDING, field: engineerArea, value: { quantity: { value: 1200, unit: 'm2', qualifier: 'gross_total' } }, minute: 1 });
    const b = answered({ id: 141, subjectId: BUILDING, field: engineerArea, value: { quantity: { value: 1300, unit: 'm2', qualifier: 'gross_total' } }, minute: 2 });
    const [field, one, two] = valid(resolveField(input(engineerArea, [a, b], { documents: [] })));
    expect(field).toMatchObject({ text: '1,200 to 1,300 m²', badge: { id: 'two_values' } });
    expect((field?.lines ?? []).map((line) => line.text).join(' ')).not.toContain('Documents disagree');
    expect(one?.badge?.id).toBe('provided_by_you');
    expect(two?.badge?.id).toBe('provided_by_you');
    const document = found({ id: 142, subjectId: BUILDING, field: engineerArea, document: AREA_SCHEDULE, value: { quantity: { value: 1500, unit: 'm2', qualifier: 'gross_total' } }, minute: 3 });
    const [withDocument] = valid(resolveField(input(engineerArea, [a, document])));
    expect(withDocument?.lines?.[0]?.text).toBe('Documents disagree on this. A SOVITECH engineer will check it.');
  });

  it('G4-36 · rule 4 "Routing": the line about documents needs a `document` or `ai_inference` value in the conflict; a reference value against the owner\'s entry carries none, an inference does', () => {
    // A TEST engineer field that lists a TEST reference dataset, its version approved in this derive only.
    const engineerArea = testField('building.testEngineerReferenceArea', { kind: 'quantity', subject: 'building', unit: 'm2', qualifierRequired: true, qualifiers: ['gross_total'], confirmBy: 'engineer', referenceDatasets: ['test-dataset'] });
    const owner = answered({ id: 160, subjectId: BUILDING, field: engineerArea, value: { quantity: { value: 1200, unit: 'm2', qualifier: 'gross_total' } }, minute: 1 });
    const reference: Candidate = {
      id: testId(161),
      subjectId: BUILDING,
      fieldKey: engineerArea.key,
      quantity: { value: 1500, unit: 'm2', qualifier: 'gross_total' },
      source: 'reference',
      evidence: [],
      reference: { dataset: 'test-dataset', version: '1.0.0', key: 'TEST key' },
      createdBy: 'test-engine',
      authorRole: 'system',
      createdAt: testTime(2),
    };
    const derived = derive(engineerArea, [owner, reference], events(), { subjectId: BUILDING, document: () => undefined, unit: unitByCode, inputState: () => undefined, datasetApproved: () => true });
    expect(derived.candidates.map((candidate) => candidate.status)).toEqual(['eligible', 'eligible']);
    const [field, ...values] = valid(resolveField(input(engineerArea, [owner, reference], { documents: [], state: derived })));
    expect(field).toMatchObject({ text: '1,200 to 1,500 m²', badge: { id: 'two_values' } });
    expect([...(field?.lines ?? []), ...values.flatMap((value) => value.lines ?? [])].map((line) => line.text).join(' ')).not.toContain('Documents disagree');
    expect(values.map((value) => value.sourceLine?.text)).toContain('From test-dataset, version 1.0.0');

    const engineerType = testField('building.testEngineerType', { kind: 'enum', subject: 'building', options: ['hotel', 'office'], confirmBy: 'engineer' });
    const ownerType = answered({ id: 162, subjectId: BUILDING, field: engineerType, value: { choice: 'hotel' }, minute: 1 });
    const inferred = found({ id: 163, subjectId: BUILDING, field: engineerType, document: MEMORIU, value: { choice: 'office' }, minute: 2, source: 'ai_inference', confidence: 'medium' });
    const [inferenceConflict] = valid(resolveField(input(engineerType, [ownerType, inferred])));
    expect(inferenceConflict?.badge?.id).toBe('two_values');
    expect(inferenceConflict?.lines?.[0]?.text).toBe('Documents disagree on this. A SOVITECH engineer will check it.');
  });

  it('G8-23 · rule 9: the owner\'s typed quantity shows formatted, not as written, although its original is kept', () => {
    const typed = answered({ id: 150, subjectId: BUILDING, field: ownerArea, value: { quantity: { value: 1300.25, unit: 'm2', qualifier: 'gross_total' }, original: '1.300,25 mp' }, minute: 1 });
    expect(first(resolveField(input(ownerArea, [typed], { derivedEvents: events({ candidate: [confirmedByOwner(typed)] }) }))).text).toBe('1,300.25 m²');
    const approximate = answered({ id: 151, subjectId: BUILDING, field: ownerArea, value: { quantity: { value: 1234.5, unit: 'm2', qualifier: 'gross_total', approximate: true }, original: 'cca. 1 234,5 mp' }, minute: 1 });
    expect(first(resolveField(input(ownerArea, [approximate], { derivedEvents: events({ candidate: [confirmedByOwner(approximate)] }) }))).text).toBe('about 1,234.5 m²');
  });

  it('G7-12 · rule 7: a skipped option of a multi-select carries no "You can provide this later." of its own; a skipped question of one field keeps it', () => {
    const skippedOption = first(resolveField(input(hvacInScope, [], { derivedEvents: events({ field: [skippedByOwner(PROJECT, hvacInScope.key, 1)] }) })));
    expect(skippedOption).toMatchObject({ text: 'Not provided yet', missing: 'not_provided_yet' });
    expect(skippedOption.lines).toBeUndefined();
    const skippedType = first(resolveField(input(buildingType, [], { derivedEvents: events({ field: [skippedByOwner(BUILDING, buildingType.key, 1)] }) })));
    expect(skippedType.lines).toEqual([{ id: 'provide_later', kind: 'rule_line', text: 'You can provide this later.' }]);
  });

  it('G10-11 · 2.8 · rule 10: a stage label is a line display object carrying its stage-label line; "Formal quotation" is never made', () => {
    const valueId = `project:${PROJECT}.proposal.stage`;
    expect(valid([resolveStageLabel(valueId, 'preliminary_investment_estimate', DEFAULT_FORMAT_OPTIONS)])[0]).toEqual({
      valueId,
      kind: 'line',
      text: 'Preliminary investment estimate',
      shape: 'value',
      lines: [{ id: 'preliminary_investment_estimate', kind: 'stage_label', text: 'Preliminary investment estimate' }],
    });
    expect(resolveStageLabel(valueId, 'indicative_range', DEFAULT_FORMAT_OPTIONS).text).toBe('Indicative range');
    expect(() => resolveStageLabel(valueId, 'formal_quotation' as never, DEFAULT_FORMAT_OPTIONS)).toThrow();
  });
});
