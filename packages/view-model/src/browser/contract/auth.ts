/**
 * The development login (prompt 3 5.2 "Authentication": a roles table, the database guard and a
 * development login, no production identity provider; build-readiness 3 "Now" item 10; UD-36;
 * PRD R-133, R-153 "Until decided": the development login is the only sign-in, with no
 * self-registration, invitation or password reset). docs/adr/0038-development-login.md.
 *
 * - The development accounts are the ids in the API's `SOVITECH_DEV_ACCOUNTS` setting, created on
 *   the operator's login by `pnpm --filter @sovitech/api dev-accounts` (synthetic names, role
 *   `owner`), never by a screen. With the setting empty the login is off: every route here but
 *   `session` answers 404 `dev_login_off`, and the sign-in page says the app has no sign-in set up.
 * - Signing in starts a session (a random id in a signed, HTTP-only, same-site cookie; the id maps
 *   to the account in memory: apps/api/src/auth/sessions.ts). The account's roles come only from
 *   the roles table (R-153), read in the account's own request.
 * - Nothing of any project is reachable without a session (rule 13; R-133).
 */
import { z } from 'zod';
import { SessionUserSchema } from './common';
import { UuidSchema } from './display';

/** `GET /api/auth/dev-accounts`: the accounts the sign-in page offers. */
export const DevAccountsResponseSchema = z.strictObject({ accounts: z.array(SessionUserSchema) });
export type DevAccountsResponse = z.infer<typeof DevAccountsResponseSchema>;

/** `POST /api/auth/dev-sign-in`. */
export const DevSignInRequestSchema = z.strictObject({ accountId: UuidSchema });
export type DevSignInRequest = z.infer<typeof DevSignInRequestSchema>;
export const DevSignInResponseSchema = z.strictObject({ user: SessionUserSchema });

/** `GET /api/auth/session`: the signed-in user, or null (never a refusal). */
export const SessionResponseSchema = z.strictObject({ user: SessionUserSchema.nullable() });
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

/** `GET /api/csrf` (phase 2): the token every state-changing request sends in the `csrf-token` header. */
export const CsrfResponseSchema = z.strictObject({ token: z.string().min(1) });

/** The header the CSRF plugin reads (@fastify/csrf-protection's default). */
export const CSRF_HEADER = 'csrf-token';
