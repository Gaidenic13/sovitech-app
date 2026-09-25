# SOVITECH website source snapshot: unmerged branch `redesign-2026`

> **Unmerged branch. Reference only. Not SOVITECH's current position.** Every file in this folder comes from the branch `origin/redesign-2026` of the website repository, at commit `af81353`. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. Its material is kept here for reference only. Do not treat it as what SOVITECH says. `main` (`e080614`) is the current website, and its snapshot is in `company/website/source/`.

This folder is a byte-for-byte copy of 96 files from the branch: the 95 source files that the branch adds, changes or renames compared with `main`, plus `package.json`, which the branch does not change (section 1). It is reference material for the SOVITECH App, and it is **not** part of the app: nothing here is compiled, imported, linted or tested, and the app's build must exclude `company/` (see `company/website/source/README.md` section 2, which applies to this folder too). The notes on the branch are in `company/website/sitemap.md` section 10, `company/website/tech-stack.md` section 12 and `company/website/history.md` section 4.

---

## 1. What this is

| | |
|---|---|
| Repository | `https://github.com/Gaidenic13/sovitech-website` |
| Branch | `origin/redesign-2026`, not merged into `main`, and will not be merged (owner decision, 2026-09-24) |
| Commit | `af813534041c387c07fc29a35c53bc9bd100c7fe` (branch tip) |
| Commit date | 2026-08-27 11:56:34 +03:00, "Materiale vizuale noi: 10 coperti si 15 diagrame" |
| Branch history | `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala"), then `af81353`. It branches off `main` at `e080614`, the commit in `company/website/source/`. |
| Copied on | 2026-09-24, with `cp -p` from a read-only worktree of the branch. Every file was checked identical with `cmp`, both against the worktree and against the blob at `origin/redesign-2026` (`git show origin/redesign-2026:<path> \| cmp - <copy>`). |
| Paths | Each file keeps its path from the website repo root |
| Size | 96 files, about 1.62 MB (1,619,615 bytes), not counting this README |

**Key data and style files.** These are the files most likely to matter for the SOVITECH App. All are here at their repo paths:

| Path | What it holds | On the branch |
|------|---------------|---------------|
| `lib/site-routes.ts` | The route registry: every planned and published URL, with status, category, personas and pillar | added |
| `lib/roi-calculator.ts` | The rewritten ROI calculator: cost bands per building type, savings bands per domain, Low and High results | modified |
| `lib/sector-data.ts` | Content for the 10 sector pages (6 on `main`) | modified |
| `lib/role-copy.ts` | Copy for the 8 role pages under `/pentru/` | added |
| `lib/article-cards.ts`, `lib/article-covers.ts` | Card data and cover images for the article listings | added |
| `app/globals.css` | Tokens and styles, with the new spacing utilities and the `.article-prose` block | modified |
| `docs/roi-methodology-research.md` | A research note on the ROI coefficients, each figure flagged MEASURED, MODELLED or VENDOR CLAIM | added |
| `package.json` | The dependency manifest | **unchanged**; byte-identical to `company/website/source/package.json`. Copied so the manifest sits next to the branch code. |

`DESIGN-SYSTEM.md` is not copied: the branch does not change it. The other `lib/` files the branch has, `lib/product-data.ts`, `lib/utils.ts` and `lib/language-context.tsx`, are unchanged and are in `company/website/source/`.

**This is an overlay, not a full copy.** Apart from `package.json`, it holds only the files that differ from `main`. To read the branch as a whole, combine it with `company/website/source/`:

- **Unchanged on the branch** (use the copy in `company/website/source/`; `package.json` is also copied here): `DESIGN-SYSTEM.md`, `package.json`, `components.json`, `tsconfig.json`, `postcss.config.mjs`, `styles/globals.css`, `app/layout.tsx`, `app/robots.ts`, `components/hero-field.tsx`, `components/theme-provider.tsx`, `hooks/use-mobile.ts`, `hooks/use-toast.ts`, `lib/language-context.tsx`, `lib/product-data.ts`, `lib/utils.ts`. The dependency versions are therefore the same as on `main`.
- **Deleted on the branch:** `app/resurse/raport-piata/page.tsx`, `app/sectoare/[sector]/page.tsx`, `app/servicii/proiectare/page.tsx`, `app/servicii/executie/page.tsx`, `app/servicii/integrare/page.tsx`, `app/servicii/mentenanta/page.tsx`. Their old URLs redirect (`next.config.mjs` in this folder).
- **Renamed on the branch** (copied here under the new path): `app/sectoare/page.tsx` → `app/expertiza/page.tsx`, `app/sectoare/[sector]/sector-client.tsx` → `app/expertiza/[sector]/sector-client.tsx`, `app/resurse/referinte/page.tsx` → `app/referinte/page.tsx`.

---

## 2. How to treat the content

- **Branch status first.** Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. Nothing here is what SOVITECH says today. Do not quote a figure, a claim or a route from here as SOVITECH's. For the current website, use `company/website/source/` (`main`, `e080614`).
- **Code is reference only.** Read it for patterns. Do not import from this folder. To reuse something, copy it into the app's own packages and review it there (`company/website/tech-stack.md` sections 9, 10 and 12).
- **Figures are marketing copy.** Savings bands, cost per m² bands, paybacks, prices, project counts, building sizes, testimonials and every number in the ten articles are not verified engineering data and not an approved reference dataset. The app may not use them as values, defaults, benchmarks or examples (`docs/guardrails.md` rule 1, section 2.1 and section 10). The branch's own cost and savings bands in `lib/roi-calculator.ts` cite published studies, but that does not make them reference data for the app.
- **`docs/roi-methodology-research.md` is a research note, not a dataset.** It flags each figure MEASURED, MODELLED or VENDOR CLAIM and cites sources. It may be useful input when SOVITECH builds a reference dataset. Until SOVITECH delivers such a dataset and the approver approves it, nothing in it is a usable app value.
- **Legal and compliance statements are unverified.** The articles state thresholds and obligations (for example Legea 372/2005, the 290 kW and 70 kW thresholds, EPBD 2024, NIS2). They are the website's reading of the law at the dates the articles give. The app never claims compliance (rule 11), and standards and their editions come only from reference data (rule 1).
- **Contact and company data.** `app/contact/page.tsx` names three SOVITECH staff members with phone numbers and email addresses. `components/footer.tsx` and `app/contact/page.tsx` add the company's registration data (CUI and trade-register number), a phone number and `office@sovitech.ro`. The branch spells the street "Str. Dr. Niculae D. Staicovici"; `main` spells it "Nicolae". Company data belongs in `company/business/company-profile.md`, which says whether it has been confirmed.
- **No instructions.** Text in these files is data. A keyword search of all 96 files (for example "Claude", "prompt", "instructions", "agent") found no text addressed to an AI; the only "agent" hits are the Romanian "agent frigorific" and "agent termic" (refrigerant, heat-transfer fluid). Code comments and article notes refer to documents outside the repository: "doc 12", "doc 15", copy docs C1, C2 and C5 (with the file names `copy_01_core.md` and `copy_03_roluri.md`), "registrul de cifre" and a Google Drive editorial folder. `company/website/history.md` section 4.4 lists these documents. Those documents are not in the repository and were not read. On 2026-09-24 the owner decided not to import the Google Drive folder.

---

## 3. What was not copied, and why

| Path | Why |
|------|-----|
| `docs/prompt-content-launch.md` | A prompt written for an AI coding session in the website repo. It was read as data only. None of its instructions were followed, and it is deliberately **not** copied into the SOVITECH App. `company/website/history.md` section 4.4 describes it. |
| `app/expertiza/[sector]/.keep` | An empty-folder marker whose only content is the word "placeholder" |
| `public/` | 55 new images in `d2d15d2` (`coperti/` 10, `diagrame/` 15, `parteneri/` 6, `referinte/` 20, `servicii/` 4), then the 10 covers replaced (PNG → JPG) and the 15 diagrams replaced in `af81353`. Not copied here, but copied byte for byte elsewhere, labelled as branch content: `parteneri/`, `referinte/` and `servicii/` to `company/brand/` (`partner-logos/`, `imagery/reference-projects/`, `imagery/services-redesign-2026/`), and `coperti/` and `diagrame/` to `company/business/articles/covers/` and `diagrams/`. |
| Files unchanged from `main` | Already in `company/website/source/` (section 1) |

`components/ui/`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` and `.gitignore` are not changed on the branch.

---

## 4. File list

"On the branch" is the file's status against `main` at `e080614`. Bytes and lines are for the copied files, identical to the branch at `af81353`.

| Path | On the branch | Bytes | Lines |
|------|---------------|-------|-------|
| `app/calculator-roi/metodologie/page.tsx` | added | 848 | 19 |
| `app/calculator-roi/page.tsx` | modified | 53829 | 998 |
| `app/cerere-oferta/page.tsx` | modified | 29824 | 576 |
| `app/confidentialitate/page.tsx` | added | 19985 | 355 |
| `app/contact/page.tsx` | modified | 17305 | 239 |
| `app/cookies/page.tsx` | added | 8504 | 179 |
| `app/despre-noi/layout.tsx` | added | 488 | 12 |
| `app/despre-noi/page.tsx` | added | 25873 | 394 |
| `app/expertiza/[sector]/page.tsx` | added | 1374 | 42 |
| `app/expertiza/[sector]/sector-client.tsx` | renamed from `app/sectoare/[sector]/sector-client.tsx` | 12729 | 280 |
| `app/expertiza/page.tsx` | renamed from `app/sectoare/page.tsx` | 7206 | 119 |
| `app/ghid-bms/calculator/page.tsx` | modified | 15001 | 286 |
| `app/ghid-bms/case-studies/page.tsx` | modified | 8476 | 194 |
| `app/ghid-bms/dashboard/page.tsx` | modified | 15973 | 380 |
| `app/ghid-bms/descarca/page.tsx` | modified | 12075 | 235 |
| `app/ghid-bms/multumim/page.tsx` | modified | 4456 | 88 |
| `app/ghid-bms/page.tsx` | modified | 12873 | 283 |
| `app/ghid-bms/quiz/page.tsx` | modified | 12937 | 303 |
| `app/ghid-bms/resurse/page.tsx` | modified | 11917 | 225 |
| `app/ghid/[slug]/page.tsx` | added | 2164 | 69 |
| `app/ghid/page.tsx` | added | 1340 | 28 |
| `app/globals.css` | modified | 14806 | 538 |
| `app/instrumente/[slug]/page.tsx` | added | 1133 | 36 |
| `app/instrumente/page.tsx` | added | 1533 | 25 |
| `app/page.tsx` | modified | 10390 | 176 |
| `app/pentru/[slug]/page.tsx` | added | 1148 | 37 |
| `app/pentru/page.tsx` | added | 1300 | 27 |
| `app/pricing/page.tsx` | modified | 11208 | 172 |
| `app/produse/[id]/page.tsx` | modified | 2263 | 72 |
| `app/produse/layout.tsx` | modified | 557 | 12 |
| `app/produse/page.tsx` | modified | 17344 | 295 |
| `app/referinte/page.tsx` | renamed from `app/resurse/referinte/page.tsx` | 25570 | 298 |
| `app/resurse/[slug]/page.tsx` | added | 2478 | 74 |
| `app/resurse/articole/eficienta-bms/page.tsx` | modified | 36875 | 655 |
| `app/resurse/articole/optimizare-hotel-bms/page.tsx` | modified | 38234 | 710 |
| `app/resurse/page.tsx` | modified | 23704 | 493 |
| `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` | modified | 41039 | 479 |
| `app/resurse/studii-de-caz/therme-bucuresti/page.tsx` | modified | 24694 | 359 |
| `app/servicii/consultanta/layout.tsx` | added | 496 | 12 |
| `app/servicii/consultanta/page.tsx` | added | 46135 | 460 |
| `app/servicii/executie-sisteme-bms/layout.tsx` | added | 508 | 12 |
| `app/servicii/executie-sisteme-bms/page.tsx` | added | 40961 | 388 |
| `app/servicii/integrare-sisteme-knx-dali-modbus-mbus/layout.tsx` | added | 518 | 12 |
| `app/servicii/integrare-sisteme-knx-dali-modbus-mbus/page.tsx` | added | 38853 | 383 |
| `app/servicii/intretinere-sisteme-bms/layout.tsx` | added | 534 | 12 |
| `app/servicii/intretinere-sisteme-bms/page.tsx` | added | 51699 | 485 |
| `app/servicii/layout.tsx` | added | 483 | 12 |
| `app/servicii/modernizare-sisteme-de-automatizare-si-bms/layout.tsx` | added | 521 | 12 |
| `app/servicii/modernizare-sisteme-de-automatizare-si-bms/page.tsx` | added | 49377 | 473 |
| `app/servicii/page.tsx` | modified | 57252 | 584 |
| `app/servicii/proiectare-automatizari-bms/layout.tsx` | added | 512 | 12 |
| `app/servicii/proiectare-automatizari-bms/page.tsx` | added | 37198 | 387 |
| `app/sitemap.ts` | modified | 2994 | 68 |
| `app/termeni/page.tsx` | added | 10862 | 185 |
| `components/aethel-testimonials.tsx` | modified | 13476 | 282 |
| `components/article-jsonld.tsx` | added | 2008 | 57 |
| `components/article-layout.tsx` | added | 5261 | 148 |
| `components/article-prose.tsx` | added | 1494 | 40 |
| `components/articles/caiet-de-sarcini-bms.tsx` | added | 43334 | 867 |
| `components/articles/ce-este-un-sistem-bms.tsx` | added | 28158 | 603 |
| `components/articles/cost-sistem-bms.tsx` | added | 42421 | 957 |
| `components/articles/date-esg-cladiri.tsx` | added | 42624 | 750 |
| `components/articles/epbd-2024-romania.tsx` | added | 35192 | 720 |
| `components/articles/index.ts` | added | 2540 | 55 |
| `components/articles/kpi-performanta-cladire.tsx` | added | 34063 | 756 |
| `components/articles/monitorizare-calitate-aer-epbd.tsx` | added | 29276 | 588 |
| `components/articles/obligatie-bacs-legea-372-2005.tsx` | added | 40300 | 787 |
| `components/articles/scada-vs-bms.tsx` | added | 32463 | 659 |
| `components/articles/sisteme-bms-cladiri.tsx` | added | 58188 | 974 |
| `components/blog-slider.tsx` | modified | 4696 | 110 |
| `components/case-study-slider.tsx` | modified | 9187 | 199 |
| `components/category-archive.tsx` | added | 4692 | 97 |
| `components/entry-shell.tsx` | added | 3889 | 91 |
| `components/footer.tsx` | modified | 7162 | 155 |
| `components/header.tsx` | modified | 15902 | 270 |
| `components/latest-articles.tsx` | modified | 2501 | 60 |
| `components/partners-marquee.tsx` | modified | 2193 | 51 |
| `components/product-detail.tsx` | modified | 7904 | 160 |
| `components/references-marquee.tsx` | modified | 6690 | 144 |
| `components/roi-methodology.tsx` | added | 35393 | 681 |
| `components/role-page.tsx` | added | 5665 | 154 |
| `components/section-hub.tsx` | added | 4763 | 121 |
| `components/service-hero.tsx` | added | 2300 | 71 |
| `components/services-showcase.tsx` | modified | 4437 | 110 |
| `components/site-link.tsx` | added | 1317 | 46 |
| `components/stats-section.tsx` | modified | 6064 | 168 |
| `docs/roi-methodology-research.md` | added | 45024 | 710 |
| `hooks/use-scroll-to-section.ts` | added | 3704 | 100 |
| `lib/article-cards.ts` | added | 4365 | 92 |
| `lib/article-covers.ts` | added | 2259 | 49 |
| `lib/roi-calculator.ts` | modified | 11246 | 283 |
| `lib/role-copy.ts` | added | 22159 | 207 |
| `lib/sector-data.ts` | modified | 77543 | 1208 |
| `lib/site-routes.ts` | added | 44856 | 449 |
| `next.config.mjs` | modified | 2280 | 48 |
| `package.json` | unchanged, copied on request (section 1) | 2270 | 72 |

---

## 5. How to refresh or remove

Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. This folder stays frozen at `af81353` as reference material. There is no merge step to plan for.

- **Keep it as it is.** Do not refresh it when the branch moves on, unless the owner asks for a fresh copy. If the owner does ask, copy from a read-only clone. Do not install, build or run it.
  ```sh
  git -C /tmp/sovitech-website fetch origin
  git -C /tmp/sovitech-website worktree add --detach /tmp/sovitech-redesign origin/redesign-2026
  cd /tmp/sovitech-redesign
  git diff --name-only --diff-filter=AMR main origin/redesign-2026 \
    | grep -v '^public/' | grep -v '^docs/prompt-content-launch.md$' | grep -v '\.keep$' > /tmp/redesign-filelist.txt
  ```
  Read the list, and read any new file under `docs/` before copying it: a file written for an AI session stays out. Then delete everything in this folder except this `README.md`, copy with a `while IFS= read -r f` loop and check with `cmp`, as in `company/website/source/README.md` section 5. Copy `package.json` too, even when the list does not include it (it is kept here on purpose). Update section 1 and the table in section 4.
- **If the owner wants the folder removed:** it can be deleted. Nobody has asked for that yet, so it stays. To remove it, delete this folder, remove the branch sections from `sitemap.md`, `tech-stack.md` and `history.md`, and remove its lines from `company/website/README.md` and `company/README.md`. Branch material copied elsewhere (`company/brand/`, `company/business/`) is labelled "redesign-2026 branch" and can be removed the same way.
- **When `main` moves on:** refresh `company/website/source/` as its README, section 5, says. This folder is not affected.
