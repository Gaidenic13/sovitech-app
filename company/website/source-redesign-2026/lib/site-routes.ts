// ─── Canonical route registry ────────────────────────────────────────────────
//
// Single source of truth for the site's information architecture. Every URL the
// editorial plan assumes is declared here BEFORE its content exists, so that:
//
//   1. Article bodies can link to a slug that is not published yet. `SiteLink`
//      renders a real <Link> for published entries and plain text for planned
//      ones, so a ported article never emits a dead link. (Article A09 alone
//      points at 7 not-yet-written pages.)
//   2. Routes are generated only for published entries — a planned slug 404s
//      deliberately rather than serving an empty page.
//   3. The sitemap, the hub pages and the redirect map all read from one list.
//
// `draft: "drive"` marks the ten finished articles sitting in the Google Drive
// folder, ready to be ported. Flip `status` to "published" in the same commit
// that adds the content — nothing else needs touching.

export type RouteStatus =
  | "published" // route exists and is linkable
  | "planned"   // declared, not built; links degrade to plain text
  | "alias"     // redirects to `aliasOf` (see next.config redirects)

export type Section =
  | "ghid"        // pillar guides
  | "resurse"     // cluster articles
  | "instrumente" // tools and lead magnets
  | "pentru"      // role / persona hubs
  | "expertiza"   // sector pages
  | "servicii"    // service pages

/** Content categories from the editorial calendar. */
export type Category = "C1" | "C2" | "C3" | "C4" | "C5" | "C6"

export const categories: Record<Category, { ro: string; en: string }> = {
  C1: { ro: "Reglementări & Conformare", en: "Regulation & Compliance" },
  C2: { ro: "ESG, Energie & Raportare", en: "ESG, Energy & Reporting" },
  C3: { ro: "Performanța Clădirii", en: "Building Performance" },
  C4: { ro: "BMS, SCADA & Integrare", en: "BMS, SCADA & Integration" },
  C5: { ro: "Ghiduri pe Sectoare", en: "Sector Guides" },
  C6: { ro: "Modernizare & Retrofit", en: "Modernisation & Retrofit" },
}

/** Personas from the editorial calendar. Order matches P1…P8. */
export type Persona = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8"

export interface RouteEntry {
  section: Section
  slug: string
  status: RouteStatus
  titleRo: string
  titleEn: string
  descRo: string
  descEn: string
  /** Editorial calendar id, e.g. "A01". Absent for tools, roles, sectors. */
  articleId?: string
  category?: Category
  personas?: Persona[]
  /** Slug of the pillar this cluster reports to (within its own section). */
  pillar?: string
  /** Section of the pillar, when it differs from this entry's section. */
  pillarSection?: Section
  /** A finished draft exists in the Drive editorial folder. */
  draft?: "drive"
  /** For status "alias": the slug this redirects to. */
  aliasOf?: string
  /** For entries whose content lives at a legacy path (redirect target). */
  livesAt?: string
  /** Category archive page rather than an article (renders a listing). */
  archive?: true
}

// ─── Pillars: /ghid/ ─────────────────────────────────────────────────────────

const ghid: RouteEntry[] = [
  {
    section: "ghid", slug: "sisteme-bms-cladiri", status: "published",
    articleId: "A01", category: "C4", personas: ["P1", "P3", "P4"], draft: "drive",
    titleRo: "Sistem BMS pentru clădiri: ghidul complet",
    titleEn: "BMS systems for buildings: the complete guide",
    descRo: "Componente, arhitectură pe trei niveluri, protocoale, obligația legală și etapele unui proiect executat corect.",
    descEn: "Components, three-tier architecture, protocols, the legal obligation and the stages of a properly executed project.",
  },
  {
    section: "ghid", slug: "caiet-de-sarcini-bms", status: "published",
    articleId: "A05", category: "C6", personas: ["P4", "P8"], draft: "drive",
    titleRo: "Caiet de sarcini pentru un sistem BMS",
    titleEn: "Technical specification for a BMS system",
    descRo: "Structura pe 15 secțiuni, lista de puncte, secvențele de funcționare și checklistul de dinaintea licitației.",
    descEn: "The 15-section structure, the I/O point list, operating sequences and the pre-tender checklist.",
  },
  {
    section: "ghid", slug: "date-esg-cladiri", status: "published",
    articleId: "A09", category: "C2", personas: ["P5", "P2"], draft: "drive",
    titleRo: "De unde vin datele pentru raportarea ESG a unei clădiri",
    titleEn: "Where a building's ESG reporting data comes from",
    descRo: "Cele șase verigi ale lanțului de date, cum se rupe fiecare și ce poate produce infrastructura tehnică.",
    descEn: "The six links in the data chain, how each one breaks, and what the technical infrastructure can actually produce.",
  },
  {
    section: "ghid", slug: "protocoale-automatizarea-cladirilor", status: "planned",
    articleId: "A11", category: "C4", personas: ["P4", "P8", "P7"],
    titleRo: "BACnet, Modbus, KNX, M-Bus și LON: cum alegi protocolul potrivit",
    titleEn: "BACnet, Modbus, KNX, M-Bus and LON: choosing the right protocol",
    descRo: "Ce protocol se folosește unde, ce înseamnă interoperabilitatea reală și cum se evită blocarea la un furnizor.",
    descEn: "Which protocol goes where, what real interoperability means, and how to avoid vendor lock-in.",
  },
  {
    section: "ghid", slug: "modernizare-bms", status: "planned",
    articleId: "A17", category: "C6", personas: ["P3", "P4", "P1"],
    titleRo: "Modernizarea unui sistem BMS: de la audit la plan de investiții",
    titleEn: "Modernising a BMS: from audit to a phased investment plan",
    descRo: "Ce se păstrează, ce se înlocuiește, cum se etapizează investiția și când retrofitul nu se justifică.",
    descEn: "What to keep, what to replace, how to phase the investment, and when a retrofit stops making sense.",
  },
  {
    section: "ghid", slug: "conformare-cladiri-romania", status: "planned",
    articleId: "A33", category: "C1", personas: ["P1", "P5", "P2"],
    titleRo: "Harta conformării pentru clădiri în România",
    titleEn: "The compliance map for buildings in Romania",
    descRo: "EPBD, Legea 372/2005, EED și NIS2, pe o singură pagină, cu ce este lege română și ce este obligație UE.",
    descEn: "EPBD, Law 372/2005, EED and NIS2 on one page, separating Romanian law in force from EU obligations.",
  },
]

// ─── Clusters: /resurse/ ─────────────────────────────────────────────────────
//
// Slugs for A02, A03, A04, A06, A07, A08 and A10 are fixed by the finished
// drafts. The rest are derived from each article's primary keyword and may be
// adjusted when the article is written — nothing links to them yet.

const resurse: RouteEntry[] = [
  {
    section: "resurse", slug: "obligatie-bacs-legea-372-2005", status: "published",
    articleId: "A02", category: "C1", personas: ["P1", "P4"], draft: "drive",
    pillar: "conformare-cladiri-romania", pillarSection: "ghid",
    titleRo: "Obligația BACS: Legea 372/2005 și pragul de 290 kW",
    titleEn: "The BACS obligation: Law 372/2005 and the 290 kW threshold",
    descRo: "Pragul, cine intră sub obligație, capabilitățile cerute, sancțiunile și ce se documentează la nefezabilitate.",
    descEn: "The threshold, who it covers, the required capabilities, the penalties, and what to document when it is not feasible.",
  },
  {
    section: "resurse", slug: "scada-vs-bms", status: "published",
    articleId: "A03", category: "C4", personas: ["P4", "P6", "P7"], draft: "drive",
    pillar: "sisteme-bms-cladiri", pillarSection: "ghid",
    titleRo: "SCADA vs BMS: diferențe și când se folosește fiecare",
    titleEn: "SCADA vs BMS: the differences and when to use each",
    descRo: "Tabel comparativ pe 14 criterii, arbore de decizie și modul de legare a celor două într-o facilitate mixtă.",
    descEn: "A 14-criterion comparison, a decision tree, and how to bridge the two in a mixed facility.",
  },
  {
    section: "resurse", slug: "cost-sistem-bms", status: "published",
    articleId: "A04", category: "C4", personas: ["P1", "P2"], draft: "drive",
    pillar: "sisteme-bms-cladiri", pillarSection: "ghid",
    titleRo: "Cât costă un sistem BMS în România",
    titleEn: "What a BMS system costs in Romania",
    descRo: "Intervale pe punct de date, pe mp și ca procent din instalații, trei exemple lucrate și cum compari două oferte.",
    descEn: "Ranges per data point, per sqm and as a share of plant value, three worked examples, and how to compare two bids.",
  },
  {
    section: "resurse", slug: "epbd-2024-romania", status: "published",
    articleId: "A06", category: "C1", personas: ["P1", "P5"], draft: "drive",
    pillar: "conformare-cladiri-romania", pillarSection: "ghid",
    titleRo: "EPBD 2024: ce se schimbă pentru clădirile nerezidențiale din România",
    titleEn: "EPBD 2024: what changes for non-residential buildings in Romania",
    descRo: "Pragul de 70 kW, ZEB, MEPS și calitatea mediului interior, cu ce este deja lege și ce încă nu este.",
    descEn: "The 70 kW threshold, ZEB, MEPS and indoor environmental quality, separating enacted law from pending obligations.",
  },
  {
    section: "resurse", slug: "ce-este-un-sistem-bms", status: "published",
    articleId: "A07", category: "C4", personas: ["P1", "P3"], draft: "drive",
    pillar: "sisteme-bms-cladiri", pillarSection: "ghid",
    titleRo: "Ce este un sistem BMS și cu ce nu trebuie confundat",
    titleEn: "What a BMS system is, and what it is not",
    descRo: "Definiția, cele trei sensuri ale acronimului, funcțiile, componentele și pragul de obligativitate.",
    descEn: "The definition, the three meanings of the acronym, the functions, the components and the compliance threshold.",
  },
  {
    section: "resurse", slug: "kpi-performanta-cladire", status: "published",
    articleId: "A08", category: "C3", personas: ["P2", "P3", "P5"], draft: "drive",
    pillar: "sisteme-bms-cladiri", pillarSection: "ghid",
    titleRo: "10 indicatori (KPI) pentru orice clădire comercială",
    titleEn: "10 KPIs every commercial building should track",
    descRo: "Pentru fiecare indicator: ce măsoară, formula, sursa datelor din BMS și ce se face la abatere.",
    descEn: "For each indicator: what it measures, the formula, the BMS data source, and what to do when it drifts.",
  },
  {
    section: "resurse", slug: "monitorizare-calitate-aer-epbd", status: "published",
    articleId: "A10", category: "C1", personas: ["P1", "P3"], draft: "drive",
    pillar: "conformare-cladiri-romania", pillarSection: "ghid",
    titleRo: "Monitorizarea calității aerului interior: ce prevede EPBD",
    titleEn: "Indoor air quality monitoring: what EPBD requires",
    descRo: "Ce cere art. 13 din EPBD, ce se măsoară, de la ce dată și ce este în vigoare în România.",
    descEn: "What EPBD article 13 requires, what gets measured, from when, and what is actually in force in Romania.",
  },

  // Months 4-12. Slugs provisional until each article is written.
  { section: "resurse", slug: "audit-sistem-bms-existent", status: "planned", articleId: "A12", category: "C6", personas: ["P3", "P4"], pillar: "modernizare-bms", pillarSection: "ghid", titleRo: "Cum auditezi un sistem BMS existent înainte de modernizare", titleEn: "How to audit an existing BMS before modernisation", descRo: "Ce se verifică, în ce ordine și ce documente rezultă.", descEn: "What to check, in what order, and what documents come out of it." },
  { section: "resurse", slug: "nis2-ot-scada-bms", status: "planned", articleId: "A13", category: "C1", personas: ["P7", "P6"], pillar: "conformare-cladiri-romania", pillarSection: "ghid", titleRo: "NIS2 și sistemele OT: ce înseamnă OUG 155/2024 pentru SCADA și BMS", titleEn: "NIS2 and OT systems: what GEO 155/2024 means for SCADA and BMS", descRo: "Perimetrul, obligațiile și ce rămâne interpretare.", descEn: "The perimeter, the obligations, and what remains interpretation." },
  { section: "resurse", slug: "submetering-cladiri-multi-tenant", status: "planned", articleId: "A14", category: "C2", personas: ["P2", "P1"], pillar: "date-esg-cladiri", pillarSection: "ghid", titleRo: "Submetering în clădiri multi-tenant", titleEn: "Submetering in multi-tenant buildings", descRo: "Ce măsori și cum recuperezi corect costurile de la chiriași.", descEn: "What to measure and how to recharge tenants correctly." },
  { section: "resurse", slug: "consum-energie-cladire-birouri", status: "planned", articleId: "A15", category: "C3", personas: ["P3", "P2"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "De ce consumă clădirea ta mai multă energie decât ar trebui", titleEn: "Why your building uses more energy than it should", descRo: "Șapte cauze frecvente și cum se identifică fiecare.", descEn: "Seven common causes and how to identify each one." },
  { section: "resurse", slug: "automatizare-hotel", status: "planned", articleId: "A16", category: "C5", personas: ["P3", "P1"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "Automatizarea hotelurilor", titleEn: "Hotel automation", descRo: "Cum reduci consumul fără să afectezi confortul oaspeților.", descEn: "Cutting consumption without touching guest comfort." },
  { section: "resurse", slug: "audit-energetic-obligatoriu", status: "planned", articleId: "A18", category: "C1", personas: ["P5", "P6"], pillar: "conformare-cladiri-romania", pillarSection: "ghid", titleRo: "Audit energetic obligatoriu: Legea 121/2014 și pragul de 1.000 tep", titleEn: "Mandatory energy audits: Law 121/2014 and the 1,000 toe threshold", descRo: "Cine intră sub obligație și ce aduce noua directivă EED.", descEn: "Who it covers and what the new EED directive brings." },
  { section: "resurse", slug: "incalzire-si-racire-simultana", status: "planned", articleId: "A19", category: "C3", personas: ["P3", "P4"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "Încălzire și răcire simultană: cum o detectezi și cât te costă", titleEn: "Simultaneous heating and cooling: detecting it and what it costs", descRo: "Risipa invizibilă pe factură și cum se citește din trend-loguri.", descEn: "The waste your bill never shows, and how to read it from trend logs." },
  { section: "resurse", slug: "monitorizare-parametri-pharma", status: "planned", articleId: "A20", category: "C5", personas: ["P6"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "Monitorizarea parametrilor critici în pharma", titleEn: "Monitoring critical parameters in pharma", descRo: "Sistem EMS validat față de dataloggere.", descEn: "A validated EMS versus dataloggers." },
  { section: "resurse", slug: "semne-bms-final-de-viata", status: "planned", articleId: "A21", category: "C6", personas: ["P3", "P2"], pillar: "modernizare-bms", pillarSection: "ghid", titleRo: "7 semne că sistemul tău BMS a ajuns la finalul duratei de viață", titleEn: "7 signs your BMS has reached end of life", descRo: "Ce indică o înlocuire și ce indică doar o reconfigurare.", descEn: "What points to replacement and what only needs reconfiguring." },
  { section: "resurse", slug: "benchmark-kwh-mp-birouri-romania", status: "planned", articleId: "A22", category: "C3", personas: ["P1", "P2", "P5"], pillar: "date-esg-cladiri", pillarSection: "ghid", titleRo: "Cât consumă o clădire de birouri din România: benchmark kWh/mp/an", titleEn: "How much a Romanian office building uses: kWh/sqm/yr benchmark", descRo: "Benchmark propriu, pe portofoliu anonimizat.", descEn: "Our own benchmark, from an anonymised portfolio." },
  { section: "resurse", slug: "caiet-de-sarcini-scada", status: "planned", articleId: "A23", category: "C4", personas: ["P4", "P6", "P8"], pillar: "caiet-de-sarcini-bms", pillarSection: "ghid", titleRo: "Cum se scrie un caiet de sarcini pentru un sistem SCADA industrial", titleEn: "Writing a technical specification for an industrial SCADA system", descRo: "Varianta industrială a caietului de sarcini BMS.", descEn: "The industrial counterpart to the BMS specification." },
  { section: "resurse", slug: "night-setback-programe-orare", status: "planned", articleId: "A24", category: "C3", personas: ["P3"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "Night setback și programele orare", titleEn: "Night setback and time schedules", descRo: "Cât economisești și în ce spații nu se aplică.", descEn: "How much you save, and where it must not be applied." },
  { section: "resurse", slug: "csrd-omnibus-cine-raporteaza", status: "planned", articleId: "A25", category: "C2", personas: ["P5", "P1"], pillar: "date-esg-cladiri", pillarSection: "ghid", titleRo: "CSRD după pachetul Omnibus: cine mai raportează și din ce an", titleEn: "CSRD after the Omnibus package: who still reports, and from when", descRo: "Pragurile noi și calendarul de raportare.", descEn: "The new thresholds and the reporting calendar." },
  { section: "resurse", slug: "scope-1-2-3-date-cladire", status: "planned", articleId: "A26", category: "C2", personas: ["P5", "P3"], pillar: "date-esg-cladiri", pillarSection: "ghid", titleRo: "Scope 1, 2 și 3 pentru o clădire", titleEn: "Scope 1, 2 and 3 for a building", descRo: "Ce date trebuie să furnizeze echipa tehnică.", descEn: "What data the technical team has to supply." },
  { section: "resurse", slug: "arhitectura-bms-campus", status: "planned", articleId: "A27", category: "C4", personas: ["P4", "P1"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "Arhitectura BMS pentru un campus cu mai multe clădiri", titleEn: "BMS architecture for a multi-building campus", descRo: "Cum se structurează supervizarea pe un portofoliu.", descEn: "How to structure supervision across a portfolio." },
  { section: "resurse", slug: "management-energetic-retail", status: "planned", articleId: "A28", category: "C5", personas: ["P2", "P5"], pillar: "date-esg-cladiri", pillarSection: "ghid", titleRo: "Management energetic pentru rețele de magazine", titleEn: "Energy management for retail chains", descRo: "Monitorizare multi-site și comparabilitate între locații.", descEn: "Multi-site monitoring and comparability between locations." },
  { section: "resurse", slug: "vendor-lock-in-automatizarea-cladirilor", status: "planned", articleId: "A29", category: "C4", personas: ["P1", "P4"], pillar: "protocoale-automatizarea-cladirilor", pillarSection: "ghid", titleRo: "Vendor lock-in în automatizarea clădirilor", titleEn: "Vendor lock-in in building automation", descRo: "Sisteme deschise față de sisteme proprietare.", descEn: "Open systems versus proprietary ones." },
  { section: "resurse", slug: "trend-log-bms-risipa-energie", status: "planned", articleId: "A30", category: "C3", personas: ["P3", "P4"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "Cum găsești risipa de energie în trend-logurile din BMS", titleEn: "Finding energy waste in your BMS trend logs", descRo: "Ce se caută în datele pe care le ai deja.", descEn: "What to look for in the data you already have." },
  { section: "resurse", slug: "automatizare-punct-termic", status: "planned", articleId: "A31", category: "C6", personas: ["P4", "P3"], pillar: "modernizare-bms", pillarSection: "ghid", titleRo: "Automatizarea și telegestiunea punctelor termice", titleEn: "Automation and remote management of heating substations", descRo: "Control local și supervizare de la distanță.", descEn: "Local control and remote supervision." },
  { section: "resurse", slug: "eficienta-energetica-depozit-logistic", status: "planned", articleId: "A32", category: "C5", personas: ["P3", "P6"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "Depozite și hale logistice", titleEn: "Warehouses and logistics halls", descRo: "Control HVAC, iluminat și stratificare termică.", descEn: "HVAC control, lighting and thermal stratification." },
  { section: "resurse", slug: "istoricizare-date-bms-cat-timp", status: "planned", articleId: "A34", category: "C4", personas: ["P4", "P7", "P5"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "Ce date trebuie să păstreze o clădire și cât timp", titleEn: "What data a building must keep, and for how long", descRo: "Istoricizare, rezoluție, retenție și audit trail.", descEn: "Historisation, resolution, retention and audit trail." },
  { section: "resurse", slug: "alarme-bms", status: "planned", articleId: "A35", category: "C4", personas: ["P3", "P4"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "Alarme în BMS și SCADA: cum le prioritizezi", titleEn: "Alarms in BMS and SCADA: how to prioritise them", descRo: "De la 400 de alarme pe zi la o listă care se citește.", descEn: "From 400 alarms a day to a list someone actually reads." },
  { section: "resurse", slug: "modernizare-bms-fara-oprire", status: "planned", articleId: "A36", category: "C6", personas: ["P2", "P3"], pillar: "modernizare-bms", pillarSection: "ghid", titleRo: "Cum modernizezi automatizarea fără să oprești activitatea", titleEn: "Modernising automation without stopping operations", descRo: "Migrare pe etape, într-o clădire în exploatare.", descEn: "Phased migration in an occupied building." },
  { section: "resurse", slug: "bms-date-credibile-esg", status: "planned", articleId: "A37", category: "C2", personas: ["P5", "P2"], pillar: "date-esg-cladiri", pillarSection: "ghid", titleRo: "Poate sistemul tău BMS actual să furnizeze date credibile pentru ESG?", titleEn: "Can your current BMS produce credible ESG data?", descRo: "Evaluarea calității datelor, verigă cu verigă.", descEn: "Assessing data quality, link by link." },
  { section: "resurse", slug: "gmp-annex-1-monitorizare", status: "planned", articleId: "A38", category: "C5", personas: ["P6"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "GMP Annex 1 și monitorizarea continuă a zonelor clasificate", titleEn: "GMP Annex 1 and continuous monitoring of classified areas", descRo: "Cerințe de monitorizare pentru spații clasificate.", descEn: "Monitoring requirements for classified cleanroom areas." },
  { section: "resurse", slug: "checklist-bms-facility-manager", status: "planned", articleId: "A39", category: "C3", personas: ["P3"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "Checklist lunar de performanță BMS pentru facility manager", titleEn: "Monthly BMS performance checklist for facility managers", descRo: "Ce se verifică în fiecare lună și în ce ordine.", descEn: "What to check every month, and in what order." },
  { section: "resurse", slug: "integrare-echipamente-vechi-bms", status: "planned", articleId: "A40", category: "C6", personas: ["P4", "P8"], pillar: "protocoale-automatizarea-cladirilor", pillarSection: "ghid", titleRo: "Integrarea BMS cu echipamente vechi", titleEn: "Integrating a BMS with legacy equipment", descRo: "Gateway-uri, convertoare și limitele lor reale.", descEn: "Gateways, converters and their real limits." },
  { section: "resurse", slug: "plan-modernizare-bms-3-ani", status: "planned", articleId: "A41", category: "C6", personas: ["P1", "P2"], pillar: "modernizare-bms", pillarSection: "ghid", titleRo: "Cum construiești un plan de modernizare BMS pe 3 ani", titleEn: "Building a three-year BMS modernisation plan", descRo: "CapEx și fazare pe un portofoliu de clădiri.", descEn: "CapEx and phasing across a building portfolio." },
  { section: "resurse", slug: "documentatie-retrofit-bms", status: "planned", articleId: "A42", category: "C6", personas: ["P4", "P8"], pillar: "caiet-de-sarcini-bms", pillarSection: "ghid", titleRo: "Ce documentație trebuie să existe înainte de un proiect de retrofit", titleEn: "The documentation you need before a retrofit project", descRo: "Lista de documente și ce se face când lipsesc.", descEn: "The document list, and what to do when it is incomplete." },
  { section: "resurse", slug: "securitate-ot-cladiri", status: "planned", articleId: "A43", category: "C4", personas: ["P7", "P4"], pillar: "conformare-cladiri-romania", pillarSection: "ghid", titleRo: "Securitatea OT pentru clădiri conectate", titleEn: "OT security for connected buildings", descRo: "Segmentare, acces la distanță și IEC 62443.", descEn: "Segmentation, remote access and IEC 62443." },
  { section: "resurse", slug: "confort-chiriasi-eficienta-energetica", status: "planned", articleId: "A44", category: "C5", personas: ["P2", "P3"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "Confortul chiriașilor față de eficiența energetică", titleEn: "Tenant comfort versus energy efficiency", descRo: "Cum se împacă cele două fără reclamații.", descEn: "Reconciling the two without generating complaints." },
  { section: "resurse", slug: "finantare-eficienta-energetica-cladiri", status: "planned", articleId: "A45", category: "C2", personas: ["P1", "P5"], pillar: "conformare-cladiri-romania", pillarSection: "ghid", titleRo: "Finanțare pentru eficiență energetică în clădiri", titleEn: "Funding for energy efficiency in buildings", descRo: "Ce surse sunt disponibile și pentru cine.", descEn: "What funding exists, and who qualifies." },
  { section: "resurse", slug: "meps-cladiri-nerezidentiale", status: "planned", articleId: "A46", category: "C1", personas: ["P1", "P2"], pillar: "conformare-cladiri-romania", pillarSection: "ghid", titleRo: "MEPS: renovarea celor mai slabe 16% clădiri nerezidențiale", titleEn: "MEPS: renovating the worst-performing 16% of non-residential stock", descRo: "Mecanismul relativ și riscul de activ blocat.", descEn: "The relative mechanism and the stranded-asset risk." },
  { section: "resurse", slug: "automatizare-spital", status: "planned", articleId: "A47", category: "C5", personas: ["P4", "P6"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "Spitale și clădiri medicale", titleEn: "Hospitals and healthcare buildings", descRo: "Automatizare pentru continuitate și conformare.", descEn: "Automation for continuity and compliance." },
  { section: "resurse", slug: "management-energetic-cladire", status: "planned", articleId: "A48", category: "C3", personas: ["P1", "P3", "P5"], pillar: "sisteme-bms-cladiri", pillarSection: "ghid", titleRo: "De la monitorizare la management", titleEn: "From monitoring to management", descRo: "Ce diferențiază o clădire care chiar economisește.", descEn: "What separates a building that actually saves from one that only measures." },
]


// ─── Category archives: /resurse/<categorie>/ ───────────────────────────────
// The six landing pages doc 15 uses as link-degradation targets. Each lists the
// published articles of its category, so they are useful from day one.

const archivesResurse: RouteEntry[] = [
  { section: "resurse", slug: "reglementari-conformare", status: "published", archive: true, category: "C1", titleRo: "Reglementări & Conformare", titleEn: "Regulation & Compliance", descRo: "Ce trebuie să respecte clădirile și sistemele tehnice: EPBD, Legea 372/2005, EED, NIS2.", descEn: "What buildings and their technical systems must comply with: EPBD, Law 372/2005, EED, NIS2." },
  { section: "resurse", slug: "esg-energie-raportare", status: "published", archive: true, category: "C2", titleRo: "ESG, Energie & Raportare", titleEn: "ESG, Energy & Reporting", descRo: "Cum transformi datele din clădire în performanță măsurabilă și raportabilă.", descEn: "Turning building data into measurable, reportable performance." },
  { section: "resurse", slug: "performanta-cladirii", status: "published", archive: true, category: "C3", titleRo: "Performanța Clădirii", titleEn: "Building Performance", descRo: "Mai puțină risipă, mai mult confort, costuri de operare mai mici.", descEn: "Less waste, more comfort, lower running costs." },
  { section: "resurse", slug: "bms-scada-integrare", status: "published", archive: true, category: "C4", titleRo: "BMS, SCADA & Integrare", titleEn: "BMS, SCADA & Integration", descRo: "Arhitectura și sistemele din spatele operării inteligente a clădirilor.", descEn: "The architecture and systems behind intelligent building operation." },
  { section: "resurse", slug: "ghiduri-pe-sectoare", status: "published", archive: true, category: "C5", titleRo: "Ghiduri pe Sectoare", titleEn: "Sector Guides", descRo: "Soluții tehnice pentru birouri, hoteluri, industrie, retail, pharma și medical.", descEn: "Technical solutions for offices, hotels, industry, retail, pharma and healthcare." },
  { section: "resurse", slug: "modernizare-retrofit", status: "published", archive: true, category: "C6", titleRo: "Modernizare & Retrofit", titleEn: "Modernisation & Retrofit", descRo: "Cum modernizezi o clădire existentă fără să o iei de la zero.", descEn: "Upgrading an existing building without starting over." },
]

// ─── Tools: /instrumente/ ────────────────────────────────────────────────────

const instrumente: RouteEntry[] = [
  {
    section: "instrumente", slug: "model-caiet-de-sarcini-bms", status: "planned",
    personas: ["P4", "P8"],
    titleRo: "Model de caiet de sarcini BMS (DOCX)",
    titleEn: "BMS technical specification template (DOCX)",
    descRo: "Cele 15 secțiuni cu text comentat, tabelul listei de puncte și checklistul de 20 de puncte.",
    descEn: "All 15 sections with commentary, the I/O point table and the 20-point pre-tender checklist.",
  },
  {
    section: "instrumente", slug: "checklist-audit-bms", status: "planned",
    personas: ["P3", "P4"],
    titleRo: "Checklist de audit pentru un BMS existent (PDF)",
    titleEn: "Audit checklist for an existing BMS (PDF)",
    descRo: "8 secțiuni și peste 60 de puncte de verificare pe un sistem în funcțiune.",
    descEn: "8 sections and 60+ verification points for a system already in operation.",
  },
  {
    section: "instrumente", slug: "calculator-economie-energie-bms", status: "alias",
    aliasOf: "/calculator-roi", livesAt: "/calculator-roi", personas: ["P1", "P2"],
    titleRo: "Calculator: economia estimată dintr-un BMS",
    titleEn: "Calculator: estimated savings from a BMS",
    descRo: "Interval de economie și amortizare, pornind de la suprafață, tip de clădire și consum anual.",
    descEn: "Savings range and payback, from floor area, building type and annual consumption.",
  },
  {
    section: "instrumente", slug: "test-obligatie-bacs", status: "planned",
    personas: ["P1", "P4"],
    titleRo: "Test: clădirea ta intră sub obligația BACS?",
    titleEn: "Test: does your building fall under the BACS obligation?",
    descRo: "Cinci întrebări: tip de clădire, putere instalată, an, renovare majoră, automatizare existentă.",
    descEn: "Five questions: building type, installed power, year, major renovation, existing automation.",
  },
  {
    section: "instrumente", slug: "benchmark-kwh-mp", status: "planned",
    personas: ["P1", "P2", "P5"],
    titleRo: "Benchmark kWh/mp pentru clădiri de birouri din România",
    titleEn: "kWh/sqm benchmark for Romanian office buildings",
    descRo: "Poziționarea clădirii tale față de un portofoliu anonimizat, actualizat anual.",
    descEn: "Where your building sits against an anonymised portfolio, updated yearly.",
  },
  {
    section: "instrumente", slug: "model-caiet-de-sarcini-scada", status: "planned",
    personas: ["P4", "P6", "P8"],
    titleRo: "Model de caiet de sarcini SCADA (DOCX)",
    titleEn: "SCADA technical specification template (DOCX)",
    descRo: "Varianta industrială a modelului de caiet de sarcini.",
    descEn: "The industrial counterpart to the BMS specification template.",
  },
  {
    section: "instrumente", slug: "template-raport-lunar-cladire", status: "planned",
    personas: ["P2", "P3"],
    titleRo: "Template de raport lunar de performanță (XLSX)",
    titleEn: "Monthly building performance report template (XLSX)",
    descRo: "Cei 10 KPI, gata de completat, cu formule și foaie de completitudine a datelor.",
    descEn: "The 10 KPIs ready to fill in, with formulas and a data-completeness sheet.",
  },
  {
    section: "instrumente", slug: "dictionar", status: "planned",
    titleRo: "Dicționar BMS și SCADA",
    titleEn: "BMS and SCADA glossary",
    descRo: "Peste 25 de termeni, fiecare cu pagină proprie și schema DefinedTerm.",
    descEn: "25+ terms, each with its own page and DefinedTerm schema.",
  },
]

// ─── Roles: /pentru/ ─────────────────────────────────────────────────────────

export const personaMeta: Record<Persona, { slug: string; roleRo: string; roleEn: string; questionRo: string; questionEn: string }> = {
  P1: { slug: "proprietari-si-investitori", roleRo: "Proprietar / Dezvoltator / Investitor", roleEn: "Owner / Developer / Investor", questionRo: "Ce îmi afectează valoarea activului și ce amenzi risc?", questionEn: "What affects my asset value, and what penalties am I exposed to?" },
  P2: { slug: "property-asset-manager", roleRo: "Property & Asset Manager", roleEn: "Property & Asset Manager", questionRo: "Ce măsor și ce raportez lunar?", questionEn: "What do I measure, and what do I report each month?" },
  P3: { slug: "facility-manager", roleRo: "Facility Manager", roleEn: "Facility Manager", questionRo: "Cum operez mai bine clădirea cu ce am deja?", questionEn: "How do I run the building better with what I already have?" },
  P4: { slug: "director-tehnic", roleRo: "Director tehnic / Inginer-șef", roleEn: "Technical Director / Chief Engineer", questionRo: "Ce arhitectură și ce sisteme îmi trebuie?", questionEn: "What architecture and which systems do I need?" },
  P5: { slug: "esg-sustenabilitate", roleRo: "Manager ESG / Sustenabilitate", roleEn: "ESG / Sustainability Manager", questionRo: "De unde vin datele din raportul meu?", questionEn: "Where does the data in my report come from?" },
  P6: { slug: "manager-industrial-pharma", roleRo: "Manager industrial / Pharma", roleEn: "Industrial / Pharma Manager", questionRo: "Cum îmi cresc fiabilitatea și conformarea?", questionEn: "How do I improve reliability and compliance?" },
  P7: { slug: "it-ot", roleRo: "IT / OT Manager", roleEn: "IT / OT Manager", questionRo: "Cum integrez și securizez sistemele conectate?", questionEn: "How do I integrate and secure the connected systems?" },
  P8: { slug: "proiectanti-antreprenori", roleRo: "Proiectant MEP / Antreprenor general", roleEn: "MEP Designer / General Contractor", questionRo: "Ce trebuie să specific și să predau?", questionEn: "What do I have to specify and hand over?" },
}

const pentru: RouteEntry[] = (Object.entries(personaMeta) as [Persona, (typeof personaMeta)[Persona]][]).map(
  ([id, m]) => ({
    section: "pentru" as Section,
    slug: m.slug,
    status: "published" as RouteStatus,
    personas: [id],
    titleRo: m.roleRo,
    titleEn: m.roleEn,
    descRo: m.questionRo,
    descEn: m.questionEn,
  }),
)

// ─── Sectors: /expertiza/ ────────────────────────────────────────────────────
//
// `livesAt` records the sector-data slug that supplies the content, because the
// public URL and the data key diverge (civil → cladiri-de-birouri).

const expertiza: RouteEntry[] = [
  { section: "expertiza", slug: "cladiri-de-birouri", status: "published", livesAt: "civil", personas: ["P1", "P2", "P3"], titleRo: "Clădiri de birouri", titleEn: "Office buildings", descRo: "Confort, cost de operare și contorizare pe chiriaș.", descEn: "Comfort, running cost and tenant submetering." },
  { section: "expertiza", slug: "horeca", status: "published", livesAt: "horeca", personas: ["P3", "P1"], titleRo: "HORECA", titleEn: "HORECA", descRo: "Funcționare 24/7, sarcină variabilă și apă caldă critică.", descEn: "24/7 operation, variable load and critical hot water." },
  { section: "expertiza", slug: "retail", status: "published", livesAt: "retail", personas: ["P2", "P5"], titleRo: "Retail", titleEn: "Retail", descRo: "Multe unități, contorizare separată și iluminat cu pondere mare.", descEn: "Many units, separate metering and a large lighting share." },
  { section: "expertiza", slug: "industrial", status: "published", livesAt: "industrial", personas: ["P6", "P3"], titleRo: "Industrial & Logistică", titleEn: "Industrial & Logistics", descRo: "Granița dintre clădire și proces, definită explicit.", descEn: "The boundary between building and process, explicitly defined." },
  { section: "expertiza", slug: "medical", status: "published", livesAt: "medical", personas: ["P4", "P6"], titleRo: "Medical", titleEn: "Healthcare", descRo: "Redundanță, presiuni diferențiale și execuție etapizată.", descEn: "Redundancy, differential pressures and phased execution." },
  { section: "expertiza", slug: "educational", status: "published", livesAt: "educational", personas: ["P3", "P1"], titleRo: "Educație & Instituții", titleEn: "Education & Institutions", descRo: "Programare după orar și management de campus.", descEn: "Timetable-driven scheduling and campus management." },
  { section: "expertiza", slug: "pharma", status: "published", livesAt: "pharma", personas: ["P6"], titleRo: "Pharma", titleEn: "Pharma", descRo: "Zone clasificate, trasabilitate și calificare.", descEn: "Classified areas, traceability and qualification." },
  { section: "expertiza", slug: "sport-si-wellness", status: "published", livesAt: "sport-si-wellness", personas: ["P3", "P1"], titleRo: "Sport & Wellness", titleEn: "Sport & Wellness", descRo: "Piscine, spa și complexe de wellness, cu tratare de aer și umiditate controlată.", descEn: "Pools, spas and wellness complexes, with air handling and controlled humidity." },
  { section: "expertiza", slug: "entertainment", status: "published", livesAt: "entertainment", personas: ["P3", "P2"], titleRo: "Entertainment", titleEn: "Entertainment", descRo: "Săli și spații de evenimente, cu sarcină foarte variabilă de ocupare.", descEn: "Venues and event spaces with highly variable occupancy loads." },
  { section: "expertiza", slug: "centre-de-date", status: "published", livesAt: "centre-de-date", personas: ["P7", "P4"], titleRo: "Centre de date", titleEn: "Data Centres", descRo: "Monitorizare de infrastructură critică, prezentată onest: fără proiecte proprii încă.", descEn: "Critical-infrastructure monitoring, stated honestly: no delivered projects yet." },
]

// ─── Services: /servicii/ ────────────────────────────────────────────────────

const servicii: RouteEntry[] = [
  { section: "servicii", slug: "proiectare-automatizari-bms", status: "published", personas: ["P4", "P8", "P1"], titleRo: "Proiectare automatizări și BMS", titleEn: "Automation and BMS design", descRo: "De la analiza instalațiilor la caietul de sarcini și documentația de execuție.", descEn: "From plant survey to technical specification and execution drawings." },
  { section: "servicii", slug: "executie-sisteme-bms", status: "published", personas: ["P4", "P8", "P1"], titleRo: "Execuție sisteme BMS", titleEn: "BMS system installation", descRo: "Tablouri, cablare, programare, grafică și punere în funcțiune.", descEn: "Panels, wiring, programming, graphics and commissioning." },
  { section: "servicii", slug: "integrare-sisteme-knx-dali-modbus-mbus", status: "published", personas: ["P4", "P7", "P6"], titleRo: "Integrare sisteme: KNX, DALI, Modbus, M-Bus", titleEn: "Systems integration: KNX, DALI, Modbus, M-Bus", descRo: "Un singur strat de supervizare peste echipamente de la producători diferiți.", descEn: "A single supervision layer over equipment from different manufacturers." },
  { section: "servicii", slug: "intretinere-sisteme-bms", status: "published", personas: ["P3", "P2"], titleRo: "Întreținere sisteme BMS", titleEn: "BMS maintenance", descRo: "Vizite planificate, reglaj sezonier, analiza alarmelor și raport de performanță.", descEn: "Planned visits, seasonal tuning, alarm review and performance reporting." },
  { section: "servicii", slug: "modernizare-sisteme-de-automatizare-si-bms", status: "published", personas: ["P1", "P2", "P3", "P4"], titleRo: "Modernizare sisteme de automatizare și BMS", titleEn: "Automation and BMS modernisation", descRo: "Migrare pe etape, cu păstrarea cablării și a elementelor de execuție funcționale.", descEn: "Phased migration that keeps working wiring and field devices in place." },
  { section: "servicii", slug: "consultanta", status: "published", personas: ["P1", "P2", "P4", "P5"], titleRo: "Consultanță", titleEn: "Consulting", descRo: "Evaluare de conformare, audit al lanțului de date și a doua opinie pe un sistem existent.", descEn: "Compliance assessment, data-chain audit and a second opinion on an existing system." },
]

// ─── Registry and helpers ────────────────────────────────────────────────────

export const routes: RouteEntry[] = [
  ...ghid, ...resurse, ...archivesResurse, ...instrumente, ...pentru, ...expertiza, ...servicii,
]

export function getEntry(section: Section, slug: string): RouteEntry | undefined {
  return routes.find((r) => r.section === section && r.slug === slug)
}

/** Entries that should have a generated route (published only — aliases redirect). */
export function publishedIn(section: Section): RouteEntry[] {
  return routes.filter((r) => r.section === section && r.status === "published")
}

export function entriesIn(section: Section): RouteEntry[] {
  return routes.filter((r) => r.section === section)
}

/** Canonical href for an entry. Aliases resolve to their real target. */
export function hrefFor(entry: RouteEntry): string {
  if (entry.status === "alias" && entry.aliasOf) return entry.aliasOf
  return `/${entry.section}/${entry.slug}`
}

/** True when the URL can be linked to today. */
export function isLinkable(section: Section, slug: string): boolean {
  const e = getEntry(section, slug)
  return !!e && (e.status === "published" || e.status === "alias")
}

// Sector URLs and sector-data keys diverge (civil → cladiri-de-birouri), so
// both directions get an explicit lookup rather than string munging at call sites.
const sectorUrlByDataSlug = new Map(
  expertiza.filter((e) => e.livesAt).map((e) => [e.livesAt as string, e.slug]),
)

/** Public URL for a sector, given its key in `lib/sector-data`. */
export function expertizaHref(dataSlug: string): string {
  return `/expertiza/${sectorUrlByDataSlug.get(dataSlug) ?? dataSlug}`
}

/** The `lib/sector-data` key behind a public sector URL. */
export function sectorDataSlug(urlSlug: string): string | undefined {
  return getEntry("expertiza", urlSlug)?.livesAt
}

/** Clusters reporting to a pillar. */
export function clustersFor(pillarSlug: string): RouteEntry[] {
  return routes.filter((r) => r.pillar === pillarSlug)
}

/** Persona id behind a /pentru/ slug. */
export function personaBySlug(slug: string): Persona | undefined {
  const hit = (Object.entries(personaMeta) as [Persona, { slug: string }][]).find(
    ([, m]) => m.slug === slug,
  )
  return hit?.[0]
}

/** Everything tagged for a persona, used by the /pentru/ role hubs. */
export function forPersona(p: Persona): RouteEntry[] {
  return routes.filter((r) => r.section !== "pentru" && r.personas?.includes(p))
}

/** Article (non-archive) entries of a category, for the archive listings. */
export function articlesInCategory(cat: Category): RouteEntry[] {
  return routes.filter((r) => r.category === cat && !r.archive && (r.section === "ghid" || r.section === "resurse"))
}

/** The archive entry a category degrades to (doc 15 link rules). */
export function archiveForCategory(cat: Category): RouteEntry | undefined {
  return routes.find((r) => r.archive && r.category === cat)
}

/** The ten finished drafts awaiting a port, newest section order first. */
export function awaitingPort(): RouteEntry[] {
  return routes.filter((r) => r.draft === "drive" && r.status !== "published")
}
