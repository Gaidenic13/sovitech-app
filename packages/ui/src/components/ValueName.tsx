import type { DisplayObject } from '@sovitech/view-model/browser';
import { Badge } from './Badge';
import { isNumericDisplay, ValueElement } from './Value';

export interface ValueNameProps {
  /** A name-like value as served: a project's name, a file name, a tag as written, a level's label, a zone's name. */
  readonly display: DisplayObject;
  /**
   * Whether the value's one badge shows after the name (default true). Pass false only where the
   * same value shows with its badge and source line elsewhere on the page or in the flow (the
   * project's name in the switcher, as in phase 3's header, and on the project card and step 1).
   * A numeric display ignores it: it always shows its badge and its lines (see below).
   */
  readonly showBadge?: boolean;
}

/**
 * A name inside a control or a heading (phase 4 kit): the switcher's project names, the inspector's
 * heading (a file name, a tag), a level's label in a list or a filter chip. Phrasing content only, so
 * it may sit inside a button, a link, a heading or an option, where the Value component's block layout
 * may not.
 *
 * Bound like every value (prompt 3 section 7): the element carries the value id, and shows the served
 * text, isolated in a `<bdi>` (A-8, G2-13), then its badge on the same line (2.8 "Prominence"). A
 * missing name reads its missing wording once, as its badge (rule 1). Its source and status lines show
 * where the value itself is shown, through the Value component.
 *
 * A numeric display (a tag written "101" or "1.2", served as a record whose every part is a number; a
 * quantity or count with a unit, a range, a line built around its numbers) never throws here: a served
 * display never takes the page down (rule 7: never a dead end; rule 10: the frame and its demo line stay).
 * It renders through the Value component's own element, in its phrasing form (spans only, no action
 * control), in place of the bare name: its text, its one badge on the line and its source and status
 * lines, always (rules 2 and 9), so a number never stands alone in a heading, a button or an option.
 */
export function ValueName({ display, showBadge = true }: ValueNameProps) {
  if (isNumericDisplay(display)) {
    return (
      <span className="sov-value-name" data-delegated="value">
        <ValueElement display={display} badgePlacement="line" phrasing />
      </span>
    );
  }
  const badge = display.badge;
  const textIsBadge = display.shape === 'missing' && badge !== undefined && badge.label === display.text;
  return (
    <span className="sov-value-name" data-value-id={display.valueId} data-shape={display.shape} data-kind={display.kind}>
      {textIsBadge && badge !== undefined ? (
        <Badge badge={badge} />
      ) : (
        <>
          <bdi className="sov-value-name__text">{display.text}</bdi>
          {showBadge && badge !== undefined ? <Badge badge={badge} /> : null}
        </>
      )}
    </span>
  );
}
