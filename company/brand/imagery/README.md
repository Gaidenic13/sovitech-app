# Website imagery

The non-product photos and pictures that the SOVITECH website's code references, copied from its `public/` folder and sorted by what they show.

This folder holds two sets. Keep them apart:
- **`main` (the five folders in the first table below).** All but one are displayed on the site. `bucharest-modern-skyline-office-buildings.jpg` is only listed in a data array that never renders it (see its row). Every image in these five folders appears to be AI-generated or stock-style illustration. None is a verified photo of a SOVITECH project, a client building or a real person, so under proposal 7.2.9 (not yet approved) the app could use them only captioned "Illustration".
- **The unmerged branch `redesign-2026` (`reference-projects/` and `services-redesign-2026/`).** These come from a branch that is not SOVITECH's current position and will not be merged (owner decision, 2026-09-24). They are kept for reference only. They are different in kind: most of the reference images look like real photographs of real buildings, labelled with client names. The repository names no photographer, source or permission for them. See the two branch sections at the end of this file before using any of them.

Source for the `main` set: website repository github.com/Gaidenic13/sovitech-website, commit e0806142735dbdd53b913af30102f9227b380475 (2026-08-11), folder `public/`. Usage was found by searching `app/`, `components/`, `lib/`, `hooks/`, `styles/` and `next.config.mjs` for each file name. No image path in the code is built from a variable, so a file-name search finds every use. A file name found in a data array was checked for rendering. `components/blog-slider.tsx` holds image paths it never renders. Product photos (`public/products/`, 212 files) are not covered here. Logos and the building mark are in [`../logo/`](../logo/).

## Rules for using the `main` images in the app

Sources, in this project: `design/dashboards-spec.md` section 7.2, proposal 9 (7.2.9) and its batch 2 sharpening; `docs/guardrails.md` rules 1 and 2.1 and section 10.

1. **Always "Illustration".** Proposal 7.2.9 says a photo presented as the building, a room or an asset must be an uploaded photo with its source. Everything else is captioned "Illustration". None of these images is an uploaded project photo. It is a proposal, not yet an approved rule, but nothing here could pass it as a real photo anyway.
2. **Never as a real person.** Do not use the portraits in `people/` for SOVITECH staff, client contacts, testimonial authors or avatars. The website gives each of them invented-looking names (see "Flags in detail").
3. **Never as a named client's building.** The images in `client-building-illustrations/` are shown on the site as Therme București, Radisson Blu București and Rompharm. They are not photos of those sites.
4. **No demo imagery with real-brand signage.** Batch 2 of proposal 9 would ban signage such as "RADISSON BLU" in illustrative demo imagery (a proposal, not yet approved). No `main` image shows legible brand signage. Eleven of the branch's reference pictures do (see "Branch folder `reference-projects/`"). `bucharest-modern-skyline-office-buildings.jpg` has an illegible sign on one tower roof.
5. **Figures next to these images are marketing copy.** The case-study cards pair these images with savings, payback and CO₂ figures. They are not verified engineering data and not an approved reference dataset. The app may not use them as values (guardrails rule 1, 2.1 and section 10). Some are quoted below only to identify where an image is used.

## Folder layout

| Folder | Images | What it holds |
|--------|-------:|---------------|
| [`people/`](people/) | 3 | Head-and-shoulders portraits, used as testimonial photos, author photos and avatars |
| [`services/`](services/) | 4 | People at work, used as the hero image of each service page |
| [`client-building-illustrations/`](client-building-illustrations/) | 7 | Illustrations of hotels, spas and factories, shown on the site as named clients' buildings. The case-study text is in `company/business/case-studies/`. |
| [`buildings-and-cities/`](buildings-and-cities/) | 2 | Generic city skylines listed for Romanian market articles. Only `romania-cityscape-modern-buildings.jpg` is displayed. |
| [`dashboards-and-diagrams/`](dashboards-and-diagrams/) | 2 | A generated dashboard screen and a generated wiring diagram |
| [`reference-projects/`](reference-projects/) | 20 | **Branch `redesign-2026` only.** Pictures of reference clients' buildings, named after the clients. 18 look like real photographs and 2 are architectural renders. Provenance and permission unknown. See "Branch folder `reference-projects/`". |
| [`services-redesign-2026/`](services-redesign-2026/) | 4 | **Branch `redesign-2026` only.** Dark, photoreal Canva images for the four service cards on the branch home page. Probably AI-generated. See "Branch folder `services-redesign-2026/`". |

The rules above were written for the `main` set. Each branch folder has its own proposed rules in its section. They await approval and are not in force, apart from the points each section marks as in force.

There is no `sectors/` or `products-and-devices/` folder. The sector pages show `placeholder.svg`, not the `sector-*.jpg` photos (`lib/sector-data.ts`, the `image` field of every sector). The device photos in `public/` are not used by any page. `sector-industrial-factory.jpg` is the only `sector-*` photo in use, and the site uses it as a Rompharm case-study image, so it is in `client-building-illustrations/`.

## Copied images (`main`)

Source for each row: the files named in the "Where the site uses it" column. Every image was added in commit c9743c3 (2026-07-07), "Initial commit: import v0 project". File sizes and checksums match the originals.

Flag codes: **P** = portrait presented as a named real person. **C** = presented as a named client's building or site. **T** = people presented as the SOVITECH team at work. **L** = presented as a named real place. **U** = generated screen or diagram with unreadable pseudo-text. Every image also needs the "Illustration" caption (rule 1 above).

| File | Category | What it shows | Where the site uses it | Dimensions | Flags |
|------|----------|---------------|------------------------|------------|-------|
| `professional-male-engineer-headshot.jpg` | people | Studio portrait of a bearded man in a blue blazer and white shirt, grey background | `app/page.tsx`: first of three round greyscale avatars in the hero, next to "De încredere în **30+** proiecte BMS finalizate" ("Trusted across 30+ completed BMS projects"). `app/servicii/page.tsx`: testimonial photo for "Alexandru Ionescu", "Director Tehnic, Therme Bucharest". `app/resurse/articole/eficienta-bms/page.tsx` and `app/resurse/articole/optimizare-hotel-bms/page.tsx`: author photo for "Andrei Popescu", "Director Tehnic, Sovitech" | 1024×1024, 86 KB | P |
| `asian-woman-professional-smiling-headshot.jpg` | people | Portrait of a smiling woman in a white embroidered jacket, light office background | `app/page.tsx`: second hero avatar. `app/servicii/page.tsx`: testimonial photo for "Maria Popescu", "Facility Manager, Radisson Blu" | 1024×1024, 67 KB | P |
| `businessman-professional-portrait.jpg` | people | Portrait of a man in a navy pinstripe suit and open white shirt, office background | `app/page.tsx`: third hero avatar. `app/servicii/page.tsx`: testimonial photo for "Dan Georgescu", "Director Operatiuni, Rompharm" | 1024×1024, 93 KB | P |
| `services-engineering-design.jpg` | services | Four people at desks. Two monitors show a 3D block model and a coloured schematic | `app/servicii/proiectare/page.tsx`: hero image, alt "Proiectare BMS - Echipă de ingineri" ("BMS Design - Engineering team") | 1024×1024, 120 KB | T |
| `services-installation-work.jpg` | services | Technician in safety glasses testing ceiling cabling with a multimeter, cable trays and ducts overhead | `app/servicii/executie/page.tsx`: hero image, alt "Execuție BMS - Instalare echipamente" ("BMS Execution - Equipment installation") | 1024×1024, 123 KB | T |
| `services-maintenance-support.jpg` | services | Older man in a blue shirt typing on a laptop in front of a rack of network and DIN-rail modules with patch cables | `app/servicii/mentenanta/page.tsx`: hero image, alt "Mentenanță BMS - Echipă de service" ("BMS Maintenance - Service team") | 1024×1024, 188 KB | T |
| `services-system-integration.jpg` | services | Man wiring a row of control cabinets with DIN-rail modules and small displays, in an industrial hall | `app/servicii/integrare/page.tsx`: hero image, alt "Integrare sisteme BMS" ("BMS system integration") | 1024×1024, 161 KB | T |
| `luxury-hotel-lobby-modern-interior.jpg` | client-building-illustrations | Double-height hotel lobby: marble floor, tall arched windows, lounge seating, a staircase to a gallery | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`: hero, alt "Radisson Blu București — lobby de hotel modern". `components/case-study-slider.tsx` (home page): Radisson Blu Bucharest slide. `components/blog-slider.tsx` (home page) lists it as the `image` of the card "Radisson Blu București: automatizare de hotel 5 stele", but the card does not render it (the card is a pastel panel with no photo). `app/resurse/articole/optimizare-hotel-bms/page.tsx`: hero, alt "Interior hotel modern cu sistem de automatizare" | 1024×1024, 203 KB | C |
| `luxury-hotel-modern-building.jpg` | client-building-illustrations | Low-angle view of a glass-and-stone mid-rise building on a street corner, overcast sky. No legible signage | `app/ghid-bms/case-studies/page.tsx`: card "Radisson Blu București". `app/ghid-bms/resurse/page.tsx`: card, alt "Radisson Blu" | 1024×1024, 197 KB | C |
| `modern-spa-building-thermal-pools.jpg` | client-building-illustrations | Two-storey glass pavilion at dusk with outdoor pools, rock edging and a small fountain | `app/ghid-bms/case-studies/page.tsx`: card "Therme București". `app/ghid-bms/resurse/page.tsx`: card, alt "Therme Bucuresti" | 1024×1024, 198 KB | C |
| `thermal-spa-modern-building.jpg` | client-building-illustrations | Aerial view of a white glass building beside rectangular outdoor pools, forest and hills behind | `app/resurse/studii-de-caz/therme-bucuresti/page.tsx`: hero, alt "Therme București — complex spa și wellness". `components/case-study-slider.tsx` (home page): Therme Bucharest slide. `app/resurse/articole/eficienta-bms/page.tsx`: "Ultimele articole" card "Cum a redus Therme București costurile cu 38% prin automatizare BMS" | 1024×1024, 222 KB | C |
| `therme-bucuresti-spa-exterior-modern.jpg` | client-building-illustrations | Long, low glass-and-metal building with a paved path and lawn, clear sky | `app/resurse/articole/optimizare-hotel-bms/page.tsx`: related-article card, alt "Therme Bucuresti". `components/blog-slider.tsx` (home page) lists it as the `image` of the card "Cum a redus Therme București costurile cu 38%", but the card does not render it (the card is a pastel panel with no photo) | 1024×1024, 132 KB | C |
| `pharmaceutical-manufacturing.png` | client-building-illustrations | Clean-room production floor with stainless-steel machines and workers in white coveralls and hairnets | `app/ghid-bms/case-studies/page.tsx`: card "Rompharm Company". `app/ghid-bms/resurse/page.tsx`: card, alt "Rompharm" | 1024×509, 735 KB | C |
| `sector-industrial-factory.jpg` | client-building-illustrations | Large factory hall with rows of aluminium-frame automation cells and orange robot arms | `components/case-study-slider.tsx` (home page): Rompharm Company slide, alt "Rompharm Company", industry "Farmaceutic" | 1024×1024, 301 KB | C |
| `bucharest-modern-skyline-office-buildings.jpg` | buildings-and-cities | Cluster of glass office towers behind a road and a green strip, blue sky. Illegible sign on the tallest tower | **Not displayed anywhere on the site.** `components/blog-slider.tsx` (home page) lists it as the `image` of the card "Piața BMS din România: tendințe și previziuni 2026" (linking to `/resurse/raport-piata`), but the card does not render it (the card is a pastel panel with no photo). Kept here because it was already copied | 1024×1024, 161 KB | L (by file name only) |
| `romania-cityscape-modern-buildings.jpg` | buildings-and-cities | Glass towers behind a row of older classical buildings on a wide boulevard | `app/resurse/articole/eficienta-bms/page.tsx`: "Ultimele articole" card "Piața BMS din România: Tendințe și previziuni 2026" | 1024×1024, 190 KB | L |
| `modern-building-automation-dashboard-with-energy-c.jpg` | dashboards-and-diagrams | A wall screen in a white room showing an energy dashboard of bar and area charts in teal and orange. The labels are pseudo-text | `app/resurse/articole/eficienta-bms/page.tsx`: hero, alt "Dashboard BMS cu grafice energie". `components/blog-slider.tsx` (home page) lists it as the `image` of the card "Cât de eficiente sunt sistemele BMS la reducerea costurilor?", but the card does not render it (the card is a pastel panel with no photo). `app/resurse/articole/optimizare-hotel-bms/page.tsx`: related-article card, alt "Eficiența BMS" | 1024×1024, 124 KB | U |
| `building-automation-technical-diagram.jpg` | dashboards-and-diagrams | Poster-style schematic titled "Building Automation System": cabinets, panels and coloured wiring with a legend. Almost all small text is pseudo-text | `app/resurse/articole/eficienta-bms/page.tsx`: "Ultimele articole" card "Integrarea protocoalelor BACnet și KNX: Ghid complet 2026" | 1024×1024, 141 KB | U |

Notes on the pages that use them:

- The four service pages under `app/servicii/` are linked from each other and from `app/sitemap.ts`. The home page's service cards (`components/services-showcase.tsx`) link to anchors on `/servicii` and show `placeholder.svg`, not these photos.
- `app/ghid-bms/case-studies/page.tsx` is linked from `app/ghid-bms/calculator/page.tsx` and `app/ghid-bms/dashboard/page.tsx`. No link to `app/ghid-bms/resurse/page.tsx` was found in `app/` or `components/`.
- The "Ultimele articole" cards in `app/resurse/articole/eficienta-bms/page.tsx` link to `#`.

## Why these look AI-generated

Source: the image files in `public/`, and the commit history of the website repository.

- `pharmaceutical-manufacturing.png` carries IPTC metadata that says so: `DigitalSourceType` = `trainedAlgorithmicMedia` and `Credit` = "Made with Google AI". Two unused files carry the same marker: `professional-headshot.png` and `renewable-energy-landscape.png`.
- The JPEGs carry no provenance metadata. For them this is a judgement from the images, not proof:
  - all are 1024×1024 squares;
  - their file names read like image prompts cut at 50 characters, for example `modern-building-automation-dashboard-with-energy-c.jpg`;
  - the dashboard and diagram contain pseudo-text instead of words;
  - all arrived in one commit named "Initial commit: import v0 project".
- None of the building images is identifiable as the real Therme București, Radisson Blu București or Rompharm site.

## Flags in detail

### People presented as named real people (P)

Sources: `app/page.tsx`, `app/servicii/page.tsx`, `app/resurse/articole/eficienta-bms/page.tsx`, `app/resurse/articole/optimizare-hotel-bms/page.tsx`, `components/case-study-slider.tsx`, `lib/sector-data.ts`.

- **One face, two people.** `professional-male-engineer-headshot.jpg` is "Andrei Popescu, Director Tehnic, Sovitech" on two article bylines. On `/servicii` it is "Alexandru Ionescu, Director Tehnic, Therme Bucharest".
- **One name, two jobs.** `lib/sector-data.ts` also uses "Andrei Popescu", as "Facilities Director, Bucharest Business Park" in the office sector testimonial (no photo there).
- **Different contact names for the same client.** The testimonials on `/servicii` and the home-page case-study slider name different people for the same role:

  | Client | `app/servicii/page.tsx` (with photo) | `components/case-study-slider.tsx` (no photo) |
  |--------|--------------------------------------|-----------------------------------------------|
  | Therme Bucharest | Alexandru Ionescu, Director Tehnic | Ion Popescu, Director Tehnic |
  | Radisson Blu | Maria Popescu, Facility Manager | Maria Ionescu, Facility Manager |
  | Rompharm | Dan Georgescu, Director Operatiuni | Andrei Vasile, Director Operatiuni |

  The names and quotes look invented. Do not import them into the app as contacts, testimonials or evidence.
- The three portraits also form the home-page avatar row beside the "30+ proiecte BMS finalizate" ("30+ completed BMS projects") claim. That figure is marketing copy.

### Images presented as client buildings (C)

Sources: the files named in the table rows marked C.

- Therme București is shown with three different buildings: `thermal-spa-modern-building.jpg`, `therme-bucuresti-spa-exterior-modern.jpg` and `modern-spa-building-thermal-pools.jpg`.
- Radisson Blu București is shown with an interior (`luxury-hotel-lobby-modern-interior.jpg`) and a separate exterior (`luxury-hotel-modern-building.jpg`).
- Rompharm, a pharmaceutical client, is shown with a clean room (`pharmaceutical-manufacturing.png`, marked "Made with Google AI") in `app/ghid-bms/`, and with a robot assembly hall (`sector-industrial-factory.jpg`) on the home page.
- In `components/case-study-slider.tsx`, the Rompharm slide has `slug: "therme-bucuresti"`. Its "Read" link opens the Therme case study.
- The app's mockups show the demo project as Radisson Blu Bucharest, with fictional data about a real hotel. Owner decision, 2026-09-24: the app's demo no longer uses the real hotel's name (working name "Demo Hotel Bucharest"). Near these images, the website states hotel facts: "5 stele", "428 camere" (`app/ghid-bms/`), and "12 săli de conferințe, un ballroom pentru 500+ invitați" (`app/resurse/articole/optimizare-hotel-bms/page.tsx`). That is marketing copy, not a source for the demo's data.
- The figures next to these images disagree between pages. Therme's reduction is "35%" in `app/ghid-bms/case-studies/page.tsx`, `app/ghid-bms/resurse/page.tsx` and `components/case-study-slider.tsx`, and "38%" in `components/blog-slider.tsx`, `app/servicii/page.tsx` and the article cards. They are recorded here only to show that they are unreliable. They are not data.

### Client reference photos (`ref-*.jpg`)

Source: `public/ref-*.jpg`, `app/resurse/articole/optimizare-hotel-bms/page.tsx`.

The six `ref-*.jpg` names point to client references: `ref-floreasca-business.jpg`, `ref-liceu-francez.jpg`, `ref-radisson-blu.jpg`, `ref-rompharm.jpg`, `ref-scoala-germana.jpg` and `ref-therme-nord.jpg`. **None is a photo.** All six are byte-identical copies of a grey "image" placeholder. They are PNG data despite the `.jpg` extension, 1200×1200, 11 KB. `sector-education-campus.jpg` is the same file. `main` has no real photo of any client building. The unmerged branch adds pictures of named client buildings; see "Branch folder `reference-projects/`" below.

Only `ref-radisson-blu.jpg` is used. It sits under the heading "Radisson Blu București: un exemplu de ospitalitate sustenabilă", with the alt text "Hotel Radisson Blu București". So the live article shows a grey placeholder where a photo of the hotel should be. None of the `ref-*` files was copied. If SOVITECH has real reference photos, they should come from the company with their source and permission to use them.

### Team and places (T, L)

Sources: `app/servicii/*/page.tsx`, `components/blog-slider.tsx`, `app/resurse/articole/eficienta-bms/page.tsx`.

- The service heroes carry alt text such as "Echipă de ingineri" and "Echipă de service" ("Engineering team", "Service team"). That presents the generated people as SOVITECH's team.
- `romania-cityscape-modern-buildings.jpg` illustrates an article card about the Romanian BMS market. `bucharest-modern-skyline-office-buildings.jpg` is only named in the data of a similar home-page card, which does not render it. Neither is a recognisable view of Bucharest.

### Dashboards and diagrams (U)

Source: `app/resurse/articole/eficienta-bms/page.tsx`, `app/resurse/articole/optimizare-hotel-bms/page.tsx`.

The dashboard is not a SAUTER, SOVITECH or app screen, and its charts carry no real data. The diagram is not a real wiring or protocol diagram. Do not use either to suggest what the app or a SAUTER system looks like.

## Skipped images

Source: `public/` (74 files at the top level) and the usage search described at the top.

### Placeholders (12)

| File | Reason |
|------|--------|
| `ref-radisson-blu.jpg` | Used by `app/resurse/articole/optimizare-hotel-bms/page.tsx`, but it is the grey placeholder, not a photo. Client reference name. |
| `ref-floreasca-business.jpg` | Placeholder, not used. Client reference name. |
| `ref-liceu-francez.jpg` | Placeholder, not used. Client reference name. |
| `ref-rompharm.jpg` | Placeholder, not used. Client reference name. |
| `ref-scoala-germana.jpg` | Placeholder, not used. Client reference name. |
| `ref-therme-nord.jpg` | Placeholder, not used. Client reference name. |
| `sector-education-campus.jpg` | Placeholder (same file as the `ref-*` images), not used |
| `placeholder.svg` | Placeholder. Used widely as a stand-in image, including every sector hero (`lib/sector-data.ts`), the home-page service cards and the article lists |
| `placeholder.jpg` | Placeholder (1×1), not used |
| `placeholder-user.jpg` | Placeholder avatar, used in `app/resurse/page.tsx` |
| `placeholder-logo.png` | Placeholder, not used |
| `placeholder-logo.svg` | Placeholder, not used |

### Logos and icons (8)

| File | Reason |
|------|--------|
| `logo.svg` | Logo, used in `components/header.tsx`. It is in [`../logo/`](../logo/). |
| `logo-white.svg` | Logo, used in `components/footer.tsx`. It is in [`../logo/`](../logo/). |
| `building.svg` | Building mark, used as the map pin in `app/contact/page.tsx`. It is in [`../logo/`](../logo/). |
| `sovitech-logo.svg` | Logo file, not used by the site |
| `icon.svg` | Favicon, `app/layout.tsx` |
| `icon-light-32x32.png` | Favicon, `app/layout.tsx` |
| `icon-dark-32x32.png` | Favicon, `app/layout.tsx` |
| `apple-icon.png` | Touch icon, `app/layout.tsx` |

### Not used by the site, off-topic template leftovers (16)

None of these is referenced anywhere in the code. Their subjects (investment, finance, venture funds, law firms, generic offices) do not match SOVITECH's business.

| File | What it shows |
|------|---------------|
| `angellist-intelligence-dashboard.jpg` | App-icon grid labelled "AngelList Intelligence" |
| `businessman-on-phone-call-discussing-scout-fund-in.jpg` | Man in a suit on a phone call |
| `diverse-team-member-smiling-professional-headshot.jpg` | Portrait of a smiling woman in navy |
| `excel-generation-visualization.jpg` | Network graphic with a "zaxcel" logo and a spreadsheet |
| `financial-charts-and-graphs-data-analysis.jpg` | Man pointing at financial charts on a monitor |
| `modern-office-space-with-ai-technology-screens.jpg` | Open-plan office with wall screens |
| `orrick-partners-headshots.jpg` | Two people in business suits |
| `person-using-mobile-phone-for-investment-app-spv-m.jpg` | Man looking at a phone app with charts |
| `professional-business-meeting-presentation.jpg` | Man presenting a chart to a meeting |
| `professional-headshot.png` | Portrait of a smiling woman in a black blazer. Metadata: "Made with Google AI" |
| `professional-using-tablet-for-investment-managemen.jpg` | Man in an office using a tablet |
| `professional-woman-in-business-meeting-discussing-.jpg` | Woman presenting in a glass meeting room |
| `startup-office-collaborative-workspace.jpg` | Loft office with people at desks |
| `stock-market-trading-floor-financial-charts.jpg` | Trading desk with stock charts |
| `tablet-showing-digital-subscription-dashboard-and-.jpg` | Tablet showing a "Digital Subscription" dashboard |
| `video-conference-call-remote-team-meeting.jpg` | Meeting with a video call on a wall screen |

### Not used by the site, on topic (20)

These fit SOVITECH's subject but no page references them, so they were not copied. They have the same generated character as the copied set. None of the devices is a recognisable SAUTER product, so none may stand for a real product or asset. If the user wants any of them as spare illustrations, they are in `public/` of the website repository at the commit above.

| File | What it shows |
|------|---------------|
| `air-quality-sensor-device-modern-white.jpg` | White square sensor with a small screen, blue background |
| `bms-control-room.jpg` | Control room with a wall of monitors showing charts and floor plans |
| `building-automation-protocols-technical-diagram.jpg` | Poster diagram titled "Building Automation Protocols". Labels include BACnet and Modbus; much of the text is misspelled |
| `building-automation-sensors-equipment-close-up.jpg` | Wall-mounted sensors and a red indicator light on a grey panel |
| `building-management-software-dashboard-screen.jpg` | Monitor showing a generic building dashboard |
| `hvac-valve-actuator-servomotor-modern.jpg` | Rendered servomotor-like device on a dark background |
| `modern-building-automation-controller-device.jpg` | Wall touch panel showing a dark dashboard, office behind |
| `modern-building-automation-dashboard-with-energy-e.jpg` | "Energy Efficiency" dashboard with pseudo-text labels |
| `modern-smart-thermostat-touchscreen-white.jpg` | White wall thermostat with a touchscreen |
| `network-gateway-device-technology-modern.jpg` | Black network box with lit ports |
| `renewable-energy-landscape.png` | Solar panels and wind turbines at sunset. Metadata: "Made with Google AI". 1024×631 |
| `sector-horeca-hotel.jpg` | Tall hotel atrium with lounge seating |
| `sector-medical-hospital.jpg` | Low white clinic building and car park |
| `sector-office-building.jpg` | Blue glass office tower against blue sky |
| `sector-retail-mall.jpg` | Mall atrium with escalators and shop fronts |
| `services-commissioning-training.jpg` | Group around a touch table showing a control interface |
| `services-consultation-meeting.jpg` | Group reviewing drawings on a table |
| `services-hero-building.jpg` | Corner of a blue glass building against sky |
| `technical-hardware-equipment.jpg` | Workbench and pegboard with DIN-rail devices and actuators |
| `technical-software-dashboard.jpg` | Monitor showing an energy dashboard with energy-label bars |

### Remote image, not in `public/`

`https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fingerprint-59QWj1Ik1Fd1hqzZduTrEqLz2j557z.svg` is a decorative "fingerprint" SVG shown at 3% opacity in the heroes of `app/servicii/page.tsx`, `app/servicii/executie/page.tsx`, `app/servicii/mentenanta/page.tsx`, `app/sectoare/page.tsx`, `app/resurse/referinte/page.tsx`, `app/ghid-bms/page.tsx` and `app/contact/page.tsx`. It is hosted outside the repository and was not downloaded. Owner decision, 2026-09-24: it stays not downloaded (asked whether to download it, the owner answered "no"). See [`../logo/README.md`](../logo/README.md), "Fingerprint motif".

## Unmerged branch `redesign-2026` (reference only, will not be merged)

Source: the unmerged branch `origin/redesign-2026` of the same repository, commits `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala") and `af81353` (2026-08-27, "Materiale vizuale noi: 10 coperti si 15 diagrame"). Paths: `public/`, and image paths searched in `app/`, `components/` and `lib/` at `af81353`. This branch is not merged into `main`. Owner decision, 2026-09-24: it is not SOVITECH's current position and will not be merged. Everything here is kept for reference only. The sections above describe `main` at `e080614`, the current website.

**What was copied from the branch.** Three of its new image folders, byte for byte, each file checked against the original with `cmp`:
- `public/referinte/` (20 files) to [`reference-projects/`](reference-projects/);
- `public/servicii/` (4 files) to [`services-redesign-2026/`](services-redesign-2026/);
- `public/parteneri/` (6 logos) to [`../partner-logos/`](../partner-logos/), which has its own README.

All 30 were added in `d2d15d2`. The covers (`public/coperti/`) and diagrams (`public/diagrame/`) are not in this folder. Byte-identical copies are in `company/business/articles/covers/` and `company/business/articles/diagrams/`.

**How the images were checked.** Dimensions, EXIF, XMP, IPTC and JPEG comments were read with Python (Pillow). Each file was also searched for AI-provenance markers: IPTC `DigitalSourceType` (`trainedAlgorithmicMedia`), "Made with Google AI", C2PA or JUMBF manifests, and the names of common image generators. **No branch image carries any of them.** That proves nothing either way, because many tools strip these markers or never write them. The verdicts below are judgements from the images and their metadata.

What else changes on the branch:

- **Copied `main` images the branch stops using.** The three portraits in `people/`, the four service photos in `services/` and `bucharest-modern-skyline-office-buildings.jpg` are still in `public/` but no file references them. `components/blog-slider.tsx` now builds its cards from `lib/article-cards.ts` and has no `image` field at all. The home page no longer renders the case-study slider or the customer spotlight, so `sector-industrial-factory.jpg` is referenced only by a component no page renders (`components/case-study-slider.tsx`). The other copied images stay on the two old articles (`app/resurse/articole/`), the two case-study pages (`app/resurse/studii-de-caz/`) and `app/ghid-bms/case-studies/page.tsx`. The old articles and case-study pages still exist on the branch, but they are linked only from each other and from the unrendered spotlight component, and they are not in `app/sitemap.ts`.
- **New folders.** `public/coperti/` (10 article covers, 1920×1080), `public/diagrame/` (15 article diagrams, 1200×1200), `public/parteneri/` (6 logos), `public/servicii/` (4 service images, 1086×1448) and `public/referinte/` (20 pictures named after reference clients).
- **Covers and diagrams (copied to `company/business/articles/`, not here).** Their XMP says they were made in Canva, in the account "Cristian Gaidenic's team", between 2026-08-24 and 2026-08-26. They are flat infographics in the brand palette, with the SOVITECH logo in a bottom corner. Each cover leads with a large light figure, such as "15", "100" or "4-18" (EUR/mp). Those figures are article marketing copy, not data. [`../README.md`](../README.md) section 15 describes them as part of the branch's visual identity.

## Branch folder `reference-projects/`

Source: `public/referinte/` at `af81353` (added in `d2d15d2`). Usage: `app/referinte/page.tsx`, `components/references-marquee.tsx` and `lib/sector-data.ts` on the branch. Reference only; the branch will not be merged.

Usage codes:
- **R** = the branch's references page `/referinte` (`app/referinte/page.tsx`). The picture heads the project's card, with the project name as alt text and no caption or credit. The category the page files it under is given in brackets.
- **M** = the references marquee on the branch home page (`components/references-marquee.tsx`, rendered by `app/page.tsx`). Cards link to `/referinte`, and the picture zooms to 1.05 on hover.
- **S** = a sector page, through the sector's `image` field in `lib/sector-data.ts`. The picture appears in the sector list on `/expertiza` (`app/expertiza/page.tsx`) and on the sector's own page (`app/expertiza/[sector]/sector-client.tsx`). There the alt text reads "Instalație BMS, <sector>" ("<sector> BMS installation"), which presents the picture as a BMS installation in that sector, on SOVITECH's site.

"GD comment" means the file carries a JPEG comment "CREATOR: gd-jpeg v1.0", which the PHP GD image library writes when it re-encodes a picture. Web servers and content-management systems do this, so these files were probably downloaded from websites.

| File | What it shows | Where the branch uses it | Dimensions | Real photograph of the named project? |
|------|---------------|--------------------------|------------|----------------------------------------|
| `ambasada-canadei.jpg` | A modern building clad in green patinated panels, with a glazed single-storey pavilion in front, trees and a street corner | R (Educație & Instituții) | 941×519, 153 KB | Looks like a real photograph. GD comment. Nothing in the image names the building. |
| `athenee-palace-hilton-bucuresti.jpg` | A historic hotel on a corner at dusk, with a lit facade, the rooftop sign "Athénée Palace Hilton" and shop fronts including "GUCCI" | R (HORECA & Wellness) | 1024×611, 111 KB | Looks like a professional real photograph. No metadata. The signage matches the name. Real-brand signage. |
| `bcr-calea-victoriei.jpg` | A mirror-glass office block on a stone base, with a round glass tower behind, older buildings on the right and cars in the street | R (Birouri & Office), M, S (Clădiri de birouri) | 600×399, 47 KB | Looks like a real photograph. GD comment. No legible sign names the building. |
| `crowne-plaza-bucuresti.jpg` | A hotel at night, with a lit "CROWNE PLAZA" roof sign and entrance sign, string lights on the entrance canopy and conifers | R (HORECA & Wellness) | 1353×761, 206 KB | Looks like a real photograph. GD comment, and EXIF and XMP from Windows Photo Editor: created 2019-06-04 16:49 (XMP CreateDate and EXIF DateTimeOriginal), EXIF modify date 2019-06-13 15:32. The signage matches the name. Real-brand signage. |
| `floreasca-business-park.jpg` | Office towers at night, a "169" totem, and the rooftop signs "Holcim" and "ERGO" | R (Birouri & Office) | 900×636, 156 KB | Looks like a real photograph. GD comment. The rooftop signs are tenants' brands, not the park's name. Real-brand signage. |
| `floreasca-tower.jpg` | A tall glass office tower with dark horizontal bands, the edge of another glazed building, a street and trees | R (Birouri & Office), M | 600×397, 55 KB | Looks like a real photograph. GD comment. Nothing in the image names the building. |
| `lycee-francais-anna-de-noailles.jpg` | A white and blue school building with a glazed atrium entrance, an empty street with road markings and an information sign | R (Educație & Instituții) | 1000×521, 352 KB | Looks like a real photograph. GD comment. The small signs are not legible at this size. |
| `monaco-towers.jpg` | An aerial view of two tall towers among low-rise houses | R (Birouri & Office) | 960×350, 212 KB | A real photograph: EXIF from a Nikon D80, capture date 2009-08-17, saved by ACD Systems software on 2013-11-28. Nothing in the image names the towers. |
| `moncler-bacau.jpg` | The symmetrical front of a low grey and white industrial building, with a louvred glass entrance block, paving and a lawn | R (Industrial & Logistică) | 1193×634, 253 KB | Looks like a professional architectural photograph. No metadata. No signage, so nothing identifies it as Moncler or Bacău. |
| `novotel-bucuresti.jpg` | A classical facade lit at night, with a blue "NOVOTEL" sign on the modern block above it | R (HORECA & Wellness) | 1142×855, 207 KB | Looks like a real photograph. GD comment, and EXIF and XMP from Windows Photo Editor: created 2019-06-04 16:50 (XMP CreateDate and EXIF DateTimeOriginal), about a minute and a half after the Crowne Plaza file; EXIF modify date 2019-06-06 17:05. The signage matches the name. Real-brand signage. |
| `ntn-snr-fabrica-de-rulmenti.jpg` | The corner of a large clad industrial hall with a big "NTN-SNR" sign, under a blue sky | R (Industrial & Logistică), M, S (Industrial & Logistică) | 640×360, 36 KB | Looks like a real photograph. GD comment. The signage matches the name. Real-brand signage. |
| `pitesti-retail-park.webp` | A retail park frontage with "eMAG" and "Auchan" signs, planters and a pedestrian crossing | R (Retail & Shopping), M, S (Retail) | 680×510, 70 KB, WebP | A real photograph: EXIF from Picasa, capture date 2021-05-29. The signs are tenants' brands, not the park's name. Real-brand signage. |
| `radisson-blu-hotel.jpg` | A hotel entrance canopy and building front with "Radisson SAS" and "HOTEL" signs | R (HORECA & Wellness, as "Radisson Blu Hotel"), M, S (HORECA) | 800×600, 461 KB | Looks like a real photograph. No metadata. **The signs read "Radisson SAS", not "Radisson Blu"**, and nothing in the image shows the city. Real-brand signage. |
| `roman-value-centre.jpg` | A shopping centre with "ROMAN VALUE CENTRE" and "Carrefour" signs, an empty terrace and a plaza | R (Retail & Shopping) | 1920×1080, 711 KB | **An architectural render, not a photograph.** It has a computer-rendered look: spotless surfaces and no people. Saved with Photoshop CS5 on 2018-08-14. Its XMP names a PDF optimisation tool, so it was probably taken from a PDF. Real-brand signage. |
| `rompharm-company-otopeni.jpg` | An office front with a red-framed glass box, a "RomPharm" sign, a young tree and railings | R (Industrial & Logistică), M, S (Pharma) | 325×203, 22 KB | Looks like a real photograph, but it is very small. An empty Photoshop resource block, with no caption or credit. The signage matches the name. Real-brand signage. |
| `rompharm-uzbekistan.jpg` | A large clad industrial shed with a stylised rooftop sign reading "RomPharm NS", patches of snow and a blue sky | R (Industrial & Logistică) | 1280×960, 104 KB | Looks like a real photograph. No metadata. The sign carries the Rompharm name. Nothing in the image shows the country. Real-brand signage. |
| `scoala-germana-bucuresti.jpg` | An aerial view of a school campus with a sports field, a car park and trees | R (Educație & Instituții), S (Educațional & Instituții) | 1422×800, 319 KB | **An architectural render, not a photograph.** A credit in its corner reads "render // TAG visual" and "architectural design // TECTO Arhitectura". It shows a design by third parties, not the building as built. |
| `spitalul-foisor.jpg` | A six-storey white corner building with metal louvres on the upper floors, a water tower behind, tram wires and parked cars | R (Medical & Farma), M, S (Medical) | 1500×1000, 453 KB | Looks like a professional real photograph. XMP from Adobe Photoshop CC 2014. Nothing in the image names the hospital. |
| `stefan-cel-mare-building.jpg` | A glass and red-brick office facade with a "STEFAN CEL MARE building" sign over the entrance | R (Birouri & Office) | 672×1000, 138 KB | Looks like a real photograph. GD comment. The signage matches the name. |
| `therme-nord-bucuresti.jpg` | A glass dome lit at night, with palm trees inside and lit outdoor pools in front | R (HORECA & Wellness), M, S (Sport & Wellness) | 800×584, 451 KB | A real photograph from a DJI drone camera. The EXIF names a DJI FC550 camera, and the XMP names the lens "DJI MFT 15mm F1.7 ASPH", records flight attitude and a relative altitude of +9.80, and gives the raw file "DJI_0069.DNG". It was created on 2015-12-26 and edited in Photoshop CS6 on 2016-01-02 and 2016-01-03. It fits a large glazed spa, but nothing in the image names it. |

### What this set is, and what it is not

- **Mostly real photographs, two renders.** 18 look like real photographs. Three of them carry a capture date: `monaco-towers.jpg` (Nikon D80), `therme-nord-bucuresti.jpg` (DJI drone camera) and `pitesti-retail-park.webp` (saved by Picasa). `roman-value-centre.jpg` and `scoala-germana-bucuresti.jpg` are architectural renders. None looks AI-generated: they vary in size and quality, carry legible real signage, and some have camera or editing histories going back to 2009.
- **Signage matches the name on 8 pictures.** They are Athénée Palace Hilton, Crowne Plaza, Novotel, NTN-SNR, both Rompharm pictures, Ștefan cel Mare and Roman Value Centre (a render). On the other 12, no sign matches the name the branch gives them. `radisson-blu-hotel.jpg` shows a different brand name ("Radisson SAS"), two pictures show only tenants' brands, and the rest show no legible sign. Even where the sign matches, nothing shows that the picture shows the building, or the part of it, that SOVITECH worked on.
- **Provenance is unknown.** The repository names no photographer, source, licence or permission for any of them. The clues point to outside sources:
  - nine GD comments suggest the files were downloaded from websites;
  - two renders credit third parties;
  - the drone and Nikon photos predate the branch by years.

  The comment above the project list in `app/referinte/page.tsx` says the list is "sourced from sovitech.ro/referinte" and that the sizes were "verified via web search where available". It says nothing about where the photos came from.
- **Real signage, brands or building names, on 11 pictures.** They are `athenee-palace-hilton-bucuresti.jpg`, `crowne-plaza-bucuresti.jpg`, `floreasca-business-park.jpg`, `novotel-bucuresti.jpg`, `ntn-snr-fabrica-de-rulmenti.jpg`, `pitesti-retail-park.webp`, `radisson-blu-hotel.jpg`, `roman-value-centre.jpg`, `rompharm-company-otopeni.jpg`, `rompharm-uzbekistan.jpg` and `stefan-cel-mare-building.jpg`.
- **The figures on the cards are marketing copy.** Areas, room counts and bed counts next to these pictures on the branch (for example "~34.000 m² construiți", "119 paturi") are website copy. They are not verified engineering data or an approved reference dataset (guardrails rule 1, 2.1 and section 10).

### Proposed rules for the app

Sources: `design/dashboards-spec.md` proposal 7.2.9 and its batch 2 sharpening; `docs/guardrails.md` rule 1; `CLAUDE.md` (the demo project). Proposal 7.2.9 is not yet approved.

**Status.** These are proposals for the product owner, not rules in force. Rules 2 and 3 rest partly on proposal 7.2.9, which is awaiting approval: `design/dashboards-spec.md` section 7.2 says "None is applied", and `docs/guardrails.md` has no imagery rule. Rule 4 restates `docs/guardrails.md` rule 1, and the demo labelling in rule 2 comes from `CLAUDE.md`; both are in force.

1. **Do not use them until SOVITECH confirms the rights.** For each file, SOVITECH must say who made it and confirm that SOVITECH may use it. Until then, keep them as reference material only.
2. **Never in the demo project.** The demo holds fictional data. The mockups show it as a real hotel, and the app's demo no longer uses that hotel's name (owner decision, 2026-09-24). A real photograph would make the fiction look like an assessment of a real building, and would tie the demo back to the real hotel. `radisson-blu-hotel.jpg` also shows real-brand signage, which batch 2 of proposal 7.2.9 would ban in illustrative demo imagery (a proposal, not yet approved).
3. **Never as a project's own photo.** Proposal 7.2.9 would require a photo presented as the building, a room or an asset to be an uploaded photo with its source. These are website pictures, not uploads to a project.
4. **Not evidence.** A picture of a named building is not a source for any value about that building (guardrails rule 1).
5. **A render is a design.** The two renders show proposed designs, not the buildings as built.

## Branch folder `services-redesign-2026/`

Source: `public/servicii/` at `af81353` (added in `d2d15d2`). Usage: `components/services-showcase.tsx` on the branch. Reference only; the branch will not be merged.

**Where the branch uses them.** All four appear only in the services showcase on the branch home page (`app/page.tsx`). It sits in the dark band under the hero and shows four portrait cards, each linking to its service page. The alt text is the service title. On `main` these cards show `placeholder.svg`. The branch's service pages themselves open with a dark hero and no photo (`components/service-hero.tsx`).

**Metadata, identical in form on all four.** The XMP gives the creator tool as "Canva (Renderer)", with a separate Canva document id per image and the brand "Cristian Gaidenic's team". It gives the author (`pdf:Author`) as "Cristian Gaidenic", the creation date as 2026-08-16, and the titles "asd1 - 1" to "asd4 - 1". The EXIF holds only a 96 dpi resolution. There is no camera data and no AI-provenance marker.

| File | What it shows | Where the branch uses it | Dimensions | Real photograph? |
|------|---------------|--------------------------|------------|------------------|
| `proiectare-bms.jpg` | A night desk scene. A laptop shows a dark screen headed "SAUTER" and "Vision Center", with a 3D building model, an equipment tree ("AHU_01", "VAV_01" …), a properties panel and an alarm list. Drawings, a pen and a desk lamp are around it. | Card "Proiectare BMS" (BMS design), linking to `/servicii/proiectare-automatizari-bms` | 1086×1448, 175 KB | No. Probably AI-generated. The screen shows an interface under a real SAUTER product name, with values such as "Supply Temp 18.0 °C" and "Alarms 2". No source shows that this is real SAUTER software. |
| `executie-sisteme.jpg` | A man with glasses and a beard, in a dark jacket, uses a screwdriver in an open control cabinet full of DIN-rail modules and blue and orange wiring. A laptop and drawings are behind him. | Card "Execuție Sisteme" (system installation), linking to `/servicii/executie-sisteme-bms` | 1086×1448, 155 KB | No. Probably AI-generated. The cabinet label and the device markings are not legible. |
| `integrare-sisteme.jpg` | A desk monitor shows a white "M-Bus Topology" screen under a SAUTER logo. It has a menu ("Dashboard", "Topology", "Devices", "BACnet / KNX", "Modbus Gateway" …) and a tree of meters numbered 1.01 to 4.16. A notebook, a pen and a mug are on the desk, with window blinds behind. | Card "Integrare Sisteme" (systems integration), linking to `/servicii/integrare-sisteme-knx-dali-modbus-mbus` | 1086×1448, 188 KB | No. Probably AI-generated. The device labels in the diagram are pseudo-text. |
| `mentenanta.jpg` | A man in a dark jacket holds a tablet in front of open control cabinets. The tablet shows a "Maintenance Overview" table under a SAUTER logo. | Card "Mentenanță" (maintenance), linking to `/servicii/intretinere-sisteme-bms` | 1086×1448, 188 KB | No. Probably AI-generated. Most of the tablet text is pseudo-text. |

### What this set is

- **Made in Canva, probably with an image generator.** Canva can place stock photos or generate pictures, and the metadata does not say which was used. The evidence for generation:
  - pseudo-text on two of the screens;
  - a similar-looking man in two pictures;
  - the same dark, moody grade on all four.

  This is a judgement, not proof.
- **SAUTER branding on invented screens.** Three pictures show a SAUTER logo on a software screen, and one names "Vision Center". The repository has no evidence that these screens match any real SAUTER product. Treat them as invented.
- **People presented as the team at work.** No names are attached, but on a SOVITECH service card the people read as SOVITECH engineers. The branch removed the hero headshots for that reason. A code comment in `app/page.tsx` says the stock "team" headshots were "removed per copy doc: no invented people on the site." These pictures bring invented-looking people back.

### Proposed rules for the app

Source: `docs/guardrails.md` rule 1, "Identifiers and prices"; `design/dashboards-spec.md` proposal 7.2.9. Proposal 7.2.9 is not yet approved.

**Status.** These are proposals for the product owner, not rules in force. Rule 1 rests on proposal 7.2.9, which is awaiting approval (`design/dashboards-spec.md` section 7.2: "None is applied"). Rule 2 applies `docs/guardrails.md` rule 1, which is in force.

1. **"Illustration" only.** Proposal 7.2.9 would caption them "Illustration". Never present them as SOVITECH staff, a real site, a real panel or a real screen.
2. **Never as SAUTER software or products.** Rule 1 says SAUTER product names and product lines "come only from reference data". These pictures put a SAUTER product name on an invented screen. Do not use them in proposals, covers or dashboards to show what a SAUTER system looks like.
3. **Not approved for the app.** The app mockups use no imagery of this kind. Any use is a product-owner decision.
