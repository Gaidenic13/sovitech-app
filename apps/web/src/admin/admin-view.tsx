/**
 * What the three admin pages share (phase 7; UD-39 to UD-41; docs/adr/0053; the contract's admin.ts): reading a page's
 * view, its states, and the few ways a served value is drawn here.
 *
 * - **Reading** (`useAdminView`): the page's route, parsed by the contract's schema before anything is shown (rule 2:
 *   the UI receives only resolved field objects); the render marker once the answer is in; the focus taken to the
 *   page's main region when it opens (WCAG 2.4.3).
 * - **"Not for your role"**: a 403 `admin_only` or a 404 `admin_off` reads exactly as a page that does not exist
 *   (`useHideAdminArea`): the admin frame and its navigation give way to the app's not-found page, so nothing of the
 *   area is revealed to a user who may not read it (ADR 0053 decisions 3 and 5).
 * - **States** (`AdminStates`; prompt 3 section 11): loading (one polite line, no figure: R-003) and failed (what could
 *   not be loaded, "Try again"). Each page draws its own empty states.
 * - **Values**: every count, id, date and stored text is a display object the API served, bound to its value id
 *   (rule 2; the render test): `Shown` draws a count or a date through the kit's one value component; `BoundText`
 *   draws an id or a stored name as its served text, isolated (`<bdi>`), in one element bound to its value id, as the
 *   project list draws a project's name. The web formats, counts and names nothing of its own.
 * - **The demo line** (`rowDemoLine`, `ProjectCell`; rule 10; G10-10): on the demo project's rows only, and only the
 *   line the API served for that row (a row's `demoLine`, as the project list's rows carry it). The web never holds
 *   the demo line's words (they are the registry's 2.8 line; ../copy/index.ts), so a demo row whose response carries no
 *   line shows none. The contract's admin rows carry `demoLine` since the phase 7 integrator's reconciliation
 *   (P-7-ADMIN-ROW-DEMO-LINE: the contract refuses a row whose line does not follow its `isDemo` flag).
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { DemoLine, Value } from '@sovitech/ui';
import type { DisplayObject, Line } from '@sovitech/view-model/browser';
import { ApiError } from '../api/client';
import { useLoad, type LoadState } from '../api/use-load';
import { copy } from '../copy';
import { LoadFailed, Loading } from '../pages/PageState';
import { useRenderReady } from '../shell/render-ready';
import { indexDisplays, type Displays } from '../wizard/use-step-view';

const ADM = copy.admin;

// ---------------------------------------------------------------------------------------------
// Hiding the area from a user who may not read it
// ---------------------------------------------------------------------------------------------

/** Set by the admin frame (./AdminLayout.tsx): a page calls it when the API refuses the area (403 `admin_only`, 404 `admin_off`). */
export const AdminAreaContext = createContext<{ readonly hide: () => void }>({ hide: () => undefined });

/** Whether a refusal means the area is not this user's to see: answered as not found, whichever it was. */
export function refusesTheArea(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 403 || error.status === 404);
}

// ---------------------------------------------------------------------------------------------
// Reading a page's view
// ---------------------------------------------------------------------------------------------

interface AdminResponse {
  readonly asOf: string;
  readonly displayObjects: readonly DisplayObject[];
}

export interface AdminLoad<T extends AdminResponse> {
  readonly state: LoadState<T>;
  readonly data: T | undefined;
  readonly displays: Displays;
  readonly reload: () => void;
}

/**
 * Reads an admin page's view (see the header). `load` is the page's typed client call of its own route. A refusal of
 * the area hides it (the not-found page); any other failure is the page's failed state with "Try again".
 */
export function useAdminView<T extends AdminResponse>(load: (signal: AbortSignal) => Promise<T>): AdminLoad<T> {
  const { hide } = useContext(AdminAreaContext);
  const { state, reload } = useLoad<T>(load, []);
  const data = state.status === 'ready' ? state.data : undefined;
  const refused = state.status === 'failed' && refusesTheArea(state.error);
  useEffect(() => {
    if (refused) hide();
  }, [refused, hide]);
  useRenderReady(state.status !== 'loading');
  // A focus the page moves itself (WCAG 2.4.3): the page's main region when it opens, as every workspace page does.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, []);
  const displays = useMemo(() => indexDisplays(data?.displayObjects ?? []), [data]);
  return { state, data, displays, reload: () => void reload() };
}

/** The page's loading and failure states (no figure while loading: R-003; the title stays where it is). A refusal shows nothing here: the frame hides the area. */
export function AdminStates({ load }: { readonly load: Pick<AdminLoad<AdminResponse>, 'state' | 'reload'> }) {
  if (load.state.status === 'loading') {
    return (
      <div className="border-t border-(--sov-border) pt-6" data-admin-state="loading">
        <Loading label={ADM.loading} align="start" />
      </div>
    );
  }
  if (load.state.status === 'failed' && !refusesTheArea(load.state.error)) {
    return (
      <div className="border-t border-(--sov-border)" data-admin-state="failed">
        <LoadFailed message={ADM.loadFailed} onRetry={load.reload} />
      </div>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// The page's frame inside the admin area
// ---------------------------------------------------------------------------------------------

/** An admin page: its title and one sentence on what it shows, then its sections. */
export function AdminPage({ title, subtitle, children }: { readonly title: string; readonly subtitle: string; readonly children: ReactNode }) {
  return (
    <article aria-labelledby="admin-page-title" className="flex min-w-0 flex-col gap-12">
      <header className="flex max-w-[720px] flex-col gap-3">
        <h1 id="admin-page-title" className="text-(length:--sov-title-size) leading-tight font-light tracking-(--sov-title-tracking)">
          {title}
        </h1>
        <p className="text-[17px] font-light text-(--sov-text-tertiary)">{subtitle}</p>
      </header>
      {children}
    </article>
  );
}

/** One section of an admin page: a heading, one sentence on what it holds, and its table or line. */
export function AdminSection({ id, heading, intro, children }: { readonly id: string; readonly heading: string; readonly intro?: string; readonly children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-4" data-admin-section={id}>
      <div className="flex max-w-[720px] flex-col gap-1">
        <h2 id={id} className="sov-heading-section">
          {heading}
        </h2>
        {intro === undefined ? null : <p className="text-[15px] text-(--sov-text-tertiary)">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Served values
// ---------------------------------------------------------------------------------------------

/** A served value (a count, a date, a line) through the kit's one value component, in place: its text, its badge and its lines, bound. */
export function Shown({ displays, valueId }: { readonly displays: Displays; readonly valueId: string }) {
  const display = displays.get(valueId);
  return display === undefined ? null : <Value display={display} layout="bare" />;
}

/** A served count in a column of figures: the same value element, its line set at the column's end edge, under its right-aligned heading. */
export function ShownAtEnd({ displays, valueId }: { readonly displays: Displays; readonly valueId: string }) {
  return (
    <div className="[&_.sov-value\_\_line]:justify-end">
      <Shown displays={displays} valueId={valueId} />
    </div>
  );
}

/**
 * A served id or stored name (a project's or a document's id as text, an account's name as created): its text alone,
 * isolated, in one element bound to its value id. A name holds no badge, source or status line of its own here.
 */
export function BoundText({ displays, valueId, className }: { readonly displays: Displays; readonly valueId: string; readonly className?: string }) {
  const display = displays.get(valueId);
  if (display === undefined) return null;
  return (
    <span data-value-id={display.valueId} className={className}>
      <bdi>{display.text}</bdi>
    </span>
  );
}

/**
 * The line the API served for a row of a project, on the demo project's row only (rule 10; G10-10): never on another
 * project's row, whatever a response holds. A row whose response carries no line shows none: the web holds no words of
 * its own for it (2.8's demo line is the registry's).
 */
export function rowDemoLine(row: { readonly isDemo: boolean; readonly demoLine?: Line | null }): Line | null {
  if (!row.isDemo) return null;
  return row.demoLine ?? null;
}

/**
 * A project's id as served, through the value component (its text and whatever lines the API served with it, bound),
 * with the row's served demo line under it on the demo's row only.
 */
export function ProjectCell({ displays, valueId, row }: { readonly displays: Displays; readonly valueId: string; readonly row: { readonly isDemo: boolean; readonly demoLine?: Line | null } }) {
  const line = rowDemoLine(row);
  return (
    <div className="flex min-w-[168px] flex-col gap-2 [&_.sov-value\_\_text]:[overflow-wrap:anywhere]" data-admin-project="">
      <Shown displays={displays} valueId={valueId} />
      {line === null ? null : <DemoLine line={line} />}
    </div>
  );
}
