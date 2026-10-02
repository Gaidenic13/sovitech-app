/**
 * @sovitech/viewer-spike: the phase 4 viewer spike (prompt 3 section 5.2 "Model viewer" and phase 4;
 * ifc-input 2.2; the owner's answer of 2026-10-02, "Trial now, decide later (Recommended)", in
 * docs/build-log.md "Owner answers during the run"). It converts the synthetic fixture models and the
 * `perf` model with That Open's IfcImporter (web-ifc) inside the no-network sandbox, opens the result
 * with That Open's components in Chromium with every non-local request refused, and records time and
 * memory for docs/adr/0046-viewer-spike.md. No viewer is wired into the live app: nothing under apps/
 * or packages/ imports this package (.dependency-cruiser.cjs, `viewer-spike-imported-by-nothing`;
 * only the proposed suite, tests/proposed/, may read its plan input for ifc-input 5.4's IFC-12), and
 * every page that would draw a model area renders without one (PRD R-078 "Until decided"; R-080).
 *
 * - src/convert/: the converter (Node; the sandbox image's command line);
 * - src/plan/: storey plans cut from the converted geometry, inline SVG with no text;
 * - src/bench/: the bench page (browser; bundled and driven by tools/viewer-spike/).
 */
export { CONVERTED_MODEL_ID, convertModel, viewDerivative, type Conversion, type ConversionTimes } from './convert/convert';
export { EveryAttributeExcept, VIEW_EXTRA_ELEMENT_CLASSES, VIEW_KEPT_ATTRIBUTES, VIEW_RELATIONS, viewerImporter, type ConversionProfile } from './convert/importer';
export { CUT_ABOVE_STOREY_BASE_M, storeyPlans, type StoreyPlan } from './plan/section';
