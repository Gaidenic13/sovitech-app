"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Check, ChevronDown, ChevronRight, ArrowRight,
  FileText, Cpu, Network, Wrench,
  ClipboardList, ScanSearch, PenTool, LayoutDashboard,
  HardHat, Cable, Settings2, ShieldCheck,
  Plug, GitMerge, Globe, BarChart3,
  Activity, Bell, CalendarClock, Headphones,
} from "lucide-react"
import { useLanguage } from "@/lib/language-context"

/* ─── Per-tab detailed content ──────────────────────────────────────── */
const serviceContent = {
  proiectare: {
    accentColor: "#C8E6C9",
    accentText: "#1F6B4A",
    icon: <FileText className="h-6 w-6" />,
    heroRo: "Proiectare BMS",
    heroEn: "BMS Design",
    subtitleRo: "Fiecare sistem de automatizare incepe cu un proiect solid. Echipa noastra de ingineri analizeaza cladirea ta, defineste obiectivele si livreaza documentatia tehnica completa necesara executiei.",
    subtitleEn: "Every automation system starts with a solid design. Our team of engineers analyses your building, defines objectives and delivers the complete technical documentation required for execution.",
    steps: [
      {
        iconEl: <ScanSearch className="h-5 w-5" />,
        titleRo: "Audit si analiza",
        titleEn: "Audit & analysis",
        descRo: "Vizitam cladirea si facem o evaluare completa: echipamente existente, consum energetic, puncte de masura, infrastructura de cablare si obiective de automatizare. Rezultatul este un raport de audit cu recomandari clare.",
        descEn: "We visit the building and carry out a full evaluation: existing equipment, energy consumption, measurement points, cabling infrastructure and automation objectives. The result is an audit report with clear recommendations.",
      },
      {
        iconEl: <ClipboardList className="h-5 w-5" />,
        titleRo: "Caiet de sarcini",
        titleEn: "Technical specification",
        descRo: "Definim impreuna cu clientul cerintele functionale ale sistemului BMS: ce se controleaza, ce se monitorizeaza, ce alarme sunt necesare si ce rapoarte se genereaza automat.",
        descEn: "Together with the client we define the functional requirements of the BMS system: what is controlled, what is monitored, what alarms are needed and what reports are generated automatically.",
      },
      {
        iconEl: <PenTool className="h-5 w-5" />,
        titleRo: "Proiect tehnic",
        titleEn: "Technical design",
        descRo: "Livram schema arhitecturala a sistemului, planurile de cablaj, listele de echipamente SAUTER, logica de automatizare si documentatia de conformitate cu normele in vigoare (SR EN ISO 16484).",
        descEn: "We deliver the system architecture diagram, cabling plans, SAUTER equipment lists, automation logic and compliance documentation in line with current standards (SR EN ISO 16484).",
      },
      {
        iconEl: <LayoutDashboard className="h-5 w-5" />,
        titleRo: "Interfata de supervizare",
        titleEn: "Supervision interface",
        descRo: "Proiectam interfata grafica SCADA / HMI adaptata la cladire — planuri de etaj, sinoptice, grafice de tendinte si rapoarte. Clientul aproba designul inainte de implementare.",
        descEn: "We design the SCADA / HMI graphical interface tailored to the building — floor plans, synoptics, trend charts and reports. The client approves the design before implementation.",
      },
    ],
    deliverables: [
      { ro: "Raport de audit tehnic", en: "Technical audit report" },
      { ro: "Caiet de sarcini functional", en: "Functional specification" },
      { ro: "Proiect tehnic complet (PAC + DDE)", en: "Full technical design (PAC + DDE)" },
      { ro: "Liste echipamente si bill of materials", en: "Equipment lists and bill of materials" },
      { ro: "Scheme electrice si de cablaj", en: "Electrical and cabling diagrams" },
      { ro: "Mockup interfata de supervizare", en: "Supervision interface mockup" },
    ],
  },
  executie: {
    accentColor: "#C5C0F5",
    accentText: "#5C5FD4",
    icon: <HardHat className="h-6 w-6" />,
    heroRo: "Executie si instalare",
    heroEn: "Execution & installation",
    subtitleRo: "Transformam proiectul in realitate. Echipele noastre certificate instaleaza, cablajeaza si configureaza fiecare componenta a sistemului BMS cu precizie, respectand termenele si standardele de calitate SAUTER.",
    subtitleEn: "We turn the design into reality. Our certified teams install, wire and configure every component of the BMS system with precision, meeting deadlines and SAUTER quality standards.",
    steps: [
      {
        iconEl: <HardHat className="h-5 w-5" />,
        titleRo: "Planificare si pregatire santier",
        titleEn: "Site planning & preparation",
        descRo: "Coordonam cu antreprenorul general si celelalte specialitati (electricitate, HVAC, constructii) planul de executie. Pregatim depozitarea echipamentelor, traseele de cabluri si accesul la spatii tehnice.",
        descEn: "We coordinate with the general contractor and other trades (electrical, HVAC, construction) on the execution plan. We prepare equipment storage, cable routes and access to technical spaces.",
      },
      {
        iconEl: <Cable className="h-5 w-5" />,
        titleRo: "Montaj si cablaj",
        titleEn: "Mounting & cabling",
        descRo: "Montam tablourile de automatizare, controllere SAUTER (Modulo5/6, ECOS), senzori de temperatura, umiditate, CO2, debitmetre, valve si actuatori. Realizem cablajul structurat conform proiectului.",
        descEn: "We mount automation panels, SAUTER controllers (Modulo5/6, ECOS), temperature, humidity and CO2 sensors, flow meters, valves and actuators. We carry out structured cabling according to the design.",
      },
      {
        iconEl: <Settings2 className="h-5 w-5" />,
        titleRo: "Configurare si programare",
        titleEn: "Configuration & programming",
        descRo: "Programam logica de automatizare in controllere (seturi de puncte, algoritmi PID, programe orare, gestionarea alarmelor). Configurem serverul BMS si legatura cu echipamentele de teren prin protocoalele BACnet, Modbus, KNX.",
        descEn: "We program the automation logic in controllers (setpoints, PID algorithms, scheduling, alarm management). We configure the BMS server and communication with field devices via BACnet, Modbus and KNX protocols.",
      },
      {
        iconEl: <ShieldCheck className="h-5 w-5" />,
        titleRo: "Punere in functiune si testare",
        titleEn: "Commissioning & testing",
        descRo: "Efectuam testarea functionala a fiecarui punct de masura si control (FAT + SAT). Verificam alarmele, graficele de tendinte si rapoartele. Livram procesul-verbal de receptie si documentatia as-built.",
        descEn: "We carry out functional testing of every measurement and control point (FAT + SAT). We verify alarms, trend charts and reports. We deliver the acceptance certificate and as-built documentation.",
      },
    ],
    deliverables: [
      { ro: "Tablouri de automatizare montate si etichetate", en: "Mounted and labelled automation panels" },
      { ro: "Controllere SAUTER programate si testate", en: "Programmed and tested SAUTER controllers" },
      { ro: "Senzori si actuatori instalati si verificati", en: "Installed and verified sensors and actuators" },
      { ro: "Server BMS configurat si operational", en: "Configured and operational BMS server" },
      { ro: "Raport FAT / SAT semnat", en: "Signed FAT / SAT report" },
      { ro: "Documentatie as-built completa", en: "Complete as-built documentation" },
    ],
  },
  integrare: {
    accentColor: "#FFE0B2",
    accentText: "#E65100",
    icon: <Network className="h-6 w-6" />,
    heroRo: "Integrare sisteme",
    heroEn: "Systems integration",
    subtitleRo: "Un BMS puternic nu traieste in izolare. Il conectam cu toate sistemele cladirii — HVAC, iluminat, control acces, detectie incendiu, energie — printr-o platforma unificata care ofera vizibilitate completa si control centralizat.",
    subtitleEn: "A powerful BMS does not live in isolation. We connect it with all building systems — HVAC, lighting, access control, fire detection, energy — through a unified platform that delivers full visibility and centralised control.",
    steps: [
      {
        iconEl: <Plug className="h-5 w-5" />,
        titleRo: "Audit protocoale existente",
        titleEn: "Existing protocols audit",
        descRo: "Identificam toate echipamentele si sistemele prezente in cladire: centrala termica, chillerele, AHU-urile, tablourile electrice, sistemele de iluminat DALI, controlerele KNX, contoarele M-Bus si dispozitivele IoT. Mapam protocoalele de comunicatie disponibile.",
        descEn: "We identify all equipment and systems present in the building: boiler plant, chillers, AHUs, electrical panels, DALI lighting systems, KNX controllers, M-Bus meters and IoT devices. We map available communication protocols.",
      },
      {
        iconEl: <GitMerge className="h-5 w-5" />,
        titleRo: "Integrare multi-protocol",
        titleEn: "Multi-protocol integration",
        descRo: "Conectam sistemele eterogene prin gateway-uri si convertoare de protocol. Suportam BACnet IP/MSTP, Modbus RTU/TCP, KNX TP, DALI-2, M-Bus, LON, OPC-UA si API REST pentru sisteme moderne. Fiecare integrare este validata punct cu punct.",
        descEn: "We connect heterogeneous systems via gateways and protocol converters. We support BACnet IP/MSTP, Modbus RTU/TCP, KNX TP, DALI-2, M-Bus, LON, OPC-UA and REST API for modern systems. Every integration is validated point by point.",
      },
      {
        iconEl: <Globe className="h-5 w-5" />,
        titleRo: "Platforma de management unificata",
        titleEn: "Unified management platform",
        descRo: "Toate datele din sistemele integrate sunt vizibile intr-o singura interfata SAUTER — harta termica a cladirii, consumuri pe circuit, stari echipamente si alarme centralizate. Operatorul vede totul dintr-un singur loc.",
        descEn: "All data from integrated systems is visible in a single SAUTER interface — building heat map, circuit-level consumption, equipment states and centralised alarms. The operator sees everything from one place.",
      },
      {
        iconEl: <BarChart3 className="h-5 w-5" />,
        titleRo: "Raportare si analytics",
        titleEn: "Reporting & analytics",
        descRo: "Generam rapoarte automate de consum energetic (kWh, kcal, m3) pe categorii (incalzire, racire, iluminat, prize), comparatii periodice si exporturi pentru certificari verzi (BREEAM, LEED, EPBD).",
        descEn: "We generate automatic energy consumption reports (kWh, kcal, m³) by category (heating, cooling, lighting, sockets), periodic comparisons and exports for green certifications (BREEAM, LEED, EPBD).",
      },
    ],
    deliverables: [
      { ro: "Harta completa a punctelor de integrare", en: "Complete integration points map" },
      { ro: "Gateway-uri si convertoare configurate", en: "Configured gateways and converters" },
      { ro: "Platforma unificata operationala", en: "Unified platform operational" },
      { ro: "Dashboard energie pe categorii", en: "Energy dashboard by category" },
      { ro: "Rapoarte automate configurate", en: "Configured automatic reports" },
      { ro: "Export date pentru certificari ESG", en: "Data export for ESG certifications" },
    ],
  },
  mentenanta: {
    accentColor: "#B2EBF2",
    accentText: "#006064",
    icon: <Wrench className="h-6 w-6" />,
    heroRo: "Mentenanta si suport",
    heroEn: "Maintenance & support",
    subtitleRo: "Un sistem BMS performant necesita ingrijire continua. Oferim contracte de mentenanta preventiva si corectiva, monitorizare remote 24/7 si interventii rapide, astfel incat cladirea ta functioneaza optim in permanenta.",
    subtitleEn: "A high-performance BMS system requires continuous care. We offer preventive and corrective maintenance contracts, 24/7 remote monitoring and rapid interventions, keeping your building running at peak performance at all times.",
    steps: [
      {
        iconEl: <Activity className="h-5 w-5" />,
        titleRo: "Monitorizare remote 24/7",
        titleEn: "24/7 remote monitoring",
        descRo: "Centrul nostru de operatiuni monitorizeaza in timp real toate alarmelee si parametrii critici ai sistemului BMS. Anomaliile sunt detectate automat si echipa de suport este alertata inainte ca operatorul cladirii sa observe problema.",
        descEn: "Our operations centre monitors all alarms and critical BMS system parameters in real time. Anomalies are detected automatically and the support team is alerted before the building operator notices the problem.",
      },
      {
        iconEl: <CalendarClock className="h-5 w-5" />,
        titleRo: "Mentenanta preventiva planificata",
        titleEn: "Planned preventive maintenance",
        descRo: "Executam vizite periodice (trimestrial sau semestrial) pentru inspectia echipamentelor, verificarea calibrarilor, curatarea senzorilor, actualizarea firmware-ului controllerelor si testarea alarmelor. Livram raport dupa fiecare vizita.",
        descEn: "We carry out periodic visits (quarterly or bi-annual) for equipment inspection, calibration checks, sensor cleaning, controller firmware updates and alarm testing. A report is delivered after each visit.",
      },
      {
        iconEl: <Bell className="h-5 w-5" />,
        titleRo: "Mentenanta corectiva si urgente",
        titleEn: "Corrective maintenance & emergencies",
        descRo: "In caz de defectiune, echipele noastre intervin in maxim 4 ore in Bucuresti si 8 ore la nivel national. Avem stoc de piese SAUTER si un sistem de ticketing pentru urmarirea fiecarei solicitari pana la rezolvare.",
        descEn: "In the event of a fault, our teams respond within 4 hours in Bucharest and 8 hours nationwide. We hold SAUTER spare parts stock and a ticketing system to track every request through to resolution.",
      },
      {
        iconEl: <Headphones className="h-5 w-5" />,
        titleRo: "Suport tehnic si training continuu",
        titleEn: "Technical support & ongoing training",
        descRo: "Asiguram suport telefonic si remote pentru operatorii de cladire, sesiuni de training anuale pentru echipele tehnice si actualizari software gratuite pe durata contractului. Un manager de cont dedicat este disponibil pentru orice intrebare.",
        descEn: "We provide phone and remote support for building operators, annual training sessions for technical teams and free software updates throughout the contract. A dedicated account manager is available for any question.",
      },
    ],
    deliverables: [
      { ro: "Contract de mentenanta cu SLA definit", en: "Maintenance contract with defined SLA" },
      { ro: "Rapoarte de vizita dupa fiecare interventie", en: "Visit reports after each intervention" },
      { ro: "Acces la portal de monitorizare remote", en: "Access to remote monitoring portal" },
      { ro: "Actualizari firmware si software incluse", en: "Firmware and software updates included" },
      { ro: "Training annual pentru operatori", en: "Annual training for operators" },
      { ro: "Manager de cont dedicat", en: "Dedicated account manager" },
    ],
  },
}

export default function ServiciiPage() {
  const [activeTab, setActiveTab] = useState<keyof typeof serviceContent>("proiectare")
  const [showPlan, setShowPlan] = useState<"standard" | "complet">("standard")
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const { t } = useLanguage()

  const serviceCategories = [
    { id: "proiectare" as const, labelRo: "Proiectare", labelEn: "Design" },
    { id: "executie"   as const, labelRo: "Executie",   labelEn: "Installation" },
    { id: "integrare"  as const, labelRo: "Integrare",  labelEn: "Integration" },
    { id: "mentenanta" as const, labelRo: "Mentenanta", labelEn: "Maintenance" },
  ]

  const active = serviceContent[activeTab]

  const offerings = [
    {
      id: "standard",
      nameRo: "Standard", nameEn: "Standard",
      taglineRo: "Ideal pentru proiecte mici si medii", taglineEn: "Ideal for small and medium projects",
      descRo: "Servicii BMS esentiale pentru cladiri cu nevoi standard de automatizare.",
      descEn: "Essential BMS services for buildings with standard automation needs.",
      ctaRo: "Cerere oferta", ctaEn: "Request a quote",
      features: [
        { nameRo: "Consultatie initiala", nameEn: "Initial consultation", included: true },
        { nameRo: "Proiectare sistem BMS", nameEn: "BMS system design", included: true },
        { nameRo: "Echipamente SAUTER", nameEn: "SAUTER equipment", included: true },
        { nameRo: "Instalare & configurare", nameEn: "Installation & configuration", included: true },
        { nameRo: "Punere in functiune", nameEn: "Commissioning", included: true },
        { nameRo: "Training echipa", nameEn: "Team training", included: true },
        { nameRo: "Garantie 2 ani", nameEn: "2-year warranty", included: true },
        { nameRo: "Integrare multi-protocol", nameEn: "Multi-protocol integration", included: false },
        { nameRo: "Monitorizare 24/7", nameEn: "24/7 remote monitoring", included: false },
        { nameRo: "Mentenanta preventiva", nameEn: "Preventive maintenance", included: false },
      ],
    },
    {
      id: "complet",
      nameRo: "Full Service", nameEn: "Full Service",
      taglineRo: "Mentenanta inclusa", taglineEn: "Maintenance included",
      taglineHighlight: true,
      descRo: "Solutie completa cu suport continuu pentru cladiri care necesita performanta maxima.",
      descEn: "Complete solution with continuous support for buildings requiring maximum performance.",
      ctaRo: "Cerere oferta", ctaEn: "Request a quote",
      recommended: true,
      features: [
        { nameRo: "Consultatie initiala", nameEn: "Initial consultation", included: true },
        { nameRo: "Proiectare sistem BMS", nameEn: "BMS system design", included: true },
        { nameRo: "Echipamente SAUTER Premium", nameEn: "Premium SAUTER equipment", included: true },
        { nameRo: "Instalare & configurare", nameEn: "Installation & configuration", included: true },
        { nameRo: "Punere in functiune", nameEn: "Commissioning", included: true },
        { nameRo: "Training echipa extins", nameEn: "Extended team training", included: true },
        { nameRo: "Garantie 5 ani", nameEn: "5-year warranty", included: true },
        { nameRo: "Integrare multi-protocol", nameEn: "Multi-protocol integration", included: true },
        { nameRo: "Monitorizare 24/7", nameEn: "24/7 remote monitoring", included: true },
        { nameRo: "Mentenanta preventiva", nameEn: "Preventive maintenance", included: true },
      ],
    },
  ]

  const featureCategories = [
    {
      nameRo: "Operatiuni sistem", nameEn: "System operations",
      features: [
        { nameRo: "Manager de cont dedicat", nameEn: "Dedicated account manager", standard: true, complet: true },
        { nameRo: "Software management BMS", nameEn: "BMS management software", standard: true, complet: true },
        { nameRo: "Dashboard monitorizare energie", nameEn: "Energy monitoring dashboard", standard: true, complet: true },
        { nameRo: "Rapoarte consum energetic", nameEn: "Energy consumption reports", standard: true, complet: true },
        { nameRo: "Alerte automate", nameEn: "Automated alerts", standard: false, complet: true },
      ],
    },
    {
      nameRo: "Instalare & configurare", nameEn: "Installation & configuration",
      features: [
        { nameRo: "Audit tehnic complet", nameEn: "Full technical audit", standard: true, complet: true },
        { nameRo: "Design personalizat", nameEn: "Custom design", standard: true, complet: true },
        { nameRo: "Documentatie tehnica", nameEn: "Technical documentation", standard: true, complet: true },
        { nameRo: "Configurare HVAC avansata", nameEn: "Advanced HVAC configuration", standard: false, complet: true },
        { nameRo: "Optimizare algoritmi de control", nameEn: "Control algorithm optimisation", standard: false, complet: true },
      ],
    },
    {
      nameRo: "Integrare & protocoale", nameEn: "Integration & protocols",
      features: [
        { nameRo: "Protocol BACnet", nameEn: "BACnet protocol", standard: true, complet: true },
        { nameRo: "Protocol Modbus", nameEn: "Modbus protocol", standard: true, complet: true },
        { nameRo: "Protocol KNX", nameEn: "KNX protocol", standard: false, complet: true },
        { nameRo: "Protocol DALI iluminat", nameEn: "DALI lighting protocol", standard: false, complet: true },
        { nameRo: "Integrare sisteme terte", nameEn: "Third-party system integration", standard: false, complet: true },
      ],
    },
    {
      nameRo: "Suport & mentenanta", nameEn: "Support & maintenance",
      features: [
        { nameRo: "Suport telefonic Lun–Vin", nameEn: "Phone support Mon–Fri", standard: true, complet: true },
        { nameRo: "Suport 24/7", nameEn: "24/7 support", standard: false, complet: true },
        { nameRo: "Interventii de urgenta", nameEn: "Emergency interventions", standard: false, complet: true },
        { nameRo: "Mentenanta preventiva", nameEn: "Preventive maintenance", standard: false, complet: true },
        { nameRo: "Actualizari software gratuite", nameEn: "Free software updates", standard: false, complet: true },
      ],
    },
  ]

  const additionalServices = [
    { titleRo: "Structuri complexe", titleEn: "Complex structures", descRo: "Proiecte multi-cladiri, campusuri si parcuri industriale cu sisteme BMS interconectate.", descEn: "Multi-building projects, campuses and industrial parks with interconnected BMS systems." },
    { titleRo: "Raportare avansata", titleEn: "Advanced reporting", descRo: "Rapoarte personalizate pentru cerinte de sustenabilitate, audituri energetice si certificari.", descEn: "Custom reports for sustainability requirements, energy audits and certifications." },
    { titleRo: "Add-on-uri disponibile", titleEn: "Available add-ons", descRo: "Integrare sisteme de securitate, control acces, CCTV si management parcare.", descEn: "Integration of security, access control, CCTV and parking management systems." },
  ]

  const faqs = [
    { qRo: "Care este durata medie de implementare a unui proiect BMS?", qEn: "What is the average implementation timeline for a BMS project?", aRo: "Durata variaza in functie de complexitatea proiectului. Pentru cladiri mici (sub 5.000 mp), implementarea dureaza 4–8 saptamani. Pentru proiecte medii, 2–4 luni, iar pentru proiecte complexe, 4–8 luni.", aEn: "The timeline varies depending on project complexity. For small buildings (under 5,000 m²), implementation takes 4–8 weeks. For medium projects, 2–4 months, and for complex projects, 4–8 months." },
    { qRo: "Ce echipamente folositi pentru sistemele BMS?", qEn: "What equipment do you use for BMS systems?", aRo: "Suntem partener autorizat SAUTER din Elvetia — liderul global in automatizarea BMS. Folosim controllere Modulo5, Modulo6 si ECOS, senzori de inalta precizie si software proprietar SAUTER.", aEn: "We are an authorised SAUTER partner from Switzerland — the global leader in BMS automation. We use Modulo5, Modulo6 and ECOS controllers, high-precision sensors and proprietary SAUTER software." },
    { qRo: "Oferiti servicii de migrare de la alt sistem BMS?", qEn: "Do you offer migration services from another BMS system?", aRo: "Da, avem experienta in migrarea sistemelor BMS existente catre solutii SAUTER. Procesul include un audit complet, un plan de migrare fara intreruperi operationale si training pentru noua platforma.", aEn: "Yes, we have experience migrating existing BMS systems to SAUTER solutions. The process includes a full audit, a migration plan with no operational interruptions and training for the new platform." },
    { qRo: "Ce garantie oferiti pentru sistemele instalate?", qEn: "What warranty do you offer for installed systems?", aRo: "Oferim garantie standard de 2 ani pentru pachetul Standard si 5 ani pentru Full Service. Garantia acopera echipamentele, software-ul si manopera.", aEn: "We offer a standard 2-year warranty for the Standard package and 5 years for Full Service. The warranty covers equipment, software and labour." },
    { qRo: "Puteti integra BMS-ul cu sistemele existente?", qEn: "Can you integrate the BMS with existing systems?", aRo: "Da, folosim protocoale deschise (BACnet, Modbus, KNX, DALI, M-Bus) care permit integrarea cu majoritatea sistemelor existente: HVAC, iluminat, control acces, detectie incendiu, lifturi si sisteme de securitate.", aEn: "Yes, we use open protocols (BACnet, Modbus, KNX, DALI, M-Bus) that allow integration with most existing systems: HVAC, lighting, access control, fire detection, lifts and security systems." },
  ]

  const testimonials = [
    { quoteRo: "Sistemul BMS implementat de Sovitech a redus costurile noastre energetice cu 38% in primul an. ROI-ul a fost atins in mai putin de 2 ani.", quoteEn: "The BMS system implemented by Sovitech reduced our energy costs by 38% in the first year. ROI was achieved in less than 2 years.", author: "Alexandru Ionescu", roleRo: "Director Tehnic, Therme Bucharest", roleEn: "Technical Director, Therme Bucharest", image: "/professional-male-engineer-headshot.jpg" },
    { quoteRo: "Colaborarea cu Sovitech ne-a adus nu doar tehnologie de top, ci si o echipa care intelege nevoile specifice ale industriei hoteliere.", quoteEn: "Working with Sovitech gave us not only top technology, but also a team that understands the specific needs of the hotel industry.", author: "Maria Popescu", roleRo: "Facility Manager, Radisson Blu", roleEn: "Facilities Manager, Radisson Blu", image: "/asian-woman-professional-smiling-headshot.jpg" },
    { quoteRo: "Monitorizarea in timp real si alertele automate ne-au permis sa prevenim probleme costisitoare inainte sa apara.", quoteEn: "Real-time monitoring and automated alerts allowed us to prevent costly problems before they occurred.", author: "Dan Georgescu", roleRo: "Director Operatiuni, Rompharm", roleEn: "Operations Director, Rompharm", image: "/businessman-professional-portrait.jpg" },
  ]

  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-[#07201C] min-h-[45vh] flex items-end pb-16 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fingerprint-59QWj1Ik1Fd1hqzZduTrEqLz2j557z.svg" alt="" className="h-[600px] w-auto" />
        </div>
        <div className="container-site w-full relative z-10">
          <span className="text-[#C8E6C9] text-sm font-semibold tracking-wider uppercase mb-4 block">• {t("Servicii", "Services")}</span>
          <h1 className="text-5xl md:text-7xl font-light text-white leading-tight tracking-tighter">
            {t("Servicii complete.", "Complete services.")}<br />{t("Rezultate garantate.", "Guaranteed results.")}
          </h1>
          <p className="text-lg text-white/60 font-light mt-4 max-w-xl">
            {t("Solutii BMS de la proiectare la mentenanta, cu echipamente SAUTER si suport dedicat pe tot parcursul ciclului de viata al sistemului.", "BMS solutions from design to maintenance, with SAUTER equipment and dedicated support throughout the entire system lifecycle.")}
          </p>
        </div>
      </section>

      {/* ── Sticky nav tabs ── */}
      <section className="sticky top-16 z-30 bg-[#07201C]/95 backdrop-blur border-b border-white/10">
        <div className="container-site">
          <div className="flex items-center gap-1 py-4">
            {serviceCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${activeTab === cat.id ? "bg-white text-[#0D2E2B]" : "text-white/60 hover:text-white"}`}
              >
                {t(cat.labelRo, cat.labelEn)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Per-tab content ── */}
      <section className="bg-[#F5F4F0] py-24">
        <div className="container-site">

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
              href="/contact"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-[#0D2E2B] text-white text-sm font-medium px-6 py-3 rounded-[1px] hover:bg-[#1F6B4A] transition-colors duration-300"
            >
              {t("Solicita o consultatie", "Request a consultation")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Process steps */}
          <div className="grid gap-6 md:grid-cols-2">
            {active.steps.map((step, idx) => (
              <div key={idx} className="bg-white rounded-[2px] p-8 border border-[#0D2E2B]/10 hover:border-[#0D2E2B]/25 transition-colors duration-300">
                <div className="flex items-start gap-4">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-[2px] flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: active.accentColor, color: active.accentText }}
                  >
                    {step.iconEl}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-[#999999]">{String(idx + 1).padStart(2, "0")}</span>
                      <h3 className="text-base font-light text-[#0D2E2B] tracking-tighter">
                        {t(step.titleRo, step.titleEn)}
                      </h3>
                    </div>
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
              • {t("Ce livrezi clientului", "What we deliver")}
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
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${activeTab === cat.id ? "bg-[#0D2E2B] text-white" : "text-[#888888] hover:text-[#0D2E2B]"}`}>
                  <span className="text-[10px] font-bold opacity-50">{idx + 1}</span>
                  {t(cat.labelRo, cat.labelEn)}
                </div>
                {idx < serviceCategories.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-[#CCCCCC] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing packages ── */}
      <section className="bg-white py-24">
        <div className="container-site">
          <div className="mb-16">
            <p className="section-label mb-3">• {t("PACHETE DE SERVICII", "SERVICE PACKAGES")}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] tracking-tighter mb-4">{t("Solicita o oferta personalizata", "Request a personalised quote")}</h2>
            <p className="text-base text-[#888888] font-light max-w-xl">{t("Servicii activate prin software cu planuri construite pentru nevoile specifice ale cladirilor comerciale si industriale. Fiecare oferta este adaptata suprafetei si complexitatii proiectului tau.", "Software-enabled services with plans built for the specific needs of commercial and industrial buildings. Every quote is tailored to your project's area and complexity.")}</p>
          </div>
          <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
            {offerings.map((offering) => (
              <div key={offering.id} className={`relative flex flex-col rounded-[2px] p-8 transition-all ${offering.recommended ? "bg-[#0D2E2B] text-white" : "bg-[#F5F4F0] border border-[#0D2E2B]/10"}`}>
                {offering.recommended && (
                  <div className="absolute -top-3 left-8">
                    <span className="rounded-full bg-[#1F6B4A] px-4 py-1 text-xs font-semibold text-white tracking-wide">{t("Recomandat", "Recommended")}</span>
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
                <Link href="/cerere-oferta" className={`w-full inline-flex items-center justify-center gap-2 text-sm font-medium px-6 py-3 rounded-[2px] transition-colors ${offering.recommended ? "bg-[#1F6B4A] text-white hover:bg-[#185c3f]" : "bg-[#0D2E2B] text-white hover:bg-[#0D2E2B]/90"}`}>
                  {t(offering.ctaRo, offering.ctaEn)}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-[#888888] font-light">{t("Ambele pachete includ o consultatie initiala gratuita. Oferta finala este personalizata in functie de suprafata si complexitatea proiectului.", "Both packages include a free initial consultation. Every quote is personalised based on the area and complexity of the project.")}</p>
        </div>
      </section>

      {/* ── Feature comparison ── */}
      <section className="bg-[#F5F4F0] py-24">
        <div className="container-site">
          <div className="mb-12">
            <p className="section-label mb-3">• {t("CE ESTE INCLUS", "WHAT IS INCLUDED")}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] tracking-tighter mb-4">{t("50+ servicii BMS", "50+ BMS services")}</h2>
            <p className="text-base text-[#888888] font-light max-w-xl">{t("De la management standard la infrastructura completa, Sovitech combina software modern si servicii de expert.", "From standard management to full infrastructure, Sovitech combines modern software and expert services.")}</p>
          </div>
          <div className="mb-10 flex items-center gap-2">
            <button onClick={() => setShowPlan("standard")} className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${showPlan === "standard" ? "bg-[#0D2E2B] text-white" : "bg-white text-[#888888] hover:text-[#0D2E2B]"}`}>Standard</button>
            <button onClick={() => setShowPlan("complet")} className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${showPlan === "complet" ? "bg-[#0D2E2B] text-white" : "bg-white text-[#888888] hover:text-[#0D2E2B]"}`}>Full Service</button>
          </div>
          <div className="max-w-4xl">
            <div className="rounded-[2px] bg-white border border-[#0D2E2B]/8 p-8">
              {showPlan === "complet" && (
                <div className="mb-6 rounded-[2px] bg-[#C8E6C9] p-4">
                  <p className="text-sm font-semibold text-[#C8E6C9]">{t("Operatiuni complete + mentenanta inclusa", "Full operations + maintenance included")}</p>
                </div>
              )}
              {featureCategories.map((category, idx) => (
                <div key={idx} className={idx !== 0 ? "mt-8 border-t border-[#0D2E2B]/10 pt-8" : ""}>
                  <h3 className="mb-4 text-sm font-semibold tracking-widest uppercase text-[#888888]">{t(category.nameRo, category.nameEn)}</h3>
                  <ul className="space-y-3">
                    {category.features.map((feature, fidx) => {
                      const isIncluded = showPlan === "standard" ? feature.standard : feature.complet
                      return (
                        <li key={fidx} className="flex items-center gap-3">
                          {isIncluded ? <Check className="h-4 w-4 flex-shrink-0 text-[#1F6B4A]" /> : <div className="h-4 w-4 flex-shrink-0" />}
                          <span className={`text-sm ${isIncluded ? "text-[#0D2E2B]" : "text-[#0D2E2B]/30"}`}>
                            {t(feature.nameRo, feature.nameEn)}
                            {!isIncluded && showPlan === "standard" && <span className="ml-2 text-xs text-[#888888]">*{t("disponibil in Full Service", "available in Full Service")}</span>}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Additional services ── */}
      <section className="bg-white py-24">
        <div className="container-site">
          <p className="section-label mb-3">• {t("SERVICII ADITIONALE", "ADDITIONAL SERVICES")}</p>
          <h2 className="text-3xl lg:text-4xl font-light text-[#0D2E2B] mb-12 tracking-tighter">{t("Solutii specializate", "Specialised solutions")}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {additionalServices.map((service, idx) => (
              <div key={idx} className="rounded-[2px] bg-[#F5F4F0] border border-[#0D2E2B]/10 p-8 hover:border-[#0D2E2B]/25 transition-colors duration-300">
                <h3 className="mb-3 text-lg font-light text-[#0D2E2B] tracking-tighter">{t(service.titleRo, service.titleEn)}</h3>
                <p className="text-sm text-[#888888] font-light leading-relaxed">{t(service.descRo, service.descEn)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trusted CTA band ── */}
      <section className="bg-[#07201C] py-24">
        <div className="container-site">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <p className="section-label text-[#1F6B4A] mb-2">• {t("DE INCREDERE", "TRUSTED")}</p>
              <h2 className="text-3xl lg:text-4xl font-light text-white tracking-tighter max-w-xl">{t("Blocheaza costurile de management BMS pentru 10 ani", "Lock in your BMS management costs for 10 years")}</h2>
              <p className="mt-4 text-white/60 font-light max-w-lg">{t("Lanseaza, opereaza si scaloneaza sistemul tau BMS fara griji legate de costurile in crestere.", "Launch, operate and scale your BMS system without worrying about rising costs.")}</p>
            </div>
            <Link href="/contact" className="btn-sovitech flex-shrink-0">
              {t("Vorbeste cu un expert", "Speak with an expert")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white py-24">
        <div className="container-site">
          <p className="section-label mb-3">• FAQ</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] mb-16 tracking-tighter">{t("Intrebari frecvente", "Frequently asked questions")}</h2>
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
          <div className="mt-12">
            <Link href="/contact" className="inline-flex items-center gap-2 text-sm font-medium text-[#1F6B4A] hover:gap-3 transition-all">
              {t("Vorbeste cu un expert", "Speak with an expert")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-[#F5F4F0] py-24">
        <div className="container-site">
          <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">• {t("Clienti", "Clients")}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] tracking-tighter mb-16">{t("Ce spun clientii nostri", "What our clients say")}</h2>
          <div className="max-w-3xl">
            <div className="relative bg-white rounded-[2px] p-10 border border-[#0D2E2B]/8">
              <div className="absolute top-0 left-8 right-8 h-1 rounded-b-full transition-colors duration-300" style={{ backgroundColor: ["#C8E6C9", "#C5C0F5", "#8B7B5C"][currentTestimonial] }} />
              <blockquote>
                <p className="text-xl font-light leading-relaxed text-[#0D2E2B] mb-8">&ldquo;{t(testimonials[currentTestimonial].quoteRo, testimonials[currentTestimonial].quoteEn)}&rdquo;</p>
                <footer className="flex items-center gap-4">
                  <div className="relative h-14 w-14 overflow-hidden rounded-full shrink-0">
                    <Image src={testimonials[currentTestimonial].image || "/placeholder.svg"} alt={testimonials[currentTestimonial].author} fill className="object-cover" />
                  </div>
                  <div>
                    <p className="font-light text-sm text-[#0D2E2B]">{testimonials[currentTestimonial].author}</p>
                    <p className="text-xs text-[#888888] font-light">{t(testimonials[currentTestimonial].roleRo, testimonials[currentTestimonial].roleEn)}</p>
                  </div>
                </footer>
              </blockquote>
              <div className="mt-8 flex gap-2">
                {testimonials.map((_, idx) => (
                  <button key={idx} onClick={() => setCurrentTestimonial(idx)} className="h-2 rounded-full transition-all duration-300" style={{ width: currentTestimonial === idx ? 24 : 8, backgroundColor: currentTestimonial === idx ? ["#1F6B4A", "#5C5FD4", "#8B7B5C"][idx] : "rgba(13,46,43,0.15)" }} aria-label={`${t("Testimonial", "Testimonial")} ${idx + 1}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
