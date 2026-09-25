# SOVITECH company knowledge

This folder holds what the SOVITECH App project knows about the company behind it: brand, voice, business, services, sectors, references, the SAUTER product list and the company website itself. It was imported on 2026-09-23/24 from the company website repository. It is background for designing and writing the app. It is not a runtime data source.

## Where it comes from

| | |
|---|---|
| Repository | `github.com/Gaidenic13/sovitech-website` (private) |
| `main` | commit `e080614`, 2026-08-11, "Mobile-first product detail layout". This is the base of everything here. |
| `redesign-2026` | an unmerged branch, commits `d2d15d2` (2026-08-24) and `af81353` (2026-08-27). It is **not** SOVITECH's current position and will not be merged (owner decision, 2026-09-24). Its material is kept for reference only, labelled "redesign-2026 branch" in separate sections, files or folders. |
| Not copied | `node_modules`, the lockfile, generic shadcn UI primitives, placeholders, the v0 template leftovers, and the branch's `docs/prompt-content-launch.md` (a prompt for an AI coding session, summarised as data in [website/history.md](website/history.md)). By the owner's decision, the Google Drive content folder that prompt names and the fingerprint motif hosted on Vercel were not imported. |

Every copied file is byte-identical to its source. Every document cites the source path of what it says. The product images (`products/images/`, `products/images-unreferenced/`, 64 MB) are kept out of git; [products/tools/README.md](products/tools/README.md) says how to restore them.

## Map

| Folder | What is in it | Start with |
|---|---|---|
| [`brand/`](brand/README.md) | Brand guidelines, the website's design system (verbatim), colour and type tokens (CSS and JSON), the real logos with previews, partner and protocol logos, photography and illustrations sorted by use, voice and messaging, and how the brand compares with the app mockups | [brand/README.md](brand/README.md), [brand/app-alignment.md](brand/app-alignment.md) |
| [`business/`](business/README.md) | Company profile and legal identity, legal pages, audiences, services, pricing, sectors, 25 reference projects, 2 case studies, 12 articles with covers and diagrams, the ROI calculators and the branch's sourced ROI research, lead funnels, and a RO-EN glossary | [business/README.md](business/README.md) |
| [`products/`](products/README.md) | The SAUTER product list SOVITECH shows on its site: 178 products in 8 categories and 53 families, as JSON and Markdown, 162 product images, 50 more images of products with no entry, and the scripts that regenerate it | [products/README.md](products/README.md), [products/catalogue.md](products/catalogue.md) |
| [`website/`](website/README.md) | The website's routes and navigation, tech stack, commit history, and verbatim source snapshots of `main` (`source/`) and of the branch's changes (`source-redesign-2026/`) | [website/README.md](website/README.md) |

## How the app may use this

`docs/guardrails.md` wins over everything here.

- **Brand: this is the app's identity.** The app is a SOVITECH brand tool and carries the company brand in its dark variant: the real logo, the palette with mint as the single accent on dark, Inter, 1px/2px radii, no shadows, the brand voice. The approved screenshots in `design/reference/` stay the brief for layout, structure, flows and content. The proposed app tokens, and the extension colours that still need the owner's OK, are in [brand/app-alignment.md](brand/app-alignment.md).
- **Voice, names and structure: yes.** Use the terminology, service and sector names, and the audience language as design input.
- **Figures: no.** Savings percentages, paybacks, ROI, prices, statistics, case-study numbers, product specs and service lives are website marketing copy. They often contradict each other. They are not verified engineering data and not an approved reference dataset (guardrails rule 1, 2.1 and section 10; test case G1-12). No figure from this folder may become an app value without the approver adding a versioned reference dataset.
- **Product identifiers: not yet.** The app may name SAUTER products only from an approved, versioned catalogue (rule 1, test G1-3). This list is a candidate starting point for one, not the dataset itself. See "Use in the app" in [products/README.md](products/README.md).
- **Copy: with care.** The website uses words the app may not use, such as "garantat", "ofertă", "compliant" and "will save". See section 7 of [brand/voice-and-messaging.md](brand/voice-and-messaging.md) and the reserved-term check in [business/articles/README.md](business/articles/README.md).
- **People and clients.** Names, phones and testimonials are published website content. Several testimonial names look like placeholders and contradict each other. Reference photos show third-party buildings and signage, and their source and licence are unknown. Do not reuse any of them in the app without SOVITECH's confirmation.

## Things worth knowing first

- **The mockups show a real SOVITECH reference.** The website presents Radisson Blu Bucharest as a delivered retrofit case study, and the mockups use that hotel's name. The app's demo will not (owner decision, 2026-09-24): it is a fictional hotel, working name "Demo Hotel Bucharest". Recommended, not decided: the demo fixture should not reuse the real hotel's published facts. See the last section of [business/case-studies/radisson-blu-bucuresti.md](business/case-studies/radisson-blu-bucuresti.md).
- **The brand replaces the mockups' look.** The website brand is dark green `#0D2E2B`, accent green `#1F6B4A` and mint `#C8E6C9`, with Inter and 1-2px corners. The mockups use teal-navy with an aqua `#01F2D9` accent and a wordmark that is not the company logo. The app follows the brand.
- **Legal identity** (stated only on the unmerged branch): SOVITECH CONTROL SRL, CUI 38500895, J40/19288/2017, founded 2017, office@sovitech.ro. Confirm them against the trade register (ONRC) before any use. See section 11 of [business/company-profile.md](business/company-profile.md).
- **Nothing on the website sends a lead.** The quote, contact and guide forms send nothing, on `main` and on the branch.

## Decisions (2026-09-24, by the product owner)

| Question | Decision |
|---|---|
| Brand for the app | "treat the app as our brand tool": the app carries the SOVITECH company brand, dark variant. It is not a separate sub-brand. |
| Keep the real hotel's name for the demo? | No. Working name "Demo Hotel Bucharest". |
| Import the Google Drive content folder the branch prompt names? | No |
| Download the fingerprint motif from Vercel? | No |
| Product images in git? | Keep them out |
| Is `redesign-2026` the current position, to be merged? | No |

## Refreshing

When the website's `main` changes, re-clone the repository, re-copy the snapshot (see [website/source/README.md](website/source/README.md)), restore the product images and regenerate the product list with [products/tools/](products/tools/README.md), and update the notes that cite changed files. The branch will not be merged; `website/source-redesign-2026/` can be deleted whenever it stops being useful as reference.

## Build tools must ignore this folder

`website/source/` and `website/source-redesign-2026/` contain `.ts`, `.tsx`, `.css` and `package.json` files from another project. The app's TypeScript, lint, test and workspace configuration must exclude `company/**`. So must the reserved-term and render checks, because this folder quotes website copy on purpose.
