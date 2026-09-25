# Lead funnels on the SOVITECH website

This file records the website's lead funnels: the quote request form, the BMS guide funnel and the ROI calculator flow, with every field, option, step and submit behaviour. It then maps what the website asks onto the app's intake wizard and the guardrails on asking.

**Source.** Website repository `Gaidenic13/sovitech-website`, commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11). All paths are relative to that repository's root. The code was read, never run. The site's default language is Romanian (`lib/language-context.tsx`).

**Headline finding.** In this commit, no funnel sends data anywhere. There is no API route, no server action, no form backend in `package.json`, and no `fetch` call. Each form shows its success screen from browser memory only, and the data is lost when the page closes. The only tracking is Vercel page-view analytics (`app/layout.tsx`). Whether leads are captured some other way in production is not visible in the repository.

**Figures.** Savings, payback and case-study figures quoted here are marketing figures. The app may not use them as values without an approved reference dataset (`docs/guardrails.md` rule 1, 2.1 and section 10). The calculators' formulas are in `company/business/roi-methodology.md`.

**Unmerged branch, for reference only.** Sections 1 to 7 describe `main`, the current website. The branch `redesign-2026` changes several of these funnels. It is not merged into `main`. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. Its changes are in section 8, kept apart from the rest.

---

## 1. Map of the funnels

| Funnel | Route(s) | Linked from | In sitemap |
|--------|----------|-------------|-----------|
| Quote request | `/cerere-oferta` | Products page, product detail pages, services page, pricing page ×3 ("Solicită o ofertă" / "Request a quote") (`app/produse/page.tsx`, `components/product-detail.tsx`, `app/servicii/page.tsx`, `app/pricing/page.tsx`) | Yes |
| ROI calculator | `/calculator-roi` | Header, footer, home page, contact page, sector pages, resources hub (`components/header.tsx`, `components/footer.tsx`, `app/page.tsx`, `app/contact/page.tsx`, `app/sectoare/[sector]/sector-client.tsx`, `app/resurse/page.tsx`) | Yes |
| BMS guide | `/ghid-bms` and 7 sub-pages | Header menu "Ghid BMS Gratuit" / "Free BMS Guide", footer "Ghid BMS gratuit", resources hub (`components/header.tsx`, `components/footer.tsx`, `app/resurse/page.tsx`) | No (`app/sitemap.ts`) |

**BMS guide path.** Landing `/ghid-bms` → download gate `/ghid-bms/descarca` → thank-you `/ghid-bms/multumim` → dashboard `/ghid-bms/dashboard` → quiz `/ghid-bms/quiz` → guide calculator `/ghid-bms/calculator` → case studies `/ghid-bms/case-studies` → `/contact`. The page `/ghid-bms/resurse` exists but nothing links to it.

**Where the calls to action land.** The ROI calculator, the guide calculator, the case studies and the guide dashboard all send visitors to `/contact`, not to `/cerere-oferta`. The contact form (`app/contact/page.tsx`: first name, last name, email, phone, a subject select with "Cerere oferta", "Consultanta BMS", "Suport tehnic", "Informatii produs", "Altele", and a message) has no submit handler, no action and no `name` attributes, so it sends nothing either. It is not documented further here.

**Styling.** The quote form, the ROI calculator and the guide landing use the site's brand styling. The seven guide sub-pages use default component styling (bold headings, generic green, blue and purple accents), and the thank-you page uses emoji, unlike the rest of the site. The dashboard's only emoji is in the celebration animation, which never shows (3.4).

---

## 2. Quote request (`/cerere-oferta`)

Source: `app/cerere-oferta/page.tsx`.

### 2.1 Page and steps

- Eyebrow "• Cerere ofertă personalizată" / "• Custom offer request". H1 "Spune-ne despre proiectul tău" / "Tell us about your project". Sub "Completează cei 6 pași și primești o propunere adaptată exact nevoilor clădirii tale." / "Complete the 6 steps and receive a proposal tailored to your building's exact needs."
- Progress labels "Industrie, Proiect, Sisteme, Servicii, Documentație, Contact" / "Industry, Project, Systems, Services, Documents, Contact".
- Buttons "Înapoi" / "Back", "Continuă" / "Continue", and on step 6 "Trimite cererea" / "Send request". Continue stays disabled until the step's condition holds.

| Step | Title RO / EN | Continue is enabled when |
|------|---------------|--------------------------|
| 1 | "Ce tip de clădire ai?" / "What type of building do you have?" (sub "Alege industria care descrie cel mai bine proiectul tău.") | An industry is selected |
| 2 | "Detalii proiect" / "Project details" (sub "Câteva informații despre amploarea proiectului.") | A project type is selected (area is always above 0) |
| 3 | "Ce sisteme te interesează?" / "Which systems are you interested in?" (sub "Selectează toate sistemele relevante pentru proiect.") | At least one system |
| 4 | "Servicii, termen și buget" / "Services, timeline and budget" (sub "Ce servicii îți dorești și când vrei să începi.") | At least one service and a timeline |
| 5 | "Documentație & cerințe" / "Documentation & requirements" (sub "Adaugă planuri, caiete de sarcini sau orice document util și descrie nevoile tale.") | Always |
| 6 | "Date de contact" / "Contact details" (sub "Cum te putem contacta cu propunerea personalizată.") | Name and email are not blank |

### 2.2 Fields

| Key | Step | Label RO / EN | Control | Options (id: RO / EN) | Default | Required |
|-----|------|---------------|---------|------------------------|---------|----------|
| `industry` | 1 | (cards) | Single-select cards | `office`: "Birouri & Office" / "Office Buildings"; `horeca`: "HoReCa & Wellness"; `medical`: "Medical & Farma" / "Medical & Pharma"; `retail`: "Retail & Shopping"; `industrial`: "Industrial & Logistică" / "Industrial & Logistics"; `datacenter`: "Centru de date" / "Data Centre" | none | Yes |
| `projectType` | 2 | "Tipul proiectului *" / "Project type *" | Single-select pills | `new`: "Construcție nouă" / "New build"; `retrofit`: "Retrofit / modernizare" / "Retrofit / modernisation"; `upgrade`: "Upgrade sistem existent" / "Upgrade existing system"; `extension`: "Extindere" / "Extension" | none | Yes |
| `buildingSize` | 2 | "Suprafața clădirii (m²)" / "Building area (m²)" | Slider 500-100,000, step 500 | Scale "500 m²" to "100.000 m²" | 5,000 | In effect yes: it always has a value |
| `buildingCount` | 2 | "Număr de clădiri" / "Number of buildings" | Slider 1-50, step 1 | Scale "1" to "50+" | 1 | No |
| `systems` | 3 | (tiles) | Multi-select tiles | `hvac`: "HVAC (încălzire, ventilație, climatizare)" / "HVAC (heating, ventilation, cooling)"; `lighting`: "Iluminat inteligent" / "Intelligent lighting"; `access`: "Control acces & securitate" / "Access control & security"; `energy`: "Monitorizare energie" / "Energy monitoring"; `rooms`: "Automatizare camere" / "Room automation"; `fire`: "Integrare sisteme de incendiu" / "Fire system integration"; `scada`: "BMS / SCADA centralizat" / "Centralised BMS / SCADA"; `other`: "Altele" / "Other" | none | At least one |
| `services` | 4 | "Servicii necesare *" / "Services needed *" | Multi-select tiles | `design`: "Proiectare" / "Design"; `install`: "Execuție & instalare" / "Installation"; `integration`: "Integrare sisteme" / "Systems integration"; `maintenance`: "Mentenanță" / "Maintenance"; `consultancy`: "Consultanță" / "Consultancy" | none | At least one |
| `timeline` | 4 | "Când vrei să începi? *" / "When do you want to start? *" | Single-select pills | `now`: "Imediat" / "Immediately"; `1-3`: "1–3 luni" / "1–3 months"; `3-6`: "3–6 luni" / "3–6 months"; `6-12`: "6–12 luni" / "6–12 months"; `exploring`: "În explorare" / "Just exploring" | none | Yes |
| `budget` | 4 | "Buget estimat (opțional)" / "Estimated budget (optional)" | Single-select pills; a second click clears | `u50`: "sub 50.000 EUR" / "under €50,000"; `50-150`: "50.000 – 150.000 EUR" / "€50,000 – €150,000"; `150-500`: "150.000 – 500.000 EUR" / "€150,000 – €500,000"; `o500`: "peste 500.000 EUR" / "over €500,000"; `unsure`: "Nedecis" / "Not sure yet" | none | No |
| `files` | 5 | "Documentație proiect" / "Project documentation"; drop area "Adaugă documentație" / "Add documentation", "PDF, DWG, imagini — până la 20 MB fiecare" / "PDF, DWG, images — up to 20 MB each" | File picker, multiple | Accepts `.pdf, .dwg, .doc, .docx, .xls, .xlsx, .jpg, .jpeg, .png`. Each file can be removed ("Elimină" / "Remove"). | none | No |
| `description` | 5 | "Descrie nevoile proiectului" / "Describe your project needs" | Textarea, 5 rows, no length limit | Placeholder "Ex. dorim automatizarea completă a unui hotel de 120 de camere, cu integrare PMS și monitorizare energetică…" / "e.g. we want full automation of a 120-room hotel with PMS integration and energy monitoring…" | empty | No |
| `name` | 6 | "Nume complet *" / "Full name *" | Text, placeholder "Ion Popescu" / "John Smith" | | empty | Yes |
| `company` | 6 | "Companie" / "Company" | Text, placeholder "Numele companiei" / "Company name" | | empty | No |
| `email` | 6 | "Email *" | Email input, placeholder "ion.popescu@companie.ro" | | empty | Yes |
| `phone` | 6 | "Telefon" / "Phone" | Tel input, placeholder "+40 7XX XXX XXX" | | empty | No |

**Not asked:** project or building name, city, country or address, area basis, consent to data processing, and any link to a privacy policy.

### 2.3 What happens on submit

- "Trimite cererea" sets a local flag and shows the thank-you screen. Nothing is sent or saved.
- Only file **names** are kept. Files are never read or uploaded. The 20 MB limit in the caption is not checked.
- Email and phone are not validated. The email field only has to be non-blank, because the inputs are not inside a form element and the browser's email check does not run.
- The area slider always holds a value (default 5,000 m²). The data cannot tell a chosen area from an untouched default.
- Thank-you screen: eyebrow "• Cerere ofertă" / "• Offer request", H1 "Mulțumim!" / "Thank you!", heading "Cererea ta a fost trimisă" / "Your request has been sent", body "Un specialist Sovitech va analiza cerințele proiectului tău și te va contacta cu o propunere personalizată în cel mult 48 de ore." / "A Sovitech specialist will review your project requirements and get back to you with a tailored proposal within 48 hours.", button "Înapoi la produse" / "Back to products" to `/produse`.

The thank-you screen promises a reply within 48 hours for a request that no one receives.

---

## 3. BMS guide funnel (`/ghid-bms`)

### 3.1 Landing

Source: `app/ghid-bms/page.tsx`.

- Badge "Ghid gratuit de evaluare" / "Free Evaluation Guide". H1 "Evaluați potențialul de automatizare al clădirii dumneavoastră" / "Assess Your Building's Automation Potential". Sub "Obțineți ghidul complet cu checklist-uri, benchmark-uri de industrie și template-uri ROI pentru a determina gradul de pregătire al clădirii dumneavoastră pentru tehnologia BMS."
- Buttons "Descarcă ghidul gratuit" / "Download the Free Guide" to `/ghid-bms/descarca`, and "Vezi cuprinsul" / "View Contents" to the contents section.
- Three benefit cards: "Checklist-uri complete" / "Complete Checklists", "Benchmark-uri de industrie" / "Industry Benchmarks", "Template-uri ROI" / "ROI Templates".
- The hero background is an SVG loaded from an external Vercel blob URL, not from the repository.

**Guide contents as promised on the page** ("Cuprinsul ghidului" / "Guide Contents"):

| # | Section RO / EN | Items (EN gloss) |
|---|-----------------|------------------|
| 01 | "Evaluarea infrastructurii existente" / "Existing Infrastructure Assessment" | Equipment inventory and system age; "Compatibilitatea cu protocoalele de comunicație (BACnet, KNX, Modbus)"; energy consumption analysis and loss identification |
| 02 | "Calculul potențialului de economii" / "Savings Potential Calculation" | "reducere de 25–40% a costurilor operaționale"; ROI and payback "(de regulă 2–4 ani)"; CO₂ reduction and property value |
| 03 | "Benchmark-uri pe sectoare" / "Sector Benchmarks" | Average consumption by sector "(kWh/m²/an)"; typical operating and maintenance costs; success cases |
| 04 | "Planul de implementare" / "Implementation Plan" | "Timeline tipic: de la audit la punerea în funcțiune (3–6 luni)"; resources and stakeholders; minimising disruption |

Closing section: "Sunteți gata să vă evaluați clădirea?" / "Ready to Assess Your Building?", "Descarcă ghidul acum" to the download gate, "Programează o consultație" / "Schedule a Consultation" to `/contact`, and the line "Descărcare instantă · Format PDF interactiv · Template-uri Excel editabile" / "Instant download · Interactive PDF format · Editable Excel templates".

**The guide itself is not in the repository.** There is no PDF or Excel file under `public/` or anywhere else.

### 3.2 Download gate (`/ghid-bms/descarca`)

Source: `app/ghid-bms/descarca/page.tsx`.

- H1 "Obțineți Ghidul Gratuit de Evaluare BMS" / "Get the Free BMS Evaluation Guide".
- "Ce veți primi:" / "What you will receive:": "Ghid PDF de 42 pagini cu liste de verificare detaliate"; "Calculator ROI în format Excel editabil"; "Benchmark-uri actualizate pentru toate sectoarele"; "Studii de caz cu rezultate măsurabile"; "Acces la webinarii exclusive despre BMS".
- Data note: "Datele dumneavoastră sunt în siguranță" / "Your data is safe", "Nu partajăm informațiile cu terți. Datele sunt folosite exclusiv pentru a vă trimite ghidul și conținut relevant."

| Field | Label RO / EN | Control | Options (value: RO / EN) | Required in code |
|-------|---------------|---------|--------------------------|------------------|
| `firstName` | "Prenume *" / "First name *" | Text, placeholder "Ion" / "John" | | Yes |
| `lastName` | "Nume *" / "Last name *" | Text, placeholder "Popescu" / "Smith" | | Yes |
| `email` | "Email profesional *" / "Work email *" | Email, hint "Ghidul va fi trimis imediat pe această adresă" / "The guide will be sent immediately to this address" | | Yes |
| `phone` | "Telefon" / "Phone" | Tel, placeholder "+40 721 234 567" | | No |
| `company` | "Companie *" / "Company *" | Text | | Yes |
| `propertyType` | "Tip proprietate *" / "Property type *" | Select, "Selectați tipul" | `office`: "Clădire de birouri" / "Office building"; `retail`: "Spațiu comercial / Retail" / "Commercial / Retail space"; `hotel`: "Hotel / HORECA"; `medical`: "Unitate medicală" / "Medical facility"; `industrial`: "Hală industrială" / "Industrial hall"; `mixed`: "Utilizare mixtă" / "Mixed use"; `other`: "Altele" / "Other" | Yes |
| `role` | "Funcția dumneavoastră *" / "Your role *" | Select, "Selectați funcția" | `owner`: "Proprietar" / "Owner"; `fm`: "Facility Manager"; `tech`: "Director Tehnic" / "Technical Director"; `pm`: "Project Manager"; `exec`: "Management Executiv" / "Executive Management"; `other`: "Altă funcție" / "Other role" | Yes |
| `consent` | "Sunt de acord să primesc ghidul și să fiu contactat de Sovitech Control cu informații despre soluții BMS. Pot să-mi retrag consimțământul oricând. *" | Checkbox | | Yes |
| `newsletter` | "Doresc să primesc newsletter-ul lunar cu articole despre eficiență energetică și automatizări" | Checkbox | | No |

The text inputs use the browser's `required` check. The select and checkbox fields are UI-library components; whether the browser enforces `required` on them was not verified, since the code was not run. The consent text names the company "Sovitech Control".

**On submit.** The page waits 1.5 seconds (a code comment says "Simulate form submission") and then opens `/ghid-bms/multumim`. The field values are never read. No email is sent. The link "Politica de Confidențialitate" points to `/politica-confidentialitate`, a route that does not exist; the footer's privacy links point to `/contact`.

### 3.3 Thank-you page (`/ghid-bms/multumim`)

Source: `app/ghid-bms/multumim/page.tsx`.

- "Ai câștigat +100 puncte!" / "You earned +100 points!". H1 "Mulțumim! Verificați Email-ul" / "Thank You! Check Your Email". Body says the guide was sent by email and to check the spam folder.
- Card "Descărcare Imediată" / "Immediate Download" with the button "Descarcă Ghidul Acum (PDF, 8.2 MB)". The button has no link and no handler.
- Card "Continuă Evaluarea & Câștigă Recompense" / "Continue the Assessment & Earn Rewards", button "Accesează Dashboard-ul" / "Go to the Dashboard". A last line lists "Deblochează studii de caz • Câștigă insigne • Vezi progresul", each with an emoji in the source (removed here).

### 3.4 Dashboard (`/ghid-bms/dashboard`)

Source: `app/ghid-bms/dashboard/page.tsx`.

H1 "Parcursul Tău BMS" / "Your BMS Journey". Progress is hard-coded (code comment: "Simulated user progress (in real app, fetch from backend/localStorage)"): completed steps `["download"]`, 100 points, level 1, badge `early-adopter`.

| # | Step RO / EN | Points | Link | Unlocks after | Reward text |
|---|--------------|--------|------|---------------|-------------|
| 1 | "Descarcă Ghidul" / "Download the Guide" | 100 | `/ghid-bms/multumim` | | |
| 2 | "Evaluare Pregătire" / "Readiness Assessment" ("Completează quiz-ul de 5 minute despre clădirea ta") | 150 | `/ghid-bms/quiz` | Step 1 | |
| 3 | "Calculator ROI Personalizat" / "Personalised ROI Calculator" | 200 | `/ghid-bms/calculator` | Step 2 | "Deblochează studii de caz exclusive" / "Unlocks exclusive case studies" |
| 4 | "Studiezi Cazuri Similare" / "Study Similar Cases" | 100 | `/ghid-bms/case-studies` | Step 3 | |
| 5 | "Programează Consultație" / "Schedule a Consultation" | 250 | `/contact` | Step 4 | "Deblochează ofertă personalizată" / "Unlocks a personalised offer" |

**Badges:** "Early Adopter" ("Primii 100 care au descărcat ghidul" / "First 100 to download the guide"), "Expert BMS" ("Completat quiz-ul cu scor peste 80%"), "Planificator Financiar" ("Calculat ROI complet"), "Pregătit pentru BMS" ("Completat toate etapele").

**Behaviour.**
- Every visitor always sees 1 of 5 steps done (20 %), 100 points and "Nivel 1" / "Entuziast BMS", with a level bar fixed at 60 % and "Încă 400 puncte până la Nivel 2".
- Steps 3 to 5 always show as locked ("Completează etapa anterioară pentru a debloca"), even after the visitor completes the quiz. The pages behind them are still reachable from the quiz results.
- Every visitor is shown the "Early Adopter" badge, described as for the first 100 downloaders.
- A celebration animation for completing all steps can never trigger.
- Quick actions: "Re-descarcă Ghidul" to `/ghid-bms/multumim`, "Contactează-ne" to `/contact`, "Vezi Proiecte" to `/resurse/referinte`.

### 3.5 Readiness quiz (`/ghid-bms/quiz`)

Source: `app/ghid-bms/quiz/page.tsx`.

H1 "Evaluare Pregătire BMS" / "BMS Readiness Assessment", with a counter "n / 5" and a progress bar. Each question must be answered before "Următoarea" / "Next" (last: "Vezi Rezultatele" / "See Results") is enabled. There is no skip.

| # | Question RO / EN | Options RO (EN), points |
|---|------------------|-------------------------|
| 1 | "Care este suprafața totală a clădirii dumneavoastră?" / "What is the total floor area of your building?" | "Sub 1.000 m²" (Under 1,000 m²) 1; "1.000 - 5.000 m²" (1,000 - 5,000 m²) 2; "5.000 - 10.000 m²" (5,000 - 10,000 m²) 3; "Peste 10.000 m²" (Over 10,000 m²) 4 |
| 2 | "Cât de vechi sunt sistemele HVAC actuale?" / "How old are your current HVAC systems?" | "Mai puțin de 5 ani" (Less than 5 years) 1; "5-10 ani" (5-10 years) 2; "10-15 ani" (10-15 years) 3; "Peste 15 ani" (Over 15 years) 4 |
| 3 | "Cât cheltuiți lunar pe energie (electricitate + gaze)?" / "How much do you spend monthly on energy (electricity + gas)?" | "Sub 5.000 lei" (Under 5,000 lei) 1; "5.000 - 15.000 lei" (5,000 - 15,000 lei) 2; "15.000 - 30.000 lei" (15,000 - 30,000 lei) 3; "Peste 30.000 lei" (Over 30,000 lei) 4 |
| 4 | "Aveți deja senzori sau automatizări instalate?" / "Do you already have sensors or automation installed?" | "Nu, nimic" (No, nothing) 4; "Termostate simple" (Simple thermostats) 3; "Câțiva senzori și timere" (A few sensors and timers) 2; "Sistem parțial automatizat" (Partially automated system) 1 |
| 5 | "Cât de des primiți plângeri despre confortul termic?" / "How often do you receive complaints about thermal comfort?" | "Niciodată" (Never) 1; "Rar (o dată pe trimestru)" (Rarely (once a quarter)) 2; "Ocazional (lunar)" (Occasionally (monthly)) 3; "Frecvent (săptămânal)" (Frequently (weekly)) 4 |

**Scoring.** Score = round(points / 20 × 100). The lowest possible total is 5 points, so scores run from 25 to 100 in steps of 5.

| Score | Level RO / EN | Text RO / EN |
|-------|---------------|--------------|
| 75 or more | "Excelent" / "Excellent" | "Clădirea dumneavoastră are un potențial ridicat pentru economii prin BMS" / "Your building has a high potential for savings through BMS" |
| 50-74 | "Bun" / "Good" | "Există oportunități semnificative de îmbunătățire" / "There are significant opportunities for improvement" |
| 25-49 | "Moderat" / "Moderate" | "BMS-ul ar aduce beneficii, dar necesită investiție inițială mai mare" / "A BMS would bring benefits, but requires a larger initial investment" |
| Below 25 | "Scăzut" / "Low" | "Recomandăm o evaluare detaliată înainte de a continua". **This level cannot be reached.** |

**Results page.** "Evaluare Completată!", "Felicitări! Ai câștigat +150 puncte", the score in a circle titled "Scor Pregătire BMS" / "BMS Readiness Score", and three recommendations: use the ROI calculator "pentru a estima economiile exacte" / "to estimate your exact savings", book a free consultation, and read case studies. Buttons: "Calculează ROI Personalizat" to `/ghid-bms/calculator` and "Vezi Dashboard" to `/ghid-bms/dashboard`. The answers and score are not stored or passed on.

**Notes.**
- The score measures savings opportunity, not readiness. A bigger, older, costlier, less automated building with more complaints scores higher on "Scor Pregătire BMS".
- Bands overlap at their shared bounds: area at 5,000 m² (options 2 and 3), HVAC age at 10 years ("5-10 ani" and "10-15 ani"), and monthly spend at 15,000 lei ("5.000 - 15.000 lei" and "15.000 - 30.000 lei").
- The energy question is monthly spend in lei. The main ROI calculator asks yearly spend in EUR, and the guide calculator asks monthly spend in RON.

### 3.6 Guide calculator (`/ghid-bms/calculator`)

Source: `app/ghid-bms/calculator/page.tsx`. Three inputs (building type, floor area, monthly energy cost in RON), no required fields, results on the same page. Formula, outputs and worked examples: `company/business/roi-methodology.md` section 3. Its next-step buttons are "Vezi studiile de caz" to `/ghid-bms/case-studies` and "Programează o consultație" to `/contact`, plus "Înapoi la Dashboard".

### 3.7 Case studies (`/ghid-bms/case-studies`)

Source: `app/ghid-bms/case-studies/page.tsx`.

- "Conținut deblocat - +100 puncte". H1 "Studii de Caz Exclusive" / "Exclusive Case Studies".
- Filter buttons "Toate Sectoarele" / "All Sectors", "HORECA", "Pharma".

| Card | Sector | Description RO | Savings | Payback (labelled "ROI") | CO₂ |
|------|--------|----------------|---------|--------------------------|-----|
| Therme București | HORECA | "Complex spa și wellness de 30.000 m² cu control HVAC și iluminat automat" | 35% | "2.3 ani" | "450 tone/an" |
| Radisson Blu București | HORECA | "Hotel 5 stele cu 428 camere - automatizare completă BMS" | 32% | "2.8 ani" | "280 tone/an" |
| Rompharm Company | Pharma | "Fabrică farmaceutică cu cerințe stricte de mediu controlat" | 28% | "3.1 ani" | "320 tone/an" |

- Each card's "Citește Studiul Complet" / "Read the Full Case Study" links to `/resurse/studii-de-caz/therme`, `/radisson` or `/rompharm`. None of these routes exists. The real pages are `therme-bucuresti` and `radisson-bucuresti`, and there is no Rompharm page.
- Every card has `locked: false`, so the lock screen ("Completează calculatorul ROI") never shows.
- Closing call to action: "Gata să Începi Propriul Tău Proiect?", button "Programează Consultație Gratuită" to `/contact`.
- The Radisson room count (428) and the Therme area (30.000 m²) contradict the full case-study pages (424 rooms; 8.000 m² implemented). See `roi-methodology.md` section 4.

### 3.8 Resources page (`/ghid-bms/resurse`)

Source: `app/ghid-bms/resurse/page.tsx`. No page links here.

- H1 "Resurse Suplimentare BMS" / "Additional BMS Resources".
- "Instrumente Interactive": a "Calculator ROI BMS" card (button "Deschide Calculatorul", no link) and a "Quiz Pregătire BMS" card that promises "15 întrebări despre infrastructură" (the quiz has 5), with button "Începe Quiz-ul" (no link).
- "Studii de Caz Detaliate": Therme ("Reducere cu 35% a costurilor energetice pentru cel mai mare complex wellness din Europa.") to `/resurse/studii-de-caz/therme-bucuresti`; Radisson Blu ("... hotel 5 stele cu 428 camere.") to `/resurse/studii-de-caz/radisson-bucuresti`; Rompharm ("Control precis mediu productie pentru facilitati farmaceutice certificate GMP.") to `/resurse/referinte`. Button "Vezi Toate Proiectele" to `/resurse/referinte`.
- "Serie de Articole: Ghid Complet BMS", four parts: "Fundamentele BMS: Ce Trebuie să Știți", "Evaluarea ROI: Merită Investiția?", "Procesul de Implementare Pas cu Pas", "Mentenanță și Optimizare Continuă". Each "Citește articolul →" button has no link.
- Closing: "Aveți Întrebări despre BMS?", buttons to `/contact` and `/ghid-bms/descarca`.

---

## 4. ROI calculator flow (`/calculator-roi`)

Source: `app/calculator-roi/page.tsx`, `lib/roi-calculator.ts`. Full inputs, constants and formula: `company/business/roi-methodology.md` section 2.

| Step | RO / EN | Asked | Blocks Continue |
|------|---------|-------|-----------------|
| 1 | "Industrie" / "Industry" | Sector: Hospitality, Birouri & Office, Retail & HORECA, Medical & Pharma, Industrial, Data Center | Until a sector is chosen |
| 2 | "Situație" / "Situation" | Annual energy cost (EUR), building area (m²), number of buildings | Until cost and area are above 0 |
| 3 | "Provocări" / "Challenges" | Hospitality: occupancy rate, guest comfort issues. Office: office type, occupancy patterns. Retail: store format. Others: nothing | No |
| 4 | "Mentenanță" / "Maintenance" | Annual maintenance budget (EUR), repair frequency, HVAC equipment age | Until the budget is above 0 |
| 5 | "Obiective" / "Goals" | Energy, maintenance, comfort, compliance and ESG, sustainability | Until one goal is chosen |
| 6 | "Preferințe" / "Preferences" | Available budget (optional), ROI timeframe, existing automation | No |
| Results | "Rezultate" / "Results" | ROI 5 years, payback, savings a year, 5-year net benefit, breakdown, 1/3/5-year tiles | |

**On "Calculează ROI".** The formula runs in the browser and the results replace the form. Nothing is stored or sent. The results screen offers "Solicită propunere detaliată" and "Programează o discuție" (both to `/contact`, with no data passed), "Descarcă PDF" (the browser print dialog), "Distribuie" (WhatsApp and email with a text containing the savings and payback; LinkedIn with the bare address), and "Copiază link" (the bare calculator address).

---

## 5. Sector lists across the funnels

Each funnel uses its own building-type list. The app uses a sixth.

| App step 5 tile (`design/onboarding-spec.md`) | `/cerere-oferta` | `/calculator-roi` | `/ghid-bms/descarca` | `/ghid-bms/calculator` |
|------|------|------|------|------|
| Hotel | `horeca` "HoReCa & Wellness" | `hospitality` "Hospitality" ("Hoteluri, resorturi, spa-uri") | `hotel` "Hotel / HORECA" | `hotel` "Hotel / HORECA" |
| Office | `office` "Birouri & Office" | `office` "Birouri & Office" | `office` "Clădire de birouri" | `office` "Clădire de birouri" |
| Retail | `retail` "Retail & Shopping" | `retail` "Retail & HORECA" (includes restaurants) | `retail` "Spațiu comercial / Retail" | `retail` "Spațiu retail" |
| Hospital | `medical` "Medical & Farma" | `healthcare` "Medical & Pharma" ("Spitale, clinici, centre medicale") | `medical` "Unitate medicală" | `medical` "Unitate medicală" |
| Residential | none | none | none | none |
| Other | `industrial` "Industrial & Logistică"; `datacenter` "Centru de date" | `industrial` "Industrial"; `dataCenter` "Data Center" | `industrial` "Hală industrială"; `mixed` "Utilizare mixtă"; `other` "Altele" | `industrial` "Hală industrială" |

- Restaurants sit under Retail in the calculator and under HoReCa in the quote form.
- A pharmaceutical factory (the Rompharm case) falls under "Medical & Pharma" on the website. In the app it fits neither Hospital nor any other tile except Other.
- The website's sector pages use a further list: civil, medical, retail, horeca, industrial, educational (`app/sitemap.ts`).

---

## 6. Relevance to the app's intake wizard

The app's intake is the 8-step wizard in `design/onboarding-spec.md`, governed by `docs/guardrails.md`. Its approach is the opposite of the website's: the owner uploads documents, the app reads them, and it asks only what it cannot find (the Speed Rule, section 4 of the guardrails). The website asks the visitor directly for everything.

### 6.1 Field-by-field map

Status key:
- **Asked in both.** The app has the same question on a wizard step.
- **App reads it.** The app gets it from documents first and asks only if missing, or confirms it (rule 5).
- **New.** Not in the app's wizard today. Adding a question needs the approver's approval and a named output that passes rule 6's sensitivity test (CLAUDE.md, "Everything else needs the approver's explicit approval").
- **Not for the owner.** A technical fact that goes to SOVITECH engineers or a site survey (rule 3, Speed Rule step 9).

**Quote request (`/cerere-oferta`)**

| Website field | App step | Status | Notes |
|---------------|----------|--------|-------|
| `industry` | 5, building type | App reads it | Building type is a fact. The app labels it Likely or Possible with its evidence and offers an inline "Yes, it's a hotel" (rule 3, guardrails section 4). Options differ (section 5). |
| `projectType` | 1, project type (required) | Asked in both | App options: New construction, Renovation, Existing building, BMS modernization. `new` maps to New construction and `upgrade` to BMS modernization. `retrofit` ("Retrofit / modernizare") could be Renovation or BMS modernization. `extension` has no app option. |
| `buildingSize` | 3, total area | App reads it | The app reads area from documents with its basis. If no document gives it, it may ask, with Skip for now. If the owner skipped it, step 8 asks once more inline (rules 5 and 7, G7-2a; gross floor area is in rule 7's proposed first-estimate set). The website value has no basis and cannot be told apart from the 5,000 m² default. |
| `buildingCount` | none | New | Guardrails 2.2 names "the building" as one subject. How a multi-building project is modelled is not specified. |
| `systems` | 4, systems in scope | Asked in both | App options: HVAC, Lighting, Energy, Access Control, Fire Safety, Water, Elevators, CCTV. The app detects systems in documents and preselects them as Suggested, except life-safety systems (rule 3, section 5). "Automatizare camere" is closer to the app's step 7 automation areas. "BMS / SCADA centralizat" is the product itself and has no app option. "Integrare sisteme de incendiu" becomes monitoring only in the app (rule 11). The website requires at least one; the app allows none (rule 7). |
| `services` | none | New | Commercial scope (design, installation, integration, maintenance, consultancy). It could change proposal scope lines if a template read it. |
| `timeline` | none | New | Changes no engineering output. It is sales data. Under rule 6 it would fail the sensitivity test unless an output, such as phasing, reads it. |
| `budget` | none | New | Should never become the investment figure, but no rule says so yet: rule 10 does not mention a budget, and dashboards spec gap 7.2.20 (awaiting approval) would forbid typed engine outputs. The ROI calculator uses a typed budget as the cost; the app should not. |
| `files` | 2, documents | Asked in both | The website keeps only file names. Accepted types differ: the website adds `.doc` and `.xls`; the app adds IFC, RVT and ZIP. Limits: "20 MB" each (not enforced) against the app's "Max file size 500 MB". |
| `description` | 5 and 6, notes (500 characters each) | Asked in both | Owner text is data, never instructions (rule 14). |
| `name`, `company`, `email`, `phone` | none | New | Contact and account data, not engineering fields. The onboarding spec has no account or contact step. |
| (not asked) | 1, project name, city, country | App only | Three of the app's four required fields are absent from every website funnel. |

**Guide download gate (`/ghid-bms/descarca`)**

| Website field | App step | Status | Notes |
|---------------|----------|--------|-------|
| `firstName`, `lastName`, `email`, `phone`, `company` | none | New | Contact data |
| `propertyType` | 5, building type | App reads it | As `industry` above. "Utilizare mixtă" has no app tile. |
| `role` | none | New | The guardrails have only three roles: `owner`, `sovitech_engineer` and `system` (2.3, 2.4). Only an authenticated `sovitech_engineer` can verify (rule 10). So any client-side user, including a "Director Tehnic", is an owner-role user. Letting a job title move `confirmBy` from engineer to owner would be a loosening (section 10). |
| `consent`, `newsletter` | none | Out of scope | Legal and marketing consent |

**Readiness quiz (`/ghid-bms/quiz`)**

| Question | App step | Status | Notes |
|----------|----------|--------|-------|
| 1, floor area band | 3, total area | App reads it | A band is coarser than a document value and has no basis. |
| 2, HVAC age | none | Not for the owner | Equipment age is an asset attribute. Technical facts are verified by engineers (rule 3). |
| 3, monthly energy spend in lei | 2, energy bills | App reads it | The app builds energy data from bills: carrier, metering point, period and reading type (rule 8). A spend band has none of these. |
| 4, existing sensors or automation | 1 project type; 2 existing BMS documents | App reads it, then engineer | Protocols and reuse are never assumed (rule 1, G1-6, G1-7). |
| 5, comfort complaints | none (step 6 goal "Improve guest comfort" is a choice) | New | Complaint frequency is not in the app. |

**ROI calculator (`/calculator-roi`) and guide calculator**

| Website field | App step | Status | Notes |
|---------------|----------|--------|-------|
| `industry` / `buildingType` | 5, building type | App reads it | See above |
| `annualEnergyCost` (EUR/yr) / `energyCost` (RON/month) | 2, energy bills | App reads it | Cost, not energy. The app needs kWh by carrier and period (rule 8). |
| `buildingSize` | 3, total area | App reads it | No basis |
| `buildingCount` | none | New | See above |
| `occupancyRate` (hospitality, %) | 5, occupancy | Asked in both, different form | The app's occupancy is a category (Mostly occupied, Mixed, Seasonal, Low). Occupancy is an owner choice where no document states it (rule 3). |
| `occupancyPatterns` (office) | 5, occupancy and schedule | Partly | "After-hours usage" is close to "Extended hours"; "Variable occupancy" to "Mixed". "Hot-desking" has no counterpart and changes nothing on the website either. |
| `guestComfortIssues`, `officeType`, `storeFormat` | none | New | |
| `maintenanceBudget`, `unexpectedRepairs` | none | New | |
| `equipmentAge` | none | Not for the owner | Asset attribute |
| `selectedGoals` | 6, goals | Asked in both | energy → "Reduce energy consumption"; maintenance → "Increase operational efficiency" or "Extend asset lifespan"; comfort → "Improve guest comfort"; compliance → "Ensure compliance"; environmental → "Lower carbon emissions". On the website, goals multiply savings. In the app they are owner choices that must change a named output, never a savings figure without a registered method (rules 6 and 9). |
| `implementationBudget` | none | New | Should not be the investment figure; not yet a rule (dashboards spec 7.2.20, awaiting approval) |
| `timelineROI` | none | New | Changes no output even on the website |
| `hasExistingSystems` | 1 project type; 2 existing BMS documents | App reads it | The website takes 30 % off the cost. The app never assumes reuse (rule 1, G1-7). |

### 6.2 What the app should not ask again

Nothing carries over today, because the website stores nothing. If SOVITECH later passes website leads into app projects, that link is a product decision for the approver. These points would then apply:

- **Values the visitor gave become owner answers, not facts.** They would be `user` candidates. A document analysed later that disagrees raises a conflict on the review step (rule 4). The app would not ask again for building type, project type, systems of interest, notes or contact details.
- **Unqualified values still get one confirmation.** Area arrives with no basis, so the app would show one confirmation naming the basis, as rule 5 and rule 8 require ("Is that the total gross floor area, including basements?").
- **Untouched defaults must not be imported.** The website cannot tell a chosen value from a default: 5,000 m² and 1 building on the quote form; 70 % occupancy, "moderate" repairs, "5–10 ani" equipment age and "1–3 ani" timeframe on the ROI calculator; office, 5,000 m² and 15,000 RON on the guide calculator. Importing them would put a typical value in place of an unknown (rule 1). Rule 3's "a suggestion left in place counts as the owner's answer" does not apply, because none of these defaults was shown as Suggested with a reason.
- **Technical answers stay with engineers.** HVAC age and existing automation would not be imported as facts. They go to "SOVITECH will check".

### 6.3 Rules 5 to 7 compared

**Rule 7, never block.** The app blocks only on project name, project type, city and country, and offers "Skip for now" on everything else. The website blocks far more:

| Funnel | Blocks progress on |
|--------|--------------------|
| `/cerere-oferta` | Industry; project type; at least one system; at least one service; timeline; name; email |
| `/calculator-roi` | Sector; energy cost; area; maintenance budget; at least one goal |
| `/ghid-bms/quiz` | Every question; no skip |
| `/ghid-bms/descarca` | First name, last name, email, company, property type, role, consent (a lead gate, with no app counterpart) |
| `/ghid-bms/calculator` | Nothing, but it fills every input with a default, which rule 7 forbids for the app ("Nothing fills the gap") |

**Rule 6, ask only what changes the result.** On the ROI calculator these inputs change no output: the ROI timeframe, the energy, maintenance and compliance goals, "Hot-desking", office types other than hybrid, store formats other than Mall, and occupancy at 60 % or above. The quiz's five answers change only a score that nothing uses. In the app each of these would fail registry validation (G6-1).

**Rule 5, confirm, don't ask.** The website asks for area, energy cost, systems and building type. In the app these come from documents first, and the owner sees them with a badge and an Edit action. At most N owner confirmations are shown across steps 3 to 7 (proposed N = 7).

**Reserved terms in funnel copy.** If any funnel copy were reused in the app, the reserved-term check (guardrails 2.8) would flag these. Action labels such as "Solicită o ofertă" may be allowed as action labels; descriptive text is flagged.

| Text | Term | Source |
|------|------|--------|
| "Cerere ofertă personalizată" / "Custom offer request"; "Cerere ofertă" / "Offer request" | ofertă / offer | `app/cerere-oferta/page.tsx` |
| "... propunere adaptată exact nevoilor ..." / "... your building's exact needs." | exact | `app/cerere-oferta/page.tsx` |
| "Final details for the most accurate cost and ROI estimate." | final | `app/calculator-roi/page.tsx` |
| "Conformitate & ESG" | conformitate | `app/calculator-roi/page.tsx` |
| "Discover the exact potential savings ..."; "primește o ofertă personalizată" / "receive a personalised quote" | exact; ofertă / quote | `app/ghid-bms/calculator/page.tsx` |
| "... primește o ofertă personalizată pentru clădirea ta" / "... receive a personalised quote ..." | ofertă / quote | `app/ghid-bms/case-studies/page.tsx` |
| "Descoperă economiile potențiale exact pentru tine"; "Deblochează ofertă personalizată" / "Unlocks a personalised offer" | exact; ofertă / offer | `app/ghid-bms/dashboard/page.tsx` |
| "... te aduce mai aproape de o ofertă personalizată!" / "... closer to a personalised offer!" | ofertă / offer | `app/ghid-bms/multumim/page.tsx` |
| "Use the ROI calculator to estimate your exact savings" | exact | `app/ghid-bms/quiz/page.tsx` |
| "Precise production environment control for GMP-certified pharmaceutical facilities." | precise; certified | `app/ghid-bms/resurse/page.tsx` |

---

## 7. Points to raise with SOVITECH

These affect the website, not the app build. They are listed because the app will sit beside these funnels.

1. **No funnel captures leads in this commit.** The quote form, guide gate and contact form send nothing, and the quote form's thank-you screen promises a reply within 48 hours.
2. **The guide does not exist in the repository.** The pages promise a 42-page PDF (8.2 MB), an Excel ROI template, benchmarks and webinars. The download button does nothing and no email is sent.
3. **Broken links:** the privacy policy (`/politica-confidentialitate`), all three case-study cards in the guide, and the resources page buttons.
4. **Claims the code contradicts:** payback "de regulă 2–4 ani" against 13.9 years from the guide calculator's own defaults; "15 întrebări" against a 5-question quiz; an "Early Adopter" badge "for the first 100" shown to everyone; the "Scăzut" quiz level that no answer can reach.
5. **Case-study figures disagree across pages:** Radisson Blu 428 against 424 rooms; Therme 30.000 m² against 8.000 m².
6. **The quote form collects name, email and phone with no consent line or privacy link.** The guide gate has both. Whether this meets SOVITECH's data-protection obligations is for SOVITECH to judge.

---

## 8. Unmerged branch `redesign-2026`: changes to these funnels

**Status: unmerged branch content.** This section comes from the branch `origin/redesign-2026` of the website repository, commit `d2d15d2` (2026-08-24). The branch head `af81353` (2026-08-27) changes none of these pages. It only updates article covers, diagrams and the article cards that show them. The branch is not merged into `main`. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. This section is kept for reference only. Paths are paths on that branch. The code was read, never run. Sections 1 to 7 above describe `main` and are not changed by anything here.

**Still true on the branch:** no funnel sends data anywhere. There is still no API route, route handler, middleware, server action or `fetch` call, `package.json` adds no form or email service, and the only tracking is still the Vercel page-view analytics in `app/layout.tsx` (unchanged). This holds for the new `/ghid` and `/instrumente` pages too (8.5).

### 8.1 Quote request (`app/cerere-oferta/page.tsx`)

Fields, options, defaults and the Continue conditions are unchanged (2.2, 2.3). The copy changes:

| Place | `main` | Branch |
|-------|--------|--------|
| Eyebrow | "Cerere ofertă personalizată" / "Custom offer request" | "Cerere de ofertă" / "Offer request" |
| H1 | "Spune-ne despre proiectul tău" | "Cerere de ofertă pentru un sistem BMS: șase pași și un răspuns în ziua lucrătoare următoare" / "BMS offer request: six steps and an answer the next working day" |
| Sub | "Completează cei 6 pași ..." | "Formularul cere aproximativ cinci minute. ... Cu cât sunt mai precise instalațiile descrise, cu atât intervalul de buget rezultat este mai strâns." |
| Step 1 | "Ce tip de clădire ai?" | "Ce tip de clădire este", sub "Tipul clădirii decide densitatea de puncte și, implicit, ordinul de mărime al bugetului. Pentru clădirile cu funcțiuni mixte se alege funcțiunea dominantă." |
| Step 2 | "Detalii proiect" | "Ce dimensiune are proiectul", sub ending "O modernizare costă 40-60% din prețul unui sistem nou." |
| Step 3 | "Ce sisteme te interesează?" | "Ce instalații deservește sistemul", sub "Numărul de echipamente contează mai mult decât suprafața. Două clădiri de aceeași mărime pot avea bugete diferite cu 50%, în funcție de instalațiile deservite." |
| Step 4 | sub "Ce servicii îți dorești și când vrei să începi." | sub ending "Optimizarea unui sistem existent se amortizează în 1-3 ani, o modernizare de capital în 3-6 ani." |
| Step 5 | "Documentație & cerințe" | "Documentație și cerințe", sub starting "Lipsa documentelor nu blochează cererea. Pentru clădirile fără listă de puncte, primul pas este oricum un releveu." |
| Step 6 | "Date de contact" | "Cui se trimite răspunsul", sub "Răspunsul ajunge în ziua lucrătoare următoare. Pentru situațiile urgente, telefonul este mai rapid decât formularul." |
| Name placeholder | "Ion Popescu" / "John Smith" | "Nume și prenume" / "Full name". The email placeholder is still "ion.popescu@companie.ro". |
| Thank-you heading | "Cererea ta a fost trimisă" | "Cererea a fost înregistrată" / "Your request has been registered" |
| Thank-you body | a reply "în cel mult 48 de ore" | "Un inginer Sovitech Control citește cererea și răspunde în ziua lucrătoare următoare, cu confirmarea primirii și cu întrebările de clarificare, dacă sunt necesare. Estimarea de buget pe interval vine în 3-5 zile lucrătoare de la clarificarea datelor." |

- **The promise still has no receiver.** The thank-you screen now promises an engineer's answer the next working day and a budget range in 3-5 working days. Submitting still only sets a local flag.
- **New unsourced figures.** "40-60%" (modernisation against a new system), "cu 50%" (budget spread for the same size) and "1-3 ani" / "3-6 ani" (payback) are marketing statements with no basis in the repository. The payback pair matches the branch's typed sector cards in the ROI calculator (`roi-methodology.md` 6.4).
- **Keyboard focus.** The form now moves focus to each new step and to the confirmation. Nothing else about the steps changes.
- **Still no consent line or privacy link** on this form.

### 8.2 Contact form (`app/contact/page.tsx`)

The form heading is now "Trimiteți o cerere" / "Send a request", with the intro "Trei informații scurtează cel mai mult drumul până la un răspuns util: tipul clădirii, suprafața aproximativă și ce sistem de automatizare există astăzi, dacă există. Restul se clarifică la telefon." A code comment says the placeholders follow a rule of "no personal names in placeholders, field descriptions only".

| Field (`id`) | Label RO / EN | Control | Placeholder RO / EN | Required |
|--------------|---------------|---------|---------------------|----------|
| `firstName` | "Prenume" / "First name" | Text | "Prenumele persoanei de contact" / "Contact person's first name" | No |
| `lastName` | "Nume" / "Last name" | Text | "Numele persoanei de contact" / "Contact person's last name" | No |
| `email` | "Adresă de email" / "Email address" | Email | "adresa de email de serviciu" / "work email address" | No |
| `phone` | "Telefon" / "Phone" | Tel | "număr de telefon cu prefix" / "phone number with country code" | No |
| `subject` | "Subiectul cererii" / "Request subject" | Select; the first option shows by default | "Evaluare a clădirii", "Cerere de ofertă", "Suport tehnic pentru un sistem existent", "Întrebare despre produse SAUTER", "Colaborare ca proiectant sau antreprenor", "Altul" (EN "Building assessment", "Quote request", "Technical support for an existing system", "Question about SAUTER products", "Collaboration as a designer or contractor", "Other") | No |
| `message` | "Detalii despre cerere" / "Request details" | Textarea, 5 rows | "Ce sisteme tehnice există în clădire, ce funcționează prost astăzi, ce termen aveți" / "What technical systems the building has, what works poorly today, what deadline you have" | No |

On `main` the labels were "Email", "Subiect" and "Mesaj", and the subjects "Cerere oferta", "Consultanta BMS", "Suport tehnic", "Informatii produs", "Altele" (section 1).

**What happens on submit.**
- The button now reads "Trimite cererea" / "Send the request" (on `main`, "Trimite Mesaj" / "Send Message").
- The form is still a `<form>` with no `action`, no submit handler and no `name` attributes, so no field value is sent. No field is required.
- There is no success screen.

**New promises and notes on the page.**
- The hero now says: "Cererile trimise prin formular primesc răspuns în maximum două zile lucrătoare." / "Requests sent through the form receive an answer within two working days at most." The quote form promises an answer the next working day (8.1). Neither form has a receiver.
- A new privacy line sits under the button: "Datele din formular se folosesc pentru a răspunde la această cerere și pentru a pregăti o eventuală ofertă. Nu se vând și nu se transmit către terți în scop de marketing. Detalii în". It links "Politica de confidențialitate" to `/confidentialitate`, a route that exists on the branch.
- The closing call to action now reads "Estimați ordinul de mărime al investiției într-un sistem BMS" / "Estimate the order of magnitude of a BMS investment", linking to `/calculator-roi`.
- A code comment marks the direct-contact roles as still to be confirmed before publication. That is one more sign that the branch copy is not final.

### 8.3 ROI calculator (`/calculator-roi`)

The engine, results screen and new methodology page are in `company/business/roi-methodology.md` section 6. For this funnel:
- Steps, questions and Continue conditions are unchanged (section 4). It still blocks on energy cost, area, maintenance budget and at least one goal.
- On the branch no goal reaches the formula, because the goal multipliers were removed. Step 5 therefore requires an answer that changes no output. In the app such a question fails registry validation (rule 6, G6-1).
- A link to `/calculator-roi/metodologie` appears on every step and on the results screen.
- Results show savings, payback and cost as ranges. The share text carries the ranges. "ROI 5 ani" and "Beneficiu net 5 ani" stay single figures.
- A new choice, the savings "domain" (whole building, HVAC or FDD), is offered only on the results screen and recalculates at once. It is not a step and blocks nothing.
- The step 6 budget hint no longer names "aprox. 25 EUR/m²".
- A registry alias, `/instrumente/calculator-economie-energie-bms`, redirects permanently to `/calculator-roi` (8.5).
- The sector pages that link here moved from `/sectoare/[sector]` to `/expertiza/[sector]`.

### 8.4 BMS guide funnel (`/ghid-bms`)

Most guide pages change only in layout classes: the landing, download gate, thank-you page, dashboard, quiz and guide calculator. The quiz also moves keyboard focus to each new question. The content changes are:
- **Case-study cards** (`app/ghid-bms/case-studies/page.tsx`): the button now reads "Vezi proiectul în referințe" / "See the project in our references" and links to `/referinte`, a route that exists on the branch. This replaces the three broken links (3.7).
- **Dashboard** (`app/ghid-bms/dashboard/page.tsx`): "Vezi Proiecte" now links to `/referinte`.
- **Resources page** (`app/ghid-bms/resurse/page.tsx`): the "Studii de Caz Detaliate" section is removed. The calculator and quiz buttons still have no link, the "15 întrebări" line remains, and the four "Citește articolul →" buttons still have no link.

Unchanged on the branch: the case-study figures ("35%", "2.8 ani", "280 tone/an", "Hotel 5 stele cu 428 camere", and the others in 3.7); the gate's privacy link to `/politica-confidentialitate`, which still has no route (the branch's privacy page is `/confidentialitate`); the simulated submit ("Simulate form submission", 1.5 seconds); no guide file; the quiz questions, scoring and the unreachable "Scăzut" level; the hard-coded dashboard progress and badges. `/ghid-bms` is still not in the sitemap.

### 8.5 New: reference guides (`/ghid`) and tools (`/instrumente`)

The branch adds two sections built from a route registry (`lib/site-routes.ts`). Each entry there is "published" (a page exists), "planned" (listed, never linked; its URL returns 404) or "alias" (redirects elsewhere, `next.config.mjs`). A code comment says the registry declares every URL of the editorial plan "BEFORE its content exists".

**Shared frame (`components/entry-shell.tsx`).** It frames a guide, article or tool page. It shows the entry's category as an eyebrow, the title as H1 and the description as the lead. A cluster article adds a link "Ghidul complet:" / "Full guide:" to its pillar, unless the pillar is planned. A pillar guide adds a list "Articole din acest grup" / "Articles in this group", where planned articles show as plain text. The frame has no form, input or call to action.

**Hubs (`components/section-hub.tsx`).** Both hubs list published and alias entries as cards with "Deschide" / "Open", and planned entries unlinked under "În pregătire" / "In preparation". A hub is marked noindex while its section has no published entry.

**Guides (`app/ghid/page.tsx`, `app/ghid/[slug]/page.tsx`).**
- Hub: label "Ghiduri" / "Guides", H1 "Ghidurile de referință pentru automatizarea clădirilor" / "Reference guides for building automation", lead "Șase ghiduri care acoperă arhitectura, specificația, datele, protocoalele, modernizarea și conformarea. Fiecare este punctul de plecare pentru un grup de articole mai scurte."
- Linked from the header ("Ghiduri de referință" / "Reference Guides") and the footer. In the sitemap: the hub (0.8) and the three published guides (0.9).
- Routes exist only for published guides. A guide page is the frame, the article body from `components/articles/`, JSON-LD, and the article layout (category, "Scris de" / "Written by", dates, copy-link and share buttons).

| Slug | Title RO | Status |
|------|----------|--------|
| `sisteme-bms-cladiri` | "Sistem BMS pentru clădiri: ghidul complet" | Published |
| `caiet-de-sarcini-bms` | "Caiet de sarcini pentru un sistem BMS" | Published |
| `date-esg-cladiri` | "De unde vin datele pentru raportarea ESG a unei clădiri" | Published |
| `protocoale-automatizarea-cladirilor` | "BACnet, Modbus, KNX, M-Bus și LON: cum alegi protocolul potrivit" | Planned |
| `modernizare-bms` | "Modernizarea unui sistem BMS: de la audit la plan de investiții" | Planned |
| `conformare-cladiri-romania` | "Harta conformării pentru clădiri în România" | Planned |

**The guides' calls to action all go to `/contact`.** The three published guides hold eight links to the contact page, each asking the reader to request something:

| Link text | Guide | Planned final target (code comment) |
|-----------|-------|-------------------------------------|
| "cere un calcul de economie" | `sisteme-bms-cladiri` | `/instrumente/calculator-economie-energie-bms` |
| "cere o comparație a indicatorilor cu reperele de piață" | `sisteme-bms-cladiri` | `/instrumente/benchmark-kwh-mp` |
| "cere o verificare a pragului de putere" | `sisteme-bms-cladiri`, and in `caiet-de-sarcini-bms` "... pentru clădirea respectivă" | `/instrumente/test-obligatie-bacs` |
| "Cere checklistul de audit BMS" | `sisteme-bms-cladiri` | `/instrumente/checklist-audit-bms` |
| "Cere modelul de caiet de sarcini BMS" | `sisteme-bms-cladiri`, `caiet-de-sarcini-bms` | `/instrumente/model-caiet-de-sarcini-bms` |
| "cere reperul de consum kWh/mp pentru clădiri de birouri" | `date-esg-cladiri` | `/instrumente/benchmark-kwh-mp` |

- The code comments ("LINKS-TO-REACTIVATE") name `/contact` as the interim target and a tool page as the final one.
- The contact form sends nothing (8.2). So each of these requests reaches no one, unless the reader uses the phone numbers or email addresses on the contact page.
- The savings-calculator link goes to `/contact`, although the calculator already exists at `/calculator-roi`.
- `date-esg-cladiri` also offers: "Evaluarea este gratuită și durează o vizită plus o discuție de două ore."

**Tools (`app/instrumente/page.tsx`, `app/instrumente/[slug]/page.tsx`).**
- Hub: label "Instrumente" / "Tools", H1 "Opt instrumente pentru specificare, audit și estimare de buget" / "Eight tools for specification, audits and budget estimates". Lead: "Instrumente de lucru, nu materiale de prezentare: calculatorul de economie este disponibil acum și returnează intervale, nu cifre unice, iar modelele de caiet de sarcini, listele de verificare și testul de încadrare sub pragul de 290 kW sunt în pregătire și se pot cere între timp prin pagina de contact."
- The hub is noindex and not in the sitemap, because no tool is published. It is not linked from the header or footer. The role pages (`/pentru/...`, `components/role-page.tsx`) list the tools tagged for each role.
- No tool page exists. Routes are generated only for published tools, and none is published, so every `/instrumente/<slug>` returns 404 except the alias, which redirects before rendering. A published tool page would show only the frame, with no body.

| Slug | Title RO | Status | What the registry says it will be |
|------|----------|--------|-----------------------------------|
| `model-caiet-de-sarcini-bms` | "Model de caiet de sarcini BMS (DOCX)" | Planned | "Cele 15 secțiuni cu text comentat, tabelul listei de puncte și checklistul de 20 de puncte." |
| `checklist-audit-bms` | "Checklist de audit pentru un BMS existent (PDF)" | Planned | "8 secțiuni și peste 60 de puncte de verificare pe un sistem în funcțiune." |
| `calculator-economie-energie-bms` | "Calculator: economia estimată dintr-un BMS" | Alias to `/calculator-roi` | "Interval de economie și amortizare, pornind de la suprafață, tip de clădire și consum anual." |
| `test-obligatie-bacs` | "Test: clădirea ta intră sub obligația BACS?" | Planned | "Cinci întrebări: tip de clădire, putere instalată, an, renovare majoră, automatizare existentă." |
| `benchmark-kwh-mp` | "Benchmark kWh/mp pentru clădiri de birouri din România" | Planned | "Poziționarea clădirii tale față de un portofoliu anonimizat, actualizat anual." |
| `model-caiet-de-sarcini-scada` | "Model de caiet de sarcini SCADA (DOCX)" | Planned | "Varianta industrială a modelului de caiet de sarcini." |
| `template-raport-lunar-cladire` | "Template de raport lunar de performanță (XLSX)" | Planned | "Cei 10 KPI, gata de completat, cu formule și foaie de completitudine a datelor." |
| `dictionar` | "Dicționar BMS și SCADA" | Planned | "Peste 25 de termeni, fiecare cu pagină proprie și schema DefinedTerm." |

The calculator's registry description says it starts from "consum anual". The calculator asks annual energy cost in EUR, not consumption (section 4).

**Forms.** Neither section has a form, input, download or submit action. The only way to "request" a tool is the contact form, which sends nothing.

**Relevance to the app.** None of these pages asks anything today. Two planned tools touch the guardrails if SOVITECH builds them:
- **The BACS test** would ask building type, installed power, year, major renovation and existing automation. In the app, whether an obligation applies stays Unknown until an engineer verifies the facts, the effective rated output is a technical fact for engineers, and the app never attests compliance (rules 3 and 11).
- **The kWh/m² benchmark** would compare a building with "un portofoliu anonimizat". In the app, benchmarks built from past projects need the owners' agreement and anonymisation, and enter only as a versioned reference dataset with approval (rule 13, section 10).
- **The contact form's three pieces of information** map to the app as before: building type and area are read from documents, with the area basis stated (rules 5 and 8). Existing automation is an engineer question, and reuse is never assumed (rule 1, G1-6, G1-7).

### 8.6 Section 7 points, as they stand on the branch

| Point | On the branch |
|-------|---------------|
| 1. No lead capture | Unchanged. The quote form's promise changes from 48 hours to the next working day. The contact page now promises an answer within two working days, and the new guides send readers to its form for five kinds of request (8.5). |
| 2. The guide does not exist | Unchanged |
| 3. Broken links | The case-study cards are fixed. The gate's privacy link and the resources page buttons are still broken. |
| 4. Claims the code contradicts | Unchanged for the guide pages |
| 5. Case-study figures disagree | Unchanged on the guide pages |
| 6. No consent line on the quote form | Unchanged. The contact form gains a privacy line. |

### 8.7 Reserved terms in the new branch copy

As in 6.3, if this copy were reused in the app, the reserved-term check (guardrails 2.8) would flag it. Matching is whole-word and ignores case, diacritics and language, so the Romanian plural "precise" matches the English term. The new `/ghid` and `/instrumente` hub copy, the registry titles and descriptions for both sections, and the guides' call-to-action links contain no reserved term. The guide bodies were not checked here. The ROI calculator's and methodology page's terms are in `roi-methodology.md` 6.11.

| Text | Term | Source |
|------|------|--------|
| "Cerere de ofertă" / "Offer request"; "Cerere de ofertă pentru un sistem BMS ..." / "BMS offer request ..." | ofertă / offer | `app/cerere-oferta/page.tsx` |
| "Cu cât sunt mai precise instalațiile descrise ..." | precise | `app/cerere-oferta/page.tsx` |
| "... la cereri de ofertă pentru sisteme de automatizare și BMS ..." / "... quote requests ..."; subject "Cerere de ofertă" / "Quote request"; "... o eventuală ofertă." / "... a possible quote." | ofertă / quote | `app/contact/page.tsx` |
