// @vitest-environment happy-dom
/**
 * G7-22 (new in the viewer step; docs/build-log.md, the viewer step, item 7; rule 7: "'Not available yet' never
 * appears alone. It names what is missing ... An empty card, a dash or a zero is never shown"; US-MODEL-05 AC4; the
 * owner's answer of 2026-10-05 on D-03, "with no GPU, the model area reads 'Not available yet'").
 * Situation: a model area that holds a stored model's view, on step 3 or System Scope, while the project's current IFC
 * model is still being converted, or its conversion failed, or the browser offers no hardware graphics (narrowed before
 * release after the review of part 1, V-1: in part 1 no page's model area holds a view, and step 3 shows a stored model
 * by its "Not analysed" line while it is converted, so the situation does not arise on a live page yet).
 * Expected: the area reads "Not available yet", naming what is missing, never an empty area.
 *
 * The component half (part 1 of the viewer step). It was written as the kit's component tests before the area's code
 * (packages/ui/src/components/ModelArea.test.tsx, titles "G7-22 ·") and folded here by the integrator. The view-model
 * half (the served lines, `packages/view-model/src/model-area`) and the page half (step 3 and System Scope) are part 2's,
 * when the area is served and mounted there on the approver's decision of P-V-CANVAS-UNREADABLE. In happy-dom, the
 * kit's model area (`@sovitech/ui`) with TEST display objects in rule 7's form:
 * - the conversion still running: "Not available yet: <file>, still being prepared", with no action and no partial model;
 * - the conversion failed: "Not available yet: <file>, could not be converted", with the action to upload a model;
 * - no hardware graphics: the served "Not available yet: <what is missing>" line, the model's document line beside it;
 * - the real viewer (`@sovitech/viewer`) in a browser with no hardware graphics (happy-dom offers no WebGL context, so
 *   the viewer's own probe answers "none"): the viewable area changes to that line;
 * - and the area itself refuses to render a bare "Not available yet" that names nothing, or a state with no line.
 * Every value is TEST data, valid under the contract's DisplayObjectSchema; nothing of the code under test is replaced.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { ModelArea, type ModelAreaDocument } from '@sovitech/ui/components';
import { DisplayObjectSchema, type DisplayObject } from '@sovitech/view-model/browser';
import { ModelViewer, type ModelViewLabels } from '@sovitech/viewer';

const DOCUMENT_ID = '0192f000-0000-7000-8000-0000000000c3';
const FILE_NAME = 'TEST model 22.ifc';
const UNKNOWN = { text: 'Unknown', shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'Unknown' } } as const;
const DOCUMENT: ModelAreaDocument = {
  name: { valueId: `document:${DOCUMENT_ID}.fileName`, kind: 'record', text: FILE_NAME, shape: 'value', parts: [FILE_NAME] },
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

/** Rule 7's form, served: "Not available yet: <what is missing>", the file name bound inside it. */
function notAvailable(text: string, parts: readonly string[] = []): DisplayObject {
  return {
    valueId: `document:${DOCUMENT_ID}.modelView`,
    kind: 'line',
    text,
    shape: 'missing',
    missing: 'not_available_yet',
    badge: { id: 'not_available_yet', label: 'Not available yet' },
    ...(parts.length === 0 ? {} : { parts: [...parts] }),
  };
}

const PREPARING = notAvailable(`Not available yet: ${FILE_NAME}, still being prepared`, [FILE_NAME]);
const FAILED = notAvailable(`Not available yet: ${FILE_NAME}, could not be converted`, [FILE_NAME]);
const NO_GRAPHICS = notAvailable('Not available yet: TEST hardware graphics support in this browser');
const LABELS: ModelViewLabels = {
  toolbar: 'TEST View controls',
  actions: { turn_left: 'TEST a', turn_right: 'TEST b', tilt_up: 'TEST c', tilt_down: 'TEST d', zoom_in: 'TEST e', zoom_out: 'TEST f', home: 'TEST g' },
  keyHelp: 'TEST keys',
  loading: 'TEST Loading the model view',
};
const HEADING = 'TEST Building model';

afterEach(() => {
  cleanup();
});

/** The area's own words, its heading aside: more than the badge alone, so never an empty area or a bare badge. */
function areaWords(region: HTMLElement): string {
  return (region.textContent ?? '').replace(HEADING, '').trim();
}

describe('G7-22 · rule 7 · US-MODEL-05 AC4 · D-03 (component half): a model area that cannot show the view says what is missing, never empty', () => {
  test('G7-22: the TEST display objects are valid under the contract', () => {
    for (const display of [PREPARING, FAILED, NO_GRAPHICS, DOCUMENT.name, DOCUMENT.stage, DOCUMENT.revision, DOCUMENT.status]) {
      expect(DisplayObjectSchema.safeParse(display).success, display.valueId).toBe(true);
    }
  });

  test('G7-22 · US-MODEL-05 AC4: the conversion still running reads "Not available yet: <file>, still being prepared", with no partial model', () => {
    const { container } = render(<ModelArea heading={HEADING} state="preparing" status={{ display: PREPARING }} document={DOCUMENT} />);
    const region = screen.getByRole('region', { name: HEADING });
    expect(region.getAttribute('data-model-state')).toBe('preparing');
    expect(container.querySelector(`[data-value-id="${PREPARING.valueId}"]`)?.textContent).toContain(`Not available yet: ${FILE_NAME}, still being prepared`);
    expect(areaWords(region).length).toBeGreaterThan('Not available yet'.length);
    expect(container.querySelector('canvas, img, video, object, embed, iframe, [role="application"]')).toBeNull();
  });

  test('G7-22 · US-MODEL-05 AC4: a failed conversion reads "Not available yet: <file>, could not be converted", with the action to upload a model', () => {
    const onPress = vi.fn();
    const { container } = render(<ModelArea heading={HEADING} state="failed" status={{ display: FAILED }} action={{ label: 'TEST Upload a model', onPress }} document={DOCUMENT} />);
    const region = screen.getByRole('region', { name: HEADING });
    expect(region.getAttribute('data-model-state')).toBe('failed');
    expect(container.querySelector(`[data-value-id="${FAILED.valueId}"]`)?.textContent).toContain(`Not available yet: ${FILE_NAME}, could not be converted`);
    expect(areaWords(region).length).toBeGreaterThan('Not available yet'.length);
    fireEvent.click(screen.getByRole('button', { name: 'TEST Upload a model' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(container.querySelector('canvas')).toBeNull();
  });

  test('G7-22 · D-03: no hardware graphics reads the served "Not available yet: <what is missing>" line, with the model\'s document line beside it', () => {
    const { container } = render(<ModelArea heading={HEADING} state="no_graphics" status={{ display: NO_GRAPHICS }} document={DOCUMENT} />);
    const region = screen.getByRole('region', { name: HEADING });
    expect(region.getAttribute('data-model-state')).toBe('no_graphics');
    expect(container.querySelector(`[data-value-id="${NO_GRAPHICS.valueId}"]`)?.textContent).toContain('Not available yet: TEST hardware graphics support in this browser');
    expect(container.querySelector(`[data-value-id="${DOCUMENT.name.valueId}"]`)?.textContent).toBe(FILE_NAME);
    expect(container.querySelector('canvas')).toBeNull();
  });

  test('G7-22 · D-03: the real viewer in a browser with no hardware graphics changes the viewable area to its "Not available yet" line, never an empty area', async () => {
    const { container } = render(
      <ModelArea
        heading={HEADING}
        state="viewable"
        document={DOCUMENT}
        view={{ render: (slot) => <ModelViewer src="/api/TEST/model-view" labelledBy={slot.labelledBy} labels={LABELS} onUnavailable={slot.onUnavailable} />, noGraphics: { display: NO_GRAPHICS } }}
      />,
    );
    const region = screen.getByRole('region', { name: HEADING });
    await waitFor(() => expect(region.getAttribute('data-model-state')).toBe('no_graphics'));
    expect(container.querySelector(`[data-value-id="${NO_GRAPHICS.valueId}"]`)?.textContent).toContain('Not available yet: TEST hardware graphics support in this browser');
    expect(container.querySelector(`[data-value-id="${DOCUMENT.name.valueId}"]`)?.textContent).toBe(FILE_NAME);
    expect(areaWords(region).length).toBeGreaterThan('Not available yet'.length);
    expect(container.querySelector('canvas')).toBeNull();
  });

  test('G7-22 · rule 7: the area refuses a bare "Not available yet" that names nothing, and a state with no line', () => {
    const bare = notAvailable('Not available yet');
    expect(() => render(<ModelArea heading={HEADING} state="preparing" status={{ line: { id: 'not_available_yet', kind: 'rule_line', text: 'Not available yet' } }} />)).toThrow(/names nothing/u);
    expect(() => render(<ModelArea heading={HEADING} state="preparing" status={{ display: { ...bare, badge: undefined, missing: undefined, shape: 'value' } }} />)).toThrow(/names nothing/u);
    expect(() => render(<ModelArea heading={HEADING} state="failed" action={{ label: 'TEST Upload a model', onPress: () => undefined }} />)).toThrow(/says nothing/u);
  });
});
