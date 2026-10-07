/**
 * The development-only admin area's frame (phase 7; UD-39 to UD-41; docs/adr/0053): the app's shell with the header
 * menu (UD-16, as R-144 "Until decided" keeps it), the area's navigation between its three pages, the area's one
 * statement of what it is, and the page. No project is open here, so the header names none and no page of this area is
 * a project's screen; the demo project's rows carry its served demo line on their own row (G10-10 for every other row).
 *
 * **Who sees it** (ADR 0053 decisions 3 to 5). A user who does not hold `sovitech_admin` sees the app's not-found page
 * and nothing of the area: no navigation, no title, no request (a page the address names is not the user's to see,
 * and saying more would reveal it). A page whose request the API refuses (403 `admin_only`, 404 `admin_off`) hides the
 * area the same way (./admin-view.tsx `AdminAreaContext`). The roles the session holds decide only what is drawn; the
 * API and the store decide what is read.
 *
 * **Nothing here writes.** The frame and its pages hold links and tables only: no control creates, grants, approves,
 * changes or imports anything (prompt 3 5.4; guardrails section 10, "Metrics prompt a review, never an edit").
 *
 * Undesigned (no approved screen): drawn per the `frontend-design` project skill within the brand, in the workspace's
 * grammar: a 208px column with the area's links as the project sidebar draws its pages (the kit's SideNav: a 2px mint
 * bar, a mint 8% fill and weight 600 on the current page), and under them, once for the whole area, the statement that
 * it is development only and read-only, with a lock; the page column beside it, left-aligned.
 */
import { Database, Lock, ShieldAlert, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Icon, SideNav, type SideNavItem } from '@sovitech/ui';
import { copy } from '../copy';
import { NotFoundPage } from '../pages/NotFoundPage';
import { useSessionUser } from '../session/SessionProvider';
import { AppShell } from '../shell/AppShell';
import { AdminAreaContext } from './admin-view';
import { mayReadAdminArea } from './landing';

const LINKS = [
  { id: 'accounts', href: '/admin/accounts', label: copy.admin.nav.accounts, icon: Users },
  { id: 'datasets', href: '/admin/datasets', label: copy.admin.nav.datasets, icon: Database },
  { id: 'guardrail_events', href: '/admin/guardrail-events', label: copy.admin.nav.guardrailEvents, icon: ShieldAlert },
] as const;

export function AdminLayout() {
  const user = useSessionUser();
  const location = useLocation();
  const navigate = useNavigate();
  // A refusal belongs to the page that met it: another page of the area asks again.
  const [refusedAt, setRefusedAt] = useState<string | null>(null);
  const path = location.pathname;
  const hide = useCallback(() => setRefusedAt(path), [path]);
  const area = useMemo(() => ({ hide }), [hide]);

  const hidden = !mayReadAdminArea(user) || refusedAt === path;
  // The title says what the screen says (WCAG 2.4.2): a refused page is "Page not found" too. For a user without the
  // role the route's own title already says so (../routes.tsx `adminPage`); a refusal met later is set here.
  useEffect(() => {
    if (refusedAt === path) document.title = copy.titles.page.replace('{page}', copy.titles.notFound);
  }, [refusedAt, path]);

  if (hidden) return <NotFoundPage />;

  const items: SideNavItem[] = LINKS.map((link) => ({ id: link.id, label: link.label, href: link.href, icon: link.icon, current: path === link.href }));
  return (
    <AppShell>
      <div className="flex w-full gap-10 px-8 pt-10 pb-16">
        <div className="flex w-[208px] shrink-0 flex-col gap-8">
          <SideNav
            label={copy.admin.nav.label}
            items={items}
            onNavigate={(item, event) => {
              event.preventDefault();
              void navigate(item.href);
            }}
          />
          <p className="flex items-start gap-2 border-t border-(--sov-border) pt-6 text-[13px] leading-5 text-(--sov-text-tertiary)" data-admin-statement="">
            <span className="mt-0.5 shrink-0">
              <Icon icon={Lock} size="small" />
            </span>
            <span>{copy.admin.intro}</span>
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <AdminAreaContext.Provider value={area}>
            <Outlet />
          </AdminAreaContext.Provider>
        </div>
      </div>
    </AppShell>
  );
}
