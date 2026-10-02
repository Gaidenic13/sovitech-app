/**
 * The inline editor behind a value's Edit action (guardrails section 5, step 3: "add Edit to each
 * [row]"; rule 4, "A correction is a resolution"; F-VALUE-05; US-REVIEW-07; US-INTAKE-21 AC2), and
 * the input of a step 8 inline ask. It takes the action as served (`edit`: the field, the input spec
 * and the candidates the screen showed) and posts `fields/edit` with those candidates as `corrects`,
 * so the correction rejects exactly what the owner saw (G4-5), or, on an engineer_verified value,
 * leaves it and puts the field in conflict for the engineer (G4-19). Nothing is stored until Save
 * (PRD R-009 "Until decided"); Cancel stores nothing.
 *
 * - A choice: its options' labels come from the catalogue (`options.<field key>.<option>`), a country
 *   code from the browser's names; a long list is a select, a short one radios.
 * - A quantity is typed as text and read on the server by the rule 8 parser with the dimension
 *   check: an entry that reads two ways is refused (`number_ambiguous`), never stored as one reading
 *   (US-REVIEW-07 AC6, US-INTAKE-17 AC7); a field that requires a qualifier asks for one (rule 8).
 *   The input's label names the unit in words, keyed by the served InputSpec's unit code
 *   ("Gross floor area, in square metres": `edit.inUnit` with `units.<code>`; rule 8, "Units and
 *   meaning must be explicit"); a unit the catalogue does not name keeps the field's label. The
 *   symbol beside the box waits for P-3-INPUT-UNIT-SYMBOL. A single qualifier is one visible radio,
 *   several are a select. What the owner types has no value id until it is stored and served back
 *   (the kit's TextField).
 * - A refusal shows inline under the field; nothing else is blocked (rule 7). A refusal because the
 *   value changed under the owner (STALE_REFUSALS: 409 `shown_value_changed` and its kin) says so
 *   and the screen reads its view again (`onStale`).
 * - Save is the secondary button: the step's own primary action stays Next, Continue or Generate
 *   (one primary per page, the kit's Button). One save per press (./use-in-flight.ts): while it is
 *   on its way Save shows aria-busy and a further press sends nothing; it takes presses again once
 *   the answer is in. A screen that guards all its writes as one (step 3's rows, ADR 0039 decision 11)
 *   hands its guard in (`inFlight`), so the editor's Save and another row's Yes are never on their way
 *   at once (V-8): while either is, the other sends nothing and says so with aria-busy.
 */
import { useState } from 'react';
import { Button, Choice, SelectField, TextField } from '@sovitech/ui';
import type { Action, AnswerValue, DisplayObject } from '@sovitech/view-model/browser';
import { ApiError, isSignedOut, request } from '../api/client';
import { copy } from '../copy';
import { useOnSignedOut } from '../session/SessionProvider';
import { countryName } from '../steps/step-1/options';
import { STALE_REFUSALS } from './WizardProvider';
import { useInFlight, type InFlight } from './use-in-flight';

type EditAction = Extract<Action, { kind: 'edit' }>;

/** Option labels by field key, from the catalogue. */
const OPTION_LABELS: Readonly<Record<string, Readonly<Record<string, string>> | undefined>> = copy.options;

/** The label of one option of a field. A country code reads as the country's name. */
export function optionLabel(fieldKey: string, option: string): string {
  const fromCatalogue = OPTION_LABELS[fieldKey]?.[option];
  if (fromCatalogue !== undefined) return fromCatalogue;
  if (/country/u.test(fieldKey) && /^[A-Z]{2}$/u.test(option)) return countryName(option);
  return option;
}

/** A qualifier's label, from the catalogue (`qualifiers.<field key>.<key>`), else the key. */
function qualifierLabel(fieldKey: string, qualifier: string): string {
  const qualifiers = (copy as unknown as { qualifiers?: Readonly<Record<string, Readonly<Record<string, string>> | undefined>> }).qualifiers;
  return qualifiers?.[fieldKey]?.[qualifier] ?? qualifier;
}

const REFUSAL_MESSAGES: Readonly<Record<string, string>> = {
  answer_invalid: copy.edit.answerInvalid,
  number_ambiguous: copy.edit.numberAmbiguous,
  unit_mismatch: copy.edit.unitMismatch,
  qualifier_required: copy.edit.qualifierRequired,
  owner_only: copy.edit.ownerOnly,
};

/** The inline sentence for a refusal of Save: out of date, one of the parser's, or the generic one. */
export function editRefusalMessage(code: string): string {
  if (STALE_REFUSALS.has(code)) return copy.edit.changed;
  return REFUSAL_MESSAGES[code] ?? copy.edit.failed;
}

/** Unit names by unit code, from the catalogue (`units.<code>`). */
const UNIT_NAMES: Readonly<Record<string, string | undefined>> = copy.units;

/**
 * The label of a quantity's input: the field's label with its unit named in words ("Gross floor
 * area, in square metres"), keyed by the served unit code; the field's label alone when the
 * catalogue names no such unit (a count, a unit with no name yet).
 */
export function quantityLabel(label: string, unitCode: string): string {
  const unit = UNIT_NAMES[unitCode];
  return unit === undefined ? label : copy.edit.inUnit.replace('{field}', label).replace('{unit}', unit);
}

export interface InlineEditorProps {
  readonly projectId: string;
  readonly action: EditAction;
  /** The value being changed, as served (its text prefills a text answer; its label names the field). */
  readonly display: DisplayObject;
  /** The field's label, as the screen shows it. */
  readonly label: string;
  /** Called with the display objects the write changed; the screen reads its view again. */
  readonly onSaved: (changed: readonly DisplayObject[]) => void;
  readonly onCancel: () => void;
  /** Called when the value changed under the owner (409 shown_value_changed): the screen reads its view again. */
  readonly onStale?: () => void;
  /**
   * The screen's one write guard, when the screen holds one for all its writes (step 3's rows): Save
   * claims it, so no other write of the screen is on its way at the same time. Without it the editor
   * guards its own Save.
   */
  readonly inFlight?: InFlight;
}

/** The text a text answer starts from: the owner's stored text, never a missing value's wording. */
function initialText(display: DisplayObject, action: EditAction): string {
  if (action.input.kind !== 'text' || display.shape === 'missing') return '';
  return display.text;
}

export function InlineEditor({ projectId, action, display, label, onSaved, onCancel, onStale, inFlight }: InlineEditorProps) {
  const onSignedOut = useOnSignedOut();
  const input = action.input;
  const fieldKey = action.field.fieldKey;
  const [text, setText] = useState(() => initialText(display, action));
  const [choice, setChoice] = useState('');
  const [qualifier, setQualifier] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const own = useInFlight();
  const saving = inFlight ?? own;
  const name = `edit-${display.valueId.replace(/[^A-Za-z0-9_-]/gu, '-')}`;

  const answer = (): AnswerValue | null => {
    if (input.kind === 'text') return text.trim() === '' ? null : { kind: 'text', text: text.trim() };
    if (input.kind === 'choice') return choice === '' ? null : { kind: 'choice', choice };
    if (input.kind === 'quantity') {
      if (text.trim() === '') return null;
      return { kind: 'quantity', raw: text.trim(), ...(qualifier === '' ? {} : { qualifier }) };
    }
    return null;
  };

  const save = () => {
    const value = answer();
    if (value === null) {
      setError(copy.edit.answerInvalid);
      return;
    }
    void saving.run(async () => {
      setError(undefined);
      let written;
      try {
        written = await request('fields.edit', { params: { projectId }, body: { field: action.field, value, corrects: action.shownCandidateIds } });
      } catch (refusal) {
        if (isSignedOut(refusal)) {
          onSignedOut();
          return;
        }
        const code = refusal instanceof ApiError ? refusal.code : '';
        setError(editRefusalMessage(code));
        if (STALE_REFUSALS.has(code)) onStale?.();
        return;
      }
      onSaved(written.displayObjects);
    });
  };

  let control;
  if (input.kind === 'text') {
    control = <TextField label={label} value={text} maxLength={input.maxLength} onChange={setText} {...(error === undefined ? {} : { error })} />;
  } else if (input.kind === 'choice' && input.options.length > 8) {
    control = (
      <SelectField
        label={label}
        labelPlacement="outside"
        options={input.options.map((option) => ({ value: option, label: optionLabel(fieldKey, option) })).sort((left, right) => left.label.localeCompare(right.label, 'en'))}
        value={choice}
        placeholder={copy.edit.chooseOption}
        onChange={setChoice}
        {...(error === undefined ? {} : { error })}
      />
    );
  } else if (input.kind === 'choice') {
    control = (
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-[15px] font-medium">{label}</legend>
        {input.options.map((option) => (
          <Choice
            key={option}
            type="radio"
            name={name}
            value={option}
            checked={choice === option}
            onChange={(checked) => {
              if (checked) setChoice(option);
            }}
            label={optionLabel(fieldKey, option)}
          />
        ))}
        {error === undefined ? null : (
          <p role="alert" className="text-[13px] text-(--sov-text-primary)">
            {error}
          </p>
        )}
      </fieldset>
    );
  } else if (input.kind === 'quantity') {
    const [onlyQualifier] = input.qualifiers;
    control = (
      <div className="flex flex-col gap-4">
        <TextField label={quantityLabel(label, input.unit.code)} value={text} inputMode="decimal" maxLength={40} onChange={setText} {...(error === undefined ? {} : { error })} />
        {input.qualifiers.length === 1 && onlyQualifier !== undefined ? (
          // One qualifier: a visible radio the owner ticks, never a one-option select (rule 8: the
          // basis is the owner's to state, so it is not ticked for them).
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-[13px] text-(--sov-text-muted)">{copy.edit.qualifier}</legend>
            <Choice
              type="radio"
              name={`${name}-qualifier`}
              value={onlyQualifier}
              checked={qualifier === onlyQualifier}
              onChange={(checked) => {
                if (checked) setQualifier(onlyQualifier);
              }}
              label={<span data-copy-kind="registry-qualifier">{qualifierLabel(fieldKey, onlyQualifier)}</span>}
            />
          </fieldset>
        ) : input.qualifiers.length > 1 ? (
          <SelectField
            label={copy.edit.qualifier}
            labelPlacement="outside"
            options={input.qualifiers.map((key) => ({ value: key, label: qualifierLabel(fieldKey, key) }))}
            value={qualifier}
            placeholder={copy.edit.chooseQualifier}
            onChange={setQualifier}
            required={input.qualifierRequired}
          />
        ) : null}
      </div>
    );
  } else {
    control = null;
  }

  return (
    <div className="flex flex-col gap-4 rounded-(--sov-radius-surface) border border-(--sov-border) px-5 py-4">
      {control}
      <div className="flex items-center gap-3">
        <Button variant="secondary" aria-busy={saving.busy} onClick={save}>
          {copy.actions.save}
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          {copy.actions.cancel}
        </Button>
      </div>
    </div>
  );
}
