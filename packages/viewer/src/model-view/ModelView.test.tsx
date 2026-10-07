/**
 * The model view, with a stubbed engine in place of three.js (docs/build-log.md, the viewer step, items 2, 3 and 5;
 * prompt 3 sections 8 and 11). The real engine draws in Chromium in tests/proposed/model-view.test.ts.
 *
 * - Keys and buttons (prompt 3 section 11, "The 3D and 2D views have keyboard camera controls"; WCAG 2.2 AA 2.1.1,
 *   2.1.2, 2.1.4, 2.4.7, 2.5.7): the view is one tab stop with a visible focus ring, the toolbar another; the keys
 *   act only while the view has focus; no storey stepping (R-080; US-MODEL-07 AC1).
 * - "view-provenance, closed · R-080, R-082" (a blocking test named after the gate's closed behaviour, not
 *   indexed): a click, hover or key selects nothing and sends no request; the stage holds the canvas and nothing
 *   else (no pin, label, scale bar, north mark or logo).
 * - G7-23 (component half; rule 7): a view still loading or failing to load holds nothing else on the page; it says
 *   so to the area (`onUnavailable`), which changes in place (packages/ui/src/components/ModelArea.test.tsx).
 * - Disposal: the engine is disposed on unmount, also when it finishes loading after the unmount.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { auditStage, type SceneAudit } from '../audit';
import type { CameraAction } from './camera';
import { ViewUnavailableError, type CreateEngine, type EngineOptions, type ViewEngine } from './engine-types';
import { ModelView, type ModelViewLabels } from './ModelView';

const LABELS: ModelViewLabels = {
  toolbar: 'TEST View controls',
  actions: {
    turn_left: 'TEST Turn left',
    turn_right: 'TEST Turn right',
    tilt_up: 'TEST Tilt up',
    tilt_down: 'TEST Tilt down',
    zoom_in: 'TEST Zoom in',
    zoom_out: 'TEST Zoom out',
    home: 'TEST Show the whole model',
  },
  keyHelp: 'TEST The arrow keys turn and tilt the view, plus and minus zoom, W, A, S and D move it, and Home shows the whole model.',
  loading: 'TEST Loading the model view',
};

const CLEAN: SceneAudit = { objects: 3, meshes: 1, sprites: 0, points: 0, texturedMaterials: 0, textGeometries: 0, pageElementsInScene: 0 };

interface Stub {
  readonly create: CreateEngine;
  readonly engine: ViewEngine & { readonly dispose: ReturnType<typeof vi.fn>; readonly setReducedMotion: ReturnType<typeof vi.fn> };
  readonly moves: CameraAction[];
  options(): EngineOptions;
  canvas(): HTMLCanvasElement;
  resolve(): Promise<void>;
  reject(error: unknown): Promise<void>;
  readonly created: { count: number };
}

function stubEngine(): Stub {
  const moves: CameraAction[] = [];
  const created = { count: 0 };
  let given: EngineOptions | undefined;
  let drawnOn: HTMLCanvasElement | undefined;
  let settle: { resolve: (engine: ViewEngine) => void; reject: (error: unknown) => void } | undefined;
  const engine = {
    move: (action: CameraAction) => void moves.push(action),
    setReducedMotion: vi.fn(),
    audit: () => CLEAN,
    dispose: vi.fn(),
  };
  return {
    create: (canvas, options) => {
      created.count += 1;
      drawnOn = canvas;
      given = options;
      return new Promise<ViewEngine>((resolve, reject) => {
        settle = { resolve, reject };
      });
    },
    engine,
    moves,
    created,
    options: () => {
      if (given === undefined) throw new Error('no engine was created');
      return given;
    },
    canvas: () => {
      if (drawnOn === undefined) throw new Error('no engine was created');
      return drawnOn;
    },
    resolve: async () => {
      await act(async () => settle?.resolve(engine));
    },
    reject: async (error) => {
      await act(async () => settle?.reject(error));
    },
  };
}

function view(stub: Stub, extra: { onUnavailable?: (reason: 'graphics' | 'load') => void; onReady?: (ready: { audit(): unknown }) => void } = {}) {
  return (
    <div>
      <p id="test-model-name">
        <span data-value-id="document:0192f000-0000-7000-8000-0000000000a1.fileName">TEST model 12.ifc</span>
      </p>
      <ModelView src="/api/TEST/model-view" labelledBy="test-model-name" labels={LABELS} createEngine={stub.create} onUnavailable={extra.onUnavailable ?? (() => undefined)} {...(extra.onReady === undefined ? {} : { onReady: extra.onReady })} />
    </div>
  );
}

function stage(): HTMLElement {
  return screen.getByRole('application', { name: /TEST model 12\.ifc/u });
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.reject(new Error('TEST no request may leave the view')));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('prompt 3 section 11 · R-162 · WCAG 2.2 AA: the view and its controls from the keyboard', () => {
  test('R-162 · WCAG 4.1.2: the view is one tab stop, named by the document line (aria-labelledby, never an aria-label with the file name) and described by the visible key help, which holds no digit', async () => {
    const stub = stubEngine();
    render(view(stub));
    await stub.resolve();
    const element = stage();
    expect(element.tabIndex).toBe(0);
    expect(element.getAttribute('aria-labelledby')).toBe('test-model-name');
    expect(element.hasAttribute('aria-label')).toBe(false);
    const help = document.getElementById(element.getAttribute('aria-describedby') ?? '');
    expect(help?.textContent).toBe(LABELS.keyHelp);
    expect(help?.className).toContain('sov-model-view__help');
    expect(help?.textContent).not.toMatch(/\p{N}/u);
  });

  test('WCAG 2.1.1 · R-080: while the view has focus, each key makes its move; arrows do not scroll the page; Page Up and Page Down step through no storey', async () => {
    const stub = stubEngine();
    render(view(stub));
    await stub.resolve();
    const element = stage();
    element.focus();
    const keys: Array<[string, CameraAction]> = [
      ['ArrowLeft', 'turn_left'],
      ['ArrowRight', 'turn_right'],
      ['ArrowUp', 'tilt_up'],
      ['ArrowDown', 'tilt_down'],
      ['+', 'zoom_in'],
      ['-', 'zoom_out'],
      ['w', 'pan_forward'],
      ['a', 'pan_left'],
      ['s', 'pan_back'],
      ['d', 'pan_right'],
      ['Home', 'home'],
    ];
    for (const [key, action] of keys) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      element.dispatchEvent(event);
      expect(event.defaultPrevented, key).toBe(true);
      expect(stub.moves.at(-1), key).toBe(action);
    }
    const before = stub.moves.length;
    for (const key of ['PageUp', 'PageDown', 'Tab', 'Escape']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      element.dispatchEvent(event);
      expect(event.defaultPrevented, key).toBe(false);
    }
    expect(stub.moves.length).toBe(before);
  });

  test('WCAG 2.1.4: the keys act only on the view; the same keys elsewhere on the page move nothing', async () => {
    const stub = stubEngine();
    render(
      <div>
        <button type="button">TEST elsewhere</button>
        {view(stub)}
      </div>,
    );
    await stub.resolve();
    const elsewhere = screen.getByRole('button', { name: 'TEST elsewhere' });
    elsewhere.focus();
    fireEvent.keyDown(elsewhere, { key: 'ArrowLeft' });
    fireEvent.keyDown(document.body, { key: 'w' });
    expect(stub.moves).toEqual([]);
  });

  test('WCAG 2.5.7 · prompt 3 section 11: the toolbar is one tab stop, the arrow keys move inside it, each button makes its move, and none is ever disabled', async () => {
    const stub = stubEngine();
    render(view(stub));
    const toolbar = screen.getByRole('toolbar', { name: 'TEST View controls' });
    const buttons = within(toolbar).getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(Object.values(LABELS.actions));
    expect(buttons.filter((button) => button.tabIndex === 0)).toHaveLength(1);
    for (const button of buttons) {
      expect(button.hasAttribute('disabled')).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBeNull();
    }
    await stub.resolve();
    const first = buttons[0] as HTMLButtonElement;
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons[1]);
    fireEvent.keyDown(document.activeElement as Element, { key: 'End' });
    expect(document.activeElement).toBe(buttons.at(-1));
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(buttons.at(-1));
    fireEvent.keyDown(document.activeElement as Element, { key: 'Home' });
    expect(document.activeElement).toBe(buttons[0]);
    expect(buttons.filter((button) => button.tabIndex === 0)).toEqual([buttons[0]]);
    for (const button of buttons) fireEvent.click(button);
    expect(stub.moves).toEqual(['turn_left', 'turn_right', 'tilt_up', 'tilt_down', 'zoom_in', 'zoom_out', 'home']);
  });

  test('WCAG 2.2 AA: the view, its toolbar and its key help have no axe violation', async () => {
    const stub = stubEngine();
    const { container } = render(view(stub));
    await stub.resolve();
    const results = await axe.run(container, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});

describe('view-provenance, closed · R-080, R-082 · US-MODEL-09 AC1 · US-MODEL-08 AC1 to AC3: the view selects nothing and shows nothing of its own', () => {
  test('US-MODEL-09 AC1: a click, a hover, a double click or a pointer on the view selects nothing, moves nothing by itself and sends no request', async () => {
    const stub = stubEngine();
    const { container } = render(view(stub));
    await stub.resolve();
    const element = stage();
    const canvas = stub.canvas();
    for (const target of [element, canvas]) {
      fireEvent.pointerOver(target);
      fireEvent.pointerMove(target);
      fireEvent.mouseOver(target);
      fireEvent.pointerDown(target);
      fireEvent.pointerUp(target);
      fireEvent.click(target);
      fireEvent.dblClick(target);
      fireEvent.contextMenu(target);
    }
    expect(stub.moves).toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(container.querySelector('[aria-selected="true"], [aria-pressed="true"], [role="dialog"], [role="tooltip"]')).toBeNull();
  });

  test('R-082 · US-MODEL-08 AC2, AC3 · ADR 0046 Finding 2: the stage holds one canvas and nothing else: no label, pin, scale bar, north mark, logo or text', async () => {
    const stub = stubEngine();
    render(view(stub));
    await stub.resolve();
    expect(auditStage(stage())).toEqual({ canvases: 1, otherElements: 0, marks: 0, text: '' });
    expect(stage().querySelector('canvas')).toBe(stub.canvas());
    expect(stub.canvas().getAttribute('aria-hidden')).toBe('true');
  });

  test('ifc-input 6.2.15: a ready view hands its scene and stage audits to the caller who asks', async () => {
    const stub = stubEngine();
    const onReady = vi.fn();
    render(view(stub, { onReady }));
    await stub.resolve();
    expect(onReady).toHaveBeenCalledTimes(1);
    const ready = onReady.mock.calls[0]?.[0] as { audit(): { scene: SceneAudit; stage: unknown } };
    expect(ready.audit()).toEqual({ scene: CLEAN, stage: { canvases: 1, otherElements: 0, marks: 0, text: '' } });
  });
});

describe('G7-23 (component half) · rule 7 · US-MODEL-05 AC4: loading, failing and losing the context', () => {
  test('US-MODEL-05 AC4: while the file loads the view shows its loading line beside the stage, not a partial model, and the engine is given the file route, a signal and the motion preference', async () => {
    const stub = stubEngine();
    render(view(stub));
    const root = stage().closest('.sov-model-view');
    expect(root?.getAttribute('data-view-state')).toBe('loading');
    expect(screen.getByRole('progressbar', { name: LABELS.loading })).toBeTruthy();
    expect(stage().contains(screen.getByRole('progressbar'))).toBe(false);
    expect(stub.options()).toMatchObject({ src: '/api/TEST/model-view', reducedMotion: false });
    expect(stub.options().signal.aborted).toBe(false);
    await stub.resolve();
    expect(root?.getAttribute('data-view-state')).toBe('ready');
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  test('G7-23 · US-MODEL-04 AC11: a file that fails to load says "load"; a renderer that cannot start says "graphics"; anything else that fails says "load"', async () => {
    for (const [error, reason] of [
      [new ViewUnavailableError('load'), 'load'],
      [new ViewUnavailableError('graphics'), 'graphics'],
      [new Error('TEST unexpected'), 'load'],
    ] as const) {
      const stub = stubEngine();
      const onUnavailable = vi.fn();
      const { unmount } = render(view(stub, { onUnavailable }));
      await stub.reject(error);
      expect(onUnavailable).toHaveBeenCalledWith(reason);
      unmount();
    }
  });

  test('D-03 · the viewer step, item 3: a lost WebGL context says "graphics", so the area reads its "Not available yet" line', async () => {
    const stub = stubEngine();
    const onUnavailable = vi.fn();
    render(view(stub, { onUnavailable }));
    await stub.resolve();
    act(() => stub.options().onContextLost());
    expect(onUnavailable).toHaveBeenCalledWith('graphics');
  });

  test('G2-8 · WCAG 2.3.3: with prefers-reduced-motion the engine moves the camera without easing, and follows a change of the preference', async () => {
    let listener: ((event: { matches: boolean }) => void) | undefined;
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('reduce'),
          media: query,
          addEventListener: (_type: string, handler: (event: { matches: boolean }) => void) => (listener = handler),
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    );
    const stub = stubEngine();
    render(view(stub));
    expect(stub.options().reducedMotion).toBe(true);
    await stub.resolve();
    act(() => listener?.({ matches: false }));
    expect(stub.engine.setReducedMotion).toHaveBeenCalledWith(false);
  });
});

describe('D-03 · R-078 · US-MODEL-05: the viewer step, item 3: everything is disposed on unmount', () => {
  test('D-03 · R-078: the engine is disposed on unmount, and its signal aborted', async () => {
    const stub = stubEngine();
    const { unmount } = render(view(stub));
    await stub.resolve();
    const signal = stub.options().signal;
    unmount();
    expect(stub.engine.dispose).toHaveBeenCalledTimes(1);
    expect(signal.aborted).toBe(true);
  });

  test('D-03 · R-078 · rule 7: an engine that finishes loading after the unmount is disposed at once, and says nothing to the area', async () => {
    const stub = stubEngine();
    const onUnavailable = vi.fn();
    const onReady = vi.fn();
    const { unmount } = render(view(stub, { onUnavailable, onReady }));
    unmount();
    await stub.resolve();
    expect(stub.engine.dispose).toHaveBeenCalledTimes(1);
    expect(onReady).not.toHaveBeenCalled();
    expect(onUnavailable).not.toHaveBeenCalled();
  });

  test('D-03 · R-078 · rule 7 · US-MODEL-05: each engine draws on a fresh canvas: a disposed engine\'s canvas (its context released) is removed and never drawn on again', async () => {
    const stub = stubEngine();
    const { rerender } = render(view(stub));
    await stub.resolve();
    const first = stub.canvas();
    rerender(
      <div>
        <p id="test-model-name">TEST model 345.ifc</p>
        <ModelView src="/api/TEST/other-model-view" labelledBy="test-model-name" labels={LABELS} createEngine={stub.create} onUnavailable={() => undefined} />
      </div>,
    );
    const second = stub.canvas();
    expect(second).not.toBe(first);
    expect(first.isConnected).toBe(false);
    const stageElement = document.querySelector('.sov-model-view__stage');
    expect(stageElement?.querySelectorAll('canvas')).toHaveLength(1);
    expect(stageElement?.querySelector('canvas')).toBe(second);
    expect(second.className).toBe('sov-model-view__canvas');
    expect(second.getAttribute('aria-hidden')).toBe('true');
  });

  test('D-03 · R-078 · US-MODEL-05: a new file route starts a new engine and disposes the old one', async () => {
    const stub = stubEngine();
    const { rerender } = render(view(stub));
    await stub.resolve();
    rerender(
      <div>
        <p id="test-model-name">TEST model 345.ifc</p>
        <ModelView src="/api/TEST/other-model-view" labelledBy="test-model-name" labels={LABELS} createEngine={stub.create} onUnavailable={() => undefined} />
      </div>,
    );
    expect(stub.engine.dispose).toHaveBeenCalledTimes(1);
    expect(stub.created.count).toBe(2);
    expect(stub.options().src).toBe('/api/TEST/other-model-view');
  });
});
