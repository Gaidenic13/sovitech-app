import { useId, type InputHTMLAttributes } from 'react';
import { FieldError } from './FieldError';
import { Icon, type IconComponent } from './Icon';

type NativeInput = Pick<InputHTMLAttributes<HTMLInputElement>, 'autoComplete' | 'inputMode' | 'name' | 'placeholder' | 'onBlur' | 'type'>;

export interface TextFieldProps extends NativeInput {
  /** The field's label, fixed copy from the catalogue. Always shown (never a placeholder standing in for it). */
  readonly label: string;
  /**
   * `outside`: the label above the box (step 1's "Project name"). `inside`: a small label inside the
   * box above the value (the design's "City" and "Country" boxes).
   */
  readonly labelPlacement?: 'outside' | 'inside';
  /** A decorative leading icon (24px). */
  readonly icon?: IconComponent;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** The longest text the field takes (the API's limit). */
  readonly maxLength?: number;
  /**
   * Shows "<length> / <maxLength>" beside the field, the render allowlist's `character-counter`
   * (rule 2: "character counters"), counted from the field itself. Needs `maxLength`.
   */
  readonly showCounter?: boolean;
  /** A helper line under the label (rule 6's one-line reason, where the design shows one). */
  readonly hint?: string;
  /** The inline error, shown under the field with the field marked invalid (G7-6). */
  readonly error?: string;
  /**
   * Marks the field required for assistive technology (step 1's four fields; rule 7). Only
   * `aria-required`: the native `required` would let the browser stop the form with its own bubble,
   * where rule 7 asks for the app's inline error with Next still pressed through (G7-6).
   */
  readonly required?: boolean;
  /** The input's id; generated when absent. */
  readonly id?: string;
}

/**
 * A text input (onboarding-spec 2.5, "Text input", "Select with floating label"; "App theme": a
 * transparent box with a boundary at 3:1, 2px radius, the accent focus outline). A real `<input>`
 * with its visible `<label>`; the error and the hint are tied by `aria-describedby`.
 *
 * What the owner types is their own input, not a value the API served: it has no value id until it
 * is stored and served back. So the render test reads a typed number in the box as unbound (rule 2):
 * screens take a quantity through this field only where the design asks for one (step 8's inline
 * ask) and render the stored answer through Value once it is saved.
 */
export function TextField({
  label,
  labelPlacement = 'outside',
  icon,
  value,
  onChange,
  maxLength,
  showCounter = false,
  hint,
  error,
  required = false,
  id,
  type = 'text',
  ...native
}: TextFieldProps) {
  const generated = useId();
  const inputId = id ?? `${generated}-input`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint === undefined ? null : hintId, error === undefined ? null : errorId].filter((part): part is string => part !== null);
  if (showCounter && maxLength === undefined) {
    throw new Error('TextField: a character counter needs maxLength.');
  }
  const input = (
    <input
      {...native}
      id={inputId}
      className="sov-input"
      type={type}
      value={value}
      maxLength={maxLength}
      aria-required={required ? 'true' : undefined}
      aria-invalid={error === undefined ? undefined : 'true'}
      aria-describedby={describedBy.length === 0 ? undefined : describedBy.join(' ')}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
  return (
    <div className="sov-field">
      {labelPlacement === 'outside' ? (
        <label className="sov-field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      {hint === undefined ? null : (
        <p className="sov-field__hint" id={hintId}>
          {hint}
        </p>
      )}
      <div className="sov-input-box" data-invalid={error === undefined ? 'false' : 'true'}>
        {icon === undefined ? null : <Icon icon={icon} />}
        {labelPlacement === 'inside' ? (
          <span className="sov-input-box__control">
            <label className="sov-input-box__inner-label" htmlFor={inputId}>
              {label}
            </label>
            {input}
          </span>
        ) : (
          input
        )}
        {showCounter && maxLength !== undefined ? (
          <span className="sov-counter" data-render-allow="character-counter" data-counter-for={inputId}>
            {value.length} / {maxLength}
          </span>
        ) : null}
      </div>
      {error === undefined ? null : <FieldError id={errorId} message={error} />}
    </div>
  );
}
