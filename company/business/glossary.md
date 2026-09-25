# SOVITECH website glossary (Romanian-English)

This is a bilingual list of the BMS and building terms used on the SOVITECH website, with a short English definition and where each term appears. It helps people read the website, owner documents and this app's specs side by side. It is not the Romanian glossary reference dataset that the app must use to expand abbreviations (`docs/guardrails.md` rule 8 and section 2.1).

- **Source:** the `sovitech-website` repository, commit `e0806142735dbdd53b913af30102f9227b380475` (2026-08-11). Paths in "Where used" are relative to that repository's root. They give examples, not every occurrence.
- **Read on:** 2026-09-23.
- **Definitions:**
  - A definition marked **site** restates the website's own description of the term.
  - All other definitions are short working glosses written for this file, from how the site uses the term and its common industry meaning. They are not reference data.
  - Where the site's use is unclear, the entry says so.
- **SAUTER product families** (section 13) are listed as names only, without definitions.
- **How the app may use this file:** as a reading aid. Abbreviation expansion, standard names and editions, and SAUTER product names in the app come only from versioned reference data reviewed by an engineer (rules 1, 8 and 11). This file is not that data.
- **Related files:** `company/brand/voice-and-messaging.md` covers the copy itself, and `company/business/sectors.md` covers the sectors.

---

## 1. The system and its control layer

| Romanian | English | Definition | Where used |
|----------|---------|------------|------------|
| BMS; sistem de management al clădirii | BMS; building management system | The central system that monitors and controls a building's technical systems (HVAC, lighting, energy and others) from one platform. | Site-wide. The long form is in `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` ("sistem centralizat de management al clădirii (BMS)"). |
| automatizarea clădirilor | building automation | Automatic control of building systems. The site uses it as a near-synonym of BMS. | `app/page.tsx`, `app/resurse/page.tsx` |
| platformă unificată; o singură platformă | unified platform; single platform | One interface where data and control from all integrated systems come together. | `app/servicii/page.tsx`, `lib/sector-data.ts` |
| SCADA; BMS / SCADA centralizat | SCADA; centralised BMS / SCADA | Supervisory control and data acquisition: the supervisory software layer above the controllers. The site uses it both for the BMS supervision layer and for industrial process systems. | `app/servicii/page.tsx`, `app/cerere-oferta/page.tsx`, `lib/sector-data.ts` |
| HMI | HMI | Human-machine interface: the operator screens. | `app/servicii/page.tsx` |
| interfață de supervizare | supervision interface | **site:** the SCADA / HMI graphic interface tailored to the building, with floor plans, synoptics, trend charts and reports. | `app/servicii/page.tsx` |
| sinoptic (pl. sinoptice) | synoptic | A schematic screen showing a plant or system with live values. | `app/servicii/page.tsx` |
| server BMS | BMS server | The central computer running the BMS software. | `app/servicii/page.tsx` |
| stație de automatizare | automation station | A programmable controller that runs the control logic for a plant or area. | `lib/product-data.ts` ("Stații Automatizare modulo 6") |
| stație de automatizare cameră | room automation station | A controller for individual rooms. | `lib/product-data.ts` ("Stații Automatizare Cameră ecos") |
| automatizare camere | room automation | Control of conditions in individual rooms, often linked to occupancy or a hotel PMS. | `app/cerere-oferta/page.tsx` |
| controller; controler | controller | A device that reads inputs and drives outputs according to programmed logic. The site spells it both ways. | `app/servicii/executie/page.tsx` ("controllere"), `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` ("controlere") |
| regulator | controller | A controller for a specific function. The site uses it in product-family names only. | `lib/product-data.ts` ("Regulatoare VAV Compacte", "Regulatoare Încălzire equitherm") |
| PLC; PLC-uri | PLC | Programmable logic controller. | `app/produse/page.tsx` (category "Controllere & PLC"), `app/servicii/integrare/page.tsx` |
| modul I/O; module I/O | I/O module | A module that adds physical inputs and outputs to a controller. | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`, `lib/product-data.ts` |
| unitate de cameră | room unit | A wall device in a room for reading or adjusting conditions. | `lib/product-data.ts` ("Unități Cameră Cablate ecoUnit") |
| unitate de operare; panouri operare | operating unit; operating panels | A local display and keypad for a controller or panel. | `lib/product-data.ts`, `app/produse/page.tsx` |
| tablou de automatizare | automation panel; control panel | The cabinet that houses controllers, I/O and power for a plant. English copy uses both "Control panels" and "automation panels". The guardrails glossary maps TA/TAC to automation panel. | `app/servicii/executie/page.tsx`, `app/servicii/page.tsx` |
| gateway; gateway-uri | gateway | A device that translates between protocols so a third-party system can talk to the BMS. | `app/servicii/integrare/page.tsx`, `app/servicii/page.tsx` |
| convertor de protocol | protocol converter | Same role as a gateway. | `app/servicii/page.tsx` |
| echipamente de teren | field equipment; field devices | Sensors, actuators, meters and similar devices installed in the plant. | `app/servicii/integrare/page.tsx`, `app/servicii/page.tsx` |
| punct de măsură (și control) | measurement (and control) point | One monitored or controlled signal. The site does not say whether it means a hardware I/O point, an integration point or a virtual point (see 12.7). | `app/servicii/proiectare/page.tsx`, `app/servicii/page.tsx`, `app/servicii/mentenanta/page.tsx` |
| puncte de integrare | integration points | Data points read from, or written to, a third-party system over a protocol. | `app/servicii/integrare/page.tsx`, `app/servicii/page.tsx` ("Harta completa a punctelor de integrare") |
| puncte de monitorizare | monitoring points | Points the BMS monitors. Type not stated. | `components/case-study-slider.tsx` ("200+ Puncte monitorizare") |
| setpoint; setpoint-uri; seturi de puncte | setpoint | The target value a control loop holds, for example a room temperature. One page renders "setpoints" as "seturi de puncte". | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`, `app/servicii/page.tsx` |
| algoritmi PID | PID algorithms | Standard feedback control (proportional, integral, derivative). | `app/servicii/page.tsx` |
| programe orare | time schedules; scheduling | Time-based switching of plant and setpoints. | `app/servicii/page.tsx`, `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| scenarii de automatizare | automation scenarios | Predefined sequences of actions, for example a room scene or an opening routine. | `app/servicii/executie/page.tsx`, `app/servicii/integrare/page.tsx` |
| alarme; gestionarea alarmelor | alarms; alarm management | Notifications when a value leaves its limits or a device fails, and the handling of them. | `app/servicii/page.tsx` |
| grafice de tendință; logarea tendințelor | trend charts; trend logging | Stored time series of values, shown as charts. | `app/servicii/page.tsx`, `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` |
| control pe zone; automatizare HVAC pe zone | zone control; zoned HVAC automation | Separate control of each area of a building. | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` |
| regim redus; reducere la neocupare | setback | A lower comfort level when an area is empty, by schedule or by occupancy. | `lib/sector-data.ts` ("Regimuri reduse automate în vacanțe" / "setback scheduling"), `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` ("occupancy-based HVAC setback") |
| software BMS | BMS software | A product category on the site. It covers engineering and supervision software. | `app/produse/page.tsx` |
| monitorizare remote; monitorizare de la distanță | remote monitoring | Watching BMS alarms and values from outside the building. | `app/servicii/page.tsx`, `lib/sector-data.ts` |

## 2. HVAC and plant

| Romanian | English | Definition | Where used |
|----------|---------|------------|------------|
| HVAC; încălzire, ventilație, climatizare | HVAC; heating, ventilation, cooling | **site:** "HVAC (încălzire, ventilație, climatizare)". | `app/cerere-oferta/page.tsx`, site-wide |
| climatizare | air conditioning; climate control | Cooling or conditioning of air. The site also uses it loosely for climate control. | `app/resurse/referinte/page.tsx`, `lib/sector-data.ts` |
| ventilație | ventilation | Supply and extraction of air. | site-wide |
| CTA; CTA-uri | AHU; air handling unit | A unit that filters, heats or cools, and moves air. The Romanian pages write "CTA-uri" where the English reads "AHUs". The guardrails glossary maps CTA/UTA to AHU. | `lib/sector-data.ts` |
| AHU; AHU-urile | AHU | The English abbreviation, used directly in Romanian copy. | `app/servicii/page.tsx` |
| chiller; chillere | chiller | A machine that produces chilled water for cooling. | `app/servicii/page.tsx`, `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` |
| centrală termică | boiler plant | The heat-generating plant. English copy reads "boiler plant". The guardrails glossary maps CT to boiler room (see 12.4). | `app/servicii/page.tsx` |
| cazan; cazane | boiler | A heat generator. | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` |
| pompe | pumps | Circulation pumps in heating and cooling circuits. | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` |
| ventiloconvector | fan coil unit | A room unit with a fan and a coil for heating or cooling. The site uses the full word, not the abbreviation VCV. | `lib/product-data.ts` ("Termostate Cameră Ventiloconvectoare") |
| VAV | VAV; variable air volume | Air distribution that varies the airflow to each zone. | `lib/product-data.ts` ("Regulatoare VAV Compacte") |
| instalații frigorifice; vitrine frigorifice | refrigeration; refrigerated display cases | Commercial refrigeration, mainly in retail. | `lib/sector-data.ts` |
| apă caldă | hot water | Domestic hot water. | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| camere curate | clean rooms | Rooms with controlled particle levels, used in pharma and hospitals. | `lib/sector-data.ts` |
| presiune diferențială | differential pressure | The pressure difference between two points or rooms. It is held in clean rooms and measured across filters and fans. | `lib/sector-data.ts`, `lib/product-data.ts` |
| schimburi de aer pe oră | air changes per hour | Air volume supplied per hour divided by room volume. | `lib/sector-data.ts` |
| filtre HEPA | HEPA filters | High-efficiency particulate air filters. | `lib/sector-data.ts` |
| calitatea aerului; CO2 | air quality; CO₂ | Indoor air quality, often tracked by CO₂ concentration. | `lib/sector-data.ts`, `lib/product-data.ts` ("Senzori Calitate Aer") |
| piscine; spa | pools; spa | Wellness plant with its own heating, humidity and ventilation control. | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`, `lib/sector-data.ts` |

## 3. Field devices

| Romanian | English | Definition | Where used |
|----------|---------|------------|------------|
| senzor; senzori | sensor | A device that measures a physical value. | site-wide |
| senzori ambient | ambient sensors | A product category. On the site it holds the temperature, humidity, air-quality and viaSens sensors, the humidistats and the frost monitors. | `app/produse/page.tsx`, `lib/product-data.ts` |
| senzori presiune | pressure sensors | A product category. On the site it holds the pressure switches, pressure transmitters and air flow sensors. | `app/produse/page.tsx`, `lib/product-data.ts` |
| traductor de presiune | pressure transmitter | A sensor that outputs a continuous pressure signal. | `lib/product-data.ts` ("Traductoare Presiune") |
| presostat; presostat diferențial | pressure switch; differential pressure switch | A switch that changes state at a set pressure or pressure difference. | `lib/product-data.ts` |
| higrostat | humidistat | A switch that acts on humidity. | `lib/product-data.ts` ("Higrostate HSC și HBC") |
| termostat | thermostat | A temperature switch or simple room controller. | `lib/product-data.ts`, `app/ghid-bms/quiz/page.tsx` |
| monitor antiîngheț | frost monitor | A device that protects coils from freezing. | `lib/product-data.ts` ("Monitoare Antiîngheț TFL") |
| senzor debit aer | air flow sensor | A sensor that measures air flow. | `lib/product-data.ts` |
| debitmetru; debitmetre | flow meter | A device that measures fluid flow. | `app/servicii/page.tsx` |
| actuator; actuatoare; actuatori | actuator | A device that moves a valve or damper on a control signal. The site uses both plural forms. | `app/servicii/executie/page.tsx`, `app/produse/page.tsx` |
| servomotor; servomotoare | actuator (motorised) | Used in product-family names for motorised actuators. | `lib/product-data.ts` ("Servomotoare Liniare AVM/AVN") |
| servomotor cu revenire arc | spring-return actuator | An actuator that returns to a safe position on power loss. | `lib/product-data.ts` |
| vană; vane; vane de reglare | valve; control valve | A valve that regulates water flow. Product families split them into flanged and threaded. | `app/servicii/executie/page.tsx`, `lib/product-data.ts` |
| robinet cu bilă | ball valve | A quarter-turn valve with a ball. | `lib/product-data.ts` ("Robinete Cu Bilă") |
| vană de echilibrare | balancing valve | A valve that sets the design flow in a hydronic circuit. | `lib/product-data.ts` ("Vane Echilibrare Valveco VDL") |
| clapetă; clapete | damper (air) | An air-side blade that regulates or shuts off airflow. English copy reads "dampers". See 12.3 for the valve sense. | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`, `lib/product-data.ts` ("Actuatori Clapete Și Rotativi") |
| clapetă fluture | butterfly valve (water) | Here "clapetă" is a water valve, not an air damper. | `lib/product-data.ts` ("Vane Rotative Clapete Fluture" / "Rotary Valves and Butterfly Valves") |
| surse de alimentare; alimentare | power supplies; power | Power supplies for controllers and field devices. "Alimentare" is also a spec label meaning supply voltage. | `lib/product-data.ts`, `components/product-detail.tsx` |
| distribuitoare semnale comandă | control signal distributors | Devices that split one control signal to several actuators. | `lib/product-data.ts` |

## 4. Protocols and interfaces

| Romanian | English | Definition | Where used |
|----------|---------|------------|------------|
| BACnet (IP, MS/TP) | BACnet (IP, MS/TP) | **site:** the standard protocol for communication between BMS equipment. SOVITECH supports BACnet IP and MS/TP. | `app/servicii/integrare/page.tsx`, `app/servicii/page.tsx` |
| KNX; KNX/EIB; KNX TP | KNX; KNX/EIB; KNX TP | **site:** a European standard for building automation, ideal for lighting and blind control. EIB is its predecessor name. TP is the twisted-pair medium. | `app/servicii/integrare/page.tsx`, `app/servicii/page.tsx` |
| Modbus (RTU, TCP) | Modbus (RTU, TCP) | **site:** an industrial protocol for communication with field equipment, meters and PLCs. RTU runs over serial lines, TCP over Ethernet. | `app/servicii/integrare/page.tsx` |
| M-Bus | M-Bus | **site:** a protocol for reading utility meters: electricity, water, gas, heat. | `app/servicii/integrare/page.tsx` |
| DALI; DALI-2 | DALI; DALI-2 | A lighting control protocol. **site:** "DALI (iluminat)". See 12.5 for the other meaning of DALI. | `app/servicii/integrare/page.tsx`, `app/servicii/page.tsx` |
| LON; LonMark | LON; LonMark | LON is the LonWorks fieldbus. LonMark is the association behind its interoperability label. The site lists the names only. | `app/servicii/page.tsx`, `components/partners-marquee.tsx` |
| OPC UA; OPC-UA | OPC UA | An industrial data-exchange standard. | `app/servicii/integrare/page.tsx`, `app/servicii/page.tsx` |
| EnOcean | EnOcean | A wireless, often battery-free, radio standard for room devices. | `lib/product-data.ts` ("Unități Cameră EnOcean ecoUnit") |
| API REST | REST API | A web interface for exchanging data with modern systems. | `app/servicii/page.tsx` |
| dispozitive IoT | IoT devices | Network-connected devices outside the classic fieldbuses. | `app/servicii/page.tsx` |
| protocoale deschise | open protocols | Published, vendor-independent protocols (the site names BACnet, Modbus, KNX, DALI and M-Bus). | `app/servicii/page.tsx`, `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| integrare multi-protocol | multi-protocol integration | Connecting systems that use different protocols into one BMS. | `app/servicii/page.tsx` |
| Protocol / Semnal | Protocol / Signal | A product spec label: the communication protocol or the analogue signal type. | `components/product-detail.tsx` |

The guardrails treat interfaces strictly. A device's protocol is a document value only when a document names it. Phrases such as "pregătit pentru BMS" name no protocol (rule 1). The website's protocol list describes SOVITECH's capability, not any building's equipment.

## 5. Metering, energy and KPIs

| Romanian | English | Definition | Where used |
|----------|---------|------------|------------|
| contorizare | metering | Measuring consumption with meters. | `app/servicii/integrare/page.tsx`, `lib/sector-data.ts` |
| contor; contoare de utilități | meter; utility meters | Meters for electricity, water, gas or heat. | `app/servicii/integrare/page.tsx` |
| subcontor; subcontoare | sub-meter | A meter below the utility meter that measures one area or system. | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| consum pe circuit | circuit-level consumption | Energy measured per electrical circuit. | `app/servicii/page.tsx` |
| prize | sockets; plug loads | Energy used by socket outlets, reported as its own category. | `app/servicii/page.tsx` |
| hartă termică | heat map | A floor-plan view coloured by temperature. | `app/servicii/page.tsx` |
| kWh; kcal; m3 | kWh; kcal; m³ | Units in energy reports. **site:** "kWh, kcal, m3". kcal is a legacy energy unit. m³ is a volume and becomes energy only with a calorific value (guardrails rule 8). | `app/servicii/page.tsx` |
| kWh/mp/an; kWh/m²/an | kWh/m²·a | Energy use per square metre per year. The site never states the area basis. | `app/resurse/articole/optimizare-hotel-bms/page.tsx`, `app/ghid-bms/page.tsx` |
| GWh/an | GWh/a | Annual energy in gigawatt-hours. | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| intensitatea consumului energetic (EUI) | energy use intensity (EUI) | **site:** kWh per square metre, or per room-night, per year. | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| cost energetic per cameră ocupată (ECOR) | energy cost per occupied room (ECOR) | **site:** total energy spend divided by occupied room-nights. | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| COP; coeficient de performanță | COP; coefficient of performance | Useful heating or cooling output divided by energy input. **site:** cited for chillers. | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| baseline ajustat la vreme | weather-adjusted baseline | A reference consumption corrected for weather, for comparing before and after. | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| vârf de consum; managementul vârfurilor | peak demand; peak demand management | The highest power draw and its reduction. | `lib/sector-data.ts` |
| deplasarea sarcinilor | load shifting | Moving consumption to other times. | `lib/sector-data.ts` |
| demand response | demand response | Reducing or shifting load on a grid or tariff signal. Used untranslated in Romanian. | `lib/sector-data.ts` |
| amprenta de carbon; reducere CO₂ | carbon footprint; CO₂ reduction | Greenhouse-gas emissions linked to the building's energy use. | `app/calculator-roi/page.tsx`, `app/resurse/referinte/page.tsx` |
| raportare energetică | energy reporting | Periodic consumption reports by category. | `lib/sector-data.ts`, `app/resurse/referinte/page.tsx` |

## 6. Delivery, documents and acceptance

| Romanian | English | Definition | Where used |
|----------|---------|------------|------------|
| audit; audit tehnic; audit energetic | audit; technical audit; energy audit | A survey of existing systems or of energy use. The site uses "audit" loosely for both. | `app/servicii/page.tsx`, `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| caiet de sarcini; caiet de sarcini funcțional | technical specification; functional specification | **site:** the functional requirements agreed with the client: what is controlled and monitored, which alarms are needed and which reports are generated. On the offer-request page, "caiete de sarcini" means specifications in general. | `app/servicii/page.tsx`, `app/servicii/proiectare/page.tsx`, `app/cerere-oferta/page.tsx` |
| proiect tehnic | technical design | **site:** the architecture diagram, cabling plans, SAUTER equipment lists, automation logic and standards documentation. See 12.6 for "PT". | `app/servicii/page.tsx` |
| PAC + DDE | PAC + DDE | Not defined on the site ("Proiect tehnic complet (PAC + DDE)"). In Romanian construction practice, PAC usually means the design for the building permit and DDE the construction details. SOVITECH should confirm what it means here. | `app/servicii/page.tsx` |
| listă echipamente; bill of materials | equipment list; bill of materials | The list of devices and quantities for a project. | `app/servicii/page.tsx`, `app/servicii/proiectare/page.tsx` |
| scheme electrice și de cablaj | electrical and cabling diagrams | Wiring drawings for panels and field devices. | `app/servicii/page.tsx` |
| planuri de amplasare | layout plans | Drawings showing where devices go. | `app/servicii/proiectare/page.tsx` |
| cablaj structurat; trasee de cabluri | structured cabling; cable routes | Planned cable installation and its routes. | `app/servicii/page.tsx` |
| antreprenor general; specialități | general contractor; trades | The main contractor, and the other installation disciplines (electrical, HVAC, construction). | `app/servicii/page.tsx` |
| spații tehnice; camere tehnice | technical spaces; technical rooms | Plant rooms and service spaces. | `app/servicii/page.tsx`, `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` |
| execuție; instalare; montaj | execution; installation; mounting | Building the system on site. The site's English uses "Execution", "Installation" and "System Installation" for the same service. | `app/servicii/executie/page.tsx`, `components/header.tsx` |
| punere în funcțiune | commissioning | Testing and starting up the installed system. | `app/servicii/executie/page.tsx`, `components/services-showcase.tsx` |
| FAT; SAT | FAT; SAT | Factory acceptance test and site acceptance test. **site:** functional testing of every measurement and control point. | `app/servicii/page.tsx` |
| recepție; rapoarte de recepție | acceptance; acceptance reports | Formal handover acceptance of the work. | `app/servicii/executie/page.tsx` |
| proces-verbal de recepție | acceptance certificate (acceptance protocol) | The signed record of acceptance. The site's English reads "acceptance certificate". | `app/servicii/page.tsx` |
| documentație as-built | as-built documentation | Drawings and records of the system as actually installed. | `app/servicii/page.tsx` |
| instruire; training; predare | training; handover | Training the client's staff and handing over documentation. | `app/servicii/executie/page.tsx` |
| garanție | warranty | The warranty period. The site states different periods per package (see `company/brand/voice-and-messaging.md`, 5.3). | `app/servicii/page.tsx`, `app/servicii/executie/page.tsx` |
| construcție nouă; retrofit / modernizare; upgrade; extindere | new build; retrofit / modernisation; upgrade; extension | The project types on the offer-request form. | `app/cerere-oferta/page.tsx` |
| migrare | migration | Moving from another BMS to SAUTER. | `app/servicii/page.tsx`, `app/servicii/mentenanta/page.tsx` |
| cerere ofertă | request for a quote | The site's main call to action. "ofertă" is a reserved term in the app (guardrails 2.8). | `components/header.tsx`, `app/cerere-oferta/page.tsx` |

## 7. Services and maintenance

| Romanian | English | Definition | Where used |
|----------|---------|------------|------------|
| proiectare BMS | BMS design | The design service. | `app/servicii/proiectare/page.tsx` |
| integrare sisteme | systems integration | Connecting third-party systems to the BMS. | `app/servicii/integrare/page.tsx` |
| mentenanță preventivă | preventive maintenance | Scheduled periodic checks. **site:** quarterly or twice-yearly visits. | `app/servicii/mentenanta/page.tsx`, `app/servicii/page.tsx` |
| mentenanță corectivă | corrective maintenance | Repair after a fault. | `app/servicii/mentenanta/page.tsx` |
| mentenanță predictivă | predictive maintenance | Maintenance planned from monitored data before a fault occurs. | `components/services-showcase.tsx`, `lib/sector-data.ts` |
| service la cerere | on-demand service | Service ordered case by case. | `app/servicii/mentenanta/page.tsx` |
| contract full-service | full-service contract | A contract that covers all maintenance. "Full Service" is also the name of a package. | `app/servicii/mentenanta/page.tsx`, `app/servicii/page.tsx` |
| SLA | SLA | Service level agreement. | `app/servicii/mentenanta/page.tsx`, `app/servicii/page.tsx` |
| sistem de ticketing | ticketing system | Tracking of each support request to resolution. | `app/servicii/page.tsx` |
| timp de răspuns | response time | The time until SOVITECH responds to an emergency. | `app/servicii/mentenanta/page.tsx` |
| uptime; disponibilitate | uptime; availability | The share of time a system works. The site gives several figures and calls them guaranteed (see the voice file, 7.1). | `app/servicii/mentenanta/page.tsx`, `lib/sector-data.ts` |
| manager de cont dedicat | dedicated account manager | A named contact at SOVITECH. | `app/servicii/page.tsx`, `app/pricing/page.tsx` |

## 8. Money and performance

| Romanian | English | Definition | Where used |
|----------|---------|------------|------------|
| ROI | ROI | Return on investment. The site uses it both as a percentage and loosely as a payback time ("ROI" labelling a payback figure in `app/ghid-bms/case-studies/page.tsx`). | site-wide |
| perioadă de amortizare; amortizare | payback period | The time for savings to repay the investment. See 12.1: in Romanian accounting "amortizare" means depreciation. | `components/stats-section.tsx`, `lib/roi-calculator.ts`, `app/ghid-bms/page.tsx` |
| perioadă de recuperare a investiției | payback period | The unambiguous form of the above. | `app/ghid-bms/resurse/page.tsx`, `app/calculator-roi/page.tsx` ("Recuperare invest.") |
| economii anuale | annual savings | Savings per year. | `app/ghid-bms/calculator/page.tsx`, `components/case-study-slider.tsx` |
| beneficiu net 5 ani | net benefit over 5 years | A calculator output. | `app/calculator-roi/page.tsx` |
| cost estimat implementare; investiție inițială | estimated implementation cost; initial investment | A calculator output. The app names every investment figure's stage instead (rule 10). | `app/calculator-roi/page.tsx` |
| buget | budget | The owner's stated budget band on the offer-request form. | `app/cerere-oferta/page.tsx` |
| RON; lei; EUR | RON; lei; EUR | Currencies. "lei" is the everyday name for RON. | `app/ghid-bms/quiz/page.tsx`, `app/ghid-bms/calculator/page.tsx`, `app/calculator-roi/page.tsx` |

## 9. Buildings, areas and sectors

| Romanian | English | Definition | Where used |
|----------|---------|------------|------------|
| suprafață | area; floor area | Area, with no basis stated (see 12.8). | site-wide |
| m² construiți | built area | Area described as built. Whether it is footprint (Sc) or gross floor area (Scd) is not stated. | `app/resurse/referinte/page.tsx` |
| suprafață închiriabilă | leasable area | The area available to tenants. | `app/resurse/referinte/page.tsx` |
| suprafață de producție | production floor area | Area used for production. | `app/resurse/referinte/page.tsx` |
| spații climatizate | climate-controlled spaces | Conditioned area. | `app/resurse/studii-de-caz/therme-bucuresti/page.tsx` |
| suprafață automatizată | automated area | Area covered by BMS projects. Basis not stated. | `components/stats-section.tsx` |
| mp | m² | "metri pătrați", the Romanian abbreviation for square metres. The site uses both "mp" and "m²". English copy also uses "sqm". | `components/stats-section.tsx`, `app/resurse/articole/eficienta-bms/page.tsx` |
| HoReCa; HORECA | HoReCa | Hotels, restaurants and cafés. **site:** "Hoteluri, restaurante și facilități de agrement". | `lib/sector-data.ts`, `app/resurse/referinte/page.tsx` |
| birouri; clădire de birouri clasa A | offices; class-A office building | "clasa A" here is a real-estate quality grade. See 12.2. | `app/resurse/referinte/page.tsx`, `components/references-marquee.tsx` |
| medical & farma | medical & pharma | Hospitals, clinics and pharmaceutical production. | `components/header.tsx`, `lib/sector-data.ts` |
| retail; centru comercial; parc de retail | retail; shopping centre; retail park | Retail buildings. | `lib/sector-data.ts`, `app/resurse/referinte/page.tsx` |
| industrial & logistică; hală industrială | industrial & logistics; industrial hall | Factories, warehouses, logistics. | `app/cerere-oferta/page.tsx`, `app/ghid-bms/calculator/page.tsx` |
| educațional; campus | educational; campus | Schools and universities. | `lib/sector-data.ts` |
| centru de date | data centre | A building for IT equipment. | `app/cerere-oferta/page.tsx`, `lib/roi-calculator.ts` |
| cameră-noapte; cameră ocupată | room-night; occupied room | Hotel occupancy units used in KPIs. | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| grad de ocupare | occupancy rate | The share of rooms or space in use. | `app/calculator-roi/page.tsx` |

The site names sectors inconsistently. The header lists four sector links, with "Retail & HoReCa" pointing to the retail page (`components/header.tsx`). `lib/sector-data.ts` defines six sectors: Birouri, Medical & Farma, Retail, HoReCa & Wellness, Industrial and Educațional. The ROI calculator's industries are Hospitality, Birouri & Office, Retail & HORECA, Medical & Pharma, Industrial and Data Center (`lib/roi-calculator.ts`). `company/business/sectors.md` covers the sectors.

## 10. Other building systems

| Romanian | English | Definition | Where used | Guardrail note |
|----------|---------|------------|------------|----------------|
| iluminat; iluminat inteligent | lighting; intelligent lighting | Lighting control by presence, daylight and schedule. | `app/cerere-oferta/page.tsx`, `lib/sector-data.ts` | Emergency lighting is life-safety (rule 11). |
| jaluzele | blinds | Motorised shading. | `app/servicii/integrare/page.tsx` | |
| control acces | access control | Door access systems. | `app/servicii/page.tsx`, `lib/sector-data.ts` | Door release on escape routes is life-safety (rule 11). |
| CCTV | CCTV | Video surveillance. | `app/servicii/page.tsx`, `lib/sector-data.ts` | |
| detecție efracție | intrusion detection | Burglar alarm. | `lib/sector-data.ts` | |
| detecție incendiu; sisteme de incendiu | fire detection; fire systems | Fire detection and alarm. | `app/servicii/proiectare/page.tsx`, `app/servicii/integrare/page.tsx`, `app/cerere-oferta/page.tsx` | Life-safety. Read-only to the BMS: monitor, display, log, alarm (rule 11). |
| detecția de gaze | gas detection | Detection of dangerous gas. | `lib/sector-data.ts` | Life-safety, including shut-off (rule 11). |
| ventilație de urgență | emergency ventilation | Ventilation started in an emergency. | `lib/sector-data.ts` | Treated as life-safety control. The BMS does not activate it unless the ISU-approved fire-safety scenario says so (rule 11). |
| lifturi | lifts | Elevators. | `app/servicii/page.tsx` | Fire-fighter lifts are life-safety (rule 11). |
| UPS | UPS | Uninterruptible power supply. | `lib/sector-data.ts` | |
| sisteme critice | critical systems | Systems whose failure is serious, for example in hospitals. | `app/resurse/referinte/page.tsx` | |
| PMS | PMS | Property management system: the hotel reservation and room-status software. | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`, `lib/sector-data.ts` | |
| HIS/LIMS | HIS/LIMS | Hospital information system / laboratory information management system. | `lib/sector-data.ts` | |
| MES | MES | Manufacturing execution system. | `lib/sector-data.ts` | |
| POS | POS | Point-of-sale system in retail. | `lib/sector-data.ts` | |

## 11. Standards, certifications and schemes

These are names only. The site states no editions. The app takes standard titles, editions and legal thresholds only from reference data, and never states that a building complies (rule 11).

| Name as on the site | What it is | Where used |
|---------------------|------------|------------|
| BREEAM; BREEAM In-Use | A building sustainability assessment and certification scheme. In-Use is its version for existing buildings in operation. | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`, `lib/sector-data.ts` |
| LEED | A green building certification scheme. | `app/servicii/page.tsx`, `lib/sector-data.ts` |
| EPBD | The EU Energy Performance of Buildings Directive. | `app/resurse/page.tsx`, `app/calculator-roi/page.tsx`, `lib/sector-data.ts` |
| Green Key | An eco-label for tourism and hospitality businesses. | `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| ESG | Environmental, social and governance reporting. | `app/calculator-roi/page.tsx`, `app/servicii/page.tsx` |
| ISO 50001 | The international standard for energy management systems. | `lib/sector-data.ts` |
| ISO 14644 | The international standard series for cleanrooms and controlled environments. | `lib/sector-data.ts` |
| GMP; EU GMP Anexa 11 / Annex 11 | Good manufacturing practice for pharmaceuticals, and its EU annex on computerised systems. | `lib/sector-data.ts`, `components/case-study-slider.tsx` |
| FDA 21 CFR Part 11 | The US FDA rule on electronic records and signatures. | `lib/sector-data.ts` |
| GxP | A collective name for good-practice quality rules (GMP and related). | `lib/sector-data.ts` |
| SR EN ISO 16484 | The standard series on building automation and control systems. "SR" marks the Romanian adoption. | `app/servicii/page.tsx` |
| certificare energetică; clasa A / A+ | A building's energy performance certificate and its class. The site does not name the methodology. | `lib/sector-data.ts`, `components/aethel-testimonials.tsx` |

Not on the site, but defined in this app's guardrails: BAC efficiency class (EN ISO 52120-1:2021) and the energy certificate methodology Mc001. The site never mentions BAC classes (see 12.2).

## 12. Terms that can be misread

### 12.1 "amortizare"
In Romanian accounting, "amortizare" means depreciation. The site uses "perioadă de amortizare" and "Amortizare: 10–15 luni" to mean payback period (`components/stats-section.tsx`, `lib/roi-calculator.ts`). Owner documents such as financial statements may use it in the accounting sense.

### 12.2 "clasa A"
The site uses "clasa A" in two senses:
- a real-estate grade: "clădire de birouri clasa A" (`app/resurse/referinte/page.tsx`);
- an energy certificate class: "certificarea energetică clasa A" (`components/aethel-testimonials.tsx`) and "A+" (`lib/sector-data.ts`).

The app has a third class, the BAC efficiency class A to D (EN ISO 52120-1:2021). Rule 11 keeps the energy certificate class, the BAC class and legal obligations as separate fields.

### 12.3 "clapetă"
It usually means an air damper ("clapete" / "dampers" in `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`). In "clapetă fluture" it means a butterfly valve on water (`lib/product-data.ts`). The guardrails glossary also has "clapetă antifoc" (fire damper), which is life-safety equipment.

### 12.4 "centrală termică" and "CT"
The site writes "centrala termica" and translates it as "boiler plant" (`app/servicii/page.tsx`). The guardrails glossary maps the abbreviation CT to boiler room. "Punct termic" (a district-heating substation) is a different thing. The guardrails note that "PT" can mean punct termic or proiect tehnic.

### 12.5 "DALI"
On the site it always means the lighting protocol. The guardrails note that in Romanian project documents "DALI" can also mean documentație de avizare, a design document.

### 12.6 "proiect tehnic" and "PT"
The site uses "proiect tehnic" for SOVITECH's own BMS design deliverable (`app/servicii/page.tsx`). In owner documents, "PT" is also a design stage, and a design-stage document for an existing building is labelled "From design drawings" in the app (guardrails 2.8).

### 12.7 "puncte"
"Puncte de măsură", "puncte de monitorizare" and "puncte de integrare" are never split by type on the site. The app counts points by type: hardware I/O (AI, AO, DI, DO, UI), integration points with protocol, and virtual points. It never sums the types into one priced total (rule 8). A website point count cannot be mapped to the app's point types.

### 12.8 "suprafață"
The site never states an area basis. The app requires one: footprint (Sc), gross total (Scd), usable (Su), heated usable, or conditioned (rule 8). Website areas such as "~34.000 m² construiți" have an unknown basis.

### 12.9 "Pregătit pentru BMS"
On the site this is the name of a quiz badge, "Ready for BMS" (`app/ghid-bms/dashboard/page.tsx`). In owner documents the similar phrase "pregătit pentru BMS" describes equipment and names no protocol (guardrails rule 1).

### 12.10 "Nu este specificat"
The product pages show "Nu este specificat / Not specified" when a spec is missing (`components/product-detail.tsx`). The app's equivalents are the badges "Unknown" or "Not provided yet" (guardrails 2.8).

## 13. SAUTER product-family names

Names only, as written on the site. Casing differs between pages: the services copy writes "Modulo5/6" and "ECOS", while the product data writes "modulo 6" and "ecos". Under guardrails rule 1, SAUTER product names and lines in the app come only from reference data (the SAUTER catalogue), not from this list. The site links the SAUTER 2026–2027 catalogue on Issuu (`app/produse/page.tsx`). The manufacturer is named "Fr. Sauter AG" in the product pages' structured data (`app/produse/[id]/page.tsx`).

| Name (English form where it differs) | Where used |
|--------------------------------------|------------|
| modulo 6 (automation stations, I/O modules, connection modules, communication modules, operating unit, BACnet router) | `lib/product-data.ts` |
| Modulo5, Modulo6; "SAUTER modulo" | `app/servicii/page.tsx`, `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx` |
| modulo (power supplies) | `lib/product-data.ts` |
| ecos; ECOS (room automation stations) | `lib/product-data.ts`, `app/servicii/page.tsx` |
| ecoUnit (wired room units, EnOcean room units) | `lib/product-data.ts` |
| ecoLink (I/O modules) | `lib/product-data.ts` |
| ecosCom581 (EnOcean radio interface) | `lib/product-data.ts` |
| moduNet (communication modules) | `lib/product-data.ts` |
| SAIO 100 (I/O module) | `lib/product-data.ts` |
| equitherm (heating controllers) | `lib/product-data.ts` |
| flexotron400 RDT (controllers) | `lib/product-data.ts` |
| Valveco (dynamic systems); Valveco VDL (balancing valves) | `lib/product-data.ts` |
| viaSens (smart sensors) | `lib/product-data.ts` |
| Smart Actuator ("Servomotoare Smart Actuator") | `lib/product-data.ts` |
| EGT (temperature sensors) | `lib/product-data.ts` |
| EGH (humidity sensors) | `lib/product-data.ts` |
| TUC (universal thermostats) | `lib/product-data.ts` |
| TFL (frost monitors) | `lib/product-data.ts` |
| HSC, HBC (humidistats) | `lib/product-data.ts` |
| AVM/AVN (linear actuators) | `lib/product-data.ts` |
| AKM, AKF (rotary actuators) | `lib/product-data.ts` |
| B2KL (6-way ball valve) | `lib/product-data.ts` |
| SAUTER CASE Suite | `lib/product-data.ts`, `app/servicii/integrare/page.tsx` |
| SAUTER Vision Center | `lib/product-data.ts` |
| SAUTER Vision Services | `lib/product-data.ts` |
| Digital Services (Customer Portal, Remote Management, Gateways) | `lib/product-data.ts` |
| Mobile Building Services | `lib/product-data.ts` |

Product categories on the site (`app/produse/page.tsx`, `lib/product-data.ts`):

| Romanian | English |
|----------|---------|
| Controllere & PLC | Controllers & PLC |
| Senzori Presiune | Pressure Sensors |
| Senzori Ambient | Ambient Sensors |
| Actuatori | Actuators |
| Panouri Operare | Operating Panels |
| Software BMS | BMS Software |
| Gateway & Integrare | Gateway & Integration |
| Alimentare & Accesorii | Power & Accessories |

## 14. Third-party system names

| Name | What the site says it is | Where used |
|------|--------------------------|------------|
| Fidelio | The hotel PMS integrated at Radisson Blu București | `app/resurse/studii-de-caz/radisson-bucuresti/page.tsx`, `app/resurse/articole/optimizare-hotel-bms/page.tsx` |
| Opera | A hotel PMS. The HoReCa sector page says Radisson Blu uses Opera, which contradicts the case study. | `lib/sector-data.ts` |
