import type { LucideIcon } from 'lucide-react';

/**
 * A Lucide icon at the kit's sizes (onboarding-spec 2.1 and 2.5: outline icons, stroke 1.5, on a
 * 24px grid). Every icon is decorative (`aria-hidden`): the words next to it carry its meaning.
 *
 * Sizes stop at 32px: the render test reads an inline drawing larger than 32px with no text as
 * pixels it cannot read (tests/e2e/render/contract.ts, ICON_MAX_PX), so the mockups' 40px card
 * icons and 64px dropzone icon are drawn at 32px (docs/adr/0035-phase-3-frontend-dependencies.md).
 */
export type IconComponent = LucideIcon;

export type IconSize = 'small' | 'default' | 'large';

const PIXELS: Readonly<Record<IconSize, 16 | 24 | 32>> = { small: 16, default: 24, large: 32 };

export interface IconProps {
  readonly icon: IconComponent;
  /** small 16px, default 24px, large 32px (the largest the render test reads as an icon). */
  readonly size?: IconSize;
}

export function Icon({ icon: Glyph, size = 'default' }: IconProps) {
  return (
    <Glyph
      className="sov-icon"
      data-size={size}
      size={PIXELS[size]}
      strokeWidth={1.5}
      aria-hidden="true"
      focusable="false"
    />
  );
}
