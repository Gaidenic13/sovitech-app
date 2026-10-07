/**
 * What the model view asks of the engine that draws it (./engine.ts: three.js, Fragments and camera-controls in
 * the lazily loaded chunk; a stub in the component tests). The view owns the canvas element, the keys and the
 * buttons; the engine owns the drawing.
 */
import type { SceneAudit } from '../audit';
import type { CameraAction } from './camera';

/** Why the view cannot be drawn: no hardware graphics (the renderer refused to start, or its context was lost), or its file did not load. */
export type ViewUnavailableReason = 'graphics' | 'load';

/** An engine that cannot start says why, so the area reads the right line. */
export class ViewUnavailableError extends Error {
  constructor(readonly reason: ViewUnavailableReason) {
    super(`view_unavailable_${reason}`);
    this.name = 'ViewUnavailableError';
  }
}

export interface EngineOptions {
  /** The view file's route on the app's own origin (`documents.modelView`), fetched with no cache. */
  readonly src: string;
  /** Aborted when the view unmounts or its file changes. */
  readonly signal: AbortSignal;
  /** prefers-reduced-motion: camera moves are instant, with no damping or easing. */
  readonly reducedMotion: boolean;
  /** Called when the WebGL context is lost after the view was drawn. */
  readonly onContextLost: () => void;
}

export interface ViewEngine {
  /** One camera move, from a key or a button. Nothing moves by itself. */
  move(action: CameraAction): void;
  setReducedMotion(reduced: boolean): void;
  /** The scene audit of everything drawn now (ifc-input 6.2.15): counts only. */
  audit(): SceneAudit;
  /** Releases the geometry, the Fragments worker, the controls and the WebGL context. */
  dispose(): void;
}

/** Starts an engine on the canvas and loads the view file; resolves once the whole model is drawn. */
export type CreateEngine = (canvas: HTMLCanvasElement, options: EngineOptions) => Promise<ViewEngine>;
