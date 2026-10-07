/**
 * UD-39: accounts, roles, projects and processors, read-only (PRD R-134; R-143 and R-154 "Until decided"; US-ADMIN-03,
 * US-ADMIN-16 AC1, US-ADMIN-17 AC1 and AC2; the contract's `admin.accounts`; docs/adr/0053 decision 7).
 *
 * - **Accounts**: each account by its name as created (bound), marked as a development account where it is one of the
 *   development login's synthetic accounts (ADR 0038), its kind, and each role it holds now with the day of the grant
 *   that holds (bound).
 * - **Role changes**: every grant and revoke, newest first, as the API serves them: the account, the role, granted or
 *   revoked, who did it (an account's name or the operator's login, bound), when, and the reason as recorded (bound).
 *   Each is an audited event (ADR 0013 decision 2).
 * - **Projects**: each project by its id only (a project's name is its owner's step 1 answer: rule 13), the day it was
 *   created and its members by name; the demo project's row carries its served demo line, no other row does (G10-10).
 * - **Processors** (R-143 "Until decided", D-09): "No processor is chosen. No owner document or excerpt is sent to any
 *   external service." No list, no control.
 *
 * No control creates an account, grants or revokes a role, adds a member, or adds, removes or changes a processor
 * (R-154 "Until decided": "No page creates accounts or grants roles"; R-143). Every name, id and date is a display
 * object, bound (rule 2); the page formats nothing.
 *
 * Undesigned (no approved screen): the area's grammar (./admin-view.tsx): the page title and one sentence, then one
 * section per question the admin asks, each a heading, a sentence and a ruled table with headers (the kit's register
 * table, with no control in any row).
 */
import { RegisterTable, type RegisterColumn } from '@sovitech/ui';
import type { AdminAccount, AdminAccountsResponse, AdminProject, AdminRoleEvent } from '@sovitech/view-model/browser';
import { request } from '../api/client';
import { copy } from '../copy';
import { roleLabel } from '../shell/HeaderMenu';
import type { Displays } from '../wizard/use-step-view';
import { AdminPage, AdminSection, AdminStates, BoundText, ProjectCell, Shown, useAdminView } from './admin-view';

const ACC = copy.admin.accounts;

/** An account's served name, by its id: the one display the accounts list serves for it. */
function accountNameId(userId: string): string {
  return `account:${userId}.displayName`;
}

function AccountName({ displays, userId }: { readonly displays: Displays; readonly userId: string }) {
  return <BoundText displays={displays} valueId={accountNameId(userId)} />;
}

function AccountsTable({ data, displays }: { readonly data: AdminAccountsResponse; readonly displays: Displays }) {
  const columns: RegisterColumn<AdminAccount>[] = [
    {
      kind: 'content',
      id: 'account',
      header: ACC.account,
      rowHeader: true,
      cell: (account) => (
        <span className="flex min-w-[200px] flex-col gap-1">
          <BoundText displays={displays} valueId={account.name} className="text-[14px] font-medium text-(--sov-text-primary)" />
          {account.development ? <span className="text-[13px] font-normal text-(--sov-text-tertiary)">{ACC.development}</span> : null}
        </span>
      ),
    },
    { kind: 'content', id: 'kind', header: ACC.kindColumn, cell: (account) => <span className="whitespace-nowrap">{ACC.kind[account.kind]}</span> },
    {
      kind: 'content',
      id: 'roles',
      header: ACC.roles,
      cell: (account) =>
        account.roles.length === 0 ? (
          <span className="text-(--sov-text-tertiary)">{ACC.rolesNone}</span>
        ) : (
          <ul className="flex flex-col gap-3">
            {account.roles.map((held) => (
              <li key={held.role} className="flex flex-col gap-0.5" data-role={held.role}>
                <span>{roleLabel(held.role)}</span>
                <div className="flex flex-wrap items-baseline gap-x-1.5 text-[13px] text-(--sov-text-tertiary) [&_.sov-value\_\_text]:text-[13px] [&_.sov-value\_\_text]:text-(--sov-text-tertiary)">
                  <span>{ACC.granted}</span>
                  <Shown displays={displays} valueId={held.since} />
                </div>
              </li>
            ))}
          </ul>
        ),
    },
  ];
  return (
    <RegisterTable
      label={ACC.accounts}
      columns={columns}
      rows={data.view.accounts}
      rowKey={(account) => account.userId}
      empty={<p>{ACC.accountsNone}</p>}
    />
  );
}

function RoleEventsTable({ data, displays }: { readonly data: AdminAccountsResponse; readonly displays: Displays }) {
  const columns: RegisterColumn<AdminRoleEvent>[] = [
    { kind: 'content', id: 'account', header: ACC.account, rowHeader: true, cell: (event) => <span className="block min-w-[160px] font-normal"><AccountName displays={displays} userId={event.userId} /></span> },
    { kind: 'content', id: 'role', header: ACC.role, cell: (event) => <span className="whitespace-nowrap">{roleLabel(event.role)}</span> },
    { kind: 'content', id: 'change', header: ACC.change, cell: (event) => <span className="whitespace-nowrap">{event.change === 'granted' ? ACC.granted : ACC.revoked}</span> },
    { kind: 'content', id: 'by', header: ACC.by, cell: (event) => <BoundText displays={displays} valueId={event.by} /> },
    { kind: 'content', id: 'at', header: ACC.at, cell: (event) => <div className="whitespace-nowrap"><Shown displays={displays} valueId={event.at} /></div> },
    { kind: 'content', id: 'reason', header: ACC.reason, cell: (event) => <span className="block min-w-[200px] text-(--sov-text-tertiary)"><BoundText displays={displays} valueId={event.reason} /></span> },
  ];
  return (
    <RegisterTable
      label={ACC.roleEvents}
      columns={columns}
      rows={data.view.roleEvents}
      rowKey={(event) => event.eventId}
      empty={<p>{ACC.roleEventsNone}</p>}
    />
  );
}

function ProjectsTable({ data, displays }: { readonly data: AdminAccountsResponse; readonly displays: Displays }) {
  const columns: RegisterColumn<AdminProject>[] = [
    { kind: 'content', id: 'project', header: ACC.project, rowHeader: true, cell: (project) => <ProjectCell displays={displays} valueId={project.id} row={project} /> },
    { kind: 'content', id: 'created', header: ACC.created, cell: (project) => <div className="whitespace-nowrap"><Shown displays={displays} valueId={project.createdOn} /></div> },
    {
      kind: 'content',
      id: 'members',
      header: ACC.members,
      cell: (project) =>
        project.members.length === 0 ? (
          <span className="text-(--sov-text-tertiary)">{ACC.membersNone}</span>
        ) : (
          <ul className="flex flex-col gap-1">
            {project.members.map((userId) => (
              <li key={userId}>
                <AccountName displays={displays} userId={userId} />
              </li>
            ))}
          </ul>
        ),
    },
  ];
  return (
    <RegisterTable
      label={ACC.projects}
      columns={columns}
      rows={data.view.projects}
      rowKey={(project) => project.projectId}
      empty={<p>{ACC.projectsNone}</p>}
    />
  );
}

export function AccountsPage() {
  const load = useAdminView((signal) => request('admin.accounts', { signal }));
  const { data, displays } = load;
  return (
    <AdminPage title={copy.titles.adminAccounts} subtitle={ACC.subtitle}>
      <AdminStates load={load} />
      {data === undefined ? null : (
        <>
          <AdminSection id="admin-accounts" heading={ACC.accounts} intro={ACC.accountsIntro}>
            <AccountsTable data={data} displays={displays} />
          </AdminSection>
          <AdminSection id="admin-role-events" heading={ACC.roleEvents} intro={ACC.roleEventsIntro}>
            <RoleEventsTable data={data} displays={displays} />
          </AdminSection>
          <AdminSection id="admin-projects" heading={ACC.projects} intro={ACC.projectsIntro}>
            <ProjectsTable data={data} displays={displays} />
          </AdminSection>
          <AdminSection id="admin-processors" heading={ACC.processors}>
            {data.view.processors.state === 'none_chosen' ? (
              <p className="max-w-[720px] border-y border-(--sov-border) py-5 text-[15px] text-(--sov-text-primary)" data-processors="none_chosen">
                {ACC.processorsNone}
              </p>
            ) : null}
          </AdminSection>
        </>
      )}
    </AdminPage>
  );
}
