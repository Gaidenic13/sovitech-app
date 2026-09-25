# SOVITECH Control — Design System Reference

React/Tailwind design system of sovitech-website (Next.js 16, Tailwind v4, shadcn/ui).
Use this document as the source of truth when generating designs (presentations,
mockups, new pages) that must match the SOVITECH brand.

---

## 1. Color tokens

| Token | Hex | Usage |
|---|---|---|
| `--sovitech-dark` | `#0D2E2B` | Primary brand dark green — headings, buttons, dark surfaces |
| `--sovitech-green` | `#1F6B4A` | Accent green — links, active states, icons, focus rings |
| `--sovitech-mint` | `#C8E6C9` | Light green — accent on dark surfaces, eyebrows, stats, hovers |
| `--sovitech-lavender` | `#C5C0F5` | Pastel card / CTA band surface |
| `--sovitech-khaki` | `#8B7B5C` | Pastel card surface (HoReCa/retail) |
| `--sovitech-coral` | `#E07B6A` | Pastel card surface (educational) |
| `--sovitech-indigo` | `#5C5FD4` | Pastel card surface (industrial/office) |
| `--sovitech-offwhite` | `#F5F4F0` | Page background (cream), chip hover fill |
| `--sovitech-gray` | `#888888` | Muted body text on light surfaces |
| deep surface | `#07201C` | System dark surface — hero, footer, testimonials, stats, dark bands |

Extra pastels used on content cards: `#E8C5B8`, `#E8E8C0`, `#D4C4A8`.

Semantic (shadcn) mapping: `background=#F5F4F0`, `foreground/primary=#0D2E2B`,
`accent=#1F6B4A` with white foreground, `border/input=rgba(13,46,43,0.12)`,
`ring=#1F6B4A`, `card/popover=#ffffff`, `muted=#EDECEA`.
Charts: dark → green → mint → coral → indigo.

Rule: do not introduce accent colors outside this palette. On dark surfaces the
single accent is mint `#C8E6C9`; on light surfaces it is green `#1F6B4A`.

## 2. Typography

- Font: **Inter** (weights 300 / 400 / 600 / 800 / 900), `--font-sans`.
- Display headings: `font-light` (300), `tracking-tighter` (−0.05em),
  `leading-none`/`leading-tight`. Hero scale: `text-5xl md:text-7xl lg:text-8xl`
  (up to 96px / line-height 1). Section h2: `text-4xl`–`text-5xl font-light tracking-tighter`.
- Body: 16px/24px `font-light`, `text-[#888888]` on light, `text-white/50–60` on dark.
- Eyebrow label (every section): `• LABEL` — `text-sm font-semibold tracking-wider
  uppercase`; color `#888888` on light, `#C8E6C9` on dark (`section-label` utility).
- Menu/rail group labels: `text-xs font-semibold tracking-[0.2em] uppercase`.

## 3. Shape & radius

Radius family: **1px, 2px, 9999px** — nothing else.
- Surfaces, cards, images, inputs, panels → `rounded-[2px]`
- Buttons, chips, menu items → `rounded-[1px]`
- Pills only for: avatars, pagination dots, tiny status chips, icon bubbles (`rounded-full`)
- Shadows: **none**. Depth = hairline borders + surface contrast
  (`border-[#0D2E2B]/10` on light, `border-white/10` on dark; hover raises to /25–/40).

## 4. Motion

- Durations **300ms** (surface/color) and **150ms** (text/link color); `ease` /
  `cubic-bezier(0.4, 0, 0.2, 1)`.
- Hover feedback is **color-only** (text darkens, chip fill appears, border strengthens).
  No scale/translate hovers on cards; small arrow nudges (`translate-x-0.5`) allowed.
- Reveals: opacity-only fades; staggered content entrances use tiny 8px rises with
  75/150/200/300ms delays that settle to exactly 0. Never animate transforms +
  backdrop-blur simultaneously over text.
- Scroll reveals: IntersectionObserver → fade + 24px rise, 150ms stagger per card.
- WebGL backgrounds respect `prefers-reduced-motion` (static single frame).

## 5. Surfaces & recipes

- **Dark band**: `bg-[#07201C]`, white display text, mint eyebrow, `border-white/10` hairlines.
- **Glass card (dark)**: gradient-border shell — outer `p-px rounded-[2px]` with
  `linear-gradient(to right bottom, rgba(255,255,255,.14), rgba(255,255,255,.03) 49%, rgba(200,230,201,.28) 51%, rgba(255,255,255,.03))`,
  inner `bg-[#07201C]/70 backdrop-blur-[2px] rounded-[1px] p-[18px]`.
- **Glass overlay (light)**: `bg-white/70 backdrop-blur-[2px]`, opacity-only fade.
- **Hairline grid**: `grid gap-px bg-[#0D2E2B]/10 border border-[#0D2E2B]/10` with
  solid-background cells (used for sectors, partners, stats).
- **Split CTA**: solid rectangle button + separate bordered arrow cell, joined with `ml-px`.

## 6. Custom React components (components/)

| Component | File | What it is / recipe |
|---|---|---|
| `Header` | `components/header.tsx` | Sticky white bar, hairline bottom border. Data-driven nav (`navGroups`). Trigger chips: `rounded-[1px]`, cream `#F5F4F0` fill + solid `#0D2E2B` text on hover/open/focus. Sharp RO/EN segmented toggle, sharp dark CTA (`hover:bg-[#1F6B4A]`), circular-→square burger (two 1.5px bars folding to ×), full-height mobile drawer with uppercase group rails. |
| `Footer` | `components/footer.tsx` | Dark `#07201C` surface, white SVG logo, mint tracked-uppercase column headings, `white/50 → white` links (150ms), sharp white CTA button. Fully bilingual, data-driven `columns`. |
| `HeroField` | `components/hero-field.tsx` | Full-bleed WebGL fluid background (domain-warped fbm noise shader) in brand greens (`#1F6B4A` folds, mint glow, left-side fade for text legibility). Pointer drift, 1.5s reveal, DPR clamp 2, context-loss self-recovery, reduced-motion fallback. |
| `AethelTestimonials` (+`DotMatrixField`) | `components/aethel-testimonials.tsx` | Dark testimonial band: WebGL dot-matrix wave (green-grey → mint dots), display heading pair ("Clienții vorbesc. / Cifrele confirmă."), 3 glass cards with gradient-border shell, mint stat + tracked label + quote + hairline-separated author. IntersectionObserver staggered reveal. |
| `StatsSection` (+`StatCell`, `CountUp`) | `components/stats-section.tsx` | Dark band, hairline `gap-px` grid of stat cells; count-up numbers (600ms ease-out), mint accent bars/values alternating with white, labels `white/60`. |
| `CaseStudySlider` | `components/case-study-slider.tsx` | Light band; white `rounded-[2px]` hairline card split image/quote; pastel industry chip; 3 stats with `divide-x` hairlines; sharp dark CTA; pill pagination dots + round arrow buttons. |
| `BlogSlider` | `components/blog-slider.tsx` | Dark band; 4-up pastel `rounded-[2px]` cards, bold dark title + muted category, hover = title dim + arrow chip fade (no scale). |
| `ThemeProvider` | `components/theme-provider.tsx` | next-themes wrapper (site is effectively light-only). |

## 7. Page-level composed components

| Component | File | Recipe |
|---|---|---|
| `SectorPageClient` | `app/sectoare/[sector]/sector-client.tsx` | Full sector template: accent top bar, breadcrumb, badge chip, pre-line display headline, metric cells (`#ffffff08` + hairline), features grid (white cards, tinted icon squares), capabilities checklist (accent dots), dark pull-quote band, related pastel cards, split CTA footer. Localized via `localizeSector(sector, lang)`. |
| `StepHeading`, `FormField`, `RadioOption`, `CheckboxRow`, `ProgressBar` | `app/calculator-roi/page.tsx` | Wizard form kit: green eyebrow + light title; label+hint field wrapper; `rounded-[2px]` cream option rows with hairline borders (selected = accent tint + border); numbered progress dots with accent connectors. |
| `ResultsReport` | `app/calculator-roi/page.tsx` | Results layout: dark hero-metrics panel (mint/white numbers), savings detail rows with tinted icon squares, year-projection tiles, CTA card with primary/secondary + Download-PDF / Share (WhatsApp, Email, LinkedIn) / Copy-link action row (all `rounded-[2px]` bordered buttons). Print-scoped via `#roi-report` + `print-hide`. |
| `CategoryBadge` | `app/resurse/page.tsx` | Tiny pill `text-[10px] font-bold tracking-widest uppercase`; pastel bg + darker text pair per category (lavender/`#5C5FD4`, mint/`#1F6B4A`). |

Recurring page patterns (copy them as-is): editorial masthead + sharp filter chips
(active `bg-[#0D2E2B] text-white`, idle white + hairline); featured split card;
4-up article cards with hairline meta divider; dark promo band with cover;
centered pull-quote + source row; pastel tool cards with arrow bubble;
archive list rows with thumbnails and `divide-y` hairlines; department contact
rows (uppercase green dept label, name, tel/mailto links with green icons);
map card with dark HQ pin chip (building.svg) + "open in Google Maps" hint chip.

## 8. shadcn/ui primitives (components/ui/)

All themed through the semantic tokens above and the 1px/2px radius family:

accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button,
button-group, calendar, card, carousel, chart, checkbox, collapsible, command,
context-menu, dialog, drawer, dropdown-menu, empty, field, form, hover-card,
input, input-group, input-otp, item, kbd, label, menubar, navigation-menu
(enter/exit keyframe animations intentionally removed — instant show/hide),
pagination, popover, progress, radio-group, resizable, scroll-area, select,
separator, sheet, sidebar, skeleton, slider, sonner, spinner, switch, table,
tabs, textarea, toast, toaster, toggle, toggle-group, tooltip.

## 9. Brand assets

- `public/logo.svg` — dark logo (use on white/light surfaces)
- `public/logo-white.svg` — white logo (use on dark surfaces); both 4:1 ratio,
  render `h-8/h-9 w-auto shrink-0`
- `public/building.svg` — white building mark (dark chips, map pin)
- Placeholders: `public/placeholder.svg`, `placeholder-user.jpg`

## 10. Language

All user-facing strings are bilingual via `useLanguage()` → `t(ro, en)`
(`lib/language-context.tsx`). Romanian uses full diacritics (ă â î ș ț).
Voice: modern, confident, direct B2B; CTAs "Cerere ofertă / Request a quote",
"Vorbește cu un specialist / Talk to a specialist", "Calculează ROI / Calculate ROI".
