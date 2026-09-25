-- 0008: the two guarded functions of prompt 3 5.2 "Database", and the
-- opened-item record verification needs. Runs as the database administrator:
-- sovitech.open_review_item and sovitech.verify_candidate are owned by
-- sovitech_db_verifier, sovitech.erase_document by sovitech_db_eraser. Nobody
-- logs in as either role or is a member of one, so only these functions ever
-- act as them, and the guards in 0009 let only those roles write
-- engineer_verified and change stored evidence.

-- Rule 10: the engineer "has opened the item". One item is one candidate opened
-- with its evidence (PRD D-55, interim reading).
CREATE FUNCTION sovitech.open_review_item(p_open_id uuid, p_candidate_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user uuid := sovitech.request_user_id();
  v_project uuid;
  v_opened_at timestamptz;
BEGIN
  IF session_user <> 'sovitech_db_app' THEN
    RAISE EXCEPTION USING ERRCODE = 'SVV01', MESSAGE = 'review items are opened only through the API';
  END IF;
  IF v_user IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'SVV01', MESSAGE = 'no authenticated user';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM sovitech.app_users AS account WHERE account.id = v_user AND account.kind = 'person') THEN
    RAISE EXCEPTION USING ERRCODE = 'SVV02', MESSAGE = 'only a person account opens review items';
  END IF;
  IF NOT sovitech.user_holds_role(v_user, 'sovitech_engineer') THEN
    RAISE EXCEPTION USING ERRCODE = 'SVV03', MESSAGE = 'only the sovitech_engineer role opens review items';
  END IF;
  SELECT candidate.project_id INTO v_project FROM sovitech.candidates AS candidate WHERE candidate.id = p_candidate_id;
  IF v_project IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'SVV04', MESSAGE = 'no such candidate in the project in scope';
  END IF;
  INSERT INTO sovitech.review_item_opens (id, project_id, candidate_id, user_id)
  VALUES (p_open_id, v_project, p_candidate_id, v_user)
  RETURNING opened_at INTO v_opened_at;
  RETURN v_opened_at;
END
$$;

-- The one writer of engineer_verified (rule 10, "Engineer verification is an
-- authenticated action"): an app request by an authenticated person who holds
-- sovitech_engineer and has opened this candidate, on a project that is not a
-- demo project (rule 10, "Demo data"). Holding sovitech_admin or
-- sovitech_commercial_reviewer permits nothing here.
CREATE FUNCTION sovitech.verify_candidate(p_event_id uuid, p_candidate_id uuid, p_reason text)
RETURNS timestamptz
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user uuid := sovitech.request_user_id();
  v_project uuid;
  v_is_demo boolean;
  v_at timestamptz;
BEGIN
  IF session_user <> 'sovitech_db_app' THEN
    RAISE EXCEPTION USING ERRCODE = 'SVV01', MESSAGE = 'engineer verification comes only through the API review endpoint';
  END IF;
  IF v_user IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'SVV01', MESSAGE = 'no authenticated user';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM sovitech.app_users AS account WHERE account.id = v_user AND account.kind = 'person') THEN
    RAISE EXCEPTION USING ERRCODE = 'SVV02', MESSAGE = 'a script, seed or service account never writes engineer_verified';
  END IF;
  IF NOT sovitech.user_holds_role(v_user, 'sovitech_engineer') THEN
    RAISE EXCEPTION USING ERRCODE = 'SVV03', MESSAGE = 'only the sovitech_engineer role writes engineer_verified';
  END IF;
  SELECT candidate.project_id INTO v_project FROM sovitech.candidates AS candidate WHERE candidate.id = p_candidate_id;
  IF v_project IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'SVV04', MESSAGE = 'no such candidate in the project in scope';
  END IF;
  SELECT project.is_demo INTO v_is_demo FROM sovitech.projects AS project WHERE project.id = v_project;
  IF v_is_demo IS DISTINCT FROM false THEN
    RAISE EXCEPTION USING ERRCODE = 'SVV05', MESSAGE = 'demo project: rule 10 keeps its values unverified';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM sovitech.review_item_opens AS opened
    WHERE opened.candidate_id = p_candidate_id AND opened.user_id = v_user
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVV06', MESSAGE = 'the engineer has not opened this item';
  END IF;
  PERFORM pg_catalog.set_config('sovitech.verifying', p_candidate_id::text || '/' || v_user::text, true);
  INSERT INTO sovitech.candidate_events (id, project_id, candidate_id, type, actor, role, reason)
  VALUES (p_event_id, v_project, p_candidate_id, 'engineer_verified', v_user::text, 'sovitech_engineer', p_reason)
  RETURNING at INTO v_at;
  PERFORM pg_catalog.set_config('sovitech.verifying', '', true);
  RETURN v_at;
END
$$;

-- The one audited erasure (rule 13, "Erasure"): for one document, an erased
-- document event naming the owner who asked or the system (2.3), with the reason
-- 'document_erased' (the domain honours a system erasure only with it; the
-- caller's reason goes to the audit event); every cited
-- excerpt set to "[erased]"; the extracted text deleted, unless another
-- document of the same project holds the same bytes and is not erased (2.3:
-- its evidence stays); each candidate whose evidence now comes only from
-- removed documents withdrawn, keeping its id and value; and one audit event
-- with ids and counts. It never changes a value. Files and derived files are
-- removed by the erasure job in the API (phase 2) around this call.
--
-- Nothing of the document comes back after it returns: the guards of 0009
-- refuse extracted text, evidence entries and excerpts for an erased document
-- or content hash. The erasure lock closes the race with a write in flight:
-- this function holds the lock exclusively for the (project, content hash) from
-- before its erased event to its commit, and those guards take it shared
-- before they look for the event. A write that got there first commits before
-- the erasure reads the excerpts and texts, so the erasure sees it; one that
-- comes later waits and then sees the erased event. Both sides run in READ
-- COMMITTED, where each statement sees what committed before it (SVE12
-- otherwise). The lock key is the one 0009's sovitech_guard.erasure_lock_key
-- computes, written out here because this role reads nothing of the guard schema.
CREATE FUNCTION sovitech.erase_document(p_audit_id uuid, p_event_id uuid, p_document_id uuid, p_role text, p_reason text)
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
  -- The erasure lock, exclusive until commit (see above); a second erasure of the document waits here too.
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
  IF NOT v_kept THEN
    WITH removed AS (
      DELETE FROM sovitech.document_texts AS extracted
      WHERE extracted.project_id = v_project AND extracted.content_hash = v_hash
      RETURNING extracted.part
    )
    SELECT count(*) INTO v_parts FROM removed;
  END IF;

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

ALTER FUNCTION sovitech.open_review_item(uuid, uuid) OWNER TO sovitech_db_verifier;
ALTER FUNCTION sovitech.verify_candidate(uuid, uuid, text) OWNER TO sovitech_db_verifier;
ALTER FUNCTION sovitech.erase_document(uuid, uuid, uuid, text, text) OWNER TO sovitech_db_eraser;

REVOKE ALL ON FUNCTION sovitech.open_review_item(uuid, uuid), sovitech.verify_candidate(uuid, uuid, text),
  sovitech.erase_document(uuid, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sovitech.open_review_item(uuid, uuid), sovitech.verify_candidate(uuid, uuid, text),
  sovitech.erase_document(uuid, uuid, uuid, text, text) TO sovitech_db_app;

GRANT SELECT ON sovitech.app_users, sovitech.projects, sovitech.candidates, sovitech.candidate_events,
  sovitech.review_item_opens TO sovitech_db_verifier;
GRANT INSERT ON sovitech.candidate_events, sovitech.review_item_opens TO sovitech_db_verifier;

GRANT SELECT ON sovitech.app_users, sovitech.project_members, sovitech.documents, sovitech.document_events,
  sovitech.evidence_locators, sovitech.evidence_excerpts, sovitech.document_texts, sovitech.candidates,
  sovitech.candidate_events TO sovitech_db_eraser;
GRANT INSERT ON sovitech.document_events, sovitech.candidate_events, sovitech.audit_events TO sovitech_db_eraser;
GRANT UPDATE (text, erased_at) ON sovitech.evidence_excerpts TO sovitech_db_eraser;
GRANT DELETE ON sovitech.document_texts TO sovitech_db_eraser;
