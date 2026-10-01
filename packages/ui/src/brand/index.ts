// The `.svg` declaration travels with the file that imports an SVG, so any program that reaches the
// kit types it: apps/web (vite/client), this package, and the root typecheck, whose guardrail tests
// render the app (types: node only). A wildcard module declaration cannot be imported, so it is referenced.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./assets.d.ts" />
/**
 * The SOVITECH logo, for the app's dark UI and for light surfaces (README.md in
 * this folder: sources, SHA-256 and use). The alt text travels with the files, so
 * every screen names the logo the same way.
 */
import logoOnLight from './logo.svg';
import logoOnDark from './logo-white.svg';

export const brandLogo = {
  /** `logo-white.svg`: the white logo, for the dark UI. */
  onDark: logoOnDark,
  /** `logo.svg`: the dark and green logo, for light surfaces such as an export on white. */
  onLight: logoOnLight,
  /** The alt text the company website uses for both files. */
  alt: 'SOVITECH Control',
} as const;
