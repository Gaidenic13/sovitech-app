import { Check, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

export interface SelectionOption {
  /** A stable key (a level's key, a system id, an asset id). */
  readonly id: string;
  /** What the option shows: catalogue copy, or a bound name (`ValueName`: a level's label, a tag). No control inside. */
  readonly content: ReactNode;
}

export interface SelectionListProps {
  /** The list's name ("Floors", "Systems in scope"). */
  readonly label: string;
  readonly options: readonly SelectionOption[];
  /** The chosen option, or null. */
  readonly selected: string | null;
  /** Called when the owner chooses an option (Enter, Space or a click). Choosing changes a view only: it writes nothing. */
  readonly onSelect: (id: string) => void;
}

/**
 * A list-equivalent selection (prompt 3 section 11: "The 3D and 2D views have keyboard camera controls and
 * a list equivalent for everything selectable"; phase 4 exit: "every selectable object has a list
 * equivalent"; section 8: "Every object you can select in the viewer is also reachable from a list"): a
 * single-select listbox for what a view would let the owner pick (a level, a system's group), usable with
 * no view at all, as in this build.
 *
 * The WAI-ARIA listbox pattern: one tab stop; Up and Down move, Home and End go to the ends, and Enter or
 * Space choose; the choice does not follow the focus, because choosing loads a view. The chosen option
 * shows a mint check and a mint edge beside its words, and is announced as selected: never colour alone.
 * Options hold no control (a listbox option's content is presentational).
 */
/** Where a key moves the focus in a list of `count` options, from `index`; null for a key the list does not use. */
function focusTarget(key: string, index: number, count: number): number | null {
  if (key === 'ArrowDown') return index + 1 < count ? index + 1 : index;
  if (key === 'ArrowUp') return index > 0 ? index - 1 : index;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

export function SelectionList({ label, options, selected, onSelect }: SelectionListProps) {
  const base = useId();
  const ids = options.map((option) => option.id);
  const [focusId, setFocusId] = useState<string | null>(selected);
  // The option in the tab order: the one last focused, else the chosen one, else the first.
  const activeId = focusId !== null && ids.includes(focusId) ? focusId : selected !== null && ids.includes(selected) ? selected : ids[0];
  const refs = useRef<Record<string, HTMLLIElement | null>>({});
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current || activeId === undefined) return;
    moved.current = false;
    refs.current[activeId]?.focus();
  }, [activeId]);
  const onKey = (event: KeyboardEvent<HTMLLIElement>, index: number) => {
    const next = focusTarget(event.key, index, options.length);
    if (next !== null) {
      event.preventDefault();
      const id = ids[next];
      if (id === undefined) return;
      moved.current = true;
      setFocusId(id);
      if (id === activeId) refs.current[id]?.focus();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = options[index];
      if (option !== undefined) onSelect(option.id);
    }
  };
  return (
    <ul role="listbox" aria-label={label} className="sov-selection-list">
      {options.map((option, index) => {
        const isSelected = option.id === selected;
        return (
          <li
            key={option.id}
            ref={(element) => {
              refs.current[option.id] = element;
            }}
            id={`${base}-${option.id}`}
            role="option"
            aria-selected={isSelected}
            tabIndex={option.id === activeId ? 0 : -1}
            className="sov-selection-list__option"
            onClick={() => {
              setFocusId(option.id);
              onSelect(option.id);
            }}
            onKeyDown={(event) => onKey(event, index)}
          >
            <span className="sov-selection-list__mark">{isSelected ? <Icon icon={Check} size="small" /> : null}</span>
            <span className="sov-selection-list__content">{option.content}</span>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------
// ActiveFilters: each active filter shown on the page, with its own remove control
// ---------------------------------------------------------------------------------------------

export interface ActiveFilter {
  /** The filter's key (the query parameter: `system`, `level`, `zone`, `badge`, `search`). */
  readonly id: string;
  /** What the filter is (catalogue copy: "Floor", "System"). */
  readonly name: string;
  /** Its value: catalogue copy (a system's name), a bound name (`ValueName`: a level's label, a zone's name), or a badge. */
  readonly value: ReactNode;
}

export interface ActiveFiltersProps {
  /** The list's name ("Active filters"). */
  readonly label: string;
  readonly filters: readonly ActiveFilter[];
  /** Each remove button's name ("Remove this filter"); the filter's own words describe it. */
  readonly removeLabel: string;
  readonly onRemove: (id: string) => void;
  /** "Clear filters", shown with two or more filters. */
  readonly clearLabel?: string;
  readonly onClear?: () => void;
}

/**
 * The active filters of a register (US-DOCS-15 AC4's rule, used by the workspace contract for Equipment:
 * "the active ones, each shown on the page"; dashboards-spec 2.5 rule 4: "Context from a link is a filter
 * chip"): a list of chips, each naming its filter and value, each with a remove button. A filter changes
 * the view only and writes nothing (R-066). Nothing shows when no filter is active.
 */
export function ActiveFilters({ label, filters, removeLabel, onRemove, clearLabel, onClear }: ActiveFiltersProps) {
  const base = useId();
  if (filters.length === 0) return null;
  return (
    <div className="sov-active-filters">
      <ul aria-label={label} className="sov-active-filters__list">
        {filters.map((filter) => {
          const chipId = `${base}-${filter.id}`;
          return (
            <li key={filter.id} className="sov-active-filters__chip">
              <span id={chipId} className="sov-active-filters__text">
                <span className="sov-active-filters__name">{filter.name}</span> <span className="sov-active-filters__value">{filter.value}</span>
              </span>
              <button type="button" className="sov-icon-button" aria-label={removeLabel} aria-describedby={chipId} onClick={() => onRemove(filter.id)}>
                <Icon icon={X} size="small" />
              </button>
            </li>
          );
        })}
      </ul>
      {clearLabel === undefined || onClear === undefined || filters.length < 2 ? null : (
        <Button variant="quiet" onClick={onClear}>
          {clearLabel}
        </Button>
      )}
    </div>
  );
}
