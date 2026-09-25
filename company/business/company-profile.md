# SOVITECH company profile

What the SOVITECH website says about the company: identity, positioning, the SAUTER relationship, partners, markets, contacts, headline statistics and testimonials. It is a faithful record of marketing copy, not verified fact, and every section names the file it came from.

**Source:** repository `Gaidenic13/sovitech-website`, commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11, "Mobile-first product detail layout"). Paths below are relative to that repository's root. Imported on 2026-09-23.

**Status of the content.** Everything here is website marketing copy. None of it is verified engineering data or approved reference data. Figures (savings, payback, ROI, areas, project counts, room counts) may not be used as values in the app without an approved reference dataset (guardrails rule 1, section 2.1 and section 10). See "What the app may and may not use" in section 10.

**Unmerged branch, for reference only.** Sections 1 to 10 describe `main`, the current website. The branch `redesign-2026` (commits `d2d15d2` and `af81353`, 2026-08-24 and 2026-08-27) adds the company's legal identity, an about page and a general email address, and changes several statements below. That branch is not merged into `main`. Owner decision, 2026-09-24: it is not SOVITECH's current position and will not be merged. Its content is in sections 11 to 13, kept apart from the rest. Where it contradicts a statement in sections 1 to 10, a short note marked **Branch `redesign-2026`** follows that statement and points to section 11, 12 or 13.

---

## 1. Identity

Source: `app/layout.tsx`, `app/contact/page.tsx`, `components/header.tsx`, `components/footer.tsx`

| Item | As published | Where |
|------|--------------|-------|
| Legal name | SOVITECH CONTROL SRL | `app/contact/page.tsx` (address block) |
| Brand name in copy | "Sovitech Control" | `app/layout.tsx` (metadata), `app/page.tsx` (about text) |
| Brand name on logo alt text and copyright | "SOVITECH Control" | `components/header.tsx`, `components/footer.tsx` ("© <year> SOVITECH Control") |
| Short form in testimonials | "Sovitech" | `components/aethel-testimonials.tsx`, `app/servicii/page.tsx` |
| Email domain | sovitech.ro | `app/contact/page.tsx` |
| Site base URL in metadata and sitemap | `https://sovitech-website-gaidenic.vercel.app` (a Vercel deployment URL, not sovitech.ro) | `app/layout.tsx`, `app/sitemap.ts` |
| Default language | Romanian (`<html lang="ro">`), with an RO/EN toggle in the header | `app/layout.tsx`, `components/header.tsx` |
| Logo files referenced | `/logo.svg` (header, dark on white), `/logo-white.svg` (footer, on dark) | `components/header.tsx`, `components/footer.tsx` |

**Site metadata (verbatim, Romanian only, without diacritics as written):**
- Title: "Sovitech Control - Sisteme de automatizare si BMS"
- Description: "Sovitech Control ofera solutii complete pentru automatizare si Building Management Systems (BMS). Proiectare, executie si intretinere sisteme BMS cu tehnologie SAUTER din Elvetia."
- English gloss: "Sovitech Control offers complete solutions for automation and BMS. Design, execution and maintenance of BMS systems with SAUTER technology from Switzerland."

Note: the app's `CLAUDE.md` writes the name as "SOVITECH". The website mixes "Sovitech Control", "SOVITECH Control" and "SOVITECH CONTROL". The site does not state which form is the official brand spelling.

> **Branch `redesign-2026`:** the footer copyright reads "© <year> SOVITECH CONTROL SRL. Toate drepturile rezervate." (`components/footer.tsx`). The branch publishes the CUI, the trade register number and the founding year (section 11).

---

## 2. Who SOVITECH is, in the site's words

Source: `app/page.tsx` ("Despre noi" / "About us" section)

Heading: "Soluții complete de automatizare BMS" / "Complete BMS Automation Solutions"

| RO (verbatim) | EN (site's own translation) |
|---------------|-----------------------------|
| "Sovitech Control este unul dintre liderii din România în automatizarea clădirilor și integrarea completă BMS. Echipa noastră, cu experiență în construcții și automatizări, este pregătită să aducă clădirile la viață." | "Sovitech Control is one of Romania's leaders in building automation and full BMS integration. Our team, experienced in construction and automation, is ready to bring buildings to life." |
| "Oferim servicii complete: proiectare BMS, instalare și implementare, programare cu software licențiat, integrare de sisteme, testare și punere în funcțiune, precum și service și mentenanță." | "We offer complete services: BMS design, installation and implementation, programming with licensed software, systems integration, testing and commissioning, as well as service and maintenance." |

The "one of Romania's leaders" claim has no stated basis on the site.

The about section shows four team photos, all `/placeholder.svg`. No team members are named in this section.

> **Branch `redesign-2026`:** the home page drops the "unul dintre liderii din România" sentence and the placeholder team photos. Its about section is headed "Partener autorizat SAUTER, integrator independent" and the hero line reads "Integrator independent de automatizare a clădirilor și BMS." (`app/page.tsx`). A separate about page, `/despre-noi`, keeps its team section hidden until real names exist (section 12).

---

## 3. Positioning and value proposition

Source: `app/page.tsx`, `components/services-showcase.tsx`, `app/servicii/page.tsx`, `app/contact/page.tsx`

**Home hero** (`app/page.tsx`)
- Eyebrow: "Building Management Systems" (English in both languages)
- Headline: "Construit să controleze orice clădire. Oriunde." / "Built to control every building. Everywhere."
- Sub-copy: "Soluții BMS integrate care optimizează consumul de energie, reduc costurile operaționale și mențin confortul ocupanților în orice tip de clădire." / "Integrated BMS solutions that optimize energy consumption, reduce operational costs and maintain occupant comfort in any type of building."
- Primary CTA: "Cerere ofertă gratuită" / "Request a free quote" (links to `/contact`). Secondary arrow button goes to `/calculator-roi`.
- Trust line: "De încredere în 30+ proiecte BMS finalizate" / "Trusted across 30+ completed BMS projects"

**Services band** (`components/services-showcase.tsx`): "Ce facem" / "What we do", heading "Servicii BMS complete" / "End-to-end BMS services". Four services, detailed in `services.md`.

**Services page hero** (`app/servicii/page.tsx`)
- "Servicii complete. Rezultate garantate." / "Complete services. Guaranteed results."
- "Solutii BMS de la proiectare la mentenanta, cu echipamente SAUTER si suport dedicat pe tot parcursul ciclului de viata al sistemului." / "BMS solutions from design to maintenance, with SAUTER equipment and dedicated support throughout the entire system lifecycle."

**Cost-lock claim** (`app/servicii/page.tsx`, "DE INCREDERE" / "TRUSTED" band)
- "Blocheaza costurile de management BMS pentru 10 ani" / "Lock in your BMS management costs for 10 years"
- "Lanseaza, opereaza si scaloneaza sistemul tau BMS fara griji legate de costurile in crestere." / "Launch, operate and scale your BMS system without worrying about rising costs."
- The site gives no terms, conditions or product behind this claim.

**Closing CTA on home** (`app/page.tsx`): "Gata pentru automatizare BMS?" / "Ready for BMS automation?", "Alătură-te clienților care au încredere în Sovitech Control" / "Join the clients who trust Sovitech Control", button "Cerere ofertă" / "Request a quote".

**Contact page promise** (`app/contact/page.tsx`): "Sa vorbim." / "Let's talk."; "Echipa noastra de specialisti BMS este disponibila pentru consultatii, oferte personalizate si suport tehnic." / "Our team of BMS specialists is available for consultations, personalised quotes and technical support."; "Venim la tine" / "We come to you".

---

## 4. The SAUTER relationship, exactly as stated

Source: files listed per row. Searched the whole repository (`app/`, `components/`, `lib/`) for "partener", "partner", "autorizat", "authorised", "distribuitor", "distributor" and "integrator".

| Statement (RO, verbatim) | Site's EN | File |
|--------------------------|-----------|------|
| "Sovitech Control este partener autorizat SAUTER în România, oferind acces la cele mai avansate echipamente de automatizare a clădirilor din industrie. SAUTER, cu sediul central în Elveția, este lider mondial în sisteme de management energetic pentru clădiri." | "Sovitech Control is an authorised SAUTER partner in Romania, offering access to the most advanced building automation equipment in the industry. SAUTER, headquartered in Switzerland, is a world leader in energy management systems for buildings." | `app/servicii/executie/page.tsx` (section "Parteneriat SAUTER" / "SAUTER Partnership") |
| "Suntem partener autorizat SAUTER din Elvetia — liderul global in automatizarea BMS." | "We are an authorised SAUTER partner from Switzerland — the global leader in BMS automation." | `app/servicii/page.tsx` (FAQ) |
| "Partener autorizat SAUTER Elveția în România" | "Authorised SAUTER Partner in Romania" | `app/produse/page.tsx` (badge) |
| "Partener autorizat SAUTER în România." | (metadata, RO only) | `app/produse/layout.tsx` |
| "Ca partener autorizat al producătorului elvețian SAUTER, Sovitech oferă o gamă completă de hardware BMS (controlere, vane, senzori, termostate) și software." | "As an authorised partner of the Swiss manufacturer SAUTER, Sovitech offers a complete range of BMS hardware (controllers, valves, sensors, thermostats) and software." | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| "...cu tehnologie SAUTER din Elvetia." | (metadata, RO only) | `app/layout.tsx` |

**What this means, and what it does not say.**
- The only relationship term the site uses is **"partener autorizat" / "authorised partner"**.
- The site never calls SOVITECH a SAUTER "distributor" / "distribuitor", an "integrator", a "System Partner" or an "exclusive" partner. The word "distribuitor" appears only as a SAUTER product name in `lib/product-data.ts` ("Distribuitor electric pentru semnale de poziționare").
- The site gives no partnership tier, certificate, contract date or territory beyond "în România".
- The site does describe supply as well as integration: it hosts a "Produse SAUTER" catalogue, calls it "Gama completă SAUTER" / "Complete SAUTER Range", lists "Echipamente SAUTER" in its packages, and says it holds "stoc de piese SAUTER" (`app/servicii/page.tsx`). Whether SOVITECH resells SAUTER products under a distribution agreement is **not stated**.
- The site's EN FAQ line reads as if SOVITECH were "from Switzerland". The RO line means "an authorised partner of SAUTER from Switzerland". The EN wording is a translation slip.

> **Branch `redesign-2026`:** for its own copy, the branch disproves three statements above (tier, date, integrator) and adds more. The `main` statements stay true for `main`.
> - **Tier.** It names a tier, "Systems Partner": "Din 2017: partener autorizat SAUTER, Systems Partner." (`app/despre-noi/page.tsx`), "Systems Partner autorizat" (`app/page.tsx`), "partener autorizat SAUTER, Systems Partner, din 2017" (`app/servicii/page.tsx` FAQ).
> - **Date.** It gives a start date, 2017, the founding year (section 11). It still gives no certificate, contract or territory.
> - **Integrator.** It calls SOVITECH an "integrator independent" (`app/page.tsx`, `components/footer.tsx`, `app/despre-noi/`), and says "Firma nu are obligație de volum către un producător" (`app/page.tsx`). It still never says "distribuitor" or "exclusive".
> - **Supply.** It says SOVITECH "Nu vinde echipamente fără proiect sau fără punere în funcțiune" (`app/servicii/page.tsx`, "Ce nu face Sovitech Control") and that it "nu are un catalog propriu de vândut cu orice preț" (`app/page.tsx`). Whether a distribution agreement exists is still not stated.
> - **Products.** It names more SAUTER products (section 12.5 and the FAQ in 12.8).
> - **Trademark.** It adds "SAUTER este marcă înregistrată a Fr. Sauter AG." (`app/page.tsx`).

- SAUTER products and software named in the files covered here: controllers "Modulo5, Modulo6 si ECOS" (`app/servicii/page.tsx`, written "Modulo5/6, ECOS" in the installation step) and "SAUTER CASE Suite" programming software (`app/servicii/integrare/page.tsx`). Under guardrails rule 1, SAUTER model and product names in the app come only from reference data, not from this page.

**SAUTER benefits listed** (`app/servicii/executie/page.tsx`):
- "Echipamente certificate conform standardelor europene" / "Equipment certified to European standards"
- "Suport tehnic direct de la producător" / "Direct technical support from the manufacturer"
- "Piese de schimb disponibile pe termen lung" / "Spare parts available long-term"
- "Software actualizat constant" / "Constantly updated software"

---

## 5. Other partners listed

Source: `components/partners-marquee.tsx`

- Eyebrow: "De încredere" / "Trusted by". Heading: "Parteneri de încredere" / "Trusted Partners".
- Names shown, in order: **SAUTER, KNX, DALI, Modbus, M-Bus, BACnet, LonMark**.
- Apart from SAUTER, these are protocol and standard names, not companies. The site does not claim membership of, or certification by, KNX Association, DALI Alliance, BACnet International, LonMark International or any other body.
- A code comment says the names are "Text placeholders for now — swap in real logos later".

> **Branch `redesign-2026`:** `components/partners-marquee.tsx` shows real logo files for KNX, BACnet, Modbus, M-Bus and DALI, with no heading. A code comment says the marks were downloaded from each owner's own domain. LonMark is removed on purpose: "it is a certification mark, so showing it would assert a certification Sovitech does not hold". SAUTER moves to its own block on the home page "because it is a real commercial partnership, which the protocol marks are not".

---

## 6. Markets

### 6.1 Geography

Source: `app/page.tsx`, `app/servicii/page.tsx`, `app/contact/page.tsx`

- Romania. The about text says "unul dintre liderii din România".
- Headquarters in Bucharest (section 7).
- National service coverage is implied by the maintenance response promise: "maxim 4 ore in Bucuresti si 8 ore la nivel national" / "within 4 hours in Bucharest and 8 hours nationwide" (`app/servicii/page.tsx`).
- The services page targets "cladirilor comerciale si industriale" / "commercial and industrial buildings" (`app/servicii/page.tsx`, packages intro: "...construite pentru nevoile specifice ale cladirilor comerciale si industriale").

### 6.2 Sectors

Source: `lib/sector-data.ts` (the list rendered on the home page and at `/sectoare/<slug>`), `components/header.tsx` (navigation)

| Slug | RO title | RO subtitle | EN title | EN subtitle |
|------|----------|-------------|----------|-------------|
| civil | Birouri | Clădiri de birouri și spații comerciale | Offices | Office buildings & commercial spaces |
| medical | Medical & Farma | Spitale, clinici și producție farmaceutică | Medical & Pharma | Hospitals, clinics & pharmaceutical production |
| retail | Retail | Centre comerciale, hipermarketuri și lanțuri de retail | Retail | Shopping centres, hypermarkets & retail chains |
| horeca | HoReCa & Wellness | Hoteluri, restaurante și facilități de agrement | HoReCa & Wellness | Hotels, restaurants & leisure facilities |
| industrial | Industrial | Depozite, logistică și producție | Industrial | Warehouses, logistics & manufacturing |
| educational | Educațional | Școli, universități și campusuri | Educational | Schools, universities & campus buildings |

The header navigation lists only four sectors, with different names: "Civil & Birouri" / "Civil & Office", "Medical & Farma" / "Medical & Pharma", "Retail & HoReCa" / "Retail & HoReCa", "Industrial". It omits Educational and merges HoReCa into Retail. The home page heading for the sector grid reads "Sectoare Industriale" / "Industry Sectors" under the eyebrow "Servicii" / "Services".

Full sector content, including each sector's metrics and testimonial, is in [`sectors.md`](sectors.md).

### 6.3 Reference projects shown on the home page

Source: `components/references-marquee.tsx` (heading "Proiecte de referință" / "Reference projects", link "Vezi toate referințele" to `/resurse/referinte`)

Figures are marketing claims, recorded as written.

| Name | Location | Description (RO verbatim) | Scope (RO / EN) |
|------|----------|---------------------------|-----------------|
| Therme Nord București | București | "Sistem BMS complet pentru cel mai mare complex de wellness din Europa, ~34.000 m² construiți" | Control HVAC, iluminat, energie / HVAC control, lighting, energy |
| Floreasca Tower | București | "Sistem BMS pentru o clădire de birouri clasa A, ~7.500 m²" | Control centralizat, raportare energetică / Centralised control, energy reporting |
| Rompharm Company | Otopeni | "Sistem BMS pentru o fabrică farmaceutică cu cerințe stricte" | Control temperatură, umiditate, presiune / Temperature, humidity, pressure control |
| NTN-SNR Fabrica de Rulmenți | Sibiu | "Sistem BMS pentru o fabrică de rulmenți cu 37.000 m² suprafață de producție" | Control temperatură, ventilație industrială / Temperature control, industrial ventilation |
| Radisson Blu Hotel | București | "Automatizare BMS pentru un hotel de 5 stele cu peste 1.800 m² spații de evenimente" | BMS, control temperatură, ventilație / BMS, temperature control, ventilation |
| Spitalul Foișor | București | "Sistem BMS pentru noul spital de ortopedie, 9.000 m², 119 paturi" | BMS medical, backup sisteme critice / Medical BMS, critical systems backup |
| Pitești Retail Park | Pitești | "Sistem BMS pentru un parc de retail cu ~24.800 m² suprafață închiriabilă" | Control HVAC, iluminat, energie / HVAC control, lighting, energy |
| BCR Calea Victoriei | București | "Automatizare BMS pentru o clădire de birouri de 26.300 m² (turn + podium)" | BMS, control acces, iluminat / BMS, access control, lighting |

The full references page (25 projects) is in [`references.md`](references.md). The two case studies, Therme and Radisson Blu, are in [`case-studies/`](case-studies/).

---

## 7. Contact details

Source: `app/contact/page.tsx`, `components/footer.tsx`, `app/servicii/mentenanta/page.tsx`

### 7.1 Headquarters

| Item | As published |
|------|--------------|
| Company | SOVITECH CONTROL SRL |
| Street | Str. Dr. Nicolae D. Staicovici, nr. 35 |
| City | București, Sector 5, România (EN: "Bucharest, Sector 5, Romania") |
| Map link | Google Maps at 44.43177, 26.07940 (the map is labelled "Harta — sediul SOVITECH CONTROL, București") |
| Hours (RO, as written without diacritics) | "Luni — Vineri: 09:00 – 18:00" / "Sambata — Duminica: Inchis" |
| Hours (EN) | "Monday — Friday: 09:00 – 18:00" / "Saturday — Sunday: Closed" |

> **Branch `redesign-2026`:** the branch spells the street "Str. Dr. **Niculae** D. Staicovici nr. 35" everywhere; `main` spells it "Nicolae". It adds "CUI 38500895, Reg. Com. J40/19288/2017" to the address block, writes the hours with diacritics ("Luni-vineri: 09:00-18:00" / "Sâmbătă și duminică: închis") and says office visits are "numai pe bază de programare prealabilă" (`app/contact/page.tsx`). See sections 11 and 13.

### 7.2 Department contacts

**These are published business contacts.** They appear on the public contact page under "Contact direct" / "Direct contact". Use them only for contacting SOVITECH in its business role.

| Department (RO / EN) | Name | Phone | Email |
|----------------------|------|-------|-------|
| Tehnic / Technical | Mihai Sorica | +40 720 547 802 | mihai@sovitech.ro |
| Vânzări / Sales | Cristina Vitalariu | +40 731 338 414 | cristina@sovitech.ro |
| Media / Media | Cristian Gaidenic | +40 740 527 366 | media@sovitech.ro |

No general company phone number or general email address (such as office@ or contact@) is published in these files.

> **Branch `redesign-2026`:** the branch publishes a general email, **office@sovitech.ro** ("Adresă generală", `app/contact/page.tsx`; also `components/footer.tsx`), and a footer phone, "Telefon: +40 720 547 802". That is the same number listed for Mihai Sorica (technical). The department labels become "Tehnic, proiecte și suport" / "Technical, projects and support", "Vânzări și oferte" / "Sales and quotes" and "Media și comunicare" / "Media and communication", with the same names, phones and emails. A code comment says: "roles below to be confirmed against the Despre noi page before publication". See section 11.

### 7.3 Other contact points

- **Emergency line:** the maintenance page shows "Contact urgențe" / "Emergency contact" with the number **"+40 21 XXX XXXX"** and "Disponibil 24/7" / "Available 24/7" (`app/servicii/mentenanta/page.tsx`). This is a placeholder, not a real number.
- **Contact form** (`app/contact/page.tsx`), "Trimite-ne o cerere" / "Send us a request". Fields: Prenume, Nume, Email, Telefon, Subiect, Mesaj. Subject options: "Cerere oferta" (Request a Quote), "Consultanta BMS" (BMS Consultation), "Suport tehnic" (Technical Support), "Informatii produs" (Product Information), "Altele" (Other). Button "Trimite Mesaj" / "Send Message". The `<form>` in this file has no action or submit handler, so it does not send anything as written.
- **Footer CTAs** (`components/footer.tsx`): "Contactează-ne" / "Contact Us" and "Calculator ROI" / "ROI Calculator".
- **Header CTAs** (`components/header.tsx`): "Cerere ofertă" / "Request a quote" and "Calculator ROI" / "ROI Calculator".

> **Branch `redesign-2026`:** the placeholder emergency number is gone; no file on the branch contains "+40 21" or "XXX XXXX" as a phone. The contact form's subjects become "Evaluare a clădirii", "Cerere de ofertă", "Suport tehnic pentru un sistem existent", "Întrebare despre produse SAUTER", "Colaborare ca proiectant sau antreprenor" and "Altul". The form still has no action or submit handler. The page promises an answer "în maximum două zile lucrătoare". The footer CTA becomes "Cere o evaluare" / "Request an assessment". Form details are in [`lead-funnels.md`](lead-funnels.md) and [`legal.md`](legal.md) section 6.

### 7.4 Social links

Source: `components/footer.tsx`

| Network | Link as coded |
|---------|---------------|
| LinkedIn | `https://linkedin.com` (the LinkedIn home page, not a company page) |
| X | `https://x.com` (the X home page, not a profile) |

No real SOVITECH social profile is published in the repository. The footer's "Cariere" / "Careers", "Politica de confidențialitate" / "Privacy Policy", "Termeni și condiții" / "Terms & Conditions" and "Politica de cookie-uri" / "Cookie Policy" links all point to `/contact`. No such pages exist.

> **Branch `redesign-2026`:** the social links are removed. A code comment says they pointed at "the platforms' start pages, not company profiles", and a TODO says to restore a LinkedIn icon "once the real company page URL is provided". "Cariere" is gone. The footer's legal links now point to real pages, `/confidentialitate`, `/termeni` and `/cookies`, summarised in [`legal.md`](legal.md).

---

## 8. Headline statistics

Marketing claims, recorded verbatim with their source. None is verified or approved as reference data.

### 8.1 Home page "În cifre" / "By the numbers"

Source: `components/stats-section.tsx`. Heading "Impact măsurabil" / "Measurable impact". The intro says: "Cifrele din spatele fiecărui proiect BMS pe care l-am livrat — verificate și actualizate constant." / "The numbers behind every BMS project we've delivered — verified and continuously updated." The site names no method, period, baseline or verifier.

| Figure as displayed | RO label | EN label |
|---------------------|----------|----------|
| 250,000+ | mp suprafață automatizată în portofoliul de proiecte | sqm automated area across our project portfolio |
| 38% | reducere medie a consumului de energie | average energy consumption reduction |
| 30+ | proiecte finalizate cu succes | successfully completed projects |
| 6.1 | ani perioadă medie de amortizare | years average payback period |
| 15+ | ani experiență în automatizare | years of experience in automation |

The component formats numbers with a comma thousands separator and a dot decimal in both languages ("250,000+", "6.1"). Romanian format would be "250.000+" and "6,1" (guardrails rule 8).

> **Branch `redesign-2026`:** `components/stats-section.tsx` keeps 250,000+, 30+ and 15+, and replaces two figures. "38%" becomes "5-15%" with the label "reducere a consumului total al clădirii, documentată în studii independente". "6.1" years becomes "1-3 ani" with the label "amortizare pentru optimizarea unui sistem existent". The intro still says the figures are those "din spatele fiecărui proiect BMS pe care l-am livrat, verificate și actualizate constant". The comma separator stays. The installation page with "150+" and the services page with "50+ servicii BMS" are replaced. See section 13.

### 8.2 Other company-level figures

| Figure | Wording | Source |
|--------|---------|--------|
| 30+ | "De încredere în 30+ proiecte BMS finalizate" / "Trusted across 30+ completed BMS projects" | `app/page.tsx` |
| 150+ | "Proiecte implementate" / "Projects implemented" | `app/servicii/executie/page.tsx` |
| 50+ | "50+ servicii BMS" / "50+ BMS services" | `app/servicii/page.tsx` |

Per-service figures (35%, 50%, 99%, 95%, 40%, 20%, 4h and others) are in `services.md`.

### 8.3 Contradictions between these figures

- **Completed projects:** 30+ (home page, twice) against 150+ "Proiecte implementate" (installation page).
- **Energy reduction:** 38% average consumption reduction (home stats) against 35% "Reducere costuri energetice" (design page). The Therme testimonial also says 38%, but of energy **costs** in the first year, not average consumption.
- **Payback:** 6.1 years average payback (home stats) against "2-3 ani" "ROI mediu investiție" (design page) and "ROI-ul a fost atins în mai puțin de 2 ani" (Therme testimonial).

---

## 9. Testimonials

Testimonials appear in several places: the homepage spotlight (`components/aethel-testimonials.tsx`) and case-study slider (`components/case-study-slider.tsx`, rendered by `app/page.tsx`), the services page, the six sector pages (`lib/sector-data.ts`) and both case-study pages (`app/resurse/studii-de-caz/`). This section records the spotlight and the services page. The others are in [`references.md`](references.md) (the slider's Rompharm slide), [`sectors.md`](sectors.md) (the six sector testimonials) and [`case-studies/`](case-studies/) (the Therme and Radisson Blu slides and case-study quotes). Section 9.3 lists the names across all of them.

Names, roles and results are recorded as published. The site does not show the people's consent, and the photos are placeholders or stock images: the carousel code says "Photos and logos are placeholders", and the services page uses files named `/professional-male-engineer-headshot.jpg`, `/asian-woman-professional-smiling-headshot.jpg` and `/businessman-professional-portrait.jpg`. **Whether these people and quotes are real is not stated.** Do not reuse the names in the app.

### 9.1 Home page customer spotlight

Source: `components/aethel-testimonials.tsx`. Eyebrow "Clienți din portofoliu" / "Customer spotlight". Heading "Clienții vorbesc. Cifrele confirmă." / "Clients speak. The numbers confirm."

| Company | Sector (RO / EN) | Quote (RO, verbatim) | Quote (EN, site's) | Person, role | Detail figures | Case study link |
|---------|------------------|----------------------|--------------------|--------------|----------------|-----------------|
| Therme Bucharest | HoReCa & Wellness | "Sistemul BMS implementat de Sovitech ne-a redus costurile energetice cu 38% în primul an. ROI-ul a fost atins în mai puțin de 2 ani." | "The BMS system implemented by Sovitech reduced our energy costs by 38% in the first year. ROI was achieved in less than 2 years." | Alexandru Ionescu, Director Tehnic / Technical Director | Rezultat: "−38% costuri energetice" | `/resurse/studii-de-caz/therme-bucuresti` |
| Floreasca Business Park | Birouri & Office / Office Buildings | "Controlul centralizat ne oferă vizibilitate completă asupra celor 45.000 m² și ne ajută să menținem certificarea energetică clasa A." | "Centralised control gives us full visibility across 45,000 m² and helps us maintain our class-A energy certification." | None named. Shown as "Client din portofoliul Sovitech" / "From the Sovitech portfolio" | Suprafață 45.000 m²; Certificare Clasa A | None |
| Rompharm | Medical & Farma / Medical & Pharma | "Monitorizarea în timp real și alertele automate ne-au permis să prevenim probleme costisitoare înainte să apară." | "Real-time monitoring and automated alerts allowed us to prevent costly problems before they occurred." | Dan Georgescu, Director Operațiuni / Operations Director | Rezultat: "0 avarii neplanificate" / "0 unplanned outages" | None |
| Mega Mall | Retail & Shopping | "Automatizarea BMS menține confortul vizitatorilor în tot mall-ul, reducând în același timp costurile energetice pe cei 80.000 m²." | "BMS automation keeps shoppers comfortable across the entire mall while cutting energy costs over 80,000 m²." | None named | Suprafață 80.000 m²; Sistem: HVAC, iluminat, energie | None |
| Radisson Blu | HoReCa & Wellness | "Colaborarea cu Sovitech ne-a adus nu doar tehnologie de top, ci și o echipă care înțelege nevoile specifice ale industriei hoteliere." | "Working with Sovitech gave us not only top technology, but also a team that understands the specific needs of the hotel industry." | Maria Popescu, Facility Manager / Facilities Manager | Amploare: "428 camere" / "428 rooms" | `/resurse/studii-de-caz/radisson-bucuresti` |

### 9.2 Services page testimonials

Source: `app/servicii/page.tsx`. Eyebrow "Clienti" / "Clients". Heading "Ce spun clientii nostri" / "What our clients say".

The same three people and quotes, written without diacritics. The Therme quote is also worded differently: "Sistemul BMS implementat de Sovitech a redus costurile noastre energetice cu 38% in primul an. ROI-ul a fost atins in mai putin de 2 ani." (the spotlight has "ne-a redus costurile energetice"). The English text is the same in both places.
- Alexandru Ionescu, "Director Tehnic, Therme Bucharest": the 38% / under-2-years quote.
- Maria Popescu, "Facility Manager, Radisson Blu": the hotel-industry quote.
- Dan Georgescu, "Director Operatiuni, Rompharm": the real-time monitoring quote.

### 9.3 Inconsistencies in the testimonials

- **Different people are named for the same client.**
  - Therme: Alexandru Ionescu, Director Tehnic (spotlight, services page) and Ion Popescu, Director Tehnic (case-study slider, Therme case study page).
  - Radisson Blu: Maria Popescu, Facility Manager (spotlight, services page); Maria Ionescu, Facility Manager (case-study slider); Radu Georgescu, General Manager (HoReCa sector page, `lib/sector-data.ts`); and an unnamed "General Manager" (Radisson case study page).
  - Rompharm: Dan Georgescu, Director Operațiuni (spotlight, services page) and Andrei Vasile, Director Operatiuni (case-study slider).
- **Radisson Blu room count:** the spotlight says "428 camere". The Radisson case study page (`app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`) says "424 de camere". The home references card gives "peste 1.800 m² spații de evenimente" and no room count.
- **Floreasca:** the references list "Floreasca Tower", a class-A office building of ~7.500 m². The testimonial names "Floreasca Business Park" at 45.000 m². The site does not say whether they are the same client.
- **Therme:** "Therme Nord București" in the references and "Therme Bucharest" in the testimonial.
- **Mega Mall** appears only as a testimonial and is not in the home references list.

> **Branch `redesign-2026`:** none of the twelve people named in sections 9 and 10 appears anywhere on the branch (searched `app/`, `components/` and `lib/`).
> - **Not rendered.** No page renders the spotlight (`components/aethel-testimonials.tsx`) or the case-study slider (`components/case-study-slider.tsx`). Both files remain, but nothing imports them.
> - **Spotlight cards.** In the spotlight file the cards become project descriptions with no person: Therme Bucharest, Floreasca Business Park, Rompharm, Pitești Retail Park (replacing Mega Mall) and Radisson Blu. The Radisson card now says "424 camere", matching the case study, not 428.
> - **Services page.** It has no testimonial section.
> - **Sector pages.** `lib/sector-data.ts` attributes each sector quote to a project name with the role "Delivered project". A code comment says "no invented people or testimonials".
> - **Still unnamed.** The Radisson case-study page still attributes its quote to an unnamed "General Manager", "Radisson Blu București".
>
> The branch will not be merged (owner decision, 2026-09-24). So the name conflicts and the room-count conflict in 9.3 stay on `main`, the current website. Details are in [`sectors.md`](sectors.md) and [`case-studies/`](case-studies/).

---

## 10. What the app may and may not use

These notes apply the app's guardrails (`docs/guardrails.md`, version 1.3) to this content. They also apply to the branch content in sections 11 to 13.

- **No website figure is a value.** Savings percentages, payback years, ROI, areas, room counts, bed counts, project counts and uptime figures are marketing claims. They are not `reference` data under section 2.1 and not benchmarks from an approved dataset. The app may not show or calculate with them (rule 1). Making any of them a reference dataset or benchmark is adding a reference dataset, which counts as a loosening under section 10 and needs the approver's explicit approval.
- **Savings and payback language.** Rule 10 requires savings, payback and ROI to be Estimated, with their assumptions, and never promised. The website states them as outcomes ("ne-a redus costurile energetice cu 38%", "Rezultate garantate"). That wording must not move into the app.
- **Reserved terms in website copy.** The site uses words, or inflected forms of words, from the guardrails reserved list (section 2.8): "garantate" / "guaranteed" ("Rezultate garantate", "Uptime garantat"), "ofertă" / "quote" ("Cerere ofertă"), "verified" ("verificate și actualizate constant" / "verified and continuously updated", on the statistics) and "certified" ("Equipment certified to European standards"). In the app these terms are allowed only in the places section 2.8 lists, such as an action label. They cannot describe a value.
- **Radisson Blu.** The website presents Radisson Blu Hotel Bucharest as a real SOVITECH client, with testimonials attributed to four different people, one of them unnamed (section 9.3), and a case study. The app's approved mockups show the same hotel as the demo project, with invented data. Owner decision, 2026-09-24: the app's demo no longer uses the real hotel's name (working name "Demo Hotel Bucharest"; the owner may rename it). The mockups still show "Radisson Blu Bucharest". The rule 10 demo label ("Demo data, not an assessment of the real building") still applies. Website case-study figures (424 or 428 rooms, 1.800 m² event space) must not be copied into demo fixtures. The mockups' demo room schedule lists 424 rooms (`design/onboarding-spec.md` step 3), which matches the case study page but not the home testimonial. Recommended, not decided: the demo fixture should not reuse the real hotel's published facts, such as its room count or opening year. See [`case-studies/radisson-blu-bucuresti.md`](case-studies/radisson-blu-bucuresti.md), last section.
- **SAUTER relationship wording.** If the app describes SOVITECH, "authorised SAUTER partner" / "partener autorizat SAUTER" is the only relationship term `main` supports. "Distributor", "integrator" and any partnership tier are not supported by `main`. The unmerged branch adds "Systems Partner", "din 2017" and "integrator independent" (section 11). The branch will not be merged (owner decision, 2026-09-24), so they are not SOVITECH's current wording. Using them in the app needs SOVITECH to confirm them first. "Distributor" is supported by neither.
- **Contacts.** The three department contacts are published business contacts. Showing them in the app (for example "Contact SOVITECH sales") is a product decision for the approver. The emergency number is a placeholder and must not be used. The branch's office@sovitech.ro and footer phone are not published on `main`, and the branch will not be merged (owner decision, 2026-09-24).
- **Legal identity.** The CUI, trade register number and registered office in section 11 come from unmerged website copy. They have not been checked against the Trade Register. Registration facts such as the CUI and the trade register number are public-register facts, but here they come only from a branch that will not be merged. Confirm them against the official register (ONRC) before any use. Showing them in the app, for example on a proposal or a quotation record, is a product decision, and they should be checked at the source first.
- **SAUTER product names.** The branch names more SAUTER products (section 12). Under rule 1 they reach the app only from an approved reference dataset, never from this page.
- **Testimonial names.** Do not reuse any of them. That covers everyone named in section 9 and in the other testimonials: Ion Popescu, Maria Ionescu and Andrei Vasile (case-study slider; Ion Popescu also on the Therme case study page), the unnamed General Manager on the Radisson case study page, and the six sector-page names in `lib/sector-data.ts` (Andrei Popescu, Dr. Elena Ionescu, Mihai Constantin, Radu Georgescu, Ionut Popa, Prof. Cristina Marin). Their status is unknown, the same client is attributed to different people (section 9.3), and the photos are stock or placeholder images.

---

> **Sections 11 to 13: unmerged branch. Reference only. Not SOVITECH's current position.** Everything below comes from the branch `origin/redesign-2026` of the website repository, commit `af813534041c387c07fc29a35c53bc9bd100c7fe` (`af81353`, 2026-08-27). The pages were added or rewritten in commit `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala"). The branch has not been merged into `main`. Owner decision, 2026-09-24: it is not SOVITECH's current position and will not be merged. `main` is the current website. Paths are relative to the website repository root on that branch. A verbatim copy of each file is in `company/website/source-redesign-2026/`. Imported on 2026-09-24. Where this content conflicts with sections 1 to 10, both are kept, and section 13 lists the conflicts.

## 11. Legal identity (from the redesign-2026 branch)

Source: `app/despre-noi/page.tsx` (the "Date de firmă" table and the "Pe scurt" facts), `app/despre-noi/layout.tsx` (metadata), `components/footer.tsx` (company block), `app/contact/page.tsx` (address block), `app/termeni/page.tsx` and `app/confidentialitate/page.tsx` (publisher and controller).

**Not checked at the source.** None of this was checked against the Trade Register (ONRC) or the tax authority (ANAF). This import had no access to them. Registration facts such as the CUI and the trade register number are public-register facts, but here they come only from an unmerged branch, which will not be merged (owner decision, 2026-09-24). Confirm them against the official register (ONRC) before any use.

### 11.1 Identification data

| Item | As published on the branch | Where |
|------|----------------------------|-------|
| Company name and legal form | SOVITECH CONTROL SRL. SRL is the Romanian limited liability company form. | All files listed above |
| Tax code (CUI) | 38500895 | `app/despre-noi/page.tsx`, `app/despre-noi/layout.tsx`, `components/footer.tsx`, `app/contact/page.tsx`, `app/termeni/page.tsx`, `app/confidentialitate/page.tsx` |
| Trade Register number | J40/19288/2017 | Same files, except the layout metadata |
| Year founded | 2017 ("An înființare"). The year in the trade register number is also 2017. | `app/despre-noi/page.tsx` |
| Registered office ("Sediu social") | "Str. Dr. Niculae D. Staicovici nr. 35, Sector 5, București, România" | `app/despre-noi/page.tsx`, `components/footer.tsx`, `app/contact/page.tsx`, `app/termeni/page.tsx`, `app/confidentialitate/page.tsx` |
| Main activity ("Obiect principal de activitate") | "proiectare, execuție, integrare și întreținere de sisteme de automatizare a clădirilor și BMS" / "design, execution, integration and maintenance of building automation and BMS systems". **No CAEN code is stated** anywhere on the branch. | `app/despre-noi/page.tsx` |
| Partnership ("Parteneriat") | "SAUTER (Elveția), Systems Partner, din 2017" / "SAUTER (Switzerland), Systems Partner, since 2017" | `app/despre-noi/page.tsx` |
| General email | office@sovitech.ro. The contact page labels it "Adresă generală" / "General address". | `app/contact/page.tsx`, `components/footer.tsx` |
| General phone | "+40 720 547 802", shown in the footer as "Telefon:". The contact page gives the same number for Mihai Sorica, "Tehnic, proiecte și suport". | `components/footer.tsx`, `app/contact/page.tsx` |
| Hours | "Program: luni-vineri, 09:00-18:00" (footer); "Luni-vineri: 09:00-18:00" / "Sâmbătă și duminică: închis" (contact page) | `components/footer.tsx`, `app/contact/page.tsx` |
| Office visits | "numai pe bază de programare prealabilă" | `app/contact/page.tsx` |
| Copyright line | "© <year> SOVITECH CONTROL SRL. Toate drepturile rezervate." | `components/footer.tsx` |
| Footer positioning line | "Integrator independent de sisteme de automatizare a clădirilor. Partener autorizat SAUTER din 2017." / "Independent building automation systems integrator. Authorised SAUTER partner since 2017." | `components/footer.tsx` |
| Trademark notice | "SAUTER este marcă înregistrată a Fr. Sauter AG." / "SAUTER is a registered trademark of Fr. Sauter AG." | `app/page.tsx` |
| Data controller | SOVITECH CONTROL SRL. The data-protection email is "[DE COMPLETAT]". | `app/confidentialitate/page.tsx` ([`legal.md`](legal.md) section 2.1) |
| About-page metadata | Title "Despre Sovitech Control: integrator BMS din 2017 \| Sovitech Control". Description "Sovitech Control SRL, CUI 38500895, Bucuresti. Integrator independent de automatizare a cladirilor, partener SAUTER din 2017. Echipa, sediu si date de firma." | `app/despre-noi/layout.tsx` |

### 11.2 The "SAUTER Systems Partner since 2017" wording

The forms on the company pages (about page, home page, footer, services FAQ), verbatim. Other mentions of the partnership on the branch, and branch statements that date the company to 2017 without naming SAUTER, are listed after the table.

| Wording (RO) | Site's EN | File |
|--------------|-----------|------|
| "Din 2017: partener autorizat SAUTER, Systems Partner." | "Since 2017: authorised SAUTER partner, Systems Partner." | `app/despre-noi/page.tsx` ("Pe scurt") |
| "Din 2017, anul înființării firmei. Sovitech Control este Systems Partner SAUTER ..." | "Since 2017, the year the company was founded. Sovitech Control is a SAUTER Systems Partner ..." | `app/despre-noi/page.tsx` (FAQ Q1, section 12.8) |
| "Parteneriatul cu SAUTER, producătorul elvețian de echipamente de automatizare, a fost stabilit din primul an." | "The partnership with SAUTER, the Swiss manufacturer of automation equipment, was established in the first year." | `app/despre-noi/page.tsx` (history text, section 12.3) |
| "SAUTER (Elveția), Systems Partner, din 2017" | "SAUTER (Switzerland), Systems Partner, since 2017" | `app/despre-noi/page.tsx` (company data table) |
| "...înființată în 2017 la București și partener autorizat SAUTER din același an." | "...founded in Bucharest in 2017 and an authorised SAUTER partner since that same year." | `app/despre-noi/page.tsx` (hero) |
| "Sovitech Control lucrează cu SAUTER din 2017, anul înființării" | "Sovitech Control has worked with SAUTER since 2017, the year it was founded" | `app/despre-noi/page.tsx` (history heading) |
| "Ca Systems Partner, Sovitech Control are acces la gama completă, la instruire tehnică și la suportul producătorului pentru configurații neobișnuite." | "As a Systems Partner, Sovitech Control has access to the full range, to technical training and to the manufacturer's support for unusual configurations." | `app/despre-noi/page.tsx` (partnership) |
| "Systems Partner autorizat" / "Din 2017" | "Authorised Systems Partner" / "Since 2017" | `app/page.tsx` (next to the SAUTER logo) |
| "Partener autorizat SAUTER, integrator independent" | "Authorised SAUTER partner, independent integrator" | `app/page.tsx` (about heading) |
| "Partener autorizat SAUTER din 2017." | "Authorised SAUTER partner since 2017." | `components/footer.tsx` |
| "Sovitech Control este partener autorizat SAUTER, Systems Partner, din 2017." | "Sovitech Control has been an authorised SAUTER Systems Partner since 2017." | `app/servicii/page.tsx` (FAQ) |
| "...partener SAUTER din 2017." | (metadata, RO only) | `app/despre-noi/layout.tsx` |

**Other mentions of the partnership, with no year** (searched in `app/`, `components/` and `lib/` on the branch):
- `app/page.tsx`, hero lead: "... ca partener autorizat SAUTER." / "... as an authorised SAUTER partner."
- `app/produse/page.tsx`: "Partener autorizat SAUTER Elveția în România" / "Authorised SAUTER Partner in Romania". `app/produse/layout.tsx` (metadata, RO only): "Partener autorizat SAUTER în România."
- `app/referinte/page.tsx`, trust figures: "SAUTER" with the label "Partener autorizat" / "Authorised partner" (see [`references.md`](references.md), section R5).
- `app/termeni/page.tsx`: "Sovitech Control le folosește în calitate de partener autorizat, pentru a identifica echipamentele integrate."
- `app/resurse/articole/optimizare-hotel-bms/page.tsx`: "Ca partener autorizat al producătorului elvețian SAUTER, ..."
- `components/articles/sisteme-bms-cladiri.tsx`: "La nivel de echipamente, Sovitech Control lucrează ca partener autorizat SAUTER: ..."

**Statements that date the company to 2017 without naming SAUTER:**
- `app/despre-noi/layout.tsx`, metadata title (RO only): "Despre Sovitech Control: integrator BMS din 2017".
- `app/despre-noi/page.tsx`, heading: "... înființată în 2017" / "... founded in 2017" (section 12.1).
- `components/articles/sisteme-bms-cladiri.tsx`, line 74 (RO only): "Este scris de echipa Sovitech Control, cu sediul în București, care execută astfel de sisteme din 2017, în clădiri de birouri, hoteluri, spitale și fabrici de medicamente."

The branch still never uses "distribuitor", "distributor" or "exclusiv" for the relationship.

### 11.3 What the branch corrects in sections 1 to 10

Each `main` statement stays, because it is true of `main`. The branch fact is added next to it, marked **Branch `redesign-2026`**.

| `main` statement | Section | Branch fact | Branch source |
|------------------|---------|-------------|---------------|
| No general company email or phone is published | 7.2 | office@sovitech.ro and "+40 720 547 802" | `app/contact/page.tsx`, `components/footer.tsx` |
| The site gives no partnership tier, certificate, contract date or territory | 4 | Tier "Systems Partner" and start year 2017. Still no certificate, contract or territory. | 11.2 |
| The site never calls SOVITECH an "integrator" or a "System Partner" | 4 | "integrator independent" and "Systems Partner" | 11.2 |
| Street "Str. Dr. Nicolae D. Staicovici" | 7.1 | "Str. Dr. Niculae D. Staicovici" | 11.1 |
| Footer social links point to platform home pages; legal links point to `/contact` | 7.4 | Social links removed; legal links point to real pages | `components/footer.tsx` |
| Emergency number "+40 21 XXX XXXX" | 7.3 | Removed | whole branch |
| LonMark shown among "Parteneri de încredere" | 5 | Removed on purpose, as a certification mark SOVITECH does not hold | `components/partners-marquee.tsx` |
| "unul dintre liderii din România" | 2 | Removed | `app/page.tsx` |

---

## 12. About page `/despre-noi` (from the redesign-2026 branch)

Source: `app/despre-noi/page.tsx` and `app/despre-noi/layout.tsx`. A code comment says the copy comes from "doc C1 (copy_01_core.md), section 'Despre noi'", which is not in the repository. The page is linked from the footer ("Despre noi" / "About Us") and listed in `app/sitemap.ts`. `main` has no such page.

### 12.1 Hero

- Eyebrow: "Despre noi" / "About us".
- Heading: "Sovitech Control: firmă de automatizare a clădirilor din București, înființată în 2017" / "Sovitech Control: a building automation company from Bucharest, founded in 2017".
- Lead (RO): "Sovitech Control este o firmă românească de automatizare a clădirilor, înființată în 2017 la București și partener autorizat SAUTER din același an. Echipa este mică și specializată, lucrează pe proiecte de BMS în opt sectoare de clădiri și acoperă întregul ciclu: proiectare, execuție, integrare pe protocoale deschise, punere în funcțiune, întreținere și modernizare."
- Lead (EN): "Sovitech Control is a Romanian building automation company, founded in Bucharest in 2017 and an authorised SAUTER partner since that same year. The team is small and specialised, works on BMS projects across eight building sectors and covers the full cycle: design, execution, integration over open protocols, commissioning, maintenance and modernisation."

### 12.2 "Pe scurt" / "At a glance"

| RO (verbatim) | EN (site's) |
|---------------|-------------|
| "SOVITECH CONTROL SRL, CUI 38500895, Reg. Com. J40/19288/2017." | "SOVITECH CONTROL SRL, tax code (CUI) 38500895, Trade Register no. J40/19288/2017." |
| "Sediu: Str. Dr. Niculae D. Staicovici nr. 35, Sector 5, București." | "Registered office: Str. Dr. Niculae D. Staicovici no. 35, Sector 5, Bucharest." |
| "Din 2017: partener autorizat SAUTER, Systems Partner." | "Since 2017: authorised SAUTER partner, Systems Partner." |
| "25 de proiecte de referință livrate, cu nume public, în 8 sectoare." | "25 reference projects delivered, publicly named, across 8 sectors." |
| "Echipă mică, specializată, fără subcontractare a punerii în funcțiune." | "A small, specialised team; commissioning is never subcontracted." |
| "Independentă de producători: proiectele se scriu pe funcții și protocoale deschise." | "Manufacturer-independent: designs are written around functions and open protocols." |

### 12.3 History ("Istoric")

Heading: "Sovitech Control lucrează cu SAUTER din 2017, anul înființării".

- **Start.** The company started in 2017 "cu o echipă formată din ingineri care lucraseră deja pe sisteme BMS în clădiri mari din România". The SAUTER partnership "a fost stabilit din primul an".
- **Portfolio order.** The portfolio grew "în ordinea în care apar cerințele reale pe piața românească: hoteluri și complexe de wellness, birouri clasa A, unități farmaceutice, spitale, fabrici, parcuri de retail și clădiri instituționale."
- **First international project.** "Primul proiect internațional, o fabrică farmaceutică Rompharm în Uzbekistan, a venit din continuarea unei lucrări livrate în România."
- **What is not published.** "Firma nu publică cifră de afaceri, număr de angajați sau număr total de proiecte peste cele 25 listate public. Ce se poate verifica este lista de clădiri."

### 12.4 Independence ("Independență")

Heading: "Integrator independent: proiect executabil și de alt furnizor" / "Independent integrator: a design another supplier can also execute". The page says the claim is verified "în trei locuri concrete, nu în declarații":
- **"În caietul de sarcini" / "In the tender specification".** A design written on functions, points and open protocols can be quoted by several contractors. One written on product codes locks the buyer to one supplier and "într-o achiziție publică, poate fi contestat".
- **"În ce se păstrează din clădire" / "In what is kept from the building".** An independent integrator keeps working sensors, cabling and field devices and integrates them over KNX, DALI, Modbus or M-Bus. "Un furnizor legat de o marcă are un motiv comercial să înlocuiască tot."
- **"În cine deține sistemul" / "In who owns the system".** The client receives the As-built documentation, the points list, the programs and administrator access.
- Closing line: "Sovitech Control lucrează cu echipamente SAUTER pentru că platforma are ciclu de viață lung și piese disponibile, nu pentru că ar exista o obligație de volum."

### 12.5 SAUTER partnership ("Parteneriat")

Heading: "Parteneriatul SAUTER aduce platformă, piese și continuitate" / "The SAUTER partnership brings a platform, spare parts and continuity".
- "SAUTER este un producător elvețian de echipamente de automatizare a clădirilor. Ca Systems Partner, Sovitech Control are acces la gama completă, la instruire tehnică și la suportul producătorului pentru configurații neobișnuite."
- Equipment, verbatim: "Echipamentele folosite curent: automate Modulo6 (EY-AS660 și EY-AS680), Modulo5 și ECOS, senzori EGQ pentru CO2, senzori EGH pentru umiditate și EGP pentru presiune, vane și servomotoare, plus stratul de supervizare Sauter Vision Center și ModuWeb Vision EY-WS 500. Pentru monitorizarea energiei se folosesc EMS 100 și EMS 200."
- Buyer's point: a system lives "peste zece ani", and the right question is whether "peste opt ani se mai găsește un modul de înlocuire și cine îl poate pune".
- Link: "Vezi echipamentele SAUTER integrate" / "See the integrated SAUTER equipment" → `/produse`.

Compared with `main` (section 4), the branch adds EY-AS660, EY-AS680, EGQ, EGH, EGP, Sauter Vision Center, ModuWeb Vision EY-WS 500, EMS 100 and EMS 200. It writes "Sauter Vision Center" with "Sauter" in mixed case. Whether these names match the product catalogue is for `company/products/`.

### 12.6 How SOVITECH works ("Mod de lucru")

Heading: "Aceiași ingineri, de la proiect la punerea în funcțiune" / "The same engineers, from design to commissioning".
- "Echipa este mică și specializată. Persoana care scrie lista de puncte este aceeași care programează automatul și care răspunde la telefon când o alarmă nu are sens. Punerea în funcțiune nu se subcontractează."
- Four stages, each with deliverables: building assessment and points list; technical design and panel schematics; execution and commissioning; As-built documentation and training of the operating team.
- After handover: a maintenance contract or one-off interventions. "Bugetul anual uzual pentru un contract de bază este 4-7% din valoarea investiției, iar pentru un contract extins, cu timp de răspuns garantat, 7-12%." These percentages are recorded in [`pricing.md`](pricing.md) section 7.

### 12.7 Company data ("Date de firmă")

Heading: "Date de identificare SOVITECH CONTROL SRL" / "SOVITECH CONTROL SRL identification data". The table's seven rows are in section 11.1: name, CUI, trade register number, year founded, registered office, main activity, partnership.

### 12.8 FAQ ("Întrebări frecvente despre firmă")

**Q1. "Din ce an este Sovitech Control partener SAUTER?" / "Since when has Sovitech Control been a SAUTER partner?"**
- RO, verbatim: "Din 2017, anul înființării firmei. Sovitech Control este Systems Partner SAUTER și lucrează cu gama Modulo6, Modulo5 și ECOS, cu senzorii EGQ, EGH și EGP, cu vane și servomotoare, precum și cu platformele de supervizare Sauter Vision Center și ModuWeb Vision EY-WS 500."
- EN, verbatim: "Since 2017, the year the company was founded. Sovitech Control is a SAUTER Systems Partner and works with the Modulo6, Modulo5 and ECOS ranges, the EGQ, EGH and EGP sensors, valves and actuators, as well as the Sauter Vision Center and ModuWeb Vision EY-WS 500 supervision platforms."

**Q2. "Sovitech Control lucrează doar cu echipamente SAUTER?" / "Does Sovitech Control work only with SAUTER equipment?"**
- RO: "Nu. Echipamentele SAUTER sunt platforma preferată pentru automatele și senzorii noi, dar sistemele existente din clădire se integrează pe protocoale deschise: KNX, DALI, Modbus și M-Bus. Chillere, centrale de tratare a aerului, contoare și corpuri de iluminat de alte mărci rămân în funcțiune și intră în aceeași interfață."
- EN: "No. SAUTER equipment is the preferred platform for new controllers and sensors, but the building's existing systems are integrated over open protocols: KNX, DALI, Modbus and M-Bus. Chillers, air handling units, meters and luminaires of other brands stay in service and join the same interface."

**Q3. "Câte proiecte a livrat Sovitech Control?" / "How many projects has Sovitech Control delivered?"**
- RO: "Firma publică 25 de proiecte de referință, cu nume, oraș și sector, în HORECA, birouri, pharma, medical, industrial, retail și clădiri instituționale. Sovitech Control nu publică un număr total de proiecte peste cele care pot fi verificate prin numele clădirii."
- EN: "The company publishes 25 reference projects, with name, city and sector, in HORECA, offices, pharma, medical, industrial, retail and institutional buildings. Sovitech Control does not publish a total project count beyond those that can be verified by building name."

**Q4. "Unde are sediul firma și în ce zone intervine?" / "Where is the company based and where does it operate?"**
- RO: "Sediul este în București, Str. Dr. Niculae D. Staicovici nr. 35, Sector 5. Proiectele livrate acoperă București, Sibiu, Bacău, Pitești, Roman, Otopeni și Pantelimon, plus o lucrare în Uzbekistan. Intervențiile de întreținere se stabilesc prin contract, cu timp de răspuns declarat."
- EN: "The office is in Bucharest, Str. Dr. Niculae D. Staicovici no. 35, Sector 5. Delivered projects cover Bucharest, Sibiu, Bacau, Pitesti, Roman, Otopeni and Pantelimon, plus one project in Uzbekistan. Maintenance interventions are set by contract, with a declared response time."

### 12.9 Closing CTA

- Heading: "Discutați proiectul cu inginerul care îl va executa" / "Discuss the project with the engineer who will execute it".
- Text: "La Sovitech Control, persoana care evaluează clădirea este aceeași care scrie lista de puncte și pune sistemul în funcțiune. Prima discuție clarifică scopul lucrării și ordinul de mărime al investiției."
- Buttons: "Cere o discuție tehnică" / "Request a technical discussion" → `/contact`; "Vezi cele 25 de proiecte de referință" / "See the 25 reference projects" → `/referinte`.

### 12.10 Mission, values and team

- **Mission and values.** The page has no section called mission or values. The nearest statements are the independence section (12.4), the "same engineers" section (12.6) and the "Pe scurt" facts (12.2).
- **Team.** Not published. The code comment at the top of the page says: "The team section from the copy doc is intentionally NOT published: real names, roles and photographs are [DE FURNIZAT]. Per the doc's rule, the section stays hidden until complete real data exists." No team member is named on the page. The only named people on the branch are the three department contacts on the contact page (section 7.2).
- **Linked open item.** The contact page's department roles are to be "confirmed against the Despre noi page before publication" (code comment in `app/contact/page.tsx`). Until the team section exists, that check cannot be made.

---

## 13. Contradictions and points to check (branch)

Between the branch and `main`, and within the branch. Recorded, not resolved.

- **Founding year against years of experience.** The branch says SOVITECH was founded in 2017 (section 11). The same branch still shows "15+" "ani experiență în automatizare" (`components/stats-section.tsx`) and "15+" "Ani de experiență" (`app/referinte/page.tsx`). `main` shows the same "15+" (section 8.1). 2017 to 2026 is 9 years. The history says the founding engineers "lucraseră deja pe sisteme BMS", which may be what "15+" counts, but no label says so. The branch efficiency article also says the team analysed every project "implementat între 2015-2024 de echipa noastră" (`app/resurse/articole/eficienta-bms/page.tsx`, line 236), two years before the stated founding. The sentence is the same on `main` (line 233), where no founding year is published. That page is still a route on the branch, with no redirect in `next.config.mjs`.
- **Project count.** The about page says 25 publicly named reference projects and that the company "nu publică un număr total de proiecte peste cele care pot fi verificate prin numele clădirii". The same branch shows "30+" "proiecte finalizate cu succes" (`components/stats-section.tsx`) and "30+" "Proiecte finalizate" (`app/referinte/page.tsx`). The English lead of `app/resurse/articole/eficienta-bms/page.tsx` still says "An analysis of data from 150+ BMS projects implemented in Romania", and its body still says "Am analizat peste 150 de implementări BMS" / "We analysed over 150 BMS implementations" (line 267), although its Romanian lead now cites independent studies of more than 1,000 measured projects. `main` had 30+ and 150+ (section 8.3).
- **Sector count.** "8 sectoare" (about page) and "8" "Sectoare deservite" (`app/referinte/page.tsx`). The about FAQ lists seven sector names. `lib/site-routes.ts` has ten sector pages under `/expertiza`, one of which, data centres, says "fără proiecte proprii încă".
- **Street spelling.** "Niculae" on the branch, "Nicolae" on `main`. Neither says which is the registered spelling.
- **General phone.** The footer's general phone is the technical contact's number. Whether SOVITECH has a separate switchboard number is not stated.
- **Response time to requests.** The contact page promises an answer "în maximum două zile lucrătoare". The quote form (`app/cerere-oferta/page.tsx`) says an engineer "răspunde în ziua lucrătoare următoare".
- **"Guaranteed" response time.** The about page describes the extended maintenance contract "cu timp de răspuns garantat". The about FAQ says response time is "declarat" by contract, and the services page publishes no response times. The maintenance page also says "Ce se garantează este timpul de răspuns" (`app/servicii/intretinere-sisteme-bms/page.tsx`, line 302), while every response-time value in its level table reads "convenit prin contract" ([`pricing.md`](pricing.md) section 7.4).
- **Stats intro.** The branch stats intro still calls the figures those "din spatele fiecărui proiect BMS pe care l-am livrat, verificate". Two of the five figures are now labelled as literature ("documentată în studii independente") or as a general band, not SOVITECH project results.
- **Product naming.** "Sauter Vision Center" is written in mixed case on the about page (sections 12.5 and 12.8) and in the BMS guide article (`components/articles/sisteme-bms-cladiri.tsx`, line 277), and the KPI article writes "la Sauter, seria EGQ" (`components/articles/kpi-performanta-cladire.tsx`, line 382). The rest of the branch copy writes the brand "SAUTER". The trademark notice (`app/page.tsx`) and the product pages' structured data (`app/produse/[id]/page.tsx`) use the company name "Fr. Sauter AG".
- **Team promised in metadata.** The about page's metadata description ends "Echipa, sediu si date de firma", but the team section is hidden (section 12.10).

All figures in sections 11 to 13 are website copy. Section 10 applies to them in full.
