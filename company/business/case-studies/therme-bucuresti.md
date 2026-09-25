# Case study: Therme București

This is a faithful markdown copy of the Therme București case study on the SOVITECH website, in English and Romanian, with every section, figure, quote and named product. It was copied from the website repository at commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11). The last section records the changes on the unmerged branch `redesign-2026` (commit `af81353`), for reference only. That branch is not SOVITECH's current position and will not be merged (owner decision, 2026-09-24).

Source: `app/resurse/studii-de-caz/therme-bucuresti/page.tsx` (route `/resurse/studii-de-caz/therme-bucuresti`), unless a section names another file.

## Status of this content

- **Marketing copy.** This is the company's own published account. Its figures (35%, €158K a year, 8,000 m², 6 weeks, 99.9%, 3 million visitors) are not verified engineering data and are not an approved reference dataset.
- **Not usable as values.** The app may not use them as values, defaults or benchmarks (guardrails rule 1, section 2.1, section 10).
- **Contradicted elsewhere.** Other pages of the same website give different savings, areas and names for this project. See "Inconsistencies on the website" below.
- **Unverified.** I have not checked any statement here against Therme or SOVITECH's project files.

## Page facts

| Item | RO | EN |
|------|----|----|
| Breadcrumb | Resurse / Studii de caz / Therme Bucharest | Resources / Case Studies / Therme Bucharest |
| Back link | Înapoi la studii de caz (→ `/resurse/referinte`) | Back to Case Studies |
| Category pill | HORECA — Spa & Wellness | HORECA — Spa & Wellness |
| Client | Therme București | Therme București |
| Industry | HORECA - Spa & Wellness | HORECA - Spa & Wellness |
| Service | Implementare BMS completă | Full BMS Implementation |
| Technology | SAUTER - BACnet / Modbus | SAUTER - BACnet / Modbus |
| Sidebar button | Cere o consultanță (→ `/contact`) | Request a Consultation |
| Share button | Distribuie / Copiat | Share / Copied |
| Hero image | `/thermal-spa-modern-building.jpg`, alt "Therme București — complex spa și wellness" | alt "Therme Bucharest - Spa and wellness complex" |
| Listing date and read time | 20 DEC 2025 · 8 MIN CITIRE (from `app/resurse/page.tsx`; the page itself shows no date) | DEC 20, 2025 · 8 MIN READ |
| Listing title | Cum a redus Therme Bucuresti costurile cu 38% | How Therme Bucharest cut costs by 38% |

The breadcrumb uses the English name "Therme Bucharest" in both languages. Nothing in the repo shows that the hero image is a photo of Therme.

## Headline

**RO.** Therme București a redus costurile energetice cu 35% prin automatizare BMS

**EN.** Therme Bucharest cut energy costs by 35% through BMS automation

**RO standfirst.** Cum cel mai mare complex spa din Europa a implementat un sistem integrat de management al clădirii pentru eficiență energetică și confort operațional.

**EN standfirst.** How Europe's largest spa complex implemented an integrated building management system for energy efficiency and operational comfort.

## Metrics card

| Value | RO | EN |
|-------|----|----|
| 35% | Reducere consum energetic | Energy consumption reduction |
| €158K | Economii anuale | Annual savings |
| 8.000 m² | Suprafață implementată | Area implemented |
| 6 săpt. | Durată implementare | Implementation time |

The headline says "energy costs" ("costurile energetice"). The metric card says "energy consumption" ("consum energetic"). The page does not say which one fell by 35%, or give a baseline, a period or a metering basis. "8.000 m²" is written with the Romanian thousands separator in both languages.

## Testimonial

**EN.** "Sovitech was an outstanding partner. Their real-time reporting, premium service for our technical team, and intuitive platform allowed us to meet international standards with confidence."

**RO.** „Sovitech a fost un partener excepțional. Raportarea în timp real, serviciul premium pentru echipa noastră tehnică și platforma intuitivă ne-au permis să atingem standardele internaționale cu încredere.”

Attribution: Ion Popescu, "Director Tehnic, Therme București" / "Technical Director, Therme Bucharest" (avatar initials "IP"). The repo gives no evidence that this person exists or said this.

## The Challenge / Provocarea

**EN.** Therme Bucharest, Europe's largest spa complex, was facing high energy costs and a fragmented monitoring system. With over 8,000 m² of climate-controlled spaces, thermal pools and wellness areas, efficient energy management was essential.

**EN.** The previous automation provider was not meeting expectations on energy efficiency and reporting. As the complex prepared for expansion, a partner capable of delivering international operating standards was needed.

**RO.** Therme București, cel mai mare complex spa din Europa, se confrunta cu costuri energetice ridicate și un sistem de monitorizare fragmentat. Cu peste 8.000 m² de spații climatizate, piscine termale și zone de wellness, managementul eficient al energiei era esențial.

**RO.** Furnizorul anterior de automatizare nu se ridica la nivelul așteptărilor privind eficiența energetică și raportarea. Pe măsură ce complexul se pregătea pentru extindere, era nevoie de un partener capabil să livreze standarde internaționale de operare.

## The Solution / Soluția

**EN.** Sovitech Control implemented an integrated SAUTER BMS platform that unifies HVAC control, lighting, and energy management under a single centralised system:

**RO.** Sovitech Control a implementat o platformă BMS SAUTER integrată, care unifică controlul HVAC, iluminatul și managementul energetic într-un singur sistem centralizat:

| # | Title EN | Text EN | Title RO | Text RO |
|---|----------|---------|----------|---------|
| 1 | Strategic consultancy | Comprehensive infrastructure audit and tailored recommendations for the optimal BMS architecture. | Consultanță strategică | Audit complet al infrastructurii și recomandări personalizate pentru arhitectura BMS optimă. |
| 2 | Multi-system integration | Connecting all systems through open BACnet and Modbus protocols into a single unified platform. | Integrare multi-sistem | Conectarea tuturor sistemelor prin protocoale deschise BACnet și Modbus într-o singură platformă unificată. |
| 3 | Intelligent HVAC control | Optimisation algorithms that automatically adjust temperature based on occupancy and weather conditions. | Control HVAC inteligent | Algoritmi de optimizare care ajustează automat temperatura în funcție de ocupare și condițiile meteo. |
| 4 | Training & support | Intensive training for the Therme technical team and continuous 24/7 post-implementation support. | Instruire & suport | Instruire intensivă pentru echipa tehnică Therme și suport continuu 24/7 după implementare. |

## Implementation Process / Procesul de implementare

| # | Phase EN | Weeks EN | Description EN | Phase RO | Weeks RO | Description RO |
|---|----------|----------|----------------|----------|----------|----------------|
| 1 | Audit & Analysis | Week 1–2 | Assessment of existing infrastructure and identification of optimisation opportunities. | Audit & analiză | Săptămâna 1–2 | Evaluarea infrastructurii existente și identificarea oportunităților de optimizare. |
| 2 | System Design | Week 2–3 | BMS architecture configuration and selection of SAUTER equipment. | Proiectare sistem | Săptămâna 2–3 | Configurarea arhitecturii BMS și selecția echipamentelor SAUTER. |
| 3 | Installation & Integration | Week 3–5 | Sensor and controller installation, integration with existing HVAC systems. | Instalare & integrare | Săptămâna 3–5 | Instalarea senzorilor și controlerelor, integrarea cu sistemele HVAC existente. |
| 4 | Testing & Training | Week 5–6 | Commissioning, calibration, and training for the Therme technical team. | Testare & instruire | Săptămâna 5–6 | Punere în funcțiune, calibrare și instruirea echipei tehnice Therme. |

The page gives no calendar dates for the project.

## Results & Impact / Rezultate & impact

| # | Title EN | Text EN | Title RO | Text RO |
|---|----------|---------|----------|---------|
| 1 | Energy efficiency | 35% reduction in energy consumption through intelligent HVAC and lighting control. | Eficiență energetică | Reducere de 35% a consumului de energie prin control inteligent HVAC și iluminat. |
| 2 | 99.9% reliability | Round-the-clock monitoring with predictive alerts and proactive intervention. | Fiabilitate 99,9% | Monitorizare non-stop cu alerte predictive și intervenție proactivă. |
| 3 | Real-time reporting | Centralised dashboard with full visibility of all consumption data. | Raportare în timp real | Dashboard centralizat cu vizibilitate completă asupra tuturor datelor de consum. |
| 4 | Enhanced comfort | Optimal temperature and humidity maintained across all areas of the complex. | Confort sporit | Temperatură și umiditate optime, menținute în toate zonele complexului. |

## About Therme Bucharest / Despre Therme București

**EN.** Therme Bucharest is Europe's largest spa wellness complex, welcoming more than 3 million visitors annually. It encompasses spa zones, thermal pools, saunas and wellness facilities, operating to international standards with institutional investment backing.

**RO.** Therme București este cel mai mare complex spa de wellness din Europa, primind peste 3 milioane de vizitatori anual. Cuprinde zone de spa, piscine termale, saune și facilități de wellness, operând la standarde internaționale cu susținere investițională instituțională.

## Closing CTA and related links

| Element | RO | EN |
|---------|----|----|
| CTA heading | Vrei rezultate similare? | Want similar results? |
| CTA text | Contactează echipa noastră pentru o consultanță personalizată. | Contact our team for a personalised consultation. |
| CTA button | Contactează-ne (→ `/contact`) | Contact us |
| Related heading | Alte studii de caz | Other case studies |
| Related card 1 | HORECA - Hotel · Radisson Blu București · "Creștere de 40% a eficienței operaționale prin control BMS integrat." · Citește studiul | HORECA - Hotel · "40% increase in operational efficiency through integrated BMS control." · Read the study |
| Related card 2 | Proiectul tău · "Următorul studiu de caz poate fi al tău" · "Contactează-ne și află cum putem ajuta clădirea ta să obțină rezultate similare." · Programează o consultanță (→ `/contact`) | Your project · "The next case study could be yours" · "Contact us and find out how we can help your building achieve similar results." · Schedule a consultation |

## SAUTER products, protocols and systems named

| Kind | As written on the page |
|------|------------------------|
| SAUTER | "SAUTER" (sidebar); "an integrated SAUTER BMS platform"; "selection of SAUTER equipment" |
| Hardware | "sensors and controllers" |
| Protocols | BACnet, Modbus ("open BACnet and Modbus protocols"; sidebar "BACnet / Modbus") |
| Systems | HVAC control, lighting, energy management; existing HVAC systems; thermal pools, saunas, spa zones |
| Service | audit, design, installation, commissioning, calibration, training, 24/7 support |

No SAUTER model, product line or software name is given.

## How other pages describe this project

| Source file | What it says |
|-------------|--------------|
| `components/case-study-slider.tsx` (homepage slider) | Quote by "Ion Popescu", "Director Tehnic", Therme Bucharest: "Sovitech Control a implementat un sistem BMS complet pentru complexul nostru. Automatizarea HVAC și managementul energetic au redus consumul cu 35%." / "Sovitech Control implemented a full BMS system for our complex. HVAC automation and energy management reduced our consumption by 35%." Stats: 35% "Reducere consum" / "Consumption reduction"; €158K "Economii anuale" / "Annual savings"; "6 sapt" "Implementare" / "Implementation". Image `/thermal-spa-modern-building.jpg`. |
| `app/resurse/page.tsx` | Listing title "Cum a redus Therme Bucuresti costurile cu 38%" / "How Therme Bucharest cut costs by 38%". The case-study band quotes the slider's 35% sentence, unattributed, above a link card with the 38% title. |
| `components/latest-articles.tsx`, `components/blog-slider.tsx` | Title with "38%" ("Cum a redus Therme Bucuresti costurile cu 38%", "Cum a redus Therme București costurile cu 38%"). |
| `app/resurse/articole/eficienta-bms/page.tsx`, `app/resurse/articole/optimizare-hotel-bms/page.tsx` | Related-article titles "Cum a redus Therme București costurile cu 38% prin automatizare BMS" / "How Therme București cut costs by 38% through BMS automation". |
| `app/resurse/referinte/page.tsx`, `components/references-marquee.tsx` | "Therme Nord București": "Complete BMS system for the largest wellness complex in Europe, ~34,000 m² built area"; scope "HVAC control, lighting, energy". |
| `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` (related card) | "35% reduction in energy costs through BMS automation for the wellness complex." |
| `app/servicii/page.tsx`, `components/aethel-testimonials.tsx` (recorded in [company-profile.md](../company-profile.md#9-testimonials), sections 9.1 and 9.2) | Quote by "Alexandru Ionescu", "Director Tehnic" / "Technical Director", Therme Bucharest: energy costs down 38% in the first year, ROI in less than 2 years. The two files word the Romanian differently: "ne-a redus costurile energetice cu 38% în primul an" (spotlight) and "a redus costurile noastre energetice cu 38% in primul an" (services page). |
| `app/ghid-bms/case-studies/page.tsx` (the guide's case-study cards; see [lead-funnels.md](../lead-funnels.md), section 3.7) | Savings 35%; payback 2.3 years; CO₂ 450 t/yr; "Complex spa și wellness de 30.000 m² cu control HVAC și iluminat automat" / "30,000 m² spa and wellness complex with HVAC control and automated lighting". |

## Inconsistencies on the website

- **Savings:** 35% (case study, slider, Radisson related card, `app/ghid-bms/*`) against 38% (resources listing, homepage cards, article cards, `app/servicii/page.tsx`).
- **What fell:** "energy costs" (headline) against "energy consumption" (metric card, results).
- **Area:** 8,000 m² "area implemented" and "over 8,000 m² of climate-controlled spaces" (case study) against ~34,000 m² "built area" (references page) against 30,000 m² (`app/ghid-bms/case-studies/page.tsx`). The case study never says whether 8,000 m² is part of a larger site.
- **Name:** "Therme București" / "Therme Bucharest" against "Therme Nord București" (references page).
- **Technical director:** Ion Popescu (case study, slider) against Alexandru Ionescu (`app/servicii/page.tsx`, `components/aethel-testimonials.tsx`). `app/servicii/page.tsx` uses the headshot `/professional-male-engineer-headshot.jpg` for Alexandru Ionescu. Both articles use the same file for their author, Andrei Popescu.
- **Payback:** "less than 2 years" (`app/servicii/page.tsx`, `components/aethel-testimonials.tsx`) against 2.3 years (`app/ghid-bms/case-studies/page.tsx`). The case study itself states no payback or investment.
- **Wrong link:** in `components/case-study-slider.tsx`, the third slide (Rompharm Company, pharmaceutical) links to `/resurse/studii-de-caz/therme-bucuresti`. There is no Rompharm case study page.

---

## Branch `redesign-2026` (unmerged): changes to this case study

**Status.** This section records the unmerged branch `origin/redesign-2026` of the same repository, at commit `af81353` (2026-08-27). The changes come from commit `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala"). The branch is not merged into `main`. Owner decision, 2026-09-24: it is not SOVITECH's current position and will not be merged. This section is kept for reference only. Everything above this section describes `main`, the current website. The new figures are marketing copy like the old ones, and the app may not use them (guardrails rule 1, section 2.1, section 10).

Source: `app/resurse/studii-de-caz/therme-bucuresti/page.tsx` on the branch (55 lines changed). The route is unchanged.

### What changed on the page

| Element | `main` | Branch |
|---------|--------|--------|
| Headline RO | Therme București a redus costurile energetice cu 35% prin automatizare BMS | Therme București: automatizare BMS pentru cel mai mare complex de wellness din Europa |
| Headline EN | Therme Bucharest cut energy costs by 35% through BMS automation | Therme Bucharest: BMS automation for Europe's largest wellness complex |
| Metric 1 | 35% Reducere consum energetic / Energy consumption reduction | 1.400 Puncte de date / Data points |
| Metric 2 | €158K Economii anuale / Annual savings | 6 Centrale de tratare a aerului / Air handling units |
| Metric 3 | 8.000 m² Suprafață implementată / Area implemented | 34.000 m² Suprafață construită a complexului / Complex built area |
| Metric 4 | 6 săpt. Durată implementare / Implementation time | Unchanged |
| Testimonial | Ion Popescu, "Director Tehnic, Therme București" (quote above) | Removed. A source comment calls the replacement a "Delivery summary (replaces a testimonial attributed to a person who could not be verified)". |
| Result 1 | "Eficiență energetică": 35% reduction in energy consumption | "Control centralizat" / "Centralised control" (below) |
| Category pill and industry | HORECA — Spa & Wellness; HORECA - Spa & Wellness | HORECA / Spa & Wellness |
| Breadcrumb "Studii de caz" and back link | → `/resurse/referinte` | → `/referinte` |
| Hero image alt | "Therme București — complex spa și wellness" | "Therme București, complex spa și wellness" |
| Related card label | HORECA - Hotel | HORECA / Hotel |

**Delivery summary, verbatim.**
- RO: "Automatizare și supervizare pentru instalațiile de tratare a aerului, sistemul de piscine și centrala termică, livrate fără întreruperea activității complexului."
- EN: "Automation and supervision for the air-handling plant, the pool systems and the heating plant, delivered without interrupting the complex's operation."
- Facts RO: "1.400 de puncte de date · 6 centrale de tratare a aerului · control umiditate și temperatură pe zone · integrare cu contorizarea de energie"
- Facts EN: "1,400 data points · 6 air handling units · zone-level humidity and temperature control · integration with energy metering"

**New result 1, verbatim.** Title "Control centralizat" / "Centralised control". RO: "Control inteligent HVAC și iluminat, cu supervizare unificată pentru toate instalațiile complexului." EN: "Intelligent HVAC and lighting control, with unified supervision for every system in the complex."

**Unchanged on the branch.** The standfirst (still "pentru eficiență energetică și confort operațional"), the challenge text (still "peste 8.000 m² de spații climatizate" and the previous provider), the four solution items (including "Consultanță strategică"), the four implementation phases over weeks 1-6, results 2-4 (including "Fiabilitate 99,9%"), "About Therme Bucharest" (still "Europe's largest" and "more than 3 million visitors"), the sidebar (Service "Implementare BMS completă", Technology "SAUTER - BACnet / Modbus"), the hero image `/thermal-spa-modern-building.jpg` and the closing call to action. The related Radisson card still reads "Creștere de 40% a eficienței operaționale prin control BMS integrat."

No SAUTER model is named on the branch either.

### Where the page sits on the branch site

- **Harder to reach.** The references page no longer has a "Vezi studiul de caz" button (see `references.md`, section R1). The resources hub (`app/resurse/page.tsx`) no longer lists the case study, so the listing date "20 DEC 2025" and the "38%" listing title are gone. `components/latest-articles.tsx` and `components/blog-slider.tsx` no longer carry it. `app/ghid-bms/resurse/page.tsx` drops its Therme card.
- **Not in the sitemap.** `app/sitemap.ts` says: "Legacy case studies and pre-launch articles are unlisted until they have real written content and covers."
- **Still linked from:** the Radisson case study's related card, and the related-article cards in `app/resurse/articole/optimizare-hotel-bms/page.tsx` and `app/resurse/articole/eficienta-bms/page.tsx`. `components/case-study-slider.tsx` (including the Rompharm slide) and `components/aethel-testimonials.tsx` still contain links here, but no page on the branch renders either component (see [`company-profile.md`](../company-profile.md#9-testimonials), section 9).

### How other pages describe this project on the branch

| Source file | What it says on the branch |
|-------------|----------------------------|
| `components/case-study-slider.tsx` (not rendered on the branch) | No person. Client line "Studiu de caz" / "Proiect livrat". Quote RO: "Sistem BMS complet pentru cel mai mare complex de wellness din Europa: tratare aer, piscine și centrala termică, sub o singură supervizare." EN: "A complete BMS for Europe's largest wellness complex: air handling, pools and the heating plant under one supervision layer." Stats: 1.400 "Puncte de date" / "Data points"; 6 "Centrale de tratare aer" / "Air handling units"; "6 sapt" "Implementare" / "Implementation". |
| `components/aethel-testimonials.tsx` (not rendered on the branch) | No person. The delivery summary above, with "Anvergură: 1.400 puncte de date" and "Echipamente: 6 centrale de tratare a aerului". Links here. |
| `app/referinte/page.tsx` | "Therme Nord București": unchanged description (~34,000 m² built area), new photo `therme-nord-bucuresti.jpg`, no case-study button, and a scope card with 1,400 data points and 6 AHUs (`references.md`, section R4). |
| `lib/sector-data.ts`, Sport & Wellness | Therme Nord is the sector's reference: metrics "1,400 Data points at Therme Nord Bucuresti" and "6 Air handling units served at Therme Nord Bucuresti"; project card "Automation and supervision at Therme Nord Bucuresti: 1,400 data points, 6 air handling units, zone-level humidity and temperature control, and commissioning without interrupting operation.", location "Balotești, Ilfov". The Entertainment sector cites Therme Nord as "transferable competence". See `sectors.md`, section B. |
| `app/resurse/page.tsx` | Projects band: "Therme Nord București: 1.400 de puncte de date și 6 centrale de tratare a aerului, sub o singură supervizare." / "Therme Nord Bucharest: 1,400 data points and 6 air handling units under one supervision layer." |
| `app/resurse/articole/optimizare-hotel-bms/page.tsx`, `app/resurse/articole/eficienta-bms/page.tsx` | Related-article title now "Automatizare BMS la Therme București, pas cu pas" / "BMS automation at Therme Bucharest, step by step" (was "Cum a redus Therme București costurile cu 38%..."). |
| `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` (related card) | Unchanged: "Reducere de 35% a costurilor energetice prin automatizare BMS pentru complexul de wellness." |
| `app/ghid-bms/case-studies/page.tsx` | Unchanged figures: savings 35%, payback 2.3 years, CO₂ 450 t/yr, 30,000 m². The card now links to `/referinte` instead of this case study. See [lead-funnels.md](../lead-funnels.md), section 3.7. |
| `app/servicii/page.tsx`, `components/aethel-testimonials.tsx` | The Alexandru Ionescu quote (38%, ROI under 2 years) is gone from both. |

No branch file under `app/`, `components/` or `lib/` contains "38%", "Ion Popescu" or "Alexandru Ionescu".

### Inconsistencies on the branch

- **Area:** 34,000 m² "Suprafață construită a complexului" (metric card) against "peste 8.000 m² de spații climatizate" (challenge text, same page) against 30,000 m² (`app/ghid-bms/case-studies/page.tsx`).
- **Savings:** the page no longer states a saving, but its standfirst still promises "eficiență energetică". The Radisson page's related card still says 35%, and the guide cards still say 35% with a 2.3-year payback.
- **Radisson related card:** "40% increase in operational efficiency", although the branch's slider and spotlight components (neither rendered on any page) no longer carry that figure for Radisson.
- **Name and place:** "Therme București" / "Therme Bucharest" (this page; also the unrendered slider and spotlight components) against "Therme Nord București" (references page, sector page); "București" (references page) against "Balotești, Ilfov" (Sport & Wellness project card).
- **Reliability:** "Fiabilitate 99,9%" stays, with no basis stated.
- **1,400 points and 6 AHUs** are new on the branch and appear nowhere on main.
