import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SkipForNow, type SkippableQuestion } from './SkipForNow';

afterEach(cleanup);

const SKIP = { kind: 'skip', questionId: 'q.test.schedule' } as const;
const LATER = { id: 'provide_later', kind: 'rule_line', text: 'TEST later line' } as const;
const SUGGESTED = { reason: { id: 'suggested_because', kind: 'rule_line', text: 'TEST reason' } } as const;

function question(overrides: Partial<SkippableQuestion>): SkippableQuestion {
  return {
    questionId: 'q.test.schedule',
    state: 'unanswered',
    skip: SKIP,
    afterSkip: null,
    options: [
      { selected: false, suggestion: null },
      { selected: false, suggestion: null },
    ],
    ...overrides,
  };
}

describe('G7-3 · US-INTAKE-05 AC3 · F-QUESTION-04: "Skip for now" only under an unanswered question with no visible suggestion (component half)', () => {
  test('G7-3: an unanswered question with no suggestion shows the link, and pressing it hands back the served skip action', () => {
    const onSkip = vi.fn();
    render(<SkipForNow question={question({})} label="TEST skip label" onSkip={onSkip} />);
    const link = screen.getByRole('button', { name: 'TEST skip label' });
    fireEvent.click(link);
    expect(onSkip).toHaveBeenCalledWith(SKIP);
  });

  test('G7-3: a question with an answer shows no Skip link', () => {
    const answered = question({ state: 'answered', options: [{ selected: true, suggestion: null }] });
    const { container } = render(<SkipForNow question={answered} label="TEST skip label" onSkip={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.textContent).toBe('');
  });

  test('G7-3: a question with a visible suggestion shows no Skip link, even if the served question still carries one', () => {
    const suggested = question({ options: [{ selected: true, suggestion: SUGGESTED }, { selected: false, suggestion: null }] });
    render(<SkipForNow question={suggested} label="TEST skip label" onSkip={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('G7-3: an option shown as chosen (an answer or a found fact) hides the link, even while the state reads unanswered', () => {
    const chosen = question({ options: [{ selected: true, suggestion: null }] });
    render(<SkipForNow question={chosen} label="TEST skip label" onSkip={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('G7-3: a found fact and a question the API gives no skip action (a required field) show no link', () => {
    render(<SkipForNow question={question({ state: 'found' })} label="TEST skip label" onSkip={vi.fn()} />);
    render(<SkipForNow question={question({ skip: null })} label="TEST skip label" onSkip={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('US-INTAKE-05 · rule 7: after a skip, the served line shows once inline and the link is gone', () => {
    render(<SkipForNow question={question({ state: 'skipped', afterSkip: LATER })} label="TEST skip label" onSkip={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('TEST later line')).toBeTruthy();
  });

  test('US-INTAKE-05: the link is a real button, reachable by Tab (no tabindex below zero, not disabled)', () => {
    render(<SkipForNow question={question({})} label="TEST skip label" onSkip={vi.fn()} />);
    const link = screen.getByRole('button', { name: 'TEST skip label' });
    expect(link.tagName).toBe('BUTTON');
    expect(link.getAttribute('type')).toBe('button');
    expect(link.hasAttribute('disabled')).toBe(false);
    expect(link.getAttribute('tabindex')).toBeNull();
    link.focus();
    expect(document.activeElement).toBe(link);
  });
});

describe('G7-10 · rule 7 · section 8: a skip on its way takes no second press, and the link is never disabled', () => {
  test('G7-10 · rule 7: while the caller says its skip is on its way, the link shows aria-busy and a press sends nothing; once cleared, a press hands the action back again', () => {
    const onSkip = vi.fn();
    const { rerender } = render(<SkipForNow question={question({})} label="TEST skip label" onSkip={onSkip} busy />);
    const link = screen.getByRole('button', { name: 'TEST skip label' });
    expect(link.getAttribute('aria-busy')).toBe('true');
    expect(link.hasAttribute('disabled')).toBe(false);
    fireEvent.click(link);
    fireEvent.click(link);
    expect(onSkip).not.toHaveBeenCalled();
    rerender(<SkipForNow question={question({})} label="TEST skip label" onSkip={onSkip} busy={false} />);
    expect(link.getAttribute('aria-busy')).toBe('false');
    fireEvent.click(link);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});

describe('DR-14: "Skip for now" has one placement under the cards', () => {
  test('DR-14: the link and the "later" line render in the same placement element, which owns the space above it (ui.css `.sov-skip`)', () => {
    const { container, unmount } = render(<SkipForNow question={question({})} label="TEST skip label" onSkip={vi.fn()} />);
    const link = container.firstElementChild;
    expect(link?.className).toBe('sov-skip');
    expect(link?.firstElementChild?.tagName).toBe('BUTTON');
    unmount();
    const later = render(<SkipForNow question={question({ state: 'skipped', afterSkip: LATER })} label="TEST skip label" onSkip={vi.fn()} />);
    expect(later.container.firstElementChild?.className).toBe('sov-skip');
    expect(later.container.firstElementChild?.textContent).toBe('TEST later line');
  });
});
