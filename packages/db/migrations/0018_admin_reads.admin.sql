-- 0018: the development-only admin area's reads (phase 7; prompt 3 section 9: "UD-39, users, roles and processors
-- (processors read-only ...), UD-40, datasets read-only, and UD-41, guardrail events and erasure requests: phase 7, as
-- development-only admin that never creates approval records"; PRD R-134, R-151, R-152, R-154 and R-155 and their
-- "Until decided" lines). Runs as the database administrator, on 0014's pattern for a function and 0016's for a guard
-- added to a registered table. Decisions: docs/adr/0053-phase-7-scope-and-the-admin-area.md decisions 5 and 6,
-- docs/adr/0013 (amended: the admin's definer functions and their refusal code), docs/adr/0054 decision 3.
--
-- Why definer functions. Row-level security shows a request one project, and the app's login reads no account or role
-- table beyond the request's own (0006, 0007). An admin works across projects but holds no access to a project's
-- documents and values (ADR 0013 decision 5): `sovitech_admin` adds nothing to `current_project_id()`. So the admin
-- reads through these functions, and through nothing else:
--   admin_accounts()                every account, its kind and the roles it holds now, each with the time of the grant
--   admin_role_events()             every grant and revoke of an app role: who acted (an account, or the operator's
--                                   login), when, and the reason as recorded
--   admin_projects()                every project by id: its demo flag, creation time and members (no name: a
--                                   project's name is its owner's step 1 answer, a value)
--   admin_guardrail_counts()        section 8's events counted per project and type, every type for every project, and
--                                   per type in all projects
--   admin_calibration_decisions()   rule 3's decisions on inferences (ADR 0054 decision 3): the tier recorded with each,
--                                   the item type (field key), the outcome (agreed or corrected), who (owner or
--                                   engineer) and when; no project, subject, candidate or value
--   admin_inference_decisions()     per project, the owner's confirmations and corrections of inferences (section 4's
--                                   owner correction rate)
--   admin_erasures()                one entry per `erased` document event, with its erasure's audit record: who asked
--                                   (the owner's account, or the system), the role, when, the document's id and the
--                                   counts of what was removed (rule 13; never document text, an excerpt or a name)
-- Each one first calls admin_reading_user(), which refuses (SVR06) every request but an app request whose user is a
-- person holding `sovitech_admin` now; holding it never permits verification (0008 asks for sovitech_engineer only).
-- None writes anything. None returns a candidate's value, an evidence entry, an excerpt, extracted text, a file name or
-- a project's name (rule 13, "Project boundary" and "Isolation"; cases G13-15 and G13-16).
--
-- What they read. They belong to sovitech_db_access, the role that already reads the accounts, roles, projects,
-- members and audit events across projects (0006, 0009). To count events it is given SELECT on exactly the columns the
-- reads name, on four registered tables: guardrail_events (project, type, field key, reason code, time),
-- document_events (id, project, document, type, role, time), candidate_events (project, candidate, type, role, reason,
-- time) and candidates (id, project, field key, source). No value, unit, qualifier, text, excerpt, locator, file or
-- name column. Each grant is told to the guard before the command that makes it (0016's pattern), so 0009's event
-- trigger, which checks every command at its end and is never paused (migrate.test.ts), finds it recorded.
--
-- How the functions are added, each command leaving every invariant true (0014's pattern): the administrator's own
-- default privilege drops PUBLIC's EXECUTE on functions for the commands that register each function under the
-- administrator just before creating it (a function registered and not yet created fails the check), create it, grant it to the app's login (the seven reads; the check is called only by them), register
-- it under sovitech_db_access and hand it over; then the default privilege is put back. The migration checks that no
-- default privilege of the administrator remains and that the guards hold; the runner then checks again and runs its
-- self-check.

DO $prepare$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_default_acl AS acl_default
    WHERE acl_default.defaclrole = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user) AND acl_default.defaclobjtype = 'f'
  ) THEN
    RAISE EXCEPTION 'the administrator already holds default privileges on functions; 0018 would change them';
  END IF;
END
$prepare$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. The access role's column reads, each recorded with the guard before it is granted.
-- ---------------------------------------------------------------------------------------------------------------------

DO $reads$
DECLARE
  wanted record;
  v_definition text;
  v_columns text;
BEGIN
  FOR wanted IN
    SELECT * FROM (VALUES
      ('guardrail_events', ARRAY['project_id', 'type', 'field_key', 'reason', 'at']),
      ('document_events', ARRAY['id', 'project_id', 'document_id', 'type', 'role', 'at']),
      ('candidate_events', ARRAY['project_id', 'candidate_id', 'type', 'role', 'reason', 'at']),
      ('candidates', ARRAY['id', 'project_id', 'field_key', 'source'])
    ) AS reads (table_name, columns)
  LOOP
    IF EXISTS (
      SELECT 1 FROM sovitech_guard.recorded_shape AS recorded
      WHERE recorded.table_name = wanted.table_name AND recorded.kind = 'privilege' AND recorded.name = 'sovitech_db_access'
    ) THEN
      RAISE EXCEPTION 'sovitech_db_access already holds a privilege on sovitech.%; 0018 would change it', wanted.table_name;
    END IF;
    -- The privilege as 0009's current_shape() writes it: one entry per column, "SELECT (<column>)", in order.
    SELECT string_agg(entry, ', ' ORDER BY entry) INTO v_definition
    FROM (SELECT 'SELECT (' || column_name || ')' AS entry FROM pg_catalog.unnest(wanted.columns) AS column_name) AS entries;
    INSERT INTO sovitech_guard.recorded_shape (table_name, kind, name, definition)
    VALUES (wanted.table_name, 'privilege', 'sovitech_db_access', v_definition);
    SELECT string_agg(pg_catalog.quote_ident(column_name), ', ') INTO v_columns FROM pg_catalog.unnest(wanted.columns) AS column_name;
    EXECUTE format('GRANT SELECT (%s) ON sovitech.%I TO sovitech_db_access', v_columns, wanted.table_name);
  END LOOP;
END
$reads$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. The functions.
-- ---------------------------------------------------------------------------------------------------------------------

ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Who may read the admin area: an app request by a person who holds sovitech_admin now. Returns that user's id, or
-- raises SVR06. The operator's login reads the account tables itself (0001) and never calls this.
INSERT INTO sovitech_guard.guarded_functions (signature, owner_role, security_definer) VALUES ('sovitech.admin_reading_user()', current_user, true);
CREATE FUNCTION sovitech.admin_reading_user() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user uuid := sovitech.request_user_id();
BEGIN
  IF session_user = 'sovitech_db_app'
     AND v_user IS NOT NULL
     AND EXISTS (SELECT 1 FROM sovitech.app_users AS account WHERE account.id = v_user AND account.kind = 'person')
     AND sovitech.user_holds_role(v_user, 'sovitech_admin') THEN
    RETURN v_user;
  END IF;
  RAISE EXCEPTION USING ERRCODE = 'SVR06', MESSAGE = 'the admin area is read only by a person holding sovitech_admin, in an app request';
END
$$;

INSERT INTO sovitech_guard.guarded_functions (signature, owner_role, security_definer) VALUES ('sovitech.admin_accounts()', current_user, true);
CREATE FUNCTION sovitech.admin_accounts()
RETURNS TABLE (user_id uuid, display_name text, kind text, roles text[], roles_since text[], created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
#variable_conflict use_column
BEGIN
  PERFORM sovitech.admin_reading_user();
  RETURN QUERY
  SELECT account.id, account.display_name, account.kind,
         coalesce(pg_catalog.array_agg(held.role ORDER BY held.role) FILTER (WHERE held.role IS NOT NULL), ARRAY[]::text[]),
         -- Each grant's time as ISO 8601 text in UTC with microseconds, as the data-access layer reads every time.
         coalesce(pg_catalog.array_agg(pg_catalog.to_char(held.since AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') ORDER BY held.role)
                    FILTER (WHERE held.role IS NOT NULL), ARRAY[]::text[]),
         account.created_at
  FROM sovitech.app_users AS account
  LEFT JOIN sovitech.app_user_roles AS held ON held.user_id = account.id
  GROUP BY account.id, account.display_name, account.kind, account.created_at
  ORDER BY account.created_at, account.id;
END
$$;

-- Every grant and revoke (ADR 0013 decision 2: "App roles are events"). A role is granted on the operator's login or
-- in an app request by a person holding sovitech_admin (0006 administering_user): `by_operator` names the first, and
-- `by_user_id` the acting person for the second.
INSERT INTO sovitech_guard.guarded_functions (signature, owner_role, security_definer) VALUES ('sovitech.admin_role_events()', current_user, true);
CREATE FUNCTION sovitech.admin_role_events()
RETURNS TABLE (event_id uuid, user_id uuid, role text, change text, by_user_id uuid, by_operator boolean, at timestamptz, reason text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
#variable_conflict use_column
BEGIN
  PERFORM sovitech.admin_reading_user();
  RETURN QUERY
  SELECT event.id, event.user_id, event.role, event.type,
         CASE WHEN event.actor_database_role = 'sovitech_db_app' THEN event.actor_user_id END,
         event.actor_database_role <> 'sovitech_db_app',
         event.at, event.reason
  FROM sovitech.app_role_events AS event
  ORDER BY event.at DESC, event.id DESC;
END
$$;

INSERT INTO sovitech_guard.guarded_functions (signature, owner_role, security_definer) VALUES ('sovitech.admin_projects()', current_user, true);
CREATE FUNCTION sovitech.admin_projects()
RETURNS TABLE (project_id uuid, is_demo boolean, created_at timestamptz, member_ids uuid[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
#variable_conflict use_column
BEGIN
  PERFORM sovitech.admin_reading_user();
  RETURN QUERY
  SELECT project.id, project.is_demo, project.created_at,
         coalesce((
           SELECT pg_catalog.array_agg(member.user_id ORDER BY member.added_at, member.user_id)
           FROM sovitech.project_members AS member WHERE member.project_id = project.id
         ), ARRAY[]::uuid[])
  FROM sovitech.projects AS project
  ORDER BY project.created_at, project.id;
END
$$;

-- Section 8's events counted (R-142, R-151): every type of section 8, in its order, for every project, a count of none
-- included (a count the store made, never a stand-in), and then each type in all projects (the rows whose project is
-- null). The list is section 8's (the table's CHECK holds the same ten; the store tests compare it with the domain's).
INSERT INTO sovitech_guard.guarded_functions (signature, owner_role, security_definer) VALUES ('sovitech.admin_guardrail_counts()', current_user, true);
CREATE FUNCTION sovitech.admin_guardrail_counts()
RETURNS TABLE (project_id uuid, is_demo boolean, type text, count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
#variable_conflict use_column
BEGIN
  PERFORM sovitech.admin_reading_user();
  RETURN QUERY
  WITH kinds AS (
    SELECT kind.type, kind.position
    FROM pg_catalog.unnest(ARRAY[
      'ai_output_rejected', 'evidence_not_found', 'question_for_known_field', 'owner_corrected_inference',
      'engineer_corrected_accepted_item', 'conflict_raised', 'reserved_term_blocked', 'embedded_instruction',
      'confirmation_budget_exceeded', 'skipped'
    ]::text[]) WITH ORDINALITY AS kind (type, position)
  )
  SELECT counted.project_id, counted.is_demo, counted.type, counted.count
  FROM (
    SELECT project.id AS project_id, project.is_demo AS is_demo, kinds.type AS type, kinds.position AS position,
           false AS in_all, project.created_at AS created_at,
           (SELECT pg_catalog.count(*)::integer FROM sovitech.guardrail_events AS event
            WHERE event.project_id = project.id AND event.type = kinds.type) AS count
    FROM sovitech.projects AS project CROSS JOIN kinds
    UNION ALL
    SELECT NULL::uuid, NULL::boolean, kinds.type, kinds.position, true, NULL::timestamptz,
           (SELECT pg_catalog.count(*)::integer FROM sovitech.guardrail_events AS event WHERE event.type = kinds.type)
    FROM kinds
  ) AS counted
  ORDER BY counted.in_all, counted.created_at, counted.project_id, counted.position;
END
$$;

-- Rule 3's decisions on inferences (ADR 0054 decision 3), app-wide. The tier is the one recorded with the decision
-- ("confidence:<tier>"), never recomputed; a decision recorded without one reads 'unstated'.
--   - the owner's correction of an inference: section 8's owner_corrected_inference event (its reason holds the tier);
--   - the owner's confirmation of an inference: the owner's user_confirmed event on an ai_inference candidate;
--   - an engineer's verification (agreement) or rejection (correction) of an inference: none while PRD D-16 is open.
-- "Looks right" (owner_acknowledged) and "Something's wrong" (the owner's rejection with no value) are no decision on
-- confidence and are not read.
INSERT INTO sovitech_guard.guarded_functions (signature, owner_role, security_definer) VALUES ('sovitech.admin_calibration_decisions()', current_user, true);
CREATE FUNCTION sovitech.admin_calibration_decisions()
RETURNS TABLE (tier text, field_key text, outcome text, by_role text, at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
#variable_conflict use_column
BEGIN
  PERFORM sovitech.admin_reading_user();
  RETURN QUERY
  SELECT CASE WHEN decided.reason IN ('confidence:high', 'confidence:medium', 'confidence:low')
              THEN pg_catalog.substr(decided.reason, 12) ELSE 'unstated' END,
         decided.field_key, decided.outcome, decided.by_role, decided.at
  FROM (
    SELECT event.reason AS reason, event.field_key AS field_key, 'corrected'::text AS outcome, 'owner'::text AS by_role, event.at AS at
    FROM sovitech.guardrail_events AS event
    WHERE event.type = 'owner_corrected_inference' AND event.field_key IS NOT NULL
    UNION ALL
    SELECT confirmed.reason, candidate.field_key, 'agreed'::text, 'owner'::text, confirmed.at
    FROM sovitech.candidate_events AS confirmed
    JOIN sovitech.candidates AS candidate ON candidate.project_id = confirmed.project_id AND candidate.id = confirmed.candidate_id
    WHERE confirmed.type = 'user_confirmed' AND confirmed.role = 'owner' AND candidate.source = 'ai_inference'
    UNION ALL
    SELECT checked.reason, candidate.field_key,
           CASE WHEN checked.type = 'engineer_verified' THEN 'agreed'::text ELSE 'corrected'::text END, 'sovitech_engineer'::text, checked.at
    FROM sovitech.candidate_events AS checked
    JOIN sovitech.candidates AS candidate ON candidate.project_id = checked.project_id AND candidate.id = checked.candidate_id
    WHERE checked.role = 'sovitech_engineer' AND checked.type IN ('engineer_verified', 'rejected') AND candidate.source = 'ai_inference'
  ) AS decided
  ORDER BY decided.at, decided.outcome, decided.field_key;
END
$$;

-- Section 4's owner correction rate on inferences, per project: the owner's confirmations and corrections of
-- inferences. Every project has a row; a count read here is a count, a count of none included.
INSERT INTO sovitech_guard.guarded_functions (signature, owner_role, security_definer) VALUES ('sovitech.admin_inference_decisions()', current_user, true);
CREATE FUNCTION sovitech.admin_inference_decisions()
RETURNS TABLE (project_id uuid, confirmations integer, corrections integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
#variable_conflict use_column
BEGIN
  PERFORM sovitech.admin_reading_user();
  RETURN QUERY
  SELECT project.id,
         (SELECT pg_catalog.count(*)::integer
          FROM sovitech.candidate_events AS confirmed
          JOIN sovitech.candidates AS candidate ON candidate.project_id = confirmed.project_id AND candidate.id = confirmed.candidate_id
          WHERE confirmed.project_id = project.id AND confirmed.type = 'user_confirmed' AND confirmed.role = 'owner'
            AND candidate.source = 'ai_inference'),
         (SELECT pg_catalog.count(*)::integer
          FROM sovitech.guardrail_events AS event
          WHERE event.project_id = project.id AND event.type = 'owner_corrected_inference')
  FROM sovitech.projects AS project
  ORDER BY project.created_at, project.id;
END
$$;

-- Rule 13's erasure log (R-151, US-ADMIN-23; R-155 "Until decided": deleting a document is the only erasure): one entry
-- per `erased` document event, with the counts its audit record holds (0008, 0011: the same transaction writes both).
-- Who asked: the owner's account for an owner's erasure, none for the system's. Never the document's file name, its
-- text, an excerpt or the caller's reason.
INSERT INTO sovitech_guard.guarded_functions (signature, owner_role, security_definer) VALUES ('sovitech.admin_erasures()', current_user, true);
CREATE FUNCTION sovitech.admin_erasures()
RETURNS TABLE (document_event_id uuid, project_id uuid, is_demo boolean, document_id uuid, role text, by_user_id uuid, at timestamptz,
  excerpts_erased integer, text_parts_deleted integer, candidates_withdrawn integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
#variable_conflict use_column
BEGIN
  PERFORM sovitech.admin_reading_user();
  RETURN QUERY
  SELECT erased.id, erased.project_id, project.is_demo, erased.document_id, erased.role,
         CASE WHEN erased.role = 'owner' THEN audit.actor_user_id END,
         erased.at,
         (audit.details ->> 'excerpts_erased')::integer,
         (audit.details ->> 'text_parts_deleted')::integer,
         (audit.details ->> 'candidates_withdrawn')::integer
  FROM sovitech.document_events AS erased
  JOIN sovitech.projects AS project ON project.id = erased.project_id
  LEFT JOIN sovitech.audit_events AS audit
    ON audit.type = 'document_erased' AND audit.project_id = erased.project_id AND audit.document_id = erased.document_id
   AND audit.details ->> 'document_event_id' = erased.id::text
  WHERE erased.type = 'erased'
  ORDER BY erased.at DESC, erased.id DESC;
END
$$;

GRANT EXECUTE ON FUNCTION
  sovitech.admin_accounts(), sovitech.admin_role_events(), sovitech.admin_projects(), sovitech.admin_guardrail_counts(),
  sovitech.admin_calibration_decisions(), sovitech.admin_inference_decisions(), sovitech.admin_erasures()
TO sovitech_db_app;

-- Each function handed to sovitech_db_access, its registration first (one at a time: the check runs after each command).
UPDATE sovitech_guard.guarded_functions SET owner_role = 'sovitech_db_access' WHERE signature = 'sovitech.admin_reading_user()';
ALTER FUNCTION sovitech.admin_reading_user() OWNER TO sovitech_db_access;
UPDATE sovitech_guard.guarded_functions SET owner_role = 'sovitech_db_access' WHERE signature = 'sovitech.admin_accounts()';
ALTER FUNCTION sovitech.admin_accounts() OWNER TO sovitech_db_access;
UPDATE sovitech_guard.guarded_functions SET owner_role = 'sovitech_db_access' WHERE signature = 'sovitech.admin_role_events()';
ALTER FUNCTION sovitech.admin_role_events() OWNER TO sovitech_db_access;
UPDATE sovitech_guard.guarded_functions SET owner_role = 'sovitech_db_access' WHERE signature = 'sovitech.admin_projects()';
ALTER FUNCTION sovitech.admin_projects() OWNER TO sovitech_db_access;
UPDATE sovitech_guard.guarded_functions SET owner_role = 'sovitech_db_access' WHERE signature = 'sovitech.admin_guardrail_counts()';
ALTER FUNCTION sovitech.admin_guardrail_counts() OWNER TO sovitech_db_access;
UPDATE sovitech_guard.guarded_functions SET owner_role = 'sovitech_db_access' WHERE signature = 'sovitech.admin_calibration_decisions()';
ALTER FUNCTION sovitech.admin_calibration_decisions() OWNER TO sovitech_db_access;
UPDATE sovitech_guard.guarded_functions SET owner_role = 'sovitech_db_access' WHERE signature = 'sovitech.admin_inference_decisions()';
ALTER FUNCTION sovitech.admin_inference_decisions() OWNER TO sovitech_db_access;
UPDATE sovitech_guard.guarded_functions SET owner_role = 'sovitech_db_access' WHERE signature = 'sovitech.admin_erasures()';
ALTER FUNCTION sovitech.admin_erasures() OWNER TO sovitech_db_access;

ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO PUBLIC;

-- The shape as installed (the four column reads above were recorded before their grants).
SELECT sovitech_guard.record_shape();

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
    RAISE EXCEPTION 'the guards do not hold after 0018: %', v_problems;
  END IF;
END
$check$;
