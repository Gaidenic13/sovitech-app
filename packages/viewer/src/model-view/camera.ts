/**
 * The camera moves of the model view and the keys that make them (docs/build-log.md, the viewer step, item 5; the
 * phase 4 bench's keys, packages/viewer-spike/src/bench/keyboard.ts, minus storey stepping: R-080 and
 * US-MODEL-07 AC1 say no storey is isolated while model values cannot be stored, so Page Up and Page Down are not
 * bound).
 *
 * While the view has focus: the arrows turn (left, right) and tilt (up, down), plus and minus zoom, W, A, S and D
 * pan, Home shows the whole model again. Tab and Shift+Tab are never taken (WCAG 2.1.2), and a key held with
 * Control, Alt or Meta is left to the browser (WCAG 2.1.4). The toolbar's buttons make the same moves one press at
 * a time (WCAG 2.5.7: the single-pointer path for dragging).
 */

export const CAMERA_ACTIONS = ['turn_left', 'turn_right', 'tilt_up', 'tilt_down', 'zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'pan_forward', 'pan_back', 'home'] as const;
export type CameraAction = (typeof CAMERA_ACTIONS)[number];

/** The toolbar's buttons, in order: turn, tilt, zoom, then the whole model. Panning stays on the keys and the pointer. */
export const TOOLBAR_ACTIONS = ['turn_left', 'turn_right', 'tilt_up', 'tilt_down', 'zoom_in', 'zoom_out', 'home'] as const satisfies readonly CameraAction[];
export type ToolbarAction = (typeof TOOLBAR_ACTIONS)[number];

const KEYS: Readonly<Record<string, CameraAction>> = {
  ArrowLeft: 'turn_left',
  ArrowRight: 'turn_right',
  ArrowUp: 'tilt_up',
  ArrowDown: 'tilt_down',
  '+': 'zoom_in',
  '=': 'zoom_in',
  '-': 'zoom_out',
  _: 'zoom_out',
  '−': 'zoom_out',
  w: 'pan_forward',
  W: 'pan_forward',
  s: 'pan_back',
  S: 'pan_back',
  a: 'pan_left',
  A: 'pan_left',
  d: 'pan_right',
  D: 'pan_right',
  Home: 'home',
};

/** The keys of a key press that decide the move. */
export interface KeyPress {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
  readonly metaKey?: boolean;
}

/** The move a key press makes while the view has focus, or null for a key the view leaves alone. */
export function actionForKey(press: KeyPress): CameraAction | null {
  if (press.ctrlKey === true || press.altKey === true || press.metaKey === true) return null;
  return Object.hasOwn(KEYS, press.key) ? (KEYS[press.key] ?? null) : null;
}

/** How far one move goes. Angles in radians; distances as a share of the camera's distance to its target. */
export const STEP = {
  /** One press of an arrow or a turn button: a twelfth of a half turn. */
  turn: Math.PI / 12,
  tilt: Math.PI / 24,
  /** One press of plus or minus (the bench's 0.15). */
  zoomShare: 0.15,
  /** One press of W, A, S or D (the bench's 0.08). */
  panShare: 0.08,
} as const;
