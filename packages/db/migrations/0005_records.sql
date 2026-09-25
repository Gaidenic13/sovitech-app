-- 0005: guardrail events (guardrails section 8), the opened-item record behind
-- engineer verification (rule 10), the stage 3 record of rule 10, and proposal
-- snapshots (2.4 "Recalculation"). Runs as sovitech_db_owner.

-- Section 8: every enforcement is logged. The reason is a code, never document text (rule 13).
CREATE TABLE sovitech.guardrail_events (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES sovitech.projects (id),
  type text NOT NULL CHECK (type IN (
    'ai_output_rejected', 'evidence_not_found', 'question_for_known_field', 'owner_corrected_inference',
    'engineer_corrected_accepted_item', 'conflict_raised', 'reserved_term_blocked', 'embedded_instruction',
    'confirmation_budget_exceeded', 'skipped'
  )),
  subject_id uuid,
  field_key text CHECK (field_key IS NULL OR btrim(field_key) <> ''),
  reason text CHECK (reason IS NULL OR reason ~ '^[a-z0-9][a-z0-9_.:-]{0,127}$'),
  actor text NOT NULL CHECK (btrim(actor) <> ''),
  at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, subject_id) REFERENCES sovitech.subjects (project_id, id)
);
CREATE INDEX guardrail_events_project ON sovitech.guardrail_events (project_id, type, at);

-- Rule 10: the engineer "has opened the item". One item is one candidate opened
-- with its evidence (PRD D-55, interim reading). Written only by sovitech.open_review_item.
CREATE TABLE sovitech.review_item_opens (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES sovitech.app_users (id),
  opened_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, candidate_id) REFERENCES sovitech.candidates (project_id, id)
);
CREATE INDEX review_item_opens_candidate ON sovitech.review_item_opens (project_id, candidate_id, user_id);

-- Rule 10 "Stage 3 is derived, not passed": the stored record, with every field rule 10
-- lists. Nothing creates one yet (PRD D-20: where it is created is open), so no screen
-- or export can show the stage 3 label (G10-1). It is never edited.
CREATE TABLE sovitech.quotation_records (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES sovitech.projects (id),
  record_number text NOT NULL CHECK (btrim(record_number) <> ''),
  reviewing_engineer_id uuid NOT NULL REFERENCES sovitech.app_users (id),
  commercial_reviewer_id uuid NOT NULL REFERENCES sovitech.app_users (id),
  issued_on date NOT NULL,
  valid_until date NOT NULL,
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  vat_basis text NOT NULL CHECK (btrim(vat_basis) <> ''),
  inclusions text[] NOT NULL CHECK (array_position(inclusions, NULL) IS NULL),
  exclusions text[] NOT NULL CHECK (array_position(exclusions, NULL) IS NULL),
  proposal_snapshot_id uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (valid_until >= issued_on),
  UNIQUE (project_id, id)
);

-- "a hash of every input candidate" (rule 10): one row per input.
CREATE TABLE sovitech.quotation_record_inputs (
  record_id uuid NOT NULL,
  project_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  candidate_hash text NOT NULL CHECK (candidate_hash ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (record_id, candidate_id),
  FOREIGN KEY (project_id, record_id) REFERENCES sovitech.quotation_records (project_id, id),
  FOREIGN KEY (project_id, candidate_id) REFERENCES sovitech.candidates (project_id, id)
);

-- 2.4: "A generated proposal keeps a snapshot of the candidate ids and formula versions it used."
CREATE TABLE sovitech.proposal_snapshots (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES sovitech.projects (id),
  inputs_hash text NOT NULL CHECK (inputs_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (project_id, id)
);

ALTER TABLE sovitech.quotation_records
  ADD CONSTRAINT quotation_records_snapshot_fk FOREIGN KEY (project_id, proposal_snapshot_id)
    REFERENCES sovitech.proposal_snapshots (project_id, id);

CREATE TABLE sovitech.proposal_snapshot_candidates (
  snapshot_id uuid NOT NULL,
  project_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  PRIMARY KEY (snapshot_id, candidate_id),
  FOREIGN KEY (project_id, snapshot_id) REFERENCES sovitech.proposal_snapshots (project_id, id),
  FOREIGN KEY (project_id, candidate_id) REFERENCES sovitech.candidates (project_id, id)
);

CREATE TABLE sovitech.proposal_snapshot_formulas (
  snapshot_id uuid NOT NULL,
  project_id uuid NOT NULL,
  formula_id text NOT NULL CHECK (btrim(formula_id) <> ''),
  formula_version text NOT NULL CHECK (btrim(formula_version) <> ''),
  PRIMARY KEY (snapshot_id, formula_id),
  FOREIGN KEY (project_id, snapshot_id) REFERENCES sovitech.proposal_snapshots (project_id, id)
);

REVOKE ALL ON sovitech.guardrail_events, sovitech.review_item_opens, sovitech.quotation_records,
  sovitech.quotation_record_inputs, sovitech.proposal_snapshots, sovitech.proposal_snapshot_candidates,
  sovitech.proposal_snapshot_formulas FROM PUBLIC;

GRANT SELECT ON sovitech.guardrail_events, sovitech.review_item_opens, sovitech.quotation_records,
  sovitech.quotation_record_inputs, sovitech.proposal_snapshots, sovitech.proposal_snapshot_candidates,
  sovitech.proposal_snapshot_formulas TO sovitech_db_app;
GRANT INSERT (id, project_id, type, subject_id, field_key, reason, actor) ON sovitech.guardrail_events TO sovitech_db_app;
GRANT INSERT (id, project_id, inputs_hash, created_by) ON sovitech.proposal_snapshots TO sovitech_db_app;
GRANT INSERT (snapshot_id, project_id, candidate_id) ON sovitech.proposal_snapshot_candidates TO sovitech_db_app;
GRANT INSERT (snapshot_id, project_id, formula_id, formula_version) ON sovitech.proposal_snapshot_formulas TO sovitech_db_app;
-- No INSERT on review_item_opens (sovitech.open_review_item writes it) or on the stage 3 record (no writer yet).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON sovitech.review_item_opens, sovitech.quotation_records,
  sovitech.quotation_record_inputs FROM sovitech_db_app;
REVOKE UPDATE, DELETE, TRUNCATE ON sovitech.guardrail_events, sovitech.proposal_snapshots,
  sovitech.proposal_snapshot_candidates, sovitech.proposal_snapshot_formulas FROM sovitech_db_app;
