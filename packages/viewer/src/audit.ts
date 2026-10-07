/**
 * What the model view checks about itself (prompt 3 section 8, "The viewer is a view of a document"; ifc-input
 * 6.2.15, the gap it names: text drawn in a WebGL scene or a texture is invisible to a render test that reads page
 * elements; ADR 0046 decision 4, the bench's checks, moved here from packages/viewer-spike/src/bench/audit.ts).
 *
 * - The scene audit walks everything three.js would draw and counts whatever could carry text: a sprite, points
 *   (drawn with a texture as labels by some libraries), a material with a texture (in a map slot or a shader
 *   uniform), text geometry, and a page element placed by the scene (a CSS2D or CSS3D object).
 * - The stage audit counts what sits in the view's stage beside its one canvas: a label, a logo (That Open's
 *   renderer adds one by default: ADR 0046 Finding 2), an overlay. The stage holds the canvas and nothing else.
 *
 * Both return counts only. They are exported for tests (`@sovitech/viewer/testing`) and run by the view on itself
 * when a test asks (`ModelViewReady.audit`); nothing is logged.
 */
import type { Material, Object3D } from 'three';

export interface SceneAudit {
  readonly objects: number;
  readonly meshes: number;
  readonly sprites: number;
  readonly points: number;
  readonly texturedMaterials: number;
  readonly textGeometries: number;
  readonly pageElementsInScene: number;
}

export interface StageAudit {
  /** Canvases in the stage (one: the view's). */
  readonly canvases: number;
  /** Every other element in the stage, shown or not (none: no label, logo or overlay). */
  readonly otherElements: number;
  /** Images and drawings in the stage (none: no third-party mark). */
  readonly marks: number;
  /** Text in the stage (none). */
  readonly text: string;
}

const TEXTURE_SLOTS = ['map', 'alphaMap', 'emissiveMap', 'lightMap', 'aoMap', 'bumpMap', 'normalMap', 'specularMap', 'envMap', 'matcap', 'displacementMap', 'roughnessMap', 'metalnessMap', 'gradientMap'] as const;

function isTexture(value: unknown): boolean {
  return typeof value === 'object' && value !== null && (value as { isTexture?: unknown }).isTexture === true;
}

function hasTexture(material: Material): boolean {
  const slots = material as unknown as Record<string, unknown>;
  if (TEXTURE_SLOTS.some((slot) => slots[slot] !== null && slots[slot] !== undefined)) return true;
  const uniforms = (material as unknown as { uniforms?: Record<string, { value?: unknown } | undefined> }).uniforms;
  if (uniforms === undefined) return false;
  return Object.values(uniforms).some((uniform) => isTexture(uniform?.value));
}

function materialsOf(object: Object3D): Material[] {
  const material = (object as unknown as { material?: Material | Material[] }).material;
  if (material === undefined) return [];
  return Array.isArray(material) ? material : [material];
}

export function auditScene(root: Object3D): SceneAudit {
  let objects = 0;
  let meshes = 0;
  let sprites = 0;
  let points = 0;
  let texturedMaterials = 0;
  let textGeometries = 0;
  let pageElementsInScene = 0;
  root.traverse((object) => {
    objects += 1;
    const flags = object as unknown as Record<string, unknown>;
    if (flags['isMesh'] === true) meshes += 1;
    if (flags['isSprite'] === true) sprites += 1;
    if (flags['isPoints'] === true) points += 1;
    if (flags['isCSS2DObject'] === true || flags['isCSS3DObject'] === true) pageElementsInScene += 1;
    const geometry = (object as unknown as { geometry?: { type?: unknown } }).geometry;
    if (geometry !== undefined && typeof geometry.type === 'string' && /text/iu.test(geometry.type)) textGeometries += 1;
    for (const material of materialsOf(object)) if (hasTexture(material)) texturedMaterials += 1;
  });
  return { objects, meshes, sprites, points, texturedMaterials, textGeometries, pageElementsInScene };
}

/** What in a scene audit could carry text, as "<count name>: <count>" (empty when clean). */
export function sceneProblems(audit: SceneAudit): string[] {
  const kinds = ['sprites', 'points', 'texturedMaterials', 'textGeometries', 'pageElementsInScene'] as const;
  return kinds.filter((kind) => audit[kind] !== 0).map((kind) => `${kind}: ${String(audit[kind])}`);
}

export function isCleanScene(audit: SceneAudit): boolean {
  return sceneProblems(audit).length === 0;
}

/** The stage: one canvas, and nothing else in it. */
export function auditStage(stage: Element): StageAudit {
  let canvases = 0;
  let otherElements = 0;
  let marks = 0;
  for (const element of stage.querySelectorAll('*')) {
    if (element.tagName.toLowerCase() === 'canvas') {
      canvases += 1;
      continue;
    }
    otherElements += 1;
    if (/^(?:svg|img|image|picture|video|object|embed|iframe)$/iu.test(element.tagName)) marks += 1;
  }
  return { canvases, otherElements, marks, text: (stage.textContent ?? '').replace(/\s+/gu, ' ').trim() };
}
