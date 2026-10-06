import { Search } from 'lucide-react';
import { useId } from 'react';
import { Icon } from './Icon';

export interface SearchFieldProps {
  /** The field's name for assistive technology ("Search reports"), from the catalogue; shown to screen readers only. */
  readonly label: string;
  /** The hint inside the empty box ("Search reports..."), from the catalogue. */
  readonly placeholder: string;
  readonly value: string;
  /** Called with the text as typed; the page decides when to send it. */
  readonly onChange: (value: string) => void;
  /** The longest text the box takes (default 80, the contract's search limit). */
  readonly maxLength?: number;
  readonly id?: string;
}

/**
 * The one search box of the workspace's registers (phase 4's design review, DR-5: "one kit search field with one
 * width"; dashboards-spec 3.5, the register toolbars of 15, 17, 18 and 20). A real `input type="search"` with its
 * label for screen readers, a decorative search icon, a 2px surface boundary in the control-border colour (3:1,
 * WCAG 1.4.11) and the accent focus outline on the whole box. One width for every page (320px, never wider than its
 * column). It searches nothing itself and writes nothing: the page reads the text into its view query.
 */
export function SearchField({ label, placeholder, value, onChange, maxLength = 80, id }: SearchFieldProps) {
  const own = useId();
  const inputId = id ?? own;
  return (
    <div className="sov-search">
      <Icon icon={Search} size="small" />
      <label htmlFor={inputId} className="sov-visually-hidden">
        {label}
      </label>
      <input
        id={inputId}
        className="sov-search__input"
        type="search"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </div>
  );
}
