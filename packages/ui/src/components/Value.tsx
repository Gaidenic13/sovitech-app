import { Pencil, Plus } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import type { Action, DisplayObject, Line } from '@sovitech/view-model/browser';
import { Badge } from './Badge';
import { Button } from './Button';
import { copyKindOfLine } from './copy-kind';
import { Icon, type IconComponent } from './Icon';

/** The fixed labels of the owner's actions on a value, from the app's catalogue (`actions.*`). */
export interface ValueActionLabels {
  /** "Edit" (guardrails section 5, step 3: Edit on every row). */
  readonly edit: string;
  /** "Yes", after a confirmation's wording (rule 5: "Is this right? Yes · Edit"). */
  readonly yes: string;
  /** "Looks right" on engineer items (rule 3): `owner_acknowledged` only. */
  readonly looksRight: string;
  /** "Something's wrong" on engineer items (rule 3): a note to the engineer queue. */
  readonly somethingWrong: string;
}

export type ValueLayout = 'stack' | 'row' | 'detail' | 'compact' | 'bare';

export interface ValueProps {
  /** The resolved field object, exactly as the API served it. The only input: no number, unit or label is passed beside it. */
  readonly display: DisplayObject;
  /**
   * What the value measures, shown beside it and outside its bound element (rule 8: "Every value
   * states what it measures"). Default: the served measure's label, with its qualifier label (the
   * area basis, what a count counts). `null` shows none (the label is already on the screen).
   */
  readonly label?: ReactNode;
  /** A decorative icon before the label (24px). */
  readonly icon?: IconComponent;
  /**
   * - `stack`: label above the value.
   * - `row`: label left, value and its badge right, on one line where both fit (a 4-column card,
   *   about 300px); where they do not, the value moves under the label, right-aligned, and its badge
   *   stays with its figure (step 3's summary list, step 8's cards; DR-1).
   * - `detail`: icon, label and value in a bordered row (step 3's "Extracted details").
   * - `compact`: the value's text and badge together on one line in a smaller size, with any served
   *   source or status line below; for a card's status slot (ChoiceCard `status`, DR-2). A label is
   *   shown before it when given; pass `label={null}` where the card names the value.
   * - `bare`: the value element alone (inside a card that labels it).
   * Every layout shows the same content: one value id renders identically everywhere (G2-7); a
   * layout only places and sizes it, from the wrapper outside the value element.
   */
  readonly layout?: ValueLayout;
  /**
   * Called when the owner presses one of the value's actions. Without it, the value shows no action
   * control (a read-only view). The web maps each action to its route (routes.ts).
   */
  readonly onAction?: (action: Action) => void;
  /** Required with `onAction`: the fixed action labels. */
  readonly actionLabels?: ValueActionLabels;
  /**
   * The label of the disclosure that shows the value's evidence excerpts ("Show the excerpt"), from
   * the catalogue. Without it the excerpts are not shown. An excerpt is extra detail: the badge and
   * the source line never sit in it (2.8 "Prominence").
   */
  readonly evidenceLabel?: string;
  /**
   * A write from one of this value's actions is on its way (phase 3's carried item; ADR 0039 decision
   * 11): every action button says so with `aria-busy`, and a press sends nothing more until the caller
   * clears it, however fast the presses come. Never a disabled state (rule 7): the buttons stay in the
   * tab order and take presses again as soon as the answer is in. The caller's `useInFlight` sets it.
   */
  readonly busy?: boolean;
}

/** The kinds of action the value itself shows; the others render beside it (see ValueProps.onAction). */
const OWN_ACTIONS: ReadonlySet<Action['kind']> = new Set(['edit', 'confirm', 'acknowledge', 'concern', 'add']);

/**
 * Splits the value's text into its declared parts (the figure and its unit), in order, so a
 * component can style them apart while the render test still reads each piece as declared. Falls
 * back to the whole text when the parts are not pieces of it in order.
 */
function textPieces(display: DisplayObject): ReactNode {
  const parts = display.parts ?? [];
  if (parts.length === 0) return display.text;
  const pieces: ReactNode[] = [];
  // Only a part equal to the declared unit's symbol is styled as a unit; every other part (a
  // second figure, "43 to 47") keeps the figure's style (phase 3 integration: later figures read dimmed).
  const unitSymbol = display.measure?.unit?.symbol;
  let rest = display.text;
  for (const [index, part] of parts.entries()) {
    const at = rest.indexOf(part);
    if (at < 0) return display.text;
    const between = rest.slice(0, at);
    if (between !== '') pieces.push(between);
    pieces.push(
      <span key={`part-${String(index)}`} className={index > 0 && part === unitSymbol ? 'sov-value__unit' : 'sov-value__figure'}>
        {part}
      </span>,
    );
    rest = rest.slice(at + part.length);
  }
  if (rest !== '') pieces.push(rest);
  return pieces;
}

function LineText({ line, className, phrasing = false }: { readonly line: Line; readonly className: string; readonly phrasing?: boolean }) {
  const Element = phrasing ? 'span' : 'p';
  return (
    <Element className={className} data-line={line.id} data-copy-kind={copyKindOfLine(line.kind)}>
      {line.text}
    </Element>
  );
}

/**
 * What the value measures: the measure's label, then its qualifier label after a comma ("Gross floor
 * area, gross total (Scd)"; DR-27). The qualifier label is the registry's text as served, alone in
 * its marked element; the kit adds no bracket around it (a qualifier label may hold its own).
 */
function defaultLabel(display: DisplayObject): ReactNode {
  const measure = display.measure;
  if (measure === undefined) return undefined;
  if (measure.qualifierLabel === undefined) return measure.label;
  return (
    <>
      {measure.label}
      {', '}
      <span className="sov-field-value__qualifier" data-copy-kind="registry-qualifier">
        {measure.qualifierLabel}
      </span>
    </>
  );
}

/** A part that is a number alone: digits with their group and decimal marks ("12", "1.234,5"), nothing else. */
const NUMBER_ONLY = /^[\p{N}][\p{N}\s.,]*$/u;

/**
 * Whether the display is numeric, so its figures take tabular figures (DR-11): a quantity or a count
 * with its unit, a range, a line built around its numbers (a count), or a record whose every part is
 * a number alone (a document's coverage, "12 of 40 pages"). Text values (a file name, a project
 * name, a choice, an address) keep proportional figures and punctuation, digits or not: their parts
 * are the whole text.
 */
export function isNumericDisplay(display: DisplayObject): boolean {
  if (display.shape === 'range' || display.measure?.unit !== undefined || display.kind === 'line') return true;
  const parts = display.parts ?? [];
  return display.kind === 'record' && parts.length > 0 && parts.every((part) => NUMBER_ONLY.test(part));
}

function ValueActions({
  actions,
  onAction,
  labels,
  busy,
}: {
  readonly actions: readonly Action[];
  readonly onAction: (action: Action) => void;
  readonly labels: ValueActionLabels;
  readonly busy: boolean;
}) {
  // One request per press: while a write is on its way, a press sends nothing (the buttons say so
  // with aria-busy and are never disabled, rule 7).
  const press = (action: Action) => () => {
    if (!busy) onAction(action);
  };
  const confirm = actions.find((action) => action.kind === 'confirm');
  const edit = actions.find((action) => action.kind === 'edit');
  const others = actions.filter((action) => action.kind === 'acknowledge' || action.kind === 'concern' || action.kind === 'add');
  return (
    <>
      {confirm === undefined ? null : (
        <div className="sov-value__confirm">
          <p className="sov-value__confirm-wording" data-line={confirm.wording.id} data-copy-kind={copyKindOfLine(confirm.wording.kind)}>
            {confirm.wording.text}
          </p>
          <div className="sov-value__actions">
            <Button variant="link" aria-busy={busy} onClick={press(confirm)}>
              {labels.yes}
            </Button>
            {edit === undefined ? null : (
              <Button variant="link" icon={Pencil} aria-busy={busy} onClick={press(edit)}>
                {labels.edit}
              </Button>
            )}
          </div>
        </div>
      )}
      {(confirm === undefined && edit !== undefined) || others.length > 0 ? (
        <div className="sov-value__actions">
          {confirm === undefined && edit !== undefined ? (
            <Button variant="link" icon={Pencil} aria-busy={busy} onClick={press(edit)}>
              {labels.edit}
            </Button>
          ) : null}
          {others.map((action) => {
            if (action.kind === 'acknowledge') {
              return (
                <Button key="acknowledge" variant="link" aria-busy={busy} onClick={press(action)}>
                  {labels.looksRight}
                </Button>
              );
            }
            if (action.kind === 'concern') {
              return (
                <Button key={`concern:${action.candidateId}`} variant="link" aria-busy={busy} onClick={press(action)}>
                  {labels.somethingWrong}
                </Button>
              );
            }
            if (action.kind === 'add') {
              return (
                <Button key="add" variant="link" icon={Plus} aria-busy={busy} onClick={press(action)}>
                  {action.label}
                </Button>
              );
            }
            return null;
          })}
        </div>
      ) : null}
    </>
  );
}

interface ValueElementProps {
  readonly display: DisplayObject;
  /**
   * `line`: the badge on the value's line, beside its text (every Value).
   * `apart`: the register's badge column holds it, on the same table row (RegisterTable only; 7.1-r2,
   * 7.1.1-E5: "Dense tables get a badge column"; US-REVIEW-01 AC13): the figure's line shows the text,
   * also a missing value's wording, so the cell is never blank, and the row's badge cell, bound to
   * the same value id, shows the one badge. Not exported from the kit: no screen can drop a badge.
   */
  readonly badgePlacement: 'line' | 'apart';
  readonly onAction?: (action: Action) => void;
  readonly actionLabels?: ValueActionLabels;
  readonly busy?: boolean;
  /**
   * Phrasing content only (`span` elements in place of `div` and `p`, and no action control), so the
   * element may sit inside a heading, a button, a link or a listbox option: ValueName's form of a
   * numeric display (phase 4 part B, A-1). The content is the same: the text, its one badge on the
   * line, the source line and the status lines (rules 2 and 9).
   */
  readonly phrasing?: boolean;
}

/** Whether a missing value's wording is its badge's label ("Unknown" read as the Unknown badge): the wording shows once, as the badge. */
export function textIsBadgeOf(display: DisplayObject): boolean {
  const badge = display.badge;
  return display.shape === 'missing' && badge !== undefined && badge.label === display.text;
}

/** The element bound to the value id: what the display object serves, and nothing else. */
export function ValueElement({ display, badgePlacement, onAction, actionLabels, busy = false, phrasing = false }: ValueElementProps) {
  const badge = display.badge;
  const textIsBadge = badgePlacement === 'line' && textIsBadgeOf(display);
  const actions = (display.actions ?? []).filter((action) => OWN_ACTIONS.has(action.kind));
  if (onAction !== undefined && actions.length > 0 && actionLabels === undefined) {
    throw new Error(`Value ${display.valueId}: actionLabels are required with onAction.`);
  }
  const Box = phrasing ? 'span' : 'div';
  return (
    <Box
      className="sov-value"
      data-value-id={display.valueId}
      data-shape={display.shape}
      data-kind={display.kind}
      data-numeric={isNumericDisplay(display) ? 'true' : 'false'}
      {...(badgePlacement === 'apart' ? { 'data-badge-placement': 'apart' } : {})}
      {...(phrasing ? { 'data-phrasing': 'true' } : {})}
    >
      <Box className="sov-value__line">
        {textIsBadge && badge !== undefined ? (
          <Badge badge={badge} />
        ) : (
          <>
            {/* <bdi> isolates the served text (A-8): a direction control in owner text never reorders the badge or the copy around it. */}
            <bdi className="sov-value__text">{textPieces(display)}</bdi>
            {badge === undefined || badgePlacement === 'apart' ? null : <Badge badge={badge} />}
          </>
        )}
      </Box>
      {display.sourceLine === undefined ? null : <LineText line={display.sourceLine} className="sov-value__source" phrasing={phrasing} />}
      {(display.lines ?? []).map((line) => (
        <LineText key={`${line.kind}:${line.id}:${line.text}`} line={line} className="sov-value__status" phrasing={phrasing} />
      ))}
      {!phrasing && onAction !== undefined && actionLabels !== undefined && actions.length > 0 ? (
        <ValueActions actions={actions} onAction={onAction} labels={actionLabels} busy={busy} />
      ) : null}
    </Box>
  );
}

/**
 * The one value component (guardrails rule 2, "UI code receives only resolved field objects"; 2.8;
 * F-RENDER-01, F-RENDER-03; PRD R-043; US-REVIEW-01, US-REVIEW-02; prompt 3 section 7). It is the
 * only place an engineering value, a count or a document value reaches the page.
 *
 * Everything inside the element bound to the value id (`data-value-id`) is what the display object
 * serves, and nothing else: its `text` (or the declared `parts` of it), its one badge on the same
 * line, the source line below, its status and rule lines, a confirmation's wording and an "Add"
 * label (the projection `servedDisplayOf` of @sovitech/view-model/browser, which the render test
 * reads too). On demand, its evidence excerpts show beside it, each in its own element bound to the
 * same value id, so opening them never changes what the value element shows (G2-8). The kit formats
 * nothing: the server's formatting module rounded it, and the component shows it once, with no
 * count-up and no animation (G2-8).
 *
 * A missing value (`shape: "missing"`) reads its missing wording ("Unknown", "Not provided yet",
 * "Reading documents…", "Not available yet" …) as its badge, never a zero, a blank or a dash
 * (rule 1; rule 7).
 */
export function Value({ display, label, icon, layout = 'stack', onAction, actionLabels, evidenceLabel, busy = false }: ValueProps) {
  const labelId = useId();
  const shownLabel = label === undefined ? defaultLabel(display) : label;
  const evidence = evidenceLabel === undefined ? [] : (display.evidence ?? []);

  const element = (
    <ValueElement
      display={display}
      badgePlacement="line"
      {...(onAction === undefined ? {} : { onAction })}
      {...(actionLabels === undefined ? {} : { actionLabels })}
      busy={busy}
    />
  );

  // The excerpts sit beside the value element, not in it: opening the disclosure must not change what
  // the value element shows (G2-8 reads a value element whose shown numbers change as a count-up).
  // Each excerpt is its own element bound to the same value id, marked as verbatim document text.
  const excerpts =
    evidence.length > 0 && evidenceLabel !== undefined ? (
      <details className="sov-disclosure">
        <summary>{evidenceLabel}</summary>
        {evidence.map((item) => (
          <blockquote
            key={`${item.documentId}:${item.excerpt}`}
            className="sov-excerpt"
            data-value-id={display.valueId}
            data-copy-kind="evidence-excerpt"
            data-document-id={item.documentId}
            data-content-hash={item.contentHash}
          >
            {item.excerpt}
          </blockquote>
        ))}
      </details>
    ) : null;

  const hasLabel = shownLabel !== undefined && shownLabel !== null;
  if (layout === 'bare' || (layout !== 'compact' && !hasLabel && icon === undefined)) {
    return excerpts === null ? (
      element
    ) : (
      <>
        {element}
        {excerpts}
      </>
    );
  }
  return (
    <div
      className="sov-field-value"
      data-layout={layout}
      data-icon={icon === undefined ? 'false' : 'true'}
      role={hasLabel ? 'group' : undefined}
      aria-labelledby={hasLabel ? labelId : undefined}
    >
      {icon === undefined ? null : (
        <span className="sov-field-value__icon">
          <Icon icon={icon} />
        </span>
      )}
      {hasLabel ? (
        <span className="sov-field-value__label" id={labelId}>
          {shownLabel}
        </span>
      ) : null}
      {element}
      {excerpts}
    </div>
  );
}
