-- 0016: who writes a stored proposal's snapshot and its 0005 parts (phase 5 part B; guardrails 2.4, "A generated
-- proposal keeps a snapshot of the candidate ids and formula versions it used"; rule 4, "A new value is always added,
-- never swapped in"; docs/adr/0048-stored-proposal-and-price-stage.md decision 2; G4-46). Runs as the database
-- administrator, on 0015's pattern: the guard functions are created as the administrator and handed to the guard
-- role, the triggers are registered as required, and the shape is recorded last.
--
-- 0015 guards the parts it added (SVX17 on `proposal_snapshot_outputs`, `_pending_documents`, `_paragraphs`), but the
-- snapshot row and its two 0005 parts had no writer guard: a later transaction could add a candidate id or a formula
-- row to a committed snapshot (its stored proposal then read a value it never used), and a member who is not the
-- owner could write a snapshot naming the owner as its writer. Now:
--   - a candidate id or a formula of a snapshot (`proposal_snapshot_candidates`, `proposal_snapshot_formulas`) is
--     written only with its snapshot, by the snapshot's writer, the user making the request, in the transaction that
--     wrote it: `sovitech_guard.snapshot_link_written` (SVX17, 0015's code and rule for a snapshot's parts);
--   - a snapshot names the user making the request as its writer, and that user acts as an owner of the project (the
--     owner's Generate; the demo seed on the demo project) or is the project's system service account (the
--     regeneration when the documents a stored proposal was still reading have finished):
--     `sovitech_guard.snapshot_written` (SVX19).
-- Neither function is a definer function: each runs as the request's own login, under row-level security. Every
-- writer the app has passes: Generate writes the snapshot and its parts in the owner's one request
-- (packages/db `recordGeneratedProposal`), and a regeneration in the system service account's one request.
--
-- Adding a trigger to a table that is already registered: the event trigger of 0009 refuses, at the end of each
-- command, a trigger it has not recorded and a recorded trigger whose definition changed. So the guard is told of each
-- new trigger before the command that creates it (its definition as created, then as enabled in every session), and
-- `record_shape()` records the whole shape as installed at the end. No guard is paused or unregistered at any point.

-- A snapshot is written by an owner of the project or its system service account, in their own name (SVX19).
CREATE FUNCTION sovitech_guard.snapshot_written() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user uuid := sovitech.request_user_id();
BEGIN
  IF v_user IS NULL OR NEW.created_by IS DISTINCT FROM v_user::text
     OR NOT (sovitech.request_user_acts_as(NEW.project_id, 'owner') OR sovitech.request_user_acts_as(NEW.project_id, 'system')) THEN
    RAISE EXCEPTION USING ERRCODE = 'SVX19',
      MESSAGE = 'a proposal snapshot is written only by an owner of the project or its system service account, in their own name';
  END IF;
  RETURN NEW;
END
$$;

-- A candidate id or a formula of a snapshot is written only with its snapshot, by the snapshot's writer, in the same
-- transaction (SVX17): a stored proposal is never added to once its transaction committed.
CREATE FUNCTION sovitech_guard.snapshot_link_written() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user text := sovitech.request_user_id()::text;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
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

ALTER FUNCTION sovitech_guard.snapshot_written() OWNER TO sovitech_db_guard;
ALTER FUNCTION sovitech_guard.snapshot_link_written() OWNER TO sovitech_db_guard;
REVOKE ALL ON FUNCTION sovitech_guard.snapshot_written(), sovitech_guard.snapshot_link_written() FROM PUBLIC;

DO $install$
DECLARE
  wanted record;
  v_definition text;
BEGIN
  FOR wanted IN
    SELECT * FROM (VALUES
      ('proposal_snapshots', 'sovitech_guard.snapshot_written()'),
      ('proposal_snapshot_candidates', 'sovitech_guard.snapshot_link_written()'),
      ('proposal_snapshot_formulas', 'sovitech_guard.snapshot_link_written()')
    ) AS guard (table_name, function_call)
  LOOP
    -- The trigger's definition as pg_get_triggerdef gives it (0009's current_shape), then its enabled state:
    -- 'O' as created, 'A' once enabled in every session.
    v_definition := format('CREATE TRIGGER guard_writer BEFORE INSERT ON sovitech.%s FOR EACH ROW EXECUTE FUNCTION %s', wanted.table_name, wanted.function_call);
    INSERT INTO sovitech_guard.recorded_shape (table_name, kind, name, definition)
    VALUES (wanted.table_name, 'trigger', 'guard_writer', v_definition || ' O');
    EXECUTE v_definition;
    UPDATE sovitech_guard.recorded_shape SET definition = v_definition || ' A'
    WHERE table_name = wanted.table_name AND kind = 'trigger' AND name = 'guard_writer';
    EXECUTE format('ALTER TABLE sovitech.%I ENABLE ALWAYS TRIGGER guard_writer', wanted.table_name);
    INSERT INTO sovitech_guard.required_triggers (table_name, trigger_name) VALUES (wanted.table_name, 'guard_writer');
  END LOOP;
END
$install$;

SELECT sovitech_guard.record_shape();
