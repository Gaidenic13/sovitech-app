import { useId } from 'react';
import type { Line } from '@sovitech/view-model/browser';
import { copyKindOfLine, holdsNumberCharacter } from './copy-kind';

export interface ProgressProps {
  /**
   * What is in progress. It names the bar and, unless `labelDisplay` is `hidden`, shows beside it
   * as text, so the state never rests on colour or motion alone (prompt 3 section 11; WCAG 1.4.1):
   * - fixed copy from the catalogue ("Uploading");
   * - or a line the API served (for a file being read, 2.8's line as the view serves it), shown
   *   with its line id and its copy-kind marker, as StatusLine shows it.
   * It holds no number: the bar shows and announces none (US-DOCS-03 AC1).
   */
  readonly label: string | Line;
  /**
   * `visible` (the default): the text shows beside the bar. `hidden`: no visible text, for a row
   * that already says what is in progress in words; the bar keeps its accessible name.
   */
  readonly labelDisplay?: 'visible' | 'hidden';
}

/**
 * An indeterminate progress bar for a file being uploaded, queued or analysed (UD-33; US-DOCS-03
 * AC1: "no percentage, no size"), with what is in progress in words beside it (DR-4). It shows no
 * number and announces none: no `aria-valuenow`, no percentage (rule 2: digits with no stored-state
 * meaning are not shown; binding them is proposal 7.2.30). Its segment moves inside an outlined
 * track unless the owner asks for reduced motion, when it stands still. It sits beside a value,
 * never inside a value element (G2-8: no value animates).
 *
 * Markup: `.sov-progress` holds `.sov-progress__track` (the `progressbar`, named by the visible text
 * through `aria-labelledby`, or by `aria-label` when the text is hidden) and `.sov-progress__label`.
 */
export function Progress({ label, labelDisplay = 'visible' }: ProgressProps) {
  const labelId = useId();
  const text = typeof label === 'string' ? label : label.text;
  if (holdsNumberCharacter(text)) {
    throw new Error(`Progress: "${text}" holds a number; a progress bar shows and announces none (US-DOCS-03 AC1).`);
  }
  const visible = labelDisplay === 'visible';
  return (
    <span className="sov-progress" data-label={labelDisplay}>
      <span
        className="sov-progress__track"
        role="progressbar"
        aria-busy="true"
        aria-labelledby={visible ? labelId : undefined}
        aria-label={visible ? undefined : text}
      >
        <span className="sov-progress__bar" />
      </span>
      {visible ? (
        <span
          className="sov-progress__label"
          id={labelId}
          data-line={typeof label === 'string' ? undefined : label.id}
          data-copy-kind={typeof label === 'string' ? undefined : copyKindOfLine(label.kind)}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
