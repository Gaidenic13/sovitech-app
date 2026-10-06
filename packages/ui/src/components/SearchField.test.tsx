import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SearchField } from './SearchField';

afterEach(cleanup);

describe('DR-5 (phase 4 design review, built in phase 5) · WCAG 1.3.1, 2.1.1: the one search field', () => {
  test('DR-5: a real search input named for screen readers, its hint inside, the text passed as typed, 80 characters at most; the icon is decorative', () => {
    const onChange = vi.fn();
    const { container } = render(<SearchField label="TEST search label" placeholder="TEST search hint" value="" onChange={onChange} />);
    const input = screen.getByRole('searchbox', { name: 'TEST search label' });
    expect(input.getAttribute('placeholder')).toBe('TEST search hint');
    expect(input.getAttribute('maxlength')).toBe('80');
    fireEvent.change(input, { target: { value: 'TEST typed' } });
    expect(onChange).toHaveBeenCalledWith('TEST typed');
    expect(container.querySelector('.sov-search svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.sov-search')).not.toBeNull();
  });
});
