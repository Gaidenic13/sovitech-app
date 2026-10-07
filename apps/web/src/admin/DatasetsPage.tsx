/**
 * UD-40: reference datasets and their approval status, read-only (PRD R-150 "Until decided"; R-141; R-132 "Until
 * decided"; US-ADMIN-19 AC1, AC2, AC4; US-ENGINEER-12 AC1; the contract's `admin.datasets`; docs/adr/0053 decision 7;
 * case G1-33).
 *
 * One ruled table: each dataset the gates wait for (and each the registry declares; none in production), by the name
 * the gate gives it, with its version ("No version received" while none is), its approval status as the API read it
 * from stored approval records ("No approval record" while no approver is named: R-150), and the gates and the
 * decision that wait for it. Every cell is a served display object, bound (rule 2); the page names no dataset, version
 * or status of its own.
 *
 * No control reviews, approves, edits or imports a dataset: approval belongs to the approver alone (guardrails
 * section 10, "Who approves", "What counts as approval"; prompt 3 5.4), and no engineer review is recorded here while
 * R-150 waits (D-47, D-05, D-92).
 *
 * Undesigned (no approved screen): the area's grammar (./admin-view.tsx): the title and its sentence, then the one table.
 */
import { RegisterTable, type RegisterColumn } from '@sovitech/ui';
import type { AdminDataset } from '@sovitech/view-model/browser';
import { request } from '../api/client';
import { copy } from '../copy';
import { AdminPage, AdminStates, BoundText, Shown, useAdminView } from './admin-view';

const DS = copy.admin.datasets;

export function DatasetsPage() {
  const load = useAdminView((signal) => request('admin.datasets', { signal }));
  const { data, displays } = load;
  const columns: RegisterColumn<AdminDataset>[] = [
    {
      kind: 'content',
      id: 'name',
      header: DS.name,
      rowHeader: true,
      cell: (dataset) => (
        <span className="block min-w-[220px] max-w-[320px] font-medium">
          <BoundText displays={displays} valueId={dataset.name} />
        </span>
      ),
    },
    { kind: 'content', id: 'version', header: DS.version, cell: (dataset) => <Shown displays={displays} valueId={dataset.version} /> },
    { kind: 'content', id: 'approval', header: DS.approval, cell: (dataset) => <Shown displays={displays} valueId={dataset.approval} /> },
    { kind: 'content', id: 'waitsFor', header: DS.waitsFor, cell: (dataset) => <div className="min-w-[200px] text-(--sov-text-tertiary)"><Shown displays={displays} valueId={dataset.waitsFor} /></div> },
  ];
  return (
    <AdminPage title={copy.titles.adminDatasets} subtitle={DS.intro}>
      <AdminStates load={load} />
      {data === undefined ? null : (
        <div className="min-w-0" data-admin-section="admin-datasets">
          <RegisterTable label={copy.titles.adminDatasets} columns={columns} rows={data.view.datasets} rowKey={(dataset) => dataset.datasetKey} empty={<p>{DS.none}</p>} />
        </div>
      )}
    </AdminPage>
  );
}
