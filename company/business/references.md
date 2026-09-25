# Reference projects on the SOVITECH website

This file lists every reference project that the SOVITECH website shows, with its location, category, stated figures, scope, image and case-study link, in English and Romanian. It also records the portfolio statistics on the same page and the client names that appear elsewhere on the site. It was copied from the website repository at commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11).

Everything before section R describes `main`. Section R, at the end, records the unmerged branch `redesign-2026` (commit `af81353`, 2026-08-27): the page moved to `/referinte`, one project added, 20 project photos, and the percentages and named people removed. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. Section R is for reference only.

Sources (paths relative to the website repo root):
- `app/resurse/referinte/page.tsx`: the references page (`/resurse/referinte`), the full list of 25 projects.
- `components/references-marquee.tsx`: the homepage marquee, a subset of 8.
- `app/sectoare/[sector]/sector-client.tsx`, `lib/sector-data.ts`, `components/case-study-slider.tsx`: other client names.

## Status of this data

- **What the source says about itself.** A code comment in `app/resurse/referinte/page.tsx` reads: "Real Sovitech client portfolio (sourced from sovitech.ro/referinte). Sizes are public building-area figures verified via web search where available; entries without a confirmed public figure carry a qualitative description instead." I have not checked this claim, the project list or any figure.
- **Not engineering data.** Areas, room counts and bed counts here are marketing descriptions. Their area basis is often unstated (built area, floor area, leasable area or production floor). They are not verified engineering data and not an approved reference dataset.
- **Not usable as values.** The app may not use them as values, defaults, benchmarks or demo fixture inputs without an approved reference dataset (guardrails rule 1, section 2.1, section 10 and rule 13).
- **Model knowledge is not a source.** Public facts about a named building are not evidence for a project value (rule 1).
- **What is missing.** No entry states a year, a client or owner organisation distinct from the building name, the SAUTER products used, point counts or contract value. "Year: Not stated" below means the source has no year. The only system information is the short "scope" line.

## All projects at a glance

Source: `app/resurse/referinte/page.tsx` (`references`), `components/references-marquee.tsx`.

| # | Project | Category key | Location (RO / EN) | Figures stated | Year | Image | Case study | On homepage marquee |
|---|---------|--------------|--------------------|----------------|------|-------|------------|---------------------|
| 1 | Therme Nord București | `horeca` | București / Bucharest | ~34,000 m², "built area" (construiți) | Not stated | `/placeholder.svg` | `/resurse/studii-de-caz/therme-bucuresti` | Yes |
| 2 | Radisson Blu Hotel | `horeca` | București / Bucharest | 5 stars; over 1,800 m² of event space | Not stated | `/placeholder.svg` | `/resurse/studii-de-caz/radisson-bucuresti` | Yes |
| 3 | Novotel București | `horeca` | București / Bucharest | 258 rooms; ~15,900 m² "floor area" (suprafață) | Not stated | `/placeholder.svg` | None | No |
| 4 | Crowne Plaza București | `horeca` | București / Bucharest | 5 stars; 164 rooms | Not stated | `/placeholder.svg` | None | No |
| 5 | Athenee Palace Hilton București | `horeca` | București / Bucharest | 598 rooms | Not stated | `/placeholder.svg` | None | No |
| 6 | Floreasca Tower | `office` | București / Bucharest | class A; ~7,500 m² (no basis stated) | Not stated | `/placeholder.svg` | None | Yes |
| 7 | BCR Calea Victoriei | `office` | București / Bucharest | 26,300 m² (no basis stated; tower + podium) | Not stated | `/placeholder.svg` | None | Yes |
| 8 | Monaco Towers | `office` | București / Bucharest | 20,000 m² of office and retail space | Not stated | `/placeholder.svg` | None | No |
| 9 | Ștefan cel Mare Building | `office` | București / Bucharest | class A; 8,000 m² (no basis stated) | Not stated | `/placeholder.svg` | None | No |
| 10 | BMTI Strabag | `office` | București / Bucharest | 8,000 m² (no basis stated) | Not stated | `/placeholder.svg` | None | No |
| 11 | Spitalul Foișor | `medical` | București / Bucharest | 9,000 m² (no basis stated); 119 beds | Not stated | `/placeholder.svg` | None | Yes |
| 12 | Spitalul Sfânta Maria | `medical` | București / Bucharest | 303 beds | Not stated | `/placeholder.svg` | None | No |
| 13 | Spitalul Clinic de Chirurgie Plastică | `medical` | București / Bucharest | None | Not stated | `/placeholder.svg` | None | No |
| 14 | Moncler Bacău | `industrial` | Bacău / Bacau | 16,000 m² (no basis stated) | Not stated | `/placeholder.svg` | None | No |
| 15 | NTN-SNR Fabrica de Rulmenți | `industrial` | Sibiu | 37,000 m² of production floor | Not stated | `/placeholder.svg` | None | Yes |
| 16 | Rompharm Company | `industrial` | Otopeni | None | Not stated | `/placeholder.svg` | None | Yes |
| 17 | Rompharm Uzbekistan | `industrial` | Uzbekistan | None | Not stated | `/placeholder.svg` | None | No |
| 18 | Hyperion Pharma | `industrial` | România / Romania | None | Not stated | `/placeholder.svg` | None | No |
| 19 | Actavis | `industrial` | România / Romania | None | Not stated | `/placeholder.svg` | None | No |
| 20 | Monrol Eczacıbaşı | `industrial` | Pantelimon | None | Not stated | `/placeholder.svg` | None | No |
| 21 | Pitești Retail Park | `retail` | Pitești / Pitesti | ~24,800 m² "leasable area" (suprafață închiriabilă) | Not stated | `/placeholder.svg` | None | Yes |
| 22 | Roman Value Centre | `retail` | Roman | over 22,200 m² (no basis stated) | Not stated | `/placeholder.svg` | None | No |
| 23 | Școala Germană București | `civil` | București / Bucharest | 8,000 m² "built area" (construiți) | Not stated | `/placeholder.svg` | None | No |
| 24 | Lycée Français Anna de Noailles | `civil` | București / Bucharest | 13,500 m² "built area" (construiți) | Not stated | `/placeholder.svg` | None | No |
| 25 | Ambasada Canadei | `civil` | București / Bucharest | None | Not stated | `/placeholder.svg` | None | No |

- **Images.** No project sets its `image` field, so every card renders `/placeholder.svg`. The repo's `public/` folder has six files named `ref-floreasca-business.jpg`, `ref-liceu-francez.jpg`, `ref-radisson-blu.jpg`, `ref-rompharm.jpg`, `ref-scoala-germana.jpg` and `ref-therme-nord.jpg`. All six are the same file: an 11,265-byte grey placeholder graphic (PNG data despite the `.jpg` name, 1200 × 1200). Only `ref-radisson-blu.jpg` is used anywhere, as an illustration in the hotel article. No real project photos exist in the repo on `main`. The unmerged branch adds 20 (section R3).
- **Case studies.** Only Therme Nord București and Radisson Blu Hotel link to a case study, via a "Vezi studiul de caz" / "View Case Study" button. See `case-studies/`.

## Projects by category, full text

Source: `app/resurse/referinte/page.tsx`. Each category header shows "{count} proiecte" / "{count} projects".

### HORECA & Wellness / HORECA & Wellness (key `horeca`, 5 projects)

| # | Project | Description EN | Description RO | Scope EN | Scope RO |
|---|---------|----------------|----------------|----------|----------|
| 1 | Therme Nord București | Complete BMS system for the largest wellness complex in Europe, ~34,000 m² built area | Sistem BMS complet pentru cel mai mare complex de wellness din Europa, ~34.000 m² construiți | HVAC control, lighting, energy | Control HVAC, iluminat, energie |
| 2 | Radisson Blu Hotel | BMS automation for a 5-star hotel with over 1,800 m² of event space | Automatizare BMS pentru un hotel de 5 stele cu peste 1.800 m² spații de evenimente | BMS, temperature control, ventilation | BMS, control temperatură, ventilație |
| 3 | Novotel București | BMS system for a 258-room hotel, ~15,900 m² floor area | Sistem BMS pentru un hotel de 258 camere, ~15.900 m² suprafață | BMS, temperature control, ventilation | BMS, control temperatură, ventilație |
| 4 | Crowne Plaza București | BMS automation for a 5-star hotel with 164 rooms | Automatizare BMS pentru un hotel de 5 stele cu 164 camere | BMS, HVAC control, lighting | BMS, control HVAC, iluminat |
| 5 | Athenee Palace Hilton București | BMS system for a historic luxury hotel with 598 rooms | Sistem BMS pentru un hotel istoric de lux cu 598 camere | BMS, climate control, monitoring | BMS, control climatizare, monitorizare |

### Office Buildings / Birouri & Office (key `office`, 5 projects)

| # | Project | Description EN | Description RO | Scope EN | Scope RO |
|---|---------|----------------|----------------|----------|----------|
| 6 | Floreasca Tower | BMS system for a class-A office building, ~7,500 m² | Sistem BMS pentru o clădire de birouri clasa A, ~7.500 m² | Centralised control, energy reporting | Control centralizat, raportare energetică |
| 7 | BCR Calea Victoriei | BMS automation for a 26,300 m² office building (tower + podium) | Automatizare BMS pentru o clădire de birouri de 26.300 m² (turn + podium) | BMS, access control, lighting | BMS, control acces, iluminat |
| 8 | Monaco Towers | BMS system for a mixed-use complex with 20,000 m² of office and retail space | Sistem BMS pentru un complex mixt cu 20.000 m² spații de birouri și comerciale | Centralised control, energy monitoring | Control centralizat, monitorizare energetică |
| 9 | Ștefan cel Mare Building | BMS automation for a class-A office building, 8,000 m² | Automatizare BMS pentru o clădire de birouri clasa A, 8.000 m² | BMS, HVAC control, lighting | BMS, control HVAC, iluminat |
| 10 | BMTI Strabag | BMS system for Strabag's first office building in Bucharest, 8,000 m² | Sistem BMS pentru prima clădire de birouri Strabag din București, 8.000 m² | Centralised control, energy reporting | Control centralizat, raportare energetică |

### Medical & Pharma / Medical & Farma (key `medical`, 3 projects)

| # | Project | Description EN | Description RO | Scope EN | Scope RO |
|---|---------|----------------|----------------|----------|----------|
| 11 | Spitalul Foișor | BMS system for the new orthopaedic hospital, 9,000 m², 119 beds | Sistem BMS pentru noul spital de ortopedie, 9.000 m², 119 paturi | Medical BMS, critical systems backup | BMS medical, backup sisteme critice |
| 12 | Spitalul Sfânta Maria | BMS automation for a clinical hospital with 303 beds | Automatizare BMS pentru un spital clinic cu 303 paturi | Medical BMS, climate control | BMS medical, control climatizare |
| 13 | Spitalul Clinic de Chirurgie Plastică | BMS system for a clinical plastic surgery and burns hospital | Sistem BMS pentru un spital clinic de chirurgie plastică și arsuri | Medical BMS, climate control, monitoring | BMS medical, control climatizare, monitorizare |

### Industrial & Logistics / Industrial & Logistică (key `industrial`, 7 projects)

| # | Project | Description EN | Description RO | Scope EN | Scope RO |
|---|---------|----------------|----------------|----------|----------|
| 14 | Moncler Bacău | BMS automation for a luxury apparel factory, 16,000 m² | Automatizare BMS pentru o fabrică de îmbrăcăminte de lux, 16.000 m² | Ventilation control, industrial lighting | Control ventilație, iluminat industrial |
| 15 | NTN-SNR Fabrica de Rulmenți | BMS system for a bearing factory with 37,000 m² of production floor | Sistem BMS pentru o fabrică de rulmenți cu 37.000 m² suprafață de producție | Temperature control, industrial ventilation | Control temperatură, ventilație industrială |
| 16 | Rompharm Company | BMS system for a pharmaceutical factory with strict quality requirements | Sistem BMS pentru o fabrică farmaceutică cu cerințe stricte de calitate | Temperature, humidity, pressure control | Control temperatură, umiditate, presiune |
| 17 | Rompharm Uzbekistan | International expansion of Rompharm's BMS automation to a new pharmaceutical factory | Extinderea internațională a automatizării BMS Rompharm către o nouă fabrică farmaceutică | Temperature, humidity, pressure control | Control temperatură, umiditate, presiune |
| 18 | Hyperion Pharma | BMS system for a pharmaceutical production facility | Sistem BMS pentru o unitate de producție farmaceutică | Temperature control, filtration, monitoring | Control temperatură, filtrare, monitorizare |
| 19 | Actavis | BMS automation for a generic pharmaceuticals factory | Automatizare BMS pentru o fabrică de medicamente generice | Temperature, humidity, monitoring | Control temperatură, umiditate, monitorizare |
| 20 | Monrol Eczacıbaşı | BMS system for a radiopharmaceutical production facility | Sistem BMS pentru o unitate de producție de produse radiofarmaceutice | Pressure control, filtration, monitoring | Control presiune, filtrare, monitorizare |

### Retail & Shopping / Retail & Shopping (key `retail`, 2 projects)

| # | Project | Description EN | Description RO | Scope EN | Scope RO |
|---|---------|----------------|----------------|----------|----------|
| 21 | Pitești Retail Park | BMS system for a retail park with ~24,800 m² of leasable area | Sistem BMS pentru un parc de retail cu ~24.800 m² suprafață închiriabilă | HVAC control, lighting, energy | Control HVAC, iluminat, energie |
| 22 | Roman Value Centre | BMS automation for a shopping centre of over 22,200 m² | Automatizare BMS pentru un centru comercial de peste 22.200 m² | Centralised BMS, energy monitoring | BMS centralizat, monitorizare energetică |

### Education & Institutions / Educație & Instituții (key `civil`, 3 projects)

| # | Project | Description EN | Description RO | Scope EN | Scope RO |
|---|---------|----------------|----------------|----------|----------|
| 23 | Școala Germană București | BMS system for the new German School campus, 8,000 m² built area | Sistem BMS pentru noul campus al Școlii Germane, 8.000 m² construiți | HVAC control, ventilation, monitoring | Control HVAC, ventilație, monitorizare |
| 24 | Lycée Français Anna de Noailles | BMS automation for the French lycée campus, 13,500 m² built area | Automatizare BMS pentru campusul liceului francez, 13.500 m² construiți | BMS, climate control, monitoring | BMS, control climatizare, monitorizare |
| 25 | Ambasada Canadei | BMS system for the Canadian Embassy chancery building | Sistem BMS pentru clădirea cancelariei Ambasadei Canadei | BMS, access control, climate control | BMS, control acces, climatizare |


## Category labels and colours

Source: `app/resurse/referinte/page.tsx` (`categoryMeta`).

| Key | Label RO | Label EN | Colour | Text on colour |
|-----|----------|----------|--------|----------------|
| `horeca` | HORECA & Wellness | HORECA & Wellness | `#8B7B5C` | `#ffffff` |
| `office` | Birouri & Office | Office Buildings | `#C5C0F5` | `#0D2E2B` |
| `medical` | Medical & Farma | Medical & Pharma | `#C8E6C9` | `#0D2E2B` |
| `industrial` | Industrial & Logistică | Industrial & Logistics | `#0D2E2B` | `#ffffff` |
| `retail` | Retail & Shopping | Retail & Shopping | `#5C5FD4` | `#ffffff` |
| `civil` | Educație & Instituții | Education & Institutions | `#A8C5D4` | `#0D2E2B` |

- **Key clash.** The key `civil` means "Educație & Instituții" here. In `lib/sector-data.ts`, the slug `civil` is the Offices sector ("Birouri"), and offices use the key `office` here.
- **Category mix-ups.** "Industrial & Logistică" holds five pharmaceutical sites (Rompharm Company, Rompharm Uzbekistan, Hyperion Pharma, Actavis, Monrol Eczacıbaşı) next to two factories. "Medical & Farma" holds only hospitals.

## Portfolio statistics on the references page

Source: `app/resurse/referinte/page.tsx` (`impactMetrics`, `aggregates`, `trustStats`). These are marketing claims with no stated basis, period or method. The app may not use them (rule 1, rule 9, rule 10).

**Impact metrics.** Section label "• Impact", H2 "Impact măsurabil" / "Measurable impact".

| Value | Label RO | Label EN | Caption RO | Caption EN |
|-------|----------|----------|------------|------------|
| 35% | Reducere a costurilor operaționale | Reduction in operational costs | Medie la nivelul clienților noștri | Average across our clients |
| 42% | Economii de energie | Energy savings | Obținute prin sistemele BMS | Achieved through BMS systems |
| 28% | Reducere CO₂ | CO₂ reduction | Emisii reduse anual | Emissions reduced annually |
| 15% | Creștere a valorii proprietății | Increase in property value | Prin implementarea BMS | Through BMS implementation |

**Aggregates.**

| Value | Label RO | Label EN |
|-------|----------|----------|
| 30+ | Proiecte finalizate | Completed projects |
| 92% | Clienți din recomandări | Clients from referrals |
| 15+ | Ani de experiență | Years of experience |

**Trust section.** Label "• Încredere" / "• Trust", H2 "Creștere prin încredere" / "Growth through trust".

| Value | Label RO | Label EN |
|-------|----------|----------|
| 98% | Satisfacția clienților | Client Satisfaction |
| 24/7 | Suport tehnic | Technical Support |
| 30+ | Proiecte finalizate | Projects Completed |

## Page copy

Source: `app/resurse/referinte/page.tsx`.

| Element | RO | EN |
|---------|----|----|
| Eyebrow | • Portofoliu | • Portfolio |
| H1 | Referințele noastre / — cartea noastră de vizită. | Our references / — our calling card. |
| Sub | Proiectele pe care le-am livrat de-a lungul anilor sunt cea mai bună dovadă a încrederii pe care clienții noștri au acordat-o. | The projects we have delivered over the years are the best testament to the trust our clients have placed in us. |
| Projects label and H2 | • Proiecte; Proiecte finalizate | • Projects; Completed projects |
| Trust paragraph | Numărul tot mai mare de clienți noi care ajung la noi prin recomandări confirmă calitatea serviciilor noastre. Colaborarea strânsă cu fiecare client și rezultatele măsurabile ne-au făcut partenerul de încredere pentru automatizarea BMS în România. | The growing number of new clients who reach us through referrals confirms the quality of our services. Close collaboration with every client and measurable results have made us the trusted partner for BMS automation in Romania. |
| CTA label and H2 | • Proiect nou; Ai în minte un proiect de automatizare? | • New project; Do you have an automation project in mind? |
| CTA sub | Specialiștii noștri sunt disponibili pentru consultanță și pot oferi soluții personalizate. | Our specialists are available for consultations and can offer tailored solutions. |
| CTA buttons | Cere o ofertă personalizată (→ `/contact`); Explorează serviciile noastre (→ `/servicii`) | Request a personalised quote; Explore our services |

## Homepage marquee

Source: `components/references-marquee.tsx`. Label "• Referințe" / "• References", H2 "Proiecte de referință" / "Reference projects", link "Vezi toate referințele" / "View all references" (→ `/resurse/referinte`). The cards repeat the references-page text, with one difference. Rompharm Company reads "Sistem BMS pentru o fabrică farmaceutică cu cerințe stricte" / "BMS system for a pharmaceutical factory with strict requirements", where the references page adds "de calitate" / "quality".

| # | Project | Category dot colour |
|---|---------|---------------------|
| 1 | Therme Nord București | `#8B7B5C` |
| 2 | Floreasca Tower | `#C5C0F5` |
| 3 | Rompharm Company | `#C8E6C9` |
| 4 | NTN-SNR Fabrica de Rulmenți | `#0D2E2B` |
| 5 | Radisson Blu Hotel | `#8B7B5C` |
| 6 | Spitalul Foișor | `#C8E6C9` |
| 7 | Pitești Retail Park | `#5C5FD4` |
| 8 | BCR Calea Victoriei | `#C5C0F5` |

## Client names that appear elsewhere on the site

These names are shown as clients, quotes or "trusted by" logos, but are not in the references list. The source gives no evidence that they are SOVITECH clients.

| Name | Where | What is claimed |
|------|-------|-----------------|
| Globalworth, NEPI Rockcastle, One United Properties, Iulius Group, Palas Campus | `app/sectoare/[sector]/sector-client.tsx`, "De încredere pentru" / "Trusted by" strip on every sector page | Names only |
| Bucharest Business Park | `lib/sector-data.ts`, Offices testimonial | Three office buildings, 34% lower electricity bill |
| Antibiotice Iași | `lib/sector-data.ts`, Medical testimonial | Cleanroom monitoring, FDA audit with zero findings |
| Cora Romania | `lib/sector-data.ts`, Retail testimonial | 14 hypermarkets, 31% lower energy spend |
| Ursus Breweries Cluj | `lib/sector-data.ts`, Industrial testimonial | Payback in 14 months |
| Politehnica University of Bucharest | `lib/sector-data.ts`, Educational testimonial | CO2 down 40%, energy bill down 27% |
| Floreasca Business Park (45,000 m²) and Mega Mall (80,000 m²) | `components/aethel-testimonials.tsx`, the homepage customer spotlight (recorded in [company-profile.md, section 9 Testimonials](company-profile.md#9-testimonials), table 9.1) | Quotes without a named person |

"Floreasca Business Park, 45,000 m²" in `components/aethel-testimonials.tsx` and "Floreasca Tower, ~7,500 m²" on the references page may or may not be the same site. The source does not say.

## Quotes attached to reference projects

Source: `components/case-study-slider.tsx` (homepage slider: label "• Studii de caz" / "• Case studies", H2 "Povești de succes" / "Success stories", link "Toate studiile de caz" / "All case studies" → `/resurse/referinte`, button "Citește studiul de caz complet" / "Read the full case study"; 3 slides). The Therme and Radisson slides are recorded in `case-studies/`. The third slide is:

| Field | RO | EN |
|-------|----|----|
| Client | Rompharm Company | Rompharm Company |
| Person | Andrei Vasile, Director Operatiuni | Andrei Vasile, Director Operatiuni (not translated in the source) |
| Industry | Farmaceutic | Pharmaceutical |
| Quote | În industria farmaceutică, precizia este esențială. Sistemul Sovitech asigură condiții optime de temperatură și umiditate, cu raportare completă conform GMP. | In the pharmaceutical industry, precision is essential. The Sovitech system ensures optimal temperature and humidity conditions, with full GMP-compliant reporting. |
| Stats | 99.9% Disponibilitate sistem; ±0.5°C Precizie temperatura; GMP Conformitate | 99.9% System uptime; ±0.5°C Temperature precision; GMP Compliance |
| Image | `/sector-industrial-factory.jpg` | same |
| Link | `/resurse/studii-de-caz/therme-bucuresti` | same |

- The link points to the Therme case study. There is no Rompharm case study page.
- `app/servicii/page.tsx` and `components/aethel-testimonials.tsx` quote a different person for Rompharm, "Dan Georgescu", "Director Operatiuni" / "Director Operațiuni" / "Operations Director" (recorded in [company-profile.md, section 9 Testimonials](company-profile.md#9-testimonials)).
- "GMP-compliant reporting" is a compliance claim. The app never attests compliance (rule 11).
- The repo gives no evidence that either person exists or said this.

## Contradictions with other pages

| Topic | This page | Elsewhere |
|-------|-----------|-----------|
| Number of projects | "30+" completed projects | "150+" / "over 150" BMS projects analysed (`app/resurse/articole/eficienta-bms/page.tsx`, `app/resurse/page.tsx`) |
| Years of experience | "15+" years | "the last 15 years", but the method covers 2015-2024 (`app/resurse/articole/eficienta-bms/page.tsx`) |
| Therme area | ~34,000 m² built area | 8,000 m² "area implemented" (`app/resurse/studii-de-caz/therme-bucuresti/page.tsx`); 30,000 m² (`app/ghid-bms/case-studies/page.tsx`) |
| Therme name | "Therme Nord București" | "Therme București" / "Therme Bucharest" everywhere else |
| Radisson Blu size | "over 1,800 m² of event space" | "12 conference halls (one of 540 m² for 500 people)" and 424 rooms (case study); 428 rooms (`app/ghid-bms/case-studies/page.tsx`, `app/ghid-bms/resurse/page.tsx`, `components/aethel-testimonials.tsx`) |
| Average savings | 35% operating cost, 42% energy, 28% CO₂ | Sector pages give 20–40% ranges. The efficiency article gives 28–42% by sector. |

---

## R. Branch `redesign-2026` (unmerged): references

**Status. Read this first.**
- **Source.** Branch `origin/redesign-2026` of the same repository, at commit `af81353` (2026-08-27). The reference changes and the photos come from commit `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala"). Paths are relative to the repository root on that branch. Imported on 2026-09-24.
- **Not merged, and will not be merged.** The branch is not merged into `main`. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. This section is for reference only. Everything above this section describes `main`, the current website. Nothing here replaces it.
- **Same status as main's data.** Areas, room and bed counts, point counts and portfolio statistics are marketing descriptions, not verified engineering data and not an approved reference dataset. The app may not use them as values, defaults, benchmarks or demo inputs (guardrails rule 1, section 2.1, section 10, rule 13). The code comment calling the portfolio "Real Sovitech client portfolio (sourced from sovitech.ro/referinte)" is unchanged, and I have not checked it.

**Sources on the branch.**
- `app/referinte/page.tsx`: the references page, moved from `app/resurse/referinte/page.tsx`. Route `/referinte`. `next.config.mjs` redirects `/resurse/referinte` to it ("References promoted to a top-level URL").
- `public/referinte/`: 20 new project photos (section R3).
- `components/references-marquee.tsx`: the homepage marquee.
- For the places that quote projects: `components/aethel-testimonials.tsx` (the spotlight component) and `components/case-study-slider.tsx` (the slider component), which no branch page renders (R6), `app/expertiza/[sector]/sector-client.tsx` (the "Trusted by" strip) and `lib/sector-data.ts` (sector project cards, see `sectors.md`, section B).

### R1. What changed against main

- **One project added.** Floreasca Business Park, under offices. The branch lists 26 projects. The other 25 keep main's text word for word. Nineteen of them gain an `image` field (the twentieth photo is for Floreasca Business Park). Therme Nord București and Radisson Blu Hotel also lose their `caseStudy` field (next bullet). The six listed below as placeholders are otherwise unchanged.
- **Case-study buttons removed.** On main, Therme Nord București and Radisson Blu Hotel had a "Vezi studiul de caz" / "View Case Study" button. On the branch no project sets `caseStudy`, so no card links to a case study. The button code is still there.
- **Photos.** 20 projects now show a photo from `public/referinte/`. Six still render `/placeholder.svg`: BMTI Strabag, Spitalul Sfânta Maria, Spitalul Clinic de Chirurgie Plastică, Hyperion Pharma, Actavis, Monrol Eczacıbaşı. On main, every card rendered the placeholder.
- **Impact percentages removed.** Main's "Impact măsurabil" tiles (35% operating costs, 42% energy savings, 28% CO₂, 15% property value) are gone. The source comment explains: "Doc 12 rule: a savings percentage is published only with full measurement methodology (12-month baseline, normalisation, declared domain). None of the legacy tiles had one, so the section now describes the verifiable technical scope of flagship projects instead — points, equipment, protocols." Four scope cards replace them (R4).
- **Statistics changed.** "92% Clienți din recomandări" becomes "8 Sectoare deservite". "98% Satisfacția clienților" becomes "SAUTER Partener autorizat". "30+ Proiecte finalizate" (twice), "15+ Ani de experiență" and "24/7 Suport tehnic" stay (R5).
- **H1.** Main "Referințele noastre / — cartea noastră de vizită." becomes RO "Referințele noastre / sunt cartea noastră de vizită.", EN "Our references / are our calling card.".
- **Unchanged.** The sub-heading, the "Proiecte finalizate" heading, the category labels and colours (including the `civil` key clash), the trust paragraph and the closing call to action keep main's text.
- **Marquee.** The same eight projects, now shown as a photo, the name and the location. The description and scope lines are no longer rendered. Each card links to `/referinte`.
- **Named people and unlisted clients are gone.** No branch file under `app/`, `components/` or `lib/` mentions any of these any more: Globalworth, NEPI Rockcastle, One United Properties, Iulius Group, Palas Campus, Bucharest Business Park, Antibiotice Iași, Cora Romania, Ursus Breweries Cluj, Politehnica University of Bucharest, Mega Mall, or the people Andrei Vasile, Dan Georgescu, Maria Popescu, Alexandru Ionescu, Ion Popescu, Maria Ionescu, Radu Georgescu and Andrei Popescu. The "Client names that appear elsewhere" table above is main only.

### R2. The 26 projects on the branch, with their photos

Text, figures, categories and locations are as in "All projects at a glance" above, except for Floreasca Business Park (row 7 below), which main does not have. "Marquee" means the homepage marquee. "Sector image" means the sector page that uses the same photo.

| # | Project | Category key | Photo (`public/referinte/`) | Marquee | Sector image | Change against main |
|---|---------|--------------|-----------------------------|---------|--------------|---------------------|
| 1 | Therme Nord București | `horeca` | `therme-nord-bucuresti.jpg` | Yes | Sport & Wellness | Photo added; case-study button removed |
| 2 | Radisson Blu Hotel | `horeca` | `radisson-blu-hotel.jpg` | Yes | HORECA | Photo added; case-study button removed |
| 3 | Novotel București | `horeca` | `novotel-bucuresti.jpg` | No | None | Photo added |
| 4 | Crowne Plaza București | `horeca` | `crowne-plaza-bucuresti.jpg` | No | None | Photo added |
| 5 | Athenee Palace Hilton București | `horeca` | `athenee-palace-hilton-bucuresti.jpg` | No | None | Photo added |
| 6 | Floreasca Tower | `office` | `floreasca-tower.jpg` | Yes | None | Photo added |
| 7 | Floreasca Business Park | `office` | `floreasca-business-park.jpg` | No | None | New project (see below) |
| 8 | BCR Calea Victoriei | `office` | `bcr-calea-victoriei.jpg` | Yes | Offices | Photo added |
| 9 | Monaco Towers | `office` | `monaco-towers.jpg` | No | None | Photo added |
| 10 | Ștefan cel Mare Building | `office` | `stefan-cel-mare-building.jpg` | No | None | Photo added |
| 11 | BMTI Strabag | `office` | None (placeholder) | No | None | None |
| 12 | Spitalul Foișor | `medical` | `spitalul-foisor.jpg` | Yes | Healthcare | Photo added |
| 13 | Spitalul Sfânta Maria | `medical` | None (placeholder) | No | None | None |
| 14 | Spitalul Clinic de Chirurgie Plastică | `medical` | None (placeholder) | No | None | None |
| 15 | Moncler Bacău | `industrial` | `moncler-bacau.jpg` | No | None | Photo added |
| 16 | NTN-SNR Fabrica de Rulmenți | `industrial` | `ntn-snr-fabrica-de-rulmenti.jpg` | Yes | Industrial & Logistics | Photo added |
| 17 | Rompharm Company | `industrial` | `rompharm-company-otopeni.jpg` | Yes | Pharma | Photo added |
| 18 | Rompharm Uzbekistan | `industrial` | `rompharm-uzbekistan.jpg` | No | None | Photo added |
| 19 | Hyperion Pharma | `industrial` | None (placeholder) | No | None | None |
| 20 | Actavis | `industrial` | None (placeholder) | No | None | None |
| 21 | Monrol Eczacıbaşı | `industrial` | None (placeholder) | No | None | None |
| 22 | Pitești Retail Park | `retail` | `pitesti-retail-park.webp` | Yes | Retail | Photo added |
| 23 | Roman Value Centre | `retail` | `roman-value-centre.jpg` | No | None | Photo added |
| 24 | Școala Germană București | `civil` | `scoala-germana-bucuresti.jpg` | No | Education & Institutions | Photo added |
| 25 | Lycée Français Anna de Noailles | `civil` | `lycee-francais-anna-de-noailles.jpg` | No | None | Photo added |
| 26 | Ambasada Canadei | `civil` | `ambasada-canadei.jpg` | No | None | Photo added |

Category counts on the branch: HORECA & Wellness 5, Birouri & Office 6, Medical & Farma 3, Industrial & Logistică 7, Retail & Shopping 2, Educație & Instituții 3.

**The new project, verbatim.**

| Field | RO | EN |
|-------|----|----|
| Name | Floreasca Business Park | Floreasca Business Park |
| Location | București | Bucharest |
| Description | Sistem BMS pentru un complex de birouri clasa A cu două turnuri | BMS system for a class-A office complex with two towers |
| Scope | Control centralizat, monitorizare energetică | Centralised control, energy monitoring |
| Figures | None stated | None stated |
| Year | Not stated | Not stated |

On main, "Floreasca Business Park (45,000 m²)" appeared only in the homepage spotlight, with a quote about "class-A energy certification". On the branch the spotlight component, which no branch page renders, describes it as "Două turnuri clasa A" with no area (R6). The branch keeps Floreasca Tower (~7,500 m²) as a separate project. The source does not say how the two relate.

### R3. The photos in `public/referinte/`

All 20 files were added in commit `d2d15d2`. Each is mapped to its project by the `image` field in `app/referinte/page.tsx`. The file name matches the project in every case. The brand import has copied all 20 files, with the same names, to [`../brand/imagery/reference-projects/`](../brand/imagery/reference-projects/). On 2026-09-24 each copy was byte-identical to the branch file. That folder belongs to the brand import.

| Photo | Project | Bytes | Pixels | Format | What it shows (my look at a contact sheet; not verified) |
|-------|---------|-------|--------|--------|----------------------------------------------------------|
| `ambasada-canadei.jpg` | Ambasada Canadei | 153,079 | 941 × 519 | JPEG | Modern green-glazed building, street view |
| `athenee-palace-hilton-bucuresti.jpg` | Athenee Palace Hilton București | 110,511 | 1024 × 611 | JPEG | Historic hotel at dusk, with the hotel's name sign |
| `bcr-calea-victoriei.jpg` | BCR Calea Victoriei | 47,376 | 600 × 399 | JPEG | Glass office block with a tower behind |
| `crowne-plaza-bucuresti.jpg` | Crowne Plaza București | 205,654 | 1353 × 761 | JPEG | Hotel at night, "Crowne Plaza" sign |
| `floreasca-business-park.jpg` | Floreasca Business Park | 155,840 | 900 × 636 | JPEG | Office towers at night, "169" and "ERGO" signs |
| `floreasca-tower.jpg` | Floreasca Tower | 54,848 | 600 × 397 | JPEG | Office tower, street view |
| `lycee-francais-anna-de-noailles.jpg` | Lycée Français Anna de Noailles | 351,846 | 1000 × 521 | JPEG | White school building with a glazed entrance |
| `monaco-towers.jpg` | Monaco Towers | 212,061 | 960 × 350 | JPEG | Aerial view of two towers in a city district |
| `moncler-bacau.jpg` | Moncler Bacău | 253,293 | 1193 × 634 | JPEG | Low industrial building with a dark facade |
| `novotel-bucuresti.jpg` | Novotel București | 207,369 | 1142 × 855 | JPEG | Classical facade at night, "Novotel" sign |
| `ntn-snr-fabrica-de-rulmenti.jpg` | NTN-SNR Fabrica de Rulmenți | 36,488 | 640 × 360 | JPEG | Factory hall, "NTN-SNR" sign |
| `pitesti-retail-park.webp` | Pitești Retail Park | 70,488 | 680 × 510 | WebP | Retail park frontage with store signs, including "eMAG" |
| `radisson-blu-hotel.jpg` | Radisson Blu Hotel | 461,270 | 800 × 600 | JPEG | Hotel entrance and tower, signs reading "Radisson SAS" and "Radisson SAS Hotel" |
| `roman-value-centre.jpg` | Roman Value Centre | 710,584 | 1920 × 1080 | JPEG | Shopping centre with "Roman Value Centre" sign; may be a rendering |
| `rompharm-company-otopeni.jpg` | Rompharm Company | 21,908 | 325 × 203 | JPEG | Office and plant building, "Rompharm" sign |
| `rompharm-uzbekistan.jpg` | Rompharm Uzbekistan | 103,701 | 1280 × 960 | JPEG | Plain industrial building with a "Rompharm" sign on the roof |
| `scoala-germana-bucuresti.jpg` | Școala Germană București | 319,308 | 1422 × 800 | JPEG | Aerial view of a campus; appears to be an architectural rendering |
| `spitalul-foisor.jpg` | Spitalul Foișor | 452,522 | 1500 × 1000 | JPEG | Multi-storey hospital building, street view |
| `stefan-cel-mare-building.jpg` | Ștefan cel Mare Building | 137,641 | 672 × 1000 | JPEG | Office building with a name sign (portrait format) |
| `therme-nord-bucuresti.jpg` | Therme Nord București | 450,681 | 800 × 584 | JPEG | Glass dome and outdoor pools at night |

**What the files do not say.**
- The repo gives no source, photographer or licence for any photo. Apart from embedded file metadata, it gives no date.
- Nine files carry a "CREATOR: gd-jpeg" comment, which web tools write when they resize an image: `ambasada-canadei`, `bcr-calea-victoriei`, `crowne-plaza-bucuresti`, `floreasca-business-park`, `floreasca-tower`, `lycee-francais-anna-de-noailles`, `novotel-bucuresti`, `ntn-snr-fabrica-de-rulmenti`, `stefan-cel-mare-building`. `crowne-plaza-bucuresti.jpg` and `novotel-bucuresti.jpg` also carry Windows Photo Editor metadata dated 2019-06-04. `monaco-towers.jpg` carries NIKON camera metadata. The brand import records the embedded metadata of each photo ([`../brand/imagery/README.md`](../brand/imagery/README.md)).
- Many photos show third-party names and logos (Hilton, Crowne Plaza, Novotel, Radisson SAS, NTN-SNR, eMAG, ERGO, Rompharm).
- `radisson-blu-hotel.jpg` shows "Radisson SAS" signage, the hotel brand's earlier name. The photo therefore probably predates the "Radisson Blu" name used everywhere on the site. That is an inference from the signage.

The `ref-*.jpg` placeholder files that main has in `public/` (see above) are still in the branch's `public/` folder, and the branch's hotel article still uses `ref-radisson-blu.jpg`. That article belongs to the articles import.

### R4. Scope cards (replacing the impact percentages)

Section label "• Anvergura lucrărilor" / "• Scope of work". H2 "Lucrări livrate, verificabile" / "Delivered, verifiable work". Source: `app/referinte/page.tsx`, `scopeCards`.

| Project | Description RO | Description EN | Facts RO | Facts EN |
|---------|----------------|----------------|----------|----------|
| Therme Nord București | Automatizare și supervizare pentru instalațiile de tratare a aerului, sistemul de piscine și centrala termică. | Automation and supervision for the air-handling plant, the pool systems and the heating plant. | 1.400 de puncte de date · 6 centrale de tratare a aerului · control umiditate și temperatură pe zone · integrare cu contorizarea de energie · punere în funcțiune fără întreruperea activității | 1,400 data points · 6 air handling units · zone-level humidity and temperature control · integration with energy metering · commissioning without interrupting operation |
| Rompharm Company | Monitorizarea parametrilor critici pentru zone de producție și depozitare farmaceutică. | Critical-parameter monitoring for pharmaceutical production and storage areas. | Monitorizare continuă temperatură, umiditate și diferențe de presiune · alarmare pe praguri · istoricizare cu pistă de audit · documentație pentru calificare | Continuous temperature, humidity and differential-pressure monitoring · threshold alarming · historisation with audit trail · qualification documentation |
| Spitalul Foișor | Sistem BMS pentru noul spital de ortopedie, cu backup pentru sistemele critice. | BMS for the new orthopaedic hospital, with backup for critical systems. | 9.000 m² · 119 paturi · execuție etapizată într-o clădire medicală · supraveghere centralizată a instalațiilor | 9,000 m² · 119 beds · phased execution in a healthcare building · centralised plant supervision |
| NTN-SNR Sibiu | Sistem BMS pentru o fabrică de rulmenți cu 37.000 m² suprafață de producție. | BMS for a bearing factory with 37,000 m² of production floor. | Control temperatură pe hale · ventilație industrială · monitorizare pe zone de producție | Hall-level temperature control · industrial ventilation · monitoring per production zone |

The 1,400 data points and 6 air handling units for Therme are new on the branch. Main states no point count or AHU count for Therme anywhere.

### R5. Statistics on the branch references page

Marketing claims with no stated basis, period or method. The app may not use them (rules 1, 9 and 10).

| Block | Value | Label RO | Label EN | Against main |
|-------|-------|----------|----------|--------------|
| Aggregates | 30+ | Proiecte finalizate | Completed projects | Unchanged |
| Aggregates | 8 | Sectoare deservite | Sectors served | Replaces "92% Clienți din recomandări" |
| Aggregates | 15+ | Ani de experiență | Years of experience | Unchanged |
| Trust | SAUTER | Partener autorizat | Authorised partner | Replaces "98% Satisfacția clienților" |
| Trust | 24/7 | Suport tehnic | Technical Support | Unchanged |
| Trust | 30+ | Proiecte finalizate | Projects Completed | Unchanged |

### R6. Other places that quote projects, on the branch

On the branch, `app/page.tsx` imports neither the spotlight nor the slider component, and no other file imports them, so the text below is in the code but not on the site ([company-profile.md, section 9](company-profile.md#9-testimonials), says the same).

**Spotlight component** (`components/aethel-testimonials.tsx`, no longer rendered on any branch page). On main it was the homepage spotlight and held named quotes (recorded in [company-profile.md, section 9](company-profile.md#9-testimonials)). On the branch every quote is replaced by a scope description, and no person is named.

| Card | Branch text RO | Branch text EN | Branch details RO / EN | Main card (for comparison) |
|------|----------------|----------------|------------------------|----------------------------|
| Therme Bucharest | Automatizare și supervizare pentru instalațiile de tratare a aerului, sistemul de piscine și centrala termică, livrate fără întreruperea activității complexului. | Automation and supervision for the air-handling plant, the pool systems and the heating plant, delivered without interrupting the complex's operation. | Anvergură / Scale: 1.400 puncte de date / 1,400 data points; Echipamente / Equipment: 6 centrale de tratare a aerului / 6 air handling units | Alexandru Ionescu; −38% energy costs; ROI in under 2 years |
| Floreasca Business Park | Sistem BMS pentru un complex de birouri clasa A cu două turnuri, cu control centralizat și monitorizare energetică. | BMS for a class-A two-tower office complex, with centralised control and energy monitoring. | Configurație / Configuration: Două turnuri clasa A / Two class-A towers; Scop / Scope: Control centralizat, energie / Centralised control, energy | 45,000 m²; "Clasa A" certification |
| Rompharm | Monitorizarea parametrilor critici pentru zone de producție și depozitare farmaceutică, cu istoricizare și pistă de audit. | Critical-parameter monitoring for pharmaceutical production and storage areas, with historisation and an audit trail. | Parametri / Parameters: Temperatură, umiditate, presiune / Temperature, humidity, pressure; Livrabil / Deliverable: Documentație pentru calificare / Qualification documentation | Dan Georgescu; "0 avarii neplanificate" |
| Pitești Retail Park | Sistem BMS pentru un parc de retail cu ~24.800 m² suprafață închiriabilă: control HVAC, iluminat și monitorizare energetică. | BMS for a retail park with ~24,800 m² of leasable area: HVAC control, lighting and energy monitoring. | Suprafață / Area: ~24.800 m² închiriabili / ~24,800 m² leasable; Sistem / System: HVAC, iluminat, energie / HVAC, lighting, energy | Mega Mall, 80,000 m² |
| Radisson Blu | Automatizare BMS pentru un hotel de 5 stele cu peste 1.800 m² spații de evenimente: control temperatură, ventilație și supraveghere centralizată. | BMS automation for a 5-star hotel with over 1,800 m² of event space: temperature control, ventilation and centralised supervision. | Amploare / Scale: 424 camere / 424 rooms; Scop / Scope: BMS, temperatură, ventilație / BMS, temperature, ventilation | Maria Popescu; 428 rooms |

Only the Therme and Radisson cards link to their case studies. Each card also shows its sector ("Sector").

**Slider component** (`components/case-study-slider.tsx`, no longer rendered on any branch page). The three slides keep their projects, but no person is named any more. The client line reads "Studiu de caz" / "Proiect livrat" for Therme and Radisson, and "Proiect livrat" / "Monitorizare farmaceutică" for Rompharm. The Therme and Radisson slides are in `case-studies/`. The Rompharm slide keeps main's quote and stats (99.9% "Disponibilitate sistem", ±0.5°C, "GMP Conformitate"), its image `/sector-industrial-factory.jpg` and its link to the Therme case study.

**Sector pages.** The "De încredere pentru" / "Trusted by" strip on every sector page now lists "Therme Nord", "Radisson Blu", "Athenee Palace Hilton", "Rompharm", "NTN-SNR" and "Spitalul Foișor", all taken from this list. Each sector also has a project card (`sectors.md`, section B), which the branch does not render.

### R7. Contradictions on the branch

| Topic | Branch references page | Elsewhere on the branch |
|-------|------------------------|-------------------------|
| Number of reference projects | 26 cards | "Cele 25 de proiecte de referință" (`app/servicii/page.tsx`, `app/servicii/executie-sisteme-bms/page.tsx`); "25" on the home page; "25 de proiecte de referință" in `app/despre-noi/page.tsx`. The sector cards count 4 offices, 3 hospitals, 2 retail, 4 HORECA, 3 industrial, 3 education, 5 pharma and Therme, which also makes 25, because they leave out Floreasca Business Park. |
| Completed projects | "30+ Proiecte finalizate", twice | `app/despre-noi/page.tsx`: "Sovitech Control nu publică un număr total de proiecte peste cele care pot fi verificate prin numele clădirii." ("does not publish a total project count beyond those that can be verified by building name") |
| Years of experience | "15+ Ani de experiență" | `app/despre-noi/page.tsx`: the company was "înființată în 2017 la București" ("founded in Bucharest in 2017"), which is under ten years before this import |
| Sectors | "8 Sectoare deservite" | `lib/sector-data.ts` has 10 sectors. The home page shows 9, and its hero and `app/despre-noi/page.tsx` say "opt sectoare". |
| Trust paragraph | Still says "rezultate măsurabile" / "measurable results" | The same page removed its percentages because none had a measurement method (source comment) |
| BMTI Strabag | Office category, "prima clădire de birouri Strabag din București" | Counted as one of three industrial references in `lib/sector-data.ts` |
| Therme location | "București" | "Balotești, Ilfov" (Sport & Wellness project card, `lib/sector-data.ts`) |
| Therme size | "~34,000 m² built area" | Case study metric "34.000 m²", but the case study body still says "peste 8.000 m² de spații climatizate"; guide cards still say 30,000 m² (`case-studies/therme-bucuresti.md`) |
| Radisson rooms | No room count | 424 (case study; also in the unrendered spotlight and slider components); 428 on the lead-magnet case-study cards (`app/ghid-bms/case-studies/page.tsx`, unchanged on the branch) |

### R8. Notes for the app (branch)

These notes apply `docs/guardrails.md`, version 1.3.
- **No value comes from here.** The new figures (1,400 data points, 6 AHUs) are as unverified as main's. They may not fill or "correct" any project or demo value (rule 1).
- **Photos of real buildings.** The photos show real, named buildings, often with third-party logos, and their source and licence are unknown. Whether any may appear in the app is a product and legal question, not a data question.
- **The demo hotel.** `radisson-blu-hotel.jpg` is the photo the branch uses for the real hotel whose name the mockups give the fictional demo project. The app's demo no longer uses that name (owner decision, 2026-09-24). Showing the photo next to demo values would tie them back to the real hotel and make them look like an assessment of the real building, which the label "Demo data, not an assessment of the real building" exists to prevent (rule 10). This file does not suggest using it. See also `case-studies/radisson-blu-bucuresti.md`, "Relation to the app's demo project".
