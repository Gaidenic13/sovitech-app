# Build readiness: skills, tech and connectors

**As of:** 2026-09-23, updated 2026-09-24.
**Method:** three research agents (skills, tech, connectors) verified their picks against current web sources. A fourth agent acting as a sceptical tech lead then removed contradictions and over-engineering, and cut the list down to the **first build slice**. That slice is part 1 intake, extraction, the value model, and a proposal estimate made of points and a CAPEX range.

**Rule:** `docs/guardrails.md` takes precedence. Nothing here is approved yet. The decisions for the product owner are in section 5.

---

## 1. Current state

- **Skills, subagents, hooks and settings.** When this was written (2026-09-23), none existed. Since then the project has a `.claude/` folder with the `frontend-design` skill, and a local git repository on `main` (no remote). There are still no subagents or hooks.
- **User-level skills:** only `gepeto` and `pinokio`, which are app launchers unrelated to this project.
- **What exists:** `CLAUDE.md`, `docs/guardrails.md` v1.5, `design/onboarding-spec.md`, `design/dashboards-spec.md`, `prompts/sovitech-ai-system.md`, and the reference screenshots.

---

## 2. Skills

**Principles.**
- A project skill is Claude Code's working knowledge while it builds. It is never a runtime source of values.
- Rule 1 and section 2.1 of the guardrails say catalogue entries, glossary terms, standards and prices come only from versioned reference datasets.
- Skills link to rule numbers instead of copying rule text.
- Every `SKILL.md` carries "Checked against: docs/guardrails.md vX".
- Each skill is written in the same change as the code or scripts it drives.
- Each skill is authored and trigger-tested with `skill-creator`.

### Now

| Skill | What it does | Covered today? |
|-------|--------------|----------------|
| **guardrail-check**, plus a read-only `guardrail-auditor` subagent (Read, Grep, Glob, Bash; no Edit or Write) | Runs the CLAUDE.md definition of done (see below). | Partly. `code-review` and `security-review` are generic and don't know the 14 rules. |
| **synthetic-fixtures** | Generates PDF and XLSX fixtures with fixed seeds, recorded in `fixtures/manifest.json` with hash, generator, case ids and ground truth. It uses only fictitious vendors and people. CI fails on any fixture file without a generator. | No |
| **ro-building-docs** | Romanian document conventions for extraction work (see below). Every entry is marked draft until a SOVITECH engineer reviews it. | No |

What **guardrail-check** runs:
- the index check, the reserved-term check, the version-sync check, the registry and loosening snapshot, and the guardrail tests;
- the evals, when `prompts/`, the model id or the output schema changed;
- a grep for the risky code patterns: `?? 0`, `|| 0`, UI importing domain code, `engineer_verified` written in seeds, and update or delete on candidates.

It reports done-items 1-5, the rules touched and the case ids. A loosening diff means it stops and writes a proposal instead.

What **ro-building-docs** covers:
- area bases: Sc, Scd, Su and heated area, including the caveat that urban-planning Scd can leave out parking and technical basements;
- the regim de înălțime grammar;
- number formats: `34.500`, `1,5`, the ambiguous `1.500`, cca./aprox., ml/buc/mc;
- document stages and title-block (cartuș) fields;
- the diacritics ş/ș and ţ/ț.

**Hook, which is configuration rather than a skill and needs approval.** A PreToolUse reminder on edits to `docs/guardrails.md`, `CLAUDE.md`, `prompts/**`, the registry files and `tests/guardrails/**`. It shows: "possible loosening, propose a diff, do not apply".

**Existing skills to use as they are:**
- **`claude-api`**, before any Anthropic code. Take the model id from the live docs, not the skill's cached table, and keep server-side fallbacks off.
- **`skill-creator`**.
- **`security-review` and `code-review`**, alongside guardrail-check and never instead of it.
- **`engineering:testing-strategy`** once, for the property tests.
- **`engineering:architecture`**, for the decision records.

### Later

| Skill | When |
|-------|------|
| value-model recipes (add a field, formula, event or asset type) | After the first derive function and registry exist |
| ai-extraction (evidence verifier, prompt-change procedure, retries, hidden text) | After the first extraction pass works |
| value-ui (badge lookup, rounding, render allowlist, chart gaps) | After the Value, Price and Badge components exist |
| reference-data plus the BMS point-estimation method | When SOVITECH delivers the first datasets. It covers method only; every number comes from SOVITECH engineers. |
| financial-model | After dashboards Q6 and proposal 7.2.12 |
| design-batch, the process for turning screenshots into a spec and a guardrail check | When the next batch of screens arrives |
| propose-guardrail-change | After an approver is named |
| run-app | After the first screen exists |
| bim-geometry / live-telemetry | After onboarding Q3 and dashboards Q5 / after proposals 7.2.1, 7.2.2, 7.2.11 and 7.2.16 |

**Skip for this project:** the Figma write skills (a View seat, and screenshots are the design source), nimble, brightdata, bigdata, market-researcher, gepeto and pinokio, and the product-management process skills.

---

## 3. Tech

### Now: first slice

1. **Repository.** Git plus a private GitLab project in the `sovitech` group. A pnpm TypeScript monorepo with these parts:
   - `packages/domain`;
   - `packages/view-model`;
   - `apps/api`, which includes the worker;
   - `apps/web`;
   - `services/extractor`, in Python;
   - `tests/guardrails`, `evals/guardrails` and `fixtures/`.
2. **Harness first, in GitLab CI:**
   - Vitest and fast-check;
   - the index check;
   - one reserved-term list and its checker, matching whole words and ignoring case and diacritics;
   - the version-sync check;
   - registry validation with the loosening snapshot;
   - ESLint bans on `?? 0`, `|| 0` and `Number()` on engineering values;
   - dependency-cruiser limiting `apps/web` to the view-model package.
3. **Domain core:**
   - the value-model types;
   - one pure derive function covering state precedence, the active candidate, provisional and stale;
   - the conflict test over the whole spread of values;
   - a closed unit registry with a dimension check;
   - a Romanian/English number parser that returns both readings when a number is ambiguous;
   - a field registry for the slice-1 fields only.
4. **Postgres**, in local Docker and in CI with Testcontainers, using Kysely and hand-written SQL migrations:
   - `REVOKE UPDATE/DELETE` plus raising triggers on candidates and events;
   - row-level security on `project_id`;
   - one guarded function that is the only writer of `engineer_verified` (G10-3);
   - UUIDv7 generated in app code.
5. **Python extractor:**
   - **PDF:** `pypdfium2` reads the native text layer with anchor ids, per-character boxes and hidden-text flags (G14-2). Avoid PyMuPDF, which is AGPL.
   - **XLSX:** `openpyxl` reads both the cached value and the number format, with sheet/cell locators.
   - **Coverage:** recorded by code.
   - **Everything else:** DOCX, images, scans, DWG, IFC and RVT are stored with a "Not analysed" status line (rule 12).
   - **OCR:** none in slice 1.
6. **AI boundary:**
   - the Anthropic TypeScript SDK, using synthetic data only until the processor route is decided;
   - the model id pinned from the live docs (`claude-opus-5-5` today) and gated by evals;
   - structured outputs, with the extracted text layer sent in delimited data blocks;
   - no Citations (combining them with structured outputs returns a 400 error), no Files API, no fallbacks;
   - the evidence verifier running the 5 checks, plus an output validator covering prose tokens, reserved terms, life-safety verbs, allowed sources and direct-count-only inferences;
   - the model id stored with every candidate.
7. **Eval runner.** An in-repo TypeScript runner that reuses the production validator. It runs 5 samples and needs 5 of 5 to pass. No promptfoo.
8. **Calculation engine:**
   - versioned formulas with `unknownPolicy`;
   - a hash manifest that fails when a published version changes;
   - decimal.js and interval ranges;
   - points by type from the SOVITECH templates, always Estimated;
   - a CAPEX range at stage 1 or 2;
   - OPEX, payback, NPV and IRR showing "Not available yet".
9. **Formatting module and the Value, Price and Badge components,** with the Playwright render test (G2-1).
10. **Minimal wizard screens for steps 1-8.**
    - React 19 with Tailwind v4 tokens.
    - Step 3 is a value list with Edit actions and no 3D.
    - The default is a Vite single-page app with Fastify. Next.js is the alternative, to match the website repo.
    - Slice-1 auth is a roles table, the database guard and a development login.

### Later

- **Hosting,** chosen after the AI-processor route:
  - Google Cloud europe-west, if Google Cloud's EU endpoint is chosen;
  - AWS eu-central-1 or Supabase EU plus a container host, if Anthropic's own API with zero data retention is chosen.

  Before the first real upload, three things are needed: malware scanning, an erasure job and log scrubbing.
- **OCR:** compare Tesseract `ron` with Azure Document Intelligence and Google Document AI on synthetic Romanian scans. Textract does not support Romanian.
- **DOCX:** needs a locator extension, which is an approval.
- **DWG:** ODA File Converter, which needs a commercial membership, or LibreDWG, then ezdxf.
- **IFC:** IfcOpenShell (LGPL) and web-ifc (MPL-2.0).
- **RVT:** Autodesk APS in EMEA, or an IFC export from the owner's designer.
- **3D/2D viewer and dashboard libraries,** after onboarding Q3, dashboards Q1 and Q5, and proposal 7.2.8.
- **Proposal PDF export,** via Playwright `page.pdf()` from a print route.
- **OPEX and financials,** after dashboards Q6 and proposal 7.2.12.
- **SAUTER catalogue,** with generation and lifecycle fields.
- **Live telemetry,** read-only, after the operations proposals are approved.

---

## 4. Connectors and data sources

### Now

| Item | Why | Action |
|------|-----|--------|
| **GitLab**, already connected | Repo, CI and work items | Create the private project in the `sovitech` group, reusing the existing pipeline (SAST, secret detection). Add the guardrail jobs and a check that fails on document files outside `fixtures/`. **Needs your OK.** |
| **Anthropic Console** workspace and API key | Development and evals on synthetic data | Ask for zero data retention before any real document. Anthropic's own inference geography is US or global only. |
| **SOVITECH engineering datasets** | The critical path. No connector replaces them. `company/products/` now holds the 178-product SAUTER list from the company website, as a possible starting point for the catalogue dataset. It is marketing data (99 spec values read "NU ESTE SPECIFICAT", and modu524/525 appear only as images), and it becomes reference data only through the approver (G1-12). | Ask SOVITECH engineers for: point templates per asset type and configuration; EUR/point or per-asset cost ranges (with basis, date, VAT and currency); function set v1; the asset taxonomy with lifeSafety flags; and a review of the glossary. |
| **SIRUTA and ISO 3166** | City id and country code on step 1 | SIRUTA licence to confirm |
| **BNR rate feed** `https://curs.bnr.ro/nbrfxrates.xml` | EUR/RON (G10-4) | Only needed now if slice 1 shows RON. The old `www.bnr.ro` URL now redirects. |

**Keep signed out for now:** GitHub, Linear, Jira/Atlassian, Slack, Notion, Asana, Monday, ClickUp, Datadog, PagerDuty, and the market-research connectors.

**Never use Google Drive or Gmail to bring owner documents into the repo or into Claude Code's context** (rule 13).

### Later

- **Cloud or database MCP**, read-only, on the development project only, once hosting is chosen.
- **Sentry in its EU region,** with no personal data and excerpts stripped, once something is deployed.
- **Email** through Amazon SES in the EU. Resend stores data in the US.
- **Context7,** if library-doc lookups become frequent.
- **A Figma Full seat** on the Professional plan, only if the design moves into Figma. Code Connect needs the Organization plan.
- **Autodesk APS** in EMEA, for RVT and DWG files.
- **SAUTER partner channel,** to ask for a machine-readable catalogue and for Vision Center's third-party interfaces.
- **Oracle OPERA** through OHIP, only if operations scope is approved and after a GDPR review.

---

## 5. Decisions for the product owner

1. **Name the approver** in guardrails section 10, presumably you, and approve v1.5 as the baseline. Until then, no reference dataset can be approved.
2. **Choose the AI processor route.** It is needed before the first real owner document, not before coding, and it also decides hosting.
   - (a) Anthropic's own API with zero data retention. Inference is US or global.
   - (b) Google Cloud's `eu` endpoint. It supports structured outputs, but has no Files API, Batch or fallbacks.

   Bedrock EU is ruled out because it does not support structured outputs for Opus 5 or 5.5.
3. **Slice-1 scope:** points plus a CAPEX range only. OPEX, payback, NPV and IRR show "Not available yet".
4. **Parsing scope in v1:** native-text PDF and XLSX only. Everything else is stored as "Not analysed". Owner direction (2026-09-24): the app is built "based on data from the onboarding flow, based on IFC files from BIM softwares", so IFC is inside the product's parsing scope. What that settles and what stays open is in `docs/ifc-input.md` 6.3. Note that under guardrails v1.5 no value read from an IFC file can pass rule 1's locator check until proposals ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10 are approved. Revising this decision, and whether IFC enters slice 1, is still your call.
5. **Index-check convention:** let unbuilt cases exist as pending stubs reported as "no automated check yet", so CI is green from the first commit.
6. **Request the SOVITECH datasets now** (section 4), and say whether the prices are confidential and must stay out of the repo.
7. **Demo building:** its floor structure and area bases (dashboards Q4). Its name is decided (2026-09-24): a fictional hotel, working name "Demo Hotel Bucharest", not the real hotel the mockups show.
8. **Frontend:** a Vite single-page app with Fastify, or Next.js to match the website repo.
9. **Standard citation:** "EN ISO 52120-1:2021" in the guardrails and the prompt mixes two editions. CEN published EN ISO 52120-1:2022, which adopts ISO 52120-1:2021.
10. **Slice-1 display currency:** EUR only, or RON, which needs the BNR feed now.
11. **Permissions:** may Claude create the GitLab project and add the loosening hook?
12. **Keep `company/` out of the build.** When the workspace, TypeScript, lint and test configs are created, exclude `company/**`. It holds website source files (`.ts`, `.tsx`, `package.json`) from another project, and it quotes website copy that the reserved-term check would flag. Decided 2026-09-24: product images (`company/products/images*/`, 64 MB) stay out of git and are git-ignored. The rest of `company/` is about 16 MB; committing it was not a separate owner decision.

---

## 6. Facts verified during this research

| Fact | Source |
|------|--------|
| Citations and structured outputs cannot be combined; the API returns a 400 error. The schemas do not support min/max, length or pattern constraints. | platform.claude.com docs: citations, structured outputs |
| Anthropic's first-party inference geography is US or global. Zero data retention is possible on Opus 5.5. The Files API and Batch fall outside zero data retention. | platform.claude.com docs: data residency, API and data retention |
| Bedrock does not support structured outputs for Opus 5 or 5.5. | AWS Bedrock model cards |
| Google Cloud supports structured outputs, and its `eu` multi-region serves Claude 4.7 and later. | platform.claude.com, Claude on Vertex AI; Google Cloud docs |
| No SAUTER "modu520" was found. SAUTER lists modu524/525 (EY-modulo 5) and modu660/680 (modulo 6). A new generation of modulo 6 and ecos 5 was announced on 30 June 2026. | sauter-controls.com |
| The BNR feed is `curs.bnr.ro/nbrfxrates.xml`. It showed EUR 5.2788 on 23 Sep 2026. | fetched |
| promptfoo is Apache-2.0 but was acquired by OpenAI in March 2026. | web |

**Still unverified:**
- the SAUTER Vision Center integration interfaces;
- Autodesk APS pricing;
- the SIRUTA licence;
- the text of Legea 238/2024 and the thresholds of Legea 372/2005;
- the Legea 350/2001 Scd exclusions;
- the Romanian glossary entries, which need engineer review.
