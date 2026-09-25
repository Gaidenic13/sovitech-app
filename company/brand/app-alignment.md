# Website brand and app mockups: alignment

## Decision (2026-09-24)

**Asked:** "follow the company brand, keep the mockup theme, or treat the app as a sub-brand?"

**The product owner's answer, in their own words:** "treat the app as our brand tool".

**Interpretation recorded.**
- The app is a SOVITECH brand tool. It is not a separate sub-brand.
- It carries the company brand:
  - the real SOVITECH logo ([`logo/`](logo/), the white version on dark);
  - the company name;
  - the brand palette;
  - Inter;
  - the brand's radius, depth and motion rules;
  - the brand voice.
- The app is a dark, desktop-first UI, so it uses the brand's dark variant: deep surface `#07201C`, dark `#0D2E2B`, green `#1F6B4A`, and mint `#C8E6C9` as the single accent on dark.
- The approved mockups in `design/reference/` stay the brief for layout, structure, flows and content.
- The brand replaces three things in the mockups: their teal-navy and aqua theme, the Eurostile-like "SOVITECH" wordmark, and the mockup taglines.
- If the owner meant something else, this is easy to revise. No code exists yet.

**What it settles in this file.** Each option under "Options" and each item under "Decisions needed" now carries a "Decided:" or "Still open:" line. The older text is kept as history. The proposed tokens are in [App theme: the brand's dark variant (proposed tokens)](#app-theme-the-brands-dark-variant-proposed-tokens), at the end of this file. Where the brand does not define a role, that section proposes a value for the owner's OK.

**What it does not settle.**
- It approves no change to `docs/guardrails.md`, which still wins over the brand.
- The product name, the tagline choice, the favicon and the app's languages stay open.

**Related decisions made the same day.**
- **Demo name.** Asked "should the demo keep the real hotel's name?", the owner answered "no".
  - The demo project gets a fictional name. The working name is "Demo Hotel Bucharest", and the owner may rename it.
  - Mockup transcriptions keep the text as the screens show it ("Radisson Blu Bucharest").
  - Recommended, not decided: the demo fixture should not reuse the real hotel's published facts, such as 424 rooms or opening in 2007.
- **Branch `redesign-2026`.** Asked "is it SOVITECH's current position, and will it be merged?", the owner answered "no".
  - It is not the company's current position, and it will not be merged.
  - Material taken from it stays in `company/` for reference only.
  - `main` (`e080614`) is the current website.

---

This file compares the SOVITECH website's brand system with the visual system in the app's approved mockups. It lists where they conflict and the options for resolving that. It does not choose an option. That decision belongs to the product owner.

**Decided (2026-09-24):** the product owner chose. See "Decision (2026-09-24)" above.

**Sources.**
- Website: [`README.md`](README.md), [`design-system.md`](design-system.md), [`tokens.json`](tokens.json). These come from github.com/Gaidenic13/sovitech-website at commit e0806142735dbdd53b913af30102f9227b380475.
- App: `design/onboarding-spec.md` section 2 (part 1, the intake wizard) and `design/dashboards-spec.md` sections 3.1-3.6 (part 2, the dashboards), both derived from the screenshots in `design/reference/`.
- Not used in the comparison table: the unmerged branch `redesign-2026` (commits `d2d15d2` and `af81353`), which is not SOVITECH's current position and will not be merged (decided 2026-09-24). [`README.md`](README.md) sections 14 and 15 list its brand and visual changes. The rows it would change are in a separate table after the comparison, "Rows the unmerged branch would change". On that branch the spotlight component also gives Radisson Blu 424 rooms, but no page renders it.
  - **Decided (2026-09-24):** the branch is not SOVITECH's current position and will not be merged. It stays out of the comparison, and its rows below are for reference only.

**Which one governs the app today.** `CLAUDE.md` says the user's screenshots are "the approved direction" and that "the approved screenshots in `design/reference/` are the brief". It also describes the app as "desktop-first with a dark UI". Until the product owner decides otherwise, the mockups govern the app, and the website brand is reference material.

**Decided (2026-09-24):** the brand, as `main` applies it, governs the app's visual system, in its dark variant. The mockups govern layout, structure, flows and content. The app stays dark and desktop-first.

**Colour values.** The app values are medians sampled from AI-rendered mockups. The specs call them "close targets, not exact brand values".

## Comparison

Contrast ratios in this table were calculated for this file.

**Decided (2026-09-24):** where a row shows a conflict, the website brand column now applies to the app, in its dark variant. There are four exceptions:
- **Overall theme:** the app stays dark only. It does not take the website's light-first cream theme.
- **Number format, badge text size, muted text contrast:** the app rule still wins, as each row says.
- **Language:** still open.
- **Data colours:** the brand has none for a dark dashboard, so the app theme section proposes them.

The table itself is unchanged, as a record of the comparison.

| Token or aspect | Website brand | App mockups | Conflict? |
|-----------------|---------------|-------------|-----------|
| Overall theme | Light first. Cream page `#F5F4F0`, white cards and header, with dark bands for the hero, stats and footer. | Dark only, "flat and dark" (part 1). | **Yes** |
| Dark surface | Deep green `#07201C` (hue 170°). Primary dark `#0D2E2B` (hue 175°). | Part 1: teal-navy `#040E14` (hue 202°), surface `#061219`. Part 2: near-black `#04080A` on 01-09, 11 and 12; teal-navy `#001117`-`#021419` on 15-22; `#031216` on 10. | **Yes.** Both are near-black, but the website's is green and the app's is blue. |
| Accent on dark | Mint `#C8E6C9`, used for text, eyebrows, stat values and small chips. It is the hover fill of the footer's white button; no button is mint at rest. | Aqua `#01F2D9`: filled primary button, current step, checked controls (part 1). Part 2 drifts to cyan `#00FDFA` on 19-21, with a mint `#74E7AC` on 13 and no accent on 01-09. | **Yes** |
| Accent on light | Green `#1F6B4A` | No light surfaces | Not applicable |
| One-accent rule | "The single accent" per surface (`DESIGN-SYSTEM.md` 1) | "One bright accent … used sparingly" (onboarding-spec 2.1). Dashboards spec 3.6 proposes "one filled primary per page". | **No.** The principle matches. The colour does not. |
| Primary button | Dark `#0D2E2B` fill, white 14px/500 label, 1px radius, green on hover. On dark surfaces: white fill, turning mint on hover. | Aqua fill, dark `#04231E` label, about 190×48, radius 6, label on the left and arrow on the right | **Yes:** colour and radius |
| Secondary button | Hairline border (white/15 on dark), text at 50%, turning white on hover | 1.5px `#6E787F` outline, transparent | Minor. Same idea, different values. |
| Radius | 1px controls, 2px surfaces, 9999px only for avatars, dots and tiny chips | Cards, panels and banners 8; inputs and buttons 6; checkbox 3; badges full. The dashboards spec proposes 6 for panels and 4 for controls. | **Yes** |
| Shadows and depth | None by rule (`DESIGN-SYSTEM.md` 3): hairlines and surface contrast. In the code, the shadcn primitives keep small shadows ([`README.md`](README.md) section 13). | None ("no shadows, no glows"). 1px hairlines and faint tinted fills. | **No** |
| Borders | `#0D2E2B` at 10-12% on light, white at 10% on dark (translucent) | Solid `#22333B` (cards), `#2A3840` (inputs), `#0E1D24` (dividers) | Values differ. The principle matches. |
| Selected state | Active chip: `#0D2E2B` fill with white text. Wizard option rows: accent tint plus border. | 1.5px `#2BA68F` border plus a `#031A1E` tinted fill | Similar approach. The colours differ. |
| Typeface | Inter, weights 300-900 | Inter for all UI text. A mono face (JetBrains Mono, IBM Plex Mono or Geist Mono) for the header date. | Partly. Inter is shared. The website has no brand mono. |
| Headline style | Large display type, weight 300, tracking −0.05em, up to 96px | H1 34px, weight 700, sentence case (part 1). Part 2 has four title roles: uppercase regular (01-09, 11-13), uppercase bold (10, 16, 17, 20), Title Case bold (15, 18, 19, 21, 22) and Title Case regular (14) (dashboards-spec 3.6). | **Yes:** weight and scale |
| Eyebrow | "• LABEL": 14px semibold uppercase, tracked, mint on dark | "STEP X OF 8": 13px, weight 400-500, uppercase, tracking 0.07em, `#AEBBC6` | Similar role. No bullet, and a different colour. |
| Body text on dark | White at 50-60%, weight 300 | `#C8D2DA`, `#AEBBC6`, `#8E99A4`, weight 400 | Values differ |
| **Wordmark and logo** | SVG logo: "SOVI" and "TECH" in a heavy grotesque, with a fingerprint-and-skyscraper "O" and a "CONTROL" bar. Dark and green on light, white on dark. See [`logo/`](logo/). | "SOVITECH" typeset in a squared geometric face that looks like Eurostile, about 24px with 0.2em tracking. No fingerprint and no "CONTROL". Onboarding-spec 2.3 notes it "should ship as an SVG logo". | **Yes. This is the largest mismatch.** The mockup wordmark is not the company's logo. |
| Name | "SOVITECH Control" in the interface. Legal name "SOVITECH CONTROL SRL". | "SOVITECH" | Minor |
| Tagline | No tagline in the header, footer or logo lockup. The home hero headline "Construit să controleze orice clădire. / Oriunde." ("Built to control every building. / Everywhere.", `app/page.tsx`) is the nearest brand line. [`voice-and-messaging.md`](voice-and-messaging.md) 7.8 notes it must never read as a claim about a specific project. | Four variants: "BUILDING INTELLIGENCE / FOR A SUSTAINABLE TOMORROW" (part 1, screens 10 and 15). "BUILDING AUTOMATION / FOR BETTER BUILDINGS" (01-08). "REAL BUILDINGS. REAL RESULTS." (part 2 bottom bar). "Smarter Buildings. Brighter Experiences." (18). | **Yes.** The mockups introduce taglines that the website does not use. |
| Icons | Lucide (`components.json` `iconLibrary: "lucide"`), default stroke, 16-20px | Lucide at stroke 1.5, with Tabler for gaps; 20-64px | **No** (same library) |
| Data colours | Five chart colours: dark, green, mint, coral, indigo. One destructive red `#E53E3E`. No status or system colours. | A 10-colour system palette, status colours and zone colours (dashboards-spec 3.2, 3.6) | **Gap.** The brand has no data palette for a dark dashboard. Chart colour 1 (`#0D2E2B`) is 1.3:1 on `#040E14`, which is invisible. |
| Motion | Colour-only hovers at 150/300ms, count-up stats, WebGL hero | Not specified in either spec | Open |
| Imagery | Photoreal daylight architecture, engineers at work, dashboards on screens | A 3D building model (wireframe or cyan glass), a hotel photo on the project card. The split-screen photo heroes were dropped (onboarding-spec 1). | Different purpose; no direct conflict |
| Language | Bilingual Romanian and English, Romanian by default, full diacritics | English only in every mockup. `prompts/sovitech-ai-system.md` states "The app's interface language is English." No design spec addresses a Romanian UI. `CLAUDE.md`: the user writes English and sometimes Romanian, and owner documents are usually Romanian. | **Open question** |
| Number format | Inconsistent: "250,000+" in both languages on the stats band, "45.000 m²" in Romanian elsewhere | `docs/guardrails.md` rule 8 sets Romanian number formats | The app follows rule 8. Do not copy the website's formatting. |
| Badge text size | 10-11px pills (`text-[10px]` category badge) | `docs/guardrails.md` 2.8: badges 12px or larger, WCAG AA | The app rule wins. Do not copy the website's badge size. |
| Muted text contrast | `#888888` on `#F5F4F0` is 3.2:1 | The guardrails need 4.5:1 for badges; dashboards-spec 3.3 proposes 4.5:1 for data text | The website's muted grey is not a model for the app. |
| Favicon | None of its own. The site ships the v0.app mark. | Not shown | **Gap.** The app needs a mark. |

## Rows the unmerged branch would change

Source: branch `origin/redesign-2026`, commits `d2d15d2` (2026-08-24) and `af81353` (2026-08-27), compared with `main` at `e080614`. Details are in [`README.md`](README.md) section 15. **The branch is not merged. As far as we know it is not published, and nobody has approved it.** The comparison table above describes `main`. This table records only what differs on the branch, for reference. It does not change any conflict verdict above, and it chooses no option.

**Decided (2026-09-24):** the branch is not SOVITECH's current position and will not be merged. This table is kept for reference only. Where a row mentions the branch's new hero line, that line is not a candidate for the app.

| Row above | On the branch | Effect on the conflict |
|-----------|---------------|------------------------|
| Overall theme | Still light first, but most page types now open with a dark `#07201C` band carrying the WebGL field (20 files, against 1 on `main`; `/resurse` keeps a cream masthead, see [`README.md`](README.md) 15.2) | More dark surface on the website. The dark is still green-black, so the "Dark surface" conflict is unchanged. |
| Headline style | Home hero display up to 72px (`lg:text-7xl`), down from 96px. Page-frame titles up to 60px (`md:text-6xl`). Still weight 300 with tight tracking. | Slightly closer in scale to the mockups. Weight and style still differ. |
| Tagline | The home hero line becomes "Integrator independent de automatizare a clădirilor și BMS." ("Independent building automation and BMS integrator."). The footer adds "Integrator independent de sisteme de automatizare a clădirilor. Partener autorizat SAUTER din 2017." There is still no tagline in the header or logo lockup. | The nearest brand line changes. Decision 3 below would have a new website line to consider. The home page no longer uses "Construit să controleze orice clădire.", so the [`voice-and-messaging.md`](voice-and-messaging.md) 7.8 entry on it would not apply there. The 7.8 entry on "Integrăm orice protocol" still would: the branch keeps that line on its service cards. |
| Primary button | Same recipe. The home hero button reads "Cere o evaluare a clădirii" ("Request a building assessment") and the footer button "Cere o evaluare" ("Request an assessment"). The header keeps "Cerere ofertă". | Colour and radius conflict unchanged. The new labels avoid the reserved term "ofertă" (`docs/guardrails.md` 2.8); the header label does not. |
| Name | Footer copyright "SOVITECH CONTROL SRL"; running copy and article bylines "Sovitech Control" | Minor, as above |
| Imagery | Photographs, and two renders, labelled with reference clients' names; dark Canva service images with invented SAUTER screens; flat Canva infographic covers in the brand palette with the logo. The generated headshots are removed. See [`imagery/README.md`](imagery/README.md), branch sections. | Still no direct conflict. The reference photos have unknown provenance and real-brand signage, so [`imagery/README.md`](imagery/README.md) proposes that none be used in the app or the demo until SOVITECH confirms the rights (a proposal awaiting approval, not a rule in force). |
| Data colours | New sector, service and category fills, including `#B14A36` outside the palette. Still no status or dark-surface data palette. | Gap unchanged |
| Motion | Hover scale moves to new places (11 on each side) | Unchanged: the mockups specify no motion |
| Wordmark and logo, Favicon | Unchanged. No new mark or favicon. The covers use the existing logo. | Unchanged |
| Icons, typeface, radius, shadows, language, badge size | Unchanged in substance. New 10-11px uppercase labels and 10px badges continue the small-text pattern. | Unchanged. The app rules still win on badge size and contrast. |

## What stays the same whichever option is chosen

These points follow from `docs/guardrails.md` and the specs, not from the brand choice.

- **Values render through the app's value and price components.** They carry badges and sources. Website stat recipes (big mint count-up numbers, "Cifrele confirmă." / "The numbers confirm.") show bare numbers without a source. They must not be reused for engineering values or prices (`CLAUDE.md` "How to build"; guardrails rules 2 and 9).
- **Website figures are not data.** The stats, case-study results and savings percentages are marketing. They are not verified engineering data or an approved reference dataset (guardrails rule 1, 2.1). Adding them as a reference dataset would be a loosening, which needs the product owner's approval (guardrails section 10). See [`README.md`](README.md) section 12.
- **Website CTAs contain reserved terms.** "Cerere ofertă", "Request a quote", "Conformitate" and "GMP-compliant" contain terms on the guardrails reserved list (2.8). In the app they can appear only as action labels or verbatim quotations, and never next to a price below the "Formal quotation" stage (rule 10).
- **Radisson Blu appears on both sides.** The website presents Radisson Blu Bucharest as a client, with testimonials and a case study. It gives the room count as 424 (the case-study page `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` and the hotel article `app/resurse/articole/optimizare-hotel-bms/page.tsx`) and as 428 (`components/aethel-testimonials.tsx`, `app/ghid-bms/case-studies/page.tsx`, `app/ghid-bms/resurse/page.tsx`). The mockups show "Rooms 424" (dashboards-spec 3.4; onboarding-spec step 3), the same figure as the website's case study. The demo label "Demo data, not an assessment of the real building" stays in place. The demo's figures must come from fixture documents, not from the website (guardrails rule 10, demo data: "Demo values cite fixture documents that exist in the repo"). A demo figure that matches a website figure should be checked, or changed so the two cannot be confused.
  - **Decided (2026-09-24):** the demo project gets a fictional name, working name "Demo Hotel Bucharest". Mockup transcriptions keep "Radisson Blu Bucharest" as the screens show it. Not reusing the real hotel's published facts, such as 424 rooms, is recommended but not decided.
- **The data palette comes from the dashboards spec.** The brand palette has no status, system or categorical colours that work on a dark background. So `sys-*`, status and chart colours come from dashboards-spec 3.2 and 3.6 whichever option is chosen. They still need a colour-blind check.
  - **Update (2026-09-24):** the app theme section below proposes brand-fitted values for the same roles, with a scripted colour-blind check. They need the owner's OK. Until then, dashboards-spec 3.2 and 3.6 hold the mockup values.
- **Status colours stay apart from the accent.** Dashboards-spec 3.6 already asks for a separate OK hue so a status dot never matches the primary button. That applies to whatever accent is chosen.
  - **Update (2026-09-24):** with mint as the accent, the proposed OK green `#4FCC92` is ΔE 16.3 from mint (app theme section).

## Options

These are not ranked. Each one lists what it changes and what it costs.

**Decided (2026-09-24):** none of the five as written. The decision is closest to A2, taken further: the app also adopts the brand's radius, depth, type, motion and voice. Each option below has its own "Decided:" line.

### A. Keep the mockups' dark theme, adopt the brand accent and logo

**Decided:** superseded by the decision. Its accent and logo changes are adopted. The teal-navy theme and the mockups' radii and type are not kept.

- Keep the teal-navy theme, layouts, radii and type of the mockups.
- Replace the aqua accent `#01F2D9` with brand mint `#C8E6C9`. Use a dark label on it, such as `#0D2E2B` (10.8:1 on mint).
- Replace the typeset wordmark with `logo-white.svg`.
- **Gains:** the closest link to the company brand for the least redesign. The approved layouts stay intact.
- **Costs:**
  - Mint is much paler and less saturated than aqua. Its lightness sits next to the app's secondary text `#C8D2DA` (1.1:1 between them), so as text it would not stand out. It would need to rely on fills and borders.
  - Every screen with an aqua element changes.
  - Brand green `#1F6B4A` falls below the 4.5:1 needed for normal text on the dark background (3.0:1 on `#040E14`).

### A2. As A, and move the background toward the brand's green-black

**Decided:** adopted, and extended to the brand's radius, depth, type, motion and voice. The background is `#07201C`. The build will no longer match the mockups pixel for pixel. They stay the brief for layout, structure, flows and content.

- As option A, and also shift `bg` from `#040E14` (blue) toward `#07201C` (green).
- **Gains:** the app would read as the same family as the website's dark bands and footer.
- **Costs:** every surface, border and text token in onboarding-spec 2.2 and dashboards-spec 3.6 would need re-deriving. The mockups would no longer match the build pixel for pixel.

### B. Follow the website brand fully

**Decided:** adopted except for the theme. The app takes the brand but not its light-first cream theme. It uses the brand's dark variant, as the website's dark bands and footer do. The brand's missing dashboard data palette is proposed in the app theme section.

- Move to the website system: the cream `#F5F4F0` light theme with dark bands, the 1px/2px radii, light display headings, green and mint accents, and Inter 300.
- **Gains:** one brand across the website and the app.
- **Costs:**
  - It overturns the approved screenshots and the "dark UI" in `CLAUDE.md`.
  - Both specs' visual sections would need rewriting.
  - The brand has no dashboard data palette, so one would still need designing.
  - The mockups would stop being a usable brief.

### C. A documented product sub-brand

**Decided:** not chosen. The app is a SOVITECH brand tool, not a sub-brand with its own visual system. The aqua accent is dropped.

- Treat the app as a SOVITECH product with its own visual system: the mockups' dark theme and aqua accent, under a product name such as "SOVITECH Control". The repository proposes no name.
- Tie it to the master brand with a few shared elements: the real logo, Inter, flat hairline depth, and the one-accent rule.
- Record the relationship in a short sub-brand sheet: what is shared, what is product-only, and where each applies.
- **Gains:** keeps the approved design. Makes the difference intentional instead of accidental.
- **Costs:**
  - Two systems to maintain.
  - The taglines, name and wordmark still need decisions.
  - The logo's green `#00674C` and the app's aqua would appear together in the header. White `logo-white.svg` avoids that.

### D. Brand in the chrome, product system in the content

**Decided:** not chosen as a split. The whole app, chrome and working screens alike, uses the brand. Proposal exports still need their own template decision. On white paper they would use `logo.svg`, and they must still show badges, ranges and sources inline (guardrails 2.8).

- The header, footer, exported proposal covers and emails use the website brand: logo, name, and possibly the green-black surface.
- The working screens (wizard, dashboards, data) keep the mockup system.
- **Gains:** anything that leaves the app, such as PDF proposals and emails, looks like SOVITECH. The working screens stay as approved.
- **Costs:**
  - The header and body could clash inside one screen.
  - Proposal exports would need their own template decision. That template must still show badges, ranges and sources inline (guardrails 2.8).

## Decisions needed

Each one is open whichever option is chosen:

1. **Logo in the app header.** Should it be the real SVG logo or the mockups' typeset "SOVITECH"? Onboarding-spec 2.3 already expects an SVG.
   - **Decided (2026-09-24):** the real logo. `logo-white.svg` on the dark UI, at `h-8` in the header. The typeset wordmark is dropped.
2. **Product name.** "SOVITECH", "SOVITECH Control", or a separate product name?
   - **Still open.** The brand name is SOVITECH. Whether the app has its own product name is not decided.
3. **Tagline.** Pick one of the four mockup taglines, reuse the website hero line ("Construit să controleze orice clădire. / Oriunde."), write a new one, or have none. The website has no tagline in its header, footer or logo lockup, so a mockup tagline or a new one would be new brand copy for the owner to approve.
   - **Decided (2026-09-24):** the four mockup taglines are dropped.
   - **Still open:** the brand line from [`voice-and-messaging.md`](voice-and-messaging.md) 7.8, or no tagline. The app theme section describes the option.
4. **Accent colour.** Aqua `#01F2D9` (mockups) or mint `#C8E6C9` (brand).
   - **Decided (2026-09-24):** mint `#C8E6C9`, the single accent on dark.
5. **App icon and favicon.** Neither exists.
   - **Still open.** The decision does not settle it. [`logo/README.md`](logo/README.md) names two possible sources: a square mark cut from `building.svg`, or from the logo's fingerprint "O". Either is a brand decision.
6. **App languages.** Keep English only, as the AI prompt states, or add Romanian or both, like the website? A change would also update `prompts/sovitech-ai-system.md`.
   - **Still open.** The decision carries the brand voice. The website also writes every string in Romanian and English, but language was not part of the question.
7. **Values the brand does not define.** Added 2026-09-24.
   - **Still open:** status colours, the system palette, the text levels on dark, disabled, the focus ring on dark, badge colours and chart colours. The app theme section proposes each one. They need the owner's OK.

---

## App theme: the brand's dark variant (proposed tokens)

This section applies the 2026-09-24 decision to the app's colour roles. It is a proposal. No code exists yet.

**Where the roles come from.** `design/onboarding-spec.md` section 2 (part 1) and `design/dashboards-spec.md` sections 3.1-3.6 (part 2). The "Mockup" column gives their sampled values. They are medians from AI-rendered mockups, and part 1's unless the row says otherwise.

**Where the values come from.** [`design-system.md`](design-system.md) and [`tokens.json`](tokens.json) (website `main`, `e080614`). The Source column says how far the brand covers each row:
- **Brand:** the brand defines both the role and the value. Adopted by the decision.
- **Brand value, new role:** a brand token, used for a role the brand does not define on dark. Needs the owner's OK.
- **Extension:** a value the brand does not have. Needs the owner's OK.

**How the numbers were checked.** A script computed every contrast ratio on 2026-09-24. It used the functions of the dataviz skill's `validate_palette.py` (WCAG 2 contrast; OKLab ΔE ×100; Machado 2009 colour-blindness simulation).
- Ratios are given as **bg / surface**: against `#07201C` and against `#0D2E2B`.
- Alpha values also give the hex they resolve to on each.
- The thresholds are 4.5:1 for text, and 3:1 for marks, control boundaries and focus rings (WCAG 1.4.11).

**What still wins.** `docs/guardrails.md` wins over every row. Badges stay at 12px or larger with AA contrast, and take their labels only from 2.8. Numbers follow rule 8. The demo label shows on every screen (rule 10).

### Surfaces and lines

| Role | Mockup | App value | Source | Contrast |
|------|--------|-----------|--------|----------|
| `bg`: page, header, sidebar | `#040E14`. Part 2: `#04080A` (01-09), `#001117`-`#021419` (15-22). | Deep surface `#07201C` | Brand | — |
| `surface`: raised panels, dropzone, textarea, table header bands, KPI tiles, menus | `#061219`. Part 2 raised tile about `#070D10`. | Dark `#0D2E2B` | Brand | 1.17:1 against bg. Depth comes from surface contrast plus a hairline, as the brand says. |
| Unselected card | Equal to `bg`, border only (onboarding-spec 6.2) | Equal to `bg`, border only | Brand (depth from hairlines, not fills) | — |
| `surface-input` | `#081016` | Transparent. The input takes the surface it sits on, and `border-input` marks it. | Brand value, new role | — |
| `surface-selected` | `#031A1E` | Mint at 8%: `#16302A` / `#1C3D38` | Brand. The website's wizard kit marks a selected row with an accent tint plus a border. Mint is the accent on dark. | — |
| `border` (cards, panels) and `divider` | `#22333B`, `#0E1D24`. Part 2 `#181C1E`, `#0E1416`. | White at 10%: `#203633` / `#254340`. Hover: white at 25%. | Brand (hairline on dark; hover 25-40%) | 1.33 / 1.36. Decorative lines need no minimum. |
| `border-input`, dropdown border | `#2A3840`; part 2 `#434545` | White at 35%: `#5E6E6B` / `#627775` | Extension. The brand's hairline is 10%. 35% is the lowest 5% step of white that gives an input boundary 3:1 (30% gives 2.68 / 2.63). | 3.18 / 3.06 |
| `border-dashed` (dropzone) | `#596772`, 1.5px dashed | White at 35%, 1px dashed | Extension. The brand has no dashed line. | 3.18 / 3.06 |
| `border-strong` (Back button) | `#6E787F`, 1.5px | White at 15%, 1px. Label white at 50%, turning white on hover. | Brand (the secondary button on dark) | Border 1.57 / 1.59. Label 5.15 / 4.72. |
| `border-selected` | `#2BA68F`, 1.5px | Mint `#C8E6C9`, 1px | Brand (accent border) | 12.67 / 10.82 |

### Accent, buttons and controls

| Role | Mockup | App value | Source | Contrast |
|------|--------|-----------|--------|----------|
| `accent` | Aqua `#01F2D9`. Part 2 drifts to `#00FDFA`; mint `#74E7AC` on 13. | Mint `#C8E6C9`. Used for the current step, checked controls, the active segment, selected borders, the focus ring, text selection and inline links. Never for the primary button fill at rest. | Brand (the single accent on dark) | 12.67 / 10.82 |
| Primary button | Aqua fill, `#04231E` label, radius 6 | White `#FFFFFF` fill, `#0D2E2B` label, turning mint on hover (300ms). Radius 1px. One per page (dashboards-spec 3.6). | Brand (the footer's white button on dark, mint on hover; no button is mint at rest) | Label 14.56 on white, 10.82 on mint |
| Secondary button | 1.5px `#6E787F` outline | See `border-strong` | Brand | See above |
| `on-accent` | `#04231E` | `#0D2E2B` | Brand | 10.82 on mint |
| `accent-dim` (completed step ring and connectors) | `#2A8475`; check about `#339C92` | Mint at 50%: `#688372` / `#6A8A7A`. The check is mint. | Brand value, new role | 4.12 / 3.83 |
| Current step | Aqua disc, dark numeral | Mint disc, `#0D2E2B` numeral | Brand | 10.82 |
| Upcoming step ring | `#4A565E` | White at 35% (as `border-input`). Upcoming connectors white at 10%. | Extension | 3.18 / 3.06 |
| Checked checkbox and radio | Aqua fill, dark check | Mint fill, `#0D2E2B` check. Checkbox radius 1px. Radio fully round. | Brand | Mark 12.67 / 10.82. Check 10.82. |
| `control-off` (unchecked ring) | `#9AA6B2`; radios `#495259`-`#6E7E8B` | White at 55%: `#8F9B99` / `#92A1A0`. One value for checkbox and radio. | Extension | 5.94 / 5.43 |
| Focus ring | Not specified | Mint, 2px, with a 2px offset | Brand value, new role. The brand's ring is green `#1F6B4A`, which reaches only 2.65:1 on bg. | 12.67 / 10.82 |
| Disabled | Not specified | Text and icons white at 35% (`#5E6E6B` / `#627775`). Border white at 10%. No fill. Continue and Generate are never disabled (guardrails rule 7). | Extension. WCAG exempts disabled controls from the contrast minimum. | 3.18 / 3.06 |
| Text selection | Not specified | Mint background, `#0D2E2B` text | Brand (the website's text-selection colour) | 10.82 |
| Sidebar selected row (part 2) | Blue bar `#4DA9EC`-`#70AFF7` on a blue-teal fill; six styles | A 2px mint bar, a mint 8% fill, and the label in `text-primary` at weight 600 | Brand (accent tint plus mark). Geometry from dashboards-spec 3.4. | Bar 12.67 / 10.82 |

### Text

| Role | Mockup | App value | Source | Contrast |
|------|--------|-----------|--------|----------|
| `text-primary` | `#F4F7FA`; part 2 `#F8FAFB` | White `#FFFFFF` | Brand | 17.04 / 14.56 |
| `text-secondary` | `#C8D2DA` | White at 80%: `#CDD2D2` / `#CFD5D5` | Extension. The brand's body text on dark is 50-60%. | 11.15 / 9.79 |
| `text-tertiary` | `#AEBBC6` | White at 60%: `#9CA6A4` / `#9EABAA` | Brand (body text on dark) | 6.82 / 6.14 |
| `text-muted` | `#8E99A4` | White at 55%: `#8F9B99` / `#92A1A0` | Brand range. 55% is the lowest step that keeps 4.5:1 on bg, on surface and on the selected fill (4.79 on `#1C3D38`). | 5.94 / 5.43 |
| `text-faint` | `#75828D` | Dropped. Source lines and tile descriptions use `text-muted`. | Extension. White at 50% passes on the surface (4.72) but not on the selected fill (4.24). | — |
| `text-link` (Edit links) | `#5ED1D3` | Mint, turning white on hover (150ms) | Brand value, new role. The website's links take the surface's accent: green on light. Mint is the accent on dark. | 12.67 / 10.82 |
| `text-accent` (Browse files) | `#39D4BA` | Mint | Brand | 12.67 / 10.82 |
| Eyebrow | "STEP X OF 8" in `text-tertiary`, 13px | Mint, 14px, weight 600, uppercase, tracked, after a "•" bullet | Brand (eyebrow) | 12.67 / 10.82 |

### Banners, pills and badges

Badges are 12px or larger, weight 500, fully rounded (the brand's "tiny status chips"). Their labels come only from guardrails 2.8. The website's 10-11px badges are not copied. The `badge-*` tokens set colour only (onboarding-spec 2.5).

| Role | Mockup | App value | Source | Contrast |
|------|--------|-----------|--------|----------|
| `info` icon; `info-bg` / `info-border` | `#24D6E8`; `#021C24` / `#194A5B` | White icon on a `#0D2E2B` fill, with a white 10% border | Brand values, new role. There is no info hue: a cyan would sit next to Water's (dashboards-spec 3.2). | Icon 14.56 |
| `success-bg` / `success-border`, success title | `#03181F` / `#2E7E6E`; title about `#76CFCA` | `status-ok` at 8% (`#0D2E25` / `#123B33`), a `status-ok` 40% border (`#24654B` / `#276D54`), a `status-ok` icon and title, body in `text-secondary` | Extension (uses `status-ok` below) | Title 7.24 / 6.11 on its fill. Body 9.84 / 8.52. |
| `warning` (amber dot, warning row) | `#F3C014`; amber text about `#D8B84E` | `status-warning` for the dot and the icon. The text stays in text tokens. | Extension | 8.93 / 7.62 |
| Status pill (the step 3 count) | Dark neutral fill, amber dot, amber text | White 8% fill, a 6px `status-warning` dot, the label in `text-primary` | Extension | Dot 7.13 on the fill. Label 13.62. |
| `badge-document` (From document, From design drawings) | Fill `#093167`, text `#79AFE2` | Sand `#D4C4A8` text on sand at 14% (`#243730` / `#29433C`) | Brand value, new role (a brand pastel) | 7.37 / 6.25 |
| `badge-ai` (Likely, Possible, Please check, SOVITECH will check) | Fill `#1F1C5A`, text `#928BCA` | Lavender `#C5C0F5` text on indigo `#5C5FD4` at 30% (`#203353` / `#253D5E`) | Brand values, new role | 7.37 / 6.41 |
| `badge-detected` (outline) | Fill `#01201F`, border `#24685F`, text `#33D0B9` | Detected becomes From document, Likely or Possible (onboarding-spec 2.5). So the outline pill takes that badge's colour: transparent fill, text in the badge colour, a 1px border in the same colour at 40%. | Brand values, new role | Sand 9.95 / 8.50. Lavender 9.93 / 8.48. |
| `badge-optional` (Not found in documents) | Fill `#14232D`, text `#B5C3D3` | `text-secondary` on white at 8% | Brand values, new role | 9.27 / 7.98 |
| Other 2.8 badges | Not in the mockups | The neutral badge (as `badge-optional`) until a colour mapping is agreed | Extension | 9.27 / 7.98 |
| In Scope pill (part 2) | Fill `#0D482B`, text `#BFDECE` | Green `#1F6B4A` fill, white text | Brand values, new role. Green is a fill only on dark, never text (2.65:1). | 6.44 on the fill |
| Planned pill (part 2) | Fill `#242D31`, text `#BAC1C5` | White 8% fill, `text-secondary` | Brand values, new role | 9.27 / 7.98 |

The sand and lavender texts are ΔE 11.3 apart, and 11.2 under deuteranopia. The two badges also differ in their words.

### Status colours (extension, for the owner's OK)

The brand has no status colours. These are proposed. The rules that go with them:
- A status always shows a dot or an icon plus a text label. The label is in text tokens, not in the status colour. Dashboards-spec 7.2, item 2, proposes "Always text plus colour"; that proposal is not yet in force.
- Status hues are reserved. They never mean a system or a chart series.
- The OK hue stays apart from mint, so a status dot never matches the accent (dashboards-spec 3.6, item 1).

| Status | Mockup | App value | Contrast | Nearest other colour (ΔE) |
|--------|--------|-----------|----------|---------------------------|
| OK / live | `#22EEB2`, drifting; about `#03F3D6` on 19 and 21, the accent's colour | `#4FCC92`, a green darker and more saturated than mint | 8.43 / 7.20 | Mint 16.3. Access Control 17.6. |
| Warning | Yellow `#F1D80F`-`#F6DF16`; part 1 amber `#F3C014` | Amber `#F2AF48` | 8.93 / 7.62 | Lighting 14.7 (mockups: 2.3) |
| Fault | `#F44E58` | `#F66C6D` | 5.91 / 5.05 | Fire Safety 13.2 (mockups: 1.4) |
| Offline | Grey `#A0ABBA` on 05; red on 07 and 17 | Neutral grey-green `#919B98` | 5.96 / 5.09 | Neutral, so not compared |

- All four reach 4.5:1 on bg and on surface.
- On the selected fill, Fault (4.11) and Offline (4.14) fall below 4.5:1. That is one more reason to keep labels in text tokens.
- **Colour-blind pairs.** Under deuteranopia, OK and Fault are only ΔE 6.1 apart. Under protanopia, Fault and Offline are 7.5 apart, and OK and Warning 8.2. The label is what separates them.

### System palette (`sys-*`, extension, for the owner's OK)

The brand has no data palette for a dark surface. Its chart colour 1 (`#0D2E2B`) is invisible on bg, and green reaches only 2.65:1.

This palette keeps the mockups' hue families, with two changes: it is softer and darker, and it moves Access Control from green to teal. Three hues sit on brand hue families. The values are OKLCH lightness 0.56-0.67 and chroma about 0.10-0.14.

The order is fixed: the step 4 order, then the part 2 systems.

| System | Mockup (dashboards-spec 3.2) | App value | Relation to the brand | Contrast |
|--------|------------------------------|-----------|-----------------------|----------|
| HVAC | `#3C94F8` | `#1181B4` | Extension (blue) | 3.91 / 3.34 |
| Lighting | `#F8E00A` | `#A59804` | Extension (yellow, darkened for the dark surface) | 5.76 / 4.92 |
| Energy | `#A96CF7` | `#A67FD8` | Close to lavender's hue (303° against 289°) | 5.39 / 4.61 |
| Access Control | `#44C551` | `#14938D` | Extension. Teal, away from OK green and mint. | 4.53 / 3.87 |
| Fire Safety | `#F5454F` | `#B75C49` | Coral's hue (33° against 31°), darker | 3.77 / 3.22 |
| Water | `#36DAF0` | `#0AA1CE` | Extension (cyan) | 5.68 / 4.85 |
| Elevators (vertical transport) | `#F88F0A` | `#BB7400` | Extension (orange) | 4.55 / 3.89 |
| CCTV | `#F55FA8` | `#AD5597` | Extension (pink) | 3.67 / 3.13 |
| Room Automation | `#A0E589` | `#6E800E` | Extension (olive green) | 3.86 / 3.30 |
| Car Park Management | `#7BA2CB` (06 only) | `#6F6FC7` | Indigo's hue (282° against 278°), lighter | 3.87 / 3.31 |
| Other | `#C8D0D9` | Khaki `#8B7B5C` | Brand token, new role. Its low chroma is deliberate: "Other" should read as nearly grey. | 4.13 / 3.52 |

**Validation.** `validate_palette.py`, dark mode, run on both surfaces, on the first ten systems in this order.
- **Adjacent pairs** (stacked bars, lists in this order): every check passes on both surfaces.
  - Lightness band 0.48-0.67 and chroma of at least 0.10: pass.
  - Worst colour-blind pair: Access Control and Fire Safety, ΔE 10.0 under deuteranopia. The target is 8.
  - Worst normal-vision pair: Elevators and CCTV, ΔE 20.1. The floor is 15.
  - Every colour reaches 3:1.
- **All pairs** (plans, 3D pins, scatter): fails, as any 10-colour set must.
  - Worst normal-vision pair: Fire Safety and Elevators, ΔE 8.9.
  - Worst colour-blind pair: Elevators and Room Automation, ΔE 0.7 under protanopia.
  - So colour never identifies a system on its own. Pins and legends carry the system glyph and name (the pin in dashboards-spec 3.5).
- **Against status and mint.** The closest pair is Fire Safety and Fault, ΔE 13.2 (1.4 in the mockups). Lighting and Warning are 14.7 apart (2.3 in the mockups).
- **Other.** Khaki is about ΔE 10 from Fire Safety, Elevators and Room Automation. Its label carries it.

### Charts

Values, labels and legends use text tokens, never the series colour. Grid lines are white at 10%. Tick labels are `text-muted`.

| Role | Mockup | App value | Source |
|------|--------|-----------|--------|
| Single series | HVAC blue | White at 70%: `#B5BCBB` / `#B6C0BF` (8.82 / 7.82) | Extension. Dashboards-spec 3.2 asks for a neutral here. |
| Highlighted series or selected mark | Blue or white | Mint | Brand (accent) |
| Ordered categories: phases, and scenarios when they are ordered | One blue, green, yellow and grey set carrying six meanings (dashboards-spec 3.6) | A green-to-mint ramp: `#1F6B4A`, `#4D8868`, `#76A787`, `#9FC6A7`, `#C8E6C9`. Contrast 2.65, 4.09, 6.21, 9.01, 12.67 on bg; 2.26, 3.49, 5.30, 7.70, 10.82 on surface. | The two ends are brand tokens. The three middle steps are an extension (OKLab interpolation). The ramp passes the validator's ordinal check on both surfaces. The darkest step is below 3:1, so charts using it need visible labels or a table view. |
| Systems | Three system palettes (dashboards-spec 3.6) | `sys-*` above | Extension |
| Unordered categories that are not systems: cost categories, savings streams, zone types | The same blue, green, yellow and grey set | Not proposed. Still open (dashboards-spec 3.6, item 6). Until then: direct labels, and low-chroma or labelled fills (dashboards-spec 3.2). | — |
| An unknown value | Not shown | A labelled gap, never a zero (guardrails rule 1, case G1-5). No fill, a dashed outline in white at 35%, and the 2.8 label. | Extension |

### Shape, type, motion and logo

| Aspect | Mockups | App | Source |
|--------|---------|-----|--------|
| Radius | Cards, panels and banners 8; inputs and buttons 6; checkbox 3; badges full. Dashboards-spec proposes 6 for panels and 4 for controls. | 2px for surfaces, cards, panels, banners and inputs. 1px for buttons, chips, segmented controls, checkboxes and menu items. 9999px only for badges, status dots, radios and avatars. | Brand |
| Depth | None: "no shadows, no glows" | None. Hairlines and surface contrast only. The website's leftover shadcn shadows are not copied. | Brand |
| Typeface | Inter; a mono face for the header date | Inter only. The header date uses Inter with tabular figures. A mono face would be an extension. | Brand. The date treatment is a proposal. |
| Page title | Part 1: 34px, weight 700, sentence case. Part 2: four title roles. | Inter weight 300, tracking −0.05em, sentence case, at the specs' sizes (34px). If the owner agrees, this settles dashboards-spec 3.6, item 4 (one title role). | Brand (display headings: light, tightly tracked) |
| Weights | 400, 500, 600, 700 | 300 for titles and long body text. 400 for UI text and values. 500 for buttons. 600 for labels, eyebrows and card titles. No 700. | Brand. The website loads 300, 400, 600, 800 and 900, and its buttons use 500. |
| Body text | 14-17px, weight 400 | Body copy at 16px, weight 300, as the brand. Weight 400 below 16px, where light text is too thin on dark. | Brand, with an extension for small text |
| Motion | Not specified | Colour-only hovers. 150ms for text and link colour, 300ms for surfaces. Easing `cubic-bezier(0.4, 0, 0.2, 1)`. Opacity-only reveals. `prefers-reduced-motion` respected. No count-up on engineering values or prices: a count-up shows numbers that are not the value (see "What stays the same" above). | Brand. The count-up exclusion follows from guardrails rule 2. |
| Icons | Lucide at stroke 1.5, Tabler for the gaps | Unchanged. The website uses Lucide at its default stroke, but stroke is not a brand rule. | Mockups |
| Logo | Typeset "SOVITECH", Eurostile-like, about 24px, tracking about 0.2em | `logo-white.svg` at `h-8` (32px tall, about 128px wide) in the 64px header; `h-9` in a footer. Fixed height, automatic width, no CSS filters, never typeset. Alt text "SOVITECH Control", as on the website. `logo.svg` on light exports, such as a PDF on white. | Brand |
| Name | "SOVITECH" | SOVITECH is the brand. The app's own product name is still open (decision 2). | Decision of 2026-09-24 |

### Shell sizes

The brand has no app shell, so these come from the specs' proposals. Only the radius changes, to the brand's.

| Element | Mockups | App | Source |
|---------|---------|-----|--------|
| Header | 52-66px; part 1 64px | 64px, one component. The website header is also 64px. | Dashboards-spec 3.4 |
| Sidebar | 188-220px, row pitch about 32-39 | 208px, row pitch 32 | Dashboards-spec 3.4 |
| Inspector | 238-493px | 360px | Dashboards-spec 3.4 |
| Status footer | Six bottom-bar variants | 48px, always present. It holds the data status and the demo label, "Demo data, not an assessment of the real building" (guardrails rule 10). No tagline. | Dashboards-spec 3.4, with the tagline removed |
| Playback bar | On most part 2 screens | 56px, only on views with a real time axis | Dashboards-spec 3.4 |
| Spacing | Varies | 16px gutter, 12px panel gap | Dashboards-spec 3.4 |
| Buttons | 30-48px tall | 40px, or 32px compact. Part 1's primary stays 190×48. Radius 1px. | Dashboards-spec 3.5; onboarding-spec 2.4 |
| Segmented control | 28-39px | 32px, radius 1px, active cell in mint | Dashboards-spec 3.5; radius from the brand |
| Minimum viewport | — | 1440×900 | Dashboards-spec 3.4 |

### Taglines

- **Dropped.** The four mockup taglines, as the screens show them:
  - "BUILDING INTELLIGENCE / FOR A SUSTAINABLE TOMORROW"
  - "BUILDING AUTOMATION / FOR BETTER BUILDINGS"
  - "REAL BUILDINGS. REAL RESULTS."
  - "Smarter Buildings. Brighter Experiences."

  The website has no tagline in its header, footer or logo lockup.
- **An option, not a decision.** Use the brand line that [`voice-and-messaging.md`](voice-and-messaging.md) 7.8 identifies: "Construit să controleze orice clădire." The website's own English is "Built to control every building."
  - It is the home hero headline on `main`, where "Oriunde." / "Everywhere." follows it.
  - 7.8 lists it among absolute capability claims. It is usable as a company tagline, but it must never read as a statement about a specific project.
  - If chosen, it belongs in company chrome, such as a sign-in screen. It should not sit in the status footer next to demo figures or estimates.
- **The other option** is no tagline.

### What this section does not change

- `docs/guardrails.md`.
- The mockups' role as the brief for layout, structure, flows and content.
- The colour tables in `design/onboarding-spec.md` 2.2 and `design/dashboards-spec.md` 3.2 and 3.6. They still hold the mockup values.
