-- 0015: the stored proposal's parts and the generated outputs (phase 5; prompt 3 section 10, phase 5:
-- "The proposal snapshot (candidate ids and formula versions)", "Reports (DB-18)"; guardrails 2.4, "A
-- generated proposal keeps a snapshot of the candidate ids and formula versions it used"; rule 7, "Your
-- estimate will update when they finish"; rule 13; docs/adr/0048-stored-proposal-and-price-stage.md
-- decision 2, docs/adr/0050-exports-print-route-and-pdf.md decision 3). Runs as the database
-- administrator, on 0013's pattern (packages/db/README.md, "Adding a table or a guard"): the tables
-- are created as sovitech_db_owner, their guards as the administrator, and the shape is recorded last.
--
-- Value-store tables (schema sovitech; append-only, project-scoped, guarded):
--   proposal_snapshot_outputs            one row per output of a generated proposal: the registry's output
--                                        key, the formula id and version that gave it or would have given it,
--                                        the candidate the engine produced (or none), what was missing as
--                                        codes (`dataset:<id>`, `method:<formula>`, `unit:<gate>`,
--                                        `input:<subject>:<field>:<reason>`; never text, rule 13), and whether
--                                        the total was incomplete (rule 1, "Material exclusions").
--   proposal_snapshot_pending_documents  the documents still being read when the proposal was generated (rule 7:
--                                        "Still reading <n> files. Your estimate will update when they finish").
--   proposal_snapshot_paragraphs         AI-drafted paragraphs the output validator accepted, with the model id
--                                        (PRD R-115): prose with value tokens only. None is written while no key
--                                        is set or the `ai-processor-route` guard refuses drafting.
--   generated_outputs                    one row per export the owner started (a proposal PDF of one snapshot):
--                                        who, when, which snapshot. No file is stored: the PDF is printed from
--                                        the snapshot each time it is downloaded, so an erasure reaches it
--                                        (rule 13; ADR 0050 decision 3).
--
-- Guards (2.4, "Candidates never change after they are written" read for the snapshot that holds them; rule 4;
-- rule 13):
--   - no row is ever updated, deleted or truncated (append-only, every login role);
--   - a part of a snapshot is written by the snapshot's own writer, the user making the request, in the
--     transaction that writes the snapshot (a snapshot is complete when it commits, and never added to later):
--     `sovitech_guard.snapshot_part_written` (SVX17);
--   - a generated output names the user making the request as who started it, a member acting as the owner of
--     the project (an owner, or the demo seed on the demo project): `sovitech_guard.output_written` (SVX18);
--   - every row is the project's (row-level security on project_id; the foreign keys name the project).
-- Neither function is a definer function: each runs as the request's own login, under row-level security.

SET LOCAL ROLE sovitech_db_owner;

CREATE TABLE sovitech.proposal_snapshot_outputs (
  snapshot_id uuid NOT NULL,
  project_id uuid NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  output_key text NOT NULL CHECK (char_length(output_key) <= 120 AND output_key ~ '^[a-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9_]*)+$'),
  formula_id text NOT NULL CHECK (formula_id ~ '^[A-Za-z][A-Za-z0-9_-]{0,63}$'),
  formula_version text NOT NULL CHECK (formula_version ~ '^[0-9A-Za-z][0-9A-Za-z._-]{0,31}$'),
  candidate_id uuid,
  -- Codes only, one per item, never text from a document (rule 13).
  missing text[] NOT NULL CHECK (
    array_ndims(missing) IS NULL
    OR (array_ndims(missing) = 1 AND cardinality(missing) <= 64
        AND array_to_string(missing, E'\n') ~ '^[a-z]+:[A-Za-z0-9_.:-]{1,200}(\n[a-z]+:[A-Za-z0-9_.:-]{1,200})*$')
  ),
  incomplete boolean NOT NULL,
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (snapshot_id, output_key),
  UNIQUE (snapshot_id, ordinal),
  CONSTRAINT proposal_snapshot_outputs_snapshot_fk FOREIGN KEY (project_id, snapshot_id) REFERENCES sovitech.proposal_snapshots (project_id, id),
  CONSTRAINT proposal_snapshot_outputs_candidate_fk FOREIGN KEY (project_id, candidate_id) REFERENCES sovitech.candidates (project_id, id),
  -- An output with no figure names at least one missing item (rule 7: "'Not available yet' never appears alone"); a
  -- complete figure names none. An incomplete total is a figure whose items left out are named as codes (rule 1,
  -- "Material exclusions": "Incomplete: excludes <item names>").
  CONSTRAINT proposal_snapshot_outputs_figure_or_missing CHECK (candidate_id IS NOT NULL OR coalesce(cardinality(missing), 0) > 0),
  CONSTRAINT proposal_snapshot_outputs_complete_figure CHECK (candidate_id IS NULL OR incomplete OR coalesce(cardinality(missing), 0) = 0),
  CONSTRAINT proposal_snapshot_outputs_incomplete_has_figure CHECK (NOT incomplete OR candidate_id IS NOT NULL)
);

CREATE TABLE sovitech.proposal_snapshot_pending_documents (
  snapshot_id uuid NOT NULL,
  project_id uuid NOT NULL,
  document_id uuid NOT NULL,
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (snapshot_id, document_id),
  CONSTRAINT proposal_snapshot_pending_documents_snapshot_fk FOREIGN KEY (project_id, snapshot_id) REFERENCES sovitech.proposal_snapshots (project_id, id),
  CONSTRAINT proposal_snapshot_pending_documents_document_fk FOREIGN KEY (project_id, document_id) REFERENCES sovitech.documents (project_id, id)
);

CREATE TABLE sovitech.proposal_snapshot_paragraphs (
  snapshot_id uuid NOT NULL,
  project_id uuid NOT NULL,
  slot text NOT NULL CHECK (slot ~ '^[a-z][A-Za-z0-9_]{0,63}$'),
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  -- The prose as the output validator accepted it: value tokens only, never a figure typed as text (rule 2).
  text text NOT NULL CHECK (btrim(text) <> '' AND char_length(text) <= 4000),
  model_id text NOT NULL CHECK (model_id ~ '^[a-z0-9][a-z0-9.-]{0,63}$'),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (snapshot_id, slot, ordinal),
  CONSTRAINT proposal_snapshot_paragraphs_snapshot_fk FOREIGN KEY (project_id, snapshot_id) REFERENCES sovitech.proposal_snapshots (project_id, id)
);

CREATE TABLE sovitech.generated_outputs (
  id uuid PRIMARY KEY,
  -- The project through its snapshot (the snapshot names the project); who started it is the request's own user, an
  -- account of the store (the guard below), so no reference to the access tables is needed (they belong to
  -- sovitech_db_access, ADR 0013).
  project_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('proposal_pdf')),
  snapshot_id uuid NOT NULL,
  started_by uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT generated_outputs_snapshot_fk FOREIGN KEY (project_id, snapshot_id) REFERENCES sovitech.proposal_snapshots (project_id, id),
  UNIQUE (project_id, id)
);
CREATE INDEX generated_outputs_project ON sovitech.generated_outputs (project_id, started_at);

DO $policies$
DECLARE
  scoped text;
BEGIN
  FOREACH scoped IN ARRAY ARRAY['proposal_snapshot_outputs', 'proposal_snapshot_pending_documents', 'proposal_snapshot_paragraphs', 'generated_outputs'] LOOP
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

REVOKE ALL ON sovitech.proposal_snapshot_outputs, sovitech.proposal_snapshot_pending_documents, sovitech.proposal_snapshot_paragraphs,
  sovitech.generated_outputs FROM PUBLIC;
GRANT SELECT ON sovitech.proposal_snapshot_outputs, sovitech.proposal_snapshot_pending_documents, sovitech.proposal_snapshot_paragraphs,
  sovitech.generated_outputs TO sovitech_db_app;
GRANT INSERT (snapshot_id, project_id, ordinal, output_key, formula_id, formula_version, candidate_id, missing, incomplete, created_by)
  ON sovitech.proposal_snapshot_outputs TO sovitech_db_app;
GRANT INSERT (snapshot_id, project_id, document_id, created_by) ON sovitech.proposal_snapshot_pending_documents TO sovitech_db_app;
GRANT INSERT (snapshot_id, project_id, slot, ordinal, text, model_id, created_by) ON sovitech.proposal_snapshot_paragraphs TO sovitech_db_app;
GRANT INSERT (id, project_id, kind, snapshot_id, started_by) ON sovitech.generated_outputs TO sovitech_db_app;
REVOKE UPDATE, DELETE, TRUNCATE ON sovitech.proposal_snapshot_outputs, sovitech.proposal_snapshot_pending_documents,
  sovitech.proposal_snapshot_paragraphs, sovitech.generated_outputs FROM sovitech_db_app;

RESET ROLE;

-- A part of a snapshot (an output row, a pending document, a drafted paragraph) is written by the user making the
-- request, who wrote the snapshot, in the transaction that wrote it (SVX17): a stored proposal is never added to once
-- its transaction committed (2.4; rule 4). Runs as the request's own login, under row-level security.
CREATE FUNCTION sovitech_guard.snapshot_part_written() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user text := sovitech.request_user_id()::text;
BEGIN
  IF v_user IS NULL OR NEW.created_by IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX17', MESSAGE = format('a row of sovitech.%s names the user making the request as its writer', TG_TABLE_NAME);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM sovitech.proposal_snapshots AS snapshot
    WHERE snapshot.project_id = NEW.project_id AND snapshot.id = NEW.snapshot_id
      AND snapshot.created_by = v_user AND snapshot.created_at >= pg_catalog.transaction_timestamp()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX17',
      MESSAGE = format('sovitech.%s is written only with its snapshot, by the snapshot''s writer, in the same transaction', TG_TABLE_NAME);
  END IF;
  RETURN NEW;
END
$$;

-- A generated output names the user making the request as who started it, a member acting as the owner (SVX18).
CREATE FUNCTION sovitech_guard.output_written() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.started_by IS DISTINCT FROM sovitech.request_user_id() OR NOT sovitech.request_user_acts_as(NEW.project_id, 'owner') THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX18', MESSAGE = 'a generated output is started only by the owner making the request, in their own name';
  END IF;
  RETURN NEW;
END
$$;

ALTER FUNCTION sovitech_guard.snapshot_part_written() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.output_written() OWNER TO sovitech_db_guard;
REVOKE ALL ON FUNCTION sovitech_guard.snapshot_part_written(), sovitech_guard.output_written() FROM PUBLIC;

DO $install$
DECLARE
  stored text;
BEGIN
  FOREACH stored IN ARRAY ARRAY['proposal_snapshot_outputs', 'proposal_snapshot_pending_documents', 'proposal_snapshot_paragraphs', 'generated_outputs'] LOOP
    EXECUTE format(
      'CREATE TRIGGER guard_no_truncate BEFORE TRUNCATE ON sovitech.%I FOR EACH STATEMENT EXECUTE FUNCTION sovitech_guard.refuse_change()',
      stored
    );
    EXECUTE format(
      'CREATE TRIGGER guard_change BEFORE UPDATE OR DELETE ON sovitech.%I FOR EACH ROW EXECUTE FUNCTION sovitech_guard.refuse_change()',
      stored
    );
    IF stored = 'generated_outputs' THEN
      EXECUTE 'CREATE TRIGGER guard_writer BEFORE INSERT ON sovitech.generated_outputs FOR EACH ROW EXECUTE FUNCTION sovitech_guard.output_written()';
    ELSE
      EXECUTE format(
        'CREATE TRIGGER guard_writer BEFORE INSERT ON sovitech.%I FOR EACH ROW EXECUTE FUNCTION sovitech_guard.snapshot_part_written()',
        stored
      );
    END IF;
    EXECUTE format('ALTER TABLE sovitech.%I ENABLE ALWAYS TRIGGER guard_no_truncate', stored);
    EXECUTE format('ALTER TABLE sovitech.%I ENABLE ALWAYS TRIGGER guard_change', stored);
    EXECUTE format('ALTER TABLE sovitech.%I ENABLE ALWAYS TRIGGER guard_writer', stored);
  END LOOP;
END
$install$;

-- Register the four tables with their guards, then record the shape.
INSERT INTO sovitech_guard.append_only_tables (table_name)
VALUES ('proposal_snapshot_outputs'), ('proposal_snapshot_pending_documents'), ('proposal_snapshot_paragraphs'), ('generated_outputs');
INSERT INTO sovitech_guard.project_tables (table_name)
VALUES ('proposal_snapshot_outputs'), ('proposal_snapshot_pending_documents'), ('proposal_snapshot_paragraphs'), ('generated_outputs');
INSERT INTO sovitech_guard.required_triggers (table_name, trigger_name)
SELECT stored.table_name, trigger_name
FROM (VALUES ('proposal_snapshot_outputs'), ('proposal_snapshot_pending_documents'), ('proposal_snapshot_paragraphs'), ('generated_outputs')) AS stored (table_name)
CROSS JOIN (VALUES ('guard_no_truncate'), ('guard_change'), ('guard_writer')) AS wanted (trigger_name);

SELECT sovitech_guard.record_shape();
