import { Check as CheckGlyph } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { FieldError } from './FieldError';
import { Icon, type IconComponent } from './Icon';

export type ChoiceType = 'radio' | 'checkbox';

interface NativeChoiceProps {
  readonly type: ChoiceType;
  /** The group's name: radios of one question share it, so arrow keys move between them. */
  readonly name: string;
  /** The option key (a field's option key, or a decision field's key). */
  readonly value: string;
  readonly checked: boolean;
  /** Called with the input's new checked state. */
  readonly onChange: (checked: boolean) => void;
  readonly id?: string;
  readonly labelledBy?: string;
  readonly describedBy?: string;
}

/**
 * The control itself: a real `<input type="radio">` or `<input type="checkbox">` (prompt 3 section
 * 11: "Card-style radios and checkboxes are real inputs"), drawn by CSS with the mark over it:
 * unchecked, a ring at 3:1; checked, a mint fill with a dark check or dot ("App theme", "Checked
 * checkbox and radio"). Space toggles it, arrow keys move between radios, and the browser's own
 * semantics say checked or not, so the state never rests on colour.
 */
function NativeChoice({ type, name, value, checked, onChange, id, labelledBy, describedBy }: NativeChoiceProps) {
  return (
    <span className="sov-check" data-type={type}>
      <input
        id={id}
        className="sov-check__input"
        type={type}
        name={name}
        value={value}
        checked={checked}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      {type === 'checkbox' ? (
        <CheckGlyph className="sov-check__mark" size={14} strokeWidth={2.5} aria-hidden="true" focusable="false" />
      ) : (
        <svg className="sov-check__mark" viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" focusable="false">
          <circle cx="7" cy="7" r="3.5" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}

export interface ChoiceProps extends Omit<NativeChoiceProps, 'labelledBy' | 'describedBy'> {
  /** The option's label: fixed copy from the catalogue (`options.<field>.<key>`). */
  readonly label: ReactNode;
}

/** A plain radio or checkbox with its label on one line, for lists that are not cards. */
export function Choice({ label, ...native }: ChoiceProps) {
  const generated = useId();
  const inputId = native.id ?? `${generated}-choice`;
  return (
    <label className="sov-choice" htmlFor={inputId}>
      <NativeChoice {...native} id={inputId} />
      <span>{label}</span>
    </label>
  );
}

export type ChoiceCardShape = 'tall' | 'tile' | 'pill';

export interface ChoiceCardProps extends Omit<NativeChoiceProps, 'labelledBy' | 'describedBy'> {
  /** The card's title: fixed copy from the catalogue. */
  readonly title: ReactNode;
  /** The card's description: fixed copy (for Fire Safety, §5-4b's monitoring-only text). */
  readonly description?: ReactNode;
  /**
   * A decorative icon: 32px on tall cards (the largest the render test reads as an icon; the
   * mockups draw 40px; ADR 0035, DR-26), 24px on tiles and pills.
   */
  readonly icon?: IconComponent;
  /**
   * `tall`: icon, title, description, the control at the top right (steps 1, 4, 6, 7).
   * `tile`: a compact tile (step 5's building type). `pill`: one row (step 5's schedule and occupancy).
   */
  readonly shape?: ChoiceCardShape;
  /** Where the control sits: at the top right (default), or at the bottom centre as step 1 draws it. */
  readonly indicator?: 'top-end' | 'bottom-center';
  /**
   * Content under the description, inside the card: a detection's Value (step 4), a "Suggested" badge
   * with its reason line, a found fact's evidence. Read-only content only: a card is one label, so it
   * holds no other control.
   */
  readonly extra?: ReactNode;
  /**
   * The card's status slot (DR-2): the served decision's Value in the `compact` layout (its text and
   * its badge together, such as "Included" with "Provided by you"). A stored choice then shows once,
   * with its badge, and not again as a row under the description. Where it sits:
   * - `tall`: on the card's top row beside the icon, the place the approved screens give a badge;
   * - `tile` and `pill` (step 5's narrow options, too narrow for a value beside an icon and a
   *   control): on its own row under the title, from the title's edge to the control's.
   * Read-only content only (the card is one label): a Value without `onAction`. It describes the
   * input, as `extra` does.
   */
  readonly status?: ReactNode;
}

/**
 * A selectable card (onboarding-spec 2.5, "Selectable card, three shapes" and "Selected state"):
 * the whole card is the input's `<label>`, so a click anywhere chooses it. The input is named by the
 * title alone and described by the description and the extra content, so a screen reader reads a
 * short name first. Selected: a mint 1px border and the mint 8% fill ("App theme"); focused: the
 * accent outline around the card. No glow, no filled icon swap (onboarding-spec 6.2).
 */
export function ChoiceCard({ title, description, icon, shape = 'tall', indicator = 'top-end', extra, status, ...native }: ChoiceCardProps) {
  const generated = useId();
  const inputId = native.id ?? `${generated}-input`;
  const titleId = `${inputId}-title`;
  const descriptionId = `${inputId}-description`;
  const extraId = `${inputId}-extra`;
  const statusId = `${inputId}-status`;
  const describedBy = [
    status === undefined ? null : statusId,
    description === undefined ? null : descriptionId,
    extra === undefined ? null : extraId,
  ].filter((part): part is string => part !== null);
  const control = (
    <NativeChoice {...native} id={inputId} labelledBy={titleId} describedBy={describedBy.length === 0 ? undefined : describedBy.join(' ')} />
  );
  const glyph = icon === undefined ? null : <Icon icon={icon} size={shape === 'tall' ? 'large' : 'default'} />;
  const statusSlot =
    status === undefined ? null : (
      <span className="sov-choice-card__status" id={statusId}>
        {status}
      </span>
    );
  return (
    <label
      className="sov-choice-card"
      data-shape={shape}
      data-indicator={indicator}
      data-icon={icon === undefined ? 'false' : 'true'}
      data-status={status === undefined ? 'false' : 'true'}
      htmlFor={inputId}
    >
      {shape === 'pill' ? (
        <>
          {glyph}
          <span className="sov-choice-card__title" id={titleId}>
            {title}
          </span>
          {control}
          {statusSlot}
        </>
      ) : (
        <>
          <span className="sov-choice-card__top">
            {glyph}
            {shape === 'tall' ? statusSlot : null}
            {indicator === 'top-end' ? control : null}
          </span>
          <span className="sov-choice-card__title" id={titleId}>
            {title}
          </span>
          {shape === 'tall' ? null : statusSlot}
          {description === undefined ? null : (
            <span className="sov-choice-card__description" id={descriptionId}>
              {description}
            </span>
          )}
          {extra === undefined ? null : (
            <span className="sov-choice-card__extra" id={extraId}>
              {extra}
            </span>
          )}
          {indicator === 'bottom-center' ? control : null}
        </>
      )}
    </label>
  );
}

export interface ChoiceGroupProps {
  /** The question, fixed copy from the catalogue (`questions.<questionId>`), as the group's legend. */
  readonly legend: ReactNode;
  /** The helper line under it (rule 6: "Each question shows one line saying why it is asked"). */
  readonly hint?: ReactNode;
  /** A decorative icon in the question's gutter (step 5). */
  readonly icon?: IconComponent;
  /** How many cards per row (4 on steps 1, 4 and 6; 3 on step 7; 6 for step 5's tiles). */
  readonly columns?: number;
  /** The cards. */
  readonly children: ReactNode;
  /** Under the cards: "Skip for now", or the "You can provide this later." line. */
  readonly footer?: ReactNode;
  /** An inline error (step 1's project type, G7-6). */
  readonly error?: string;
}

/**
 * One question's options (a `<fieldset>` with its `<legend>`), so the question names the group for
 * assistive technology and radios of one question form one tab stop. The legend takes the group or
 * question label role (`sov-heading-group`, 16px at 500; DR-18). A "Skip for now" footer sits 24px
 * under the cards (DR-14; the SkipForNow component owns that space).
 */
export function ChoiceGroup({ legend, hint, icon, columns = 4, children, footer, error }: ChoiceGroupProps) {
  const generated = useId();
  const hintId = `${generated}-hint`;
  const errorId = `${generated}-error`;
  const describedBy = [hint === undefined ? null : hintId, error === undefined ? null : errorId].filter((part): part is string => part !== null);
  return (
    <fieldset
      className="sov-choice-group"
      data-icon={icon === undefined ? 'false' : 'true'}
      aria-describedby={describedBy.length === 0 ? undefined : describedBy.join(' ')}
    >
      <legend className="sov-choice-group__legend sov-heading-group">
        {icon === undefined ? null : <Icon icon={icon} size="large" />}
        <span>{legend}</span>
      </legend>
      {hint === undefined ? null : (
        <p className="sov-choice-group__hint" id={hintId}>
          {hint}
        </p>
      )}
      <div className="sov-choice-group__options" style={{ ['--sov-columns' as string]: String(columns) }}>
        {children}
      </div>
      {error === undefined ? null : <FieldError id={errorId} message={error} />}
      {footer}
    </fieldset>
  );
}
