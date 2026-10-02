/**
 * "For you" on the review step (guardrails rule 7, "Open items are short, and say who acts"; section
 * 5, step 8; US-REVIEW-11, US-REVIEW-12; F-QUESTION-07; PRD R-046; steps.ts `ForYouItemSchema`).
 *
 * - Only what the owner can resolve, in the order served (their effect on the estimate): the top
 *   three items, then "and <n> more"; the count reads "<n> things for you to check" (G7-5). Each
 *   count is its own line display object, bound to its value id (prompt 3 section 7).
 * - Each item names what it concerns through the Value component (its badge, source line and
 *   lines). A short heading says why the owner is asked ("Check what we found", "Your estimate needs
 *   this") only where the served value does not say it already: a conflict and a removed source
 *   carry their own 2.8 badge and line ("Two values" with rule 4's "Documents say … Which is right?";
 *   "Source document removed"), which no catalogue sentence paraphrases. It offers its action: the served confirmation ("Is this right? Yes · Edit"; rule 5), an
 *   inline Edit (rule 4: the owner's change rejects what the page showed), each value of a conflict
 *   put to the owner with its source and "Choose this value" (rule 4; US-REVIEW-11 AC2, AC3), or,
 *   for a first-estimate field still missing, the way to its inline ask on this step (rule 7).
 * - Neither acting on an item nor leaving it open blocks "Generate Proposal" (AC6; rule 7).
 * - One write per press (./field-writes.ts): while an item's write is on its way, and until the step
 *   has read its view again after it, a further Yes, "Looks right", "Something's wrong" or "Choose this
 *   value" sends nothing, and every such control shows aria-busy (the kit's Value `busy`, V-8; ADR 0039
 *   decision 11); each takes presses again once the answer is in. Nothing is ever disabled (rule 7).
 * - A refused write says so beside the alert icon, as step 8's other failures do (DR-20).
 */
import { Button, FieldError, StatusLine, Value } from '@sovitech/ui';
import type { Action, DisplayObject, StepView } from '@sovitech/view-model/browser';
import { useId, useState } from 'react';
import { copy } from '../copy';
import { ACTION_LABELS } from '../steps/step-1/Step1';
import { InlineEditor } from '../wizard/InlineEditor';
import type { Displays } from '../wizard/use-step-view';
import { useFieldWrites, type FieldWrites } from './field-writes';

type ForYou = Extract<StepView, { step: 8 }>['forYou'];
type ForYouItem = ForYou['items'][number];
type ResolveAction = Extract<Action, { kind: 'resolve_conflict' }>;
type EditAction = Extract<Action, { kind: 'edit' }>;

/**
 * The heading of an item, by reason, where one is shown. None for `conflict` and
 * `source_document_removed`: the served display already carries 2.8's badge and line for them.
 */
const REASON_HEADINGS: Readonly<Partial<Record<ForYouItem['reason'], string>>> = {
  confirmation: copy.step8.forYouReason.confirmation,
  first_estimate_missing: copy.step8.forYouReason.first_estimate_missing,
};

function resolveActionOf(display: DisplayObject): ResolveAction | undefined {
  return display.actions?.find((action): action is ResolveAction => action.kind === 'resolve_conflict');
}

function editActionOf(display: DisplayObject): EditAction | undefined {
  return display.actions?.find((action): action is EditAction => action.kind === 'edit');
}

/** One value of a conflict put to the owner, with its source, and the owner's choice of it. */
function ConflictChoice({ display, onChoose, busy }: { readonly display: DisplayObject; readonly onChoose: () => void; readonly busy: boolean }) {
  const describedBy = useId();
  return (
    <li className="flex flex-wrap items-start justify-between gap-4 rounded-(--sov-radius-surface) border border-(--sov-border) px-4 py-3">
      <div id={describedBy} className="min-w-0 flex-1">
        <Value display={display} label={null} />
      </div>
      <Button variant="link" aria-describedby={describedBy} aria-busy={busy} onClick={onChoose}>
        {copy.actions.chooseThis}
      </Button>
    </li>
  );
}

interface ItemProps {
  readonly projectId: string;
  readonly item: ForYouItem;
  readonly displays: Displays;
  readonly writes: FieldWrites;
  readonly onChanged: () => void | Promise<void>;
  readonly onAnswer: (fieldKey: string) => void;
  /** A label for the item where the field's own label would name a part of the question (the systems in scope). */
  readonly labelFor: (fieldKey: string) => string | undefined;
}

function Item({ projectId, item, displays, writes, onChanged, onAnswer, labelFor }: ItemProps) {
  const [editing, setEditing] = useState(false);
  const display = displays.get(item.concerns);
  if (display === undefined) return null;
  const fieldKey = display.field?.fieldKey;
  const label = fieldKey === undefined ? undefined : labelFor(fieldKey);
  const resolve = item.reason === 'conflict' ? resolveActionOf(display) : undefined;
  const edit = editActionOf(display);
  const onAction = (action: Action) => {
    if (writes.busy) return;
    if (action.kind === 'edit') setEditing(true);
    else if (action.kind === 'confirm') void writes.confirm(action.candidateId);
    else if (action.kind === 'acknowledge') void writes.acknowledge(action.candidateIds);
    else if (action.kind === 'concern') void writes.concern(action.candidateId);
    else if (action.kind === 'add') onAnswer(action.field.fieldKey);
  };
  const heading = REASON_HEADINGS[item.reason];
  return (
    <li className="flex flex-col gap-3 border-t border-(--sov-border) py-5">
      {heading === undefined ? null : <p className="text-[13px] text-(--sov-text-muted)">{heading}</p>}
      {item.reason === 'first_estimate_missing' ? (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Value display={display} {...(label === undefined ? {} : { label })} />
          {fieldKey === undefined ? null : (
            <Button variant="link" onClick={() => onAnswer(fieldKey)}>
              {copy.step8.answerIt}
            </Button>
          )}
        </div>
      ) : (
        <Value
          display={display}
          {...(label === undefined ? {} : { label })}
          onAction={onAction}
          actionLabels={ACTION_LABELS}
          evidenceLabel={copy.review.showExcerpt}
          busy={writes.busy}
        />
      )}
      {resolve === undefined ? null : (
        <ul className="flex list-none flex-col gap-3">
          {resolve.choices.map((choice) => {
            const value = displays.get(choice.valueId);
            if (value === undefined) return null;
            return (
              <ConflictChoice
                key={choice.candidateId}
                display={value}
                onChoose={() => void writes.resolveConflict(resolve.field, choice.candidateId)}
                busy={writes.busy}
              />
            );
          })}
        </ul>
      )}
      {editing && edit !== undefined ? (
        <InlineEditor
          projectId={projectId}
          action={edit}
          display={display}
          label={label ?? display.measure?.label ?? copy.edit.label}
          onSaved={() => {
            setEditing(false);
            void onChanged();
          }}
          onCancel={() => setEditing(false)}
          onStale={() => void onChanged()}
        />
      ) : null}
    </li>
  );
}

export interface ForYouListProps {
  readonly projectId: string;
  readonly forYou: ForYou;
  readonly displays: Displays;
  /**
   * Reads the step's view again after a write; when it returns the reading's promise, the items'
   * actions stay busy until the view is read again (a second press never acts on what the first changed).
   */
  readonly onChanged: () => void | Promise<void>;
  /** Takes the owner to the way to answer a missing first-estimate field (its inline ask). */
  readonly onAnswer: (fieldKey: string) => void;
  readonly labelFor?: (fieldKey: string) => string | undefined;
}

export function ForYouList({ projectId, forYou, displays, onChanged, onAnswer, labelFor = () => undefined }: ForYouListProps) {
  const writes = useFieldWrites(projectId, onChanged);
  const titleId = useId();
  const errorId = useId();
  const count = forYou.count === null ? undefined : displays.get(forYou.count);
  const more = forYou.more === null ? undefined : displays.get(forYou.more);
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={titleId} className="sov-heading-section">
          {copy.step8.forYou}
        </h2>
        {count === undefined ? null : <StatusLine display={count} as="span" />}
      </div>
      {forYou.items.length === 0 ? (
        <p className="border-t border-(--sov-border) py-5 text-[15px] text-(--sov-text-tertiary)">{copy.step8.forYouEmpty}</p>
      ) : (
        <ul className="flex list-none flex-col">
          {forYou.items.map((item) => (
            <Item key={item.itemId} projectId={projectId} item={item} displays={displays} writes={writes} onChanged={onChanged} onAnswer={onAnswer} labelFor={labelFor} />
          ))}
        </ul>
      )}
      {more === undefined ? null : <StatusLine display={more} />}
      {writes.error === null ? null : (
        <div role="alert">
          <FieldError id={errorId} message={writes.error} />
        </div>
      )}
    </section>
  );
}
