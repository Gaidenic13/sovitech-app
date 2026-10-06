import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { Logo } from './Logo';

afterEach(cleanup);

describe('US-ADMIN-08 AC1 · US-INTAKE-01 AC1 · OD-2: the logo', () => {
  test('US-ADMIN-08 AC1: the real white logo file at h-8, its alt text, and the reviewed unreadable entry, never a typeset wordmark', () => {
    render(<Logo />);
    const image = screen.getByRole('img', { name: 'SOVITECH Control' });
    expect(image.tagName).toBe('IMG');
    expect(image.getAttribute('src')).toMatch(/logo-white/u);
    expect(image.getAttribute('height')).toBe('32');
    // The reviewed marker, written as the render check's source scan reads it (a literal entry id).
    expect(image.matches('[data-render-unreadable="brand-logo"]')).toBe(true);
    expect(image.getAttribute('style')).toBeNull();
  });

  test('phase 5 DR-14: the logo sits in its plate, which keeps it on the brand background in forced colours (ui.css); the image itself carries no style or filter', () => {
    const { container } = render(<Logo />);
    const plate = container.firstElementChild;
    expect(plate?.className).toBe('sov-logo-plate');
    expect(plate?.children).toHaveLength(1);
    expect(plate?.querySelector('img.sov-logo')).not.toBeNull();
    expect(plate?.getAttribute('style')).toBeNull();
  });
});
