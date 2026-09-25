import {
  Thermometer,
  Wind,
  Lightbulb,
  Shield,
  BarChart3,
  Wifi,
  FlaskConical,
  Stethoscope,
  ShoppingBag,
  Hotel,
  Factory,
  GraduationCap,
  Building2,
  Zap,
  Clock,
  Leaf,
  type LucideIcon,
} from "lucide-react"

export interface SectorFeature {
  icon: LucideIcon
  title: string
  description: string
}

export interface SectorMetric {
  value: string
  label: string
}

export interface SectorTestimonial {
  quote: string
  name: string
  role: string
  company: string
}

export interface SectorL10n {
  title: string
  subtitle: string
  description: string
  heroHeadline: string
  heroSubheadline: string
  metricValues: string[]
  metricLabels: string[]
  features: { title: string; description: string }[]
  capabilities: string[]
  testimonialQuote: string
  testimonialRole: string
}

export interface Sector {
  id: string
  slug: string
  title: string
  subtitle: string
  description: string
  accentColor: string
  accentTextDark: boolean
  heroHeadline: string
  heroSubheadline: string
  metrics: SectorMetric[]
  features: SectorFeature[]
  capabilities: string[]
  testimonial: SectorTestimonial
  relatedSectors: string[]
  image: string
  ro?: SectorL10n
}

export const sectors: Sector[] = [
  {
    id: "civil",
    slug: "civil",
    title: "Offices",
    subtitle: "Office buildings & commercial spaces",
    description:
      "BMS solutions tailored for modern office buildings and commercial spaces — maximising comfort, reducing operational costs, and meeting energy certification requirements.",
    accentColor: "#C5C0F5",
    accentTextDark: true,
    heroHeadline: "Smarter offices.\nHappier teams.",
    heroSubheadline:
      "From single-tenant HQs to multi-floor commercial towers, SOVITECH BMS systems bring full visibility and control over every building system — from HVAC to access — in one unified platform.",
    metrics: [
      { value: "30–40%", label: "Reduction in operational costs" },
      { value: "98%", label: "System uptime guaranteed" },
      { value: "<18mo", label: "Average ROI payback period" },
      { value: "A+", label: "Energy certification achieved" },
    ],
    features: [
      {
        icon: Thermometer,
        title: "Adaptive climate control",
        description:
          "Automatically adjust HVAC zones based on occupancy, CO2 levels, and weather data for optimal thermal comfort throughout the day.",
      },
      {
        icon: Lightbulb,
        title: "Intelligent lighting",
        description:
          "Presence-based lighting scenes that adapt to natural light levels, time of day, and occupancy schedules across all zones.",
      },
      {
        icon: BarChart3,
        title: "Energy reporting & certification",
        description:
          "Automated energy consumption dashboards and reporting for LEED, BREEAM and EPBD compliance with zero manual effort.",
      },
      {
        icon: Shield,
        title: "Integrated security & access",
        description:
          "Unified management of access control, CCTV, and intrusion detection alongside building systems from a single interface.",
      },
      {
        icon: Wifi,
        title: "Remote monitoring",
        description:
          "24/7 remote access to all building systems via web or mobile, with real-time alerts and predictive maintenance notifications.",
      },
      {
        icon: Zap,
        title: "Peak demand management",
        description:
          "Automated load shifting and demand response to reduce peak energy consumption and lower electricity tariffs.",
      },
    ],
    capabilities: [
      "Integrated HVAC system management for optimal thermal comfort",
      "Lighting monitoring and control with automated scenes based on occupancy",
      "Integration of security, access control and energy management systems",
      "Automated energy consumption reporting and energy certification",
      "Multi-zone scheduling aligned to working hours and occupancy patterns",
      "BACnet, KNX and Modbus protocol integration",
    ],
    testimonial: {
      quote:
        "Before SOVITECH, we had no visibility into what was consuming energy across our three office buildings. Within six months of deployment, we reduced our electricity bill by 34% and finally achieved our A energy certification.",
      name: "Andrei Popescu",
      role: "Facilities Director",
      company: "Bucharest Business Park",
    },
    ro: {
      title: "Birouri",
      subtitle: "Clădiri de birouri și spații comerciale",
      description: "Soluții BMS adaptate clădirilor moderne de birouri și spațiilor comerciale — confort maxim, costuri operaționale reduse și conformitate cu cerințele de certificare energetică.",
      heroHeadline: "Birouri mai inteligente.\nEchipe mai mulțumite.",
      heroSubheadline: "De la sedii single-tenant la turnuri de birouri multietajate, sistemele BMS SOVITECH oferă vizibilitate și control complet asupra fiecărui sistem al clădirii — de la HVAC la acces — într-o singură platformă unificată.",
      metricValues: ["30–40%", "98%", "<18 luni", "A+"],
      metricLabels: ["Reducere a costurilor operaționale", "Disponibilitate garantată a sistemului", "Perioadă medie de amortizare", "Certificare energetică obținută"],
      features: [
        { title: "Climatizare adaptivă", description: "Ajustează automat zonele HVAC în funcție de ocupare, nivelul de CO2 și datele meteo, pentru confort termic optim pe tot parcursul zilei." },
        { title: "Iluminat inteligent", description: "Scenarii de iluminat bazate pe prezență, adaptate la lumina naturală, momentul zilei și programul de ocupare al fiecărei zone." },
        { title: "Raportare energetică & certificare", description: "Dashboard-uri și rapoarte automate de consum energetic pentru conformitate LEED, BREEAM și EPBD, fără efort manual." },
        { title: "Securitate & acces integrate", description: "Gestionare unificată a controlului de acces, CCTV și detecției de efracție, alături de sistemele clădirii, dintr-o singură interfață." },
        { title: "Monitorizare de la distanță", description: "Acces remote 24/7 la toate sistemele clădirii, prin web sau mobil, cu alerte în timp real și notificări de mentenanță predictivă." },
        { title: "Managementul vârfurilor de consum", description: "Deplasare automată a sarcinilor și demand response pentru reducerea consumului la vârf și tarife mai mici la energie." },
      ],
      capabilities: ["Management integrat al sistemelor HVAC pentru confort termic optim", "Monitorizare și control al iluminatului, cu scenarii automate bazate pe ocupare", "Integrarea sistemelor de securitate, control acces și management energetic", "Raportare automată a consumului și certificare energetică", "Programare multi-zonă aliniată programului de lucru și gradului de ocupare", "Integrare protocoale BACnet, KNX și Modbus"],
      testimonialQuote: "Înainte de SOVITECH nu aveam nicio vizibilitate asupra consumului din cele trei clădiri de birouri. În șase luni de la implementare am redus factura de energie cu 34% și am obținut, în sfârșit, certificarea energetică clasa A.",
      testimonialRole: "Director de Facilități",
    },
    relatedSectors: ["medical", "retail", "educational"],
    image: "/placeholder.svg?height=800&width=1200",
  },
  {
    id: "medical",
    slug: "medical",
    title: "Medical & Pharma",
    subtitle: "Hospitals, clinics & pharmaceutical production",
    description:
      "Precision-grade BMS systems for medical facilities and pharmaceutical environments — where control, compliance, and patient safety are non-negotiable.",
    accentColor: "#C8E6C9",
    accentTextDark: true,
    heroHeadline: "Precision control.\nCompliant by design.",
    heroSubheadline:
      "Hospitals and pharmaceutical plants demand the highest standards of environmental control. SOVITECH delivers certified BMS solutions that ensure compliance, patient safety, and operational continuity.",
    metrics: [
      { value: "GMP", label: "Compliant environments" },
      { value: "±0.5°C", label: "Temperature accuracy in critical zones" },
      { value: "100%", label: "Audit trail for all parameter changes" },
      { value: "24/7", label: "Continuous monitoring & alerting" },
    ],
    features: [
      {
        icon: Thermometer,
        title: "Critical zone climate control",
        description:
          "Precise temperature, humidity and differential pressure management in operating rooms, clean rooms and sterile production areas.",
      },
      {
        icon: Wind,
        title: "Ventilation & air quality",
        description:
          "Continuous monitoring and automated control of air changes per hour, HEPA filtration status, and contamination prevention.",
      },
      {
        icon: FlaskConical,
        title: "GMP compliance management",
        description:
          "Automated parameter logging, deviation alerts, and audit-ready reports aligned with EU GMP Annex 11 and FDA 21 CFR Part 11.",
      },
      {
        icon: Stethoscope,
        title: "Patient safety monitoring",
        description:
          "Real-time environmental monitoring in patient rooms with automated escalation alerts to nursing stations and facility management.",
      },
      {
        icon: BarChart3,
        title: "Compliance reporting",
        description:
          "Fully automated regulatory reporting for ISO 14644, GxP environments, and hospital accreditation standards.",
      },
      {
        icon: Shield,
        title: "Redundant system architecture",
        description:
          "Fail-safe design with redundant controllers, UPS integration and automatic failover to guarantee zero interruption.",
      },
    ],
    capabilities: [
      "Precise temperature, humidity and differential pressure control in critical zones",
      "Continuous air quality monitoring and ventilation system management",
      "Automated management of medical equipment and specialist machinery",
      "Real-time alarms and reporting for compliance with medical standards",
      "Integration with hospital information systems (HIS/LIMS)",
      "FDA 21 CFR Part 11 and EU GMP Annex 11 compliant data logging",
    ],
    testimonial: {
      quote:
        "The level of control and auditability that SOVITECH provides in our cleanroom environments has transformed our compliance process. Our last FDA audit had zero findings related to environmental monitoring.",
      name: "Dr. Elena Ionescu",
      role: "Quality Assurance Manager",
      company: "Antibiotice Iași",
    },
    ro: {
      title: "Medical & Farma",
      subtitle: "Spitale, clinici și producție farmaceutică",
      description: "Sisteme BMS de precizie pentru unități medicale și medii farmaceutice — acolo unde controlul, conformitatea și siguranța pacienților nu sunt negociabile.",
      heroHeadline: "Control de precizie.\nConform prin design.",
      heroSubheadline: "Spitalele și fabricile farmaceutice cer cele mai înalte standarde de control al mediului. SOVITECH livrează soluții BMS certificate care asigură conformitatea, siguranța pacienților și continuitatea operațională.",
      metricValues: ["GMP", "±0,5°C", "100%", "24/7"],
      metricLabels: ["Medii conforme", "Precizie de temperatură în zonele critice", "Trasabilitate completă a modificărilor de parametri", "Monitorizare și alertare continuă"],
      features: [
        { title: "Climatizare în zone critice", description: "Control precis al temperaturii, umidității și presiunii diferențiale în sălile de operație, camerele curate și zonele de producție sterilă." },
        { title: "Ventilație & calitatea aerului", description: "Monitorizare continuă și control automat al schimburilor de aer pe oră, al stării filtrelor HEPA și al prevenirii contaminării." },
        { title: "Management conformitate GMP", description: "Înregistrare automată a parametrilor, alerte la deviații și rapoarte pregătite de audit, aliniate cu EU GMP Anexa 11 și FDA 21 CFR Part 11." },
        { title: "Monitorizarea siguranței pacienților", description: "Monitorizare de mediu în timp real în saloane, cu alerte automate către stațiile de asistență și managementul clădirii." },
        { title: "Raportare de conformitate", description: "Raportare complet automată pentru ISO 14644, medii GxP și standardele de acreditare spitalicească." },
        { title: "Arhitectură redundantă", description: "Design fail-safe cu controlere redundante, integrare UPS și failover automat pentru zero întreruperi." },
      ],
      capabilities: ["Control precis al temperaturii, umidității și presiunii diferențiale în zonele critice", "Monitorizare continuă a calității aerului și managementul ventilației", "Gestionare automată a echipamentelor medicale și a instalațiilor de specialitate", "Alarme și raportare în timp real pentru conformitate cu standardele medicale", "Integrare cu sistemele informatice spitalicești (HIS/LIMS)", "Înregistrare de date conformă FDA 21 CFR Part 11 și EU GMP Anexa 11"],
      testimonialQuote: "Nivelul de control și trasabilitate oferit de SOVITECH în camerele noastre curate ne-a transformat procesul de conformitate. Ultimul audit FDA s-a încheiat fără nicio observație legată de monitorizarea mediului.",
      testimonialRole: "Manager Asigurarea Calității",
    },
    relatedSectors: ["industrial", "civil", "educational"],
    image: "/placeholder.svg?height=800&width=1200",
  },
  {
    id: "retail",
    slug: "retail",
    title: "Retail",
    subtitle: "Shopping centres, hypermarkets & retail chains",
    description:
      "Centralised BMS automation for retail environments — delivering consistent customer comfort across hundreds of locations while driving significant energy savings.",
    accentColor: "#8B7B5C",
    accentTextDark: false,
    heroHeadline: "Better comfort.\nHigher footfall.",
    heroSubheadline:
      "In retail, the environment is part of the product. SOVITECH BMS systems maintain perfect conditions for customers and merchandise while cutting energy costs by up to 35% across your entire portfolio.",
    metrics: [
      { value: "25–35%", label: "Energy cost reduction" },
      { value: "Multi-site", label: "Centralised management" },
      { value: "+12%", label: "Average dwell time improvement" },
      { value: "Real-time", label: "Refrigeration monitoring" },
    ],
    features: [
      {
        icon: Thermometer,
        title: "Comfort-optimised climate",
        description:
          "Zone-by-zone climate management adapting to customer density, time of day, and seasonal conditions to maintain ideal shopping conditions.",
      },
      {
        icon: Lightbulb,
        title: "Adaptive lighting scenes",
        description:
          "Dynamic lighting profiles that shift across opening, peak and closing hours, with presence detection in low-traffic zones.",
      },
      {
        icon: ShoppingBag,
        title: "Refrigeration monitoring",
        description:
          "Continuous temperature monitoring of all refrigerated display cases with automated alerts before product loss occurs.",
      },
      {
        icon: BarChart3,
        title: "Multi-site energy dashboard",
        description:
          "Consolidated energy reporting across all locations, identifying inefficiencies and benchmarking performance between stores.",
      },
      {
        icon: Clock,
        title: "Schedule-based automation",
        description:
          "Pre-programmed opening and closing routines that automatically adjust all building systems — reducing waste during closed hours.",
      },
      {
        icon: Shield,
        title: "Security & access management",
        description:
          "Integrated management of CCTV, alarm systems and access control across all sites from a single operations centre.",
      },
    ],
    capabilities: [
      "Integrated climate management for customer comfort and cost reduction",
      "Smart lighting control with adaptive zone and schedule scenarios",
      "Refrigeration system monitoring and optimisation",
      "Security and access system integration for enhanced safety",
      "Centralised management of multiple locations from single dashboard",
      "BMS integration with retail POS and footfall analytics systems",
    ],
    testimonial: {
      quote:
        "Managing 14 hypermarkets from a single dashboard was unthinkable before SOVITECH. Now our facilities team handles everything remotely, and we've cut our energy spend by 31% in the first year.",
      name: "Mihai Constantin",
      role: "Operations Director",
      company: "Cora Romania",
    },
    ro: {
      title: "Retail",
      subtitle: "Centre comerciale, hipermarketuri și lanțuri de retail",
      description: "Automatizare BMS centralizată pentru spații de retail — confort constant pentru clienți în sute de locații și economii semnificative de energie.",
      heroHeadline: "Confort mai bun.\nTrafic mai mare.",
      heroSubheadline: "În retail, ambianța face parte din produs. Sistemele BMS SOVITECH mențin condiții perfecte pentru clienți și marfă, reducând totodată costurile cu energia cu până la 35% în întregul portofoliu.",
      metricValues: ["25–35%", "Multi-locație", "+12%", "Timp real"],
      metricLabels: ["Reducerea costurilor cu energia", "Management centralizat", "Creștere medie a timpului petrecut în magazin", "Monitorizarea instalațiilor frigorifice"],
      features: [
        { title: "Climat optimizat pentru confort", description: "Management climatic pe zone, adaptat la densitatea clienților, momentul zilei și sezon, pentru condiții de cumpărături ideale." },
        { title: "Scenarii de iluminat adaptive", description: "Profiluri dinamice de iluminat pentru orele de deschidere, vârf și închidere, cu detecție de prezență în zonele cu trafic redus." },
        { title: "Monitorizare frigorifică", description: "Monitorizare continuă a temperaturii în toate vitrinele frigorifice, cu alerte automate înainte de pierderea produselor." },
        { title: "Dashboard energetic multi-locație", description: "Raportare energetică consolidată pentru toate locațiile, identificând ineficiențele și comparând performanța între magazine." },
        { title: "Automatizare pe bază de program", description: "Rutine preprogramate de deschidere și închidere care ajustează automat toate sistemele clădirii — eliminând risipa în afara programului." },
        { title: "Securitate & management acces", description: "Gestionare integrată a CCTV, sistemelor de alarmă și controlului de acces în toate locațiile, dintr-un singur centru de operațiuni." },
      ],
      capabilities: ["Management climatic integrat pentru confortul clienților și reducerea costurilor", "Control inteligent al iluminatului, cu scenarii adaptive pe zone și programe", "Monitorizarea și optimizarea instalațiilor frigorifice", "Integrarea sistemelor de securitate și acces pentru siguranță sporită", "Management centralizat al mai multor locații dintr-un singur dashboard", "Integrare BMS cu sisteme POS și analiză de trafic"],
      testimonialQuote: "Să administrezi 14 hipermarketuri dintr-un singur dashboard era de neimaginat înainte de SOVITECH. Acum echipa noastră gestionează totul de la distanță, iar în primul an am redus cheltuielile cu energia cu 31%.",
      testimonialRole: "Director de Operațiuni",
    },
    relatedSectors: ["horeca", "civil", "industrial"],
    image: "/placeholder.svg?height=800&width=1200",
  },
  {
    id: "horeca",
    slug: "horeca",
    title: "HoReCa & Wellness",
    subtitle: "Hotels, restaurants & leisure facilities",
    description:
      "Dedicated BMS automation for hotels, resorts and restaurants — delivering exceptional guest experience while dramatically reducing energy and operational costs per room.",
    accentColor: "#1F6B4A",
    accentTextDark: false,
    heroHeadline: "Five-star comfort.\nFour-star efficiency.",
    heroSubheadline:
      "Guest experience is everything in hospitality. SOVITECH BMS systems integrate with your PMS to automate room comfort, reduce energy waste during vacancies, and give your team full visibility across the property.",
    metrics: [
      { value: "25–38%", label: "Energy reduction per room" },
      { value: "PMS", label: "Full integration (Opera, Fidelio)" },
      { value: "+0.8★", label: "Average review score improvement" },
      { value: "Per-room", label: "Consumption reporting" },
    ],
    features: [
      {
        icon: Hotel,
        title: "PMS integration",
        description:
          "Full two-way integration with Opera, Fidelio and other PMS systems — automatically adjusting room conditions on check-in and check-out.",
      },
      {
        icon: Thermometer,
        title: "Guest comfort profiles",
        description:
          "Individual room climate control with guest preferences stored and applied automatically upon return visits.",
      },
      {
        icon: Zap,
        title: "Vacancy energy management",
        description:
          "Automatic setback of HVAC, lighting and other systems during unoccupied periods — eliminating waste without compromising readiness.",
      },
      {
        icon: BarChart3,
        title: "Consumption reporting per room",
        description:
          "Detailed energy and water consumption data per room and per cost centre for precise operational budgeting.",
      },
      {
        icon: Wind,
        title: "Spa & wellness integration",
        description:
          "Specialised control for pool, spa, sauna and fitness areas with automated temperature, humidity and ventilation management.",
      },
      {
        icon: Clock,
        title: "Event & banquet automation",
        description:
          "Pre-configured climate and lighting scenarios for conference rooms and banquet halls, activated automatically from your event calendar.",
      },
    ],
    capabilities: [
      "Individual room control via PMS integration (Fidelio, Opera)",
      "Automated check-in/check-out scenarios for guaranteed savings",
      "Consumption monitoring per room and cost centre",
      "Spa, pool and fitness centre systems integration",
      "Restaurant and kitchen ventilation automation",
      "Guest app integration for in-room personalisation",
    ],
    testimonial: {
      quote:
        "Our guests consistently comment on how comfortable the rooms feel the moment they walk in. The SOVITECH integration with our Opera PMS means every room is perfectly prepared before the guest arrives — and we use 32% less energy than before.",
      name: "Radu Georgescu",
      role: "General Manager",
      company: "Radisson Blu Bucharest",
    },
    ro: {
      title: "HoReCa & Wellness",
      subtitle: "Hoteluri, restaurante și facilități de agrement",
      description: "Automatizare BMS dedicată hotelurilor, resorturilor și restaurantelor — experiență excepțională pentru oaspeți și costuri energetice și operaționale per cameră semnificativ mai mici.",
      heroHeadline: "Confort de cinci stele.\nEficiență de patru stele.",
      heroSubheadline: "În ospitalitate, experiența oaspetelui este totul. Sistemele BMS SOVITECH se integrează cu PMS-ul tău pentru a automatiza confortul camerelor, a reduce risipa de energie în perioadele neocupate și a oferi echipei vizibilitate completă asupra întregii proprietăți.",
      metricValues: ["25–38%", "PMS", "+0,8★", "Per cameră"],
      metricLabels: ["Reducere de energie per cameră", "Integrare completă (Opera, Fidelio)", "Creștere medie a scorului recenziilor", "Raportarea consumului"],
      features: [
        { title: "Integrare PMS", description: "Integrare bidirecțională completă cu Opera, Fidelio și alte sisteme PMS — ajustând automat condițiile din cameră la check-in și check-out." },
        { title: "Profiluri de confort pentru oaspeți", description: "Control climatic individual per cameră, cu preferințele oaspeților salvate și aplicate automat la vizitele următoare." },
        { title: "Management energetic la neocupare", description: "Reducere automată a HVAC, iluminatului și celorlalte sisteme în perioadele neocupate — fără a compromite pregătirea camerei." },
        { title: "Raportarea consumului per cameră", description: "Date detaliate de consum de energie și apă per cameră și per centru de cost, pentru bugetare operațională precisă." },
        { title: "Integrare spa & wellness", description: "Control specializat pentru piscină, spa, saună și zonele de fitness, cu management automat al temperaturii, umidității și ventilației." },
        { title: "Automatizare evenimente & banchete", description: "Scenarii preconfigurate de climat și iluminat pentru sălile de conferințe și banchete, activate automat din calendarul de evenimente." },
      ],
      capabilities: ["Control individual al camerelor prin integrare PMS (Fidelio, Opera)", "Scenarii automate de check-in/check-out pentru economii garantate", "Monitorizarea consumului per cameră și centru de cost", "Integrarea sistemelor pentru spa, piscină și centru de fitness", "Automatizarea ventilației pentru restaurant și bucătărie", "Integrare cu aplicația pentru oaspeți, pentru personalizare în cameră"],
      testimonialQuote: "Oaspeții noștri remarcă frecvent cât de confortabile sunt camerele încă de la intrare. Integrarea SOVITECH cu PMS-ul Opera înseamnă că fiecare cameră este perfect pregătită înainte de sosirea oaspetelui — cu 32% mai puțină energie decât înainte.",
      testimonialRole: "Director General",
    },
    relatedSectors: ["retail", "civil", "educational"],
    image: "/placeholder.svg?height=800&width=1200",
  },
  {
    id: "industrial",
    slug: "industrial",
    title: "Industrial",
    subtitle: "Warehouses, logistics & manufacturing",
    description:
      "High-performance BMS automation for industrial facilities — ensuring optimal working conditions, process efficiency, and significant reductions in energy and maintenance costs.",
    accentColor: "#5C5FD4",
    accentTextDark: false,
    heroHeadline: "Industrial scale.\nEngineered precision.",
    heroSubheadline:
      "Industrial environments demand reliability above all else. SOVITECH delivers robust BMS systems integrated with SCADA and production platforms to ensure maximum uptime, process quality, and energy efficiency.",
    metrics: [
      { value: "SCADA", label: "Full integration capability" },
      { value: "20–30%", label: "Reduction in energy costs" },
      { value: "Predictive", label: "Maintenance scheduling" },
      { value: "24/7", label: "Remote monitoring & response" },
    ],
    features: [
      {
        icon: Factory,
        title: "Industrial HVAC automation",
        description:
          "Full automation of high-capacity ventilation, heating and cooling systems aligned to production schedules and process requirements.",
      },
      {
        icon: BarChart3,
        title: "Process environment monitoring",
        description:
          "Continuous monitoring of temperature, humidity, dust and chemical exposure levels critical to production quality.",
      },
      {
        icon: Wifi,
        title: "SCADA & MES integration",
        description:
          "Native integration with SCADA and Manufacturing Execution Systems for real-time production data overlay on building systems.",
      },
      {
        icon: Zap,
        title: "Energy cost centre reporting",
        description:
          "Granular energy consumption data broken down by production line, building zone and shift — enabling precise cost attribution.",
      },
      {
        icon: Shield,
        title: "Safety & compliance",
        description:
          "Automated safety monitoring for hazardous zones, gas detection integration, and emergency ventilation activation.",
      },
      {
        icon: Clock,
        title: "Predictive maintenance",
        description:
          "AI-assisted anomaly detection on critical equipment such as compressors, chillers and AHUs — preventing unexpected downtime.",
      },
    ],
    capabilities: [
      "Full automation of high-capacity industrial HVAC systems",
      "Continuous environmental parameter monitoring for production processes",
      "Integration with production and SCADA systems for maximum efficiency",
      "Advanced energy management and consumption reporting per cost centre",
      "Emergency ventilation and gas detection system integration",
      "ISO 50001 energy management system support",
    ],
    testimonial: {
      quote:
        "SOVITECH gave us something we never had before — complete visibility across our entire production facility. We identified three major energy waste points in the first month and recovered the full investment within 14 months.",
      name: "Ionut Popa",
      role: "Plant Manager",
      company: "Ursus Breweries Cluj",
    },
    ro: {
      title: "Industrial",
      subtitle: "Depozite, logistică și producție",
      description: "Automatizare BMS de înaltă performanță pentru facilități industriale — condiții optime de lucru, eficiență a proceselor și reduceri semnificative ale costurilor de energie și mentenanță.",
      heroHeadline: "Scară industrială.\nPrecizie inginerească.",
      heroSubheadline: "Mediile industriale cer, înainte de toate, fiabilitate. SOVITECH livrează sisteme BMS robuste, integrate cu SCADA și platformele de producție, pentru disponibilitate maximă, calitate a proceselor și eficiență energetică.",
      metricValues: ["SCADA", "20–30%", "Predictivă", "24/7"],
      metricLabels: ["Capabilitate de integrare completă", "Reducerea costurilor cu energia", "Planificarea mentenanței", "Monitorizare și intervenție de la distanță"],
      features: [
        { title: "Automatizare HVAC industrial", description: "Automatizare completă a sistemelor de ventilație, încălzire și răcire de mare capacitate, aliniată programelor de producție și cerințelor de proces." },
        { title: "Monitorizarea mediului de proces", description: "Monitorizare continuă a temperaturii, umidității, prafului și expunerii chimice, critice pentru calitatea producției." },
        { title: "Integrare SCADA & MES", description: "Integrare nativă cu SCADA și sistemele MES, pentru suprapunerea datelor de producție în timp real peste sistemele clădirii." },
        { title: "Raportare energetică pe centre de cost", description: "Date granulare de consum, defalcate pe linie de producție, zonă și schimb — pentru atribuirea precisă a costurilor." },
        { title: "Siguranță & conformitate", description: "Monitorizare automată a zonelor periculoase, integrare cu detecția de gaze și activarea ventilației de urgență." },
        { title: "Mentenanță predictivă", description: "Detecție de anomalii asistată de AI pentru echipamentele critice — compresoare, chillere, CTA-uri — prevenind opririle neplanificate." },
      ],
      capabilities: ["Automatizare completă a sistemelor HVAC industriale de mare capacitate", "Monitorizare continuă a parametrilor de mediu pentru procesele de producție", "Integrare cu sistemele de producție și SCADA pentru eficiență maximă", "Management energetic avansat și raportare pe centre de cost", "Integrarea ventilației de urgență și a detecției de gaze", "Suport pentru sisteme de management energetic ISO 50001"],
      testimonialQuote: "SOVITECH ne-a oferit ceva ce nu am avut niciodată — vizibilitate completă asupra întregii facilități de producție. Am identificat trei puncte majore de risipă energetică în prima lună și am recuperat întreaga investiție în 14 luni.",
      testimonialRole: "Director de Fabrică",
    },
    relatedSectors: ["medical", "civil", "retail"],
    image: "/placeholder.svg?height=800&width=1200",
  },
  {
    id: "educational",
    slug: "educational",
    title: "Educational",
    subtitle: "Schools, universities & campus buildings",
    description:
      "BMS automation designed around the rhythms of education — delivering healthy learning environments, simplified campus management, and compliance with sustainability targets.",
    accentColor: "#E07B6A",
    accentTextDark: true,
    heroHeadline: "Healthy spaces.\nFocused minds.",
    heroSubheadline:
      "The quality of the learning environment directly impacts academic performance. SOVITECH BMS systems maintain optimal CO2, temperature and lighting conditions throughout the school day — automatically.",
    metrics: [
      { value: "20–30%", label: "Energy savings vs conventional systems" },
      { value: "CO2", label: "Continuous classroom monitoring" },
      { value: "Multi-campus", label: "Centralised management" },
      { value: "EPBD", label: "Compliance & reporting" },
    ],
    features: [
      {
        icon: GraduationCap,
        title: "Timetable-based scheduling",
        description:
          "Automatic climate and lighting adjustments aligned to your school timetable — rooms are ready before students arrive and powered down after they leave.",
      },
      {
        icon: Wind,
        title: "CO2 & air quality monitoring",
        description:
          "Continuous monitoring of CO2 levels in classrooms with automated ventilation increases when concentration affects concentration.",
      },
      {
        icon: Building2,
        title: "Multi-building campus control",
        description:
          "Unified management of all campus buildings — classrooms, labs, sports halls, canteens and dormitories — from a single platform.",
      },
      {
        icon: Leaf,
        title: "Sustainability reporting",
        description:
          "Automated energy and carbon reporting for EPBD compliance, ESG targets, and institutional sustainability commitments.",
      },
      {
        icon: Lightbulb,
        title: "Daylight-responsive lighting",
        description:
          "Adaptive lighting that responds to natural light levels and presence, ensuring ideal conditions for study without waste.",
      },
      {
        icon: BarChart3,
        title: "Utility cost management",
        description:
          "Detailed consumption reporting per building and per department, giving administrators clear visibility to manage budgets.",
      },
    ],
    capabilities: [
      "Automated schedules adapted to school timetables",
      "Air quality and CO2 monitoring in classrooms",
      "Centralised management of multi-building campuses",
      "Energy compliance and sustainability reporting",
      "Holiday and vacation setback scheduling for zero-waste periods",
      "Integration with smart metering and utility billing systems",
    ],
    testimonial: {
      quote:
        "Since deploying SOVITECH across our campus, CO2 levels in classrooms have dropped by 40%, attendance is up, and our energy bill fell by 27%. The system practically manages itself — our maintenance team can now focus on real issues.",
      name: "Prof. Cristina Marin",
      role: "Campus Operations Director",
      company: "Politehnica University of Bucharest",
    },
    ro: {
      title: "Educațional",
      subtitle: "Școli, universități și campusuri",
      description: "Automatizare BMS gândită în ritmul educației — medii de învățare sănătoase, management simplificat al campusului și conformitate cu țintele de sustenabilitate.",
      heroHeadline: "Spații sănătoase.\nMinți concentrate.",
      heroSubheadline: "Calitatea mediului de învățare influențează direct performanța academică. Sistemele BMS SOVITECH mențin automat niveluri optime de CO2, temperatură și iluminat pe toată durata programului școlar.",
      metricValues: ["20–30%", "CO2", "Multi-campus", "EPBD"],
      metricLabels: ["Economii de energie față de sistemele convenționale", "Monitorizare continuă în sălile de clasă", "Management centralizat", "Conformitate și raportare"],
      features: [
        { title: "Programare după orar", description: "Ajustare automată a climatizării și iluminatului după orarul școlii — sălile sunt pregătite înainte de sosirea elevilor și oprite după plecare." },
        { title: "Monitorizare CO2 & calitatea aerului", description: "Monitorizare continuă a nivelului de CO2 în sălile de clasă, cu intensificarea automată a ventilației atunci când aerul afectează concentrarea." },
        { title: "Control campus multi-clădire", description: "Management unificat al tuturor clădirilor din campus — săli de clasă, laboratoare, săli de sport, cantine și cămine — dintr-o singură platformă." },
        { title: "Raportare de sustenabilitate", description: "Raportare automată de energie și carbon pentru conformitate EPBD, ținte ESG și angajamentele instituționale de sustenabilitate." },
        { title: "Iluminat adaptat luminii naturale", description: "Iluminat adaptiv care răspunde la lumina naturală și prezență, asigurând condiții ideale de studiu fără risipă." },
        { title: "Managementul costurilor cu utilitățile", description: "Raportare detaliată a consumului per clădire și departament, oferind administratorilor vizibilitate clară asupra bugetelor." },
      ],
      capabilities: ["Programe automate adaptate orarelor școlare", "Monitorizarea calității aerului și a CO2 în sălile de clasă", "Management centralizat al campusurilor cu mai multe clădiri", "Raportare de conformitate energetică și sustenabilitate", "Regimuri reduse automate în vacanțe, pentru zero risipă", "Integrare cu contorizare inteligentă și sisteme de facturare"],
      testimonialQuote: "De la implementarea SOVITECH în campus, nivelul de CO2 din săli a scăzut cu 40%, prezența a crescut, iar factura de energie s-a redus cu 27%. Sistemul practic se administrează singur — echipa de mentenanță se poate concentra pe problemele reale.",
      testimonialRole: "Director Operațiuni Campus",
    },
    relatedSectors: ["civil", "medical", "horeca"],
    image: "/placeholder.svg?height=800&width=1200",
  },
]

export function localizeSector(sector: Sector, lang: "ro" | "en"): Sector {
  if (lang !== "ro" || !sector.ro) return sector
  const r = sector.ro
  return {
    ...sector,
    title: r.title,
    subtitle: r.subtitle,
    description: r.description,
    heroHeadline: r.heroHeadline,
    heroSubheadline: r.heroSubheadline,
    metrics: sector.metrics.map((m, i) => ({
      value: r.metricValues[i] ?? m.value,
      label: r.metricLabels[i] ?? m.label,
    })),
    features: sector.features.map((f, i) => ({
      ...f,
      title: r.features[i]?.title ?? f.title,
      description: r.features[i]?.description ?? f.description,
    })),
    capabilities: r.capabilities,
    testimonial: {
      ...sector.testimonial,
      quote: r.testimonialQuote,
      role: r.testimonialRole,
    },
  }
}

export function getSectorBySlug(slug: string): Sector | undefined {
  return sectors.find((s) => s.slug === slug)
}

export function getRelatedSectors(ids: string[]): Sector[] {
  return sectors.filter((s) => ids.includes(s.id))
}
