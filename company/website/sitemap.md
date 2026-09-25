# SOVITECH website: routes, navigation and SEO

This file maps every route of the SOVITECH company website, with its visible title, purpose and main sections, plus the header and footer navigation, the SEO metadata, the language handling and how the dynamic routes are generated. It describes the repository `Gaidenic13/sovitech-website` at commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11, "Mobile-first product detail layout"). The website's copy and figures are marketing content: the SOVITECH App may not use them as values (see the note at the end).

All paths in "Source" lines are relative to the website repository root. A verbatim copy of those files is in `company/website/source/`.

**Branch.** Sections 1 to 9 describe the `main` branch only. An unmerged branch, `redesign-2026` (2026-08-24 and 2026-08-27), renames and adds many routes (legal pages, `/despre-noi`, `/expertiza`, service pages on SEO slugs, 10 articles) and removes the market-report stub. Section 10 describes it separately, for reference only. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. `main` is the current website. See also `history.md` section 4.

---

## 1. Summary

- **29 page files** under `app/`, which produce **211 pages**: 27 fixed routes, 178 product pages and 6 sector pages.
- **Framework routing:** Next.js App Router. Every folder with a `page.tsx` is a route.
- **Rendering:** 26 of the 29 page files start with `"use client"`. Only `app/produse/[id]/page.tsx` and `app/sectoare/[sector]/page.tsx` are server components, and `app/resurse/raport-piata/page.tsx` is an empty stub.
- **Page titles:** only `/produse` and `/produse/[id]` set their own `<title>`. Every other page shows the root title (section 5). The "Title" columns below give the page's visible H1 instead.
- **Site URL in the code:** `https://sovitech-website-gaidenic.vercel.app`, a Vercel preview-style domain. The contact emails use `sovitech.ro`. Which domain is live is not stated in the repo.

Source: `app/` folder listing, `app/layout.tsx`, `app/sitemap.ts`.

---

## 2. Route table

Legend: **In sitemap.xml** means listed in `app/sitemap.ts`. **Linked from** names where the site links to the route.

### 2.1 Main pages

| Path | Title RO (H1) | Title EN (H1) | In sitemap.xml | Linked from | Source |
|------|---------------|---------------|----------------|-------------|--------|
| `/` | "Construit să controleze orice clădire. Oriunde." | "Built to control every building. Everywhere." | yes (priority 1.0) | logo, breadcrumbs | `app/page.tsx` |
| `/servicii` | "Servicii complete. Rezultate garantate." | "Complete services. Guaranteed results." | yes | header, footer | `app/servicii/page.tsx` |
| `/servicii/proiectare` | "Proiectare BMS" | "BMS Design" | yes | service sub-page sidebars | `app/servicii/proiectare/page.tsx` |
| `/servicii/executie` | "Execuție & Implementare" | "Execution & Implementation" | yes | service sub-page sidebars | `app/servicii/executie/page.tsx` |
| `/servicii/integrare` | "Integrare Sisteme" | "System Integration" | yes | service sub-page sidebars | `app/servicii/integrare/page.tsx` |
| `/servicii/mentenanta` | "Mentenanță & Modernizare" | "Maintenance & Modernisation" | yes | service sub-page sidebars | `app/servicii/mentenanta/page.tsx` |
| `/produse` | "Gama completă SAUTER" | "Complete SAUTER Range" | yes | header, footer, home CTA | `app/produse/page.tsx`, `app/produse/layout.tsx` |
| `/produse/[id]` | product name (RO or EN) | product name | yes, all 178 | product cards, related products | `app/produse/[id]/page.tsx`, `components/product-detail.tsx` |
| `/sectoare` | "Expertiza BMS pentru fiecare industrie." | "BMS expertise for every industry." | yes | header, footer | `app/sectoare/page.tsx` |
| `/sectoare/[sector]` | sector hero headline | sector hero headline | yes, all 6 | header (4 of 6), `/sectoare` overview (all 6), home, related sectors | `app/sectoare/[sector]/page.tsx`, `app/sectoare/[sector]/sector-client.tsx` |
| `/calculator-roi` | "Cât poți economisi cu un BMS?" | "How much could you save with a BMS?" | yes | header (xl screens), footer, many CTAs | `app/calculator-roi/page.tsx` |
| `/cerere-oferta` | "Spune-ne despre proiectul tău" | "Tell us about your project" | yes | products page, product detail, `/servicii` packages, `/pricing` | `app/cerere-oferta/page.tsx` |
| `/contact` | "Sa vorbim." | "Let's talk." | yes | header CTA "Cerere ofertă", footer, most page CTAs (the most-linked route: 40 link occurrences in the code; next is `/resurse/referinte` with 17) | `app/contact/page.tsx` |
| `/pricing` | "Pachete de servicii BMS" | "BMS service packages" | **no** | only `/servicii/mentenanta` | `app/pricing/page.tsx` |

### 2.2 Resources ("Resurse")

| Path | Title RO (H1) | Title EN (H1) | In sitemap.xml | Linked from | Source |
|------|---------------|---------------|----------------|-------------|--------|
| `/resurse` | "Cele mai noi informatii despre automatizarea cladirilor." | "The latest on building automation." | yes | header, footer | `app/resurse/page.tsx` |
| `/resurse/referinte` | "Referințele noastre — cartea noastră de vizită." | "Our references — our calling card." | yes | header, footer, home marquee | `app/resurse/referinte/page.tsx` |
| `/resurse/raport-piata` | none (empty stub) | none | **no** | header, footer, resources page (3), home blog slider, home latest articles (7 link occurrences in the code) | `app/resurse/raport-piata/page.tsx` |
| `/resurse/articole/eficienta-bms` | "Cât de eficiente sunt sistemele BMS în reducerea costurilor energetice?" | "How effective are BMS systems at reducing energy costs?" | **no** | header, resources page, home blog slider, hotel article | `app/resurse/articole/eficienta-bms/page.tsx` |
| `/resurse/articole/optimizare-hotel-bms` | "Optimizarea performanței hoteliere prin automatizare și management energetic" | "Optimising hotel performance through automation and energy management" | **no** | resources page, home latest articles | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| `/resurse/studii-de-caz/therme-bucuresti` | "Therme București a redus costurile energetice cu 35% prin automatizare BMS" | "Therme Bucharest cut energy costs by 35% through BMS automation" | yes | resources page, case-study slider, references, home sliders and testimonials, guide resources page, hotel article, the other case study | `app/resurse/studii-de-caz/therme-bucuresti/page.tsx` |
| `/resurse/studii-de-caz/radisson-bucuresti` | "Cum a obținut Radisson Blu București certificarea BREEAM Excellent prin automatizare BMS integrată" | "How Radisson Blu Bucharest achieved BREEAM Excellent certification through integrated BMS automation" | yes | resources page, case-study slider, references, home sliders and testimonials, guide resources page, hotel article, the other case study | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` |

### 2.3 BMS guide funnel ("Ghid BMS")

None of these routes is in `sitemap.xml`.

| Path | Title RO (H1) | Title EN (H1) | Linked from | Source |
|------|---------------|---------------|-------------|--------|
| `/ghid-bms` | "Evaluați potențialul de automatizare al clădirii dumneavoastră" | "Assess Your Building's Automation Potential" | header, footer, resources page | `app/ghid-bms/page.tsx` |
| `/ghid-bms/descarca` | "Obțineți Ghidul Gratuit de Evaluare BMS" | "Get the Free BMS Evaluation Guide" | `/ghid-bms` | `app/ghid-bms/descarca/page.tsx` |
| `/ghid-bms/multumim` | "Mulțumim! Verificați Email-ul" | "Thank You! Check Your Email" | redirect after the download form | `app/ghid-bms/multumim/page.tsx` |
| `/ghid-bms/dashboard` | "Parcursul Tău BMS" | "Your BMS Journey" | `/ghid-bms/multumim`, quiz, calculator | `app/ghid-bms/dashboard/page.tsx` |
| `/ghid-bms/quiz` | "Evaluare Pregătire BMS" (result: "Evaluare Completată!") | "BMS Readiness Assessment" (result: "Assessment Completed!") | dashboard step list | `app/ghid-bms/quiz/page.tsx` |
| `/ghid-bms/calculator` | "Calculator ROI Personalizat" | "Personalised ROI Calculator" | dashboard, quiz result | `app/ghid-bms/calculator/page.tsx` |
| `/ghid-bms/case-studies` | "Studii de Caz Exclusive" | "Exclusive Case Studies" | dashboard, guide calculator | `app/ghid-bms/case-studies/page.tsx` |
| `/ghid-bms/resurse` | "Resurse Suplimentare BMS" | "Additional BMS Resources" | not found in any link | `app/ghid-bms/resurse/page.tsx` |

### 2.4 Generated files

| Path | What it is | Source |
|------|------------|--------|
| `/sitemap.xml` | 21 fixed URLs plus one URL per product (199 URLs) | `app/sitemap.ts` |
| `/robots.txt` | Allows all user agents on `/`, points to the sitemap | `app/robots.ts` |

---

## 3. What each page is for, and its main sections

Section names are the page's own H2 headings or code comments. Where a heading is bilingual, it is given as RO / EN.

### 3.1 `/` Home

**Purpose.** Company landing page: what SOVITECH does, which sectors it serves, proof points and the next step.
**Sections, in order:**
1. Hero on a full-bleed WebGL field (`HeroField`). Eyebrow "Building Management Systems". CTAs "Cerere ofertă gratuită" / "Request a free quote" (to `/contact`) and an arrow cell to `/calculator-roi`. Trust line "De încredere în 30+ proiecte BMS finalizate" / "Trusted across 30+ completed BMS projects".
2. Services showcase, "Ce facem" / "Servicii BMS complete" (`components/services-showcase.tsx`).
3. References marquee, "Proiecte de referință" (`components/references-marquee.tsx`).
4. "Sectoare Industriale" / "Industry Sectors": one pastel card per sector, linking to `/sectoare/<slug>`.
5. Stats band, "Impact măsurabil" (`components/stats-section.tsx`).
6. Partners marquee, "Parteneri de încredere" (`components/partners-marquee.tsx`).
7. About, "Soluții complete de automatizare BMS" / "Complete BMS Automation Solutions". The four team images are `/placeholder.svg`.
8. Case-study slider, "Povești de succes" (`components/case-study-slider.tsx`).
9. Blog slider, "Resurse & Articole" (`components/blog-slider.tsx`).
10. Testimonials band with a WebGL dot matrix (`components/aethel-testimonials.tsx`).
11. CTA band, "Gata pentru automatizare BMS?" / "Ready for BMS automation?".
12. Latest articles (`components/latest-articles.tsx`).

Source: `app/page.tsx` and the components named.

### 3.2 `/servicii` Services

**Purpose.** One page for the four service lines, the two service packages, an FAQ and testimonials.
**Sections:**
1. Hero.
2. Sticky tab bar: "Proiectare" / "Design", "Executie" / "Installation", "Integrare" / "Integration", "Mentenanta" / "Maintenance". The tab is React state only.
3. Per-tab content: heading, four process steps, a deliverables list and a journey indicator.
4. Packages: "Standard" and "Full Service", with included/excluded features. No prices. CTA "Cerere oferta".
5. Feature comparison table by category.
6. Additional services: "Structuri complexe", "Raportare avansata", "Add-on-uri disponibile".
7. CTA band "Blocheaza costurile de management BMS pentru 10 ani" / "Lock in your BMS management costs for 10 years".
8. FAQ, 5 questions.
9. Testimonials, "Ce spun clientii nostri".

**Note.** The header, the footer and the home services showcase link to `/servicii#proiectare`, `#executie`, `#integrare`, `#mentenanta` and `#consultanta`. The page has no elements with those ids and does not read the URL hash, so these links open the page at the top with the "Proiectare" tab selected. There is no "Consultanță" tab.

Source: `app/servicii/page.tsx`, `components/header.tsx`, `components/footer.tsx`.

### 3.3 `/servicii/proiectare`, `/executie`, `/integrare`, `/mentenanta`

**Purpose.** One detail page per service line. Each has a breadcrumb (Acasă / Servicii / service), a sidebar listing the four services, a hero image and a CTA.

**Reachability.** Only the four sub-pages link to each other. The header, footer, `/servicii` and the home services showcase link to `/servicii#...` instead, so a visitor reaches these pages only through `sitemap.xml`, search or a direct URL.

| Path | Main sections (RO / EN) | Source |
|------|-------------------------|--------|
| `/servicii/proiectare` | "Procesul de Proiectare" / "The Design Process"; "Impact și Beneficii"; "Ce include proiectarea BMS" / "What BMS design includes"; CTA "Pregătit să începi proiectul BMS?" | `app/servicii/proiectare/page.tsx` |
| `/servicii/executie` | "Procesul de Implementare"; "Impact și Beneficii"; "Parteneriat SAUTER" / "SAUTER Partnership"; CTA "Ai un proiect de implementare BMS?" | `app/servicii/executie/page.tsx` |
| `/servicii/integrare` | "Procesul de Integrare"; "Protocoale și Tehnologii" / "Protocols and Technologies"; "Impact și Beneficii"; CTA "Ai sisteme separate care nu comunică între ele?" | `app/servicii/integrare/page.tsx` |
| `/servicii/mentenanta` | "Tipuri de Service" / "Service Types"; "Cum Funcționează" / "How It Works"; stats; "Beneficiile Contractului de Mentenanță"; CTA "Protejează-ți investiția în sistemul BMS" with a link to `/pricing` | `app/servicii/mentenanta/page.tsx` |

The mentenanta sidebar shows a placeholder phone number, `+40 21 XXX XXXX`. Source: `app/servicii/mentenanta/page.tsx` line 185.

### 3.4 `/produse` Product catalogue

**Purpose.** Browse the SAUTER range that SOVITECH supplies.
**Sections:**
1. Hero, eyebrow "Partener autorizat SAUTER Elveția în România" / "Authorised SAUTER Partner in Romania", with three info cards: "Documentație tehnică", "Catalog complet de produse" (external link to the SAUTER 2026-2027 catalogue on Issuu) and "Oferte personalizate" (to `/cerere-oferta`).
2. Category filter chips: "Toate" / "All" plus the 8 categories. The filter resets to "all" when the language changes.
3. Product grid, 178 cards, each linking to `/produse/<id>`. On devices with a fine pointer, hovering shows a specs overlay.
4. CTA "Ai nevoie de consultanță tehnică?" / "Need technical consultancy?". Its two buttons, "Contactează un specialist" and "Descarcă catalog complet PDF", have no link or handler and do nothing (`app/produse/page.tsx` lines 270-276).

**Note.** The "Documentație tehnică" card says data sheets and manuals in PDF are available for each product in the details section. The product detail page shows no PDF or download link.

Source: `app/produse/page.tsx`, `components/product-detail.tsx`, `lib/product-data.ts`. The product data itself is described in `company/products/`.

### 3.5 `/produse/[id]` Product detail

**Purpose.** One page per SAUTER product card, built for search engines (code-first titles, JSON-LD).
**Sections:**
1. Breadcrumb "Produse" / category, H1 with the product name, the other-language name underneath.
2. Image panel and details: short description, a 4-row spec table ("Model", "Protocol / Semnal", "Gamă", "Alimentare"), "Caracteristici" / "Features", "Coduri de articol" / "Article codes".
3. "Din aceeași familie" / "From the same family": other products with the same `familyTitle`.
4. CTA "Ai nevoie de acest produs în proiectul tău?" to `/cerere-oferta`.

A spec value stored as `"NU ESTE SPECIFICAT"` renders as "Nu este specificat" / "Not specified".

Source: `app/produse/[id]/page.tsx`, `components/product-detail.tsx`.

### 3.6 `/sectoare` and `/sectoare/[sector]` Sectors

**`/sectoare` purpose.** Overview of the six sectors. Sections: hero, "Alege sectorul tau" / "Choose your sector" (one block per sector), CTA "Solutia BMS perfecta pentru industria ta". Source: `app/sectoare/page.tsx`.

**`/sectoare/[sector]` purpose.** One template page per sector, filled from `lib/sector-data.ts`. Sections:
1. Hero with an accent bar, breadcrumb "Toate sectoarele", badge, headline, sub-headline, 4 metric cells, CTAs "Vorbește cu un specialist" and "Calculează ROI".
2. "De încredere pentru" / "Trusted by" strip. The names are hard-coded in the component and are the same on every sector page: Globalworth, NEPI Rockcastle, One United Properties, Iulius Group, Palas Campus. None of them appears in the client list on `/resurse/referinte`.
3. "Capabilități": "Software premium, servicii premium." with a 6-card features grid.
4. "Ce livrăm": "Tot ce are nevoie clădirea ta." with a capabilities checklist and an image (`/placeholder.svg` for every sector).
5. Testimonial quote.
6. "Explorează industrii conexe": three related sectors.
7. CTA "Pregătit să-ți optimizezi clădirea?".

Source: `app/sectoare/[sector]/sector-client.tsx`, `lib/sector-data.ts`.

**The six sectors:**

| Slug | Title RO | Title EN | Subtitle RO | Hero headline RO / EN | Related | In header |
|------|----------|----------|-------------|------------------------|---------|-----------|
| `civil` | Birouri | Offices | Clădiri de birouri și spații comerciale | "Birouri mai inteligente. Echipe mai mulțumite." / "Smarter offices. Happier teams." | medical, retail, educational | yes, as "Civil & Birouri" |
| `medical` | Medical & Farma | Medical & Pharma | Spitale, clinici și producție farmaceutică | "Control de precizie. Conform prin design." / "Precision control. Compliant by design." | industrial, civil, educational | yes |
| `retail` | Retail | Retail | Centre comerciale, hipermarketuri și lanțuri de retail | "Confort mai bun. Trafic mai mare." / "Better comfort. Higher footfall." | horeca, civil, industrial | yes, as "Retail & HoReCa" |
| `horeca` | HoReCa & Wellness | HoReCa & Wellness | Hoteluri, restaurante și facilități de agrement | "Confort de cinci stele. Eficiență de patru stele." / "Five-star comfort. Four-star efficiency." | retail, civil, educational | no |
| `industrial` | Industrial | Industrial | Depozite, logistică și producție | "Scară industrială. Precizie inginerească." / "Industrial scale. Engineered precision." | medical, civil, retail | yes |
| `educational` | Educațional | Educational | Școli, universități și campusuri | "Spații sănătoase. Minți concentrate." / "Healthy spaces. Focused minds." | civil, medical, horeca | no |

Source: `lib/sector-data.ts`, `components/header.tsx`. The sector content is described in `company/business/sectors.md`.

### 3.7 `/resurse` Resources hub

**Purpose.** Editorial index of articles, case studies, tools and the guide.
**Sections:** masthead with category chips ("Recomandate", "Date & Analize", "Studii de caz", "Ghiduri tehnice", "Rapoarte de piata", "Toate articolele"); featured article (split card); latest 4-up row; dark guide band "Ghid BMS Gratuit"; case-study pull quote; tools band (Calculator ROI, Ghid BMS, Raport de piata, Proiecte & Referinte); archive list; explore footer with a newsletter form.

**Notes.**
- The category chips only change their own highlight. They do not filter anything.
- Of the five articles in the page data, only the first ("Optimizarea performantei hoteliere...") has a page, and it is shown in the latest row. The four archive rows link to `#`.
- All featured, latest and archive images are `/placeholder.svg`.
- The newsletter form calls `e.preventDefault()` and does nothing else.
- Links from the articles to `/resurse?category=data` and `/resurse?category=ghid` land on the unfiltered page; the page does not read query parameters.

Source: `app/resurse/page.tsx`, `app/resurse/articole/eficienta-bms/page.tsx` line 71, `app/resurse/articole/optimizare-hotel-bms/page.tsx` line 206.

### 3.8 `/resurse/referinte` References

**Purpose.** SOVITECH's client portfolio by category.
**Sections:** hero; "Impact măsurabil" (4 percentage metrics plus 3 aggregates); "Proiecte finalizate" (projects grouped into HORECA & Wellness, Birouri & Office, Medical & Farma, Industrial & Logistică, Retail & Shopping, Educație & Instituții, with "View case study" buttons where a case study exists); "Creștere prin încredere" (trust stats); CTA "Ai în minte un proiect de automatizare?".

A code comment says the portfolio is "sourced from sovitech.ro/referinte" and that sizes were "verified via web search where available". Project photos are placeholders.

Source: `app/resurse/referinte/page.tsx`. The portfolio is described in `company/business/`.

### 3.9 `/resurse/raport-piata` Market report

**Purpose.** Intended to be a market report. It is linked 7 times in the code (header, footer, resources page, home blog slider, home latest articles).
**State.** The file contains only a function whose body is the comment `// ... rest of code here ...`. It returns nothing, so the route should render only the header and footer around an empty main area (not checked by running the site).

Source: `app/resurse/raport-piata/page.tsx`.

### 3.10 Articles

| Path | Purpose | Main sections | Source |
|------|---------|---------------|--------|
| `/resurse/articole/eficienta-bms` | Data article on BMS energy savings. Sub-heading cites "150+ BMS projects implemented in Romania". | Breadcrumb; sidebar (category, author, share); "Perspectiva Sovitech Control"; "Ce spun datele non-biasate" / "What the unbiased data says" with 3 charts; "Concluzii"; disclaimer; "Ultimele articole" | `app/resurse/articole/eficienta-bms/page.tsx` |
| `/resurse/articole/optimizare-hotel-bms` | Guide on hotel automation. Sub-heading cites energy cost reductions of 25-65%. | Breadcrumb; sidebar with table of contents; "Nevoia de sisteme inteligente în hoteluri"; "Soluțiile BMS Sovitech pentru hoteluri"; "Radisson Blu București: un exemplu de ospitalitate sustenabilă"; "Economii energetice și benchmark-uri din industrie"; "Recomandări pentru implementarea BMS"; "KPI-uri pentru monitorizarea succesului"; "Concluzie"; CTA; related articles | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |

In both articles the "Distribuie" / "Share" block has four icon buttons (copy, LinkedIn, Twitter, Facebook) with no link or handler. They do nothing. Source: `app/resurse/articole/eficienta-bms/page.tsx` lines 102-113, `app/resurse/articole/optimizare-hotel-bms/page.tsx` lines 251-262.

### 3.11 Case studies

| Path | Purpose | Main sections | Source |
|------|---------|---------------|--------|
| `/resurse/studii-de-caz/therme-bucuresti` | Case study of the Therme București spa complex | Breadcrumb; hero with metrics card; sidebar; testimonial; "Provocarea"; "Soluția"; "Procesul de implementare" (timeline); "Rezultate & impact"; about the company; CTA; "Alte studii de caz" | `app/resurse/studii-de-caz/therme-bucuresti/page.tsx` |
| `/resurse/studii-de-caz/radisson-bucuresti` | Case study of the Radisson Blu hotel in Bucharest | Breadcrumb; hero; sidebar; "Despre Radisson Blu București"; "Provocarea"; testimonial; "Soluția: automatizare BMS Sovitech"; "Procesul de implementare"; "Rezultate și impact"; "De ce a ales Radisson Blu compania Sovitech"; "Beneficii cheie pentru facilitățile hoteliere"; conclusion; CTA; "Alte studii de caz" | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` |

Both pages have a "copy link" share button (`navigator.clipboard`). The case-study content is described in `company/business/case-studies/`.

### 3.12 `/ghid-bms` guide funnel

**Purpose.** A lead-capture funnel: landing page, download form, thank-you page, then a gamified "journey" dashboard with points, levels and badges that unlocks a quiz, a calculator and case studies.

| Path | What it does | Source |
|------|--------------|--------|
| `/ghid-bms` | Landing. Sections: hero; "Ce veți găsi în acest ghid"; "Cuprinsul ghidului"; CTA "Sunteți gata să vă evaluați clădirea?" | `app/ghid-bms/page.tsx` |
| `/ghid-bms/descarca` | Form: first name, last name, work email, phone, company, property type, role, a required consent checkbox and a newsletter checkbox. It promises a "Ghid PDF de 42 pagini". On submit it waits 1.5 s ("Simulate form submission") and redirects to `/ghid-bms/multumim`. Nothing is sent or stored. The consent text links to `/politica-confidentialitate`, which does not exist. | `app/ghid-bms/descarca/page.tsx` |
| `/ghid-bms/multumim` | Says the guide was sent by email ("Am trimis ghidul complet...") and offers an immediate download. No PDF exists in the repo. | `app/ghid-bms/multumim/page.tsx` |
| `/ghid-bms/dashboard` | Journey dashboard. Progress is hard-coded in a hook commented "Simulated user progress (in real app, fetch from backend/localStorage)". | `app/ghid-bms/dashboard/page.tsx` |
| `/ghid-bms/quiz` | 5-question readiness quiz (floor area, HVAC age, monthly energy spend, existing sensors, comfort complaints). Score = points / max points, then a level ("Excelent" at 75 or more, and lower levels below). | `app/ghid-bms/quiz/page.tsx` |
| `/ghid-bms/calculator` | Simple savings calculator with its own formula (see `tech-stack.md` section 8). | `app/ghid-bms/calculator/page.tsx` |
| `/ghid-bms/case-studies` | Three case-study cards (Therme București, Radisson Blu București, Rompharm Company) with a sector filter. Each "Citește Studiul Complet" button links to `/resurse/studii-de-caz/<id>` with the ids `therme`, `radisson` and `rompharm`. None of those routes exists (the real ones are `therme-bucuresti` and `radisson-bucuresti`), so all three buttons lead to a 404. | `app/ghid-bms/case-studies/page.tsx` line 159 |
| `/ghid-bms/resurse` | Tools, case studies, an article series and a questions CTA. | `app/ghid-bms/resurse/page.tsx` |

The funnel pages use the default shadcn look (semantic tokens, `font-bold`), not the brand recipe used on most other pages (see `tech-stack.md` section 3).

### 3.13 `/calculator-roi` ROI calculator

**Purpose.** A 6-step wizard that produces a savings and payback report.
**Steps:** "Industrie", "Situație", "Provocări", "Mentenanță", "Obiective", "Preferințe" (EN: Industry, Situation, Challenges, Maintenance, Goals, Preferences). Step 7 is the results report.
**Results report:** headline metrics, savings rows (energy and maintenance), year 1 / 3 / 5 tiles, CTAs, and actions "Descarcă PDF" (browser print, scoped to `#roi-report` by `app/globals.css`), share by WhatsApp, email and LinkedIn, and copy link. The shared link is the bare `/calculator-roi` URL, not the result.

The formula is in `lib/roi-calculator.ts`. Its problems for reuse are listed in `tech-stack.md` section 8.

Source: `app/calculator-roi/page.tsx`, `lib/roi-calculator.ts`, `app/globals.css`.

### 3.14 `/cerere-oferta` Offer request

**Purpose.** A 6-step request-for-quote wizard.

| Step | Label RO / EN | Fields | Required to continue |
|------|---------------|--------|----------------------|
| 1 | Industrie / Industry | Building type: "Birouri & Office", "HoReCa & Wellness", "Medical & Farma", "Retail & Shopping", "Industrial & Logistică", "Centru de date" | a choice |
| 2 | Proiect / Project | Project type ("Construcție nouă", "Retrofit / modernizare", "Upgrade sistem existent", "Extindere"); area slider 500-100.000 m², **default 5.000**; building count slider 1-50, default 1 | project type and area > 0 |
| 3 | Sisteme / Systems | HVAC, "Iluminat inteligent", "Control acces & securitate", "Monitorizare energie", "Automatizare camere", "Integrare sisteme de incendiu", "BMS / SCADA centralizat", "Altele" | at least one |
| 4 | Servicii / Services | Services ("Proiectare", "Execuție & instalare", "Integrare sisteme", "Mentenanță", "Consultanță"); start ("Imediat" to "În explorare"); budget band, optional ("sub 50.000 EUR" to "peste 500.000 EUR", "Nedecis") | at least one service and a start |
| 5 | Documentație / Documents | File picker (PDF, DWG, DOC/DOCX, XLS/XLSX, JPG, PNG; the label says "până la 20 MB fiecare"); free-text description | nothing |
| 6 | Contact | Name, company, email, phone | name and email |

**What happens on submit.** The final button ("Trimite cererea") sets `submitted` to true and shows "Cererea ta a fost trimisă" / "Your request has been sent" with a promise of a reply within 48 hours. No request is made and nothing is stored. The file picker keeps only the file names. The page also renders its own `<main>` inside the root layout's `<main>`.

Source: `app/cerere-oferta/page.tsx`.

### 3.15 `/contact` Contact

**Purpose.** Company contact details and a message form.
**Sections:**
1. Hero "Sa vorbim." / "Let's talk.".
2. "Venim la tine" / "We come to you": an OpenStreetMap embed that opens Google Maps at 44.43177, 26.07940, the hours ("Luni — Vineri: 09:00 – 18:00", weekend closed) and the address "SOVITECH CONTROL SRL, Str. Dr. Nicolae D. Staicovici, nr. 35, București, Sector 5, România".
3. "Contact direct": three department contacts (Tehnic, Vânzări, Media) with phone and email links.
4. "Trimite-ne o cerere" / "Send us a request": first name, last name, email, phone, subject ("Cerere oferta", "Consultanta BMS", "Suport tehnic", "Informatii produs", "Altele") and message.
5. CTA to `/calculator-roi`.

**What happens on submit.** The form has no `action`, no submit handler and no `name` attributes on its inputs. Submitting reloads `/contact` and sends nothing.

Source: `app/contact/page.tsx`. Contact data is recorded in `company/business/company-profile.md`.

### 3.16 `/pricing` Packages

**Purpose.** Three packages without prices: "Esențial" (up to 500 m²), "Profesional" (up to 5.000 m², marked "CEL MAI POPULAR"), "Enterprise" (unlimited area). Each CTA goes to `/cerere-oferta`. An FAQ with 3 questions follows.

These packages differ from the two on `/servicii` ("Standard" and "Full Service"). Source: `app/pricing/page.tsx`, `app/servicii/page.tsx`.

---

## 4. Header and footer

### 4.1 Header navigation

The header is a sticky white bar with the logo (`/logo.svg`), a desktop mega-menu (from the `lg` breakpoint), the RO/EN toggle, a "Calculator ROI" link (from `xl`), the CTA "Cerere ofertă" / "Request a quote" (to `/contact`, from `sm`), and a burger button below `lg` that opens a full-height drawer. The drawer closes on navigation and on Escape, and locks page scrolling while open.

Desktop order: **Servicii**, **Produse SAUTER** (plain link), **Sectoare**, **Resurse**.

| Group | Item RO | Item EN | Link | Description RO |
|-------|---------|---------|------|----------------|
| Servicii / Services | Servicii BMS Complete | Complete BMS Services | `/servicii` | Parcursul complet, de la consultanță la mentenanță |
| | Proiectare BMS | BMS Design | `/servicii#proiectare` | Proiectarea completă a sistemelor de automatizare |
| | Execuție Sisteme | System Installation | `/servicii#executie` | Implementare profesională a sistemelor BMS |
| | Integrare Sisteme | Systems Integration | `/servicii#integrare` | Integrare KNX, DALI, Modbus, M-Bus |
| (link) | Produse SAUTER | SAUTER Products | `/produse` | |
| Sectoare / Sectors | Toate Sectoarele | All Sectors | `/sectoare` | Expertiză BMS în toate industriile |
| | Civil & Birouri | Civil & Office | `/sectoare/civil` | Clădiri de birouri și spații comerciale |
| | Medical & Farma | Medical & Pharma | `/sectoare/medical` | Facilități medicale și producție farmaceutică |
| | Retail & HoReCa | Retail & HoReCa | `/sectoare/retail` | Magazine, hoteluri și restaurante |
| | Industrial | Industrial | `/sectoare/industrial` | Depozite industriale și producție |
| Resurse / Resources | Toate Resursele | All Resources | `/resurse` | Date, analize și ghiduri pentru profesioniști |
| | Eficienta BMS - Analiza Date | BMS Efficiency - Data Analysis | `/resurse/articole/eficienta-bms` | Cât de eficiente sunt sistemele BMS? |
| | Proiecte & Referințe | Projects & References | `/resurse/referinte` | Portofoliul nostru de proiecte BMS |
| | Ghid BMS Gratuit | Free BMS Guide | `/ghid-bms` | Evaluează potențialul clădirii tale |
| | Raport Piața BMS | BMS Market Report | `/resurse/raport-piata` | Analiza pieței de automatizare 2025 |

Notes:
- "Retail & HoReCa" links to `/sectoare/retail`. The `horeca` and `educational` sector pages are not in the header.
- The three `/servicii#...` anchors do not work (section 3.2).
- "Raport Piața BMS" leads to the empty stub (section 3.9).
- The mobile drawer shows the three groups, then "Produse SAUTER" and "Calculator ROI", then the "Cerere ofertă" button.

Source: `components/header.tsx` (`navGroups`, `produseLink`).

### 4.2 Footer

Dark footer (`#07201C`) with the white logo (`/logo-white.svg`), buttons "Contactează-ne" / "Contact Us" (to `/contact`) and "Calculator ROI", four link columns, and a bottom bar.

| Column RO / EN | Item RO | Item EN | Link |
|----------------|---------|---------|------|
| Servicii / Services | Proiectare BMS | BMS Design | `/servicii#proiectare` |
| | Execuție sisteme | System Installation | `/servicii#executie` |
| | Integrare sisteme | Systems Integration | `/servicii#integrare` |
| | Mentenanță BMS | BMS Maintenance | `/servicii#mentenanta` |
| | Consultanță | Consultancy | `/servicii#consultanta` |
| Resurse / Resources | Proiecte & referințe | Projects & References | `/resurse/referinte` |
| | Ghid BMS gratuit | Free BMS Guide | `/ghid-bms` |
| | Raport de piață BMS | BMS Market Report | `/resurse/raport-piata` |
| | Produse SAUTER | SAUTER Products | `/produse` |
| | Calculator ROI | ROI Calculator | `/calculator-roi` |
| Companie / Company | Despre noi | About Us | `/servicii` |
| | Sectoare | Sectors | `/sectoare` |
| | Contact | Contact | `/contact` |
| | Cariere | Careers | `/contact` |
| Legal | Politica de confidențialitate | Privacy Policy | `/contact` |
| | Termeni și condiții | Terms & Conditions | `/contact` |
| | Politica de cookie-uri | Cookie Policy | `/contact` |

Bottom bar: "Termeni · Confidențialitate · Setări cookie · © [current year] SOVITECH Control" (plain text, not links), plus LinkedIn and X icons that link to `https://linkedin.com` and `https://x.com`, not to company profiles.

Notes:
- There is no privacy policy, terms or cookie page. All three legal links, "Cariere" and "Despre noi" point to other pages.
- The site loads Vercel Analytics (`app/layout.tsx`) and shows no cookie banner. Whether that needs one is a legal question this repo does not answer.

Source: `components/footer.tsx`.

---

## 5. SEO metadata

| Where | Title | Description | Other | Source |
|-------|-------|-------------|-------|--------|
| Root (all pages unless overridden) | "Sovitech Control - Sisteme de automatizare si BMS" | "Sovitech Control ofera solutii complete pentru automatizare si Building Management Systems (BMS). Proiectare, executie si intretinere sisteme BMS cu tehnologie SAUTER din Elvetia." (no diacritics) | `metadataBase` `https://sovitech-website-gaidenic.vercel.app`; `generator: "v0.app"`; icons `/icon-light-32x32.png` (light scheme), `/icon-dark-32x32.png` (dark scheme), `/icon.svg`, Apple icon `/apple-icon.png`; `<html lang="ro">` | `app/layout.tsx` |
| `/produse` (layout) | "Produse SAUTER România — Catalog BMS \| Sovitech Control" | Catalogue description naming 7 of the 8 category groups (not "Alimentare & Accesorii") and "Partener autorizat SAUTER în România" | canonical `/produse` | `app/produse/layout.tsx` |
| `/produse/[id]` | `<code> — <name> \| SAUTER \| Sovitech Control` | `shortDesc` plus " Coduri: " and up to 3 article codes, cut to 160 characters | keywords (article codes, code with and without spaces, RO and EN names, family, category RO and EN, "SAUTER", "Sovitech", "BMS România"); canonical `/produse/<id>`; Open Graph title `SAUTER <code> — <name>`, description, image; JSON-LD `Product` | `app/produse/[id]/page.tsx` |

**JSON-LD on product pages.** `@type: Product`, `name` `SAUTER <code> — <name>`, `alternateName` (EN name), `sku` (first article code), `mpn` (the product code), `brand` SAUTER, `manufacturer` "Fr. Sauter AG", `description`, `image`, `category` (RO category).

**Gaps.**
- All other pages are client components, which cannot export `metadata`, so they all share the root title and description.
- There are no `hreflang` alternates and no English metadata. Search engines see Romanian only.
- `sitemap.xml` leaves out `/pricing`, `/ghid-bms/*`, both articles and `/resurse/raport-piata`.
- `sitemap.xml` sets `priority` and `changeFrequency` but no `lastModified`.

Source: `app/layout.tsx`, `app/produse/layout.tsx`, `app/produse/[id]/page.tsx`, `app/sitemap.ts`, `app/robots.ts`.

---

## 6. Language handling

- **Provider.** `LanguageProvider` wraps the whole site in `app/layout.tsx`. It holds `lang` (`"ro"` or `"en"`) in React state, starting at `"ro"`, and exposes `t(ro, en)`, which returns one of its two arguments.
- **Toggle.** A segmented "RO | EN" control in the header, visible at every width.
- **Not persisted.** The choice lives only in memory. A full page reload returns to Romanian. It is not in the URL, a cookie or `localStorage`.
- **`<html lang>` stays `"ro"`** in both languages.
- **Server-rendered text is Romanian.** Metadata and JSON-LD are built on the server and are always Romanian. The English text exists only after the visitor switches in the browser.

**Four patterns are used for bilingual text:**

| Pattern | Example | Where |
|---------|---------|-------|
| Inline pair | `t("Cerere ofertă", "Request a quote")` | Most pages and components |
| Paired fields in data | `labelRo` / `labelEn`, `nameEn`, `shortDescEn`, `featuresEn`, `specsEn` | `components/header.tsx`, `components/footer.tsx`, `lib/product-data.ts`, most page data arrays |
| Overlay with fallback | Sector data is English, with a `ro` block. `localizeSector(sector, lang)` swaps in the Romanian fields and falls back to English where one is missing. | `lib/sector-data.ts` |
| Per-page dictionary | `translations.ro` / `translations.en`, picked with `translations[lang]` | `app/resurse/page.tsx` |

Some code also branches directly on `lang === "ro"` (step labels in `app/calculator-roi/page.tsx`, categories in `app/produse/page.tsx`, labels in `components/stats-section.tsx`).

**Diacritics are inconsistent.** Some pages use full Romanian diacritics ("Cerere ofertă", "Mentenanță"); others do not ("Sa vorbim.", "Solicita o oferta personalizata", "Intrebari frecvente", the root meta description). `DESIGN-SYSTEM.md` section 10 says Romanian uses full diacritics.

Source: `lib/language-context.tsx`, `components/header.tsx`, the files named in the table, `DESIGN-SYSTEM.md`.

---

## 7. Dynamic routes and how they are generated

| Route | Parameter | Generated from | Count | Build-time | Unknown value | Rendering | Own metadata |
|-------|-----------|----------------|-------|------------|---------------|-----------|--------------|
| `/produse/[id]` | `id`, e.g. `tshk-621-643` | `products` in `lib/product-data.ts` via `generateStaticParams()` | 178 | yes, static | `notFound()` | Server page adds JSON-LD, then renders the client component `ProductDetail` | yes, `generateMetadata()` |
| `/sectoare/[sector]` | `sector`: `civil`, `medical`, `retail`, `horeca`, `industrial`, `educational` | `sectors` in `lib/sector-data.ts` via `generateStaticParams()` | 6 | yes, static | `notFound()` | Server page checks the slug, then renders the client component `SectorPageClient` so the RO/EN switch works | no, root title |

Both routes read `params` as a promise (`await params`), which is the Next.js 15+ convention.

**Product ids.** 178 unique ids. They are lower-case, hyphenated forms of the product code or family, for example `tshk-621-643`, `ycs-472-474`, `gzs-100-150`. Related products on a detail page are the other products with the same `familyTitle`.

**Products per category** (from `lib/product-data.ts`):

| Category RO | Category EN | Products |
|-------------|-------------|----------|
| Actuatori | Actuators | 85 |
| Senzori Ambient | Ambient Sensors | 23 |
| Gateway & Integrare | Gateway & Integration | 22 |
| Panouri Operare | Operating Panels | 17 |
| Senzori Presiune | Pressure Sensors | 13 |
| Controllere & PLC | Controllers & PLC | 11 |
| Software BMS | BMS Software | 6 |
| Alimentare & Accesorii | Power & Accessories | 1 |
| **Total** | | **178** |

The case-study pages (`/resurse/studii-de-caz/therme-bucuresti`, `/resurse/studii-de-caz/radisson-bucuresti`) and the articles are fixed folders, not dynamic routes. Three files build links to them from their own arrays: `components/case-study-slider.tsx` (slugs `therme-bucuresti`, `radisson-bucuresti`, correct), `app/resurse/referinte/page.tsx` (a `caseStudy` path per project) and `app/ghid-bms/case-studies/page.tsx` (ids `therme`, `radisson`, `rompharm`, which do not match any route).

Source: `app/produse/[id]/page.tsx`, `app/sectoare/[sector]/page.tsx`, `lib/product-data.ts`, `lib/sector-data.ts`.

---

## 8. Broken or placeholder links

| Link | Where | What happens | Source |
|------|-------|--------------|--------|
| `/servicii#proiectare`, `#executie`, `#integrare`, `#mentenanta`, `#consultanta` | header, footer, home services showcase | Opens `/servicii` at the top, "Proiectare" tab. No matching ids. | `components/header.tsx`, `components/footer.tsx`, `components/services-showcase.tsx`, `app/servicii/page.tsx` |
| `/resurse/raport-piata` | header, footer, resources page, home blog slider and latest articles | Empty page | `app/resurse/raport-piata/page.tsx`, `components/blog-slider.tsx` line 31, `components/latest-articles.tsx` line 44 |
| `/politica-confidentialitate` | guide download form | 404, no such route | `app/ghid-bms/descarca/page.tsx` line 223 |
| `/resurse/studii-de-caz/therme`, `/radisson`, `/rompharm` | guide case-studies page | 404, no such routes | `app/ghid-bms/case-studies/page.tsx` line 159 |
| `#` (4 archive articles) | resources page | Stays on the page | `app/resurse/page.tsx` |
| Legal links, "Cariere" | footer | Go to `/contact` | `components/footer.tsx` |
| LinkedIn, X | footer | Go to the networks' home pages | `components/footer.tsx` |
| Buttons "Contactează un specialist", "Descarcă catalog complet PDF" | `/produse` CTA | Do nothing (no href, no handler) | `app/produse/page.tsx` lines 270-276 |
| Share icon buttons (copy, LinkedIn, Twitter, Facebook) | both articles | Do nothing (no href, no handler) | `app/resurse/articole/eficienta-bms/page.tsx` lines 102-113, `app/resurse/articole/optimizare-hotel-bms/page.tsx` lines 251-262 |

---

## 9. Note for the SOVITECH App

- **Marketing figures are not data.** The routes above carry savings percentages, paybacks, ROI, CO2 figures, project counts, building sizes, room counts and testimonials. They are marketing copy, not verified engineering data and not an approved reference dataset. The app may not use any of them as a value, default, benchmark or example value unless SOVITECH delivers them as a versioned reference dataset and the approver approves it (`docs/guardrails.md` rule 1, section 2.1 and section 10).
- **The figures contradict each other.** Examples: 30+ completed projects (`app/page.tsx`, `app/resurse/referinte/page.tsx`) against "150+ BMS projects implemented in Romania" (`app/resurse/articole/eficienta-bms/page.tsx`, `app/resurse/page.tsx`); Therme savings of 35% (`app/resurse/studii-de-caz/therme-bucuresti/page.tsx`) against 38% (`app/resurse/page.tsx`, `app/servicii/page.tsx`); Radisson Blu with 424 rooms (`app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`) against 428 rooms (`app/ghid-bms/case-studies/page.tsx`).
- **Radisson Blu Bucharest is a website case study, and the app's mockups show it as the demo project.** Owner decision, 2026-09-24: the app's demo no longer uses the real hotel's name (working name "Demo Hotel Bucharest"). The mockups in `design/reference/` still show "Radisson Blu Bucharest". The app's demo data is fictional and must always be labelled as demo (`CLAUDE.md`, guardrails rule 10). See `company/business/case-studies/radisson-blu-bucuresti.md`, last section. Values from the website case study (rooms, halls, BREEAM rating, savings) must not appear in the demo as if they were facts about the building. They must also not be read as evidence: rule 1 says public facts about a named building are not a source.
- **The site's forms send nothing.** `/cerere-oferta` and `/ghid-bms/descarca` then show success; `/contact` just reloads (sections 3.12, 3.14, 3.15). The app must not copy that behaviour. Guardrails rule 12 requires saying what could not be done.

---

## 10. redesign-2026 branch routes (unmerged branch, not `main`)

> **Not `main`. Reference only. Not SOVITECH's current position.** Everything in this section comes from the branch `origin/redesign-2026` at commit `af81353` (2026-08-27), which has not been merged into `main`. Owner decision, 2026-09-24: the branch will not be merged, and `main` is the current website. Paths are relative to the website repository root on that branch. A verbatim copy of the files the branch adds or changes is in `company/website/source-redesign-2026/`. Sections 1 to 9 remain the description of `main`. Figures quoted here are marketing copy, like those on `main` (section 9).
>
> Contents: summary (10.1), old URLs that move (10.2), new routes (10.3), routes kept from `main` (10.4), header and footer (10.5), problems fixed or still there (10.6), **every route on the branch in one table (10.7)**, generated files (10.8) and links on the branch (10.9).

### 10.1 Summary

- **A route registry.** `lib/site-routes.ts` declares every URL of the editorial plan, each with a status: `published` (a page exists), `planned` (declared, not built) or `alias` (redirects). Only published entries get a page; a planned slug returns 404 (`dynamicParams = false` in `/ghid/[slug]`, `/resurse/[slug]`, `/instrumente/[slug]` and `/pentru/[slug]`). `app/sitemap.ts` and the hub pages read the same list. The hub pages (`components/section-hub.tsx`) show planned entries as unlinked text. `components/site-link.tsx` is written to do the same for links inside articles, but no page or component on the branch uses it: the articles use ordinary links, and each article lists the links it had to point elsewhere in a `// LINKS-TO-REACTIVATE:` comment (section 10.9).
- **Registry contents:** 6 guides (3 published, 3 planned), 48 resource entries (7 published articles, 6 published category archives, 35 planned articles), 8 role pages, 10 sector pages, 6 service pages, 8 tools (7 planned, 1 alias to `/calculator-roi`).
- **42 page files.** Counted from the files and the registry: 36 fixed routes, 178 product pages, 10 sector pages, 3 guides, 13 resource pages and 8 role pages, so 248 pages. Both commit messages report "252 pagini statice, fara erori". The difference was not investigated, because nothing was built. On `main`, 29 page files give 211 pages (section 1).
- **Unchanged from `main`:** `app/layout.tsx` (root title and description, `generator: "v0.app"`, the `*.vercel.app` `metadataBase`, Vercel Analytics), `app/robots.ts`, the language provider, and the product URLs. The product pages change only a little: spacing classes, titles and image alt text without the em dash (`${p.code} — ${p.name} | SAUTER | Sovitech Control` becomes `${p.code} ${p.name} | SAUTER | Sovitech Control`), and `components/product-detail.tsx` no longer shows the second-language product name under the H1.

Source: `lib/site-routes.ts`, `components/site-link.tsx`, `components/section-hub.tsx`, `app/sitemap.ts`, `app/produse/[id]/page.tsx`, file listing of `app/` on the branch.

### 10.2 Old URLs that move

`next.config.mjs` on the branch redirects these permanently (`permanent: true`):

| Old path on `main` | New path on the branch |
|--------------------|------------------------|
| `/sectoare` | `/expertiza` |
| `/sectoare/civil` | `/expertiza/cladiri-de-birouri` |
| `/sectoare/medical`, `/retail`, `/horeca`, `/industrial`, `/educational` | `/expertiza/<same slug>` |
| any other `/sectoare/...` | `/expertiza` |
| `/servicii/proiectare` | `/servicii/proiectare-automatizari-bms` |
| `/servicii/executie` | `/servicii/executie-sisteme-bms` |
| `/servicii/integrare` | `/servicii/integrare-sisteme-knx-dali-modbus-mbus` |
| `/servicii/mentenanta` | `/servicii/intretinere-sisteme-bms` |
| `/resurse/referinte` | `/referinte` |
| `/resurse/raport-piata` | `/resurse` (the stub page is deleted) |
| `/instrumente/calculator-economie-energie-bms` | `/calculator-roi` (registry alias) |

Source: `next.config.mjs` (branch).

### 10.3 New routes

| Path | Title (metadata) or H1 | Kind | In sitemap.xml | Source |
|------|------------------------|------|----------------|--------|
| `/despre-noi` | "Despre Sovitech Control: integrator BMS din 2017 \| Sovitech Control" | about page | yes | `app/despre-noi/page.tsx`, `app/despre-noi/layout.tsx` |
| `/referinte` | H1 "Referințele noastre sunt cartea noastră de vizită." | references (moved) | yes | `app/referinte/page.tsx` |
| `/termeni` | "Termeni si conditii de utilizare a site-ului \| Sovitech Control" | legal | yes | `app/termeni/page.tsx` |
| `/confidentialitate` | "Politica de confidentialitate \| Sovitech Control" | legal | yes | `app/confidentialitate/page.tsx` |
| `/cookies` | "Politica de cookies si preferinte \| Sovitech Control" | legal | yes | `app/cookies/page.tsx` |
| `/calculator-roi/metodologie` | "Cum calculăm estimarea ROI \| Sovitech Control" | calculator method page | yes | `app/calculator-roi/metodologie/page.tsx`, `components/roi-methodology.tsx` |
| `/expertiza` | H1 "Expertiza BMS pentru fiecare industrie." / "BMS expertise for every industry." (as on `main`'s `/sectoare`) | sector hub (was `/sectoare`) | yes | `app/expertiza/page.tsx` |
| `/expertiza/[sector]` | "`<title RO>` \| Sisteme BMS \| Sovitech Control" | 10 sector pages | yes | `app/expertiza/[sector]/page.tsx`, `sector-client.tsx` |
| `/servicii/proiectare-automatizari-bms` | "Proiectare BMS: lista de puncte, caiet de sarcini \| Sovitech Control" | service | yes | `app/servicii/proiectare-automatizari-bms/` |
| `/servicii/executie-sisteme-bms` | "Executie sisteme BMS: tablou, cablare, punere in functiune \| Sovitech" | service | yes | `app/servicii/executie-sisteme-bms/` |
| `/servicii/integrare-sisteme-knx-dali-modbus-mbus` | "Integrare KNX, DALI, Modbus, M-Bus in BMS \| Sovitech Control" | service | yes | `app/servicii/integrare-sisteme-knx-dali-modbus-mbus/` |
| `/servicii/intretinere-sisteme-bms` | "Intretinere BMS: contract, timpi de raspuns, 4-7% din valoarea sistemului pe an \| Sovitech" | service | yes | `app/servicii/intretinere-sisteme-bms/` |
| `/servicii/modernizare-sisteme-de-automatizare-si-bms` | "Modernizare BMS: 40-60% din costul unui sistem nou \| Sovitech" | service | yes | `app/servicii/modernizare-sisteme-de-automatizare-si-bms/` |
| `/servicii/consultanta` | "Consultanta BMS: compararea ofertelor si arhitectura \| Sovitech" | service (new; `main` had only a broken `#consultanta` anchor) | yes | `app/servicii/consultanta/` |
| `/ghid` | "Ghiduri BMS \| Sovitech Control" | guide hub | yes, once a guide is published | `app/ghid/page.tsx` |
| `/ghid/[slug]` | the article's own title | 3 guides | yes | `app/ghid/[slug]/page.tsx` |
| `/resurse/[slug]` | the article's own title, or the archive title | 7 articles and 6 category archives | yes | `app/resurse/[slug]/page.tsx` |
| `/instrumente` | "Instrumente BMS: caiet de sarcini, checklist, calculator \| Sovitech" | tool hub, `noindex` while no tool is published | no | `app/instrumente/page.tsx` |
| `/instrumente/[slug]` | none: no tool is published | none | no | `app/instrumente/[slug]/page.tsx` |
| `/pentru` | "Pentru rolul tău \| Sovitech Control" | role hub, `noindex` | no | `app/pentru/page.tsx` |
| `/pentru/[slug]` | "`<role RO>` \| Sovitech Control" | 8 role pages, `noindex` | no | `app/pentru/[slug]/page.tsx`, `components/role-page.tsx` |

The titles are quoted as written. Several have no diacritics.

**Published articles** (the ten drafts marked `draft: "drive"` in the registry, bodies in `components/articles/`):

| Path | Registry title RO | Article id |
|------|-------------------|------------|
| `/ghid/sisteme-bms-cladiri` | "Sistem BMS pentru clădiri: ghidul complet" | A01 |
| `/ghid/caiet-de-sarcini-bms` | "Caiet de sarcini pentru un sistem BMS" | A05 |
| `/ghid/date-esg-cladiri` | "De unde vin datele pentru raportarea ESG a unei clădiri" | A09 |
| `/resurse/obligatie-bacs-legea-372-2005` | "Obligația BACS: Legea 372/2005 și pragul de 290 kW" | A02 |
| `/resurse/scada-vs-bms` | "SCADA vs BMS: diferențe și când se folosește fiecare" | A03 |
| `/resurse/cost-sistem-bms` | "Cât costă un sistem BMS în România" | A04 |
| `/resurse/epbd-2024-romania` | "EPBD 2024: ce se schimbă pentru clădirile nerezidențiale din România" | A06 |
| `/resurse/ce-este-un-sistem-bms` | "Ce este un sistem BMS și cu ce nu trebuie confundat" | A07 |
| `/resurse/kpi-performanta-cladire` | "10 indicatori (KPI) pentru orice clădire comercială" | A08 |
| `/resurse/monitorizare-calitate-aer-epbd` | "Monitorizarea calității aerului interior: ce prevede EPBD" | A10 |

**Category archives** under `/resurse/`: `reglementari-conformare`, `esg-energie-raportare`, `performanta-cladirii`, `bms-scada-integrare`, `ghiduri-pe-sectoare`, `modernizare-retrofit`.

**Sectors** under `/expertiza/`: `cladiri-de-birouri` (data key `civil`), `horeca`, `retail`, `industrial`, `medical`, `educational`, `pharma`, `sport-si-wellness`, `entertainment`, `centre-de-date`. `pharma`, `sport-si-wellness`, `entertainment` and `centre-de-date` are new. The registry describes `centre-de-date` as "fără proiecte proprii încă" ("no delivered projects yet").

**Role pages** under `/pentru/`: `proprietari-si-investitori`, `property-asset-manager`, `facility-manager`, `director-tehnic`, `esg-sustenabilitate`, `manager-industrial-pharma`, `it-ot`, `proiectanti-antreprenori`.

Source: `lib/site-routes.ts`, the `layout.tsx` and `page.tsx` files named.

### 10.4 Routes kept from `main`

`/`, `/servicii`, `/produse`, `/produse/[id]`, `/calculator-roi`, `/cerere-oferta`, `/contact`, `/pricing`, `/resurse`, both old articles under `/resurse/articole/`, both case studies under `/resurse/studii-de-caz/`, and the 8 `/ghid-bms` pages. Most are restyled or rewritten (`company/website/source-redesign-2026/README.md` section 4 lists every changed file).

- `/pricing`, the two old articles, the two case studies and the `/ghid-bms` pages are **not** in the branch's `sitemap.xml`. A comment in `app/sitemap.ts` says legacy case studies and pre-launch articles stay unlisted "until they have real written content and covers".
- No literal link to `/pricing` or to `/resurse/articole/optimizare-hotel-bms` was found in the branch code. `/resurse/articole/eficienta-bms` is linked only from the hotel article.

### 10.5 Header and footer

**Header** (`components/header.tsx`):
- **Servicii**: "Servicii BMS Complete" (`/servicii`), then real links to the four service pages: "Proiectare BMS", "Execuție Sisteme", "Integrare Sisteme", "Întreținere BMS". The `/servicii#...` anchors are gone.
- **Produse SAUTER**: unchanged plain link to `/produse`.
- **Expertiză** (was "Sectoare"): "Toate Sectoarele" (`/expertiza`) plus 8 sectors: "Clădiri de birouri", "HORECA", "Sport & Wellness", "Pharma", "Medical", "Retail", "Industrial & Logistică", "Educație & Instituții". `entertainment` and `centre-de-date` are not in the header.
- **Resurse**: "Toate Resursele" (`/resurse`), "Proiecte & Referințe" (`/referinte`), "Ghiduri de referință" (`/ghid`), "Ghid BMS Gratuit" (`/ghid-bms`), "Reglementări & Conformare" (`/resurse/reglementari-conformare`). The links to the old article and the market report are gone.

**Footer** (`components/footer.tsx`):
- Servicii: the five service pages, including `/servicii/consultanta`.
- Resurse: `/referinte`, `/ghid-bms`, `/ghid`, `/produse`, `/calculator-roi`.
- Companie: "Despre noi" (`/despre-noi`), "Expertiză" (`/expertiza`), "Referințe" (`/referinte`), "Contact" (`/contact`). "Cariere" is removed.
- Legal: real links to `/confidentialitate`, `/termeni`, `/cookies`, repeated in the bottom bar.
- The first button reads "Cere o evaluare" / "Request an assessment" (was "Contactează-ne").
- A company block is added: "SOVITECH CONTROL SRL", address, CUI and trade-register number, phone, `office@sovitech.ro`, hours, and "Partener autorizat SAUTER din 2017". Company data belongs in `company/business/company-profile.md`. The branch spells the street "Niculae"; `main` spells it "Nicolae".
- The LinkedIn and X icons are removed. A code comment says a LinkedIn icon returns once the company page URL is known.

### 10.6 Problems from `main`: fixed or still there on the branch

| Problem on `main` (section) | On the branch |
|-----------------------------|---------------|
| Broken `/servicii#...` anchors (3.2, 8) | Fixed: header and footer link to the service pages |
| Service sub-pages reachable only by direct URL (3.3) | Fixed: linked from header and footer |
| Empty `/resurse/raport-piata` stub (3.9, 8) | Fixed: deleted, redirects to `/resurse` |
| No legal pages; legal links to `/contact` (4.2) | Fixed: `/termeni`, `/confidentialitate`, `/cookies` |
| Social icons to the networks' home pages (4.2, 8) | Fixed: removed |
| Guide case-study buttons to 404 ids (3.12, 8) | Fixed: they link to `/referinte` ("Vezi proiectul în referințe") |
| Only two routes set their own title (1, 5) | Partly fixed: new server pages and per-route layouts export metadata; the client pages kept from `main` still share the root title |
| `/politica-confidentialitate` link in the guide download form (3.12, 8) | **Still there**: `app/ghid-bms/descarca/page.tsx` line 223, although `/confidentialitate` now exists |
| `/contact` form sends nothing (3.15) | **Still there**: `<form className="space-y-6">` with no handler (`app/contact/page.tsx` line 163) |
| `/cerere-oferta` shows success without sending (3.14) | **Still there**: `setSubmitted(true)` with no request. The message now reads "Cererea a fost înregistrată" / "Your request has been registered". |
| `/ghid-bms/descarca` fakes the submission (3.12) | **Still there** |
| `/ghid-bms/resurse` has no inbound link (2.3) | **Still there** |
| No `hreflang`, language not persisted (5, 6) | **Still there**: `app/layout.tsx` and `lib/language-context.tsx` are unchanged |

### 10.7 Every route on the branch, compared with `main`

One row per page file (42 files, 248 pages). Legend for "Against `main`":
- **new**: no such URL on `main`;
- **moved**: the URL changed and git records the page file as renamed; the old URL redirects (10.2);
- **renamed slug**: the URL changed, the old page file was deleted and a new one written; the old URL redirects (10.2);
- **kept**: same URL, and the page file is modified unless the row says otherwise;
- **removed**: no page any more; the old URL redirects.

The H1 is quoted in Romanian from the branch code. Where the page file has no H1 of its own, the row gives the H1 from the shared component or the `<title>`, as marked. "Header / footer" says where the global navigation links to the route (10.5).

| Path | Against `main` | H1 on the branch (RO) | In sitemap.xml | Header / footer | Source |
|------|----------------|-----------------------|----------------|-----------------|--------|
| `/` | kept; H1 was "Construit să controleze orice clădire. Oriunde." | "Integrator independent de automatizare a clădirilor și BMS." | yes | logo | `app/page.tsx` |
| `/despre-noi` | new | "Sovitech Control: firmă de automatizare a clădirilor din București, înființată în 2017" | yes | footer | `app/despre-noi/page.tsx`, `app/despre-noi/layout.tsx` |
| `/contact` | kept; H1 was "Sa vorbim." | "Contact Sovitech Control: București, Str. Dr. Niculae D. Staicovici nr. 35" | yes | header CTA "Cerere ofertă"; footer "Cere o evaluare" and "Contact" | `app/contact/page.tsx` |
| `/cerere-oferta` | kept; H1 was "Spune-ne despre proiectul tău" | "Cerere de ofertă pentru un sistem BMS: șase pași și un răspuns în ziua lucrătoare următoare" | yes | no; linked from `/produse`, product pages, `/pricing`, the ROI method page and the role pages | `app/cerere-oferta/page.tsx` |
| `/termeni` | new | "Termeni și condiții de utilizare a site-ului Sovitech Control" | yes | footer, bottom bar | `app/termeni/page.tsx` |
| `/confidentialitate` | new | "Politica de confidențialitate a Sovitech Control" | yes | footer, bottom bar | `app/confidentialitate/page.tsx` |
| `/cookies` | new | "Politica de cookies a site-ului Sovitech Control" | yes | footer, bottom bar | `app/cookies/page.tsx` |
| `/servicii` | kept, rewritten; H1 was "Servicii complete. Rezultate garantate." A new layout sets the title "Servicii BMS: proiectare, executie, integrare, mentenanta \| Sovitech". | "Șase servicii BMS: proiectare, execuție, integrare, întreținere, modernizare, consultanță" | yes | header | `app/servicii/page.tsx`, `app/servicii/layout.tsx` |
| `/servicii/proiectare-automatizari-bms` | renamed slug; was `/servicii/proiectare` | "Proiectare automatizări și BMS: listă de puncte, caiet de sarcini, scheme de tablou" (component `ServiceHero`) | yes | header, footer | `app/servicii/proiectare-automatizari-bms/` |
| `/servicii/executie-sisteme-bms` | renamed slug; was `/servicii/executie` | "Execuție sisteme BMS: tablou, cablare, programe, HMI, punere în funcțiune, As-built" (`ServiceHero`) | yes | header, footer | `app/servicii/executie-sisteme-bms/` |
| `/servicii/integrare-sisteme-knx-dali-modbus-mbus` | renamed slug; was `/servicii/integrare` | "Integrare KNX, DALI, Modbus și M-Bus: echipamentele clădirii într-o singură supervizare" (`ServiceHero`) | yes | header, footer | `app/servicii/integrare-sisteme-knx-dali-modbus-mbus/` |
| `/servicii/intretinere-sisteme-bms` | renamed slug; was `/servicii/mentenanta` ("Mentenanță & Modernizare") | "Întreținere sisteme BMS: 4-7% pe an contract de bază, 7-12% contract extins" (`ServiceHero`) | yes | header, footer | `app/servicii/intretinere-sisteme-bms/` |
| `/servicii/modernizare-sisteme-de-automatizare-si-bms` | new; on `main`, modernisation shared the `/servicii/mentenanta` page | "Modernizare BMS: 40-60% din costul unui sistem nou, amortizare 3-6 ani" (`ServiceHero`) | yes | no; linked from `/servicii`, the other service pages and the articles | `app/servicii/modernizare-sisteme-de-automatizare-si-bms/` |
| `/servicii/consultanta` | new; `main` had only the broken footer anchor `/servicii#consultanta` | "Consultanță BMS: compararea a două oferte, verificarea pragului de 290 kW, arhitectură" (`ServiceHero`) | yes | footer | `app/servicii/consultanta/` |
| `/produse` | kept; H1 unchanged; the title's em dash becomes a pipe: "Produse SAUTER România \| Catalog BMS \| Sovitech Control" | "Gama completă SAUTER" | yes | header, footer | `app/produse/page.tsx`, `app/produse/layout.tsx` |
| `/produse/[id]` (178 pages) | kept; small changes (10.1) | the product name | yes, all 178 | no | `app/produse/[id]/page.tsx`, `components/product-detail.tsx` |
| `/expertiza` | moved; was `/sectoare` | "Expertiza BMS pentru fiecare industrie." | yes | header "Toate Sectoarele"; footer "Expertiză" | `app/expertiza/page.tsx` |
| `/expertiza/[sector]` (10 pages) | moved; was `/sectoare/[sector]` (6 pages). `civil` becomes `cladiri-de-birouri`; `pharma`, `sport-si-wellness`, `entertainment` and `centre-de-date` are new. | the sector's hero headline | yes, all 10 | header: 8 of 10 (not `entertainment` or `centre-de-date`) | `app/expertiza/[sector]/page.tsx`, `sector-client.tsx`, `lib/sector-data.ts` |
| `/calculator-roi` | kept; H1 was "Cât poți economisi cu un BMS?" | "Calculator de economie și amortizare: rezultate ca interval, cu domeniul declarat" | yes | header, footer | `app/calculator-roi/page.tsx` |
| `/calculator-roi/metodologie` | new | "Estimarea ta nu vine dintr-o formulă inventată de noi." (component `RoiMethodology`) | yes | no; linked from `/calculator-roi` and `/resurse` | `app/calculator-roi/metodologie/page.tsx`, `components/roi-methodology.tsx` |
| `/pricing` | kept; only spacing classes change | "Pachete de servicii BMS" | no, as on `main` | no; no inbound link found | `app/pricing/page.tsx` |
| `/resurse` | kept, rewritten; H1 was "Cele mai noi informatii despre automatizarea cladirilor." | "Resurse" | yes | header | `app/resurse/page.tsx` |
| `/resurse/[slug]` (13 pages) | new: 7 articles and 6 category archives (10.3) | the registry title (component `EntryShell` or `CategoryArchive`) | yes, all 13 | header: `/resurse/reglementari-conformare` only | `app/resurse/[slug]/page.tsx` |
| `/referinte` | moved; was `/resurse/referinte` | "Referințele noastre sunt cartea noastră de vizită." | yes | header; footer (two columns) | `app/referinte/page.tsx` |
| `/resurse/articole/eficienta-bms` | kept; H1 unchanged | "Cât de eficiente sunt sistemele BMS în reducerea costurilor energetice?" | no, as on `main` | no | `app/resurse/articole/eficienta-bms/page.tsx` |
| `/resurse/articole/optimizare-hotel-bms` | kept; H1 unchanged | "Optimizarea performanței hoteliere prin automatizare și management energetic" | no, as on `main` | no | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| `/resurse/studii-de-caz/therme-bucuresti` | kept; H1 was "Therme București a redus costurile energetice cu 35% prin automatizare BMS" | "Therme București: automatizare BMS pentru cel mai mare complex de wellness din Europa" | **no** (yes on `main`) | no | `app/resurse/studii-de-caz/therme-bucuresti/page.tsx` |
| `/resurse/studii-de-caz/radisson-bucuresti` | kept; H1 unchanged | "Cum a obținut Radisson Blu București certificarea BREEAM Excellent prin automatizare BMS integrată" | **no** (yes on `main`) | no | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` |
| `/resurse/raport-piata` | **removed**; redirects to `/resurse` | none | no | no | deleted: `app/resurse/raport-piata/page.tsx` |
| `/ghid` | new | "Ghidurile de referință pentru automatizarea clădirilor" (component `SectionHub`) | yes, because 3 guides are published | header, footer | `app/ghid/page.tsx` |
| `/ghid/[slug]` (3 pages) | new | the registry title (10.3) | yes, all 3 | no | `app/ghid/[slug]/page.tsx` |
| `/ghid-bms`, `/ghid-bms/descarca`, `/ghid-bms/multumim`, `/ghid-bms/dashboard`, `/ghid-bms/quiz`, `/ghid-bms/calculator`, `/ghid-bms/case-studies`, `/ghid-bms/resurse` (8 pages) | kept; small edits | unchanged from `main` (section 2.3) | no, as on `main` | `/ghid-bms` only, in header and footer | `app/ghid-bms/` |
| `/instrumente` | new; `noindex` while no tool is published | "Opt instrumente pentru specificare, audit și estimare de buget" (`SectionHub`) | no | no; no inbound link found | `app/instrumente/page.tsx` |
| `/instrumente/[slug]` | new; builds no page, because the 7 tools are planned and the eighth is an alias | none | no | no | `app/instrumente/[slug]/page.tsx` |
| `/pentru` | new; `noindex` | "Aceeași clădire, opt întrebări diferite" (`SectionHub`) | no | no; linked from the role pages | `app/pentru/page.tsx` |
| `/pentru/[slug]` (8 pages) | new; `noindex` | the role name, for example "Director tehnic / Inginer-șef" (component `RolePage`) | no | no | `app/pentru/[slug]/page.tsx`, `components/role-page.tsx`, `lib/role-copy.ts` |

**URLs that only redirect:** the 15 old paths in 10.2, including the registry alias `/instrumente/calculator-economie-energie-bms`.

**Summary of the change against `main`:** of the 42 page files, 14 are new, 3 are moved, 4 carry a new service slug and 21 are kept at the same URL (home, `/contact`, `/cerere-oferta`, `/servicii`, `/produse`, `/produse/[id]`, `/calculator-roi`, `/pricing`, `/resurse`, the two old articles, the two case studies and the 8 `/ghid-bms` pages). One route is removed: `/resurse/raport-piata`. Source: `git diff --name-status -M main origin/redesign-2026 -- app`, the files named.

### 10.8 Generated files on the branch

| Path | Against `main` | Content | Source |
|------|----------------|---------|--------|
| `/sitemap.xml` | changed | 14 fixed URLs (`/`, `/servicii`, `/produse`, `/expertiza`, `/contact`, `/despre-noi`, the 3 legal pages, `/cerere-oferta`, `/calculator-roi`, `/calculator-roi/metodologie`, `/resurse`, `/referinte`), plus `/ghid` because a guide is published, plus 32 registry URLs (3 guides, 13 resource pages, 10 sectors, 6 services), plus 178 products: **225 URLs** (199 on `main`). Role pages and `/instrumente` are left out; so are `/pricing`, the guide funnel, the two old articles and the two case studies. The base URL is still `https://sovitech-website-gaidenic.vercel.app`. | `app/sitemap.ts`, `lib/site-routes.ts` |
| `/robots.txt` | unchanged | as on `main` (section 2.4) | `app/robots.ts` |

### 10.9 Links on the branch

Counted as for `main` in section 2: every literal internal link in `app/`, `components/` and `lib/` (for example `href="/contact"`), read as text. This method gives 40 for `/contact` on `main`, the figure in section 2.1. Links that pages build at runtime from the route registry (hub pages, category archives, article cards, sector lists) are not in these counts.

- **Most linked:** `/contact` with 65 occurrences (40 on `main`), then `/referinte` with 23 (17 for `/resurse/referinte` on `main`), `/resurse/bms-scada-integrare` with 15, and `/calculator-roi`, `/servicii/intretinere-sisteme-bms` and `/servicii/modernizare-sisteme-de-automatizare-si-bms` with 13 each.
- **Links to a missing route:** only `/politica-confidentialitate` in `app/ghid-bms/descarca/page.tsx` (10.6). No link on the branch uses one of the old URLs that now redirect.
- **No inbound link found:** `/pricing`, `/instrumente`, `/ghid-bms/resurse` and `/resurse/articole/optimizare-hotel-bms`.
- **Reachable only from unlisted pages:** `/resurse/articole/eficienta-bms` is linked only from the hotel article. The two case studies are linked only from the two old articles and from each other. On `main` the home page showed them through `components/case-study-slider.tsx` and `components/aethel-testimonials.tsx`; on the branch both components are still in the repo, but no page uses them. This matches the commit message: case studies and articles "without real content" are removed from the listings.
- **Role pages:** `/pentru` is linked only from the role pages. Three role pages are linked from service pages: `/pentru/director-tehnic` from the design page, `/pentru/facility-manager` from the maintenance page and `/pentru/it-ot` from the integration page.
- **Links inside the ten articles.** `components/site-link.tsx` is not used. The articles link directly to published pages. When the page they mean is still planned, they link to an interim target instead, and a `// LINKS-TO-REACTIVATE:` comment at the top of each of the 10 article files records the anchor text, the interim target and the final one. The interim target is a category archive under `/resurse/`, `/contact`, or no link. For example, `components/articles/cost-sistem-bms.tsx` sends its link on protocols and integration to `/resurse/bms-scada-integrare` until `/ghid/protocoale-automatizarea-cladirilor` exists.
- **Outbound links:** the articles and the ROI method page cite external sources, for example `eur-lex.europa.eu` and `legislatie.just.ro`. These are links only; the external resources a page loads are the same as on `main` (`tech-stack.md` section 12.5).

Source: the files named; `grep` for `CaseStudySlider`, `AethelTestimonials`, `SiteLink` and `LINKS-TO-REACTIVATE` on the branch.
