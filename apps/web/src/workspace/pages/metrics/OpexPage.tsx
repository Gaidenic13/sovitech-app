/**
 * DB-12 OPEX & Savings (`/projects/:projectId/metrics/opex`; PRD R-095 with D-27's "Until decided", R-087, R-098;
 * US-FIN-12, US-FIN-13, US-FIN-14; 7.1.1-S8; the contract's `metrics.opex`; docs/adr/0052). The building's operating
 * cost before any BMS, as its documents state it now: no proposal snapshot.
 *
 * As the approved screen 12 lays it out, without what the PRD does not build:
 * - the eyebrow "METRICS", the title and a draft subtitle that states no result (no "Real-time operational costs ..."
 *   or tagline: R-092), and the system filter ("All Systems"; US-FIN-12 AC11), which narrows SYSTEM OPEX COMPARISON's
 *   rows in the page only and sends nothing; no "Last 12 Months" (R-095);
 * - the tiles: "Building operating cost" (the approved TOTAL ANNUAL OPEX: "OPEX" never stands alone as a value's label,
 *   7.1.1-S8), the energy cost (with the way to upload a document for an existing building: US-FIN-13 AC8; for new
 *   construction what an estimate lacks: AC9), maintenance, operations (staff) and other costs (Unknown while no
 *   document states them: US-FIN-14 AC1; nothing new is asked); no "% vs. baseline";
 * - "Building operating cost by system" (SYSTEM OPEX COMPARISON): a row per system whose recorded decision is include
 *   (G10-7), its decision with its badge and its current cost; no Baseline or Savings column (US-FIN-12 AC7); with no
 *   include decision recorded, the served line, "Not available yet: the systems in scope", and the way to choose them,
 *   in place of an empty table (rule 7; G7-24, phase 6 part B's V-1);
 * - the breakdown and the intensity, each on its own panel with its line (R-098: every label and basis on the panel
 *   itself; no ⓘ); no benchmark marker (7.1.1-S7);
 * - not built: MONTHLY OPEX TREND, ENERGY COST BREAKDOWN, TOP SAVINGS OPPORTUNITIES, the 3D model, the scenario bar.
 * While D-27 is open no amount per year is stored or computed, so each figure reads "Not available yet", naming what it
 * waits for, or Unknown.
 */
import { Icon, MetricPanel, RegisterTable, type RegisterColumn } from '@sovitech/ui';
import { Banknote, ChevronDown, CircleEllipsis, Users, Wrench, Zap } from 'lucide-react';
import type { OpexResponse } from '@sovitech/view-model/browser';
import { useId, useState } from 'react';
import { request } from '../../../api/client';
import { copy } from '../../../copy';
import { Shown } from '../../../proposal/values';
import { SYSTEM_ICONS, systemTitle } from '../system-scope/systems';
import { MetricsHeader, MetricsStates, ValuePanel, ValueTile, WorkspaceActionLinks, useAdd, useMetricsView } from './metrics-page';

const OPX = copy.metrics.opex;
const ALL = '';

type SystemRow = OpexResponse['view']['systems'][number];

/** The system filter (the approved "All Systems"): a native select of the systems the table lists, with its name. */
function SystemFilter({ systems, value, onChange }: { readonly systems: readonly string[]; readonly value: string; readonly onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="sov-text-small">
        {OPX.systemFilter}
      </label>
      <div className="relative flex h-10 min-w-[200px] items-center rounded-(--sov-radius-surface) border border-(--sov-control-border) transition-colors duration-300 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--sov-focus-ring) hover:border-(--sov-text-primary)">
        <select id={id} value={value} onChange={(event) => onChange(event.currentTarget.value)} className="h-full w-full appearance-none bg-transparent pr-9 pl-3 text-[14px] text-(--sov-text-primary) outline-none">
          <option value={ALL}>{OPX.allSystems}</option>
          {systems.map((systemId) => (
            <option key={systemId} value={systemId}>
              {systemTitle(systemId)}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 text-(--sov-text-tertiary)">
          <Icon icon={ChevronDown} size="small" />
        </span>
      </div>
    </div>
  );
}

export function OpexPage() {
  const load = useMetricsView((projectId, _snapshot, signal) => request('metrics.opex', { params: { projectId }, signal }), { readsSnapshot: false });
  const onAdd = useAdd();
  const [system, setSystem] = useState(ALL);
  const systemsId = useId();
  const { data, displays, projectId } = load;
  const view = data?.view;
  const systems = view?.systems ?? [];
  const shown = system === ALL ? systems : systems.filter((row) => row.systemId === system);
  const columns: RegisterColumn<SystemRow>[] = [
    {
      kind: 'content',
      id: 'system',
      header: OPX.systemColumn,
      rowHeader: true,
      cell: (row) => {
        const Icon = SYSTEM_ICONS[row.systemId];
        return (
          <span className="flex items-center gap-3">
            {Icon === undefined ? null : <Icon size={20} strokeWidth={1.5} aria-hidden="true" focusable="false" className="shrink-0 text-(--sov-text-tertiary)" />}
            <span>{systemTitle(row.systemId)}</span>
          </span>
        );
      },
    },
    { kind: 'content', id: 'scope', header: OPX.scopeColumn, cell: (row) => <Shown display={displays.get(row.decision)} label={null} /> },
    { kind: 'content', id: 'current', header: OPX.currentColumn, cell: (row) => <Shown display={displays.get(row.current)} label={null} onAdd={onAdd} /> },
  ];
  return (
    <div className="flex flex-col gap-6" data-metrics-page="opex">
      <MetricsHeader
        eyebrow={copy.metrics.eyebrow}
        title={OPX.title}
        subtitle={OPX.subtitle}
        {...(view === undefined || systems.length === 0 ? {} : { actions: <SystemFilter systems={systems.map((row) => row.systemId)} value={system} onChange={setSystem} /> })}
      />
      <MetricsStates load={load} />
      {view === undefined || load.notFound ? null : (
        <>
          <div className="grid grid-cols-5 items-stretch gap-3" data-metrics-tiles="">
            <ValueTile label={OPX.total} icon={Banknote} valueId={view.total} displays={displays} onAdd={onAdd} />
            <ValueTile label={OPX.energy} icon={Zap} valueId={view.energy.display} displays={displays} onAdd={onAdd}>
              {(labelId) => <WorkspaceActionLinks projectId={projectId} actions={view.energy.actions} describedBy={labelId} />}
            </ValueTile>
            <ValueTile label={OPX.maintenance} icon={Wrench} valueId={view.maintenance} displays={displays} onAdd={onAdd} />
            <ValueTile label={OPX.staff} icon={Users} valueId={view.staff} displays={displays} onAdd={onAdd} />
            <ValueTile label={OPX.other} icon={CircleEllipsis} valueId={view.other} displays={displays} onAdd={onAdd} />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-3">
            <MetricPanel heading={OPX.systems} headingId={systemsId}>
              {view.noSystems === null ? (
                <RegisterTable label={OPX.systems} columns={columns} rows={shown} rowKey={(row) => row.systemId} />
              ) : (
                <div className="flex flex-col items-start gap-3" data-opex-no-systems="">
                  <Shown display={displays.get(view.noSystems.line)} label={null} describedBy={systemsId} />
                  <WorkspaceActionLinks projectId={projectId} actions={view.noSystems.actions} describedBy={systemsId} />
                </div>
              )}
            </MetricPanel>
            <div className="flex min-w-0 flex-col gap-3">
              <ValuePanel heading={OPX.breakdown} valueId={view.breakdown} displays={displays} onAdd={onAdd} />
              <ValuePanel heading={OPX.intensity} valueId={view.intensity} displays={displays} onAdd={onAdd} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
