# SOVITECH website audiences: the role pages

The eight audiences the SOVITECH website addresses on its role pages ("Pentru rolul tău"), with each audience's question, pains, messages and calls to action, in Romanian and English.

> **Unmerged branch. Reference only. Not SOVITECH's current position.** Everything in this file comes from the branch `origin/redesign-2026` of the website repository, commit `af813534041c387c07fc29a35c53bc9bd100c7fe` (`af81353`, 2026-08-27). The role pages were added in commit `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala"). The branch has not been merged into `main`, and `main` has no role pages. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. `main` is the current website.

**Source:** repository `Gaidenic13/sovitech-website`, branch `redesign-2026`. Paths are relative to the website repository root on that branch. A verbatim copy of each file is in `company/website/source-redesign-2026/`. Imported on 2026-09-24.

| File | What it holds |
|------|---------------|
| `lib/site-routes.ts` | `personaMeta`: each persona's id (P1 to P8), URL slug, role name and question; the route registry that tags content by persona |
| `lib/role-copy.ts` | Each persona's intro paragraph and "Pe scurt" bullets. A code comment names the source as "final copy doc C5 (copy_03_roluri.md), sections A1-A8", which is not in the repository, and says "RO is the source of truth; EN is a faithful translation." |
| `components/role-page.tsx` | The page layout and the call to action shared by all eight pages |
| `app/pentru/page.tsx` | The hub page `/pentru` |
| `app/pentru/[slug]/page.tsx` | The route and metadata for each role page |

**Status of the content.** Website marketing copy. Every figure below (costs, savings, paybacks, densities, retention periods, fines) and every legal statement (thresholds, deadlines, directives) is the website's claim, not verified engineering data, not approved reference data and not legal advice. See section 6 for what the app may use.

---

## 1. Summary

- **Eight audiences.** The personas come from "the editorial calendar" (code comment in `lib/site-routes.ts`). Each has a page at `/pentru/<slug>`. The hub `/pentru` lists all eight.
- **Built but hidden from search.** All eight pages are generated, but each carries `robots: { index: false, follow: true }`. A code comment says they are "Indexed once the article clusters feeding this role are published." `app/sitemap.ts` leaves them out for the same reason.
- **Hardly linked.** The header and footer do not link to them. Three service pages do: the integration page links "Pentru IT și OT" (`/pentru/it-ot`), the maintenance page links "Pentru facility manager" (`/pentru/facility-manager`) and the design page links "Pentru directorul tehnic" (`/pentru/director-tehnic`). Several articles mention a role page in text only, with a code note to add the link later.
- **One structure, one call to action.** Every role page has the same layout and ends with the same buttons (section 2).
- **Mostly planned content.** Each page lists the site's content tagged for that persona. Across the eight pages, most entries are planned articles and tools that do not exist yet. They show as plain text, not links.

| Id | Slug | Role (RO) | Role (EN) | Tagged entries: published / planned / alias |
|----|------|-----------|-----------|---------------------------------------------|
| P1 | `proprietari-si-investitori` | Proprietar / Dezvoltator / Investitor | Owner / Developer / Investor | 14 / 14 / 1 |
| P2 | `property-asset-manager` | Property & Asset Manager | Property & Asset Manager | 9 / 13 / 1 |
| P3 | `facility-manager` | Facility Manager | Facility Manager | 12 / 18 / 0 |
| P4 | `director-tehnic` | Director tehnic / Inginer-șef | Technical Director / Chief Engineer | 11 / 19 / 0 |
| P5 | `esg-sustenabilitate` | Manager ESG / Sustenabilitate | ESG / Sustainability Manager | 5 / 11 / 0 |
| P6 | `manager-industrial-pharma` | Manager industrial / Pharma | Industrial / Pharma Manager | 5 / 8 / 0 |
| P7 | `it-ot` | IT / OT Manager | IT / OT Manager | 3 / 4 / 0 |
| P8 | `proiectanti-antreprenori` | Proiectant MEP / Antreprenor general | MEP Designer / General Contractor | 3 / 6 / 0 |

Counts come from parsing `lib/site-routes.ts` with a script. "Alias" is the savings calculator entry, which redirects to `/calculator-roi`.

---

## 2. What every role page has

### 2.1 The hub page `/pentru`

Source: `app/pentru/page.tsx`.
- Label: "Pentru rolul tău" / "For your role".
- Heading: "Aceeași clădire, opt întrebări diferite" / "One building, eight different questions".
- Lead (RO): "Un proprietar întreabă ce riscă. Un facility manager întreabă cum operează mai bine cu ce are deja. Fiecare pagină adună ce este relevant pentru un singur rol."
- Lead (EN): "An owner asks what they are exposed to. A facility manager asks how to run the building better with what they already have. Each page collects what matters to one role."
- Metadata description (RO only): "Automatizarea clădirilor arată diferit din fiecare scaun: proprietar, asset manager, facility manager, director tehnic, ESG, industrial, IT/OT, proiectant."

### 2.2 Layout of a role page

Source: `components/role-page.tsx`, `app/pentru/[slug]/page.tsx`.
1. **Hero.** A back link "← Toate rolurile" / "All roles", the role name as the heading, and the role's question in quotation marks.
2. **Intro.** One paragraph that answers the question directly.
3. **"Pe scurt" / "At a glance".** Six bullets: the pains and the key messages.
4. **Content lists.** The content tagged for the persona, grouped as "Servicii" / "Services", "Ghiduri" / "Guides", "Articole" / "Articles", "Instrumente" / "Tools" and "Sectoare" / "Sectors". Published entries are links. Planned entries show as plain text with their description.
5. **Call to action.** The same on every page:
   - Heading: "Discută situația concretă cu un inginer Sovitech" / "Talk your specific situation through with a Sovitech engineer".
   - Buttons: "Cere o evaluare" / "Request an assessment" → `/cerere-oferta` (the quote form), and "Contact" → `/contact`.

The page title is the Romanian role name plus " | Sovitech Control". The meta description is the Romanian question.

---

## 3. The eight audiences

Each subsection gives the role, its question, the intro paragraph and the six "Pe scurt" bullets verbatim, then the published content the page links to. The tables were generated from `lib/role-copy.ts` and `lib/site-routes.ts` by a script, so the text matches the source exactly. The code's persona ids (P1 to P8) do not follow the copy document's section numbers (A1 to A8); both are given.

### 3.1 P1: Owner / Developer / Investor

- **URL:** `/pentru/proprietari-si-investitori`
- **Role (RO / EN):** "Proprietar / Dezvoltator / Investitor" / "Owner / Developer / Investor"
- **The role's question (RO / EN):** "Ce îmi afectează valoarea activului și ce amenzi risc?" / "What affects my asset value, and what penalties am I exposed to?"
- **Copy-doc section named in the code comment:** A2. Proprietari, dezvoltatori si investitori

**Intro paragraph.**

- RO: "Clădirile nerezidențiale cu sisteme tehnice de peste 290 kW putere nominală utilă trebuiau dotate cu sisteme de automatizare și control până la 31 decembrie 2024, conform Legii 372/2005, art. 27 alin. (5) și art. 29 alin. (6). Termenul a trecut. Pentru un proprietar, întrebarea nu mai este dacă investește, ci cât costă întârzierea și ce se întâmplă la următoarea evaluare a activului."
- EN: "Non-residential buildings with technical systems above 290 kW of effective rated output had to be fitted with building automation and control systems by 31 December 2024, under Law 372/2005, art. 27 para. (5) and art. 29 para. (6). That deadline has passed. For an owner, the question is no longer whether to invest, but what the delay costs and what happens at the next valuation of the asset."

**"Pe scurt" / "At a glance" bullets** (the pains and messages).

| # | RO (verbatim) | EN (site's) |
|---|---------------|-------------|
| 1 | Prag în vigoare astăzi: 290 kW putere nominală utilă a sistemelor tehnice, termen 31 decembrie 2024, lege română în vigoare. | Threshold in force today: 290 kW effective rated output of the technical systems, deadline 31 December 2024, Romanian law in force. |
| 2 | Prag viitor: 70 kW, termen 31 decembrie 2029, din Directiva (UE) 2024/1275. Obligație UE netranspusă încă în dreptul român. | Next threshold: 70 kW, deadline 31 December 2029, from Directive (EU) 2024/1275. An EU obligation not yet transposed into Romanian law. |
| 3 | Costul de referință al unui sistem BMS: 4-18 EUR/mp ca bandă agregată, 9-18 EUR/mp pentru birouri clasa A și 5-10 EUR/mp pentru clasa B. | Reference cost of a BMS: 4-18 EUR/sqm as an aggregate band, 9-18 EUR/sqm for class A offices and 5-10 EUR/sqm for class B. |
| 4 | Amortizare: 1-3 ani pentru optimizarea unui sistem existent și 3-6 ani pentru o modernizare de capital. | Payback: 1-3 years for optimising an existing system and 3-6 years for a capital modernisation. |
| 5 | Economie documentată: 5-15% din consumul total al clădirii, în studii independente pe peste 1.000 de proiecte. Cifra nu este o promisiune pentru o clădire anume. | Documented savings: 5-15% of the building's total consumption, in independent studies covering over 1,000 projects. The figure is not a promise for any specific building. |
| 6 | MEPS aduce renovarea celor mai slabe 16% dintre clădirile nerezidențiale până în 2030 și 26% până în 2033. Obligație UE, netranspusă. | MEPS brings renovation of the worst performing 16% of non-residential buildings by 2030 and 26% by 2033. An EU obligation, not yet transposed. |

**Linked content.** 29 registry entries are tagged P1: 14 published (shown as links), 14 planned (shown as plain text, no link), 1 alias (links to its target). Published and alias entries:

- Servicii / Services: "Proiectare automatizări și BMS" (`/servicii/proiectare-automatizari-bms`); "Execuție sisteme BMS" (`/servicii/executie-sisteme-bms`); "Modernizare sisteme de automatizare și BMS" (`/servicii/modernizare-sisteme-de-automatizare-si-bms`); "Consultanță" (`/servicii/consultanta`)
- Ghiduri / Guides: "Sistem BMS pentru clădiri: ghidul complet" (`/ghid/sisteme-bms-cladiri`)
- Articole / Articles: "Obligația BACS: Legea 372/2005 și pragul de 290 kW" (`/resurse/obligatie-bacs-legea-372-2005`); "Cât costă un sistem BMS în România" (`/resurse/cost-sistem-bms`); "EPBD 2024: ce se schimbă pentru clădirile nerezidențiale din România" (`/resurse/epbd-2024-romania`); "Ce este un sistem BMS și cu ce nu trebuie confundat" (`/resurse/ce-este-un-sistem-bms`); "Monitorizarea calității aerului interior: ce prevede EPBD" (`/resurse/monitorizare-calitate-aer-epbd`)
- Instrumente / Tools: "Calculator: economia estimată dintr-un BMS" (`/instrumente/calculator-economie-energie-bms` → `/calculator-roi`)
- Sectoare / Sectors: "Clădiri de birouri" (`/expertiza/cladiri-de-birouri`); "HORECA" (`/expertiza/horeca`); "Educație & Instituții" (`/expertiza/educational`); "Sport & Wellness" (`/expertiza/sport-si-wellness`)

### 3.2 P2: Property & Asset Manager

- **URL:** `/pentru/property-asset-manager`
- **Role (RO / EN):** "Property & Asset Manager" / "Property & Asset Manager"
- **The role's question (RO / EN):** "Ce măsor și ce raportez lunar?" / "What do I measure, and what do I report each month?"
- **Copy-doc section named in the code comment:** A3. Property si asset manager

**Intro paragraph.**

- RO: "Un property sau asset manager răspunde în fața proprietarului cu cifre, iar în fața chiriașilor cu confort și cu facturi corecte. Sistemul BMS produce datele pentru ambele: consum pe zonă și pe chiriaș, orele de funcționare a instalațiilor, reclamațiile de confort corelate cu măsurători. Fără contorizare secundară, repartiția pe chiriaș rămâne o estimare, oricât de bun ar fi softul de administrare."
- EN: "A property or asset manager answers to the owner with numbers, and to the tenants with comfort and correct invoices. The BMS produces the data for both: consumption per zone and per tenant, plant running hours, comfort complaints correlated with measurements. Without submetering, tenant cost allocation remains an estimate, however good the administration software."

**"Pe scurt" / "At a glance" bullets** (the pains and messages).

| # | RO (verbatim) | EN (site's) |
|---|---------------|-------------|
| 1 | Raportul lunar are nevoie de 10 indicatori, nu de 40. Fiecare cu definiție, formulă, sursă a datei în clădire și valoare de referință. | The monthly report needs 10 indicators, not 40. Each with a definition, a formula, the data source in the building and a reference value. |
| 2 | Comparația an la an este cerința de bază a oricărei raportări. Ea presupune minimum 24 de luni de date la rezoluție completă. | Year-on-year comparison is the baseline requirement of any reporting. It needs at least 24 months of data at full resolution. |
| 3 | Rezoluția utilă pentru energie electrică este de 15 minute, pentru că este intervalul de decontare din piața de energie. | The useful resolution for electricity is 15 minutes, because that is the settlement interval of the energy market. |
| 4 | Costul de operare al sistemului: 4-7% din valoarea investiției pentru contractul de bază, 7-12% pentru cel extins. | Operating cost of the system: 4-7% of the investment value for the basic contract, 7-12% for the extended one. |
| 5 | Reclamațiile de confort se rezolvă cu măsurare, nu cu ajustări repetate de setpoint. Măsurarea presupune temperatură pe zone, CO2 și ore de ocupare. | Comfort complaints are solved by measuring, not by repeated setpoint adjustments. Measuring means zone temperatures, CO2 and occupancy hours. |
| 6 | Economia documentată în literatura măsurată este de 5-15% din consumul total al clădirii pentru optimizare, cu amortizare de 1-3 ani. | Savings documented in the measured literature are 5-15% of the building's total consumption for optimisation, with 1-3 year payback. |

**Linked content.** 23 registry entries are tagged P2: 9 published (shown as links), 13 planned (shown as plain text, no link), 1 alias (links to its target). Published and alias entries:

- Servicii / Services: "Întreținere sisteme BMS" (`/servicii/intretinere-sisteme-bms`); "Modernizare sisteme de automatizare și BMS" (`/servicii/modernizare-sisteme-de-automatizare-si-bms`); "Consultanță" (`/servicii/consultanta`)
- Ghiduri / Guides: "De unde vin datele pentru raportarea ESG a unei clădiri" (`/ghid/date-esg-cladiri`)
- Articole / Articles: "Cât costă un sistem BMS în România" (`/resurse/cost-sistem-bms`); "10 indicatori (KPI) pentru orice clădire comercială" (`/resurse/kpi-performanta-cladire`)
- Instrumente / Tools: "Calculator: economia estimată dintr-un BMS" (`/instrumente/calculator-economie-energie-bms` → `/calculator-roi`)
- Sectoare / Sectors: "Clădiri de birouri" (`/expertiza/cladiri-de-birouri`); "Retail" (`/expertiza/retail`); "Entertainment" (`/expertiza/entertainment`)

### 3.3 P3: Facility Manager

- **URL:** `/pentru/facility-manager`
- **Role (RO / EN):** "Facility Manager" / "Facility Manager"
- **The role's question (RO / EN):** "Cum operez mai bine clădirea cu ce am deja?" / "How do I run the building better with what I already have?"
- **Copy-doc section named in the code comment:** A1. Facility manager

**Intro paragraph.**

- RO: "Un facility manager operează clădirea cu sistemul pe care îl are deja, nu cu unul ideal. Primele economii nu vin din echipamente noi: vin din programe orare corectate, senzori recalibrați, bucle de reglaj reparate și o listă de alarme pe care cineva chiar o citește. În clădirile unde reglajul era deficitar, literatura măsurată indică 10-20% din consumul HVAC."
- EN: "A facility manager runs the building with the system it already has, not with an ideal one. The first savings do not come from new equipment: they come from corrected time schedules, recalibrated sensors, repaired control loops and an alarm list somebody actually reads. In buildings where control was poor, the measured literature indicates 10-20% of HVAC consumption."

**"Pe scurt" / "At a glance" bullets** (the pains and messages).

| # | RO (verbatim) | EN (site's) |
|---|---------------|-------------|
| 1 | Problema zilnică nu este economia de energie, ci numărul de alarme. O matrice de alarme neprioritizată produce sute de evenimente pe zi și garantează că cele importante sunt ignorate. | The daily problem is not energy savings but the number of alarms. An unprioritised alarm matrix produces hundreds of events a day and guarantees the important ones are ignored. |
| 2 | Programele orare sunt prima cauză de risipă într-o clădire cu BMS funcțional: ventilație pornită în weekend, pornire prea devreme, regim redus dezactivat manual și niciodată repus. | Time schedules are the first cause of waste in a building with a working BMS: ventilation running at weekends, start-up too early, night setback disabled manually and never restored. |
| 3 | Senzorii de CO2 se decalibrează în 2-3 ani și aproape nimeni nu îi verifică. Un senzor decalibrat produce fie disconfort, fie ventilație inutilă plătită la factură. | CO2 sensors drift out of calibration in 2-3 years and almost nobody checks them. A drifted sensor produces either discomfort or useless ventilation paid on the bill. |
| 4 | Economia documentată în studii independente este de 5-15% din consumul total al clădirii pentru optimizare și recomisionare, cu amortizare de 1-3 ani. | Savings documented in independent studies are 5-15% of the building's total consumption for optimisation and recommissioning, with 1-3 year payback. |
| 5 | Mentenanța anuală costă 4-7% din valoarea investiției pentru un contract de bază și 7-12% pentru unul extins. | Annual maintenance costs 4-7% of the investment value for a basic contract and 7-12% for an extended one. |
| 6 | Documentația As-built, lista de puncte și backup-ul de configurație sunt livrabile, nu favoruri. Fără ele, orice intervenție ulterioară începe cu o zi de reverse engineering. | As-built documentation, the point list and the configuration backup are deliverables, not favours. Without them, any later intervention starts with a day of reverse engineering. |

**Linked content.** 30 registry entries are tagged P3: 12 published (shown as links), 18 planned (shown as plain text, no link). Published and alias entries:

- Servicii / Services: "Întreținere sisteme BMS" (`/servicii/intretinere-sisteme-bms`); "Modernizare sisteme de automatizare și BMS" (`/servicii/modernizare-sisteme-de-automatizare-si-bms`)
- Ghiduri / Guides: "Sistem BMS pentru clădiri: ghidul complet" (`/ghid/sisteme-bms-cladiri`)
- Articole / Articles: "Ce este un sistem BMS și cu ce nu trebuie confundat" (`/resurse/ce-este-un-sistem-bms`); "10 indicatori (KPI) pentru orice clădire comercială" (`/resurse/kpi-performanta-cladire`); "Monitorizarea calității aerului interior: ce prevede EPBD" (`/resurse/monitorizare-calitate-aer-epbd`)
- Sectoare / Sectors: "Clădiri de birouri" (`/expertiza/cladiri-de-birouri`); "HORECA" (`/expertiza/horeca`); "Industrial & Logistică" (`/expertiza/industrial`); "Educație & Instituții" (`/expertiza/educational`); "Sport & Wellness" (`/expertiza/sport-si-wellness`); "Entertainment" (`/expertiza/entertainment`)

### 3.4 P4: Technical Director / Chief Engineer

- **URL:** `/pentru/director-tehnic`
- **Role (RO / EN):** "Director tehnic / Inginer-șef" / "Technical Director / Chief Engineer"
- **The role's question (RO / EN):** "Ce arhitectură și ce sisteme îmi trebuie?" / "What architecture and which systems do I need?"
- **Copy-doc section named in the code comment:** A4. Director tehnic si inginer-sef

**Intro paragraph.**

- RO: "Un director tehnic decide arhitectura înainte de a decide furnizorul. Trei alegeri contează mai mult decât marca: unde stă inteligența de reglaj, ce protocoale traversează granițele dintre sisteme și cine deține, după recepție, programele și parolele de nivel inginer. Lista de puncte este primul lucru care lipsește din caietele de sarcini și ultimul care se cere la recepție."
- EN: "A technical director decides the architecture before deciding the vendor. Three choices matter more than the brand: where the control intelligence sits, which protocols cross the boundaries between systems, and who owns the programs and engineer-level passwords after handover. The point list is the first thing missing from specifications and the last thing asked for at handover."

**"Pe scurt" / "At a glance" bullets** (the pains and messages).

| # | RO (verbatim) | EN (site's) |
|---|---------------|-------------|
| 1 | Diferența de preț între două oferte BMS vine, de cele mai multe ori, din numărul de puncte, nu din marcă. O ofertă cu 30% mai ieftină are de obicei cu 30% mai puține puncte. | The price difference between two BMS offers comes, most of the time, from the number of points, not the brand. An offer 30% cheaper usually has 30% fewer points. |
| 2 | Densitatea de referință pentru birouri clasa A este de 50-90 de puncte la 1.000 mp. O clădire de 15.000 mp înseamnă 750-1.350 de puncte. | The reference density for class A offices is 50-90 points per 1,000 sqm. A 15,000 sqm building means 750-1,350 points. |
| 3 | Costul pe punct de date este de 90-320 EUR, în funcție de volum și de tipul punctului. | The cost per data point is 90-320 EUR, depending on volume and point type. |
| 4 | Protocoalele deschise se cer în caietul de sarcini, altfel integrarea ulterioară costă mai mult decât sistemul. | Open protocols must be required in the specification, otherwise later integration costs more than the system. |
| 5 | Punerea în funcțiune nu este conectare. Un punct conectat și afișat corect nu înseamnă o buclă de reglaj testată funcțional. | Commissioning is not wiring. A point connected and displayed correctly does not mean a functionally tested control loop. |
| 6 | Retenția minimă a datelor este de 24 de luni la rezoluție completă, pentru comparație an la an. | Minimum data retention is 24 months at full resolution, for year-on-year comparison. |

**Linked content.** 30 registry entries are tagged P4: 11 published (shown as links), 19 planned (shown as plain text, no link). Published and alias entries:

- Servicii / Services: "Proiectare automatizări și BMS" (`/servicii/proiectare-automatizari-bms`); "Execuție sisteme BMS" (`/servicii/executie-sisteme-bms`); "Integrare sisteme: KNX, DALI, Modbus, M-Bus" (`/servicii/integrare-sisteme-knx-dali-modbus-mbus`); "Modernizare sisteme de automatizare și BMS" (`/servicii/modernizare-sisteme-de-automatizare-si-bms`); "Consultanță" (`/servicii/consultanta`)
- Ghiduri / Guides: "Sistem BMS pentru clădiri: ghidul complet" (`/ghid/sisteme-bms-cladiri`); "Caiet de sarcini pentru un sistem BMS" (`/ghid/caiet-de-sarcini-bms`)
- Articole / Articles: "Obligația BACS: Legea 372/2005 și pragul de 290 kW" (`/resurse/obligatie-bacs-legea-372-2005`); "SCADA vs BMS: diferențe și când se folosește fiecare" (`/resurse/scada-vs-bms`)
- Sectoare / Sectors: "Medical" (`/expertiza/medical`); "Centre de date" (`/expertiza/centre-de-date`)

### 3.5 P5: ESG / Sustainability Manager

- **URL:** `/pentru/esg-sustenabilitate`
- **Role (RO / EN):** "Manager ESG / Sustenabilitate" / "ESG / Sustainability Manager"
- **The role's question (RO / EN):** "De unde vin datele din raportul meu?" / "Where does the data in my report come from?"
- **Copy-doc section named in the code comment:** A5. Manager ESG si sustenabilitate

**Intro paragraph.**

- RO: "Un raport de sustenabilitate se sprijină pe date care se nasc în clădire: contoare, senzori, controlere, sistem de supervizare, istoricizare. Lanțul are un singur punct slab care descalifică tot restul, iar acela este de obicei retenția prea scurtă sau rezoluția prea grosieră. Comparația an la an presupune minimum 24 de luni de date la rezoluție completă."
- EN: "A sustainability report rests on data born inside the building: meters, sensors, controllers, supervision system, historisation. The chain has a single weak link that disqualifies everything else, and that link is usually retention that is too short or resolution that is too coarse. Year-on-year comparison needs at least 24 months of data at full resolution."

**"Pe scurt" / "At a glance" bullets** (the pains and messages).

| # | RO (verbatim) | EN (site's) |
|---|---------------|-------------|
| 1 | Lanțul de date are cinci verigi: senzor și contor, controler, sistem BMS, istoricizare, raport. O verigă lipsă face raportul necontrolabil. | The data chain has five links: sensor and meter, controller, BMS, historisation, report. A missing link makes the report unverifiable. |
| 2 | Rezoluția pentru energie electrică este de 15 minute, intervalul de decontare din piața de energie. Pentru mediul interior, 5-15 minute. | Resolution for electricity is 15 minutes, the settlement interval of the energy market. For indoor environment, 5-15 minutes. |
| 3 | Retenție minimă: 24 de luni la rezoluție completă, inclusiv pentru punctele de mediu interior. Arhiva agregată, 5-10 ani. | Minimum retention: 24 months at full resolution, including indoor environment points. Aggregated archive, 5-10 years. |
| 4 | Monitorizarea calității mediului interior devine cerință UE de la 29 mai 2026, prin art. 13 alin. (10) lit. d) din Directiva 2024/1275. Obligație netranspusă în dreptul român. | Indoor environmental quality monitoring becomes an EU requirement from 29 May 2026, under art. 13 para. (10) letter d) of Directive 2024/1275. Not yet transposed into Romanian law. |
| 5 | CSRD se aplică, după Directiva (UE) 2026/470, entităților cu peste 1.000 de angajați și peste 450 mil. EUR cifră de afaceri, cu transpunere până la 19 martie 2027. | After Directive (EU) 2026/470, CSRD applies to entities with over 1,000 employees and over 450 million EUR turnover, with transposition due by 19 March 2027. |
| 6 | Economia raportabilă are nevoie de metodologie declarată: 12 luni de referință, 12 luni de comparație, normalizare la grade-zile și la ore de ocupare, domeniu declarat. | A reportable saving needs a declared methodology: 12 baseline months, 12 comparison months, normalisation to degree days and occupancy hours, and a declared domain. |

**Linked content.** 16 registry entries are tagged P5: 5 published (shown as links), 11 planned (shown as plain text, no link). Published and alias entries:

- Servicii / Services: "Consultanță" (`/servicii/consultanta`)
- Ghiduri / Guides: "De unde vin datele pentru raportarea ESG a unei clădiri" (`/ghid/date-esg-cladiri`)
- Articole / Articles: "EPBD 2024: ce se schimbă pentru clădirile nerezidențiale din România" (`/resurse/epbd-2024-romania`); "10 indicatori (KPI) pentru orice clădire comercială" (`/resurse/kpi-performanta-cladire`)
- Sectoare / Sectors: "Retail" (`/expertiza/retail`)

### 3.6 P6: Industrial / Pharma Manager

- **URL:** `/pentru/manager-industrial-pharma`
- **Role (RO / EN):** "Manager industrial / Pharma" / "Industrial / Pharma Manager"
- **The role's question (RO / EN):** "Cum îmi cresc fiabilitatea și conformarea?" / "How do I improve reliability and compliance?"
- **Copy-doc section named in the code comment:** A6. Manager industrial si pharma

**Intro paragraph.**

- RO: "Într-o unitate de producție farmaceutică sau industrială, sistemul de automatizare răspunde întâi de continuitate și de trasabilitate, apoi de energie. Diferența dintre un sistem de monitorizare validat și un set de dataloggere nu stă în senzori, ci în alarmare, în pista de audit, în controlul accesului și în documentația de calificare. Sovitech Control a livrat astfel de sisteme pentru Rompharm Co, Hyperion Pharma, Actavis și Monrol Eczacıbașı."
- EN: "In a pharmaceutical or industrial production unit, the automation system answers first for continuity and traceability, then for energy. The difference between a validated monitoring system and a set of dataloggers is not in the sensors but in alarming, the audit trail, access control and the qualification documentation. Sovitech Control has delivered such systems for Rompharm Co, Hyperion Pharma, Actavis and Monrol Eczacibasi."

**"Pe scurt" / "At a glance" bullets** (the pains and messages).

| # | RO (verbatim) | EN (site's) |
|---|---------------|-------------|
| 1 | Un sistem EMS validat diferă de dataloggere prin patru elemente: alarmare în timp real, pistă de audit, control al accesului pe roluri, documentație de calificare. | A validated EMS differs from dataloggers through four elements: real-time alarming, an audit trail, role-based access control and qualification documentation. |
| 2 | Costul unui sistem pentru zone farmaceutice este de 30-80 EUR/mp, pentru că include zone clasificate și monitorizare validată. | The cost of a system for pharmaceutical areas is 30-80 EUR/sqm, because it includes classified areas and validated monitoring. |
| 3 | Retenția datelor este dictată de conformare, nu de spațiul de stocare. Minimum 24 de luni la rezoluție completă și arhivă agregată pe 5-10 ani. | Data retention is dictated by compliance, not by storage space. At least 24 months at full resolution and a 5-10 year aggregated archive. |
| 4 | Annex 1 din GMP cere monitorizare continuă pentru zonele clasificate, cu praguri de alertă și de acțiune definite. | GMP Annex 1 requires continuous monitoring of classified areas, with defined alert and action limits. |
| 5 | NIS2, prin OUG 155/2024, se aplică și sistemelor OT. Amenzile ajung la 10 mil. EUR sau 2% din cifra de afaceri mondială pentru entitățile esențiale. | NIS2, through GEO 155/2024, also applies to OT systems. Fines reach 10 million EUR or 2% of worldwide turnover for essential entities. |
| 6 | Referințe reale în sector: Rompharm Co, Rompharm Uzbekistan, Hyperion Pharma, Actavis, Monrol Eczacıbașı, NTN-SNR Fabrica de Rulmenți Sibiu, Moncler Bacău, BMTI Strabag. | Real references in the sector: Rompharm Co, Rompharm Uzbekistan, Hyperion Pharma, Actavis, Monrol Eczacibasi, NTN-SNR bearing plant Sibiu, Moncler Bacau, BMTI Strabag. |

**Linked content.** 13 registry entries are tagged P6: 5 published (shown as links), 8 planned (shown as plain text, no link). Published and alias entries:

- Servicii / Services: "Integrare sisteme: KNX, DALI, Modbus, M-Bus" (`/servicii/integrare-sisteme-knx-dali-modbus-mbus`)
- Articole / Articles: "SCADA vs BMS: diferențe și când se folosește fiecare" (`/resurse/scada-vs-bms`)
- Sectoare / Sectors: "Industrial & Logistică" (`/expertiza/industrial`); "Medical" (`/expertiza/medical`); "Pharma" (`/expertiza/pharma`)

### 3.7 P7: IT / OT Manager

- **URL:** `/pentru/it-ot`
- **Role (RO / EN):** "IT / OT Manager" / "IT / OT Manager"
- **The role's question (RO / EN):** "Cum integrez și securizez sistemele conectate?" / "How do I integrate and secure the connected systems?"
- **Copy-doc section named in the code comment:** A7. IT si OT manager

**Intro paragraph.**

- RO: "Sistemele de automatizare a clădirii sunt echipamente de rețea cu ciclu de viață de 15 ani, actualizate rar și proiectate pentru disponibilitate, nu pentru securitate. Integrarea lor cu infrastructura IT cere segmentare, acces la distanță controlat și jurnalizare. OUG 155/2024, care transpune NIS2, aduce amenzi de până la 10 mil. EUR sau 2% din cifra de afaceri mondială pentru entitățile esențiale."
- EN: "Building automation systems are network equipment with a 15-year lifecycle, rarely updated and designed for availability, not security. Integrating them with the IT infrastructure requires segmentation, controlled remote access and logging. GEO 155/2024, which transposes NIS2, brings fines of up to 10 million EUR or 2% of worldwide turnover for essential entities."

**"Pe scurt" / "At a glance" bullets** (the pains and messages).

| # | RO (verbatim) | EN (site's) |
|---|---------------|-------------|
| 1 | Sistemele OT au alt ciclu de viață decât cele IT. Un controler rămâne în funcțiune 10-15 ani, iar o actualizare de firmware presupune oprirea instalației pe care o comandă. | OT systems have a different lifecycle than IT systems. A controller stays in service 10-15 years, and a firmware update means stopping the plant it commands. |
| 2 | Segmentarea este prima măsură cu efect real. Rețeaua de automatizare se separă de rețeaua de birou, cu reguli explicite pe traficul care traversează. | Segmentation is the first measure with real effect. The automation network is separated from the office network, with explicit rules for the traffic that crosses. |
| 3 | Accesul la distanță al integratorului se acordă controlat, pe sesiune, cu jurnalizare, nu prin conexiuni permanente. | The integrator's remote access is granted in a controlled way, per session, with logging, not through permanent connections. |
| 4 | NIS2, prin OUG 155/2024, se aplică entităților esențiale și importante. Amenzi de 10 mil. EUR sau 2% pentru cele esențiale, 7 mil. EUR sau 1,4% pentru cele importante. | NIS2, through GEO 155/2024, applies to essential and important entities. Fines of 10 million EUR or 2% for essential ones, 7 million EUR or 1.4% for important ones. |
| 5 | IEC 62443 oferă cadrul tehnic pentru zone și conduite, aplicabil și clădirilor, nu doar industriei de proces. | IEC 62443 provides the technical framework of zones and conduits, applicable to buildings too, not just the process industry. |
| 6 | Retenția jurnalelor și a datelor de proces se stabilește pe cerința de conformare, cu minimum 24 de luni pentru punctele care alimentează raportarea. | Retention of logs and process data is set by the applicable compliance requirement, with at least 24 months for the points feeding reporting. |

**Linked content.** 7 registry entries are tagged P7: 3 published (shown as links), 4 planned (shown as plain text, no link). Published and alias entries:

- Servicii / Services: "Integrare sisteme: KNX, DALI, Modbus, M-Bus" (`/servicii/integrare-sisteme-knx-dali-modbus-mbus`)
- Articole / Articles: "SCADA vs BMS: diferențe și când se folosește fiecare" (`/resurse/scada-vs-bms`)
- Sectoare / Sectors: "Centre de date" (`/expertiza/centre-de-date`)

### 3.8 P8: MEP Designer / General Contractor

- **URL:** `/pentru/proiectanti-antreprenori`
- **Role (RO / EN):** "Proiectant MEP / Antreprenor general" / "MEP Designer / General Contractor"
- **The role's question (RO / EN):** "Ce trebuie să specific și să predau?" / "What do I have to specify and hand over?"
- **Copy-doc section named in the code comment:** A8. Proiectant MEP si antreprenor general

**Intro paragraph.**

- RO: "Un proiectant MEP scrie documentul care decide licitația, iar un antreprenor general răspunde de ce se predă la recepție. Amândoi au aceeași problemă: partea de automatizare este specificată de obicei prea vag pentru a putea fi comparate ofertele și prea târziu pentru a mai putea fi coordonată cu celelalte specialități. Lista de puncte rezolvă ambele."
- EN: "An MEP designer writes the document that decides the tender, and a general contractor answers for what gets handed over at acceptance. Both share the same problem: the automation part is usually specified too vaguely for offers to be comparable and too late to still be coordinated with the other trades. The point list solves both."

**"Pe scurt" / "At a glance" bullets** (the pains and messages).

| # | RO (verbatim) | EN (site's) |
|---|---------------|-------------|
| 1 | Lista de puncte este primul lucru care lipsește din caietele de sarcini și ultimul care se cere la recepție. | The point list is the first thing missing from specifications and the last thing asked for at handover. |
| 2 | Densitatea de referință pentru birouri clasa A este de 50-90 de puncte la 1.000 mp, folosită pentru estimare, nu pentru ofertare. | The reference density for class A offices is 50-90 points per 1,000 sqm, used for estimating, not for bidding. |
| 3 | Costul pe punct de date este de 90-320 EUR, iar diferența dintre două oferte vine de obicei din numărul de puncte incluse. | The cost per data point is 90-320 EUR, and the difference between two offers usually comes from the number of points included. |
| 4 | Protocoalele se specifică explicit, împreună cu punctele pe care fiecare echipament trebuie să le expună. | Protocols are specified explicitly, together with the points each piece of equipment must expose. |
| 5 | Documentația de predat la recepție se enumeră în caietul de sarcini, altfel se negociază la final, în cel mai prost moment. | The documentation to be handed over is listed in the specification, otherwise it gets negotiated at the end, at the worst possible moment. |
| 6 | Sovitech Control livrează As-built ca parte a execuției, nu ca serviciu separat: scheme funcționale, scheme de tablou, liste de puncte, manuale de operare. | Sovitech Control delivers As-built documentation as part of execution, not as a separate service: functional diagrams, panel diagrams, point lists, operating manuals. |

**Linked content.** 9 registry entries are tagged P8: 3 published (shown as links), 6 planned (shown as plain text, no link). Published and alias entries:

- Servicii / Services: "Proiectare automatizări și BMS" (`/servicii/proiectare-automatizari-bms`); "Execuție sisteme BMS" (`/servicii/executie-sisteme-bms`)
- Ghiduri / Guides: "Caiet de sarcini pentru un sistem BMS" (`/ghid/caiet-de-sarcini-bms`)

---

## 4. Messages that recur across the audiences

The same few claims carry most of the eight pages. Persona ids in brackets.

- **The points list decides price, scope and acceptance.** "Lista de puncte este primul lucru care lipsește din caietele de sarcini și ultimul care se cere la recepție." (P4, P8). Price differences between offers come "din numărul de puncte, nu din marcă" (P4; P8 says the same in other words).
- **Handover is a deliverable.** As-built documentation, the points list, configuration backups, programs and engineer-level passwords belong to the client (P3, P4, P8).
- **Cost bands.** 4-18 EUR/mp aggregate, 9-18 EUR/mp class A offices, 5-10 EUR/mp class B (P1); 90-320 EUR per data point (P4, P8); 30-80 EUR/mp pharma (P6); 50-90 points per 1,000 m² for class A offices (P4, P8); maintenance 4-7% of the investment a year for a basic contract and 7-12% for an extended one (P2, P3). The same bands are on the services pages ([`pricing.md`](pricing.md) section 7).
- **Savings and payback, with a domain.** 5-15% of whole-building consumption from independent studies (P1, P2, P3); 10-20% of HVAC consumption where control was poor (P3); payback 1-3 years for optimisation (P1, P2, P3) and 3-6 years for a capital modernisation (P1). P1 adds: "Cifra nu este o promisiune pentru o clădire anume."
- **Data.** At least 24 months at full resolution (P2, P4, P5, P6, P7); 15-minute resolution for electricity, "intervalul de decontare din piața de energie" (P2, P5); 5-15 minutes for indoor environment and a 5-10 year aggregated archive (P5, P6); a monthly report of 10 indicators, "nu de 40" (P2).
- **Law and regulation.** Legea 372/2005, 290 kW, deadline 31 December 2024 (P1); Directive (EU) 2024/1275, 70 kW by 31 December 2029, not transposed (P1); indoor environmental quality monitoring from 29 May 2026 under art. 13(10)(d) of Directive 2024/1275, not transposed (P5); MEPS, 16% by 2030 and 26% by 2033 (P1); CSRD after "Directiva (UE) 2026/470", over 1,000 employees and 450 million EUR turnover, transposition by 19 March 2027 (P5); NIS2 through OUG 155/2024, fines of 10 million EUR or 2% for essential entities and 7 million EUR or 1.4% for important ones (P6, P7); GMP Annex 1 (P6); IEC 62443 (P7).
- **Operations before equipment.** First savings come from schedules, recalibrated sensors, repaired loops and a readable alarm list (P3). CO2 sensors drift in 2-3 years (P3). Segmentation and per-session remote access come first for OT security (P7).
- **Named references.** P6 names "Rompharm Co, Rompharm Uzbekistan, Hyperion Pharma, Actavis, Monrol Eczacıbașı, NTN-SNR Fabrica de Rulmenți Sibiu, Moncler Bacău, BMTI Strabag". Each name also appears on the branch references page (`app/referinte/page.tsx`); see [`references.md`](references.md).

---

## 5. Points to check

Recorded, not resolved.

- **Legal statements were not checked.** The thresholds, deadlines, directive numbers and fines above are the website's reading of the law. This import did not verify them. The role pages give no check date; the articles on the branch do.
- **Deadline passed, still "in force".** P1's first bullet presents the 290 kW threshold as "Prag în vigoare astăzi" with a deadline of 31 December 2024, which the intro says "a trecut".
- **Unnamed source for the savings band.** P1 cites "studii independente pe peste 1.000 de proiecte" without naming them. The branch calculator's code cites "Crowe et al. 2020; Kramer et al. 2019 (LBNL)" for the same 5-15% band (`lib/roi-calculator.ts`).
- **System life.** P7's intro says building automation has "ciclu de viață de 15 ani". Its first bullet says a controller stays in service "10-15 ani". The about page says "peste zece ani".
- **Consent to name references.** The terms page has an open legal question on whether each named reference client agreed to be named ([`legal.md`](legal.md) section 5). The P6 list of client names is affected.
- **Spelling.** P6 writes "Eczacıbașı" with the Romanian "ș" (comma below, U+0219). The Turkish company name uses "ş" (cedilla, U+015F). The English text writes "Eczacibasi".
- **Same label, two destinations.** The role pages' "Cere o evaluare" goes to the quote form `/cerere-oferta`. The footer's "Cere o evaluare" goes to `/contact`. Other pages use "Cere o evaluare a clădirii".
- **Order of the copy document.** The code's P3 (facility manager) is the copy document's A1, and P1 (owners) is A2. This is harmless but may confuse anyone matching the pages with the copy document.

---

## 6. Relevance to the app, and what it may not use

- **The app's main user is P1.** The app serves property owners. The website's P1 page is the nearest description of how SOVITECH talks to them. The other roles (asset manager, facility manager, technical director) may also fill in the app for an owner. Whether the app uses these personas, for example in onboarding or help text, is a product decision.
- **No figure is an app value.** Cost bands, savings, paybacks, point densities, retention periods and fines are website marketing copy. They are not `reference` data and not an approved benchmark (rule 1, section 2.1). Adopting any of them would add a reference dataset, which is a loosening under section 10 of `docs/guardrails.md` (version 1.3) and needs the approver's explicit approval. Test case G1-12 covers a dataset with no approval record.
- **Savings and payback language.** The role pages state domains and say the savings figure "nu este o promisiune". That is closer to rule 10 than `main`'s copy, but in the app savings and payback stay Estimated, with their assumptions (rules 9 and 10).
- **Legal statements.** The app never claims compliance (rule 11). Thresholds and deadlines would come only from reference data with a stated edition and date (rule 1).
- **Reserved terms.** P4 and P8 use "ofertă" and "oferte" ("O ofertă cu 30% mai ieftină..."). In the app such words are allowed only where section 2.8 of the guardrails allows them.
- **Client names.** The P6 reference names are the website's claims, with an open consent question. The app should not reuse them.
