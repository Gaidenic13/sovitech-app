# SOVITECH website: tech stack and what the app can reuse

This file records how the SOVITECH company website is built: framework and library versions, styling, the shadcn setup, the bilingual pattern and the build configuration. It ends with a concrete list of what the SOVITECH App can reuse and what it should not. It describes `Gaidenic13/sovitech-website` at commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11); paths are relative to that repository's root, and a verbatim copy of the key files is in `company/website/source/`.

Nothing in the website repo was run, built or installed to write this file. Versions come from `package.json` and `pnpm-lock.yaml`, read as text.

Sections 1 to 11 describe `main`. Section 12 describes the unmerged branch `redesign-2026`, for reference only. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. `main` is the current website.

---

## 1. Summary

| Area | Choice | Source |
|------|--------|--------|
| Origin | Generated in v0 (Vercel), imported to Git on 2026-07-07, then reworked with Claude Code | `package.json` (`"name": "my-v0-project"`), `app/layout.tsx` (`generator: "v0.app"`), git log |
| Framework | Next.js 16 App Router, React 19 | `package.json` |
| Language | TypeScript 5, `strict: true` | `tsconfig.json` |
| Styling | Tailwind CSS v4, CSS-first config (no `tailwind.config.*`), PostCSS plugin | `app/globals.css`, `postcss.config.mjs` |
| Components | shadcn/ui, "new-york" style, Radix primitives, lucide icons | `components.json`, `components/ui/` |
| Bilingual RO/EN | Hand-rolled React context with `t(ro, en)`, no i18n library | `lib/language-context.tsx` |
| Package manager | pnpm (lockfile v9; a commit mentions pnpm 11) | `pnpm-lock.yaml`, `pnpm-workspace.yaml`, git log |
| Hosting | Vercel, inferred from the `*.vercel.app` URL and `@vercel/analytics`. No `vercel.json`. | `app/layout.tsx`, `app/sitemap.ts` |
| Backend | None. No API routes, no server actions, no database, no environment variables read. | file listing; no `app/api/`, no `process.env` |
| Tests, lint | No tests. A `lint` script exists, but ESLint is not a dependency and there is no ESLint config. | `package.json`, file listing |

---

## 2. Framework and library versions

"Declared" is the range in `package.json`. "Resolved" is the version recorded in `pnpm-lock.yaml`.

### 2.1 Core

| Package | Declared | Resolved | Used by |
|---------|----------|----------|---------|
| `next` | 16.0.10 | 16.0.10 | whole site |
| `react`, `react-dom` | 19.2.0 | 19.2.0 | whole site |
| `typescript` | ^5 | 5.7.3 | dev |
| `tailwindcss` | ^4.1.9 | 4.2.0 | dev |
| `@tailwindcss/postcss` | ^4.1.9 | 4.2.0 | dev, `postcss.config.mjs` |
| `postcss` | ^8.5 | 8.5.6 | dev |
| `tw-animate-css` | 1.3.3 | 1.3.3 | `app/globals.css` |
| `@types/react` | ^19 | 19.2.14 | dev |
| `@types/node` | ^22 | 22.20.0 | dev |
| `@vercel/analytics` | 1.3.1 | 1.3.1 | `app/layout.tsx` |
| `lucide-react` | ^0.454.0 | 0.454.0 | icons in pages and components |
| `clsx` | ^2.1.1 | 2.1.1 | `lib/utils.ts` |
| `tailwind-merge` | ^3.3.1 | 3.4.0 | `lib/utils.ts` |
| `class-variance-authority` | ^0.7.1 | 0.7.1 | shadcn components |

Source: `package.json`, `pnpm-lock.yaml` (`importers` section).

### 2.2 Radix primitives (all pinned exactly)

accordion 1.2.2, alert-dialog 1.1.4, aspect-ratio 1.1.1, avatar 1.1.2, checkbox 1.1.3, collapsible 1.1.2, context-menu 2.2.4, dialog 1.1.4, dropdown-menu 2.1.4, hover-card 1.1.4, label 2.1.1, menubar 1.1.4, navigation-menu 1.2.3, popover 1.1.4, progress 1.1.1, radio-group 1.2.2, scroll-area 1.2.2, select 2.1.4, separator 1.1.1, slider 1.2.2, slot 1.1.1, switch 1.1.2, tabs 1.1.2, toast 1.2.4, toggle 1.1.1, toggle-group 1.1.1, tooltip 1.1.6.

Source: `package.json`.

### 2.3 Installed but not used by any page

These come from the v0 template. They are imported only by unused files in `components/ui/`, or not at all.

| Package | Declared | Imported by |
|---------|----------|-------------|
| `zod` | 3.25.76 | nothing |
| `@hookform/resolvers` | ^3.10.0 | nothing |
| `react-hook-form` | ^7.60.0 | `components/ui/form.tsx` only |
| `date-fns` | 4.1.0 | nothing |
| `recharts` | 2.15.4 | `components/ui/chart.tsx` only |
| `embla-carousel-react` | 8.5.1 | `components/ui/carousel.tsx` only |
| `vaul` | ^0.9.9 | `components/ui/drawer.tsx` only |
| `cmdk` | 1.0.4 | `components/ui/command.tsx` only |
| `input-otp` | 1.4.1 | `components/ui/input-otp.tsx` only |
| `react-day-picker` | 9.8.0 | `components/ui/calendar.tsx` only |
| `react-resizable-panels` | ^2.1.7 | `components/ui/resizable.tsx` only |
| `sonner` | ^1.7.4 | `components/ui/sonner.tsx` only |
| `next-themes` | ^0.4.6 | `components/theme-provider.tsx` (never mounted), `components/ui/sonner.tsx` |
| `tailwindcss-animate` | ^1.0.7 | nothing (a Tailwind v3 plugin; the site uses `tw-animate-css`) |
| `autoprefixer` | ^10.4.20 | nothing (not in `postcss.config.mjs`) |

Source: `package.json`; import search over `app/`, `components/`, `lib/`, `hooks/`.

---

## 3. Styling approach

### 3.1 Tailwind v4, CSS-first

`app/globals.css` is the only stylesheet the site loads (imported once in `app/layout.tsx`). It:

1. imports `tailwindcss` and `tw-animate-css`;
2. declares a `dark` custom variant (`@custom-variant dark (&:is(.dark *));`), which the site never activates;
3. defines brand tokens on `:root`: `--sovitech-dark #0D2E2B`, `--sovitech-green #1F6B4A`, `--sovitech-mint #C8E6C9`, `--sovitech-lavender #C5C0F5`, `--sovitech-khaki #8B7B5C`, `--sovitech-coral #E07B6A`, `--sovitech-indigo #5C5FD4`, `--sovitech-offwhite #F5F4F0`, `--sovitech-gray #888888`;
4. maps shadcn's semantic tokens onto them (`--background`, `--foreground`, `--primary`, `--accent`, `--border`, `--ring`, `--chart-1..5` and others);
5. exposes only the semantic tokens to Tailwind in `@theme inline` (`--color-background`, `--color-primary`, and so on), plus `--font-sans`, `--font-mono` and a radius scale derived from `--radius: 0.75rem`;
6. adds base styles (a clamp-based `h1`-`h4` scale at weights 900/800/700, link colour inside `main`, mint text selection);
7. adds utilities: `.container-site` (max width 80rem, gutters 1rem / 1.5rem / 2rem at base / 640px / 1024px), `.section-label`, `.section-dark`, `.section-light`, `.card-hover`, `.stat-number`, `.badge-sovitech`, `.btn-sovitech`, `.btn-sovitech-ghost`, `.content-wrap`;
8. turns animations and transitions off under `prefers-reduced-motion: reduce`;
9. adds a print block that prints only `#roi-report` when it is on the page, with `print-color-adjust: exact`;
10. defines the `sovitech-marquee` keyframes and `.animate-marquee` (45 s loop, paused on hover, off under reduced motion).

The brand colour names (`--sovitech-*`) are **not** exposed as Tailwind colours. Pages therefore write hex values directly: there are about 750 arbitrary hex classes such as `bg-[#0D2E2B]` and `text-[#888888]` in `app/` and `components/`. `#0D2E2B` alone appears about 400 times.

Source: `app/globals.css`, `app/layout.tsx`, search over `app/` and `components/*.tsx`.

### 3.2 `styles/globals.css` is unused

`styles/globals.css` is the stock shadcn/v0 stylesheet (neutral `oklch` palette, Geist font, a `.dark` theme, sidebar tokens). Nothing imports it. It is copied into `company/website/source/` only so the snapshot matches the request; it is not the brand.

Source: `styles/globals.css`; no import of it anywhere.

### 3.3 Two styling generations side by side

| Generation | How it looks in code | Pages |
|------------|----------------------|-------|
| Brand recipe (from the 2026-07-08 redesign) | Hex utility classes, `font-light`, `tracking-tighter`, `rounded-[1px]` / `rounded-[2px]`, `.container-site`, dark bands `#07201C` | `/`, `/servicii`, `/servicii/executie`, `/servicii/mentenanta`, `/sectoare`, `/sectoare/[sector]`, `/resurse`, `/resurse/referinte`, `/contact`, `/calculator-roi`, `/cerere-oferta`, `/produse/[id]`, most of `/produse`, `/ghid-bms` |
| v0 / shadcn default | Semantic token classes (`bg-background`, `text-muted-foreground`, `text-primary`), `font-bold`, `container mx-auto` | `/ghid-bms/*` sub-pages, both articles, both case studies, `/servicii/proiectare`, `/servicii/integrare`, `/pricing` |

Because the semantic tokens are mapped to the brand palette, the second group still uses brand colours, but with a different type weight and layout rhythm.

Source: class counts per page file.

### 3.4 Typography and font loading

- `app/layout.tsx` loads Inter through `next/font/google` (weights 300, 400, 600, 800, 900, `display: swap`) and puts the CSS variable `--font-inter` on `<html>`.
- `app/globals.css` does not use `--font-inter`. It sets `--font-sans` and `body` to the literal family `"Inter", system-ui, -apple-system, sans-serif`.
- With `next/font`, the self-hosted face is registered under a generated family name, not "Inter". If that holds here, visitors who do not have Inter installed locally see `system-ui`. **This was not checked by running the site.**
- `DESIGN-SYSTEM.md` section 2 describes the intended type: display headings `font-light` with `tracking-tighter`, body `font-light`, eyebrows `text-sm font-semibold tracking-wider uppercase`. The base `h1`/`h2` rules in `app/globals.css` set weight 900, which the pages override with `font-light` classes.

Source: `app/layout.tsx`, `app/globals.css`, `DESIGN-SYSTEM.md`.

### 3.5 Shape, depth and motion

Radius family 1px / 2px / full; no shadows (depth from hairline borders and surface contrast); colour-only hover; 300 ms for surfaces and 150 ms for text; opacity fades with small rises for reveals; WebGL backgrounds that respect `prefers-reduced-motion`.

Source: `DESIGN-SYSTEM.md` sections 3 and 4, `components/hero-field.tsx`. The brand rules are recorded in `company/brand/design-system.md`.

---

## 4. shadcn setup

| Setting | Value |
|---------|-------|
| Style | `new-york` |
| React Server Components | `rsc: true` |
| TSX | `true` |
| Tailwind config | `""` (Tailwind v4, no config file) |
| CSS file | `app/globals.css` |
| Base colour | `neutral` |
| CSS variables | `true` |
| Prefix | none |
| Aliases | `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks` |
| Icon library | `lucide` |

Source: `components.json`. The `@/*` alias maps to the repo root in `tsconfig.json`.

**Components present.** 57 files in `components/ui/`: accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, button-group, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, empty, field, form, hover-card, input, input-group, input-otp, item, kbd, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip, plus duplicate `use-mobile.tsx` and `use-toast.ts`.

**Components used by pages.** 12: badge, button, card, checkbox, input, label, navigation-menu, progress, radio-group, select, slider, textarea.

**Local changes to the generated components.**
- The 2026-07-08 redesign replaced `rounded-md` and similar with `rounded-[1px]` or `rounded-[2px]`; today 32 files in `components/ui/` carry 80 `rounded-[1px]` / `rounded-[2px]` classes (67 and 13, on 79 lines), or 94 in 34 files when directional variants such as `rounded-l-[1px]` are included. The `--radius` token (0.75rem) is therefore mostly unused.
- `navigation-menu.tsx`: enter and exit keyframe animations were removed on 2026-07-10, because a stalled animation left the dropdown panel invisible. The menu now shows and hides instantly.

**Hooks.** `hooks/use-mobile.ts` (a 768px breakpoint hook) and `hooks/use-toast.ts` (the legacy shadcn toast store) are byte-identical to `components/ui/use-mobile.tsx` and `components/ui/use-toast.ts`. No page uses either.

Source: `components.json`, `components/ui/`, `hooks/`, git history of commits `59c9e34` and `3d4b3b6`.

---

## 5. Bilingual RO/EN pattern

- `LanguageProvider` (client component) holds `lang` in `useState`, default `"ro"`. `useLanguage()` returns `{ lang, setLang, t }`, where `t(ro, en)` returns one of its arguments.
- There are no message keys and no catalogue: each string pair sits inline where it is used, or as `labelRo` / `labelEn` fields in data arrays.
- The choice is not persisted, not in the URL, and does not change `<html lang>`. Server-rendered metadata stays Romanian.
- To make pages react to the toggle, almost every page is a client component (`"use client"`), which in turn stops them from exporting per-page metadata.

The four variants of the pattern, and the diacritics inconsistency, are listed in `sitemap.md` section 6.

Source: `lib/language-context.tsx`, `app/layout.tsx`.

---

## 6. Build configuration

| File | Content | Notes |
|------|---------|-------|
| `next.config.mjs` | `images: { unoptimized: true }` | `next/image` does no resizing. Commit `0469235` removed `typescript.ignoreBuildErrors: true`, so type errors now fail the build. |
| `tsconfig.json` | `target: ES6`, `lib: dom, dom.iterable, esnext`, `strict`, `noEmit`, `moduleResolution: bundler`, `jsx: react-jsx`, `incremental`, Next plugin, `paths: { "@/*": ["./*"] }`; includes `next-env.d.ts`, `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`, `.next/dev/types/**/*.ts` | `.next/dev/types/**/*.ts` was added by Next 16 tooling (commit `472be82`); `.next/types/**/*.ts` was already in the v0 import (`c9743c3`). |
| `postcss.config.mjs` | `@tailwindcss/postcss` only | |
| `pnpm-workspace.yaml` | `allowBuilds: { sharp: false }` | Not a workspace definition; it only stops pnpm from running the `sharp` build script. Not copied to `company/website/source/` (see its README). |
| `package.json` scripts | `dev` (`next dev`), `build` (`next build`), `start` (`next start`), `lint` (`eslint .`) | `lint` cannot run: ESLint is not installed and has no config. |
| `.gitignore` | `node_modules`, `.next`, `out`, `build`, `.env*`, `.vercel`, `*.tsbuildinfo`, `next-env.d.ts`, `.DS_Store`, `.claude/` | |

**Assets.** `public/` holds about 73 MB, of which about 64 MB are 212 product images in `public/products/` (several over 1 MB, one about 5.7 MB). With `images.unoptimized`, these are served at full size. Most other images in `public/` are stock or v0 placeholders with descriptive file names (for example `businessman-on-phone-call-discussing-scout-fund-in.jpg`, `stock-market-trading-floor-financial-charts.jpg`). Brand assets are described in `company/brand/`.

**External runtime dependencies.** A decorative "fingerprint" SVG is loaded from a v0 blob store (`hebbkx1anhila5yf.public.blob.vercel-storage.com`) on 7 pages; an OpenStreetMap iframe on `/contact`; the SAUTER catalogue on Issuu is linked from `/produse`; Vercel Analytics.

Source: the files named, `du` over `public/` (run on the read-only clone), search for `https://` in `app/`, `components/`, `lib/`.

---

## 7. Custom components

| File | What it is | Notes for the app |
|------|------------|-------------------|
| `components/header.tsx` | Sticky bar, data-driven `navGroups`, RO/EN segmented toggle, mobile drawer | Toggle UI and the drawer's close-on-route and Escape handling are generic |
| `components/footer.tsx` | Dark footer, data-driven `columns` | Marketing only |
| `components/hero-field.tsx` | WebGL fluid background: fbm noise shader, DPR capped at 2, pointer drift, context-loss recovery, reduced-motion fallback (single static frame) | Marketing visual. The context-loss and reduced-motion handling is a reference if the app later gets a WebGL viewer. |
| `components/aethel-testimonials.tsx` | Testimonial band with a WebGL dot-matrix background and three glass cards | Contains marketing figures |
| `components/stats-section.tsx` | Dark stat grid with count-up numbers | Contains marketing figures |
| `components/case-study-slider.tsx`, `components/blog-slider.tsx` | Sliders | Marketing only |
| `components/references-marquee.tsx`, `components/partners-marquee.tsx` | Infinite marquees | Marketing only |
| `components/services-showcase.tsx`, `components/latest-articles.tsx` | Home sections | Marketing only |
| `components/product-detail.tsx` | Product detail layout with a spec table that shows "Nu este specificat" / "Not specified" for missing values | See section 9 |
| `components/theme-provider.tsx` | `next-themes` wrapper | Never mounted |
| `app/sectoare/[sector]/sector-client.tsx` | Sector page template | Marketing only |
| `app/calculator-roi/page.tsx` (`StepHeading`, `FormField`, `RadioOption`, `CheckboxRow`, `ProgressBar`, `ResultsReport`) | Wizard form kit and results report | See sections 8 and 9 |

Source: the files named, `DESIGN-SYSTEM.md` sections 6 and 7.

---

## 8. The two calculators

The site has two independent savings calculators. They are recorded here because they look reusable and are not.

### 8.1 `/calculator-roi` (`lib/roi-calculator.ts`)

- **Industries and savings ranges:** hospitality 15-30%, office 20-40%, retail 25-35%, healthcare 20-30%, industrial 20-40%, data centre 20-35%. Each also has a maintenance multiplier (1.15 to 1.3) and a payback text (for example "Amortizare: 10–15 luni" for hospitality).
- **Savings %:** starts at the lower bound, adds fixed "bonuses" (for example +5 for hybrid offices, +5 for malls, +5 for guest comfort issues, +3 for occupancy under 60%), capped at the upper bound. The result is a single number.
- **Annual energy savings** = annual energy cost × savings %.
- **Maintenance savings** = maintenance budget × (multiplier − 1), where the multiplier grows with equipment age and repair frequency.
- **Goal "bonuses":** total savings × 1.1 if "comfort" is chosen, × 1.05 if "environmental" is chosen.
- **Implementation cost** = building area × **25 EUR/m²**, times a multi-building factor of 1 − 0.05 × building count, never below 0.6, when there is more than one building, × 0.7 if systems exist; replaced by the user's budget if one is given.
- **Payback** = cost / (annual savings / 12) months; **5-year return** = 5 × annual savings − cost; **ROI %** = 5-year return / cost.
- **Results screen:** year 3 and year 5 tiles show annual savings × **3.2** and × **5.8** (`app/calculator-roi/page.tsx`), which do not match 3 and 5 years of the annual figure. No reason is given in the code.
- **No industry selected:** the function returns all zeros.

### 8.2 `/ghid-bms/calculator` (inline in the page)

- Savings rate: 30% office, 35% retail, 32% otherwise.
- Annual savings = monthly energy cost × 12 × rate.
- **Investment = area × 150 EUR/m²**, six times the 25 EUR/m² used by `/calculator-roi`.
- CO2 reduction = area × 0.05.
- Defaults: area 5.000 m², monthly energy cost 15.000.
- The page promises "economiile potențiale exacte" / "the exact potential savings".

Source: `lib/roi-calculator.ts`, `app/calculator-roi/page.tsx`, `app/ghid-bms/calculator/page.tsx`.

---

## 9. What the SOVITECH App can reuse

The app is planned as a pnpm TypeScript monorepo (`packages/domain`, `packages/view-model`, `apps/api`, `apps/web`, `services/extractor`), with React 19 and Tailwind v4 tokens in `apps/web`. The default is a Vite single-page app with Fastify; Next.js is the alternative "to match the website repo" (`docs/build-readiness.md` section 3). `docs/guardrails.md`, the approved screenshots in `design/reference/` (layout, structure, flows, content) and the brand mapping in `company/brand/app-alignment.md` (visual system, decided 2026-09-24) win over anything below.

| # | What | From | How to reuse it in the app | Where it would go |
|---|------|------|----------------------------|-------------------|
| 1 | Tailwind v4 CSS-first token structure: `:root` tokens → semantic tokens → `@theme inline` | `app/globals.css` lines 1-90 | Copy the **structure**, not the values. Put the app's dark tokens from `company/brand/app-alignment.md`, "App theme" (`bg #07201C`, `surface #0D2E2B`, `accent #C8E6C9`, and the rest; owner decision 2026-09-24) on `:root`, and expose **every** named colour in `@theme` so the code writes `bg-surface`, not `bg-[#0D2E2B]`. The website shows the cost of skipping this: about 750 hard-coded hex classes. | `apps/web` stylesheet, or a shared tokens package |
| 2 | Version pairing: React 19.2, Tailwind 4.x with `@tailwindcss/postcss`, `tw-animate-css`, TypeScript 5 strict, `moduleResolution: bundler` | `package.json`, `tsconfig.json` | A known-working set to start from. Check current releases and advisories at build time; these versions are from August 2026. | root and `apps/web` |
| 3 | `cn()` helper (`clsx` + `tailwind-merge`) | `lib/utils.ts` | Copy as is (6 lines). | `apps/web` or a UI package |
| 4 | shadcn configuration | `components.json` | Same `new-york` style, `lucide` icons and `cssVariables: true`. Set `rsc: false` for a Vite SPA, and point the aliases at the monorepo package. Generate primitives fresh with the shadcn CLI instead of copying the website's `components/ui/`, and apply the brand radius (1px, 2px, 9999px) through tokens. The app uses this radius since 2026-09-24 (`company/brand/app-alignment.md`), but the website's primitives also keep shadcn shadows the app does not use. | `apps/web/components.json` |
| 5 | Reduced-motion block | `app/globals.css` (the `prefers-reduced-motion` media query) | Copy as is. | `apps/web` stylesheet |
| 6 | Print-scoped export CSS: `body:has(#id) *` hidden, the report visible, `print-color-adjust: exact`, `.print-hide` | `app/globals.css` (ROI print block) | A starting point for the proposal print route that `docs/build-readiness.md` plans for Playwright `page.pdf()`. Every price in that print must still come from the price component (rule 10). | `apps/web` print route |
| 7 | `Intl.NumberFormat("ro-RO")` | `app/calculator-roi/page.tsx` | Confirms the site formats numbers in Romanian style ("." thousands, "," decimals), which matches rule 8. Reuse only the locale choice. The site rounds with `Math.round` and prints single values; the app rounds at display, rounds ranges outward and keeps decimals in `decimal.js` (rule 9). | the formatting module |
| 8 | Showing a missing value as "Not specified" instead of a blank or zero | `components/product-detail.tsx` (`NOT_SPECIFIED`) | Reuse the **behaviour**, not the mechanism. The website stores the magic string `"NU ESTE SPECIFICAT"` inside the value. The app keeps Unknown as a field state and renders it through the one value component (rule 1, `CLAUDE.md` "UI"). | Value component |
| 9 | Bilingual data shape: paired fields per record (`name` / `nameEn`, `specs` / `specsEn`) and an overlay with fallback (`localizeSector`) | `lib/product-data.ts`, `lib/sector-data.ts` | Useful for UI labels. Do **not** let an engineering value fall back silently to the other language's text, and prefer keyed message catalogues over inline `t(ro, en)` pairs so the planned reserved-term check can scan one place (`docs/build-readiness.md` section 3, harness). Persist the choice and set `<html lang>`, which the website does not. | `packages/view-model`, `apps/web` i18n |
| 10 | RO/EN segmented toggle markup | `components/header.tsx` (`langToggle`) | Small, accessible pattern; restyle with app tokens. | `apps/web` header |
| 11 | Wizard mechanics: step index in state, per-step component, progress indicator with done/current/upcoming states, Back/Continue bar hidden on the results step | `app/calculator-roi/page.tsx`, `app/cerere-oferta/page.tsx` | Structural reference only; the app's 8-step wizard has its own approved design. Do **not** copy `canProceed()` gating (see section 10). | `apps/web` wizard shell |
| 12 | Option lists from the offer wizard: project types ("Construcție nouă", "Retrofit / modernizare", "Upgrade sistem existent", "Extindere"), systems of interest, services, timeline bands | `app/cerere-oferta/page.tsx` | Wording reference for the app's intake options, in SOVITECH's own Romanian. Any option list that drives outputs belongs in the field registry and needs the guardrail review; budget bands are pricing and fall under rule 10. | field registry, after review |
| 13 | SEO product-page approach (code-first titles, JSON-LD) | `app/produse/[id]/page.tsx` | Not needed: the app is private. Listed so nobody copies it by mistake. | none |
| 14 | Logo SVGs | `public/logo.svg`, `public/logo-white.svg` | Recorded by the brand import in `company/brand/logo/`. | `apps/web` assets |

---

## 10. What should not be reused

| What | Where | Why not |
|------|-------|---------|
| Both calculators and their constants (savings ranges, "bonuses", multipliers, 25 EUR/m² and 150 EUR/m², × 3.2 / × 5.8, the zero result) | `lib/roi-calculator.ts`, `app/calculator-roi/page.tsx`, `app/ghid-bms/calculator/page.tsx` | Rule 1: returns 0 when the input is unknown, and treats benchmark numbers as facts. Rule 9: single values, no basis, no method, no range, floating-point arithmetic, "exact" wording. Rule 10: payback and ROI shown as outcomes, a cost per m² presented without a stage label. The two calculators also disagree with each other by a factor of 6 on cost. |
| Every marketing figure: sector metrics, stats, testimonials, case-study results, the references page percentages, article benchmarks | `lib/sector-data.ts`, `components/stats-section.tsx`, `components/aethel-testimonials.tsx`, `app/resurse/**`, `app/ghid-bms/case-studies/page.tsx` | Not verified engineering data and not an approved reference dataset. Using any of them as a value, default, benchmark or example needs SOVITECH to deliver it as a versioned reference dataset, and the approver's approval, because adding a reference dataset is a loosening (`docs/guardrails.md` rule 1, section 2.1, section 10). |
| The product catalogue as runtime data | `lib/product-data.ts` | Rule 1 says SAUTER model numbers, names and product lines come only from reference data. This file is a 2026-2027 catalogue extraction with free-text specs, 99 `"NU ESTE SPECIFICAT"` sentinels and no per-value source locator. It can become the draft of a reference dataset only after SOVITECH engineers review it and the approver approves the dataset. The product import is described in `company/products/`. |
| Default values in inputs | `app/cerere-oferta/page.tsx` (area slider default 5.000 m²), `app/ghid-bms/calculator/page.tsx` (5.000 m², 15.000 per month), `lib/roi-calculator.ts` (occupancy 70%, equipment age "5-years", repairs "moderate") | A pre-filled engineering value is a guess. Rule 1: an unknown field stays Unknown. |
| Required-step gating | `canProceed()` in `app/cerere-oferta/page.tsx` and `app/calculator-roi/page.tsx` | Rule 7: only project name, project type, city and country may block. Everything else offers "Skip for now". |
| Forms that send nothing and still show success | `/cerere-oferta`, `/ghid-bms/descarca` with its thank-you page `/ghid-bms/multumim` | Rule 12: say what could not be done. The app must only say "sent" or "uploaded" after it happened. |
| A form that sends nothing and just reloads | `/contact` (no `action`, no submit handler, no `name` attributes) | Same rule: a submit that does nothing must say so, not fail silently. |
| Copy that promises results or guarantees | `/servicii` ("Rezultate garantate", "Blocheaza costurile de management BMS pentru 10 ani"), testimonials such as "ROI-ul a fost atins in mai putin de 2 ani" | Rule 10: savings, payback and ROI are always Estimated, "could save", never "will save". The planned reserved-term check would flag this wording. |
| Fire-system copy | `/cerere-oferta` option "Integrare sisteme de incendiu"; `/servicii` integration text ("Il conectam cu toate sistemele cladirii — ... detectie incendiu ... control centralizat"); `/servicii/proiectare` hero text ("Proiectare completă de sisteme Building Management System pentru automatizarea funcțiilor critice ale clădirii: HVAC, securitate, control acces, iluminat și detecție incendiu.") | Rule 11: life-safety systems are read-only to the BMS (monitor, display, log, alarm). The website's wording implies control. |
| Compliance claims | `/sectoare/medical` headline "Control de precizie. Conform prin design." / "Compliant by design."; `/sectoare/educational` metric "EPBD" labelled "Conformitate și raportare"; `/sectoare/civil` reporting "pentru conformitate LEED, BREEAM și EPBD" (all in `lib/sector-data.ts`) | Rule 11: the app never attests compliance. |
| Website visual tokens (cream `#F5F4F0` page, dark green `#0D2E2B`, mint accent, 1-2 px radii, light display type) | `app/globals.css`, `DESIGN-SYSTEM.md` | The app has its own approved dark design (`design/onboarding-spec.md`, `design/reference/`), which wins. The two share only the Inter typeface and the SOVITECH name. |
| `next/font` setup as written | `app/layout.tsx`, `app/globals.css` | The CSS names "Inter" literally and never uses `--font-inter` (section 3.4). If the app uses `next/font` or `@fontsource`, wire the variable into `--font-sans`. |
| `styles/globals.css`, `components/theme-provider.tsx`, `hooks/*`, the unused dependencies in section 2.3 | | Dead template code. |
| `images.unoptimized: true` with multi-megabyte images | `next.config.mjs`, `public/products/` | Fine for a prototype, slow for users. |
| External blob-store asset | `hebbkx1anhila5yf.public.blob.vercel-storage.com` | A third-party v0 URL the company does not control. |

---

## 11. Open points

- **Later work exists on an unmerged branch, for reference only.** Owner decision, 2026-09-24: `redesign-2026` is not SOVITECH's current position and will not be merged. It rewrites `lib/roi-calculator.ts` to use ranges, adds a route registry (`lib/site-routes.ts`), grows `next.config.mjs` and adds `docs/roi-methodology-research.md`. The other sections describe `main` only. Section 12 describes the branch separately; see also `history.md` section 4.
- **Which domain is live** (`sovitech-website-gaidenic.vercel.app` or `sovitech.ro`) is not stated in the repo.
- **Whether the Inter font actually renders** (section 3.4) needs a check in a browser on a machine without Inter installed.
- **Next.js or Vite for the app** is an open decision in `docs/build-readiness.md`. The website gives no strong reason either way: it has no API, no auth and no data layer, so the only shared parts would be tokens, `cn()`, the shadcn config and some layout markup, and all of these work in both.

---

## 12. Unmerged branch `redesign-2026`: technical changes

> **Not `main`. Reference only. Not SOVITECH's current position.** This section comes from the branch `origin/redesign-2026` at commit `af81353` (2026-08-27), read as text. The branch has not been merged, and it will not be merged (owner decision, 2026-09-24). `main` is the current website. Paths are relative to the website repository root on that branch. The files it adds or changes are copied verbatim in `company/website/source-redesign-2026/`, with `package.json`. The route changes are in `sitemap.md` section 10, and the commits in `history.md` section 4. Section 12.5 goes through the dependencies and configuration file by file.

### 12.1 What stays the same

`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `components.json`, `postcss.config.mjs`, `.gitignore`, `app/layout.tsx`, `app/robots.ts`, `styles/globals.css`, `lib/language-context.tsx`, `lib/utils.ts`, `DESIGN-SYSTEM.md` and everything in `components/ui/` are identical to `main` (checked with `cmp` and `git diff`). So sections 1, 2, 4 and 5 still hold on the branch: same versions, same shadcn setup, same inline `t(ro, en)` pattern, same root metadata. The only configuration file that changes is `next.config.mjs` (section 12.5).

### 12.2 What changes

| Area | Change on the branch | Source |
|------|----------------------|--------|
| Redirects | `next.config.mjs` adds `redirects()` with 15 permanent redirects from the old URLs (`sitemap.md` section 10.2). A comment says the list is kept literal on purpose, not derived from the route registry. `images.unoptimized: true` stays. | `next.config.mjs` |
| Route registry | `lib/site-routes.ts` (449 lines) lists every URL with a status (`published`, `planned`, `alias`), a category (C1-C6), target personas (P1-P8) and a pillar. `generateStaticParams()` in the dynamic routes, `app/sitemap.ts` and the hub pages all read it. | `lib/site-routes.ts`, `app/sitemap.ts` |
| Links to unbuilt pages | `components/site-link.tsx` renders a real link for published and alias entries and plain text for planned ones. It reads `process.env.NODE_ENV` to warn about unknown slugs in development, the only environment variable in the branch code. **No page or component uses it.** The articles use ordinary links instead, pointing to an interim target while the real one is planned, and record each such link in a `// LINKS-TO-REACTIVATE:` comment (`sitemap.md` section 10.9). The hub pages list planned entries as unlinked text (`components/section-hub.tsx`). | `components/site-link.tsx`, `components/section-hub.tsx`, `components/articles/*.tsx` |
| Articles | 10 article bodies in `components/articles/*.tsx`, indexed by `components/articles/index.ts`, rendered by `components/article-layout.tsx` and `components/article-prose.tsx`. `components/article-jsonld.tsx` emits JSON-LD `Article`, `BreadcrumbList` and `FAQPage`. Covers and card data in `lib/article-covers.ts` and `lib/article-cards.ts`. | files named |
| Hubs and roles | `components/section-hub.tsx` (lists live entries as links and planned ones as unlinked text), `components/category-archive.tsx`, `components/entry-shell.tsx`, `components/role-page.tsx` with `lib/role-copy.ts`, `components/service-hero.tsx` | files named |
| Styling | `app/globals.css` grows by 211 lines: Tailwind v4 `@utility` spacing roles (`section-xs` to `section-xl`, `heading-gap-tight` / `heading-gap` / `heading-gap-loose`, `card-p-sm` / `card-p` / `card-p-lg`) and an `.article-prose` block (headings, lists, tables, diagrams, notes, FAQ box). The brand tokens are still not exposed as Tailwind colours. | `app/globals.css` |
| Focus and scroll | `hooks/use-scroll-to-section.ts` scrolls a changed step into view below the sticky header and moves focus to it. Used by `/calculator-roi`, `/cerere-oferta`, `/servicii` and `/ghid-bms/quiz`. | `hooks/use-scroll-to-section.ts` |
| Server pages | New pages under `/ghid`, `/resurse/[slug]`, `/instrumente`, `/pentru`, `/expertiza/[sector]`, the legal pages and `/calculator-roi/metodologie` are server components with their own metadata. Each service page gets a `layout.tsx` that sets its title. | `app/` on the branch |

### 12.3 The rewritten ROI calculator

`lib/roi-calculator.ts` on the branch (283 lines) changes the method described in section 8.1. These are marketing constants on an unmerged branch. They are recorded to show the method, not to be used.

- **Savings are a band with a declared domain.** A new `savingsDomain` input (`whole_building`, `hvac`, `fdd`) selects a band with `min`, `typical`, `max`, a label that says what the percentage is a share of (for example "din consumul total al clădirii") and a source string (for example "Crowe et al. 2020; Kramer et al. 2019 (LBNL)"). The default is `whole_building`. A code comment says: "A percentage without its domain means nothing".
- **Building signals move the point estimate inside the band only.** It starts at `typical`, adds small bonuses and is capped at `max`.
- **Implementation cost is a band per building type** (`COST_PER_SQM_BANDS`, EUR/m²), with `min`, `typical` and `max`. The comments cite "doc 12 §3.1" and the branch's price article. `healthcare` and `dataCenter` borrow an aggregated band because, the comment says, they have no published band of their own.
- **The goal multipliers are gone** ("stating a priority cannot change how much energy a building physically saves").
- **Results carry Low and High fields** for savings, cost and payback. Best-case payback pairs low cost with high savings, and worst case the reverse.
- **Still there from `main`:** all zeros when no industry is chosen; payback 0 when savings are 0 or less; a single point estimate beside the band; maintenance multipliers unchanged; plain floating-point arithmetic; a user budget that replaces the point cost.
- **Still inconsistent elsewhere:** the results page still shows year 3 and year 5 as annual savings × 3.2 and × 5.8 (`app/calculator-roi/page.tsx` lines 596-597), and `/ghid-bms/calculator` still uses 150 EUR/m², against the branch's own bands of 3 to 18 EUR/m².
- **Method page.** `/calculator-roi/metodologie` (`components/roi-methodology.tsx`, 681 lines) explains the method publicly and cites EN ISO 52120-1. Its research base is `docs/roi-methodology-research.md`, which flags each figure MEASURED, MODELLED or VENDOR CLAIM, audits the old coefficients and lists research gaps.

### 12.4 What this means for the SOVITECH App

Everything in sections 9 and 10 still applies. The branch adds two ideas worth knowing, and adds no new permission to use its figures.

| Idea | Where on the branch | How it relates to the app |
|------|---------------------|---------------------------|
| A percentage always states what it is a share of | `SavingsDomain`, `SAVINGS_BANDS` labels in `lib/roi-calculator.ts` | Same direction as rule 8 ("every value states what it measures") and rule 9 (basis, method, range). The app gets this from its unit registry and value component, not from this file. |
| Planned targets shown as text, not as dead links | `components/section-hub.tsx` (in use); `components/site-link.tsx` (written for the same purpose, not used by any page) | Close to rule 12: say what is not available instead of failing silently. A UI pattern only. |
| The cost and savings bands and their sources | `lib/roi-calculator.ts`, `docs/roi-methodology-research.md` | **Not usable as app values.** They are the website's marketing method, on an unmerged branch. Using any of them as a benchmark needs SOVITECH to deliver a versioned reference dataset and the approver's approval (rule 1, section 2.1, section 10). Even then, results built on them are Estimated, with a range, and prices name their stage (rules 9 and 10). |

The branch also keeps things the app must not copy: the forms that send nothing (`sitemap.md` section 10.6), the zero result when an input is missing (rule 1) and `canProceed()` gating (rule 7).

### 12.5 Dependencies and configuration, file by file

Checked with `git diff main origin/redesign-2026 -- <file>` and with `cmp` against the `main` clone. Nothing was installed or built.

| File or area | On the branch | Detail |
|--------------|---------------|--------|
| `package.json` | unchanged | Same name (`my-v0-project`), scripts, dependencies and versions as in section 2. Byte-identical copies are in `company/website/source/` and `company/website/source-redesign-2026/`. |
| `pnpm-lock.yaml` | unchanged | Same resolved versions |
| `pnpm-workspace.yaml` | unchanged | `allowBuilds: { sharp: false }` |
| `tsconfig.json` | unchanged | As in section 6 |
| `components.json` | unchanged | The shadcn "new-york" setup (section 4) |
| `postcss.config.mjs` | unchanged | `@tailwindcss/postcss` only |
| `.gitignore` | unchanged | As in section 6 |
| `next.config.mjs` | **changed**: +40 lines, 48 in all | Adds a `legacyRedirects` list of 15 entries and an `async redirects()` that returns each one with `permanent: true` (`sitemap.md` section 10.2). A comment says the list is kept literal, not derived from `lib/site-routes.ts`, because `next.config` runs before the TypeScript pipeline. `images: { unoptimized: true }` stays. No other option is added: no `i18n`, `headers()`, `output`, `typescript` or `eslint` settings. |
| `app/layout.tsx` | unchanged | Root metadata, `generator: "v0.app"`, the `*.vercel.app` `metadataBase`, Vercel Analytics, the language provider |
| `app/robots.ts` | unchanged | |
| `app/sitemap.ts` | changed | Reads the route registry; same base URL (`sitemap.md` section 10.8) |
| `app/globals.css` | changed: +211 lines, 538 in all | Section 12.2 |
| `styles/globals.css` | unchanged | Still unused (section 3.2) |
| `components/ui/` | unchanged | The same 57 files |
| Packages imported by the code | same set as `main` | A static scan of the `import` statements in `app/`, `components/`, `lib/` and `hooks/` finds the same npm packages on both refs. No package starts or stops being used. Pages and custom components import the same 12 shadcn primitives (badge, button, card, checkbox, input, label, navigation-menu, progress, radio-group, select, slider, textarea). The packages in section 2.3 are still unused. |
| Environment variables | one read | `process.env.NODE_ENV` in `components/site-link.tsx`, a component no page uses (section 12.2) |
| Backend | still none | No `app/api/`, no route handlers, no server actions, no middleware. The forms still send nothing (`sitemap.md` section 10.6). |
| `public/` | 55 files added | 10 covers (`coperti/`, JPG), 15 diagrams (`diagrame/`), 6 partner logos (`parteneri/`: SAUTER plus the KNX, BACnet, Modbus, M-Bus and DALI marks; 4 PNG, 2 SVG), 20 reference images (`referinte/`), 4 service images (`servicii/`). About 7.5 MB more by git blob size: 76.5 MB on `main`, 84.0 MB on the branch. With `images.unoptimized`, they are served at full size. Not in `company/website/source-redesign-2026/` (its README, section 3). They are copied byte for byte elsewhere, labelled as branch content: `parteneri/`, `referinte/` and `servicii/` to `company/brand/` (`partner-logos/`, `imagery/reference-projects/`, `imagery/services-redesign-2026/`), and `coperti/` and `diagrame/` to `company/business/articles/covers/` and `diagrams/`. |
| External resources loaded at runtime | same resources, on more pages | The same v0 blob-store "fingerprint" SVG, now on 12 pages (7 on `main`): `/contact`, `/despre-noi`, `/expertiza`, `/ghid-bms`, `/referinte`, `/servicii` and, through `components/service-hero.tsx`, the six service pages. Also the OpenStreetMap iframe on `/contact`, Vercel Analytics (section 6). The new external URLs in the code are citations and links to sources, for example `eur-lex.europa.eu`, `legislatie.just.ro` and `epb.center`. They are not loaded by the pages. |
| Tests, lint | still none | No test files, no ESLint config |
| Build result | not checked | Both commit messages report "Build: 252 pagini statice, fara erori" (252 static pages, no errors). Nothing was built for this note. |

**In short:** the branch changes no dependency, version, TypeScript, PostCSS or shadcn setting. Its only configuration change is the redirect map in `next.config.mjs`. Everything else is new or changed application code, content and images.

Source: the files named; `git diff --name-status main origin/redesign-2026`; `git ls-tree -r -l` over `public/` on both refs; import and `process.env` search over `app/`, `components/`, `lib/`, `hooks/` on the branch.
