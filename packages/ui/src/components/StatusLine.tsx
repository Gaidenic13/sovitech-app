import type { DisplayObject, Line } from '@sovitech/view-model/browser';
import { copyKindOfLine, holdsNumberCharacter } from './copy-kind';
import { Icon, type IconComponent } from './Icon';

interface LineProps {
  /**
   * A line with no number, as served (a 2.8 status line, a stage label, a rule line such as "You can
   * provide this later.", a generated sentence or a source line). A line that holds a number is
   * served as its own display object: pass it as `display`.
   */
  readonly line: Line;
  readonly display?: never;
}

interface DisplayProps {
  /**
   * A standalone line that holds a number, served as its own display object (kind `line`): a rule 7
   * count ("<n> things for you to check", "and <n> more", "Still reading <n> files…"), a document's
   * coverage, the late-findings notice, an output's "Not available yet" line. It renders in its own
   * element bound to its value id (prompt 3 section 7; tests/e2e/render/README.md).
   */
  readonly display: DisplayObject;
  readonly line?: never;
}

export type StatusLineProps = (LineProps | DisplayProps) & {
  /** An optional leading icon (decorative). */
  readonly icon?: IconComponent;
  /** `p` by default; `span` inside a row of text. */
  readonly as?: 'p' | 'span' | 'li';
};

/**
 * One line built from stored state (F-RENDER-01, F-RENDER-05; 2.8 "Status lines and stage labels":
 * "These appear as lines, banners or headings, not as badges"; rule 7's counts; rule 12's coverage).
 *
 * - With `display`: the element carries `data-value-id`, and its text is the display object's text,
 *   so every number in it is bound to the id the view-model derived from stored state (prompt 3
 *   section 7: "Every 2.8 status line and every rule 7 count … renders through the StatusLine
 *   component").
 * - With `line`: no value id, so the line must hold no number; a number here would be a bare digit
 *   on the screen (G2-1), and the component refuses it.
 * The line's words are the API's (from the registry); the kit adds none.
 */
export function StatusLine(props: StatusLineProps) {
  const Element = props.as ?? 'p';
  const icon = props.icon === undefined ? null : <Icon icon={props.icon} size="small" />;
  if (props.display !== undefined) {
    const display = props.display;
    const own = display.lines?.find((line) => line.text === display.text);
    const marker = own === undefined ? undefined : copyKindOfLine(own.kind);
    return (
      <Element className="sov-status-line" data-value-id={display.valueId}>
        {icon}
        <span data-copy-kind={marker}>{display.text}</span>
      </Element>
    );
  }
  const line = props.line;
  if (holdsNumberCharacter(line.text)) {
    throw new Error(
      `StatusLine: the line "${line.id}" holds a number and has no value id; a line with a number is served as its own display object (prompt 3 section 7).`,
    );
  }
  return (
    <Element className="sov-status-line" data-line={line.id}>
      {icon}
      <span data-copy-kind={copyKindOfLine(line.kind)}>{line.text}</span>
    </Element>
  );
}
