/**
 * @sovitech/viewer: the model viewer (prompt 3 sections 6 and 8; docs/build-log.md, the viewer step; the owner's
 * answer of 2026-10-05, D-03 "1 b"). A view of a stored IFC model's converted view file, shown as a document: its
 * shapes only, in token colours, named beside it by the area's document line, with nothing read from the model (no
 * name, label, count, pin, scale bar, north mark or selection while `ifc-values` and `view-provenance` are closed).
 * Its own values: none.
 *
 * This entry is what a page imports: the graphics probe (a few lines, in the main bundle) and `ModelViewer`, which
 * imports the view's chunk (three.js, Fragments, camera-controls) only after the probe answers "hardware". Imported
 * by apps/web only (prompt 3 section 6), and in part 1 by no page: the render test refuses its canvas until the
 * approver decides P-V-CANVAS-UNREADABLE. `@sovitech/viewer/testing` holds the audits for tests.
 */
export { ModelViewer, type ModelViewerProps } from './ModelViewer';
export type { ModelViewLabels, ModelViewReady } from './model-view/ModelView';
export type { ViewUnavailableReason } from './model-view/engine-types';
export { CAMERA_ACTIONS, TOOLBAR_ACTIONS, type CameraAction, type ToolbarAction } from './model-view/camera';
export { graphicsOnThisPage, isSoftwareRenderer, probeGraphics, SOFTWARE_RENDERERS, type GraphicsProbe } from './probe';
