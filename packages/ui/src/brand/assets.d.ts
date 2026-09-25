/**
 * Asset imports as Vite resolves them: an imported `.svg` is the URL of the file.
 * Declared here for this package's own typecheck; apps/web gets the same
 * declaration from `vite/client`.
 */
declare module '*.svg' {
  const url: string;
  export default url;
}
