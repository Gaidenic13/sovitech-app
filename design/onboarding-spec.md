# SOVITECH onboarding flow (part 1): design and function spec

**What this is:** the reference for part 1 of the app, the 8-step intake wizard that collects everything needed to generate a BMS proposal. It is derived from the 8 approved mockups in `design/reference/onboarding/`.

**How to read it:** sections 1 to 5 describe what the mockups show. Anything marked **Proposed** is a suggested default for the build, used where the mockups disagree or say nothing. It has not been confirmed.

**Status:** written 2026-09-23 from mockups only, and checked against the screens by three independent reviews. No code exists yet.

**Guardrails:** the data-integrity rules in `docs/guardrails.md` take precedence over anything proposed here. Section 5 of that file lists the changes they require on these screens.

**Demo data:** the Radisson Blu Bucharest values in the mockups are invented. The app must label them "Demo data, not an assessment of the real building" (guardrail rule 10).

| # | Step | Reference image |
|---|------|-----------------|
| 1 | Project | `reference/onboarding/step-1-project.webp` |
| 2 | Documents | `reference/onboarding/step-2-documents.webp` |
| 3 | Building | `reference/onboarding/step-3-building.webp` |
| 4 | Systems | `reference/onboarding/step-4-systems.webp` |
| 5 | Operations | `reference/onboarding/step-5-operations.webp` |
| 6 | Goals | `reference/onboarding/step-6-goals.webp` |
| 7 | Automation | `reference/onboarding/step-7-automation.webp` |
| 8 | Proposal | `reference/onboarding/step-8-proposal.webp` |

---

## 1. What the flow does

A property owner sets up a building project and hands over what they know. The app reads their documents, shows back what it found, asks them to confirm it, and collects the operating context and goals. The flow ends with **Generate Proposal**, which sends everything to the AI to build a SOVITECH / SAUTER BMS proposal. That proposal and the dashboards are part 2.

The flow has three phases:

1. **Set up and hand over** (steps 1-2). The owner names the project, classifies it, places it, and uploads what they have.
2. **AI reads, human confirms** (steps 3-4). The owner sees what the AI extracted and detected and is asked to confirm or correct it.
3. **Intent** (steps 5-7). The owner describes how the building runs, what they want to achieve and what to automate. Documents answer these questions only partly, so the AI may pre-fill answers for the owner to confirm.

Step 8 is a review with Edit links back to each step, then the Generate action.

**Trust and provenance run through the design.** On step 3, extracted values show a source line and a badge saying whether they were read from a document or inferred. Values that need review are flagged for confirmation. Step 4 marks systems as Detected or Optional. Steps 4, 5 and 7 each tell the owner the choice can be changed later, each in different words:
- "You can adjust these selections later."
- "You can refine this later."
- "You can change this later."

**Layout direction:** a centred, content-first single column on a flat dark canvas, with one topic per screen and one accent colour. The split-screen variants with a hotel photo hero from the ChatGPT thread were not carried into this set. Only step 3 uses a multi-column layout, because it has a 3D viewer.

---

## 2. Visual system

### 2.1 Character

- **Flat and dark.** There are no shadows, no glows and no surface gradients. Depth comes only from 1px hairline borders and faintly tinted fills. Step 5 is the one exception, with glowing selected pills; see 6.2.
- **One bright accent**, a mint-aqua, used sparingly: the primary button, the current step, checked controls and selected borders.
- **Outline line icons** on a 24px grid with a 1.5px stroke and rounded caps. They are white by default.
- **Sentence-case headings**, with uppercase letter-spaced micro-labels for the eyebrow and header.
- **A monospaced header date and time** on steps 2-8. It gives an instrument-panel note to an otherwise calm UI.

### 2.2 Colour tokens

Values are medians sampled from the mockups. The mockups are AI-rendered, so treat these as close targets, not exact brand values.

| Token | Hex | Used for |
|-------|-----|----------|
| `bg` | `#040E14` | Page background, including the header. The header has no fill of its own. |
| `surface` | `#061219` | Raised panels, dropzone, textarea, step 3 detail rows |
| `surface-input` | `#081016` | Text inputs and selects |
| `surface-selected` | `#031A1E` | Fill of a selected card, about 6-8% accent over `bg` |
| `border` | `#22333B` | Default card border, 1px |
| `border-input` | `#2A3840` | Input, select, textarea and link-row border, 1px |
| `border-strong` | `#6E787F` | Back button outline, 1.5px |
| `border-dashed` | `#596772` | Dropzone outline: 1.5px dashed, 5px dash, 2.5px gap |
| `border-selected` | `#2BA68F` | Selected card border, 1.5px, roughly accent at 60% |
| `divider` | `#0E1D24` | Header, footer, section and column rules, 1px |
| `accent` | `#01F2D9` | Primary button, current step, checked checkbox and radio, active segment |
| `accent-dim` | `#2A8475` | Completed-step ring. Its check is slightly brighter, around `#339C92`. |
| `on-accent` | `#04231E` | Text and icons on accent fills |
| `text-primary` | `#F4F7FA` | Headings, card titles, values, Back label |
| `text-secondary` | `#C8D2DA` | Subheadings and banner body |
| `text-tertiary` | `#AEBBC6` | Card descriptions, inactive stepper labels, eyebrow, secondary instruction lines |
| `text-muted` | `#8E99A4` | Tagline, date and time, placeholder, counters, helper text, floating labels |
| `text-faint` | `#75828D` | Source lines such as "From: Area Schedule.pdf", and document-tile descriptions |
| `text-link` | `#5ED1D3` | Edit links, both label and pencil icon |
| `text-accent` | `#39D4BA` | Browse files button, Detected badge text. The success banner title renders paler, around `#76CFCA`. |
| `info` | `#24D6E8` | Info icon in banners |
| `info-bg` / `info-border` | `#021C24` / `#194A5B` | Info banner |
| `success-bg` / `success-border` | `#03181F` / `#2E7E6E` | "Building data extracted" banner |
| `warning` | `#F3C014` | Amber dot. Amber text reads around `#D8B84E`. |
| `badge-detected` | fill `#01201F`, border `#24685F`, text `#33D0B9` | Outline pill |
| `badge-optional` | fill `#14232D`, text `#B5C3D3` | Solid pill with no border |
| `badge-document` | fill `#093167`, text `#79AFE2` | Solid azure pill. This is the majority shade, and it stays clearly apart from the violet AI pill. |
| `badge-ai` | fill `#1F1C5A`, text `#928BCA` | Solid violet pill |
| `control-off` | `#9AA6B2` | Unchecked checkbox ring, 1.5px. Unchecked radio rings render dimmer, `#495259`-`#6E7E8B`; see 6.2. |

### 2.3 Typography

Sizes are normalized to a 1440px-wide canvas.

| Role | Face | Size / weight | Notes |
|------|------|---------------|-------|
| Wordmark "SOVITECH" | Squared geometric, Eurostile-like. Orbitron or Michroma are the closest free faces. | about 24px, regular to medium, tracking about 0.2em | Should ship as an SVG logo |
| Header tagline | Inter | 10px / 400-500, uppercase | Two lines: "BUILDING INTELLIGENCE" and "FOR A SUSTAINABLE TOMORROW" |
| Header project name | Inter | 13px / 500, uppercase | |
| Header date and time | Mono: JetBrains Mono, IBM Plex Mono or Geist Mono | 12.5-13px / 400, uppercase | "TUE, 17 SEP 2025  12:36", with a double space before the time |
| Eyebrow | Inter | 13px / 400-500, uppercase, tracking about 0.07em | "STEP X OF 8", in `text-tertiary` |
| H1 | Inter | 34px / 700, tracking -0.01em | Sentence case |
| Subheading | Inter | 17px / 400 | `text-secondary` |
| Instruction line | Inter | 14-15px / 400 | `text-tertiary`. Used for the second subheading line on step 4 and the step 3 body. |
| Question label | Inter | 15-16.5px / 500-600 | An "(optional)" suffix is smaller and muted |
| Helper under a question | Inter | 13px / 400 | `text-muted` |
| Selectable card title | Inter | 17px / 600 | Renders 17 on steps 4 and 7, but 14-15.5 on steps 1 and 6 |
| Selectable card description | Inter | 14-15px / 400, line height about 20-22px | `text-tertiary` |
| Summary card title / label / value | Inter | 15 / 600, 13 / 400 muted, 16 / 600 | Step 8 |
| Document tile title / description | Inter | 12-13 / 500, 11 / 400 | Step 2 |
| Detail row label / value / source | Inter | 11 / 400, 15-16 / 600, 11 / 400 | Step 3 |
| Stepper label | Inter | 11-12px. Inactive 400; current 600 and brighter. | |
| Badge | Inter | 12px minimum / 500 | The mockups render 10-11px. `docs/guardrails.md` 2.8 requires 12px or larger and WCAG AA contrast. |
| Button | Inter | 14-15px / 500 | Step 1's "Next" renders about 16 |
| Input value / placeholder | Inter | 16px / 12.5-13.5px, 400 | |
| Counter "0 / 500" | Inter, tabular figures | 12.5-13px / 400 | `text-muted` |

### 2.4 Layout and spacing (1440 canvas)

- **Header.**
  - About 64px tall.
  - The logo sits at x≈22, followed by a 1px vertical divider and the tagline.
  - On the right: the project name and date/time block, then a hamburger about 18px from the edge.
  - The bottom rule is 1px. On steps 1, 3 and 5 it spans the width and is brightest at the ends. On steps 4, 6, 7 and 8 it is two segments of about 245px, one under the logo block and one under the project block. **Proposed:** one rule that fades out toward the centre.
- **Stepper.**
  - 8 circles, 32px across, about 120px apart, centred on the page axis.
  - Labels sit about 12px below the circles.
  - Connectors are 1px lines between the circles.
- **Title block.** A centred eyebrow, then the H1 about 29px lower, then the subheading about 47px below the H1. Step 3 left-aligns its title block in its own column.
- **Content widths.**
  - 4-column card grids: 1180-1220.
  - 3-column grid: about 1070.
  - Form-style steps (1 and 5): about 830-900.
  - Dropzone: about 745.
- **Step 3 grid.** A left column about 344 wide, a flexible viewer column, and a right panel about 405 wide. A 1px column divider separates the viewer from the right panel.
- **Card grids.** 20px gaps and 24px padding. The checkbox is inset 22px from the top and right. Radius 8. **Proposed:** all cards in a grid share one height.
- **Section divider.** A 1px `divider` rule at content width, as between the goal grid and the note field on step 6.
- **Footer.** A 1px divider about 26px above the buttons, running between the page gutters of about 48-60px. Back sits at the bottom-left and the primary button at the bottom-right.
- **Radii.** Cards, panels and banners 8; inputs 6; buttons 6; checkbox 3; badges and pills fully rounded.

### 2.5 Components

- **Header.** Wordmark, a vertical divider, the two-line tagline, then the right-side project name over the date and time, then the hamburger menu.
- **Stepper.**
  - *Completed:* a dark circle with a 1.5px `accent-dim` ring and a check, and no numeral.
  - *Current:* a solid `accent` disc with a dark numeral, and a brighter, heavier label.
  - *Upcoming:* a dark circle with a 1.5px grey ring (`#4A565E`) and a light numeral.
  - *Connectors:* each completed segment is drawn as a gradient from dark teal-grey to `accent-dim`. The segment leading into the current step is the brightest. Upcoming segments are dark teal-grey, `#0B2127`.
  - **Proposed:** draw one linear gradient across the whole completed span, with the lines meeting the rings.
- **Primary button.** About 190×48px, radius 6, solid `accent`. The label sits on the left and a right arrow on the right, both in `on-accent`. The last step reads "Generate Proposal". Step 1 reads "Next".
- **Secondary button (Back).** The same size, transparent, with a 1.5px `border-strong` outline. A left arrow comes first, then the label.
- **Outline accent button ("Browse files").** A 1.5px teal border over a very dark teal fill, with a teal file icon and a teal label.
- **Text input.** A leading 24px icon, with the value at 16px. About 55-64px tall.
- **Select with floating label.** A leading icon, a small muted label (such as "City") above the value, and a trailing chevron. About 68px tall.
- **Compact dropdown.** Used for "‹ All floors ⌄" on step 3. It has a previous chevron, the label and a down chevron, is outlined and is about 40px tall.
- **Textarea with counter.** A placeholder with a "0 / 500" counter at the bottom-right. Step 5 shows it as a single row with the counter inline at the right.
- **Selectable card, three shapes.**
  - *Tall card:* icon at the top-left, then title, then a two-line description, with a checkbox at the top-right. Used on steps 4, 6 and 7. Step 1 uses the same card with a radio instead.
  - *Compact tile:* an icon above a label, about 68px tall. Used for building type on step 5.
  - *Pill row:* icon, label and radio on one line, about 46px tall. Used for occupancy and schedule on step 5.
- **Selected state (majority treatment).**
  - A 1.5px `border-selected` border and a `surface-selected` fill.
  - The icon and text keep their colours.
  - A checked checkbox is a solid accent square with a dark check.
  - **Proposed radio:** a ring in `control-off` with a transparent fill; when selected, an accent ring with an accent dot. It sits at the top-right on tall cards and compact tiles, and right-centre on pill rows.
- **Badges.** The badge shapes follow the mockups: Detected is an outline pill, and the rest are solid pills. The labels come only from `docs/guardrails.md` 2.8:
  - Detected becomes From document, or Likely or Possible when inferred.
  - Optional becomes Not found in documents.
  - Document becomes From document.
  - AI Inference becomes Likely, Possible, Please check or SOVITECH will check.

  The `badge-*` tokens set colour only.
- **Status pill.** A dark neutral fill with a 6px `warning` dot and amber text, as in "3 items need confirmation".
- **Banners.**
  - *Info:* `info-bg` fill, `info-border` border and a cyan info-circle icon. Some banners carry a title.
  - *Success:* a teal check-circle with a teal title, as on step 3.
  - *Warning row:* an amber info icon, an amber title, a body line and a chevron. The whole row is clickable.
- **Dropzone.**
  - A dashed outline and a cloud-upload icon of about 64px.
  - The text "Drag and drop your files here", then "or", then the Browse files button.
  - Below that, the accepted formats and the size limit.
- **Document-type tile.** A 24px icon, a title and a one- or two-line description. It shows no state.
- **Segmented control.** "3D / 2D / Wireframe". The active segment has an accent fill.
- **Panel.** A bordered container with a header row holding a title and an optional status pill. Nested rows sit inside it, as in step 3's "Extracted details".
- **Extracted-detail row.** A 24px icon, a label, a large value, a "From: …" source line, and a provenance badge at the top-right.
- **Key/value list.** A 24px muted icon, a label and a right-aligned value, with 1px dividers between rows. Used for the step 3 summary stats.
- **Link row.** An outlined row with a leading icon, a label and a trailing chevron, as in "View all extracted data".
- **Summary card.** An icon, a title and an "Edit" link with a pencil icon at the top-right, followed by label and value pairs. The Proposal card has no Edit link.
- **Icons.**
  - Lucide at stroke 1.5 covers almost every glyph. Tabler covers the gaps: the crane, the CO₂ cloud and the hospital.
  - Scale by use:
    - 40px on tall selectable cards.
    - 32px on radio cards, step 5 question gutters and summary cards.
    - 24px on inputs, list rows and document tiles.
    - 20px on compact tiles and pills.
    - 64px in the dropzone.

---

## 3. Steps

### Step 1: Project

**Purpose:** create the project record: its name, the project type and the building location.

**Copy:** no eyebrow, H1 or subheading. Only the field labels appear, and an empty band sits where the title block would be.

| Field | Control | Options / value in mockup |
|-------|---------|---------------------------|
| Project name | Text input with a building icon | "Radisson Blu Bucharest" |
| What type of project is this? | Radio cards, single-select, 4 in a row | **New construction** (selected), Renovation, Existing building, BMS modernization |
| Where is the building located? | Two selects with floating labels: City (pin icon), then Country (globe icon) | Bucharest, Romania |

**Actions:** "Next" as the primary button, aligned to the form's right edge. There is no Back button.

**Behaviour:**
- The header already shows the project name in uppercase on this step. Either it updates live from the input, or the project already exists.
- Project type most likely shapes what later steps ask for. The mockup does not say how.

**Differs from the other steps:**
- No header tagline and no logo divider.
- The date and time are set in a proportional face, not mono.
- No title block.
- The stepper sits about 56px left of the content axis. Its circles are smaller, about 30px, and its connectors are lighter and stop short of the rings.
- The selected card tints its icon teal, and its radio sits at the bottom centre.
- "Next" instead of "Continue", on a larger button.
- No footer divider.
- The screenshot is cropped at the right edge, so the hamburger is cut off.

### Step 2: Documents

**Copy:**
- Eyebrow: "STEP 2 OF 8"
- H1: "Upload your project documents"
- Sub: "Add the files you already have. We’ll extract the key information for you."

**Controls:**
- **Dropzone.**
  - Text: "Drag and drop your files here", then "or", then "Browse files".
  - Below it: "PDF, DWG, IFC, RVT, XLSX, DOCX, JPG, PNG, ZIP" and "Max file size 500 MB".
  - The plural "files" implies multiple files.
- **"Common document types (optional)."** Five tiles:
  - Architectural: "Plans, sections, elevations"
  - MEP: "HVAC, electrical, plumbing"
  - Existing BMS: "Schematics, point lists"
  - Energy: "Utility bills, reports"
  - Other: "Specifications, BOQ"

**Actions:** Back and Continue.

**Behaviour:**
- The mockup shows only the empty state. There is no file list, progress, error or drag-over state.
- Continue is drawn enabled with no files uploaded, which suggests the step can be skipped.
- The tiles have no selectable state. They may be hints, per-category upload targets or a checklist.

**Proposed:**
- Parse by format: text and OCR from PDF, DOCX and images; tables from XLSX; CAD from DWG; BIM from IFC and RVT; and unpack ZIP files. The screen promises only "We’ll extract the key information for you". Which formats are actually parsed in v1 is open; see Q15.
- Make the tiles a live checklist. Each tile shows a check and a file count once an upload is classified into its category.

### Step 3: Building

**Copy:**
- Eyebrow: "STEP 3 OF 8"
- H1: "Your building"
- Body: "We’ve analyzed your documents and found the following information about your building." and "Please review the details and confirm or correct any information if needed."

**Layout:** three columns.

- **Left column (summary).**
  - Success banner: "Building data extracted" / "From architectural drawings, schedules and BIM files."
  - A key/value list: Total area 34,500 m², Floors 28 + GF + 8, Rooms 424, Zones 218, HVAC assets 126, Systems 12.
- **Centre column (3D viewer).**
  - An isometric glass-wireframe model of the tower and podium.
  - A "3D / 2D / Wireframe" segmented control, with 3D active.
  - A floor selector reading "‹ All floors ⌄".
- **Right column ("Extracted details" panel).**
  - An amber status pill: "3 items need confirmation".
  - Four detail rows:

    | Label | Value | Source line | Badge |
    |-------|-------|-------------|-------|
    | Building area | 34,500 m² | From: Area Schedule.pdf (Page 4) | Document |
    | Floors | 28 + GF + 8 | From: Floor Plans A-101 → A-129 | Document |
    | Rooms | 424 | From: Room Schedule.xlsx | Document |
    | HVAC assets | 126 | From: MEP Drawings | AI Inference |

  - A link row, "View all extracted data", with an eye icon.
  - A warning row: "3 items need your confirmation" / "We've detected some values that need your review before we continue."

**Behaviour:**
- Four of the six values carry a source line and a badge. The source detail varies from row to row:
  - a file and page,
  - a sheet range,
  - a file only,
  - a drawing set.
- Zones and Systems appear only in the summary list, with no provenance.
- Some values are flagged for review. The criteria are not shown, and none of the four visible rows carries a flag, so the flagged items may sit in the fuller list behind "View all extracted data".
- The warning copy says the flagged values need review "before we continue". That implies a gate, yet Continue is drawn enabled.
- The viewer can isolate a single floor.

**Not shown:**
- Where the owner edits a value.
- How a corrected value looks. There is no "Edited" state.
- What the screen shows while analysis is still running, when extraction partly fails, or when nothing was found.

**Proposed:**
- Give every extracted value a source and a badge.
- Mark flagged rows with the amber dot.
- Give every row an Edit action (guardrails section 5, step 3). Rows that pass rule 5's test also get "Is this right? Yes · Edit". A side drawer from the warning row or "View all extracted data" is an additional path.
- Continue always works, as required by guardrail rule 7 and section 1 ("block outputs, not people"). This replaces an earlier draft that blocked Continue.
  - Items that pass rule 5's confirmation test and are left unanswered go to the review step's "For you" list.
  - Engineer items go to "SOVITECH will check".
  - Other values keep their badge and are not open items.
  - Outputs that depend on unverified inputs are marked provisional.
- Add three missing states:
  - *Analysis in progress:* skeleton rows and a progress banner.
  - *Partial extraction:* a failed-file warning in place of the success banner.
  - *Nothing found:* a manual-entry form.

### Step 4: Systems

**Copy:**
- Eyebrow: "STEP 4 OF 8"
- H1: "Which systems should be included?"
- Sub: "We've detected the following systems in your documents."
- Instruction line: "Select the systems you want to include in the BMS scope."

**Control:** checkbox cards, multi-select, in a 4×2 grid.

| System | Description | Badge | State |
|--------|-------------|-------|-------|
| HVAC | Heating, ventilation and cooling systems | Detected | ✔ |
| Lighting | Lighting control and DALI integration | Detected | ✔ |
| Energy | Energy metering and monitoring | Detected | ✔ |
| Access Control | Integration with access control systems | Detected | ✔ |
| Fire Safety | Monitoring and integration (fire logic remains independent) | Detected | ☐ |
| Water | Water management and leak detection | Optional | ☐ |
| Elevators | Monitoring and status integration | Optional | ☐ |
| CCTV | Video surveillance integration | Optional | ☐ |

**Banner:** "Some systems are optional or may require additional documentation. You can adjust these selections later."

**Behaviour:**
- All four checked systems are Detected. Fire Safety is Detected but unchecked. This suggests detected systems come pre-checked, and life-safety systems need explicit opt-in because the BMS only monitors them. The rule is unconfirmed; the mockup shows only one state.
- Systems that were not detected still appear as "Optional", so the list is a fixed catalogue of supported integrations.
- No detection shows its source.
- Leaving Fire Safety unchecked never removes the fire-alarm input and the fire-mode status for each affected panel. Those stay in the point list (guardrail rule 11, G11-3).
- The selection defines the **integration scope**: what the BMS connects to. That drives points, controllers and cost in the proposal.

### Step 5: Operations

**Copy:**
- Eyebrow: "STEP 5 OF 8"
- H1: "How does your building operate?"
- Sub: "Help us understand how the building is used. You can refine this later."

**Layout:** each question has an icon in a left gutter, then a title and a helper line, then its options.

| Question | Helper | Control | Options |
|----------|--------|---------|---------|
| What type of building is it? | This helps us tailor the BMS configuration to your needs. | 6 compact tiles, single-select | **Hotel**, Office, Retail, Hospital, Residential, Other |
| How is it occupied? | This helps us understand usage patterns and optimize control strategies. | 4 pill rows, single-select | **Mostly occupied**, Mixed, Seasonal, Low occupancy |
| When does it operate? | This helps us configure schedules and automation logic. | 4 pill rows, single-select | **24 / 7**, Business hours, Extended hours, Seasonal |
| Anything else we should know? (optional) | Add any specific information about how the building operates. | Note input, 500 characters | Placeholder: "Add a note (e.g. peak seasons, special events, operational constraints...)" |

**Behaviour:**
- These answers set the operating profile: schedules, occupancy-based control and the savings strategy.
- Hotel is preselected with no provenance badge. Its source is unknown, since no earlier screen shows a building type.
- The mockup shows no follow-up inputs, but none of the selected options would need one. See Q11.

### Step 6: Goals

**Copy:**
- Eyebrow: "STEP 6 OF 8"
- H1: "What are your main goals?"
- Sub: "Select what matters most for your project. You can choose multiple options."

**Control:** checkbox cards, multi-select, in a 4×2 grid.

| Goal | Description | State |
|------|-------------|-------|
| Reduce energy consumption | Optimize energy use and lower operational costs. | ✔ |
| Lower carbon emissions | Meet sustainability targets and ESG requirements. | ☐ |
| Improve guest comfort | Ensure a better indoor environment and experience. | ✔ |
| Increase operational efficiency | Streamline building operations and maintenance. | ☐ |
| Ensure compliance | Meet local regulations and industry standards. | ☐ |
| Extend asset lifespan | Protect your investment through predictive insights. | ☐ |
| Reduce operating costs | Identify and eliminate inefficiencies. | ✔ |
| Other | Tell us about your specific goals. | ☐ |

A section divider separates the grid from the note field: "Any additional goals or priorities? (optional)". Its placeholder is "Add a note here..." and it holds up to 500 characters.

**Behaviour:**
- Goals are the AI's intent signal. They decide which measures and KPIs the proposal and dashboards emphasise.
- "Improve guest comfort" is hotel wording. It probably adapts to the building type, for example to occupant comfort for an office.

### Step 7: Automation

**Copy:**
- Eyebrow: "STEP 7 OF 8"
- H1: "What would you like to automate?"
- Sub: "Select the areas you want SOVITECH to optimize. You can change this later."

**Control:** checkbox cards, multi-select, in a 3×2 grid.

| Area | Description | State |
|------|-------------|-------|
| HVAC | Automated climate control for comfort and efficiency. | ✔ |
| Lighting | Smart lighting control and scheduling. | ✔ |
| Energy Management | Monitoring and optimization of energy use. | ☐ |
| Water Management | Leak detection and optimized water usage. | ☐ |
| Security & Access | Access control and safety monitoring. | ☐ |
| Predictive Maintenance | Early detection of issues and automated alerts. | ☐ |

**Banner:** "You can select multiple areas. Our AI will tailor the solution to your building and goals."

**Behaviour:**
- Step 4 decides what the BMS connects to. This step decides where SOVITECH actively controls and optimizes.
- Energy Management and Predictive Maintenance are capabilities that span several systems.

### Step 8: Review and generate

**Copy:**
- Eyebrow: "STEP 8 OF 8"
- H1: "Review and generate proposal"
- Sub: "Here's a summary of your inputs. Review the details and generate your personalized proposal."

**Summary cards:** a 4×2 grid. Every card except Proposal has an Edit link.

| Card | Shows (mockup values) |
|------|-----------------------|
| Project | Type: Renovation |
| Documents | Uploaded files: 12 files |
| Building | Type: Hotel · Size: 18,500 m² |
| Systems | Selected systems: HVAC, Lighting, Energy, Access Control |
| Operations | Building use: Mostly occupied · Operating hours: 24 / 7 |
| Goals | Primary goals: Reduce energy consumption, Improve guest comfort, Reduce operating costs |
| Automation | Automation areas: HVAC, Lighting |
| Proposal (no Edit) | "Ready to generate" and "We'll create a tailored solution based on your inputs." |

**Banner:** "Everything ready?" / "Click “Generate Proposal” to let our AI create a customized solution for your project."

**Actions:** Back, and "Generate Proposal" as the primary button.

**Behaviour:**
- Each Edit link jumps back to its step.
- Generate hands everything to the AI. Part 2 starts here.
- The mockup has no loading, error or incomplete-data state.
- The summary leaves out:
  - the project name and location,
  - the notes from steps 5 and 6,
  - detected systems that were excluded, such as Fire Safety,
  - unconfirmed step 3 items.
- "Building use" on the Operations card is really the occupancy answer.

**Proposed:**
- Rename "Building use" to "Occupancy".
- Move building type to the Operations card.
- Add the location to the Project card.
- Add a notes line to the Operations and Goals cards.

---

## 4. Data captured

This is the wizard's view of the data. Every engineering value in it, including the building facts, areas, counts and system detections, is stored with the value model in `docs/guardrails.md` section 2, not as a bare value. The value model holds fields, candidates, source, verification, units and evidence. The simpler provenance type below is kept only to show which wizard inputs exist.

```ts
// INVENTORY ONLY. Do not implement this interface. It lists the wizard's inputs.
// Implement facts, detections and suggestions as fields in the value model (docs/guardrails.md section 2):
// immutable candidates, units from the registry, confidence as high/medium/low, equipment as assets,
// and documents as DocumentRecord (docs/guardrails.md 2.3).
type Provenance = 'document' | 'user' | 'ai_inference' | 'calculated' | 'estimated' | 'reference';   // see docs/guardrails.md 2.1
type SystemId = 'hvac'|'lighting'|'energy'|'access_control'|'fire_safety'|'water'|'elevators'|'cctv';
type AutomationArea = 'hvac'|'lighting'|'energy_management'|'water_management'|'security_access'|'predictive_maintenance';

interface IntakeProject {
  id: string;
  currentStep: number;                       // 1-8, for resume
  completedSteps: number[];                  // drives stepper check marks
  updatedAt: string;

  // Step 1
  name: string;
  projectType: 'new_construction' | 'renovation' | 'existing_building' | 'bms_modernization';
  location: { countryCode: string; cityId: string; cityName: string; lat?: number; lng?: number };

  // Step 2
  documents: Array<{
    id: string; filename: string; format: 'pdf'|'dwg'|'ifc'|'rvt'|'xlsx'|'docx'|'jpg'|'png'|'zip';
    sizeBytes: number;                       // limit 500 MB (per file or total: unconfirmed)
    kind: DocumentRecord['kind']; stage: DocumentRecord['stage']; revision?: string;
    analysis: DocumentRecord['analysis'];     // queued | analysing | analysed | partly_analysed | stored_only | failed
  }>;

  // Step 3: an open list. The six summary facts use reserved keys:
  // totalArea (with basis), floor structure by level type, rooms (with qualifier), zones (with qualifier),
  // hvacAssets (calculated from the asset register), systemCount (calculated)
  buildingFacts: Array<{
    key: string; label: string;
    value: number | string; unit?: 'm2';
    provenance: Provenance;
    sources: Array<{ documentId: string; locator?: string }>;  // "Page 4", sheet "A-101"
    sourceLabel?: string;                    // display text: "Floor Plans A-101 → A-129", "MEP Drawings"
    confidence?: 'high' | 'medium' | 'low';
    needsConfirmation: boolean; flagReason?: string;
    confirmedByUser: boolean;
    extractedValue?: number | string;        // kept when the user corrects the value
  }>;
  floors?: Array<{ id: string; label: string; level: number }>;   // feeds the floor selector
  buildingModel?: { assetUrl: string; kind: 'ifc' | 'generated' | 'illustrative' };
  // viewer mode (3D/2D/Wireframe) and selected floor are transient UI state

  // Step 4
  systems: Array<{ id: SystemId; detected: boolean; included: boolean; sources?: Array<{ documentId: string }> }>;

  // Step 5
  operations: {
    buildingType: 'hotel'|'office'|'retail'|'hospital'|'residential'|'other';
    buildingTypeOther?: string;
    occupancy: 'mostly_occupied'|'mixed'|'seasonal'|'low';
    schedule: '24_7'|'business_hours'|'extended_hours'|'seasonal';
    note?: string;                           // max 500
  };

  // Step 6
  goals: {
    selected: Array<'reduce_energy'|'lower_carbon'|'occupant_comfort'|'operational_efficiency'
                   |'compliance'|'asset_lifespan'|'reduce_operating_costs'|'other'>;
    otherText?: string;                      // or reuse note when 'other' is selected
    note?: string;                           // max 500
  };

  // Step 7
  automationAreas: AutomationArea[];

  // Step 8
  proposal: {
    status: 'incomplete' | 'ready' | 'generating' | 'generated' | 'failed';   // "Ready to generate"
    generatedAt?: string;
    inputsHash?: string;                     // detect edits after generation
  };
}

// Proposed: which step 4 systems each automation area depends on (see Q4)
const automationRequires: Record<AutomationArea, SystemId[] | 'any'> = {
  hvac: ['hvac'], lighting: ['lighting'], energy_management: ['energy'],
  water_management: ['water'], security_access: ['access_control', 'cctv'],
  predictive_maintenance: 'any',
};
```

---

## 5. How the steps feed each other

| From | To | What flows |
|------|----|-----------|
| 1 Project (name) | Header, every step | The name appears in the header on all 8 screens. |
| 1 Project (type) | 2-5, 8 | Probably decides which document types and questions apply. It is summarised on step 8. |
| 1 Project (location) | AI | Climate, energy prices and local regulation. It does not appear on step 8. |
| 2 Documents | 3, 4, 8 | Extraction produces the building facts and the system detection. The file count appears on step 8. |
| 1 name or 2 documents | 5 | Building type is probably inferred from these. Step 3 does not display a building type. |
| 3 Building ↔ 4 Systems | | The step 3 system count should agree with the step 4 detection. |
| 3 Building | 8 | Area appears on step 8. |
| 4 Systems | 7, 8 | Automation areas depend on included systems. Step 8 shows automation as a subset of systems. |
| 5 Operations | 6 | Goal labels and defaults adapt to the building type ("guest comfort" for a hotel). |
| 5, 6, 7 | 8, then AI | The operating profile, intent and automation scope for proposal generation. |

**AI touchpoints:**
1. Extraction and classification of uploads (step 2).
2. Building facts with provenance and review flags (step 3).
3. System detection (step 4).
4. Probable prefills on steps 5-7. These show preselections with no provenance badge.
5. Proposal generation (step 8).

---

## 6. Where the mockups disagree

### 6.1 Data contradictions (demo content)

- **Project type.** Step 1 selects **New construction**, but the step 8 summary says **Renovation**.
- **Area.** Step 3 says **34,500 m²**, but step 8 says **18,500 m²**.
- **Documents.** Step 2 shows no uploads, but step 8 says **12 files**. Step 3 cites four specific sources.
- **System count.** Step 3 says **Systems 12**, but step 4 lists 8 systems, of which 5 are Detected.
- **Mislabelled summary.**
  - Step 8 files "Type: Hotel" under the Building card, though it is captured on step 5 (Operations).
  - The Operations card labels the occupancy answer "Building use".
- **Systems vs automation.**
  - Step 7 offers Water Management, but Water was not included on step 4.
  - Security & Access covers Access Control, which is included. Its "safety monitoring" wording reaches into Fire Safety, which is excluded.
  - Energy Management is left unchecked, although Energy was included on step 4 and "Reduce energy consumption" is a selected goal.
  - Fire Safety, Elevators and CCTV have no automation counterpart.
- **Redundant options.**
  - "Seasonal" answers both the occupancy question and the schedule question on step 5.
  - "Reduce energy consumption" promises "lower operational costs", which overlaps "Reduce operating costs".
  - "Extend asset lifespan … predictive insights" overlaps the Predictive Maintenance automation area.
  - **Proposed:**
    - Keep Seasonal on the schedule question only, and make occupancy a level: high, variable or low.
    - Drop "lower operational costs" from the energy goal.
- **Wrong weekday.** The header date reads "TUE, 17 SEP 2025", but that date was a Wednesday. The real app should render the live date.

### 6.2 Visual inconsistencies, with the proposed canonical choice

| Area | What varies | Proposed |
|------|-------------|----------|
| Accent hue | Mint green on steps 1-2 (`#03DDB7`) drifts to aqua on steps 6-8 (`#01F7E4`) | One token, `#01F2D9` |
| Step 1 chrome | No tagline, logo divider or title block. The date is proportional, not mono. The stepper is off-centre with smaller circles. "Next" instead of Continue. No Back and no footer divider. | Match the other steps: tagline, a mono date, "STEP 1 OF 8" with an H1, the standard stepper, and the standard footer with Continue |
| Selected card | The icon turns teal on steps 1 and 5 and stays white on 4, 6 and 7. On step 5 selection also swaps outline icons for filled glyphs, adds an inner and outer glow to pills, and moves the Hotel icon to the left of its label. Border brightness varies. | Keep the outline icon in white, with no glow and the icon above the label. Border is `border-selected` at 1.5px. |
| Radio | Bottom-centre on step 1, top-right on step 5 tiles, right-centre on step 5 pills. Three different selected looks. Unselected rings are dimmer than checkboxes, and step 5 pill radios have a black fill. | See the radio entry in 2.5 |
| Selected label colour | "Mostly occupied" turns teal. Other selected labels stay white. | Stays white |
| Unselected card fill | Slightly raised on steps 1, 2 and 4. Equal to the page on 6, 7 and 8. | Equal to `bg`. The border alone defines the card. |
| Unselected icon colour | Grey on the step 5 options. Blue-grey on the dropzone cloud. White elsewhere. | `text-primary` |
| Card title size and casing | 14px on step 1, 15.5 on step 6, 17 on steps 4 and 7. Title Case on steps 4 and 7, sentence case on 1, 5 and 6. | 17px, sentence case, keeping acronyms such as HVAC, CCTV and BMS |
| Stepper | Size, pitch and vertical position shift per screen. Step 2 draws larger circles. Completed connectors are grey on step 2. On step 3 only the segment into the current step is teal. Teal spreads further back on steps 4-8. Lines stop short of the rings on steps 1-2. | 32px circles, 120px pitch, a gradient across the completed span, lines meeting the rings |
| Header rule | Missing on step 2. Full width on 1, 3 and 5. Two segments on 4, 6, 7 and 8. | 1px, fading out toward the centre |
| Eyebrow | Dimmer on step 3 | `text-tertiary` |
| H1 size | About 34px on most steps, 39 on step 2, 36 on step 3, 32 on step 5 | 34px |
| Subheading | Step 4's second line and step 3's body are smaller and dimmer | Two roles: subheading and instruction line (2.3) |
| Buttons | 174-219px wide across screens, radius 3-6 | 190×48, radius 6. Width grows with the label only when needed. |
| Footer divider | Flush with the button tops on step 5, 36px above on step 2, about 27px elsewhere, and absent on step 1 | 26px above |
| Card heights | Equal within each row, but row 1 and row 2 differ by about 11px on step 6, 8px on step 7 and 19px on step 8. Step 2's MEP tile is about 6px taller because its description wraps. | One height per grid. Clamp descriptions to 2 lines. |
| Info icon | Sky blue on step 4, cyan on steps 7-8 | `info` token |
| Document badge | Two shades on step 3 | `badge-document` (azure) |
| Quotes and apostrophes | Curly on steps 2, 3 and the step 8 banner. Straight on steps 4 and 8. | Typographic (’ “ ”) throughout |
| Icon glitches | Renovation arrows. Access Control and Elevators look alike. The Energy Management plug prongs. The Building summary icon. Project and Documents share an icon. Blob artefacts on the completed Documents circle on step 3. | Replace each with its clean Lucide or Tabler equivalent, and draw stepper states from the component |

---

## 7. Open questions that change the build

1. **Documents optional?** If the owner has no documents, what do steps 3 and 4 show? Is there a manual-entry fallback for building facts?
2. **Confirmation flow (step 3).**
   - Which items get flagged, and why?
   - Where does the owner correct a value? Settled: an Edit action on each row.
   - The guardrails settle whether they block: they never do. They move to open items on step 8.
3. **3D model (step 3).**
   - Is it built from uploaded IFC or RVT files, from 2D plans, or is it a generic illustrative model?
   - Does 2D mode need per-floor plans for all 37 levels?
   - This is the largest effort driver in part 1.
4. **Systems vs Automation.**
   - Should step 7 offer only the areas backed by systems included on step 4, plus the cross-cutting capabilities?
   - If a system is unchecked on step 4 after step 7, is the dependent area cleared, disabled, or kept with a warning?
5. **Project type branching.**
   - How does each type change steps 2-5? For New construction, existing-BMS documents and utility bills don't exist yet, and step 5 describes planned use rather than current use.
   - The types overlap: BMS modernization implies an existing building. Should this stay one single choice, or split into building status and scope?
6. **Fire Safety default.** Settled by guardrails section 5 (step 4) and rule 11. Life-safety systems are never preselected. Fire Safety stays opt-in and monitoring only, and its fire interface points stay in scope either way.
7. **Floors notation.**
   - Does "28 + GF + 8" mean 28 upper floors, the ground floor and 8 basement levels?
   - The cited range A-101 → A-129 is 29 sheets, which covers only 28 + GF. The "+ 8" has no cited source.
8. **Prefill provenance on steps 5-7.** Settled by guardrail rule 3. Facts such as building type carry Likely or Possible with their evidence. Owner choices carry Suggested with a reason, and Continue accepts only visible suggestions.
9. **Navigation.**
   - Can the owner click completed steps in the stepper?
   - After an Edit on step 8, does the owner return directly to the review?
10. **Saving.** Is there autosave with resume later? What does the hamburger menu contain during the wizard?
11. **Follow-up inputs.**
    - Should Business hours, Extended hours and Seasonal ask for hours or months?
    - Should "Other" on steps 5 and 6 open a text field?
12. **After Generate.**
    - What loading state shows, and where does the owner land?
    - Does "change this later" mean after the proposal exists? If so, which edits trigger regeneration?
13. **Validation.**
    - Which inputs are required, and does Continue disable or show inline errors?
    - **Settled by guardrail rule 7:** only name, type, city and country are required, and they have no Skip. Continue stays enabled and shows an inline error on each empty required field. Everything else has "Skip for now". Steps 4, 6 and 7 may be left empty. Missing items appear on step 8 as open items, and outputs that need them show ranges or "Not available yet".
14. **Re-extraction.**
    - If documents change after steps 3-4, do user-confirmed or corrected facts and user deselections survive?
    - **Settled by guardrails section 2.3 and rule 4:** declared revisions supersede old candidates, but never silently replace a confirmed or verified value. User corrections are kept and never overwritten. A later document that disagrees with an owner answer raises a conflict on the review step, and no value is active until it is resolved.
15. **Parsing scope.** Which accepted formats are parsed in v1, and which are only stored? RVT and DWG need dedicated converters.
