-- 0006: the request context, role lookups and the account, role and project
-- functions. Runs as the database administrator, so each function is owned
-- by sovitech_db_access, a role nobody logs in as or is a member of: no
-- migration run by the migrator can replace one.
--
-- The request context: the data-access layer opens every request in a
-- transaction and sets, for that transaction only, the authenticated user
-- (sovitech.user_id) and the project in scope (sovitech.project_id). The API
-- authenticates; the database checks what that user may do.

CREATE FUNCTION sovitech.request_user_id() RETURNS uuid
LANGUAGE sql STABLE SET search_path = pg_catalog, pg_temp
AS $$ SELECT NULLIF(pg_catalog.current_setting('sovitech.user_id', true), '')::uuid $$;

-- Whether a user holds an app role now: the latest grant or revoke event decides.
-- The query reads the role events directly, not through a view, so nothing but
-- the events can change its answer (0009 also gives the events and the view to
-- sovitech_db_access, which no migration acts as).
CREATE FUNCTION sovitech.user_holds_role(p_user_id uuid, p_role text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
  SELECT coalesce((
    SELECT event.type = 'granted'
    FROM sovitech.app_role_events AS event
    WHERE event.user_id = p_user_id AND event.role = p_role
    ORDER BY event.at DESC, event.id DESC
    LIMIT 1
  ), false)
$$;

-- Whether the request's own user may write an event in the given role on the
-- given project (guardrails 2.4, rule 4 routing: "Each resolution records who";
-- rule 3; rule 10). The guard triggers of 0009 call it for candidate, field,
-- document and asset events, so an event's actor and role are the request's own:
--   sovitech_engineer: a person account holding sovitech_engineer;
--   owner: an account holding owner and a member of the project, a person, or
--          the demo seed on a demo project (prompt 3 section 7: the demo's owner
--          answers are written by a seed account labelled as demo input);
--   system: a service account that is a member of the project (a job acts for
--           the projects it was added to, never for every project an account
--           holding a review role could read).
-- The candidate guard of 0009 asks the same question for a candidate's author.
-- It reveals nothing about any other user.
CREATE FUNCTION sovitech.request_user_acts_as(p_project_id uuid, p_role text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user uuid := sovitech.request_user_id();
  v_kind text;
BEGIN
  IF v_user IS NULL THEN
    RETURN false;
  END IF;
  SELECT account.kind INTO v_kind FROM sovitech.app_users AS account WHERE account.id = v_user;
  IF v_kind IS NULL THEN
    RETURN false;
  END IF;
  IF p_role = 'sovitech_engineer' THEN
    RETURN v_kind = 'person' AND sovitech.user_holds_role(v_user, 'sovitech_engineer');
  ELSIF p_role = 'owner' THEN
    RETURN sovitech.user_holds_role(v_user, 'owner')
      AND EXISTS (
        SELECT 1 FROM sovitech.project_members AS member WHERE member.project_id = p_project_id AND member.user_id = v_user
      )
      AND (v_kind = 'person' OR (v_kind = 'seed' AND EXISTS (
        SELECT 1 FROM sovitech.projects AS project WHERE project.id = p_project_id AND project.is_demo
      )));
  ELSIF p_role = 'system' THEN
    RETURN v_kind = 'service' AND EXISTS (
      SELECT 1 FROM sovitech.project_members AS member WHERE member.project_id = p_project_id AND member.user_id = v_user
    );
  END IF;
  RETURN false;
END
$$;

-- The project the request may read and write, for row-level security (rule 13):
-- the project in scope, when the request's user is a member of it or holds a
-- SOVITECH review role; otherwise none, so no project row is visible.
CREATE FUNCTION sovitech.current_project_id() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_project uuid := NULLIF(pg_catalog.current_setting('sovitech.project_id', true), '')::uuid;
  v_user uuid := sovitech.request_user_id();
BEGIN
  IF v_project IS NULL OR v_user IS NULL THEN
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM sovitech.project_members AS member WHERE member.project_id = v_project AND member.user_id = v_user)
     OR sovitech.user_holds_role(v_user, 'sovitech_engineer')
     OR sovitech.user_holds_role(v_user, 'sovitech_commercial_reviewer') THEN
    RETURN v_project;
  END IF;
  RETURN NULL;
END
$$;

-- Who may administer accounts and roles: the operator's own database login, or
-- an app request by a person who holds sovitech_admin. Returns the acting
-- user's id (null for the operator login) or raises.
CREATE FUNCTION sovitech.administering_user() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user uuid := sovitech.request_user_id();
BEGIN
  IF session_user = 'sovitech_db_admin' THEN
    RETURN v_user;
  END IF;
  IF session_user = 'sovitech_db_app'
     AND v_user IS NOT NULL
     AND EXISTS (SELECT 1 FROM sovitech.app_users AS account WHERE account.id = v_user AND account.kind = 'person')
     AND sovitech.user_holds_role(v_user, 'sovitech_admin') THEN
    RETURN v_user;
  END IF;
  RAISE EXCEPTION USING ERRCODE = 'SVR01', MESSAGE = 'account and role changes need the operator login or a person holding sovitech_admin';
END
$$;

CREATE FUNCTION sovitech.create_app_user(p_user_id uuid, p_audit_id uuid, p_display_name text, p_kind text, p_reason text)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_actor uuid := sovitech.administering_user();
BEGIN
  INSERT INTO sovitech.app_users (id, display_name, kind) VALUES (p_user_id, p_display_name, p_kind);
  INSERT INTO sovitech.audit_events (id, type, actor_user_id, actor_database_role, target_user_id, details, reason)
  VALUES (p_audit_id, 'app_user_created', v_actor, session_user, p_user_id, jsonb_build_object('kind', p_kind), p_reason);
  RETURN p_user_id;
END
$$;

-- Granting any role is an audited event (prompt 3 section 10). Holding
-- sovitech_admin never permits verification: only sovitech_engineer does (0008),
-- so nobody grants or revokes their own role (an admin granting themself the
-- engineer role would verify), and the two SOVITECH review roles are granted on
-- the operator's login only, never from an app request, until PRD D-13 decides
-- who grants them (ADR 0013).
CREATE FUNCTION sovitech.grant_app_role(p_event_id uuid, p_audit_id uuid, p_user_id uuid, p_role text, p_reason text)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_actor uuid := sovitech.administering_user();
BEGIN
  IF v_actor IS NOT NULL AND v_actor = p_user_id THEN
    RAISE EXCEPTION USING ERRCODE = 'SVR03', MESSAGE = 'nobody grants or revokes their own app role';
  END IF;
  IF p_role IN ('sovitech_engineer', 'sovitech_commercial_reviewer') AND session_user <> 'sovitech_db_admin' THEN
    RAISE EXCEPTION USING ERRCODE = 'SVR04',
      MESSAGE = format('%s is granted on the operator login only, until PRD D-13 decides who grants it', p_role);
  END IF;
  IF sovitech.user_holds_role(p_user_id, p_role) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVR02', MESSAGE = format('the user already holds %s', p_role);
  END IF;
  INSERT INTO sovitech.app_role_events (id, user_id, role, type, actor_user_id, actor_database_role, reason)
  VALUES (p_event_id, p_user_id, p_role, 'granted', v_actor, session_user, p_reason);
  INSERT INTO sovitech.audit_events (id, type, actor_user_id, actor_database_role, target_user_id, details, reason)
  VALUES (p_audit_id, 'app_role_granted', v_actor, session_user, p_user_id, jsonb_build_object('role', p_role, 'role_event_id', p_event_id), p_reason);
  RETURN p_event_id;
END
$$;

CREATE FUNCTION sovitech.revoke_app_role(p_event_id uuid, p_audit_id uuid, p_user_id uuid, p_role text, p_reason text)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_actor uuid := sovitech.administering_user();
BEGIN
  IF v_actor IS NOT NULL AND v_actor = p_user_id THEN
    RAISE EXCEPTION USING ERRCODE = 'SVR03', MESSAGE = 'nobody grants or revokes their own app role';
  END IF;
  IF NOT sovitech.user_holds_role(p_user_id, p_role) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVR02', MESSAGE = format('the user does not hold %s', p_role);
  END IF;
  INSERT INTO sovitech.app_role_events (id, user_id, role, type, actor_user_id, actor_database_role, reason)
  VALUES (p_event_id, p_user_id, p_role, 'revoked', v_actor, session_user, p_reason);
  INSERT INTO sovitech.audit_events (id, type, actor_user_id, actor_database_role, target_user_id, details, reason)
  VALUES (p_audit_id, 'app_role_revoked', v_actor, session_user, p_user_id, jsonb_build_object('role', p_role, 'role_event_id', p_event_id), p_reason);
  RETURN p_event_id;
END
$$;

-- A new project, its project subject and its creator's membership, in one step.
-- Rule 10, "Demo data": demo projects are flagged demo, and the demo is built by
-- the demo seed. So the seed account creates only demo projects, and nobody
-- else creates one: the flag follows the creator's account kind, never the
-- caller's word alone (ADR 0015).
CREATE FUNCTION sovitech.create_project(p_project_id uuid, p_audit_id uuid, p_is_demo boolean)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user uuid := sovitech.request_user_id();
  v_kind text;
BEGIN
  SELECT account.kind INTO v_kind FROM sovitech.app_users AS account WHERE account.id = v_user;
  IF session_user <> 'sovitech_db_app' OR v_user IS NULL OR v_kind IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'SVR01', MESSAGE = 'a project is created by an app request with a known user';
  END IF;
  IF p_is_demo IS DISTINCT FROM (v_kind = 'seed') THEN
    RAISE EXCEPTION USING ERRCODE = 'SVR05',
      MESSAGE = 'a demo project is created only by the demo seed account, and the seed creates only demo projects';
  END IF;
  INSERT INTO sovitech.projects (id, is_demo, created_by) VALUES (p_project_id, p_is_demo, v_user);
  INSERT INTO sovitech.subjects (id, project_id, kind, created_by) VALUES (p_project_id, p_project_id, 'project', v_user::text);
  INSERT INTO sovitech.project_members (project_id, user_id, added_by) VALUES (p_project_id, v_user, v_user);
  INSERT INTO sovitech.audit_events (id, project_id, type, actor_user_id, actor_database_role, details)
  VALUES (p_audit_id, p_project_id, 'project_created', v_user, session_user, jsonb_build_object('is_demo', p_is_demo));
  RETURN p_project_id;
END
$$;

-- A person who holds owner and is a member of the project, in an app request,
-- or the operator's login adds a member; nobody adds themself. Holding
-- sovitech_admin alone gives no access to a project's documents and values
-- (ADR 0013), so an admin who is not a member cannot make themself one; and a
-- job's service account, or the demo seed, never decides who belongs to a
-- project (rule 13, "Project boundary"): the operator's login adds those.
CREATE FUNCTION sovitech.add_project_member(p_project_id uuid, p_user_id uuid, p_audit_id uuid)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user uuid := sovitech.request_user_id();
BEGIN
  IF v_user IS NOT NULL AND v_user = p_user_id THEN
    RAISE EXCEPTION USING ERRCODE = 'SVR03', MESSAGE = 'nobody adds themself to a project';
  END IF;
  IF NOT (
       session_user = 'sovitech_db_admin'
       OR (session_user = 'sovitech_db_app' AND v_user IS NOT NULL
           AND EXISTS (SELECT 1 FROM sovitech.app_users AS account WHERE account.id = v_user AND account.kind = 'person')
           AND sovitech.user_holds_role(v_user, 'owner')
           AND EXISTS (
             SELECT 1 FROM sovitech.project_members AS member WHERE member.project_id = p_project_id AND member.user_id = v_user
           ))
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVR01',
      MESSAGE = 'a person holding owner who is a member of the project, or the operator login, adds a member';
  END IF;
  INSERT INTO sovitech.project_members (project_id, user_id, added_by) VALUES (p_project_id, p_user_id, v_user);
  INSERT INTO sovitech.audit_events (id, project_id, type, actor_user_id, actor_database_role, target_user_id)
  VALUES (p_audit_id, p_project_id, 'project_member_added', v_user, session_user, p_user_id);
  RETURN p_user_id;
END
$$;

-- What the app reads about accounts and roles: its own account, and the members
-- of the project in scope (rule 13, project boundary). Owned by
-- sovitech_db_access, so the app needs no read on the tables behind them; the
-- operator's login reads the tables in full (0001).
CREATE VIEW sovitech.request_accounts WITH (security_barrier) AS
SELECT account.id, account.display_name, account.kind
FROM sovitech.app_users AS account
WHERE account.id = sovitech.request_user_id()
   OR account.id IN (
     SELECT member.user_id FROM sovitech.project_members AS member
     WHERE member.project_id = sovitech.current_project_id()
   );

CREATE VIEW sovitech.request_account_roles WITH (security_barrier) AS
SELECT held.user_id, held.role, held.since
FROM sovitech.app_user_roles AS held
WHERE held.user_id = sovitech.request_user_id()
   OR held.user_id IN (
     SELECT member.user_id FROM sovitech.project_members AS member
     WHERE member.project_id = sovitech.current_project_id()
   );

ALTER VIEW sovitech.request_accounts OWNER TO sovitech_db_access;
ALTER VIEW sovitech.request_account_roles OWNER TO sovitech_db_access;
REVOKE ALL ON sovitech.request_accounts, sovitech.request_account_roles FROM PUBLIC;
GRANT SELECT ON sovitech.request_accounts, sovitech.request_account_roles TO sovitech_db_app;

ALTER FUNCTION sovitech.request_user_id() OWNER TO sovitech_db_access;
ALTER FUNCTION sovitech.user_holds_role(uuid, text) OWNER TO sovitech_db_access;
ALTER FUNCTION sovitech.request_user_acts_as(uuid, text) OWNER TO sovitech_db_access;
ALTER FUNCTION sovitech.current_project_id() OWNER TO sovitech_db_access;
ALTER FUNCTION sovitech.administering_user() OWNER TO sovitech_db_access;
ALTER FUNCTION sovitech.create_app_user(uuid, uuid, text, text, text) OWNER TO sovitech_db_access;
ALTER FUNCTION sovitech.grant_app_role(uuid, uuid, uuid, text, text) OWNER TO sovitech_db_access;
ALTER FUNCTION sovitech.revoke_app_role(uuid, uuid, uuid, text, text) OWNER TO sovitech_db_access;
ALTER FUNCTION sovitech.create_project(uuid, uuid, boolean) OWNER TO sovitech_db_access;
ALTER FUNCTION sovitech.add_project_member(uuid, uuid, uuid) OWNER TO sovitech_db_access;

REVOKE ALL ON FUNCTION
  sovitech.request_user_id(), sovitech.user_holds_role(uuid, text), sovitech.request_user_acts_as(uuid, text),
  sovitech.current_project_id(), sovitech.administering_user(), sovitech.create_app_user(uuid, uuid, text, text, text),
  sovitech.grant_app_role(uuid, uuid, uuid, text, text), sovitech.revoke_app_role(uuid, uuid, uuid, text, text),
  sovitech.create_project(uuid, uuid, boolean), sovitech.add_project_member(uuid, uuid, uuid)
FROM PUBLIC;

-- Row-level security and the request views call these as whichever role reads a
-- project table; the guard triggers (0009) call the request check as whichever
-- role writes an event. Each answers only for the request's own user.
GRANT EXECUTE ON FUNCTION sovitech.request_user_id(), sovitech.current_project_id(), sovitech.request_user_acts_as(uuid, text)
  TO sovitech_db_owner, sovitech_db_app, sovitech_db_admin, sovitech_db_guard, sovitech_db_verifier, sovitech_db_eraser;
-- Any user's roles: only the definer functions of 0008 ask (for the request's user).
GRANT EXECUTE ON FUNCTION sovitech.user_holds_role(uuid, text) TO sovitech_db_verifier, sovitech_db_eraser;
GRANT EXECUTE ON FUNCTION
  sovitech.create_app_user(uuid, uuid, text, text, text),
  sovitech.grant_app_role(uuid, uuid, uuid, text, text), sovitech.revoke_app_role(uuid, uuid, uuid, text, text),
  sovitech.add_project_member(uuid, uuid, uuid)
  TO sovitech_db_app, sovitech_db_admin;
GRANT EXECUTE ON FUNCTION sovitech.create_project(uuid, uuid, boolean) TO sovitech_db_app;

GRANT SELECT, INSERT ON sovitech.app_users, sovitech.app_role_events, sovitech.projects, sovitech.project_members,
  sovitech.audit_events, sovitech.subjects TO sovitech_db_access;
GRANT SELECT ON sovitech.app_user_roles TO sovitech_db_access;
