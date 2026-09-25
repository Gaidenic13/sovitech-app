# SOVITECH website: commit history

This file lists every commit on the `main` branch of the SOVITECH company website repository (`Gaidenic13/sovitech-website`) up to `e0806142735dbdd53b913af30102f9227b380475`, with its date, message and a summary of what changed. It also records an unmerged branch, `redesign-2026`, with commits dated after `main` (section 4), and where figures on the site changed over time (section 3). Owner decision, 2026-09-24: that branch is not SOVITECH's current position and will not be merged. It is kept for reference only. `main` (`e080614`) is the current website.

Source: `git log --stat` and `git show` on the read-only clone. Times are in the committers' zone, UTC+03:00. Paths are relative to the website repository root.

---

## 1. Overview

| # | Date | Commit | Author | Message | Files | Lines + / − |
|---|------|--------|--------|---------|-------|-------------|
| 1 | 2026-07-07 09:42 | `c9743c3` | Cristian Gaidenic | Initial commit: import v0 project | 177 | +20,410 / −0 |
| 2 | 2026-07-07 10:07 | `1a30398` | Cristian Gaidenic | Ignore local .claude config | 1 | +3 / −0 |
| 3 | 2026-07-07 10:09 | `472be82` | Cristian Gaidenic | Commit generated tooling updates from pnpm 11 and Next 16 | 3 | +1,072 / −787 |
| 4 | 2026-07-07 15:16 | `0469235` | Gaidenic13 | Fix ROI calculator type errors and enable build-time type checking | 3 | +15 / −17 |
| 5 | 2026-07-08 12:05 | `59c9e34` | Gaidenic13 | Apply Aethel Forge design system in Sovitech branding across the site | 70 | +1,494 / −730 |
| 6 | 2026-07-10 16:47 | `3d4b3b6` | Gaidenic13 | Nav reliability, bilingual sectors, resources redesign, contact map | 16 | +1,004 / −737 |
| 7 | 2026-08-10 18:04 | `02c0fde` | Gaidenic13 | Full SAUTER catalogue with SEO product pages, bilingual data, real images | 237 | +6,295 / −1,029 |
| 8 | 2026-08-10 23:19 | `a71ec04` | Gaidenic13 | Full bilingual coverage, responsive/adaptive pass, mobile language toggle | 34 | +2,329 / −1,285 |
| 9 | 2026-08-11 00:01 | `e080614` | Gaidenic13 | Mobile-first product detail layout | 1 | +20 / −17 |

- `main` has these 9 commits, and it is the current website. The remote also has an unmerged branch, `origin/redesign-2026`, with 2 later commits (section 4). It will not be merged (owner decision, 2026-09-24). There are no tags.
- Every commit message on `main` ends with a `Co-Authored-By: Claude Fable 5` trailer, so every commit, including the initial v0 import, was made in a Claude Code session.
- "Gaidenic13" is a GitHub account; commits 1 to 3 were made from a local machine under the name Cristian Gaidenic.

---

## 2. Commits in detail

### 2.1 `c9743c3` Initial commit: import v0 project (2026-07-07)

**What it was.** The site as generated in v0 (Vercel's AI site builder), committed as is.

**What it contained.**
- 27 page files: home, `/servicii` and its four sub-pages, `/produse` (a single page, no detail pages), `/sectoare` and `/sectoare/[sector]` (one 302-line page), `/resurse` with two articles, two case studies, `/resurse/referinte` and the 3-line `/resurse/raport-piata` stub, the 8-page `/ghid-bms` funnel, `/calculator-roi`, `/contact` and `/pricing`.
- Components: header, footer, blog slider, case-study slider, stats section, theme provider, and 57 shadcn/ui primitives.
- `lib/`: `language-context.tsx`, `roi-calculator.ts`, `sector-data.ts`, `utils.ts`.
- `app/globals.css` with the SOVITECH tokens, plus the unused v0 `styles/globals.css`.
- 71 files in `public/`, mostly stock images and placeholders.
- `next.config.mjs` with `typescript.ignoreBuildErrors: true`.
- `package.json` already pinned `next` 16.0.10 and `react` 19.2.0.

The `/resurse/raport-piata` stub has been empty since this first commit.

### 2.2 `1a30398` Ignore local .claude config (2026-07-07)

Added `.claude/` to `.gitignore`, so local Claude Code settings are not committed.

### 2.3 `472be82` Commit generated tooling updates from pnpm 11 and Next 16 (2026-07-07)

- Regenerated `pnpm-lock.yaml`.
- Added `pnpm-workspace.yaml` with `allowBuilds: { sharp: false }`.
- `tsconfig.json`: reformatted, and `.next/dev/types/**/*.ts` added to `include` by Next 16's tooling.

### 2.4 `0469235` Fix ROI calculator type errors and enable build-time type checking (2026-07-07)

- `app/calculator-roi/page.tsx`: the industry field in step 2 is typed `IndustryId | null`, so lookup tables are never indexed with an empty string.
- `next.config.mjs`: removed `ignoreBuildErrors`, so type errors now fail the build.
- `components/header.tsx`: replaced the deprecated `legacyBehavior` `Link` with `NavigationMenuLink asChild`.

### 2.5 `59c9e34` Apply Aethel Forge design system in Sovitech branding across the site (2026-07-08)

The visual redesign. "Aethel Forge" is the name the commit and code comments give to the visual treatment; the repo does not say where the name comes from.

- **New WebGL components:** `components/hero-field.tsx` (fluid hero background) and `components/aethel-testimonials.tsx` (dot-matrix testimonial band), both with context-loss recovery and a restart when the route is re-entered.
- **Site-wide look:** light display typography, the 1px / 2px radius family, cards without shadows (borders and contrast only), and one dark surface colour, `#07201C`.
- **Home:** new hero with a quick-navigation rail, a split CTA and a trust row.
- **Header:** data-driven navigation, a branded burger menu and a mobile drawer, with explicit colours for hover, open and focus states.
- **ROI calculator results:** PDF export by print-scoped CSS, sharing by WhatsApp, email and LinkedIn, and a copy-link action.
- **Logos:** `public/logo.svg` (dark) and `public/logo-white.svg` (white) added, chosen per surface.
- **shadcn primitives:** about 34 files in `components/ui/` edited, mainly to replace `rounded-md` and similar with `rounded-[1px]` or `rounded-[2px]`.
- Restyled 25 page files and `app/globals.css`.

### 2.6 `3d4b3b6` Nav reliability, bilingual sectors, resources redesign, contact map (2026-07-10)

- **Navigation fix:** the dropdown sometimes rendered blank because its enter animation stalled. The animations were removed from `components/ui/navigation-menu.tsx`; the menu now shows and hides instantly.
- **Sectors:** the sector page was split into a thin server `page.tsx` and a client `sector-client.tsx`. `lib/sector-data.ts` gained Romanian content and `localizeSector()`. An "Industrial" sector was added by reworking the former `pharma` entry: its id and slug changed from `pharma` to `industrial`. The commit message calls this "dedup ex-pharma entry", since "Medical & Farma" already covered pharma.
- **Localization:** footer, home sections and sector pages made bilingual; a diacritics pass on shared components.
- **Resources:** `/resurse` rebuilt as an editorial layout with placeholder images.
- **Products:** card spec overlay reworked; category chips added to the filter.
- **Contact:** OpenStreetMap embed that opens Google Maps with the building-mark pin on the office; department contacts (Tehnic, Vânzări, Media); hours and address row.
- **Assets:** `public/building.svg` added. The hero quick-navigation rail from the previous commit was removed.

### 2.7 `02c0fde` Full SAUTER catalogue with SEO product pages, bilingual data, real images (2026-08-10)

The largest content change.

- **Catalogue:** 12 coarse product groups inside `app/produse/page.tsx` (for example "Controllere DDC & PLC", "Presostați", "Senzori CO2", "Centrale Tratare Aer (AHU)", "Software BMS CASE Suite") were replaced by 178 SKU-level cards in a new `lib/product-data.ts` (4,145 lines). The file says it was "Generated from the SAUTER 2026-2027 catalogue extraction". All cards are bilingual.
- **Product pages:** new `app/produse/[id]/page.tsx` with static generation, code-first titles, article-code keywords, JSON-LD `Product` data and canonical URLs; new `app/produse/layout.tsx` with catalogue metadata; new `components/product-detail.tsx`.
- **Images:** 212 product images added under `public/products/`. The commit message says they were "sourced from official SAUTER media libraries".
- **SEO:** new `app/sitemap.ts` (all fixed routes plus the product URLs), `app/robots.ts`, and `metadataBase` in `app/layout.tsx`.
- **Home:** services showcase moved above the references; the WebGL field now runs through both dark sections; new `components/services-showcase.tsx`, `components/references-marquee.tsx`, `components/partners-marquee.tsx`, `components/latest-articles.tsx`.
- **References:** `/resurse/referinte` and the home marquee now list the client portfolio; the commit says it is the list on sovitech.ro.
- **Stats:** the commit says the stats are now "grounded in real portfolio data". See section 3 for the before and after.
- **Pricing:** numeric prices removed. Before this commit, `/servicii` showed "De la 15.000 € / proiect" (Standard) and "De la 25.000 € / proiect + mentenanta anuala" (Full Service), under the heading "Preturi transparente", and `/pricing` said "Prețuri transparente, fără costuri ascunse." After it, both pages send visitors to a quote request.
- **Offer request:** new 6-step wizard at `app/cerere-oferta/page.tsx`.
- **Case studies:** both case-study pages largely rewritten (249 lines changed on Radisson Blu, 145 on Therme).
- **Design reference:** `DESIGN-SYSTEM.md` added.

### 2.8 `a71ec04` Full bilingual coverage, responsive/adaptive pass, mobile language toggle (2026-08-10)

- **Product data:** English spec values (`specsEn`) for 139 products, so English mode no longer shows Romanian technical text under English labels (+146 lines in `lib/product-data.ts`).
- **Translation:** the four service sub-pages, the 8 `/ghid-bms` pages and both articles translated with the `t()` pattern.
- **Header:** the RO/EN toggle is visible at every width, including mobile; the CTA hides below the `sm` breakpoint but stays in the drawer; a duplicate toggle in the drawer was removed.
- **Product cards:** the hover spec overlay only applies to fine pointers; touch devices use the detail page.
- **Layout:** new `.container-site` utility in `app/globals.css`; 61 container instances in 21 files normalized to it; 29 fixed display headings given responsive sizes.

### 2.9 `e080614` Mobile-first product detail layout (2026-08-11)

Only `components/product-detail.tsx`:
- the spec table stacks label over value on phones, and becomes two columns from `sm`;
- smaller image panel padding and image height on small screens;
- the H1 starts at `text-3xl`, with `break-words` and `text-balance` for long names;
- related products shown two per row from 420px; the CTA is full width on mobile;
- tighter vertical spacing (`py-10`) below `sm`.

---

## 3. Figures that changed between versions

These are marketing figures. They are recorded only to show that they changed; none of them is verified data or approved reference data, and the SOVITECH App may not use them as values (`docs/guardrails.md` rule 1, section 2.1 and section 10).

**Home stats band** (`components/stats-section.tsx`), before and after commit `02c0fde`:

| Stat (EN label) | Before `02c0fde` | After `02c0fde` (current) |
|-----------------|------------------|---------------------------|
| average savings in the first year after BMS implementation | 42.827 € | removed |
| sqm automated area | 500.000+ ("total automated area in Romania") | 250.000+ ("across our project portfolio") |
| average energy consumption reduction | 38% | 38% |
| successfully completed projects | 100+ | 30+ |
| years average payback period | 2.1 | 6.1 |
| years of experience in automation | 15+ | 15+ |

**Service package prices**, removed in `02c0fde`: "De la 15.000 € / proiect" (Standard) and "De la 25.000 € / proiect + mentenanta anuala" (Full Service). Source: `git show 02c0fde -- app/servicii/page.tsx`.

**What this means.** The completed-project count fell from 100+ to 30+ and the average payback rose from 2.1 to 6.1 years in one commit, while other pages kept older claims. For example, `lib/roi-calculator.ts` still gives payback texts such as "Amortizare: 10–15 luni" for hospitality, and `app/resurse/articole/eficienta-bms/page.tsx` still cites "150+" projects. The site's figures are not internally consistent, and older versions of them exist in the git history. `sitemap.md` section 9 lists more contradictions.

---

## 4. Unmerged branch `redesign-2026`

> **Not `main`. Reference only. Not SOVITECH's current position.** The remote has a branch `origin/redesign-2026` that branches off `main` at `e080614` and has not been merged. Its two commits are dated after everything on `main`, and `main` has no commits the branch lacks. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. Its material is kept for reference only. `main` is the current website. Everything in this section comes from `git log`, `git show --stat`, `git show --numstat` and `git diff main origin/redesign-2026` on the read-only clone. Nothing was built or run.

Where the branch is recorded, kept apart from `main`:
- `company/website/source-redesign-2026/`: a verbatim copy of the 95 source files the branch adds, changes or renames, plus `package.json`, at `af81353`, with a README that lists them;
- `sitemap.md` section 10: every route on the branch, the redirects from old URLs and the header and footer, read from the code;
- `tech-stack.md` section 12: dependencies, configuration, the other technical changes and the rewritten ROI calculator, read from the code.

`company/website/source/` and the other sections of `sitemap.md` and `tech-stack.md` describe `main` only.

| Date | Commit | Author | Message | Files | Lines + / − |
|------|--------|--------|---------|-------|-------------|
| 2026-08-24 16:45 | `d2d15d2` | Gaidenic13 | Redesign complet: continut editorial, rute noi, identitate vizuala | 158 | +18,019 / −3,352 |
| 2026-08-27 11:56 | `af81353` | Gaidenic13 | Materiale vizuale noi: 10 coperti si 15 diagrame | 39 | +71 / −57 |

Both messages are in Romanian without diacritics and end with a `Co-Authored-By: Claude Opus 5` trailer, so both commits were made in a Claude Code session. Both report "Build: 252 pagini statice, fara erori" (252 static pages, no errors). A count from the files and the route registry gives 248 pages (`sitemap.md` section 10.1); the gap was not investigated.

Taken together, the branch changes 158 files against `main`: 111 added, 38 modified, 3 renamed and 6 deleted (`git diff --name-status -M main origin/redesign-2026`). The added files include the 10 covers as JPG; the PNG versions from the first commit are gone.

### 4.1 `d2d15d2` "Redesign complet" (complete redesign), 2026-08-24

**What the commit message says**, in English. The message has four headings.
- **Content ("Continut").** Ten editorial articles in `components/articles/`, with JSON-LD (`Article`, `BreadcrumbList`, `FAQPage`) and their own covers. A route registry in `lib/site-routes.ts` as the single source for navigation, the sitemap and the archive pages. New pages: `despre-noi`, `ghid`, `instrumente`, `pentru`, `referinte`, `termeni`, `confidentialitate`, `cookies` and the ROI method page. Services on SEO slugs, with a sticky sidebar and a layout per service.
- **Data and compliance ("Date si conformare").** "`lib/roi-calculator.ts` rescris pe intervale, cu domeniu declarat" (rewritten to use ranges, with a declared domain). "Eliminate cifrele nesustinute" (unsupported figures removed); the savings bands cite their domain. Case studies and articles without real content are removed from the listings. Protocol logos downloaded from official sources into `public/parteneri/`.
- **Interface ("Interfata").** The WebGL field (`HeroField`) on the dark heroes; an article layout with a sticky rail and a boxed FAQ; simpler card grids; placeholders without images removed; horizontal overflow on mobile service pages fixed.
- **Build.** "252 pagini statice, fara erori".

**Files changed, by area** (`git show --numstat -M d2d15d2`):

| Area | Files | Lines + / − | What changed |
|------|-------|-------------|--------------|
| `app/servicii/` | 18 | +2,961 / −1,634 | 6 service pages and 7 `layout.tsx` files added (one per service page, one for `/servicii`); the 4 old sub-pages deleted; `/servicii` rewritten |
| `app/` other routes | 34 | +2,490 / −859 | New: legal pages, `/despre-noi`, `/calculator-roi/metodologie`, `/ghid`, `/instrumente`, `/pentru`, `/resurse/[slug]`, `/expertiza/[sector]/page.tsx`. Renamed: `/sectoare` to `/expertiza` (2 files), `/resurse/referinte` to `/referinte`. Deleted: `/resurse/raport-piata`, `app/sectoare/[sector]/page.tsx`. Modified: home, `/calculator-roi`, `/cerere-oferta`, `/contact`, `/pricing`, `/produse` (3 files), `/resurse`, both old articles, both case studies, `app/sitemap.ts`. Plus an empty-folder `.keep` file. |
| `app/ghid-bms/` | 8 | +37 / −102 | Small edits to all 8 guide-funnel pages; most of the deletions are in `/ghid-bms/resurse` (+4 / −86) |
| `app/globals.css` | 1 | +211 / −0 | Spacing utilities and the `.article-prose` block (`tech-stack.md` section 12.2) |
| `components/articles/` | 11 | +7,716 / −0 | The 10 article bodies and `index.ts` |
| `components/` other | 21 | +1,808 / −328 | 10 added (`article-jsonld`, `article-layout`, `article-prose`, `category-archive`, `entry-shell`, `roi-methodology`, `role-page`, `section-hub`, `service-hero`, `site-link`); 11 modified, including `header`, `footer` and `stats-section` |
| `lib/` | 6 | +1,787 / −429 | Added `site-routes.ts`, `role-copy.ts`, `article-cards.ts`, `article-covers.ts`; rewrote `roi-calculator.ts`; `sector-data.ts` grows from 6 to 10 sectors |
| `hooks/` | 1 | +100 / −0 | `use-scroll-to-section.ts` |
| `docs/` | 2 | +781 / −0 | `roi-methodology-research.md` (710 lines) and `prompt-content-launch.md` (71 lines, section 4.4) |
| `next.config.mjs` | 1 | +40 / −0 | 15 permanent redirects from the old URLs |
| `public/` | 55 | binary, plus +88 lines of SVG | `coperti/` 10 PNG covers, `diagrame/` 15 diagrams, `parteneri/` 6 logos (SAUTER and 5 protocol marks; 4 PNG, 2 SVG), `referinte/` 20 images, `servicii/` 4 images |
| **Total** | **158** | **+18,019 / −3,352** | 111 added, 38 modified, 3 renamed, 6 deleted |

**What it did, in short.** It turned the site into an editorial site built around a route registry: new URL structure with redirects, ten articles, legal and "about" pages, six service pages, ten sector pages and eight role pages. It rewrote the ROI calculator to give bands with a stated domain, and removed the case-study and testimonial sliders from the home page. `package.json`, `tsconfig.json`, `app/layout.tsx`, `components/ui/` and `DESIGN-SYSTEM.md` are not touched. Details: `sitemap.md` section 10 and `tech-stack.md` section 12.

### 4.2 `af81353` "Materiale vizuale noi" (new visual material), 2026-08-27

**What the commit message says**, in English:
- **Covers ("Coperti").** All 10 article covers replaced, PNG to JPG, 1920×1080. The cover background colours (`coverBgs`) are taken from the artwork, so that the 10% inset frame on the cards does not stand out from the cover. `public/coperti` shrinks from 1.4M to 1.0M.
- **Diagrams ("Diagrame").** All 15 article diagrams replaced (1200×1200). The legend of diagram A04-1 (cost structure) is no longer cut off.
- **Code ("Cod").** `ArticleCard.image` becomes optional, so the listings no longer depend on a cover and articles stay listed when the artwork is missing. Cover frames render only when there is an image, instead of an empty coloured box.
- **Build.** "252 pagini statice, fara erori".

**Files changed, by area** (`git show --numstat af81353`):

| Area | Files | Lines + / − | What changed |
|------|-------|-------------|--------------|
| `app/resurse/page.tsx` | 1 | +22 / −18 | Cover frame only when an image exists |
| `components/latest-articles.tsx` | 1 | +14 / −12 | Same, on the home page listing |
| `lib/article-cards.ts`, `lib/article-covers.ts` | 2 | +35 / −27 | `image` becomes optional; cover paths change from `.png` to `.jpg`; the `coverBgs` colours are re-sampled from the new artwork |
| `public/coperti/` | 20 | binary | 10 PNG covers deleted, 10 JPG covers added |
| `public/diagrame/` | 15 | binary | All 15 diagrams replaced in place |
| **Total** | **39** | **+71 / −57** | 10 added, 19 modified, 10 deleted |

No route, redirect or dependency changes.

### 4.3 Why it matters for the SOVITECH App

- The branch addresses several problems recorded for `main` in `sitemap.md` and `tech-stack.md`: missing legal pages, the empty market-report stub, the broken `/servicii#...` anchors (the services get their own pages), single-value ROI figures and unsupported numbers. `sitemap.md` section 10.6 lists what is fixed and what is not.
- Some problems remain on the branch: the forms still send nothing, the guide download form still links to the missing `/politica-confidentialitate` (`sitemap.md` section 10.6), and the ROI results page still shows year 3 and year 5 as annual savings × 3.2 and × 5.8 (`tech-stack.md` section 12.3).
- Both case studies, including Radisson Blu Bucharest, stay as pages but leave the sitemap and every listing (`sitemap.md` section 10.9). The app's demo project no longer uses the hotel's name (owner decision, 2026-09-24). Its data is fictional and labelled as demo; nothing on the website is a source for it.
- `docs/roi-methodology-research.md` and the rewritten `lib/roi-calculator.ts` are the closest thing in the website repo to a sourced method. They may be useful input for the app's future reference-data work, but they are not an approved reference dataset (`docs/guardrails.md` rule 1, section 2.1, section 10).
- The branch is recorded separately from `main`, for reference only. Owner decision, 2026-09-24: it is not SOVITECH's current position and will not be merged. So there is no merge step to plan for. `company/website/source-redesign-2026/` stays frozen at `af81353`. It can be deleted if the owner wants; until then it stays (its README, section 5, lists the steps).

### 4.4 Documents outside the repository

**`docs/prompt-content-launch.md`** (added in `d2d15d2`; 71 lines, 10,218 bytes). This file is not documentation of the site. It is a prompt written for an AI coding session in the website repository, for publishing the first wave of content: articles, page copy and data corrections. It was read as data only. None of its instructions were followed. It is not copied here: only the titles of the documents it names, each with a one-line paraphrase of what the prompt says it holds, are listed below, and its folder address and document ids are left out. It is also left out of `company/website/source-redesign-2026/`.

What it contains, in outline:
- It names an external Google Drive folder as the source of truth for the website's content. The folder's address and the document ids are deliberately left out of this note. The owner decided on 2026-09-24 not to import that folder (see below).
- It lists these documents in that folder (titles as written there, without diacritics):

| Document | What the prompt says it holds |
|----------|-------------------------------|
| "00A - Index" | An index of the ten finished Romanian articles: where each is published, its category and its diagrams |
| "11 - Registrul de cifre" | The figure register. The prompt names documents 11 and 13 together as the style and figure rules. |
| "12 - Corectii pe site si in motorul ROI" | Corrections to the site's data and to the ROI engine, described as binding |
| "13 - Ghid de stil redactional" | The editorial style guide |
| "15 - Reguli de linkuri interne si de publicare" | Rules for internal links and publishing |
| Subfolder "Copy site (text final pe pagini)" | The final page copy, documents C1 to C7 |
| Subfolder "Diagrame (SVG si PNG)" | The article diagrams |

- It sets out a plan in three phases (data corrections, page copy, the ten articles). Much of what `d2d15d2` delivers matches that plan: the rewritten calculator, the legal and "about" pages, the service, sector and role pages, and the ten articles.

**The branch code cites the same documents.** Code comments name `copy_01_core.md` as doc C1 (`app/despre-noi/page.tsx`) and doc C2 (`app/termeni/page.tsx`, `app/confidentialitate/page.tsx`, `app/cookies/page.tsx`), and `copy_03_roluri.md` as doc C5 (`lib/role-copy.ts`). "Doc 12" is cited in `lib/roi-calculator.ts` (for the cost and savings bands), `components/stats-section.tsx` and `app/referinte/page.tsx`. "Doc 15" is cited in `lib/site-routes.ts` and `components/category-archive.tsx`. "Copy doc C1" and "copy doc C2" appear in `app/contact/page.tsx` and `components/footer.tsx`. The article `components/articles/sisteme-bms-cladiri.tsx` refers to "registrul de cifre", and `lib/site-routes.ts` marks the ten articles `draft: "drive"`.

**None of these documents is in the repository, and none was read for this import.** They appear to be where the branch's copy, figures and cost and savings bands come from. Documents 11 and 12 are described as the figure register and the binding data corrections, so they are the most direct record of which figures SOVITECH meant to publish. **Owner decision, 2026-09-24: the Drive folder is not imported.** Asked whether to import it, the owner answered "no". The documents stay outside this project, and the folder was not opened. They also serve a branch that will not be merged. If the owner changes this later, they would be imported as company documents with their source and date. Their figures would still not be app values until SOVITECH delivers a versioned reference dataset and the approver approves it (`docs/guardrails.md` rule 1, section 2.1, section 10).
