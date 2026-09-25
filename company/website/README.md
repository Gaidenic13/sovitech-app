# SOVITECH website: index

This folder records what the SOVITECH company website is and how it is built, taken from its repository `Gaidenic13/sovitech-website`. It is reference material for the SOVITECH App, not app code: the app's build must exclude `company/`.

Two versions of the website are recorded, kept apart:
- **`main`** at `e080614` (2026-08-11): the repository's default branch, and the current website (owner decision, 2026-09-24).
- **`redesign-2026`** at `af81353` (2026-08-27): an unmerged branch. **It is not SOVITECH's current position and will not be merged** (owner decision, 2026-09-24). It is kept for reference only. Everything about it is labelled and kept in separate sections or folders.

Website figures, prices, savings, statistics and product data are marketing copy, not verified engineering data or approved reference data. The app may not use them as values (`docs/guardrails.md` rule 1, section 2.1, section 10).

| Path | What it holds |
|------|---------------|
| [`sitemap.md`](sitemap.md) | Every route on `main` with its title, purpose, sections and inbound links, the header and footer, SEO metadata, language handling and broken links; section 10 lists every route on the `redesign-2026` branch against `main`. |
| [`tech-stack.md`](tech-stack.md) | Framework and library versions, styling, the shadcn setup, the bilingual pattern, build configuration, the two calculators and what the app can and cannot reuse; section 12 covers the branch's dependency, configuration and code changes. |
| [`history.md`](history.md) | Every commit on `main` with what it changed, figures that changed between versions, and (section 4) both branch commits by area, plus the external content documents the branch refers to. |
| [`source/`](source/README.md) | A byte-for-byte copy of 62 key source files from `main` at `e080614`, with a README on provenance, exclusion from builds and how to refresh it. |
| [`source-redesign-2026/`](source-redesign-2026/README.md) | A byte-for-byte copy of the 95 source files the unmerged branch adds, changes or renames, plus `package.json`, at `af81353`, kept for reference only; it is an overlay on `source/`, and its README says how to remove it if the owner wants. |

Nothing in the website repository was run, built or installed to write these files. They were read as text and with `git` read commands.
