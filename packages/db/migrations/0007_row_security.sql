-- 0007: row-level security on project_id for every project-scoped table (rule 13,
-- "Isolation"; prompt 3 5.2 "Database"). Runs as sovitech_db_owner. FORCE applies
-- the policy to the table owner too, so a migration reads no project's rows by
-- accident. A request sees only the project sovitech.current_project_id() returns.

DO $policies$
DECLARE
  scoped text;
BEGIN
  FOREACH scoped IN ARRAY ARRAY[
    'project_members', 'subjects', 'documents', 'document_events', 'document_analysis_events', 'document_texts',
    'candidates', 'evidence_locators', 'evidence_excerpts', 'candidate_events', 'field_events',
    'asset_identities', 'asset_appearances', 'asset_events', 'guardrail_events', 'review_item_opens',
    'quotation_records', 'quotation_record_inputs', 'proposal_snapshots', 'proposal_snapshot_candidates',
    'proposal_snapshot_formulas'
  ]
  LOOP
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

-- The project row itself.
ALTER TABLE sovitech.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sovitech.projects FORCE ROW LEVEL SECURITY;
CREATE POLICY project_scope ON sovitech.projects
  USING (id = (SELECT sovitech.current_project_id()))
  WITH CHECK (id = (SELECT sovitech.current_project_id()));

-- Audit events of a project are that project's; account and role events have no
-- project and are read by the operator's login only.
ALTER TABLE sovitech.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sovitech.audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY project_scope ON sovitech.audit_events
  USING (project_id = (SELECT sovitech.current_project_id()))
  WITH CHECK (project_id = (SELECT sovitech.current_project_id()));
CREATE POLICY operator_reads ON sovitech.audit_events FOR SELECT TO sovitech_db_admin USING (true);
