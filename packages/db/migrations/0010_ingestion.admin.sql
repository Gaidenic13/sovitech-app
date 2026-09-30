-- 0010: ingestion (prompt 3 section 10, phase 2). Runs as the database
-- administrator, because it registers guards (packages/db/README.md, "Adding a
-- table or a guard"): the tables are created as sovitech_db_owner, their guard
-- triggers and the guard function as the administrator, and the shape is
-- recorded last. Decisions: docs/adr/0025-document-storage-and-ingestion.md,
-- docs/adr/0026-analysis-queue-and-upload-sessions.md,
-- docs/adr/0027-evidence-verifier-and-ingestion.md.
--
-- Value-store tables (schema sovitech; append-only, project-scoped, guarded):
--   document_files          the stored file of a document: the format code
--                           detected it as, and its size. No file name: that is
--                           owner text, kept in document_texts (part
--                           'file:name:<document id>'), which the erasure removes.
--   document_findings       rule 14 findings of the extractor (embedded
--                           instructions, hidden text, schema errors, hidden
--                           content): a kind, a code and a locator, never text.
--   document_model_records  the engineer-only record of an IFC model (PRD R-023;
--                           prompt 3 5.4, `ifc-values` closed): the declared schema,
--                           the IfcProject GlobalId, the classes present, the
--                           processing outcome, the schema check and the IDS
--                           results as spec ids, counts and failing GlobalIds. The
--                           authoring tool is header text, kept in document_texts
--                           (part 'ifc:header:authoring_tool').
--   candidate_ai_origins    the model id with every candidate the AI proposed
--                           (build-readiness 3 item 6, "the model id stored with
--                           every candidate"; the owner's answer of 2026-09-25).
-- Working state (schema sovitech_work; ids only, updated and deleted by the API):
--   analysis_jobs           the analysis queue (ADR 0026, replacing ADR 0020's pg-boss)
--   upload_sessions         resumable uploads in flight (ADR 0019)

SET LOCAL ROLE sovitech_db_owner;

CREATE TABLE sovitech.document_files (
  document_id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  content_hash text NOT NULL,
  format text NOT NULL CHECK (format IN ('pdf', 'xlsx', 'ifc', 'rvt', 'dwg', 'docx', 'jpg', 'png', 'zip', 'other')),
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, document_id, content_hash) REFERENCES sovitech.documents (project_id, id, content_hash),
  UNIQUE (project_id, document_id)
);

CREATE TABLE sovitech.document_findings (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  document_id uuid NOT NULL,
  content_hash text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('embedded_instruction', 'hidden_text', 'schema_error', 'hidden_content')),
  -- A code, never text (rule 13): the contract's Code pattern.
  code text NOT NULL CHECK (char_length(code) <= 120 AND code ~ '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$'),
  -- Where: a page, a sheet and cell, an IFC GlobalId with STEP ids and a class, or the file (the contract's FindingLocator).
  locator jsonb NOT NULL CHECK (jsonb_typeof(locator) = 'object' AND locator ? 'kind'),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, document_id, content_hash) REFERENCES sovitech.documents (project_id, id, content_hash)
);
CREATE INDEX document_findings_document ON sovitech.document_findings (project_id, document_id);

CREATE TABLE sovitech.document_model_records (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  document_id uuid NOT NULL,
  content_hash text NOT NULL,
  ifc_schema text NOT NULL CHECK (ifc_schema ~ '^IFC[0-9A-Z_]{1,24}$'),
  ifc_project_global_id text CHECK (ifc_project_global_id IS NULL OR ifc_project_global_id ~ '^[0-9A-Za-z_$]{22}$'),
  classes_present text[] NOT NULL CHECK (
    array_position(classes_present, NULL) IS NULL AND array_ndims(classes_present) IS DISTINCT FROM 2
  ),
  processing text NOT NULL CHECK (processing IN ('complete', 'partial', 'failed')),
  schema_check_tool text NOT NULL CHECK (btrim(schema_check_tool) <> ''),
  schema_check_version text NOT NULL CHECK (btrim(schema_check_version) <> ''),
  schema_check_outcome text NOT NULL CHECK (schema_check_outcome IN ('no_problems', 'problems', 'not_run')),
  -- The IDS results as the contract's IdsResults: the IDS reference, the tool, and per
  -- specification its id, outcome, counts and failing GlobalIds. Never report text.
  ids_results jsonb CHECK (ids_results IS NULL OR jsonb_typeof(ids_results) = 'object'),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, document_id, content_hash) REFERENCES sovitech.documents (project_id, id, content_hash)
);
CREATE INDEX document_model_records_document ON sovitech.document_model_records (project_id, document_id, created_at DESC);

CREATE TABLE sovitech.candidate_ai_origins (
  candidate_id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  model_id text NOT NULL CHECK (char_length(model_id) <= 200 AND model_id ~ '^[A-Za-z0-9][A-Za-z0-9._:@ -]*$'),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, candidate_id) REFERENCES sovitech.candidates (project_id, id)
);

DO $policies$
DECLARE
  scoped text;
BEGIN
  FOREACH scoped IN ARRAY ARRAY['document_files', 'document_findings', 'document_model_records', 'candidate_ai_origins'] LOOP
    EXECUTE format('ALTER TABLE sovitech.%I ENABLE ROW LEVEL SECURITY', scoped);
    EXECUTE format('ALTER TABLE sovitech.%I FORCE ROW LEVEL SECURITY', scoped);
    EXECUTE format(
      'CREATE POLICY project_scope ON sovitech.%I USING (project_id = (SELECT sovitech.current_project_id())) '
      'WITH CHECK (project_id = (SELECT sovitech.current_project_id()))',
      scoped
    );
  END LOOP;
END
$policies$;

REVOKE ALL ON sovitech.document_files, sovitech.document_findings, sovitech.document_model_records,
  sovitech.candidate_ai_origins FROM PUBLIC;
GRANT SELECT ON sovitech.document_files, sovitech.document_findings, sovitech.document_model_records,
  sovitech.candidate_ai_origins TO sovitech_db_app;
GRANT INSERT (document_id, project_id, content_hash, format, byte_size, created_by) ON sovitech.document_files TO sovitech_db_app;
GRANT INSERT (id, project_id, document_id, content_hash, kind, code, locator, created_by)
  ON sovitech.document_findings TO sovitech_db_app;
GRANT INSERT (id, project_id, document_id, content_hash, ifc_schema, ifc_project_global_id, classes_present, processing,
  schema_check_tool, schema_check_version, schema_check_outcome, ids_results, created_by)
  ON sovitech.document_model_records TO sovitech_db_app;
GRANT INSERT (candidate_id, project_id, model_id, created_by) ON sovitech.candidate_ai_origins TO sovitech_db_app;
REVOKE UPDATE, DELETE, TRUNCATE ON sovitech.document_files, sovitech.document_findings, sovitech.document_model_records,
  sovitech.candidate_ai_origins FROM sovitech_db_app;

RESET ROLE;

-- Who writes these rows, and nothing of an erased document (rule 13, "Erasure"; SVX16, SVE11):
-- - every row names the request's own user as its writer (created_by), never the caller's word alone;
-- - a document's stored file is recorded by the user who registered the document, in the same request;
-- - findings, model records and the AI's model id come only from a service account that is a
--   member of the project (the extraction job), and a model id only for a candidate that account
--   wrote from a document or an inference (2.1, "Who can create it");
-- - nothing is recorded for an erased document: the erasure lock is taken shared first, as the
--   text and evidence guards take it (0009).
CREATE FUNCTION sovitech_guard.ingestion_record_written() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user text := sovitech.request_user_id()::text;
BEGIN
  IF v_user IS NULL OR NEW.created_by IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX16', MESSAGE = format('a row of sovitech.%s names the user making the request as its writer', TG_TABLE_NAME);
  END IF;
  IF TG_TABLE_NAME = 'candidate_ai_origins' THEN
    IF NOT sovitech.request_user_acts_as(NEW.project_id, 'system') OR NOT EXISTS (
      SELECT 1 FROM sovitech.candidates AS candidate
      WHERE candidate.project_id = NEW.project_id AND candidate.id = NEW.candidate_id
        AND candidate.created_by = v_user AND candidate.source IN ('document', 'ai_inference')
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'SVX16',
        MESSAGE = 'a model id is recorded only by the service account that wrote the candidate, from a document or an inference';
    END IF;
    RETURN NEW;
  END IF;
  PERFORM sovitech_guard.await_erasure(NEW.project_id, NEW.content_hash);
  IF EXISTS (
    SELECT 1 FROM sovitech.document_events AS event WHERE event.document_id = NEW.document_id AND event.type = 'erased'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVE11', MESSAGE = format('sovitech.%s names an erased document', TG_TABLE_NAME);
  END IF;
  IF TG_TABLE_NAME = 'document_files' THEN
    IF NOT EXISTS (
      SELECT 1 FROM sovitech.documents AS document
      WHERE document.project_id = NEW.project_id AND document.id = NEW.document_id AND document.created_by = v_user
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'SVX16', MESSAGE = 'a stored file is recorded by the user who registered its document';
    END IF;
  ELSIF NOT sovitech.request_user_acts_as(NEW.project_id, 'system') THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX16',
      MESSAGE = format('sovitech.%s is written only by a service account that is a member of the project', TG_TABLE_NAME);
  END IF;
  RETURN NEW;
END
$$;
ALTER FUNCTION sovitech_guard.ingestion_record_written() OWNER TO sovitech_db_guard;
REVOKE ALL ON FUNCTION sovitech_guard.ingestion_record_written() FROM PUBLIC;
GRANT SELECT ON sovitech.document_files, sovitech.document_findings, sovitech.document_model_records,
  sovitech.candidate_ai_origins TO sovitech_db_guard;

DO $install$
DECLARE
  stored text;
BEGIN
  FOREACH stored IN ARRAY ARRAY['document_files', 'document_findings', 'document_model_records', 'candidate_ai_origins'] LOOP
    EXECUTE format(
      'CREATE TRIGGER guard_no_truncate BEFORE TRUNCATE ON sovitech.%I FOR EACH STATEMENT EXECUTE FUNCTION sovitech_guard.refuse_change()',
      stored
    );
    EXECUTE format(
      'CREATE TRIGGER guard_change BEFORE UPDATE OR DELETE ON sovitech.%I FOR EACH ROW EXECUTE FUNCTION sovitech_guard.refuse_change()',
      stored
    );
    EXECUTE format(
      'CREATE TRIGGER guard_ingestion_writer BEFORE INSERT ON sovitech.%I FOR EACH ROW EXECUTE FUNCTION sovitech_guard.ingestion_record_written()',
      stored
    );
    EXECUTE format('ALTER TABLE sovitech.%I ENABLE ALWAYS TRIGGER guard_no_truncate', stored);
    EXECUTE format('ALTER TABLE sovitech.%I ENABLE ALWAYS TRIGGER guard_change', stored);
    EXECUTE format('ALTER TABLE sovitech.%I ENABLE ALWAYS TRIGGER guard_ingestion_writer', stored);
  END LOOP;
END
$install$;

-- The working state: its own schema, outside the value store's guards, holding ids and
-- codes only (rule 13). The API updates and deletes these rows; nothing here is a value.
CREATE SCHEMA sovitech_work AUTHORIZATION sovitech_db_owner;
REVOKE ALL ON SCHEMA sovitech_work FROM PUBLIC;
GRANT USAGE ON SCHEMA sovitech_work TO sovitech_db_app;

SET LOCAL ROLE sovitech_db_owner;

CREATE TABLE sovitech_work.analysis_jobs (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  document_id uuid NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  kind text NOT NULL CHECK (kind IN ('analyse_document')),
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'running', 'done', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  run_after timestamptz NOT NULL DEFAULT clock_timestamp(),
  locked_by text CHECK (locked_by IS NULL OR locked_by ~ '^[a-z0-9-]{1,64}$'),
  locked_at timestamptz,
  finished_at timestamptz,
  -- A code, never the extractor's output or an error message (rule 13).
  error_code text CHECK (error_code IS NULL OR error_code ~ '^[a-z][a-z0-9_]{0,63}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, document_id, content_hash) REFERENCES sovitech.documents (project_id, id, content_hash),
  CHECK ((state = 'running') = (locked_by IS NOT NULL AND locked_at IS NOT NULL)),
  CHECK ((state IN ('done', 'failed')) = (finished_at IS NOT NULL))
);
-- One analysis of a document at a time (ADR 0026).
CREATE UNIQUE INDEX analysis_jobs_one_open_per_document ON sovitech_work.analysis_jobs (project_id, document_id)
  WHERE state IN ('queued', 'running');
CREATE INDEX analysis_jobs_ready ON sovitech_work.analysis_jobs (state, run_after, created_at);

CREATE TABLE sovitech_work.upload_sessions (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  -- The file name as uploaded: owner text, kept only while the upload is in flight; at completion
  -- it moves to document_texts with the document, and this row is deleted.
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  format text NOT NULL CHECK (format IN ('pdf', 'xlsx', 'ifc', 'rvt', 'dwg', 'docx', 'jpg', 'png', 'zip')),
  declared_size bigint NOT NULL CHECK (declared_size >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX upload_sessions_created ON sovitech_work.upload_sessions (created_at);

REVOKE ALL ON sovitech_work.analysis_jobs, sovitech_work.upload_sessions FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON sovitech_work.analysis_jobs, sovitech_work.upload_sessions TO sovitech_db_app;
GRANT UPDATE (state, attempts, run_after, locked_by, locked_at, finished_at, error_code)
  ON sovitech_work.analysis_jobs TO sovitech_db_app;

RESET ROLE;

-- Register the four value-store tables with their guards, then record the shape.
INSERT INTO sovitech_guard.append_only_tables (table_name)
VALUES ('document_files'), ('document_findings'), ('document_model_records'), ('candidate_ai_origins');
INSERT INTO sovitech_guard.project_tables (table_name)
VALUES ('document_files'), ('document_findings'), ('document_model_records'), ('candidate_ai_origins');
INSERT INTO sovitech_guard.required_triggers (table_name, trigger_name)
SELECT stored.table_name, trigger_name
FROM (VALUES ('document_files'), ('document_findings'), ('document_model_records'), ('candidate_ai_origins')) AS stored (table_name)
CROSS JOIN (VALUES ('guard_no_truncate'), ('guard_change'), ('guard_ingestion_writer')) AS wanted (trigger_name);

SELECT sovitech_guard.record_shape();
