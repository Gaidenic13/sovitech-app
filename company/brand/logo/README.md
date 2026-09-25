# SOVITECH logo files

The SOVITECH Control logo and building mark, copied unchanged from the company website repository, with PNG previews and notes on where each file goes. Source: `public/` in github.com/Gaidenic13/sovitech-website, commit e0806142735dbdd53b913af30102f9227b380475 (2026-08-11).

## Files

| File | What it is | Use it on | Source |
|------|-----------|-----------|--------|
| `logo.svg` | Full wordmark "SOVITECH" with "CONTROL" in a bar underneath. "SOVI" and the bar are near-black `#231F20`. "TECH" and the fingerprint are green `#00674C`. The "O" is a fingerprint with a skyscraper inside it. | White and light surfaces | `public/logo.svg` |
| `logo-white.svg` | The same artwork in white `#FFFFFF`. The letters of "CONTROL" are cut out of the white bar, so the background shows through. | Dark surfaces, for example the footer `#07201C` | `public/logo-white.svg` |
| `building.svg` | The skyscraper on its own, in white at 81.5% opacity (`opacity=".815"`). It looks like the building inside the logo's "O". | Small dark chips. The website uses it as the headquarters pin on the contact-page map. | `public/building.svg`, used in `app/contact/page.tsx` |
| `logo-preview.png` | 988×299 PNG of `logo.svg` on white `#FFFFFF`. Made for this folder; it is not a website asset. | Quick look only | Rendered from `logo.svg` |
| `logo-white-preview.png` | 988×299 PNG of `logo-white.svg` on `#07201C`. Made for this folder; it is not a website asset. | Quick look only | Rendered from `logo-white.svg` |

The previews were rendered with macOS Quick Look (`qlmanage`) and cropped with Python. Use the SVGs for real work.

## Proportions and sizes

Source: `DESIGN-SYSTEM.md` section 9, `components/header.tsx`, `components/footer.tsx`, `app/contact/page.tsx`.

- **Ratio.** Both logo files have a 4:1 box: `viewBox="0 0 52.917 13.229"`, with an intrinsic size of 200×50. `DESIGN-SYSTEM.md` states "both 4:1 ratio".
- **Artwork inside the box.** Measured on the previews, the letters fill the full width of the box and about 77% of its height. There is about 12% empty space above and 11% below. The visible artwork is about 5.1:1. So at 32px box height, the letters are about 25px tall.
- **Sizes in use.** The source states no minimum size. It says to render the logo at `h-8/h-9 w-auto shrink-0`:
  - header: `logo.svg` at `h-8` (32px tall, about 128px wide);
  - footer: `logo-white.svg` at `h-9` (36px tall, about 144px wide);
  - contact map pin: `building.svg` at `h-9` (36px tall).
- **Keep the proportions.** Set a fixed height, `width: auto` and no shrinking. The footer code says "no CSS filter hacks": use the white file on dark surfaces instead of recolouring the dark one.
- **Alt text.** The website uses `alt="SOVITECH Control"` for both logo files. The building mark is decorative (`alt=""`, `aria-hidden="true"`).

## Colours in the logo files

The logo files use their own colours, not the website tokens:

| In the logo | Hex | Nearest website token |
|-------------|-----|-----------------------|
| "TECH" and the fingerprint | `#00674C` | `--sovitech-green` `#1F6B4A` |
| "SOVI" and the "CONTROL" bar | `#231F20` | `--sovitech-dark` `#0D2E2B` |

The SVGs carry Vecta nano markup and page-sized clip paths, which suggests they were converted from another file. Nothing in the repository says whether the logo colours or the token colours are the master. Do not recolour the logo to the tokens without asking the brand owner.

## Skipped files

| File | Why it was not copied |
|------|-----------------------|
| `public/icon.svg` | The "v0" mark of the v0.app generator, in black and white. It is not a SOVITECH mark. `app/layout.tsx` still uses it as the favicon, next to `generator: "v0.app"`. |
| `public/icon-light-32x32.png`, `public/icon-dark-32x32.png` | The same "v0" mark as 32px favicons. Not SOVITECH. |
| `public/apple-icon.png` | The same "v0" mark at 180×180. Not SOVITECH. |
| `public/sovitech-logo.svg` | A placeholder: the words "SOVITECH" and "CONTROL" set in Arial, in teal `#1A7F7F` and `#4A9999`. It is not the real logo and nothing in the site references it. |
| `public/placeholder-logo.svg` | A generic "Acme Inc." placeholder with a triangle mark. Nothing references it. |
| `public/placeholder-logo.png` | A generic dotted-triangle placeholder. Nothing references it. |

**Consequence.** The website has no SOVITECH favicon or app icon. The app will need one. A square mark could be cut from the fingerprint "O" or from `building.svg`, but that is a brand decision, and nothing in the repository settles it.

## Fingerprint motif: not downloaded, by decision

The website's heroes show a decorative "fingerprint" SVG at 3% opacity. That file is not in the website repository. It is hosted on Vercel blob storage, and [`../imagery/README.md`](../imagery/README.md) records its address and the pages that use it.

Owner decision, 2026-09-24: asked whether to download it, the owner answered "no". So it was not downloaded, and this folder does not hold it. Do not fetch it for the app.

This applies to the separate decorative motif only. The fingerprint "O" inside the logo is part of `logo.svg` and `logo-white.svg`, which are in this folder.

## Unmerged branch `redesign-2026`: no logo or favicon change

Source: branch `origin/redesign-2026`, commits `d2d15d2` (2026-08-24) and `af81353` (2026-08-27), compared with `main` at `e080614`. The branch is not merged. Owner decision, 2026-09-24: it is not SOVITECH's current position and will not be merged. This section is for reference only.

- **Files.** `public/logo.svg`, `public/logo-white.svg`, `public/building.svg`, `public/icon.svg`, the two 32px icons and `public/apple-icon.png` are byte-identical on the branch. `app/layout.tsx` is unchanged, so the favicon is still the v0.app mark. The unused placeholder files are still there.
- **Use.** The header still uses `logo.svg` and the footer `logo-white.svg`. The contact map still uses `building.svg`.
- **Covers.** The branch's article covers (`public/coperti/`, made in Canva) place the existing logo in the bottom-left corner: the dark and green artwork on light grounds, and the white artwork on dark grounds. They introduce no new mark.
- **Author monogram.** The article frame (`components/article-layout.tsx`) shows "SC" in mint `#C8E6C9` on a round `#07201C` disc, next to "Sovitech Control". It is typeset text in the component, not a logo file. Nothing says it is meant as a brand mark.
- **Partner logos.** The branch adds third-party logos in `public/parteneri/`. They are not SOVITECH marks, so they are in [`../partner-logos/`](../partner-logos/), not here.

So nothing was copied into this folder from the branch. The app still needs a favicon and app icon (see "Consequence" above).

## Related

- Brand guidelines: [`../README.md`](../README.md)
- Website design system, verbatim: [`../design-system.md`](../design-system.md)
- How the app mockups' wordmark differs from this logo: [`../app-alignment.md`](../app-alignment.md)
