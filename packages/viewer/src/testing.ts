/**
 * @sovitech/viewer/testing: the view's audits, for tests (docs/build-log.md, the viewer step, item 7: "the scene
 * audit as an exported test helper"; ifc-input 6.2.15). Counts only; nothing here draws or reads a model.
 */
export { auditScene, auditStage, isCleanScene, sceneProblems, type SceneAudit, type StageAudit } from './audit';
export { SCENE_TOKENS } from './model-view/colours';
