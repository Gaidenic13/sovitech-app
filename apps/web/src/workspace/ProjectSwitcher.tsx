/**
 * The project switcher in the sidebar (UD-32; PRD R-145; US-ADMIN-06; F-AUTH-05; rule 13 "Project
 * boundary"; G13-9, its rendered half).
 *
 * - The button names the project on screen by the name the owner entered on step 1, as served and
 *   bound (`project:<id>.name`; it may hold digits), never a name read from documents (US-ADMIN-06 AC4).
 * - Opening it reads `GET /api/projects` (the user's own projects only: the store decides, rule 13) and
 *   lists each under its served name, bound, as a link to the same page of that project
 *   (US-ADMIN-06 AC1). The project on screen is marked current. The floor selection and an asset id are
 *   not carried over: they belong to the project left.
 * - Choosing one opens the chosen project; the project's layout is keyed by the project id, so every
 *   state of the previous project is dropped (US-ADMIN-06 AC2). The link passes the chosen row's demo
 *   flag in the router state, as the project list's Open does, so the demo's screens show the demo line
 *   from their first render (US-ADMIN-06 AC3; G10-12's reading). The switcher itself never shows the
 *   demo line: on another project's screen it would label that screen (G10-10).
 * - A disclosure, never a dialog: a button with `aria-expanded` opens the list under it; Escape, a click
 *   outside and the focus leaving close it, and Escape returns the focus to the button. Every entry is a
 *   link reached with Tab; the arrow keys move between them too.
 * - The open list never reaches the status footer's band (DR-4; rule 10 "Labelled everywhere" with 2.8
 *   "Prominence": the demo line is never covered; WCAG 2.2 2.4.11): its height stops a gutter above the
 *   footer's top, measured when it opens and again when the window scrolls or resizes, and a longer list
 *   scrolls inside the panel, keeping the entry that has the focus in view.
 *
 * Undesigned (UD-32), drawn per the frontend-design skill within the brand: the approved selector's
 * slot (screens 15 to 20: "PROJECT" over an outlined field with a chevron), the list as a surface panel
 * under it with hairlines between rows and a mint check on the current project.
 */
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { Button, ValueName } from '@sovitech/ui';
import type { DisplayObject, ProjectListResponse, WorkspacePage } from '@sovitech/view-model/browser';
import { isAbort, isSignedOut, request } from '../api/client';
import { copy } from '../copy';
import { Loading } from '../pages/PageState';
import { useOnSignedOut } from '../session/SessionProvider';
import { indexDisplays } from '../wizard/use-step-view';
import { pagePath } from './navigation';

/** The space the open list keeps above the status footer (the shell's 16px gutter, `--sov-gutter`). */
export const SWITCHER_FOOTER_GAP_PX = 16;

/** The open list's smallest height, so a few entries always show however little room is left. */
export const SWITCHER_MIN_HEIGHT_PX = 120;

/**
 * The open list's greatest height: from its top to a gutter above the status footer's top (or above the
 * window's foot where no footer is drawn), never less than a few entries.
 */
export function switcherMaxHeight(panelTop: number, footerTop: number): number {
  return Math.max(SWITCHER_MIN_HEIGHT_PX, footerTop - SWITCHER_FOOTER_GAP_PX - panelTop);
}

/** The top of the band the open list must not reach: the status footer's top, else the window's foot. */
function footerTopOf(from: HTMLElement): number {
  const footer = from.closest('.sov-workspace')?.querySelector<HTMLElement>('.sov-status-footer') ?? document.querySelector<HTMLElement>('.sov-status-footer');
  return footer?.getBoundingClientRect().top ?? window.innerHeight;
}

type ListState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly list: ProjectListResponse }
  | { readonly status: 'failed' };

export interface ProjectSwitcherProps {
  readonly projectId: string;
  /** The project's name as served (the header's display object), when one has been served. */
  readonly name: DisplayObject | undefined;
  /** The page on screen: the chosen project opens at the same page. */
  readonly page: WorkspacePage;
}

export function ProjectSwitcher({ projectId, name, page }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<ListState>({ status: 'idle' });
  const onSignedOut = useOnSignedOut();
  const labelId = useId();
  const panelId = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);

  // While the list is open, its height stops a gutter above the status footer (DR-4), as the window scrolls or resizes.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const element = panel.current;
      if (element === null) return;
      setMaxHeight(switcherMaxHeight(element.getBoundingClientRect().top, footerTopOf(element)));
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [open]);

  const load = () => {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setList((previous) => (previous.status === 'ready' ? previous : { status: 'loading' }));
    request('projects.list', { signal: next.signal }).then(
      (answer) => {
        if (!next.signal.aborted) setList({ status: 'ready', list: answer });
      },
      (error: unknown) => {
        if (isAbort(error) || next.signal.aborted) return;
        if (isSignedOut(error)) {
          onSignedOut();
          return;
        }
        setList({ status: 'failed' });
      },
    );
  };

  useEffect(() => () => controller.current?.abort(), []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && container.current?.contains(event.target) !== true) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    // Read each time the list opens, so a project created or shared meanwhile is listed.
    load();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const links = [...(container.current?.querySelectorAll<HTMLAnchorElement>('[data-switcher-entry]') ?? [])];
    if (links.length === 0) return;
    event.preventDefault();
    const at = links.findIndex((link) => link === document.activeElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next = at < 0 ? (step === 1 ? 0 : links.length - 1) : (at + step + links.length) % links.length;
    links[next]?.focus();
  };

  return (
    <div
      ref={container}
      className="relative"
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (open && next instanceof Node && !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <p id={labelId} className="mb-2 text-[12px] font-semibold tracking-[0.08em] text-(--sov-text-muted) uppercase">
        {copy.workspace.frame.projectLabel}
      </p>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-describedby={labelId}
        onClick={toggle}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-(--sov-radius-surface) border border-(--sov-secondary-border) px-3 py-2 text-left text-[14px] text-(--sov-text-primary) transition-colors duration-300 hover:border-(--sov-border-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sov-focus-ring)"
      >
        <span className="min-w-0 flex-1 break-words">
          <span className="sr-only">{copy.workspace.frame.switchProject}: </span>
          {name === undefined ? null : <ValueName display={name} showBadge={false} />}
        </span>
        <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" className="shrink-0 text-(--sov-text-tertiary)" />
      </button>
      <div
        ref={panel}
        id={panelId}
        hidden={!open}
        data-switcher-panel=""
        style={maxHeight === undefined ? undefined : { maxHeight: `${maxHeight}px` }}
        className="absolute top-full right-0 left-0 z-20 mt-1 scroll-py-1 overflow-y-auto overscroll-contain rounded-(--sov-radius-surface) border border-(--sov-border) bg-(--sov-surface) py-1"
      >
        {open ? <SwitcherList state={list} projectId={projectId} page={page} onRetry={load} onChoose={() => setOpen(false)} /> : null}
      </div>
    </div>
  );
}

function SwitcherList({
  state,
  projectId,
  page,
  onRetry,
  onChoose,
}: {
  readonly state: ListState;
  readonly projectId: string;
  readonly page: WorkspacePage;
  readonly onRetry: () => void;
  readonly onChoose: () => void;
}) {
  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div className="px-3 py-2">
        <Loading label={copy.app.loading} align="start" />
      </div>
    );
  }
  if (state.status === 'failed') {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 px-3 py-2">
        <p className="text-[13px] text-(--sov-text-primary)">{copy.workspace.frame.projectsLoadFailed}</p>
        <Button variant="link" onClick={onRetry}>
          {copy.app.retry}
        </Button>
      </div>
    );
  }
  const displays = indexDisplays(state.list.displayObjects);
  return (
    <ul aria-label={copy.workspace.frame.switchProject}>
      {state.list.projects.map((project) => {
        const name = displays.get(project.name);
        const current = project.projectId === projectId;
        return (
          <li key={project.projectId} className="border-b border-(--sov-border) last:border-b-0">
            <Link
              data-switcher-entry=""
              to={pagePath(project.projectId, page)}
              state={{ project: { projectId: project.projectId, isDemo: project.isDemo, demoLine: project.demoLine } }}
              aria-current={current ? 'true' : undefined}
              onClick={onChoose}
              className="flex items-start gap-2 px-3 py-2 text-[14px] text-(--sov-text-primary) transition-colors duration-150 hover:bg-(--sov-surface-selected) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--sov-focus-ring)"
            >
              <span className="mt-0.5 w-4 shrink-0">
                {current ? <Check size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" className="text-(--sov-accent)" /> : null}
              </span>
              <span className="min-w-0 flex-1 break-words">
                {name === undefined ? null : <ValueName display={name} showBadge={false} />}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
