/**
 * The graphics probe: whether this browser offers hardware graphics for the model view (docs/build-log.md, the
 * viewer step, item 4; the owner's answer of 2026-10-05: "with no GPU, the model area reads 'Not available yet'
 * instead of a slow view"; PRD section 11, D-35; ADR 0046 Finding 7: software rendering is not usable for a large
 * model).
 *
 * It sits in the main bundle and runs before the view's chunk is fetched, on a canvas never attached to the page
 * (so the render test never sees it):
 * - it asks for a `webgl2` context with `failIfMajorPerformanceCaveat`, which Chromium refuses when it would fall
 *   back to software rendering;
 * - with a context, it reads the renderer's name (`WEBGL_debug_renderer_info` where offered, `RENDERER` otherwise)
 *   and treats a software renderer, named, as no hardware;
 * - it releases the context (`WEBGL_lose_context`).
 *
 * It never measures a frame rate (that would draw a slow view first, and would vary from run to run), and the app
 * has no way to override it: no setting, query parameter or environment variable. The renderer's name is read to
 * decide and never shown, stored or logged.
 */

/** The probe's answer. `none` names why, for the tests; the page says only what is missing. */
export type GraphicsProbe =
  | { readonly kind: 'hardware' }
  | { readonly kind: 'none'; readonly reason: 'no_context' | 'software_renderer' | 'probe_failed' };

/** Software renderers, by name: SwiftShader, llvmpipe, softpipe, lavapipe, Microsoft's basic driver, or any "Software". */
export const SOFTWARE_RENDERERS: readonly RegExp[] = [/swiftshader/iu, /llvmpipe/iu, /softpipe/iu, /lavapipe/iu, /microsoft basic render driver/iu, /software/iu];

/** Whether a renderer's name names a software renderer. */
export function isSoftwareRenderer(name: string): boolean {
  return SOFTWARE_RENDERERS.some((pattern) => pattern.test(name));
}

const CONTEXT_ATTRIBUTES: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true, antialias: false, depth: false, stencil: false, alpha: false };

function rendererName(gl: WebGL2RenderingContext): string {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name: unknown = info === null ? gl.getParameter(gl.RENDERER) : gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
  return typeof name === 'string' ? name : '';
}

/** Asks once, on a canvas the page never shows, and releases what it was given. */
export function probeGraphics(createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')): GraphicsProbe {
  try {
    const canvas = createCanvas();
    const gl = canvas.getContext('webgl2', CONTEXT_ATTRIBUTES);
    if (gl === null) return { kind: 'none', reason: 'no_context' };
    try {
      return isSoftwareRenderer(rendererName(gl)) ? { kind: 'none', reason: 'software_renderer' } : { kind: 'hardware' };
    } finally {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    return { kind: 'none', reason: 'probe_failed' };
  }
}

let answered: GraphicsProbe | undefined;

/** The probe's answer for this page: asked once, then kept (a later view of another model asks nothing again). */
export function graphicsOnThisPage(): GraphicsProbe {
  answered ??= probeGraphics();
  return answered;
}
