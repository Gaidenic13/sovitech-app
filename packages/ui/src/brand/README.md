# Brand assets

The SOVITECH logo files the app uses, copied byte for byte from the company brand folder (prompt 3 section 6, "Brand assets"; brand decision of 2026-09-24, prompt 3 section 5.1). Do not edit, recolour or re-export them: copy them again from the source and update the hashes below.

| File | Source | SHA-256 | Use |
|---|---|---|---|
| `logo-white.svg` | `company/brand/logo/logo-white.svg` | `548759ec1729313290d92792404ff579c58c5fc33008067a3ed86bc7b0bfeff6` | On the dark UI: the app header at `h-8`, with automatic width and no CSS filter |
| `logo.svg` | `company/brand/logo/logo.svg` | `24b4f3d9750e08b98b4c3fe07ed57fbed1b2fcaf7ffb4cbeccbb28a4a0390818` | On light surfaces only, such as an export on white. Not used by a screen yet |

- **Alt text.** "SOVITECH Control", as on the company website (brand alignment note, "Shape, type, motion and logo"). The alt text is exported with the files from `index.ts`, so every screen uses the same one.
- **How the app reads them.** `index.ts` exports `brandLogo` (the two file URLs and the alt text), and `packages/ui/src/index.ts` re-exports it, so `apps/web` imports the logo through `@sovitech/ui` and never by a path into this folder (prompt 3 section 6, "Boundaries"). Vite turns each import into a URL at build time.
- **Colours.** The files carry the logo's own colours, not the app tokens. The lint bans do not read `.svg` files for that reason (`tools/eslint-rules/README.md`, "Scope").
- **Checked on 2026-09-25:** no script, no embedded image, no external link and no text element in either file.
- **Not copied:** `building.svg` and the PNG previews. No favicon or app icon exists (brand alignment decision 5 is open), so the page keeps an empty icon.

The source folder, `company/`, is background input only and stays out of every build and scan (build-readiness decision 12). These two files are the one exception prompt 3 section 6 names; nothing imports from `company/`.
