/**
 * The one asset URL the viewer imports: the Fragments worker, emitted by the bundler and served from the app's own
 * origin (docs/build-log.md, the viewer step, item 3; ADR 0046 Finding 1: That Open fetches its worker from unpkg by
 * default). Declared for this file only, so no other `?url` import type-checks.
 */
declare module '*/node_modules/@thatopen/fragments/dist/Worker/worker.min.mjs?url' {
  const url: string;
  export default url;
}
