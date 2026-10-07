# @sovitech/db

The store of `docs/guardrails.md` section 2 on Postgres: the migrations with the
database roles, row-level security, the append-only guards and the two guarded
functions, and the data-access layer the API uses. Decisions: `docs/adr/0012` to
`0015`.

## Layout

| Path | What it holds |
|---|---|
| `migrations/NNNN_name.sql` | Tables, grants and policies. Run as `sovitech_db_migrator` acting as `sovitech_db_owner`. |
| `migrations/NNNN_name.admin.sql` | Roles, the definer functions, the guards and the event triggers. Run by the database administrator (a superuser). |
| `src/migrate.ts` | The runner: one transaction per file, SHA-256 recorded, a changed file refused, the guard invariants checked in each migration and after the run. |
| `src/self-check.ts` | The runner's self-check: one engineer verification and one erasure on TEST rows, always rolled back, after each migration and at the end of every run (ADR 0014). |
| `src/request.ts` | `withRequest`: one transaction per request, with the authenticated user and the project in scope. |
| `src/writes.ts` | Appends: documents, candidates with evidence (after the registry's unit check against the field), candidate, field, document and asset events, asset appearances with one or more evidence entries, guardrail events, proposal snapshots. No update or delete method exists. |
| `src/guarded.ts` | Calls to the guarded functions: `verifyCandidate` (the one writer of `engineer_verified`), `eraseDocument` (the one audited erasure), and the audited account, role and project functions. |
| `src/reads.ts` | Reads that return the domain's types for `derive` and `deriveAssetRegister`; `readProjectFieldInputs` (every field of given subjects at once, for the wizard's step views) and `readGuardrailEvents` (phase 3). |
| `src/projects.ts` | The project list (`readUserProjects`, through `sovitech.request_user_projects()`, migration 0014) and a project's subjects (`readProjectSubjects`) (phase 3). |
| `src/model-views.ts` | The viewer step (migration 0017): the append-only conversion record of a stored IFC model shown as a document (`model_view_events`: `queued`, `started`, `converted`, `failed` with a code, `erased`; codes, ids, sizes and times only, never a value), its derived state (`modelViewStateOf`), and the conversion queue (`sovitech_work.model_view_jobs`, one open job per project and content hash). |
| `src/errors.ts` | The store's refusals (`StoreRefusal`, by SQLSTATE) and `StoreError` for any other database error: neither keeps the database's DETAIL, context, statement or input text (rule 13). |
| `src/testing/` | `@sovitech/db/testing`: a throwaway TEST database with Testcontainers, and TEST accounts, projects and values. Tests only: dependency-cruiser's `db-testing-only-from-tests` lets only `tests/` and the store's own `*.test.ts` files reach it. |

## Local database

`docker-compose.yml` at the repository root runs the pinned Postgres image on
127.0.0.1. Copy `.env.example` to `.env` (git-ignored) and choose the passwords,
then:

```sh
docker compose up -d postgres
pnpm --filter @sovitech/db migrate
```

Without the Compose plugin, the same container from `.env`'s values:

```sh
set -a; . ./.env; set +a
docker run -d --name sovitech-postgres \
  -e POSTGRES_USER="$SOVITECH_DB_ADMINISTRATOR_USER" \
  -e POSTGRES_PASSWORD="$SOVITECH_DB_ADMINISTRATOR_PASSWORD" \
  -e POSTGRES_DB="$SOVITECH_DB_NAME" \
  -p "127.0.0.1:$SOVITECH_DB_PORT:5432" -v sovitech-postgres:/var/lib/postgresql \
  postgres:18.6-bookworm@sha256:3725f4e2499eef5134592b3b4ab79a543ed7f8e533b05b5b637af926630f6650 \
  postgres -c log_error_verbosity=terse -c log_min_error_statement=panic
pnpm --filter @sovitech/db migrate
```

The two `-c` settings keep an error's DETAIL (a failing row or key) and the
failing statement out of the server log (rule 13); migration 0000 sets them on
the database too.

## Tests

`pnpm test` runs the store's tests (`src/*.test.ts`) and the guardrail cases that
drive it (`tests/guardrails/G1-14`, `G2-9`, `G3-16`, `G4-20` to `G4-24`, `G4-31`, `G8-4`, `G10-3`, `G10-8`, `G13-5` to `G13-8`, `G13-14`) against a Postgres
started by Testcontainers per test file. Docker must be running. When
`DOCKER_HOST` is unset, the helper uses the docker CLI's current context (Colima
works as is). The reaper image is pinned by digest too (`src/images.ts`).

## Who may do what

- Every candidate, field, document and asset event names the user making the
  request, in a role that user holds: an engineer event from a person holding
  `sovitech_engineer`; an owner event from a member holding `owner` (a person,
  or the demo seed on a demo project); a system event from a service account
  (`SVX09`, `SVX07`). The erasure function alone withdraws candidates as the
  system in an owner's request.
- A `conflict_resolved` event names the candidates it covered
  (`covered_candidate_ids`), each a candidate of its field (`SVX10`), and
  comes from a person, never the system; `skipped` comes from the owner and
  `analysis_started` and `analysis_finished` from the system.
- A candidate names the user making the request as its author (`SVX11`): a
  `user` value from an owner member (or the demo seed on a demo project) or an
  engineer, in their own name; `document`, `ai_inference`, `calculated`,
  `estimated` and `reference` values from a service account that is a member
  of the project. A system event on a candidate is only the engine's
  supersession of a calculated or estimated value, or the withdrawal of a
  value whose documents are all removed (`SVX13`); a person withdraws only
  their own `user` value (`SVX14`). The store records the role the author
  acted in (`author_role`: `owner`, `sovitech_engineer` or `system`), set by
  the same guard from the request; the app cannot write the column.
- A document is withdrawn by the owner or by an engineer, member or not
  (2.3's `DocumentEvent` names both), and by the system only as the job
  carrying out such a person's own withdrawal of that document, whose id it
  names in `request_event_id` (CHECKs `document_events_withdrawn_by_person_or_request`
  and `document_events_request_only_on_system_withdrawal`; `SVX15`); a job's
  service account never withdraws a document on its own. An `erased` event is
  the erasure function's, naming the owner who asked or the system, with the
  reason `document_erased` (`document_events_erased_by_erasure`, `SVE10`).
- A document value commits only with an evidence entry whose check matched
  (`SVX01`), a document only with its first analysis event (`SVX12`).
- A stored proposal's snapshot names the user making the request as its
  writer, an owner of the project (or the demo seed on a demo project) or the
  project's system service account (`SVX19`, migration 0016); every part of it
  (its candidate ids, formulas, output rows, pending documents and drafted
  paragraphs) is written only with it, by its writer, in its transaction, so a
  stored proposal is never added to once it commits (`SVX17`, migrations 0015
  and 0016). A generated output is started only by the owner making the
  request, in their own name (`SVX18`).
- After an erasure, no extracted text, evidence entry or excerpt is stored
  for the erased document or its content hash (`SVE11`); writers of text and
  evidence, and the erasure, run in READ COMMITTED (`SVE12`) and meet on the
  erasure lock, so a write in flight is erased or refused, never left in clear.
- Nobody grants, revokes or adds themself (`SVR03`); `sovitech_engineer` and
  `sovitech_commercial_reviewer` are granted on the operator's login only until
  PRD D-13 decides (`SVR04`); a person holding `owner` who is a member of the
  project, or the operator's login, adds members (a job's service account and
  the demo seed never do).
- Only the demo seed account creates a project flagged demo, and it creates no
  other kind (`SVR05`).
- The app reads accounts and roles through `request_accounts` and
  `request_account_roles` only: its own account and the members of the project
  in scope. The operator's login reads them in full.

## Adding a table or a guard

A table of schema `sovitech` is part of the value store: add it in an admin
migration that also registers its guards (`sovitech_guard.append_only_tables`,
`required_triggers`, `project_tables`) and calls `sovitech_guard.record_shape()`.
The runner refuses a migration that leaves a table of the schema unregistered,
and the event triggers refuse any command that would drop, disable, rewrite or
widen a guard: a changed column default or collation, view, privilege, default
privilege or row-level policy, a new function, view, collation, type or domain
in the schema, a definer function a store role owns, a table joined by
inheritance, a constraint or unique index added to a table the guarded
functions write, or a role other than the owner allowed to create objects in
the schema. The runner's self-check then performs one verification and one
erasure, always rolled back, and fails the run when either no longer works. The accounts, role events, current roles, projects and
members belong to `sovitech_db_access`, so no ordinary migration can alter them.
A table that must be updated (a job queue, for example) belongs in another
schema.

## Adding a function to schema `sovitech`

Every function of the schema is a registered guarded function, owned by its role and not
executable by everyone, and 0009's event trigger checks that at the end of every command; no
migration pauses the trigger (`src/migrate.test.ts`). Migration 0014 shows how an admin migration
adds one while every command leaves the invariants true: the administrator's own default
privilege drops PUBLIC's EXECUTE on functions for the few commands that register the function
under the administrator, create it, grant it, register it under its role and hand it over, and
is then put back; the migration checks both that the invariants hold and that no default
privilege of the administrator remains.
