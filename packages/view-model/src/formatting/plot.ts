/**
 * Where a chart draws its points (phase 6; docs/adr/0052-metrics-pages-and-series.md decision 4; the contract's
 * `SeriesPoint.plot` and `Series.zero`): positions along one value axis, in thousandths of the plot (integers 0 to
 * 1000), computed here, in the formatting module that owns display rounding (rule 9), from **the numbers the points'
 * labels show** (`estimateAsShown`, `calculatedAsShown`: the central value to rule 9's significant figures, the bounds
 * rounded outward, from the very candidates the displays are formatted from), so a mark and its label always agree and
 * no labelled bound falls off the axis (G9-9: "every labelled point equals its plotted value"; phase 6 part B, A-5).
 *
 * Layout only: a position is never shown as text (no numeric tick: prompt 3 section 7; the chart's table view carries
 * the bound values), and it is not an engineering value (it states nothing about the building; it places a mark).
 * The axis is generated from the series itself (R-103 AC3: "its axes are generated from the bound series"): it runs
 * from the lowest to the highest bound of the plotted points, and includes zero when they span it or when they are all
 * of one sign and the series is a breakdown (a bar starts at zero). Ranges are drawn as they are, never narrowed: a
 * low bound rounds down and a high bound rounds up to the next thousandth (rule 9, "Ranges round outward"). A gap (a
 * point with no value) has no position (rule 1: "A chart shows an unknown as a labelled gap"; G1-5).
 *
 * Built in phase 6 (the view-model builder): decimal.js arithmetic only (rule 9, "Arithmetic lives in code"); a value is
 * read as the decimal its shortest round-trip text names, as the formatting module reads every number. An axis whose
 * lowest and highest bound are equal (one exact value) has no length: every position is the axis' start.
 */
import { Decimal } from 'decimal.js';

/**
 * One point's value as its label shows it (never a typed figure): an exact value, or an estimate with its range, each the
 * formatting module's own rounding of the point's candidate (`calculatedAsShown`, `estimateAsShown`).
 */
export type PlotInput =
  | { readonly kind: 'value'; readonly value: number }
  | { readonly kind: 'estimate'; readonly value: number; readonly low: number; readonly high: number }
  | { readonly kind: 'gap' };

/** A point's position: `low` to `high` on the value axis, and `mark` (an estimate's central value; null for an exact value). */
export interface PlotPosition {
  readonly low: number;
  readonly high: number;
  readonly mark: number | null;
}

/** The positions of a series' points (null for a gap), and where zero sits when the axis spans it (else null). */
export interface PlotPositions {
  readonly points: readonly (PlotPosition | null)[];
  readonly zero: number | null;
}

/**
 * The positions of a series' points on one generated axis (see the header). `kind` decides whether the axis starts
 * at zero for values of one sign (`breakdown`) or spans only the values (`sequence`, with zero inside when they cross
 * it). Refuses an estimate whose shown range has no width or whose shown value lies outside it (the stored estimate's
 * own low < value < high is refused earlier, by `estimateAsShown`; rounded, the value may sit on a bound), a value that
 * is not a finite number, and a series of gaps only (no axis can be generated: the series is then not available, and the
 * caller names what is missing).
 */
export function plotPositions(kind: 'breakdown' | 'sequence', inputs: readonly PlotInput[]): PlotPositions {
  const read: readonly Read[] = inputs.map((input): Read => {
    if (input.kind === 'gap') return { kind: 'gap' };
    if (input.kind === 'value') {
      const value = exact(input.value, 'a plotted value');
      return { kind: 'figure', low: value, high: value, mark: null };
    }
    const value = exact(input.value, 'a plotted estimate');
    const low = exact(input.low, 'a plotted low bound');
    const high = exact(input.high, 'a plotted high bound');
    if (!(low.lessThan(high) && low.lessThanOrEqualTo(value) && value.lessThanOrEqualTo(high))) {
      throw new RangeError('plot: an estimate as shown needs low < high and its value within them (rule 9, "Ranges come from the method")');
    }
    return { kind: 'figure', low, high, mark: value };
  });
  // The axis is generated from the drawn figures' own bounds (R-103 AC3); a gap is no figure and draws only its label
  // (rule 1; G1-5): it stays in the series with no position, it is never read as a bound or as zero.
  const figures = read.filter((entry): entry is Figure => entry.kind === 'figure');
  if (figures.length === 0) throw new RangeError('plot: a series of gaps only has no axis; the series is not available, and its line names what is missing');
  const zero = new Plot(0);
  const bounds = [...figures.map((entry) => entry.low), ...figures.map((entry) => entry.high), ...(kind === 'breakdown' ? [zero] : [])];
  // A breakdown's bars start at zero (its parts are amounts of one sign); a sequence spans its own values.
  const lowest = Plot.min(...bounds);
  const highest = Plot.max(...bounds);
  const span = highest.minus(lowest);
  const at = (value: Plot, rounding: Decimal.Rounding): number =>
    span.isZero() ? 0 : value.minus(lowest).dividedBy(span).times(THOUSAND).toDecimalPlaces(0, rounding).toNumber();
  return {
    points: read.map((entry) => {
      if (entry.kind === 'gap') return null;
      if (entry.mark === null) {
        const position = at(entry.low, Decimal.ROUND_HALF_UP);
        return { low: position, high: position, mark: null };
      }
      // Rule 9, "Ranges round outward": the low bound rounds down and the high bound up, so a range is never narrowed.
      const low = at(entry.low, Decimal.ROUND_FLOOR);
      const high = at(entry.high, Decimal.ROUND_CEIL);
      return { low, high, mark: Math.min(high, Math.max(low, at(entry.mark, Decimal.ROUND_HALF_UP))) };
    }),
    zero: !span.isZero() && lowest.lessThanOrEqualTo(zero) && highest.greaterThanOrEqualTo(zero) ? at(zero, Decimal.ROUND_HALF_UP) : null,
  };
}

/** A drawn figure's bounds and mark (an exact value's mark is null), or a gap. */
interface Figure {
  readonly kind: 'figure';
  readonly low: Plot;
  readonly high: Plot;
  readonly mark: Plot | null;
}
type Read = Figure | { readonly kind: 'gap' };

/** Enough precision that no step here rounds before the last one (doubles hold at most 17 significant digits). */
const Plot = Decimal.clone({ precision: 60, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -60, toExpPos: 60 });
type Plot = InstanceType<typeof Plot>;

const THOUSAND = new Plot(1000);

/** A number as the exact decimal its shortest round-trip text names. Throws on NaN and infinities, which are no value (rule 1). */
function exact(value: number, what: string): Plot {
  if (!Number.isFinite(value)) throw new RangeError(`plot: ${what} is not a finite number`);
  return new Plot(value);
}
