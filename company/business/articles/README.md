# Articles and resources on the SOVITECH website

This folder holds the articles from the SOVITECH website repository, one Markdown file per article, with their covers and diagrams. Content comes from two places in that repository, and this README keeps them apart:

- **Main branch** (`main`, commit `e0806142735dbdd53b913af30102f9227b380475`, 2026-08-11). Two articles, in English and Romanian. This is the content the first import covered. See Part 1.
- **Unmerged branch `redesign-2026`** (commit `d2d15d2` of 2026-08-24 for the text, commit `af81353` of 2026-08-27 for the covers and diagrams). Ten new articles, in Romanian only. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. Its articles are kept for reference only. `main` is the current website. See Part 2.

All figures in these articles are website marketing copy. They are not verified engineering data and not an approved reference dataset, and the app may not use them as values or benchmarks (guardrails rule 1, section 2.1, section 10). Laws, thresholds and standards quoted in the articles are the authors' reading on a given date; the app takes them only from approved reference data (rule 11). See "Regulatory statements in the articles" below. "Reserved terms in the branch articles" lists the sentences the app's reserved-term check would flag if the app reused them.

## Files in this folder

| File or folder | Source | What it holds |
|----------------|--------|---------------|
| `eficienta-bms.md` | main | „Cât de eficiente sunt sistemele BMS în reducerea costurilor energetice?” / "How effective are BMS systems at reducing energy costs?", RO and EN |
| `optimizare-hotel-bms.md` | main | „Optimizarea performanței hoteliere prin automatizare și management energetic” / "Optimising hotel performance through automation and energy management", RO and EN |
| `sisteme-bms-cladiri.md` | redesign-2026 branch | A01 „Sistem BMS pentru clădiri: ghidul complet” / "BMS systems for buildings: the complete guide", RO text only |
| `caiet-de-sarcini-bms.md` | redesign-2026 branch | A05 „Caiet de sarcini pentru un sistem BMS” / "Technical specification for a BMS system", RO text only |
| `date-esg-cladiri.md` | redesign-2026 branch | A09 „De unde vin datele pentru raportarea ESG a unei clădiri” / "Where a building's ESG reporting data comes from", RO text only |
| `obligatie-bacs-legea-372-2005.md` | redesign-2026 branch | A02 „Obligația BACS: Legea 372/2005 și pragul de 290 kW” / "The BACS obligation: Law 372/2005 and the 290 kW threshold", RO text only |
| `scada-vs-bms.md` | redesign-2026 branch | A03 „SCADA vs BMS: diferențe și când se folosește fiecare” / "SCADA vs BMS: the differences and when to use each", RO text only |
| `cost-sistem-bms.md` | redesign-2026 branch | A04 „Cât costă un sistem BMS în România” / "What a BMS system costs in Romania", RO text only |
| `epbd-2024-romania.md` | redesign-2026 branch | A06 „EPBD 2024: ce se schimbă pentru clădirile nerezidențiale din România” / "EPBD 2024: what changes for non-residential buildings in Romania", RO text only |
| `ce-este-un-sistem-bms.md` | redesign-2026 branch | A07 „Ce este un sistem BMS și cu ce nu trebuie confundat” / "What a BMS system is, and what it is not", RO text only |
| `kpi-performanta-cladire.md` | redesign-2026 branch | A08 „10 indicatori (KPI) pentru orice clădire comercială” / "10 KPIs every commercial building should track", RO text only |
| `monitorizare-calitate-aer-epbd.md` | redesign-2026 branch | A10 „Monitorizarea calității aerului interior: ce prevede EPBD” / "Indoor air quality monitoring: what EPBD requires", RO text only |
| `covers/` | redesign-2026 branch | The 10 article covers, byte-for-byte copies of `public/coperti/*.jpg` (1920x1080 JPEG) |
| `diagrams/` | redesign-2026 branch | The 15 article diagrams, byte-for-byte copies of `public/diagrame/*.jpg` (1200x1200 JPEG) |

The two case studies are in `../case-studies/`: `radisson-blu-bucuresti.md` and `therme-bucuresti.md`.

## Part 1. Main-branch articles

Source: `main` at commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11). Paths are relative to the website repository root: `app/resurse/page.tsx`, `app/resurse/articole/*/page.tsx`, `app/resurse/raport-piata/page.tsx`, `components/latest-articles.tsx`, `components/blog-slider.tsx`, `components/case-study-slider.tsx`.

### The two main-branch articles

| File | Route (slug) | Title RO / EN | Topic (category RO / EN) | Date | Read time | Author | Cover (hero image) |
|------|--------------|---------------|--------------------------|------|-----------|--------|--------------------|
| [`eficienta-bms.md`](eficienta-bms.md) | `/resurse/articole/eficienta-bms` | „Cât de eficiente sunt sistemele BMS în reducerea costurilor energetice?” / "How effective are BMS systems at reducing energy costs?" | Date & Analiză / Data & Analysis | 15 Jan 2026 | 12 min | Andrei Popescu, Technical Director, Sovitech | `/modern-building-automation-dashboard-with-energy-c.jpg`; copy in [`../../brand/imagery/dashboards-and-diagrams/`](../../brand/imagery/dashboards-and-diagrams/modern-building-automation-dashboard-with-energy-c.jpg) |
| [`optimizare-hotel-bms.md`](optimizare-hotel-bms.md) | `/resurse/articole/optimizare-hotel-bms` | „Optimizarea performanței hoteliere prin automatizare și management energetic” / "Optimising hotel performance through automation and energy management" | Ghid Tehnic / Technical Guide | 20 Feb 2026 | 18 min | Andrei Popescu, Technical Director, Sovitech | `/luxury-hotel-lobby-modern-interior.jpg`; copy in [`../../brand/imagery/client-building-illustrations/`](../../brand/imagery/client-building-illustrations/luxury-hotel-lobby-modern-interior.jpg) |

The hero images are generic site pictures, described in `../../brand/imagery/README.md`, not article covers. They are not duplicated in this folder.

### Every item the main-branch site links to, and whether it exists

Source: `app/resurse/page.tsx` (translations `secondary`, `articles`, `featured`, `toolItems`), `components/latest-articles.tsx`, `components/blog-slider.tsx`.

| # | Title RO (as on the resources page) | Title EN | Category | Date | Read time | Link | Status |
|---|-------------------------------------|----------|----------|------|-----------|------|--------|
| 1 | Cat de eficiente sunt sistemele BMS in reducerea costurilor de energie? | How efficient are BMS systems at reducing energy costs? | Date & Analize / Data & Analysis | 15 IAN 2026 | 12 min | `/resurse/articole/eficienta-bms` | Full page. See `eficienta-bms.md`. |
| 2 | Cum a redus Therme Bucuresti costurile cu 38% | How Therme Bucharest cut costs by 38% | Studiu de caz / Case Study | 20 DEC 2025 | 8 min | `/resurse/studii-de-caz/therme-bucuresti` | Full page. See `../case-studies/therme-bucuresti.md`. The page headline says 35%, not 38%. |
| 3 | Radisson Blu Bucuresti: automatizare hotel 5 stele | Radisson Blu Bucharest: 5-star hotel automation | Studiu de caz / Case Study | 5 DEC 2025 | 7 min | `/resurse/studii-de-caz/radisson-bucuresti` | Full page. See `../case-studies/radisson-blu-bucuresti.md`. |
| 4 | Piata BMS din Romania: Tendinte si Previziuni 2026 | The Romanian BMS Market: Trends and Forecasts 2026 | Raport de piata / Market Report | 10 DEC 2025 | 10 min | `/resurse/raport-piata` | **Stub.** No content. See below. |
| 5 | Optimizarea performantei hoteliere prin automatizare si management energetic | Optimising hotel performance through automation and energy management | Ghid tehnic / Technical Guide | 20 FEB 2026 | 18 min | `/resurse/articole/optimizare-hotel-bms` | Full page. See `optimizare-hotel-bms.md`. |
| 6 | Integrarea protocoalelor BACnet si KNX: Ghid complet 2026 | Integrating BACnet and KNX protocols: Complete guide 2026 | Ghid tehnic / Technical Guide | 15 DEC 2025 | 15 min | `#` | Listed only. No page exists. |
| 7 | ROI in automatizarea BMS: Ce arata datele din 150 de proiecte | ROI in BMS automation: What the data from 150 projects shows | Date & Analize / Data & Analysis | 28 NOV 2025 | 11 min | `#` | Listed only. No page exists. |
| 8 | Alegerea senzorilor potriviti pentru proiectul tau BMS | Choosing the right sensors for your BMS project | Ghid tehnic / Technical Guide | 20 NOV 2025 | 9 min | `#` | Listed only. No page exists. |
| 9 | Conformitatea EPBD in 2026: Ce trebuie sa stie proprietarii de cladiri | EPBD compliance in 2026: What building owners need to know | Date & Analize / Data & Analysis | 10 NOV 2025 | 8 min | `#` | Listed only. No page exists. |

In EN the page formats dates as "JAN 15, 2026" and read times as "12 MIN READ"; in RO as "15 IAN 2026" and "12 MIN CITIRE".

Descriptions shown in the archive list (RO without diacritics, as in the source):

| # | RO | EN |
|---|----|----|
| 1 | Analiza datelor din 150+ proiecte BMS implementate in Romania arata economii semnificative — dar rezultatele variaza in functie de sector si complexitate. | Analysis of data from 150+ BMS projects implemented in Romania shows significant savings — but results vary depending on sector and complexity. |
| 5 | Cum pot hotelurile moderne sa reduca costurile cu energia cu 25-65% mentinand confortul oaspetilor. | How modern hotels can reduce energy costs by 25-65% while maintaining guest comfort. |
| 6 | Tot ce trebuie sa stii despre integrarea celor mai populare protocoale de automatizare. | Everything you need to know about integrating the most popular automation protocols. |
| 7 | Analiza detaliata a perioadelor de amortizare si a randamentului investitiei pentru sistemele BMS. | Detailed analysis of payback periods and return on investment for BMS systems. |
| 8 | Ghid complet pentru selectarea senzorilor de temperatura, umiditate si calitate a aerului. | Complete guide to selecting temperature, humidity and air quality sensors. |
| 9 | Cerinte obligatorii si cum te poate ajuta un BMS sa le indeplinesti in avans. | Mandatory requirements and how a BMS can help you meet them ahead of time. |

Items 6 and 4 also appear with slightly different titles on other pages: `app/resurse/articole/eficienta-bms/page.tsx` lists "Integrarea protocoalelor BACnet și KNX: Ghid complet 2026" and "Piața BMS din România: Tendințe și previziuni 2026" (category "Analiză Piață" / "Market Analysis"), both linking to `#`.

### The resources index page on main (`/resurse`)

Source: `app/resurse/page.tsx`. The Romanian strings on this page are mostly written without diacritics in the source. They are kept as written.

| Element | RO | EN |
|---------|----|----|
| Eyebrow | • Resurse | • Resources |
| H1 | Cele mai noi informatii despre automatizarea cladirilor. | The latest on building automation. |
| Sub | Date, analize, studii de caz si ghiduri tehnice pentru profesionistii BMS. | Data, analysis, case studies and technical guides for BMS professionals. |
| Filter chips (with counts) | Recomandate; Date & Analize 12; Studii de caz 8; Ghiduri tehnice 15; Rapoarte de piata 4; Toate articolele | Featured; Data & Analysis 12; Case Studies 8; Technical Guides 15; Market Reports 4; All Articles |
| Latest row label | • ULTIMELE ARTICOLE | • LATEST ARTICLES |
| Guide band | • GHID BMS; "Ghid BMS Gratuit"; "Evalueaza potentialul cladirii tale"; button "Descarca ghidul" (→ `/ghid-bms`) | • BMS GUIDE; "Free BMS Guide"; "Assess the potential of your building"; "Download the guide" |
| Case-study band | • STUDIU DE CAZ; quote "Sovitech Control a implementat un sistem BMS complet pentru complexul nostru. Automatizarea HVAC și managementul energetic au redus consumul cu 35%."; link card to the Therme case study with the "38%" title | • CASE STUDY; "Sovitech Control implemented a full BMS system for our complex. HVAC automation and energy management reduced our consumption by 35%." |
| Tools band | • UNELTE: Calculator ROI (→ `/calculator-roi`, "Cât poți economisi cu un BMS?"); Ghid BMS (→ `/ghid-bms`, "Evalueaza potentialul cladirii tale"); Raport de piata (→ `/resurse/raport-piata`, "Analiza pietei de automatizare 2025"); Proiecte & Referinte (→ `/resurse/referinte`, "Portofoliul nostru de proiecte BMS") | • TOOLS: ROI Calculator ("How much could you save with a BMS?"); BMS Guide ("Assess the potential of your building"); Market Report ("Automation market analysis 2025"); Projects & References ("Our portfolio of BMS projects") |
| Archive label and button | • TOATE ARTICOLELE; "Mai multe articole" | • ALL ARTICLES; "View more articles" |
| Explore footer | EXPLOREAZA PE CATEGORII: Toate articolele, Date & Analize, Studii de caz, Ghiduri tehnice, Rapoarte de piata. GHIDURI PE SECTOR: Civil & Birouri, Medical & Farma, Retail & HORECA, Industrial, Centre de Date, Infrastructura. UNELTE (as above). | EXPLORE BY CATEGORY: All articles, Data & Analysis, Case Studies, Technical Guides, Market Reports. SECTOR GUIDES: Civil & Office, Medical & Pharma, Retail & HORECA, Industrial, Data Centres, Infrastructure. TOOLS. |
| Newsletter | NEWSLETTER; "Ramai inaintea industriei"; "Analize lunare, studii de caz si ghiduri tehnice direct in inbox-ul tau."; placeholder "Adresa ta de email"; button "Aboneaza-te" | NEWSLETTER; "Stay ahead of the industry"; "Monthly analyses, case studies and technical guides straight to your inbox."; "Your email address"; "Subscribe" |

What the page does not do:
- **Counts.** The chip counts (12, 8, 15, 4) do not match the content: one data article, two case studies, one technical guide and no market report exist as pages.
- **Filters.** The chips change their own highlight only. They do not filter anything. The article pages link to `/resurse?category=data` and `/resurse?category=ghid`, but the page does not read the query.
- **Links.** "Mai multe articole" / "View more articles" has no action. Category and sector-guide links point to `#`.
- **Newsletter.** The form's submit handler only calls `preventDefault()`. No address is stored or sent.
- **Images.** Every image on the page is `/placeholder.svg`. The featured author photo is `/placeholder-user.jpg`.

### Homepage components on main that list articles

| Component | What it shows |
|-----------|---------------|
| `components/latest-articles.tsx` | "• ULTIMELE ARTICOLE" / "• LATEST ARTICLES": items 2, 3, 4 and 5 above, with placeholder images. |
| `components/blog-slider.tsx` | "• Educație" / "• Education", "Resurse & Articole" / "Resources & Articles". Four cards, all visible at once, so the "Articole anterioare" / "Previous articles" and "Articole următoare" / "Next articles" arrows never show. Link "Vezi toate resursele" / "View all resources" (→ `/resurse`). The cards are listed below. |
| `components/case-study-slider.tsx` | "• Studii de caz" / "• Case studies", "Povești de succes" / "Success stories": Therme, Radisson and Rompharm slides. Recorded in `../case-studies/` and `../references.md`. |

Cards in `components/blog-slider.tsx`, with the titles as written there:

| # | Title RO | Title EN | Category RO / EN | Date | Read time | Link |
|---|----------|----------|------------------|------|-----------|------|
| 1 | Cât de eficiente sunt sistemele BMS la reducerea costurilor? | How efficient are BMS systems at reducing costs? | Date & Analiză / Data & Analysis | 15 IAN 2026 | 12 MIN | `/resurse/articole/eficienta-bms` |
| 2 | Piața BMS din România: tendințe și previziuni 2026 | The Romanian BMS Market: Trends and Forecasts 2026 | Raport de piață / Market Report | 10 DEC 2025 | 10 MIN | `/resurse/raport-piata` |
| 3 | Cum a redus Therme București costurile cu 38% | How Therme Bucharest cut costs by 38% | Studii de Caz / Case Studies | 20 DEC 2025 | 8 MIN | `/resurse/studii-de-caz/therme-bucuresti` |
| 4 | Radisson Blu București: automatizare de hotel 5 stele | Radisson Blu Bucharest: 5-star hotel automation | Studii de Caz / Case Studies | 5 DEC 2025 | 7 MIN | `/resurse/studii-de-caz/radisson-bucuresti` |

The cards render the title and category only. The date and read time are in the data but not shown.

### Notes on the main-branch articles

- **Author.** Both real articles carry the byline "Andrei Popescu", "Director Tehnic, Sovitech" / "Technical Director, Sovitech", with the photo `/professional-male-engineer-headshot.jpg`. The same name is used for the Offices testimonial in `lib/sector-data.ts`, and the same photo for a Therme technical director in `app/servicii/page.tsx`. The repo does not show whether Andrei Popescu is a real SOVITECH employee. The unmerged branch replaces this byline (see Part 2, "What the branch changes in the main-branch articles").
- **Dates.** Listing dates run from 10 Nov 2025 to 20 Feb 2026. The repo's first commit ("Initial commit: import v0 project") is dated 2026-07-07, after all of them, so the repo cannot show when the articles were first published.
- **No text addressed to an AI** was found in these files.

## Part 2. Branch articles (`redesign-2026`, unmerged)

> **Unmerged branch content.** Everything in this part comes from the branch `origin/redesign-2026`: commit `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala") for the text and commit `af81353` (2026-08-27, "Materiale vizuale noi: 10 coperti si 15 diagrame") for the covers and diagrams. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. Everything here is kept for reference only.

Sources (paths relative to the website repository root): `components/articles/*.tsx` (ten article bodies, plus `index.ts`, which is the registry of the ten and not an article), `lib/site-routes.ts` (titles, leads, categories, status), `lib/article-cards.ts` (card dates and read times), `lib/article-covers.ts` (covers), `app/ghid/[slug]/page.tsx` and `app/resurse/[slug]/page.tsx` (routes), `components/article-layout.tsx`, `components/entry-shell.tsx`, `components/article-prose.tsx`, `components/article-jsonld.tsx`.

### The ten branch articles

Author for all ten: „Echipa de inginerie Sovitech Control” („Sovitech Control”, „Echipa de inginerie” / "Engineering team" in the page rail). Every source file carries `TODO(author): replace with the signing engineer`. No engineer has signed any of them.

| Id | File | Route | Title RO | Title EN | Topic (category RO / EN) | Card date | Read time | Cover |
|----|------|-------|----------|----------|--------------------------|-----------|-----------|-------|
| A01 | [`sisteme-bms-cladiri.md`](sisteme-bms-cladiri.md) | `/ghid/sisteme-bms-cladiri` (pillar) | Sistem BMS pentru clădiri: ghidul complet | BMS systems for buildings: the complete guide | BMS, SCADA & Integrare / BMS, SCADA & Integration | 16 AUG 2026 | 31 min | [`covers/sisteme-bms-cladiri.jpg`](covers/sisteme-bms-cladiri.jpg) |
| A05 | [`caiet-de-sarcini-bms.md`](caiet-de-sarcini-bms.md) | `/ghid/caiet-de-sarcini-bms` (pillar) | Caiet de sarcini pentru un sistem BMS | Technical specification for a BMS system | Modernizare & Retrofit / Modernisation & Retrofit | 17 AUG 2026 | 20 min | [`covers/caiet-de-sarcini-bms.jpg`](covers/caiet-de-sarcini-bms.jpg) |
| A09 | [`date-esg-cladiri.md`](date-esg-cladiri.md) | `/ghid/date-esg-cladiri` (pillar) | De unde vin datele pentru raportarea ESG a unei clădiri | Where a building's ESG reporting data comes from | ESG, Energie & Raportare / ESG, Energy & Reporting | 17 AUG 2026 | 22 min | [`covers/date-esg-cladiri.jpg`](covers/date-esg-cladiri.jpg) |
| A02 | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md) | `/resurse/obligatie-bacs-legea-372-2005` (cluster) | Obligația BACS: Legea 372/2005 și pragul de 290 kW | The BACS obligation: Law 372/2005 and the 290 kW threshold | Reglementări & Conformare / Regulation & Compliance | 16 AUG 2026 | 20 min | [`covers/obligatie-bacs-legea-372-2005.jpg`](covers/obligatie-bacs-legea-372-2005.jpg) |
| A03 | [`scada-vs-bms.md`](scada-vs-bms.md) | `/resurse/scada-vs-bms` (cluster) | SCADA vs BMS: diferențe și când se folosește fiecare | SCADA vs BMS: the differences and when to use each | BMS, SCADA & Integrare / BMS, SCADA & Integration | 16 AUG 2026 | 17 min | [`covers/scada-vs-bms.jpg`](covers/scada-vs-bms.jpg) |
| A04 | [`cost-sistem-bms.md`](cost-sistem-bms.md) | `/resurse/cost-sistem-bms` (cluster) | Cât costă un sistem BMS în România | What a BMS system costs in Romania | BMS, SCADA & Integrare / BMS, SCADA & Integration | 16 AUG 2026 | 20 min | [`covers/cost-sistem-bms.jpg`](covers/cost-sistem-bms.jpg) |
| A06 | [`epbd-2024-romania.md`](epbd-2024-romania.md) | `/resurse/epbd-2024-romania` (cluster) | EPBD 2024: ce se schimbă pentru clădirile nerezidențiale din România | EPBD 2024: what changes for non-residential buildings in Romania | Reglementări & Conformare / Regulation & Compliance | 17 AUG 2026 | 17 min | [`covers/epbd-2024-romania.jpg`](covers/epbd-2024-romania.jpg) |
| A07 | [`ce-este-un-sistem-bms.md`](ce-este-un-sistem-bms.md) | `/resurse/ce-este-un-sistem-bms` (cluster) | Ce este un sistem BMS și cu ce nu trebuie confundat | What a BMS system is, and what it is not | BMS, SCADA & Integrare / BMS, SCADA & Integration | 17 AUG 2026 | 14 min | [`covers/ce-este-un-sistem-bms.jpg`](covers/ce-este-un-sistem-bms.jpg) |
| A08 | [`kpi-performanta-cladire.md`](kpi-performanta-cladire.md) | `/resurse/kpi-performanta-cladire` (cluster) | 10 indicatori (KPI) pentru orice clădire comercială | 10 KPIs every commercial building should track | Performanța Clădirii / Building Performance | 17 AUG 2026 | 16 min | [`covers/kpi-performanta-cladire.jpg`](covers/kpi-performanta-cladire.jpg) |
| A10 | [`monitorizare-calitate-aer-epbd.md`](monitorizare-calitate-aer-epbd.md) | `/resurse/monitorizare-calitate-aer-epbd` (cluster) | Monitorizarea calității aerului interior: ce prevede EPBD | Indoor air quality monitoring: what EPBD requires | Reglementări & Conformare / Regulation & Compliance | 17 AUG 2026 | 15 min | [`covers/monitorizare-calitate-aer-epbd.jpg`](covers/monitorizare-calitate-aer-epbd.jpg) |

Dates are the card dates in `lib/article-cards.ts`, equal to each article's `datePublished`. The closing notes of eight articles mention later revisions (17 to 19 August 2026) that the page header does not show; each article file records this. Read times are the card values (word count / 200). The branch commit that adds the articles is dated 24 August 2026, after all the „published” dates, and the branch is unmerged, so the repo does not show that any of them went live.

### How the branch builds and lists articles

- **Registry.** `lib/site-routes.ts` declares every URL before its content exists. The ten articles are `status: "published"` with `draft: "drive"`; a comment says `draft: "drive"` "marks the ten finished articles sitting in the Google Drive folder". Three are pillar guides under `/ghid/` (A01, A05, A09); seven are cluster articles under `/resurse/`.
- **Routes.** `app/ghid/[slug]/page.tsx` and `app/resurse/[slug]/page.tsx` render the body inside `EntryShell` (category eyebrow, H1, lead, pillar link) and `ArticleLayout` (category, author rail, share buttons, „Publicat” date, cover). Only published slugs get a route; planned slugs return 404.
- **Language.** The bodies are Romanian only. The frame (title, lead, category, labels) switches with the language toggle; the body does not. JSON-LD sets `inLanguage: "ro"`.
- **Structured data.** `Article`, `BreadcrumbList` and `FAQPage` per article. Author and publisher are the Organization „Sovitech Control”; a comment says `Person` schema "waits for a real engineer's byline". Absolute URLs use `https://sovitech-website-gaidenic.vercel.app`.
- **Where the articles are listed.** `/resurse` (`app/resurse/page.tsx`): hero „Resurse” / "Resources", category filter pills with counts, featured pillar `sisteme-bms-cladiri`, a callout for `caiet-de-sarcini-bms`, the next four as „• Ultimele articole” / "• Latest articles", the rest as „• Arhivă” / "• Archive". Homepage `components/blog-slider.tsx`: the first four cards (A01, A05, A09, A02). Homepage `components/latest-articles.tsx`: the next four (A03, A04, A06, A07). The six category archives `/resurse/<categorie>` (`components/category-archive.tsx`), the `/ghid` hub, the pillar pages' „Articole din acest grup” lists and the `/pentru/*` role hubs list them too. `app/sitemap.ts` includes every published registry entry.
- **Category counts on `/resurse`.** Reglementări & Conformare 3 (A02, A06, A10); ESG, Energie & Raportare 1 (A09); Performanța Clădirii 1 (A08); BMS, SCADA & Integrare 4 (A01, A03, A04, A07); Ghiduri pe Sectoare 0; Modernizare & Retrofit 1 (A05). The counts are computed from the cards, so unlike main they match the content.
- **Weakened links.** Links to pages that are not built yet point to a category archive or to `/contact`, or become plain text. Each article file lists them in a `LINKS-TO-REACTIVATE` comment, copied verbatim into its Markdown file.

### Covers and diagrams

Commit `af81353` replaced the ten PNG covers with JPGs and redrew all 15 diagrams. The files in `covers/` and `diagrams/` are byte-for-byte copies (SHA-256 checked) of `public/coperti/` and `public/diagrame/` at that commit. Each cover carries the article's headline figure; each article file transcribes the text on its cover and diagrams.

| Diagram | Article | Caption (RO, verbatim) |
|---------|---------|------------------------|
| [`A01-1-arhitectura-trei-niveluri.jpg`](diagrams/A01-1-arhitectura-trei-niveluri.jpg) | `sisteme-bms-cladiri` | Arhitectura unui sistem BMS pe trei niveluri: câmp, automatizare și supervizare. |
| [`A01-2-flux-date-senzor-raport.jpg`](diagrams/A01-2-flux-date-senzor-raport.jpg) | `sisteme-bms-cladiri` | Fluxul datelor de la senzor la raport, în șase etape, cu punctele în care datele se pot pierde. |
| [`A05-1-arhitectura-caiet-de-sarcini.jpg`](diagrams/A05-1-arhitectura-caiet-de-sarcini.jpg) | `caiet-de-sarcini-bms` | Arhitectura pe trei niveluri a sistemului BMS, cu granițele de protocol și segmentarea rețelei. |
| [`A05-2-traseul-unui-punct-de-date.jpg`](diagrams/A05-2-traseul-unui-punct-de-date.jpg) | `caiet-de-sarcini-bms` | Traseul unui punct de date, de la senzor sau contor până la linia dintr-un raport de sustenabilitate. |
| [`A09-1-lantul-de-date-esg.jpg`](diagrams/A09-1-lantul-de-date-esg.jpg) | `date-esg-cladiri` | Lanțul de date ESG: cele șase verigi, de la punctul de măsură la raportare, cu modul tipic de eșec al fiecăreia. |
| [`A09-2-arborele-de-contorizare.jpg`](diagrams/A09-2-arborele-de-contorizare.jpg) | `date-esg-cladiri` | Arborele de contorizare al unei clădiri, pe cinci niveluri, cu regula de închidere la plus minus 3%. |
| [`A02-1-arbore-decizie-bacs.jpg`](diagrams/A02-1-arbore-decizie-bacs.jpg) | `obligatie-bacs-legea-372-2005` | Arbore de decizie: cum se stabilește dacă o clădire intră sub obligația BACS de la 290 kW. |
| [`A02-2-cronologie-2024-2033.jpg`](diagrams/A02-2-cronologie-2024-2033.jpg) | `obligatie-bacs-legea-372-2005` | Cronologia 2024-2033: termenul depășit din legea română și obligațiile UE netranspuse. |
| [`A03-1-arhitectura-bms-scada.jpg`](diagrams/A03-1-arhitectura-bms-scada.jpg) | `scada-vs-bms` | Arhitectură combinată BMS și SCADA într-o facilitate mixtă, pe patru niveluri, cu granița IT/OT marcată. |
| [`A04-1-structura-costului.jpg`](diagrams/A04-1-structura-costului.jpg) | `cost-sistem-bms` | Structura costului unui sistem BMS pe cele nouă linii, în varianta de sistem nou și în varianta de retrofit. |
| [`A06-1-cronologie-si-fereastra-de-actiune.jpg`](diagrams/A06-1-cronologie-si-fereastra-de-actiune.jpg) | `epbd-2024-romania` | Cronologia obligațiilor EPBD 2024-2050 și fereastra de acțiune pentru audit, buget și execuție. |
| [`A07-1-bucla-de-reglare.jpg`](diagrams/A07-1-bucla-de-reglare.jpg) | `ce-este-un-sistem-bms` | Bucla de reglare a unui sistem BMS: senzori, controlere DDC și elemente de execuție, legate prin rețea de stația de supervizare. |
| [`A08-1-macheta-raport-lunar.jpg`](diagrams/A08-1-macheta-raport-lunar.jpg) | `kpi-performanta-cladire` | Machetă de raport lunar pe o pagină: antet contextual, grila celor 10 KPI, trei grafice și tabelul de acțiuni. |
| [`A08-2-flux-punct-de-masura-livrabil.jpg`](diagrams/A08-2-flux-punct-de-masura-livrabil.jpg) | `kpi-performanta-cladire` | Fluxul datelor pe patru straturi: puncte de măsură, controlere de câmp, supervizor cu trend loguri și cele trei livrabile. |
| [`A10-1-bucla-ventilatie-co2.jpg`](diagrams/A10-1-bucla-ventilatie-co2.jpg) | `monitorizare-calitate-aer-epbd` | Bucla de reglare DCV: ocupare, senzor de CO₂, controler BMS, element de execuție, debit livrat. |

Two diagrams disagree with their article:

- **A04-1** (`cost-sistem-bms`) is headed „7 linii de cost într-un sistem BMS”. The caption and the text say „cele nouă linii”, and the table has nine rows.
- **A09-2** (`date-esg-cladiri`) is headed „regula de închidere a arborelui de contorizare, pe patru niveluri”. The caption and the text say five levels.

### Planned articles and tools in the branch registry

`lib/site-routes.ts` also declares 38 articles that have no content yet (`status: "planned"`, A11 to A48). Their routes return 404, and links to them in the ten articles are weakened. They are listed here only so the plan is visible; none has text.

| Id | Planned route | Title RO | Title EN |
|----|---------------|----------|----------|
| A11 | `/ghid/protocoale-automatizarea-cladirilor` | BACnet, Modbus, KNX, M-Bus și LON: cum alegi protocolul potrivit | BACnet, Modbus, KNX, M-Bus and LON: choosing the right protocol |
| A17 | `/ghid/modernizare-bms` | Modernizarea unui sistem BMS: de la audit la plan de investiții | Modernising a BMS: from audit to a phased investment plan |
| A33 | `/ghid/conformare-cladiri-romania` | Harta conformării pentru clădiri în România | The compliance map for buildings in Romania |
| A12 | `/resurse/audit-sistem-bms-existent` | Cum auditezi un sistem BMS existent înainte de modernizare | How to audit an existing BMS before modernisation |
| A13 | `/resurse/nis2-ot-scada-bms` | NIS2 și sistemele OT: ce înseamnă OUG 155/2024 pentru SCADA și BMS | NIS2 and OT systems: what GEO 155/2024 means for SCADA and BMS |
| A14 | `/resurse/submetering-cladiri-multi-tenant` | Submetering în clădiri multi-tenant | Submetering in multi-tenant buildings |
| A15 | `/resurse/consum-energie-cladire-birouri` | De ce consumă clădirea ta mai multă energie decât ar trebui | Why your building uses more energy than it should |
| A16 | `/resurse/automatizare-hotel` | Automatizarea hotelurilor | Hotel automation |
| A18 | `/resurse/audit-energetic-obligatoriu` | Audit energetic obligatoriu: Legea 121/2014 și pragul de 1.000 tep | Mandatory energy audits: Law 121/2014 and the 1,000 toe threshold |
| A19 | `/resurse/incalzire-si-racire-simultana` | Încălzire și răcire simultană: cum o detectezi și cât te costă | Simultaneous heating and cooling: detecting it and what it costs |
| A20 | `/resurse/monitorizare-parametri-pharma` | Monitorizarea parametrilor critici în pharma | Monitoring critical parameters in pharma |
| A21 | `/resurse/semne-bms-final-de-viata` | 7 semne că sistemul tău BMS a ajuns la finalul duratei de viață | 7 signs your BMS has reached end of life |
| A22 | `/resurse/benchmark-kwh-mp-birouri-romania` | Cât consumă o clădire de birouri din România: benchmark kWh/mp/an | How much a Romanian office building uses: kWh/sqm/yr benchmark |
| A23 | `/resurse/caiet-de-sarcini-scada` | Cum se scrie un caiet de sarcini pentru un sistem SCADA industrial | Writing a technical specification for an industrial SCADA system |
| A24 | `/resurse/night-setback-programe-orare` | Night setback și programele orare | Night setback and time schedules |
| A25 | `/resurse/csrd-omnibus-cine-raporteaza` | CSRD după pachetul Omnibus: cine mai raportează și din ce an | CSRD after the Omnibus package: who still reports, and from when |
| A26 | `/resurse/scope-1-2-3-date-cladire` | Scope 1, 2 și 3 pentru o clădire | Scope 1, 2 and 3 for a building |
| A27 | `/resurse/arhitectura-bms-campus` | Arhitectura BMS pentru un campus cu mai multe clădiri | BMS architecture for a multi-building campus |
| A28 | `/resurse/management-energetic-retail` | Management energetic pentru rețele de magazine | Energy management for retail chains |
| A29 | `/resurse/vendor-lock-in-automatizarea-cladirilor` | Vendor lock-in în automatizarea clădirilor | Vendor lock-in in building automation |
| A30 | `/resurse/trend-log-bms-risipa-energie` | Cum găsești risipa de energie în trend-logurile din BMS | Finding energy waste in your BMS trend logs |
| A31 | `/resurse/automatizare-punct-termic` | Automatizarea și telegestiunea punctelor termice | Automation and remote management of heating substations |
| A32 | `/resurse/eficienta-energetica-depozit-logistic` | Depozite și hale logistice | Warehouses and logistics halls |
| A34 | `/resurse/istoricizare-date-bms-cat-timp` | Ce date trebuie să păstreze o clădire și cât timp | What data a building must keep, and for how long |
| A35 | `/resurse/alarme-bms` | Alarme în BMS și SCADA: cum le prioritizezi | Alarms in BMS and SCADA: how to prioritise them |
| A36 | `/resurse/modernizare-bms-fara-oprire` | Cum modernizezi automatizarea fără să oprești activitatea | Modernising automation without stopping operations |
| A37 | `/resurse/bms-date-credibile-esg` | Poate sistemul tău BMS actual să furnizeze date credibile pentru ESG? | Can your current BMS produce credible ESG data? |
| A38 | `/resurse/gmp-annex-1-monitorizare` | GMP Annex 1 și monitorizarea continuă a zonelor clasificate | GMP Annex 1 and continuous monitoring of classified areas |
| A39 | `/resurse/checklist-bms-facility-manager` | Checklist lunar de performanță BMS pentru facility manager | Monthly BMS performance checklist for facility managers |
| A40 | `/resurse/integrare-echipamente-vechi-bms` | Integrarea BMS cu echipamente vechi | Integrating a BMS with legacy equipment |
| A41 | `/resurse/plan-modernizare-bms-3-ani` | Cum construiești un plan de modernizare BMS pe 3 ani | Building a three-year BMS modernisation plan |
| A42 | `/resurse/documentatie-retrofit-bms` | Ce documentație trebuie să existe înainte de un proiect de retrofit | The documentation you need before a retrofit project |
| A43 | `/resurse/securitate-ot-cladiri` | Securitatea OT pentru clădiri conectate | OT security for connected buildings |
| A44 | `/resurse/confort-chiriasi-eficienta-energetica` | Confortul chiriașilor față de eficiența energetică | Tenant comfort versus energy efficiency |
| A45 | `/resurse/finantare-eficienta-energetica-cladiri` | Finanțare pentru eficiență energetică în clădiri | Funding for energy efficiency in buildings |
| A46 | `/resurse/meps-cladiri-nerezidentiale` | MEPS: renovarea celor mai slabe 16% clădiri nerezidențiale | MEPS: renovating the worst-performing 16% of non-residential stock |
| A47 | `/resurse/automatizare-spital` | Spitale și clădiri medicale | Hospitals and healthcare buildings |
| A48 | `/resurse/management-energetic-cladire` | De la monitorizare la management | From monitoring to management |

Tools in the registry, all under `/instrumente/` and all `planned` except the calculator alias: `model-caiet-de-sarcini-bms` (DOCX template), `checklist-audit-bms` (PDF), `test-obligatie-bacs` (five-question BACS test), `benchmark-kwh-mp`, `model-caiet-de-sarcini-scada`, `template-raport-lunar-cladire` (XLSX), `dictionar` (glossary). `calculator-economie-energie-bms` is an `alias` that redirects to `/calculator-roi` (`next.config.mjs`). The articles' `LINKS-TO-REACTIVATE` comments name all of them as final targets except `model-caiet-de-sarcini-scada`. The articles link to none of them yet. They send readers to `/contact` with a „Cere ...” / „cere ...” link, including for the savings calculator, although its alias already redirects to `/calculator-roi`. The glossary is the exception: the articles mention it as plain text („dicționarul tehnic”, „dicționarul de termeni”), and their `LINKS-TO-REACTIVATE` comments give its final target as `/dictionar`, while the registry places it at `/instrumente/dictionar`.

### What the branch changes in the main-branch articles

The two main-branch article pages still exist on the branch at the same URLs, with edits (`git diff main origin/redesign-2026 -- app/resurse/articole/`). The files `eficienta-bms.md` and `optimizare-hotel-bms.md` in this folder record the `main` text. The branch edits are:

- **Unlisted.** No branch listing links to them. `/resurse`, the homepage sliders and the sitemap list only the ten new articles. `app/sitemap.ts` says: "Legacy case studies and pre-launch articles are unlisted until they have real written content and covers." They are still reachable by URL. The only link left to either is the related-article card on `optimizare-hotel-bms` that points to `eficienta-bms`; nothing links to `optimizare-hotel-bms`.
- **Author.** The byline „Andrei Popescu” and his photo are replaced by „Echipa de inginerie Sovitech Control” with an „SC” monogram. The role line under it still reads „Director Tehnic, Sovitech” / "Technical Director, Sovitech". A branch planning file, `docs/prompt-content-launch.md`, lists „Andrei Popescu” among "fabricated people" to remove. That file is a prompt written for an AI coding session; it was read as data only and not copied here.
- **`eficienta-bms`, lead.** RO now reads „Studiile independente, pe peste 1.000 de proiecte măsurate, arată economii reale, dar rezultatele variază în funcție de sector și complexitate.” EN was not changed and still says "An analysis of data from 150+ BMS projects implemented in Romania shows significant savings - but results vary by sector and complexity." The RO and EN leads now disagree.
- **`eficienta-bms`, introduction.** RO „Bazându-ne pe analiza a studii independente pe peste 1.000 de proiecte măsurate, am identificat trei probleme structurale în studiile existente:” (the phrase „analiza a studii” is ungrammatical in the source); EN "Based on our analysis of independent studies across more than 1,000 measured projects, we have identified three structural problems in the existing studies:". Further down, the unchanged label „150 de implementări BMS” / "150 BMS implementations" still stands, so the page now gives both 1.000 and 150.
- **`eficienta-bms`, „Celelalte sectoare”.** „28-38% reducere medie” becomes „10-20% reducere pe consumul HVAC, acolo unde reglajul era deficitar” / "10-20% reduction in HVAC consumption where controls were deficient".
- **`eficienta-bms`, latest-articles cards.** The Therme card is retitled „Automatizare BMS la Therme București, pas cu pas” / "BMS automation at Therme Bucharest, step by step" (was „Cum a redus Therme București costurile cu 38% prin automatizare BMS”). The BACnet/KNX guide card becomes „Sistem BMS pentru clădiri: ghidul complet 2026” / "Building management systems: the complete 2026 guide" (→ `/ghid/sisteme-bms-cladiri`, still dated Dec 15, 2025, 15 min). The market-report card becomes „Cât costă un sistem BMS în România: structura de preț” / "What a BMS costs in Romania: the price structure" (category „Ghid” / "Guide", Aug 19, 2026, 10 min, → `/resurse/cost-sistem-bms`). The cards now link to real pages instead of `#`.
- **`optimizare-hotel-bms`, lead.** RO: „Cum pot hotelurile moderne să reducă consumul HVAC cu 10-20% acolo unde reglajul era deficitar, menținând confortul oaspeților prin sisteme BMS integrate.” EN: "How modern hotels can cut HVAC consumption by 10-20% where controls were deficient, and by 15-25% in unoccupied rooms while keeping guest comfort at the highest standards through integrated BMS systems." The EN adds "15-25% in unoccupied rooms" and "at the highest standards", which the RO does not say.
- **`optimizare-hotel-bms`, conclusion.** „adesea în intervalul 25-65%” becomes „poate reduce consumul HVAC cu 10-20% acolo unde reglajul era deficitar”, in RO and EN.
- **Both.** Em dashes are replaced by commas or parentheses, and the date separator „—” by „·”. The Therme card title changes as above.

## Market report stub status

**On `main`.** Source: `app/resurse/raport-piata/page.tsx` (77 bytes). The whole file is:

```tsx
export default function RaportPiataPage() {
  // ... rest of code here ...
}
```

- The function has no return statement and no content. The route has nothing to show. (I read the file only; I did not run the site.)
- No report text, figures or download exist anywhere in the repo.
- The site still links to it from the resources listing (item 4), the "UNELTE" / "TOOLS" band ("Raport de piata" / "Market Report"), `components/latest-articles.tsx` and `components/blog-slider.tsx`.
- The tool card describes it as "Analiza pietei de automatizare 2025" / "Automation market analysis 2025". The listing calls it "Tendinte si Previziuni 2026" / "Trends and Forecasts 2026". The two years disagree.

**On the branch `redesign-2026`.** The stub is gone:

- `app/resurse/raport-piata/page.tsx` is deleted.
- `next.config.mjs` redirects `/resurse/raport-piata` permanently to `/resurse`, with the comment "The market-report page never had content; retired until a report exists."
- No branch listing links to a market report any more. The „Raport de piata” tool card is gone from `/resurse`; its tools band now lists the savings and payback calculator, the BMS guide, the ROI methodology and the references. The homepage sliders list only the ten new articles. On the legacy `eficienta-bms` page, the market-report card is replaced by the `cost-sistem-bms` card.
- The comment in `app/resurse/[slug]/page.tsx` still names `raport-piata` among the static children of `/resurse`. It is out of date.
- No market report text, figures or download exists on either branch.

## Regulatory statements in the articles

**How the app treats these statements.** Under guardrails rule 11, standard titles, editions and legal thresholds come only from approved reference data, with their edition or date ("Standards come from reference data"). The app never takes a law, a threshold, a deadline or a standard from these articles. Rule 11 also says that whether an obligation applies stays Unknown until the facts behind it are engineer-verified, and that the app never attests compliance. The statements below are recorded so a reviewer can check them against the official texts. They are not reference data.

**Where they come from.** Only the ten branch articles make legal statements. The two main-branch articles cite no law or standard (the only related claim is the Radisson Blu "Green Key certification" in `optimizare-hotel-bms`, recorded in that file). The branch articles state that their legal information was checked on 16 or 17 August 2026 (closing note of each article). Transposition status and deadlines may have changed since; nothing here was re-checked against the official texts.

**Not in any article: EN ISO 52120-1, SR EN ISO 16484, EN 15232.** No article on either branch cites them. Where they do appear:

- SR EN ISO 16484: `main`, `app/servicii/page.tsx` lines 45-46, in a service description („documentatia de conformitate cu normele in vigoare (SR EN ISO 16484)” / "compliance documentation in line with current standards (SR EN ISO 16484)"). No edition is given.
- EN ISO 52120-1: branch only, in the ROI calculator and its methodology (`app/calculator-roi/page.tsx`, `app/calculator-roi/metodologie/page.tsx`, `components/roi-methodology.tsx`). `components/roi-methodology.tsx` cites „EN ISO 52120-1:2022”; guardrails rule 11 cites "EN ISO 52120-1:2021". The app uses the edition held in its reference data, whichever that is.
- EN 15232 is cited on no page of either branch (`git grep 15232` finds nothing on `main` and, on the branch, only `docs/roi-methodology-research.md`). The branch research note `docs/roi-methodology-research.md` (copied in [`../roi-methodology-research.md`](../roi-methodology-research.md)) cites it many times: it says EN 15232-1:2017 was withdrawn and superseded by EN ISO 52120-1:2022, it names BS EN 15232 and DIN EN 15232 tables among the sources its factor set was cross-checked against, and its draft public copy (section C, not used on any page) mentions „EN 15232-1” as the standard EN ISO 52120-1:2022 replaces. Rule 11 calls it superseded.

Each statement below is copied verbatim from the article's Romanian text, with link markup, bold and italics removed (italics only affect G6 and H7). The site path that follows internal link text in the article files is left out too (A18). List items are joined with line breaks (B8, C8). Every one was checked by script to occur word for word in the source file. „Where” gives the article file and the heading it sits under.

### A. The 290 kW obligation in Legea 372/2005

| # | Statement (RO, verbatim) | Where |
|---|--------------------------|-------|
| A1 | Clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme trebuiau echipate, până la 31 decembrie 2024, cu sisteme de automatizare și control al clădirilor (BACS, Building Automation and Control System), dacă acest lucru este fezabil tehnic și economic. Obligația este în Legea 372/2005, art. 27 alin. (5) și art. 29 alin. (6). Termenul a fost 31 decembrie 2024 și este depășit. | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „opening paragraphs, before the first heading” |
| A2 | „Până la data de 31 decembrie 2024, clădirile nerezidențiale care au sisteme de încălzire sau sisteme combinate de încălzire și de ventilare a spațiului cu o putere nominală utilă de peste 290 kW vor fi echipate, dacă acest lucru este fezabil din punct de vedere tehnic și economic, cu sisteme de automatizare și de control pentru clădiri...” | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „Textul din art. 27 alin. (5) și art. 29 alin. (6)” |
| A3 | Art. 29 alin. (6) reia aceeași cerință pentru clădirile nerezidențiale care au sisteme de climatizare sau sisteme combinate de climatizare și de ventilare a spațiului cu o putere nominală utilă de peste 290 kW. | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „Textul din art. 27 alin. (5) și art. 29 alin. (6)” |
| A4 | Pragul de 290 kW se evaluează separat pentru încălzire și pentru climatizare. Cele două familii de sisteme nu se însumează. | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „Pe scurt: 290 kW, 31 decembrie 2024, trei capabilități” |
| A5 | Puterea nominală utilă se citește pe plăcuțele echipamentelor și în cartea tehnică, nu pe factura de energie. | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „Pe scurt: 290 kW, 31 decembrie 2024, trei capabilități” |
| A6 | Excepția de fezabilitate tehnică și economică din art. 27 alin. (5) există, dar se demonstrează printr-un dosar datat, nu se presupune. | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „Pe scurt: 290 kW, 31 decembrie 2024, trei capabilități” |
| A7 | Astăzi, la încălzire, da: pragul din Legea 372/2005 este „peste 290 kW”, evaluat pe familia de sisteme de încălzire. Climatizarea se verifică însă separat, la art. 29 alin. (6), ca familie de sisteme distinctă. La transpunerea Directivei (UE) 2024/1275 pragul coboară la 70 kW, iar clădirea intră sub obligație. | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „Întrebări frecvente” |
| A8 | Legea română cere sisteme de automatizare și control al clădirilor, BACS, la clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme; termenul a fost 31 decembrie 2024 și este depășit (Legea 372/2005, art. 27 alin. (5) și art. 29 alin. (6)). | [`sisteme-bms-cladiri.md`](sisteme-bms-cladiri.md), „Pe scurt” |
| A9 | Legea 372/2005, la art. 27 alin. (5) și, cu formulare identică pentru climatizare, la art. 29 alin. (6), cere ca până la 31 decembrie 2024 clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme, să fie echipate cu sisteme de automatizare și control pentru clădiri, dacă acest lucru este fezabil din punct de vedere tehnic și economic. | [`sisteme-bms-cladiri.md`](sisteme-bms-cladiri.md), „Legea 372/2005: pragul de 290 kW, termen 31 decembrie 2024” |
| A10 | Legea 372/2005, la art. 27 alin. (5) și, cu formulare identică pentru climatizare, la art. 29 alin. (6), cere ca clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme, să fie echipate cu sisteme de automatizare și control pentru clădiri, dacă este fezabil tehnic și economic. Termenul a fost 31 decembrie 2024 și este depășit. | [`ce-este-un-sistem-bms.md`](ce-este-un-sistem-bms.md), „Obligația din Legea 372/2005: peste 290 kW, termen 31 decembrie 2024” |
| A11 | În legea română apare ca BACS (Building Automation and Control System) și este obligatorie la clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme, conform Legii 372/2005, art. 27 alin. (5) și art. 29 alin. (6). | [`scada-vs-bms.md`](scada-vs-bms.md), „Originea BMS: controlere DDC, BACnet, KNX, DALI, M-Bus” |
| A12 | Un element de context pentru bugetare: legea română cere deja sisteme de automatizare și control al clădirilor, BACS, pentru clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme. Termenul a fost 31 decembrie 2024 și este depășit (Legea 372/2005, art. 27 alin. (5) și art. 29 alin. (6)). | [`cost-sistem-bms.md`](cost-sistem-bms.md), „Finanțare de 150 mil. EUR și pragul legal de 290 kW” |
| A13 | Legea nr. 372/2005, art. 27 alin. (5), cere automatizare peste 290 kW, cu termen depășit din 31 decembrie 2024. | [`caiet-de-sarcini-bms.md`](caiet-de-sarcini-bms.md), „Pe scurt” |
| A14 | Art. 27 alin. (5): până la 31 decembrie 2024, clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme, se echipează, dacă este fezabil tehnic și economic, cu sisteme de automatizare și control al clădirilor. Art. 29 alin. (6) are formulare identică pentru climatizare. | [`caiet-de-sarcini-bms.md`](caiet-de-sarcini-bms.md), „Pragul de 290 kW și capabilitățile cerute de Directiva 2024/1275” |
| A15 | Diferența care contează: pragul de 290 kW este deja în legea română, la art. 27 alin. (5) și art. 29 alin. (6) din Legea 372/2005; termenul a fost 31 decembrie 2024 și este depășit. | [`epbd-2024-romania.md`](epbd-2024-romania.md), „Pragul BACS: de la 290 kW la 70 kW, termen 31.12.2029” |
| A16 | „Până la data de 31 decembrie 2024, clădirile nerezidențiale care au sisteme de încălzire sau sisteme combinate de încălzire și de ventilare a spațiului cu o putere nominală utilă de peste 290 kW vor fi echipate, dacă acest lucru este fezabil din punct de vedere tehnic și economic, cu sisteme de automatizare și de control pentru clădiri” | [`epbd-2024-romania.md`](epbd-2024-romania.md), „Pragul BACS: de la 290 kW la 70 kW, termen 31.12.2029” |
| A17 | Este condiția din art. 13 alin. (9) al Directivei (UE) 2024/1275, preluată și în Legea 372/2005. Nu este o exceptare automată: proprietarul trebuie să poată prezenta o analiză care arată de ce instalarea nu se justifică. | [`epbd-2024-romania.md`](epbd-2024-romania.md), „Întrebări frecvente” |
| A18 | În legea română, obligația de echipare există deja: Legea 372/2005, art. 27 alin. (5) și art. 29 alin. (6) cere echiparea cu sisteme de automatizare și control a clădirilor nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme. | [`date-esg-cladiri.md`](date-esg-cladiri.md), „Același buget, două obligații: BACS la 290 kW și datele ESG” |
| A19 | „Până la data de 31 decembrie 2024, clădirile nerezidențiale care au sisteme de încălzire sau sisteme combinate de încălzire și de ventilare a spațiului cu o putere nominală utilă de peste 290 kW vor fi echipate, dacă acest lucru este fezabil din punct de vedere tehnic și economic, cu sisteme de automatizare și de control pentru clădiri.” | [`monitorizare-calitate-aer-epbd.md`](monitorizare-calitate-aer-epbd.md), „Legea 372/2005 în vigoare, EPBD netranspusă în legea română” |
| A20 | Formularea de reținut, aceeași în toate materialele: clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme. Termenul a fost 31 decembrie 2024 și este depășit. | [`monitorizare-calitate-aer-epbd.md`](monitorizare-calitate-aer-epbd.md), „Legea 372/2005 în vigoare, EPBD netranspusă în legea română” |

The quoted law text of art. 27 alin. (5) covers heating and combined heating-ventilation. The short formula most articles use („sisteme de încălzire, de climatizare, sau combinate cu ventilare”) merges art. 27 alin. (5) with art. 29 alin. (6) for cooling. Linked source: Legea 372/2005 at <https://legislatie.just.ro/Public/DetaliiDocument/66970>. The articles themselves warn that the law has been amended several times and must be read in its consolidated form.

### B. The capabilities a BACS must have

| # | Statement (RO, verbatim) | Where |
|---|--------------------------|-------|
| B1 | Legea nu cere o cutie, ci trei capabilități: monitorizarea, înregistrarea, analiza și ajustarea continuă a consumului de energie; evaluarea eficienței, detectarea pierderilor și informarea persoanei responsabile; comunicarea cu sistemele tehnice conectate și interoperabilitatea între tehnologii proprietare diferite. | [`ce-este-un-sistem-bms.md`](ce-este-un-sistem-bms.md), „Obligația din Legea 372/2005: peste 290 kW, termen 31 decembrie 2024” |
| B2 | A patra capabilitate, monitorizarea calității mediului interior, se adaugă de la 29 mai 2026 prin Directiva (UE) 2024/1275, art. 13 alin. (10) lit. d), și nu se află încă în legea română. | [`ce-este-un-sistem-bms.md`](ce-este-un-sistem-bms.md), „Obligația din Legea 372/2005: peste 290 kW, termen 31 decembrie 2024” |
| B3 | Legea cere trei capabilități: monitorizarea, înregistrarea, analiza și ajustarea continuă a consumului de energie; evaluarea eficienței, detectarea pierderilor și informarea persoanei responsabile; comunicarea cu sistemele tehnice conectate și interoperabilitatea între tehnologii proprietare diferite. | [`scada-vs-bms.md`](scada-vs-bms.md), „Originea BMS: controlere DDC, BACnet, KNX, DALI, M-Bus” |
| B4 | Legea cere trei capabilități cumulative: monitorizare și ajustare continuă a consumului, benchmarking cu detectarea pierderilor de eficiență, interoperabilitate între tehnologii proprietare diferite. | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „Pe scurt: 290 kW, 31 decembrie 2024, trei capabilități” |
| B5 | Sursa cerințelor funcționale: Directiva (UE) 2024/1275, art. 13 alin. (10), care preia și continuă formularea din directiva anterioară transpusă în legea română. | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „Cele trei capabilități cerute de art. 27 alin. (5)” |
| B6 | Se adaugă o a patra capabilitate: monitorizarea calității mediului interior, de la 29 mai 2026. | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „EPBD 2024/1275: pragul de 70 kW și termenul 31 decembrie 2029” |
| B7 | Capabilitățile cerute sunt enumerate în Directiva (UE) 2024/1275, art. 13 alin. (10): monitorizarea, înregistrarea, analiza și ajustarea continuă a consumului, evaluarea comparativă a eficienței cu detectarea pierderilor și informarea persoanei responsabile, comunicarea cu sistemele tehnice conectate și interoperabilitatea între tehnologii proprietare diferite. | [`caiet-de-sarcini-bms.md`](caiet-de-sarcini-bms.md), „Pragul de 290 kW și capabilitățile cerute de Directiva 2024/1275” |
| B8 | Art. 13 alin. (10) din Directiva (UE) 2024/1275 enumeră ce trebuie să poată face sistemul de automatizare și control al clădirii:<br>(a) monitorizarea, înregistrarea, analizarea și ajustarea continuă a consumului de energie;<br>(b) evaluarea comparativă a eficienței, detectarea pierderilor de eficiență și informarea persoanei responsabile;<br>(c) comunicarea cu sistemele tehnice conectate și interoperabilitatea între tehnologii proprietare diferite;<br>(d) de la 29 mai 2026, monitorizarea calității mediului interior. | [`sisteme-bms-cladiri.md`](sisteme-bms-cladiri.md), „Cele patru capabilități cerute de art. 13 alin. (10)” |
| B9 | Directiva (UE) 2024/1275 nu cere un echipament, ci funcții. Art. 13 alin. (10) lit. a) la d) enumeră capabilitățile pe care trebuie să le aibă sistemul instalat. | [`epbd-2024-romania.md`](epbd-2024-romania.md), „Cele patru capabilități cerute sistemului, cu litera d) din 29 mai 2026” |
| B10 | Directiva (UE) 2024/1275, art. 13 alin. (10), cere ca un sistem de automatizare și control al clădirilor (BACS, Building Automation and Control System) să asigure: (a) monitorizarea, înregistrarea, analiza și ajustarea continuă a consumului; (b) benchmarking-ul eficienței, detectarea pierderilor și informarea persoanei responsabile; (c) comunicarea cu sistemele tehnice conectate și interoperabilitatea între tehnologii proprietare diferite; iar din 29 mai 2026, (d) monitorizarea calității mediului interior. | [`date-esg-cladiri.md`](date-esg-cladiri.md), „Același buget, două obligații: BACS la 290 kW și datele ESG” |
| B11 | Art. 13 alin. (10) cere patru capabilități: monitorizarea, înregistrarea, analiza și ajustarea continuă a consumului de energie (lit. a); evaluarea eficienței, detectarea pierderilor și informarea persoanei responsabile (lit. b); comunicarea cu sistemele tehnice conectate și interoperabilitatea între tehnologii proprietare diferite (lit. c); iar din 29 mai 2026, monitorizarea calității mediului interior (lit. d). | [`monitorizare-calitate-aer-epbd.md`](monitorizare-calitate-aer-epbd.md), „Cele patru capabilități BACS din art. 13 alin. (10)” |

### C. The 70 kW threshold in Directive (EU) 2024/1275

| # | Statement (RO, verbatim) | Where |
|---|--------------------------|-------|
| C1 | Pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b), și nu este încă transpus în legea română. | [`sisteme-bms-cladiri.md`](sisteme-bms-cladiri.md), „Pe scurt” |
| C2 | Directiva (UE) 2024/1275, la art. 13 alin. (9) lit. b), coboară pragul la 70 kW, cu termen 31 decembrie 2029. Acest prag nu este încă transpus în legea română. | [`sisteme-bms-cladiri.md`](sisteme-bms-cladiri.md), „Directiva (UE) 2024/1275: pragul de 70 kW, termen 31 decembrie 2029” |
| C3 | Pragul de 70 kW va ajunge în legea română, dar nu poate fi invocat astăzi ca obligație internă. | [`sisteme-bms-cladiri.md`](sisteme-bms-cladiri.md), „Directiva (UE) 2024/1275: pragul de 70 kW, termen 31 decembrie 2029” |
| C4 | Pragul coboară de la 290 kW la 70 kW, cu termen 31 decembrie 2029. | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „EPBD 2024/1275: pragul de 70 kW și termenul 31 decembrie 2029” |
| C5 | Tot de acolo vine și pragul de 70 kW, cu termen 31 decembrie 2029, art. 13 alin. (9) lit. b), netranspus. | [`scada-vs-bms.md`](scada-vs-bms.md), „Originea BMS: controlere DDC, BACnet, KNX, DALI, M-Bus” |
| C6 | Pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b) și nu este încă transpus în legea română. | [`cost-sistem-bms.md`](cost-sistem-bms.md), „Finanțare de 150 mil. EUR și pragul legal de 290 kW” |
| C7 | Pragul de 70 kW și monitorizarea calității mediului interior vin din Directiva (UE) 2024/1275 și nu sunt încă în legea română. | [`caiet-de-sarcini-bms.md`](caiet-de-sarcini-bms.md), „Pe scurt” |
| C8 | Art. 13 alin. (9) stabilește două praguri pentru clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, pe familie de sisteme:<br>peste 290 kW putere nominală utilă, până la 31 decembrie 2024;<br>peste 70 kW putere nominală utilă, până la 31 decembrie 2029.<br>Ambele sunt condiționate de fezabilitatea tehnică și economică | [`epbd-2024-romania.md`](epbd-2024-romania.md), „Pragul BACS: de la 290 kW la 70 kW, termen 31.12.2029” |
| C9 | Pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b), și nu este încă transpus în legea română. | [`ce-este-un-sistem-bms.md`](ce-este-un-sistem-bms.md), „Pe scurt” |
| C10 | Pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b), și nu este încă transpus în legea română. | [`date-esg-cladiri.md`](date-esg-cladiri.md), „Același buget, două obligații: BACS la 290 kW și datele ESG” |
| C11 | Pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b), și nu este încă transpus în legea română. | [`monitorizare-calitate-aer-epbd.md`](monitorizare-calitate-aer-epbd.md), „Legea 372/2005 în vigoare, EPBD netranspusă în legea română” |

Linked source: Directive (EU) 2024/1275 at <https://eur-lex.europa.eu/eli/dir/2024/1275/oj/eng>. Nine of the ten articles state the 70 kW threshold, most with the same sentence. `kpi-performanta-cladire` does not mention it.

### D. Indoor environmental quality

| # | Statement (RO, verbatim) | Where |
|---|--------------------------|-------|
| D1 | Directiva (UE) 2024/1275 cere ca, din 29 mai 2026, sistemele de automatizare și control al clădirilor (BACS) să fie capabile de monitorizarea calității mediului interior. | [`monitorizare-calitate-aer-epbd.md`](monitorizare-calitate-aer-epbd.md), „opening paragraphs, before the first heading” |
| D2 | Art. 13 alin. (4) lasă pragurile numerice în seama statelor membre: directiva nu fixează valori, iar toate valorile numerice din articol sunt repere de proiectare, orientative, nu praguri legale. | [`monitorizare-calitate-aer-epbd.md`](monitorizare-calitate-aer-epbd.md), „Pe scurt” |
| D3 | Art. 13 alin. (5) cere dispozitive de măsurare și control al calității aerului în clădirile nerezidențiale cu emisii zero, iar la cele existente la renovare majoră, unde e fezabil tehnic și economic. | [`monitorizare-calitate-aer-epbd.md`](monitorizare-calitate-aer-epbd.md), „Pe scurt” |
| D4 | Tot acolo, art. 13 alin. (5) cere ca noile clădiri nerezidențiale cu emisii zero să fie echipate cu dispozitive de măsurare și control al calității aerului interior, iar clădirile existente la renovare majoră, unde este fezabil. | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „EPBD 2024/1275: pragul de 70 kW și termenul 31 decembrie 2029” |
| D5 | Art. 13 alin. (5) prevede că clădirile nerezidențiale cu emisii zero se echipează cu dispozitive de măsurare și control al calității aerului interior, iar la clădirile existente cerința se aplică la renovare majoră, unde este fezabil. | [`epbd-2024-romania.md`](epbd-2024-romania.md), „Clădirile cu emisii zero: 1 ianuarie 2028 și 1 ianuarie 2030” |
| D6 | Directiva (UE) 2024/1275 prevede la art. 13 alin. (10) lit. d) că, din 29 mai 2026, sistemele BACS (sisteme de automatizare și control al clădirilor) trebuie să asigure și monitorizarea calității mediului interior. | [`kpi-performanta-cladire.md`](kpi-performanta-cladire.md), „KPI 9. Calitatea mediului interior, în procent din orele ocupate” |

### E. Transposition status

| # | Statement (RO, verbatim) | Where |
|---|--------------------------|-------|
| E1 | Termenul de transpunere a Directivei (UE) 2024/1275 este 29 mai 2026 (art. 35 alin. 1), iar România nu a transpus directiva integral, ci doar art. 17 alin. (15), prin OG 16/2025. | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „EPBD 2024/1275: pragul de 70 kW și termenul 31 decembrie 2029” |
| E2 | Termenul de transpunere a fost 29 mai 2026, conform art. 35 alin. (1), cu o singură excepție: 1 ianuarie 2025 pentru art. 17 alin. (15) | [`epbd-2024-romania.md`](epbd-2024-romania.md), „Stadiul transpunerii în România: termen 29 mai 2026, depășit” |
| E3 | Din toată directiva, România a transpus până acum un singur element: art. 17 alin. (15), prin OG 16/2025. | [`epbd-2024-romania.md`](epbd-2024-romania.md), „opening paragraphs, before the first heading” |
| E4 | Din Directiva 2024/1275 a fost preluat doar art. 17 alin. (15), prin OG 16/2025. | [`monitorizare-calitate-aer-epbd.md`](monitorizare-calitate-aer-epbd.md), „Legea 372/2005 în vigoare, EPBD netranspusă în legea română” |
| E5 | La 15 iulie 2026, Comisia Europeană a trimis scrisori de punere în întârziere tuturor celor 27 de state membre, inclusiv României, pentru netranspunerea directivei. Termenul expirase la 29 mai 2026, iar statele au două luni pentru a răspunde | [`epbd-2024-romania.md`](epbd-2024-romania.md), „opening paragraphs, before the first heading” |
| E6 | Ce este deja în Legea 372/2005 se sancționează acum; ce se află doar în Directiva (UE) 2024/1275 devine sancționabil la transpunere, iar transpunerea nu resetează termenele. | [`epbd-2024-romania.md`](epbd-2024-romania.md), „Stadiul transpunerii în România: termen 29 mai 2026, depășit” |
| E7 | Termenele rămân valabile indiferent de data la care România adoptă legea de transpunere | [`epbd-2024-romania.md`](epbd-2024-romania.md), „Concluzie” |

Linked sources: the Commission press release of 15 July 2026 (<https://energy.ec.europa.eu/news/commission-calls-eu-countries-transpose-reinforced-rules-energy-performance-buildings-2026-07-15_en>), cited by six articles, and the EUR-Lex summary (<https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:C_202506438>). No article links OG 16/2025.

### F. Zero-emission buildings and MEPS

| # | Statement (RO, verbatim) | Where |
|---|--------------------------|-------|
| F1 | MEPS vizează cele mai slabe 16% din fondul nerezidențial până în 2030 și cele mai slabe 26% până în 2033, cu referință la 1 ianuarie 2020. | [`epbd-2024-romania.md`](epbd-2024-romania.md), „Pe scurt” |
| F2 | Standardul de clădire cu emisii zero se aplică din 1 ianuarie 2028 clădirilor publice noi și din 1 ianuarie 2030 tuturor clădirilor noi. | [`epbd-2024-romania.md`](epbd-2024-romania.md), „Pe scurt” |
| F3 | \| 01.01.2028 \| Clădirile noi ale organismelor publice: clădiri cu emisii zero (ZEB) \| Dir. (UE) 2024/1275 (capitolul privind ZEB) \| Obligație UE, netranspusă \| | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „Calendarul termenelor: 31 decembrie 2024, 29 mai 2026, 31 decembrie 2029” |
| F4 | \| 2030 \| MEPS: cele mai slabe 16% din fondul nerezidențial (referință 01.01.2020) \| Dir. (UE) 2024/1275, art. 9 alin. (1) \| Obligație UE, netranspusă \| | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „Calendarul termenelor: 31 decembrie 2024, 29 mai 2026, 31 decembrie 2029” |

### G. Fines (Legea 238/2024)

| # | Statement (RO, verbatim) | Where |
|---|--------------------------|-------|
| G1 | Legea nr. 238/2024, adoptată la 19 iulie 2024 și publicată în Monitorul Oficial la 25 iulie 2024, modifică Legea 372/2005 și majorează amenzile cu până la aproximativ 400% față de nivelurile anterioare. Tranșele merg de la 5.000-7.500 lei până la 10.000-20.000 lei în regimul general, cu o tranșă distinctă de 5.000-30.000 lei pentru autoritățile administrației publice locale | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „Amenzile din Legea 238/2024: de la 5.000 la 30.000 lei” |
| G2 | Neechiparea cu sisteme de automatizare și control al clădirilor nu atrage automat tranșa maximă și nici invers. | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „Amenzile din Legea 238/2024: de la 5.000 la 30.000 lei” |
| G3 | Legea 238/2024, adoptată la 19 iulie 2024 și publicată în Monitorul Oficial la 25 iulie 2024, a modificat Legea 372/2005 și a majorat amenzile cu până la aproximativ 400%, pe tranșe de 5.000-7.500 lei, 7.500-10.000 lei, 10.000-20.000 lei și 5.000-30.000 lei pentru autoritățile locale, cu sancțiunea complementară a suspendării dreptului de practică pentru auditori, între 12 și 24 de luni. | [`sisteme-bms-cladiri.md`](sisteme-bms-cladiri.md), „Sancțiuni: amenzi majorate cu până la 400% prin Legea 238/2024” |
| G4 | Singura obligație BACS sancționabilă astăzi în România este pragul de 290 kW din Legea 372/2005; termenul a fost 31 decembrie 2024 și este depășit. | [`epbd-2024-romania.md`](epbd-2024-romania.md), „Pe scurt” |
| G5 | Amenzile majorate prin Legea 238/2024 merg până la 20.000 lei pentru operatori și până la 30.000 lei pentru autoritățile locale. | [`epbd-2024-romania.md`](epbd-2024-romania.md), „Pe scurt” |
| G6 | Pentru proprietari și investitori: cerința de monitorizare a calității mediului interior nu este opozabilă prin lege națională, iar Legea 238/2024 a majorat regimul sancționator al Legii 372/2005 în general, fără o tranșă dedicată BACS. | [`monitorizare-calitate-aer-epbd.md`](monitorizare-calitate-aer-epbd.md), „Legea 372/2005 în vigoare, EPBD netranspusă în legea română” |
| G7 | Termenul a fost 31 decembrie 2024 și este depășit, iar sancțiunile au fost majorate prin Legea nr. 238/2024. | [`caiet-de-sarcini-bms.md`](caiet-de-sarcini-bms.md), „Pragul de 290 kW și capabilitățile cerute de Directiva 2024/1275” |

Linked source: Legea 238/2024 at <https://legislatie.just.ro/public/DetaliiDocument/285769>. No article names the article of Legea 372/2005 that sanctions a missing BACS.

### H. Other laws: NIS2, CSRD, energy efficiency

| # | Statement (RO, verbatim) | Where |
|---|--------------------------|-------|
| H1 | Pe partea de reglementare, NIS2 a fost transpusă în România prin OUG nr. 155/2024, cu DNSC ca autoritate. | [`scada-vs-bms.md`](scada-vs-bms.md), „Granița IT/OT: segmentare, IEC 62443 și OUG 155/2024” |
| H2 | OUG nr. 155/2024 nu conține un articol dedicat sistemelor OT, iar aplicabilitatea la SCADA și BMS rămâne o interpretare. | [`scada-vs-bms.md`](scada-vs-bms.md), „Pe scurt” |
| H3 | Pentru operatorii din sfera NIS2, transpusă prin OUG nr. 155/2024, aprobată prin Legea nr. 124/2025, obligațiile sunt neutre tehnologic și acoperă sistemele informatice folosite pentru furnizarea serviciului. Aplicarea lor la BMS este o interpretare practică, nu un articol de lege dedicat. | [`caiet-de-sarcini-bms.md`](caiet-de-sarcini-bms.md), „11. Securitate cibernetică OT: VLAN dedicat, VPN cu doi factori, conturi nominale” |
| H4 | Directiva (UE) 2026/470 restrânge sfera raportării CSRD la întreprinderile cu peste 1.000 de angajați și peste 450 de milioane EUR cifră de afaceri netă, ambele condiții cumulativ, cu prima raportare pentru exercițiile financiare începute de la 1 ianuarie 2027. | [`date-esg-cladiri.md`](date-esg-cladiri.md), „Pe scurt: șase verigi, 15 minute, 24 de luni” |
| H5 | OMF nr. 1421/2025, publicat la 22 august 2025, a aplicat „stop-the-clock”: valul 2 amânat la 2028 (exercițiul 2027), valul 3 la 2029 (exercițiul 2028). România nu a transpus încă Directiva (UE) 2026/470, termenul de transpunere fiind 19 martie 2027. | [`date-esg-cladiri.md`](date-esg-cladiri.md), „România: transpunerea Directivei (UE) 2026/470 până la 19 martie 2027” |
| H6 | Nici Directiva (UE) 2023/1791 nu este transpusă în România; Legea 121/2014 rămâne în vigoare, cu pragul de 1.000 tep/an pentru manager energetic atestat și audit energetic la 4 ani. | [`date-esg-cladiri.md`](date-esg-cladiri.md), „Același buget, două obligații: BACS la 290 kW și datele ESG” |
| H7 | Directiva (UE) 2026/470 („pachetul Omnibus”, în vigoare din 18.03.2026) restrânge sfera CSRD la întreprinderile cu peste 1.000 de angajați și peste 450 mil. EUR cifră de afaceri netă | [`epbd-2024-romania.md`](epbd-2024-romania.md), „Legătura cu ESG: CSRD peste 1.000 de angajați și 450 mil. EUR” |
| H8 | Comisia a adoptat actele delegate privind ESRS revizuit și standardul voluntar la începutul lunii iulie 2026 (anunț EFRAG, 3 iulie 2026). Actele delegate privind ESRS revizuit se află în perioada de scrutin al Parlamentului European și al Consiliului, deci nu sunt încă definitive. | [`date-esg-cladiri.md`](date-esg-cladiri.md), „ESRS revizuit, încă în scrutin, pentru exerciții din 1 ianuarie 2027” |

Linked sources: OUG 155/2024 (<https://legislatie.just.ro/public/DetaliiDocument/293121>), OMF 85/2024 (<https://legislatie.just.ro/Public/DetaliiDocument/278502>), Directive (EU) 2026/470 (<https://eur-lex.europa.eu/eli/dir/2026/470/oj/eng>), Directive (EU) 2023/1791 (<https://eur-lex.europa.eu/eli/dir/2023/1791/oj?locale=ro>), EFRAG announcement of 3 July 2026 (<https://www.efrag.org/en/news-and-calendar/news/european-commission-publishes-delegated-act-on-revised-esrs-and-voluntary-sustainability-reporting>).

### I. Standards

| # | Statement (RO, verbatim) | Where |
|---|--------------------------|-------|
| I1 | Modelul de zone și conduite din seria IEC 62443 este referința uzuală pentru partea industrială. | [`scada-vs-bms.md`](scada-vs-bms.md), „Granița IT/OT: segmentare, IEC 62443 și OUG 155/2024” |

IEC 62443 is the only technical standard any article names, without an edition (linked to <https://www.iec.ch/blog/understanding-iec-62443>). `date-esg-cladiri` also names the ESRS reporting standards and states their legal status (H8). `sisteme-bms-cladiri` mentions GMP validation („Nu înlocuiește un EMS validat GMP.”) without naming a text. `scada-vs-bms` also names protocols (BACnet, Modbus, OPC UA, IEC 60870-5-104, DNP3) as technology, not as standards to comply with.

### J. Life-safety and compliance statements

| # | Statement (RO, verbatim) | Where |
|---|--------------------------|-------|
| J1 | \| Instalațiile HVAC: încălzire, ventilare, climatizare \| Detecția incendiului: BMS preia alarma și oprește ventilația, dar centrala rămâne autonomă \| | [`ce-este-un-sistem-bms.md`](ce-este-un-sistem-bms.md), „HVAC comandat direct, detecția incendiului și controlul accesului doar integrate” |
| J2 | Caietul de sarcini cere ca BMS-ul să „gestioneze" incendiul, deși centrala de incendiu rămâne autonomă, iar sistemul BMS preia semnalul și oprește ventilația. | [`ce-este-un-sistem-bms.md`](ce-este-un-sistem-bms.md), „Termostatul inteligent, smart home și tabloul de automatizare nu sunt BMS” |
| J3 | Regula practică: instalațiile cu funcție de siguranța vieții își păstrează logica proprie. BMS le vede și reacționează, fără să le înlocuiască. | [`ce-este-un-sistem-bms.md`](ce-este-un-sistem-bms.md), „HVAC comandat direct, detecția incendiului și controlul accesului doar integrate” |
| J4 | \| Pompe, stații de hidrofor, contorizarea energiei și a apei \| Detecția gazelor: interblocare, cu logică proprie păstrată \| | [`ce-este-un-sistem-bms.md`](ce-este-un-sistem-bms.md), „HVAC comandat direct, detecția incendiului și controlul accesului doar integrate” |
| J5 | HVAC. Nucleul sistemului: centrale de tratare a aerului, ventiloconvectoare, sisteme VRF, ventilații de desfumare în regim de test. | [`sisteme-bms-cladiri.md`](sisteme-bms-cladiri.md), „Cele opt instalații conectate la BMS: HVAC, contorizare, iluminat” |
| J6 | Stația de pompare pentru incendiu. Atenție la limită: sistemul BMS monitorizează starea (pompă în funcțiune, avarie, nivel în rezervor, poziția vanelor), dar nu comandă și nu înlocuiește automatizarea dedicată de securitate la incendiu, care rămâne un sistem independent, cu regim propriu de verificare. | [`sisteme-bms-cladiri.md`](sisteme-bms-cladiri.md), „Cele opt instalații conectate la BMS: HVAC, contorizare, iluminat” |
| J7 | Nu. Sistemele de securitate la incendiu rămân independente și certificate separat. Sistemul BMS monitorizează stările relevante, cum sunt pompa în funcțiune, avaria sau nivelul în rezervor, și poate reacționa informațional, dar nu preia funcții de comandă în regim de securitate la incendiu. | [`sisteme-bms-cladiri.md`](sisteme-bms-cladiri.md), „Întrebări frecvente” |
| J8 | protecția la îngheț, interblocarea cu detecția de incendiu, regimul de avarie. | [`caiet-de-sarcini-bms.md`](caiet-de-sarcini-bms.md), „6. Secvențele de funcționare, scrise ca text și anexate la caiet” |
| J9 | Interblocările cu detecția de incendiu sunt descrise. | [`caiet-de-sarcini-bms.md`](caiet-de-sarcini-bms.md), „Checklist de 20 de puncte înainte de licitație” |
| J10 | pentru fiecare obligație distinctă se verifică apoi dacă sistemul existent îndeplinește cele trei capabilități din art. 27 alin. (5), caz în care clădirea este conformă și rămâne de documentat | [`obligatie-bacs-legea-372-2005.md`](obligatie-bacs-legea-372-2005.md), „Puterea nominală utilă se citește pe plăcuță, nu pe factură” |

Diagrams add two more: A02-1 (`obligatie-bacs-legea-372-2005`) answers the capabilities question with „DA → conform, documentează”, and A08-2 (`kpi-performanta-cladire`) calls one deliverable „Dosarul de conformare”, „dovada capabilităților cerute de lege”.

### Statements that look inconsistent between articles

1. **Where the three capabilities come from.** `ce-este-un-sistem-bms` (B1) and `scada-vs-bms` (B3) say Legea 372/2005 requires them („Legea nu cere o cutie, ci trei capabilități”, „Legea cere trei capabilități”). `obligatie-bacs-legea-372-2005` calls them „Cele trei capabilități cerute de art. 27 alin. (5)” and says „Legea cere trei capabilități cumulative” (B4), but gives Directive (EU) 2024/1275 art. 13 alin. (10) as „Sursa cerințelor funcționale” (B5). `caiet-de-sarcini-bms` (B7), `sisteme-bms-cladiri` (B8), `epbd-2024-romania` (B9), `date-esg-cladiri` (B10) and `monitorizare-calitate-aer-epbd` (B11) attribute them to the Directive only. The quoted text of art. 27 alin. (5) names no capability. Whether the capabilities are in Romanian law in force needs a check against the consolidated law.
2. **What the BMS does on a fire alarm.** `ce-este-un-sistem-bms` (J1, J2) says „BMS preia alarma și oprește ventilația” and „sistemul BMS preia semnalul și oprește ventilația”. `sisteme-bms-cladiri` says the BMS „nu preia funcții de comandă în regim de securitate la incendiu” (J7), yet lists „ventilații de desfumare în regim de test” under HVAC (J5). `caiet-de-sarcini-bms` (J8, J9) asks for „interblocarea cu detecția de incendiu” without saying which system carries it out. Guardrails rule 11 settles it for the app: the fire system or a hardwired interlock performs the reaction, smoke control and gas shut-off are life-safety, and the BMS only monitors, displays, logs and alarms.
3. **Whether a missing BACS is itself fined.** `epbd-2024-romania` (G4) calls the 290 kW rule „Singura obligație BACS sancționabilă astăzi în România”. `monitorizare-calitate-aer-epbd` (G6) says Legea 238/2024 raised fines „în general, fără o tranșă dedicată BACS”. `obligatie-bacs-legea-372-2005` (G2) says the tranche must be read from the consolidated law and that non-installation „nu atrage automat tranșa maximă și nici invers”. None names the sanctioning article.
4. **The quoted text of art. 27 alin. (5) ends three ways.** `obligatie-bacs-legea-372-2005` (A2) ends it with „pentru clădiri...”, `epbd-2024-romania` (A16) with „pentru clădiri” and no full stop, `monitorizare-calitate-aer-epbd` (A19) with „pentru clădiri.” The words are the same. Only the first marks the quote as shortened; the other two present it as ending there. The consolidated law decides which is right.
5. **Short form in `caiet-de-sarcini-bms`.** Its „Pe scurt” (A13) cites only art. 27 alin. (5) and says „automatizare peste 290 kW”, without „pe familie de sisteme” and without art. 29 alin. (6). Its body and every other article give both articles and the per-family rule.
6. **NIS2.** `caiet-de-sarcini-bms` (H3) says OUG nr. 155/2024 was „aprobată prin Legea nr. 124/2025”. `scada-vs-bms` (H1, H2) does not mention the approving law. Not a contradiction, but only one source for it.
7. **A compliance verdict.** `obligatie-bacs-legea-372-2005` (J10) and its diagram A02-1 call a building with the three capabilities „conformă” / „conform”. The other articles avoid a verdict. Rule 11 forbids the app from saying a building is compliant.

The threshold values, deadlines and article numbers themselves agree across the ten articles, the covers and the diagrams: 290 kW per family of systems with 31 December 2024 (Legea 372/2005, art. 27 alin. (5) and art. 29 alin. (6)); 70 kW with 31 December 2029 (Directive art. 13 alin. (9) lit. b), not transposed); indoor environmental quality from 29 May 2026 (art. 13 alin. (10) lit. d)); transposition deadline 29 May 2026 (art. 35 alin. (1)); letters of formal notice on 15 July 2026; ZEB for new public buildings from 1 January 2028 and all new buildings from 1 January 2030; MEPS 16% by 2030 and 26% by 2033 (art. 9 alin. (1)); fines of 5.000-30.000 lei under Legea 238/2024.

## Reserved terms in the branch articles

**For the app's reuse only.** The website is not bound by the app's guardrails, so nothing below is an error in the articles. The list shows which sentences the app's reserved-term check would flag if the app reused article text in its own copy, templates, prompts or AI examples. Under `docs/guardrails.md` section 2.8, reserved terms are allowed only in action labels, in badges, status lines and sentences built from stored state, in verbatim document text shown as a quotation, and in registry qualifier labels. Everywhere else they are flagged.

**How the scan was done.**

- **Terms.** The reserved-term list in `docs/guardrails.md` section 2.8 (English and Romanian). Both lists were applied to all text, as the check uses one shared list. Matching is whole-word and ignores case and diacritics, as section 2.8 says.
- **Inflected forms.** Romanian forms of the listed words were matched too, by stem: `garant*`, `certific*`, `conform*`, `verific*` and `confirm*` (the forms `../../brand/voice-and-messaging.md` section 7.10 notes), and by the same rule `ofert*`, `definitiv*`, `exact*`, `final*`, `cotați*` and `deviz*`. English stems were `guarante*`, `certifi*`, `complian*`, `complie*`, `comply`, `verifi*`, `quot*`, `offer*`, plus `confirms`, `meet` and `meets`. The check as specified in section 2.8 is whole-word only, so the rows marked "inflected" would not be flagged by it today. Section 7.10 of the voice file records this as a possible gap, which needs the approver's decision (proposal 29 in `design/dashboards-spec.md` section 7.2). The verb „oferă” (offers) is not a form of „ofertă” and was not matched. „precis” is not on the Romanian list (voice file section 7.6) and was not matched either.
- **Text scanned.** For the ten branch files: the article text (body, headings, the navigation list, figure captions, FAQ and closing note), the verbatim page strings in "Page facts" (H1, lead, `<title>`, meta description) and the text transcribed from the cover and diagrams. For the two main-branch files: the Romanian and English article text, from "Title and standfirst" to the related-articles block. Not scanned: this folder's own annotations, the "Sources and links" lists (their anchor texts repeat body text), and the `LINKS-TO-REACTIVATE` comments, which the page does not show.
- **Sentences.** Each sentence is copied verbatim from the article file, with Markdown markup removed (bold, italics, link syntax and the site paths added after internal link text). A heading, a list item, a table cell or a quoted image text counts as one sentence. Every sentence was checked by script to occur in its file. „Line” is the line in the article file as of this edit.
- **Negation does not help.** A whole-word check flags a term whatever the sentence says, so disclaimers such as „Nu sunt ofertă” are hits too.

**Result.** 268 hits in 249 sentences: 58 whole-word matches of a listed term and 210 inflected forms. Most are ordinary uses: „ofertă” and „oferte” for a supplier's bid, „se verifică” for "is checked", „conformare” in the link text „materialele despre reglementări și conformare” and in „Dosarul de conformare” (diagram A08-2), and „verificate” in the closing note on legal verification. A few read as claims the app could not make:

- a compliance verdict: „DA → conform, documentează” (diagram A02-1) and „caz în care clădirea este conformă” (`obligatie-bacs-legea-372-2005`, also listed as J10 above);
- guarantees: „timp de intervenție garantat” (`cost-sistem-bms`), „debit minim garantat” (`monitorizare-calitate-aer-epbd`), „nu există interoperabilitate garantată” (`sisteme-bms-cladiri`);
- certification of life-safety systems: „rămân autonome și certificate separat” and „rămân independente și certificate separat” (`sisteme-bms-cladiri`);
- the stage words „ofertă fermă” (`cost-sistem-bms` FAQ) and „deviz” (`caiet-de-sarcini-bms`), which rule 10 ties to stored quotation records;
- on `main`, "to meet its Green Key certification" / „pentru a-și îndeplini certificarea Green Key” (`optimizare-hotel-bms`), a certification credited to the automation.

Hits per file: `sisteme-bms-cladiri.md` 40, `caiet-de-sarcini-bms.md` 52, `date-esg-cladiri.md` 31, `obligatie-bacs-legea-372-2005.md` 24, `scada-vs-bms.md` 6, `cost-sistem-bms.md` 46, `epbd-2024-romania.md` 15, `ce-este-un-sistem-bms.md` 9, `kpi-performanta-cladire.md` 17, `monitorizare-calitate-aer-epbd.md` 22, `eficienta-bms.md` 0, `optimizare-hotel-bms.md` 6.

### Branch articles (`redesign-2026`, unmerged)

> **Unmerged branch content.** The sentences in this part come from the ten articles on the branch `origin/redesign-2026` (text at commit `d2d15d2`, covers and diagrams at `af81353`). The branch is not merged into `main`, and it will not be merged (owner decision, 2026-09-24). This part is for reference only.

#### `sisteme-bms-cladiri.md`

| Line | Sentence (verbatim) | Term |
|------|---------------------|------|
| 57 | Reunește senzori, controlere, tablouri de automatizare și o stație de supervizare într-un sistem care produce date verificabile. | `verificat / verified`, inflected („verificabile”) |
| 74 | Fie există istoric și se poate verifica ce s-a întâmplat, fie rămâne cuvântul unui om împotriva cuvântului altuia. | `verificat / verified`, inflected („verifica”) |
| 82 | În discuțiile de conformare se folosește BACS, în discuțiile cu furnizorii se folosește BMS. | `conform / conforms`, inflected („conformare”) |
| 94 | Două cifre din tabelul de mai jos merită scoase în text, pentru că se verifică la achiziție: rezerva liberă de puncte pe controlerele DDC, adică pe regulatoarele digitale directe, se cere la minimum 15-20%, iar senzorii de CO2 se decalibrează în 2-3 ani și aproape nimeni nu îi verifică. | `verificat / verified`, inflected („verifică”) |
| 96 | Ce se verifică la achiziție | `verificat / verified`, inflected („verifică”) |
| 98 | Senzorii de CO2 se decalibrează în 2-3 ani și aproape nimeni nu îi verifică; cei cu autocalibrare rămân utilizabili mai mult. | `verificat / verified`, inflected („verifică”) |
| 100 | Clasa de exactitate. | `exact`, inflected („exactitate”) |
| 109 | Un detaliu de comparare a ofertelor. | `ofertă`, inflected („ofertelor”) |
| 109 | Două oferte care par să difere cu o treime descriu, la citire atentă, două sisteme diferite. | `ofertă`, inflected („oferte”) |
| 123 | Condițiile care nu se negociază: ventilatorul nu pornește dacă clapeta de aer proaspăt nu e deschisă; bateria de încălzire cu apă intră în protecție la îngheț și oprește ventilatorul; pompa de circulație nu pornește fără confirmarea debitului. | `confirmat / confirmed`, inflected („confirmarea”) |
| 139 | Atenție la limită: sistemul BMS monitorizează starea (pompă în funcțiune, avarie, nivel în rezervor, poziția vanelor), dar nu comandă și nu înlocuiește automatizarea dedicată de securitate la incendiu, care rămâne un sistem independent, cu regim propriu de verificare. | `verificat / verified`, inflected („verificare”) |
| 140 | Sistemele de securitate rămân autonome și certificate separat. | `certificat / certified`, inflected („certificate”) |
| 144 | Dacă sistemul vorbește doar limba unui singur producător, toate extinderile viitoare vor fi ofertate de acel producător, la prețul lui. | `ofertă`, inflected („ofertate”) |
| 148 | Fără listă, nu există interoperabilitate garantată. | `garantat`, inflected („garantată”) |
| 155 | Se vede în anul cinci, când proprietarul vrea să adauge 40 de puncte pentru un etaj reamenajat și primește o singură ofertă. | `ofertă` |
| 175 | Reclamațiile de temperatură scad pentru că devin verificabile. | `verificat / verified`, inflected („verificabile”) |
| 220 | Imaginea de ansamblu a reglementărilor aplicabile clădirilor se află în materialele despre reglementări și conformare. | `conform / conforms`, inflected („conformare”) |
| 220 | Pentru un răspuns rapid pe o clădire concretă se poate cere o verificare a pragului de putere. | `verificat / verified`, inflected („verificare”) |
| 231 | Documentul care decide dacă ofertele vor fi comparabile între ele. | `ofertă`, inflected („ofertele”) |
| 237 | Verificare punct cu punct, testarea fiecărei secvențe, acordarea buclelor, testele de interblocare, simularea avariilor. | `verificat / verified`, inflected („Verificare”) |
| 239 | Tot ce s-a executat, așa cum s-a executat: scheme actualizate, liste de puncte finale, descrierea secvențelor implementate, copiile de siguranță ale programelor, licențele pe numele beneficiarului. | `final`, inflected („finale”) |
| 240 | Perioada de garanție și optimizarea sezonieră. | `garantat`, inflected („garanție”) |
| 244 | Cele 14 verificări înainte de semnarea recepției | `verificat / verified`, inflected („verificări”) |
| 246 | Lista finală de puncte, comparată cu cea din contract, cu diferențele explicate în scris. | `final`, inflected („finală”) |
| 247 | Fiecare punct fizic verificat individual, cu proces-verbal, nu prin sondaj. | `verificat` |
| 252 | Istoricizarea activă pentru punctele importante: se exportă o lună de date și se verifică rezoluția și golurile. | `verificat / verified`, inflected („verifică”) |
| 257 | Documentația as-built completă, verificată prin sondaj față de teren. | `verificat / verified`, inflected („verificată”) |
| 267 | Rezultatul: puncte care nu există în clădire, secvențe pentru echipamente care nu au fost montate, oferte care nu se pot compara. | `ofertă`, inflected („oferte”) |
| 272 | Se semnează pentru că oferta e cea mai ieftină și se plătește timp de un deceniu, la fiecare extindere. | `ofertă` |
| 294 | Zece întrebări separă o ofertă completă de una din care lipsesc licențele, orele de punere în funcțiune sau documentația. | `ofertă` |
| 297 | Cifra se cere în scris, în ofertă. | `ofertă` |
| 302 | Cine răspunde la 2 noaptea, în cât timp și ce înseamnă exact în contract? | `exact` |
| 323 | În documentele de conformare se scrie BACS, în discuțiile cu furnizorii se folosește BMS. | `conform / conforms`, inflected („conformare”) |
| 327 | Nu este o ofertă; intervalele complete, mentenanța și exemplele lucrate sunt în articolul dedicat costurilor. | `ofertă` |
| 343 | Sistemele de securitate la incendiu rămân independente și certificate separat. | `certificat / certified`, inflected („certificate”) |
| 347 | Clădirile care ajung să funcționeze bine sunt cele în care lista de puncte și secvențele de funcționare au fost scrise înainte de prima cerere de ofertă. | `ofertă` |
| 351 | Pentru un sistem care urmează să fie scos la ofertare, pasul util nu este cererea de prețuri, ci definirea a ceea ce se cumpără. | `ofertă`, inflected („ofertare”) |
| 353 | Pentru o a doua opinie asupra unui sistem existent sau pentru verificarea încadrării la 290 kW, discutăm punctual în cadrul serviciului de consultanță. | `verificat / verified`, inflected („verificarea”) |
| 355 | Informațiile juridice au fost verificate la 16.08.2026, față de textele publicate pe legislatie.just.ro și EUR-Lex. | `verificat / verified`, inflected („verificate”) |

#### `caiet-de-sarcini-bms.md`

| Line | Sentence (verbatim) | Term |
|------|---------------------|------|
| 57 | Descrie funcții verificabile la recepție: puncte de intrare și ieșire, secvențe, protocoale, livrabile, criterii de atribuire. | `verificat / verified`, inflected („verificabile”) |
| 57 | Un document care specifică produse în loc de funcții produce oferte care nu se pot compara. | `ofertă`, inflected („oferte”) |
| 59 | Costul se plătește de două ori: la ofertare, unde prețurile nu sunt comparabile, și la recepție, unde tot ce nu a fost cerut devine lucrare suplimentară. | `ofertă`, inflected („ofertare”) |
| 64 | Lista de puncte (I/O list) face ofertele comparabile: din ea rezultă controlerele, cablul și orele de programare. | `ofertă`, inflected („ofertele”) |
| 65 | Diferența de preț între două oferte vine, de cele mai multe ori, din numărul de puncte, nu din marca echipamentelor. | `ofertă`, inflected („oferte”) |
| 68 | Punerea în funcțiune se bugetează separat: ce nu are preț în ofertă dispare din execuție. | `ofertă` |
| 91 | Explicația comună: caietele pentru automatizări se scriu sub presiune de timp, la finalul proiectului de instalații. | `final`, inflected („finalul”) |
| 93 | Scrie numele produsului fără să îl scrie, iar ofertanții care nu îl vând se retrag. | `ofertă`, inflected („ofertanții”) |
| 94 | Fiecare ofertant își inventează propriul număr de puncte, iar diferența se plătește la final. | `final`; `ofertă`, inflected („ofertant”) |
| 135 | Confirmare funcționare ventilator | `confirmat / confirmed`, inflected („Confirmare”) |
| 157 | Interoperabilitate: BACnet/IP nativ, PICS la ofertare, Modbus, KNX, M-Bus | `ofertă`, inflected („ofertare”) |
| 159 | Se cer capabilități native, verificabile la ofertare, nu compatibilitate declarată. | `verificat / verified`, inflected („verificabile”); `ofertă`, inflected („ofertare”) |
| 161 | controlere cu BACnet/IP sau MS/TP nativ, cu PICS prezentat la ofertare; | `ofertă`, inflected („ofertare”) |
| 167 | Un programator care primește secvențe scrise nu improvizează, iar comisia de recepție are ce verifica. | `verificat / verified`, inflected („verifica”) |
| 177 | Este necesară confirmarea manuală din interfața de supervizare, după dispariția condiției de alarmă, cu înregistrarea utilizatorului și a momentului în jurnal. | `confirmat / confirmed`, inflected („confirmarea”) |
| 193 | La 15 minute fără confirmare, șef mentenanță | `confirmat / confirmed`, inflected („confirmare”) |
| 194 | Lipsă confirmare de funcționare, deviație peste 3 K mai mult de 30 de minute | `confirmat / confirmed`, inflected („confirmare”) |
| 194 | La 4 ore fără confirmare, devine P1 | `confirmat / confirmed`, inflected („confirmare”) |
| 215 | Nivelul de detaliu al sinopticelor este o cantitate ofertabilă, deci se cere în cifre. | `ofertă`, inflected („ofertabilă”) |
| 232 | grad de protecție și clasă de execuție conform standardului aplicabil; | `conform` |
| 239 | Punerea în funcțiune se bugetează ca poziție distinctă de deviz, în zile-om. | `deviz` |
| 241 | verificarea 100 % a punctelor, cu proces-verbal pe fiecare; | `verificat / verified`, inflected („verificarea”) |
| 245 | La o listă de 1.000 de puncte, verificarea integrală se planifică în săptămâni, nu în zile. | `verificat / verified`, inflected („verificarea”) |
| 247 | Documentația as-built, instruirea și garanția, ca livrabile care condiționează recepția | `garantat`, inflected („garanția”) |
| 254 | Lista de puncte finală | `final`, inflected („finală”) |
| 258 | Certificate nominale | `certificat / certified`, inflected ("Certificate") |
| 263 | Se mai cer: durata garanției, timpul de răspuns pe clase de alarmă și prețul mentenanței pe primii trei ani. | `garantat`, inflected („garanției”) |
| 267 | Atribuirea exclusiv pe preț livrează exact ce s-a plătit. | `exact` |
| 267 | Calificarea filtrează ofertanții incapabili, atribuirea departajează ofertele valide. | `ofertă`, inflected („ofertanții”); `ofertă`, inflected („ofertele”) |
| 270 | lista de puncte completată și o secvență model, prezentate la ofertare; | `ofertă`, inflected („ofertare”) |
| 278 | Transcrise în caietul de sarcini, devin verificabile: istoricizare la 15 minute pe energie, raport lunar de kWh/mp, alarmă la deviație de randament, obiecte BACnet standard. | `verificat / verified`, inflected („verificabile”) |
| 282 | Pentru încadrarea unei clădiri concrete se poate cere o verificare a pragului de putere pentru clădirea respectivă, iar contextul de reglementare este strâns în materialele despre reglementări și conformare. | `verificat / verified`, inflected („verificare”); `conform / conforms`, inflected („conformare”) |
| 289 | „Controlerele vor comunica nativ BACnet/IP sau BACnet MS/TP, fără gateway intermediar. Ofertantul prezintă documentul PICS al fiecărui tip de controler.” | `ofertă`, inflected („Ofertantul”) |
| 292 | „Orice modificare ulterioară va putea fi realizată de orice integrator instruit pe platforma ofertată. Ofertantul declară condițiile de acces la instruire.” | `ofertă`, inflected („ofertată”); `ofertă`, inflected („Ofertantul”) |
| 305 | Clauzele de inclus, formulate ca livrabile verificabile: | `verificat / verified`, inflected („verificabile”) |
| 307 | Toate licențele de server, de client, de driver de protocol și de puncte se emit pe numele beneficiarului, nu al integratorului, și se predau ca certificate la recepție. | `certificat / certified`, inflected („certificate”) |
| 309 | Taxa anuală de software, declarată la ofertare. | `ofertă`, inflected („ofertare”) |
| 309 | Mentenanța de software se cuantifică la ofertare, ca procent din valoarea componentei software, tipic 8-18 % pe an, și intră în costul total de deținere pe cinci ani. | `ofertă`, inflected („ofertare”) |
| 315 | Sovitech Control a întâlnit situația în modernizări din București destul de des încât clauza aceasta să fie prima verificată la preluarea unui sistem. | `verificat / verified`, inflected („verificată”) |
| 322 | Detaliu de teren: senzorii de CO2 se decalibrează în 2-3 ani și aproape nimeni nu îi verifică, deci „se păstrează” este o decizie care se ia după măsurare. | `verificat / verified`, inflected („verifică”) |
| 340 | Cerințele de protocol sunt native, cu PICS cerut la ofertare. | `ofertă`, inflected („ofertare”) |
| 350 | Punerea în funcțiune este poziție distinctă de deviz. | `deviz` |
| 368 | Nu lungimea contează, ci verificabilitatea. | `verificat / verified`, inflected („verificabilitatea”) |
| 372 | Soluția mai bună în ambele cazuri: se specifică funcții verificabile, nu produse. | `verificat / verified`, inflected („verificabile”) |
| 376 | Dacă proiectul nu are specialist de automatizări, lista de puncte poate fi elaborată de un integrator ca serviciu de consultanță, separat de execuție, pentru ca autorul specificației să nu fie și singurul ofertant posibil. | `ofertă`, inflected („ofertant”) |
| 398 | Informațiile juridice au fost verificate la 17.08.2026. | `verificat / verified`, inflected („verificate”) |
| 30 | *Page: Meta description:* Cum se scrie un caiet de sarcini BMS care produce oferte comparabile: structura pe 15 sectiuni, lista de puncte, secvente de functionare si model DOCX. | `ofertă`, inflected („oferte”) |

#### `date-esg-cladiri.md`

| Line | Sentence (verbatim) | Term |
|------|---------------------|------|
| 57 | Datele pentru raportarea ESG a unei clădiri vin dintr-un lanț cu șase verigi: punctul de măsură, achiziția, istoricizarea, agregarea, verificarea și raportarea. | `verificat / verified`, inflected („verificarea”) |
| 63 | Datele de consum trec prin șase verigi: punct de măsură, achiziție, istoricizare, agregare, verificare, raportare. | `verificat / verified`, inflected („verificare”) |
| 71 | Între un cazan care arde gaz și rândul din raportul de sustenabilitate există un traseu cu șase verigi: punctul de măsură, achiziția pe magistrală, istoricizarea, agregarea și normalizarea, verificarea și raportarea. | `verificat / verified`, inflected („verificarea”) |
| 97 | 1.400 MWh de energie finală pe an, pentru întreaga clădire, înseamnă mult sau puțin? | `final`, inflected („finală”) |
| 101 | Veriga 5, verificarea: reconcilierea cu factura, la 2-3% diferență | `verificat / verified`, inflected („verificarea”) |
| 103 | A cincea verigă a lanțului de date ESG este verificarea, iar instrumentul ei principal este reconcilierea cu factura: suma indexurilor de energie citite pe contoarele proprii trebuie să se apropie de cantitatea facturată de furnizor pentru aceeași perioadă. | `verificat / verified`, inflected („verificarea”) |
| 107 | Ce merge prost la verificare: nimeni nu compară suma contoarelor cu factura, erorile se compensează reciproc și par plauzibile, iar un an întreg de date se corectează manual în foaia de calcul, fără urmă a corecției. | `verificat / verified`, inflected („verificare”) |
| 111 | A șasea verigă a lanțului de date ESG este raportarea, iar abia acum se produc indicatorii finali: intensitatea energetică în kWh/mp/an și emisiile în tCO₂e. | `final`, inflected („finali”) |
| 115 | Fiecare dintre cele șase verigi se verifică în zece minute, cu o singură cerere adresată echipei tehnice: | `verificat / verified`, inflected („verifică”) |
| 117 | Cum se verifică în 10 minute | `verificat / verified`, inflected („verifică”) |
| 123 | Verificare | `verificat / verified`, inflected ("Verificare") |
| 152 | Cerința ca o ofertă care promite „rezolvarea ESG-ului” să se încadreze pe rândurile tabelului de mai sus scurtează discuția comercială. | `ofertă` |
| 172 | Actele delegate privind ESRS revizuit se află în perioada de scrutin al Parlamentului European și al Consiliului, deci nu sunt încă definitive. | `definitive (EN list)` |
| 224 | Marcarea datelor estimate față de cele măsurate nu este o slăbiciune, este exact ce caută un verificator. | `exact`; `verificat / verified`, inflected („verificator”) |
| 235 | La ce interval sunt salvate valorile de energie și unde se verifică asta? | `verificat / verified`, inflected („verifică”) |
| 245 | Verificarea credibilității datelor produse de un BMS este tratată în materialele despre date și raportare, iar arhitectura sistemelor, în ghidul complet BMS. | `verificat / verified`, inflected („Verificarea”) |
| 251 | Lista de capabilități se suprapune peste lanțul de date ESG: monitorizarea și înregistrarea continuă a consumului este veriga 3, istoricizarea; benchmarking-ul și detectarea pierderilor sunt verigile 4 și 5, agregarea cu normalizarea și verificarea prin reconciliere cu factura; interoperabilitatea este veriga 2, achiziția pe magistrală. | `verificat / verified`, inflected („verificarea”) |
| 253 | Contextul complet, în materialele despre reglementări și conformare. | `conform / conforms`, inflected („conformare”) |
| 257 | Argumentul de buget: dacă echiparea cu BACS la pragul de 290 kW pe familie de sisteme este oricum necesară, contoarele și istoricizarea montate acolo sunt exact sursa datelor pentru raportarea ESG. | `exact` |
| 261 | Fără ea, orice ofertă e o ghicitoare. | `ofertă` |
| 265 | Reconciliere contor-factură, verificarea golurilor din istoric, controlul valorilor imposibile, un raport de o pagină. | `verificat / verified`, inflected („verificarea”) |
| 287 | Conform Directivei (UE) 2026/470, în vigoare din 18 martie 2026: întreprinderile mari cu peste 1.000 de angajați și peste 450 de milioane EUR cifră de afaceri netă, ambele condiții cumulativ. | `conform` |
| 289 | Sunt standardele ESRS revizuite definitive? | `definitive (EN list)` |
| 291 | Comisia a adoptat actele delegate privind ESRS revizuit și standardul voluntar la începutul lunii iulie 2026, dar ele se află în perioada de scrutin al Parlamentului European și al Consiliului, deci nu sunt încă definitive. | `definitive (EN list)` |
| 297 | Concluzie: cele șase verigi se verifică în câteva ore | `verificat / verified`, inflected („verifică”) |
| 299 | Verificarea celor șase verigi, de la punctul de măsură la raportarea în kWh/mp/an, durează câteva ore și nu costă nimic. | `verificat / verified`, inflected („Verificarea”) |
| 299 | Rezultatul ei arată dacă cifrele semnate anul trecut ar fi rezistat la o verificare independentă. | `verificat / verified`, inflected („verificare”) |
| 307 | Informațiile juridice au fost verificate la 17.08.2026. | `verificat / verified`, inflected („verificate”) |
| 307 | Statusul actelor delegate ESRS și al transpunerii Directivei (UE) 2026/470 se modifică; sursele citate se verifică înainte de o decizie. | `verificat / verified`, inflected („verifică”) |
| 49 | *Page: Text on the diagrams:* Un contor de clasă 1 citit manual o dată pe lună produce aceeași calitate de raport ca o estimare: nu poate fi verificat, desfăcut pe zone sau comparat an la an. | `verificat` |

#### `obligatie-bacs-legea-372-2005.md`

| Line | Sentence (verbatim) | Term |
|------|---------------------|------|
| 88 | Înainte de construirea unui argument juridic pe acest text, se verifică forma consolidată la zi. | `verificat / verified`, inflected („verifică”) |
| 116 | certificatul de performanță energetică și raportul de audit energetic, dacă există. | `certificat / certified`, inflected („certificatul”) |
| 118 | În evaluările de conformare pe care Sovitech Control le face în clădiri aflate în exploatare, plăcuța și proiectul se contrazic mai des decât s-ar crede: cazanul înlocuit acum opt ani nu are aceeași putere ca cel din proiect, iar nimeni nu a actualizat cartea tehnică. | `conform / conforms`, inflected („conformare”) |
| 132 | Arborele de decizie, în proză, pentru cine îl citește o singură dată: dacă clădirea nu este nerezidențială, obligația nu se aplică; dacă este, se calculează separat puterea nominală utilă pe încălzire, inclusiv încălzire plus ventilare, și pe climatizare, inclusiv climatizare plus ventilare, iar fiecare familie care trece 290 kW generează o obligație distinctă; pentru fiecare obligație distinctă se verifică apoi dacă sistemul existent îndeplinește cele trei capabilități din art. 27 alin. (5), caz în care clădirea este conformă și rămâne de documentat, iar dacă nu le îndeplinește se verifică fezabilitatea tehnică și economică, cu două ieșiri posibile: obligație activă cu termen depășit din 31 decembrie 2024, sau excepție de fezabilitate, care se documentează în scris. | `verificat / verified`, inflected („verifică”); `conform / conforms`, inflected („conformă”) |
| 140 | Nu înlocuiesc verificarea plăcuțelor din clădirea evaluată. | `verificat / verified`, inflected („verificarea”) |
| 154 | constrângeri tehnice concrete: instalații fără posibilitate de reglaj, echipamente la final de viață; | `final` |
| 158 | Diferența se vede abia la un control sau la un due diligence, adică exact atunci când nu mai poate fi construită retroactiv. | `exact` |
| 178 | Punctele de verificare detaliate sunt grupate într-un checklist de audit BMS. | `verificat / verified`, inflected („verificare”) |
| 192 | Contextul complet este în materialele despre reglementări și conformare. | `conform / conforms`, inflected („conformare”) |
| 242 | Planificarea bugetului pe două orizonturi: conformarea la 290 kW, care este restantă din 31 decembrie 2024, și extinderea la pragul de 70 kW, cu termen 31 decembrie 2029, plus monitorizarea calității mediului interior. | `conform / conforms`, inflected („conformarea”) |
| 243 | Transformarea concluziilor într-o specificație tehnică înainte de cererea de oferte. | `ofertă`, inflected („oferte”) |
| 243 | Fără cerințe funcționale scrise, ofertele nu sunt comparabile. | `ofertă`, inflected („ofertele”) |
| 247 | Primul pas nu este cererea de oferte, ci aflarea cifrei, puterea nominală utilă, pentru fiecare activ. | `ofertă`, inflected („oferte”) |
| 261 | Climatizarea se verifică însă separat, la art. 29 alin. (6), ca familie de sisteme distinctă. | `verificat / verified`, inflected („verifică”) |
| 263 | Ce înseamnă exact „putere nominală utilă”? | `exact` |
| 269 | Se verifică dacă înregistrează și analizează continuu consumul, dacă produce indicatori comparabili în timp, dacă detectează pierderile de eficiență și anunță un responsabil și dacă poate comunica cu echipamente de la producători diferiți. | `verificat / verified`, inflected („verifică”) |
| 279 | Discută conformarea cu un inginer Sovitech | `conform / conforms`, inflected („conformarea”) |
| 281 | Cere o verificare a pragului de putere pentru clădirea evaluată. | `verificat / verified`, inflected („verificare”) |
| 283 | Rezultatul evaluării este o listă de lipsuri și un buget orientativ, nu o ofertă. | `ofertă` |
| 285 | Informațiile juridice au fost verificate la 16 august 2026, pe baza textelor publicate pe portalul legislativ al Ministerului Justiției și în Jurnalul Oficial al Uniunii Europene. | `verificat / verified`, inflected („verificate”) |
| 285 | Legea 372/2005 este un act modificat de mai multe ori: forma consolidată la zi se verifică înainte ca acest text să fie folosit într-o decizie de investiție sau într-un răspuns la control. | `verificat / verified`, inflected („verifică”) |
| 49 | *Page: Text on the diagrams:* DA → conform, documentează | `conform` |

#### `scada-vs-bms.md`

| Line | Sentence (verbatim) | Term |
|------|---------------------|------|
| 75 | În legea română apare ca BACS (Building Automation and Control System) și este obligatorie la clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme, conform Legii 372/2005, art. 27 alin. (5) și art. 29 alin. (6). | `conform` |
| 102 | Mii de alarme, cu confirmare obligatorie, ierarhizare pe siguranță, sortare pe cauză primă și rapoarte de flux de alarme | `confirmat / confirmed`, inflected („confirmare”) |
| 121 | Contorul dublat produce, la finalul lunii, două valori care nu se potrivesc. | `final`, inflected („finalul”) |
| 179 | Directorul tehnic: împărțirea pe zone de criticitate, înainte de ofertare | `ofertă`, inflected („ofertare”) |
| 181 | Decizia se ia la nivel de arhitectură, înainte de cererea de oferte. | `ofertă`, inflected („oferte”) |
| 223 | Informațiile juridice au fost verificate la 16.08.2026. | `verificat / verified`, inflected („verificate”) |

#### `cost-sistem-bms.md`

| Line | Sentence (verbatim) | Term |
|------|---------------------|------|
| 54 | Metode de estimare, benzi de preț pe punct și pe metru pătrat, linii de cost, mentenanță anuală și compararea a două oferte. | `ofertă`, inflected („oferte”) |
| 60 | Nu sunt ofertă și nu pot fi folosite ca bază contractuală. | `ofertă` |
| 70 | Diferența dintre două oferte vine de cele mai multe ori din numărul de puncte incluse, nu din marca echipamentelor. | `ofertă`, inflected („oferte”) |
| 83 | Cele zece verificări la compararea a două oferte | `verificat / verified`, inflected („verificări”); `ofertă`, inflected („oferte”) |
| 93 | Pentru o ofertă serioasă, cineva trebuie să fi văzut cel puțin următoarele: | `ofertă` |
| 97 | Tablourile existente: dacă se refolosesc, dacă mai au spațiu, dacă aparatajul e conform. | `conform` |
| 102 | În proiectele de modernizare executate de Sovitech Control, lista de puncte a lipsit din documentația predată în majoritatea cazurilor, iar refacerea ei a fost prima lucrare plătită înainte de orice ofertă. | `ofertă` |
| 104 | Un preț dat fără aceste informații nu este ofertă, ci un semn de intrare pe listă. | `ofertă` |
| 117 | Confirmare de funcționare ventilator, presostat de filtru murdar, stare disjunctor | `confirmat / confirmed`, inflected („Confirmare”) |
| 164 | O ofertă care iese la 2% din valoarea instalațiilor pentru o clădire de birouri nu este o afacere, ci o ofertă din care lipsește ceva: punerea în funcțiune, grafica sau licențele. | `ofertă` |
| 175 | Dulapuri, aparataj, cablaj intern, etichetare, verificări. | `verificat / verified`, inflected („verificări”) |
| 179 | Testarea fiecărui punct, verificarea sensului de acțiune, reglajul buclelor. | `verificat / verified`, inflected („verificarea”) |
| 179 | Capitolul cel mai des tăiat din ofertele ieftine și cel care decide dacă sistemul chiar economisește energie. | `ofertă`, inflected („ofertele”) |
| 180 | Scheme conforme cu execuția, lista finală de puncte, manual de operare, sesiuni cu echipa tehnică. | `conform / conforms`, inflected („conforme”); `final`, inflected („finală”) |
| 181 | Management de proiect și garanție | `garantat`, inflected („garanție”) |
| 181 | Coordonarea cu ceilalți executanți, testele de recepție, perioada de garanție. | `garantat`, inflected („garanție”) |
| 187 | Punerea în funcțiune este prima linie tăiată la negociere, pentru că nu se vede ca obiect fizic în listă, și prima care se plătește ulterior, în ore de intervenție facturate separat, când bucla oscilează și nimeni nu a verificat sensul de acțiune al vanei. | `verificat` |
| 194 | Multe platforme se licențiază pe număr de puncte, iar valoarea lor apare în ofertă abia la a doua rundă de clarificări. | `ofertă` |
| 211 | 2 vizite planificate pe an, verificare hardware, backup-uri, actualizări critice, suport telefonic | `verificat / verified`, inflected („verificare”) |
| 212 | 4 vizite pe an, reglaj sezonier, analiza alarmelor, raport lunar de performanță, timp de intervenție garantat | `garantat` |
| 215 | Un sistem neîntreținut derivează: setpointuri modificate manual și niciodată readuse, senzori dezetalonați, orare dezactivate „temporar" acum trei ani, iar derivația se plătește lunar în factura de energie, nu în cea de service. Fără backup verificat, o defecțiune de controler se transformă din intervenție de două ore în reprogramare de o săptămână. Acoperirea exactă este descrisă la contractul de întreținere pentru sisteme BMS. | `verificat`; `exact`, inflected („exactă”) |
| 222 | Scenariile de mai jos sunt exerciții ilustrative construite pentru acest articol, nu oferte și nu proiecte reale. | `ofertă`, inflected („oferte”) |
| 232 | Ipotezele proprii se verifică pe datele reale ale clădirii: cere un calcul de economie de energie pentru clădire. | `verificat / verified`, inflected („verifică”) |
| 237 | Se înlocuiesc controlerele, supervizarea, grafica și logica de funcționare, exact partea care s-a învechit. | `exact` |
| 242 | Cele zece verificări la compararea a două oferte | `verificat / verified`, inflected („verificări”); `ofertă`, inflected („oferte”) |
| 244 | O diferență de 30% între două oferte de sistem BMS este aproape întotdeauna o diferență de conținut, nu de preț, și vine din numărul de puncte incluse, nu din marca echipamentelor. | `ofertă`, inflected („oferte”) |
| 244 | Verificarea se face în această ordine: | `verificat / verified`, inflected („Verificarea”) |
| 246 | Lista de puncte anexată la ofertă este obligatorie; fără ea, comparația nu există. | `ofertă` |
| 253 | Garanția și componentele acoperite. | `garantat`, inflected („Garanția”) |
| 257 | Cerințele sunt deja formulate în modelul editabil de caiet de sarcini pentru BMS, ca ofertele să vină comparabile: cere modelul de caiet de sarcini BMS. | `ofertă`, inflected („ofertele”) |
| 262 | Programul de 150 de milioane de euro al Ministerului Energiei, din Fondul pentru Modernizare, se adresează operatorilor economici industriali participanți la EU-ETS, cu până la 30 de milioane de euro pe proiect, iar activele eligibile includ explicit „sisteme integrate de management al consumului de energie" (sursa: Ministerul Energiei). Programul a fost anunțat în 2025, cu ghidul în consultare, deci statusul se verifică la zi. Pentru clădirile publice, programele regionale au apeluri dedicate; în Regiunea Sud-Est, apelul 2.1.B a fost lansat la 4 iunie 2026 (sursa: ADR Sud-Est), cu apeluri echivalente în celelalte programe regionale. | `verificat / verified`, inflected („verifică”) |
| 271 | Este singurul mod de a arăta proprietarului că oferta mai scumpă este, pe punct, mai ieftină. | `ofertă` |
| 284 | Ca verificare rapidă, da. | `verificat / verified`, inflected („verificare”) |
| 286 | Cât durează până la o ofertă fermă? | `ofertă fermă` |
| 288 | O ofertă fermă cere vizită în clădire și listă de puncte agreată, deci uzual una până la trei săptămâni, în funcție de mărimea clădirii și de documentația existentă. | `ofertă fermă` |
| 294 | O ofertă mai ieftină cu 30% este o afacere bună? | `ofertă` |
| 296 | Comparația se face pe punct de date și pe conținut, cu cele zece verificări din acest articol. | `verificat / verified`, inflected („verificări”) |
| 310 | Ele nu constituie ofertă. | `ofertă` |
| 312 | Informațiile juridice au fost verificate la 16.08.2026. | `verificat / verified`, inflected („verificate”) |
| 27 | *Page: Lead, RO:* Intervale pe punct de date, pe mp și ca procent din instalații, trei exemple lucrate și cum compari două oferte. | `ofertă`, inflected („oferte”) |
| 30 | *Page: Meta description:* Cat costa un sistem BMS in 2026: intervale pe punct de date, pe mp si ca procent din instalatii, trei exemple lucrate si cum compari doua oferte. | `ofertă`, inflected („oferte”) |

#### `epbd-2024-romania.md`

| Line | Sentence (verbatim) | Term |
|------|---------------------|------|
| 93 | Termenul de transpunere a fost 29 mai 2026, conform art. 35 alin. (1), cu o singură excepție: 1 ianuarie 2025 pentru art. 17 alin. (15) (sinteza oficială a directivei). | `conform` |
| 97 | Imaginea completă a obligațiilor suprapuse pe o clădire din România se construiește din materialele despre reglementări și conformare. | `conform / conforms`, inflected („conformare”) |
| 119 | Pentru o clădire concretă se poate cere o verificare a pragului de putere pentru clădire. | `verificat / verified`, inflected („verificare”) |
| 160 | La orice renovare majoră planificată în următorii ani, calitatea aerului interior intră în pachetul de conformare, nu în lista de opțiuni de confort. | `conform / conforms`, inflected („conformare”) |
| 166 | O limită de care se lovește oricine operează astfel de senzori: elementele de CO2 se decalibrează în 2-3 ani, iar o cerință de monitorizare fără plan de recalibrare produce date, nu conformare. | `conform / conforms`, inflected („conformare”) |
| 209 | Un sistem BACS (sisteme de automatizare și control al clădirilor) instalat pentru conformare EPBD produce, ca efect secundar, datele auditabile pentru Scope 1 și 2. | `conform / conforms`, inflected („conformare”) |
| 213 | Pentru industrie: programul de 150 mil. EUR din Fondul pentru Modernizare al Ministerului Energiei, pentru operatori industriali participanți la EU-ETS, până la 30 mil. EUR pe proiect, cu active eligibile care includ explicit „sisteme integrate de management al consumului de energie” (anunțul Ministerului Energiei); ghidul era în consultare, deci statusul se verifică înainte de bugetare. | `verificat / verified`, inflected („verifică”) |
| 223 | Verificarea capabilităților din art. 13 alin. (10) lit. a) la d) pe sistemul existent | `verificat / verified`, inflected („Verificarea”) |
| 227 | Alinierea bugetului de CapEx la fereastra 2028-2029 și verificarea eligibilității pentru finanțare | `verificat / verified`, inflected („verificarea”) |
| 238 | Data ultimei verificări juridice este afișată la final. | `final`; `verificat / verified`, inflected („verificări”) |
| 263 | Încadrarea se face pe textul consolidat al legii, verificat pentru situația fiecărei clădiri. | `verificat` |
| 273 | Materialele publicate până acum sunt în arhiva de reglementări și conformare, iar pentru portofolii există o evaluare de expunere. | `conform / conforms`, inflected („conformare”) |
| 275 | Informațiile juridice au fost verificate la 17.08.2026. | `verificat / verified`, inflected („verificate”) |
| 275 | Statutul transpunerii se poate schimba, deci sursele citate se verifică înainte de o decizie de investiție. | `verificat / verified`, inflected („verifică”) |

#### `ce-este-un-sistem-bms.md`

| Line | Sentence (verbatim) | Term |
|------|---------------------|------|
| 103 | Transformă datele în rapoarte de consum, disponibilitate și conformare, exportabile către alte sisteme. | `conform / conforms`, inflected („conformare”) |
| 123 | Este primul lucru care lipsește din caietele de sarcini și ultimul care se cere la recepție, deși diferența de preț dintre două oferte vine, de regulă, din numărul de puncte, nu din marcă. | `ofertă`, inflected („oferte”) |
| 152 | În cererile de ofertă pe care Sovitech Control le primește la București, cea mai frecventă confuzie nu este cea cu SCADA, ci cea cu sistemul de detecție și semnalizare a incendiului. | `ofertă` |
| 190 | BMS ce inseamna, mai exact? | `exact` |
| 216 | A doua variantă costă aproape la fel și nu produce nici date, nici rapoarte, nici conformare. | `conform / conforms`, inflected („conformare”) |
| 220 | Pentru pragul legal, cere o verificare a pragului de putere pentru clădire, iar pentru etapa de implementare, pagina despre execuția unui sistem BMS. | `verificat / verified`, inflected („verificare”) |
| 222 | Informațiile juridice au fost verificate la 17.08.2026, pe textul Legii 372/2005 și pe Directiva (UE) 2024/1275, netranspusă la data verificării. | `verificat / verified`, inflected („verificate”); `verificat / verified`, inflected („verificării”) |
| 28 | *Page: Lead, EN:* The definition, the three meanings of the acronym, the functions, the components and the compliance threshold. | `compliant`, inflected ("compliance") |

#### `kpi-performanta-cladire.md`

| Line | Sentence (verbatim) | Term |
|------|---------------------|------|
| 85 | Referință, estimare de piață: orientativ 120-180 kWh/mp/an pentru birouri clasa A din București, ca energie finală, pe întreaga clădire, inclusiv părțile comune și spațiile închiriate, raportată la aria construită desfășurată, cu electric și termic însumate; clădirile prost reglate depășesc 220 kWh/mp/an. | `final`, inflected („finală”) |
| 88 | Reperul extern verificabil cel mai apropiat este Real Estate Environmental Benchmark 2023 al Better Buildings Partnership, care dă 120 kWh/mp/an mediană pentru un birou climatizat, pe 472 de clădiri, cu domeniul declarat identic: energie finală, întreaga clădire, arie construită. | `verificat / verified`, inflected („verificabil”); `final`, inflected („finală”) |
| 122 | La abatere: se verifică consemnul pe apa răcită, sarcina parțială, curățenia condensatoarelor și debitul pompelor. | `verificat / verified`, inflected („verifică”) |
| 128 | Sursa datelor: contorizarea orelor din controlerele de câmp, pe confirmarea de funcționare (releu de curent sau presostat), nu pe comandă. | `confirmat / confirmed`, inflected („confirmarea”) |
| 128 | Comanda spune ce s-a cerut, confirmarea ce s-a întâmplat. | `confirmat / confirmed`, inflected („confirmarea”) |
| 138 | La abatere: se reconfigurează secvența cu zonă neutră și se verifică dacă vanele închid complet la comandă zero. | `verificat / verified`, inflected („verifică”) |
| 143 | Formulă: alarme active la sfârșit de lună, repetate (aceeași sursă de peste trei ori), confirmate fără acțiune (%), timp mediu de închidere. | `confirmat / confirmed`, inflected („confirmate”) |
| 144 | Fără marcaj de confirmare și de închidere, indicatorul nu se poate construi. | `confirmat / confirmed`, inflected („confirmare”) |
| 156 | La abatere: se verifică debitul de aer proaspăt, poziția senzorului (unul montat lângă ușă sau în soare minte constant) și calibrarea. | `verificat / verified`, inflected („verifică”) |
| 156 | Senzorii de CO2 se decalibrează în 2-3 ani și aproape nimeni nu îi verifică. | `verificat / verified`, inflected („verifică”) |
| 168 | La abatere: se identifică punctele problemă, se verifică comunicația și se documentează perioada afectată. | `verificat / verified`, inflected („verifică”) |
| 181 | Confirmare de funcționare din controlere | `confirmat / confirmed`, inflected („Confirmare”) |
| 209 | Verificare pe teren, recalibrare, relocare. | `verificat / verified`, inflected ("Verificare") |
| 246 | Randamentul instalației de frig, orele de funcționare și încălzirea și răcirea simultană cer poziții de vane, confirmări de funcționare și temperaturi pe circuite, disponibile doar într-un sistem de automatizare cu istoricizare. | `confirmat / confirmed`, inflected („confirmări”) |
| 260 | Informațiile juridice au fost verificate la 17.08.2026. | `verificat / verified`, inflected („verificate”) |
| 49 | *Page: Text on the diagrams:* Dosarul de conformare – dovada capabilităților cerute de lege | `conform / conforms`, inflected („conformare”) |

#### `monitorizare-calitate-aer-epbd.md`

| Line | Sentence (verbatim) | Term |
|------|---------------------|------|
| 67 | Senzorii NDIR de CO₂ se decalibrează în 2-3 ani, iar verificarea lipsește din majoritatea contractelor de mentenanță. | `verificat / verified`, inflected („verificarea”) |
| 90 | Context complet, în materialele despre reglementări și conformare. | `conform / conforms`, inflected („conformare”) |
| 96 | Pentru particule, COV, radon și zgomot, tabelul dă ordinul de mărime, nu o valoare de conformare. | `conform / conforms`, inflected („conformare”) |
| 108 | Până atunci servesc ca referință de proiectare, nu ca test de conformare. | `conform / conforms`, inflected („conformare”) |
| 118 | Senzorul de CO₂ încetează astfel să fie un cost de conformare și devine intrarea unei bucle care scade consumul: debitul urmează ocuparea, fără să coboare sub minimul garantat. | `garantat`; `conform / conforms`, inflected („conformare”) |
| 139 | Reglaj pe CO₂, pe zone, cu debit minim garantat. | `garantat` |
| 141 | Ventilare cu o oră înainte de ocupare, oprire la final, regim redus în weekend. | `final` |
| 157 | Opt puncte de verificare: integrare în BMS, istoricizare 24 de luni, calibrare | `verificat / verified`, inflected („verificare”) |
| 159 | Cele opt verificări de mai jos se fac în această ordine. | `verificat / verified`, inflected („verificări”) |
| 161 | Verificarea se face fizic, nu în caietul de sarcini. | `verificat / verified`, inflected („Verificarea”) |
| 166 | Se verifică autocalibrarea și dacă mediul o permite. | `verificat / verified`, inflected („verifică”) |
| 167 | Când au fost verificați ultima dată? | `verificat / verified`, inflected („verificați”) |
| 168 | Verificarea periodică trebuie să fie poziție explicită în contractul de întreținere BMS, cu frecvență și raport scris. | `verificat / verified`, inflected („Verificarea”) |
| 170 | Cere checklistul de audit BMS pentru varianta extinsă a acestor verificări. | `verificat / verified`, inflected („verificări”) |
| 174 | Senzorii de CO₂ se decalibrează în 2-3 ani și aproape nimeni nu îi verifică. | `verificat / verified`, inflected („verifică”) |
| 183 | Cu un trend log de CO₂ pe 30 de zile discuția devine tehnică: fie se confirmă problema, fie se arată că ventilația a lucrat în parametri. | `confirmat / confirmed`, inflected („confirmă”) |
| 190 | Verificarea și calibrarea a ceea ce există. | `verificat / verified`, inflected („Verificarea”) |
| 213 | Cât de des trebuie verificați senzorii de CO₂? | `verificat / verified`, inflected („verificați”) |
| 215 | O verificare anuală, cu gaz de referință sau prin comparație cu un aparat etalonat, este practica uzuală. | `verificat / verified`, inflected („verificare”) |
| 227 | O zi de teren pentru o clădire medie, iar rezultatul este o listă de lucrări, nu o ofertă. | `ofertă` |
| 229 | Informațiile juridice au fost verificate la 17.08.2026. | `verificat / verified`, inflected („verificate”) |

### Main-branch articles (`main`, commit `e080614`)

#### `eficienta-bms.md`

No hits.

#### `optimizare-hotel-bms.md`

| Line | Sentence (verbatim) | Term |
|------|---------------------|------|
| 54 | For example, the Radisson Blu Hotel Bucharest — a 5-star hotel with 424 rooms and extensive facilities (restaurants, spa, fitness room, indoor and outdoor pools) — adopted intelligent automation to meet its Green Key certification and high energy efficiency standards. | `meets`, inflected ("meet"); `certificat / certified`, inflected ("certification") |
| 56 | De exemplu, Radisson Blu Hotel București — un hotel de 5 stele cu 424 de camere și facilități extinse (restaurante, spa, sală de fitness, piscine interioare și exterioare) — a adoptat automatizarea inteligentă pentru a-și îndeplini certificarea Green Key și standardele ridicate de eficiență energetică. | `certificat / certified`, inflected („certificarea”) |
| 76 | Reaching these goals requires precise monitoring and control of every system in the building. | `precise (EN list)` |
| 82 | As an authorised partner of the Swiss manufacturer SAUTER, Sovitech offers a complete range of BMS hardware (controllers, valves, sensors, thermostats) and software. | `offer`, inflected ("offers") |
| 193 | Sovitech specialists offer free energy audits for hotel properties. | `offer (EN list)` |

## Notes

- **No text addressed to an AI** was found in the article files on either branch. The branch file `docs/prompt-content-launch.md` is a prompt for an AI coding session about publishing this content. It was read as data only. None of it was followed or copied here.
- **Editorial sources outside the repo.** Comments on the branch say the ten articles were ported from finished drafts in a Google Drive folder (`lib/site-routes.ts`) and that each title tag and meta description is taken verbatim from the draft's "Part A" (`components/articles/index.ts`). Those drafts are not in the repository and were not read. On 2026-09-24 the owner decided not to import the Drive folder (`company/website/history.md` section 4.4).
- **Branch domain.** The branch's JSON-LD and `og:image` URLs use `https://sovitech-website-gaidenic.vercel.app`, a `vercel.app` address, not a SOVITECH domain.
- **Method.** The branch article files were produced by parsing the `.tsx` sources as text (no code was run), applying JSX whitespace rules, and checking by script that every word of each source body appears in its Markdown file. Internal site links (root-relative paths such as `/contact`) do not resolve outside the website, so the article files give them as the link text followed by the path in code, for example „lista de referințe (`/referinte`)”; external `https` links stay as links. Covers and diagrams were copied byte for byte and checked by SHA-256.
