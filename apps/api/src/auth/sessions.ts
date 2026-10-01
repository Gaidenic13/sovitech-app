/**
 * Sessions (prompt 3 section 11, "Security basics": session cookies with CSRF
 * protection on state-changing routes; section 5.2, "Authentication": a roles
 * table, the database guard, and a development login; docs/adr/0038). The
 * development login (./dev-login.ts) calls `create` for the user who signs in;
 * tests create sessions for TEST accounts directly.
 *
 * A session is a random id in a signed, HTTP-only, same-site cookie; the id maps
 * to the app user in memory. Who the user is inside a project, and what they may
 * do, is the store's to decide in every request (row-level security, the guards).
 *
 * A session ends (part B, A-11; ADR 0038 decision 9): on sign-out; when it has not
 * been used for the idle lifetime; and when it is older than the absolute lifetime,
 * however much it is used. Both lifetimes are settings with safe defaults
 * (apps/api/src/config.ts `sessionLifetimes`). An ended session reads as no session
 * (401 `not_signed_in` on every project route).
 */
import { randomBytes } from 'node:crypto';
import cookie from '@fastify/cookie';

export const SESSION_COOKIE = 'sovitech_session';

/** The CSRF secret's cookie (../routes.ts registers @fastify/csrf-protection with it); cleared on sign-in and sign-out (ADR 0038 decision 9). */
export const CSRF_COOKIE = '_csrf';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** How long a session lives: unused (`idleMs`) and in all (`absoluteMs`). */
export interface SessionLifetimes {
  readonly idleMs: number;
  readonly absoluteMs: number;
}

/** The safe defaults: 30 minutes unused, 12 hours in all (ADR 0038 decision 9). */
export const DEFAULT_SESSION_LIFETIMES: SessionLifetimes = Object.freeze({ idleMs: 30 * 60 * 1000, absoluteMs: 12 * 60 * 60 * 1000 });

interface Session {
  readonly userId: string;
  readonly createdAt: number;
  lastUsedAt: number;
}

export class SessionStore {
  private readonly sessions = new Map<string, Session>();
  private readonly lifetimes: SessionLifetimes;
  private readonly now: () => number;

  constructor(options: { readonly lifetimes?: SessionLifetimes; readonly now?: () => number } = {}) {
    const lifetimes = options.lifetimes ?? DEFAULT_SESSION_LIFETIMES;
    if (!(lifetimes.idleMs > 0 && lifetimes.absoluteMs > 0 && lifetimes.idleMs <= lifetimes.absoluteMs)) {
      throw new Error('a session lives for a positive idle lifetime within a positive absolute lifetime');
    }
    this.lifetimes = lifetimes;
    this.now = options.now ?? Date.now;
  }

  /** Starts a session for an app user (app_users.id); returns the session id for the cookie. */
  create(userId: string): string {
    if (!UUID.test(userId)) throw new Error('a session belongs to an app user id');
    this.sweep();
    const id = randomBytes(32).toString('hex');
    const at = this.now();
    this.sessions.set(id, { userId, createdAt: at, lastUsedAt: at });
    return id;
  }

  /** The user of a live session, or undefined; a session past either lifetime ends here. Using it restarts its idle time. */
  userOf(sessionId: string): string | undefined {
    const session = this.sessions.get(sessionId);
    if (session === undefined) return undefined;
    const at = this.now();
    if (this.expired(session, at)) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    session.lastUsedAt = at;
    return session.userId;
  }

  end(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private expired(session: Session, at: number): boolean {
    return at - session.lastUsedAt > this.lifetimes.idleMs || at - session.createdAt > this.lifetimes.absoluteMs;
  }

  /** Drops every session past its lifetime (run when a session starts, so ended sessions do not accumulate). */
  private sweep(): void {
    const at = this.now();
    for (const [id, session] of this.sessions) if (this.expired(session, at)) this.sessions.delete(id);
  }
}

/**
 * The Cookie header value of a session, signed with the API's secret, as the development
 * login sets it. Tests sign in TEST accounts with it.
 */
export function sessionCookieHeader(sessionId: string, secret: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(cookie.sign(sessionId, secret))}`;
}
