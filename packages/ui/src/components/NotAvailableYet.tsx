import { Plus } from 'lucide-react';
import type { Action, DisplayObject } from '@sovitech/view-model/browser';
import { Badge } from './Badge';
import { Button } from './Button';
import { copyKindOfLine } from './copy-kind';

type AddAction = Extract<Action, { kind: 'add' }>;

export interface NotAvailableYetProps {
  /**
   * The output's or field's display object with `missing: "not_available_yet"`, as served: its text
   * (the badge, or a line such as "Not available yet: <missing>"), the lines that name what is
   * missing ("Add the <field> to see this."), and, when the owner has one, its `add` action whose
   * label the API served ("Add <field>").
   */
  readonly display: DisplayObject;
  /** Called with the `add` action the owner pressed. Without it, no action is shown. */
  readonly onAdd?: (action: AddAction) => void;
  /**
   * The id of the element that names the output or field this line belongs to (the row's name, the output's stage
   * label), set as each Add button's `aria-describedby` (DR-1): the same "Add gross floor area" under several outputs
   * then reads as the one for this output. Without it the buttons carry no description.
   */
  readonly describedBy?: string;
}

/** Every `add` action the API served, in the order served (one per missing owner input the line names). */
export function addActionsOf(display: DisplayObject): AddAction[] {
  return (display.actions ?? []).filter((action): action is AddAction => action.kind === 'add');
}

/**
 * The served Add actions as one row of link buttons under the line (DR-1; rule 7: "names what is missing and offers the
 * action"; R-012), in served order, each pressing its own action. Inside the bound element, as every action label of a
 * display is (`servedDisplayOf`).
 */
export function AddActions({ actions, onAdd, describedBy }: { readonly actions: readonly AddAction[]; readonly onAdd: (action: AddAction) => void; readonly describedBy?: string }) {
  if (actions.length === 0) return null;
  return (
    <div className="sov-value__actions" data-add-actions="">
      {actions.map((action) => (
        <Button key={`${action.field.subjectId}:${action.field.fieldKey}`} variant="link" icon={Plus} aria-describedby={describedBy} onClick={() => onAdd(action)}>
          {action.label}
        </Button>
      ))}
    </div>
  );
}

/**
 * "Not available yet" with what is missing and its action (guardrails rule 7: "'Not available yet'
 * never appears alone. It names what is missing and offers the action. An empty card, a dash or a
 * zero is never shown"; 2.8; prompt 3 5.3; PRD D-14 interim: "Where no owner action exists, the line
 * names what is missing and shows no action wording").
 *
 * Bound to its value id, because what it names may hold a number. It refuses to render a bare
 * "Not available yet" that names nothing. Every Add the API served shows, in served order (DR-1): a line that names
 * three missing inputs offers three ways in, never only the first.
 */
export function NotAvailableYet({ display, onAdd, describedBy }: NotAvailableYetProps) {
  const isNotAvailable = display.missing === 'not_available_yet' || display.badge?.id === 'not_available_yet';
  if (!isNotAvailable) {
    throw new Error(`NotAvailableYet ${display.valueId}: the display object is not "Not available yet" (missing: ${String(display.missing)}).`);
  }
  const badge = display.badge;
  const textNames = badge === undefined || badge.label !== display.text;
  const lines = display.lines ?? [];
  const adds = addActionsOf(display);
  if (!textNames && lines.length === 0 && adds.length === 0) {
    throw new Error(`NotAvailableYet ${display.valueId}: "Not available yet" must name what is missing (rule 7).`);
  }
  return (
    <div className="sov-not-available" data-value-id={display.valueId} data-shape={display.shape} data-kind={display.kind}>
      <div className="sov-value__line">
        {badge === undefined ? null : <Badge badge={badge} />}
        {textNames ? <p className="sov-not-available__text">{display.text}</p> : null}
      </div>
      {lines.map((line) => (
        <p key={`${line.kind}:${line.id}:${line.text}`} className="sov-value__status" data-line={line.id} data-copy-kind={copyKindOfLine(line.kind)}>
          {line.text}
        </p>
      ))}
      {onAdd === undefined ? null : <AddActions actions={adds} onAdd={onAdd} {...(describedBy === undefined ? {} : { describedBy })} />}
    </div>
  );
}
