# ROI calculator methodology (SOVITECH website)

This file records exactly how the two savings calculators on the SOVITECH website work: every input, constant, formula step and output. It then compares them with the app's guardrails. The website figures are marketing figures, not verified engineering data and not approved reference data.

**Source.** Website repository `Gaidenic13/sovitech-website`, commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11). All paths below are relative to that repository's root. The code was read, never run.

**Use in the app.** None of the numbers in this file may be used by the app as a value, benchmark, default or range. They could enter the app only as an approved, versioned reference dataset, and adding one is a loosening that needs the product owner's explicit approval (`docs/guardrails.md` rule 1, section 2.1 and section 10).

**Number format.** Numbers in this file use English format (62,575.5). The website displays Romanian format (62.575). Romanian strings are quoted verbatim.

**Unmerged branch, for reference only.** The branch `redesign-2026` (commits `d2d15d2` and `af81353`, 2026-08-24 and 2026-08-27) rewrites the main calculator's engine and adds a public methodology page and a research document. That branch is not merged into `main`. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. Sections 1 to 5 describe `main` only, and `main` is the current website. Section 6 describes the branch version, kept apart from the rest. The branch's research document is copied verbatim, with an index of its figures, in `company/business/roi-methodology-research.md`.

---

## 1. Two calculators, two methods

| | Main calculator | BMS guide calculator |
|---|---|---|
| Route | `/calculator-roi` | `/ghid-bms/calculator` |
| Source | `app/calculator-roi/page.tsx`, `lib/roi-calculator.ts` | `app/ghid-bms/calculator/page.tsx` (formula inline) |
| Steps | 6-step wizard, results on a 7th screen | One form, results beside it |
| Currency | EUR | RON |
| Energy input | Annual energy cost | Monthly energy cost |
| Investment basis | 25 EUR/m² | 150 RON/m² |
| Savings | Energy plus maintenance, with goal multipliers | Energy only |
| Horizon | 1, 3 and 5 years | 10 years |
| CO₂ | None | 0.05 kg per m² per year |
| Linked from | Header, footer, home page, contact page, sector pages, resources hub (`components/header.tsx`, `components/footer.tsx`, `app/page.tsx`, `app/contact/page.tsx`, `app/sectoare/[sector]/sector-client.tsx`, `app/resurse/page.tsx`) | Only inside the guide funnel: quiz results and guide dashboard (`app/ghid-bms/quiz/page.tsx`, `app/ghid-bms/dashboard/page.tsx`) |

The two calculators share no constants. For the same building they give different answers in different currencies.

---

## 2. Main calculator (`/calculator-roi`)

Source: `app/calculator-roi/page.tsx` and `lib/roi-calculator.ts`.

### 2.1 Page and flow

- Hero eyebrow "• Calculator ROI". H1 "Cât poți economisi cu un BMS?" / "How much could you save with a BMS?". Sub "Completează cei 6 pași și primești o estimare personalizată bazată pe tipul și dimensiunea clădirii tale." / "Complete 6 steps and receive a personalised estimate based on your building type and size."
- A 6-step progress bar with labels "Industrie, Situație, Provocări, Mentenanță, Obiective, Preferințe" / "Industry, Situation, Challenges, Maintenance, Goals, Preferences".
- Buttons "Înapoi" / "Back" and "Continuă" / "Continue". On step 6 the button reads "Calculează ROI" / "Calculate ROI" and runs the formula.
- No input or result is stored or sent. There is no API route, server action or `fetch` call in the repository. The only request the code makes beyond loading the page is the site-wide Vercel page-view analytics (`app/layout.tsx` renders `<Analytics />` from `@vercel/analytics`, version 1.3.1 in `package.json`). State lives in React memory and is lost on reload.

| Step | Title RO / EN | Continue is enabled when |
|------|---------------|--------------------------|
| 1 | "Selectează industria" / "Select your Industry" | A sector is selected |
| 2 | "Situație curentă" / "Current Situation" | Annual energy cost > 0 and building area > 0 |
| 3 | "Provocări specifice" / "Specific Challenges" | Always |
| 4 | "Date de mentenanță" / "Maintenance Data" | Maintenance budget > 0 |
| 5 | "Obiectivele tale" / "Your Goals" | At least one goal. Otherwise a red line: "Selectează cel puțin un obiectiv pentru a continua." / "Select at least one goal to continue." |
| 6 | "Preferințe de implementare" / "Implementation Preferences" | Always |

### 2.2 Inputs

Source: `lib/roi-calculator.ts` (`FormData`, `initialFormData`) and `app/calculator-roi/page.tsx` (labels and controls). "Used" says whether the value reaches the formula.

| Key | Step | Label RO / EN | Control | Options (value: RO / EN, with description) | Default | Used |
|-----|------|---------------|---------|---------------------------------------------|---------|------|
| `industry` | 1 | Sector cards | Single-select cards | See 2.3 | `''` | Yes |
| `annualEnergyCost` | 2 | "Cost anual energie (EUR) *" / "Annual Energy Cost (EUR) *" | Number input, placeholder "ex. 250000" / "e.g. 250000" | Free number. Hint: "Medie pentru <sector>: <range>" (2.4) | 0 | Yes |
| `buildingSize` | 2 | "Suprafața clădirii (m²) *" / "Building Area (m²) *" | Number input, placeholder "ex. 15000" / "e.g. 15000" | Free number. Hint: sector area range (2.4). No area basis is asked. | 0 | Yes |
| `buildingCount` | 2 | "Număr de clădiri" / "Number of Buildings" | Slider 1-50, step 1 | When > 1 a line reads "Discount aplicat pentru N clădiri: X%" / "Volume discount applied for N buildings: X%" | 1 | Yes |
| `occupancyRate` | 3, hospitality only | "Grad mediu de ocupare" / "Average Occupancy Rate" | Slider 0-100 %, step 5 | | 70 | Yes, only below 60 |
| `guestComfortIssues` | 3, hospitality only | "Probleme de confort ale oaspeților" / "Guest comfort issues" | Checkbox | Description "Reclamații frecvente legate de temperatură, umiditate sau calitatea aerului" / "Frequent complaints about temperature, humidity or air quality" | false | Yes |
| `officeType` | 3, office only | "Tipul biroului" / "Office Type" | Radio | `open-plan`: "Open Plan" ("Spațiu deschis, flexibil" / "Open, flexible space"); `traditional`: "Tradițional" / "Traditional" ("Birouri individuale, celulare" / "Individual, cellular offices"); `hybrid`: "Hibrid" / "Hybrid" ("Combinație open plan + celular" / "Mix of open plan and cellular") | `''` | Only `hybrid` |
| `occupancyPatterns` | 3, office only | "Tipare de ocupare" / "Occupancy Patterns" | Checkboxes | `Variable occupancy`: "Ocupare variabilă" / "Variable occupancy"; `Hot-desking`: "Hot-desking / birouri partajate" / "Hot-desking / shared desks"; `After-hours usage`: "Utilizare în afara orelor de program" / "After-hours usage" | `[]` | Not Hot-desking |
| `storeFormat` | 3, retail only | "Formatul magazinului" / "Store Format" | Radio | `Standalone` ("Magazin independent" / "Independent store"); `Mall` ("Într-un centru comercial" / "Within a shopping mall"); `Strip Center` ("Parc comercial de tip strip" / "Strip-style retail park") | `''` | Only `Mall` |
| (none) | 3, healthcare, industrial, data centre | Panel "Configurație standard" / "Standard Configuration": "... vom aplica parametrii standard optimizați pe industrie." / "... we apply industry-optimised standard parameters." | No input | | | |
| `maintenanceBudget` | 4 | "Buget anual mentenanță (EUR) *" / "Annual Maintenance Budget (EUR) *" | Number input, placeholder "ex. 50000" / "e.g. 50000" | Free number | 0 | Yes |
| `unexpectedRepairs` | 4 | "Frecvența reparațiilor neprevăzute" / "Frequency of Unexpected Repairs" | Radio | `rare`: "Rare" ("De câteva ori pe an" / "A few times per year"); `moderate`: "Moderate" ("O dată pe lună" / "Once a month"); `frequent`: "Frecvente" / "Frequent" ("Săptămânal sau mai des" / "Weekly or more often") | `moderate` | Yes |
| `equipmentAge` | 4 | "Vârsta echipamentelor HVAC" / "HVAC Equipment Age" | Radio | `new`: "Noi (sub 5 ani)" / "New (under 5 yrs)" ("Echipamente recente, bine întreținute" / "Recent equipment, well maintained"); `5-years`: "5–10 ani" / "5–10 years" ("Eficiență ușor scăzută" / "Slightly reduced efficiency"); `10-years`: "Peste 10 ani" / "Over 10 years" ("Costuri crescute, randament scăzut" / "Higher costs, lower performance") | `5-years` | Yes |
| `selectedGoals` | 5 | Goal cards, "Selectează cel puțin un obiectiv prioritar. Poți alege mai multe." / "Select at least one priority goal. You can choose multiple." | Multi-select cards | `energy`: "Eficiență energetică" / "Energy Efficiency" ("Reducerea consumului de energie al clădirii"); `maintenance`: "Optimizare mentenanță" / "Maintenance Optimisation" ("Mentenanță predictivă și reducerea costurilor"); `comfort`: "Confort ocupanți" / "Occupant Comfort" ("Confort termic, calitate aer, productivitate"); `compliance`: "Conformitate & ESG" / "Compliance & ESG" ("EPBD, certificări verzi, raportare ESG"); `environmental`: "Sustenabilitate" / "Sustainability" ("Reducerea amprentei de carbon a clădirii") | `[]` | Only `comfort` and `environmental` |
| `implementationBudget` | 6 | "Buget disponibil pentru implementare (EUR) — opțional" / "Available implementation budget (EUR) — optional" | Number input, placeholder "Lasă gol pentru estimare automată" / "Leave blank for automatic estimate" | Hint: "Dacă nu este specificat, estimăm pe baza suprafeței și numărului de clădiri (aprox. 25 EUR/m²)." / "If not specified, we estimate based on area and building count (approx. €25/m²)." | 0 | Yes, replaces the cost |
| `timelineROI` | 6 | "Orizont de timp ROI dorit" / "Desired ROI Timeframe" | Radio | `<1yr`: "Sub 1 an" / "Under 1 Year" ("Implementare intensivă, economii rapide"); `1-3yrs`: "1–3 ani" / "1–3 Years" ("Echilibru optim între cost și beneficii"); `3-5yrs`: "3–5 ani" / "3–5 Years" ("Implementare graduală, investiție moderată") | `1-3yrs` | **No** |
| `hasExistingSystems` | 6 | "Am deja sisteme de automatizare parțial instalate" / "I already have partially installed automation systems" | Checkbox | Description "Reduce costul de implementare cu aproximativ 30%" / "Reduces implementation cost by approximately 30%" | false | Yes |

All four number inputs (annual energy cost, building area, maintenance budget and implementation budget) parse with `Number(e.target.value) || 0`, so an empty or invalid entry becomes 0 (`app/calculator-roi/page.tsx` lines 270, 282, 419 and 520).

### 2.3 Sector constants

Source: `lib/roi-calculator.ts`, `industryDefaults`. The label is the same in both languages. The payback text is shown on each sector card on step 1.

| Id | Label (both languages) | Description RO / EN | Energy savings range | Maintenance multiplier | Payback text RO / EN |
|----|------------------------|---------------------|----------------------|------------------------|----------------------|
| `hospitality` | Hospitality | "Hoteluri, resorturi, spa-uri" / "Hotels, resorts, spas" | 15-30 % | 1.3 | "Amortizare: 10–15 luni" / "Payback: 10–15 months" |
| `office` | Birouri & Office | "Clădiri de birouri, centre de afaceri" / "Office buildings, business centres" | 20-40 % | 1.2 | "Amortizare: 1.5–5 ani" / "Payback: 1.5–5 years" |
| `retail` | Retail & HORECA | "Magazine, centre comerciale, restaurante" / "Stores, shopping centres, restaurants" | 25-35 % | 1.25 | "Amortizare: sub 2 ani" / "Payback: under 2 years" |
| `healthcare` | Medical & Pharma | "Spitale, clinici, centre medicale" / "Hospitals, clinics, medical centres" | 20-30 % | 1.15 | "Amortizare: 2–4 ani" / "Payback: 2–4 years" |
| `industrial` | Industrial | "Fabrici, hale de producție, depozite" / "Factories, production halls, warehouses" | 20-40 % | 1.3 | "Amortizare: 1.5–3 ani" / "Payback: 1.5–3 years" |
| `dataCenter` | Data Center | "Centre de date, infrastructură IT" / "Data centres, IT infrastructure" | 20-35 % | 1.2 | "Amortizare: 1–2 ani" / "Payback: 1–2 years" |

The payback texts are typed strings. The formula never produces or checks them.

### 2.4 Sector "averages" shown as hints on step 2

Source: `app/calculator-roi/page.tsx`, `industryAverages` inside `CurrentSituation`. Shown as "Medie pentru <label>: <value>" / "Average for <label>: <value>". They are ranges, not averages, and they are not used in any calculation. No source is given.

| Sector | Annual energy cost | Building area |
|--------|--------------------|---------------|
| hospitality | "150.000 – 500.000 EUR/an" | "5.000 – 50.000 mp" |
| office | "80.000 – 300.000 EUR/an" | "3.000 – 30.000 mp" |
| retail | "100.000 – 400.000 EUR/an" | "2.000 – 20.000 mp" |
| healthcare | "200.000 – 800.000 EUR/an" | "10.000 – 100.000 mp" |
| industrial | "150.000 – 1.000.000 EUR/an" | "5.000 – 100.000 mp" |
| dataCenter | "500.000 – 5.000.000 EUR/an" | "1.000 – 20.000 mp" |

The range strings are Romanian in both languages ("EUR/an", "mp"). Only the "Medie pentru" / "Average for" prefix is translated.

### 2.5 Other constants

Source: `lib/roi-calculator.ts` unless marked.

| Constant | Value | Where it acts |
|----------|-------|---------------|
| Sector bonus, hospitality | +5 percentage points if guest comfort issues; +3 if occupancy < 60 % | Energy savings % |
| Sector bonus, office | +5 if hybrid; +3 if "Variable occupancy"; +2 if "After-hours usage" | Energy savings % |
| Sector bonus, retail | +5 if Mall | Energy savings % |
| Equipment age factor | new × 1.0; 5-10 years × 1.05; over 10 years × 1.15 | Maintenance multiplier |
| Repair frequency factor | rare × 1.0; moderate × 1.1; frequent × 1.2 | Maintenance multiplier |
| Goal multiplier, comfort | × 1.1 | Total annual savings |
| Goal multiplier, environmental | × 1.05 | Total annual savings |
| Implementation cost rate | 25 EUR/m² ("EUR/m² base" in a code comment) | Implementation cost |
| Multi-building factor | max(0.6, 1 − 0.05 × number of buildings), applied only when there is more than one building | Implementation cost |
| Existing automation factor | × 0.7 | Implementation cost |
| Horizon | 5 years | Net benefit and ROI |
| Year 3 tile factor | 3.2 × annual savings (`app/calculator-roi/page.tsx`) | "An 3" tile |
| Year 5 tile factor | 5.8 × annual savings (`app/calculator-roi/page.tsx`) | "An 5" tile |

**Not present anywhere in either calculator:** savings percentages by system (HVAC, lighting and so on; savings vary by sector only), an energy price (EUR/kWh or RON/kWh), any energy quantity in kWh, operating hours, an inflation or escalation rate, a discount rate, a BMS operating or service cost, a VAT basis, a price date, an exchange rate, or a baseline year.

### 2.6 Formula, step by step

Source: `calculateROI` in `lib/roi-calculator.ts`. It runs once, when "Calculează ROI" is pressed on step 6.

1. **No sector.** If `industry` is empty, every output is 0 and payback is the string "0". The UI cannot reach this, because step 1 requires a sector.
2. **Energy savings %.** Start at the sector's lower bound. Add the sector bonuses (2.5). Cap at the sector's upper bound.
3. **Annual energy savings** = annual energy cost × energy savings % / 100.
4. **Maintenance multiplier** = sector multiplier × equipment age factor × repair frequency factor.
5. **Annual maintenance savings** = maintenance budget × (maintenance multiplier − 1).
6. **Total annual savings** = energy savings + maintenance savings. Then × 1.1 if the comfort goal is selected, and × 1.05 if the environmental goal is selected.
7. **Implementation cost** = building area × 25. If more than one building, × max(0.6, 1 − 0.05 × count). If existing automation is ticked, × 0.7. If an implementation budget above 0 was entered, the cost is replaced by that budget.
8. **Payback (months)** = implementation cost / (total annual savings / 12). If total savings are 0 or less, payback is 0.
9. **Payback (years)** = payback months / 12, formatted with one decimal (`toFixed(1)`).
10. **Five-year net benefit** = total annual savings × 5 − implementation cost.
11. **ROI %** = round(five-year net benefit / implementation cost × 100). If the cost is 0, ROI is 0.

The ROI is therefore a five-year, net, undiscounted ratio with flat savings: (5s − c) / c.

### 2.7 Outputs

Source: `ResultsReport` in `app/calculator-roi/page.tsx`. Money is formatted with `Intl.NumberFormat("ro-RO")`, rounded to whole euros.

| Place | Label RO / EN | Value shown |
|-------|---------------|-------------|
| Header | "Analiza ta ROI personalizată" / "Your Personalised ROI Analysis", with the sector chip | |
| Hero tile | "ROI 5 ani" / "5-Year ROI" | ROI % (step 11) |
| Hero tile | "Recuperare invest." / "Payback" | Payback years (step 9) + "ani" / "yrs" |
| Hero tile | "Economii/an" / "Savings/yr" | Total annual savings, EUR |
| Hero tile | "Beneficiu net 5 ani" / "Net benefit 5 yrs" | Five-year net benefit, EUR |
| Breakdown | "Economii energie/an" / "Energy savings/yr", sub-line "<pct>% reducere" / "<pct>% reduction" | Annual energy savings, EUR |
| Breakdown | "Economii mentenanță/an" / "Maintenance savings/yr", sub-line "Mentenanță predictivă" / "Predictive maintenance" | Annual maintenance savings, EUR |
| Breakdown | "Cost estimat implementare" / "Estimated implementation cost", sub-line "Investiție inițială" / "Initial investment" | Implementation cost, EUR |
| Timeline | "An 1" / "Year 1", caption "economii cumulate" / "cumulative savings" | Total annual savings |
| Timeline | "An 3" / "Year 3" | Total annual savings × 3.2 |
| Timeline | "An 5" / "Year 5" | Total annual savings × 5.8 |

Payback in months is computed but never displayed.

**Actions on the results screen.**
- "Recalculează" / "Recalculate" resets everything to step 1.
- "Vrei o propunere detaliată?" / "Want a detailed proposal?", with "Specialiștii noștri pot analiza clădirea ta și furniza un raport complet de fezabilitate BMS." Two buttons, "Solicită propunere detaliată" / "Request a Detailed Proposal" and "Programează o discuție" / "Schedule a Call", both link to `/contact`. No result data is passed.
- "Descarcă PDF" / "Download PDF" calls the browser's print dialog.
- "Distribuie" / "Share" opens WhatsApp, Email (mailto, subject "Analiza ROI pentru un sistem BMS" / "ROI analysis for a BMS system") and LinkedIn links. WhatsApp and email carry the text "Am estimat cu calculatorul Sovitech economii anuale de <X> EUR cu un sistem BMS, cu amortizare în <Y> ani. Calculează și tu:" / "I estimated <X> EUR in annual savings with a BMS using the Sovitech calculator, with payback in <Y> years. Try it yourself:", followed by the address. LinkedIn shares only the `/calculator-roi` address, with no text (`app/calculator-roi/page.tsx` lines 747, 756 and 763).
- "Copiază link" / "Copy Link" copies the bare `/calculator-roi` address. The results are not in the link.

### 2.8 Worked examples

These were computed for this document by an independent re-implementation of the formula above, not by running the website code. Inputs not listed are at their defaults.

| | A: the placeholder values | B: office, every bonus | C: office with no step-3 bonuses, default repairs and equipment age, energy goal only, 3 buildings and existing automation |
|---|---|---|---|
| Sector | hospitality | office, hybrid, variable occupancy, after-hours | office |
| Energy cost / area / maintenance | 250,000 EUR / 15,000 m² / 50,000 EUR | same | same |
| Repairs / equipment age | moderate / 5-10 years | frequent / over 10 years | moderate / 5-10 years |
| Goals | energy | comfort, environmental | energy |
| Energy savings % | 15 | 30 | 20 |
| Energy savings | 37,500 | 75,000 | 50,000 |
| Maintenance multiplier | 1.5015 | 1.656 | 1.386 |
| Maintenance savings | 25,075 | 32,800 | 19,300 |
| Total annual savings | 62,575 | 124,509 | 69,300 |
| Implementation cost | 375,000 | 375,000 | 223,125 |
| Payback shown | "6.0 ani" | "3.0 ani" | "3.2 ani" |
| Net benefit 5 yrs | −62,125 | 247,545 | 123,375 |
| ROI 5 ani | −17 % | 66 % | 55 % |
| An 5 tile | 362,935 | 722,152 | 401,940 |

Example A uses the page's own placeholder values ("ex. 250000", "ex. 15000", "ex. 50000"). It shows a 6.0-year payback and a negative five-year ROI, while the hospitality card on step 1 says "Amortizare: 10–15 luni".

### 2.9 Behaviour worth knowing

- **No upper bound can be reached.** In every sector the bonuses stop below the cap, so the cap never acts and the top of each range is never used.

  | Sector | Range shown in code | Highest % the formula can give |
  |--------|---------------------|--------------------------------|
  | hospitality | 15-30 | 23 |
  | office | 20-40 | 30 |
  | retail | 25-35 | 30 |
  | healthcare | 20-30 | 20 |
  | industrial | 20-40 | 20 |
  | dataCenter | 20-35 | 20 |

- **Inputs that never change a result:** the ROI timeframe (`timelineROI`); the goals energy, maintenance and compliance; "Hot-desking"; office type other than hybrid; store format other than Mall; occupancy rate at 60 % or above. For healthcare, industrial and data centre, step 3 asks nothing and the energy savings % is always the lower bound.
- **Maintenance savings are a large, fixed share of the maintenance budget.** Maintenance savings = budget × (multiplier − 1), with no link to any equipment or measure.

  | Sector | Lowest share (new equipment, rare repairs) | Default inputs (5-10 years, moderate) | Highest share (over 10 years, frequent) |
  |--------|------|------|------|
  | hospitality | 30.0 % | 50.2 % | 79.4 % |
  | office | 20.0 % | 38.6 % | 65.6 % |
  | retail | 25.0 % | 44.4 % | 72.5 % |
  | healthcare | 15.0 % | 32.8 % | 58.7 % |
  | industrial | 30.0 % | 50.2 % | 79.4 % |
  | dataCenter | 20.0 % | 38.6 % | 65.6 % |

- **The breakdown does not add up when a goal multiplier applies.** In example B, energy 75,000 plus maintenance 32,800 is 107,800, but "Economii/an" shows 124,509. The 1.155 goal factor is not shown anywhere.
- **The budget replaces the cost.** If the visitor enters an available budget, that budget becomes the "Cost estimat implementare", whatever the building area.
- **The discounts.** The multi-building factor gives 10 % off for 2 buildings, 15 % for 3, and so on, up to 40 % from 8 buildings. Existing automation takes 30 % off. Neither has a stated source.
- **Building area is ambiguous with several buildings.** The label says "Suprafața clădirii" (the building's area), but the cost treats it as the total across all buildings.
- **The timeline tiles disagree with the net benefit.** "An 5" uses 5.8 × annual savings, while "Beneficiu net 5 ani" uses 5 ×. No single growth rate explains the tiles: 3.2 over 3 years implies about 6.5 % a year, and 5.8 over 5 years implies about 7.4 % a year. No rate is stated on the page.
- **Number formats are mixed.** Money uses Romanian grouping ("62.575"). Payback uses a decimal point ("6.0 ani"), where Romanian writes "6,0".
- **Unknown becomes zero.** Empty inputs parse to 0 (`|| 0`), and a missing sector returns all zeros.

---

## 3. BMS guide calculator (`/ghid-bms/calculator`)

Source: `app/ghid-bms/calculator/page.tsx`.

**Page.** H1 "Calculator ROI Personalizat" / "Personalised ROI Calculator". Sub "Descoperă economiile potențiale exacte pentru clădirea ta și perioada de amortizare a investiției în BMS" / "Discover the exact potential savings for your building and the payback period for your BMS investment". Form title "Detaliile Clădirii" / "Building Details".

### 3.1 Inputs

| Key | Label RO / EN | Control | Options / range | Default |
|-----|---------------|---------|-----------------|---------|
| `buildingType` | "Tipul clădirii" / "Building Type" | Select | `office`: "Clădire de birouri" / "Office Building"; `retail`: "Spațiu retail" / "Retail Space"; `hotel`: "Hotel / HORECA"; `medical`: "Unitate medicală" / "Medical Facility"; `industrial`: "Hală industrială" / "Industrial Hall" | `office` |
| `buildingSize` | "Suprafața (m²)" / "Floor Area (m²)" | Number input plus slider 500-20,000, step 100. Caption "500 – 20.000 m²". The number input accepts any value. | | 5,000 |
| `energyCost` | "Costuri lunare cu energia (RON)" / "Monthly Energy Costs (RON)" | Number input plus slider 1,000-100,000, step 1,000. Caption "1.000 – 100.000 RON". | | 15,000 |

Nothing is required. "Calculează ROI" / "Calculate ROI" shows the results. After that first press, the results recompute live as inputs change. Inputs parse with `Number.parseInt(...) || 0`.

### 3.2 Constants and formula

| Step | Formula |
|------|---------|
| Savings rate | office 0.30; retail 0.35; hotel, medical and industrial 0.32 |
| Annual savings (RON) | monthly energy cost × 12 × savings rate, rounded |
| Investment (RON) | area × 150, rounded |
| Payback (years) | investment / annual savings, one decimal |
| CO₂ reduction (kg per year) | area × 0.05, rounded |
| Tonnes line | round(CO₂ kg / 1,000) |
| 10-year savings (RON) | annual savings × 10 |

There is no maintenance term, no goal term and no discount.

### 3.3 Outputs

| Tile | Label RO / EN | Value | Sub-line |
|------|---------------|-------|----------|
| 1 | "Economii anuale" / "Annual Savings" | Annual savings + " RON" | "<rate>% reducere a costurilor cu energia" / "% reduction in energy costs" |
| 2 | "Perioada de amortizare" / "Payback Period" | Payback + " ani" / " years" | "Investiție totală: <investment> RON" / "Total investment:" |
| 3 | "Economii pe 10 ani" / "10-Year Savings" | 10 × annual savings + " RON" | "ROI cumulat după perioada de amortizare" / "Cumulative ROI after the payback period" |
| 4 | "Reducere CO₂" / "CO₂ Reduction" | CO₂ + " kg/an" / " kg/yr" | "Echivalentul a <t> tone CO₂" / "Equivalent to <t> tonnes CO₂" |

Above the tiles: "+200 puncte câștigate" / "+200 points earned", "Rezultatele Tale" / "Your Results", "Pe baza datelor introduse" / "Based on the data you entered". Numbers use `toLocaleString()` with no locale, so the format follows the visitor's browser.

### 3.4 Worked examples

Computed for this document by an independent re-implementation.

| Case | Annual savings | Investment | Payback | CO₂ tile |
|------|----------------|------------|---------|----------|
| Defaults: office, 5,000 m², 15,000 RON a month | 54,000 RON | 750,000 RON | 13.9 years | 250 kg a year; the tonnes line reads 0 ("Echivalentul a 0 tone CO₂") |
| Hotel, 20,000 m², 100,000 RON a month | 384,000 RON | 3,000,000 RON | 7.8 years | 1,000 kg a year; tonnes line 1 |
| Retail, 500 m², 100,000 RON a month | 420,000 RON | 75,000 RON | 0.2 years | 25 kg a year; tonnes line 0 |
| Office, 20,000 m², 1,000 RON a month | 3,600 RON | 3,000,000 RON | 833.3 years | 1,000 kg a year; tonnes line 1 |

With a monthly cost of 0 the payback divides by zero and would display "Infinity".

### 3.5 Behaviour worth knowing

- **The default result contradicts the funnel's own claim.** The guide landing page says payback is "de regulă 2–4 ani" / "typically 2–4 years" (`app/ghid-bms/page.tsx`). The calculator's own defaults give 13.9 years.
- **The "10-year" tile is not an ROI.** It is gross savings × 10. It does not subtract the investment and does not start after payback, although the sub-line says "ROI cumulat după perioada de amortizare".
- **CO₂ depends on area only.** It ignores energy use, carrier and emission factor. A 30,000 m² building would show 1,500 kg a year, while the same funnel's case studies claim 280 to 450 tonnes a year (section 4).
- **Rates differ from the main calculator.** Office is 30 % here and 20-30 % there. Investment is 150 RON/m² here and 25 EUR/m² there. Neither file states an exchange rate, so the two cannot be compared on the page.

---

## 4. Savings, payback and CO₂ claims elsewhere in these funnels

All are marketing statements with no stated basis, baseline or method.

| Claim RO / EN | Source |
|---------------|--------|
| "Calculul economiilor de energie: reducere de 25–40% a costurilor operaționale" / "Energy savings calculation: 25–40% reduction in operational costs" | `app/ghid-bms/page.tsx` |
| "Estimarea ROI și perioada de amortizare a investiției (de regulă 2–4 ani)" / "(typically 2–4 years)" | `app/ghid-bms/page.tsx` |
| "Timeline tipic: de la audit la punerea în funcțiune (3–6 luni)" / "Typical timeline: from audit to commissioning (3–6 months)" | `app/ghid-bms/page.tsx` |
| "Consumul energetic mediu pe sector (kWh/m²/an)" promised as guide content. No per-sector figures are in the repository. The only kWh/m² figure is a hotel "100-150" "kWh/mp/an", "consum hotel tipic", under "KPI-uri tipice de benchmarking", outside the funnel and with no source (`app/resurse/articole/optimizare-hotel-bms/page.tsx`). | `app/ghid-bms/page.tsx` |
| Sector payback cards, from "Amortizare: 10–15 luni" (hospitality) to "Amortizare: 1.5–5 ani" (office) | `lib/roi-calculator.ts` (2.3) |
| Therme București: "35%" savings, "2.3 ani" / "2.3 years", "450 tone/an" / "450 tonnes/yr", "Complex spa și wellness de 30.000 m²" | `app/ghid-bms/case-studies/page.tsx` |
| Radisson Blu București: "32%", "2.8 ani", "280 tone/an", "Hotel 5 stele cu 428 camere" | `app/ghid-bms/case-studies/page.tsx` |
| Rompharm Company: "28%", "3.1 ani", "320 tone/an" | `app/ghid-bms/case-studies/page.tsx` |
| Therme: "Reducere cu 35% a costurilor energetice pentru cel mai mare complex wellness din Europa." Radisson: "hotel 5 stele cu 428 camere." | `app/ghid-bms/resurse/page.tsx` |

**Contradictions inside the website.**
- The guide pages give Radisson Blu **428** rooms. The full case study page gives **424** ("oferă 424 de camere") (`app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`).
- The guide case-study card gives Therme **30.000 m²**. The full case study gives "8.000 m²" as "Suprafață implementată" and "peste 8.000 m² de spații climatizate" (`app/resurse/studii-de-caz/therme-bucuresti/page.tsx`). These may be different area bases, but neither page says so.
- On the case-study cards, the payback figure is labelled "ROI" (`app/ghid-bms/case-studies/page.tsx`).

---

## 5. Against the app's guardrails

The website calculators are marketing tools. Their job is to start a conversation, and SOVITECH engineers follow up. The app's rules are stricter because the app shows figures that owners may act on. This section is not a verdict on the website. It sets out what the app can and cannot carry over. Rule references are to `docs/guardrails.md` version 1.3 (1.3 added test case G1-12 and changed no rule text). The same comparison for the branch version is in 6.11.

### 5.1 What the website already does in the app's direction

- **Arithmetic lives in code.** Both formulas are deterministic functions. That meets half of rule 9's "versioned, deterministic functions": neither is versioned (5.3). The main formula sits in its own module.
- **One ROI definition.** The main calculator uses one formula, (5s − c) / c, on every screen. The app's own dashboard mockups do not manage this (dashboards spec 6.5, "No ROI has a single definition").
- **Some basis is disclosed.** The cost hint names "aprox. 25 EUR/m²", and the existing-automation checkbox names "aproximativ 30%".
- **Estimate wording in places.** The English hero asks "How much could you save", the subtitle promises "o estimare personalizată", and the cost line reads "Cost estimat implementare". The share text starts "Am estimat" / "I estimated".
- **Sector cards show ranges** rather than single payback figures.
- **Every result ends with a hand-off to specialists** (`/contact`), which matches the app's principle that SOVITECH engineers review before anything is final.

### 5.2 Rule 8: units and meaning

| Topic | Website | App rule | Gap |
|-------|---------|----------|-----|
| Area basis | "Suprafața clădirii (m²)" and "Suprafața (m²)", with no basis | Area is stored with a basis (Sc, Scd, Su, heated usable, conditioned) and whether basements and parking are included. Benchmarks apply only to an area on the same basis. | 25 EUR/m² and 150 RON/m² have no basis, so neither could be applied to an app area. |
| Energy | Only cost (EUR a year or RON a month). No kWh, carrier, meter or period. | Energy values record carrier, metering point, period and reading type. Annual totals are calculated from bills. | The savings % acts on money, not energy, so an energy-price change moves the saving one for one. |
| Percent | "20% reducere" | "A saving in % names its baseline." | The implied baseline is the cost the visitor typed, with no year, weather normalisation or occupancy. |
| Currency | EUR in one calculator, RON in the other, no VAT basis, no price date | The VAT basis and price date are stated. EUR to RON uses the BNR rate for a stated date, from reference data (G10-4). | No VAT basis, date or rate anywhere. |
| Duration and CO₂ | Payback in years; CO₂ in "kg/an" and tonnes | The unit registry in rule 8 has no duration or CO₂ unit yet. The dashboards spec proposes adding them, with an approved emission-factor dataset (7.2.22, awaiting approval). | The CO₂ figure has no carrier and no emission factor. |
| Number format | "62.575" with "6.0 ani" | Rule 8 notes that Romanian writes 1,5 for one and a half. | Mixed separators on one screen. |

### 5.3 Rule 9: assumptions visible

| Requirement | Website | Gap |
|-------------|---------|-----|
| Badge, basis, method and version, assumptions | Results show bare figures. The multipliers, bonuses and factors are not shown on the results screen. | Nothing identifies the method or its version. |
| A range when estimated | Point values only on results. Sector cards show ranges, but they are typed strings. | Rule 9: "Ranges come from the method ... It is never typed by hand." |
| Rounding | Whole euros ("62.575 EUR") and one decimal of years | Estimated values show 2 or 3 significant figures, and ranges round outward (G9-1). Whole-euro figures suggest more precision than the method has. |
| No laundering | Goal choices multiply savings (× 1.1 comfort, × 1.05 environmental). Maintenance savings are a fixed share of a budget. | Rule 9 says a result is never more certain than its weakest input. Here an owner's choice changes a physical outcome with no method behind it. |
| Unknown handling | `\|\| 0` on inputs; a missing sector returns zeros | Rule 1 forbids `?? 0`, `\|\| 0` and `Number()` on engineering values, and any numeric stand-in for unknown. |
| Breakdown and total | Energy + maintenance ≠ total when a goal multiplier applies | G9-8 requires a breakdown and its total to come from one snapshot. The dashboards spec proposes that parts sum to their total (7.2.14, awaiting approval). |
| Tiles and series agree | "An 5" (5.8 ×) against "Beneficiu net 5 ani" (5 ×) | The same class of defect that G9-9 tests on the app's cash-flow charts. |

### 5.4 Rule 10: pricing stages and savings wording

**The investment figure.**
- The website's cost comes from a benchmark rate only (25 EUR/m² or 150 RON/m²). In the app that is stage 1, **"Indicative range"**, which is "always a range". The website shows one number labelled "Cost estimat implementare" / "Investiție inițială" or "Investiție totală".
- The main calculator replaces the cost with the visitor's available budget. The app should not do this, but no rule forbids it yet. Rule 10 does not mention an owner's budget, and under 2.4 an owner-entered value (source `user`) would outrank an engine estimate (`calculated` or `estimated`). The dashboards spec proposes closing this gap (`design/dashboards-spec.md` 7.2.20: engine outputs cannot be typed; awaiting approval). A budget is the owner's constraint, not a price.
- The multi-building and existing-automation discounts are commercial assumptions. Rule 1 says reuse of existing field devices, wiring or controllers is never assumed. Until a survey, the estimate shows reuse and replacement as a range (G1-7). The website applies a flat 30 % reduction from a checkbox.
- Stage 2 must name who supplies field devices, gateways, room control, panels, power and containment. The website has no scope split.

**Savings, payback and ROI.**

| Rule 10 requirement | Website |
|---------------------|---------|
| Always Estimated | The results screen never says "estimated" next to savings, payback or ROI. |
| "could save", never "will save" | English hero: "How much could you save" (passes). Romanian hero: "Cât poți economisi" ("how much can you save"). No "will save" or "will reduce" appears in either calculator. |
| Carry assumptions: energy price, operating hours, baseline | None of the three is asked or shown. |
| A baseline names its years, weather normalisation and occupancy | The typed annual cost is the only baseline, with no period. |
| Demo data labelled and sourced from fixtures | Not applicable to the website. See 5.5 for the Radisson figures. |

**Reserved terms in calculator copy.** The app's reserved-term check (2.8) would flag these if the copy were reused as-is. Matching is whole-word, ignoring case and diacritics.

| Text | Term | Source |
|------|------|--------|
| "Discover the exact potential savings for your building ..." | exact | `app/ghid-bms/calculator/page.tsx` |
| "Discută rezultatele cu specialiștii noștri și primește o ofertă personalizată" / "... receive a personalised quote" | ofertă / quote | `app/ghid-bms/calculator/page.tsx` |
| "Final details for the most accurate cost and ROI estimate." | final | `app/calculator-roi/page.tsx` |
| "Conformitate & ESG" (goal label) | conformitate | `app/calculator-roi/page.tsx` |

The Romanian "economiile potențiale exacte" does not match whole-word "exact", but it makes the same claim. The full list for all funnel pages is in `company/business/lead-funnels.md`.

### 5.5 Rules 1, 2.1, 13 and section 10: can the app use these numbers?

**No, not as they are.**
- Under 2.1, the savings percentages, maintenance multipliers, €/m² and RON/m² rates, the CO₂ factor, the sector "averages" and the payback ranges are all benchmarks: "typical values for buildings like this". Benchmarks may feed only `estimated` values, and only from a curated, versioned reference dataset with its basis (rules 1 and 8).
- Adding a reference dataset is a loosening (section 10). It needs the product owner's own approval in conversation. Nothing in this file is that approval. Test case G1-12 checks that a dataset with no approval record never creates a `reference` value.
- The case-study figures (Therme, Radisson Blu, Rompharm) are results from past projects. Rule 13 says benchmarks built from past projects need the owners' agreement and anonymisation, and enter only as a versioned reference dataset with approval.
- **The demo project and Radisson Blu.** The app's mockups show the demo project as Radisson Blu Bucharest, a real hotel. Owner decision, 2026-09-24: the app's demo no longer uses the real hotel's name (working name "Demo Hotel Bucharest"). The website publishes "32%", "2.8 ani", "280 tone/an" and "428 camere" for the same hotel. None of these may enter the demo. Demo values cite fixture documents that exist in the repo (rule 10), and neither the project name nor outside knowledge is evidence for a value (rule 1, G1-11). The app's mockups show 424 rooms from the demo's "Room Schedule.xlsx" (`design/onboarding-spec.md` step 3). The website's 428 contradicts both that demo value and the website's own full case study, which says 424.

### 5.6 Compared with the financial findings in the dashboards spec (6.2 and 6.5)

The app's own dashboard mockups show many of the same problems. Both sets need the same fixes before any figure reaches an owner.

| Issue | App mockups (`design/dashboards-spec.md`) | Website calculators |
|-------|-------------------------------------------|---------------------|
| ROI definition | No single definition. 125 % and 136 % match two different formulas, and 97 % matches none (6.5, screens 19 and 21). | Main: one definition, (5s − c) / c, but the label "ROI 5 ani" does not say net or undiscounted. Guide: gross 10-year savings sit under an "ROI" caption. |
| Payback net of BMS operating cost | 6.1 years ignores the €38k a year BMS OPEX (6.2). | No BMS operating cost exists in either formula. |
| Tiles against series | Cash-flow charts disagree with their tiles (6.2; 6.5 screens 19, 21, 22). | "An 3" and "An 5" tiles (3.2 ×, 5.8 ×) disagree with the 5-year net benefit (5 ×). |
| Escalation | 21 states 2.5 % but does not apply it (6.5; 7.2, sharpening of proposal 12). | None stated; the tiles imply 6.5 % and 7.4 % a year at once. |
| Horizon | 10, 15 and 20 years coexist (6.5, "Across the screens"). | 5 years (main) and 10 years (guide). |
| Non-energy benefits in payback | 21 puts O&M in the headline; 19 leaves it out (6.5; gap 7.2.13 proposes excluding them by default). | Main calculator puts maintenance savings, 15 % to 79 % of the typed maintenance budget, into payback and ROI. |
| Stacking savings | Measures on one baseline must combine in sequence (gap 7.2.21, proposed). | Percentage-point bonuses add, and goal factors multiply the total. |
| Baseline | Two baselines on one screen (6.5, screen 12); a modelled baseline is proposed for new buildings (7.2.19). | The typed cost, no period. New construction has no bills, and the website does not ask the project type in the calculator. |
| Cost per area | €37/m² on 02 and 18 / 37 / 57 / 83 €/m² on 13, with no area basis (6.2, 6.5). | 25 EUR/m² (main) and 150 RON/m² (guide), with no area basis. |
| CO₂ | 13's 682 t implies about 0.82 kg/kWh (implausible); 21's factor is not shown (6.5). | 0.05 kg per m² per year, with no energy term at all. |

The app mockup figures are invented demo data. The website figures are marketing figures. Neither set is a reference for the other.

### 5.7 What the app could take from the calculators

- **Question ideas, not values.** Maintenance budget, equipment age and repair frequency are not in the app's intake today. Adding any question needs the approver's approval and must pass rule 6's sensitivity test against a named output. Equipment age is a technical fact about assets, so it would be an engineer field, not an owner question (rule 3).
- **A shape for an early indicative view.** A stage 1 "Indicative range" before documents are analysed is allowed by rule 10. It would need an approved benchmark dataset with basis and version, a range from the method, the Estimated badge and its assumptions. That is a proposal for the approver, not something to build from these constants.
- **Test cases the website exposes.** None is added here, because this task writes only this file, `lead-funnels.md` and `roi-methodology-research.md`. None of these cases is in `docs/guardrails.md` today.
  - *Cases that test rules as they stand.* Each could become a case under `tests/guardrails/`, indexed in `docs/guardrails.md` section 7. CLAUDE.md and guardrails section 10 allow new cases without approval.
    - A goal or other owner choice never changes a savings figure unless a registered formula declares that it reads it (rules 6 and 9).
    - A displayed breakdown and its total come from one snapshot (extends G9-8). This alone would not catch the website's gap in 2.9, where the parts do not sum to the total.
    - A saving in % with no named baseline fails the registry's qualifier requirement (rule 8: "A saving in % names its baseline").
    - A 5-year tile and a 5-year net figure on one screen come from the same engine series (rule 9; extends G9-9).
  - *Cases that depend on a proposal.* These enforce behaviour that no rule states yet. Under guardrails section 10 that is a tightening, so each needs the approver's approval first.
    - An owner-entered budget is never used as the investment figure (depends on dashboards spec gap 7.2.20; needs the approver's approval).
    - The parts of a displayed breakdown sum to its total (depends on dashboards spec gap 7.2.14; needs the approver's approval).

---

## 6. `redesign-2026` branch: the rewritten calculator

**Status: unmerged branch content.** This section comes from the branch `origin/redesign-2026` of the website repository, commit `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala"). The branch head `af81353` (2026-08-27, "Materiale vizuale noi: 10 coperti si 15 diagrame") changes none of the ROI files named here. Of the files in 6.2 it touches only `app/resurse/page.tsx`, and only its article cards. The branch is not merged into `main`. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. This section is kept for reference only. Paths are paths on that branch. The code was read, never run. Sections 1 to 5 describe `main` and are not changed by anything here.

**Use in the app.** None, as for `main` (5.5). The branch figures are marketing copy, and its research figures are unverified claims collected for that copy. The research document behind them is copied verbatim in `company/business/roi-methodology-research.md`, with an index of its figures by evidence type.

The branch changes only the main calculator. The guide calculator (`/ghid-bms/calculator`, section 3) changes only in layout classes.

### 6.1 What changed against `main`

| Topic | `main` (section 2) | Branch |
|-------|--------------------|--------|
| Savings % | A range per sector (15-30 % to 25-35 %). Start at the lower bound, add bonuses of +2 to +5. | One set of bands for all sectors, chosen by "domain": whole building 5 / 8 / 15 %, HVAC 10 / 15 / 20 %, FDD 5 / 9 / 15 % (min / typical / max). Start at the typical value, add bonuses of +1 or +2. |
| Goal multipliers | × 1.1 for comfort, × 1.05 for environmental | Removed |
| Cost rate | 25 EUR/m² for every sector | A band per sector, from 3 to 18 EUR/m² |
| Several buildings | The area is not multiplied; the count only discounts | Area × number of buildings, then the same discount |
| Typed budget | Replaces the cost | Replaces the point cost; the cost range stretches to include it |
| Results | Single figures | Savings, cost and payback as ranges. ROI, net benefit, maintenance savings and the year tiles stay single figures. |
| Method | Not shown | A link to a new page, `/calculator-roi/metodologie`, on every step and on the results, and a disclaimer on the results |
| Sector cards | Six payback strings, from "Amortizare: 10–15 luni" to "Amortizare: 1.5–5 ani" | One string for all six: "Amortizare: 1-3 ani optimizare, 3-6 ani sistem nou" |
| Unchanged | | Steps, questions, options, defaults and Continue conditions; maintenance multipliers; discounts; the 5-year horizon; `Number(e.target.value) \|\| 0`; the step 2 hints; the 3.2 × and 5.8 × tiles |

### 6.2 Files

| Path | Change | What it is |
|------|--------|------------|
| `lib/roi-calculator.ts` | Rewritten | The engine (6.4, 6.5) |
| `app/calculator-roi/page.tsx` | Changed | New hero copy, the method link, the results ranges, the domain selector, the step 6 hint (6.3, 6.6) |
| `components/roi-methodology.tsx` | New, 35,393 bytes | The content of the methodology page (6.8) |
| `app/calculator-roi/metodologie/page.tsx` | New | The route `/calculator-roi/metodologie` and its metadata |
| `docs/roi-methodology-research.md` | New, 45,024 bytes | The research document. No page links to it. Copied in `roi-methodology-research.md`. |
| `app/sitemap.ts` | Changed | Adds `/calculator-roi/metodologie` (priority 0.7, "monthly") |
| `app/resurse/page.tsx` | Changed | Lists "Calculator de economie și amortizare" / "Savings & payback calculator" and "Metodologia ROI" / "ROI Methodology" |
| `lib/site-routes.ts`, `next.config.mjs` | New / changed | A registry alias `/instrumente/calculator-economie-energie-bms` ("Calculator: economia estimată dintr-un BMS") that redirects permanently to `/calculator-roi` |

### 6.3 Inputs

- **New key `savingsDomain`.** Values `whole_building` (default), `hvac` and `fdd`. No step asks it. It is chosen only on the results screen, under "Economia se estimează pe:" / "The savings estimate refers to:", with the three domain labels as buttons (6.4). A click recalculates at once. "Recalculează" resets it to `whole_building`.
- **Step 6 budget.** Label "Buget disponibil pentru implementare (EUR, opțional)" / "Available implementation budget (EUR, optional)". Hint "Dacă nu este specificat, estimăm pe baza suprafeței, a numărului de clădiri și a benzii de cost pentru tipul clădirii." / "If not specified, we estimate based on area, building count and the cost band for the building type." The "aprox. 25 EUR/m²" is gone.
- **Everything else is as in 2.1 and 2.2.** The area label still reads "Suprafața clădirii (m²) *", now multiplied by the number of buildings. The existing-automation box still says "Reduce costul de implementare cu aproximativ 30%". The step 6 English subtitle still reads "Final details for the most accurate cost and ROI estimate."
- **Unknown still becomes zero.** All four number inputs still parse with `Number(e.target.value) || 0` (`app/calculator-roi/page.tsx` lines 275, 287, 424 and 525).

### 6.4 Constants

Source: `lib/roi-calculator.ts`.

**Savings bands (`SAVINGS_BANDS`).** Every sector uses the same bands. The code comment reads "Register-backed savings bands per domain (doc 12 §3.2). The default is the most conservative and most defensible: whole-building, measured."

| Domain | Min | Typical | Max | Label RO / EN | Source string in the code |
|--------|-----|---------|-----|---------------|---------------------------|
| `whole_building` | 5 % | 8 % | 15 % | "din consumul total al clădirii" / "of whole-building consumption" | "Crowe et al. 2020; Kramer et al. 2019 (LBNL)" |
| `hvac` | 10 % | 15 % | 20 % | "din consumul HVAC, unde reglajul era deficitar" / "of HVAC consumption, where controls were deficient" | "ACEEE" |
| `fdd` | 5 % | 9 % | 15 % | "cu analitică peste un BMS existent" / "with an analytics layer over an existing BMS" | "LBNL SEAC" |

The source strings are not shown anywhere on the site.

**Cost bands (`COST_PER_SQM_BANDS`, EUR/m²).** The code comment says they follow "doc 12 §3.1, aligned with the published price article: offices A 9-18, hotels 6-13, retail 4-9, industrial 3-8", and that healthcare and data centre use "the aggregated non-residential band 4-18 with typical 13". "Doc 12" is not in the repository. The price article is the branch's `/resurse/cost-sistem-bms` (`components/articles/cost-sistem-bms.tsx`). Its table gives the same min-max ranges as "Ordin de mărime EUR/mp arie utilă", but no typical values, and it cites no source for them. It differs from the engine in three ways:
- its 6-13 row is "Hotel, fără automatizare pe cameră"; a hotel "cu control pe fiecare cameră" is 18-38, and the engine uses 6-13 for every hotel;
- its "Pharma, zone clasificate, monitorizare de mediu" row is 30-80, while the engine's "Medical & Pharma" sector uses 4-18;
- its aggregated 4-18 band is "pentru retail, birouri și hoteluri fără control pe cameră", not for hospitals or data centres.

| Sector | Min | Typical | Max |
|--------|-----|---------|-----|
| office | 9 | 13 | 18 |
| hospitality | 6 | 9 | 13 |
| retail | 4 | 6 | 9 |
| industrial | 3 | 5 | 8 |
| healthcare | 4 | 13 | 18 |
| dataCenter | 4 | 13 | 18 |

**Sector bonuses** (percentage points added to the typical value):

| Sector | Condition | `main` | Branch |
|--------|-----------|--------|--------|
| hospitality | Guest comfort issues | +5 | +2 |
| hospitality | Occupancy below 60 % | +3 | +1 |
| office | Hybrid | +5 | +2 |
| office | "Variable occupancy" | +3 | +1 |
| office | "After-hours usage" | +2 | +1 |
| retail | Mall | +5 | +2 |

**Unchanged from 2.5:** the maintenance multipliers (hospitality 1.3, office 1.2, retail 1.25, healthcare 1.15, industrial 1.3, data centre 1.2); the equipment age factors (× 1.0, 1.05, 1.15); the repair factors (× 1.0, 1.1, 1.2); the multi-building factor max(0.6, 1 − 0.05 × count); the existing-automation factor × 0.7; the 5-year horizon; the 3.2 × and 5.8 × tile factors.

**Removed:** the per-sector `energySavingsRange`; the goal multipliers, with the code comment "No multipliers for selected goals: stating a priority cannot change how much energy a building physically saves."; the single 25 EUR/m² rate.

**Sector cards.** All six `paybackInfo` strings read "Amortizare: 1-3 ani optimizare, 3-6 ani sistem nou" / "Payback: 1-3 yrs optimisation, 3-6 yrs new system". The engine never produces them.

**Still not present:** an energy price, any kWh quantity, the HVAC share of the bill, operating hours, an escalation or discount rate, a BMS running cost, a VAT basis, a price date, an exchange rate, a baseline year, a question about today's automation class, and any EN ISO 52120-1 factor.

### 6.5 Formula, step by step

Source: `calculateROI` in `lib/roi-calculator.ts`. It runs when "Calculează ROI" is pressed, and again whenever the domain changes on the results screen.

1. **No sector.** Every output is 0 and the payback strings are "0".
2. **Savings %.** Take the band for the chosen domain. Start at its typical value. Add the sector bonuses (6.4). Cap at the band maximum. The low and high percentages are the band's min and max, whatever the answers.
3. **Energy savings** = annual energy cost × savings % / 100. Low and high use the band's min and max.
4. **Maintenance savings** = maintenance budget × (maintenance multiplier − 1), as on `main` (2.6 steps 4 and 5). It has no range.
5. **Total annual savings** = energy + maintenance. Low = low energy + maintenance. High = high energy + maintenance.
6. **Implementation cost.** Total area = area × max(1, number of buildings). Discount = max(0.6, 1 − 0.05 × count) when there is more than one building, times 0.7 with existing automation. Cost = total area × the sector's typical rate × discount. Low and high use the sector's min and max rates.
7. **Budget.** If a budget above 0 was typed, it becomes the point cost. The low cost becomes the lower of the band low and the budget. The high cost becomes the higher of the band high and the budget.
8. **Payback (months).** Point = cost / (total savings / 12). Low = low cost / (high savings / 12). High = high cost / (low savings / 12). A total of 0 or less gives 0.
9. **Payback (years)** = months / 12, one decimal (`toFixed(1)`), for the point, low and high.
10. **Five-year net benefit** = total savings × 5 − point cost.
11. **ROI %** = round(net benefit / point cost × 100). A cost of 0 gives 0.

**The cap never acts, as on `main` (2.9).** The largest point percentage the answers can reach stays below every band maximum:

| Domain (max) | hospitality | office | retail | healthcare, industrial, data centre |
|--------------|-------------|--------|--------|--------------------------------------|
| `whole_building` (15) | 11 | 12 | 10 | 8 |
| `hvac` (20) | 18 | 19 | 17 | 15 |
| `fdd` (15) | 12 | 13 | 11 | 9 |

### 6.6 Outputs

Source: `ResultsReport` in `app/calculator-roi/page.tsx`. Money is still formatted with `Intl.NumberFormat("ro-RO")` to whole euros.

| Place | `main` | Branch |
|-------|--------|--------|
| "ROI 5 ani" | Point | Point, from the point savings and point cost |
| "Recuperare invest." | Point, "6.0 ani" | Range, "<low>-<high> ani", for example "1.4-5.2 ani" |
| "Economii/an" | Point | Range |
| "Beneficiu net 5 ani" | Point | Point |
| "Economii energie/an" | Point, sub-line "<pct>% reducere" | Range, sub-line "<min>-<max>% <domain label>" |
| "Economii mentenanță/an" | Point | Point |
| "Cost estimat implementare" | Point | Range |
| "An 1", "An 3", "An 5" | Point savings × 1, 3.2 and 5.8 | Unchanged, from the point savings |
| Share text (WhatsApp, email) | "economii anuale de <X> EUR ... amortizare în <Y> ani" | The same sentence with the savings range and the payback range |

**What the point values reach.** The point savings % is not displayed. It, and therefore every step 3 answer, reaches only "ROI 5 ani", "Beneficiu net 5 ani" and the three year tiles. Every displayed range comes from the band's min and max, the maintenance term and the cost band. So the step 3 answers never move a range.

**New on the page.**
- **Hero.** Eyebrow "Calculator de economie" / "Savings calculator". H1 "Calculator de economie și amortizare: rezultate ca interval, cu domeniul declarat" / "Savings and payback calculator: results as ranges, with the domain declared". Sub-line: "Calculatorul estimează investiția, economia anuală și perioada de amortizare pentru un sistem BMS, pornind de la tipul clădirii, dimensiune și consum. Toate rezultatele apar ca interval, nu ca cifră unică, iar procentul de economie apare întotdeauna cu domeniul lui: din consumul total al clădirii sau din consumul HVAC. Estimarea nu este ofertă."
- **Method link on every step and on the results.** "Cum calculăm estimarea" / "How we calculate the estimate", with "Bazat pe standardul european EN ISO 52120-1. Vezi formula, sursele și ce economii s-au măsurat în proiecte reale." It links to `/calculator-roi/metodologie`.
- **Disclosure under the results tiles.** "Estimare bazată pe intervale publicate în studii măsurate și pe standardul EN ISO 52120-1, nu o ofertă. Cifra reală rezultă din lista de puncte și din datele de consum ale clădirii." Button "Cum am calculat" / "How we calculated this".
- **Domain selector** in the breakdown (6.3).
- **Unchanged:** "Recalculează", "Vrei o propunere detaliată?" with both buttons to `/contact` and no data passed, "Descarcă PDF" (print dialog), LinkedIn sharing the bare address, "Copiază link".

Nothing is stored or sent, as on `main`. See `company/business/lead-funnels.md` section 8.

### 6.7 Worked examples

Computed for this document by an independent re-implementation of 6.5, not by running the website code. The inputs are those of 2.8, with the default domain (whole building). Goals no longer matter.

| | A: placeholder values (hospitality) | B: office, every bonus | C: office, 3 buildings, existing automation |
|---|---|---|---|
| "Economii energie/an" sub-line | "5-15% din consumul total al clădirii" | same | same |
| Point savings % (not shown) | 8 | 12 | 8 |
| "Economii energie/an" | 12,500-37,500 | 12,500-37,500 | 12,500-37,500 |
| "Economii mentenanță/an" | 25,075 | 32,800 | 19,300 |
| "Economii/an" | 37,575-62,575 | 45,300-70,300 | 31,800-56,800 |
| "Cost estimat implementare" | 90,000-195,000 | 135,000-270,000 | 240,975-481,950 |
| "Recuperare invest." | "1.4-5.2 ani" | "1.9-6.0 ani" | "4.2-15.2 ani" |
| Point savings and point cost behind the ROI (not shown) | 45,075 and 135,000 | 62,800 and 195,000 | 39,300 and 348,075 |
| "ROI 5 ani" | 67 % | 61 % | −44 % |
| "Beneficiu net 5 ani" | 90,375 | 119,000 | −151,575 |
| "An 1" and "An 5" tiles | 45,075 and 261,435 | 62,800 and 364,240 | 39,300 and 227,940 |
| On `main` (2.8): payback, ROI | "6.0 ani", −17 % | "3.0 ani", 66 % | "3.2 ani", 55 % |

- **Example C changes sign.** The branch multiplies the area by the number of buildings, so 15,000 m² becomes 45,000 m². On `main` the ROI is +55 %; on the branch it is −44 %.
- **The HVAC domain applies an HVAC percentage to the whole bill.** Example A with `hvac`: energy savings 25,000-50,000, "Economii/an" 50,075-75,075, payback "1.2-3.9 ani", ROI 132 %. The label says "din consumul HVAC", but no HVAC share of the bill is asked or used. The `fdd` label names no base at all, and its percentage also acts on the whole bill.
- **Switching to FDD changes the label and the single figures, not the ranges.** Example A with `fdd` shows the same ranges as with `whole_building` (the same 5-15 % band), under the label "cu analitică peste un BMS existent". Only the single figures move, because the typical value is 9 instead of 8: "ROI 5 ani" 76 %, "Beneficiu net 5 ani" 102,875, "An 1" 47,575.
- **A typed budget moves the ROI but may not show in the cost tile.** Example A with a 100,000 EUR budget: the cost range stays 90,000-195,000 because the budget lies inside it. "ROI 5 ani" becomes 125 % and "Beneficiu net 5 ani" 125,375. With 50,000 EUR the cost range becomes 50,000-195,000, payback "0.8-5.2 ani" and ROI 351 %. With 300,000 EUR it becomes 90,000-300,000, payback "1.4-8.0 ani" and ROI −25 %.
- **The methodology page's example cannot be reproduced** (6.9, point 1). For its hotel (5,000 m², 200,000 EUR a year) the engine gives energy savings of 10,000-30,000 EUR (point 16,000) and a cost of 30,000-65,000 EUR (point 45,000), plus a maintenance term, because step 4 requires a maintenance budget above 0. The page shows 24.3 %, 48,600 EUR a year, 65,000 EUR and 16 months.

### 6.8 The methodology page (`/calculator-roi/metodologie`)

Source: `components/roi-methodology.tsx` and `app/calculator-roi/metodologie/page.tsx`. It is linked from every calculator step, the results screen, the resources hub and the sitemap.

**Metadata.** Title "Cum calculăm estimarea ROI | Sovitech Control". Description "Metodologia completă din spatele calculatorului ROI Sovitech: standardul EN ISO 52120-1, factorii de eficiență pe tip de clădire, formula pas cu pas și economiile măsurate în studii de teren. Transparent, cu surse." Open Graph description "Estimarea nu vine dintr-o formulă inventată de noi, ci din standardul european EN ISO 52120-1. Îți arătăm fiecare pas și fiecare sursă."

**Evidence badges.** Five labels: "Standard european" / "European standard", "Studiu măsurat" / "Measured study", "Preț oficial" / "Official price", "Ipoteză Sovitech" / "Sovitech assumption", "Fapt legal" / "Legal fact".

**Hero.** Breadcrumb "Calculator ROI / Cum calculăm". Eyebrow "Transparență". H1 "Estimarea ta nu vine dintr-o formulă inventată de noi." / "Your estimate does not come from a formula we made up." Sub-line "Vine dintr-un standard european, și îți arătăm exact cum, pas cu pas. Îți arătăm și ce economii s-au măsurat în proiecte reale, nu doar ce promite standardul."

**1. "Cele 4 clase de automatizare" / "The 4 automation classes".** Intro: "Clasa în care se află clădirea ta acum decide cât poți economisi, mai mult decât tipul clădirii." Four cards with the hotel thermal factors:

| Class | Name RO / EN | Factor shown | Tag |
|-------|--------------|--------------|-----|
| D | "Fără automatizare în rețea" / "No networked automation" | 1,31 | |
| C | "Automatizare standard (referința)" / "Standard automation (the reference)" | 1,00 | "Referință" / "Reference" |
| B | "Automatizare avansată" / "Advanced automation" | 0,85 | |
| A | "Performanță energetică ridicată" / "High energy performance" | 0,68 | "Ținta noastră" / "What we build" |

The note under the cards: "Un factor de 0,68 înseamnă un consum de 68% față de referință, adică o economie de 32%."

**2. "Formula, pas cu pas" / "The formula, step by step".** Intro: "Exemplu complet pentru un hotel de 5.000 m², cu 200.000 EUR/an cost de energie, aflat astăzi în clasa C. Poți reface fiecare pas cu un calculator de buzunar."

| Step | Text RO | Result | Badge |
|------|---------|--------|-------|
| 1 | "Hotel, clasa A: factor termic 0,68 · factor electric 0,90" | | Standard european |
| 2 | "0,65 × 0,68 + 0,35 × 0,90  (presupunem 65% termic)" | "0,757" | Ipoteză Sovitech |
| 3 | "1 − 0,757" | "24,3%" | Standard european |
| 4 | "200.000 EUR/an × 24,3%" | "48.600 EUR/an" | Standard european |
| 5 | "5.000 m² × 13 EUR/m² = 65.000 EUR ÷ (48.600 ÷ 12)" | "16 luni" | Ipoteză Sovitech |

Then: "Dacă aceeași clădire pornește din clasa D (fără nicio automatizare), standardul indică 38,3%, adică 76.500 EUR/an și o amortizare de circa 10 luni." The arithmetic checks: 65,000 / (48,600 / 12) = 16.0 months, and 65,000 / (76,508 / 12) = 10.2 months.

**3. "Ce spune standardul vs. ce se măsoară în realitate".**

| Row RO | Value | Badge | Source shown |
|--------|-------|-------|--------------|
| "Potențial tehnic, conform standardului (clasa C → A)" | "22–24%" | Standard european | EN ISO 52120-1:2022 |
| "Măsurat: instalare BMS nou, 20 de clădiri" | "~13%" "(−10% … +29%)" | Studiu măsurat | Wheeler, 1994 |
| "Măsurat: reoptimizarea unui sistem existent, 1.482 de clădiri" | "6,4%" "(3,4 – 12,4%)" | Studiu măsurat | Crowe et al., 2020 |
| "Măsurat: cu monitorizare continuă, în anul 5" | "19%" | Studiu măsurat | Kramer et al., 2019 |

Two text blocks follow. "De ce apare diferența" credits commissioning quality, operator discipline and continuous monitoring. "Economiile scad dacă nu sunt întreținute" gives 61 % persistence for electricity, 42 % for gas, and savings growing to 19 % by year five with continuous monitoring.

**4. "De unde vin cifrele" / "Where the numbers come from".**

| Row RO | Value | Badge | Source shown |
|--------|-------|-------|--------------|
| "Factorii de eficiență pe tip de clădire" | "0,50 – 1,56" | Standard european | EN ISO 52120-1:2022 |
| "Economii măsurate în proiecte reale" | "6,4% – 13%" | Studiu măsurat | Energy and Buildings 227:110408 (2020) |
| "Persistența economiilor după primul an" | "61%" | Studiu măsurat | ASHRAE Journal, 2019 |
| "Preț energie electrică, industrial România" | "0,1887 EUR/kWh" | Preț oficial | Eurostat, S2 2025 |
| "Cost de implementare" | "9-18 EUR/m² (birouri)" | Ipoteză Sovitech | "Sovitech · cf. Waide 2014: 28,70 EUR/m²" |
| "Ponderea termic / electric din factură" | "45 – 65%" | Ipoteză Sovitech | Sovitech |
| "Obligația de a avea BMS peste 290 kW" | "31.12.2024" | Fapt legal | Legea 372/2005, art. 27 alin. (5) |

A collapsible "Vezi tabelul complet de factori din EN ISO 52120-1 ▾" shows the thermal factors, "Sursă: EN ISO 52120-1:2022, reprodus în documentația BRE, Siemens și Beckhoff":

| Building type (as shown) | D | C | B | A |
|--------------------------|---|---|---|---|
| "Birouri / Offices" | 1,51 | 1,00 | 0,80 | 0,70 |
| "Hoteluri / Hotels" | 1,31 | 1,00 | 0,85 | 0,68 |
| "Restaurante / Restaurants" | 1,23 | 1,00 | 0,77 | 0,68 |
| "Retail / Wholesale & retail" | 1,56 | 1,00 | 0,73 | 0,60 |
| "Spitale / Hospitals" | 1,31 | 1,00 | 0,91 | 0,86 |
| "Educație / Education" | 1,20 | 1,00 | 0,88 | 0,80 |

It adds that electrical factors are closer to 1 ("0,87 la birouri în clasa A") and that the standard publishes no factors for industrial buildings, storage and data centres.

**5. "Ce NU include estimarea" / "What the estimate does not include".** Six points: it is an estimate, not a contractual guarantee; no energy price changes ("energia electrică industrială a crescut cu 15,4% într-un an"); no discounting (NPV) and no maintenance contract or licence cost; it assumes correct commissioning and use as designed; real savings depend mainly on how automated the building already is; for industrial buildings and data centres "cifrele vin din experiența noastră de proiect, nu din standard".

**6. "Ce cere legea în România" / "What Romanian law requires".** Badge "Fapt legal". "Legea 372/2005, art. 27 alin. (5) și art. 29 alin. (6): clădirile nerezidențiale cu sisteme de peste 290 kW trebuiau echipate cu sisteme de automatizare până la 31 decembrie 2024, acolo unde este fezabil tehnic și economic." Then three points: "Legea nu prevede amendă pentru lipsa sistemului."; "Clădirile cu automatizare funcțională sunt scutite de inspecțiile periodice obligatorii."; "Pragul european de 70 kW este o cerință UE viitoare, încă netranspusă în România."

**7. "De la estimare la ofertă fermă" / "From estimate to firm quote".** Four steps: "Estimarea online" ("Orientativă, în două minute."), "Auditul la fața locului", "Calculul detaliat", "Oferta fermă" ("Cu economii calculate pe date măsurate, nu pe medii."). Buttons "Solicită auditul" / "Request the audit" to `/cerere-oferta` and "Înapoi la calculator" to `/calculator-roi`.

### 6.9 Where the branch contradicts itself

1. **The page describes a method the calculator does not use.** The page, the results disclosure and the method link all say the estimate is based on EN ISO 52120-1 and its class factors. The page says "Poți reface fiecare pas cu un calculator de buzunar." The engine has no class factor and asks no automation class. It applies domain bands to the typed energy cost, whatever the sector. The page's example cannot be produced by the calculator (6.7).
2. **The example's cost rate is not the engine's rate for a hotel.** The page uses 13 EUR/m². The engine's hotel band is 6 / 9 / 13, so 13 is its maximum; 13 is the office typical rate. The sources row cites "9-18 EUR/m² (birouri)".
3. **The cost bands disagree with the research.** The research calls 25 EUR/m² "reasonable" and puts a conventional whole-building BMS at about €28-40/m². The engine uses 3 to 18 EUR/m². The page cites "cf. Waide 2014: 28,70 EUR/m²" beside a 9-18 band.
4. **The bands have no traceable source in the repository.** They match other branch marketing copy, not the research. The cost bands match the price article `components/articles/cost-sistem-bms.tsx` (6.4), which cites no source for them. The savings bands (10-20 % of HVAC consumption, 5-15 % of whole-building consumption) also appear in that article and in the pillar guide `components/articles/sisteme-bms-cladiri.tsx`, again without a source. The engine's source strings "ACEEE" and "LBNL SEAC" name no document, and neither band appears in the research document. The `whole_building` band (5-15 %, typical 8 %) cites Crowe 2020 and Kramer 2019, whose figures in the research are a 6.4 % median (IQR 3.4-12.4 %) and 19 % by year five. The code cites "doc 12", and the pillar guide says its bands were aligned to a "registrul de cifre". Neither is in the repository.
5. **The legal statement is published although the research says to check it.** The page badges "31.12.2024" as "Fapt legal". The research lists the Romanian transposition as "NOT CONFIRMED" and advises a legal check before publishing a Romanian deadline.
6. **"Ranges, not single figures" is only partly true.** The hero promises "Toate rezultatele apar ca interval". "ROI 5 ani", "Beneficiu net 5 ani", the maintenance savings and the three year tiles are single figures.
7. **The hero names two domains; the selector has three.** The hero says the percentage carries its domain, "din consumul total al clădirii sau din consumul HVAC". The selector adds "cu analitică peste un BMS existent", which names no base.
8. **Sample sizes and labels are mixed.** The page gives "1.482 de clădiri" for the 6.4 % re-commissioning median. In the research, 1,482 is the whole dataset and 6.4 % is the median of 446 projects. The sources row gives "6,4% – 13%" and cites only Crowe 2020; the 13 % is Wheeler 1994. The page calls the Eurostat price "industrial"; the research calls it non-household.
9. **The factor range cites a type the page omits.** "0,50 – 1,56" includes 0.50 (lecture halls, class A), which is not in the page's factor table.
10. **Edition.** The page labels its combined thermal table "EN ISO 52120-1:2022". The research says the 2022 edition splits thermal into heating and cooling with different values, and cross-checks the combined table against EN 15232 sources (see `roi-methodology-research.md`, note 3).
11. **The limitations still name sector-specific figures.** The page says industrial and data centre figures come from project experience. The engine no longer has sector-specific savings figures.
12. **The sector cards still carry typed payback text.** "1-3 ani optimizare, 3-6 ani sistem nou" is typed, and the engine does not produce it.

### 6.10 What the research recommended, and what the branch applied

The research document's part D lists ten changes to `main`'s engine, in order of impact. Its part B audit reaches the same findings as 2.9 and 5.6 of this file.

| Part D item | On the branch |
|-------------|---------------|
| 1. Scale the cost with total area | Applied: area × number of buildings. The label still reads "Suprafața clădirii (m²)", so the area is now read as per building. |
| 2. Remove the goal multipliers | Applied |
| 3. Ask the current automation class and derive the % from the standard | Not applied. No class question exists, and no EN ISO 52120-1 factor is in the engine. |
| 4. Healthcare 10-25 %; no standard framing for industrial and data centre | Superseded. The engine no longer has sector savings ranges; every sector gets the domain bands. The page still frames industrial and data centre separately (6.9, point 11). |
| 5. Split thermal and electrical | Not applied |
| 6. Re-scope maintenance savings | Not applied. Unchanged, and still in the headline figures. |
| 7. Fix or delete the `paybackInfo` strings | Replaced by one uniform typed string, still not produced by the engine |
| 8. Disclaimer on the results and the share text | Partly. The results screen says "nu o ofertă". The share text has none. |
| 9. Editable energy price | Not applied. No energy price exists in the engine. |
| 10. Savings-persistence note | Not in the engine. The method page describes savings decay (6.8, section 3). |
| The cost rate | The research calls 25 EUR/m² "reasonable" and puts a conventional BMS at about €28-40/m². The engine now uses 3 to 18 EUR/m². |

One audit figure was not reproduced. Part B says the engine gives "20–31 months" for a hotel, against "10–15 luni" on the card. It does not state the inputs. Example A in 2.8 gives 6.0 years.

### 6.11 Against the app's guardrails: the branch version

As in section 5, this is not a verdict on the website. It sets out what the app could and could not carry over. Rule references are to `docs/guardrails.md` version 1.3.

| Rule | `main` (section 5) | Branch |
|------|--------------------|--------|
| 1. Unknown stays Unknown | `\|\| 0` on four inputs; a missing sector returns zeros | Unchanged |
| 1. Reuse is never assumed (G1-7) | Flat 30 % off from a checkbox | Unchanged |
| 2. The source is visible | No source anywhere | The method page puts a badge on each figure (standard, measured study, official price, Sovitech assumption, legal fact). The results screen shows none. No badge states verification. The engine's own source strings are not shown. |
| 6. Questions change an output | The timeframe, three goals, "Hot-desking" and others change nothing | Now all five goals change nothing, yet step 5 still requires one. The step 3 answers move only the single figures (6.6). A question that changes no output fails registry validation (G6-1). |
| 8. A % names its baseline | "20% reducere", no base | Each % names a domain. But the HVAC and FDD % act on the whole bill, and no period or baseline year is named. |
| 8. Area basis | None | None. The price article states its bands per "arie utilă" (usable area), but the calculator asks no basis. The area is now multiplied by the number of buildings while the label stays singular. |
| 8. Currency | No VAT basis, date or rate | Unchanged for the cost bands. The page's "0,1887 EUR/kWh" shows no VAT basis, although the research gives one. The rule 8 registry has no EUR/kWh or EUR/m² unit (dashboards spec 7.2.22, awaiting approval). |
| 9. Method and version shown | Neither | A method page is linked. No version is shown, and the method described is not the one the engine runs (6.9). |
| 9. Ranges come from the method | Point values only | Ranges come from typed band limits. With a typed budget outside the band, the low or high cost equals the point, where rule 9 requires low < value < high. |
| 9. Rounding | Whole euros; one decimal of years | Unchanged. Payback bounds round to the nearest tenth, not outward. Money is not cut to 2 or 3 significant figures (G9-1). |
| 9. No laundering | Goal multipliers inflate savings | Goal multipliers removed. Maintenance savings are still a fixed share of a typed budget. |
| 9. Breakdown and total (G9-8) | Parts do not sum when a goal factor applies | Energy range plus maintenance equals the "Economii/an" range |
| 9. Tiles and series (G9-9) | "An 5" 5.8 × against the 5 × net benefit | Unchanged |
| 10. Stage 1 "Indicative range" is always a range | One cost figure | The cost is a range, but "ROI 5 ani" and "Beneficiu net 5 ani" come from a single point cost |
| 10. A typed budget | Replaces the cost | Replaces the point cost behind the ROI. No rule forbids this in the app yet (dashboards spec 7.2.20, awaiting approval). |
| 10. Savings carry their assumptions | None | The page lists what is excluded. Energy price, operating hours and baseline are still not asked or shown with the results. |
| 10. Never reads as a quotation | No statement | "nu o ofertă" on the results and "Estimarea nu este ofertă" in the hero |
| 11. BAC class and legal claims | Not applicable | The page tags class A "Ținta noastră" / "What we build" and badges the 290 kW deadline "Fapt legal". In the app a BAC-class link reads "aims to support" until an engineer verifies it, thresholds come from reference data with their date, whether an obligation applies stays Unknown until the facts are engineer-verified, and the app never attests compliance. |

**What moves in the app's direction.** Ranges on the main results, with best case paired against worst case. A named domain on every percentage. No goal multipliers, so the breakdown now sums. Source labels on the method page. An explicit "not an offer". Measured evidence shown beside modelled potential, with a list of what the estimate leaves out.

**Reserved terms in the new copy.** The reserved-term check (2.8) would flag these if the copy were reused as-is. Matching is whole-word and ignores case and diacritics, so a negation is still flagged.

| Text | Term | Source |
|------|------|--------|
| "... îți arătăm exact cum, pas cu pas."; "... ci exact munca pentru care ne angajezi." | exact | `components/roi-methodology.tsx` |
| "Potențial tehnic, conform standardului"; "... utilizarea clădirii conform proiectului." | conform | `components/roi-methodology.tsx` |
| "De la estimare la ofertă fermă" / "From estimate to firm quote"; "Oferta fermă" / "The firm quote" | ofertă fermă, ofertă / quote | `components/roi-methodology.tsx` |
| "... nu o ofertă." / "... not an offer."; "Estimarea nu este ofertă." / "The estimate is not an offer." | ofertă / offer | `app/calculator-roi/page.tsx` |
| "Final details for the most accurate cost and ROI estimate." (unchanged) | final | `app/calculator-roi/page.tsx` |
| "Conformitate & ESG" (unchanged) | conformitate | `app/calculator-roi/page.tsx` |

**Can the app use any of this?** No, not as it stands. The engine's bands have no traceable source (6.9, point 4). The research's figures are unverified and would need an approved, versioned reference dataset, which is a loosening (section 10; test case G1-12). What each group could become is set out after the index in `roi-methodology-research.md`.

**Test cases the branch exposes.** None is added here, because this task writes only this file, `lead-funnels.md` and `roi-methodology-research.md`. Each tests a rule as it stands, so it could be added under `tests/guardrails/` and indexed in `docs/guardrails.md` section 7 without approval.
- A percentage whose baseline names a subset (HVAC) is applied only to a value of that subset (rule 8, "A saving in % names its baseline").
- A method description linked from an estimate is the formula id and version that produced it (rule 9).
- An estimate whose low bound equals its value fails the "low < value < high" check (rule 9).

### 6.12 Points to raise with SOVITECH

These affect the website, not the app build.

1. **Is the branch going live?** Answered: no. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. Sections 2 and 5 describe the current calculator, and this section stays as reference. Points 2 to 8 are about the branch version, so they matter only if SOVITECH reuses its ideas on `main`.
2. **The methodology page describes a formula the calculator does not use** (6.9, point 1). A reader who follows "Cum am calculat" cannot reproduce their own result.
3. **The HVAC and FDD domains apply their percentage to the whole energy bill** (6.7).
4. **The cost bands (3 to 18 EUR/m²) have no traceable source** and sit well below the research's own figures. They copy the branch's price article, which cites none. They also drop that article's own distinctions: hotels with room control (18-38) and pharma (30-80).
5. **The legal section is published with a "Fapt legal" badge** although the research lists it as not confirmed and asks for a lawyer's check.
6. **Example C changes from a +55 % to a −44 % five-year ROI** between `main` and the branch, because the area is now multiplied by the number of buildings while the label still reads "Suprafața clădirii".
7. **Step 5 still requires a goal that changes nothing.** With the multipliers removed, no goal reaches the formula.
8. **Which edition of the standard is current?** The branch cites "EN ISO 52120-1:2022". The app's guardrails write "EN ISO 52120-1:2021" (rule 11). The answer settles the website copy and would give the app's reference data its edition.
