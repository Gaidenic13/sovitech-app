/**
 * One chart series as display objects (phase 6; the contract's `SeriesSchema`; the engine's ./series.ts in
 * `@sovitech/engine`; docs/adr/0052-metrics-pages-and-series.md decisions 3 and 4).
 *
 * For a series a page asks for (its key, its kind, the output that is its total), from the stored version the page
 * shows:
 * - **declared and run** (the catalogue the snapshot was generated with declares it, and the engine's `seriesRowsOf`
 *   finds its rows in the snapshot, all of one formula version): `state: 'figures'`, `source` (the snapshot id and the
 *   formula version: G9-8, G9-9); each point's value is its output's own display, built exactly as the stored proposal
 *   builds an output's (`proposal:<sid>.outputs.<output>`: a range with its Estimated badge, basis, method and
 *   provisional lines, "Out of date, recalculating" when its inputs changed; one display per value id, G2-7); a point
 *   with no candidate is a missing display naming what that point waited for: a labelled gap with `plot: null` (G1-5);
 *   a point whose figure is out of date shows no figure, so it is drawn as a gap too (its label and its mark agree:
 *   G9-9); each point's name a `line` display (`proposal:<sid>.series.<key>.points.<point>.name`: the system's catalogue
 *   name, or the TEST declaration's text); a system the snapshot left out of scope is no point (it is listed among the
 *   page's exclusions: G10-7), and a line the formula gave for one is refused, never hidden from the total that counts
 *   it (rule 12; phase 6 part B, A-6); `plot` and `zero` from the formatting module's `plotPositions` over the numbers
 *   each point's label shows (`figureAsShown`: G9-9; A-5); the total (a breakdown's) as the stored proposal's own
 *   price, for an investment output, or its own value display, the same value id as anywhere else (G2-7), and the parts
 *   of a priced total each as the one Price with its own stage (rule 10; A-3: the engine's `checkSeries` already refuses
 *   a staged total with an unstaged part); no share (US-FIN-05 AC3); the figures the page shows beside the chart
 *   (`SeriesRequest.beside`: the payback beside a cash flow) as outputs of the same formula version in the same
 *   snapshot, or the series is refused (G9-9; phase 6 part B, V-2 and A-4); a series whose every point is a gap only
 *   because its inputs changed after generation keeps its points, each reading "Out of date, recalculating", with no
 *   axis (2.4; G9-10; A-1);
 * - **not declared, or not run** (no catalogue series, or no row of it in the snapshot, or only part of its rows (an
 *   earlier formula version: A-2), or a series of gaps only):
 *   `state: 'not_available_yet'` and one line, `proposal:<sid>.series.<key>.notAvailable`: "Not available yet: <what the
 *   total waits for, as the stored proposal names it>; SOVITECH's method for <what the series measures>" (rule 7;
 *   G1-31), with the owner's Add actions where the total's missing items are owner inputs; no point, total or zero. A
 *   series with no engine total names what its figure waits for (`SeriesRequest.waitsFor`, ./copy.ts METRICS_MISSING).
 *   A declared series that ran with gaps only names what its points and its total waited for. A series is named by its
 *   label (`SeriesRequest.label`, else ./copy.ts SERIES_LABELS), never by its internal key (V-6).
 *
 * A catalogue whose series are faulted (the engine's `checkSeries`) is refused, as the engine refuses to run it.
 */
import { OUTPUT_STAGES, checkSeries, seriesOf, seriesRowsOf, type SeriesDeclaration, type SeriesPointName, type SnapshotOutputRow } from '@sovitech/engine';
import { SYSTEMS } from '@sovitech/registry';
import type { Action, DisplayObject, Line, Series, SeriesPoint, ValueId } from '../browser/contract';
import { DEFAULT_FORMAT_OPTIONS, plotPositions, type PlotInput, type PlotPositions } from '../formatting';
import { METHOD_MISSING } from '../proposal/copy';
import type { ProposalBuildInput } from '../proposal/inputs';
import { Displays, figureAsShown, outputMissingOf, proposalValueId, snapshotOutput, usedExclusionsOf } from '../proposal/view';
import { resolveLine } from '../resolver';
import { SERIES_LABELS } from './copy';
import { MetricsNotBuilt } from './inputs';

const FORMAT = DEFAULT_FORMAT_OPTIONS;

/**
 * What a page asks for:
 * - `key`: the series' key (the contract's SERIES_KEY_PATTERN);
 * - `kind`;
 * - `totalOutput`: the output that is its total (a breakdown's), or null; a declared series must total exactly this
 *   (G9-8: a breakdown drawn beside another total, or a total the page does not show, is refused: A-4);
 * - `waitsFor`: for a series whose figure is no engine output of the stored version, what that figure waits for
 *   (./copy.ts METRICS_MISSING: the payback's items for a cash flow, the savings' for a savings breakdown);
 * - `label`: what the series measures, for "SOVITECH's method for <label>" (else ./copy.ts SERIES_LABELS by key; a
 *   series with neither is refused, never named by its key: V-6);
 * - `beside` (G9-9; phase 6 part B, V-2 and A-4): the figures the page shows beside the chart other than its total, each
 *   an output of the series' own formula, by the page's name for it (`{ payback: … }` beside a cash flow); `{}` when the
 *   page shows nothing beside the chart but its total; `null` while the page shows beside it figures no formula of the
 *   series gives (the stored proposal's indicators, the Metrics pages' own "Not available yet" lines): a series of that
 *   key whose rows the stored version holds is then refused, never drawn beside a figure of another formula or of none
 *   (no production formula declares one: P-6-SERIES-SIGNATURES names the outputs a page shows beside each).
 */
export interface SeriesRequest {
  readonly key: string;
  readonly kind: 'breakdown' | 'sequence';
  readonly totalOutput: string | null;
  readonly waitsFor?: string;
  readonly label?: string;
  readonly beside: Readonly<Record<string, string>> | null;
}

/**
 * A built series, the displays it names (the caller adds them to its response's one set: G2-7), and, while it has
 * figures, the value ids of the outputs the page shows beside it (`SeriesRequest.beside`, by the page's names), each of
 * the same formula version in the same snapshot (G9-9); empty while it has none.
 */
export interface BuiltSeries {
  readonly series: Series;
  readonly displayObjects: readonly DisplayObject[];
  readonly beside: Readonly<Record<string, ValueId>>;
}

/** What a series measures, for its "Not available yet" line: the request's label, else the copy's; never its key (V-6). */
function labelOf(request: SeriesRequest): string {
  const label = request.label ?? SERIES_LABELS[request.key];
  if (label === undefined) throw new MetricsNotBuilt(`the series ${request.key} names no label: a line never names a series by its internal key (rule 7; V-6)`);
  return label;
}

/** The snapshot's rows as the engine reads them (`<id>@<version>`). */
function engineRowsOf(input: ProposalBuildInput): SnapshotOutputRow[] {
  return input.snapshot.outputs.map((row) => ({
    output: row.output,
    formula: `${row.formulaId}@${row.formulaVersion}`,
    candidateId: row.candidateId,
    missing: row.missing,
    incomplete: row.incomplete,
  }));
}

/** The words a point is named by (never a stored text): a system's catalogue name, or a TEST declaration's text. */
function pointNameOf(name: SeriesPointName): string {
  switch (name.kind) {
    case 'system': {
      const system = SYSTEMS.find((entry) => entry.id === name.systemId);
      if (system === undefined) throw new MetricsNotBuilt(`no system ${name.systemId} in the catalogue`);
      return system.name;
    }
    case 'level':
      // A level is named by the one level-label function over the level register (ADR 0045; rule 8); no catalogue
      // declares a series by level yet (the build log's P-6-SERIES-SIGNATURES), so none is named here.
      throw new MetricsNotBuilt('a point named by a level waits for a series by level and its level register (P-6-SERIES-SIGNATURES)');
    case 'text':
      return name.text;
  }
}

/** A point's name as a bound `line` display (a name holding a digit, "TEST year 3", keeps it bound: rule 2). */
function nameDisplay(valueId: ValueId, text: string): DisplayObject {
  return { valueId, kind: 'line', text, shape: 'value', ...(/\d/u.test(text) ? { parts: [text] } : {}) };
}

/**
 * Where a point is drawn from: the numbers its label shows (the formatting module's rounding of its candidate: G9-9,
 * A-5), or a gap (no candidate, or a figure not shown).
 */
function plotInputOf(input: ProposalBuildInput, row: ProposalBuildInput['snapshot']['outputs'][number]): PlotInput {
  // 2.4: a figure whose inputs changed shows "Out of date, recalculating" and no figure, so its mark is not drawn either.
  if (row.candidateId === null || input.changes.outOfDateOutputs.has(row.output)) return { kind: 'gap' };
  const candidate = input.snapshotCandidates.get(row.candidateId);
  if (candidate?.quantity === undefined) throw new MetricsNotBuilt(`the point ${row.output} holds no quantity to draw`);
  return figureAsShown(input, candidate);
}

/** "Not available yet: <names>" as the series' one line, with the owner's Add actions and lines (rule 7; G1-31). */
function notAvailableSeries(
  sid: string,
  request: SeriesRequest,
  missing: { readonly names: readonly string[]; readonly actions: readonly Action[]; readonly lines: readonly Line[] },
): BuiltSeries {
  const names = [...new Set(missing.names)];
  if (names.length === 0) throw new MetricsNotBuilt(`the series ${request.key} is not available and names nothing missing (rule 7)`);
  const valueId = proposalValueId(sid, `series.${request.key}.notAvailable`);
  const display: DisplayObject = {
    ...resolveLine(valueId, 'not_available_yet_named', { missing: names.join('; ') }, FORMAT, { missing: 'not_available_yet', lines: missing.lines, actions: missing.actions }),
    measure: { label: labelOf(request) },
  };
  const series: Series = { series: request.key, kind: request.kind, state: 'not_available_yet', source: null, notAvailable: valueId, total: null, points: [], zero: null };
  return { series, displayObjects: [display], beside: {} };
}

/** What the series' figure waits for at generation: its total's missing items, else the figure's words (`waitsFor`). */
function figureMissing(input: ProposalBuildInput, request: SeriesRequest): { readonly names: readonly string[]; readonly actions: readonly Action[]; readonly lines: readonly Line[] } {
  if (request.totalOutput !== null && input.snapshot.outputs.some((row) => row.output === request.totalOutput)) return outputMissingOf(input, request.totalOutput);
  if (request.waitsFor === undefined) throw new MetricsNotBuilt(`the series ${request.key} names neither a total of the stored version nor what its figure waits for`);
  return { names: [request.waitsFor], actions: [], lines: [] };
}

/** One series of the stored version `input` reads (see the header), with the displays it names. */
export function seriesView(input: ProposalBuildInput, request: SeriesRequest): BuiltSeries {
  const sid = input.snapshot.id;
  const label = labelOf(request);
  const problems = checkSeries(input.catalogue);
  if (problems.length > 0) throw new MetricsNotBuilt(`the catalogue declares series wrongly: ${problems.map((problem) => problem.code).join(', ')}`);
  const declaration: SeriesDeclaration | undefined = seriesOf(input.catalogue).find((entry) => entry.id === request.key);
  if (declaration !== undefined && declaration.kind !== request.kind) throw new MetricsNotBuilt(`the series ${request.key} is a ${declaration.kind}, not a ${request.kind}`);
  if (declaration !== undefined && declaration.total !== request.totalOutput) {
    // G9-8: a breakdown and the total the page shows beside it come from one snapshot and one formula; a page that shows
    // no engine total beside a breakdown (`totalOutput` null) never draws one that has its own (A-4: two totals on a page).
    throw new MetricsNotBuilt(`the series ${request.key} totals ${String(declaration.total)}, not ${String(request.totalOutput)} (G9-8: a breakdown and its total come from one snapshot and one formula)`);
  }
  const engineRows = engineRowsOf(input);
  const rows = declaration === undefined ? null : seriesRowsOf(declaration, engineRows);
  // G9-9: the figures beside the chart are rows of the same formula version in the same snapshot; a version that holds
  // none of them did not run that formula version (A-2's reading), and one of another formula is refused.
  const besideRows = rows === null || request.beside === null ? [] : Object.entries(request.beside).map(([name, output]) => ({ name, output, row: engineRows.find((row) => row.output === output) }));
  for (const entry of besideRows) {
    if (rows !== null && entry.row !== undefined && entry.row.formula !== rows.formula) {
      throw new MetricsNotBuilt(`G9-9: the page shows ${entry.output} beside the series ${request.key}, and it is no output of ${rows.formula}`);
    }
  }
  if (declaration === undefined || rows === null || besideRows.some((entry) => entry.row === undefined)) {
    // G1-31: no formula of the catalogue the version was generated with gave this series: what its figure waits for, then its method.
    // The owner's Add actions stay; 2.8's "Add the <field> to see this." does not, since the method is missing too.
    const missing = figureMissing(input, request);
    return notAvailableSeries(sid, request, { names: [...missing.names, METHOD_MISSING(label)], actions: missing.actions, lines: [] });
  }
  if (request.beside === null) {
    // V-2, A-4: the page shows beside this chart figures that no output of its formula gives (the stored proposal's
    // indicators, the Metrics pages' own lines): a chart drawn beside them would contradict them. Refused, as the engine
    // refuses other inconsistencies, until the page names the formula's outputs it shows beside the chart.
    throw new MetricsNotBuilt(`G9-9: the series ${request.key} has rows of ${rows.formula}, and its page names no output of that formula for the figures beside it`);
  }

  const displays = new Displays();
  const excluded = usedExclusionsOf(input);
  const stored = new Map(input.snapshot.outputs.map((row) => [row.output, row]));
  const drawn = rows.points
    // G10-7: a system the version left out of scope contributes no line; the page lists it among the exclusions. A line
    // the formula gave for it all the same is refused, never hidden while the total still counts it (rule 12; A-6).
    .filter(({ point, row }) => {
      if (point.name.kind !== 'system' || !excluded.has(point.name.systemId)) return true;
      if (row.candidateId !== null) throw new MetricsNotBuilt(`G10-7: ${request.key} holds a line for ${point.name.systemId}, which the version left out of scope; refused, never hidden from its total`);
      return false;
    })
    .map(({ point }) => {
      const row = stored.get(point.output);
      if (row === undefined) throw new MetricsNotBuilt(`no stored row for ${point.output}`);
      const value = snapshotOutput(input, point.output);
      for (const display of value.displayObjects) displays.add(display);
      const name = displays.add(nameDisplay(proposalValueId(sid, `series.${request.key}.points.${point.key}.name`), pointNameOf(point.name)));
      return { key: point.key, name, value: value.output.display, price: value.output.price, plot: plotInputOf(input, row), output: point.output, outOfDate: input.changes.outOfDateOutputs.has(point.output) };
    });

  // 2.4 (A-1): staleness is per formula, so after a change to an input the formula reads every point goes out of date at
  // once. Such a series keeps its points, each a labelled gap reading "Out of date, recalculating", with no axis.
  const stale = drawn.some((entry) => entry.outOfDate) || (declaration.total !== null && input.changes.outOfDateOutputs.has(declaration.total));
  if (drawn.every((entry) => entry.plot.kind === 'gap') && !stale) {
    // A series of gaps only has no axis: one line naming what its points and its total waited for (rule 7).
    const parts = [...drawn.map((entry) => outputMissingOf(input, entry.output)), ...(declaration.total === null ? [] : [outputMissingOf(input, declaration.total)])].filter((part) => part.names.length > 0);
    // 2.8's "Add the <field> to see this." only where every item named is an owner input.
    const ownerInputsOnly = parts.every((part) => part.lines.length > 0);
    return notAvailableSeries(sid, request, {
      names: parts.flatMap((part) => part.names),
      actions: dedupeActions(parts.flatMap((part) => part.actions)),
      lines: ownerInputsOnly ? dedupeLines(parts.flatMap((part) => part.lines)) : [],
    });
  }

  const positions: PlotPositions = drawn.every((entry) => entry.plot.kind === 'gap')
    ? { points: drawn.map(() => null), zero: null }
    : plotPositions(request.kind, drawn.map((entry) => entry.plot));
  let total: Series['total'] = null;
  if (declaration.total !== null) {
    const built = snapshotOutput(input, declaration.total);
    for (const display of built.displayObjects) displays.add(display);
    // An investment output carries its stage from stored records through the one Price (rule 10; G2-7); any other total is a value.
    total =
      Object.hasOwn(OUTPUT_STAGES, declaration.total) && built.output.price !== null
        ? { kind: 'price', output: declaration.total, price: built.output.price }
        : { kind: 'value', output: declaration.total, display: built.output.display };
  }
  // A-3 (rule 10): the parts of a priced total are prices, each with the stage stored records give it (the engine's
  // checkSeries refuses a staged total with an unstaged part; this keeps the page from ever drawing one).
  if (total?.kind === 'price' && drawn.some((entry) => entry.price === null)) throw new MetricsNotBuilt(`the parts of ${request.key} are investment figures with no stage (rule 10)`);
  const points: SeriesPoint[] = drawn.map((entry, index) => ({ key: entry.key, name: entry.name, value: entry.value, price: entry.price, plot: positions.points[index] ?? null }));
  const beside: Record<string, ValueId> = {};
  for (const entry of besideRows) {
    const built = snapshotOutput(input, entry.output);
    for (const display of built.displayObjects) displays.add(display);
    beside[entry.name] = built.output.display;
  }
  const at = rows.formula.lastIndexOf('@');
  const series: Series = {
    series: request.key,
    kind: request.kind,
    state: 'figures',
    source: { snapshotId: sid, formula: { id: rows.formula.slice(0, at), version: rows.formula.slice(at + 1) } },
    notAvailable: null,
    total,
    points,
    zero: positions.zero,
  };
  return { series, displayObjects: displays.list(), beside };
}

/** Actions named once each (the same Add from two points' lines is one action). */
function dedupeActions(actions: readonly Action[]): Action[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = JSON.stringify(action);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Lines named once each. */
function dedupeLines(lines: readonly Line[]): Line[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = `${line.kind}:${line.id}:${line.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * An engine output of a stored version, under its own value id, with the display the stored proposal's builder gives
 * it (G2-7): the figure beside a chart (a payback beside its cash flow: G9-9), as a page shows it.
 */
export function snapshotOutputView(input: ProposalBuildInput, output: string): { readonly valueId: ValueId; readonly displayObjects: readonly DisplayObject[] } {
  const built = snapshotOutput(input, output);
  return { valueId: built.output.display, displayObjects: built.displayObjects };
}
