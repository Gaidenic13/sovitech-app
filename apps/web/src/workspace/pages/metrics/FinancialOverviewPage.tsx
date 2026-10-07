/**
 * DB-02 Financial Overview (`/projects/:projectId/metrics/financial-overview`; PRD R-088, R-087, R-090, R-091, R-094,
 * R-099 to R-103 "Until decided"; US-FIN-01, US-FIN-05, US-FIN-06; the contract's `metrics.financialOverview`;
 * docs/adr/0052). One stored version of the preliminary proposal, the latest unless the address names another.
 *
 * As the approved screen 02 lays it out, without what the PRD does not build:
 * - the eyebrow "METRICS", the title and a draft subtitle that states no result (R-092); no tagline, CAPEX / OPEX
 *   toggle, scenario bar, time scale, 3D model, cost callouts or "BMS LIVE" (R-088, R-107);
 * - the version line (which stored version the figures come from, bound), and an earlier version's notice;
 * - the tiles: TOTAL BMS INVESTMENT (the stored proposal's own price, its stage read from stored records, with the cost
 *   per square metre under it as the approved caption: R-087), EST. ANNUAL SAVINGS, PAYBACK PERIOD and NET PRESENT
 *   VALUE; no ROI and no "% vs. baseline" (R-102, R-100);
 * - COST BREAKDOWN with "By System" and "By Building Area" (no "By Phase": R-088), each a served series in the kit's
 *   chart, and the systems the snapshot left out of scope (G10-7); ANNUAL CASH FLOW (R-103);
 * - KEY FINANCIAL INDICATORS: "CAPEX" (the same price as the tile: G2-7), "BMS operating cost" (7.1.1-S8), the savings,
 *   payback, NPV and IRR rows; COST PER SQUARE METRE (the same display as the caption), under ANNUAL CASH FLOW where
 *   the approved screen's model stood (not built). No VALUE DRIVERS, and no PROJECT CONTEXT (the sidebar's project
 *   card: R-049). Two equal columns: every value here is long text until a dataset is approved.
 * Every figure is served; live, with no approved dataset, each reads "Not available yet", naming what it waits for,
 * and each chart one such line (G10-15, G1-31).
 */
import { MetricPanel, Tabs } from '@sovitech/ui';
import { ChartLine, Clock, Layers, PiggyBank } from 'lucide-react';
import { useId } from 'react';
import { request } from '../../../api/client';
import { copy } from '../../../copy';
import { ProposalPrice, Shown } from '../../../proposal/values';
import { CATALOGUE_SYSTEMS, systemTitle } from '../system-scope/systems';
import {
  ChartPanel,
  CostPerAreaCaption,
  MetricsHeader,
  MetricsStates,
  NamedRow,
  NoneGenerated,
  PriceTile,
  ServedChart,
  ValuePanel,
  ValueTile,
  VersionLine,
  chartLabels,
  useAdd,
  useMetricsView,
} from './metrics-page';

const FO = copy.metrics.financialOverview;

/**
 * The system an excluded decision belongs to, read from its value id: the stored proposal's own decision as the snapshot
 * used it, `proposal:<sid>.inputs.project.scope.<system>` (the contract's metrics.ts header; G2-7), a system of the
 * catalogue; or undefined, when the row then keeps the decision's own label.
 */
function excludedSystemOf(valueId: string): string | undefined {
  const systemId = /\.inputs\.project\.scope\.([a-z][a-z_]*)$/u.exec(valueId)?.[1];
  return systemId !== undefined && CATALOGUE_SYSTEMS.includes(systemId) ? systemId : undefined;
}

export function FinancialOverviewPage() {
  const load = useMetricsView((projectId, snapshot, signal) =>
    request('metrics.financialOverview', { params: { projectId }, query: { snapshot }, signal }),
  );
  const onAdd = useAdd();
  const breakdownId = useId();
  const exclusionsId = useId();
  const { data, displays, projectId } = load;
  const view = data?.view;
  return (
    <div className="flex flex-col gap-6" data-metrics-page="financial_overview">
      <MetricsHeader eyebrow={copy.metrics.eyebrow} title={FO.title} subtitle={FO.subtitle} />
      <MetricsStates load={load} />
      {view === undefined || load.notFound ? null : view.state === 'none_generated' ? (
        <NoneGenerated projectId={projectId} line={view.line} actions={view.actions} displays={displays} />
      ) : (
        <>
          <VersionLine generatedOn={view.generatedOn} latest={view.latest} displays={displays} />
          <div className="grid grid-cols-4 items-stretch gap-3" data-metrics-tiles="">
            <PriceTile label={FO.totalInvestment} icon={Layers} price={view.investment.price} displays={displays} onAdd={onAdd}>
              <CostPerAreaCaption valueId={view.costPerArea} displays={displays} divided />
            </PriceTile>
            <ValueTile label={FO.annualSavings} icon={PiggyBank} valueId={view.savings.total} displays={displays} onAdd={onAdd} />
            <ValueTile label={FO.payback} icon={Clock} valueId={view.indicators.payback} displays={displays} onAdd={onAdd} />
            <ValueTile label={FO.npv} icon={ChartLine} valueId={view.indicators.npv} displays={displays} onAdd={onAdd} />
          </div>
          <div className="grid grid-cols-2 items-start gap-3">
            <div className="flex min-w-0 flex-col gap-3">
              <MetricPanel heading={FO.costBreakdown} headingId={breakdownId}>
                <Tabs
                  label={FO.costBreakdown}
                  tabs={[
                    {
                      id: 'by-system',
                      label: FO.bySystem,
                      // Each tab's chart is named by its tab, never both by the panel's heading (A-9, phase 6 part B).
                      panel: <ServedChart series={view.costBreakdown.bySystem} displays={displays} labels={chartLabels(FO.bySystem, 'system', 'investment')} onAdd={onAdd} describedBy={breakdownId} />,
                    },
                    {
                      id: 'by-building-area',
                      label: FO.byBuildingArea,
                      panel: <ServedChart series={view.costBreakdown.byBuildingArea} displays={displays} labels={chartLabels(FO.byBuildingArea, 'level', 'investment')} onAdd={onAdd} describedBy={breakdownId} />,
                    },
                  ]}
                />
                {view.costBreakdown.exclusions.length === 0 ? null : (
                  <div className="flex flex-col gap-2 border-t border-(--sov-border) pt-4" data-metrics-exclusions="">
                    <h3 id={exclusionsId} className="sov-heading-group">
                      {FO.exclusions}
                    </h3>
                    <ul aria-labelledby={exclusionsId} className="flex list-none flex-col">
                      {view.costBreakdown.exclusions.map((valueId) => {
                        // An excluded system's decision as the snapshot used it, named by its system alone (G10-7), as
                        // CAPEX and the stored proposal name it: never "System in scope: <system>" beside "Not
                        // included", a label its value contradicts (rule 8; DR-2).
                        const systemId = excludedSystemOf(valueId);
                        return (
                          <li key={valueId} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-4 border-t border-(--sov-border) py-3 first:border-t-0" data-excluded={systemId ?? ''}>
                            <span className="sov-text-body text-(--sov-text-primary)">{systemId === undefined ? null : systemTitle(systemId)}</span>
                            <Shown display={displays.get(valueId)} {...(systemId === undefined ? {} : { label: null })} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </MetricPanel>
              <ChartPanel heading={FO.annualCashFlow} series={view.annualCashFlow} displays={displays} labels={chartLabels(FO.annualCashFlow, 'year', 'cashFlow')} onAdd={onAdd} />
              <ValuePanel heading={FO.costPerAreaPanel} valueId={view.costPerArea} displays={displays} onAdd={onAdd} />
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <MetricPanel heading={FO.keyIndicators}>
                <ul className="flex list-none flex-col" data-key-indicators="">
                  <NamedRow name={FO.rows.capex} attributes={{ 'data-indicator': 'capex' }}>
                    {(nameId) => <ProposalPrice price={view.investment.price} displays={displays} onAdd={onAdd} describedBy={nameId} />}
                  </NamedRow>
                  {(
                    [
                      ['bmsOperatingCost', FO.rows.bmsOperatingCost, view.indicators.bmsOperatingCost],
                      ['energySavings', FO.rows.energySavings, view.savings.energy],
                      ['operationalSavings', FO.rows.operationalSavings, view.savings.operational],
                      ['totalSavings', FO.rows.totalSavings, view.savings.total],
                      ['payback', FO.rows.payback, view.indicators.payback],
                      ['npv', FO.rows.npv, view.indicators.npv],
                      ['irr', FO.rows.irr, view.indicators.irr],
                    ] as const
                  ).map(([key, name, valueId]) => (
                    <NamedRow key={key} name={name} attributes={{ 'data-indicator': key }}>
                      {(nameId) => <Shown display={displays.get(valueId)} label={null} onAdd={onAdd} describedBy={nameId} />}
                    </NamedRow>
                  ))}
                </ul>
              </MetricPanel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
