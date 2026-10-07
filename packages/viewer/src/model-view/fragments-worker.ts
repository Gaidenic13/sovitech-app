// The `?url` declaration travels with the file that imports the worker, so any program that reaches the viewer
// types it: this package, apps/web (vite/client) and the root typecheck (types: node only), as the kit's brand
// module does (packages/ui/src/brand/index.ts). A wildcard module declaration cannot be imported, so it is referenced.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../assets.d.ts" />
/**
 * The Fragments worker's URL on the app's own origin (docs/build-log.md, the viewer step, item 3: "The Fragments
 * worker comes from the app's own origin, as a static import with Vite's `?url`. Nothing is fetched from unpkg or
 * any CDN"; ADR 0046 Finding 1). The bundler emits the package's own worker file (its minified build, which the
 * spike served) beside the view's chunk and this import names its URL; Fragments starts its worker from it
 * (`new FragmentsModels(url)`), never from `FragmentsModels.getWorker()`, which fetches it from unpkg.
 *
 * The path goes through this package's own link to its pinned dependency (pnpm's `node_modules/@thatopen/fragments`)
 * rather than the package's `./worker` export, because the boundary check's resolver reads a query on a package
 * export as part of the export's name (`"./worker?url" is not exported`) and would fail the import as unresolvable;
 * on a file path it reads the query as a query, so the edge to the worker file stays visible to the boundaries.
 */
import workerUrl from '../../node_modules/@thatopen/fragments/dist/Worker/worker.min.mjs?url';

export const FRAGMENTS_WORKER_URL: string = workerUrl;
