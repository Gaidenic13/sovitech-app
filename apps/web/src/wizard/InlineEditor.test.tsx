import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Action, DisplayObject } from '@sovitech/view-model/browser';
import { SessionProvider } from '../session/SessionProvider';
import { PROJECT, installFakeApi, json } from '../test/harness';
import { InlineEditor, editRefusalMessage, quantityLabel } from './InlineEditor';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const BUILDING = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e60';
const CANDIDATE = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e61';

type EditAction = Extract<Action, { kind: 'edit' }>;

function areaEdit(qualifiers: readonly string[]): EditAction {
  return {
    kind: 'edit',
    field: { subjectId: BUILDING, fieldKey: 'building.grossFloorArea' },
    input: { kind: 'quantity', unit: { code: 'm2', symbol: 'm²' }, qualifiers: [...qualifiers], qualifierRequired: true },
    shownCandidateIds: [CANDIDATE],
  };
}

const AREA: DisplayObject = {
  valueId: `building:${BUILDING}.grossFloorArea`,
  kind: 'field',
  text: 'TEST Not provided yet',
  shape: 'missing',
  missing: 'not_provided_yet',
  badge: { id: 'not_provided_yet', label: 'TEST Not provided yet' },
  measure: { label: 'TEST gross floor area', unit: { code: 'm2', symbol: 'm²' } },
};

function renderEditor(action: EditAction, handlers: { readonly onSaved?: () => void; readonly onStale?: () => void } = {}) {
  render(
    <MemoryRouter>
      <SessionProvider>
        <InlineEditor
          projectId={PROJECT}
          action={action}
          display={AREA}
          label="TEST gross floor area"
          onSaved={handlers.onSaved ?? (() => undefined)}
          onCancel={() => undefined}
          {...(handlers.onStale === undefined ? {} : { onStale: handlers.onStale })}
        />
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('the inline editor (F-VALUE-05; US-REVIEW-07; rule 4)', () => {
  it('DR-5 · rule 8: a quantity\'s input names its unit in words, keyed by the served unit code; a unit the catalogue does not name keeps the field\'s label', () => {
    expect(quantityLabel('TEST gross floor area', 'm2')).toBe('TEST gross floor area, in square metres');
    expect(quantityLabel('TEST rooms', 'count')).toBe('TEST rooms');
    installFakeApi({});
    renderEditor(areaEdit(['gross_total', 'usable']));
    expect(screen.getByRole('textbox', { name: 'TEST gross floor area, in square metres' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'What it measures' })).toBeTruthy();
  });

  it('DR-5 · rule 8: a single qualifier is one visible radio the owner ticks (never ticked for them), not a one-option select; the answer carries it', async () => {
    const seen = installFakeApi({ [`POST /api/projects/${PROJECT}/fields/edit`]: () => json(200, { displayObjects: [] }) });
    const onSaved = vi.fn();
    renderEditor(areaEdit(['gross_total']), { onSaved });
    expect(screen.queryByRole('combobox')).toBeNull();
    const group = screen.getByRole('group', { name: 'What it measures' });
    const radio = within(group).getByRole('radio', { name: 'gross total (Scd)' }) as HTMLInputElement;
    expect(radio.checked).toBe(false);
    fireEvent.change(screen.getByRole('textbox', { name: 'TEST gross floor area, in square metres' }), { target: { value: 'TEST typed area' } });
    fireEvent.click(radio);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(seen.find((request) => request.path.endsWith('/fields/edit'))?.body).toEqual({
      field: { subjectId: BUILDING, fieldKey: 'building.grossFloorArea' },
      value: { kind: 'quantity', raw: 'TEST typed area', qualifier: 'gross_total' },
      corrects: [CANDIDATE],
    });
  });

  it('DR-19: Save is the secondary button, so the step\'s own Next, Continue or Generate stays the one primary', () => {
    installFakeApi({});
    renderEditor(areaEdit(['gross_total', 'usable']));
    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('data-variant')).toBe('secondary');
  });

  it('A-1 · rule 4: Save refused because the shown value changed (409 shown_value_changed, or its kin) says so and the screen reads its view again; another refusal does not', async () => {
    for (const code of ['shown_value_changed', 'conflict_not_open', 'question_answered', 'confirmation_not_shown']) {
      expect(editRefusalMessage(code), code).toBe('This value changed since the page showed it. The page shows it again now.');
    }
    expect(editRefusalMessage('number_ambiguous')).toBe('This number can be read more than one way. Write it again so it can be read only as you mean it.');
    expect(editRefusalMessage('internal_error')).toBe('This answer could not be saved. Try again.');

    installFakeApi({ [`POST /api/projects/${PROJECT}/fields/edit`]: () => json(409, { code: 'shown_value_changed' }) });
    const onStale = vi.fn();
    renderEditor(areaEdit(['gross_total', 'usable']), { onStale });
    fireEvent.change(screen.getByRole('textbox', { name: 'TEST gross floor area, in square metres' }), { target: { value: 'TEST typed area' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('This value changed since the page showed it. The page shows it again now.')).toBeTruthy();
    expect(onStale).toHaveBeenCalledTimes(1);

    cleanup();
    vi.unstubAllGlobals();
    installFakeApi({ [`POST /api/projects/${PROJECT}/fields/edit`]: () => json(422, { code: 'number_ambiguous' }) });
    const notStale = vi.fn();
    renderEditor(areaEdit(['gross_total', 'usable']), { onStale: notStale });
    fireEvent.change(screen.getByRole('textbox', { name: 'TEST gross floor area, in square metres' }), { target: { value: 'TEST typed area' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/can be read more than one way/u)).toBeTruthy();
    expect(notStale).not.toHaveBeenCalled();
  });
});
