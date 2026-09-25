-- 0004: assets and identity (guardrails 2.5). Runs as sovitech_db_owner.
-- Equipment is stored as assets, never as count fields: counts are calculated
-- from the register by the engine. Every attribute of an asset (tag, type,
-- location, ratings, interface) is a field on the asset's subject, with
-- candidates and events like any other value.

-- One tag, one asset: an identity per normalised tag in a project. The tag is
-- normalised by the domain's normaliseTag; the store keeps one identity per tag.
CREATE TABLE sovitech.asset_identities (
  asset_id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  subject_kind text NOT NULL GENERATED ALWAYS AS ('asset') STORED,
  normalised_tag text NOT NULL CHECK (
    normalised_tag <> '' AND normalised_tag = btrim(normalised_tag) AND normalised_tag = upper(normalised_tag)
  ),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, asset_id, subject_kind) REFERENCES sovitech.subjects (project_id, id, kind),
  CONSTRAINT asset_identities_one_per_tag UNIQUE (project_id, normalised_tag),
  UNIQUE (project_id, asset_id)
);

-- One appearance of equipment in a document. A tagged appearance belongs to the
-- asset of its tag; an untagged one belongs to none and is never merged or counted.
CREATE TABLE sovitech.asset_appearances (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  asset_id uuid,
  tag_as_written text,
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (project_id, asset_id) REFERENCES sovitech.asset_identities (project_id, asset_id),
  CHECK (asset_id IS NOT NULL OR tag_as_written IS NULL OR btrim(tag_as_written) = ''),
  CHECK (asset_id IS NULL OR (tag_as_written IS NOT NULL AND btrim(tag_as_written) <> '')),
  UNIQUE (project_id, id)
);

ALTER TABLE sovitech.evidence_locators
  ADD CONSTRAINT evidence_locators_appearance_fk FOREIGN KEY (project_id, appearance_id)
    REFERENCES sovitech.asset_appearances (project_id, id);

-- 2.5 AssetEvent: merging, splitting and removing. Only engineer accounts write them, with a reason.
CREATE TABLE sovitech.asset_events (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('merged_into', 'split_from', 'removed')),
  related_asset_ids uuid[] NOT NULL CHECK (array_position(related_asset_ids, NULL) IS NULL),
  actor text NOT NULL CHECK (btrim(actor) <> ''),
  role text NOT NULL CHECK (role = 'sovitech_engineer'),
  at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reason text NOT NULL CHECK (btrim(reason) <> ''),
  FOREIGN KEY (project_id, asset_id) REFERENCES sovitech.asset_identities (project_id, asset_id),
  CHECK (NOT (asset_id = ANY (related_asset_ids)))
);
CREATE INDEX asset_events_asset ON sovitech.asset_events (project_id, asset_id);

REVOKE ALL ON sovitech.asset_identities, sovitech.asset_appearances, sovitech.asset_events FROM PUBLIC;
GRANT SELECT ON sovitech.asset_identities, sovitech.asset_appearances, sovitech.asset_events TO sovitech_db_app;
GRANT INSERT (asset_id, project_id, normalised_tag, created_by) ON sovitech.asset_identities TO sovitech_db_app;
GRANT INSERT (id, project_id, asset_id, tag_as_written, created_by) ON sovitech.asset_appearances TO sovitech_db_app;
GRANT INSERT (id, project_id, asset_id, type, related_asset_ids, actor, role, reason) ON sovitech.asset_events TO sovitech_db_app;
REVOKE UPDATE, DELETE, TRUNCATE ON sovitech.asset_identities, sovitech.asset_appearances, sovitech.asset_events
  FROM sovitech_db_app;
