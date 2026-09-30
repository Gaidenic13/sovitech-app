/**
 * Sessions (prompt 3 section 11, "Security basics": session cookies with CSRF
 * protection on state-changing routes; section 5.2, "Authentication": a roles
 * table, the database guard, and a development login). The development login is
 * phase 3 (UD-36): it will call `create` for the user who signs in. Until then no
 * route creates a session, so every project route answers 401 in the running app,
 * and tests create sessions for TEST accounts directly.
 *
 * A session is a random id in a signed, HTTP-only, same-site cookie; the id maps
 * to the app user in memory. Who the user is inside a project, and what they may
 * do, is the store's to decide in every request (row-level security, the guards).
 */
import { randomBytes } from 'node:crypto';
import cookie from '@fastify/cookie';

export const SESSION_COOKIE = 'sovitech_session';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class SessionStore {
  private readonly sessions = new Map<string, string>();

  /** Starts a session for an app user (app_users.id); returns the session id for the cookie. */
  create(userId: string): string {
    if (!UUID.test(userId)) throw new Error('a session belongs to an app user id');
    const id = randomBytes(32).toString('hex');
    this.sessions.set(id, userId);
    return id;
  }

  /** The user of a session, or undefined. */
  userOf(sessionId: string): string | undefined {
    return this.sessions.get(sessionId);
  }

  end(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

/**
 * The Cookie header value of a session, signed with the API's secret, as the development
 * login (phase 3) will set it. Tests sign in TEST accounts with it.
 */
export function sessionCookieHeader(sessionId: string, secret: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(cookie.sign(sessionId, secret))}`;
}
