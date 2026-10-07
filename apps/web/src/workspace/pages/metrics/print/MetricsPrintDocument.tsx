/**
 * A printed Metrics page (phase 6; PRD R-121 "Export Report"; US-REPORTS-13; docs/adr/0052 decision 7; docs/adr/0050
 * decision 1, amended in phase 6): what the print route of Payback Analysis or Lifecycle Analysis shows and the API
 * prints to PDF, read from one stored version's print view (`metrics.payback.print`, `metrics.lifecycle.print`) as the
 * API served it, with no action anywhere (paper has no button; the server strips every display's actions too).
 *
 * - **On every page** of the demo project: the demo line, repeated at the top of each printed page by the kit's
 *   PrintFrame (rule 10, "Labelled everywhere"; G10-16); on any other project, none (G10-10).
 * - **The head**: the page's title, the project's name (bound) and the stored version its figures come from, its
 *   generation date bound (as the page's version line says it), and, for an earlier version, that it is one. No logo
 *   until P-5-PRINT-LOGO-UNREADABLE is decided (ADR 0050 decision 7), no tagline, photo or "BMS Live".
 * - **The page's content as rendered** (R-121): the same values in the page's order, each named by the page's own label
 *   (copy.metrics.*), through the kit's print value (Value, "Not available yet", StatusLine) with its one badge on its
 *   figure's line and its source and status lines under it (2.8 "Prominence"), the investment through the one Price
 *   component (rule 10: the stage read from stored records). Every missing value prints its 2.8 wording, "Unknown" or
 *   "Not available yet: …" naming what is missing, never 0, a dash or a blank (rule 1; 7.1-r25; G1-32).
 * - **Charts**: a series that is not available prints its one line (G1-31); one with figures prints as the page draws
 *   it, its marks bound to the points' value ids at the served positions, each point named with its value beside it
 *   and its gaps labelled (G1-5, G9-9), with no view switch.
 *
 * Fixed copy from the catalogue (`metrics.*`); everything else from the display objects. A value id the view names with
 * no display object is left out, never invented.
 */
import { Price, PrintFrame, PrintValue, SeriesChart, type SeriesChartLabels } from '@sovitech/ui';
import type { LifecycleResponse, MetricsExportPage, PaybackResponse, Price as PriceRecord, Series } from '@sovitech/view-model/browser';
import { useId, type ReactNode } from 'react';
import { copy } from '../../../../copy';
import '../../../../proposal/print/print.css';
import { indexDisplays, type Displays } from '../../../../wizard/use-step-view';

const MET = copy.metrics;
const PAY = MET.payback;
const LIFE = MET.lifecycle;

export type MetricsPrintResponse = { readonly page: 'payback'; readonly response: PaybackResponse } | { readonly page: 'lifecycle'; readonly response: LifecycleResponse };

/** A served value by its id, printed; nothing when the view names an id it was not served. */
function Shown({ displays, id, label }: { readonly displays: Displays; readonly id: string; readonly label?: ReactNode }) {
  const display = displays.get(id);
  if (display === undefined) return null;
  return <PrintValue display={display} {...(label === undefined ? {} : { label })} />;
}

/** A row: the value's name (the page's label), then its element across the page's width. */
function Row({ name, children }: { readonly name: string; readonly children: ReactNode }) {
  return (
    <li className="sov-print__row">
      <div className="sov-print__name">{name}</div>
      <div>{children}</div>
    </li>
  );
}

/** A named value row (a tile or a panel's row on the page). */
function ValueRow({ displays, name, id }: { readonly displays: Displays; readonly name: string; readonly id: string }) {
  if (!displays.has(id)) return null;
  return (
    <Row name={name}>
      <Shown displays={displays} id={id} label={null} />
    </Row>
  );
}

/** The investment through the one Price component: the stage label is the figure's own line, served once (V-11). */
function PriceRow({ displays, name, price }: { readonly displays: Displays; readonly name: string; readonly price: PriceRecord }) {
  const figure = displays.get(price.figure);
  if (figure === undefined) return null;
  return (
    <Row name={name}>
      <Price display={figure} />
    </Row>
  );
}

/** A section of the printed page, with the page's panel heading. */
function Section({ id, heading, children }: { readonly id: string; readonly heading: string; readonly children: ReactNode }) {
  const headingId = useId();
  return (
    <section className="sov-print__section" aria-labelledby={headingId} data-print-section={id}>
      <h2 id={headingId}>{heading}</h2>
      {children}
    </section>
  );
}

/** The chart's fixed words (catalogue copy), as the page's chart panels name them. */
function labelsOf(name: string, point: keyof typeof MET.chart.columns, value: keyof typeof MET.chart.columns): SeriesChartLabels {
  return { name, pointColumn: MET.chart.columns[point], valueColumn: MET.chart.columns[value], total: MET.chart.total, showTable: MET.showTable, showChart: MET.showChart };
}

/** A chart panel on paper: its one line, or the chart as the page draws it, with no view switch and no action. */
function SeriesSection({ id, heading, series, displays, labels }: { readonly id: string; readonly heading: string; readonly series: Series; readonly displays: Displays; readonly labels: SeriesChartLabels }) {
  const bodyId = useId();
  return (
    <Section id={id} heading={heading}>
      <SeriesChart series={series} displays={displays} labels={labels} control={{ view: 'chart', bodyId }} />
    </Section>
  );
}

/** The head of the printed page: the title, the project, the stored version the figures come from. */
function Head({ title, displays, projectName, version }: { readonly title: string; readonly displays: Displays; readonly projectName: string; readonly version: { readonly generatedOn: string; readonly latest: boolean } | null }) {
  return (
    <header className="sov-print__head" data-print-section="head">
      <h1>{title}</h1>
      <div className="sov-print__project">
        <Shown displays={displays} id={projectName} label={null} />
      </div>
      {version === null ? null : (
        <>
          <Shown displays={displays} id={version.generatedOn} label={MET.generatedFrom} />
          {version.latest ? null : <p className="sov-print__note">{MET.earlierVersion}</p>}
        </>
      )}
    </header>
  );
}

function PaybackBody({ response, displays }: { readonly response: PaybackResponse; readonly displays: Displays }) {
  const view = response.view;
  if (view.state === 'none_generated') {
    return (
      <ul className="sov-print__rows">
        <li className="sov-print__row">
          <Shown displays={displays} id={view.line} />
        </li>
      </ul>
    );
  }
  return (
    <>
      <ul className="sov-print__rows" data-print-section="figures">
        <PriceRow displays={displays} name={PAY.totalInvestment} price={view.investment.price} />
        <ValueRow displays={displays} name={PAY.savings} id={view.savings} />
        <ValueRow displays={displays} name={PAY.payback} id={view.payback} />
      </ul>
      <SeriesSection id="cumulative-cash-flow" heading={PAY.cumulativeCashFlow} series={view.cumulativeCashFlow} displays={displays} labels={labelsOf(PAY.cumulativeCashFlow, 'year', 'cumulativeCashFlow')} />
      <SeriesSection id="savings-breakdown" heading={PAY.savingsBreakdown} series={view.savingsBreakdown} displays={displays} labels={labelsOf(PAY.savingsBreakdown, 'stream', 'savings')} />
      <Section id="environmental" heading={PAY.environmental}>
        <ul className="sov-print__rows">
          <ValueRow displays={displays} name={PAY.carbon} id={view.environmental.carbon} />
          <ValueRow displays={displays} name={PAY.trees} id={view.environmental.trees} />
          <ValueRow displays={displays} name={PAY.cars} id={view.environmental.cars} />
        </ul>
      </Section>
    </>
  );
}

function LifecycleBody({ response, displays }: { readonly response: LifecycleResponse; readonly displays: Displays }) {
  const view = response.view;
  if (view.state === 'none_generated') {
    return (
      <ul className="sov-print__rows">
        <li className="sov-print__row">
          <Shown displays={displays} id={view.line} />
        </li>
      </ul>
    );
  }
  return (
    <>
      <ul className="sov-print__rows" data-print-section="figures">
        <ValueRow displays={displays} name={LIFE.analysisPeriod} id={view.analysisPeriod} />
        <ValueRow displays={displays} name={LIFE.totalCost} id={view.tiles.totalCost} />
        <ValueRow displays={displays} name={LIFE.netSavings} id={view.tiles.netSavings} />
        <ValueRow displays={displays} name={LIFE.averageLife} id={view.tiles.averageLife} />
      </ul>
      <SeriesSection id="cost-comparison" heading={LIFE.costComparison} series={view.costComparison} displays={displays} labels={labelsOf(LIFE.costComparison, 'year', 'lifecycleCost')} />
      <SeriesSection id="cost-breakdown" heading={LIFE.costBreakdown} series={view.costBreakdown} displays={displays} labels={labelsOf(LIFE.costBreakdown, 'costItem', 'lifecycleCost')} />
      <SeriesSection id="by-system" heading={LIFE.bySystem} series={view.bySystem} displays={displays} labels={labelsOf(LIFE.bySystem, 'system', 'lifecycleCost')} />
      <Section id="key-insights" heading={LIFE.keyInsights}>
        <ul className="sov-print__rows">
          <li className="sov-print__row">
            <Shown displays={displays} id={view.keyInsights} label={null} />
          </li>
        </ul>
      </Section>
      <Section id="equipment" heading={LIFE.equipment}>
        <ul className="sov-print__rows">
          <li className="sov-print__row">
            <Shown displays={displays} id={view.equipment} label={null} />
          </li>
        </ul>
      </Section>
    </>
  );
}

/** The version a print view names, or none (a project with no stored proposal, which the print route never reaches). */
function versionOf(view: PaybackResponse['view'] | LifecycleResponse['view']): { readonly generatedOn: string; readonly latest: boolean } | null {
  return view.state === 'generated' ? { generatedOn: view.generatedOn, latest: view.latest } : null;
}

export function MetricsPrintDocument({ print }: { readonly print: MetricsPrintResponse }) {
  const displays = indexDisplays(print.response.displayObjects);
  const page: MetricsExportPage = print.page;
  return (
    <main id="main" className="sov-print" data-metrics-print={page}>
      <PrintFrame demoLine={print.response.project.demoLine}>
        <Head title={page === 'payback' ? PAY.title : LIFE.title} displays={displays} projectName={print.response.project.name} version={versionOf(print.response.view)} />
        {print.page === 'payback' ? <PaybackBody response={print.response} displays={displays} /> : <LifecycleBody response={print.response} displays={displays} />}
      </PrintFrame>
    </main>
  );
}
