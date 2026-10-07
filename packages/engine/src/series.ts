/**
 * Chart series (phase 6; docs/adr/0047-calculation-engine.md, amended in phase 6; docs/adr/0052-metrics-pages-and-series.md;
 * guardrails rule 1 "A chart shows an unknown as a labelled gap", rule 9, G1-5, G9-8, G9-9).
 *
 * A series is a declared, ordered set of one formula's outputs: the parts of a total (`breakdown`: CAPEX by system, by
 * level, savings by stream) or an ordered sequence (`sequence`: a cash flow by year). Every point and the total are
 * outputs of **one formula**, so one engine run of one formula version, stored in one snapshot, gives them all (G9-8:
 * "Parts and total come from the same snapshot id"; G9-9: "drawn from the engine series of the same snapshot and
 * formula version as the figures beside it"). A point is a snapshot row like any other output: a candidate the
 * engine produced, or what it was missing; the view-model draws a missing point as a labelled gap, never a zero
 * (G1-5). The engine stores nothing new for a series: its rows are the snapshot's output rows.
 *
 * **No production series is declared.** No production formula outputs lines by system, by level, by stream or by
 * year: each would be a new signature version of a method only SOVITECH can define from datasets no one has approved
 * (prompt 3 phase 5: "Write no production formula for a method no source defines"; the build log's P-6-SERIES-SIGNATURES,
 * with P-5-SIGNATURES-V2). So every Metrics chart reads "Not available yet", naming what its total waits for and the
 * series' method (G1-31). TEST series (`test-formulas/`, inside the test runner only) prove the mechanism.
 *
 * Built in phase 6 (the engine builder): `checkSeries` (the problems below), `runEngine` refusing a catalogue with one
 * (./run.ts `assertCatalogue`), and `seriesRowsOf` (one snapshot's rows of one formula version, gaps kept).
 */
import { EngineInputError } from './errors';
import { OUTPUT_STAGES, type FormulaCatalogue } from './catalogue';
import type { SnapshotOutputRow } from './snapshot';

/**
 * A series id: value-id safe dotted segments, each starting with a letter. The same pattern as the contract's
 * SERIES_KEY_PATTERN (packages/view-model/src/browser/contract/metrics.ts), which the engine may not import.
 */
const SERIES_ID = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)*$/u;

/** A point key: one value-id segment in lower case (the contract's `SeriesPointSchema.key`). */
const POINT_KEY = /^[a-z][a-z0-9_]*$/u;

/** A TEST id, as prompt 3 5.4 marks TEST datasets and formulas (./run.ts reads TEST ids the same way). */
const isTestId = (id: string): boolean => id.includes('TEST');

/**
 * How a point is named on the page, for the view-model to resolve (never a stored text): a system of the registry's
 * catalogue (its name), a level of the level register (the one level-label function, ADR 0045; rule 8), or a fixed
 * name a TEST declaration gives (a TEST year, "TEST year 3": a digit the view-model binds to the point's name id).
 */
export type SeriesPointName =
  | { readonly kind: 'system'; readonly systemId: string }
  | { readonly kind: 'level'; readonly levelKey: string }
  | { readonly kind: 'text'; readonly text: string };

/** One point of a declared series: its key in the series (value-id safe), the formula output it shows, its name. */
export interface SeriesPointDeclaration {
  readonly key: string;
  readonly output: string;
  readonly name: SeriesPointName;
}

/**
 * A declared series:
 * - `id`: value-id safe dotted segments (the contract's SERIES_KEY_PATTERN); a TEST series carries "TEST"
 *   (`capex.TEST_bySystem`);
 * - `kind`: `breakdown` (it has a `total`) or `sequence` (it has none);
 * - `formula`: the id of the one formula whose outputs are every point and the total;
 * - `total`: the output that is the breakdown's total, or null for a sequence;
 * - `points`: in display order.
 */
export interface SeriesDeclaration {
  readonly id: string;
  readonly kind: 'breakdown' | 'sequence';
  readonly formula: string;
  readonly total: string | null;
  readonly points: readonly SeriesPointDeclaration[];
}

/** Why a catalogue's series declaration is refused (the catalogue is then refused: no chart is drawn from it). */
export type SeriesProblemCode =
  | 'series_id_invalid'
  | 'series_id_repeated'
  | 'formula_not_in_catalogue'
  | 'output_not_of_formula'
  | 'point_key_invalid'
  | 'point_key_repeated'
  | 'output_repeated'
  | 'breakdown_without_total'
  | 'sequence_with_total'
  | 'no_points'
  | 'test_series_in_production'
  | 'production_series_in_test'
  | 'investment_part_without_stage';

export interface SeriesProblem {
  readonly series: string;
  readonly code: SeriesProblemCode;
  readonly message: string;
}

/** The series a catalogue declares (none in production). */
export function seriesOf(catalogue: FormulaCatalogue): readonly SeriesDeclaration[] {
  return catalogue.series ?? [];
}

/**
 * Checks every series a catalogue declares (the engine builder's): each id value-id safe and unique; its formula in the
 * catalogue; its total and every point an output of that formula's signature, each once; point keys value-id safe and
 * unique; a breakdown with a total, a sequence without; at least one point; a TEST series (id or formula carrying
 * "TEST") only in a `test` catalogue, and no production series in one; and a breakdown whose total is an investment
 * output that carries a rule 10 stage (`OUTPUT_STAGES`) has only parts that carry one too, so no part of an investment
 * is ever drawn without its stage (rule 10, "Investment figures move through three stages, and each has a fixed
 * name"; phase 6 part B, A-3: the parts then reach the page through the one Price, as the total does). `runEngine`
 * refuses a catalogue with a problem, as it refuses a benchmark paired with a signature not declared estimated (G9-4).
 */
export function checkSeries(catalogue: FormulaCatalogue): readonly SeriesProblem[] {
  const problems: SeriesProblem[] = [];
  const seen = new Set<string>();
  for (const declaration of seriesOf(catalogue)) {
    const series = declaration.id;
    const problem = (code: SeriesProblemCode, message: string): void => {
      problems.push({ series, code, message: `${series}: ${message}` });
    };
    if (!SERIES_ID.test(series)) problem('series_id_invalid', 'a series id is value-id safe dotted segments, each starting with a letter');
    if (seen.has(series)) problem('series_id_repeated', 'one catalogue declares the series twice');
    seen.add(series);
    // Prompt 3 5.4; G1-16: a TEST series never draws on a production page, and no production series is drawn from a TEST run.
    const test = isTestId(series) || isTestId(declaration.formula);
    if (catalogue.kind === 'production' && test) problem('test_series_in_production', 'the production catalogue declares a TEST series or a series of a TEST formula');
    if (catalogue.kind === 'test' && !isTestId(series)) problem('production_series_in_test', 'a TEST catalogue declares only TEST series (an id carrying TEST)');
    if (declaration.kind === 'breakdown' && declaration.total === null) problem('breakdown_without_total', 'a breakdown names the output that is its total (G9-8)');
    if (declaration.kind === 'sequence' && declaration.total !== null) problem('sequence_with_total', 'a sequence has no total');
    if (declaration.points.length === 0) problem('no_points', 'a series has at least one point');
    const formula = catalogue.formulas.find((entry) => entry.signature.id === declaration.formula);
    if (formula === undefined) problem('formula_not_in_catalogue', `no formula ${declaration.formula} in the catalogue`);
    const outputs = new Set<string>();
    const drawn = (output: string, what: string): void => {
      if (formula !== undefined && !formula.signature.outputs.includes(output)) problem('output_not_of_formula', `${what} ${output} is no output of ${declaration.formula} (one formula gives every point and the total: G9-9)`);
      if (outputs.has(output)) problem('output_repeated', `${output} is drawn twice`);
      outputs.add(output);
    };
    if (declaration.total !== null) drawn(declaration.total, 'the total');
    const keys = new Set<string>();
    const stagedTotal = declaration.total !== null && Object.hasOwn(OUTPUT_STAGES, declaration.total);
    for (const point of declaration.points) {
      if (!POINT_KEY.test(point.key)) problem('point_key_invalid', `the point key ${point.key} is no value-id segment in lower case`);
      if (keys.has(point.key)) problem('point_key_repeated', `the point key ${point.key} is used twice`);
      keys.add(point.key);
      drawn(point.output, `the point ${point.key}'s output`);
      if (stagedTotal && !Object.hasOwn(OUTPUT_STAGES, point.output)) {
        problem('investment_part_without_stage', `the point ${point.key}'s output ${point.output} is a part of the investment ${String(declaration.total)} and carries no stage (rule 10)`);
      }
    }
  }
  return problems;
}

/** A declared series read from one snapshot's rows: the total's row and each point's row, in order. */
export interface SeriesRows {
  readonly declaration: SeriesDeclaration;
  /** The one formula ref (`<id>@<version>`) every row was produced by (G9-9). */
  readonly formula: string;
  readonly total: SnapshotOutputRow | null;
  readonly points: readonly { readonly point: SeriesPointDeclaration; readonly row: SnapshotOutputRow }[];
}

/**
 * The rows of a declared series in **one snapshot** (the engine builder's): the caller passes one snapshot's output
 * rows; each point's and the total's row is found by its output id; every row must carry the same formula ref (one
 * formula version: G9-9), else `EngineInputError`. Answers null when the snapshot holds no row for the series'
 * formula (it was generated with a catalogue that did not declare it), and when it holds only part of the series'
 * rows (it was generated by an earlier version of the formula that did not output them all: a next signature version
 * adds lines beside a total every earlier version stored, the build log's P-6-SERIES-SIGNATURES; phase 6 part B, A-2):
 * the series did not run there, and the view-model names it as not available, never refusing the page. A row with no
 * candidate stays in the answer: it is a labelled gap (G1-5), never dropped.
 */
export function seriesRowsOf(declaration: SeriesDeclaration, rows: readonly SnapshotOutputRow[]): SeriesRows | null {
  const byOutput = new Map<string, SnapshotOutputRow>();
  for (const row of rows) {
    if (byOutput.has(row.output)) throw new EngineInputError(`a snapshot holds two rows for ${row.output}`);
    byOutput.set(row.output, row);
  }
  const wanted = [...(declaration.total === null ? [] : [declaration.total]), ...declaration.points.map((point) => point.output)];
  // No row, or only part of them: the series' formula (this version of it) did not run in that snapshot (A-2).
  if (!wanted.every((output) => byOutput.has(output))) return null;
  const rowOf = (output: string): SnapshotOutputRow => {
    const row = byOutput.get(output);
    if (row === undefined) throw new EngineInputError(`no row for ${output}`);
    return row;
  };
  const refs = new Set(wanted.map((output) => rowOf(output).formula));
  const [formula] = [...refs];
  if (refs.size !== 1 || formula === undefined) {
    throw new EngineInputError(`the series ${declaration.id} reads rows of ${[...refs].sort().join(' and ')}: a series comes from one formula version (G9-9)`);
  }
  if (formula.slice(0, formula.lastIndexOf('@')) !== declaration.formula) {
    throw new EngineInputError(`the series ${declaration.id} is declared on ${declaration.formula}, and its rows come from ${formula}`);
  }
  return {
    declaration,
    formula,
    total: declaration.total === null ? null : rowOf(declaration.total),
    points: declaration.points.map((point) => ({ point, row: rowOf(point.output) })),
  };
}
