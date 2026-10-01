import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Badge } from './Badge';
import { DemoLine } from './DemoLine';
import { NotAvailableYet } from './NotAvailableYet';
import { Notice, NoticeRegion } from './Notice';
import { Price } from './Price';
import { StatusLine } from './StatusLine';
import { DEMO_LINE, LATE_NOTICE, OPEN_ITEMS, OUTPUT_MISSING_DATASET, OUTPUT_MISSING_INPUT, PRICE_STAGE_2, TEST_SUBJECT, UNKNOWN } from './test-displays';

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
