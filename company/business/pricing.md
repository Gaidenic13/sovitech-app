# SOVITECH website pricing

Everything the SOVITECH website says about packages, tiers, inclusions and cost, recorded verbatim, and how it relates to the app's three pricing stages (guardrails rule 10). The short version: the website publishes no prices at all.

**Source:** repository `Gaidenic13/sovitech-website`, commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11). Paths are relative to that repository's root. Imported on 2026-09-23.

**Status of the content.** Website marketing copy. None of it is a price, a quotation or approved reference data.

**Unmerged branch, for reference only.** Sections 1 to 6 describe `main`, the current website. The branch `redesign-2026` (commits `d2d15d2` and `af81353`, 2026-08-24 and 2026-08-27) drops the services-page packages and publishes cost bands per m², per data point and as a percentage for maintenance. That branch is not merged into `main`. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. Its pricing changes are in section 7, kept apart from the rest, for reference only.

---

## 1. Summary

- **No prices.** The pricing page (`app/pricing/page.tsx`) shows three tiers with feature lists, but no amount, currency, unit rate, VAT basis or validity. Every tier leads to the quote-request form.
- **Two package systems.** The pricing page has three tiers (Esențial, Profesional, Enterprise). The services page (`app/servicii/page.tsx`) has two different packages (Standard, Full Service). They do not map onto each other, and their contents conflict (section 4).
- **The pricing page is hard to reach.** Only the maintenance page links to `/pricing` ("Vezi pachetele de servicii" in `app/servicii/mentenanta/page.tsx`). It is not in the header, the footer or `app/sitemap.ts`.
- **Price-like figures exist elsewhere.** The ROI calculator, the BMS guide calculator and the quote form contain hard-coded cost heuristics and budget brackets (section 5). They are not on the pricing page.

---

## 2. The pricing page, verbatim

Source: `app/pricing/page.tsx`

**Hero.**
- Title: "Pachete de servicii BMS" / "BMS service packages"
- Subtitle: "Alege pachetul potrivit pentru proiectul tău de automatizare. Primești o ofertă personalizată, adaptată nevoilor tale." / "Choose the right package for your automation project. Get a personalised quote tailored to your needs."

### 2.1 Tiers

| | Esențial / Essential | Profesional / Professional | Enterprise / Enterprise |
|---|---|---|---|
| Badge | None | "CEL MAI POPULAR" / "MOST POPULAR" | None |
| Tagline | "Pentru proiecte BMS la scară mică" / "For small-scale BMS projects" | "Pentru clădiri comerciale și de birouri" / "For commercial and office buildings" | "Pentru campusuri și complexe mari" / "For campuses and large complexes" |
| Area | "Până la 500 m² suprafață" / "Up to 500 m² floor area" | "Până la 5.000 m² suprafață" / "Up to 5,000 m² floor area" | "Suprafață nelimitată" / "Unlimited floor area" |
| Feature | "Control HVAC de bază" / "Basic HVAC control" | "Integrare completă BACnet, Modbus, KNX" / "Full BACnet, Modbus, KNX integration" | "Soluții complet personalizate" / "Fully bespoke solutions" |
| Feature | "Interfață utilizator simplă" / "Simple user interface" | "Management energetic avansat" / "Advanced energy management" | "Integrări multi-protocol complexe" / "Complex multi-protocol integrations" |
| Feature | "Suport tehnic prin email" / "Email technical support" | "Suport tehnic dedicat" / "Dedicated technical support" | "Manager de cont dedicat" / "Dedicated account manager" |
| Feature | | "Raportare și analiză consum" / "Consumption reporting and analysis" | "Suport prioritar 24/7" / "Priority 24/7 support" |
| Price | Not shown | Not shown | Not shown |
| Button | "Solicită o ofertă" / "Request a quote" → `/cerere-oferta` | same | same |

The area limits are the only numbers on the page. The site does not say which area basis they use (for example gross floor area or net usable area).

### 2.2 Pricing page FAQ

Heading: "Întrebări frecvente" / "Frequently asked questions"

**Ce include pachetul de servicii? / What does the service package include?**
- RO: "Pachetul include proiectare BMS, executie, integrare protocoale (BACnet, Modbus, KNX), echipamente SAUTER, punere in functiune si training operatori. Serviciile de mentenanta si suport tehnic sunt incluse conform tipului de pachet ales."
- EN: "The package includes BMS design, execution, protocol integration (BACnet, Modbus, KNX), SAUTER equipment, commissioning and operator training. Maintenance and technical support services are included according to the chosen package type."

**Pot face upgrade la pachet ulterior? / Can I upgrade my package later?**
- RO: "Da, sistemul BMS poate fi extins si actualizat in timp, pe masura ce cerintele proiectului evolueaza. Sovitech ofera servicii complete de upgrade si extindere pentru sistemele BMS existente, asigurand compatibilitatea cu instalatia originala."
- EN: "Yes, the BMS system can be expanded and upgraded over time as the project's requirements evolve. Sovitech offers comprehensive upgrade and expansion services for existing BMS systems, ensuring compatibility with the original installation."

**Costurile de instalare sunt separate? / Are installation costs separate?**
- RO: "Costurile variaza in functie de complexitatea proiectului, suprafata cladirii si specificatiile tehnice. Contactati echipa noastra pentru o oferta detaliata adaptata proiectului dvs., inclusiv o analiza a consumului actual de energie."
- EN: "Costs vary depending on project complexity, building area and technical specifications. Contact our team for a detailed quote tailored to your project, including an analysis of your current energy consumption."

The last answer does not say yes or no to the question.

**Conditions stated on the page:** none beyond the FAQ. No payment terms, validity, currency, VAT or exclusions.

---

## 3. Service packages on the services page

Source: `app/servicii/page.tsx`

### 3.1 Package cards

Section eyebrow "PACHETE DE SERVICII" / "SERVICE PACKAGES". Heading "Solicita o oferta personalizata" / "Request a personalised quote".

Intro: "Servicii activate prin software cu planuri construite pentru nevoile specifice ale cladirilor comerciale si industriale. Fiecare oferta este adaptata suprafetei si complexitatii proiectului tau." / "Software-enabled services with plans built for the specific needs of commercial and industrial buildings. Every quote is tailored to your project's area and complexity."

| | Standard | Full Service |
|---|---|---|
| Badge | None | "Recomandat" / "Recommended" |
| Tagline | "Ideal pentru proiecte mici si medii" / "Ideal for small and medium projects" | "Mentenanta inclusa" / "Maintenance included" |
| Description | "Servicii BMS esentiale pentru cladiri cu nevoi standard de automatizare." / "Essential BMS services for buildings with standard automation needs." | "Solutie completa cu suport continuu pentru cladiri care necesita performanta maxima." / "Complete solution with continuous support for buildings requiring maximum performance." |
| Consultatie initiala / Initial consultation | Included | Included |
| Proiectare sistem BMS / BMS system design | Included | Included |
| Echipamente SAUTER / SAUTER equipment | Included | "Echipamente SAUTER Premium" / "Premium SAUTER equipment" |
| Instalare & configurare / Installation & configuration | Included | Included |
| Punere in functiune / Commissioning | Included | Included |
| Training echipa / Team training | Included | "Training echipa extins" / "Extended team training" |
| Garantie / Warranty | "Garantie 2 ani" / "2-year warranty" | "Garantie 5 ani" / "5-year warranty" |
| Integrare multi-protocol / Multi-protocol integration | Not included | Included |
| Monitorizare 24/7 / 24/7 remote monitoring | Not included | Included |
| Mentenanta preventiva / Preventive maintenance | Not included | Included |
| Price | Not shown | Not shown |
| Button | "Cerere oferta" / "Request a quote" → `/cerere-oferta` | same |

Footnote: "Ambele pachete includ o consultatie initiala gratuita. Oferta finala este personalizata in functie de suprafata si complexitatea proiectului." / "Both packages include a free initial consultation. Every quote is personalised based on the area and complexity of the project."

The site does not say what makes SAUTER equipment "Premium".

### 3.2 Feature comparison

Eyebrow "CE ESTE INCLUS" / "WHAT IS INCLUDED". Heading "50+ servicii BMS" / "50+ BMS services" (the comparison lists 20 items). Intro: "De la management standard la infrastructura completa, Sovitech combina software modern si servicii de expert." / "From standard management to full infrastructure, Sovitech combines modern software and expert services." Items missing from Standard carry the note "*disponibil in Full Service" / "*available in Full Service". The Full Service view has the banner "Operatiuni complete + mentenanta inclusa" / "Full operations + maintenance included".

| Category (RO / EN) | Feature (RO / EN) | Standard | Full Service |
|--------------------|-------------------|----------|--------------|
| Operatiuni sistem / System operations | Manager de cont dedicat / Dedicated account manager | Yes | Yes |
| | Software management BMS / BMS management software | Yes | Yes |
| | Dashboard monitorizare energie / Energy monitoring dashboard | Yes | Yes |
| | Rapoarte consum energetic / Energy consumption reports | Yes | Yes |
| | Alerte automate / Automated alerts | No | Yes |
| Instalare & configurare / Installation & configuration | Audit tehnic complet / Full technical audit | Yes | Yes |
| | Design personalizat / Custom design | Yes | Yes |
| | Documentatie tehnica / Technical documentation | Yes | Yes |
| | Configurare HVAC avansata / Advanced HVAC configuration | No | Yes |
| | Optimizare algoritmi de control / Control algorithm optimisation | No | Yes |
| Integrare & protocoale / Integration & protocols | Protocol BACnet / BACnet protocol | Yes | Yes |
| | Protocol Modbus / Modbus protocol | Yes | Yes |
| | Protocol KNX / KNX protocol | No | Yes |
| | Protocol DALI iluminat / DALI lighting protocol | No | Yes |
| | Integrare sisteme terte / Third-party system integration | No | Yes |
| Suport & mentenanta / Support & maintenance | Suport telefonic Lun–Vin / Phone support Mon–Fri | Yes | Yes |
| | Suport 24/7 / 24/7 support | No | Yes |
| | Interventii de urgenta / Emergency interventions | No | Yes |
| | Mentenanta preventiva / Preventive maintenance | No | Yes |
| | Actualizari software gratuite / Free software updates | No | Yes |

### 3.3 Cost-lock claim

- "Blocheaza costurile de management BMS pentru 10 ani" / "Lock in your BMS management costs for 10 years"
- "Lanseaza, opereaza si scaloneaza sistemul tau BMS fara griji legate de costurile in crestere." / "Launch, operate and scale your BMS system without worrying about rising costs."
- CTA "Vorbeste cu un expert" / "Speak with an expert".
- No product, terms or conditions are given for this claim.

### 3.4 Warranty

- FAQ on `/servicii`: "Oferim garantie standard de 2 ani pentru pachetul Standard si 5 ani pentru Full Service. Garantia acopera echipamentele, software-ul si manopera." / "...The warranty covers equipment, software and labour."
- Installation page figure: "2 ani" "Garanție echipamente" / "2 yrs" "Equipment warranty" (`app/servicii/executie/page.tsx`).

---

## 4. Contradictions between the two package systems

| Topic | Pricing page (`app/pricing/page.tsx`) | Services page (`app/servicii/page.tsx`) |
|-------|---------------------------------------|------------------------------------------|
| Number and names | 3 tiers: Esențial, Profesional, Enterprise | 2 packages: Standard, Full Service |
| Highlighted option | Profesional, "CEL MAI POPULAR" | Full Service, "Recomandat" |
| Basis | Floor area (500 m², 5.000 m², unlimited) | Scope of service (maintenance included or not) |
| KNX | Included from Profesional ("Integrare completă BACnet, Modbus, KNX"); the FAQ says every package includes BACnet, Modbus and KNX | Not in Standard |
| Multi-protocol | Enterprise: "Integrări multi-protocol complexe" | Standard card: "Integrare multi-protocol" not included; the comparison still gives Standard BACnet and Modbus |
| Dedicated account manager | Enterprise only | Included in Standard in the comparison table |
| 24/7 support | Enterprise only ("Suport prioritar 24/7") | Full Service only |

---

## 5. Price-like figures elsewhere on the site

These are not on the pricing page. They are listed here only so nobody mistakes them for SOVITECH prices. Other files cover these pages in full: both calculators in [`roi-methodology.md`](roi-methodology.md), the quote form in [`lead-funnels.md`](lead-funnels.md), the Therme figures in [`case-studies/therme-bucuresti.md`](case-studies/therme-bucuresti.md) and the hotel article in [`articles/optimizare-hotel-bms.md`](articles/optimizare-hotel-bms.md).

| Figure | What it is | Source |
|--------|------------|--------|
| "aprox. 25 EUR/m²" / "approx. €25/m²" | Implementation cost the ROI calculator assumes when the user gives no budget. The code multiplies building size by 25 ("EUR/m² base"), applies a multi-building multiplier when there is more than one building (1 − 0.05 × building count, never below 0.6) and multiplies by 0.7 when existing systems are present. | `app/calculator-roi/page.tsx`, `lib/roi-calculator.ts` |
| Building size × 150, shown in RON | Investment cost in the BMS guide calculator. The page labels its inputs and outputs in RON. | `app/ghid-bms/calculator/page.tsx` |
| Budget brackets | Quote form options: "sub 50.000 EUR", "50.000 – 150.000 EUR", "150.000 – 500.000 EUR", "peste 500.000 EUR", "Nedecis". These are the owner's stated budget, not SOVITECH prices. | `app/cerere-oferta/page.tsx` |
| Annual energy cost ranges by sector | Hint text in the ROI calculator, for example "150.000 – 500.000 EUR/an" for hospitality | `app/calculator-roi/page.tsx` |
| "€158K" annual savings | Therme case study figure | `app/resurse/studii-de-caz/therme-bucuresti/page.tsx`, `components/case-study-slider.tsx` |
| "Investiție de 1.6M EUR" | Figure in a hotel BMS article | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |

The two calculators use different unit costs and different currencies for the same thing (investment per square metre). Neither names a source, a date, a VAT basis or an area basis.

---

## 6. How this relates to the app's pricing stages

The app's guardrails (`docs/guardrails.md`, version 1.3, rule 10) fix three stages for investment figures:

| Stage | Label | Basis |
|-------|-------|-------|
| 1 | **Indicative range** | Benchmarks only. Always a range. |
| 2 | **Preliminary investment estimate** | This project's data. A range while any input is provisional, with basis, provisional inputs, open items, exclusions and the supply split. |
| 3 | **Formal quotation** | Only from a stored quotation record naming the reviewing engineer and the commercial reviewer, with number, date, validity, currency, VAT basis, inclusions and exclusions. Goes stale when inputs change. |

How the website's pricing content fits:

- **The website sits before stage 1.** It publishes no figure, so nothing on the pricing page can seed an Indicative range. The package tiers are scope bundles, not price levels.
- **The website's "ofertă personalizată" / "oferta finală" is stage 3.** When the site promises "o ofertă personalizată" or "o ofertă detaliată", it means what the app calls a Formal quotation. The app may show a Formal quotation only from a stored quotation record (rule 10). The website's copy does not create one.
- **"Ofertă" and "quote" are reserved terms.** Both are on the guardrails reserved list (section 2.8). The app may use a label such as "Cerere ofertă" / "Request a quote" only as an action label, for example a button that sends the project to SOVITECH. It may not use either word to describe a figure below stage 3.
- **The €25/m² and 150 RON/m² heuristics are benchmarks at best.** Under section 2.1, a CAPEX figure from a rate per m² is always `estimated`. It could feed only a stage 1 Indicative range, as a range with its method named (rule 9). And only if the rate comes from an approved, versioned benchmark dataset with a currency, date and area basis. Adopting either figure as that dataset counts as adding a reference dataset, which is a loosening under section 10 and needs the approver's explicit approval. Until then the app may not use them.
- **The area bands (500 m², 5.000 m²) have no area basis.** Rule 8 requires every area value to state its basis. The app may not map a building to a website tier by area.
- **Warranty, the 10-year cost lock and package inclusions are commercial terms.** In the app they belong only in a stage 3 quotation record (its inclusions and exclusions), never in a stage 1 or stage 2 figure.
- **The owner's budget bracket from the quote form is a `user` value.** If the app ever asks for a budget, it is the owner's input, not an estimate, and it needs a sensitivity test like any other question (rules 5 and 6).
- **The website's packages do not state who supplies what.** Stage 2 in the app must name the supplier for field devices, gateways on third-party equipment, room control where a GRMS exists, control panels, panel power supply and cable containment (rule 10). "Echipamente SAUTER" in a package does not settle that split.

**Naming collision with the approved app design.** The part 2 dashboards mockups (`design/dashboards-spec.md`, screen 13) show app packages "Level 1 Essential", "Level 2 Standard" with a "Most popular" pill, "Level 3 Advanced" and "Level 4 Premium", each with a euro price and a €/m² rate. The website already uses "Esențial" / "Essential", "Standard", "CEL MAI POPULAR" / "MOST POPULAR" and "Recomandat" for different packages with different contents and no prices. Owners who know the website could read the app's "Standard" as the website's Standard package. The mockup prices are demo data, and under rule 10 they must carry a stage label from stored records. The product owner may want to choose names that do not overlap. This is flagged here, not decided.

---

## 7. Unmerged branch `redesign-2026`: pricing changes

> **Not `main`. Reference only. Not SOVITECH's current position.** Everything in this section comes from the branch `origin/redesign-2026` at commit `af81353` (2026-08-27). Most of it was added in `d2d15d2` (2026-08-24). The branch has not been merged into `main`. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. Paths are relative to the website repository root on that branch. A verbatim copy of each file is in `company/website/source-redesign-2026/`. Checked on 2026-09-24.

### 7.1 What changes compared with `main`

| Topic | `main` (sections 1 to 5) | Branch |
|-------|--------------------------|--------|
| Pricing page `/pricing` | Three tiers, no prices, linked only from the maintenance page | Same content. The diff changes only CSS classes (`app/pricing/page.tsx`). Nothing links to it any more: the old maintenance page is deleted and `/servicii/mentenanta` redirects to `/servicii/intretinere-sisteme-bms`, which has no `/pricing` link. It is still not in `app/sitemap.ts`. |
| Services-page packages | Standard and Full Service cards, a 20-item comparison, "50+ servicii BMS" | Gone. `app/servicii/page.tsx` now shows maintenance contract levels (7.3) and a cost table by building type (7.2). |
| 10-year cost lock | "Blocheaza costurile de management BMS pentru 10 ani" | Gone. No file on the branch contains it. |
| Warranty | 2 years (Standard) and 5 years (Full Service); "2 ani" equipment warranty | No warranty period is published anywhere on the branch. The maintenance page says the execution warranty is "un angajament distinct, cu durată proprie". The terms page says warranties come from the signed contract (`legal.md` section 4). |
| Published cost figures | None on the pricing or services pages | Cost bands per m², per data point, as a percentage of installations, and maintenance as a percentage of investment, on many pages (7.2) |
| ROI calculator cost | Flat 25 EUR/m² | A band per building type (7.2). Details in [`roi-methodology.md`](roi-methodology.md). |
| BMS guide calculator | Building size × 150, in RON | Unchanged (`app/ghid-bms/calculator/page.tsx`; the diff changes only CSS). |
| Quote form budget brackets | "sub 50.000 EUR" to "peste 500.000 EUR", "Nedecis" | Unchanged (`app/cerere-oferta/page.tsx`). Details in [`lead-funnels.md`](lead-funnels.md). |
| Therme "€158K" annual savings | Case study and slider | Gone. No file on the branch contains "158". |
| Hotel article "Investiție de 1.6M EUR" | Present | Still present (`app/resurse/articole/optimizare-hotel-bms/page.tsx`) |

### 7.2 Cost figures the branch publishes

Recorded as written. Marketing copy, not verified, not an approved benchmark.

**Cost table on the services page** (`app/servicii/page.tsx`). Heading "Costul orientativ pe tip de clădire" / "Indicative cost by building type". Intro: "Cifrele sunt benzi de piață pentru România, la nivelul unui sistem BMS nou, complet. Nu sunt oferte și nu înlocuiesc o estimare pe clădirea reală." The hero text adds: "Costul unui sistem BMS în România se situează în 4-18 EUR/mp și 90-320 EUR pe punct de date."

| Building type (RO / EN) | Cost band | Note (RO) |
|-------------------------|-----------|-----------|
| Birouri clasa A / Class A offices | 9-18 EUR/mp | "densitate uzuală 50-90 puncte la 1.000 mp" |
| Birouri clasa B / Class B offices | 5-10 EUR/mp | "fără contorizare extinsă pe chiriași" |
| Hotel, fără control pe cameră / Hotel, without room control | 6-13 EUR/mp | "doar instalațiile centrale" |
| Hotel, cu control pe cameră / Hotel, with room control | 18-38 EUR/mp | "costul camerei domină bugetul" |
| Retail | 4-9 EUR/mp | "replicabil pe rețea de magazine" |
| Industrial și logistic / Industrial and logistics | 3-8 EUR/mp | "suprafețe mari, densitate mică de puncte" |
| Pharma | 30-80 EUR/mp | "zone clasificate, monitorizare validată" |
| Pe punct de date / Per data point | 90-320 EUR/punct | "scade cu volumul" |

Below the table: modernisation costs "40-60% din prețul unui sistem nou, cu amortizare de 3-6 ani pentru o modernizare de capital", and maintenance "4-7% din valoarea investiției pe an pentru contractul de bază, 7-12% pentru cel extins".

**The cost article** (`components/articles/cost-sistem-bms.tsx`, served at `/resurse/cost-sistem-bms`, title "Cat costa un sistem BMS: structura de pret"). It states that "Toate cifrele din acest articol sunt ordine de mărime orientative pentru anul 2026, exprimate în EUR fără TVA" and that they "Nu sunt ofertă". Its FAQ gives the area basis as "arie utilă". Main figures:
- Three estimating methods: 90-320 EUR per complete physical point; 4-18 EUR/mp for retail, offices and hotels without room control; 4-11% of the value of the HVAC and electrical installations.
- Per point, by volume: 180-320 EUR under 150 points; 140-240 EUR at 150-500; 110-190 EUR at 500-1,500; 90-160 EUR above 1,500. A point read over a protocol: 25-70 EUR.
- Point density per 1,000 m²: offices A 50-90, offices B 25-45, hotel without room control 30-55, hotel with room control 90-160, retail 15-35, industrial 10-30, pharma 100-250.
- Percentage of installations: new building, standard automation 4-7%; high metering and reporting needs 7-11%; industrial 3-6%; pharma 10-18%.
- Nine cost lines: field devices 20-30%, controllers 12-18%, panels 10-18%, field cabling and mounting 12-20%, supervision software and licences 5-12%, programming and graphics 10-18%, commissioning 6-12%, as-built and training 2-5%, project management and warranty 3-6%.
- Annual software maintenance fee: 8-18% of the licence value.
- Maintenance per year, as a percentage of system value: no contract 3-15% ("imprevizibil"); basic contract (2 planned visits a year) 4-7%; extended contract (4 visits a year, seasonal tuning, monthly report, "timp de intervenție garantat") 7-12%; software fee on top.
- Retrofit: 40-60% of an equivalent new system, if more than 40% of the existing installation is reusable.
- Owner's reserve: 8-12% above the estimate for surprises in existing buildings.
- Three worked scenarios, called "exerciții ilustrative construite pentru acest articol, nu oferte și nu proiecte reale": offices of about 8,000 m² at 70,000-130,000 EUR; a 4-star hotel of about 120 rooms at 60,000-110,000 EUR without room control and 140,000-260,000 EUR with it; a production hall of about 12,000 m² at 45,000-95,000 EUR. Each shows "Amortizare orientativă" of 3-6 years.
- Funding context: a 150 million EUR Ministry of Energy programme from the Modernisation Fund for EU-ETS industrial operators, up to 30 million EUR per project; a regional call 2.1.B in Regiunea Sud-Est "lansat la 4 iunie 2026".
- Turnaround: a range estimate in 48 hours from plans and an equipment list; a firm offer in one to three weeks, after a site visit and an agreed points list.
- Dates: `datePublished` and `dateModified` 2026-08-16 in the metadata; the body says "Articol publicat 16.08.2026, actualizat 19.08.2026".

**Other pages that repeat or extend these figures:**
- `app/despre-noi/page.tsx`: "Bugetul anual uzual pentru un contract de bază este 4-7% din valoarea investiției, iar pentru un contract extins, cu timp de răspuns garantat, 7-12%."
- `app/servicii/intretinere-sisteme-bms/page.tsx`: a worked example, "Pentru o clădire de birouri de 10.000 mp cu un sistem la 13 EUR/mp, adică o investiție de circa 130.000 EUR, ordinul de mărime este de 5.200-9.100 EUR pe an la nivelul de bază și de 9.100-15.600 EUR la cel extins." Out-of-hours work is quoted separately "la tarif de urgență".
- `app/servicii/modernizare-sisteme-de-automatizare-si-bms/page.tsx`: modernisation of a class A office "se încadrează orientativ în 3,6-10,8 EUR/mp"; the annual licence fee benchmark "8-18% din valoarea componentei software pe an".
- `app/servicii/executie-sisteme-bms/page.tsx`, `app/servicii/proiectare-automatizari-bms/page.tsx` and `app/servicii/integrare-sisteme-knx-dali-modbus-mbus/page.tsx`: the 4-18 EUR/mp band, the per-type bands and 90-320 EUR per point.
- `app/servicii/consultanta/page.tsx`: no consultancy rate. The visible text says "Modul de tarifare, pe zile de lucru sau pe pachet, se stabilește la definirea sferei." A code comment says the page publishes no rates until the day rate and standard packages are confirmed.
- `lib/role-copy.ts` (the role pages, see [`audiences.md`](audiences.md)): 4-18, 9-18 and 5-10 EUR/mp, 30-80 EUR/mp for pharma, 90-320 EUR per point, maintenance 4-7% and 7-12%.
- `app/termeni/page.tsx`: the terms call the published bands "repere de piață pentru bugetare preliminară" and say nothing on the site is a firm offer (`legal.md` section 4).
- `lib/roi-calculator.ts`: implementation cost bands in EUR/m² as min / typical / max: office 9 / 13 / 18, hospitality 6 / 9 / 13, retail 4 / 6 / 9, industrial 3 / 5 / 8, healthcare and data centre 4 / 13 / 18. The multi-building discount and the 0.7 factor for existing systems from `main` are kept, and the rate now applies to the total area of all buildings. A code comment says the bands follow "doc 12 §3.1", which is not in the repository.

### 7.3 Maintenance contract levels

Source: `app/servicii/page.tsx`, section "NIVELURI DE CONTRACT DE ÎNTREȚINERE" / "MAINTENANCE CONTRACT LEVELS", heading "Întreținere pe niveluri: Bază și Extins" / "Maintenance by level: Base and Extended".

| | Bază / Base | Extins / Extended |
|---|---|---|
| Tagline | "4-7% din valoarea investiției pe an" | "7-12% din valoarea investiției pe an" |
| Badge | None | "Interval extins" / "Extended window" |
| Description (RO) | "Verificări planificate și asistență la distanță în programul de lucru. Intervențiile la fața locului și modificările de configurare se ofertează la solicitare." | "Interval de disponibilitate mai larg, intervenții la fața locului incluse în limita unui număr de vizite pe an și modificări de configurare incluse în limita unui buget de ore." |
| Included in both | Planned checks at a declared frequency; intervention log and report (periodic for Base, monthly for Extended); remote assistance; configuration backup; spare-part recommendations | same |
| Only in Extended | | Extended availability window; on-site intervention up to the visit limit; configuration changes within a budget of hours; planned firmware updates; severity 1 taken by an on-call service |
| Button | "Vezi detaliile contractului" → `/servicii/intretinere-sisteme-bms` | same |

A third level, **Critic**, is described in text only: "preluare permanentă a sesizărilor, inclusiv în weekend și în sărbători legale". Response times, check frequency and hours "se stabilesc și se scriu în contract". Code comments in `app/servicii/page.tsx` and `app/servicii/intretinere-sisteme-bms/page.tsx` say response times are not published until the company confirms them, and that the Critical level's cost band, exact hours and out-of-hours rate are unresolved.

### 7.4 Contradictions on the branch

- **Protocol points.** The cost article prices a point read over a protocol at 25-70 EUR. The integration page says integrated points cost "în aceeași bandă de 90-320 EUR pe punct de date", with bus points "în partea de jos a benzii".
- **Hotels in the calculator.** The services page gives hotels with room control 18-38 EUR/mp. The calculator uses 6-13 EUR/m² (the band without room control) for every hospitality building.
- **Scenario payback.** Each cost-article scenario shows "Amortizare orientativă 3-6 ani", which the article describes as the band for a capital modernisation. Dividing each scenario's own cost range by its own savings range gives wider spans: about 2.5 to 10.8 years for the offices and about 1.1 to 6.3 years for the hall. This is my arithmetic, run in code, not the site's. The hotel scenario gives one savings range for two cost variants, so it is not recomputed.
- **"Guaranteed" response time.** The about page and the cost article describe the extended contract "cu timp de răspuns garantat" / "timp de intervenție garantat". The services page says "Contractul se scrie pe severități, nu pe promisiuni", and no response time is published. The maintenance page repeats that sentence in its lead (`app/servicii/intretinere-sisteme-bms/page.tsx`, line 144), but further down it says "Ce se garantează este timpul de răspuns, timpul de prezență și transparența asupra cauzei" (line 302; the site's EN: "What is guaranteed is the response time, the attendance time and transparency about the cause."), while its level table gives every response time as "convenit prin contract" (line 52). So the branch guarantees a response time it does not state.
- **Estimate turnaround.** The cost article promises a range estimate "în 48 de ore". The quote form says the budget estimate, as a range, follows "în 3-5 zile lucrătoare de la clarificarea datelor".
- **Scale of the per-type bands.** The article's 8,000 m² office scenario, 70,000-130,000 EUR, works out at about 8.75 to 16.25 EUR/m². Its lower end is below the class A band (9-18) but inside the offices band overall (5-18).

### 7.5 How the branch figures relate to the app's pricing stages

- **They are still website marketing copy.** The branch calls them "benzi de piață", "ordine de mărime orientative" and "repere de piață pentru bugetare preliminară". It states a currency (EUR), a VAT basis ("fără TVA"), a year (2026) and, in the article, an area basis ("arie utilă"). That makes them look like a benchmark dataset. They are not one: no approval record exists, and the stated sources ("doc 12", "studii independente") are not in the repository.
- **They may not feed stage 1.** An Indicative range needs an approved, versioned benchmark dataset (rules 9 and 10, section 2.1). Adopting these bands would be adding a reference dataset, which is a loosening under section 10 and needs the approver's explicit approval. Test case G1-12 (guardrails version 1.3) covers the failure: a dataset with no approval record cannot feed `reference` candidates.
- **Maintenance percentages and contract levels are commercial terms.** In the app they belong only in a stage 3 quotation record, never in a stage 1 or stage 2 figure.
- **Reserved terms.** The branch copy uses "ofertă" and "garantat" (for example "timp de intervenție garantat"), and the maintenance page uses the verb "garantează" ("Ce se garantează este timpul de răspuns", section 7.4; EN "What is guaranteed"). In the app these are allowed only where section 2.8 allows them. Section 2.8 lists "garantat" and "guaranteed" and matches whole words, so as written it would catch the English sentence but not the Romanian verb form "garantează".
- **Naming collision, updated.** On the branch the services page no longer uses "Standard", "Full Service" or "Recomandat". The overlap with the app mockup's "Level 1 Essential" and "Most popular" remains only on the unlinked pricing page ("Esențial", "CEL MAI POPULAR"). The branch adds maintenance levels "Bază", "Extins" and "Critic", which do not overlap the mockup names.
