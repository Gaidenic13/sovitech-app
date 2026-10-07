/**
 * How the stored proposal, its landing and Reports put a served value on the page (guardrails rule 2, "UI code
 * receives only resolved field objects"; 2.8; rule 7; rule 10; prompt 3 section 7; docs/adr/0049 decision 3): each
 * value id through the one kit component that fits its display object, and nothing else.
 *
 * - `Shown`: "Not available yet" through NotAvailableYet, naming what is missing with the owner's Add action where the
 *   API served one (rule 7: never alone, never an empty card, a dash or a zero); a standalone line (a count, "Still
 *   reading …", a sentence built from stored state) through StatusLine, bound; every other value through Value with
 *   its one badge and its source and status lines.
 * - `ProposalPrice`: an investment figure through the kit's one Price component, from the contract's `Price` (the
 *   figure's display). The stage is never passed: the figure's display carries the stage label the server read from
 *   stored records, and the "Superseded" line where a stored quotation record went stale, each once among its own
 *   lines (rule 10, "Stage 3 is derived, not passed"; R-127; phase 6, V-11), and a stage 3 price must name the same
 *   stored record on the price and on its display (G10-9); the component refuses anything else. Nothing here shows a
 *   stage label apart from its figure, and nothing matches lines by their words.
 */
import { NotAvailableYet, Price, StatusLine, Value, type ValueLayout } from '@sovitech/ui';
import type { Action, DisplayObject, Price as PriceRecord } from '@sovitech/view-model/browser';
import type { ReactNode } from 'react';
import type { Displays } from '../wizard/use-step-view';

export type AddAction = Extract<Action, { kind: 'add' }>;

/** Whether a served display reads "Not available yet" (an output or a field missing an input; rule 7). */
export function isNotAvailable(display: DisplayObject): boolean {
  return display.missing === 'not_available_yet' || display.badge?.id === 'not_available_yet';
}

export interface ShownProps {
  readonly display: DisplayObject | undefined;
  /** What the value measures, outside its bound element: by default the served measure's label; `null` where the page names the value already. */
  readonly label?: ReactNode;
  readonly layout?: ValueLayout;
  /** The owner's Add actions of a "Not available yet" line (each opens step 8's inline ask for its field: R-012). */
  readonly onAdd?: (action: AddAction) => void;
  /** The id of the element naming this value on the page (its row's name): each Add button's description (DR-1). */
  readonly describedBy?: string;
}

/** One served value, through the kit component its display object calls for (see the header). */
export function Shown({ display, label, layout, onAdd, describedBy }: ShownProps) {
  if (display === undefined) return null;
  if (isNotAvailable(display)) return <NotAvailableYet display={display} {...(onAdd === undefined ? {} : { onAdd })} {...(describedBy === undefined ? {} : { describedBy })} />;
  if (display.kind === 'line') return <StatusLine display={display} />;
  return <Value display={display} {...(label === undefined ? {} : { label })} {...(layout === undefined ? {} : { layout })} />;
}

export interface ProposalPriceProps {
  readonly price: PriceRecord;
  readonly displays: Displays;
  readonly size?: 'default' | 'headline';
  readonly onAdd?: (action: AddAction) => void;
  /** The id of the element naming this price on the page (its row's name, the head's heading): each Add's description (DR-1). */
  readonly describedBy?: string;
}

/** An investment figure of the stored proposal through the kit's Price (see the header). */
export function ProposalPrice({ price, displays, size = 'default', onAdd, describedBy }: ProposalPriceProps) {
  const figure = displays.get(price.figure);
  if (figure === undefined) return null;
  // G10-9 (rule 10, "Stage 3 is derived, not passed"): a stage 3 price names its stored record, the same on the price and on its figure.
  if (price.stageId === 'formal_quotation' && (price.quotationRecordId === null || price.quotationRecordId !== figure.quotationRecordId)) {
    throw new Error(`Price ${price.figure}: the stage 3 label needs the stored record it was derived from, named on the price and on its figure (rule 10; G10-9).`);
  }
  return (
    <Price
      display={figure}
      size={size}
      {...(onAdd === undefined ? {} : { onAdd })}
      {...(describedBy === undefined ? {} : { describedBy })}
    />
  );
}
