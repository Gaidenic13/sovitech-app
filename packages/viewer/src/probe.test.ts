/**
 * The graphics probe (docs/build-log.md, the viewer step, item 4; the owner's answer of 2026-10-05, "with no GPU,
 * the model area reads 'Not available yet' instead of a slow view"; PRD section 11, D-35; ADR 0046 Findings 7 and
 * the sample's "The no-GPU decision is needed whatever the model's size").
 *
 * The probe's three answers, on a canvas factory that stands in for the browser's (the real browser's answers are
 * proven in tests/proposed/model-view.test.ts: Playwright's headless shell renders with SwiftShader, so it answers
 * "none" there):
 * - no WebGL 2 context with `failIfMajorPerformanceCaveat` (Chromium's answer when it would fall back to software):
 *   none, `no_context`;
 * - a context whose renderer is a software renderer, named: none, `software_renderer`;
 * - a context on a hardware renderer: hardware.
 * The context is always released, the canvas is never attached to the page, and no frame rate is measured.
 */
import { describe, expect, test } from 'vitest';
import { isSoftwareRenderer, probeGraphics, SOFTWARE_RENDERERS } from './probe';

const DEBUG_INFO = 'WEBGL_debug_renderer_info';
const LOSE_CONTEXT = 'WEBGL_lose_context';
const UNMASKED_RENDERER = 0x9246;
const RENDERER = 0x1f01;

interface FakeContext {
  readonly asked: Array<{ kind: string; attributes: unknown }>;
  released: number;
  attached: boolean;
}

/** A canvas factory whose `getContext` answers as told, recording what it was asked. */
function fakeCanvas(options: { context: boolean; unmasked?: string; masked?: string; throws?: boolean }): { create: () => HTMLCanvasElement; state: FakeContext } {
  const state: FakeContext = { asked: [], released: 0, attached: false };
  const gl = {
    RENDERER,
    getExtension(name: string): unknown {
      if (name === DEBUG_INFO) return options.unmasked === undefined ? null : { UNMASKED_RENDERER_WEBGL: UNMASKED_RENDERER };
      if (name === LOSE_CONTEXT) return { loseContext: () => (state.released += 1) };
      return null;
    },
    getParameter(parameter: number): unknown {
      if (parameter === UNMASKED_RENDERER) return options.unmasked;
      if (parameter === RENDERER) return options.masked ?? 'WebKit WebGL';
      return null;
    },
  };
  const canvas = {
    get isConnected() {
      return state.attached;
    },
    getContext(kind: string, attributes: unknown): unknown {
      if (options.throws === true) throw new Error('TEST getContext failed');
      state.asked.push({ kind, attributes });
      return options.context ? gl : null;
    },
  };
  return { create: () => canvas as unknown as HTMLCanvasElement, state };
}

describe('D-03 (the owner\'s "1 b", 2026-10-05) · PRD section 11 · ADR 0046 Finding 7: the graphics probe', () => {
  test('D-03 · R-078: no WebGL 2 context without a major performance caveat answers "none" (no context), and asks with failIfMajorPerformanceCaveat', () => {
    const { create, state } = fakeCanvas({ context: false });
    expect(probeGraphics(create)).toEqual({ kind: 'none', reason: 'no_context' });
    expect(state.asked).toEqual([{ kind: 'webgl2', attributes: expect.objectContaining({ failIfMajorPerformanceCaveat: true }) }]);
  });

  test.each([
    ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0)), SwiftShader driver)'],
    ['llvmpipe (LLVM 15.0.7, 256 bits)'],
    ['softpipe'],
    ['lavapipe (LLVM 16.0.6, 256 bits)'],
    ['Microsoft Basic Render Driver'],
    ['Google SwiftShader'],
    ['TEST Software Rasterizer'],
  ])('D-03 · R-078: a software renderer named "%s" answers "none" (software renderer), and the context is released', (name) => {
    const { create, state } = fakeCanvas({ context: true, unmasked: name });
    expect(probeGraphics(create)).toEqual({ kind: 'none', reason: 'software_renderer' });
    expect(state.released).toBe(1);
  });

  test('D-03 · R-078: where the browser hides the unmasked name, the masked RENDERER name is read, and a software name there answers "none"', () => {
    const { create, state } = fakeCanvas({ context: true, masked: 'TEST SwiftShader' });
    expect(probeGraphics(create)).toEqual({ kind: 'none', reason: 'software_renderer' });
    expect(state.released).toBe(1);
  });

  test('D-03 · R-078: a hardware renderer answers "hardware", the context is released, and the canvas was never attached to the page', () => {
    const { create, state } = fakeCanvas({ context: true, unmasked: 'ANGLE (Apple, ANGLE Metal Renderer: TEST GPU)' });
    expect(probeGraphics(create)).toEqual({ kind: 'hardware' });
    expect(state.released).toBe(1);
    expect(state.attached).toBe(false);
  });

  test('D-03 · R-078: a probe that throws answers "none" (probe failed), never a view', () => {
    const { create } = fakeCanvas({ context: true, throws: true });
    expect(probeGraphics(create)).toEqual({ kind: 'none', reason: 'probe_failed' });
  });

  test('D-03: the software renderers are matched by name, ignoring case, and a hardware name is not one', () => {
    expect(SOFTWARE_RENDERERS.length).toBeGreaterThanOrEqual(6);
    for (const name of ['swiftshader', 'LLVMPIPE', 'SoftPipe', 'Lavapipe', 'microsoft basic render driver', 'any software renderer']) expect(isSoftwareRenderer(name), name).toBe(true);
    for (const name of ['ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro)', 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'Mali-G78', 'WebKit WebGL'])
      expect(isSoftwareRenderer(name), name).toBe(false);
  });
});
