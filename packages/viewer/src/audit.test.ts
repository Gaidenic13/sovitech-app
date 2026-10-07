/**
 * ifc-input 6.2.15 · no text in a view file or scene (a blocking test named after the proposal, not indexed: a
 * stricter choice built live; prompt 3 phase 2 and section 14, item 5; docs/build-log.md, the viewer step, item 7).
 *
 * The render test reads page elements only, so text drawn inside the view's canvas would pass it unread (rule 2,
 * G2-1; ifc-input 6.2.15 names the gap). The scene audit is the guard for the routes known today: it counts
 * everything three.js would draw that could carry text (a sprite, points, a textured material, text geometry, a
 * page element placed by the scene), and the stage audit counts what sits in the view beside its one canvas (a
 * label, a logo, an overlay). This file proves the audit finds each route; the scene of a loaded fixture model is
 * audited in Chromium by tests/proposed/model-view.test.ts, and the scene the engine builds around the model here.
 */
import { BoxGeometry, BufferGeometry, CanvasTexture, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, Points, PointsMaterial, ShaderMaterial, Sprite, SpriteMaterial, Texture } from 'three';
import { describe, expect, test } from 'vitest';
import { auditScene, isCleanScene, sceneProblems } from './audit';
import { buildSceneFrame } from './model-view/scene-frame';

function mesh(): Mesh {
  return new Mesh(new BoxGeometry(), new MeshLambertMaterial());
}

describe('ifc-input 6.2.15 · no text in a view file or scene: the scene audit', () => {
  test('ifc-input 6.2.15 · rule 2: a scene of shapes in plain materials is clean', () => {
    const root = new Group();
    root.add(mesh(), mesh(), new Group().add(mesh()));
    const audit = auditScene(root);
    expect(audit).toMatchObject({ meshes: 3, sprites: 0, points: 0, texturedMaterials: 0, textGeometries: 0, pageElementsInScene: 0 });
    expect(isCleanScene(audit)).toBe(true);
    expect(sceneProblems(audit)).toEqual([]);
  });

  test('ifc-input 6.2.15 · rule 2: a text sprite fails the audit', () => {
    const root = new Group().add(mesh(), new Sprite(new SpriteMaterial()));
    expect(auditScene(root).sprites).toBe(1);
    expect(sceneProblems(auditScene(root))).toEqual(['sprites: 1']);
  });

  test('ifc-input 6.2.15 · rule 2: points (drawn as labels by some libraries) fail the audit', () => {
    const root = new Group().add(new Points(new BufferGeometry(), new PointsMaterial()));
    expect(isCleanScene(auditScene(root))).toBe(false);
  });

  test('ifc-input 6.2.15 · rule 2: a material with a texture (text drawn into a canvas texture) fails the audit, in a map slot or in a shader uniform', () => {
    const canvasTexture = new CanvasTexture({ width: 1, height: 1 } as unknown as HTMLCanvasElement);
    const inSlot = new Group().add(new Mesh(new BoxGeometry(), new MeshBasicMaterial({ map: canvasTexture })));
    expect(auditScene(inSlot).texturedMaterials).toBe(1);
    const inUniform = new Group().add(new Mesh(new BoxGeometry(), new ShaderMaterial({ uniforms: { label: { value: new Texture() } } })));
    expect(auditScene(inUniform).texturedMaterials).toBe(1);
    const multi = new Group().add(new Mesh(new BoxGeometry(), [new MeshLambertMaterial(), new MeshBasicMaterial({ alphaMap: new Texture() })]));
    expect(auditScene(multi).texturedMaterials).toBe(1);
  });

  test('ifc-input 6.2.15 · rule 2: text geometry fails the audit', () => {
    // three's TextGeometry needs a font file; its type is all the audit reads.
    const text = Object.defineProperty(new BufferGeometry(), 'type', { value: 'TextGeometry' });
    expect(auditScene(new Group().add(new Mesh(text, new MeshLambertMaterial()))).textGeometries).toBe(1);
  });

  test('ifc-input 6.2.15 · rule 2: a page element placed by the scene (CSS2D or CSS3D) fails the audit', () => {
    const css2d = Object.assign(new Object3D(), { isCSS2DObject: true });
    const css3d = Object.assign(new Object3D(), { isCSS3DObject: true });
    expect(auditScene(new Group().add(css2d, css3d)).pageElementsInScene).toBe(2);
  });

  test('ifc-input 6.2.15 · rule 2: the scene the engine builds around a model (camera, lights) holds nothing that could carry text', () => {
    const frame = buildSceneFrame();
    const audit = auditScene(frame.scene);
    expect(isCleanScene(audit), sceneProblems(audit).join(', ')).toBe(true);
    expect(audit.meshes).toBe(0);
  });
});
