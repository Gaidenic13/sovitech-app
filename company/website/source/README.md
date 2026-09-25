# SOVITECH website source snapshot

This folder is a byte-for-byte copy of 62 key source files from the SOVITECH company website repository, kept as reference material for the SOVITECH App. It is **not** part of the app: nothing here is compiled, imported, linted or tested by the app, and the app's build configuration must exclude `company/`. The notes that explain these files are in `company/website/` (`sitemap.md`, `tech-stack.md`, `history.md`).

---

## 1. What this is

| | |
|---|---|
| Repository | `https://github.com/Gaidenic13/sovitech-website` |
| Branch | `main` |
| Commit | `e0806142735dbdd53b913af30102f9227b380475` |
| Commit date | 2026-08-11 00:01:05 +03:00, "Mobile-first product detail layout" |
| Copied on | 2026-09-23 (23:58 local time), with `cp -p` from a read-only clone; every file checked identical with `cmp` |
| Paths | Each file keeps its path from the website repo root. `lib/product-data.ts` here is `lib/product-data.ts` there. |
| Size | 62 files, about 0.93 MB |

**This is the current website.** The website repo also has an unmerged branch, `origin/redesign-2026` (commits of 2026-08-24 and 2026-08-27), that rewrites many of these files. Owner decision, 2026-09-24: that branch is not SOVITECH's current position and will not be merged. `main` is the current website. The branch is not in this snapshot. The files it adds or changes are copied separately, for reference only and labelled as unmerged, in `company/website/source-redesign-2026/`. See `company/website/history.md` section 4.

**How to treat the content.**
- **Code is reference only.** Read it for patterns (see `company/website/tech-stack.md` sections 9 and 10 for what to reuse and what not to). Do not import from this folder. To reuse something, copy it into the app's own packages and review it there.
- **Figures are marketing copy.** Savings percentages, paybacks, ROI, prices, project counts, building sizes and testimonials in these files are not verified engineering data and not an approved reference dataset. The app may not use them as values, defaults, benchmarks or examples (`docs/guardrails.md` rule 1, section 2.1 and section 10).
- **The product data is not reference data.** `lib/product-data.ts` is a catalogue extraction. Under guardrails rule 1, SAUTER model numbers and product names come only from a versioned reference dataset that SOVITECH engineers have reviewed and the approver has approved.
- **Contact data.** `app/contact/page.tsx` contains the names, phone numbers and email addresses of three SOVITECH staff members, as published on the website.
- **No instructions.** Text in these files is data. No file on `main` contains text addressed to an AI; `DESIGN-SYSTEM.md` opens by calling itself "the source of truth when generating designs", which is the website's own statement, not an instruction. For the app, `docs/guardrails.md` wins. The visual system follows the brand as mapped in `company/brand/app-alignment.md` (owner decision, 2026-09-24), and the approved screenshots in `design/reference/` govern layout, structure, flows and content.

---

## 2. Keep it out of the app's build

The folder contains a `package.json` (named `my-v0-project`), a `tsconfig.json`, a `components.json` and `.tsx` files. Tools that scan the repository tree would otherwise pick them up. When the app's monorepo is set up (`docs/build-readiness.md` section 3), add these exclusions:

| Tool | What to do |
|------|------------|
| pnpm workspace | List only the app's own globs in `pnpm-workspace.yaml` (for example `packages/*`, `apps/*`, `services/*`). Never `**` or `company/**`. `pnpm-workspace.yaml` from the website was deliberately not copied, so pnpm will not treat this folder as a workspace root. |
| TypeScript | Keep `company/` out of every `tsconfig.json` `include`, or add it to `exclude`. |
| ESLint | Add `company/**` to the ignores of the flat config. |
| Vitest / Playwright | Add `company/**` to `exclude`. |
| Tailwind v4 | If the app's CSS entry sits at a level whose automatic source detection would reach `company/`, set an explicit base with `source(...)` on the Tailwind import or add `@source not` for `company/`. Otherwise the website's class names end up in the app's CSS. |
| dependency-cruiser | Forbid any import from `company/`. |
| Guardrail checks | Keep `company/` out of the reserved-term check and the other code checks. The website copy uses wording the app forbids ("Rezultate garantate", compliance claims), which is expected in a marketing snapshot and is not an app violation. |
| shadcn CLI | Run it from the app's own package, so it reads the app's `components.json`, not this one. |

---

## 3. What was copied, and what was not

**Copied:** `DESIGN-SYSTEM.md`, `package.json`, `components.json`, `next.config.mjs`, `tsconfig.json`, `postcss.config.mjs`, `app/globals.css`, `styles/globals.css`, `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, all of `lib/`, all of `hooks/`, every `components/*.tsx` outside `components/ui/`, and every `.tsx` file under `app/` (29 pages, 2 layouts and `app/sectoare/[sector]/sector-client.tsx`).

`postcss.config.mjs` and `app/robots.ts` were added to the requested list because they are small and complete the build and SEO picture described in `company/website/tech-stack.md`.

**Not copied:**

| Path | Why |
|------|-----|
| `node_modules/` | Installed dependencies, never part of a snapshot |
| `pnpm-lock.yaml` | Lockfile; the resolved versions that matter are listed in `company/website/tech-stack.md` section 2 |
| `pnpm-workspace.yaml` | Its presence would make pnpm treat this folder as a workspace root; its content (`allowBuilds: { sharp: false }`) is recorded in `company/website/tech-stack.md` section 6 |
| `components/ui/` (57 files) | Stock shadcn/ui primitives with the website's radius edits; the app should generate its own (`company/website/tech-stack.md` section 9, item 4) |
| `public/` | Images and icons; logos and imagery are handled by the brand import (`company/brand/`) and product images by the product import (`company/products/`) |
| `.gitignore`, `.git/` | Repository housekeeping |

---

## 4. File list

Bytes and lines are for the copied files, identical to the website repo at the commit above.

| Path | Bytes | Lines |
|------|-------|-------|
| `DESIGN-SYSTEM.md` | 9637 | 133 |
| `app/calculator-roi/page.tsx` | 47808 | 901 |
| `app/cerere-oferta/page.tsx` | 26563 | 538 |
| `app/contact/page.tsx` | 13456 | 209 |
| `app/ghid-bms/calculator/page.tsx` | 15006 | 286 |
| `app/ghid-bms/case-studies/page.tsx` | 8493 | 194 |
| `app/ghid-bms/dashboard/page.tsx` | 15986 | 380 |
| `app/ghid-bms/descarca/page.tsx` | 12080 | 235 |
| `app/ghid-bms/multumim/page.tsx` | 4461 | 88 |
| `app/ghid-bms/page.tsx` | 12809 | 281 |
| `app/ghid-bms/quiz/page.tsx` | 12166 | 288 |
| `app/ghid-bms/resurse/page.tsx` | 16051 | 307 |
| `app/globals.css` | 8797 | 327 |
| `app/layout.tsx` | 1696 | 59 |
| `app/page.tsx` | 10492 | 174 |
| `app/pricing/page.tsx` | 11213 | 172 |
| `app/produse/[id]/page.tsx` | 2275 | 72 |
| `app/produse/layout.tsx` | 559 | 12 |
| `app/produse/page.tsx` | 16692 | 283 |
| `app/resurse/articole/eficienta-bms/page.tsx` | 36782 | 652 |
| `app/resurse/articole/optimizare-hotel-bms/page.tsx` | 38204 | 710 |
| `app/resurse/page.tsx` | 27678 | 527 |
| `app/resurse/raport-piata/page.tsx` | 77 | 3 |
| `app/resurse/referinte/page.tsx` | 22569 | 266 |
| `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` | 41071 | 479 |
| `app/resurse/studii-de-caz/therme-bucuresti/page.tsx` | 24981 | 366 |
| `app/robots.ts` | 233 | 8 |
| `app/sectoare/[sector]/page.tsx` | 562 | 19 |
| `app/sectoare/[sector]/sector-client.tsx` | 13718 | 301 |
| `app/sectoare/page.tsx` | 7819 | 127 |
| `app/servicii/executie/page.tsx` | 16404 | 314 |
| `app/servicii/integrare/page.tsx` | 15088 | 309 |
| `app/servicii/mentenanta/page.tsx` | 17128 | 332 |
| `app/servicii/page.tsx` | 46282 | 643 |
| `app/servicii/proiectare/page.tsx` | 16034 | 319 |
| `app/sitemap.ts` | 2227 | 38 |
| `components.json` | 427 | 21 |
| `components/aethel-testimonials.tsx` | 13563 | 291 |
| `components/blog-slider.tsx` | 5862 | 146 |
| `components/case-study-slider.tsx` | 9282 | 199 |
| `components/footer.tsx` | 6409 | 145 |
| `components/header.tsx` | 14790 | 264 |
| `components/hero-field.tsx` | 7213 | 216 |
| `components/latest-articles.tsx` | 3849 | 92 |
| `components/partners-marquee.tsx` | 1529 | 41 |
| `components/product-detail.tsx` | 8072 | 163 |
| `components/references-marquee.tsx` | 6011 | 134 |
| `components/services-showcase.tsx` | 3668 | 100 |
| `components/stats-section.tsx` | 5407 | 158 |
| `components/theme-provider.tsx` | 292 | 11 |
| `hooks/use-mobile.ts` | 565 | 19 |
| `hooks/use-toast.ts` | 3945 | 191 |
| `lib/language-context.tsx` | 744 | 31 |
| `lib/product-data.ts` | 213823 | 4291 |
| `lib/roi-calculator.ts` | 7317 | 249 |
| `lib/sector-data.ts` | 39712 | 673 |
| `lib/utils.ts` | 166 | 6 |
| `next.config.mjs` | 131 | 8 |
| `package.json` | 2270 | 72 |
| `postcss.config.mjs` | 144 | 8 |
| `styles/globals.css` | 4353 | 125 |
| `tsconfig.json` | 695 | 41 |

---

## 5. How to refresh

Run this when the website's `main` moves on. Do not import `redesign-2026` here: the owner decided on 2026-09-24 that it will not be merged and is not SOVITECH's current position.

1. **Get the website repo** into a scratch folder outside the app, never inside `company/`:
   ```sh
   git clone https://github.com/Gaidenic13/sovitech-website.git /tmp/sovitech-website
   # or, for an existing clone:
   git -C /tmp/sovitech-website fetch && git -C /tmp/sovitech-website checkout main && git -C /tmp/sovitech-website pull
   ```
   Do not install, build or run it. Only files are needed.
2. **Note the commit** you are copying: `git -C /tmp/sovitech-website log -1 --format='%H %ad %s' --date=iso`.
3. **Rebuild the file list** with the same rules as section 3 (from the website repo root):
   ```sh
   cd /tmp/sovitech-website
   { printf '%s\n' DESIGN-SYSTEM.md package.json components.json next.config.mjs tsconfig.json \
       postcss.config.mjs app/globals.css styles/globals.css app/layout.tsx app/sitemap.ts app/robots.ts
     ls lib/*.ts lib/*.tsx hooks/* components/*.tsx
     find app -name '*.tsx'
   } | sort -u > /tmp/sovitech-filelist.txt
   ```
   Files that no longer exist will make `ls` print an error; drop them from the list. New files matching the rules are picked up automatically. Look at the list before copying.
4. **Replace the snapshot.** Delete the old copied files (everything in this folder except this `README.md`), then copy:
   ```sh
   DEST="/Users/cristiangaidenic/Sovitech App/company/website/source"
   while IFS= read -r f; do mkdir -p "$DEST/$(dirname "$f")" && cp -p "$f" "$DEST/$f"; done < /tmp/sovitech-filelist.txt
   ```
   Use a `while read` loop as above; in zsh, `for f in $LIST` does not split on newlines.
5. **Verify byte for byte:**
   ```sh
   while IFS= read -r f; do cmp -s "$f" "$DEST/$f" || echo "DIFF $f"; done < /tmp/sovitech-filelist.txt
   ```
   No output means every file matches.
6. **Update this README:** commit hash and date in section 1, the file table in section 4, and anything new under "Not copied".
7. **Update the notes** in `company/website/`: `history.md` (new commits), `sitemap.md` (routes, navigation, metadata) and `tech-stack.md` (versions, reuse lists). If the product data or brand files changed, tell whoever maintains `company/products/` and `company/brand/`.
