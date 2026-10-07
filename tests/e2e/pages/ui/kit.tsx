/**
 * The UI kit's render harness pages (packages/ui; prompt 3 phase 3: "the brand theme and the ui
 * components"; docs/adr/0040-app-theme-tokens.md). Each page renders the kit's real components, with
 * react-dom/server, in the states the wizard uses, and declares the display objects it stands for as
 * the API would serve them: each one's render-test projection (`servedDisplayOf`, the one the app's
 * screens are checked with). tests/e2e/pages/ui/ui-kit.spec.ts checks every page with the render test
 * and axe (WCAG 2.2 AA) and that the files on disk are this module's current output;
 * `pnpm exec tsx tests/e2e/pages/ui/generate.ts` writes them.
 *
 * Every value is a visibly synthetic TEST value in a digit pattern (1, 12, 123, 12,345); none comes
 * from the mockups, the specs or company/. Labels are the kit's props, written here as the app's
 * catalogue writes them; badge labels, status lines, rule lines and the demo line are 2.8's and the
 * registry's texts, as the API serves them. Every display object is checked against the contract's
 * DisplayObjectSchema before a page is written.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import {
  ActionRow,
  ActiveFilters,
  Banner,
  Button,
  CalendarDate,
  Card,
  ChipGroup,
  Choice,
  ChoiceCard,
  ChoiceGroup,
  DemoLine,
  Dropzone,
  InlinePanel,
  Inspector,
  InspectorLayout,
  MenuButton,
  MetricPanel,
  MetricTile,
  ModelArea,
  NotAvailableYet,
  Notice,
  NoticeRegion,
  PageHeader,
  Pager,
  Price,
  Progress,
  RegisterTable,
  SelectField,
  SelectionList,
  SeriesChart,
  SeriesViewSwitch,
  SideNav,
  SkipForNow,
  StatusFooter,
  StatusLine,
  Stepper,
  Switch,
  Tabs,
  TextField,
  Value,
  ValueName,
  WorkspaceFrame,
  KitIcons,
  type RegisterColumn,
  type ValueActionLabels,
} from '@sovitech/ui/components';
import { DisplayObjectSchema, servedDisplayOf, type DisplayObject, type Line } from '@sovitech/view-model/browser';
import { CHART_BREAKDOWN, CHART_SEQUENCE, CHART_UNAVAILABLE, METRICS_DISPLAYS, METRICS_INDEX, TILE_MISSING, TILE_PRICE } from './kit-series';

const {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Building2,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Flame,
  Globe,
  Hotel,
  House,
  Layers,
  LayoutGrid,
  MapPin,
  Network,
  Pencil,
  Upload,
} = KitIcons;

const SUBJECT = '0192f000-0000-7000-8000-00000000b001';
const PROJECT = '0192f000-0000-7000-8000-00000000a001';
const DOCUMENT = '0192f000-0000-7000-8000-00000000d001';
const CANDIDATE = '0192f000-0000-7000-8000-00000000c001';
const HASH = 'b'.repeat(64);

const ACTION_LABELS: ValueActionLabels = { edit: 'Edit', yes: 'Yes', looksRight: 'Looks right', somethingWrong: "Something's wrong" };
const STEPPER_LABELS = { list: 'Intake steps', done: 'Done', newFindings: 'New findings on this step' };
const noop = (): void => undefined;

// ------------------------------------------------------------------------------------ display objects

const AREA: DisplayObject = {
  valueId: `building:${SUBJECT}.grossFloorArea`,
  kind: 'field',
  text: 'TEST 12,345 m²',
  parts: ['TEST 12,345', 'm²'],
  shape: 'value',
  badge: { id: 'from_document', label: 'From document' },
  measure: { label: 'Gross floor area', unit: { code: 'm2', symbol: 'm²' }, qualifierLabel: 'TEST basis' },
  sourceLine: { id: 'found_in', kind: 'source_line', text: 'Found in TEST Area Schedule.pdf, page 1' },
  evidence: [{ documentId: DOCUMENT, contentHash: HASH, excerpt: 'Scd TEST 12.345 mp' }],
  actions: [
    {
      kind: 'edit',
      field: { subjectId: SUBJECT, fieldKey: 'building.grossFloorArea' },
      input: { kind: 'quantity', unit: { code: 'm2', symbol: 'm²' }, qualifiers: ['gross_total'], qualifierRequired: true },
      shownCandidateIds: [CANDIDATE],
    },
  ],
  field: { subjectId: SUBJECT, fieldKey: 'building.grossFloorArea' },
};

// The layout page's values (ui/layout.html), measured in Chromium by ui-kit.spec.ts (phase 3 part B).
const LAYOUT_FLOORS: DisplayObject = {
  valueId: `building:${SUBJECT}.layoutFloors`,
  kind: 'field',
  text: 'TEST 12',
  parts: ['TEST 12'],
  shape: 'value',
  badge: { id: 'provided_by_you', label: 'Provided by you' },
  measure: { label: 'Floors' },
};

const LAYOUT_CITY: DisplayObject = {
  valueId: `project:${PROJECT}.layoutCity`,
  kind: 'field',
  text: 'TEST city',
  shape: 'value',
  badge: { id: 'provided_by_you', label: 'Provided by you' },
  measure: { label: 'City' },
};

const LAYOUT_NAME: DisplayObject = {
  valueId: `project:${PROJECT}.layoutName`,
  kind: 'field',
  text: 'TEST project with a longer name',
  shape: 'value',
  badge: { id: 'provided_by_you', label: 'Provided by you' },
  measure: { label: 'Project name' },
};

const LAYOUT_AREA: DisplayObject = {
  valueId: `building:${SUBJECT}.layoutArea`,
  kind: 'field',
  text: 'TEST 12,345 m²',
  parts: ['TEST 12,345', 'm²'],
  shape: 'value',
  badge: { id: 'provided_by_you', label: 'Provided by you' },
  measure: { label: 'Gross floor area', unit: { code: 'm2', symbol: 'm²' }, qualifierLabel: 'TEST basis' },
};

const LAYOUT_ZONES: DisplayObject = {
  valueId: `building:${SUBJECT}.layoutZones`,
  kind: 'field',
  text: 'Not provided yet',
  shape: 'missing',
  missing: 'not_provided_yet',
  badge: { id: 'not_provided_yet', label: 'Not provided yet' },
  measure: { label: 'Zones' },
};

const LAYOUT_DECISION: DisplayObject = {
  valueId: `project:${PROJECT}.layoutScope`,
  kind: 'field',
  text: 'Included',
  shape: 'value',
  badge: { id: 'provided_by_you', label: 'Provided by you' },
  measure: { label: 'TEST system' },
};

/** Owner text that holds a right-to-left override (U+202E), as an old stored row could (G2-13 refuses it now). */
const LAYOUT_RLO: DisplayObject = {
  valueId: `project:${PROJECT}.layoutOwnerText`,
  kind: 'field',
  text: 'TEST \u202Eyb dedivorP',
  shape: 'value',
  badge: { id: 'provided_by_you', label: 'Provided by you' },
  measure: { label: 'Project name' },
};

const ROOMS_UNKNOWN: DisplayObject = {
  valueId: `building:${SUBJECT}.rooms`,
  kind: 'field',
  text: 'Unknown',
  shape: 'missing',
  missing: 'unknown',
  badge: { id: 'unknown', label: 'Unknown' },
  measure: { label: 'Rooms', qualifierLabel: 'TEST guest rooms' },
};

const ZONES_NOT_PROVIDED: DisplayObject = {
  valueId: `building:${SUBJECT}.zones`,
  kind: 'field',
  text: 'Not provided yet',
  shape: 'missing',
  missing: 'not_provided_yet',
  badge: { id: 'not_provided_yet', label: 'Not provided yet' },
  measure: { label: 'Zones' },
  lines: [{ id: 'provide_later', kind: 'rule_line', text: 'You can provide this later.' }],
};

const FLOORS_READING: DisplayObject = {
  valueId: `building:${SUBJECT}.floors`,
  kind: 'field',
  text: 'Reading documents…',
  shape: 'missing',
  missing: 'reading_documents',
  badge: { id: 'reading_documents', label: 'Reading documents…' },
  measure: { label: 'Floors' },
};

const BUILDING_TYPE: DisplayObject = {
  valueId: `building:${SUBJECT}.type`,
  kind: 'field',
  text: 'TEST hotel',
  shape: 'value',
  badge: { id: 'possible', label: 'Possible' },
  measure: { label: 'Building type' },
  sourceLine: { id: 'guest_rooms_in', kind: 'rule_line', text: 'TEST 123 guest rooms in TEST Rooms.xlsx' },
  actions: [
    { kind: 'confirm', candidateId: CANDIDATE, wording: { id: 'is_this_right', kind: 'rule_line', text: 'Is this right?' } },
    {
      kind: 'edit',
      field: { subjectId: SUBJECT, fieldKey: 'building.type' },
      input: { kind: 'choice', options: ['hotel', 'office'] },
      shownCandidateIds: [CANDIDATE],
    },
  ],
};

const HVAC_ASSETS: DisplayObject = {
  valueId: `building:${SUBJECT}.hvacAssets`,
  kind: 'field',
  text: 'Not available yet',
  shape: 'missing',
  missing: 'not_available_yet',
  badge: { id: 'not_available_yet', label: 'Not available yet' },
  measure: { label: 'HVAC assets' },
  lines: [{ id: 'not_available_yet_named', kind: 'rule_line', text: 'Not available yet: TEST asset taxonomy' }],
  actions: [
    { kind: 'acknowledge', candidateIds: [CANDIDATE] },
    { kind: 'concern', candidateId: CANDIDATE },
  ],
};

const VERIFIED: DisplayObject = {
  valueId: `asset:${SUBJECT}.type`,
  kind: 'field',
  text: 'TEST air handling unit',
  shape: 'value',
  badge: { id: 'verified_by_sovitech', label: 'Verified by SOVITECH' },
  measure: { label: 'Equipment type' },
  sourceLine: { id: 'ai_inference_engineer_verified_line', kind: 'generated_sentence', text: 'AI inference, verified by SOVITECH on 12 Oct' },
};

const ENGINEER_ITEM: DisplayObject = {
  valueId: `asset:${SUBJECT}.ratings`,
  kind: 'field',
  text: 'TEST 123 kW',
  parts: ['TEST 123', 'kW'],
  shape: 'value',
  badge: { id: 'sovitech_will_check', label: 'SOVITECH will check' },
  measure: { label: 'TEST cooling output' },
  sourceLine: { id: 'found_in', kind: 'source_line', text: 'Found in TEST Schedule.xlsx, sheet TEST 1' },
  lines: [{ id: 'provisional_inputs', kind: 'status_line', text: 'Provisional: depends on TEST 12 equipment items not yet checked' }],
};

const PRICE_STAGE_2: DisplayObject = {
  valueId: `project:${PROJECT}.outputs.capexTest`,
  kind: 'field',
  text: 'about TEST 1,200 (TEST 1,100 to TEST 1,300) EUR',
  shape: 'range',
  badge: { id: 'estimated', label: 'Estimated' },
  lines: [{ id: 'preliminary_investment_estimate', kind: 'stage_label', text: 'Preliminary investment estimate' }],
};

const PRICE_MISSING: DisplayObject = {
  valueId: `project:${PROJECT}.outputs.capex`,
  kind: 'line',
  text: 'Not available yet: TEST cost ranges',
  shape: 'missing',
  missing: 'not_available_yet',
  badge: { id: 'not_available_yet', label: 'Not available yet' },
};

const OUTPUT_ADD: DisplayObject = {
  valueId: `project:${PROJECT}.outputs.points`,
  kind: 'line',
  text: 'Not available yet',
  shape: 'missing',
  missing: 'not_available_yet',
  badge: { id: 'not_available_yet', label: 'Not available yet' },
  lines: [{ id: 'add_to_see_this', kind: 'rule_line', text: 'Add the TEST gross floor area to see this.' }],
  actions: [{ kind: 'add', field: { subjectId: SUBJECT, fieldKey: 'building.grossFloorArea' }, label: 'Add TEST gross floor area', step: 8 }],
};

const OPEN_ITEMS: DisplayObject = {
  valueId: `project:${PROJECT}.openItems.owner`,
  kind: 'line',
  text: 'TEST 12 things for you to check',
  shape: 'value',
};

const STILL_READING: DisplayObject = {
  valueId: `project:${PROJECT}.documents.stillReading`,
  kind: 'line',
  text: 'Still reading TEST 12 files. Your estimate will update when they finish.',
  shape: 'value',
};

const COVERAGE: DisplayObject = {
  valueId: `document:${DOCUMENT}.coverage`,
  kind: 'line',
  text: 'Partly analysed (TEST 12 of TEST 123 pages)',
  shape: 'value',
  lines: [{ id: 'partly_analysed', kind: 'status_line', text: 'Partly analysed (TEST 12 of TEST 123 pages)' }],
};

const LATE_NOTICE: DisplayObject = {
  valueId: `project:${PROJECT}.lateFindings.notice`,
  kind: 'line',
  text: "We found TEST 12 more things in your documents. You'll see them on the review step.",
  shape: 'value',
};

const DETECTION_UNKNOWN: DisplayObject = {
  valueId: `building:${SUBJECT}.detection.hvac`,
  kind: 'field',
  text: 'Unknown',
  shape: 'missing',
  missing: 'unknown',
  badge: { id: 'unknown', label: 'Unknown' },
};

const PROJECT_TYPE: DisplayObject = {
  valueId: `project:${PROJECT}.type`,
  kind: 'field',
  text: 'Renovation',
  shape: 'value',
  badge: { id: 'provided_by_you', label: 'Provided by you' },
  measure: { label: 'Type' },
};

const DOCUMENT_COUNT: DisplayObject = {
  valueId: `project:${PROJECT}.documents.count`,
  kind: 'line',
  text: 'TEST 12 files',
  shape: 'value',
};

const DEMO: Line = { id: 'demo_data', kind: 'demo_line', text: 'Demo data, not an assessment of the real building' };
const PROVIDE_LATER: Line = { id: 'provide_later', kind: 'rule_line', text: 'You can provide this later.' };
const SUGGESTED_REASON: Line = { id: 'suggested_because', kind: 'rule_line', text: 'Suggested because TEST goal' };

// ------------------------------------------------------------------------------------ workspace (phase 4)
// The workspace pages' values: an Equipment register of TEST assets, the project card, the inspector, the
// footer, the delete effect, the level labels and the model area. Every one a TEST value in a digit pattern.

const ASSETS = ['0192f000-0000-7000-8000-0000000a5e01', '0192f000-0000-7000-8000-0000000a5e02', '0192f000-0000-7000-8000-0000000a5e03', '0192f000-0000-7000-8000-0000000a5e04'] as const;

const unknownOf = (valueId: string): DisplayObject => ({
  valueId,
  kind: 'field',
  text: 'Unknown',
  shape: 'missing',
  missing: 'unknown',
  badge: { id: 'unknown', label: 'Unknown' },
});

interface KitAssetRow {
  readonly assetId: string;
  readonly tag: DisplayObject;
  readonly system: DisplayObject;
  readonly type: DisplayObject;
  readonly location: DisplayObject;
  readonly level: DisplayObject;
  readonly zone: DisplayObject;
}

const ASSET_ROWS: readonly KitAssetRow[] = [
  {
    assetId: ASSETS[0],
    tag: {
      valueId: `asset:${ASSETS[0]}.tag`,
      kind: 'field',
      text: 'TEST-AHU-12',
      shape: 'value',
      badge: { id: 'from_document', label: 'From document' },
      sourceLine: { id: 'found_in', kind: 'source_line', text: 'Found in TEST Schedule.xlsx, sheet TEST 1' },
    },
    system: { valueId: `asset:${ASSETS[0]}.system`, kind: 'field', text: 'TEST HVAC', shape: 'value', badge: { id: 'likely', label: 'Likely' } },
    type: { valueId: `asset:${ASSETS[0]}.type`, kind: 'field', text: 'TEST air handling unit', shape: 'value', badge: { id: 'sovitech_will_check', label: 'SOVITECH will check' } },
    location: unknownOf(`asset:${ASSETS[0]}.location`),
    level: { valueId: `building:${SUBJECT}.levels.upper_1`, kind: 'field', text: 'TEST E1', shape: 'value', badge: { id: 'provided_by_you', label: 'Provided by you' } },
    zone: unknownOf(`asset:${ASSETS[0]}.zone`),
  },
  {
    assetId: ASSETS[1],
    tag: { valueId: `asset:${ASSETS[1]}.tag`, kind: 'field', text: 'TEST-FCU-123', shape: 'value', badge: { id: 'from_document', label: 'From document' } },
    system: unknownOf(`asset:${ASSETS[1]}.system`),
    type: unknownOf(`asset:${ASSETS[1]}.type`),
    location: unknownOf(`asset:${ASSETS[1]}.location`),
    level: unknownOf(`asset:${ASSETS[1]}.level`),
    zone: unknownOf(`asset:${ASSETS[1]}.zone`),
  },
  {
    assetId: ASSETS[2],
    tag: { valueId: `asset:${ASSETS[2]}.tag`, kind: 'field', text: 'TEST-P-1.2', shape: 'value', badge: { id: 'from_design_drawings', label: 'From design drawings' } },
    system: unknownOf(`asset:${ASSETS[2]}.system`),
    type: { valueId: `asset:${ASSETS[2]}.type`, kind: 'field', text: 'TEST pump', shape: 'value', badge: { id: 'possible', label: 'Possible' } },
    location: { valueId: `asset:${ASSETS[2]}.location`, kind: 'field', text: 'TEST plant room 12', shape: 'value', badge: { id: 'from_document', label: 'From document' } },
    level: unknownOf(`asset:${ASSETS[2]}.level`),
    zone: unknownOf(`asset:${ASSETS[2]}.zone`),
  },
  // A tag written as a number alone (A-1): a record whose one part is the number, as the resolver serves it;
  // the inspector's subheading shows it through ValueName, which renders it through the value element.
  {
    assetId: ASSETS[3],
    tag: {
      valueId: `asset:${ASSETS[3]}.tag`,
      kind: 'record',
      text: '123',
      parts: ['123'],
      shape: 'value',
      badge: { id: 'from_document', label: 'From document' },
      sourceLine: { id: 'document', kind: 'source_line', text: 'Found in TEST Schedule.xlsx, sheet TEST 1' },
    },
    system: { valueId: `asset:${ASSETS[3]}.system`, kind: 'field', text: 'TEST HVAC', shape: 'value', badge: { id: 'likely', label: 'Likely' } },
    type: { valueId: `asset:${ASSETS[3]}.type`, kind: 'field', text: 'TEST fan coil unit', shape: 'value', badge: { id: 'possible', label: 'Possible' } },
    location: { valueId: `asset:${ASSETS[3]}.location`, kind: 'field', text: 'TEST guest room corridor 12', shape: 'value', badge: { id: 'from_document', label: 'From document' } },
    level: unknownOf(`asset:${ASSETS[3]}.level`),
    zone: unknownOf(`asset:${ASSETS[3]}.zone`),
  },
];

/** The row the inspector shows on the frame page: the numerically written tag (A-1). */
const INSPECTED: KitAssetRow = ASSET_ROWS[3] as KitAssetRow;

const ASSET_COLUMNS: readonly RegisterColumn<KitAssetRow>[] = [
  { kind: 'value', id: 'tag', header: 'Tag', value: (row) => row.tag, rowHeader: true },
  { kind: 'value', id: 'system', header: 'System', value: (row) => row.system },
  { kind: 'value', id: 'type', header: 'Type', value: (row) => row.type },
  { kind: 'value', id: 'location', header: 'Location', value: (row) => row.location },
  { kind: 'value', id: 'level', header: 'Floor', value: (row) => row.level },
  { kind: 'value', id: 'zone', header: 'Zone', value: (row) => row.zone },
];

const ASSET_POINTS: DisplayObject = {
  valueId: `asset:${ASSETS[0]}.points`,
  kind: 'line',
  text: 'Not available yet: TEST point templates',
  shape: 'missing',
  missing: 'not_available_yet',
  badge: { id: 'not_available_yet', label: 'Not available yet' },
};

const CARD_BUILDING_TYPE: DisplayObject = {
  valueId: `building:${SUBJECT}.typeCard`,
  kind: 'field',
  text: 'TEST hotel',
  shape: 'value',
  badge: { id: 'possible', label: 'Possible' },
  measure: { label: 'Building type' },
};

const CARD_AREA: DisplayObject = { ...LAYOUT_AREA, valueId: `building:${SUBJECT}.grossFloorAreaCard` };

const CARD_FLOORS: DisplayObject = {
  valueId: `building:${SUBJECT}.floors.upper`,
  kind: 'field',
  text: 'TEST 12',
  parts: ['TEST 12'],
  shape: 'value',
  badge: { id: 'provided_by_you', label: 'Provided by you' },
  measure: { label: 'Upper floors' },
};

const FRAME_PROJECT_NAME: DisplayObject = {
  valueId: `project:${PROJECT}.name`,
  kind: 'field',
  text: 'TEST project 12',
  shape: 'value',
  badge: { id: 'provided_by_you', label: 'Provided by you' },
};

const FRAME_STILL_READING: DisplayObject = { ...STILL_READING };

const DELETE_EFFECT: DisplayObject = {
  valueId: `document:${DOCUMENT}.deleteEffect`,
  kind: 'line',
  text: 'TEST 3 values will return to Unknown',
  shape: 'value',
};

const DELETE_FILE: DisplayObject = { valueId: `document:${DOCUMENT}.fileName`, kind: 'record', text: 'TEST-plan-12.pdf', shape: 'value' };

const LEVELS: readonly DisplayObject[] = [
  { valueId: `building:${SUBJECT}.levels.below_ground_1`, kind: 'field', text: 'TEST S1', shape: 'value', badge: { id: 'provided_by_you', label: 'Provided by you' } },
  { valueId: `building:${SUBJECT}.levels.ground_1`, kind: 'field', text: 'TEST P', shape: 'value', badge: { id: 'provided_by_you', label: 'Provided by you' } },
  { valueId: `building:${SUBJECT}.levels.upper_2`, kind: 'field', text: 'TEST E2', shape: 'value', badge: { id: 'provided_by_you', label: 'Provided by you' } },
];

const SCOPE_HVAC: DisplayObject = { valueId: `project:${PROJECT}.scope.hvac`, kind: 'field', text: 'Included', shape: 'value', badge: { id: 'provided_by_you', label: 'Provided by you' } };
const SCOPE_FIRE: DisplayObject = { valueId: `project:${PROJECT}.scope.fire_safety`, kind: 'field', text: 'Not provided yet', shape: 'missing', missing: 'not_provided_yet', badge: { id: 'not_provided_yet', label: 'Not provided yet' } };

const MODEL_NOT_AVAILABLE: DisplayObject = {
  valueId: `project:${PROJECT}.outputs.model`,
  kind: 'line',
  text: 'Not available yet: an IFC model of the building',
  shape: 'missing',
  missing: 'not_available_yet',
  badge: { id: 'not_available_yet', label: 'Not available yet' },
};

const MODEL_STORED_LINE: Line = { id: 'not_analysed', kind: 'status_line', text: 'Not analysed: IFC model stored, not analysed' };
const NO_MODEL_LINE: Line = { id: 'not_available_yet_named', kind: 'rule_line', text: 'Not available yet: an IFC model of the building' };

const FRAME_ITEMS = [
  { id: 'proposal', label: 'Proposal', href: '#proposal', icon: House, current: false },
  { id: 'system_scope', label: 'System Scope', href: '#system-scope', icon: Layers, current: false },
  { id: 'topology', label: 'Topology', href: '#topology', icon: Network, current: false },
  { id: 'zones', label: 'Zones', href: '#zones', icon: LayoutGrid, current: false },
  { id: 'equipment', label: 'Equipment', href: '#equipment', icon: Boxes, current: true },
  { id: 'documents', label: 'Documents', href: '#documents', icon: FileText, current: false },
] as const;

const DOCUMENT_FRAME_ITEMS = FRAME_ITEMS.map((item) => ({ ...item, current: item.id === 'documents' }));

/** The sidebar both frame pages share: the project, the flat page list and the project card. */
function frameSidebar(items: typeof FRAME_ITEMS | typeof DOCUMENT_FRAME_ITEMS): ReactElement {
  return (
    <>
      <p className="kit-sidebar-project">
        <span className="kit-sidebar-label">Project</span> <ValueName display={FRAME_PROJECT_NAME} showBadge={false} />
      </p>
      <SideNav label="Project pages" items={items} />
      <section aria-labelledby="kit-card-heading" className="kit-stack-tight">
        <h2 id="kit-card-heading" className="kit-sidebar-label">
          Building
        </h2>
        <ul className="kit-facts">
          {[PROJECT_TYPE, CARD_BUILDING_TYPE, CARD_AREA, CARD_FLOORS].map((display) => (
            <li key={display.valueId}>
              <Value display={display} layout="stack" />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

// The Documents register (phase 4 part B: DR-2's menu control, DR-8's stage in the inspector, DR-10's small line).
const DOCUMENTS = ['0192f000-0000-7000-8000-00000000d101', '0192f000-0000-7000-8000-00000000d102', '0192f000-0000-7000-8000-00000000d103'] as const;

interface KitDocumentRow {
  readonly documentId: string;
  readonly fileName: DisplayObject;
  readonly category: DisplayObject;
  readonly version: DisplayObject;
  readonly stage: DisplayObject;
  readonly analysis: { readonly line: Line } | { readonly display: DisplayObject };
}

const fileNameOf = (documentId: string, text: string): DisplayObject => ({ valueId: `document:${documentId}.fileName`, kind: 'record', text, parts: [text], shape: 'value' });

const DOCUMENT_ROWS: readonly KitDocumentRow[] = [
  {
    documentId: DOCUMENTS[0],
    fileName: fileNameOf(DOCUMENTS[0], 'TEST-architectural-plans-level-12-rev-123.pdf'),
    category: unknownOf(`document:${DOCUMENTS[0]}.category`),
    version: unknownOf(`document:${DOCUMENTS[0]}.revision`),
    stage: { valueId: `document:${DOCUMENTS[0]}.stage`, kind: 'field', text: 'Technical design', shape: 'value', badge: { id: 'from_document', label: 'From document' } },
    analysis: {
      display: {
        valueId: `document:${DOCUMENTS[0]}.coverage`,
        kind: 'line',
        text: 'Partly analysed (TEST 12 of TEST 123 pages)',
        shape: 'value',
        lines: [{ id: 'partly_analysed', kind: 'status_line', text: 'Partly analysed (TEST 12 of TEST 123 pages)' }],
      },
    },
  },
  {
    documentId: DOCUMENTS[1],
    fileName: fileNameOf(DOCUMENTS[1], 'TEST-mep-equipment-schedule-12.xlsx'),
    category: unknownOf(`document:${DOCUMENTS[1]}.category`),
    version: unknownOf(`document:${DOCUMENTS[1]}.revision`),
    stage: unknownOf(`document:${DOCUMENTS[1]}.stage`),
    analysis: { line: { id: 'analysis_failed', kind: 'status_line', text: 'Analysis failed' } },
  },
  {
    documentId: DOCUMENTS[2],
    fileName: fileNameOf(DOCUMENTS[2], 'TEST-building-model-rev-12.ifc'),
    category: unknownOf(`document:${DOCUMENTS[2]}.category`),
    version: unknownOf(`document:${DOCUMENTS[2]}.revision`),
    stage: unknownOf(`document:${DOCUMENTS[2]}.stage`),
    analysis: { line: { id: 'not_analysed', kind: 'status_line', text: 'Not analysed: IFC model stored, not analysed' } },
  },
];

const OPENED_DOCUMENT: KitDocumentRow = DOCUMENT_ROWS[0] as KitDocumentRow;
const ADDED = new Date(2026, 9, 2);

const analysisOf = (row: KitDocumentRow, size: 'default' | 'small'): ReactElement =>
  'line' in row.analysis ? <StatusLine line={row.analysis.line} size={size} /> : <StatusLine display={row.analysis.display} size={size} />;

const DOCUMENT_MENU = [
  { id: 'download', label: 'Download', onSelect: noop },
  { id: 'replace', label: 'Replace', onSelect: noop },
  { id: 'revision', label: 'Mark as a revision of another document', onSelect: noop },
  { id: 'delete', label: 'Delete', onSelect: noop },
];

const DOCUMENT_COLUMNS: readonly RegisterColumn<KitDocumentRow>[] = [
  {
    kind: 'content',
    id: 'name',
    header: 'Name',
    rowHeader: true,
    sort: { direction: 'ascending', onSort: noop },
    cell: (row) => (
      <span className="kit-file">
        <FileText className="sov-icon" data-size="small" size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" />
        <span className="kit-file__name">
          <ValueName display={row.fileName} />
        </span>
      </span>
    ),
  },
  { kind: 'value', id: 'category', header: 'Category', value: (row) => row.category, sort: { direction: 'none', onSort: noop } },
  { kind: 'value', id: 'version', header: 'Version', value: (row) => row.version, sort: { direction: 'none', onSort: noop } },
  { kind: 'value', id: 'stage', header: 'Stage', value: (row) => row.stage, sort: { direction: 'none', onSort: noop } },
  { kind: 'content', id: 'added', header: 'Date Added', cell: () => <CalendarDate date={ADDED} />, sort: { direction: 'none', onSort: noop } },
  { kind: 'content', id: 'analysis', header: 'Analysis', cell: (row) => analysisOf(row, 'small'), sort: { direction: 'none', onSort: noop } },
];

// ------------------------------------------------------------------------------------ the Metrics charts (phase 6)

// The chart series and the tiles' values live in ./kit-series.ts (plain data, read by G9-9 too: phase 6 part B, A-7).
const CHART_LABELS = { name: 'Investment by system', pointColumn: 'System', valueColumn: 'Investment', total: 'Total', showTable: 'Show as a table', showChart: 'Show as a chart' } as const;

// ------------------------------------------------------------------------------------ pages

export interface KitPage {
  /** Path under tests/e2e/pages/. */
  readonly file: string;
  /** What the page shows (the harness list's `about`). */
  readonly about: string;
  readonly title: string;
  /**
   * `own`: the page draws its own landmarks (the workspace frame: its aside, its one main and its footer),
   * so the harness adds no `main` or title heading around it and the frame takes the whole window, as in
   * the app (DR-3). Default: the harness's `main` with the title as its `h1`.
   */
  readonly landmarks?: 'own';
  readonly displayObjects: readonly DisplayObject[];
  readonly body: () => ReactElement;
}

const section = (heading: string, content: ReactElement): ReactElement => (
  <section className="kit-section">
    <h2>{heading}</h2>
    {content}
  </section>
);

export const KIT_PAGES: readonly KitPage[] = [
  {
    file: 'ui/value.html',
    about: 'the Value component: a document value with its unit as parts, badge, source line and excerpt, in every layout; Unknown, Not provided yet and Reading documents; a confirmation; an engineer item with Looks right and Something is wrong; Verified by SOVITECH with its generated sentence',
    title: 'UI kit: values',
    displayObjects: [AREA, ROOMS_UNKNOWN, ZONES_NOT_PROVIDED, FLOORS_READING, BUILDING_TYPE, HVAC_ASSETS, VERIFIED, ENGINEER_ITEM],
    body: () => (
      <>
        {section(
          'A document value in each layout',
          <div className="kit-stack">
            <Value display={AREA} onAction={noop} actionLabels={ACTION_LABELS} evidenceLabel="Show the excerpt" />
            <Value display={AREA} layout="row" icon={Building2} />
            <Value display={AREA} layout="detail" icon={Building2} onAction={noop} actionLabels={ACTION_LABELS} />
          </div>,
        )}
        {section(
          'Missing values',
          <div className="kit-stack">
            <Value display={ROOMS_UNKNOWN} layout="row" />
            <Value display={ZONES_NOT_PROVIDED} layout="row" onAction={noop} actionLabels={ACTION_LABELS} />
            <Value display={FLOORS_READING} layout="row" />
          </div>,
        )}
        {section(
          'Confirmation and engineer items',
          <div className="kit-stack">
            <Value display={BUILDING_TYPE} layout="detail" icon={Hotel} onAction={noop} actionLabels={ACTION_LABELS} />
            <Value display={HVAC_ASSETS} layout="detail" onAction={noop} actionLabels={ACTION_LABELS} />
            <Value display={ENGINEER_ITEM} layout="detail" />
            <Value display={VERIFIED} layout="detail" />
          </div>,
        )}
      </>
    ),
  },
  {
    file: 'ui/lines.html',
    about: 'the demo line, StatusLine with bound counts and plain 2.8 and rule lines, Not available yet with and without an owner action, the stage 2 price and a missing price, Skip for now before and after a skip',
    title: 'UI kit: lines',
    displayObjects: [OPEN_ITEMS, STILL_READING, COVERAGE, OUTPUT_ADD, PRICE_MISSING, PRICE_STAGE_2],
    body: () => (
      <>
        <DemoLine line={DEMO} />
        {section(
          'Status lines',
          <div className="kit-stack">
            <StatusLine display={OPEN_ITEMS} />
            <StatusLine display={STILL_READING} icon={ClipboardList} />
            <StatusLine display={COVERAGE} />
            <StatusLine line={{ id: 'analysis_failed', kind: 'status_line', text: 'Analysis failed' }} />
            <StatusLine line={{ id: 'not_analysed', kind: 'status_line', text: 'Not analysed: IFC model stored, not analysed' }} />
            <StatusLine line={PROVIDE_LATER} />
          </div>,
        )}
        {section(
          'Not available yet',
          <div className="kit-stack">
            <NotAvailableYet display={OUTPUT_ADD} onAdd={noop} />
            <NotAvailableYet display={PRICE_MISSING} />
          </div>,
        )}
        {section(
          'Prices',
          <div className="kit-stack">
            <Price display={PRICE_STAGE_2} label="Investment" />
            <Price display={PRICE_MISSING} label="Investment" />
          </div>,
        )}
        {section(
          'Skip for now',
          <div className="kit-stack">
            <SkipForNow
              question={{ questionId: 'q.test', state: 'unanswered', skip: { kind: 'skip', questionId: 'q.test' }, afterSkip: null }}
              label="Skip for now"
              onSkip={noop}
            />
            <SkipForNow
              question={{ questionId: 'q.test.skipped', state: 'skipped', skip: null, afterSkip: PROVIDE_LATER }}
              label="Skip for now"
              onSkip={noop}
            />
          </div>,
        )}
      </>
    ),
  },
  {
    file: 'ui/stepper-first-step.html',
    about: 'the stepper on step 1, every other step upcoming with its number',
    title: 'UI kit: stepper on the first step',
    displayObjects: [],
    body: () => <Stepper current={1} done={[]} labels={STEPPER_LABELS} />,
  },
  {
    file: 'ui/stepper-late-finding.html',
    about: 'the stepper on step 6 with steps 1 to 5 left, and a late-finding dot on step 3',
    title: 'UI kit: stepper with a late finding',
    displayObjects: [],
    body: () => <Stepper current={6} done={[1, 2, 3, 4, 5]} dots={[3]} labels={STEPPER_LABELS} />,
  },
  {
    file: 'ui/stepper-last-step.html',
    about: 'the stepper on step 8 with every other step left',
    title: 'UI kit: stepper on the last step',
    displayObjects: [],
    body: () => <Stepper current={8} done={[1, 2, 3, 4, 5, 6, 7]} labels={STEPPER_LABELS} />,
  },
  {
    file: 'ui/forms.html',
    about: 'text fields with an inline error, a character counter and a floating label, the country select with an error, radio cards, tiles and pills, unanswered radio groups (cards and plain radios, every option an empty ring: G7-17), checkbox cards with a detection value and a suggestion, a plain checkbox, and every button variant',
    title: 'UI kit: forms',
    displayObjects: [DETECTION_UNKNOWN],
    body: () => (
      <form className="kit-stack" aria-label="TEST form">
        <TextField label="Project name" icon={Building2} value="" onChange={noop} required error="Fill in this field to create the project." />
        <TextField label="City" labelPlacement="inside" icon={MapPin} value="TEST town" onChange={noop} required />
        <TextField label="Note" value="TEST" onChange={noop} maxLength={40} showCounter hint="TEST helper line." />
        <SelectField
          label="Country"
          icon={Globe}
          placeholder="Choose a country"
          options={[
            { value: 'RO', label: 'Romania' },
            { value: 'BG', label: 'Bulgaria' },
          ]}
          value=""
          onChange={noop}
          required
          error="Fill in this field to create the project."
        />
        <ChoiceGroup legend="What type of project is this?">
          <ChoiceCard type="radio" name="projectType" value="new_construction" checked={false} onChange={noop} title="New construction" icon={Building2} indicator="bottom-center" />
          <ChoiceCard type="radio" name="projectType" value="renovation" checked onChange={noop} title="Renovation" icon={Building2} indicator="bottom-center" />
        </ChoiceGroup>
        <ChoiceGroup legend="What type of building is it?" hint="TEST reason line." icon={Building2} columns={6}>
          <ChoiceCard type="radio" name="buildingType" value="hotel" checked onChange={noop} title="Hotel" icon={Hotel} shape="tile" />
          <ChoiceCard type="radio" name="buildingType" value="office" checked={false} onChange={noop} title="Office" icon={Building2} shape="tile" />
        </ChoiceGroup>
        <div id="forms-unanswered" className="kit-stack">
          <ChoiceGroup legend="TEST question with no answer yet">
            <ChoiceCard type="radio" name="unansweredType" value="new_construction" checked={false} onChange={noop} title="New construction" icon={Building2} indicator="bottom-center" />
            <ChoiceCard type="radio" name="unansweredType" value="renovation" checked={false} onChange={noop} title="Renovation" icon={Building2} indicator="bottom-center" />
          </ChoiceGroup>
          <fieldset className="kit-plain-group">
            <legend>TEST area basis with no answer yet</legend>
            <Choice type="radio" name="unansweredBasis" value="gross_total" checked={false} onChange={noop} label="TEST gross total" />
            <Choice type="radio" name="unansweredBasis" value="net_usable" checked={false} onChange={noop} label="TEST net usable" />
          </fieldset>
        </div>
        <ChoiceGroup legend="When does it operate?" icon={CalendarClock} footer={<SkipForNow question={{ questionId: 'q.schedule', state: 'unanswered', skip: { kind: 'skip', questionId: 'q.schedule' }, afterSkip: null }} label="Skip for now" onSkip={noop} />}>
          <ChoiceCard type="radio" name="schedule" value="around_the_clock" checked={false} onChange={noop} title="Around the clock" icon={CalendarClock} shape="pill" />
          <ChoiceCard type="radio" name="schedule" value="business_hours" checked={false} onChange={noop} title="Business hours" icon={CalendarClock} shape="pill" />
        </ChoiceGroup>
        <ChoiceGroup legend="Which systems should be included?">
          <ChoiceCard
            type="checkbox"
            name="scope"
            value="hvac"
            checked
            onChange={noop}
            title="HVAC"
            description="Heating, ventilation and cooling systems"
            icon={Building2}
            extra={
              <>
                <Value display={DETECTION_UNKNOWN} layout="bare" />
                <StatusLine line={SUGGESTED_REASON} as="span" />
              </>
            }
          />
          <ChoiceCard
            type="checkbox"
            name="scope"
            value="fire_safety"
            checked={false}
            onChange={noop}
            title="Fire Safety"
            description="Monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system"
            icon={Flame}
          />
        </ChoiceGroup>
        <Choice type="checkbox" name="plain" value="plain" checked={false} onChange={noop} label="TEST plain option" />
        <div className="kit-row">
          <Button variant="secondary" size="wizard" icon={ArrowLeft}>
            Back
          </Button>
          <Button variant="primary" size="wizard" trailingIcon={ArrowRight}>
            Continue
          </Button>
          <Button variant="accent">Browse files</Button>
          <Button variant="link" icon={Pencil}>
            Edit
          </Button>
          <Button variant="quiet">Generate without it</Button>
        </div>
      </form>
    ),
  },
  {
    file: 'ui/surfaces.html',
    about: 'a summary card with bound rows and its Edit link, the info banner, action rows, the notice region with a bound notice, the dropzone with its reviewed size line, a progress bar and the header date',
    title: 'UI kit: surfaces',
    displayObjects: [PROJECT_TYPE, DOCUMENT_COUNT, LATE_NOTICE],
    body: () => (
      <div className="kit-stack">
        <NoticeRegion label="Notices">
          <Notice display={LATE_NOTICE} dismissLabel="Dismiss" onDismiss={noop} />
        </NoticeRegion>
        <div className="kit-row">
          <Card title="Project" icon={ClipboardList} headerAction={<Button variant="link" icon={Pencil}>Edit</Button>}>
            <Value display={PROJECT_TYPE} />
          </Card>
          <Card title="Documents" icon={ClipboardList} tone="raised">
            <StatusLine display={DOCUMENT_COUNT} />
          </Card>
        </div>
        <Banner title="TEST banner title">TEST banner text. You can change this later.</Banner>
        <ActionRow icon={Eye} onClick={noop}>
          View all extracted data
        </ActionRow>
        <ActionRow icon={ClipboardList} href="#review" detail="TEST detail line">
          TEST review row
        </ActionRow>
        <Dropzone
          labels={{
            title: 'Drag and drop your files here',
            or: 'or',
            browse: 'Browse files',
            formats: 'PDF, DWG, IFC, RVT, XLSX, DOCX, JPG, PNG, ZIP',
            limit: 'Max file size 500 MB',
          }}
          onFiles={noop}
        />
        <Progress label="Uploading" />
        <p>
          Today <CalendarDate date={new Date(2026, 8, 25)} />
        </p>
      </div>
    ),
  },
  {
    file: 'ui/layout.html',
    about:
      'the phase 3 part B layouts measured in Chromium by ui-kit.spec.ts: value rows in a narrow card (DR-1), the status slot on tall cards, a tile and a pill (DR-2), progress with visible, hidden and served text (DR-4), the skip link and its later line under a grid (DR-14), and owner text holding a direction control, isolated (A-8)',
    title: 'UI kit: layouts',
    displayObjects: [LAYOUT_FLOORS, LAYOUT_CITY, LAYOUT_NAME, LAYOUT_AREA, LAYOUT_ZONES, LAYOUT_DECISION, LAYOUT_RLO],
    body: () => (
      <div className="kit-stack">
        {section(
          'Value rows in a narrow card',
          <div id="layout-rows" className="sov-card" style={{ width: '300px' }}>
            <Value display={LAYOUT_FLOORS} layout="row" />
            <Value display={LAYOUT_CITY} layout="row" />
            <Value display={LAYOUT_NAME} layout="row" />
            <Value display={LAYOUT_AREA} layout="row" />
            <Value display={LAYOUT_ZONES} layout="row" />
          </div>,
        )}
        {section(
          'The status slot',
          <div className="kit-stack">
            <div id="layout-tall" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px' }}>
              {['a', 'b', 'c'].map((key) => (
                <ChoiceCard
                  key={key}
                  type="checkbox"
                  name="layout-tall"
                  value={key}
                  checked={key === 'a'}
                  onChange={noop}
                  title={`TEST card ${key}`}
                  description="TEST description on a longer line of text for the card"
                  icon={Building2}
                  {...(key === 'a' ? { status: <Value display={LAYOUT_DECISION} layout="compact" label={null} /> } : {})}
                />
              ))}
            </div>
            <div id="layout-narrow" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 128px)', gap: '16px' }}>
              {['a', 'b', 'c', 'd', 'e', 'f'].map((key) => (
                <ChoiceCard
                  key={key}
                  type="radio"
                  name="layout-narrow"
                  value={key}
                  checked={key === 'a'}
                  onChange={noop}
                  title={`TEST ${key}`}
                  icon={Hotel}
                  shape="tile"
                  {...(key === 'a' ? { status: <Value display={LAYOUT_DECISION} layout="compact" label={null} /> } : {})}
                />
              ))}
            </div>
            <div id="layout-shapes" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 420px)', gap: '20px' }}>
              <ChoiceCard type="radio" name="layout-pill" value="p" checked onChange={noop} title="TEST pill" icon={Hotel} shape="pill" status={<Value display={LAYOUT_DECISION} layout="compact" label={null} />} />
              <ChoiceCard type="radio" name="layout-tile" value="t" checked onChange={noop} title="TEST tile" icon={Hotel} shape="tile" status={<Value display={LAYOUT_DECISION} layout="compact" label={null} />} />
            </div>
          </div>,
        )}
        {section(
          'Progress',
          <div className="kit-row">
            <span id="layout-progress-visible">
              <Progress label="Uploading" />
            </span>
            <span id="layout-progress-hidden">
              <Progress label="Uploading" labelDisplay="hidden" />
            </span>
            <span id="layout-progress-line">
              <Progress label={{ id: 'reading_documents', kind: 'status_line', text: 'Reading documents…' }} />
            </span>
          </div>,
        )}
        {section(
          'Skip for now under a grid',
          <div className="kit-stack">
            <div id="layout-skip-group">
              <ChoiceGroup legend="TEST question in a group" columns={3} footer={<SkipForNow question={{ questionId: 'q.test', state: 'unanswered', skip: { kind: 'skip', questionId: 'q.test' }, afterSkip: null }} label="Skip for now" onSkip={noop} />}>
                {['a', 'b', 'c'].map((key) => (
                  <ChoiceCard key={key} type="checkbox" name="layout-group" value={key} checked={false} onChange={noop} title={`TEST option ${key}`} icon={Building2} />
                ))}
              </ChoiceGroup>
            </div>
            <fieldset id="layout-skip-later" style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="sov-visually-hidden">TEST question skipped</legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px' }}>
                {['a', 'b', 'c'].map((key) => (
                  <ChoiceCard key={key} type="checkbox" name="layout-later" value={key} checked={false} onChange={noop} title={`TEST choice ${key}`} icon={Building2} />
                ))}
              </div>
              <SkipForNow question={{ questionId: 'q.test.later', state: 'skipped', skip: null, afterSkip: { id: 'provide_later', kind: 'rule_line', text: 'You can provide this later.' } }} label="Skip for now" onSkip={noop} />
            </fieldset>
          </div>,
        )}
        {section(
          'Owner text with a direction control',
          <div id="layout-isolated" className="kit-inline">
            <span className="kit-copy-before">Project: </span>
            <Value display={LAYOUT_RLO} layout="bare" />
            <span className="kit-copy-after"> is on the list.</span>
          </div>,
        )}
      </div>
    ),
  },
  {
    file: 'ui/workspace-frame.html',
    about:
      'the phase 4 workspace frame on the demo project, with its own landmarks (the sidebar an aside, the page column the one main, the footer the contentinfo: DR-3): the sidebar with the flat page list and the project card, the page header with its back link, the active filters, the Equipment register with selection, the open row, the badge column (a missing type\'s pill in its own cell: DR-6), the pinned name and controls (DR-2) and the row links, the pager, the inspector with its tabs and a tag written as a number in its subheading (A-1), and the 48px status footer with the demo line and "Still reading"',
    title: 'UI kit: workspace frame',
    landmarks: 'own',
    displayObjects: [
      FRAME_PROJECT_NAME,
      PROJECT_TYPE,
      CARD_BUILDING_TYPE,
      CARD_AREA,
      CARD_FLOORS,
      ...ASSET_ROWS.flatMap((row) => [row.tag, row.system, row.type, row.location, row.level, row.zone]),
      ASSET_POINTS,
      FRAME_STILL_READING,
    ],
    body: () => (
      <WorkspaceFrame
        sidebarLabel="Project"
        sidebar={frameSidebar(FRAME_ITEMS)}
        footer={<StatusFooter label="Project status" demoLine={DEMO} stillReading={FRAME_STILL_READING} />}
      >
        <PageHeader
          title="Equipment"
          subtitle="Explore and filter the equipment found in your documents."
          back={{ label: 'Back to System Scope', href: '#system-scope' }}
          actions={
            <Button variant="secondary" icon={Download}>
              Filters
            </Button>
          }
        />
        <ActiveFilters
          label="Active filters"
          filters={[
            { id: 'system', name: 'System', value: 'HVAC' },
            { id: 'level', name: 'Floor', value: <ValueName display={ASSET_ROWS[0]?.level ?? FRAME_PROJECT_NAME} /> },
          ]}
          removeLabel="Remove this filter"
          onRemove={noop}
          clearLabel="Clear filters"
          onClear={noop}
        />
        <InspectorLayout
          inspector={
            <Inspector
              id="kit-inspector"
              heading="Equipment details"
              subheading={<ValueName display={INSPECTED.tag} showBadge={false} />}
              closeLabel="Close"
              onClose={noop}
              footer={
                <Button variant="secondary" trailingIcon={ChevronRight}>
                  Open the full record
                </Button>
              }
            >
              <Tabs
                label="Equipment details"
                tabs={[
                  {
                    id: 'overview',
                    label: 'Overview',
                    panel: (
                      <div className="kit-facts">
                        <Value display={INSPECTED.type} layout="row" label="Type" />
                        <Value display={INSPECTED.system} layout="row" label="System" />
                        <Value display={INSPECTED.location} layout="row" label="Location" />
                      </div>
                    ),
                  },
                  { id: 'points', label: 'Points', panel: <NotAvailableYet display={ASSET_POINTS} /> },
                  { id: 'documents', label: 'Documents', panel: <p>TEST documents</p> },
                ]}
              />
            </Inspector>
          }
        >
          <RegisterTable<KitAssetRow>
            label="Equipment"
            columns={ASSET_COLUMNS}
            rows={ASSET_ROWS}
            rowKey={(row) => row.assetId}
            badgeColumn={{ column: 'type', header: 'Badge' }}
            selection={{ selected: new Set([ASSETS[1]]), onToggle: noop, onToggleAll: noop, header: 'Select', rowLabel: 'Select this equipment', allLabel: 'Select all equipment on this page' }}
            open={{ onOpen: noop, label: 'Show details', header: 'Details', inspectorId: 'kit-inspector' }}
            current={INSPECTED.assetId}
            rowAction={{
              header: 'Full record',
              render: () => (
                <a className="sov-icon-button" href="#asset" aria-label="Open the full record">
                  <ChevronRight className="sov-icon" data-size="small" size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" />
                </a>
              ),
            }}
          />
          <Pager label="Pages" previousLabel="Previous" nextLabel="Next" hasPrevious={false} hasNext onPrevious={noop} onNext={noop} />
        </InspectorLayout>
      </WorkspaceFrame>
    ),
  },
  {
    file: 'ui/workspace-documents.html',
    about:
      'the phase 4 Documents register in the workspace frame at 1440 with its inspector open (phase 4 part B): long file names, the pinned name, details and "More actions" controls (DR-2), the Analysis lines in the small size (DR-10), and the inspector\'s Stage "Technical design" with its badge in the 112px-label detail grid, no word split (DR-8)',
    title: 'UI kit: workspace documents',
    landmarks: 'own',
    displayObjects: [
      FRAME_PROJECT_NAME,
      PROJECT_TYPE,
      CARD_BUILDING_TYPE,
      CARD_AREA,
      CARD_FLOORS,
      ...DOCUMENT_ROWS.flatMap((row) => [row.fileName, row.category, row.version, row.stage, ...('display' in row.analysis ? [row.analysis.display] : [])]),
      FRAME_STILL_READING,
    ],
    body: () => (
      <WorkspaceFrame
        sidebarLabel="Project"
        sidebar={frameSidebar(DOCUMENT_FRAME_ITEMS)}
        footer={<StatusFooter label="Project status" demoLine={DEMO} stillReading={FRAME_STILL_READING} />}
      >
        <PageHeader
          eyebrow="Documents"
          title="Project Documents"
          subtitle="Upload, view and manage all project-related documents."
          actions={
            <Button variant="primary" icon={Upload}>
              Upload Document
            </Button>
          }
        />
        <InspectorLayout
          inspector={
            <Inspector
              id="kit-document-inspector"
              heading={<ValueName display={OPENED_DOCUMENT.fileName} />}
              subheading="PDF"
              closeLabel="Close"
              onClose={noop}
              footer={
                <div className="kit-inspector-actions">
                  <Button variant="secondary" icon={Download}>
                    Download
                  </Button>
                  <MenuButton label="More actions" items={DOCUMENT_MENU} />
                </div>
              }
            >
              <dl className="kit-details">
                {(
                  [
                    ['Category', <Value key="category" display={OPENED_DOCUMENT.category} layout="bare" />],
                    ['Version', <Value key="version" display={OPENED_DOCUMENT.version} layout="bare" />],
                    ['Stage', <Value key="stage" display={OPENED_DOCUMENT.stage} layout="bare" />],
                    ['Added', <CalendarDate key="added" date={ADDED} />],
                    ['Status', analysisOf(OPENED_DOCUMENT, 'default')],
                  ] as const
                ).map(([label, content]) => (
                  <div key={label} className="kit-detail" data-detail={label}>
                    <dt>{label}</dt>
                    <dd>{content}</dd>
                  </div>
                ))}
              </dl>
            </Inspector>
          }
        >
          <RegisterTable<KitDocumentRow>
            label="Project documents"
            columns={DOCUMENT_COLUMNS}
            rows={DOCUMENT_ROWS}
            rowKey={(row) => row.documentId}
            open={{ onOpen: noop, label: 'Show details', header: 'Details', inspectorId: 'kit-document-inspector' }}
            current={OPENED_DOCUMENT.documentId}
            rowAction={{ header: 'Actions', render: () => <MenuButton label="More actions" items={DOCUMENT_MENU} /> }}
          />
          <Pager label="Pages" previousLabel="Previous" nextLabel="Next" hasPrevious={false} hasNext onPrevious={noop} onNext={noop} />
        </InspectorLayout>
      </WorkspaceFrame>
    ),
  },
  {
    file: 'ui/workspace-controls.html',
    about:
      'the phase 4 controls on a project with no demo flag: switches off, on and busy, underline tabs, a menu button with its menu open, the inline delete confirmation with its bound effect, chips with no count, the pager, a list-equivalent selection of levels, an empty register with sortable headers and its action, and the status footer with no demo line',
    title: 'UI kit: workspace controls',
    displayObjects: [SCOPE_HVAC, SCOPE_FIRE, DELETE_EFFECT, DELETE_FILE, ...LEVELS, FRAME_STILL_READING],
    body: () => (
      <div className="kit-stack">
        {section(
          'Switches',
          <div className="kit-stack">
            <div className="kit-switch-row">
              <span id="kit-switch-hvac">HVAC</span>
              <Value display={SCOPE_HVAC} layout="compact" label={null} />
              <Switch checked onChange={noop} label="Include HVAC in the scope" describedBy="kit-switch-hvac" />
            </div>
            <div className="kit-switch-row">
              <span id="kit-switch-fire">Fire Safety</span>
              <Value display={SCOPE_FIRE} layout="compact" label={null} />
              <Switch checked={false} onChange={noop} label="Include Fire Safety in the scope" describedBy="kit-switch-fire" />
            </div>
            <div className="kit-switch-row">
              <span>Lighting</span>
              <Switch checked onChange={noop} label="Include Lighting in the scope" busy />
            </div>
          </div>,
        )}
        {section(
          'Tabs and a menu',
          <div className="kit-row">
            <div className="kit-panel">
              <Tabs
                label="System details"
                tabs={[
                  { id: 'overview', label: 'Overview', panel: <p>Heating, ventilation and air conditioning.</p> },
                  { id: 'equipment', label: 'Equipment', panel: <p>TEST equipment</p> },
                  { id: 'zones', label: 'Zones', panel: <p>TEST zones</p> },
                ]}
              />
            </div>
            <div className="kit-menu-slot">
              <MenuButton
                label="More actions"
                defaultOpen
                items={[
                  { id: 'download', label: 'Download', onSelect: noop },
                  { id: 'replace', label: 'Replace', onSelect: noop },
                  { id: 'revision', label: 'Mark as a revision of another document', onSelect: noop },
                  { id: 'delete', label: 'Delete', onSelect: noop },
                ]}
              />
            </div>
          </div>,
        )}
        {section(
          'Inline confirmation',
          <InlinePanel heading="Delete this document?" onClose={noop} headingLevel={3}>
            <p>
              <ValueName display={DELETE_FILE} />
            </p>
            <StatusLine display={DELETE_EFFECT} />
            <p className="kit-note">The file, its extracted text and its excerpts are erased. Values that came only from this document return to Unknown.</p>
            <div className="kit-row">
              <Button variant="secondary">Delete</Button>
              <Button variant="quiet">Cancel</Button>
            </div>
          </InlinePanel>,
        )}
        {section(
          'Chips, pager and a list of levels',
          <div className="kit-stack">
            <ChipGroup
              label="Document category"
              name="category"
              options={[
                { value: 'all', label: 'All Documents' },
                { value: 'architectural', label: 'Architectural' },
                { value: 'mep', label: 'MEP' },
                { value: 'other', label: 'Other' },
              ]}
              value="all"
              onChange={noop}
            />
            <Pager label="Pages" previousLabel="Previous" nextLabel="Next" hasPrevious hasNext onPrevious={noop} onNext={noop} />
            <div className="kit-panel">
              <SelectionList
                label="Floors"
                options={LEVELS.map((level) => ({ id: level.valueId, content: <ValueName display={level} showBadge={false} /> }))}
                selected={LEVELS[1]?.valueId ?? null}
                onSelect={noop}
              />
            </div>
          </div>,
        )}
        {section(
          'An empty register',
          <RegisterTable<KitAssetRow>
            label="Project documents"
            columns={[
              { kind: 'content', id: 'name', header: 'Name', cell: () => null, rowHeader: true, sort: { direction: 'ascending', onSort: noop } },
              { kind: 'content', id: 'category', header: 'Category', cell: () => null, sort: { direction: 'none', onSort: noop } },
              { kind: 'content', id: 'added', header: 'Date Added', cell: () => null, sort: { direction: 'none', onSort: noop } },
            ]}
            rows={[]}
            rowKey={(row) => row.assetId}
            empty={
              <div className="kit-stack-tight">
                <p>No documents yet. Upload your drawings, schedules and other files to start.</p>
                <Button variant="accent" icon={Upload}>
                  Upload a document
                </Button>
              </div>
            }
          />,
        )}
        <StatusFooter label="Project status" demoLine={null} stillReading={FRAME_STILL_READING} />
      </div>
    ),
  },
  {
    file: 'ui/model-area.html',
    about:
      'the model area with no viewer (the owner\'s answer of 2026-10-02; R-080): no model stored, named by a served "Not available yet" with its action, the same from a served line, and a stored model shown by its 2.8 line; no drawing of any model',
    title: 'UI kit: model area',
    displayObjects: [MODEL_NOT_AVAILABLE],
    body: () => (
      <div className="kit-stack">
        <ModelArea heading="Building model" state="no_model" status={{ display: MODEL_NOT_AVAILABLE }} action={{ label: 'Upload a document', onPress: noop, icon: Upload }} />
        <div className="kit-row">
          <div className="kit-half">
            <ModelArea heading="Building model" state="no_model" status={{ line: NO_MODEL_LINE }} size="panel" />
          </div>
          <div className="kit-half">
            <ModelArea heading="Building model" state="model_stored" status={{ line: MODEL_STORED_LINE }} size="panel" />
          </div>
        </div>
      </div>
    ),
  },
  {
    file: 'ui/metrics.html',
    about:
      'the phase 6 Metrics tiles, panels and chart (docs/adr/0052): a tile with a stage 2 price and a tile with "Not available yet"; a breakdown with two marks, a "Not available yet" gap and an Unknown gap (dashed, labelled), and its incomplete total; a sequence crossing zero with an exact value, its view switch in its panel header; the same breakdown in its table view; a series no formula declares as its one line with its Add',
    title: 'UI kit: metrics',
    displayObjects: METRICS_DISPLAYS,
    body: () => (
      <div className="kit-stack">
        <div className="kit-row">
          <div className="kit-half">
            <MetricTile label="Total BMS investment" icon={Layers}>
              <Price display={TILE_PRICE} />
            </MetricTile>
          </div>
          <div className="kit-half">
            <MetricTile label="Payback period" icon={CalendarClock}>
              <NotAvailableYet display={TILE_MISSING} />
            </MetricTile>
          </div>
        </div>
        <MetricPanel heading="Investment by system" headingId="kit-chart-breakdown">
          <SeriesChart series={CHART_BREAKDOWN} displays={METRICS_INDEX} labels={CHART_LABELS} onAdd={noop} describedBy="kit-chart-breakdown" />
        </MetricPanel>
        <MetricPanel heading="Cumulative cash flow" actions={<SeriesViewSwitch view="chart" onChange={noop} labels={CHART_LABELS} controls="kit-chart-sequence" />}>
          <SeriesChart
            series={CHART_SEQUENCE}
            displays={METRICS_INDEX}
            labels={{ ...CHART_LABELS, name: 'Cumulative cash flow', pointColumn: 'Year', valueColumn: 'Cumulative cash flow' }}
            control={{ view: 'chart', bodyId: 'kit-chart-sequence' }}
          />
        </MetricPanel>
        <MetricPanel heading="Investment by system, as a table">
          <SeriesChart series={CHART_BREAKDOWN} displays={METRICS_INDEX} labels={{ ...CHART_LABELS, name: 'Investment by system, as a table' }} initialView="table" />
        </MetricPanel>
        <MetricPanel heading="Cost breakdown" headingId="kit-chart-unavailable">
          <SeriesChart series={CHART_UNAVAILABLE} displays={METRICS_INDEX} labels={{ ...CHART_LABELS, name: 'Cost breakdown' }} onAdd={noop} describedBy="kit-chart-unavailable" />
        </MetricPanel>
      </div>
    ),
  },
];

// ------------------------------------------------------------------------------------ HTML

const PAGE_STYLE = `
      body {
        margin: 0;
        background-color: var(--sov-bg);
        color: var(--sov-text-primary);
        font-family: var(--sov-font-sans);
      }
      .kit-main {
        display: grid;
        gap: 32px;
        max-width: 1180px;
        margin: 0 auto;
        padding: 32px 48px;
      }
      .kit-main > h1 {
        margin: 0;
        font-size: var(--sov-title-size);
        font-weight: var(--sov-title-weight);
        letter-spacing: var(--sov-title-tracking);
      }
      .kit-section > h2 {
        margin: 0 0 16px;
        font-size: 17px;
        font-weight: var(--sov-weight-semibold);
      }
      .kit-plain-group {
        display: grid;
        gap: 12px;
        margin: 0;
        padding: 0;
        border: 0;
      }
      .kit-file {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        min-width: 128px;
      }
      .kit-file > .sov-icon {
        margin-top: 2px;
        color: var(--sov-text-tertiary);
      }
      .kit-file__name {
        min-width: 0;
      }
      .kit-details {
        display: grid;
        margin: 0;
      }
      .kit-detail {
        display: grid;
        grid-template-columns: 112px minmax(0, 1fr);
        align-items: start;
        gap: 16px;
        padding: 8px 0;
        font-size: 14px;
      }
      .kit-detail > dt {
        color: var(--sov-text-tertiary);
      }
      .kit-detail > dd {
        min-width: 0;
        margin: 0;
      }
      .kit-inspector-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
      }
      .kit-inspector-actions > .sov-button {
        flex: 1 1 auto;
      }
      .kit-stack {
        display: grid;
        gap: 16px;
      }
      .kit-row {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 16px;
      }
      .kit-inline .sov-value,
      .kit-inline .sov-value__line,
      .kit-inline .sov-value__text,
      .kit-inline .sov-badge {
        display: inline;
      }
      .kit-stack-tight {
        display: grid;
        justify-items: start;
        gap: 8px;
      }
      .kit-panel {
        flex: 1 1 320px;
        max-width: 420px;
      }
      .kit-half {
        flex: 1 1 0;
        min-width: 0;
      }
      .kit-menu-slot {
        min-height: 220px;
      }
      .kit-switch-row {
        display: grid;
        grid-template-columns: 160px minmax(0, 1fr) auto;
        align-items: center;
        gap: 16px;
        max-width: 560px;
      }
      .kit-note {
        margin: 0;
        color: var(--sov-text-tertiary);
      }
      .kit-sidebar-project {
        display: grid;
        gap: 4px;
        margin: 0;
        font-size: 14px;
      }
      .kit-sidebar-label {
        margin: 0;
        color: var(--sov-text-muted);
        font-size: 13px;
        font-weight: var(--sov-weight-medium);
      }
      .kit-facts {
        display: grid;
        gap: 12px;
        margin: 0;
        padding: 0;
        list-style: none;
      }`;

function escapeScript(json: string): string {
  return json.replace(/</gu, '\\u003c');
}

/** The page's declared display objects, as the render check reads them: value id to its projection. */
export function declaredDisplayObjects(page: KitPage): Record<string, ReturnType<typeof servedDisplayOf>> {
  const declared: Record<string, ReturnType<typeof servedDisplayOf>> = {};
  for (const display of page.displayObjects) {
    const parsed = DisplayObjectSchema.safeParse(display);
    if (!parsed.success) throw new Error(`${page.file}: ${display.valueId} is not a valid display object: ${parsed.error.message}`);
    declared[display.valueId] = servedDisplayOf(display);
  }
  return declared;
}

/** The full HTML of one kit page. */
export function kitPageHtml(page: KitPage): string {
  const depth = page.file.split('/').length - 1;
  const root = '../'.repeat(depth + 3);
  const markup = renderToStaticMarkup(page.body());
  const declared = escapeScript(JSON.stringify(declaredDisplayObjects(page), null, 2).replace(/\n/gu, '\n      '));
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${page.title}</title>
    <!--
      Generated by tests/e2e/pages/ui/generate.ts from tests/e2e/pages/ui/kit.tsx: do not edit by hand.
      UI kit harness page (packages/ui). The render check must PASS here, and axe must find no
      violation: ${page.about}.
    -->
    <link rel="stylesheet" href="${root}packages/ui/src/tokens.css" />
    <link rel="stylesheet" href="${root}packages/ui/src/ui.css" />
    <style>${PAGE_STYLE}
    </style>
    <script type="application/json" data-render-display-objects>
      ${declared}
    </script>
  </head>
  <body data-render-ready="">
    ${page.landmarks === 'own' ? markup : `<main class="kit-main">
      <h1>${page.title}</h1>
      ${markup}
    </main>`}
  </body>
</html>
`;
}
