# SAUTER product catalogue from the SOVITECH website

This folder holds the SAUTER products that SOVITECH presents on its website, imported from the website repository without running any of its code. It says what the catalogue is, how it is organised, which fields it has and how to regenerate it. It also says how the SOVITECH App may use it: for now, only as background knowledge, not as a source of values (see "Use in the app").

Source: https://github.com/Gaidenic13/sovitech-website at commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11, "Mobile-first product detail layout"). File paths below are relative to that repository's root, unless they start with `company/`, `docs/` or `design/`, which are paths in this project.

## Files

| File | What it is | Size |
|------|------------|------|
| `catalogue.json` | All 178 products. Source fields are kept verbatim, fields computed on import are kept apart under `derived`, and it also holds the category tree, image notes, validation results and caveats. **The canonical file.** | 403,680 bytes |
| `catalogue.md` | The same 178 products as a readable list, grouped by category and family, with a contents table, and the tables of images that no product uses. Generated from `catalogue.json`. | 155,777 bytes |
| `images/` | The 162 distinct product images that the products reference, copied from `public/products/` under their original file names. Every file's sha256 matches the source. **Kept out of git** (see below). | 162 files, about 53 MB |
| `images-unreferenced/` | The 50 other files in `public/products/`, which no product uses, copied byte for byte under their original names. See "Products seen only as images". **Kept out of git** (see below). | 50 files, about 11 MB |
| `tools/` | The two scripts that produce `catalogue.json` and `catalogue.md`, and a README on how to run them. Python 3 standard library only. | 3 files |
| `README.md` | This file | |

**The two image folders are kept out of git.** Owner decision, 2026-09-24: asked whether to commit the product images as they are, set up Git LFS, or keep them out of git, the owner answered "keep out". So `images/` and `images-unreferenced/` are listed in the project's `.gitignore`. A fresh clone of this project does not have them. Until they are restored, the image links in this README and in `catalogue.md` do not open, and `tools/parse_products.py` fails with its default paths. `catalogue.json` and `catalogue.md` are text and stay in git. To restore the images from the website repository (commit `e080614`, folder `public/products/`), follow "Restore the images" in [tools/README.md](tools/README.md).

## What the catalogue is

- **What the site shows.** The website lists SAUTER products at `/produse`, with a filter by category, and gives each product a page at `/produse/<id>`. Source: `app/produse/page.tsx`, `app/produse/[id]/page.tsx`, `components/product-detail.tsx`.
- **Where the data comes from.** All product data is one TypeScript array in `lib/product-data.ts`. A comment in that file says: "Generated from the SAUTER 2026-2027 catalogue extraction (178 product cards)." So the website team wrote these entries from SAUTER's 2026-2027 catalogue. They are not SAUTER's own data files.
- **How the site presents it.** The products page is headed "Gama completă SAUTER" ("Complete SAUTER Range"), with the badge "Partener autorizat SAUTER Elveția în România" ("Authorised SAUTER Partner in Romania"). It links to SAUTER's 2026-2027 catalogue on Issuu: `https://issuu.com/sauter/docs/2026_2027_catalogue_product_and_sys_6fc437e2aa86d2?fr=sZWRkMjg0Mjg1NTI`. Source: `app/produse/page.tsx`.
- **It is not SAUTER's full range.** The site's images folder holds 50 image files that no product uses. Among them are SAUTER products with no entry: modu524/525 automation stations, modu530 I/O modules, modu721 and modu731 communication modules, a modu840 operating unit, ecos500, flexotron800, equiflex, moduWeb500, ecomod580 and pneumatic devices. They are copied into `images-unreferenced/` and described under "Products seen only as images" below.
- **It lacks some lines SOVITECH says it uses.** The site says SOVITECH works with Modulo5. The unmerged branch also names ModuWeb Vision EY-WS 500 and EMS 100 and EMS 200. None of these has an entry. See "Product families SOVITECH says it works with" below.
- **There are no datasheets.** The products page says "Fișe tehnice și manuale în format PDF disponibile pentru fiecare produs în secțiunea de detalii." The site's English version reads "Technical data sheets and manuals in PDF format available for each product in the details section." But the repository has no PDFs. Each product's `docs` field is only a label such as "Fisa tehnica EQJW 126", and no page renders it. The "Descarcă catalog complet PDF" ("Download full PDF catalogue") and "Contactează un specialist" ("Contact a specialist") buttons on the products page have no link or action. Source: `app/produse/page.tsx`, `components/product-detail.tsx`.
- **Nothing addresses an AI.** No text in the product data or the product pages is addressed to an AI.

### On the unmerged branch redesign-2026

Everything in this subsection comes from the branch `redesign-2026`, commit `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala"), in `app/produse/page.tsx`, `app/produse/layout.tsx`, `app/produse/[id]/page.tsx` and `components/product-detail.tsx`. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. It is recorded here for reference only. The rest of this README describes main at `e080614`, which is the current website. Where it mentions the branch, it says "unmerged branch", and most of that is in the subsection "Product families SOVITECH says it works with".

- **How this was checked.** `git diff main origin/redesign-2026 -- lib/product-data.ts app/produse components/product-detail.tsx`, re-run on 2026-09-24. It changes 4 files, with 30 lines added and 21 removed. Only `d2d15d2` touches these paths. The branch tip `af81353` ("Materiale vizuale noi: 10 coperti si 15 diagrame") does not.
- **The product data and images do not change.** `lib/product-data.ts` has no diff, and its sha256 is the same on both (`54b64b5848286a7b9089cdea54b19229e8404bdd643f48d8e5a1e6b39ae72bbe`). `public/products/` has no diff either. The 178 products and the 50 unused images stay as described here.
- **The documentation card stops promising PDFs.** It reads "Specificațiile principale sunt pe pagina fiecărui produs. Fișele tehnice și manualele complete se trimit la cerere, pentru orice produs din gamă." The English version reads "The main specifications are on each product page. Full data sheets and manuals are sent on request, for any product in the range." A code comment above it gives the reason: "No PDFs are hosted on the site yet, so the copy promises documentation on request, not downloadable files." Source: `app/produse/page.tsx`.
- **The two dead buttons get targets.** "Contactează un specialist" links to `/contact`. "Descarcă catalog complet PDF" becomes "Răsfoiește catalogul complet SAUTER" ("Browse the full SAUTER catalogue") and opens the same Issuu catalogue as the card on main. Source: `app/produse/page.tsx`.
- **Small display changes.**
  - Product page titles, Open Graph titles, the JSON-LD name and image alt texts drop the dash between code and name. The `/produse` page title replaces its dash with "|". Source: `app/produse/[id]/page.tsx`, `app/produse/layout.tsx`, `components/product-detail.tsx`.
  - The product page no longer shows the name in the other language under the heading. Source: `components/product-detail.tsx`.
  - The `/produse` hero gets the branch's animated background (`components/hero-field.tsx`), and section padding moves to the shared classes `section-l` and `section-m`. Source: `app/produse/page.tsx`, `components/product-detail.tsx`.
- **Nothing else about products changes.** No product, field, code, category or image changes, so `catalogue.json` and `catalogue.md` need no update for the branch.

## How it is organised

The catalogue has 178 products in 8 categories and 53 families. The categories are the website's own groupings, in the order of the site's filter. Source: `lib/product-data.ts` (`categoryEn`) and `app/produse/page.tsx` (filter order).

| Category (RO, as on the site) | Category (EN) | Families | Products |
|-------------------------------|---------------|---------:|---------:|
| Controllere & PLC | Controllers & PLC | 5 | 11 |
| Senzori Presiune | Pressure Sensors | 3 | 13 |
| Senzori Ambient | Ambient Sensors | 6 | 23 |
| Actuatori | Actuators | 14 | 85 |
| Panouri Operare | Operating Panels | 8 | 17 |
| Software BMS | BMS Software | 6 | 6 |
| Gateway & Integrare | Gateway & Integration | 10 | 22 |
| Alimentare & Accesorii | Power & Accessories | 1 | 1 |
| **Total** | | **53** | **178** |

- **Families.** Every product has a `familyTitle`. The site treats products with the same family as related and shows them under "Din aceeași familie" ("From the same family"). Source: `components/product-detail.tsx`. No family spans two categories.
- **The category names are loose.** "Actuatori" also holds valves, ball valves and balancing valves. "Panouri Operare" also holds room thermostats and one immersion-sleeve entry. A category name does not tell you what a product is. The family and the description do.
- **Ordering.** In `catalogue.md`, families and products follow the order of the source file.
- **Counts were checked four ways, and all give 178:** the length of the parsed array, the lines that open an entry, the lines holding an `id`, and the source comment. There are no duplicate ids.

## Fields available

Per product, from `lib/product-data.ts` (the `Product` interface). "In" is how many of the 178 products have the field.

| Field | In | Meaning |
|-------|---:|---------|
| `id` | 178 | Website slug. The product page is `/produse/<id>`. |
| `name`, `nameEn` | 178 | Product name in Romanian and English |
| `code` | 178 | SAUTER type designation as the site shows it, for example "TSHK 621…643". Ranges use "…". |
| `category` | 178 | One of the 8 Romanian category labels. The English label comes from `categoryEn`. |
| `familyTitle`, `familyTitleEn` | 178 | Product family, RO and EN |
| `shortDesc`, `shortDescEn` | 178 | One-sentence description of what the product is and does, RO and EN |
| `features`, `featuresEn` | 178 | Feature bullets, RO and EN, aligned by index. Every product has two. |
| `specs.model` | 178 | Usually "SAUTER <name> (<one article code>)". Nineteen entries differ: 13 hold a code range, `ycs451f001` holds "conector VPN", and in 5 the bracketed code is in no modelCodes list (DSB143F001, VDL015F210, VKR040F300, BKR025F310, MH32F40F200). Two more have no brackets, for example "SAUTER YCS451F020 Universal Gateway". See "Data caveats". |
| `specs.protocol` | 178 | Shown as "Protocol / Semnal" ("Protocol / Signal"). Sometimes it holds a signal type or a contact description, not a protocol. |
| `specs.range` | 178 | Shown as "Gamă" ("Range"). Free text, often several quantities in one string. |
| `specs.power` | 178 | Shown as "Alimentare" ("Power"). Sometimes it holds a contact rating, not a supply. |
| `specsEn` | 139 | English versions of spec values that contain Romanian words: protocol 102, range 135, power 57. When one is absent, the site shows the Romanian value, and so does `catalogue.md`. The model row never has one. |
| `modelCodes` | 178 | SAUTER article numbers, comma-separated. There are 611 in total and 602 distinct ones. |
| `docs` | 178 | A datasheet label only, not a link (see above) |
| `image` | 178 | Path under `public/`. The file is in `images/` under the same name. |
| `icon` | 178 | Name of the lucide-react icon on the catalogue card, stored as a string |

Computed on import, under each product's `derived` key in `catalogue.json`:
- `categoryEn`;
- `articleCodes`, which is `modelCodes` split with the site's own rule, `articleCodes()` in `lib/product-data.ts`;
- `relatedProductIds`, the other products in the same family;
- `websitePath`;
- `imageFile`;
- `sourceLine`, the line where the product starts in the source file;
- `notSpecifiedSpecs`.

**Not in the source at all:** prices, stock, datasheet links, which sectors or applications a product suits, generation or lifecycle status (current, successor, discontinued), and typed quantities. For example, I/O counts and object capacities exist only inside free-text strings. Which room units work with which stations is also only in free text, for example "for ecos311, ecos504/505, modu6\*\*-AS and ASV2" (`ey-ru-355`).

## Data caveats

Most of these are also recorded in `catalogue.json` under `caveats`, with the checks behind them under `validation`.

- **Spec rows are display text, not values.** One string often mixes several quantities, for example "DN 15…50, Kvs 1.6…40 m³/h, PN 6".
- **"Not specified."** 99 spec values are the sentinel `NU ESTE SPECIFICAT`: 52 power and 47 protocol values. The site shows them as "Nu este specificat" / "Not specified". They mean "not given", so treat them as Unknown, never as none or zero.
- **Number formats are mixed.** Some values use a decimal point ("Kvs 1.6", "10(2.5) A"), others a decimal comma ("3,5 W", "0,1 K"), even in English values. Most ranges use "…", a few use "...".
- **The immersion sleeves appear twice,** as `0391-0392-0393` (Operating Panels) and `0391-0392-0393-2` (Ambient Sensors). Their article-code lists differ in three codes, for example 0391022600 against 0391022450. The source does not say which list is right.
- **The model row is not a reliable article code.** 157 of the 178 model rows end with one article code in brackets that is also in the entry's `modelCodes`. The other 21 do not:
  - 13 hold a code range, for example "SAUTER VUD (VUD015F320…VUD050F200)": `vud`, `vqd`, `bud`, `bqd`, `vue`, `vqe`, `bue`, `bqe`, `vug`, `bug`, `vup`, `vus` and `bus`;
  - `ycs451f001` holds Romanian text: "SAUTER YCS451F001 (conector VPN)";
  - `ycs451f020` and `05306034-05306053` have no brackets;
  - 5 name a code that is in no `modelCodes` list at all: `dsb-dsf` DSB143F001, `vdl-010-050` VDL015F210, `vkr` VKR040F300, `bkr` BKR025F310 and `mh32f-mh42f` MH32F40F200. For `vkr` and `bkr` the list has only the same code with "-FF" added (VKR040F300-FF, BKR025F310-FF).

  So a lookup by article code will not find those five codes. Use `modelCodes` (in `catalogue.json`, `derived.articleCodes`), not the model row. Source: `lib/product-data.ts`, for example line 260 (`dsb-dsf` model) against line 269 (its `modelCodes`). `catalogue.json` lists every case under `validation.modelRow`.
- **Some article codes appear in two entries.** Nine codes do. `catalogue.json` lists them under `validation.articleCodesInMoreThanOneEntry`.
  - The three codes the two immersion-sleeve entries share: 0391022100, 0391011100 and 0393012100, in `0391-0392-0393` and `0391-0392-0393-2`.
  - The six Smart Actuator codes. Each is in the overview entry `akm-avm-asm-115sa` and in its own entry: AKM115SAF232 (`akm115saf232`), AKM115SAF332 (`akm115saf332`), AVM115SAF232 (`avm115saf232`), AVM115SAF332 (`avm115saf332`), ASM115SAF232 (`asm115saf232`) and ASM115SAF332 (`asm115saf332`).
  - Five more codes appear only in a model row and in no `modelCodes` list (see above).

  So an article code does not always lead to exactly one entry. The 611 codes in `modelCodes` hold 602 distinct ones.
- **Images do not prove the variant.**
  - Six pairs of different products use byte-identical images, for example ecos504/505 and ecos514/515.
  - Another 15 image files are each used by more than one product.
  - A check by eye found 10 more groups of different products whose images are the same picture saved as different files. Examples are `vue` and `bue`, `vug` and `bug` (pixel-identical), and `avf-234s` and `avm-234s`. The list is in `catalogue.json` under `images.samePictureAcrossProducts`, and `catalogue.md` notes it on each product. It may not be complete.
- **Romanian words in the model row.** The model row has no English version, so three entries show Romanian words in English too: "teacă imersie" (immersion sleeve, in both sleeve entries) and "conector VPN" (VPN connector, in `ycs451f001`). `catalogue.md` glosses them.

## Products seen only as images

The website's image folder `public/products/` holds 50 files that no product uses. They are copied byte for byte into `images-unreferenced/` (sha256 checked), so the notes below can be checked against the pictures. All 50 were added in commit `02c0fde` (2026-08-10, "Full SAUTER catalogue with SEO product pages, bilingual data, real images"), and nothing in the repository refers to them. The unmerged branch `redesign-2026` (tip `af81353`) does not use them either.

- **What they show.** Each note comes from the file name and from looking at the picture. "Label reads" means text read off the picture itself. The notes were reviewed by hand on 2026-09-24. They are stored in `catalogue.json` under `images.presentButUnreferenced`, and `catalogue.md` repeats these tables.
- **What they are not.** They are not catalogue data. A picture shows neither that SOVITECH offers the product nor which variant it is.
- **Summary.** 20 files show products with no entry, most of them SAUTER lines: modu524/525, modu530, modu721, modu731, a modu840 operating unit, a "Building Data Integrity Manager", ecos500, ecomod580, flexotron800, equiflex, moduWeb500, an energy data logger and pneumatic devices. 8 more pictures cannot be matched to one entry. The other 22 are the same picture as an image that a product already uses.
- **Kinds of duplicate.** "Byte-identical" means the files have the same bytes. "Pixel-identical" means every decoded pixel is the same, though the files differ. "Saved at another compression" means the same picture stored at a different JPEG quality. `tools/parse_products.py` computes the byte-identical matches. The other two kinds were found by comparing decoded pixels and by eye, and are written into the script by hand.

### Products with no catalogue entry (20)

A product named by the file name or by a label on the picture, with no catalogue entry. Most names are SAUTER product lines.

| File | What it shows | Duplicates a referenced image? |
|------|---------------|--------------------------------|
| [1083683.png](images-unreferenced/1083683.png) | Black SAUTER DIN-rail device labelled 'Building Data Integrity Manager', with four LAN ports; small print appears to read 'modu615-BM'. No catalogue entry. | No. |
| [423066.jpg](images-unreferenced/423066.jpg) | Grey SAUTER pneumatic device labelled 'XTP 2', with a time dial in minutes. No pneumatic products in the catalogue. | No. |
| [481436-1.jpg](images-unreferenced/481436-1.jpg) | Yellow modular automation station: modu524/525, going by the file of the same picture that is named for it. Not in the catalogue. | No. It is the same picture as modular-automation-station-modu524-525.jpg, saved at another compression, which no product uses either. |
| [481437-543x1024.jpg](images-unreferenced/481437-543x1024.jpg) | Yellow DIN-rail I/O module: modu530, going by the byte-identical file that is named for it. Not in the catalogue. | No. It is byte-identical to i-o-module-digital-and-universal-inputs-modu530.jpg, which no product uses either. |
| [481455.jpg](images-unreferenced/481455.jpg) | Yellow local operating unit with an LCD and a rotary knob; label reads 'modu840'. Not in the catalogue, whose local operating unit is the modulo 6 unit ey6lo00 (Local operating and display unit). | No. |
| [499415.jpg](images-unreferenced/499415.jpg) | Room controller: equiflex, going by the byte-identical file that is named for it. Not in the catalogue. | No. It is byte-identical to electronic-air-conditioning-controller-heating-cooling-equiflex.jpg, which no product uses either. |
| [635841.jpg](images-unreferenced/635841.jpg) | Yellow and black web server housing: moduWeb500, going by the file of the same picture that is named for it. Not in the catalogue. | No. It is the same picture as web-server-for-moduweb-vision-and-moduweb500-bacnet-networks.jpg, saved at another compression, which no product uses either. |
| [826866.png](images-unreferenced/826866.png) | flexotron800 controller with an English display. Same product as communicative-controller-for-universal-use-flexotron800.png, which shows a German display. The catalogue has flexotron400 (RDT) only. | No. |
| [communication-module-with-eia-232-and-eia-485-interfaces-modu721.jpg](images-unreferenced/communication-module-with-eia-232-and-eia-485-interfaces-modu721.jpg) | modu721 communication module (from the file name). Not in the catalogue. | No. |
| [communication-module-with-m-bus-and-eia-232-interfaces-modu731.jpg](images-unreferenced/communication-module-with-m-bus-and-eia-232-interfaces-modu731.jpg) | modu731 communication module (from the file name). Not in the catalogue. | No. |
| [communicative-controller-for-universal-use-flexotron800.png](images-unreferenced/communicative-controller-for-universal-use-flexotron800.png) | flexotron800 controller (from the file name). Not in the catalogue. | No. |
| [electronic-air-conditioning-controller-heating-cooling-equiflex.jpg](images-unreferenced/electronic-air-conditioning-controller-heating-cooling-equiflex.jpg) | equiflex room controller (from the file name). Not in the catalogue. | No. It is byte-identical to 499415.jpg, which no product uses either. |
| [energy-data-logger-for-ems-4.jpg](images-unreferenced/energy-data-logger-for-ems-4.jpg) | Industrial-PC style energy data logger (the file name says EMS). Not in the catalogue. | No. |
| [i-o-module-digital-and-universal-inputs-modu530.jpg](images-unreferenced/i-o-module-digital-and-universal-inputs-modu530.jpg) | modu530 I/O module (from the file name). Not in the catalogue. | No. It is byte-identical to 481437-543x1024.jpg, which no product uses either. |
| [modular-automation-station-modu524-525.jpg](images-unreferenced/modular-automation-station-modu524-525.jpg) | modu524/525 automation station (from the file name). Not in the catalogue. | No. It is the same picture as 481436-1.jpg, saved at another compression, which no product uses either. |
| [pneumatic-actuator-2.png](images-unreferenced/pneumatic-actuator-2.png) | Yellow and black pneumatic actuator (from the file name). No pneumatic products in the catalogue. | No. |
| [pneumatic-valve-actuator.jpg](images-unreferenced/pneumatic-valve-actuator.jpg) | Pneumatic valve actuator (from the file name). No pneumatic products in the catalogue. | No. |
| [room-automation-station-ecos500.jpg](images-unreferenced/room-automation-station-ecos500.jpg) | ecos500 room automation station (from the file name). Not in the catalogue (it has ecos504/505, ecos514/515 and ecos311). | No. |
| [web-server-for-moduweb-vision-and-moduweb500-bacnet-networks.jpg](images-unreferenced/web-server-for-moduweb-vision-and-moduweb500-bacnet-networks.jpg) | moduWeb500 web server (from the file name). Not in the catalogue. | No. It is the same picture as 635841.jpg, saved at another compression, which no product uses either. |
| [wireless-interface-ecomod580.jpg](images-unreferenced/wireless-interface-ecomod580.jpg) | ecomod580 wireless interface (from the file name). Not in the catalogue (it has ecosCom581, EY-CM 581). | No. |

### Other pictures, not matched to one entry (8)

A picture not matched to one catalogue entry.

| File | What it shows | Duplicates a referenced image? |
|------|---------------|--------------------------------|
| [1086975-958x1024.png](images-unreferenced/1086975-958x1024.png) | Brass threaded 3-way valve with a black knob and yellow flange. It resembles the valve pictured for m3r-m4r (control-valve-with-threaded-connection-pn-10.jpg) but is a different picture. Not matched to an entry. | No. |
| [423077.jpg](images-unreferenced/423077.jpg) | Two pneumatic valve actuators; no brand is readable. No pneumatic products in the catalogue. | No. |
| [423088.jpg](images-unreferenced/423088.jpg) | Olive metal enclosure with a cable gland. Not identifiable. | No. |
| [487592.jpg](images-unreferenced/487592.jpg) | Yellow and black rotary actuator with a manual lever; label reads 'AKM115F120'. That article code is listed in the entry akm-105-115 (AKM 105/115), which uses a different-looking picture, rotary-actuator.png. | No. |
| [499362.jpg](images-unreferenced/499362.jpg) | White SAUTER room thermostat in the TSHK style (fan-speed switch, ON/OFF switch, dial). It differs from tshk670.jpg and tshk681.jpg. No entry uses it; which variant it shows is unclear. | No. |
| [692074.jpg](images-unreferenced/692074.jpg) | Grey DIN-rail terminal/distributor strip. It resembles the FXV 3 distributor but is not the picture used for fxv-3 (fxv3.jpg); not confirmed. | No. |
| [692095.jpg](images-unreferenced/692095.jpg) | White wall room unit with an LCD and touch keys. Not matched to an entry. | No. |
| [865070-747x1024.png](images-unreferenced/865070-747x1024.png) | White SAUTER DIN-rail module with a green LED. Not matched to an entry. | No. |

### The same picture as an image a product uses (22)

The same picture as an image that a product uses.

| File | What it shows | Duplicates a referenced image? |
|------|---------------|--------------------------------|
| [2-way-flanged-valve-pn-6-pn.jpg](images-unreferenced/2-way-flanged-valve-pn-6-pn.jpg) | Flanged valve. The file name says PN 6, but the picture is the one the catalogue uses for the PN 16/10 valves bue and vue. Which product it was meant to show is unclear. | Yes: pixel-identical to 3-way-flanged-valve-pn-16-10-el.jpg (bue); the same picture as vue.jpg (vue), saved at another compression. |
| [3-way-flanged-valve-pn-6-pn.jpg](images-unreferenced/3-way-flanged-valve-pn-6-pn.jpg) | Same picture as 2-way-flanged-valve-pn-6-pn.jpg, under a 3-way name. The picture is the one the catalogue uses for bue and vue. | Yes: pixel-identical to 3-way-flanged-valve-pn-16-10-el.jpg (bue); the same picture as vue.jpg (vue), saved at another compression. |
| [422912.jpg](images-unreferenced/422912.jpg) | Same picture as the image of dfc-17b-27b (Heavy-duty vibration-resistant pressure switch). | Yes: byte-identical to heavy-duty-pressure-switch.jpg (dfc-17b-27b). |
| [422920.jpg](images-unreferenced/422920.jpg) | Same picture as the image of hbc (Duct humidistat). | Yes: byte-identical to duct-mounted-humidistat.jpg (hbc). |
| [422923.jpg](images-unreferenced/422923.jpg) | Same picture as the image of svu-100 (Air velocity transmitter). | Yes: byte-identical to air-flow-transducer.jpg (svu-100). |
| [423021.jpg](images-unreferenced/423021.jpg) | Same picture as the image of bug (3-way flanged valve, PN 25/16). | Yes: byte-identical to 3-way-flanged-valve-pn-25-16-el.jpg (bug); pixel-identical to 2-way-flanged-valve-pn-25-16-el.jpg (vug). |
| [494531.jpg](images-unreferenced/494531.jpg) | Same picture as the image of egp-100 (Differential pressure transmitter for air). | Yes: byte-identical to differential-pressure-transducer.jpg (egp-100). |
| [499361.jpg](images-unreferenced/499361.jpg) | Same picture as the image of tshk-621-643 (Electromechanical room thermostat). | Yes: byte-identical to room-thermostat.jpg (tshk-621-643). |
| [499368-504x1024.jpg](images-unreferenced/499368-504x1024.jpg) | Same picture as the image of dsa (Compact pressure switch with fixed switching difference). | Yes: byte-identical to pressure-switch.jpg (dsa). |
| [499369-490x1024.jpg](images-unreferenced/499369-490x1024.jpg) | Same picture as the image of dsb-dsf (Pressure monitors and switches with adjustable difference). | Yes: byte-identical to pressure-monitors-and-pressure-switches.jpg (dsb-dsf). |
| [499371-489x1024.jpg](images-unreferenced/499371-489x1024.jpg) | Same picture as the image of dsl-dsh (SIL 2 certified pressure limiters). | Yes: byte-identical to specially-designed-pressure-limiter.jpg (dsl-dsh). |
| [499375.jpg](images-unreferenced/499375.jpg) | Same picture as the image of hsc-120 (Room humidistat for surface mounting). | Yes: byte-identical to room-humidistat.jpg (hsc-120). |
| [499511.jpg](images-unreferenced/499511.jpg) | Same picture as the image of avm-234s (SUT linear actuator with positioner, 2500 N). | Yes: byte-identical to sut-valve-actuator-with-positioner.jpg (avm-234s); the same picture as avf-234s.jpg (avf-234s), saved at another compression. |
| [499514-585x1024.jpg](images-unreferenced/499514-585x1024.jpg) | Same picture as the image of def (Tight-closing butterfly valve). | Yes: byte-identical to tight-sealing-butterfly-valve-pn-16.jpg (def). |
| [499515.jpg](images-unreferenced/499515.jpg) | Same picture as the image of mh32f-mh42f (Flanged control valve). | Yes: byte-identical to control-valve-with-flange-connection-pn-6.jpg (mh32f-mh42f). |
| [530620.jpg](images-unreferenced/530620.jpg) | Same picture as the image of axt-301-311 (Thermal actuator for unit valves). | Yes: byte-identical to thermal-actuator-for-unit-valves-with-stroke-indicator.jpg (axt-301-311). |
| [891827-703x1024.jpg](images-unreferenced/891827-703x1024.jpg) | Same picture as the image of tuc (Universal thermostat with immersion sleeve). | Yes: byte-identical to universal-thermostat.jpg (tuc). |
| [900088-464x1024.jpg](images-unreferenced/900088-464x1024.jpg) | Same picture as the image of dsd (Differential pressure switch for neutral media). | Yes: byte-identical to differential-pressure-switch.jpg (dsd). |
| [900090.jpg](images-unreferenced/900090.jpg) | Same picture as the image of dsu-dsi (Pressure transmitters with ceramic diaphragm). | Yes: byte-identical to pressure-transmitter.jpg (dsu-dsi). |
| [956045.jpg](images-unreferenced/956045.jpg) | Same picture as the image of egt-346-447 (Duct temperature sensor). | Yes: byte-identical to duct-temperature-sensor.jpg (egt-346-447). |
| [969089.jpg](images-unreferenced/969089.jpg) | Same picture as the image of ey-rc-311 (ecos311 compact room controller). | Yes: byte-identical to programmable-controller-ecos311.jpg (ey-rc-311). |
| [room-automation-station-ecos504-505-2.png](images-unreferenced/room-automation-station-ecos504-505-2.png) | Same picture as the image of ey-rc-514-515 (ecos514/515 room automation station) and ey-rc-504-505 (ecos504/505 room automation station). | Yes: byte-identical to 940669.png (ey-rc-514-515); byte-identical to room-automation-station-ecos504-505.png (ey-rc-504-505). |

## How to regenerate

Do this when the website's product data changes. Never run, build, install or import the website's code. Read its files as text. The scripts in `tools/` do steps 2, 3 and 5, and `tools/README.md` gives the commands.

1. **Clone the repository read-only.** Check out the commit you want. Record its hash and the sha256 of `lib/product-data.ts`.
2. **Parse `lib/product-data.ts` statically.**
   - The `products` array is a TypeScript object literal. At this commit it runs from line 57 to line 4291.
   - Its strings are double-quoted. Each entry also has one bare identifier, `icon`, which is kept as a string.
   - Also parse the `categoryEn` map.
   - Split `modelCodes` on commas and semicolons, as `articleCodes()` does.
   - `tools/parse_products.py` does this with a small Python tokenizer written for this syntax. A plain JSON or JSON5 parser will not read the file as it is, because of the bare identifiers.
3. **Check the counts.** The array length, the entry-opening lines and the `id:` lines must agree with each other and with the source comment. Also check that:
   - no id is duplicated;
   - every category is in `categoryEn`;
   - `features` and `featuresEn` have the same length in every product.

   The parser stops if the four counts disagree. It also sorts every model row and lists the article codes found in more than one entry (see "Data caveats").
4. **Copy the images.** Copy each file named by an `image` field from `public/products/` into `images/`, and every other file in that folder into `images-unreferenced/`, under the same names. Verify each sha256. Both folders stay out of git (owner decision, 2026-09-24). The parser does not copy files; it reads the folders it is given and reports referenced files that are missing and files that no product uses.
   - Its notes on unused images, and its lists of the same picture under different files, are written by hand in the script. The parser stops if a note names a file that is not there. New or changed pictures still need a fresh look by eye.
5. **Write the files.**
   - Write `catalogue.json` with source fields verbatim and computed fields under `derived`, and update `source`, `countCheck` and `images`.
   - Regenerate `catalogue.md` from `catalogue.json` with `tools/gen_catalogue_md.py`.
6. **Compare with the previous version** and note what changed: products added or removed, codes changed. Any app dataset built on this one (see below) needs a new version, not an in-place edit.

## Use in the app

Checked against `docs/guardrails.md` version 1.3 (2026-09-24).

### This is not yet approved reference data

- **What the rules say.**
  - Rule 1: "SAUTER model numbers, product names and product lines, list prices, standards and their editions, and benchmark ratios come only from reference data."
  - Section 2.1: a `reference` value is "a fact about the world from a curated, versioned dataset", and "the SAUTER catalogue" is one of its examples.
  - Rule 2: AI prose names products only through `{{product:<catalogueId>}}` tokens.
  - Case G1-3 rejects an AI output that names a SAUTER model number not in the catalogue, and flags it for the engineer. Case G2-5 rejects a SAUTER product line named outside a product token.
- **This website catalogue is not that dataset yet.**
  - Section 10 counts "adding … a reference dataset" as a loosening, and a loosening needs the approver's explicit approval.
  - No approver is named yet (section 10). `docs/build-readiness.md` section 5 notes that until one is named, "no reference dataset can be approved".
  - Case G1-12 covers this folder by name. A dataset with no approval record, "for example the SAUTER product list imported from the company website into `company/products/`", is attached as reference data. The expected result: the loosening check fails, and no `reference` candidate is created from it.
- **It is marketing data.**
  - The website team wrote it from SAUTER's catalogue for a sales page. It is not SAUTER's official datasheet data, and it has no datasheet links to check it against.
  - Its specs are free text with mixed number formats. They cannot become values without the unit registry (rule 8) and an engineer's check (rule 3).
  - It contradicts itself (the immersion sleeves). It also leaves out lines that SAUTER lists, such as modu524/525 (`docs/build-readiness.md` section 6, and the cross-check below).
- **`catalogue.json` now says the same.** Its `dataStatus` field used to say the app "may use it to name and describe SAUTER products and to suggest candidates". That was looser than rule 1. Guardrails version 1.3 logged it as a near miss and added case G1-12. Since 2026-09-24, `dataStatus` says three things. This catalogue is not an approved reference dataset. Product identifiers in the app come only from an approved, versioned dataset. This catalogue may inform such a dataset only after the approver decides to adopt it. If the two ever disagree, this README governs.
- **What it can be used for now.**
  - As Claude Code's background knowledge while building, for example to check mockup and demo copy against real product names. `docs/build-readiness.md` section 2 says a project skill "is never a runtime source of values", and the same holds for this folder.
  - As the starting point for the request to SAUTER, or to SOVITECH engineers, for a proper machine-readable catalogue with generation and lifecycle fields (`docs/build-readiness.md` sections 3 and 4).
- **What the approver would need to decide before adopting it.**
  - **Which key a `{{product:…}}` token uses.** A website `id` can cover several models: `ey-rc-504-505` covers both ecos504 and ecos505. Article codes are finer, but nine of them appear in two entries, and five model rows name a code that is in no article-code list.
  - **Whether any spec becomes a typed value,** through the unit registry.
  - **How the missing lines and lifecycle status are filled.**
  - **How the immersion-sleeve contradiction is resolved.**

### Cross-check: controller and product names used in the mockups

The names come from `design/dashboards-spec.md` section 6.1, with screen numbers from section 4 of that spec. "In this catalogue" means an entry, a code or the text of an entry in `catalogue.json`.

| Name in the mockups | Screens | In this catalogue? | Matching entry, quoted |
|---------------------|---------|--------------------|------------------------|
| ecos504 | 06, 07, 08, 13 | **Yes** | `ey-rc-504-505`: "ecos504/505 room automation station", code "EY-RC 504, 505", model "SAUTER ecos504 (EY-RC504F001)", "Modular automation station for up to eight rooms or eight flexible room segments." The catalogue calls it a room automation station. The mockups also use it for the HVAC plant and for energy monitoring (06, 08), which section 6.1 already flags. |
| ecos505 | none found in the spec | **Yes, but only inside the ecos504 entry** | `ey-rc-504-505`, article codes `EY-RC505F031` and `EY-RC505F071`. There is no separate entry, and the text does not say how the 505 differs from the 504. |
| modu525 | 07, 08 | **No** | No entry for modu524/525 or any other EY-modulo 5 automation station. The site has an unused image, `modular-automation-station-modu524-525.jpg` (now in `images-unreferenced/`), but no product for it. The only "modu5…" text is "SLC on RS-485 (ecos 5, modu521)" in the protocol row of `ey-ru-310-316`. Yet the site says SOVITECH works with Modulo5, on main and on the unmerged branch (see "Product families SOVITECH says it works with"). |
| modu520 | 08 | **No** | No entry and no text match. This agrees with section 6.1 and `docs/build-readiness.md` section 6, which found no SAUTER modu520. |
| "EY-modulo" | 05 | **No, not under that name** | The string "EY-modulo" appears nowhere. The catalogue has "modulo 6" families (EY6… codes) and a "modulo Power Supplies" family (`ey-ps-031`: "…for modulo stations, I/O modules and field devices."). It also mentions "modulo 2" once, in `ey-bu-292` ("…integrating novaNet EY3600 and modulo 2 stations into Ethernet LAN/WAN networks."). This catalogue cannot tell which generation screen 05 means. |
| "modulo 6" | 10 (and 17, by reference to 10) | **Yes, as a product line** | 13 entries in 6 families named "modulo 6": automation stations 2, I/O modules 4, connection modules 3, communication modules 2, BACnet router 1, operating unit 1. The two automation stations are `ey6as60`, "Modular BACnet automation station for controlling and monitoring medium-sized HVAC installations", and `ey6as80`, "Modular BACnet automation station with moduWeb Unity web server, for large HVAC installations". Screen 10 does not say which one. The catalogue never uses the names modu660 or modu680 from section 6.1. It does use "modu6\*\*-AS", "modu600-LO" and "modu602-LC" in the text, but never maps EY6AS60 or EY6AS80 to a modu name. The unmerged branch names SOVITECH's Modulo6 stations "EY-AS660 și EY-AS680", a third pair of names that this catalogue does not contain either. |
| "SAUTER Vision Center" | 07, 08, 13 | **Yes** | `yzp-480-495`: "Building management platform", model "SAUTER Vision Center (YZP480F200)", "Web-based building management platform with visualisation, energy monitoring and integrated AEM analysis." Its protocol row reads "BACnet, BACnet/SC, OPC UA, MQTT", and its power row is "Not specified". This row is website copy. `docs/build-readiness.md` section 6 still lists Vision Center's integration interfaces as unverified. The unmerged branch names "Sauter Vision Center" as a supervision platform SOVITECH uses. |
| "Sauter AHU-4000" | 17 | **No** | No air handling unit appears anywhere, and no text contains "AHU". The catalogue holds controls, field devices and software only. This agrees with section 6.4: SAUTER does not make AHUs. |
| "AHU modulair 7500" | 05 | **No** | No text contains "modulair" or "7500". The same point about AHUs applies. |
| "(eco/ modu / EY)" | 07 | **Not a product name** | These are prefixes. "eco" matches ecos, ecosCom, ecoUnit and ecoLink. "modu" matches modulo (modulo 6, modulo 2 and the modulo Power Supplies family), moduNet and moduWeb Unity, and the text also mentions modu521, modu6\*\*-AS, modu600-LO and modu602-LC. "EY" starts 5 of the 11 Controllers & PLC entries (17 of their 27 article codes). It names no product. |

**Consequence.** If this catalogue became the reference dataset as it stands, case G1-3 would reject "modu525" because the entry is missing. Yet `docs/build-readiness.md` section 6 found modu524/525 listed by SAUTER, and SOVITECH's own site says it works with Modulo5. "modu520" would be rejected correctly. Either way the mockup names cannot be used as they are. Section 8 question 8 of the dashboards spec (EY-modulo 5 or modulo 6, and which roles) is still open. The website does not settle it, because it names both generations (next subsection).

### Product families SOVITECH says it works with

These are SOVITECH's own marketing statements about the equipment it uses. They are not verified and they are not product data. Rule 1 applies to them as it does to the catalogue: product names in the app come only from an approved reference dataset. `company/business/services.md` and `company/business/company-profile.md` record the pages around these quotes.

#### On main (`e080614`)

Main's `app/servicii/page.tsx` is written without diacritics. The quotes keep every text as written.

- **Services page, installation step.** `app/servicii/page.tsx` lines 85-86.
  - RO: "Montam tablourile de automatizare, controllere SAUTER (Modulo5/6, ECOS), senzori de temperatura, umiditate, CO2, debitmetre, valve si actuatori."
  - EN: "We mount automation panels, SAUTER controllers (Modulo5/6, ECOS), temperature, humidity and CO2 sensors, flow meters, valves and actuators."
- **Services page, FAQ "Ce echipamente folositi pentru sistemele BMS?"** ("What equipment do you use for BMS systems?"). `app/servicii/page.tsx` line 320.
  - RO: "Folosim controllere Modulo5, Modulo6 si ECOS, senzori de inalta precizie si software proprietar SAUTER."
  - EN: "We use Modulo5, Modulo6 and ECOS controllers, high-precision sensors and proprietary SAUTER software."
- **Integration service.** `app/servicii/integrare/page.tsx` lines 49 and 51.
  - RO: "Programăm controllerele BMS folosind software-ul SAUTER CASE Suite".
  - EN: "We programme BMS controllers using SAUTER CASE Suite software".
- **Radisson case study.** `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` line 179 gives the technology as "SAUTER modulo - BACnet / KNX / Modbus", with no generation. The branch has the same line. The app's mockups also show the demo project as Radisson Blu Bucharest, but the app's demo no longer uses the real hotel's name (owner decision, 2026-09-24), and its data is fictional and labelled as demo. This line is marketing copy, not a source for the demo, and it names no generation, so it does not answer question 8.

#### On the unmerged branch redesign-2026

Everything in this part comes from the branch `redesign-2026`, commit `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala"). The files quoted are new on the branch: main has no `app/despre-noi/` and none of these articles. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. This part is for reference only. It is not what SOVITECH says today.

- **About page, FAQ "Din ce an este Sovitech Control partener SAUTER?"** ("Since when has Sovitech Control been a SAUTER partner?"). `app/despre-noi/page.tsx` lines 73-76.
  - RO: "Din 2017, anul înființării firmei. Sovitech Control este Systems Partner SAUTER și lucrează cu gama Modulo6, Modulo5 și ECOS, cu senzorii EGQ, EGH și EGP, cu vane și servomotoare, precum și cu platformele de supervizare Sauter Vision Center și ModuWeb Vision EY-WS 500."
  - EN: "Since 2017, the year the company was founded. Sovitech Control is a SAUTER Systems Partner and works with the Modulo6, Modulo5 and ECOS ranges, the EGQ, EGH and EGP sensors, valves and actuators, as well as the Sauter Vision Center and ModuWeb Vision EY-WS 500 supervision platforms."
- **About page, partnership section.** `app/despre-noi/page.tsx` lines 262-263.
  - RO: "Echipamentele folosite curent: automate Modulo6 (EY-AS660 și EY-AS680), Modulo5 și ECOS, senzori EGQ pentru CO2, senzori EGH pentru umiditate și EGP pentru presiune, vane și servomotoare, plus stratul de supervizare Sauter Vision Center și ModuWeb Vision EY-WS 500. Pentru monitorizarea energiei se folosesc EMS 100 și EMS 200."
  - EN: "The equipment in current use: Modulo6 controllers (EY-AS660 and EY-AS680), Modulo5 and ECOS, EGQ sensors for CO2, EGH sensors for humidity and EGP for pressure, valves and actuators, plus the Sauter Vision Center and ModuWeb Vision EY-WS 500 supervision layer. Energy monitoring uses EMS 100 and EMS 200."
  - Just below, the link "Vezi echipamentele SAUTER integrate" ("See the integrated SAUTER equipment") points to `/produse`, the page this catalogue comes from (lines 272-273).
- **Expertise pages: no products.** `app/expertiza/page.tsx`, `app/expertiza/[sector]/page.tsx` and `app/expertiza/[sector]/sector-client.tsx` replace main's `app/sectoare/`. They show text from `lib/sector-data.ts`. None of these four files contains the word "SAUTER" or names a product family.
- **Two new articles repeat the list, with differences.** Found by searching the branch.
  - `components/articles/sisteme-bms-cladiri.tsx` lines 276-278: "controlere Modulo 6 și Modulo 5/ECOS, senzori de CO2 și de temperatură din seriile EGQ și EGH, vane și servomotoare, supervizare Sauter Vision Center sau ModuWeb Vision. Gama este pe pagina de produse." The words "pagina de produse" link to `/produse`. This article pairs EGH with temperature, while the about page pairs it with humidity. It names "ModuWeb Vision" without a code.
  - `components/articles/kpi-performanta-cladire.tsx` line 382: "senzori de CO2 (la Sauter, seria EGQ)".
- **The services pages drop the names.** On the branch, `app/servicii/` no longer names Modulo5, Modulo6, ECOS or CASE Suite (checked by search; see `company/business/services.md`).

#### Checked against this catalogue and the mockups

"Named on" says where SOVITECH names the item. "In this catalogue" means an entry, a code or the text of an entry in `catalogue.json`. The mockup names come from `design/dashboards-spec.md` section 6.1, with screen numbers from section 4.

| SOVITECH names | Named on | In this catalogue? | Matching entries | Mockup names |
|----------------|----------|--------------------|------------------|--------------|
| Modulo6 | main and branch | **Yes, as "modulo 6"** | 13 entries in 6 "modulo 6" families. The automation stations are `ey6as60` (code "EY6AS60") and `ey6as80` (code "EY6AS80"). | "modulo 6" (10) |
| EY-AS660, EY-AS680 | branch only | **No** | Neither string appears. The catalogue's modulo 6 stations are EY6AS60 and EY6AS80, and spec section 6.1 names modu660/680. The three pairs of names differ, and no source here maps one to another. An engineer has to say which products are meant. | none |
| Modulo5 | main and branch | **No** | No entry. The only "modu5…" text is "modu521" in the protocol row of `ey-ru-310-316`. The unused image `modular-automation-station-modu524-525.jpg` is named for modu524/525, which `docs/build-readiness.md` section 6 lists as EY-modulo 5. Other unused images are named for, or labelled, modu530, modu721, modu731 and modu840. No source here says which generation those belong to. | modu525 (07, 08), modu520 (08), "EY-modulo" (05) |
| ECOS | main and branch | **Yes, as "ecos"** | 3 entries in "ecos Room Automation Stations": `ey-rc-504-505` (ecos504/505), `ey-rc-514-515` (ecos514/515) and `ey-rc-311` (ecos311). Related families: ecoUnit room units, ecoLink I/O modules and the ecosCom581 radio interface. | ecos504 (06, 07, 08, 13); "eco" in "(eco/ modu / EY)" (07) |
| EGQ | branch only | **Yes** | 4 entries in the family "Air Quality Sensors" ("Senzori Calitate Aer"). `egq-110` and `egq-120` are air quality sensors. `egq-212` and `egq-220-222` are CO2 sensors. | none |
| EGH | branch only | **Yes** | 5 entries in "EGH Humidity Sensors": `egh-102`, `egh-103`, `egh-111-112`, `egh-120-130` and `egh-601`. Three of them also measure temperature, going by their descriptions. | none |
| EGP | branch only | **Yes** | 1 entry, `egp-100`, "Differential pressure transmitter for air", in "Pressure Transmitters". | none |
| Valves and actuators ("vane și servomotoare", main: "valve si actuatori") | main and branch | **Yes, as a category** | The "Actuatori" category has 85 products in 14 families. The site names no series, so nothing more can be checked. | none by name |
| Sauter Vision Center | branch only | **Yes** | `yzp-480-495`, model "SAUTER Vision Center (YZP480F200)". | "SAUTER Vision Center" (07, 08, 13) |
| ModuWeb Vision EY-WS 500 | branch only | **No** | "EY-WS" and "moduWeb Vision" appear nowhere. The only "moduWeb" text is "moduWeb Unity web server" in `ey6as80`. The unused image `web-server-for-moduweb-vision-and-moduweb500-bacnet-networks.jpg` has "moduweb vision" in its file name. No source says whether it shows EY-WS 500. | none |
| EMS 100, EMS 200 | branch only | **No** | "EMS" appears only inside the word "MEMS". The unused image `energy-data-logger-for-ems-4.jpg` has "ems" in its file name. No source says which product it shows. | none. The mockups give energy monitoring to ecos504 (06, 08). |
| SAUTER CASE Suite | main only | **Yes** | `gzs-100-150`, model "SAUTER CASE Suite (GZS150F010)", "Engineering software suite". | none |

**What this shows.**
- **Three lines SOVITECH says it uses are missing.** The catalogue has no entry for Modulo5 (named on main and the branch), ModuWeb Vision EY-WS 500 or EMS 100/200 (both named on the branch only). It has Modulo6, but not under the codes the branch gives (EY-AS660, EY-AS680).
- **The site sends readers to a page that lacks them.** The branch links its equipment list to `/produse` ("Vezi echipamentele SAUTER integrate", and "Gama este pe pagina de produse" in the article). That page has no entry for those lines. This is a gap in the website, for the website team.
- **The website does not answer question 8.** Main and the branch both name Modulo6, Modulo5 and ECOS together as equipment SOVITECH uses. The mockups use ecos504, modu525 and "modulo 6". Going by `docs/build-readiness.md` section 6, which lists modu524/525 as EY-modulo 5, these fall within the families the site names. "modu520" and the bare "EY-modulo" do not. Which generation a proposal uses, and in which roles, stays an engineering decision (rule 3).
- **It adds a point on roles.** The branch says energy monitoring uses EMS 100 and EMS 200. Mockups 06 and 08 give energy monitoring to ecos504. Neither is verified. This belongs with question 8's "which roles".
- **What it means for the guardrails.** Suppose this catalogue became the reference dataset as it stands. Case G1-3 would then reject "EY-AS660", "EY-AS680" and "EY-WS 500" in AI output, and no entry would exist for a `{{product:…}}` token (rule 2) to point at for a Modulo5 station, EY-WS 500 or EMS 100/200. Yet SOVITECH says it uses them. So the approved dataset needs a source beyond this website catalogue (see "What the approver would need to decide"). No automated guardrail check covers this yet.

### Product families that matter for a BMS proposal

The table maps the catalogue's families onto the layers of a SAUTER-based BMS. It says where a product would come from, not what to propose. Choosing products, and the generation, is an engineering decision (rule 3 and dashboards spec question 8). Any product the app shows is a proposal until an engineer confirms it. The numbers are product counts in this catalogue, and the rows add up to 178.

| Proposal layer | Families in this catalogue (products) | Notes from the source |
|----------------|---------------------------------------|-----------------------|
| Management level | SAUTER Vision Center (1); SAUTER Vision Services (1); Digital Services Remote Management (1); Digital Services Customer Portal (1); Mobile Building Services (1); Digital Services Gateways (2); SAUTER CASE Suite (1). Total 8. | Vision Center is the "Building management platform". Vision Services are "cloud modules for energy monitoring, building management and analysis, without local hardware". The CASE Suite is "for the design, engineering and commissioning of SAUTER automation stations", an engineering tool. Whether it appears in a proposal is for SOVITECH to say. The unmerged branch says SOVITECH also uses ModuWeb Vision EY-WS 500 for supervision and EMS 100 and EMS 200 for energy monitoring. Neither has an entry. |
| Automation stations and their modules | modulo 6 Automation Stations (2); modulo 6 I/O Modules (4); modulo 6 Connection Modules (3); modulo 6 Communication Modules (2); modulo 6 BACnet Router (1); modulo 6 Operating Unit (1); modulo Power Supplies (1). Total 14. | `ey6as60` is "for controlling and monitoring medium-sized HVAC installations", and `ey6as80` is "for large HVAC installations". The communication modules integrate "third-party Modbus/RTU devices" (`ey6cm20`) and "heat and electricity meters" over M-Bus (`ey6cm30`). There are no EY-modulo 5 stations in the catalogue, although the site says SOVITECH works with Modulo5. |
| Room automation | ecos Room Automation Stations (3); ecoLink I/O Modules (4); ecosCom581 EnOcean Radio Interface (1); ecoUnit Wired Room Units (4); ecoUnit EnOcean Room Units (3); Compact VAV Controllers (2). Total 17. | ecos504/505 handles "up to eight rooms or eight flexible room segments". ecos311 is a "Compact 230 V controller for fan coil units, chilled ceilings, radiators, lighting and blinds". One of the two VAV controllers (`asv215bf152`) is for laboratories and pharma. |
| Stand-alone controllers and thermostats | equitherm Heating Controllers (3); flexotron400 RDT Controllers (1); Fan Coil Room Thermostats (3); TUC Universal Thermostats (2, one of them an immersion sleeve); Modbus Fan Coil Thermostats (1); Electronic Room Thermostats (2); Control Signal Distributors (2). Total 14. | These are relevant when a document shows one already installed, or when an engineer chooses local control. Reuse of existing devices is never assumed (rule 1). |
| Field devices: sensors | EGT Temperature Sensors (8, including one immersion-sleeve entry); EGH Humidity Sensors (5); Air Quality Sensors (4); viaSens Smart Sensors (1); TFL Frost Monitors (2); HSC and HBC Humidistats (3); Pressure Switches and Differential Pressure Switches (6); Pressure Transmitters (4); Air Flow Sensors (3). Total 36. | `dsl-dsh` is named "SIL 2 certified pressure limiters". That certification is the website's statement and is not checked here. |
| Field devices: valves and actuators | All 14 families of the "Actuatori" category (85), plus SAIO 100 I/O Module (1). Total 86. | Valves: unit 5, threaded 4, flanged 13, ball 9, 6-way 1, rotary and butterfly 3, Valveco dynamic 3, Valveco VDL balancing 2. Actuators: Smart Actuators 8 (including one cable entry), unit valve 5, AVM/AVN linear 10, spring-return 3, AKM/AKF rotary 5, damper and rotary 14. `asf-112-113` is described as "for safety functions on air dampers", but the catalogue does not say any actuator is rated for fire or smoke dampers. Those dampers are life-safety equipment that the BMS only monitors (rule 11). |
| Existing-system integration | moduNet Communication Modules (2) | `ey-bu-292` integrates "novaNet EY3600 and modulo 2 stations into Ethernet LAN/WAN networks". `eyz-291` is a "novaNet bus access router". They matter only where a document or a survey shows an existing novaNet installation. |
| Laboratory only | Laboratory Fume Cupboard Panel (1) | `fccp-200` works "according to EN 14175-2". `asv215bf152` (in Room automation) and `sgu-100` (in sensors) are also laboratory products. |

**What a proposal needs that this catalogue does not have:**
- point and I/O capacities as typed numbers (today they are free text such as "3200 BACnet objects, of which 1600 I/O");
- which room units work with which stations, as data;
- lifecycle status;
- the lines SOVITECH says it uses but this catalogue lacks: Modulo5 stations, ModuWeb Vision EY-WS 500, and EMS 100 and EMS 200 (see "Product families SOVITECH says it works with");
- prices.

Prices come only from stored price records, and the proposal names its pricing stage (rule 10). None of these can be filled in from this folder.
