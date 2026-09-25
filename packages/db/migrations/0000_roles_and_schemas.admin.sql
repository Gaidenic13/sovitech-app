-- 0000: database roles and schemas. Runs as the database administrator
-- (a superuser), because roles are cluster objects and schema ownership is
-- given here. See docs/adr/ on the database for why each role exists.
--
-- Login roles (passwords are set by the migration runner, never here):
--   sovitech_db_migrator  runs ordinary migrations; may SET ROLE to the owner
--   sovitech_db_app       the API: reads, appends and calls the guarded functions
--   sovitech_db_admin     the operator's tools: accounts and roles through functions
-- Roles nobody logs in as and nobody is a member of:
--   sovitech_db_owner     owns the schema and every table
--   sovitech_db_guard     owns the guard trigger functions and the invariant check
--   sovitech_db_verifier  owns the one function that writes engineer_verified
--   sovitech_db_eraser    owns the one audited erasure function
--   sovitech_db_access    owns the account, role and project functions, and (from
--                         0009) the account, role and project tables they trust

DO $roles$
DECLARE
  entry record;
BEGIN
  FOR entry IN
    SELECT * FROM (VALUES
      ('sovitech_db_owner', false),
      ('sovitech_db_migrator', true),
      ('sovitech_db_app', true),
      ('sovitech_db_admin', true),
      ('sovitech_db_guard', false),
      ('sovitech_db_verifier', false),
      ('sovitech_db_eraser', false),
      ('sovitech_db_access', false)
    ) AS wanted (name, can_login)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = entry.name) THEN
      EXECUTE format(
        'CREATE ROLE %I %s NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS',
        entry.name,
        CASE WHEN entry.can_login THEN 'LOGIN' ELSE 'NOLOGIN' END
      );
    END IF;
  END LOOP;
END
$roles$;

-- The two definer roles that read across projects by design: the access
-- functions (membership and role lookups) and the guard's existence checks.
ALTER ROLE sovitech_db_access BYPASSRLS;
ALTER ROLE sovitech_db_guard BYPASSRLS;

-- The migrator acts as the owner only by SET ROLE, inside a migration.
GRANT sovitech_db_owner TO sovitech_db_migrator WITH INHERIT FALSE, SET TRUE;

-- Only our login roles connect.
DO $connect$
BEGIN
  EXECUTE format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database());
  EXECUTE format(
    'GRANT CONNECT, TEMPORARY ON DATABASE %I TO sovitech_db_migrator, sovitech_db_app, sovitech_db_admin',
    current_database()
  );
END
$connect$;

-- Rule 13, "Logs and error reports never contain document text": for every
-- session of this database, the server log leaves out an error's DETAIL (a
-- failing row or key, which can hold stored text) and the failing statement.
-- Both settings are superuser-only, so no login role can switch them back.
-- The data-access layer strips the same parts from the errors it throws
-- (packages/db/src/errors.ts).
DO $logging$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET log_error_verbosity = terse', current_database());
  EXECUTE format('ALTER DATABASE %I SET log_min_error_statement = panic', current_database());
END
$logging$;

CREATE SCHEMA IF NOT EXISTS sovitech AUTHORIZATION sovitech_db_owner;
CREATE SCHEMA IF NOT EXISTS sovitech_guard AUTHORIZATION sovitech_db_guard;
REVOKE ALL ON SCHEMA sovitech FROM PUBLIC;
REVOKE ALL ON SCHEMA sovitech_guard FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA sovitech
  TO sovitech_db_app, sovitech_db_admin, sovitech_db_guard, sovitech_db_verifier, sovitech_db_eraser, sovitech_db_access;
-- The migrator and the operator call the guards' checks (0009); nothing there is theirs to change.
GRANT USAGE ON SCHEMA sovitech_guard TO sovitech_db_migrator, sovitech_db_admin;

-- Functions the owner creates are not callable by everyone by default.
ALTER DEFAULT PRIVILEGES FOR ROLE sovitech_db_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- The migration record (created by the runner before this file) is written by the migrator.
GRANT USAGE ON SCHEMA sovitech_meta TO sovitech_db_migrator;
GRANT SELECT, INSERT ON sovitech_meta.schema_migrations TO sovitech_db_migrator;
