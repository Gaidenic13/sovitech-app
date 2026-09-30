-- 0011: one writer at a time per upload, and the erased document's own file name
-- (phase 2 review). Runs as the database administrator: it changes the work schema's
-- upload sessions, whose owner is sovitech_db_owner, and replaces the guarded erasure
-- function, whose owner is sovitech_db_eraser; ownership, privileges and the guard
-- invariants are unchanged (0009's event trigger re-checks them after each command).
-- Decisions: docs/adr/0019-resumable-uploads-chunk-protocol.md,
-- docs/adr/0026-analysis-queue-and-upload-sessions.md,
-- docs/adr/0025-document-storage-and-ingestion.md.
--
-- 1. Upload leases (the upload hash race). Two appends at the same offset both passed
--    the offset check and each held an open descriptor on the staged file; after the
--    completion hashed the fixture's bytes and moved the staged file under its content
--    hash, the second descriptor could still append bytes that were never hashed, so a
--    file the owner's fixtures-only guard never saw was stored under a fixture's hash
--    (ADR 0028; prompt 3 section 13 item 2). A session now takes a lease for each append
--    and for its completion, in one UPDATE under the row's lock: a second append or a
--    completion while a lease is held is refused, and the offset is checked again under
--    the lease. A lease that ends (its request died) frees the session for the next
--    request. `last_activity_at` lets the staging sweep tell an abandoned upload from a
--    slow one. The file name stays out of reach of UPDATE (only its own columns are
--    granted), so the owner text in flight cannot be rewritten.
--
-- 2. The erased document's file name. While another document of the project, not
--    erased, holds the same bytes, 0008 kept every text part of the content hash, the
--    erased document's own file name ('file:name:<document id>', owner text) included,
--    although rule 13's erasure removes "its extracted text". The name part of the
--    erased document now always goes; the parts of the bytes (pages, sheets, cells, a
--    model's header text) stay only while such a twin remains. Everything else in the
--    function is 0008's, unchanged.

SET LOCAL ROLE sovitech_db_owner;

ALTER TABLE sovitech_work.upload_sessions
  ADD COLUMN state text NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'appending', 'completing')),
  ADD COLUMN lease_id uuid,
  ADD COLUMN lease_until timestamptz,
  -- Null until the first append or completion; the sweep reads created_at then. (A volatile
  -- default would rewrite the table.)
  ADD COLUMN last_activity_at timestamptz;

-- A lease is held exactly while the session is appending or completing.
ALTER TABLE sovitech_work.upload_sessions
  ADD CONSTRAINT upload_sessions_lease_held CHECK ((state = 'open') = (lease_id IS NULL AND lease_until IS NULL));

CREATE INDEX upload_sessions_activity ON sovitech_work.upload_sessions (coalesce(last_activity_at, created_at));

GRANT UPDATE (state, lease_id, lease_until, last_activity_at) ON sovitech_work.upload_sessions TO sovitech_db_app;

RESET ROLE;

CREATE OR REPLACE FUNCTION sovitech.erase_document(p_audit_id uuid, p_event_id uuid, p_document_id uuid, p_role text, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user uuid := sovitech.request_user_id();
  v_project uuid;
  v_hash text;
  v_excerpts bigint;
  v_parts bigint := 0;
  v_kept boolean;
  v_withdrawn bigint;
  v_details jsonb;
BEGIN
  IF session_user <> 'sovitech_db_app' THEN
    RAISE EXCEPTION USING ERRCODE = 'SVE01', MESSAGE = 'erasure runs only through the API erasure job';
  END IF;
  IF v_user IS NULL OR NOT EXISTS (SELECT 1 FROM sovitech.app_users AS account WHERE account.id = v_user) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVE01', MESSAGE = 'no authenticated user';
  END IF;
  IF pg_catalog.current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION USING ERRCODE = 'SVE12', MESSAGE = 'erasure runs in a READ COMMITTED transaction, so it sees every write that committed before it';
  END IF;
  SELECT document.project_id, document.content_hash INTO v_project, v_hash
  FROM sovitech.documents AS document WHERE document.id = p_document_id;
  IF v_project IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'SVE04', MESSAGE = 'no such document in the project in scope';
  END IF;
  IF p_role = 'owner' THEN
    IF NOT (sovitech.user_holds_role(v_user, 'owner') AND EXISTS (
      SELECT 1 FROM sovitech.project_members AS member WHERE member.project_id = v_project AND member.user_id = v_user
    )) THEN
      RAISE EXCEPTION USING ERRCODE = 'SVE03', MESSAGE = 'the owner who asks must hold the owner role and be a member of the project';
    END IF;
  ELSIF p_role = 'system' THEN
    IF NOT sovitech.request_user_acts_as(v_project, 'system') THEN
      RAISE EXCEPTION USING ERRCODE = 'SVE03', MESSAGE = 'the system erases through a service account that is a member of the project';
    END IF;
  ELSE
    RAISE EXCEPTION USING ERRCODE = 'SVE03', MESSAGE = 'the erased event names the owner who asked or the system';
  END IF;
  -- The erasure lock, exclusive until commit (0008); a second erasure of the document waits here too.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('sovitech erasure ' || v_project::text || ' ' || v_hash, 0)
  );
  IF EXISTS (
    SELECT 1 FROM sovitech.document_events AS event WHERE event.document_id = p_document_id AND event.type = 'erased'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVE02', MESSAGE = 'the document is erased already';
  END IF;

  INSERT INTO sovitech.document_events (id, project_id, document_id, type, actor, role, reason)
  VALUES (p_event_id, v_project, p_document_id, 'erased', v_user::text, p_role, 'document_erased');

  WITH erased AS (
    UPDATE sovitech.evidence_excerpts AS excerpt
    SET text = '[erased]', erased_at = pg_catalog.clock_timestamp()
    FROM sovitech.evidence_locators AS locator
    WHERE locator.id = excerpt.evidence_id AND locator.document_id = p_document_id AND excerpt.erased_at IS NULL
    RETURNING excerpt.evidence_id
  )
  SELECT count(*) INTO v_excerpts FROM erased;

  v_kept := EXISTS (
    SELECT 1 FROM sovitech.documents AS other
    WHERE other.project_id = v_project AND other.content_hash = v_hash AND other.id <> p_document_id
      AND NOT EXISTS (SELECT 1 FROM sovitech.document_events AS event WHERE event.document_id = other.id AND event.type = 'erased')
  );
  -- The erased document's own file name always goes; the text of the bytes stays only while
  -- another document of the project, not erased, holds them (2.3: its evidence stays).
  WITH removed AS (
    DELETE FROM sovitech.document_texts AS extracted
    WHERE extracted.project_id = v_project AND extracted.content_hash = v_hash
      AND (NOT v_kept OR extracted.part = 'file:name:' || p_document_id::text)
    RETURNING extracted.part
  )
  SELECT count(*) INTO v_parts FROM removed;

  WITH removed_documents AS (
    SELECT DISTINCT event.document_id FROM sovitech.document_events AS event
    WHERE event.project_id = v_project AND event.type IN ('erased', 'withdrawn')
  ),
  affected AS (
    SELECT candidate.id FROM sovitech.candidates AS candidate
    WHERE candidate.project_id = v_project
      AND EXISTS (
        SELECT 1 FROM sovitech.evidence_locators AS locator
        WHERE locator.candidate_id = candidate.id AND locator.document_id = p_document_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM sovitech.evidence_locators AS locator
        WHERE locator.candidate_id = candidate.id
          AND locator.document_id NOT IN (SELECT removed.document_id FROM removed_documents AS removed)
      )
      AND NOT EXISTS (
        SELECT 1 FROM sovitech.candidate_events AS event WHERE event.candidate_id = candidate.id AND event.type = 'withdrawn'
      )
  ),
  written AS (
    INSERT INTO sovitech.candidate_events (id, project_id, candidate_id, type, actor, role, reason)
    SELECT pg_catalog.uuidv7(), v_project, affected.id, 'withdrawn', 'erasure:' || p_audit_id::text, 'system', 'document_erased'
    FROM affected
    RETURNING candidate_id
  )
  SELECT count(*) INTO v_withdrawn FROM written;

  v_details := jsonb_build_object(
    'role', p_role,
    'document_event_id', p_event_id,
    'content_hash', v_hash,
    'excerpts_erased', v_excerpts,
    'text_parts_deleted', v_parts,
    'text_kept_for_another_document', v_kept,
    'candidates_withdrawn', v_withdrawn
  );
  INSERT INTO sovitech.audit_events (id, project_id, type, actor_user_id, actor_database_role, document_id, details, reason)
  VALUES (p_audit_id, v_project, 'document_erased', v_user, session_user, p_document_id, v_details, p_reason);
  RETURN v_details;
END
$$;

-- CREATE OR REPLACE keeps the owner and the privileges; say them again so the function
-- reads the same whoever ran 0008.
ALTER FUNCTION sovitech.erase_document(uuid, uuid, uuid, text, text) OWNER TO sovitech_db_eraser;
REVOKE ALL ON FUNCTION sovitech.erase_document(uuid, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sovitech.erase_document(uuid, uuid, uuid, text, text) TO sovitech_db_app;
-- No table of schema sovitech changed, so the recorded shape is not taken again.
