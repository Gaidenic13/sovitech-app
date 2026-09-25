# SOVITECH business content: index

This folder records what the SOVITECH company website says about the business: the company, its offer, its proof, its articles, its sales tools and its vocabulary. Each file quotes the website verbatim, in Romanian and English where the site has both, and names the source file for every statement. It is background for designing and writing the app, not a data source for it.

**Source.** The website repository `Gaidenic13/sovitech-website`, read as text and never run:
- **`main`**, commit `e080614` (2026-08-11). This is the base of every file unless the file says otherwise.
- **`redesign-2026`**, an unmerged branch at `af81353` (2026-08-27), with its content from `d2d15d2` (2026-08-24). Owner decision, 2026-09-24: it is not SOVITECH's current position and will not be merged. Its content is kept for reference only, and `main` is the current website. Branch content is labelled as branch and kept in its own sections or files (see "Which files carry branch content" below).

Verbatim copies of the source files are in [`../website/source/`](../website/source/README.md) (`main`) and [`../website/source-redesign-2026/`](../website/source-redesign-2026/README.md) (the files the branch adds or changes).

## Every figure here is website marketing copy, not app data

Savings percentages, paybacks, ROI, cost bands, prices, areas, room and point counts, project counts, durations and statistics in this folder are marketing statements. They often contradict each other, and several files list the contradictions. None of them is verified engineering data or an approved reference dataset. The app may not use any of them as a value, default, benchmark, range or demo input (`docs/guardrails.md` rule 1, section 2.1 and section 10; test case G1-12). A figure could enter the app only through an approved, versioned reference dataset, and adding one is a loosening that needs the product owner's explicit approval (section 10).

Two related limits:
- **Laws, thresholds and standards** quoted from the site are the authors' reading on a given date. The app takes them only from approved reference data, with their edition or date (rule 11).
- **Copy** is quoted as published, including words the app reserves, such as "garantat", "ofertă" and "compliant" (section 2.8). Quoting them here does not make them usable in the app.

## Company

| File | What it holds | Branch content |
|------|---------------|----------------|
| [`company-profile.md`](company-profile.md) | Identity, positioning, the SAUTER relationship as worded on the site, partners, markets, contacts, headline statistics and testimonials, with what the app may and may not use (section 10) | Sections 11-13: legal identity (SOVITECH CONTROL SRL, CUI, trade register number), the new about page and the contradictions on the branch. Registration facts such as the CUI and the trade register number are public-register facts, but here they come only from an unmerged branch. Confirm them against the official register (ONRC) before any use. |
| [`legal.md`](legal.md) | The website's terms, privacy policy and cookie policy, summarised with sources, their open "[DE COMPLETAT]" items, and what they mean for the app's own privacy work | Whole file: the three pages exist only on the branch |

## Offer

| File | What it holds | Branch content |
|------|---------------|----------------|
| [`audiences.md`](audiences.md) | The eight audiences (P1-P8) of the role pages "Pentru rolul tău": each one's question, pains, messages and calls to action | Whole file: `main` has no role pages |
| [`services.md`](services.md) | The four services on `main` (design, installation, integration, maintenance) with their steps, deliverables, durations and figures, plus all durations and service-level figures in one place | Section 10: the six redesigned service pages, including consultancy and modernisation |
| [`pricing.md`](pricing.md) | Packages, tiers, inclusions and anything price-like on the site, and how it relates to the app's three pricing stages (rule 10). `main` publishes no prices. | Section 7: the cost bands per m², per data point and for maintenance that the branch publishes |
| [`sectors.md`](sectors.md) | The six sectors on `main`, with every headline, metric, feature, capability, testimonial and related-sector link | Section B: the ten rewritten sectors on `/expertiza` |

## Proof

| File | What it holds | Branch content |
|------|---------------|----------------|
| [`references.md`](references.md) | The 25 reference projects on `main` with location, category, stated figures, scope and case-study link; the portfolio statistics; client names shown elsewhere; and the contradictions between pages | Section R: the page moved to `/referinte`, 26 projects, 20 project photos, the named people and percentages removed |
| [`case-studies/therme-bucuresti.md`](case-studies/therme-bucuresti.md) | The Therme București case study, every section, figure and quote, and how other pages describe the same project | Last section: the branch rewrite (1,400 data points and 6 AHUs replace the savings figures) |
| [`case-studies/radisson-blu-bucuresti.md`](case-studies/radisson-blu-bucuresti.md) | The Radisson Blu București case study, and a comparison with the app's fictional demo project. The mockups show that project as "Radisson Blu Bucharest"; the app's demo no longer uses the real hotel's name (owner decision, 2026-09-24). The "Demo data" label of rule 10 still matters here. | A branch note in "Relation to the app's demo project", and the last section (links and punctuation only on the page itself) |

The project photos the branch adds are in [`../brand/imagery/reference-projects/`](../brand/imagery/reference-projects/). Their source and licence are unknown (`references.md`, section R3).

## Content

| Folder | What it holds | Branch content |
|--------|---------------|----------------|
| [`articles/`](articles/README.md) | Twelve articles, one Markdown file each: two from `main` (RO and EN) and ten from the branch (RO only), with the branch's 10 covers and 15 diagrams. Its README lists the regulatory statements the articles make. | The ten branch articles, `covers/` and `diagrams/`, and Part 2 of its README |

## Sales tools

| File | What it holds | Branch content |
|------|---------------|----------------|
| [`roi-methodology.md`](roi-methodology.md) | How the website's savings calculators work: every input, constant, formula step and output, and how they compare with the guardrails | Section 6: the branch's rewritten main calculator and its methodology page |
| [`roi-methodology-research.md`](roi-methodology-research.md) | The branch's sourced research note behind the rewritten calculator, copied verbatim, with notes on the text and an index of its figures by evidence type | Whole file |
| [`lead-funnels.md`](lead-funnels.md) | The quote request form, the BMS guide funnel and the ROI calculator flow, with every field, option and step, mapped onto the app's intake wizard and the rules on asking. No funnel sends data anywhere. | Section 8: the branch's changes to these funnels, the contact form, and the new `/ghid` and `/instrumente` hubs |

### `roi-methodology.md` and `roi-methodology-research.md`

The two files describe different things:
- **[`roi-methodology.md`](roi-methodology.md) describes what the website's calculators do.** It reads the calculator code and records it step by step. Sections 1-5 cover the two calculators on `main`: the main calculator (`/calculator-roi`, in EUR) and the BMS guide calculator (`/ghid-bms/calculator`, in RON), which share no constants. Section 6 covers the branch, which rewrites the main calculator's engine (`lib/roi-calculator.ts`) and adds a public methodology page (`/calculator-roi/metodologie`). Section 6 also records which of the research note's recommendations the branch applied.
- **[`roi-methodology-research.md`](roi-methodology-research.md) is the evidence the branch gathered for that rewrite.** It is a byte-for-byte copy of the branch's `docs/roi-methodology-research.md`: a research dossier, an audit of the calculator's coefficients, draft copy for the methodology page and a list of priority changes. No page on the branch links to it. The notes before the copy point out where it contradicts itself or the guardrails, and the index after it sorts its figures by the evidence label the author gave them (measured, modelled, vendor claim, other labels or none). Nothing inside the copy was edited.

Neither file is an approved reference dataset. The research note is useful starting material for one (energy-saving factors by BAC class, energy prices, emission factors, cost tiers), but each figure could enter the app only through the approval route described above.

## Language

| File | What it holds | Branch content |
|------|---------------|----------------|
| [`glossary.md`](glossary.md) | A Romanian-English list of the BMS and building terms used on the website, with short definitions, where each term appears, and terms that can be misread. It is a reading aid, not the glossary reference dataset the app needs for expanding abbreviations (rule 8). | None: `main` only |

## Which files carry branch content

| File | Branch content | Where |
|------|----------------|-------|
| `legal.md` | Whole file | All sections |
| `audiences.md` | Whole file | All sections |
| `roi-methodology-research.md` | Whole file | All sections |
| `company-profile.md` | Part | Sections 11-13, plus short notes marked **Branch `redesign-2026`** in sections 1-10 |
| `services.md` | Part | Section 10 |
| `pricing.md` | Part | Section 7 |
| `sectors.md` | Part | Section B |
| `references.md` | Part | Section R |
| `case-studies/therme-bucuresti.md` | Part | Last section |
| `case-studies/radisson-blu-bucuresti.md` | Part | Last section, and a branch note in "Relation to the app's demo project" |
| `roi-methodology.md` | Part | Section 6 |
| `lead-funnels.md` | Part | Section 8 |
| `articles/` | Part | Ten of the twelve articles, `covers/`, `diagrams/` and Part 2 of [its README](articles/README.md) |
| `glossary.md` | None | |

Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. So no refresh for a merge is planned. The `main` sections describe the current website, and the branch sections stay as reference only.
