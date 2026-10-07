/**
 * The admin pages' project cell and its demo line (phase 7; ./admin-view.tsx `ProjectCell`, `rowDemoLine`; rule 10;
 * G10-10, extended to the admin pages' rows). Rendered alone, with a row as the contract carries it: `isDemo` and the
 * served `demoLine` (the phase 7 integrator's reconciliation, P-7-ADMIN-ROW-DEMO-LINE).
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { DisplayObject, Line } from '@sovitech/view-model/browser';
import { ProjectCell } from './admin-view';
import { indexDisplays } from '../wizard/use-step-view';

afterEach(cleanup);

const PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b10';
const ID: DisplayObject = { valueId: `admin_project:${PROJECT}.id`, kind: 'record', text: PROJECT, shape: 'value' };
const LINE: Line = { id: 'demo_data', kind: 'demo_line', text: 'TEST demo line' };

describe('G10-10 (extended) · rule 10: the demo line on an admin page\'s project row', () => {
  it('G10-10 (extended) · rule 10: the demo project\'s row shows its id, bound, and under it the demo line the API served for the row', () => {
    render(<ProjectCell displays={indexDisplays([ID])} valueId={ID.valueId} row={{ isDemo: true, demoLine: LINE }} />);
    expect(screen.getByText(PROJECT).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(ID.valueId);
    const note = screen.getByRole('note');
    expect(note.textContent).toBe('TEST demo line');
    expect(note.hasAttribute('data-demo-line')).toBe(true);
  });

  it('G10-10 (extended): a row that is not the demo project shows no demo line, even when a response holds one for it', () => {
    const { container } = render(<ProjectCell displays={indexDisplays([ID])} valueId={ID.valueId} row={{ isDemo: false, demoLine: LINE }} />);
    expect(container.querySelector('[data-demo-line]')).toBeNull();
    expect(screen.queryByText('TEST demo line')).toBeNull();
  });

  it('G10-10 (extended) · 2.8: a demo row whose response carries no line shows none: the web holds no words of its own for it', () => {
    const { container } = render(<ProjectCell displays={indexDisplays([ID])} valueId={ID.valueId} row={{ isDemo: true }} />);
    expect(container.querySelector('[data-demo-line]')).toBeNull();
  });
});
