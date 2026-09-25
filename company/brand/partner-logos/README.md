# Partner and protocol logos (unmerged branch `redesign-2026`)

Six third-party logos: SAUTER and five building-automation protocols. **None of them is a SOVITECH mark.** They are copied byte for byte from the website repository's unmerged branch, so the rules for branch content apply. Owner decision, 2026-09-24: that branch is not SOVITECH's current position and will not be merged. These files are kept for reference only.

**Source.** github.com/Gaidenic13/sovitech-website, branch `origin/redesign-2026`, folder `public/parteneri/`. All six were added in commit `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala"). They are unchanged in `af81353` (2026-08-27). The branch is not merged into `main` (`e080614`), and it will not be merged (owner decision, 2026-09-24). Each copy was checked against the original with `cmp`.

**On `main`.** The partners band (`components/partners-marquee.tsx`) shows no logos. It shows the names as grey text in bordered cards: "SAUTER", "KNX", "DALI", "Modbus", "M-Bus", "BACnet" and "LonMark". A comment there calls them "Text placeholders for now".

## Files

Where each file came from is taken from the comment at the top of `components/partners-marquee.tsx` on the branch. It states that each mark was "downloaded from each owner's own domain … never from third-party logo aggregators". Nothing else in the repository records the download, its date or any permission. The pixel sizes in that comment match the files.

| File | What it is | Downloaded from (per the branch comment) | Size and format | Metadata in the file | Owner |
|------|-----------|-------------------------------------------|-----------------|----------------------|-------|
| `sauter.png` | SAUTER wordmark in blue, with a blue and yellow wave device and the line "Creating Sustainable Environments." | sauter-controls.com, "Sauter-controls-logo-EN" | 178×44 PNG, opaque white background, 12 KB | Software: Adobe ImageReady | Fr. Sauter AG. The branch home page says: "SAUTER este marcă înregistrată a Fr. Sauter AG." ("SAUTER is a registered trademark of Fr. Sauter AG.") |
| `knx.svg` | "KNX" letters under an arc, all in green `#5AE371` | www.knx.org/themes/custom/knx/logo.svg | SVG, viewBox 100×51, 1 KB. No script or external links. | None | Not stated in the repository. Downloaded from knx.org. |
| `bacnet.png` | "ASHRAE" hexagon and "BACnet™" in a blue-to-green gradient, above a purple bus line | bacnet.org, "ASHRAE-BACnet-Logo-New.png" | 2320×472 PNG, transparent, 30 KB | XMP: Adobe Photoshop CC 2015, created 2016-04-13 | Not stated in the repository. The mark carries the ASHRAE name and a ™ sign. |
| `modbus.png` | "Modbus" in blue italic over a cluster of yellow and orange nodes with green arrows | modbus.org, "main_logo.png" | 500×200 PNG, white background, 15 KB | None | Not stated in the repository. Downloaded from modbus.org. |
| `mbus.svg` | "M-Bus" in dark blue `#0E2F86`. The "M" is drawn as a pulse on a line. | m-bus.com/assets/downloads/MBusLogo240.svg | SVG, 680×235, 8 KB. Inkscape 0.91 file. No script or external links. | Inkscape document name "MBusLogo240.svg" | Not stated in the repository. Downloaded from m-bus.com. |
| `dali.png` | "DALI" in black capitals inside a black ellipse, with a ® sign | dali-alliance.org, "dali_r_logo_black.png" | 1414×465 PNG, transparent, 21 KB | None | Not stated in the repository. The mark carries a ® sign. Downloaded from dali-alliance.org. |

## How the branch uses them

Source: `components/partners-marquee.tsx` and `app/page.tsx` at `af81353`.

- **Protocol marquee (home page).** KNX, BACnet, Modbus, M-Bus and DALI scroll right to left on a white band, near the bottom of the home page after the stats band. There is no heading. Each logo has its own box height (32-48px) and maximum width (110-160px), to even out their very different proportions. The comment says: "The marks are shown unaltered and are never recoloured or cropped".
- **SAUTER credential (home page).** `sauter.png` is not in the marquee. It sits in the dark "Despre noi" ("About us") band, on a white plate, next to "Systems Partner autorizat" / "Din 2017" ("Authorised Systems Partner" / "Since 2017"). A code comment says the plate is there because the mark "carries dark type that would be unreadable on the dark green, and it must not be recoloured or inverted". The trademark line quoted above sits under the block.
- **LonMark is gone.** The comment says it was left out on purpose: "it is a certification mark, so showing it would assert a certification Sovitech does not hold". It also says SAUTER has its own block "because it is a real commercial partnership, which the protocol marks are not".
- The partnership claim ("Partener autorizat SAUTER din 2017", "Authorised SAUTER partner since 2017") is website copy. Nothing in the repository documents it.

## Trademark note

- These are **third-party marks of SAUTER, KNX, BACnet, Modbus, M-Bus and DALI**. SOVITECH does not own them.
- Use them only as their owners' logo guidelines allow. Nobody has recorded checking those guidelines. Check them before any use, including in the app, a proposal or a presentation.
- Some protocol marks may be tied to membership or product certification under their owners' rules. The branch treats LonMark that way. Showing a mark must not suggest a certification, membership or endorsement that SOVITECH does not hold.
- Show them unaltered: no recolouring, cropping, stretching or effects. Keep them apart from the SOVITECH logo, not merged into one lockup.

## Rules for the app

Source: `docs/guardrails.md` rule 1, paragraphs "Interfaces" and "Identifiers and prices".

- **A protocol logo is not evidence.** Rule 1: a protocol "is never estimated", and it is a `document` value "only when a document names it". The app must not use one of these logos to say or suggest that a building, a device or a proposal uses that protocol. A protocol appears only through the app's value model, with its source.
- **Not a product or asset picture.** Rule 1: SAUTER product names and product lines "come only from reference data". The SAUTER logo does not stand for a SAUTER product, an installed device or a quotation line.
- **Not approved for the app.** How, or whether, partner marks appear in the app is a product-owner decision. Nothing here decides it.

## Related

- Brand guidelines, including the branch's visual changes: [`../README.md`](../README.md) sections 14 and 15
- SOVITECH's own logo files: [`../logo/`](../logo/)
