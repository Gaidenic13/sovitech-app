/**
 * The building facts as rows (OB-3's "Extracted details" and summary list, UD-45; PRD R-045, R-046;
 * US-REVIEW-04 to US-REVIEW-08, US-REVIEW-11), each through the one Value component with the actions
 * the API served for it (guardrails section 5, step 3: "Keep the rows, and add Edit to each"):
 *
 * - Edit opens the inline editor under the row; Save writes the owner's correction with the shown
 *   candidates as `corrects` (rule 4: a correction is a resolution; G4-5, G4-19; ../../wizard/InlineEditor).
 * - "Is this right? Yes · Edit" only where the served display carries a confirmation (rule 5's test
 *   within the budget, decided on the server): Yes posts `fields/confirm` (US-REVIEW-05 AC4).
 * - "Looks right" and "Something's wrong" on an engineer item (rule 3): `owner_acknowledged` only,
 *   which never raises the badge or clears Provisional (G3-3), and a note for the engineer (G3-10).
 *   There is no "Confirm all" and no bulk action (§5-3b; US-REVIEW-08 AC2).
 * - A multi-fact field's facts and a conflict's values render as rows beside their field, never inside
 *   its value element (tests/e2e/render/README.md). A conflict put to the owner offers "Choose this
 *   value" on each value, with its source shown (rule 4; US-REVIEW-11 AC2, AC3); a conflict routed to
 *   the engineer shows the served line and no choice (G4-8, G4-18).
 * - After any write the screen reads its view again, so every badge and line is the server's. A
 *   refusal shows inline under its row and blocks nothing else (rule 7).
 * - One write of the screen at a time (carried from phase 3, ADR 0039 decision 11): while one is on its
 *   way, every action of every row says so with `aria-busy` (the kit's Value `busy`) and a press sends
 *   nothing; no action is ever disabled (rule 7). The inline editor's Save takes the same guard (V-8), so
 *   an open editor's Save and another row's Yes are never on their way at once.
 */
import { Building2, DoorOpen, Grid3x3, Layers, Scan, type LucideIcon } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { Button, Icon, Value } from '@sovitech/ui';
import type { Action, DisplayObject } from '@sovitech/view-model/browser';
import { ApiError, isSignedOut, request } from '../../api/client';
import { copy } from '../../copy';
import { useOnSignedOut } from '../../session/SessionProvider';
import { InlineEditor } from '../../wizard/InlineEditor';
import { useWizard } from '../../wizard/WizardProvider';
import { useInFlight, type InFlight } from '../../wizard/use-in-flight';
import { ACTION_LABELS } from '../step-1/Step1';
import { actionOf, choiceFor, type FactNode } from './facts';

/** The decorative icon of a fact's row, by its registry field key (onboarding-spec 2.5: 24px icons on list rows). */
const FIELD_ICONS: Readonly<Record<string, LucideIcon>> = {
  'building.grossFloorArea': Scan,
  'building.floors': Layers,
  'building.rooms': DoorOpen,
  'building.zones': Grid3x3,
  'building.type': Building2,
};

export function iconOf(display: DisplayObject): LucideIcon | undefined {
  const key = display.field?.fieldKey;
  return key === undefined ? undefined : FIELD_ICONS[key];
}

/** The DOM id of a fact's row (the warning row moves the focus to the first confirmation's Yes). */
export function rowIdOf(valueId: string, place: string): string {
  return `${place}-${valueId.replace(/[^A-Za-z0-9_-]/gu, '-')}`;
}

const REFUSALS: Readonly<Record<string, string>> = {
  confirmation_not_shown: copy.edit.changed,
  conflict_not_open: copy.edit.changed,
  shown_value_changed: copy.edit.changed,
  routed_to_engineer: copy.edit.changed,
  owner_only: copy.edit.ownerOnly,
};

/** Refusals after which the page reads its view again: what the owner answered no longer stands as shown. */
const STALE = new Set(['confirmation_not_shown', 'conflict_not_open', 'shown_value_changed', 'routed_to_engineer']);

type Write =
  | { readonly kind: 'confirm'; readonly candidateId: string }
  | { readonly kind: 'acknowledge'; readonly candidateIds: readonly string[] }
  | { readonly kind: 'concern'; readonly candidateId: string }
  | { readonly kind: 'resolve'; readonly field: { readonly subjectId: string; readonly fieldKey: string }; readonly candidateId: string };

async function send(projectId: string, write: Write): Promise<void> {
  const params = { projectId };
  switch (write.kind) {
    case 'confirm':
      await request('fields.confirm', { params, body: { candidateId: write.candidateId } });
      return;
    case 'acknowledge':
      await request('fields.acknowledge', { params, body: { candidateIds: [...write.candidateIds] } });
      return;
    case 'concern':
      await request('fields.concern', { params, body: { candidateId: write.candidateId } });
      return;
    case 'resolve':
      await request('fields.resolveConflict', { params, body: { field: { ...write.field }, chosenCandidateId: write.candidateId } });
      return;
  }
}

export interface FactRowsProps {
  readonly projectId: string;
  readonly nodes: readonly FactNode[];
  /** Where the rows sit: part of each row's DOM id, and the layout of the top rows. */
  readonly place: 'summary' | 'details' | 'extracted';
  /** Reads the view again after a write (quietly: the rows stay on screen). */
  readonly onChanged: () => void;
  /** The label of the evidence disclosure; without it, excerpts are not shown in these rows. */
  readonly evidenceLabel?: string;
  /** Extra rows after the facts (step 3's HVAC assets line in the summary). */
  readonly after?: ReactNode;
}

interface RowProps {
  readonly node: FactNode;
  readonly parent: DisplayObject | undefined;
  readonly context: RowContext;
}

interface RowContext {
  readonly projectId: string;
  readonly place: FactRowsProps['place'];
  readonly editing: string | null;
  readonly setEditing: (valueId: string | null) => void;
  readonly errors: ReadonlyMap<string, string>;
  readonly perform: (valueId: string, write: Write) => void;
  readonly onAction: (display: DisplayObject, action: Action) => void;
  readonly onChanged: () => void;
  readonly evidenceLabel: string | undefined;
  /** A write of this screen is on its way: every action says so (`aria-busy`) and a press sends nothing (rule 7: never disabled). */
  readonly busy: boolean;
  /** The screen's one write guard, which the inline editor's Save claims too (V-8). */
  readonly writes: InFlight;
}

/** The editor under a row whose Edit is open, and the row's last refusal. */
function RowTail({ display, context }: { readonly display: DisplayObject; readonly context: RowContext }) {
  const edit = actionOf(display, 'edit');
  const error = context.errors.get(display.valueId);
  return (
    <>
      {context.editing === display.valueId && edit !== undefined ? (
        <InlineEditor
          projectId={context.projectId}
          action={edit}
          display={display}
          label={display.measure?.label ?? copy.edit.label}
          onSaved={() => {
            context.setEditing(null);
            context.onChanged();
          }}
          onCancel={() => context.setEditing(null)}
          onStale={context.onChanged}
          inFlight={context.writes}
        />
      ) : null}
      {error === undefined ? null : (
        <p role="alert" className="text-[13px] text-(--sov-text-primary)">
          {error}
        </p>
      )}
    </>
  );
}

/**
 * The label of a fact under its field: what the fact measures (the level type, what a count counts),
 * the registry's qualifier label, marked as 2.8 allows a registry qualifier; the field's label when
 * the fact names none (a value in conflict).
 */
function factLabel(display: DisplayObject): ReactNode {
  const qualifier = display.measure?.qualifierLabel;
  if (qualifier === undefined) return display.measure?.label ?? null;
  return <span data-copy-kind="registry-qualifier">{qualifier}</span>;
}

/** A fact of a field, or a value of its conflict: beside the field on a hairline, never inside its value element. */
function ChildRow({ node, parent, context }: RowProps) {
  const { display } = node;
  const choice = parent === undefined ? undefined : choiceFor(parent, display.valueId);
  return (
    <li id={rowIdOf(display.valueId, context.place)} className="flex flex-col gap-3 border-b border-(--sov-border) py-3 last:border-b-0" data-fact-row={display.valueId}>
      <Value
        display={display}
        label={factLabel(display)}
        layout="stack"
        onAction={(action) => context.onAction(display, action)}
        actionLabels={ACTION_LABELS}
        busy={context.busy}
        {...(context.evidenceLabel === undefined ? {} : { evidenceLabel: context.evidenceLabel })}
      />
      {choice === undefined ? null : (
        <div>
          <Button variant="link" aria-busy={context.busy} onClick={() => context.perform(display.valueId, { kind: 'resolve', field: choice.action.field, candidateId: choice.candidateId })}>
            {copy.actions.chooseThis}
          </Button>
        </div>
      )}
      <RowTail display={display} context={context} />
      <Children node={node} context={context} />
    </li>
  );
}

function Children({ node, context }: { readonly node: FactNode; readonly context: RowContext }) {
  if (node.children.length === 0) return null;
  const conflict = actionOf(node.display, 'resolve_conflict') !== undefined || node.display.badge?.id === 'two_values';
  return (
    <ul className="ml-3 flex flex-col border-l border-(--sov-border) pl-5" aria-label={conflict ? copy.step3.valuesInConflict : undefined}>
      {node.children.map((child) => (
        <ChildRow key={child.display.valueId} node={child} parent={node.display} context={context} />
      ))}
    </ul>
  );
}

/** A fact in "Extracted details" or UD-45: the bordered detail row with its icon and every action the API served. */
function DetailRow({ node, context }: RowProps) {
  const { display } = node;
  const icon = iconOf(display);
  return (
    <li id={rowIdOf(display.valueId, context.place)} className="flex flex-col gap-3" data-fact-row={display.valueId}>
      <Value
        display={display}
        layout="detail"
        {...(icon === undefined ? {} : { icon })}
        onAction={(action) => context.onAction(display, action)}
        actionLabels={ACTION_LABELS}
        busy={context.busy}
        {...(context.evidenceLabel === undefined ? {} : { evidenceLabel: context.evidenceLabel })}
      />
      <RowTail display={display} context={context} />
      <Children node={node} context={context} />
    </li>
  );
}

/**
 * A fact in step 3's summary: the key/value list of onboarding-spec 2.5 ("A 24px muted icon, a label
 * and a right-aligned value, with 1px dividers between rows"), through the Value component in its
 * `row` layout: the same display as in "Extracted details" (text, badge, source and lines; G2-7),
 * read-only. Edit, a confirmation, "Looks right", "Something's wrong" and a conflict's choice sit
 * once on the page, in "Extracted details" (guardrails section 5, step 3: "Keep the rows, and add
 * Edit to each"), which the status pill counts (US-REVIEW-05 AC3). One control per value, so the
 * keyboard meets each action once.
 */
function SummaryRow({ node, context }: RowProps) {
  const { display } = node;
  const icon = iconOf(display);
  return (
    <li id={rowIdOf(display.valueId, context.place)} data-fact-row={display.valueId}>
      <Value display={display} layout="row" {...(icon === undefined ? {} : { icon })} />
    </li>
  );
}

/** A line in step 3's summary with no value of its own (the HVAC assets count while the taxonomy is missing), in the summary's row shape: the icon and label on the left, the served line on the right. */
export function SummaryLineRow({ icon, label, children }: { readonly icon: LucideIcon; readonly label: string; readonly children: ReactNode }) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 border-b border-(--sov-border) py-3.5">
      <span className="text-(--sov-text-primary)">
        <Icon icon={icon} />
      </span>
      <span className="text-[15px] leading-6 text-(--sov-text-primary)">{label}</span>
      <div className="max-w-[200px] text-right">{children}</div>
    </li>
  );
}

/** The rows of the facts, with their actions wired to the contract's routes. */
export function FactRows({ projectId, nodes, place, onChanged, evidenceLabel, after }: FactRowsProps) {
  const onSignedOut = useOnSignedOut();
  const { goToStep } = useWizard();
  const [editing, setEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(new Map());
  // One write of this screen at a time (carried from phase 3, ADR 0039 decision 11): while a row's write
  // is on its way, a press on any row's action is ignored, never refused, so a second press never acts
  // on what the first one is changing; every action says so with aria-busy (the kit's Value `busy`).
  const writes = useInFlight();

  const setError = useCallback((valueId: string, message: string | undefined) => {
    setErrors((previous) => {
      const next = new Map(previous);
      if (message === undefined) next.delete(valueId);
      else next.set(valueId, message);
      return next;
    });
  }, []);

  const perform = useCallback(
    (valueId: string, write: Write) => {
      // A press while a write of this screen is on its way is ignored, never refused (no disabled state; rule 7).
      if (!writes.claim()) return;
      setError(valueId, undefined);
      send(projectId, write).then(
        () => {
          writes.release();
          onChanged();
        },
        (refusal: unknown) => {
          writes.release();
          if (isSignedOut(refusal)) {
            onSignedOut();
            return;
          }
          const code = refusal instanceof ApiError ? refusal.code : '';
          setError(valueId, REFUSALS[code] ?? copy.review.writeFailed);
          if (STALE.has(code)) onChanged();
        },
      );
    },
    [onChanged, onSignedOut, projectId, setError, writes],
  );

  const onAction = useCallback(
    (display: DisplayObject, action: Action) => {
      switch (action.kind) {
        case 'edit':
          setError(display.valueId, undefined);
          setEditing(display.valueId);
          return;
        case 'confirm':
          perform(display.valueId, { kind: 'confirm', candidateId: action.candidateId });
          return;
        case 'acknowledge':
          perform(display.valueId, { kind: 'acknowledge', candidateIds: action.candidateIds });
          return;
        case 'concern':
          perform(display.valueId, { kind: 'concern', candidateId: action.candidateId });
          return;
        case 'add':
          // "Add <field>" opens step 8's inline ask for the field (rule 7; US-INTAKE-22 AC6).
          goToStep(action.step);
          return;
        case 'resolve_conflict':
        case 'skip':
          // Rendered beside the value (the conflict's choices), never by the Value component.
          return;
      }
    },
    [goToStep, perform, setError],
  );

  const context: RowContext = { projectId, place, editing, setEditing, errors, perform, onAction, onChanged, evidenceLabel, busy: writes.busy, writes };
  const Row = place === 'summary' ? SummaryRow : DetailRow;
  return (
    <ul className={place === 'summary' ? 'flex flex-col border-t border-(--sov-border)' : 'flex flex-col gap-4'}>
      {nodes.map((node) => (
        <Row key={node.display.valueId} node={node} parent={undefined} context={context} />
      ))}
      {after}
    </ul>
  );
}
