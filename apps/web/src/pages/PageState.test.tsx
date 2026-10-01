import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FieldError } from '@sovitech/ui';
import { copy } from '../copy';
import { WizardFooter } from '../wizard/WizardFooter';
import { LoadFailed, Loading } from './PageState';

afterEach(() => {
  cleanup();
});

/** The kit's FieldError glyph, drawn once as the reference the page's alerts are compared with. */
function fieldErrorGlyph(): string {
  const { container, unmount } = render(<FieldError id="TEST-error" message="TEST message" />);
  const glyph = container.querySelector('svg')?.outerHTML ?? '';
  unmount();
  return glyph;
}

describe('DR-20 · DR-12 · prompt 3 section 11: the loading and failure states', () => {
  it('DR-20 · WCAG 1.4.1 · R-003: a failed load says what failed beside the alert glyph the kit\'s FieldError draws (never by colour alone), and offers "Try again"', () => {
    const reference = fieldErrorGlyph();
    let retried = false;
    render(
      <LoadFailed
        onRetry={() => {
          retried = true;
        }}
      />,
    );
    const alert = screen.getByRole('alert');
    const glyph = alert.querySelector('svg');
    expect(reference).not.toBe('');
    expect(glyph?.outerHTML).toBe(reference);
    expect(glyph?.getAttribute('aria-hidden')).toBe('true');
    // The glyph sits beside the words, in the same line as the message.
    expect(glyph?.closest('p')?.textContent).toBe(copy.app.loadFailed);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retried).toBe(true);
  });

  it('DR-20 · rule 7: the footer\'s refusal shows the same glyph beside its words, and Back and Continue stay enabled', () => {
    const reference = fieldErrorGlyph();
    render(<WizardFooter onBack={() => undefined} primaryLabel={copy.nav.continue} onPrimary={() => undefined} error={copy.nav.continueFailed} />);
    const alert = screen.getByRole('alert');
    expect(alert.querySelector('svg')?.outerHTML).toBe(reference);
    expect(alert.textContent).toBe(copy.nav.continueFailed);
    for (const name of ['Back', 'Continue']) expect(screen.getByRole('button', { name }).hasAttribute('disabled'), name).toBe(false);
  });

  it('DR-20: with no refusal the footer shows no alert and no glyph of its own', () => {
    render(<WizardFooter onBack={() => undefined} primaryLabel={copy.nav.continue} onPrimary={() => undefined} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('DR-12 · rule 2: the loading line is one polite status line, in words, with no figure', () => {
    render(<Loading label={copy.step8.loading} align="start" />);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Loading your answers');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).not.toMatch(/\p{N}/u);
  });
});
