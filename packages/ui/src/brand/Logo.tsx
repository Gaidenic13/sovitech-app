import { brandLogo } from './index';

/**
 * The SOVITECH logo on the dark UI (prompt 3 5.1, OD-2; US-ADMIN-08 AC1; app-alignment "Shape, type,
 * motion and logo"): the real `logo-white.svg` at h-8 (32px tall, automatic width), never a typeset
 * wordmark, no CSS filter, alt text "SOVITECH Control". The render test cannot read an image's
 * pixels, so the element carries the reviewed entry `brand-logo` of tests/e2e/render/allowlist.ts,
 * whose `src` pattern covers the white logo file only. The light logo (`brandLogo.onLight`) is for
 * exports on white (phase 5) and is not reviewed for a screen.
 */
export function Logo() {
  return <img className="sov-logo" src={brandLogo.onDark} alt={brandLogo.alt} height={32} data-render-unreadable="brand-logo" />;
}
