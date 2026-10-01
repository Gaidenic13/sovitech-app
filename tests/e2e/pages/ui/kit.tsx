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
  Banner,
  Button,
  CalendarDate,
  Card,
  Choice,
  ChoiceCard,
  ChoiceGroup,
  DemoLine,
  Dropzone,
  NotAvailableYet,
  Notice,
  NoticeRegion,
  Price,
  Progress,
  SelectField,
  SkipForNow,
  StatusLine,
  Stepper,
  TextField,
  Value,
  KitIcons,
  type ValueActionLabels,
} from '@sovitech/ui/components';
import { DisplayObjectSchema, servedDisplayOf, type DisplayObject, type Line } from '@sovitech/view-model/browser';

const { ArrowLeft, ArrowRight, Building2, CalendarClock, ClipboardList, Eye, Flame, Globe, Hotel, MapPin, Pencil } = KitIcons;

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

// ------------------------------------------------------------------------------------ pages

export interface KitPage {
  /** Path under tests/e2e/pages/. */
  readonly file: string;
  /** What the page shows (the harness list's `about`). */
  readonly about: string;
  readonly title: string;
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
    about: 'text fields with an inline error, a character counter and a floating label, the country select with an error, radio cards, tiles and pills, checkbox cards with a detection value and a suggestion, a plain checkbox, and every button variant',
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
];

// ------------------------------------------------------------------------------------ HTML

const PAGE_STYLE = `
      body {
        margin: 0;
        background-color: var(--sov-bg);
        color: var(--sov-text-primary);
        font-family: var(--sov-font-sans);
      }
      main {
        display: grid;
        gap: 32px;
        max-width: 1180px;
        margin: 0 auto;
        padding: 32px 48px;
      }
      h1 {
        margin: 0;
        font-size: var(--sov-title-size);
        font-weight: var(--sov-title-weight);
        letter-spacing: var(--sov-title-tracking);
      }
      h2 {
        margin: 0 0 16px;
        font-size: 17px;
        font-weight: var(--sov-weight-semibold);
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
    <main>
      <h1>${page.title}</h1>
      ${markup}
    </main>
  </body>
</html>
`;
}
