# Case study: Radisson Blu București

This is a faithful markdown copy of the Radisson Blu București case study on the SOVITECH website, in English and Romanian, with every section, figure, quote and named product. It ends with a comparison against the app's fictional demo project, which the mockups call "Radisson Blu Bucharest". The app's demo no longer uses the real hotel's name (owner decision, 2026-09-24). It was copied from the website repository at commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11). The last section records the changes on the unmerged branch `redesign-2026` (commit `af81353`), for reference only. That branch is not SOVITECH's current position and will not be merged (owner decision, 2026-09-24).

Source: `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` (route `/resurse/studii-de-caz/radisson-bucuresti`), unless a section names another file.

## Status of this content

- **Marketing copy.** This is the company's own published account. Its figures (424 rooms, 82.6% and 75.4% BREEAM scores, ~30% energy reduction, the 10-week programme) are not verified engineering data and are not an approved reference dataset.
- **Not usable as values.** The app may not use them as values, defaults or benchmarks, and may not use them to fill or "correct" the demo fixture (guardrails rule 1, section 2.1, section 10).
- **Real hotel.** Radisson Blu Hotel Bucharest is a real hotel. The app's demo no longer uses its name (owner decision, 2026-09-24). Rule 10 still requires the app's demo to show "Demo data, not an assessment of the real building" on every screen and export.
- **Unverified.** I have not checked any statement here against the hotel, the BREEAM register or SOVITECH's project files.

## Page facts

| Item | RO | EN |
|------|----|----|
| Breadcrumb | Resurse / Studii de caz / Radisson Blu | Resources / Case Studies / Radisson Blu |
| Back link | Înapoi la studii de caz (→ `/resurse/referinte`) | Back to Case Studies |
| Category pill | HORECA — Hotel 5 stele | HORECA — 5-Star Hotel |
| Client | Radisson Blu București | Radisson Blu București |
| Industry | HORECA - Hotel 5 stele | HORECA - 5-Star Hotel |
| Service | BMS complet: proiectare, execuție, integrare | Full BMS: Design, Execution, Integration |
| Technology | SAUTER modulo - BACnet / KNX / Modbus | SAUTER modulo - BACnet / KNX / Modbus |
| Certification | BREEAM In-Use Excellent (2025) | BREEAM In-Use Excellent (2025) |
| Sidebar button | Cere o consultanță (→ `/contact`) | Request a Consultation |
| Share button | Distribuie / Copiat | Share / Copied |
| Hero image | `/luxury-hotel-lobby-modern-interior.jpg`, alt "Radisson Blu București — lobby de hotel modern" | alt "Radisson Blu Bucharest - Modern hotel lobby" |
| Listing date and read time | 5 DEC 2025 · 7 MIN CITIRE (from `app/resurse/page.tsx`; the page itself shows no date) | DEC 5, 2025 · 7 MIN READ |
| Listing title | Radisson Blu Bucuresti: automatizare hotel 5 stele | Radisson Blu Bucharest: 5-star hotel automation |

The hero image file name describes a generic lobby. Nothing in the repo shows it is a photo of this hotel.

## Headline

**RO.** Cum a obținut Radisson Blu București certificarea BREEAM Excellent prin automatizare BMS integrată

**EN.** How Radisson Blu Bucharest achieved BREEAM Excellent certification through integrated BMS automation

**RO standfirst.** 424 de camere, 12 săli de conferință, restaurant, spa, piscină — toate unificate într-o singură platformă inteligentă de control cu tehnologie SAUTER din Elveția.

**EN standfirst.** 424 rooms, 12 conference halls, restaurant, spa, pool — all unified in a single intelligent control platform with SAUTER technology from Switzerland.

## Metrics card

| Value | RO | EN |
|-------|----|----|
| 424 | Camere monitorizate | Monitored rooms |
| 82,6% | Scor energetic BREEAM | BREEAM Energy Score |
| ~30% | Reducere consum energetic | Energy consumption reduction |
| 24/7 | Monitorizare activă | Active monitoring |

The source writes "82,6%" with a decimal comma in both languages. The body text uses "82,6%" in RO and "82.6%" in EN.

## Contents (sidebar)

| Anchor | RO | EN |
|--------|----|----|
| `#despre` | Despre Radisson Blu | About Radisson Blu |
| `#provocarea` | Provocarea | The Challenge |
| `#solutia` | Soluția | The Solution |
| `#implementare` | Implementare | Implementation |
| `#rezultate` | Rezultate | Results |
| `#de-ce-sovitech` | De ce Sovitech | Why Sovitech |
| `#beneficii` | Beneficii HoReCa | Hospitality Benefits |

## About Radisson Blu Bucharest / Despre Radisson Blu București

**EN.** Radisson Blu Hotel Bucharest is a landmark 5-star hotel in the Romanian capital. Opened in 2007, it offers 424 rooms (including standard, business-class and suites) and extensive conference and leisure facilities. The hotel includes 12 conference halls (one of 540 m² for 500 people), multiple restaurants, bars, spa, fitness centre, pool and other recreational spaces.

**EN.** In 2025 the hotel achieved BREEAM In-Use Excellent certification, with a score of 82.6% for Energy and 75.4% for Health & Wellbeing. These results highlight the hotel's commitment to energy efficiency and maintaining indoor comfort and air quality at the highest level.

**RO.** Radisson Blu Hotel București este un hotel de 5 stele emblematic din capitala României. Deschis în 2007, oferă 424 de camere (standard, business-class și suite) și facilități extinse de conferință și agrement. Hotelul include 12 săli de conferință (una de 540 m² pentru 500 de persoane), mai multe restaurante, baruri, spa, centru de fitness, piscină și alte spații de recreere.

**RO.** În 2025 hotelul a obținut certificarea BREEAM In-Use Excellent, cu un scor de 82,6% pentru Energie și 75,4% pentru Health & Wellbeing. Aceste rezultate evidențiază angajamentul hotelului față de eficiența energetică și menținerea confortului și calității aerului la cel mai înalt nivel.

## The Challenge / Provocarea

**EN.** Managing a luxury hotel operating 24/7 involves complex operational challenges. Heating, cooling, ventilation, lighting and water/pool systems must maintain guest comfort across dozens of different zones, while simultaneously controlling energy consumption.

**RO.** Administrarea unui hotel de lux care operează 24/7 implică provocări operaționale complexe. Sistemele de încălzire, răcire, ventilație, iluminat și apă/piscine trebuie să mențină confortul oaspeților în zeci de zone diferite, controlând în același timp consumul de energie.

| # | Icon | Title EN | Text EN | Title RO | Text RO |
|---|------|----------|---------|----------|---------|
| 1 | Wifi | Disparate systems | HVAC and lighting were controlled independently, limiting visibility and coordination. | Sisteme disparate | HVAC și iluminatul erau controlate independent, limitând vizibilitatea și coordonarea. |
| 2 | Zap | High energy consumption | Continuous 24/7 operation amplified even minor inefficiencies, generating significant costs. | Consum energetic ridicat | Operarea continuă 24/7 amplifica chiar și ineficiențe minore, generând costuri semnificative. |
| 3 | Users | Manual monitoring | Without centralised automation, the team relied on manual checks and fixed schedules. | Monitorizare manuală | Fără automatizare centralizată, echipa se baza pe verificări manuale și programe fixe. |
| 4 | Award | Sustainability targets | Ambitious BREEAM objectives and 100% renewable electricity required advanced control. | Obiective de sustenabilitate | Obiectivele ambițioase BREEAM și electricitatea 100% regenerabilă necesitau control avansat. |

## Testimonial

**EN.** "Achieving BREEAM certification is a proud moment that reflects our deep commitment to sustainable hospitality. Sovitech's automation solutions directly support that commitment, making hotel operations more efficient and environmentally friendly."

**RO.** „Obținerea certificării BREEAM este un moment de mândrie care reflectă angajamentul nostru profund față de ospitalitatea sustenabilă. Soluțiile de automatizare Sovitech susțin direct acest angajament, făcând operațiunile hotelului mai eficiente și mai prietenoase cu mediul.”

Attribution: "General Manager", Radisson Blu București (avatar initials "GM"). No name is given.

## The Solution: Sovitech BMS Automation / Soluția: automatizare BMS Sovitech

**EN.** Sovitech Control delivered a centralised Building Management System (BMS) that connects all hotel systems into a single intelligent, energy-efficient platform.

**RO.** Sovitech Control a livrat un sistem centralizat de management al clădirii (BMS) care conectează toate sistemele hotelului într-o singură platformă inteligentă și eficientă energetic.

| # | Icon | Title EN | Text EN | Title RO | Text RO |
|---|------|----------|---------|----------|---------|
| 1 | Building2 | Centralised platform | Unified SAUTER interface for monitoring and controlling HVAC, lighting and other systems from a single dashboard. | Platformă centralizată | Interfață SAUTER unificată pentru monitorizarea și controlul HVAC, iluminat și alte sisteme dintr-un singur dashboard. |
| 2 | Thermometer | Zoned HVAC automation | Climate control by zone across rooms, corridors, conference halls and spa, adapting to occupancy and outdoor conditions. | Automatizare HVAC pe zone | Control climatic pe zone în camere, coridoare, săli de conferință și spa, adaptat la ocupare și condițiile exterioare. |
| 3 | BarChart3 | Energy monitoring | Real-time metering of electricity and heating by zone (kitchens, laundry, pools) to identify waste. | Monitorizare energetică | Contorizare în timp real a electricității și încălzirii pe zone (bucătării, spălătorie, piscine) pentru a identifica risipa. |
| 4 | Shield | Systems integration | Communication with sub-systems via KNX, DALI, Modbus, M-Bus, BACnet protocols and integration with Fidelio PMS. | Integrare sisteme | Comunicare cu sub-sistemele prin protocoale KNX, DALI, Modbus, M-Bus, BACnet și integrare cu PMS-ul Fidelio. |

**EN.** Sovitech also integrated the system with the Fidelio hotel PMS, allowing room occupancy data to be linked to HVAC and lighting control for automatic optimisation.

**RO.** Sovitech a integrat de asemenea sistemul cu PMS-ul hotelier Fidelio, permițând ca datele de ocupare a camerelor să fie legate de controlul HVAC și al iluminatului pentru optimizare automată.

## Implementation Process / Procesul de implementare

**EN.** The implementation was carried out in phases to avoid disruption to hotel operations. Full switchover to the new system took place during periods of low occupancy.

**RO.** Implementarea a fost realizată în etape, pentru a evita perturbarea operațiunilor hotelului. Comutarea completă la noul sistem a avut loc în perioadele cu ocupare redusă.

| # | Phase EN | Weeks EN | Description EN | Phase RO | Weeks RO | Description RO |
|---|----------|----------|----------------|----------|----------|----------------|
| 1 | Audit and design | Week 1–3 | Inventory of HVAC, chillers, boilers, pumps and electricity meters. BMS architecture design with SAUTER controllers and modules. | Audit și proiectare | Săptămâna 1–3 | Inventarul HVAC, chillere, cazane, pompe și contoare de electricitate. Proiectarea arhitecturii BMS cu controlere și module SAUTER. |
| 2 | Equipment installation | Week 3–6 | Mounting of programmable controllers and I/O modules in technical rooms. Installation of SAUTER valves, dampers and actuators on HVAC units. | Instalare echipamente | Săptămâna 3–6 | Montarea controlerelor programabile și modulelor I/O în camerele tehnice. Instalarea vanelor, clapetelor și actuatoarelor SAUTER pe unitățile HVAC. |
| 3 | Network integration | Week 5–7 | Connecting all devices via KNX/DALI/M-Bus and linking to the central SAUTER modulo servers. | Integrare în rețea | Săptămâna 5–7 | Conectarea tuturor dispozitivelor prin KNX/DALI/M-Bus și legarea la serverele centrale SAUTER modulo. |
| 4 | Software configuration | Week 6–8 | Programming control logic (schedules, setpoints, alarms). Creating custom dashboards with live data. | Configurare software | Săptămâna 6–8 | Programarea logicii de control (programe, setpoint-uri, alarme). Crearea de dashboard-uri personalizate cu date live. |
| 5 | Testing and commissioning | Week 8–10 | Testing every sub-system, calibrating sensors, verifying protections. Full switchover during periods of low occupancy. | Testare și punere în funcțiune | Săptămâna 8–10 | Testarea fiecărui sub-sistem, calibrarea senzorilor, verificarea protecțiilor. Comutare completă în perioadele cu ocupare redusă. |

The phases overlap and span weeks 1 to 10. The page gives no calendar dates for the project.

## Results and Impact / Rezultate și impact

**EN.** Following implementation, Radisson Blu Bucharest achieved significant benefits in operational control and sustainability. The Sovitech BMS gave the hotel unprecedented visibility over its building systems.

**RO.** În urma implementării, Radisson Blu București a obținut beneficii semnificative în controlul operațional și sustenabilitate. BMS-ul Sovitech a oferit hotelului o vizibilitate fără precedent asupra sistemelor sale.

| # | Icon | Title EN | Text EN | Title RO | Text RO |
|---|------|----------|---------|----------|---------|
| 1 | BarChart3 | Real-time visibility | Managers have instant access to all systems. A single dashboard shows zone-level HVAC conditions, energy consumption and equipment status. | Vizibilitate în timp real | Managerii au acces instantaneu la toate sistemele. Un singur dashboard arată condițiile HVAC pe zone, consumul de energie și starea echipamentelor. |
| 2 | Thermometer | Enhanced comfort | More precise climate control ensures consistent comfort. Advanced CO₂ and humidity sensors support the 75.4% Health & Wellbeing score. | Confort sporit | Controlul climatic mai precis asigură un confort constant. Senzorii avansați de CO₂ și umiditate susțin scorul de 75,4% Health & Wellbeing. |
| 3 | Zap | ~30% energy savings | Reduced boiler run times and optimised chiller operation during unoccupied periods. Monthly reports identify inefficiencies. | ~30% economii de energie | Timpi reduși de funcționare a cazanelor și operare optimizată a chillerelor în perioadele neocupate. Rapoartele lunare identifică ineficiențele. |
| 4 | Shield | Operational efficiency | Alarms and trend logging enable proactive maintenance. The team can intervene remotely and detect anomalies before failures occur. | Eficiență operațională | Alarmele și logarea tendințelor permit mentenanță proactivă. Echipa poate interveni de la distanță și detecta anomaliile înainte de defecțiuni. |
| 5 | Award | Sustainability compliance | Energy and water consumption optimisation, plus interfaces with renewable sources, supports BREEAM Excellent objectives. | Conformitate cu sustenabilitatea | Optimizarea consumului de energie și apă, plus interfețele cu sursele regenerabile, susțin obiectivele BREEAM Excellent. |
| 6 | Building2 | Scalability | The platform can grow with new zones and future integration of renewable systems, without a complete rebuild. | Scalabilitate | Platforma poate crește cu noi zone și integrarea viitoare a sistemelor regenerabile, fără o reconstrucție completă. |

The "~30%" figure has no stated baseline, period, weather normalisation or metering basis.

## Why Radisson Blu chose Sovitech / De ce a ales Radisson Blu compania Sovitech

**EN.** Sovitech was selected for its specialised expertise in HORECA automation and its proven portfolio of similar projects. Sovitech's client list includes renowned hotels: Radisson, Crowne Plaza, Hilton Athenee Palace, Novotel and others.

**RO.** Sovitech a fost selectat pentru expertiza specializată în automatizarea HORECA și portofoliul dovedit de proiecte similare. Lista de clienți Sovitech include hoteluri renumite: Radisson, Crowne Plaza, Hilton Athenee Palace, Novotel și altele.

| # | EN | RO |
|---|----|----|
| 1 | Specialised expertise in hotel systems: Fidelio integration, pool control, room monitoring | Expertiză specializată în sisteme hoteliere: integrare Fidelio, control piscine, monitorizare camere |
| 2 | Premium SAUTER technology: controllers and sensors meeting the highest international standards | Tehnologie premium SAUTER: controlere și senzori care respectă cele mai înalte standarde internaționale |
| 3 | Full-service delivery: design, execution, integration and maintenance from a single provider | Livrare full-service: proiectare, execuție, integrare și mentenanță de la un singur furnizor |
| 4 | Local support: Bucharest-based team with fast response times and knowledge of local regulations | Suport local: echipă din București cu timp de răspuns rapid și cunoașterea reglementărilor locale |

## Key benefits for hotel facilities / Beneficii cheie pentru facilitățile hoteliere

**EN.** Hotels that invest in modern BMS systems gain significant strategic advantages. The Sovitech system for Radisson Blu delivers:

**RO.** Hotelurile care investesc în sisteme BMS moderne obțin avantaje strategice semnificative. Sistemul Sovitech pentru Radisson Blu livrează:

| # | Title EN | Text EN | Title RO | Text RO |
|---|----------|---------|----------|---------|
| 1 | Centralised control | Unified management of HVAC, lighting, pools/spa and security from a single platform. | Control centralizat | Management unificat al HVAC, iluminat, piscine/spa și securitate de pe o singură platformă. |
| 2 | Guest comfort | Automatic climate and air-quality control supports a 5-star experience. | Confortul oaspeților | Controlul automat al climatului și calității aerului susține o experiență de 5 stele. |
| 3 | Energy transparency | Real-time metering and reports showing where energy is consumed and saved. | Transparență energetică | Contorizare în timp real și rapoarte care arată unde este consumată și economisită energia. |
| 4 | Integrated hotel operations | BMS-PMS (Fidelio) link enables occupancy-based HVAC setback and housekeeping alerts. | Operațiuni hoteliere integrate | Legătura BMS-PMS (Fidelio) permite reducerea HVAC în funcție de ocupare și alerte pentru housekeeping. |
| 5 | Maintenance efficiency | Remote monitoring and alerts reduce downtime and the risk of inconvenience to guests. | Eficiență în mentenanță | Monitorizarea și alertele de la distanță reduc timpii de nefuncționare și riscul de disconfort pentru oaspeți. |
| 6 | Regulatory compliance | Automated systems simplify sustainability, safety and comfort certifications. | Conformitate cu reglementările | Sistemele automate simplifică certificările de sustenabilitate, siguranță și confort. |

## Conclusion / Concluzie

**EN.** By implementing the integrated Sovitech BMS, Radisson Blu Bucharest transformed its infrastructure into an intelligent, efficient facility. The project achieved higher levels of guest comfort, enhanced visibility for facilities managers and notable reductions in energy consumption.

**EN.** This case study illustrates a best practice: aligning hotel operations with sustainability and efficiency objectives through technology. Sovitech BMS automation enables hotels to achieve these results, creating a future-ready hotel that delights guests and delivers measurable sustainability gains.

**RO.** Prin implementarea BMS-ului integrat Sovitech, Radisson Blu București și-a transformat infrastructura într-o facilitate inteligentă și eficientă. Proiectul a atins niveluri mai ridicate de confort pentru oaspeți, vizibilitate sporită pentru managerii de facilități și reduceri notabile ale consumului de energie.

**RO.** Acest studiu de caz ilustrează o bună practică: alinierea operațiunilor hoteliere la obiectivele de sustenabilitate și eficiență prin tehnologie. Automatizarea BMS Sovitech permite hotelurilor să obțină aceste rezultate, creând un hotel pregătit pentru viitor, care încântă oaspeții și livrează câștiguri măsurabile de sustenabilitate.

## Closing CTA and related links

| Element | RO | EN |
|---------|----|----|
| CTA heading | Vrei rezultate similare pentru hotelul tău? | Want similar results for your hotel? |
| CTA text | Contactează echipa noastră pentru o consultanță personalizată și un plan de eficiență. | Contact our team for a personalised consultation and efficiency plan. |
| CTA button | Contactează-ne (→ `/contact`) | Contact us |
| Related heading | Alte studii de caz | Other case studies |
| Related card 1 | HORECA - Spa & Wellness · Therme București · "Reducere de 35% a costurilor energetice prin automatizare BMS pentru complexul de wellness." · Citește studiul | "35% reduction in energy costs through BMS automation for the wellness complex." · Read the study |
| Related card 2 | Proiectul tău · "Următorul studiu de caz poate fi al tău" · "Contactează-ne pentru a discuta cum îți putem transforma clădirea într-un spațiu inteligent și eficient." · Vorbește cu un specialist (→ `/contact`) | Your project · "The next case study could be yours" · "Contact us to discuss how we can transform your building into an intelligent, efficient space." · Speak to a specialist |

## SAUTER products, protocols and systems named

| Kind | As written on the page |
|------|------------------------|
| SAUTER platform | "SAUTER modulo" (sidebar); "the central SAUTER modulo servers" (phase 3) |
| SAUTER hardware | "SAUTER controllers and modules" (phase 1); "programmable controllers and I/O modules" (phase 2); "SAUTER valves, dampers and actuators" (phase 2); "controllers and sensors" (why Sovitech) |
| SAUTER software | "Unified SAUTER interface" (solution 1); "custom dashboards with live data" (phase 4) |
| Protocols | KNX, DALI, Modbus, M-Bus, BACnet (solution 4); KNX/DALI/M-Bus (phase 3); "BACnet / KNX / Modbus" (sidebar) |
| Third-party system | Fidelio PMS |
| Plant | chillers, boilers, pumps, electricity meters, HVAC units; pools; kitchens and laundry as metered zones |
| Origin claim | "SAUTER technology from Switzerland" / "tehnologie SAUTER din Elveția" |

No SAUTER model number or product line generation (for example EY-modulo 5 or modulo 6) is named. "modulo servers" is the page's wording. In the app, SAUTER product names come only from the SAUTER catalogue reference data (rule 1).

## How other pages describe this project

The same project is summarised with different figures and different people on other pages.

| Source file | What it says |
|-------------|--------------|
| `components/case-study-slider.tsx` (homepage slider) | Quote by "Maria Ionescu", "Facility Manager", Radisson Blu Bucharest: "Sistemul BMS de la Sovitech a transformat complet modul în care operăm. Controlul integrat ne oferă transparență totală și economii substanțiale." / "The BMS system from Sovitech completely transformed how we operate. Integrated control gives us total transparency and substantial savings." Stats: 40% "Eficiență operațională" / "Operational efficiency"; 200+ "Puncte monitorizare" / "Monitoring points"; 2 ani "Perioadă ROI" / 2 years "ROI period". Industry "HORECA — Hotel". Image `/luxury-hotel-lobby-modern-interior.jpg`. |
| `app/resurse/studii-de-caz/therme-bucuresti/page.tsx` (related card) | "Creștere de 40% a eficienței operaționale prin control BMS integrat." / "40% increase in operational efficiency through integrated BMS control." |
| `lib/sector-data.ts` (HoReCa testimonial) | "Radu Georgescu", General Manager, Radisson Blu Bucharest: rooms prepared through the "Opera PMS", "32% less energy than before". |
| `app/resurse/articole/optimizare-hotel-bms/page.tsx` | 424 rooms; "indoor and outdoor pools"; adopted automation "to meet its Green Key certification"; BREEAM In-Use Excellent 82.6%; 100% renewable electricity; "a ballroom for 500+ guests"; "EUR 1.6M investment in event spaces to reduce the carbon footprint". See `../articles/optimizare-hotel-bms.md`. |
| `app/resurse/referinte/page.tsx` | "Radisson Blu Hotel": "BMS automation for a 5-star hotel with over 1,800 m² of event space"; scope "BMS, temperature control, ventilation". |
| `app/ghid-bms/case-studies/page.tsx` (the guide's case-study cards; see [lead-funnels.md](../lead-funnels.md), section 3.7) | "Hotel 5 stele cu 428 camere - automatizare completă BMS" / "5-star hotel with 428 rooms - complete BMS automation"; savings 32%; payback 2.8 years; CO₂ 280 t/yr. |
| `app/ghid-bms/resurse/page.tsx` | "Optimizare confort și eficiență energetică pentru hotel 5 stele cu 428 camere." / "Comfort and energy efficiency optimisation for a 5-star hotel with 428 rooms." No person is named. |
| `components/aethel-testimonials.tsx` (homepage customer spotlight; see [company-profile.md](../company-profile.md#9-testimonials), section 9.1) | 428 rooms ("Amploare" / "Scale": "428 camere") and a quote by "Maria Popescu", "Facility Manager" / "Facilities Manager": "Colaborarea cu Sovitech ne-a adus nu doar tehnologie de top, ci și o echipă care înțelege nevoile specifice ale industriei hoteliere." / "Working with Sovitech gave us not only top technology, but also a team that understands the specific needs of the hotel industry." It links to this case study. |
| `app/servicii/page.tsx` (services page testimonials; see [company-profile.md](../company-profile.md#9-testimonials), section 9.2) | The same Maria Popescu quote, written without diacritics, role "Facility Manager, Radisson Blu" / "Facilities Manager, Radisson Blu". No room count. |

## Inconsistencies on the website

- **Room count:** 424 (case study, hotel article) against 428 (`app/ghid-bms/*`, `components/aethel-testimonials.tsx`).
- **Energy result:** "~30%" energy consumption reduction (case study) against "32%" less energy (sector testimonial, `app/ghid-bms/case-studies/page.tsx`). The slider and the Therme page's related card use "40% operational efficiency" instead, which is a different measure.
- **PMS:** Fidelio (case study; the hotel article lists "Integrare Fidelio" only as a generic SOVITECH offering) against Opera (sector testimonial). The site does not say whether these refer to the same system at this hotel.
- **Certification:** BREEAM In-Use Excellent (case study, article) and "Green Key" (article only).
- **Pools:** "pool" (case study) against "indoor and outdoor pools" (article).
- **Who is quoted:** an unnamed General Manager (case study), Radu Georgescu, General Manager (sector page), Maria Ionescu, Facility Manager (slider), and Maria Popescu, Facility Manager (`components/aethel-testimonials.tsx`, `app/servicii/page.tsx`). The repo gives no evidence for any of these people.
- **Payback:** "2 years" (slider) and "2.8 years" (`app/ghid-bms/case-studies/page.tsx`). The case study itself states no payback, cost or investment.
- **Monitoring points:** "200+" (slider). The case study states no point count.

## Relation to the app's demo project

**Decision (owner, 2026-09-24).** Asked "should the demo keep the real hotel's name?", the owner answered "no". The app's demo gets a fictional name. Its working name is "Demo Hotel Bucharest", and the owner may rename it. The approved mockups in `design/reference/` still show "Radisson Blu Bucharest", and transcriptions of those screens keep the text as the screens show it. The rule 10 demo label still applies.

In the mockups and the specs, the demo project is called "Radisson Blu Bucharest". Its figures are invented, as `design/onboarding-spec.md` (line 11) and `design/dashboards-spec.md` (line 11) state. The table compares the published case-study facts with the demo values as the mockups and specs show them, mainly `design/dashboards-spec.md` sections 6.1 and 6.4 and `design/onboarding-spec.md` step 3. It was written before the decision on the name.

"Agree" means the two sources give the same value. It does not mean either value is true.

| Fact | Website case study | App demo (spec, screen) | Verdict |
|------|--------------------|-------------------------|---------|
| Name and city | Radisson Blu Hotel București, Bucharest | "Radisson Blu Bucharest", Bucharest, Romania (step 1) | Agree in the mockups. The app's demo will use a fictional name instead (decision, 2026-09-24). The city still agrees. |
| Building type | 5-star hotel | "Hotel" (step 5, project cards). No star rating. | Agree on type |
| Rooms | 424 | 424 (step 3 "From: Room Schedule.xlsx"; project cards; 16 "Guest Room Systems 424") | Agree. Other website pages say 428. |
| Operating hours | 24/7 | "24 / 7" (step 5) | Agree |
| BMS platform | "SAUTER modulo" | "BMS Platform SAUTER" (cards); ecos504, modu525, "modu520", "EY-modulo", "modulo 6" (01-09, spec 6.1); SAUTER Vision Center (07, 08, 13) | Agree on SAUTER. The case study names no model, so the demo's models cannot be compared. |
| Protocols | KNX, DALI, Modbus, M-Bus, BACnet | 03: BACnet, KNX, Modbus, DALI, M-Bus, Other. 08: BACnet, OPC UA, Modbus, HTTPS. 07: BACnet/IP only. | 03 agrees. 07 and 08 contradict it. |
| PMS | Fidelio, integrated | "PMS (Opera)" (06, 07); "PMS Integration: Planned" (08) | Contradict: different name, and planned against delivered |
| Spa, pool, fitness | spa, fitness centre, pool | Floor 02 "Spa & Fitness" (01, 13) | Broadly agree. No pool is named in the demo specs. |
| Restaurants | multiple restaurants, bars | Floor 01 "Lobby & Restaurant"; Restaurant, Kitchen on 10 | Broadly agree |
| Conference space | 12 conference halls, one of 540 m² for 500 people | Floor 05 "Conference & Event" (01, 13), with Conference Room A 420 m², occupancy 0 / 120 (01). Screen 04 lists the same floor as Conference Room A 420 m² (occupancy 18 / 40), Conference Room B 380 m², Meeting Rooms 310 m², Open Office and Executive Offices. Screens 07 and 14 call it guest rooms. | Differ: no 540 m² hall in the demo. The demo does not give a hall count. |
| Total area | Not stated (references page: "over 1,800 m² of event space") | 34,500 m² (step 3, cards); 18,500 m² (step 8) | Cannot compare |
| Floors | Not stated | "28 + GF + 8", "2B + GF + 8", "2B + GF + 6" | Cannot compare |
| Year opened | 2007 | Not in the demo | Cannot compare |
| Project type | Existing hotel (opened 2007) retrofitted, with switchover "during periods of low occupancy" | Step 1 "New construction"; step 8 "Renovation"; 02 "New Build / Major Renovation" | Contradicts "New construction". Consistent with "Renovation". |
| Project stage | Delivered; results and a 2025 certification reported | "Design Phase" on 16 project cards; "Operational" on 12 | Contradicts "Design Phase" |
| Programme | 5 activity phases over weeks 1-10 | 5 system-based phases (Core Infrastructure, HVAC & Plant, Room & Public Area Systems, Integration & BMS Platform, Testing & Handover) over months 0-15, "NOW" at M6/M7 (11); AHU-01 "Commissioned 12 Mar 2024" (17) | Contradict |
| Energy result | "~30%" energy consumption reduction | "16.4% vs. baseline" (02; the spec shows it is savings over CAPEX); ↓18% OPEX, ↓22% energy cost, HVAC ↓28% (12); "~35% HVAC energy savings" (11) | Contradict, and on different bases. None is comparable as stated. |
| Payback | Not stated in the case study ("2 years" in the slider) | 6.1 years (02) | Contradicts the slider |
| Monitoring points | Not stated in the case study ("200+" in the slider) | 5,226 total points (06) | Contradicts the slider |
| Investment | Not stated (the hotel article mentions "EUR 1.6M investment in event spaces", which is not described as a BMS cost) | CAPEX €1,280,000 (02, 11, 13); €1,240,000 (21, 22); options €820,000 / €1,240,000 / €1,780,000 (19) | Cannot compare |
| Certification | BREEAM In-Use Excellent (2025), Energy 82.6%, Health & Wellbeing 75.4% | Not in the demo | Cannot compare |
| Renewable electricity | 100% renewable electricity | "Level 3 – Net Zero Ready" and "renewables integration" appear only as options (19) | Cannot compare |

**What this shows.**
- As the mockups show it, the demo shares the hotel's name, city, type, room count (424) and 24/7 operation with the published case study. The decision of 2026-09-24 removes the name. The other shared facts stay unless the owner decides otherwise (see the recommendation below).
- Its engineering, programme and financial values are invented, and several contradict what SOVITECH has published about the real project: project type, stage, PMS, programme length and energy result.
- A reader who knows the case study could read the demo's figures as statements about the real hotel. That is the risk rule 10's label "Demo data, not an assessment of the real building" is there to prevent.
- The demo's 424 must come from the synthetic fixture's room schedule, as the spec shows ("From: Room Schedule.xlsx"). It must not come from this case study or from model knowledge (rule 1; case G1-11).
- Nothing in this file should be used to fill or change demo or project values. The marketing figures above are not data (rule 1, section 2.1).

**Branch note (`redesign-2026`, unmerged, reference only; it will not be merged, owner decision 2026-09-24).** The branch changes no fact in the case study itself, so every verdict in the table stands. Three rows lean on other pages whose branch versions differ:
- **Rooms.** On the branch, the spotlight component (no longer rendered on any page) says 424 instead of 428, which agrees with the demo's 424. Of the rendered pages, only the lead-magnet cards (`app/ghid-bms/case-studies/page.tsx`) still say 428.
- **Payback.** The slider component (no longer rendered on any branch page) no longer states "2 ani", so the "Contradicts the slider" verdict has nothing to compare on the branch. The lead-magnet cards still state 2.8 years, which also differs from the demo's 6.1 years.
- **Monitoring points.** The slider component still says "200+", but no branch page renders it. On the branch site, therefore, no page states a point count for this hotel, and the "Contradicts the slider" verdict has nothing to compare there.

The branch also adds `public/referinte/radisson-blu-hotel.jpg`, the exterior photo its references page uses for this hotel (it shows "Radisson SAS" signage; the repo does not say where or when it was taken). If that photo ever reached the app, it would tie the demo back to the real hotel, against the naming decision below (see `../references.md`, section R8). Details of the branch are in the last section of this file.

**Decided: the demo does not keep the real hotel's name.** The owner answered "no" on 2026-09-24 (see the decision at the start of this section). The question was whether the demo should keep the name, given that its invented values contradict SOVITECH's own published case study for that hotel.

**Recommended, not decided: do not reuse the real hotel's published facts in the demo fixture.** A fictional name alone may not be enough. A hotel in Bucharest with 424 rooms, run 24/7, can still be recognised as this hotel, and then the invented values read as statements about it again. So the recommendation is that the demo fixture should not reuse facts published about the real hotel, for example 424 rooms or the 2007 opening (the demo does not use the opening year today). This is for the owner to decide. It would also change the demo values in the specs, which follow the mockups. The Speed Rule example in `docs/guardrails.md` already uses 212 rooms (v1.4). Its other 424 examples are generic, not the demo.

---

## Branch `redesign-2026` (unmerged): changes to this case study

**Status.** This section records the unmerged branch `origin/redesign-2026` of the same repository, at commit `af81353` (2026-08-27). The changes come from commit `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala"). The branch is not merged into `main`. Owner decision, 2026-09-24: it is not SOVITECH's current position and will not be merged. This section is kept for reference only. Everything above this section describes `main`, the current website, except the branch note inside "Relation to the app's demo project".

Source: `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` on the branch (18 lines changed). The route is unchanged.

### What changed on the page

No fact changes. The branch changes only links and punctuation:

| Element | `main` | Branch |
|---------|--------|--------|
| Breadcrumb "Studii de caz" and back link | → `/resurse/referinte` | → `/referinte` |
| Category pill; sidebar industry | "HORECA — Hotel 5 stele"; "HORECA - Hotel 5 stele" | "HORECA / Hotel 5 stele" (both) |
| Standfirst RO | "... spa, piscină — toate unificate într-o singură platformă ..." | "... spa, piscină: toate unificate într-o singură platformă ..." |
| Standfirst EN | "... spa, pool — all unified in a single ..." | "... spa, pool: all unified in a single ..." |
| Hero image alt RO | "Radisson Blu București — lobby de hotel modern" | "Radisson Blu București, lobby de hotel modern" |
| Related card label | "HORECA - Spa & Wellness" | "HORECA / Spa & Wellness" |

Everything else on the page is unchanged: the BREEAM headline, 424 rooms, the 82.6% and 75.4% scores, "~30%", the 10-week programme, the Fidelio PMS, the unnamed "General Manager" testimonial, the hero image `/luxury-hotel-lobby-modern-interior.jpg`, and the related Therme card ("Reducere de 35% a costurilor energetice ...").

### Where the page sits on the branch site

- **Harder to reach.** The references page no longer has a "Vezi studiul de caz" button (see `references.md`, section R1). The resources hub (`app/resurse/page.tsx`) no longer lists the case study, so its listing date "5 DEC 2025" and listing title are gone. `components/latest-articles.tsx` and `components/blog-slider.tsx` no longer carry it. `app/ghid-bms/resurse/page.tsx` drops its Radisson card (the one that said 428 rooms).
- **Not in the sitemap.** `app/sitemap.ts` says: "Legacy case studies and pre-launch articles are unlisted until they have real written content and covers."
- **Still linked from:** the Therme case study's related card and `app/resurse/articole/optimizare-hotel-bms/page.tsx`. The slider and spotlight components (`components/case-study-slider.tsx`, `components/aethel-testimonials.tsx`) still contain links here, but no branch page renders them (see [`company-profile.md`](../company-profile.md#9-testimonials), section 9).

### How other pages describe this project on the branch

| Source file | What it says on the branch |
|-------------|----------------------------|
| `components/case-study-slider.tsx` (not rendered on the branch) | No person (main: "Maria Ionescu", Facility Manager). Client line "Studiu de caz" / "Proiect livrat". Quote RO: "Automatizare BMS pentru un hotel de 5 stele: control temperatură și ventilație pentru camere și peste 1.800 m² de spații de evenimente." EN: "BMS automation for a 5-star hotel: temperature and ventilation control for rooms and over 1,800 m² of event space." Stats: 424 "Camere" / "Rooms"; 200+ "Puncte monitorizare" / "Monitoring points"; 1.800 m² "Spații evenimente" / "Event space". The "40% operational efficiency" and "2 ani" ROI stats are gone. |
| `components/aethel-testimonials.tsx` (not rendered on the branch) | No person (main: "Maria Popescu"). RO: "Automatizare BMS pentru un hotel de 5 stele cu peste 1.800 m² spații de evenimente: control temperatură, ventilație și supraveghere centralizată." EN: "BMS automation for a 5-star hotel with over 1,800 m² of event space: temperature control, ventilation and centralised supervision." Details: "Amploare: 424 camere" / "Scale: 424 rooms" (main: 428); "Scop: BMS, temperatură, ventilație". Links here. |
| `lib/sector-data.ts`, HORECA | The "Radu Georgescu" testimonial with "Opera PMS" and "32% less energy" is gone. The project card reads "BMS automation delivered for a five-star hotel in Bucharest with over 1,800 sqm of event space: temperature control and ventilation integrated into the central system." It is not rendered on the sector page. The HORECA metrics count "Radisson" among four HORECA references, and the sector uses the photo `radisson-blu-hotel.jpg`. See `sectors.md`, section B4. |
| `app/referinte/page.tsx` | "Radisson Blu Hotel": unchanged text (over 1,800 m² of event space), new photo `radisson-blu-hotel.jpg`, no case-study button. The photo shows "Radisson SAS" signage (`references.md`, section R3). |
| `app/servicii/page.tsx` | The Maria Popescu quote is gone with the rest of the testimonials. |
| `app/ghid-bms/case-studies/page.tsx` | Unchanged figures: 428 rooms, savings 32%, payback 2.8 years, CO₂ 280 t/yr. The card now links to `/referinte` instead of this case study. See [lead-funnels.md](../lead-funnels.md), section 3.7. |
| `app/resurse/studii-de-caz/therme-bucuresti/page.tsx` (related card) | Unchanged: "Creștere de 40% a eficienței operaționale prin control BMS integrat." |
| `app/resurse/articole/optimizare-hotel-bms/page.tsx` | Still 424 rooms, "indoor and outdoor pools", Green Key, a ballroom for 500+ guests. The em dashes around these facts are replaced by commas and brackets. The article belongs to the articles import (`../articles/optimizare-hotel-bms.md`). |

### Inconsistencies on the branch

- **Room count:** 424 on the case study and hotel article (also in the unrendered slider and spotlight components). 428 only on the lead-magnet cards (`app/ghid-bms/case-studies/page.tsx`).
- **Energy result:** "~30%" (case study) against 32% (lead-magnet cards). The Therme page's related card still says "40% operational efficiency".
- **PMS:** only Fidelio is named on the branch. The Opera mention was on the sector page and is gone.
- **Who is quoted:** only the case study's unnamed "General Manager" remains. Every other named person is gone.
- **Payback:** 2.8 years on the lead-magnet cards only. The case study states none.
- **Monitoring points:** "200+" only in the unrendered slider component. The case study states none.
