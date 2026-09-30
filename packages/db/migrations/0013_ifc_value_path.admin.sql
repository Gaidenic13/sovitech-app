-- 0013: the store of the gated IFC value path (prompt 3 section 8, "Output per file", and
-- section 10, phase 2: "The IFC value path behind `ifc-values` and the related gates";
-- docs/adr/0033-ifc-value-path-api-half.md). Runs as the database administrator, because it
-- registers guards and replaces three guard functions (packages/db/README.md, "Adding a table or
-- a guard"): the tables are created as sovitech_db_owner, their guards as the administrator, and
-- the shape is recorded last.
--
-- Nothing here opens the gate. Only packages/db/src/ifc-evidence.ts writes these tables, and it
-- reads `ifc-values` first through the registry's one gate function, which reads it closed in
-- every source but the test-utils override of tests/proposed/ (prompt 3 5.4). While the gate is
-- closed these tables hold no row; they hold what ifc-input 6.2.1 (the IFC evidence locator, a
-- proposal) would store, so the path exists behind its gate.
--
-- Value-store tables (schema sovitech; append-only, project-scoped, guarded):
--   ifc_evidence           one IFC evidence entry of a candidate or an asset appearance: the
--                          document and the content hash it cites, the schema of its model record,
--                          the element's GlobalId, the STEP ids of the quoted statements and the
--                          path to the value (ifc-input 6.2.1). No page, sheet, cell or box: a
--                          model has none, and none is borrowed (prompt 3 section 8).
--   ifc_evidence_excerpts  the verbatim STEP text of an entry, keyed by project id and content
--                          hash (prompt 3 5.2 "Database"). The erasure sets it to "[erased]".
--   ifc_elements           which element of which model became which subject or appearance (a
--                          level per storey, a zone per space or zone, the project's building, an
--                          asset appearance per element a table named as equipment), with the
--                          spatial element that contains it: GlobalIds, STEP ids and class names
--                          only, never text.
--   ifc_value_refusals     the engineer's list of values the path refused, by proposal, GlobalId,
--                          STEP ids, field and code: never text (rule 13; ifc-input 4.1 item 4, a
--                          value typed IfcReal "is kept as text for the engineer": its statement
--                          stays in the model's extracted text, and this row points to it).
--
-- Guards (rule 1, rule 13, 2.4):
--   - every row names the request's own user as its writer, a service account that is a member
--     of the project, and nothing is written for an erased document (0010's
--     ingestion_record_written, SVX16 and SVE11);
--   - an IFC evidence entry belongs to a candidate its writer wrote, from a document or an
--     inference (SVX16), and is stored with its excerpt (SVX02, at commit);
--   - a document candidate commits with a matched entry, 2.4's or an IFC one, and an inference
--     with any entry (SVX01); an asset appearance with any entry (SVX03);
--   - the erasure (rule 13) erases the excerpts of IFC entries that cite the document, and
--     withdraws the candidates whose IFC entries all cite removed documents, as it does for 2.4
--     entries: sovitech_guard.document_event_written, which the erased event passes through,
--     does both as the eraser.

SET LOCAL ROLE sovitech_db_owner;

CREATE TABLE sovitech.ifc_evidence (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  candidate_id uuid,
  appearance_id uuid,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  document_id uuid NOT NULL,
  content_hash text NOT NULL,
  ifc_schema text NOT NULL CHECK (ifc_schema ~ '^IFC[0-9A-Z_]{1,24}$'),
  global_id text NOT NULL CHECK (global_id ~ '^[0-9A-Za-z_$]{22}$'),
  step_ids bigint[] NOT NULL CHECK (
    cardinality(step_ids) BETWEEN 1 AND 64 AND array_ndims(step_ids) = 1
    AND array_position(step_ids, NULL) IS NULL AND 0 < ALL (step_ids)
  ),
  -- The path as the domain's IfcEvidencePath: an attribute, a property, a quantity or a relation.
  path jsonb NOT NULL CHECK (
    jsonb_typeof(path) = 'object' AND path ->> 'kind' IN ('attribute', 'property', 'quantity', 'relation')
  ),
  -- Set by code: the statements matched the stored text of that revision (ifc-input 6.2.1).
  evidence_check text NOT NULL CHECK (evidence_check = 'text_match'),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT ifc_evidence_candidate_fk FOREIGN KEY (project_id, candidate_id) REFERENCES sovitech.candidates (project_id, id),
  CONSTRAINT ifc_evidence_appearance_fk FOREIGN KEY (project_id, appearance_id) REFERENCES sovitech.asset_appearances (project_id, id),
  CONSTRAINT ifc_evidence_document_fk FOREIGN KEY (project_id, document_id, content_hash)
    REFERENCES sovitech.documents (project_id, id, content_hash),
  CHECK ((candidate_id IS NULL) <> (appearance_id IS NULL)),
  UNIQUE (project_id, id),
  UNIQUE (project_id, id, content_hash)
);
CREATE UNIQUE INDEX ifc_evidence_candidate_ordinal ON sovitech.ifc_evidence (candidate_id, ordinal) WHERE candidate_id IS NOT NULL;
CREATE UNIQUE INDEX ifc_evidence_appearance_ordinal ON sovitech.ifc_evidence (appearance_id, ordinal) WHERE appearance_id IS NOT NULL;
CREATE INDEX ifc_evidence_document ON sovitech.ifc_evidence (project_id, document_id);

CREATE TABLE sovitech.ifc_evidence_excerpts (
  evidence_id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  document_id uuid NOT NULL,
  content_hash text NOT NULL,
  text text NOT NULL CHECK (btrim(text) <> ''),
  erased_at timestamptz,
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, evidence_id, content_hash) REFERENCES sovitech.ifc_evidence (project_id, id, content_hash),
  FOREIGN KEY (project_id, document_id, content_hash) REFERENCES sovitech.documents (project_id, id, content_hash),
  CHECK (erased_at IS NULL OR text = '[erased]')
);
CREATE INDEX ifc_evidence_excerpts_project_hash ON sovitech.ifc_evidence_excerpts (project_id, content_hash);

CREATE TABLE sovitech.ifc_elements (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  document_id uuid NOT NULL,
  content_hash text NOT NULL,
  global_id text NOT NULL CHECK (global_id ~ '^[0-9A-Za-z_$]{22}$'),
  step_id bigint NOT NULL CHECK (step_id > 0),
  ifc_class text NOT NULL CHECK (ifc_class ~ '^IFC[A-Z0-9_]{1,80}$'),
  element_kind text NOT NULL CHECK (element_kind IN ('building', 'storey', 'space', 'zone', 'element')),
  subject_id uuid,
  appearance_id uuid,
  -- The spatial element that contains or aggregates it, and the relation statement that says so.
  container_global_id text CHECK (container_global_id IS NULL OR container_global_id ~ '^[0-9A-Za-z_$]{22}$'),
  container_step_id bigint CHECK (container_step_id IS NULL OR container_step_id > 0),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, document_id, content_hash) REFERENCES sovitech.documents (project_id, id, content_hash),
  FOREIGN KEY (project_id, subject_id) REFERENCES sovitech.subjects (project_id, id),
  FOREIGN KEY (project_id, appearance_id) REFERENCES sovitech.asset_appearances (project_id, id),
  CHECK ((container_global_id IS NULL) = (container_step_id IS NULL)),
  CHECK (subject_id IS NULL OR appearance_id IS NULL OR element_kind = 'element'),
  CONSTRAINT ifc_elements_once_per_model UNIQUE (project_id, document_id, global_id)
);

CREATE TABLE sovitech.ifc_value_refusals (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  document_id uuid NOT NULL,
  content_hash text NOT NULL,
  proposal_id text NOT NULL CHECK (proposal_id ~ '^[a-z][a-z0-9-]{0,63}$'),
  global_id text NOT NULL CHECK (global_id ~ '^[0-9A-Za-z_$]{22}$'),
  field_key text NOT NULL CHECK (char_length(field_key) <= 200 AND field_key ~ '^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)+$'),
  step_ids bigint[] NOT NULL CHECK (
    cardinality(step_ids) BETWEEN 1 AND 64 AND array_ndims(step_ids) = 1
    AND array_position(step_ids, NULL) IS NULL AND 0 < ALL (step_ids)
  ),
  -- A code, never text (rule 13).
  code text NOT NULL CHECK (char_length(code) <= 120 AND code ~ '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$'),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, document_id, content_hash) REFERENCES sovitech.documents (project_id, id, content_hash)
);
CREATE INDEX ifc_value_refusals_document ON sovitech.ifc_value_refusals (project_id, document_id);

DO $policies$
DECLARE
  scoped text;
BEGIN
  FOREACH scoped IN ARRAY ARRAY['ifc_evidence', 'ifc_evidence_excerpts', 'ifc_elements', 'ifc_value_refusals'] LOOP
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

REVOKE ALL ON sovitech.ifc_evidence, sovitech.ifc_evidence_excerpts, sovitech.ifc_elements, sovitech.ifc_value_refusals FROM PUBLIC;
GRANT SELECT ON sovitech.ifc_evidence, sovitech.ifc_evidence_excerpts, sovitech.ifc_elements, sovitech.ifc_value_refusals
  TO sovitech_db_app;
GRANT INSERT (id, project_id, candidate_id, appearance_id, ordinal, document_id, content_hash, ifc_schema, global_id, step_ids,
  path, evidence_check, created_by) ON sovitech.ifc_evidence TO sovitech_db_app;
GRANT INSERT (evidence_id, project_id, document_id, content_hash, text, created_by) ON sovitech.ifc_evidence_excerpts TO sovitech_db_app;
GRANT INSERT (id, project_id, document_id, content_hash, global_id, step_id, ifc_class, element_kind, subject_id, appearance_id,
  container_global_id, container_step_id, created_by) ON sovitech.ifc_elements TO sovitech_db_app;
GRANT INSERT (id, project_id, document_id, content_hash, proposal_id, global_id, field_key, step_ids, code, created_by)
  ON sovitech.ifc_value_refusals TO sovitech_db_app;
REVOKE UPDATE, DELETE, TRUNCATE ON sovitech.ifc_evidence, sovitech.ifc_evidence_excerpts, sovitech.ifc_elements,
  sovitech.ifc_value_refusals FROM sovitech_db_app;

RESET ROLE;

-- An IFC evidence entry belongs to a candidate its writer wrote from a document or an inference
-- (2.1, "Who can create it"; SVX16). An appearance's entry needs the appearance's foreign key only,
-- as 2.4's evidence_locators do.
CREATE FUNCTION sovitech_guard.ifc_evidence_owner_written() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.candidate_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sovitech.candidates AS candidate
    WHERE candidate.project_id = NEW.project_id AND candidate.id = NEW.candidate_id
      AND candidate.created_by = NEW.created_by AND candidate.source IN ('document', 'ai_inference')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX16',
      MESSAGE = 'an IFC evidence entry belongs to a document or inference candidate its own writer wrote';
  END IF;
  RETURN NEW;
END
$$;

-- Deferred to commit: an IFC evidence entry is stored with its excerpt (SVX02).
CREATE FUNCTION sovitech_guard.ifc_evidence_has_excerpt() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sovitech.ifc_evidence_excerpts AS excerpt WHERE excerpt.evidence_id = NEW.id) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX02', MESSAGE = 'an IFC evidence entry is stored only with its excerpt';
  END IF;
  RETURN NULL;
END
$$;

ALTER FUNCTION sovitech_guard.ifc_evidence_owner_written() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.ifc_evidence_has_excerpt() OWNER TO sovitech_db_guard;
REVOKE ALL ON FUNCTION sovitech_guard.ifc_evidence_owner_written(), sovitech_guard.ifc_evidence_has_excerpt() FROM PUBLIC;
GRANT SELECT ON sovitech.ifc_evidence, sovitech.ifc_evidence_excerpts, sovitech.ifc_elements, sovitech.ifc_value_refusals
  TO sovitech_db_guard;

-- 0009's commit checks, with an IFC evidence entry counted as evidence: a document value stands
-- at a verified location (2.1, rule 1), a matched 2.4 entry or an IFC entry whose statements
-- matched (the only check an IFC entry is stored with); an inference needs any entry. Nothing
-- else in either function changes.
CREATE OR REPLACE FUNCTION sovitech_guard.candidate_has_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.source = 'document'
     AND NOT EXISTS (
       SELECT 1 FROM sovitech.evidence_locators AS locator
       WHERE locator.candidate_id = NEW.id AND locator.evidence_check IN ('text_match', 'ocr_match', 'region_rendered')
     )
     AND NOT EXISTS (
       SELECT 1 FROM sovitech.ifc_evidence AS entry WHERE entry.candidate_id = NEW.id AND entry.evidence_check = 'text_match'
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX01', MESSAGE = 'a document candidate is stored only with evidence whose check matched its location';
  END IF;
  IF NEW.source = 'ai_inference'
     AND NOT EXISTS (SELECT 1 FROM sovitech.evidence_locators AS locator WHERE locator.candidate_id = NEW.id)
     AND NOT EXISTS (SELECT 1 FROM sovitech.ifc_evidence AS entry WHERE entry.candidate_id = NEW.id) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX01', MESSAGE = 'an ai_inference candidate is stored only with its evidence';
  END IF;
  RETURN NULL;
END
$$;

CREATE OR REPLACE FUNCTION sovitech_guard.appearance_has_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sovitech.evidence_locators AS locator WHERE locator.appearance_id = NEW.id)
     AND NOT EXISTS (SELECT 1 FROM sovitech.ifc_evidence AS entry WHERE entry.appearance_id = NEW.id) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX03', MESSAGE = 'an asset appearance is stored only with its evidence';
  END IF;
  RETURN NULL;
END
$$;

-- Rule 13, "Erasure": the erased event passes through this guard inside sovitech.erase_document,
-- as the eraser (this function runs as its invoker). Besides 0009's check (SVE10), it now erases
-- the excerpt of every IFC evidence entry that cites the document, and withdraws each candidate
-- whose IFC entries all cite documents that are removed with this one, keeping its id and value;
-- sovitech.erase_document (0008) does the same for 2.4 entries, which no IFC candidate has. The
-- erasure lock is the function's own, taken before its erased event.
CREATE OR REPLACE FUNCTION sovitech_guard.document_event_written() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.type = 'erased' AND current_user <> 'sovitech_db_eraser' THEN
    RAISE EXCEPTION USING ERRCODE = 'SVE10', MESSAGE = 'an erased document event is written only by sovitech.erase_document';
  END IF;
  IF NEW.type = 'erased' THEN
    UPDATE sovitech.ifc_evidence_excerpts AS excerpt
    SET text = '[erased]', erased_at = pg_catalog.clock_timestamp()
    FROM sovitech.ifc_evidence AS entry
    WHERE entry.id = excerpt.evidence_id AND entry.document_id = NEW.document_id AND excerpt.erased_at IS NULL;

    INSERT INTO sovitech.candidate_events (id, project_id, candidate_id, type, actor, role, reason)
    SELECT pg_catalog.uuidv7(), NEW.project_id, candidate.id, 'withdrawn', 'erasure:' || NEW.id::text, 'system', 'document_erased'
    FROM sovitech.candidates AS candidate
    WHERE candidate.project_id = NEW.project_id
      AND EXISTS (
        SELECT 1 FROM sovitech.ifc_evidence AS entry WHERE entry.candidate_id = candidate.id AND entry.document_id = NEW.document_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM sovitech.ifc_evidence AS entry
        WHERE entry.candidate_id = candidate.id AND entry.document_id <> NEW.document_id
          AND NOT EXISTS (
            SELECT 1 FROM sovitech.document_events AS removal
            WHERE removal.document_id = entry.document_id AND removal.type IN ('withdrawn', 'erased')
          )
      )
      AND NOT EXISTS (SELECT 1 FROM sovitech.evidence_locators AS locator WHERE locator.candidate_id = candidate.id)
      AND NOT EXISTS (
        SELECT 1 FROM sovitech.candidate_events AS event WHERE event.candidate_id = candidate.id AND event.type = 'withdrawn'
      );
  END IF;
  RETURN NEW;
END
$$;

-- What the eraser reads and changes on the IFC tables, through that guard.
GRANT SELECT ON sovitech.ifc_evidence, sovitech.ifc_evidence_excerpts TO sovitech_db_eraser;
GRANT UPDATE (text, erased_at) ON sovitech.ifc_evidence_excerpts TO sovitech_db_eraser;

DO $install$
DECLARE
  stored text;
BEGIN
  FOREACH stored IN ARRAY ARRAY['ifc_evidence', 'ifc_evidence_excerpts', 'ifc_elements', 'ifc_value_refusals'] LOOP
    EXECUTE format(
      'CREATE TRIGGER guard_no_truncate BEFORE TRUNCATE ON sovitech.%I FOR EACH STATEMENT EXECUTE FUNCTION sovitech_guard.refuse_change()',
      stored
    );
    IF stored = 'ifc_evidence_excerpts' THEN
      EXECUTE 'CREATE TRIGGER guard_change BEFORE UPDATE OR DELETE ON sovitech.ifc_evidence_excerpts '
              'FOR EACH ROW EXECUTE FUNCTION sovitech_guard.excerpt_change()';
    ELSE
      EXECUTE format(
        'CREATE TRIGGER guard_change BEFORE UPDATE OR DELETE ON sovitech.%I FOR EACH ROW EXECUTE FUNCTION sovitech_guard.refuse_change()',
        stored
      );
    END IF;
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

CREATE TRIGGER guard_ifc_evidence_owner BEFORE INSERT ON sovitech.ifc_evidence
  FOR EACH ROW EXECUTE FUNCTION sovitech_guard.ifc_evidence_owner_written();
CREATE CONSTRAINT TRIGGER guard_ifc_evidence_excerpt AFTER INSERT ON sovitech.ifc_evidence
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION sovitech_guard.ifc_evidence_has_excerpt();
ALTER TABLE sovitech.ifc_evidence ENABLE ALWAYS TRIGGER guard_ifc_evidence_owner;
ALTER TABLE sovitech.ifc_evidence ENABLE ALWAYS TRIGGER guard_ifc_evidence_excerpt;

-- Register the four tables with their guards, then record the shape.
INSERT INTO sovitech_guard.append_only_tables (table_name)
VALUES ('ifc_evidence'), ('ifc_evidence_excerpts'), ('ifc_elements'), ('ifc_value_refusals');
INSERT INTO sovitech_guard.project_tables (table_name)
VALUES ('ifc_evidence'), ('ifc_evidence_excerpts'), ('ifc_elements'), ('ifc_value_refusals');
INSERT INTO sovitech_guard.required_triggers (table_name, trigger_name)
SELECT stored.table_name, trigger_name
FROM (VALUES ('ifc_evidence'), ('ifc_evidence_excerpts'), ('ifc_elements'), ('ifc_value_refusals')) AS stored (table_name)
CROSS JOIN (VALUES ('guard_no_truncate'), ('guard_change'), ('guard_ingestion_writer')) AS wanted (trigger_name);
INSERT INTO sovitech_guard.required_triggers (table_name, trigger_name)
VALUES ('ifc_evidence', 'guard_ifc_evidence_owner'), ('ifc_evidence', 'guard_ifc_evidence_excerpt');

SELECT sovitech_guard.record_shape();
