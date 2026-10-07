import { ChartBar, Table2 } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import type { Action, DisplayObject, Price as PriceRecord, Series, SeriesPoint } from '@sovitech/view-model/browser';
import { Button } from './Button';
import { NotAvailableYet } from './NotAvailableYet';
import { Price } from './Price';
import { StatusLine } from './StatusLine';
import { Value } from './Value';

type AddAction = Extract<Action, { kind: 'add' }>;

/** The chart's fixed words, from the app's catalogue (no number: the render test reads them). */
export interface SeriesChartLabels {
  /** What the chart shows (its panel's heading): the chart's and the table view's accessible name. */
  readonly name: string;
  /** The table view's column of the points' names ("System", "Year"). */
  readonly pointColumn: string;
  /** The table view's column of the points' values ("Investment"). */
  readonly valueColumn: string;
  /** A breakdown's total ("Total"). */
  readonly total: string;
  /** The view switch ("Show as a table", "Show as a chart"). */
  readonly showTable: string;
  readonly showChart: string;
}

export interface SeriesChartProps {
  /** The series as served (the contract's `Series`): its points, gaps, positions and total, or its one line. */
  readonly series: Series;
  /** The response's display objects by value id: every name, value, total and line the series names is among them. */
  readonly displays: ReadonlyMap<string, DisplayObject>;
  readonly labels: SeriesChartLabels;
  /** The owner's Add actions on a "Not available yet" line or total (each opens its inline ask: R-012). Without it, none shows. */
  readonly onAdd?: (action: AddAction) => void;
  /** The element that names the chart on the page (its panel's heading): each Add's description (DR-1). */
  readonly describedBy?: string;
  /** The view shown first: the chart (default) or its table view (the kit's harness page shows both). */
  readonly initialView?: 'chart' | 'table';
  /**
   * The view switch drawn by the caller in its panel's header (`SeriesViewSwitch`), with the view it controls: then
   * the chart draws no switch of its own and shows `control.view`. Without it, the chart draws its switch above itself.
   */
  readonly control?: { readonly view: SeriesView; readonly bodyId: string };
}

export type SeriesView = 'chart' | 'table';

export interface SeriesViewSwitchProps {
  readonly view: SeriesView;
  readonly onChange: (view: SeriesView) => void;
  readonly labels: Pick<SeriesChartLabels, 'showTable' | 'showChart'>;
  /** The id of the chart's body it switches (`aria-controls`). */
  readonly controls: string;
}

/**
 * The chart's view switch (prompt 3 section 11: "charts have a table view"): a real button whose words say what it
 * shows next ("Show as a table", "Show as a chart"); it keeps its place and its focus when pressed. A caller draws it
 * in its panel's header and passes the view to the chart (`control`); the chart draws its own otherwise.
 */
export function SeriesViewSwitch({ view, onChange, labels, controls }: SeriesViewSwitchProps) {
  const showTable = view === 'table';
  return (
    <Button variant="link" icon={showTable ? ChartBar : Table2} aria-controls={controls} onClick={() => onChange(showTable ? 'chart' : 'table')}>
      {showTable ? labels.showChart : labels.showTable}
    </Button>
  );
}

/** A served display, or a refusal: a series names only what it serves (rule 2; a mark with no label would be a bare figure). */
function served(displays: ReadonlyMap<string, DisplayObject>, valueId: string, what: string): DisplayObject {
  const display = displays.get(valueId);
  if (display === undefined) throw new Error(`SeriesChart: ${what} ${valueId} was not served with the series (rule 2).`);
  return display;
}

function isNotAvailable(display: DisplayObject): boolean {
  return display.missing === 'not_available_yet' || display.badge?.id === 'not_available_yet';
}

/** One served value through the kit component its display calls for: "Not available yet", a line, or a value with its badge and lines. */
function Shown({ display, onAdd, describedBy }: { readonly display: DisplayObject; readonly onAdd?: (action: AddAction) => void; readonly describedBy?: string }) {
  if (isNotAvailable(display)) return <NotAvailableYet display={display} {...(onAdd === undefined ? {} : { onAdd })} {...(describedBy === undefined ? {} : { describedBy })} />;
  if (display.kind === 'line') return <StatusLine display={display} />;
  return <Value display={display} label={null} />;
}

/** A point's name: a `line` display, bound (a TEST year holds a digit; a level's label may). */
function PointName({ display }: { readonly display: DisplayObject }) {
  if (display.kind === 'line') return <StatusLine display={display} as="span" />;
  return <Value display={display} label={null} />;
}

/**
 * A figure through the one Price component, refusing a stage 3 label whose stored record the price and its figure do
 * not both name (rule 10, "Stage 3 is derived, not passed"; G10-9), as the page's own price does.
 */
function PricedFigure({ price, figure, what, onAdd, describedBy }: { readonly price: PriceRecord; readonly figure: DisplayObject; readonly what: string; readonly onAdd?: (action: AddAction) => void; readonly describedBy?: string }) {
  if (price.stageId === 'formal_quotation' && (price.quotationRecordId === null || price.quotationRecordId !== figure.quotationRecordId)) {
    throw new Error(`SeriesChart ${what}: the stage 3 label needs the stored record it was derived from, named on the price and on its figure (rule 10; G10-9).`);
  }
  return <Price display={figure} {...(onAdd === undefined ? {} : { onAdd })} {...(describedBy === undefined ? {} : { describedBy })} />;
}

/**
 * A point's value as served: a part of an investment that has a figure through the one Price (its stage label among its
 * figure's lines: rule 10; phase 6 part B, A-3), anything else through the component its display calls for. A gap
 * names no stage (G10-11), so it shows its own 2.8 wording.
 */
function PointValue({ point, display, onAdd, describedBy }: { readonly point: SeriesPoint; readonly display: DisplayObject; readonly onAdd?: (action: AddAction) => void; readonly describedBy?: string }) {
  if (point.price !== null && display.shape !== 'missing') {
    return <PricedFigure price={point.price} figure={display} what={`point ${point.key}`} {...(onAdd === undefined ? {} : { onAdd })} {...(describedBy === undefined ? {} : { describedBy })} />;
  }
  return <Shown display={display} {...(onAdd === undefined ? {} : { onAdd })} {...(describedBy === undefined ? {} : { describedBy })} />;
}

/** The total beside a breakdown: the page's own price through the one Price component (G2-7), or its value. */
function Total({ series, displays, onAdd, describedBy }: { readonly series: Series; readonly displays: ReadonlyMap<string, DisplayObject>; readonly onAdd?: (action: AddAction) => void; readonly describedBy?: string }) {
  const total = series.total;
  if (total === null) return null;
  if (total.kind === 'value') return <Shown display={served(displays, total.display, 'the total')} {...(onAdd === undefined ? {} : { onAdd })} {...(describedBy === undefined ? {} : { describedBy })} />;
  // G10-9 (rule 10, "Stage 3 is derived, not passed"): a stage 3 total names its stored record, the same on the price and on its figure.
  return (
    <PricedFigure
      price={total.price}
      figure={served(displays, total.price.figure, 'the total')}
      what={series.series}
      {...(onAdd === undefined ? {} : { onAdd })}
      {...(describedBy === undefined ? {} : { describedBy })}
    />
  );
}

/** A served position (thousandths of the plot) as a share of the track: layout only, never shown as text. */
function percent(thousandths: number): string {
  return `${String(thousandths / 10)}%`;
}

/**
 * The marks of one plotted point on its track (aria-hidden: the label beside it and the table view carry the value):
 * - the **mark**, bound to the point's value id, spanning the served range from `low` to `high` (an exact value's
 *   `low` equals its `high`: a hairline-wide mark), with the estimate's central value at the served `mark`;
 * - on a breakdown, the **stem** from the served zero line to the nearer end of the range (a part's bar starts at zero;
 *   the range itself is drawn as served, never narrowed: rule 9, "Ranges round outward"); with no zero served, no stem.
 */
function Marks({ point, kind, zero }: { readonly point: SeriesPoint; readonly kind: Series['kind']; readonly zero: number | null }) {
  const plot = point.plot;
  if (plot === null) return null;
  // The stem runs from the served zero only: with none served, no bar is drawn from a position the series did not give
  // (rule 1, "No numeric stand-in": a zero is never assumed, here either).
  const stem =
    kind !== 'breakdown' || zero === null ? null : plot.low >= zero ? { from: zero, to: plot.low } : plot.high <= zero ? { from: plot.high, to: zero } : null;
  const span = plot.high - plot.low;
  return (
    <>
      {stem === null || stem.to === stem.from ? null : (
        <span className="sov-series__stem" data-series-stem="" style={{ left: percent(stem.from), width: percent(stem.to - stem.from) }} />
      )}
      <span
        className="sov-series__mark"
        data-series-mark=""
        data-value-id={point.value}
        data-exact={span === 0 ? 'true' : undefined}
        style={{ left: percent(plot.low), width: percent(span) }}
      >
        {plot.mark === null || span === 0 ? null : (
          <span className="sov-series__central" data-series-central="" style={{ left: `${String(((plot.mark - plot.low) / span) * 100)}%` }} />
        )}
      </span>
    </>
  );
}

/** The owner's Add actions on a point, threaded through the rows: each described by the point's name (DR-1). */
type Adds = { readonly onAdd?: (action: AddAction) => void };

/** One row of the chart view: the point's name, its marks (or its gap) and its value as served. */
function ChartRow({ series, point, displays, onAdd }: { readonly series: Series; readonly point: SeriesPoint; readonly displays: ReadonlyMap<string, DisplayObject> } & Adds) {
  const nameId = useId();
  const name = served(displays, point.name, 'the name of point');
  const value = served(displays, point.value, 'the value of point');
  const adds = onAdd === undefined ? {} : { onAdd, describedBy: nameId };
  if (point.plot === null) {
    // G1-5 (rule 1: "A chart shows an unknown as a labelled gap"): no bar, no mark, no zero; a dashed outline holding
    // the point's own 2.8 wording, bound to its value id, with the owner's Add where it waits for an owner input (rule 7).
    return (
      <li className="sov-series__row" data-series-point={point.key} data-series-gap-point="">
        <div className="sov-series__name" id={nameId}>
          <PointName display={name} />
        </div>
        <div className="sov-series__gap" data-series-gap="">
          <Shown display={value} {...adds} />
        </div>
      </li>
    );
  }
  return (
    <li className="sov-series__row" data-series-point={point.key}>
      <div className="sov-series__name" id={nameId}>
        <PointName display={name} />
      </div>
      <div className="sov-series__track" data-series-track="" aria-hidden="true">
        {series.zero === null ? null : <span className="sov-series__zero" data-series-zero="" style={{ left: percent(series.zero) }} />}
        <Marks point={point} kind={series.kind} zero={series.zero} />
      </div>
      <div className="sov-series__value">
        <PointValue point={point} display={value} {...adds} />
      </div>
    </li>
  );
}

/** The chart view: one row per point, its name, its marks on a shared value axis, and its value as served. */
function ChartView({ series, displays, onAdd }: { readonly series: Series; readonly displays: ReadonlyMap<string, DisplayObject> } & Adds) {
  // A breakdown's bars start at the served zero line (the formatting module puts zero on a breakdown's axis); a sequence
  // draws ranges only, with the zero line where its axis crosses zero.
  return (
    <ul className="sov-series__rows" data-kind={series.kind}>
      {series.points.map((point) => (
        <ChartRow key={point.key} series={series} point={point} displays={displays} {...(onAdd === undefined ? {} : { onAdd })} />
      ))}
    </ul>
  );
}

/** One row of the table view: the point's name as its row heading, its value as served with its Adds. */
function TableRow({ point, displays, onAdd }: { readonly point: SeriesPoint; readonly displays: ReadonlyMap<string, DisplayObject> } & Adds) {
  const nameId = useId();
  return (
    <tr data-series-row={point.key}>
      <th scope="row" id={nameId}>
        <PointName display={served(displays, point.name, 'the name of point')} />
      </th>
      <td>
        <PointValue point={point} display={served(displays, point.value, 'the value of point')} {...(onAdd === undefined ? {} : { onAdd, describedBy: nameId })} />
      </td>
    </tr>
  );
}

/** The table view (prompt 3 section 11: "charts have a table view"): each point's name and value as served, and the total. */
function TableView({
  series,
  displays,
  labels,
  onAdd,
  describedBy,
}: {
  readonly series: Series;
  readonly displays: ReadonlyMap<string, DisplayObject>;
  readonly labels: SeriesChartLabels;
  readonly onAdd?: (action: AddAction) => void;
  readonly describedBy?: string;
}) {
  return (
    <table className="sov-series__table">
      <caption className="sov-visually-hidden">{labels.name}</caption>
      <thead>
        <tr>
          <th scope="col">{labels.pointColumn}</th>
          <th scope="col">{labels.valueColumn}</th>
        </tr>
      </thead>
      <tbody>
        {series.points.map((point) => (
          <TableRow key={point.key} point={point} displays={displays} {...(onAdd === undefined ? {} : { onAdd })} />
        ))}
      </tbody>
      {series.total === null ? null : (
        <tfoot>
          <tr>
            <th scope="row">{labels.total}</th>
            <td>
              <Total series={series} displays={displays} {...(onAdd === undefined ? {} : { onAdd })} {...(describedBy === undefined ? {} : { describedBy })} />
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

/**
 * One chart series (phase 6; docs/adr/0052-metrics-pages-and-series.md decisions 4 and 5; the contract's `Series`;
 * guardrails rule 1, rule 2, rule 7, rule 9; prompt 3 sections 6, 7 and 11).
 *
 * - **Not available** (`state: 'not_available_yet'`): its one served line through NotAvailableYet, naming what is
 *   missing, with the owner's Adds where served (rule 7), and nothing else: no point, bar, gap, axis, zero, total, table
 *   or view switch (G1-31). A series with no line served is refused, never an empty card.
 * - **Figures**: one row per point in the served order: its name (bound), its marks on one value axis, and its value
 *   through the kit's value components (its badge on its line, its source and status lines: 2.8), a part of a priced
 *   breakdown through the one Price with its stage label (rule 10; phase 6 part B, A-3). Each mark is an
 *   element bound to the point's value id, placed at the positions the formatting module served (`plot`: layout, in
 *   thousandths of the plot, never shown as text), so the mark and its label are the same value (G9-9). A gap (`plot`
 *   null) draws no bar and no zero: a dashed outline holding its 2.8 wording, bound, with the owner's Add where served,
 *   described by the point's name (G1-5; rule 7). The zero line where the series serves one. No tick and no axis label: no number outside a bound element (prompt 3 section 7; G2-1).
 *   A breakdown's total below its parts, through the one Price component (rule 10: the stage read from stored
 *   records; G10-9 refused here as in the page's own price).
 * - **The table view** (prompt 3 section 11): a real table of each point's name and value as served and the total,
 *   behind a switch ("Show as a table" / "Show as a chart"), a real button that keeps its place and its focus.
 *
 * Drawn with page elements only: no SVG, canvas or image, so the render test reads every mark (decision 5; no render
 * allowlist or unreadable entry). Colours are approved values only (decision 5; app-alignment "Charts"): marks in the
 * brand's mint accent, a gap's dashed outline in the brand hairline, labels in the text tokens, and the zero line, the
 * chart's only axis line, 2px in the muted text token, which keeps 3:1 on dark and on paper (WCAG 1.4.11; the track
 * draws no line at its start that could be read as zero: phase 6 part B, V-8 and A-9); no system palette or chart
 * extension colour while D-19 is open. Nothing here formats or computes a figure, and nothing animates (G2-8).
 */
export function SeriesChart({ series, displays, labels, onAdd, describedBy, initialView = 'chart', control }: SeriesChartProps) {
  const [own, setOwn] = useState<SeriesView>(initialView);
  const ownId = useId();
  const view = control?.view ?? own;
  const regionId = control?.bodyId ?? ownId;
  if (series.state === 'not_available_yet') {
    const line = series.notAvailable === null ? undefined : displays.get(series.notAvailable);
    if (line === undefined || !isNotAvailable(line)) {
      throw new Error(`SeriesChart ${series.series}: a series that is not available reads its "Not available yet" line, naming what is missing (rule 7; G1-31).`);
    }
    return (
      <div className="sov-series" data-series={series.series} data-series-state="not_available_yet">
        <NotAvailableYet display={line} {...(onAdd === undefined ? {} : { onAdd })} {...(describedBy === undefined ? {} : { describedBy })} />
      </div>
    );
  }
  // A-3 (rule 10): the parts of a priced total are prices, each with its stage; one served as no price is refused.
  if (series.total?.kind === 'price' && series.points.some((point) => point.price === null)) {
    throw new Error(`SeriesChart ${series.series}: the parts of a priced total are prices, each with its stage (rule 10).`);
  }
  const showTable = view === 'table';
  let body: ReactNode;
  if (showTable) {
    body = <TableView series={series} displays={displays} labels={labels} {...(onAdd === undefined ? {} : { onAdd })} {...(describedBy === undefined ? {} : { describedBy })} />;
  } else {
    body = (
      <div role="group" aria-label={labels.name} className="sov-series__chart">
        <ChartView series={series} displays={displays} {...(onAdd === undefined ? {} : { onAdd })} />
        {series.total === null ? null : (
          <div className="sov-series__total" data-series-total="">
            <span className="sov-series__total-label">{labels.total}</span>
            <Total series={series} displays={displays} {...(onAdd === undefined ? {} : { onAdd })} {...(describedBy === undefined ? {} : { describedBy })} />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="sov-series" data-series={series.series} data-series-state="figures" data-series-view={view}>
      {control === undefined ? (
        <div className="sov-series__switch">
          <SeriesViewSwitch view={view} onChange={setOwn} labels={labels} controls={regionId} />
        </div>
      ) : null}
      <div id={regionId}>{body}</div>
    </div>
  );
}
