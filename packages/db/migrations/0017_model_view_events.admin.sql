-- 0017: the conversion record of a stored IFC model shown as a document, and its queue (the viewer step, part 1;
-- the owner's decision of 2026-10-05 on D-03, "1 b", for display only; prompt 3 section 8, "Conversion"; PRD R-025;
-- docs/build-log.md, "The viewer step", item 3; docs/adr/0046-viewer-spike.md decisions 2, 6 and 7). Runs as the
-- database administrator, on 0010's and 0015's pattern (packages/db/README.md, "Adding a table or a guard"): the tables
-- are created as sovitech_db_owner, their guards as the administrator, and the shape is recorded last.
--
-- Value-store table (schema sovitech; append-only, project-scoped, guarded):
--   model_view_events   one row per step of a model's conversion for viewing: `queued`, `started`, `converted`,
--                       `failed` with a code, and `erased` (the view files went with their document). Each names the
--                       project, the document and the content hash, the converter (its name and the hash of its
--                       sources), the sandbox image's digest, byte sizes and durations. It holds no text from the
--                       model: no name, label, property, header or message (rule 13). State is derived from the
--                       events, never stored. It is not a value: no candidate, field event, badge, field state or
--                       Documents line comes from it (R-025; US-IFC-08 AC6; G1-30).
--
-- Guards (rule 4, "Nothing is overwritten"; rule 13):
--   - no row is ever updated, deleted or truncated (append-only, every login role; G4-20);
--   - every row names the request's own user as its writer, and names a stored IFC model of the project (the
--     document's stored file has the format `ifc`): `sovitech_guard.model_view_event_written` (SVX20);
--   - `started`, `converted` and `failed` come only from a service account that is a member of the project (the
--     conversion job); `queued` and `erased` from a member acting as the owner (the owner's upload or deletion, or the
--     demo seed on the demo project), an engineer, or that service account;
--   - nothing but `erased` is recorded for an erased document (SVE11), and `erased` only for one: the erasure lock is
--     taken shared first, as the text, evidence and ingestion guards take it (0009, 0010), so a conversion that ends
--     while its document is being erased is either recorded before the erasure or refused after it;
--   - every row is the project's (row-level security on project_id; the foreign key names the project).
--
-- Working state (schema sovitech_work; ids and codes only, updated and deleted by the API, like 0010's analysis queue):
--   model_view_jobs     the conversion queue: one open job per project and content hash (a second document of the same
--                       bytes in the same project reuses the conversion), apart from the analysis queue.

SET LOCAL ROLE sovitech_db_owner;

CREATE TABLE sovitech.model_view_events (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  document_id uuid NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  type text NOT NULL CHECK (type IN ('queued', 'started', 'converted', 'failed', 'erased')),
  -- A code, never text (rule 13).
  code text CHECK (code IS NULL OR code IN (
    'parse_failed', 'timed_out', 'out_of_memory', 'no_geometry', 'stale_image', 'output_refused', 'sandbox_unavailable',
    'output_unavailable', 'internal_error'
  )),
  -- The conversion job the event belongs to (sovitech_work.model_view_jobs; no foreign key: the queue is working state).
  job_id uuid,
  converter_name text CHECK (converter_name IS NULL OR converter_name ~ '^[a-z][a-z0-9-]{0,63}$'),
  -- The converter's version: the SHA-256 of its sources, as the image's label records it.
  converter_version text CHECK (converter_version IS NULL OR converter_version ~ '^sha256:[0-9a-f]{64}$'),
  image_digest text CHECK (image_digest IS NULL OR image_digest ~ '^sha256:[0-9a-f]{64}$'),
  -- Sizes in bytes and durations in milliseconds, as the converter and the job measured them; never a value.
  input_bytes integer CHECK (input_bytes IS NULL OR input_bytes >= 0),
  view_bytes integer CHECK (view_bytes IS NULL OR view_bytes >= 0),
  index_bytes integer CHECK (index_bytes IS NULL OR index_bytes >= 0),
  peak_rss_kib integer CHECK (peak_rss_kib IS NULL OR peak_rss_kib >= 0),
  import_ms double precision CHECK (import_ms IS NULL OR import_ms >= 0),
  derivative_ms double precision CHECK (derivative_ms IS NULL OR derivative_ms >= 0),
  index_ms double precision CHECK (index_ms IS NULL OR index_ms >= 0),
  wall_ms integer CHECK (wall_ms IS NULL OR wall_ms >= 0),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT model_view_events_document_fk FOREIGN KEY (project_id, document_id, content_hash)
    REFERENCES sovitech.documents (project_id, id, content_hash),
  -- A failure names its code; nothing else carries one.
  CONSTRAINT model_view_events_failed_has_code CHECK ((type = 'failed') = (code IS NOT NULL)),
  -- A converted model names its converter, its image and the sizes of its view files.
  CONSTRAINT model_view_events_converted_complete CHECK (
    type <> 'converted' OR (converter_name IS NOT NULL AND converter_version IS NOT NULL AND image_digest IS NOT NULL
      AND view_bytes IS NOT NULL AND index_bytes IS NOT NULL AND job_id IS NOT NULL)
  )
);
CREATE INDEX model_view_events_hash ON sovitech.model_view_events (project_id, content_hash, created_at);
CREATE INDEX model_view_events_document ON sovitech.model_view_events (project_id, document_id);

ALTER TABLE sovitech.model_view_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sovitech.model_view_events FORCE ROW LEVEL SECURITY;
CREATE POLICY project_scope ON sovitech.model_view_events
  USING (project_id = (SELECT sovitech.current_project_id()))
  WITH CHECK (project_id = (SELECT sovitech.current_project_id()));

REVOKE ALL ON sovitech.model_view_events FROM PUBLIC;
GRANT SELECT ON sovitech.model_view_events TO sovitech_db_app;
GRANT INSERT (id, project_id, document_id, content_hash, type, code, job_id, converter_name, converter_version, image_digest,
  input_bytes, view_bytes, index_bytes, peak_rss_kib, import_ms, derivative_ms, index_ms, wall_ms, created_by)
  ON sovitech.model_view_events TO sovitech_db_app;
REVOKE UPDATE, DELETE, TRUNCATE ON sovitech.model_view_events FROM sovitech_db_app;

RESET ROLE;

-- Who writes a conversion record, and nothing but `erased` for an erased document (SVX20, SVE11; see the header).
CREATE FUNCTION sovitech_guard.model_view_event_written() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user text := sovitech.request_user_id()::text;
  v_erased boolean;
BEGIN
  IF v_user IS NULL OR NEW.created_by IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX20', MESSAGE = 'a conversion record names the user making the request as its writer';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM sovitech.document_files AS file
    WHERE file.project_id = NEW.project_id AND file.document_id = NEW.document_id
      AND file.content_hash = NEW.content_hash AND file.format = 'ifc'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX20', MESSAGE = 'a conversion record names a stored IFC model of the project';
  END IF;
  PERFORM sovitech_guard.await_erasure(NEW.project_id, NEW.content_hash);
  v_erased := EXISTS (
    SELECT 1 FROM sovitech.document_events AS event WHERE event.document_id = NEW.document_id AND event.type = 'erased'
  );
  IF NEW.type IN ('queued', 'erased') THEN
    IF NOT (sovitech.request_user_acts_as(NEW.project_id, 'owner') OR sovitech.request_user_acts_as(NEW.project_id, 'sovitech_engineer')
            OR sovitech.request_user_acts_as(NEW.project_id, 'system')) THEN
      RAISE EXCEPTION USING ERRCODE = 'SVX20',
        MESSAGE = 'a conversion is queued or recorded as erased by the owner, an engineer or the project''s service account';
    END IF;
  ELSIF NOT sovitech.request_user_acts_as(NEW.project_id, 'system') THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX20',
      MESSAGE = 'a conversion is started, converted or failed only by a service account that is a member of the project';
  END IF;
  IF NEW.type = 'erased' AND NOT v_erased THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX20', MESSAGE = 'a conversion is recorded as erased only for an erased document';
  END IF;
  IF NEW.type <> 'erased' AND v_erased THEN
    RAISE EXCEPTION USING ERRCODE = 'SVE11', MESSAGE = 'sovitech.model_view_events names an erased document';
  END IF;
  RETURN NEW;
END
$$;
ALTER FUNCTION sovitech_guard.model_view_event_written() OWNER TO sovitech_db_guard;
REVOKE ALL ON FUNCTION sovitech_guard.model_view_event_written() FROM PUBLIC;
GRANT SELECT ON sovitech.model_view_events TO sovitech_db_guard;

CREATE TRIGGER guard_no_truncate BEFORE TRUNCATE ON sovitech.model_view_events FOR EACH STATEMENT EXECUTE FUNCTION sovitech_guard.refuse_change();
CREATE TRIGGER guard_change BEFORE UPDATE OR DELETE ON sovitech.model_view_events FOR EACH ROW EXECUTE FUNCTION sovitech_guard.refuse_change();
CREATE TRIGGER guard_writer BEFORE INSERT ON sovitech.model_view_events FOR EACH ROW EXECUTE FUNCTION sovitech_guard.model_view_event_written();
ALTER TABLE sovitech.model_view_events ENABLE ALWAYS TRIGGER guard_no_truncate;
ALTER TABLE sovitech.model_view_events ENABLE ALWAYS TRIGGER guard_change;
ALTER TABLE sovitech.model_view_events ENABLE ALWAYS TRIGGER guard_writer;

-- The conversion queue: working state, like 0010's analysis queue (ids and codes only; rule 13).
SET LOCAL ROLE sovitech_db_owner;

CREATE TABLE sovitech_work.model_view_jobs (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  -- The document whose registration queued the job; the conversion is of its bytes.
  document_id uuid NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'running', 'done', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  run_after timestamptz NOT NULL DEFAULT clock_timestamp(),
  locked_by text CHECK (locked_by IS NULL OR locked_by ~ '^[a-z0-9-]{1,64}$'),
  locked_at timestamptz,
  finished_at timestamptz,
  -- A code, never the converter's output or an error message (rule 13).
  error_code text CHECK (error_code IS NULL OR error_code ~ '^[a-z][a-z0-9_]{0,63}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, document_id, content_hash) REFERENCES sovitech.documents (project_id, id, content_hash),
  CHECK ((state = 'running') = (locked_by IS NOT NULL AND locked_at IS NOT NULL)),
  CHECK ((state IN ('done', 'failed')) = (finished_at IS NOT NULL))
);
-- One conversion of a project's bytes at a time.
CREATE UNIQUE INDEX model_view_jobs_one_open_per_hash ON sovitech_work.model_view_jobs (project_id, content_hash)
  WHERE state IN ('queued', 'running');
CREATE INDEX model_view_jobs_ready ON sovitech_work.model_view_jobs (state, run_after, created_at);

REVOKE ALL ON sovitech_work.model_view_jobs FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON sovitech_work.model_view_jobs TO sovitech_db_app;
GRANT UPDATE (state, attempts, run_after, locked_by, locked_at, finished_at, error_code)
  ON sovitech_work.model_view_jobs TO sovitech_db_app;

RESET ROLE;

-- Register the value-store table with its guards, then record the shape.
INSERT INTO sovitech_guard.append_only_tables (table_name) VALUES ('model_view_events');
INSERT INTO sovitech_guard.project_tables (table_name) VALUES ('model_view_events');
INSERT INTO sovitech_guard.required_triggers (table_name, trigger_name)
VALUES ('model_view_events', 'guard_no_truncate'), ('model_view_events', 'guard_change'), ('model_view_events', 'guard_writer');

SELECT sovitech_guard.record_shape();
