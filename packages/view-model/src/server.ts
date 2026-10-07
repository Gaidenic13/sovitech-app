/**
 * @sovitech/view-model/server: the one resolver that turns candidates and events into display
 * objects, the formatting module, the question engine of the intake wizard and the workspace's view
 * builders (phase 4: ./workspace), and the stored proposal, its print view, Reports and the Equipment export
 * (phase 5: ./proposal), and the Metrics pages with their chart series (phase 6: ./metrics). Runs in apps/api
 * only (prompt 3 section 6). The display-object types and the API contract are the browser side's
 * (`@sovitech/view-model/browser`), which this side imports.
 */
export * from './formatting';
export * from './resolver';
export * from './intake';
export * from './workspace';
export * from './proposal';
export * from './metrics';
export * from './admin';
