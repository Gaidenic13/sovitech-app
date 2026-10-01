import type { DisplayObject, Line } from '@sovitech/view-model/browser';
import { Badge } from './Badge';
import { copyKindOfLine } from './copy-kind';

/** The registry id of rule 10's stage 3 label (packages/registry/src/copy/status-lines.ts), the one stage label bound to a stored record. */
const FORMAL_QUOTATION = 'formal_quotation';

export interface PriceProps {
  /**
   * The price's display object, as the API served it: its range or "Not available yet" in `text`,
   * its stage label among its `lines` (kind `stage_label`, read by the server from stored records),
   * and, at stage 3 only, `quotationRecordId`.
   */
  readonly display: DisplayObject;
  /** What the price is ("Investment"), from the catalogue, shown outside the bound element. */
  readonly label?: string;
}

function stageLabelOf(display: DisplayObject): Line | undefined {
  return (display.lines ?? []).find((line) => line.kind === 'stage_label');
}

/**
 * The one price component (guardrails rule 10; F-RENDER-02; prompt 3 section 7: prices through
 * "the Price component, which reads the stage from stored records").
 *
 * It takes no stage as a parameter: the stage label comes only from the display object the server
 * built from stored records ("Templates read the stage from the record. They never accept it as a
 * parameter"). It refuses to render:
 * - a figure with no stage label (rule 10: every investment figure names its stage);
 * - the stage 3 label "Formal quotation" on a display object that names no stored quotation record
 *   (rule 10, "Stage 3 is derived, not passed"; G10-9, which the render test proves on the page).
 * A price that cannot be produced reads its missing wording as its badge, with the lines that name
 * what is missing, never a zero.
 *
 * No phase 3 screen shows a price: every dataset gate is closed, so no investment figure exists
 * (prompt 3 5.4, `dataset-cost-ranges`).
 */
export function Price({ display, label }: PriceProps) {
  const stage = stageLabelOf(display);
  if (stage !== undefined && stage.id === FORMAL_QUOTATION && display.quotationRecordId === undefined) {
    throw new Error(`Price ${display.valueId}: the stage 3 label needs its stored record, and this display object names none (rule 10; G10-9).`);
  }
  if (display.shape !== 'missing' && stage === undefined) {
    throw new Error(`Price ${display.valueId}: an investment figure with no stage label (rule 10).`);
  }
  const badge = display.badge;
  const textIsBadge = display.shape === 'missing' && badge !== undefined && badge.label === display.text;
  const otherLines = (display.lines ?? []).filter((line) => line !== stage);
  return (
    <div className="sov-price">
      {label === undefined ? null : <span className="sov-field-value__label">{label}</span>}
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
      </div>
    </div>
  );
}
