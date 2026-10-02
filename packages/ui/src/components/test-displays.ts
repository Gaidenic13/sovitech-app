/**
 * TEST display objects for the kit's component tests (not exported by the package). Every value is
 * visibly synthetic ("TEST", a digit pattern 1, 12, 123, 12,345), none comes from the mockups, the
 * specs or company/, and each is valid under the contract's DisplayObjectSchema (checked in
 * Value.test.tsx), so the components are tested on what the API can actually serve.
 */
import type { DisplayObject } from '@sovitech/view-model/browser';

export const TEST_SUBJECT = '0192f000-0000-7000-8000-000000000001';
export const TEST_DOCUMENT = '0192f000-0000-7000-8000-00000000d0c1';
export const TEST_CANDIDATE = '0192f000-0000-7000-8000-00000000ca01';
export const TEST_HASH = 'a'.repeat(64);

/** A document value with its unit as a declared part, its badge, source line, evidence and Edit. */
export const AREA: DisplayObject = {
  valueId: `building:${TEST_SUBJECT}.grossFloorArea`,
  kind: 'field',
  text: 'TEST 12,345 m²',
  parts: ['TEST 12,345', 'm²'],
  shape: 'value',
  badge: { id: 'from_document', label: 'From document' },
  measure: { label: 'TEST gross floor area', unit: { code: 'm2', symbol: 'm²' }, qualifierLabel: 'TEST basis stated' },
  sourceLine: { id: 'found_in', kind: 'source_line', text: 'Found in TEST Area Schedule.pdf, page 1' },
  evidence: [{ documentId: TEST_DOCUMENT, contentHash: TEST_HASH, excerpt: 'Scd TEST 12.345 mp' }],
  actions: [
    {
      kind: 'edit',
      field: { subjectId: TEST_SUBJECT, fieldKey: 'building.grossFloorArea' },
      input: { kind: 'quantity', unit: { code: 'm2', symbol: 'm²' }, qualifiers: ['gross_total'], qualifierRequired: true },
      shownCandidateIds: [TEST_CANDIDATE],
    },
  ],
  field: { subjectId: TEST_SUBJECT, fieldKey: 'building.grossFloorArea' },
};

/** A value no document states and nobody was asked about. */
export const UNKNOWN: DisplayObject = {
  valueId: `building:${TEST_SUBJECT}.zones`,
  kind: 'field',
  text: 'Unknown',
  shape: 'missing',
  missing: 'unknown',
  badge: { id: 'unknown', label: 'Unknown' },
  measure: { label: 'TEST zones' },
};

/** A fact that passes rule 5's test: its wording, Yes and Edit. */
export const BUILDING_TYPE: DisplayObject = {
  valueId: `building:${TEST_SUBJECT}.type`,
  kind: 'field',
  text: 'TEST hotel',
  shape: 'value',
  badge: { id: 'possible', label: 'Possible' },
  sourceLine: { id: 'inferred_from', kind: 'source_line', text: 'TEST 123 guest rooms in TEST Rooms.xlsx' },
  actions: [
    { kind: 'confirm', candidateId: TEST_CANDIDATE, wording: { id: 'is_this_right', kind: 'rule_line', text: 'TEST 123 guest rooms suggest a TEST hotel. Is this right?' } },
    {
      kind: 'edit',
      field: { subjectId: TEST_SUBJECT, fieldKey: 'building.type' },
      input: { kind: 'choice', options: ['hotel', 'office'] },
      shownCandidateIds: [TEST_CANDIDATE],
    },
  ],
};

/** An engineer item: SOVITECH will check, with "Looks right" and "Something's wrong". */
export const ENGINEER_ITEM: DisplayObject = {
  valueId: `asset:${TEST_SUBJECT}.type`,
  kind: 'field',
  text: 'TEST air handling unit',
  shape: 'value',
  badge: { id: 'sovitech_will_check', label: 'SOVITECH will check' },
  sourceLine: { id: 'inferred_from', kind: 'source_line', text: 'TEST tag on TEST sheet 12' },
  lines: [{ id: 'provisional_inputs', kind: 'status_line', text: 'Provisional: depends on TEST 12 equipment items not yet checked' }],
  actions: [
    { kind: 'acknowledge', candidateIds: [TEST_CANDIDATE] },
    { kind: 'concern', candidateId: TEST_CANDIDATE },
  ],
};

/** An output that cannot be produced, naming what is missing, with the owner's Add action. */
export const OUTPUT_MISSING_INPUT: DisplayObject = {
  valueId: `project:${TEST_SUBJECT}.outputs.investment`,
  kind: 'line',
  text: 'Not available yet',
  shape: 'missing',
  missing: 'not_available_yet',
  badge: { id: 'not_available_yet', label: 'Not available yet' },
  lines: [{ id: 'add_to_see_this', kind: 'rule_line', text: 'Add the TEST gross floor area to see this.' }],
  actions: [{ kind: 'add', field: { subjectId: TEST_SUBJECT, fieldKey: 'building.grossFloorArea' }, label: 'Add TEST gross floor area', step: 8 }],
};

/** An output that waits for a SOVITECH dataset: it names the dataset and offers no owner action. */
export const OUTPUT_MISSING_DATASET: DisplayObject = {
  valueId: `project:${TEST_SUBJECT}.outputs.points`,
  kind: 'line',
  text: 'Not available yet: TEST point templates',
  shape: 'missing',
  missing: 'not_available_yet',
  badge: { id: 'not_available_yet', label: 'Not available yet' },
};

/** A rule 7 count, served as its own display object. */
export const OPEN_ITEMS: DisplayObject = {
  valueId: `project:${TEST_SUBJECT}.openItems.owner`,
  kind: 'line',
  text: 'TEST 12 things for you to check',
  shape: 'value',
  lines: [{ id: 'things_for_you', kind: 'rule_line', text: 'TEST 12 things for you to check' }],
};

/** The late-findings notice, its count bound. */
export const LATE_NOTICE: DisplayObject = {
  valueId: `project:${TEST_SUBJECT}.lateFindings.notice`,
  kind: 'line',
  text: "We found TEST 12 more things in your documents. You'll see them on the review step.",
  shape: 'value',
};

/** A stage 2 price (Preliminary investment estimate), as the engine will serve it (phase 5). */
export const PRICE_STAGE_2: DisplayObject = {
  valueId: `project:${TEST_SUBJECT}.outputs.capex`,
  kind: 'field',
  text: 'about TEST 1,200 (TEST 1,100 to TEST 1,300) EUR',
  shape: 'range',
  badge: { id: 'estimated', label: 'Estimated' },
  lines: [
    { id: 'preliminary_investment_estimate', kind: 'stage_label', text: 'Preliminary investment estimate' },
    { id: 'provisional_inputs', kind: 'status_line', text: 'Provisional: depends on TEST 12 equipment items not yet checked' },
  ],
};

export const DEMO_LINE = { id: 'demo_data', kind: 'demo_line', text: 'TEST demo line' } as const;

// ---------------------------------------------------------------------------------------- workspace (phase 4)

export const TEST_ASSET_A = '0192f000-0000-7000-8000-0000000a5e01';
export const TEST_ASSET_B = '0192f000-0000-7000-8000-0000000a5e02';
export const TEST_PROJECT = '0192f000-0000-7000-8000-00000000a001';

/** A tag as written, from a document, with its source line. */
export const TAG_A: DisplayObject = {
  valueId: `asset:${TEST_ASSET_A}.tag`,
  kind: 'field',
  text: 'TEST-AHU-12',
  shape: 'value',
  badge: { id: 'from_document', label: 'From document' },
  sourceLine: { id: 'found_in', kind: 'source_line', text: 'Found in TEST Schedule.xlsx, sheet TEST 1' },
};

export const TAG_B: DisplayObject = {
  valueId: `asset:${TEST_ASSET_B}.tag`,
  kind: 'field',
  text: 'TEST-FCU-123',
  shape: 'value',
  badge: { id: 'from_document', label: 'From document' },
};

/** An asset type no approved taxonomy can name: Unknown (R-067 "Until decided"). */
export const TYPE_A: DisplayObject = {
  valueId: `asset:${TEST_ASSET_A}.type`,
  kind: 'field',
  text: 'Unknown',
  shape: 'missing',
  missing: 'unknown',
  badge: { id: 'unknown', label: 'Unknown' },
};

/** An asset type an engineer must verify. */
export const TYPE_B: DisplayObject = {
  valueId: `asset:${TEST_ASSET_B}.type`,
  kind: 'field',
  text: 'TEST fan coil unit',
  shape: 'value',
  badge: { id: 'sovitech_will_check', label: 'SOVITECH will check' },
};

/** Rule 7's "Still reading <n> files", its count bound. */
export const STILL_READING: DisplayObject = {
  valueId: `project:${TEST_PROJECT}.documents.stillReading`,
  kind: 'line',
  text: 'Still reading TEST 12 files. Your estimate will update when they finish.',
  shape: 'value',
};

/** A file name as uploaded (a record value, with digits). */
export const FILE_NAME: DisplayObject = {
  valueId: `document:${TEST_DOCUMENT}.fileName`,
  kind: 'record',
  text: 'TEST-plan-12.pdf',
  shape: 'value',
};

/** A project's name as entered on step 1. */
export const PROJECT_NAME: DisplayObject = {
  valueId: `project:${TEST_PROJECT}.name`,
  kind: 'field',
  text: 'TEST project 12',
  shape: 'value',
  badge: { id: 'provided_by_you', label: 'Provided by you' },
};

/** A model area's "Not available yet", naming the missing model. */
export const MODEL_MISSING: DisplayObject = {
  valueId: `project:${TEST_PROJECT}.outputs.model`,
  kind: 'line',
  text: 'Not available yet: TEST IFC model of the building',
  shape: 'missing',
  missing: 'not_available_yet',
  badge: { id: 'not_available_yet', label: 'Not available yet' },
};

// ---------------------------------------------------------------------------------------- phase 4 part B

export const TEST_ASSET_C = '0192f000-0000-7000-8000-0000000a5e03';
export const TEST_ASSET_D = '0192f000-0000-7000-8000-0000000a5e04';

/**
 * A tag written as a number alone, as the resolver serves a written text that holds a digit (a record
 * whose one part is the whole text; resolveWrittenText): numeric for the kit (isNumericDisplay), so
 * ValueName renders it through the value element (A-1).
 */
export const NUMERIC_TAG: DisplayObject = {
  valueId: `asset:${TEST_ASSET_C}.tag`,
  kind: 'record',
  text: '101',
  parts: ['101'],
  shape: 'value',
  badge: { id: 'from_document', label: 'From document' },
  sourceLine: { id: 'document', kind: 'source_line', text: 'Found in TEST Schedule.xlsx, sheet TEST 1' },
};

/** A tag written with a decimal mark ("1.2"), served the same way. */
export const DECIMAL_TAG: DisplayObject = {
  valueId: `asset:${TEST_ASSET_D}.tag`,
  kind: 'record',
  text: '1.2',
  parts: ['1.2'],
  shape: 'value',
  badge: { id: 'from_design_drawings', label: 'From design drawings' },
};

/** A document's stage as written, two words with a long badge (DR-8). */
export const STAGE: DisplayObject = {
  valueId: `document:${TEST_DOCUMENT}.stage`,
  kind: 'field',
  text: 'Technical design',
  shape: 'value',
  badge: { id: 'from_document', label: 'From document' },
};
