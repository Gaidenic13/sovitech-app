/**
 * The development login (prompt 3 5.2 "Authentication": a roles table, the database guard and a
 * development login, no production identity provider; build-readiness 3 "Now" item 10; UD-36;
 * PRD R-133, R-153 "Until decided": the development login is the only sign-in, with no
 * self-registration, invitation or password reset; docs/adr/0038-development-login.md).
 *
 * - It is on only when SOVITECH_DEV_ACCOUNTS names accounts AND the API stores nothing but the
 *   synthetic fixtures (the owner's fixtures-only guard, ADR 0028). Anywhere the upload guard
 *   could let a real owner document in, it is off (R-133 "Guardrail behaviour": "The development
 *   login is never enabled where real owner documents are stored"; R-159 condition 4;
 *   traceability 10.3 near miss 43). Off, every route here but `session` answers 404
 *   `dev_login_off`.
 * - Signing in picks one of the listed accounts (synthetic, "Development owner"); no password,
 *   because the build stores synthetic fixtures only. A session is a random id in a signed,
 *   HTTP-only, same-site cookie mapped in memory (./sessions.ts), with an idle and an absolute
 *   lifetime; signing in again ends the request's earlier session. Signing in and signing out
 *   clear the CSRF secret, and every CSRF token is bound to the session it was issued for
 *   (../routes.ts; part B, A-11; ADR 0038 decision 9).
 * - The account's name and roles are read in the account's own request: the roles only from the
 *   roles table (`request_account_roles`, R-153), never from the request body, the cookie or a
 *   document.
 * - Logs carry codes and ids only (rule 13).
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { readUserRoles, readVisibleAccounts, withRequest } from '@sovitech/db';
import {
  APP_ROLES,
  DevAccountsResponseSchema,
  DevSignInRequestSchema,
  DevSignInResponseSchema,
  SessionResponseSchema,
  type SessionUser,
} from '@sovitech/view-model/browser';
import { ApiRefusal } from '../errors';
import { answerWith, parseWith } from '../http';
import type { ApiServices } from '../services';
import { CSRF_COOKIE, SESSION_COOKIE } from './sessions';

/** Whether the development login is on for these services (see the module comment). */
export function devLoginEnabled(services: Pick<ApiServices, 'devAccounts' | 'uploadGuard'>): boolean {
  return (services.devAccounts ?? []).length > 0 && services.uploadGuard.fixturesOnly === true;
}

const APP_ROLE_SET: ReadonlySet<string> = new Set(APP_ROLES);

/**
 * An account as the session user the web shows (UD-16's account item): its display name and the
 * roles the roles table records now, read in the account's own request. Undefined when no
 * person account has this id.
 */
export async function sessionUserOf(services: Pick<ApiServices, 'store'>, userId: string): Promise<SessionUser | undefined> {
  return withRequest(services.store, { userId }, async (request) => {
    const own = (await readVisibleAccounts(request)).find((account) => account.id === userId);
    if (own?.kind !== 'person') return undefined;
    const roles = (await readUserRoles(request, userId)).filter((role) => APP_ROLE_SET.has(role));
    return { userId, displayName: own.displayName, roles: roles as SessionUser['roles'] };
  });
}

const COOKIE_OPTIONS = { signed: true, httpOnly: true, sameSite: 'strict', path: '/' } as const;

/** The session id of the request's signed session cookie, when it carries a valid one. */
function sessionIdOf(request: FastifyRequest): string | undefined {
  const raw = request.cookies[SESSION_COOKIE];
  if (raw === undefined) return undefined;
  const unsigned = request.unsignCookie(raw);
  return unsigned.valid && unsigned.value !== null ? unsigned.value : undefined;
}

function refuseWhenOff(services: ApiServices): void {
  if (!devLoginEnabled(services)) throw new ApiRefusal(404, 'dev_login_off');
}

/** The four routes of the contract's "Session and sign-in" section (routes.ts: auth.*). */
export function registerAuthRoutes(app: FastifyInstance, services: ApiServices, guarded: { readonly onRequest: FastifyInstance['csrfProtection'] }): void {
  app.get('/api/auth/dev-accounts', async () => {
    refuseWhenOff(services);
    const accounts: SessionUser[] = [];
    for (const accountId of services.devAccounts ?? []) {
      const user = await sessionUserOf(services, accountId);
      if (user !== undefined) accounts.push(user);
    }
    return answerWith(DevAccountsResponseSchema, { accounts });
  });

  app.post('/api/auth/dev-sign-in', guarded, async (request: FastifyRequest, reply: FastifyReply) => {
    refuseWhenOff(services);
    const { accountId } = parseWith(DevSignInRequestSchema, request.body);
    if (!(services.devAccounts ?? []).includes(accountId)) throw new ApiRefusal(403, 'not_a_dev_account');
    const user = await sessionUserOf(services, accountId);
    if (user === undefined) throw new ApiRefusal(403, 'not_a_dev_account');
    const earlier = sessionIdOf(request);
    if (earlier !== undefined) services.sessions.end(earlier);
    const sessionId = services.sessions.create(accountId);
    void reply.setCookie(SESSION_COOKIE, sessionId, COOKIE_OPTIONS);
    // ADR 0038 decision 9: a new session starts with a new CSRF secret; the token of before is bound to no session anyway.
    void reply.clearCookie(CSRF_COOKIE, { path: '/' });
    services.log({ event: 'dev_signed_in', code: 'dev_login' });
    return answerWith(DevSignInResponseSchema, { user });
  });

  app.post('/api/auth/sign-out', guarded, async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = sessionIdOf(request);
    if (sessionId !== undefined) services.sessions.end(sessionId);
    void reply.clearCookie(SESSION_COOKIE, { path: '/' });
    void reply.clearCookie(CSRF_COOKIE, { path: '/' });
    return reply.code(204).send();
  });

  app.get('/api/auth/session', async (request: FastifyRequest) => {
    const userId = request.sovitechUserId;
    const user = userId === undefined ? null : ((await sessionUserOf(services, userId)) ?? null);
    return answerWith(SessionResponseSchema, { user });
  });
}
