/**
 * The session of the development login (UD-36, UD-16; PRD R-133, R-153 "Until decided"; ADR 0038).
 *
 * - The signed-in user comes only from `GET /api/auth/session` (the roles the roles table records,
 *   read by the API in the user's own request); the web never takes a role from anywhere else.
 * - Nothing of any project is shown without a session (rule 13; US-ADMIN-01 AC1): `RequireSession`
 *   sends a visitor with none to the sign-in page, and a 401 from any route does the same.
 * - Signing out (US-ADMIN-01 AC4) ends the session on the API, forgets the CSRF token and replaces
 *   the page with sign-in, so every project screen and its data unmount with the providers under
 *   the protected layout: no project data from the session remains on screen.
 * - What the page session was told about each project's demo flag (rule 10, "Demo data": "Every
 *   screen and export for them shows 'Demo data, not an assessment of the real building'"; US-INTAKE-01
 *   AC8; US-REVIEW-03 AC1, AC7): once any response of the API (the project list, a screen envelope)
 *   has said whether a project is the demo, its served demo line is kept here by project id, so a
 *   screen of the demo whose own requests are still pending or have failed still shows it. Only a
 *   response about that project sets its entry; a project with no entry shows no demo line. Signing
 *   out, or a lost session, forgets every entry.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import type { Line, SessionUser } from '@sovitech/view-model/browser';
import { isAbort, request, resetCsrfToken } from '../api/client';

export type SessionState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed' }
  | { readonly status: 'signed_out' }
  | { readonly status: 'signed_in'; readonly user: SessionUser };

/** What a response of the API said about a project's demo flag: the flag and the served demo line (null on a project not flagged demo). */
export interface KnownProject {
  readonly isDemo: boolean;
  readonly demoLine: Line | null;
}

export interface SessionContextValue {
  readonly session: SessionState;
  /** What this page session was told about each project's demo flag, by project id. */
  readonly knownProjects: ReadonlyMap<string, KnownProject>;
  /** Keeps what a response said about a project's demo flag (the newest answer wins). */
  readonly rememberProject: (projectId: string, known: KnownProject) => void;
  /** Reads the session again (after sign-in, or to retry a failed read). */
  readonly refresh: () => Promise<SessionState>;
  /** Signs in as a development account (ADR 0038). */
  readonly signIn: (accountId: string) => Promise<void>;
  /** Ends the session and shows sign-in. */
  readonly signOut: () => Promise<void>;
  /** Marks the session gone after a 401 from any route, without asking the API again. */
  readonly lost: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

async function readSession(signal?: AbortSignal): Promise<SessionState> {
  const { user } = await request('auth.session', signal === undefined ? {} : { signal });
  return user === null ? { status: 'signed_out' } : { status: 'signed_in', user };
}

function sameKnown(left: KnownProject | undefined, right: KnownProject): boolean {
  return left !== undefined && left.isDemo === right.isDemo && left.demoLine?.id === right.demoLine?.id && left.demoLine?.text === right.demoLine?.text;
}

export function SessionProvider({ children }: { readonly children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });
  const [knownProjects, setKnownProjects] = useState<ReadonlyMap<string, KnownProject>>(() => new Map());

  const rememberProject = useCallback((projectId: string, known: KnownProject) => {
    // A project flagged demo carries its served line; one not flagged carries none (never the other way round).
    const entry: KnownProject = known.isDemo && known.demoLine !== null ? { isDemo: true, demoLine: known.demoLine } : { isDemo: false, demoLine: null };
    setKnownProjects((previous) => (sameKnown(previous.get(projectId), entry) ? previous : new Map(previous).set(projectId, entry)));
  }, []);
  const forgetProjects = useCallback(() => setKnownProjects((previous) => (previous.size === 0 ? previous : new Map())), []);

  const refresh = useCallback(async (): Promise<SessionState> => {
    try {
      const next = await readSession();
      setSession(next);
      return next;
    } catch {
      const failed: SessionState = { status: 'failed' };
      setSession(failed);
      return failed;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    readSession(controller.signal).then(setSession, (error: unknown) => {
      if (!isAbort(error)) setSession({ status: 'failed' });
    });
    return () => controller.abort();
  }, []);

  const signIn = useCallback(async (accountId: string) => {
    const { user } = await request('auth.devSignIn', { body: { accountId } });
    setSession({ status: 'signed_in', user });
  }, []);

  const signOut = useCallback(async () => {
    // The page drops the session at once, so nothing of a project renders while the API answers.
    setSession({ status: 'signed_out' });
    forgetProjects();
    try {
      await request('auth.signOut');
    } finally {
      resetCsrfToken();
    }
  }, [forgetProjects]);

  const lost = useCallback(() => {
    setSession({ status: 'signed_out' });
    forgetProjects();
  }, [forgetProjects]);

  const value = useMemo(
    () => ({ session, refresh, signIn, signOut, lost, knownProjects, rememberProject }),
    [session, refresh, signIn, signOut, lost, knownProjects, rememberProject],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (value === null) throw new Error('useSession is used outside SessionProvider');
  return value;
}

/** The signed-in user; only under `RequireSession`. */
export function useSessionUser(): SessionUser {
  const { session } = useSession();
  if (session.status !== 'signed_in') throw new Error('useSessionUser is used without a session');
  return session.user;
}

/**
 * The protected layout: its routes render only with a session. With none, sign-in (keeping where
 * the visitor was going, so sign-in can return there); while the session is read, nothing of a
 * project renders.
 */
export function RequireSession({ loading, failed }: { readonly loading: ReactNode; readonly failed: ReactNode }) {
  const { session } = useSession();
  const location = useLocation();
  if (session.status === 'loading') return <>{loading}</>;
  if (session.status === 'failed') return <>{failed}</>;
  if (session.status === 'signed_out') return <Navigate to="/sign-in" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <Outlet />;
}

/** A callback for an error from any route: a 401 marks the session gone, which shows sign-in. */
export function useOnSignedOut(): () => void {
  const { lost } = useSession();
  const navigate = useNavigate();
  return useCallback(() => {
    lost();
    void navigate('/sign-in', { replace: true });
  }, [lost, navigate]);
}
