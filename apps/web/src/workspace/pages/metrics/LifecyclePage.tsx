/**
 * DB-22 Lifecycle Analysis (`/projects/:projectId/metrics/lifecycle`; PRD R-097, R-105 "Until decided", R-121;
 * US-FIN-04 AC5, US-FIN-26; the contract's `metrics.lifecycle`; docs/adr/0052). One stored version, the latest unless
 * the address names another.
 *
 * As the approved screen 22 lays it out, without what the PRD does not build:
 * - the title, a draft subtitle that states no result (R-092), the analysis period (its served line: "Not available
 *   yet", naming the missing duration unit; no selector: US-FIN-04 AC5) and "Export Report" (R-121); no "Configure",
 *   "← Back to Metrics" or "BMS Live" footer (R-097, R-093);
 * - the tiles: Total Lifecycle Cost, Net Savings and Average Equipment Life (no Lifecycle ROI: R-102);
 * - LIFECYCLE COST COMPARISON, COST BREAKDOWN (LIFECYCLE) and LIFECYCLE BY SYSTEM, each a served series in the kit's
 *   chart; KEY INSIGHTS; EQUIPMENT LIFECYCLE: its served line while no asset type can be counted (the asset taxonomy:
 *   US-FIN-26 AC3), with no row, chevron or pager.
 */
import { MetricTile } from '@sovitech/ui';
import { CalendarRange, Hourglass, PiggyBank, Wallet } from 'lucide-react';
import { useId } from 'react';
import { request } from '../../../api/client';
import { copy } from '../../../copy';
import { Shown } from '../../../proposal/values';
import { ChartPanel, ExportReport, MetricsHeader, MetricsStates, NoneGenerated, ValuePanel, ValueTile, VersionLine, chartLabels, useAdd, useMetricsView } from './metrics-page';

const LIFE = copy.metrics.lifecycle;

export function LifecyclePage() {
  const load = useMetricsView((projectId, snapshot, signal) => request('metrics.lifecycle', { params: { projectId }, query: { snapshot }, signal }));
  const onAdd = useAdd();
  const periodId = useId();
  const { data, displays, projectId } = load;
  const view = data?.view;
  const generated = view !== undefined && !load.notFound && view.state === 'generated' ? view : undefined;
  return (
    <div className="flex flex-col gap-6" data-metrics-page="lifecycle">
      <MetricsHeader
        title={LIFE.title}
        subtitle={LIFE.subtitle}
        {...(generated === undefined
          ? {}
          : {
              actions: (
                <>
                  <div className="w-[280px]" data-analysis-period="">
                    <MetricTile label={LIFE.analysisPeriod} icon={CalendarRange} labelId={periodId}>
                      <Shown display={displays.get(generated.analysisPeriod)} label={null} describedBy={periodId} onAdd={onAdd} />
                    </MetricTile>
                  </div>
                  <ExportReport projectId={projectId} page="lifecycle" snapshotId={generated.snapshotId} />
                </>
              ),
            })}
      />
      <MetricsStates load={load} />
      {view === undefined || load.notFound ? null : view.state === 'none_generated' ? (
        <NoneGenerated projectId={projectId} line={view.line} actions={view.actions} displays={displays} />
      ) : (
        <>
          <VersionLine generatedOn={view.generatedOn} latest={view.latest} displays={displays} />
          <div className="grid grid-cols-3 items-stretch gap-3" data-metrics-tiles="">
            <ValueTile label={LIFE.totalCost} icon={Wallet} valueId={view.tiles.totalCost} displays={displays} onAdd={onAdd} />
            <ValueTile label={LIFE.netSavings} icon={PiggyBank} valueId={view.tiles.netSavings} displays={displays} onAdd={onAdd} />
            <ValueTile label={LIFE.averageLife} icon={Hourglass} valueId={view.tiles.averageLife} displays={displays} onAdd={onAdd} />
          </div>
          <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-3">
            <div className="flex min-w-0 flex-col gap-3">
              <ChartPanel heading={LIFE.costComparison} series={view.costComparison} displays={displays} labels={chartLabels(LIFE.costComparison, 'year', 'lifecycleCost')} onAdd={onAdd} />
              <ValuePanel heading={LIFE.equipment} valueId={view.equipment} displays={displays} onAdd={onAdd} />
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <ChartPanel heading={LIFE.costBreakdown} series={view.costBreakdown} displays={displays} labels={chartLabels(LIFE.costBreakdown, 'costItem', 'lifecycleCost')} onAdd={onAdd} />
              <ChartPanel heading={LIFE.bySystem} series={view.bySystem} displays={displays} labels={chartLabels(LIFE.bySystem, 'system', 'lifecycleCost')} onAdd={onAdd} />
              <ValuePanel heading={LIFE.keyInsights} valueId={view.keyInsights} displays={displays} onAdd={onAdd} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
