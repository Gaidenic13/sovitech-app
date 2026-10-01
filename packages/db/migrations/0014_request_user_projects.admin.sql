-- 0014: the projects a request's own user is a member of (phase 3, the project list: UD-37;
-- PRD R-136, "the project list shows only the projects the user may access"; US-ADMIN-05;
-- guardrails rule 13, "Project boundary"). Runs as the database administrator.
-- Decisions: docs/adr/0036-wizard-api-contract.md (the project list), docs/adr/0013 (the trust boundary),
-- docs/adr/0014 (the guard invariants).
--
-- Why a function. Row-level security shows a request only the project in scope
-- (sovitech.current_project_id(), 0006 and 0007), so no request can list the projects its
-- user belongs to, and the app must not read memberships on the operator's login. This
-- function answers exactly that, and nothing more: for the request's own user
-- (sovitech.request_user_id()), each project whose members include that user, with its demo
-- flag and creation time. It never reveals another user's memberships, a project the user
-- is not a member of (holding a SOVITECH review role adds none: the engineer's queue is
-- phase 7), or any row of a project table. Each project's values are then read in a request
-- scoped to that project, under row-level security as ever.
--
-- It belongs to sovitech_db_access (which owns the projects and their members, and reads
-- them across projects), like the request views of 0006, so no ordinary migration can
-- replace it; it is registered with the guard as a guarded function (0009), not executable
-- by PUBLIC, and executable by the app's login only.
--
-- How it is added, under 0009's event trigger, which checks every command at its end and is
-- never paused (migrate.test.ts): each command below leaves every invariant true.
--  1. The administrator's own default privileges drop PUBLIC's EXECUTE on functions it creates,
--     so the function is never executable by everyone, not even between two commands. (A
--     default privilege of the administrator, not of a role of the store: 0009 records only
--     those. It is set for every schema because PostgreSQL cannot revoke a global default per
--     schema; the migration refuses to run if the administrator already had one of its own.)
--  2. The function is registered, first under the administrator who creates it, then created,
--     granted to the app's login, registered under sovitech_db_access and handed to it.
--  3. The default privilege of step 1 is put back as it was.
-- The runner then checks the invariants again and runs its self-check (refuseUnguarded).

DO $prepare$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_default_acl AS acl_default
    WHERE acl_default.defaclrole = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user) AND acl_default.defaclobjtype = 'f'
  ) THEN
    RAISE EXCEPTION 'the administrator already holds default privileges on functions; 0014 would change them';
  END IF;
END
$prepare$;

ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

INSERT INTO sovitech_guard.guarded_functions (signature, owner_role, security_definer) VALUES
  ('sovitech.request_user_projects()', current_user, true);

CREATE FUNCTION sovitech.request_user_projects()
RETURNS TABLE (project_id uuid, is_demo boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
  SELECT project.id, project.is_demo, project.created_at
  FROM sovitech.projects AS project
  WHERE sovitech.request_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM sovitech.project_members AS member
      WHERE member.project_id = project.id AND member.user_id = sovitech.request_user_id()
    )
  ORDER BY project.created_at, project.id
$$;

GRANT EXECUTE ON FUNCTION sovitech.request_user_projects() TO sovitech_db_app;

UPDATE sovitech_guard.guarded_functions SET owner_role = 'sovitech_db_access' WHERE signature = 'sovitech.request_user_projects()';
ALTER FUNCTION sovitech.request_user_projects() OWNER TO sovitech_db_access;

ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO PUBLIC;

DO $check$
DECLARE
  v_problems text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_default_acl AS acl_default
    WHERE acl_default.defaclrole = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user) AND acl_default.defaclobjtype = 'f'
  ) THEN
    RAISE EXCEPTION 'the administrator''s default privilege on functions was not put back';
  END IF;
  SELECT string_agg(found.problem, '; ')
  INTO v_problems
  FROM (
    SELECT problem FROM sovitech_guard.check_invariants()
    UNION ALL
    SELECT problem FROM sovitech_guard.unguarded_tables()
  ) AS found;
  IF v_problems IS NOT NULL THEN
    RAISE EXCEPTION 'the guards do not hold after 0014: %', v_problems;
  END IF;
END
$check$;
