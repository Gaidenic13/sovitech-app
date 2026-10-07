/**
 * The Metrics pages' tile and panel (phase 6; ./metrics.tsx; docs/adr/0052): layout only, named by their catalogue
 * copy, holding served values as the kit's value components draw them; axe on both.
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { Leaf } from 'lucide-react';
import { afterEach, describe, expect, test } from 'vitest';
import { MetricPanel, MetricTile } from './metrics';
import { NotAvailableYet } from './NotAvailableYet';
import { Price } from './Price';
import { Value } from './Value';
import { OUTPUT_MISSING_INPUT, PRICE_STAGE_2, UNKNOWN } from './test-displays';

afterEach(cleanup);

async function axeViolations(container: Element): Promise<string[]> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`);
}

describe('ADR 0052 · R-092 · 2.8 "Prominence": the Metrics tile and panel', () => {
  test('R-092 · 2.8: a tile is a group named by its label; its value keeps its badge, stage label and lines on the tile, bound to its value id', async () => {
    const { container } = render(
      <div>
        <MetricTile label="TEST total investment" icon={Leaf}>
          <Price display={PRICE_STAGE_2} />
        </MetricTile>
        <MetricTile label="TEST zones">
          <Value display={UNKNOWN} label={null} />
        </MetricTile>
      </div>,
    );
    const tile = screen.getByRole('group', { name: 'TEST total investment' });
    expect(within(tile).getByText('Preliminary investment estimate')).toBeTruthy();
    expect(within(tile).getByText('Estimated').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(PRICE_STAGE_2.valueId);
    expect(within(screen.getByRole('group', { name: 'TEST zones' })).getByText('Unknown')).toBeTruthy();
    // The decorative icon is hidden and no larger than the render test reads as an icon.
    const icon = tile.querySelector('svg');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(['16', '24', '32']).toContain(icon?.getAttribute('width'));
    expect(await axeViolations(container)).toEqual([]);
  });

  test('DR-1 · rule 7: a panel is a region named by its heading, whose id the caller gives its Adds to describe them', async () => {
    const { container } = render(
      <MetricPanel heading="TEST key indicators" headingId="test-heading">
        <NotAvailableYet display={OUTPUT_MISSING_INPUT} onAdd={() => undefined} describedBy="test-heading" />
      </MetricPanel>,
    );
    const panel = screen.getByRole('region', { name: 'TEST key indicators' });
    expect(within(panel).getByRole('heading', { level: 2, name: 'TEST key indicators' }).id).toBe('test-heading');
    expect(within(panel).getByRole('button', { name: 'Add TEST gross floor area' }).getAttribute('aria-describedby')).toBe('test-heading');
    expect(await axeViolations(container)).toEqual([]);
  });
});
