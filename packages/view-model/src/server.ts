/**
 * @sovitech/view-model/server: the one resolver that turns candidates and events into display
 * objects, the formatting module, and the question engine of the intake wizard. Runs in apps/api
 * only (prompt 3 section 6). The display-object types and the API contract are the browser side's
 * (`@sovitech/view-model/browser`), which this side imports.
 */
export * from './formatting';
export * from './resolver';
export * from './intake';
