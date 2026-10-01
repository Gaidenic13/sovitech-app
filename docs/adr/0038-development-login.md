# 0038. The development login and the development accounts

- **Status:** Accepted: default, reversible
- **Date:** 2026-09-30

## Context

- **Prompt 3 5.2, "Authentication"** (build-readiness 3 item 10): "A roles table, the database guard, and a development login. No production identity provider." UD-36 is built in phase 3 with it (prompt 3 section 9).
- **PRD R-133** (sign-in with the development login, and the account item; S1 proposed): nothing of any project before sign-in; the session carries the user id and the role the roles table records; the account item shows the user's name and role and sign-out; no tagline on the sign-in page. **R-153 "Until decided"** (D-13): "The development login is the only sign-in, and no self-registration, invitation or password-reset flow is built."
- **The store** (ADR 0013): accounts and roles are created and granted on the operator's login (`createAppUser`, `grantAppRole`), audited; a project's members are added by a member or on the operator's login, never by oneself. A request sees only its own account and the members of the project in scope. Sessions exist since phase 2 (`apps/api/src/auth/sessions.ts`: a random id in a signed, HTTP-only, same-site cookie, mapped in memory), with no route that creates one.
- **PRD R-136:** "Proposed (PRD interim, reversible): in S1 (proposed) it [the demo project] is listed, with its demo line, for every development account" (D-13 open).
- **Rule 13 and the owner's decision of 2026-09-25** (ADR 0028): the development build stores fixtures only; the development login is "never enabled where real owner documents are stored" (R-133).

## Decision

1. **The development accounts** are listed by id in the API's `SOVITECH_DEV_ACCOUNTS` setting (comma-separated account ids; `.env` or the environment; `.env.example` gains the empty line). Empty or unset: the development login is off (the dev-login routes answer 404 `dev_login_off`, and the sign-in page says no sign-in is set up).
2. **`pnpm --filter @sovitech/api dev-accounts`** (`apps/api/src/cli/create-dev-accounts.ts`), on the operator's login: creates one account "Development owner" (kind `person`, reason "the development login, prompt 3 5.2"), grants it `owner`, adds it as a member of the demo project when one exists (found through the demo seed account's request, as the seed's second run finds it), and prints the `SOVITECH_DEV_ACCOUNTS=` line. No engineer account: phase 7 builds the engineer's work, and granting `sovitech_engineer` stays on the operator's login (D-13).
3. **Routes** (contract routes.ts): `GET /api/auth/dev-accounts` (each account's display name and roles, read in the account's own request); `POST /api/auth/dev-sign-in` {accountId} with CSRF (refused `not_a_dev_account` for an id not in the setting); `POST /api/auth/sign-out` with CSRF (ends the session, clears the cookie); `GET /api/auth/session` (the user or null). No password: the login picks a synthetic development account on a build that stores synthetic fixtures only.
4. **Roles** come only from the roles table, read in the user's own request (`readUserRoles`), never from the request body, the cookie or a document (R-153).
5. **The CSRF cookie** of `@fastify/csrf-protection` (phase 2) protects the sign-in too; its errors are answered 403 `csrf_invalid`.

6. **Where real owner documents could be stored, it is off** (API builder, phase 3; R-133 "Guardrail behaviour": "The development login is never enabled where real owner documents are stored"; R-159 condition 4; traceability 10.3 near miss 43). The login is on only when `SOVITECH_DEV_ACCOUNTS` lists accounts **and** the API's upload guard is the owner's fixtures-only guard (`fixtureUploadGuard`, which marks itself `fixturesOnly`; ADR 0028). An API built with any other guard, one that could store a real owner document, answers every development-login route 404 `dev_login_off` whatever the setting says (`apps/api/src/auth/dev-login.ts`, `devLoginEnabled`; `tests/api/dev-login-off.test.ts`).
7. **The CLI's two functions** (`apps/api/src/cli/dev-accounts.ts`), which the e2e global setup may call too: `ensureDevOwner(operator)` finds or creates "Development owner" (kind `person`) and grants `owner` once; `addToDemoProject(operator, ids)` finds the demo project as the seed's second run does (`findDemoProject`, read only) and adds each account once (audited by `add_project_member`). `pnpm --filter @sovitech/api dev-accounts` runs both and prints the `SOVITECH_DEV_ACCOUNTS=` line.
8. **Settings** (`apps/api/src/config.ts`): `SOVITECH_DEV_ACCOUNTS` is read strictly (comma-separated account ids, trimmed, lower-cased, deduplicated; any other entry stops the start with `SettingError`, never printing the value). `SOVITECH_DB_APP_URL` and `SOVITECH_DB_OPERATOR_URL` (ADR 0037) win over the port, name and passwords in the API, the worker, the seed CLI and both account CLIs (`databaseUrl`).

9. **Amended 2026-10-01 (phase 3 part B, finding A-11): sessions end, and a CSRF token belongs to its session.**
   - **Lifetimes** (`apps/api/src/auth/sessions.ts`, `SessionStore`): a session ends on sign-out; when unused for the idle lifetime (`SOVITECH_SESSION_IDLE_MINUTES`, 1 to 1,440, default 30 minutes); and when older than the absolute lifetime however much it is used (`SOVITECH_SESSION_ABSOLUTE_HOURS`, 1 to 168, default 12 hours). The idle lifetime may not exceed the absolute one; any other value stops the start with `SettingError` (`config.ts` `sessionLifetimes`, never printing the value; `.env.example` gains the two empty lines). An ended session reads as none: 401 `not_signed_in` on project routes, null on `GET /api/auth/session`. Sessions past their lifetime are dropped when a new one starts.
   - **Binding** (`apps/api/src/routes.ts`): `@fastify/csrf-protection` takes `getUserInfo` and an HMAC key derived from the cookie secret, so a token is bound to the live session it was issued for (`session:<id>`, or `no-session` before sign-in). Another browser's token and CSRF cookie, a token from before sign-in, or one of an ended session are refused 403 `csrf_invalid` on this session.
   - **Rotation** (`apps/api/src/auth/dev-login.ts`): signing in and signing out clear the `_csrf` cookie, so the next token comes from a new secret. The web client already fetches a token again after a 403 `csrf_invalid` (`apps/web/src/api/client.ts`); no web change.
   - Proven by `apps/api/src/auth/sessions.test.ts`, `apps/api/src/config.test.ts` and `tests/api/session-csrf.test.ts` (each titled A-11); `tests/api/wizard-flow.test.ts` signs out with a token of the session.

## Consequences

- Anyone who can reach the local API can sign in as a development account; that is acceptable only because the build stores synthetic fixtures (ADR 0028) and runs locally (prompt 3 5.2 "Hosting"). The production sign-in waits for D-13 (R-153).
- Sessions stay in memory: restarting the API signs everyone out. A session also ends when unused or too old (decision 9), so a page left open past the idle lifetime needs a new sign-in.
- The demo project is listed for the development accounts because the CLI (and the e2e setup, ADR 0037) makes them members, on the operator's login; the seed itself still decides no membership.

## How to reverse

Remove the setting (the routes answer `dev_login_off`), or replace the three routes with the chosen identity provider's flow (D-13), keeping `SessionStore` and the session cookie.
