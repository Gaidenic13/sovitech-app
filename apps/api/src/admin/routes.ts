/**
 * The phase 7 routes of the contract (packages/view-model/src/browser/contract/admin.ts and routes.ts;
 * docs/adr/0053-phase-7-scope-and-the-admin-area.md): the development-only admin area, UD-39 (accounts, roles,
 * projects and processors), UD-40 (datasets) and UD-41 (guardrail events, paired metrics, calibration counts and the
 * erasure log). Every one is a read: no CSRF token (prompt 3 section 11 checks it on state-changing routes), and no
 * route of the admin area writes anything (prompt 3 5.4: "No screen, admin page or script creates approval records or
 * opens gates"; guardrails section 10, "Metrics prompt a review, never an edit").
 *
 * - **Development only.** While the development login is off (ADR 0038 decision 6: no development accounts, or an
 *   upload guard that could store a real owner document), every route here answers 404 `admin_off`, before the session
 *   or the role is read.
 * - **The admin's role.** The session's user must be a person holding `sovitech_admin` now (read from the roles table
 *   in the user's own request, never from the request), else 403 `admin_only`; the store's definer functions check it
 *   again (migration 0018). Holding `sovitech_admin` never permits verification (G10-3).
 * - Logs carry codes and ids only (rule 13).
 *
 * Skeleton (the phase 7 planner): the off check is built here; each handler calls its service in ./service.ts, whose
 * bodies (the role check included) the API builder writes.
 */
import type { FastifyInstance } from 'fastify';
import { AdminAccountsResponseSchema, AdminDatasetsResponseSchema, AdminGuardrailEventsResponseSchema } from '@sovitech/view-model/browser';
import { devLoginEnabled } from '../auth/dev-login';
import { ApiRefusal } from '../errors';
import { answerWith, userOf } from '../http';
import type { ApiServices } from '../services';
import { adminAccounts, adminDatasets, adminGuardrailEvents } from './service';

/** 404 `admin_off` while the development login is off (ADR 0053 decision 3). */
function refuseWhenOff(services: ApiServices): void {
  if (!devLoginEnabled(services)) throw new ApiRefusal(404, 'admin_off');
}

export function registerAdminRoutes(app: FastifyInstance, services: ApiServices): void {
  const gates = app.gates;

  app.get('/api/admin/accounts', async (request) => {
    refuseWhenOff(services);
    return answerWith(AdminAccountsResponseSchema, await adminAccounts(services, userOf(request)));
  });
  app.get('/api/admin/datasets', async (request) => {
    refuseWhenOff(services);
    return answerWith(AdminDatasetsResponseSchema, await adminDatasets(services, gates, userOf(request)));
  });
  app.get('/api/admin/guardrail-events', async (request) => {
    refuseWhenOff(services);
    return answerWith(AdminGuardrailEventsResponseSchema, await adminGuardrailEvents(services, userOf(request)));
  });
}
