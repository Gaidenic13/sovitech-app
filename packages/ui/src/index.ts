/**
 * @sovitech/ui: brand tokens and assets; the Value, Price and Badge components; StatusLine, "Not
 * available yet", "Skip for now", the demo line; shell and form components (prompt 3 section 6).
 * Imports no domain, engine or registry internals: every value, badge and line arrives in a display
 * object of @sovitech/view-model/browser, and every fixed label from the app's catalogue.
 *
 * Styles: `@sovitech/ui/tokens.css` (the one file with colour literals) and `@sovitech/ui/ui.css`
 * (the components), imported by apps/web/src/styles.css. docs/adr/0040-app-theme-tokens.md.
 */
export * from './components';
export { brandLogo } from './brand';
export { Logo } from './brand/Logo';
