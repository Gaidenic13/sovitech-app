import {
  Thermometer,
  Wind,
  Lightbulb,
  Shield,
  BarChart3,
  FlaskConical,
  Stethoscope,
  ShoppingBag,
  Hotel,
  Factory,
  GraduationCap,
  Building2,
  Zap,
  Clock,
  Gauge,
  Droplets,
  FileCheck,
  Server,
  type LucideIcon,
} from "lucide-react"

// Content source: C4 sector copy (Partea B). Evidence rule applied throughout:
// project names and scope figures come from the verified reference portfolio
// (app/referinte/page.tsx); no savings percentage is published without its
// domain in the same sentence; no invented people or testimonials. Sectors
// without a portfolio reference (entertainment, data centres) state that
// openly instead of claiming experience.

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
    subtitle: "Class A & B office buildings",
    description:
      "An office building is controlled zone by zone, with variable occupancy and large internal heat gains. The BMS covers zoning, tenant submetering and the owner's reporting data, at 9-18 EUR/sqm for class A and 5-10 EUR/sqm for class B.",
    accentColor: "#C5C0F5",
    accentTextDark: true,
    heroHeadline: "Office building BMS:\n9-18 EUR/sqm at class A.",
    heroSubheadline:
      "A BMS for a class A office building costs 9-18 EUR/sqm, at a usual density of 50-90 data points per 1,000 sqm. The difference from class B comes from the number of separately controlled zones, from tenant submetering and from the owner's reporting requirements.",
    metrics: [
      { value: "9-18 EUR/sqm", label: "Cost of a new, complete BMS for class A offices (5-10 for class B)" },
      { value: "50-90", label: "Data points per 1,000 sqm, the usual class A density" },
      { value: "5-15%", label: "Measured savings on total building consumption after optimisation, with 1-3 year payback" },
      { value: "4", label: "Office references: BCR Calea Victoriei, Floreasca Tower, Stefan cel Mare Building, Monaco Towers" },
    ],
    features: [
      {
        icon: Thermometer,
        title: "Zone-by-zone control",
        description:
          "Zone temperature via fan coils, chilled beams or VAV terminals, with different regimes for perimeter and interior zones within the same day.",
      },
      {
        icon: BarChart3,
        title: "Tenant submetering",
        description:
          "Electricity and thermal energy meters on every leased zone, integrated via Modbus or M-Bus, with 15-minute history and at least 24 months of full-resolution retention.",
      },
      {
        icon: Zap,
        title: "No simultaneous heating and cooling",
        description:
          "Coordinated control of perimeter zones prevents heating and cooling running at the same time on the same plant, the most expensive form of waste in an office building.",
      },
      {
        icon: Wind,
        title: "Fresh air on CO2",
        description:
          "Carbon dioxide is measured in dense work areas and meeting rooms, and fresh air supply follows real occupancy rather than the declared schedule.",
      },
      {
        icon: Building2,
        title: "Point reserve and re-zoning",
        description:
          "Zoning follows the lease contracts, not the architectural plan: the system keeps a point reserve and logic that is easy to reconfigure at every new tenant.",
      },
      {
        icon: FileCheck,
        title: "Data for compliance",
        description:
          "The 290 kW threshold of Law 372/2005 has an expired deadline, and indoor environment monitoring and ESG reporting require a history that stands up to an auditor.",
      },
    ],
    capabilities: [
      "Zone temperature control: fan coils, chilled beams, VAV terminal units",
      "Air handling units: temperature, humidity and duct pressure control",
      "Electricity and thermal metering on the building and on each leased zone",
      "CO2 monitoring in dense work areas and meeting rooms",
      "Lighting in common areas and blinds on exposed facades",
      "History at 15-minute resolution, retained for at least 24 months",
    ],
    testimonial: {
      quote:
        "BMS automation delivered for BCR Calea Victoriei, a 26,300 sqm office building (tower and podium) in Bucharest: BMS, access control and lighting.",
      name: "BCR Calea Victoriei",
      role: "Delivered project",
      company: "București",
    },
    ro: {
      title: "Clădiri de birouri",
      subtitle: "Birouri clasa A și clasa B",
      description:
        "O clădire de birouri se reglează pe zone, cu ocupare variabilă și surse interne mari de căldură. Sistemul BMS acoperă zonarea, contorizarea pe chiriași și datele de raportare ale proprietarului, la 9-18 EUR/mp pentru clasa A și 5-10 EUR/mp pentru clasa B.",
      heroHeadline: "BMS pentru clădiri de birouri:\n9-18 EUR/mp la clasa A.",
      heroSubheadline:
        "Un sistem BMS pentru o clădire de birouri clasa A costă 9-18 EUR/mp, cu o densitate uzuală de 50-90 de puncte la 1.000 mp. Diferența față de clasa B vine din numărul de zone reglate separat, din contorizarea pe chiriași și din cerințele de raportare ale proprietarului.",
      metricValues: ["9-18 EUR/mp", "50-90", "5-15%", "4"],
      metricLabels: [
        "Costul unui sistem BMS nou, complet, la birouri clasa A (5-10 la clasa B)",
        "Puncte de date la 1.000 mp, densitatea uzuală la clasa A",
        "Economie măsurată din consumul total al clădirii după optimizare, cu amortizare de 1-3 ani",
        "Referințe în birouri: BCR Calea Victoriei, Floreasca Tower, Ștefan cel Mare Building, Monaco Towers",
      ],
      features: [
        { title: "Reglaj pe zone", description: "Temperatura pe zonă prin ventiloconvectoare, grinzi de răcire sau unități VAV, cu regimuri diferite pentru perimetru și interior în aceeași zi." },
        { title: "Contorizare pe chiriași", description: "Contoare de energie electrică și termică pe fiecare zonă închiriată, integrate prin Modbus sau M-Bus, cu istoric la 15 minute și retenție de minimum 24 de luni la rezoluție completă." },
        { title: "Fără încălzire și răcire simultană", description: "Reglajul coordonat al zonelor de perimetru evită încălzirea și răcirea simultană pe aceeași instalație, cea mai scumpă formă de risipă dintr-o clădire de birouri." },
        { title: "Aer proaspăt pe CO2", description: "Dioxidul de carbon se măsoară în spațiile de lucru dense și în sălile de ședință, iar aportul de aer proaspăt urmează ocuparea reală, nu programul declarat." },
        { title: "Rezervă de puncte și rezonare", description: "Zonarea urmează contractele de închiriere, nu planul de arhitectură: sistemul păstrează rezervă de puncte și logică ușor de reconfigurat la fiecare chiriaș nou." },
        { title: "Date pentru conformare", description: "Pragul de 290 kW din Legea 372/2005 are termenul depășit, iar monitorizarea mediului interior și raportarea ESG cer un istoric care rezistă la verificarea unui auditor." },
      ],
      capabilities: [
        "Reglarea temperaturii pe zone: ventiloconvectoare, grinzi de răcire, unități VAV",
        "Centrale de tratare a aerului: temperatură, umiditate și presiune în tubulatură",
        "Contorizare electrică și termică pe clădire și pe fiecare zonă închiriată",
        "Monitorizare CO2 în spațiile de lucru dense și în sălile de ședință",
        "Iluminat în spațiile comune și jaluzele pe fațadele expuse",
        "Istoric la rezoluție de 15 minute, cu retenție de minimum 24 de luni",
      ],
      testimonialQuote:
        "Automatizare BMS livrată pentru BCR Calea Victoriei, clădire de birouri de 26.300 m² (turn și podium) din București: BMS, control acces și iluminat.",
      testimonialRole: "Proiect livrat",
    },
    relatedSectors: ["retail", "horeca", "educational"],
    image: "/referinte/bcr-calea-victoriei.jpg",
  },
  {
    id: "medical",
    slug: "medical",
    title: "Healthcare",
    subtitle: "Hospitals & healthcare buildings",
    description:
      "A hospital runs 24 hours a day, with zones that can never be switched off and others that behave like an office building. The overriding requirement is continuity: plant in critical zones keeps working no matter what happens to the supervision layer.",
    accentColor: "#C8E6C9",
    accentTextDark: true,
    heroHeadline: "Hospital BMS:\ncontinuity in critical zones.",
    heroSubheadline:
      "Operating theatres, intensive care and infection-risk zones require local control on the controller, redundancy and immediate alarming. Everything tied to the safety of a critical zone is implemented locally; supervision remains a layer for visualisation, history and alarms.",
    metrics: [
      { value: "3", label: "Hospital references in Bucharest: Sfanta Maria, Foisor, the Plastic Surgery and Burns Hospital" },
      { value: "9,000 sqm", label: "Foisor orthopaedic hospital: BMS with backup for critical systems, 119 beds" },
      { value: "303", label: "Beds at Sfanta Maria Clinical Hospital, served by the BMS" },
      { value: "24/7", label: "Critical zones keep running locally on their controllers, even without supervision" },
    ],
    features: [
      {
        icon: Shield,
        title: "Continuity in critical zones",
        description:
          "Controllers in critical zones run autonomously, without the supervision station and, as far as possible, without the network. Safety interlocks stay active locally.",
      },
      {
        icon: Gauge,
        title: "Differential pressures",
        description:
          "Operating theatres in overpressure, isolation rooms in underpressure, with the direction impossible to reverse accidentally and thresholds agreed with infection control.",
      },
      {
        icon: Wind,
        title: "Airflow and air changes",
        description:
          "Air volume and air changes per hour in critical zones, with filter condition monitored and automatic changeover to standby air handling plant.",
      },
      {
        icon: Stethoscope,
        title: "Theatres, ICU, sterilisation, lab",
        description:
          "Each department with its own regime: operating block, intensive care, sterilisation, laboratory, radiology with equipment temperature requirements.",
      },
      {
        icon: Thermometer,
        title: "Pharmacy and cold storage",
        description:
          "Temperatures in the pharmacy and in medicine and sample refrigerators, recorded continuously with alarming on threshold violations.",
      },
      {
        icon: Clock,
        title: "Phasing without interrupting care",
        description:
          "Work is planned by zone with the medical management, the old system kept as a fallback, and critical zones migrated last, after the method is proven on non-critical ones.",
      },
    ],
    capabilities: [
      "Temperature and humidity control in operating theatres and intensive care",
      "Controlled differential pressure between aseptic zones and adjacent areas",
      "Airflow and air changes in critical zones, with filter condition monitored",
      "Pharmacy and medicine or sample cold-storage temperatures with history",
      "Alarms routed to the staff who can act, not only to the plant room",
      "Phased execution by zone and building wing, with critical zones migrated last",
    ],
    testimonial: {
      quote:
        "BMS delivered for the new Foisor orthopaedic hospital in Bucharest: 9,000 sqm, 119 beds, with backup for critical systems and phased execution inside a healthcare building.",
      name: "Spitalul Foișor",
      role: "Delivered project",
      company: "București",
    },
    ro: {
      title: "Medical",
      subtitle: "Spitale și clădiri medicale",
      description:
        "Un spital funcționează 24 de ore din 24, cu zone care nu pot fi oprite niciodată și cu altele care se comportă ca o clădire de birouri. Cerința care le domină pe toate este continuitatea: instalațiile din zonele critice funcționează indiferent ce se întâmplă cu supervizarea.",
      heroHeadline: "BMS pentru spitale:\ncontinuitate în zonele critice.",
      heroSubheadline:
        "Sălile de operație, terapia intensivă și zonele cu risc de infecție cer control local pe controler, redundanță și alarmare imediată. Tot ce ține de siguranța zonei critice se implementează local, iar supervizarea rămâne strat de vizualizare, istoric și alarmare.",
      metricValues: ["3", "9.000 m²", "303", "24/7"],
      metricLabels: [
        "Referințe în spitale din București: Sfânta Maria, Foișor, Spitalul de Chirurgie Plastică și Arsuri",
        "Spitalul de ortopedie Foișor: BMS cu backup pentru sistemele critice, 119 paturi",
        "Paturi la Spitalul Clinic Sfânta Maria, deservite de sistemul BMS",
        "Zonele critice funcționează local, pe controler, și fără supervizare",
      ],
      features: [
        { title: "Continuitate în zonele critice", description: "Controlerele din zonele critice funcționează autonom, fără stația de supervizare și, pe cât posibil, fără rețea. Interblocajele de siguranță rămân active local." },
        { title: "Presiuni diferențiale", description: "Sălile de operație în suprapresiune, camerele de izolare în depresiune, cu sensul imposibil de inversat accidental și praguri stabilite cu serviciul de prevenire a infecțiilor." },
        { title: "Debit de aer și schimburi orare", description: "Debitul și numărul de schimburi orare în zonele critice, cu starea filtrelor monitorizată și trecere automată pe centrala de rezervă." },
        { title: "Bloc operator, ATI, sterilizare, laborator", description: "Fiecare departament cu regimul propriu: blocul operator, terapia intensivă, sterilizarea, laboratorul, radiologia cu cerințe de temperatură pentru aparatură." },
        { title: "Farmacie și spații frigorifice", description: "Temperaturile din farmacie și din frigiderele de medicamente și de probe, înregistrate continuu, cu alarmare la depășirea pragurilor." },
        { title: "Fazare fără întreruperea activității", description: "Lucrările se planifică pe zone, cu conducerea medicală, cu sistemul vechi păstrat ca punct de revenire și cu zonele critice migrate ultimele, după validarea metodei pe zone necritice." },
      ],
      capabilities: [
        "Temperatură și umiditate reglate în sălile de operație și în terapia intensivă",
        "Presiune diferențială controlată între zonele cu cerințe de asepsie și zonele adiacente",
        "Debit de aer și schimburi orare în zonele critice, cu starea filtrelor monitorizată",
        "Temperaturile din farmacie și din spațiile frigorifice de medicamente și probe, cu istoric",
        "Alarmare care ajunge la personalul care poate acționa, nu doar în camera tehnică",
        "Execuție fazată pe zone și pe corpuri de clădire, cu zonele critice migrate ultimele",
      ],
      testimonialQuote:
        "Sistem BMS livrat pentru noul spital de ortopedie Foișor din București: 9.000 m², 119 paturi, cu backup pentru sistemele critice și execuție etapizată într-o clădire medicală.",
      testimonialRole: "Proiect livrat",
    },
    relatedSectors: ["industrial", "civil", "educational"],
    image: "/referinte/spitalul-foisor.jpg",
  },
  {
    id: "retail",
    slug: "retail",
    title: "Retail",
    subtitle: "Shopping centres, retail parks & chains",
    description:
      "Retail has large volumes, intense occupancy in short intervals and many leased units that run their own terminal plant. The system's value comes from metering per unit and from operating the whole portfolio from one control room.",
    accentColor: "#8B7B5C",
    accentTextDark: false,
    heroHeadline: "Retail BMS:\nunit metering, portfolio operation.",
    heroSubheadline:
      "A BMS for retail costs 4-9 EUR/sqm, the lowest band after industrial. In a shopping centre the value does not come from control complexity but from metering per leased unit and from the ability to operate dozens of locations from the same dispatch centre.",
    metrics: [
      { value: "4-9 EUR/sqm", label: "System cost, applied to common areas and central plant" },
      { value: "2", label: "Retail references: Pitesti Retail Park and Roman Value Centre" },
      { value: "24,800 sqm", label: "Leasable area at Pitesti Retail Park, served by the BMS" },
      { value: "70 kW", label: "The 2029 EU threshold that brings individual stores under the automation obligation" },
    ],
    features: [
      {
        icon: BarChart3,
        title: "Metering per leased unit",
        description:
          "Electricity, heat and water meters on every unit, fitted uniformly during construction and integrated via M-Bus or Modbus into a single history. Without them, service-charge recovery is contested.",
      },
      {
        icon: Building2,
        title: "One dispatch centre per portfolio",
        description:
          "A standardised point list, labels and alarm matrix decided at the first store, so that 40 locations show the same screens and the same alarms mean the same thing everywhere.",
      },
      {
        icon: Thermometer,
        title: "Mall and common areas",
        description:
          "Temperature and fresh air in the gallery and common spaces, pressure and airflow at the air handling units, heating and cooling water temperatures.",
      },
      {
        icon: Lightbulb,
        title: "Lighting on schedule and daylight",
        description:
          "Gallery and car park lighting on schedule and daylight where skylights exist. Daylight control reduces lighting consumption, a figure reported against the lighting load, not the whole building.",
      },
      {
        icon: Wind,
        title: "Car park and smoke control",
        description:
          "Car park ventilation driven by carbon monoxide measurement, and smoke extraction interfaced with the fire alarm panel, which keeps the safety function.",
      },
      {
        icon: ShoppingBag,
        title: "Food areas",
        description:
          "Cold room and refrigerated display temperatures monitored with history and alarming where a food zone exists, plus extract systems for the food court.",
      },
    ],
    capabilities: [
      "Electricity, heat and water meters on every leased unit",
      "Temperature and fresh air supply in the gallery and common areas",
      "Gallery and car park lighting on schedule and on daylight",
      "Car park ventilation on CO measurement and interface with smoke control",
      "Standardised point list, labels and alarm matrix for chain operation",
      "History at 15-minute resolution, retained for at least 24 months",
    ],
    testimonial: {
      quote:
        "BMS delivered for Pitesti Retail Park, a retail park with around 24,800 sqm of leasable area: HVAC control, lighting and energy metering.",
      name: "Pitești Retail Park",
      role: "Delivered project",
      company: "Pitești",
    },
    ro: {
      title: "Retail",
      subtitle: "Centre comerciale, parcuri de retail și rețele",
      description:
        "Retailul are volume mari, ocupare intensă în intervale scurte și multe spații închiriate care își gestionează singure instalațiile terminale. Valoarea sistemului vine din contorizarea pe unitate locativă și din operarea întregului portofoliu dintr-un singur dispecerat.",
      heroHeadline: "BMS pentru retail:\ncontorizare și operare pe portofoliu.",
      heroSubheadline:
        "Un sistem BMS pentru retail costă 4-9 EUR/mp, cea mai joasă bandă după industrial. Într-un centru comercial, valoarea nu vine din complexitatea reglajului, ci din contorizarea pe unitate locativă și din capacitatea de a opera zeci de locații din același dispecerat.",
      metricValues: ["4-9 EUR/mp", "2", "24.800 m²", "70 kW"],
      metricLabels: [
        "Costul sistemului, raportat la părțile comune și la instalațiile centrale",
        "Referințe în retail: Pitești Retail Park și Roman Value Centre",
        "Suprafață închiriabilă la Pitești Retail Park, deservită de sistemul BMS",
        "Pragul UE din 2029, care aduce sub obligație magazinele individuale",
      ],
      features: [
        { title: "Contorizare pe unitate locativă", description: "Contoare de energie electrică, termică și de apă pe fiecare unitate, montate unitar în timpul execuției și integrate prin M-Bus sau Modbus într-un singur istoric. Fără ele, recuperarea prin service charge este contestată." },
        { title: "Un dispecerat pe portofoliu", description: "Listă de puncte, etichete și matrice de alarme standardizate la primul magazin, ca 40 de locații să afișeze aceleași ecrane, iar aceeași alarmă să însemne același lucru peste tot." },
        { title: "Galerie și spații comune", description: "Temperatura și aportul de aer proaspăt în galerie și în spațiile comune, presiunea și debitul la centralele de tratare a aerului, temperatura agentului termic și de răcire." },
        { title: "Iluminat pe program și pe lumină naturală", description: "Iluminatul galeriei și al parcării pe program și pe lumină naturală, unde există luminatoare. Controlul pe lumină naturală reduce consumul de iluminat, cifră raportată la consumul de iluminat, nu la clădire." },
        { title: "Parcare și desfumare", description: "Ventilația parcării comandată pe măsurarea monoxidului de carbon și desfumarea în interfață cu centrala de incendiu, care păstrează funcția de siguranță." },
        { title: "Zona alimentară", description: "Temperaturile din spațiile frigorifice și din vitrinele frigorifice monitorizate cu istoric și alarmare, acolo unde există zonă alimentară, plus evacuările zonei de alimentație." },
      ],
      capabilities: [
        "Contoare de energie electrică, termică și de apă pe fiecare unitate locativă",
        "Temperatura și aportul de aer proaspăt în galerie și în spațiile comune",
        "Iluminatul galeriei și al parcării pe program și pe lumină naturală",
        "Ventilația parcării pe măsurarea CO și interfața cu desfumarea",
        "Listă de puncte, etichete și matrice de alarme standardizate pentru operarea pe rețea",
        "Istoric la rezoluție de 15 minute, cu retenție de minimum 24 de luni",
      ],
      testimonialQuote:
        "Sistem BMS livrat pentru Pitești Retail Park, parc de retail cu circa 24.800 m² suprafață închiriabilă: control HVAC, iluminat și contorizare de energie.",
      testimonialRole: "Proiect livrat",
    },
    relatedSectors: ["civil", "horeca", "industrial"],
    image: "/referinte/pitesti-retail-park.webp",
  },
  {
    id: "horeca",
    slug: "horeca",
    title: "HORECA",
    subtitle: "Hotels & restaurants",
    description:
      "A hotel runs around the clock, with daily occupancy swings and zones with completely different requirements inside the same building: rooms, kitchen, laundry, conference rooms, spa. It is the most heterogeneous commercial building type from an automation standpoint.",
    accentColor: "#1F6B4A",
    accentTextDark: false,
    heroHeadline: "Hotel BMS:\nroom control drives the budget.",
    heroSubheadline:
      "A hotel BMS costs 6-13 EUR/sqm when it covers only the central plant and 18-38 EUR/sqm with room control. The difference does not come from the basement equipment but from the hundreds of rooms, each with its own thermostat, window contact and link to the front-desk system.",
    metrics: [
      { value: "6-13 EUR/sqm", label: "Without room control: central plant only" },
      { value: "18-38 EUR/sqm", label: "With room control: the cost of the rooms dominates the budget" },
      { value: "4", label: "HORECA references in Bucharest: Radisson, Athenee Palace Hilton, Novotel, Crowne Plaza" },
      { value: "598", label: "Rooms at Athenee Palace Hilton Bucharest, a historic hotel served by the delivered BMS" },
    ],
    features: [
      {
        icon: Hotel,
        title: "Room control linked to reception",
        description:
          "The system learns from the hotel management system whether a room is sold, occupied or free and applies the matching regime. Most of a hotel's achievable saving sits in the unsold rooms.",
      },
      {
        icon: Thermometer,
        title: "Setback calibrated to the room",
        description:
          "The reduced regime is calibrated on the real thermal inertia of the room, not a fixed value, so the room returns to comfort between check-in and the guest entering. A complaint cancels the whole saving policy.",
      },
      {
        icon: Wind,
        title: "Kitchen, laundry, car park",
        description:
          "Kitchen supply air follows hood operation, the laundry has its own regime, and car park ventilation runs on carbon monoxide measurement with automatic alarming.",
      },
      {
        icon: Droplets,
        title: "Spa and pool zones",
        description:
          "High humidity requires dedicated air handling, heat recovery and condensation-resistant equipment. A wrong setting there degrades the building structure within a few seasons.",
      },
      {
        icon: BarChart3,
        title: "Consumption by functional zone",
        description:
          "Energy metered per functional zone (rooms, kitchen, laundry, spa, conference), with domestic hot water temperature monitored and historised against microbiological risk.",
      },
      {
        icon: Clock,
        title: "Phased work, hotel running",
        description:
          "Execution by floor and zone in low-occupancy periods, with a limited number of rooms out of sale at a time and central plant migrated in night windows with the old system as fallback.",
      },
    ],
    capabilities: [
      "A thermostat in every room, with window contact and presence detection",
      "Interface with the hotel management system: room sold, occupied or free",
      "Fresh air supply matched to occupancy in conference rooms and the restaurant",
      "Domestic hot water temperature monitored, with history",
      "Car park ventilation driven by carbon monoxide measurement",
      "Kitchen cold-room temperatures with alarming",
    ],
    testimonial: {
      quote:
        "BMS automation delivered for a five-star hotel in Bucharest with over 1,800 sqm of event space: temperature control and ventilation integrated into the central system.",
      name: "Radisson Blu București",
      role: "Delivered project",
      company: "București",
    },
    ro: {
      title: "HORECA",
      subtitle: "Hoteluri și restaurante",
      description:
        "Un hotel funcționează permanent, cu ocupare care variază zilnic și cu zone cu cerințe complet diferite în aceeași clădire: camere, bucătărie, spălătorie, săli de conferință, spa. Este cel mai eterogen tip de clădire comercială din punctul de vedere al automatizării.",
      heroHeadline: "BMS pentru hoteluri:\ncontrolul pe cameră decide bugetul.",
      heroSubheadline:
        "Un sistem BMS pentru un hotel costă 6-13 EUR/mp dacă acoperă doar instalațiile centrale și 18-38 EUR/mp cu control pe cameră. Diferența nu vine din echipamentele de la subsol, ci din sutele de camere, fiecare cu termostat, contact de fereastră și legătură cu sistemul de recepție.",
      metricValues: ["6-13 EUR/mp", "18-38 EUR/mp", "4", "598"],
      metricLabels: [
        "Fără control pe cameră: doar instalațiile centrale",
        "Cu control pe cameră: costul camerelor domină bugetul",
        "Referințe HORECA în București: Radisson, Athénée Palace Hilton, Novotel, Crowne Plaza",
        "Camere la Athénée Palace Hilton București, hotel istoric deservit de sistemul BMS livrat",
      ],
      features: [
        { title: "Control pe cameră legat de recepție", description: "Sistemul află din sistemul de gestiune hotelieră dacă o cameră este vândută, ocupată sau liberă și aplică regimul corespunzător. Cea mai mare parte a economiei posibile într-un hotel stă în camerele nevândute." },
        { title: "Regim redus calibrat pe cameră", description: "Regimul redus se calibrează pe inerția termică reală a camerei, nu pe o valoare fixă, ca revenirea la confort să se încadreze între check-in și intrarea oaspetelui. O reclamație anulează toată politica de economie." },
        { title: "Bucătărie, spălătorie, parcare", description: "Aportul de aer la bucătărie urmează funcționarea hotelor, spălătoria are regim propriu, iar ventilația parcării merge pe măsurarea monoxidului de carbon, cu alarmare automată." },
        { title: "Zona de spa și piscină", description: "Umiditatea ridicată cere tratare a aerului dedicată, recuperare de căldură și materiale rezistente la condens. Un reglaj greșit acolo degradează construcția în câteva sezoane." },
        { title: "Consum pe zone funcționale", description: "Energie contorizată pe zone funcționale (camere, bucătărie, spălătorie, spa, conferințe), cu temperatura apei calde menajere monitorizată și istoricizată pentru prevenirea riscului microbiologic." },
        { title: "Lucrări fazate, hotel în funcțiune", description: "Execuție pe etaje și pe zone în perioadele de ocupare scăzută, cu un număr limitat de camere scoase din vânzare simultan și cu instalațiile centrale migrate în ferestre nocturne, cu sistemul vechi ca punct de revenire." },
      ],
      capabilities: [
        "Termostat propriu în fiecare cameră, cu contact de fereastră și detector de prezență",
        "Interfață cu sistemul de gestiune hotelieră: cameră vândută, ocupată sau liberă",
        "Aport de aer proaspăt corelat cu ocuparea la sălile de conferință și la restaurant",
        "Temperatura apei calde menajere, monitorizată cu istoric",
        "Ventilația parcării pe măsurarea monoxidului de carbon",
        "Temperaturile din spațiile frigorifice ale bucătăriei, cu alarmare",
      ],
      testimonialQuote:
        "Automatizare BMS livrată pentru un hotel de cinci stele din București, cu peste 1.800 m² de spații de evenimente: control de temperatură și ventilație integrate în sistemul central.",
      testimonialRole: "Proiect livrat",
    },
    relatedSectors: ["retail", "civil", "medical"],
    image: "/referinte/radisson-blu-hotel.jpg",
  },
  {
    id: "industrial",
    slug: "industrial",
    title: "Industrial & Logistics",
    subtitle: "Production halls & logistics warehouses",
    description:
      "A hall has large volumes, zones with different requirements and a production process that does not stop for automation. The building side and the process side are distinct systems, and the boundary between them is set explicitly, in the project.",
    accentColor: "#5C5FD4",
    accentTextDark: false,
    heroHeadline: "Industrial BMS:\nlarge zones, monitored utilities.",
    heroSubheadline:
      "Automating a production hall or a logistics warehouse costs 3-8 EUR/sqm, the lowest band in the cost register, because areas are large and point density is low. The value comes not from fine control but from monitored utilities and from the continuity the production depends on.",
    metrics: [
      { value: "3-8 EUR/sqm", label: "The lowest cost band: large areas, low point density" },
      { value: "3", label: "Industrial references: NTN-SNR Sibiu, Moncler Bacau, BMTI Strabag" },
      { value: "37,000 sqm", label: "Production floor at the NTN-SNR bearing factory in Sibiu, served by the BMS" },
      { value: "1,000 toe", label: "Annual threshold for the mandatory energy audit under Law 121/2014" },
    ],
    features: [
      {
        icon: Factory,
        title: "Large zones, high halls",
        description:
          "Heating via unit heaters, destratification fans or radiant panels, measured at several heights: controlling on one sensor at 2 metres in a 10-12 metre hall gives a false picture.",
      },
      {
        icon: Wind,
        title: "Process-linked ventilation",
        description:
          "Technological ventilation follows the process, with equipment protection ratings chosen for dust, vibration, temperature extremes or jet washing in food areas.",
      },
      {
        icon: Gauge,
        title: "Compressed air monitored",
        description:
          "The most expensive utility in a factory and the most often wasted: flow and pressure are correlated with the production schedule so that leaks become visible.",
      },
      {
        icon: Zap,
        title: "Energy per line and utility",
        description:
          "Electricity metered per production line and per utility, producing the data required for the mandatory energy audit at 1,000 toe per year.",
      },
      {
        icon: Shield,
        title: "Building-process boundary",
        description:
          "The BMS does not command the production line: integration with line automation happens at utility and status level, with responsibilities set down in writing.",
      },
      {
        icon: Clock,
        title: "No unplanned stops",
        description:
          "Interventions are grouped into the factory's planned shutdowns, while adjacent offices and changing rooms are treated as a small tertiary building of their own.",
      },
    ],
    capabilities: [
      "Temperature over large zones, with destratification driven by the level difference",
      "Compressed air, chilled water and process water monitoring",
      "Temperature and humidity in warehouses with product requirements, with history and alarms",
      "Electricity consumption per production line and per utility",
      "Status of pumping groups, compressors and utility equipment",
      "Lighting by zone and presence, ventilation and air curtains at the gates",
    ],
    testimonial: {
      quote:
        "BMS delivered for the NTN-SNR bearing factory in Sibiu, with 37,000 sqm of production floor: hall temperature control, industrial ventilation and monitoring per production zone.",
      name: "NTN-SNR Sibiu",
      role: "Delivered project",
      company: "Sibiu",
    },
    ro: {
      title: "Industrial & Logistică",
      subtitle: "Hale de producție și depozite logistice",
      description:
        "O hală are volume mari, zone cu cerințe diferite și un proces de producție care nu se oprește pentru automatizare. Partea de clădire și partea de proces sunt sisteme distincte, iar granița dintre ele se stabilește explicit, în proiect.",
      heroHeadline: "BMS industrial și logistic:\nzone mari, utilități monitorizate.",
      heroSubheadline:
        "Automatizarea unei hale de producție sau a unui depozit logistic costă 3-8 EUR/mp, cea mai joasă bandă din registrul de costuri, pentru că suprafețele sunt mari și densitatea de puncte este mică. Valoarea nu vine din reglajul fin, ci din monitorizarea utilităților și din continuitatea de care depinde producția.",
      metricValues: ["3-8 EUR/mp", "3", "37.000 m²", "1.000 tep"],
      metricLabels: [
        "Cea mai joasă bandă de cost: suprafețe mari, densitate mică de puncte",
        "Referințe industriale: NTN-SNR Sibiu, Moncler Bacău, BMTI Strabag",
        "Suprafață de producție la fabrica de rulmenți NTN-SNR Sibiu, deservită de sistemul BMS",
        "Pragul anual pentru auditul energetic obligatoriu, conform Legii 121/2014",
      ],
      features: [
        { title: "Zone mari, hale înalte", description: "Încălzire prin aeroterme, destratificatoare sau radianți, cu măsurare pe mai multe niveluri: reglajul pe un singur senzor la 2 metri, într-o hală de 10-12 metri, produce o imagine falsă." },
        { title: "Ventilație corelată cu procesul", description: "Ventilația tehnologică urmează procesul, cu grade de protecție alese pentru praf, vibrații, temperaturi extreme sau spălare cu jet în zonele alimentare." },
        { title: "Aer comprimat monitorizat", description: "Cea mai scumpă utilitate dintr-o fabrică și cea mai des irosită: debitul și presiunea se corelează cu programul de producție, ca pierderile să devină vizibile." },
        { title: "Energie pe linii și utilități", description: "Energie electrică contorizată pe linii de producție și pe utilități, cu datele necesare auditului energetic obligatoriu la 1.000 tep pe an." },
        { title: "Granița clădire-proces", description: "Sistemul BMS nu comandă linia de producție: integrarea cu automatizările liniilor se face la nivel de utilitate și de stare, cu responsabilități scrise." },
        { title: "Fără opriri neplanificate", description: "Intervențiile se grupează în opririle planificate ale fabricii, iar birourile și vestiarele adiacente se tratează ca o clădire terțiară în miniatură." },
      ],
      capabilities: [
        "Temperatura pe zone mari, cu destratificare comandată pe diferența dintre niveluri",
        "Monitorizarea aerului comprimat, a apei răcite și a apei de proces",
        "Temperatura și umiditatea în depozitele cu cerințe de produs, cu istoric și alarmare",
        "Consum de energie electrică pe linii de producție și pe utilități",
        "Starea grupurilor de pompare, a compresoarelor și a echipamentelor de utilități",
        "Iluminat pe zone și pe prezență, ventilație și perdele de aer la porți",
      ],
      testimonialQuote:
        "Sistem BMS livrat pentru fabrica de rulmenți NTN-SNR din Sibiu, cu 37.000 m² suprafață de producție: control de temperatură pe hale, ventilație industrială și monitorizare pe zone de producție.",
      testimonialRole: "Proiect livrat",
    },
    relatedSectors: ["pharma", "retail", "civil"],
    image: "/referinte/ntn-snr-fabrica-de-rulmenti.jpg",
  },
  {
    id: "educational",
    slug: "educational",
    title: "Education & Institutions",
    subtitle: "Schools, embassies & public buildings",
    description:
      "Occupancy density in a classroom is higher than in almost any office, and use is concentrated in short intervals, with nights, weekends and holidays adding up to many weeks a year. The buyer is frequently public, which shapes the whole procurement process.",
    accentColor: "#E07B6A",
    accentTextDark: true,
    heroHeadline: "Schools and institutions:\nCO2 ventilation, timetable control.",
    heroSubheadline:
      "A classroom with 30 pupils reaches carbon dioxide concentrations that affect attention in under an hour. The combination of CO2-driven ventilation and a correct time schedule is the best automation investment in an educational building.",
    metrics: [
      { value: "3", label: "References: the Canadian Embassy, the German School, the French Lycee Anna de Noailles" },
      { value: "13,500 sqm", label: "Built area of the French Lycee Anna de Noailles campus, automated by Sovitech" },
      { value: "5-10 EUR/sqm", label: "Cost reference: the class B office band, used as a proxy for schools" },
      { value: "70 kW", label: "The 2029 EU threshold that brings most schools with central plant under the obligation" },
    ],
    features: [
      {
        icon: Wind,
        title: "CO2 ventilation in classrooms",
        description:
          "Sensors go in the occupied zone of the room, not in the corridor: a sensor by the door sees nothing of a room with 30 pupils and the door closed.",
      },
      {
        icon: GraduationCap,
        title: "Timetable and holiday schedules",
        description:
          "A timetable that changes twice a year, holidays with different dates every year, afternoon activities: who updates the calendar, and when, is written into the maintenance contract.",
      },
      {
        icon: Building2,
        title: "Building wings and sports halls",
        description:
          "Heating water temperature per building wing, laboratories and workshops, with sports halls treated separately for their large volumes and variable load.",
      },
      {
        icon: Shield,
        title: "Institutional security",
        description:
          "At embassies and institutional buildings: network segmentation, controlled physical access to panels and full traceability of interventions, with the security service holding a veto.",
      },
      {
        icon: FileCheck,
        title: "Public procurement",
        description:
          "The specification describes functions and characteristics, not product codes, so the procedure stays competitive and cannot be contested for steering.",
      },
      {
        icon: Clock,
        title: "Execution during holidays",
        description:
          "Phasing is built on school holidays, with complete, functional stages at the end of each: the start of the school year is not negotiable.",
      },
    ],
    capabilities: [
      "Fresh air supply driven by CO2 measurement in classrooms",
      "Temperature per room or room group, on timetable and holiday schedules",
      "Plant status monitored during holidays, when the building is unattended",
      "Domestic hot water temperature and heating substation operation",
      "Lighting on schedule and presence in common areas",
      "Energy consumption per building wing, with history for budgeting",
    ],
    testimonial: {
      quote:
        "BMS delivered for the new campus of the German School in Bucharest, 8,000 sqm built area: HVAC control, ventilation and monitoring.",
      name: "Școala Germană București",
      role: "Delivered project",
      company: "București",
    },
    ro: {
      title: "Educațional & Instituții",
      subtitle: "Școli, ambasade și clădiri publice",
      description:
        "Densitatea de ocupare într-o sală de clasă este mai mare decât în aproape orice birou, iar utilizarea este concentrată în intervale scurte, cu nopți, weekenduri și vacanțe care însumează multe săptămâni pe an. Cumpărătorul este frecvent public, ceea ce schimbă tot procesul de achiziție.",
      heroHeadline: "Școli și instituții:\nventilație pe CO2, program pe orar.",
      heroSubheadline:
        "O sală de clasă cu 30 de elevi atinge concentrații de dioxid de carbon care afectează atenția în mai puțin de o oră. Combinația dintre ventilația comandată pe CO2 și programul orar corect este cea mai bună investiție de automatizare dintr-o clădire educațională.",
      metricValues: ["3", "13.500 m²", "5-10 EUR/mp", "70 kW"],
      metricLabels: [
        "Referințe: Ambasada Canadei, Școala Germană, Liceul Francez Anna de Noailles",
        "Suprafață construită la campusul Liceului Francez Anna de Noailles, automatizat de Sovitech",
        "Reper de cost: banda birourilor clasa B, folosită ca proxy pentru școli",
        "Pragul UE din 2029, care aduce sub obligație majoritatea școlilor cu instalații centralizate",
      ],
      features: [
        { title: "Ventilație pe CO2 în sălile de clasă", description: "Senzorii se montează în zona ocupată a sălii, nu pe hol: un senzor lângă ușă nu vede ce se întâmplă într-o sală cu 30 de elevi și ușa închisă." },
        { title: "Program pe orar și pe vacanțe", description: "Orar schimbat de două ori pe an, vacanțe cu date diferite în fiecare an, activități de după-amiază: cine actualizează calendarul, și când, se scrie în contractul de întreținere." },
        { title: "Corpuri de clădire și săli de sport", description: "Temperatura agentului termic pe corpuri de clădire, laboratoare și ateliere, cu sălile de sport tratate separat, pentru volumele mari și sarcina variabilă." },
        { title: "Securitate instituțională", description: "La ambasade și clădiri instituționale: segmentare de rețea, acces fizic controlat la tablouri și trasabilitate completă a intervențiilor, cu drept de veto al serviciului de securitate." },
        { title: "Achiziție publică", description: "Specificația descrie funcții și caracteristici, nu coduri de produs, ca procedura să rămână competitivă și să nu poată fi contestată pentru direcționare." },
        { title: "Execuție în vacanțe", description: "Fazarea se construiește pe vacanțe, cu etape complete și funcționale la finalul fiecăreia: data începerii cursurilor nu se negociază." },
      ],
      capabilities: [
        "Aport de aer proaspăt comandat pe măsurarea CO2 în sălile de clasă",
        "Temperatura pe săli sau pe grupuri de săli, cu program pe orar și pe vacanțe",
        "Starea instalațiilor monitorizată în vacanțe, când clădirea este nesupravegheată",
        "Temperatura apei calde menajere și funcționarea punctului termic",
        "Iluminat pe program și pe prezență în zonele comune",
        "Consum de energie pe corpuri de clădire, cu istoric pentru bugetare",
      ],
      testimonialQuote:
        "Sistem BMS livrat pentru noul campus al Școlii Germane din București, 8.000 m² construiți: control HVAC, ventilație și monitorizare.",
      testimonialRole: "Proiect livrat",
    },
    relatedSectors: ["civil", "medical", "horeca"],
    image: "/referinte/scoala-germana-bucuresti.jpg",
  },
  {
    id: "pharma",
    slug: "pharma",
    title: "Pharma",
    subtitle: "Pharmaceutical production & classified areas",
    description:
      "In a classified area, parameters are not a matter of comfort but a condition of the product. What is really being bought is the proof: the system measures and controls, but its value lies in the record that stands up to an inspection.",
    accentColor: "#0D2E2B",
    accentTextDark: false,
    heroHeadline: "Pharma BMS and EMS:\nclassified areas, audit trail.",
    heroSubheadline:
      "Automating a pharmaceutical production facility costs 30-80 EUR/sqm, the highest band in the register, applied to the areas with requirements, not the whole built area. The difference from an ordinary building is the requirement to prove, at any time and for any moment in the past, that parameters stayed within limits.",
    metrics: [
      { value: "30-80 EUR/sqm", label: "The highest cost band: classified areas, validated monitoring, qualification documentation" },
      { value: "5", label: "Pharma references: Rompharm Co, Rompharm Uzbekistan, Hyperion Pharma, Actavis, Monrol Eczacibasi" },
      { value: "24 months", label: "Minimum data retention at full resolution" },
      { value: "IQ, OQ, PQ", label: "Qualification through protocols written and approved before execution" },
    ],
    features: [
      {
        icon: FlaskConical,
        title: "Classified areas",
        description:
          "Temperature, humidity and differential pressure controlled in every classified area and in warehouses with product requirements.",
      },
      {
        icon: Gauge,
        title: "Differential pressures",
        description:
          "Monitored between areas of different classification, with alarming on violation: an interval below the limit is a deviation that gets investigated and can affect the batch.",
      },
      {
        icon: FileCheck,
        title: "Audit trail",
        description:
          "Unalterable records with user, timestamp and reason for every parameter change, and at least 24 months of retention at full resolution.",
      },
      {
        icon: Shield,
        title: "Monitoring separate from control",
        description:
          "The environmental monitoring system records independently, with its own sensors: the system that controls cannot also be the one proving it controlled correctly.",
      },
      {
        icon: Wind,
        title: "Dedicated air handling units",
        description:
          "Operating sequences with failure regimes and changeover to standby equipment, with filter condition tracked through differential pressure.",
      },
      {
        icon: Thermometer,
        title: "Warehouses and stability rooms",
        description:
          "Product cold rooms and stability chambers monitored continuously, with alert and action thresholds set together with the quality department.",
      },
    ],
    capabilities: [
      "IQ, OQ and PQ qualification, with protocols written and approved before execution",
      "Change management: every parameter change goes through procedure, with a trace in the system",
      "Alarm thresholds set on alert and action limits, not on the strictest possible value",
      "Continuous monitoring with real-time alarming, not dataloggers downloaded periodically",
      "At least 24 months of retention at full resolution, with a 5-10 year aggregated archive",
      "The 30-80 EUR/sqm band applies to the areas with requirements, not the whole built area",
    ],
    testimonial: {
      quote:
        "Extension of Rompharm's BMS automation to a new pharmaceutical factory in Uzbekistan: temperature, humidity and pressure control, executed and commissioned outside Romania.",
      name: "Rompharm Uzbekistan",
      role: "Delivered project",
      company: "Uzbekistan",
    },
    ro: {
      title: "Pharma",
      subtitle: "Producție farmaceutică și zone clasificate",
      description:
        "Într-o zonă clasificată, parametrii nu sunt o chestiune de confort, ci o condiție de produs. Ce se cumpără de fapt este dovada: sistemul măsoară și reglează, dar valoarea lui stă în înregistrarea care rezistă la inspecție.",
      heroHeadline: "BMS și EMS pentru pharma:\nzone clasificate, pistă de audit.",
      heroSubheadline:
        "Automatizarea unei unități de producție farmaceutică costă 30-80 EUR/mp, cea mai ridicată bandă din registru, aplicată zonelor cu cerințe, nu întregii suprafețe construite. Diferența față de o clădire obișnuită este cerința de a dovedi, oricând și pentru orice moment din trecut, că parametrii au fost în limite.",
      metricValues: ["30-80 EUR/mp", "5", "24 luni", "IQ, OQ, PQ"],
      metricLabels: [
        "Cea mai ridicată bandă de cost: zone clasificate, monitorizare validată, documentație de calificare",
        "Referințe pharma: Rompharm Co, Rompharm Uzbekistan, Hyperion Pharma, Actavis, Monrol Eczacıbașı",
        "Retenție minimă a datelor la rezoluție completă",
        "Calificare prin protocoale scrise și aprobate înainte de execuție",
      ],
      features: [
        { title: "Zone clasificate", description: "Temperatură, umiditate și presiune diferențială reglate în fiecare zonă clasificată și în depozitele cu cerințe de produs." },
        { title: "Presiuni diferențiale", description: "Monitorizate între zone de clasificare diferită, cu alarmare pe depășire: un interval sub limită este o deviație care se investighează și poate afecta lotul." },
        { title: "Pistă de audit", description: "Înregistrări nemodificabile, cu utilizator, moment și motiv pentru fiecare schimbare de parametru, și retenție de minimum 24 de luni la rezoluție completă." },
        { title: "Monitorizare separată de automatizare", description: "Sistemul de monitorizare a mediului înregistrează independent, cu senzori proprii: cine reglează nu poate fi și cel care dovedește că a reglat corect." },
        { title: "Centrale de tratare a aerului dedicate", description: "Secvențe de funcționare cu regimuri de avarie și trecere pe echipament de rezervă, cu starea filtrelor urmărită prin presiune diferențială." },
        { title: "Depozite și camere de stabilitate", description: "Camere frigorifice de produs și camere de stabilitate monitorizate continuu, cu praguri de alertă și de acțiune stabilite împreună cu departamentul de calitate." },
      ],
      capabilities: [
        "Calificare IQ, OQ și PQ, cu protocoale scrise și aprobate înainte de execuție",
        "Management al schimbării: orice modificare de parametru se face prin procedură, cu urmă în sistem",
        "Praguri de alarmă stabilite pe limite de alertă și de acțiune, nu pe cea mai strictă valoare posibilă",
        "Monitorizare continuă cu alarmare în timp real, nu dataloggere descărcate periodic",
        "Retenție de minimum 24 de luni la rezoluție completă, cu arhivă agregată de 5-10 ani",
        "Banda de 30-80 EUR/mp se aplică zonelor cu cerințe, nu întregii suprafețe construite",
      ],
      testimonialQuote:
        "Extinderea automatizării BMS Rompharm către o nouă fabrică farmaceutică din Uzbekistan: control de temperatură, umiditate și presiune, cu execuție și punere în funcțiune în afara României.",
      testimonialRole: "Proiect livrat",
    },
    relatedSectors: ["medical", "industrial", "civil"],
    image: "/referinte/rompharm-company-otopeni.jpg",
  },
  {
    id: "entertainment",
    slug: "entertainment",
    title: "Entertainment",
    subtitle: "Venues, cinemas & leisure spaces",
    description:
      "A performance hall goes from zero to several hundred people in fifteen minutes and back to zero after two hours. It is the most variable load profile of any building type, with a low tolerance for discomfort and for noise.",
    accentColor: "#B14A36",
    accentTextDark: false,
    heroHeadline: "Venue BMS:\nventilation on real occupancy.",
    heroSubheadline:
      "The automation system prepares the hall before the event, sustains full occupancy without perceptible draughts and returns quickly to a minimum regime. Ventilation is driven by real occupancy, measured through CO2, not by a fixed airflow sized for a full house.",
    metrics: [
      { value: "4-18 EUR/sqm", label: "Cost reference: the aggregated band, used as a proxy for this sector" },
      { value: "CO2", label: "Ventilation driven by real occupancy, measured in the audience breathing zone" },
      { value: "290 kW", label: "Legal automation threshold, deadline 31.12.2024, already passed" },
      { value: "2026", label: "EU deadline (29 May) for indoor environmental quality monitoring, not yet transposed" },
    ],
    features: [
      {
        icon: Wind,
        title: "Ventilation on real occupancy",
        description:
          "Driven by CO2 measured in the audience breathing zone, not on the return duct, where the value is delayed and mixed.",
      },
      {
        icon: Clock,
        title: "Anticipated start-up",
        description:
          "The start moment is calculated from the hall's real temperature and thermal inertia, using the events calendar, not a fixed number of minutes.",
      },
      {
        icon: Gauge,
        title: "Slow airflow ramps",
        description:
          "Airflow increases are explicitly limited in the control program: in a performance hall, a change you can hear is a defect.",
      },
      {
        icon: Thermometer,
        title: "Foyers and access zones",
        description:
          "They load up suddenly before and after the event and need their own regime, separate from the hall.",
      },
      {
        icon: Zap,
        title: "Consumption per event",
        description:
          "Energy is measured per event, making visible the between-events running cost, which dominates in a hall used a few hours a day.",
      },
      {
        icon: Shield,
        title: "Fire panel interface",
        description:
          "Smoke control and evacuation stay with the fire alarm panel; the automation system receives the signal and switches plant according to the scenario, without taking over the safety function.",
      },
    ],
    capabilities: [
      "Hall temperature and airflow, correlated with measured occupancy",
      "Hall temperature tracked at several points, because gradients are large",
      "Ventilation at the bar and food area, with storage spaces monitored",
      "Dressing rooms, technical zones and associated offices, each with its own regime",
      "Stage lighting stays separate: a large, variable heat load, not commanded by the BMS",
      "Maximum airflow sized for hall capacity, used only when occupancy requires it",
    ],
    testimonial: {
      quote:
        "Sovitech Control does not yet claim a reference of its own in entertainment. The competence for large air volumes and variable occupancy comes from the Therme Nord Bucuresti wellness complex and from the conference rooms of the hotels in the portfolio.",
      name: "Therme Nord București",
      role: "Transferable competence",
      company: "Sport & Wellness",
    },
    ro: {
      title: "Entertainment",
      subtitle: "Săli de spectacol, cinematografe și agrement",
      description:
        "O sală de spectacol trece de la zero la câteva sute de persoane în cincisprezece minute și revine la zero după două ore. Este cel mai variabil profil de sarcină dintre toate tipurile de clădire, cu toleranță scăzută la disconfort și la zgomot.",
      heroHeadline: "BMS pentru săli de spectacol:\nventilație pe ocuparea reală.",
      heroSubheadline:
        "Sistemul de automatizare pregătește sala înainte de eveniment, susține ocuparea maximă fără curenți de aer perceptibili și revine rapid la un regim minim. Ventilația se comandă pe ocuparea reală, măsurată prin CO2, nu pe un debit fix dimensionat pentru sala plină.",
      metricValues: ["4-18 EUR/mp", "CO2", "290 kW", "2026"],
      metricLabels: [
        "Reper de cost: banda agregată, folosită ca proxy pentru acest sector",
        "Ventilație comandată pe ocuparea reală, măsurată în zona de respirație a publicului",
        "Pragul legal de automatizare, termen 31.12.2024, deja depășit",
        "Termenul UE (29 mai) pentru monitorizarea calității mediului interior, încă netranspus",
      ],
      features: [
        { title: "Ventilație pe ocuparea reală", description: "Comandă pe CO2 măsurat în zona de respirație a publicului, nu pe tubulatura de retur, unde valoarea este întârziată și amestecată." },
        { title: "Pornire anticipată", description: "Momentul pornirii se calculează pe temperatura reală a sălii și pe inerția ei termică, din programul de evenimente, nu pe un număr fix de minute." },
        { title: "Rampe lente de debit", description: "Creșterile de debit se limitează explicit în programul de control: într-o sală de spectacol, o variație care se aude este un defect." },
        { title: "Foaiere și zone de acces", description: "Se încarcă brusc înainte și după eveniment și cer un regim propriu, separat de sală." },
        { title: "Consum pe eveniment", description: "Energia se măsoară pe eveniment, iar costul de operare între evenimente, dominant într-o sală folosită câteva ore pe zi, devine vizibil." },
        { title: "Interfața cu centrala de incendiu", description: "Desfumarea și evacuarea rămân la centrala de incendiu; sistemul de automatizare primește semnal și comută instalațiile conform scenariului, fără să preia funcția de siguranță." },
      ],
      capabilities: [
        "Temperatura și debitul de aer în sală, corelate cu ocuparea măsurată",
        "Temperatura în sală urmărită pe mai multe puncte, pentru că gradienții sunt mari",
        "Ventilația la bar și la zona de alimentație, cu spațiile de depozitare monitorizate",
        "Cabine, zone tehnice și birouri asociate, fiecare cu regimul propriu",
        "Iluminatul scenic rămâne separat: sarcină termică mare și variabilă, necomandată de BMS",
        "Debit maxim dimensionat pentru capacitatea sălii, folosit doar când ocuparea o cere",
      ],
      testimonialQuote:
        "Sovitech Control nu afirmă încă o referință proprie în entertainment. Competența pentru volume mari de aer și ocupare variabilă vine din complexul de wellness Therme Nord București și din sălile de conferință ale hotelurilor din portofoliu.",
      testimonialRole: "Competență transferabilă",
    },
    relatedSectors: ["horeca", "educational", "retail"],
    image: "/placeholder.svg?height=800&width=1200",
  },
  {
    id: "centre-de-date",
    slug: "centre-de-date",
    title: "Data centres",
    subtitle: "Infrastructure monitoring & automation",
    description:
      "The heat load is constant, concentrated and almost entirely internal: there is no season, no occupancy, no night regime. The monitoring system has to be more reliable than the plant it supervises.",
    accentColor: "#5C5FD4",
    accentTextDark: false,
    heroHeadline: "Data centres:\nprecision cooling, verified redundancy.",
    heroSubheadline:
      "Cooling never stops, redundancy is verified permanently, and the time between a failure and an intervention is measured in minutes. Sovitech Control does not yet have a project of its own in this sector: it offers the infrastructure monitoring and automation part, working alongside the facility's specialist designer.",
    metrics: [
      { value: "90-320 EUR", label: "Per data point, the band common to all sectors" },
      { value: "PUE", label: "Total facility energy divided by computing equipment energy, over a declared period" },
      { value: "NIS2", label: "GEO 155/2024, in force for digital infrastructure operators" },
      { value: "0", label: "Own projects in this sector: the page describes transferable competence, not experience" },
    ],
    features: [
      {
        icon: Thermometer,
        title: "Cold aisle temperature",
        description:
          "Measured at the equipment intake, at three heights per rack, in the most loaded rows, with control on the worst value, not on a wall sensor at two metres.",
      },
      {
        icon: Shield,
        title: "Verified redundancy",
        description:
          "Standby equipment that has never started under real load is not redundancy but an assumption: rotation and changeover testing are functions of the system.",
      },
      {
        icon: Gauge,
        title: "Humidity, dew point, pressures",
        description:
          "Pressure in the raised floor or ceiling plenum, relative humidity and dew point, and liquid leak detection under the floor and near the cooling circuits.",
      },
      {
        icon: Zap,
        title: "Metering for PUE",
        description:
          "Consumption measured separately on computing circuits and infrastructure circuits, at 15-minute resolution with at least 24 months of retention, for year-on-year comparison.",
      },
      {
        icon: Server,
        title: "Equipment integration",
        description:
          "Precision cooling units, UPS systems, generators and power quality analysers, integrated via Modbus and BACnet without opening an unsecured access path.",
      },
      {
        icon: Clock,
        title: "Alarm escalation",
        description:
          "By severity and by time: an alarm not acknowledged within minutes reaches someone else, instead of staying on a single channel.",
      },
    ],
    capabilities: [
      "Dense environmental monitoring with alarming and history, as in the pharma projects",
      "Local controller operation without depending on supervision, as in hospital critical zones",
      "Automatic changeover to standby equipment and rotation for even wear",
      "PUE calculated over a declared period, from two quantities measured with dedicated meters",
      "NIS2 security: network segmentation, controlled remote access, logged interventions",
      "Work alongside the facility's specialist designer; redundancy design stays with them",
    ],
    testimonial: {
      quote:
        "Sovitech Control has not executed a data centre project to date. The transferable competences come from dense monitoring in the pharma projects, from the continuity of hospital critical zones and from zone metering in offices and retail.",
      name: "Sovitech Control",
      role: "Competence statement",
      company: "Data centres",
    },
    ro: {
      title: "Centre de date",
      subtitle: "Monitorizare și automatizare a infrastructurii",
      description:
        "Sarcina termică este constantă, concentrată și aproape integral internă: nu există sezon, ocupare sau regim de noapte. Sistemul de monitorizare trebuie să fie mai fiabil decât instalația pe care o supraveghează.",
      heroHeadline: "Centre de date:\nrăcire de precizie, redundanță verificată.",
      heroSubheadline:
        "Răcirea nu se oprește niciodată, redundanța se verifică permanent, iar timpul dintre o defecțiune și o intervenție se măsoară în minute. Sovitech Control nu are încă un proiect propriu în acest sector: ofertează partea de monitorizare și automatizare a infrastructurii, în echipă cu proiectantul de specialitate al facilității.",
      metricValues: ["90-320 EUR", "PUE", "NIS2", "0"],
      metricLabels: [
        "Pe punct de date, banda comună tuturor sectoarelor",
        "Energia totală a facilității raportată la energia echipamentelor de calcul, pe o perioadă declarată",
        "OUG 155/2024, în vigoare pentru operatorii de infrastructură digitală",
        "Proiecte proprii în sector: pagina descrie competență transferabilă, nu experiență",
      ],
      features: [
        { title: "Temperatura pe culoarul rece", description: "Măsurată pe aspirația echipamentelor, la trei înălțimi pe rack, în rândurile cele mai încărcate, cu reglaj pe cea mai defavorabilă valoare, nu pe un senzor de perete la doi metri." },
        { title: "Redundanță verificată", description: "Un echipament de rezervă care nu a pornit niciodată sub sarcină reală nu este redundanță, ci o presupunere: rotația și testarea comutării sunt funcții ale sistemului." },
        { title: "Umiditate, punct de rouă, presiuni", description: "Presiunea în podeaua tehnică sau în tavanul de distribuție, umiditatea relativă și punctul de rouă, plus detecția scurgerilor de lichid sub podea și lângă circuitele de răcire." },
        { title: "Contorizare pentru PUE", description: "Consum măsurat separat pe circuitele de calcul și pe cele de infrastructură, la rezoluție de 15 minute, cu retenție de minimum 24 de luni, pentru comparație an la an." },
        { title: "Integrarea echipamentelor", description: "Unități de răcire de precizie, surse neîntreruptibile, generatoare și analizoare de rețea, integrate prin Modbus și BACnet, fără a deschide o cale de acces nesecurizată." },
        { title: "Alarmare cu escaladare", description: "Pe severități și pe timp: o alarmă neconfirmată în câteva minute ajunge la altcineva, nu rămâne pe un singur canal." },
      ],
      capabilities: [
        "Monitorizare densă de parametri de mediu, cu alarmare și istoric, ca în proiectele farmaceutice",
        "Funcționare locală a controlerelor, fără dependență de supervizare, ca în zonele critice de spital",
        "Comutare automată pe echipamentul de rezervă și funcționare în rotație, pentru uzură uniformă",
        "Calculul PUE pe o perioadă declarată, din două mărimi măsurate cu contoare dedicate",
        "Securitate NIS2: segmentare de rețea, acces la distanță controlat, jurnalizarea intervențiilor",
        "Colaborare cu proiectantul de specialitate al facilității; proiectarea redundanței rămâne la acesta",
      ],
      testimonialQuote:
        "Sovitech Control nu a executat până acum un proiect de centru de date. Competențele transferabile vin din monitorizarea densă din proiectele farmaceutice, din continuitatea zonelor critice de spital și din contorizarea pe zone din birouri și retail.",
      testimonialRole: "Declarație de competență",
    },
    relatedSectors: ["medical", "industrial", "civil"],
    image: "/placeholder.svg?height=800&width=1200",
  },
  {
    id: "sport-si-wellness",
    slug: "sport-si-wellness",
    title: "Sport & Wellness",
    subtitle: "Pools, spas & sports halls",
    description:
      "The water surface evaporates continuously, and the amount of vapour depends on water temperature, air temperature, water movement and the number of users. It is the only building type where the humidity load outweighs the thermal load.",
    accentColor: "#1F6B4A",
    accentTextDark: false,
    heroHeadline: "Pool and wellness BMS:\nhumidity decides everything.",
    heroSubheadline:
      "In a building with pools, humidity decides comfort, consumption and the life of the structure. A wrong setting produces condensation inside the structure and damage that costs more, within a few years, than the entire automation system. The sector reference: Therme Nord Bucuresti.",
    metrics: [
      { value: "1,400", label: "Data points at Therme Nord Bucuresti" },
      { value: "6", label: "Air handling units served at Therme Nord Bucuresti" },
      { value: "4-18 EUR/sqm", label: "Cost reference: the aggregated band, used as a proxy; pool zones sit at the top of it" },
      { value: "290 kW", label: "Legal automation threshold, exceeded through air treatment and water heating alone" },
    ],
    features: [
      {
        icon: Droplets,
        title: "Control starts from humidity",
        description:
          "The pool hall is controlled on relative humidity, with air temperature kept slightly above water temperature to limit evaporation.",
      },
      {
        icon: Wind,
        title: "Dedicated air handling",
        description:
          "A controlled ratio of fresh to recirculated air, dehumidification and heat recovery from the exhaust air, the component with the largest effect on the complex's thermal consumption.",
      },
      {
        icon: Gauge,
        title: "Pressure balance",
        description:
          "The pool hall is kept in slight underpressure against the dry zones, so humid air does not migrate into changing rooms, corridors and the structure.",
      },
      {
        icon: Thermometer,
        title: "Zones with their own regimes",
        description:
          "Pools, saunas, relaxation areas, changing rooms, fitness and food zones, each with its own temperature and humidity.",
      },
      {
        icon: Shield,
        title: "Equipment for aggressive media",
        description:
          "Sensors, actuators and panels chosen for warm, humid air loaded with water-treatment products; standard equipment fails within a few seasons.",
      },
      {
        icon: BarChart3,
        title: "Thermal energy monitored",
        description:
          "The complex's dominant thermal consumption, the efficiency of the heat recovery units, and correlated data between water treatment and air treatment.",
      },
    ],
    capabilities: [
      "Relative humidity and temperature controlled in every pool hall",
      "Water temperature in every pool and operation of the water-treatment plant",
      "Differential pressures between zones, monitored to stop humid air migrating",
      "Operation and efficiency of the heat recovery units",
      "Ventilation in changing rooms and shower areas, fitness hall with variable load",
      "Phasing by plant, with redundancy secured: the pool hall is never left without ventilation",
    ],
    testimonial: {
      quote:
        "Automation and supervision at Therme Nord Bucuresti: 1,400 data points, 6 air handling units, zone-level humidity and temperature control, and commissioning without interrupting operation.",
      name: "Therme Nord București",
      role: "Delivered project",
      company: "Balotești, Ilfov",
    },
    ro: {
      title: "Sport & Wellness",
      subtitle: "Piscine, spa și săli de sport",
      description:
        "Suprafața de apă evaporă continuu, iar cantitatea de vapori depinde de temperatura apei, de temperatura aerului, de mișcarea apei și de numărul de utilizatori. Este singurul tip de clădire în care sarcina de umiditate depășește ca importanță sarcina termică.",
      heroHeadline: "BMS pentru piscine și wellness:\numiditatea decide totul.",
      heroSubheadline:
        "Într-o clădire cu bazine, umiditatea decide confortul, consumul și durata de viață a construcției. Un reglaj greșit produce condens în structură și degradări care costă, în câțiva ani, mai mult decât întregul sistem de automatizare. Referința sectorului: Therme Nord București.",
      metricValues: ["1.400", "6", "4-18 EUR/mp", "290 kW"],
      metricLabels: [
        "Puncte de date la Therme Nord București",
        "Centrale de tratare a aerului deservite la Therme Nord București",
        "Reper de cost: banda agregată, folosită ca proxy; zonele de bazin sunt în partea de sus",
        "Pragul legal de automatizare, depășit doar prin tratarea aerului și încălzirea apei",
      ],
      features: [
        { title: "Reglajul pornește de la umiditate", description: "Sala de bazin se reglează pe umiditate relativă, cu temperatura aerului menținută ușor peste temperatura apei, pentru a limita evaporarea." },
        { title: "Tratare a aerului dedicată", description: "Raport reglat între aerul proaspăt și cel recirculat, dezumidificare și recuperare de căldură din aerul evacuat, componenta cu cel mai mare efect asupra consumului termic al complexului." },
        { title: "Echilibru de presiuni", description: "Sala de bazin se ține în ușoară depresiune față de zonele uscate, ca aerul umed să nu migreze în vestiare, în holuri și în structură." },
        { title: "Zone cu regim propriu", description: "Bazine, saune, zone de relaxare, vestiare, fitness și alimentație, fiecare cu temperatura și umiditatea proprii." },
        { title: "Echipamente pentru mediu agresiv", description: "Senzori, servomotoare și tablouri alese pentru aer cald, umed și încărcat cu produse de tratare a apei; un echipament standard cedează în câteva sezoane." },
        { title: "Energie termică monitorizată", description: "Consumul termic dominant al complexului, eficiența recuperatoarelor de căldură și date corelate între tratarea apei și tratarea aerului." },
      ],
      capabilities: [
        "Umiditatea relativă și temperatura reglate în fiecare sală de bazin",
        "Temperatura apei din fiecare bazin și funcționarea instalațiilor de tratare a apei",
        "Presiuni diferențiale între zone, monitorizate pentru a opri migrarea aerului umed",
        "Funcționarea și eficiența recuperatoarelor de căldură",
        "Ventilația în vestiare și în zonele de duș, sala de fitness cu sarcină variabilă",
        "Fazare pe instalații, cu redundanță asigurată: sala de bazin nu rămâne fără ventilație",
      ],
      testimonialQuote:
        "Automatizare și supervizare la Therme Nord București: 1.400 de puncte de date, 6 centrale de tratare a aerului, control de umiditate și temperatură pe zone, punere în funcțiune fără întreruperea activității.",
      testimonialRole: "Proiect livrat",
    },
    relatedSectors: ["horeca", "medical", "retail"],
    image: "/referinte/therme-nord-bucuresti.jpg",
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
