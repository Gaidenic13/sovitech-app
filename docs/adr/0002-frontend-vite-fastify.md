# 0002. Frontend: a Vite single-page app with a Fastify API

- **Status:** Accepted: default, reversible
- **Date:** 2026-09-25

## Context

Build-readiness decision 8 asks the owner to choose between a Vite single-page app with Fastify and Next.js, to match the website repo (`docs/build-readiness.md` section 5, decision 8; section 3 "Now", item 10). Prompt 3 section 5.2, row "Frontend", sets the default: a Vite single-page app (React 19, TypeScript, Tailwind v4 carrying the brand tokens) with a Fastify API.

The PRD's row is **D-32**. It is open: "Recommended, not decided: the Vite single-page app with Fastify". Its "Until decided" line says prompt 3 may take the build-readiness default as a reversible choice recorded in an ADR, and that the viewer stays a client-side component either way (`docs/ifc-input.md` 6.3.1 item 6). The owner decided no D row as of 2026-09-25.

## Decision

**apps/web.**
- Vite 8.3.0, React 19.3.0, TypeScript, `@vitejs/plugin-react`.
- Tailwind CSS 4.3.3 through `@tailwindcss/vite`. Automatic source detection is off (`@import 'tailwindcss' source(none)`), and the sources are listed: `apps/web/src`, `packages/ui/src`, `packages/viewer/src`. Nothing under `company/` is scanned (prompt 3 section 6).
- The default colour palette and every shadow scale are switched off in `@theme` (`--color-*`, `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*`, `--text-shadow-*`), so no colour or shadow enters through a class name. Colour utilities map only to CSS custom properties from `packages/ui/src/tokens.css`, the one file where colour literals are allowed. Phase 0 puts only the Brand rows the placeholder needs there; phase 3 writes the full "App theme".
- Ports: `vite` dev server 5173, `vite preview` 4173 (Playwright's web server). Both bind to 127.0.0.1 with a fixed port.
- `apps/web` depends only on `@sovitech/view-model` (its `./browser` entry), `@sovitech/ui` and `@sovitech/viewer`; dependency-cruiser enforces the boundary (prompt 3 section 6).
- Phase 0 serves one placeholder page with no digits and no engineering value.

**apps/api.**
- Fastify 5.12.5, run with tsx. `buildServer()` in `src/server.ts` is importable by tests; `src/index.ts` listens on 127.0.0.1, port 3000 unless `SOVITECH_API_PORT` sets another.
- Phase 0 has one route, `GET /health`. Logging is off; when it is switched on, logs carry no document text (guardrails rule 13).

**Hosting.** Local only; no deployment (prompt 3 section 5.2, "Hosting").

## Consequences

- The browser receives display objects from the API; no candidate, event or bare engineering number reaches it (prompt 3 section 6).
- No website code is shared: `company/` stays out of the build under either choice (build-readiness decision 12).
- The 3D viewer is a client-side package (`packages/viewer`) under either framework.

## How to reverse

If the owner chooses Next.js under D-32:
1. Replace `apps/web` with a Next.js app that imports the same packages. `packages/ui`, `packages/viewer` and `@sovitech/view-model/browser` are plain React and TypeScript, so they move unchanged.
2. Keep `apps/api` as the Fastify API, or move its routes into Next.js route handlers; the domain, registry, engine, db and view-model server packages are framework-neutral.
3. Point the Playwright web server in `playwright.config.ts` at the new app's start command, and keep the Tailwind sources explicit.
4. Update this ADR's status to "Accepted: owner decision <date>".
