import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Eye, FileText } from 'lucide-react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { ActionRow } from './ActionRow';
import { Banner } from './Banner';
import { CalendarDate } from './CalendarDate';
import { Card } from './Card';
import { Dropzone } from './Dropzone';
import { Progress } from './Progress';

afterEach(cleanup);

const DROP_LABELS = { title: 'TEST drop here', or: 'TEST or', browse: 'TEST browse', formats: 'TEST formats', limit: 'Max file size 500 MB' };

describe('US-INTAKE-15 · onboarding-spec 2.5: cards, banners and rows', () => {
  test('US-INTAKE-15 AC1: a card is a section named by its heading, with its header action', () => {
    render(
      <Card title="TEST project" icon={FileText} headerAction={<button type="button">TEST edit</button>}>
        <p>TEST body</p>
      </Card>,
    );
    const section = screen.getByRole('region', { name: 'TEST project' });
    expect(section.querySelector('h3')?.textContent).toBe('TEST project');
    expect(screen.getByRole('button', { name: 'TEST edit' })).toBeTruthy();
  });

  test('US-INTAKE-16: a banner is static text with a decorative icon, never a live region or a dialog', () => {
    const { container } = render(<Banner title="TEST title">TEST banner text</Banner>);
    expect(container.querySelector('[role]')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('TEST banner text')).toBeTruthy();
  });

  test('US-REVIEW-08: an action row is a real button, or a link when it has a target', () => {
    const onClick = vi.fn();
    render(
      <ActionRow icon={Eye} onClick={onClick}>
        TEST view all
      </ActionRow>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'TEST view all' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    cleanup();
    render(<ActionRow href="#TEST">TEST go</ActionRow>);
    expect(screen.getByRole('link', { name: 'TEST go' }).getAttribute('href')).toBe('#TEST');
  });
});

describe('US-DOCS-01 · US-DOCS-03 · UD-33: the dropzone and the upload progress', () => {
  test('US-DOCS-01: the Browse files button is the keyboard path; dropped files are handed back in order', () => {
    const onFiles = vi.fn();
    const { container } = render(<Dropzone labels={DROP_LABELS} accept=".pdf,.xlsx" onFiles={onFiles} />);
    const browse = screen.getByRole('button', { name: 'TEST browse' });
    expect(browse.getAttribute('tabindex')).toBeNull();
    const zone = container.querySelector('.sov-dropzone') as HTMLElement;
    const first = new File(['TEST'], 'TEST-a.pdf');
    const second = new File(['TEST'], 'TEST-b.pdf');
    fireEvent.dragOver(zone, { dataTransfer: { files: [first, second] } });
    expect(zone.getAttribute('data-dragging')).toBe('true');
    fireEvent.drop(zone, { dataTransfer: { files: [first, second] } });
    expect(onFiles).toHaveBeenCalledWith([first, second]);
    expect(zone.getAttribute('data-dragging')).toBe('false');
  });

  test('rule 2 · render allowlist `max-file-size`: the limit line renders alone in its element, exactly as reviewed, and no size or count is shown', () => {
    render(<Dropzone labels={DROP_LABELS} onFiles={vi.fn()} />);
    expect(screen.getByText('Max file size 500 MB').textContent).toBe('Max file size 500 MB');
  });

  test('US-DOCS-03 AC1: progress is indeterminate: named, busy, and with no number announced', () => {
    render(<Progress label="TEST uploading" />);
    const bar = screen.getByRole('progressbar', { name: 'TEST uploading' });
    expect(bar.hasAttribute('aria-valuenow')).toBe(false);
    expect(bar.hasAttribute('aria-valuetext')).toBe(false);
    expect(bar.getAttribute('aria-busy')).toBe('true');
    expect(bar.textContent).toBe('');
  });

  test('DR-4 · prompt 3 section 11 ("never colour alone") · WCAG 1.4.1: what is in progress shows as text beside the bar, which it names', () => {
    const { container } = render(<Progress label="TEST uploading" />);
    const bar = screen.getByRole('progressbar', { name: 'TEST uploading' });
    const text = container.querySelector('.sov-progress__label');
    expect(text?.textContent).toBe('TEST uploading');
    expect(bar.getAttribute('aria-labelledby')).toBe(text?.id);
    expect(bar.contains(text as Node)).toBe(false);
    expect(container.querySelector('[data-value-id]')).toBeNull();
  });

  test('DR-4: with no visible text the bar keeps its accessible name, and nothing else shows', () => {
    const { container } = render(<Progress label="TEST reading" labelDisplay="hidden" />);
    expect(screen.getByRole('progressbar', { name: 'TEST reading' }).getAttribute('aria-label')).toBe('TEST reading');
    expect(container.querySelector('.sov-progress__label')).toBeNull();
    expect(container.textContent).toBe('');
  });

  test('DR-4 · 2.8: a served line shows as the text, with its line id and its copy-kind marker; a label with a number is refused', () => {
    const { container } = render(<Progress label={{ id: 'reading_documents', kind: 'status_line', text: 'TEST reading documents' }} />);
    expect(screen.getByRole('progressbar', { name: 'TEST reading documents' })).toBeTruthy();
    const text = container.querySelector('.sov-progress__label');
    expect(text?.getAttribute('data-line')).toBe('reading_documents');
    expect(text?.getAttribute('data-copy-kind')).toBe('status-line');
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Progress label="TEST 12 percent" />)).toThrow(/number/u);
    quiet.mockRestore();
  });

  test('DR-26 · ADR 0035: the dropzone draws its cloud at 32px, the largest the render test reads as an icon', () => {
    const { container } = render(<Dropzone labels={DROP_LABELS} onFiles={vi.fn()} />);
    const cloud = container.querySelector('.sov-dropzone > svg.sov-icon');
    expect(cloud?.getAttribute('data-size')).toBe('large');
    expect(cloud?.getAttribute('width')).toBe('32');
  });
});

describe('US-INTAKE-01 AC1 · render allowlist `date-day-month-year`: the header date', () => {
  test('US-INTAKE-01 AC1: a date in a time element, its text its own datetime as "D MMM YYYY", no weekday and no time', () => {
    const { container } = render(<CalendarDate date={new Date(2026, 8, 3)} />);
    const time = container.querySelector('time');
    expect(time?.getAttribute('datetime')).toBe('2026-09-03');
    expect(time?.textContent).toBe('3 Sep 2026');
  });
});
