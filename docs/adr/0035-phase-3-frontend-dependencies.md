# 0035. Phase 3 frontend dependencies: router, self-hosted Inter, icons, component tests

- **Status:** Accepted: default, reversible
- **Date:** 2026-09-30

## Context

- **Prompt 3 section 5.2, "Frontend"** (build-readiness decision 8; PRD D-32): a Vite single-page app with React 19, TypeScript and Tailwind v4 carrying the brand tokens (ADR 0002). Phase 3 builds the first screens: the wizard at `/projects/:projectId/steps/:step`, sign-in (UD-36) and the project list (UD-37), which need a client-side router.
- **Prompt 3 section 6, "Brand assets":** "Self-host Inter (SIL OFL), so the app makes no font requests to third parties. Icons: Lucide at stroke 1.5." The brand decision of 2026-09-24 (OD-1 to OD-4; prompt 3 5.1) sets Inter as the typeface.
- **Prompt 3 section 11:** zero axe violations, real inputs for card radios and checkboxes, keyboard paths; UI behaviour (no dialog for a late finding, G7-4; no Skip link on an answered question, G7-3) is tested at component level as well as end to end. Vitest ran only in Node until now.
- **The orchestrator's working rules for phase 3:** new packages only from npm, pinned exactly, MIT, BSD, Apache, ISC, MPL or OFL only, each in an ADR; fonts self-hosted.
- **The licence check** (`tools/checks/licences`, ADR 0009) fails AGPL and GPL and reports LGPL and MPL; OFL-1.1, MIT and ISC read as permissive, so its expectations need no change.
- **Node 22.17.1** is the pinned runtime (`.node-version`; the root `engines` field `>=22.12.0 <23`, `engineStrict`). pnpm 12's supply-chain policy refuses a version released within about a day (ADR 0001).

## Decision

1. **Router: `react-router` 7.18.4** (MIT; dependencies `cookie`, `set-cookie-parser`, both MIT) in `apps/web`, in its library ("data router") mode: `createBrowserRouter` and `RouterProvider` (`apps/web/src/routes.tsx`). Not 8.x: 8.4.0 requires Node 22.22 or later, above the pinned 22.17. Not TanStack Router: react-router's route table is plain data, which the render test's screen list is derived from (`APP_PATHS`).
2. **Inter: `@fontsource-variable/inter` 5.3.0** (OFL-1.1) in `apps/web`, imported once in `apps/web/src/main.tsx`. Vite bundles the `woff2` files into `dist/assets`, so the running app loads the font from its own origin and makes no request to a third party. The CSS family name is "Inter Variable"; the tokens file names it with the system fallback.
3. **Icons: `lucide-react` 1.48.0** (ISC) in `packages/ui` and `apps/web`, at stroke 1.5. Not 1.49.0, released the day before (pnpm's policy). Every icon renders at 32 px or less: the render test reads an inline SVG larger than 32 px with no text as pixels it cannot read (tests/e2e/render/contract.ts `ICON_MAX_PX`), so the mockups' 40 px card icons and 64 px dropzone icon render at 32 px (a difference from the screenshots, listed in the build log).
4. **Component tests: `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2 and `happy-dom` 20.14.5** (all MIT), root devDependencies. `vitest.config.ts` gains a third project, `components`, in happy-dom, for every `*.test.tsx` under `packages/*/src` and `apps/*/src`; the `unit` project keeps `*.test.ts` in Node. Guardrail case files stay in the `guardrails` project (config-integrity unchanged); a case that renders a component sets `// @vitest-environment happy-dom` in its own file. happy-dom rather than jsdom: jsdom 30 needs Node 22.22 or later.
5. **`zod` 4.6.5** (MIT, already in the workspace) becomes a dependency of `@sovitech/view-model`, whose browser side now holds the wizard contract's schemas (ADR 0036).
6. **Nothing else.** No state-management, form, data-fetching or UI-kit library: the contract's schemas and `fetch` cover the API, and `packages/ui` holds the components.

## Consequences

- The wizard's initial JavaScript grows by the router (about 20 KB gzipped), zod (about 15 KB) and the icons used (tree-shaken). The 300 KB gzipped budget (prompt 3 section 11; ADR 0041) is measured at the end of phase 3.
- happy-dom does not lay out or paint: component tests check structure, roles, inputs and the absence of dialogs; colour, contrast and layout are checked by axe and the screenshots comparison in the e2e run.
- `pnpm check`'s licence step lists the new packages; none is copyleft.

## How to reverse

- Router: replace `routes.tsx` with another router's table; the pages and the contract do not depend on react-router beyond `useParams`, `useNavigate` and `Link`.
- Inter: remove the import and the package; the tokens file's fallback stack applies (no third-party font request either way).
- Icons: swap `lucide-react` for inline SVG files of the same Lucide glyphs under `packages/ui/src/icons/` (ISC notice kept).
- Component tests: remove the `components` project and the three packages; the e2e suite still covers the same behaviour, more slowly.
