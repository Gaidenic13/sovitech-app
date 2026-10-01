/**
 * OB-1 Step 1 of an existing project (`/projects/:projectId/steps/1`; US-INTAKE-02 AC6,
 * US-INTAKE-21 AC2; PRD R-001, R-009 "Until decided": "a project reopened before Generate opens at
 * step 1 with every stored answer shown and nothing asked again").
 *
 * - The four stored answers, each through the one Value component with its badge and its Edit
 *   (steps.ts `Step1View`), under the approved screen's questions; none is asked again (rule 5).
 *   Edit opens the inline editor; Save writes the owner's correction (rule 4: a correction is a
 *   resolution) and the screen reads its view again.
 * - "Next" and no Back (the approved OB-1; US-INTAKE-01 AC5); Next is never disabled and stores
 *   nothing new: the answers are already stored (R-009), so Continue sends an empty step.
 *
 * A new project's step 1 is `NewProjectStep1` (`/projects/new`).
 */
import { Building2, Globe, MapPin, Shapes } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Value } from '@sovitech/ui';
import { STEP_TITLES, type Action, type DisplayObject } from '@sovitech/view-model/browser';
import { isSignedOut } from '../../api/client';
import { copy } from '../../copy';
import { LoadFailed, Loading } from '../../pages/PageState';
import { useOnSignedOut } from '../../session/SessionProvider';
import { WizardLayout } from '../../shell/WizardLayout';
import { InlineEditor } from '../../wizard/InlineEditor';
import { FORM_WIDTH, WizardFooter } from '../../wizard/WizardFooter';
import { WizardStepper } from '../../wizard/WizardStepper';
import { EMPTY_CONTINUE, continueRefusalMessage, useWizard } from '../../wizard/WizardProvider';
import { useInFlight } from '../../wizard/use-in-flight';
import { useStepView, type Displays } from '../../wizard/use-step-view';

export const ACTION_LABELS = {
  edit: copy.actions.edit,
  yes: copy.actions.yes,
  looksRight: copy.actions.looksRight,
  somethingWrong: copy.actions.somethingWrong,
} as const;

interface AnswerRowProps {
  readonly display: DisplayObject | undefined;
  readonly label: string;
  readonly icon: typeof Building2;
  readonly editing: boolean;
  readonly onEdit: (valueId: string) => void;
  readonly editor: (display: DisplayObject, action: Extract<Action, { kind: 'edit' }>) => ReactNode;
  /** The location's two parts: a small label, under the question's heading. */
  readonly small?: boolean;
}

/**
 * One stored answer, drawn where the approved screen draws its input: the question as the label
 * above a bordered box that holds the answer through the Value component (its text, its badge, its
 * source line and its Edit), so the screen keeps OB-1's shape while asking nothing again.
 */
function AnswerRow({ display, label, icon: Glyph, editing, onEdit, editor, small = false }: AnswerRowProps) {
  const labelId = useId();
  if (display === undefined) return null;
  const edit = display.actions?.find((action): action is Extract<Action, { kind: 'edit' }> => action.kind === 'edit');
  return (
    <div className="flex flex-col gap-3" role="group" aria-labelledby={labelId}>
      <p id={labelId} className={small ? 'text-[13px] text-(--sov-text-muted)' : 'sov-heading-group'}>
        {label}
      </p>
      <div className="flex items-start gap-4 rounded-(--sov-radius-surface) border border-(--sov-border) px-5 py-4">
        <Glyph size={24} strokeWidth={1.5} aria-hidden="true" focusable="false" className="mt-0.5 shrink-0 text-(--sov-text-tertiary)" />
        <div className="min-w-0 flex-1 text-[16px]">
          <Value
            display={display}
            layout="bare"
            onAction={(action) => {
              if (action.kind === 'edit') onEdit(display.valueId);
            }}
            actionLabels={ACTION_LABELS}
          />
        </div>
      </div>
      {editing && edit !== undefined ? editor(display, edit) : null}
    </div>
  );
}

function Answers({ projectId, view, displays, onChanged }: { readonly projectId: string; readonly view: { name: string; projectType: string; country: string; city: string }; readonly displays: Displays; readonly onChanged: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const editor = (label: string) => (display: DisplayObject, action: Extract<Action, { kind: 'edit' }>) => (
    <InlineEditor
      projectId={projectId}
      action={action}
      display={display}
      label={label}
      onSaved={() => {
        setEditing(null);
        onChanged();
      }}
      onCancel={() => setEditing(null)}
      onStale={onChanged}
    />
  );
  const row = (valueId: string, label: string, icon: typeof Building2, small = false) => (
    <AnswerRow display={displays.get(valueId)} label={label} icon={icon} editing={editing === valueId} onEdit={setEditing} editor={editor(label)} small={small} />
  );
  return (
    <div className={`mx-auto mt-10 flex ${FORM_WIDTH} flex-col gap-10`}>
      {row(view.name, copy.step1.projectName, Building2)}
      {row(view.projectType, copy.step1.projectType, Shapes)}
      <section aria-labelledby="step1-location" className="flex flex-col gap-4">
        <h2 id="step1-location" className="sov-heading-group">
          {copy.step1.location}
        </h2>
        <div className="grid grid-cols-2 gap-5">
          {row(view.country, copy.step1.country, Globe, true)}
          {row(view.city, copy.step1.city, MapPin, true)}
        </div>
      </section>
    </div>
  );
}

/** Step 1 while its answers load (DR-12): the three questions' labels over empty outlines of their boxes, and one line; no answer shows until the view does. */
function LoadingAnswers() {
  const outline = <div aria-hidden="true" className="h-16 rounded-(--sov-radius-surface) border border-(--sov-border)" />;
  return (
    <div className={`mx-auto mt-10 flex ${FORM_WIDTH} flex-col gap-10`}>
      <Loading label={copy.step8.loading} align="start" />
      <div className="flex flex-col gap-3">
        <p className="sov-heading-group">{copy.step1.projectName}</p>
        {outline}
      </div>
      <div className="flex flex-col gap-3">
        <p className="sov-heading-group">{copy.step1.projectType}</p>
        {outline}
      </div>
      <div className="flex flex-col gap-4">
        <p className="sov-heading-group">{copy.step1.location}</p>
        <div className="grid grid-cols-2 gap-5">
          {outline}
          {outline}
        </div>
      </div>
    </div>
  );
}

export function Step1() {
  const { projectId, continueFrom } = useWizard();
  const onSignedOut = useOnSignedOut();
  const { state, view, displays, asOf, reload } = useStepView(1);
  // One Next per press (../../wizard/use-in-flight.ts): a press while it is on its way is ignored, never refused.
  const continuing = useInFlight();
  const [failure, setFailure] = useState<string | null>(null);

  const next = () => {
    if (!continuing.claim()) return;
    setFailure(null);
    continueFrom(1, asOf, EMPTY_CONTINUE).catch((error: unknown) => {
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
      stepper={<WizardStepper step={1} />}
      plainFooter
      footer={<WizardFooter primaryLabel={copy.nav.next} onPrimary={next} busy={continuing.busy} error={failure} align="form" />}
    >
      <section aria-labelledby="step-title">
        {/* The approved step 1 draws no title block; the page's heading is there for assistive technology only. */}
        <h1 id="step-title" className="sr-only">
          {STEP_TITLES[0]}
        </h1>
        {view !== undefined ? (
          <Answers projectId={projectId} view={view} displays={displays} onChanged={() => void reload({ quiet: true })} />
        ) : state.status === 'failed' ? (
          <LoadFailed onRetry={() => void reload()} />
        ) : (
          <LoadingAnswers />
        )}
      </section>
    </WizardLayout>
  );
}
