/**
 * The kit's chart of one series (phase 6; docs/adr/0052-metrics-pages-and-series.md decisions 4 and 5; the contract's
 * `SeriesSchema`): the rendered halves of G1-5, G9-9 and G1-31 (the engine's halves are B1's, the series view's B2's;
 * the case files under tests/guardrails/ are the integrator's to assemble), prompt 3 section 11's table view, and
 * axe. Written before ./SeriesChart.tsx (seen failing first: the module did not exist).
 *
 * The TEST series (./test-series.ts) carry plot positions as the formatting module serves them; the chart is proven
 * to place each mark at the position it was served, never to compute one, and to show every number only inside an
 * element bound to the value id it belongs to (the render test's rule, G2-1).
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DisplayObjectSchema, SeriesSchema, type Action } from '@sovitech/view-model/browser';
import { SeriesChart } from './SeriesChart';
import {
  ACCESS_GAP,
  BREAKDOWN,
  BREAKDOWN_DISPLAYS,
  HVAC,
  INCOMPLETE_TOTAL,
  LABELS,
  LIGHTING,
  SEQUENCE,
  TEST_SNAPSHOT,
  SEQUENCE_DISPLAYS,
  UNAVAILABLE,
  UNAVAILABLE_LINE,
  WATER_GAP,
  YEAR_3,
  index,
} from './test-series';

afterEach(cleanup);

async function axeViolations(container: Element): Promise<string[]> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`);
}

/** Every text that holds a number, with no element bound to a value id around it (what the render test fails, G2-1). */
function unboundNumbers(root: Element): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    if (/\p{N}/u.test(text) && node.parentElement?.closest('[data-value-id]') === null) found.push(text);
  }
  return found;
}

/** The percentage a served thousandth places a mark at. */
const at = (thousandths: number): string => `${String(thousandths / 10)}%`;

function quietly(run: () => void): void {
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    run();
  } finally {
    quiet.mockRestore();
  }
}

test('ADR 0052 · the TEST series and their displays are what the contract lets the API serve', () => {
  for (const series of [BREAKDOWN, SEQUENCE, UNAVAILABLE]) expect(SeriesSchema.safeParse(series).success, series.series).toBe(true);
  for (const display of [...BREAKDOWN_DISPLAYS, ...SEQUENCE_DISPLAYS, UNAVAILABLE_LINE]) expect(DisplayObjectSchema.safeParse(display).success, display.valueId).toBe(true);
});

describe('G9-9 (rendered half) · R-103 AC3 · prompt 3 section 7: a chart places each mark where the series puts it, and labels it with the same value', () => {
  test('G9-9 · rule 9: each point of a sequence has one mark bound to its value id, its range drawn from the served low to the served high and its central value at the served mark; the zero line sits at the served zero; each mark is labelled by the same value id\'s display', () => {
    const { container } = render(<SeriesChart series={SEQUENCE} displays={index(SEQUENCE_DISPLAYS)} labels={LABELS} />);
    const chart = container.querySelector(`[data-series="${SEQUENCE.series}"]`) as HTMLElement;
    expect(chart.getAttribute('data-series-state')).toBe('figures');
    for (const point of SEQUENCE.points) {
      const plot = point.plot;
      if (plot === null) throw new Error('the TEST sequence has no gap');
      const row = chart.querySelector(`[data-series-point="${point.key}"]`) as HTMLElement;
      const marks = row.querySelectorAll(`[data-series-mark][data-value-id="${point.value}"]`);
      expect(marks, point.key).toHaveLength(1);
      const mark = marks[0] as HTMLElement;
      expect(mark.style.left, point.key).toBe(at(plot.low));
      expect(mark.style.width, point.key).toBe(at(plot.high - plot.low));
      // The mark element holds no text: the label beside it carries the value (no numeric tick: prompt 3 section 7).
      expect(mark.textContent).toBe('');
      const tick = mark.querySelector('[data-series-central]') as HTMLElement | null;
      if (plot.mark === null) {
        expect(tick, point.key).toBeNull();
      } else {
        expect(tick?.style.left, point.key).toBe(`${String(((plot.mark - plot.low) / (plot.high - plot.low)) * 100)}%`);
      }
      // The label: the same value id's display, as served (G9-9: "every labelled point equals its plotted value").
      const label = row.querySelector(`.sov-value[data-value-id="${point.value}"]`) as HTMLElement;
      const display = SEQUENCE_DISPLAYS.find((entry) => entry.valueId === point.value);
      expect(within(label).getByText(display?.text ?? '')).toBeTruthy();
      expect(row.querySelector(`[data-value-id="${point.name}"]`)?.textContent).toContain('TEST year');
    }
    const zeros = chart.querySelectorAll('[data-series-zero]');
    expect(zeros.length).toBeGreaterThan(0);
    for (const zero of zeros) expect((zero as HTMLElement).style.left).toBe(at(591));
    // An exact value draws its mark at its one position, with no range and no central mark.
    expect(within(chart.querySelector('[data-series-point="year_3"]') as HTMLElement).getByText(YEAR_3.text)).toBeTruthy();
    // No number outside a bound element: no tick, no axis label, no position as text (G2-1).
    expect(unboundNumbers(container)).toEqual([]);
    expect(container.querySelector('svg:not(.sov-icon), canvas, img')).toBeNull();
  });

  test('G9-9 · G1-5 · rule 9 "Ranges round outward": a breakdown draws each part from the zero line to its range, the range as served, never narrowed', () => {
    const { container } = render(<SeriesChart series={BREAKDOWN} displays={index(BREAKDOWN_DISPLAYS)} labels={LABELS} />);
    for (const [key, display] of [
      ['hvac', HVAC],
      ['lighting', LIGHTING],
    ] as const) {
      const point = BREAKDOWN.points.find((entry) => entry.key === key);
      const plot = point?.plot;
      if (plot === undefined || plot === null) throw new Error(`no plot for ${key}`);
      const row = container.querySelector(`[data-series-point="${key}"]`) as HTMLElement;
      const mark = row.querySelector(`[data-series-mark][data-value-id="${display.valueId}"]`) as HTMLElement;
      expect(mark.style.left).toBe(at(plot.low));
      expect(mark.style.width).toBe(at(plot.high - plot.low));
      // The bar from the zero line to the start of the range (a breakdown's bar starts at zero).
      const stem = row.querySelector('[data-series-stem]') as HTMLElement;
      expect(stem.style.left).toBe(at(0));
      expect(stem.style.width).toBe(at(plot.low));
    }
  });
});

describe('G1-5 (rendered half) · rule 1 "A chart shows an unknown as a labelled gap": an unknown line item is a labelled gap, never a zero', () => {
  test('G1-5 · rule 1 "No numeric stand-in" (the chart\'s own near miss, `zero ?? 0`, caught by the lint): a breakdown served with no zero draws each range as served and no bar from a position the series did not give', () => {
    const { container } = render(<SeriesChart series={{ ...BREAKDOWN, zero: null }} displays={index(BREAKDOWN_DISPLAYS)} labels={LABELS} />);
    expect(container.querySelectorAll('[data-series-mark]')).toHaveLength(2);
    expect(container.querySelector('[data-series-stem], [data-series-zero]')).toBeNull();
  });


  test('G1-5 · rule 1 · 2.8 "Prominence": each point the engine could not compute shows its 2.8 wording inside a dashed gap, bound to its value id; no bar, no mark and no "0" is drawn for it', () => {
    const { container } = render(<SeriesChart series={BREAKDOWN} displays={index(BREAKDOWN_DISPLAYS)} labels={LABELS} />);
    for (const [key, gap, wording] of [
      ['access_control', ACCESS_GAP, 'Not available yet: TEST cost table for access control'],
      ['water', WATER_GAP, 'Unknown'],
    ] as const) {
      const row = container.querySelector(`[data-series-point="${key}"]`) as HTMLElement;
      expect(row.getAttribute('data-series-gap-point')).toBe('');
      const gapMark = row.querySelector('[data-series-gap]') as HTMLElement;
      expect(gapMark.classList.contains('sov-series__gap')).toBe(true);
      const bound = gapMark.querySelector(`[data-value-id="${gap.valueId}"]`) as HTMLElement;
      expect(within(bound).getByText(wording)).toBeTruthy();
      expect(row.querySelector('[data-series-mark], [data-series-stem], [data-series-central]')).toBeNull();
      expect(row.textContent ?? '').not.toMatch(/(^|\D)0(\D|$)/u);
    }
    // The total names what it leaves out, with its stage label (rule 1, "Material exclusions"; rule 10).
    const total = container.querySelector('[data-series-total]') as HTMLElement;
    expect(within(total).getByText(INCOMPLETE_TOTAL.text).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(INCOMPLETE_TOTAL.valueId);
    expect(within(total).getByText('Preliminary investment estimate')).toBeTruthy();
    expect(unboundNumbers(container)).toEqual([]);
  });

  test('G1-5 · rule 7 "It names what is missing and offers the action": a gap waiting for an owner input offers its served Add, in the chart and in the table view, described by the point\'s name', () => {
    const add = { kind: 'add' as const, field: { subjectId: TEST_SNAPSHOT, fieldKey: 'project.scope.access_control' }, label: 'Add TEST access control decision', step: 8 as const };
    const gap = { ...ACCESS_GAP, actions: [add] };
    const onAdd = vi.fn<(action: Extract<Action, { kind: 'add' }>) => void>();
    const displays = index(BREAKDOWN_DISPLAYS.map((display) => (display.valueId === gap.valueId ? gap : display)));
    render(<SeriesChart series={BREAKDOWN} displays={displays} labels={LABELS} onAdd={onAdd} />);
    const row = document.querySelector('[data-series-point="access_control"]') as HTMLElement;
    const button = within(row).getByRole('button', { name: 'Add TEST access control decision' });
    expect(document.getElementById(button.getAttribute('aria-describedby') ?? '')?.textContent).toBe('TEST Access control');
    fireEvent.click(button);
    expect(onAdd).toHaveBeenCalledWith(add);
    fireEvent.click(screen.getByRole('button', { name: 'Show as a table' }));
    const tableRow = within(screen.getByRole('table')).getByText('TEST Access control').closest('tr') as HTMLElement;
    fireEvent.click(within(tableRow).getByRole('button', { name: 'Add TEST access control decision' }));
    expect(onAdd).toHaveBeenCalledTimes(2);
  });

  test('G1-5 · prompt 3 section 11 "charts have a table view": the table view lists every point by its name with its value as served, the gaps with their 2.8 wording, and the total', () => {
    render(<SeriesChart series={BREAKDOWN} displays={index(BREAKDOWN_DISPLAYS)} labels={LABELS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show as a table' }));
    const table = screen.getByRole('table', { name: LABELS.name });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['System', 'Investment']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual(['TEST HVAC', 'TEST Lighting', 'TEST Access control', 'TEST Water', 'Total']);
    expect(within(rows[2] as HTMLElement).getByText(ACCESS_GAP.text).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(ACCESS_GAP.valueId);
    expect(within(rows[3] as HTMLElement).getByText('Unknown').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(WATER_GAP.valueId);
    expect(within(rows[0] as HTMLElement).getByText(HVAC.text).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(HVAC.valueId);
    expect(within(rows[4] as HTMLElement).getByText(INCOMPLETE_TOTAL.text)).toBeTruthy();
    // The marks are the chart's: the table view draws none.
    expect(document.querySelector('[data-series-mark], [data-series-gap]')).toBeNull();
    // And back.
    fireEvent.click(screen.getByRole('button', { name: 'Show as a chart' }));
    expect(screen.queryByRole('table')).toBeNull();
    expect(document.querySelectorAll('[data-series-mark]')).toHaveLength(2);
  });
});

describe('G1-31 (rendered half) · rule 1 · rule 7: a series no formula declares reads one "Not available yet" line and draws nothing else', () => {
  test('G1-31 · rule 7 "\'Not available yet\' never appears alone": one line, bound, naming what is missing, with the owner\'s Add as served; no point, bar, gap, axis, zero, total, table or view switch', () => {
    const onAdd = vi.fn<(action: Extract<Action, { kind: 'add' }>) => void>();
    const { container } = render(<SeriesChart series={UNAVAILABLE} displays={index([UNAVAILABLE_LINE])} labels={LABELS} onAdd={onAdd} />);
    const chart = container.querySelector(`[data-series="${UNAVAILABLE.series}"]`) as HTMLElement;
    expect(chart.getAttribute('data-series-state')).toBe('not_available_yet');
    expect(within(chart).getByText(UNAVAILABLE_LINE.text).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(UNAVAILABLE_LINE.valueId);
    expect(chart.querySelector('[data-series-point], [data-series-mark], [data-series-gap], [data-series-track], [data-series-zero], [data-series-total]')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show as a table' })).toBeNull();
    expect(chart.textContent ?? '').not.toMatch(/\p{N}|—|–/u);
    fireEvent.click(screen.getByRole('button', { name: 'Add TEST gross floor area' }));
    expect(onAdd).toHaveBeenCalledWith(UNAVAILABLE_LINE.actions?.[0]);
  });

  test('G1-31 · rule 7: a series that is not available with no line served is a defect the chart refuses, never an empty card', () => {
    quietly(() => {
      expect(() => render(<SeriesChart series={UNAVAILABLE} displays={index([])} labels={LABELS} />)).toThrow(/Not available yet/u);
    });
  });
});

describe('G2-1 · rule 10 (G10-9): the chart shows only what the series serves', () => {
  test('G2-1: a point whose value or name was not served is refused, never drawn unlabelled', () => {
    const missing = BREAKDOWN_DISPLAYS.filter((display) => display.valueId !== LIGHTING.valueId);
    quietly(() => {
      expect(() => render(<SeriesChart series={BREAKDOWN} displays={index(missing)} labels={LABELS} />)).toThrow(/served/u);
    });
  });

  test('G10-9: a stage 3 total naming no stored record is refused', () => {
    const series = { ...BREAKDOWN, total: { kind: 'price' as const, output: 'capex.TEST_total', price: { figure: INCOMPLETE_TOTAL.valueId, stageId: 'formal_quotation' as const, quotationRecordId: null } } };
    quietly(() => {
      expect(() => render(<SeriesChart series={series} displays={index(BREAKDOWN_DISPLAYS)} labels={LABELS} />)).toThrow(/G10-9/u);
    });
  });
});

describe('A-3 (phase 6 part B) · rule 10: the parts of a priced breakdown are prices', () => {
  test('A-3 · rule 10, "Investment figures move through three stages, and each has a fixed name": each part of a priced breakdown shows its stage label through the one Price, inside the element bound to its value id, in the chart and in the table view; a gap names no stage (G10-11)', () => {
    const { container } = render(<SeriesChart series={BREAKDOWN} displays={index(BREAKDOWN_DISPLAYS)} labels={LABELS} />);
    for (const part of [HVAC, LIGHTING]) {
      const row = container.querySelector(`[data-series-point] .sov-series__value [data-value-id="${part.valueId}"]`) as HTMLElement;
      expect(row.closest('.sov-price')).not.toBeNull();
      expect(within(row).getByText('Preliminary investment estimate')).toBeTruthy();
    }
    const gap = container.querySelector(`[data-value-id="${ACCESS_GAP.valueId}"]`) as HTMLElement;
    expect(gap.closest('.sov-price')).toBeNull();
    expect(gap.textContent).not.toContain('Preliminary investment estimate');
    fireEvent.click(screen.getByRole('button', { name: 'Show as a table' }));
    const cell = container.querySelector(`[data-series-row="hvac"] [data-value-id="${HVAC.valueId}"]`) as HTMLElement;
    expect(cell.closest('.sov-price')).not.toBeNull();
    expect(within(cell).getByText('Preliminary investment estimate')).toBeTruthy();
  });

  test('A-3 · rule 10 · G10-9: a priced breakdown with a part served as no price, or a part labelled stage 3 naming no stored record, is refused', () => {
    const unpriced = { ...BREAKDOWN, points: BREAKDOWN.points.map((point) => (point.key === 'hvac' ? { ...point, price: null } : point)) };
    quietly(() => {
      expect(() => render(<SeriesChart series={unpriced} displays={index(BREAKDOWN_DISPLAYS)} labels={LABELS} />)).toThrow(/rule 10/u);
    });
    const quoted = { ...HVAC, lines: [{ id: 'formal_quotation', kind: 'stage_label' as const, text: 'Formal quotation' }] };
    const stage3 = { ...BREAKDOWN, points: BREAKDOWN.points.map((point) => (point.key === 'hvac' ? { ...point, price: { figure: HVAC.valueId, stageId: 'formal_quotation' as const, quotationRecordId: null } } : point)) };
    quietly(() => {
      expect(() => render(<SeriesChart series={stage3} displays={index(BREAKDOWN_DISPLAYS.map((display) => (display.valueId === HVAC.valueId ? quoted : display)))} labels={LABELS} />)).toThrow(/G10-9/u);
    });
  });
});

describe('WCAG 2.2 AA · prompt 3 section 11: the chart, its table view and its line', () => {
  test('WCAG 2.2 AA: no axe violation in the chart view, the table view or the "Not available yet" line; the view switch is a real button, reachable by Tab', async () => {
    const { container, unmount } = render(<SeriesChart series={BREAKDOWN} displays={index(BREAKDOWN_DISPLAYS)} labels={LABELS} />);
    expect(await axeViolations(container)).toEqual([]);
    const toggle = screen.getByRole('button', { name: 'Show as a table' });
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle.getAttribute('tabindex')).toBeNull();
    fireEvent.click(toggle);
    expect(await axeViolations(container)).toEqual([]);
    // The switch keeps the focus where it was pressed, under its new name.
    expect(screen.getByRole('button', { name: 'Show as a chart' })).toBeTruthy();
    unmount();
    const unavailable = render(<SeriesChart series={UNAVAILABLE} displays={index([UNAVAILABLE_LINE])} labels={LABELS} />);
    expect(await axeViolations(unavailable.container)).toEqual([]);
    unavailable.unmount();
    const sequence = render(<SeriesChart series={SEQUENCE} displays={index(SEQUENCE_DISPLAYS)} labels={LABELS} />);
    expect(await axeViolations(sequence.container)).toEqual([]);
  });

  test('G2-8 · WCAG 1.4.1: the marks are drawn by the stylesheet\'s chart rules, decorative to assistive technology (the labels and the table view carry every value)', () => {
    const { container } = render(<SeriesChart series={BREAKDOWN} displays={index(BREAKDOWN_DISPLAYS)} labels={LABELS} />);
    for (const track of container.querySelectorAll('[data-series-track]')) expect(track.getAttribute('aria-hidden')).toBe('true');
    // The gap's wording is not hidden: it is the gap's only label.
    const gap = container.querySelector('[data-series-gap]') as HTMLElement;
    expect(gap.closest('[aria-hidden="true"]')).toBeNull();
  });
});
