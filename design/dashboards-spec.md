# SOVITECH dashboards (part 2): design and function spec

**What this is:** the reference for part 2 of the app, the dashboard area under the top tabs TOPOLOGY, WIREFRAME and METRICS (one screen adds LOGICAL). It is derived from the 10 approved mockups in `design/reference/dashboards/`.

**How to read it:** sections 1 to 6 describe what the mockups show. Anything marked **Proposed** is a suggested default where the mockups disagree or say nothing. It is not a decision.

**Status:** written 2026-09-23 from mockups only. Each screen was extracted by its own agent. Separate agents cross-checked the visual system, the data across all ten screens, and the guardrails. No code exists yet.

**Guardrails:** `docs/guardrails.md` takes precedence over anything here. Section 7 lists what the rules require on these screens, and the gaps these screens expose in the rules.

**Demo data:** every Radisson Blu Bucharest figure in these mockups is invented. The app must label it "Demo data, not an assessment of the real building" (guardrail rule 10). The mockups do not show this label anywhere.

| # | Module › page | Reference image |
|---|---------------|-----------------|
| 01 | Wireframe › 3D View (floor 05) | `reference/dashboards/01-wireframe-3d-view.webp` |
| 02 | Metrics › Financial Overview | `reference/dashboards/02-metrics-financial-overview.webp` |
| 03 | Wireframe › Systems View (floor 05) | `reference/dashboards/03-wireframe-systems-view.webp` |
| 04 | Wireframe › Zones (floor 05) | `reference/dashboards/04-wireframe-zones.webp` |
| 05 | Wireframe › Equipment (floor 05) | `reference/dashboards/05-wireframe-equipment.webp` |
| 06 | Metrics › System Scope | `reference/dashboards/06-metrics-system-scope.webp` |
| 07 | Topology › Building System Topology (3D) | `reference/dashboards/07-topology-3d.webp` |
| 08 | Topology › Logical View | `reference/dashboards/08-topology-logical-view.webp` |
| 09 | Wireframe › Systems View, second version (HVAC selected) | `reference/dashboards/09-wireframe-systems-view-v2.webp` |
| 10 | Topology › 2D Floor Plan (floor 01) | `reference/dashboards/10-topology-2d-floor-plan.webp` |

---

## 1. What part 2 is

Part 2 is where the owner and SOVITECH look at the building and the BMS after the intake. It has three modules:

| Module | What it answers | Screens |
|--------|-----------------|---------|
| **Metrics** | What will it cost, what will it save, what is in scope? | 02, 06 |
| **Topology** | How is the BMS built: management level, automation stations, field devices, integrations? | 07, 08, 10 |
| **Wireframe** | Where is everything in the building: floors, zones, systems, equipment? | 01, 03, 04, 05, 09 |

### 1.1 Two kinds of content are mixed

The screens mix two different products.

1. **Proposal content.** This covers the investment case, scope, point estimates, the proposed SAUTER architecture, zones and equipment from the documents. It can exist right after "Generate Proposal", and every project card says the project is in **"Design Phase"**.
2. **Live operations content.** This covers the "BMS LIVE" status, live occupancy, temperatures and CO₂, alarms, the online, offline and fault counts, the 24-hour trends, a live timeline, "Last sync", "Open in BMS", and installation and warranty dates. That content needs an installed, commissioned BMS that is connected to the app.

A design-phase project cannot have live data. The mockups present invented live values as if they were real, which breaks guardrail rule 1. The guardrails also have no rules yet for live readings (section 7.2).

**Proposed:**
- Build the dashboards for the proposal phase first. Every figure comes from the intake data, the documents, the calculation engine, or SOVITECH's proposed design, each with its badge.
- Gate the operations features behind a project phase field. These are live values, alarms, status, trends, the timeline, "Open in BMS" and warranty data. They appear only from commissioning onwards, and only once the product owner approves a telemetry rule.
- In the demo, show no operations features. A "Simulated" preview would first need proposal 7.2.1 approved, and its readings would have to come from a fixture in the repo (rule 10: fixture sources only).

### 1.2 Page inventory

The sidebars list many more pages than the ten screens show.

| Module | Page in sidebar | Designed? |
|--------|-----------------|-----------|
| Metrics | Financial Overview | 02 |
| Metrics | CAPEX Breakdown, OPEX & Savings, Phasing, Payback Analysis, Lifecycle Cost, Scenarios, Reports | Not yet: nav item only |
| Metrics | System Scope | 06 |
| Topology | Topology | 07 (3D), 10 (2D) |
| Topology | Logical View | 08 |
| Topology | Overview, Property, System Scope, Zones, Equipment, Alarms, Documents, Reports | Not yet. Several duplicate other modules. |
| Wireframe | 3D View | 01 |
| Wireframe | Systems View | 03, 09 (two versions) |
| Wireframe | Zones | 04 |
| Wireframe | Equipment | 05 |
| Wireframe | 2D Floor Plans, Alarms, Documents | Not yet (10 is a Topology 2D view) |

Earlier ChatGPT drafts included pages that could fill some of these gaps. Those drafts covered property, CAPEX with automation levels 1 to 4, OPEX, phasing and alarms. They are not approved designs.

---

## 2. Information architecture

### 2.1 What the mockups show

- **Top tabs.** TOPOLOGY, WIREFRAME and METRICS, each with a dot. Screen 08 adds LOGICAL between Topology and Wireframe. Screen 10 has no tabs at all.
- **Left sidebar, one list per module.** Every item appears in the list order below. The sidebars are set out in 3.4.

| Module | Selector label | Items |
|--------|---------------|-------|
| Wireframe (01, 03, 04, 05, 09) | BUILDING | 3D View, 2D Floor Plans, Systems View, Zones, Equipment, Alarms, Documents. Then the FLOORS list. |
| Metrics (02, 06) | PROJECT | Financial Overview, CAPEX Breakdown, OPEX & Savings, System Scope, Phasing, Payback Analysis, Lifecycle Cost, Scenarios, Reports. Then the project card. |
| Topology (07, 10) | PROJECT | Overview, Property, System Scope, Topology, Zones, Equipment, Alarms, Documents, Reports. Then the project card. |
| Logical (08) | PROJECT | The Topology list with "Logical View" after Topology. Then the project card. |

- **View modes.** A segmented control: 3D / 2D / EXPLODED (Wireframe, 06); 3D / 2D / Logical (07); Physical / Logical / Hybrid (08); 3D / 2D (10); CAPEX / OPEX (02).
- **In-page tabs.** For example, System Scope has OVERVIEW / SYSTEMS / ZONES / EQUIPMENT / CONTROL POINTS / INTEGRATIONS, and detail panels have their own tabs.
- **Bottom bar.** A timeline (Wireframe), a scenario bar (Metrics), a "System view · Live" bar (07), nothing (08), or a status footer (10).

### 2.2 Problems

- **Four navigation layers overlap.** "Logical" appears as a top tab, a sidebar item and two different segmented options. "2D" appears as a sidebar item, a segment on every Wireframe screen, and a Topology segment that leads to screen 10. "3D View" duplicates the 3D segment. On 03 and 04, both "3D View" and the current page carry an active dot.
- **Pages are shared across modules.** Zones, Equipment, Alarms and Documents sit in both Wireframe and Topology. System Scope and Reports sit in both Metrics and Topology.
- **The selector changes its name.** It is called BUILDING in one module and PROJECT in another.
- **"Wireframe" means two things.** In part 1 it is a view mode (step 3: 3D / 2D / Wireframe). In part 2 it is a module.
- **No way back.** No screen offers a route back to the intake answers or to the proposal.

### 2.3 Proposed structure

- **Top tabs.** Three modules only: Metrics, Topology and Wireframe. Logical becomes a view mode of Topology, not a tab.
- **Sidebar.** Content pages only. View modes live only in the segmented control. Each page belongs to exactly one module. Shared content is reached through a cross-link.
- **Proposed page ownership:**
  - **Metrics:** Financial Overview, CAPEX, OPEX & Savings, Payback, Lifecycle Cost, Phasing, Scenarios, System Scope, Reports.
  - **Topology:** Topology, with the view modes 3D, 2D and Logical.
  - **Wireframe:** Model, with the view modes 3D, 2D and Exploded, plus Systems, Zones and Equipment.
  - **Operations (phase-gated):** Alarms. Its placement is decided with the operations scope.
  - **Hamburger or project menu:** Documents, and Property (the intake answers).
- **Rename one "Wireframe".** Rename either part 1's view mode or the part 2 module, so the word means one thing.
- **Hamburger menu.** It holds: back to intake answers, the proposal, documents, project switcher, account.

---

## 3. Visual system

### 3.1 Character, and how it differs from part 1

- **Near-black neutral instead of teal-navy.** Screens 01-09 use a flat, near-black neutral theme (bg about `#04080A`). Panels are defined only by 1px borders (about `#181C1E`). Part 1 uses teal-navy (`#040E14`, borders `#22333B`). Screen 10 is the only part 2 screen in the part 1 family (`#031216`).
- **No chromatic accent.** Selection is white or grey on 01-09, blue on some rows, and light blue on screen 10 (sidebar row, 2D segment, tab underline). Screen 10's checked layer boxes are aqua (`#02ECA6`) except HVAC's, which is blue. There is no filled primary button. Part 1 uses the aqua accent `#01F2D9` for the primary button, the current step and checked controls.
- **Colour carries meaning.** Colour is the main carrier of meaning: a 10-colour system palette, status colours and zone-type colours.
- **Uppercase regular-weight titles** ("FLOOR 05", "BMS INVESTMENT OVERVIEW"), where part 1 uses sentence-case bold H1s.
- **The 3D model.** It is drawn in neutral white-grey wireframe (lines about `#3D3F41`-`#686A6C`), with a near-photoreal podium, trees and "RADISSON BLU" signage. Part 1's model is cyan-tinted glass.
- **Flat surfaces.** There are no shadows. Radii are about 3-4px (screen 10 about 6), against part 1's 8 for cards and 6 for inputs and buttons.

**Proposed:** one theme family for the whole app. Carry part 1's tokens into the dashboards, as screen 10 already does: teal-navy background, part 1 borders and text levels. Use aqua only for the primary action, focus and checked controls, and use a neutral or aqua selection style, never blue (blue is HVAC). Adopt the system palette below for data.

### 3.2 Colour tokens observed in part 2

| Role | Value (screens 01-09) | Note |
|------|-----------------------|------|
| Page background | `#04080A` (range `#000609`-`#040D0F`) | Header, sidebar and bottom bar share it |
| Raised tile | about `#070D10` | Status tiles (05). The 02 KPI tiles are not raised: they use the page background with a border only. |
| Panel border | about `#181C1E` (range `#151A1C`-`#272A2B`) | |
| Row divider | `#0E1416`-`#111516` | |
| Section and header rules | `#121517`-`#202326` | |
| Dropdown border | `#434545` | |
| Text: primary | `#F8FAFB` titles; values `#D0D2D4`-`#E5E7E6` | |
| Text: secondary | `#878D90`-`#A6ABB2` | Nav items, keys, inactive tabs |
| Text: muted / faint | `#66686C`-`#838B93` / `#5A5D5F`-`#6E7476` | Contrast about 3-3.9:1 at 9-11px, which likely fails WCAG AA |

**System palette.** This is the majority mapping used on 03, 05, 06, 07, 08 and 09. Screens 02 and 10 deviate from it.

| System | Hex | System | Hex |
|--------|-----|--------|-----|
| HVAC | `#3C94F8` | Water | `#36DAF0` |
| Lighting | `#F8E00A` | Vertical transport / Elevators | `#F88F0A` |
| Access Control | `#44C551` (drifts to mint on 07-09) | Room Automation | `#A0E589` |
| Fire Safety | `#F5454F` | CCTV | `#F55FA8` |
| Energy | `#A96CF7` | Other | `#C8D0D9` |
| Car Park Management (06 only) | `#7BA2CB` | | |

**Status colours.**

| Status | Colour | Note |
|--------|--------|------|
| OK / live | `#22EEB2` | Drifts from pale aqua to green between screens |
| Warning | Yellow `#F1D80F`-`#F6DF16` | Not part 1's amber `#F3C014` |
| Fault | `#F44E58` | |
| Offline | `#A0ABBA` | Grey on 05. On 07, Offline is red, the same as Fault. |
| In Scope pill | fill `#0D482B`, text `#BFDECE` | |
| Planned pill | fill `#242D31`, text `#BAC1C5` | |

**Colour collisions to resolve:**
- Lighting yellow is the same as warning yellow.
- Fire red is the same as fault red, and on 07 Offline is red too.
- Access green is close to OK green.
- HVAC blue is also the selection colour and the default chart line.
- Water cyan is close to part 1's info cyan.
- Zone-type fills reuse system hues. The same blue, yellow and green floor-05 plate means zone types on 01, systems on 03, 06 and 09, and cost areas on 02. Screen 04 recolours the plate into eight zones using eight system hues.
- The dot at the right of a list row means status on 01, 04 and 05, system identity on 09, and progress on 08.

**Proposed:** separate the colour channels:
- **System identity:** the `sys-*` palette, with one hex per system in a fixed order.
- **Status:** dot plus text label, with amber rather than yellow.
- **Zone types:** low-chroma or labelled fills.
- **Selection and single-series charts:** neutral or aqua, never a system hue.
- **The trailing row dot:** always means status. System identity uses a leading swatch.

Run a colour-blind check on the three close pairs: green and light green, pink and red, cyan and blue.

### 3.3 Typography

Sizes are normalised to 1440px wide.

| Role | Part 2 | Part 1 |
|------|--------|--------|
| Page title | UPPERCASE, regular weight, about 26-32px. Screen 10 is uppercase bold. | Sentence case, 34/700 |
| Eyebrow | Uppercase about 10-11px. Its source varies: the module name (01, 02, 07, 10) or the view name (03, 04, 05, 06, 08, 09). "ZONES VIEW" and "EQUIPMENT VIEW" do not match the nav labels. | "STEP X OF 8" |
| Subtitle | UPPERCASE letter-spaced about 12.5px on 01-06 and 09, with inconsistent trailing periods. Sentence case about 15-16px on 07, 08 and 10. | Sentence case 17px |
| Panel heading | Uppercase about 11.5px. Brightness varies from `#717475` to `#C0C3C4`. | — |
| KPI value | about 25px light. The big stat on 06 is about 32px. | — |
| Header project name / date | 10.5-11px / about 11.5px. The date appears in four styles: mono uppercase, mono title case, proportional bold, proportional title case. | 13/500; mono 12.5-13 |
| Bottom-bar labels, footer tagline | about 9px | — |

**Proposed:**
- **Dashboard title role.** Decide it once: either part 1's sentence-case H1, or a documented uppercase display role such as 30/400.
- **Eyebrow:** "MODULE · PAGE".
- **Subtitle:** sentence case, 15px, no trailing period.
- **Minimum sizes:** 11px for uppercase micro-labels and 12px for data text, all at 4.5:1 contrast or better.
- **Header:** use part 1's header type.

### 3.4 App shell

- **Header**, about 52-66px tall across screens (part 1 is 64). From left to right:
  - wordmark, then a vertical divider, then a two-line tagline;
  - the centred top tabs;
  - a "● BMS LIVE" chip;
  - project name over date and time;
  - a hamburger menu, with 2 lines on 01, 03, 04, 05 and 09 and 3 lines elsewhere.

  Screen 10's header has no top tabs and no BMS LIVE chip; its live status moves to the status footer.

  The tagline reads "BUILDING AUTOMATION / FOR BETTER BUILDINGS" on 01-08, "FOR AIETTER BUILDINGS" (a glitch) on 09, and part 1's "BUILDING INTELLIGENCE / FOR A SUSTAINABLE TOMORROW" on 10. The active tab has a white label, a white dot and a 2px white underline. Inactive dots are filled on most screens but rings on 02 and 06.
- **Sidebar**, about 188-217px wide. It holds:
  - the context selector;
  - the nav list (2.1);
  - in the footer slot, either the FLOORS list (Wireframe) or the project card (Metrics, Topology).

  The selected row has six different styles across screens: an external white dot, a grey or blue fill, and left bars of various greys or blue.
- **Floors list.** Rooftop, 09 … 01, GF, B1, B2 (13 rows) on 01, 03, 04 and 05, each with a layers icon. On 09 the list skips 01 (12 rows).
- **Project card.** A photo, the name, then Type Hotel · Area 34,500 m² · Rooms 424 · Floors 28 + GF + 8 · BMS Platform SAUTER · Status Design Phase. Screen 10 says "2B + GF + 6". The card duplicates the "PROJECT CONTEXT" panel on 02.
- **Right inspector.** Its right edge is fixed, and its width varies from 262 to 380px. It has five header patterns. The body is, in order: tabs, a media slot (minimap, photo, product render or 3D thumbnail), key/value lists, then actions.
- **Bottom bar**, six variants:
  - **(a) Wireframe timeline (01, 03, 09):** transport buttons (rewind, pause, fast-forward), "TIMELINE ● LIVE", a scale reading −6h, −3h, LIVE, +3h, +6h, "VIEW: Building", "LEVEL OF DETAIL: Systems", then "REAL BUILDINGS. REAL RESULTS.".
  - **(b) The same without the selectors (04, 05).**
  - **(c) Metrics (02, 06):** transport buttons (rewind, pause, fast-forward), "SCENARIO VIEW ● BASE CASE" with a scale reading −12M … NOW … +12M, then "REAL BUILDINGS. REAL RESULTS.".
  - **(d) Topology 3D (07):** transport buttons, "SYSTEM VIEW ● Live" with no scale, then "REAL BUILDINGS. REAL RESULTS.".
  - **(e) None (08).**
  - **(f) Status footer (10):** "● BMS Live · Last sync: 17 Sep 2025, 12:36".

**Proposed shell:**
- **Header.** One component, 64px tall, with one tagline.
- **Sidebar.** 208px wide, row pitch 32, one selected style (a 2px accent bar, a fill, and the label at weight 500).
- **Inspector.** 360px wide.
- **Status footer.** Always present, 48px tall. It holds the data status, the demo label and the tagline.
- **Playback bar.** 56px tall, and only on views that have a real time axis.
- **Spacing and size.** A 16px gutter, a 12px panel gap, radius 6 for panels and 4 for controls, and a minimum viewport of 1440×900.
- **Floors list.** Generated from the level register, scrollable and grouped (Roof, Tower, Podium, Ground, Basements), because a real building can have 37 levels.

### 3.5 Components

| Component | Observed | Proposed |
|-----------|----------|----------|
| Segmented control | about 28-29px tall. The active cell has a light-grey outline. Screen 10 is 39px tall with a blue active cell. | 32px, radius 6, accent active; sentence case except "3D" and "2D" |
| Dropdown / toolbar | about 30px, border `#434545`. The first toolbar dropdown changes meaning per screen: "Systems", "Zones" or "Floor 05". | Fixed order: view mode, floor, system filter, secondary. No static label joined to a dropdown. |
| List rows | Six row types (see below). | One row component with slots: leading, primary/secondary text, metric, trailing status, action. Two densities, 36 and 44. |
| KPI tiles | Six treatments. 02: icon, label, value about 25px light, caption, green delta. 09: value-first filled tiles. 05: status tiles. 06: a big stat with a stacked bar. | One tile component, values in tabular figures, one delta chip style |
| Charts | Donuts about 99-145px with a centre label. Line and area charts in HVAC blue with a dashed reference line. Cash-flow bars with a cumulative line. A stacked bar list. | Standard donut sizes, a neutral colour for single series, the rules from the dataviz guidance |
| Tabs | Six styles: uppercase underline, sentence-case filled plus underline, boxed cells, big toggle buttons, blue underline, top-bar tabs. | Two: underline tabs and the segmented control |
| Buttons | Outline only, about 28-41px tall. Label case and alignment vary. | Part 1's family: filled accent primary, outline secondary, ghost. 40px (32 compact). Sentence case. |
| Pins and callouts (3D) | Seven pin styles, four callout styles. Risers on 07. | One pin: a 28px dark disc, a 2px system-coloured ring, a white 16px glyph and a status badge. One callout card. One riser spec. |
| Icons | Outline about 1.5px, but the glyph for one nav item changes across screens. Metrics uses circled glyphs. | Lucide 1.5, with Tabler for the gaps. One glyph per concept. |

The six list-row types:
- systems with eye toggles (03);
- zones with swatch, id, area, status and kebab (04);
- equipment with icon, id and type on two lines, system, status and kebab (05);
- scope with swatch, points and a status pill (06);
- icon-tile cards (09);
- layer cards (07).

---

## 4. Screens

Each screen lists its content as shown (verbatim where quoted), its controls, and whether the content is **proposal** (P) or **live operations** (L).

### 01 Wireframe › 3D View, floor 05

- **Title:** eyebrow "WIREFRAME", "FLOOR 05", subtitle "ZONES, SYSTEMS AND EQUIPMENT".
- **Canvas.**
  - An exploded 3D stack with floor 05 lifted and filled by zone type. Seven pins; one is yellow.
  - Floor labels with functions: 06 Guest Rooms · 05 Conference & Event · 04 Guest Rooms · 03 Guest Rooms · 02 Spa & Fitness · 01 Lobby & Restaurant · GF Entrance & Retail · B1 Technical Rooms · B2 Parking & MEP.
  - Toolbar: 3D / 2D / EXPLODED, and "Systems | All Systems".
- **Floating card "SYSTEMS ON FLOOR 05"** (count and status dot): HVAC 12 · Lighting 8 · Access Control 6 · Fire Safety 4 · Energy Meters 10 (yellow) · Water Systems 4 · Elevators 2 · Other 6 (grey). No total is shown; the rows sum to 52.
- **Inspector "FLOOR 05 / CONFERENCE & EVENT".**
  - Tabs: OVERVIEW / SYSTEMS / EQUIPMENT.
  - A minimap with a compass.
  - Zone legend: Conference Rooms, F&B / Pre-function, Corridors / Core, Back of House.
  - ZONE INFORMATION: Name Conference Room A · Area 420 m² · Setpoints 22°C (Cooling) / 20°C (Heating) · Occupancy 0 / 120 (L) · Air Quality 682 ppm (CO₂) (L) · Status Normal (L).
  - Button: "VIEW ZONE DETAILS →".
- **Bottom:** timeline variant (a).
- **Behaviour.** Selecting a floor, a canvas label or a pin updates the title, the card and the inspector. The system filter changes the overlays.

### 02 Metrics › Financial Overview

- **Title:** eyebrow "METRICS", "BMS INVESTMENT OVERVIEW", subtitle "TRANSPARENT COSTS. MEASURABLE IMPACT.". Toolbar: CAPEX / OPEX with a chevron.
- **KPI tiles (P):**

  | Tile | Value | Caption |
  |------|-------|---------|
  | TOTAL BMS INVESTMENT | €1,280,000 | €37 / m² |
  | EST. ANNUAL SAVINGS | €210,000 | 16.4% vs. baseline |
  | PAYBACK PERIOD | 6.1 years | |
  | 15-YEAR VALUE (NPV) | €3,150,000 | 2.5x ROI |

- **COST BREAKDOWN.** Tabs: By System / By Phase / By Building Area. Donut labelled "€1.28M Total".

  | Line | Share | Amount |
  |------|-------|--------|
  | HVAC Control | 31% | €397,000 |
  | Room Automation | 22% | €282,000 |
  | Lighting Control | 12% | €154,000 |
  | Energy Monitoring | 10% | €128,000 |
  | Access Control | 7% | €85,000 |
  | Fire Safety Integration | 6% | €72,000 |
  | Other Systems | 13% | €163,000 |

- **3D callouts (cost by area):** Floor 05 €220,000 · Floors 06-08 €180,000 · Floors 01-04 €420,000 · Basement & GF €260,000 · Floors 09-28 €200,000.
- **ANNUAL CASH FLOW.** Bars, a cumulative line, and a payback marker labelled "Payback 6.1 years". The y axis runs from −€200K to €400K; the x axis is years 0-14.
- **COST PER m²:**

  | Line | €/m² |
  |------|------|
  | BMS (Total) | €37 |
  | HVAC Control | €11 |
  | Room Automation | €8 |
  | Lighting Control | €4 |
  | Energy Monitoring | €4 |
  | Access Control | €2 |
  | Fire Safety Integration | €2 |
  | Other Systems | €5 |

- **PROJECT CONTEXT:** Building Area 34,500 m² · Rooms 424 · Building Type Hotel · Construction New Build / Major Renovation · BMS Platform SAUTER · Analysis Period 15 years · Currency EUR (€).
- **KEY FINANCIAL INDICATORS:**

  | Indicator | Value |
  |-----------|-------|
  | CAPEX | €1,280,000 |
  | Annual OPEX (BMS) | €38,000 |
  | Est. Energy Savings | €150,000 / year |
  | Est. Operational Savings | €60,000 / year |
  | Total Annual Savings | €210,000 / year |
  | Payback Period | 6.1 years |
  | 15Y Net Present Value (NPV) | €3,150,000 |
  | Internal Rate of Return (IRR) | 18.7% |

- **VALUE DRIVERS:** Energy Efficiency 45% · Operational Efficiency 25% · Maintenance Optimization 15% · Extended Equipment Life 10% · Comfort & Productivity 5%.
- **Sidebar:** project card with photo. **Bottom:** scenario bar (c).
- **Figures that do not hold:** see 6.2.

### 03 Wireframe › Systems View, floor 05 (version 1)

- **Title:** eyebrow "SYSTEMS VIEW", "FLOOR 05", subtitle "BUILDING SYSTEMS AND THEIR DISTRIBUTION."
- **SYSTEMS list.** Each row has an eye toggle, a swatch, a count and a chevron, plus "Show All". Rows: HVAC 142 · Lighting 68 · Access Control 36 · Fire Safety 28 · Energy Meters 54 · Water Systems 22 · Vertical Transport 8 · Room Automation 96 · CCTV 48 · Other 20. The rows sum to 522.
- **SYSTEM INTEGRATION:** BACnet 45% · KNX 18% · Modbus 15% · DALI 10% · M-Bus 7% · Other 5%.
- **Inspector "FLOOR 05 / SYSTEMS OVERVIEW".**
  - Tabs: SUMMARY / EQUIPMENT / ZONES.
  - Summary: Total Equipment 454 · Active Systems 8 / 10 · Alarms (Active) 2 (L) · Floor Area 4,200 m².
  - SYSTEM DISTRIBUTION donut "454 Equipment", with shares HVAC 31% · Lighting 15% · Access Control 8% · Fire Safety 6% · Energy Meters 12% · Water Systems 5% · Vertical Transport 2% · Room Automation 18% · CCTV 11% · Other 2%. The shares sum to 110%. Vertical Transport and Room Automation are dimmed in the legend, which appears to be what "Active Systems 8 / 10" counts, although Room Automation holds 96 items.
  - KEY EQUIPMENT (FLOOR 05): AHU 3 · FCU 42 · VAV Boxes 28 · Lighting Circuits 68 · Access Control Points 36.
  - Button: "View All Equipment →".
- **Bottom:** timeline (a).

### 04 Wireframe › Zones, floor 05

- **Title:** eyebrow "ZONES VIEW", "FLOOR 05", subtitle "FUNCTIONAL ZONES AND ENVIRONMENTAL CONDITIONS."
- **ZONES (FLOOR 05)** list, with search. Each row has a swatch, id, name, area, status dot and kebab.

  | Zone | Area | Status |
  |------|------|--------|
  | Z01 Conference Room A | 420 m² | |
  | Z02 Conference Room B | 380 m² | |
  | Z03 Meeting Rooms | 310 m² | |
  | Z04 Open Office | 620 m² | |
  | Z05 Executive Offices | 280 m² | |
  | Z06 Circulation | 240 m² | |
  | Z07 Restrooms | 120 m² | yellow |
  | Z08 Back of House | 310 m² | |

  Total 2,680 m².
- **Canvas.** Zone callouts on the slab (id, name, area) for Z01-Z07 (none for Z08), and a boxed "05" floor label. The Z07 callout swatch is pink (Back of House's colour), while the list and donut show Restrooms in purple.
- **ZONE DETAILS.**
  - A photo, then "Z01 – CONFERENCE ROOM A", "● Normal".
  - Tabs: Overview / Environment / Systems / Schedules.
  - Floor 05 · Area 420 m² · Occupancy (Live) 18 / 40 · Temperature 22.1 °C, Setpoint 22.0 °C · Humidity 45 %, Setpoint 45 % · CO₂ 682 ppm, Setpoint 800 ppm · Status Normal. All live values (L).
  - Button: "VIEW ZONE ON FLOOR PLAN →".
- **ZONE AREA DISTRIBUTION (FLOOR 05).** Donut "2,680 m² Total": Conference 30% (800 m²) · Meeting Rooms 12% (310) · Office 23% (620) · Executive 10% (280) · Circulation 9% (240) · Restrooms 5% (120) · Back of House 11% (310).
- **ENVIRONMENTAL CONDITIONS BY ZONE, "Last 24 hours" (L).** Columns: Temp, Humidity, CO₂, Occupancy.

  | Zone | Temp (°C) | Humidity (%) | CO₂ (ppm) | Occupancy |
  |------|-----------|--------------|-----------|-----------|
  | Z01 | 22.1 | 45 | 682 | 18/40 |
  | Z02 | 22.3 | 47 | 710 | 12/36 |
  | Z03 | 21.8 | 43 | 660 | 8/28 |
  | Z04 | 22.5 | 48 | 745 | 34/80 |
  | Z05 | 21.9 | 42 | 620 | 6/18 |

- **ZONE PERFORMANCE (L).** A zone dropdown, and tabs Temperature / CO₂ / Humidity / Occupancy. The chart runs 18-26 °C over 00:00-20:00, with a dashed "Setpoint (22°C)" line.
- **Bottom:** timeline (b).

### 05 Wireframe › Equipment, floor 05

- **Title:** eyebrow "EQUIPMENT VIEW", "FLOOR 05", subtitle "BUILDING EQUIPMENT AND THEIR LOCATIONS."
- **Toolbar:** search, All Systems, All Status.
- **EQUIPMENT (42)** list, sorted by system. Rows show the tag, type, system and a status dot:

  | Tag | Type | System | Status |
  |-----|------|--------|--------|
  | AHU-05-01 | Air Handling Unit | HVAC | selected |
  | FCU-05-12 | Fan Coil Unit | HVAC | |
  | FCU-05-13 | Fan Coil Unit | HVAC | |
  | VAV-05-01 | VAV Box | HVAC | |
  | VAV-05-02 | VAV Box | HVAC | yellow |
  | P-05-01 | Chilled Water Pump | HVAC | |
  | P-05-02 | Condenser Pump | HVAC | |
  | CT-05-01 | Cooling Tower | HVAC | |
  | B-05-01 | Boiler | HVAC | red |
  | LTG-05-01 | Lighting Panel | Lighting | |
  | AC-05-01 | Access Control Panel | Access | |
  | FACP-05-01 | Fire Alarm Panel | Fire Safety | |

- **Canvas.** System-coloured ducts and pins, and the callout "AHU-05-01 / Air Handling Unit / 7,500 m³/h". Legend: HVAC, Lighting, Access Control, Fire Safety, Other.
- **Inspector "AHU-05-01 / AIR HANDLING UNIT", ● Online, Normal Operation (L).**
  - Tabs: OVERVIEW / LIVE DATA / MAINTENANCE / DOCUMENTS.
  - A product render.
  - System HVAC · Location Floor 05 – Mechanical Room · Manufacturer Sauter · Model AHU modulair 7500 · Airflow 7,500 m³/h · Cooling Capacity 420 kW · Heating Capacity 380 kW · Power Supply 400 V / 3~ / 50 Hz · Control Sauter EY-modulo · BMS Point Count 128 · Installation Date Mar 2024 · Warranty 5 years (until Mar 2029).
  - Buttons: "VIEW IN 3D", "OPEN DATASHEET", "…".
- **Bottom cards.**
  - EQUIPMENT BY SYSTEM (FLOOR 05), donut 42: HVAC 20 (48%) · Lighting 8 (19%) · Access Control 5 (12%) · Fire Safety 4 (9%) · Other 5 (12%).
  - EQUIPMENT STATUS (L): 38 Online · 2 Warning · 1 Fault · 1 Offline.
  - EQUIPMENT POWER CONSUMPTION (FLOOR 05), "Last 24 hours" (L): 0-400 kW, one "Total Equipment Load" line peaking at about 270 kW. "Baseline (Typical)" appears in the legend, but no baseline line is drawn.
- **Bottom:** timeline (b).

### 06 Metrics › System Scope

- **Title:** eyebrow "SYSTEM SCOPE", "BUILDING SYSTEM SCOPE", subtitle "DEFINE, VISUALIZE AND MANAGE ALL BMS SYSTEMS ACROSS THE BUILDING LIFECYCLE."
- **Buttons:** "Export Scope", "Edit Scope".
- **Page tabs:** OVERVIEW / SYSTEMS / ZONES / EQUIPMENT / CONTROL POINTS / INTEGRATIONS.
- **SYSTEMS IN SCOPE** (search, All Status). Each row shows points and a status pill (P):

  | System | Points | Status |
  |--------|--------|--------|
  | HVAC | 1,240 | In Scope |
  | Lighting | 680 | In Scope |
  | Access Control | 320 | In Scope |
  | Fire Safety | 420 | In Scope |
  | Water Systems | 310 | In Scope |
  | Energy Monitoring | 520 | In Scope |
  | Vertical Transport | 96 | In Scope |
  | Room Automation | 1,020 | In Scope |
  | CCTV | 280 | In Scope |
  | Car Park Management | 180 | In Scope |
  | Other Systems | 160 | Planned |

- **Canvas.** 3D model with system pins. Its 3D / 2D / EXPLODED control sits at the bottom centre.
- **SYSTEM COVERAGE:** a ring reading "92% In Scope", with In Scope 10 / 11, Planned 1 / 11, Not in Scope 0 / 11.
- **TOTAL POINTS:** 5,226, "↑ 12% vs. typical hotel", with a stacked bar and legend: HVAC 24% · Room Automation 20% · Lighting 13% · Energy Monitoring 10% · Fire Safety 8% · Access Control 6% · Water Systems 6% · CCTV 5% · Vertical Transport 2% · Car Park Management 2% · Other Systems 3%.
- **ZONES BY SYSTEM**, with a "View by: Building Area" selector: Guest Rooms 28,800 m² · Public Areas 3,200 m² · Back of House 2,800 m² · Technical Areas 1,900 m² · Parking & MEP 1,800 m². These sum to 38,500 m². Each row has a stacked bar of system shares.
- **INTEGRATION SCOPE:**
  - SAUTER ecos504: BMS Core, Room Automation, Energy Monitoring.
  - Third-Party Systems: PMS (Opera), Access Control, CCTV (Hikvision).
  - Future Integrations (unticked): EV Charging, Car Park System, Weather Data.
- **KEY DELIVERABLES:** System Schematic Diagrams · Point List & Tagging · Integration Matrix · Sequence of Operations (SoO).
- **Sidebar:** project card. **Bottom:** scenario bar (c).

### 07 Topology › Building System Topology (3D)

- **Title:** eyebrow "TOPOLOGY", "BUILDING SYSTEM TOPOLOGY", subtitle "Visualize how all systems, controllers and field devices are connected across the building."
- **Toolbar:** 3D / 2D / Logical, "Floor 05", "All Systems".
- **SYSTEM LAYERS:**
  - Management Level: Vision Center, Servers, Clients.
  - Automation Level: Rooms, Automation Stations.
  - Field Level: Sensors, Actuators, Meters.
  - Third-Party Systems: Integrations.
- **Canvas.**
  - SAUTER Vision Center (a cloud icon) and BMS Clients (Operators, FM, Mobile).
  - The "Building Network (IT / OT)".
  - Four system risers on floor 05 (HVAC, Lighting, Access Control, Fire Safety) down to "SAUTER automation Stations (eco/ modu / EY)", then to field devices ("Sensors & Actuators").
- **SYSTEM DETAILS**, with a system dropdown set to HVAC.
  - Tabs: OVERVIEW / CONTROLLERS / FIELD DEVICES / NETWORK.
  - A 3D thumbnail captioned "Floor 05 – Guest Rooms (North Wing)" with an "Isolate System" button.
  - Controllers 12 (SAUTER ecos504 / modu525) · Field Devices 86 (Sensors, actuators, VAV, valves) · Zones 8 (Guest rooms, corridors, service) · Network BACnet/IP (Building network).
  - SYSTEM SCHEMATIC: Vision Center → Automation Station → Field Devices. Button: "View System Details →".
- **SYSTEM LEGEND:** HVAC · Lighting · Access Control · Fire Safety · Other.
- **STATISTICS (FLOOR 05) (L):** Total Devices 186 · Online 178 (96%) · Offline 6 (3%) · Fault 2 (1%).
- **EXTERNAL INTEGRATIONS:** Fire Detection (Third Party) · Elevators (Schindler) · Energy Metering (Utility) · PMS (Opera) · CCTV (Hikvision) · EV Charging (Third Party) · Weather Data (API).
- **Bottom:** "SYSTEM VIEW ● Live" (d).

### 08 Topology › Logical View

- **Tabs.** This is the only screen with a LOGICAL top tab. Sidebar item: "Logical View".
- **Title:** eyebrow "LOGICAL VIEW", "BUILDING AUTOMATION LOGICAL VIEW", subtitle "Understand the functional architecture, system relationships and data flow across the building."
- **Toolbar:** Physical / Logical / Hybrid, All Systems, All Floors.
- **MANAGEMENT LEVEL (IT).** SAUTER Vision Center (Building Management) · Operators · Facility Management · Mobile Access · Reporting & Analytics. THIRD-PARTY SYSTEMS: PMS · Fire Alarm (FAS) · CCTV · Energy Provider.
- **Bus:** "BACnet/IP | HTTPS | OPC UA".
- **AUTOMATION LEVEL (OT):**

  | Box | Label |
  |-----|-------|
  | HVAC | SAUTER ecos504 Automation Station |
  | Lighting | SAUTER modu525 Automation Station |
  | Access Control | SAUTER modu520 Automation Station |
  | Fire Safety | Integration via BACnet (SAUTER/Third Party) |
  | Energy Monitoring | SAUTER ecos504 Automation Station |
  | Other Systems | (Special Applications) |

- **FIELD LEVEL (DEVICES):**

  | Group | Devices |
  |-------|---------|
  | HVAC | AHU, FCU, VAV, Heat Pump |
  | Lighting | DALI Lights, Presence Sensors, Daylight Sensors |
  | Access Control | Door Controllers, Card Readers, Turnstiles |
  | Fire Safety | Fire Dampers, Smoke Detectors, Alarm Panels |
  | Energy Monitoring | Energy Meters, "Wamter Meters" (sic), Heat Meters |
  | Other | Elevators, EV Charging, Irrigation |

- **DATA FLOW:** a legend (Data to BMS, Control Command, Third-Party Integration) and a mini diagram: Field Devices ↔ SAUTER Automation Stations ↔ Vision Center, with Third-Party Systems (PMS, FAS, CCTV, etc.).
- **KEY METRICS (LOGICAL):** 12 Automation Stations (SAUTER ecos / modu) · 186 Field Devices (connected) · 8 Integrated Systems · 4 Communication Protocols (BACnet, OPC UA, Modbus, HTTPS).
- **SYSTEM INTEGRATION STATUS:**

  | System | Status |
  |--------|--------|
  | HVAC | Planned |
  | Lighting | Planned |
  | Access Control | In Progress |
  | Fire Safety | Planned |
  | Energy Monitoring | In Progress |
  | PMS Integration | Planned |
  | CCTV Integration | Planned |
  | Elevators | Under Review |

  Planned and In Progress share the same green dot.
- **Bottom:** no bottom bar; the tagline sits in the sidebar.

### 09 Wireframe › Systems View, floor 05 (version 2)

- **Title:** eyebrow "SYSTEMS VIEW", "FLOOR 05", subtitle "EXPLORE BUILDING SYSTEMS".
- **List.** A Systems / Equipment toggle, then icon-tile rows with count and system dot: HVAC 42 · Lighting 28 · Access Control 18 · Fire Safety 12 · Energy Meters 10 · Water Systems 8 · Elevators 6 · Other Systems 6. Total 130.
- **Canvas.** Three large pins (HVAC, Lighting, Access Control). Legend: HVAC, Lighting, Access Control, Fire Safety, Other. The floor rail repeats "02", and the sidebar FLOORS list skips 01.
- **Inspector "FLOOR 05 / HVAC SYSTEM"**, "Heating, Ventilation and Air Conditioning", "● 42 Devices".
  - Tabs: OVERVIEW / EQUIPMENT (42) / ZONES / DOCUMENTS.
  - A minimap.
  - Tiles: 12 AHUs · 24 FCUs · 6 VAV Boxes.
  - KEY PERFORMANCE (L): 22.4 °C Avg. Temperature · 52% Avg. Humidity · 420 kW Current Load · 98% System Availability.
  - QUICK ACTIONS: View Equipment · View Zones · System Documents.
- **Bottom:** timeline (a).
- **Versions 03 and 09 compared.** They are two versions of the same page. Version 09 is simpler: one system selected, tiles, quick actions. Version 03 is denser: the full list with toggles, protocol shares and a distribution donut.
- **Proposed:** pick one as the base. Version 09's selection-driven inspector is the clearer pattern.

### 10 Topology › 2D Floor Plan, floor 01

- **Shell.** This screen uses a different shell: the part 1 header with no tabs, the part 1 theme, blue selection, a status footer, and a 3:2 viewport. Sidebar: the Topology list, with "Topology" active.
- **Title:** eyebrow "TOPOLOGY", "2D FLOOR PLAN" (bold), subtitle "Explore building systems, controllers and field devices on the floor plan."
- **Toolbar:** 3D / 2D, "Floor 01 (Lobby)", "All Systems".
- **Plan.** Rooms: Restaurant, Kitchen, Staff Area, Lobby Lounge, Reception, Meeting Rooms, Main Entrance. It shows system pins and routing: blue dashed HVAC, green Lighting, yellow Energy, and red for Access Control at the entrance. It also has a compass, a scale bar reading 0-5-10-20 m, zoom controls (−, 100%, +) and a fullscreen button.
- **Popover** on AHU-01: HVAC · Location Lobby (01) · Status Online (L) · Type Air Handling Unit · "View Details →".
- **SYSTEM LAYERS** (checkboxes): HVAC ✓ · Lighting ✓ · Energy ✓ · Access Control ✓ · Fire Safety ☐ · Water ☐ · Other ☐.
- **ELEMENT DETAILS "AHU-01 / HVAC – Air Handling Unit".**
  - Tabs: Overview / Points / Alarms / Documents.
  - Location Lobby (01) · Status Online (L) · Type Air Handling Unit · Controller SAUTER modulo 6 · Points 12 · Zone Lobby · Last Update 17 Sep 2025, 12:34 (L).
  - Button: "Open in BMS →".
- **Project card:** "Floors 2B + GF + 6".
- **Footer:** "● BMS Live   Last sync: 17 Sep 2025, 12:36" and "REAL BUILDINGS. REAL RESULTS.".

---

## 5. Data part 2 needs

Every figure on these screens must come from one project model. Nothing is typed into a screen by hand. The guardrail value model (`docs/guardrails.md` section 2) applies to each piece below.

| Model | Feeds | Notes |
|-------|-------|-------|
| **Level register** (floor structure by level type, with each level's function, gross area and zoned area) | Floors list, 3D stack, floor selectors, "xS+P+yE" summary, cost-by-level groups, area roll-ups | Levels sum to the building's gross area on one basis. Rule 8 floors. |
| **Zones** (id, level, name, category, area with basis, design capacity, design setpoints) | 01, 04, minimaps, zone roll-ups | Capacity and setpoints are design fields with sources. Live occupancy is telemetry (operations only). |
| **Systems catalogue** (canonical name, icon, colour token, scope decision per project) | Every system list, legend, layer toggle, cost line, points line | Seeded from wizard step 4, edited only in System Scope. |
| **Asset register** (equipment and field devices as assets), with **points** derived per motor, drive and configuration (guardrails 2.5) or read from a point-list document | Every count on 01, 03, 05, 07, 08 and 09; the equipment list; key-equipment tiles | Guardrails 2.5. Counts are queries with the filter shown in their label. Points are never counted as assets. |
| **Proposed design** (controller family per system and asset, network, integrations, deliverables) | 06 integration scope and deliverables, 07, 08 | SOVITECH's proposal, not building facts. It needs a guardrail class (7.2). |
| **Financial model** (CAPEX by system and by level group, savings streams, BMS OPEX, discount rate, horizon, escalation, baseline) | All of 02 | Every KPI is computed from it. Rule 9 and rule 10. |
| **Project phase** (proposal, contracted, installation, commissioning, operation) | Whether live features show at all | Proposed. It does not exist yet. |
| **Telemetry** (point readings with timestamp and quality) | Every (L) value | Operations only. It needs a guardrail rule before build. |
| **Scenarios** (named sets of overrides to decisions and assumptions) | "SCENARIO VIEW · BASE CASE", Scenarios page | Needs a guardrail rule (7.2). |

**Canonical system names (proposed).** HVAC, Lighting, Energy, Access Control, Fire Safety, Water, Elevators, Room Automation, CCTV, Car Park, Other. These match part 1's step 4 labels where they exist. Vendor names (Opera, Hikvision, Schindler) go in a separate field, never in the system name. The mockups currently use several names for the same system:
- "Energy Meters", "Energy Monitoring", "Energy Metering" and "Energy";
- "Vertical Transport" and "Elevators";
- "Fire Safety Integration", "Fire Alarm (FAS)" and "Fire Detection";
- "Car Park Management" and "Car Park System";
- "Water Systems" and "Water";
- "Other" and "Other Systems".

---

## 6. Where the mockups disagree

### 6.1 Data contradictions

- **Floor structure: four versions.**
  - "28 + GF + 8" on the project cards on 02, 06, 07 and 08, and in part 1.
  - "2B + GF + 6" on 10.
  - Rooftop, 09-01, GF, B1, B2 in the floors list (01, 03, 04, 05); on 09 the list skips 01.
  - 06 down to B2 on the 3D stack, and on 09 the stack repeats "02".
  - The cost groups on 02 run up to "Floors 09-28".

  The areas point to about 12 occupied levels: 34,500 m² over 37 levels would be about 930 m² per level, while floor 05 alone has 2,680 m² of zones.
- **Floor 05 has three identities.** It is "Conference & Event" (01; 02 reuses the same zone-coloured plate, labelled only "FLOOR 05 €220,000"), an office-like floor with Open Office and Executive Offices (04), and "Guest Rooms (North Wing)" (07).
- **Floor 05 counts per system: no two screens agree.**

  | Count | Values by screen |
  |-------|------------------|
  | HVAC | 12 (01), 142 (03), 20 (05), 42 (09), 86 field devices and 12 controllers (07) |
  | Total | 52 (01), 522 or 454 (03), 42 (05), 130 (09), 186 devices (07) |
  | AHUs | 3 (03), 12 (09), 1 listed (05) |
  | FCUs | 42 (03), 24 (09) |
  | VAV boxes | 28 (03), 6 (09) |

  The number 42 means all equipment on 05, HVAC devices on 09, and FCUs on 03. Screen 08 gives 186 field devices for the whole building, the same as floor 05's 186 on 07. Part 1 says 126 HVAC assets for the whole building, fewer than 03 shows for one floor.
- **Areas do not add up.**
  - "Zones by system" on 06 sums to 38,500 m² against a 34,500 m² building.
  - Floor 05 is 4,200 m² on 03, while its zones total 2,680 m² on 04.
  - Public Areas at 3,200 m² cannot hold the event floor, the lobby, the spa and retail.
- **System scope differs by screen.**

  | Screen | Systems |
  |--------|---------|
  | 06 | 11 systems, 10 in scope |
  | 03 | 10, "Active 8 / 10" (Vertical Transport and Room Automation dimmed) |
  | 05 | 4 + Other |
  | 01, 09 | 8 |
  | 08 | 8 integrated |
  | 02 | 7 cost lines |
  | Part 1 wizard | 4 selected |

  Car Park is both "In Scope" and a "Future Integration" on 06. Elevators are "In Scope" on 06 and "Under Review" on 08. EV Charging and Weather Data are "Future" on 06 and live integrations on 07. Room Automation carries 22% of CAPEX but is missing from 01, 05, 07, 08 and 09, and is dimmed on 03.
- **Zone Z01 at the same moment.** Occupancy is 0 / 120 on 01 and 18 / 40 on 04. Setpoints are 22 °C cooling / 20 °C heating on 01 and a single 22.0 °C on 04.
- **AHU data.**
  - AHU-05-01 lists 7,500 m³/h airflow with 420 kW cooling. That would need an air temperature change of about 150-170 K; realistic is about 25-40 kW.
  - "Manufacturer Sauter" is wrong: SAUTER supplies controls, not AHUs.
  - A cooling tower, a boiler and plant pumps sit on floor 05.
  - The points per AHU differ tenfold: 128 against 12 for AHU-01.
  - The 420 kW "Current Load" on 09 equals the AHU's cooling capacity and exceeds the floor's metered load on 05.
- **Controller names mix product generations and roles.** The screens use ecos504, modu525, modu520, "EY-modulo", "modulo 6" and "(eco/ modu / EY)". ecos504 is used for the HVAC plant and for energy metering, though it is a room controller. "modu520" matches no SAUTER product: SAUTER lists modu524/525 (EY-modulo 5) and modu660/680 (modulo 6), and announced a new modulo 6 and ecos 5 generation on 30 June 2026 (checked on sauter-controls.com, 23 Sep 2026). These must come from the SAUTER catalogue (rule 1).
- **Protocols.** Screen 03 gives BACnet 45 / KNX 18 / Modbus 15 / DALI 10 / M-Bus 7 / Other 5. Screen 08 gives "4 Communication Protocols (BACnet, OPC UA, Modbus, HTTPS)", while its own bus label reads "BACnet/IP | HTTPS | OPC UA" (no Modbus). Screen 07 gives BACnet/IP only.
- **Project phase against live data.** Every project card (02, 06, 07, 08, 10) reads "Design Phase", while every screen shows BMS LIVE (on 10 in its footer), and the pages show live values, alarms, "Installation Date Mar 2024" (05) and "Last sync" (10). The Construction field reads "New Build / Major Renovation", repeating part 1's New construction vs Renovation conflict.
- **Floor 01 against GF.** Screen 01 says GF is "Entrance & Retail". Screen 10 puts the Main Entrance on "Floor 01 (Lobby)".
- **Header.** Three taglines appear, and 09 has a typo. "TUE, 17 SEP 2025" is the wrong weekday: it was a Wednesday.

### 6.2 Financial figures, recomputed (screen 02)

Inputs as shown: CAPEX €1,280,000; savings €210,000 per year; BMS OPEX €38,000 per year; 15 years.

| Figure | Shown | Recomputed | Verdict |
|--------|-------|------------|---------|
| Cost per m² | €37 | 1,280,000 / 34,500 = €37.1 | Holds, but no area basis |
| Payback | 6.1 years | Gross 6.1. Net of BMS OPEX: 1,280,000 / 172,000 = 7.4 | Ignores OPEX |
| "15-year NPV" | €3,150,000 | Equals 15 × 210,000, undiscounted, with CAPEX not subtracted. Undiscounted net gain is €1.30M. NPV at 5% is about €0.51M net. | Not an NPV |
| ROI | 2.5x | 3.15M / 1.28M = 2.46, built on the wrong NPV | Undefined |
| IRR | 18.7% | 14.2% gross, 10.4% net | Not reproducible |
| "16.4% vs. baseline" | 16.4% | Equals 210,000 / 1,280,000, i.e. savings over CAPEX | Not a baseline comparison |
| Cash-flow chart | Payback marker at 6.1 | Its zero crossing sits at about 5.4. Year 0 is about −€200K, not −€1.28M. The cumulative line ends at about +€230K, not the €1.3-1.9M the tiles imply, and the annual bars peak at about €150K, not €210K. | Disagrees with the tiles |
| Cost by system | Sums to €1.28M | 397 + 282 + 154 + 128 + 85 + 72 + 163 = 1,281k; shares sum to 101% | Rounding |
| Cost per m² parts | €37 total | Parts sum to €36. HVAC is 11.5, shown as 11. | Rounding |
| Cost by area | Sums to €1.28M | Floor 05 alone (€220k) costs more than 20 guest floors (09-28, €200k) | Implausible |
| Value drivers | Energy 45% | Energy is 71% of the savings shown (150 of 210) | No basis |
| Coverage (06) | 92% | 10 / 11 = 91%; by points, 97% | Wrong |
| Car Park share (06) | 2% | 180 / 5,226 = 3.4% | Wrong |
| Distribution (03) | Sums to 110% | Mixes the bases 454 and 522 | Wrong |

### 6.3 Visual inconsistencies, with the proposed canonical choice

| Area | What varies | Proposed |
|------|-------------|----------|
| Theme | Neutral near-black (01-09) against teal-navy (10, part 1) | One theme. Recommended: part 1's tokens app-wide. |
| Accent and selection | White or grey, blue on some rows, light-blue selection on 10 with aqua checkboxes (HVAC's blue). No filled primary button. | Aqua for primary, focus and checked. Neutral or aqua selection, never blue. |
| Header | 3 taglines, 3 tab sets (3, 4, none), 4 date styles, 2 hamburgers, heights 52-66 | One header, 64px, one tagline, mono date from the clock |
| Sidebar | Label BUILDING or PROJECT. Six selected-row styles. Icons change per screen. | One sidebar, label "Project", one selected style, one icon per concept |
| Bottom bar | Six variants | A status footer always, plus a playback bar only where a real time axis exists |
| Page title | Uppercase regular (01-09), uppercase bold (10), sentence case (part 1) | Decide one dashboard title role |
| Tabs | Six styles | Underline tabs plus the segmented control |
| Inspector | Width 262-380, five header patterns | One inspector, 360px |
| System colours | 02 and 10 remap. Access green drifts. The 06 legend swaps CCTV and Vertical Transport. | Lock the `sys-*` tokens |
| Pins | Seven styles | One pin component |
| Zone colours | Different legends on 01 and 04 | One zone-category palette, separate from system colours |
| 3D model | Neutral wireframe here, cyan glass in part 1. Photoreal podium with signage. | One render spec. No signage or branding, if proposal 7.2.8 is approved. |

---

## 7. Guardrail review

### 7.1 Changes the guardrails require on these screens

These apply `docs/guardrails.md` v1.1 as written. Where a row goes further than the rules, it says "Proposed" and names the 7.2 proposal it depends on.

| Screen / element | Rule | Required change |
|------------------|------|-----------------|
| All screens | 10 (demo), GS-1 | A persistent "Demo data, not an assessment of the real building" line, set from the project's `demo` flag, carried into exports |
| All values | 2, 2.8, 7, 10 | Every engineering value goes through the value component, with its badge on the same line and its source line. Dense tables get a badge column. Headline tiles show a "Provisional:" line when an input is provisional. 02's estimate shows its open items (rule 10, stage 2), counted as rule 7 requires ("2 things for you to check · SOVITECH will check …"). An open-items strip on every dashboard is proposed, not required. |
| 02 CAPEX tiles, donut, €/m² | 10, 9, 8, 7 | The stage label is read from stored records (rule 10): "Preliminary investment estimate" on this project's data, or "Indicative range" when a first-estimate input is missing (rule 7). Show a range rounded outward: 2 significant figures when (high − low)/(high + low) is 5% or more, 3 otherwise (rule 9). Show the supply split, VAT basis, price date and price-list version. Name the area basis behind €/m². |
| 02 savings | 10, 8, 1, 7 | Estimated, "could save", with a range and its assumptions (energy price, operating hours) and a named baseline (year, weather normalisation, occupancy). The % names its base. Where no basis for a range exists: an Estimated range only if the registry allows estimation for the field, with the method named. Otherwise "Not available yet", naming the missing input with its action ("add energy bills" only for projects that have bills). |
| 02 payback, NPV, IRR, ROI, chart | 9, 10, 1 | Estimated, with a range, never promised (rule 10). Computed by engine formulas from one snapshot, stating the discount rate, net or gross of BMS OPEX, energy price, operating hours and baseline. The chart is drawn from the same series. None is computed from a CAPEX total that reads "Incomplete" (rule 1). Drop "ROI" unless it has a registered formula. |
| 02 value drivers | 9, 8 | Computed as a share of the estimated savings, or removed |
| 02, 06, 07, 08, 10 project cards; 02 PROJECT CONTEXT | 8, 3, 4 | Area with its basis. Rooms with the count qualifier the evidence states ("424 guest rooms" only if the source says guest rooms; G9-6). Hotel with its badge. "Construction" becomes "Project type", showing the step 1 answer with its step 1 label and the badge Provided by you; "Two values" only if that field is actually in conflict. Currency with its VAT basis. "Status" shows the project phase only once proposal 7.2.11 is approved; until then it is not shown. |
| Floor lists, stacks, cost groups | 8, 4 | Driven by the level register. The floor field shows "Two values" while its candidates disagree. Outputs that depend on it (cost groups, area roll-ups) read "Provisional: two values for floors" with a range where the formula allows, otherwise "Not available yet: two values for floors". |
| All counts (01, 03, 05, 07, 08, 09) | 2.5, 4, 8 | Queries over the asset register with the filter in the label, broken down by asset type. Assets, circuits and points are never mixed in one list or total. Badge Calculated; while any input is provisional, the status line "Provisional: depends on N equipment items not yet checked" (2.8). |
| 06 points | 8, 9, 10, G10-6 | Totals only for in-scope systems. Estimated ranges broken down into hardware I/O, integration by protocol, and virtual. Room Automation shows the GRMS range and an open item. |
| 06 "↑ 12% vs typical hotel" | 1, 2.1, 8, 9 | Remove it. It can return only with an approved benchmark dataset in reference data, because adding a reference dataset is a loosening (section 10) and past-project data also needs rule 13. It would then show as Estimated, with its method, basis and range. Showing its spread in neutral colour is proposal 7.2.5. |
| 03, 07, 08 protocols | 1, 8 | A protocol is a document value only when a document names it, with its variant where the document states it; otherwise the variant is Unknown. "Other" is split into registered protocols, "proprietary" or Unknown (rule 8 list). How SOVITECH's proposed network is labelled is proposal 7.2.10; until it is approved, the network choice is not shown as a building fact. |
| 05 "Manufacturer Sauter", "AHU modulair 7500"; product names on 05-10 | 1, G1-3, G2-5 | Plant maker and model come from documents, nameplate photos, the owner or an engineer's survey, never from model knowledge. SAUTER products appear only as catalogue tokens, with catalogue casing. |
| 05 AHU ratings | 8 | The plausibility check flags them Please check. Every power value names its qualifier: thermal output, electrical input or apparent power (kVA). 09's "Current Load 420 kW" is a live value: see the (L) row. |
| 05 installation date, warranty | 2.3, 1 | From an as-built or contract document, a nameplate photo, the owner or an engineer's survey, never from model knowledge. Installed-equipment facts from design-stage documents stay provisional (2.3). Otherwise "Not provided yet". 10's "Last Update" is a live value: see the (L) row. |
| 05 asset types and plant on floor 05 | 3 | Type badges Likely / Possible / SOVITECH will check. Proposed, not in v1.1: implausible locations go to the engineer queue. |
| 05, 10 asset tags | 2.5 | Tags shown as written in the evidence (e.g. "CTA-01, AHU"). No app-minted tags counted. |
| 07, 08 fire topology | 11 | The fire system is drawn as a separate system with a one-way monitoring link; whether it is third-party is open question 8.8. It is labelled "monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system". Fire dampers and smoke detectors belong to the fire system. No "Control Command" on any life-safety path. The fire-alarm input and fire-mode status per panel appear as points. |
| 06, 05, 08, 10 life-safety scope | 11 | Fire Safety reads "monitoring only". Car-park ventilation states hardwired fire-mode priority. Life-safety assets offer only view, log and documents. Elevators and DALI emergency luminaires are flagged where they qualify. |
| 06 scope pills | 3, 4 | Rendered from the owner's decisions with Provided by you / Suggested. "Planned" becomes a registered option or is removed. "Edit Scope" writes new decisions, and outputs show "Out of date, recalculating". |
| 06, 07 vendor names (Opera, Hikvision, Schindler) | 1, 10 | From a document or the owner only, never model knowledge; otherwise "Not provided yet". Demo vendor names come from fixture documents in the repo (rule 10). Fictitious demo vendors and a vendor field are proposal 7.2.7. |
| 06, 08 supply split | 10 | A supplier named on every line. An unknown split is a range and an open item. The same label everywhere (Access Control is SAUTER on 08 and third-party on 06). |
| 01, 02, 03, 06 per-floor figures | 12, 1 | A per-floor figure with no candidate shows Unknown, with the line "Not found in the analysed documents" plus the documents' coverage (e.g. "pages 1-60 of 200"). Never zero, and no "not found" over unread pages (G12-4). |
| 02, 06 precision | 9, 8 | Everything through the formatting module. "about" only on Estimated values and on originals written as approximate. |
| 06 Export Scope, Reports | 2.8, G10-5 | Exports carry badges, ranges, sources, open items and the demo line |
| 02, 03 dim secondary text | 2.8 | Badges at 12px or larger with WCAG AA contrast. Source lines at 12px and 4.5:1 are proposed (3.3), not a 2.8 requirement. Part 1 sets them at 11px, so decide both parts together. |
| All (L) values | 1, 12 | In the proposal-phase build, no live panels: BMS LIVE, the timeline, LIVE DATA, Alarms, status counts and trends are not built. No live value is shown until a telemetry rule (proposal 7.2.1) and a project phase (proposal 7.2.11) are approved. |

Three things the mockups show are outside the current rules, and are handled only as proposals: brand signage on the model, photos presented as the building or a room, and the "REAL BUILDINGS. REAL RESULTS." claim next to demo figures. See 7.2.8, 7.2.9 and 7.2.15.

### 7.2 Gaps in the guardrails that these screens expose

The rules do not yet cover the situations below. Each is a **proposal for the product owner**. Section 10 of the guardrails requires explicit approval before any of them is added. None is applied.

1. **Live telemetry.** A `telemetry` source on point subjects: connection, point id, unit, timestamp and quality flag.
   - Readings show "as of hh:mm", and "No recent data" after a staleness limit.
   - Aggregates name their method, period and sensor coverage.
   - Telemetry never becomes an engineering value without an engineer event.
   - Demo telemetry reads "Simulated".
2. **Status and alarm vocabulary.** A closed list: Online, Offline, Fault, Warning, No recent data, Not connected.
   - Always text plus colour.
   - Alarms show priority, source and time.
   - On life-safety assets, the UI allows only view, log and documents, in line with rule 11's verbs (monitor, display, log, alarm). Acknowledging a life-safety alarm from the dashboards is not among rule 11's verbs, and is not proposed.
3. **Time scrubbing and forecasts.** Past positions show history. Future positions show forecasts labelled Estimated, with a model and a range. The screen says which time it shows. The timeline is hidden with no BMS.
4. **Scenarios.** Named, versioned overrides to decisions and assumptions, never to facts.
   - Base case is the owner's recorded decisions.
   - Every figure shows its scenario.
   - Nothing becomes a candidate unless the owner adopts it.
5. **Benchmarks shown to the owner.** Rules 1, 8 and 13 already require a versioned reference dataset with its basis, and owner agreement for past-project data. The gap is showing a benchmark comparison itself: its sample, its spread, and neutral colour.
6. **Occupancy and personal data.** Aggregated counts only, with a minimum aggregation. PMS data as room status only, with retention limits. Capacity is a design field. The product owner should get GDPR input.
7. **Third-party vendor names.** A `vendor` field sourced from a document or the owner. Tokens only in AI prose. Fictitious vendors in demo fixtures.
8. **Geometry provenance.** The model comes either from a parsed document, with coverage, or from an illustrative template. An illustrative model carries "Illustrative model, not to scale", with no scale bar, north arrow or signage. Equipment icons appear only for assets with location evidence. Measured areas come only from scaled vector documents.
9. **Imagery.** A photo presented as the building, a room or an asset must be an uploaded photo with its source. Everything else is captioned "Illustration".
10. **SOVITECH's proposed design.** Controller families, network and integrations are labelled "Proposed design · SOVITECH will check". They are an engineer field, and enter a quotation only through its inclusions.
11. **Project phase.** A `phase` field (proposal, contracted, installation, commissioning, operation), set only by an engineer or a commercial event. It gates all operations views.
12. **Financial indicator definitions.** Rules 9 and 10 already require a registered formula with its method, version and assumptions, and rule 1 gives "Not available yet" when an input is missing. The gap is which indicators exist (payback, NPV, IRR, ROI) and the assumptions each must declare: discount rate, period, escalation, net or gross of BMS OPEX.
13. **Non-energy benefits.** Excluded from payback, NPV and IRR by default. Shown separately, and only if the owner opts in.
14. **Reconciliation across views.** Rules 2 and 9 already make one value render identically everywhere: resolved field objects, one value component, rounding in the formatting module. Test case G2-7 checks that. They also require a breakdown and its total to come from one snapshot, which G9-8 checks. No rule yet says the parts of a breakdown must sum to its total. That is the gap, proposed here.
15. **Marketing copy.** Chrome copy goes on the reviewed fixed-copy list. No result claims on demo projects or next to estimates.
16. **Control-like actions.** The dashboards are read-only.
    - View changes use view verbs: "Show this system only", not "Isolate System".
    - "Open in BMS" appears only in the operation phase.
    - No control action targets a life-safety asset. Life-safety assets offer only view, log and documents (7.1).

---

## 8. Open questions that change the build

1. **Scope of part 2.** Is it the proposal dashboards only, the live operations view only, or both? If both, is operations a later phase? This decides whether (L) content is built at all, and whether proposals 7.2.1-3 are needed now.
2. **Theme.** Should the dashboards use part 1's teal-navy with the aqua accent (as screen 10 does), or the neutral near-black of 01-09 across the whole app?
3. **Navigation.** Do you accept the structure in 2.3: three modules, Logical as a Topology view mode, one owner per page, and a route back to the intake and the proposal?
4. **Demo building.** What floor structure should the demo use? Today there are four versions. The screens mostly show 2 basements + GF + 9 floors + roof, and part 1 says "28 + GF + 8". What is floor 05's function?
5. **3D model source.** Is the model built from the owner's documents, or is it an illustrative massing? This drives effort and the labelling in 7.2.8. It is the same question as part 1's Q3.
6. **Financial method.** Should payback be gross or net of BMS OPEX? What are the discount rate, horizon and escalation? What does "vs baseline" compare against?
7. **Systems catalogue.** Should it cover the 11 systems on 06 or the 8 in part 1's step 4? What happens to Room Automation, CCTV, Car Park and Other?
8. **SAUTER product line.** Which generation should the proposed design use (EY-modulo 5 or modulo 6), and which roles (automation stations for plant, ecos for room automation)? Should access control and fire be third-party integrations?
9. **Timeline and scenario bar.** What do −6h…+6h and −12M…+12M mean, and do they stay?
10. **Pages not yet designed.** Will you send CAPEX Breakdown, OPEX & Savings, Phasing, Payback, Lifecycle Cost, Scenarios, Reports, Alarms, Documents and Property, or should the earlier drafts guide them?
11. **Systems View.** Should the base be version 03 (dense) or version 09 (selection-driven)?
