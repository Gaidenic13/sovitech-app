/**
 * Keyboard camera controls for the bench (prompt 3 sections 8 and 11: "camera controls work from
 * the keyboard"; WCAG 2.2 AA, 2.1.1 Keyboard). The pointer controls are camera-controls' own; these
 * keys reach every camera move without a pointer:
 *
 * - arrow keys, held: orbit (left and right turn around the target, up and down tilt);
 * - plus and minus: move towards and away from the target;
 * - W, A, S and D: move the view across and along;
 * - Page Up and Page Down: the next storey up or down (the bench's storey stepper, no label);
 * - Home: the whole model again.
 *
 * A held arrow turns the camera at a fixed rate per second, applied once per frame, so the orbit is
 * the same whatever the frame rate and the runner can hold a key for a measured time.
 */
import type CameraControls from 'camera-controls';

/** Radians per second while an arrow key is held. */
export const ORBIT_RATE = Math.PI / 4;
/** How far one press of plus or minus moves, as a share of the distance to the target. */
const DOLLY_SHARE = 0.15;
/** How far one press of W, A, S or D moves, as a share of the distance to the target. */
const TRUCK_SHARE = 0.08;

export interface StoreyStepper {
  step(direction: 1 | -1): void;
  showAll(): void;
}

export class KeyboardCamera {
  readonly #held = new Set<string>();
  #last: number | undefined;
  #frame: number | undefined;

  constructor(
    private readonly element: HTMLElement,
    private readonly controls: CameraControls,
    private readonly storeys: StoreyStepper,
  ) {
    element.addEventListener('keydown', this.#onKeyDown);
    element.addEventListener('keyup', this.#onKeyUp);
    element.addEventListener('blur', this.#onBlur);
  }

  #onKeyDown = (event: KeyboardEvent): void => {
    const distance = this.controls.distance;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
        this.#held.add(event.key);
        this.#start();
        break;
      case '+':
      case '=':
        void this.controls.dolly(distance * DOLLY_SHARE, false);
        break;
      case '-':
      case '_':
        void this.controls.dolly(-distance * DOLLY_SHARE, false);
        break;
      case 'w':
      case 'W':
        void this.controls.forward(distance * TRUCK_SHARE, false);
        break;
      case 's':
      case 'S':
        void this.controls.forward(-distance * TRUCK_SHARE, false);
        break;
      case 'a':
      case 'A':
        void this.controls.truck(-distance * TRUCK_SHARE, 0, false);
        break;
      case 'd':
      case 'D':
        void this.controls.truck(distance * TRUCK_SHARE, 0, false);
        break;
      case 'PageUp':
        this.storeys.step(1);
        break;
      case 'PageDown':
        this.storeys.step(-1);
        break;
      case 'Home':
        this.storeys.showAll();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  #onKeyUp = (event: KeyboardEvent): void => {
    this.#held.delete(event.key);
  };

  #onBlur = (): void => {
    this.#held.clear();
  };

  #start(): void {
    if (this.#frame !== undefined) return;
    this.#last = undefined;
    this.#frame = requestAnimationFrame(this.#tick);
  }

  #tick = (now: number): void => {
    if (this.#held.size === 0) {
      this.#frame = undefined;
      return;
    }
    const seconds = this.#last === undefined ? 1 / 60 : (now - this.#last) / 1000;
    this.#last = now;
    const turn = ORBIT_RATE * seconds;
    const azimuth = axis(this.#held.has('ArrowRight'), this.#held.has('ArrowLeft'));
    const polar = axis(this.#held.has('ArrowUp'), this.#held.has('ArrowDown'));
    void this.controls.rotate(azimuth * turn, polar * turn, false);
    this.#frame = requestAnimationFrame(this.#tick);
  };
}

/** The direction two opposite keys give: one held, its sign; both or neither, none. */
function axis(negative: boolean, positive: boolean): -1 | 0 | 1 {
  if (negative === positive) return 0;
  return positive ? 1 : -1;
}
