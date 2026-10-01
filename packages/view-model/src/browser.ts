/**
 * @sovitech/view-model/browser: the display-object types and the API contract (prompt 3 section 6).
 * The only view-model entry apps/web may import. It imports nothing from the domain, the registry
 * or the server side (dependency-cruiser: browser-code-reaches-no-server-code); apps/api imports it
 * too, for the schemas its answers must satisfy.
 */
export * from './browser/contract';
