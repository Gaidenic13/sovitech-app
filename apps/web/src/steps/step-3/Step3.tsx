/**
 * OB-3 Step 3 Building, with UD-34's states (PRD R-045, R-046, R-047 "Until decided"; US-REVIEW-04 to
 * US-REVIEW-10; guardrails section 5, step 3 rows; prompt 3 5.2 "No IFC uploaded").
 *
 * The approved three columns, as the brand draws them:
 * - Left: the title block (left-aligned, no eyebrow: P-3-EYEBROW-STEP-NUMBER), the intro that is true
 *   for the project's state (US-REVIEW-04 AC13: the drawn "We've analyzed your documents…" only when
 *   a fact has a value from a document; while documents are read, "The facts below fill in as each
 *   file is read." only while a served fact reads 2.8's pending badge, else "We are reading your
 *   documents." alone), the files not fully read with their 2.8 status lines where the drawn success
 *   banner stood (US-REVIEW-09 AC3, AC5 to AC7; no "Building data extracted": PRD R-045 leaves
 *   US-REVIEW-04 AC12 off, 2.8's status lines "are also the only ones used"), and the summary: the
 *   key/value list of onboarding-spec 2.5 (label left, value right), each fact through the Value
 *   component in its `row` layout with its badge and source line and no action, and the HVAC assets
 *   line, "Not available yet" naming the missing SOVITECH asset taxonomy (§5-3b; the
 *   `dataset-asset-taxonomy` gate). No Systems row: no detection exists (§5-3e; AC10).
 * - Centre: the building model's area. No viewer, view toggle, floor selector or illustrative
 *   building (AC14; 5.2 "No IFC uploaded"): with no model stored, "Not available yet" naming the
 *   missing model with the action to upload one on step 2; with a model stored, its G12-1 line.
 * - Right: "Extracted details", every fact and each of its parts (floors by level type, what rooms and
 *   zones count, a conflict's values) through the Value component with the actions the API served
 *   (./FactRows.tsx): Edit on every row (guardrails section 5, step 3: "Keep the rows, and add Edit to
 *   each"), a confirmation, "Looks right" and "Something's wrong" where served, each once on the
 *   page; the status pill counting only the rows that show a confirmation (US-REVIEW-05 AC3), "View
 *   all extracted data" (UD-45), and the row that leads to the owner's items, which never says
 *   "before we continue" (US-REVIEW-06 AC3). The summary and the details show each value id with the
 *   same text, badge, source and lines (G2-7).
 *
 * Continue always works (rule 7; §5-3f): it reports the confirmations the page showed, so the ones
 * left unanswered are skipped and join "For you" at step 8 (US-REVIEW-06 AC1), and it confirms
 * nothing (rule 3; AC4). While documents are being read the view is read again every few seconds, so
 * rows fill in place with no dialog and no answer changes (US-REVIEW-09 AC2).
 *
 * UD-34 (no approved design; the frontend-design skill within the brand): the states are carried by
 * words and the served badges, never by colour. Loading: the three columns keep their frame (the
 * title, the model area and the details panel as outlines, with "Loading your answers"), so the
 * footer does not jump when the view arrives. Reading: the intro says the documents are being read,
 * a thin indeterminate bar sits under it (outside every value element: G2-8), and each pending fact
 * reads "Reading documents…". Partial extraction: the ruled "Files not fully read" block. Nothing
 * found and no documents: the intro says so, and each fact reads its served missing wording with
 * Edit (R-047 "Until decided": no manual-entry form). Conflicts: the field reads Two values with the
 * rule 4 line, and its values sit under it on a hairline, each with its source and, when the
 * conflict is put to the owner, "Choose this value". Editing and edited: the inline editor under the
 * row; after Save the row shows what the server serves (Provided by you).
 */
import { CircleAlert, Cuboid, Eye, Fan, FileWarning, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ActionRow, Button, Icon, NotAvailableYet, Progress, StatusLine, Value } from '@sovitech/ui';
import type { StepView } from '@sovitech/view-model/browser';
import { isSignedOut } from '../../api/client';
import { copy } from '../../copy';
import { LoadFailed, Loading } from '../../pages/PageState';
import { useOnSignedOut } from '../../session/SessionProvider';
import { WizardLayout } from '../../shell/WizardLayout';
import { WizardFooter } from '../../wizard/WizardFooter';
import { WizardStepper } from '../../wizard/WizardStepper';
import { continueRefusalMessage, useWizard } from '../../wizard/WizardProvider';
import { useInFlight } from '../../wizard/use-in-flight';
import { useStepView, type Displays } from '../../wizard/use-step-view';
import { FactRows, SummaryLineRow, rowIdOf } from './FactRows';
import { anyReading, confirmationRows, factTree, fileNameIdOf, shownConfirmations } from './facts';

type Step3View = Extract<StepView, { step: 3 }>;

/** How often step 3 reads its view again while documents are being read (US-REVIEW-09 AC2). */
export const STEP3_READING_POLL_MS = 5_000;

const TITLE_CLASS = 'text-(length:--sov-title-size) leading-tight font-light tracking-(--sov-title-tracking) text-(--sov-text-primary)';

/**
 * The intro that is true now. While documents are read, "The facts below fill in as each file is
 * read." shows only when a served fact reads 2.8's pending badge ("Reading documents…"); with no
 * pending fact nothing can fill in (no AI run exists to fill it), so the intro says only that the
 * documents are being read.
 */
function Intro({ intro, pending }: { readonly intro: Step3View['intro']; readonly pending: boolean }) {
  if (intro === 'values_found') {
    return (
      <div className="flex flex-col gap-4 text-[17px] leading-7 font-light text-(--sov-text-tertiary)">
        <p>{copy.step3.intro.values_found}</p>
        <p className="text-[15px] leading-6">{copy.step3.intro.values_found_second}</p>
      </div>
    );
  }
  const words = intro === 'reading' && !pending ? copy.step3.intro.reading_only : copy.step3.intro[intro];
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[17px] leading-7 font-light text-(--sov-text-tertiary)">{words}</p>
      {/* The intro above says it in words, so the bar keeps its name without repeating it. */}
      {intro === 'reading' ? <Progress label={copy.step3.reading} labelDisplay="hidden" /> : null}
    </div>
  );
}

/** The files not read in full, each named with its 2.8 status line (rule 12; US-REVIEW-09 AC3, AC5 to AC7). */
function FilesNotFullyRead({ files, displays }: { readonly files: readonly string[]; readonly displays: Displays }) {
  const rows = files.flatMap((statusId) => {
    const status = displays.get(statusId);
    if (status === undefined) return [];
    const nameId = fileNameIdOf(statusId);
    const name = nameId === undefined ? undefined : displays.get(nameId);
    return [{ status, name }];
  });
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="step3-files" className="flex flex-col gap-3 rounded-(--sov-radius-surface) border border-(--sov-border) px-5 py-4">
      <h2 id="step3-files" className="sov-heading-group flex items-center gap-3">
        <Icon icon={FileWarning} />
        {copy.step3.filesHeading}
      </h2>
      <ul className="flex flex-col">
        {rows.map(({ status, name }) => (
          <li key={status.valueId} className="flex flex-col gap-1 border-t border-(--sov-border) py-3 first:border-t-0 first:pt-1">
            {name === undefined ? null : (
              <div className="text-[14px] font-medium break-words">
                <Value display={name} layout="bare" />
              </div>
            )}
            <StatusLine display={status} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Step 3's view area (5.2 "No IFC uploaded"; US-REVIEW-04 AC14): what is missing and the way to add it, or the stored model's G12-1 line. */
function ModelArea({ viewer, onUpload }: { readonly viewer: Step3View['viewer']; readonly onUpload: () => void }) {
  return (
    <section
      aria-labelledby="step3-model"
      className="flex min-h-[560px] flex-col items-center justify-center gap-5 rounded-(--sov-radius-surface) border border-(--sov-border) px-10 py-12 text-center"
      data-model-state={viewer.state}
    >
      <span className="text-(--sov-text-muted)">
        <Icon icon={Cuboid} size="large" />
      </span>
      <h2 id="step3-model" className="sov-heading-group">
        {copy.step3.viewerHeading}
      </h2>
      <div className="max-w-[360px]">
        <StatusLine line={viewer.line} />
      </div>
      {viewer.addModelOnStep === null ? null : (
        <Button variant="accent" icon={Upload} onClick={onUpload}>
          {copy.step3.addModel}
        </Button>
      )}
    </section>
  );
}

function Building({
  projectId,
  view,
  displays,
  asOf,
  pending,
  onChanged,
}: {
  readonly projectId: string;
  readonly view: Step3View;
  readonly displays: Displays;
  readonly asOf: string | undefined;
  readonly pending: boolean;
  readonly onChanged: () => void;
}) {
  const navigate = useNavigate();
  const { goToStep, leave } = useWizard();
  const summaryFacts = useMemo(() => factTree(view.summary.filter((id) => displays.get(id)?.kind !== 'line'), displays), [view.summary, displays]);
  const summaryLines = view.summary.flatMap((id) => {
    const display = displays.get(id);
    return display !== undefined && display.kind === 'line' ? [display] : [];
  });
  const details = useMemo(() => factTree(view.details, displays), [view.details, displays]);
  const pill = view.confirmationCount === null ? undefined : displays.get(view.confirmationCount);
  const forYou = view.forYouRow === null ? undefined : displays.get(view.forYouRow);
  const firstConfirmation = confirmationRows(details)[0];

  const toFirstConfirmation = () => {
    if (firstConfirmation === undefined) return;
    const row = document.getElementById(rowIdOf(firstConfirmation, 'details'));
    row?.scrollIntoView({ block: 'center' });
    row?.querySelector<HTMLButtonElement>('.sov-value__confirm button')?.focus();
  };

  const equipment = summaryLines.map((display) => (
    <SummaryLineRow key={display.valueId} icon={Fan} label={copy.step3.equipment}>
      {display.missing === 'not_available_yet' ? <NotAvailableYet display={display} /> : <StatusLine display={display} />}
    </SummaryLineRow>
  ));

  return (
    <div className="grid grid-cols-[344px_minmax(0,1fr)_405px] items-start gap-x-10">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-6">
          <h1 id="step-title" className={TITLE_CLASS}>
            {copy.step3.title}
          </h1>
          <Intro intro={view.intro} pending={pending} />
        </header>
        <FilesNotFullyRead files={view.files} displays={displays} />
        <section aria-labelledby="step3-summary">
          <h2 id="step3-summary" className="sr-only">
            {copy.step3.summaryHeading}
          </h2>
          <FactRows projectId={projectId} nodes={summaryFacts} place="summary" onChanged={onChanged} after={equipment} />
        </section>
      </div>

      <ModelArea viewer={view.viewer} onUpload={() => goToStep(2, { step: 3, asOf })} />

      <div className="flex flex-col gap-5 border-l border-(--sov-border) pl-10">
        <section aria-labelledby="step3-details" className="flex flex-col gap-5 rounded-(--sov-radius-surface) border border-(--sov-border) p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="step3-details" className="sov-heading-section">
              {copy.step3.details}
            </h2>
            {pill === undefined ? null : <StatusLine display={pill} as="span" icon={CircleAlert} />}
          </div>
          <FactRows projectId={projectId} nodes={details} place="details" onChanged={onChanged} evidenceLabel={copy.review.showExcerpt} />
          <ActionRow
            icon={Eye}
            onClick={() => {
              leave(3, asOf);
              void navigate(`/projects/${projectId}/extracted`);
            }}
          >
            {copy.actions.viewAll}
          </ActionRow>
        </section>
        {forYou === undefined ? null : (
          <ActionRow icon={CircleAlert} detail={copy.step3.forYouRowBody} onClick={toFirstConfirmation}>
            <StatusLine display={forYou} as="span" />
          </ActionRow>
        )}
      </div>
    </div>
  );
}

/**
 * Step 3 while its view loads (UD-34; DR-12): the three columns keep their places, the title in the
 * left column with one "Loading your answers" line, the model area and the details panel as empty
 * outlines of their size, so the footer stays where the loaded page puts it. No figure, no value.
 */
function LoadingFrame() {
  return (
    <div className="grid grid-cols-[344px_minmax(0,1fr)_405px] items-start gap-x-10">
      <div className="flex flex-col gap-6">
        <h1 id="step-title" className={TITLE_CLASS}>
          {copy.step3.title}
        </h1>
        <Loading label={copy.step8.loading} align="start" />
      </div>
      <div aria-hidden="true" className="min-h-[560px] rounded-(--sov-radius-surface) border border-(--sov-border)" />
      <div aria-hidden="true" className="border-l border-(--sov-border) pl-10">
        <div className="min-h-[560px] rounded-(--sov-radius-surface) border border-(--sov-border)" />
      </div>
    </div>
  );
}

export function Step3() {
  const { projectId, back, continueFrom } = useWizard();
  const onSignedOut = useOnSignedOut();
  const { state, view, displays, asOf, reload } = useStepView(3);
  // One Continue per press (../../wizard/use-in-flight.ts): a press while it is on its way is ignored, never refused.
  const continuing = useInFlight();
  const [failure, setFailure] = useState<string | null>(null);

  const details = useMemo(() => (view === undefined ? [] : factTree([...view.summary, ...view.details], displays)), [view, displays]);
  const pending = anyReading(details);

  // While documents are read, the rows fill in place (US-REVIEW-09 AC2): the view is read again quietly.
  const reading = view !== undefined && (view.intro === 'reading' || pending);
  useEffect(() => {
    if (!reading) return;
    const timer = window.setInterval(() => void reload({ quiet: true }), STEP3_READING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [reading, reload]);

  const onContinue = () => {
    if (!continuing.claim()) return;
    setFailure(null);
    const confirmations = shownConfirmations(details);
    continueFrom(3, asOf, { answers: [], multi: [], visibleSuggestions: [], shown: { questions: [], confirmations } }).catch((error: unknown) => {
      continuing.release();
      if (isSignedOut(error)) {
        onSignedOut();
        return;
      }
      setFailure(continueRefusalMessage(error));
    });
  };

  return (
    <WizardLayout
      stepper={<WizardStepper step={3} />}
      footer={<WizardFooter onBack={() => back(3, asOf)} primaryLabel={copy.nav.continue} onPrimary={onContinue} busy={continuing.busy} error={failure} />}
    >
      <section aria-labelledby="step-title">
        {view !== undefined ? (
          <Building projectId={projectId} view={view} displays={displays} asOf={asOf} pending={pending} onChanged={() => void reload({ quiet: true })} />
        ) : state.status === 'failed' ? (
          <>
            <h1 id="step-title" className={TITLE_CLASS}>
              {copy.step3.title}
            </h1>
            <LoadFailed onRetry={() => void reload()} />
          </>
        ) : (
          <LoadingFrame />
        )}
      </section>
    </WizardLayout>
  );
}
