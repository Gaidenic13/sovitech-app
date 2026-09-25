# SOVITECH dashboards (part 2): design and function spec

**What this is:** the reference for part 2 of the app, the dashboard area under the top tabs TOPOLOGY, WIREFRAME and METRICS (one screen adds LOGICAL). It is derived from the 22 approved mockups in `design/reference/dashboards/`, received in two batches: 01-10 and 11-22.

**How to read it:** sections 1 to 6 describe what the mockups show. Anything marked **Proposed** is a suggested default where the mockups disagree or say nothing. It is not a decision.

**Status:** written 2026-09-23 from mockups only, and extended the same day with batch 2 (screens 11-22). Each screen was extracted by its own agent. Separate agents cross-checked the navigation, the visual system, the data and the financial figures across all 22 screens and part 1, and the guardrails. Updated 2026-09-24 with the product owner's decisions on the brand (section 3, question 2 in section 8) and the demo name (below, and question 4). No code exists yet.

**Guardrails:** `docs/guardrails.md` takes precedence over anything here. Section 7 lists what the rules require on these screens, and the gaps these screens expose in the rules.

**Demo data:** every Radisson Blu Bucharest figure in these mockups is invented. The app must label it "Demo data, not an assessment of the real building" (guardrail rule 10). The mockups do not show this label anywhere.

**Demo name (decided 2026-09-24).** Asked "should the demo keep the real hotel's name?", the product owner answered "no" (question 4).
- The demo project is a fictional hotel. Its working name is "Demo Hotel Bucharest", and the owner may rename it.
- The mockups show "Radisson Blu Bucharest". The transcriptions in this spec keep that text as the screens show it.
- **Recommended, not decided:** the demo fixture should not reuse the real hotel's published facts, such as its 424 rooms or its opening in 2007 (`company/business/case-studies/radisson-blu-bucuresti.md`).

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
| 11 | Metrics › Phasing | `reference/dashboards/11-metrics-phasing.webp` |
| 12 | Metrics › OPEX & Savings | `reference/dashboards/12-metrics-opex.webp` |
| 13 | CAPEX Breakdown (configurator, step 4 of 6) | `reference/dashboards/13-capex-breakdown-configurator.webp` |
| 14 | Alarms | `reference/dashboards/14-alarms.webp` |
| 15 | Documents | `reference/dashboards/15-documents.webp` |
| 16 | Topology › System Scope (version 2) | `reference/dashboards/16-topology-system-scope.webp` |
| 17 | Equipment (version 2) | `reference/dashboards/17-topology-equipment.webp` |
| 18 | Reports | `reference/dashboards/18-reports.webp` |
| 19 | Metrics › Scenarios | `reference/dashboards/19-metrics-scenarios.webp` |
| 20 | Zones, floor 01 (version 2) | `reference/dashboards/20-zones-floor-plan.webp` |
| 21 | Metrics › Payback Analysis | `reference/dashboards/21-metrics-payback.webp` |
| 22 | Metrics › Lifecycle Analysis | `reference/dashboards/22-metrics-lifecycle.webp` |

Batch 2 arrived as 15 screenshots. Three were exact duplicates (byte-identical files) and were not saved twice.

---

## 1. What part 2 is

Part 2 is where the owner and SOVITECH look at the building and the BMS after the intake. Batch 1 showed three modules. Batch 2 adds project-level pages and moves some pages between modules (1.3):

| Module | What it answers | Screens |
|--------|-----------------|---------|
| **Metrics** | What will it cost, what will it save, and over what period? | 02, 06, 11, 12, 13, 19, 21, 22 |
| **Topology** | How is the BMS built: management level, automation stations, field devices, integrations? | 07, 08, 10 |
| **System Scope** (batch 2) | Which systems, zones and equipment are in the project? | 16, 17, 20 (reached from Topology) |
| **Wireframe** | Where is everything in the building: floors, zones, systems, equipment? | 01, 03, 04, 05, 09 |
| **Project pages** (batch 2) | Documents, reports and alarms for the whole project | 14, 15, 18 |

### 1.1 Two kinds of content are mixed

The screens mix two different products.

1. **Proposal content.** This covers the investment case, scope, point estimates, the proposed SAUTER architecture, zones and equipment from the documents. It can exist right after "Generate Proposal", and every project card except 12's says the project is in **"Design Phase"** (12 says "Operational"; see below).
2. **Live operations content.** This covers the "BMS LIVE" status, live occupancy, temperatures and CO₂, alarms, the online, offline and fault counts, the 24-hour trends, a live timeline, "Last sync", "Open in BMS", and installation and warranty dates. That content needs an installed, commissioned BMS that is connected to the app.

A design-phase project cannot have live data. The mockups present invented live values as if they were real, which breaks guardrail rule 1. The guardrails also have no rules yet for live readings (section 7.2).

Batch 2 adds more live content, and a third kind:
- **More live content.** 14 is a full alarm console. 12 labels the project "Operational" and shows savings already achieved "vs. baseline". 11 draws the programme six months in, with a NOW line. 17 gives a commissioning date. Every batch 2 screen carries "BMS LIVE" or a "Last sync" footer.
- **Admin content (A).** Documents (15) and reports (18) are neither proposal figures nor telemetry. They are records: files the owner uploaded and outputs the app generated.

**Proposed:**
- Build the dashboards for the proposal phase first. Every figure comes from the intake data, the documents, the calculation engine, or SOVITECH's proposed design, each with its badge.
- Gate the operations features behind a project phase field. These are live values, alarms, status, trends, the timeline, "Open in BMS" and warranty data. They appear only from commissioning onwards, and only once the product owner approves a telemetry rule.
- In the demo, show no operations features. A "Simulated" preview would first need proposal 7.2.1 approved, and its readings would have to come from a fixture in the repo (rule 10: fixture sources only).

### 1.2 Page inventory

After batch 2 the sidebars use 22 distinct labels for 21 pages ("Lifecycle Cost" and "Lifecycle" name one page). 17 pages have a design, and 4 of those have two versions. 4 have none.

| Page | Designed as | Status |
|------|-------------|--------|
| Financial Overview | 02 | Designed, in the batch 1 shell only |
| CAPEX Breakdown | 13 | Designed, as step 4 of a configurator (2.4.4) |
| OPEX & Savings | 12 | Designed |
| Phasing | 11 | Designed. Overlaps 02's "By Phase" tab. |
| Payback Analysis | 21 | Designed |
| Lifecycle Cost / Lifecycle / Lifecycle Analysis | 22 | Designed, under three names |
| Scenarios | 19 | Designed. 21 repeats its comparison table. |
| System Scope | 06 (Metrics), 16 (Topology) | **Two versions**, and 13's panel 1 is a third editor |
| Zones | 04 (floor 05), 20 (floor 01) | **Two versions** |
| Equipment | 05 (floor 05), 17 (whole building) | **Two versions** |
| Systems View | 03, 09 | **Two versions** |
| Topology | 07 (3D), 10 (2D) | Designed |
| Logical View | 08 | Designed |
| 3D View | 01 | Designed |
| Alarms | 14 | Designed. Operations content. |
| Documents | 15 | Designed |
| Reports | 18 | Designed |
| Overview | — | **Not designed.** It is the first item in every batch 2 project list. |
| Property | — | **Not designed** |
| 2D Floor Plans | — | **Not designed as a page.** Plans appear on 10, 17 and 20. |
| Metrics landing ("Back to Metrics", sidebar "Metrics") | — | **Not designed.** 02 is the only candidate. |

**Also not designed:**
- the configurator's Review step;
- the generated proposal itself, and the page after "Generate Proposal";
- detail pages that call-to-action buttons (CTAs) lead to: asset detail, zone editor, scenario editor, assumptions editor, report generator, savings-measure detail and alarm-rule configuration;
- the engineer review queue ("SOVITECH will check");
- the hamburger and avatar menus.

### 1.3 What batch 2 changes

1. **A second flow after the intake.** 13 carries a six-step stepper: Property, System Scope, Zones, CAPEX, OPEX, Review. 16 ends in "Save and Continue", and 17 and 20 go "Back to System Scope". Together they describe a configurator that re-opens decisions made in part 1 (steps 4 and 7) and then walks through the proposal's outputs (2.4.4).
2. **A new navigation direction.** Ten of the 12 new screens (13-22) use a project-wide sidebar led by Overview, in four variants (2.4.2). Five of them (15-18, 20) repeat batch 1's Topology list from 07 and 10 unchanged. Three screens use a new tab set, TOPOLOGY · SYSTEM SCOPE · METRICS, with Wireframe gone. View modes move inside pages: 3D / 2D / Section on 16, List / Floor Plan on 17, and List / Floor Plan / Matrix on 20 (2.4).
3. **A full financial suite that does not agree with itself.** CAPEX packages (13), OPEX (12), phasing (11), payback (21), lifecycle (22) and scenarios (19) now exist. They disagree on the investment (€1.28M or €1.24M), on which option is recommended (three different answers), on the level names, the savings, the horizon and the ROI definition (6.4, 6.5).
4. **The theme converges on part 1.** Screens 15-22 use part 1's teal-navy family, and six of them (15, 16, 18-21) have a filled aqua primary button. 11 and 12 keep the batch 1 near-black theme; 13 and 14 sit between the two (3.6).
5. **The loop back to part 1 closes.** Documents (15) continues part 1 step 2, with the same 12 files that step 8 counts. Reports (18) is where generated outputs live. Neither the proposal nor its generating state is designed yet.

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

### 2.3 Proposed structure (after batch 1)

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

Batch 2 changes this proposal. See 2.5.

### 2.4 What batch 2 shows

#### 2.4.1 Tab sets

| Tab set | Screens |
|---------|---------|
| TOPOLOGY · WIREFRAME · METRICS | 01-07, 09, 11, 12, 16, 17 |
| TOPOLOGY · LOGICAL · WIREFRAME · METRICS | 08 |
| TOPOLOGY · SYSTEM SCOPE · METRICS (new) | 19, 21, 22, always with METRICS active |
| None | 10, 13, 14, 15, 18, 20 |

- 16 and 17 belong to System Scope, but they use the old set, so TOPOLOGY is the active tab.
- On 19, 21 and 22, Topology, System Scope and Metrics are both tabs and sidebar items.
- 11 draws no underline under its active tab.

#### 2.4.2 Sidebars

Batch 2 adds five sidebar variants to the four in 2.1. All use the selector label PROJECT and end with the project card.

| Variant | Screens | Items, in order |
|---------|---------|-----------------|
| Metrics (as 2.1) | 11, 12 | Financial Overview · CAPEX Breakdown · OPEX & Savings · System Scope · Phasing · Payback Analysis · Lifecycle Cost · Scenarios · Reports |
| Project (the batch 1 Topology list) | 15, 16, 17, 18, 20 | Overview · Property · System Scope · Topology · Zones · Equipment · Alarms · Documents · Reports |
| Configurator | 13 | Overview · Property · System Scope · Zones · CAPEX Breakdown · OPEX & Savings · Equipment · Documents |
| Alarms | 14 | Overview · Property · System Scope · Zones · Equipment · Documents · Alarms · Metrics · Reports (no Topology) |
| Project + Metrics | 19 | The project list, then Metrics · Scenarios · Payback Analysis · Lifecycle, all at one level |
| | 21 | The project list, then Metrics. The current page, Payback, has no item of its own, and "Metrics" is highlighted. |
| | 22 | The project list, then Metrics › Payback Analysis, Lifecycle, nested. Parent and child are both highlighted. |

#### 2.4.3 Back links

| Back link | On | Implied parent |
|-----------|----|----------------|
| "← Back to Topology" | 16 | Topology (07 or 10) |
| "← Back to System Scope" | 17, 20 | System Scope: 16 or 06 |
| "← Back to Metrics" | 19, 21, 22 | A Metrics landing page that is not designed |

- **The implied tree** is Topology › System Scope › {Zones, Equipment}, and Metrics › {Scenarios, Payback, Lifecycle}. No sidebar shows it: every list is flat except 22's.
- **The title slot** holds either an eyebrow or a back link, never both. 13 has neither.
- **"Topology" means two things.** 16's column "From Topology" treats topology as the building's inventory of systems, which comes before the scope decision. 07 and 08 treat it as SOVITECH's proposed architecture, which comes after. Under the guardrails the inventory is the asset register (Equipment, 17) and the architecture is the proposed design (7.2.10), so 16's back link points against the order in which the data is made.

#### 2.4.4 The configurator on 13

| | Part 1 wizard | 13 stepper |
|---|---|---|
| Component | Numbered circles, "STEP X OF 8" | Numbered underline tabs in the title band |
| Movement | Back and Continue; Generate on step 8 | No Back or Next. Steps are clickable. "Download Proposal" is available at step 4. |
| Chrome | No sidebar, no tabs | A sidebar that repeats steps 1-5 as pages; no tabs |

| 13 step | Part 1 counterpart | What it does |
|---------|--------------------|--------------|
| 1 Property | Steps 1, 3, 5 | Shows the intake answers again |
| 2 System Scope | Step 4 | Asks again. It is also asked inside 13 ("1. SELECT SYSTEMS"), on 16 (switches and "Edit Scope") and on 06 ("Edit Scope"). |
| 3 Zones | None. Step 3 shows only "Zones 218". | A new output |
| 4 CAPEX | Step 7, in a different model: a depth per system (Level 1-4) instead of step 7's areas | Asks step 7's intent again, and prices it |
| 5 OPEX | None | A new output. 12 is drawn in the Metrics shell, not this one. |
| 6 Review | Step 8 | The same role again. Not designed. |

13 is a second wizard in form, and half of one in content. Steps 1 and 2 and its two panels repeat part 1. Steps 3 to 6 are sections of the proposal.

After batch 2 the systems in scope have four editors: step 4, 06's "Edit Scope", 13's checkboxes and 16's switches. They offer different lists (8, 11, 9 and 12 systems) and show different selections (6.4).

#### 2.4.5 Calls to action

| CTA | On | Problem |
|-----|----|---------|
| "Save and Continue →" | 16 | Leads to Zones (20), which has no Continue. 16 shows no stepper, so the owner cannot tell they are in a flow. "Edit Scope" is a second path to the same writes. |
| "View Equipment Scope →" | 19 | Duplicates 19's own "Equipment Scope" tab. Going to 17 would drop the scenario. |
| "View 15-Year Analysis →" | 13 | No 15-year page exists. Payback uses 10 years, Scenarios and Lifecycle 20. Only 02 uses 15. |
| "Compare Scenarios" | 21 | 21 already carries its own scenario table. Nothing says the selected scenario carries over. |
| "View Equipment in Zone →" | 20 | 17's Zone column (Lobby, F&B, Meeting Rooms…) matches none of 20's zone ids. |
| "View on Floor Plan" | 17 | Two plans could answer it: 17's own Floor Plan mode and 10. |
| "View detailed scope →" | 11 | Scope lines carry no phase, so no filter can apply. |
| "DOWNLOAD PHASING PLAN" (11), "Download Proposal" (13), Export (14, 17, 21, 22) | | No screen says where an export lands. 18 lists none of them. |

**Routes that do not exist:**
- From 10, 15, 18 and 20, no designed control leads to a financial Metrics page (Financial Overview, CAPEX, OPEX, Phasing, Payback, Lifecycle or Scenarios). Their "System Scope" and "Reports" items may open 06 and Reports, which the batch 1 Metrics list owns.
- From 13 and 14, none leads to Topology.
- From 19, 21 and 22, none leads to Financial Overview, CAPEX, OPEX or Phasing.
- No designed screen shows the intake answers. "Property" (on every project list, and 13's step 1) is their likely home, but it is not designed. The proposal is reached only as an export, through 13's "Download Proposal"; no screen opens it.

### 2.5 Proposed structure, revised after batch 2

**Proposed.** This replaces 2.3 where they differ.

```
BEFORE GENERATE
  Intake wizard (part 1, 8 steps), full screen, no sidebar or tabs
  Step 8 "Generate Proposal" → generating state → Overview

AFTER GENERATE: the project workspace
  Header   wordmark · tabs SYSTEM SCOPE · TOPOLOGY · METRICS · project and date · menu
  Sidebar  one project-wide list in groups; the current group is expanded
    PROJECT       Overview: the landing page (stage, headline range, open items)    not designed
                  Property: the intake answers, with badges and Edit                 not designed
                  Documents (15) · Reports (18; row 1 is the proposal)
    SYSTEM SCOPE  System Scope (16, with 06 folded in; the only scope editor)
                  Zones (20) · Equipment (17)
    TOPOLOGY      Topology: 3D (07) · 2D (10) · Logical (08), labelled as SOVITECH's proposed design
    METRICS       Financial Overview (02 redesigned; the target of "Back to Metrics")
                  CAPEX (13) · OPEX & Savings (12) · Payback (21) · Lifecycle (22) · Phasing (11) · Scenarios (19)
    OPERATIONS    Alarms (14) and every live panel; hidden until the project phase allows (7.2.1, 7.2.11)
  Footer   a status footer on every page: data status and the demo line
```

**Rules:**
1. **One page, one owner** (kept from 2.3). Shared content is a link or a filtered view, never a copy. 02's CAPEX/OPEX toggle and "By Phase" tab become links to 13, 12 and 11. 21's scenario table links to 19. 06 folds into 16.
2. **Tabs follow the group.** They show on every workspace page. Project pages show no active tab. 16, 17 and 20 activate SYSTEM SCOPE.
3. **Title slot.** Landing pages carry the eyebrow. Child pages carry "← Back to <parent>", where the parent is fixed by the tree, not by history. Zones and Equipment go back to System Scope. Every Metrics page goes back to Financial Overview. 16 loses "Back to Topology".
4. **Context from a link is a filter chip,** for example "Zone: Z-05 Reception ×" on Equipment. It never changes the back link.
5. **View modes live only in the segmented control.** One 2D plan component, with zone, equipment and routing layers, serves 10, 17 and 20. "2D Floor Plans" is not a page.
6. **Shared state.** One floor selection across System Scope and Topology. One scenario selection across Metrics, defaulting to the base case, which replaces the "SCENARIO VIEW" bottom bar.
7. **One editor per decision:**

| Decision | Before Generate | After Generate | Shown read-only on |
|----------|-----------------|----------------|--------------------|
| Systems in scope | Step 4 | System Scope (16) | 13's panel 1 (with "Edit in System Scope"), 19, 22 |
| Automation depth or package | Step 7 | CAPEX (13) | System Scope, Scenarios |
| Scenario adoption | — | Scenarios (19) compares and selects the view only. Adopting a scenario opens CAPEX (13) for its package and levels, and System Scope (16) for its scope; those editors write the decisions (7.2.17). | Every Metrics figure names its scenario |
| Intake facts and answers | Steps 1, 3, 5, 6 | Property | Project card, Overview |

**What becomes of 13's stepper.** An optional **proposal walkthrough** over the ordinary pages, started from Overview: Property, System Scope, Zones, CAPEX, OPEX & Savings, Review. Review is the stored preliminary proposal.
- The stepper replaces the tabs only in this mode.
- Back and Continue appear on every step, and steps open in any order.
- Nothing is asked again, and Continue writes nothing when nothing changed.

The alternative is to drop the stepper and treat 13 as an ordinary Metrics page.

**Where this revises 2.3:**

| 2.3 said | Now proposed | Why |
|----------|--------------|-----|
| Tabs Metrics, Topology, Wireframe | SYSTEM SCOPE · TOPOLOGY · METRICS. Wireframe is retired. | 19, 21 and 22 use this set, and the model, zones and equipment moved into 16, 17 and 20. It also ends 2.2's double meaning of "Wireframe". |
| Metrics owns System Scope | System Scope is its own group and tab | It is a tab (19, 21, 22), a parent (17, 20) and configurator step 2. Scope is a set of owner decisions, not a metric. |
| Wireframe owns Zones and Equipment | They belong to System Scope | The back links on 17 and 20 |
| A Wireframe "Model" page | No model page. 3D, 2D and Section are view modes. | 16, 17, 20 |
| One sidebar per module | One grouped project sidebar | 10 of the 12 batch 2 screens; 22's nesting |
| Documents and Property in the hamburger | In the sidebar's Project group | Both are on every batch 2 project list (13-22; 11 and 12 use the Metrics list, which has neither), and 15 is a full page |
| Reports in Metrics | In the Project group | Exports come from every module |
| — | A new Overview page: the landing after Generate and the home of open items | It is first in every batch 2 project list (13-22), and rule 7's open items need a home after step 8 |
| — | Financial Overview is the Metrics landing | The "Back to Metrics" links |

**Tab order is the product owner's call.** The mockups show TOPOLOGY · SYSTEM SCOPE · METRICS. Putting SYSTEM SCOPE first follows the dependency order (scope drives the proposed topology and the costs), the sidebar order and 13's step order. The structure works with either order.


---

## 3. Visual system

**Decided 2026-09-24: the app carries the company brand.** Asked "follow the company brand, keep the mockup theme, or treat the app as a sub-brand?", the product owner answered "treat the app as our brand tool" (question 2 in section 8).
- **Recorded interpretation.** The app is a SOVITECH brand tool, not a separate sub-brand. It carries the company brand:
  - the real SOVITECH logo, in its white version on dark (`company/brand/logo/`);
  - the company name;
  - the brand palette;
  - Inter;
  - the brand's radius, depth and motion rules;
  - the brand voice (`company/brand/voice-and-messaging.md`).

  If the owner meant something else, this is easy to revise.
- **The dark variant.** The app is a dark, desktop-first UI, so its visual identity follows the brand's dark variant: deep surface `#07201C`, dark `#0D2E2B`, green `#1F6B4A`, and mint `#C8E6C9` as the single accent on dark. See `company/brand/app-alignment.md`, "App theme". This applies to the whole app, part 1 and part 2.
- **What the mockups still set:** layout, structure, flows and content. They stay the brief for those.
- **What the brand replaces:**
  - all three mockup theme families (3.6): near-black neutral, the in-between family, and teal-navy with aqua;
  - the Eurostile-like "SOVITECH" wordmark;
  - the mockup taglines (3.4, 3.6). The brand has no tagline in its header, footer or logo lockup.
- **How to read 3.1 to 3.6.** The values there remain the record of what the mockups show. They are not the build tokens.
- **Superseded proposals.** Proposals that chose part 1's teal-navy and aqua are superseded where they conflict with the brand. They stay here as a record and are not deleted. They include:
  - 3.1 "Proposed": part 1's teal-navy tokens app-wide, and aqua for the primary action, focus and checked controls. Its other points do not conflict and stand: one theme family for the whole app, and no blue selection, because blue is HVAC;
  - 3.2 "Proposed": aqua as an option for selection and single-series charts;
  - 3.4 "Proposed shell": the tagline in the header and the status footer, and radii of 6 for panels and 4 for controls (the brand uses 1px for buttons, chips and checkboxes, and 2px for surfaces and inputs);
  - 3.5: the segmented control's radius 6, and "Part 1's family" for buttons, which means a filled aqua primary;
  - 3.6 "Proposed" item 1: locking the accent at `#01F2D9`;
  - 6.3's proposed column: the theme, accent and header rows.

  Where a proposal says "accent", the accent is now brand mint.
- **Not changed by the brand.**
  - The brand has no status, system or categorical colours that work on a dark background. `company/brand/app-alignment.md`, "App theme", proposes brand-fitted status, system and chart colours with a scripted contrast and colour-blind check. Until the owner approves them, 3.2 and 3.6 hold the mockup values.
  - The guardrails still win. Badges stay at 12px or larger with WCAG AA contrast (`docs/guardrails.md` 2.8), and the 3.3 minimum sizes and contrast still apply.
- **Still open:** the title role, and a status colour kept apart from the accent. See question 2 in section 8.

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

### 3.6 Batch 2 (screens 11-22)

Colours were sampled from the images. The mockups are AI-rendered, so treat every value as a close target.

**Three theme families.** Read in screen order, the batch moves from the batch 1 theme to part 1's.

| Family | Screens | Background | Borders | Accent |
|--------|---------|------------|---------|--------|
| A. Near-black neutral (as 01-09) | 11, 12 | `#040809` | `#141919`-`#1B2121` | None |
| B. In between | 13 (grey-teal), 14 (slate) | `#091115`, `#0D1318` | `#13191B`-`#1F2628` | Mint `#74E7AC` on 13's "Selected" button and package card; none on 14 |
| C. Teal-navy (part 1 and screen 10) | 15-22 | `#001117`-`#021419` | `#12262B`-`#2D3943`, within ΔE 4 of part 1's `#22333B` on 7 of 8 screens | A filled aqua primary on 15, 16, 18, 19, 20 and 21 |

Family C is more saturated than part 1 (85-100% against 67%), and its hue (193-199°) sits between screen 10's 193° and part 1's 202°. At this lightness the hue difference is not visible; the saturation difference is. Its table header bands (`#03161E`-`#091A22`) and the KPI icon tiles on 21 and 22 (about `#031C26`) are its only raised surfaces, close to part 1's surface `#061219`.

**What converged on part 1 in family C:**
- the background family, the border and rule colours;
- a filled aqua primary button;
- a teal outline over a tinted fill for selection inside content, and for the current page in pagination;
- a status footer on every screen;
- a header 63-67px tall;
- one sidebar selected style;
- bold titles at part 1's weight;
- sentence-case subtitles.

Screen 15's header is exactly part 1's: its tagline "BUILDING INTELLIGENCE / FOR A SUSTAINABLE TOMORROW" and a mono uppercase date.

**What did not converge, even in family C:**
- **The accent drifts to cyan.** Measured against part 1's `#01F2D9`, it moves from about `#00F8EA` on 15 (ΔE about 6) to about `#00FDFA` on 19-21 (ΔE 11-14).
- **The live/OK colour now equals part 1's accent.** The status dots on 19 and 21 (about `#03F3D6`) are ΔE 2.2-4 from `#01F2D9`, although those screens' own buttons have drifted to cyan. Locking the accent at `#01F2D9` without a separate OK hue would make them collide. On 11-14 the OK dot is still green-mint (`#47ECA2`-`#65EBAE`).
- **Two filled primaries on one page** on 16, 18, 19 and 20.
- **Blue selection is back** in the sidebar. The selected row on 15-22 copies screen 10: a blue bar (`#4DA9EC`-`#70AFF7`) on a blue-teal fill. Radio dots (19, 21), 16's detail-tab underline and 17's floor-stack highlight are also blue, and inactive tab dots are periwinkle.
- **Four title roles.**
  - Uppercase regular: 11, 12, 13.
  - Uppercase bold: 16, 17, 20, as on 10.
  - Title Case bold: 15, 18, 19, 21, 22.
  - Title Case regular: 14.

  None uses part 1's sentence case. All 12 subtitles end with a period.
- **Secondary text is nearly white** on 15-22 (inactive nav labels up to `#F8FFFF`). Part 1's text levels (`#C8D2DA` / `#AEBBC6` / `#8E99A4`) are not carried over, so the hierarchy flattens.
- **Seven header variants:** three tab states, two taglines, three date styles, and an avatar "CG" on 13 and 14 where every other screen has a hamburger.
- **Sizes.** The sidebar is 214-220px wide with a row pitch of about 36-39 (proposed: 208 and 32). Inspectors are 238-493px wide (proposed: 360). Buttons are 30-46px tall with Title Case labels (proposed: 40, sentence case). Micro text of about 8-9px appears on 13 and 20.

**Data colour has not converged at all.**
- **Three system palettes.** 13 follows the spec 3.2 majority. 16 follows screen 10's remap (Lighting mint, Energy yellow, Access red) and extends it: Water purple, CCTV and Elevators pale blue. 14 colours its alarm categories by rank. 17 mixes the two within one page: Lighting is a yellow bulb in the table and a green pin on the plan.
- **Collisions inside one legend on 16.** Access Control and Fire Safety are ΔE 1.8 apart, which cannot be told apart. CCTV and Elevators are ΔE 4.1. Lighting is ΔE 2 from the OK colour.
- **One blue, green, yellow and grey set, extended with purple on 21 and 22 and with purple and orange on 20, carries six meanings:** phases (11), OPEX categories (12), scenarios (19), savings streams (21), lifecycle cost categories (22) and zones (20). It collides with the HVAC, Access/OK and Lighting/Warning hues. On 20, zone Z-02 is ΔE 6 from the accent, and Z-03 and Z-05 are two near-identical blues.
- **The floor-05 plate means something new on each screen.** The same blue, yellow and green plate now also shows phases (11) and OPEX (12), on top of zone types, systems and cost areas in batch 1.
- **Status colours.** Offline is red on 17, as on 07. "Generating" is HVAC blue on 18. Alarm priorities on 14 run red, orange, amber and blue. Critical is ΔE 6 from Fire and Low is close to HVAC blue.
- **Legends disagree with their marks** on 12 (Maintenance and Other), 13 (a seventh, unlabelled mauve segment in a six-entry bar) and 22 (CAPEX and Energy).

**Imagery and branding.**
- **"RADISSON BLU" wall lettering** on the reception photo that 20 presents as zone Z-05.
- **The real hotel's name as the title** of 18's report cover, which also carries "CONFIDENTIAL" and "Smarter Buildings. Brighter Experiences.".
- **"Powered by SAUTER"** with SAUTER's logo on 13: the first third-party logo in the app chrome.
- **The project-card photo** splits by family: one render on 11-12, others on 13 and 14, one on 15-22. None shows a tall tower.
- **Two 3D styles.** 11-13 reuse the batch 1 neutral wireframe with the photoreal podium. 16 is part 1's cyan glass, drawn as a section with glowing risers.
- **Depth.** 13 breaks the flat rule with coloured glows on its package cards. 21 and 22 add raised icon tiles.

**Proposed, adding to 3.1-3.5:**
1. **Lock the accent** at `#01F2D9`. Give live/OK status its own hue (for example `#22EEB2`) so a status dot never matches the primary button. Drop 13's mint.
2. **One filled primary per page.**
3. **Adopt screen 10's sidebar geometry, not its colour.** Replace the blue bar with the accent or a neutral bar, and highlight one row at a time.
4. **Choose one title role in family C:** uppercase bold (10, 16, 17, 20) or bold title/sentence case (15, 18, 19, 21, 22, the closest to part 1).
5. **Carry part 1's four text levels** into the dashboards.
6. **A categorical chart palette** separate from `sys-*` and from the status colours, used for phases, scenarios, cost categories and zones. Check it with the dataviz rules and a colour-blind check.
7. **Legends generated from the marks,** so they cannot disagree.

---

## 4. Screens

Each screen lists its content as shown (verbatim where quoted), its controls, and whether the content is **proposal** (P), **live operations** (L) or, from batch 2, **admin** (A): documents and generated outputs.

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

### 11 Metrics › Phasing

- **Title (P):** eyebrow "PHASING", "IMPLEMENTATION PHASES", subtitle "A STRUCTURED APPROACH. MINIMAL DISRUPTION. MAXIMUM VALUE.". The eyebrow is the page name, while 02's eyebrow is the module name. An intro paragraph sits to the right of the title: "Our phased implementation methodology ensures a smooth integration with your building operations, reduces downtime and delivers value from the earliest stages."
- **Toolbar (A):** one outline button, "DOWNLOAD PHASING PLAN". It has a download icon and a "PDF" tag inside the box, and no chevron. The page has no back link, no view modes and no in-page tabs.
- **Phase list (P),** with no heading. Each row has an outlined number box, a coloured dot, the phase name, a months line and a scope line. The amount is right-aligned, with the share below it.

  | # | Dot | Phase | Months | Scope | Amount | Share |
  |---|-----|-------|--------|-------|--------|-------|
  | 01 | blue | Phase 1 – Core Infrastructure | Months 0 – 3 | Network, controllers, core systems | €260,000 | 20% |
  | 02 | green | Phase 2 – HVAC & Plant Systems | Months 3 – 6 | AHU, chillers, boilers, pumps | €420,000 | 33% |
  | 03 | yellow | Phase 3 – Room & Public Area Systems | Months 6 – 10 | Room automation, lighting, access | €320,000 | 25% |
  | 04 | grey | Phase 4 – Integration & BMS Platform | Months 10 – 13 | Software, integration, dashboards | €180,000 | 14% |
  | 05 | light grey | Phase 5 – Testing & Handover | Months 13 – 15 | Commissioning, training, documentation | €100,000 | 8% |

  The total row reads "Total Investment €1,280,000 100%". No row is highlighted, although the inspector shows Phase 2. The two greys are hard to tell apart.
- **Canvas (P).** The same exploded tower render as 02. The lifted slab is filled blue, yellow and green. Callouts with leader lines run top to bottom, and each "Phase N" line is in its phase colour:

  | Callout | Phase | Function |
  |---------|-------|----------|
  | ROOFTOP | Phase 2 | HVAC Plant |
  | FLOORS 06-08 | Phase 3 | Guest Rooms |
  | FLOORS 01-04 | Phase 2 | Guest Rooms & Public Areas |
  | GROUND FLOOR | Phase 1 | Lobby & Amenities |
  | BASEMENT | Phase 1 | Technical Rooms |

  The FLOORS 06-08 leader ends on the lifted slab, which 02 labels "FLOOR 05 €220,000". Floor 05 has no callout. The BASEMENT dot sits on the plaza paving, and no basement is drawn.
- **Inspector "PHASE DETAILS" (P),** with a ✕ close button.
  - "● Phase 2 – HVAC & Plant Systems", then "Months 3 – 6".
  - "Installation and integration of HVAC plant equipment including AHUs, chillers, boilers, pumps and related control systems."
  - KEY DELIVERABLES, each with a green check-circle: DDC controllers installation · AHU and chiller integration · Boiler and pump control · Energy metering integration · Functional testing.
  - ESTIMATED COST €420,000.
  - VALUE UNLOCKED, each with an icon: "~35% HVAC energy savings" · "Stable indoor climate" · "Reduced maintenance costs".
  - Button: "VIEW DETAILED SCOPE →" (outline, full width).
- **IMPLEMENTATION TIMELINE (P).** A Gantt chart with a "Phase" column, then the month columns M1 to M15. The columns are of uneven width, about 50-61px. A dashed "▼ NOW" line sits on the M6/M7 boundary.

  | Row | Bar | Drawn span |
  |-----|-----|------------|
  | 1. Core Infrastructure | blue | M1-M3 |
  | 2. HVAC & Plant Systems | green | M4-M6, ending on NOW |
  | 3. Room & Public Area Systems | yellow | M7-M9 |
  | 4. Integration & BMS Platform | grey | M10 to about two-thirds into M12 |
  | 5. Testing & Handover | grey | about two-thirds into M12 to about 80% into M14; M15 is empty |

  The bars for Phases 3-5 do not match the months in the list.
- **MILESTONES (P).** Dots joined by a vertical grey line. "HVAC Systems Online" has a yellow dot, which is the Phase 3 colour. The other dots are white. The NOW line and this highlight show progress, which is (L) content.

  | Milestone | Month |
  |-----------|-------|
  | Project Kick-off | M1 |
  | Core Infrastructure Complete | M3 |
  | HVAC Systems Online | M6 |
  | Room Systems Complete | M10 |
  | BMS Platform Live | M13 |
  | Final Handover | M15 |

- **Behaviour.** The screen shows no selected state. Selecting a phase row, a Gantt bar or a callout presumably updates PHASE DETAILS. ✕ closes the inspector, and the layout without it is not shown.
- **Shell.** The header is as on 02: tabs TOPOLOGY / WIREFRAME / METRICS, a "● BMS LIVE" chip (L), "RADISSON BLU BUCHAREST" over "TUE, 17 SEP 2025 12:36", and a 3-line hamburger. It differs in three ways. METRICS is marked active only by a white dot: its label is the same grey as TOPOLOGY and WIREFRAME, and there is no underline. The inactive dots are filled, where 02 has rings.
- **Sidebar.** The Metrics list (2.1), with "Phasing" active: a dark fill and a 2px grey left bar. The project card is as on 02, except that Floors reads "2B + GF + 8" (6.4).
- **Bottom:** scenario bar (c): transport buttons, "SCENARIO VIEW ● BASE CASE", a −12M … NOW … +12M scale with the knob at NOW, then "REAL BUILDINGS. REAL RESULTS.". Its NOW knob does not line up with the Gantt's NOW line.
- **Links.**
  - "VIEW DETAILED SCOPE →" presumably leads to System Scope (06 or 16), filtered to the phase. Neither page has a phase filter.
  - "DOWNLOAD PHASING PLAN" (PDF) is an export. Reports (18) has no phasing row or template.
  - There is no back link. 19, 21 and 22 have "← Back to Metrics", but 11 and 12 do not. There is no route back to the intake answers or the proposal (2.2).
  - Spec 1.2 lists Phasing as designed by this screen, overlapping 02's "By Phase" tab. 13's sidebar leaves Phasing out.
  - This page is the full version of 02's COST BREAKDOWN "By Phase" tab, whose content 02 does not show. "Total Investment €1,280,000" repeats 02's TOTAL BMS INVESTMENT, its CAPEX and its "€1.28M Total", and 13's total.
  - It reuses 02's 3D render, with phase callouts where 02 has cost-by-area callouts.
  - "KEY DELIVERABLES" repeats 06's heading with another meaning: work packages here, documents on 06.
  - "~35% HVAC energy savings" overlaps 02's savings figures and 12's HVAC OPEX row.
  - The phase scopes overlap the system selection in part 1 step 4 and the systems list on 06.
- **Figures that do not hold:** see 6.5.

### 12 Metrics › OPEX & Savings

- **Shell.** This screen uses the Metrics shell of 02 and 06.
  - Header: top tabs TOPOLOGY / WIREFRAME / METRICS, with METRICS active. The inactive dots are mixed: TOPOLOGY has a ring and WIREFRAME a filled dot. Then a "● BMS LIVE" chip, "RADISSON BLU BUCHAREST" over "TUE, 17 SEP 2025 12:36", and a 3-line hamburger.
  - Sidebar: the Metrics list, as on 02 and 06. "OPEX & Savings" is active, with a grey fill and a light-grey left bar.
- **Title:** eyebrow "METRICS", "OPERATIONAL EXPENDITURE (OPEX)", subtitle "CONTROL TODAY. GREATER SAVINGS TOMORROW.". A description sits to the right: "Real-time operational costs, system performance and savings opportunities enabled by intelligent building automation." The title does not match the nav label "OPEX & Savings".
- **Toolbar:** dropdowns "All Systems" and "Last 12 Months". The page has no back link and no page buttons. It also has no CAPEX / OPEX toggle; 02 has one.
- **KPI tiles**, each with an outline icon. They are drawn as achieved results against a baseline (L). Down arrows are green and "→ 0%" is white.

  | Tile | Value | Delta | Caption |
  |------|-------|-------|---------|
  | TOTAL ANNUAL OPEX | €1,420,000 | ↓ 18% | vs. baseline |
  | ENERGY COST | €890,000 | ↓ 22% | vs. baseline |
  | MAINTENANCE COST | €320,000 | ↓ 12% | vs. baseline |
  | OPERATIONS (STAFF) | €160,000 | ↓ 8% | vs. baseline |
  | OTHER COSTS | €50,000 | → 0% | vs. baseline |

- **MONTHLY OPEX TREND (L).** The panel shows "↓ 18%" over "vs. previous year".
  - Stacked columns on a €0-€200K axis. There are 13 bars, labelled "Jan Feb Mar Apr May Jun Jul Aug Sep Sep Oct Nov Dec" ("Sep" twice). The bars peak in Feb and are lowest in Dec.
  - Oct, Nov and Dec carry bars although the header date is 17 Sep 2025.
  - Legend: Energy (blue) · Maintenance (slate) · Operations (yellow) · Other (grey). The bars stack blue, green, yellow and dark grey. The green segment has no legend entry, and the slate Maintenance swatch matches no bar.
- **3D model**, centre, with no heading, legend or label. It shows a white-grey wireframe tower of about 8-10 levels [?] over a detailed podium with trees, entrance canopies and illegible facade signage [?]. One upper floor is lifted and filled blue, amber and green, the zone plate of 01 and 02, with 3 pins. On this page those fills can be read as the cost categories.
- **OPEX BREAKDOWN (LAST 12 MONTHS)**, with an ⓘ icon (hover only). A donut reads "€1.42M" over "Total" (L as drawn).

  | Category | Amount | Share |
  |----------|--------|-------|
  | Energy (blue) | €890,000 | 63% |
  | Maintenance (green) | €320,000 | 23% |
  | Operations (yellow) | €160,000 | 11% |
  | Other (grey) | €50,000 | 3% |

- **OPEX INTENSITY**, in the same card: "€41 / m² / year", with "↓ 20%" over "vs. similar buildings". A bar scale runs 0-100 with a tick every 20. It has an aqua "Your Building" marker and a white dashed line. Legend: "Your Building" and "Market Benchmark (€52/m²)". The marker is drawn just below 40 and the dashed line just below 50.
- **SYSTEM OPEX COMPARISON** (L as drawn). Each row has a system icon; the Vertical Transport glyph is garbled. The Savings column is green. There is no total row.

  | System | Current (€/year) | Baseline (€/year) | Savings |
  |--------|------------------|-------------------|---------|
  | HVAC | €520,000 | €720,000 | ↓ 28% |
  | Lighting | €120,000 | €180,000 | ↓ 33% |
  | Room Automation | €95,000 | €130,000 | ↓ 27% |
  | Water Systems | €85,000 | €110,000 | ↓ 23% |
  | Vertical Transport | €60,000 | €70,000 | ↓ 14% |
  | Other Systems | €540,000 | €660,000 | ↓ 18% |

- **ENERGY COST BREAKDOWN (L).**
  - Tabs: Electricity (active, filled plus underline) / Gas / District Heating. The panel shows "↓ 22%" over "vs. previous year".
  - A line and area chart on a €0-€150K axis, Jan-Dec, with "Current Year" (a blue line with dots and an area fill) and "Previous Year" (white dashed).
  - The legend also lists "Target" (green dashed), but no target line is drawn.
- **TOP SAVINGS OPPORTUNITIES (P).** Each row has an icon, the measure, a value and an outline "View" button. No total is shown.

  | Measure | Value |
  |---------|-------|
  | HVAC Optimization | €90,000 / year |
  | Lighting Schedule Refinement | €35,000 / year |
  | Demand-Based Ventilation | €28,000 / year |
  | Predictive Maintenance | €22,000 / year |
  | Setpoint Optimization | €18,000 / year |

- **Colour.** The cost categories reuse system colours: Energy uses HVAC blue, Maintenance the status and Access Control green, and Operations Lighting yellow. The only aqua is the "Your Building" marker.
- **Sidebar:** the project card as on 02, except "Status: Operational"; 02, 06, 07, 08 and 10 read "Design Phase". The photo shows a low-rise building of about five storeys. **Bottom:** scenario bar (c).
- **Links:**
  - **Entry.** The Metrics sidebar item "OPEX & Savings" on 02, 06, 11 and 12. 13's configurator sidebar item "OPEX & Savings" and its stepper step "5 OPEX" point here, but 12 uses the Metrics shell, not the configurator shell. 02's CAPEX / OPEX toggle is a second route to OPEX content. 19, 21 and 22 have no sidebar route here.
  - **Exits.** The five "View" buttons lead to a savings-measure detail page, which is not designed. The ⓘ icon has no designed content. The page has no back link and no route to part 1 or to the bills behind the costs.
  - **Overlaps with earlier screens.**
    - 02: EST. ANNUAL SAVINGS; KEY FINANCIAL INDICATORS ("Annual OPEX (BMS) €38,000", energy and operational savings); COST PER m²; VALUE DRIVERS.
    - 06: the Water Systems, Vertical Transport and Room Automation rows.
    - 11: "~35% HVAC energy savings".
    - 19 Scenarios, 21 Payback Analysis and 22 Lifecycle Analysis: their savings and O&M figures.
  - **Part 1.** Step 2's "Energy: Utility bills, reports" tile is the only intake route for energy cost. No step captures maintenance, staff or other costs. These steps also bear on the content: step 5 (operating profile), step 6 goals ("Reduce energy consumption", "Reduce operating costs"), step 4 scope (Water ☐, Elevators ☐) and step 7 (Predictive Maintenance ☐).
- **Figures that do not hold:** see 6.5.

### 13 Metrics › CAPEX Breakdown (configurator, step 4 of 6)

- **Shell.** A new variant, nearest to 10's.
  - Header: no top tabs, as on 10. A "● BMS LIVE" chip (L). "Radisson Blu Bucharest" sits over "Tue, 17 Sep 2025   12:36" in proportional type. A round avatar "CG" replaces the hamburger. No earlier screen has an avatar. The tagline is the same as on 01-08.
  - Theme: grey-teal (`#091115`), between batch 1's near-black and part 1's teal-navy (3.6). It has a mint green accent on the checkboxes, the sliders, the selected level card and the selected package. Package cards and KPI icons have soft radial glows.
  - Sidebar: selector "PROJECT", "Radisson Blu Bucharest ⌄". The nav list is new: Overview · Property · System Scope · Zones · CAPEX Breakdown · OPEX & Savings · Equipment · Documents. The active item, "CAPEX Breakdown", has a full-width rounded fill and no bar. The icon for OPEX & Savings is a person in a circle.
  - Project card: night photo, then the values from 3.4, including "Floors 28 + GF + 8" and "Status Design Phase".
  - No bottom bar. "REAL BUILDINGS. / REAL RESULTS." is at the foot of the sidebar, as on 08.
- **Title:** no eyebrow. "CAPEX BREAKDOWN", subtitle "Configure your BMS solution and see the investment in real time."
- **Stepper:** "1 Property · 2 System Scope · 3 Zones · 4 CAPEX · 5 OPEX · 6 Review". Step 4 is active, with a white label and a white underline. There are no Back or Next buttons. Under the stepper are "Powered by" and a grey SAUTER logo. Button: "Download Proposal" (outline, download icon).
- **1. SELECT SYSTEMS (P).** "Choose the building functions to include in your BMS." Each row has a checkbox, an icon, a name, a description and "View details →". No row has a provenance badge.

  | | System | Description |
  |---|--------|-------------|
  | ☑ | HVAC | Chillers, AHU, FCU, VAV, heat pumps |
  | ☑ | Lighting | DALI, KNX, presence & daylight control |
  | ☑ | Access Control | Doors, turnstiles, integration |
  | ☐ | Fire Safety | Detection, alarm integration |
  | ☑ | Water Systems | Domestic water, irrigation |
  | ☑ | Energy Monitoring | Meters, submetering, reporting |
  | ☐ | Vertical Transport | Elevators, escalators |
  | ☐ | CCTV | IP cameras, video management |
  | ☐ | Other Systems | Car park, EV charging, etc. |

- **2. AUTOMATION LEVEL ⓘ (P).** "Adjust the level of automation for each system or aply a global level." ("aply", sic)
  - Global level cards, single-select: Level 1 Essential "Basic monitoring" · Level 2 Standard "Control & optimization" (selected: mint border, green-tinted fill) · Level 3 Advanced "Analytics & integration" · Level 4 Premium "Full smart building".
  - Table "System | Automation Level" with a 4-stop slider per checked system (ticks 1-4): HVAC 2 · Lighting 2 · Access Control 2 · Water Systems 2 · Energy Monitoring 3.
  - Link: "Reset to recommended levels" (refresh icon).
- **3D panel (P).** Segmented control "3D View" (active) / "By Floor" / "By System", and the dropdown "All Systems ⌄". An exploded stack with floor 05 lifted and filled in blue, gold and green. There is no legend. The floor labels are the same as on 01: 06 Guest Rooms · 05 Conference & Event (bold, selected) · 04 Guest Rooms · 03 Guest Rooms · 02 Spa & Fitness · 01 Lobby & Restaurant · GF Entrance & Retail · B1 Technical Rooms · B2 Parking & MEP. An unlabelled roof slab sits above 06. The compass "N" has a stray second "N" beside it.
- **3. RECOMMENDED PACKAGES (P).** "Pre-configured solutions based on your selection. All packages use SAUTER products." There are four cards, each with a coloured corner glow (grey, green, blue, gold). Levels 1, 3 and 4 carry a corner icon on the glow. On Level 2 the "Most popular" pill takes the icon's place.

  | Card | Description | Price | Per m² | Bullets (✓) | Button |
  |------|-------------|-------|--------|-------------|--------|
  | Level 1 Essential | Reliable monitoring of core systems. | €620,000 | €18 / m² | Core HVAC monitoring · Basic lighting control · Energy metering (main) · Local controllers (SAUTER) | Select Package |
  | Level 2 Standard, pill "Most popular" | Control and optimization for daily efficiency. | €1,280,000 | €37 / m² | HVAC full control · Lighting (DALI/KNX) · Access control integration · Energy monitoring (detailed) · SAUTER ecos504 controllers | ✓ Selected (filled mint) |
  | Level 3 Advanced | Analytics, integration and higher energy savings. | €1,950,000 | €57 / m² | Advanced HVAC optimization · Scene-based lighting · Full security integration · Detailed submetering · Analytics (SAUTER Vision Center) | Select Package |
  | Level 4 Premium | Fully integrated smart building. | €2,850,000 | €83 / m² | AI-based optimization · Full system integration · Advanced analytics & reporting · Digital twin (SAUTER) · Future-ready infrastructure | Select Package |

  "✓ Selected" is the first filled accent button in part 2.
- **INVESTMENT SUMMARY (P).** Selected Systems 5 of 9 · Automation Level "Level 2 – Standard" · Total CAPEX €1,280,000 (bold) · Cost per m² €37 / m². Below is a stacked bar with seven segments. The fourth segment, a thin mauve sliver between Access Control and Water Systems, has no legend entry. There is no total row.

  | System | Share | Amount |
  |--------|-------|--------|
  | HVAC | 42% | €538,000 |
  | Lighting | 18% | €230,000 |
  | Access Control | 12% | €154,000 |
  | Water Systems | 8% | €102,000 |
  | Energy Monitoring | 10% | €128,000 |
  | Other | 10% | €128,000 |

- **KPI strip (P),** across the bottom of the main column: "Estimated Annual Savings" €150,000 / year, "vs. conventional systems" · "Payback Period" 6.1 years · "CO₂ Reduction" 682 tonnes / year. CTA: "View 15-Year Analysis →" (outline, chart icon).
- **Behaviour.** Not shown. The subtitle suggests that the checkboxes, level cards, sliders and package buttons update the summary and the KPI strip live.
- **Links:**
  - In: the sidebar item "CAPEX Breakdown", here and in the Metrics sidebar of 02, 06, 11 and 12, and the stepper's "4 CAPEX". Probably also 02's CAPEX / OPEX toggle. Section 1.2 lists this page as designed by this screen, but as a configurator step, not as a Metrics content page.
  - Out: the stepper. "2 System Scope" matches 16 or 06, "3 Zones" matches 20, and "5 OPEX" matches 12. None of those screens shows a stepper, and "1 Property" and "6 Review" have no design. "View details →" has no stated target: it could go to the 06 row, 16, or 03/09. "View 15-Year Analysis →" has no stated target. Only 02 uses 15 years (21 uses 10, 22 uses 20). "Download Proposal" exports mid-flow. The avatar and the project dropdown open menus. No back link, and no route back to the intake answers (2.2).
  - Duplicates and overlaps:
    - 02: Total CAPEX €1,280,000, €37 / m², Payback 6.1 years, and a cost-by-system breakdown with different lines.
    - 06, 16 and part 1 step 4: yet another place that edits the same system-scope decision.
    - Part 1 step 7: step 7 records automation areas; this screen sets levels 1-4 per system.
    - Part 1 wizard: the stepper forms a second wizard. Property ≈ step 3 Building, System Scope ≈ step 4 Systems, Review ≈ step 8.
    - 01: the same floor labels and the same floor-05 plate.
    - 19 and 21: tiered options and the savings / payback / CO₂ figures appear there too, with other level names and prices.
- **Figures that do not hold:** see 6.5.

### 14 Alarms › System Alarms

- **Shell.** Screen 13 shares this header (no top tabs, avatar "CG") and this sidebar frame (PROJECT selector, a rounded active fill with no bar, the tagline at the foot). No other screen does. The nav lists differ: 13 carries the configurator list (2.4.2).
  - Header: the tagline "BUILDING AUTOMATION / FOR BETTER BUILDINGS", as on 01-08. There are no top tabs. The "● BMS LIVE" chip is followed by "Radisson Blu Bucharest" over "Tue, 17 Sep 2025" and "12:36". The weekday is wrong: 17 Sep 2025 was a Wednesday. An avatar "CG" replaces the hamburger, as on 13.
  - Theme: slate (`#0D1318`), between batch 1's near-black and part 1's teal-navy (3.6), with no aqua anywhere. Colour is used only for alarm priority and status.
  - Sidebar: selector "PROJECT", then "Radisson Blu Bucharest". The items are Overview · Property · System Scope · Zones · Equipment · Documents · Alarms · Metrics · Reports. There is no Topology item, Metrics is added, and Documents comes before Alarms. The active "Alarms" row has a rounded fill and a red warning icon, with no bar.
  - Project card: the name is in title case on two lines ("Radisson Blu / Bucharest"). The values match spec 3.4, including "Floors 28 + GF + 8" and "Status Design Phase". The photo is a night render of a building of about six storeys.
  - Bottom: there is no bottom bar. "REAL BUILDINGS. / REAL RESULTS." sits at the foot of the sidebar, as on 08.
- **Title:** eyebrow "ALARMS", then "System Alarms" in title case (not uppercase), then the subtitle "Monitor, manage and resolve alarms to ensure optimal building performance and guest comfort." There is no back link.
- **Toolbar:** "Export Alarms" (download icon) and a "Last 7 days" dropdown.
- **KPI tiles (L):**

  | Icon | Value | Label | Delta | Caption |
  |------|-------|-------|-------|---------|
  | red filled disc "!" | 8 | Active Alarms | ↑ +3 (red) | vs. previous period |
  | amber triangle "!" | 12 | Acknowledged | ↓ -25% (green) | vs. previous period |
  | blue clock | 4 | Resolved (24h) | ↑ +33% (blue) | none |
  | white bell | 0 | Critical Unresolved | "—" (grey) | none |

- **ALARM DISTRIBUTION (L).** Donut "24 / Total": Critical 4 (17%) · High 8 (33%) · Medium 8 (33%) · Low 4 (17%). The segments are red, orange, yellow and blue.
- **ALARMS TREND (L).** Stacked daily bars from 11 Sep to 17 Sep, on a 0-30 axis with no unit and no legend. From the bottom, the stack is red, orange, yellow, blue, which matches the priority colours. The values below are read from pixels [?]:
  - Bar tops: about 20 · 18 · 18.5 · 18 · 21 · 30 · 26.
  - Red segments: about 4 · 4 · 4 · 4 · 4.5 · 7 · 6.
- **TOP ALARM CATEGORIES (L).** Horizontal bars on dark tracks, with the count at the right: HVAC 8 · Energy 5 · Access Control 4 · Fire Safety 3 · Water Systems 2 · Lighting 2.
  - The bar colours follow rank (red, orange, yellow, blue, light blue, grey), not the system colours in spec 3.2.
  - The HVAC bar runs past its track.
- **Filter bar:** "Search alarms...", "All Statuses", "All Priorities", "All Systems", "All Locations", and a ghost button "Reset".
- **Alarm table (L).** There is a select-all checkbox, plus one checkbox and one "⋯" menu per row. The menu contents are not shown.
  - Priority shows as a coloured dot with coloured text.
  - Status shows as a tinted pill: Active red, Acknowledged amber, Resolved green.

  | Priority | Date & Time | Alarm Name | System | Location | Status |
  |----------|-------------|------------|--------|----------|--------|
  | Critical | 17 Sep 2025, 10:24 | AHU-01 Supply Air Temperature High | HVAC | Level 5 – Guest Rooms | Active |
  | Critical | 17 Sep 2025, 09:12 | Chiller-02 Communication Loss | HVAC | Technical Room B2 | Active |
  | High | 17 Sep 2025, 08:41 | Fire Damper Fault | Fire Safety | Level 3 – Conference | Acknowledged |
  | High | 16 Sep 2025, 22:17 | Main Water Pressure Low | Water Systems | Basement 1 | Active |
  | Medium | 16 Sep 2025, 18:03 | Room 512 – Temperature Deviation | HVAC | Level 5 – Guest Rooms | Acknowledged |
  | Medium | 16 Sep 2025, 14:20 | Lighting Circuit Overload | Lighting | Level 1 – Lobby | Resolved |
  | Low | 15 Sep 2025, 11:05 | Access Door Forced Open | Access Control | Service Entrance | Resolved |
  | Low | 15 Sep 2025, 09:33 | Energy Meter – No Data | Energy Monitoring | Main Switchboard | Resolved |

  The table shows 8 of the 24 alarms. It has no pagination, row count, sort indicator or timezone.
- **Promo panel (A).** A lightbulb icon, then "Proactive building performance", then "Set intelligent alarm rules, receive notifications and reduce downtime with SAUTER BMS.". The button is "Configure Alarm Rules" (gear icon).
- **Behaviour.** No behaviour is shown beyond the controls.
  - The checkboxes imply bulk actions, but no bulk-action bar is drawn.
  - The charts show no tooltips or legend toggles.
  - "Resolved (24h)" has its own time window, separate from the page's "Last 7 days".
- **Links:**
  - In: the only way in is the sidebar item "Alarms". Four panels show alarms, three of them with a count, and should open this page filtered, but no link is defined:
    - 03 "Alarms (Active) 2";
    - the "Alarms" tab on 10;
    - "Alarms (0)" on 17;
    - "Alarms (0)" on 20.

    For this to work, "All Locations" would need floor, zone and asset values.
  - Out:
    - There is no back link.
    - Rows do not link to their asset (17), their zone (20) or a floor view (01, 03, 10).
    - "Configure Alarm Rules" leads to a page that is not designed.
    - "Export Alarms" produces a file.
    - The sidebar "Metrics" item leads into the Metrics module, but its target page is not defined.
    - There is no route to Topology: no tabs and no Topology item.
  - Overlaps:
    - This is the first design for the Alarms page (1.2). Spec 2.3 places it under Operations, phase-gated.
    - The Active Alarms tile repeats 03's "Alarms (Active)".
    - The status counts overlap 05 EQUIPMENT STATUS and 07 STATISTICS.
    - The project card repeats 02 PROJECT CONTEXT.
    - "All Systems" and the categories repeat the system list from 06 and part 1 step 4.
- **Contradictions:** see 6.4.

### 15 Project › Documents

- **Shell.** Same as 10:
  - The part 1 header: "SOVITECH" | "BUILDING INTELLIGENCE / FOR A SUSTAINABLE TOMORROW". There are no top tabs, no BMS LIVE chip, and a hamburger at the far right.
  - At the right, "RADISSON BLU BUCHAREST" sits over "TUE, 17 SEP 2025  12:36". The date is mono and uppercase, where 10 writes it in title case.
  - The teal-navy theme and a 3:2 viewport.
  - The sidebar is the Topology list, with "Documents" active: a blue left bar plus a fill, as on 10.
  - This shell has no route to any Metrics page.
- **Project card (P).** The night photo, "RADISSON BLU / BUCHAREST", then Type Hotel · Area 34,500 m² · Rooms 424 · Floors 2B + GF + 6 · BMS Platform SAUTER · Status Design Phase. The values are the same as on 10.
- **Title.**
  - Eyebrow "DOCUMENTS", then "Project Documents".
  - The title is bold title case, as on 18. Part 1's H1 is bold sentence case, and 01-10 use uppercase.
  - Subtitle: "Upload, manage and review all project-related documents. These documents help us understand your building and design the right solution."
  - There is no back link.
- **Button.** "Upload Document", at the top right: a filled aqua primary with an upload icon. It is the only filled button on the page.
- **Filter bar (A).**
  - Single-select category chips with counts: "All Documents (12)" (selected, with a teal fill and border) · "Architectural (3)" · "MEP (4)" · "Operational (2)" · "Regulatory (2)" · "Other (1)". The category counts sum to 12.
  - A search box, "Search documents..." (possibly a single ellipsis character [?]), with a magnifier icon.
  - A square filter button with a sliders glyph.
- **Documents table (A).**
  - Columns: Name · Category · Version · "Date Added ↓" (the active sort, newest first) · Uploaded By · Size.
  - Each row starts with a file-type icon and ends with a "•••" kebab. The kebab column has no header.
  - Row 1 is selected (teal fill and border) and fills the inspector.

  | Icon | Name | Category | Version | Date Added | Uploaded By | Size |
  |------|------|----------|---------|------------|-------------|------|
  | PDF | Floor_Plan_GF.pdf | Architectural | v1.0 | 17 Sep 2025 | A. Popescu | 4.2 MB |
  | PDF | HVAC_Schematics.pdf | MEP | v2.1 | 15 Sep 2025 | M. Ionescu | 6.8 MB |
  | DWG | Electrical_Drawings.dwg | MEP | v1.0 | 12 Sep 2025 | M. Ionescu | 12.4 MB |
  | PDF | BMS_Existing_System.pdf | Operational | v1.3 | 10 Sep 2025 | C. Stan | 3.1 MB |
  | XLSX | Energy_Consumption_2024.xlsx | Operational | v1.0 | 08 Sep 2025 | R. Dumitru | 1.2 MB |
  | PDF | Fire_Safety_Report.pdf | Regulatory | v1.0 | 05 Sep 2025 | A. Popescu | 5.6 MB |
  | PDF | Building_Management_Policy.pdf | Regulatory | v1.0 | 03 Sep 2025 | A. Popescu | 1.9 MB |
  | DOC | Site_Visit_Notes.docx | Other | v1.0 | 01 Sep 2025 | S. Marin | 0.8 MB |

  - Below the table: "Showing 1–8 of 12 documents", and pagination ‹ · 1 · 2 · ›. Page 1 is current, with an aqua outline. "‹" has the stronger filled style although it cannot be used on page 1. "›" is fainter.
  - The icons reuse system hues: PDF is red, DWG and DOC are blue, and XLSX is green. The .docx file has a "DOC" icon, and the PDF glyph is garbled.
- **Inspector "Floor_Plan_GF.pdf" (A).** "PDF • 4.2 MB", with a close "×".
  - **Preview.** A white sheet showing a rectangular plan:
    - grid lines, partitions, door swings, a hatched core and an entrance notch at the bottom centre;
    - "GROUND FLOOR PLAN" at the bottom left and a north arrow "N";
    - no scale bar and no legible title block.

    It is the only light surface on the screen.
  - Category Architectural · Version v1.0 · Date Added 17 Sep 2025, 10:24 · Uploaded By A. Popescu · Description "Ground floor architectural plan (as provided)."
  - Buttons: "Download" (a wide outline button with a download icon) and a square "•••".
- **Not on the screen.**
  - No analysis status, stage, as-written revision, issue date, source lines, or link from a document to the values it produced.
  - The menus behind the kebabs and the filter button are not shown.
- **Behaviour.** A chip or the search box filters the list. The column headers sort it. Clicking a row opens it in the inspector.
- **Bottom.** The status footer (f): "● BMS Live   Last sync: 17 Sep 2025, 12:36" (L) and "REAL BUILDINGS. REAL RESULTS.".
- **Links.**
  - **Where its controls lead.**
    - "Upload Document" has no designed target. It presumably reuses the part 1 step 2 dropzone: "PDF, DWG, IFC, RVT, XLSX, DOCX, JPG, PNG, ZIP", "Max file size 500 MB". No upload dialog is drawn.
    - The targets of "Download", the kebabs and the filter button are not shown.
  - **How it is reached.** The page has no back link.
    - The sidebar "Documents" item is on every sidebar except Metrics' (02, 06, 11, 12).
    - The inspector Documents tabs are meant to open filtered views of this page: 05 (DOCUMENTS, "OPEN DATASHEET"), 09 (DOCUMENTS, "System Documents"), 10 ("Documents"), 17 ("Documents (3)") and 20 ("Documents (3)"). No datasheet is listed on page 1.
  - **Overlaps with part 1.**
    - Step 2: its category tiles (Architectural / MEP / Existing BMS / Energy / Other) differ from the chips here.
    - Step 3: its cited sources ("Area Schedule.pdf (Page 4)" and others) are not on page 1.
    - Step 8: "Uploaded files: 12 files" matches the count here.
- **Contradictions:** see 6.4.

### 16 Topology › System Scope (version 2)

- **Shell.** Uses screen 10's shell family: the teal-navy theme, a 1536×1024 (3:2) frame and status footer (f).
  - **Header:** the tagline "BUILDING AUTOMATION / FOR BETTER BUILDINGS". Top tabs TOPOLOGY (active) · WIREFRAME · METRICS, with filled inactive dots. Then "● BMS LIVE" (L). Then "Radisson Blu Bucharest" over "Tue, 17 Sep 2025   12:36" (sic: 17 Sep 2025 was a Wednesday), both in proportional title case. Then a 3-line hamburger. There is no avatar.
  - **Sidebar:** the Topology list, as on 07 and 10. "System Scope" is active, with a blue left bar and a navy fill.
  - **Project card:** the same values as on 10, including "Floors 2B + GF + 6" and "Status Design Phase". It has a night photo of a mid-rise building with no source or caption.
- **Title:** there is no eyebrow. The back link "← Back to Topology" takes its slot. The title is "SYSTEM SCOPE" (bold, uppercase, as on 10). The subtitle is "Define and refine the building systems to be included in the project based on the topology."
- **Toolbar:** a segmented control 3D / 2D / Section, with Section active (aqua outline). Then "All Floors" and "All Systems". "Section" is new: 06 has EXPLODED in that slot and 07 has Logical.
- **BUILDING SYSTEMS (P)**, with an info icon ⓘ. Each row has an icon, a count, an In Scope switch, Coverage and a chevron "›":

  | Icon | System | From Topology | In Scope | Coverage |
  |------|--------|---------------|----------|----------|
  | blue fan | HVAC | 186 | ON | 100% |
  | green bulb | Lighting | 142 | ON | 100% |
  | yellow bolt | Energy Metering | 24 | ON | 100% |
  | red door | Access Control | 36 | ON | 100% |
  | red flame | Fire Safety | 28 | ON | 100% |
  | pale-blue drop | Water | 18 | ON | 100% |
  | white camera | CCTV | 64 | OFF | — |
  | white lift | Elevators | 12 | OFF | — |
  | pale-blue "P" | Parking | 8 | OFF | — |
  | pale-blue bed | Guest Room Systems | 424 | ON | 100% |
  | white chef hat | Kitchen Systems | 16 | OFF | — |
  | white "•••" | Other (Custom) | 6 | OFF | — |

  - 7 switches are ON and 5 are OFF. "100%" is set in teal; the dash is grey. No total is shown.
  - No row is selected, although the detail panel below shows HVAC.
- **BUILDING SECTION – SYSTEM SCOPE (P).**
  - A translucent glass section of a slab block with a roof plant enclosure, drawn on a faint grid. Level labels: Roof, 06, 05, 04, 03, 02, 01, GF, B1, B2.
  - Risers and pins (the levels are approximate):
    - **HVAC (blue):** two risers. The left one runs from Roof down to an AHU-like box at 01/GF. The right one runs from Roof to B2, with fan pins at about 06, 03/02 and GF/B1. A grey cabinet sits at B1/B2.
    - **Lighting (green):** one riser, with bulb pins at 06, 04 and B2.
    - **Energy (yellow):** two risers. Bolt pins sit at 05 and 01, and a disc with a green glyph [? leaf or hand] sits at GF. The second riser ends at the red Access Control door icon at B2.
    - **Fire Safety (red):** a riser in the right bay, with flame pins at 06 and 02. At GF it joins a purple disc with a fan glyph (Water's legend colour, HVAC's glyph), which links to a white Elevators icon at B2.
  - **Legend (9 entries):** HVAC · Lighting · Energy · Access Control · Fire Safety · Water · CCTV · Elevators · Other. Lighting green, Energy yellow and Access Control red follow 10's remap. Water purple is new: 10 draws its Water layer icon in white.
    - Access Control and Fire Safety share one red.
    - CCTV, Elevators and Other are near-identical pale blues.
  - **Key plan inset:** a plan outline with a vertical aqua cut line, the caption "Section View (East-West)" and a north mark "N".
  - The panel has no visible controls.
- **HVAC detail panel (P).** It takes the place of the right inspector used on 01-09.
  - **Header:** a fan icon, "HVAC", "186 devices in topology", and the filled aqua button "Edit Scope".
  - **Tabs:** Overview (active, blue underline) / Controllers (12) / Field Devices (86) / Zones (8) / Network (3).
  - **Description:** "Heating, ventilation and air conditioning system including, AHUs, FCUs, VAVs, dampers, sensors and associated control equipment." (sic: stray comma after "including").
  - **Values:** In Scope "Yes" with an ON switch · Coverage 100% with a full aqua bar · Floors B2 – Roof · Field Devices 86 · Devices 186 · Zones 8 · Controllers 12. The body has no Network value.
- **Buttons:** "Edit Scope" and "Save and Continue →" (bottom right, under the detail panel) are filled aqua primaries. Batch 1 had no filled primary button (3.1). There are no outline or secondary buttons.
- **Behaviour** (inferred, not shown):
  - A chevron loads its system into the detail panel.
  - The row switches, the panel switch, "Edit Scope" and "Save and Continue" all appear to write the same scope decisions.
  - It is unclear whether 3D and 2D swap the canvas or open 07 and 10.
- **Bottom:** status footer (f), identical to 10: "● BMS Live" (L), "Last sync: 17 Sep 2025, 12:36" (L), "REAL BUILDINGS. REAL RESULTS.".
- **Links:**
  - "← Back to Topology" leads to 07 (3D) or 10 (2D). The sidebar lists Topology as a sibling, after System Scope.
  - "Save and Continue →" leads to Zones (20), following 13's stepper "1 Property · 2 System Scope · 3 Zones · 4 CAPEX · 5 OPEX · 6 Review". 16 itself shows no stepper, and 20 has no Continue.
  - 16 is the parent of Equipment (17) and Zones (20), which both carry "← Back to System Scope". The tabs Controllers, Field Devices and Zones would presumably lead to 17 and 20 filtered to HVAC; this is not shown.
  - **Inbound (presumed):** 07's "View System Details →", 13's row "View details →" and 11's "VIEW DETAILED SCOPE →". 11 and 13 leave their targets open between 06 and 16.
  - **Duplicates 06** (Metrics › System Scope). The purpose is the same, but these differ:
    - the list: 11 systems against 12;
    - the units: points against devices;
    - the controls: pills against switches;
    - the selections.
  - **Overlaps:**
    - part 1 step 4 (Systems) and step 8;
    - 13's panel "1. SELECT SYSTEMS";
    - 07's SYSTEM DETAILS (Controllers 12, Field Devices 86, Zones 8).

    10's SYSTEM LAYERS look similar, but they are view layers, not scope decisions.
- **Contradictions:** see 6.4.

### 17 Topology › Equipment, whole building (version 2)

- **Shell.** Part 1 theme (teal-navy). The header has the 01-08 tagline "BUILDING AUTOMATION / FOR BETTER BUILDINGS" and the tabs TOPOLOGY (active) / WIREFRAME / METRICS. It also has the "● BMS LIVE" chip (L), "Radisson Blu Bucharest" in title case over "Tue, 17 Sep 2025   12:36", and a 3-line hamburger. There is no avatar. Screen 10 is in the same module but has no tabs and uses part 1's tagline. Sidebar: the Topology list (07, 10), with "Equipment" active (blue left bar and fill). Project card as on 10, including "Floors 2B + GF + 6".
- **Title:** back link "← Back to System Scope", no eyebrow, "EQUIPMENT" (bold), subtitle "Explore, filter and manage all equipment included in the project scope."
- **Toolbar:** List / Floor Plan (List active), "All Systems", "All Floors". List is active, but a floor-plan strip still shows above the list.
- **Plan strip (P), no heading.**
  - A "Floor 01 (Lobby)" dropdown sits over a wide floor-plan strip in grey linework. The strip has no room labels, scale bar, compass, zoom percentage or legend. It has "+" and a fullscreen button, but no "−".
  - Popover on AHU-01: "AHU-01", "HVAC • Air Handling Unit", "Lobby (01)" with an arrow "→". A dashed blue leader runs to a blue fan pin.
  - The other pins have no labels:
    - 3 green bulbs, plus 1 partly hidden behind the popover;
    - 2 yellow bolts, plus 1 partly hidden;
    - 1 purple fan [?];
    - 1 green pin with an unclear glyph [?];
    - 1 red pin with a door glyph [?];
    - a small glowing yellow dot [?].
- **Floor stack (P), no heading.** Labels 06 · 05 · 04 · 03 · 02 · 01 (selected, blue fill) · GF · B1 · B2, with no Roof label. Beside them is a section elevation with the 01 slab highlighted in blue. The drawing shows about 11 slab lines, against 9 labels [?].
- **Table toolbar:** search "Search equipment (e.g. AHU, VAV, FCU...)", "Filters ⌄", "Export ⌄".
- **Equipment table (P; Status column L).**
  - The header has a select-all checkbox. Each row has a checkbox, a system icon before the tag, and a trailing "›".
  - AHU-01 is selected (teal border and fill).
  - No column shows a sort indicator. The rows are grouped by system.

  | Tag / Name | System | Type | Location | Floor | Zone | Status (L) |
  |------------|--------|------|----------|-------|------|------------|
  | AHU-01 | HVAC | Air Handling Unit | Lobby (01) | 01 | Lobby | ● Online |
  | AHU-02 | HVAC | Air Handling Unit | Restaurant | 01 | F&B | ● Online |
  | VAV-01 | HVAC | VAV Box | Meeting Room 1 | 01 | Meeting Rooms | ● Online |
  | VAV-02 | HVAC | VAV Box | Meeting Room 2 | 01 | Meeting Rooms | ● Online |
  | FCU-01 | HVAC | Fan Coil Unit | Guest Room 101 | 01 | Guest Rooms | ● Online |
  | FCU-02 | HVAC | Fan Coil Unit | Guest Room 102 | 01 | Guest Rooms | ● Offline (red) |
  | LTG-01 | Lighting | Lighting Panel | Lobby (01) | 01 | Lobby | ● Online |
  | LTG-02 | Lighting | Lighting Panel | Restaurant | 01 | F&B | ● Online |
  | EM-01 | Energy | Energy Meter | Main Switchroom | GF | Technical | ● Online |
  | AC-01 | Access Control | Door Controller | Main Entrance | GF | Entrance | ● Online |

  - Row icons: HVAC is a blue fan, Lighting a yellow bulb (green bulbs on the plan), Energy a yellow bolt, and Access Control a red door.
  - The column header reads "Tag / Name", but the rows show only tags.
  - Footer: "Showing 1–10 of 512 equipment". Pagination: ‹ 1 2 3 4 5 … 52 ›, with 1 current.
- **Inspector "EQUIPMENT DETAILS"** with "×".
  - A studio product photo of an AHU, then a fan icon, "AHU-01" and "Air Handling Unit".
  - Tabs: Overview (active) / Points (24) / Alarms (0) / Documents (3).
  - System HVAC · Type Air Handling Unit · Model Sauter AHU-4000 · Location Lobby (01) · Floor 01 · Zone Lobby · Status ● Online (L) · Commissioned 12 Mar 2024 · Last Update 17 Sep 2025, 12:34 (L).
  - Button: "View on Floor Plan" (locate icon).
  - There is no Controller or Points row. Screen 10 shows "Controller SAUTER modulo 6" and "Points 12" for the same AHU-01.
- **Bottom:** status footer (f), as on 10: "● BMS Live   Last sync: 17 Sep 2025, 12:36" (L) and "REAL BUILDINGS. REAL RESULTS.".
- **Behaviour (implied).** Selecting a row or a pin opens the popover and the inspector. Selecting a level in the stack changes the plan's floor. The toolbar's "All Floors" and the plan's "Floor 01 (Lobby)" are two floor selectors that disagree.
- **Links:**
  - **Back link.** "← Back to System Scope" leads to System Scope: 16 (Topology) or 06's page (2.4.3). In this Topology shell 16 is the likely target, and 16 in turn goes "Back to Topology". So the path is Topology › System Scope › Equipment, with 20 (Zones) beside it. The sidebar "Equipment" item also opens this page.
  - **Entry from 20.** "View Equipment in Zone →" on 20 should open this page filtered to Z-05. Of 20's zone names, only "Meeting Rooms" appears in this screen's Zone column, so the filter cannot resolve.
  - **Possible drill-ins, not wired.** 10's "View Details →", 14's alarm rows and 22's lifecycle rows would all lead here naturally, but the mockups do not connect them.
  - **"View on Floor Plan".** It leads either to this page's Floor Plan segment or to 10 (Floor 01 (Lobby), AHU-01 selected). One of the two should be canonical.
  - **Undesigned targets.** The row "›" and the popover "→" lead to an asset detail page that is not designed (1.2). The Points, Alarms and Documents tabs have no designed content, and neither do the "Filters" and "Export" menus.
  - **Duplicates.**
    - 05 (Wireframe › Equipment, floor 05): this is the second Equipment page (1.2, 2.2). Its whole-building list, with Location / Floor / Zone columns and pagination, is the better base.
    - 10 and 20: the plan strip and the Floor Plan segment repeat 10's 2D floor plan and 20's Floor Plan segment.
    - 22: its "Showing 1–8 of 68 equipment" table lists the same register by type.
    - Part 1: step 3's "HVAC assets 126" and step 4's system selection should feed this list.
- **Contradictions:** see 6.4.

### 18 Project › Reports

- **Shell.** The same shell as 10 and 15:
  - The header has no top tabs and no BMS LIVE chip. A hamburger sits at the far right, with no avatar.
  - The tagline is "BUILDING AUTOMATION / FOR BETTER BUILDINGS". 10 and 15 use part 1's tagline instead.
  - The name "Radisson Blu Bucharest" is in title case, where 10 and 15 use uppercase. The date "Tue, 17 Sep 2025  12:36" is mono title case, as on 10. 15 writes it in mono uppercase.
  - Sidebar: the Topology list (2.1), with "Reports" active in the blue selection style.
  - Theme: part 1's teal-navy with a filled aqua primary, as on 15. The frame is 1536×1024.
- **Title (A):** eyebrow "REPORTS", then "Project Reports" in bold title case. Subtitle: "Generate, view and share project reports. Use templates or create custom reports to communicate design, system scope and performance insights." No back link.
- **Button:** "+ Generate Report" (filled aqua, top right). There is no Share control anywhere, although the subtitle says "share".
- **REPORT TEMPLATES (A; the templates produce P content).** The header link is "View All Templates →". There are six clickable tiles. None is selected and none has a checkbox.

  | Template | Icon | Description |
  |----------|------|-------------|
  | Executive Summary | blue document | High-level project summary and key insights |
  | System Scope Report | aqua gear | Detailed list of systems, equipment and coverage |
  | Topology Report | purple hierarchy | System topology diagrams and architecture |
  | Zone Summary | light-blue bar chart | Equipment and control points by zone |
  | Energy & Sustainability | green leaf | Estimated energy savings and sustainability impact |
  | Compliance Report | red document with a check badge | Regulatory and standards compliance |

- **Toolbar:** a search box "Search reports...", then "All Categories", "All Statuses", and a sort box "Date (Newest)" with a separate ↑↓ direction toggle.
- **Report list (A; the files are exports of P content).**
  - Columns: Name · Category · Date Generated · Generated By · Status · Actions.
  - Each row has an icon, a download button and a kebab "⋯".
  - Executive Summary is selected, with a teal outline and fill.

  | Name | Category | Date Generated | Generated By | Status |
  |------|----------|----------------|--------------|--------|
  | Executive Summary | General | 17 Sep 2025, 12:30 | A. Popescu | Ready |
  | System Scope Report | Technical | 15 Sep 2025, 16:20 | M. Ionescu | Ready |
  | Topology Diagrams | Technical | 12 Sep 2025, 11:05 | M. Ionescu | Ready |
  | Zone Summary | Technical | 10 Sep 2025, 09:15 | C. Stan | Ready |
  | Energy Analysis | Sustainability | 08 Sep 2025, 14:40 | R. Dumitru | Ready |
  | Regulatory Compliance | Regulatory | 05 Sep 2025, 10:22 | A. Popescu | Ready |
  | Bill of Quantities | Commercial | 03 Sep 2025, 13:18 | S. Marin | Generating |
  | API Specification | Technical | 01 Sep 2025, 09:50 | M. Ionescu | Ready |

  - "Ready" has an aqua dot. "Generating" has a blue dot, and that row's download button is greyed out.
  - Rows reuse the template icons, with four exceptions. Executive Summary, Bill of Quantities and API Specification get a white generic document icon (the Executive Summary tile's document is blue), and the last two match no template. Regulatory Compliance gets a red shield, not the template's document with a check badge.
  - Below the table: "Showing 1–8 of 8 reports", and pagination "<" · "1" · ">".
- **REPORT PREVIEW (A; the cover is P content).**
  - The cover thumbnail is a white page:
    - top: "SOVITECH" and "CONFIDENTIAL";
    - titles: "Radisson Blu Bucharest", "Building Automation Project", and "Executive Summary" in blue;
    - image: the same night photo as the sidebar card, with a navy diagonal corner;
    - bottom: "Smarter Buildings. / Brighter Experiences." on the left and "Sep 2025" on the right.
  - Metadata: Name Executive Summary · Category General · Date Generated 17 Sep 2025, 12:30 · Generated By A. Popescu · Pages 14 · File Size 3.2 MB. These match the selected row.
  - Buttons: "View" (outline, eye icon) and "Download" (filled aqua).
- **Project card:** Type Hotel · Area 34,500 m² · Rooms 424 · Floors 2B + GF + 6 · BMS Platform SAUTER · Status Design Phase. These are the same values as on 10 and 15.
- **Bottom:** status footer (f): "● BMS Live", "Last sync: 17 Sep 2025, 12:36" (L), and "REAL BUILDINGS. REAL RESULTS.". No demo label appears on the screen or on the cover.
- **Behaviour.**
  - Selecting a row fills the preview.
  - Three things are not shown: what a template tile does, the contents of the kebab menu, and what "+ Generate Report" opens.
- **Links:**
  - **Undesigned targets (1.2).** Six controls lead to pages that are not designed:
    - "+ Generate Report" and the template tiles lead to the report generator;
    - "View All Templates →" leads to a templates library;
    - "View" leads to a report viewer;
    - "Download" and the row download buttons start file downloads;
    - the kebab menu is not shown.
  - **No way back.** There is no back link and no route to the proposal or to the intake answers.
  - **Navigation in.** The screen is reached from "Reports" in every sidebar except Wireframe's (01, 03, 04, 05, 09) and 13's.
  - **Overlaps with other screens:**
    - It duplicates 06 "Export Scope" through the System Scope Report template and row.
    - 11's "DOWNLOAD PHASING PLAN · PDF" has no template and no row here.
    - 13's "Download Proposal": the proposal is neither a template nor a row. Executive Summary is the nearest item.
    - Part 1 step 8 "Generate Proposal" is a second place to generate output.
    - The layout is a near-exact twin of 15 Documents: filter row, table with a selected row, a preview panel with metadata and a Download button (18 adds "View"; 15 has a "•••" instead), and footer (f). The two screens also share the "Regulatory" category.
- **Contradictions:** see 6.4.

### 19 Metrics › Scenarios

- **Shell.** The screen uses the teal-navy theme of part 1 and screen 10. Primary buttons are filled aqua.
  - Header: the 01-08 tagline "BUILDING AUTOMATION / FOR BETTER BUILDINGS", then a new tab set: TOPOLOGY · SYSTEM SCOPE · METRICS.
  - METRICS is active, with a white dot and underline. The inactive tabs have filled blue dots.
  - Then "● BMS LIVE" (L), "Radisson Blu Bucharest" over "Tue, 17 Sep 2025  12:36", and a 3-line hamburger. No avatar.
- **Sidebar.**
  - Selector "PROJECT", with the dropdown "Radisson Blu Bucharest".
  - A flat list: the Topology list (Overview · Property · System Scope · Topology · Zones · Equipment · Alarms · Documents · Reports), then Metrics · Scenarios · Payback Analysis · Lifecycle at the same indent.
  - Scenarios is active: a blue left bar and a fill. Metrics and Scenarios share one bar-chart icon.
- **Project card.**
  - A night photo, then "RADISSON BLU / BUCHAREST".
  - The first two values are out of place: "Hotel" is on the BUCHAREST line, and "34,500 m²" sits beside "Tyoe" (sic). There is no "Area" label.
  - Rooms 424 · Floors 2B + GF + 6 · BMS Platform SAUTER · Status Design Phase sit on their own label rows.
- **Title:** no eyebrow. The back link "← Back to Metrics", then "Scenarios" (sentence case, bold), then the subtitle "Model, compare and optimize different building automation scenarios to evaluate energy savings, costs, payback and long-term value."
- **Toolbar (top right):**
  - "Save Scenario": outline, folder-plus icon.
  - "Compare (3)": outline, upload-arrow icon.
  - "+ New Scenario": filled aqua.
- **Scenario cards (P).** Four cards, each with a radio and an id at top right. S2 is selected: filled radio, teal border and tinted fill.

  | | S1 | S2 | S3 | S4 |
  |---|---|---|---|---|
  | Chip | "Baseline" (blue) | "Recommended" (green) | none | none |
  | Icon | building | leaf | gear | leaf |
  | Title | Current System | Level 1 – Core BMS | Level 2 – Full Automation | Level 3 – Net Zero Ready |
  | Description | Existing building systems and operation strategy (baseline). | Core building automation with HVAC, lighting and basic control. | Advanced control, analytics and optimization. | Full automation with renewables integration and AI optimization. |

  Each card lists Investment · Annual Savings · Payback Period · 5-Year ROI. The values are the same as the comparison table's rows 1, 2, 4 and 5. The table labels the second row "Annual Energy Savings". S1 reads "€ 0", then three dashes.
- **In-page tabs:**
  - Financial Analysis (active, aqua underline) / Energy Impact / Environmental Impact / Equipment Scope / Key Assumptions. Only Financial Analysis is shown.
  - Dropdown at right: "Analysis Period", "20 Years".
- **CUMULATIVE CASH FLOW COMPARISON (P).**
  - Lines with markers. Legend: Baseline (S1) grey · Level 1 (S2) blue · Level 2 (S3) green · Level 3 (S4) yellow.
  - The y axis is "€ (Thousands)", from −1,500 to 2,500. The x axis is "Year", 0-20 in steps of 2, and its ticks are unevenly spaced.
  - Other marks, read from pixels:
    - a coral bar from year 0 to about 0.4, reaching down to about −610;
    - a dark-green band between the lines and zero, from about year 0.5 to 3;
    - first markers at about −640 and −360. The −640 marker is teal, a colour not in the legend;
    - last markers at about year 20.7, right of the "20" tick: about 1,110 (S2), 1,660 (S3), 2,280 (S4) and +60 [?] (S1);
    - markers at irregular, non-integer years;
    - an empty outline frame spanning about years 14-19 near the 2,500 gridline.
- **YEAR 20 SUMMARY ⌄ (P).**
  - Bars with value labels: S1 Baseline 0.0 (a grey sliver) · S2 Core BMS 1.1 · S3 Full Auto 1.8 · S4 Net Zero 2.4.
  - The y axis is "€ (Millions)", with five gridlines at uneven gaps: 2.5, 2.0, a garbled "1.0" printed over "1.5", 0.5 and 0. The wide gap above 0.5 is where a 1.0 gridline is missing.
  - The panel does not name the metric. The chevron may be a selector or a collapse control; the screen does not show which.
- **Inspector "SCENARIO DETAILS", "S2" (P).** A leaf icon, "Level 1 – Core BMS", and "Core building automation with HVAC, lighting and basic control."
  - KEY METRICS: Total Investment € 820,000 · Annual Energy Savings € 210,000 · Payback Period 3.9 years · 5-Year ROI 97% · 20-Year Net Savings € 1,110,000 · CO₂ Reduction (annual) 280 tonnes "(-24%)". The delta is green.
  - MAIN SYSTEMS (grey chips): HVAC · Lighting · Access Control · Energy Metering · Alarm Integration.
  - STATUS: "● Recommended", with an aqua dot.
  - Button: "View Equipment Scope →" (filled aqua, full width).
- **SCENARIO COMPARISON (P).** The S2 column is outlined in teal and tinted.

  | Metric | Baseline (S1) | Level 1 (S2) | Level 2 (S3) | Level 3 (S4) |
  |---|---|---|---|---|
  | Total Investment (CAPEX) | € 0 | € 820,000 | € 1,240,000 | € 1,780,000 |
  | Annual Energy Savings | - | € 210,000 | € 310,000 | € 420,000 |
  | Annual O&M Reduction | - | € 35,000 | € 50,000 | € 75,000 |
  | Payback Period | - | 3.9 years | 4.0 years | 4.2 years |
  | 5-Year ROI | - | 97% | 125% | 136% |
  | 20-Year Net Savings | - | € 1,110,000 | € 1,820,000 | € 2,430,000 |
  | CO₂ Reduction (annual) | - | 280 tonnes | 410 tonnes | 560 tonnes |

- **Bottom:** status footer (f), with "● BMS Live" and "Last sync: 17 Sep 2025, 12:36" (L), then "REAL BUILDINGS. REAL RESULTS.". There is no scenario bar (c), unlike 02 and 06.
- **Behaviour.**
  - Selecting a card's radio sets the SCENARIO DETAILS panel and the highlighted table column.
  - The Analysis Period dropdown presumably sets the horizon behind "20-Year Net Savings", "YEAR 20 SUMMARY" and the x axis.
  - The legend may toggle series, but no toggle state is shown.
  - "Compare (3)" counts 3, but four scenarios are on screen.
  - No value carries a badge, source line, range, stage label or the demo label.
- **Links:**
  - "← Back to Metrics" leads to the Metrics landing page, which is not designed (1.2). The sidebar item "Metrics" and the back links on 21 and 22 have the same target. 02 is the only candidate.
  - "View Equipment Scope →" does the same job as the in-page "Equipment Scope" tab and the SYSTEM SCOPE top tab. It has no designed destination. The nearest pages are 16 and 17, which show the building, not a scenario.
  - "Save Scenario", "Compare (3)" and "+ New Scenario" have no designed destination. The scenario editor is not designed (1.2).
  - In: 21's "Compare Scenarios" button, and the "Scenarios" item in 19's own sidebar and in the Metrics sidebar of 02, 06, 11 and 12. The METRICS tab leads to the Metrics landing, not here.
  - Overlaps:
    - 21 repeats the comparison table: the same three price points under different level names.
    - 13's CAPEX packages L1-L4 are a third set of options.
    - The "SCENARIO VIEW ● BASE CASE" bar on 02 and 06 is another scenario control, and its base case is none of S1-S4. 21's SCENARIO COMPARISON radios are a third, with other level names.
    - 22 uses the same "20 Years" analysis period, and its CAPEX is the same as S3's.
    - MAIN SYSTEMS overlaps part 1 step 4's system selection and the system scope on 06 and 16.
- **Figures that do not hold:** see 6.5.

### 20 Topology › Zones, floor 01 (version 2)

- **Shell.** The shell is the one from screen 10. It has no top tabs, no "BMS LIVE" chip and a hamburger at the far right. It uses the teal-navy theme (page about `#01141B`, slightly lighter and bluer than 10's `#031216`), blue sidebar selection and a 3:2 viewport. It differs from 10 in two ways:
  - the tagline is batch 1's "BUILDING AUTOMATION / FOR BETTER BUILDINGS", not part 1's;
  - the header name "Radisson Blu Bucharest" is in title case, where 10 uses uppercase. Below it, "Tue, 17 Sep 2025  12:36" is set in a monospaced face.

  Sidebar: the Topology list (07, 10), with "Zones" active.
- **Title:** there is no eyebrow. The back link "← Back to System Scope" takes its place. Then "ZONES" (bold), and the subtitle "Create, view and manage building zones. Zones help organize equipment, control strategies and reporting."
- **Toolbar:** List / Floor Plan / Matrix (Floor Plan active), "Floor 01 (Lobby)", "All Systems". List and Matrix are not designed. There are no page-level buttons.
- **Plan (P).**
  - Blueprint linework (walls, doors, furniture, stairs) on a faint grid. A second "Floor 01 (Lobby)" dropdown sits at its top-left.
  - Six zones are drawn as translucent fills with bright outlines. Each is labelled with its id above its name:
    - Z-01 Restaurant: purple, top-left;
    - Z-02 Kitchen: teal-green, top-centre, with a teal label;
    - Z-03 Staff Area: blue, top-right;
    - Z-04 Lobby Lounge: orange, left;
    - Z-05 Reception: light blue, centre. Its label sits in a darker octagonal inset (the desk);
    - Z-06 Meeting Rooms: yellow, bottom-right.
  - Unzoned cores, corridors, stairs and WCs lie between the zones. Double doors at the bottom centre are labelled "MAIN ENTRANCE".
  - A compass ("N") and a scale bar "0 5 10 20 m", with an unlabelled tick at 15.
  - A vertical stack of "+", "−" and fullscreen buttons. There is no zoom percentage (10 shows "100%").
  - There is no colour legend. The plan labels act as the key.
- **ZONES (6)** (P). It has "+ Add Zone" and a "Search zones..." field.

  | Zone ID | Name | Floor | Area (m²) | Systems | Status |
  |---------|------|-------|-----------|---------|--------|
  | Z-01 | Restaurant | 01 | 520 | 4 | ● Active |
  | Z-02 | Kitchen | 01 | 380 | 6 | ● Active |
  | Z-03 | Staff Area | 01 | 450 | 5 | ● Active |
  | Z-04 | Lobby Lounge | 01 | 610 | 6 | ● Active |
  | Z-05 | Reception | 01 | 720 | 8 | ● Active |
  | Z-06 | Meeting Rooms | 01 | 580 | 5 | ● Active |

  - Every row ends in a "•••" kebab. Its menu is not shown.
  - Z-05 is selected (teal outline, dark teal fill). The plan shows no selected state for it [?].
  - There is no total row and no swatch column.
  - The Status column is either (L) or a record state that no screen defines [?].
- **ZONE DETAILS**, with "Edit Zone".
  - A light-blue swatch, then "Z-05" and "Reception".
  - Tabs: Overview (active) / Equipment (24) / Control Points (18) / Alarms (0) (L) / Documents (3) (A).
  - Overview (P, except Status):
    - Floor 01 (Ground Floor);
    - Area 720 m²;
    - Type Public Area;
    - Description "Reception, concierge and waiting area.";
    - Systems, as chips: HVAC, Lighting, Access Control, Energy Metering, Fire Safety;
    - Status ● Active (L).
  - A photo of a hotel reception: a marble desk lit from below, with "RADISSON BLU" on the wall behind. A smaller line under the logo is illegible [?].
  - Button (outline): "View Equipment in Zone →".
- **Buttons.** "+ Add Zone" and "Edit Zone" are both filled aqua primaries, so this one screen has two. Screens 01-10 have none (3.1).
- **Project card:** as on 10. Type Hotel · Area 34,500 m² · Rooms 424 · Floors 2B + GF + 6 · BMS Platform SAUTER · Status Design Phase.
- **Footer:** the status footer (f), as on 10: "● BMS Live   Last sync: 17 Sep 2025, 12:36" (L), then "REAL BUILDINGS. REAL RESULTS.".
- **Behaviour** (implied, not shown). Selecting a row or a zone polygon should select the other one and update ZONE DETAILS. The two floor dropdowns show the same value.
- **Links:**
  - **Back link.** "← Back to System Scope" leads to System Scope: 16 (Topology) or 06's page. The sidebar also lists Zones as a sibling of System Scope, so the page has two parents (2.2).
  - **CTAs and tabs.** "View Equipment in Zone →" leads to Equipment (17), filtered to Z-05. The Alarms and Documents tabs lead to 14 and 15. "+ Add Zone", "Edit Zone" and the kebab lead to a zone editor that is not designed.
  - **Against 04 (Wireframe › Zones, floor 05).** 20 duplicates 04: the same zone list with search, ZONE DETAILS with a photo, and a CTA. It differs in:
    - the columns;
    - the id format ("Z01" against "Z-01");
    - the tabs;
    - the status word ("● Normal" against "● Active");
    - the content: live readings on 04, design fields on 20.

    04's "VIEW ZONE ON FLOOR PLAN →" is the natural way in.
  - **Against 10.** 20 overlaps 10: the same floor, rooms and MAIN ENTRANCE, the same toolbar dropdowns, compass and scale bar. 10 draws system layers on the plan; 20 draws zone fills.
  - **Other overlaps.**
    - 06's ZONES page tab, and its "ZONES BY SYSTEM" panel, whose Public Areas category matches Type "Public Area".
    - The "Zones" step of 13's stepper (1.3).
    - Part 1 steps 3 ("Zones") and 4 (the system selection).
- **Contradictions:** see 6.4.

### 21 Metrics › Payback Analysis

- **Shell.**
  - Header: tab set TOPOLOGY · SYSTEM SCOPE · METRICS (2.4.1), with METRICS active. It also has a "● BMS LIVE" chip (L), and "Radisson Blu Bucharest" over "Tue, 17 Sep 2025  12:36" (sic: 17 Sep 2025 is a Wednesday). At the far right is a 3-line hamburger. There is no avatar. Tagline "BUILDING AUTOMATION / FOR BETTER BUILDINGS".
  - Sidebar: the project list, then "Metrics" (2.4.2). "Metrics" is highlighted with a fill and a blue left bar. The current page has no item of its own.
  - Theme: part 1's teal-navy (`#00131A`), in a 3:2 viewport, as on 10 and 19. Selection is blue in both places: the sidebar bar and the table radio.
- **Title:** back link "← Back to Metrics" in the eyebrow slot. Title "Payback Analysis" (bold title case). Subtitle "Evaluate the financial return of the proposed building automation solution based on energy savings, operational efficiency and lifecycle benefits."
- **Buttons:** "Export Report" (outline, download icon) and "Compare Scenarios" (filled aqua, bar-chart icon). "Compare Scenarios" is the only filled primary on the page.
- **KPI tiles (P).** Four tiles, each with an icon square. The first tile has no right border (a glitch).

  | Tile | Value | Caption |
  |------|-------|---------|
  | Total Investment (CAPEX) | € 1,240,000 | |
  | Estimated Annual Savings | € 310,000 | Energy + Operational |
  | Simple Payback Period | 4.0 years | |
  | 5-Year ROI | 125% | |

- **CUMULATIVE CASH FLOW (P).**
  - Legend: Annual Savings (green bars) · Cumulative Cash Flow (cyan line with dots) · Initial Investment (red bar).
  - Y axis "€ (Thousands)", from -1,500 to 2,000 in steps of 500.
  - X axis "Year", labelled verbatim "0 · 1 · 2 · 2 · 3 · 4 · 5 · 6 · 7 · 9 · 10 · 12" (sic). "2" appears twice, 8 and 11 are missing, and "12" is set in a smaller font.
  - Values read from pixels:
    - a red bar at year 0 of about −780k;
    - ten green bars rising from about 115k to about 760k;
    - an 11-dot line running from about −875k to about +1,590k.

    The dots do not sit on the tick labels.
  - Payback marker: a white dot on the zero line at the "3" tick, two dashed verticals, and the label "Payback:" / "4.0 years".
- **KEY ASSUMPTIONS (P)**, with a ghost "✎ Edit":

  | Assumption | Value |
  |------------|-------|
  | Energy Price | € 0.18 / kWh |
  | Annual Energy Savings | 1,450,000 kWh, "(-28%)" in green |
  | O&M Cost Reduction | € 45,000 / year |
  | Inflation Rate | 2.5% |
  | Analysis Period | 10 years |
  | Residual Value (Year 10) | € 150,000 |

- **SAVINGS BREAKDOWN (ANNUAL) (P).** A donut with the centre label "€ 310,000" / "per year". Its colours do not follow the system palette (3.2): HVAC is green here and Lighting is blue.

  | Stream | Colour | Amount | Share |
  |--------|--------|--------|-------|
  | HVAC Optimization | green | € 155,000 | 50% |
  | Lighting Control | blue | € 62,000 | 20% |
  | Operational Efficiency | yellow | € 46,000 | 15% |
  | Demand Management | purple | € 31,000 | 10% |
  | Other | light grey | € 16,000 | 5% |

- **SCENARIO COMPARISON (P).** A table with radio buttons. The first row is selected: a filled light-blue radio, with a teal border and fill on the row.

  | Scenario | CAPEX | Annual Savings | Payback Period | 10-Year ROI |
  |----------|-------|----------------|----------------|-------------|
  | ◉ Recommended (Level 3) | € 1,240,000 | € 310,000 | 4.0 years | 125% |
  | ○ Level 2 – Core Systems | € 820,000 | € 210,000 | 3.9 years | 97% |
  | ○ Level 4 – Full Automation | € 1,780,000 | € 420,000 | 4.2 years | 136% |
  | ○ Custom Scenario | € 1,050,000 | € 255,000 | 4.1 years | 115% |

  There is no Level 1 row and no baseline row. The same 125% is labelled "5-Year ROI" on the tile and "10-Year ROI" here.
- **ENVIRONMENTAL IMPACT (ANNUAL) (P).** Three sub-cards, each with a green outline icon:

  | Icon | Label | Value | Caption |
  |------|-------|-------|---------|
  | leaf | CO₂ Reduction | 320 tonnes | "(-28%)" in green |
  | tree | Equivalent Trees | 14,500 | trees planted |
  | car | Cars Off the Road | 70 | per year |

- **Behaviour.**
  - The radios presumably switch the scenario that the tiles, chart and panels show [?].
  - The screen does not show whether the chart legend toggles series [?].
  - "✎ Edit" opens an assumptions editor that is not designed.
- **Sidebar:** the project card, with a night-time photo and "Floors 2B + GF + 6", as on 10 and 19.
- **Bottom:** status footer (f), with "● BMS Live   Last sync: 17 Sep 2025, 12:36" (L) on the left and "REAL BUILDINGS. REAL RESULTS." on the right.
- **Links:**
  - **Back link.** "← Back to Metrics", the METRICS tab and the sidebar "Metrics" all lead to a Metrics landing page that is not designed (1.2, 2.4.3). 02 is the only candidate.
  - **Buttons.** "Compare Scenarios" presumably opens 19 Scenarios (2.4.5). "Export Report" is either a file export or a link to 18 Reports [?].
  - **Routes to and from 19 and 13.** 19's sidebar has a "Payback Analysis" item, so 19 → 21 works through the sidebar. 21 → 19 works only through "Compare Scenarios". 13's "View 15-Year Analysis →" may be meant for this page, but this page covers 10 years.
  - **Duplicates.**
    - The KPI row repeats 02's KPI tiles, 13's bottom strip and 19's scenario cards.
    - CUMULATIVE CASH FLOW repeats 02's ANNUAL CASH FLOW.
    - SCENARIO COMPARISON repeats 19's cards and table: the same three number sets under other names.
    - KEY ASSUMPTIONS overlaps 02's PROJECT CONTEXT and 19's Key Assumptions tab.
    - SAVINGS BREAKDOWN repeats 02's VALUE DRIVERS in a different set of categories.
    - ENVIRONMENTAL IMPACT repeats 13's CO₂ Reduction and 19's Environmental Impact tab.
  - **Part 1.** The savings streams do not match the step 4 systems (HVAC, Lighting, Energy, Access Control). The step 6 goals (Reduce energy consumption, Reduce operating costs) map to the energy and O&M lines.
- **Figures that do not hold:** see 6.5.

### 22 Metrics › Lifecycle Analysis

- **Shell.** Theme family C. The header uses the tab set TOPOLOGY · SYSTEM SCOPE · METRICS, with METRICS active, then the "● BMS LIVE" chip (L), "Radisson Blu Bucharest" over "Tue, 17 Sep 2025   12:36" (17 Sep 2025 was a Wednesday), and a 3-line hamburger. There is no avatar.
- **Sidebar.** The Project + Metrics variant for 22 (2.4.2): the project list, then Metrics › Payback Analysis (gear glyph) and Lifecycle (donut glyph), nested. Both "Metrics" and "Lifecycle" are highlighted, each with a blue left bar. Project card: "Floors 2B + GF + 6" and "Status Design Phase", with the family C night photo.
- **Title:** back link "← Back to Metrics" and no eyebrow. "Lifecycle Analysis" (Title Case, bold). Subtitle "Understand the total cost of ownership, equipment lifecycle and long-term value of the building automation solution."
- **Toolbar:** a two-line dropdown "Analysis Period" / "20 Years" (other options not shown), and outline buttons "Export Report" (download icon) and "Configure" (gear icon). There is no filled primary button.
- **KPI tiles (P).** Each tile has an icon in a raised square.

  | Tile | Value | Caption |
  |------|-------|---------|
  | Total Lifecycle Cost | € 2,830,000 | CAPEX + OPEX + Replacements |
  | Net Savings (vs. Baseline) | € 1,920,000 | Over 20 years |
  | Lifecycle ROI | 68% | Total return over lifecycle |
  | Average Equipment Life | 14.2 years | Across all systems |

- **LIFECYCLE COST COMPARISON (P).** A line chart. Y axis "Cost (€ Thousands)", 0-4,000. X axis "Year", 0-20.
  - Legend: "Proposed Solution (Total Cost)" (solid cyan, with markers), "Baseline (Total Cost)" (dashed grey) and "Cumulative Savings" (green area).
  - End labels: "€ 3,750,000" (white, baseline) and "€ 2,830,000" (cyan, proposed). A green double arrow is labelled "€ 1,920,000 / savings".
  - Both lines start together near 300 at year 0. The markers sit at uneven years, and the last one is at about year 19.8. The green area is drawn below the proposed line, not between the two lines.
- **COST BREAKDOWN (LIFECYCLE) (P).** A donut with the centre label "€ 2.83M / Total Cost / (20 years)".

  | Item | Amount | Share |
  |------|--------|-------|
  | Initial Investment (CAPEX) | € 1,240,000 | 44% |
  | Energy Costs | € 820,000 | 29% |
  | Maintenance (O&M) | € 490,000 | 17% |
  | Equipment Replacements | € 210,000 | 7% |
  | Other Costs | € 70,000 | 3% |

  The legend dots for CAPEX (cyan) and Energy (teal) do not match their arcs (blue and green).
- **LIFECYCLE BY SYSTEM (P).** Stacked horizontal bars with the segments Initial (blue), Energy (green), Maintenance (yellow) and Replacement (red). X axis "Cost (€ Thousands)", 0-1,250.
  - Labels: HVAC € 1,120,000 · Lighting € 540,000 · Access Control € 320,000 · Fire Safety € 280,000 · Water € 190,000 · CCTV € 170,000 · Elevators € 150,000 · Other € 60,000.
  - The segments reuse the HVAC, Access, Lighting and Fire hues, here to mean cost categories.
- **EQUIPMENT LIFECYCLE (P).** A table with a header band. Each row has a leading icon and ends in a chevron "›". There is no sort, search or filter.

  | Equipment | System | Quantity | Expected Life | Replacement Year(s) | Unit Cost (€) | Lifecycle Cost (€) |
  |-----------|--------|----------|---------------|---------------------|---------------|--------------------|
  | AHU | HVAC | 12 | 20 years | Year 20 | 85,000 | 1,020,000 |
  | FCU | HVAC | 86 | 15 years | Year 15 | 6,500 | 559,000 |
  | Lighting Panel | Lighting | 24 | 20 years | Year 20 | 4,200 | 192,000 |
  | LED Fixture | Lighting | 1,420 | 15 years | Year 15 | 350 | 497,000 |
  | Access Controller | Access Control | 36 | 12 years | Year 12, 24 | 2,800 | 201,600 |
  | CCTV Camera | CCTV | 64 | 10 years | Year 10, 20 | 1,200 | 153,600 |
  | Fire Panel | Fire Safety | 6 | 20 years | Year 20 | 9,500 | 57,000 |
  | BMS Controller | BMS | 12 | 15 years | Year 15 | 3,600 | 259,200 |

  - The footer reads "Showing 1–8 of 68 equipment". The pager reads ‹ 1 2 3 4 5 … 9 ›, with page 1 in an aqua outline.
  - Icons are shared: AHU and FCU both have a blue fan, both lighting rows have a yellow bulb, and Access Controller and Fire Panel have the same red door.
- **KEY INSIGHTS (P):** "€ 1.92M" Total savings over 20 years · "14.2 years" Average equipment lifecycle · "68%" Lifecycle ROI vs. baseline. All three repeat KPI tiles, with different labels and rounding.
- **Behaviour.** No panel has toggles, tabs or segmented controls, and the legends look static. Changing the Analysis Period presumably recalculates the page [?]. The row chevrons imply a drill-down for each equipment type.
- **Bottom:** status footer (f). It reads "● BMS Live   Last sync: 17 Sep 2025, 12:36" (L), then "REAL BUILDINGS. REAL RESULTS.".
- **Links:**
  - "← Back to Metrics" leads to the Metrics landing, which is not designed. 02 is the only candidate.
  - The sidebar's "Payback Analysis" leads to 21. No link leads to 19 Scenarios, although 19's sidebar lists "Lifecycle".
  - The row chevrons would lead to 17 Equipment, filtered by type and system. 17 lists tagged assets, while these rows are type aggregates.
  - "Export Report" should produce an entry on 18. "Configure" has no defined target.
  - In: the sidebar's Metrics › Lifecycle, 19's "Lifecycle" item, and probably 13's "View 15-Year Analysis →" (this page defaults to 20 years). This is the page called "Lifecycle Cost" in the sidebars of 02, 06, 11 and 12.
  - Overlaps:
    - Lifecycle by System is the third cost-by-system breakdown, after 02's COST BREAKDOWN and 13's investment summary.
    - The CAPEX of €1,240,000 matches 21's "Recommended (Level 3)" and 19's S3.
    - The shell repeats 19 and 21, and the project card repeats 16, 17, 19 and 21.
- **Figures that do not hold:** see 6.5.

---

## 5. Data part 2 needs

Every figure on these screens must come from one project model. Nothing is typed into a screen by hand. The guardrail value model (`docs/guardrails.md` section 2) applies to each piece below.

| Model | Feeds | Notes |
|-------|-------|-------|
| **Level register** (floor structure by level type, with each level's function, gross area and zoned area) | Floors list, 3D stack, floor selectors, "xS+P+yE" summary, cost-by-level groups, area roll-ups, the phase callouts on 11, the stacks on 13, 16 and 17, 20's floor selector | Levels sum to the building's gross area on one basis. Rule 8 floors. |
| **Zones** (id unique per project, level, name, category, area with basis, design capacity, design setpoints) | 01, 04, 20, minimaps, zone roll-ups, the Zone column on 17 (and the zone filter chip proposed in 2.5) | Capacity and setpoints are design fields with sources. Live occupancy is telemetry (operations only). |
| **Systems catalogue** (canonical name, icon, colour token, scope decision per project) | Every system list, legend, layer toggle, cost line, points line | Seeded from wizard step 4, edited only in System Scope. |
| **Asset register** (equipment and field devices as assets), with **points** derived per motor, drive and configuration (guardrails 2.5) or read from a point-list document | Every count on 01, 03, 05, 07, 08, 09, 16, 17 ("512"), 20 (tab counts and Systems column) and 22; the equipment lists on 05 and 17; key-equipment tiles | Guardrails 2.5. Counts are queries with the filter shown in their label. Points are never counted as assets. |
| **Proposed design** (controller family per system and asset, network, integrations, deliverables) | 06 integration scope and deliverables, 07, 08 | SOVITECH's proposal, not building facts. It needs a guardrail class (7.2). |
| **Financial model** (CAPEX by system and by level group, savings streams, BMS OPEX, discount rate, horizon, escalation, baseline) | All of 02; the cost lines and KPIs on 11, 13, 19, 21 and 22 | Every KPI is computed from it. Rule 9 and rule 10. |
| **Energy bills and building operating costs** (bills per carrier with metering point, period, reading type and currency; maintenance, staff and other costs as sourced fields) | 12's tiles, monthly trend, energy cost breakdown and system comparison; historical savings baselines | Rule 8 energy data. A new build has no bills: an Estimated range where the registry allows it, otherwise "Not available yet". Month allocation is proposal 7.2.32. Labelled "Building operating cost", never "OPEX" alone. |
| **Project phase** (proposal, contracted, installation, commissioning, operation) | Whether live features show at all | Proposed. It does not exist yet. |
| **Telemetry** (point readings with timestamp and quality) | Every (L) value | Operations only. It needs a guardrail rule before build. |
| **Scenarios** (named sets of overrides to decisions and assumptions) | "SCENARIO VIEW · BASE CASE", 13's packages, 19, 21's comparison table | Needs a guardrail rule (7.2.4). A package is a scenario. |
| **Automation levels and packages** (level id, one name, its function set, its price basis per system) | 13, 19, 21 | Versioned reference data (rule 9). One level id has one name and one price basis on every screen. |
| **Financial assumptions** (energy price per carrier, escalation, discount rate, horizon, residual value, BMS operating cost) | 19, 21, 22 | Input fields with a named person who may set each (proposal 7.2.20). Outputs such as kWh saved are never typed. |
| **Savings measures** (system, mechanism, baseline, how measures combine) | 12's opportunities, 21's streams | Proposal 7.2.21 |
| **Phasing plan** (phases, months after contract, deliverables, milestones) | 11 | Part of SOVITECH's proposed design (7.2.10, 7.2.24). No progress state before the contracted phase. |
| **Lifecycle data** (service life and unit cost per asset type, replacement rule, cost boundary) | 22 | From datasheets or an engineer, or Estimated from an approved dataset (rules 1 and 2.1) |
| **Emission factors** (per carrier, with year and source) | 13, 19, 21 | An approved, dated dataset (proposal 7.2.22). None exists, so CO₂ shows "Not available yet". |
| **Document register** (DocumentRecord, guardrails 2.3: kind, stage, revision as written, analysis status and coverage) | 15; the Documents tabs on 05, 09, 10, 17 and 20 | Uploader and role are proposal 7.2.26 |
| **Generated outputs** (template and version, snapshot id, requested by, started and finished times, status) | 18; every Download and Export | Proposal 7.2.25. The preliminary proposal is always row 1. |
| **Alarms** (alarm point, priority, append-only alarm events) | 14 | Operations only (proposal 7.2.33) |

**Canonical system names (proposed).** HVAC, Lighting, Energy, Access Control, Fire Safety, Water, Elevators, Room Automation, CCTV, Car Park, Other. These match part 1's step 4 labels where they exist. Vendor names (Opera, Hikvision, Schindler) go in a separate field, never in the system name. The mockups currently use several names for the same system:
- "Energy Meters", "Energy Monitoring", "Energy Metering" and "Energy";
- "Vertical Transport" and "Elevators";
- "Fire Safety Integration", "Fire Alarm (FAS)" and "Fire Detection";
- "Car Park Management" and "Car Park System";
- "Water Systems" and "Water";
- "Other" and "Other Systems".

Batch 2 adds more:
- "Energy Metering" (16, 19, 20) alongside the four above;
- "Room Automation" (02, 06, 12) and "Guest Room Systems" (16);
- "Parking" (16) alongside the car park names;
- "Kitchen Systems" and "Other (Custom)", new rows on 16 with no part 1 option.

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

The proposed column was written before the brand decision of 2026-09-24 (section 3). Where it picks part 1's theme, aqua or a tagline, the brand wins.

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

### 6.4 Data contradictions added by batch 2

Values marked ≈ were measured from the image.

**Project card.**
- **Floors has three strings:**
  - "28 + GF + 8" on part 1 step 3, 02, 06, 07, 08, 12, 13 and 14;
  - "2B + GF + 8" on 11;
  - "2B + GF + 6" on 10 and 15-22.

  The square "B" on 11 suggests the intended value is "2B" (two basements). That fits the drawn stacks (B2, B1, GF, 01…06 on 13, 16 and 17) far better than 37 levels.
- **Status** is "Operational" on 12 and "Design Phase" on the other 16 cards (02, 06, 07, 08, 10, 11 and 13-22).
- **19's card** drops the "Area" label: "Hotel" sits beside the project name and "34,500 m²" beside "Type", which is misspelt "Tyoe". Rooms to Status line up.

**Project type and phase.**

| Evidence | Implies |
|----------|---------|
| Step 1 "New construction"; 13 "vs. conventional systems" | A new building |
| Step 8 "Renovation"; 15's BMS_Existing_System.pdf and Energy_Consumption_2024.xlsx; 12's "Current" against "Baseline" and "vs. previous year"; 19's S1 "Current System: Existing building systems" | An operating building with an existing BMS |
| 11's NOW line at M7 with Phases 1-2 drawn as done; 17's "Commissioned 12 Mar 2024"; 14's live alarms; the "Last sync" footers | A project under installation, or in operation |

**Levels.**

| Level | 01 and 13 stacks | 11 callout | Elsewhere |
|-------|------------------|------------|-----------|
| 05 | Conference & Event | None. The lifted slab is labelled "FLOORS 06-08". | 04: offices; 07: guest rooms; 14: "Level 5 – Guest Rooms", "Room 512" |
| 03 | Guest Rooms | Part of "FLOORS 01-04" | 14: "Level 3 – Conference" |
| 01 | Lobby & Restaurant | "FLOORS 01-04", "Guest Rooms & Public Areas" | 20: "01 (Ground Floor)"; 17: FCU-01 in "Guest Room 101" |
| GF | Entrance & Retail | "Lobby & Amenities" | 17 puts the main entrance door controller on GF. 20 draws the main entrance on 01. |
| B1, B2 | Technical Rooms; Parking & MEP | One "BASEMENT", Technical Rooms | 14: Chiller-02 in "Technical Room B2" |

**Cost by area (02) against phases (11).** The same amounts appear under a different mapping.

| Group | 02 | 11 |
|-------|----|----|
| Basement & GF | €260,000 | Phase 1, €260,000 |
| Floors 01-04 | €420,000 | Phase 2, €420,000, which on 11 also covers the rooftop HVAC plant |
| Floors 06-08 | €180,000 | Phase 3, €320,000. The €180,000 becomes Phase 4, "Integration & BMS Platform". |
| Floor 05; Floors 09-28 | €220,000; €200,000 | No phase |

**The investment and the recommended option.**

| Screen | Investment | Selected or recommended |
|--------|------------|-------------------------|
| 02, 11 | €1,280,000 | Base case |
| 13 | €1,280,000 | Level 2 "Standard", "Most popular", Selected |
| 19 | €820,000 / €1,240,000 / €1,780,000 | S2 "Level 1 – Core BMS", €820,000, Recommended |
| 21 | €1,240,000 | "Recommended (Level 3)" |
| 22 | €1,240,000 | Not named |

- **The same €1,280,000, split two ways.** 02: HVAC €397k, Room Automation €282k, Lighting €154k, Energy Monitoring €128k, Access Control €85k, Fire Safety €72k, Other €163k. 13: HVAC €538k, Lighting €230k, Access Control €154k, Water €102k, Energy Monitoring €128k, Other €128k. Only Energy Monitoring agrees, and €154k is Lighting on 02 but Access Control on 13.

**Level names and prices.**

| Level | 13 | 19 | 21 |
|-------|----|----|----|
| 1 | Essential, €620,000 | "Level 1 – Core BMS", €820,000 | — |
| 2 | Standard, €1,280,000 | "Level 2 – Full Automation", €1,240,000 | "Level 2 – Core Systems", €820,000 |
| 3 | Advanced, €1,950,000 | "Level 3 – Net Zero Ready", €1,780,000 | "Recommended (Level 3)", €1,240,000 |
| 4 | Premium, €2,850,000 | — | "Level 4 – Full Automation", €1,780,000 |

- **"Full Automation" has two prices:** €1.24M on 19 and €1.78M on 21.
- **Part 1 step 7 has no levels.** It asks for areas, and only HVAC and Lighting are ticked.
- **13's sliders go further than step 7.** They automate Access Control, Water and Energy Monitoring, which step 7 left unticked.
- **13's total ignores its own slider.** Energy Monitoring is set to Level 3, but the total stays at the Level 2 price.

**The same options, different figures.**
- **The €1.24M option:**
  - CO₂ 410 t (19) against 320 t (21);
  - O&M €50k (19) against €45k (21);
  - 20-year net savings €1.82M (19) against €1.92M (22).
- **The €820k and €1.78M options** carry the same ROI values on 19 and 21. They are labelled "5-Year ROI" on one screen and "10-Year ROI" on the other.

**Systems in scope.**

| System | Step 4 | 06 | 13 | 16 | 22 lifecycle |
|--------|--------|----|----|----|--------------|
| HVAC | ✔ | In Scope | ✔ | ON | €1,120,000 |
| Lighting | ✔ | In Scope | ✔ | ON | €540,000 |
| Energy | ✔ | In Scope | ✔ | ON | No line |
| Access Control | ✔ | In Scope | ✔ | ON | €320,000 |
| Fire Safety | ☐ | In Scope | ☐ | ON | €280,000 |
| Water | ☐ | In Scope | ✔ | ON | €190,000 |
| Elevators | ☐ | In Scope | ☐ | OFF | €150,000 |
| CCTV | ☐ | In Scope | ☐ | OFF | €170,000 |
| Room automation | No option | In Scope | No row | ON, as "Guest Room Systems" | No line |
| Car park | No option | In Scope | Inside "Other Systems" ☐ | OFF, as "Parking" | — |
| Other | — | Planned | ☐, yet priced at €128,000 | OFF | €60,000 |

- **22 prices systems that others leave out.** It prices four systems that 13 leaves out, among them CCTV and Elevators, which 16 also switches off.
- **Z-05 on 20** lists 8 systems in its table, but shows 5 chips, including Fire Safety.
- **14 raises alarms on Fire Safety and Water,** both unticked in step 4.
- **12 claims savings on a system the other scope editors leave out.** Its Vertical Transport row shows €60,000 against a €70,000 baseline (↓ 14%), while step 4, 13 and 16 all leave elevators out.

**Counts.**
- **The building has four different equipment counts:**
  - 512 equipment items (17);
  - 68 "equipment" (22), whose first 8 rows alone hold 1,660 units;
  - 964 devices across 16's rows, 858 of them in scope;
  - 186 field devices (08).
- **HVAC on 16:** 186 devices for the building, but 12 controllers + 86 field devices = 98. On 07, the same 186 / 12 / 86 / 8 zones described floor 05.
- **Floor counts reused as building counts.** 16's building-wide Access Control 36 and Fire Safety 28 equal 03's floor-05 counts. Its Lighting 142 equals 03's floor-05 HVAC.
- **AHUs.** 22 has 12 AHUs for the building, where 09 had 12 on floor 05 alone.

**AHU-01.**

| Field | 10 | 17 | 14 |
|-------|----|----|----|
| Location | Lobby (01) | Lobby (01) | "Level 5 – Guest Rooms" |
| Points | 12 | 24 | — |
| Controller or model | Controller "SAUTER modulo 6" | Model "Sauter AHU-4000" | — |
| Status | Online | Online, "Alarms (0)", last update 12:34 | Critical, Active since 10:24 |
| Commissioned | — | 12 Mar 2024 | — |

SAUTER makes controls, not air handling units, so "Sauter AHU-4000" cannot be a real product. 05's "Manufacturer Sauter" has the same problem.

**Zones.**
- 20 lists six zones on floor 01 totalling 3,260 m², more than the drawn floor (≈3,035 m²).
- 20's ids (Z-01…Z-06) collide with 04's: Z01 is Conference Room A on floor 05.
- 10 and 17 put AHU-01 in zone "Lobby", which is not one of 20's zones.
- 06's "Public Areas 3,200 m²" for the whole building leaves only 770 m² beyond floor 01's public zones on 20 (Restaurant, Lobby Lounge, Reception and Meeting Rooms: 2,430 m²). Floor 05's conference and meeting rooms on 04 (1,110 m²) already take it past 3,200 m², before the spa and retail.
- Part 1 step 3 says "Zones 218".

**Alarms (14).**
- "0 Critical Unresolved" while two Critical alarms are Active.
- "Energy Meter – No Data" at "Main Switchboard", against 17's EM-01 at "Main Switchroom".
- "Active" means an unresolved alarm on 14 and a healthy zone on 20.
- None of the faults on 03, 05 or 07 appears in 14's rows.
- The time windows mix "Last 7 days" and "Resolved (24h)".

**Documents and people.**
- **Step 3's sources are missing.** 15 lists 12 files, matching step 8's "12 files". But none of step 3's cited sources (Area Schedule.pdf, Floor Plans A-101 → A-129, Room Schedule.xlsx) is on page 1, and page 2 has room for only 4 more.
- **Categories don't match the document kinds.** 15's Operational and Regulatory are not DocumentRecord kinds. Existing BMS and Energy, which are, have no chip.
- **Names without roles.** The same five fictional names upload documents (15) and generate reports (18), mostly on the same dates, with no role shown.
- **Report dates don't fit the documents.**
  - The API Specification was generated on 1 Sep, before every drawing on page 1 (the earliest, Electrical_Drawings.dwg, is from 12 Sep) and before BMS_Existing_System.pdf (10 Sep). Page 2's four older files are 2 Architectural and 2 MEP by the chip counts; their dates are not shown.
  - Topology Diagrams (12 Sep) predate HVAC_Schematics v2.1 (15 Sep), yet read "Ready".
  - The Bill of Quantities has read "Generating" since 3 Sep.
- **One timestamp, two events.** 17 Sep 2025 10:24 is both when the AHU-01 alarm was raised (14) and when Floor_Plan_GF.pdf was added (15).

**Recycled numbers.**
- **682** is CO₂ in tonnes per year on 13, and CO₂ in ppm on 01 and 04.
- **€820,000** is an investment option (19, 21) and a 20-year energy cost (22).
- **€210,000** is 02's savings, S2's savings and 22's replacements.
- **24, 12 and 8** each carry four or more unrelated meanings, and **186 and 86** three each. 186 is floor 05's devices on 07, the building's field devices on 08 and the building's HVAC devices on 16. 86 is floor 05's HVAC field devices on 07, the building's on 16, and 22's FCU quantity.

**Dates.**
- 12's monthly chart labels Sep twice and fills Oct-Dec, which lie after the header date.
- 11's Gantt bars for Phases 3-5 do not match their "Months" lines.
- **Commissioned before kick-off.** 11 puts NOW (17 Sep 2025) at the end of M6, so kick-off (M1) was about March 2025 and "HVAC Systems Online" (M6) about August 2025. Yet 17 has AHU-01 "Commissioned 12 Mar 2024", and 05 has AHU-05-01 installed in Mar 2024, a year before the programme starts.

**What the demo fixture must settle.** One value each for:
- the floor structure and the level functions;
- the project type and phase;
- the base-case investment, and which option is recommended;
- one cost split per system behind 02 and 13;
- one naming scheme for levels 1-4;
- one savings definition, horizon and ROI formula;
- one scope decision per system;
- one asset register behind 16, 17 and 22;
- the AHU-01 record;
- a document register that contains step 3's sources.

### 6.5 Financial figures recomputed (batch 2)

The arithmetic was run in code. ≈ marks a value measured from a chart. Verdicts use these four terms, sometimes with a qualifier:
- **Holds:** it reproduces from its inputs.
- **Rounding:** it reproduces except for an unstated rounding method.
- **Wrong:** it contradicts its inputs, or the chart contradicts its labels.
- **Undefined basis:** no stated definition reproduces it.

**Headline.**
1. **Two investments for the same proposal.** €1,280,000 on 02, 11 and 13; €1,240,000 on 19 (S3), 21 and 22. Annual savings take at least eight different values across the screens, from €150k (13) to €450k (12's table).
2. **22's net savings are off by exactly €1,000,000.** €3,750,000 − €2,830,000 = €920,000, but the screen shows €1,920,000.
3. **No ROI has a single definition.** The same 97 / 125 / 136% read "5-Year ROI" on 19 and "10-Year ROI" in 21's table, and 21's tile labels the 125% "5-Year ROI".
4. **No cash-flow chart starts at minus the investment.**
5. **22's equipment table cannot fit inside 22's total.** Its first 8 rows (of 68) total €2,939,400, more than the whole €2,830,000 lifecycle cost.
6. **13's 6.1-year payback does not follow from 13's own savings.**

**11 Phasing**

| Figure | Shown | Recomputed | Verdict |
|--------|-------|------------|---------|
| Phase sum | €1,280,000 | 260 + 420 + 320 + 180 + 100 = 1,280k | Holds |
| Shares | 20 / 33 / 25 / 14 / 8% | 20.3 / 32.8 / 25.0 / 14.1 / 7.8% | Holds |
| Phase 3 against 02's lines | €320,000 for room automation, lighting and access | 02: 282 + 154 + 85 = 521k | Wrong |
| 02's Fire Safety (€72k) and Other (€163k) | — | In no phase | Undefined basis |
| "~35% HVAC energy savings" | ~35% | No HVAC baseline is shown. 12's HVAC row gives 27.8%. | Undefined basis |

**12 OPEX & Savings**

| Figure | Shown | Recomputed | Verdict |
|--------|-------|------------|---------|
| Parts against the total | €1,420,000 | 890 + 320 + 160 + 50 = 1,420k | Holds |
| Donut shares | 63 / 23 / 11 / 3% | 62.7 / 22.5 / 11.3 / 3.5%. Half-up rounding gives 4 for Other and a sum of 101. | Rounding, method not stated |
| "↓ 18% vs. baseline" | 18% | From the tiles' deltas: baseline €1,728.6k, saving 17.9%. From the table's Baseline column: €1,870k, saving 24.1%. | Wrong: two baselines on one screen |
| Row savings | 28 / 33 / 27 / 23 / 14 / 18% | 27.8 / 33.3 / 26.9 / 22.7 / 14.3 / 18.2% | Holds |
| Monthly trend | Total €1.42M | 13 bars ("Sep" twice) sum to ≈€1.49M. The energy segments sum to ≈€750k, against €890k. | Wrong |
| Energy chart | "↓ 22%" | ≈845k against ≈1,138k is 25.7% | Wrong |
| Intensity | €41 / m² / year | 1,420,000 / 34,500 = 41.2 | Holds, but no area basis |
| "↓ 20% vs. similar buildings" | 20% | (52 − 41.2) / 52 = 20.8% | Rounding. The €52 benchmark has no basis. |
| Intensity marker positions | — | Drawn at ≈37.6 and ≈47.3, instead of 41.2 and 52 | Wrong |
| Top savings opportunities | €90k, 35k, 28k, 22k, 18k | Sum €193k/yr, against €308.6k (tiles) or €450k (table). The three HVAC measures overlap. | Undefined basis |

**13 CAPEX Breakdown**

| Figure | Shown | Recomputed | Verdict |
|--------|-------|------------|---------|
| Package €/m² | 18 / 37 / 57 / 83 | 18.0 / 37.1 / 56.5 / 82.6 on 34,500 m² | Holds, but no area basis |
| Summary total | €1,280,000 | 538 + 230 + 154 + 102 + 128 + 128 = 1,280k | Holds |
| Summary bar | 6 legend lines | 7 segments, one unlabelled | Wrong |
| Total against the sliders | The Level 2 price | Energy Monitoring is at Level 3, yet the total does not move | Undefined basis |
| "Other 10%, €128,000" | €128,000 | "Other Systems" is unchecked | Undefined basis |
| Payback | 6.1 years | 1,280 / 150 = 8.5 years. 6.1 years needs €210k, which is 02's total savings. | Wrong |
| CO₂ | 682 t / year | At 21's €0.18/kWh, €150k is 833 MWh, which gives 0.82 kg CO₂ per kWh. That is roughly three times Romania's grid average and four times natural gas. | Undefined basis, implausible |

**19 Scenarios**

| Figure | Shown | Recomputed | Verdict |
|--------|-------|------------|---------|
| Payback | 3.9 / 4.0 / 4.2 years | 820/210 = 3.90, 1,240/310 = 4.00, 1,780/420 = 4.24, on energy savings only. With O&M: 3.35 / 3.44 / 3.60. | Holds, but the basis is not stated |
| 5-Year ROI | 97 / 125 / 136% | See the ROI table below | Undefined basis |
| 20-Year Net Savings | €1.11M / 1.82M / 2.43M | Undiscounted (20s − c): 3.38 / 4.96 / 6.62M. S3 and S4 match a 10% net present value including O&M (1.825, 2.434). S2 does not (1.266). | Undefined basis |
| Chart, year 0 | — | Should be −820k / −1,240k / −1,780k. Drawn at ≈−640k and ≈−360k. The axis stops at −1,500k. | Wrong |
| Chart, zero crossings | Table 3.9 / 4.0 / 4.2 | Drawn at ≈5.5 (S2), ≈4.5-5 (S3), ≈3.0 (S4): the reverse order | Wrong |
| CO₂ | 280 / 410 / 560 t | €750 / €756 / €750 of energy savings per tonne, so CO₂ is proportional to euros saved, within rounding to 10 t | Undefined basis |
| Option €/m² (not shown) | — | 23.8 / 35.9 / 51.6. None matches a package on 13. | Wrong against 13 |

ROI definitions, with s the energy savings, o the O&M reduction and c the investment:

| Definition | S2 | S3 | S4 |
|------------|----|----|----|
| (5s − c) / c | 28% | 25% | 18% |
| 5s / c | 128% | **125%** | 118% |
| (10s − c) / c | 156% | 150% | **136%** |
| **Shown** | **97%** | **125%** | **136%** |

S3 matches only a gross five-year ratio, S4 only a ten-year net ROI, and S2 matches nothing. A net ROI must fall as payback lengthens, but the shown values rise.

**21 Payback Analysis**

| Figure | Shown | Recomputed | Verdict |
|--------|-------|------------|---------|
| Simple payback | 4.0 years | 1,240 / 310 = 4.00 | Holds (gross, with no escalation; the screen does not say so) |
| Savings from its own assumptions | €310,000 | 1,450,000 kWh × €0.18 = €261,000, plus O&M €45,000 = €306,000 | Wrong by €4k |
| Savings breakdown | €310,000 | 155 + 62 + 46 + 31 + 16 = 310. The shares hold. | Holds |
| Demand Management | €31,000 | A kW saving valued with a €/kWh price | Undefined basis |
| "(-28%)" on energy | −28% | Implies a baseline of 5.18 GWh, or 150 kWh/m². The baseline is not named. | Undefined basis |
| 5-Year ROI | 125% | 5 × 310 / 1,240 = 125%: a gross ratio. The net figure is 25%. | Undefined basis |
| "10-Year ROI" column | 125 / 97 / 136 / 115% | Recommended is the 5-year gross ratio. Level 4 is the 10-year net ROI. Level 2 and Custom match no definition. | Wrong |
| Chart, year 0 | — | ≈−786k (bar) and ≈−887k (line), against −1,240k | Wrong |
| Chart, annual bars | €310,000 a year | Bars read ≈114, 159, 220, 250, 220, 341, 417, 508, 646, 754k for years 1-10, against a flat €310k (≈€387k by year 10 with 2.5% escalation) | Wrong |
| Chart, cumulative line | — | Should end at +1,860k with flat savings (+2,010k with the residual value), or ≈+2,233k with the screen's 2.5% escalation. Ends at ≈+1,570k, rising ≈€245k a year, which matches neither. | Wrong |
| Payback marker | 4.0 years | Drawn at ≈ year 3.6, under the "3" tick | Wrong |
| X axis | 0 1 2 2 3 4 5 6 7 9 10 12 | 12 labels for 11 points; 8 and 11 missing | Wrong |
| CO₂ | 320 t | 320 t / 1,450 MWh = 0.22 kg/kWh. No carrier or factor is shown. "(-28%)" equals the energy reduction, which implies one factor for every carrier. | Undefined basis |
| Trees and cars | 14,500 and 70 | 22 kg per tree per year, and 4.6 t per car per year (a US passenger-car factor) | Undefined basis |
| Residual value | €150,000 | Not in the ROI, and no step is drawn at year 10 | Undefined basis |
| Custom scenario | 4.1 years, 115% | 1,050 / 255 = 4.12. 115% matches no definition (121% gross five-year, 143% net ten-year). | Payback holds; ROI undefined basis |

**22 Lifecycle Analysis**

| Figure | Shown | Recomputed | Verdict |
|--------|-------|------------|---------|
| Cost breakdown | €2,830,000 | 1,240 + 820 + 490 + 210 + 70 = 2,830k | Holds |
| Net savings | €1,920,000 | 3,750 − 2,830 = €920,000 | Wrong, by exactly €1M |
| Lifecycle ROI | 68% | 1,920 / 2,830 = 67.8%: net savings over total cost. On the investment it is 155%. With the correct €920k: 32.5% or 74.2%. | Undefined basis |
| Chart | — | Both lines start at ≈+340k. The proposed line should start at €1,240k or more. The lines end at ≈2,930k and ≈3,600k, not at their labels (€2,830,000 and €3,750,000), and the "€1,920,000" arrow spans ≈1,570k. The savings area is drawn under the proposed line, not between the lines. | Wrong |
| Equipment rows | See 4, screen 22 | Lifecycle cost ÷ (quantity × unit cost): AHU, FCU, LED and fire panel 1.0×; access controller and CCTV 2.0×; lighting panel 1.9×; BMS controller 6.0×. FCU and LED leave out their year-15 replacement. | Wrong: no consistent rule |
| The 8 rows against the total | — | €2,939,400 against €2,830,000, with 60 rows unseen. The initial cost alone is €2,454,600, about twice the investment. Replacements before year 20 come to ≈€1.28M (≈€2.53M if the year-20 replacements count), against the €210k category. | Wrong |
| Cost boundary | — | AHUs (€1.02M), FCUs and 1,420 LED fixtures are building plant, not BMS supply | Undefined basis |
| By system | Sums to €2,830,000 | The sum holds. But AHU + FCU = €1,579k, more than HVAC's €1,120k. | Wrong |
| Energy costs | €820,000 over 20 years | €41k a year, against 12's €890k a year | Wrong against 12 |
| Average equipment life | 14.2 years | The 8 rows give 15.9 (simple) or 14.9 (by quantity). The weighting is not stated. | Undefined basis |

**Across the screens** (02's figures from 6.2; € in thousands):

| Quantity | 02 | 12 | 13 | 19 (S3) | 21 | 22 |
|----------|----|----|----|---------|----|----|
| Investment | 1,280 | — | 1,280 | 1,240 | 1,240 | 1,240 |
| Annual savings | 210 | 309 (tiles), 450 (table), 193 (list) | 150 | 310, plus 50 O&M | 310 (306 from its inputs) | ≈108 implied by the totals (≈158 from the shown €1.92M) |
| Payback | 6.1 | — | 6.1 | 4.0 | 4.0 | — |
| Horizon | 15 years | 12 months | "15-Year" CTA | 20 years | 10 years | 20 years |
| CO₂ (t / year) | — | — | 682 | 410 | 320 | — |

Only 02 shows a BMS operating cost (€38k a year). No other screen deducts it.

---

## 7. Guardrail review

### 7.1 Changes the guardrails require on these screens

These apply `docs/guardrails.md` v1.2 as written. Where a row goes further than the rules, it says "Proposed" and names the 7.2 proposal it depends on. The first table covers screens 01-10, and 7.1.1 covers 11-22.

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
| 05 asset types and plant on floor 05 | 3 | Type badges Likely / Possible / SOVITECH will check. Proposed, not in v1.2: implausible locations go to the engineer queue. |
| 05, 10 asset tags | 2.5 | Tags shown as written in the evidence (e.g. "CTA-01, AHU"). No app-minted tags counted. |
| 07, 08 fire topology | 11 | The fire system is drawn as a separate system with a one-way monitoring link; whether it is third-party is open question 8.8. It is labelled "monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system". Fire dampers and smoke detectors belong to the fire system. No "Control Command" on any life-safety path. The fire-alarm input and fire-mode status per panel appear as points. |
| 06, 05, 08, 10 life-safety scope | 11 | Fire Safety reads "monitoring only". Car-park ventilation states hardwired fire-mode priority. Life-safety assets offer only view, log and documents. Elevators and DALI emergency luminaires are flagged where they qualify. |
| 06 scope pills | 3, 4 | Rendered from the owner's decisions with Provided by you / Suggested. "Planned" becomes a registered option or is removed. "Edit Scope" writes new decisions, and outputs show "Out of date, recalculating". |
| 06, 07 vendor names (Opera, Hikvision, Schindler) | 1, 10 | From a document or the owner only, never model knowledge; otherwise "Not provided yet". Demo vendor names come from fixture documents in the repo (rule 10). Fictitious demo vendors and a vendor field are proposal 7.2.7. |
| 06, 08 supply split | 10 | A supplier named on every line. An unknown split is a range and an open item. The same label everywhere (Access Control is SAUTER on 08 and third-party on 06). |
| 01, 02, 03, 06 per-floor figures | 12, 1 | A per-floor figure with no candidate shows Unknown, with the line "Not found in the analysed documents" plus the documents' coverage (e.g. "pages 1-60 of 200"). Never zero, and no "not found" over unread pages (G12-4). |
| 02, 06 precision | 9, 8 | Everything through the formatting module. "about" only on Estimated values and on originals written as approximate. |
| 06 Export Scope, Reports | 10, 1, 2.8, G10-5 | Every export carries the demo line (rule 10), shows unknowns as Unknown and never as 0 (rule 1), and keeps each badge on the same line as its figure (2.8). The appendix of sources and open items is required only for exported proposals (2.8 Prominence, G10-5). Extending it to every export is proposal 7.2.25. |
| 02, 03 dim secondary text | 2.8 | Badges at 12px or larger with WCAG AA contrast. Source lines at 12px and 4.5:1 are proposed (3.3), not a 2.8 requirement. Part 1 sets them at 11px, so decide both parts together. |
| All (L) values | 1, 12 | In the proposal-phase build, no live panels: BMS LIVE, the timeline, LIVE DATA, Alarms, status counts and trends are not built. No live value is shown until a telemetry rule (proposal 7.2.1) and a project phase (proposal 7.2.11) are approved. |

Three things the mockups show are outside the current rules, and are handled only as proposals: brand signage on the model, photos presented as the building or a room, and the "REAL BUILDINGS. REAL RESULTS." claim next to demo figures. See 7.2.8, 7.2.9 and 7.2.15.

#### 7.1.1 Screens 11-22

These apply v1.2 as written. Rows that go further than the rules are in 7.2.

**Missing units come first.** Rule 8's unit registry lists no unit for durations (years, months), currency ratios (€/kWh, €/kW, €/m², €/m² per year) or CO₂. Under 2.7 the validator rejects any value in those units. So, as v1.2 stands, payback, analysis horizons, service lives, programme months, energy prices, €/m² and CO₂ cannot be stored at all, and they read "Not available yet". The same holds for 02's €/m², payback and IRR in batch 1. Proposal 7.2.22 adds the units. It is a prerequisite for most of the Metrics pages. The rows below state what is required once a value can be stored.

**Every screen**

| Screen / element | Rule | Required change |
|------------------|------|-----------------|
| All of 11-22, and every export: 11's phasing PDF, 13's "Download Proposal", the exports on 14, 17, 21 and 22, and 18's reports and cover | 10 (demo), GS-1 | The demo line on every screen and every export, including 18's cover. "CONFIDENTIAL" does not replace it. |
| "BMS LIVE" chip; "BMS Live · Last sync" footer (15-22) | 1, 12; the (L) row above | Not built in the proposal phase. The footer carries the data status and the demo line. |
| Project cards | 8, 3, 4, G9-6 | As the card row above. Floors show **Two values** while their candidates disagree. Status is one field, hidden until 7.2.11 is approved, so 12 cannot differ from the rest. |
| Level labels: 11's callouts, the stacks on 13, 16 and 17, 20's "01 (Ground Floor)", 14's locations | 8, 2.2, 4, G2-7 | Generated from the level register, with one label per level everywhere. A level's function is a sourced field or Unknown. |
| Every value | 2, 2.8, 9 | Through the value or price component, with the badge on the same line and a source line. Dense tables get a badge column (12, 17, 19, 21, 22). The ⓘ tooltips on 13 and 16 never hold the only copy of a label, range, source or open-items count (2.8), nor of a value's basis (rule 9). |

**Prices and packages**

| Screen / element | Rule | Required change |
|------------------|------|-----------------|
| 11 phase amounts, 13 packages and summary, 19 investments, 21 CAPEX, 22 CAPEX and unit costs | 10, 9, 8, 1, G10-1 | Through the price component. The stage label comes from stored records. Show a range rounded outward, the VAT basis, the price date, the price-list version and the supply split per line. No quote, quotation, offer, ofertă or deviz. |
| €1.28M against €1.24M | G2-7, G9-8, 2.4 | One snapshot, so one figure for one option. Showing a different figure as a named scenario depends on proposal 7.2.4. |
| €/m² (13) and €/m²/year (12) | 8, 9, 2.7 | Once the unit exists (7.2.22), name the area basis, or show "Not available yet: add the building area". |
| Shares on 11, 12, 13, 21 and 22 | 8, 9, G9-8 | Name the base. Compute from the same snapshot as the amounts. When the amounts are ranges, the share is a range or is left out. |
| 13's "Other €128,000" with Other unchecked; 22's lines for CCTV, Elevators and Other (off on both 13 and 16); 12's Vertical Transport row. 22's Fire Safety and Water lines and 12's Water row depend on which of step 4, 13 and 16 holds the decision (see "Scope shown on 13, 16, 19, 20 and 22"). | 3, 10 (exclusions), G10-7 | Cost and savings lines only for systems whose recorded decision is include. Excluded systems are listed as exclusions. The fire interface points stay in. |
| Product names: 13's "SAUTER ecos504 controllers", "Analytics (SAUTER Vision Center)" and "Digital twin (SAUTER)"; 17's "Sauter AHU-4000" | 1, G1-3, G2-5 | SAUTER products only as catalogue tokens, with catalogue casing. A plant's make and model come from a document, a nameplate, the owner or a survey. Otherwise "Not provided yet". |
| 13's "All packages use SAUTER products"; 22's unit costs for AHU, FCU, LED fixture and fire panel | 10 (stage 2 supply split), 1 | A supplier on every line. Third-party plant is not priced as BMS scope unless SOVITECH supplies it. Prices come only from the versioned price list or an approved dataset. |
| "Most popular" (13); "Recommended" (19, 21) | 2.8, 3 | Removed, or replaced by **Suggested** with a project-specific reason |
| Automation levels on 13, 19 and 21 | 9, G2-7, 11 | One level id has one name, one definition and one price basis. 13's summary shows the real mix ("Mixed: Energy Monitoring at Level 3"). A link to a BAC class reads "aims to support". |
| 13's "Download Proposal" | 2.8 Prominence, 7, 10, 2.4, G10-5 | Exports the stored proposal with the snapshot it keeps (2.4): stage label, inline badges, ranges and sources, the appendix, "What we still need" and the demo line. Printing the snapshot id on each page is proposal 7.2.18. |

**Savings, payback and lifecycle**

| Screen / element | Rule | Required change |
|------------------|------|-----------------|
| Savings: 11's "~35%", 12's tiles, table and list, 13, 19, 21 and 22 | 10, 9, 8, 1, 7 | Estimated, "could save", with a range, the energy price, the operating hours and a named baseline. A % names its base. Without a basis: "Not available yet", naming the missing input. |
| Payback, ROI and net savings on 13, 19, 21 and 22 | 9, 10, 1 | Estimated ranges from one snapshot, stating gross or net of the BMS operating cost and O&M. ROI is dropped unless it has a registered formula. One value never carries two horizon labels. |
| Charts on 19, 21 and 22 | 9, G9-8, G9-9 | Drawn from the engine series of the same snapshot, with labels equal to the plotted points, bands for ranges and generated axes. On 19's and 21's cash-flow charts, year 0 equals the formula's year-0 cash flow and the zero crossing lies within the displayed payback range. 22's cost chart has no payback: its end points equal the lifecycle totals beside it. |
| CO₂, trees and cars on 13, 19 and 21 | 10, 2.1, 1, 8, 2.7 | Computed from energy saved per carrier × a factor from an approved dataset. No unit or dataset for this exists yet (7.2.22), so "Not available yet". |
| 12's energy cost and monthly series | 8 (energy data), G8-7, G8-8, G10-4 | Only from bills: carrier, metering point, period, reading type. A new build has no bills: an Estimated range where the registry allows it, otherwise "Not available yet". |
| 12's maintenance, staff and other costs; total OPEX; intensity | 1, 7 | Unknown unless a document or the owner states them. The total reads "Incomplete: excludes …". No intensity or % from an incomplete total. |
| 12's "Market Benchmark (€52/m²)" and "vs. similar buildings" | 1, 2.1, 8, 13, section 10 | Removed until an approved benchmark dataset exists |
| "OPEX" meaning the building's €1.42M on 12 and the BMS's €38k on 02 | 8 | Two registry labels: "Building operating cost" and "BMS operating cost" |
| 21's "Demand Management" valued in €/kWh | 8, 9 | A demand tariff (€/kW) and an estimated peak reduction, or removed |
| 21's Key Assumptions (they give €306k, not €310k; O&M 45 against 46) | 9, 2.4, G2-7 | The panel shows the formula's actual inputs from the same snapshot. One O&M value id everywhere. |
| 22's service lives, replacement years, lifecycle cost and average life | 1, 2.1, 9, section 10 | Service life from a datasheet or an engineer, or Estimated from an approved dataset. One registered lifecycle formula. The average states its weighting. "Year 24" is shown as outside the horizon. |

**Counts, registers and decisions**

| Screen / element | Rule | Required change |
|------------------|------|-----------------|
| 16's "From Topology" counts, 17's "512", 22's "68", 20's tab counts and Systems column | 2.5, 8, 2.8, 4, G2-7 | Queries over the asset register with the filter in the label, broken down by type, badged Calculated with the Provisional line. 186 cannot mean three things. 20's Systems count comes from the same query as its chips. |
| 16's "Guest Room Systems 424" | G9-6, G10-6 | Room controllers are never derived from rooms. A range over the supply options, with an open item. |
| 17's "Points (24)" against 10's 12; 20's "Control Points (18)" | 8, 1, 11, G11-3, G9-3, G2-7 | Broken down into hardware I/O by type, integration by protocol, and virtual. An Estimated range unless a point list supports them. Fire interface points included. One asset shows one value everywhere. |
| 16's "Coverage 100%" and dashes | 9, 8, 7 | Removed until a registered formula defines it. No dash for an excluded system. |
| AHU-01's location (14 against 10 and 17) | 2.5, 4, 2.8 | Location from the register. Disagreeing sources show **Two values**, routed to the engineer. |
| 20's zone areas, count, type and description | 8, 1, 2, 3 | Through the value component with a basis. Polygon areas are only ever `calculated` by code. The count carries its qualifier. An inferred type shows Likely or Possible. |
| Scope shown on 13, 16, 19, 20 and 22, against step 4 | 2.6, 3, 4, G2-7 | Rendered from one decision per system, identical everywhere, with Provided by you or Suggested |
| Edits: 13's checkboxes, sliders and "Select Package"; 16's switches, "Edit Scope" and "Save and Continue"; 20's "Add Zone" and "Edit Zone"; 21's "Edit" | 4, 2.4, 3, 5, 7, 10 | An edit appends a candidate, and dependent values show "Out of date, recalculating". Continue writes nothing for decisions already recorded and unchanged; a visible Suggested preselection left in place is written on Continue as the owner's answer (rule 3, G3-4). Engine outputs, such as "Annual Energy Savings" in 21's Edit panel, are not editable, because rule 10 keeps savings Estimated (7.2.20 proposes the mechanism). No field is required. |
| 13's per-system automation level | 6, 3, section 10 | A new owner question. It needs registered `affects`, a passing sensitivity test (the mockup's Level 3 slider changes nothing), and approval before build. |
| 17's bulk checkboxes | 3, G3-3, 10; section 5 step 3 | No owner "Confirm all" on equipment, and no engineer verification of items the engineer has not opened (rule 10). A bulk owner "Looks right" records only `owner_acknowledged` (G3-3). Limiting bulk selection to export and filtering is a design choice, not a rule. |

**Life safety and compliance**

| Screen / element | Rule | Required change |
|------------------|------|-----------------|
| Fire Safety on 13, 16, 20 and 22 | 11, section 5 (step 4), G11-1, G11-3 | "monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system". Never preselected. An automation level only if its function set is limited to monitor, display, log and alarm. The fire interface points are always in. |
| Life-safety parts inside other systems: 13's levels; 16's Elevators, Parking and Kitchen; 17's AC-01 at the Main Entrance; 12's Demand-Based Ventilation; 14's "Access Door Forced Open" | 11, G11-4 | Qualifying assets are flagged. Level definitions exclude control of life-safety assets. Car-park fans state the fire-mode priority. |
| 14's "Fire Damper Fault" row: checkbox and "⋯" menu | 11 | No command, reset, inhibit, delay or override, from the row or in bulk. The row carries the monitoring-only wording. |
| 16's fire riser drawn joining Water | 11 | Fire drawn as a separate system with a one-way monitoring link |
| 18's "Compliance Report" and "Regulatory Compliance" | 11, 2.8 reserved terms, G11-5, G11-6 | Never attests compliance. BAC wording reads "aims to support" until verified. Standards come from reference data with their edition. |

**Documents, reports and progress**

| Screen / element | Rule | Required change |
|------------------|------|-----------------|
| 15's rows and inspector | 12, 2.3, 2.8 | Analysis status and coverage per file, in 2.8 wording, for example "Not analysed: DWG drawing stored, not analysed" |
| 15's "Version" v1.0 / v2.1 / v1.3 | 2.3 | The revision as written in the title block, or "none stated". No version numbers minted by the app. |
| 15's categories Operational and Regulatory | 2.3, 3, 4 | Stored as the DocumentRecord `kind`, shown through a fixed mapping. An AI-classified kind shows Likely or Possible. |
| 15's delete and replace | 2.3, 13, 2.4, G4-15, G13-3 | An owner's delete runs rule 13's erasure job: the file, its text and embeddings are removed, cited excerpts become "[erased]", an `erased` document event is written, and the affected candidates are withdrawn (the 2.3 cascade). The confirmation states the effect ("N values will return to Unknown"). Replace uploads a new revision with `supersedes` declared (2.3); it is not a delete. |
| 15's "Upload Document" after the intake | 7, 2.3, 2.4, 10 | Never modal. Dependent values show "Out of date". A stored quotation shows "Superseded". |
| The demo registers on 15 and 18 | 10, 13 | Synthetic fixture files in the repo, never real hotel documents |
| 18's report contents: Bill of Quantities, API Specification, Topology | 10, 9, 8, 2.5, 1, 11 | Every figure through the components. BoQ quantities are register queries, and priced lines are staged with their supplier. Protocols only where a document names them. |
| 18's "Generated By" | 10 | Names who started the generation. It never implies review. |
| 18's "Generate Report" | 7 | Never disabled for missing data. Missing sections print "Not available yet", naming what is missing and the action to add it. |
| 11's NOW line, elapsed bars and highlighted milestone | 1, 12; the (L) row above | Removed. Showing months relative to the contract is proposal 7.2.24. |
| 11's "Final Handover" | 2.8 reserved terms | Renamed, for example "Project handover" |
| 14, the whole page | 1, 12, 7 | Not built in the proposal phase |
| 12's "real-time" framing and achieved savings | 1, 12 | No achieved savings. "Current" means the pre-BMS cost from documents. |
| 17's "Commissioned 12 Mar 2024", Status, Last Update and "Alarms (0)" | 1, 2.3 | "Not provided yet" unless an as-built or commissioning record exists. The live fields are not built. |
| Claims: 11's "Reduced maintenance costs", 13's "higher energy savings", 19's "Net Zero Ready" | 10 | "could reduce", badged Estimated. S4 is named after its function set. |

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

#### Batch 2 sharpens proposals 1-16

| # | Screens | Sharpening |
|---|---------|------------|
| 1 Telemetry | 12, 14, 15-22 footers, 17, 20 | "BMS Live · Last sync" is a project-level telemetry aggregate. It needs "as of" and a staleness state, and reads "Simulated" in the demo. Achieved savings are measured against a frozen, named baseline with an adjustment method, and never share a tile with estimated savings. Telemetry-derived counts show "Not connected" or "No recent data", never 0. |
| 2 Status and alarms | 14, 17, 20 | Add alarm priorities and alarm states to the closed list, or reject them. "Active" cannot mean both an unresolved alarm (14) and a healthy zone (20). Separate a BMS log note from any action at the fire panel. |
| 3 Time | 11, 12 | One time axis per screen: 11 shows two NOWs that do not line up. Months after the header date are forecasts or gaps, never actuals (12's Oct-Dec). |
| 4 Scenarios | 11, 12, 13, 19, 21, 22 | A package is a scenario. "Base case" is the owner's recorded decisions, and no scenario is called "Baseline" (19's S1), because rule 10 uses that word for the energy baseline. A scenario lists its overrides against the base case. One scenario id shows identical figures on every screen. Selecting a radio changes the view only; adopting writes each decision visibly (7.2.17). |
| 5 Benchmarks | 12, 13 | Extend to popularity statistics derived from other projects ("Most popular"), which also need rule 13 consent, and to "vs. conventional systems" comparisons (7.2.19). |
| 6 Personal data | 12, 14, 15, 18, header avatar | Extend to staff cost (an owner-entered aggregate, suppressed below a minimum team size), person names on documents and reports (show the role, define who sees them), and alarm-notification recipients. |
| 7 Vendors | 17 | A plant's maker and model are `vendor` fields. SAUTER appears as a plant maker only if a document says so. |
| 8 Geometry | 11, 12, 13, 16, 17, 20 | A plan with a scale bar must reconcile its listed areas with the drawn polygons, or lose the scale bar. A section's orientation ("East-West") comes only from a parsed document. Plan pins equal register rows. An overlay on an illustrative model has one meaning per screen, with a legend. |
| 9 Imagery | 11-22 cards, 17, 18, 20 | Extend to exported covers. No real-brand signage ("RADISSON BLU" on 20) in illustrative demo imagery. A catalogue photo shown as a specific asset is captioned "Illustration". |
| 10 Proposed design | 11, 13, 16, 18, 19, 21, 22, every card | Guardrails 2.1 has no source for an engineer's design entry, because `user` covers only the owner and the site survey. Add one (for example `engineer_design`) or a design subject. Deliverables, phasing, package contents and the recommended option become proposed-design fields. "Recommended by SOVITECH on <date>" appears only after an engineer event; before that, only **Suggested** with a computed reason. |
| 11 Project phase | 11, 12, 14, 15-22, 17 | Phase is one field for the project, so 12 cannot differ. Commissioning dates and progress are installation-phase facts (7.2.24). |
| 12 Financial indicators | 13, 19, 21, 22 | Add lifecycle cost and net savings. Each indicator declares: horizon (10, 15 and 20 years now coexist), discounting, escalation (21's 2.5% is not applied), gross or net of the BMS operating cost and of O&M, residual value, what happens to purchases at the horizon's end, and the cost boundary (BMS supply only, or the plant it serves). The label takes its horizon from the formula. |
| 13 Non-energy benefits | 11, 12, 19, 21 | State whether O&M savings count. 21 includes them in the headline, while 19 leaves them out of payback but puts them into its 20-year figure. |
| 14 Reconciliation | 11-14, 16, 17, 20-22 | Every breakdown (by system, phase, level or category) is a group-by over one set of cost lines. Split lines carry an allocation method. Chart geometry equals the bound values. The share rounding method is named. Displayed inputs reproduce the outputs. List totals equal the register query. |
| 15 Marketing copy | all | Include third-party logos ("Powered by SAUTER"), report-cover taglines, promotional panels (14), subtitle claims ("ensures", "in real time") and social proof. |
| 16 Read-only dashboards | 13, 14, 16, 17, 20-22 | Three kinds of action. View changes are allowed, with view verbs. Data edits (decisions, zones, assumptions) are allowed and governed by rules 3 and 4 and by 7.2.17, 7.2.20 and 7.2.28. BMS control and configuration stay out of the dashboards, including 14's "Configure Alarm Rules". |

#### New gaps from batch 2

These are proposals for the product owner, like 1-16 above. None is applied. The proving cases are described, not yet indexed.

17. **Decisions edited outside the wizard** (13, 16, 06, 19, 21).
    - *Scenario.* The same scope decision has four editors. 13 ticks Water where step 4 left it unticked. 16 adds rows that are not in the registry (Kitchen, Parking, "Other (Custom)"). "Select Package" writes many decisions in one click. Rule 5's confirmation budget covers only wizard steps 3-7. "Never ask twice" already applies on every surface, but no rule says which surface edits a decision.
    - *Proposal.* One registered editor per decision field; other surfaces open it. The confirmation budget applies on every surface. Adopting a package writes one decision per option, each visible, with a reason naming the package; no package includes a life-safety option. New options enter only as registry entries with `affects` and a sensitivity case.
    - *Promises.* Truth up; speed up (no re-asks).
    - *Proving case.* Scope answered on step 4 renders on System Scope with Edit and records no question event. Adopting Level 2 writes one candidate per system, and Fire Safety is not among them.
18. **SOVITECH's own outputs uploaded back as evidence** (18, 15).
    - *Scenario.* An exported Executive Summary or Bill of Quantities comes back as an upload. The evidence check passes, and an estimate becomes a `document` value with "From document".
    - *Proposal.* Every export carries a report id and snapshot id on each page and a machine-readable marker; the app stores a hash. A matching upload gets the kind `sovitech_output`, yields no candidates and raises one engineer finding.
    - *Promises.* Truth up; speed neutral.
    - *Proving case.* Re-uploading an exported proposal produces no candidates and one finding.
19. **A savings baseline for buildings with no operating history** (13, 19, 21, 22).
    - *Scenario.* The demo is new construction (step 1). Rule 10's baseline needs its years, weather normalisation and occupancy, which a new building does not have. The screens say "vs. conventional systems", "(-28%)" with no base, and "Baseline (S1)".
    - *Proposal.* Two baseline types: `historical` (rule 10 as written) and `modelled_reference`. The modelled type names the reference design, the model and version, the benchmark dataset, the step 5 operating profile and the climate year. It is always Estimated, and "Baseline" is reserved for the energy baseline.
    - *Promises.* Truth up; speed up (new builds get a range instead of "Not available yet"). It needs a benchmark dataset, which is a loosening.
    - *Proving case.* A new-build fixture with no bills shows savings against a named reference and version, or "Not available yet". A bare "vs. baseline" never appears.
20. **Engine outputs cannot be typed, and someone owns each financial assumption** (21, 22, 19).
    - *Scenario.* 21's "Edit" lists "Annual Energy Savings 1,450,000 kWh", an engine output, beside true inputs. An owner edit would outrank the engine's estimate under 2.4, so savings would become "Provided by you", which rule 10 forbids. No field says who sets the discount rate, horizon, escalation or residual value.
    - *Proposal.* Fields declare `origin: input | output`; outputs accept only `calculated` or `estimated`. Financial assumptions are input fields with a named confirmer: discount rate and horizon by the owner, energy price and escalation from reference data with an owner override, service life and residual value by an engineer.
    - *Promises.* Truth up; speed neutral.
    - *Proving case.* An owner value on the savings field is rejected. An owner energy price shows Provided by you, and the savings recalculate and stay Estimated.
21. **Savings measures without double counting** (12, 21, 19).
    - *Scenario.* 12 lists three HVAC measures on one HVAC baseline, and offers Predictive Maintenance, which step 7 left unticked. 21's streams mix systems with mechanisms.
    - *Proposal.* Measures are registered, each tied to one system and one mechanism. Measures on one baseline combine only by a declared method (in sequence, on the reduced baseline), and any total names it. Energy streams reconcile to kWh saved per carrier × price. Demand savings need a kW tariff. A measure outside the recorded scope shows "Not in your selected scope" and is not counted.
    - *Promises.* Truth up; speed neutral.
    - *Proving case.* Measures of 10%, 5% and 3% on one baseline combine to 17.1%, not 18%.
22. **Missing units and datasets** (11, 12, 13, 19, 21, 22).
    - *Scenario.* The rule 8 registry has no unit for CO₂ mass, emission intensity, duration (payback, horizon, service life, programme months), or any currency ratio: energy price (€/kWh), demand tariff (€/kW), cost per area (€/m²) and cost intensity (€/m² per year). Under 2.7, every such value on these screens fails the dimension check. No emission-factor or equivalence dataset exists.
    - *Proposal.* Add those units, each with its qualifiers (for example location- or market-based for CO₂, the VAT basis and price date for currency ratios, and the area basis for €/m²). Add an approved Romanian grid and fuel emission-factor dataset with its year. Recommend against tree and car equivalences; if kept, they need their own approved dataset.
    - *Promises.* Truth neutral; speed up: without these units, payback, €/m² and CO₂ cannot be shown at all. It is a loosening, and the most urgent of these proposals.
    - *Proving case.* A CO₂ value in kWh is rejected, and a payback value in h/a is rejected.
23. **Asset attributes that 2.5 leaves without a source** (17, 13, 16, 22).
    - *Scenario.* `Asset.lifeSafety` is a plain boolean with no source, verification or default. If nobody flags 17's main-entrance door controller, which could release an escape route, it gets control actions. 17's energy meter has no link to its metering point or parent meter, so rule 8's "never add a sub-meter to its parent" cannot be enforced.
    - *Proposal.* `lifeSafety` becomes an engineer field. For types that may qualify (doors, luminaires, lifts, car-park fans, gas valves), Unknown is treated as true and listed under "SOVITECH will check". A meter links to its metering point and its parent meter. Rule 8 already sums only utility meters when the hierarchy is unknown; the link is what lets code apply that.
    - *Promises.* Truth up; speed neutral (engineer items only).
    - *Proving case.* A door controller with no fire documents offers only view, log and documents.
24. **Implementation programme and progress** (11).
    - *Scenario.* 11 shows a 15-month programme with no source, a Gantt that disagrees with its own list, and a NOW line six months in on a design-phase project. 7.2.11 sets the project phase, but says nothing about progress.
    - *Proposal.* The phasing plan is a proposed-design field (7.2.10), in months after contract. No calendar dates, NOW line or progress before the contracted phase. Progress comes only from append-only engineer events with evidence. A missed milestone reads "Planned M6, not yet reached". With no plan: "Not available yet: SOVITECH has not prepared a phasing plan".
    - *Promises.* Truth up; speed neutral.
    - *Proving case.* A milestone whose month has passed with no event reads "not yet reached".
25. **Generated outputs have a lifecycle, and exports carry their basis** (18, 11, 13, 14, 17, 21, 22).
    - *Scenario.* 18's Topology Diagrams still read "Ready" after a newer HVAC schematic was added. The Bill of Quantities has read "Generating" for two weeks, yet already shows a date. The appendix is required only for proposals.
    - *Proposal.* Each output is stored with its template and version, snapshot id, requester, and start and finish times. Status is one of: Generating · Ready to download · Failed (with a reason) · "Out of date: inputs changed on <date>" (a new 2.8 status line) with Regenerate. Ranges and sources inline, and the appendix, apply to every export that contains values. Badges on the same line as their figures are already required in every export (2.8).
    - *Promises.* Truth up; speed neutral.
    - *Proving case.* An input changes after generation, and the report row shows "Out of date".
26. **Document records need an uploader and a role** (15, 18).
    - *Scenario.* DocumentRecord has no uploader, but the Speed Rule's site-survey step needs "the engineer as author". 15's Site_Visit_Notes by "S. Marin" cannot be classified. Superseded and withdrawn files have no display rule.
    - *Proposal.* Add `uploadedBy` with a role, and an `uploaded` event. A SOVITECH survey is accepted as `site_survey` only with an engineer author. A releveu keeps `site_survey` (2.3), with its uploader and author named. `kind` and `stage` become fields with badges. Every document list shows status, stage and revision. Withdrawn files stay listed with their status. Demo uploaders are fictional accounts.
    - *Promises.* Truth up; speed neutral.
    - *Proving case.* A file uploaded by an owner and presented as a SOVITECH survey falls back to `unknown`. An owner-uploaded releveu keeps `site_survey`.
27. **A home for open items after the intake** (15 and all dashboards).
    - *Scenario.* After Generate, a new upload's "Rev B changed N values" notice and rule 7's late findings both point to step 8, which the owner has left. No batch 2 screen shows open items.
    - *Proposal.* A persistent open-items place: an Overview panel plus a count in the shell. It holds "For you" and "SOVITECH will check", counted as rule 7 requires. It is never modal.
    - *Promises.* Truth up (late findings stay visible after the intake); speed up (no return to step 8).
    - *Proving case.* An upload after Generate changes 3 values. One notice appears in the open-items place, and no dialog.
28. **Zone kinds, origin and containment** (20, 04, 10, 17). Zones are already subjects (2.2); what is missing is below.
    - *Scenario.* 20's zones are space-use zones, which fit none of rule 8's zone qualifiers. "Add Zone" lets the owner create zones that "organize … control strategies". Ids repeat across floors. The zones exceed the drawn floor area.
    - *Proposal.* A zone kind `functional_space`, which never feeds points or CAPEX. A zone origin: document, owner grouping, or SOVITECH design. Zone ids unique per project, referenced by asset locations. A containment check: zones that exceed their level's area on the same basis become Please check, leave the totals and raise an engineer item.
    - *Promises.* Truth up; speed neutral (containment failures become engineer items).
    - *Proving case.* Zones of 3,260 m² on a 3,000 m² level show Please check, and the roll-up reads Incomplete.
29. **Gaps in the reserved-term list** (11, 14, 18).
    - *Scenario.* Matching is whole-word, so "guarantee", "guarantees", "garantăm", "garanție", "ensure(s)" and "asigură" all pass today. So does "Compliance Report", although "conformitate" is flagged.
    - *Proposal.* Add those forms, keeping the English and Romanian lists at parity. The company website import (2026-09-24) found more forms in SOVITECH's own copy: "garantează", "garantate", "garantată", "certificate", "certificări", "conformă", "conforme", "verificate", "confirmă" and "comply" (`company/brand/voice-and-messaging.md` 7.10, `company/business/articles/README.md`). "certificate" is also an English noun, so it needs a context rule to avoid false positives. Offer "reduces", "saves" and "eliminates" to the approver as candidates, noting the risk of false positives. This is a tightening.
    - *Promises.* Truth up; speed neutral. It is a tightening.
    - *Proving case.* "we guarantee savings", "the BMS ensures comfort" and "Compliance Report" are each flagged.
30. **Which digits the render test treats as bound** (11, 12, 15, 17-22).
    - *Scenario.* Pagination ("1 2 3 4 5 … 52"), row ranges, file sizes, axis ticks and scale bars all fail G2-1 as written. The alternative is to bind them to fake value ids.
    - *Proposal.* Three bound classes: record-bound digits (a record field or a list query); scale-bound digits (ticks generated from a bound series, with the unit shown); navigation indices inside a pagination role, never next to a unit. Everything else still fails. This is a loosening.
    - *Promises.* Truth neutral (unbound digits still fail); speed up for the build. It is a loosening.
    - *Proving case.* Page buttons pass; an unbound "512" fails.
31. **Coverage on registers** (17, 16, 20, 22).
    - *Scenario.* 17's subtitle "all equipment included in the project scope", above "Showing 1–10 of 512 equipment", reads as a complete inventory even when sheets were only partly analysed. Rule 12's coverage attaches to files, not to registers.
    - *Proposal.* Every register view states the documents behind it, their coverage and the possible duplicates, for example "Built from 12 documents · 1 partly analysed (37 of 40 pages) · 9 possible duplicates for SOVITECH".
    - *Promises.* Truth up; speed neutral.
    - *Proving case.* The register header shows coverage when one source file is only partly analysed.
32. **Energy and cost time series** (12).
    - *Scenario.* 12 plots calendar months, but bills run, for example, from 15 Jan to 14 Feb. Splitting a bill across months by day assumes uniform use. That is neither `calculated` nor on `estimated`'s list, and rule 8 does not say which date's exchange rate applies across a series.
    - *Proposal.* Allocating a billing period to months is `estimated`, with its method, or the chart uses the billing periods themselves. Each bill is converted at its own date's rate, or the whole series at one stated date, and the chart says which.
    - *Promises.* Truth up; speed neutral.
    - *Proving case.* A 15 Jan to 14 Feb bill never renders as a Calculated January bar.
33. **Alarms in the operation phase** (14). This applies only if operations is built (question 8.1).
    - *Scenario.* "Acknowledged" and "Resolved" have no author, and priorities have no source. "Configure Alarm Rules" and "receive notifications" could mute a life-safety alarm without any command reaching the fire system. Rule 11 does not cover that.
    - *Proposal.* An append-only alarm event log (raised, acknowledged, returned to normal, closed; by whom, role, when, why), with status derived from it. Priority is an engineer attribute from the approved alarm list, otherwise Unknown. Alarm-rule configuration is BMS engineering, not a dashboard action. No notification rule can mute, delay or hide a life-safety alarm.
    - *Promises.* Truth up; speed neutral (operation phase only).
    - *Proving case.* A rule that mutes Fire Safety notifications is rejected.

**Judged and not raised as gaps:** the "CONFIDENTIAL" cover (not a guardrail matter), "Bill of Quantities" as a reserved term (a priced one is already rule 10), "API Specification" (rule 1 and 7.2.10), "Powered by SAUTER" (7.2.15), "Most popular" and "Recommended" (2.8, rule 3, 7.2.5, 7.2.10), "Custom Scenario" (7.2.4), lifecycle unit costs (rules 1 and 2.1, 7.2.12), share links (7.2.25), staff cost and uploader names (7.2.6), achieved savings (7.2.1).

---

## 8. Open questions that change the build

1. **Scope of part 2.** Is it the proposal dashboards only, the live operations view only, or both? If both, is operations a later phase? This decides whether (L) content is built at all, and whether proposals 7.2.1-3 are needed now. Batch 2 raises the stakes: 14 is a full alarm console, and 12 shows the project as "Operational" with achieved savings.
2. **Theme. Decided 2026-09-24; two sub-questions are still open.**
   - *As asked:* Should the dashboards use part 1's teal-navy with the aqua accent (as screen 10 does), or the neutral near-black of 01-09 across the whole app? Batch 2 moves to teal-navy on 15-22 (3.6). If that is the answer, also settle one title role (uppercase bold, or bold title case) and whether the live/OK status keeps its own colour, separate from the aqua button. The company brand is a third option: the website uses cream, dark green `#0D2E2B`, accent green `#1F6B4A` and mint `#C8E6C9`, and a real logo that the mockups' "SOVITECH" wordmark does not match (`company/brand/app-alignment.md`). Should the app follow the company brand, keep the mockup theme, or be a documented sub-brand?
   - *Decided 2026-09-24:* the product owner answered "treat the app as our brand tool". The whole app carries the company brand in its dark variant, with the real logo and mint `#C8E6C9` as the single accent on dark. That replaces every mockup theme family, teal-navy with aqua and near-black alike. The mockups stay the brief for layout, structure, flows and content. The recorded interpretation and what it supersedes are at the top of section 3, and in `company/brand/app-alignment.md`, "App theme".
   - *Still open, re-phrased for the brand theme:*
     - **Title role.** The brand's display headings are light (weight 300) with tight tracking (−0.05em). The mockups use bold sentence case in part 1 and four title roles in part 2 (3.6). Should app page titles use the brand's light display style at app sizes, or one bold role from the mockups?
     - **Status colour.** Should live/OK status keep its own hue, separate from the mint accent `#C8E6C9`, so a status dot never reads as the accent? 3.6 item 1 proposed `#22EEB2`, chosen against aqua. The brand has no status colours, so the choice is the app's. `company/brand/app-alignment.md` proposes OK `#4FCC92`, ΔE 16.3 from mint, for the owner's OK.
3. **Navigation.** Do you accept the revised structure in 2.5? That means: Wireframe retired; SYSTEM SCOPE, TOPOLOGY and METRICS as the tabs; one grouped project sidebar; an Overview page as the landing after Generate; and one editor per decision. Which tab order: the mockups' TOPOLOGY · SYSTEM SCOPE · METRICS, or SYSTEM SCOPE first?
4. **Demo building. The name was decided 2026-09-24; the floor questions are still open.** What floor structure should the demo use? The cards read "28 + GF + 8" on 02, 06, 07, 08 and 12-14, "2B + GF + 8" on 11, and "2B + GF + 6" on 10 and 15-22, and the stacks on 13, 16 and 17 draw B2, B1, GF and 01-06. This suggests part 1's "28 + GF + 8" was meant as "2B" (two basements). Is it 2B + GF + 8 or 2B + GF + 6? What is floor 05's function (13 says Conference & Event, 14 says Guest Rooms)? Note also that SOVITECH's website publishes Radisson Blu Bucharest as a real, delivered retrofit of a hotel opened in 2007, with 424 rooms (`company/business/case-studies/radisson-blu-bucuresti.md`). Should the demo keep the real hotel's name at all?
   - *Decided 2026-09-24:* the product owner answered "no". The demo project is a fictional hotel, working name "Demo Hotel Bucharest", which the owner may rename. The mockups show "Radisson Blu Bucharest", and the transcriptions keep that text.
   - *Recommended, not decided:* the demo fixture should not reuse the real hotel's published facts, such as its 424 rooms or its opening in 2007.
   - *Still open:* the floor structure (2B + GF + 8 or 2B + GF + 6) and floor 05's function.
5. **3D model source.** Is the model built from the owner's documents, or is it an illustrative massing? This drives effort and the labelling in 7.2.8. It is the same question as part 1's Q3. Partly answered by the owner's IFC direction (2026-09-24): when an IFC model is uploaded, the 3D and 2D views are built from it. Still open: what to show with no IFC, several models, and whether the viewer is in slice 1 (`docs/ifc-input.md` 6.3.2).
6. **Financial method.** Should payback be gross or net of BMS OPEX? What are the discount rate, horizon and escalation? What does "vs baseline" compare against? Batch 2 uses three horizons (10, 15 and 20 years) and four ROI definitions (6.5). Which indicators should the app show at all: payback, NPV, ROI, lifecycle cost?
7. **Systems catalogue.** Which list should it cover: the 8 in part 1's step 4, the 9 on 13, the 11 on 06 or the 12 on 16? What happens to the systems step 4 lacks: Room Automation (16's "Guest Room Systems"), Car Park (16's "Parking"), Kitchen Systems, "Other (Custom)" and Other?
8. **SAUTER product line.** Which generation should the proposed design use (EY-modulo 5 or modulo 6), and which roles (automation stations for plant, ecos for room automation)? Should access control and fire be third-party integrations? SOVITECH's own website says it uses "Modulo5, Modulo6 si ECOS" controllers. Its product list has modulo 6 automation stations (EY6AS60/80) and ecos504/505, but no EY-modulo 5 entry (`company/products/README.md`).
9. **Timeline and scenario bar.** What do −6h…+6h and −12M…+12M mean, and do they stay? Proposed: one scenario selection across Metrics replaces the scenario bar, which 11 and 12 still carry (2.5 rule 6), and the timeline is hidden when there is no BMS (7.2.3). Do you accept both?
10. **Pages not yet designed.** Batch 2 designed most of them. Still missing: Overview, Property, the Metrics landing (Financial Overview in the new shell), the Review step and the proposal itself, the generating state, and the detail pages listed in 1.2. Will you send these, or should the build follow 2.5 and the part 1 style?
11. **Systems View.** Should the base be version 03 (dense) or version 09 (selection-driven)? 2.5 retires Wireframe but does not yet place Systems View. Proposed: fold it into System Scope's detail panel (16), in which case this question goes away.
12. **The configurator on 13.** Should its stepper become an optional walkthrough over the ordinary pages (2.5), or be dropped so 13 is an ordinary Metrics page? Either way it must not ask the part 1 questions again.
13. **Automation model.** Part 1 step 7 asks for automation areas. 13 asks for a level from 1 to 4 per system, plus a package. Which should the owner answer? Recommended: keep step 7 as intent, make the package on CAPEX the one decision after Generate, and treat per-system levels as overrides (a custom scenario). A new owner question needs your approval under the guardrails.
14. **Lifecycle cost boundary.** 22 prices AHUs, fan coils and 1,420 LED fixtures, which are building plant rather than BMS supply. Should lifecycle cost cover only what SOVITECH supplies, or also the plant the BMS controls? This decides which data the app needs.
15. **Who uses the dashboards.** 15 and 18 show named people uploading documents and generating reports, and 13 and 14 show a user avatar. Is part 2 for the owner only, or also for SOVITECH engineers (review queue, report generation)? This decides roles, permissions, and whether the engineer review queue lives in this app.
