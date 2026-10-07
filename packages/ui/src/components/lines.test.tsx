import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Badge } from './Badge';
import { DemoLine } from './DemoLine';
import { NotAvailableYet } from './NotAvailableYet';
import { Notice, NoticeRegion } from './Notice';
import { Price } from './Price';
import { StatusLine } from './StatusLine';
import { DEMO_LINE, LATE_NOTICE, OPEN_ITEMS, OUTPUT_MISSING_DATASET, OUTPUT_MISSING_INPUT, OUTPUT_MISSING_INPUTS, PRICE_STAGE_2, TEST_SUBJECT, UNKNOWN } from './test-displays';

afterEach(cleanup);

function quietly(run: () => void): void {
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    run();
  } finally {
    quiet.mockRestore();
  }
}

describe('F-RENDER-03 · 2.8 "Badge labels": the badge shows the served label only', () => {
  test('US-REVIEW-01 AC2 · AC12: the label as served, its registry id, marked as a badge (the place 2.8 allows "Confirmed by you")', () => {
    render(<Badge badge={{ id: 'confirmed_by_you', label: 'Confirmed by you' }} />);
    const badge = screen.getByText('Confirmed by you');
    expect(badge.getAttribute('data-badge')).toBe('confirmed_by_you');
    expect(badge.getAttribute('data-copy-kind')).toBe('badge');
  });
});

describe('F-RENDER-01 · F-RENDER-05 · prompt 3 section 7: StatusLine binds every number in a line to its value id', () => {
  test('G7-5 · rule 7 "Counts": a count renders in an element bound to its value id, as served', () => {
    const { container } = render(<StatusLine display={OPEN_ITEMS} />);
    const bound = container.querySelector(`[data-value-id="${OPEN_ITEMS.valueId}"]`);
    expect(bound?.textContent).toBe('TEST 12 things for you to check');
  });

  test('G2-1: a line with a number and no value id is refused', () => {
    quietly(() => {
      expect(() => render(<StatusLine line={{ id: 'things_for_you', kind: 'rule_line', text: 'TEST 12 things' }} />)).toThrow(/value id/u);
    });
  });

  test('DR-10: a small line (under a 14px name) says so for the stylesheet, in both forms; the default line carries no size', () => {
    const { container } = render(
      <>
        <StatusLine display={OPEN_ITEMS} size="small" />
        <StatusLine line={{ id: 'analysis_failed', kind: 'status_line', text: 'Analysis failed' }} size="small" />
        <StatusLine line={{ id: 'provide_later', kind: 'rule_line', text: 'You can provide this later.' }} />
        <StatusLine line={{ id: 'not_analysed', kind: 'status_line', text: 'Not analysed' }} size="default" />
      </>,
    );
    expect([...container.querySelectorAll('.sov-status-line')].map((line) => line.getAttribute('data-size'))).toEqual(['small', 'small', null, null]);
    expect(container.querySelector(`[data-value-id="${OPEN_ITEMS.valueId}"]`)?.getAttribute('data-size')).toBe('small');
  });

  test('F-RENDER-05 · 2.8 "Reserved terms": a status line is marked as a status line; a rule line carries no marker', () => {
    render(<StatusLine line={{ id: 'analysis_failed', kind: 'status_line', text: 'Analysis failed' }} />);
    render(<StatusLine line={{ id: 'provide_later', kind: 'rule_line', text: 'You can provide this later.' }} />);
    expect(screen.getByText('Analysis failed').getAttribute('data-copy-kind')).toBe('status-line');
    expect(screen.getByText('You can provide this later.').hasAttribute('data-copy-kind')).toBe(false);
  });
});

describe('F-RENDER-05 · R-044 · US-REVIEW-03: the demo line', () => {
  test('US-REVIEW-03 AC1: the served demo line shows, as a note, marked as a status line', () => {
    render(<DemoLine line={DEMO_LINE} />);
    const note = screen.getByRole('note');
    expect(note.textContent).toBe('TEST demo line');
    expect(screen.getByText('TEST demo line').getAttribute('data-copy-kind')).toBe('status-line');
  });

  test('US-REVIEW-03 AC7: a project with no demo flag (a null line) shows nothing', () => {
    const { container } = render(<DemoLine line={null} />);
    expect(container.textContent).toBe('');
  });

  test('US-REVIEW-03 · rule 10: only 2.8\'s demo line is accepted there', () => {
    quietly(() => {
      expect(() => render(<DemoLine line={{ id: 'analysis_failed', kind: 'status_line', text: 'Analysis failed' }} />)).toThrow(/demo line/u);
    });
  });
});

describe('US-REVIEW-01 AC7 · rule 7 · 2.8: "Not available yet" names what is missing and offers the action', () => {
  test('US-INTAKE-16: the missing input is named, and "Add <field>" hands back the served add action', () => {
    const onAdd = vi.fn();
    const { container } = render(<NotAvailableYet display={OUTPUT_MISSING_INPUT} onAdd={onAdd} />);
    const bound = container.querySelector(`[data-value-id="${OUTPUT_MISSING_INPUT.valueId}"]`);
    expect(bound?.textContent).toContain('Add the TEST gross floor area to see this.');
    fireEvent.click(screen.getByRole('button', { name: 'Add TEST gross floor area' }));
    expect(onAdd).toHaveBeenCalledWith(OUTPUT_MISSING_INPUT.actions?.[0]);
  });

  test('US-INTAKE-16 · D-14 interim: a missing SOVITECH dataset is named, with no action wording', () => {
    render(<NotAvailableYet display={OUTPUT_MISSING_DATASET} onAdd={vi.fn()} />);
    expect(screen.getByText('Not available yet: TEST point templates')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('DR-1 · R-012 · rule 7 ("names what is missing and offers the action"): every served Add shows, in served order, in one row under the line, inside its bound element; each is described by its output\'s label', () => {
    const onAdd = vi.fn();
    const { container } = render(
      <>
        <p id="TEST-output-label">TEST indicative range</p>
        <NotAvailableYet display={OUTPUT_MISSING_INPUTS} onAdd={onAdd} describedBy="TEST-output-label" />
      </>,
    );
    const bound = container.querySelector(`[data-value-id="${OUTPUT_MISSING_INPUTS.valueId}"]`) as HTMLElement;
    const buttons = within(bound).getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['Add TEST gross floor area', 'Add TEST building type', 'Add TEST systems in scope']);
    // One row of link buttons under the line (the kit's action row), never one per line of text.
    const row = bound.querySelector('.sov-value__actions');
    expect(row?.children).toHaveLength(3);
    for (const button of buttons) {
      expect(button.getAttribute('data-variant')).toBe('link');
      expect(button.getAttribute('aria-describedby')).toBe('TEST-output-label');
    }
    expect(screen.getByRole('button', { name: 'Add TEST building type' }).getAttribute('aria-describedby')).toBe('TEST-output-label');
    fireEvent.click(screen.getByRole('button', { name: 'Add TEST building type' }));
    expect(onAdd).toHaveBeenCalledWith(OUTPUT_MISSING_INPUTS.actions?.[1]);
    // Without a label to point at, the buttons carry no description.
    cleanup();
    render(<NotAvailableYet display={OUTPUT_MISSING_INPUTS} onAdd={vi.fn()} />);
    for (const button of screen.getAllByRole('button')) expect(button.hasAttribute('aria-describedby')).toBe(false);
  });

  test('US-REVIEW-01 AC7 · rule 7: a bare "Not available yet" that names nothing is refused, and so is a display that is not one', () => {
    const bare = { ...OUTPUT_MISSING_DATASET, text: 'Not available yet' };
    quietly(() => {
      expect(() => render(<NotAvailableYet display={bare} />)).toThrow(/name what is missing/u);
      expect(() => render(<NotAvailableYet display={UNKNOWN} />)).toThrow(/not "Not available yet"/u);
    });
  });
});

describe('F-RENDER-02 · G10-9 · rule 10: the price component reads its stage from the display object', () => {
  test('F-RENDER-02 · rule 10: the stage label shows, from the served lines, marked as a status line, bound with the figure', () => {
    const { container } = render(<Price display={PRICE_STAGE_2} label="TEST investment" />);
    const bound = container.querySelector(`[data-value-id="${PRICE_STAGE_2.valueId}"]`);
    const stage = screen.getByText('Preliminary investment estimate');
    expect(bound?.contains(stage)).toBe(true);
    expect(stage.getAttribute('data-copy-kind')).toBe('status-line');
    expect(bound?.textContent).toContain('about TEST 1,200 (TEST 1,100 to TEST 1,300) EUR');
  });

  test('G10-9 · rule 10 "Stage 3 is derived, not passed": "Formal quotation" with no stored quotation record is refused', () => {
    const formal = {
      ...PRICE_STAGE_2,
      lines: [{ id: 'formal_quotation', kind: 'stage_label' as const, text: 'Formal quotation' }],
    };
    quietly(() => {
      expect(() => render(<Price display={formal} />)).toThrow(/stored record/u);
    });
    render(<Price display={{ ...formal, quotationRecordId: TEST_SUBJECT }} />);
    expect(screen.getByText('Formal quotation')).toBeTruthy();
  });

  test('G10-2 · V-11 (phase 6) · rule 10 "A quotation goes stale": the Superseded line the figure\'s display carries renders once, inside the figure\'s bound element; beside the stage 3 label it is refused', () => {
    const text = 'Superseded: inputs changed on TEST 6 Oct 2026';
    const stale = { ...PRICE_STAGE_2, lines: [...(PRICE_STAGE_2.lines ?? []), { id: 'superseded_inputs_changed', kind: 'status_line' as const, text }] };
    const { container } = render(<Price display={stale} />);
    expect(screen.getAllByText(text)).toHaveLength(1);
    expect(screen.getByText(text).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(PRICE_STAGE_2.valueId);
    expect(container.querySelector(`[data-value-id="${PRICE_STAGE_2.valueId}"]`)?.contains(screen.getByText('Preliminary investment estimate'))).toBe(true);
    const formal = { ...stale, quotationRecordId: TEST_SUBJECT, lines: [{ id: 'formal_quotation', kind: 'stage_label' as const, text: 'Formal quotation' }, { id: 'superseded_inputs_changed', kind: 'status_line' as const, text }] };
    quietly(() => {
      expect(() => render(<Price display={formal} />)).toThrow(/stage 2/u);
    });
  });

  test('V-11 (phase 6) · 2.8: the price shows every served line as served, once, and matches no line by its words', () => {
    // A served line whose words equal the figure's text is still a served line (the server never sends one: each line
    // is served once); the component shows what it is given and drops nothing by comparing words.
    const echoed = { ...PRICE_STAGE_2, lines: [...(PRICE_STAGE_2.lines ?? []), { id: 'TEST_echo', kind: 'status_line' as const, text: PRICE_STAGE_2.text }] };
    const { container } = render(<Price display={echoed} />);
    const bound = container.querySelector(`[data-value-id="${PRICE_STAGE_2.valueId}"]`) as HTMLElement;
    expect(within(bound).getAllByText(PRICE_STAGE_2.text)).toHaveLength(2);
    expect(within(bound).getAllByText('Preliminary investment estimate')).toHaveLength(1);
  });

  test('rule 7 · G7-2b: a price that cannot be produced for a missing owner input offers its served Add action inside its bound element; without a handler none shows', () => {
    const onAdd = vi.fn();
    const { container, unmount } = render(<Price display={OUTPUT_MISSING_INPUT} onAdd={onAdd} />);
    const action = OUTPUT_MISSING_INPUT.actions?.find((candidate) => candidate.kind === 'add');
    if (action === undefined || action.kind !== 'add') throw new Error('the TEST display has no add action');
    const button = screen.getByRole('button', { name: action.label });
    expect(container.querySelector(`[data-value-id="${OUTPUT_MISSING_INPUT.valueId}"]`)?.contains(button)).toBe(true);
    fireEvent.click(button);
    expect(onAdd).toHaveBeenCalledWith(action);
    unmount();
    render(<Price display={OUTPUT_MISSING_INPUT} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('DR-1 · R-012 · rule 7 · G7-2b: a price that cannot be produced offers every served Add, in served order, in one row inside its bound element, each described by the price\'s label', () => {
    const onAdd = vi.fn();
    const { container } = render(<Price display={OUTPUT_MISSING_INPUTS} label="TEST indicative range" onAdd={onAdd} />);
    const bound = container.querySelector(`[data-value-id="${OUTPUT_MISSING_INPUTS.valueId}"]`) as HTMLElement;
    const buttons = within(bound).getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['Add TEST gross floor area', 'Add TEST building type', 'Add TEST systems in scope']);
    expect(bound.querySelector('.sov-value__actions')?.children).toHaveLength(3);
    const label = screen.getByText('TEST indicative range');
    expect(label.id).not.toBe('');
    for (const button of buttons) expect(button.getAttribute('aria-describedby')).toBe(label.id);
    fireEvent.click(buttons[2] as HTMLElement);
    expect(onAdd).toHaveBeenCalledWith(OUTPUT_MISSING_INPUTS.actions?.[2]);
    // A label drawn by the page outside the price: the caller names it.
    cleanup();
    render(<Price display={OUTPUT_MISSING_INPUTS} onAdd={vi.fn()} describedBy="TEST-row-name" />);
    for (const button of screen.getAllByRole('button')) expect(button.getAttribute('aria-describedby')).toBe('TEST-row-name');
  });

  test('V-1 (kit half) · V-11 (phase 6) · rule 1 "Material exclusions": a price served as its "Incomplete: excludes …" line (its text) with its stage label shows the line once, with the stage, and no other text', () => {
    // As the API serves the head over an incomplete total (view.ts `incompleteHeadline`): the Incomplete line is the
    // display's text, and its lines carry the stage label only (each line once: V-11).
    const incomplete = {
      valueId: `project:${TEST_SUBJECT}.outputs.capex`,
      kind: 'line' as const,
      text: 'Incomplete: excludes TEST item A, TEST item B',
      shape: 'value' as const,
      lines: [{ id: 'preliminary_investment_estimate', kind: 'stage_label' as const, text: 'Preliminary investment estimate' }],
    };
    const { container } = render(<Price display={incomplete} size="headline" />);
    const bound = container.querySelector(`[data-value-id="${incomplete.valueId}"]`) as HTMLElement;
    expect(within(bound).getAllByText(incomplete.text)).toHaveLength(1);
    expect(within(bound).getByText('Preliminary investment estimate')).toBeTruthy();
    expect(bound.textContent).toBe(`Preliminary investment estimate${incomplete.text}`);
  });

  test('phase 5 (the stored proposal\'s head): the headline size is layout only; the same content shows', () => {
    const { container } = render(<Price display={PRICE_STAGE_2} size="headline" />);
    expect(container.querySelector('.sov-price')?.getAttribute('data-size')).toBe('headline');
    expect(container.querySelector(`[data-value-id="${PRICE_STAGE_2.valueId}"]`)?.textContent).toContain('about TEST 1,200 (TEST 1,100 to TEST 1,300) EUR');
  });

  test('F-RENDER-02 · rule 10: an investment figure with no stage label is refused; a missing price reads its badge', () => {
    quietly(() => {
      expect(() => render(<Price display={{ ...PRICE_STAGE_2, lines: [] }} />)).toThrow(/stage label/u);
    });
    render(<Price display={OUTPUT_MISSING_DATASET} />);
    expect(screen.getByText('Not available yet')).toBeTruthy();
  });
});

describe('G7-4 · US-INTAKE-19 · rule 7 "Late findings never interrupt": one quiet notice, never a dialog', () => {
  test('G7-4: the notice sits in a polite status region, its count bound, with no dialog or alert anywhere', () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <NoticeRegion label="TEST notices">
        <Notice display={LATE_NOTICE} dismissLabel="TEST dismiss" onDismiss={onDismiss} />
      </NoticeRegion>,
    );
    const region = screen.getByRole('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.querySelector(`[data-value-id="${LATE_NOTICE.valueId}"]`)?.textContent).toBe(LATE_NOTICE.text);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(container.querySelector('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'TEST dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('US-INTAKE-19: the region stays mounted when empty, so a later notice is announced', () => {
    render(<NoticeRegion label="TEST notices" />);
    expect(screen.getByRole('status').textContent).toBe('');
  });
});
