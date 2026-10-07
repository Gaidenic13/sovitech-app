/**
 * DB-21 Payback Analysis (`/projects/:projectId/metrics/payback`; PRD R-096, R-099 to R-103 "Until decided", R-121;
 * the contract's `metrics.payback`; docs/adr/0052). One stored version, the latest unless the address names another.
 *
 * As the approved screen 21 lays it out, without what the PRD does not build:
 * - the title, a draft subtitle that states no result (R-092), and "Export Report": this page of the snapshot shown as
 *   a PDF (R-121); no "Compare Scenarios", "← Back to Metrics" or "BMS Live" footer (R-096, R-093);
 * - the tiles: Total Investment (CAPEX), the stored proposal's own price with its stage read from stored records (G2-7,
 *   G10-15); Estimated Annual Savings; the payback period (the stored proposal's indicator); no ROI tile (R-102);
 * - CUMULATIVE CASH FLOW and SAVINGS BREAKDOWN (ANNUAL), each a served series in the kit's chart (R-103, R-100);
 * - ENVIRONMENTAL IMPACT (ANNUAL): the carbon dioxide reduction, equivalent trees and cars off the road (R-101);
 * - not built: SCENARIO COMPARISON, KEY ASSUMPTIONS and its "✎ Edit" (R-104), every live value.
 */
import { MetricPanel } from '@sovitech/ui';
import { CarFront, Clock, Layers, Leaf, PiggyBank, Trees } from 'lucide-react';
import { request } from '../../../api/client';
import { copy } from '../../../copy';
import { ChartPanel, ExportReport, MetricsHeader, MetricsStates, NoneGenerated, PriceTile, ValueRows, ValueTile, VersionLine, chartLabels, useAdd, useMetricsView } from './metrics-page';

const PAY = copy.metrics.payback;

export function PaybackPage() {
  const load = useMetricsView((projectId, snapshot, signal) => request('metrics.payback', { params: { projectId }, query: { snapshot }, signal }));
  const onAdd = useAdd();
  const { data, displays, projectId } = load;
  const view = data?.view;
  const generated = view !== undefined && !load.notFound && view.state === 'generated' ? view : undefined;
  return (
    <div className="flex flex-col gap-6" data-metrics-page="payback">
      <MetricsHeader title={PAY.title} subtitle={PAY.subtitle} {...(generated === undefined ? {} : { actions: <ExportReport projectId={projectId} page="payback" snapshotId={generated.snapshotId} /> })} />
      <MetricsStates load={load} />
      {view === undefined || load.notFound ? null : view.state === 'none_generated' ? (
        <NoneGenerated projectId={projectId} line={view.line} actions={view.actions} displays={displays} />
      ) : (
        <>
          <VersionLine generatedOn={view.generatedOn} latest={view.latest} displays={displays} />
          <div className="grid grid-cols-3 items-stretch gap-3" data-metrics-tiles="">
            <PriceTile label={PAY.totalInvestment} icon={Layers} price={view.investment.price} displays={displays} onAdd={onAdd} />
            <ValueTile label={PAY.savings} icon={PiggyBank} valueId={view.savings} displays={displays} onAdd={onAdd} />
            <ValueTile label={PAY.payback} icon={Clock} valueId={view.payback} displays={displays} onAdd={onAdd} />
          </div>
          <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-3">
            <ChartPanel heading={PAY.cumulativeCashFlow} series={view.cumulativeCashFlow} displays={displays} labels={chartLabels(PAY.cumulativeCashFlow, 'year', 'cumulativeCashFlow')} onAdd={onAdd} />
            <div className="flex min-w-0 flex-col gap-3">
              <ChartPanel heading={PAY.savingsBreakdown} series={view.savingsBreakdown} displays={displays} labels={chartLabels(PAY.savingsBreakdown, 'stream', 'savings')} onAdd={onAdd} />
              <MetricPanel heading={PAY.environmental}>
                <ValueRows
                  rows={[
                    { key: 'carbon', label: PAY.carbon, icon: Leaf, valueId: view.environmental.carbon },
                    { key: 'trees', label: PAY.trees, icon: Trees, valueId: view.environmental.trees },
                    { key: 'cars', label: PAY.cars, icon: CarFront, valueId: view.environmental.cars },
                  ]}
                  displays={displays}
                  onAdd={onAdd}
                />
              </MetricPanel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
