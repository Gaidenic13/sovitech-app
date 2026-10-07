/**
 * UD-37, the project list and "New project" (PRD R-136, R-137; US-ADMIN-05, US-ADMIN-15;
 * F-AUTH-05).
 *
 * - Only the projects the user may access (rule 13; US-ADMIN-05 AC1): the API's
 *   `request_user_projects()` decides, never the page.
 * - Each row shows the name the owner entered on step 1, bound to its served value id (it may hold
 *   digits), and under it the stored project type and city as the API serves them (DR-22; each
 *   bound, as the name is), in the order the API serves the rows (newest first); the demo project's
 *   row carries the served demo line and its fictional name (R-136, R-137; US-ADMIN-05 AC2). A row
 *   shows no engineering value or price in phase 3.
 * - Opening a row opens step 1 of its intake (PRD R-009 "Until decided": a project reopened before
 *   Generate opens at step 1 with every stored answer shown). The list's answer about each row's
 *   demo flag is kept for the page session, and Open passes the row in the router state, so the
 *   demo's screens show the demo line while their own requests are pending or failed (rule 10;
 *   US-INTAKE-01 AC8; ../wizard/WizardProvider.tsx `demoLine`).
 * - A name is isolated (`<bdi>`), so a direction control the owner typed reorders nothing around it.
 * - "New project" opens step 1 with no project: nothing is stored until Next sends all four required
 *   fields (G7-6; US-ADMIN-05 AC3).
 * - By role (phase 7; docs/adr/0053 decision 4; ../admin/landing.ts): "New project" shows only to a user holding
 *   `owner` (the store refuses anyone else's owner answers, ADR 0013, so the button would lead nowhere: a product doc
 *   issue against R-136). A user without `owner` reads, under the title, one line for each SOVITECH role they hold,
 *   saying what it does in this build (the engineer queue waits for D-16, PRD R-128 "Until decided"; the commercial
 *   review waits for D-20 and D-16, R-129; the admin area is open to the admin), and an empty list says only that
 *   there is no project. A user holding `sovitech_admin` sees "Open the admin area", owner or not (R-144 "Until
 *   decided" keeps the header menu as it is, so the area is reached from here and by the landing). Draft copy, for
 *   the owner's OK.
 *
 * Undesigned (UD-37): drawn in the wizard's language, per the frontend-design skill within the
 * brand: a left-aligned column at the form steps' width, the page title and "New project" on one
 * line, and the projects as one ruled list (hairlines between rows, not cards), each row a single
 * link with the building icon, the name, the demo line under the demo project's name, and a chevron.
 * The role lines (undesigned, phase 7) sit under the title's intro, in the title's column, each line with the info
 * glyph, the way a quiet notice reads: words only, no badge, rule or colour of their own, so the list keeps its one
 * hairline above it.
 */
import { ArrowRight, Building2, ChevronRight, Info, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { DemoLine, Icon } from '@sovitech/ui';
import type { ProjectListResponse } from '@sovitech/view-model/browser';
import { ADMIN_LANDING, mayCreateProjects, mayReadAdminArea, roleLinesOf, type RoleLineRole } from '../admin/landing';
import { request } from '../api/client';
import { useEffect } from 'react';
import { useLoad } from '../api/use-load';
import { copy } from '../copy';
import { useSession, useSessionUser } from '../session/SessionProvider';
import { AppShell } from '../shell/AppShell';
import { useRenderReady } from '../shell/render-ready';
import { indexDisplays } from '../wizard/use-step-view';
import { LoadFailed, Loading } from './PageState';

function ProjectRows({ list, owner }: { readonly list: ProjectListResponse; readonly owner: boolean }) {
  const displays = indexDisplays(list.displayObjects);
  if (list.projects.length === 0) {
    return (
      <div className="flex flex-col gap-2 border-y border-(--sov-border) py-8">
        <p className="text-[17px] font-semibold">{copy.projects.empty}</p>
        {/* How a project starts is said only to whoever may start one (ADR 0053 decision 4). */}
        {owner ? <p className="text-[15px] text-(--sov-text-tertiary)">{copy.projects.emptyDetail}</p> : null}
      </div>
    );
  }
  return (
    <ul aria-label={copy.projects.listLabel} className="border-t border-(--sov-border)">
      {list.projects.map((project) => {
        const name = displays.get(project.name);
        const facts = [project.projectType, project.city].flatMap((valueId) => {
          const display = valueId === undefined ? undefined : displays.get(valueId);
          return display === undefined ? [] : [display];
        });
        return (
          <li key={project.projectId} className="border-b border-(--sov-border)">
            <Link
              to={`/projects/${project.projectId}/steps/1`}
              state={{ project: { projectId: project.projectId, isDemo: project.isDemo, demoLine: project.demoLine } }}
              className="group flex items-center gap-5 px-2 py-5 transition-colors duration-300 hover:bg-(--sov-surface) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--sov-focus-ring)"
            >
              <Building2 size={24} strokeWidth={1.5} aria-hidden="true" focusable="false" className="shrink-0 text-(--sov-text-tertiary)" />
              <span className="flex flex-1 flex-col gap-1">
                {name === undefined ? null : (
                  <span className="text-[17px] font-semibold text-(--sov-text-primary)" data-value-id={name.valueId}>
                    <bdi>{name.text}</bdi>
                  </span>
                )}
                {facts.length === 0 ? null : (
                  <span className="flex flex-wrap items-center gap-x-2 text-[14px] text-(--sov-text-tertiary)">
                    {facts.map((fact, index) => (
                      <span key={fact.valueId} className="flex items-center gap-x-2">
                        {index === 0 ? null : <span aria-hidden="true">·</span>}
                        <span data-value-id={fact.valueId}>
                          <bdi>{fact.text}</bdi>
                        </span>
                      </span>
                    ))}
                  </span>
                )}
                {project.demoLine === null ? null : <DemoLine line={project.demoLine} />}
              </span>
              <span className="flex items-center gap-1 text-[15px] text-(--sov-text-tertiary) transition-colors duration-150 group-hover:text-(--sov-text-primary)">
                {copy.projects.open}
                <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** What a user without `owner` may do here, one line per SOVITECH role held (draft copy: `projects.roleLines`). */
function RoleLines({ roles, admin }: { readonly roles: readonly RoleLineRole[]; readonly admin: boolean }) {
  if (roles.length === 0) return null;
  return (
    <section aria-label={copy.projects.roleLinesLabel} className="flex flex-col gap-3 pt-3" data-role-lines="">
      {roles.map((role) => (
        <p key={role} className="flex items-start gap-3 text-[15px] text-(--sov-text-primary)" data-role-line={role}>
          <span className="mt-0.5 shrink-0 text-(--sov-text-tertiary)">
            <Icon icon={Info} size="small" />
          </span>
          <span>{copy.projects.roleLines[role]}</span>
        </p>
      ))}
      {admin ? <AdminLink /> : null}
    </section>
  );
}

/** "Open the admin area": a link, as the area is reached by role and never by a menu entry (R-144 "Until decided"). */
function AdminLink() {
  return (
    <Link to={ADMIN_LANDING} className="sov-button self-start" data-variant="link" data-size="default" data-icon="true" data-copy-kind="action-label" data-open-admin="">
      <span>{copy.projects.openAdmin}</span>
      <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" />
    </Link>
  );
}

export function ProjectListPage() {
  const user = useSessionUser();
  const owner = mayCreateProjects(user);
  const admin = mayReadAdminArea(user);
  const roleLines = roleLinesOf(user);
  const loaded = useLoad((signal) => request('projects.list', { signal }), []);
  const { state } = loaded;
  const { rememberProject } = useSession();
  useRenderReady(state.status !== 'loading');

  // What the list says about each project's demo flag stays known for the page session.
  const listed = state.status === 'ready' ? state.data : undefined;
  useEffect(() => {
    for (const project of listed?.projects ?? []) rememberProject(project.projectId, { isDemo: project.isDemo, demoLine: project.demoLine });
  }, [listed, rememberProject]);

  return (
    <AppShell>
      <section aria-labelledby="projects-title" className="mx-auto flex max-w-[900px] flex-col gap-10 px-6 pt-16 pb-16">
        <header className="flex items-end justify-between gap-6">
          <div className="flex flex-col gap-3">
            <h1 id="projects-title" className="text-(length:--sov-title-size) leading-tight font-light tracking-(--sov-title-tracking)">
              {copy.projects.title}
            </h1>
            <p className="text-[17px] font-light text-(--sov-text-tertiary)">{owner ? copy.projects.intro : copy.projects.introWithoutOwner}</p>
            <RoleLines roles={roleLines} admin={admin} />
          </div>
          {owner ? (
            <div className="flex shrink-0 items-center gap-6">
              {admin ? <AdminLink /> : null}
              <Link
                to="/projects/new"
                data-copy-kind="action-label"
                className="flex h-(--sov-button-height) shrink-0 items-center gap-3 rounded-(--sov-radius-control) bg-(--sov-primary-fill) px-6 text-[15px] font-medium text-(--sov-primary-label) transition-colors duration-300 hover:bg-(--sov-primary-fill-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sov-focus-ring)"
              >
                <Plus size={20} strokeWidth={1.5} aria-hidden="true" focusable="false" />
                {copy.projects.newProject}
              </Link>
            </div>
          ) : null}
        </header>
        {state.status === 'loading' ? (
          <div className="flex min-h-[240px] flex-col gap-4 border-t border-(--sov-border) pt-5">
            <Loading label={copy.step8.loading} align="start" />
          </div>
        ) : null}
        {state.status === 'failed' ? <LoadFailed onRetry={() => void loaded.reload()} /> : null}
        {state.status === 'ready' ? <ProjectRows list={state.data} owner={owner} /> : null}
      </section>
    </AppShell>
  );
}
