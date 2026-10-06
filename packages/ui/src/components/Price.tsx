import { useId } from 'react';
import type { Action, DisplayObject, Line } from '@sovitech/view-model/browser';
import { Badge } from './Badge';
import { copyKindOfLine } from './copy-kind';
import { AddActions, addActionsOf } from './NotAvailableYet';
import { StatusLine } from './StatusLine';

/** The registry id of rule 10's stage 3 label (packages/registry/src/copy/status-lines.ts), the one stage label bound to a stored record. */
const FORMAL_QUOTATION = 'formal_quotation';

type AddAction = Extract<Action, { kind: 'add' }>;

export interface PriceProps {
  /**
   * The price's display object, as the API served it: its range or "Not available yet" in `text`,
   * its stage label among its `lines` (kind `stage_label`, read by the server from stored records),
   * and, at stage 3 only, `quotationRecordId`.
   */
  readonly display: DisplayObject;
  /**
   * "Superseded: inputs changed on <date>" (2.8; rule 10, "A quotation goes stale when its inputs
   * change"), served as its own line display object (the contract's `Price.superseded`) when a stored
   * quotation record of this figure's snapshot rests on inputs that changed after issue; the figure is
   * then served back at stage 2's label (G10-2). Rendered under the figure, bound to its own value id, unless the
   * figure's own display already carries the same line among its `lines` (shown once, inside the figure's element).
   */
  readonly superseded?: DisplayObject;
  /** What the price is ("Investment"), from the catalogue, shown outside the bound element. */
  readonly label?: string;
  /** `headline`: the figure set large, for the head of the stored proposal (layout only; the content is the same, G2-7). */
  readonly size?: 'default' | 'headline';
  /**
   * Called with the served `add` action the owner pressed, on a price that cannot be produced for missing owner inputs
   * (rule 7: "Not available yet" names what is missing and offers the action; G7-2b). Every served Add shows, in
   * served order (DR-1). Without it, no action is shown.
   */
  readonly onAdd?: (action: AddAction) => void;
  /**
   * The id of the element that names this price where the page draws its name outside the component (a row's name):
   * each Add button's `aria-describedby` (DR-1). By default the price's own `label`, when it has one.
   */
  readonly describedBy?: string;
}

function stageLabelOf(display: DisplayObject): Line | undefined {
  return (display.lines ?? []).find((line) => line.kind === 'stage_label');
}

/**
 * The one price component (guardrails rule 10; F-RENDER-02; prompt 3 section 7: prices through
 * "the Price component, which reads the stage from stored records"; PRD R-127; docs/adr/0049
 * decision 3).
 *
 * It takes no stage as a parameter: the stage label comes only from the display object the server
 * built from stored records ("Templates read the stage from the record. They never accept it as a
 * parameter"). It refuses to render:
 * - a figure with no stage label (rule 10: every investment figure names its stage);
 * - the stage 3 label "Formal quotation" on a display object that names no stored quotation record
 *   (rule 10, "Stage 3 is derived, not passed"; G10-9, which the render test proves on the page);
 * - "Superseded" beside the stage 3 label (rule 10: a stale quotation's figures "return to stage 2
 *   labels"; G10-2): the server serves the stage 2 label with the line, never "Formal quotation".
 * A price that cannot be produced reads its missing wording as its badge, with the lines that name
 * what is missing and the owner's Add actions where there are some (rule 7), never a zero. It names no
 * stage unless the server served one (G10-11: the web derives no stage of its own). A price served as a
 * line (rule 1's "Incomplete: excludes <item names>" in place of its figure, with its stage label) shows
 * that line once: a served line whose text is the display's own text is not repeated under it.
 */
export function Price({ display, superseded, label, size = 'default', onAdd, describedBy }: PriceProps) {
  const labelId = useId();
  const stage = stageLabelOf(display);
  if (stage !== undefined && stage.id === FORMAL_QUOTATION && display.quotationRecordId === undefined) {
    throw new Error(`Price ${display.valueId}: the stage 3 label needs its stored record, and this display object names none (rule 10; G10-9).`);
  }
  if (display.shape !== 'missing' && stage === undefined) {
    throw new Error(`Price ${display.valueId}: an investment figure with no stage label (rule 10).`);
  }
  if (superseded !== undefined && stage?.id === FORMAL_QUOTATION) {
    throw new Error(`Price ${display.valueId}: a superseded record's figures return to stage 2's label, never the stage 3 label (rule 10; G10-2).`);
  }
  const badge = display.badge;
  const textIsBadge = display.shape === 'missing' && badge !== undefined && badge.label === display.text;
  const otherLines = (display.lines ?? []).filter((line) => line !== stage && line.text !== display.text);
  const adds = display.shape === 'missing' ? addActionsOf(display) : [];
  const described = describedBy ?? (label === undefined ? undefined : labelId);
  const supersededApart = superseded !== undefined && !(display.lines ?? []).some((line) => line.text === superseded.text);
  return (
    <div className="sov-price" data-size={size === 'headline' ? 'headline' : undefined}>
      {label === undefined ? null : (
        <span id={labelId} className="sov-field-value__label">
          {label}
        </span>
      )}
      <div className="sov-value" data-value-id={display.valueId} data-shape={display.shape} data-kind={display.kind} data-numeric="true">
        {stage === undefined ? null : (
          <p className="sov-price__stage" data-line={stage.id} data-copy-kind={copyKindOfLine(stage.kind)}>
            {stage.text}
          </p>
        )}
        <div className="sov-value__line">
          {textIsBadge && badge !== undefined ? (
            <Badge badge={badge} />
          ) : (
            <>
              <bdi className="sov-value__text">{display.text}</bdi>
              {badge === undefined ? null : <Badge badge={badge} />}
            </>
          )}
        </div>
        {display.sourceLine === undefined ? null : (
          <p className="sov-value__source" data-line={display.sourceLine.id} data-copy-kind={copyKindOfLine(display.sourceLine.kind)}>
            {display.sourceLine.text}
          </p>
        )}
        {otherLines.map((line) => (
          <p key={`${line.kind}:${line.id}:${line.text}`} className="sov-value__status" data-line={line.id} data-copy-kind={copyKindOfLine(line.kind)}>
            {line.text}
          </p>
        ))}
        {onAdd === undefined ? null : <AddActions actions={adds} onAdd={onAdd} {...(described === undefined ? {} : { describedBy: described })} />}
      </div>
      {supersededApart && superseded !== undefined ? <StatusLine display={superseded} /> : null}
    </div>
  );
}
