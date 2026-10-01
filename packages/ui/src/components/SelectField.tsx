import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { FieldError } from './FieldError';
import { Icon, type IconComponent } from './Icon';

export interface SelectOption {
  /** The stored key (an ISO 3166-1 code for the country). */
  readonly value: string;
  /** What the owner reads (the country's name in the browser's locale, `Intl.DisplayNames`). */
  readonly label: string;
}

export interface SelectFieldProps {
  /** The label, fixed copy ("Country"). */
  readonly label: string;
  /** `inside` (the design's floating label) by default; `outside` above the box. */
  readonly labelPlacement?: 'outside' | 'inside';
  readonly icon?: IconComponent;
  readonly options: readonly SelectOption[];
  /** The chosen value, or "" for none. Nothing is preselected (rule 3). */
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** The first, empty option's label ("Choose a country"). */
  readonly placeholder: string;
  readonly error?: string;
  /** `aria-required` only, never the native attribute (see TextField). */
  readonly required?: boolean;
  readonly name?: string;
  readonly id?: string;
}

/**
 * A select (onboarding-spec 2.5, "Select with floating label"; guardrails section 5, step 1: country
 * first). A native `<select>`: keyboard, type-ahead and screen readers work as the platform makes
 * them, its list takes the dark colour scheme, and its first option is an empty choice so nothing is
 * preselected. Option labels are names, never numbers.
 *
 * The city is not a select in this build: no city list with stable ids is approved (D-94), so the
 * city is a TextField, stored as typed (prompt 3 5.2, "City").
 */
export function SelectField({
  label,
  labelPlacement = 'inside',
  icon,
  options,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  name,
  id,
}: SelectFieldProps) {
  const generated = useId();
  const selectId = id ?? `${generated}-select`;
  const errorId = `${selectId}-error`;
  const select = (
    <select
      id={selectId}
      name={name}
      className="sov-select"
      value={value}
      aria-required={required ? 'true' : undefined}
      aria-invalid={error === undefined ? undefined : 'true'}
      aria-describedby={error === undefined ? undefined : errorId}
      onChange={(event) => onChange(event.currentTarget.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
  return (
    <div className="sov-field">
      {labelPlacement === 'outside' ? (
        <label className="sov-field__label" htmlFor={selectId}>
          {label}
        </label>
      ) : null}
      <div className="sov-input-box" data-invalid={error === undefined ? 'false' : 'true'}>
        {icon === undefined ? null : <Icon icon={icon} />}
        {labelPlacement === 'inside' ? (
          <span className="sov-input-box__control">
            <label className="sov-input-box__inner-label" htmlFor={selectId}>
              {label}
            </label>
            {select}
          </span>
        ) : (
          select
        )}
        <span className="sov-input-box__chevron">
          <Icon icon={ChevronDown} />
        </span>
      </div>
      {error === undefined ? null : <FieldError id={errorId} message={error} />}
    </div>
  );
}
