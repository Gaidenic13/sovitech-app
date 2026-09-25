-- 0009: the guards. Runs as the database administrator; every function here is
-- owned by sovitech_db_guard, which nobody logs in as or is a member of, so no
-- ordinary migration can replace one.
--
--  1. Append-only (guardrails 2.4, rule 4; prompt 3 5.2 "Database"): raising
--     triggers refuse UPDATE, DELETE and TRUNCATE on candidates, evidence and
--     every event table, for every role that can reach them, the table owner
--     included. The one exception is sovitech.erase_document (rule 13).
--  2. One writer each: engineer_verified only from sovitech.verify_candidate
--     (rule 10); an erased document event only from sovitech.erase_document;
--     accounts, roles, projects and audit events only from their functions.
--  3. Storage checks rule 1 and 2.5 need at the store: a document candidate
--     commits only with verified evidence and an AI candidate with evidence,
--     evidence only with its excerpt, a document only with its first analysis
--     event; every candidate names the request's own user as its author, from
--     a source that user may create (2.1); every candidate, field, document and
--     asset event carries the request's own user and a role that user holds
--     (never the caller's word alone), and the system writes only the events
--     the engine and the ingestion paths need.
--  3a. Rule 13, "Erasure": no extracted text, evidence entry or excerpt is
--     stored for an erased document or content hash, and a write in flight
--     cannot slip past an erasure (the erasure lock; 0008).
--  4. The relations the definer functions trust for who a user is and what they
--     hold belong to sovitech_db_access, which no migration acts as.
--  5. An event trigger re-checks the whole set after every DDL command, so a
--     migration that would disable, drop, replace or bypass a guard fails and is
--     rolled back.

-- ---------------------------------------------------------------------------
-- Trigger functions
-- ---------------------------------------------------------------------------

CREATE FUNCTION sovitech_guard.refuse_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'SVA01',
    MESSAGE = format('%s on sovitech.%s is refused: rows here are append-only', TG_OP, TG_TABLE_NAME);
END
$$;

-- Evidence excerpts: the erasure function alone may set the text to "[erased]".
CREATE FUNCTION sovitech_guard.excerpt_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND current_user = 'sovitech_db_eraser'
     AND OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL AND NEW.text = '[erased]'
     AND NEW.evidence_id = OLD.evidence_id AND NEW.project_id = OLD.project_id
     AND NEW.content_hash = OLD.content_hash AND NEW.created_at = OLD.created_at THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION USING
    ERRCODE = 'SVA01',
    MESSAGE = format('%s on sovitech.evidence_excerpts is refused: only the erasure function changes an excerpt, to [erased]', TG_OP);
END
$$;

-- Extracted document text: the erasure function alone may delete it.
CREATE FUNCTION sovitech_guard.text_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_user = 'sovitech_db_eraser' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION USING
    ERRCODE = 'SVA01',
    MESSAGE = format('%s on sovitech.document_texts is refused: only the erasure function deletes extracted text', TG_OP);
END
$$;

-- An AFTER trigger, so it reads the row exactly as stored.
CREATE FUNCTION sovitech_guard.engineer_verified_written() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.type = 'engineer_verified' AND (
       current_user <> 'sovitech_db_verifier'
       OR pg_catalog.current_setting('sovitech.verifying', true) IS DISTINCT FROM (NEW.candidate_id::text || '/' || NEW.actor)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVV10', MESSAGE = 'engineer_verified is written only by sovitech.verify_candidate';
  END IF;
  RETURN NULL;
END
$$;

CREATE FUNCTION sovitech_guard.document_event_written() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.type = 'erased' AND current_user <> 'sovitech_db_eraser' THEN
    RAISE EXCEPTION USING ERRCODE = 'SVE10', MESSAGE = 'an erased document event is written only by sovitech.erase_document';
  END IF;
  RETURN NEW;
END
$$;

-- Rows only a named definer role writes. The trigger's arguments name the roles.
CREATE FUNCTION sovitech_guard.written_only_by() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT (current_user::text = ANY (TG_ARGV)) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'SVR10',
      MESSAGE = format('rows of sovitech.%s are written only by their guarded function', TG_TABLE_NAME);
  END IF;
  RETURN NEW;
END
$$;

-- 2.5: "Only engineer accounts write them": the engineer making the request, as a person.
CREATE FUNCTION sovitech_guard.asset_event_written() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.actor IS DISTINCT FROM sovitech.request_user_id()::text
     OR NOT sovitech.request_user_acts_as(NEW.project_id, 'sovitech_engineer') THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX07', MESSAGE = 'asset events come only from the engineer making the request';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.unnest(NEW.related_asset_ids) AS related (asset_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM sovitech.asset_identities AS identity
      WHERE identity.project_id = NEW.project_id AND identity.asset_id = related.asset_id
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX08', MESSAGE = 'a related asset is not an asset of this project';
  END IF;
  RETURN NEW;
END
$$;

-- 2.4 and rule 4 ("Only the right person's resolution closes a conflict. Each
-- resolution records who"), rule 3 (who confirms) and rule 10: a candidate,
-- field or document event names the request's own user and a role that user
-- holds (sovitech.request_user_acts_as, 0006). A system event comes from a
-- service account that is a member of the project; the erasure function
-- withdraws, as the system, the candidates it leaves without a source (rule 13,
-- ADR 0015).
--
-- On a candidate, the system writes only what the engine and the ingestion
-- paths need (SVX13): the engine's supersession of a calculated or estimated
-- value (2.4 "Recalculation": "the engine appends a new calculated candidate
-- and supersedes the old one"), and the withdrawal of a value every document of
-- which is removed (2.3 "Deleting a document"; rule 13 "Erasure"), with the
-- reason that says so. A person withdraws only their own `user` value (SVX14);
-- a document value leaves with its document, and a correction is a rejection
-- (rule 4). On a document, the system writes a withdrawal only as the job that
-- carries out the owner's or an engineer's own withdrawal of that document, which
-- it names (request_event_id; SVX15; the CHECKs of 0002 hold the column to a
-- system withdrawal and require it there): 2.3 and rule 13 describe no document
-- leaving with no person's action, and rule 4 keeps a value from going silently.
-- The domain's derive holds the same events and no others (ADR 0016).
-- It reads as the invoker: row-level security shows it the project in scope,
-- which is the event's project whenever the insert can succeed.
CREATE FUNCTION sovitech_guard.event_actor_written() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.role = 'system' THEN
    IF current_user = 'sovitech_db_eraser' AND TG_TABLE_NAME = 'candidate_events' AND NEW.type = 'withdrawn' THEN
      RETURN NEW;
    END IF;
    IF NOT sovitech.request_user_acts_as(NEW.project_id, 'system') THEN
      RAISE EXCEPTION USING ERRCODE = 'SVX09',
        MESSAGE = format('a system event on sovitech.%s comes only from a service account that is a member of the project', TG_TABLE_NAME);
    END IF;
    IF TG_TABLE_NAME = 'candidate_events' THEN
      IF NEW.type = 'superseded' AND EXISTS (
        SELECT 1 FROM sovitech.candidates AS candidate
        WHERE candidate.project_id = NEW.project_id AND candidate.id = NEW.candidate_id
          AND candidate.source IN ('calculated', 'estimated')
      ) THEN
        RETURN NEW;
      END IF;
      IF NEW.type = 'withdrawn' AND NEW.reason IN ('document_erased', 'document_deleted')
         AND EXISTS (SELECT 1 FROM sovitech.evidence_locators AS locator WHERE locator.candidate_id = NEW.candidate_id)
         AND NOT EXISTS (
           SELECT 1 FROM sovitech.evidence_locators AS locator
           WHERE locator.candidate_id = NEW.candidate_id
             AND NOT EXISTS (
               SELECT 1 FROM sovitech.document_events AS removal
               WHERE removal.document_id = locator.document_id AND removal.type IN ('withdrawn', 'erased')
             )
         ) THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION USING ERRCODE = 'SVX13',
        MESSAGE = 'the system supersedes only a calculated or estimated value, and withdraws only a value whose documents are all removed';
    END IF;
    -- (Nested, so request_event_id is read only on document events.)
    IF TG_TABLE_NAME = 'document_events' THEN
      IF NEW.type = 'withdrawn' AND NEW.request_event_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM sovitech.document_events AS request
        WHERE request.project_id = NEW.project_id AND request.document_id = NEW.document_id AND request.id = NEW.request_event_id
          AND request.type = 'withdrawn' AND request.role IN ('owner', 'sovitech_engineer')
      ) THEN
        RAISE EXCEPTION USING ERRCODE = 'SVX15',
          MESSAGE = 'the system withdraws a document only to carry out the owner''s or an engineer''s own withdrawal of it, which it names';
      END IF;
    END IF;
  ELSE
    IF NEW.actor IS DISTINCT FROM sovitech.request_user_id()::text
       OR NOT sovitech.request_user_acts_as(NEW.project_id, NEW.role) THEN
      RAISE EXCEPTION USING ERRCODE = 'SVX09',
        MESSAGE = format('an event on sovitech.%s names the user making the request, in a role that user holds', TG_TABLE_NAME);
    END IF;
    -- (Nested, so the candidate's columns are read only on candidate events.)
    IF TG_TABLE_NAME = 'candidate_events' THEN
      IF NEW.type = 'withdrawn' AND NOT EXISTS (
        SELECT 1 FROM sovitech.candidates AS candidate
        WHERE candidate.project_id = NEW.project_id AND candidate.id = NEW.candidate_id
          AND candidate.source = 'user' AND candidate.created_by = NEW.actor
      ) THEN
        RAISE EXCEPTION USING ERRCODE = 'SVX14', MESSAGE = 'a person withdraws only their own user value';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END
$$;

-- 2.1, "Who can create it": `user` is "The owner's or engineer's own action";
-- `document` and `ai_inference` come from extraction, `calculated` and
-- `estimated` from "The calculation engine only", `reference` from "Code, from
-- the named dataset and version". So a candidate names the request's own user
-- as its author (created_by), and its source is one that user may create: a
-- `user` value from an owner member of the project (or the demo seed on a demo
-- project) or from a person holding sovitech_engineer (a site survey entry);
-- every other source from a service account that is a member of the project.
-- Nobody else writes a value in the owner's name (SVX11).
--
-- The guard also records the role the author acted in (author_role, 0003), from
-- the request and never from the caller: 'owner' when the request's user acts as
-- the owner of the project, else 'sovitech_engineer' for an engineer's `user`
-- value, and 'system' for every other source. Whatever the statement named is
-- overwritten. On a decision field only the owner's own `user` value is the
-- owner's choice (rule 3, "Choices belong to the owner"; rule 11, Fire Safety is
-- the owner's opt-in): the domain's derive refuses an engineer's entry there
-- (ADR 0016), since the store does not know a field's kind.
CREATE FUNCTION sovitech_guard.candidate_author_written() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM sovitech.request_user_id()::text THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX11', MESSAGE = 'a candidate names the user making the request as its author';
  END IF;
  IF NEW.source = 'user' THEN
    IF sovitech.request_user_acts_as(NEW.project_id, 'owner') THEN
      NEW.author_role := 'owner';
    ELSIF sovitech.request_user_acts_as(NEW.project_id, 'sovitech_engineer') THEN
      NEW.author_role := 'sovitech_engineer';
    ELSE
      RAISE EXCEPTION USING ERRCODE = 'SVX11',
        MESSAGE = 'a user value comes from the owner, a member of the project, or from an engineer, in their own name';
    END IF;
  ELSIF sovitech.request_user_acts_as(NEW.project_id, 'system') THEN
    NEW.author_role := 'system';
  ELSE
    RAISE EXCEPTION USING ERRCODE = 'SVX11',
      MESSAGE = format('a %s value comes only from a service account that is a member of the project', NEW.source);
  END IF;
  RETURN NEW;
END
$$;

-- Rule 13, "Erasure": after an erasure, nothing of the document comes back.
-- The erasure lock of one (project, content hash): sovitech.erase_document (0008)
-- holds it exclusively from before its erased event to its commit; the guards
-- below take it shared before they look for that event, so a write in flight
-- either commits before the erasure reads, or waits and sees the erasure.
CREATE FUNCTION sovitech_guard.erasure_lock_key(p_project_id uuid, p_content_hash text) RETURNS bigint
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, pg_temp
AS $$ SELECT pg_catalog.hashtextextended('sovitech erasure ' || p_project_id::text || ' ' || p_content_hash, 0) $$;

-- Takes the erasure lock shared, in READ COMMITTED only (where the check that
-- follows sees an erasure that committed while this transaction waited).
CREATE FUNCTION sovitech_guard.await_erasure(p_project_id uuid, p_content_hash text) RETURNS void
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF pg_catalog.current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION USING ERRCODE = 'SVE12',
      MESSAGE = 'document text and evidence are written in READ COMMITTED transactions, so an erasure is never missed';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock_shared(sovitech_guard.erasure_lock_key(p_project_id, p_content_hash));
END
$$;

-- An evidence entry (of a candidate or an asset appearance) and its excerpt
-- never cite an erased document (SVE11).
CREATE FUNCTION sovitech_guard.evidence_source_written() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_document uuid;
BEGIN
  PERFORM sovitech_guard.await_erasure(NEW.project_id, NEW.content_hash);
  IF TG_TABLE_NAME = 'evidence_locators' THEN
    v_document := NEW.document_id;
  ELSE
    SELECT locator.document_id INTO v_document FROM sovitech.evidence_locators AS locator
    WHERE locator.project_id = NEW.project_id AND locator.id = NEW.evidence_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM sovitech.document_events AS event WHERE event.document_id = v_document AND event.type = 'erased'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVE11', MESSAGE = format('sovitech.%s cites an erased document', TG_TABLE_NAME);
  END IF;
  RETURN NEW;
END
$$;

-- 2.4 Candidate.method.inputCandidateIds: the candidates the method used, all of this project.
CREATE FUNCTION sovitech_guard.candidate_written() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.method_input_candidate_ids IS NOT NULL AND EXISTS (
    SELECT 1 FROM pg_catalog.unnest(NEW.method_input_candidate_ids) AS input (candidate_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM sovitech.candidates AS candidate
      WHERE candidate.project_id = NEW.project_id AND candidate.id = input.candidate_id
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX04', MESSAGE = 'a method input is not a candidate of this project';
  END IF;
  RETURN NEW;
END
$$;

-- A resolution chooses a candidate of the same subject and field, and names the
-- candidates it covered: each once, each a candidate of that subject and field.
CREATE FUNCTION sovitech_guard.field_event_written() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.chosen_candidate_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sovitech.candidates AS candidate
    WHERE candidate.project_id = NEW.project_id AND candidate.id = NEW.chosen_candidate_id
      AND candidate.subject_id = NEW.subject_id AND candidate.field_key = NEW.field_key
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX05', MESSAGE = 'the chosen candidate is not a candidate of this field';
  END IF;
  IF NEW.covered_candidate_ids IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM pg_catalog.unnest(NEW.covered_candidate_ids) AS covered (candidate_id)
      WHERE NOT EXISTS (
        SELECT 1 FROM sovitech.candidates AS candidate
        WHERE candidate.project_id = NEW.project_id AND candidate.id = covered.candidate_id
          AND candidate.subject_id = NEW.subject_id AND candidate.field_key = NEW.field_key
      )
    )
    OR (SELECT count(DISTINCT covered.candidate_id) FROM pg_catalog.unnest(NEW.covered_candidate_ids) AS covered (candidate_id))
       <> pg_catalog.cardinality(NEW.covered_candidate_ids)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX10', MESSAGE = 'a covered candidate is not a candidate of this field, or is named twice';
  END IF;
  RETURN NEW;
END
$$;

-- Extracted text belongs to a document of the same project with the same bytes
-- (SVX06) that is not erased (SVE11): the text of a content hash stays while
-- another document of the project with the same bytes is not erased (2.3;
-- US-DOCS-21 AC8), and never comes back once every such document is.
CREATE FUNCTION sovitech_guard.document_text_written() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  PERFORM sovitech_guard.await_erasure(NEW.project_id, NEW.content_hash);
  IF NOT EXISTS (
    SELECT 1 FROM sovitech.documents AS document
    WHERE document.project_id = NEW.project_id AND document.content_hash = NEW.content_hash
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX06', MESSAGE = 'extracted text needs a document of this project with the same content hash';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM sovitech.documents AS document
    WHERE document.project_id = NEW.project_id AND document.content_hash = NEW.content_hash
      AND NOT EXISTS (
        SELECT 1 FROM sovitech.document_events AS event WHERE event.document_id = document.id AND event.type = 'erased'
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVE11', MESSAGE = 'extracted text of an erased document is not stored again';
  END IF;
  RETURN NEW;
END
$$;

-- Deferred to commit, so a candidate and its evidence are written in one
-- transaction. A document value stands at "a verified location" (2.1, rule 1):
-- it needs at least one entry whose check matched (text_match, ocr_match,
-- region_rendered); unverifiable evidence alone only caps an inference's
-- confidence at low (rule 1), so an ai_inference needs any entry.
CREATE FUNCTION sovitech_guard.candidate_has_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.source = 'document' AND NOT EXISTS (
    SELECT 1 FROM sovitech.evidence_locators AS locator
    WHERE locator.candidate_id = NEW.id AND locator.evidence_check IN ('text_match', 'ocr_match', 'region_rendered')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX01', MESSAGE = 'a document candidate is stored only with evidence whose check matched its location';
  END IF;
  IF NEW.source = 'ai_inference' AND NOT EXISTS (
    SELECT 1 FROM sovitech.evidence_locators AS locator WHERE locator.candidate_id = NEW.id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX01', MESSAGE = 'an ai_inference candidate is stored only with its evidence';
  END IF;
  RETURN NULL;
END
$$;

-- Deferred to commit: a document is registered with its first analysis event
-- (2.3 DocumentRecord.analysis; rule 12, coverage recorded by code), so no
-- document reads as having no analysis at all (SVX12).
CREATE FUNCTION sovitech_guard.document_has_analysis() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM sovitech.document_analysis_events AS analysis
    WHERE analysis.project_id = NEW.project_id AND analysis.document_id = NEW.id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX12', MESSAGE = 'a document is stored only with its first analysis event';
  END IF;
  RETURN NULL;
END
$$;

CREATE FUNCTION sovitech_guard.locator_has_excerpt() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sovitech.evidence_excerpts AS excerpt WHERE excerpt.evidence_id = NEW.id) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX02', MESSAGE = 'an evidence entry is stored only with its excerpt';
  END IF;
  RETURN NULL;
END
$$;

CREATE FUNCTION sovitech_guard.appearance_has_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sovitech.evidence_locators AS locator WHERE locator.appearance_id = NEW.id) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX03', MESSAGE = 'an asset appearance is stored only with its evidence';
  END IF;
  RETURN NULL;
END
$$;

-- ---------------------------------------------------------------------------
-- The registry of what must hold, and the check
-- ---------------------------------------------------------------------------

CREATE TABLE sovitech_guard.required_triggers (
  table_name text NOT NULL,
  trigger_name text NOT NULL,
  PRIMARY KEY (table_name, trigger_name)
);
-- Tables on which no login role may UPDATE, DELETE or TRUNCATE.
CREATE TABLE sovitech_guard.append_only_tables (table_name text PRIMARY KEY);
-- Tables row-level security must scope to one project.
CREATE TABLE sovitech_guard.project_tables (table_name text PRIMARY KEY);
CREATE TABLE sovitech_guard.guarded_functions (
  signature text PRIMARY KEY,
  owner_role text NOT NULL,
  security_definer boolean NOT NULL
);
-- Relations of schema sovitech owned by a role other than sovitech_db_owner:
-- those the definer functions trust for who a user is and what they hold.
CREATE TABLE sovitech_guard.relation_owners (
  relation_name text PRIMARY KEY,
  owner_role text NOT NULL
);
-- The shape of every registered table and of every view of schema sovitech as
-- installed: columns (type, collation, not null, default), constraints, unique
-- indexes, policies, triggers, row security, privileges, and each view's
-- definition and options; and the default privileges of the store's roles.
-- A column, constraint or unique index that is dropped or changed, and a
-- policy, trigger, privilege, default privilege or view that is added, dropped
-- or changed, is a guard lost; a new column is not, and neither is a new
-- constraint or unique index except on a table the two guarded functions write.
CREATE TABLE sovitech_guard.recorded_shape (
  table_name text NOT NULL,
  kind text NOT NULL,
  name text NOT NULL,
  definition text NOT NULL,
  PRIMARY KEY (table_name, kind, name)
);

DO $install$
DECLARE
  stored text;
  wanted record;
BEGIN
  -- Every table of the value store, append-only for every login role.
  FOREACH stored IN ARRAY ARRAY[
    'app_users', 'app_role_events', 'projects', 'project_members', 'audit_events',
    'subjects', 'documents', 'document_events', 'document_analysis_events', 'document_texts',
    'candidates', 'evidence_locators', 'evidence_excerpts', 'candidate_events', 'field_events',
    'asset_identities', 'asset_appearances', 'asset_events', 'guardrail_events', 'review_item_opens',
    'quotation_records', 'quotation_record_inputs', 'proposal_snapshots', 'proposal_snapshot_candidates',
    'proposal_snapshot_formulas'
  ]
  LOOP
    INSERT INTO sovitech_guard.append_only_tables (table_name) VALUES (stored);
    EXECUTE format(
      'CREATE TRIGGER guard_no_truncate BEFORE TRUNCATE ON sovitech.%I FOR EACH STATEMENT EXECUTE FUNCTION sovitech_guard.refuse_change()',
      stored
    );
    INSERT INTO sovitech_guard.required_triggers VALUES (stored, 'guard_no_truncate');
    IF stored = 'evidence_excerpts' THEN
      EXECUTE 'CREATE TRIGGER guard_change BEFORE UPDATE OR DELETE ON sovitech.evidence_excerpts '
              'FOR EACH ROW EXECUTE FUNCTION sovitech_guard.excerpt_change()';
    ELSIF stored = 'document_texts' THEN
      EXECUTE 'CREATE TRIGGER guard_change BEFORE UPDATE OR DELETE ON sovitech.document_texts '
              'FOR EACH ROW EXECUTE FUNCTION sovitech_guard.text_change()';
    ELSE
      EXECUTE format(
        'CREATE TRIGGER guard_change BEFORE UPDATE OR DELETE ON sovitech.%I FOR EACH ROW EXECUTE FUNCTION sovitech_guard.refuse_change()',
        stored
      );
    END IF;
    INSERT INTO sovitech_guard.required_triggers VALUES (stored, 'guard_change');
  END LOOP;

  -- Rows with one writer each.
  FOR wanted IN
    SELECT * FROM (VALUES
      ('app_users', 'sovitech_db_access'),
      ('app_role_events', 'sovitech_db_access'),
      ('projects', 'sovitech_db_access'),
      ('project_members', 'sovitech_db_access'),
      ('audit_events', 'sovitech_db_access, sovitech_db_eraser'),
      ('review_item_opens', 'sovitech_db_verifier'),
      -- The stage 3 record has no writer until one is decided (PRD D-20).
      ('quotation_records', 'no_writer_decided'),
      ('quotation_record_inputs', 'no_writer_decided')
    ) AS writer (table_name, roles)
  LOOP
    EXECUTE format(
      'CREATE TRIGGER guard_writer BEFORE INSERT ON sovitech.%I FOR EACH ROW EXECUTE FUNCTION sovitech_guard.written_only_by(%s)',
      wanted.table_name,
      (SELECT string_agg(quote_literal(btrim(role_name)), ', ') FROM unnest(string_to_array(wanted.roles, ',')) AS role_name)
    );
    INSERT INTO sovitech_guard.required_triggers VALUES (wanted.table_name, 'guard_writer');
  END LOOP;

  -- Project-scoped tables.
  FOREACH stored IN ARRAY ARRAY[
    'projects', 'project_members', 'audit_events', 'subjects', 'documents', 'document_events',
    'document_analysis_events', 'document_texts', 'candidates', 'evidence_locators', 'evidence_excerpts',
    'candidate_events', 'field_events', 'asset_identities', 'asset_appearances', 'asset_events',
    'guardrail_events', 'review_item_opens', 'quotation_records', 'quotation_record_inputs',
    'proposal_snapshots', 'proposal_snapshot_candidates', 'proposal_snapshot_formulas'
  ]
  LOOP
    INSERT INTO sovitech_guard.project_tables (table_name) VALUES (stored);
  END LOOP;
END
$install$;

CREATE TRIGGER guard_engineer_verified AFTER INSERT ON sovitech.candidate_events
  FOR EACH ROW EXECUTE FUNCTION sovitech_guard.engineer_verified_written();
CREATE TRIGGER guard_erased_event BEFORE INSERT ON sovitech.document_events
  FOR EACH ROW EXECUTE FUNCTION sovitech_guard.document_event_written();
CREATE TRIGGER guard_asset_event BEFORE INSERT ON sovitech.asset_events
  FOR EACH ROW EXECUTE FUNCTION sovitech_guard.asset_event_written();
CREATE TRIGGER guard_event_actor BEFORE INSERT ON sovitech.candidate_events
  FOR EACH ROW EXECUTE FUNCTION sovitech_guard.event_actor_written();
CREATE TRIGGER guard_event_actor BEFORE INSERT ON sovitech.field_events
  FOR EACH ROW EXECUTE FUNCTION sovitech_guard.event_actor_written();
CREATE TRIGGER guard_event_actor BEFORE INSERT ON sovitech.document_events
  FOR EACH ROW EXECUTE FUNCTION sovitech_guard.event_actor_written();
CREATE TRIGGER guard_method_inputs BEFORE INSERT ON sovitech.candidates
  FOR EACH ROW EXECUTE FUNCTION sovitech_guard.candidate_written();
CREATE TRIGGER guard_candidate_author BEFORE INSERT ON sovitech.candidates
  FOR EACH ROW EXECUTE FUNCTION sovitech_guard.candidate_author_written();
CREATE TRIGGER guard_source_not_erased BEFORE INSERT ON sovitech.evidence_locators
  FOR EACH ROW EXECUTE FUNCTION sovitech_guard.evidence_source_written();
CREATE TRIGGER guard_source_not_erased BEFORE INSERT ON sovitech.evidence_excerpts
  FOR EACH ROW EXECUTE FUNCTION sovitech_guard.evidence_source_written();
CREATE CONSTRAINT TRIGGER guard_document_analysis AFTER INSERT ON sovitech.documents
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION sovitech_guard.document_has_analysis();
CREATE TRIGGER guard_chosen_candidate BEFORE INSERT ON sovitech.field_events
  FOR EACH ROW EXECUTE FUNCTION sovitech_guard.field_event_written();
CREATE TRIGGER guard_text_document BEFORE INSERT ON sovitech.document_texts
  FOR EACH ROW EXECUTE FUNCTION sovitech_guard.document_text_written();
CREATE CONSTRAINT TRIGGER guard_candidate_evidence AFTER INSERT ON sovitech.candidates
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION sovitech_guard.candidate_has_evidence();
CREATE CONSTRAINT TRIGGER guard_locator_excerpt AFTER INSERT ON sovitech.evidence_locators
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION sovitech_guard.locator_has_excerpt();
CREATE CONSTRAINT TRIGGER guard_appearance_evidence AFTER INSERT ON sovitech.asset_appearances
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION sovitech_guard.appearance_has_evidence();

INSERT INTO sovitech_guard.required_triggers VALUES
  ('candidate_events', 'guard_event_actor'),
  ('field_events', 'guard_event_actor'),
  ('document_events', 'guard_event_actor'),
  ('candidate_events', 'guard_engineer_verified'),
  ('document_events', 'guard_erased_event'),
  ('asset_events', 'guard_asset_event'),
  ('candidates', 'guard_method_inputs'),
  ('candidates', 'guard_candidate_author'),
  ('evidence_locators', 'guard_source_not_erased'),
  ('evidence_excerpts', 'guard_source_not_erased'),
  ('documents', 'guard_document_analysis'),
  ('field_events', 'guard_chosen_candidate'),
  ('document_texts', 'guard_text_document'),
  ('candidates', 'guard_candidate_evidence'),
  ('evidence_locators', 'guard_locator_excerpt'),
  ('asset_appearances', 'guard_appearance_evidence');

-- Every guard fires in every session, a replica-mode session included
-- (session_replication_role = replica skips ordinary triggers).
DO $always$
DECLARE
  required record;
BEGIN
  FOR required IN SELECT table_name, trigger_name FROM sovitech_guard.required_triggers LOOP
    EXECUTE format('ALTER TABLE sovitech.%I ENABLE ALWAYS TRIGGER %I', required.table_name, required.trigger_name);
  END LOOP;
END
$always$;

INSERT INTO sovitech_guard.guarded_functions (signature, owner_role, security_definer) VALUES
  ('sovitech.request_user_id()', 'sovitech_db_access', false),
  ('sovitech.user_holds_role(uuid, text)', 'sovitech_db_access', true),
  ('sovitech.request_user_acts_as(uuid, text)', 'sovitech_db_access', true),
  ('sovitech.current_project_id()', 'sovitech_db_access', true),
  ('sovitech.administering_user()', 'sovitech_db_access', true),
  ('sovitech.create_app_user(uuid, uuid, text, text, text)', 'sovitech_db_access', true),
  ('sovitech.grant_app_role(uuid, uuid, uuid, text, text)', 'sovitech_db_access', true),
  ('sovitech.revoke_app_role(uuid, uuid, uuid, text, text)', 'sovitech_db_access', true),
  ('sovitech.create_project(uuid, uuid, boolean)', 'sovitech_db_access', true),
  ('sovitech.add_project_member(uuid, uuid, uuid)', 'sovitech_db_access', true),
  ('sovitech.open_review_item(uuid, uuid)', 'sovitech_db_verifier', true),
  ('sovitech.verify_candidate(uuid, uuid, text)', 'sovitech_db_verifier', true),
  ('sovitech.erase_document(uuid, uuid, uuid, text, text)', 'sovitech_db_eraser', true);

-- The accounts, the role events and the current roles, the projects and their
-- members: what the definer functions trust for who a user is and what they
-- hold. They belong to sovitech_db_access, so no ordinary migration (run as
-- sovitech_db_owner) can alter, replace or redefine them (phase 1 review: an
-- ordinary migration replaced the current-roles view and made every account an
-- engineer). The request views of 0006 belong to it too.
INSERT INTO sovitech_guard.relation_owners (relation_name, owner_role) VALUES
  ('app_users', 'sovitech_db_access'),
  ('app_role_events', 'sovitech_db_access'),
  ('app_user_roles', 'sovitech_db_access'),
  ('projects', 'sovitech_db_access'),
  ('project_members', 'sovitech_db_access'),
  ('request_accounts', 'sovitech_db_access'),
  ('request_account_roles', 'sovitech_db_access');
ALTER TABLE sovitech.app_users OWNER TO sovitech_db_access;
ALTER TABLE sovitech.app_role_events OWNER TO sovitech_db_access;
ALTER VIEW sovitech.app_user_roles OWNER TO sovitech_db_access;
ALTER TABLE sovitech.projects OWNER TO sovitech_db_access;
ALTER TABLE sovitech.project_members OWNER TO sovitech_db_access;

-- The shape of every relation of schema sovitech now, deparsed with a fixed
-- search path, and the default privileges that name a role of the store (a
-- default privilege is a grant on every table or function created later, so
-- one added by a migration would hand the next reviewed table to the app or the
-- operator's login unseen; they are recorded under the pseudo relation
-- '(default privileges)').
CREATE FUNCTION sovitech_guard.current_shape() RETURNS TABLE (table_name text, kind text, name text, definition text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
  -- Columns: type and collation (a collation decides how the guards compare
  -- text), not null, default (a default decides every time the database sets),
  -- identity and generation.
  SELECT rel.relname::text, 'column', att.attname::text,
         pg_catalog.format_type(att.atttypid, att.atttypmod)
           || CASE WHEN att.attcollation <> 0
                   THEN ' collate ' || pg_catalog.quote_ident(coll_space.nspname) || '.' || pg_catalog.quote_ident(coll.collname)
                   ELSE '' END
           || CASE WHEN att.attnotnull THEN ' not null' ELSE '' END
           || coalesce(' default ' || pg_catalog.pg_get_expr(def.adbin, def.adrelid), '')
           || CASE WHEN att.attidentity <> '' THEN ' identity ' || att.attidentity::text ELSE '' END
           || CASE WHEN att.attgenerated <> '' THEN ' generated ' || att.attgenerated::text ELSE '' END
  FROM pg_catalog.pg_attribute AS att
  JOIN pg_catalog.pg_class AS rel ON rel.oid = att.attrelid
  JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
  LEFT JOIN pg_catalog.pg_attrdef AS def ON def.adrelid = att.attrelid AND def.adnum = att.attnum
  LEFT JOIN pg_catalog.pg_collation AS coll ON coll.oid = att.attcollation
  LEFT JOIN pg_catalog.pg_namespace AS coll_space ON coll_space.oid = coll.collnamespace
  WHERE space.nspname = 'sovitech' AND rel.relkind = 'r' AND att.attnum > 0 AND NOT att.attisdropped
  UNION ALL
  SELECT rel.relname::text, 'constraint', con.conname::text, pg_catalog.pg_get_constraintdef(con.oid, true)
  FROM pg_catalog.pg_constraint AS con
  JOIN pg_catalog.pg_class AS rel ON rel.oid = con.conrelid
  JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
  WHERE space.nspname = 'sovitech' AND rel.relkind = 'r' AND con.contype <> 't'
  UNION ALL
  -- Unique indexes: one that is dropped lets a second row through (one ordinal
  -- per evidence entry); one that is added can refuse a row a guarded function must write.
  SELECT rel.relname::text, 'unique index', idx.relname::text, pg_catalog.pg_get_indexdef(ind.indexrelid)
  FROM pg_catalog.pg_index AS ind
  JOIN pg_catalog.pg_class AS idx ON idx.oid = ind.indexrelid
  JOIN pg_catalog.pg_class AS rel ON rel.oid = ind.indrelid
  JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
  WHERE space.nspname = 'sovitech' AND rel.relkind = 'r' AND ind.indisunique
  UNION ALL
  -- Default privileges of a role of the store, or granting to one.
  SELECT '(default privileges)', 'default privilege',
         format('%s in %s on %s', pg_catalog.pg_get_userbyid(acl_default.defaclrole),
                coalesce(space.nspname::text, 'every schema'), acl_default.defaclobjtype),
         coalesce((
           SELECT string_agg(entry.text, ', ' ORDER BY entry.text)
           FROM (
             SELECT CASE WHEN acl.grantee = 0 THEN 'public' ELSE pg_catalog.pg_get_userbyid(acl.grantee)::text END
                    || ' ' || acl.privilege_type || CASE WHEN acl.is_grantable THEN ' with grant option' ELSE '' END AS text
             FROM pg_catalog.aclexplode(acl_default.defaclacl) AS acl
           ) AS entry
         ), 'none')
  FROM pg_catalog.pg_default_acl AS acl_default
  LEFT JOIN pg_catalog.pg_namespace AS space ON space.oid = acl_default.defaclnamespace
  WHERE pg_catalog.pg_get_userbyid(acl_default.defaclrole) LIKE 'sovitech\_db\_%'
     OR EXISTS (
       SELECT 1 FROM pg_catalog.aclexplode(acl_default.defaclacl) AS acl
       WHERE acl.grantee <> 0 AND pg_catalog.pg_get_userbyid(acl.grantee) LIKE 'sovitech\_db\_%'
     )
  UNION ALL
  SELECT rel.relname::text, 'policy', policy.polname::text,
         format('%s %s to %s using %s check %s', policy.polcmd,
           CASE WHEN policy.polpermissive THEN 'permissive' ELSE 'restrictive' END,
           (SELECT string_agg(CASE WHEN grantee = 0 THEN 'public' ELSE pg_catalog.pg_get_userbyid(grantee)::text END, ',' ORDER BY 1)
              FROM pg_catalog.unnest(policy.polroles) AS grantee),
           coalesce(pg_catalog.pg_get_expr(policy.polqual, policy.polrelid), '-'),
           coalesce(pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid), '-'))
  FROM pg_catalog.pg_policy AS policy
  JOIN pg_catalog.pg_class AS rel ON rel.oid = policy.polrelid
  JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
  WHERE space.nspname = 'sovitech'
  UNION ALL
  SELECT rel.relname::text, 'trigger', trig.tgname::text, pg_catalog.pg_get_triggerdef(trig.oid, true) || ' ' || trig.tgenabled::text
  FROM pg_catalog.pg_trigger AS trig
  JOIN pg_catalog.pg_class AS rel ON rel.oid = trig.tgrelid
  JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
  WHERE space.nspname = 'sovitech' AND NOT trig.tgisinternal
  UNION ALL
  SELECT rel.relname::text, 'row security', 'state',
         CASE WHEN rel.relrowsecurity THEN 'on' ELSE 'off' END || CASE WHEN rel.relforcerowsecurity THEN ', forced' ELSE '' END
  FROM pg_catalog.pg_class AS rel
  JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
  WHERE space.nspname = 'sovitech' AND rel.relkind = 'r'
  UNION ALL
  -- Views: the query, and the options (security_barrier among them).
  SELECT rel.relname::text, 'view', 'definition', pg_catalog.pg_get_viewdef(rel.oid, true)
  FROM pg_catalog.pg_class AS rel
  JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
  WHERE space.nspname = 'sovitech' AND rel.relkind IN ('v', 'm')
  UNION ALL
  SELECT rel.relname::text, 'options', 'reloptions',
         coalesce((SELECT string_agg(option, ',' ORDER BY option) FROM pg_catalog.unnest(rel.reloptions) AS option), 'none')
  FROM pg_catalog.pg_class AS rel
  JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
  WHERE space.nspname = 'sovitech' AND rel.relkind IN ('v', 'm')
  UNION ALL
  -- Privileges, one row per grantee: on the relation, and on each column.
  SELECT granted.relname, 'privilege', granted.grantee, string_agg(granted.entry, ', ' ORDER BY granted.entry)
  FROM (
    SELECT rel.relname::text AS relname,
           CASE WHEN acl.grantee = 0 THEN 'public' ELSE pg_catalog.pg_get_userbyid(acl.grantee)::text END AS grantee,
           acl.privilege_type || CASE WHEN acl.is_grantable THEN ' with grant option' ELSE '' END AS entry
    FROM pg_catalog.pg_class AS rel
    JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(rel.relacl) AS acl
    WHERE space.nspname = 'sovitech' AND rel.relkind IN ('r', 'v', 'm')
    UNION ALL
    SELECT rel.relname::text,
           CASE WHEN acl.grantee = 0 THEN 'public' ELSE pg_catalog.pg_get_userbyid(acl.grantee)::text END,
           acl.privilege_type || ' (' || att.attname::text || ')' || CASE WHEN acl.is_grantable THEN ' with grant option' ELSE '' END
    FROM pg_catalog.pg_attribute AS att
    JOIN pg_catalog.pg_class AS rel ON rel.oid = att.attrelid
    JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(att.attacl) AS acl
    WHERE space.nspname = 'sovitech' AND rel.relkind IN ('r', 'v', 'm') AND att.attnum > 0 AND NOT att.attisdropped
  ) AS granted
  GROUP BY granted.relname, granted.grantee
$$;

-- The relations whose shape is recorded: every registered table, every view of
-- schema sovitech, and the default privileges (a pseudo relation).
CREATE FUNCTION sovitech_guard.recorded_relations() RETURNS TABLE (relation_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
  SELECT stored.table_name FROM sovitech_guard.append_only_tables AS stored
  UNION
  SELECT rel.relname::text
  FROM pg_catalog.pg_class AS rel
  JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
  WHERE space.nspname = 'sovitech' AND rel.relkind IN ('v', 'm')
  UNION
  SELECT '(default privileges)'
$$;

-- Records the shape of every registered table and every view. Only an admin
-- migration calls it, after a reviewed change to a relation of the store.
CREATE FUNCTION sovitech_guard.record_shape() RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
  DELETE FROM sovitech_guard.recorded_shape;
  INSERT INTO sovitech_guard.recorded_shape (table_name, kind, name, definition)
  SELECT shape.table_name, shape.kind, shape.name, shape.definition
  FROM sovitech_guard.current_shape() AS shape
  WHERE shape.table_name IN (SELECT recorded.relation_name FROM sovitech_guard.recorded_relations() AS recorded);
$$;

-- Tables of schema sovitech with no registered guards. Every table of the value
-- store is registered with its guards in an admin migration; the migration
-- runner refuses a migration that leaves one unregistered.
CREATE FUNCTION sovitech_guard.unguarded_tables() RETURNS TABLE (problem text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
  SELECT format('sovitech.%s has no registered guards', rel.relname)
  FROM pg_catalog.pg_class AS rel
  JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
  WHERE space.nspname = 'sovitech' AND rel.relkind IN ('r', 'p')
    AND rel.relname NOT IN (SELECT stored.table_name FROM sovitech_guard.append_only_tables AS stored)
$$;

-- Every problem that would weaken a guard. Empty when all hold.
CREATE FUNCTION sovitech_guard.check_invariants() RETURNS TABLE (problem text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
  -- A recorded column (type, not null, default), constraint, policy, trigger, row-security
  -- state, privilege, or view query or options dropped or changed.
  SELECT format('%s %s of sovitech.%s was dropped or changed', recorded.kind, recorded.name, recorded.table_name)
  FROM sovitech_guard.recorded_shape AS recorded
  WHERE NOT EXISTS (
    SELECT 1 FROM sovitech_guard.current_shape() AS shape
    WHERE shape.table_name = recorded.table_name AND shape.kind = recorded.kind
      AND shape.name = recorded.name AND shape.definition = recorded.definition
  )
  UNION ALL
  -- A policy, trigger or privilege added to a registered table or a view, a view
  -- added, and a default privilege added for or to a role of the store.
  SELECT format('%s %s on sovitech.%s is not a recorded guard', shape.kind, shape.name, shape.table_name)
  FROM sovitech_guard.current_shape() AS shape
  WHERE shape.kind IN ('policy', 'trigger', 'privilege', 'view', 'options', 'default privilege')
    AND shape.table_name IN (SELECT recorded.relation_name FROM sovitech_guard.recorded_relations() AS recorded)
    AND NOT EXISTS (
      SELECT 1 FROM sovitech_guard.recorded_shape AS recorded
      WHERE recorded.table_name = shape.table_name AND recorded.kind = shape.kind AND recorded.name = shape.name
    )
  UNION ALL
  -- A constraint or unique index added to a table the two guarded functions write
  -- (erasure: document events, excerpts, texts, candidate events, audit events;
  -- verification: candidate events, opened items). An added CHECK against
  -- 'withdrawn' or 'engineer_verified' would silently stop rule 13's erasure or
  -- rule 10's verification; such a change is an admin migration that records the shape.
  SELECT format('%s %s on sovitech.%s is not recorded: the erasure and verification functions write this table',
                shape.kind, shape.name, shape.table_name)
  FROM sovitech_guard.current_shape() AS shape
  WHERE shape.kind IN ('constraint', 'unique index')
    AND shape.table_name IN ('candidate_events', 'document_events', 'evidence_excerpts', 'document_texts', 'audit_events', 'review_item_opens')
    AND NOT EXISTS (
      SELECT 1 FROM sovitech_guard.recorded_shape AS recorded
      WHERE recorded.table_name = shape.table_name AND recorded.kind = shape.kind AND recorded.name = shape.name
    )
  UNION ALL
  -- No collation, type or domain of the store's own: the guards compare with
  -- the built-in ones (a nondeterministic collation made 'BUILDING.ROOMS' equal
  -- 'building.rooms'). Only the row types of its tables and views live here.
  SELECT format('collation %s.%s is not part of the store', space.nspname, coll.collname)
  FROM pg_catalog.pg_collation AS coll
  JOIN pg_catalog.pg_namespace AS space ON space.oid = coll.collnamespace
  WHERE space.nspname IN ('sovitech', 'sovitech_guard')
  UNION ALL
  SELECT format('type %s.%s is not the row type of a table or view of the store', space.nspname, typ.typname)
  FROM pg_catalog.pg_type AS typ
  JOIN pg_catalog.pg_namespace AS space ON space.oid = typ.typnamespace
  LEFT JOIN pg_catalog.pg_class AS rel ON rel.oid = typ.typrelid
  LEFT JOIN pg_catalog.pg_type AS element ON element.oid = typ.typelem
  LEFT JOIN pg_catalog.pg_class AS element_rel ON element_rel.oid = element.typrelid
  WHERE space.nspname IN ('sovitech', 'sovitech_guard')
    AND NOT coalesce(rel.relkind IN ('r', 'p', 'v', 'm'), false)
    AND NOT coalesce(element_rel.relkind IN ('r', 'p', 'v', 'm'), false)
  UNION ALL
  -- No table of the store inherits from another or is inherited by one (a child's
  -- rows would read as the parent's without passing its guards).
  SELECT format('sovitech.%s and %s.%s are joined by inheritance', child.relname, parent_space.nspname, parent.relname)
  FROM pg_catalog.pg_inherits AS inheritance
  JOIN pg_catalog.pg_class AS child ON child.oid = inheritance.inhrelid
  JOIN pg_catalog.pg_namespace AS child_space ON child_space.oid = child.relnamespace
  JOIN pg_catalog.pg_class AS parent ON parent.oid = inheritance.inhparent
  JOIN pg_catalog.pg_namespace AS parent_space ON parent_space.oid = parent.relnamespace
  WHERE child_space.nspname = 'sovitech' OR parent_space.nspname = 'sovitech'
  UNION ALL
  -- Every function of schema sovitech is a registered guarded function; and every
  -- definer function a store role owns is one, or a guard function of the guard role.
  SELECT format('function %s in schema sovitech is not a guarded function', func.oid::regprocedure)
  FROM pg_catalog.pg_proc AS func
  JOIN pg_catalog.pg_namespace AS space ON space.oid = func.pronamespace
  WHERE space.nspname = 'sovitech'
    AND NOT EXISTS (
      SELECT 1 FROM sovitech_guard.guarded_functions AS guarded WHERE pg_catalog.to_regprocedure(guarded.signature) = func.oid
    )
  UNION ALL
  SELECT format('definer function %s of %s is not a guarded function', func.oid::regprocedure, pg_catalog.pg_get_userbyid(func.proowner))
  FROM pg_catalog.pg_proc AS func
  JOIN pg_catalog.pg_namespace AS space ON space.oid = func.pronamespace
  WHERE func.prosecdef
    AND pg_catalog.pg_get_userbyid(func.proowner) LIKE 'sovitech\_db\_%'
    AND space.nspname <> 'sovitech'
    AND NOT (space.nspname = 'sovitech_guard' AND func.proowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'sovitech_db_guard'))
  UNION ALL
  -- Only the schema's owner creates objects in it.
  SELECT format('%s may create objects in schema %s', account.rolname, space.nspname)
  FROM pg_catalog.pg_roles AS account
  CROSS JOIN pg_catalog.pg_namespace AS space
  WHERE space.nspname IN ('sovitech', 'sovitech_guard')
    AND account.rolname LIKE 'sovitech\_db\_%'
    AND account.rolname <> CASE space.nspname WHEN 'sovitech' THEN 'sovitech_db_owner' ELSE 'sovitech_db_guard' END
    AND pg_catalog.has_schema_privilege(account.oid, space.oid, 'CREATE')
  UNION ALL
  -- Both event triggers are there and fire in every session.
  SELECT format('event trigger %s is missing or not always enabled', wanted.name)
  FROM (VALUES ('sovitech_guard_after_ddl'), ('sovitech_guard_table_rewrite')) AS wanted (name)
  WHERE (SELECT count(*) FROM sovitech_guard.recorded_shape) > 0
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_event_trigger AS event WHERE event.evtname = wanted.name AND event.evtenabled = 'A'
    )
  UNION ALL
  -- Each guard trigger is there, enabled in every session, and runs a function of the guard role.
  SELECT format('trigger %s on sovitech.%s is missing, disabled or replaced', required.trigger_name, required.table_name)
  FROM sovitech_guard.required_triggers AS required
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS trig
    JOIN pg_catalog.pg_class AS rel ON rel.oid = trig.tgrelid
    JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
    JOIN pg_catalog.pg_proc AS func ON func.oid = trig.tgfoid
    JOIN pg_catalog.pg_namespace AS func_space ON func_space.oid = func.pronamespace
    WHERE space.nspname = 'sovitech' AND rel.relname = required.table_name AND trig.tgname = required.trigger_name
      AND trig.tgenabled = 'A' AND func_space.nspname = 'sovitech_guard'
      AND func.proowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'sovitech_db_guard')
  )
  UNION ALL
  -- No rewrite rule on a table of the store.
  SELECT format('rule %s on sovitech.%s', rewrite.rulename, rel.relname)
  FROM pg_catalog.pg_rewrite AS rewrite
  JOIN pg_catalog.pg_class AS rel ON rel.oid = rewrite.ev_class
  JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
  WHERE space.nspname = 'sovitech' AND rel.relkind IN ('r', 'p')
  UNION ALL
  -- Every table and view of the store belongs to its registered owner: the
  -- access role for the relations the definer functions trust, else the owner role.
  SELECT format('sovitech.%s belongs to %s', rel.relname, pg_catalog.pg_get_userbyid(rel.relowner))
  FROM pg_catalog.pg_class AS rel
  JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
  WHERE space.nspname = 'sovitech' AND rel.relkind IN ('r', 'p', 'v', 'm')
    AND rel.relowner IS DISTINCT FROM (
      SELECT account.oid FROM pg_catalog.pg_roles AS account
      WHERE account.rolname = coalesce(
        (SELECT registered.owner_role FROM sovitech_guard.relation_owners AS registered WHERE registered.relation_name = rel.relname),
        'sovitech_db_owner'
      )
    )
  UNION ALL
  SELECT format('sovitech.%s is missing', stored.table_name)
  FROM sovitech_guard.append_only_tables AS stored
  WHERE pg_catalog.to_regclass('sovitech.' || stored.table_name) IS NULL
  UNION ALL
  -- No login role may change or empty a table of the store.
  SELECT format('%s holds %s on sovitech.%s', login.name, privilege.name, stored.table_name)
  FROM sovitech_guard.append_only_tables AS stored
  CROSS JOIN (VALUES ('sovitech_db_app'), ('sovitech_db_admin'), ('sovitech_db_migrator')) AS login (name)
  CROSS JOIN (VALUES ('UPDATE'), ('DELETE'), ('TRUNCATE')) AS privilege (name)
  WHERE pg_catalog.to_regclass('sovitech.' || stored.table_name) IS NOT NULL
    AND pg_catalog.has_table_privilege(login.name, 'sovitech.' || stored.table_name, privilege.name)
  UNION ALL
  SELECT format('%s holds UPDATE on a column of sovitech.%s', login.name, stored.table_name)
  FROM sovitech_guard.append_only_tables AS stored
  CROSS JOIN (VALUES ('sovitech_db_app'), ('sovitech_db_admin'), ('sovitech_db_migrator')) AS login (name)
  WHERE pg_catalog.to_regclass('sovitech.' || stored.table_name) IS NOT NULL
    AND pg_catalog.has_any_column_privilege(login.name, 'sovitech.' || stored.table_name, 'UPDATE')
  UNION ALL
  -- Row-level security scopes every project table, the owner included.
  SELECT format('row security is off or has no project_scope policy on sovitech.%s', scoped.table_name)
  FROM sovitech_guard.project_tables AS scoped
  LEFT JOIN pg_catalog.pg_class AS rel ON rel.oid = pg_catalog.to_regclass('sovitech.' || scoped.table_name)
  WHERE rel.oid IS NULL OR NOT rel.relrowsecurity OR NOT rel.relforcerowsecurity
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy AS policy WHERE policy.polrelid = rel.oid AND policy.polname = 'project_scope')
  UNION ALL
  -- The guarded functions: present, owned by their role, definer as declared, not callable by everyone.
  SELECT format('function %s is missing, replaced, or callable by everyone', guarded.signature)
  FROM sovitech_guard.guarded_functions AS guarded
  LEFT JOIN pg_catalog.pg_proc AS func ON func.oid = pg_catalog.to_regprocedure(guarded.signature)
  WHERE func.oid IS NULL
    OR func.proowner <> (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = guarded.owner_role)
    OR func.prosecdef <> guarded.security_definer
    OR func.proacl IS NULL
    OR EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(func.proacl) AS acl WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
    )
  UNION ALL
  -- Nobody joins the definer roles; the app and operator logins join no role; only the migrator joins the owner.
  SELECT format('%s is a member of %s', pg_catalog.pg_get_userbyid(membership.member), pg_catalog.pg_get_userbyid(membership.roleid))
  FROM pg_catalog.pg_auth_members AS membership
  WHERE pg_catalog.pg_get_userbyid(membership.roleid) IN ('sovitech_db_guard', 'sovitech_db_verifier', 'sovitech_db_eraser', 'sovitech_db_access')
     OR pg_catalog.pg_get_userbyid(membership.member) IN ('sovitech_db_app', 'sovitech_db_admin')
     OR (pg_catalog.pg_get_userbyid(membership.roleid) = 'sovitech_db_owner'
         AND pg_catalog.pg_get_userbyid(membership.member) <> 'sovitech_db_migrator')
  UNION ALL
  -- No role of the store is a superuser; only the two definer roles that must read across projects bypass row security.
  SELECT format('%s is a superuser or bypasses row security', account.rolname)
  FROM pg_catalog.pg_roles AS account
  WHERE account.rolname LIKE 'sovitech\_db\_%'
    AND (account.rolsuper OR (account.rolbypassrls AND account.rolname NOT IN ('sovitech_db_access', 'sovitech_db_guard')))
$$;

-- After every DDL command, in any session: refuse the command if a guard would be lost.
CREATE FUNCTION sovitech_guard.after_ddl() RETURNS event_trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_problems text;
BEGIN
  SELECT string_agg(found.problem, '; ' ORDER BY found.problem) INTO v_problems FROM sovitech_guard.check_invariants() AS found;
  IF v_problems IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'SVG01',
      MESSAGE = 'refused: the command would remove a guard of the value store',
      DETAIL = v_problems;
  END IF;
END
$$;

-- Rewriting a table (ALTER COLUMN ... TYPE ... USING, a volatile default) changes
-- stored rows without an UPDATE, so no row trigger sees it: refused for every table of the store.
CREATE FUNCTION sovitech_guard.on_table_rewrite() RETURNS event_trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_table text;
BEGIN
  SELECT rel.relname INTO v_table
  FROM pg_catalog.pg_class AS rel
  JOIN pg_catalog.pg_namespace AS space ON space.oid = rel.relnamespace
  WHERE rel.oid = pg_catalog.pg_event_trigger_table_rewrite_oid() AND space.nspname = 'sovitech';
  IF v_table IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'SVG02',
      MESSAGE = format('refused: rewriting sovitech.%s would change stored rows', v_table);
  END IF;
END
$$;

ALTER TABLE sovitech_guard.required_triggers OWNER TO sovitech_db_guard;
ALTER TABLE sovitech_guard.recorded_shape OWNER TO sovitech_db_guard;
ALTER TABLE sovitech_guard.append_only_tables OWNER TO sovitech_db_guard;
ALTER TABLE sovitech_guard.project_tables OWNER TO sovitech_db_guard;
ALTER TABLE sovitech_guard.guarded_functions OWNER TO sovitech_db_guard;
ALTER TABLE sovitech_guard.relation_owners OWNER TO sovitech_db_guard;
REVOKE ALL ON sovitech_guard.required_triggers, sovitech_guard.append_only_tables, sovitech_guard.project_tables,
  sovitech_guard.guarded_functions, sovitech_guard.recorded_shape, sovitech_guard.relation_owners FROM PUBLIC;

ALTER FUNCTION sovitech_guard.refuse_change() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.excerpt_change() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.text_change() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.engineer_verified_written() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.document_event_written() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.written_only_by() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.asset_event_written() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.event_actor_written() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.candidate_written() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.field_event_written() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.document_text_written() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.candidate_author_written() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.erasure_lock_key(uuid, text) OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.await_erasure(uuid, text) OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.evidence_source_written() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.document_has_analysis() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.candidate_has_evidence() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.locator_has_excerpt() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.appearance_has_evidence() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.current_shape() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.recorded_relations() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.record_shape() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.unguarded_tables() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.check_invariants() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.after_ddl() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.on_table_rewrite() OWNER TO sovitech_db_guard;
REVOKE ALL ON FUNCTION
  sovitech_guard.refuse_change(), sovitech_guard.excerpt_change(), sovitech_guard.text_change(),
  sovitech_guard.engineer_verified_written(), sovitech_guard.document_event_written(), sovitech_guard.written_only_by(),
  sovitech_guard.asset_event_written(), sovitech_guard.event_actor_written(), sovitech_guard.candidate_written(),
  sovitech_guard.field_event_written(), sovitech_guard.recorded_relations(),
  sovitech_guard.candidate_author_written(), sovitech_guard.erasure_lock_key(uuid, text), sovitech_guard.await_erasure(uuid, text),
  sovitech_guard.evidence_source_written(), sovitech_guard.document_has_analysis(),
  sovitech_guard.document_text_written(), sovitech_guard.candidate_has_evidence(), sovitech_guard.locator_has_excerpt(),
  sovitech_guard.appearance_has_evidence(), sovitech_guard.current_shape(), sovitech_guard.record_shape(),
  sovitech_guard.unguarded_tables(), sovitech_guard.check_invariants(), sovitech_guard.after_ddl(),
  sovitech_guard.on_table_rewrite()
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sovitech_guard.check_invariants(), sovitech_guard.unguarded_tables()
  TO sovitech_db_migrator, sovitech_db_admin;

-- The guard's existence checks (its definer trigger functions).
GRANT SELECT ON sovitech.candidates, sovitech.evidence_locators, sovitech.evidence_excerpts,
  sovitech.asset_identities, sovitech.documents, sovitech.document_events, sovitech.document_analysis_events
  TO sovitech_db_guard;

SELECT sovitech_guard.record_shape();

CREATE EVENT TRIGGER sovitech_guard_after_ddl ON ddl_command_end EXECUTE FUNCTION sovitech_guard.after_ddl();
CREATE EVENT TRIGGER sovitech_guard_table_rewrite ON table_rewrite EXECUTE FUNCTION sovitech_guard.on_table_rewrite();
-- Event triggers too fire in every session, a replica-mode session included.
ALTER EVENT TRIGGER sovitech_guard_after_ddl ENABLE ALWAYS;
ALTER EVENT TRIGGER sovitech_guard_table_rewrite ENABLE ALWAYS;

DO $check$
DECLARE
  v_problems text;
BEGIN
  SELECT string_agg(found.problem, '; ')
  INTO v_problems
  FROM (
    SELECT problem FROM sovitech_guard.check_invariants()
    UNION ALL
    SELECT problem FROM sovitech_guard.unguarded_tables()
  ) AS found;
  IF v_problems IS NOT NULL THEN
    RAISE EXCEPTION 'the guards do not hold after installation: %', v_problems;
  END IF;
END
$check$;
