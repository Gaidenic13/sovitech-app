# ROI methodology research (unmerged branch `redesign-2026`)

**Status: unmerged branch content, copied verbatim. It is not an approved reference dataset.**

**What this file is.** A byte-for-byte copy of `docs/roi-methodology-research.md` from the branch `origin/redesign-2026` of the website repository `Gaidenic13/sovitech-website`. The copy sits between the "Start of the verbatim copy" and "End of the verbatim copy" lines below. Nothing between the markers was edited. An index of its figures by evidence type follows the copy.

**Provenance.**
- Added in commit `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala"). The branch head `af81353` (2026-08-27, "Materiale vizuale noi: 10 coperti si 15 diagrame") does not change it. Git blob `5cd4c6b26f7c21ab5345ec1f1114c2e0ef8fe166`, 45,024 bytes, 710 lines.
- The branch is not merged into `main` (`e080614`, 2026-08-11). Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. This note is kept for reference only. `main` is the current website.
- No page on the branch links to this document. It is an internal research note. The branch's rewritten calculator and its new page `/calculator-roi/metodologie` draw on parts of it. Both are described in `company/business/roi-methodology.md` section 6.
- No author is named. The document says it was compiled "for the Sovitech Control ROI calculator transparency section".
- The same file also sits, byte-identical, in the branch source snapshot `company/website/source-redesign-2026/docs/`. This copy adds the notes and the index.

**How its figures are labelled.** The author flags figures as **MEASURED**, **MODELLED** or **VENDOR CLAIM**. Some carry other labels ("Sovitech assumption", "Legal fact", "Expert estimate"), and some carry none. The index after the copy counts them.

**Status for the app.**
- **It is not an approved reference dataset** (`docs/guardrails.md` rule 1, section 2.1 and section 10; test case G1-12). No figure in it may reach the app as a value, benchmark, default or range.
- **It is the most useful starting material for the app's future reference data.** Examples: energy-savings factors by BAC class under EN ISO 52120-1, Romanian energy prices with their VAT basis and date, grid emission factors, measured savings studies, and implementation cost tiers.
- **Each could enter only through an approved, versioned reference dataset.** Adding one is a loosening that needs the product owner's explicit approval (section 10). Nothing in this file is that approval.
- **Benchmarks stay benchmarks.** Study medians, factor tables for typical buildings and cost tiers could only ever feed `estimated` values, with their basis (2.1, rules 1, 8 and 9). Standard titles, editions and legal thresholds come only from reference data, with their edition or date (rule 11).

**Not verified.** No external source was consulted for this import. The citations, figures, links and legal statements are recorded exactly as the document states them. The links are the author's and were not followed.

**Notes on the text.** These come from reading the document against itself and against the app's files. None is corrected inside the copy.
1. **The Romanian legal status contradicts itself.** Section A.4 is headed "Romania — CONFIRMED against the consolidated statute". The closing "Research gaps" list says "Romanian transposition of the EPBD BACS obligation: NOT CONFIRMED" and asks for a lawyer's check.
2. **Edition.** The document cites "EN ISO 52120-1:2022". `docs/guardrails.md` rule 11 writes "EN ISO 52120-1:2021". Rule 11 says editions come only from reference data. This file does not settle which is right.
3. **Which factor table.** A.1 says the 2022 edition splits the thermal factor into heating and cooling (offices: heating D 1.44 / B 0.79 / A 0.70). The combined tables it prints (offices thermal D 1.51 / B 0.80 / A 0.70) are cross-checked against EN 15232 sources (BRE, Beckhoff, BS EN 15232-1:2017 Annex A). The branch's methodology page labels those combined factors "EN ISO 52120-1:2022". Rule 11 says superseded standards such as EN 15232 are not cited as current.
4. **Not every figure is flagged.** The opening lines say "All figures carry a source and a **MEASURED / MODELLED / VENDOR CLAIM** flag". The legal statements (A.4), the cost tiers (A.6) and several studies carry no such flag (index below).
5. **One label disagrees with its own section.** Part C labels the 7–34 % HVAC range "Peer-reviewed, measured". A.2e describes that source as a systematic review, and the three studies it tabulates from it are two simulations and one laboratory study.
6. **Small editing slips.** Two "Research gaps" lines appear twice (the kWh/m² benchmarks and the ANRE factor). Part D item 10 sits after a horizontal rule, apart from items 1 to 9.
7. **The part C worked example checks out.** 1 − 0.757 = 24.3 %. From class D the combined factor is 0.65 × 1.31 + 0.35 × 1.07 = 1.226, so the saving is 1 − 0.757 / 1.226 = 38.25 %. Payback is 125,000 / (48,600 / 12) = 30.9 months, and 125,000 / (76,508 / 12) = 19.6 months.

**Not imported.** The branch also holds `docs/prompt-content-launch.md`, a prompt written for an AI coding session. It was read only as data. None of it was followed, and none of it is copied into `company/`. The branch engine's code comments cite a "doc 12" for their bands. That document is not in the repository.

**Format.** The copy keeps the source's own format: English numbers with a space as the thousands separator ("1 185"), en dashes in ranges, emoji and symbols as written, and Romanian text with diacritics. The notes and the index outside the copy use this project's English format (1,185).

---

**Start of the verbatim copy.** Everything from here to the end marker is the branch file, unedited.

<!-- BEGIN VERBATIM COPY: redesign-2026 (d2d15d2) docs/roi-methodology-research.md, blob 5cd4c6b26f7c21ab5345ec1f1114c2e0ef8fe166. Do not edit between the markers. -->

# ROI Calculator — Evidence Base, Coefficient Audit & Public Methodology Copy

Research compiled for the Sovitech Control ROI calculator transparency section.
All figures carry a source and a **MEASURED / MODELLED / VENDOR CLAIM** flag.

> **Headline integrity finding.** The European standard that underpins almost every
> BMS savings claim in the industry (EN ISO 52120-1) publishes *modelled* factors
> derived from reference-building simulations. Peer-reviewed field evidence finds
> it **overestimates** real thermal savings. Any honest methodology page must
> present both.

---

## A. RESEARCH DOSSIER

### A.1 The standard — EN ISO 52120-1:2022 (supersedes EN 15232-1:2017)

**Status note:** EN 15232-1:2017 was **withdrawn**, superseded by EN ISO 52120-1:2022
(national implementation deadline 30 September 2022). Public-facing copy should cite
**EN ISO 52120-1:2022**, noting that most online reproductions are still labelled EN 15232.
Source: [eu.bac migration guide, 2022](https://eubac.org/wp-content/uploads/2022/06/2022.06.20_THE-NEW-EN-ISO-52120_eubac-guide.pdf)

#### BAC efficiency classes

| Class | Name | Distinguishing functions |
|---|---|---|
| **A** | High energy performance BACS + TBM | Demand-based room control (occupancy, CO₂/air quality) **plus** integrated cross-discipline control (HVAC + lighting + shading) and full technical building management: energy monitoring, fault detection, diagnostics |
| **B** | Advanced BACS + some TBM | Networked room automation — room controllers communicate with the BMS — plus coordinated central management and energy monitoring. No automatic demand control. |
| **C** | Standard BACS — **REFERENCE, factor = 1.00** | Networked automation of primary plant only. No electronic room automation (thermostatic valves instead). No energy monitoring. |
| **D** | Non energy efficient BACS | No networked automation, no room automation, no monitoring. The standard states such buildings **shall be retrofitted**. |

#### Thermal efficiency factors (f_BAC,hc) — MODELLED

| Building type | D | C (ref) | B | A |
|---|---|---|---|---|
| Offices | 1.51 | 1.00 | 0.80 | 0.70 |
| Lecture halls | 1.24 | 1.00 | 0.75 | 0.50 |
| Education (schools) | 1.20 | 1.00 | 0.88 | 0.80 |
| Hospitals | 1.31 | 1.00 | 0.91 | 0.86 |
| Hotels | 1.31 | 1.00 | 0.85 | 0.68 |
| Restaurants | 1.23 | 1.00 | 0.77 | 0.68 |
| Wholesale & retail | 1.56 | 1.00 | 0.73 | 0.60 |
| **Other (sport, storage, industrial)** | — | 1.00 | — | — |

#### Electrical efficiency factors (f_BAC,el) — MODELLED

| Building type | D | C (ref) | B | A |
|---|---|---|---|---|
| Offices | 1.10 | 1.00 | 0.93 | 0.87 |
| Lecture halls | 1.06 | 1.00 | 0.94 | 0.89 |
| Education (schools) | 1.07 | 1.00 | 0.93 | 0.86 |
| Hospitals | 1.05 | 1.00 | 0.98 | 0.96 |
| Hotels | 1.07 | 1.00 | 0.95 | 0.90 |
| Restaurants | 1.04 | 1.00 | 0.96 | 0.92 |
| Wholesale & retail | 1.08 | 1.00 | 0.95 | 0.91 |
| **Other (sport, storage, industrial)** | — | 1.00 | — | — |

> **CRITICAL:** "Other types — sport facilities, storage, **industrial**" carry **only the
> class C reference value**. The standard publishes **no D/B/A factors** for them, so
> **no standard-derived saving is creditable for industrial buildings or data centres.**

**Verification quality.** Cross-confirmed across BRE (UK research body, citing BS EN 15232
Table 5), Siemens, Beckhoff (citing DIN EN 15232 Tables 9 & 11), Schneider Electric Italia,
CentraLine/Honeywell via baulinks.de and IKZ, Mitsubishi Electric, and the standard's own text
(BS EN 15232-1:2017 Annex A Tables A.1/A.3). One research pass back-derived the full factor set
from Siemens' published savings percentages and ran 42 independent consistency checks — **all
passed**, reproducing BRE's table exactly.

**Source to avoid: [altecon.it](https://www.altecon.it/highlights/en-15232).** It is the most
convenient single-page reproduction and is therefore widely copied — including by search-engine
AI summaries — but it has two independent defect classes: its electrical rows are **shifted by
one** from Hospitals downward, and its thermal Lecture-hall A (0.35) and Wholesale A (0.47)
contradict its own savings columns. Do not cite it.

#### Edition difference worth knowing

EN ISO 52120-1:2022 **splits** the single electrical factor into **f_BAC,L (lighting)** and
**f_BAC,aux (auxiliary)**, and splits thermal into separate heating and cooling factors
(Offices: heating D 1.44 / B 0.79 / A 0.70; cooling D 1.57 / B 0.80 / A 0.57).
Notably, for **hospitals, restaurants and retail the class A lighting factor is 1.00** — the
standard credits **no lighting saving** for those types.
Source: EN ISO 52120-1:2022 Table A.9 via [Politecnico di Torino MSc thesis, 2023](https://webthesis.biblio.polito.it/26443/1/tesi.pdf)

#### Caveats the standard itself states

1. It is explicitly a **"first estimation"** method for **"typical building types and use
   profiles"** — [EPB Center, the official EPB standards portal](https://epb.center/document/iso-52120-1/).
2. A **detailed calculation method** exists in the same standard and should be used when
   system knowledge is available.
3. Factors do not account for envelope, glazing, climate, orientation or system type.
4. Class C is a **moving baseline** representing common practice, not this client's building.
5. Factors are multiplicative on each energy stream — thermal and electrical **must not be
   averaged into a single building-level figure without weighting by each stream's share**.

### A.2a The largest measured dataset in existence — Crowe et al. 2020

**Crowe, Mills, Poeling, Curtin, Bjørnskov, Fischer, Granderson (2020),** *Energy and Buildings*
227:110408, DOI [10.1016/j.enbuild.2020.110408](https://doi.org/10.1016/j.enbuild.2020.110408),
[open access](https://escholarship.org/uc/item/59f632fx). **1 185 projects / 1 482 buildings /
34.7 million m²**, projects completed 1984–2018. **MEASURED** (weather-normalised pre/post
whole-building energy use, industry-standard M&V with third-party review).

| Existing-building commissioning (EBCx) | Value |
|---|---|
| **Median whole-building energy savings** | **6.4%** (IQR **3.4–12.4%**, n=446) |
| Median simple payback | **1.7 yr** (IQR 0.8–3.5) |
| Median cost | **$2.84/m²** ($2017) |

**By segment:** Public order & safety 16% · Laboratory 14% · Higher education 9% · K-12 9% ·
**Office 6%** (n=105) · **Hospital inpatient 5%** (n=88) · **Lodging/hotels 3%** (n=24).

**This supersedes the widely-quoted Mills 2009 figures** (16% median, 1.1 yr payback) from the
same laboratory. The 2009 by-type numbers were office 22%, hotels 12%, inpatient 15% — the 2020
dataset is far larger and drawn from utilities supplying *all* projects in a timeframe rather
than hand-picked cases, so selection bias is much lower. **Citing 16% when the same lab's newer,
bigger dataset says 6.4% is exactly what a technical client will check.**

**The most useful sales finding in the paper is not the headline but the spread by delivery model:**
utility-programme EBCx **5%** · monitoring-based commissioning (submetering + diagnostics) **9%** ·
comprehensive non-utility EBCx **14%**. *How* the work is done dominates the outcome — and that
is measured, not asserted.

> **Scope caution — do not conflate two different products.**
> Crowe measures **re-commissioning / optimising controls that already exist**. It is *not* a
> measurement of **installing a BMS in a building that has none** — which is the class D → A case
> our calculator mostly addresses, and for which **essentially no measured evidence base exists**.
> The honest position: 6.4% is the floor evidence for tuning an existing system; the standard's
> 24–41% is modelled potential for a full class jump; the truth for a given building lies between
> and requires an audit.

### A.2b Installing a NEW BMS — the evidence base is one study, from 1994

Our calculator mostly sells **installing or upgrading to** a BMS (class D/C → A), not tuning an
existing one. For *that* product the measured evidence is thin, old and sobering.

**Wheeler, G. (1994),** "Performance of Energy Management Systems", ACEEE Summer Study Panel 5
Paper 28 (Oregon State, BPA-funded),
[PDF](https://www.aceee.org/files/proceedings/1994/data/papers/SS94_Panel5_Paper28.pdf).
**n = 20 buildings** (11 schools, 9 non-schools), weather-corrected utility bills, whole-building,
all fuels, confounders screened. **MEASURED.**

| Result | Value |
|---|---|
| Mean savings per building | **12.7–13%** |
| Savings as a group | **14.8–15%** |
| **Range** | **−10% to +29%** |
| Schools / non-schools | 8.7% / 17.6% |
| Payback (group) | **4.2 yr**; mean of the 17 with positive payback **9.2 yr** |
| Buildings that never paid back | **3 of 20** |

Wheeler found **no meaningful correlation** between savings and EMS cost (R²=0.22), number of
functions (R²=0.13), floor area (R²=0.03) or energy intensity (R²=0.17). What *did* correlate:
**operators keeping energy records** (schools that did saved ~3× those that didn't) and
**infrequent overrides**. Earlier US field work was worse: EPRI 1986 (n=38, 17% — owner-reported,
bills never analysed); Smith 1988 (n=10, four sites had a **non-functional EMS**); Kunkle 1990
(**8 of 14 installations unsatisfactory**).

**PROBE studies** — Bordass, Cohen, Standeven, Leaman, *Building Research & Information* 29(2),
2001, 16 buildings, CIBSE TM22 + occupant surveys: "incomprehensible BMSs", controls overridden
so systems "default to ON — the scourge of many modern buildings"; six-fold variation in energy
use across the sample. Bordass estimates BMS are used for effective energy management in
**perhaps 10%** of installations.

**Carbon Trust's buyers' guide declines to give a savings number at all**: *"It is difficult to
provide 'rule of thumb' savings as every installation is so different."* That refusal is itself
a citable data point.

### A.2c Savings decay — the finding that justifies our maintenance offer

**Gunasingh, Hackel, Zhou**, *ASHRAE Journal*, Dec 2019 (Slipstream/ComEd),
[PDF](https://slipstreaminc.org/sites/default/files/documents/publications/012-019gunasingh-slipstream-web.pdf) —
**28 sites, 167 measures** (large offices, hospitals, hotels, universities): electric-savings-
weighted persistence **61% (±8.9%)**; **gas measures only 42%**; **zero persistence** found for
lighting controls, optimum start and thermostat settings. Texas A&M: cooling savings decayed
44.8% → 35.1% over three years, heating 79.7% → 49.7% over two.

Monitoring-based commissioning shows the opposite trajectory — **Kramer et al. (2019)**,
*Energy Efficiency*, 687 buildings: savings by year post-install **0 → 4% → 11% → 13% → 19%**,
with EIS-only at 1% versus FDD-equipped at 10%.

**Commercial reading:** savings are not a one-off delivery; they decay without continuous
monitoring. This is the strongest evidence-based argument for a maintenance contract — and it
is measured, not asserted.

### A.2d Where "up to 30%" actually comes from — the full provenance chain

```
CEN working-group building energy simulations
  → EN 15232-1 / ISO 52120-1 BACS factors            [MODELLED]
      Offices thermal C 1.00 → A 0.70  ⇒ "30%"
      Offices electrical C 1.00 → A 0.87 ⇒ "13%"
  → BRE re-bases to class D                          ⇒ "54%"
  → Waide / eu.bac stock models                      ⇒ "450 TWh", "14%", "€36bn"
  → vendor and trade press                           ⇒ "up to 30–50% from BMS"
```

eu.bac's own consultant confirms the factors were *"derived by analysis of a very extensive set
of detailed building energy performance simulations"*. **There is no measured validation anywhere
in that chain.** Anyone quoting "up to 30%" is quoting a simulation output four citations
removed from its source.

Two further corrections for anyone citing LBNL: **Mills 2009's 16% was revised down to 10% by
LBNL themselves** in Crowe 2020; and the "16%" sometimes attributed to the 1 500-building study
is actually a *market-segment maximum* (public order & safety, n=15), not a median.

### A.2e Independent evidence that the standard overestimates

**Vandenbogaerde, Verbeke & Audenaert (2023),** *Journal of Building Engineering* 76:107233,
DOI [10.1016/J.JOBE.2023.107233](https://doi.org/10.1016/J.JOBE.2023.107233) — peer-reviewed
systematic review, **not vendor-funded**:

> "According to EN 52120-1, thermal energy savings are around 54% by upgrading the control
> system from class D to A. The selected references in this review paper stated savings
> between **7% and 34%** in HVAC energy. Therefore, the standard seems to **overestimate**
> the possible savings for thermal energy."

The review concludes the factors "are not sufficiently accurate in estimating energy savings
from BACS implementation," attributing the gap to occupancy, climate, orientation, occupant
behaviour, control algorithms, and "oversimplified reference cases."

Individual studies tabulated therein:

| Study | Method | Building | Result | Flag |
|---|---|---|---|---|
| Garzia et al. 2022 (BE) | EnergyPlus | 1 080 m² office floor | Class C → **1.4%** heating | MODELLED |
| Lamano et al. 2018 (SG) | EnergyPlus | 93 m² office | Class A → **54%** lighting, **2–5%** A/C | MODELLED |
| Kang et al. 2015 (KR) | Laboratory field study | 60 m² office | Class A → **41%** cooling, **20%** lighting | **MEASURED** (lab conditions) |

Corroborating expert estimate: Waide (2014) states installed BEMS currently deliver
**~10% of building HVAC energy consumption** in practice, against a **37%** technical optimum —
the report's own central argument. Expert estimate, not a metered programme.

A 2025 follow-up (Vandenbogaerde et al., *Energy Efficiency*, DOI 10.1007/s12053-025-10408-z)
finds simulated ranges of 19–71% (heating emission control), 1–58% (cooling), 14–65% (lighting),
and **−27% to +74%** for cooling with shading — i.e. automation can be *negative* in some
configurations. Paywalled; abstract-level verification only.

### A.3 EU-level modelled potential

| Figure | Value | Source | Flag |
|---|---|---|---|
| EU building primary energy saving from EPBD BACS measures | **14% by 2038** | Waide, *The impact of the revision of the EPBD…*, eu.bac, 2019, [PDF](https://eubac.org/wp-content/uploads/2021/03/EPBD_impacts_from_building_automation_controls.pdf) | MODELLED |
| Annual final energy savings | >450 TWh/yr, peak 2035 | ibid. | MODELLED |
| Annual CO₂ savings | peak 64 Mt in 2030 | ibid. | MODELLED |
| Benefit/cost ratio | ×9 (10.4 non-residential) | ibid. | MODELLED |
| Optimal-scenario saving | 22% of building energy by 2028 | Waide et al., *The scope for energy and CO₂ savings…*, **European Copper Institute** (not eu.bac), 2014, [PDF](https://eubac.org/wp-content/uploads/2021/06/2014.06.13-Waide-ECI-Energy-and-CO2-savings-BAT.pdf) | MODELLED |
| Class A impact on EPC | "up to 46%" (heating & cooling only) | Politecnico di Milano / eu.bac, July 2024, [PDF](https://eubac.org/wp-content/uploads/2025/01/2024_eubac_Building-Automation-and-Control-Systems-Impact-on-EPC-Classes-in-Europe.cleaned-1.pdf) | MODELLED |

**Two accuracy corrections for anyone quoting these:**
- The 14% figure is **by 2038** in the primary report; eu.bac's own web copy says "by 2050".
  Quote 2038, or attribute 2050 to eu.bac.
- The 2014 study was commissioned by the **European Copper Institute**, *not* eu.bac.

**The eu.bac per-building-type numbers** widely quoted ("up to 52% offices, 41% hotels and
restaurants, 49% wholesale and retail, 26% education and hospitals") are, per that document's
own footnote 8, **tabulated EN 15232 factors** — i.e. **MODELLED**, and representing a
**class D → class A** jump (worst to best). Publishing "up to 52%" without stating the class
baseline would be misleading.

### A.4 Regulatory driver — verified against the Official Journal

**Directive (EU) 2024/1275 (EPBD recast), Article 13(9)–(10):**

| Requirement | Threshold | Deadline |
|---|---|---|
| BACS for non-residential buildings | effective rated output **> 290 kW** | **31 December 2024** |
| BACS for non-residential buildings | effective rated output **> 70 kW** | **31 December 2029** |
| Automatic lighting controls (Art. 13(12)) | > 290 kW / > 70 kW | 31 Dec 2027 / 31 Dec 2029 |
| Indoor environmental quality monitoring (Art. 13(10)(d)) | — | **29 May 2026** |

Required BACS capabilities, Art. 13(10): continuously monitor, log, analyse and allow adjusting
energy use; benchmark efficiency, detect losses and inform the facility manager; interoperate
across manufacturers; and (new in the recast) monitor indoor environmental quality.

**Commercially relevant:** Art. 23(7) — buildings complying with Art. 13(10) are **exempt from
the mandatory periodic HVAC inspections** otherwise required by Art. 23(1) (every 5 years;
every 3 years for generators > 290 kW).

Predecessor: Directive (EU) 2018/844 rewrote Articles 14(4)/15(4) of Directive 2010/31/EU —
**290 kW "by 2025"** (the text specifies no day/month; do not publish "1 January 2025").

#### Romania — CONFIRMED against the consolidated statute

**The BACS obligation is already Romanian law.** Legea nr. 372/2005, republished (MO nr. 868 /
23.09.2020), consolidated to 29.07.2024 (amendments: OUG 171/2022, OUG 14/2023, OUG 19/2023,
Legea 238/2024). Primary source: [ISC-hosted consolidated text](https://isc.gov.ro/files/2024/Legislatie/legea-nr-372-2005-privind-performanta-energetica-a-cladirilor.pdf).

| Provision | Content |
|---|---|
| **Art. 27 alin. (5)** | Non-residential buildings with heating / combined heating+ventilation **over 290 kW** must be equipped with BACS **by 31 December 2024**, *"dacă acest lucru este fezabil din punct de vedere tehnic şi economic"*, capable of (a) continuous monitoring, logging, analysis and adjustment of energy use; (b) benchmarking, detecting efficiency losses and informing the person responsible; (c) interoperable communication across manufacturers |
| **Art. 29 alin. (6)** | Word-for-word repetition in the air-conditioning chapter |
| **Art. 3 pct. 27** | Legal definition of "sistem de automatizare şi de control al clădirii" |
| **Art. 27 alin. (4) lit. b), Art. 29 alin. (5) lit. b), Art. 27 alin. (8)** | Buildings with **functional** BACS are **exempt from the periodic heating and air-conditioning inspections** |
| **Art. 27 alin. (6)** | Protected/heritage buildings excluded where compliance would unacceptably alter character |

**Three corrections that matter for copy:**

1. **The Romanian deadline is 31 December 2024, not "2025".** The directive says "by 2025";
   Romania transposed it as a hard year-end 2024 date. It is **already past**.
2. **There is NO fine for failing to install BACS.** Art. 36 (Sancțiuni) was checked in full —
   the contravention list does **not** reference Art. 27(5) or Art. 29(6). ISC penalties
   (5 000–20 000 lei) attach to auditors, EPC display, urbanism certificates etc.
   **Marketing must not claim a fine or ISC penalty for missing BACS.** The accurate commercial
   lever is the **inspection exemption**, not a threat.
3. **A drafting anomaly exists in Art. 29 alin. (6)**: although it sits in the air-conditioning
   chapter it still reads *"sisteme de încălzire sau sisteme combinate de încălzire şi de
   ventilare"*. Quote it as written; do not silently "correct" it.

**EPBD IV (Directive 2024/1275) is NOT transposed in Romania.** EUR-Lex NIM for CELEX 32024L1275
lists **one** Romanian measure — **OG nr. 16/2025** (MO nr. 787 / 22.08.2025), which transposes
**only Art. 17(15)** (no public incentives for standalone fossil-fuel boilers) and amends
OUG 18/2009. **It has nothing to do with BACS.** Nothing is notified against the 29 May 2026
deadline. On **15 July 2026** the Commission sent letters of formal notice to **all 27 Member
States**, Romania included, for failure to fully transpose the directive
([EC/DG ENER](https://energy.ec.europa.eu/news/commission-calls-eu-countries-transpose-reinforced-rules-energy-performance-buildings-2026-07-15_en)).

**Therefore: the >70 kW threshold and the 2029/2030 dates are forthcoming EU requirements, not
current Romanian obligations.** Any copy referencing them must say so explicitly.

*Still NOT CONFIRMED:* the CCR decision number on the OG 16/2025 approval law and whether it is
promulgated; the status of the MDLPA draft for full EPBD IV transposition (four Romanian
government domains were unreachable from the research environment).

### A.5 Romanian energy prices & carbon — for converting % into EUR

Eurostat, **H2 2025**, Romania (dataset updated 2026-08-11):

| Input | Value | Basis |
|---|---|---|
| **Electricity, 500–1999 MWh/yr** | **€0.1887/kWh** | excl. VAT & recoverable taxes — *the basis a VAT-registered business actually bears* |
| Electricity, 20–499 MWh/yr | €0.2142/kWh | excl. VAT & recoverable |
| Electricity, 2 000–19 999 MWh/yr | €0.1715/kWh | excl. VAT & recoverable |
| **Gas, 1 000–9 999 GJ/yr** | **€0.0538/kWh** | excl. VAT & recoverable |
| EU-27 electricity, 500–2000 MWh | €0.1837/kWh | for comparison |

Sources: Eurostat `nrg_pc_205` / `nrg_pc_203`. **MEASURED (price survey).**

**Trend warning:** Romanian non-household electricity rose **+15.4% y/y** in H2 2025 — one of
only five EU countries to rise while the EU average fell 3.5%. A hard-coded price will drift;
show the price as an editable input with the date of the reference.

**Grid carbon intensity:** **260 gCO₂/kWh** (Ember, 2025, CO₂ only, production-based) or
**236 gCO₂e/kWh** (Nowtricity/ENTSO-E, CO₂-equivalent). Both MEASURED. State which and note
these are production-based, exclude imports and exclude lifecycle emissions. The EEA figure
could not be extracted (chart image only) and the current ANRE figure was **NOT FOUND**.

**Energy-intensity benchmarks (kWh/m²/yr) for Romania: NOT FOUND.** ODYSSEE-MURE publishes
services-sector energy *per employee* as percentage change only. **Do not ship a kWh/m²
default** — require the client's metered consumption, which is better practice anyway.

### A.6 Implementation cost benchmarks

**The published cost evidence is thin and largely one source echoing.** Nearly every European
€/m² figure traces to a single 2014 study; professional QS data (RICS/BCIS, Spon's, Arcadis) is
entirely paywalled; **CIBSE Guide H contains no unit costs at all**. There is **no citable
Romanian or CEE BMS cost benchmark** — searched in Romanian and Polish; every result was vendor
marketing without a floor-area denominator. Saying so on the page is a credibility asset.

**Use a scope ladder, not a single rate:**

| Scope tier | Indicative range | Anchored on |
|---|---|---|
| Re-commissioning an existing BMS | ~€3/m²; low four figures total | Crowe 2020 median **$2.84/m²**; eu.bac UK call centre €4 500, <2 mo payback |
| Single-service controls (hydronic balancing, or blinds + lighting) | ~€2.5–20/m² | Hospital Meppen €2.6/m²; Office Lille €20/m²; Politecnico thermal-only €7.5/m² |
| **Conventional whole-building BMS, non-residential** | **~€28–40/m²** | Waide 2014 **€27/m² offices / €28.70/m² average** (2013/14 price base); **real project: Technopole Grenoble office €37.4/m²**, 4.3 yr payback |
| Full class A across all systems, or BMS bundled with plant replacement | €65–130/m²+ | Nottingham University, Aller Weser hospital — both bundle non-BACS scope |

Sources: [Waide/ECI 2014](https://eubac.org/wp-content/uploads/2021/06/2014.06.13-Waide-ECI-Energy-and-CO2-savings-BAT.pdf);
[eu.bac BACS Reference Case Booklet 2022](https://build-up.ec.europa.eu/sites/default/files/content/2022_eubac_bacs-reference-cases.pdf);
[Politecnico di Milano/eu.bac 2024](https://eubac.org/wp-content/uploads/2025/01/2024_eubac_Building-Automation-and-Control-Systems-Impact-on-EPC-Classes-in-Europe.cleaned-1.pdf);
[PNNL-22169](https://www.pnnl.gov/main/publications/external/technical_reports/pnnl-22169.pdf) (real 1 900 m² US office RTU retrofit, $10.5/m², itemised).

**Four traps to avoid:**
1. **Do not average €28.70 with €7.50.** The 2024 figure is **thermal controls only** — the report
   states it is roughly **10% of full class A BACS cost**.
2. **Do not cite €30/m² (eu.bac) and €28.70/m² (Waide) as two agreeing sources.** Same number.
3. **Waide's €28.70/m² is a 2013/14 price base.** HICP indexation puts it near €38–40/m² today —
   *but that indexation is ours, not a published figure*. Always state the price base.
4. The 2024 Politecnico report makes residential *more* expensive than non-residential (reverse
   of Waide, never reconciled) and cites a "CIBSE Guide to BACS Implementation Costs" for which
   **no evidence of existence was found**.

### A.7 SAUTER's own claims — all vendor claims, none with stated methodology

| Claim | Product | Source | Assessment |
|---|---|---|---|
| "often by 20–30%" | SAUTER solutions | sauter-cumulus.de | **No basis stated** |
| "up to **40%**" / "over 40%" | SAUTER EMS | EMS brochure 988365, © 2017 | **"up to" + "depending on circumstances"** |
| "15 to 25 per cent" | ecoHeat Control | sauter-controls.com, 2019 | No basis stated |
| **38% heating** | CDG Airport T2E, Paris | EMS brochure p.20 | ⚠️ SAUTER's own text: *"the mild outside temperatures certainly played a role"* — **not weather-normalised** |
| "up to 30% in some areas" | Merian Iselin Clinic | EMS brochure p.23 | Doubly hedged |
| ~8% | Lindt & Sprüngli | EMS brochure p.24 | **Identified potential**, not achieved |
| 20% / 30% | Boehringer, Saarland Univ. | SAUTER Facts | **Targets**, not results |

**No IPMVP or any M&V protocol is cited in any SAUTER material. No case study is
independently verified.**

SAUTER's EN ISO 52120 positioning is a **design-intent** claim — solutions "systematically
designed to meet premium efficiency class A" — not a savings claim. No SAUTER document attaches
a percentage to class A; the percentages come from the standard.

**eu.bac certification — precise scope.** Fr. Sauter AG is an eu.bac member, and specific
products are genuinely certified: ecos502 carries **eu.bac licence 211168** (EN 15500), attesting
**zone-controller control accuracy** of ≈0.2 K heating / 0.3 K cooling (fan coil) and ≈0.1 K
(chilled ceiling), for two specific part numbers, voided by user program changes affecting
control quality. It attests **nothing about whole-building energy savings**. Presenting eu.bac
certification as evidence of system-level savings would be a misrepresentation.

**Safer third-party figures SAUTER itself cites:** demand-controlled ventilation savings
attributed to **VDMA 24773** — 20–30% open-plan offices at 40% occupancy; 3–5% at 90% occupancy;
20–50% lecture theatres/schools; 30–70% restaurants/canteens. Citable to VDMA, not SAUTER.

---

## B. COEFFICIENT AUDIT — `lib/roi-calculator.ts`

### B.1 Per-industry energy savings ranges

Blended saving = thermal factor × thermal share of bill + electrical factor × electrical share.
Thermal shares below are **Sovitech assumptions** (offices 55%, hotels 65%, retail 45%,
hospitals 60%) and must be labelled as such.

| Industry | Ours | Standard supports (C→A … D→A) | Verdict |
|---|---|---|---|
| hospitality (Hotels) | 15–30% | **24–38%** | ✅ Supported — arguably conservative |
| office (Offices) | 20–40% | **22–41%** | ✅ Excellent match |
| retail (Wholesale & retail) | 25–35% | **23–41%** | ✅ Supported |
| healthcare (Hospitals) | 20–30% | **10–25%** | ❌ **OVERSTATED** → change to **10–25%** |
| industrial | 20–40% | **no published factors** | ❌ **No standard basis** |
| dataCenter | 20–35% | **no published factors** | ❌ **No standard basis** |

**Healthcare** is the clear error. Hospitals have the least headroom of any type in the
standard — electrical factor A = 0.96 and class-A *lighting* factor = 1.00 (no lighting saving
creditable), because they run 24/7 under strict air-quality regimes and cannot be set back like
an office. Physically sensible; our number is not.

**Industrial and data centres** fall under "Other types", which the standard leaves at the
reference value with no D/B/A factors. Options: (a) drop standard framing for these two and
label the figures as Sovitech project experience, or (b) remove the % and route them to a
site-audit CTA. Do **not** present them as standard-derived.

#### ⚠️ But the standard is not the whole story — the measured evidence is lower

Our ranges are defensible **against the standard**. They are **not** defensible as predictions of
measured outcomes:

| Evidence type | Typical result | Source |
|---|---|---|
| EN ISO 52120-1 modelled potential (C→A) | 22–24% | the standard |
| **Measured — new BMS installation** | **~13% mean, range −10% to +29%** | Wheeler 1994, n=20 |
| **Measured — re-commissioning existing controls** | **6.4% median** (IQR 3.4–12.4%) | Crowe 2020, n=446 |
| Measured — with FDD/monitoring, by year 5 | 19% | Kramer 2019, n=687 |
| Waide's own real-world assumption | ~10% | Waide 2014 |

The honest framing is a **band, not a point**: the standard defines the *technical potential*;
measured field studies show what is *typically realised*; the gap between them is explained by
commissioning quality, operator discipline and ongoing monitoring — all of which are things
Sovitech actually sells. **That gap is the sales argument, and it is evidence-based.**

Recommendation: present the standard-derived figure as "potențial tehnic conform standardului"
and pair it visibly with a "realizat tipic în studii de teren" figure. A prospect who later
discovers the 6.4% literature will trust a vendor who showed it to them first.

### B.2 The savings % is keyed to the wrong variable — structural finding

The standard keys savings to the building's **current BAC class**. Our engine instead starts at
the range's **lower bound** and adds occupancy-pattern bonuses (+5 hybrid, +3 variable occupancy,
+2 after-hours, +5 mall, +5 comfort issues, +3 low occupancy). Consequences:

1. A building with no bonuses **always** gets the minimum, regardless of its actual automation.
2. The upper bound is reachable only by ticking lifestyle boxes, not by being a class D building.
3. **We never ask the one question that determines the answer**: what automation exists today.

The bonuses point in a defensible *direction* — class A is literally defined by demand-based
control, so variable occupancy genuinely increases headroom, and VDMA 24773 supports large
occupancy-driven ventilation savings (20–30% at 40% occupancy vs 3–5% at 90%). But the
**+5/+3/+2 magnitudes have no source.**

**Recommendation:** ask "what do you have today?" → map to class D / C / B → derive the % from
the standard for that building type. Keep occupancy as a within-range modifier, not additive points.

### B.3 Maintenance savings

`maintenanceBudget × (multiplier − 1)`, multiplier 1.15–1.30 by industry, ×1.15 if equipment
>10 years, ×1.2 if repairs frequent — compounding to **as much as 1.79, i.e. a 79% maintenance
saving.**

**Verdict: UNSUPPORTED.** No source in this research substantiates BMS-driven maintenance-cost
reductions of 15–79%. EN ISO 52120-1 addresses **energy only**. The EPBD's fault-detection
requirement supports the *mechanism* (detecting efficiency losses, informing the operator) but
quantifies nothing.

**Recommendation:** cap the total maintenance saving well below the current compounding maximum,
label it explicitly as **Sovitech project experience, not a standard**, or remove it from the
headline and present it qualitatively until measured portfolio data exists.

### B.4 The two goal multipliers — remove

`× 1.1` if "comfort" selected, `× 1.05` if "environmental" selected.

**Verdict: INDEFENSIBLE — REMOVE BEFORE PUBLISHING ANY METHODOLOGY PAGE.** A client ticking a
goal checkbox does not change their building's physics. Compounded, these inflate the headline
by **15.5%**. On a transparency page that publishes the formula, this is the single most
damaging item: it converts an engineering estimate into a number that responds to what the
prospect says they want.

### B.5 Implementation cost — contains a genuine defect

```
implementationCost = buildingSize × 25
if (buildingCount > 1) cost × max(0.6, 1 − 0.05 × buildingCount)
```

`buildingCount` **only ever applies a discount — it never multiplies the area.**

Worked: 10 buildings × 5 000 m², portfolio energy €2 000 000/yr →

| | Current engine | Area-correct |
|---|---|---|
| Implementation cost | **€75 000** | €750 000 |
| Payback shown | **2.2 months** | 22.5 months |

A 10× understatement, and the UI hint at `page.tsx:514` explicitly promises "estimăm pe baza
suprafeței **și numărului de clădiri**" — the code contradicts its own copy. Results are also
shareable to social media (`page.tsx:559`), so the figure travels.

**The €25/m² rate itself is reasonable** — Waide 2014 gives €28.70/m² for non-residential —
but should be labelled a Sovitech assumption and presented as a range.

### B.6 Payback / ROI outputs

`payback = cost ÷ (annual savings ÷ 12)`; `5-yr return = savings×5 − cost`; `ROI% = return ÷ cost`.

Simple payback is acceptable for a lead-gen calculator, but it **omits**: energy price
escalation (Romania +15.4% y/y — omitting this makes results *conservative*), discounting/NPV,
the ongoing BMS maintenance/licence cost (makes results *optimistic*), equipment lifetime and
replacement, and **commissioning drift** — savings decay without ongoing monitoring, which is
precisely what the EPBD's continuous-monitoring requirement targets.

Net effect: **optimistic**, mainly because ongoing costs are excluded and no drift is modelled.

**Also inconsistent:** the `paybackInfo` strings shown on the industry cards are not produced by
the engine. Hospitality advertises **"Amortizare: 10–15 luni"**, but the engine's own arithmetic
for a hotel gives **20–31 months**. Either derive these from the engine or delete them.

**Minimum honest disclaimer:** estimate not guarantee; simple payback without discounting;
excludes energy-price changes and ongoing operating costs; assumes correct commissioning and
continued use; savings depend on the building's current automation class; a site audit is
required for a firm figure.

---

## C. PUBLIC METHODOLOGY COPY (RO first, EN second — `t(ro, en)` pattern)

### Section 1 — Pe ce se bazează estimarea / What the estimate is based on

**RO:** „Estimarea pornește de la standardul european **EN ISO 52120-1:2022** (care înlocuiește
EN 15232-1), adoptat și în România. Standardul împarte automatizarea clădirilor în patru clase
de eficiență — de la clasa D (fără automatizare în rețea) la clasa A (control pe bază de cerere,
integrat, cu monitorizare energetică). Clasa C, automatizarea standard, este referința: factorul
ei este 1,00. Pentru fiecare tip de clădire, standardul publică un factor de eficiență termică
și unul electric. Economia estimată se calculează ca (1 − factor) față de clasa de referință.
Trecerea unei clădiri de birouri de la clasa C la clasa A înseamnă, conform standardului, −30%
energie termică și −13% energie electrică."

**EN:** "The estimate starts from the European standard **EN ISO 52120-1:2022** (which replaces
EN 15232-1). It classifies building automation into four efficiency classes — from class D (no
networked automation) to class A (integrated, demand-based control with energy monitoring).
Class C, standard automation, is the reference: its factor is 1.00. For each building type the
standard publishes a thermal and an electrical efficiency factor. Estimated savings are
(1 − factor) against the reference class. For an office building, moving from class C to class A
means −30% thermal and −13% electrical energy under the standard."

*Include the two factor tables from §A.1, with the note that "Other types (sport, storage,
industrial)" carry only the reference value.*

### Section 2 — Formula, pas cu pas / The formula, step by step

Worked example — **hotel, 5 000 m², 200 000 EUR/an cost energie, clasa C în prezent:**

| Pas | Calcul | Rezultat |
|---|---|---|
| 1. Factori (Hoteluri, clasa A) | termic 0,68 · electric 0,90 | — |
| 2. Factor combinat | 0,65 × 0,68 + 0,35 × 0,90 *(65% termic — ipoteză Sovitech)* | **0,757** |
| 3. Economie energetică | 1 − 0,757 | **24,3%** |
| 4. Economie anuală | 200 000 × 24,3% | **48 600 EUR/an** |
| 5. Cost implementare | 5 000 m² × 25 EUR/m² *(ipoteză Sovitech; Waide 2014: 28,70 EUR/m²)* | **125 000 EUR** |
| 6. Amortizare simplă | 125 000 ÷ (48 600 ÷ 12) | **31 luni (2,6 ani)** |

*Dacă aceeași clădire pornește din clasa D (fără automatizare), standardul indică 38,3% →
76 500 EUR/an → amortizare 20 de luni.*

**Reality check to publish alongside:** „Literatura științifică independentă (Vandenbogaerde
et al., 2023) constată economii **măsurate** de 7–34% la energia HVAC, față de ~54% cât indică
standardul pentru saltul D→A. De aceea prezentăm estimarea standardului împreună cu acest
interval măsurat, iar oferta fermă se bazează pe auditul clădirii."

### Section 3 — De unde vin procentele / Where the numbers come from

| Coefficient | Value | Source | Evidence type |
|---|---|---|---|
| Factori termici/electrici | per table §A.1 | EN ISO 52120-1:2022 | **Standard (modelled)** |
| Interval măsurat HVAC | 7–34% | J. Building Engineering 76:107233 (2023) | **Peer-reviewed, measured** |
| Preț energie electrică RO | 0,1887 EUR/kWh | Eurostat `nrg_pc_205`, H2 2025 | **Measured (survey)** |
| Preț gaz RO | 0,0538 EUR/kWh | Eurostat `nrg_pc_203`, H2 2025 | **Measured** |
| Factor CO₂ rețea RO | 260 gCO₂/kWh | Ember, 2025 | **Measured** |
| Cost implementare | 25 EUR/m² | Sovitech; cf. Waide 2014 (28,70 EUR/m²) | **Sovitech assumption** |
| Cotă termic/electric | 45–65% | Sovitech | **Sovitech assumption** |
| Economii mentenanță | see §B.3 | Sovitech project experience | **Sovitech assumption — not a standard** |
| Obligație BACS | >290 kW / 31.12.2024 | Directive (EU) 2024/1275 Art. 13(9) | **Legal fact** |

### Section 4 — Ce NU include estimarea / What the estimate does not include

**RO:** „Este o estimare, nu o garanție. Nu include: evoluția prețurilor la energie (în România,
+15,4% pe an la energia electrică non-casnică în S2 2025); actualizarea financiară (NPV);
costul contractului de mentenanță și al licențelor; durata de viață a echipamentelor; și
degradarea în timp a performanței dacă sistemul nu este monitorizat continuu. Estimarea
presupune punerea în funcțiune corectă și utilizarea conform proiectului. Economia reală depinde
în primul rând de clasa de automatizare actuală a clădirii — o clădire fără automatizare are
potențial mult mai mare decât una deja automatizată. Factorii standardului sunt derivați din
simulări pe clădiri de referință, nu din măsurători pe clădirea dvs. Cifra fermă rezultă doar
din auditul tehnic."

**EN:** "This is an estimate, not a guarantee. It excludes: energy price changes (Romanian
non-household electricity rose 15.4% year-on-year in H2 2025); discounting (NPV); maintenance
contract and licence costs; equipment lifetime; and performance drift if the system is not
continuously monitored. It assumes correct commissioning and use as designed. Actual savings
depend above all on your building's current automation class — an unautomated building has far
more headroom than an already-automated one. The standard's factors come from reference-building
simulations, not from measurements of your building. A firm figure comes only from a technical audit."

### Section 5 — De la estimare la ofertă fermă / From estimate to firm quote

**RO:** „1. Estimarea online — orientativă, în 2 minute. 2. Auditul tehnic la fața locului —
stabilim clasa de automatizare actuală conform EN ISO 52120-1, inventariem echipamentele și
citim consumurile reale. 3. Calculul detaliat — standardul prevede și o metodă detaliată, pe
care o aplicăm pe clădirea dvs. 4. Oferta fermă, cu economii estimate pe baza datelor măsurate.
[Solicită auditul →/cerere-oferta]"

**EN:** "1. Online estimate — indicative, two minutes. 2. On-site technical audit — we establish
your current automation class per EN ISO 52120-1, inventory the equipment and read actual
consumption. 3. Detailed calculation — the standard also defines a detailed method, which we
apply to your building. 4. Firm quote, with savings based on measured data.
[Request the audit →/cerere-oferta]"

**Optional "why now" block:** EPBD Art. 13(9) requires BACS in non-residential buildings above
290 kW (deadline 31 Dec 2024) and above 70 kW by 31 Dec 2029; compliant systems are exempt from
periodic HVAC inspections under Art. 23(7). State the EU obligation; confirm Romanian
implementation with a legal check before publishing a Romanian deadline.

---

## D. PRIORITY CHANGES TO `lib/roi-calculator.ts` — ordered by impact

1. **Fix the multi-building cost bug.** `implementationCost` must scale with total area:
   `buildingSize × buildingCount × rate × discount`. Currently understates by up to 10× and
   contradicts the UI copy. *Blocking for any transparency page.*
2. **Remove the `×1.1` comfort and `×1.05` environmental multipliers.** Indefensible;
   inflate results by 15.5%. *Blocking.*
3. **Add a "current automation class" question** (none / timers only / standard BMS / modern
   networked BMS → class D / C / B) and derive the savings % from the standard for that class
   and building type. This is what converts the headline number from assertion to citation.
4. **Correct healthcare to 10–25%** and stop presenting industrial and data centre figures as
   standard-derived (the standard publishes no factors for them).
5. **Split thermal and electrical** rather than applying one blended % to the whole bill —
   the standard's factors are not interchangeable across energy streams.
6. **Re-scope maintenance savings**: cap the compounding, label as Sovitech experience, or
   move out of the headline.
7. **Fix or delete the `paybackInfo` card strings** — hospitality's "10–15 luni" contradicts
   the engine's own 20–31 months.
8. **Add the disclaimer** from §B.6 to the results screen and the share text.
9. Make the energy price an editable input defaulting to €0.1887/kWh (Eurostat H2 2025), with
   the reference date shown, rather than an implicit constant.

---

10. **Add a savings-persistence note and price the maintenance contract against it.** Measured
    persistence is **61%** of first-year electric savings (42% for gas), with **zero** persistence
    for lighting controls, optimum start and thermostat settings — while monitoring-based
    commissioning *grows* savings to 19% by year five. A five-year return that assumes flat
    savings is optimistic without a monitoring contract, and honest with one.

---

### Research gaps — stated, not filled

- **Romanian transposition of the EPBD BACS obligation: NOT CONFIRMED.** Needs a lawyer's check
  of the consolidated Legea 372/2005 and Monitorul Oficial.
- **Romanian kWh/m²/yr benchmarks: NOT FOUND.** Take metered input instead.
- **Current ANRE grid emission factor: NOT FOUND** (Ember/Nowtricity used instead).
- **ASHRAE publishes no savings percentages** — Guideline 0-2019, 0.2-2015, 1.1-2025 and
  Standard 202-2024 are process/technical-requirement documents. This is a finding, not a gap.
- **NYSERDA / BPA / Xcel programme evaluations: NOT COVERED** (search budget exhausted), though
  Crowe 2020 is itself the large utility-programme dataset.
- **Katipamula 2016 (PNNL re-tuning, 15% median): NOT VERIFIED at source** — cited via Crowe 2020.
- **Romanian / CEE BMS cost benchmark: NOT FOUND.** Searched in Romanian and Polish; all results
  were vendor marketing without a floor-area denominator.
- **Romanian kWh/m²/yr benchmarks: NOT FOUND**; **current ANRE grid emission factor: NOT FOUND.**
- No source accessed was the paywalled standard itself; all factor tables are third-party
  reproductions, cross-verified across six independent sources plus arithmetic back-derivation
  (42 consistency checks, all passing).

---

### One-line summary for the busy reader

*The European standard says a class C→A upgrade saves ~22–24% of a typical building's energy
bill. The largest measured datasets say real projects typically deliver 6–13%, with a wide
spread and real risk of zero. The difference is commissioning quality, operator discipline and
ongoing monitoring. Sovitech should publish both numbers and sell the gap.*

<!-- END VERBATIM COPY -->

**End of the verbatim copy.**

---

## Index of figures by evidence type

Added for this import. It is not part of the copy.

**Counting unit.** One figure or figure set tied to one source, as the document presents it: a study, a table row or a factor table. A figure repeated in a later section is counted once, where its flag first appears. Section references are the document's own (A.1 to D).

| Label in the document | Count | Items |
|-----------------------|-------|-------|
| MEASURED | 12 | Crowe et al. 2020 (A.2a); Wheeler 1994 (A.2b); Kang et al. 2015, "lab conditions" (A.2e); the Eurostat price table, 5 rows (A.5); Ember 260 gCO₂/kWh and Nowtricity 236 gCO₂e/kWh (A.5); Kramer et al. 2019, flagged only in the B.1 table; Vandenbogaerde et al. 2023, 7–34 %, flagged only in part C ("Peer-reviewed, measured"; see note 5) |
| MODELLED | 12 | The thermal and the electrical factor tables (A.1, 2 tables); Garzia et al. 2022 and Lamano et al. 2018 (A.2e); the six EU-level rows (A.3); the eu.bac "up to" figures by building type (A.3); the standard's C→A potential of 22–24 % (B.1) |
| VENDOR CLAIM | 7 | The seven SAUTER rows in A.7, headed "all vendor claims". The words "VENDOR CLAIM" appear only in the opening lines. |
| Sovitech assumption | 4 | Thermal share of the bill by building type (B.1); in part C section 3, the cost of 25 EUR/m², the thermal/electrical share of 45–65 % and the maintenance savings |
| Legal fact | 1 | BACS obligation above 290 kW by 31.12.2024 (part C section 3) |
| Expert estimate | 1 | Waide 2014: installed BEMS deliver about 10 % of HVAC energy against a 37 % optimum (A.2e; again in B.1) |
| No evidence flag | n/a | The legal and regulatory statements, labelled "verified" or "CONFIRMED" instead (A.4); the cost tiers and their anchors (A.6), including the €38–40/m² indexation the author calls "ours, not a published figure"; PNNL-22169 (A.6); Gunasingh et al. 2019 persistence and the Texas A&M decay (A.2c, described as "measured, not asserted"); PROBE, EPRI 1986, Smith 1988, Kunkle 1990 and Mills 2009 (A.2a, A.2b); Vandenbogaerde et al. 2025, described as "simulated" (A.2e); the VDMA 24773 ventilation ranges and the eu.bac licence (A.7); the author's own derived figures in B.1 to B.6 and the part C example |

**Totals:** 12 measured, 12 modelled and 7 vendor claims. Not counted again: the "30%" and "13%" marked [MODELLED] in the A.2d chain, and part C's "Standard (modelled)" row, which both restate the A.1 tables.

**What each group could become in the app, if the product owner approves a dataset.** These are notes for a possible proposal, not proposals made here.
- **Factor tables (MODELLED).** A `reference` dataset for the standard, with its edition settled first (note 2). Any use of the factors on a building would still produce only `estimated` values.
- **Prices and emission factors (MEASURED).** `reference` data. Rule 8 requires the VAT basis and the price date, which the Eurostat rows state. But the rule 8 unit registry has no EUR/kWh, EUR/m² or CO₂ unit yet, and no emission-factor dataset exists. `design/dashboards-spec.md` 7.2.22 proposes both, awaiting approval.
- **Measured studies (MEASURED).** Benchmarks. They could feed only `estimated` values with their basis. A study median is not a figure for a given building.
- **Cost tiers (no flag).** Benchmarks with a 2013/14 price base and no Romanian source. They would need a stated price base and date, and the EUR/m² unit that 7.2.22 proposes.
- **Vendor claims.** None is usable as a figure. The document itself finds no stated method behind them.
- **Legal statements.** Rule 11 applies: thresholds come from reference data with their date, whether an obligation applies stays Unknown until an engineer verifies the facts, and the app never attests compliance. The document itself asks for a lawyer's check (note 1).
