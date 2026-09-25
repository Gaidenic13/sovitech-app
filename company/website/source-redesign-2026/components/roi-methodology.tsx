"use client"

import Link from "next/link"
import { ArrowRight, Check, ExternalLink } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { HeroField } from "@/components/hero-field"

// ─── Evidence badges ──────────────────────────────────────────────────────────
// The point of this page: a reader should see at a glance how much of the
// estimate is standard-backed and how much is our own judgement.

type BadgeKind = "standard" | "measured" | "price" | "sovitech" | "legal"

const badgeStyle: Record<BadgeKind, { bg: string; fg: string; ro: string; en: string }> = {
  standard: { bg: "#C8E6C9", fg: "#0D2E2B", ro: "Standard european", en: "European standard" },
  measured: { bg: "#C5C0F5", fg: "#0D2E2B", ro: "Studiu măsurat", en: "Measured study" },
  price: { bg: "#0D2E2B", fg: "#ffffff", ro: "Preț oficial", en: "Official price" },
  sovitech: { bg: "#8B7B5C", fg: "#ffffff", ro: "Ipoteză Sovitech", en: "Sovitech assumption" },
  legal: { bg: "#5C5FD4", fg: "#ffffff", ro: "Fapt legal", en: "Legal fact" },
}

function Badge({ kind }: { kind: BadgeKind }) {
  const { t } = useLanguage()
  const s = badgeStyle[kind]
  return (
    <span
      className="inline-block whitespace-nowrap rounded-[1px] px-2 py-1 text-[11px] font-semibold leading-none"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {t(s.ro, s.en)}
    </span>
  )
}

function SectionLabel({ ro, en }: { ro: string; en: string }) {
  const { t } = useLanguage()
  return <p className="section-label mb-3">• {t(ro, en)}</p>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RoiMethodology() {
  const { t } = useLanguage()

  const classes = [
    {
      id: "D",
      ro: "Fără automatizare în rețea",
      en: "No networked automation",
      descRo: "Termostate simple, nimic conectat, niciun fel de monitorizare. Standardul spune că astfel de clădiri trebuie modernizate.",
      descEn: "Simple thermostats, nothing connected, no monitoring at all. The standard says such buildings should be retrofitted.",
      factor: "1,31",
      dark: true,
    },
    {
      id: "C",
      ro: "Automatizare standard (referința)",
      en: "Standard automation (the reference)",
      descRo: "Automatizare doar pe echipamentele centrale. Fără control electronic în cameră, fără monitorizare energetică. Aici se află majoritatea clădirilor.",
      descEn: "Automation on central plant only. No electronic room control, no energy monitoring. This is where most buildings sit.",
      factor: "1,00",
      dark: false,
      reference: true,
    },
    {
      id: "B",
      ro: "Automatizare avansată",
      en: "Advanced automation",
      descRo: "Controlerele din cameră comunică cu sistemul central. Management coordonat și monitorizare energetică, dar fără control automat pe bază de cerere.",
      descEn: "Room controllers communicate with the central system. Coordinated management and energy monitoring, but no automatic demand-based control.",
      factor: "0,85",
      dark: false,
    },
    {
      id: "A",
      ro: "Performanță energetică ridicată",
      en: "High energy performance",
      descRo: "Control pe bază de prezență și calitate a aerului, integrat cu iluminatul și umbrirea, plus monitorizare energetică și detecția defectelor.",
      descEn: "Presence- and air-quality-based control, integrated with lighting and shading, plus energy monitoring and fault detection.",
      factor: "0,68",
      dark: true,
      target: true,
    },
  ]

  const steps = [
    {
      n: "1",
      ro: "Pornim de la factorii standardului",
      en: "We start from the standard's factors",
      calcRo: "Hotel, clasa A: factor termic 0,68 · factor electric 0,90",
      calcEn: "Hotel, class A: thermal factor 0.68 · electrical factor 0.90",
      res: "",
      kind: "standard" as BadgeKind,
    },
    {
      n: "2",
      ro: "Le combinăm după structura facturii",
      en: "We combine them by the shape of your bill",
      calcRo: "0,65 × 0,68 + 0,35 × 0,90  (presupunem 65% termic)",
      calcEn: "0.65 × 0.68 + 0.35 × 0.90  (assuming 65% thermal)",
      res: "0,757",
      kind: "sovitech" as BadgeKind,
    },
    {
      n: "3",
      ro: "Economia rezultă din factor",
      en: "The saving follows from the factor",
      calcRo: "1 − 0,757",
      calcEn: "1 − 0.757",
      res: "24,3%",
      kind: "standard" as BadgeKind,
    },
    {
      n: "4",
      ro: "O aplicăm pe factura ta reală",
      en: "We apply it to your actual bill",
      calcRo: "200.000 EUR/an × 24,3%",
      calcEn: "€200,000/yr × 24.3%",
      res: "48.600 EUR/an",
      kind: "standard" as BadgeKind,
    },
    {
      n: "5",
      ro: "Estimăm investiția și amortizarea",
      en: "We estimate the investment and payback",
      calcRo: "5.000 m² × 13 EUR/m² = 65.000 EUR ÷ (48.600 ÷ 12)",
      calcEn: "5,000 m² × €13/m² = €65,000 ÷ (48,600 ÷ 12)",
      res: "16 luni",
      kind: "sovitech" as BadgeKind,
    },
  ]

  const reality = [
    {
      ro: "Potențial tehnic, conform standardului (clasa C → A)",
      en: "Technical potential under the standard (class C → A)",
      val: "22–24%",
      kind: "standard" as BadgeKind,
      srcRo: "EN ISO 52120-1:2022",
      srcEn: "EN ISO 52120-1:2022",
    },
    {
      ro: "Măsurat: instalare BMS nou, 20 de clădiri",
      en: "Measured: new BMS installation, 20 buildings",
      val: "~13%",
      sub: "(−10% … +29%)",
      kind: "measured" as BadgeKind,
      srcRo: "Wheeler, 1994",
      srcEn: "Wheeler, 1994",
    },
    {
      ro: "Măsurat: reoptimizarea unui sistem existent, 1.482 de clădiri",
      en: "Measured: re-commissioning an existing system, 1,482 buildings",
      val: "6,4%",
      sub: "(3,4 – 12,4%)",
      kind: "measured" as BadgeKind,
      srcRo: "Crowe et al., 2020",
      srcEn: "Crowe et al., 2020",
    },
    {
      ro: "Măsurat: cu monitorizare continuă, în anul 5",
      en: "Measured: with continuous monitoring, by year 5",
      val: "19%",
      kind: "measured" as BadgeKind,
      srcRo: "Kramer et al., 2019",
      srcEn: "Kramer et al., 2019",
    },
  ]

  const sources = [
    {
      ro: "Factorii de eficiență pe tip de clădire",
      en: "Efficiency factors by building type",
      val: "0,50 – 1,56",
      kind: "standard" as BadgeKind,
      src: "EN ISO 52120-1:2022",
      url: "https://epb.center/document/iso-52120-1/",
    },
    {
      ro: "Economii măsurate în proiecte reale",
      en: "Savings measured in real projects",
      val: "6,4% – 13%",
      kind: "measured" as BadgeKind,
      src: "Energy and Buildings 227:110408 (2020)",
      url: "https://escholarship.org/uc/item/59f632fx",
    },
    {
      ro: "Persistența economiilor după primul an",
      en: "Persistence of savings after year one",
      val: "61%",
      kind: "measured" as BadgeKind,
      src: "ASHRAE Journal, 2019",
      url: "https://slipstreaminc.org/sites/default/files/documents/publications/012-019gunasingh-slipstream-web.pdf",
    },
    {
      ro: "Preț energie electrică, industrial România",
      en: "Electricity price, Romanian business tariff",
      val: "0,1887 EUR/kWh",
      kind: "price" as BadgeKind,
      src: "Eurostat, S2 2025",
      url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205/default/table",
    },
    {
      ro: "Cost de implementare",
      en: "Implementation cost",
      val: "9-18 EUR/m² (birouri)",
      kind: "sovitech" as BadgeKind,
      src: "Sovitech · cf. Waide 2014: 28,70 EUR/m²",
      url: "https://eubac.org/wp-content/uploads/2021/06/2014.06.13-Waide-ECI-Energy-and-CO2-savings-BAT.pdf",
    },
    {
      ro: "Ponderea termic / electric din factură",
      en: "Thermal / electrical share of the bill",
      val: "45 – 65%",
      kind: "sovitech" as BadgeKind,
      src: "Sovitech",
      url: null,
    },
    {
      ro: "Obligația de a avea BMS peste 290 kW",
      en: "Obligation to have BMS above 290 kW",
      val: "31.12.2024",
      kind: "legal" as BadgeKind,
      src: "Legea 372/2005, art. 27 alin. (5)",
      url: "https://isc.gov.ro/files/2024/Legislatie/legea-nr-372-2005-privind-performanta-energetica-a-cladirilor.pdf",
    },
  ]

  const limitations = [
    {
      ro: "Este o estimare, nu o garanție contractuală.",
      en: "It is an estimate, not a contractual guarantee.",
    },
    {
      ro: "Nu include evoluția prețurilor la energie. În România, energia electrică industrială a crescut cu 15,4% într-un an.",
      en: "It excludes energy price changes. Romanian business electricity rose 15.4% in a single year.",
    },
    {
      ro: "Nu actualizează financiar sumele (fără NPV) și nu scade costul contractului de mentenanță sau al licențelor.",
      en: "It does not discount future sums (no NPV) and does not deduct maintenance contract or licence costs.",
    },
    {
      ro: "Presupune punerea în funcțiune corectă și utilizarea clădirii conform proiectului.",
      en: "It assumes correct commissioning and that the building is used as designed.",
    },
    {
      ro: "Economia reală depinde în primul rând de cât de automatizată este clădirea ta acum, nu doar de tipul ei.",
      en: "Real savings depend above all on how automated your building already is, not just on its type.",
    },
    {
      ro: "Pentru industrial și centre de date, standardul nu publică factori. Acolo cifrele vin din experiența noastră de proiect, nu din standard.",
      en: "For industrial buildings and data centres the standard publishes no factors. There, our figures come from project experience, not from the standard.",
    },
  ]

  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-[#07201C] pt-8 pb-12 sm:pt-14 sm:pb-20 relative overflow-hidden">
        <HeroField />
        <div className="container-site relative z-10">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-white/40 mb-8">
            <Link href="/calculator-roi" className="hover:text-white transition-colors duration-150">
              {t("Calculator ROI", "ROI Calculator")}
            </Link>
            <span>/</span>
            <span className="text-[#C8E6C9]">{t("Cum calculăm", "How we calculate")}</span>
          </nav>

          <p className="text-sm font-semibold tracking-wider uppercase text-[#C8E6C9] mb-4">
            • {t("Transparență", "Transparency")}
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tighter leading-tight max-w-3xl text-balance">
            {t(
              "Estimarea ta nu vine dintr-o formulă inventată de noi.",
              "Your estimate does not come from a formula we made up.",
            )}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-white/60 font-light max-w-2xl leading-relaxed">
            {t(
              "Vine dintr-un standard european, și îți arătăm exact cum, pas cu pas. Îți arătăm și ce economii s-au măsurat în proiecte reale, nu doar ce promite standardul.",
              "It comes from a European standard, and we show you exactly how, step by step. We also show what field studies actually measured, not only what the standard promises.",
            )}
          </p>
        </div>
      </section>

      {/* ── 1. The four classes ── */}
      <section className="bg-[#F5F4F0] section-l">
        <div className="container-site">
          <SectionLabel ro="Punctul de plecare" en="The starting point" />
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-[#0D2E2B] tracking-tighter mb-4">
            {t("Cele 4 clase de automatizare", "The 4 automation classes")}
          </h2>
          <p className="text-base text-[#555555] font-light leading-relaxed max-w-2xl mb-10">
            {t(
              "Standardul european EN ISO 52120-1 împarte clădirile în patru clase, după cât de inteligent își controlează instalațiile. Clasa în care se află clădirea ta acum decide cât poți economisi, mai mult decât tipul clădirii.",
              "The European standard EN ISO 52120-1 sorts buildings into four classes by how intelligently they control their systems. The class your building is in today decides how much you can save, more than the type of building does.",
            )}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {classes.map((c) => (
              <div
                key={c.id}
                className="rounded-[2px] p-6 flex flex-col border"
                style={{
                  backgroundColor: c.dark ? "#07201C" : "#ffffff",
                  borderColor: c.target ? "#C8E6C9" : "rgba(13,46,43,0.10)",
                }}
              >
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <span
                    className="text-4xl font-light tracking-tighter leading-none"
                    style={{ color: c.dark ? "#C8E6C9" : "#0D2E2B" }}
                  >
                    {c.id}
                  </span>
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: c.dark ? "rgba(255,255,255,0.5)" : "#888888" }}
                  >
                    {c.factor}
                  </span>
                </div>
                <p
                  className="text-sm font-semibold mb-2 leading-snug"
                  style={{ color: c.dark ? "#ffffff" : "#0D2E2B" }}
                >
                  {t(c.ro, c.en)}
                </p>
                <p
                  className="text-xs font-light leading-relaxed"
                  style={{ color: c.dark ? "rgba(255,255,255,0.6)" : "#666666" }}
                >
                  {t(c.descRo, c.descEn)}
                </p>
                {c.reference && (
                  <span className="mt-4 inline-block w-max rounded-[1px] bg-[#0D2E2B] px-2 py-1 text-[11px] font-semibold text-white">
                    {t("Referință", "Reference")}
                  </span>
                )}
                {c.target && (
                  <span className="mt-4 inline-block w-max rounded-[1px] bg-[#C8E6C9] px-2 py-1 text-[11px] font-semibold text-[#0D2E2B]">
                    {t("Ținta noastră", "What we build")}
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm text-[#888888] font-light max-w-2xl leading-relaxed">
            {t(
              "Cifrele mici din colț sunt factorii standardului pentru hoteluri (energie termică). Clasa C este referința, cu factorul 1,00. Un factor de 0,68 înseamnă un consum de 68% față de referință, adică o economie de 32%.",
              "The small figures in the corner are the standard's factors for hotels (thermal energy). Class C is the reference, at 1.00. A factor of 0.68 means consumption at 68% of the reference, a 32% saving.",
            )}
          </p>
        </div>
      </section>

      {/* ── 2. The formula ── */}
      <section className="bg-white section-l">
        <div className="container-site">
          <SectionLabel ro="Calculul" en="The calculation" />
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-[#0D2E2B] tracking-tighter mb-4">
            {t("Formula, pas cu pas", "The formula, step by step")}
          </h2>
          <p className="text-base text-[#555555] font-light leading-relaxed max-w-2xl mb-8">
            {t(
              "Exemplu complet pentru un hotel de 5.000 m², cu 200.000 EUR/an cost de energie, aflat astăzi în clasa C. Poți reface fiecare pas cu un calculator de buzunar.",
              "A full worked example for a 5,000 m² hotel with €200,000/yr in energy costs, currently in class C. You can reproduce every step with a pocket calculator.",
            )}
          </p>

          <div className="rounded-[2px] border border-[#0D2E2B]/10 divide-y divide-[#0D2E2B]/8 overflow-hidden">
            {steps.map((s) => (
              <div key={s.n} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0D2E2B] text-sm font-semibold text-white">
                  {s.n}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-[#0D2E2B]">{t(s.ro, s.en)}</p>
                    <Badge kind={s.kind} />
                  </div>
                  <p className="text-sm text-[#888888] font-light break-words tabular-nums">
                    {t(s.calcRo, s.calcEn)}
                  </p>
                </div>
                <span className="text-lg font-light text-[#1F6B4A] tabular-nums sm:text-right sm:min-w-[110px]">
                  {s.res}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[2px] bg-[#F5F4F0] p-5 sm:p-6">
            <p className="text-sm text-[#0D2E2B] font-light leading-relaxed">
              {t(
                "Dacă aceeași clădire pornește din clasa D (fără nicio automatizare), standardul indică 38,3%, adică 76.500 EUR/an și o amortizare de circa 10 luni. De aceea prima întrebare la audit este întotdeauna: ce ai instalat acum?",
                "If the same building starts from class D (no automation at all), the standard gives 38.3%, i.e. €76,500/yr and a payback of roughly 10 months. That is why the first question in an audit is always: what do you have installed today?",
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Standard vs measured — the honesty section ── */}
      <section className="bg-[#07201C] section-l">
        <div className="container-site">
          <p className="text-sm font-semibold tracking-wider uppercase text-[#C8E6C9] mb-3">
            • {t("Sinceritate", "Straight talk")}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-white tracking-tighter mb-4">
            {t("Ce spune standardul vs. ce se măsoară în realitate", "What the standard says vs. what gets measured")}
          </h2>
          <p className="text-base text-white/60 font-light leading-relaxed max-w-2xl mb-10">
            {t(
              "Preferăm să îți arătăm cifra mică înainte să o descoperi singur. Standardul descrie potențialul tehnic. Studiile de teren măsoară ce se obține de obicei. Diferența dintre ele nu e un detaliu, ci exact munca pentru care ne angajezi.",
              "We would rather show you the small number before you find it yourself. The standard describes technical potential. Field studies measure what is typically achieved. The gap between them is not a detail. It is precisely the work you hire us for.",
            )}
          </p>

          <div className="rounded-[2px] border border-white/10 divide-y divide-white/10 overflow-hidden">
            {reality.map((r, i) => (
              <div key={i} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-light leading-snug mb-2">{t(r.ro, r.en)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge kind={r.kind} />
                    <span className="text-xs text-white/40">{t(r.srcRo, r.srcEn)}</span>
                  </div>
                </div>
                <div className="shrink-0 sm:text-right">
                  <span className="text-2xl font-light tabular-nums text-[#C8E6C9]">{r.val}</span>
                  {r.sub && <span className="ml-2 text-xs text-white/40 tabular-nums">{r.sub}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2px] bg-white/5 border border-white/10 p-6">
              <h3 className="text-base font-semibold text-white mb-3">
                {t("De ce apare diferența", "Why the gap exists")}
              </h3>
              <p className="text-sm text-white/60 font-light leading-relaxed">
                {t(
                  "Un sistem bun prost pus în funcțiune economisește puțin. Studiile arată că rezultatul nu depinde de cât de scump e echipamentul, ci de calitatea punerii în funcțiune, de disciplina operatorilor și de monitorizarea continuă. În studiul pe 20 de clădiri, ce a contat cel mai mult a fost dacă operatorii țineau evidența consumului.",
                  "A good system that is poorly commissioned saves very little. Studies show the outcome depends not on how expensive the hardware is, but on commissioning quality, operator discipline and continuous monitoring. In the 20-building study, what mattered most was whether operators kept energy records.",
                )}
              </p>
            </div>
            <div className="rounded-[2px] bg-white/5 border border-white/10 p-6">
              <h3 className="text-base font-semibold text-white mb-3">
                {t("Economiile scad dacă nu sunt întreținute", "Savings decay without maintenance")}
              </h3>
              <p className="text-sm text-white/60 font-light leading-relaxed">
                {t(
                  "Din economiile obținute în primul an, doar 61% se mai regăsesc mai târziu la energia electrică și 42% la gaz. La unele funcții (control iluminat, pornire optimizată, setări de termostat) economiile dispar complet. Cu monitorizare continuă se întâmplă invers: economiile cresc an de an, până la 19% în anul cinci.",
                  "Of the savings achieved in year one, only 61% remain later for electricity and 42% for gas. For some functions (lighting control, optimum start, thermostat settings) the savings vanish entirely. With continuous monitoring the opposite happens: savings grow year on year, reaching 19% by year five.",
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Sources ── */}
      <section className="bg-[#F5F4F0] section-l">
        <div className="container-site">
          <SectionLabel ro="Surse" en="Sources" />
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-[#0D2E2B] tracking-tighter mb-4">
            {t("De unde vin cifrele", "Where the numbers come from")}
          </h2>
          <p className="text-base text-[#555555] font-light leading-relaxed max-w-2xl mb-8">
            {t(
              "Fiecare număr din estimare are o etichetă. Poți vedea dintr-o privire ce vine dintr-un standard, ce dintr-un studiu măsurat și ce este ipoteza noastră.",
              "Every number in the estimate carries a label. You can see at a glance what comes from a standard, what from a measured study, and what is our own assumption.",
            )}
          </p>

          <div className="rounded-[2px] border border-[#0D2E2B]/10 bg-white divide-y divide-[#0D2E2B]/8 overflow-hidden">
            {sources.map((s, i) => (
              <div key={i} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#0D2E2B] leading-snug mb-1.5">{t(s.ro, s.en)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge kind={s.kind} />
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#1F6B4A] hover:text-[#0D2E2B] transition-colors duration-150"
                      >
                        {s.src}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-[#888888]">{s.src}</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-base font-medium text-[#0D2E2B] tabular-nums sm:text-right sm:min-w-[130px]">
                  {s.val}
                </span>
              </div>
            ))}
          </div>

          {/* Progressive disclosure — full factor tables */}
          <details className="mt-6 rounded-[2px] border border-[#0D2E2B]/10 bg-white">
            <summary className="cursor-pointer list-none p-5 sm:p-6 text-sm font-semibold text-[#0D2E2B] hover:bg-[#F5F4F0] transition-colors duration-150">
              {t(
                "Vezi tabelul complet de factori din EN ISO 52120-1 ▾",
                "See the full EN ISO 52120-1 factor table ▾",
              )}
            </summary>
            <div className="border-t border-[#0D2E2B]/8 p-5 sm:p-6">
              <p className="text-xs text-[#888888] font-light mb-4 leading-relaxed">
                {t(
                  "Factori de eficiență pe tip de clădire. Clasa C = 1,00 (referință). Un factor sub 1 înseamnă consum mai mic. Sursă: EN ISO 52120-1:2022, reprodus în documentația BRE, Siemens și Beckhoff.",
                  "Efficiency factors by building type. Class C = 1.00 (reference). A factor below 1 means lower consumption. Source: EN ISO 52120-1:2022, as reproduced in BRE, Siemens and Beckhoff documentation.",
                )}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-[#0D2E2B]/10 text-left">
                      <th className="pb-2 pr-4 font-semibold text-[#0D2E2B]">{t("Tip clădire", "Building type")}</th>
                      <th className="pb-2 px-3 font-semibold text-[#888888] text-right">D</th>
                      <th className="pb-2 px-3 font-semibold text-[#888888] text-right">C</th>
                      <th className="pb-2 px-3 font-semibold text-[#888888] text-right">B</th>
                      <th className="pb-2 pl-3 font-semibold text-[#0D2E2B] text-right">A</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {[
                      ["Birouri / Offices", "1,51", "1,00", "0,80", "0,70"],
                      ["Hoteluri / Hotels", "1,31", "1,00", "0,85", "0,68"],
                      ["Restaurante / Restaurants", "1,23", "1,00", "0,77", "0,68"],
                      ["Retail / Wholesale & retail", "1,56", "1,00", "0,73", "0,60"],
                      ["Spitale / Hospitals", "1,31", "1,00", "0,91", "0,86"],
                      ["Educație / Education", "1,20", "1,00", "0,88", "0,80"],
                    ].map((row) => (
                      <tr key={row[0]} className="border-b border-[#0D2E2B]/5 last:border-0">
                        <td className="py-2.5 pr-4 text-[#0D2E2B] font-light">{row[0]}</td>
                        <td className="py-2.5 px-3 text-right text-[#888888]">{row[1]}</td>
                        <td className="py-2.5 px-3 text-right text-[#888888]">{row[2]}</td>
                        <td className="py-2.5 px-3 text-right text-[#888888]">{row[3]}</td>
                        <td className="py-2.5 pl-3 text-right font-medium text-[#1F6B4A]">{row[4]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-[#888888] font-light leading-relaxed">
                {t(
                  "Sunt factorii pentru energie termică. Pentru energie electrică valorile sunt mai apropiate de 1, de exemplu 0,87 la birouri în clasa A. Pentru clădiri industriale, depozite și centre de date standardul nu publică factori.",
                  "These are the thermal energy factors. Electrical factors sit closer to 1, for example 0.87 for class-A offices. For industrial buildings, storage and data centres the standard publishes no factors.",
                )}
              </p>
            </div>
          </details>
        </div>
      </section>

      {/* ── 5. Limitations ── */}
      <section className="bg-white section-l">
        <div className="container-site">
          <SectionLabel ro="Limite" en="Limits" />
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-[#0D2E2B] tracking-tighter mb-8">
            {t("Ce NU include estimarea", "What the estimate does not include")}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 max-w-4xl">
            {limitations.map((l, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B7B5C]" />
                <span className="text-sm text-[#555555] font-light leading-relaxed">{t(l.ro, l.en)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 6. Legal context ── */}
      <section className="bg-[#F5F4F0] section-l">
        <div className="container-site">
          <SectionLabel ro="Context legal" en="Legal context" />
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-[#0D2E2B] tracking-tighter mb-4">
            {t("Ce cere legea în România", "What Romanian law requires")}
          </h2>
          <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
            <div className="rounded-[2px] bg-white border border-[#0D2E2B]/10 p-6">
              <div className="mb-3">
                <Badge kind="legal" />
              </div>
              <p className="text-sm text-[#0D2E2B] font-light leading-relaxed">
                {t(
                  "Legea 372/2005, art. 27 alin. (5) și art. 29 alin. (6): clădirile nerezidențiale cu sisteme de peste 290 kW trebuiau echipate cu sisteme de automatizare până la 31 decembrie 2024, acolo unde este fezabil tehnic și economic.",
                  "Law 372/2005, art. 27(5) and art. 29(6): non-residential buildings with systems above 290 kW were required to have building automation by 31 December 2024, where technically and economically feasible.",
                )}
              </p>
            </div>
            <div className="rounded-[2px] bg-white border border-[#0D2E2B]/10 p-6">
              <h3 className="text-sm font-semibold text-[#0D2E2B] mb-3">
                {t("Ce înseamnă concret", "What this means in practice")}
              </h3>
              <ul className="space-y-2.5">
                {[
                  {
                    ro: "Legea nu prevede amendă pentru lipsa sistemului.",
                    en: "The law sets no fine for not having the system.",
                  },
                  {
                    ro: "Clădirile cu automatizare funcțională sunt scutite de inspecțiile periodice obligatorii.",
                    en: "Buildings with functional automation are exempt from mandatory periodic inspections.",
                  },
                  {
                    ro: "Pragul european de 70 kW este o cerință UE viitoare, încă netranspusă în România.",
                    en: "The European 70 kW threshold is a forthcoming EU requirement, not yet transposed in Romania.",
                  },
                ].map((x, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1F6B4A]" />
                    <span className="text-sm text-[#555555] font-light leading-relaxed">{t(x.ro, x.en)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. CTA ── */}
      <section className="bg-[#07201C] section-l">
        <div className="container-site">
          <p className="text-sm font-semibold tracking-wider uppercase text-[#C8E6C9] mb-3">
            • {t("Pasul următor", "Next step")}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-white tracking-tighter mb-8 max-w-2xl">
            {t("De la estimare la ofertă fermă", "From estimate to firm quote")}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            {[
              { n: "1", ro: "Estimarea online", en: "The online estimate", dRo: "Orientativă, în două minute.", dEn: "Indicative, in two minutes." },
              { n: "2", ro: "Auditul la fața locului", en: "The on-site audit", dRo: "Stabilim clasa reală de automatizare și citim consumurile.", dEn: "We establish your real automation class and read actual consumption." },
              { n: "3", ro: "Calculul detaliat", en: "The detailed calculation", dRo: "Standardul prevede și o metodă detaliată. O aplicăm pe clădirea ta.", dEn: "The standard also defines a detailed method. We apply it to your building." },
              { n: "4", ro: "Oferta fermă", en: "The firm quote", dRo: "Cu economii calculate pe date măsurate, nu pe medii.", dEn: "With savings based on measured data, not averages." },
            ].map((s) => (
              <div key={s.n} className="rounded-[2px] bg-white/5 border border-white/10 p-5">
                <span className="text-xs font-semibold text-[#C8E6C9]">{s.n}</span>
                <p className="text-sm font-semibold text-white mt-2 mb-1.5">{t(s.ro, s.en)}</p>
                <p className="text-xs text-white/50 font-light leading-relaxed">{t(s.dRo, s.dEn)}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/cerere-oferta"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-white text-[#07201C] text-sm font-semibold px-6 py-3.5 rounded-[1px] hover:bg-[#C8E6C9] transition-colors duration-300"
            >
              {t("Solicită auditul", "Request the audit")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/calculator-roi"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 border border-white/20 text-white text-sm font-medium px-6 py-3.5 rounded-[1px] hover:bg-white/5 transition-colors duration-300"
            >
              {t("Înapoi la calculator", "Back to the calculator")}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
