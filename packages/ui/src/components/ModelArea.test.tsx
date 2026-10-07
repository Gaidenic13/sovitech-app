/**
 * The model area's states (docs/build-log.md, the viewer step, items 2, 4 and 5; UD-46; US-MODEL-04, US-MODEL-05;
 * the owner's answer of 2026-10-05, D-03 "1 b"). Part 1: the kit's area is built and proven here, and mounted on no
 * live page with a view (step 3 keeps its two present states through it; part 2 mounts the view).
 *
 * - G7-22 (component half; rule 7: "'Not available yet' never appears alone. It names what is missing ... An empty
 *   card, a dash or a zero is never shown"): while the project's current IFC model is still being converted, its
 *   conversion failed, or the browser offers no hardware graphics, the area reads "Not available yet", naming what
 *   is missing, never an empty area. Its case file, tests/guardrails/G7-22.test.tsx, holds these tests folded by the
 *   integrator (indexed at guardrails 1.11); the view-model half (the served lines) and the page half are part 2's.
 * - G7-23 (component half; rule 7, "Criticality gates outputs, not navigation"; G7-6): its case file,
 *   tests/guardrails/G7-23.test.tsx, renders this area on a page with Continue and Generate.
 * - G2-14 (component half) with G2-7: the area's document line shows the served file name as served (the API serves
 *   it without bidirectional or format controls: apps/api/src/documents/file-names.ts), in its value element, and
 *   the view takes its accessible name from that element, never from an `aria-label` holding the file name.
 *
 * Every value is TEST data, valid under the contract's DisplayObjectSchema.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DisplayObjectSchema, type DisplayObject } from '@sovitech/view-model/browser';
import { ModelArea, type ModelAreaDocument, type ModelAreaViewSlot } from './ModelArea';

afterEach(cleanup);

const DOC_A = '0192f000-0000-7000-8000-0000000000a1';
const DOC_B = '0192f000-0000-7000-8000-0000000000b2';

function nameOf(documentId: string, text: string): DisplayObject {
  return { valueId: `document:${documentId}.fileName`, kind: 'record', text, shape: 'value', parts: [text] };
}

function unknownOf(documentId: string, field: 'stage' | 'revision'): DisplayObject {
  return { valueId: `document:${documentId}.${field}`, kind: 'record', text: 'Unknown', shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'Unknown' } };
}

function storedOf(documentId: string): DisplayObject {
  return {
    valueId: `document:${documentId}.coverage`,
    kind: 'line',
    text: 'Not analysed: IFC model stored, not analysed',
    shape: 'value',
    lines: [{ id: 'not_analysed', kind: 'status_line', text: 'Not analysed: IFC model stored, not analysed' }],
  };
}

function documentOf(documentId: string, text: string): ModelAreaDocument {
  return { name: nameOf(documentId, text), stage: unknownOf(documentId, 'stage'), revision: unknownOf(documentId, 'revision'), status: storedOf(documentId), labels: { stage: 'TEST Stage', revision: 'TEST Revision' } };
}

const DOCUMENT_A = documentOf(DOC_A, 'TEST model 12.ifc');
const DOCUMENT_B = documentOf(DOC_B, 'TEST model 345.ifc');

/** rule 7's form, served: "Not available yet: <missing>", bound because the file name may hold digits. */
function notAvailable(valueId: string, text: string, parts: readonly string[] = []): DisplayObject {
  return {
    valueId,
    kind: 'line',
    text,
    shape: 'missing',
    missing: 'not_available_yet',
    badge: { id: 'not_available_yet', label: 'Not available yet' },
    ...(parts.length === 0 ? {} : { parts: [...parts] }),
  };
}

const PREPARING = notAvailable(`document:${DOC_A}.modelView`, 'Not available yet: TEST model 12.ifc, still being prepared', ['TEST model 12.ifc']);
const FAILED = notAvailable(`document:${DOC_A}.modelView`, 'Not available yet: TEST model 12.ifc, could not be converted', ['TEST model 12.ifc']);
const NO_GRAPHICS = notAvailable(`document:${DOC_A}.modelView`, 'Not available yet: TEST hardware graphics support in this browser');

const UPLOAD = { label: 'TEST Upload a model', onPress: () => undefined };

/** The kit's WCAG 2.2 AA rules in happy-dom. Contrast needs layout, so it is read on the live page (e2e, part 2). */
async function axeViolations(container: Element): Promise<string[]> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`);
}

/** A stand-in for the viewer: it shows nothing until told, and says it cannot draw when asked (`@sovitech/viewer` is the real one). */
function TestView({ slot, onSlot }: { readonly slot: ModelAreaViewSlot; readonly onSlot?: (slot: ModelAreaViewSlot) => void }) {
  onSlot?.(slot);
  return <div data-testid="test-view" aria-labelledby={slot.labelledBy} role="application" tabIndex={0} />;
}

test('WCAG 2.2 AA · G7-22: the axe helper reads this DOM: an unnamed button and a region named by nothing fail it', async () => {
  const { container } = render(
    <div>
      <button type="button" />
      <section aria-labelledby="missing-heading" role="application" />
    </div>,
  );
  const violations = await axeViolations(container);
  expect(violations.some((violation) => violation.startsWith('button-name'))).toBe(true);
});

test('G7-22 · G2-7 · DR-15: the TEST display objects are valid under the contract', () => {
  for (const display of [PREPARING, FAILED, NO_GRAPHICS, ...Object.values(DOCUMENT_A).filter((item): item is DisplayObject => 'valueId' in item)]) {
    expect(DisplayObjectSchema.safeParse(display).success, display.valueId).toBe(true);
  }
});

describe('G7-22 (component half) · rule 7 · US-MODEL-05 AC4: a model area that cannot show the view says what is missing, never empty', () => {
  test('G7-22 · US-MODEL-05 AC4: the conversion still running reads "Not available yet: <file>, still being prepared", bound, with no action and no partial model', async () => {
    const { container } = render(<ModelArea heading="TEST Building model" state="preparing" status={{ display: PREPARING }} document={DOCUMENT_A} />);
    const region = screen.getByRole('region', { name: 'TEST Building model' });
    expect(region.getAttribute('data-model-state')).toBe('preparing');
    const line = container.querySelector(`[data-value-id="${PREPARING.valueId}"]`);
    expect(line?.textContent).toContain('Not available yet: TEST model 12.ifc, still being prepared');
    expect(within(region).queryByRole('button')).toBeNull();
    expect(container.querySelector('canvas, img, video, object, embed, iframe, [role="application"]')).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  test('G7-22 · US-MODEL-05 AC4: a failed conversion reads "Not available yet: <file>, could not be converted", with the action to upload another export', async () => {
    const onPress = vi.fn();
    const { container } = render(<ModelArea heading="TEST Building model" state="failed" status={{ display: FAILED }} action={{ label: 'TEST Upload a model', onPress }} document={DOCUMENT_A} />);
    expect(container.querySelector(`[data-value-id="${FAILED.valueId}"]`)?.textContent).toContain('could not be converted');
    fireEvent.click(screen.getByRole('button', { name: 'TEST Upload a model' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(container.querySelector('canvas')).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  test('G7-22 · D-03: no hardware graphics reads "Not available yet: <what is missing>" with no action, and the model\'s document line stays beside it', async () => {
    const { container } = render(<ModelArea heading="TEST Building model" state="no_graphics" status={{ display: NO_GRAPHICS }} document={DOCUMENT_A} />);
    expect(container.querySelector(`[data-value-id="${NO_GRAPHICS.valueId}"]`)?.textContent).toContain('Not available yet: TEST hardware graphics support in this browser');
    expect(container.querySelector(`[data-value-id="${DOCUMENT_A.name.valueId}"]`)?.textContent).toBe('TEST model 12.ifc');
    expect(screen.queryByRole('button')).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  test('G7-22 · D-03: a viewable model whose view finds no hardware graphics changes to the served "Not available yet" line, keeps the document line, and unmounts the view', () => {
    let slot: ModelAreaViewSlot | undefined;
    const { container } = render(
      <ModelArea
        heading="TEST Building model"
        state="viewable"
        document={DOCUMENT_A}
        view={{ render: (given) => <TestView slot={given} onSlot={(value) => (slot = value)} />, noGraphics: { display: NO_GRAPHICS } }}
      />,
    );
    expect(screen.getByTestId('test-view')).toBeTruthy();
    act(() => slot?.onUnavailable('graphics'));
    expect(screen.queryByTestId('test-view')).toBeNull();
    const region = screen.getByRole('region', { name: 'TEST Building model' });
    expect(region.getAttribute('data-model-state')).toBe('no_graphics');
    expect(container.querySelector(`[data-value-id="${NO_GRAPHICS.valueId}"]`)?.textContent).toContain('Not available yet:');
    expect(container.querySelector(`[data-value-id="${DOCUMENT_A.name.valueId}"]`)).not.toBeNull();
  });

  test('G7-22 · rule 7: every state of the area shows words; a bare "Not available yet" naming nothing is refused', () => {
    const states = [
      <ModelArea key="preparing" heading="TEST Building model" state="preparing" status={{ display: PREPARING }} />,
      <ModelArea key="failed" heading="TEST Building model" state="failed" status={{ display: FAILED }} action={UPLOAD} />,
      <ModelArea key="graphics" heading="TEST Building model" state="no_graphics" status={{ display: NO_GRAPHICS }} document={DOCUMENT_A} />,
      <ModelArea key="viewable" heading="TEST Building model" state="viewable" document={DOCUMENT_A} view={{ render: (given) => <TestView slot={given} />, noGraphics: { display: NO_GRAPHICS } }} />,
    ];
    for (const element of states) {
      const { container, unmount } = render(element);
      const words = (container.textContent ?? '').replace('TEST Building model', '').trim();
      expect(words.length, element.key ?? '').toBeGreaterThan('Not available yet'.length);
      unmount();
    }
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const bare = notAvailable(`document:${DOC_A}.modelView`, 'Not available yet');
      expect(() => render(<ModelArea heading="TEST Building model" state="preparing" status={{ line: { id: 'not_available_yet', kind: 'rule_line', text: 'Not available yet' } }} />)).toThrow(/names nothing/u);
      expect(() => render(<ModelArea heading="TEST Building model" state="preparing" status={{ display: { ...bare, badge: undefined, missing: undefined, shape: 'value' } }} />)).toThrow(/names nothing/u);
      expect(() => render(<ModelArea heading="TEST Building model" state="preparing" />)).toThrow(/says nothing/u);
      expect(() => render(<ModelArea heading="TEST Building model" state="viewable" document={DOCUMENT_A} />)).toThrow(/view/u);
    } finally {
      quiet.mockRestore();
    }
  });
});

// G7-23 (component half): the area's view still loading, missing or failing to load holds no other control of the page.
// Its case file is tests/guardrails/G7-23.test.tsx (with the real viewer in a browser with no hardware graphics).

describe('G2-14 (component half) · G2-7 · US-MODEL-04 AC1: the view names its model as Documents does', () => {
  test('G2-14 · G2-7: the document line shows the served name in its value element, isolated, exactly as served; Stage and Revision as served, with their one badge; the stored 2.8 line', () => {
    const { container } = render(
      <ModelArea heading="TEST Building model" state="viewable" document={DOCUMENT_A} view={{ render: (slot) => <TestView slot={slot} />, noGraphics: { display: NO_GRAPHICS } }} />,
    );
    const name = container.querySelector(`[data-value-id="${DOCUMENT_A.name.valueId}"]`);
    expect(name?.textContent).toBe('TEST model 12.ifc');
    expect(name?.querySelector('bdi')?.textContent).toBe('TEST model 12.ifc');
    expect(name?.textContent).not.toMatch(/[\p{Bidi_Control}\p{Cf}]/u);
    for (const display of [DOCUMENT_A.stage, DOCUMENT_A.revision]) {
      const element = container.querySelector(`[data-value-id="${display.valueId}"]`);
      expect(element?.textContent).toContain('Unknown');
    }
    expect(screen.getByText('TEST Stage')).toBeTruthy();
    expect(screen.getByText('TEST Revision')).toBeTruthy();
    expect(container.querySelector(`[data-value-id="${DOCUMENT_A.status.valueId}"]`)?.textContent).toBe('Not analysed: IFC model stored, not analysed');
  });

  test('G2-14 · R-162: the view takes its accessible name from the document line by aria-labelledby; no element holds the file name in an aria-label', () => {
    const { container } = render(
      <ModelArea heading="TEST Building model" state="viewable" document={DOCUMENT_A} view={{ render: (slot) => <TestView slot={slot} />, noGraphics: { display: NO_GRAPHICS } }} />,
    );
    const view = screen.getByTestId('test-view');
    const labelledBy = view.getAttribute('aria-labelledby') ?? '';
    expect(labelledBy).not.toBe('');
    expect(document.getElementById(labelledBy)?.textContent).toContain('TEST model 12.ifc');
    expect(screen.getByRole('application', { name: /TEST model 12\.ifc/u })).toBe(view);
    for (const element of container.querySelectorAll('[aria-label]')) expect(element.getAttribute('aria-label')).not.toContain('TEST model');
  });

  test('WCAG 2.2 AA: the viewable area with its document line has no axe violation', async () => {
    const { container } = render(
      <ModelArea heading="TEST Building model" state="viewable" document={DOCUMENT_A} view={{ render: (slot) => <TestView slot={slot} />, noGraphics: { display: NO_GRAPHICS } }} />,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('prompt 3 5.2 "Several models" · R-162: one model shown at a time, chosen by its file name', () => {
  function Chooser({ onChoose }: { readonly onChoose: (id: string) => void }) {
    const [selected, setSelected] = useState(DOC_A);
    const document = selected === DOC_A ? DOCUMENT_A : DOCUMENT_B;
    return (
      <ModelArea
        heading="TEST Building model"
        state="viewable"
        document={document}
        chooser={{
          label: 'TEST Models',
          models: [
            { id: DOC_A, name: DOCUMENT_A.name },
            { id: DOC_B, name: DOCUMENT_B.name },
          ],
          selected,
          onChoose: (id) => {
            onChoose(id);
            setSelected(id);
          },
        }}
        view={{ render: (slot) => <TestView slot={slot} />, noGraphics: { display: NO_GRAPHICS } }}
      />
    );
  }

  test('R-162 · prompt 3 5.2: the current models are listed by their bound file names in the order given, the first shown; choosing another shows its document line and asks nothing of the server', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const onChoose = vi.fn();
    const { container } = render(<Chooser onChoose={onChoose} />);
    const list = screen.getByRole('listbox', { name: 'TEST Models' });
    const options = within(list).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['TEST model 12.ifc', 'TEST model 345.ifc']);
    expect(options[0]?.getAttribute('aria-selected')).toBe('true');
    for (const option of options) expect(option.querySelector('[data-value-id]')).not.toBeNull();
    fireEvent.click(options[1] as HTMLElement);
    expect(onChoose).toHaveBeenCalledWith(DOC_B);
    const shown = container.querySelector('.sov-model-area__document [data-value-id$=".fileName"]');
    expect(shown?.textContent).toBe('TEST model 345.ifc');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    expect(await axeViolations(container)).toEqual([]);
  });

  test('R-080: with one current model there is no chooser', () => {
    render(<ModelArea heading="TEST Building model" state="viewable" document={DOCUMENT_A} view={{ render: (slot) => <TestView slot={slot} />, noGraphics: { display: NO_GRAPHICS } }} />);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('DR-15 · the phase 3 and 4 states keep their markup (step 3 moves onto this area with no visible change)', () => {
  const NO_MODEL_LINE = { id: 'not_available_yet_named', kind: 'rule_line', text: 'Not available yet: TEST IFC model of the building' } as const;
  test('US-MODEL-05 AC1: no model stored keeps its icon, heading, line and action, and nothing of the view', async () => {
    const { container } = render(<ModelArea heading="TEST Building model" state="no_model" status={{ line: NO_MODEL_LINE }} action={UPLOAD} />);
    const region = screen.getByRole('region', { name: 'TEST Building model' });
    expect([...region.children].map((child) => child.className)).toEqual(['sov-model-area__icon', 'sov-heading-group', 'sov-model-area__status', 'sov-button']);
    expect(container.querySelector('.sov-model-area__document, [role="listbox"], [role="application"]')).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });
});
