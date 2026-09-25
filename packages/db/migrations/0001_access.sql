-- 0001: accounts, app roles, projects and the audit trail. Runs as
-- sovitech_db_owner. Rows here are written only through the access functions
-- (0006) and the erasure function (0008); the guards (0009) refuse any other
-- writer and every update or delete. The relations the definer functions trust
-- for who a user is and what they hold (accounts, role events and the current
-- roles, projects and members) move to sovitech_db_access in 0009, so no
-- ordinary migration can alter or replace them.

CREATE TABLE sovitech.app_users (
  id uuid PRIMARY KEY,
  display_name text NOT NULL CHECK (btrim(display_name) <> ''),
  -- person: a human account; service: a job or integration; seed: the demo seed.
  -- Only a person can verify (rule 10: no script, seed or service account).
  kind text NOT NULL CHECK (kind IN ('person', 'service', 'seed')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Granting and revoking an app role are events; the current roles are derived.
CREATE TABLE sovitech.app_role_events (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES sovitech.app_users (id),
  role text NOT NULL CHECK (role IN ('owner', 'sovitech_engineer', 'sovitech_commercial_reviewer', 'sovitech_admin')),
  type text NOT NULL CHECK (type IN ('granted', 'revoked')),
  actor_user_id uuid REFERENCES sovitech.app_users (id),
  actor_database_role text NOT NULL CHECK (btrim(actor_database_role) <> ''),
  at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reason text NOT NULL CHECK (btrim(reason) <> '')
);
CREATE INDEX app_role_events_user_role ON sovitech.app_role_events (user_id, role, at DESC, id DESC);

CREATE VIEW sovitech.app_user_roles WITH (security_barrier) AS
SELECT latest.user_id, latest.role, latest.at AS since
FROM (
  SELECT DISTINCT ON (event.user_id, event.role) event.user_id, event.role, event.type, event.at
  FROM sovitech.app_role_events AS event
  ORDER BY event.user_id, event.role, event.at DESC, event.id DESC
) AS latest
WHERE latest.type = 'granted';

CREATE TABLE sovitech.projects (
  id uuid PRIMARY KEY,
  -- Rule 10 "Demo data": demo projects are flagged, and their values never carry engineer_verified.
  is_demo boolean NOT NULL,
  created_by uuid NOT NULL REFERENCES sovitech.app_users (id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE sovitech.project_members (
  project_id uuid NOT NULL REFERENCES sovitech.projects (id),
  user_id uuid NOT NULL REFERENCES sovitech.app_users (id),
  added_by uuid REFERENCES sovitech.app_users (id),
  added_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (project_id, user_id)
);

-- Privileged actions: who, in which role, when, on what, and why. Never document text.
CREATE TABLE sovitech.audit_events (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES sovitech.projects (id),
  type text NOT NULL CHECK (type IN (
    'app_user_created', 'app_role_granted', 'app_role_revoked',
    'project_created', 'project_member_added', 'document_erased'
  )),
  actor_user_id uuid REFERENCES sovitech.app_users (id),
  actor_database_role text NOT NULL CHECK (btrim(actor_database_role) <> ''),
  target_user_id uuid REFERENCES sovitech.app_users (id),
  document_id uuid,
  -- Ids and counts only.
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  reason text CHECK (reason IS NULL OR btrim(reason) <> ''),
  at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX audit_events_project ON sovitech.audit_events (project_id, at);

REVOKE ALL ON sovitech.app_users, sovitech.app_role_events, sovitech.app_user_roles,
  sovitech.projects, sovitech.project_members, sovitech.audit_events FROM PUBLIC;

-- The app reads accounts and roles only through the request views of 0006
-- (its own account and the members of the project in scope; rule 13, project
-- boundary). Row-level security (0007) scopes the project tables it reads here.
GRANT SELECT ON sovitech.projects, sovitech.project_members, sovitech.audit_events TO sovitech_db_app;
-- The operator's login reads accounts and roles in full.
GRANT SELECT ON sovitech.app_users, sovitech.app_role_events, sovitech.app_user_roles, sovitech.audit_events
  TO sovitech_db_admin;
-- 0009 gives app_users, app_role_events, app_user_roles, projects and
-- project_members to sovitech_db_access, which the migrator cannot act as.
