/**
 * The scene around a model (docs/build-log.md, the viewer step, item 3, "One canvas"): a camera and two lights,
 * nothing else. The model's own shapes are added by the engine (./engine.ts) once its view file is loaded. No grid,
 * axes helper, label, sprite or marker is ever added (R-080, R-082; ifc-input 6.2.15), and the lights take three's
 * default white, so no colour literal enters the scene (prompt 3 section 6: the viewer reads its colours from the
 * CSS custom properties at run time).
 */
import { AmbientLight, DirectionalLight, PerspectiveCamera, Scene } from 'three';

export interface SceneFrame {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
}

/** Field of view in degrees: a moderate lens, so a building reads without strong perspective. */
const FIELD_OF_VIEW = 40;
/** The lights' intensities (three's physical units; white, three's default). */
const AMBIENT_INTENSITY = 2.5;
const KEY_INTENSITY = 6;

export function buildSceneFrame(): SceneFrame {
  const scene = new Scene();
  const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 1000);
  // A key light carried by the camera, so the faces turned to the viewer are lit whichever way the model is turned.
  // The model is drawn in the dark surface token, so the lights are strong enough for its faces to read apart from
  // the page: about twice the surface's lightness in shade and four times on a lit face (the design review, D-19,
  // tunes these in part 2).
  const key = new DirectionalLight(undefined, KEY_INTENSITY);
  key.position.set(0.4, 1, 0.6);
  camera.add(key);
  scene.add(new AmbientLight(undefined, AMBIENT_INTENSITY), camera);
  return { scene, camera };
}
