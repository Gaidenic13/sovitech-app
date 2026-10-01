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
  /** Called with the `add` action when the owner presses it. Without it, the action is not shown. */
  readonly onAdd?: (action: AddAction) => void;
}

function addActionOf(display: DisplayObject): AddAction | undefined {
  return (display.actions ?? []).find((action): action is AddAction => action.kind === 'add');
}

/**
 * "Not available yet" with what is missing and its action (guardrails rule 7: "'Not available yet'
 * never appears alone. It names what is missing and offers the action. An empty card, a dash or a
 * zero is never shown"; 2.8; prompt 3 5.3; PRD D-14 interim: "Where no owner action exists, the line
 * names what is missing and shows no action wording").
 *
 * Bound to its value id, because what it names may hold a number. It refuses to render a bare
 * "Not available yet" that names nothing.
 */
export function NotAvailableYet({ display, onAdd }: NotAvailableYetProps) {
  const isNotAvailable = display.missing === 'not_available_yet' || display.badge?.id === 'not_available_yet';
  if (!isNotAvailable) {
    throw new Error(`NotAvailableYet ${display.valueId}: the display object is not "Not available yet" (missing: ${String(display.missing)}).`);
  }
  const badge = display.badge;
  const textNames = badge === undefined || badge.label !== display.text;
  const lines = display.lines ?? [];
  const add = addActionOf(display);
  if (!textNames && lines.length === 0 && add === undefined) {
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
      {add !== undefined && onAdd !== undefined ? (
        <Button variant="link" icon={Plus} onClick={() => onAdd(add)}>
          {add.label}
        </Button>
      ) : null}
    </div>
  );
}
