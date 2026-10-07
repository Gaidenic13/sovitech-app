/**
 * DB-13 CAPEX Breakdown (`/projects/:projectId/metrics/capex`; PRD R-089, R-087, R-090, R-091; US-FIN-21; 7.1.1-P10;
 * the contract's `metrics.capex`; docs/adr/0052). An ordinary Metrics page of one stored version (prompt 3 5.2
 * "Configurator": no stepper walkthrough), the latest unless the address names another.
 *
 * As the approved screen 13 lays it out, without what the PRD does not build:
 * - the title, a draft subtitle that states no result (no "Configure your BMS solution and see the investment in real
 *   time": R-092), and "Download Proposal": the stored proposal of the page's snapshot, through phase 5's download
 *   (R-118; 7.1.1-P10); no "Powered by", SAUTER logo or step tabs (R-089, R-117);
 * - "Systems" (the approved "1. SELECT SYSTEMS"): each system's decision as the snapshot used it, read-only, with its
 *   badge, Fire Safety's monitoring-only sentence where included (rule 11; 7.1.1-L1), and the way to System Scope, the
 *   only scope editor after Generate (ADR 0043); no checkbox, "View details →", automation level, level card, slider,
 *   package or "Reset" (R-089, R-098, R-108);
 * - INVESTMENT SUMMARY: "Selected systems" (the served count of the include decisions "Systems" shows, bound, or its
 *   "Not available yet" line with the owner's Add while a decision as used was not recorded: R-089, US-FIN-21 AC6;
 *   phase 6 part B, V-3), Total CAPEX (the stored proposal's own price, its stage read from stored records: G2-7,
 *   G10-15) and the cost per square metre (R-087); no "Automation Level";
 * - the investment by system: the same served series as Financial Overview's "By System" (one snapshot: G9-8), with
 *   the systems left out listed by name (G10-7); no shares or colour bar (US-FIN-05 AC3);
 * - the KPI strip: the estimated annual savings, the payback and the carbon dioxide reduction (US-FIN-21 AC8); no
 *   "View <n>-Year Analysis →".
 */
import { MetricPanel, StatusLine } from '@sovitech/ui';
import { ArrowRight, Clock, Leaf, PiggyBank } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';
import { request } from '../../../api/client';
import { copy } from '../../../copy';
import { DownloadProposal } from '../../../proposal/DownloadProposal';
import { ProposalPrice, Shown } from '../../../proposal/values';
import { pagePath } from '../../navigation';
import { SYSTEM_ICONS, systemTitle } from '../system-scope/systems';
import { CostPerAreaCaption, MetricsHeader, MetricsStates, NoneGenerated, ServedChart, ValueTile, VersionLine, chartLabels, useAdd, useMetricsView } from './metrics-page';

const CAP = copy.metrics.capex;

export function CapexPage() {
  const load = useMetricsView((projectId, snapshot, signal) => request('metrics.capex', { params: { projectId }, query: { snapshot }, signal }));
  const onAdd = useAdd();
  const totalId = useId();
  const selectedId = useId();
  const bySystemId = useId();
  const exclusionsId = useId();
  const { data, displays, projectId } = load;
  const view = data?.view;
  const generated = view !== undefined && !load.notFound && view.state === 'generated' ? view : undefined;
  return (
    <div className="flex flex-col gap-6" data-metrics-page="capex">
      <MetricsHeader
        title={CAP.title}
        subtitle={CAP.subtitle}
        {...(generated === undefined ? {} : { actions: <DownloadProposal projectId={projectId} snapshotId={generated.snapshotId} label={copy.metrics.downloadProposal} variant="secondary" /> })}
      />
      <MetricsStates load={load} />
      {view === undefined || load.notFound ? null : view.state === 'none_generated' ? (
        <NoneGenerated projectId={projectId} line={view.line} actions={view.actions} displays={displays} />
      ) : (
        <>
          <VersionLine generatedOn={view.generatedOn} latest={view.latest} displays={displays} />
          <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start gap-3">
            <MetricPanel heading={CAP.selectSystems} actions={<SystemScopeLink projectId={projectId} />}>
              <ul className="flex list-none flex-col" data-capex-systems="">
                {view.scope.map((system) => {
                  const sentence = system.sentence === null ? undefined : displays.get(system.sentence);
                  const Icon = SYSTEM_ICONS[system.systemId];
                  return (
                    <li
                      key={system.systemId}
                      data-system={system.systemId}
                      {...(view.exclusions.includes(system.decision) ? { 'data-excluded': '' } : {})}
                      className="grid grid-cols-[24px_minmax(0,2fr)_minmax(0,3fr)] items-start gap-3 border-t border-(--sov-border) py-3 first:border-t-0 first:pt-0"
                    >
                      <span className="pt-0.5 text-(--sov-text-tertiary)">{Icon === undefined ? null : <Icon size={20} strokeWidth={1.5} aria-hidden="true" focusable="false" />}</span>
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="sov-text-body text-(--sov-text-primary)">{systemTitle(system.systemId)}</span>
                        {sentence === undefined ? null : sentence.kind === 'line' ? <StatusLine display={sentence} size="small" /> : <Shown display={sentence} />}
                      </div>
                      <div className="min-w-0">
                        <Shown display={displays.get(system.decision)} label={null} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </MetricPanel>
            <div className="flex min-w-0 flex-col gap-3">
              <MetricPanel heading={CAP.investmentSummary}>
                <div role="group" aria-labelledby={selectedId} className="flex min-w-0 flex-col gap-2 border-b border-(--sov-border) pb-4" data-selected-systems="">
                  <p id={selectedId} className="sov-text-caption">
                    {CAP.selectedSystems}
                  </p>
                  <Shown display={displays.get(view.selectedSystems)} label={null} onAdd={onAdd} describedBy={selectedId} />
                </div>
                <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-6">
                  <div role="group" aria-labelledby={totalId} className="flex min-w-0 flex-col gap-2">
                    <p id={totalId} className="sov-text-caption">
                      {CAP.totalCapex}
                    </p>
                    <ProposalPrice price={view.investment.price} displays={displays} onAdd={onAdd} describedBy={totalId} />
                  </div>
                  <CostPerAreaCaption valueId={view.costPerArea} displays={displays} />
                </div>
              </MetricPanel>
              <MetricPanel heading={CAP.bySystem} headingId={bySystemId}>
                <ServedChart series={view.bySystem} displays={displays} labels={chartLabels(CAP.bySystem, 'system', 'investment')} onAdd={onAdd} describedBy={bySystemId} />
                {view.exclusions.length === 0 ? null : (
                  <div className="flex flex-col gap-2 border-t border-(--sov-border) pt-4" data-metrics-exclusions="">
                    <h3 id={exclusionsId} className="sov-heading-group">
                      {CAP.exclusions}
                    </h3>
                    <ul aria-labelledby={exclusionsId} className="flex list-none flex-col">
                      {view.exclusions.map((valueId) => {
                        // An excluded system's decision as the snapshot used it, named by its system (G10-7).
                        const system = view.scope.find((entry) => entry.decision === valueId);
                        return (
                          <li key={valueId} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-4 border-t border-(--sov-border) py-3 first:border-t-0" data-excluded={system?.systemId ?? ''}>
                            <span className="sov-text-body text-(--sov-text-primary)">{system === undefined ? null : systemTitle(system.systemId)}</span>
                            <Shown display={displays.get(valueId)} {...(system === undefined ? {} : { label: null })} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </MetricPanel>
            </div>
          </div>
          <div className="grid grid-cols-3 items-stretch gap-3" data-metrics-kpis="">
            <ValueTile label={CAP.kpis.savings} icon={PiggyBank} valueId={view.kpis.savings} displays={displays} onAdd={onAdd} />
            <ValueTile label={CAP.kpis.payback} icon={Clock} valueId={view.kpis.payback} displays={displays} onAdd={onAdd} />
            <ValueTile label={CAP.kpis.carbon} icon={Leaf} valueId={view.kpis.carbon} displays={displays} onAdd={onAdd} />
          </div>
        </>
      )}
    </div>
  );
}

/** The way to System Scope, the only scope editor after Generate (ADR 0043): an in-page link, as the others. */
function SystemScopeLink({ projectId }: { readonly projectId: string }) {
  return (
    <Link to={pagePath(projectId, 'system_scope')} className="sov-button" data-variant="link" data-size="default" data-icon="true" data-copy-kind="action-label">
      <span>{CAP.editScope}</span>
      <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" />
    </Link>
  );
}
