import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { DisplayObject, Line } from '@sovitech/view-model/browser';
import { PrintFrame, PrintValue } from './print';

afterEach(cleanup);

const DEMO: Line = { id: 'demo_data', kind: 'demo_line', text: 'TEST demo line' };
const DOCUMENT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8ed0';

const FIELD: DisplayObject = {
  valueId: 'building:0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8eb0.grossFloorArea',
  kind: 'field',
  text: 'TEST 12 m²',
  shape: 'value',
  measure: { label: 'TEST area', unit: { code: 'm2', symbol: 'm²' } },
  badge: { id: 'from_document', label: 'TEST document badge' },
  sourceLine: { id: 'document', kind: 'source_line', text: 'TEST found in TEST.pdf' },
  evidence: [
    { documentId: DOCUMENT, contentHash: 'a'.repeat(64), excerpt: 'TEST excerpt' },
    { documentId: DOCUMENT, contentHash: 'b'.repeat(64), excerpt: '[erased]' },
  ],
};
const MISSING: DisplayObject = { valueId: 'proposal:0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e01.outputs.energy.annualConsumption', kind: 'line', text: 'Not available yet: TEST data', shape: 'missing', missing: 'not_available_yet' };
const LINE: DisplayObject = { valueId: 'project:0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9f.openItems.owner', kind: 'line', text: 'TEST 2 things', shape: 'value', lines: [{ id: 'owner_items', kind: 'rule_line', text: 'TEST 2 things' }] };

describe('ADR 0050 decision 1 · rule 10 · 2.8 "Prominence": the printed document\'s parts', () => {
  it('rule 10 · G10-13: PrintFrame holds the demo line in a layout table\'s header row, which a browser repeats on every printed page', () => {
    const { container } = render(
      <PrintFrame demoLine={DEMO}>
        <p>TEST body</p>
      </PrintFrame>,
    );
    const table = container.querySelector('table');
    expect(table?.getAttribute('role')).toBe('presentation');
    expect(table?.querySelector('thead [data-demo-line]')?.textContent).toBe('TEST demo line');
    expect(table?.querySelector('tbody')?.textContent).toBe('TEST body');
  });

  it('G10-10 · US-REVIEW-03 AC7: with no demo line (any other project) the frame has no header row', () => {
    const { container } = render(
      <PrintFrame demoLine={null}>
        <p>TEST body</p>
      </PrintFrame>,
    );
    expect(container.querySelector('thead')).toBeNull();
    expect(container.querySelector('[data-demo-line]')).toBeNull();
  });

  it('rule 7: a "Not available yet" display prints through the NotAvailableYet component, naming what is missing, with no action', () => {
    const { container } = render(<PrintValue display={MISSING} />);
    const element = container.querySelector(`[data-value-id="${MISSING.valueId}"]`);
    expect(element?.classList.contains('sov-not-available')).toBe(true);
    expect(element?.textContent).toBe('Not available yet: TEST data');
    expect(container.querySelector('button')).toBeNull();
  });

  it('rule 2: a standalone line with a number prints through the StatusLine component, bound', () => {
    const { container } = render(<PrintValue display={LINE} />);
    expect(container.querySelector(`[data-value-id="${LINE.valueId}"]`)?.classList.contains('sov-status-line')).toBe(true);
  });

  it('2.8 "Prominence": a value prints with its badge on its line and its source line, and its excerpts only where asked for', () => {
    const { container } = render(<PrintValue display={FIELD} />);
    const element = container.querySelector(`[data-value-id="${FIELD.valueId}"]`);
    expect(element?.querySelector('.sov-value__line [data-copy-kind="badge"]')?.textContent).toBe('TEST document badge');
    expect(element?.querySelector('.sov-value__source')?.textContent).toBe('TEST found in TEST.pdf');
    expect(container.querySelector('[data-copy-kind="evidence-excerpt"]')).toBeNull();
    expect(container.textContent).toContain('TEST area');
  });

  it('2.8 "Prominence" · G13-12: in the appendix each excerpt prints in full, bound to the value and marked as document text, never behind a disclosure; "[erased]" as stored', () => {
    const { container } = render(<PrintValue display={FIELD} label={null} excerpts />);
    const excerpts = [...container.querySelectorAll('blockquote[data-copy-kind="evidence-excerpt"]')];
    expect(excerpts.map((excerpt) => excerpt.textContent)).toEqual(['TEST excerpt', '[erased]']);
    for (const excerpt of excerpts) {
      expect(excerpt.getAttribute('data-value-id')).toBe(FIELD.valueId);
      expect(excerpt.getAttribute('data-document-id')).toBe(DOCUMENT);
    }
    expect(container.querySelector('details, summary, button')).toBeNull();
    expect(container.textContent).not.toContain('TEST area');
  });
});
