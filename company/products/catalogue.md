# SOVITECH website product catalogue (SAUTER)

This is the full list of the 178 SAUTER products that the SOVITECH website shows on its products page (`/produse`), grouped the way the website groups them: 8 categories and 53 families. It is generated from `catalogue.json` in this folder, which was parsed from the website repository at commit `e080614` (2026-08-11). It is website marketing data, not verified engineering data: read [README.md](README.md), section "Use in the app", before using any of it in the app.

Source: `lib/product-data.ts` (all product data), `components/product-detail.tsx` (spec row labels, the "Not specified" rendering, the same-family rule), `app/produse/page.tsx` (category order and filter).

## How to read an entry

- **Heading:** the SAUTER type code as the site shows it (`code`), then the English name (`nameEn`).
- **RO:** the Romanian name (`name`). The site's primary language is Romanian.
- **id:** the website slug. The product page is `/produse/<id>`.
- **Function:** the English one-sentence description (`shortDescEn`), verbatim.
- **Features:** the English feature bullets (`featuresEn`), verbatim, one sub-bullet each.
- **Model, Protocol / signal, Range, Power:** the four spec rows of the product page. English values are shown where the source has one (`specsEn`); otherwise the source value is shown unchanged, as the site does. The model row usually names one representative article code in brackets. In 21 entries it does not: 13 hold a code range, 1 holds other text, 5 name a code that is not in the entry's article codes (flagged below), and 2 have no brackets. See [README.md](README.md), "Data caveats". Use the article codes, not the model row.
- ***Not specified*** is how the site renders the source value `NU ESTE SPECIFICAT`. It means the value is not given. Treat it as Unknown, never as none or zero.
- **Article codes:** the SAUTER article numbers in `modelCodes`, split on commas and semicolons as the site does.
- **Article codes also in another entry:** shown only for the 9 entries that share an article code with another entry.
- **Image:** a relative link into `images/`. A note follows when other products use the same file, a byte-identical file, or the same picture saved as a different file (the last found by eye, `images.samePictureAcrossProducts`). An image does not prove which variant is shown.

Image files that no product uses are listed at the end, under [Products seen only as images](#images-only).

Spec values are free text written for the website. One row often mixes several quantities, number formats are mixed (`0,1 K` and `Kvs 1.6` both occur), and some rows hold a signal type or a contact rating instead of what the label says. They are not engineering values (guardrails rules 1 and 8).

## Contents

| # | Category (EN) | Category (RO, as on the site) | Families | Products |
|---|---------------|-------------------------------|---------:|---------:|
| 1 | [Controllers & PLC](#cat-1) | Controllere & PLC | 5 | 11 |
| 2 | [Pressure Sensors](#cat-2) | Senzori Presiune | 3 | 13 |
| 3 | [Ambient Sensors](#cat-3) | Senzori Ambient | 6 | 23 |
| 4 | [Actuators](#cat-4) | Actuatori | 14 | 85 |
| 5 | [Operating Panels](#cat-5) | Panouri Operare | 8 | 17 |
| 6 | [BMS Software](#cat-6) | Software BMS | 6 | 6 |
| 7 | [Gateway & Integration](#cat-7) | Gateway & Integrare | 10 | 22 |
| 8 | [Power & Accessories](#cat-8) | Alimentare & Accesorii | 1 | 1 |
| | **Total** | | **53** | **178** |

- **[1. Controllers & PLC](#cat-1)** (11)
  - [1.1 equitherm Heating Controllers](#fam-1-1) (3)
  - [1.2 flexotron400 RDT Controllers](#fam-1-2) (1)
  - [1.3 Compact VAV Controllers](#fam-1-3) (2)
  - [1.4 modulo 6 Automation Stations](#fam-1-4) (2)
  - [1.5 ecos Room Automation Stations](#fam-1-5) (3)
- **[2. Pressure Sensors](#cat-2)** (13)
  - [2.1 Pressure Switches and Differential Pressure Switches](#fam-2-1) (6)
  - [2.2 Pressure Transmitters](#fam-2-2) (4)
  - [2.3 Air Flow Sensors](#fam-2-3) (3)
- **[3. Ambient Sensors](#cat-3)** (23)
  - [3.1 TFL Frost Monitors](#fam-3-1) (2)
  - [3.2 HSC and HBC Humidistats](#fam-3-2) (3)
  - [3.3 EGT Temperature Sensors](#fam-3-3) (8)
  - [3.4 Air Quality Sensors](#fam-3-4) (4)
  - [3.5 EGH Humidity Sensors](#fam-3-5) (5)
  - [3.6 viaSens Smart Sensors](#fam-3-6) (1)
- **[4. Actuators](#cat-4)** (85)
  - [4.1 Smart Actuators](#fam-4-1) (8)
  - [4.2 Fan Coil Unit Valves](#fam-4-2) (5)
  - [4.3 Unit Valve Actuators](#fam-4-3) (5)
  - [4.4 Threaded Control Valves](#fam-4-4) (4)
  - [4.5 Flanged Control Valves](#fam-4-5) (13)
  - [4.6 AVM/AVN Linear Actuators](#fam-4-6) (10)
  - [4.7 Spring-Return Actuators](#fam-4-7) (3)
  - [4.8 Valveco Dynamic Systems](#fam-4-8) (3)
  - [4.9 Valveco VDL Balancing Valves](#fam-4-9) (2)
  - [4.10 Ball Valves](#fam-4-10) (9)
  - [4.11 B2KL 6-Way Ball Valve](#fam-4-11) (1)
  - [4.12 AKM AKF Rotary Actuators](#fam-4-12) (5)
  - [4.13 Rotary Valves and Butterfly Valves](#fam-4-13) (3)
  - [4.14 Damper and Rotary Actuators](#fam-4-14) (14)
- **[5. Operating Panels](#cat-5)** (17)
  - [5.1 Fan Coil Room Thermostats](#fam-5-1) (3)
  - [5.2 TUC Universal Thermostats](#fam-5-2) (2)
  - [5.3 Modbus Fan Coil Thermostats](#fam-5-3) (1)
  - [5.4 Electronic Room Thermostats](#fam-5-4) (2)
  - [5.5 Laboratory Fume Cupboard Panel](#fam-5-5) (1)
  - [5.6 modulo 6 Operating Unit](#fam-5-6) (1)
  - [5.7 ecoUnit Wired Room Units](#fam-5-7) (4)
  - [5.8 ecoUnit EnOcean Room Units](#fam-5-8) (3)
- **[6. BMS Software](#cat-6)** (6)
  - [6.1 SAUTER Vision Center](#fam-6-1) (1)
  - [6.2 Mobile Building Services](#fam-6-2) (1)
  - [6.3 SAUTER Vision Services](#fam-6-3) (1)
  - [6.4 Digital Services Remote Management](#fam-6-4) (1)
  - [6.5 Digital Services Customer Portal](#fam-6-5) (1)
  - [6.6 SAUTER CASE Suite](#fam-6-6) (1)
- **[7. Gateway & Integration](#cat-7)** (22)
  - [7.1 Control Signal Distributors](#fam-7-1) (2)
  - [7.2 SAIO 100 I/O Module](#fam-7-2) (1)
  - [7.3 modulo 6 Connection Modules](#fam-7-3) (3)
  - [7.4 modulo 6 I/O Modules](#fam-7-4) (4)
  - [7.5 modulo 6 Communication Modules](#fam-7-5) (2)
  - [7.6 modulo 6 BACnet Router](#fam-7-6) (1)
  - [7.7 ecosCom581 EnOcean Radio Interface](#fam-7-7) (1)
  - [7.8 ecoLink I/O Modules](#fam-7-8) (4)
  - [7.9 moduNet Communication Modules](#fam-7-9) (2)
  - [7.10 Digital Services Gateways](#fam-7-10) (2)
- **[8. Power & Accessories](#cat-8)** (1)
  - [8.1 modulo Power Supplies](#fam-8-1) (1)
- **[Products seen only as images](#images-only)** (50 image files that no product uses)

<a id="cat-1"></a>

## 1. Controllers & PLC (Controllere & PLC)

11 products in 5 families. Source: `lib/product-data.ts`, entries with `category: "Controllere & PLC"`.

<a id="fam-1-1"></a>

### 1.1 equitherm Heating Controllers (Regulatoare Încălzire equitherm)

3 products.

#### EQJW 126: Heating controller with digital interface

- **RO:** Regulator de încălzire cu interfață digitală
- **id:** `eqjw-126` (site page `/produse/eqjw-126`)
- **Function:** PI heating controller with LCD display and rotary knob, for one circuit with heating curve.
- **Features:**
  - PI control of the flow temperature along a curve
  - Weekly and yearly time programs
- **Model:** SAUTER EQJW 126 (EQJW126F001)
- **Protocol / signal:** Modbus, device bus (TAP), RJ45
- **Range:** 3 Ni1000/Pt1000 inputs, 3 relay outputs
- **Power:** 230 V~, ±15%, 50...60 Hz
- **Article codes (1):** `EQJW126F001`
- **Image:** [eqjw126.png](images/eqjw126.png)

#### EQJW 146: Heating and district heating controller

- **RO:** Regulator de încălzire și termoficare
- **id:** `eqjw-146` (site page `/produse/eqjw-146`)
- **Function:** Controller for heating and district heating, with 29 plant schemes and domestic hot water preparation.
- **Features:**
  - 29 plant schemes for district heating
  - Anti-legionella and screed drying functions
- **Model:** SAUTER EQJW 146 (EQJW146F002)
- **Protocol / signal:** Modbus, device bus (TAP), RJ45
- **Range:** 2 digital inputs, 8 analogue, 7 relays
- **Power:** 230 VAC, ±15%, 50...60 Hz
- **Article codes (1):** `EQJW146F002`
- **Image:** [eqjw146.png](images/eqjw146.png)

#### EQJW 246: District heating controller with Modbus TCP/IP

- **RO:** Regulator de termoficare cu Modbus TCP/IP
- **id:** `eqjw-246` (site page `/produse/eqjw-246`)
- **Function:** District heating controller with up to three loops, graphic display and M-Bus, Modbus RTU and TCP/IP interfaces.
- **Features:**
  - Up to three independent control loops
  - M-Bus, Modbus/RTU and Modbus TCP/IP interfaces
- **Model:** SAUTER EQJW 246 (EQJW246F003)
- **Protocol / signal:** Modbus TCP/IP, Modbus/RTU, M-Bus
- **Range:** 14 configurable inputs, 9 relays, 2 Triac
- **Power:** 230 VAC ± 15%, 50…60 Hz, max. 10 VA
- **Article codes (1):** `EQJW246F003`
- **Image:** [1069541.png](images/1069541.png)

<a id="fam-1-2"></a>

### 1.2 flexotron400 RDT Controllers (Regulatoare flexotron400 RDT)

1 product.

#### RDT 405, 410: Electronic controller for simple applications

- **RO:** Regulator electronic pentru aplicații simple
- **id:** `rdt-405-410` (site page `/produse/rdt-405-410`)
- **Function:** Compact flexotron400 controller for temperature, pressure or CO2, with five control models.
- **Features:**
  - Five control models per device
  - Backlit LCD display and rotary knob
- **Model:** SAUTER RDT 405/410 (RDT410F201)
- **Protocol / signal:** 0...10 V and Triac outputs, Ni1000 inputs
- **Range:** 405: −20…60/20…100/60…140 °C; 410: 5…80 °C
- **Power:** 24 V~ ±15% or 230 V~, 50…60 Hz
- **Article codes (3):** `RDT405F201`, `RDT410F201`, `RDT410F301`
- **Image:** [rdt-flexotron400.png](images/rdt-flexotron400.png)

<a id="fam-1-3"></a>

### 1.3 Compact VAV Controllers (Regulatoare VAV Compacte)

2 products.

#### ASV205BF132*, ASV215BF132*: Compact VAV controller for air flow

- **RO:** Regulator VAV compact pentru debit de aer
- **id:** `asv205bf132-asv215bf132` (site page `/produse/asv205bf132-asv215bf132`)
- **Function:** Compact VAV controller with MEMS sensor and stepper motor, for offices, meeting rooms and hotels.
- **Features:**
  - Static Δp measurement with MEMS sensor
  - Stepper motor with torque cut-off
- **Model:** SAUTER ASV 2*5 (ASV215BF132E)
- **Protocol / signal:** RS-485: SLC and BACnet MS/TP
- **Range:** Δp 0...300 Pa, 90°, torque 5/10 Nm
- **Power:** 24 V~, ±20%, 50...60 Hz; 4,7 VA/2,5 W
- **Article codes (2):** `ASV205BF132E`, `ASV215BF132E`
- **Image:** [977149.jpg](images/977149.jpg)

#### ASV215BF152*: Compact VAV controller for laboratory and pharma

- **RO:** Regulator VAV compact pentru laborator și farma
- **id:** `asv215bf152` (site page `/produse/asv215bf152`)
- **Function:** Fast VAV controller with BLDC motor and capacitive measurement, for fume cupboards and cleanrooms.
- **Features:**
  - Capacitive differential pressure measurement
  - BLDC motor, running time 3...15 s
- **Model:** SAUTER ASV 215 (ASV215BF152D)
- **Protocol / signal:** RS-485: SLC and BACnet MS/TP
- **Range:** Δp 0...150/300 Pa, torque 10 Nm, 3...15 s
- **Power:** 24 V~, ±20%, 50...60 Hz; 19 VA/10 W
- **Article codes (2):** `ASV215BF152D`, `ASV215BF152E`
- **Image:** [vav-compact-controller-for-laboratory-and-pharmaceutical-applications.jpg](images/vav-compact-controller-for-laboratory-and-pharmaceutical-applications.jpg)

<a id="fam-1-4"></a>

### 1.4 modulo 6 Automation Stations (Stații Automatizare modulo 6)

2 products.

#### EY6AS80: BACnet automation station with web server

- **RO:** Stație de automatizare BACnet cu server web
- **id:** `ey6as80` (site page `/produse/ey6as80`)
- **Function:** Modular BACnet automation station with moduWeb Unity web server, for large HVAC installations.
- **Features:**
  - Expandable with up to 24 I/O modules
  - Integrated web server and Bluetooth interface
- **Model:** SAUTER EY6AS80 (EY6AS80F021)
- **Protocol / signal:** BACnet/IP, BACnet/SC, Modbus/RTU, MQTT, REST
- **Range:** 3200 BACnet objects, of which 1600 I/O
- **Power:** 24 VDC ±10%, ≤ 24 W at max. load
- **Article codes (2):** `EY6AS80F021`, `EY6AS80F022`
- **Image:** [1014060-1.png](images/1014060-1.png)

#### EY6AS60: Modular BACnet automation station

- **RO:** Stație de automatizare BACnet modulară
- **id:** `ey6as60` (site page `/produse/ey6as60`)
- **Function:** Modular BACnet automation station for controlling and monitoring medium-sized HVAC installations.
- **Features:**
  - Expandable with up to 24 I/O modules
  - Two switched RJ45 ports for daisy chaining
- **Model:** SAUTER EY6AS60 (EY6AS60F011)
- **Protocol / signal:** BACnet/IP, BACnet/SC, HTTP(S), MQTT, REST
- **Range:** 1600 BACnet objects, of which 800 I/O
- **Power:** 24 VDC ±10%, ≤ 24 W at max. load
- **Article codes (2):** `EY6AS60F011`, `EY6AS60F012`
- **Image:** [1101851.png](images/1101851.png)

<a id="fam-1-5"></a>

### 1.5 ecos Room Automation Stations (Stații Automatizare Cameră ecos)

3 products.

#### EY-RC 504, 505: ecos504/505 room automation station

- **RO:** Stație de automatizare de cameră ecos504/505
- **id:** `ey-rc-504-505` (site page `/produse/ey-rc-504-505`)
- **Function:** Modular automation station for up to eight rooms or eight flexible room segments.
- **Features:**
  - BACnet B-BC, B-LD and B-BBMD profiles
  - KNX, DALI, SMI, Modbus, M-Bus interfaces
- **Model:** SAUTER ecos504 (EY-RC504F001)
- **Protocol / signal:** BACnet/IP; KNX, DALI, SMI, Modbus, M-Bus
- **Range:** 8 rooms/segments, 600 BACnet objects
- **Power:** 24 VDC ±10%; 24 VAC +25%/−15%
- **Article codes (6):** `EY-RC504F001`, `EY-RC504F202`, `EY-RC504F021`, `EY-RC504F0D1`, `EY-RC505F031`, `EY-RC505F071`
- **Image:** [room-automation-station-ecos504-505.png](images/room-automation-station-ecos504-505.png). Note: byte-identical to the image of `ey-rc-514-515`.

#### EY-RC 514, 515: ecos514/515 room automation station

- **RO:** Stație de automatizare de cameră ecos514/515
- **id:** `ey-rc-514-515` (site page `/produse/ey-rc-514-515`)
- **Function:** Second-generation room automation station with multi-core processor and extended memory.
- **Features:**
  - 1.7 GHz dual-core processor, 1 GB RAM
  - Optional BACnet/SC and MQTT broker/client
- **Model:** SAUTER ecos514 (EY-RC514F001)
- **Protocol / signal:** BACnet/IP; optional BACnet/SC and MQTT
- **Range:** 8 rooms/segments, 600 BACnet objects
- **Power:** 24 VDC ±10%; 24 VAC +25%/−15%
- **Article codes (6):** `EY-RC514F001`, `EY-RC514F011`, `EY-RC514F021`, `EY-RC514F0D1`, `EY-RC515F031`, `EY-RC515F0L1`
- **Image:** [940669.png](images/940669.png). Note: byte-identical to the image of `ey-rc-504-505`.

#### EY-RC 311: ecos311 compact room controller

- **RO:** Regulator compact de cameră ecos311
- **id:** `ey-rc-311` (site page `/produse/ey-rc-311`)
- **Function:** Compact 230 V controller for fan coil units, chilled ceilings, radiators, lighting and blinds.
- **Features:**
  - BACnet B-ASC controller on MS/TP
  - Local setpoint via ecoUnit 3 room units
- **Model:** SAUTER ecos311 (EY-RC311F001)
- **Protocol / signal:** BACnet MS/TP on RS-485, plus SLC
- **Range:** 5 UI, 3 AO, 4 DO, 4 relay outputs
- **Power:** 230 V, 200…253 V, max. 14 VA
- **Article codes (1):** `EY-RC311F001`
- **Image:** [programmable-controller-ecos311.jpg](images/programmable-controller-ecos311.jpg)

<a id="cat-2"></a>

## 2. Pressure Sensors (Senzori Presiune)

13 products in 3 families. Source: `lib/product-data.ts`, entries with `category: "Senzori Presiune"`.

<a id="fam-2-1"></a>

### 2.1 Pressure Switches and Differential Pressure Switches (Presostate și Presostate Diferențiale)

6 products.

#### DSA: Compact pressure switch with fixed switching difference

- **RO:** Presostat compact cu diferență de comutare fixă
- **id:** `dsa` (site page `/produse/dsa`)
- **Function:** Compact pressure switch with fixed switching difference, with brass sensor for non-aggressive media.
- **Features:**
  - Adjustable upper switching point
  - Fixed difference, no hysteresis adjustment
- **Model:** SAUTER DSA (DSA143F002)
- **Protocol / signal:** Gold- or silver-plated contacts
- **Range:** Setting range 0.5…2.5 / 0.5…6 / 1…10 bar
- **Power:** Contact rating 10(4) A, 250 VAC
- **Article codes (3):** `DSA140F002`, `DSA143F002`, `DSA146F002`
- **Image:** [pressure-switch.jpg](images/pressure-switch.jpg)

#### DSB, DSF: Pressure monitors and switches with adjustable difference

- **RO:** Monitoare și presostate cu diferență reglabilă
- **id:** `dsb-dsf` (site page `/produse/dsb-dsf`)
- **Function:** Pressure monitors with adjustable lower switching point and switching difference, SIL 2 and marine certified.
- **Features:**
  - Adjustable lower point and difference
  - Brass (DSB) or stainless steel (DSF) sensor
- **Model:** SAUTER DSB/DSF (DSB143F001) (the code in brackets, `DSB143F001`, is not in this entry's article codes)
- **Protocol / signal:** Gold- or silver-plated contacts
- **Range:** Setting range from −1…1.5 bar to 15…40 bar
- **Power:** Contact rating 10(4) A, 250 VAC
- **Article codes (6):** `DSB138F001`, `DSB146F001`, `DSB170F001`, `DSF135F001`, `DSF146F001`, `DSF170F001`
- **Image:** [pressure-monitors-and-pressure-switches.jpg](images/pressure-monitors-and-pressure-switches.jpg)

#### DSL, DSH: SIL 2 certified pressure limiters

- **RO:** Limitatoare de presiune certificate SIL 2
- **id:** `dsl-dsh` (site page `/produse/dsl-dsh`)
- **Function:** Pressure limiters with lockout on falling (DSL) or rising (DSH) pressure, SIL 2 certified.
- **Features:**
  - Lockout on falling (DSL) or rising (DSH) pressure
  - SIL 2 certified according to IEC 61508
- **Model:** SAUTER DSL/DSH (DSL143F001)
- **Protocol / signal:** Gold- or silver-plated contacts
- **Range:** Setting range from −1…5 bar to 15…40 bar
- **Power:** Contact rating 10(4) A, 250 VAC
- **Article codes (6):** `DSL140F001`, `DSL143F001`, `DSL152F001`, `DSH127F001`, `DSH146F001`, `DSH170F001`
- **Image:** [specially-designed-pressure-limiter.jpg](images/specially-designed-pressure-limiter.jpg)

#### DFC 17B, 27B: Heavy-duty vibration-resistant pressure switch

- **RO:** Presostat robust rezistent la vibrații
- **id:** `dfc-17b-27b` (site page `/produse/dfc-17b-27b`)
- **Function:** Heavy-duty pressure switch for installations subject to vibration, with separately adjustable upper and lower switching points.
- **Features:**
  - Suitable for installations subject to vibration
  - Upper and lower points separately adjustable
- **Model:** SAUTER DFC 17B/27B (DFC17B76F001)
- **Protocol / signal:** Single-pole switch, 1 mA/6 V…10 A/400 V
- **Range:** Setting range from −1…5.0 bar to 25…50 bar
- **Power:** Contact rating 10(2) A, 400 VAC
- **Article codes (6):** `DFC17B54F001`, `DFC17B76F001`, `DFC17B96F001`, `DFC17B98F001`, `DFC27B26F002`, `DFC27B52F002`
- **Image:** [heavy-duty-pressure-switch.jpg](images/heavy-duty-pressure-switch.jpg)

#### DSD: Differential pressure switch for neutral media

- **RO:** Presostat diferențial pentru medii neutre
- **id:** `dsd` (site page `/produse/dsd`)
- **Function:** Differential pressure switch for neutral media, used in filter technology and process installations.
- **Features:**
  - Ranges 0.06…6 bar, media up to 80 °C
  - High repeatability, overload protection
- **Model:** SAUTER DSD (DSD140F002)
- **Protocol / signal:** AC/DC switching contacts
- **Range:** Differential pressure 0.06…6.0 bar
- **Power:** Contact rating 3(1) A, 250 VAC
- **Article codes (4):** `DSD134F102`, `DSD137F002`, `DSD140F002`, `DSD143F002`
- **Image:** [differential-pressure-switch.jpg](images/differential-pressure-switch.jpg)

#### DDL: Differential pressure monitor for air

- **RO:** Monitor de presiune diferențială pentru aer
- **id:** `ddl` (site page `/produse/ddl`)
- **Function:** Differential pressure monitor for air, with silicone diaphragm and adjustable upper switching point.
- **Features:**
  - Silicone diaphragm, no gas emissions
  - Setpoint visible from outside, easy mounting
- **Model:** SAUTER DDL (DDL110F001)
- **Protocol / signal:** Gold-plated contacts for 24 V~/= and 250 V~
- **Range:** 0.02…5 kPa (0.2…50 mbar)
- **Power:** Contact rating 5(0.8) A, 250 V~
- **Article codes (5):** `DDL103F001`, `DDL105F001`, `DDL110F001`, `DDL120F001`, `DDL150F001`
- **Image:** [DDL.png](images/DDL.png)

<a id="fam-2-2"></a>

### 2.2 Pressure Transmitters (Traductoare Presiune)

4 products.

#### EGP 100: Differential pressure transmitter for air

- **RO:** Traductor de presiune diferențială pentru aer
- **id:** `egp-100` (site page `/produse/egp-100`)
- **Function:** Differential pressure transmitter for gases, used for monitoring filters and ductwork.
- **Features:**
  - Measures positive, negative and differential pressures
  - Variable zero point and filter constant
- **Model:** SAUTER EGP 100 (EGP100F312)
- **Protocol / signal:** F\*01: 0...10 V; F\*02/F\*12: 0(2)...10 V
- **Range:** From ±75 Pa up to 0...1000 Pa, depending on type
- **Power:** 24 V~/=, ±20%, max. 3.0 VA
- **Article codes (5):** `EGP100F101`, `EGP100F202`, `EGP100F312`, `EGP100F412`, `EGP100F612`
- **Image:** [differential-pressure-transducer.jpg](images/differential-pressure-transducer.jpg)

#### DSU / DSI: Pressure transmitters with ceramic diaphragm

- **RO:** Traductoare de presiune cu membrană ceramică
- **id:** `dsu-dsi` (site page `/produse/dsu-dsi`)
- **Function:** Pressure transmitters with ceramic diaphragm for liquids, gases and vapours, in DSU and DSI variants.
- **Features:**
  - Robust ceramic diaphragm, low hysteresis
  - Stainless steel sensor for aggressive media
- **Model:** SAUTER DSU/DSI (DSU210F002)
- **Protocol / signal:** 0...10 V (DSU) or 4...20 mA (DSI)
- **Range:** Ranges from 0...2.5 bar to 0...25 bar
- **Power:** DSU: 24 V=/~ 0.5 W; DSI: 24 V= 0.7 W
- **Article codes (6):** `DSU203F002`, `DSU210F002`, `DSU225F002`, `DSI203F002`, `DSI210F002`, `DSI225F002`
- **Image:** [pressure-transmitter.jpg](images/pressure-transmitter.jpg)

#### DSDU / DSDI: Differential pressure transmitter for liquids

- **RO:** Traductor de presiune diferențială pentru lichide
- **id:** `dsdu-dsdi` (site page `/produse/dsdu-dsdi`)
- **Function:** Differential pressure transmitter for liquids and gases, used in filtration and thermal installations.
- **Features:**
  - Ceramic diaphragm, accuracy ≤ 1%
  - Differential pressure ranges from 0...6 bar
- **Model:** SAUTER DSDU/DSDI (DSDU103F021)
- **Protocol / signal:** 0...10 V (> 2 kΩ) or 4...20 mA
- **Range:** Δp 0...1 bar, 0...2.5 bar or 0...6 bar
- **Power:** 24 V=/~, ±20%, < 1.5 W (VA)
- **Article codes (6):** `DSDU101F021`, `DSDU103F021`, `DSDU106F021`, `DSDI101F021`, `DSDI103F021`, `DSDI106F021`
- **Image:** [894007.png](images/894007.png)

#### DDLU: Differential pressure transmitter with display

- **RO:** Traductor de presiune diferențială cu afișaj
- **id:** `ddlu` (site page `/produse/ddlu`)
- **Function:** Differential pressure transmitter with switchable measuring ranges and optional LCD display in Pascal.
- **Features:**
  - Variable, switchable measuring ranges
  - Zero point reset button
- **Model:** SAUTER DDLU (DDLU205F101)
- **Protocol / signal:** 0...10 V, 0...20 mA or 4...20 mA
- **Range:** 0...100/300/500 Pa or 0...1000/1600/2500 Pa
- **Power:** 13.5...33 V=, 24 V~, ±15%
- **Article codes (4):** `DDLU205F001`, `DDLU225F001`, `DDLU205F101`, `DDLU225F101`
- **Image:** [ddlu.png](images/ddlu.png)

<a id="fam-2-3"></a>

### 2.3 Air Flow Sensors (Senzori Debit Aer)

3 products.

#### XAFP 100: Flow probe for ventilation ductwork

- **RO:** Sondă de debit pentru tubulatură de ventilație
- **id:** `xafp-100` (site page `/produse/xafp-100`)
- **Function:** Flow probe for ventilation ductwork, picking up the differential pressure signal of the air.
- **Features:**
  - Flow-optimised profile for accuracy
  - 396 mm length, can be shortened on site
- **Model:** SAUTER XAFP 100 (XAFP100F001)
- **Protocol / signal:** *Not specified*
- **Range:** DN 80…400, measuring tolerance < 3%
- **Power:** *Not specified*
- **Article codes (1):** `XAFP100F001`
- **Image:** [flow-probe-for-ventilation-ducts.jpg](images/flow-probe-for-ventilation-ducts.jpg)

#### SVU 100: Air velocity transmitter

- **RO:** Traductor de viteză a aerului
- **id:** `svu-100` (site page `/produse/svu-100`)
- **Function:** Air velocity transmitter for laboratory fume cupboards, with a time constant below 100 ms.
- **Features:**
  - Detects flow direction reversal
  - Integrated anti-fouling filter unit
- **Model:** SAUTER SVU 100 (SVU100F005)
- **Protocol / signal:** Output 0...10 V, linear in v [m/s]
- **Range:** Measuring range 0...1.3 m/s at 0...1 Pa
- **Power:** 24 V~, -15%/+20%, 1 VA
- **Article codes (1):** `SVU100F005`
- **Image:** [air-flow-transducer.jpg](images/air-flow-transducer.jpg)

#### SGU 100: Sash position sensor

- **RO:** Senzor de poziție a ferestrei glisante
- **id:** `sgu-100` (site page `/produse/sgu-100`)
- **Function:** Sensor for the sash position of laboratory fume cupboards, for fast air flow control.
- **Features:**
  - Continuous, wear-free position measurement
  - Teach-in function and overtravel alarm
- **Model:** SAUTER SGU 100 (SGU100F010)
- **Protocol / signal:** Output 0/2...10 V, default 2...10 V
- **Range:** Usable stroke 200…800 mm or 400…1600 mm
- **Power:** 24 VAC/24 VDC ±20%, max. 4 VA
- **Article codes (2):** `SGU100F010`, `SGU100F011`
- **Image:** [575444-582x1024.jpg](images/575444-582x1024.jpg)

<a id="cat-3"></a>

## 3. Ambient Sensors (Senzori Ambient)

23 products in 6 families. Source: `lib/product-data.ts`, entries with `category: "Senzori Ambient"`.

<a id="fam-3-1"></a>

### 3.1 TFL Frost Monitors (Monitoare Antiîngheț TFL)

2 products.

#### TFL 201: Frost monitor and limiter with capillary tube

- **RO:** Monitor și limitator antiîngheț cu tub capilar
- **id:** `tfl-201` (site page `/produse/tfl-201`)
- **Function:** Frost monitor or limiter with copper capillary tube for heating coils and air ducts.
- **Features:**
  - Variants as monitor or as limiter
  - Internally adjustable switching point
- **Model:** SAUTER TFL 201 (TFL201F002)
- **Protocol / signal:** Changeover contact, terminals 1-2 and 1-4
- **Range:** Setting range −10…15 °C, differential 1.5 K
- **Power:** Contact rating 230 VAC, 10(2.5) A
- **Article codes (5):** `TFL201F002`, `TFL201F022`, `TFL201F102`, `TFL201F602`, `TFL201F622`
- **Image:** [895648.png](images/895648.png)

#### TFL 611: Continuous frost monitor with capillary sensor

- **RO:** Monitor antiîngheț continuu cu senzor capilar
- **id:** `tfl-611` (site page `/produse/tfl-611`)
- **Function:** Continuous frost monitor with active capillary sensor, 7-segment display and probe self-monitoring.
- **Features:**
  - Detects the lowest temperature over 250 mm
  - LED and 7-segment display, start function
- **Model:** SAUTER TFL 611 (TFL611F201)
- **Protocol / signal:** Outputs 0…10 V and volt-free relays
- **Range:** Measuring range 0…15 °C, setting range 1…10 °C
- **Power:** 24 V~, 10/−20%, < 6.6 VA
- **Article codes (2):** `TFL611F201`, `TFL611F601`
- **Image:** [continuous-frost-monitor-with-capillary-sensor.jpg](images/continuous-frost-monitor-with-capillary-sensor.jpg)

<a id="fam-3-2"></a>

### 3.2 HSC and HBC Humidistats (Higrostate HSC și HBC)

3 products.

#### HSC 120: Room humidistat for surface mounting

- **RO:** Higrostat de cameră cu montaj aparent
- **id:** `hsc-120` (site page `/produse/hsc-120`)
- **Function:** Surface-mounted room humidistat for controlling fans, dehumidifiers and humidifiers.
- **Features:**
  - Variable setpoint on printed % rh scale
  - Textile-tape measuring element
- **Model:** SAUTER HSC 120 (HSC120F002)
- **Protocol / signal:** Single-pole changeover microswitch
- **Range:** Setting range 30…90% rh, non-condensing
- **Power:** Contact rating 5(3) A, 250 VAC
- **Article codes (2):** `HSC120F002`, `HSC120F012`
- **Image:** [room-humidistat.jpg](images/room-humidistat.jpg)

#### HSC 101: Humidistat for panel mounting

- **RO:** Higrostat pentru montaj în panou
- **id:** `hsc-101` (site page `/produse/hsc-101`)
- **Function:** Humidistat for built-in mounting in devices, with switching point adjustment via shaft; supplied in sets of 50 pcs.
- **Features:**
  - Switching point adjustment via shaft
  - Fixed switching difference, typically 8% rh
- **Model:** SAUTER HSC 101 (HSC101F001)
- **Protocol / signal:** Single-pole changeover microswitch
- **Range:** Setting range 25…95% rh, typical Xsd 8% rh
- **Power:** Contact rating 5(3) A, 250 VAC
- **Article codes (1):** `HSC101F001`
- **Image:** [hsc101.jpg](images/hsc101.jpg)

#### HBC: Duct humidistat

- **RO:** Higrostat de tubulatură
- **id:** `hbc` (site page `/produse/hbc`)
- **Function:** Humidistat for duct or wall mounting, controlling fans, dryers and humidifiers.
- **Features:**
  - Thermally compensated measuring element
  - Printed scale for 15…95% rh setpoint
- **Model:** SAUTER HBC 111 (HBC111F001)
- **Protocol / signal:** Single-pole changeover contacts
- **Range:** Setting range 15…95% rh
- **Power:** Contact rating 5(3) A, 250 VAC
- **Article codes (2):** `HBC111F001`, `HBC112F001`
- **Image:** [duct-mounted-humidistat.jpg](images/duct-mounted-humidistat.jpg)

<a id="fam-3-3"></a>

### 3.3 EGT Temperature Sensors (Senzori Temperatură EGT)

8 products.

#### EGT 130…430: Surface-mounted room temperature sensor

- **RO:** Senzor de temperatură de cameră aparent
- **id:** `egt-130-430` (site page `/produse/egt-130-430`)
- **Function:** Room temperature sensor for surface mounting on the wall or in a flush box, with presence-button variants.
- **Features:**
  - Passive or active measuring element
  - Variants with setpoint adjuster and RGB LED
- **Model:** SAUTER EGT 330 (EGT330F103)
- **Protocol / signal:** Passive Ni500/Ni1000/Pt100/Pt1000 or 0…10 V
- **Range:** −35…70 °C passive, 0…50 °C active
- **Power:** 15…24 VDC / 24 VAC (±10%) for EGT130F032
- **Article codes (6):** `EGT330F053`, `EGT330F103`, `EGT332F103`, `EGT335F103`, `EGT430F013`, `EGT130F032`
- **Image:** [890793.png](images/890793.png)

#### EGT 386…688: Flush-mounted room temperature sensor

- **RO:** Senzor de temperatură de cameră încastrat
- **id:** `egt-386-688` (site page `/produse/egt-386-688`)
- **Function:** Passive flush-mounted temperature sensor with Gira E2 frame, for measurement in dry rooms.
- **Features:**
  - Passive room temperature measurement
  - Gira E2 frame included, for dry rooms
- **Model:** SAUTER EGT 386 (EGT386F101)
- **Protocol / signal:** Passive Ni1000, Pt1000 or NTC 10k
- **Range:** Measuring range −35…70 °C
- **Power:** *Not specified*
- **Article codes (6):** `EGT386F101`, `EGT388F101`, `EGT388F102`, `EGT486F101`, `EGT686F101`, `EGT688F101`
- **Image:** [egt386.png](images/egt386.png)

#### EGT 301: Outdoor temperature sensor

- **RO:** Senzor de temperatură de exterior
- **id:** `egt-301` (site page `/produse/egt-301`)
- **Function:** Passive Ni1000 outdoor temperature sensor for weather-compensated heating and ventilation systems.
- **Features:**
  - Passive air temperature measurement
  - IP65, surface mounting with thermal spacers
- **Model:** SAUTER EGT 301 (EGT301F103)
- **Protocol / signal:** Passive, Ni1000 (DIN 43760), 2-wire
- **Range:** Measuring range −35…90 °C
- **Power:** *Not specified*
- **Article codes (1):** `EGT301F103`
- **Image:** [881013.jpg](images/881013.jpg)

#### EGT 353…654: Cable temperature sensor

- **RO:** Senzor de temperatură de cablu
- **id:** `egt-353-654` (site page `/produse/egt-353-654`)
- **Function:** Cable temperature sensor, IP67, usable in air, in liquids with an immersion sleeve or as a contact sensor.
- **Features:**
  - Passive measuring element, IP67 protection
  - Direct connection, low time constant
- **Model:** SAUTER EGT 354 (EGT354F104)
- **Protocol / signal:** Passive Ni1000, Pt100, Pt1000, NTC 10k/22k
- **Range:** −35…100 °C PVC / −50…180 °C silicone
- **Power:** *Not specified*
- **Article codes (6):** `EGT353F103`, `EGT354F104`, `EGT355F903`, `EGT356F104`, `EGT456F102`, `EGT554F103`
- **Image:** [865651.png](images/865651.png)

#### EGT 346…447: Duct temperature sensor

- **RO:** Senzor de temperatură de canal
- **id:** `egt-346-447` (site page `/produse/egt-346-447`)
- **Function:** Duct sensor with stainless steel immersion rod, for air, gas or fluid temperatures in HVAC systems.
- **Features:**
  - Stainless steel rod resistant to moisture and corrosion
  - Usable with LW 7 sleeve up to 40 bar
- **Model:** SAUTER EGT 346 (EGT346F103)
- **Protocol / signal:** Passive Ni1000 or Pt1000, 2-wire
- **Range:** −50…160 °C; EGT 392 up to 260 °C
- **Power:** *Not specified*
- **Article codes (6):** `EGT346F103`, `EGT346F203`, `EGT347F103`, `EGT348F103`, `EGT446F103`, `EGT392F102`
- **Image:** [duct-temperature-sensor.jpg](images/duct-temperature-sensor.jpg)

#### 0391… / 0392… / 0393…: Immersion sleeves for sensors

- **RO:** Teci de imersie pentru senzori
- **id:** `0391-0392-0393-2` (site page `/produse/0391-0392-0393-2`)
- **Function:** Brass or stainless steel immersion sleeves for mounting sensors and thermostats in pipes and vessels.
- **Features:**
  - Brass (Ms) or stainless steel (V4A), LW 7 or LW 15
  - Cylindrical G½" or conical R½" thread
- **Model:** SAUTER teacă imersie (0391022100) (RO "teacă imersie" = immersion sleeve; the source has no English value)
- **Protocol / signal:** *Not specified*
- **Range:** LW 7/LW 15, 50…600 mm, 10…40 bar
- **Power:** *Not specified*
- **Article codes (6):** `0391022100`, `0391011100`, `0391022450`, `0393022200`, `0393012100`, `0392022200`
- **Image:** [teci-imersie.jpg](images/teci-imersie.jpg). Note: same file also used for `0391-0392-0393`.
- **Article codes also in another entry:** `0391022100`, `0391011100`, `0393012100` in `0391-0392-0393`.
- **Duplicate entry:** the same immersion sleeves are also listed as `0391-0392-0393` (Operating Panels). The article-code lists differ: only here `0391022450`, `0392022200`, `0393022200`; only there `0391022600`, `0392022100`, `0393022100`. The source does not say which list is right.

#### EGT 311: Strap-on temperature sensor

- **RO:** Senzor de temperatură de contact
- **id:** `egt-311` (site page `/produse/egt-311`)
- **Function:** Strap-on sensor for passive temperature measurement on pipes, with fixing strap for up to 110 mm.
- **Features:**
  - Mounting parallel or perpendicular to the pipe
  - Fixing strap and thermal paste included
- **Model:** SAUTER EGT 311 (EGT311F103)
- **Protocol / signal:** Passive, Ni1000 (DIN 43760), 2-wire
- **Range:** −35…90 °C; sensor up to 120 °C
- **Power:** *Not specified*
- **Article codes (1):** `EGT311F103`
- **Image:** [868916.png](images/868916.png)

#### EGS 100: Radiation temperature sensor

- **RO:** Senzor de temperatură radiație
- **id:** `egs-100` (site page `/produse/egs-100`)
- **Function:** Passive sensor measuring the mean value between radiation temperature and room temperature.
- **Features:**
  - Mean measurement of radiation and room temp.
  - Thin-film measuring element
- **Model:** SAUTER EGS 100 (EGS100F715)
- **Protocol / signal:** Passive, 2 × Ni500 in series or 2 × NTC 11 kΩ
- **Range:** Measuring range −35…70 °C
- **Power:** *Not specified*
- **Article codes (2):** `EGS100F715`, `EGS100F717`
- **Image:** [EGS.png](images/EGS.png)

<a id="fam-3-4"></a>

### 3.4 Air Quality Sensors (Senzori Calitate Aer)

4 products.

#### EGQ 220/222: Surface-mounted room CO2 sensor

- **RO:** Senzor de CO2 de cameră aparent
- **id:** `egq-220-222` (site page `/produse/egq-220-222`)
- **Function:** Surface-mounted room CO2 sensor for demand-controlled ventilation in meeting rooms, offices and classrooms.
- **Features:**
  - CO2 measurement with dual-beam NDIR technology
  - Variants with or without temperature sensor
- **Model:** SAUTER EGQ 222 (EGQ222F032)
- **Protocol / signal:** Active, 2 × 0…10 V, load ≥ 10 kΩ
- **Range:** CO2 0…2000 ppm; temperature −35…70 °C
- **Power:** 15…35 VDC / 19…29 VAC SELV, typ. 0,4 W
- **Article codes (2):** `EGQ220F032`, `EGQ222F032`
- **Image:** [876146.png](images/876146.png)

#### EGQ 120: Room air quality sensor

- **RO:** Senzor de calitate a aerului de cameră
- **id:** `egq-120` (site page `/produse/egq-120`)
- **Function:** Room sensor for the relative concentration of mixed VOC gases, for ventilation in restaurants and offices.
- **Features:**
  - Active VOC sensor with heated semiconductor
  - Wall mounting or mounting in a flush box
- **Model:** SAUTER EGQ 120 (EGQ120F032)
- **Protocol / signal:** Active, 0…10 V, min. load 10 kΩ
- **Range:** Ambient temperature −35…70 °C
- **Power:** 15…35 VDC / 19…29 VAC SELV, typ. 0,4 W
- **Article codes (1):** `EGQ120F032`
- **Image:** [888332.png](images/888332.png)

#### EGQ 212: Duct CO2 sensor

- **RO:** Senzor de CO2 de tubulatură
- **id:** `egq-212` (site page `/produse/egq-212`)
- **Function:** Duct sensor for CO2 and temperature, with mounting flange included, for demand-controlled ventilation.
- **Features:**
  - CO2 measurement with dual-beam NDIR technology
  - Automatic compensation of sensor drift
- **Model:** SAUTER EGQ 212 (EGQ212F032)
- **Protocol / signal:** Active, 2 × 0…10 V, min. load 10 kΩ
- **Range:** CO2 0…2000 ppm; temperature 0…50 °C
- **Power:** 15…35 VDC / 19…29 VAC, max. 2,3 W
- **Article codes (1):** `EGQ212F032`
- **Image:** [duct-transducer-co2-and-temperature.jpg](images/duct-transducer-co2-and-temperature.jpg). Note: byte-identical to the image of `egq-110`.

#### EGQ 110: Duct air quality sensor

- **RO:** Senzor de calitate a aerului de tubulatură
- **id:** `egq-110` (site page `/produse/egq-110`)
- **Function:** Duct sensor for volatile organic compounds (VOC) and temperature, with mounting flange included.
- **Features:**
  - Tin dioxide semiconductor sensor
  - Automatic calibration via built-in algorithm
- **Model:** SAUTER EGQ 110 (EGQ110F032)
- **Protocol / signal:** Active, 2 × 0…10 V, min. load 10 kΩ
- **Range:** VOC 0…100%; temperature 0…50 °C
- **Power:** 15…35 VDC / 19…29 VAC, max. 2,3 W
- **Article codes (1):** `EGQ110F032`
- **Image:** [881030.jpg](images/881030.jpg). Note: byte-identical to the image of `egq-212`.

<a id="fam-3-5"></a>

### 3.5 EGH Humidity Sensors (Senzori Umiditate EGH)

5 products.

#### EGH 120/130: Room humidity and temperature sensor

- **RO:** Senzor de umiditate și temperatură de cameră
- **id:** `egh-120-130` (site page `/produse/egh-120-130`)
- **Function:** Surface-mounted room transmitter for relative humidity and temperature, with fast capacitive measuring element.
- **Features:**
  - Fast, active capacitive measuring element
  - Continuous 0…10 V or 4…20 mA signal
- **Model:** SAUTER EGH 130 (EGH130F032)
- **Protocol / signal:** Active, 2 × 0…10 V or 2 × 4…20 mA
- **Range:** Humidity 0…100% rh; temp. 0…50 °C
- **Power:** 15…24 VDC / 24 VAC (±10%), max. 1 W
- **Article codes (2):** `EGH120F042`, `EGH130F032`
- **Image:** [891874.jpg](images/891874.jpg)

#### EGH 601: Outdoor humidity sensor

- **RO:** Senzor de umiditate de exterior
- **id:** `egh-601` (site page `/produse/egh-601`)
- **Function:** Outdoor transmitter for relative and absolute humidity, enthalpy, dew point and air temperature.
- **Features:**
  - Stainless steel mesh filter
  - IP65, for damp and dusty environments
- **Model:** SAUTER EGH 601 (EGH601F702)
- **Protocol / signal:** Active, 2 × 0…10 V, switchable 2 × 0…5 V
- **Range:** 0…100% rh; temperature −20…80 °C
- **Power:** 15…24 VDC or 24 VAC (±10%), typ. 0,4 W
- **Article codes (1):** `EGH601F702`
- **Image:** [egh601.png](images/egh601.png)

#### EGH 111/112: Duct humidity sensor

- **RO:** Senzor de umiditate de tubulatură
- **id:** `egh-111-112` (site page `/produse/egh-111-112`)
- **Function:** Duct transmitter for relative and absolute humidity, enthalpy, dew point and temperature.
- **Features:**
  - Active measurement of humidity, enthalpy, dew point
  - Fast capacitive measuring element, 140 mm probe
- **Model:** SAUTER EGH 111/112 (EGH111F032)
- **Protocol / signal:** 2 × 0…10 V, switchable to 2 × 0…5 V
- **Range:** Humidity 0...100% rh, temperature −20…80 °C
- **Power:** 15…24 VDC or 24 VAC (±10%)
- **Article codes (2):** `EGH111F032`, `EGH112F032`
- **Image:** [907394.jpg](images/907394.jpg)

#### EGH 102: Dew point monitor and transmitter

- **RO:** Monitor și traductor de punct de rouă
- **id:** `egh-102` (site page `/produse/egh-102`)
- **Function:** Dew point monitor with analogue output, for protecting chilled ceilings against condensation.
- **Features:**
  - Protects chilled ceilings from condensation
  - Latching relay with changeover contacts
- **Model:** SAUTER EGH 102 (EGH102F001)
- **Protocol / signal:** Output 0...10 V, load > 10 kΩ
- **Range:** Measuring range 70...85% rh
- **Power:** 24 V~/=, ±20%, max. 1 VA
- **Article codes (2):** `EGH102F001`, `EGH102F101`
- **Image:** [egh102.jpg](images/egh102.jpg)

#### EGH 103: Dew point monitor

- **RO:** Monitor de punct de rouă
- **id:** `egh-103` (site page `/produse/egh-103`)
- **Function:** Dew point monitor powered at 230 V, with volt-free output contact and LED indication.
- **Features:**
  - Volt-free output contact for 24 V and 230 V
  - LEDs for power and condensation formation
- **Model:** SAUTER EGH 103 (EGH103F002)
- **Protocol / signal:** Switching contact 5 A, 230 VAC
- **Range:** Switching point 95 ±4% rh, differential ~5% rh
- **Power:** 230 VAC ±10%, max. 3.5 VA
- **Article codes (2):** `EGH103F002`, `EGH103F102`
- **Image:** [egh103.jpg](images/egh103.jpg)

<a id="fam-3-6"></a>

### 3.6 viaSens Smart Sensors (Senzori Inteligenți viaSens)

1 product.

#### FMS 116, 117, 196, 197: Smart multi-parameter ceiling sensor

- **RO:** Senzor inteligent multi-parametru de tavan
- **id:** `fms-116-117-196-197` (site page `/produse/fms-116-117-196-197`)
- **Function:** Ceiling-mounted multi-sensor for air quality and the indoor environment, in a Bluetooth mesh network.
- **Features:**
  - Measures temperature, humidity, VOC, CO2
  - PIR, brightness and noise level
- **Model:** SAUTER viaSens117 (FMS117F121)
- **Protocol / signal:** Bluetooth mesh; MQTT/ETH on FMS 196, 197
- **Range:** Temperature 0…40 °C; CO2 400…2000 ppm
- **Power:** 12…34 VDC, max. 80 mA, typ. 2 W
- **Article codes (6):** `FMS116F121`, `FMS116F121A`, `FMS117F121`, `FMS196F121`, `FMS197F121`, `FMS197F121A`
- **Image:** [fms-116-117-196-197.png](images/fms-116-117-196-197.png)

<a id="cat-4"></a>

## 4. Actuators (Actuatori)

85 products in 14 families. Source: `lib/product-data.ts`, entries with `category: "Actuatori"`.

<a id="fam-4-1"></a>

### 4.1 Smart Actuators (Servomotoare Smart Actuator)

8 products.

#### AKM/AVM/ASM 115SA: Smart actuators overview

- **RO:** Prezentare generală servomotoare inteligente
- **id:** `akm-avm-asm-115sa` (site page `/produse/akm-avm-asm-115sa`)
- **Function:** The SAUTER Smart Actuator range: actuator, controller and cloud connectivity in a single device.
- **Features:**
  - Actuator, controller and cloud in one
  - Optional I/O module for sensors and pumps
- **Model:** SAUTER Smart Actuator (AKM115SAF232)
- **Protocol / signal:** BACnet, MQTT, SLC, BACnet/IP
- **Range:** Torque 8/10 Nm, force 250 (500) N, stroke 8 mm
- **Power:** 24 VAC/DC
- **Article codes (6):** `AKM115SAF232`, `AKM115SAF332`, `AVM115SAF232`, `AVM115SAF332`, `ASM115SAF232`, `ASM115SAF332`
- **Image:** [akm115sa.png](images/akm115sa.png). Note: same file also used for `akm115saf232`.
- **Article codes also in another entry:** `AKM115SAF232` in `akm115saf232`; `AKM115SAF332` in `akm115saf332`; `AVM115SAF232` in `avm115saf232`; `AVM115SAF332` in `avm115saf332`; `ASM115SAF232` in `asm115saf232`; `ASM115SAF332` in `asm115saf332`.

#### AKM115SAF232: Smart actuator for ball valves

- **RO:** Servomotor inteligent pentru robinet cu bilă
- **id:** `akm115saf232` (site page `/produse/akm115saf232`)
- **Function:** 8 Nm rotary actuator for VKR and BKR ball valves, with BACnet MS/TP, Bluetooth and Wi-Fi.
- **Features:**
  - 8 Nm torque for VKR/BKR ball valves
  - BACnet, Bluetooth LE and WLAN interfaces
- **Model:** SAUTER AKM 115SA (AKM115SAF232)
- **Protocol / signal:** BACnet MS/TP (RS-485), SLC, MQTT
- **Range:** Torque 8 Nm, rotation 90°, 35/60/120 s
- **Power:** 24 VAC/VDC −10%/+20%; max. 5 W/10 VA
- **Article codes (1):** `AKM115SAF232`
- **Image:** [akm115sa.png](images/akm115sa.png). Note: same file also used for `akm-avm-asm-115sa`.
- **Article codes also in another entry:** `AKM115SAF232` in `akm-avm-asm-115sa`.

#### AKM115SAF332: Smart ball valve actuator, BACnet/IP

- **RO:** Servomotor inteligent robinet cu bilă, BACnet/IP
- **id:** `akm115saf332` (site page `/produse/akm115saf332`)
- **Function:** 8 Nm rotary actuator for ball valves, with Ethernet switch and BACnet/IP communication.
- **Features:**
  - Ethernet switch with two RJ45 ports
  - BACnet/IP communication via Ethernet or Wi-Fi
- **Model:** SAUTER AKM 115SA (AKM115SAF332)
- **Protocol / signal:** BACnet/IP, HTTPS, NTP, DHCP, SLC
- **Range:** Torque 8 Nm, rotation 90°, 35/60/120 s
- **Power:** 24 VAC/VDC −10%/+20%; max. 5 W/10 VA
- **Article codes (1):** `AKM115SAF332`
- **Image:** [akm115sa-f332.jpg](images/akm115sa-f332.jpg)
- **Article codes also in another entry:** `AKM115SAF332` in `akm-avm-asm-115sa`.

#### AVM115SAF232: Smart actuator for 2/3-way valves

- **RO:** Servomotor inteligent pentru vane 2/3 căi
- **id:** `avm115saf232` (site page `/produse/avm115saf232`)
- **Function:** 250 N linear actuator for VUN, VUD and VUE 2-way and 3-way valves, with BACnet MS/TP and Wi-Fi.
- **Features:**
  - Tool-free mounting with union nut
  - Smart stroke adaptation with feedback
- **Model:** SAUTER AVM 115SA (AVM115SAF232)
- **Protocol / signal:** BACnet MS/TP (RS-485), SLC, MQTT
- **Range:** Force 250 (500) N, stroke 0...10 mm
- **Power:** 24 VAC/VDC −10%/+20%; max. 5 W/10 VA
- **Article codes (1):** `AVM115SAF232`
- **Image:** [avm115sa.jpg](images/avm115sa.jpg). Note: same file also used for `avm115saf332`.
- **Article codes also in another entry:** `AVM115SAF232` in `akm-avm-asm-115sa`.

#### AVM115SAF332: Smart 2/3-way valve actuator, BACnet/IP

- **RO:** Servomotor inteligent vane 2/3 căi, BACnet/IP
- **id:** `avm115saf332` (site page `/produse/avm115saf332`)
- **Function:** 250 N linear actuator for 2-way and 3-way valves, with Ethernet switch and BACnet/IP communication.
- **Features:**
  - BACnet/IP via Ethernet or Wi-Fi interface
  - Expandable with up to four I/O modules
- **Model:** SAUTER AVM 115SA (AVM115SAF332)
- **Protocol / signal:** BACnet/IP, HTTPS, NTP, DHCP, SLC
- **Range:** Force 250 (500) N, stroke 0...10 mm
- **Power:** 24 VAC/VDC −10%/+20%; max. 5 W/10 VA
- **Article codes (1):** `AVM115SAF332`
- **Image:** [avm115sa.jpg](images/avm115sa.jpg). Note: same file also used for `avm115saf232`.
- **Article codes also in another entry:** `AVM115SAF332` in `akm-avm-asm-115sa`.

#### ASM115SAF232: Smart actuator for ventilation dampers

- **RO:** Servomotor inteligent pentru clapete de ventilație
- **id:** `asm115saf232` (site page `/produse/asm115saf232`)
- **Function:** 10 Nm rotary actuator for ventilation dampers, with BACnet MS/TP, Bluetooth and Wi-Fi.
- **Features:**
  - Simple mounting with self-centring adaptor
  - Electronic torque-dependent cut-off
- **Model:** SAUTER ASM 115SA (ASM115SAF232)
- **Protocol / signal:** BACnet MS/TP (RS-485), SLC, MQTT
- **Range:** Torque 10 Nm, rotation max. 95°, 35/60/120 s
- **Power:** 24 VAC/VDC −10%/+20%; max. 5 W/10 VA
- **Article codes (1):** `ASM115SAF232`
- **Image:** [asm115sa.jpg](images/asm115sa.jpg). Note: same file also used for `asm115saf332`.
- **Article codes also in another entry:** `ASM115SAF232` in `akm-avm-asm-115sa`.

#### ASM115SAF332: Smart damper actuator, BACnet/IP

- **RO:** Servomotor inteligent pentru clapete, BACnet/IP
- **id:** `asm115saf332` (site page `/produse/asm115saf332`)
- **Function:** 10 Nm rotary actuator for air dampers, with Ethernet switch and BACnet/IP communication.
- **Features:**
  - Ethernet switch, Wi-Fi and Bluetooth LE
  - Manual operation by disengaging the gear train
- **Model:** SAUTER ASM 115SA (ASM115SAF332)
- **Protocol / signal:** BACnet/IP, HTTPS, NTP, DHCP, SLC
- **Range:** Torque 10 Nm, rotation max. 95°, 35/60/120 s
- **Power:** 24 VAC/VDC −10%/+20%; max. 5 W/10 VA
- **Article codes (1):** `ASM115SAF332`
- **Image:** [asm115sa.jpg](images/asm115sa.jpg). Note: same file also used for `asm115saf232`.
- **Article codes also in another entry:** `ASM115SAF332` in `akm-avm-asm-115sa`.

#### 05306034***, 05306053***: Power and connection cables

- **RO:** Cabluri de alimentare și conectare
- **id:** `05306034-05306053` (site page `/produse/05306034-05306053`)
- **Function:** Pre-assembled cables of 0.5…30 m for powering and connecting Smart Actuator devices.
- **Features:**
  - XLPE cables with coded connectors
  - Silicone-free and halogen-free, flame-retardant
- **Model:** SAUTER 05306034005 / 05306053005
- **Protocol / signal:** RS-485, I/O signals, SLC connection
- **Range:** Lengths 0,5…30 m, 2/3/5-pin connectors
- **Power:** 24 V power supply cables
- **Article codes (6):** `05306034000`, `05306034005`, `05306034105`, `05306053000`, `05306053005`, `05306053500`
- **Image:** [05306034-05306053.png](images/05306034-05306053.png)

<a id="fam-4-2"></a>

### 4.2 Fan Coil Unit Valves (Vane Pentru Ventiloconvectoare)

5 products.

#### VUL: 2-way unit valve, PN 16

- **RO:** Vană de unitate cu 2 căi, PN 16
- **id:** `vul` (site page `/produse/vul`)
- **Function:** 2-way unit valve, DN 10…20, for controlling fan coil units and heating zones.
- **Features:**
  - Gland replaceable under system pressure
  - Closes against the pressure, EPDM seal
- **Model:** SAUTER VUL (VUL015F310)
- **Protocol / signal:** *Not specified*
- **Range:** DN 10…20, Kvs 0,16…4,5 m³/h, PN 16
- **Power:** *Not specified*
- **Article codes (6):** `VUL010F340`, `VUL010F310`, `VUL010F300`, `VUL015F310`, `VUL015F300`, `VUL020F300`
- **Image:** [vul.jpg](images/vul.jpg)

#### BUL: 3-way unit valve, control and distribution

- **RO:** Vană de unitate cu 3 căi, reglare și distribuție
- **id:** `bul` (site page `/produse/bul`)
- **Function:** 3-way valve DN 10…20 usable as a control or distributing valve, with a bypass-tee variant.
- **Features:**
  - Tight-closing third port for distribution
  - Variant with bypass tee cast on the body
- **Model:** SAUTER BUL (BUL015F310)
- **Protocol / signal:** *Not specified*
- **Range:** DN 10…20, Kvs 0,4…5 m³/h, PN 16
- **Power:** *Not specified*
- **Article codes (6):** `BUL010F330`, `BUL010F310`, `BUL015F310`, `BUL015F300`, `BUL020F300`, `BUL010F410`
- **Image:** [3-way-unit-valve-pn-16-2.jpg](images/3-way-unit-valve-pn-16-2.jpg)

#### VUT: 2-way unit valve, adjustable Kvs

- **RO:** Vană de unitate cu 2 căi, Kvs reglabil
- **id:** `vut` (site page `/produse/vut`)
- **Function:** 2-way valve DN 10…20 with adjustable Kvs value, for fan coil units and 2-pipe systems.
- **Features:**
  - Kvs value adjustable on the valve body
  - Water quality according to VDI 2035
- **Model:** SAUTER VUT (VUT015F200)
- **Protocol / signal:** *Not specified*
- **Range:** DN 10…20, Kvs 0,2…4,5 m³/h, PN 16
- **Power:** *Not specified*
- **Article codes (6):** `VUT010F200`, `VUT010F210`, `VUT010F220`, `VUT015F200`, `VUT015F210`, `VUT020F200`
- **Image:** [vut.png](images/vut.png)

#### BUT: 3-way unit valve for control

- **RO:** Vană de unitate cu 3 căi pentru reglare
- **id:** `but` (site page `/produse/but`)
- **Function:** 3-way valve DN 10…20 for control only, with a bypass-tee variant for fan coil units.
- **Features:**
  - For use exclusively as a control valve
  - Linear, unreduced mixing port
- **Model:** SAUTER BUT (BUT010F200)
- **Protocol / signal:** *Not specified*
- **Range:** DN 10…20, Kvs 0,63…4,5 m³/h, PN 16
- **Power:** *Not specified*
- **Article codes (6):** `BUT010F200`, `BUT010F400`, `BUT010F420`, `BUT015F210`, `BUT015F400`, `BUT020F200`
- **Image:** [but.png](images/but.png)

#### BXL: 3-way unit valve, DN 25…40

- **RO:** Vană de unitate cu 3 căi, DN 25…40
- **id:** `bxl` (site page `/produse/bxl`)
- **Function:** 3-way control valve DN 25…40 in bronze, for unit circuits with higher flow rates.
- **Features:**
  - Bronze body with union nut
  - Control port open with the stem inserted
- **Model:** SAUTER BXL (BXL025F200)
- **Protocol / signal:** *Not specified*
- **Range:** DN 25…40, Kvs 6,5…9,5 m³/h, PN 16
- **Power:** *Not specified*
- **Article codes (2):** `BXL025F200`, `BXL040F200`
- **Image:** [bxl.jpg](images/bxl.jpg)

<a id="fam-4-3"></a>

### 4.3 Unit Valve Actuators (Actuatori Vane Unitate)

5 products.

#### AXT 301, 311: Thermal actuator for unit valves

- **RO:** Servomotor termic pentru vane de unitate
- **id:** `axt-301-311` (site page `/produse/axt-301-311`)
- **Function:** Thermal actuator for unit valves, underfloor heating and fan coil units, with stroke indicator.
- **Features:**
  - NC and NO versions, with first-open function
  - Visible and tactile stroke indicator
- **Model:** SAUTER AXT 301 (AXT301F110)
- **Protocol / signal:** 2-point control
- **Range:** Stroke 5,0…6,5 mm, force 100…125 N
- **Power:** 230 VAC or 24 VAC/DC, approx. 1 W
- **Article codes (6):** `AXT301F110`, `AXT301F112`, `AXT301F210`, `AXT301F212`, `AXT301HF110`, `AXT311F110`
- **Image:** [thermal-actuator-for-unit-valves-with-stroke-indicator.jpg](images/thermal-actuator-for-unit-valves-with-stroke-indicator.jpg)

#### AXS 315S: Continuous 0…10 V thermal actuator

- **RO:** Servomotor termic continuu 0…10 V
- **id:** `axs-315s` (site page `/produse/axs-315s`)
- **Function:** Thermal actuator with continuous 0…10 V control for unit valves and radiant surfaces.
- **Features:**
  - NC and NO versions with first-open function
  - 0…10 V position signal, 0.1 V resolution
- **Model:** SAUTER AXS 315S (AXS315SF102)
- **Protocol / signal:** 0…10 V control, feedback 0…10 V
- **Range:** Stroke 6,5 mm, closing force 125 N
- **Power:** 24 VAC/DC, 1,2 W
- **Article codes (2):** `AXS315SF102`, `AXS315SF202`
- **Image:** [axs315s.png](images/axs315s.png)

#### AXF 217S: Motorised actuator with positioner, IP54

- **RO:** Servomotor motorizat cu poziționer, IP54
- **id:** `axf-217s` (site page `/produse/axf-217s`)
- **Function:** Motorised actuator with positioner and automatic stroke adaptation, 160 N force, IP54 protection.
- **Features:**
  - Automatic stroke adaptation and electric reset
  - Stepper motor with electronic cut-off
- **Model:** SAUTER AXF 217S (AXF217SF404)
- **Protocol / signal:** 0(2)…10 V, 5…10 V, 0…5 V, 0(4)…20 mA
- **Range:** Stroke max. 6 mm, force 160 N
- **Power:** 24 V~/= ±15%, 5 VA under load
- **Article codes (2):** `AXF217SF404`, `AXF217SF405`
- **Image:** [axm217s.png](images/axm217s.png). Note: same file also used for `axm-217s`.

#### AXM 217: Motorised 2-point and 3-point actuator

- **RO:** Servomotor motorizat în 2 și 3 puncte
- **id:** `axm-217` (site page `/produse/axm-217`)
- **Function:** Motorised actuator for unit valves with 2-point or 3-point control, at 230 V or 24 V.
- **Features:**
  - For 2-point or 3-point controllers
  - Maintenance-free gear train, status LED
- **Model:** SAUTER AXM 217 (AXM217F200)
- **Protocol / signal:** 2-point or 3-point control
- **Range:** Nominal stroke 6,3 mm, force 120 N
- **Power:** 230 VAC 6,5 VA or 24 VAC 2,5 VA
- **Article codes (2):** `AXM217F200`, `AXM217F202`
- **Image:** [motorised-actuator.jpg](images/motorised-actuator.jpg)

#### AXM 217S: Motorised actuator with positioner, IP43

- **RO:** Servomotor motorizat cu poziționer, IP43
- **id:** `axm-217s` (site page `/produse/axm-217s`)
- **Function:** Motorised actuator with positioner and adjustable nominal stroke, powered at 24 VAC/DC, IP43.
- **Features:**
  - Direction of action 1 or 2, adjustable
  - Adjustable strokes: 3.2 / 4.3 / 6.0 mm
- **Model:** SAUTER AXM 217S (AXM217SF402)
- **Protocol / signal:** 0(2)…10 V, 5…10 V, 0…5 V, 0(4)…20 mA
- **Range:** Stroke 3,2 / 4,3 / 6,0 mm, 120…160 N
- **Power:** 24 VAC/DC ±15%, 2,5 VA / 1,5 W
- **Article codes (2):** `AXM217SF402`, `AXM217SF404`
- **Image:** [axm217s.png](images/axm217s.png). Note: same file also used for `axf-217s`.

<a id="fam-4-4"></a>

### 4.4 Threaded Control Valves (Vane Reglare Filetate)

4 products.

#### VUN: 2-way valve with male thread, PN 16

- **RO:** Vană cu 2 căi cu filet exterior, PN 16
- **id:** `vun` (site page `/produse/vun`)
- **Function:** 2-way control valve with male thread, DN 15…50, for hot or cold water in closed circuits.
- **Features:**
  - DZR cast brass body, silicone-free
  - Linear or equal-percentage characteristic
- **Model:** SAUTER VUN (VUN032F300)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 0,4…40 m³/h, PN 16
- **Power:** *Not specified*
- **Article codes (6):** `VUN015F350`, `VUN015F300`, `VUN020F300`, `VUN025F300`, `VUN032F300`, `VUN050F200`
- **Image:** [2-way-valve-with-male-thread-pn-16.jpg](images/2-way-valve-with-male-thread-pn-16.jpg)

#### BUN: 3-way valve with male thread, PN 16

- **RO:** Vană cu 3 căi cu filet exterior, PN 16
- **id:** `bun` (site page `/produse/bun`)
- **Function:** 3-way control valve with male thread, DN 15…50, also usable as a distributing valve.
- **Features:**
  - Use as control or distributing valve
  - Mixing port with linear characteristic
- **Model:** SAUTER BUN (BUN032F300)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 1…40 m³/h, PN 16
- **Power:** *Not specified*
- **Article codes (6):** `BUN015F330`, `BUN015F300`, `BUN020F300`, `BUN025F300`, `BUN032F300`, `BUN050F200`
- **Image:** [3-way-valve-with-male-thread-pn-16.jpg](images/3-way-valve-with-male-thread-pn-16.jpg)

#### V6R: 2-way valve with female thread, PN 16

- **RO:** Vană cu 2 căi cu filet interior, PN 16
- **id:** `v6r` (site page `/produse/v6r`)
- **Function:** 2-way control valve with female thread, DN 15…50, with 14 mm stroke and bronze body.
- **Features:**
  - Bronze body and seat, female G thread
  - Closes with or against the pressure
- **Model:** SAUTER V6R (V6R15F300)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 0,4…35 m³/h, PN 16
- **Power:** *Not specified*
- **Article codes (6):** `V6R15F350`, `V6R15F300`, `V6R25F300`, `V6R40F310`, `V6R50F300`, `V6R50F200`
- **Image:** [2-way-valve-with-female-thread-pn-16-el.jpg](images/2-way-valve-with-female-thread-pn-16-el.jpg)

#### B6R: 3-way valve with female thread, PN 16

- **RO:** Vană cu 3 căi cu filet interior, PN 16
- **id:** `b6r` (site page `/produse/b6r`)
- **Function:** 3-way valve with female thread, DN 15…50, for control or distribution in water circuits.
- **Features:**
  - Use as control or distributing valve
  - 14 mm stroke, control ratio > 50:1
- **Model:** SAUTER B6R (B6R25F300)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 1…35 m³/h, PN 16
- **Power:** *Not specified*
- **Article codes (6):** `B6R15F330`, `B6R15F300`, `B6R25F300`, `B6R40F310`, `B6R50F300`, `B6R50F200`
- **Image:** [3-way-valve-with-female-thread-pn-16-el.jpg](images/3-way-valve-with-female-thread-pn-16-el.jpg)

<a id="fam-4-5"></a>

### 4.5 Flanged Control Valves (Vane Reglare Cu Flanșă)

13 products.

#### VUD: 2-way flanged valve, PN 6, DN 15…50

- **RO:** Vană cu 2 căi cu flanșă, PN 6, DN 15…50
- **id:** `vud` (site page `/produse/vud`)
- **Function:** 2-way control valve, grey cast iron body, PN 6, for cold and hot water in closed circuits.
- **Features:**
  - Continuous control of cold/hot water, closed circuit
  - Brass plug with fibre-reinforced PTFE ring
- **Model:** SAUTER VUD (VUD015F320…VUD050F200)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 1.6…40 m³/h, PN 6
- **Power:** *Not specified*
- **Article codes (6):** `VUD015F320`, `VUD015F300`, `VUD020F300`, `VUD025F300`, `VUD032F300`, `VUD050F200`
- **Image:** [2-way-flanged-valve-pn-6.jpg](images/2-way-flanged-valve-pn-6.jpg). Note: byte-identical to the image of `vqe`; the same picture, as a different file, is used for `vqd`.

#### VQD: 2-way flanged valve, PN 6, DN 65…150

- **RO:** Vană cu 2 căi cu flanșă, PN 6, DN 65…150
- **id:** `vqd` (site page `/produse/vqd`)
- **Function:** 2-way valve PN 6 for large diameters DN 65…100, with stainless steel plug and metal-to-metal sealing.
- **Features:**
  - Stainless steel plug with metal-to-metal sealing
  - Stainless steel gland with double EPDM O-ring
- **Model:** SAUTER VQD (VQD065F300…VQD100F300)
- **Protocol / signal:** *Not specified*
- **Range:** DN 65…100, Kvs 63…160 m³/h, PN 6
- **Power:** *Not specified*
- **Article codes (3):** `VQD065F300`, `VQD080F300`, `VQD100F300`
- **Image:** [vqd-vqe.jpg](images/vqd-vqe.jpg). Note: the same picture, as a different file, is used for `vud`, `vqe`.

#### BUD: 3-way flanged valve, PN 6, DN 15…50

- **RO:** Vană cu 3 căi cu flanșă, PN 6, DN 15…50
- **id:** `bud` (site page `/produse/bud`)
- **Function:** 3-way valve PN 6, usable as a control or distributing valve in closed water circuits.
- **Features:**
  - Usable as control or distributing valve
  - Control port closes as the stem moves out
- **Model:** SAUTER BUD (BUD015F320…BUD050F200)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 1.6…40 m³/h, PN 6
- **Power:** *Not specified*
- **Article codes (6):** `BUD015F320`, `BUD015F300`, `BUD020F300`, `BUD025F300`, `BUD032F300`, `BUD050F200`
- **Image:** [3-way-flanged-valve-pn-6.jpg](images/3-way-flanged-valve-pn-6.jpg). Note: the same picture, as a different file, is used for `bqd`, `bqe`.

#### BQD: 3-way flanged valve, PN 6, DN 65…150

- **RO:** Vană cu 3 căi cu flanșă, PN 6, DN 65…150
- **id:** `bqd` (site page `/produse/bqd`)
- **Function:** 3-way valve PN 6 for DN 65…100, with stainless steel plug, used for water control or distribution.
- **Features:**
  - Equal-percentage control port, linear mixing
  - Stainless steel plug with metal-to-metal sealing
- **Model:** SAUTER BQD (BQD065F300…BQD100F300)
- **Protocol / signal:** *Not specified*
- **Range:** DN 65…100, Kvs 63…160 m³/h, PN 6
- **Power:** *Not specified*
- **Article codes (3):** `BQD065F300`, `BQD080F300`, `BQD100F300`
- **Image:** [bqd-bqe.jpg](images/bqd-bqe.jpg). Note: same file also used for `bqe`; the same picture, as a different file, is used for `bud`.

#### VUE: 2-way flanged valve, PN 16/10

- **RO:** Vană cu 2 căi cu flanșă, PN 16/10
- **id:** `vue` (site page `/produse/vue`)
- **Function:** 2-way valve PN 16/10, DN 15…50, for cold/hot water and low-pressure steam up to 115 °C.
- **Features:**
  - Cold/hot water and low-pressure steam ≤ 115 °C
  - Closes against or with the pressure
- **Model:** SAUTER VUE (VUE015F350…VUE050F200)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 0.4…40 m³/h, PN 16/10
- **Power:** *Not specified*
- **Article codes (6):** `VUE015F350`, `VUE015F330`, `VUE015F300`, `VUE025F300`, `VUE040F300`, `VUE050F200`
- **Image:** [vue.jpg](images/vue.jpg). Note: the same picture, as a different file, is used for `bue`.

#### VQE: 2-way flanged valve, PN 16, DN 65…150

- **RO:** Vană cu 2 căi cu flanșă, PN 16, DN 65…150
- **id:** `vqe` (site page `/produse/vqe`)
- **Function:** 2-way valve PN 16, DN 65…150, for water and low-pressure steam in closed circuits.
- **Features:**
  - Low-pressure steam up to 115 °C
  - Stainless steel gland with double EPDM O-ring
- **Model:** SAUTER VQE (VQE065F300…VQE150F300)
- **Protocol / signal:** *Not specified*
- **Range:** DN 65…150, Kvs 63…320 m³/h, PN 16
- **Power:** *Not specified*
- **Article codes (5):** `VQE065F300`, `VQE080F300`, `VQE100F300`, `VQE125F300`, `VQE150F300`
- **Image:** [2-way-flanged-valve-pn-16.jpg](images/2-way-flanged-valve-pn-16.jpg). Note: byte-identical to the image of `vud`; the same picture, as a different file, is used for `vqd`.

#### BUE: 3-way flanged valve, PN 16/10

- **RO:** Vană cu 3 căi cu flanșă, PN 16/10
- **id:** `bue` (site page `/produse/bue`)
- **Function:** 3-way valve PN 16/10, DN 15…50, for water control or distribution in closed circuits.
- **Features:**
  - Equal-percentage characteristic on the F300 variant
  - Port A–AB closes as the stem moves out
- **Model:** SAUTER BUE (BUE015F330…BUE050F200)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 1…40 m³/h, PN 16/10
- **Power:** *Not specified*
- **Article codes (6):** `BUE015F330`, `BUE015F300`, `BUE020F300`, `BUE025F300`, `BUE040F300`, `BUE050F200`
- **Image:** [3-way-flanged-valve-pn-16-10-el.jpg](images/3-way-flanged-valve-pn-16-10-el.jpg). Note: the same picture, as a different file, is used for `vue`.

#### BQE: 3-way flanged valve, PN 16, DN 65…150

- **RO:** Vană cu 3 căi cu flanșă, PN 16, DN 65…150
- **id:** `bqe` (site page `/produse/bqe`)
- **Function:** 3-way valve PN 16 for large diameters DN 65…150, with stainless steel plug and metal-to-metal sealing.
- **Features:**
  - Stainless steel plug and stem, metal-to-metal sealing
  - Usable as control or distributing valve
- **Model:** SAUTER BQE (BQE065F300…BQE150F300)
- **Protocol / signal:** *Not specified*
- **Range:** DN 65…150, Kvs 63…320 m³/h, PN 16
- **Power:** *Not specified*
- **Article codes (5):** `BQE065F300`, `BQE080F300`, `BQE100F300`, `BQE125F300`, `BQE150F300`
- **Image:** [bqd-bqe.jpg](images/bqd-bqe.jpg). Note: same file also used for `bqd`; the same picture, as a different file, is used for `bud`.

#### VUG: 2-way flanged valve, PN 25/16

- **RO:** Vană cu 2 căi cu flanșă, PN 25/16
- **id:** `vug` (site page `/produse/vug`)
- **Function:** 2-way valve PN 25/16 in nodular cast iron, for cold and hot water up to 200 °C, DN 15…150.
- **Features:**
  - Nodular cast iron body, stainless steel seat and stem
  - Maintenance-free brass gland with PTFE
- **Model:** SAUTER VUG (VUG015F374…VUG150F304)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…150, Kvs 0.16…340 m³/h, PN 25/16
- **Power:** *Not specified*
- **Article codes (6):** `VUG015F374`, `VUG015F304`, `VUG032F304`, `VUG050F304`, `VUG100F304`, `VUG150F304`
- **Image:** [2-way-flanged-valve-pn-25-16-el.jpg](images/2-way-flanged-valve-pn-25-16-el.jpg). Note: the same picture, as a different file, is used for `bug`.

#### BUG: 3-way flanged valve, PN 25/16

- **RO:** Vană cu 3 căi cu flanșă, PN 25/16
- **id:** `bug` (site page `/produse/bug`)
- **Function:** 3-way valve PN 25/16 in nodular cast iron, for control or distribution up to 200 °C.
- **Features:**
  - Nodular cast iron body, stainless steel seat and stem
  - Usable as control or distributing valve
- **Model:** SAUTER BUG (BUG015F334…BUG150F304)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…150, Kvs 1…340 m³/h, PN 25/16
- **Power:** *Not specified*
- **Article codes (6):** `BUG015F334`, `BUG015F304`, `BUG032F304`, `BUG050F304`, `BUG100F304`, `BUG150F304`
- **Image:** [3-way-flanged-valve-pn-25-16-el.jpg](images/3-way-flanged-valve-pn-25-16-el.jpg). Note: the same picture, as a different file, is used for `vug`.

#### VUP: Pressure-balanced 2-way flanged valve, PN 25

- **RO:** Vană cu 2 căi cu flanșă echilibrată, PN 25
- **id:** `vup` (site page `/produse/vup`)
- **Function:** Pressure-balanced 2-way valve, PN 25, for cold and hot water and for steam, DN 40…150.
- **Features:**
  - Pressure compensation, nodular cast iron body
  - Controls cold/hot water and steam, closed circuit
- **Model:** SAUTER VUP (VUP040F304…VUP150F304)
- **Protocol / signal:** *Not specified*
- **Range:** DN 40…150, Kvs 25…350 m³/h, PN 25
- **Power:** *Not specified*
- **Article codes (6):** `VUP040F304`, `VUP050F304`, `VUP065F304`, `VUP080F304`, `VUP100F304`, `VUP150F304`
- **Image:** [pressure-relieved-2-way-flanged-valve-pn-25-pn.jpg](images/pressure-relieved-2-way-flanged-valve-pn-25-pn.jpg)

#### VUS: 2-way flanged valve, PN 40

- **RO:** Vană cu 2 căi cu flanșă, PN 40
- **id:** `vus` (site page `/produse/vus`)
- **Function:** 2-way valve PN 40 in cast steel, for water and steam up to 260 °C in closed circuits.
- **Features:**
  - Cast steel body; stainless steel stem, seat and plug
  - Stainless steel gland with PTFE, with graphite up to 260 °C
- **Model:** SAUTER VUS (VUS015F375…VUS100F305)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…100, Kvs 0.16…160 m³/h, PN 40
- **Power:** *Not specified*
- **Article codes (6):** `VUS015F375`, `VUS015F305`, `VUS025F305`, `VUS050F305`, `VUS080F305`, `VUS100F305`
- **Image:** [vus.jpg](images/vus.jpg)

#### BUS: 3-way flanged valve, PN 40

- **RO:** Vană cu 3 căi cu flanșă, PN 40
- **id:** `bus` (site page `/produse/bus`)
- **Function:** 3-way valve PN 40 in cast steel, exclusively as a control valve in installations up to 260 °C.
- **Features:**
  - Linear control port, DN 15…100
  - For use exclusively as a control valve
- **Model:** SAUTER BUS (BUS015F225…BUS100F205)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…100, Kvs 1.6…160 m³/h, PN 40
- **Power:** *Not specified*
- **Article codes (6):** `BUS015F225`, `BUS015F205`, `BUS025F205`, `BUS050F205`, `BUS080F205`, `BUS100F205`
- **Image:** [bus.jpg](images/bus.jpg)

<a id="fam-4-6"></a>

### 4.6 AVM/AVN Linear Actuators (Servomotoare Liniare AVM/AVN)

10 products.

#### AVM 105, 115: Linear actuator 250 and 500 N

- **RO:** Servomotor liniar 250 și 500 N
- **id:** `avm-105-115` (site page `/produse/avm-105-115`)
- **Function:** Linear actuator of 250 or 500 N for VUN/BUN, VUD/BUD and VUE/BUE valves, with 2/3-point control.
- **Features:**
  - Synchronous motor with time-delayed cut-off
  - Magnetic coupling and maintenance-free gear train
- **Model:** SAUTER AVM 105/115 (AVM105F100)
- **Protocol / signal:** 2/3-point control
- **Range:** Force 250 and 500 N, stroke 0…8 mm
- **Power:** 24 V~ ±20% or 230 V~ ±15%
- **Article codes (6):** `AVM105F100`, `AVM105F120`, `AVM105F122`, `AVM115F120`, `AVM115F122`, `AVM115F901`
- **Image:** [avm-105-115.jpg](images/avm-105-115.jpg)

#### AVM 105S, 115S: SUT linear actuator 250 and 500 N

- **RO:** Servomotor liniar SUT 250 și 500 N
- **id:** `avm-105s-115s` (site page `/produse/avm-105s-115s`)
- **Function:** SUT linear actuator of 250 or 500 N, with automatic recognition of the 2/3-point or 0…10 V signal.
- **Features:**
  - SUT stepper motor, force-dependent cut-off
  - Automatic control signal recognition
- **Model:** SAUTER AVM 105S/115S (AVM105SF132)
- **Protocol / signal:** 2/3-point or 0…10 V, Ri > 100 kΩ
- **Range:** Force 250 and 500 N, stroke 0…8 mm
- **Power:** 24 V~ ±20%, 24 V= -10...20%
- **Article codes (3):** `AVM105SF132`, `AVM115SF132`, `AVM115SF901`
- **Image:** [valve-actuator-with-sauter-universal-technology-sut.jpg](images/valve-actuator-with-sauter-universal-technology-sut.jpg)

#### AVM 215: Linear actuator 500 N, stroke 8…20 mm

- **RO:** Servomotor liniar 500 N, cursă 8…20 mm
- **id:** `avm-215` (site page `/produse/avm-215`)
- **Function:** Electric actuator for 2-way and 3-way valves, intended for controllers with 2/3-point switching output.
- **Features:**
  - Drives 2-way and 3-way valves
  - Synchronous motor with electronic cut-off
- **Model:** SAUTER AVM 215 (AVM215F120R)
- **Protocol / signal:** 2/3-point control
- **Range:** Stroke 8…20 mm, actuating force 400 N
- **Power:** 230 VAC ±15%, 50…60 Hz
- **Article codes (1):** `AVM215F120R`
- **Image:** [avm-215.jpg](images/avm-215.jpg). Note: same file also used for `avm-215s`.

#### AVM 215S: SUT linear actuator 500 N, stroke 8…20 mm

- **RO:** Servomotor liniar SUT 500 N, cursă 8…20 mm
- **id:** `avm-215s` (site page `/produse/avm-215s`)
- **Function:** SUT actuator with stepper motor, automatically accepting a continuous 0…10 V signal or 2/3-point control.
- **Features:**
  - Automatic signal recognition
  - Automatic adaptation to the valve stroke
- **Model:** SAUTER AVM 215S (AVM215SF132R)
- **Protocol / signal:** 0…10 V or 2/3-point control
- **Range:** Stroke 8…20 mm, actuating force 500 N
- **Power:** 24 VAC ±20% / 24 VDC −10…20%
- **Article codes (2):** `AVM215SF132R`, `AVM215SF132-7`
- **Image:** [avm-215.jpg](images/avm-215.jpg). Note: same file also used for `avm-215`.

#### AVM 321, 322: Linear actuator 1000 N

- **RO:** Servomotor liniar 1000 N
- **id:** `avm-321-322` (site page `/produse/avm-321-322`)
- **Function:** 1000 N actuator for 2-way and 3-way valves in ventilation and air-conditioning plants.
- **Features:**
  - Direction and running time set via switches
  - Crank handle for external manual adjustment
- **Model:** SAUTER AVM 321/322 (AVM322F120)
- **Protocol / signal:** 2/3-point control
- **Range:** Force 1000 N, nominal stroke 8 or 20 mm
- **Power:** 24 V~/= or 230 V~, < 2.4 W, < 4.0 VA
- **Article codes (4):** `AVM321F110`, `AVM321F112`, `AVM322F120`, `AVM322F122`
- **Image:** [avm-321-322.png](images/avm-321-322.png). Note: same file also used for `avm-321s-322s`.

#### AVM 321S, 322S: SUT linear actuator 1000 N

- **RO:** Servomotor liniar SUT 1000 N
- **id:** `avm-321s-322s` (site page `/produse/avm-321s-322s`)
- **Function:** 1000 N SUT actuator with BLDC motor and absolute position measurement, for plant valves.
- **Features:**
  - Automatic control signal detection
  - Position retained on power failure
- **Model:** SAUTER AVM 321S/322S (AVM322SF132)
- **Protocol / signal:** 0…10 V / 4…20 mA or 2/3-point
- **Range:** Force 1000 N, nominal stroke 8 or 20 mm
- **Power:** 24 V~/=, < 1.7 W, < 3.5 VA
- **Article codes (2):** `AVM321SF132`, `AVM322SF132`
- **Image:** [avm-321-322.png](images/avm-321-322.png). Note: same file also used for `avm-321-322`.

#### AVM 322-R: Retrofit linear actuator 1000 N

- **RO:** Servomotor liniar de retrofit 1000 N
- **id:** `avm-322-r` (site page `/produse/avm-322-r`)
- **Function:** 1000 N retrofit actuator with low-profile design, for replacing drives on existing valves.
- **Features:**
  - Synchronous motor with load-dependent cut-off
  - Parallel operation of five actuators
- **Model:** SAUTER AVM 322-R (AVM322F120R)
- **Protocol / signal:** 2/3-point control
- **Range:** Force 1000 N, nominal stroke 20 mm
- **Power:** 24 V~/= or 230 V~, < 2.4 W, < 4.0 VA
- **Article codes (2):** `AVM322F120R`, `AVM322F122R`
- **Image:** [avm-322-r.jpg](images/avm-322-r.jpg). Note: same file also used for `avm-322s-r`.

#### AVM 322S-R: SUT retrofit linear actuator

- **RO:** Servomotor liniar SUT de retrofit
- **id:** `avm-322s-r` (site page `/produse/avm-322s-r`)
- **Function:** SUT retrofit actuator with BLDC motor, for continuous or switching control on existing valves.
- **Features:**
  - Positioning time 6 (4) s/mm, adjustable
  - Parameterisation via the BUS interface
- **Model:** SAUTER AVM 322S-R (AVM322SF132R)
- **Protocol / signal:** 0…10 V / 4…20 mA or 2/3-point
- **Range:** Force 1000 N, nominal stroke 20 mm
- **Power:** 24 VAC/DC, < 1.7 W, < 3.5 VA
- **Article codes (1):** `AVM322SF132R`
- **Image:** [avm-322-r.jpg](images/avm-322-r.jpg). Note: same file also used for `avm-322-r`.

#### AVM 234S: SUT linear actuator with positioner, 2500 N

- **RO:** Servomotor liniar SUT cu poziționer, 2500 N
- **id:** `avm-234s` (site page `/produse/avm-234s`)
- **Function:** 2500 N SUT actuator with positioner, for VQD/BQD, VQE/BQE, VUG, VUS and V6R flanged valves.
- **Features:**
  - Automatic adaptation to the 8…49 mm stroke
  - Linear/quadratic/equal-percentage characteristic
- **Model:** SAUTER AVM 234S (AVM234SF132)
- **Protocol / signal:** 0…10 V / 4…20 mA or 2/3-point
- **Range:** Force 2500 N, actuator stroke 0…49 mm
- **Power:** 24 VAC/DC, 10 W / 20 VA
- **Article codes (4):** `AVM234SF132`, `AVM234SF132-5`, `AVM234SF132-6`, `AVM234SF132-7`
- **Image:** [sut-valve-actuator-with-positioner.jpg](images/sut-valve-actuator-with-positioner.jpg). Note: the same picture, as a different file, is used for `avf-234s`.

#### AVN 224S: SUT linear actuator 1100 N

- **RO:** Servomotor liniar SUT 1100 N
- **id:** `avn-224s` (site page `/produse/avn-224s`)
- **Function:** 1100 N SUT actuator for VQD, VQE, VUG, VUS flanged valves and V6R and B6R control valves.
- **Features:**
  - External buttons for manual adjustment
  - Automatic adaptation to the 8…49 mm stroke
- **Model:** SAUTER AVN 224S (AVN224SF132)
- **Protocol / signal:** 0…10 V / 4…20 mA or 2/3-point
- **Range:** Force 1100 N, valve stroke 8…49 mm
- **Power:** 24 VAC/DC, 10 W / 18 VA
- **Article codes (4):** `AVN224SF132`, `AVN224SF132-5`, `AVN224SF132-6`, `AVN224SF232`
- **Image:** [avn-224s.jpg](images/avn-224s.jpg)

<a id="fam-4-7"></a>

### 4.7 Spring-Return Actuators (Servomotoare Cu Revenire Arc)

3 products.

#### AVF 124: Spring-return actuator, 500 N

- **RO:** Servomotor cu revenire cu arc, 500 N
- **id:** `avf-124` (site page `/produse/avf-124`)
- **Function:** Spring-return actuator for DN 15…50 valves, returning to the safety position on power failure.
- **Features:**
  - Spring return on power failure
  - Coding switch for the running time
- **Model:** SAUTER AVF 124 (AVF124F130)
- **Protocol / signal:** 3-point control
- **Range:** Force 500 N, actuator stroke 0…8 mm
- **Power:** 230 V~ ±15%, 4 W / 7.6 VA
- **Article codes (2):** `AVF124F130`, `AVF124F230`
- **Image:** [avf-124.jpg](images/avf-124.jpg). Note: byte-identical to the image of `avf-125s`.

#### AVF 125S: SUT spring-return actuator, 500 N

- **RO:** Servomotor SUT cu revenire cu arc, 500 N
- **id:** `avf-125s` (site page `/produse/avf-125s`)
- **Function:** SUT spring-return actuator with continuous or switching control, for VUN, VUD and VUE valves.
- **Features:**
  - Spring return in 18 s on power failure
  - Characteristic adjustable on the actuator
- **Model:** SAUTER AVF 125S (AVF125SF132)
- **Protocol / signal:** 0…10 V / 4…20 mA or 2/3-point
- **Range:** Force 500 N, actuator stroke 0…8 mm
- **Power:** 24 V~ ±20%, 5 W / 8.4 VA
- **Article codes (2):** `AVF125SF132`, `AVF125SF232`
- **Image:** [avf-125s.jpg](images/avf-125s.jpg). Note: byte-identical to the image of `avf-124`.

#### AVF 234S: SUT spring-return actuator, 2000 N

- **RO:** Servomotor SUT cu revenire cu arc, 2000 N
- **id:** `avf-234s` (site page `/produse/avf-234s`)
- **Function:** 2000 N SUT spring-return actuator for flanged valves in large air-conditioning plants.
- **Features:**
  - More than 40 000 spring returns
  - Automatic adaptation to the 8…49 mm stroke
- **Model:** SAUTER AVF 234S (AVF234SF132)
- **Protocol / signal:** 0…10 V / 4…20 mA or 2/3-point
- **Range:** Force 2000 N, spring stroke 14…40 mm
- **Power:** 24 VAC/DC, 10 W / 20 VA
- **Article codes (3):** `AVF234SF132`, `AVF234SF132-5`, `AVF234SF232`
- **Image:** [avf-234s.jpg](images/avf-234s.jpg). Note: the same picture, as a different file, is used for `avm-234s`.

<a id="fam-4-8"></a>

### 4.8 Valveco Dynamic Systems (Sisteme Dinamice Valveco)

3 products.

#### UVC 116: Dynamic flow system with Bluetooth

- **RO:** Sistem dinamic de debit cu Bluetooth
- **id:** `uvc-116` (site page `/produse/uvc-116`)
- **Function:** eValveco system with 6-way ball valve and Bluetooth interface, for chilled ceilings with changeover.
- **Features:**
  - Pressure-independent flow control
  - Commissioning via mobile app
- **Model:** SAUTER UVC 116 (UVC116MF015)
- **Protocol / signal:** Modbus/RTU or BACnet MS/TP, Bluetooth
- **Range:** Flow 0…1400 / 0…2500 l/h, PN 16
- **Power:** 24 VAC ±20% / 24 VDC −10…+20%
- **Article codes (2):** `UVC116MF015`, `UVC116MF025`
- **Image:** [uvc-106.jpg](images/uvc-106.jpg). Note: same file also used for `uvc-106`.

#### UVC 106: Dynamic flow system, 6-way ball valve

- **RO:** Sistem dinamic de debit, robinet 6 căi
- **id:** `uvc-106` (site page `/produse/uvc-106`)
- **Function:** eValveco system with 6-way ball valve and RS-485 interface, for chilled ceilings in 4-pipe systems.
- **Features:**
  - Integrated flow measurement with feedback
  - Variable setpoint for heating and cooling
- **Model:** SAUTER UVC 106 (UVC106MF015)
- **Protocol / signal:** Modbus/RTU (MF) or BACnet MS/TP (BF)
- **Range:** Flow 0…1400 / 0…2500 l/h, DN 15/25
- **Power:** 24 VAC ±20%, 3 W (4 VA)
- **Article codes (4):** `UVC106MF015`, `UVC106BF015`, `UVC106MF025`, `UVC106BF025`
- **Image:** [uvc-106.jpg](images/uvc-106.jpg). Note: same file also used for `uvc-116`.

#### UVC 102: Dynamic flow system with energy monitoring

- **RO:** Sistem dinamic de debit cu monitorizare energie
- **id:** `uvc-102` (site page `/produse/uvc-102`)
- **Function:** eValveco system with 2-way valve DN 65…100 and energy monitoring for coils and heating.
- **Features:**
  - Energy monitoring with 2 × Pt1000
  - Remote commissioning and diagnostics
- **Model:** SAUTER UVC 102 (UVC102MF065)
- **Protocol / signal:** Modbus RTU/TCP, BACnet MS/TP, Bluetooth
- **Range:** Flow 0.175…118.7 m³/h, DN 65…100
- **Power:** 24 VAC/VDC ±10%, 6.5…13.5 W
- **Article codes (3):** `UVC102MF065`, `UVC102MF080`, `UVC102MF100`
- **Image:** [uvc-102.png](images/uvc-102.png)

<a id="fam-4-9"></a>

### 4.9 Valveco VDL Balancing Valves (Vane Echilibrare Valveco VDL)

2 products.

#### VDL 010…050: Valveco compact balancing valve

- **RO:** Vană de echilibrare Valveco compact
- **id:** `vdl-010-050` (site page `/produse/vdl-010-050`)
- **Function:** 2-way control valve PN 25 for dynamic hydronic balancing in closed water circuits.
- **Features:**
  - Simple presetting of the required maximum flow
  - Authority of 1, constant Δp across the unit
- **Model:** SAUTER VDL 010…050 (VDL015F210) (the code in brackets, `VDL015F210`, is not in this entry's article codes)
- **Protocol / signal:** *Not specified*
- **Range:** DN 10…50, flow 30…11,500 l/h, PN 25
- **Power:** *Not specified*
- **Article codes (6):** `VDL010F200`, `VDL015F200`, `VDL020F200`, `VDL025F200`, `VDL040F201`, `VDL050F201`
- **Image:** [vdl-010-050.png](images/vdl-010-050.png)

#### VDL 050…300: Valveco flange balancing valve

- **RO:** Vană de echilibrare Valveco flange
- **id:** `vdl-050-300` (site page `/produse/vdl-050-300`)
- **Function:** Flanged PICV control valve PN 16 for dynamic hydronic balancing in closed water circuits.
- **Features:**
  - Control, flow presetting and balancing
  - Flow 2.5…600 m³/h, 3 measuring nipples
- **Model:** SAUTER VDL 050…300 (VDL050F601)
- **Protocol / signal:** *Not specified*
- **Range:** DN 50…300, flow 2,5…600 m³/h, PN 16
- **Power:** *Not specified*
- **Article codes (6):** `VDL050F601`, `VDL080F601`, `VDL100F601`, `VDL150F601`, `VDL200F601`, `VDL300F601`
- **Image:** [vdl-050-300.png](images/vdl-050-300.png)

<a id="fam-4-10"></a>

### 4.10 Ball Valves (Robinete Cu Bilă)

9 products.

#### VKR: 2-way control ball valve

- **RO:** Robinet cu bilă de reglare, 2 căi
- **id:** `vkr` (site page `/produse/vkr`)
- **Function:** 2-way ball valve with Rp female thread, PN 40, for continuous control of cold and hot water.
- **Features:**
  - Equal-percentage characteristic, 500:1
  - DZR brass body and chrome-plated ball
- **Model:** SAUTER VKR 015…050 (VKR040F300) (the code in brackets, `VKR040F300`, is not in this entry's article codes; they list `VKR040F300-FF`)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 1…63 m³/h, PN 40
- **Power:** *Not specified*
- **Article codes (6):** `VKR015F350-FF`, `VKR020F300-FF`, `VKR025F300-FF`, `VKR032F300-FF`, `VKR040F300-FF`, `VKR050F300-FF`
- **Image:** [2-way-regulating-ball-valve-with-female-thread-pn-40.jpg](images/2-way-regulating-ball-valve-with-female-thread-pn-40.jpg). Note: the same picture, as a different file, is used for `vkai`.

#### VKRA: Control ball valve with male thread

- **RO:** Robinet de reglare cu filet exterior
- **id:** `vkra` (site page `/produse/vkra`)
- **Function:** 2-way control ball valve with ISO 228-1 male thread, PN 40, for closed circuits.
- **Features:**
  - ISO 228-1 male thread (G x" B)
  - Equal-percentage characteristic, 500:1
- **Model:** SAUTER VKRA 015…050 (VKRA040F300)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 1…63 m³/h, PN 40
- **Power:** *Not specified*
- **Article codes (6):** `VKRA015F350`, `VKRA020F300`, `VKRA025F300`, `VKRA032F300`, `VKRA040F300`, `VKRA050F300`
- **Image:** [vkra.png](images/vkra.png). Note: the same picture, as a different file, is used for `vkaa`.

#### BKR: 3-way control ball valve

- **RO:** Robinet cu bilă de reglare, 3 căi
- **id:** `bkr` (site page `/produse/bkr`)
- **Function:** 3-way ball valve with Rp female thread, PN 40, for control and mixing in closed circuits.
- **Features:**
  - Equal-percentage control port, 500:1
  - Linear mixing port, leakage < 1%
- **Model:** SAUTER BKR 015…050 (BKR025F310) (the code in brackets, `BKR025F310`, is not in this entry's article codes; they list `BKR025F310-FF`)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 1,6…40 m³/h, PN 40
- **Power:** *Not specified*
- **Article codes (6):** `BKR015F340-FF`, `BKR020F320-FF`, `BKR025F310-FF`, `BKR032F310-FF`, `BKR040F310-FF`, `BKR050F310-FF`
- **Image:** [bkr.jpg](images/bkr.jpg). Note: same file also used for `bkli`, `bkti`.

#### BKRA: 3-way control ball valve, male thread

- **RO:** Robinet de reglare 3 căi, filet exterior
- **id:** `bkra` (site page `/produse/bkra`)
- **Function:** 3-way ball valve with ISO 228-1 male thread, PN 40, for continuous water control.
- **Features:**
  - Control contour integrated in the ball
  - Linear mixing port, leakage < 1%
- **Model:** SAUTER BKRA 015…050 (BKRA025F310)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 1,6…40 m³/h, PN 40
- **Power:** *Not specified*
- **Article codes (6):** `BKRA015F340`, `BKRA020F320`, `BKRA025F310`, `BKRA032F310`, `BKRA040F310`, `BKRA050F310`
- **Image:** [bkra.png](images/bkra.png). Note: byte-identical to the image of `bkta`.

#### VKAI: 2-way shut-off ball valve

- **RO:** Robinet cu bilă de închidere, 2 căi
- **id:** `vkai` (site page `/produse/vkai`)
- **Function:** 2-way shut-off ball valve with Rp female thread, PN 40, for closed HVAC installations.
- **Features:**
  - Fast closing in 6 s with AKM115SF152
  - Leakage 0.0001 x the Kvs value
- **Model:** SAUTER VKAI 015…050 (VKAI040F300)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 15…96 m³/h, PN 40
- **Power:** *Not specified*
- **Article codes (6):** `VKAI015F300`, `VKAI020F300`, `VKAI025F300`, `VKAI032F300`, `VKAI040F300`, `VKAI050F300`
- **Image:** [vkai.jpg](images/vkai.jpg). Note: the same picture, as a different file, is used for `vkr`.

#### VKAA: Shut-off ball valve with male thread

- **RO:** Robinet de închidere cu filet exterior
- **id:** `vkaa` (site page `/produse/vkaa`)
- **Function:** 2-way shut-off ball valve with ISO 228-1 male thread, PN 40, for HVAC circuits.
- **Features:**
  - Fast switching in 6 s with AKM115SF152
  - Tight-closing to EN 60534-4 L/1, class 5
- **Model:** SAUTER VKAA 015…050 (VKAA040F300)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 9…96 m³/h, PN 40
- **Power:** *Not specified*
- **Article codes (6):** `VKAA015F300`, `VKAA020F300`, `VKAA025F300`, `VKAA032F300`, `VKAA040F300`, `VKAA050F300`
- **Image:** [vkaa.png](images/vkaa.png). Note: the same picture, as a different file, is used for `vkra`.

#### BKLI: 3-way changeover ball valve, L-bore

- **RO:** Robinet de comutare 3 căi, alezaj L
- **id:** `bkli` (site page `/produse/bkli`)
- **Function:** 3-way changeover ball valve with L-bore and Rp female thread, PN 40, for closed HVAC systems.
- **Features:**
  - L-bore for switching flows
  - Fast switching in 6 s with AKM115SF152
- **Model:** SAUTER BKLI 015…050 (BKLI025F300)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 5…37 m³/h, PN 40
- **Power:** *Not specified*
- **Article codes (6):** `BKLI015F300`, `BKLI020F300`, `BKLI025F300`, `BKLI032F300`, `BKLI040F300`, `BKLI050F300`
- **Image:** [bkr.jpg](images/bkr.jpg). Note: same file also used for `bkr`, `bkti`.

#### BKTI: 3-way changeover ball valve, T-bore

- **RO:** Robinet de comutare 3 căi, alezaj T
- **id:** `bkti` (site page `/produse/bkti`)
- **Function:** 3-way changeover ball valve with T-bore and Rp female thread, PN 40, for HVAC circuits.
- **Features:**
  - T-bore for switching flows
  - Stem with friction ring and double O-ring
- **Model:** SAUTER BKTI 015…050 (BKTI025F300)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 12…73 m³/h, PN 40
- **Power:** *Not specified*
- **Article codes (6):** `BKTI015F300`, `BKTI020F300`, `BKTI025F300`, `BKTI032F300`, `BKTI040F300`, `BKTI050F300`
- **Image:** [bkr.jpg](images/bkr.jpg). Note: same file also used for `bkr`, `bkli`.

#### BKTA: T-bore changeover ball valve with male thread

- **RO:** Robinet de comutare T cu filet exterior
- **id:** `bkta` (site page `/produse/bkta`)
- **Function:** 3-way changeover ball valve with T-bore and ISO 228-1 male thread, PN 40, for HVAC.
- **Features:**
  - T-bore, bypass < 1% of the Kvs value
  - Fast switching in 6 s with AKM115SF152
- **Model:** SAUTER BKTA 015…050 (BKTA025F300)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 8…73 m³/h, PN 40
- **Power:** *Not specified*
- **Article codes (6):** `BKTA015F300`, `BKTA020F300`, `BKTA025F300`, `BKTA032F300`, `BKTA040F300`, `BKTA050F300`
- **Image:** [bkta.png](images/bkta.png). Note: byte-identical to the image of `bkra`.

<a id="fam-4-11"></a>

### 4.11 B2KL 6-Way Ball Valve (Robinet 6 Căi B2KL)

1 product.

#### B2KL: 6-way ball valve

- **RO:** Robinet cu bilă cu 6 căi
- **id:** `b2kl` (site page `/produse/b2kl`)
- **Function:** 6-way ball valve with male thread, PN 16, for 4-pipe heating and cooling circuits.
- **Features:**
  - Kvs selection with interchangeable orifices
  - Quasi-linear characteristic, 90° rotation
- **Model:** SAUTER B2KL 015/020 (B2KL015F400)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…20, Kvs 1,25/2,8 m³/h, PN 16
- **Power:** *Not specified*
- **Article codes (3):** `B2KL015F400`, `B2KL015F401`, `B2KL020F411`
- **Image:** [894371-593x1024.png](images/894371-593x1024.png)

<a id="fam-4-12"></a>

### 4.12 AKM AKF Rotary Actuators (Actuatori Rotativi AKM AKF)

5 products.

#### AKM 105/115: Rotary actuator for ball valves

- **RO:** Actuator rotativ pentru robinet cu bilă
- **id:** `akm-105-115` (site page `/produse/akm-105-115`)
- **Function:** Rotary actuator for 2-way, 3-way and 6-way ball valves, driven by controllers with switching output.
- **Features:**
  - Synchronous motor with electronic cut-off
  - Tool-free mounting, bayonet ring
- **Model:** SAUTER AKM 105/115 (AKM115F122)
- **Protocol / signal:** 2/3-point control
- **Range:** Torque 4/8 Nm, 90°, time 30/120 s
- **Power:** 230 VAC ±15% or 24 VAC ±20%
- **Article codes (5):** `AKM105F100`, `AKM105F120`, `AKM105F122`, `AKM115F120`, `AKM115F122`
- **Image:** [rotary-actuator.png](images/rotary-actuator.png)

#### AKM 105S/115S: Rotary actuator with SUT technology

- **RO:** Actuator rotativ cu tehnologie SUT
- **id:** `akm-105s-115s` (site page `/produse/akm-105s-115s`)
- **Function:** SUT rotary actuator for ball valves, with continuous 0…10 V signal or switching output.
- **Features:**
  - Stepper motor with SUT technology
  - Selectable characteristic and running time
- **Model:** SAUTER AKM 105S/115S (AKM115SF132)
- **Protocol / signal:** 0…10 V or 2/3-point, auto detection
- **Range:** Torque 4/8 Nm, 90°, 35/60/120 s
- **Power:** 24 VAC/DC, 4,9 W, 8,7 VA
- **Article codes (2):** `AKM105SF132`, `AKM115SF132`
- **Image:** [akm-105s-115s.jpg](images/akm-105s-115s.jpg)

#### AKM 115S F152: Fast rotary actuator with SUT

- **RO:** Actuator rotativ rapid cu SUT
- **id:** `akm-115s-f152` (site page `/produse/akm-115s-f152`)
- **Function:** Fast SUT rotary actuator for ball valves, with a 6 s running time for fast changeovers.
- **Features:**
  - Brushless motor, 90° travel in 6 s
  - Smart adaptation of the rotation angle
- **Model:** SAUTER AKM 115S F152 (AKM115SF152)
- **Protocol / signal:** 0…10 V / 4…20 mA or 2/3-point
- **Range:** Torque 7 Nm, 90°, running time 6 s
- **Power:** 24 VAC/DC, 6,5 W, 9 VA
- **Article codes (1):** `AKM115SF152`
- **Image:** [akm-115s-f152.jpg](images/akm-115s-f152.jpg)

#### AKF 112/113: Spring-return rotary actuator

- **RO:** Actuator rotativ cu revenire cu arc
- **id:** `akf-112-113` (site page `/produse/akf-112-113`)
- **Function:** Spring-return rotary actuator for ball valves, with safety position on power failure.
- **Features:**
  - Return to the initial position in 15 s
  - Electronic torque-dependent cut-off
- **Model:** SAUTER AKF 112/113 (AKF113F122)
- **Protocol / signal:** 2-point or 3-point control
- **Range:** Torque 7 Nm, max. 95°, 90 s motor
- **Power:** 230 VAC ±10%, 24 VAC or 24…48 VDC
- **Article codes (3):** `AKF112F120`, `AKF112F122`, `AKF113F122`
- **Image:** [akf-112-113.jpg](images/akf-112-113.jpg). Note: the same picture, as a different file, is used for `akf-113s`.

#### AKF 113S: Spring-return actuator with positioner

- **RO:** Actuator cu arc și poziționer
- **id:** `akf-113s` (site page `/produse/akf-113s`)
- **Function:** Spring-return rotary actuator with positioner for VKR, BKR ball valves and the B2KL 6-way valve.
- **Features:**
  - Return to the initial position on power failure
  - Electronic torque-dependent cut-off
- **Model:** SAUTER AKF 113S (AKF113SF122)
- **Protocol / signal:** Positioning signal 0…10 V
- **Range:** 7 Nm, angle of rotation max. 95°
- **Power:** 24 VAC ±20% / 24…48 V=, 3,5 W
- **Article codes (1):** `AKF113SF122`
- **Image:** [rotary-actuator-with-spring-return-and-positioner.jpg](images/rotary-actuator-with-spring-return-and-positioner.jpg). Note: the same picture, as a different file, is used for `akf-112-113`.

<a id="fam-4-13"></a>

### 4.13 Rotary Valves and Butterfly Valves (Vane Rotative Clapete Fluture)

3 products.

#### M3R, M4R: Control valve with threaded connection

- **RO:** Vană de reglare cu racord filetat
- **id:** `m3r-m4r` (site page `/produse/m3r-m4r`)
- **Function:** 3-way or 4-way control valve with threaded connection, for static heating and air preheaters.
- **Features:**
  - M3R: 3-way DN 15…50; M4R: 4-way DN 20…50
  - Body, cover, slipper and shaft in brass
- **Model:** SAUTER M3R/M4R (M3R015F200)
- **Protocol / signal:** *Not specified*
- **Range:** DN 15…50, Kvs 2,5…40 m³/h, PN 10
- **Power:** *Not specified*
- **Article codes (6):** `M3R015F200`, `M3R025F200`, `M3R050F200`, `M4R020F200`, `M4R032F200`, `M4R050F200`
- **Image:** [control-valve-with-threaded-connection-pn-10.jpg](images/control-valve-with-threaded-connection-pn-10.jpg)

#### MH32F, MH42F: Flanged control valve

- **RO:** Vană de reglare cu flanșă
- **id:** `mh32f-mh42f` (site page `/produse/mh32f-mh42f`)
- **Function:** Flanged control valve, in 3-way or 4-way variants, for heating circuits and air coils.
- **Features:**
  - MH32F: 3-way; MH42F: 4-way DN 32…50
  - Grey cast iron body, brass slipper
- **Model:** SAUTER MH32F/MH42F (MH32F40F200) (the code in brackets, `MH32F40F200`, is not in this entry's article codes)
- **Protocol / signal:** *Not specified*
- **Range:** DN 20…150, Kvs 12…420 m³/h, PN 6
- **Power:** *Not specified*
- **Article codes (6):** `MH32F20F200`, `MH32F50F200`, `MH32F100F200`, `MH32F150F200`, `MH42F32F200`, `MH42F50F200`
- **Image:** [control-valve-with-flange-connection-pn-6.jpg](images/control-valve-with-flange-connection-pn-6.jpg)

#### DEF: Tight-closing butterfly valve

- **RO:** Clapetă fluture cu închidere etanșă
- **id:** `def` (site page `/produse/def`)
- **Function:** Tight-closing butterfly valve for shutting off and controlling water and low-pressure steam.
- **Features:**
  - Shut-off and control of water up to 110 °C
  - Stainless steel disc and shaft, EPDM liner
- **Model:** SAUTER DEF (DEF100F200)
- **Protocol / signal:** *Not specified*
- **Range:** DN 25…200, Kvs 36…4000 m³/h, PN 16
- **Power:** *Not specified*
- **Article codes (6):** `DEF025F200`, `DEF050F200`, `DEF080F200`, `DEF100F200`, `DEF150F200`, `DEF200F200`
- **Image:** [tight-sealing-butterfly-valve-pn-16.jpg](images/tight-sealing-butterfly-valve-pn-16.jpg)

<a id="fam-4-14"></a>

### 4.14 Damper and Rotary Actuators (Actuatori Clapete Și Rotativi)

14 products.

#### ADM 333HF: Actuator for dampers and butterfly valves

- **RO:** Servomotor pentru clapete și vane fluture
- **id:** `adm-333hf` (site page `/produse/adm-333hf`)
- **Function:** 30 Nm actuator for butterfly valves and air dampers, with controllers with 3-point output.
- **Features:**
  - Synchronous motor with 2 limit switches
  - Feedback via a 1 kΩ potentiometer
- **Model:** SAUTER ADM 333HF (ADM333HF120)
- **Protocol / signal:** 3-point control
- **Range:** 30 Nm, 90°, damper max. 10 m²
- **Power:** 230 VAC ±10% or 24 VAC, 5,3 W
- **Article codes (2):** `ADM333HF120`, `ADM333HF122`
- **Image:** [adm-333hf.png](images/adm-333hf.png). Note: same file also used for `adm-333sf`.

#### ADM 333SF: 30 Nm actuator with positioner

- **RO:** Servomotor 30 Nm cu poziționer
- **id:** `adm-333sf` (site page `/produse/adm-333sf`)
- **Function:** 30 Nm actuator with integrated positioner and TFT display, for controllers with continuous output.
- **Features:**
  - Menu-based configuration on the internal TFT display
  - Volt-free fault signalling output
- **Model:** SAUTER ADM 333SF (ADM333SF122)
- **Protocol / signal:** 0(2)…10 V / 0(4)…20 mA
- **Range:** 30 Nm, 90° in 60 s, damper 10 m²
- **Power:** 24 VAC ±20%, 4 VA
- **Article codes (1):** `ADM333SF122`
- **Image:** [adm-333hf.png](images/adm-333hf.png). Note: same file also used for `adm-333hf`.

#### ADM 322: Rotary actuator 15 Nm

- **RO:** Servomotor rotativ 15 Nm
- **id:** `adm-322` (site page `/produse/adm-322`)
- **Function:** 15 Nm rotary actuator for control valves and butterfly valves, with 2-point or 3-point control.
- **Features:**
  - Direction and running time via coding switches
  - Parallel operation of up to 5 actuators
- **Model:** SAUTER ADM 322 (ADM322F122)
- **Protocol / signal:** 2/3-point control
- **Range:** 15 Nm, angle of rotation max. 95°
- **Power:** 24 VAC/VDC or 230 VAC, < 2,5 W
- **Article codes (6):** `ADM322F120`, `ADM322F122`, `ADM322HF120`, `ADM322HF122`, `ADM322PF120`, `ADM322PF122`
- **Image:** [adm-322.png](images/adm-322.png). Note: same file also used for `adm-322s`.

#### ADM 322S: Rotary actuator with positioner

- **RO:** Servomotor rotativ cu poziționer
- **id:** `adm-322s` (site page `/produse/adm-322s`)
- **Function:** 15 Nm rotary actuator with positioner, for controllers with continuous output and fine control.
- **Features:**
  - Automatic recognition of the applied signal
  - Absolute position measurement on power failure
- **Model:** SAUTER ADM 322S (ADM322SF122)
- **Protocol / signal:** 0…10 V, 0(4)…20 mA, 2…10 V
- **Range:** 15 Nm, 90° in 120 s or 30 s
- **Power:** 24 VDC −10…20% / 24 VAC ±20%
- **Article codes (2):** `ADM322SF122`, `ADM322SF152`
- **Image:** [adm-322.png](images/adm-322.png). Note: same file also used for `adm-322`.

#### ASM 105/115: Actuator for air dampers

- **RO:** Servomotor pentru clapete de aer
- **id:** `asm-105-115` (site page `/produse/asm-105-115`)
- **Function:** Air damper actuator of 5 or 10 Nm, driven by controllers with switching output.
- **Features:**
  - Self-centring shaft adaptor on the damper
  - Disengageable gear train for manual adjustment
- **Model:** SAUTER ASM 105/115 (ASM105F122)
- **Protocol / signal:** 2/3-point control
- **Range:** 5 or 10 Nm, angle max. 95°
- **Power:** 230 V~ or 24 V~, 1,6…2,4 W
- **Article codes (5):** `ASM105F100`, `ASM105F120`, `ASM105F122`, `ASM115F120`, `ASM115F122`
- **Image:** [asm-105-115.jpg](images/asm-105-115.jpg)

#### ASM 105S/115S F132: Damper actuator with SUT

- **RO:** Servomotor pentru clapete cu SUT
- **id:** `asm-105s-115s-f132` (site page `/produse/asm-105s-115s-f132`)
- **Function:** Damper actuator with SUT technology, configurable, for switching or continuous control.
- **Features:**
  - Smart adaptation of the rotation angle
  - Free configuration via the CASE Drive tool
- **Model:** SAUTER ASM 105S/115S (ASM105SF132)
- **Protocol / signal:** 2/3-point or 0…10 V
- **Range:** 5 or 10 Nm, 90° in 35…120 s
- **Power:** 24 VAC ±20% / 24 VDC, 5,0 W
- **Article codes (2):** `ASM105SF132`, `ASM115SF132`
- **Image:** [damper-actuator-with-sauter-universal-technology-sut.jpg](images/damper-actuator-with-sauter-universal-technology-sut.jpg). Note: the same picture, as a different file, is used for `asm-124`, `asm-134`, `asm-124s-134s`.

#### ASM 105S/115S F152: Fast damper actuator with SUT

- **RO:** Servomotor rapid pentru clapete cu SUT
- **id:** `asm-105s-115s-f152` (site page `/produse/asm-105s-115s-f152`)
- **Function:** Fast damper actuator with brushless SUT motor and a running time of only 3 to 6 s.
- **Features:**
  - Brushless motor with force-dependent cut-off
  - Pulse length correction for 3-point control
- **Model:** SAUTER ASM 115S F152 (ASM115SF152)
- **Protocol / signal:** 2/3-point, 0…10 V or 0(4)…20 mA
- **Range:** 5 or 10 Nm, 90° in 3 or 6 s
- **Power:** 24 VAC ±20% / 24 VDC, 6,0 W
- **Article codes (3):** `ASM105SF152`, `ASM115SF152`, `ASM105SF152U`
- **Image:** [high-speed-damper-actuator-with-sauter-universal-technology-sut.jpg](images/high-speed-damper-actuator-with-sauter-universal-technology-sut.jpg)

#### ASM 124: Damper actuator 18 Nm

- **RO:** Servomotor pentru clapete 18 Nm
- **id:** `asm-124` (site page `/produse/asm-124`)
- **Function:** 18 Nm actuator for air dampers, shut-off dampers, butterfly dampers and multi-blade dampers.
- **Features:**
  - Electronic end position detection
  - M5 threaded holes for bracket mounting
- **Model:** SAUTER ASM 124 (ASM124F122)
- **Protocol / signal:** 2/3-point control
- **Range:** 18 Nm, 90° in 120 s, max. 95°
- **Power:** 230 VAC ±15% or 24 VAC, 2,9 W
- **Article codes (2):** `ASM124F120`, `ASM124F122`
- **Image:** [asm-124.jpg](images/asm-124.jpg). Note: byte-identical to the image of `asm-134`; the same picture, as a different file, is used for `asm-124s-134s`, `asm-105s-115s-f132`.

#### ASM 134: Damper actuator 30 Nm

- **RO:** Servomotor pentru clapete 30 Nm
- **id:** `asm-134` (site page `/produse/asm-134`)
- **Function:** 30 Nm actuator for air dampers and butterfly dampers, with controllers with 3-point output.
- **Features:**
  - Stepper motor with electronic cut-off
  - Direction reversed by swapping the connections
- **Model:** SAUTER ASM 134 (ASM134F130)
- **Protocol / signal:** 3-point control
- **Range:** 30 Nm, 90° in 120/240 s
- **Power:** 230 V~ ±15%, 50 Hz, 3,7 W
- **Article codes (1):** `ASM134F130`
- **Image:** [asm-134.jpg](images/asm-134.jpg). Note: byte-identical to the image of `asm-124`; the same picture, as a different file, is used for `asm-124s-134s`, `asm-105s-115s-f132`.

#### ASM 124S/134S: Damper actuator with SUT positioner

- **RO:** Servomotor clapete cu poziționer SUT
- **id:** `asm-124s-134s` (site page `/produse/asm-124s-134s`)
- **Function:** Damper actuator with SUT technology and positioner, in 15 Nm or 30 Nm torque variants.
- **Features:**
  - Smart adaptation of the rotation angle
  - Self-centring, maintenance-free shaft adaptor
- **Model:** SAUTER ASM 124S/134S (ASM124SF132)
- **Protocol / signal:** 2/3-point or 0…10 V
- **Range:** 15 or 30 Nm, 90° in 60…240 s
- **Power:** 24 VAC ±20% / 24 VDC, 2,4 W
- **Article codes (2):** `ASM124SF132`, `ASM134SF132`
- **Image:** [asm-124s-134s.jpg](images/asm-124s-134s.jpg). Note: the same picture, as a different file, is used for `asm-124`, `asm-134`, `asm-105s-115s-f132`.

#### ASF 112/113: Spring-return damper actuator

- **RO:** Servomotor cu revenire cu resort
- **id:** `asf-112-113` (site page `/produse/asf-112-113`)
- **Function:** Spring-return damper actuator for safety functions on air dampers and butterfly dampers.
- **Features:**
  - Manual adjustment with hex key and locking
  - Self-centring, maintenance-free shaft adaptor
- **Model:** SAUTER ASF 112/113 (ASF112F122)
- **Protocol / signal:** 2-point (112) or 3-point (113)
- **Range:** 7 Nm, spring 90° in 15 s, motor 90 s
- **Power:** 230 VAC, 24 VAC or 24…48 V=, 4,5 W
- **Article codes (5):** `ASF112F120`, `ASF112F122`, `ASF112F220`, `ASF112F222`, `ASF113F122`
- **Image:** [asf-112-113.jpg](images/asf-112-113.jpg)

#### ASF 113S: Spring-return actuator with positioner

- **RO:** Servomotor cu resort și poziționer
- **id:** `asf-113s` (site page `/produse/asf-113s`)
- **Function:** Spring-return actuator for air dampers and butterfly dampers, with positioner for continuous control.
- **Features:**
  - For air dampers and butterfly dampers
  - Positioner for continuous 0…10 V output
- **Model:** SAUTER ASF 113S (ASF113SF122)
- **Protocol / signal:** Control signal 0…10 V, Ri = 100 kΩ
- **Range:** Torque 7 Nm, angle of rotation max. 95°
- **Power:** 24 VAC ±20%; 24…48 V=; 3.5 W, 5.0 VA
- **Article codes (1):** `ASF113SF122`
- **Image:** [damper-actuator-with-spring-return-and-positioner-2.jpg](images/damper-actuator-with-spring-return-and-positioner-2.jpg). Note: the same picture, as a different file, is used for `asf-122-123`, `asf-123s`.

#### ASF 122/123: Spring-return actuator 18 Nm

- **RO:** Servomotor cu resort 18 Nm
- **id:** `asf-122-123` (site page `/produse/asf-122-123`)
- **Function:** 18 Nm spring-return actuator for air dampers, driven by controllers with 2-point or 3-point output.
- **Features:**
  - For controllers with 2/3-point output
  - Wear-free, maintenance-free brushless motor
- **Model:** SAUTER ASF 122/123 (ASF122F122)
- **Protocol / signal:** 2-point or 3-point control
- **Range:** Torque 18 Nm, angle of rotation max. 90°
- **Power:** 24 V~/24…48 V= or 230 V~, 5…6 W
- **Article codes (5):** `ASF122F120`, `ASF122F122`, `ASF122F220`, `ASF122F222`, `ASF123F122`
- **Image:** [asf-122-123.jpg](images/asf-122-123.jpg). Note: same file also used for `asf-123s`; the same picture, as a different file, is used for `asf-113s`.

#### ASF 123S: Spring-return actuator with positioner, 18 Nm

- **RO:** Servomotor cu resort și poziționer 18 Nm
- **id:** `asf-123s` (site page `/produse/asf-123s`)
- **Function:** 18 Nm spring-return actuator with integrated positioner, for dampers controlled by a continuous signal.
- **Features:**
  - For controllers with continuous 0…10 V output
  - Wear-free, maintenance-free brushless motor
- **Model:** SAUTER ASF 123S (ASF123SF122)
- **Protocol / signal:** Control signal 0…10 V, Ri = 100 kΩ
- **Range:** Torque 18 Nm, angle of rotation max. 95°
- **Power:** 24…48 V= ±20%, 5.4 W, 7.5 VA
- **Article codes (1):** `ASF123SF122`
- **Image:** [asf-122-123.jpg](images/asf-122-123.jpg). Note: same file also used for `asf-122-123`; the same picture, as a different file, is used for `asf-113s`.

<a id="cat-5"></a>

## 5. Operating Panels (Panouri Operare)

17 products in 8 families. Source: `lib/product-data.ts`, entries with `category: "Panouri Operare"`.

<a id="fam-5-1"></a>

### 5.1 Fan Coil Room Thermostats (Termostate Cameră Ventiloconvectoare)

3 products.

#### TSHK 621…643: Electromechanical room thermostat

- **RO:** Termostat de cameră electromecanic
- **id:** `tshk-621-643` (site page `/produse/tshk-621-643`)
- **Function:** Electromechanical thermostat for fan coil units, with heating/cooling changeover and fan speeds.
- **Features:**
  - Heating/cooling changeover via switch
  - Thermal feedback for constant temperature
- **Model:** SAUTER TSHK 621…643 (TSHK621F001)
- **Protocol / signal:** Pulsed 2-point control
- **Range:** Setting range 5…30 °C, P-band 3 K
- **Power:** 230 V~ ±10%, 50…60 Hz
- **Article codes (3):** `TSHK621F001`, `TSHK642F001`, `TSHK643F001`
- **Image:** [room-thermostat.jpg](images/room-thermostat.jpg)

#### TSHK 670…672: Room thermostat with heating/cooling sequence

- **RO:** Termostat de cameră cu secvență încălzire/răcire
- **id:** `tshk-670-672` (site page `/produse/tshk-670-672`)
- **Function:** Thermostat for 4-pipe fan coil units, with gradual changeover from heating to cooling in sequence.
- **Features:**
  - Heating/cooling sequence characteristic
  - Quasi-continuous temperature control
- **Model:** SAUTER TSHK 670…672 (TSHK670F001)
- **Protocol / signal:** Pulsed 2-point control, sequence
- **Range:** Setting range 5…30 °C, P-band 2×3 K
- **Power:** 230 V~ ±10%, 50…60 Hz
- **Article codes (2):** `TSHK670F001`, `TSHK672F001`
- **Image:** [tshk670.jpg](images/tshk670.jpg)

#### TSHK 681/682: Room thermostat with digital display

- **RO:** Termostat de cameră cu afișaj digital
- **id:** `tshk-681-682` (site page `/produse/tshk-681-682`)
- **Function:** Room thermostat with LCD display and ± setpoint buttons, with master switch and 3 fan speeds.
- **Features:**
  - LCD display with ± setpoint buttons
  - Heating or cooling output, switchable
- **Model:** SAUTER TSHK 681/682 (TSHK681F001)
- **Protocol / signal:** Pulsed 2-point control
- **Range:** Setting range 5…30 °C; display 0…40 °C
- **Power:** 230 V~ ±10 V, 50…60 Hz
- **Article codes (2):** `TSHK681F001`, `TSHK682F001`
- **Image:** [tshk681.jpg](images/tshk681.jpg)

<a id="fam-5-2"></a>

### 5.2 TUC Universal Thermostats (Termostate Universale TUC)

2 products.

#### TUC: Universal thermostat with immersion sleeve

- **RO:** Termostat universal cu teacă de imersie
- **id:** `tuc` (site page `/produse/tuc`)
- **Function:** Universal thermostat without auxiliary power for liquids in tanks, pipes and air ducts, with immersion sleeve.
- **Features:**
  - Variants as monitor (TW) or limiter (TB)
  - Immersion sleeve included, max. 12 bar
- **Model:** SAUTER TUC (TUC105F001)
- **Protocol / signal:** Switching contact (terminals 1-2, 1-4)
- **Range:** Setting range from −10…50 °C to 80…160 °C
- **Power:** Contact rating 230 VAC, 10(2.5) A
- **Article codes (6):** `TUC101F003`, `TUC105F001`, `TUC107F001`, `TUC108F001`, `TUC303F001`, `TUC407F001`
- **Image:** [universal-thermostat.jpg](images/universal-thermostat.jpg)

#### 0391… / 0392… / 0393…: Immersion sleeves in brass or stainless steel

- **RO:** Teci de imersie din alamă sau inox
- **id:** `0391-0392-0393` (site page `/produse/0391-0392-0393`)
- **Function:** Brass or stainless steel immersion sleeve for mounting sensors and thermostats in pipes and tanks.
- **Features:**
  - Brass (Ms) or stainless steel (V4A)
  - Cylindrical G½" or conical R½" thread
- **Model:** SAUTER teacă imersie (0391022100) (RO "teacă imersie" = immersion sleeve; the source has no English value)
- **Protocol / signal:** *Not specified*
- **Range:** LW 7/15, 50…600 mm, 10…40 bar
- **Power:** *Not specified*
- **Article codes (6):** `0391022100`, `0391011100`, `0391022600`, `0393022100`, `0393012100`, `0392022100`
- **Image:** [teci-imersie.jpg](images/teci-imersie.jpg). Note: same file also used for `0391-0392-0393-2`.
- **Article codes also in another entry:** `0391022100`, `0391011100`, `0393012100` in `0391-0392-0393-2`.
- **Duplicate entry:** the same immersion sleeves are also listed as `0391-0392-0393-2` (Ambient Sensors). The article-code lists differ: only here `0391022600`, `0392022100`, `0393022100`; only there `0391022450`, `0392022200`, `0393022200`. The source does not say which list is right.

<a id="fam-5-3"></a>

### 5.3 Modbus Fan Coil Thermostats (Termostate Fan-Coil Modbus)

1 product.

#### NRFC 413, 422…424: Modbus fan coil room thermostat

- **RO:** Termostat fan-coil Modbus de cameră
- **id:** `nrfc-413-422-424` (site page `/produse/nrfc-413-422-424`)
- **Function:** Room thermostat for 2-pipe or 4-pipe fan coil units, integrable into the BMS via Modbus/RTU.
- **Features:**
  - BMS integration via Modbus/RTU
  - 2-point or 0...10 V valve control
- **Model:** SAUTER NRFC 413 (NRFC413MF111)
- **Protocol / signal:** Modbus/RTU on RS-485, 4800/9600 bit/s
- **Range:** 1 AI, 1 DI, 0…2 AO, 3…5 relay outputs
- **Power:** 100…240 VAC, 50/60 Hz, 5 VA
- **Article codes (4):** `NRFC413MF111`, `NRFC422MF111`, `NRFC423MF111`, `NRFC424MF112`
- **Image:** [NRFC.jpg](images/NRFC.jpg)

<a id="fam-5-4"></a>

### 5.4 Electronic Room Thermostats (Termostate Electronice Cameră)

2 products.

#### TRA 410, 421: Electronic room thermostat with display

- **RO:** Termostat electronic de cameră cu display
- **id:** `tra-410-421` (site page `/produse/tra-410-421`)
- **Function:** Electronic room thermostat with display, for surface heating or surface heating/cooling.
- **Features:**
  - Backlit LCD and time program on TRA 421
  - Silent Triac output on the 24 V types
- **Model:** SAUTER TRA 421 (TRA421F212)
- **Protocol / signal:** 2-point switching, NTC 22k element
- **Range:** Setting range 5...30 °C
- **Power:** 230 V~ ±10% or 24 V~ ±20%, 50 Hz
- **Article codes (4):** `TRA410F210`, `TRA410F212`, `TRA421F210`, `TRA421F212`
- **Image:** [903448.png](images/903448.png)

#### TRT 317, 327: Heating/cooling room thermostat

- **RO:** Termostat de cameră încălzire/răcire
- **id:** `trt-317-327` (site page `/produse/trt-317-327`)
- **Function:** Electronic room thermostat without display, for heating or heating/cooling, with rotary knob.
- **Features:**
  - Heating/cooling changeover input on TRT 327
  - Automatic frost protection at 8 °C
- **Model:** SAUTER TRT 327 (TRT327F212)
- **Protocol / signal:** Switching: relay 230 V, Triac at 24 V
- **Range:** Setting range 10...28 °C
- **Power:** 24 V~ / 230 V~, load 1.8 A at 230 V
- **Article codes (4):** `TRT317F210`, `TRT317F212`, `TRT327F210`, `TRT327F212`
- **Image:** [trt317.jpg](images/trt317.jpg)

<a id="fam-5-5"></a>

### 5.5 Laboratory Fume Cupboard Panel (Panou Nișe Laborator)

1 product.

#### FCCP 200: Display and monitor for laboratory fume cupboards

- **RO:** Indicator și monitor pentru nișe de laborator
- **id:** `fccp-200` (site page `/produse/fccp-200`)
- **Function:** Display and alarm unit for laboratory fume cupboards, according to EN 14175-2, with five keys.
- **Features:**
  - Fume cupboard monitoring according to EN 14175-2
  - Five configurable keys, resistant glass
- **Model:** SAUTER FCCP 200 (FCCP200F010)
- **Protocol / signal:** *Not specified*
- **Range:** Temperature measurement −5…50 °C
- **Power:** 5 V, ±10%; 0,4 VA
- **Article codes (1):** `FCCP200F010`
- **Image:** [fume-cupboard-indicator-and-monitor.jpg](images/fume-cupboard-indicator-and-monitor.jpg)

<a id="fam-5-6"></a>

### 5.6 modulo 6 Operating Unit (Unitate Operare modulo 6)

1 product.

#### EY6LO00: Local operating and display unit

- **RO:** Unitate de operare și afișare locală
- **id:** `ey6lo00` (site page `/produse/ey6lo00`)
- **Function:** Local operating and display unit with colour LCD, mounted directly on the modulo 6 I/O modules.
- **Features:**
  - Colour LCD display for inputs and outputs
  - Simple operation with four buttons
- **Model:** SAUTER EY6LO00 (EY6LO00F001)
- **Protocol / signal:** Proprietary protocol, 4-pin connection
- **Range:** Display 240 × 240 pixels, colour LCD
- **Power:** From the I/O module, ≤ 12.5 mA
- **Article codes (1):** `EY6LO00F001`
- **Image:** [1028537-990x1024.jpg](images/1028537-990x1024.jpg)

<a id="fam-5-7"></a>

### 5.7 ecoUnit Wired Room Units (Unități Cameră Cablate ecoUnit)

4 products.

#### EY-RU 310…316: Room operating unit with temperature sensor

- **RO:** Unitate de cameră cu senzor de temperatură
- **id:** `ey-ru-310-316` (site page `/produse/ey-ru-310-316`)
- **Function:** Room operating unit with NTC sensor for ecos504/505, with local thermal comfort adjustment.
- **Features:**
  - Temperature measurement and setpoint correction
  - Fan, blinds and lighting control
- **Model:** SAUTER ecoUnit316 (EY-RU316F001)
- **Protocol / signal:** SLC on RS-485 (ecos 5, modu521)
- **Range:** Measuring range 0…40 °C, 0,1 K
- **Power:** From the automation station, ≤ 25 mA
- **Article codes (4):** `EY-RU310F001`, `EY-RU311F001`, `EY-RU314F001`, `EY-RU316F001`
- **Image:** [room-operating-unit-ecounit310-316.jpg](images/room-operating-unit-ecounit310-316.jpg)

#### EY-RU 365: ecoUnit365 room unit with colour touch display

- **RO:** Unitate de cameră cu touch color ecoUnit365
- **id:** `ey-ru-365` (site page `/produse/ey-ru-365`)
- **Function:** Premium room operating unit with touch operation and tile-based colour display, for ecos 5 and modulo 6.
- **Features:**
  - 3.5" colour TFT display, 320×240 pixels
  - Up to 6 pages with 6 tiles each
- **Model:** SAUTER ecoUnit365 (EY-RU365F001)
- **Protocol / signal:** SLC on RS-485; optional Bluetooth 4.0
- **Range:** NTC sensor 0…40 °C; up to 32 channels
- **Power:** 24 VAC/DC ±20%, < 2,6 W
- **Article codes (4):** `EY-RU365F001`, `EY-RU365F002`, `EY-RU365F0A1`, `EY-RU365F0A2`
- **Image:** [964701.jpg](images/964701.jpg)

#### EY-RU 355: ecoUnit355 room unit with LCD display

- **RO:** Unitate de cameră cu display LCD ecoUnit355
- **id:** `ey-ru-355` (site page `/produse/ey-ru-355`)
- **Function:** Room operating unit with backlit LCD display for ecos311, ecos504/505, modu6**-AS and ASV2.
- **Features:**
  - Large backlit LCD display (BL)
  - Temperature, fan and ECO keys
- **Model:** SAUTER ecoUnit355 (EY-RU355F051)
- **Protocol / signal:** SLC on RS-485 (SAUTER Local Comm.)
- **Range:** 0…40 °C, accuracy 0,5 K in 15…35 °C
- **Power:** 5 VDC or 12…24 VDC ±20%, ≤ 7 mA
- **Article codes (6):** `EY-RU355F002`, `EY-RU355F021`, `EY-RU355F031`, `EY-RU355F041`, `EY-RU355F051`, `EY-RU355FA51`
- **Image:** [ey-ru-355.png](images/ey-ru-355.png)

#### EY-SU 358: Key unit for the room operating unit

- **RO:** Unitate de taste pentru unitatea de cameră
- **id:** `ey-su-358` (site page `/produse/ey-su-358`)
- **Function:** Key unit complementing the ecoUnit355 for controlling blinds and lighting.
- **Features:**
  - Variants with 2, 4 or 8 key functions
  - Controls blinds and lighting (on/off, dim)
- **Model:** SAUTER ecoUnit358 (EY-SU358F081)
- **Protocol / signal:** 3-wire cable (V, C, DQ) to ecoUnit355
- **Range:** Cable length ≤ 30 m; 2 position LEDs
- **Power:** From ecoUnit355, ≤ 8,5 mA at 5 V
- **Article codes (6):** `EY-SU358F021`, `EY-SU358FA21`, `EY-SU358F041`, `EY-SU358FA41`, `EY-SU358F081`, `EY-SU358FA81`
- **Image:** [ey-su-358.jpg](images/ey-su-358.jpg)

<a id="fam-5-8"></a>

### 5.8 ecoUnit EnOcean Room Units (Unități Cameră EnOcean ecoUnit)

3 products.

#### EY-RU 110: EnOcean wireless room sensor

- **RO:** Senzor de cameră wireless EnOcean
- **id:** `ey-ru-110` (site page `/produse/ey-ru-110`)
- **Function:** Battery-free EnOcean room sensor with digital temperature sensor and integrated solar panel.
- **Features:**
  - Battery-free, with integrated solar panel
  - Integrated digital temperature sensor
- **Model:** SAUTER ecoUnit110 (EY-RU110F201)
- **Protocol / signal:** EnOcean 868,3 MHz; EEP A5-10-01
- **Range:** Measuring range 0…40 °C; range up to 30 m
- **Power:** 3 V from the integrated solar panel
- **Article codes (1):** `EY-RU110F201`
- **Image:** [ey-ru-110.png](images/ey-ru-110.png)

#### EY-RU 146: EnOcean wireless room operating unit

- **RO:** Unitate de cameră wireless EnOcean
- **id:** `ey-ru-146` (site page `/produse/ey-ru-146`)
- **Function:** Bidirectional EnOcean room operating unit with LCD and six keys for room comfort.
- **Features:**
  - Bidirectional, EnOcean SMART ACK
  - Battery-free, with LCD and solar panel
- **Model:** SAUTER ecoUnit146 (EY-RU146F201)
- **Protocol / signal:** EnOcean; EEP D2-00-01, A5-10-01, F6-03-01
- **Range:** Measuring range 0…40 °C; range up to 30 m
- **Power:** 3 V from the integrated solar panel
- **Article codes (1):** `EY-RU146F201`
- **Image:** [ey-ru-146.png](images/ey-ru-146.png)

#### EY-SU 106: Wireless key unit with solar cell

- **RO:** Unitate de taste wireless cu celulă solară
- **id:** `ey-su-106` (site page `/produse/ey-su-106`)
- **Function:** Key unit with solar cell, for extending ecoUnit 1 EnOcean room operating units.
- **Features:**
  - Solar cell for additional power
  - Up to six key functions per unit
- **Model:** SAUTER ecoUnit106 (EY-SU106F100)
- **Protocol / signal:** *Not specified*
- **Range:** 4-wire cable, length ≤ 1 m
- **Power:** Not required (from ecoUnit14*)
- **Article codes (1):** `EY-SU106F100`
- **Image:** [ey-su-106.png](images/ey-su-106.png)

<a id="cat-6"></a>

## 6. BMS Software (Software BMS)

6 products in 6 families. Source: `lib/product-data.ts`, entries with `category: "Software BMS"`.

<a id="fam-6-1"></a>

### 6.1 SAUTER Vision Center

1 product.

#### YZP 480…495: Building management platform

- **RO:** Platformă de management al clădirii
- **id:** `yzp-480-495` (site page `/produse/yzp-480-495`)
- **Function:** Web-based building management platform with visualisation, energy monitoring and integrated AEM analysis.
- **Features:**
  - HTML5 web management platform
  - Integrated energy analysis module
- **Model:** SAUTER Vision Center (YZP480F200)
- **Protocol / signal:** BACnet, BACnet/SC, OPC UA, MQTT
- **Range:** Licence for 500 addresses; +100…25000 objects
- **Power:** *Not specified*
- **Article codes (6):** `YZP480F200`, `YZP481F200`, `YZP481F210`, `YZP481F220`, `YZP481F230`, `YZP485F203`
- **Image:** [yzp-480-495.png](images/yzp-480-495.png)

<a id="fam-6-2"></a>

### 6.2 Mobile Building Services

1 product.

#### YCS 200…210: Cloud service and mobile room app

- **RO:** Serviciu cloud și aplicație mobilă de cameră
- **id:** `ycs-200-210` (site page `/produse/ycs-200-210`)
- **Function:** SAUTER cloud solution with the MRC app for room control, bookings and indoor navigation via iBeacon.
- **Features:**
  - Controls lighting, temperature, blinds
  - Booking of rooms, desks and parking spaces
- **Model:** SAUTER MBS Cloud (YCS200F200)
- **Protocol / signal:** MRC app for iOS/Android, iBeacon
- **Range:** Cloud subscriptions for 50…1000 rooms
- **Power:** *Not specified*
- **Article codes (6):** `YCS200F300`, `YCS200F320`, `YCS210F300`, `YCS200F200`, `YCS210F200`, `YCS220F200`
- **Image:** [ycs-200-210.png](images/ycs-200-210.png)

<a id="fam-6-3"></a>

### 6.3 SAUTER Vision Services

1 product.

#### YCS 320…325: Cloud energy monitoring services

- **RO:** Servicii cloud de monitorizare energetică
- **id:** `ycs-320-325` (site page `/produse/ycs-320-325`)
- **Function:** SAUTER cloud modules for energy monitoring, building management and analysis, without local hardware.
- **Features:**
  - Energy monitoring from the cloud
  - SANKEY, carpet and scatter plot diagrams
- **Model:** SAUTER Vision Services (YCS320F200)
- **Protocol / signal:** BACnet/SC, MQTT, OPC UA with TLS encryption
- **Range:** 50…1000+ objects, 2 groups, 2 users
- **Power:** *Not specified*
- **Article codes (6):** `YCS320F200`, `YCS321F200`, `YCS321F210`, `YCS322F010`, `YCS322F020`, `YCS324F200`
- **Image:** [ycs-320-325.png](images/ycs-320-325.png)

<a id="fam-6-4"></a>

### 6.4 Digital Services Remote Management

1 product.

#### YCS 451…453: Secure remote access service

- **RO:** Serviciu de acces securizat la distanță
- **id:** `ycs-451-453` (site page `/produse/ycs-451-453`)
- **Function:** Cloud service for secure remote access to installations, via browser, Windows client or VPN tunnel.
- **Features:**
  - Two-step authentication via e-mail/SMS
  - Per-user rights administration
- **Model:** SAUTER Remote Management (YCS452F200)
- **Protocol / signal:** http/https, RDP/VNC, Layer 2 VPN tunnel
- **Range:** 5 secure connections per subscription
- **Power:** *Not specified*
- **Article codes (6):** `YCS451F010`, `YCS452F200`, `YCS452F210`, `YCS453F200`, `YCS453F210`, `YCS453F220`
- **Image:** [ycs-451-453.png](images/ycs-451-453.png)

<a id="fam-6-5"></a>

### 6.5 Digital Services Customer Portal

1 product.

#### YCS 472, 474: Customer cloud portal

- **RO:** Portal cloud de client
- **id:** `ycs-472-474` (site page `/produse/ycs-472-474`)
- **Function:** Cloud portal with dashboards for comfort, energy and occupancy, plus building maintenance planning.
- **Features:**
  - Dashboards with KPI widgets and alarms
  - Maintenance planning and documentation
- **Model:** SAUTER Customer Portal (YCS472F200)
- **Protocol / signal:** *Not specified*
- **Range:** Annual subscription with automatic renewal
- **Power:** *Not specified*
- **Article codes (3):** `YCS472F200`, `YCS472F600`, `YCS474F200`
- **Image:** [ycs-472-474.jpg](images/ycs-472-474.jpg)

<a id="fam-6-6"></a>

### 6.6 SAUTER CASE Suite

1 product.

#### GZS 100, 150: Engineering software suite

- **RO:** Suită software de engineering
- **id:** `gzs-100-150` (site page `/produse/gzs-100-150`)
- **Function:** Software suite for the design, engineering and commissioning of SAUTER automation stations.
- **Features:**
  - Covers planning and commissioning
  - Multilingual program for Microsoft Windows
- **Model:** SAUTER CASE Suite (GZS150F010)
- **Protocol / signal:** *Not specified*
- **Range:** Enterprise/Partner/Designer licences, 365 days
- **Power:** *Not specified*
- **Article codes (6):** `GZS150F010`, `GZS150F011`, `GZS150F020`, `GZS150F021`, `GZS150F022`, `GZS100F699`
- **Image:** [gzs-100-150.png](images/gzs-100-150.png)

<a id="cat-7"></a>

## 7. Gateway & Integration (Gateway & Integrare)

22 products in 10 families. Source: `lib/product-data.ts`, entries with `category: "Gateway & Integrare"`.

<a id="fam-7-1"></a>

### 7.1 Control Signal Distributors (Distribuitoare Semnale Comandă)

2 products.

#### FXV 3***: Electrical distributor for positioning signals

- **RO:** Distribuitor electric pentru semnale de poziționare
- **id:** `fxv-3` (site page `/produse/fxv-3`)
- **Function:** Electrical distributor for 6 or 10 surface-heating zones, with pump and boiler control.
- **Features:**
  - Simple wiring for up to 6 or 10 zones
  - Pump logic and boiler control
- **Model:** SAUTER FXV 3210 (FXV3210F002)
- **Protocol / signal:** Volt-free contact inputs
- **Range:** 6 or 10 zones, up to 18 actuators
- **Power:** 230 V~ ±10% or 24 V~ ±20%
- **Article codes (5):** `FXV3006F001`, `FXV3110F001`, `FXV3110F002`, `FXV3210F001`, `FXV3210F002`
- **Image:** [fxv3.jpg](images/fxv3.jpg)

#### FXV 33** EasySwitch: EasySwitch distributor for control signals

- **RO:** Distribuitor EasySwitch pentru semnale de comandă
- **id:** `fxv-33-easyswitch` (site page `/produse/fxv-33-easyswitch`)
- **Function:** EasySwitch distributor for eight room thermostats and a maximum of twelve thermal actuators.
- **Features:**
  - Flexible assignment via rotary switches
  - Pump logic module and LED indicators
- **Model:** SAUTER FXV 3308 (FXV3308F011)
- **Protocol / signal:** Contact input for set-back
- **Range:** Max. 8 zones, max. 12 thermal actuators
- **Power:** 230 V~, ±10%, 50...60 Hz
- **Article codes (1):** `FXV3308F011`
- **Image:** [fxv33-easyswitch.png](images/fxv33-easyswitch.png)

<a id="fam-7-2"></a>

### 7.2 SAIO 100 I/O Module (Modul I/O SAIO 100)

1 product.

#### SAIO 100: I/O module for smart actuators

- **RO:** Modul I/O pentru servomotoare inteligente
- **id:** `saio-100` (site page `/produse/saio-100`)
- **Function:** I/O expansion module for the Smart Actuator, with five universal I/Os and three changeover relays.
- **Features:**
  - Five integrated universal inputs/outputs
  - Three changeover relays for pumps or fans
- **Model:** SAUTER SAIO 100 (SAIO100F020)
- **Protocol / signal:** SLC slave via RS-485
- **Range:** 5 universal I/O, 3 relays 10 A / 5 A
- **Power:** 24 VAC/DC; 1,2 VA at 24 VDC
- **Article codes (1):** `SAIO100F020`
- **Image:** [saio100.png](images/saio100.png)

<a id="fam-7-3"></a>

### 7.3 modulo 6 Connection Modules (Module Conectare modulo 6)

3 products.

#### EY6LC01: Module for separate I/O module power supply

- **RO:** Modul de alimentare separată a modulelor I/O
- **id:** `ey6lc01` (site page `/produse/ey6lc01`)
- **Function:** Module providing a power supply for the I/O modules separate from the modulo 6 automation station.
- **Features:**
  - Power supply separate from the station
  - Enables expansion to 24 I/O modules
- **Model:** SAUTER EY6LC01 (EY6LC01F001)
- **Protocol / signal:** *Not specified*
- **Range:** Expansion up to 24 I/O modules
- **Power:** 24 V= ±10%, < 19 W at max. load
- **Article codes (1):** `EY6LC01F001`
- **Image:** [ey6lc01.png](images/ey6lc01.png)

#### EY6LC02: I/O module coupling kit

- **RO:** Kit de cuplare a modulelor I/O
- **id:** `ey6lc02` (site page `/produse/ey6lc02`)
- **Function:** Coupling kit allowing the I/O modules to be arranged in up to three rows in the control cabinet.
- **Features:**
  - I/O modules arranged in up to three rows
  - Maximum of two modu602-LC modules per station
- **Model:** SAUTER EY6LC02 (EY6LC02F001)
- **Protocol / signal:** *Not specified*
- **Range:** Max. 2 kits/station, cable max. 3 m
- **Power:** From AS or LC via the I/O bus
- **Article codes (1):** `EY6LC02F001`
- **Image:** [1028539-869x1024.png](images/1028539-869x1024.png)

#### EY6LC12: IP coupler for I/O modules

- **RO:** Cuplor IP pentru module I/O
- **id:** `ey6lc12` (site page `/produse/ey6lc12`)
- **Function:** IP coupler with web server allowing decentralised mounting of modulo 6 I/O and COM modules.
- **Features:**
  - Decentralised installation via the IP network
  - Integrated web server and Bluetooth interface
- **Model:** SAUTER EY6LC12 (EY6LC12F011)
- **Protocol / signal:** Ethernet 10/100 BASE-T(X), 2 × RJ45
- **Range:** Up to 24 I/O and COM modules
- **Power:** 24 VDC ±10%, ≤ 24 W at max. load
- **Article codes (2):** `EY6LC12F011`, `EY6LC12F012`
- **Image:** [ey6lc12.png](images/ey6lc12.png)

<a id="fam-7-4"></a>

### 7.4 modulo 6 I/O Modules (Module I/O modulo 6)

4 products.

#### EY6IO30: I/O module with 16 digital inputs

- **RO:** Modul I/O cu 16 intrări digitale
- **id:** `ey6io30` (site page `/produse/ey6io30`)
- **Function:** I/O module with 16 digital inputs for capturing alarm, status or pulse signals in HVAC.
- **Features:**
  - 16 digital inputs (alarm, status, pulse)
  - Can be fitted with the modu600-LO unit
- **Model:** SAUTER EY6IO30 (EY6IO30F001)
- **Protocol / signal:** DI/CI inputs, pulse counter ≤ 50 Hz
- **Range:** 16 × DI/CI, internal supply ~13 VDC
- **Power:** From AS or LC via the I/O bus
- **Article codes (1):** `EY6IO30F001`
- **Image:** [1014061.png](images/1014061.png)

#### EY6IO31: I/O module with 8 universal inputs

- **RO:** Modul I/O cu 8 intrări universale
- **id:** `ey6io31` (site page `/produse/ey6io31`)
- **Function:** I/O module with 8 universal and 8 digital inputs, for Ni/Pt1000, resistive or 0…10 V probes.
- **Features:**
  - 8 universal and 8 digital inputs
  - Ni1000, Pt1000, R, U analogue inputs
- **Model:** SAUTER EY6IO31 (EY6IO31F001)
- **Protocol / signal:** U: 0(2)…10 V, Ni1000/Pt1000, R 200…2500 Ω
- **Range:** 8 × UI (DI/CI/AI) and 8 × DI/CI
- **Power:** From AS or LC via the I/O bus
- **Article codes (1):** `EY6IO31F001`
- **Image:** [ey6io31.png](images/ey6io31.png)

#### EY6IO50: I/O module with 6 relay outputs

- **RO:** Modul I/O cu 6 ieșiri pe releu
- **id:** `ey6io50` (site page `/produse/ey6io50`)
- **Function:** I/O module with 6 relay outputs for controlling contactors, valve actuators and displays.
- **Features:**
  - 6 digital relay outputs (2 A)
  - Controls contactors and valve actuators
- **Model:** SAUTER EY6IO50 (EY6IO50F001)
- **Protocol / signal:** Relay outputs, galvanically isolated NO contact
- **Range:** 6 × relay DO, 24 VDC/24…250 VAC, 2 A
- **Power:** From AS or LC via the I/O bus
- **Article codes (1):** `EY6IO50F001`
- **Image:** [ey6io50.png](images/ey6io50.png)

#### EY6IO71: I/O module with 8 analogue outputs

- **RO:** Modul I/O cu 8 ieșiri analogice
- **id:** `ey6io71` (site page `/produse/ey6io71`)
- **Function:** I/O module with 8 analogue 0(2)…10 V outputs and 8 digital inputs, for controlling HVAC equipment.
- **Features:**
  - 8 analogue outputs and 8 digital inputs
  - Control with standard 0(2)…10 V signal
- **Model:** SAUTER EY6IO71 (EY6IO71F001)
- **Protocol / signal:** Analogue outputs 0(2)…10 V, load ≤ 2 mA
- **Range:** 8 × AO 0(2)…10 V and 8 × DI/CI
- **Power:** From AS/LC via the I/O bus, ≤ 1 W
- **Article codes (1):** `EY6IO71F001`
- **Image:** [ey6io71.png](images/ey6io71.png)

<a id="fam-7-5"></a>

### 7.5 modulo 6 Communication Modules (Module Comunicație modulo 6)

2 products.

#### EY6CM20: Modbus/RTU RS-485 communication module

- **RO:** Modul de comunicație Modbus/RTU RS-485
- **id:** `ey6cm20` (site page `/produse/ey6cm20`)
- **Function:** RS-485 communication module integrating third-party Modbus/RTU devices into modulo 6 stations.
- **Features:**
  - Isolated RS-485 interface, Modbus RTU/ASCII
  - Speed 600…115 200 bit/s, Modbus master
- **Model:** SAUTER EY6CM20 (EY6CM20F011)
- **Protocol / signal:** Modbus/RTU and Modbus/ASCII master V1.02
- **Range:** 600 Modbus channels, up to 247 devices
- **Power:** From AS/LC via the I/O bus, 30 mA
- **Article codes (1):** `EY6CM20F011`
- **Image:** [ey6cm20.png](images/ey6cm20.png)

#### EY6CM30: M-Bus communication module

- **RO:** Modul de comunicație M-Bus
- **id:** `ey6cm30` (site page `/produse/ey6cm30`)
- **Function:** M-Bus master module for integrating heat and electricity meters into modulo 6.
- **Features:**
  - M-Bus master for meter networks
  - 2-wire M-Bus network, up to 80 unit loads
- **Model:** SAUTER EY6CM30 (EY6CM30F031)
- **Protocol / signal:** M-Bus master (EN 13757-3), RS-232
- **Range:** Up to 256 devices and 600 values
- **Power:** From AS/LC via the I/O bus, 7.42 W
- **Article codes (1):** `EY6CM30F031`
- **Image:** [1028541.png](images/1028541.png)

<a id="fam-7-6"></a>

### 7.6 modulo 6 BACnet Router (Router BACnet modulo 6)

1 product.

#### EY6RT30: BACnet router and BACnet/SC hub

- **RO:** Router BACnet și hub BACnet/SC
- **id:** `ey6rt30` (site page `/produse/ey6rt30`)
- **Function:** BACnet router and BACnet/SC hub on DIN rail, for interconnecting IP networks in the modulo 6 system.
- **Features:**
  - B-RTR, B-SCHUB and B-BBMD profiles
  - Four RJ45 ports, TLS 1.3 encryption
- **Model:** SAUTER EY6RT30 (EY6RT30F001)
- **Protocol / signal:** BACnet/IP, BACnet/SC (TLS 1.3)
- **Range:** Two IP networks, 4 × RJ45, 10/100 Mbit/s
- **Power:** 24 VDC ±10%, ≤ 3 W
- **Article codes (2):** `EY6RT30F001`, `EY6RT30F002`
- **Image:** [ey6rt30.png](images/ey6rt30.png)

<a id="fam-7-7"></a>

### 7.7 ecosCom581 EnOcean Radio Interface (Interfață Radio EnOcean ecosCom581)

1 product.

#### EY-CM 581: EnOcean radio interface for ecos stations

- **RO:** Interfață radio EnOcean pentru stații ecos
- **id:** `ey-cm-581` (site page `/produse/ey-cm-581`)
- **Function:** EnOcean radio interface for integrating sensors and room operating units into ecos stations.
- **Features:**
  - Bidirectional EnOcean communication
  - Optimised internal radio antenna
- **Model:** SAUTER ecosCom581 (EY-CM581F081)
- **Protocol / signal:** EnOcean 868,3 MHz; SLC on RS-485
- **Range:** Range up to 30 m; SLC cable ≤ 100 m
- **Power:** 5…24 VDC ±20%; typ. 10…36 mA
- **Article codes (1):** `EY-CM581F081`
- **Image:** [ey-cm-581.png](images/ey-cm-581.png)

<a id="fam-7-8"></a>

### 7.8 ecoLink I/O Modules (Module I/O ecoLink)

4 products.

#### EY-EM 510…512: ecoLink510…512 remote I/O module

- **RO:** Modul I/O la distanță ecoLink510…512
- **id:** `ey-em-510-512` (site page `/produse/ey-em-510-512`)
- **Function:** 24 VAC remote I/O modules for expanding the input and output mix of ecos504/505.
- **Features:**
  - Relay, Triac and 0…10 V outputs
  - Mounting up to 500 m from the station
- **Model:** SAUTER ecoLink510 (EY-EM510F001)
- **Protocol / signal:** SLC on RS-485, from ecos504/505
- **Range:** 3 relays, 3 Triac, 3 AO, 4 inputs, 2 Ni1000
- **Power:** 24 VAC ±20%, ≤ 0,2 A, ≤ 6,6 VA
- **Article codes (3):** `EY-EM510F001`, `EY-EM511F001`, `EY-EM512F001`
- **Image:** [ey-em-510-512.jpg](images/ey-em-510-512.jpg)

#### EY-EM 514, 515: ecoLink514, 515 remote I/O module

- **RO:** Modul I/O la distanță ecoLink514, 515
- **id:** `ey-em-514-515` (site page `/produse/ey-em-514-515`)
- **Function:** 24 VAC/DC remote I/O modules with FET outputs, for ceilings, fan coil units and blinds.
- **Features:**
  - Controls ceilings, fan coils and blinds
  - Inputs for presence and temperature
- **Model:** SAUTER ecoLink514 (EY-EM514F001)
- **Protocol / signal:** SLC on RS-485, from ecos504/505
- **Range:** 4 relays, 6 FET, 4 AO, 4 universal inputs
- **Power:** 24 VAC ±20% / 24 VDC ±10%, ≤ 150 mA
- **Article codes (2):** `EY-EM514F001`, `EY-EM515F001`
- **Image:** [926815.jpg](images/926815.jpg)

#### EY-EM 522, 523: ecoLink522, 523 230 V I/O module

- **RO:** Modul I/O 230 V ecoLink522, 523
- **id:** `ey-em-522-523` (site page `/produse/ey-em-522-523`)
- **Function:** 230 V remote I/O module for ecos504/505, with relay contacts and DIM outputs for lighting control.
- **Features:**
  - Switching and dimming for up to 4 luminaires
  - Placement up to 500 m from the station
- **Model:** SAUTER EY-EM 522, 523 (EY-EM522F001)
- **Protocol / signal:** RS-485, SLC protocol, up to 500 m
- **Range:** 4 relays, 4 DIM-10V, 4 AO, 4 UI inputs
- **Power:** 230 VAC ±10%, 50...60 Hz
- **Article codes (2):** `EY-EM522F001`, `EY-EM523F001`
- **Image:** [ey-em-522-523.jpg](images/ey-em-522-523.jpg)

#### EY-EM 527: ecoLink527 230 V I/O module

- **RO:** Modul I/O 230 V ecoLink527
- **id:** `ey-em-527` (site page `/produse/ey-em-527`)
- **Function:** 230 V remote I/O module for ecos504/505, with meter inputs and control of dampers, windows and blinds.
- **Features:**
  - Controls dampers, windows and blinds
  - Meter inputs for 10 Hz pulses
- **Model:** SAUTER EY-EM 527 (EY-EM527F001)
- **Protocol / signal:** RS-485, SLC protocol, up to 500 m
- **Range:** 4 relays, 4 universal inputs, 4 digital
- **Power:** 230 VAC ±10%, 50...60 Hz
- **Article codes (1):** `EY-EM527F001`
- **Image:** [ey-em-527.png](images/ey-em-527.png)

<a id="fam-7-9"></a>

### 7.9 moduNet Communication Modules (Module Comunicație moduNet)

2 products.

#### EY-BU 292: moduNet292 novaNet-Ethernet interface

- **RO:** Interfață novaNet-Ethernet moduNet292
- **id:** `ey-bu-292` (site page `/produse/ey-bu-292`)
- **Function:** Bus access interface for integrating novaNet EY3600 and modulo 2 stations into Ethernet LAN/WAN networks.
- **Features:**
  - Integrates novaNet stations into IP networks
  - RS-232 interface for parameterisation
- **Model:** SAUTER EY-BU 292 (EY-BU292F001)
- **Protocol / signal:** TCP/IP, Ethernet 10 Base-T, novaNet
- **Range:** 1 × RJ-45 10 Mbit/s, 1 × novaNet a/b
- **Power:** 230 V~ / 115 V~, 6 VA, < 7 W
- **Article codes (1):** `EY-BU292F001`
- **Image:** [481484.jpg](images/481484.jpg)

#### EYZ 291: Router for the novaNet bus

- **RO:** Router pentru bus novaNet
- **id:** `eyz-291` (site page `/produse/eyz-291`)
- **Function:** novaNet bus access router with RS-232 interface, for CASE configuration and remote access via modem.
- **Features:**
  - Remote access via RS-232 modem
  - 1 MB buffer between novaNet and RS-232
- **Model:** SAUTER EYZ 291 (EYZ291F001)
- **Protocol / signal:** novaNet two-wire, RS-232 (DB9)
- **Range:** 1 × a/b + RJ-11 novaNet, 1 × COM DTE
- **Power:** 230 V~, 50/60 Hz, max. 10 VA
- **Article codes (1):** `EYZ291F001`
- **Image:** [eyz-291.jpg](images/eyz-291.jpg)

<a id="fam-7-10"></a>

### 7.10 Digital Services Gateways (Gateway-uri Digital Services)

2 products.

#### YCS451F001: VPN connector for remote management

- **RO:** Conector VPN pentru management la distanță
- **id:** `ycs451f001` (site page `/produse/ycs451f001`)
- **Function:** DIN rail VPN gateway for Digital Services Remote Management, with integrated configuration web server.
- **Features:**
  - Integrated web server for configuration
  - Aluminium housing for DIN rail 43880
- **Model:** SAUTER YCS451F001 (conector VPN) (RO "conector VPN" = VPN connector; the source has no English value)
- **Protocol / signal:** VPN Open SSL/L2TP, Ethernet 10/100
- **Range:** 1 × RJ45 10/100 BASE-T(X), 3 × USB-C
- **Power:** 12...24 V=, 2 A
- **Article codes (1):** `YCS451F001`
- **Image:** [ycs451f020.png](images/ycs451f020.png). Note: same file also used for `ycs451f020`.

#### YCS451F020: Universal protocol conversion gateway

- **RO:** Gateway universal de conversie protocol
- **id:** `ycs451f020` (site page `/produse/ycs451f020`)
- **Function:** Universal DIN rail gateway with LTE, for protocol conversion, VPN access and cloud data transfer.
- **Features:**
  - LTE Cat 1 with antenna for communication
  - Data connector for the Customer Portal
- **Model:** SAUTER YCS451F020 Universal Gateway
- **Protocol / signal:** KNX, Modbus, BACnet, MQTT, OPC-UA, SNMP
- **Range:** 2 × RJ45, 2 × RS-485 2400...115200 bps
- **Power:** 24 VDC ±20%, 1 A; typ. 5 W
- **Article codes (6):** `YCS451F020`, `YCS455F312`, `YCS455F314`, `YCS455F301`, `YCS455F302`, `YCS455F307`
- **Image:** [ycs451f020.png](images/ycs451f020.png). Note: same file also used for `ycs451f001`.

<a id="cat-8"></a>

## 8. Power & Accessories (Alimentare & Accesorii)

1 product in 1 family. Source: `lib/product-data.ts`, entries with `category: "Alimentare & Accesorii"`.

<a id="fam-8-1"></a>

### 8.1 modulo Power Supplies (Surse Alimentare modulo)

1 product.

#### EY-PS 031: DIN rail power supply

- **RO:** Sursă de alimentare pe șină DIN
- **id:** `ey-ps-031` (site page `/produse/ey-ps-031`)
- **Function:** Switch-mode DIN rail power supply, 110…240 VAC / 24 VDC, for modulo stations, I/O modules and field devices.
- **Features:**
  - HICCUP short-circuit-protected output
  - Flat housing for compact DIN rail mounting
- **Model:** SAUTER EY-PS 031 (EY-PS031F011)
- **Protocol / signal:** *Not specified*
- **Range:** 30…100 W, 1,25…4,16 A at 24 VDC ±3%
- **Power:** 110…240 VAC, 45…65 Hz
- **Article codes (3):** `EY-PS031F011`, `EY-PS031F021`, `EY-PS031F041`
- **Image:** [ey-ps-031.png](images/ey-ps-031.png)

<a id="images-only"></a>

## Products seen only as images

The website's image folder `public/products/` holds 50 files that no product uses. They are copied byte for byte into [`images-unreferenced/`](images-unreferenced/). What each shows comes from its file name and from looking at the picture; "label reads" means text read off the picture itself. These pictures are not catalogue data: a picture shows neither that SOVITECH offers the product nor which variant it is. Source: `catalogue.json`, `images.presentButUnreferenced`, where `samePictureAs` lists each match.

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

---

Entries in this file: 178, one per product in `catalogue.json` (`productCount` 178). Generated on 2026-09-24 from `catalogue.json`; website repository commit `e0806142735dbdd53b913af30102f9227b380475`.
