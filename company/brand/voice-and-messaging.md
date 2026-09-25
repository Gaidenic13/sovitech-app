# SOVITECH voice and messaging

This file records how the SOVITECH website speaks: its stated voice rules, taglines, calls to action, recurring claims and how it writes Romanian. It also lists website phrases that the SOVITECH App must not reuse as written, because they would break `docs/guardrails.md`. It is reference material copied from marketing copy, not approved engineering or reference data.

- **Source:** the `sovitech-website` repository (Next.js 16, bilingual RO/EN), commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11). Every path below is relative to that repository's root.
- **Read on:** 2026-09-23. Files read: every page under `app/`, every component in `components/` except `components/ui/`, `lib/language-context.tsx`, `DESIGN-SYSTEM.md`, and for copy that pages render from data, `lib/sector-data.ts` and the user-facing labels in `lib/roi-calculator.ts`.
- **Authority:** `docs/guardrails.md` wins over anything here. This file adds no rule to the app.
- **Related files:** `company/brand/design-system.md` (visual system), `company/business/company-profile.md`, `company/business/references.md`, `company/business/sectors.md`, `company/business/glossary.md`.
- **Unmerged branch:** section 10 points to the `redesign-2026` branch copy and notes its main voice changes, for reference only. The branch is not SOVITECH's current position and will not be merged (owner decision, 2026-09-24). Sections 1 to 9 describe `main` only, the current website.

---

## 1. How this file relates to the app

- **Interface language.** The app's interface language is English (`prompts/sovitech-ai-system.md`). The website defaults to Romanian and offers English (`lib/language-context.tsx`: `useState<Lang>("ro")`, `t(ro, en)`). Section 6 on Romanian applies when the app shows Romanian text, such as a quoted owner document or a future Romanian interface.
- **Labels.** The app's badges, status lines and stage names come only from `docs/guardrails.md` section 2.8 and rule 10. The website's voice may shape the app's tone. It never supplies a label, a figure or a claim.
- **Figures.** Every number in section 5 is a marketing figure. None is verified engineering data, and none is part of an approved reference dataset. The app may not show them as values, use them as benchmarks, or feed them to a calculation until they enter a versioned reference dataset with approval (guardrails rule 1, section 2.1 and section 10).

---

## 2. Voice rules

### 2.1 As stated

Source: `DESIGN-SYSTEM.md` section 10 ("Language").

> All user-facing strings are bilingual via `useLanguage()` → `t(ro, en)` (`lib/language-context.tsx`). Romanian uses full diacritics (ă â î ș ț). Voice: modern, confident, direct B2B; CTAs "Cerere ofertă / Request a quote", "Vorbește cu un specialist / Talk to a specialist", "Calculează ROI / Calculate ROI".

Section 2 of the same file adds the visual side of the voice: every section opens with an eyebrow label `• LABEL` in tracked capitals, and display headings are light weight with tight tracking.

### 2.2 As observed

These patterns repeat across the site. Each has an example and its source.

| Pattern | Example (RO / EN) | Source |
|---------|-------------------|--------|
| Two-line display headline. Two short parallel sentences, each ending in a full stop. | "Construit să controleze orice clădire. / Oriunde." / "Built to control every building. / Everywhere." | `app/page.tsx` |
| Eyebrow before every section heading, written as `• Label`. | "• Următorul pas" / "• Next step" | `app/page.tsx` |
| The reader is addressed directly. Romanian mostly uses the informal "tu" (see 6.2). | "Tot ce are nevoie clădirea ta." / "Everything your … needs." | `app/sectoare/[sector]/sector-client.tsx` |
| The company speaks as "we", with a verb first. | "Proiectăm sisteme complete de automatizare" / "We design complete automation systems"; "Integrăm orice protocol" / "We integrate any protocol" | `components/services-showcase.tsx` |
| CTAs are short imperatives (see section 4). | "Vorbește cu un specialist" / "Talk to a specialist" | `app/sectoare/[sector]/sector-client.tsx` |
| Numbers are the main proof, often as large stat tiles with a short label. | "38%" "reducere medie a consumului de energie" | `components/stats-section.tsx` |
| Swiss provenance of SAUTER is a recurring credential. | "tehnologie SAUTER din Elvetia" | `app/layout.tsx` (metadata) |
| Services are told as numbered steps with a duration per step. | "Pregătire și Planificare … Durată: 1–2 săptămâni" | `app/servicii/executie/page.tsx` |
| Recurring themes: one platform, full visibility, comfort, energy, 24/7. | "într-o singură platformă unificată" | `lib/sector-data.ts` |
| Offers are framed as free. | "Cerere ofertă gratuită", "Solicită un audit gratuit", "Programează o consultație gratuită" | `app/page.tsx`, `app/servicii/integrare/page.tsx`, `app/ghid-bms/quiz/page.tsx` |
| Absolute words are common: "orice", "toate", "complet", "maxim". | "Integrăm toate sistemele tale într-o singură platformă." | `app/servicii/integrare/page.tsx` |
| One article uses a measured, evidence-first tone. It is the closest match to the app's honesty rules. | "Beneficiul BMS este real, dar moderat." / "The BMS benefit is real, but moderate."; "Sistemele BMS sunt o investiție solidă, nu magică." | `app/resurse/articole/eficienta-bms/page.tsx` |

---

## 3. Taglines and headline pairs

Verbatim. A slash marks a line break in the heading. "Flag" means section 7 lists the phrase as unusable in the app as written.

| Where | Romanian | English | Flag |
|-------|----------|---------|------|
| Home hero eyebrow (English in both languages) | Building Management Systems | Building Management Systems | |
| Home hero | Construit să controleze orice clădire. / Oriunde. | Built to control every building. / Everywhere. | |
| Home hero subline | Soluții BMS integrate care optimizează consumul de energie, reduc costurile operaționale și mențin confortul ocupanților în orice tip de clădire. | Integrated BMS solutions that optimize energy consumption, reduce operational costs and maintain occupant comfort in any type of building. | Yes (7.2) |
| Home hero trust line | De încredere în 30+ proiecte BMS finalizate | Trusted across 30+ completed BMS projects | |
| Home about | Soluții complete de automatizare BMS | Complete BMS Automation Solutions | |
| Home closing band | Gata pentru automatizare BMS? | Ready for BMS automation? | |
| Home closing subline | Alătură-te clienților care au încredere în Sovitech Control | Join the clients who trust Sovitech Control | |
| Services showcase (`components/services-showcase.tsx`) | Servicii BMS complete | End-to-end BMS services | |
| Testimonials band (`components/aethel-testimonials.tsx`) | Clienții vorbesc. / Cifrele confirmă. | Clients speak. / The numbers confirm. | Yes (7.7) |
| Stats band (`components/stats-section.tsx`) | Impact măsurabil | Measurable impact | |
| Stats band subline | Cifrele din spatele fiecărui proiect BMS pe care l-am livrat — verificate și actualizate constant. | The numbers behind every BMS project we've delivered — verified and continuously updated. | Yes (7.7) |
| Case-study slider (`components/case-study-slider.tsx`) | Povești de succes | Success stories | |
| Partners band (`components/partners-marquee.tsx`) | Parteneri de încredere | Trusted Partners | |
| References band (`components/references-marquee.tsx`) | Proiecte de referință | Reference projects | |
| Services page hero (`app/servicii/page.tsx`) | Servicii complete. / Rezultate garantate. | Complete services. / Guaranteed results. | Yes (7.1) |
| Services page band (`app/servicii/page.tsx`) | Blocheaza costurile de management BMS pentru 10 ani | Lock in your BMS management costs for 10 years | Yes (7.1) |
| Sectors page hero (`app/sectoare/page.tsx`) | Expertiza BMS / pentru fiecare industrie. | BMS expertise / for every industry. | |
| Sector template (`app/sectoare/[sector]/sector-client.tsx`) | Software premium, / servicii premium. | Premier software, / premier service. | |
| Sector template CTA band | Pregătit să-ți optimizezi clădirea? | Ready to optimise your {sector} building? | |
| Offices (`lib/sector-data.ts`) | Birouri mai inteligente. / Echipe mai mulțumite. | Smarter offices. / Happier teams. | |
| Medical & Pharma (`lib/sector-data.ts`) | Control de precizie. / Conform prin design. | Precision control. / Compliant by design. | Yes (7.3) |
| Retail (`lib/sector-data.ts`) | Confort mai bun. / Trafic mai mare. | Better comfort. / Higher footfall. | |
| HoReCa & Wellness (`lib/sector-data.ts`) | Confort de cinci stele. / Eficiență de patru stele. | Five-star comfort. / Four-star efficiency. | |
| Industrial (`lib/sector-data.ts`) | Scară industrială. / Precizie inginerească. | Industrial scale. / Engineered precision. | |
| Educational (`lib/sector-data.ts`) | Spații sănătoase. / Minți concentrate. | Healthy spaces. / Focused minds. | |
| References page (`app/resurse/referinte/page.tsx`) | Referințele noastre / — cartea noastră de vizită. | Our references / — our calling card. | |
| References page, trust band | Creștere prin încredere | Growth through trust | |
| Contact page (`app/contact/page.tsx`, written without diacritics) | Sa vorbim. | Let's talk. | |
| Contact page | Venim la tine | We come to you | |
| Products page (`app/produse/page.tsx`) | Gama completă SAUTER | Complete SAUTER Range | |
| Products page eyebrow | Partener autorizat SAUTER Elveția în România | Authorised SAUTER Partner in Romania | |
| ROI calculator (`app/calculator-roi/page.tsx`) | Cât poți economisi cu un BMS? | How much could you save with a BMS? | See 7.2 |
| Offer request (`app/cerere-oferta/page.tsx`) | Spune-ne despre proiectul tău | Tell us about your project | |
| Resources hub (`app/resurse/page.tsx`, no diacritics) | Cele mai noi informatii despre automatizarea cladirilor. | The latest on building automation. | |
| Resources newsletter | Ramai inaintea industriei | Stay ahead of the industry | |
| BMS guide (`app/ghid-bms/page.tsx`) | Evaluați potențialul de automatizare al clădirii dumneavoastră | Assess Your Building's Automation Potential | |
| Case-study pages, related card | Următorul studiu de caz poate fi al tău | The next case study could be yours | |
| Pricing page (`app/pricing/page.tsx`) | Pachete de servicii BMS | BMS service packages | |

The four services-showcase lines (`components/services-showcase.tsx`) are the site's clearest statement of what SOVITECH does:

| Service | Romanian | English |
|---------|----------|---------|
| Proiectare BMS / BMS Design | Proiectăm sisteme complete de automatizare — de la concept la documentația tehnică de execuție. | We design complete automation systems — from concept to detailed execution drawings. |
| Execuție Sisteme / System Installation | Instalăm și punem în funcțiune sisteme BMS cu echipamente SAUTER, la standarde profesionale. | We install and commission BMS systems with SAUTER equipment, to professional standards. |
| Integrare Sisteme / Systems Integration | Integrăm orice protocol — KNX, DALI, Modbus, M-Bus și BACnet — într-o singură platformă. | We integrate any protocol — KNX, DALI, Modbus, M-Bus and BACnet — into a single platform. |
| Mentenanță / Maintenance | Menținem clădirea la performanță maximă prin mentenanță predictivă și suport dedicat 24/7. | We keep your building at peak performance with predictive maintenance and dedicated 24/7 support. |

---

## 4. Standard CTAs

### 4.1 The three named in `DESIGN-SYSTEM.md`

| Romanian | English | Main uses |
|----------|---------|-----------|
| Cerere ofertă | Request a quote | Header button and mobile drawer (`components/header.tsx`); home closing band (`app/page.tsx`); service packages, written "Cerere oferta" (`app/servicii/page.tsx`) |
| Vorbește cu un specialist | Talk to a specialist | Sector template, hero and closing band (`app/sectoare/[sector]/sector-client.tsx`) |
| Calculează ROI | Calculate ROI | Sector template (`app/sectoare/[sector]/sector-client.tsx`); final wizard step (`app/calculator-roi/page.tsx`); guide calculator (`app/ghid-bms/calculator/page.tsx`) |

### 4.2 Other CTAs and their variants

| Romanian | English | Source |
|----------|---------|--------|
| Cerere ofertă gratuită | Request a free quote | `app/page.tsx` (hero) |
| Cere ofertă | Request a quote | `components/product-detail.tsx` |
| Solicită o ofertă | Request a quote | `app/pricing/page.tsx` |
| Solicită o ofertă gratuită | Request a free quote | `app/servicii/executie/page.tsx` |
| Solicită ofertă gratuită | Request a free quote | `app/servicii/proiectare/page.tsx` |
| Cere o ofertă personalizată | Request a personalised quote | `app/resurse/referinte/page.tsx` |
| Calculator ROI | ROI Calculator | `components/header.tsx`, `components/footer.tsx` |
| Contactează-ne | Contact Us / Contact us | `components/footer.tsx`, case-study pages |
| Contactează un specialist | Contact a specialist | `app/produse/page.tsx` |
| Vorbeste cu un expert (no diacritics) | Speak with an expert | `app/servicii/page.tsx` |
| Vorbește cu un specialist | Speak to a specialist | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` (related card) |
| Solicită o consultație gratuită | Request a free consultation | `app/servicii/executie/page.tsx`, `app/servicii/integrare/page.tsx` |
| Programează o consultație | Schedule a Consultation | `app/ghid-bms/page.tsx`, `app/ghid-bms/calculator/page.tsx` |
| Cere o consultanță | Request a Consultation | case-study sidebars |
| Solicită un audit gratuit | Request a free audit | `app/servicii/integrare/page.tsx` |
| Programează audit gratuit | Schedule a free audit | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| Solicită propunere detaliată | Request a Detailed Proposal | `app/calculator-roi/page.tsx` (results) |
| Programează o discuție | Schedule a Call | `app/calculator-roi/page.tsx` (results) |
| Solicită un contract de mentenanță | Request a maintenance contract | `app/servicii/mentenanta/page.tsx` |
| Descarcă ghidul gratuit | Download the Free Guide | `app/ghid-bms/page.tsx` |
| Trimite Mesaj | Send Message | `app/contact/page.tsx` |
| Trimite cererea | Send request | `app/cerere-oferta/page.tsx` |
| Detalii produs | Product details | `app/produse/page.tsx` |
| Explorează sectorul | Explore sector | `app/page.tsx`, sector template |
| Vezi studiul de caz | Read case study / View Case Study | `components/aethel-testimonials.tsx`, `app/resurse/referinte/page.tsx` |
| Vezi echipamentele SAUTER | View SAUTER equipment | `app/servicii/executie/page.tsx` |

Wizard controls, used the same way in the ROI calculator and the offer request: "Continuă / Continue", "Înapoi / Back", "Pasul 1 din 6 / Step 1 of 6", "Recalculează / Recalculate", "Descarcă PDF / Download PDF", "Distribuie / Share", "Copiază link / Copy Link" (`app/calculator-roi/page.tsx`, `app/cerere-oferta/page.tsx`).

### 4.3 Notes for the app

- "ofertă" and "quote" are reserved terms (guardrails 2.8). They are allowed in action labels, so a button reading "Request a quote" that hands the owner to SOVITECH is allowed. The text around it is checked. "Primești o ofertă personalizată" or "your quote is ready" is flagged, because the app has no quotation until a stored quotation record exists (rule 10).
- "Calculează ROI" is allowed as an action label. Its result must be Estimated, with basis, method and range (rules 9 and 10), which the website's calculators do not show.
- The website uses seven Romanian wordings for one action, requesting a quote, and several more for talking to someone. If the app adopts CTAs, it should pick one wording per action.

---

## 5. Recurring claims and proof points

All figures here are marketing copy. None is verified engineering data or approved reference data, so the app may not use any of them as a value (section 1). The "Conflicts" column shows where the site contradicts itself.

### 5.1 Company claims

| Claim (verbatim) | Source | Conflicts |
|------------------|--------|-----------|
| "Sovitech Control este unul dintre liderii din România în automatizarea clădirilor și integrarea completă BMS." / "Sovitech Control is one of Romania's leaders in building automation and full BMS integration." | `app/page.tsx` | |
| "partener autorizat SAUTER" / "authorised SAUTER partner" | `app/servicii/executie/page.tsx`, `app/produse/page.tsx`, `app/produse/layout.tsx`, `app/resurse/articole/optimizare-hotel-bms/page.tsx` | The English FAQ says "We are an authorised SAUTER partner from Switzerland". The Romanian means SAUTER is from Switzerland (`app/servicii/page.tsx`). The English is a mistranslation. |
| SAUTER is "liderul global în managementul energiei", "lider mondial în sisteme de management energetic pentru clădiri", "liderul global in automatizarea BMS" | `app/servicii/executie/page.tsx`, `app/servicii/page.tsx` | Claims about a third party. Not verified here. |
| "30+" completed projects | `app/page.tsx`, `components/stats-section.tsx`, `app/resurse/referinte/page.tsx` | "150+ Proiecte implementate" (`app/servicii/executie/page.tsx`); "150+ proiecte BMS implementate in Romania" (`app/resurse/page.tsx`, `app/resurse/articole/eficienta-bms/page.tsx`) |
| "15+ ani experiență în automatizare" | `components/stats-section.tsx`, `app/resurse/referinte/page.tsx` | The efficiency article analyses projects "implementat între 2015-2024" and also says "în ultimii 15 ani" (`app/resurse/articole/eficienta-bms/page.tsx`). |
| "250,000+ mp suprafață automatizată în portofoliul de proiecte" | `components/stats-section.tsx` | Area basis not stated. Rendered with a comma separator in Romanian too. |
| "92% Clienți din recomandări", "98% Satisfacția clienților" | `app/resurse/referinte/page.tsx` | No method or period given. |
| "50+ servicii BMS" | `app/servicii/page.tsx` | |

### 5.2 Performance and payback claims

| Claim (verbatim) | Source | Conflicts |
|------------------|--------|-----------|
| "38%" "reducere medie a consumului de energie" | `components/stats-section.tsx` | "42% Economii de energie", "35% Reducere a costurilor operaționale, Medie la nivelul clienților noștri" (`app/resurse/referinte/page.tsx`); "35% Reducere costuri energetice" (`app/servicii/proiectare/page.tsx`); by sector 28-42% (`app/resurse/articole/eficienta-bms/page.tsx`) |
| "6.1" "ani perioadă medie de amortizare" | `components/stats-section.tsx` | "2-3 ani" "ROI mediu investiție" (`app/servicii/proiectare/page.tsx`); "de regulă 2–4 ani" (`app/ghid-bms/page.tsx`); "3-5" years for hotels (`app/resurse/articole/optimizare-hotel-bms/page.tsx`); "<18 luni" for offices (`lib/sector-data.ts`); "Amortizare: 10–15 luni" for hospitality (`lib/roi-calculator.ts`) |
| "reducere de 25–40% a costurilor operaționale" | `app/ghid-bms/page.tsx` | |
| Hotels "sa reduca costurile cu energia cu 25-65%" (`app/resurse/page.tsx`, no diacritics); "să reducă costurile energetice cu 25-65%" (`app/resurse/articole/optimizare-hotel-bms/page.tsx`) | `app/resurse/page.tsx`, `app/resurse/articole/optimizare-hotel-bms/page.tsx` | |
| Sector tiles: offices "30–40%", retail "25–35%", HoReCa "25–38%", industrial "20–30%", educational "20–30%" | `lib/sector-data.ts` | |
| "28% Reducere CO₂", "15% Creștere a valorii proprietății" | `app/resurse/referinte/page.tsx` | |
| "40% Reducerea timpului de intervenție", "100% Vizibilitate centralizată", "∞ Scenarii de automatizare" | `app/servicii/integrare/page.tsx` | |
| "20% Reducerea costurilor de reparații" | `app/servicii/mentenanta/page.tsx` | |
| "99% Rată de succes la recepție" | `app/servicii/executie/page.tsx` | |
| Implementation cost "aprox. 25 EUR/m²" | `app/calculator-roi/page.tsx` (hint) | The guide calculator multiplies area by 150 and displays it as RON (`app/ghid-bms/calculator/page.tsx`). |
| Existing automation "Reduce costul de implementare cu aproximativ 30%" | `app/calculator-roi/page.tsx` | |

### 5.3 Service commitments

| Claim (verbatim) | Source | Conflicts |
|------------------|--------|-----------|
| Emergency response "4h" / "Timp de răspuns de 4 ore pentru urgențe" | `app/servicii/executie/page.tsx`, `app/servicii/mentenanta/page.tsx` | "maxim 4 ore in Bucuresti si 8 ore la nivel national" (`app/servicii/page.tsx`) |
| "95%" "Uptime garantat al sistemului" | `app/servicii/mentenanta/page.tsx` | "98%" "Disponibilitate garantată a sistemului" (`lib/sector-data.ts`); "99.9%" / "Fiabilitate 99,9%" (`components/case-study-slider.tsx`, `app/resurse/studii-de-caz/therme-bucuresti/page.tsx`) |
| Warranty "2 ani" | `app/servicii/executie/page.tsx` | Standard package "Garantie 2 ani", Full Service "Garantie 5 ani" (`app/servicii/page.tsx`) |
| "Suport telefonic disponibil 24/7" | `app/servicii/mentenanta/page.tsx` | Standard package has "Suport telefonic Lun–Vin" and 24/7 only in Full Service (`app/servicii/page.tsx`). Office hours "Luni — Vineri: 09:00 – 18:00" (`app/contact/page.tsx`). The emergency number shown is a placeholder, "+40 21 XXX XXXX". |
| Proposal "în cel mult 48 de ore" | `app/cerere-oferta/page.tsx` | "estimare ROI personalizată în 48 de ore" (`app/sectoare/[sector]/sector-client.tsx`); "Descoperiți cât puteți economisi în maxim 2 ore" (`app/resurse/articole/optimizare-hotel-bms/page.tsx`) |
| Durations: execution "4–12 săptămâni", integration "2–8 săptămâni", design "2-6 săptămâni" | `app/servicii/executie/page.tsx`, `app/servicii/integrare/page.tsx`, `app/servicii/proiectare/page.tsx` | FAQ: under 5,000 m² "4–8 saptamani", medium "2–4 luni", complex "4–8 luni" (`app/servicii/page.tsx`); guide: "3–6 luni" (`app/ghid-bms/page.tsx`) |

### 5.4 Case-study figures

The case studies are summarised here only for their contradictions. `company/business/references.md` covers the projects.

| Topic | Figures and sources |
|-------|---------------------|
| Therme București, savings | 35%: `app/resurse/studii-de-caz/therme-bucuresti/page.tsx`, `components/case-study-slider.tsx`, `app/ghid-bms/case-studies/page.tsx`. 38%: `components/aethel-testimonials.tsx`, `components/blog-slider.tsx`, `components/latest-articles.tsx`, `app/servicii/page.tsx`. |
| Therme București, area | "8.000 m²" (`app/resurse/studii-de-caz/therme-bucuresti/page.tsx`); "~34.000 m² construiți" (`app/resurse/referinte/page.tsx`, `components/references-marquee.tsx`); "30.000 m²" (`app/ghid-bms/case-studies/page.tsx`). No area basis is stated anywhere. |
| Therme București, other | "€158K" annual savings; "6 săpt." implementation; "cel mai mare complex spa din Europa" (`app/resurse/studii-de-caz/therme-bucuresti/page.tsx`). Payback "2.3 ani" (`app/ghid-bms/case-studies/page.tsx`) against "ROI-ul a fost atins în mai puțin de 2 ani" (`components/aethel-testimonials.tsx`). |
| Radisson Blu București, rooms | 424 (`app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`, `app/resurse/articole/optimizare-hotel-bms/page.tsx`); 428 (`components/aethel-testimonials.tsx`, `app/ghid-bms/case-studies/page.tsx`, `app/ghid-bms/resurse/page.tsx`). |
| Radisson Blu București, results | "~30%" (case-study page); "32%" (`app/ghid-bms/case-studies/page.tsx`, HoReCa testimonial in `lib/sector-data.ts`); "40%" operational efficiency (`components/case-study-slider.tsx`, related card on the Therme page); ROI "2 ani" (`components/case-study-slider.tsx`) against "2.8 ani" (`app/ghid-bms/case-studies/page.tsx`). |
| Radisson Blu București, systems | PMS is "Fidelio" (case-study page, hotel article) but "Opera" in the HoReCa testimonial (`lib/sector-data.ts`). "200+ Puncte monitorizare", point types not stated (`components/case-study-slider.tsx`). BREEAM In-Use Excellent (2025), 82,6% Energy, 75,4% Health & Wellbeing (case-study page). The headline says the hotel achieved BREEAM Excellent "prin automatizare BMS integrată". |
| Rompharm | "0 avarii neplanificate" (`components/aethel-testimonials.tsx`); "99.9%", "±0.5°C", "GMP" "Conformitate" (`components/case-study-slider.tsx`); "28%", "3.1 ani" (`app/ghid-bms/case-studies/page.tsx`). The slider's "read the full case study" link for Rompharm opens the Therme page. |
| Floreasca | "Floreasca Business Park", "45.000 m²", energy certification "Clasa A" (`components/aethel-testimonials.tsx`); "Floreasca Tower", "~7.500 m²", "clădire de birouri clasa A" (`app/resurse/referinte/page.tsx`). |
| Named contacts | The same client has different named contacts in different files: two for Therme, three plus an unnamed General Manager for Radisson Blu, two for Rompharm. The component comment says photos and logos are placeholders (`components/aethel-testimonials.tsx`). Names are left out of this file. |
| Clients named only in marketing blocks | Sector testimonials name Bucharest Business Park, Antibiotice Iași, Cora Romania, Ursus Breweries Cluj and Politehnica University of Bucharest (`lib/sector-data.ts`). The "De încredere pentru" strip names Globalworth, NEPI Rockcastle, One United Properties, Iulius Group and Palas Campus (`app/sectoare/[sector]/sector-client.tsx`). None of these appears in the references list (`app/resurse/referinte/page.tsx`). Whether they are real clients is unknown. |

---

## 6. How Romanian is written

### 6.1 Diacritics

- **Stated rule:** full diacritics, ă â î ș ț (`DESIGN-SYSTEM.md` section 10).
- **Form used:** comma-below ș and ț throughout. No cedilla ş or ţ appears in Romanian text. The only cedilla is in the Turkish company name "Monrol Eczacıbaşı" (`app/resurse/referinte/page.tsx`), where it is correct. `docs/build-readiness.md` also expects both forms in owner documents.
- **Where the rule is broken:** these files write Romanian with few or no diacritics.
  - `app/servicii/page.tsx`: every Romanian string ("Solicita o oferta personalizata", "Intrebari frecvente").
  - `app/sectoare/page.tsx` ("Solutii de automatizare adaptate cerintelor specifice").
  - `app/resurse/page.tsx` (the Romanian translations object).
  - `app/contact/page.tsx` ("Sa vorbim.", "Descrieti pe scurt proiectul sau intrebarea dumneavoastra...").
  - `components/latest-articles.tsx` ("Cum a redus Therme Bucuresti costurile cu 38%").
  - `app/layout.tsx` (site metadata: "Sisteme de automatizare si BMS").
  - `app/pricing/page.tsx` (FAQ answers only).
  - `app/ghid-bms/resurse/page.tsx` (one card: "Control precis mediu productie pentru facilitati farmaceutice certificate GMP").

### 6.2 Formality

The site mixes the informal "tu" and the formal "dumneavoastră". There is no stated rule.

- **"tu" (most of the site):** "clădirea ta", "Alătură-te", "Spune-ne despre proiectul tău", "Ai nevoie de acest produs în proiectul tău?" (`app/page.tsx`, `app/cerere-oferta/page.tsx`, `components/product-detail.tsx`, sector pages, services pages, ROI calculator).
- **"dumneavoastră" (the BMS guide funnel and some forms):** "Evaluați potențialul de automatizare al clădirii dumneavoastră" (`app/ghid-bms/page.tsx`); "Funcția dumneavoastră" and "Datele dumneavoastră sunt în siguranță" (`app/ghid-bms/descarca/page.tsx`); "Doriți o evaluare BMS pentru hotelul dumneavoastră?" (`app/resurse/articole/optimizare-hotel-bms/page.tsx`); "proiectului dvs." (`app/pricing/page.tsx`).
- **Mixed on one page:**
  - `app/ghid-bms/quiz/page.tsx` asks "Care este suprafața totală a clădirii dumneavoastră?", then says "Felicitări! Ai câștigat +150 puncte" and "sectorul tău".
  - `app/ghid-bms/multumim/page.tsx` says "Ai câștigat +100 puncte!", then "Verificați Email-ul".
  - `app/contact/page.tsx` says "Venim la tine", then "intrebarea dumneavoastra".

Which form the app should use in Romanian is an open decision for SOVITECH. The app's owners are property owners and facility managers in a B2B setting.

### 6.3 Capitalisation and punctuation

- **Sentence case is the norm:** "Servicii BMS complete", "Proiecte de referință".
- **Some pages use English-style title case in Romanian:** "Rezultatele Tale", "Detaliile Clădirii", "Programează Consultație Gratuită" (`app/ghid-bms/calculator/page.tsx`, `app/ghid-bms/case-studies/page.tsx`).
- **Eyebrows** are written in the source as "• Label" and shown in capitals by CSS. Some sources hard-code capitals: "• INFORMATII", "• MESAJ" (`app/contact/page.tsx`), "• ULTIMELE ARTICOLE" (`components/latest-articles.tsx`).
- **Quotation marks:** Romanian quotes use „…” in the case-study testimonials (`app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`, `app/resurse/studii-de-caz/therme-bucuresti/page.tsx`). Elsewhere quotes use straight or English curly marks.
- **Dashes:** the em dash "—" is used as a clause break in both languages.

### 6.4 Numbers, units, currency and dates

Guardrails rule 8 governs how the app parses and displays these. The website is inconsistent, so its formats are not a model.

| Topic | Observed in Romanian strings | Source |
|-------|------------------------------|--------|
| Thousands | "45.000 m²", "100.000 m²" (Romanian style) | `components/aethel-testimonials.tsx`, `app/cerere-oferta/page.tsx` |
| Thousands, not localised | "250,000+" in Romanian too | `components/stats-section.tsx` |
| Decimals, Romanian style | "±0,5°C", "82,6%", "+0,8★" | `lib/sector-data.ts`, `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` |
| Decimals, English style in Romanian text | "2.3 ani", "4.2 ani", "82.6%", "6.1", "±0.5°C" | `app/ghid-bms/case-studies/page.tsx`, `app/resurse/articole/eficienta-bms/page.tsx`, `app/resurse/articole/optimizare-hotel-bms/page.tsx`, `components/stats-section.tsx`, `components/case-study-slider.tsx` |
| Localised formatter | `Intl.NumberFormat("ro-RO")` and `toLocaleString("ro-RO")` | `app/calculator-roi/page.tsx`, `app/cerere-oferta/page.tsx` |
| Area unit | Both "m²" and "mp" in Romanian. English uses "m²" and "sqm". | many files |
| Area basis | Never stated. The site uses "m² construiți", "suprafață închiriabilă", "suprafață de producție", "spații climatizate", "suprafață automatizată" and plain "suprafață". | `app/resurse/referinte/page.tsx`, `components/stats-section.tsx`, `app/resurse/studii-de-caz/therme-bucuresti/page.tsx` |
| Currency | "EUR", "€158K", "RON" and "lei" | `app/calculator-roi/page.tsx`, `components/case-study-slider.tsx`, `app/ghid-bms/calculator/page.tsx`, `app/ghid-bms/quiz/page.tsx` |
| Dates | "15 IAN 2026" (Romanian order) but also "Ian 15, 2026" (English order) in Romanian | `app/resurse/page.tsx`, `app/resurse/articole/eficienta-bms/page.tsx`. `components/blog-slider.tsx` also holds "15 IAN 2026" in its data but does not render dates. |
| Ranges | En dash with spaces or without: "2–4 ani", "4–12 săptămâni", "25-65%" | many files |

### 6.5 Loanwords and technical English

Romanian copy keeps many English terms: dashboard, facility manager, check-in, upgrade, retrofit, setpoint, benchmark, template, quiz, open plan, hot-desking, demand response, fail-safe, failover, uptime, analytics, bill of materials, as-built. Loanword plurals take a hyphen: "AHU-urile", "CTA-uri", "gateway-uri", "setpoint-uri", "KPI-uri", "PLC-uri", "dashboard-uri" (`app/servicii/page.tsx`, `lib/sector-data.ts`, `app/resurse/articole/optimizare-hotel-bms/page.tsx`).

The site spells the word two ways: "controllere" (`app/servicii/executie/page.tsx`, `app/servicii/page.tsx`) and "controlere" (`app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`, `lib/sector-data.ts`).

### 6.6 Brand name

| Form | Where |
|------|-------|
| Sovitech | most body copy and customer quotes (79 occurrences) |
| Sovitech Control | page metadata, company introductions in articles and case studies, and a few headings, quotes and consent lines (26 occurrences) |
| SOVITECH Control | logo alt text (`components/header.tsx`, `components/footer.tsx`) |
| SOVITECH CONTROL SRL | legal name, in the address block (`app/contact/page.tsx`) |
| SOVITECH | sector pages (`lib/sector-data.ts`) |

This app's own documents use "SOVITECH" (`CLAUDE.md`).

### 6.7 Errors seen in Romanian copy

Listed so they are not copied: "alarmelee", "Realizem", "Configurem", "scaloneaza", "Training annual" (`app/servicii/page.tsx`). The deliverables eyebrow reads "Ce livrezi clientului" ("what you deliver to the client") where the English reads "What we deliver" (`app/servicii/page.tsx`). The "Configurare si programare" step in `app/servicii/page.tsx` renders "setpoints" as "seturi de puncte".

---

## 7. Words the app must not reuse as-is

These website phrases would break the app's guardrails if the app used them as written. The app's wording comes from `docs/guardrails.md`. The "App wording" column only points to wording that already exists there. It proposes nothing new.

The reserved terms (`docs/guardrails.md` section 2.8) are:
- **English:** confirmed, verified, exact, precise, guaranteed, will save, will reduce, certified, compliant, complies, meets, conforms, in line with, achieves class, final, definitive, binding, firm price, quote, quotation, offer.
- **Romanian:** confirmat, verificat, exact, garantat, certificat, conform, conformitate, în conformitate cu, final, definitiv, ofertă, ofertă fermă, cotație, deviz.

They are allowed only in action labels, badges and status lines built from stored state, verbatim document quotations and registry qualifier labels. Rule 10 adds: savings, payback, ROI and performance are always Estimated, "could save", never "will save".

### 7.1 Guarantees and promises (rule 10, reserved terms)

| Website phrase | Source | Why not |
|----------------|--------|---------|
| "Rezultate garantate." / "Guaranteed results." | `app/servicii/page.tsx` | Reserved term. Results are never guaranteed (rule 10). |
| "Uptime garantat al sistemului" / "Guaranteed system uptime" | `app/servicii/mentenanta/page.tsx` | Reserved term. A performance figure without a basis. |
| "Disponibilitate garantată a sistemului" / "System uptime guaranteed" | `lib/sector-data.ts` | Same. |
| "Scenarii automate de check-in/check-out pentru economii garantate" / "…for guaranteed savings" | `lib/sector-data.ts` | Savings are always Estimated (rule 10). |
| "failover automat pentru zero întreruperi" / "to guarantee zero interruption" | `lib/sector-data.ts` | Reserved term and an absolute claim. |
| "Blocheaza costurile de management BMS pentru 10 ani" / "Lock in your BMS management costs for 10 years" | `app/servicii/page.tsx` | A price commitment. Only a stored quotation record can carry a commitment (rule 10). |
| "Fără obligații, fără costuri ascunse." | `app/ghid-bms/page.tsx` | A cost promise about an unknown scope. |

**App wording:** "could save", the Estimated badge with a range and basis, and stage labels (rule 10, section 2.8). The app has no equivalent for uptime or cost-lock promises, so it does not make them.

### 7.2 Savings and ROI stated as fact (rules 9 and 10)

| Website phrase | Source | Why not |
|----------------|--------|---------|
| "Soluții BMS integrate care optimizează consumul de energie, reduc costurile operaționale…" | `app/page.tsx` | States savings as fact. In the app, savings are "could" and Estimated. |
| "…reducând totodată costurile cu energia cu până la 35% în întregul portofoliu" / "cutting energy costs by up to 35%" | `lib/sector-data.ts` | A savings figure with no project basis. |
| "Descoperă economiile potențiale exacte pentru clădirea ta" / "Discover the exact potential savings" | `app/ghid-bms/calculator/page.tsx` | "exact" is reserved. Estimates show a range. |
| "Folosește calculatorul ROI pentru a estima economiile exacte" / "estimate your exact savings" | `app/ghid-bms/quiz/page.tsx` | Same. |
| "Descoperă economiile potențiale exact pentru tine" | `app/ghid-bms/dashboard/page.tsx` | Same. |
| "Obțineți economii reale și previzibile", "investiții solide cu ROI previzibil" | `app/resurse/articole/eficienta-bms/page.tsx` | Promises a predictable result. |
| "Descoperiți cât puteți economisi în maxim 2 ore." | `app/resurse/articole/optimizare-hotel-bms/page.tsx` | Implies a savings figure without the owner's data. |
| "Economii anuale", "Perioada de amortizare", "Investiție totală" shown as single figures | `app/ghid-bms/calculator/page.tsx` | The app shows ranges with basis and method, rounds outward (rule 9), and names the pricing stage (rule 10). |
| "Cât poți economisi cu un BMS?" / "How much could you save with a BMS?" | `app/calculator-roi/page.tsx` | The English already uses "could". The Romanian "poți" means "can". A Romanian app string would need the conditional ("ai putea economisi" or "ați putea economisi", see 6.2). This is a wording note, not a rule. |

**App wording:** "could save" (rule 10), the Estimated badge, and "about 5,800 (5,200 to 6,400)" style lines (section 2.8). When first-estimate data is missing the app shows "Not available yet" with an action (section 2.8).

### 7.3 Compliance and certification claims (rule 11, reserved terms)

| Website phrase | Source | Why not |
|----------------|--------|---------|
| "Conform prin design." / "Compliant by design." | `lib/sector-data.ts` | The app never attests compliance (rule 11). |
| "soluții BMS certificate care asigură conformitatea" / "certified BMS solutions that ensure compliance" | `lib/sector-data.ts` | Same. Reserved terms "certificat", "conformitate". |
| "Medii conforme" / "Compliant environments" (GMP) | `lib/sector-data.ts` | Same. |
| "Înregistrare de date conformă FDA 21 CFR Part 11 și EU GMP Anexa 11" | `lib/sector-data.ts` | Same. Standards and editions come only from reference data. |
| "raportare completă conform GMP" / "full GMP-compliant reporting"; stat "GMP" "Conformitate" | `components/case-study-slider.tsx` | Same. |
| "…pentru conformitate LEED, BREEAM și EPBD, fără efort manual" | `lib/sector-data.ts` | Same. Also mixes certification schemes with a legal obligation. |
| "documentatia de conformitate cu normele in vigoare (SR EN ISO 16484)" / "compliance documentation in line with current standards" | `app/servicii/page.tsx` | "conformitate" and "in line with" are reserved. The standard's edition is not stated. |
| "Toate documentele respectă standardele în vigoare." / "All documents comply with the standards in force." | `app/servicii/proiectare/page.tsx` | "comply" means attesting compliance (rule 11). |
| "Echipamente certificate conform standardelor europene" | `app/servicii/executie/page.tsx` | Reserved terms. Product certifications come from reference data. |
| "Produse care îndeplinesc cele mai înalte standarde și certificări elvețiene." / "…meet the highest Swiss standards and certifications." | `app/produse/page.tsx` | "meets" is reserved. |
| "Conformitatea EPBD in 2026" / "EPBD compliance in 2026"; "…cum te poate ajuta un BMS sa le indeplinesti" | `app/resurse/page.tsx` | Whether an obligation applies stays Unknown until an engineer verifies the facts behind it (rule 11). |
| "Conformitate cu reglementările" / "Regulatory compliance"; "Conformitate cu sustenabilitatea" | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` | Reserved terms. |
| "Cum a obținut Radisson Blu București certificarea BREEAM Excellent prin automatizare BMS integrată" | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` | Credits a certification to the BMS. |
| Energy certification "A+" "Certificare energetică obținută"; "ne ajută să menținem certificarea energetică clasa A" | `lib/sector-data.ts`, `components/aethel-testimonials.tsx` | The energy certificate class (Mc001), the BAC class (EN ISO 52120-1:2021) and legal obligations are three separate fields and are never mixed (rule 11). |
| "Conformitate & ESG" (goal tile, description "EPBD, certificări verzi, raportare ESG") | `app/calculator-roi/page.tsx` | Reserved term as a goal name. |

**App wording:** before engineer verification, "aims to support BAC class B (EN ISO 52120-1:2021)". After verification the app itself generates "designed to provide the functions of BAC class B, verified by SOVITECH" (rule 11). The AI never writes it.

### 7.4 Life-safety claims (rule 11)

| Website phrase | Source | Why not |
|----------------|--------|---------|
| "…automatizarea funcțiilor critice ale clădirii: HVAC, securitate, control acces, iluminat și detecție incendiu" / "automating the building's critical functions: … and fire detection" | `app/servicii/proiectare/page.tsx` | Fire detection is read-only to the BMS. The BMS may monitor, display, log and alarm, never automate or command it. |
| "Detecție incendiu - Monitorizare și alertare automată pentru siguranță maximă" | `app/servicii/proiectare/page.tsx` | Monitoring and alarms are allowed. "siguranță maximă" is a safety claim. |
| "activarea ventilației de urgență" / "emergency ventilation activation" | `lib/sector-data.ts` | A BMS command on a life-safety function. Allowed only if the ISU-approved fire-safety scenario specifies it and a SOVITECH engineer confirms it. The AI never proposes it. |
| "integrare cu detecția de gaze" / "gas detection integration" | `lib/sector-data.ts` | Gas detection and shut-off are life-safety systems and stay read-only. |
| "Integrare sisteme de incendiu" / "Fire system integration" | `app/cerere-oferta/page.tsx` | Usable only as a scope name that means monitoring. The proposal must keep the fire-alarm input and fire-mode status points. |
| "verificarea protecțiilor" and "Implementăm scenarii automatizate și alarme de siguranță." | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`, `app/servicii/executie/page.tsx` | Loose safety wording. The app uses only the four verbs (monitor, display, log, alarm) for life-safety items. |

### 7.5 Quotation and stage language (rule 10)

| Website phrase | Source | Why not |
|----------------|--------|---------|
| "Oferta finala este personalizata in functie de suprafata si complexitatea proiectului." | `app/servicii/page.tsx` | "ofertă" and "final" are reserved outside action labels. |
| "Primești o ofertă personalizată cu echipamente SAUTER originale" | `components/product-detail.tsx` | Promises an offer. The app never implies one. |
| "Un specialist Sovitech … te va contacta cu o propunere personalizată în cel mult 48 de ore." | `app/cerere-oferta/page.tsx` | A turnaround promise that no guardrail supports. |
| "Deblochează ofertă personalizată" / "Unlocks a personalised offer" | `app/ghid-bms/dashboard/page.tsx` | Reserved term. |
| "Investiție totală:", "Cost estimat implementare" (single figures, no stage) | `app/ghid-bms/calculator/page.tsx`, `app/calculator-roi/page.tsx` | Every investment figure names its stage (rule 10). |

**App wording:** "Indicative range", "Preliminary investment estimate", and "Formal quotation", the last only from a stored quotation record (rule 10).

### 7.6 Precision and accuracy words (reserved terms, rule 1)

"exact" is reserved in both languages and "precise" in English. The Romanian list has no form of "precis", but rule 1 still applies: an accuracy figure is an engineering value and needs a source.

| Website phrase | Source | Why not |
|----------------|--------|---------|
| "±0,5°C" "Precizie de temperatură în zonele critice"; "Precizie temperatura" | `lib/sector-data.ts`, `components/case-study-slider.tsx` | "precise" is reserved in English. An accuracy figure is an engineering value and needs a source. |
| "senzori de inalta precizie" | `app/servicii/page.tsx` | Same. |
| "o estimare cât mai precisă a costului și ROI-ului" | `app/calculator-roi/page.tsx` | Same. |
| "propunere adaptată exact nevoilor clădirii tale" | `app/cerere-oferta/page.tsx` | "exact" is reserved. |

### 7.7 Verification words (section 2.8)

| Website phrase | Source | Why not |
|----------------|--------|---------|
| "…verificate și actualizate constant." / "verified and continuously updated" | `components/stats-section.tsx` | "verified" appears in the app only as "Verified by SOVITECH", built from an engineer verification record. |
| "Cifrele confirmă." / "The numbers confirm." | `components/aethel-testimonials.tsx` | Implies confirmation. "Confirmed by you" in the app comes only from stored state. Whole-word matching on "confirmat" and "confirmed" would not catch "confirmă" or "confirm" (see 7.10). |
| "Fiecare integrare este validata punct cu punct." | `app/servicii/page.tsx` | A verification claim about a project the app has not seen. |

### 7.8 Absolute capability claims (rules 1 and 12)

| Website phrase | Source | Why not |
|----------------|--------|---------|
| "Integrăm orice protocol" / "We integrate any protocol" | `components/services-showcase.tsx` | The app never assumes a device's protocol. It comes from a document, or it stays unknown (rule 1). |
| "…care permit integrarea cu majoritatea sistemelor existente" | `app/servicii/page.tsx` | Same. |
| "Operatorul vede totul dintr-un singur loc." / "100% Vizibilitate centralizată" / "∞ Scenarii de automatizare" | `app/servicii/page.tsx`, `app/servicii/integrare/page.tsx` | Absolute claims. The app says what it could not do (rule 12). |
| "Construit să controleze orice clădire." | `app/page.tsx` | Usable as a company tagline. It must never be read as a statement about a specific project. |

### 7.9 Reuse and benchmark claims (rule 1)

| Website phrase | Source | Why not |
|----------------|--------|---------|
| "Migrăm de la sisteme legacy la tehnologii moderne, păstrând investițiile anterioare." | `app/servicii/mentenanta/page.tsx` | Reuse of existing equipment is never assumed. Until a survey, the estimate shows reuse and replacement as a range. |
| "Reduce costul de implementare cu aproximativ 30%" (existing automation) | `app/calculator-roi/page.tsx` | Same. |
| "100-150 kWh/mp/an consum hotel tipic", "20-30% Reducere țintă", "Consumul energetic mediu pe sector (kWh/m²/an)" | `app/resurse/articole/optimizare-hotel-bms/page.tsx`, `app/ghid-bms/page.tsx` | Typical values never fill a field. A benchmark can only feed an Estimated value, from an approved dataset whose area basis is declared (rules 1 and 8). |
| Industry averages such as "150.000 – 500.000 EUR/an" and "5.000 – 50.000 mp" shown as hints | `app/calculator-roi/page.tsx` | Same. |

### 7.10 A possible gap in the reserved-term check

This is an observation for the approver. It is not a change to the guardrails.

`design/dashboards-spec.md` section 7.2, proposal 29 ("Gaps in the reserved-term list"), already proposes this tightening. It adds English and Romanian inflected forms such as "guarantee", "garantăm", "garanție", "ensure(s)" and "asigură", keeping the two lists at parity. The website forms below sharpen that proposal. They belong in proposal 29 and its proving case, not in a separate proposal.

Section 2.8 matches reserved terms as whole words, ignoring case and diacritics. The website uses these inflected forms of reserved words, which a whole-word match on the listed form would not catch and which proposal 29 does not yet name:
- "garantate", "garantată" (the list has "garantat");
- "certificate", "certificați", "certificări" (the list has "certificat");
- "conformă", "conforme" (the list has "conform");
- "verificate" (the list has "verificat");
- "confirmă" (the list has "confirmat").

In English, proposal 29 already names "guarantee". "Comply" (the list has "complies") is a further case: "All documents comply with the standards in force." (`app/servicii/proiectare/page.tsx`). Sources: `app/servicii/page.tsx`, `lib/sector-data.ts`, `components/stats-section.tsx`, `components/aethel-testimonials.tsx`, `app/servicii/executie/page.tsx`.

If the check is meant to catch these, the list or the matcher needs inflected forms. Adding terms tightens the rules. Under `CLAUDE.md` it needs the approver's decision, with a case that proves it. Website strings that proposal 29's proving case could add as must-flag examples: "Rezultate garantate." (`app/servicii/page.tsx`), "Medii conforme" (`lib/sector-data.ts`), "Cifrele confirmă." (`components/aethel-testimonials.tsx`). One false-positive risk: "certificate" is also an English noun ("the acceptance certificate", `app/servicii/page.tsx`), so a matcher shared by both languages would flag it.

---

## 8. Open questions for SOVITECH

These need a decision before any of the website's messaging reaches the app.

1. **Formality.** For Romanian text in the app, "tu" or "dumneavoastră"?
2. **Project count.** Is it "30+" or "150+"? Which, if any, may the app show about SOVITECH?
3. **Brand name.** In the app, is it "SOVITECH", "SOVITECH Control" or "Sovitech Control"? Partly answered 2026-09-24: SOVITECH is the brand and the app uses the real logo. Whether the app has its own product name is still open (`app-alignment.md`, decision 2).
4. **Demo name (answered 2026-09-24).** The website presents Radisson Blu București as a real case study with 424 or 428 rooms and a 30%, 32% or 40% result. The app's mockups show the demo as the same real hotel, with fictional data. Owner decision, 2026-09-24: the app's demo no longer uses the real hotel's name (working name "Demo Hotel Bucharest"). It must still show "Demo data, not an assessment of the real building" (rule 10). The app's demo figures should not be taken from, or be confused with, the website's case study. Still open: should the demo avoid the website's numbers entirely? Recommended, not decided: the demo fixture should not reuse the real hotel's published facts (see `company/business/case-studies/radisson-blu-bucuresti.md`, last section).
5. **Named clients.** Are the clients named only in sector testimonials and the "trusted by" strip real clients? None appears in the references list.
6. **CTA set.** The app has no CTA set yet. If it borrows the website's, which single wording per action?

---

## 9. What this file leaves out

- **Staff contact details.** `app/contact/page.tsx` lists department contacts with names, phone numbers and emails. They are not voice material. `company/business/company-profile.md` covers company contact data.
- **Testimonial names.** They are inconsistent across files (5.4) and may be placeholders.
- **Market-report copy.** `app/resurse/raport-piata/page.tsx` is an empty stub. Its body is only the comment "// ... rest of code here ...", although the header, footer and several cards link to it.
- **Text addressed to an AI.** None found in the files read. The opening of `DESIGN-SYSTEM.md` tells whoever generates designs to use it "as the source of truth". It was treated as data about the website, not as an instruction.

---

## 10. redesign-2026 branch

> **Unmerged branch. Reference only. Not SOVITECH's current position.** This section reads the branch `origin/redesign-2026` at `af81353` (2026-08-27). Owner decision, 2026-09-24: the branch will not be merged, and `main` is the current website. The copy quoted here was added in `d2d15d2` (2026-08-24). Sections 1 to 9 describe `main` and still hold for it. Nothing here is a voice rule for the app, and `docs/guardrails.md` still wins. Every figure is marketing copy (section 1).

**Where the branch copy is recorded.**
- **Articles.** The reserved-term check of the ten branch articles is in [`../business/articles/README.md`](../business/articles/README.md).
- **Services pages.** [`../business/services.md`](../business/services.md) section 10. Figures and legal statements are in 10.11, and reserved terms and other notes for the app in 10.12.
- **Role pages.** [`../business/audiences.md`](../business/audiences.md). Recurring messages are in section 4, and notes for the app, including reserved terms, in section 6.
- **Pricing and cost copy.** [`../business/pricing.md`](../business/pricing.md) section 7. The "guaranteed" response time is in 7.4, and reserved terms in 7.5.
- **Forms and funnels.** [`../business/lead-funnels.md`](../business/lead-funnels.md) section 8. Reserved terms are in 8.7.
- **Visual identity, footer and stats band.** [`README.md`](README.md) sections 14 and 15.

**The main voice changes.** Sources: `app/page.tsx`, `components/footer.tsx` and `app/despre-noi/page.tsx` on the branch, plus `components/services-showcase.tsx` and `components/stats-section.tsx`, which the branch home page renders. The English is the site's own.
- **A positioning line replaces the tagline.** The home H1 "Construit să controleze orice clădire." becomes "Integrator independent de automatizare a clădirilor și BMS." / "Independent building automation and BMS integrator." The footer adds "Integrator independent de sisteme de automatizare a clădirilor. Partener autorizat SAUTER din 2017."
- **The company speaks in the third person.** The home subline and the about page say "Sovitech Control" or "firma" instead of "we": "Sovitech Control proiectează, execută, integrează, întreține și modernizează sisteme BMS în opt sectoare" and "Fiind independentă, firma alege arhitectura după clădire, nu după catalogul unui producător." The services cards on the same home page keep the first person ("Proiectăm", "Integrăm orice protocol", "Menținem clădirea la performanță maximă"), so the home page uses both.
- **Checkable claims instead of large totals.** The home trust line "30+" becomes "25 proiecte de referință livrate, cu nume public, listate cu nume, oraș și sector pe pagina de referințe". The about page adds: "Firma nu publică cifră de afaceri, număr de angajați sau număr total de proiecte peste cele 25 listate public. Ce se poate verifica este lista de clădiri." The stats band on the same home page still shows "30+" "proiecte finalizate cu succes", "15+" "ani experiență în automatizare" and "verificate și actualizate constant".
- **No invented people.** A code comment on the home page says the stock "team" headshots were removed: "no invented people on the site". A comment on the about page keeps the team section hidden until real names, roles and photographs exist. The branch's new service images bring invented-looking people back ([`imagery/README.md`](imagery/README.md), branch folder `services-redesign-2026/`).
- **Assessment first, not a free offer.** The home hero CTA "Cerere ofertă gratuită" becomes "Cere o evaluare a clădirii" / "Request a building assessment". The footer's "Contactează-ne" becomes "Cere o evaluare", and the about page ends with "Cere o discuție tehnică". The header button is still "Cerere ofertă".
- **Formality is still mixed.** The about page's closing heading uses the formal form, "Discutați proiectul cu inginerul care îl va executa", and its button the informal "Cere o discuție tehnică". Open question 1 in section 8 still stands.

**What the app still may not reuse from this copy** (section 7 applies):
- "cu timp de răspuns garantat" (about page) uses the reserved "garantat". The same page's FAQ says "cu timp de răspuns declarat" ([`../business/pricing.md`](../business/pricing.md) 7.4).
- The new voice leans on verification words: "pot fi verificate prin numele clădirii", "o afirmație care se verifică în trei locuri concrete" (about page). In the app, "verified" comes only from an engineer verification record (section 2.8 of the guardrails). "verificate" is one of the inflected forms in 7.10.
- "Echipamentele existente rămân în funcțiune dacă starea lor o permite" (home page) is a reuse claim. The app never assumes reuse (rule 1, see 7.9).
- The about page names SAUTER product lines and models, such as Modulo6 (EY-AS660 and EY-AS680) and ModuWeb Vision EY-WS 500. In the app, SAUTER identifiers come only from reference data (rule 1).
