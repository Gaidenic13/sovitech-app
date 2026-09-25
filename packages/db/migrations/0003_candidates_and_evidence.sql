-- 0003: candidates, evidence and their events (guardrails 2.4). Runs as
-- sovitech_db_owner. Candidates never change after they are written: every
-- later fact about one is an appended event, and state is derived on read by
-- the domain's derive function, never stored.

-- 2.4 Candidate. Quantities are stored as float8: the same number the domain
-- holds, never rounded (rule 9); the text as written is kept in original_text (rule 8).
CREATE TABLE sovitech.candidates (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  field_key text NOT NULL CHECK (btrim(field_key) <> ''),
  quantity_value double precision,
  quantity_unit text CHECK (quantity_unit IS NULL OR btrim(quantity_unit) <> ''),
  quantity_qualifier text,
  quantity_approximate boolean,
  choice text CHECK (choice IS NULL OR btrim(choice) <> ''),
  text_value text,
  -- An ambiguous reading keeps both (rule 8): an array of {value, unit, qualifier?, approximate?}.
  alternatives jsonb CHECK (alternatives IS NULL OR (jsonb_typeof(alternatives) = 'array' AND jsonb_array_length(alternatives) >= 2)),
  source text NOT NULL CHECK (source IN ('document', 'user', 'ai_inference', 'calculated', 'estimated', 'reference')),
  original_text text,
  original_locale text,
  method_formula_id text,
  method_formula_version text,
  method_input_candidate_ids uuid[],
  method_unknown_policy text CHECK (method_unknown_policy IN ('refuse', 'exclude_and_count', 'range_over_options')),
  method_assumptions text[],
  reference_dataset text,
  reference_version text,
  reference_key text,
  range_low double precision,
  range_high double precision,
  confidence text CHECK (confidence IN ('high', 'medium', 'low')),
  -- The request's own user, and a source that user may create (2.1): a `user` value from the
  -- owner or an engineer in their own name, every other source from a service account that is a
  -- member of the project (the guard of 0009 refuses anything else, SVX11).
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  -- The role the author acted in (2.1 "Who can create it"), set by the guard of 0009 from the
  -- request, never the caller's word (the app holds no INSERT on this column): 'owner' or
  -- 'sovitech_engineer' for a `user` value, 'system' for every other source. On a decision field
  -- only the owner's own `user` value is the owner's choice (rule 3; the domain's derive).
  author_role text NOT NULL CHECK (author_role IN ('owner', 'sovitech_engineer', 'system')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, subject_id) REFERENCES sovitech.subjects (project_id, id),
  UNIQUE (project_id, id),
  CONSTRAINT candidates_author_role_source CHECK ((source = 'user') = (author_role IN ('owner', 'sovitech_engineer'))),
  -- A candidate carries a value.
  CHECK (quantity_value IS NOT NULL OR choice IS NOT NULL OR text_value IS NOT NULL),
  -- A quantity is a value with its unit; qualifier and "about" belong to a quantity.
  CHECK ((quantity_value IS NULL) = (quantity_unit IS NULL)),
  CHECK (quantity_value IS NOT NULL OR (quantity_qualifier IS NULL AND quantity_approximate IS NULL)),
  CHECK (quantity_value IS NULL OR quantity_value NOT IN ('NaN'::float8, 'Infinity'::float8, '-Infinity'::float8)),
  CHECK (original_locale IS NULL OR original_text IS NOT NULL),
  -- calculated and estimated carry their method; nothing else does (2.4).
  CHECK ((source IN ('calculated', 'estimated')) = (method_formula_id IS NOT NULL)),
  CHECK ((method_formula_id IS NULL) = (method_formula_version IS NULL)),
  CHECK ((method_formula_id IS NULL) = (method_input_candidate_ids IS NULL)),
  CHECK ((method_formula_id IS NULL) = (method_unknown_policy IS NULL)),
  CHECK ((method_formula_id IS NULL) = (method_assumptions IS NULL)),
  -- reference carries its dataset, version and key; nothing else does.
  CHECK ((source = 'reference') = (reference_dataset IS NOT NULL)),
  CHECK ((reference_dataset IS NULL) = (reference_version IS NULL)),
  CHECK ((reference_dataset IS NULL) = (reference_key IS NULL)),
  -- estimated carries a range produced by its method, low < value < high (rule 9).
  CHECK ((range_low IS NULL) = (range_high IS NULL)),
  CHECK ((source = 'estimated') = (range_low IS NOT NULL)),
  CHECK (range_low IS NULL OR range_low < range_high),
  CHECK (range_low IS NULL OR quantity_value IS NULL OR (range_low < quantity_value AND quantity_value < range_high)),
  CHECK (range_low IS NULL OR (
    range_low NOT IN ('NaN'::float8, 'Infinity'::float8, '-Infinity'::float8)
    AND range_high NOT IN ('NaN'::float8, 'Infinity'::float8, '-Infinity'::float8)
  )),
  -- Confidence belongs to inferences and ambiguous readings; an ambiguous reading is low (rules 3, 8).
  CHECK (confidence IS NULL OR source = 'ai_inference' OR alternatives IS NOT NULL),
  CHECK (alternatives IS NULL OR confidence = 'low'),
  -- Each alternative reading is a quantity (rule 8): an object with a number (JSON has no NaN or
  -- infinity) and a non-blank unit, a qualifier only as text and "about" only as true or false.
  -- A malformed element would otherwise make every read of its field fail.
  -- (The CHECK above refuses anything that is not an array; CASE keeps this one from reading it.)
  CONSTRAINT candidates_alternatives_shape CHECK (
    CASE WHEN alternatives IS NULL OR jsonb_typeof(alternatives) <> 'array' THEN true ELSE
      NOT jsonb_path_exists(alternatives, 'strict $[*] ? (@.type() != "object")', '{}', true)
      AND jsonb_array_length(alternatives) = jsonb_array_length(jsonb_path_query_array(
        alternatives,
        'lax $[*] ? (@.value.type() == "number" && @.unit.type() == "string" && @.unit like_regex "[^[:space:]]" && (!exists(@.qualifier) || @.qualifier.type() == "string") && (!exists(@.approximate) || @.approximate.type() == "boolean"))',
        '{}', true))
    END
  )
);
CREATE INDEX candidates_field ON sovitech.candidates (project_id, subject_id, field_key);

-- 2.4 Evidence: the locator, one row per evidence entry. It points into the
-- document whose content hash it names (rule 1), in the same project (rule 13).
-- An evidence entry belongs to a candidate or to an asset appearance (2.5).
CREATE TABLE sovitech.evidence_locators (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  candidate_id uuid,
  appearance_id uuid,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  document_id uuid NOT NULL,
  content_hash text NOT NULL,
  page integer CHECK (page IS NULL OR page >= 1),
  sheet text CHECK (sheet IS NULL OR btrim(sheet) <> ''),
  cell text CHECK (cell IS NULL OR btrim(cell) <> ''),
  bbox double precision[] CHECK (bbox IS NULL OR (
    array_length(bbox, 1) = 4 AND array_ndims(bbox) = 1
    AND NOT (bbox && ARRAY['NaN'::float8, 'Infinity'::float8, '-Infinity'::float8])
    AND array_position(bbox, NULL) IS NULL
  )),
  -- 2.4 Evidence.check: set by code, never by the AI.
  evidence_check text NOT NULL CHECK (evidence_check IN ('text_match', 'ocr_match', 'region_rendered', 'unverifiable')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT evidence_locators_candidate_fk FOREIGN KEY (project_id, candidate_id)
    REFERENCES sovitech.candidates (project_id, id),
  CONSTRAINT evidence_locators_document_fk FOREIGN KEY (project_id, document_id, content_hash)
    REFERENCES sovitech.documents (project_id, id, content_hash),
  CHECK ((candidate_id IS NULL) <> (appearance_id IS NULL)),
  -- The locator exists (rule 1): at least one of page, sheet, cell or box.
  CHECK (page IS NOT NULL OR sheet IS NOT NULL OR cell IS NOT NULL OR bbox IS NOT NULL),
  UNIQUE (project_id, id),
  UNIQUE (project_id, id, content_hash)
);
CREATE UNIQUE INDEX evidence_locators_candidate_ordinal ON sovitech.evidence_locators (candidate_id, ordinal)
  WHERE candidate_id IS NOT NULL;
CREATE UNIQUE INDEX evidence_locators_appearance_ordinal ON sovitech.evidence_locators (appearance_id, ordinal)
  WHERE appearance_id IS NOT NULL;
CREATE INDEX evidence_locators_document ON sovitech.evidence_locators (project_id, document_id);

-- 2.4 Evidence.excerpt: verbatim, in its own table keyed by project id and the
-- cited document's content hash (prompt 3 5.2 "Database"). Rule 13 "Erasure"
-- is the only change ever made to a row here: its text becomes "[erased]".
CREATE TABLE sovitech.evidence_excerpts (
  evidence_id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  content_hash text NOT NULL,
  text text NOT NULL CHECK (btrim(text) <> ''),
  erased_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, evidence_id, content_hash)
    REFERENCES sovitech.evidence_locators (project_id, id, content_hash),
  CHECK (erased_at IS NULL OR text = '[erased]')
);
CREATE INDEX evidence_excerpts_project_hash ON sovitech.evidence_excerpts (project_id, content_hash);

-- 2.4 CandidateEvent. engineer_verified has one writer, sovitech.verify_candidate (0008, 0009).
-- Here and on field and document events, actor and role are the request's own
-- user and a role that user holds; the guard of 0009 refuses any other (SVX09).
-- The system writes only the engine's supersession of a calculated or estimated
-- value and the withdrawal of a value whose documents are all removed (SVX13);
-- a person withdraws only their own `user` value (SVX14).
CREATE TABLE sovitech.candidate_events (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN (
    'user_confirmed', 'owner_acknowledged', 'engineer_verified',
    'rejected', 'superseded', 'withdrawn', 'accepted_suggestion'
  )),
  actor text NOT NULL CHECK (btrim(actor) <> ''),
  role text NOT NULL CHECK (role IN ('owner', 'sovitech_engineer', 'system')),
  at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reason text,
  bulk_id uuid,
  FOREIGN KEY (project_id, candidate_id) REFERENCES sovitech.candidates (project_id, id),
  CHECK (type <> 'engineer_verified' OR (role = 'sovitech_engineer' AND bulk_id IS NULL))
);
CREATE INDEX candidate_events_candidate ON sovitech.candidate_events (project_id, candidate_id);

-- 2.4 FieldEvent.
CREATE TABLE sovitech.field_events (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  field_key text NOT NULL CHECK (btrim(field_key) <> ''),
  type text NOT NULL CHECK (type IN (
    'skipped', 'marked_not_applicable', 'conflict_raised', 'conflict_resolved',
    'analysis_started', 'analysis_finished'
  )),
  actor text NOT NULL CHECK (btrim(actor) <> ''),
  role text NOT NULL CHECK (role IN ('owner', 'sovitech_engineer', 'system')),
  at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reason text,
  chosen_candidate_id uuid,
  -- A resolution names the exact candidates it covered: the ones shown to the
  -- person who resolved it, all of this field (rule 4: "A conflict is put to
  -- someone only when values arrive without that person having seen both").
  -- A candidate outside the set is not covered, whenever it was written; the
  -- guard trigger of 0009 checks each id is a candidate of this subject and field.
  covered_candidate_ids uuid[],
  FOREIGN KEY (project_id, subject_id) REFERENCES sovitech.subjects (project_id, id),
  FOREIGN KEY (project_id, chosen_candidate_id) REFERENCES sovitech.candidates (project_id, id),
  -- 2.4 not_applicable: "only by a marked_not_applicable event from a named owner or engineer with a reason".
  CHECK (type <> 'marked_not_applicable' OR (role IN ('owner', 'sovitech_engineer') AND btrim(coalesce(reason, '')) <> '')),
  CHECK (chosen_candidate_id IS NULL OR type = 'conflict_resolved'),
  -- Rule 4: "Each resolution records who, when and why".
  CONSTRAINT field_events_resolution_reason CHECK (type <> 'conflict_resolved' OR btrim(coalesce(reason, '')) <> ''),
  -- Every resolution carries its covered set, and only a resolution does.
  CONSTRAINT field_events_resolution_covers CHECK ((type = 'conflict_resolved') = (covered_candidate_ids IS NOT NULL)),
  CONSTRAINT field_events_covered_shape CHECK (covered_candidate_ids IS NULL OR (
    cardinality(covered_candidate_ids) >= 1 AND array_ndims(covered_candidate_ids) = 1
    AND array_position(covered_candidate_ids, NULL) IS NULL
  )),
  -- The chosen candidate is one of those it covered.
  CONSTRAINT field_events_chosen_covered CHECK (chosen_candidate_id IS NULL OR chosen_candidate_id = ANY (covered_candidate_ids)),
  -- Rule 4: "Only the right person's resolution closes a conflict": a person resolves, never the system.
  CONSTRAINT field_events_resolution_by_person CHECK (type <> 'conflict_resolved' OR role IN ('owner', 'sovitech_engineer')),
  -- 2.4 Field states: "skipped: The owner chose Skip for now".
  CONSTRAINT field_events_skipped_by_owner CHECK (type <> 'skipped' OR role = 'owner'),
  -- 2.4 "pending: Analysis that may produce a value is still running"; rule 12: code records analysis.
  CONSTRAINT field_events_analysis_by_system CHECK (type NOT IN ('analysis_started', 'analysis_finished') OR role = 'system')
);
CREATE INDEX field_events_field ON sovitech.field_events (project_id, subject_id, field_key);

REVOKE ALL ON sovitech.candidates, sovitech.evidence_locators, sovitech.evidence_excerpts,
  sovitech.candidate_events, sovitech.field_events FROM PUBLIC;

GRANT SELECT ON sovitech.candidates, sovitech.evidence_locators, sovitech.evidence_excerpts,
  sovitech.candidate_events, sovitech.field_events TO sovitech_db_app;
GRANT INSERT (
  id, project_id, subject_id, field_key, quantity_value, quantity_unit, quantity_qualifier, quantity_approximate,
  choice, text_value, alternatives, source, original_text, original_locale, method_formula_id, method_formula_version,
  method_input_candidate_ids, method_unknown_policy, method_assumptions, reference_dataset, reference_version,
  reference_key, range_low, range_high, confidence, created_by
) ON sovitech.candidates TO sovitech_db_app;
GRANT INSERT (id, project_id, candidate_id, appearance_id, ordinal, document_id, content_hash, page, sheet, cell, bbox, evidence_check)
  ON sovitech.evidence_locators TO sovitech_db_app;
GRANT INSERT (evidence_id, project_id, content_hash, text) ON sovitech.evidence_excerpts TO sovitech_db_app;
GRANT INSERT (id, project_id, candidate_id, type, actor, role, reason, bulk_id) ON sovitech.candidate_events TO sovitech_db_app;
GRANT INSERT (id, project_id, subject_id, field_key, type, actor, role, reason, chosen_candidate_id, covered_candidate_ids)
  ON sovitech.field_events TO sovitech_db_app;
REVOKE UPDATE, DELETE, TRUNCATE ON sovitech.candidates, sovitech.evidence_locators, sovitech.evidence_excerpts,
  sovitech.candidate_events, sovitech.field_events FROM sovitech_db_app;
