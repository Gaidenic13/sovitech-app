/**
 * The bench page's script (docs/adr/0046-viewer-spike.md decisions 1, 3 and 4): one converted model
 * (`?model=/models/<name>.frag`) in That Open's components, measured by the runner
 * (tools/viewer-spike/run.ts) through `window.__viewerSpike`, which the page never renders.
 *
 * - That Open's network defaults are replaced: the Fragments worker is served from this origin
 *   (`/fragments-worker.mjs`), never fetched from a CDN, and no web-ifc WebAssembly is loaded at all,
 *   because the browser never parses an IFC file (prompt 3 section 8).
 * - Nothing read from the model is shown: no name, number, count or label, no selection, no hover,
 *   no grid labels; storeys are stepped through without labels (Page Up and Page Down).
 * - That Open's logo, which its renderer adds to the view by default, is removed.
 * - The scene's background is the brand's page colour, read from the tokens' custom property at
 *   run time, so no colour literal enters the scene (prompt 3 section 6).
 */
import * as OBC from '@thatopen/components';
import type { FragmentsModel } from '@thatopen/fragments';
import { Color } from 'three';
import { auditPage, auditScene, type PageAudit, type SceneAudit } from './audit';
import { KeyboardCamera, type StoreyStepper } from './keyboard';

/** Where the runner serves the Fragments worker (from @thatopen/fragments/dist/Worker). */
const WORKER_URL = '/fragments-worker.mjs';
/** The only place a model may come from: this origin's /models/ folder. */
const MODEL_PATH = /^\/models\/[A-Za-z0-9][A-Za-z0-9._-]*\.frag$/;

/** Times from the page's time origin (navigation start), in milliseconds. */
interface Marks {
  scriptStart: number;
  fetched?: number;
  loaded?: number;
  tilesReady?: number;
  firstFrame?: number;
}

interface StoreyStep {
  readonly direction: 1 | -1 | 'all';
  readonly pressed: number;
  readonly drawn: number;
  readonly visibleItems: number;
}

export interface ViewerSpikeState {
  phase: 'loading' | 'ready' | 'failed';
  failure?: string;
  marks: Marks;
  modelBytes?: number;
  trianglesAtFirstFrame?: number;
  storeys?: number;
  storeySteps: StoreyStep[];
  /** Frame times (performance.now()) while recording. */
  frames: number[];
  recording: boolean;
  renderer?: string;
  audit(): { scene: SceneAudit; page: PageAudit };
}

declare global {
  interface Window {
    __viewerSpike: ViewerSpikeState;
  }
}

const state: ViewerSpikeState = {
  phase: 'loading',
  marks: { scriptStart: performance.now() },
  storeySteps: [],
  frames: [],
  recording: false,
  audit: () => {
    throw new Error('not ready');
  },
};
window.__viewerSpike = state;

/** A colour from the brand tokens (packages/ui/src/tokens.css), read at run time. */
function tokenColour(name: string): Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (value === '') throw new Error(`token_missing ${name}`);
  return new Color(value);
}

function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/** The graphics backend Chromium reports (SwiftShader, or a GPU through ANGLE). */
function rendererName(canvas: HTMLCanvasElement): string {
  const gl = canvas.getContext('webgl2');
  if (gl === null) return 'unknown';
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name: unknown = info === null ? gl.getParameter(gl.RENDERER) : gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
  return typeof name === 'string' ? name : 'unknown';
}

interface SpatialNode {
  readonly localId?: number | null;
  readonly children?: readonly SpatialNode[] | null;
}

function descendants(node: SpatialNode, into: number[]): void {
  for (const child of node.children ?? []) {
    if (typeof child.localId === 'number') into.push(child.localId);
    descendants(child, into);
  }
}

function findItem(node: SpatialNode, localId: number): SpatialNode | undefined {
  if (node.localId === localId) return node;
  for (const child of node.children ?? []) {
    const found = findItem(child, localId);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Each storey's items, from the lowest storey to the highest, ordered by the height of their shapes
 * (never by a name or an elevation attribute, which the view profile does not keep).
 */
async function storeyGroups(model: FragmentsModel): Promise<number[][]> {
  const tree = (await model.getSpatialStructure()) as SpatialNode;
  const storeys = (await model.getItemsOfCategories([/^IFCBUILDINGSTOREY$/])).IFCBUILDINGSTOREY ?? [];
  const withShapes = new Set(await model.getItemsIdsWithGeometry());
  const groups: Array<{ items: number[]; base: number }> = [];
  for (const storey of storeys) {
    const node = findItem(tree, storey);
    if (node === undefined) continue;
    const items: number[] = [];
    descendants(node, items);
    const shaped = items.filter((id) => withShapes.has(id));
    if (shaped.length === 0) continue;
    const box = await model.getMergedBox(shaped);
    groups.push({ items: shaped, base: box.min.y });
  }
  return groups.sort((a, b) => a.base - b.base).map((group) => group.items);
}

async function start(): Promise<void> {
  const modelPath = new URLSearchParams(location.search).get('model') ?? '';
  if (!MODEL_PATH.test(modelPath)) throw new Error('model_path_refused');

  const view = document.getElementById('view');
  if (!(view instanceof HTMLDivElement)) throw new Error('view_missing');
  const help = document.getElementById('view-keys');

  const components = new OBC.Components();
  const world = components.get(OBC.Worlds).create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();
  world.scene = new OBC.SimpleScene(components);
  world.scene.setup();
  world.scene.three.background = tokenColour('--sov-bg');
  world.renderer = new OBC.SimpleRenderer(components, view);
  world.renderer.showLogo = false;
  world.renderer.logo?.remove();
  world.camera = new OBC.SimpleCamera(components);
  components.init();
  state.renderer = rendererName(world.renderer.three.domElement);

  world.renderer.onAfterUpdate.add(() => {
    if (state.recording) state.frames.push(performance.now());
  });

  const fragments = components.get(OBC.FragmentsManager);
  fragments.init(WORKER_URL);
  world.camera.controls.addEventListener('update', () => {
    void fragments.core.update();
  });

  const response = await fetch(modelPath);
  if (!response.ok) throw new Error('model_fetch_failed');
  const buffer = await response.arrayBuffer();
  state.modelBytes = buffer.byteLength;
  state.marks.fetched = performance.now();

  const model = await fragments.core.load(buffer, { modelId: 'viewer-spike', camera: world.camera.three });
  world.scene.three.add(model.object);
  state.marks.loaded = performance.now();

  await world.camera.controls.fitToBox(model.box, false);
  await fragments.core.update(true);
  state.marks.tilesReady = performance.now();
  await nextFrame();
  await nextFrame();
  state.marks.firstFrame = performance.now();
  state.trianglesAtFirstFrame = world.renderer.three.info.render.triangles;

  const groups = await storeyGroups(model);
  state.storeys = groups.length;
  let current = -1;
  const show = async (direction: 1 | -1 | 'all', pressed: number): Promise<void> => {
    if (direction === 'all') {
      current = -1;
      await model.setVisible(undefined, true);
    } else {
      current = Math.min(Math.max(current + direction, -1), groups.length - 1);
      const items = groups[current];
      await model.setVisible(undefined, items === undefined);
      if (items !== undefined) await model.setVisible(items, true);
    }
    await fragments.core.update(true);
    await nextFrame();
    const visibleItems = (await model.getItemsByVisibility(true)).length;
    state.storeySteps.push({ direction, pressed, drawn: performance.now(), visibleItems });
  };
  const stepper: StoreyStepper = {
    step: (direction) => void show(direction, performance.now()),
    showAll: () => {
      const pressed = performance.now();
      void world.camera.controls.fitToBox(model.box, false).then(() => show('all', pressed));
    },
  };
  new KeyboardCamera(view, world.camera.controls, stepper);

  state.audit = () => ({ scene: auditScene(world.scene.three), page: auditPage(view, help) });
  state.phase = 'ready';
}

start().catch((error: unknown) => {
  state.phase = 'failed';
  // A code only: a message could carry text from the model (rule 13).
  state.failure = error instanceof Error ? error.message.split(' ')[0] : 'unknown';
});
