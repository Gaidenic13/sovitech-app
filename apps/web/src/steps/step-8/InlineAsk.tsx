/**
 * One step 8 inline ask (guardrails rule 7, criticality table, `first_estimate`: "At step 8 the
 * review asks for it once, inline: 'To show your investment estimate we need the gross floor area.
 * [ m² ] · Generate without it'"; rule 5's one exception to "never ask twice"; US-INTAKE-17; PRD
 * R-003; steps.ts `InlineAsk`).
 *
 * - The sentence is the served line; the question's label is the catalogue's wording for it. No
 *   dialog: the ask sits on the page (AC3).
 * - A quantity is typed as text and read on the server by the rule 8 parser with the unit's
 *   dimension check; the area basis is chosen from the registry's qualifiers where the registry
 *   requires one (rule 8); an entry that reads two ways is refused, never stored as one reading
 *   (AC7; G8-21). The box is labelled with the unit's name from the catalogue ("Gross floor area, in
 *   square metres"; rule 8: "Every value states what it measures"): the unit's symbol is not written
 *   beside the box while the render allowlist has no entry for it (P-3-INPUT-UNIT-SYMBOL).
 * - A choice (building type) is a set of real radio inputs; the systems in scope are real checkboxes,
 *   saved as one decision per system, ticked or not, as step 4 records them (2.6; PRD R-051 interim).
 * - Save stores the owner's answer through `fields/edit` (a `user` candidate: `user_confirmed` on an
 *   owner field, unverified on an engineer field: 2.1; AC4), naming as `corrects` the candidates the
 *   page showed for that field (rule 4, "A correction is a resolution"; none for a missing field), so
 *   an answer to a field that changed since the page showed it is refused (409 `shown_value_changed`):
 *   the step reads its view again and says so, and what the owner typed stays while the ask is still
 *   served. When the view read again no longer serves the ask (the other answer filled the field),
 *   this component leaves the page with its error, so it tells the step (`onValueChanged`), which
 *   says so in the ask's place (Step8). Otherwise the step reads its view again and the ask is gone.
 *   "Generate without it" generates the proposal now: the unanswered asks are skipped, once, and not
 *   asked again (rule 7, "Skip means skip").
 * - One save per press (../../wizard/use-in-flight.ts): while it is on its way, Save shows aria-busy
 *   and a further press sends nothing; it takes presses again once the answer is in. "Generate
 *   without it" is Generate's own press, guarded by the step.
 * - A refusal shows beside the alert icon, as the kit's field errors do.
 * - What the owner types has no value id until it is stored and served back (the kit's TextField).
 */
import { Button, Choice, FieldError, SelectField, StatusLine, TextField } from '@sovitech/ui';
import type { Action, AnswerValue, FieldRef, StepView } from '@sovitech/view-model/browser';
import { useId, useState } from 'react';
import { ApiError, isSignedOut, request } from '../../api/client';
import { copy } from '../../copy';
import { useOnSignedOut } from '../../session/SessionProvider';
import { optionLabel } from '../../wizard/InlineEditor';
import { useInFlight } from '../../wizard/use-in-flight';
import type { Displays } from '../../wizard/use-step-view';
import { optionId } from '../step-6/MultiChoiceStep';
import { QUESTION_COPY } from '../step-5/Step5';

export type InlineAskView = Extract<StepView, { step: 8 }>['proposal']['inlineAsks'][number];

const SYSTEM_COPY: Readonly<Record<string, { readonly title: string } | undefined>> = copy.systems;
const QUALIFIER_COPY: Readonly<Record<string, Readonly<Record<string, string>> | undefined>> = copy.qualifiers;
const EDIT_COPY: Readonly<Record<string, string | undefined>> = copy.edit;
/** The registered units' names (`units.<unit code>`: "square metres"), from the catalogue. */
const UNIT_COPY: Readonly<Record<string, string | undefined>> = copy.units;

/**
 * The quantity box's label with the unit's name (`edit.inUnit`, "{field}, in {unit}": "Gross floor
 * area, in square metres"), or the label alone for a unit the catalogue does not name.
 */
export function labelInUnit(label: string, unitCode: string): string {
  const unit = UNIT_COPY[unitCode];
  const template = EDIT_COPY.inUnit;
  if (unit === undefined || template === undefined) return label;
  return template.replace('{field}', label).replace('{unit}', unit);
}

const REFUSAL_MESSAGES: Readonly<Record<string, string>> = {
  answer_invalid: copy.edit.answerInvalid,
  number_ambiguous: copy.edit.numberAmbiguous,
  unit_mismatch: copy.edit.unitMismatch,
  qualifier_required: copy.edit.qualifierRequired,
  shown_value_changed: copy.edit.changed,
  owner_only: copy.edit.ownerOnly,
};

type EditAction = Extract<Action, { kind: 'edit' }>;

/** The served Edit action of a field's value on this page. */
function editActionOf(displays: Displays, fieldKey: string): EditAction | undefined {
  for (const display of displays.values()) {
    if (display.field?.fieldKey !== fieldKey) continue;
    const edit = display.actions?.find((action): action is EditAction => action.kind === 'edit');
    if (edit !== undefined) return edit;
  }
  return undefined;
}

/** The two options of a decision field, the chosen one first (the registry's order), from the value's served Edit action. */
function decisionOptions(displays: Displays, fieldKey: string): { readonly positive: string; readonly negative: string } | undefined {
  const edit = editActionOf(displays, fieldKey);
  if (edit?.input.kind !== 'choice') return undefined;
  const [positive, negative] = edit.input.options;
  return positive !== undefined && negative !== undefined ? { positive, negative } : undefined;
}

/**
 * The candidates the page showed for a field (rule 4: the owner's answer rejects what the page
 * showed): those of the field's served Edit action; none for a missing field.
 */
function shownCandidatesOf(displays: Displays, field: FieldRef): string[] {
  return [...(editActionOf(displays, field.fieldKey)?.shownCandidateIds ?? [])];
}

export interface InlineAskProps {
  readonly projectId: string;
  readonly ask: InlineAskView;
  readonly displays: Displays;
  /**
   * The answer was stored, or refused because the page was out of date: the step reads its view again.
   * When it returns the reading's promise, Save stays busy until the view is read again.
   */
  readonly onRefresh: () => void | Promise<void>;
  /**
   * The answer was refused because the field changed since the page showed it (409
   * `shown_value_changed`): the step keeps saying so where the ask was, should the view read again no
   * longer serve this ask (and this component, with its error, leave the page).
   */
  readonly onValueChanged?: (questionId: string) => void;
  /** "Generate without it": the step generates the proposal now. */
  readonly onGenerateWithout: () => void;
}

export function InlineAsk({ projectId, ask, displays, onRefresh, onValueChanged, onGenerateWithout }: InlineAskProps) {
  const onSignedOut = useOnSignedOut();
  const id = useId();
  const [text, setText] = useState('');
  const [qualifier, setQualifier] = useState('');
  const [choice, setChoice] = useState('');
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | undefined>(undefined);
  const saving = useInFlight();
  const input = ask.input;
  const [field] = ask.fields;
  const label = QUESTION_COPY[ask.questionId]?.title ?? copy.edit.label;
  const errorId = `${id}-error`;

  /** The writes the answer makes, or an inline error. */
  const writes = (): { readonly field: (typeof ask.fields)[number]; readonly value: AnswerValue }[] | string => {
    if (field === undefined) return copy.review.writeFailed;
    if (input.kind === 'quantity') {
      if (text.trim() === '') return copy.edit.answerInvalid;
      if (input.qualifierRequired && qualifier === '') return copy.edit.qualifierRequired;
      return [{ field, value: { kind: 'quantity', raw: text.trim(), ...(qualifier === '' ? {} : { qualifier }) } }];
    }
    if (input.kind === 'choice') return choice === '' ? copy.edit.answerInvalid : [{ field, value: { kind: 'choice', choice } }];
    if (input.kind === 'text') return text.trim() === '' ? copy.edit.answerInvalid : [{ field, value: { kind: 'text', text: text.trim() } }];
    if (ticked.size === 0) return copy.step8.multiRequired;
    const planned: { field: (typeof ask.fields)[number]; value: AnswerValue }[] = [];
    for (const ref of ask.fields) {
      const options = decisionOptions(displays, ref.fieldKey);
      if (options === undefined) return copy.review.writeFailed;
      planned.push({ field: ref, value: { kind: 'choice', choice: ticked.has(ref.fieldKey) ? options.positive : options.negative } });
    }
    return planned;
  };

  const save = async () => {
    if (saving.busy) return;
    const planned = writes();
    if (typeof planned === 'string') {
      setError(planned);
      return;
    }
    await saving.run(async () => {
      setError(undefined);
      try {
        for (const write of planned) {
          const corrects = shownCandidatesOf(displays, write.field);
          await request('fields.edit', { params: { projectId }, body: { field: write.field, value: write.value, corrects } });
        }
      } catch (refusal) {
        if (isSignedOut(refusal)) {
          onSignedOut();
          return;
        }
        const code = refusal instanceof ApiError ? refusal.code : '';
        setError(REFUSAL_MESSAGES[code] ?? copy.edit.failed);
        // The field changed since the page showed it: the step reads its view again (what the owner typed
        // stays while the ask is still served, and the step says so where the ask was if it is not). A
        // partly stored multi-select shows as stored the same way.
        if (code === 'shown_value_changed') onValueChanged?.(ask.questionId);
        if (code === 'shown_value_changed' || input.kind === 'multi') await onRefresh();
        return;
      }
      await onRefresh();
    });
  };

  let control;
  if (input.kind === 'quantity') {
    control = (
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-5">
        <TextField label={labelInUnit(label, input.unit.code)} value={text} inputMode="decimal" maxLength={40} onChange={setText} {...(error === undefined ? {} : { error })} />
        {input.qualifiers.length === 0 ? null : (
          <SelectField
            label={copy.edit.qualifier}
            labelPlacement="outside"
            options={input.qualifiers.map((key) => ({ value: key, label: QUALIFIER_COPY[field?.fieldKey ?? '']?.[key] ?? key }))}
            value={qualifier}
            placeholder={copy.edit.chooseQualifier}
            onChange={setQualifier}
            required={input.qualifierRequired}
          />
        )}
      </div>
    );
  } else if (input.kind === 'text') {
    control = <TextField label={label} value={text} maxLength={input.maxLength} onChange={setText} {...(error === undefined ? {} : { error })} />;
  } else if (input.kind === 'choice' && input.options.length > 8) {
    control = (
      <SelectField
        label={label}
        labelPlacement="outside"
        options={input.options.map((option) => ({ value: option, label: optionLabel(field?.fieldKey ?? '', option) }))}
        value={choice}
        placeholder={copy.edit.chooseOption}
        onChange={setChoice}
        {...(error === undefined ? {} : { error })}
      />
    );
  } else {
    const options = input.options;
    control = (
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-[15px] font-medium">{label}</legend>
        <div className="grid grid-cols-4 gap-x-6 gap-y-3">
          {options.map((option) =>
            input.kind === 'choice' ? (
              <Choice
                key={option}
                type="radio"
                name={`${id}-choice`}
                value={option}
                checked={choice === option}
                onChange={(checked) => {
                  if (checked) setChoice(option);
                }}
                label={optionLabel(field?.fieldKey ?? '', option)}
              />
            ) : (
              <Choice
                key={option}
                type="checkbox"
                name={`${id}-systems`}
                value={option}
                checked={ticked.has(option)}
                onChange={(checked) => {
                  const next = new Set(ticked);
                  if (checked) next.add(option);
                  else next.delete(option);
                  setTicked(next);
                }}
                label={SYSTEM_COPY[optionId(option)]?.title ?? optionId(option)}
              />
            ),
          )}
        </div>
        {error === undefined ? null : (
          <div role="alert">
            <FieldError id={errorId} message={error} />
          </div>
        )}
      </fieldset>
    );
  }

  return (
    <div data-inline-ask={ask.questionId} className="flex flex-col gap-5 rounded-(--sov-radius-surface) border border-(--sov-border-hover) bg-(--sov-surface) px-6 py-5">
      <StatusLine line={ask.ask} />
      {control}
      <div className="flex flex-wrap items-center gap-6">
        <Button variant="accent" aria-busy={saving.busy} onClick={() => void save()}>
          {copy.actions.save}
        </Button>
        <Button variant="quiet" onClick={onGenerateWithout}>
          {copy.actions.generateWithoutIt}
        </Button>
      </div>
    </div>
  );
}
