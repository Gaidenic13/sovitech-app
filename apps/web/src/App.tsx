import { brandLogo } from '@sovitech/ui';

/**
 * Scaffold placeholder. It holds no digits and no engineering value, so the
 * render test has nothing to bind here. The wizard replaces it in phase 3.
 *
 * The brand is the logo only: `logo-white.svg` with its alt text, no typeset
 * wordmark and no tagline (prompt 3 sections 5.1 and 5.2, "Product name,
 * tagline, favicon"). The logo comes through @sovitech/ui (packages/ui/src/brand/).
 */
export function App() {
  return (
    <main className="min-h-screen bg-bg px-8 py-8 text-text-primary">
      <h1>
        {/* The render test cannot read an image's pixels: the logo passes through its entry `brand-logo` on the reviewed unreadable list (tests/e2e/render/allowlist.ts). */}
        <img src={brandLogo.onDark} alt={brandLogo.alt} className="h-8 w-auto shrink-0" data-render-unreadable="brand-logo" />
      </h1>
      <p className="mt-4">The app screens are not built yet.</p>
    </main>
  );
}
