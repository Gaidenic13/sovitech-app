/**
 * Side-effect stylesheet imports seen by the root typecheck (phase 5, the integrator).
 *
 * The root project typechecks tests/, and the print cases (tests/guardrails/_support/print.tsx) render the app's real
 * print document, whose module imports its stylesheet (`import './print.css'`), as Vite bundles it. The web app's own
 * tsconfig reads that import through `vite/client`; the root project has only Node's types, so it is declared here.
 * Nothing is imported from a stylesheet: the declaration has no exports.
 */
declare module '*.css';
