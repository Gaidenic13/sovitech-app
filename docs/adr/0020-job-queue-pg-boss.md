# 0020. The analysis job queue: pg-boss in its own Postgres schema

- **Status:** Superseded by ADR 0026 (2026-09-26, phase 2): the queue is two tables in schema `sovitech_work`; pg-boss is not installed.
- **Date:** 2026-09-26

## Context

- **Prompt 3 section 10, phase 2, "Uploads":** "A job queue for analysis." Section 6: `apps/api` holds the Fastify API and the job worker. Section 8: one sandboxed job per file (ADR 0018).
- **Build log, phase 1 "Next":** "a job queue in another schema"; phase 2's writers write as a service account that is a member of the project; the store's guards require every table of schema `sovitech` to carry registered guards (ADR 0014), and an admin migration that changes a registered table pauses the DDL guard.
- **Rule 13:** logs and error reports never contain document text; documents stay with their project.
- **Options weighed** (both MIT, both Postgres-backed, so no new service): pg-boss 12.34.0 (Node 22.12 or later; depends on `pg` ^8.23.0) and graphile-worker 0.18.0 (Node 22.18 or later). No D row covers the queue.

## Decision

1. **pg-boss 12.34.0**, in `apps/api` (MIT). Its dependencies: `pg` (resolves to the same 8.23.0 that `packages/db` pins, so the tree holds one `pg`), `cron-parser` 5.10.1, `rrule-temporal` 2.2.6 with `temporal-spec` 1.0.1 (Apache-2.0), `serialize-error` 13.0.1 with `non-error`, `type-fest` 5.10.0 (MIT or CC0-1.0) and `tagged-tag`, and `luxon` 3.7.2; all MIT unless named.
2. **graphile-worker is not used:** 0.18.0 requires Node 22.18, and the machine and `.node-version` are at 22.17.1 with `engineStrict` on; it also installs its schema from the app at start.
3. **Its own schema, created by a migration, never by the app.** The queue lives in its own schema (the builder names it, for example `sovitech_jobs`), outside schema `sovitech`, so the value store's guards and `unguarded_tables()` are untouched. Its tables are created by a hand-written migration whose SQL is `getConstructionPlans(<schema>)` from pg-boss 12.34.0, committed as a file. The app constructs `PgBoss` with `migrate: false` and `createSchema: false`, so the app's database role runs no DDL. A pg-boss upgrade that changes the schema comes with its own migration (`getMigrationPlans`).
4. **Jobs carry ids only:** project id, document id, content hash and the job kind. Never file names, document text, excerpts or values, so neither the queue's rows nor its logs hold document text (rule 13). A job's error is stored as a code, not as the extractor's output.
5. **One analysis per document:** a singleton key of project id plus content hash, so a re-queued or duplicated upload does not run twice at once.
6. **The worker runs the sandbox** by starting `docker run` with the flags of ADR 0018 through `node:child_process` (no Docker client library), one container per job, killed at the job's time limit. Its output folder is keyed by project id plus content hash. The worker then writes through the store as the project's service account, and only after `verifyProposal` (the build log's phase 1 "Next").
7. **Scheduled jobs:** removing abandoned upload staging files (ADR 0019).

## Consequences

- No broker or extra service: the queue shares the local Postgres and the Testcontainers database in tests.
- Completed and failed jobs are deleted by pg-boss's maintenance after their retention period. That is right for queue rows, which are not candidates, evidence or events; the record of what was analysed is the document's analysis events in the value store.
- The worker needs the Docker socket; this is local development only (prompt 3 5.2, "Hosting").

## How to reverse

- **To graphile-worker:** once Node is at 22.18 or later, install it, create its schema by migration, and port the job handlers (the payloads are ids only, so they move unchanged).
- **To another queue:** the handlers take `{ projectId, documentId, contentHash, kind }` and nothing else; only the enqueue and subscribe calls change.
