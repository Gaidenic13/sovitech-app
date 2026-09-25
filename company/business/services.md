# SOVITECH services

Every service and sub-service the SOVITECH website describes, with its process steps, deliverables, durations and figures, in Romanian and English. It records website copy faithfully. It is not a verified description of how SOVITECH works.

**Source:** repository `Gaidenic13/sovitech-website`, commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11). Paths are relative to that repository's root. Imported on 2026-09-23.

**Sections 1-9 describe `main`.** Section 10 records the unmerged branch `redesign-2026` (commit `af81353`, 2026-08-27). Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. It is kept separate from the main content, for reference only.

**Status of the content.** Durations, percentages, response times and uptime figures are marketing claims. They are not engineering data or approved reference data, and the app may not use them as values (guardrails rule 1, section 2.1, section 10). Section 9 lists what this means for the app.

**How the site is built.** Each service is described twice, and the two versions differ:
- as a tab on `/servicii` (`app/servicii/page.tsx`), with 4 steps and 6 deliverables;
- on its own page `/servicii/<slug>` (`app/servicii/<slug>/page.tsx`), with different steps, durations, deliverables and figures.

Both versions are recorded below. Romanian text is copied as written. Some files omit diacritics (for example "Executie", "Mentenanta"); that is how the site writes them.

---

## 1. Service lines and their names

Source: `components/services-showcase.tsx`, `components/header.tsx`, `components/footer.tsx`, `app/servicii/page.tsx`, `app/servicii/*/page.tsx`, `app/page.tsx`

The same four services carry different names in different places.

| Service | Home showcase and header | Footer | `/servicii` tab label | `/servicii` tab heading | Own page title |
|---------|--------------------------|--------|-----------------------|-------------------------|----------------|
| Design | Proiectare BMS / BMS Design | Proiectare BMS / BMS Design | Proiectare / Design | Proiectare BMS / BMS Design | Proiectare BMS / BMS Design |
| Installation | Execuție Sisteme / System Installation | Execuție sisteme / System Installation | Executie / Installation | Executie si instalare / Execution & installation | Execuție & Implementare / Execution & Implementation |
| Integration | Integrare Sisteme / Systems Integration | Integrare sisteme / Systems Integration | Integrare / Integration | Integrare sisteme / Systems integration | Integrare Sisteme / System Integration |
| Maintenance | Mentenanță / Maintenance (showcase); not in header | Mentenanță BMS / BMS Maintenance | Mentenanta / Maintenance | Mentenanta si suport / Maintenance & support | Mentenanță & Modernizare / Maintenance & Modernisation |
| Consultancy | Not shown | Consultanță / Consultancy | No tab | None | No page |

Notes:
- **Consultanță** appears as a service line only in a footer link to `/servicii#consultanta`. There is no consultancy tab, section or page. Elsewhere the site offers consultation in three ways:
  - as a free first step: "Consultatie initiala" (`app/servicii/page.tsx`, packages) and "consultație gratuită" (`app/servicii/proiectare/page.tsx`, `app/servicii/integrare/page.tsx`, `app/servicii/executie/page.tsx`);
  - as a contact-form subject: "Consultanta BMS" / "BMS Consultation" (`app/contact/page.tsx`);
  - in the Therme case study, as a delivered solution item: "Consultanță strategică" / "Strategic consultancy", "Audit complet al infrastructurii și recomandări personalizate pentru arhitectura BMS optimă." / "Comprehensive infrastructure audit and tailored recommendations for the optimal BMS architecture." (`app/resurse/studii-de-caz/therme-bucuresti/page.tsx`).
  - On `main` it is never described as a stand-alone service.
  - **Branch note.** The unmerged branch `redesign-2026` (commit `d2d15d2`, 2026-08-24) adds a stand-alone consultancy page, `app/servicii/consultanta/page.tsx`. The branch will not be merged (owner decision, 2026-09-24), so the page is reference only. Section 10.4 records it.
- The header's first entry is "Servicii BMS Complete" / "Complete BMS Services": "Parcursul complet, de la consultanță la mentenanță" / "The full journey from consultation to maintenance".
- The footer and header link to `/servicii#proiectare`, `#executie`, `#integrare`, `#mentenanta` and `#consultanta`. No element on `/servicii` has those ids, so the links open the page on its default tab (Design).
- The `/servicii` page shows a journey indicator in this order: 1 Proiectare → 2 Executie → 3 Integrare → 4 Mentenanta.

**One-line pitches** (`components/services-showcase.tsx`, section "Ce facem" / "What we do", heading "Servicii BMS complete" / "End-to-end BMS services"):

| Service | RO | EN |
|---------|----|----|
| Proiectare BMS | "Proiectăm sisteme complete de automatizare — de la concept la documentația tehnică de execuție." | "We design complete automation systems — from concept to detailed execution drawings." |
| Execuție Sisteme | "Instalăm și punem în funcțiune sisteme BMS cu echipamente SAUTER, la standarde profesionale." | "We install and commission BMS systems with SAUTER equipment, to professional standards." |
| Integrare Sisteme | "Integrăm orice protocol — KNX, DALI, Modbus, M-Bus și BACnet — într-o singură platformă." | "We integrate any protocol — KNX, DALI, Modbus, M-Bus and BACnet — into a single platform." |
| Mentenanță | "Menținem clădirea la performanță maximă prin mentenanță predictivă și suport dedicat 24/7." | "We keep your building at peak performance with predictive maintenance and dedicated 24/7 support." |

**Header descriptions** (`components/header.tsx`):
- Proiectare BMS: "Proiectarea completă a sistemelor de automatizare" / "Full design of automation systems"
- Execuție Sisteme: "Implementare profesională a sistemelor BMS" / "Professional BMS system implementation"
- Integrare Sisteme: "Integrare KNX, DALI, Modbus, M-Bus" / "KNX, DALI, Modbus, M-Bus integration"

**Company-level service list** (`app/page.tsx`, about section): "proiectare BMS, instalare și implementare, programare cu software licențiat, integrare de sisteme, testare și punere în funcțiune, precum și service și mentenanță." / "BMS design, installation and implementation, programming with licensed software, systems integration, testing and commissioning, as well as service and maintenance."

**Service page hero** (`app/servicii/page.tsx`): "Servicii complete. Rezultate garantate." / "Complete services. Guaranteed results." Tab CTA: "Solicita o consultatie" / "Request a consultation". Deliverables heading: "Ce livrezi clientului" / "What we deliver".

---

## 2. Proiectare BMS / BMS Design

### 2.1 On the `/servicii` tab

Source: `app/servicii/page.tsx` (`serviceContent.proiectare`)

**Intro.**
- RO: "Fiecare sistem de automatizare incepe cu un proiect solid. Echipa noastra de ingineri analizeaza cladirea ta, defineste obiectivele si livreaza documentatia tehnica completa necesara executiei."
- EN: "Every automation system starts with a solid design. Our team of engineers analyses your building, defines objectives and delivers the complete technical documentation required for execution."

**Steps.**

**01 Audit si analiza / Audit & analysis**
- RO: "Vizitam cladirea si facem o evaluare completa: echipamente existente, consum energetic, puncte de masura, infrastructura de cablare si obiective de automatizare. Rezultatul este un raport de audit cu recomandari clare."
- EN: "We visit the building and carry out a full evaluation: existing equipment, energy consumption, measurement points, cabling infrastructure and automation objectives. The result is an audit report with clear recommendations."

**02 Caiet de sarcini / Technical specification**
- RO: "Definim impreuna cu clientul cerintele functionale ale sistemului BMS: ce se controleaza, ce se monitorizeaza, ce alarme sunt necesare si ce rapoarte se genereaza automat."
- EN: "Together with the client we define the functional requirements of the BMS system: what is controlled, what is monitored, what alarms are needed and what reports are generated automatically."

**03 Proiect tehnic / Technical design**
- RO: "Livram schema arhitecturala a sistemului, planurile de cablaj, listele de echipamente SAUTER, logica de automatizare si documentatia de conformitate cu normele in vigoare (SR EN ISO 16484)."
- EN: "We deliver the system architecture diagram, cabling plans, SAUTER equipment lists, automation logic and compliance documentation in line with current standards (SR EN ISO 16484)."

**04 Interfata de supervizare / Supervision interface**
- RO: "Proiectam interfata grafica SCADA / HMI adaptata la cladire — planuri de etaj, sinoptice, grafice de tendinte si rapoarte. Clientul aproba designul inainte de implementare."
- EN: "We design the SCADA / HMI graphical interface tailored to the building — floor plans, synoptics, trend charts and reports. The client approves the design before implementation."

**Deliverables.**

| RO | EN |
|----|----|
| Raport de audit tehnic | Technical audit report |
| Caiet de sarcini functional | Functional specification |
| Proiect tehnic complet (PAC + DDE) | Full technical design (PAC + DDE) |
| Liste echipamente si bill of materials | Equipment lists and bill of materials |
| Scheme electrice si de cablaj | Electrical and cabling diagrams |
| Mockup interfata de supervizare | Supervision interface mockup |

The site does not expand PAC and DDE. In Romanian practice they usually mean "Proiect pentru autorizarea executării lucrărilor de construire" (the building-permit design) and "Detalii de execuție" (execution details). That gloss is ours, not the site's.

### 2.2 On its own page

Source: `app/servicii/proiectare/page.tsx`

**Intro.**
- RO: "Proiectare completă de sisteme Building Management System pentru automatizarea funcțiilor critice ale clădirii: HVAC, securitate, control acces, iluminat și detecție incendiu."
- EN: "Complete Building Management System design for automating the building's critical functions: HVAC, security, access control, lighting and fire detection."

**Average project duration** ("Durata medie proiect"): **2-6 săptămâni** / 2-6 weeks.

**Deliverables included** ("Livrabile incluse"):

| RO | EN |
|----|----|
| Documentație tehnică completă | Complete technical documentation |
| Scheme electrice și de automatizare | Electrical and automation diagrams |
| Listă echipamente cu specificații | Equipment list with specifications |
| Estimare buget și timeline | Budget estimate and timeline |

**Process** ("Procesul de Proiectare" / "The Design Process"):

| # | RO title | EN title | Duration (RO / EN) |
|---|----------|----------|--------------------|
| 1 | Analiză și Evaluare Inițială | Initial Analysis and Assessment | 3-5 zile lucrătoare / 3-5 working days |
| 2 | Conceptualizare și Design | Concept and Design | 1-2 săptămâni / 1-2 weeks |
| 3 | Documentație Tehnică | Technical Documentation | 1-2 săptămâni / 1-2 weeks |
| 4 | Validare și Aprobare | Validation and Approval | 3-5 zile lucrătoare / 3-5 working days |

1. RO: "Echipa noastră efectuează o evaluare completă a clădirii, analizând infrastructura existentă, consumul energetic actual și obiectivele de eficiență. Identificăm oportunitățile de optimizare și definim scope-ul proiectului împreună cu clientul." EN: "Our team carries out a complete assessment of the building, analysing the existing infrastructure, current energy consumption and efficiency objectives. We identify optimisation opportunities and define the project scope together with the client."
2. RO: "Dezvoltăm conceptul tehnic al sistemului BMS, selectăm echipamentele optime din gama SAUTER și creăm arhitectura sistemului. Definim punctele de măsurare, controlerele necesare și protocoalele de comunicație (BACnet, KNX, Modbus)." EN: "We develop the technical concept of the BMS system, select the optimal equipment from the SAUTER range and create the system architecture. We define the measurement points, the necessary controllers and the communication protocols (BACnet, KNX, Modbus)."
3. RO: "Elaborăm documentația completă de proiectare: scheme electrice, diagrame de automatizare, liste de echipamente cu specificații tehnice, planuri de amplasare și instrucțiuni de montaj. Toate documentele respectă standardele în vigoare." EN: "We produce the complete design documentation: electrical diagrams, automation diagrams, equipment lists with technical specifications, layout plans and installation instructions. All documents comply with the standards in force."
4. RO: "Prezentăm proiectul clientului pentru validare, efectuăm ajustările necesare și obținem aprobările finale. Pregătim caietul de sarcini pentru faza de execuție și oferim suport în procesul de achiziție echipamente." EN: "We present the design to the client for validation, make the necessary adjustments and obtain final approvals. We prepare the technical specification for the execution phase and provide support during the equipment procurement process."

The step durations do not fit the stated average. Two steps of at least one week each plus two steps of at least three working days already exceed the 2-week lower bound.

**What BMS design includes** ("Ce include proiectarea BMS"):

| RO | EN |
|----|----|
| Automatizare HVAC - Control inteligent pentru încălzire, ventilație și aer condiționat cu optimizare energetică | HVAC Automation - Intelligent control for heating, ventilation and air conditioning with energy optimisation |
| Sistem de iluminat - Control automat bazat pe prezență și lumină naturală pentru economii maxime | Lighting system - Automatic control based on occupancy and daylight for maximum savings |
| Control acces și securitate - Integrare cu sistemele de securitate existente sau noi | Access control and security - Integration with existing or new security systems |
| Detecție incendiu - Monitorizare și alertare automată pentru siguranță maximă | Fire detection - Automatic monitoring and alerting for maximum safety |
| Contorizare utilități - Monitorizare consum energie, apă, gaz cu raportare detaliată | Utility metering - Monitoring of energy, water and gas consumption with detailed reporting |

**Figures** ("Impact și Beneficii" / "Impact and Benefits"):

| Value | RO label | EN label |
|-------|----------|----------|
| 35% | Reducere costuri energetice | Energy cost reduction |
| 50% | Mai puține intervenții manuale | Fewer manual interventions |
| 2-3 ani / 2-3 yrs | ROI mediu investiție | Average investment ROI |
| 24/7 | Monitorizare automată | Automatic monitoring |

**CTAs:** "Solicită consultație gratuită" / "Request a free consultation"; "Pregătit să începi proiectul BMS?" / "Ready to start your BMS project?"; "Solicită ofertă gratuită" / "Request a free quote"; "Vezi proiecte similare" / "View similar projects".

---

## 3. Execuție / Installation and implementation

### 3.1 On the `/servicii` tab

Source: `app/servicii/page.tsx` (`serviceContent.executie`)

**Intro.**
- RO: "Transformam proiectul in realitate. Echipele noastre certificate instaleaza, cablajeaza si configureaza fiecare componenta a sistemului BMS cu precizie, respectand termenele si standardele de calitate SAUTER."
- EN: "We turn the design into reality. Our certified teams install, wire and configure every component of the BMS system with precision, meeting deadlines and SAUTER quality standards."

**Steps.**

**01 Planificare si pregatire santier / Site planning & preparation**
- RO: "Coordonam cu antreprenorul general si celelalte specialitati (electricitate, HVAC, constructii) planul de executie. Pregatim depozitarea echipamentelor, traseele de cabluri si accesul la spatii tehnice."
- EN: "We coordinate with the general contractor and other trades (electrical, HVAC, construction) on the execution plan. We prepare equipment storage, cable routes and access to technical spaces."

**02 Montaj si cablaj / Mounting & cabling**
- RO: "Montam tablourile de automatizare, controllere SAUTER (Modulo5/6, ECOS), senzori de temperatura, umiditate, CO2, debitmetre, valve si actuatori. Realizem cablajul structurat conform proiectului."
- EN: "We mount automation panels, SAUTER controllers (Modulo5/6, ECOS), temperature, humidity and CO2 sensors, flow meters, valves and actuators. We carry out structured cabling according to the design."

**03 Configurare si programare / Configuration & programming**
- RO: "Programam logica de automatizare in controllere (seturi de puncte, algoritmi PID, programe orare, gestionarea alarmelor). Configurem serverul BMS si legatura cu echipamentele de teren prin protocoalele BACnet, Modbus, KNX."
- EN: "We program the automation logic in controllers (setpoints, PID algorithms, scheduling, alarm management). We configure the BMS server and communication with field devices via BACnet, Modbus and KNX protocols."

**04 Punere in functiune si testare / Commissioning & testing**
- RO: "Efectuam testarea functionala a fiecarui punct de masura si control (FAT + SAT). Verificam alarmele, graficele de tendinte si rapoartele. Livram procesul-verbal de receptie si documentatia as-built."
- EN: "We carry out functional testing of every measurement and control point (FAT + SAT). We verify alarms, trend charts and reports. We deliver the acceptance certificate and as-built documentation."

The site does not expand FAT and SAT. They usually mean Factory Acceptance Test and Site Acceptance Test (our gloss). "Procesul-verbal de receptie" is the Romanian formal acceptance record.

**Deliverables.**

| RO | EN |
|----|----|
| Tablouri de automatizare montate si etichetate | Mounted and labelled automation panels |
| Controllere SAUTER programate si testate | Programmed and tested SAUTER controllers |
| Senzori si actuatori instalati si verificati | Installed and verified sensors and actuators |
| Server BMS configurat si operational | Configured and operational BMS server |
| Raport FAT / SAT semnat | Signed FAT / SAT report |
| Documentatie as-built completa | Complete as-built documentation |

### 3.2 On its own page

Source: `app/servicii/executie/page.tsx`

**Intro.**
- RO: "Implementare profesională cu echipamente SAUTER de la liderul global în managementul energiei. Testare completă, punere în funcțiune și instruire pentru echipa ta."
- EN: "Professional implementation with SAUTER equipment from the global leader in energy management. Full testing, commissioning and training for your team."

**Average duration** ("Durata medie"): **4–12 săptămâni** / 4–12 weeks.

**Equipment used** ("Echipamente utilizate"): Controllere SAUTER / SAUTER controllers; Senzori de temperatură și umiditate / Temperature and humidity sensors; Actuatoare și vane / Actuators and valves; Tablouri de automatizare / Control panels.

**Process** ("Procesul de Implementare" / "Implementation Process"):

| # | RO title | EN title | Duration (RO / EN) |
|---|----------|----------|--------------------|
| 1 | Pregătire și Planificare | Preparation and Planning | 1–2 săptămâni / 1–2 weeks |
| 2 | Instalare Echipamente | Equipment Installation | 2–6 săptămâni (în funcție de complexitate) / 2–6 weeks (depending on complexity) |
| 3 | Configurare și Programare | Configuration and Programming | 1–2 săptămâni / 1–2 weeks |
| 4 | Testare și Punere în Funcțiune | Testing and Commissioning | 1–2 săptămâni / 1–2 weeks |
| 5 | Instruire și Predare | Training and Handover | 2–3 zile / 2–3 days |

1. RO: "Verificăm documentația de proiectare, comandăm echipamentele necesare și stabilim graficul de execuție. Ne coordonăm cu celelalte echipe implicate în proiect pentru o implementare fără sincope." EN: "We verify the design documentation, order the necessary equipment and set the execution schedule. We coordinate with the other teams involved in the project to ensure smooth implementation."
2. RO: "Echipa noastră de tehnicieni certificați instalează controllere, senzori, actuatoare și tablouri de automatizare conform specificațiilor tehnice. Realizăm toate conexiunile electrice și de comunicație." EN: "Our team of certified technicians installs controllers, sensors, actuators and control panels in accordance with technical specifications. We complete all electrical and communication connections."
3. RO: "Programăm controllerele cu algoritmi optimizați pentru eficiență energetică, configurăm interfața de utilizare și setăm parametrii de funcționare. Implementăm scenarii automatizate și alarme de siguranță." EN: "We programme the controllers with algorithms optimised for energy efficiency, configure the user interface and set operating parameters. We implement automated scenarios and safety alarms."
4. RO: "Efectuăm teste complete asupra tuturor sistemelor implementate, verificăm funcționarea corectă a buclelor de control și optimizăm parametrii. Documentăm rezultatele testelor și generăm rapoartele de recepție." EN: "We carry out comprehensive tests on all implemented systems, verify the correct operation of control loops and optimise parameters. We document test results and generate acceptance reports."
5. RO: "Organizăm sesiuni de instruire pentru personalul tehnic al clientului, prezentăm funcțiile sistemului și procedurile de operare. Predăm documentația completă și oferim suport pe perioada de garanție." EN: "We organise training sessions for the client's technical staff, present the system's functions and operating procedures. We hand over the complete documentation and provide support during the warranty period."

**Figures** ("Impact și Beneficii"):

| Value | RO label | EN label |
|-------|----------|----------|
| 99% | Rată de succes la recepție | Acceptance success rate |
| 150+ | Proiecte implementate | Projects implemented |
| 2 ani / 2 yrs | Garanție echipamente | Equipment warranty |
| 4h | Timp de răspuns la urgențe | Emergency response time |

**SAUTER partnership block:** recorded in `company-profile.md`, section 4.

**CTAs:** "Solicită o consultație gratuită"; "Ai un proiect de implementare BMS?" / "Do you have a BMS implementation project?"; "Solicită o ofertă gratuită" / "Request a free quote"; "Vezi echipamentele SAUTER" / "View SAUTER equipment".

---

## 4. Integrare sisteme / Systems integration

### 4.1 On the `/servicii` tab

Source: `app/servicii/page.tsx` (`serviceContent.integrare`)

**Intro.**
- RO: "Un BMS puternic nu traieste in izolare. Il conectam cu toate sistemele cladirii — HVAC, iluminat, control acces, detectie incendiu, energie — printr-o platforma unificata care ofera vizibilitate completa si control centralizat."
- EN: "A powerful BMS does not live in isolation. We connect it with all building systems — HVAC, lighting, access control, fire detection, energy — through a unified platform that delivers full visibility and centralised control."

**Steps.**

**01 Audit protocoale existente / Existing protocols audit**
- RO: "Identificam toate echipamentele si sistemele prezente in cladire: centrala termica, chillerele, AHU-urile, tablourile electrice, sistemele de iluminat DALI, controlerele KNX, contoarele M-Bus si dispozitivele IoT. Mapam protocoalele de comunicatie disponibile."
- EN: "We identify all equipment and systems present in the building: boiler plant, chillers, AHUs, electrical panels, DALI lighting systems, KNX controllers, M-Bus meters and IoT devices. We map available communication protocols."

**02 Integrare multi-protocol / Multi-protocol integration**
- RO: "Conectam sistemele eterogene prin gateway-uri si convertoare de protocol. Suportam BACnet IP/MSTP, Modbus RTU/TCP, KNX TP, DALI-2, M-Bus, LON, OPC-UA si API REST pentru sisteme moderne. Fiecare integrare este validata punct cu punct."
- EN: "We connect heterogeneous systems via gateways and protocol converters. We support BACnet IP/MSTP, Modbus RTU/TCP, KNX TP, DALI-2, M-Bus, LON, OPC-UA and REST API for modern systems. Every integration is validated point by point."

**03 Platforma de management unificata / Unified management platform**
- RO: "Toate datele din sistemele integrate sunt vizibile intr-o singura interfata SAUTER — harta termica a cladirii, consumuri pe circuit, stari echipamente si alarme centralizate. Operatorul vede totul dintr-un singur loc."
- EN: "All data from integrated systems is visible in a single SAUTER interface — building heat map, circuit-level consumption, equipment states and centralised alarms. The operator sees everything from one place."

**04 Raportare si analytics / Reporting & analytics**
- RO: "Generam rapoarte automate de consum energetic (kWh, kcal, m3) pe categorii (incalzire, racire, iluminat, prize), comparatii periodice si exporturi pentru certificari verzi (BREEAM, LEED, EPBD)."
- EN: "We generate automatic energy consumption reports (kWh, kcal, m³) by category (heating, cooling, lighting, sockets), periodic comparisons and exports for green certifications (BREEAM, LEED, EPBD)."

Note: EPBD is an EU directive, not a green certification scheme. The site lists it with BREEAM and LEED.

**Deliverables.**

| RO | EN |
|----|----|
| Harta completa a punctelor de integrare | Complete integration points map |
| Gateway-uri si convertoare configurate | Configured gateways and converters |
| Platforma unificata operationala | Unified platform operational |
| Dashboard energie pe categorii | Energy dashboard by category |
| Rapoarte automate configurate | Configured automatic reports |
| Export date pentru certificari ESG | Data export for ESG certifications |

### 4.2 On its own page

Source: `app/servicii/integrare/page.tsx`

**Intro.**
- RO: "Servicii specializate de programare cu software licențiat, integrare de protocoale multiple (KNX, DALI, Modbus, M-Bus, BACnet) și conectarea sistemelor complexe într-o platformă unificată."
- EN: "Specialised programming services with licensed software, integration of multiple protocols (KNX, DALI, Modbus, M-Bus, BACnet) and connection of complex systems into a unified platform."

**Average project duration:** **2–8 săptămâni** / 2–8 weeks.

**Supported protocols** ("Protocoale suportate"): BACnet IP/MS-TP; KNX/EIB; Modbus RTU/TCP; M-Bus; DALI (iluminat) / DALI (lighting); OPC UA.

**Process** ("Procesul de Integrare" / "Integration Process"):

| # | RO title | EN title | Duration (RO / EN) |
|---|----------|----------|--------------------|
| 1 | Audit Sisteme Existente | Existing Systems Audit | 2–4 zile / 2–4 days |
| 2 | Arhitectură de Integrare | Integration Architecture | 1 săptămână / 1 week |
| 3 | Programare și Configurare | Programming and Configuration | 2–4 săptămâni / 2–4 weeks |
| 4 | Testare End-to-End | End-to-End Testing | 1–2 săptămâni / 1–2 weeks |

1. RO: "Analizăm toate sistemele tehnice existente în clădire: HVAC, iluminat, control acces, contorizare, detecție incendiu. Identificăm protocoalele de comunicație și punctele de integrare disponibile." EN: "We analyse all existing technical systems in the building: HVAC, lighting, access control, metering, fire detection. We identify communication protocols and available integration points."
2. RO: "Proiectăm arhitectura de integrare, selectăm gateway-urile necesare și definim structura de date. Stabilim ierarhia sistemului și logica de comunicare între diversele subsisteme." EN: "We design the integration architecture, select the necessary gateways and define the data structure. We establish the system hierarchy and the communication logic between the various sub-systems."
3. RO: "Programăm controllerele BMS folosind software-ul SAUTER CASE Suite, configurăm comunicația între sisteme și implementăm logica de automatizare. Dezvoltăm interfețe grafice personalizate pentru operare." EN: "We programme BMS controllers using SAUTER CASE Suite software, configure inter-system communication and implement automation logic. We develop custom graphical interfaces for operation."
4. RO: "Verificăm comunicația între toate sistemele integrate, testăm scenariile de automatizare și optimizăm parametrii. Validăm funcționarea corectă în condiții reale de operare." EN: "We verify communication between all integrated systems, test automation scenarios and optimise parameters. We validate correct operation under real operating conditions."

**Protocol cards** ("Protocoale și Tehnologii" / "Protocols and Technologies"):

| Protocol | RO | EN |
|----------|----|----|
| BACnet | Protocol standard pentru comunicația între echipamentele BMS. Suportăm BACnet IP și MS/TP. | Standard protocol for communication between BMS equipment. We support BACnet IP and MS/TP. |
| KNX/EIB | Standard european pentru automatizarea clădirilor, ideal pentru controlul iluminatului și al jaluzelelor. | European standard for building automation, ideal for lighting and blind control. |
| Modbus | Protocol industrial pentru comunicația cu echipamentele de teren, contoare și PLC-uri. | Industrial protocol for communication with field equipment, meters and PLCs. |
| M-Bus | Protocol pentru citirea contoarelor de utilități: electricitate, apă, gaz, energie termică. | Protocol for reading utility meters: electricity, water, gas, heat. |

**Figures** ("Impact și Beneficii"):

| Value | RO label | EN label |
|-------|----------|----------|
| 100% | Vizibilitate centralizată | Centralised visibility |
| 40% | Reducerea timpului de intervenție | Reduction in intervention time |
| 1 | Interfață unică de control | Single control interface |
| ∞ | Scenarii de automatizare | Automation scenarios |

**CTAs:** "Ai sisteme separate care nu comunică între ele?" / "Do you have separate systems that don't communicate?"; "Integrăm toate sistemele tale într-o singură platformă. Contactează-ne pentru o analiză gratuită a infrastructurii existente."; "Solicită un audit gratuit" / "Request a free audit"; "Vezi proiecte de integrare" / "View integration projects".

### 4.3 Protocol lists compared

The protocol lists differ from page to page.

| Protocol | Showcase | Header | `/servicii` tab | Own page list | Partners marquee |
|----------|----------|--------|-----------------|---------------|------------------|
| BACnet | Yes | No | BACnet IP/MSTP | BACnet IP/MS-TP | Yes |
| KNX | Yes | Yes | KNX TP | KNX/EIB | Yes |
| DALI | Yes | Yes | DALI-2 | DALI (iluminat) | Yes |
| Modbus | Yes | Yes | Modbus RTU/TCP | Modbus RTU/TCP | Yes |
| M-Bus | Yes | Yes | M-Bus | M-Bus | Yes |
| LON | No | No | LON | No | LonMark |
| OPC UA | No | No | OPC-UA | OPC UA | No |
| REST API | No | No | API REST | No | No |

---

## 5. Mentenanță / Maintenance

### 5.1 On the `/servicii` tab

Source: `app/servicii/page.tsx` (`serviceContent.mentenanta`)

**Intro.**
- RO: "Un sistem BMS performant necesita ingrijire continua. Oferim contracte de mentenanta preventiva si corectiva, monitorizare remote 24/7 si interventii rapide, astfel incat cladirea ta functioneaza optim in permanenta."
- EN: "A high-performance BMS system requires continuous care. We offer preventive and corrective maintenance contracts, 24/7 remote monitoring and rapid interventions, keeping your building running at peak performance at all times."

**Steps.**

**01 Monitorizare remote 24/7 / 24/7 remote monitoring**
- RO: "Centrul nostru de operatiuni monitorizeaza in timp real toate alarmelee si parametrii critici ai sistemului BMS. Anomaliile sunt detectate automat si echipa de suport este alertata inainte ca operatorul cladirii sa observe problema." ("alarmelee" is a typo on the site.)
- EN: "Our operations centre monitors all alarms and critical BMS system parameters in real time. Anomalies are detected automatically and the support team is alerted before the building operator notices the problem."

**02 Mentenanta preventiva planificata / Planned preventive maintenance**
- RO: "Executam vizite periodice (trimestrial sau semestrial) pentru inspectia echipamentelor, verificarea calibrarilor, curatarea senzorilor, actualizarea firmware-ului controllerelor si testarea alarmelor. Livram raport dupa fiecare vizita."
- EN: "We carry out periodic visits (quarterly or bi-annual) for equipment inspection, calibration checks, sensor cleaning, controller firmware updates and alarm testing. A report is delivered after each visit."

**03 Mentenanta corectiva si urgente / Corrective maintenance & emergencies**
- RO: "In caz de defectiune, echipele noastre intervin in maxim 4 ore in Bucuresti si 8 ore la nivel national. Avem stoc de piese SAUTER si un sistem de ticketing pentru urmarirea fiecarei solicitari pana la rezolvare."
- EN: "In the event of a fault, our teams respond within 4 hours in Bucharest and 8 hours nationwide. We hold SAUTER spare parts stock and a ticketing system to track every request through to resolution."

**04 Suport tehnic si training continuu / Technical support & ongoing training**
- RO: "Asiguram suport telefonic si remote pentru operatorii de cladire, sesiuni de training anuale pentru echipele tehnice si actualizari software gratuite pe durata contractului. Un manager de cont dedicat este disponibil pentru orice intrebare."
- EN: "We provide phone and remote support for building operators, annual training sessions for technical teams and free software updates throughout the contract. A dedicated account manager is available for any question."

**Deliverables.**

| RO | EN |
|----|----|
| Contract de mentenanta cu SLA definit | Maintenance contract with defined SLA |
| Rapoarte de vizita dupa fiecare interventie | Visit reports after each intervention |
| Acces la portal de monitorizare remote | Access to remote monitoring portal |
| Actualizari firmware si software incluse | Firmware and software updates included |
| Training annual pentru operatori | Annual training for operators |
| Manager de cont dedicat | Dedicated account manager |

### 5.2 On its own page

Source: `app/servicii/mentenanta/page.tsx`

**Intro.**
- RO: "Service profesional, upgrade-uri de eficiență și modernizarea sistemelor BMS pentru îmbunătățirea managementului facilităților și menținerea performanței optime."
- EN: "Professional servicing, efficiency upgrades and BMS system modernisation to improve facilities management and maintain optimal performance."

**Response time** ("Timp de răspuns"): **4 ore (urgențe)** / 4 hours (emergencies).

**Contract types** ("Tipuri de contract"): Mentenanță preventivă / Preventive maintenance; Mentenanță corectivă / Corrective maintenance; Service la cerere / On-demand service; Contract full-service / Full-service contract.

**Emergency contact** ("Contact urgențe"): "+40 21 XXX XXXX", "Disponibil 24/7". This is a placeholder number.

**Service types** ("Tipuri de Service"):

**Mentenanță Preventivă / Preventive Maintenance**
- RO: "Verificări periodice programate pentru prevenirea defecțiunilor și menținerea performanței optime. Include inspecții vizuale, teste funcționale, curățarea componentelor și actualizări software."
- EN: "Scheduled periodic checks to prevent failures and maintain optimal performance. Includes visual inspections, functional tests, component cleaning and software updates."
- Points: Verificări trimestriale sau semestriale / Quarterly or biannual checks; Rapoarte detaliate după fiecare vizită / Detailed reports after each visit; Recomandări de îmbunătățire / Improvement recommendations.

**Mentenanță Corectivă / Corrective Maintenance**
- RO: "Intervenții rapide pentru remedierea defecțiunilor apărute. Echipa noastră diagnostichează și rezolvă problemele în cel mai scurt timp posibil pentru a minimiza impactul asupra operațiunilor."
- EN: "Rapid interventions to remedy faults that arise. Our team diagnoses and resolves issues as quickly as possible to minimise the impact on operations."
- Points: Timp de răspuns de 4 ore pentru urgențe / 4-hour response time for emergencies; Diagnoză de la distanță, când este posibil / Remote diagnosis when possible; Piese de schimb originale SAUTER / Original SAUTER spare parts.

**Modernizare și Upgrade / Modernisation and Upgrade**
- RO: "Actualizarea sistemelor BMS existente pentru îmbunătățirea eficienței energetice și adăugarea de funcționalități noi. Migrăm de la sisteme legacy la tehnologii moderne, păstrând investițiile anterioare."
- EN: "Updating existing BMS systems to improve energy efficiency and add new features. We migrate from legacy systems to modern technologies while preserving previous investments."
- Points: Upgrade de controllere și software / Controller and software upgrades; Adăugare de senzori și puncte de măsură / Adding sensors and measurement points; Implementare monitorizare de la distanță / Remote monitoring implementation.

**How it works** ("Cum Funcționează" / "How It Works"):
1. **Evaluare și Contract / Assessment and Contract.** RO: "Analizăm sistemul BMS existent și cerințele tale pentru a propune contractul de mentenanță optim. Stabilim frecvența vizitelor, SLA-urile și bugetul anual." EN: "We analyse the existing BMS system and your requirements to propose the optimal maintenance contract. We set the visit frequency, SLAs and annual budget."
2. **Planificarea Vizitelor / Visit Planning.** RO: "Programăm vizitele de mentenanță preventivă la ore convenabile pentru operațiunile tale. Echipa noastră sosește complet echipată, cu toate uneltele și piesele necesare." EN: "We schedule preventive maintenance visits at times convenient for your operations. Our team arrives fully equipped with all the tools and parts required."
3. **Intervenție și Raportare / Intervention and Reporting.** RO: "După fiecare vizită primești un raport detaliat al lucrărilor efectuate, al stării sistemului și recomandări pentru viitor. Ai acces la un portal online pentru urmărirea istoricului intervențiilor." EN: "After each visit you receive a detailed report of the work carried out, system status and recommendations for the future. You have access to an online portal to track intervention history."

No durations are given for these steps.

**Figures** ("Beneficiile Contractului de Mentenanță" / "Maintenance Contract Benefits"):

| Value | RO label | EN label |
|-------|----------|----------|
| 95% | Uptime garantat al sistemului | Guaranteed system uptime |
| 4h | Răspuns maxim la urgențe | Maximum emergency response |
| 20% | Reducerea costurilor de reparații | Repair cost reduction |
| 24/7 | Suport telefonic disponibil | Phone support available |

**CTAs:** "Solicită un contract de mentenanță" / "Request a maintenance contract"; "Protejează-ți investiția în sistemul BMS" / "Protect your BMS system investment"; "Solicită o ofertă de mentenanță" / "Request a maintenance quote"; "Vezi pachetele de servicii" / "View service packages" (links to `/pricing`, see `pricing.md`).

**Inconsistency:** the `/servicii` tab says 4 hours in Bucharest and 8 hours nationwide. This page says 4 hours with no geographic limit.

---

## 6. Additional services, packages and FAQ on `/servicii`

Source: `app/servicii/page.tsx`

### 6.1 Additional services

Heading "SERVICII ADITIONALE" / "ADDITIONAL SERVICES", "Solutii specializate" / "Specialised solutions".

| RO title | RO description | EN title | EN description |
|----------|----------------|----------|----------------|
| Structuri complexe | Proiecte multi-cladiri, campusuri si parcuri industriale cu sisteme BMS interconectate. | Complex structures | Multi-building projects, campuses and industrial parks with interconnected BMS systems. |
| Raportare avansata | Rapoarte personalizate pentru cerinte de sustenabilitate, audituri energetice si certificari. | Advanced reporting | Custom reports for sustainability requirements, energy audits and certifications. |
| Add-on-uri disponibile | Integrare sisteme de securitate, control acces, CCTV si management parcare. | Available add-ons | Integration of security, access control, CCTV and parking management systems. |

### 6.2 Service packages

The Standard and Full Service packages, the feature comparison ("50+ servicii BMS") and the 10-year cost-lock band are recorded in `pricing.md`, section 3.

### 6.3 FAQ

Heading "Intrebari frecvente" / "Frequently asked questions".

| Question (RO / EN) | Answer (RO, verbatim) | Answer (EN, site's) |
|--------------------|-----------------------|---------------------|
| Care este durata medie de implementare a unui proiect BMS? / What is the average implementation timeline for a BMS project? | "Durata variaza in functie de complexitatea proiectului. Pentru cladiri mici (sub 5.000 mp), implementarea dureaza 4–8 saptamani. Pentru proiecte medii, 2–4 luni, iar pentru proiecte complexe, 4–8 luni." | "The timeline varies depending on project complexity. For small buildings (under 5,000 m²), implementation takes 4–8 weeks. For medium projects, 2–4 months, and for complex projects, 4–8 months." |
| Ce echipamente folositi pentru sistemele BMS? / What equipment do you use for BMS systems? | "Suntem partener autorizat SAUTER din Elvetia — liderul global in automatizarea BMS. Folosim controllere Modulo5, Modulo6 si ECOS, senzori de inalta precizie si software proprietar SAUTER." | "We are an authorised SAUTER partner from Switzerland — the global leader in BMS automation. We use Modulo5, Modulo6 and ECOS controllers, high-precision sensors and proprietary SAUTER software." |
| Oferiti servicii de migrare de la alt sistem BMS? / Do you offer migration services from another BMS system? | "Da, avem experienta in migrarea sistemelor BMS existente catre solutii SAUTER. Procesul include un audit complet, un plan de migrare fara intreruperi operationale si training pentru noua platforma." | "Yes, we have experience migrating existing BMS systems to SAUTER solutions. The process includes a full audit, a migration plan with no operational interruptions and training for the new platform." |
| Ce garantie oferiti pentru sistemele instalate? / What warranty do you offer for installed systems? | "Oferim garantie standard de 2 ani pentru pachetul Standard si 5 ani pentru Full Service. Garantia acopera echipamentele, software-ul si manopera." | "We offer a standard 2-year warranty for the Standard package and 5 years for Full Service. The warranty covers equipment, software and labour." |
| Puteti integra BMS-ul cu sistemele existente? / Can you integrate the BMS with existing systems? | "Da, folosim protocoale deschise (BACnet, Modbus, KNX, DALI, M-Bus) care permit integrarea cu majoritatea sistemelor existente: HVAC, iluminat, control acces, detectie incendiu, lifturi si sisteme de securitate." | "Yes, we use open protocols (BACnet, Modbus, KNX, DALI, M-Bus) that allow integration with most existing systems: HVAC, lighting, access control, fire detection, lifts and security systems." |

The FAQ does not define "medium" or "complex" projects.

---

## 7. All durations in one place

| Scope | Duration as written | Source |
|-------|---------------------|--------|
| Design, average project | 2-6 săptămâni | `app/servicii/proiectare/page.tsx` |
| Design steps | 3-5 zile lucrătoare; 1-2 săptămâni; 1-2 săptămâni; 3-5 zile lucrătoare | `app/servicii/proiectare/page.tsx` |
| Installation, average | 4–12 săptămâni | `app/servicii/executie/page.tsx` |
| Installation steps | 1–2 săpt.; 2–6 săpt.; 1–2 săpt.; 1–2 săpt.; 2–3 zile | `app/servicii/executie/page.tsx` |
| Integration, average project | 2–8 săptămâni | `app/servicii/integrare/page.tsx` |
| Integration steps | 2–4 zile; 1 săptămână; 2–4 săptămâni; 1–2 săptămâni | `app/servicii/integrare/page.tsx` |
| Whole implementation, small building (sub 5.000 mp) | 4–8 săptămâni | `app/servicii/page.tsx` (FAQ) |
| Whole implementation, medium project | 2–4 luni | `app/servicii/page.tsx` (FAQ) |
| Whole implementation, complex project | 4–8 luni | `app/servicii/page.tsx` (FAQ) |
| Emergency response | 4 ore București, 8 ore la nivel național | `app/servicii/page.tsx` |
| Emergency response | 4 ore (urgențe), 4h | `app/servicii/mentenanta/page.tsx`, `app/servicii/executie/page.tsx` |
| Preventive visits | trimestrial sau semestrial | `app/servicii/page.tsx`, `app/servicii/mentenanta/page.tsx` |
| Operator training | anual | `app/servicii/page.tsx` |
| Warranty | 2 ani (Standard), 5 ani (Full Service) | `app/servicii/page.tsx` |

---

## 8. All service-level figures in one place

Marketing claims only. None names a method, sample, period or baseline.

| Value | Claim (RO) | Source |
|-------|------------|--------|
| 35% | Reducere costuri energetice | `app/servicii/proiectare/page.tsx` |
| 50% | Mai puține intervenții manuale | `app/servicii/proiectare/page.tsx` |
| 2-3 ani | ROI mediu investiție | `app/servicii/proiectare/page.tsx` |
| 99% | Rată de succes la recepție | `app/servicii/executie/page.tsx` |
| 150+ | Proiecte implementate | `app/servicii/executie/page.tsx` |
| 40% | Reducerea timpului de intervenție | `app/servicii/integrare/page.tsx` |
| 100% | Vizibilitate centralizată | `app/servicii/integrare/page.tsx` |
| 95% | Uptime garantat al sistemului | `app/servicii/mentenanta/page.tsx` |
| 20% | Reducerea costurilor de reparații | `app/servicii/mentenanta/page.tsx` |
| 50+ | servicii BMS | `app/servicii/page.tsx` |

Company-level figures and their contradictions (30+ against 150+ projects; 38% against 35%; 6.1 years against 2-3 years) are in `company-profile.md`, section 8.

---

## 9. What this means for the app

These notes apply the app's guardrails (`docs/guardrails.md`, version 1.3; version 1.3 changed no rule text from 1.2).

- **No figure here is a value.** Durations, percentages, uptime and response times may not appear in the app as facts or feed a calculation (rule 1). A duration table for programme planning, or a benchmark for savings, would need an approved reference dataset. Adding one is a loosening (section 10) and needs the approver's explicit approval.
- **Fire detection.** The site lists "detecție incendiu" / "fire detection" among systems it designs and integrates, and promises "control centralizat" over all building systems. In the app, fire detection and other life-safety systems are read-only: monitor, display, log and alarm only, with fire mode hardwired (rule 11). The app's proposal may not describe fire systems as controlled by the BMS.
- **Compliance wording.** The site promises "documentatia de conformitate cu normele in vigoare (SR EN ISO 16484)" and says "Toate documentele respectă standardele în vigoare". The app never attests compliance, and cites standards only from reference data with their edition (rule 11). The site cites SR EN ISO 16484 without a part or edition.
- **Protocols are capabilities, not building facts.** The protocol lists describe what SOVITECH can integrate. They say nothing about a given building. In the app, a building's protocols come only from its documents, and are never assumed (rule 1, "Interfaces").
- **SAUTER product names.** Modulo5, Modulo6, ECOS and CASE Suite appear on the site. In the app, SAUTER product names come only from the reference catalogue (rule 1).
- **Useful vocabulary.** The Romanian terms used here match what owner documents are likely to contain: "caiet de sarcini", "proiect tehnic", "PAC", "DDE", "proces-verbal de recepție", "documentație as-built", "tablou de automatizare", "centrală termică", "AHU", "contoare M-Bus". They may help the glossary work under rule 8. The glossary itself must come from reference data, not from this file.
- **The design service includes a budget estimate.** The design page lists "Estimare buget și timeline" as a deliverable. The app's own investment figures must use the rule 10 stage names: Indicative range, Preliminary investment estimate, Formal quotation. See `pricing.md`.
- **Reserved terms.** "Rezultate garantate", "Uptime garantat", "certificați", "conformitate" and "ofertă" appear in this copy. They are on, or inflect, the guardrails reserved list (section 2.8) and cannot describe values in the app.

---

## 10. Branch `redesign-2026` (unmerged): the redesigned services

**Status. Read this first.**
- **Source.** Branch `origin/redesign-2026` of the same repository, at commit `af81353` (2026-08-27). The service content comes from commit `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala"). Paths are relative to the repository root on that branch. Imported on 2026-09-24.
- **Not merged, and will not be merged.** The branch is not merged into `main`. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. This section is for reference only. Sections 1 to 9 above describe `main`, the current website. Nothing in this section replaces them.
- **Draft even on the branch.** The source files carry open TODO comments, quoted here verbatim:
  - `app/servicii/page.tsx`: "TODO(confirm): duratele orientative pe etape, fata de practica reala a echipei" and "TODO(SLA): nivelurile de contract Baza/Extins/Critic sunt descrise fara timpi de raspuns; valorile pe severitate se publica doar dupa confirmarea firmei (vezi pagina de intretinere)."
  - `app/servicii/intretinere-sisteme-bms/page.tsx`: "TODO(SLA): timpii de raspuns pe severitate, frecventa verificarilor planificate, banda de cost pentru nivelul Critic, intervalul orar exact al fiecarui nivel si tariful in afara programului sunt nerezolvate la nivel de firma. [...] nu se publica cifre pana la confirmare. Afirmatiile vechi "SLA 4h" si "95% uptime" au fost eliminate."
  - `app/servicii/consultanta/page.tsx`: "TODO(confirm): tariful pe zi de consultanta si pachetele standard; pagina nu publica tarife pana la confirmare".
  - `app/servicii/modernizare-sisteme-de-automatizare-si-bms/page.tsx`: "TODO(confirm): formularea juridica exacta a clauzelor de licenta, cod sursa si parole, de validat cu consilierul juridic inainte de publicare".
  - Every service page also has a "TODO(confirm)" on its stage durations.
- **Figures are marketing copy.** Cost bands, percentages, paybacks, durations and legal thresholds below are website statements. They are not verified engineering data, not approved reference data and not usable as app values (guardrails rule 1, section 2.1, section 10). Section 10.12 says what this means for the app.
- **Language.** Descriptions, process stages, deliverables and exclusions are given in Romanian and English, verbatim. For the longer supporting lists (summaries, client requirements, success criteria, FAQ answers, explanatory lists) only the site's own English is given, verbatim. Each such list names the file and line where the Romanian original sits. Romanian text keeps its diacritics. Page metadata is written without diacritics in the source and is kept that way.

**Files covered.**
- `app/servicii/layout.tsx` and `app/servicii/page.tsx` (the overview page).
- Six service pages, each a `page.tsx` with a `layout.tsx` for its metadata: `consultanta`, `proiectare-automatizari-bms`, `executie-sisteme-bms`, `integrare-sisteme-knx-dali-modbus-mbus`, `intretinere-sisteme-bms`, `modernizare-sisteme-de-automatizare-si-bms`. With the overview that makes 14 files under `app/servicii/`.
- `components/service-hero.tsx` (the shared page opening).
- `lib/site-routes.ts` (the services registry, lines 360-369) and `next.config.mjs` (the redirects).
- For names only: `components/header.tsx`, `components/footer.tsx`, `components/services-showcase.tsx`.
- `app/expertiza/*` is recorded in `sectors.md`, section B.

**Contents.** 10.1 What is new or changed against main. 10.2 Routes, names and the shared hero. 10.3 The `/servicii` overview page. 10.4 Consultancy. 10.5 Design. 10.6 Execution. 10.7 Integration. 10.8 Maintenance. 10.9 Modernisation. 10.10 Durations. 10.11 Figures and legal statements. 10.12 What this means for the app.

### 10.1 What is new or changed against main

**Service lines.** Main has four services. The branch has six.

| Service | `main` (sections 1-5 above) | Branch |
|---------|-----------------------------|--------|
| Consultancy | Only a footer link to `/servicii#consultanta`. No tab, section or page. | Its own page `/servicii/consultanta`, and the first tab on `/servicii`. Described as "singurul serviciu Sovitech Control care nu presupune vânzarea niciunui echipament" / "the only Sovitech Control service that involves selling no equipment at all". |
| Design | `/servicii/proiectare`, "Proiectare BMS" | `/servicii/proiectare-automatizari-bms`, "Proiectare automatizări și BMS" |
| Installation | `/servicii/executie`, "Execuție & Implementare" | `/servicii/executie-sisteme-bms`, "Execuție sisteme BMS" |
| Integration | `/servicii/integrare`, "Integrare Sisteme" | `/servicii/integrare-sisteme-knx-dali-modbus-mbus`, "Integrare KNX, DALI, Modbus, M-Bus" |
| Maintenance | `/servicii/mentenanta`, "Mentenanță & Modernizare" | `/servicii/intretinere-sisteme-bms`, "Întreținere sisteme BMS". The word "mentenanță" is replaced by "întreținere" on the service pages. |
| Modernisation | A service type ("Modernizare și Upgrade") on the maintenance page | Its own page `/servicii/modernizare-sisteme-de-automatizare-si-bms` |

**Page structure.** Each branch service page follows one template: a hero with an H1 and a lead paragraph, a sidebar, "Pe scurt" / "In short", named deliverables, a stage table with indicative durations, "what it requires from the client", success or acceptance criteria, an explicit exclusions list ("Ce nu include" / "What it does not include"), a page-specific table, an FAQ and a call to action. On main, each page had a short intro, a process with durations, a figures band and calls to action.

**Removed on the branch.** None of these appear in the branch service pages:
- the main figures bands: 35%, 50%, "2-3 ani" ROI, 24/7, 99%, 150+, "2 ani" warranty, 4h, 100%, 40%, "1", "∞", "95%" guaranteed uptime, 20%;
- "4 ore în București și 8 ore la nivel național" and every other fixed response time. Response times are now "convenit prin contract" / "agreed by contract". The maintenance page's source comment says the old "SLA 4h" and "95% uptime" claims were removed.
- the placeholder emergency number "+40 21 XXX XXXX";
- the hero "Servicii complete. Rezultate garantate.";
- the Standard and Full Service packages, "50+ servicii BMS" and the warranty answer "2 ani (Standard), 5 ani (Full Service)" (main's packages are in `pricing.md`, section 3);
- the "Servicii adiționale" block (Structuri complexe, Raportare avansată, Add-on-uri);
- the testimonials on `/servicii` (main's quotes are in `company-profile.md`, section 9.2);
- SAUTER product names: Modulo5, Modulo6, ECOS and CASE Suite are no longer named. SAUTER appears only as the partner ("partener autorizat SAUTER, Systems Partner, din 2017"), as "platforma implicită" / "the default platform", and in the execution page's link "Echipamentele SAUTER integrate" / "The SAUTER equipment we integrate" (→ `/produse`);
- "documentatia de conformitate cu normele in vigoare (SR EN ISO 16484)" and "FAT + SAT";
- LON, OPC UA and REST API. The branch integration page lists five protocols: Modbus RTU and TCP, BACnet MS/TP and IP, KNX, DALI, M-Bus;
- fire detection as something SOVITECH designs or controls. On main it was in the design scope ("Detecție incendiu - Monitorizare și alertare automată") and in "control centralizat" over all systems. On the branch it is excluded on the overview, design, execution and integration pages. The maintenance, modernisation and consultancy pages do not mention it (see 10.12).

**Added on the branch.**
- Cost bands in EUR per m² and per data point, maintenance cost as a percentage of the investment, a licence-fee reference, the modernisation cost ratio and paybacks (section 10.11). Main's service pages showed no prices or cost figures. `pricing.md`, section 7, records the same branch figures from the pricing side.
- Three maintenance contract levels, Bază / Extins / Critic, with severity definitions and definitions of how response time is measured.
- A list of what is handed over at the end of every job, and a position on licences, source programs and engineer-level passwords.
- A list of what SOVITECH does not do: HVAC and power installations, equipment without design or commissioning, fire detection and alarm systems, authorised energy audits, NIS2 compliance documents.
- Legal statements: the 290 kW BACS threshold of Legea 372/2005, the 70 kW threshold of Directive 2024/1275, and Legea 121/2014 on energy audits.
- New durations, all described as "orientativ" / "indicative" and mostly tied to "o clădire de birouri de circa 10.000 mp" (section 10.10).
- The company is called "Sovitech Control" throughout.

**Inconsistencies inside the branch.**
- **Name of the maintenance service.** The pages say "Întreținere". The home showcase card (`components/services-showcase.tsx`) still says "Mentenanță" with "mentenanță predictivă și suport dedicat 24/7" / "predictive maintenance and dedicated 24/7 support", although the maintenance page publishes no response times and offers permanent cover only at the Critic level. The overview FAQ asks "Se poate contracta doar mentenanța".
- **Menus leave services out.** The header lists Design, Execution, Integration and Maintenance. It has no Consultancy or Modernisation entry. The footer adds Consultancy but not Modernisation. The home showcase has the four original services only.
- **Registry descriptions differ from the pages.** `lib/site-routes.ts` describes Consultancy as "Evaluare de conformare, audit al lanțului de date și a doua opinie pe un sistem existent." The page never mentions a data-chain audit. Its main subjects are comparing offers, the 290 kW check and architecture. The registry and the header describe maintenance with "reglaj sezonier" / "seasonal tuning", which the maintenance page does not mention.
- **The "4-18 EUR/mp" band.** The overview hero says the cost of a BMS in Romania "se situează în 4-18 EUR/mp și 90-320 EUR pe punct de date", with no qualifier. The execution page limits the 4-18 band to "retail, birouri și hoteluri fără control pe cameră". The cost table on the same overview page has bands outside it: industrial 3-8, hotel with room control 18-38, pharma 30-80 EUR/m².
- **Reference count.** The overview and execution pages link to "Cele 25 de proiecte de referință". The branch references page lists 26 projects (see `references.md`, section R).
- **Stage durations and stated totals** do not add up on four pages (section 10.10).
- **Point count.** The execution page ties 750-1,350 points to an office building of about 10,000 m². At the site's own density of 50-90 points per 1,000 m², that point count belongs to 15,000 m², which is how the design and consultancy pages use it (section 10.10).

### 10.2 Routes, names and the shared hero

**Routes.** `next.config.mjs` redirects the four main URLs permanently. It gives this reason: "Services gained descriptive slugs."

| Service | Main URL | Branch URL | Registry title RO / EN (`lib/site-routes.ts`) | Registry description RO / EN | Personas |
|---------|----------|------------|-----------------------------------------------|------------------------------|----------|
| Design | `/servicii/proiectare` (redirects) | `/servicii/proiectare-automatizari-bms` | Proiectare automatizări și BMS / Automation and BMS design | De la analiza instalațiilor la caietul de sarcini și documentația de execuție. / From plant survey to technical specification and execution drawings. | P4, P8, P1 |
| Execution | `/servicii/executie` (redirects) | `/servicii/executie-sisteme-bms` | Execuție sisteme BMS / BMS system installation | Tablouri, cablare, programare, grafică și punere în funcțiune. / Panels, wiring, programming, graphics and commissioning. | P4, P8, P1 |
| Integration | `/servicii/integrare` (redirects) | `/servicii/integrare-sisteme-knx-dali-modbus-mbus` | Integrare sisteme: KNX, DALI, Modbus, M-Bus / Systems integration: KNX, DALI, Modbus, M-Bus | Un singur strat de supervizare peste echipamente de la producători diferiți. / A single supervision layer over equipment from different manufacturers. | P4, P7, P6 |
| Maintenance | `/servicii/mentenanta` (redirects) | `/servicii/intretinere-sisteme-bms` | Întreținere sisteme BMS / BMS maintenance | Vizite planificate, reglaj sezonier, analiza alarmelor și raport de performanță. / Planned visits, seasonal tuning, alarm review and performance reporting. | P3, P2 |
| Modernisation | None | `/servicii/modernizare-sisteme-de-automatizare-si-bms` | Modernizare sisteme de automatizare și BMS / Automation and BMS modernisation | Migrare pe etape, cu păstrarea cablării și a elementelor de execuție funcționale. / Phased migration that keeps working wiring and field devices in place. | P1, P2, P3, P4 |
| Consultancy | None | `/servicii/consultanta` | Consultanță / Consulting | Evaluare de conformare, audit al lanțului de date și a doua opinie pe un sistem existent. / Compliance assessment, data-chain audit and a second opinion on an existing system. | P1, P2, P4, P5 |

All six have status "published" in the registry. The personas are defined in `lib/site-routes.ts` (`personaMeta`): P1 Proprietar / Dezvoltator / Investitor, P2 Property & Asset Manager, P3 Facility Manager, P4 Director tehnic / Inginer-șef, P5 Manager ESG / Sustenabilitate, P6 Manager industrial / Pharma, P7 IT / OT Manager, P8 Proiectant MEP / Antreprenor general.

**Names in menus.**

| Place | Entries (RO / EN) |
|-------|-------------------|
| Header, "Servicii" menu (`components/header.tsx`) | Servicii BMS Complete / Complete BMS Services ("Parcursul complet, de la consultanță la mentenanță"); Proiectare BMS / BMS Design; Execuție Sisteme / System Installation; Integrare Sisteme / Systems Integration; Întreținere BMS / BMS Maintenance ("Vizite planificate, reglaj sezonier, raportare" / "Planned visits, seasonal tuning, reporting") |
| Footer (`components/footer.tsx`) | Proiectare BMS; Execuție sisteme; Integrare sisteme; Întreținere sisteme BMS / BMS Maintenance; Consultanță / Consultancy (→ `/servicii/consultanta`) |
| Home showcase (`components/services-showcase.tsx`) | Proiectare BMS; Execuție Sisteme; Integrare Sisteme; Mentenanță / Maintenance. The cards now link to the service pages and show photos `/servicii/proiectare-bms.jpg`, `/servicii/executie-sisteme.jpg`, `/servicii/integrare-sisteme.jpg` and `/servicii/mentenanta.jpg` (new files in `public/servicii/`; the brand import holds copies in `../brand/imagery/services-redesign-2026/`). The pitch text is unchanged except for punctuation. |

On main, the header and footer links pointed to `/servicii#…` anchors that did not exist (section 1). On the branch they point to the service pages.

**The shared hero** (`components/service-hero.tsx`). Every service page opens with the same component. Its source comment says the four old pages "had drifted into two different openings", so the markup now lives in one place. It shows:
- a breadcrumb "Acasă / Servicii / {H1}" ("Home / Services / {H1}");
- the eyebrow "• Servicii BMS" / "• BMS Services";
- the page's H1 and lead paragraph, on the dark hero background.

It takes four strings: `titleRo`, `titleEn`, `leadRo` and `leadEn`. Each page's values are recorded below.

### 10.3 The `/servicii` overview page

Source: `app/servicii/page.tsx`. Metadata (`app/servicii/layout.tsx`): title "Servicii BMS: proiectare, executie, integrare, mentenanta | Sovitech"; description "Sase servicii BMS: proiectare, executie, integrare KNX si Modbus, intretinere, modernizare, consultanta. Livrabile numite, criterii de receptie, exclusii."

**Hero.**
- Eyebrow: "• Servicii" / "• Services".
- H1 RO: "Șase servicii BMS: / proiectare, execuție, integrare, întreținere, modernizare, consultanță". EN: "Six BMS services: / design, execution, integration, maintenance, modernisation, consultancy".
- RO: "Sovitech Control acoperă ciclul complet al unui sistem de automatizare a clădirii: proiectarea, execuția, integrarea echipamentelor cu automatizare proprie, întreținerea, modernizarea unui sistem existent și consultanța tehnică fără achiziție. Fiecare serviciu are livrabile numite, criterii de recepție scrise și o listă explicită cu ce nu include. Costul unui sistem BMS în România se situează în 4-18 EUR/mp și 90-320 EUR pe punct de date."
- EN: "Sovitech Control covers the complete lifecycle of a building automation system: design, execution, integration of equipment with built-in controls, maintenance, modernisation of an existing system and technical consultancy with no purchase attached. Every service has named deliverables, written acceptance criteria and an explicit list of what it does not include. The cost of a BMS in Romania sits within 4-18 EUR/sqm and 90-320 EUR per data point."


**Tabs and journey indicator** (same order in both): 1 Consultanță / Consultancy → 2 Proiectare / Design → 3 Execuție / Execution → 4 Integrare / Integration → 5 Întreținere / Maintenance → 6 Modernizare / Modernisation. The page opens on the Consultanță tab. Each tab has a button "Vezi serviciul complet" / "See the full service" to the service's own page.

Note under the journey indicator (line 409): RO "Ordinea de mai sus este ordinea reală în care un beneficiar ajunge la ele, nu ordinea din organigramă." EN "The order above is the real order in which a client reaches them, not the org-chart order."

#### Tab "Consultanță" / "Consultancy" (`serviceContent.consultanta`, links to `/servicii/consultanta`)

Heading: "Consultanță" / "Consultancy".

- RO: "Înainte de a exista un proiect sau o ofertă: verificarea unei obligații legale, compararea a două oferte, revizuirea unei arhitecturi. Livrabilul principal este un raport tehnic cu recomandări și estimare de cost, în 1-10 zile lucrătoare."
- EN: "Before a project or an offer exists: checking a legal obligation, comparing two offers, reviewing an architecture. The main deliverable is a technical report with recommendations and a cost estimate, in 1-10 working days."

Steps:

01. **Stabilirea sferei și preluarea documentelor / Setting the scope and receiving the documents.** RO: "O discuție de 30-60 de minute stabilește întrebarea la care răspunde raportul. Se preiau ofertele, proiectele, listele de puncte și facturile de energie disponibile." EN: "A 30-60 minute discussion sets the question the report answers. The available offers, designs, points lists and energy bills are taken over."
02. **Vizita pe clădire, unde este cazul / The building visit, where applicable.** RO: "Verificarea sistemului existent, a instalațiilor și a tablourilor, într-o zi pe teren." EN: "Checking the existing system, the installations and the panels, in one day on site."
03. **Analiza și redactarea / Analysis and writing.** RO: "Compararea, verificarea față de repere de piață și de praguri legale, redactarea raportului. Fiecare cifră are banda și domeniul declarate." EN: "The comparison, checking against market references and legal thresholds, writing the report. Every figure has its band and domain declared."
04. **Prezentarea raportului / Presenting the report.** RO: "O discuție de o oră, cu întrebări și cu ajustarea recomandărilor. Raportul poate fi folosit în discuția cu toți ofertanții, fără restricții." EN: "A one-hour discussion, with questions and adjustment of the recommendations. The report can be used with all bidders, without restrictions."

Deliverables ("Livrabile numite" / "Named deliverables"):

| # | RO | EN |
|---|----|----|
| 1 | Tabel de aliniere a ofertelor pe aceeași sferă | An offer alignment table on the same scope |
| 2 | Notă de conformare, cu prag și articol de lege | A compliance note, with threshold and article of law |
| 3 | Raport de arhitectură, cu riscuri și alternative | An architecture report, with risks and alternatives |
| 4 | Listă de constatări pe un sistem existent | A list of findings on an existing system |
| 5 | Estimare de cost pe benzi de piață | A cost estimate on market bands |
| 6 | Grilă de evaluare a ofertanților | A bidder evaluation grid |

#### Tab "Proiectare" / "Design" (`serviceContent.proiectare`, links to `/servicii/proiectare-automatizari-bms`)

Heading: "Proiectare automatizări și BMS" / "BMS and automation design".

- RO: "Pentru clădiri noi sau renovări majore, înainte de licitație sau de comanda echipamentelor. Livrabilul principal: proiect tehnic, listă de puncte, caiet de sarcini, scheme de tablou. Durată orientativă: 3-8 săptămâni pentru o clădire de birouri de circa 10.000 mp."
- EN: "For new buildings or major renovations, before the tender or the equipment order. The main deliverable: a technical design, points list, technical specification, panel diagrams. Indicative duration: 3-8 weeks for an office building of around 10,000 sqm."

Steps:

01. **Tema de proiectare și preluarea proiectelor de instalații / The design brief and the services designs.** RO: "Se stabilesc instalațiile incluse, regimul de ocupare, cerințele de raportare și cine va opera sistemul. Se identifică echipamentele care vin cu automatizare proprie." EN: "The included installations, occupancy pattern, reporting requirements and who will operate the system are established. Equipment with its own controls is identified."
02. **Schema funcțională și secvențele / The functional diagram and the sequences.** RO: "Se desenează fiecare instalație și se scriu secvențele de funcționare în text, inclusiv regimurile de avarie și interblocajele." EN: "Each installation is drawn and the operating sequences are written in text, including failure modes and interlocks."
03. **Lista de puncte și arhitectura / The points list and the architecture.** RO: "Se stabilesc punctele, împărțirea pe controlere, magistralele, protocoalele și rezerva de puncte. Proiectul se scrie pe protocoale deschise: BACnet, Modbus, KNX, DALI, M-Bus." EN: "The points, controller split, buses, protocols and points reserve are established. The design is written on open protocols: BACnet, Modbus, KNX, DALI, M-Bus."
04. **Caiet de sarcini, estimare și predare / Specification, estimate and handover.** RO: "Cerințe de execuție, criterii de recepție, estimare de cost pe capitole, o rundă de observații și revizia finală." EN: "Execution requirements, acceptance criteria, a cost estimate by chapter, one round of comments and the final revision."

Deliverables ("Livrabile numite" / "Named deliverables"):

| # | RO | EN |
|---|----|----|
| 1 | Lista de puncte, în format editabil | The points list, in editable format |
| 2 | Schema funcțională pe fiecare instalație | The functional diagram for each installation |
| 3 | Caietul de sarcini, cu criterii de recepție | The specification, with acceptance criteria |
| 4 | Schemele de tablou de automatizare | The automation panel diagrams |
| 5 | Specificația de echipamente, echivalabilă | The equivalence-ready equipment specification |
| 6 | Estimarea de cost pe capitole | The cost estimate by chapter |

#### Tab "Execuție" / "Execution" (`serviceContent.executie`, links to `/servicii/executie-sisteme-bms`)

Heading: "Execuție sisteme BMS" / "BMS execution".

- RO: "După ce proiectul există și echipamentele de instalații sunt stabilite. Livrabilul principal: sistem funcțional, tablou, programe, HMI, punere în funcțiune, As-built. Durată orientativă: 8-20 de săptămâni, în funcție de ritmul șantierului și de termenele de livrare."
- EN: "Once the design exists and the mechanical equipment is settled. The main deliverable: a working system, panel, programs, HMI, commissioning, As-built. Indicative duration: 8-20 weeks, depending on site pace and delivery lead times."

Steps:

01. **Proiect de execuție și comenzi / Execution design and orders.** RO: "Verificarea listei de puncte pe teren, actualizarea schemelor și lansarea comenzilor de echipamente. Livrarea este etapa cu cea mai mare variație." EN: "On-site verification of the points list, updating the diagrams and placing the equipment orders. Delivery is the stage with the greatest variation."
02. **Tablou și cablare pe clădire / Panel and building cabling.** RO: "Confecția tabloului de forță și automatizare, trasee, cablu de semnal și magistrală, montaj senzori și servomotoare, punere sub tensiune." EN: "Assembly of the power and automation panel, routes, signal and bus cable, mounting of sensors and actuators, energisation."
03. **Programare și interfață grafică / Programming and graphical interface.** RO: "Implementarea secvențelor, parametrizarea buclelor, sinoptice pe fiecare instalație, matrice de alarme pe trei niveluri, trend-loguri configurate." EN: "Implementing the sequences, tuning the loops, synoptics for each installation, a three-level alarm matrix, configured trend logs."
04. **Verificare, testare funcțională și instruire / Verification, functional testing and training.** RO: "Fiecare punct se verifică fizic, fiecare secvență se testează în condiții reale, inclusiv regimurile de avarie, cu proces-verbal semnat și instruirea echipei de operare." EN: "Every point is physically checked, every sequence is tested in real conditions, including failure modes, with a signed report and training of the operating team."

Deliverables ("Livrabile numite" / "Named deliverables"):

| # | RO | EN |
|---|----|----|
| 1 | Tabloul electric de forță și automatizare | The power and automation electrical panel |
| 2 | Cablarea și echipamentele de câmp montate | The cabling and the mounted field equipment |
| 3 | Programele de control și monitorizare | The control and monitoring programs |
| 4 | Interfața grafică HMI, cu drepturi de acces | The HMI graphical interface, with access rights |
| 5 | Procesul-verbal de punere în funcțiune | The commissioning report |
| 6 | Documentația As-built, backup și parole predate | The As-built documentation, backup and passwords handed over |

#### Tab "Integrare" / "Integration" (`serviceContent.integrare`, links to `/servicii/integrare-sisteme-knx-dali-modbus-mbus`)

Heading: "Integrare KNX, DALI, Modbus, M-Bus" / "KNX, DALI, Modbus, M-Bus integration".

- RO: "Când chillerul, centrala de tratare a aerului, iluminatul și contoarele au fiecare automatizarea proprie și nu se văd într-un singur ecran. Livrabilul principal: puncte integrate, mapare de adrese, ecrane unificate. Durată orientativă: 2-10 săptămâni."
- EN: "When the chiller, the air handling unit, the lighting and the meters each have their own controls and cannot be seen on one screen. The main deliverable: integrated points, address mapping, unified screens. Indicative duration: 2-10 weeks."

Steps:

01. **Inventar și fezabilitate / Inventory and feasibility.** RO: "Se identifică fiecare echipament, protocolul, interfața fizică existentă și lista de valori expuse efectiv. Se stabilește ce se poate citi și ce se poate comanda." EN: "Each device is identified, with its protocol, existing physical interface and the values it actually exposes. What can be read and what can be commanded is established."
02. **Tabelul de mapare / The mapping table.** RO: "Punct cu punct: registrul sau obiectul din echipament, adresa în BMS, unitatea, scalarea, sensul comenzii. Se decide ce se comandă din BMS și ce rămâne pe automatizarea proprie." EN: "Point by point: the register or object in the equipment, the BMS address, the unit, the scaling, the command direction. What is commanded from the BMS and what stays local is decided."
03. **Magistrale și interfețe / Buses and interfaces.** RO: "Gateway-uri și convertoare unde sunt necesare, cablare de magistrală, adresare, terminații, punerea în comunicație a fiecărui echipament." EN: "Gateways and converters where needed, bus cabling, addressing, terminations, bringing each device into communication."
04. **Verificare valoare cu valoare și predare / Value-by-value verification and handover.** RO: "Fiecare punct integrat se compară cu valoarea afișată local pe echipament. Se testează comenzile și comportamentul la pierderea comunicației, apoi se predă tabelul de mapare final." EN: "Every integrated point is compared with the value displayed locally on the device. Commands and communication-loss behaviour are tested, then the final mapping table is handed over."

Deliverables ("Livrabile numite" / "Named deliverables"):

| # | RO | EN |
|---|----|----|
| 1 | Inventarul echipamentelor integrabile | The inventory of integrable equipment |
| 2 | Tabelul de mapare, punct cu punct | The mapping table, point by point |
| 3 | Gateway-uri și convertoare configurate | Configured gateways and converters |
| 4 | Sinoptice cu valorile reale ale echipamentelor | Synoptics with the equipment's real values |
| 5 | Alarme de pierdere a comunicației | Communication-loss alarms |
| 6 | Trend-loguri pe punctele integrate | Trend logs on the integrated points |

#### Tab "Întreținere" / "Maintenance" (`serviceContent.intretinere`, links to `/servicii/intretinere-sisteme-bms`)

Heading: "Întreținere sisteme BMS" / "BMS maintenance".

- RO: "După recepție, permanent. Contract pe trei niveluri, Bază, Extins și Critic, cu verificări planificate, registru de intervenții și raport periodic. Cost anual: 4-7% din valoarea investiției pentru nivelul de bază, 7-12% pentru cel extins."
- EN: "After acceptance, permanently. A contract on three levels, Base, Extended and Critical, with planned checks, an intervention log and a periodic report. Annual cost: 4-7% of the investment value at the base level, 7-12% at the extended level."

Steps:

01. **Analiza sistemului existent / Analysis of the existing system.** RO: "O zi pe clădire: lista de puncte, programele orare, punctele pe manual, alarmele active, accesul de nivel inginer și disponibilitatea pieselor." EN: "One day in the building: the points list, the schedules, the points in manual, the active alarms, engineer-level access and parts availability."
02. **Raportul de constatări și alegerea nivelului / The findings report and choosing the level.** RO: "Constatările se separă în ce se rezolvă din configurare și ce cere intervenție fizică. Nivelul de contract se alege după consecința unei opriri, nu după dimensiunea clădirii." EN: "Findings are split into what configuration can fix and what needs physical intervention. The contract level is chosen by the consequence of an outage, not by the size of the building."
03. **Punerea la punct înainte de contract / The tune-up before the contract.** RO: "Corectarea programelor orare, prioritizarea alarmelor, refacerea backup-urilor, completarea listei de puncte. Este etapa pe care majoritatea contractelor o sar." EN: "Correcting the schedules, prioritising the alarms, refreshing the backups, completing the points list. It is the stage most contracts skip."
04. **Regim curent / Ongoing operation.** RO: "Verificări planificate la frecvența din contract, intervenții la solicitare pe severitate, raport periodic cu alarme și consum față de anul anterior." EN: "Planned checks at the contract frequency, interventions on request by severity, a periodic report with alarms and consumption against the previous year."

Deliverables ("Livrabile numite" / "Named deliverables"):

| # | RO | EN |
|---|----|----|
| 1 | Verificări planificate, cu frecvență declarată | Planned checks, at a declared frequency |
| 2 | Registru de intervenții actualizat la fiecare vizită | An intervention log updated at every visit |
| 3 | Backup de configurație păstrat la beneficiar | A configuration backup kept by the client |
| 4 | Raport periodic cu alarme dominante și consum | A periodic report with dominant alarms and consumption |
| 5 | Intervenții la solicitare, încadrate pe severitate | Interventions on request, classed by severity |
| 6 | Recomandări de piese de schimb, cu termene | Spare part recommendations, with lead times |

#### Tab "Modernizare" / "Modernisation" (`serviceContent.modernizare`, links to `/servicii/modernizare-sisteme-de-automatizare-si-bms`)

Heading: "Modernizare sisteme de automatizare și BMS" / "Automation and BMS modernisation".

- RO: "Când sistemul existent nu mai are piese, suport sau posibilitatea de a adăuga puncte. Sistem nou pe instalațiile existente, migrare pe etape, fără oprirea clădirii. Cost: 40-60% din prețul unui sistem nou, cu amortizare de 3-6 ani pentru o modernizare de capital. Durată: 3-12 luni, pe etape."
- EN: "When the existing system has no more parts, support or room to add points. A new system on the existing installations, staged migration, without stopping the building. Cost: 40-60% of the price of a new system, with a 3-6 year payback for a capital modernisation. Duration: 3-12 months, staged."

Steps:

01. **Audit al sistemului existent / Audit of the existing system.** RO: "Lista de puncte reală, starea elementelor de câmp, starea programelor, inventarul de licențe și capacitatea de export a datelor. Prima etapă nu este cumpărarea." EN: "The real points list, the state of the field devices and programs, the licence inventory and the data export capability. The first stage is not buying."
02. **Plan de migrare și buget pe faze / Migration plan and phased budget.** RO: "Ordinea zonelor, ce se păstrează și ce se înlocuiește, ferestrele de lucru și fazarea investiției pe ani bugetari." EN: "The order of the zones, what is kept and what is replaced, the work windows and the phasing of the investment across budget years."
03. **Migrare zonă cu zonă, cu sistemele în paralel / Migration zone by zone, systems in parallel.** RO: "Fiecare zonă se trece pe controlerul nou într-o fereastră convenită, cu punct de revenire la sistemul vechi până la validare. Clădirea rămâne în funcțiune." EN: "Each zone moves to the new controller in an agreed window, with a fallback to the old system until validation. The building stays in operation."
04. **Documentație, licențe și instruire / Documentation, licences and training.** RO: "As-built complet, predarea licențelor pe numele beneficiarului, a programelor sursă și a parolelor de nivel inginer, instruirea echipei." EN: "The complete As-built, handover of the licences in the client's name, the source programs and the engineer-level passwords, team training."

Deliverables ("Livrabile numite" / "Named deliverables"):

| # | RO | EN |
|---|----|----|
| 1 | Audit cu lista de puncte reală | An audit with the real points list |
| 2 | Plan de migrare cu puncte de reversibilitate | A migration plan with reversibility points |
| 3 | Controlere noi, cu rezerva declarată | New controllers, with a declared reserve |
| 4 | Interfață grafică nouă, cu alarme prioritizate | A new graphical interface, with prioritised alarms |
| 5 | Migrarea datelor istorice, unde exportul e posibil | Historical data migration, where export is possible |
| 6 | Licențe, programe sursă și parole predate | Licences, source programs and passwords handed over |

**Maintenance contract levels.** Label "• NIVELURI DE CONTRACT DE ÎNTREȚINERE" / "• MAINTENANCE CONTRACT LEVELS". H2 "Întreținere pe niveluri: Bază și Extins" / "Maintenance by level: Base and Extended".
- EN (line 420): "The difference between levels is not the number of visits, but what happens when the system fails: who responds, how fast, in what window, and what is done if an immediate fix is not possible. The contract is written on severities, not on promises."
- The Extended card carries the badge "Interval extins" / "Extended window". Both cards link to `/servicii/intretinere-sisteme-bms` ("Vezi detaliile contractului" / "See the contract details").

| Feature | Bază / Base | Extins / Extended |
|---|---|---|
| Tagline | 4-7% din valoarea investiției pe an / 4-7% of the investment value per year | 7-12% din valoarea investiției pe an / 7-12% of the investment value per year |
| Verificări planificate, cu frecvență declarată / Planned checks, at a declared frequency | Yes | Yes |
| Registru de intervenții și raport periodic / Intervention log and periodic report | Yes | Yes: "Registru de intervenții și raport lunar" / "Intervention log and monthly report" |
| Asistență la distanță, în programul de lucru / Remote assistance, during working hours | Yes | Yes: "Asistență la distanță, în intervalul extins" / "Remote assistance, in the extended window" |
| Backup de configurație la fiecare vizită / Configuration backup at every visit | Yes | Yes: "Backup la fiecare vizită și după fiecare modificare" / "Backup at every visit and after every change" |
| Recomandări de piese de schimb / Spare part recommendations | Yes | Yes: "Recomandări de piese, cu stoc recomandat" / "Spare part recommendations, with a recommended stock" |
| Interval de disponibilitate extins / Extended availability window | No | Yes |
| Intervenție la fața locului inclusă / On-site intervention included | No | Yes: "Intervenție la fața locului inclusă, în limita vizitelor" / "On-site intervention included, up to the visit limit" |
| Modificări de configurare incluse / Configuration changes included | No | Yes: "Modificări de configurare incluse, în buget de ore" / "Configuration changes included, within a budget of hours" |
| Actualizări de firmware incluse, planificate / Firmware updates included, planned | No | Yes |
| Severitate 1 preluată prin serviciu de permanență / Severity 1 taken over by an on-call service | No | Yes |

- Bază / Base: RO "Verificări planificate și asistență la distanță în programul de lucru. Intervențiile la fața locului și modificările de configurare se ofertează la solicitare." EN "Planned checks and remote assistance during working hours. On-site interventions and configuration changes are quoted on request."
- Extins / Extended: RO "Interval de disponibilitate mai larg, intervenții la fața locului incluse în limita unui număr de vizite pe an și modificări de configurare incluse în limita unui buget de ore." EN "A wider availability window, on-site interventions included up to a number of visits per year, and configuration changes included up to a budget of hours."

Note under the cards (line 455), RO: "Există și un nivel Critic, cu preluare permanentă a sesizărilor, inclusiv în weekend și în sărbători legale. Timpii de răspuns pe severitate, frecvența verificărilor și intervalul orar exact se stabilesc și se scriu în contract. Nivelul potrivit se alege după consecința unei opriri, nu după dimensiunea clădirii." EN: "There is also a Critical level, with permanent takeover of requests, including weekends and legal holidays. Response times per severity, check frequency and the exact hours are set and written into the contract. The right level is chosen by the consequence of an outage, not by the size of the building."

**What is handed over.** Label "• CE SE PREDĂ" / "• WHAT IS HANDED OVER". H2 "Ce se predă la finalul oricărei lucrări Sovitech Control" / "What is handed over at the end of any Sovitech Control job". Intro EN: "The same documents, regardless of the service. A system without handed-over documentation is a system the next supplier has to rediscover, at the client's expense."

| # | RO | EN |
|---|----|----|
| 1 | Lista de puncte finală, în format editabil, cu adresa fiecărui punct, tipul de semnal și echipamentul deservit. | The final points list, in editable format, with each point's address, signal type and the equipment served. |
| 2 | Documentația As-built: scheme funcționale, scheme de tablou, planuri cu poziția echipamentelor, manuale de operare. | The As-built documentation: functional diagrams, panel diagrams, plans with equipment positions, operating manuals. |
| 3 | Backup de configurație al controlerelor și al stației de supervizare, predat pe suport al beneficiarului, cu procedura de restaurare. | The configuration backup of the controllers and the supervision station, handed over on the client's media, with the restore procedure. |
| 4 | Programele de control, în forma în care pot fi deschise și modificate cu instrumentul de inginerie al platformei. | The control programs, in the form in which they can be opened and modified with the platform's engineering tool. |
| 5 | Parolele de nivel inginer și de administrare, predate beneficiarului, nu păstrate de furnizor. | The engineer-level and administration passwords, handed to the client, not kept by the supplier. |
| 6 | Procesul-verbal de punere în funcțiune, cu lista testelor efectuate și rezultatul fiecăruia. | The commissioning report, with the list of tests performed and the result of each. |

The page adds that the handover of licences, source programs and engineering passwords "is covered in depth on the" modernisation page (section 10.9).

**Indicative cost by building type.** H3 "Costul orientativ pe tip de clădire" / "Indicative cost by building type". Intro RO: "Cifrele sunt benzi de piață pentru România, la nivelul unui sistem BMS nou, complet. Nu sunt oferte și nu înlocuiesc o estimare pe clădirea reală." EN: "The figures are market bands for Romania, for a complete new BMS. They are not offers and do not replace an estimate for the real building."

| Tip clădire / Building type | Bandă de cost / Cost band | Observație / Note |
|---|---|---|
| Birouri clasa A / Class A offices | 9-18 EUR/mp / 9-18 EUR/sqm | densitate uzuală 50-90 puncte la 1.000 mp / usual density 50-90 points per 1,000 sqm |
| Birouri clasa B / Class B offices | 5-10 EUR/mp / 5-10 EUR/sqm | fără contorizare extinsă pe chiriași / without extended tenant metering |
| Hotel, fără control pe cameră / Hotel, without room control | 6-13 EUR/mp / 6-13 EUR/sqm | doar instalațiile centrale / central plant only |
| Hotel, cu control pe cameră / Hotel, with room control | 18-38 EUR/mp / 18-38 EUR/sqm | costul camerei domină bugetul / the room cost dominates the budget |
| Retail | 4-9 EUR/mp / 4-9 EUR/sqm | replicabil pe rețea de magazine / replicable across a store network |
| Industrial și logistic / Industrial and logistics | 3-8 EUR/mp / 3-8 EUR/sqm | suprafețe mari, densitate mică de puncte / large areas, low point density |
| Pharma | 30-80 EUR/mp / 30-80 EUR/sqm | zone clasificate, monitorizare validată / classified areas, validated monitoring |
| Pe punct de date / Per data point | 90-320 EUR/punct / 90-320 EUR/point | scade cu volumul / decreases with volume |

Line below the table, RO: "Costul unei modernizări: 40-60% din prețul unui sistem nou, cu amortizare de 3-6 ani pentru o modernizare de capital. Costul întreținerii: 4-7% din valoarea investiției pe an pentru contractul de bază, 7-12% pentru cel extins." EN: "The cost of a modernisation: 40-60% of the price of a new system, with a 3-6 year payback for a capital modernisation. The cost of maintenance: 4-7% of the investment value per year for the base contract, 7-12% for the extended one."

The source's first line records a planned link: "LINKS-TO-REACTIVATE: Cost orientativ al unui sistem BMS | interim /resurse/cost-sistem-bms | final /costuri". `pricing.md`, section 7, records the branch's cost figures and maintenance levels from the pricing side.

**What Sovitech Control does not do.** Label "• CE NU FACEM" / "• WHAT WE DO NOT DO". H2 "Ce nu face Sovitech Control" / "What Sovitech Control does not do". Intro EN: "An integrator who says what it does not do is easier to verify than one who says it does everything."

| # | Title RO | Title EN | Text EN |
|---|----------|----------|---------|
| 1 | Nu execută instalații de HVAC, sanitare sau electrice de putere | It does not execute HVAC, plumbing or power electrical installations | The automation system connects to installations executed by the specialist contractors. |
| 2 | Nu vinde echipamente fără proiect sau fără punere în funcțiune | It does not sell equipment without a design or without commissioning | A controller delivered without programming produces no result. |
| 3 | Nu execută sisteme de detecție și semnalizare a incendiului | It does not execute fire detection and alarm systems | It takes no responsibility for the fire safety scenario. The BMS takes signals from the fire alarm panel, as information, over contacts or protocol. |
| 4 | Nu face audit energetic autorizat | It does not perform authorised energy audits | Within the meaning of Law 121/2014, the energy audit is done by a certified auditor, while Sovitech Control provides the system data and implements the automation measures. |
| 5 | Nu certifică sisteme informatice și nu emite documente de conformitate NIS2 | It does not certify IT systems and issues no NIS2 compliance documents | It configures segmentation and remote access on the automation side, within the framework required by the client's IT team. |

The Romanian texts are at `app/servicii/page.tsx`, lines 252-258.

Note below (line 528), EN: "Two BMS offers look almost identical on the first page and differ by 40% in price. The difference is almost always in what is not written: the real number of physical points quoted, what exactly "integration" means, who performs the commissioning and to what test protocol, and what is handed over at acceptance in terms of licences, source programs and passwords. The complete comparison method, with a grid and the questions to ask at clarifications, is on the consultancy page."

**Call to action.** Label "• PRIMUL PAS" / "• THE FIRST STEP". H2 RO "Discuție de 30 de minute despre lucrarea potrivită", EN "A 30-minute discussion about the right job". EN text: "Most quote requests start with the wrong service: a modernisation requested as a new system, or an integration requested as a complete project. A short discussion with the project engineer establishes what job is actually needed, and in what order." Button "Cere o evaluare a clădirii" / "Request a building assessment" (→ `/contact`).

**FAQ.** H2 "Întrebări frecvente" / "Frequently asked questions".

1. **Care este diferența dintre proiectare și execuție la un sistem BMS?** / What is the difference between design and execution for a BMS?
   EN answer: "Design produces documents: the functional diagram, the points list, the technical specification, the panel diagrams and the equipment specification. Execution produces the system: the panel, the cabling, the installation, the programs, the graphical interface and the commissioning. They can be contracted separately, and a correctly written design can be executed by another supplier."
2. **Cât durează un proiect complet de BMS, de la proiectare la punere în funcțiune?** / How long does a complete BMS project take, from design to commissioning?
   EN answer: "For an office building of around 10,000 sqm, design takes 3-8 weeks and execution 8-20 weeks, depending on the availability of the installations and equipment lead times. The real duration depends on the site's pace, not the pace of the controls work."
3. **Se poate contracta doar mentenanța, pentru un sistem executat de altcineva?** / Can maintenance alone be contracted, for a system executed by someone else?
   EN answer: "Yes. Taking over a system executed by another supplier starts with one day of analysis: the points list, the state of the programs, engineer-level access and parts availability. If the engineering passwords or the controller programs were not handed over at acceptance, this is established before signing the contract, not after."
4. **Sovitech Control lucrează numai cu echipamente SAUTER?** / Does Sovitech Control work only with SAUTER equipment?
   EN answer: "Sovitech Control has been an authorised SAUTER Systems Partner since 2017. The default platform is SAUTER, but the designs are written on open protocols, BACnet, Modbus, KNX, DALI and M-Bus, so a specification produced by Sovitech Control can be executed by another supplier as well."

Answers are given in the site's English. The Romanian answers are at `app/servicii/page.tsx`, line 260 onwards.
Hub links: "Cost orientativ al unui sistem BMS" / "Indicative cost of a BMS" → `/resurse/cost-sistem-bms`; "Cele 25 de proiecte de referință" / "The 25 reference projects" → `/referinte`; "Sectoarele acoperite" / "The sectors we cover" → `/expertiza`; "Ghidul complet al sistemelor BMS" / "The complete guide to BMS" → `/ghid/sisteme-bms-cladiri`.

### 10.4 Consultanță BMS / BMS consultancy

Source: `app/servicii/consultanta/page.tsx` (route `/servicii/consultanta`), rendered through `components/service-hero.tsx`. New on the branch; main has no such page.

Page metadata (`app/servicii/consultanta/layout.tsx`, written without diacritics): title "Consultanta BMS: compararea ofertelor si arhitectura | Sovitech"; description "Consultanta tehnica BMS fara achizitie de echipamente: comparare de oferte, verificarea pragului de 290 kW, arhitectura, caiet de sarcini. Raport in 10 zile."

**H1.** RO: "Consultanță BMS: compararea a două oferte, verificarea pragului de 290 kW, arhitectură" EN: "BMS consultancy: comparing two offers, checking the 290 kW threshold, architecture"

**Lead.**
- RO: "Consultanța tehnică este singurul serviciu Sovitech Control care nu presupune vânzarea niciunui echipament. Acoperă compararea ofertelor primite de la alți furnizori, verificarea obligației legale de automatizare, revizuirea unei arhitecturi propuse, evaluarea unui sistem existent și redactarea caietului de sarcini. Rezultatul este un raport scris, livrat în 1-10 zile lucrătoare, în funcție de sferă."
- EN: "Technical consultancy is the only Sovitech Control service that involves selling no equipment at all. It covers comparing offers received from other suppliers, verifying the legal automation obligation, reviewing a proposed architecture, assessing an existing system and writing the technical specification. The result is a written report, delivered in 1-10 working days, depending on scope."

**Sidebar.** "Durată orientativă" / "Indicative duration"; "1-10 zile lucrătoare" / "1-10 working days"; "raport scris, în funcție de sferă" / "a written report, depending on scope"; "Ce acoperă" / "What it covers"; "Cere o evaluare a clădirii" / "Request a building assessment".

| # | RO | EN |
|---|----|----|
| 1 | Raport scris, cu sferă stabilită înainte | A written report, with the scope set beforehand |
| 2 | Comparare de oferte, pe aceeași sferă | Bid comparison, aligned to the same scope |
| 3 | Verificarea obligației legale de automatizare | Verification of the legal automation obligation |
| 4 | Revizuire de arhitectură și caiet de sarcini | Architecture review and technical specification |
| 5 | Fără vânzare de echipamente în cadrul lucrării | No equipment sold as part of the engagement |

**Pe scurt** / In short

1. Consultancy can be contracted with no subsequent works. It is an uncomfortable position for an integrator, and exactly why it is useful to a buyer.
2. The most frequent request is comparing two offers that look identical on the first page and differ by 40% in price.
3. The second most frequent request is verifying the BACS obligation: the 290 kW threshold in Law 372/2005, with a 31.12.2024 deadline, already passed, and the 70 kW threshold in Directive 2024/1275, with a 31.12.2029 deadline, not yet transposed into Romanian law.
4. The cost references for validating an offer: 4-18 EUR/sqm as an aggregate band, 90-320 EUR per data point, 50-90 points per 1,000 sqm for class A offices.
5. The report is written and verifiable. It contains no savings percentages without a declared domain and no brand recommendations without technical justification.
6. Consultancy is billed per working day or per package; it is not recouped from a later job.

English as on the site. The Romanian is at `app/servicii/consultanta/page.tsx`, line 23 onwards.

**Ce livrează concret o lucrare de consultanță** / What a consultancy engagement concretely delivers

Note (line 205): "The deliverable is always a written document. The scope is set beforehand, and the report answers it exactly."

| # | RO | EN |
|---|----|----|
| 1 | Analiza comparativă a ofertelor primite, cu tabel de aliniere pe aceeași sferă, cu diferențele identificate și cu întrebările de pus fiecărui ofertant la clarificări. | A comparative analysis of the offers received, with an alignment table on the same scope, the differences identified and the questions to put to each bidder at clarifications. |
| 2 | Verificarea obligației legale, cu pragul aplicabil, cu articolul de lege și cu distincția între dreptul român în vigoare și obligația UE netranspusă. | Verification of the legal obligation, with the applicable threshold, the article of law and the distinction between Romanian law in force and the untransposed EU obligation. |
| 3 | Revizuirea arhitecturii propuse: protocoale, împărțirea pe controlere, rezerva de puncte, poziția supervizării, accesul la distanță, riscul de dependență de un singur furnizor. | A review of the proposed architecture: protocols, controller split, points reserve, supervision placement, remote access, the risk of dependence on a single supplier. |
| 4 | Evaluarea unui sistem existent, cu constatări separate în măsuri de configurare, care nu cer investiție, și măsuri care cer intervenție fizică. | An assessment of an existing system, with findings split into configuration measures, which need no investment, and measures requiring physical intervention. |
| 5 | Estimarea de cost pe benzi de piață, cu domeniul declarat pentru fiecare cifră. | A cost estimate on market bands, with the domain declared for every figure. |
| 6 | Caietul de sarcini sau revizuirea celui existent, unde beneficiarul urmează să lanseze o procedură de ofertare. | The technical specification, or a review of the existing one, where the client is about to launch a bidding procedure. |
| 7 | Grila de evaluare a ofertanților, cu criterii ponderate, pentru o procedură de selecție. | A bidder evaluation grid, with weighted criteria, for a selection procedure. |

**Cum se compară două oferte de BMS** / How to compare two BMS offers

Note (line 226): "Two BMS offers only become comparable once they are brought to the same scope. The price difference disappears, grows or changes sign in five places, and all five can be checked before signing."

- **1. The number of physical points.** An offer with 800 points and one with 1,200 points for the same building do not differ in price, but in scope. The reference check is density: 50-90 points per 1,000 sqm for class A offices, so 750-1,350 points for 15,000 sqm. An offer far below the band has removed points, and removed points reappear as additional works.
- **2. What "integration" means in that offer.** Ask for the list of integrated equipment, the number of points taken from each and whether the communication modules are included. "Integration with the chiller" can mean 40 points over Modbus or two status contacts.
- **3. Who performs the commissioning and to what protocol.** Ask for the functional test protocol, in writing, before signing. The difference between "connected" and "commissioned" is usually the price difference.
- **4. What is handed over at acceptance.** Licences in whose name, source programs or just executables, engineer-level passwords, backup, As-built, historical data export. The six questions are detailed on the modernisation page.
- **5. The ten-year cost, not the invoice.** Add to the purchase price: the annual maintenance contract, 4-7% of the investment value at the base level and 7-12% at the extended level, the annual licence fee, 8-18% of the software component's value, and the predictable cost of extending the licence. An offer 30% cheaper at purchase can be more expensive over ten years.

English as on the site. The Romanian is at `app/servicii/consultanta/page.tsx`, line 42 onwards.

Note (line 237): "The warning signs in a cheap offer: no points list, a per-point cost far below the 90-320 EUR band, commissioning quoted as a token line item, no mention at all of licences and passwords, equipment equivalences without declared characteristics, and an execution deadline significantly shorter than the other bidders' without a technical explanation."

**Ce se întreabă un integrator înainte de semnare** / What to ask an integrator before signing

Note (line 251): "Twelve questions, with answers requested in writing. A bidder who dodges a written answer to more than two of them has already answered."

1. How many physical points does the offer contain, by signal type, and what is the declared reserve on each controller?
2. What equipment is integrated, over what protocol, with how many points from each, and are the communication modules included in the price?
3. In whose name is the supervision software licence issued?
4. Are the controller programs handed over in source form, or only loaded into the controller?
5. Who holds the engineer-level password after acceptance?
6. What is the cost of extending the licence by 100 additional points?
7. Is there an annual licence fee, and how much is it?
8. What is the functional test protocol at commissioning, and who signs it?
9. What documents are handed over at acceptance, as a complete list?
10. What is the warranty term, and what suspends it?
11. What are the response times per severity in the maintenance contract, and how are they measured?
12. What format does the historical data export have, and for what period is it kept at full resolution?

English as on the site. The Romanian is at `app/servicii/consultanta/page.tsx`, line 50 onwards.

Note (line 261): "What to check in the bidder's references"

Note (line 262): "Not the number of projects, but three concrete things:"

1. The name of the building and a contact person who can confirm.
2. The number of points and the equipment integrated in that project.
3. Whether that project's client was later able to change the service provider without changing the system. The third question is the most informative, and almost nobody asks it.

English as on the site. The Romanian is at `app/servicii/consultanta/page.tsx`, line 107 onwards.

**Cum decurge o lucrare de consultanță, pe etape** / How a consultancy engagement proceeds, stage by stage

- **1. Stabilirea sferei / 1. Setting the scope** (1 zi / 1 day). RO: "Discuție de 30-60 de minute. Se stabilește întrebarea la care răspunde raportul și ce documente sunt disponibile." EN: "A 30-60 minute discussion. The question the report answers, and what documents are available, are established."
- **2. Preluarea documentelor / 2. Receiving the documents** (1-3 zile, depinde de beneficiar / 1-3 days, depending on the client). RO: "Oferte, proiecte, liste de puncte, facturi de energie, documentația sistemului existent." EN: "Offers, designs, points lists, energy bills, the existing system's documentation."
- **3. Vizita pe clădire, unde este cazul / 3. The building visit, where applicable** (1 zi / 1 day). RO: "Verificarea sistemului existent, a instalațiilor și a tablourilor." EN: "Checking the existing system, the installations and the panels."
- **4. Analiza și redactarea / 4. Analysis and writing** (3-7 zile lucrătoare / 3-7 working days). RO: "Compararea, verificarea față de repere de piață și de praguri legale, redactarea raportului." EN: "The comparison, checking against market references and legal thresholds, writing the report."
- **5. Prezentarea raportului / 5. Presenting the report** (1 zi / 1 day). RO: "Discuție de o oră, cu întrebări și cu ajustarea recomandărilor." EN: "A one-hour discussion, with questions and adjustment of the recommendations."

Note (line 302): "Durations are indicative. The pricing mode, per working day or per package, is set when the scope is defined."

**Ce cere consultanța din partea beneficiarului** / What consultancy requires from the client

1. The offers received, complete, including the technical annexes. An offer compared on its summary cannot be compared.
2. The services design and the controls design, if they exist.
3. The points list, in whatever form it exists.
4. The building data: area, occupancy pattern, installation types, the effective rated output of the heating and air conditioning systems, needed to check the legal threshold.
5. The last 12-24 months of energy bills, if the scope includes a savings estimate.
6. Mutual confidentiality, under a written agreement, because the analysis touches third parties' commercial offers.

English as on the site. The Romanian is at `app/servicii/consultanta/page.tsx`, line 73 onwards.

**Cum se măsoară că o lucrare de consultanță a ieșit bine** / How you measure that a consultancy engagement turned out well

1. The report answers the scoped question on the first page, not in the conclusions.
2. Every cost statement has its band declared and the building type it applies to.
3. Every savings statement has its domain declared in the same sentence: of the building's total consumption, or of HVAC consumption.
4. Every legal statement has its article of law and its status: in force in Romanian law, or an untransposed EU obligation.
5. The recommendations are actionable by the client without Sovitech Control. A report that only its author can put into practice is a sales tool, not consultancy.
6. The client can use the report in discussions with the other bidders, without restrictions.

English as on the site. The Romanian is at `app/servicii/consultanta/page.tsx`, line 82 onwards.

**Ce nu include consultanța** / What consultancy does not include

| # | RO | EN |
|---|----|----|
| 1 | Nu include proiectarea. Un raport de arhitectură nu ține loc de proiect tehnic și nu se poate executa direct. | It does not include design. An architecture report does not stand in for a technical design and cannot be executed directly. |
| 2 | Nu include verificarea tehnică a proiectului de către verificator atestat. | It does not include technical verification of the design by a certified verifier. |
| 3 | Nu include auditul energetic autorizat în sensul Legii 121/2014, care se execută de un auditor atestat. | It does not include an authorised energy audit within the meaning of Law 121/2014, which is carried out by a certified auditor. |
| 4 | Nu include expertize tehnice judiciare și nu se folosește ca probă într-un litigiu, decât cu acord scris prealabil. | It does not include judicial technical expertise and is not used as evidence in litigation, except with prior written consent. |
| 5 | Nu include evaluarea comercială a ofertanților: bonitate, situație financiară, capacitate de execuție. Analiza este tehnică și de conținut al ofertei. | It does not include commercial evaluation of the bidders: creditworthiness, financial standing, execution capacity. The analysis is technical, on the offer's content. |
| 6 | Nu include recomandarea unui ofertant anume. Raportul aliniază ofertele la aceeași sferă și arată diferențele. Decizia rămâne a beneficiarului. | It does not include recommending a specific bidder. The report aligns the offers to the same scope and shows the differences. The decision stays with the client. |

**Patru tipuri de lucrare de consultanță** / Four types of consultancy engagement

| Tip / Type | Întrebarea la care răspunde / The question it answers | Ce se predă / What is handed over | Durată orientativă / Indicative duration |
|---|---|---|---|
| Comparare de oferte / Bid comparison | Care ofertă acoperă ce și de unde vine diferența de preț? / Which offer covers what, and where does the price difference come from? | Tabel de aliniere, listă de întrebări la clarificări, semnale de alarmă / An alignment table, a list of clarification questions, warning signs | 3-5 zile / 3-5 days |
| Verificarea obligației legale / Legal obligation check | Intră clădirea sub obligația de automatizare și de la ce termen? / Does the building fall under the automation obligation, and from what deadline? | Notă de conformare, cu prag, articol de lege și statut / A compliance note, with threshold, article of law and status | 1-3 zile / 1-3 days |
| Revizuire de arhitectură / Architecture review | Este arhitectura propusă extensibilă și deschisă? / Is the proposed architecture extensible and open? | Raport de arhitectură, cu riscuri și alternative / An architecture report, with risks and alternatives | 5-10 zile / 5-10 days |
| Evaluarea unui sistem existent / Existing system assessment | Ce se poate face cu sistemul actual și ce nu? / What can be done with the current system, and what cannot? | Listă de constatări, separată în măsuri de configurare și de investiție / A list of findings, split into configuration and investment measures | 5-10 zile / 5-10 days |

**Întrebări frecvente** / Frequently asked questions

1. **Cât costă o lucrare de consultanță BMS?** / How much does a BMS consultancy engagement cost?
   EN answer: "Consultancy is priced per working day or per package, depending on the scope, and is billed independently of any subsequent works. The rate is set when the scope is defined, before the work starts."
2. **Se poate cere consultanță fără să cumpăr nimic după aceea?** / Can I ask for consultancy without buying anything afterwards?
   EN answer: "Yes, and this is the form in which the service makes sense. Consultancy is not recouped from a later job and does not tie the report to an order. A report that implicitly recommends its own author has no value for the buyer."
3. **Cum știu dacă o ofertă de BMS este prea ieftină?** / How do I know if a BMS offer is too cheap?
   EN answer: "Check four references: the cost per data point, which should fall within 90-320 EUR, the point density, 50-90 per 1,000 sqm for class A offices, the per-square-metre band applicable to the building type, and whether commissioning, licences and documentation are quoted as items with real value. An offer far below the bands has cut the scope, not the price."
4. **Sovitech Control poate compara și o ofertă primită de la un concurent direct?** / Can Sovitech Control also compare an offer received from a direct competitor?
   EN answer: "Yes, and the analysis is done on the offers' technical content, with the scope aligned and the criteria declared. The report does not recommend a bidder; it shows what each covers and what questions remain open. The client can use the report in discussions with all bidders."
5. **Clădirea mea intră sub obligația de automatizare?** / Does my building fall under the automation obligation?
   EN answer: "The threshold in force in Romanian law is 290 kW effective rated output of the heating, air conditioning and ventilation systems, with a 31.12.2024 deadline, per Law 372/2005 art. 27 para. (5) and art. 29 para. (6). The deadline has already passed. Directive 2024/1275 art. 13 para. (9) letter b) lowers the threshold to 70 kW with a 31.12.2029 deadline, but it has not yet been transposed into Romanian law."

Answers are given in the site's English. The Romanian answers are at `app/servicii/consultanta/page.tsx`, line 113 onwards.

**Raport scris, în 1-10 zile lucrătoare** / A written report, in 1-10 working days

Note (line 409): "Sovitech Control compares offers received from other suppliers, checks the legal obligation and reviews the proposed architecture, without selling any equipment as part of the engagement. The first step is a 30-minute discussion about the report's scope."

Useful resources: "Caiet de sarcini pentru un sistem BMS: ghid complet" / "Technical specification for a BMS: the complete guide" → `/ghid/caiet-de-sarcini-bms`; "Cere modelul de caiet de sarcini BMS" / "Request the BMS specification template" → `/contact`; "Obligația BACS: ce spune Legea 372/2005" / "The BACS obligation: what Law 372/2005 says" → `/resurse/obligatie-bacs-legea-372-2005`; "Cât costă un sistem BMS în România" / "How much a BMS costs in Romania" → `/resurse/cost-sistem-bms`.

Related services: "Proiectare automatizări și BMS" / "BMS and automation design" → `/servicii/proiectare-automatizari-bms`; "Modernizare sisteme de automatizare și BMS" / "Automation and BMS modernisation" → `/servicii/modernizare-sisteme-de-automatizare-si-bms`; "Întreținere sisteme BMS" / "BMS maintenance" → `/servicii/intretinere-sisteme-bms`.

Button: "Cere o evaluare a clădirii" / "Request a building assessment" (→ `/contact`)


### 10.5 Proiectare automatizări și BMS / BMS and automation design

Source: `app/servicii/proiectare-automatizari-bms/page.tsx` (route `/servicii/proiectare-automatizari-bms`), rendered through `components/service-hero.tsx`. The main URL `/servicii/proiectare` redirects here (`next.config.mjs`).

Page metadata (`app/servicii/proiectare-automatizari-bms/layout.tsx`, written without diacritics): title "Proiectare BMS: lista de puncte, caiet de sarcini | Sovitech Control"; description "Proiectare de automatizari si BMS: schema functionala, lista de puncte, caiet de sarcini, scheme de tablou si specificatie de echipamente. 3-8 saptamani."

**H1.** RO: "Proiectare automatizări și BMS: listă de puncte, caiet de sarcini, scheme de tablou" EN: "BMS and automation design: points list, technical specification, panel diagrams"

**Lead.**
- RO: "Proiectarea unui sistem BMS produce documentele după care sistemul poate fi ofertat, executat și verificat de oricine: schema funcțională pe fiecare instalație, lista de puncte, caietul de sarcini, schemele de tablou și specificația de echipamente. Un proiect scris pe protocoale deschise poate fi executat și de alt furnizor. Pentru o clădire de birouri de circa 10.000 mp, proiectarea durează 3-8 săptămâni."
- EN: "BMS design produces the documents by which the system can be bid, executed and verified by anyone: the functional diagram for each installation, the points list, the technical specification, the panel diagrams and the equipment specification. A design written on open protocols can be executed by another supplier as well. For an office building of around 10,000 sqm, design takes 3-8 weeks."

**Sidebar.** "Durată orientativă" / "Indicative duration"; "3-8 săptămâni" / "3-8 weeks"; "pentru o clădire de birouri de circa 10.000 mp" / "for an office building of around 10,000 sqm"; "Livrabile principale" / "Main deliverables"; "Cere o ofertă pentru proiectare" / "Request a design quote".

| # | RO | EN |
|---|----|----|
| 1 | Lista de puncte, în format editabil | Points list, in editable format |
| 2 | Caiet de sarcini cu criterii de recepție | Technical specification with acceptance criteria |
| 3 | Scheme de tablou de automatizare | Automation panel diagrams |
| 4 | Specificație de echipamente echivalabilă | Equivalence-ready equipment specification |
| 5 | Estimare de cost pe capitole | Cost estimate by chapter |

**Pe scurt** / In short

1. The central deliverable is the points list. It determines the price, the scope and the acceptance criterion. An offer without a points list cannot be compared with any other.
2. The usual density for class A offices is 50-90 points per 1,000 sqm. A 15,000 sqm building thus falls within 750-1,350 physical points.
3. The cost per data point is 90-320 EUR, depending on volume, and it includes cabling, the field device, the panel position, programming and commissioning.
4. The design is written on open protocols, BACnet, Modbus, KNX, DALI and M-Bus, precisely so the client is not tied to a single contractor.
5. Three architecture decisions cannot be corrected cheaply after execution: the bus protocol, the controller split and the points reserve.
6. Design can be contracted separately from execution. Sovitech Control delivers designs that other contractors execute.

English as on the site. The Romanian is at `app/servicii/proiectare-automatizari-bms/page.tsx`, line 89 onwards.

**Ce livrează concret proiectarea unui sistem BMS** / What BMS design concretely delivers

Note (line 182): "Named deliverables, each handed over as a file and as a signed printed copy."

| # | RO | EN |
|---|----|----|
| 1 | Tema de proiectare, convenită cu beneficiarul: ce se reglează, ce se monitorizează, ce se contorizează, ce se raportează și cine operează sistemul. | The design brief, agreed with the client: what is controlled, what is monitored, what is metered, what is reported and who operates the system. |
| 2 | Schema funcțională pe fiecare instalație: centrale de tratare a aerului, centrală termică, centrală frigorifică, pompe, ventiloconvectoare, iluminat, contorizare, punct termic. | The functional diagram for each installation: air handling units, heating plant, chiller plant, pumps, fan coil units, lighting, metering, thermal substation. |
| 3 | Lista de puncte, în format editabil, cu adresa, tipul de semnal (AI, AO, DI, DO și puncte de comunicație), echipamentul deservit, tipul de element de câmp și eticheta din interfața grafică. | The points list, in editable format, with the address, signal type (AI, AO, DI, DO and communication points), the equipment served, the field device type and the label in the graphical interface. |
| 4 | Descrierea secvențelor de funcționare, în text, pe fiecare instalație: pornire, oprire, regim de ocupare, regim redus, regim de avarie, interblocaje, priorități. | The description of the operating sequences, in text, for each installation: start, stop, occupied mode, reduced mode, failure mode, interlocks, priorities. |
| 5 | Schemele de tablou de automatizare: alimentare, circuite, dispunerea aparatajului, borne, etichetare. | The automation panel diagrams: power supply, circuits, apparatus layout, terminals, labelling. |
| 6 | Specificația de echipamente, cu funcție și caracteristici, nu cu un singur cod de produs. Specificația permite echivalare, ca proiectul să rămână ofertabil competitiv. | The equipment specification, by function and characteristics, not by a single product code. The specification allows equivalence, so the design remains competitively biddable. |
| 7 | Caietul de sarcini, cu cerințele de execuție, de programare, de punere în funcțiune, de documentație și de instruire, plus criteriile de recepție. | The technical specification, with requirements for execution, programming, commissioning, documentation and training, plus the acceptance criteria. |
| 8 | Lista de alarme propusă, pe trei niveluri de severitate, cu destinatar pe fiecare nivel. | The proposed alarm list, on three severity levels, with a recipient for each level. |
| 9 | Estimarea de cost pe capitole, cu banda de piață aplicabilă tipului de clădire. | The cost estimate by chapter, with the market band applicable to the building type. |

**Cum decurge proiectarea, pe etape** / How design proceeds, stage by stage

Note (line 203): "Durations are indicative, for an office building of around 10,000 sqm."

- **1. Tema de proiectare / 1. Design brief** (3-5 zile / 3-5 days). RO: "Discuție cu beneficiarul și cu proiectantul de instalații. Se stabilesc instalațiile incluse, regimul de ocupare, cerințele de raportare și cine va opera sistemul." EN: "Discussion with the client and the mechanical services designer. The included installations, occupancy pattern, reporting requirements and who will operate the system are established."
- **2. Preluarea proiectelor de instalații / 2. Taking over the services designs** (3-5 zile / 3-5 days). RO: "Se preiau planurile de HVAC, electrice și sanitare, listele de echipamente și fișele tehnice. Se identifică ce echipamente vin cu automatizare proprie." EN: "The HVAC, electrical and plumbing plans, equipment lists and datasheets are taken over. Equipment that comes with its own controls is identified."
- **3. Schema funcțională și secvențele / 3. Functional diagram and sequences** (1-2 săptămâni / 1-2 weeks). RO: "Se desenează fiecare instalație și se scriu secvențele de funcționare, inclusiv regimurile de avarie și interblocajele." EN: "Each installation is drawn and the operating sequences are written, including failure modes and interlocks."
- **4. Lista de puncte și arhitectura / 4. Points list and architecture** (1-2 săptămâni / 1-2 weeks). RO: "Se stabilesc punctele, împărțirea pe controlere, magistralele, protocoalele și rezerva de puncte." EN: "The points, controller split, buses, protocols and points reserve are established."
- **5. Tablouri și specificație / 5. Panels and specification** (1 săptămână / 1 week). RO: "Scheme de tablou, aparataj, specificația de echipamente de câmp." EN: "Panel diagrams, apparatus, field equipment specification."
- **6. Caiet de sarcini și estimare / 6. Specification and estimate** (3-5 zile / 3-5 days). RO: "Cerințe de execuție, criterii de recepție, estimare de cost pe capitole." EN: "Execution requirements, acceptance criteria, cost estimate by chapter."
- **7. Predare și revizie / 7. Handover and revision** (1 săptămână / 1 week). RO: "Predarea documentației, o rundă de observații din partea beneficiarului și revizia finală." EN: "Handover of the documentation, one round of client comments and the final revision."

**Ce cere proiectarea din partea beneficiarului** / What design requires from the client

Note (line 234): "Without the documents below, design starts with assumptions, and assumptions become missing points at execution."

1. The services designs, at least at technical design stage: HVAC, electrical, plumbing, with plans and equipment lists.
2. The datasheets of the equipment already selected, especially chillers, air handling units, boilers and heat pumps, because each comes with its own controls and its own protocol.
3. The real occupancy pattern: operating schedule by zone, weekends, peak periods, separately leased spaces.
4. The reporting requirements: what is reported, to whom, at what interval, whether there is an energy or indoor environment reporting obligation.
5. Who will operate the system: in-house team, facility management firm or a service contract. The choice changes the complexity of the graphical interface and of the alarm matrix.
6. A designated technical counterpart, with decision-making authority on design questions.

English as on the site. The Romanian is at `app/servicii/proiectare-automatizari-bms/page.tsx`, line 45 onwards.

**Cum se măsoară că proiectarea a ieșit bine** / How you measure that design turned out well

Note (line 255): "The documentation acceptance criteria, verifiable by a third party."

1. Every point in the points list has an equipment item, a signal type and a label. There are no points without a destination and no equipment without points.
2. Every installation has a written sequence describing operation in normal mode, reduced mode and failure mode.
3. The specification allows equivalence. Every item is described by function and characteristics, not just by a unique product code.
4. The points reserve is declared for each controller and each panel, as a percentage and as an absolute number.
5. The technical specification contains the execution acceptance criteria, the functional test protocol and the list of documents to be handed over.
6. The design can be bid by at least three contractors without additions. It is the practical test of the quality of a controls design.

English as on the site. The Romanian is at `app/servicii/proiectare-automatizari-bms/page.tsx`, line 54 onwards.

**Ce nu include proiectarea** / What design does not include

| # | RO | EN |
|---|----|----|
| 1 | Nu include proiectul de instalații. Automatizarea se proiectează peste instalațiile proiectate de specialiștii de HVAC, electrice și sanitare. | It does not include the mechanical services design. The controls are designed on top of the installations designed by the HVAC, electrical and plumbing specialists. |
| 2 | Nu include verificarea tehnică a proiectului de către verificator atestat și nici avizele. Se pune la dispoziția verificatorului toată documentația. | It does not include technical verification of the design by a certified verifier, nor the permits. All documentation is made available to the verifier. |
| 3 | Nu include proiectul de detecție și semnalizare a incendiului și nici scenariul de securitate la incendiu. | It does not include the fire detection and alarm design, nor the fire safety scenario. |
| 4 | Nu include execuția, programarea și punerea în funcțiune. Acestea sunt obiectul serviciului de execuție sisteme BMS. | It does not include execution, programming and commissioning. These are the subject of the BMS execution service. |
| 5 | Nu include asistența tehnică pe durata șantierului, decât dacă este contractată separat. Asistența pe șantier se ofertează pe vizite sau pe ore. | It does not include technical assistance during construction, unless contracted separately. Site assistance is quoted per visit or per hour. |
| 6 | Nu include modificările de proiect generate de schimbarea echipamentelor de instalații după predare. Se tratează ca revizie, contra cost. | It does not include design changes generated by a change of mechanical equipment after handover. These are treated as a paid revision. |

Note (line 285): "Execution, programming and commissioning are the subject of the BMS execution service"

**Cine face ce, între proiectant, executant și beneficiar** / Who does what, between designer, contractor and client

| Element | Proiectant automatizări / Controls designer | Executant BMS / BMS contractor | Beneficiar / Client |
|---|---|---|---|
| Lista de puncte / Points list | întocmește / produces | verifică pe teren și actualizează în As-built / verifies on site and updates in the As-built | aprobă / approves |
| Secvențele de funcționare / Operating sequences | scrie / writes | implementează în programe / implements in the programs | validează la punerea în funcțiune / validates at commissioning |
| Alegerea echipamentelor de câmp / Field equipment selection | specifică prin funcție / specifies by function | propune echivalențe / proposes equivalents | acceptă echivalențele / accepts the equivalents |
| Schemele de tablou / Panel diagrams | întocmește / produces | execută și actualizează As-built / executes and updates the As-built | - |
| Protocolul de testare funcțională / Functional test protocol | definește în caietul de sarcini / defines in the specification | execută și consemnează / executes and records | asistă și semnează / attends and signs |
| Documentația As-built / As-built documentation | - | predă / hands over | verifică față de caietul de sarcini / checks against the specification |
| Parole de nivel inginer / Engineer-level passwords | - | predă la recepție / hands over at acceptance | deține / owns |

**Întrebări frecvente** / Frequently asked questions

1. **Cât costă proiectarea unui sistem BMS?** / How much does BMS design cost?
   EN answer: "Design is quoted per area or per estimated number of points, depending on the complexity of the installations and the design stage requested. The useful budget reference is the cost of the complete system, 4-18 EUR/sqm depending on the building type, of which design is a fraction."
2. **Câte puncte are un sistem BMS pentru o clădire de birouri?** / How many points does a BMS have in an office building?
   EN answer: "The usual density for class A offices is 50-90 points per 1,000 sqm, so a 15,000 sqm building falls within 750-1,350 physical points. Density grows with the number of separately controlled zones and with the level of tenant metering."
3. **Proiectul poate fi executat și de altă firmă?** / Can the design be executed by another company?
   EN answer: "Yes, and this is the criterion by which a good design is checked. Sovitech Control designs are written on open protocols, with specification by function and characteristics, so they can be bid competitively by several contractors. A design that can be executed by only one supplier is a design written wrong."
4. **Ce se întâmplă dacă echipamentele de HVAC se schimbă după predarea proiectului?** / What happens if the HVAC equipment changes after design handover?
   EN answer: "Changing a chiller, an air handling unit or a heat pump changes the protocol, the number of points and sometimes the architecture. The change is treated as a design revision, quoted separately, and must be done before the panel is ordered, not after."

Answers are given in the site's English. The Romanian answers are at `app/servicii/proiectare-automatizari-bms/page.tsx`, line 82 onwards.

**Proiect tehnic de automatizare, cu listă de puncte și caiet de sarcini** / A technical controls design, with points list and specification

Note (line 336): "Sovitech Control produces the controls documentation for new buildings and major renovations, including for projects executed by other contractors. The first step is a discussion about the planned installations and about who will operate the building."

Useful resources: "Caiet de sarcini pentru un sistem BMS, ghid complet" / "Technical specification for a BMS, complete guide" → `/ghid/caiet-de-sarcini-bms`; "Cere modelul de caiet de sarcini BMS" / "Request the BMS specification template" → `/contact`; "Materiale despre protocoale și integrare BMS-SCADA" / "Materials on protocols and BMS-SCADA integration" → `/resurse/bms-scada-integrare`; "Pentru directorul tehnic" / "For the technical director" → `/pentru/director-tehnic`.

Related services: "Execuție sisteme BMS" / "BMS execution" → `/servicii/executie-sisteme-bms`; "Integrare KNX, DALI, Modbus, M-Bus" / "KNX, DALI, Modbus, M-Bus integration" → `/servicii/integrare-sisteme-knx-dali-modbus-mbus`; "Consultanță" / "Consultancy" → `/servicii/consultanta`.

Button: "Cere o ofertă pentru proiectare" / "Request a design quote" (→ `/contact`)


### 10.6 Execuție sisteme BMS / BMS execution

Source: `app/servicii/executie-sisteme-bms/page.tsx` (route `/servicii/executie-sisteme-bms`), rendered through `components/service-hero.tsx`. The main URL `/servicii/executie` redirects here (`next.config.mjs`).

Page metadata (`app/servicii/executie-sisteme-bms/layout.tsx`, written without diacritics): title "Executie sisteme BMS: tablou, cablare, punere in functiune | Sovitech"; description "Executie completa de sisteme BMS: tablou de forta si automatizare, cablare, programe de control, interfata HMI, punere in functiune si documentatie As-built."

**H1.** RO: "Execuție sisteme BMS: tablou, cablare, programe, HMI, punere în funcțiune, As-built" EN: "BMS execution: panel, cabling, programs, HMI, commissioning, As-built"

**Lead.**
- RO: "Execuția unui sistem BMS acoperă șapte livrabile: sistemul de automatizare, tabloul electric de forță și automatizare, cablarea și instalarea echipamentelor, programele de control și monitorizare, interfața grafică HMI, punerea în funcțiune și documentarea As-built. Pentru o clădire de birouri de circa 10.000 mp, execuția durează 8-20 de săptămâni, în funcție de ritmul șantierului și de termenele de livrare."
- EN: "BMS execution covers seven deliverables: the automation system, the power and automation electrical panel, cabling and equipment installation, the control and monitoring programs, the HMI graphical interface, commissioning and As-built documentation. For an office building of around 10,000 sqm, execution takes 8-20 weeks, depending on site pace and delivery lead times."

**Sidebar.** "Durată orientativă" / "Indicative duration"; "8-20 săptămâni" / "8-20 weeks"; "pentru o clădire de birouri de circa 10.000 mp, cu 750-1.350 de puncte" / "for an office building of around 10,000 sqm, with 750-1,350 points"; "Livrabile principale" / "Main deliverables"; "Cere o ofertă pentru sistemul BMS" / "Request a BMS quote".

| # | RO | EN |
|---|----|----|
| 1 | Tablou de forță și automatizare | Power and automation panel |
| 2 | Cablare și echipamente de câmp | Cabling and field equipment |
| 3 | Programe de control și HMI | Control programs and HMI |
| 4 | Punere în funcțiune cu protocol de testare | Commissioning with a test protocol |
| 5 | Documentație As-built și parole predate | As-built documentation and passwords handed over |

**Pe scurt** / In short

1. Seven named deliverables, from the panel to the As-built. Each has a written acceptance criterion, not a general description.
2. The difference between "connected" and "commissioned" is the functional test protocol, executed point by point and loop by loop, with a signed report.
3. The cost per data point is 90-320 EUR, depending on volume, and includes cabling, the field device, the panel position, programming and commissioning.
4. A new BMS costs 4-18 EUR/sqm as an aggregate band for retail, offices and hotels without room control, with 30-80 EUR/sqm in pharma and 18-38 EUR/sqm for hotels with room control.
5. Engineer-level passwords, configuration backups and controller programs are handed over at acceptance, as deliverables, not as a favour.
6. Execution can be done on a design produced by someone else. The points list and sequences are checked before quoting.

English as on the site. The Romanian is at `app/servicii/executie-sisteme-bms/page.tsx`, line 21 onwards.

**Ce livrează concret execuția unui sistem BMS** / What BMS execution concretely delivers

Note (line 186): "The seven execution deliverables, as they appear in the contract and in the acceptance report."

| # | RO | EN |
|---|----|----|
| 1 | Sistemul de automatizare: controlere, module de extensie, surse, echipamente de rețea și magistrale, dimensionate pe lista de puncte, cu rezerva declarată pe fiecare controler. | The automation system: controllers, extension modules, power supplies, network equipment and buses, sized on the points list, with the reserve declared for each controller. |
| 2 | Tabloul electric de forță și automatizare: dulap, alimentare, protecții, aparataj de comandă și forță pentru consumatorii deserviți, borne, etichetare, scheme în buzunarul tabloului. | The power and automation electrical panel: cabinet, power supply, protections, control and power apparatus for the loads served, terminals, labelling, diagrams in the panel pocket. |
| 3 | Cablarea și instalarea echipamentelor: trasee, cablu de semnal și de magistrală, senzori de temperatură, umiditate și CO2, traductoare de presiune, servomotoare pe vane și clapete, contoare, montaj și conectare. | Cabling and equipment installation: routes, signal and bus cable, temperature, humidity and CO2 sensors, pressure transducers, actuators on valves and dampers, meters, mounting and connection. |
| 4 | Programele de control și monitorizare: secvențele de funcționare implementate în controlere, bucle de reglaj parametrizate, programe orare, regimuri de ocupare și de avarie, interblocaje, matrice de alarme pe trei niveluri, trend-loguri configurate. | The control and monitoring programs: operating sequences implemented in the controllers, tuned control loops, time schedules, occupancy and failure modes, interlocks, a three-level alarm matrix, configured trend logs. |
| 5 | Interfața grafică HMI: sinoptice pe fiecare instalație, cu valorile reale ale punctelor, ecran de alarme, ecran de programe orare, ecran de tendințe și rapoarte de consum, plus drepturile de acces pe nivel de utilizator. | The HMI graphical interface: synoptics for each installation, with the real point values, an alarm screen, a schedule screen, a trends screen and consumption reports, plus access rights per user level. |
| 6 | Punerea în funcțiune: verificarea punct cu punct, calibrarea senzorilor, reglajul buclelor, testarea funcțională pe fiecare secvență, testarea regimurilor de avarie, instruirea echipei de operare. | Commissioning: point-by-point verification, sensor calibration, loop tuning, functional testing of each sequence, failure mode testing, training of the operating team. |
| 7 | Documentarea As-built: scheme funcționale actualizate, scheme de tablou actualizate, lista de puncte finală, manuale de operare, backup de configurație, procesul-verbal de punere în funcțiune. | As-built documentation: updated functional diagrams, updated panel diagrams, the final points list, operating manuals, the configuration backup, the commissioning report. |

**Cum decurge execuția, pe etape** / How execution proceeds, stage by stage

Note (line 205): "Durations are indicative, for an office building of around 10,000 sqm, with 750-1,350 points."

- **1. Proiect de execuție și liste de comandă / 1. Execution design and order lists** (2-3 săptămâni / 2-3 weeks). RO: "Verificarea listei de puncte pe teren, actualizarea schemelor, lansarea comenzilor de echipamente." EN: "On-site verification of the points list, updating the diagrams, placing the equipment orders."
- **2. Livrarea echipamentelor / 2. Equipment delivery** (4-10 săptămâni / 4-10 weeks). RO: "Termen de livrare pentru controlere, aparataj de tablou și echipamente de câmp. Este etapa cu cea mai mare variație." EN: "Delivery lead time for controllers, panel apparatus and field equipment. It is the stage with the greatest variation."
- **3. Confecția tabloului / 3. Panel assembly** (2-4 săptămâni, în paralel cu etapa 2 / 2-4 weeks, in parallel with stage 2). RO: "Asamblare, cablare internă, testare la rece, etichetare, verificare pe schema aprobată." EN: "Assembly, internal wiring, cold testing, labelling, verification against the approved diagram."
- **4. Cablare pe clădire / 4. Building cabling** (3-8 săptămâni / 3-8 weeks). RO: "Trasee, cablu de semnal și magistrală, montaj senzori și servomotoare, conectare la tablou. Depinde de accesul pe șantier." EN: "Routes, signal and bus cable, mounting of sensors and actuators, connection to the panel. Depends on site access."
- **5. Montaj tablou și punere sub tensiune / 5. Panel installation and energisation** (3-5 zile / 3-5 days). RO: "Amplasare, racordare, verificarea alimentării, verificarea protecțiilor." EN: "Placement, connection, power supply check, protection check."
- **6. Programare și interfață grafică / 6. Programming and graphical interface** (2-4 săptămâni, parțial în paralel / 2-4 weeks, partly in parallel). RO: "Implementarea secvențelor, parametrizarea buclelor, construcția sinopticelor, configurarea alarmelor și a trend-logurilor." EN: "Implementing the sequences, tuning the loops, building the synoptics, configuring alarms and trend logs."
- **7. Verificare punct cu punct / 7. Point-by-point verification** (1-2 săptămâni / 1-2 weeks). RO: "Fiecare punct se verifică fizic: semnalul ajunge, valoarea este corectă, comanda acționează elementul corect." EN: "Every point is physically checked: the signal arrives, the value is correct, the command actuates the correct element."
- **8. Testare funcțională și regimuri de avarie / 8. Functional testing and failure modes** (1-2 săptămâni / 1-2 weeks). RO: "Fiecare secvență se testează în condiții reale, inclusiv căderea de alimentare, defectul de senzor și interblocajele." EN: "Every sequence is tested in real conditions, including power loss, sensor failure and the interlocks."
- **9. Instruire și recepție / 9. Training and acceptance** (3-5 zile / 3-5 days). RO: "Instruirea echipei de operare, predarea documentației, proces-verbal de punere în funcțiune, recepția la terminarea lucrărilor." EN: "Training of the operating team, handover of the documentation, commissioning report, acceptance at completion of the works."

Note (line 226): "Stages 2, 3 and 4 largely overlap. The total duration is dictated by delivery lead times and site access, not by the programming volume."

**Ce cere execuția din partea beneficiarului** / What execution requires from the client

1. The controls design or, in its absence, the mandate to produce it as an execution phase.
2. Site access by zone, with an agreed schedule. Cabling cannot be done after the false ceilings are closed and the finishes are in.
3. The mechanical installations mounted and tested, with the heating and cooling medium available for tuning. A BMS cannot be commissioned on an installation that does not run.
4. The electrical supply to the panel, executed by the electrical contractor, with power and protection per the diagram.
5. The datasheets and protocols of equipment with its own controls: chillers, air handling units, heat pumps, boilers, pump groups, lifts, meters.
6. A designated technical counterpart and the team that will operate the building, available for training.
7. Network and IP addresses for the supervision station and for the controllers communicating over Ethernet, per the client's IT policy.

English as on the site. The Romanian is at `app/servicii/executie-sisteme-bms/page.tsx`, line 52 onwards.

**Cum se măsoară că execuția a ieșit bine** / How you measure that execution turned out well

Note (line 257): "The acceptance criteria. They are written into the contract and checked point by point, not by general impression."

1. Every point in the points list is physically verified and recorded. The check confirms the signal arrives, the displayed value matches the reference measurement and every command actuates the correct element.
2. Every operating sequence is tested in real conditions, with the result recorded in the functional test protocol: occupied mode, reduced mode, start, stop, failure.
3. The control loops are stable. A loop that oscillates at acceptance will still oscillate a year later. Stability is checked on the trend log, not on the real-time screen.
4. The failure modes work: power loss and recovery, sensor failure, bus communication failure, protective interlocks.
5. Alarms are prioritised on three levels, each with a recipient, and at acceptance there are no unjustified active alarms.
6. Trend logs are configured and recording. The resolution is 15 minutes for electricity and 5-15 minutes for indoor environment parameters, and full-resolution retention is at least 24 months. Below 24 months there is no year-on-year comparison.
7. The As-built documentation is complete and matches reality on site. It is spot-checked: 10 points are picked from the documentation and physically located in the building.
8. The engineer-level passwords, the configuration backup and the controller programs are handed over to the client, on the client's own media, with the restore procedure.
9. Training took place and there is a signed attendance list.

English as on the site. The Romanian is at `app/servicii/executie-sisteme-bms/page.tsx`, line 62 onwards.

**Ce nu include execuția** / What execution does not include

| # | RO | EN |
|---|----|----|
| 1 | Nu include instalațiile de HVAC, sanitare și electrice de putere. Sistemul BMS comandă și monitorizează instalații executate de antreprenorii de specialitate. | It does not include the HVAC, plumbing and power electrical installations. The BMS commands and monitors installations executed by the specialist contractors. |
| 2 | Nu include alimentarea electrică până la tabloul de automatizare și nici tabloul general al clădirii. | It does not include the electrical supply up to the automation panel, nor the building's main distribution board. |
| 3 | Nu include automatizarea proprie a echipamentelor livrate cu control integrat. Chillerul, centrala de tratare a aerului și pompa de căldură rămân cu logica producătorului. Sistemul BMS o supraveghează și îi dă comenzi, prin protocol sau prin contacte. | It does not include the built-in controls of equipment delivered with integrated control. The chiller, the air handling unit and the heat pump keep the manufacturer's logic. The BMS supervises it and sends it commands, over protocol or contacts. |
| 4 | Nu include detecția și semnalizarea incendiului, controlul accesului și supravegherea video. Semnalele acestor sisteme pot fi preluate în BMS ca informație, dacă sunt disponibile pe protocol sau pe contacte. | It does not include fire detection and alarm, access control and video surveillance. These systems' signals can be taken into the BMS as information, if available over protocol or contacts. |
| 5 | Nu include tavane false, gips-carton, refaceri de finisaje și lucrări de construcții pentru trasee. | It does not include false ceilings, drywall, finish repairs and construction works for routes. |
| 6 | Nu include licențele de sistem de operare și hardware-ul de server al beneficiarului, dacă supervizarea rulează pe infrastructura acestuia. | It does not include the client's operating system licences and server hardware, if supervision runs on the client's infrastructure. |
| 7 | Nu include modificările cerute după recepție, care se tratează ca lucrări suplimentare sau prin contractul de întreținere. | It does not include changes requested after acceptance, which are treated as additional works or through the maintenance contract. |

Note (line 287): "Post-acceptance changes are handled through the maintenance contract"

**Ce înseamnă „conectat" și ce înseamnă „pus în funcțiune"** / What "connected" means and what "commissioned" means

Note (line 295): "This distinction is where two offers with different prices become comparable."

| Element | Conectat / Connected | Pus în funcțiune / Commissioned |
|---|---|---|
| Punctele / The points | cablate și vizibile în sistem / cabled and visible in the system | verificate fizic unul câte unul, cu valoare confirmată față de o măsurătoare de referință / physically verified one by one, with the value confirmed against a reference measurement |
| Senzorii / The sensors | montați / mounted | verificați și, unde este cazul, calibrați / verified and, where needed, calibrated |
| Buclele de reglaj / The control loops | active cu parametri impliciți / active with default parameters | parametrizate pe clădirea reală și verificate pe trend-log / tuned on the real building and verified on the trend log |
| Secvențele / The sequences | programate / programmed | testate în regim normal, redus și de avarie, cu proces-verbal / tested in normal, reduced and failure modes, with a signed report |
| Alarmele / The alarms | generate / generated | prioritizate pe trei niveluri, cu destinatar, fără alarme active nejustificate / prioritised on three levels, with recipients, with no unjustified active alarms |
| Trend-logurile / The trend logs | eventual active / possibly active | configurate pe rezoluție și retenție declarate / configured to a declared resolution and retention |
| Documentația / The documentation | schemele de proiect / the design diagrams | As-built, verificat prin sondaj în teren / As-built, spot-checked on site |
| Echipa clădirii / The building team | - | instruită, cu listă de participanți / trained, with an attendance list |

**Întrebări frecvente** / Frequently asked questions

1. **Cât costă execuția unui sistem BMS?** / How much does BMS execution cost?
   EN answer: "A new BMS costs 4-18 EUR/sqm as an aggregate band for retail, offices and hotels without room control. By type: 9-18 EUR/sqm for class A offices, 5-10 EUR/sqm for class B offices, 4-9 EUR/sqm in retail, 3-8 EUR/sqm industrial, 30-80 EUR/sqm in pharma. Per data point, the band is 90-320 EUR."
2. **Cât durează execuția unui sistem BMS?** / How long does BMS execution take?
   EN answer: "For an office building of around 10,000 sqm, execution takes 8-20 weeks. The stage with the greatest variation is equipment delivery, and the factor dictating the final deadline is site access for cabling, before the ceilings are closed."
3. **Ce se predă la recepția unui sistem BMS?** / What is handed over at BMS acceptance?
   EN answer: "The As-built documentation with functional and panel diagrams, the final points list in editable format, the controller programs, the configuration backup of the controllers and the supervision station, the operating manuals, the commissioning report with the test protocol and the engineer-level passwords."
4. **Se poate executa un sistem BMS pe un proiect făcut de altă firmă?** / Can a BMS be executed on another company's design?
   EN answer: "Yes. Before quoting, the points list, the operating sequences and the compatibility of equipment with its own controls are checked. If the design has gaps, they are flagged in the offer as observations, not silently covered with assumptions that later resurface as additional works."
5. **Se poate executa un BMS într-o clădire în funcțiune?** / Can a BMS be executed in an occupied building?
   EN answer: "Yes, through phasing by zone and negotiated work windows. The installations are stopped one at a time, not simultaneously, and the old and new systems coexist during the transition. The method is described on the modernisation page."

Answers are given in the site's English. The Romanian answers are at `app/servicii/executie-sisteme-bms/page.tsx`, line 95 onwards.

**Ofertă de execuție, pe lista de puncte** / An execution offer, built on the points list

Note (line 337): "A serious execution offer is built on the points list and the operating sequences, not on floor area. Sovitech Control quotes on the existing design and flags in the offer what is missing from it."

Useful resources: "Cât costă un sistem BMS în România" / "How much a BMS costs in Romania" → `/resurse/cost-sistem-bms`; "Echipamentele SAUTER integrate" / "The SAUTER equipment we integrate" → `/produse`; "Cele 25 de proiecte de referință" / "The 25 reference projects" → `/referinte`.

Related services: "Proiectare automatizări și BMS" / "BMS and automation design" → `/servicii/proiectare-automatizari-bms`; "Întreținere sisteme BMS" / "BMS maintenance" → `/servicii/intretinere-sisteme-bms`; "Modernizare sisteme de automatizare și BMS" / "Automation and BMS modernisation" → `/servicii/modernizare-sisteme-de-automatizare-si-bms`.

Button: "Cere o ofertă pentru sistemul BMS" / "Request a BMS quote" (→ `/contact`)


### 10.7 Integrare KNX, DALI, Modbus și M-Bus / KNX, DALI, Modbus and M-Bus integration

Source: `app/servicii/integrare-sisteme-knx-dali-modbus-mbus/page.tsx` (route `/servicii/integrare-sisteme-knx-dali-modbus-mbus`), rendered through `components/service-hero.tsx`. The main URL `/servicii/integrare` redirects here (`next.config.mjs`).

Page metadata (`app/servicii/integrare-sisteme-knx-dali-modbus-mbus/layout.tsx`, written without diacritics): title "Integrare KNX, DALI, Modbus, M-Bus in BMS | Sovitech Control"; description "Integrare de echipamente in BMS prin KNX, DALI, Modbus, M-Bus si BACnet: chillere, centrale de tratare a aerului, iluminat si contoare, intr-un singur ecran."

**H1.** RO: "Integrare KNX, DALI, Modbus și M-Bus: echipamentele clădirii într-o singură supervizare" EN: "KNX, DALI, Modbus and M-Bus integration: the building's equipment under a single supervision"

**Lead.**
- RO: "Integrarea aduce echipamentele cu automatizare proprie ale clădirii, chillere, centrale de tratare a aerului, corpuri de iluminat, contoare, grupuri de pompare și generatoare, într-o singură supervizare, prin protocoalele pe care le vorbesc deja: KNX, DALI, Modbus RTU și TCP, M-Bus și BACnet. Rezultatul este un singur ecran, o singură listă de alarme și un singur set de date istorice. Durata uzuală este de 2-10 săptămâni."
- EN: "Integration brings the building's equipment with built-in controls, chillers, air handling units, luminaires, meters, pump groups and generators, into a single supervision layer, over the protocols they already speak: KNX, DALI, Modbus RTU and TCP, M-Bus and BACnet. The result is one screen, one alarm list and one set of historical data. The usual duration is 2-10 weeks."

**Sidebar.** "Durată orientativă" / "Indicative duration"; "2-10 săptămâni" / "2-10 weeks"; "pentru 10-40 de echipamente integrate" / "for 10-40 integrated devices"; "Protocoale acoperite" / "Protocols covered"; "Cere o evaluare a clădirii" / "Request a building assessment".

| # | RO | EN |
|---|----|----|
| 1 | Modbus RTU și TCP | Modbus RTU and TCP |
| 2 | BACnet MS/TP și IP | BACnet MS/TP and IP |
| 3 | KNX | KNX |
| 4 | DALI | DALI |
| 5 | M-Bus | M-Bus |

**Pe scurt** / In short

1. Every major piece of equipment comes with its own controls. Integration does not replace them: it supervises them, sends them commands and reads their values.
2. Five protocols cover almost everything in a commercial building: Modbus for plant equipment and meters, BACnet for building automation, KNX for lighting and room controls, DALI for addressable luminaires, M-Bus for heat and water meters.
3. The cost is calculated per integrated point, in the same 90-320 EUR per data point band, with the note that points taken over the bus sit at the bottom of the band, while those requiring a gateway and mapping sit at the top.
4. A gateway does not create functions that do not exist. If the equipment does not expose a value over the protocol, no integration can read it.
5. Integration is the basic condition for energy reporting, because metering data must land in a single history, on the same time base.
6. Open protocols are also a commercial instrument: they determine whether the client can change the service provider without changing the system.

English as on the site. The Romanian is at `app/servicii/integrare-sisteme-knx-dali-modbus-mbus/page.tsx`, line 24 onwards.

**Ce livrează concret o lucrare de integrare** / What an integration job concretely delivers

| # | RO | EN |
|---|----|----|
| 1 | Inventarul echipamentelor integrabile, cu protocolul, versiunea, interfața fizică disponibilă și lista de valori pe care fiecare echipament le expune efectiv. | The inventory of integrable equipment, with the protocol, version, available physical interface and the list of values each device actually exposes. |
| 2 | Tabelul de mapare, punct cu punct: registrul sau obiectul din echipament, adresa în sistemul BMS, unitatea de măsură, factorul de scalare, sensul comenzii. | The mapping table, point by point: the register or object in the equipment, the address in the BMS, the unit of measure, the scaling factor, the command direction. |
| 3 | Echipamentele de interfață, unde sunt necesare: gateway-uri de protocol, convertoare de mediu fizic, repetoare de magistrală, cu poziția lor în tablou. | The interface equipment, where needed: protocol gateways, physical media converters, bus repeaters, with their position in the panel. |
| 4 | Configurarea magistralelor: topologie, adresare, terminații, viteze de comunicație, separarea segmentelor. | Bus configuration: topology, addressing, terminations, communication speeds, segment separation. |
| 5 | Integrarea în interfața grafică: echipamentele integrate apar pe sinopticele proprii, cu valorile reale, nu ca un link către un alt program. | Integration into the graphical interface: integrated equipment appears on its own synoptics, with real values, not as a link to another program. |
| 6 | Alarme și supraveghere de comunicație: fiecare echipament integrat are alarmă de pierdere a comunicației, distinctă de alarmele lui interne. | Alarms and communication monitoring: every integrated device has a communication-loss alarm, distinct from its internal alarms. |
| 7 | Trend-loguri pe punctele integrate, cu rezoluție de 15 minute pentru energie electrică, 15 minute până la 1 oră pentru energie termică și 5-15 minute pentru parametrii de mediu interior. | Trend logs on the integrated points, at 15-minute resolution for electricity, 15 minutes to 1 hour for heat, and 5-15 minutes for indoor environment parameters. |
| 8 | Documentația de integrare: tabelul de mapare final, configurațiile gateway-urilor, backup-urile și procedura de refacere. | The integration documentation: the final mapping table, the gateway configurations, the backups and the restore procedure. |

**Cum decurge integrarea, pe etape** / How integration proceeds, stage by stage

Note (line 201): "Durations are indicative, for 10-40 integrated devices."

- **1. Inventar și fezabilitate / 1. Inventory and feasibility** (3-10 zile / 3-10 days). RO: "Se identifică fiecare echipament, protocolul, interfața fizică existentă și lista de valori expuse. Se stabilește ce se poate citi și ce se poate comanda." EN: "Each device is identified, with its protocol, existing physical interface and the list of exposed values. What can be read and what can be commanded is established."
- **2. Tabelul de mapare / 2. Mapping table** (1-2 săptămâni / 1-2 weeks). RO: "Se stabilesc punctele care se preiau, adresele, unitățile și scalările. Se decide ce se comandă din BMS și ce rămâne pe automatizarea proprie." EN: "The points to take over, the addresses, units and scalings are established. What is commanded from the BMS and what stays on the built-in controls is decided."
- **3. Comanda interfețelor / 3. Ordering the interfaces** (2-6 săptămâni / 2-6 weeks). RO: "Gateway-uri, convertoare, module de comunicație de la producătorii echipamentelor. Unele module se comandă de la producătorul echipamentului și au termen propriu." EN: "Gateways, converters, communication modules from the equipment manufacturers. Some modules are ordered from the equipment manufacturer and have their own lead time."
- **4. Montaj și configurare magistrale / 4. Installation and bus configuration** (1-3 săptămâni / 1-3 weeks). RO: "Cablare de magistrală, adresare, terminații, punerea în comunicație a fiecărui echipament." EN: "Bus cabling, addressing, terminations, bringing each device into communication."
- **5. Mapare și verificare valoare cu valoare / 5. Mapping and value-by-value verification** (1-2 săptămâni / 1-2 weeks). RO: "Fiecare punct integrat se compară cu valoarea afișată local pe echipament." EN: "Every integrated point is compared with the value displayed locally on the device."
- **6. Ecrane, alarme, trend-loguri / 6. Screens, alarms, trend logs** (1 săptămână / 1 week). RO: "Sinoptice, alarme de comunicație, istoricizare." EN: "Synoptics, communication alarms, historisation."
- **7. Testare și predare / 7. Testing and handover** (3-5 zile / 3-5 days). RO: "Testarea comenzilor, testarea comportamentului la pierderea comunicației, predarea tabelului de mapare final." EN: "Testing the commands, testing the behaviour on communication loss, handing over the final mapping table."

**Ce cere integrarea din partea beneficiarului** / What integration requires from the client

1. The equipment list, with manufacturer, model, year of commissioning and, if available, the communication manual.
2. Confirmation that the communication modules physically exist. Many devices have the protocol port as an uninstalled option, and the module is ordered from the manufacturer.
3. Access to the equipment and, where necessary, the assistance of its supplier. Some devices need manufacturer parametrisation to enable communication.
4. The network policy, for equipment communicating over Ethernet: addresses, VLANs, access rules, the position of the supervision station.
5. The scope decision: which equipment is to be only monitored and which is also to be commanded from the BMS. Commanding changes responsibility and, sometimes, the equipment warranty.
6. Work windows, for equipment that must be briefly stopped to fit the communication module.

English as on the site. The Romanian is at `app/servicii/integrare-sisteme-knx-dali-modbus-mbus/page.tsx`, line 54 onwards.

**Cum se măsoară că integrarea a ieșit bine** / How you measure that integration turned out well

1. Every integrated point is verified against the value displayed locally on the device, at the same time, with the same unit and the same scaling.
2. Commands are tested in both directions, including the device's behaviour when returning to local mode.
3. Communication loss raises a distinct alarm, and the system falls back to a defined mode, not to the last value read.
4. Every integrated device has its own synoptic, with real values in the graphical interface, not a link to the manufacturer's software.
5. The final mapping table is handed over in editable format and matches the real configuration.
6. The trend logs on the integrated points record at the declared resolution, with at least 24 months of full-resolution retention.
7. What could not be integrated, and why, is explicitly recorded. A device that does not expose a value over the protocol goes on the list, it does not get hidden.

English as on the site. The Romanian is at `app/servicii/integrare-sisteme-knx-dali-modbus-mbus/page.tsx`, line 63 onwards.

**Ce nu include integrarea** / What integration does not include

| # | RO | EN |
|---|----|----|
| 1 | Nu include înlocuirea automatizării proprii a echipamentului. Logica internă a chillerului sau a centralei de tratare a aerului rămâne a producătorului. | It does not include replacing the equipment's built-in controls. The internal logic of the chiller or the air handling unit remains the manufacturer's. |
| 2 | Nu include modulele de comunicație care se comandă de la producătorul echipamentului, dacă nu sunt prevăzute explicit în ofertă. | It does not include communication modules ordered from the equipment manufacturer, unless explicitly provided for in the offer. |
| 3 | Nu include valorile pe care echipamentul nu le expune. Dacă un chiller nu publică pe protocol temperatura de la un anumit senzor intern, acea valoare nu se poate integra fără senzor suplimentar. | It does not include values the equipment does not expose. If a chiller does not publish the temperature of a certain internal sensor over the protocol, that value cannot be integrated without an additional sensor. |
| 4 | Nu include repararea echipamentului integrat și nici service-ul lui. | It does not include repairing the integrated equipment, nor its servicing. |
| 5 | Nu include integrarea sistemelor de securitate la incendiu ca funcție de siguranță. Semnalele se pot prelua ca informație, dar scenariul de securitate la incendiu rămâne la centrala de incendiu. | It does not include integrating fire safety systems as a safety function. Signals can be taken over as information, but the fire safety scenario stays with the fire alarm panel. |
| 6 | Nu include licențele de puncte suplimentare pe platforma de supervizare, dacă numărul de puncte depășește licența existentă. Costul licențelor se declară separat în ofertă. | It does not include additional point licences on the supervision platform, if the number of points exceeds the existing licence. Licence costs are declared separately in the offer. |

**Cele cinci protocoale și ce integrează fiecare** / The five protocols and what each one integrates

| Protocol | Ce integrează uzual / What it usually integrates | Mediu fizic / Physical medium | Ce trebuie verificat înainte / What to check beforehand |
|---|---|---|---|
| Modbus RTU și TCP / Modbus RTU and TCP | chillere, centrale de tratare a aerului, pompe de căldură, variatoare de turație, analizoare de rețea electrică, grupuri de pompare / chillers, air handling units, heat pumps, variable speed drives, power network analysers, pump groups | RS-485 sau Ethernet / RS-485 or Ethernet | harta de registre a producătorului, adresarea, scalarea valorilor / the manufacturer's register map, addressing, value scaling |
| BACnet MS/TP și IP / BACnet MS/TP and IP | automatizare de clădire, controlere de la alți producători, unele chillere / building automation, controllers from other manufacturers, some chillers | RS-485 sau Ethernet / RS-485 or Ethernet | lista de obiecte expuse, instanțele, drepturile de scriere / the list of exposed objects, the instances, the write permissions |
| KNX | iluminat, jaluzele, comenzi de cameră, termostate de cameră / lighting, blinds, room controls, room thermostats | pereche torsadată KNX / KNX twisted pair | proiectul ETS existent, adresele de grup, cine deține fișierul de proiect / the existing ETS project, the group addresses, who owns the project file |
| DALI | corpuri de iluminat adresabile, senzori de lumină naturală, drivere / addressable luminaires, daylight sensors, drivers | magistrală DALI / DALI bus | numărul de adrese pe linie, existența unui gateway, gruparea existentă / the number of addresses per line, whether a gateway exists, the existing grouping |
| M-Bus | contoare de energie termică, contoare de apă, unele contoare de energie electrică / heat meters, water meters, some electricity meters | M-Bus cu fir sau radio / wired or radio M-Bus | numărul de contoare pe magistrală, adresele primare și secundare, nivelul de repetare / the number of meters on the bus, the primary and secondary addresses, the level of repeaters |

Note (line 308): "A practical note on KNX: whoever owns the ETS project file in fact owns the lighting system. It is exactly the same commercial problem as engineer-level passwords on the BMS side, covered on the modernisation page"

**Întrebări frecvente** / Frequently asked questions

1. **De ce să integrez echipamentele dacă fiecare are deja automatizarea lui?** / Why integrate the equipment if each device already has its own controls?
   EN answer: "Because each device's built-in controls optimise the device, not the building. A chiller does its job correctly even while the air handling unit is heating the air it has just cooled. Integration makes this conflict visible and enables a common strategy, plus a single alarm list and a single data history."
2. **Cât costă integrarea unui chiller sau a unei centrale de tratare a aerului?** / How much does integrating a chiller or an air handling unit cost?
   EN answer: "The cost is calculated on the points taken over, in the same 90-320 EUR per data point band. Points taken directly over the bus sit at the bottom of the band. Points requiring a gateway, a manufacturer's communication module and manual mapping sit at the top."
3. **Ce se întâmplă dacă echipamentul nu are port de comunicație?** / What happens if the equipment has no communication port?
   EN answer: "There are three options, in order of cost: order the communication module from the manufacturer, take over the essential signals through directly wired contacts and analogue signals, or fit dedicated sensors and transducers. The first option preserves the most values; the third is the most expensive and yields the least status information."
4. **Integrarea anulează garanția echipamentului?** / Does integration void the equipment warranty?
   EN answer: "Reading values over the protocol does not affect the warranty. Commanding the equipment from the BMS may need discussion with the manufacturer, especially for chillers and heat pumps. That is why the scope is set explicitly before execution, and where in doubt, written confirmation from the equipment supplier is requested."
5. **Se pot integra echipamente vechi, de 15-20 de ani?** / Can old equipment, 15-20 years old, be integrated?
   EN answer: "Often yes, through contacts and analogue signals, even if the protocol is missing. The result is poorer: you get running states, faults and start-stop commands, but not the internal parameters. The limits of this approach are described in our BMS-SCADA integration materials."

Answers are given in the site's English. The Romanian answers are at `app/servicii/integrare-sisteme-knx-dali-modbus-mbus/page.tsx`, line 90 onwards.

**Inventar de integrare, pe echipamentele existente** / An integration inventory, on the existing equipment

Note (line 332): "The first step is not the offer, but the inventory: what equipment exists, what protocol it speaks, what communication modules are fitted and what values it actually exposes. The inventory yields the list of points that can be integrated and those that cannot."

Useful resources: "Materiale despre protocoale și integrare BMS-SCADA" / "Materials on protocols and BMS-SCADA integration" → `/resurse/bms-scada-integrare`; "SCADA versus BMS: care este diferența" / "SCADA versus BMS: what the difference is" → `/resurse/scada-vs-bms`; "Pentru IT și OT" / "For IT and OT" → `/pentru/it-ot`.

Related services: "Proiectare automatizări și BMS" / "BMS and automation design" → `/servicii/proiectare-automatizari-bms`; "Execuție sisteme BMS" / "BMS execution" → `/servicii/executie-sisteme-bms`; "Modernizare sisteme de automatizare și BMS" / "Automation and BMS modernisation" → `/servicii/modernizare-sisteme-de-automatizare-si-bms`.

Button: "Cere o evaluare a clădirii" / "Request a building assessment" (→ `/contact`)


### 10.8 Întreținere sisteme BMS / BMS maintenance

Source: `app/servicii/intretinere-sisteme-bms/page.tsx` (route `/servicii/intretinere-sisteme-bms`), rendered through `components/service-hero.tsx`. The main URL `/servicii/mentenanta` redirects here (`next.config.mjs`).

Page metadata (`app/servicii/intretinere-sisteme-bms/layout.tsx`, written without diacritics): title "Intretinere BMS: contract, timpi de raspuns, 4-7% din valoarea sistemului pe an | Sovitech"; description "Contract de intretinere BMS pe trei niveluri: verificari planificate, interventii la solicitare, timpi de raspuns pe severitate. 4-7% de baza, 7-12% extins."

**H1.** RO: "Întreținere sisteme BMS: 4-7% pe an contract de bază, 7-12% contract extins" EN: "BMS maintenance: 4-7% per year base contract, 7-12% extended contract"

**Lead.**
- RO: "Un contract de întreținere BMS costă 4-7% din valoarea investiției pe an pentru nivelul de bază și 7-12% pentru nivelul extins. Diferența dintre niveluri nu este numărul de vizite, ci ce se întâmplă când sistemul cedează: cine răspunde, în cât timp, în ce interval orar și ce se face dacă remedierea nu este posibilă imediat. Contractul se scrie pe severități, nu pe promisiuni."
- EN: "A BMS maintenance contract costs 4-7% of the investment value per year at the base level and 7-12% at the extended level. The difference between levels is not the number of visits, but what happens when the system fails: who responds, how fast, in what window, and what is done if an immediate fix is not possible. The contract is written on severities, not on promises."

**Sidebar.** "Cost anual" / "Annual cost"; "4-7% bază, 7-12% extins" / "4-7% base, 7-12% extended"; "din valoarea investiției în sistem, pe an" / "of the system investment value, per year"; "Ce include contractul" / "What the contract includes"; "Cere o analiză a sistemului existent" / "Request an analysis of your existing system".

| # | RO | EN |
|---|----|----|
| 1 | Verificări planificate, cu frecvență declarată | Planned checks, at a declared frequency |
| 2 | Registru de intervenții actualizat | An up-to-date intervention log |
| 3 | Backup de configurație păstrat la beneficiar | Configuration backup kept by the client |
| 4 | Raport periodic cu alarme și consum | Periodic report with alarms and consumption |
| 5 | Timpi de răspuns pe severitate, conveniți prin contract | Response times by severity, agreed by contract |

**Pe scurt** / In short

1. Three contract levels: Base, Extended and Critical, delimited by scope, availability window and response time per severity.
2. The annual cost is 4-7% of the investment value for the base contract and 7-12% for the extended one. For a 10,000 sqm office building with a system at 13 EUR/sqm, the order of magnitude is 5,200-15,600 EUR per year.
3. Response time is not fix time. They are two different indicators, measured from different moments, and any serious contract defines them separately.
4. Severity is set by the effect on the building, not by how angry the phone call is: a stopped critical installation is not the same thing as a repetitive alarm.
5. What happens outside working hours is the part that really differentiates the three levels, and it is written explicitly into the contract.
6. Planned checks prevent the classic pattern: drifted schedules, points left in manual, sensors out of calibration, loops switched to manual and never switched back.

English as on the site. The Romanian is at `app/servicii/intretinere-sisteme-bms/page.tsx`, line 28 onwards.

**Ce livrează concret un contract de întreținere BMS** / What a BMS maintenance contract concretely delivers

| # | RO | EN |
|---|----|----|
| 1 | Verificări planificate, cu frecvență declarată: programe orare față de ocuparea reală, puncte trecute pe manual, alarme active și repetitive, deriva senzorilor, starea comunicației pe magistrale, spațiul de stocare al istoricului. | Planned checks, at a declared frequency: schedules against real occupancy, points switched to manual, active and repetitive alarms, sensor drift, bus communication status, history storage space. |
| 2 | Registrul de intervenții, actualizat la fiecare vizită: ce s-a verificat, ce s-a constatat, ce s-a remediat, ce a rămas deschis și cu ce termen. | The intervention log, updated at every visit: what was checked, what was found, what was fixed, what remains open and with what deadline. |
| 3 | Intervenții la solicitare, în sfera și în intervalul declarate pe nivelul de contract. | Interventions on request, within the scope and window declared for the contract level. |
| 4 | Backup de configurație, refăcut periodic și păstrat la beneficiar, împreună cu procedura de restaurare testată. | Configuration backup, periodically refreshed and kept by the client, together with a tested restore procedure. |
| 5 | Actualizări de configurare cerute de schimbări de ocupare: program orar nou, zonă reamenajată, chiriaș nou, prag de alarmă modificat. | Configuration updates required by occupancy changes: a new schedule, a refitted zone, a new tenant, a changed alarm threshold. |
| 6 | Raport periodic, cu constatările verificării, intervențiile din perioadă, alarmele dominante și consumul față de perioada similară din anul anterior. | A periodic report, with the check findings, the interventions in the period, the dominant alarms and consumption against the same period of the previous year. |
| 7 | Recomandări de piese de schimb, cu termenele de livrare și cu poziția de stoc recomandată la beneficiar. | Spare part recommendations, with delivery lead times and the stock position recommended at the client. |
| 8 | Instruire de reîmprospătare pentru echipa de operare, cu durata și frecvența stabilite prin nivelul de contract. | Refresher training for the operating team, with duration and frequency set by the contract level. |

**Cele trei niveluri de contract și ce intră în fiecare** / The three contract levels and what each includes

Note (line 225): "Response times per severity, check frequency and the exact hours of each level are set and written into the contract, at signing."

| Element | Bază / Base | Extins / Extended | Critic / Critical |
|---|---|---|---|
| Cost anual, din valoarea investiției / Annual cost, of the investment value | 4-7% | 7-12% | convenit prin contract / agreed by contract |
| Verificări planificate / Planned checks | frecvență convenită prin contract / frequency agreed by contract | frecvență convenită prin contract / frequency agreed by contract | frecvență convenită prin contract / frequency agreed by contract |
| Interval de disponibilitate pentru sesizări / Availability window for requests | program de lucru / working hours | program de lucru extins / extended working hours | permanent |
| Timp de răspuns, pe severitate / Response time, by severity | convenit prin contract / agreed by contract | convenit prin contract / agreed by contract | convenit prin contract / agreed by contract |
| Intervenție la fața locului / On-site intervention | contra cost, la solicitare / chargeable, on request | inclusă, în limita unui număr de vizite pe an / included, up to a number of visits per year | inclusă / included |
| Asistență la distanță / Remote assistance | inclusă, în program / included, during working hours | inclusă, în intervalul extins / included, in the extended window | inclusă, permanent / included, permanently |
| Modificări de configurare / Configuration changes | contra cost / chargeable | incluse, în limita unui buget de ore pe an / included, up to an annual budget of hours | incluse / included |
| Backup de configurație / Configuration backup | la fiecare vizită planificată / at every planned visit | la fiecare vizită și după fiecare modificare / at every visit and after every change | idem, plus test de restaurare / the same, plus a restore test |
| Raport periodic / Periodic report | la frecvența din contract / at the contract frequency | lunar / monthly | lunar, plus analiză de tendințe / monthly, plus trend analysis |
| Piese de schimb / Spare parts | contra cost / chargeable | contra cost, cu stoc recomandat / chargeable, with a recommended stock | contra cost, cu stoc convenit la beneficiar / chargeable, with an agreed stock at the client |
| Actualizări de firmware / Firmware updates | contra cost / chargeable | incluse, planificate / included, planned | incluse, planificate / included, planned |

Note (line 248): "The right level is chosen by the consequence of an outage, not by the size of the building. A 5,000 sqm office building with a server room needs a higher level than a 20,000 sqm warehouse."

**Cum se stabilește severitatea unei sesizări** / How the severity of a request is set

Note (line 259): "Severity is determined by the effect on the building and the activity inside it. It is the only definition that cannot be negotiated over the phone, in the middle of an incident."

| Severitate / Severity | Definiție / Definition | Exemple / Examples |
|---|---|---|
| 1. Critică / 1. Critical | O instalație esențială este oprită sau scăpată de sub control, iar activitatea din clădire este afectată sau riscă să fie afectată în orele următoare. / An essential installation is stopped or out of control, and activity in the building is affected or at risk of being affected within hours. | Centrala frigorifică oprită în plin sezon, pierderea totală a supervizării, control pierdut pe o zonă cu parametri critici, îngheț iminent pe o baterie / The chiller plant stopped at peak season, total loss of supervision, lost control of a zone with critical parameters, imminent freezing of a coil |
| 2. Majoră / 2. Major | Sistemul funcționează, dar o funcție importantă lipsește sau o zonă este afectată. Activitatea continuă, cu disconfort sau cu operare manuală. / The system runs, but an important function is missing or a zone is affected. Activity continues, with discomfort or manual operation. | O centrală de tratare a aerului fără reglaj automat, pierderea comunicației cu un controler, istoricizare oprită, alarme care nu ajung la destinatar / An air handling unit without automatic control, lost communication with a controller, historisation stopped, alarms not reaching their recipient |
| 3. Minoră / 3. Minor | Efect local, fără impact asupra activității. Se planifică. / Local effect, no impact on activity. It gets scheduled. | Un senzor cu derivă, o etichetă greșită în interfață, un raport care nu se generează, o alarmă repetitivă cu prag greșit / A drifting sensor, a wrong label in the interface, a report that does not generate, a repetitive alarm with a wrong threshold |

**Cum se măsoară timpul de răspuns** / How response time is measured

Note (line 290): "Without definitions, an "SLA of a few hours" means nothing. The three indicators below are measured from different moments and must be declared separately in the contract, with the values agreed at signing."

1. Response time is measured from the moment the request is logged, on the channel declared in the contract, to an engineer's first technical contact with the client, taking over the case and assigning the severity.
2. Remote intervention time is measured from case takeover to the start of analysis on the system, over the secured remote access connection.
3. On-site attendance time is measured from the moment it is established that the problem cannot be solved remotely, to the engineer's arrival in the building.

English as on the site. The Romanian is at `app/servicii/intretinere-sisteme-bms/page.tsx`, line 68 onwards.

Note (line 298): "Three rules make the difference between a contract that works and a decorative one. The clock starts when the request is logged on the contract channel, not at a phone call to a personal number. The clock stops at a fix confirmed by the client or at an agreed provisional solution, recorded in the log. The waiting time for a spare part is measured and reported separately, because it does not depend on the service provider."

Note (line 301): "What is not guaranteed: a fixed fix time, regardless of cause. An unavailable part, a fault in a piece of plant equipment or a lack of building access cannot be covered by the automation contract. What is guaranteed is the response time, the attendance time and transparency about the cause."

**Ce se întâmplă în afara programului de lucru** / What happens outside working hours

Note (line 310): "This is the part most contracts on the market leave unwritten, and where most conflicts appear."

1. The base contract covers requests received during working hours. A request made in the evening is taken over first thing the next working day, and the response clock starts then. Out-of-hours interventions are quoted separately, at an emergency rate.
2. The extended contract covers a wider availability window and, for severity 1, out-of-hours takeover through an on-call service.
3. The critical contract covers permanent takeover, including weekends and legal holidays, with identical response times regardless of the hour.

English as on the site. The Romanian is at `app/servicii/intretinere-sisteme-bms/page.tsx`, line 74 onwards.

Note (line 318): "Three elements are set in the contract, not during the incident: the single request channel and the on-call number, the list of people on the client's side who can declare severity 1, and the rate for interventions outside the contract scope."

**Cum decurge preluarea în întreținere, pe etape** / How maintenance takeover proceeds, stage by stage

Note (line 329): "Durations are indicative, for an office building of around 10,000 sqm."

- **1. Analiza sistemului existent / 1. Analysis of the existing system** (1 zi pe teren / 1 day on site). RO: "O zi pe clădire: lista de puncte, programele orare, punctele pe manual, alarmele active, trend-logurile pe 30 de zile, accesul de nivel inginer, disponibilitatea pieselor." EN: "One day in the building: the points list, the schedules, the points in manual, the active alarms, 30 days of trend logs, engineer-level access, parts availability."
- **2. Raportul de constatări / 2. Findings report** (3-5 zile lucrătoare / 3-5 working days). RO: "Lista constatărilor, separată în ce se rezolvă din configurare și ce cere intervenție fizică, cu efort estimat pe fiecare." EN: "The list of findings, split into what can be fixed through configuration and what needs physical intervention, with the estimated effort for each."
- **3. Alegerea nivelului de contract / 3. Choosing the contract level** (discuție de 1 oră / a 1-hour discussion). RO: "Se stabilesc sfera, intervalul de disponibilitate, severitățile și timpii, în funcție de consecința unei opriri." EN: "The scope, availability window, severities and times are set, based on the consequence of an outage."
- **4. Punerea la punct înainte de intrarea în contract / 4. Tune-up before the contract starts** (1-3 săptămâni / 1-3 weeks). RO: "Corectarea programelor orare, prioritizarea alarmelor, refacerea backup-urilor, completarea listei de puncte. Se ofertează separat de contract." EN: "Correcting the schedules, prioritising the alarms, refreshing the backups, completing the points list. Quoted separately from the contract."
- **5. Prima vizită planificată / 5. First planned visit** (1 zi / 1 day). RO: "Verificarea completă pe lista de control și deschiderea registrului de intervenții." EN: "The full check against the checklist and the opening of the intervention log."
- **6. Regim curent / 6. Ongoing operation** (pe toată durata contractului / for the whole contract term). RO: "Verificări planificate la frecvența din contract, intervenții la solicitare, raport periodic." EN: "Planned checks at the contract frequency, interventions on request, the periodic report."

Note (line 350): "Stage 4 is the one most contracts skip. A maintenance contract that starts on a system with 400 active alarms and half the points in manual spends its first year just getting back to the starting line."

**Ce cere contractul de întreținere din partea beneficiarului** / What the maintenance contract requires from the client

1. Access to the system, physical and remote, over the secured connection agreed with the IT team.
2. The existing documentation: As-built, points list, panel diagrams, backups, if they exist.
3. Designated contact persons, with the authority to declare the severity and approve interventions.
4. Access to the building in the agreed windows, including leased spaces where necessary.
5. Requests on the contract channel, not on personal channels, so the times are measurable.
6. Information about changes: occupancy changes, fit-out works, new equipment, other suppliers' interventions on the installations.

English as on the site. The Romanian is at `app/servicii/intretinere-sisteme-bms/page.tsx`, line 89 onwards.

**Cum se măsoară că întreținerea a ieșit bine** / How you measure that maintenance turned out well

1. The number of active alarms drops and stays low. An alarm list the building team actually reads is the first indicator of system health.
2. The number of points left in manual tends towards zero, and every point left in manual has a reason recorded in the log.
3. The schedules match real occupancy, verified at every planned visit.
4. The configuration backup exists, is recent and has been tested through a restore.
5. The contract times are met and reported, with the request history available to the client.
6. Consumption is compared year on year, which requires at least 24 months of full-resolution retention and normalisation at least to degree days and occupancy hours.
7. The intervention log is complete and can be handed to another supplier at any time.

English as on the site. The Romanian is at `app/servicii/intretinere-sisteme-bms/page.tsx`, line 98 onwards.

**Ce nu include contractul de întreținere** / What the maintenance contract does not include

| # | RO | EN |
|---|----|----|
| 1 | Nu include piesele de schimb și echipamentele, decât dacă sunt prevăzute explicit. Se ofertează separat, cu termen de livrare declarat. | It does not include spare parts and equipment, unless explicitly provided for. They are quoted separately, with a declared delivery time. |
| 2 | Nu include service-ul instalațiilor de HVAC, electrice și sanitare. Contractul acoperă sistemul de automatizare, nu chillerul, cazanul sau pompa. | It does not include servicing the HVAC, electrical and plumbing installations. The contract covers the automation system, not the chiller, the boiler or the pump. |
| 3 | Nu include remedierea defectelor produse de intervenții ale altor furnizori asupra sistemului sau ale beneficiarului asupra configurației. | It does not include fixing faults caused by other suppliers' interventions on the system or the client's own changes to the configuration. |
| 4 | Nu include extinderi de sistem: puncte noi, zone noi, echipamente noi. Se tratează ca lucrare separată. | It does not include system extensions: new points, new zones, new equipment. These are treated as separate works. |
| 5 | Nu include licențele de software și taxele anuale de licență, care se estimează la 8-18% din valoarea componentei software și se declară separat în ofertă. | It does not include software licences and annual licence fees, estimated at 8-18% of the software component value and declared separately in the offer. |
| 6 | Nu include modernizarea sistemului ajuns la finalul duratei de viață. Când piesele nu mai există, contractul de întreținere nu mai este soluția. | It does not include modernising a system at the end of its life. When parts no longer exist, the maintenance contract is no longer the answer. |
| 7 | Nu include garanția lucrării de execuție, care este un angajament distinct, cu durată proprie. | It does not include the execution works warranty, which is a distinct commitment with its own term. |

Note (line 410): "When parts no longer exist, the answer is the automation and BMS modernisation service"

**Întrebări frecvente** / Frequently asked questions

1. **Cât costă un contract de întreținere BMS pe an?** / How much does a BMS maintenance contract cost per year?
   EN answer: "The base contract costs 4-7% of the system investment value per year, and the extended one 7-12%. For a 10,000 sqm office building with a system at 13 EUR/sqm, i.e. an investment of around 130,000 EUR, the order of magnitude is 5,200-9,100 EUR per year at the base level and 9,100-15,600 EUR at the extended level."
2. **Ce înseamnă concret timp de răspuns într-un contract de BMS?** / What does response time concretely mean in a BMS contract?
   EN answer: "Response time is measured from the moment the request is logged on the channel declared in the contract to an engineer's first technical contact, taking over the case and setting the severity. It differs from on-site attendance time and fix time, which are measured from other moments and reported separately."
3. **Se poate prelua în întreținere un sistem executat de altă firmă?** / Can you take over maintenance of a system executed by another company?
   EN answer: "Yes. Takeover starts with one day of analysis: the points list, the state of the programs, the active alarms, the points in manual, engineer-level access and parts availability. If the engineering passwords or the controller programs were not handed over at the original acceptance, this is established and quantified before the contract is signed."
4. **Ce se întâmplă dacă sistemul cade în weekend?** / What happens if the system fails at the weekend?
   EN answer: "It depends on the contract level. At the base level, the request is taken over on the first working day, and a weekend intervention is quoted at an emergency rate. At the extended level, severity 1 is taken over through an on-call service. At the critical level, takeover is permanent, with the same times regardless of the day."
5. **Cine deține parolele și backup-urile în timpul contractului?** / Who owns the passwords and backups during the contract?
   EN answer: "The client. The engineer-level passwords, the configuration backups and the controller programs stay with the client for the whole contract term. A service provider who keeps exclusive hold of these turns an annual contract into a permanent dependency."

Answers are given in the site's English. The Romanian answers are at `app/servicii/intretinere-sisteme-bms/page.tsx`, line 118 onwards.

**Analiza sistemului existent, înainte de contract** / An analysis of the existing system, before the contract

Note (line 434): "A maintenance contract can only be quoted correctly once you know what is being taken over: how many points, in what state, with what documentation and with what access. Sovitech Control starts with one day of analysis in the building and a list of findings."

Useful resources: "Materiale despre performanța clădirii, pentru facility manager" / "Materials on building performance, for facility managers" → `/resurse/performanta-cladirii`; "Materiale despre alarme și integrare BMS-SCADA" / "Materials on alarms and BMS-SCADA integration" → `/resurse/bms-scada-integrare`; "Materiale despre modernizare și retrofit" / "Materials on modernisation and retrofit" → `/resurse/modernizare-retrofit`; "Pentru facility manager" / "For the facility manager" → `/pentru/facility-manager`.

Related services: "Execuție sisteme BMS" / "BMS execution" → `/servicii/executie-sisteme-bms`; "Modernizare sisteme de automatizare și BMS" / "Automation and BMS modernisation" → `/servicii/modernizare-sisteme-de-automatizare-si-bms`; "Consultanță" / "Consultancy" → `/servicii/consultanta`.

Button: "Cere o analiză a sistemului existent" / "Request an analysis of your existing system" (→ `/contact`)


### 10.9 Modernizare BMS / BMS modernisation

Source: `app/servicii/modernizare-sisteme-de-automatizare-si-bms/page.tsx` (route `/servicii/modernizare-sisteme-de-automatizare-si-bms`), rendered through `components/service-hero.tsx`. New on the branch; main has no such page.

Page metadata (`app/servicii/modernizare-sisteme-de-automatizare-si-bms/layout.tsx`, written without diacritics): title "Modernizare BMS: 40-60% din costul unui sistem nou | Sovitech"; description "Modernizarea unui sistem BMS costa 40-60% din pretul unui sistem nou, cu amortizare de 3-6 ani. Migrare pe etape, fara oprirea cladirii. Licente predate."

**H1.** RO: "Modernizare BMS: 40-60% din costul unui sistem nou, amortizare 3-6 ani" EN: "BMS modernisation: 40-60% of the cost of a new system, 3-6 year payback"

**Lead.**
- RO: "Modernizarea unui sistem de automatizare costă 40-60% din prețul unui sistem nou, pentru că instalațiile, traseele de cablu, tablourile și o parte din elementele de câmp rămân pe loc. Amortizarea unei modernizări de capital este de 3-6 ani. Migrarea se face pe etape, zonă cu zonă, cu sistemul vechi și cel nou funcționând în paralel, fără oprirea clădirii."
- EN: "Modernising an automation system costs 40-60% of the price of a new system, because the installations, the cable routes, the panels and part of the field devices stay in place. The payback of a capital modernisation is 3-6 years. Migration is done in stages, zone by zone, with the old and new systems running in parallel, without stopping the building."

**Sidebar.** "Durată orientativă" / "Indicative duration"; "3-12 luni, pe etape" / "3-12 months, staged"; "pentru o clădire de birouri de circa 10.000 mp în funcțiune" / "for an occupied office building of around 10,000 sqm"; "Livrabile principale" / "Main deliverables"; "Cere o analiză a sistemului existent" / "Request an analysis of your existing system".

| # | RO | EN |
|---|----|----|
| 1 | Audit al sistemului existent, cu lista de puncte reală | Audit of the existing system, with the real points list |
| 2 | Plan de migrare pe etape, zonă cu zonă | A staged migration plan, zone by zone |
| 3 | Clădirea rămâne în funcțiune pe durata lucrării | The building stays in operation throughout |
| 4 | Licențe, programe sursă și parole predate | Licences, source programs and passwords handed over |
| 5 | Documentație As-built completă | Complete As-built documentation |

**Pe scurt** / In short

1. The cost of a modernisation is 40-60% of the cost of a new system. The saving comes from the existing routes, the panels and the field devices that can be kept.
2. The payback of a capital modernisation is 3-6 years, per the 11 European cases documented by eu.bac. For optimisation and recommissioning measures, which involve no new equipment, payback is 1-3 years.
3. The savings documented in independent studies are 5-15% of the building's total consumption for optimisation and recommissioning, measured across more than 1,000 projects. On HVAC consumption, where control was poor, the band is 10-20%.
4. Migration is done in stages, with the two systems in parallel. The building stays in operation.
5. Licences, source programs and engineer-level passwords are handed over at the end of the project. It is the condition for the next modernisation to be doable by anyone.
6. The first stage is not buying, but the audit of the existing system and the real points list.

English as on the site. The Romanian is at `app/servicii/modernizare-sisteme-de-automatizare-si-bms/page.tsx`, line 26 onwards.

**Ce se întâmplă cu licențele, codul sursă și parolele de inginerie** / What happens to the licences, the source code and the engineering passwords

Note (line 219): "This is the question that decides the contract, and one almost nobody on the market puts in writing. An experienced technical director asks it last: after acceptance, can they call another integrator, or are they tied to the supplier?"

Note (line 220): "Sovitech Control's position, written into the contract:"

1. Supervision software licences are issued in the client's name, not the integrator's. The licence certificate, the key and the proof of purchase are handed over at acceptance. A client who does not hold the licence in their own name does not own the system they paid for.
2. Controller programs are handed over in source form, in the format that can be opened and modified with the platform's engineering tool, not just as an executable loaded into the controller.
3. Engineer-level and administration passwords are handed to the client at acceptance, together with the procedure for changing them. Sovitech Control keeps no exclusive access to any handed-over system.
4. The complete configuration backup of the controllers and the supervision station is handed over on the client's own media, with a tested restore procedure.
5. The integration documentation, including the mapping tables and, on the KNX side, the ETS project file, is handed over in editable format.
6. Changing the service provider does not affect the licence. The licence belongs to the client and remains valid regardless of who performs the maintenance.
7. Point-count licences are declared explicitly in the offer, with the number of licensed points, the number of points used and the cost of extension. A building extension that exceeds the licence should be a predictable expense, not a surprise.
8. The annual licence fee, where it exists, is declared from the start. The market reference is 8-18% of the software component's value per year.

English as on the site. The Romanian is at `app/servicii/modernizare-sisteme-de-automatizare-si-bms/page.tsx`, line 57 onwards.

Note (line 232): "What to ask any integrator, in writing, before signing"

1. In whose name the licence is issued.
2. What is handed over from the controller programs, source or executable.
3. Who holds the engineer-level password after acceptance.
4. What happens to the licence when the service provider changes.
5. What it costs to extend the licence by 100 points.
6. What format the historical data export has.

English as on the site. The Romanian is at `app/servicii/modernizare-sisteme-de-automatizare-si-bms/page.tsx`, line 68 onwards.

Note (line 241): "A supplier who avoids a written answer to these six questions has already answered."

**Când merită modernizat și când merită doar reglat sistemul existent** / When it is worth modernising and when the existing system just needs tuning

Note (line 253): "The answer rests on seven verifiable signs, not on the system's age. A 12-year-old system with available parts and engineering access is in a better position than a 7-year-old one with a lost licence."

1. Spare parts can no longer be found, or have lead times of months.
2. The operator station runs on an operating system out of support, and the IT team no longer accepts it on the network.
3. Points can no longer be added without replacing the controller or extending the licence at a disproportionate cost.
4. The controller programs are not accessible, because they were never handed over or because the engineering tool no longer exists.
5. Historical data cannot be exported in a usable format, which blocks any reporting.
6. The annual cost of interventions approaches a significant fraction of the system's value.
7. The system cannot cover a new obligation, such as monitoring indoor environment parameters or tenant metering.

English as on the site. The Romanian is at `app/servicii/modernizare-sisteme-de-automatizare-si-bms/page.tsx`, line 35 onwards.

Note (line 264): "If none of the signs is present, the right measure is optimisation, not modernisation: schedules, calibration, control loops, the alarm matrix. It is the cheap part, with a 1-3 year payback."

**Ce livrează concret o modernizare de sistem BMS** / What a BMS modernisation concretely delivers

| # | RO | EN |
|---|----|----|
| 1 | Auditul sistemului existent, cu lista de puncte reală, starea fiecărui element de câmp, starea programelor și inventarul de licențe. | The audit of the existing system, with the real points list, the state of each field device, the state of the programs and the licence inventory. |
| 2 | Planul de migrare pe etape, cu ordinea zonelor, ferestrele de lucru și punctele de reversibilitate ale fiecărei etape. | The staged migration plan, with the order of the zones, the work windows and the reversibility points of each stage. |
| 3 | Controlerele noi și modulele de extensie, dimensionate pe lista de puncte reală, cu rezerva declarată. | The new controllers and extension modules, sized on the real points list, with a declared reserve. |
| 4 | Reutilizarea elementelor de câmp, acolo unde starea și tipul de semnal permit. Fiecare element păstrat se verifică și se consemnează. | Reuse of field devices, where their condition and signal type allow. Every kept device is checked and recorded. |
| 5 | Retehnologizarea tabloului, cu păstrarea dulapului și a cablajului de forță, unde starea permite. | Re-engineering of the panel, keeping the cabinet and the power wiring, where condition allows. |
| 6 | Programele de control refăcute, cu secvențele documentate în text, nu doar implementate. | The control programs rebuilt, with the sequences documented in text, not just implemented. |
| 7 | Interfața grafică nouă, cu sinoptice, alarme prioritizate, programe orare și rapoarte de consum. | A new graphical interface, with synoptics, prioritised alarms, schedules and consumption reports. |
| 8 | Migrarea datelor istorice, unde exportul este posibil, sau consemnarea explicită a imposibilității. | Migration of historical data, where export is possible, or the explicit recording of its impossibility. |
| 9 | Documentația As-built completă și predarea integrală a licențelor, programelor sursă și parolelor. | The complete As-built documentation and the full handover of licences, source programs and passwords. |

**Cum decurge modernizarea, pe etape** / How modernisation proceeds, stage by stage

Note (line 295): "Durations are indicative, for an occupied office building of around 10,000 sqm."

- **1. Audit al sistemului existent / 1. Audit of the existing system** (1-2 săptămâni / 1-2 weeks). RO: "Lista de puncte reală, starea elementelor de câmp, starea programelor, inventarul de licențe, accesul de inginerie, capacitatea de export a datelor." EN: "The real points list, the state of the field devices, the state of the programs, the licence inventory, engineering access, the data export capability."
- **2. Plan de migrare și buget / 2. Migration plan and budget** (1-2 săptămâni / 1-2 weeks). RO: "Ordinea zonelor, ce se păstrează și ce se înlocuiește, ferestrele de lucru, fazarea investiției pe ani bugetari." EN: "The order of the zones, what is kept and what is replaced, the work windows, phasing of the investment across budget years."
- **3. Comanda echipamentelor / 3. Ordering the equipment** (4-10 săptămâni / 4-10 weeks). RO: "Controlere, module, elemente de câmp de înlocuit." EN: "Controllers, modules, field devices to be replaced."
- **4. Supervizarea nouă, în paralel / 4. New supervision, in parallel** (2-3 săptămâni / 2-3 weeks). RO: "Se instalează stația nouă și se conectează la sistemul vechi, unde protocolul permite. Operarea continuă neîntrerupt." EN: "The new station is installed and connected to the old system, where the protocol allows. Operation continues uninterrupted."
- **5. Migrare zonă cu zonă / 5. Migration zone by zone** (2-8 luni, în funcție de numărul de zone / 2-8 months, depending on the number of zones). RO: "Fiecare zonă se trece pe controlerul nou într-o fereastră convenită, cu punct de revenire la sistemul vechi până la validare." EN: "Each zone is switched to the new controller in an agreed window, with a fallback to the old system until validation."
- **6. Verificare și testare funcțională / 6. Verification and functional testing** (pe fiecare zonă, 2-5 zile / per zone, 2-5 days). RO: "Verificare punct cu punct pe fiecare zonă migrată, testarea secvențelor și a regimurilor de avarie." EN: "Point-by-point verification of each migrated zone, testing of the sequences and the failure modes."
- **7. Scoaterea din funcțiune a sistemului vechi / 7. Decommissioning the old system** (1 săptămână / 1 week). RO: "După validarea ultimei zone. Se păstrează arhiva de configurație a sistemului vechi." EN: "After the last zone is validated. The old system's configuration archive is kept."
- **8. Documentație, licențe, instruire / 8. Documentation, licences, training** (1-2 săptămâni / 1-2 weeks). RO: "As-built complet, predarea licențelor, a programelor sursă și a parolelor, instruirea echipei." EN: "The complete As-built, handover of licences, source programs and passwords, team training."

**Ce cere modernizarea din partea beneficiarului** / What modernisation requires from the client

1. Access to the existing system, including the operator station and, where it exists, the engineering tool.
2. The existing documentation, however incomplete: diagrams, points lists, manuals, licence contracts.
3. The licence inventory and proof of purchase, to establish what can be transferred and what must be bought again.
4. Work windows negotiated by zone, including outside working hours where a zone cannot be stopped during activity.
5. Access to leased spaces, coordinated with the tenants, with notice.
6. The phased budget decision, if the modernisation spans several budget years.
7. The last 12-24 months of energy bills, if a post-modernisation consumption comparison is wanted.

English as on the site. The Romanian is at `app/servicii/modernizare-sisteme-de-automatizare-si-bms/page.tsx`, line 88 onwards.

**Cum se măsoară că modernizarea a ieșit bine** / How you measure that modernisation turned out well

1. Each migrated zone is verified point by point and functionally tested before moving to the next zone.
2. The building was not stopped, and zone interruptions stayed within the agreed windows.
3. Historical data was migrated or, where export was not possible, the impossibility is recorded in writing, with the reason.
4. The licences are in the client's name, and the certificates are handed over.
5. The source programs, backups and engineer-level passwords are handed over and have been tested through a restore.
6. The As-built documentation matches reality, spot-checked on 10 points chosen by the client.
7. Consumption can be compared year on year, which requires at least 24 months of full-resolution retention and normalisation at least to degree days and occupancy hours. Without normalisation, a warm month can completely hide a real saving.

English as on the site. The Romanian is at `app/servicii/modernizare-sisteme-de-automatizare-si-bms/page.tsx`, line 98 onwards.

**Ce nu include modernizarea** / What modernisation does not include

| # | RO | EN |
|---|----|----|
| 1 | Nu include înlocuirea instalațiilor de HVAC. Un chiller la finalul duratei de viață rămâne un chiller la finalul duratei de viață și după modernizarea automatizării. | It does not include replacing the HVAC installations. A chiller at the end of its life is still a chiller at the end of its life after the controls are modernised. |
| 2 | Nu include recuperarea licențelor pierdute ale sistemului vechi. Dacă licența a fost emisă pe numele fostului integrator și acesta nu o cedează, singura soluție este o licență nouă, cu cost declarat în ofertă. | It does not include recovering the old system's lost licences. If the licence was issued in the former integrator's name and they do not release it, the only solution is a new licence, with the cost declared in the offer. |
| 3 | Nu include decompilarea programelor sistemului vechi, dacă acestea nu au fost predate. Ce nu există se rescrie, iar efortul se cuantifică în ofertă. | It does not include decompiling the old system's programs, if they were never handed over. What does not exist is rewritten, and the effort is quantified in the offer. |
| 4 | Nu include migrarea datelor istorice dintr-un sistem care nu permite export. Se consemnează, se propune o soluție de arhivare paralelă și se declară pierderea. | It does not include migrating historical data from a system that allows no export. It is recorded, a parallel archiving solution is proposed and the loss is declared. |
| 5 | Nu include lucrările de construcții pentru trasee noi, refacerile de tavane și finisajele. | It does not include construction works for new routes, ceiling repairs and finishes. |
| 6 | Nu include garanția pentru elementele de câmp păstrate din sistemul vechi. Fiecare element păstrat se verifică și se consemnează, dar vechimea lui rămâne a beneficiarului. | It does not include a warranty for field devices kept from the old system. Every kept device is checked and recorded, but its age remains the client's. |

**Ce se păstrează și ce se înlocuiește într-o modernizare** / What is kept and what is replaced in a modernisation

| Element | Se păstrează de regulă / Usually kept | Se înlocuiește de regulă / Usually replaced | De ce / Why |
|---|---|---|---|
| Trasee de cablu și cablu de semnal / Cable routes and signal cable | da / yes | numai unde este deteriorat sau insuficient / only where damaged or insufficient | cea mai mare parte a economiei de 40-60% vine de aici / most of the 40-60% saving comes from here |
| Dulapul de tablou / The panel cabinet | da / yes | dacă spațiul sau starea nu permit / if space or condition does not allow | retehnologizarea internă este mai ieftină decât un dulap nou / internal re-engineering is cheaper than a new cabinet |
| Aparataj de forță din tablou / Power apparatus in the panel | frecvent / frequently | dacă este uzat sau subdimensionat / if worn or undersized | se verifică individual / checked individually |
| Senzori de temperatură pasivi / Passive temperature sensors | frecvent / frequently | dacă tipul de semnal nu este compatibil / if the signal type is not compatible | se verifică prin comparație cu un etalon / checked by comparison against a reference |
| Senzori de CO2 / CO2 sensors | rar / rarely | de regulă da / usually yes | se decalibrează în 2-3 ani, iar generațiile vechi au derivă mare / they drift out of calibration in 2-3 years, and old generations drift heavily |
| Servomotoare pe vane și clapete / Actuators on valves and dampers | uneori / sometimes | dacă nu răspund la semnal sau sunt gripate / if they do not respond to the signal or are seized | se testează în cursă completă / tested over their full stroke |
| Controlere / Controllers | nu / no | da / yes | sunt elementul care determină modernizarea / they are the element that drives the modernisation |
| Stația de supervizare și licențele / The supervision station and licences | nu / no | da / yes | motivul frecvent al modernizării este suportul ieșit / the frequent reason for modernisation is expired support |

**Întrebări frecvente** / Frequently asked questions

1. **Cât costă modernizarea unui sistem BMS?** / How much does BMS modernisation cost?
   EN answer: "Modernisation costs 40-60% of the price of a new system, because the routes, the panels and part of the field devices are kept. Against market bands, for a class A office building with a new system at 9-18 EUR/sqm, modernisation falls indicatively within 3.6-10.8 EUR/sqm. The payback of a capital modernisation is 3-6 years."
2. **Se poate moderniza fără să opresc clădirea?** / Can I modernise without stopping the building?
   EN answer: "Yes. Migration is done by zone, with the old and new systems running in parallel during the transition and a fallback point for each zone until validation. The conditions are a correct points list before starting and agreed work windows for each zone."
3. **Ce se întâmplă cu licențele la schimbarea integratorului?** / What happens to the licences when the integrator changes?
   EN answer: "It depends on who holds the licence. A licence issued in the client's name remains valid and usable regardless of who performs the service. A licence issued in the previous integrator's name cannot be transferred without their consent, and if consent is missing, the cost of a new licence is declared explicitly in the modernisation offer."
4. **Primesc programele sursă ale controlerelor?** / Do I receive the controllers' source programs?
   EN answer: "Yes. Sovitech Control hands over the controller programs in the form in which they can be opened and modified with the platform's engineering tool, together with the configuration backup and the engineer-level passwords. Without this handover, any later modernisation starts with rewriting the system."
5. **Cât de mult se economisește după o modernizare?** / How much is saved after a modernisation?
   EN answer: "The literature, measured across more than 1,000 projects, indicates 5-15% of the building's total consumption for optimisation and recommissioning, and 10-20% on HVAC consumption where control was poor. These are figures from independent studies, not results of Sovitech Control projects. The real saving of a specific building can only be stated with a reference period of at least 12 months, a comparison period of at least 12 months and normalisation to degree days and occupancy."

Answers are given in the site's English. The Romanian answers are at `app/servicii/modernizare-sisteme-de-automatizare-si-bms/page.tsx`, line 128 onwards.

**Audit al sistemului existent, înainte de orice decizie de buget** / An audit of the existing system, before any budget decision

Note (line 422): "A modernisation starts with the real points list, the licence inventory and a check of engineering access, not with an equipment offer. The result of the audit is a staged plan, with a phased budget."

Useful resources: "Materiale despre modernizare și retrofit" / "Materials on modernisation and retrofit" → `/resurse/modernizare-retrofit`; "Materiale despre protocoale deschise și vendor lock-in" / "Materials on open protocols and vendor lock-in" → `/resurse/bms-scada-integrare`; "Calculator ROI pentru automatizarea clădirii" / "ROI calculator for building automation" → `/calculator-roi`.

Related services: "Întreținere sisteme BMS" / "BMS maintenance" → `/servicii/intretinere-sisteme-bms`; "Execuție sisteme BMS" / "BMS execution" → `/servicii/executie-sisteme-bms`; "Consultanță" / "Consultancy" → `/servicii/consultanta`.

Button: "Cere o analiză a sistemului existent" / "Request an analysis of your existing system" (→ `/contact`)


### 10.10 Durations on the branch

All branch durations are labelled "orientativ" / "indicative", and every page carries a "TODO(confirm)" on them (see the status note at the top of section 10). The last column is our own arithmetic. It assumes the stages run one after another, 5 working days to a week and about 4.3 weeks to a month. It is a consistency check on website copy, nothing more.

| Scope | Stated duration | Basis stated | Stages as listed | Stages back to back (our sum) |
|-------|-----------------|--------------|------------------|-------------------------------|
| Consultancy | 1-10 zile lucrătoare | "în funcție de sferă" | 1 zi; 1-3 zile; 1 zi; 3-7 zile lucrătoare; 1 zi | 7-13 days. By work type the page gives 3-5 zile (comparare de oferte), 1-3 zile (verificarea obligației legale), 5-10 zile (revizuire de arhitectură; evaluarea unui sistem existent). It does not say which stages a short job skips. |
| Design | 3-8 săptămâni | office building of about 10,000 m² | 3-5 zile; 3-5 zile; 1-2 săptămâni; 1-2 săptămâni; 1 săptămână; 3-5 zile; 1 săptămână | About 6-9 weeks (29-45 days). The page does not say whether stages overlap. |
| Execution | 8-20 săptămâni | office building of about 10,000 m², "cu 750-1.350 de puncte" | 2-3 săpt.; 4-10 săpt.; 2-4 săpt. "în paralel cu etapa 2"; 3-8 săpt.; 3-5 zile; 2-4 săpt. "parțial în paralel"; 1-2 săpt.; 1-2 săpt.; 3-5 zile | Not summed: the page says "Etapele 2, 3 și 4 se suprapun în cea mai mare parte". |
| Integration | 2-10 săptămâni | 10-40 integrated devices | 3-10 zile; 1-2 săpt.; 2-6 săpt.; 1-3 săpt.; 1-2 săpt.; 1 săpt.; 3-5 zile | About 7-17 weeks (36-85 days). The page does not say which stages overlap. |
| Maintenance takeover | None stated | office building of about 10,000 m² | 1 zi pe teren; 3-5 zile lucrătoare; discuție de 1 oră; 1-3 săptămâni; 1 zi; for the contract term | Not applicable |
| Modernisation | 3-12 luni, pe etape | occupied office building of about 10,000 m² | 1-2 săpt.; 1-2 săpt.; 4-10 săpt.; 2-3 săpt.; 2-8 luni; 2-5 zile per zone; 1 săpt.; 1-2 săpt. | About 4.3-12.6 months, leaving out the per-zone testing. The page does not say which stages overlap. |
| Whole project (overview FAQ) | design 3-8 săptămâni, then execution 8-20 săptămâni | office building of about 10,000 m² | | Main's FAQ gave 4-8 weeks for a building under 5,000 m², 2-4 months for a medium project and 4-8 months for a complex one (section 6.3). |

**Point count mismatch.** Design and consultancy apply 50-90 points per 1,000 m² to a 15,000 m² building and get 750-1,350 points. The execution page ties the same 750-1,350 points to a building of about 10,000 m² (lines 135 and 205). At the stated density, 10,000 m² gives 500-900 points.

Main's durations are in section 7 above. None of them carries over to the branch unchanged.

### 10.11 Figures and legal statements on the branch

Marketing copy only. The site presents the cost bands as "benzi de piață pentru România" ("market bands for Romania") and some savings figures as coming from independent studies. The repo contains no dataset, study reference or method behind any of them. Arithmetic examples are the site's own.

| Value | Claim, as written | Where |
|-------|-------------------|-------|
| 4-18 EUR/mp | cost of a BMS in Romania; "bandă agregată pentru retail, birouri și hoteluri fără control pe cameră" on the execution page | overview hero; execution; consultancy; design FAQ |
| 9-18 / 5-10 EUR/mp | birouri clasa A / clasa B | overview cost table; execution FAQ |
| 6-13 / 18-38 EUR/mp | hotel fără / cu control pe cameră | overview cost table; execution |
| 4-9 EUR/mp | retail | overview cost table; execution FAQ |
| 3-8 EUR/mp | industrial și logistic | overview cost table; execution FAQ |
| 30-80 EUR/mp | pharma | overview cost table; execution |
| 90-320 EUR | per punct de date, "scade cu volumul"; includes cabling, field device, panel position, programming and commissioning | overview; design; execution; integration; consultancy |
| 50-90 | puncte la 1.000 mp, birouri clasa A | overview; design; consultancy |
| 4-7% / 7-12% | din valoarea investiției pe an, întreținere Bază / Extins | overview; maintenance; consultancy |
| 5.200-15.600 EUR pe an | 10,000 m² office, system at 13 EUR/mp (about 130,000 EUR): 5,200-9,100 base, 9,100-15,600 extended | maintenance |
| 8-18% | taxa anuală de licență, din valoarea componentei software | maintenance; modernisation; consultancy |
| 40-60% | cost of a modernisation against a new system | overview; modernisation |
| 3,6-10,8 EUR/mp | modernisation of a class A office (40-60% of 9-18) | modernisation FAQ |
| 3-6 ani | payback of a capital modernisation, "conform celor 11 cazuri europene documentate de eu.bac" | overview; modernisation |
| 1-3 ani | payback of optimisation and recommissioning | modernisation |
| 5-15% | savings on total building consumption from optimisation and recommissioning, "măsurată pe peste 1.000 de proiecte" in "studii independente" | modernisation |
| 10-20% | savings on HVAC consumption "acolo unde reglajul era deficitar" | modernisation |
| 40% / 30% | two offers that "diferă cu 40% la preț"; an offer "cu 30% mai ieftină la achiziție" that can cost more over ten years | overview; consultancy |
| 15 min; 5-15 min; 15 min-1 h | trend-log resolution for electricity, indoor environment and heat | execution; integration |
| 24 de luni | minimum full-resolution retention, needed for year-on-year comparison | execution; integration; maintenance; modernisation |
| 12 luni + 12 luni | reference and comparison periods before a building's saving can be stated, with degree-day and occupancy normalisation | modernisation FAQ |
| 2-3 ani | CO2 sensors "se decalibrează în 2-3 ani" | modernisation |
| din 2017 | "partener autorizat SAUTER, Systems Partner, din 2017" | overview FAQ |

The modernisation FAQ says of its savings figures: "Sunt cifre din studii independente, nu rezultate ale proiectelor Sovitech Control." ("These are figures from independent studies, not results of Sovitech Control projects.")

**Legal statements, as the site writes them** (not checked):
- **290 kW, Legea 372/2005.** "Pragul în vigoare în dreptul român este de 290 kW putere nominală utilă a sistemelor de încălzire, climatizare și ventilare, cu termen 31.12.2024, conform Legii 372/2005 art. 27 alin. (5) și art. 29 alin. (6). Termenul este deja depășit." (consultancy FAQ).
- **70 kW, Directive 2024/1275.** "Directiva 2024/1275 art. 13 alin. (9) lit. b) coboară pragul la 70 kW cu termen 31.12.2029, dar nu este încă transpusă în dreptul român." (consultancy FAQ).
- **Legea 121/2014.** The authorised energy audit "se face de un auditor atestat" (overview "what we do not do"; consultancy exclusions).
- **NIS2.** "Nu certifică sisteme informatice și nu emite documente de conformitate NIS2" (overview).

### 10.12 What this means for the app

These notes apply `docs/guardrails.md`, version 1.3.

- **No figure here is a value.** Cost bands, point densities, maintenance percentages, paybacks and savings may not appear in the app as facts, defaults or ranges, or feed a calculation (rule 1, section 2.1). They are benchmarks. In the app a benchmark may only feed an Estimated candidate or a stage-1 "Indicative range" (rule 10), and only from an approved, versioned reference dataset. Adding such a dataset is a loosening that needs the approver's explicit approval (section 10). This file is not that dataset.
- **Life-safety wording is closer to the app's rules than on main, but not the same.** The branch excludes fire detection and alarm on the overview, design, execution and integration pages. It says the BMS takes fire-panel signals "ca informație" / "as information", and the integration page excludes fire safety systems "ca funcție de siguranță" / "as a safety function". The app's rule is stricter: life-safety systems are read-only (monitor, display, log, alarm), and fire mode is hardwired and wins (rule 11). The branch sector pages contain wording that goes further; see `sectors.md`, section B.
- **Compliance.** The consultancy service delivers a "Notă de conformare, cu prag și articol de lege" / "compliance note, with threshold and article of law". The app never attests compliance, takes legal thresholds only from reference data with their date, and keeps an obligation Unknown until the facts behind it are engineer-verified (rule 11).
- **Reuse is not assumed.** The modernisation table says what is "usually kept". In the app, reuse of existing field devices, wiring or controllers is never assumed. Until a survey, an estimate shows reuse and replacement as a range (rule 1, "Reuse").
- **Protocols.** "Un gateway nu creează funcții care nu există" matches rule 1: a building's protocols and integration point counts come from its documents, a register map or a points list, never from a capability list.
- **Who supplies what.** The branch exclusions name items that rule 10 stage 2 also asks about: communication modules from the equipment manufacturer, the panel's power supply and software licences. That is an observation only. The app's supply split comes from each project, never from this copy.
- **Reserved terms.** "conformare", "conformitate", "conform", "garantează", "certifică", "certificatele" and "ofertă" appear in the branch copy. They are on, or inflect, the reserved list (section 2.8) and cannot describe values in the app.
- **Useful vocabulary.** The branch uses Romanian terms that owner documents are likely to contain: "listă de puncte", "schemă funcțională", "secvențe de funcționare", "rezervă de puncte", "tablou de forță și automatizare", "proces-verbal de punere în funcțiune", "As-built", "trend-log", "registru de intervenții", "putere nominală utilă", "centrală de tratare a aerului", "ventiloconvector", "grinzi de răcire", "unități VAV", "contorizare pe chiriași", "fișierul de proiect ETS". The glossary must still come from reference data, not from this file (rule 8).
