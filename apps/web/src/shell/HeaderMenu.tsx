/**
 * The header menu (UD-16; PRD R-144 "Until decided": "The header menu holds only the account item,
 * an entry that opens the project list and sign-out, and no other entry is built"; US-ADMIN-07 AC1;
 * US-ADMIN-01 AC3). No entry opens alarms, a live view or an operations page (R-139), none approves
 * anything, and there is no "back to intake" entry (R-012).
 *
 * A disclosure, not a dialog: a real button with `aria-expanded` opens a panel placed under it;
 * Escape, a click outside and the focus leaving the menu (Tab past its last entry, or anywhere
 * else) close it, so the open panel never covers the element that has the focus (WCAG 2.4.11), and
 * Escape returns focus to the button. The account item
 * shows the signed-in user's name and the roles the roles table records (served by the API; the web
 * adds none).
 */
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { SessionUser } from '@sovitech/view-model/browser';
import { copy } from '../copy';

export interface HeaderMenuProps {
  readonly user: SessionUser;
  readonly onSignOut: () => void;
}

export function roleLabel(role: SessionUser['roles'][number]): string {
  return copy.roles[role];
}

export function HeaderMenu({ user, onSignOut }: HeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const accountId = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && container.current?.contains(event.target) !== true) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const Glyph = open ? X : Menu;
  return (
    <div
      ref={container}
      className="relative"
      onBlur={(event) => {
        // The focus left the menu (its button and its panel): the panel closes. A focus that moves
        // within the menu, or that goes nowhere (a click on the page's background), keeps it open;
        // a click outside closes it through the pointer handler above.
        const next = event.relatedTarget;
        if (open && next instanceof Node && !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((previous) => !previous)}
        className="flex h-10 w-10 items-center justify-center rounded-(--sov-radius-control) text-(--sov-text-primary) transition-colors duration-150 hover:bg-(--sov-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sov-focus-ring)"
      >
        <Glyph size={24} strokeWidth={1.5} aria-hidden="true" focusable="false" />
        <span className="sr-only">{copy.header.menu}</span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute top-full right-0 z-20 mt-2 w-72 rounded-(--sov-radius-surface) border border-(--sov-border) bg-(--sov-surface) py-2"
      >
        <section aria-labelledby={accountId} className="border-b border-(--sov-border) px-4 pt-2 pb-3">
          <h2 id={accountId} className="text-[12px] font-medium text-(--sov-text-muted)">
            {copy.header.account}
          </h2>
          <p className="mt-1 text-[15px] font-semibold text-(--sov-text-primary)">{user.displayName}</p>
          <p className="text-[13px] text-(--sov-text-tertiary)">{user.roles.map(roleLabel).join(', ')}</p>
        </section>
        <ul className="pt-2">
          <li>
            <Link
              to="/projects"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-[15px] text-(--sov-text-primary) transition-colors duration-150 hover:bg-(--sov-surface-selected) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--sov-focus-ring)"
            >
              {copy.header.projects}
            </Link>
          </li>
          <li>
            <button
              type="button"
              data-copy-kind="action-label"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="block w-full px-4 py-2 text-left text-[15px] text-(--sov-text-primary) transition-colors duration-150 hover:bg-(--sov-surface-selected) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--sov-focus-ring)"
            >
              {copy.header.signOut}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
