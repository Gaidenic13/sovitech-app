"use client"

// LINKS-TO-REACTIVATE: Cost orientativ al unui sistem BMS | interim /resurse/cost-sistem-bms | final /costuri
// TODO(confirm): duratele orientative pe etape, fata de practica reala a echipei
// TODO(SLA): nivelurile de contract Baza/Extins/Critic sunt descrise fara timpi de raspuns;
// valorile pe severitate se publica doar dupa confirmarea firmei (vezi pagina de intretinere).

import { useState } from "react"
import Link from "next/link"
import { HeroField } from "@/components/hero-field"
import {
  Check, ChevronDown, ChevronRight, ArrowRight,
  FileText, Network, Wrench, HardHat, RefreshCw, Scale,
} from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useScrollToSection } from "@/hooks/use-scroll-to-section"

/* ─── Per-tab detailed content ──────────────────────────────────────── */
const serviceContent = {
  consultanta: {
    accentColor: "#E3E1F9",
    accentText: "#5C5FD4",
    icon: <Scale className="h-6 w-6" />,
    href: "/servicii/consultanta",
    heroRo: "Consultanță",
    heroEn: "Consultancy",
    subtitleRo: "Înainte de a exista un proiect sau o ofertă: verificarea unei obligații legale, compararea a două oferte, revizuirea unei arhitecturi. Livrabilul principal este un raport tehnic cu recomandări și estimare de cost, în 1-10 zile lucrătoare.",
    subtitleEn: "Before a project or an offer exists: checking a legal obligation, comparing two offers, reviewing an architecture. The main deliverable is a technical report with recommendations and a cost estimate, in 1-10 working days.",
    steps: [
      { titleRo: "Stabilirea sferei și preluarea documentelor", titleEn: "Setting the scope and receiving the documents", descRo: "O discuție de 30-60 de minute stabilește întrebarea la care răspunde raportul. Se preiau ofertele, proiectele, listele de puncte și facturile de energie disponibile.", descEn: "A 30-60 minute discussion sets the question the report answers. The available offers, designs, points lists and energy bills are taken over." },
      { titleRo: "Vizita pe clădire, unde este cazul", titleEn: "The building visit, where applicable", descRo: "Verificarea sistemului existent, a instalațiilor și a tablourilor, într-o zi pe teren.", descEn: "Checking the existing system, the installations and the panels, in one day on site." },
      { titleRo: "Analiza și redactarea", titleEn: "Analysis and writing", descRo: "Compararea, verificarea față de repere de piață și de praguri legale, redactarea raportului. Fiecare cifră are banda și domeniul declarate.", descEn: "The comparison, checking against market references and legal thresholds, writing the report. Every figure has its band and domain declared." },
      { titleRo: "Prezentarea raportului", titleEn: "Presenting the report", descRo: "O discuție de o oră, cu întrebări și cu ajustarea recomandărilor. Raportul poate fi folosit în discuția cu toți ofertanții, fără restricții.", descEn: "A one-hour discussion, with questions and adjustment of the recommendations. The report can be used with all bidders, without restrictions." },
    ],
    deliverables: [
      { ro: "Tabel de aliniere a ofertelor pe aceeași sferă", en: "An offer alignment table on the same scope" },
      { ro: "Notă de conformare, cu prag și articol de lege", en: "A compliance note, with threshold and article of law" },
      { ro: "Raport de arhitectură, cu riscuri și alternative", en: "An architecture report, with risks and alternatives" },
      { ro: "Listă de constatări pe un sistem existent", en: "A list of findings on an existing system" },
      { ro: "Estimare de cost pe benzi de piață", en: "A cost estimate on market bands" },
      { ro: "Grilă de evaluare a ofertanților", en: "A bidder evaluation grid" },
    ],
  },
  proiectare: {
    accentColor: "#C8E6C9",
    accentText: "#1F6B4A",
    icon: <FileText className="h-6 w-6" />,
    href: "/servicii/proiectare-automatizari-bms",
    heroRo: "Proiectare automatizări și BMS",
    heroEn: "BMS and automation design",
    subtitleRo: "Pentru clădiri noi sau renovări majore, înainte de licitație sau de comanda echipamentelor. Livrabilul principal: proiect tehnic, listă de puncte, caiet de sarcini, scheme de tablou. Durată orientativă: 3-8 săptămâni pentru o clădire de birouri de circa 10.000 mp.",
    subtitleEn: "For new buildings or major renovations, before the tender or the equipment order. The main deliverable: a technical design, points list, technical specification, panel diagrams. Indicative duration: 3-8 weeks for an office building of around 10,000 sqm.",
    steps: [
      { titleRo: "Tema de proiectare și preluarea proiectelor de instalații", titleEn: "The design brief and the services designs", descRo: "Se stabilesc instalațiile incluse, regimul de ocupare, cerințele de raportare și cine va opera sistemul. Se identifică echipamentele care vin cu automatizare proprie.", descEn: "The included installations, occupancy pattern, reporting requirements and who will operate the system are established. Equipment with its own controls is identified." },
      { titleRo: "Schema funcțională și secvențele", titleEn: "The functional diagram and the sequences", descRo: "Se desenează fiecare instalație și se scriu secvențele de funcționare în text, inclusiv regimurile de avarie și interblocajele.", descEn: "Each installation is drawn and the operating sequences are written in text, including failure modes and interlocks." },
      { titleRo: "Lista de puncte și arhitectura", titleEn: "The points list and the architecture", descRo: "Se stabilesc punctele, împărțirea pe controlere, magistralele, protocoalele și rezerva de puncte. Proiectul se scrie pe protocoale deschise: BACnet, Modbus, KNX, DALI, M-Bus.", descEn: "The points, controller split, buses, protocols and points reserve are established. The design is written on open protocols: BACnet, Modbus, KNX, DALI, M-Bus." },
      { titleRo: "Caiet de sarcini, estimare și predare", titleEn: "Specification, estimate and handover", descRo: "Cerințe de execuție, criterii de recepție, estimare de cost pe capitole, o rundă de observații și revizia finală.", descEn: "Execution requirements, acceptance criteria, a cost estimate by chapter, one round of comments and the final revision." },
    ],
    deliverables: [
      { ro: "Lista de puncte, în format editabil", en: "The points list, in editable format" },
      { ro: "Schema funcțională pe fiecare instalație", en: "The functional diagram for each installation" },
      { ro: "Caietul de sarcini, cu criterii de recepție", en: "The specification, with acceptance criteria" },
      { ro: "Schemele de tablou de automatizare", en: "The automation panel diagrams" },
      { ro: "Specificația de echipamente, echivalabilă", en: "The equivalence-ready equipment specification" },
      { ro: "Estimarea de cost pe capitole", en: "The cost estimate by chapter" },
    ],
  },
  executie: {
    accentColor: "#C5C0F5",
    accentText: "#5C5FD4",
    icon: <HardHat className="h-6 w-6" />,
    href: "/servicii/executie-sisteme-bms",
    heroRo: "Execuție sisteme BMS",
    heroEn: "BMS execution",
    subtitleRo: "După ce proiectul există și echipamentele de instalații sunt stabilite. Livrabilul principal: sistem funcțional, tablou, programe, HMI, punere în funcțiune, As-built. Durată orientativă: 8-20 de săptămâni, în funcție de ritmul șantierului și de termenele de livrare.",
    subtitleEn: "Once the design exists and the mechanical equipment is settled. The main deliverable: a working system, panel, programs, HMI, commissioning, As-built. Indicative duration: 8-20 weeks, depending on site pace and delivery lead times.",
    steps: [
      { titleRo: "Proiect de execuție și comenzi", titleEn: "Execution design and orders", descRo: "Verificarea listei de puncte pe teren, actualizarea schemelor și lansarea comenzilor de echipamente. Livrarea este etapa cu cea mai mare variație.", descEn: "On-site verification of the points list, updating the diagrams and placing the equipment orders. Delivery is the stage with the greatest variation." },
      { titleRo: "Tablou și cablare pe clădire", titleEn: "Panel and building cabling", descRo: "Confecția tabloului de forță și automatizare, trasee, cablu de semnal și magistrală, montaj senzori și servomotoare, punere sub tensiune.", descEn: "Assembly of the power and automation panel, routes, signal and bus cable, mounting of sensors and actuators, energisation." },
      { titleRo: "Programare și interfață grafică", titleEn: "Programming and graphical interface", descRo: "Implementarea secvențelor, parametrizarea buclelor, sinoptice pe fiecare instalație, matrice de alarme pe trei niveluri, trend-loguri configurate.", descEn: "Implementing the sequences, tuning the loops, synoptics for each installation, a three-level alarm matrix, configured trend logs." },
      { titleRo: "Verificare, testare funcțională și instruire", titleEn: "Verification, functional testing and training", descRo: "Fiecare punct se verifică fizic, fiecare secvență se testează în condiții reale, inclusiv regimurile de avarie, cu proces-verbal semnat și instruirea echipei de operare.", descEn: "Every point is physically checked, every sequence is tested in real conditions, including failure modes, with a signed report and training of the operating team." },
    ],
    deliverables: [
      { ro: "Tabloul electric de forță și automatizare", en: "The power and automation electrical panel" },
      { ro: "Cablarea și echipamentele de câmp montate", en: "The cabling and the mounted field equipment" },
      { ro: "Programele de control și monitorizare", en: "The control and monitoring programs" },
      { ro: "Interfața grafică HMI, cu drepturi de acces", en: "The HMI graphical interface, with access rights" },
      { ro: "Procesul-verbal de punere în funcțiune", en: "The commissioning report" },
      { ro: "Documentația As-built, backup și parole predate", en: "The As-built documentation, backup and passwords handed over" },
    ],
  },
  integrare: {
    accentColor: "#FFE0B2",
    accentText: "#E65100",
    icon: <Network className="h-6 w-6" />,
    href: "/servicii/integrare-sisteme-knx-dali-modbus-mbus",
    heroRo: "Integrare KNX, DALI, Modbus, M-Bus",
    heroEn: "KNX, DALI, Modbus, M-Bus integration",
    subtitleRo: "Când chillerul, centrala de tratare a aerului, iluminatul și contoarele au fiecare automatizarea proprie și nu se văd într-un singur ecran. Livrabilul principal: puncte integrate, mapare de adrese, ecrane unificate. Durată orientativă: 2-10 săptămâni.",
    subtitleEn: "When the chiller, the air handling unit, the lighting and the meters each have their own controls and cannot be seen on one screen. The main deliverable: integrated points, address mapping, unified screens. Indicative duration: 2-10 weeks.",
    steps: [
      { titleRo: "Inventar și fezabilitate", titleEn: "Inventory and feasibility", descRo: "Se identifică fiecare echipament, protocolul, interfața fizică existentă și lista de valori expuse efectiv. Se stabilește ce se poate citi și ce se poate comanda.", descEn: "Each device is identified, with its protocol, existing physical interface and the values it actually exposes. What can be read and what can be commanded is established." },
      { titleRo: "Tabelul de mapare", titleEn: "The mapping table", descRo: "Punct cu punct: registrul sau obiectul din echipament, adresa în BMS, unitatea, scalarea, sensul comenzii. Se decide ce se comandă din BMS și ce rămâne pe automatizarea proprie.", descEn: "Point by point: the register or object in the equipment, the BMS address, the unit, the scaling, the command direction. What is commanded from the BMS and what stays local is decided." },
      { titleRo: "Magistrale și interfețe", titleEn: "Buses and interfaces", descRo: "Gateway-uri și convertoare unde sunt necesare, cablare de magistrală, adresare, terminații, punerea în comunicație a fiecărui echipament.", descEn: "Gateways and converters where needed, bus cabling, addressing, terminations, bringing each device into communication." },
      { titleRo: "Verificare valoare cu valoare și predare", titleEn: "Value-by-value verification and handover", descRo: "Fiecare punct integrat se compară cu valoarea afișată local pe echipament. Se testează comenzile și comportamentul la pierderea comunicației, apoi se predă tabelul de mapare final.", descEn: "Every integrated point is compared with the value displayed locally on the device. Commands and communication-loss behaviour are tested, then the final mapping table is handed over." },
    ],
    deliverables: [
      { ro: "Inventarul echipamentelor integrabile", en: "The inventory of integrable equipment" },
      { ro: "Tabelul de mapare, punct cu punct", en: "The mapping table, point by point" },
      { ro: "Gateway-uri și convertoare configurate", en: "Configured gateways and converters" },
      { ro: "Sinoptice cu valorile reale ale echipamentelor", en: "Synoptics with the equipment's real values" },
      { ro: "Alarme de pierdere a comunicației", en: "Communication-loss alarms" },
      { ro: "Trend-loguri pe punctele integrate", en: "Trend logs on the integrated points" },
    ],
  },
  intretinere: {
    accentColor: "#B2EBF2",
    accentText: "#006064",
    icon: <Wrench className="h-6 w-6" />,
    href: "/servicii/intretinere-sisteme-bms",
    heroRo: "Întreținere sisteme BMS",
    heroEn: "BMS maintenance",
    subtitleRo: "După recepție, permanent. Contract pe trei niveluri, Bază, Extins și Critic, cu verificări planificate, registru de intervenții și raport periodic. Cost anual: 4-7% din valoarea investiției pentru nivelul de bază, 7-12% pentru cel extins.",
    subtitleEn: "After acceptance, permanently. A contract on three levels, Base, Extended and Critical, with planned checks, an intervention log and a periodic report. Annual cost: 4-7% of the investment value at the base level, 7-12% at the extended level.",
    steps: [
      { titleRo: "Analiza sistemului existent", titleEn: "Analysis of the existing system", descRo: "O zi pe clădire: lista de puncte, programele orare, punctele pe manual, alarmele active, accesul de nivel inginer și disponibilitatea pieselor.", descEn: "One day in the building: the points list, the schedules, the points in manual, the active alarms, engineer-level access and parts availability." },
      { titleRo: "Raportul de constatări și alegerea nivelului", titleEn: "The findings report and choosing the level", descRo: "Constatările se separă în ce se rezolvă din configurare și ce cere intervenție fizică. Nivelul de contract se alege după consecința unei opriri, nu după dimensiunea clădirii.", descEn: "Findings are split into what configuration can fix and what needs physical intervention. The contract level is chosen by the consequence of an outage, not by the size of the building." },
      { titleRo: "Punerea la punct înainte de contract", titleEn: "The tune-up before the contract", descRo: "Corectarea programelor orare, prioritizarea alarmelor, refacerea backup-urilor, completarea listei de puncte. Este etapa pe care majoritatea contractelor o sar.", descEn: "Correcting the schedules, prioritising the alarms, refreshing the backups, completing the points list. It is the stage most contracts skip." },
      { titleRo: "Regim curent", titleEn: "Ongoing operation", descRo: "Verificări planificate la frecvența din contract, intervenții la solicitare pe severitate, raport periodic cu alarme și consum față de anul anterior.", descEn: "Planned checks at the contract frequency, interventions on request by severity, a periodic report with alarms and consumption against the previous year." },
    ],
    deliverables: [
      { ro: "Verificări planificate, cu frecvență declarată", en: "Planned checks, at a declared frequency" },
      { ro: "Registru de intervenții actualizat la fiecare vizită", en: "An intervention log updated at every visit" },
      { ro: "Backup de configurație păstrat la beneficiar", en: "A configuration backup kept by the client" },
      { ro: "Raport periodic cu alarme dominante și consum", en: "A periodic report with dominant alarms and consumption" },
      { ro: "Intervenții la solicitare, încadrate pe severitate", en: "Interventions on request, classed by severity" },
      { ro: "Recomandări de piese de schimb, cu termene", en: "Spare part recommendations, with lead times" },
    ],
  },
  modernizare: {
    accentColor: "#EDE7DC",
    accentText: "#8B7B5C",
    icon: <RefreshCw className="h-6 w-6" />,
    href: "/servicii/modernizare-sisteme-de-automatizare-si-bms",
    heroRo: "Modernizare sisteme de automatizare și BMS",
    heroEn: "Automation and BMS modernisation",
    subtitleRo: "Când sistemul existent nu mai are piese, suport sau posibilitatea de a adăuga puncte. Sistem nou pe instalațiile existente, migrare pe etape, fără oprirea clădirii. Cost: 40-60% din prețul unui sistem nou, cu amortizare de 3-6 ani pentru o modernizare de capital. Durată: 3-12 luni, pe etape.",
    subtitleEn: "When the existing system has no more parts, support or room to add points. A new system on the existing installations, staged migration, without stopping the building. Cost: 40-60% of the price of a new system, with a 3-6 year payback for a capital modernisation. Duration: 3-12 months, staged.",
    steps: [
      { titleRo: "Audit al sistemului existent", titleEn: "Audit of the existing system", descRo: "Lista de puncte reală, starea elementelor de câmp, starea programelor, inventarul de licențe și capacitatea de export a datelor. Prima etapă nu este cumpărarea.", descEn: "The real points list, the state of the field devices and programs, the licence inventory and the data export capability. The first stage is not buying." },
      { titleRo: "Plan de migrare și buget pe faze", titleEn: "Migration plan and phased budget", descRo: "Ordinea zonelor, ce se păstrează și ce se înlocuiește, ferestrele de lucru și fazarea investiției pe ani bugetari.", descEn: "The order of the zones, what is kept and what is replaced, the work windows and the phasing of the investment across budget years." },
      { titleRo: "Migrare zonă cu zonă, cu sistemele în paralel", titleEn: "Migration zone by zone, systems in parallel", descRo: "Fiecare zonă se trece pe controlerul nou într-o fereastră convenită, cu punct de revenire la sistemul vechi până la validare. Clădirea rămâne în funcțiune.", descEn: "Each zone moves to the new controller in an agreed window, with a fallback to the old system until validation. The building stays in operation." },
      { titleRo: "Documentație, licențe și instruire", titleEn: "Documentation, licences and training", descRo: "As-built complet, predarea licențelor pe numele beneficiarului, a programelor sursă și a parolelor de nivel inginer, instruirea echipei.", descEn: "The complete As-built, handover of the licences in the client's name, the source programs and the engineer-level passwords, team training." },
    ],
    deliverables: [
      { ro: "Audit cu lista de puncte reală", en: "An audit with the real points list" },
      { ro: "Plan de migrare cu puncte de reversibilitate", en: "A migration plan with reversibility points" },
      { ro: "Controlere noi, cu rezerva declarată", en: "New controllers, with a declared reserve" },
      { ro: "Interfață grafică nouă, cu alarme prioritizate", en: "A new graphical interface, with prioritised alarms" },
      { ro: "Migrarea datelor istorice, unde exportul e posibil", en: "Historical data migration, where export is possible" },
      { ro: "Licențe, programe sursă și parole predate", en: "Licences, source programs and passwords handed over" },
    ],
  },
}

export default function ServiciiPage() {
  const [activeTab, setActiveTab] = useState<keyof typeof serviceContent>("consultanta")
  // Guides the user to the tab content, mainly for the journey indicator at the
  // bottom of the section, where the content being switched is off-screen. The
  // hook's in-view guard keeps the sticky top tab bar from jolting the page.
  // 64px accounts for the tab bar that sticks below the header on this page.
  const tabRef = useScrollToSection<HTMLDivElement>(activeTab, { stackedBarHeight: 64 })
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const { t } = useLanguage()

  const serviceCategories = [
    { id: "consultanta" as const, labelRo: "Consultanță", labelEn: "Consultancy" },
    { id: "proiectare" as const, labelRo: "Proiectare", labelEn: "Design" },
    { id: "executie" as const, labelRo: "Execuție", labelEn: "Execution" },
    { id: "integrare" as const, labelRo: "Integrare", labelEn: "Integration" },
    { id: "intretinere" as const, labelRo: "Întreținere", labelEn: "Maintenance" },
    { id: "modernizare" as const, labelRo: "Modernizare", labelEn: "Modernisation" },
  ]

  const active = serviceContent[activeTab]

  const offerings = [
    {
      id: "baza",
      nameRo: "Bază", nameEn: "Base",
      taglineRo: "4-7% din valoarea investiției pe an", taglineEn: "4-7% of the investment value per year",
      descRo: "Verificări planificate și asistență la distanță în programul de lucru. Intervențiile la fața locului și modificările de configurare se ofertează la solicitare.",
      descEn: "Planned checks and remote assistance during working hours. On-site interventions and configuration changes are quoted on request.",
      ctaRo: "Vezi detaliile contractului", ctaEn: "See the contract details",
      features: [
        { nameRo: "Verificări planificate, cu frecvență declarată", nameEn: "Planned checks, at a declared frequency", included: true },
        { nameRo: "Registru de intervenții și raport periodic", nameEn: "Intervention log and periodic report", included: true },
        { nameRo: "Asistență la distanță, în programul de lucru", nameEn: "Remote assistance, during working hours", included: true },
        { nameRo: "Backup de configurație la fiecare vizită", nameEn: "Configuration backup at every visit", included: true },
        { nameRo: "Recomandări de piese de schimb", nameEn: "Spare part recommendations", included: true },
        { nameRo: "Interval de disponibilitate extins", nameEn: "Extended availability window", included: false },
        { nameRo: "Intervenție la fața locului inclusă", nameEn: "On-site intervention included", included: false },
        { nameRo: "Modificări de configurare incluse", nameEn: "Configuration changes included", included: false },
        { nameRo: "Actualizări de firmware incluse, planificate", nameEn: "Firmware updates included, planned", included: false },
        { nameRo: "Severitate 1 preluată prin serviciu de permanență", nameEn: "Severity 1 taken over by an on-call service", included: false },
      ],
    },
    {
      id: "extins",
      nameRo: "Extins", nameEn: "Extended",
      taglineRo: "7-12% din valoarea investiției pe an", taglineEn: "7-12% of the investment value per year",
      taglineHighlight: true,
      descRo: "Interval de disponibilitate mai larg, intervenții la fața locului incluse în limita unui număr de vizite pe an și modificări de configurare incluse în limita unui buget de ore.",
      descEn: "A wider availability window, on-site interventions included up to a number of visits per year, and configuration changes included up to a budget of hours.",
      ctaRo: "Vezi detaliile contractului", ctaEn: "See the contract details",
      recommended: true,
      features: [
        { nameRo: "Verificări planificate, cu frecvență declarată", nameEn: "Planned checks, at a declared frequency", included: true },
        { nameRo: "Registru de intervenții și raport lunar", nameEn: "Intervention log and monthly report", included: true },
        { nameRo: "Asistență la distanță, în intervalul extins", nameEn: "Remote assistance, in the extended window", included: true },
        { nameRo: "Backup la fiecare vizită și după fiecare modificare", nameEn: "Backup at every visit and after every change", included: true },
        { nameRo: "Recomandări de piese, cu stoc recomandat", nameEn: "Spare part recommendations, with a recommended stock", included: true },
        { nameRo: "Interval de disponibilitate extins", nameEn: "Extended availability window", included: true },
        { nameRo: "Intervenție la fața locului inclusă, în limita vizitelor", nameEn: "On-site intervention included, up to the visit limit", included: true },
        { nameRo: "Modificări de configurare incluse, în buget de ore", nameEn: "Configuration changes included, within a budget of hours", included: true },
        { nameRo: "Actualizări de firmware incluse, planificate", nameEn: "Firmware updates included, planned", included: true },
        { nameRo: "Severitate 1 preluată prin serviciu de permanență", nameEn: "Severity 1 taken over by an on-call service", included: true },
      ],
    },
  ]

  const handoverItems = [
    { ro: "Lista de puncte finală, în format editabil, cu adresa fiecărui punct, tipul de semnal și echipamentul deservit.", en: "The final points list, in editable format, with each point's address, signal type and the equipment served." },
    { ro: "Documentația As-built: scheme funcționale, scheme de tablou, planuri cu poziția echipamentelor, manuale de operare.", en: "The As-built documentation: functional diagrams, panel diagrams, plans with equipment positions, operating manuals." },
    { ro: "Backup de configurație al controlerelor și al stației de supervizare, predat pe suport al beneficiarului, cu procedura de restaurare.", en: "The configuration backup of the controllers and the supervision station, handed over on the client's media, with the restore procedure." },
    { ro: "Programele de control, în forma în care pot fi deschise și modificate cu instrumentul de inginerie al platformei.", en: "The control programs, in the form in which they can be opened and modified with the platform's engineering tool." },
    { ro: "Parolele de nivel inginer și de administrare, predate beneficiarului, nu păstrate de furnizor.", en: "The engineer-level and administration passwords, handed to the client, not kept by the supplier." },
    { ro: "Procesul-verbal de punere în funcțiune, cu lista testelor efectuate și rezultatul fiecăruia.", en: "The commissioning report, with the list of tests performed and the result of each." },
  ]

  const costRows = [
    { tRo: "Birouri clasa A", tEn: "Class A offices", cRo: "9-18 EUR/mp", cEn: "9-18 EUR/sqm", oRo: "densitate uzuală 50-90 puncte la 1.000 mp", oEn: "usual density 50-90 points per 1,000 sqm" },
    { tRo: "Birouri clasa B", tEn: "Class B offices", cRo: "5-10 EUR/mp", cEn: "5-10 EUR/sqm", oRo: "fără contorizare extinsă pe chiriași", oEn: "without extended tenant metering" },
    { tRo: "Hotel, fără control pe cameră", tEn: "Hotel, without room control", cRo: "6-13 EUR/mp", cEn: "6-13 EUR/sqm", oRo: "doar instalațiile centrale", oEn: "central plant only" },
    { tRo: "Hotel, cu control pe cameră", tEn: "Hotel, with room control", cRo: "18-38 EUR/mp", cEn: "18-38 EUR/sqm", oRo: "costul camerei domină bugetul", oEn: "the room cost dominates the budget" },
    { tRo: "Retail", tEn: "Retail", cRo: "4-9 EUR/mp", cEn: "4-9 EUR/sqm", oRo: "replicabil pe rețea de magazine", oEn: "replicable across a store network" },
    { tRo: "Industrial și logistic", tEn: "Industrial and logistics", cRo: "3-8 EUR/mp", cEn: "3-8 EUR/sqm", oRo: "suprafețe mari, densitate mică de puncte", oEn: "large areas, low point density" },
    { tRo: "Pharma", tEn: "Pharma", cRo: "30-80 EUR/mp", cEn: "30-80 EUR/sqm", oRo: "zone clasificate, monitorizare validată", oEn: "classified areas, validated monitoring" },
    { tRo: "Pe punct de date", tEn: "Per data point", cRo: "90-320 EUR/punct", cEn: "90-320 EUR/point", oRo: "scade cu volumul", oEn: "decreases with volume" },
  ]

  const notDoing = [
    { titleRo: "Nu execută instalații de HVAC, sanitare sau electrice de putere", titleEn: "It does not execute HVAC, plumbing or power electrical installations", descRo: "Sistemul de automatizare se conectează la instalațiile executate de antreprenorii de specialitate.", descEn: "The automation system connects to installations executed by the specialist contractors." },
    { titleRo: "Nu vinde echipamente fără proiect sau fără punere în funcțiune", titleEn: "It does not sell equipment without a design or without commissioning", descRo: "Un controler livrat fără programare nu produce niciun rezultat.", descEn: "A controller delivered without programming produces no result." },
    { titleRo: "Nu execută sisteme de detecție și semnalizare a incendiului", titleEn: "It does not execute fire detection and alarm systems", descRo: "Nu preia responsabilitatea de scenariu de securitate la incendiu. Sistemul BMS preia semnale de la centrala de incendiu, ca informație, prin contacte sau protocol.", descEn: "It takes no responsibility for the fire safety scenario. The BMS takes signals from the fire alarm panel, as information, over contacts or protocol." },
    { titleRo: "Nu face audit energetic autorizat", titleEn: "It does not perform authorised energy audits", descRo: "În sensul Legii 121/2014, auditul energetic se face de un auditor atestat, iar Sovitech Control furnizează datele din sistem și implementează măsurile de automatizare.", descEn: "Within the meaning of Law 121/2014, the energy audit is done by a certified auditor, while Sovitech Control provides the system data and implements the automation measures." },
    { titleRo: "Nu certifică sisteme informatice și nu emite documente de conformitate NIS2", titleEn: "It does not certify IT systems and issues no NIS2 compliance documents", descRo: "Configurează segmentarea și accesul la distanță pe partea de automatizare, în cadrul cerut de echipa IT a beneficiarului.", descEn: "It configures segmentation and remote access on the automation side, within the framework required by the client's IT team." },
  ]

  const faqs = [
    { qRo: "Care este diferența dintre proiectare și execuție la un sistem BMS?", qEn: "What is the difference between design and execution for a BMS?", aRo: "Proiectarea produce documente: schema funcțională, lista de puncte, caietul de sarcini, schemele de tablou și specificația de echipamente. Execuția produce sistemul: tabloul, cablarea, montajul, programele, interfața grafică și punerea în funcțiune. Se pot contracta separat, iar un proiect scris corect poate fi executat și de alt furnizor.", aEn: "Design produces documents: the functional diagram, the points list, the technical specification, the panel diagrams and the equipment specification. Execution produces the system: the panel, the cabling, the installation, the programs, the graphical interface and the commissioning. They can be contracted separately, and a correctly written design can be executed by another supplier." },
    { qRo: "Cât durează un proiect complet de BMS, de la proiectare la punere în funcțiune?", qEn: "How long does a complete BMS project take, from design to commissioning?", aRo: "Pentru o clădire de birouri de circa 10.000 mp, proiectarea durează 3-8 săptămâni, iar execuția 8-20 de săptămâni, în funcție de disponibilitatea instalațiilor și de termenele de livrare a echipamentelor. Durata reală depinde de ritmul șantierului, nu de ritmul automatizării.", aEn: "For an office building of around 10,000 sqm, design takes 3-8 weeks and execution 8-20 weeks, depending on the availability of the installations and equipment lead times. The real duration depends on the site's pace, not the pace of the controls work." },
    { qRo: "Se poate contracta doar mentenanța, pentru un sistem executat de altcineva?", qEn: "Can maintenance alone be contracted, for a system executed by someone else?", aRo: "Da. Preluarea unui sistem executat de alt furnizor începe cu o zi de analiză: lista de puncte, starea programelor, accesul de nivel inginer și disponibilitatea pieselor. Dacă parolele de inginerie sau programele controlerelor nu au fost predate la recepție, acest lucru se constată înainte de a semna contractul, nu după.", aEn: "Yes. Taking over a system executed by another supplier starts with one day of analysis: the points list, the state of the programs, engineer-level access and parts availability. If the engineering passwords or the controller programs were not handed over at acceptance, this is established before signing the contract, not after." },
    { qRo: "Sovitech Control lucrează numai cu echipamente SAUTER?", qEn: "Does Sovitech Control work only with SAUTER equipment?", aRo: "Sovitech Control este partener autorizat SAUTER, Systems Partner, din 2017. Platforma implicită este SAUTER, dar proiectele se scriu pe protocoale deschise, BACnet, Modbus, KNX, DALI și M-Bus, astfel încât un caiet de sarcini întocmit de Sovitech Control poate fi executat și de alt furnizor.", aEn: "Sovitech Control has been an authorised SAUTER Systems Partner since 2017. The default platform is SAUTER, but the designs are written on open protocols, BACnet, Modbus, KNX, DALI and M-Bus, so a specification produced by Sovitech Control can be executed by another supplier as well." },
  ]

  const hubResources = [
    { href: "/resurse/cost-sistem-bms", ro: "Cost orientativ al unui sistem BMS", en: "Indicative cost of a BMS" },
    { href: "/referinte", ro: "Cele 25 de proiecte de referință", en: "The 25 reference projects" },
    { href: "/expertiza", ro: "Sectoarele acoperite", en: "The sectors we cover" },
    { href: "/ghid/sisteme-bms-cladiri", ro: "Ghidul complet al sistemelor BMS", en: "The complete guide to BMS" },
  ]

  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-[#07201C] min-h-[45vh] flex items-end pt-28 pb-16 relative overflow-hidden">
        <HeroField />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fingerprint-59QWj1Ik1Fd1hqzZduTrEqLz2j557z.svg" alt="" className="h-[600px] w-auto" />
        </div>
        <div className="container-site w-full relative z-10">
          <span className="text-[#C8E6C9] text-sm font-semibold tracking-wider uppercase mb-4 block">• {t("Servicii", "Services")}</span>
          <h1 className="text-4xl md:text-6xl font-light text-white leading-tight tracking-tighter">
            {t("Șase servicii BMS:", "Six BMS services:")}<br />{t("proiectare, execuție, integrare, întreținere, modernizare, consultanță", "design, execution, integration, maintenance, modernisation, consultancy")}
          </h1>
          <p className="text-lg text-white/60 font-light mt-4 max-w-2xl">
            {t(
              "Sovitech Control acoperă ciclul complet al unui sistem de automatizare a clădirii: proiectarea, execuția, integrarea echipamentelor cu automatizare proprie, întreținerea, modernizarea unui sistem existent și consultanța tehnică fără achiziție. Fiecare serviciu are livrabile numite, criterii de recepție scrise și o listă explicită cu ce nu include. Costul unui sistem BMS în România se situează în 4-18 EUR/mp și 90-320 EUR pe punct de date.",
              "Sovitech Control covers the complete lifecycle of a building automation system: design, execution, integration of equipment with built-in controls, maintenance, modernisation of an existing system and technical consultancy with no purchase attached. Every service has named deliverables, written acceptance criteria and an explicit list of what it does not include. The cost of a BMS in Romania sits within 4-18 EUR/sqm and 90-320 EUR per data point.",
            )}
          </p>
        </div>
      </section>

      {/* ── Sticky nav tabs ── */}
      <section className="sticky top-16 z-30 bg-[#07201C]/95 backdrop-blur border-b border-white/10">
        <div className="container-site">
          <div className="flex items-center gap-1 py-4 overflow-x-auto">
            {serviceCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all whitespace-nowrap ${activeTab === cat.id ? "bg-white text-[#0D2E2B]" : "text-white/60 hover:text-white"}`}
              >
                {t(cat.labelRo, cat.labelEn)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Per-tab content ── */}
      <section className="bg-[#F5F4F0] section-l">
        <div
          ref={tabRef}
          tabIndex={-1}
          role="group"
          aria-label={t("Detalii serviciu", "Service details")}
          className="container-site focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6B4A]/40"
        >

          {/* Tab header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
            <div>
              <div
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-4"
                style={{ backgroundColor: active.accentColor, color: active.accentText }}
              >
                {active.icon}
                {t(active.heroRo, active.heroEn)}
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] tracking-tighter leading-tight">
                {t(active.heroRo, active.heroEn)}
              </h2>
              <p className="mt-4 text-base text-[#555555] font-light max-w-2xl leading-relaxed">
                {t(active.subtitleRo, active.subtitleEn)}
              </p>
            </div>
            <Link
              href={active.href}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-[#0D2E2B] text-white text-sm font-medium px-6 py-3 rounded-[1px] hover:bg-[#1F6B4A] transition-colors duration-300"
            >
              {t("Vezi serviciul complet", "See the full service")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Process steps */}
          <div className="grid gap-6 md:grid-cols-2">
            {active.steps.map((step, idx) => (
              <div key={idx} className="bg-white rounded-[2px] p-8 border border-[#0D2E2B]/10 hover:border-[#0D2E2B]/25 transition-colors duration-300">
                <div className="flex items-start gap-4">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-[2px] flex items-center justify-center mt-0.5 text-sm font-semibold"
                    style={{ backgroundColor: active.accentColor, color: active.accentText }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h3 className="text-base font-light text-[#0D2E2B] tracking-tighter mb-2">
                      {t(step.titleRo, step.titleEn)}
                    </h3>
                    <p className="text-sm text-[#666666] font-light leading-relaxed">
                      {t(step.descRo, step.descEn)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Deliverables */}
          <div className="mt-12 bg-[#0D2E2B] rounded-[2px] p-8">
            <p className="text-xs font-semibold tracking-widest uppercase mb-6" style={{ color: active.accentText === "#1F6B4A" ? "#C8E6C9" : active.accentColor }}>
              • {t("Livrabile numite", "Named deliverables")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {active.deliverables.map((d, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: active.accentColor }}>
                    <Check className="h-3 w-3" style={{ color: active.accentText }} />
                  </div>
                  <span className="text-sm text-white/80 font-light">{t(d.ro, d.en)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Journey indicator */}
          <div className="mt-10 flex items-center gap-0 overflow-x-auto pb-2">
            {serviceCategories.map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className="flex items-center gap-0 group"
              >
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${activeTab === cat.id ? "bg-[#0D2E2B] text-white" : "text-[#888888] hover:text-[#0D2E2B]"}`}>
                  <span className="text-[10px] font-bold opacity-50">{idx + 1}</span>
                  {t(cat.labelRo, cat.labelEn)}
                </div>
                {idx < serviceCategories.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-[#CCCCCC] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
          <p className="mt-6 text-sm text-[#888888] font-light max-w-2xl">
            {t("Ordinea de mai sus este ordinea reală în care un beneficiar ajunge la ele, nu ordinea din organigramă.", "The order above is the real order in which a client reaches them, not the org-chart order.")}
          </p>
        </div>
      </section>

      {/* ── Maintenance contract levels ── */}
      <section className="bg-white section-l">
        <div className="container-site">
          <div className="mb-16">
            <p className="section-label mb-3">• {t("NIVELURI DE CONTRACT DE ÎNTREȚINERE", "MAINTENANCE CONTRACT LEVELS")}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] tracking-tighter mb-4">{t("Întreținere pe niveluri: Bază și Extins", "Maintenance by level: Base and Extended")}</h2>
            <p className="text-base text-[#888888] font-light max-w-xl">{t("Diferența dintre niveluri nu este numărul de vizite, ci ce se întâmplă când sistemul cedează: cine răspunde, în cât timp, în ce interval orar și ce se face dacă remedierea nu este posibilă imediat. Contractul se scrie pe severități, nu pe promisiuni.", "The difference between levels is not the number of visits, but what happens when the system fails: who responds, how fast, in what window, and what is done if an immediate fix is not possible. The contract is written on severities, not on promises.")}</p>
          </div>
          <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
            {offerings.map((offering) => (
              <div key={offering.id} className={`relative flex flex-col rounded-[2px] p-8 transition-all ${offering.recommended ? "bg-[#0D2E2B] text-white" : "bg-[#F5F4F0] border border-[#0D2E2B]/10"}`}>
                {offering.recommended && (
                  <div className="absolute -top-3 left-8">
                    <span className="rounded-full bg-[#1F6B4A] px-4 py-1 text-xs font-semibold text-white tracking-wide">{t("Interval extins", "Extended window")}</span>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className={`text-xl font-light tracking-tighter ${offering.recommended ? "text-white" : "text-[#0D2E2B]"}`}>{t(offering.nameRo, offering.nameEn)}</h3>
                  <p className={`mt-1 text-sm ${offering.recommended ? "text-[#C8E6C9]" : "text-[#888888]"}`}>{t(offering.taglineRo, offering.taglineEn)}</p>
                </div>
                <p className={`mb-6 text-sm font-light ${offering.recommended ? "text-white/60" : "text-[#888888]"}`}>{t(offering.descRo, offering.descEn)}</p>
                <ul className="mb-8 flex-1 space-y-3">
                  {offering.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-center gap-3">
                      {feature.included
                        ? <Check className={`h-4 w-4 flex-shrink-0 ${offering.recommended ? "text-[#C8E6C9]" : "text-[#1F6B4A]"}`} />
                        : <div className="h-4 w-4 flex-shrink-0 rounded-full border border-current opacity-20" />
                      }
                      <span className={`text-sm ${feature.included ? (offering.recommended ? "text-white" : "text-[#0D2E2B]") : (offering.recommended ? "text-white/30" : "text-[#0D2E2B]/30")}`}>
                        {t(feature.nameRo, feature.nameEn)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className={`mb-6 border-t ${offering.recommended ? "border-white/10" : "border-[#0D2E2B]/10"}`} />
                <Link href="/servicii/intretinere-sisteme-bms" className={`w-full inline-flex items-center justify-center gap-2 text-sm font-medium px-6 py-3 rounded-[2px] transition-colors ${offering.recommended ? "bg-[#1F6B4A] text-white hover:bg-[#185c3f]" : "bg-[#0D2E2B] text-white hover:bg-[#0D2E2B]/90"}`}>
                  {t(offering.ctaRo, offering.ctaEn)}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-[#888888] font-light max-w-3xl">{t("Există și un nivel Critic, cu preluare permanentă a sesizărilor, inclusiv în weekend și în sărbători legale. Timpii de răspuns pe severitate, frecvența verificărilor și intervalul orar exact se stabilesc și se scriu în contract. Nivelul potrivit se alege după consecința unei opriri, nu după dimensiunea clădirii.", "There is also a Critical level, with permanent takeover of requests, including weekends and legal holidays. Response times per severity, check frequency and the exact hours are set and written into the contract. The right level is chosen by the consequence of an outage, not by the size of the building.")}</p>
        </div>
      </section>

      {/* ── Handover + cost table ── */}
      <section className="bg-[#F5F4F0] section-l">
        <div className="container-site">
          <div className="mb-12">
            <p className="section-label mb-3">• {t("CE SE PREDĂ", "WHAT IS HANDED OVER")}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] tracking-tighter mb-4">{t("Ce se predă la finalul oricărei lucrări Sovitech Control", "What is handed over at the end of any Sovitech Control job")}</h2>
            <p className="text-base text-[#888888] font-light max-w-xl">{t("Aceleași documente, indiferent de serviciu. Un sistem fără documentație predată este un sistem pe care următorul furnizor trebuie să îl descopere din nou, pe cheltuiala beneficiarului.", "The same documents, regardless of the service. A system without handed-over documentation is a system the next supplier has to rediscover, at the client's expense.")}</p>
          </div>
          <div className="max-w-4xl">
            <div className="rounded-[2px] bg-white border border-[#0D2E2B]/8 p-8">
              <ul className="space-y-4">
                {handoverItems.map((item) => (
                  <li key={item.en} className="flex items-start gap-3">
                    <Check className="h-4 w-4 flex-shrink-0 text-[#1F6B4A] mt-1" />
                    <span className="text-sm text-[#0D2E2B] font-light leading-relaxed">{t(item.ro, item.en)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-[#888888] font-light mt-6">
                {t("Predarea licențelor, a programelor sursă și a parolelor de inginerie este tratată pe larg pe pagina de ", "The handover of licences, source programs and engineering passwords is covered in depth on the ")}
                <Link href="/servicii/modernizare-sisteme-de-automatizare-si-bms" className="text-[#1F6B4A] hover:underline">{t("modernizare sisteme de automatizare și BMS", "automation and BMS modernisation page")}</Link>
                {t(", unde este și cea mai relevantă întrebare comercială.", ", where it is also the most relevant commercial question.")}
              </p>
            </div>

            <div className="mt-12">
              <h3 className="text-2xl font-light text-[#0D2E2B] tracking-tighter mb-3">{t("Costul orientativ pe tip de clădire", "Indicative cost by building type")}</h3>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Cifrele sunt benzi de piață pentru România, la nivelul unui sistem BMS nou, complet. Nu sunt oferte și nu înlocuiesc o estimare pe clădirea reală.", "The figures are market bands for Romania, for a complete new BMS. They are not offers and do not replace an estimate for the real building.")}</p>
              <div className="overflow-x-auto bg-white rounded-[2px] border border-[#0D2E2B]/8">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-[#0D2E2B]/10">
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Tip clădire", "Building type")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Bandă de cost", "Cost band")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Observație", "Note")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costRows.map((r) => (
                      <tr key={r.tEn} className="border-b border-[#0D2E2B]/8 last:border-0 align-top">
                        <td className="p-4 text-[#0D2E2B] font-light">{t(r.tRo, r.tEn)}</td>
                        <td className="p-4 text-[#1F6B4A] font-light whitespace-nowrap">{t(r.cRo, r.cEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(r.oRo, r.oEn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-[#888888] font-light mt-4">{t("Costul unei modernizări: 40-60% din prețul unui sistem nou, cu amortizare de 3-6 ani pentru o modernizare de capital. Costul întreținerii: 4-7% din valoarea investiției pe an pentru contractul de bază, 7-12% pentru cel extins.", "The cost of a modernisation: 40-60% of the price of a new system, with a 3-6 year payback for a capital modernisation. The cost of maintenance: 4-7% of the investment value per year for the base contract, 7-12% for the extended one.")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What Sovitech Control does not do ── */}
      <section className="bg-white section-l">
        <div className="container-site">
          <p className="section-label mb-3">• {t("CE NU FACEM", "WHAT WE DO NOT DO")}</p>
          <h2 className="text-3xl lg:text-4xl font-light text-[#0D2E2B] mb-4 tracking-tighter">{t("Ce nu face Sovitech Control", "What Sovitech Control does not do")}</h2>
          <p className="text-base text-[#888888] font-light max-w-xl mb-12">{t("Un integrator care spune ce nu face este mai ușor de verificat decât unul care spune că face tot.", "An integrator who says what it does not do is easier to verify than one who says it does everything.")}</p>
          <div className="grid gap-6 md:grid-cols-3">
            {notDoing.map((service, idx) => (
              <div key={idx} className="rounded-[2px] bg-[#F5F4F0] border border-[#0D2E2B]/10 p-8 hover:border-[#0D2E2B]/25 transition-colors duration-300">
                <h3 className="mb-3 text-lg font-light text-[#0D2E2B] tracking-tighter">{t(service.titleRo, service.titleEn)}</h3>
                <p className="text-sm text-[#888888] font-light leading-relaxed">{t(service.descRo, service.descEn)}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-sm text-[#888888] font-light max-w-3xl leading-relaxed">
            {t("Două oferte de BMS arată aproape identic pe prima pagină și diferă cu 40% la preț. Diferența este aproape întotdeauna în ce nu scrie: numărul real de puncte fizice ofertate, ce înseamnă exact „integrare\", cine execută punerea în funcțiune și cu ce protocol de testare, și ce se predă la recepție în materie de licențe, programe sursă și parole. Metoda completă de comparare, cu grilă și cu întrebările de pus la clarificări, este pe pagina de ", "Two BMS offers look almost identical on the first page and differ by 40% in price. The difference is almost always in what is not written: the real number of physical points quoted, what exactly \"integration\" means, who performs the commissioning and to what test protocol, and what is handed over at acceptance in terms of licences, source programs and passwords. The complete comparison method, with a grid and the questions to ask at clarifications, is on the ")}
            <Link href="/servicii/consultanta" className="text-[#1F6B4A] hover:underline">{t("consultanță", "consultancy page")}</Link>.
          </p>
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="bg-[#07201C] section-l">
        <div className="container-site">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <p className="section-label text-[#1F6B4A] mb-2">• {t("PRIMUL PAS", "THE FIRST STEP")}</p>
              <h2 className="text-3xl lg:text-4xl font-light text-white tracking-tighter max-w-xl">{t("Discuție de 30 de minute despre lucrarea potrivită", "A 30-minute discussion about the right job")}</h2>
              <p className="mt-4 text-white/60 font-light max-w-lg">{t("Cele mai multe cereri de ofertă încep cu serviciul greșit: o modernizare cerută ca sistem nou, sau o integrare cerută ca proiect complet. O discuție scurtă cu inginerul de proiect stabilește ce lucrare este de fapt necesară și în ce ordine.", "Most quote requests start with the wrong service: a modernisation requested as a new system, or an integration requested as a complete project. A short discussion with the project engineer establishes what job is actually needed, and in what order.")}</p>
            </div>
            <Link href="/contact" className="btn-sovitech flex-shrink-0">
              {t("Cere o evaluare a clădirii", "Request a building assessment")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white section-l">
        <div className="container-site">
          <p className="section-label mb-3">• FAQ</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] mb-16 tracking-tighter">{t("Întrebări frecvente", "Frequently asked questions")}</h2>
          <div className="max-w-3xl">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border-b border-[#0D2E2B]/10">
                <button onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)} className="flex w-full items-center justify-between py-6 text-left">
                  <span className="pr-4 text-base font-semibold text-[#0D2E2B]">{t(faq.qRo, faq.qEn)}</span>
                  <ChevronDown className={`h-5 w-5 flex-shrink-0 text-[#888888] transition-transform ${expandedFaq === idx ? "rotate-180" : ""}`} />
                </button>
                <div className={`grid transition-all duration-300 ${expandedFaq === idx ? "grid-rows-[1fr] pb-6" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p className="text-sm text-[#888888] font-light leading-relaxed">{t(faq.aRo, faq.aEn)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3">
            {hubResources.map((r) => (
              <Link key={r.en} href={r.href} className="inline-flex items-center gap-2 text-sm font-medium text-[#1F6B4A] hover:gap-3 transition-all">
                {t(r.ro, r.en)}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>

    </>
  )
}
