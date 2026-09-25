# Development prompts

Three prompts that take the SOVITECH App from approved screens to working software. Run them in order, each in a fresh Claude Code session opened in the project root. Each one reads what the previous one wrote.

| # | Prompt | What it writes | Run when |
|---|---|---|---|
| 1 | [01-user-stories-and-functions.md](01-user-stories-and-functions.md) | `docs/product/user-stories.md`, `docs/product/functions.md`, `docs/product/traceability.md` | Now |
| 2 | [02-prd.md](02-prd.md) | `docs/product/prd.md` | After prompt 1 |
| 3 | [03-build-interactive-app.md](03-build-interactive-app.md) | The code, tests, fixtures and CI; `docs/adr/`; `docs/build-log.md` | After you have reviewed the PRD and answered what it asks you to decide |

**How to run one.** Open Claude Code in `/Users/cristiangaidenic/Sovitech App`, then paste the prompt file's content, or say "run docs/dev-prompts/01-user-stories-and-functions.md". Prompt 3 spans many sessions: paste it again to resume, and it continues from `docs/build-log.md`.

## What the chain is built on

- **The approved screens:** `design/reference/` (8 onboarding, 22 dashboards) and their specs in `design/`.
- **The guardrails:** `docs/guardrails.md`, which wins over everything. The prompts were written against v1.5. A later MINOR version (new cases, examples, clarifications) lets them continue with a note. A MAJOR version (an approved change in meaning), an approver being named, or a change-log row that records an approved proposal makes them stop and ask first.
- **The owner's decisions of 2026-09-24:**
  - the brand tool decision (the app carries the SOVITECH brand, dark variant);
  - the fictional demo hotel;
  - the website branch is reference only;
  - product images stay out of git;
  - the IFC direction.
- **IFC input:** [`docs/ifc-input.md`](../ifc-input.md): tooling, what BIM exports contain, the mapping to the app model, the synthetic fixture, and what the guardrails do and do not yet allow (section 6).
- **Company knowledge:** `company/` (brand, business, products). It is used for context and brand, never as a source of values.

## One contract across the three prompts

- **Ids:**
  - epics `E-<CODE>`;
  - stories `US-<CODE>-<NN>`;
  - functions `F-<DOMAIN>-<NN>`;
  - PRD requirements `R-<NNN>` (three digits);
  - open decisions `D-<NN>`, which keep their source ids (onboarding Q, dashboards 8.x, build-readiness decision, proposal 7.2.x, ifc-input 6.2.x);
  - screen keys `OB-1` to `OB-8`, `DB-01` to `DB-22` and `UD-<NN>` for undesigned pages.
- **Statuses:**
  - From approved design;
  - Required by guardrails;
  - Owner decision 2026-09-24;
  - Depends on proposal … (not approved);
  - Blocked by open question …;
  - Out of scope: operations phase.

  A proposal is never written as a requirement.
- **Slices:** S1, S2, S3, Later. S1 stays "proposed" until you decide build-readiness decision 3.
- **IFC evidence:** the file hash, the schema recorded on the document, and the GlobalId, STEP ids and property path of the value, with the verbatim STEP text as excerpt. This locator is proposal ifc-input 6.2.1.

## What you need to know before prompt 3

- **IFC values wait for approvals.** Under guardrails v1.5, an IFC model can be stored, checked and shown, but no value read from it can pass rule 1's evidence check. The evidence model has no IFC locator yet.
  - Prompt 3 builds the IFC value path behind closed gates.
  - The gates open only when `docs/guardrails.md` carries the proposals with the approver named (the smallest set is ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10) and you have revised build-readiness decision 4 to put IFC in the v1 parsing scope.
  - That needs an approver to be named in guardrails section 10.
- **Costs wait for SOVITECH's datasets.** Points and CAPEX need SOVITECH's point templates and cost ranges. Until they exist, those outputs show "Not available yet". IFC does not remove this dependency.
- **Other decisions the build asks for:**
  - the frontend (Vite + Fastify or Next.js);
  - the AI processor route, before any real owner document;
  - the slice-1 scope;
  - the demo building's floor structure;
  - whether sessions may commit.

  Prompt 3 takes reversible defaults for technical choices, records them in `docs/adr/`, and stops to ask on anything that needs your approval.

## How these prompts were made

Each prompt was drafted against the shared contract. It was then test-run on a narrow slice: onboarding steps 2-3, dashboards 16-17 and IFC ingestion. It was critiqued against the guardrails, CLAUDE.md and current prompting guidance, then revised. A final check confirmed that the three prompts agree with each other and with `docs/ifc-input.md`. The test-run outputs were scratch files and are not in the repo.
