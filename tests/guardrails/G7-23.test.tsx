// @vitest-environment happy-dom
/**
 * G7-23 (new in the viewer step; docs/build-log.md, the viewer step, item 7; rule 7, "Criticality gates outputs,
 * not navigation"; G7-6, "These are the only blocking cases"; US-MODEL-04 AC11, US-MODEL-05 AC5).
 * Situation: a model area on step 3 or System Scope whose view file is still loading, is missing or fails to load.
 * Expected: Continue, Generate and every other control on the page stay available.
 *
 * The component half (part 1 of the viewer step; the page half, on step 3 and System Scope, is part 2's, when the
 * view is mounted there on the approver's decision of P-V-CANVAS-UNREADABLE). In happy-dom, the kit's model area
 * (`@sovitech/ui`) on a page with a Continue and a Generate button:
 * - holding a view whose file is still loading (a view that has not answered yet);
 * - holding a view whose file failed to load or is missing (a missing file answers 404 at the route, the same
 *   failure to the view: it says "load", and the area keeps the model's document line with its stored 2.8 line);
 * - holding the real viewer (`@sovitech/viewer`) in a browser with no hardware graphics (happy-dom offers no WebGL
 *   context, so the viewer's own probe answers "none" and the view's chunk is never loaded): the area reads its
 *   served "Not available yet" line.
 * In each, both buttons are enabled, not busy and not inert, pressing them works, no dialog opens and the focus stays
 * where the owner left it. The view's own failures are proven in packages/viewer/src/model-view/ModelView.test.tsx,
 * and in Chromium in tests/proposed/model-view.test.ts. Every value is TEST data; nothing of the code under test is
 * replaced (no `vi.mock`).
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Button, ModelArea, type ModelAreaDocument, type ModelAreaViewSlot } from '@sovitech/ui/components';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { ModelViewer, type ModelViewLabels } from '@sovitech/viewer';

const DOCUMENT_ID = '0192f000-0000-7000-8000-0000000000a1';
const UNKNOWN = { text: 'Unknown', shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'Unknown' } } as const;
const DOCUMENT: ModelAreaDocument = {
  name: { valueId: `document:${DOCUMENT_ID}.fileName`, kind: 'record', text: 'TEST model 12.ifc', shape: 'value', parts: ['TEST model 12.ifc'] },
  stage: { valueId: `document:${DOCUMENT_ID}.stage`, kind: 'record', ...UNKNOWN },
  revision: { valueId: `document:${DOCUMENT_ID}.revision`, kind: 'record', ...UNKNOWN },
  status: {
    valueId: `document:${DOCUMENT_ID}.coverage`,
    kind: 'line',
    text: 'Not analysed: IFC model stored, not analysed',
    shape: 'value',
    lines: [{ id: 'not_analysed', kind: 'status_line', text: 'Not analysed: IFC model stored, not analysed' }],
  },
  labels: { stage: 'TEST Stage', revision: 'TEST Revision' },
};
const NO_GRAPHICS: DisplayObject = {
  valueId: `document:${DOCUMENT_ID}.modelView`,
  kind: 'line',
  text: 'Not available yet: TEST hardware graphics support in this browser',
  shape: 'missing',
  missing: 'not_available_yet',
  badge: { id: 'not_available_yet', label: 'Not available yet' },
};
const LABELS: ModelViewLabels = {
  toolbar: 'TEST View controls',
  actions: { turn_left: 'TEST a', turn_right: 'TEST b', tilt_up: 'TEST c', tilt_down: 'TEST d', zoom_in: 'TEST e', zoom_out: 'TEST f', home: 'TEST g' },
  keyHelp: 'TEST keys',
  loading: 'TEST Loading the model view',
};

afterEach(() => {
  cleanup();
});

/** A page with the area, a Continue and a Generate button after it. */
function page(view: (slot: ModelAreaViewSlot) => ReactNode, onContinue: () => void, onGenerate: () => void) {
  return (
    <main>
      <ModelArea heading="TEST Building model" state="viewable" document={DOCUMENT} view={{ render: view, noGraphics: { display: NO_GRAPHICS } }} />
      <Button variant="secondary" onClick={onGenerate}>
        TEST Generate
      </Button>
      <Button variant="primary" onClick={onContinue}>
        TEST Continue
      </Button>
    </main>
  );
}

/** Every control stays available: enabled, not busy, not inert, no dialog; pressing each works; the focus stays put. */
function everyControlAvailable(container: HTMLElement, pressed: { readonly onContinue: ReturnType<typeof vi.fn>; readonly onGenerate: ReturnType<typeof vi.fn> }): void {
  expect(container.querySelector('[inert], [aria-busy="true"], [aria-disabled="true"], dialog, [role="dialog"], [role="alertdialog"]')).toBeNull();
  for (const name of ['TEST Continue', 'TEST Generate']) {
    const button = screen.getByRole('button', { name });
    expect(button.hasAttribute('disabled'), name).toBe(false);
    button.focus();
    expect(document.activeElement, name).toBe(button);
    fireEvent.click(button);
  }
  expect(pressed.onContinue).toHaveBeenCalledTimes(1);
  expect(pressed.onGenerate).toHaveBeenCalledTimes(1);
}

/** A view that has not answered yet: its file is still loading. */
function Loading({ slot }: { readonly slot: ModelAreaViewSlot }) {
  return <div role="application" tabIndex={0} aria-labelledby={slot.labelledBy} data-testid="view-loading" />;
}

describe('G7-23 · rule 7 · G7-6 · US-MODEL-04 AC11 · US-MODEL-05 AC5 (component half): the model view never holds the page', () => {
  test('G7-23: while the view file is still loading, Continue, Generate and every other control stay available', () => {
    const pressed = { onContinue: vi.fn(), onGenerate: vi.fn() };
    const { container } = render(page((slot) => <Loading slot={slot} />, pressed.onContinue, pressed.onGenerate));
    expect(screen.getByTestId('view-loading')).toBeTruthy();
    everyControlAvailable(container, pressed);
  });

  test('G7-23: a view file that fails to load or is missing leaves the model\'s document line with its stored 2.8 line, never an empty area, and every control available', () => {
    const pressed = { onContinue: vi.fn(), onGenerate: vi.fn() };
    let given: ModelAreaViewSlot | undefined;
    const { container } = render(
      page(
        (slot) => {
          given = slot;
          return <Loading slot={slot} />;
        },
        pressed.onContinue,
        pressed.onGenerate,
      ),
    );
    const continueButton = screen.getByRole('button', { name: 'TEST Continue' });
    continueButton.focus();
    act(() => given?.onUnavailable('load'));
    expect(document.activeElement).toBe(continueButton);
    expect(screen.queryByTestId('view-loading')).toBeNull();
    expect(screen.getByRole('region', { name: 'TEST Building model' }).getAttribute('data-model-state')).toBe('model_stored');
    expect(container.querySelector(`[data-value-id="${DOCUMENT.status.valueId}"]`)?.textContent).toBe('Not analysed: IFC model stored, not analysed');
    everyControlAvailable(container, pressed);
  });

  test('G7-23 · G7-22 · D-03: the real viewer in a browser with no hardware graphics changes the area to its "Not available yet" line, and every control stays available', async () => {
    const pressed = { onContinue: vi.fn(), onGenerate: vi.fn() };
    const { container } = render(
      page((slot) => <ModelViewer src="/api/TEST/model-view" labelledBy={slot.labelledBy} labels={LABELS} onUnavailable={slot.onUnavailable} />, pressed.onContinue, pressed.onGenerate),
    );
    await waitFor(() => expect(screen.getByRole('region', { name: 'TEST Building model' }).getAttribute('data-model-state')).toBe('no_graphics'));
    expect(container.querySelector(`[data-value-id="${NO_GRAPHICS.valueId}"]`)?.textContent).toContain('Not available yet: TEST hardware graphics support in this browser');
    expect(container.querySelector('canvas')).toBeNull();
    everyControlAvailable(container, pressed);
  });
});
