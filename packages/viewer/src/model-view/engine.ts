/**
 * The engine that draws a model view (docs/build-log.md, the viewer step, item 3, "The browser side"; ADR 0046's
 * recommendation, built on `@thatopen/fragments`, `three` and `camera-controls` alone: no `@thatopen/components`,
 * whose renderer also draws That Open's logo, Finding 2). It is in the lazily loaded chunk only (./entry.tsx).
 *
 * - **The file** is the stored model's converted view file (`documents.modelView`), fetched from the app's own origin
 *   with no cache, and opened whole by Fragments. The browser never opens an IFC file, and no web-ifc WebAssembly is
 *   loaded (prompt 3 section 8).
 * - **The Fragments worker** comes from the app's own origin: a static `?url` import the bundler emits beside the
 *   chunk (./fragments-worker.ts), never `FragmentsModels.getWorker()`, which fetches it from unpkg (ADR 0046
 *   Finding 1).
 * - **The scene** holds a camera, two white lights and the model's shapes (./scene-frame.ts). Every material
 *   Fragments makes is painted in the surface token as it is made (./colours.ts), never the model's own colour; no
 *   grid, label, sprite, text or helper is added, and Fragments is never asked for its grids, highlights or
 *   sections (R-080, R-082; ifc-input 6.2.15).
 * - **No picking**: no raycaster of ours, no hover handler, no highlight. camera-controls turns, tilts, zooms and pans
 *   the camera from the pointer (its own raycaster tests only its collider list, which stays empty).
 * - **Nothing moves by itself**: frames are drawn when the camera or the tiles change; with prefers-reduced-motion
 *   every move is instant (no damping, no easing).
 * - **Disposal** releases the controls, the model and its worker (Fragments ends a worker with its last model), and
 *   the WebGL context. A lost context says so (`onContextLost`), and the area reads its "Not available yet" line.
 *
 * Nothing here reads, logs or keeps anything from the model but its shapes; failures carry a reason code only.
 */
import CameraControls from 'camera-controls';
import { FragmentsModels, type BIMMaterial, type FragmentsModel } from '@thatopen/fragments';
import { Box3, Color, Matrix4, Quaternion, Raycaster, Sphere, Spherical, Vector2, Vector3, Vector4, WebGLRenderer, type Material, type Mesh } from 'three';
import { auditScene } from '../audit';
import { STEP, type CameraAction } from './camera';
import { readSceneColours } from './colours';
import { ViewUnavailableError, type CreateEngine, type EngineOptions, type ViewEngine } from './engine-types';
import { FRAGMENTS_WORKER_URL } from './fragments-worker';
import { buildSceneFrame } from './scene-frame';
import { wholeModel } from './settle';

/** The model id Fragments keys the loaded file by (one model per view). */
export const VIEW_MODEL_ID = 'sovitech-model-view';

/** The first view: a three-quarter view from above, then the whole model fitted to its bounding sphere. */
const INITIAL_AZIMUTH = Math.PI / 4;
const INITIAL_POLAR = Math.PI / 3;
/** camera-controls' own easing times (seconds) when motion is not reduced. */
const SMOOTH_TIME = 0.25;
const DRAGGING_SMOOTH_TIME = 0.125;

let controlsInstalled = false;

function installControls(): void {
  if (controlsInstalled) return;
  CameraControls.install({ THREE: { Box3, Matrix4, Quaternion, Raycaster, Sphere, Spherical, Vector2, Vector3, Vector4 } });
  controlsInstalled = true;
}

/** Paints one Fragments material in the surface token: the shaded material's colour, or the line drawing's. */
function paint(material: BIMMaterial, face: Color): void {
  if ('isLodMaterial' in material) {
    material.lodColor = face.clone();
    return;
  }
  material.color.copy(face);
}

function disposeMaterial(material: Material | Material[]): void {
  for (const item of Array.isArray(material) ? material : [material]) item.dispose();
}

export const createThreeEngine: CreateEngine = async (canvas: HTMLCanvasElement, options: EngineOptions): Promise<ViewEngine> => {
  installControls();
  const colours = readSceneColours(canvas);
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, failIfMajorPerformanceCaveat: true, powerPreference: 'high-performance' });
  } catch {
    throw new ViewUnavailableError('graphics');
  }
  const { scene, camera } = buildSceneFrame();
  const controls = new CameraControls(camera, canvas);
  const fragments = new FragmentsModels(FRAGMENTS_WORKER_URL);
  const face = new Color(colours.face);
  fragments.models.materials.list.onItemSet.add(({ value }) => paint(value, face));
  for (const material of fragments.models.materials.list.values()) paint(material, face);

  let model: FragmentsModel | undefined;
  let frame: number | undefined;
  let observer: ResizeObserver | undefined;
  let disposed = false;
  let reduced = options.reducedMotion;
  let dirty = true;

  const lost = (event: Event): void => {
    event.preventDefault();
    options.onContextLost();
  };
  canvas.addEventListener('webglcontextlost', lost);

  const release = (): void => {
    if (disposed) return;
    disposed = true;
    if (frame !== undefined) cancelAnimationFrame(frame);
    observer?.disconnect();
    canvas.removeEventListener('webglcontextlost', lost);
    controls.dispose();
    if (model === undefined) fragments.abort(VIEW_MODEL_ID);
    void fragments.dispose().catch(() => undefined);
    scene.traverse((object) => {
      const drawn = object as Partial<Mesh>;
      drawn.geometry?.dispose();
      if (drawn.material !== undefined) disposeMaterial(drawn.material);
    });
    renderer.dispose();
    renderer.forceContextLoss();
  };

  const setMotion = (reduce: boolean): void => {
    reduced = reduce;
    controls.smoothTime = reduce ? 0 : SMOOTH_TIME;
    controls.draggingSmoothTime = reduce ? 0 : DRAGGING_SMOOTH_TIME;
  };
  setMotion(reduced);

  try {
    let response: Response;
    try {
      response = await fetch(options.src, { cache: 'no-store', credentials: 'same-origin', signal: options.signal });
    } catch {
      throw new ViewUnavailableError('load');
    }
    if (!response.ok) throw new ViewUnavailableError('load');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (options.signal.aborted) throw new ViewUnavailableError('load');
    try {
      model = await fragments.load(bytes, { modelId: VIEW_MODEL_ID, camera });
    } catch {
      throw new ViewUnavailableError('load');
    }
    if (options.signal.aborted) throw new ViewUnavailableError('load');
    scene.add(model.object);
    const box = model.box;
    if (box.isEmpty()) throw new ViewUnavailableError('load');
    const sphere = box.getBoundingSphere(new Sphere());
    const radius = sphere.radius;
    camera.near = radius / 1000;
    camera.far = radius * 100;
    controls.minDistance = radius / 100;
    controls.maxDistance = radius * 20;
    camera.updateProjectionMatrix();

    const resize = (): void => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < 1 || height < 1) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      dirty = true;
    };
    resize();
    observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const shown = model;
    const changed = (): void => {
      dirty = true;
    };
    shown.tiles.onItemSet.add(changed);
    shown.tiles.onItemDeleted.add(changed);
    shown.onViewUpdated.add(changed);
    controls.addEventListener('update', () => {
      dirty = true;
      void fragments.update();
    });
    controls.addEventListener('rest', () => void fragments.update(true));

    // A three-quarter view from above, the whole model in frame (fitting to its sphere keeps the angle; fitting to
    // its box would turn the camera square to the box's nearest face).
    await controls.rotateTo(INITIAL_AZIMUTH, INITIAL_POLAR, false);
    await controls.fitToSphere(sphere, false);
    // camera-controls moves the camera on its next update; the first frame is drawn from the fitted place.
    controls.update(0);
    controls.saveState();
    // The whole model's tiles before the first frame: no partial model is ever shown (US-MODEL-05 AC4); one still
    // arriving when the wait runs out reads as a view that could not load (./settle.ts).
    await wholeModel(fragments, shown, options.signal);

    let last = performance.now();
    const tick = (now: number): void => {
      const seconds = (now - last) / 1000;
      last = now;
      if (controls.update(seconds)) dirty = true;
      if (dirty) {
        dirty = false;
        renderer.render(scene, camera);
      }
      frame = requestAnimationFrame(tick);
    };
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  } catch (error) {
    release();
    throw error instanceof ViewUnavailableError ? error : new ViewUnavailableError('load');
  }

  return {
    move(action: CameraAction): void {
      if (disposed) return;
      const ease = !reduced;
      const distance = controls.distance;
      switch (action) {
        case 'turn_left':
          void controls.rotate(STEP.turn, 0, ease);
          break;
        case 'turn_right':
          void controls.rotate(-STEP.turn, 0, ease);
          break;
        case 'tilt_up':
          void controls.rotate(0, -STEP.tilt, ease);
          break;
        case 'tilt_down':
          void controls.rotate(0, STEP.tilt, ease);
          break;
        case 'zoom_in':
          void controls.dolly(distance * STEP.zoomShare, ease);
          break;
        case 'zoom_out':
          void controls.dolly(-distance * STEP.zoomShare, ease);
          break;
        case 'pan_forward':
          void controls.forward(distance * STEP.panShare, ease);
          break;
        case 'pan_back':
          void controls.forward(-distance * STEP.panShare, ease);
          break;
        case 'pan_left':
          void controls.truck(-distance * STEP.panShare, 0, ease);
          break;
        case 'pan_right':
          void controls.truck(distance * STEP.panShare, 0, ease);
          break;
        case 'home':
          void controls.reset(ease);
          break;
      }
      dirty = true;
    },
    setReducedMotion: setMotion,
    audit: () => auditScene(scene),
    dispose: release,
  };
};
