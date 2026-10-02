/**
 * The workspace's controls (phase 4; docs/adr/0043-workspace-navigation-and-shell.md): a switch,
 * underline tabs, a menu button, an inline panel (for confirmations and the upload and revision forms), a
 * pager with previous and next only, a single-select chip group and the right inspector.
 *
 * The planner's skeleton gave their markup and props; the kit builder styled them in ui.css (Brand values
 * only, ADR 0040: radii 1px and 2px, no pill and no shadow; mint the one accent) and added props, never
 * changing or removing one. Their component tests are workspace.test.tsx; their harness page is
 * tests/e2e/pages/ui/workspace-controls.html (render test and axe).
 *
 * Rules every one keeps (prompt 3 sections 7 and 11; guardrails rule 7 and 2.8):
 * - real inputs and buttons, reachable by Tab, with keyboard paths (arrow keys in tabs, the chip group and
 *   the menu; Escape closes the menu and the inline panel);
 * - none is a dialog: no `dialog` or `alertdialog` role, no focus trap, nothing blocks the page (rule 7;
 *   the e2e "no dialog on any screen" check);
 * - no `disabled` state: a control that is working says so with `aria-busy` (one request per press is the
 *   caller's `useInFlight`);
 * - labels are fixed copy from the app's catalogue, never a number (the render test): a value with digits is
 *   rendered by the Value component inside the panel, never as a label here.
 */
import { ChevronLeft, ChevronRight, Ellipsis, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from './Icon';

// ---------------------------------------------------------------------------------------------
// Switch: a real checkbox with role switch (System Scope's In Scope)
// ---------------------------------------------------------------------------------------------

export interface SwitchProps {
  readonly checked: boolean;
  /** Called with the new state; the caller sends one request per press. */
  readonly onChange: (checked: boolean) => void;
  /** The accessible name (catalogue copy, "Include {system} in the scope"). */
  readonly label: string;
  /** While the caller's write is on its way (`aria-busy`); the switch stays operable (never disabled). */
  readonly busy?: boolean;
  readonly describedBy?: string;
  /** The input's id, for a visible label elsewhere (`<label htmlFor>`). */
  readonly id?: string;
}

/**
 * A switch: a native checkbox with `role="switch"`, so Space toggles it and the browser announces on or
 * off from its own checked state (no `aria-checked` beside it: ARIA in HTML). Drawn as a square-cornered
 * track (1px, the control radius) with a square knob that moves to the end and turns the track mint when
 * on: the state reads from the knob's place and from the announced state, never from colour alone.
 * While `busy`, a press is still taken by the input, so the caller ignores it (its `useInFlight`).
 */
export function Switch({ checked, onChange, label, busy = false, describedBy, id }: SwitchProps) {
  return (
    <span className="sov-switch" data-checked={checked ? 'true' : 'false'}>
      <input
        id={id}
        className="sov-switch__input"
        type="checkbox"
        role="switch"
        checked={checked}
        aria-label={label}
        aria-busy={busy ? 'true' : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className="sov-switch__track" aria-hidden="true">
        <span className="sov-switch__knob" />
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------------------------
// Tabs: underline tabs with a tablist (inspectors, System Scope's detail panel)
// ---------------------------------------------------------------------------------------------

export interface TabItem {
  readonly id: string;
  /** Fixed copy; no count (a count would be an unbound number). */
  readonly label: string;
  readonly panel: ReactNode;
}

export interface TabsProps {
  readonly label: string;
  readonly tabs: readonly TabItem[];
  /** The tab shown first. */
  readonly initial?: string;
  /** Controlled: the tab shown (with `onChange`). A tab that is not in `tabs` shows the first. */
  readonly selected?: string;
  /** Called with the tab the owner chose (click, arrow keys, Home, End). */
  readonly onChange?: (id: string) => void;
}

/**
 * Underline tabs (dashboards-spec 3.5 "Tabs": "underline tabs and the segmented control"; the App theme's
 * accent for the active underline): the WAI-ARIA tabs pattern with automatic activation. One tab stop;
 * Left and Right move between tabs, Home and End go to the ends. A tab whose id has gone (the inspector
 * now shows another row) falls back to the first, so a panel is always shown.
 */
export function Tabs({ label, tabs, initial, selected, onChange }: TabsProps) {
  const base = useId();
  const [own, setOwn] = useState(initial ?? tabs[0]?.id ?? '');
  const wanted = selected ?? own;
  const current = tabs.some((tab) => tab.id === wanted) ? wanted : (tabs[0]?.id ?? '');
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const choose = (id: string) => {
    setOwn(id);
    onChange?.(id);
  };
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0 && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + step + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    if (next === undefined) return;
    choose(next.id);
    refs.current[next.id]?.focus();
  };
  return (
    <div className="sov-tabs">
      <div role="tablist" aria-label={label} className="sov-tabs__list">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[tab.id] = element;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${tab.id}`}
            aria-selected={tab.id === current}
            aria-controls={`${base}-panel-${tab.id}`}
            tabIndex={tab.id === current ? 0 : -1}
            className="sov-tabs__tab"
            onClick={() => choose(tab.id)}
            onKeyDown={(event) => move(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={tab.id !== current}
          tabIndex={0}
          className="sov-tabs__panel"
        >
          {tab.id === current ? tab.panel : null}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// MenuButton: a "•••" button that opens a list of actions (UD-22), never a dialog
// ---------------------------------------------------------------------------------------------

export interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly onSelect: () => void;
}

export interface MenuButtonProps {
  /** The button's accessible name ("More actions"). */
  readonly label: string;
  readonly items: readonly MenuItem[];
  /** Opens with the menu showing (the kit's harness pages and tests); focus stays where it is. */
  readonly defaultOpen?: boolean;
  /** Describes the button (the row it acts on: the id of its file name's element). */
  readonly describedBy?: string;
}

/**
 * The menu button pattern: a real button (`aria-haspopup="menu"`, `aria-expanded`) whose menu opens
 * under it, placed so it never covers the button (WCAG 2.4.11). Enter, Space, Down or Up open it and
 * focus its first (or last) item; Up and Down move, Home and End go to the ends; Escape closes it and
 * returns focus to the button; Tab, a click outside or the focus leaving close it. Choosing an item
 * closes the menu first, so an action that opens an inline panel takes the focus.
 */
export function MenuButton({ label, items, defaultOpen = false, describedBy }: MenuButtonProps) {
  const base = useId();
  const [open, setOpen] = useState(defaultOpen);
  const focusOnOpen = useRef<'first' | 'last' | null>(null);
  const container = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!open || focusOnOpen.current === null) return;
    const target = focusOnOpen.current === 'first' ? itemRefs.current[0] : itemRefs.current[items.length - 1];
    focusOnOpen.current = null;
    target?.focus();
  }, [open, items.length]);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && container.current?.contains(event.target) !== true) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);
  const openAt = (where: 'first' | 'last') => {
    focusOnOpen.current = where;
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };
  const onButtonKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openAt(event.key === 'ArrowDown' ? 'first' : 'last');
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  };
  const onItemKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    const last = items.length - 1;
    const next =
      event.key === 'ArrowDown' ? (index + 1) % items.length : event.key === 'ArrowUp' ? (index - 1 + items.length) % items.length : event.key === 'Home' ? 0 : event.key === 'End' ? last : null;
    if (next === null) return;
    event.preventDefault();
    itemRefs.current[next]?.focus();
  };
  return (
    <div
      ref={container}
      className="sov-menu"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (open && next instanceof Node && !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="sov-menu__button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${base}-menu` : undefined}
        aria-describedby={describedBy}
        onKeyDown={onButtonKey}
        onClick={() => {
          if (open) setOpen(false);
          else openAt('first');
        }}
      >
        <Icon icon={Ellipsis} size="small" />
      </button>
      {open ? (
        <div role="menu" id={`${base}-menu`} aria-label={label} className="sov-menu__list">
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="sov-menu__item"
              data-copy-kind="action-label"
              onKeyDown={(event) => onItemKey(event, index)}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// InlinePanel: a region inside the page (Delete's confirmation, UD-42; the upload surface, UD-21;
// the revision declaration, UD-43; the zone editor, UD-09). Never a dialog.
// ---------------------------------------------------------------------------------------------

export interface InlinePanelProps {
  /** The panel's heading (catalogue copy). */
  readonly heading: string;
  /** Escape and the caller's Cancel close it; focus then returns where the caller puts it. */
  readonly onClose: () => void;
  readonly children: ReactNode;
  /** The heading's level where the panel sits in a titled section (default 2). */
  readonly headingLevel?: 2 | 3;
  /** A visible close button with this accessible name ("Close the upload panel"); without it, the panel's own Cancel closes it. */
  readonly closeLabel?: string;
}

/**
 * A region inside the page, never a dialog (rule 7, "never blocks"; traceability 10.2 item 15): it takes
 * the focus when it opens, so a keyboard or screen reader user lands on it, but it traps nothing: Tab
 * leaves it, the page behind stays usable, and Escape closes it.
 */
export function InlinePanel({ heading, onClose, children, headingLevel = 2, closeLabel }: InlinePanelProps) {
  const headingId = useId();
  const ref = useRef<HTMLElement | null>(null);
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby={headingId}
      className="sov-inline-panel"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="sov-inline-panel__header">
        <Heading id={headingId} className="sov-heading-group">
          {heading}
        </Heading>
        {closeLabel === undefined ? null : (
          <button type="button" className="sov-icon-button" aria-label={closeLabel} onClick={onClose}>
            <Icon icon={X} size="small" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Pager: previous and next only, no page numbers (PRD R-017 "Until decided"; proposal 7.2.30)
// ---------------------------------------------------------------------------------------------

export interface PagerProps {
  readonly label: string;
  readonly previousLabel: string;
  readonly nextLabel: string;
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  /** A page is being fetched (`aria-busy` on the buttons; a press while busy is the caller's to ignore). */
  readonly busy?: boolean;
}

/** A control with nowhere to go is not drawn (no disabled control); the pager is absent when neither is. */
export function Pager({ label, previousLabel, nextLabel, hasPrevious, hasNext, onPrevious, onNext, busy = false }: PagerProps) {
  if (!hasPrevious && !hasNext) return null;
  return (
    <nav aria-label={label} className="sov-pager">
      {hasPrevious ? (
        <button type="button" className="sov-pager__button" data-direction="previous" aria-busy={busy} onClick={onPrevious} data-copy-kind="action-label">
          <Icon icon={ChevronLeft} size="small" />
          <span>{previousLabel}</span>
        </button>
      ) : null}
      {hasNext ? (
        <button type="button" className="sov-pager__button" data-direction="next" aria-busy={busy} onClick={onNext} data-copy-kind="action-label">
          <span>{nextLabel}</span>
          <Icon icon={ChevronRight} size="small" />
        </button>
      ) : null}
    </nav>
  );
}

// ---------------------------------------------------------------------------------------------
// ChipGroup: single-select chips as real radios (Documents' category chips), no counts (R-017)
// ---------------------------------------------------------------------------------------------

export interface ChipOption {
  readonly value: string;
  readonly label: string;
}

export interface ChipGroupProps {
  readonly label: string;
  readonly name: string;
  readonly options: readonly ChipOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
}

/**
 * Single-select chips: a fieldset of native radios, so one Tab stop reaches the group and arrow keys move
 * the choice (the browser's radio group). The radio is hidden visually but stays focusable; the chip
 * shows the focus outline and the checked state as a mint border on a mint 8% fill, with the label
 * weight changing too, so the state never rests on colour alone. No count on a chip (R-017).
 */
export function ChipGroup({ label, name, options, value, onChange }: ChipGroupProps) {
  return (
    <fieldset className="sov-chips">
      <legend className="sov-visually-hidden">{label}</legend>
      {options.map((option) => (
        <label key={option.value} className="sov-chips__chip" data-checked={option.value === value ? 'true' : 'false'}>
          <input
            className="sov-chips__input"
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

// ---------------------------------------------------------------------------------------------
// Inspector: the right panel (360px; dashboards-spec 3.4 "Proposed shell") with its heading and close
// ---------------------------------------------------------------------------------------------

export interface InspectorProps {
  /** The heading: catalogue copy, or a bound name rendered by the caller (`ValueName`: a file name, a tag). */
  readonly heading: ReactNode;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  /** A line under the heading: the selected item's bound name under a catalogue heading ("Equipment details", then the tag). */
  readonly subheading?: ReactNode;
  /** The panel's actions at its foot (Download, the menu). */
  readonly footer?: ReactNode;
  /** The panel's id, for the rows' `aria-controls`. */
  readonly id?: string;
}

/**
 * The right inspector (dashboards-spec 3.4 "Right inspector": 360px; the body in order: tabs, key/value
 * lists, then actions). A named region beside the register, not a dialog and not a complementary
 * landmark inside the page's main: it opens and closes with the selection, and the register stays usable.
 * No media slot: no photo, preview, minimap or model (R-017's reading; proposals 7.2.9 and
 * P-4-DOCUMENT-PREVIEW; R-080).
 */
export function Inspector({ heading, closeLabel, onClose, children, subheading, footer, id }: InspectorProps) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className="sov-inspector">
      <header className="sov-inspector__header">
        <div className="sov-inspector__titles">
          <h2 id={headingId} className="sov-heading-group">
            {heading}
          </h2>
          {subheading === undefined ? null : <p className="sov-inspector__subheading">{subheading}</p>}
        </div>
        <button type="button" className="sov-icon-button sov-inspector__close" aria-label={closeLabel} onClick={onClose}>
          <Icon icon={X} size="small" />
        </button>
      </header>
      <div className="sov-inspector__body">{children}</div>
      {footer === undefined ? null : <div className="sov-inspector__footer">{footer}</div>}
    </section>
  );
}
