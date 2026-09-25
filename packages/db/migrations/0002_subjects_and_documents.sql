-- 0002: subjects (guardrails 2.2) and documents (2.3). Runs as sovitech_db_owner.
-- Every row is keyed by project id (rule 13, "Isolation"); row-level security
-- is switched on in 0007 and the append-only guards in 0009.

CREATE TABLE sovitech.subjects (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES sovitech.projects (id),
  kind text NOT NULL CHECK (kind IN ('project', 'building', 'level', 'zone', 'asset', 'document', 'metering_point')),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  -- The project's own subject shares the project's id.
  CHECK (kind <> 'project' OR id = project_id),
  UNIQUE (project_id, id),
  UNIQUE (project_id, id, kind)
);

-- 2.3 DocumentRecord. A document is a subject of kind 'document' with the same id.
-- The record is written once: its analysis status and coverage are events
-- (document_analysis_events), and a declared revision is a document event.
CREATE TABLE sovitech.documents (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  subject_kind text NOT NULL GENERATED ALWAYS AS ('document') STORED,
  -- The revision that was read; also the storage key under the project (phase 2).
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  kind text NOT NULL CHECK (kind IN (
    'architectural', 'mep', 'electrical', 'existing_bms', 'energy_bill', 'specification',
    'boq', 'photo', 'certificate', 'other'
  )),
  stage text NOT NULL CHECK (stage IN (
    'feasibility', 'permit', 'technical_design', 'tender', 'execution', 'shop_drawing',
    'as_built', 'site_survey', 'nameplate_photo', 'bill', 'unknown'
  )),
  revision text CHECK (revision IS NULL OR btrim(revision) <> ''),
  issue_date text CHECK (issue_date IS NULL OR btrim(issue_date) <> ''),
  -- A revision proposed by code at registration (2.3); only a declared_revision_of
  -- event by the owner or an engineer makes it count.
  supersedes_proposed uuid,
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, id, subject_kind) REFERENCES sovitech.subjects (project_id, id, kind),
  FOREIGN KEY (project_id, supersedes_proposed) REFERENCES sovitech.documents (project_id, id),
  CHECK (supersedes_proposed IS NULL OR supersedes_proposed <> id),
  UNIQUE (project_id, id),
  UNIQUE (project_id, id, content_hash)
);
CREATE INDEX documents_project_hash ON sovitech.documents (project_id, content_hash);

ALTER TABLE sovitech.audit_events
  ADD CONSTRAINT audit_events_document_fk FOREIGN KEY (document_id) REFERENCES sovitech.documents (id);

-- 2.3 DocumentEvent. Document status (superseded, withdrawn, erased) is derived from these.
CREATE TABLE sovitech.document_events (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  document_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('declared_revision_of', 'withdrawn', 'erased')),
  -- For declared_revision_of: the document this one revises (2.3 `supersedes`).
  revision_of_document_id uuid,
  actor text NOT NULL CHECK (btrim(actor) <> ''),
  role text NOT NULL CHECK (role IN ('owner', 'sovitech_engineer', 'system')),
  at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reason text,
  -- For a withdrawal by the system: the owner's or engineer's own withdrawal of the same document that
  -- the job carries out (the guard of 0009 checks whose it is, SVX15).
  request_event_id uuid,
  FOREIGN KEY (project_id, document_id) REFERENCES sovitech.documents (project_id, id),
  FOREIGN KEY (project_id, revision_of_document_id) REFERENCES sovitech.documents (project_id, id),
  CONSTRAINT document_events_request_same_document
    FOREIGN KEY (project_id, document_id, request_event_id) REFERENCES sovitech.document_events (project_id, document_id, id),
  UNIQUE (project_id, document_id, id),
  CHECK ((type = 'declared_revision_of') = (revision_of_document_id IS NOT NULL)),
  CHECK (revision_of_document_id IS NULL OR revision_of_document_id <> document_id),
  -- 2.3 "Revisions are declared, never guessed": only a person declares one.
  CHECK (type <> 'declared_revision_of' OR role IN ('owner', 'sovitech_engineer')),
  -- 2.3 "Deleting a document": 2.3's DocumentEvent names the owner and an engineer, whose own
  -- withdrawal the guard of 0009 binds to the request (SVX09: the owner a member holding owner, an
  -- engineer a person holding sovitech_engineer). The system withdraws a document only as the job
  -- carrying out such a person's withdrawal, which it names; nothing in 2.3 or rule 13 lets a
  -- document, and the values only it supports, go with no person's action, and rule 4 keeps a
  -- value from going silently.
  CONSTRAINT document_events_withdrawn_by_person_or_request
    CHECK (type <> 'withdrawn' OR role IN ('owner', 'sovitech_engineer') OR request_event_id IS NOT NULL),
  CONSTRAINT document_events_request_only_on_system_withdrawal
    CHECK (request_event_id IS NULL OR (type = 'withdrawn' AND role = 'system')),
  -- Rule 13 "Erasure": the erased event is the erasure function's own (0008; SVE10 in 0009),
  -- naming the owner who asked or the system, with the reason that function writes.
  CONSTRAINT document_events_erased_by_erasure CHECK (type <> 'erased' OR (role IN ('owner', 'system') AND reason = 'document_erased'))
);
CREATE INDEX document_events_project ON sovitech.document_events (project_id, document_id);

-- 2.3 DocumentRecord.analysis, as events: status and coverage recorded by code (rule 12).
CREATE TABLE sovitech.document_analysis_events (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  document_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'analysing', 'analysed', 'partly_analysed', 'stored_only', 'failed')),
  coverage text NOT NULL,
  actor text NOT NULL CHECK (btrim(actor) <> ''),
  at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, document_id) REFERENCES sovitech.documents (project_id, id)
);
CREATE INDEX document_analysis_events_document ON sovitech.document_analysis_events (project_id, document_id, at DESC);

-- Extracted document text, in its own table keyed by project id and content hash
-- (prompt 3 5.2 "Database"; rule 13). The erasure function alone deletes rows here.
CREATE TABLE sovitech.document_texts (
  project_id uuid NOT NULL REFERENCES sovitech.projects (id),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  -- Where the text sits in the document, for example 'page:3' or 'sheet:Rooms'.
  part text NOT NULL CHECK (btrim(part) <> ''),
  text text NOT NULL,
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (project_id, content_hash, part)
);

REVOKE ALL ON sovitech.subjects, sovitech.documents, sovitech.document_events,
  sovitech.document_analysis_events, sovitech.document_texts FROM PUBLIC;

GRANT SELECT ON sovitech.subjects, sovitech.documents, sovitech.document_events,
  sovitech.document_analysis_events, sovitech.document_texts TO sovitech_db_app;
-- Append only, and the database sets every time column: no UPDATE, DELETE or TRUNCATE.
GRANT INSERT (id, project_id, kind, created_by) ON sovitech.subjects TO sovitech_db_app;
GRANT INSERT (id, project_id, content_hash, kind, stage, revision, issue_date, supersedes_proposed, created_by)
  ON sovitech.documents TO sovitech_db_app;
GRANT INSERT (id, project_id, document_id, type, revision_of_document_id, actor, role, reason, request_event_id)
  ON sovitech.document_events TO sovitech_db_app;
GRANT INSERT (id, project_id, document_id, status, coverage, actor)
  ON sovitech.document_analysis_events TO sovitech_db_app;
GRANT INSERT (project_id, content_hash, part, text, created_by) ON sovitech.document_texts TO sovitech_db_app;
REVOKE UPDATE, DELETE, TRUNCATE ON sovitech.subjects, sovitech.documents, sovitech.document_events,
  sovitech.document_analysis_events, sovitech.document_texts FROM sovitech_db_app;
