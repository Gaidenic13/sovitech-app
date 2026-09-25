"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { coverArticleCards } from "@/lib/article-cards"
import { categories, type Category } from "@/lib/site-routes"

// Editorial index for /resurse: a masthead, category filters with live counts,
// a featured pillar, the article list, the six category archives and the tools.
// Everything listed is derived from the route registry, so the page can never
// advertise an article that does not exist.

// ── The six category archives (real routes) ─────────────────────────────────

const categoryLinks: { key: Category; href: string; descRo: string; descEn: string }[] = [
  {
    key: "C1",
    href: "/resurse/reglementari-conformare",
    descRo: "Pragul BACS de 290 kW cu termen depășit, pragul de 70 kW din 2029, EPBD, auditul energetic, NIS2, CSRD și MEPS.",
    descEn: "The 290 kW BACS threshold with its deadline passed, the 70 kW threshold from 2029, EPBD, energy audits, NIS2, CSRD and MEPS.",
  },
  {
    key: "C2",
    href: "/resurse/esg-energie-raportare",
    descRo: "Lanțul de date de la senzor la raport, contorizarea pe chiriași, categoriile de emisii și sursele de finanțare.",
    descEn: "The data chain from sensor to report, tenant submetering, emission scopes and funding sources.",
  },
  {
    key: "C3",
    href: "/resurse/performanta-cladirii",
    descRo: "Indicatorii care contează, programele orare, detectarea risipei în trend-loguri și cauzele consumului peste așteptări.",
    descEn: "The indicators that matter, time schedules, finding waste in trend logs and the causes of higher-than-expected consumption.",
  },
  {
    key: "C4",
    href: "/resurse/bms-scada-integrare",
    descRo: "Ce este un BMS și cu ce nu trebuie confundat, diferența față de SCADA, protocoalele BACnet, Modbus, KNX și M-Bus, alarmele și securitatea OT.",
    descEn: "What a BMS is and what it should not be confused with, how it differs from SCADA, the BACnet, Modbus, KNX and M-Bus protocols, alarms and OT security.",
  },
  {
    key: "C5",
    href: "/resurse/ghiduri-pe-sectoare",
    descRo: "Soluții tehnice pe tip de clădire: hoteluri, retail, industrial și logistic, pharma și GMP, medical, birouri multi-tenant.",
    descEn: "Technical solutions per building type: hotels, retail, industrial and logistics, pharma and GMP, healthcare, multi-tenant offices.",
  },
  {
    key: "C6",
    href: "/resurse/modernizare-retrofit",
    descRo: "Auditul sistemului existent, semnele de sfârșit de viață, migrarea fără oprirea activității și fazarea investiției pe ani de buget.",
    descEn: "Auditing the existing system, end-of-life signs, migrating without stopping operations and phasing the investment across budget years.",
  },
]

// ── Translations ────────────────────────────────────────────────────────────

const translations = {
  ro: {
    label: "• Resurse",
    hero: "Resurse",
    heroSub:
      "Ce este obligatoriu, cât costă, cum se leagă sistemele și ce faci cu o clădire care are deja un sistem vechi.",
    all: "Toate articolele",
    articlesUnit: (n: number) => (n === 1 ? "articol" : "articole"),
    featured: "• Recomandat",
    latest: "• Ultimele articole",
    archive: "• Arhivă",
    noneInCat: "Încă nu am publicat articole în această categorie. Vezi ce urmează:",
    openArchive: "Deschide categoria",
    readMore: "Citește",
    exploreCat: "• Cele șase categorii",
    exploreCatSub: "Conținutul este organizat după întrebările pe care le pun cei care cumpără, specifică sau operează un sistem BMS.",
    tools: "• Instrumente",
    toolItems: [
      { label: "Calculator de economie și amortizare", href: "/calculator-roi" },
      { label: "Ghid BMS", href: "/ghid-bms" },
      { label: "Metodologia ROI", href: "/calculator-roi/metodologie" },
      { label: "Proiecte & Referințe", href: "/referinte" },
    ],
    toolDescs: [
      "Rezultate ca interval, cu domeniul declarat",
      "Evaluează potențialul clădirii tale",
      "Cum se calculează estimarea, pas cu pas",
      "Proiecte livrate, cu nume public",
    ],
    guideLabel: "• Ghid",
    projectsLabel: "• Proiecte livrate",
    projectsQuote:
      "Therme Nord București: 1.400 de puncte de date și 6 centrale de tratare a aerului, sub o singură supervizare.",
    projectsCta: "Vezi lista de referințe",
    author: "Echipa de inginerie Sovitech Control",
    authorRole: "Sovitech Control",
  },
  en: {
    label: "• Resources",
    hero: "Resources",
    heroSub:
      "What is mandatory, what it costs, how the systems connect and what to do with a building that already has an old system.",
    all: "All articles",
    articlesUnit: (n: number) => (n === 1 ? "article" : "articles"),
    featured: "• Featured",
    latest: "• Latest articles",
    archive: "• Archive",
    noneInCat: "We have not published articles in this category yet. Here is what is coming:",
    openArchive: "Open the category",
    readMore: "Read",
    exploreCat: "• The six categories",
    exploreCatSub: "The content is organised around the questions asked by the people who buy, specify or operate a BMS.",
    tools: "• Tools",
    toolItems: [
      { label: "Savings & payback calculator", href: "/calculator-roi" },
      { label: "BMS Guide", href: "/ghid-bms" },
      { label: "ROI Methodology", href: "/calculator-roi/metodologie" },
      { label: "Projects & References", href: "/referinte" },
    ],
    toolDescs: [
      "Results as ranges, with the domain declared",
      "Assess the potential of your building",
      "How the estimate is computed, step by step",
      "Delivered projects, with public names",
    ],
    guideLabel: "• Guide",
    projectsLabel: "• Delivered projects",
    projectsQuote:
      "Therme Nord Bucharest: 1,400 data points and 6 air handling units under one supervision layer.",
    projectsCta: "See the reference list",
    author: "Sovitech Control engineering team",
    authorRole: "Sovitech Control",
  },
}

const toolCardColors = ["#C5C0F5", "#C8E6C9", "#E8C5B8", "#E8E8C0"]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ResursePage() {
  const { lang, t: tr } = useLanguage()
  const t = translations[lang]
  const [active, setActive] = useState<Category | "all">("all")

  const cards = useMemo(
    () => coverArticleCards().slice().sort((a, b) => b.iso.localeCompare(a.iso)),
    []
  )

  // The pillar guide leads the page and the specification guide gets its own
  // callout; both are hidden from the unfiltered list so nothing renders twice.
  // Under a category filter every article shows, so the pill counts always
  // match the rows beneath them.
  const featured = cards.find((c) => c.slug === "sisteme-bms-cladiri") ?? cards[0]
  const guide = cards.find((c) => c.slug === "caiet-de-sarcini-bms")

  const counts = useMemo(() => {
    const m = {} as Record<Category, number>
    for (const c of cards) if (c.category) m[c.category] = (m[c.category] ?? 0) + 1
    return m
  }, [cards])

  const visible =
    active === "all"
      ? cards.filter((c) => c.slug !== featured.slug && c.slug !== guide?.slug)
      : cards.filter((c) => c.category === active)
  const latest = active === "all" ? visible.slice(0, 4) : visible
  const archive = active === "all" ? visible.slice(4) : []
  const activeArchive = active === "all" ? undefined : categoryLinks.find((c) => c.key === active)

  const pill = (isActive: boolean) =>
    `shrink-0 rounded-[1px] px-3.5 py-2 text-xs font-semibold tracking-wide transition-colors duration-150 ${
      isActive
        ? "bg-[#0D2E2B] text-white"
        : "bg-white border border-[#0D2E2B]/12 text-[#0D2E2B]/65 hover:text-[#0D2E2B] hover:border-[#0D2E2B]/30"
    }`

  return (
    <div className="min-h-screen bg-[#F5F4F0]">

      {/* ── Masthead: display title, one line of positioning, filters ── */}
      <section className="border-b border-[#0D2E2B]/10">
        <div className="container-site pt-28 pb-8">
          <p className="section-label mb-6">{t.label}</p>
          <h1 className="text-6xl md:text-8xl font-light text-[#0D2E2B] leading-[0.95] tracking-tighter mb-5">
            {t.hero}
          </h1>
          <p className="text-[#888888] font-light text-lg max-w-2xl leading-relaxed">
            {t.heroSub}
          </p>

          <div
            role="group"
            aria-label={tr("Filtrează după categorie", "Filter by category")}
            className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mt-10 pb-1"
          >
            <button
              type="button"
              aria-pressed={active === "all"}
              aria-label={`${t.all}, ${cards.length} ${t.articlesUnit(cards.length)}`}
              onClick={() => setActive("all")}
              className={pill(active === "all")}
            >
              {t.all}
              <sup className="ml-1 text-[9px] font-semibold">{cards.length}</sup>
            </button>
            {categoryLinks.map((c) => {
              const name = tr(categories[c.key].ro, categories[c.key].en)
              const n = counts[c.key] ?? 0
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={active === c.key}
                  aria-label={`${name}, ${n} ${t.articlesUnit(n)}`}
                  onClick={() => setActive(c.key)}
                  className={pill(active === c.key)}
                >
                  {name}
                  <sup className="ml-1 text-[9px] font-semibold">{n}</sup>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Featured pillar: cover left, editorial right ────────────── */}
      {active === "all" && (
        <section className="bg-white border-b border-[#0D2E2B]/8">
          <div className="container-site section-m">
            {/* The whole card is clickable via the title link's ::after overlay,
                so the accessible name stays the article title alone. */}
            <div className="group relative grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
              {featured.image && (
                <div
                  className="relative aspect-[16/10] rounded-[2px] overflow-hidden border border-[#0D2E2B]/8"
                  style={{ backgroundColor: featured.imageBg }}
                >
                  <div className="absolute inset-[10%]">
                    <Image
                      src={featured.image}
                      alt=""
                      fill
                      className="object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                </div>
              )}
              <div>
                <p className="section-label mb-4">{t.featured}</p>
                <h2 className="text-3xl md:text-4xl font-light text-[#0D2E2B] leading-tight tracking-tighter mb-4 text-balance">
                  <Link
                    href={featured.href}
                    className="after:absolute after:inset-0 hover:text-[#1F6B4A] transition-colors"
                  >
                    {tr(featured.titleRo, featured.titleEn)}
                  </Link>
                </h2>
                <p className="text-[#888888] font-light leading-relaxed mb-5 text-sm max-w-xl">
                  {tr(featured.descRo, featured.descEn)}
                </p>
                <p className="text-xs text-[#888888] tracking-wide">
                  {tr(featured.dateRo, featured.dateEn)} &nbsp;·&nbsp;{" "}
                  <span className="text-[#1F6B4A] font-medium">{tr(featured.readRo, featured.readEn)}</span>
                </p>
                {/* TODO(author): replace with the real named author once schema Person data is supplied */}
                <div className="flex items-center gap-2.5 mt-6 pt-5 border-t border-[#0D2E2B]/8">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#07201C] text-[10px] font-semibold text-[#C8E6C9] flex-shrink-0">
                    SC
                  </span>
                  <span>
                    <span className="block text-xs font-semibold text-[#0D2E2B]">{t.author}</span>
                    <span className="block text-[10px] text-[#888888]">{t.authorRole}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Article list: rows, hairline separated ──────────────────── */}
      <section className="section-m border-b border-[#0D2E2B]/8">
        <div className="container-site">
          <h2 className="section-label leading-none mb-8">
            {active === "all" ? t.latest : `• ${tr(categories[active].ro, categories[active].en)}`}
          </h2>

          {latest.length > 0 ? (
            <ul className="border-t border-[#0D2E2B]/10">
              {latest.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={a.href}
                    className="group grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center py-6 border-b border-[#0D2E2B]/10"
                  >
                    <div className="flex items-start gap-5 min-w-0">
                      {a.image && (
                        <span
                          className="hidden sm:block h-16 w-24 shrink-0 rounded-[2px] overflow-hidden border border-[#0D2E2B]/8 p-1.5"
                          style={{ backgroundColor: a.imageBg }}
                        >
                          <img src={a.image} alt="" className="h-full w-full object-contain" />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold tracking-widest uppercase text-[#888888] mb-1.5">
                          {tr(a.categoryRo, a.categoryEn)}
                        </span>
                        <span className="block text-xl md:text-2xl font-light text-[#0D2E2B] tracking-tighter leading-snug group-hover:text-[#1F6B4A] transition-colors">
                          {tr(a.titleRo, a.titleEn)}
                        </span>
                      </span>
                    </div>
                    <span className="flex items-center gap-4 sm:justify-end shrink-0">
                      <span className="text-[11px] text-[#888888] tracking-wide whitespace-nowrap">
                        {tr(a.dateRo, a.dateEn)} &nbsp;·&nbsp; {tr(a.readRo, a.readEn)}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-[#0D2E2B]/20 group-hover:text-[#1F6B4A] transition-colors" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-t border-b border-[#0D2E2B]/10 py-10">
              <p className="text-[#888888] font-light max-w-xl leading-relaxed">{t.noneInCat}</p>
              {activeArchive && (
                <Link
                  href={activeArchive.href}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#1F6B4A] hover:gap-3 transition-all"
                >
                  {t.openArchive}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}

          {activeArchive && latest.length > 0 && (
            <Link
              href={activeArchive.href}
              className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#1F6B4A] hover:gap-3 transition-all"
            >
              {t.openArchive}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      {/* ── Two callouts: a pillar guide and the delivered projects ─── */}
      {active === "all" && (
        <section className="bg-white border-b border-[#0D2E2B]/8">
          <div className="container-site section-m grid gap-4 md:grid-cols-2">
            {(() => {
              const guide = cards.find((c) => c.slug === "caiet-de-sarcini-bms")
              return guide ? (
                <Link
                  href={guide.href}
                  className="group flex flex-col justify-between rounded-[2px] border border-[#0D2E2B]/10 p-8 min-h-[220px] hover:border-[#0D2E2B]/25 transition-colors"
                >
                  <div>
                    <h2 className="section-label leading-none mb-4">{t.guideLabel}</h2>
                    <h3 className="text-2xl font-light text-[#0D2E2B] tracking-tighter leading-snug">
                      {tr(guide.titleRo, guide.titleEn)}
                    </h3>
                    <p className="text-sm text-[#888888] font-light leading-relaxed mt-3">
                      {tr(guide.descRo, guide.descEn)}
                    </p>
                  </div>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#1F6B4A] group-hover:gap-3 transition-all">
                    {t.readMore}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ) : null
            })()}

            <Link
              href="/referinte"
              className="group flex flex-col justify-between rounded-[2px] bg-[#07201C] p-8 min-h-[220px]"
            >
              <div>
                <h2 className="section-label text-[#C8E6C9] leading-none mb-4">{t.projectsLabel}</h2>
                <p className="text-xl font-light text-white leading-snug tracking-tight">
                  {t.projectsQuote}
                </p>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#C8E6C9] group-hover:gap-3 transition-all">
                {t.projectsCta}
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* ── Archive: the older half of the list ─────────────────────── */}
      {active === "all" && archive.length > 0 && (
        <section className="section-m border-b border-[#0D2E2B]/8">
          <div className="container-site">
            <h2 className="section-label leading-none mb-8">{t.archive}</h2>
            <ul className="border-t border-[#0D2E2B]/10">
              {archive.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={a.href}
                    className="group grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center py-5 border-b border-[#0D2E2B]/10"
                  >
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold tracking-widest uppercase text-[#888888] mb-1">
                        {tr(a.categoryRo, a.categoryEn)}
                      </span>
                      <span className="block text-lg font-light text-[#0D2E2B] tracking-tight leading-snug group-hover:text-[#1F6B4A] transition-colors">
                        {tr(a.titleRo, a.titleEn)}
                      </span>
                    </span>
                    <span className="flex items-center gap-4 sm:justify-end shrink-0">
                      <span className="text-[11px] text-[#888888] tracking-wide whitespace-nowrap">
                        {tr(a.dateRo, a.dateEn)} &nbsp;·&nbsp; {tr(a.readRo, a.readEn)}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-[#0D2E2B]/20 group-hover:text-[#1F6B4A] transition-colors" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── The six categories, as an editorial list ────────────────── */}
      <section className="section-m bg-white border-b border-[#0D2E2B]/8">
        <div className="container-site">
          <h2 className="section-label leading-none mb-3">{t.exploreCat}</h2>
          <p className="text-[#888888] font-light max-w-2xl leading-relaxed mb-10">{t.exploreCatSub}</p>
          <div className="grid gap-x-16 gap-y-0 md:grid-cols-2">
            {categoryLinks.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group flex gap-6 py-6 items-start border-b border-[#0D2E2B]/10 border-t md:[&:nth-child(n+3)]:border-t-0 [&:nth-child(n+2)]:border-t-0 md:[&:nth-child(2)]:border-t"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-light text-[#0D2E2B] leading-snug text-lg tracking-tight mb-1.5 group-hover:text-[#1F6B4A] transition-colors">
                    {tr(categories[cat.key].ro, categories[cat.key].en)}
                    <span className="ml-2 text-xs text-[#888888] font-normal">{counts[cat.key] ?? 0}</span>
                  </h3>
                  <p className="text-sm text-[#888888] font-light leading-relaxed">
                    {tr(cat.descRo, cat.descEn)}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 mt-1 text-[#0D2E2B]/20 group-hover:text-[#1F6B4A] transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tools: dark band with pastel utility cards ──────────────── */}
      <section className="bg-[#07201C]">
        <div className="container-site section-l">
          <h2 className="section-label text-[#C8E6C9] leading-none mb-10">{t.tools}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.toolItems.map((tool, i) => (
              <Link
                key={tool.label}
                href={tool.href}
                className="group rounded-[2px] p-6 flex flex-col justify-between min-h-[180px]"
                style={{ backgroundColor: toolCardColors[i % toolCardColors.length] }}
              >
                <div>
                  <h3 className="text-lg font-light text-[#0D2E2B] tracking-tighter leading-snug">
                    {tool.label}
                  </h3>
                  <p className="text-sm text-[#0D2E2B]/80 font-light mt-1.5 leading-snug">
                    {t.toolDescs[i]}
                  </p>
                </div>
                <div className="flex justify-end">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D2E2B]/10 transition-colors duration-300 group-hover:bg-[#0D2E2B]/20">
                    <ArrowRight className="h-4 w-4 text-[#0D2E2B]" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
