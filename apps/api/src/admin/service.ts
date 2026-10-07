/**
 * The phase 7 services: the development-only admin area (docs/adr/0053-phase-7-scope-and-the-admin-area.md; the
 * contract: packages/view-model/src/browser/contract/admin.ts; the build log, phase 7, "Plan").
 *
 * - **The role check first**: the session's user is a person holding `sovitech_admin` now, read from the roles table in
 *   the user's own request (`sessionUserOf`, never from the request), else 403 `admin_only`. A user who also holds
 *   another role is still an admin here; an engineer or a commercial reviewer without the admin role is refused. Holding
 *   it never permits verification (G10-3: the guarded function asks for sovitech_engineer only).
 * - **Reads only**, through the store's admin definer functions (`@sovitech/db`'s admin reads, migration 0018), each in
 *   the admin's own request with no project in scope; the store checks the role again (SVR06). Ids, codes, counts and
 *   times; never a candidate's value, evidence, excerpt, extracted text, file name or a project's name (rule 13; ADR
 *   0013 decision 5; G13-16).
 * - **The views** from the view-model's admin builders (`@sovitech/view-model/server`): every count, id, date and stored
 *   text a display object, every "not counted yet" and "Target not set" (D-34's interim) and every "No approval record"
 *   (R-150 "Until decided") a served line, nothing estimated and no zero standing in for a count that was not made
 *   (rule 1).
 * - **Datasets** (./datasets.ts): each dataset a gate waits for, read through `readGate` on the API's own gate source,
 *   and each dataset the registry declares (none in production); approval status from stored approval records only.
 * - **Calibration counts** (R-152 "Until decided"; ADR 0054): corrections per tier and item type, from the recorded
 *   decisions through the domain's `calibrateTiers` with no threshold (the approver has not set one, D-53), so no tier
 *   reads dropped; the line names the threshold the registry records as proposed.
 */
import {
  databaseTime,
  readAdminAccounts,
  readAdminCalibrationDecisions,
  readAdminErasures,
  readAdminGuardrailCounts,
  readAdminInferenceDecisions,
  readAdminProjects,
  readAdminRoleEvents,
  withRequest,
  type AdminCalibrationDecisionRow,
} from '@sovitech/db';
import { calibrateTiers, type CalibrationDecision } from '@sovitech/domain';
import type { GateSource } from '@sovitech/registry/gates';
import type { AdminAccountsResponse, AdminDatasetsResponse, AdminGuardrailEventsResponse } from '@sovitech/view-model/browser';
import { adminAccountsView, adminDatasetsView, adminGuardrailEventsView } from '@sovitech/view-model/server';
import { sessionUserOf } from '../auth/dev-login';
import { ApiRefusal } from '../errors';
import type { ApiServices } from '../services';
import { registryOf } from '../wizard/registry';
import { adminDatasetsOf } from './datasets';

/** 403 `admin_only` unless the user is a person holding `sovitech_admin` now (ADR 0053 decision 5). */
async function requireAdmin(services: ApiServices, userId: string): Promise<void> {
  const user = await sessionUserOf(services, userId);
  if (user === undefined || !user.roles.includes('sovitech_admin')) throw new ApiRefusal(403, 'admin_only');
}

/** UD-39: accounts with their roles, the role events, the projects by id with their members, and the processors (none chosen). */
export async function adminAccounts(services: ApiServices, userId: string): Promise<AdminAccountsResponse> {
  await requireAdmin(services, userId);
  const development = new Set(services.devAccounts ?? []);
  return withRequest(services.store, { userId }, async (request) => {
    const accounts = await readAdminAccounts(request);
    const roleEvents = await readAdminRoleEvents(request);
    const projects = await readAdminProjects(request);
    return adminAccountsView({
      asOf: await databaseTime(request),
      accounts: accounts.map((account) => ({ ...account, development: development.has(account.userId) })),
      roleEvents: roleEvents.map((event) => ({
        eventId: event.eventId,
        userId: event.userId,
        role: event.role,
        change: event.change,
        byUserId: event.byOperator ? null : event.byUserId,
        at: event.at,
        reason: event.reason,
      })),
      projects: projects.map((project) => ({ projectId: project.projectId, isDemo: project.isDemo, createdAt: project.createdAt, memberIds: project.memberIds })),
    });
  });
}

/** UD-40: every dataset the gates wait for or the registry declares, with its version and its approval status, read-only. */
export async function adminDatasets(services: ApiServices, gates: GateSource, userId: string): Promise<AdminDatasetsResponse> {
  await requireAdmin(services, userId);
  const asOf = await withRequest(services.store, { userId }, (request) => databaseTime(request));
  return adminDatasetsView({ asOf, datasets: adminDatasetsOf(gates, registryOf(services)) });
}

/** A recorded decision as the domain's calibration reads it; one recorded with no tier is counted under none (ADR 0054 decision 3). */
function calibrationDecisionOf(row: AdminCalibrationDecisionRow): CalibrationDecision | undefined {
  if (row.tier === 'unstated') return undefined;
  return { tier: row.tier, fieldKey: row.fieldKey, outcome: row.outcome, by: row.by, at: row.at };
}

/** UD-41: counts per event type per project and in all, the paired metrics, the calibration counts and the erasure log. */
export async function adminGuardrailEvents(services: ApiServices, userId: string): Promise<AdminGuardrailEventsResponse> {
  await requireAdmin(services, userId);
  const proposed = registryOf(services).bundle.settings.calibrationThreshold;
  return withRequest(services.store, { userId }, async (request) => {
    const projects = await readAdminProjects(request);
    const counts = await readAdminGuardrailCounts(request);
    const inferenceDecisions = await readAdminInferenceDecisions(request);
    const decisions = await readAdminCalibrationDecisions(request);
    const erasures = await readAdminErasures(request);
    const accounts = await readAdminAccounts(request);
    const names = new Map(accounts.map((account) => [account.userId, account.displayName]));
    return adminGuardrailEventsView({
      asOf: await databaseTime(request),
      projects: projects.map((project) => ({ projectId: project.projectId, isDemo: project.isDemo })),
      counts: counts.projects.map((row) => ({ projectId: row.projectId, type: row.type, count: row.count })),
      totals: counts.totals,
      inferenceDecisions,
      // R-152 "Until decided" (D-53): counted, never applied; production passes no threshold (ADR 0054 decision 1).
      calibration: calibrateTiers(
        decisions.flatMap((row) => calibrationDecisionOf(row) ?? []),
        null,
      ),
      threshold: null,
      proposedThreshold: { correctionRatePercent: proposed.correctionRatePercent, window: proposed.window },
      erasures: erasures.map((entry) => {
        const byName = entry.byUserId === null ? null : names.get(entry.byUserId);
        if (byName === undefined) throw new Error('an erasure names an account the store did not list');
        return {
          documentEventId: entry.documentEventId,
          projectId: entry.projectId,
          isDemo: entry.isDemo,
          documentId: entry.documentId,
          role: entry.role,
          byName,
          at: entry.at,
          excerptsErased: entry.excerptsErased,
          textPartsDeleted: entry.textPartsDeleted,
          candidatesWithdrawn: entry.candidatesWithdrawn,
        };
      }),
    });
  });
}
