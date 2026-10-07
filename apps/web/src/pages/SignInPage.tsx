/**
 * UD-36, sign-in with the development login (PRD R-133, R-153 "Until decided": the development
 * login is the only sign-in, with no self-registration, invitation or password reset; US-ADMIN-01;
 * docs/adr/0038-development-login.md).
 *
 * - The accounts offered are those `GET /api/auth/dev-accounts` lists (the API's
 *   `SOVITECH_DEV_ACCOUNTS`), each with its name and the roles the roles table records. With the
 *   login off (404 `dev_login_off`) the page says no sign-in is set up.
 * - No project name, document or value shows before sign-in (US-ADMIN-01 AC1; rule 13).
 * - The logo and no tagline (US-ADMIN-01 AC5; R-148 "Until decided").
 * - After sign-in, the page the visitor was sent here from, or else where the account's roles land it (phase 7;
 *   docs/adr/0053 decision 4; ../admin/landing.ts): the admin area for a user holding `sovitech_admin` and not
 *   `owner`, the project list for everyone else. The app's entry (`/`) decides, from the session.
 *
 * Undesigned (UD-36): drawn in the wizard's language, per the frontend-design skill within the
 * brand: one centred column on the page surface, the logo in the header, a plain title, and each
 * account as one full-width row on the raised surface with its role under its name and "Sign in"
 * at its right edge.
 */
import { ArrowRight, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import type { SessionUser } from '@sovitech/view-model/browser';
import { ApiError, request } from '../api/client';
import { copy } from '../copy';
import { useSession } from '../session/SessionProvider';
import { roleLabel } from '../shell/HeaderMenu';
import { Shell } from '../shell/Shell';
import { useRenderReady } from '../shell/render-ready';
import { useLoad } from '../api/use-load';
import { LoadFailed, Loading } from './PageState';

type Accounts = { readonly status: 'on'; readonly accounts: readonly SessionUser[] } | { readonly status: 'off' };

/**
 * Where sign-in returns to: the page the visitor was sent here from, inside the app only; else the app's entry, which
 * lands the session by role (../routes.tsx `Entry`; ../admin/landing.ts).
 */
function returnPath(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const from = (state as { from: unknown }).from;
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/sign-in')) return from;
  }
  return '/';
}

export function SignInPage() {
  const { session, signIn } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [pending, setPending] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const loaded = useLoad<Accounts>(async (signal) => {
    try {
      const { accounts } = await request('auth.devAccounts', { signal });
      return { status: 'on', accounts };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404 && error.code === 'dev_login_off') return { status: 'off' };
      throw error;
    }
  }, []);
  const { state } = loaded;
  useRenderReady(state.status !== 'loading');

  if (session.status === 'signed_in') return <Navigate to={returnPath(location.state)} replace />;

  const choose = (accountId: string) => {
    setPending(accountId);
    setFailed(false);
    signIn(accountId).then(
      () => void navigate(returnPath(location.state), { replace: true }),
      () => {
        setPending(null);
        setFailed(true);
      },
    );
  };

  return (
    <Shell>
      <section aria-labelledby="sign-in-title" className="mx-auto flex max-w-[560px] flex-col gap-8 px-6 pt-24 pb-16">
        <header className="flex flex-col gap-3">
          <h1 id="sign-in-title" className="text-(length:--sov-title-size) leading-tight font-light tracking-(--sov-title-tracking)">
            {copy.signIn.title}
          </h1>
          {state.status === 'ready' && state.data.status === 'on' ? (
            <p className="text-[17px] font-light text-(--sov-text-tertiary)">{copy.signIn.intro}</p>
          ) : null}
        </header>
        {state.status === 'loading' ? <Loading /> : null}
        {state.status === 'failed' ? <LoadFailed message={copy.signIn.failed} onRetry={() => void loaded.reload()} /> : null}
        {state.status === 'ready' && state.data.status === 'off' ? (
          <div className="flex flex-col gap-2 rounded-(--sov-radius-surface) border border-(--sov-border) px-6 py-5">
            <p className="text-[15px] font-semibold">{copy.signIn.off}</p>
            <p className="text-[15px] text-(--sov-text-tertiary)">{copy.signIn.offDetail}</p>
          </div>
        ) : null}
        {state.status === 'ready' && state.data.status === 'on' ? (
          <div className="flex flex-col gap-3">
            <h2 className="sov-heading-group">{copy.signIn.accounts}</h2>
            <ul className="flex flex-col gap-3">
              {state.data.accounts.map((account) => (
                <li key={account.userId}>
                  <button
                    type="button"
                    aria-busy={pending === account.userId}
                    onClick={() => choose(account.userId)}
                    className="group flex w-full items-center gap-4 rounded-(--sov-radius-surface) border border-(--sov-border) bg-(--sov-surface) px-5 py-4 text-left transition-colors duration-300 hover:border-(--sov-border-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sov-focus-ring)"
                  >
                    <UserRound size={24} strokeWidth={1.5} aria-hidden="true" focusable="false" className="shrink-0 text-(--sov-text-tertiary)" />
                    <span className="flex flex-1 flex-col">
                      <span className="text-[15px] font-semibold text-(--sov-text-primary)">{account.displayName}</span>
                      <span className="text-[13px] text-(--sov-text-tertiary)">{account.roles.map(roleLabel).join(', ')}</span>
                    </span>
                    <span className="flex items-center gap-2 text-[15px] font-medium text-(--sov-accent)" data-copy-kind="action-label">
                      {copy.signIn.action}
                      <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {failed ? (
              <p role="alert" className="text-[15px] text-(--sov-text-primary)">
                {copy.signIn.signInFailed}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </Shell>
  );
}
