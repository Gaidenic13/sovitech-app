# SOVITECH brand guidelines

The SOVITECH brand as the company website applies it: name, logo, colour, type, shape, depth, motion, surfaces, imagery and language, condensed for anyone designing SOVITECH material. Everything here comes from the website repository github.com/Gaidenic13/sovitech-website, commit e0806142735dbdd53b913af30102f9227b380475 (2026-08-11). Each section names its source file.

**Status.** This is the website's brand. The app's approved mockups use a different visual system. Until 2026-09-24 nobody had decided how the two relate; the decision below settles that. See [`app-alignment.md`](app-alignment.md) before using anything here in the app.

**Decision (2026-09-24).** Asked whether the app should follow the company brand, keep the mockup theme or be a sub-brand, the product owner answered "treat the app as our brand tool".
- As recorded, the app carries this brand (logo, name, palette, Inter, radius, depth, motion and voice) in its dark variant: `#07201C`, `#0D2E2B`, green `#1F6B4A`, and mint `#C8E6C9` as the single accent.
- The mockups stay the brief for layout, structure, flows and content.
- The decision and its interpretation: [`app-alignment.md`, "Decision (2026-09-24)"](app-alignment.md#decision-2026-09-24).
- The proposed app tokens: [`app-alignment.md`, "App theme: the brand's dark variant (proposed tokens)"](app-alignment.md#app-theme-the-brands-dark-variant-proposed-tokens). Values the brand does not define there still need the owner's OK.
- The same day, the owner said the branch `redesign-2026` is not SOVITECH's current position and will not be merged. Sections 14 and 15 are kept for reference only.

## What is in this folder

| Path | What it holds |
|------|---------------|
| [`design-system.md`](design-system.md) | The website's `DESIGN-SYSTEM.md`, verbatim. The repository calls it "the source of truth" for SOVITECH designs. |
| [`tokens.css`](tokens.css) | Every CSS custom property and `@theme` token from both `globals.css` files, verbatim. At the end, a commented-out block with the unmerged branch's new utilities (section 15). |
| [`tokens.json`](tokens.json) | The same tokens, machine-readable, with roles, radius, fonts, motion and the semantic mapping. The unmerged branch's changes are under the separate key `redesign2026`. |
| [`logo/`](logo/) | `logo.svg`, `logo-white.svg`, `building.svg`, PNG previews, and usage notes |
| [`imagery/`](imagery/) | The website's non-product images, sorted by subject. The `main` set is all AI-generated or stock-style illustration. Two folders come from the unmerged branch `redesign-2026`: `reference-projects/` (mostly real photographs, labelled with client names, provenance unknown) and `services-redesign-2026/` (Canva images, probably AI-generated). |
| [`voice-and-messaging.md`](voice-and-messaging.md) | Tone of voice, CTAs and messages |
| [`app-alignment.md`](app-alignment.md) | The owner's decision of 2026-09-24, the website brand compared with the app mockups, and the proposed app theme tokens |
| [`partner-logos/`](partner-logos/) | **Unmerged branch `redesign-2026` only, kept for reference (the branch will not be merged).** Third-party logos of SAUTER, KNX, BACnet, Modbus, M-Bus and DALI, with provenance and a trademark note. Not SOVITECH marks. |

---

## 1. Name and wordmark

Source: `components/header.tsx`, `components/footer.tsx`, `app/layout.tsx`, `app/contact/page.tsx`, `DESIGN-SYSTEM.md` title.

- **Legal name:** "SOVITECH CONTROL SRL" (contact page address block).
- **Brand name in the interface:** "SOVITECH Control". The logo alt text, the footer copyright line and the title of `DESIGN-SYSTEM.md` all use it.
- **Other spellings in the code.** Counted in `app/`, `components/` and `lib/`:

  | Form | Uses | Where |
  |------|------|-------|
  | Sovitech | 79 | Running copy and customer quotes |
  | SOVITECH | 29 | Sector copy, CSS comments, map labels |
  | Sovitech Control | 26 | Page metadata, articles, case studies, product pages |
  | SOVITECH Control | 3 | Logo alt text, copyright |
  | SOVITECH CONTROL | 3 | Legal name, map title |

  The repository states no rule for which form to use. The logo sets the name in capitals.
- **The wordmark is the logo file.** On the website the name always appears as the SVG logo, never typeset in a font. The file `public/sovitech-logo.svg` sets the name in Arial, but it is an unused placeholder, not the logo.

## 2. Logo

Source: `DESIGN-SYSTEM.md` section 9, `public/logo*.svg`, `public/building.svg`. Full notes: [`logo/README.md`](logo/README.md).

- `logo.svg` on white and light surfaces. `logo-white.svg` on dark surfaces.
- 4:1 box. Fixed height and automatic width (`h-8` in the header, `h-9` in the footer). No CSS filters to recolour it.
- The "O" is a fingerprint with a skyscraper inside it. `building.svg` is that skyscraper on its own, in white, for small dark chips.
- The logo colours (`#00674C` green, `#231F20` near-black) are not the web tokens (`#1F6B4A`, `#0D2E2B`).
- The website has no SOVITECH favicon. The favicons it ships are the v0.app generator's mark.

## 3. Colour

Source: `app/globals.css` `:root`, `DESIGN-SYSTEM.md` section 1, `lib/sector-data.ts`. Uses are literal hex occurrences in `app/`, `components/` and `lib/`.

### Palette

| Name | Hex | Role | Uses |
|------|-----|------|------|
| `--sovitech-dark` | `#0D2E2B` | Primary dark green: headings, text on light, primary buttons, active chips | 449 |
| `--sovitech-green` | `#1F6B4A` | Accent on light surfaces: links, active states, icons, focus rings | 124 |
| `--sovitech-mint` | `#C8E6C9` | Accent on dark surfaces: eyebrows, stat values, footer headings, text selection | 93 |
| `--sovitech-gray` | `#888888` | Muted body text and eyebrows on light surfaces | 86 |
| `--sovitech-offwhite` | `#F5F4F0` | Page background (cream), chip hover fill | 84 |
| deep surface | `#07201C` | Dark bands: hero, footer, stats, blog, dark CTAs. A literal, not a token. | 38 |
| white | `#FFFFFF` | Header bar, cards, popovers, text on dark | 35 |
| `--sovitech-lavender` | `#C5C0F5` | Pastel card and CTA-band surface | 29 |
| `--sovitech-indigo` | `#5C5FD4` | Pastel card surface | 26 |
| `--sovitech-khaki` | `#8B7B5C` | Pastel card surface | 14 |
| `--sovitech-coral` | `#E07B6A` | Pastel card surface | 4 |
| extra pastels | `#E8C5B8`, `#E8E8C0`, `#D4C4A8` | Content cards (blog) | 2 each |

### The one-accent rule

`DESIGN-SYSTEM.md` section 1 states it: "do not introduce accent colors outside this palette. On dark surfaces the single accent is mint `#C8E6C9`; on light surfaces it is green `#1F6B4A`."

So each surface carries one accent. Green `#1F6B4A` is too dark for dark surfaces: it reaches only 2.65:1 on `#07201C`. Mint is the dark-surface accent.

### Semantic mapping (shadcn tokens)

| Token | Value |
|-------|-------|
| `background` | `#F5F4F0` |
| `foreground`, `primary`, `card-foreground`, `popover-foreground`, `secondary-foreground` | `#0D2E2B` |
| `primary-foreground`, `accent-foreground` | `#FFFFFF` |
| `card`, `popover` | `#FFFFFF` |
| `secondary` | `#F5F4F0` |
| `muted` / `muted-foreground` | `#EDECEA` / `#888888` |
| `accent`, `ring` | `#1F6B4A` |
| `destructive` | `#E53E3E` |
| `border`, `input` | `rgba(13,46,43,0.12)` |
| `chart-1` to `chart-5` | dark `#0D2E2B`, green `#1F6B4A`, mint `#C8E6C9`, coral `#E07B6A`, indigo `#5C5FD4` |

### Sector colours

Source: `lib/sector-data.ts` (`accentColor`); for the second map, `components/aethel-testimonials.tsx` and `app/resurse/referinte/page.tsx`.

| Sector | Colour |
|--------|--------|
| Civil & Birouri (Civil & Office) | lavender `#C5C0F5` |
| Medical & Farma | mint `#C8E6C9` |
| Retail | khaki `#8B7B5C` |
| HoReCa | green `#1F6B4A` |
| Industrial | indigo `#5C5FD4` |
| Educațional (Educational) | coral `#E07B6A` |

`DESIGN-SYSTEM.md` assigns khaki to "HoReCa/retail" and indigo to "industrial/office".

The code has two maps. `lib/sector-data.ts` (the sector pages) uses the table above. The home-page spotlight (`components/aethel-testimonials.tsx`) and the references page (`app/resurse/referinte/page.tsx`, `categoryMeta`) use a second map:

| Sector | Colour in the spotlight and on the references page |
|--------|-----------------------------------------------------|
| HoReCa | khaki `#8B7B5C` |
| Retail | indigo `#5C5FD4` |
| Office | lavender `#C5C0F5` |
| Medical | mint `#C8E6C9` |
| Industrial | dark `#0D2E2B` (references page only) |
| "Educație & Instituții" (Education & Institutions) | `#A8C5D4`, a colour outside the palette (references page only, under the key `civil`) |

The second map agrees with `DESIGN-SYSTEM.md` on HoReCa (khaki). The home-page case-study slider (`components/case-study-slider.tsx`) colours its industry pills per slide instead: mint, lavender and sand `#D4C4A8`.

### Contrast

Calculated here, not stated in the source:
- `#0D2E2B` on `#F5F4F0`: 13.2:1.
- `#1F6B4A` on `#F5F4F0`: 5.9:1.
- `#888888` on `#F5F4F0`: 3.2:1. This is below the WCAG AA 4.5:1 for body text, and the website uses this grey for body copy.
- White on `#07201C`: 17.0:1. Mint on `#07201C`: 12.7:1.

## 4. Typography

Source: `app/layout.tsx`, `app/globals.css`, `DESIGN-SYSTEM.md` section 2, components listed per row.

- **Typeface:** Inter only, loaded in weights 300, 400, 600, 800 and 900. The mono stack (`ui-monospace, Menlo, Consolas`) appears only in shadcn chart tooltips.
- **Character:** large, light, tightly tracked display type. Small uppercase tracked labels.

| Role | Style | Source |
|------|-------|--------|
| Hero display | `text-5xl md:text-7xl lg:text-8xl`, weight 300, `tracking-tighter` (−0.05em), line height 1. Up to 96px. | `DESIGN-SYSTEM.md` |
| Section heading (h2) | `text-3xl sm:text-4xl lg:text-5xl`, weight 300, `tracking-tighter` | `components/stats-section.tsx`, `case-study-slider.tsx`, `blog-slider.tsx` |
| Card title | 30-36px, weight 300, tight tracking (spotlight). 16px weight 600 on pastel blog cards. | `aethel-testimonials.tsx`, `blog-slider.tsx` |
| Body | 16px/24px, weight 300. `#888888` on light, white at 50-60% on dark. | `DESIGN-SYSTEM.md` |
| Eyebrow | "• LABEL": `text-sm font-semibold tracking-wider uppercase`. `#888888` on light (some sections use green), mint on dark. | `DESIGN-SYSTEM.md`, `stats-section.tsx` |
| Rail and column label | `text-xs font-semibold tracking-[0.2em] uppercase`. Green in the mobile menu, mint at 70% in the footer. | `header.tsx`, `footer.tsx` |
| Micro label | 11px, weight 600, `tracking-[0.15em]`, uppercase | `aethel-testimonials.tsx` |
| Stat number | `text-5xl` to `text-8xl`, weight 300, `tabular-nums`, mint on dark | `stats-section.tsx` |
| Nav item | 15px, weight 500, dark at 80% | `header.tsx` |
| Button | 14px, weight 500 | `header.tsx`, `footer.tsx` |

**Base defaults in `app/globals.css`.** h1 and h2 are weight 900, h3 is 800 and h4 is 700, with clamp() sizes. Display headings override these with `font-light`: 66 h1/h2 elements use `font-light` and 47 use `font-bold`. `DESIGN-SYSTEM.md` describes the light style as the brand.

## 5. Shape

Source: `DESIGN-SYSTEM.md` section 3. Counts from `app/` and `components/`.

- **Radius family: 1px, 2px, 9999px.** `DESIGN-SYSTEM.md` says "nothing else".
  - 2px: surfaces, cards, images, inputs and panels (`rounded-[2px]`, 226 uses).
  - 1px: buttons, chips and menu items (`rounded-[1px]`, 109 uses).
  - 9999px only for avatars, pagination dots, tiny status chips and icon bubbles (`rounded-full`, 149 uses).
- The shadcn primitives in `components/ui/` were changed to this family too (`rounded-[1px]` 67 times).
- The declared token `--radius: 0.75rem` is not what the site renders. See "Where the code differs" below.

## 6. Depth

Source: `DESIGN-SYSTEM.md` section 3.

- **No shadows.** Depth comes from hairline borders and surface contrast. The shadcn primitives the site uses still carry small shadows (section 13).
- Hairlines are `#0D2E2B` at 10% on light surfaces and white at 10% on dark ones. On hover a border strengthens to 25-40%.
- A hairline grid (`gap-px` over a 10% tinted background, with solid cells). `DESIGN-SYSTEM.md` lists it for sectors, partners and stats, but no page uses it at this commit (see section 13).
- Glass is used sparingly. `DESIGN-SYSTEM.md` specifies `backdrop-blur-[2px]` for the light overlay and the dark glass card. The light overlay is used (`app/produse/page.tsx`); the dark glass card is not. The product pages and sticky sub-navs also use `backdrop-blur` and `backdrop-blur-sm` over translucent white or `#07201C` (`app/produse/page.tsx`, `app/servicii/page.tsx`).

## 7. Motion

Source: `DESIGN-SYSTEM.md` section 4, `app/globals.css`, `components/stats-section.tsx`, `components/hero-field.tsx`, `components/aethel-testimonials.tsx`.

| What | Duration and easing |
|------|---------------------|
| Surface and colour changes (buttons, chips, borders, drawer) | 300ms, `ease` / `cubic-bezier(0.4, 0, 0.2, 1)` |
| Text and link colour | 150ms |
| Staggered entrances | Opacity, with an 8px rise settling to 0, at 75, 150, 200 and 300ms delays |
| Scroll reveals | Fade plus a 24px rise, 150ms stagger per card |
| Stat count-up | 600ms, ease-out |
| Carousel slide | 500ms, ease-out |
| Hero WebGL reveal | 1.5s |
| References marquee | 45s linear loop, paused on hover |

**Rules.**
- Hover feedback is colour only: text darkens, a chip fill appears, or a border strengthens.
- No scale or translate on cards. Small arrow nudges are allowed. The code breaks this in several places (section 13).
- Never animate transforms and backdrop-blur together over text.
- `prefers-reduced-motion` collapses transitions to 0.01ms, and the WebGL hero shows one static frame.

## 8. Surfaces and recipes

Source: `DESIGN-SYSTEM.md` sections 5-7 and the components named.

- **Page.** Cream `#F5F4F0` body. White sticky header, 64px tall, with a hairline bottom border. Content max width 80rem, with gutters of 16, 24 and 32px (`.container-site`).
- **Header** (`components/header.tsx`).
  - Nav triggers with a cream fill on hover.
  - A sharp RO/EN toggle, with the active side in `#0D2E2B` and white text.
  - A dark "Cerere ofertă" (Request a quote) button that turns green on hover.
  - A square burger button whose two 1.5px bars fold into an ×.
- **Dark band.** `#07201C` background, light white display text, a mint eyebrow and white/10 hairlines. Used for the hero, stats, blog and footer.
- **Hero** (`components/hero-field.tsx`). A full-bleed WebGL field of flowing folds in brand greens, with a mint glow. The left side is kept near-black so the text stays legible.
- **Footer** (`components/footer.tsx`).
  - `#07201C` with the white logo.
  - A white "Contactează-ne" (Contact us) button that turns mint on hover, next to a bordered "Calculator ROI" button.
  - Four link columns (Servicii, Resurse, Companie, Legal) under mint uppercase headings. Links go from white/50 to white.
- **Glass card (dark)** (`DESIGN-SYSTEM.md` only; not in the code). A 1px gradient-border shell (`p-px rounded-[2px]`) around an inner `#07201C` at 70% with `backdrop-blur-[2px]`. The exact gradient is in `tokens.json` (`alpha.glass-border-gradient`).
- **Split CTA.** A solid rectangular button next to a separate bordered arrow cell, joined with a 1px gap.
- **Stats band** (`components/stats-section.tsx`). Dark band, with a label, heading and intro on the left. On the right: one large stat, then two rows of two, separated by white/10 hairlines. Values are mint, labels white at 60%.
- **Case-study card** (`components/case-study-slider.tsx`).
  - A white 2px card split between an image and a quote.
  - A pastel industry pill on the image, over a dark gradient.
  - Three stats divided by hairlines.
  - A dark CTA.
  - Pill pagination dots and round arrow buttons.
- **Customer spotlight** (`components/aethel-testimonials.tsx`).
  - On cream, one large pastel card at a time, with the next one peeking in.
  - Each card has a sector chip, the client name, a quote and a details list with 11px uppercase labels.
- **Pastel article cards** (`components/blog-slider.tsx`). Four across on a dark band, 2px radius, a dark bold title with a muted category. On hover the title dims and an arrow chip fades in. Nothing scales. The cards show no photo: the data lists an `image` for each card, but the component never renders it.
- **Wizard kit** (`app/calculator-roi/page.tsx`, per `DESIGN-SYSTEM.md` section 7).
  - A green eyebrow with a light title.
  - Cream option rows with hairline borders. A selected row gets an accent tint and border.
  - Numbered progress dots joined by accent connectors.
  - This is the website's own step-by-step form, and the closest website pattern to the app's intake wizard.

## 9. Imagery

Source: `public/*.jpg`, `public/*.png`, image paths in `app/` and `components/`. The images themselves are in [`imagery/`](imagery/).

**What the photos show.**
- Modern buildings in bright daylight: glass curtain walls under clear blue skies, a Bucharest skyline, a glazed spa with outdoor pools.
- Clean interiors: a hotel lobby, a mall atrium, a pharmaceutical production line, a factory floor.
- Engineers at work: cabling at ceiling trays, wiring racks and panels, laptops at server racks, a team around drawings, a touch-table demo.
- Control-room and dashboard screens.
- Product renders on grey (an actuator, a thermostat, a controller).
- People are in business dress, and the groups are mixed in gender and background.

**Style.**
- Photorealistic, evenly lit and sharp, with natural, fairly saturated colour: blue skies, warm wood, white interiors.
- The photos are not tinted to the brand greens. Brand colour enters through the layout around them. For example, the case-study image has a `#0D2E2B` gradient at 40% (`components/case-study-slider.tsx`).
- Almost every photo is a 1024×1024 square with a long, descriptive file name, such as `modern-building-automation-dashboard-with-energy-c.jpg`. Some unreferenced files in `public/` have names unrelated to BMS, for example `angellist-intelligence-dashboard.jpg` and `orrick-partners-headshots.jpg`. The dashboard screens in the photos use teal and orange charts, not brand colours.

**What is not real.**
- Nothing in the repository says any photo shows a real SOVITECH project. Treat them as illustrative.
- The six reference-project images (`ref-*.jpg`) and `sector-education-campus.jpg` are one identical grey placeholder.
- `components/aethel-testimonials.tsx` says in a comment that its photos and logos are placeholders.

## 10. Language

Source: `lib/language-context.tsx`, `DESIGN-SYSTEM.md` section 10, `app/layout.tsx`. Voice and CTAs: [`voice-and-messaging.md`](voice-and-messaging.md).

- **Everything is bilingual.** Each user-facing string is written in both languages and chosen with `t(ro, en)`.
- **Romanian is the default** (`lang: "ro"`, `<html lang="ro">`). The RO/EN choice is not saved between visits.
- **Romanian uses full diacritics** (ă â î ș ț), as `DESIGN-SYSTEM.md` states. Some strings break this; see below.
- **CTA pairs** named in `DESIGN-SYSTEM.md`: "Cerere ofertă / Request a quote", "Vorbește cu un specialist / Talk to a specialist", "Calculează ROI / Calculate ROI".
- **Numbers** are not formatted consistently. `components/stats-section.tsx` shows "250,000+" with a comma in both languages. `components/aethel-testimonials.tsx` writes "45.000 m²" in Romanian and "45,000 m²" in English.

## 11. Do and don't

**Do**
- Use `logo.svg` on light surfaces and `logo-white.svg` on dark ones, at a fixed height with automatic width. (`DESIGN-SYSTEM.md` 9; `footer.tsx`)
- Keep one accent per surface: green `#1F6B4A` on light, mint `#C8E6C9` on dark. (`DESIGN-SYSTEM.md` 1)
- Use 1px radius for controls and 2px for surfaces. Use full rounding only for avatars, dots and tiny chips. (`DESIGN-SYSTEM.md` 3)
- Build depth with hairlines and surface contrast. (`DESIGN-SYSTEM.md` 3)
- Set display headings large and light, with tight tracking. Put a "• LABEL" eyebrow above section headings. (`DESIGN-SYSTEM.md` 2)
- Keep hovers to colour changes, at 150ms for text and 300ms for surfaces. (`DESIGN-SYSTEM.md` 4)
- Write every string in Romanian and English, with full Romanian diacritics. (`DESIGN-SYSTEM.md` 10)
- Honour `prefers-reduced-motion`. (`app/globals.css`, `hero-field.tsx`)

**Don't**
- Add accent colours outside the palette. (`DESIGN-SYSTEM.md` 1)
- Use drop shadows. (`DESIGN-SYSTEM.md` 3)
- Scale or move cards on hover. (`DESIGN-SYSTEM.md` 4)
- Animate transforms and backdrop-blur together over text. (`DESIGN-SYSTEM.md` 4)
- Recolour the logo with CSS filters, or typeset the name in place of the logo. (`footer.tsx` comment; the site's practice)
- Use `icon.svg`, the 32px icons, `apple-icon.png`, `sovitech-logo.svg` or the placeholder logos as SOVITECH marks. ([`logo/README.md`](logo/README.md))
- Use green `#1F6B4A` for text on dark surfaces, or `#888888` for body text where AA contrast is required. (Contrast calculated above.)
- Treat the website's figures (stats, case-study results, quotes) as verified data. See the next section.

## 12. Website figures are marketing, not data

Source: `components/stats-section.tsx`, `components/aethel-testimonials.tsx`, `components/case-study-slider.tsx`, `components/blog-slider.tsx`.

These components carry marketing figures. They are recorded here only to describe the design patterns.

- **Stats band:** 250,000+ m² automated, 38% average energy reduction, 30+ projects, 6.1 years average payback, 15+ years' experience. Its intro calls them "verificate și actualizate constant" ("verified and continuously updated"). The repository holds no evidence for that.
- **The figures disagree with each other:**
  - Therme: −38% energy costs and ROI in under 2 years (`aethel-testimonials.tsx`), against −35% consumption, €158K a year and 6 weeks (`case-study-slider.tsx`).
  - The same clients carry different contact names in the two components: Radisson Blu has Maria Popescu and Maria Ionescu, Rompharm has Dan Georgescu and Andrei Vasile, and Therme has Alexandru Ionescu and Ion Popescu.
  - The Rompharm case-study card links to the Therme case-study page.

**For the app.**
- These figures are neither verified engineering data nor an approved reference dataset.
- The app may not use them as values, benchmarks or defaults (`docs/guardrails.md` rule 1 and section 2.1).
- Adding any of them as a reference dataset would count as a loosening, which needs the product owner's approval (`docs/guardrails.md` section 10).
- Several of the words used, such as "GMP-compliant", "Conformitate" and "Cerere ofertă", are reserved terms under `docs/guardrails.md` 2.8.

## 13. Where the code differs from `design-system.md`

| Topic | `DESIGN-SYSTEM.md` says | The code does | Source |
|-------|-------------------------|---------------|--------|
| Testimonials | A dark band with a WebGL dot-matrix wave, a heading pair and 3 glass cards | A light cream carousel of pastel spotlight cards, one at a time. No dot-matrix field. The heading pair "Clienții vorbesc. / Cifrele confirmă." is still there. | `components/aethel-testimonials.tsx` |
| Stats | Mint values alternating with white, accent bars, a `gap-px` grid | All values are mint, with no bars. Rows are divided by hairlines (`divide-y`), not a `gap-px` grid. | `components/stats-section.tsx` |
| Radius | 1px, 2px, 9999px, "nothing else" | `--radius: 0.75rem` is declared. `.btn-sovitech` (sectors and services pages) and `.btn-sovitech-ghost` (sectors and contact pages) use 0.375rem. One `rounded-[4px]`, on the checkbox primitive (`components/ui/checkbox.tsx`). | `app/globals.css`; `app/sectoare/page.tsx`, `app/servicii/page.tsx`, `app/contact/page.tsx` |
| Button colour | Primary buttons are dark `#0D2E2B` | `.btn-sovitech` is green `#1F6B4A`, with a hover of `#185c3f` | `app/globals.css` |
| Heading weight | Display headings at weight 300 | The base h1 and h2 are 900. 47 headings use `font-bold`. | `app/globals.css`, pages |
| Dark section | `#07201C` | `.section-dark` uses `#0D2E2B` (unused) | `app/globals.css` |
| Eyebrow on dark | Mint, through the `section-label` utility | `.section-label` has no dark variant; it is always grey. The blog band uses white at 40%. | `app/globals.css`, `components/blog-slider.tsx` |
| Hover | No scale on cards | Card images zoom to 1.05 on hover in 7 places: `components/latest-articles.tsx` (home page), `app/resurse/page.tsx` (2), `app/resurse/articole/optimizare-hotel-bms/page.tsx` (2), `app/resurse/articole/eficienta-bms/page.tsx` and `app/sectoare/page.tsx`. Two more images zoom to 1.03 (`app/resurse/page.tsx`, featured article and guide band). Whole sector cards scale to 1.02 (`app/sectoare/page.tsx` sector grid, `app/sectoare/[sector]/sector-client.tsx` related sectors). `.card-hover` (scale 1.02) is defined but unused. | `app/globals.css`, the files named |
| Shadows | None | The shadcn primitives keep their shadows: the header's desktop navigation dropdown on every page (`shadow` on the viewport, `components/ui/navigation-menu.tsx`), Card (`shadow-sm`, on 10 pages), Input and the outline Button (`shadow-xs`). Dialog and Sheet (`shadow-lg`) are defined but no page uses them. Also one `shadow-apple` class that neither CSS file defines. | `components/ui/navigation-menu.tsx`, `card.tsx`, `input.tsx`, `button.tsx`; `components/header.tsx`; `app/resurse/studii-de-caz/therme-bucuresti/page.tsx` |
| Sector colours | Khaki for HoReCa/retail, indigo for industrial/office | Two maps. Sector pages: HoReCa green, retail khaki, civil/office lavender, industrial indigo. Home-page spotlight and references page: HoReCa khaki, retail indigo, office lavender, medical mint, industrial `#0D2E2B`, education `#A8C5D4` (outside the palette). See section 3. | `lib/sector-data.ts`; `components/aethel-testimonials.tsx`; `app/resurse/referinte/page.tsx` |
| Glass card (dark) | Section 5 recipe | Not used anywhere in the code | `app/`, `components/`, `lib/` |
| Hairline grid | For sectors, partners and stats | No `gap-px` anywhere. The sector grids use `gap-4`; the partners band is a marquee of separate bordered cards (`mr-4`). | `app/page.tsx`, `app/sectoare/page.tsx`, `components/partners-marquee.tsx` |
| Font weights | 300 / 400 / 600 / 800 / 900 | Components also use 500 (`font-medium`) and 700 (`font-bold`), which `next/font` does not load. If the `next/font` face were applied, the browser would substitute the nearest loaded weight. As the next row explains, it is probably not applied, so these weights come from `system-ui` or a locally installed Inter. | `app/layout.tsx`, components |
| Font family | Inter through `--font-sans` | `next/font` exposes Inter as `--font-inter`, but the CSS names the family `"Inter"` directly. If `next/font` gives the self-hosted face a generated name, visitors without Inter installed may see `system-ui`. Not checked in a browser. | `app/layout.tsx`, `app/globals.css` |
| Diacritics | Full Romanian diacritics | The page title and description have none ("si", "ofera", "intretinere"), and neither do some strings ("Contacteaza un specialist", "Mentenanta inclusa") | `app/layout.tsx`, `app/sectoare/page.tsx`, `app/servicii/page.tsx` |
| Favicon | (not covered) | The v0.app mark, not SOVITECH | `app/layout.tsx`, `public/icon*` |

`styles/globals.css` is the unmodified shadcn/v0 default: neutral greys, Geist fonts and a dark theme. Nothing imports it, so it has no effect on the site. It is kept in `tokens.css`, commented out.

## 14. Branch `redesign-2026`: not SOVITECH's current position, will not be merged (reference only)

**Decided (2026-09-24).** Asked "is it SOVITECH's current position, and will it be merged?", the product owner answered "no". The branch is not the company's current position, and it will not be merged. `main` (`e080614`) is the current website. This section and section 15 are kept for reference only. Nothing in them is a brand rule for the website or the app. The text below is as written before the decision.

Source: the unmerged branch `origin/redesign-2026` of the same repository, commits `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala") and `af81353` (2026-08-27, "Materiale vizuale noi: 10 coperti si 15 diagrame"), compared with `main` at `e080614` (`git diff main origin/redesign-2026`). The branch is not merged into `main`, and as far as we know it is not published. It will not be merged (owner decision, 2026-09-24). Sections 1-13 describe `main` only, and nothing in them was changed to follow the branch.

What the branch changes for the brand, read from the diff:

- **Unchanged.** `DESIGN-SYSTEM.md`, the palette tokens in `app/globals.css` `:root`, the logo files, `app/layout.tsx` (fonts, favicon) and the hero (`components/hero-field.tsx`).
- **New utilities in `app/globals.css`.** Responsive spacing roles: `section-xs` to `section-xl` (vertical padding), `heading-gap-tight` / `heading-gap` / `heading-gap-loose`, and `card-p-sm` / `card-p` / `card-p-lg`. A comment says sections should use these instead of fixed `py-*` values.
- **Article typography.** A new `.article-prose` block: 70ch measure, weight 300 at 17px with 1.75 line height, light h2 and weight-500 h3, green underlined links, 2px-radius hairline tables, diagram figures and a boxed FAQ.
- **Sector colours.** `lib/sector-data.ts` grows from six sectors to ten. The four new ones are pharma (`#0D2E2B`), entertainment (`#B14A36`, a dark coral outside the palette), data centres (`#5C5FD4`) and sport and wellness (`#1F6B4A`). The spotlight and references-page map in section 3 is unchanged.
- **Stats band** (`components/stats-section.tsx`). "38%" becomes "5-15%", "reducere a consumului total al clădirii, documentată în studii independente" ("reduction in whole-building consumption, documented in independent studies"). "6.1" years becomes "1-3 ani", "amortizare pentru optimizarea unui sistem existent" ("payback when optimising an existing system"). The intro still says "verificate și actualizate constant". These are still marketing figures (section 12).
- **Spotlight** (`components/aethel-testimonials.tsx`). The contact names and result percentages are gone. The cards describe scope instead ("1.400 puncte de date", "6 centrale de tratare a aerului"). Radisson Blu's scale is "424 camere", no longer "428". **No page renders this component on the branch.** The branch home page drops both the spotlight and the case-study slider (`components/case-study-slider.tsx`), so neither appears anywhere.
- **Pastel article cards** (`components/blog-slider.tsx`). Built from the article registry (`lib/article-cards.ts`), with no image field. The pastel cycle is lavender, blush, cream-yellow and mint.
- **Footer** (`components/footer.tsx`). The white CTA reads "Cere o evaluare" ("Request an assessment") instead of "Contactează-ne". A company block adds the line "Integrator independent de sisteme de automatizare a clădirilor. Partener autorizat SAUTER din 2017." ("Independent building automation systems integrator. Authorised SAUTER partner since 2017."). The copyright reads "SOVITECH CONTROL SRL". The social links are removed. The header CTA is still "Cerere ofertă".
- **Imagery.** New folders of covers, diagrams, partner logos, service images and reference-client photos. See the branch sections of [`imagery/README.md`](imagery/README.md). Three of these folders are now copied, labelled as branch content: the reference-client pictures in `imagery/reference-projects/`, the service images in `imagery/services-redesign-2026/` and the logos in [`partner-logos/`](partner-logos/). The covers and diagrams are not in `company/brand/`. Byte-identical copies are in `company/business/articles/covers/` (10) and `company/business/articles/diagrams/` (15), labelled as branch content in that folder's README.
- **Visual identity.** Section 15 describes the branch's visual changes in detail.

## 15. `redesign-2026` branch: visual identity changes (reference only)

**Decided (2026-09-24).** The branch is not SOVITECH's current position and will not be merged (section 14). This section is kept for reference only. The fingerprint graphic the branch loads from Vercel (15.2) was not downloaded, by the owner's decision of the same day.

**Source.** The unmerged branch `origin/redesign-2026`, commits `d2d15d2` (2026-08-24) and `af81353` (2026-08-27), compared with `main` at `e080614` using `git diff main origin/redesign-2026`. Files read on the branch:
- `app/globals.css` and `DESIGN-SYSTEM.md`;
- the components `header.tsx`, `footer.tsx`, `service-hero.tsx`, `entry-shell.tsx`, `section-hub.tsx`, `article-layout.tsx`, `category-archive.tsx`, `article-prose.tsx`, `services-showcase.tsx`, `references-marquee.tsx`, `partners-marquee.tsx`, `latest-articles.tsx` and `blog-slider.tsx`;
- `app/page.tsx` and `app/servicii/page.tsx`;
- `lib/article-covers.ts`, `lib/article-cards.ts` and `lib/sector-data.ts`.

**Status.** The branch is not merged, and it will not be merged. It is not SOVITECH's current position (owner decision, 2026-09-24). Sections 1-13 describe `main` and still hold for it. The branch's new tokens are in [`tokens.css`](tokens.css) (a commented-out block at the end) and [`tokens.json`](tokens.json) (key `redesign2026`). Contrast ratios in this section were calculated here.

### 15.1 What stays the same

- `DESIGN-SYSTEM.md` is unchanged. It does not describe any of the new patterns below.
- The `:root` palette, the semantic tokens, `@theme`, the fonts and the favicon (`app/layout.tsx`) are unchanged.
- The logo files, `building.svg` and the WebGL field (`components/hero-field.tsx`) are unchanged. No new SOVITECH mark or favicon exists (see [`logo/README.md`](logo/README.md)).
- The radius family is the same. `rounded-[2px]` grows from 226 to 332 uses and `rounded-[1px]` from 109 to 113; `rounded-full` goes from 149 to 147. No new radius appears.
- Shadows are the same: 42 `shadow-*` classes on each side.
- The header looks the same: logo, "Cerere ofertă" ("Request a quote") button and RO/EN toggle.

### 15.2 A dark WebGL hero on most page types

On `main`, the WebGL field (`HeroField`) runs only on the home page. On the branch, 20 files render it. They include the six new page frames:
- `service-hero.tsx`, on every `/servicii/*` page;
- `entry-shell.tsx`, on guides, articles and tools;
- `section-hub.tsx`, on the `/ghid`, `/instrumente` and `/pentru` hubs (its source comment also names `/resurse`, but `app/resurse/page.tsx` does not use it);
- `category-archive.tsx`, on `/resurse/<categorie>`;
- `role-page.tsx` and `roi-methodology.tsx`.

The pages `/servicii`, `/contact`, `/expertiza`, each sector page, `/referinte`, `/produse`, `/despre-noi`, `/calculator-roi`, `/cerere-oferta`, `/ghid-bms` and the three legal pages render it too. The commit message lists it: "Camp WebGL (HeroField) pe hero-urile intunecate" ("WebGL field on the dark heroes").

The shared opening band:
- a `#07201C` background with the field behind it;
- a mint eyebrow "• LABEL" (`text-sm font-semibold tracking-wider uppercase`, `#C8E6C9`);
- a light display title (`text-4xl md:text-6xl font-light tracking-tighter`, white);
- a lead line (`text-lg font-light`, white at 60%);
- `section-l` spacing.

`ServiceHero` is smaller: a breadcrumb in white at 30%, the eyebrow "• Servicii BMS" at `text-xs tracking-widest`, a title up to `lg:text-5xl`, and the remote fingerprint SVG at 3% opacity. The result is a site that stays light first (cream pages, white cards) but opens most pages with a dark band. `/resurse` keeps a cream masthead with a dark title up to `md:text-8xl`. `/pricing`, the two older articles (`/resurse/articole/*`), the two case studies and most `/ghid-bms` sub-pages open light; `/ghid-bms/resurse` has its own dark-teal gradient band, without the field.

### 15.3 Home page

Source: `app/page.tsx`, `components/services-showcase.tsx`.

- **Hero type is smaller.** The headline goes from `text-5xl md:text-7xl lg:text-8xl` (up to 96px) to `text-5xl md:text-6xl lg:text-7xl` (up to 72px). `DESIGN-SYSTEM.md` still specifies the 96px scale.
- **New hero line.** "Construit să controleze orice clădire. / Oriunde." ("Built to control every building. / Everywhere.") becomes "Integrator independent de automatizare a clădirilor și BMS." ("Independent building automation and BMS integrator."). The white button reads "Cere o evaluare a clădirii" ("Request a building assessment") instead of "Cerere ofertă gratuită" ("Request a free quote").
- **No faces.** The three generated headshots beside the project count are removed. A code comment says: "no invented people on the site". The line now reads "25 proiecte de referință livrate, cu nume public, …" ("25 reference projects delivered under public names, …"). That figure is marketing copy (section 12).
- **Services on the dark band.** The four service cards sit inside the hero's dark band. Each is a 3:4 portrait image with a round glass arrow button (`backdrop-blur-sm`). On phones they become a snapping horizontal rail. The images are in [`imagery/services-redesign-2026/`](imagery/services-redesign-2026/).
- **SAUTER credential block.** It sits in a dark "Despre noi" ("About us") band. The SAUTER logo is on a white plate, beside "Systems Partner autorizat" / "Din 2017", with a trademark line under it. See [`partner-logos/`](partner-logos/).
- **Sector grid.** It is a grid of solid sector-colour tiles, each with a light title and an arrow. Entertainment is filtered out of the home grid.
- **Home page order.** Hero and services, references marquee (now with photos), "Despre noi", sectors, stats, protocol marquee, pastel article cards, latest articles. The customer spotlight and the case-study slider are gone from the home page.

### 15.4 Spacing roles

Source: `app/globals.css`, new `@utility` blocks. A comment there says: "Never hardcode py-* on a <section> — pick the token that matches its role."

| Utility | Base | From 640px | From 1024px | Role (from the source comment) |
|---------|------|-----------|-------------|--------------------------------|
| `section-xs` | 2rem | 2.5rem | | Thin bands: marquees, trust strips, breadcrumb bars |
| `section-s` | 2.5rem | 3rem | | Compact sections |
| `section-m` | 3rem | 4rem | | Default content sections |
| `section-l` | 4rem | 5rem | 6rem | Major sections ("was: py-16 md:py-24") |
| `section-xl` | 5rem | 7rem | 8rem | Hero and statement sections |
| `heading-gap-tight` | 0.75rem | 1rem | | Heading-to-content gap (margin below) |
| `heading-gap` | 1rem | 1.5rem | | Heading-to-content gap |
| `heading-gap-loose` | 2rem | 3rem | | Heading-to-content gap |
| `card-p-sm` | 1rem | 1.25rem | | Card padding |
| `card-p` | 1.25rem | 1.5rem | | Card padding |
| `card-p-lg` | 1.5rem | 2rem | 2.5rem | Card padding |

The `section-*` values are vertical padding (`padding-block`). Existing sections move onto them. For example, the stats band goes from `py-32` to `section-xl`, the footer's top from `py-16` to `section-m`, and the partners band from `py-14` to `section-s`.

### 15.5 Editorial typography

Source: `app/globals.css` `.article-prose`, `components/article-prose.tsx`, `components/article-layout.tsx`.

**Article body (`.article-prose`).**
- A 70ch measure, `#0D2E2B` text, weight 300, 17px, line height 1.75.
- h2 is 1.75rem, weight 300, tracking −0.025em. h3 is 1.25rem, weight 500. Weight 500 is not one of the weights `next/font` loads (section 13).
- Links are green `#1F6B4A`, underlined 3px below the text. The underline is green at 35% and goes solid on hover (0.3s). List markers are green. A blockquote has a 2px green rule on the left, with text at 75%.
- Tables sit in a box with a 2px radius and a 10% hairline. The header row has a 4% tint, and the table scrolls sideways below 560px.
- Diagram figures have a white ground, a 10% hairline and a 2px radius. The caption is 0.8rem at 55%.
- The FAQ box is white, with a 2px radius and a 12% hairline. Its label is 0.7rem, weight 600, tracking 0.14em, uppercase, at 50%.

**Article frame (`ArticleLayout`).**
- Three columns: a 190px sticky rail, the article at up to 720px, and an empty 190px column so the text sits on the page axis.
- The rail has 11px uppercase labels (tracking 0.14em, at 45%), a category chip (2px radius, 6% tint), and two 40px square share buttons (2px radius, 15% border).
- The author is shown as a round `#07201C` disc with "SC" in mint, next to "Sovitech Control" / "Echipa de inginerie" ("Engineering team"). It is typeset text, not a logo file.
- The dates read "Publicat dd.mm.yyyy · Actualizat dd.mm.yyyy" ("Published … · Updated …").
- The cover runs full width, with a 2px radius and a 10% hairline.

**Contrast.** Several of the new muted text styles fall below WCAG AA 4.5:1 for small text:
- rail labels and the date line at 45% on cream: 2.6:1;
- the FAQ label at 50% on white: 3.1:1;
- figure captions at 55% on cream: 3.4:1.

### 15.6 Cards with cover art

Source: `components/section-hub.tsx`, `category-archive.tsx`, `latest-articles.tsx`, `entry-shell.tsx`, `lib/article-covers.ts`.

- **Card.** White, with a 2px radius and an 8% hairline that rises to 25% on hover (300ms). The title is 18px light, the description is 14px `#888888`, and a green "Deschide" / "Citește" ("Open" / "Read") link has an arrow nudge.
- **Cover frame.** A 16:9 frame painted in the cover's own background colour. The cover sits inside it with a 10% inset (`p-[10%]`, `object-contain`), so the frame and the artwork read as one surface. The colours are "Sampled from the artwork itself": `#07201C`, `#5C5FD4`, `#C5C0F6` and `#C8E6CA`, with `#0A231E` as the fallback. `#C5C0F6` and `#C8E6CA` are one step off lavender `#C5C0F5` and mint `#C8E6C9`.
- **Cover hover.** The cover zooms to 1.02 on hover in the hub and archive cards, and to 1.05 in `latest-articles.tsx`.
- **Planned entries.** Entries not yet published are listed without links under "• În pregătire" ("In preparation"), as a hairline list in muted text.
- **Archive CTA.** The archive page ends with a dark `#0D2E2B` panel (`card-p-lg`) and the ghost button (`.btn-sovitech-ghost`, 0.375rem radius) "Contactează-ne" ("Contact us").
- **Cluster lists.** On guide pages, `EntryShell` lists related articles as a hairline list, each with an 80×48 cover thumbnail.

### 15.7 Cover and diagram artwork

Source: `public/coperti/` (10 covers, 1920×1080) and `public/diagrame/` (15 diagrams, 1200×1200), with their XMP. They are not in `company/brand/`. Byte-identical copies are in `company/business/articles/covers/` and `company/business/articles/diagrams/`.

- Their XMP says they were made in Canva ("Cristian Gaidenic's team"), between 2026-08-24 and 2026-08-26.
- They are flat infographics on mint, indigo, lavender or deep-green grounds. Each cover has a large light figure with a one-line label, then a white or tinted panel holding a table or diagram.
- The SOVITECH logo sits bottom left: `logo.svg` artwork on light grounds and the white version on dark ones. No new mark is introduced.
- The figures on the covers (for example "4-18" EUR/mp, "100" data points) are article marketing copy, not data (section 12).

### 15.8 Colour

The palette tokens do not change. The new colours are literals in components and data.

**Sectors.** `lib/sector-data.ts` has ten sectors. The home grid and the sector pages use these colours as solid fills.

| Sector | Fill | Text on it | Contrast | New? |
|--------|------|-----------|----------|------|
| Civil and offices | lavender `#C5C0F5` | dark | 8.5:1 | No |
| Medical | mint `#C8E6C9` | dark | 10.8:1 | No |
| Retail | khaki `#8B7B5C` | white | 4.1:1 | No |
| HORECA | green `#1F6B4A` | white | 6.4:1 | No |
| Industrial and logistics | indigo `#5C5FD4` | white | 5.2:1 | No |
| Education and institutions | coral `#E07B6A` | dark | 5.0:1 | No |
| Pharma | dark `#0D2E2B` | white | 14.6:1 | Yes |
| Entertainment | dark coral `#B14A36` | white | 5.4:1 | Yes. The colour is outside the palette. On `main` it appears only as the text colour paired with coral on sector pages. |
| Data centres | indigo `#5C5FD4` | white | 5.2:1 | Yes. Same colour as industrial. |
| Sport and wellness | green `#1F6B4A` | white | 6.4:1 | Yes. Same colour as HORECA. |

"Dark" is `#0D2E2B`. Whether the text is dark or white comes from the `accentTextDark` flag. The references page keeps its own map (section 3), unchanged; only its path moves, to `app/referinte/page.tsx`.

**Services.** `app/servicii/page.tsx` pairs a pale tint with a text colour for each service tab.

| Service | Tint | Text | Contrast | New? |
|---------|------|------|----------|------|
| Consultanță (consultancy) | `#E3E1F9` | `#5C5FD4` | 4.1:1 | Yes |
| Proiectare (design) | `#C8E6C9` | `#1F6B4A` | 4.8:1 | No |
| Execuție (installation) | `#C5C0F5` | `#5C5FD4` | 3.0:1 | No |
| Integrare (integration) | `#FFE0B2` | `#E65100` | 3.0:1 | No |
| Întreținere / Mentenanță (maintenance) | `#B2EBF2` | `#006064` | 5.6:1 | No. The key is `mentenanta` on `main` and `intretinere` on the branch. |
| Modernizare (modernisation) | `#EDE7DC` | `#8B7B5C` | 3.4:1 | Yes |

`#FFE0B2`, `#B2EBF2`, `#E65100` and `#006064` are already on `main` in the same file. They are outside the palette, and sections 1-13 do not list them.

**Article category badges** (`lib/article-cards.ts`, `badgeColorsFor`). They are 10px bold pills, used on the latest-articles cards.

| Categories | Background | Text | Contrast |
|-----------|------------|------|----------|
| Reglementări & Conformare; BMS, SCADA & Integrare | lavender `#C5C0F5` | indigo `#5C5FD4` | 3.0:1 |
| ESG, Energie & Raportare; Ghiduri pe Sectoare; fallback | mint `#C8E6C9` | green `#1F6B4A` | 4.8:1 |
| Performanța Clădirii | cream-yellow `#E8E8C0` | khaki `#8B7B5C` | 3.3:1 |
| Modernizare & Retrofit | blush `#E8C5B8` | dark coral `#B14A36` | 3.4:1 |

**Pastel article cards** (`components/blog-slider.tsx`). The cycle becomes lavender, blush, cream-yellow and mint. Sand `#D4C4A8` drops out.

**The one-accent rule still holds on each surface:** mint on dark, green on light. The new fills are sector, service and category colours, not accents.

### 15.9 Motion

- **Hover scale.** The branch has 11 scale hovers, the same count as `main`, but in different places:
  - new: reference cards in the home marquee (1.05) and the cover images in the hub and archive cards (1.02);
  - fewer: `/resurse` goes from 4 to 1 (1.03);
  - kept: the sector list on `/expertiza` (images 1.05, cards 1.02).

  All of them break the "no scale" rule in section 7.
- **Arrow nudges.** They stay (`translate-x-0.5` on hover).
- **Marquees.** Both keep the 45s loop. The protocol marquee now shows logos on white, spaced 80px apart, with no heading. The references marquee shows 300px photo cards with a round arrow chip that turns mint on hover.

### 15.10 Header and footer

Source: `components/header.tsx`, `components/footer.tsx`.

- **Header.** Only the navigation changes.
  - "Sectoare" ("Sectors") becomes "Expertiză" ("Expertise"), with a two-column dropdown of nine links.
  - "Întreținere BMS" ("BMS Maintenance") is added under services.
  - The links point to the new routes.
- **Footer.** It keeps the `#07201C` ground, the white logo, the mint-hover white button and the four link columns.
  - The button now reads "Cere o evaluare" ("Request an assessment").
  - A new company block, in 12px white at 40%, gives the legal name (white at 60%, medium weight), address, registration numbers, phone, email and hours. It ends with "Integrator independent de sisteme de automatizare a clădirilor. Partener autorizat SAUTER din 2017." ("Independent building automation systems integrator. Authorised SAUTER partner since 2017.")
  - The bottom bar reads "© <year> SOVITECH CONTROL SRL. Toate drepturile rezervate." ("All rights reserved."), with links to the three legal pages.
  - The LinkedIn and X icons are removed. The code comment says they "pointed at the platforms' start pages, not company profiles".

### 15.11 Partner marks and imagery

- **Partner marks.** Real SAUTER, KNX, BACnet, Modbus, M-Bus and DALI logos replace the text placeholders. LonMark is dropped. See [`partner-logos/README.md`](partner-logos/README.md).
- **Imagery.** The branch moves away from generated photoreal illustration and towards three kinds of picture:
  - photographs, and two renders, labelled with reference clients' names, on `/referinte`, the home marquee and the sector pages;
  - dark Canva service images that are probably AI-generated, with invented SAUTER screens;
  - Canva infographic covers in the brand palette.

  Provenance, permission and the proposed rules for the app (proposals awaiting approval, not rules in force) are in [`imagery/README.md`](imagery/README.md), in the branch sections.

### 15.12 Where the branch departs from `DESIGN-SYSTEM.md`

| Topic | `DESIGN-SYSTEM.md` says | The branch does |
|-------|-------------------------|-----------------|
| Hero display | Up to `text-8xl` (96px) | Home hero up to `lg:text-7xl` (72px). The new page frames (15.2) go up to `md:text-6xl` (60px). |
| Accents | Do not add accent colours outside the palette | Adds `#B14A36` as a sector fill, `#E3E1F9` and `#EDE7DC` as service tints, and near-palette cover grounds (`#C5C0F6`, `#C8E6CA`, `#0A231E`) |
| Hover | No scale on cards | 11 scale hovers, 3 of them new (15.9) |
| Font weights | 300 / 400 / 600 / 800 / 900 | `.article-prose` h3 is weight 500 |
| Coverage | (the system as written) | No section on spacing roles, article prose, cover cards or the dark opening band. The document was not updated on the branch. |

### 15.13 For the app

- Nothing here is approved for the app. [`app-alignment.md`](app-alignment.md) lists the rows the branch would change. The mockups still govern the app.
  - **Decided (2026-09-24):** the branch will not be merged, so none of it becomes the app's brand. The app takes the brand as `main` applies it, in its dark variant. The brand governs the app's visual system; the mockups govern layout, structure, flows and content ([`app-alignment.md`](app-alignment.md#decision-2026-09-24)).
- The branch's stats and card figures are still marketing copy (section 12). Its "Cere o evaluare" CTAs avoid the reserved term "ofertă", but the header keeps "Cerere ofertă" (`docs/guardrails.md` 2.8).
