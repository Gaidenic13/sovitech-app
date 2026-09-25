# Sectors on the SOVITECH website

This file records the six industry sectors that the SOVITECH website presents, with every headline, metric, feature, capability, testimonial and related-sector link, in English and Romanian. It was copied from the website repository at commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11). Nothing here was checked against real projects.

Everything before section B describes `main`. Section B, at the end, records the rewritten sectors on the unmerged branch `redesign-2026` (commit `af81353`, 2026-08-27): ten sectors on new `/expertiza` URLs. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. Section B is for reference only.

Sources (paths relative to the website repo root):
- `lib/sector-data.ts`: all sector content, EN and RO.
- `app/sectoare/page.tsx`: the sector index page (`/sectoare`).
- `app/sectoare/[sector]/page.tsx` and `app/sectoare/[sector]/sector-client.tsx`: the sector detail page template (`/sectoare/<slug>`).

## Status of these figures

Every number on this page is website marketing copy: savings percentages, uptime, payback periods, review-score gains, energy classes and the figures inside testimonials. None of it is verified engineering data, and none of it is an approved reference dataset.
- The app may not use these figures as values, defaults, ranges or benchmarks (guardrails rule 1 and section 2.1).
- Using them as benchmarks would need a versioned reference dataset approved by the approver, which counts as a loosening (guardrails section 10 and rule 13).
- Standards and protocols named here (LEED, BREEAM, EPBD, ISO 14644, EU GMP Annex 11, FDA 21 CFR Part 11, ISO 50001, BACnet, KNX, Modbus) are listed as the website states them. In the app, standards come only from reference data with their edition (rule 11).

## Sector list

| # | id / slug | Title EN | Title RO | Subtitle EN | Subtitle RO | Accent | Related |
|---|-----------|----------|----------|-------------|-------------|--------|---------|
| 1 | `civil` | Offices | Birouri | Office buildings & commercial spaces | Clădiri de birouri și spații comerciale | `#C5C0F5` | medical, retail, educational |
| 2 | `medical` | Medical & Pharma | Medical & Farma | Hospitals, clinics & pharmaceutical production | Spitale, clinici și producție farmaceutică | `#C8E6C9` | industrial, civil, educational |
| 3 | `retail` | Retail | Retail | Shopping centres, hypermarkets & retail chains | Centre comerciale, hipermarketuri și lanțuri de retail | `#8B7B5C` | horeca, civil, industrial |
| 4 | `horeca` | HoReCa & Wellness | HoReCa & Wellness | Hotels, restaurants & leisure facilities | Hoteluri, restaurante și facilități de agrement | `#1F6B4A` | retail, civil, educational |
| 5 | `industrial` | Industrial | Industrial | Warehouses, logistics & manufacturing | Depozite, logistică și producție | `#5C5FD4` | medical, civil, retail |
| 6 | `educational` | Educational | Educațional | Schools, universities & campus buildings | Școli, universități și campusuri | `#E07B6A` | civil, medical, horeca |

The slug `civil` means Offices here. On the references page (`app/resurse/referinte/page.tsx`) the key `civil` means "Educație & Instituții" / "Education & Institutions" instead. See `references.md`.

## Sector index page (`/sectoare`)

Source: `app/sectoare/page.tsx`. The Romanian strings on this page are written without diacritics in the source. They are kept as written.

| Element | RO (as in source) | EN |
|---------|-------------------|----|
| Eyebrow | • Sectoare | • Sectors |
| H1 | Expertiza BMS / pentru fiecare industrie. | BMS expertise / for every industry. |
| Sub | Solutii de automatizare adaptate cerintelor specifice fiecarei industrii, de la birouri la productie farmaceutica. | Automation solutions tailored to the specific requirements of each industry, from offices to pharmaceutical production. |
| Section label | • INDUSTRII | • INDUSTRIES |
| Section H2 | Alege sectorul tau | Choose your sector |
| Card link | Exploreaza sectorul | Explore sector |
| Capabilities label | Capabilitati cheie | Key capabilities |
| Results label | Rezultate cheie | Key results |
| Sector link | Exploreaza solutiile {title} | Explore {title} |
| Closing band label | • PROIECTE | • PROJECTS |
| Closing band H2 | Solutia BMS perfecta pentru industria ta | The perfect BMS solution for your industry |
| Buttons | Contacteaza un specialist (→ `/contact`); Vezi proiecte similare (→ `/resurse/referinte`) | Contact a specialist; View similar projects |

Layout: a grid of six coloured sector cards (subtitle, title, link), then one alternating image/text block per sector. Each block shows the title, description, the first four capabilities and all four metrics as "value — label".

## Sector detail page template (`/sectoare/<slug>`)

Sources: `app/sectoare/[sector]/page.tsx`, `app/sectoare/[sector]/sector-client.tsx`. The page is generated for each slug and rendered client-side so the RO/EN switch works. `localizeSector()` in `lib/sector-data.ts` swaps in the RO strings by index. Icons and colours stay the same.

Sections, in order, with the fixed copy:

| # | Section | RO | EN |
|---|---------|----|----|
| 1 | Breadcrumb | Toate sectoarele / {title} | All sectors / {title} |
| 2 | Hero: headline, subheadline, four metric tiles | Buttons: "Vorbește cu un specialist" (→ `/contact`), "Calculează ROI" (→ `/calculator-roi`) | "Talk to a specialist", "Calculate ROI" |
| 3 | Trusted-by strip | De încredere pentru | Trusted by |
| 4 | Features grid | • Capabilități; H2 "Software premium, / servicii premium."; then the sector description | • Capabilities; H2 "Premier software, / premier service." |
| 5 | Capabilities checklist and image | • Ce livrăm; H2 "Tot ce are nevoie clădirea ta."; image alt "Instalație BMS — {title}" | • What we deliver; H2 "Everything your {title in lower case} needs."; image alt "{title} BMS installation" |
| 6 | Testimonial | quote, name, role · company | same |
| 7 | Related sectors | • Alte sectoare; H2 "Explorează industrii conexe"; card link "Explorează sectorul" | • Other sectors; "Explore related industries"; "Explore sector" |
| 8 | Closing CTA | • Începe acum; H2 "Pregătit să-ți optimizezi clădirea?"; "Vorbește cu unul dintre specialiștii noștri și primești o estimare ROI personalizată în 48 de ore."; buttons "Vorbește cu un specialist", "Calculează ROI" | • Get started; "Ready to optimise your {title in lower case} building?"; "Talk to one of our specialists and get a personalised ROI estimate within 48 hours."; "Talk to a specialist", "Calculate ROI" |

The trusted-by strip is the same on all six sector pages: Globalworth, NEPI Rockcastle, One United Properties, Iulius Group, Palas Campus. The source does not say whether these are SOVITECH clients. None of them appears in the references list.

The EN templates lower-case the whole sector title, so they render phrases such as "Everything your offices needs." and "Ready to optimise your horeca & wellness building?". These are copy slips, recorded as found.

## The six sectors

In hero headlines, " / " marks the line break that the source writes as `\n`.

## 1. Offices / Birouri (`civil`)

Route: `/sectoare/civil`. Accent colour `#C5C0F5`, dark text on the accent. Image: `/placeholder.svg?height=800&width=1200` (a placeholder).

| Field | EN | RO |
|-------|----|----|
| Title | Offices | Birouri |
| Subtitle | Office buildings & commercial spaces | Clădiri de birouri și spații comerciale |
| Description | BMS solutions tailored for modern office buildings and commercial spaces — maximising comfort, reducing operational costs, and meeting energy certification requirements. | Soluții BMS adaptate clădirilor moderne de birouri și spațiilor comerciale — confort maxim, costuri operaționale reduse și conformitate cu cerințele de certificare energetică. |
| Hero headline | Smarter offices. / Happier teams. | Birouri mai inteligente. / Echipe mai mulțumite. |
| Hero subheadline | From single-tenant HQs to multi-floor commercial towers, SOVITECH BMS systems bring full visibility and control over every building system — from HVAC to access — in one unified platform. | De la sedii single-tenant la turnuri de birouri multietajate, sistemele BMS SOVITECH oferă vizibilitate și control complet asupra fiecărui sistem al clădirii — de la HVAC la acces — într-o singură platformă unificată. |

**Metrics** (shown as hero tiles and as "Key results" / "Rezultate cheie"):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | 30–40% | Reduction in operational costs | 30–40% | Reducere a costurilor operaționale |
| 2 | 98% | System uptime guaranteed | 98% | Disponibilitate garantată a sistemului |
| 3 | <18mo | Average ROI payback period | <18 luni | Perioadă medie de amortizare |
| 4 | A+ | Energy certification achieved | A+ | Certificare energetică obținută |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | Thermometer | Adaptive climate control | Automatically adjust HVAC zones based on occupancy, CO2 levels, and weather data for optimal thermal comfort throughout the day. | Climatizare adaptivă | Ajustează automat zonele HVAC în funcție de ocupare, nivelul de CO2 și datele meteo, pentru confort termic optim pe tot parcursul zilei. |
| 2 | Lightbulb | Intelligent lighting | Presence-based lighting scenes that adapt to natural light levels, time of day, and occupancy schedules across all zones. | Iluminat inteligent | Scenarii de iluminat bazate pe prezență, adaptate la lumina naturală, momentul zilei și programul de ocupare al fiecărei zone. |
| 3 | BarChart3 | Energy reporting & certification | Automated energy consumption dashboards and reporting for LEED, BREEAM and EPBD compliance with zero manual effort. | Raportare energetică & certificare | Dashboard-uri și rapoarte automate de consum energetic pentru conformitate LEED, BREEAM și EPBD, fără efort manual. |
| 4 | Shield | Integrated security & access | Unified management of access control, CCTV, and intrusion detection alongside building systems from a single interface. | Securitate & acces integrate | Gestionare unificată a controlului de acces, CCTV și detecției de efracție, alături de sistemele clădirii, dintr-o singură interfață. |
| 5 | Wifi | Remote monitoring | 24/7 remote access to all building systems via web or mobile, with real-time alerts and predictive maintenance notifications. | Monitorizare de la distanță | Acces remote 24/7 la toate sistemele clădirii, prin web sau mobil, cu alerte în timp real și notificări de mentenanță predictivă. |
| 6 | Zap | Peak demand management | Automated load shifting and demand response to reduce peak energy consumption and lower electricity tariffs. | Managementul vârfurilor de consum | Deplasare automată a sarcinilor și demand response pentru reducerea consumului la vârf și tarife mai mici la energie. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; the index page shows only the first four):

| # | EN | RO |
|---|----|----|
| 1 | Integrated HVAC system management for optimal thermal comfort | Management integrat al sistemelor HVAC pentru confort termic optim |
| 2 | Lighting monitoring and control with automated scenes based on occupancy | Monitorizare și control al iluminatului, cu scenarii automate bazate pe ocupare |
| 3 | Integration of security, access control and energy management systems | Integrarea sistemelor de securitate, control acces și management energetic |
| 4 | Automated energy consumption reporting and energy certification | Raportare automată a consumului și certificare energetică |
| 5 | Multi-zone scheduling aligned to working hours and occupancy patterns | Programare multi-zonă aliniată programului de lucru și gradului de ocupare |
| 6 | BACnet, KNX and Modbus protocol integration | Integrare protocoale BACnet, KNX și Modbus |

**Testimonial** (unverified; see the notes at the end):

- Name: Andrei Popescu
- Role: Facilities Director (EN) / Director de Facilități (RO)
- Company: Bucharest Business Park
- Quote EN: "Before SOVITECH, we had no visibility into what was consuming energy across our three office buildings. Within six months of deployment, we reduced our electricity bill by 34% and finally achieved our A energy certification."
- Quote RO: „Înainte de SOVITECH nu aveam nicio vizibilitate asupra consumului din cele trei clădiri de birouri. În șase luni de la implementare am redus factura de energie cu 34% și am obținut, în sfârșit, certificarea energetică clasa A.”

**Related sectors:** Medical & Pharma (`medical`), Retail (`retail`), Educational (`educational`).

## 2. Medical & Pharma / Medical & Farma (`medical`)

Route: `/sectoare/medical`. Accent colour `#C8E6C9`, dark text on the accent. Image: `/placeholder.svg?height=800&width=1200` (a placeholder).

| Field | EN | RO |
|-------|----|----|
| Title | Medical & Pharma | Medical & Farma |
| Subtitle | Hospitals, clinics & pharmaceutical production | Spitale, clinici și producție farmaceutică |
| Description | Precision-grade BMS systems for medical facilities and pharmaceutical environments — where control, compliance, and patient safety are non-negotiable. | Sisteme BMS de precizie pentru unități medicale și medii farmaceutice — acolo unde controlul, conformitatea și siguranța pacienților nu sunt negociabile. |
| Hero headline | Precision control. / Compliant by design. | Control de precizie. / Conform prin design. |
| Hero subheadline | Hospitals and pharmaceutical plants demand the highest standards of environmental control. SOVITECH delivers certified BMS solutions that ensure compliance, patient safety, and operational continuity. | Spitalele și fabricile farmaceutice cer cele mai înalte standarde de control al mediului. SOVITECH livrează soluții BMS certificate care asigură conformitatea, siguranța pacienților și continuitatea operațională. |

**Metrics** (shown as hero tiles and as "Key results" / "Rezultate cheie"):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | GMP | Compliant environments | GMP | Medii conforme |
| 2 | ±0.5°C | Temperature accuracy in critical zones | ±0,5°C | Precizie de temperatură în zonele critice |
| 3 | 100% | Audit trail for all parameter changes | 100% | Trasabilitate completă a modificărilor de parametri |
| 4 | 24/7 | Continuous monitoring & alerting | 24/7 | Monitorizare și alertare continuă |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | Thermometer | Critical zone climate control | Precise temperature, humidity and differential pressure management in operating rooms, clean rooms and sterile production areas. | Climatizare în zone critice | Control precis al temperaturii, umidității și presiunii diferențiale în sălile de operație, camerele curate și zonele de producție sterilă. |
| 2 | Wind | Ventilation & air quality | Continuous monitoring and automated control of air changes per hour, HEPA filtration status, and contamination prevention. | Ventilație & calitatea aerului | Monitorizare continuă și control automat al schimburilor de aer pe oră, al stării filtrelor HEPA și al prevenirii contaminării. |
| 3 | FlaskConical | GMP compliance management | Automated parameter logging, deviation alerts, and audit-ready reports aligned with EU GMP Annex 11 and FDA 21 CFR Part 11. | Management conformitate GMP | Înregistrare automată a parametrilor, alerte la deviații și rapoarte pregătite de audit, aliniate cu EU GMP Anexa 11 și FDA 21 CFR Part 11. |
| 4 | Stethoscope | Patient safety monitoring | Real-time environmental monitoring in patient rooms with automated escalation alerts to nursing stations and facility management. | Monitorizarea siguranței pacienților | Monitorizare de mediu în timp real în saloane, cu alerte automate către stațiile de asistență și managementul clădirii. |
| 5 | BarChart3 | Compliance reporting | Fully automated regulatory reporting for ISO 14644, GxP environments, and hospital accreditation standards. | Raportare de conformitate | Raportare complet automată pentru ISO 14644, medii GxP și standardele de acreditare spitalicească. |
| 6 | Shield | Redundant system architecture | Fail-safe design with redundant controllers, UPS integration and automatic failover to guarantee zero interruption. | Arhitectură redundantă | Design fail-safe cu controlere redundante, integrare UPS și failover automat pentru zero întreruperi. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; the index page shows only the first four):

| # | EN | RO |
|---|----|----|
| 1 | Precise temperature, humidity and differential pressure control in critical zones | Control precis al temperaturii, umidității și presiunii diferențiale în zonele critice |
| 2 | Continuous air quality monitoring and ventilation system management | Monitorizare continuă a calității aerului și managementul ventilației |
| 3 | Automated management of medical equipment and specialist machinery | Gestionare automată a echipamentelor medicale și a instalațiilor de specialitate |
| 4 | Real-time alarms and reporting for compliance with medical standards | Alarme și raportare în timp real pentru conformitate cu standardele medicale |
| 5 | Integration with hospital information systems (HIS/LIMS) | Integrare cu sistemele informatice spitalicești (HIS/LIMS) |
| 6 | FDA 21 CFR Part 11 and EU GMP Annex 11 compliant data logging | Înregistrare de date conformă FDA 21 CFR Part 11 și EU GMP Anexa 11 |

**Testimonial** (unverified; see the notes at the end):

- Name: Dr. Elena Ionescu
- Role: Quality Assurance Manager (EN) / Manager Asigurarea Calității (RO)
- Company: Antibiotice Iași
- Quote EN: "The level of control and auditability that SOVITECH provides in our cleanroom environments has transformed our compliance process. Our last FDA audit had zero findings related to environmental monitoring."
- Quote RO: „Nivelul de control și trasabilitate oferit de SOVITECH în camerele noastre curate ne-a transformat procesul de conformitate. Ultimul audit FDA s-a încheiat fără nicio observație legată de monitorizarea mediului.”

**Related sectors:** Industrial (`industrial`), Offices (`civil`), Educational (`educational`).

## 3. Retail / Retail (`retail`)

Route: `/sectoare/retail`. Accent colour `#8B7B5C`, white text on the accent. Image: `/placeholder.svg?height=800&width=1200` (a placeholder).

| Field | EN | RO |
|-------|----|----|
| Title | Retail | Retail |
| Subtitle | Shopping centres, hypermarkets & retail chains | Centre comerciale, hipermarketuri și lanțuri de retail |
| Description | Centralised BMS automation for retail environments — delivering consistent customer comfort across hundreds of locations while driving significant energy savings. | Automatizare BMS centralizată pentru spații de retail — confort constant pentru clienți în sute de locații și economii semnificative de energie. |
| Hero headline | Better comfort. / Higher footfall. | Confort mai bun. / Trafic mai mare. |
| Hero subheadline | In retail, the environment is part of the product. SOVITECH BMS systems maintain perfect conditions for customers and merchandise while cutting energy costs by up to 35% across your entire portfolio. | În retail, ambianța face parte din produs. Sistemele BMS SOVITECH mențin condiții perfecte pentru clienți și marfă, reducând totodată costurile cu energia cu până la 35% în întregul portofoliu. |

**Metrics** (shown as hero tiles and as "Key results" / "Rezultate cheie"):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | 25–35% | Energy cost reduction | 25–35% | Reducerea costurilor cu energia |
| 2 | Multi-site | Centralised management | Multi-locație | Management centralizat |
| 3 | +12% | Average dwell time improvement | +12% | Creștere medie a timpului petrecut în magazin |
| 4 | Real-time | Refrigeration monitoring | Timp real | Monitorizarea instalațiilor frigorifice |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | Thermometer | Comfort-optimised climate | Zone-by-zone climate management adapting to customer density, time of day, and seasonal conditions to maintain ideal shopping conditions. | Climat optimizat pentru confort | Management climatic pe zone, adaptat la densitatea clienților, momentul zilei și sezon, pentru condiții de cumpărături ideale. |
| 2 | Lightbulb | Adaptive lighting scenes | Dynamic lighting profiles that shift across opening, peak and closing hours, with presence detection in low-traffic zones. | Scenarii de iluminat adaptive | Profiluri dinamice de iluminat pentru orele de deschidere, vârf și închidere, cu detecție de prezență în zonele cu trafic redus. |
| 3 | ShoppingBag | Refrigeration monitoring | Continuous temperature monitoring of all refrigerated display cases with automated alerts before product loss occurs. | Monitorizare frigorifică | Monitorizare continuă a temperaturii în toate vitrinele frigorifice, cu alerte automate înainte de pierderea produselor. |
| 4 | BarChart3 | Multi-site energy dashboard | Consolidated energy reporting across all locations, identifying inefficiencies and benchmarking performance between stores. | Dashboard energetic multi-locație | Raportare energetică consolidată pentru toate locațiile, identificând ineficiențele și comparând performanța între magazine. |
| 5 | Clock | Schedule-based automation | Pre-programmed opening and closing routines that automatically adjust all building systems — reducing waste during closed hours. | Automatizare pe bază de program | Rutine preprogramate de deschidere și închidere care ajustează automat toate sistemele clădirii — eliminând risipa în afara programului. |
| 6 | Shield | Security & access management | Integrated management of CCTV, alarm systems and access control across all sites from a single operations centre. | Securitate & management acces | Gestionare integrată a CCTV, sistemelor de alarmă și controlului de acces în toate locațiile, dintr-un singur centru de operațiuni. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; the index page shows only the first four):

| # | EN | RO |
|---|----|----|
| 1 | Integrated climate management for customer comfort and cost reduction | Management climatic integrat pentru confortul clienților și reducerea costurilor |
| 2 | Smart lighting control with adaptive zone and schedule scenarios | Control inteligent al iluminatului, cu scenarii adaptive pe zone și programe |
| 3 | Refrigeration system monitoring and optimisation | Monitorizarea și optimizarea instalațiilor frigorifice |
| 4 | Security and access system integration for enhanced safety | Integrarea sistemelor de securitate și acces pentru siguranță sporită |
| 5 | Centralised management of multiple locations from single dashboard | Management centralizat al mai multor locații dintr-un singur dashboard |
| 6 | BMS integration with retail POS and footfall analytics systems | Integrare BMS cu sisteme POS și analiză de trafic |

**Testimonial** (unverified; see the notes at the end):

- Name: Mihai Constantin
- Role: Operations Director (EN) / Director de Operațiuni (RO)
- Company: Cora Romania
- Quote EN: "Managing 14 hypermarkets from a single dashboard was unthinkable before SOVITECH. Now our facilities team handles everything remotely, and we've cut our energy spend by 31% in the first year."
- Quote RO: „Să administrezi 14 hipermarketuri dintr-un singur dashboard era de neimaginat înainte de SOVITECH. Acum echipa noastră gestionează totul de la distanță, iar în primul an am redus cheltuielile cu energia cu 31%.”

**Related sectors:** HoReCa & Wellness (`horeca`), Offices (`civil`), Industrial (`industrial`).

## 4. HoReCa & Wellness / HoReCa & Wellness (`horeca`)

Route: `/sectoare/horeca`. Accent colour `#1F6B4A`, white text on the accent. Image: `/placeholder.svg?height=800&width=1200` (a placeholder).

| Field | EN | RO |
|-------|----|----|
| Title | HoReCa & Wellness | HoReCa & Wellness |
| Subtitle | Hotels, restaurants & leisure facilities | Hoteluri, restaurante și facilități de agrement |
| Description | Dedicated BMS automation for hotels, resorts and restaurants — delivering exceptional guest experience while dramatically reducing energy and operational costs per room. | Automatizare BMS dedicată hotelurilor, resorturilor și restaurantelor — experiență excepțională pentru oaspeți și costuri energetice și operaționale per cameră semnificativ mai mici. |
| Hero headline | Five-star comfort. / Four-star efficiency. | Confort de cinci stele. / Eficiență de patru stele. |
| Hero subheadline | Guest experience is everything in hospitality. SOVITECH BMS systems integrate with your PMS to automate room comfort, reduce energy waste during vacancies, and give your team full visibility across the property. | În ospitalitate, experiența oaspetelui este totul. Sistemele BMS SOVITECH se integrează cu PMS-ul tău pentru a automatiza confortul camerelor, a reduce risipa de energie în perioadele neocupate și a oferi echipei vizibilitate completă asupra întregii proprietăți. |

**Metrics** (shown as hero tiles and as "Key results" / "Rezultate cheie"):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | 25–38% | Energy reduction per room | 25–38% | Reducere de energie per cameră |
| 2 | PMS | Full integration (Opera, Fidelio) | PMS | Integrare completă (Opera, Fidelio) |
| 3 | +0.8★ | Average review score improvement | +0,8★ | Creștere medie a scorului recenziilor |
| 4 | Per-room | Consumption reporting | Per cameră | Raportarea consumului |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | Hotel | PMS integration | Full two-way integration with Opera, Fidelio and other PMS systems — automatically adjusting room conditions on check-in and check-out. | Integrare PMS | Integrare bidirecțională completă cu Opera, Fidelio și alte sisteme PMS — ajustând automat condițiile din cameră la check-in și check-out. |
| 2 | Thermometer | Guest comfort profiles | Individual room climate control with guest preferences stored and applied automatically upon return visits. | Profiluri de confort pentru oaspeți | Control climatic individual per cameră, cu preferințele oaspeților salvate și aplicate automat la vizitele următoare. |
| 3 | Zap | Vacancy energy management | Automatic setback of HVAC, lighting and other systems during unoccupied periods — eliminating waste without compromising readiness. | Management energetic la neocupare | Reducere automată a HVAC, iluminatului și celorlalte sisteme în perioadele neocupate — fără a compromite pregătirea camerei. |
| 4 | BarChart3 | Consumption reporting per room | Detailed energy and water consumption data per room and per cost centre for precise operational budgeting. | Raportarea consumului per cameră | Date detaliate de consum de energie și apă per cameră și per centru de cost, pentru bugetare operațională precisă. |
| 5 | Wind | Spa & wellness integration | Specialised control for pool, spa, sauna and fitness areas with automated temperature, humidity and ventilation management. | Integrare spa & wellness | Control specializat pentru piscină, spa, saună și zonele de fitness, cu management automat al temperaturii, umidității și ventilației. |
| 6 | Clock | Event & banquet automation | Pre-configured climate and lighting scenarios for conference rooms and banquet halls, activated automatically from your event calendar. | Automatizare evenimente & banchete | Scenarii preconfigurate de climat și iluminat pentru sălile de conferințe și banchete, activate automat din calendarul de evenimente. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; the index page shows only the first four):

| # | EN | RO |
|---|----|----|
| 1 | Individual room control via PMS integration (Fidelio, Opera) | Control individual al camerelor prin integrare PMS (Fidelio, Opera) |
| 2 | Automated check-in/check-out scenarios for guaranteed savings | Scenarii automate de check-in/check-out pentru economii garantate |
| 3 | Consumption monitoring per room and cost centre | Monitorizarea consumului per cameră și centru de cost |
| 4 | Spa, pool and fitness centre systems integration | Integrarea sistemelor pentru spa, piscină și centru de fitness |
| 5 | Restaurant and kitchen ventilation automation | Automatizarea ventilației pentru restaurant și bucătărie |
| 6 | Guest app integration for in-room personalisation | Integrare cu aplicația pentru oaspeți, pentru personalizare în cameră |

**Testimonial** (unverified; see the notes at the end):

- Name: Radu Georgescu
- Role: General Manager (EN) / Director General (RO)
- Company: Radisson Blu Bucharest
- Quote EN: "Our guests consistently comment on how comfortable the rooms feel the moment they walk in. The SOVITECH integration with our Opera PMS means every room is perfectly prepared before the guest arrives — and we use 32% less energy than before."
- Quote RO: „Oaspeții noștri remarcă frecvent cât de confortabile sunt camerele încă de la intrare. Integrarea SOVITECH cu PMS-ul Opera înseamnă că fiecare cameră este perfect pregătită înainte de sosirea oaspetelui — cu 32% mai puțină energie decât înainte.”

**Related sectors:** Retail (`retail`), Offices (`civil`), Educational (`educational`).

## 5. Industrial / Industrial (`industrial`)

Route: `/sectoare/industrial`. Accent colour `#5C5FD4`, white text on the accent. Image: `/placeholder.svg?height=800&width=1200` (a placeholder).

| Field | EN | RO |
|-------|----|----|
| Title | Industrial | Industrial |
| Subtitle | Warehouses, logistics & manufacturing | Depozite, logistică și producție |
| Description | High-performance BMS automation for industrial facilities — ensuring optimal working conditions, process efficiency, and significant reductions in energy and maintenance costs. | Automatizare BMS de înaltă performanță pentru facilități industriale — condiții optime de lucru, eficiență a proceselor și reduceri semnificative ale costurilor de energie și mentenanță. |
| Hero headline | Industrial scale. / Engineered precision. | Scară industrială. / Precizie inginerească. |
| Hero subheadline | Industrial environments demand reliability above all else. SOVITECH delivers robust BMS systems integrated with SCADA and production platforms to ensure maximum uptime, process quality, and energy efficiency. | Mediile industriale cer, înainte de toate, fiabilitate. SOVITECH livrează sisteme BMS robuste, integrate cu SCADA și platformele de producție, pentru disponibilitate maximă, calitate a proceselor și eficiență energetică. |

**Metrics** (shown as hero tiles and as "Key results" / "Rezultate cheie"):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | SCADA | Full integration capability | SCADA | Capabilitate de integrare completă |
| 2 | 20–30% | Reduction in energy costs | 20–30% | Reducerea costurilor cu energia |
| 3 | Predictive | Maintenance scheduling | Predictivă | Planificarea mentenanței |
| 4 | 24/7 | Remote monitoring & response | 24/7 | Monitorizare și intervenție de la distanță |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | Factory | Industrial HVAC automation | Full automation of high-capacity ventilation, heating and cooling systems aligned to production schedules and process requirements. | Automatizare HVAC industrial | Automatizare completă a sistemelor de ventilație, încălzire și răcire de mare capacitate, aliniată programelor de producție și cerințelor de proces. |
| 2 | BarChart3 | Process environment monitoring | Continuous monitoring of temperature, humidity, dust and chemical exposure levels critical to production quality. | Monitorizarea mediului de proces | Monitorizare continuă a temperaturii, umidității, prafului și expunerii chimice, critice pentru calitatea producției. |
| 3 | Wifi | SCADA & MES integration | Native integration with SCADA and Manufacturing Execution Systems for real-time production data overlay on building systems. | Integrare SCADA & MES | Integrare nativă cu SCADA și sistemele MES, pentru suprapunerea datelor de producție în timp real peste sistemele clădirii. |
| 4 | Zap | Energy cost centre reporting | Granular energy consumption data broken down by production line, building zone and shift — enabling precise cost attribution. | Raportare energetică pe centre de cost | Date granulare de consum, defalcate pe linie de producție, zonă și schimb — pentru atribuirea precisă a costurilor. |
| 5 | Shield | Safety & compliance | Automated safety monitoring for hazardous zones, gas detection integration, and emergency ventilation activation. | Siguranță & conformitate | Monitorizare automată a zonelor periculoase, integrare cu detecția de gaze și activarea ventilației de urgență. |
| 6 | Clock | Predictive maintenance | AI-assisted anomaly detection on critical equipment such as compressors, chillers and AHUs — preventing unexpected downtime. | Mentenanță predictivă | Detecție de anomalii asistată de AI pentru echipamentele critice — compresoare, chillere, CTA-uri — prevenind opririle neplanificate. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; the index page shows only the first four):

| # | EN | RO |
|---|----|----|
| 1 | Full automation of high-capacity industrial HVAC systems | Automatizare completă a sistemelor HVAC industriale de mare capacitate |
| 2 | Continuous environmental parameter monitoring for production processes | Monitorizare continuă a parametrilor de mediu pentru procesele de producție |
| 3 | Integration with production and SCADA systems for maximum efficiency | Integrare cu sistemele de producție și SCADA pentru eficiență maximă |
| 4 | Advanced energy management and consumption reporting per cost centre | Management energetic avansat și raportare pe centre de cost |
| 5 | Emergency ventilation and gas detection system integration | Integrarea ventilației de urgență și a detecției de gaze |
| 6 | ISO 50001 energy management system support | Suport pentru sisteme de management energetic ISO 50001 |

**Testimonial** (unverified; see the notes at the end):

- Name: Ionut Popa
- Role: Plant Manager (EN) / Director de Fabrică (RO)
- Company: Ursus Breweries Cluj
- Quote EN: "SOVITECH gave us something we never had before — complete visibility across our entire production facility. We identified three major energy waste points in the first month and recovered the full investment within 14 months."
- Quote RO: „SOVITECH ne-a oferit ceva ce nu am avut niciodată — vizibilitate completă asupra întregii facilități de producție. Am identificat trei puncte majore de risipă energetică în prima lună și am recuperat întreaga investiție în 14 luni.”

**Related sectors:** Medical & Pharma (`medical`), Offices (`civil`), Retail (`retail`).

## 6. Educational / Educațional (`educational`)

Route: `/sectoare/educational`. Accent colour `#E07B6A`, dark text on the accent. Image: `/placeholder.svg?height=800&width=1200` (a placeholder).

| Field | EN | RO |
|-------|----|----|
| Title | Educational | Educațional |
| Subtitle | Schools, universities & campus buildings | Școli, universități și campusuri |
| Description | BMS automation designed around the rhythms of education — delivering healthy learning environments, simplified campus management, and compliance with sustainability targets. | Automatizare BMS gândită în ritmul educației — medii de învățare sănătoase, management simplificat al campusului și conformitate cu țintele de sustenabilitate. |
| Hero headline | Healthy spaces. / Focused minds. | Spații sănătoase. / Minți concentrate. |
| Hero subheadline | The quality of the learning environment directly impacts academic performance. SOVITECH BMS systems maintain optimal CO2, temperature and lighting conditions throughout the school day — automatically. | Calitatea mediului de învățare influențează direct performanța academică. Sistemele BMS SOVITECH mențin automat niveluri optime de CO2, temperatură și iluminat pe toată durata programului școlar. |

**Metrics** (shown as hero tiles and as "Key results" / "Rezultate cheie"):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | 20–30% | Energy savings vs conventional systems | 20–30% | Economii de energie față de sistemele convenționale |
| 2 | CO2 | Continuous classroom monitoring | CO2 | Monitorizare continuă în sălile de clasă |
| 3 | Multi-campus | Centralised management | Multi-campus | Management centralizat |
| 4 | EPBD | Compliance & reporting | EPBD | Conformitate și raportare |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | GraduationCap | Timetable-based scheduling | Automatic climate and lighting adjustments aligned to your school timetable — rooms are ready before students arrive and powered down after they leave. | Programare după orar | Ajustare automată a climatizării și iluminatului după orarul școlii — sălile sunt pregătite înainte de sosirea elevilor și oprite după plecare. |
| 2 | Wind | CO2 & air quality monitoring | Continuous monitoring of CO2 levels in classrooms with automated ventilation increases when concentration affects concentration. | Monitorizare CO2 & calitatea aerului | Monitorizare continuă a nivelului de CO2 în sălile de clasă, cu intensificarea automată a ventilației atunci când aerul afectează concentrarea. |
| 3 | Building2 | Multi-building campus control | Unified management of all campus buildings — classrooms, labs, sports halls, canteens and dormitories — from a single platform. | Control campus multi-clădire | Management unificat al tuturor clădirilor din campus — săli de clasă, laboratoare, săli de sport, cantine și cămine — dintr-o singură platformă. |
| 4 | Leaf | Sustainability reporting | Automated energy and carbon reporting for EPBD compliance, ESG targets, and institutional sustainability commitments. | Raportare de sustenabilitate | Raportare automată de energie și carbon pentru conformitate EPBD, ținte ESG și angajamentele instituționale de sustenabilitate. |
| 5 | Lightbulb | Daylight-responsive lighting | Adaptive lighting that responds to natural light levels and presence, ensuring ideal conditions for study without waste. | Iluminat adaptat luminii naturale | Iluminat adaptiv care răspunde la lumina naturală și prezență, asigurând condiții ideale de studiu fără risipă. |
| 6 | BarChart3 | Utility cost management | Detailed consumption reporting per building and per department, giving administrators clear visibility to manage budgets. | Managementul costurilor cu utilitățile | Raportare detaliată a consumului per clădire și departament, oferind administratorilor vizibilitate clară asupra bugetelor. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; the index page shows only the first four):

| # | EN | RO |
|---|----|----|
| 1 | Automated schedules adapted to school timetables | Programe automate adaptate orarelor școlare |
| 2 | Air quality and CO2 monitoring in classrooms | Monitorizarea calității aerului și a CO2 în sălile de clasă |
| 3 | Centralised management of multi-building campuses | Management centralizat al campusurilor cu mai multe clădiri |
| 4 | Energy compliance and sustainability reporting | Raportare de conformitate energetică și sustenabilitate |
| 5 | Holiday and vacation setback scheduling for zero-waste periods | Regimuri reduse automate în vacanțe, pentru zero risipă |
| 6 | Integration with smart metering and utility billing systems | Integrare cu contorizare inteligentă și sisteme de facturare |

**Testimonial** (unverified; see the notes at the end):

- Name: Prof. Cristina Marin
- Role: Campus Operations Director (EN) / Director Operațiuni Campus (RO)
- Company: Politehnica University of Bucharest
- Quote EN: "Since deploying SOVITECH across our campus, CO2 levels in classrooms have dropped by 40%, attendance is up, and our energy bill fell by 27%. The system practically manages itself — our maintenance team can now focus on real issues."
- Quote RO: „De la implementarea SOVITECH în campus, nivelul de CO2 din săli a scăzut cu 40%, prezența a crescut, iar factura de energie s-a redus cu 27%. Sistemul practic se administrează singur — echipa de mentenanță se poate concentra pe problemele reale.”

**Related sectors:** Offices (`civil`), Medical & Pharma (`medical`), HoReCa & Wellness (`horeca`).

## Notes for the app

### Testimonials are unverified

Each sector quotes a named person at a named organisation:

| Sector | Person | Role | Organisation | Figure in the quote |
|--------|--------|------|--------------|---------------------|
| Offices | Andrei Popescu | Facilities Director | Bucharest Business Park | 34% lower electricity bill in six months; "A energy certification" |
| Medical & Pharma | Dr. Elena Ionescu | Quality Assurance Manager | Antibiotice Iași | FDA audit with zero environmental-monitoring findings |
| Retail | Mihai Constantin | Operations Director | Cora Romania | 14 hypermarkets; 31% lower energy spend in year one |
| HoReCa & Wellness | Radu Georgescu | General Manager | Radisson Blu Bucharest | 32% less energy; Opera PMS |
| Industrial | Ionut Popa | Plant Manager | Ursus Breweries Cluj | payback in 14 months |
| Educational | Prof. Cristina Marin | Campus Operations Director | Politehnica University of Bucharest | CO2 down 40%; energy bill down 27% |

- The repo gives no evidence that these people exist or said this. None of these six organisations appears in the references list (`app/resurse/referinte/page.tsx`), except Radisson Blu.
- "Andrei Popescu" is also the byline of both articles, as "Director Tehnic, Sovitech" / "Technical Director, Sovitech" (see `articles/`).
- The Radisson Blu testimonial disagrees with the Radisson case study. The case study quotes an unnamed "General Manager", reports "~30%" energy reduction and names the Fidelio PMS. See `case-studies/radisson-blu-bucuresti.md`.
- Do not reuse these quotes, names or figures in the app without written confirmation from SOVITECH.

### Claims that the app's guardrails would not allow

These are recorded so nobody copies them into app copy or AI output by accident.

| Claim on the website | Where | Guardrail |
|----------------------|-------|-----------|
| "98% System uptime guaranteed" / "Disponibilitate garantată a sistemului" | Offices metric 2 | Rule 10: savings and performance are never guaranteed. |
| "Automated check-in/check-out scenarios for guaranteed savings" / "economii garantate" | HoReCa capability 2 | Rule 10. |
| "Energy certification achieved" with the value "A+"; "A energy certification" in the testimonial | Offices metric 4, testimonial | Rule 11: the energy certificate class (Mc001), the BAC class (EN ISO 52120-1) and legal obligations are three separate things, and the app never claims a class was achieved. |
| "Compliant by design", "GMP Compliant environments", "certified BMS solutions", "FDA 21 CFR Part 11 and EU GMP Annex 11 compliant data logging" | Medical & Pharma | Rule 11: the app never attests compliance. |
| "reporting for LEED, BREEAM and EPBD compliance" | Offices feature 3 | Rule 11. |
| "gas detection integration, and emergency ventilation activation"; "Emergency ventilation and gas detection system integration" | Industrial feature 5, capability 5 | Rule 11: gas detection and smoke/emergency ventilation are life-safety. The BMS may monitor, display, log and alarm. It never commands them. |
| "AI-assisted anomaly detection" | Industrial feature 6 | No guardrail conflict by itself. The app has no such function yet. |
| Savings ranges per sector (20–40%) and payback figures | All sector metrics | Rules 1 and 9: estimates need a basis, a method and a range from approved data. |

### Other observations

- **Images.** Every sector uses `/placeholder.svg?height=800&width=1200`. The repo's `public/` folder has `sector-office-building.jpg`, `sector-medical-hospital.jpg`, `sector-retail-mall.jpg`, `sector-horeca-hotel.jpg`, `sector-industrial-factory.jpg` and `sector-education-campus.jpg`, but `lib/sector-data.ts` does not use them. `sector-education-campus.jpg` is a grey placeholder graphic, byte-identical to the `ref-*.jpg` placeholders.
- **Number formats.** RO metric values use the Romanian decimal comma ("±0,5°C", "+0,8★"). EN uses the point.
- **Sector names differ between pages.** `app/resurse/page.tsx` lists "sector guides" that do not match these six: "Civil & Birouri", "Medical & Farma", "Retail & HORECA", "Industrial", "Centre de Date", "Infrastructura" (EN: "Civil & Office", "Medical & Pharma", "Retail & HORECA", "Industrial", "Data Centres", "Infrastructure"). Those links point to `#`. There are no Data Centres or Infrastructure sector pages.
- **Protocols named per sector.** Offices: BACnet, KNX, Modbus. HoReCa: PMS integration with Opera and Fidelio. Industrial: SCADA and MES. Medical: HIS/LIMS. Retail: POS and footfall analytics. Educational: smart metering and utility billing.
- **No text addressed to an AI** was found in these files.

---

## B. Branch `redesign-2026` (unmerged): the rewritten sectors

**Status. Read this first.**
- **Source.** Branch `origin/redesign-2026` of the same repository, at commit `af81353` (2026-08-27). The sector content comes from commit `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala"). Paths are relative to the repository root on that branch. Imported on 2026-09-24.
- **Not merged, and will not be merged.** The branch is not merged into `main`. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. This section is for reference only. Everything above this section describes `main`, the current website. Nothing here replaces it.
- **Figures are marketing copy.** Cost bands, point densities, savings, paybacks, project sizes and legal thresholds below are website statements. They are not verified engineering data, not an approved reference dataset and not usable as app values (guardrails rule 1, section 2.1, section 10). Section B11 lists the claims the app's guardrails would not allow.
- **What the source says about itself.** `lib/sector-data.ts` opens with this comment (verbatim): "Content source: C4 sector copy (Partea B). Evidence rule applied throughout: project names and scope figures come from the verified reference portfolio (app/referinte/page.tsx); no savings percentage is published without its domain in the same sentence; no invented people or testimonials. Sectors without a portfolio reference (entertainment, data centres) state that openly instead of claiming experience." I have not checked the portfolio, and "verified" is the source's word, not a finding of this import.

**Sources on the branch.**
- `lib/sector-data.ts`: all sector content, EN and RO. It is 1,208 lines. Against main it has 851 insertions and 316 deletions (1,167 changed lines).
- `app/expertiza/page.tsx`: the sector index page, moved from `app/sectoare/page.tsx`.
- `app/expertiza/[sector]/page.tsx` (new) and `app/expertiza/[sector]/sector-client.tsx` (moved from `app/sectoare/[sector]/`): the sector detail page.
- `lib/site-routes.ts`, lines 342-358: the sector registry with public URLs, titles, descriptions and personas.
- `next.config.mjs`: the redirects from `/sectoare/...`.

### B0. What changed against main

**Count and names.** Main has six sectors. The branch has ten.

| # | Key | Main title EN / RO | Branch title EN / RO | Change |
|---|-----|--------------------|----------------------|--------|
| 1 | `civil` | Offices / Birouri | Offices / Clădiri de birouri | Subtitle now "Class A & B office buildings" / "Birouri clasa A și clasa B" |
| 2 | `medical` | Medical & Pharma / Medical & Farma | Healthcare / Medical | Hospitals only. Pharma is now its own sector. |
| 3 | `retail` | Retail / Retail | Retail / Retail | Subtitle now "Shopping centres, retail parks & chains" |
| 4 | `horeca` | HoReCa & Wellness / HoReCa & Wellness | HORECA / HORECA | Hotels and restaurants only. Wellness is now in Sport & Wellness. |
| 5 | `industrial` | Industrial / Industrial | Industrial & Logistics / Industrial & Logistică | Subtitle now "Production halls & logistics warehouses" |
| 6 | `educational` | Educational / Educațional | Education & Institutions / Educațional & Instituții | Now includes embassies and public buildings. The registry and header say "Educație & Instituții". |
| 7 | `pharma` | None | Pharma / Pharma | New |
| 8 | `entertainment` | None | Entertainment / Entertainment | New. States no own project. |
| 9 | `centre-de-date` | None | Data centres / Centre de date | New. States no own project. |
| 10 | `sport-si-wellness` | None | Sport & Wellness / Sport & Wellness | New. Its reference is Therme Nord București. |

**Routes.** The sector pages move from `/sectoare` to `/expertiza`. The header menu label changes from "Sectoare" / "Sectors" to "Expertiză" / "Expertise". `next.config.mjs` redirects `/sectoare` to `/expertiza`, `/sectoare/civil` to `/expertiza/cladiri-de-birouri`, the other five old slugs to the same slug under `/expertiza`, and anything else under `/sectoare/` to `/expertiza`. The public URL and the data key differ only for offices: the URL is `cladiri-de-birouri`, the key stays `civil`.

**Registry entries** (`lib/site-routes.ts`, all "published"):

| URL slug | Data key | Title RO / EN | Description RO / EN | Personas |
|----------|----------|---------------|---------------------|----------|
| `cladiri-de-birouri` | `civil` | Clădiri de birouri / Office buildings | Confort, cost de operare și contorizare pe chiriaș. / Comfort, running cost and tenant submetering. | P1, P2, P3 |
| `horeca` | `horeca` | HORECA / HORECA | Funcționare 24/7, sarcină variabilă și apă caldă critică. / 24/7 operation, variable load and critical hot water. | P3, P1 |
| `retail` | `retail` | Retail / Retail | Multe unități, contorizare separată și iluminat cu pondere mare. / Many units, separate metering and a large lighting share. | P2, P5 |
| `industrial` | `industrial` | Industrial & Logistică / Industrial & Logistics | Granița dintre clădire și proces, definită explicit. / The boundary between building and process, explicitly defined. | P6, P3 |
| `medical` | `medical` | Medical / Healthcare | Redundanță, presiuni diferențiale și execuție etapizată. / Redundancy, differential pressures and phased execution. | P4, P6 |
| `educational` | `educational` | Educație & Instituții / Education & Institutions | Programare după orar și management de campus. / Timetable-driven scheduling and campus management. | P3, P1 |
| `pharma` | `pharma` | Pharma / Pharma | Zone clasificate, trasabilitate și calificare. / Classified areas, traceability and qualification. | P6 |
| `sport-si-wellness` | `sport-si-wellness` | Sport & Wellness / Sport & Wellness | Piscine, spa și complexe de wellness, cu tratare de aer și umiditate controlată. / Pools, spas and wellness complexes, with air handling and controlled humidity. | P3, P1 |
| `entertainment` | `entertainment` | Entertainment / Entertainment | Săli și spații de evenimente, cu sarcină foarte variabilă de ocupare. / Venues and event spaces with highly variable occupancy loads. | P3, P2 |
| `centre-de-date` | `centre-de-date` | Centre de date / Data Centres | Monitorizare de infrastructură critică, prezentată onest: fără proiecte proprii încă. / Critical-infrastructure monitoring, stated honestly: no delivered projects yet. | P7, P4 |

The page title of each sector page is "{registry title RO} | Sisteme BMS | Sovitech Control", and its meta description is the registry description in Romanian (`app/expertiza/[sector]/page.tsx`). The personas are listed in `services.md`, section 10.2.

**Metrics and quotes, main against branch.**

| Sector | Main metrics | Branch metrics | Main testimonial | Branch project card |
|--------|--------------|----------------|------------------|---------------------|
| Offices | 30–40% operating cost; 98% uptime "guaranteed"; <18mo payback; A+ certification | 9-18 EUR/sqm; 50-90 points per 1,000 sqm; 5-15% measured savings on total consumption after optimisation, 1-3 year payback; 4 office references | Andrei Popescu, Bucharest Business Park | BCR Calea Victoriei |
| Medical / Healthcare | GMP; ±0.5°C; 100% audit trail; 24/7 | 3 hospital references; 9,000 sqm (Foișor); 303 beds (Sfânta Maria); 24/7 local operation of critical zones | Dr. Elena Ionescu, Antibiotice Iași | Spitalul Foișor |
| Retail | 25–35% energy cost; Multi-site; +12% dwell time; Real-time refrigeration | 4-9 EUR/sqm; 2 retail references; 24,800 sqm (Pitești Retail Park); 70 kW (2029 EU threshold) | Mihai Constantin, Cora Romania | Pitești Retail Park |
| HoReCa / HORECA | 25–38% per room; PMS (Opera, Fidelio); +0.8★ reviews; per-room reporting | 6-13 EUR/sqm without room control; 18-38 EUR/sqm with; 4 HORECA references; 598 rooms (Athenee Palace Hilton) | Radu Georgescu, Radisson Blu Bucharest | Radisson Blu București |
| Industrial | SCADA; 20–30%; Predictive; 24/7 | 3-8 EUR/sqm; 3 industrial references; 37,000 sqm (NTN-SNR); 1,000 toe (energy audit threshold) | Ionut Popa, Ursus Breweries Cluj | NTN-SNR Sibiu |
| Educational / Education & Institutions | 20–30%; CO2; Multi-campus; EPBD | 3 references; 13,500 sqm (Lycée Français); 5-10 EUR/sqm as a proxy; 70 kW (2029 EU threshold) | Prof. Cristina Marin, Politehnica University of Bucharest | Școala Germană București |
| Pharma | (part of Medical & Pharma) | 30-80 EUR/sqm; 5 pharma references; 24 months retention; IQ, OQ, PQ | (none) | Rompharm Uzbekistan |
| Entertainment | (none) | 4-18 EUR/sqm as a proxy; CO2; 290 kW; 2026 (EU IEQ monitoring deadline) | (none) | "Transferable competence": Therme Nord București |
| Data centres | (none) | 90-320 EUR per point; PUE; NIS2; 0 own projects | (none) | "Competence statement": Sovitech Control |
| Sport & Wellness | (part of HoReCa & Wellness) | 1,400 data points and 6 AHUs (Therme Nord); 4-18 EUR/sqm as a proxy; 290 kW | (none) | Therme Nord București |

**Removed on the branch.**
- All six named testimonials, with their people, organisations and figures (the table under "Testimonials are unverified" above). The data field `testimonial` now holds a "Delivered project" card, and `sector-client.tsx` no longer renders a testimonial section, so these cards do not appear on the sector pages.
- Every main metric: the savings ranges, "98% System uptime guaranteed", "<18mo", "A+", "GMP Compliant environments", "±0.5°C", "100% Audit trail", "+12%" dwell time, "+0.8★" review score and the "up to 35%" retail hero claim.
- "Compliant by design", "certified BMS solutions", "FDA 21 CFR Part 11 and EU GMP Annex 11 compliant data logging", "reporting for LEED, BREEAM and EPBD compliance", "guaranteed savings", "AI-assisted anomaly detection", gas detection integration, PMS names (Opera, Fidelio), guest apps, POS and footfall analytics.
- The "Trusted by" names Globalworth, NEPI Rockcastle, One United Properties, Iulius Group and Palas Campus. The strip now reads "Therme Nord", "Radisson Blu", "Athenee Palace Hilton", "Rompharm", "NTN-SNR", "Spitalul Foișor", all of which are on the references page.

**Added on the branch.**
- Cost bands per sector, point density, reference counts, project sizes taken from the references page, legal thresholds (290 kW, 70 kW, 1,000 toe, the 29 May 2026 EPBD date, NIS2), and data retention of at least 24 months.
- Technical content per sector: zoning, submetering, differential pressures, humidity control in pool halls, compressed air, audit trail and qualification, redundancy.
- Two sectors that say they have no own projects (entertainment, data centres).
- Images from `public/referinte/` for eight sectors (see `references.md`, section R3; at least one looks like a rendering rather than a photo). Entertainment and data centres keep `/placeholder.svg?height=800&width=1200`.

**Page changes.**
- **Index (`/expertiza`).** The copy is unchanged and still has no diacritics (see "Sector index page" above). The coloured cards now show only the title. The subtitle and "Exploreaza sectorul" are gone. Each sector block lists its metrics as "{value} {label}", without the dash.
- **Detail page.** The testimonial section is removed. The breadcrumb links to `/expertiza`. The image alt text reads "Instalație BMS, {title}". The rest of the fixed copy is unchanged, including the EN templates that lower-case the whole title. On the branch they render phrases such as "Everything your offices needs.", "Ready to optimise your horeca building?" and "Ready to optimise your data centres building?".
- **Home page** (`app/page.tsx`, for reference). A sector grid headed "Expertiză pe sectoare de clădiri, fiecare cu alt profil de cost" / "Building-sector expertise, each with its own cost profile" shows nine sectors: all except entertainment.
- **Header.** The "Expertiză" menu lists eight sectors: offices, HORECA, Sport & Wellness, Pharma, Medical, Retail, Industrial & Logistics, Education & Institutions. Entertainment and data centres are not in it.

**Inconsistencies inside the branch.**
- **How many sectors.** The data has 10. The home page grid shows 9. The home hero and `app/despre-noi/page.tsx` say "opt sectoare" / "eight sectors", and the references page shows "8 Sectoare deservite" / "Sectors served".
- **Reference counts against the references page.** The industrial sector counts "NTN-SNR Sibiu, Moncler Bacau, BMTI Strabag" as its three references. The references page lists BMTI Strabag under offices ("Strabag's first office building in Bucharest"). The offices sector counts four office references. The references page lists six, adding Floreasca Business Park and BMTI Strabag. The five pharma references sit under "Industrial & Logistică" on the references page.
- **Names and places.** The cards say "NTN-SNR Sibiu" and "Radisson Blu București". The references page says "NTN-SNR Fabrica de Rulmenți" and "Radisson Blu Hotel". The Sport & Wellness card gives Therme's location as "Balotești, Ilfov". The references page says "București".
- **Therme figures.** The Sport & Wellness sector gives 1,400 data points and 6 air handling units for Therme Nord. The references page still describes Therme as "~34,000 m² built area". The branch Therme case study keeps "8.000 m²" in its body text (see `case-studies/therme-bucuresti.md`).
- **Educational title.** The data's Romanian title is "Educațional & Instituții". The registry and header say "Educație & Instituții".

The ten sectors follow in full. In hero headlines, " / " marks the line break that the source writes as `\n`.

### B1. Offices / Clădiri de birouri (`civil`)

Route: `/expertiza/cladiri-de-birouri` (data key `civil`). The main URL `/sectoare/civil` redirects here. Accent colour `#C5C0F5`, dark text on the accent. Image: `/referinte/bcr-calea-victoriei.jpg`.

| Field | EN | RO |
|-------|----|----|
| Title | Offices | Clădiri de birouri |
| Subtitle | Class A & B office buildings | Birouri clasa A și clasa B |
| Description | An office building is controlled zone by zone, with variable occupancy and large internal heat gains. The BMS covers zoning, tenant submetering and the owner's reporting data, at 9-18 EUR/sqm for class A and 5-10 EUR/sqm for class B. | O clădire de birouri se reglează pe zone, cu ocupare variabilă și surse interne mari de căldură. Sistemul BMS acoperă zonarea, contorizarea pe chiriași și datele de raportare ale proprietarului, la 9-18 EUR/mp pentru clasa A și 5-10 EUR/mp pentru clasa B. |
| Hero headline | Office building BMS: / 9-18 EUR/sqm at class A. | BMS pentru clădiri de birouri: / 9-18 EUR/mp la clasa A. |
| Hero subheadline | A BMS for a class A office building costs 9-18 EUR/sqm, at a usual density of 50-90 data points per 1,000 sqm. The difference from class B comes from the number of separately controlled zones, from tenant submetering and from the owner's reporting requirements. | Un sistem BMS pentru o clădire de birouri clasa A costă 9-18 EUR/mp, cu o densitate uzuală de 50-90 de puncte la 1.000 mp. Diferența față de clasa B vine din numărul de zone reglate separat, din contorizarea pe chiriași și din cerințele de raportare ale proprietarului. |

**Metrics** (hero tiles, and "Key results" / "Rezultate cheie" on `/expertiza`):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | 9-18 EUR/sqm | Cost of a new, complete BMS for class A offices (5-10 for class B) | 9-18 EUR/mp | Costul unui sistem BMS nou, complet, la birouri clasa A (5-10 la clasa B) |
| 2 | 50-90 | Data points per 1,000 sqm, the usual class A density | 50-90 | Puncte de date la 1.000 mp, densitatea uzuală la clasa A |
| 3 | 5-15% | Measured savings on total building consumption after optimisation, with 1-3 year payback | 5-15% | Economie măsurată din consumul total al clădirii după optimizare, cu amortizare de 1-3 ani |
| 4 | 4 | Office references: BCR Calea Victoriei, Floreasca Tower, Stefan cel Mare Building, Monaco Towers | 4 | Referințe în birouri: BCR Calea Victoriei, Floreasca Tower, Ștefan cel Mare Building, Monaco Towers |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | Thermometer | Zone-by-zone control | Zone temperature via fan coils, chilled beams or VAV terminals, with different regimes for perimeter and interior zones within the same day. | Reglaj pe zone | Temperatura pe zonă prin ventiloconvectoare, grinzi de răcire sau unități VAV, cu regimuri diferite pentru perimetru și interior în aceeași zi. |
| 2 | BarChart3 | Tenant submetering | Electricity and thermal energy meters on every leased zone, integrated via Modbus or M-Bus, with 15-minute history and at least 24 months of full-resolution retention. | Contorizare pe chiriași | Contoare de energie electrică și termică pe fiecare zonă închiriată, integrate prin Modbus sau M-Bus, cu istoric la 15 minute și retenție de minimum 24 de luni la rezoluție completă. |
| 3 | Zap | No simultaneous heating and cooling | Coordinated control of perimeter zones prevents heating and cooling running at the same time on the same plant, the most expensive form of waste in an office building. | Fără încălzire și răcire simultană | Reglajul coordonat al zonelor de perimetru evită încălzirea și răcirea simultană pe aceeași instalație, cea mai scumpă formă de risipă dintr-o clădire de birouri. |
| 4 | Wind | Fresh air on CO2 | Carbon dioxide is measured in dense work areas and meeting rooms, and fresh air supply follows real occupancy rather than the declared schedule. | Aer proaspăt pe CO2 | Dioxidul de carbon se măsoară în spațiile de lucru dense și în sălile de ședință, iar aportul de aer proaspăt urmează ocuparea reală, nu programul declarat. |
| 5 | Building2 | Point reserve and re-zoning | Zoning follows the lease contracts, not the architectural plan: the system keeps a point reserve and logic that is easy to reconfigure at every new tenant. | Rezervă de puncte și rezonare | Zonarea urmează contractele de închiriere, nu planul de arhitectură: sistemul păstrează rezervă de puncte și logică ușor de reconfigurat la fiecare chiriaș nou. |
| 6 | FileCheck | Data for compliance | The 290 kW threshold of Law 372/2005 has an expired deadline, and indoor environment monitoring and ESG reporting require a history that stands up to an auditor. | Date pentru conformare | Pragul de 290 kW din Legea 372/2005 are termenul depășit, iar monitorizarea mediului interior și raportarea ESG cer un istoric care rezistă la verificarea unui auditor. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; `/expertiza` shows the first four):

| # | EN | RO |
|---|----|----|
| 1 | Zone temperature control: fan coils, chilled beams, VAV terminal units | Reglarea temperaturii pe zone: ventiloconvectoare, grinzi de răcire, unități VAV |
| 2 | Air handling units: temperature, humidity and duct pressure control | Centrale de tratare a aerului: temperatură, umiditate și presiune în tubulatură |
| 3 | Electricity and thermal metering on the building and on each leased zone | Contorizare electrică și termică pe clădire și pe fiecare zonă închiriată |
| 4 | CO2 monitoring in dense work areas and meeting rooms | Monitorizare CO2 în spațiile de lucru dense și în sălile de ședință |
| 5 | Lighting in common areas and blinds on exposed facades | Iluminat în spațiile comune și jaluzele pe fațadele expuse |
| 6 | History at 15-minute resolution, retained for at least 24 months | Istoric la rezoluție de 15 minute, cu retenție de minimum 24 de luni |

**Project card** (the `testimonial` field; not rendered on the branch sector page, see B0):

- Name: BCR Calea Victoriei
- Role: Delivered project (EN) / Proiect livrat (RO)
- Company field: București
- Text EN: "BMS automation delivered for BCR Calea Victoriei, a 26,300 sqm office building (tower and podium) in Bucharest: BMS, access control and lighting."
- Text RO: „Automatizare BMS livrată pentru BCR Calea Victoriei, clădire de birouri de 26.300 m² (turn și podium) din București: BMS, control acces și iluminat.”

**Related sectors:** Retail (`retail`), HORECA (`horeca`), Education & Institutions (`educational`).

### B2. Healthcare / Medical (`medical`)

Route: `/expertiza/medical` (data key `medical`). The main URL `/sectoare/medical` redirects here. Accent colour `#C8E6C9`, dark text on the accent. Image: `/referinte/spitalul-foisor.jpg`.

| Field | EN | RO |
|-------|----|----|
| Title | Healthcare | Medical |
| Subtitle | Hospitals & healthcare buildings | Spitale și clădiri medicale |
| Description | A hospital runs 24 hours a day, with zones that can never be switched off and others that behave like an office building. The overriding requirement is continuity: plant in critical zones keeps working no matter what happens to the supervision layer. | Un spital funcționează 24 de ore din 24, cu zone care nu pot fi oprite niciodată și cu altele care se comportă ca o clădire de birouri. Cerința care le domină pe toate este continuitatea: instalațiile din zonele critice funcționează indiferent ce se întâmplă cu supervizarea. |
| Hero headline | Hospital BMS: / continuity in critical zones. | BMS pentru spitale: / continuitate în zonele critice. |
| Hero subheadline | Operating theatres, intensive care and infection-risk zones require local control on the controller, redundancy and immediate alarming. Everything tied to the safety of a critical zone is implemented locally; supervision remains a layer for visualisation, history and alarms. | Sălile de operație, terapia intensivă și zonele cu risc de infecție cer control local pe controler, redundanță și alarmare imediată. Tot ce ține de siguranța zonei critice se implementează local, iar supervizarea rămâne strat de vizualizare, istoric și alarmare. |

**Metrics** (hero tiles, and "Key results" / "Rezultate cheie" on `/expertiza`):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | 3 | Hospital references in Bucharest: Sfanta Maria, Foisor, the Plastic Surgery and Burns Hospital | 3 | Referințe în spitale din București: Sfânta Maria, Foișor, Spitalul de Chirurgie Plastică și Arsuri |
| 2 | 9,000 sqm | Foisor orthopaedic hospital: BMS with backup for critical systems, 119 beds | 9.000 m² | Spitalul de ortopedie Foișor: BMS cu backup pentru sistemele critice, 119 paturi |
| 3 | 303 | Beds at Sfanta Maria Clinical Hospital, served by the BMS | 303 | Paturi la Spitalul Clinic Sfânta Maria, deservite de sistemul BMS |
| 4 | 24/7 | Critical zones keep running locally on their controllers, even without supervision | 24/7 | Zonele critice funcționează local, pe controler, și fără supervizare |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | Shield | Continuity in critical zones | Controllers in critical zones run autonomously, without the supervision station and, as far as possible, without the network. Safety interlocks stay active locally. | Continuitate în zonele critice | Controlerele din zonele critice funcționează autonom, fără stația de supervizare și, pe cât posibil, fără rețea. Interblocajele de siguranță rămân active local. |
| 2 | Gauge | Differential pressures | Operating theatres in overpressure, isolation rooms in underpressure, with the direction impossible to reverse accidentally and thresholds agreed with infection control. | Presiuni diferențiale | Sălile de operație în suprapresiune, camerele de izolare în depresiune, cu sensul imposibil de inversat accidental și praguri stabilite cu serviciul de prevenire a infecțiilor. |
| 3 | Wind | Airflow and air changes | Air volume and air changes per hour in critical zones, with filter condition monitored and automatic changeover to standby air handling plant. | Debit de aer și schimburi orare | Debitul și numărul de schimburi orare în zonele critice, cu starea filtrelor monitorizată și trecere automată pe centrala de rezervă. |
| 4 | Stethoscope | Theatres, ICU, sterilisation, lab | Each department with its own regime: operating block, intensive care, sterilisation, laboratory, radiology with equipment temperature requirements. | Bloc operator, ATI, sterilizare, laborator | Fiecare departament cu regimul propriu: blocul operator, terapia intensivă, sterilizarea, laboratorul, radiologia cu cerințe de temperatură pentru aparatură. |
| 5 | Thermometer | Pharmacy and cold storage | Temperatures in the pharmacy and in medicine and sample refrigerators, recorded continuously with alarming on threshold violations. | Farmacie și spații frigorifice | Temperaturile din farmacie și din frigiderele de medicamente și de probe, înregistrate continuu, cu alarmare la depășirea pragurilor. |
| 6 | Clock | Phasing without interrupting care | Work is planned by zone with the medical management, the old system kept as a fallback, and critical zones migrated last, after the method is proven on non-critical ones. | Fazare fără întreruperea activității | Lucrările se planifică pe zone, cu conducerea medicală, cu sistemul vechi păstrat ca punct de revenire și cu zonele critice migrate ultimele, după validarea metodei pe zone necritice. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; `/expertiza` shows the first four):

| # | EN | RO |
|---|----|----|
| 1 | Temperature and humidity control in operating theatres and intensive care | Temperatură și umiditate reglate în sălile de operație și în terapia intensivă |
| 2 | Controlled differential pressure between aseptic zones and adjacent areas | Presiune diferențială controlată între zonele cu cerințe de asepsie și zonele adiacente |
| 3 | Airflow and air changes in critical zones, with filter condition monitored | Debit de aer și schimburi orare în zonele critice, cu starea filtrelor monitorizată |
| 4 | Pharmacy and medicine or sample cold-storage temperatures with history | Temperaturile din farmacie și din spațiile frigorifice de medicamente și probe, cu istoric |
| 5 | Alarms routed to the staff who can act, not only to the plant room | Alarmare care ajunge la personalul care poate acționa, nu doar în camera tehnică |
| 6 | Phased execution by zone and building wing, with critical zones migrated last | Execuție fazată pe zone și pe corpuri de clădire, cu zonele critice migrate ultimele |

**Project card** (the `testimonial` field; not rendered on the branch sector page, see B0):

- Name: Spitalul Foișor
- Role: Delivered project (EN) / Proiect livrat (RO)
- Company field: București
- Text EN: "BMS delivered for the new Foisor orthopaedic hospital in Bucharest: 9,000 sqm, 119 beds, with backup for critical systems and phased execution inside a healthcare building."
- Text RO: „Sistem BMS livrat pentru noul spital de ortopedie Foișor din București: 9.000 m², 119 paturi, cu backup pentru sistemele critice și execuție etapizată într-o clădire medicală.”

**Related sectors:** Industrial & Logistics (`industrial`), Offices (`civil`), Education & Institutions (`educational`).

### B3. Retail / Retail (`retail`)

Route: `/expertiza/retail` (data key `retail`). The main URL `/sectoare/retail` redirects here. Accent colour `#8B7B5C`, white text on the accent. Image: `/referinte/pitesti-retail-park.webp`.

| Field | EN | RO |
|-------|----|----|
| Title | Retail | Retail |
| Subtitle | Shopping centres, retail parks & chains | Centre comerciale, parcuri de retail și rețele |
| Description | Retail has large volumes, intense occupancy in short intervals and many leased units that run their own terminal plant. The system's value comes from metering per unit and from operating the whole portfolio from one control room. | Retailul are volume mari, ocupare intensă în intervale scurte și multe spații închiriate care își gestionează singure instalațiile terminale. Valoarea sistemului vine din contorizarea pe unitate locativă și din operarea întregului portofoliu dintr-un singur dispecerat. |
| Hero headline | Retail BMS: / unit metering, portfolio operation. | BMS pentru retail: / contorizare și operare pe portofoliu. |
| Hero subheadline | A BMS for retail costs 4-9 EUR/sqm, the lowest band after industrial. In a shopping centre the value does not come from control complexity but from metering per leased unit and from the ability to operate dozens of locations from the same dispatch centre. | Un sistem BMS pentru retail costă 4-9 EUR/mp, cea mai joasă bandă după industrial. Într-un centru comercial, valoarea nu vine din complexitatea reglajului, ci din contorizarea pe unitate locativă și din capacitatea de a opera zeci de locații din același dispecerat. |

**Metrics** (hero tiles, and "Key results" / "Rezultate cheie" on `/expertiza`):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | 4-9 EUR/sqm | System cost, applied to common areas and central plant | 4-9 EUR/mp | Costul sistemului, raportat la părțile comune și la instalațiile centrale |
| 2 | 2 | Retail references: Pitesti Retail Park and Roman Value Centre | 2 | Referințe în retail: Pitești Retail Park și Roman Value Centre |
| 3 | 24,800 sqm | Leasable area at Pitesti Retail Park, served by the BMS | 24.800 m² | Suprafață închiriabilă la Pitești Retail Park, deservită de sistemul BMS |
| 4 | 70 kW | The 2029 EU threshold that brings individual stores under the automation obligation | 70 kW | Pragul UE din 2029, care aduce sub obligație magazinele individuale |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | BarChart3 | Metering per leased unit | Electricity, heat and water meters on every unit, fitted uniformly during construction and integrated via M-Bus or Modbus into a single history. Without them, service-charge recovery is contested. | Contorizare pe unitate locativă | Contoare de energie electrică, termică și de apă pe fiecare unitate, montate unitar în timpul execuției și integrate prin M-Bus sau Modbus într-un singur istoric. Fără ele, recuperarea prin service charge este contestată. |
| 2 | Building2 | One dispatch centre per portfolio | A standardised point list, labels and alarm matrix decided at the first store, so that 40 locations show the same screens and the same alarms mean the same thing everywhere. | Un dispecerat pe portofoliu | Listă de puncte, etichete și matrice de alarme standardizate la primul magazin, ca 40 de locații să afișeze aceleași ecrane, iar aceeași alarmă să însemne același lucru peste tot. |
| 3 | Thermometer | Mall and common areas | Temperature and fresh air in the gallery and common spaces, pressure and airflow at the air handling units, heating and cooling water temperatures. | Galerie și spații comune | Temperatura și aportul de aer proaspăt în galerie și în spațiile comune, presiunea și debitul la centralele de tratare a aerului, temperatura agentului termic și de răcire. |
| 4 | Lightbulb | Lighting on schedule and daylight | Gallery and car park lighting on schedule and daylight where skylights exist. Daylight control reduces lighting consumption, a figure reported against the lighting load, not the whole building. | Iluminat pe program și pe lumină naturală | Iluminatul galeriei și al parcării pe program și pe lumină naturală, unde există luminatoare. Controlul pe lumină naturală reduce consumul de iluminat, cifră raportată la consumul de iluminat, nu la clădire. |
| 5 | Wind | Car park and smoke control | Car park ventilation driven by carbon monoxide measurement, and smoke extraction interfaced with the fire alarm panel, which keeps the safety function. | Parcare și desfumare | Ventilația parcării comandată pe măsurarea monoxidului de carbon și desfumarea în interfață cu centrala de incendiu, care păstrează funcția de siguranță. |
| 6 | ShoppingBag | Food areas | Cold room and refrigerated display temperatures monitored with history and alarming where a food zone exists, plus extract systems for the food court. | Zona alimentară | Temperaturile din spațiile frigorifice și din vitrinele frigorifice monitorizate cu istoric și alarmare, acolo unde există zonă alimentară, plus evacuările zonei de alimentație. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; `/expertiza` shows the first four):

| # | EN | RO |
|---|----|----|
| 1 | Electricity, heat and water meters on every leased unit | Contoare de energie electrică, termică și de apă pe fiecare unitate locativă |
| 2 | Temperature and fresh air supply in the gallery and common areas | Temperatura și aportul de aer proaspăt în galerie și în spațiile comune |
| 3 | Gallery and car park lighting on schedule and on daylight | Iluminatul galeriei și al parcării pe program și pe lumină naturală |
| 4 | Car park ventilation on CO measurement and interface with smoke control | Ventilația parcării pe măsurarea CO și interfața cu desfumarea |
| 5 | Standardised point list, labels and alarm matrix for chain operation | Listă de puncte, etichete și matrice de alarme standardizate pentru operarea pe rețea |
| 6 | History at 15-minute resolution, retained for at least 24 months | Istoric la rezoluție de 15 minute, cu retenție de minimum 24 de luni |

**Project card** (the `testimonial` field; not rendered on the branch sector page, see B0):

- Name: Pitești Retail Park
- Role: Delivered project (EN) / Proiect livrat (RO)
- Company field: Pitești
- Text EN: "BMS delivered for Pitesti Retail Park, a retail park with around 24,800 sqm of leasable area: HVAC control, lighting and energy metering."
- Text RO: „Sistem BMS livrat pentru Pitești Retail Park, parc de retail cu circa 24.800 m² suprafață închiriabilă: control HVAC, iluminat și contorizare de energie.”

**Related sectors:** Offices (`civil`), HORECA (`horeca`), Industrial & Logistics (`industrial`).

### B4. HORECA / HORECA (`horeca`)

Route: `/expertiza/horeca` (data key `horeca`). The main URL `/sectoare/horeca` redirects here. Accent colour `#1F6B4A`, white text on the accent. Image: `/referinte/radisson-blu-hotel.jpg`.

| Field | EN | RO |
|-------|----|----|
| Title | HORECA | HORECA |
| Subtitle | Hotels & restaurants | Hoteluri și restaurante |
| Description | A hotel runs around the clock, with daily occupancy swings and zones with completely different requirements inside the same building: rooms, kitchen, laundry, conference rooms, spa. It is the most heterogeneous commercial building type from an automation standpoint. | Un hotel funcționează permanent, cu ocupare care variază zilnic și cu zone cu cerințe complet diferite în aceeași clădire: camere, bucătărie, spălătorie, săli de conferință, spa. Este cel mai eterogen tip de clădire comercială din punctul de vedere al automatizării. |
| Hero headline | Hotel BMS: / room control drives the budget. | BMS pentru hoteluri: / controlul pe cameră decide bugetul. |
| Hero subheadline | A hotel BMS costs 6-13 EUR/sqm when it covers only the central plant and 18-38 EUR/sqm with room control. The difference does not come from the basement equipment but from the hundreds of rooms, each with its own thermostat, window contact and link to the front-desk system. | Un sistem BMS pentru un hotel costă 6-13 EUR/mp dacă acoperă doar instalațiile centrale și 18-38 EUR/mp cu control pe cameră. Diferența nu vine din echipamentele de la subsol, ci din sutele de camere, fiecare cu termostat, contact de fereastră și legătură cu sistemul de recepție. |

**Metrics** (hero tiles, and "Key results" / "Rezultate cheie" on `/expertiza`):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | 6-13 EUR/sqm | Without room control: central plant only | 6-13 EUR/mp | Fără control pe cameră: doar instalațiile centrale |
| 2 | 18-38 EUR/sqm | With room control: the cost of the rooms dominates the budget | 18-38 EUR/mp | Cu control pe cameră: costul camerelor domină bugetul |
| 3 | 4 | HORECA references in Bucharest: Radisson, Athenee Palace Hilton, Novotel, Crowne Plaza | 4 | Referințe HORECA în București: Radisson, Athénée Palace Hilton, Novotel, Crowne Plaza |
| 4 | 598 | Rooms at Athenee Palace Hilton Bucharest, a historic hotel served by the delivered BMS | 598 | Camere la Athénée Palace Hilton București, hotel istoric deservit de sistemul BMS livrat |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | Hotel | Room control linked to reception | The system learns from the hotel management system whether a room is sold, occupied or free and applies the matching regime. Most of a hotel's achievable saving sits in the unsold rooms. | Control pe cameră legat de recepție | Sistemul află din sistemul de gestiune hotelieră dacă o cameră este vândută, ocupată sau liberă și aplică regimul corespunzător. Cea mai mare parte a economiei posibile într-un hotel stă în camerele nevândute. |
| 2 | Thermometer | Setback calibrated to the room | The reduced regime is calibrated on the real thermal inertia of the room, not a fixed value, so the room returns to comfort between check-in and the guest entering. A complaint cancels the whole saving policy. | Regim redus calibrat pe cameră | Regimul redus se calibrează pe inerția termică reală a camerei, nu pe o valoare fixă, ca revenirea la confort să se încadreze între check-in și intrarea oaspetelui. O reclamație anulează toată politica de economie. |
| 3 | Wind | Kitchen, laundry, car park | Kitchen supply air follows hood operation, the laundry has its own regime, and car park ventilation runs on carbon monoxide measurement with automatic alarming. | Bucătărie, spălătorie, parcare | Aportul de aer la bucătărie urmează funcționarea hotelor, spălătoria are regim propriu, iar ventilația parcării merge pe măsurarea monoxidului de carbon, cu alarmare automată. |
| 4 | Droplets | Spa and pool zones | High humidity requires dedicated air handling, heat recovery and condensation-resistant equipment. A wrong setting there degrades the building structure within a few seasons. | Zona de spa și piscină | Umiditatea ridicată cere tratare a aerului dedicată, recuperare de căldură și materiale rezistente la condens. Un reglaj greșit acolo degradează construcția în câteva sezoane. |
| 5 | BarChart3 | Consumption by functional zone | Energy metered per functional zone (rooms, kitchen, laundry, spa, conference), with domestic hot water temperature monitored and historised against microbiological risk. | Consum pe zone funcționale | Energie contorizată pe zone funcționale (camere, bucătărie, spălătorie, spa, conferințe), cu temperatura apei calde menajere monitorizată și istoricizată pentru prevenirea riscului microbiologic. |
| 6 | Clock | Phased work, hotel running | Execution by floor and zone in low-occupancy periods, with a limited number of rooms out of sale at a time and central plant migrated in night windows with the old system as fallback. | Lucrări fazate, hotel în funcțiune | Execuție pe etaje și pe zone în perioadele de ocupare scăzută, cu un număr limitat de camere scoase din vânzare simultan și cu instalațiile centrale migrate în ferestre nocturne, cu sistemul vechi ca punct de revenire. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; `/expertiza` shows the first four):

| # | EN | RO |
|---|----|----|
| 1 | A thermostat in every room, with window contact and presence detection | Termostat propriu în fiecare cameră, cu contact de fereastră și detector de prezență |
| 2 | Interface with the hotel management system: room sold, occupied or free | Interfață cu sistemul de gestiune hotelieră: cameră vândută, ocupată sau liberă |
| 3 | Fresh air supply matched to occupancy in conference rooms and the restaurant | Aport de aer proaspăt corelat cu ocuparea la sălile de conferință și la restaurant |
| 4 | Domestic hot water temperature monitored, with history | Temperatura apei calde menajere, monitorizată cu istoric |
| 5 | Car park ventilation driven by carbon monoxide measurement | Ventilația parcării pe măsurarea monoxidului de carbon |
| 6 | Kitchen cold-room temperatures with alarming | Temperaturile din spațiile frigorifice ale bucătăriei, cu alarmare |

**Project card** (the `testimonial` field; not rendered on the branch sector page, see B0):

- Name: Radisson Blu București
- Role: Delivered project (EN) / Proiect livrat (RO)
- Company field: București
- Text EN: "BMS automation delivered for a five-star hotel in Bucharest with over 1,800 sqm of event space: temperature control and ventilation integrated into the central system."
- Text RO: „Automatizare BMS livrată pentru un hotel de cinci stele din București, cu peste 1.800 m² de spații de evenimente: control de temperatură și ventilație integrate în sistemul central.”

**Related sectors:** Retail (`retail`), Offices (`civil`), Healthcare (`medical`).

### B5. Industrial & Logistics / Industrial & Logistică (`industrial`)

Route: `/expertiza/industrial` (data key `industrial`). The main URL `/sectoare/industrial` redirects here. Accent colour `#5C5FD4`, white text on the accent. Image: `/referinte/ntn-snr-fabrica-de-rulmenti.jpg`.

| Field | EN | RO |
|-------|----|----|
| Title | Industrial & Logistics | Industrial & Logistică |
| Subtitle | Production halls & logistics warehouses | Hale de producție și depozite logistice |
| Description | A hall has large volumes, zones with different requirements and a production process that does not stop for automation. The building side and the process side are distinct systems, and the boundary between them is set explicitly, in the project. | O hală are volume mari, zone cu cerințe diferite și un proces de producție care nu se oprește pentru automatizare. Partea de clădire și partea de proces sunt sisteme distincte, iar granița dintre ele se stabilește explicit, în proiect. |
| Hero headline | Industrial BMS: / large zones, monitored utilities. | BMS industrial și logistic: / zone mari, utilități monitorizate. |
| Hero subheadline | Automating a production hall or a logistics warehouse costs 3-8 EUR/sqm, the lowest band in the cost register, because areas are large and point density is low. The value comes not from fine control but from monitored utilities and from the continuity the production depends on. | Automatizarea unei hale de producție sau a unui depozit logistic costă 3-8 EUR/mp, cea mai joasă bandă din registrul de costuri, pentru că suprafețele sunt mari și densitatea de puncte este mică. Valoarea nu vine din reglajul fin, ci din monitorizarea utilităților și din continuitatea de care depinde producția. |

**Metrics** (hero tiles, and "Key results" / "Rezultate cheie" on `/expertiza`):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | 3-8 EUR/sqm | The lowest cost band: large areas, low point density | 3-8 EUR/mp | Cea mai joasă bandă de cost: suprafețe mari, densitate mică de puncte |
| 2 | 3 | Industrial references: NTN-SNR Sibiu, Moncler Bacau, BMTI Strabag | 3 | Referințe industriale: NTN-SNR Sibiu, Moncler Bacău, BMTI Strabag |
| 3 | 37,000 sqm | Production floor at the NTN-SNR bearing factory in Sibiu, served by the BMS | 37.000 m² | Suprafață de producție la fabrica de rulmenți NTN-SNR Sibiu, deservită de sistemul BMS |
| 4 | 1,000 toe | Annual threshold for the mandatory energy audit under Law 121/2014 | 1.000 tep | Pragul anual pentru auditul energetic obligatoriu, conform Legii 121/2014 |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | Factory | Large zones, high halls | Heating via unit heaters, destratification fans or radiant panels, measured at several heights: controlling on one sensor at 2 metres in a 10-12 metre hall gives a false picture. | Zone mari, hale înalte | Încălzire prin aeroterme, destratificatoare sau radianți, cu măsurare pe mai multe niveluri: reglajul pe un singur senzor la 2 metri, într-o hală de 10-12 metri, produce o imagine falsă. |
| 2 | Wind | Process-linked ventilation | Technological ventilation follows the process, with equipment protection ratings chosen for dust, vibration, temperature extremes or jet washing in food areas. | Ventilație corelată cu procesul | Ventilația tehnologică urmează procesul, cu grade de protecție alese pentru praf, vibrații, temperaturi extreme sau spălare cu jet în zonele alimentare. |
| 3 | Gauge | Compressed air monitored | The most expensive utility in a factory and the most often wasted: flow and pressure are correlated with the production schedule so that leaks become visible. | Aer comprimat monitorizat | Cea mai scumpă utilitate dintr-o fabrică și cea mai des irosită: debitul și presiunea se corelează cu programul de producție, ca pierderile să devină vizibile. |
| 4 | Zap | Energy per line and utility | Electricity metered per production line and per utility, producing the data required for the mandatory energy audit at 1,000 toe per year. | Energie pe linii și utilități | Energie electrică contorizată pe linii de producție și pe utilități, cu datele necesare auditului energetic obligatoriu la 1.000 tep pe an. |
| 5 | Shield | Building-process boundary | The BMS does not command the production line: integration with line automation happens at utility and status level, with responsibilities set down in writing. | Granița clădire-proces | Sistemul BMS nu comandă linia de producție: integrarea cu automatizările liniilor se face la nivel de utilitate și de stare, cu responsabilități scrise. |
| 6 | Clock | No unplanned stops | Interventions are grouped into the factory's planned shutdowns, while adjacent offices and changing rooms are treated as a small tertiary building of their own. | Fără opriri neplanificate | Intervențiile se grupează în opririle planificate ale fabricii, iar birourile și vestiarele adiacente se tratează ca o clădire terțiară în miniatură. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; `/expertiza` shows the first four):

| # | EN | RO |
|---|----|----|
| 1 | Temperature over large zones, with destratification driven by the level difference | Temperatura pe zone mari, cu destratificare comandată pe diferența dintre niveluri |
| 2 | Compressed air, chilled water and process water monitoring | Monitorizarea aerului comprimat, a apei răcite și a apei de proces |
| 3 | Temperature and humidity in warehouses with product requirements, with history and alarms | Temperatura și umiditatea în depozitele cu cerințe de produs, cu istoric și alarmare |
| 4 | Electricity consumption per production line and per utility | Consum de energie electrică pe linii de producție și pe utilități |
| 5 | Status of pumping groups, compressors and utility equipment | Starea grupurilor de pompare, a compresoarelor și a echipamentelor de utilități |
| 6 | Lighting by zone and presence, ventilation and air curtains at the gates | Iluminat pe zone și pe prezență, ventilație și perdele de aer la porți |

**Project card** (the `testimonial` field; not rendered on the branch sector page, see B0):

- Name: NTN-SNR Sibiu
- Role: Delivered project (EN) / Proiect livrat (RO)
- Company field: Sibiu
- Text EN: "BMS delivered for the NTN-SNR bearing factory in Sibiu, with 37,000 sqm of production floor: hall temperature control, industrial ventilation and monitoring per production zone."
- Text RO: „Sistem BMS livrat pentru fabrica de rulmenți NTN-SNR din Sibiu, cu 37.000 m² suprafață de producție: control de temperatură pe hale, ventilație industrială și monitorizare pe zone de producție.”

**Related sectors:** Pharma (`pharma`), Retail (`retail`), Offices (`civil`).

### B6. Education & Institutions / Educațional & Instituții (`educational`)

Route: `/expertiza/educational` (data key `educational`). The main URL `/sectoare/educational` redirects here. Accent colour `#E07B6A`, dark text on the accent. Image: `/referinte/scoala-germana-bucuresti.jpg`.

| Field | EN | RO |
|-------|----|----|
| Title | Education & Institutions | Educațional & Instituții |
| Subtitle | Schools, embassies & public buildings | Școli, ambasade și clădiri publice |
| Description | Occupancy density in a classroom is higher than in almost any office, and use is concentrated in short intervals, with nights, weekends and holidays adding up to many weeks a year. The buyer is frequently public, which shapes the whole procurement process. | Densitatea de ocupare într-o sală de clasă este mai mare decât în aproape orice birou, iar utilizarea este concentrată în intervale scurte, cu nopți, weekenduri și vacanțe care însumează multe săptămâni pe an. Cumpărătorul este frecvent public, ceea ce schimbă tot procesul de achiziție. |
| Hero headline | Schools and institutions: / CO2 ventilation, timetable control. | Școli și instituții: / ventilație pe CO2, program pe orar. |
| Hero subheadline | A classroom with 30 pupils reaches carbon dioxide concentrations that affect attention in under an hour. The combination of CO2-driven ventilation and a correct time schedule is the best automation investment in an educational building. | O sală de clasă cu 30 de elevi atinge concentrații de dioxid de carbon care afectează atenția în mai puțin de o oră. Combinația dintre ventilația comandată pe CO2 și programul orar corect este cea mai bună investiție de automatizare dintr-o clădire educațională. |

**Metrics** (hero tiles, and "Key results" / "Rezultate cheie" on `/expertiza`):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | 3 | References: the Canadian Embassy, the German School, the French Lycee Anna de Noailles | 3 | Referințe: Ambasada Canadei, Școala Germană, Liceul Francez Anna de Noailles |
| 2 | 13,500 sqm | Built area of the French Lycee Anna de Noailles campus, automated by Sovitech | 13.500 m² | Suprafață construită la campusul Liceului Francez Anna de Noailles, automatizat de Sovitech |
| 3 | 5-10 EUR/sqm | Cost reference: the class B office band, used as a proxy for schools | 5-10 EUR/mp | Reper de cost: banda birourilor clasa B, folosită ca proxy pentru școli |
| 4 | 70 kW | The 2029 EU threshold that brings most schools with central plant under the obligation | 70 kW | Pragul UE din 2029, care aduce sub obligație majoritatea școlilor cu instalații centralizate |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | Wind | CO2 ventilation in classrooms | Sensors go in the occupied zone of the room, not in the corridor: a sensor by the door sees nothing of a room with 30 pupils and the door closed. | Ventilație pe CO2 în sălile de clasă | Senzorii se montează în zona ocupată a sălii, nu pe hol: un senzor lângă ușă nu vede ce se întâmplă într-o sală cu 30 de elevi și ușa închisă. |
| 2 | GraduationCap | Timetable and holiday schedules | A timetable that changes twice a year, holidays with different dates every year, afternoon activities: who updates the calendar, and when, is written into the maintenance contract. | Program pe orar și pe vacanțe | Orar schimbat de două ori pe an, vacanțe cu date diferite în fiecare an, activități de după-amiază: cine actualizează calendarul, și când, se scrie în contractul de întreținere. |
| 3 | Building2 | Building wings and sports halls | Heating water temperature per building wing, laboratories and workshops, with sports halls treated separately for their large volumes and variable load. | Corpuri de clădire și săli de sport | Temperatura agentului termic pe corpuri de clădire, laboratoare și ateliere, cu sălile de sport tratate separat, pentru volumele mari și sarcina variabilă. |
| 4 | Shield | Institutional security | At embassies and institutional buildings: network segmentation, controlled physical access to panels and full traceability of interventions, with the security service holding a veto. | Securitate instituțională | La ambasade și clădiri instituționale: segmentare de rețea, acces fizic controlat la tablouri și trasabilitate completă a intervențiilor, cu drept de veto al serviciului de securitate. |
| 5 | FileCheck | Public procurement | The specification describes functions and characteristics, not product codes, so the procedure stays competitive and cannot be contested for steering. | Achiziție publică | Specificația descrie funcții și caracteristici, nu coduri de produs, ca procedura să rămână competitivă și să nu poată fi contestată pentru direcționare. |
| 6 | Clock | Execution during holidays | Phasing is built on school holidays, with complete, functional stages at the end of each: the start of the school year is not negotiable. | Execuție în vacanțe | Fazarea se construiește pe vacanțe, cu etape complete și funcționale la finalul fiecăreia: data începerii cursurilor nu se negociază. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; `/expertiza` shows the first four):

| # | EN | RO |
|---|----|----|
| 1 | Fresh air supply driven by CO2 measurement in classrooms | Aport de aer proaspăt comandat pe măsurarea CO2 în sălile de clasă |
| 2 | Temperature per room or room group, on timetable and holiday schedules | Temperatura pe săli sau pe grupuri de săli, cu program pe orar și pe vacanțe |
| 3 | Plant status monitored during holidays, when the building is unattended | Starea instalațiilor monitorizată în vacanțe, când clădirea este nesupravegheată |
| 4 | Domestic hot water temperature and heating substation operation | Temperatura apei calde menajere și funcționarea punctului termic |
| 5 | Lighting on schedule and presence in common areas | Iluminat pe program și pe prezență în zonele comune |
| 6 | Energy consumption per building wing, with history for budgeting | Consum de energie pe corpuri de clădire, cu istoric pentru bugetare |

**Project card** (the `testimonial` field; not rendered on the branch sector page, see B0):

- Name: Școala Germană București
- Role: Delivered project (EN) / Proiect livrat (RO)
- Company field: București
- Text EN: "BMS delivered for the new campus of the German School in Bucharest, 8,000 sqm built area: HVAC control, ventilation and monitoring."
- Text RO: „Sistem BMS livrat pentru noul campus al Școlii Germane din București, 8.000 m² construiți: control HVAC, ventilație și monitorizare.”

**Related sectors:** Offices (`civil`), Healthcare (`medical`), HORECA (`horeca`).

### B7. Pharma / Pharma (`pharma`)

Route: `/expertiza/pharma` (data key `pharma`). New on the branch; main has no such sector. Accent colour `#0D2E2B`, white text on the accent. Image: `/referinte/rompharm-company-otopeni.jpg`.

| Field | EN | RO |
|-------|----|----|
| Title | Pharma | Pharma |
| Subtitle | Pharmaceutical production & classified areas | Producție farmaceutică și zone clasificate |
| Description | In a classified area, parameters are not a matter of comfort but a condition of the product. What is really being bought is the proof: the system measures and controls, but its value lies in the record that stands up to an inspection. | Într-o zonă clasificată, parametrii nu sunt o chestiune de confort, ci o condiție de produs. Ce se cumpără de fapt este dovada: sistemul măsoară și reglează, dar valoarea lui stă în înregistrarea care rezistă la inspecție. |
| Hero headline | Pharma BMS and EMS: / classified areas, audit trail. | BMS și EMS pentru pharma: / zone clasificate, pistă de audit. |
| Hero subheadline | Automating a pharmaceutical production facility costs 30-80 EUR/sqm, the highest band in the register, applied to the areas with requirements, not the whole built area. The difference from an ordinary building is the requirement to prove, at any time and for any moment in the past, that parameters stayed within limits. | Automatizarea unei unități de producție farmaceutică costă 30-80 EUR/mp, cea mai ridicată bandă din registru, aplicată zonelor cu cerințe, nu întregii suprafețe construite. Diferența față de o clădire obișnuită este cerința de a dovedi, oricând și pentru orice moment din trecut, că parametrii au fost în limite. |

**Metrics** (hero tiles, and "Key results" / "Rezultate cheie" on `/expertiza`):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | 30-80 EUR/sqm | The highest cost band: classified areas, validated monitoring, qualification documentation | 30-80 EUR/mp | Cea mai ridicată bandă de cost: zone clasificate, monitorizare validată, documentație de calificare |
| 2 | 5 | Pharma references: Rompharm Co, Rompharm Uzbekistan, Hyperion Pharma, Actavis, Monrol Eczacibasi | 5 | Referințe pharma: Rompharm Co, Rompharm Uzbekistan, Hyperion Pharma, Actavis, Monrol Eczacıbașı |
| 3 | 24 months | Minimum data retention at full resolution | 24 luni | Retenție minimă a datelor la rezoluție completă |
| 4 | IQ, OQ, PQ | Qualification through protocols written and approved before execution | IQ, OQ, PQ | Calificare prin protocoale scrise și aprobate înainte de execuție |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | FlaskConical | Classified areas | Temperature, humidity and differential pressure controlled in every classified area and in warehouses with product requirements. | Zone clasificate | Temperatură, umiditate și presiune diferențială reglate în fiecare zonă clasificată și în depozitele cu cerințe de produs. |
| 2 | Gauge | Differential pressures | Monitored between areas of different classification, with alarming on violation: an interval below the limit is a deviation that gets investigated and can affect the batch. | Presiuni diferențiale | Monitorizate între zone de clasificare diferită, cu alarmare pe depășire: un interval sub limită este o deviație care se investighează și poate afecta lotul. |
| 3 | FileCheck | Audit trail | Unalterable records with user, timestamp and reason for every parameter change, and at least 24 months of retention at full resolution. | Pistă de audit | Înregistrări nemodificabile, cu utilizator, moment și motiv pentru fiecare schimbare de parametru, și retenție de minimum 24 de luni la rezoluție completă. |
| 4 | Shield | Monitoring separate from control | The environmental monitoring system records independently, with its own sensors: the system that controls cannot also be the one proving it controlled correctly. | Monitorizare separată de automatizare | Sistemul de monitorizare a mediului înregistrează independent, cu senzori proprii: cine reglează nu poate fi și cel care dovedește că a reglat corect. |
| 5 | Wind | Dedicated air handling units | Operating sequences with failure regimes and changeover to standby equipment, with filter condition tracked through differential pressure. | Centrale de tratare a aerului dedicate | Secvențe de funcționare cu regimuri de avarie și trecere pe echipament de rezervă, cu starea filtrelor urmărită prin presiune diferențială. |
| 6 | Thermometer | Warehouses and stability rooms | Product cold rooms and stability chambers monitored continuously, with alert and action thresholds set together with the quality department. | Depozite și camere de stabilitate | Camere frigorifice de produs și camere de stabilitate monitorizate continuu, cu praguri de alertă și de acțiune stabilite împreună cu departamentul de calitate. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; `/expertiza` shows the first four):

| # | EN | RO |
|---|----|----|
| 1 | IQ, OQ and PQ qualification, with protocols written and approved before execution | Calificare IQ, OQ și PQ, cu protocoale scrise și aprobate înainte de execuție |
| 2 | Change management: every parameter change goes through procedure, with a trace in the system | Management al schimbării: orice modificare de parametru se face prin procedură, cu urmă în sistem |
| 3 | Alarm thresholds set on alert and action limits, not on the strictest possible value | Praguri de alarmă stabilite pe limite de alertă și de acțiune, nu pe cea mai strictă valoare posibilă |
| 4 | Continuous monitoring with real-time alarming, not dataloggers downloaded periodically | Monitorizare continuă cu alarmare în timp real, nu dataloggere descărcate periodic |
| 5 | At least 24 months of retention at full resolution, with a 5-10 year aggregated archive | Retenție de minimum 24 de luni la rezoluție completă, cu arhivă agregată de 5-10 ani |
| 6 | The 30-80 EUR/sqm band applies to the areas with requirements, not the whole built area | Banda de 30-80 EUR/mp se aplică zonelor cu cerințe, nu întregii suprafețe construite |

**Project card** (the `testimonial` field; not rendered on the branch sector page, see B0):

- Name: Rompharm Uzbekistan
- Role: Delivered project (EN) / Proiect livrat (RO)
- Company field: Uzbekistan
- Text EN: "Extension of Rompharm's BMS automation to a new pharmaceutical factory in Uzbekistan: temperature, humidity and pressure control, executed and commissioned outside Romania."
- Text RO: „Extinderea automatizării BMS Rompharm către o nouă fabrică farmaceutică din Uzbekistan: control de temperatură, umiditate și presiune, cu execuție și punere în funcțiune în afara României.”

**Related sectors:** Healthcare (`medical`), Industrial & Logistics (`industrial`), Offices (`civil`).

### B8. Entertainment / Entertainment (`entertainment`)

Route: `/expertiza/entertainment` (data key `entertainment`). New on the branch; main has no such sector. Accent colour `#B14A36`, white text on the accent. Image: `/placeholder.svg?height=800&width=1200` (a placeholder).

| Field | EN | RO |
|-------|----|----|
| Title | Entertainment | Entertainment |
| Subtitle | Venues, cinemas & leisure spaces | Săli de spectacol, cinematografe și agrement |
| Description | A performance hall goes from zero to several hundred people in fifteen minutes and back to zero after two hours. It is the most variable load profile of any building type, with a low tolerance for discomfort and for noise. | O sală de spectacol trece de la zero la câteva sute de persoane în cincisprezece minute și revine la zero după două ore. Este cel mai variabil profil de sarcină dintre toate tipurile de clădire, cu toleranță scăzută la disconfort și la zgomot. |
| Hero headline | Venue BMS: / ventilation on real occupancy. | BMS pentru săli de spectacol: / ventilație pe ocuparea reală. |
| Hero subheadline | The automation system prepares the hall before the event, sustains full occupancy without perceptible draughts and returns quickly to a minimum regime. Ventilation is driven by real occupancy, measured through CO2, not by a fixed airflow sized for a full house. | Sistemul de automatizare pregătește sala înainte de eveniment, susține ocuparea maximă fără curenți de aer perceptibili și revine rapid la un regim minim. Ventilația se comandă pe ocuparea reală, măsurată prin CO2, nu pe un debit fix dimensionat pentru sala plină. |

**Metrics** (hero tiles, and "Key results" / "Rezultate cheie" on `/expertiza`):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | 4-18 EUR/sqm | Cost reference: the aggregated band, used as a proxy for this sector | 4-18 EUR/mp | Reper de cost: banda agregată, folosită ca proxy pentru acest sector |
| 2 | CO2 | Ventilation driven by real occupancy, measured in the audience breathing zone | CO2 | Ventilație comandată pe ocuparea reală, măsurată în zona de respirație a publicului |
| 3 | 290 kW | Legal automation threshold, deadline 31.12.2024, already passed | 290 kW | Pragul legal de automatizare, termen 31.12.2024, deja depășit |
| 4 | 2026 | EU deadline (29 May) for indoor environmental quality monitoring, not yet transposed | 2026 | Termenul UE (29 mai) pentru monitorizarea calității mediului interior, încă netranspus |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | Wind | Ventilation on real occupancy | Driven by CO2 measured in the audience breathing zone, not on the return duct, where the value is delayed and mixed. | Ventilație pe ocuparea reală | Comandă pe CO2 măsurat în zona de respirație a publicului, nu pe tubulatura de retur, unde valoarea este întârziată și amestecată. |
| 2 | Clock | Anticipated start-up | The start moment is calculated from the hall's real temperature and thermal inertia, using the events calendar, not a fixed number of minutes. | Pornire anticipată | Momentul pornirii se calculează pe temperatura reală a sălii și pe inerția ei termică, din programul de evenimente, nu pe un număr fix de minute. |
| 3 | Gauge | Slow airflow ramps | Airflow increases are explicitly limited in the control program: in a performance hall, a change you can hear is a defect. | Rampe lente de debit | Creșterile de debit se limitează explicit în programul de control: într-o sală de spectacol, o variație care se aude este un defect. |
| 4 | Thermometer | Foyers and access zones | They load up suddenly before and after the event and need their own regime, separate from the hall. | Foaiere și zone de acces | Se încarcă brusc înainte și după eveniment și cer un regim propriu, separat de sală. |
| 5 | Zap | Consumption per event | Energy is measured per event, making visible the between-events running cost, which dominates in a hall used a few hours a day. | Consum pe eveniment | Energia se măsoară pe eveniment, iar costul de operare între evenimente, dominant într-o sală folosită câteva ore pe zi, devine vizibil. |
| 6 | Shield | Fire panel interface | Smoke control and evacuation stay with the fire alarm panel; the automation system receives the signal and switches plant according to the scenario, without taking over the safety function. | Interfața cu centrala de incendiu | Desfumarea și evacuarea rămân la centrala de incendiu; sistemul de automatizare primește semnal și comută instalațiile conform scenariului, fără să preia funcția de siguranță. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; `/expertiza` shows the first four):

| # | EN | RO |
|---|----|----|
| 1 | Hall temperature and airflow, correlated with measured occupancy | Temperatura și debitul de aer în sală, corelate cu ocuparea măsurată |
| 2 | Hall temperature tracked at several points, because gradients are large | Temperatura în sală urmărită pe mai multe puncte, pentru că gradienții sunt mari |
| 3 | Ventilation at the bar and food area, with storage spaces monitored | Ventilația la bar și la zona de alimentație, cu spațiile de depozitare monitorizate |
| 4 | Dressing rooms, technical zones and associated offices, each with its own regime | Cabine, zone tehnice și birouri asociate, fiecare cu regimul propriu |
| 5 | Stage lighting stays separate: a large, variable heat load, not commanded by the BMS | Iluminatul scenic rămâne separat: sarcină termică mare și variabilă, necomandată de BMS |
| 6 | Maximum airflow sized for hall capacity, used only when occupancy requires it | Debit maxim dimensionat pentru capacitatea sălii, folosit doar când ocuparea o cere |

**Project card** (the `testimonial` field; not rendered on the branch sector page, see B0):

- Name: Therme Nord București
- Role: Transferable competence (EN) / Competență transferabilă (RO)
- Company field: Sport & Wellness
- Text EN: "Sovitech Control does not yet claim a reference of its own in entertainment. The competence for large air volumes and variable occupancy comes from the Therme Nord Bucuresti wellness complex and from the conference rooms of the hotels in the portfolio."
- Text RO: „Sovitech Control nu afirmă încă o referință proprie în entertainment. Competența pentru volume mari de aer și ocupare variabilă vine din complexul de wellness Therme Nord București și din sălile de conferință ale hotelurilor din portofoliu.”

**Related sectors:** HORECA (`horeca`), Education & Institutions (`educational`), Retail (`retail`).

### B9. Data centres / Centre de date (`centre-de-date`)

Route: `/expertiza/centre-de-date` (data key `centre-de-date`). New on the branch; main has no such sector. Accent colour `#5C5FD4`, white text on the accent. Image: `/placeholder.svg?height=800&width=1200` (a placeholder).

| Field | EN | RO |
|-------|----|----|
| Title | Data centres | Centre de date |
| Subtitle | Infrastructure monitoring & automation | Monitorizare și automatizare a infrastructurii |
| Description | The heat load is constant, concentrated and almost entirely internal: there is no season, no occupancy, no night regime. The monitoring system has to be more reliable than the plant it supervises. | Sarcina termică este constantă, concentrată și aproape integral internă: nu există sezon, ocupare sau regim de noapte. Sistemul de monitorizare trebuie să fie mai fiabil decât instalația pe care o supraveghează. |
| Hero headline | Data centres: / precision cooling, verified redundancy. | Centre de date: / răcire de precizie, redundanță verificată. |
| Hero subheadline | Cooling never stops, redundancy is verified permanently, and the time between a failure and an intervention is measured in minutes. Sovitech Control does not yet have a project of its own in this sector: it offers the infrastructure monitoring and automation part, working alongside the facility's specialist designer. | Răcirea nu se oprește niciodată, redundanța se verifică permanent, iar timpul dintre o defecțiune și o intervenție se măsoară în minute. Sovitech Control nu are încă un proiect propriu în acest sector: ofertează partea de monitorizare și automatizare a infrastructurii, în echipă cu proiectantul de specialitate al facilității. |

**Metrics** (hero tiles, and "Key results" / "Rezultate cheie" on `/expertiza`):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | 90-320 EUR | Per data point, the band common to all sectors | 90-320 EUR | Pe punct de date, banda comună tuturor sectoarelor |
| 2 | PUE | Total facility energy divided by computing equipment energy, over a declared period | PUE | Energia totală a facilității raportată la energia echipamentelor de calcul, pe o perioadă declarată |
| 3 | NIS2 | GEO 155/2024, in force for digital infrastructure operators | NIS2 | OUG 155/2024, în vigoare pentru operatorii de infrastructură digitală |
| 4 | 0 | Own projects in this sector: the page describes transferable competence, not experience | 0 | Proiecte proprii în sector: pagina descrie competență transferabilă, nu experiență |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | Thermometer | Cold aisle temperature | Measured at the equipment intake, at three heights per rack, in the most loaded rows, with control on the worst value, not on a wall sensor at two metres. | Temperatura pe culoarul rece | Măsurată pe aspirația echipamentelor, la trei înălțimi pe rack, în rândurile cele mai încărcate, cu reglaj pe cea mai defavorabilă valoare, nu pe un senzor de perete la doi metri. |
| 2 | Shield | Verified redundancy | Standby equipment that has never started under real load is not redundancy but an assumption: rotation and changeover testing are functions of the system. | Redundanță verificată | Un echipament de rezervă care nu a pornit niciodată sub sarcină reală nu este redundanță, ci o presupunere: rotația și testarea comutării sunt funcții ale sistemului. |
| 3 | Gauge | Humidity, dew point, pressures | Pressure in the raised floor or ceiling plenum, relative humidity and dew point, and liquid leak detection under the floor and near the cooling circuits. | Umiditate, punct de rouă, presiuni | Presiunea în podeaua tehnică sau în tavanul de distribuție, umiditatea relativă și punctul de rouă, plus detecția scurgerilor de lichid sub podea și lângă circuitele de răcire. |
| 4 | Zap | Metering for PUE | Consumption measured separately on computing circuits and infrastructure circuits, at 15-minute resolution with at least 24 months of retention, for year-on-year comparison. | Contorizare pentru PUE | Consum măsurat separat pe circuitele de calcul și pe cele de infrastructură, la rezoluție de 15 minute, cu retenție de minimum 24 de luni, pentru comparație an la an. |
| 5 | Server | Equipment integration | Precision cooling units, UPS systems, generators and power quality analysers, integrated via Modbus and BACnet without opening an unsecured access path. | Integrarea echipamentelor | Unități de răcire de precizie, surse neîntreruptibile, generatoare și analizoare de rețea, integrate prin Modbus și BACnet, fără a deschide o cale de acces nesecurizată. |
| 6 | Clock | Alarm escalation | By severity and by time: an alarm not acknowledged within minutes reaches someone else, instead of staying on a single channel. | Alarmare cu escaladare | Pe severități și pe timp: o alarmă neconfirmată în câteva minute ajunge la altcineva, nu rămâne pe un singur canal. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; `/expertiza` shows the first four):

| # | EN | RO |
|---|----|----|
| 1 | Dense environmental monitoring with alarming and history, as in the pharma projects | Monitorizare densă de parametri de mediu, cu alarmare și istoric, ca în proiectele farmaceutice |
| 2 | Local controller operation without depending on supervision, as in hospital critical zones | Funcționare locală a controlerelor, fără dependență de supervizare, ca în zonele critice de spital |
| 3 | Automatic changeover to standby equipment and rotation for even wear | Comutare automată pe echipamentul de rezervă și funcționare în rotație, pentru uzură uniformă |
| 4 | PUE calculated over a declared period, from two quantities measured with dedicated meters | Calculul PUE pe o perioadă declarată, din două mărimi măsurate cu contoare dedicate |
| 5 | NIS2 security: network segmentation, controlled remote access, logged interventions | Securitate NIS2: segmentare de rețea, acces la distanță controlat, jurnalizarea intervențiilor |
| 6 | Work alongside the facility's specialist designer; redundancy design stays with them | Colaborare cu proiectantul de specialitate al facilității; proiectarea redundanței rămâne la acesta |

**Project card** (the `testimonial` field; not rendered on the branch sector page, see B0):

- Name: Sovitech Control
- Role: Competence statement (EN) / Declarație de competență (RO)
- Company field: Data centres
- Text EN: "Sovitech Control has not executed a data centre project to date. The transferable competences come from dense monitoring in the pharma projects, from the continuity of hospital critical zones and from zone metering in offices and retail."
- Text RO: „Sovitech Control nu a executat până acum un proiect de centru de date. Competențele transferabile vin din monitorizarea densă din proiectele farmaceutice, din continuitatea zonelor critice de spital și din contorizarea pe zone din birouri și retail.”

**Related sectors:** Healthcare (`medical`), Industrial & Logistics (`industrial`), Offices (`civil`).

### B10. Sport & Wellness / Sport & Wellness (`sport-si-wellness`)

Route: `/expertiza/sport-si-wellness` (data key `sport-si-wellness`). New on the branch; main has no such sector. Accent colour `#1F6B4A`, white text on the accent. Image: `/referinte/therme-nord-bucuresti.jpg`.

| Field | EN | RO |
|-------|----|----|
| Title | Sport & Wellness | Sport & Wellness |
| Subtitle | Pools, spas & sports halls | Piscine, spa și săli de sport |
| Description | The water surface evaporates continuously, and the amount of vapour depends on water temperature, air temperature, water movement and the number of users. It is the only building type where the humidity load outweighs the thermal load. | Suprafața de apă evaporă continuu, iar cantitatea de vapori depinde de temperatura apei, de temperatura aerului, de mișcarea apei și de numărul de utilizatori. Este singurul tip de clădire în care sarcina de umiditate depășește ca importanță sarcina termică. |
| Hero headline | Pool and wellness BMS: / humidity decides everything. | BMS pentru piscine și wellness: / umiditatea decide totul. |
| Hero subheadline | In a building with pools, humidity decides comfort, consumption and the life of the structure. A wrong setting produces condensation inside the structure and damage that costs more, within a few years, than the entire automation system. The sector reference: Therme Nord Bucuresti. | Într-o clădire cu bazine, umiditatea decide confortul, consumul și durata de viață a construcției. Un reglaj greșit produce condens în structură și degradări care costă, în câțiva ani, mai mult decât întregul sistem de automatizare. Referința sectorului: Therme Nord București. |

**Metrics** (hero tiles, and "Key results" / "Rezultate cheie" on `/expertiza`):

| # | Value EN | Label EN | Value RO | Label RO |
|---|----------|----------|----------|----------|
| 1 | 1,400 | Data points at Therme Nord Bucuresti | 1.400 | Puncte de date la Therme Nord București |
| 2 | 6 | Air handling units served at Therme Nord Bucuresti | 6 | Centrale de tratare a aerului deservite la Therme Nord București |
| 3 | 4-18 EUR/sqm | Cost reference: the aggregated band, used as a proxy; pool zones sit at the top of it | 4-18 EUR/mp | Reper de cost: banda agregată, folosită ca proxy; zonele de bazin sunt în partea de sus |
| 4 | 290 kW | Legal automation threshold, exceeded through air treatment and water heating alone | 290 kW | Pragul legal de automatizare, depășit doar prin tratarea aerului și încălzirea apei |

**Features** (the six cards under "Capabilities" / "Capabilități"):

| # | Icon | Title EN | Description EN | Title RO | Description RO |
|---|------|----------|----------------|----------|----------------|
| 1 | Droplets | Control starts from humidity | The pool hall is controlled on relative humidity, with air temperature kept slightly above water temperature to limit evaporation. | Reglajul pornește de la umiditate | Sala de bazin se reglează pe umiditate relativă, cu temperatura aerului menținută ușor peste temperatura apei, pentru a limita evaporarea. |
| 2 | Wind | Dedicated air handling | A controlled ratio of fresh to recirculated air, dehumidification and heat recovery from the exhaust air, the component with the largest effect on the complex's thermal consumption. | Tratare a aerului dedicată | Raport reglat între aerul proaspăt și cel recirculat, dezumidificare și recuperare de căldură din aerul evacuat, componenta cu cel mai mare efect asupra consumului termic al complexului. |
| 3 | Gauge | Pressure balance | The pool hall is kept in slight underpressure against the dry zones, so humid air does not migrate into changing rooms, corridors and the structure. | Echilibru de presiuni | Sala de bazin se ține în ușoară depresiune față de zonele uscate, ca aerul umed să nu migreze în vestiare, în holuri și în structură. |
| 4 | Thermometer | Zones with their own regimes | Pools, saunas, relaxation areas, changing rooms, fitness and food zones, each with its own temperature and humidity. | Zone cu regim propriu | Bazine, saune, zone de relaxare, vestiare, fitness și alimentație, fiecare cu temperatura și umiditatea proprii. |
| 5 | Shield | Equipment for aggressive media | Sensors, actuators and panels chosen for warm, humid air loaded with water-treatment products; standard equipment fails within a few seasons. | Echipamente pentru mediu agresiv | Senzori, servomotoare și tablouri alese pentru aer cald, umed și încărcat cu produse de tratare a apei; un echipament standard cedează în câteva sezoane. |
| 6 | BarChart3 | Thermal energy monitored | The complex's dominant thermal consumption, the efficiency of the heat recovery units, and correlated data between water treatment and air treatment. | Energie termică monitorizată | Consumul termic dominant al complexului, eficiența recuperatoarelor de căldură și date corelate între tratarea apei și tratarea aerului. |

**Capabilities** (the checklist under "What we deliver" / "Ce livrăm"; `/expertiza` shows the first four):

| # | EN | RO |
|---|----|----|
| 1 | Relative humidity and temperature controlled in every pool hall | Umiditatea relativă și temperatura reglate în fiecare sală de bazin |
| 2 | Water temperature in every pool and operation of the water-treatment plant | Temperatura apei din fiecare bazin și funcționarea instalațiilor de tratare a apei |
| 3 | Differential pressures between zones, monitored to stop humid air migrating | Presiuni diferențiale între zone, monitorizate pentru a opri migrarea aerului umed |
| 4 | Operation and efficiency of the heat recovery units | Funcționarea și eficiența recuperatoarelor de căldură |
| 5 | Ventilation in changing rooms and shower areas, fitness hall with variable load | Ventilația în vestiare și în zonele de duș, sala de fitness cu sarcină variabilă |
| 6 | Phasing by plant, with redundancy secured: the pool hall is never left without ventilation | Fazare pe instalații, cu redundanță asigurată: sala de bazin nu rămâne fără ventilație |

**Project card** (the `testimonial` field; not rendered on the branch sector page, see B0):

- Name: Therme Nord București
- Role: Delivered project (EN) / Proiect livrat (RO)
- Company field: Balotești, Ilfov
- Text EN: "Automation and supervision at Therme Nord Bucuresti: 1,400 data points, 6 air handling units, zone-level humidity and temperature control, and commissioning without interrupting operation."
- Text RO: „Automatizare și supervizare la Therme Nord București: 1.400 de puncte de date, 6 centrale de tratare a aerului, control de umiditate și temperatură pe zone, punere în funcțiune fără întreruperea activității.”

**Related sectors:** HORECA (`horeca`), Healthcare (`medical`), Retail (`retail`).

### B11. Notes for the app (branch)

These notes apply `docs/guardrails.md`, version 1.3.

**Better than main, still not app data.** The branch drops the invented people, the guaranteed figures and the compliance claims listed above for main. What remains is still marketing copy: cost bands, densities, savings from studies, project sizes and legal thresholds with no dataset, method or edition behind them in the repo. None of it may become a value, default, range or benchmark in the app without an approved, versioned reference dataset (rule 1, section 2.1, section 10). Public facts about the named buildings are not evidence either (rule 1, "Model knowledge is not a source").

**Claims the app's guardrails would not allow.** Recorded so nobody copies them into app copy or AI output.

| Claim on the branch | Where | Guardrail |
|---------------------|-------|-----------|
| "Smoke control and evacuation stay with the fire alarm panel; the automation system receives the signal and switches plant according to the scenario, without taking over the safety function." | Entertainment, feature 6 ("Fire panel interface") | Rule 11: any action triggered by a fire alarm counts as life-safety control, whichever system it acts on. The fire system or a hardwired interlock carries out the reaction, and the BMS only shows fire mode. Only the building's ISU-approved fire-safety scenario and design, confirmed by a SOVITECH engineer, can set another arrangement. |
| "Car park ventilation driven by carbon monoxide measurement, and smoke extraction interfaced with the fire alarm panel, which keeps the safety function"; "Car park ventilation on CO measurement and interface with smoke control" | Retail, feature 5 and capability 4 | Rule 11, dual-use equipment: car-park fans used for CO ventilation and smoke extraction are life-safety equipment. Their normal-mode control may be proposed only with the fire-mode priority stated. |
| "car park ventilation runs on carbon monoxide measurement with automatic alarming"; "Car park ventilation driven by carbon monoxide measurement" | HORECA, feature 3 and capability 5 | Same as above, if the fans also serve smoke extraction. The copy does not say. |
| "The 2029 EU threshold that brings individual stores under the automation obligation"; "The 2029 EU threshold that brings most schools with central plant under the obligation"; "290 kW ... exceeded through air treatment and water heating alone" | Retail metric 4; Education metric 4; Sport & Wellness metric 4 | Rule 11: whether an obligation applies depends on facts such as the effective rated output, and stays Unknown until an engineer verifies them. Legal thresholds and dates come only from reference data with their date. |
| "Data for compliance ... a history that stands up to an auditor"; "IQ, OQ and PQ qualification"; "Audit trail" | Offices feature 6; Pharma | Rule 11: the app never attests compliance. The qualification and audit-trail wording describes processes, and the app may not turn it into a compliance claim. |
| "5-15% Measured savings on total building consumption after optimisation, with 1-3 year payback" | Offices metric 3 | Rules 9 and 10: savings and payback are always Estimated, with basis, method, range and a named baseline. |
| Cost bands per sector (3-8 to 30-80 EUR/sqm), "4-18 EUR/sqm ... used as a proxy", 90-320 EUR per point | Offices, Retail, HORECA, Industrial, Education, Pharma, Entertainment, Data centres, Sport & Wellness | Rules 1 and 10: benchmarks need an approved reference dataset. A proxy band borrowed from another building type is not a basis. |
| "PUE ... over a declared period"; "NIS2 — GEO 155/2024, in force for digital infrastructure operators" | Data centres metrics 2 and 3 | Rule 11 for the legal statement. PUE is a calculation that would need registered units and a formula in the app (rules 8 and 9). |

The first two rows are near misses for rule 11 wording. They are website copy, not app code or AI output, so this import adds no test case. Guardrail test cases live outside this file.

**Other observations.**
- **Images.** Eight sectors now use photos from `public/referinte/`: offices `bcr-calea-victoriei.jpg`, healthcare `spitalul-foisor.jpg`, retail `pitesti-retail-park.webp`, HORECA `radisson-blu-hotel.jpg`, industrial `ntn-snr-fabrica-de-rulmenti.jpg`, education `scoala-germana-bucuresti.jpg`, pharma `rompharm-company-otopeni.jpg`, Sport & Wellness `therme-nord-bucuresti.jpg`. `lib/sector-data.ts` still does not use the six `sector-*.jpg` files in `public/`. On the branch only `components/case-study-slider.tsx` uses one of them (`/sector-industrial-factory.jpg`, on the Rompharm slide).
- **Number formats.** The RO cost values use "EUR/mp", the EN values "EUR/sqm". The RO project sizes use the Romanian thousands separator ("26.300 m²"). Several EN strings drop diacritics from names ("Sfanta Maria", "Foisor", "Stefan cel Mare", "Moncler Bacau", "Monrol Eczacibasi").
- **Protocols named per sector.** Offices: Modbus and M-Bus for tenant meters. Retail: M-Bus or Modbus for unit meters. Data centres: Modbus and BACnet. No sector names a PMS, SCADA or MES product any more. HORECA says "hotel management system".
- **No text addressed to an AI** was found in these files.
