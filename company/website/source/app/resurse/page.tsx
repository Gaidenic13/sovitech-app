"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

// ── Translations ────────────────────────────────────────────────────────────

const translations = {
  ro: {
    label: "• Resurse",
    hero: "Cele mai noi informatii despre automatizarea cladirilor.",
    heroSub: "Date, analize, studii de caz si ghiduri tehnice pentru profesionistii BMS.",
    categories: [
      { name: "Recomandate",       slug: "featured" },
      { name: "Date & Analize",    slug: "data",         count: 12 },
      { name: "Studii de caz",     slug: "case-studies", count: 8  },
      { name: "Ghiduri tehnice",   slug: "guides",       count: 15 },
      { name: "Rapoarte de piata", slug: "reports",      count: 4  },
      { name: "Toate articolele",  slug: "all" },
    ],
    latest: "• ULTIMELE ARTICOLE",
    viewMore: "Mai multe articole",
    readLabel: "Citeste",
    exploreCat: "EXPLOREAZA PE CATEGORII",
    catItems: ["Toate articolele", "Date & Analize", "Studii de caz", "Ghiduri tehnice", "Rapoarte de piata"],
    sectorGuides: "GHIDURI PE SECTOR",
    sectors: ["Civil & Birouri", "Medical & Farma", "Retail & HORECA", "Industrial", "Centre de Date", "Infrastructura"],
    tools: "UNELTE",
    toolItems: [
      { label: "Calculator ROI",          href: "/calculator-roi"           },
      { label: "Ghid BMS",                href: "/ghid-bms"                 },
      { label: "Raport de piata",         href: "/resurse/raport-piata"     },
      { label: "Proiecte & Referinte",    href: "/resurse/referinte"        },
    ],
    newsletter: "NEWSLETTER",
    newsletterTitle: "Ramai inaintea industriei",
    newsletterSub: "Analize lunare, studii de caz si ghiduri tehnice direct in inbox-ul tau.",
    emailPlaceholder: "Adresa ta de email",
    subscribe: "Aboneaza-te",
    featured: {
      category: "Date & Analize",
      title: "Cat de eficiente sunt sistemele BMS in reducerea costurilor de energie?",
      description: "Analiza datelor din 150+ proiecte BMS implementate in Romania arata economii semnificative — dar rezultatele variaza in functie de sector si complexitate.",
      date: "15 IAN 2026",
      readTime: "12 MIN CITIRE",
      authorName: "Andrei Popescu",
      authorRole: "Director Tehnic",
    },
    secondary: [
      { category: "Studiu de caz", title: "Cum a redus Therme Bucuresti costurile cu 38%",            date: "20 DEC 2025", readTime: "8 MIN CITIRE"  },
      { category: "Studiu de caz", title: "Radisson Blu Bucuresti: automatizare hotel 5 stele",       date: "5 DEC 2025",  readTime: "7 MIN CITIRE"  },
      { category: "Raport de piata", title: "Piata BMS din Romania: Tendinte si Previziuni 2026",    date: "10 DEC 2025", readTime: "10 MIN CITIRE" },
    ],
    articles: [
      { category: "Ghid tehnic",    title: "Optimizarea performantei hoteliere prin automatizare si management energetic",   description: "Cum pot hotelurile moderne sa reduca costurile cu energia cu 25-65% mentinand confortul oaspetilor.", date: "20 FEB 2026", readTime: "18 MIN CITIRE" },
      { category: "Ghid tehnic",    title: "Integrarea protocoalelor BACnet si KNX: Ghid complet 2026",                      description: "Tot ce trebuie sa stii despre integrarea celor mai populare protocoale de automatizare.", date: "15 DEC 2025", readTime: "15 MIN CITIRE" },
      { category: "Date & Analize", title: "ROI in automatizarea BMS: Ce arata datele din 150 de proiecte",                 description: "Analiza detaliata a perioadelor de amortizare si a randamentului investitiei pentru sistemele BMS.", date: "28 NOV 2025", readTime: "11 MIN CITIRE" },
      { category: "Ghid tehnic",    title: "Alegerea senzorilor potriviti pentru proiectul tau BMS",                        description: "Ghid complet pentru selectarea senzorilor de temperatura, umiditate si calitate a aerului.", date: "20 NOV 2025", readTime: "9 MIN CITIRE" },
      { category: "Date & Analize", title: "Conformitatea EPBD in 2026: Ce trebuie sa stie proprietarii de cladiri",        description: "Cerinte obligatorii si cum te poate ajuta un BMS sa le indeplinesti in avans.", date: "10 NOV 2025", readTime: "8 MIN CITIRE" },
    ],
    guideBand: {
      label: "• GHID BMS",
      title: "Ghid BMS Gratuit",
      sub: "Evalueaza potentialul cladirii tale",
      cta: "Descarca ghidul",
    },
    caseBand: {
      label: "• STUDIU DE CAZ",
      quote: "Sovitech Control a implementat un sistem BMS complet pentru complexul nostru. Automatizarea HVAC și managementul energetic au redus consumul cu 35%.",
    },
    toolDescs: [
      "Cât poți economisi cu un BMS?",
      "Evalueaza potentialul cladirii tale",
      "Analiza pietei de automatizare 2025",
      "Portofoliul nostru de proiecte BMS",
    ],
  },
  en: {
    label: "• Resources",
    hero: "The latest on building automation.",
    heroSub: "Data, analysis, case studies and technical guides for BMS professionals.",
    categories: [
      { name: "Featured",           slug: "featured" },
      { name: "Data & Analysis",    slug: "data",         count: 12 },
      { name: "Case Studies",       slug: "case-studies", count: 8  },
      { name: "Technical Guides",   slug: "guides",       count: 15 },
      { name: "Market Reports",     slug: "reports",      count: 4  },
      { name: "All Articles",       slug: "all" },
    ],
    latest: "• LATEST ARTICLES",
    viewMore: "View more articles",
    readLabel: "Read",
    exploreCat: "EXPLORE BY CATEGORY",
    catItems: ["All articles", "Data & Analysis", "Case Studies", "Technical Guides", "Market Reports"],
    sectorGuides: "SECTOR GUIDES",
    sectors: ["Civil & Office", "Medical & Pharma", "Retail & HORECA", "Industrial", "Data Centres", "Infrastructure"],
    tools: "TOOLS",
    toolItems: [
      { label: "ROI Calculator",          href: "/calculator-roi"           },
      { label: "BMS Guide",               href: "/ghid-bms"                 },
      { label: "Market Report",           href: "/resurse/raport-piata"     },
      { label: "Projects & References",   href: "/resurse/referinte"        },
    ],
    newsletter: "NEWSLETTER",
    newsletterTitle: "Stay ahead of the industry",
    newsletterSub: "Monthly analyses, case studies and technical guides straight to your inbox.",
    emailPlaceholder: "Your email address",
    subscribe: "Subscribe",
    featured: {
      category: "Data & Analysis",
      title: "How efficient are BMS systems at reducing energy costs?",
      description: "Analysis of data from 150+ BMS projects implemented in Romania shows significant savings — but results vary depending on sector and complexity.",
      date: "JAN 15, 2026",
      readTime: "12 MIN READ",
      authorName: "Andrei Popescu",
      authorRole: "Technical Director",
    },
    secondary: [
      { category: "Case Study",    title: "How Therme Bucharest cut costs by 38%",                     date: "DEC 20, 2025", readTime: "8 MIN READ"  },
      { category: "Case Study",    title: "Radisson Blu Bucharest: 5-star hotel automation",           date: "DEC 5, 2025",  readTime: "7 MIN READ"  },
      { category: "Market Report", title: "The Romanian BMS Market: Trends and Forecasts 2026",       date: "DEC 10, 2025", readTime: "10 MIN READ" },
    ],
    articles: [
      { category: "Technical Guide",   title: "Optimising hotel performance through automation and energy management",  description: "How modern hotels can reduce energy costs by 25-65% while maintaining guest comfort.", date: "FEB 20, 2026", readTime: "18 MIN READ" },
      { category: "Technical Guide",   title: "Integrating BACnet and KNX protocols: Complete guide 2026",             description: "Everything you need to know about integrating the most popular automation protocols.", date: "DEC 15, 2025", readTime: "15 MIN READ" },
      { category: "Data & Analysis",   title: "ROI in BMS automation: What the data from 150 projects shows",         description: "Detailed analysis of payback periods and return on investment for BMS systems.", date: "NOV 28, 2025", readTime: "11 MIN READ" },
      { category: "Technical Guide",   title: "Choosing the right sensors for your BMS project",                      description: "Complete guide to selecting temperature, humidity and air quality sensors.", date: "NOV 20, 2025", readTime: "9 MIN READ" },
      { category: "Data & Analysis",   title: "EPBD compliance in 2026: What building owners need to know",           description: "Mandatory requirements and how a BMS can help you meet them ahead of time.", date: "NOV 10, 2025", readTime: "8 MIN READ" },
    ],
    guideBand: {
      label: "• BMS GUIDE",
      title: "Free BMS Guide",
      sub: "Assess the potential of your building",
      cta: "Download the guide",
    },
    caseBand: {
      label: "• CASE STUDY",
      quote: "Sovitech Control implemented a full BMS system for our complex. HVAC automation and energy management reduced our consumption by 35%.",
    },
    toolDescs: [
      "How much could you save with a BMS?",
      "Assess the potential of your building",
      "Automation market analysis 2025",
      "Our portfolio of BMS projects",
    ],
  },
}

// ── Static data (images / hrefs don't change with lang) ─────────────────────

const featuredImage = "/placeholder.svg"
const featuredAuthorImage = "/placeholder-user.jpg"
const featuredHref = "/resurse/articole/eficienta-bms"

const secondaryStatic = [
  { image: "/placeholder.svg", href: "/resurse/studii-de-caz/therme-bucuresti" },
  { image: "/placeholder.svg", href: "/resurse/studii-de-caz/radisson-bucuresti" },
  { image: "/placeholder.svg", href: "/resurse/raport-piata" },
]

const articleStatic = [
  { image: "/placeholder.svg", href: "/resurse/articole/optimizare-hotel-bms" },
  { image: "/placeholder.svg", href: "#" },
  { image: "/placeholder.svg", href: "#" },
  { image: "/placeholder.svg", href: "#" },
  { image: "/placeholder.svg", href: "#" },
]

const caseBandHref = "/resurse/studii-de-caz/therme-bucuresti"
const caseBandThumb = "/placeholder.svg"
const guideBandCover = "/placeholder.svg"

const toolCardColors = ["#C5C0F5", "#C8E6C9", "#E8C5B8", "#E8E8C0"]

const categoryColors: Record<string, { bg: string; text: string }> = {
  "Data & Analysis":    { bg: "#C5C0F5", text: "#5C5FD4" },
  "Date & Analize":     { bg: "#C5C0F5", text: "#5C5FD4" },
  "Case Study":         { bg: "#C8E6C9", text: "#1F6B4A" },
  "Studiu de caz":      { bg: "#C8E6C9", text: "#1F6B4A" },
  "Case Studies":       { bg: "#C8E6C9", text: "#1F6B4A" },
  "Studii de caz":      { bg: "#C8E6C9", text: "#1F6B4A" },
  "Technical Guide":    { bg: "#C8E6C9", text: "#1F6B4A" },
  "Ghid tehnic":        { bg: "#C8E6C9", text: "#1F6B4A" },
  "Technical Guides":   { bg: "#C8E6C9", text: "#1F6B4A" },
  "Ghiduri tehnice":    { bg: "#C8E6C9", text: "#1F6B4A" },
  "Market Report":      { bg: "#C5C0F5", text: "#5C5FD4" },
  "Raport de piata":    { bg: "#C5C0F5", text: "#5C5FD4" },
  "Market Analysis":    { bg: "#C5C0F5", text: "#5C5FD4" },
}

function CategoryBadge({ category }: { category: string }) {
  const colors = categoryColors[category] ?? { bg: "#C8E6C9", text: "#1F6B4A" }
  return (
    <span
      className="inline-block text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {category}
    </span>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ResursePage() {
  const { lang } = useLanguage()
  const [activeCategory, setActiveCategory] = useState("featured")
  const t = translations[lang]

  // "latest" row = the 3 secondary posts + the first long-form article (4-up
  // row per the editorial layout); the remaining articles feed the archive list
  const latestRow = [
    ...t.secondary.map((post, i) => ({ ...post, ...secondaryStatic[i] })),
    { ...t.articles[0], ...articleStatic[0] },
  ]
  const archiveRows = t.articles.slice(1).map((article, i) => ({ ...article, ...articleStatic[i + 1] }))

  return (
    <div className="min-h-screen bg-[#F5F4F0]">

      {/* ── Hero: compact editorial masthead + filter chips ────── */}
      <section className="bg-[#F5F4F0] border-b border-[#0D2E2B]/10">
        <div className="container-site pt-20 pb-10">
          <p className="section-label text-[#1F6B4A] mb-4">{t.label}</p>
          <h1 className="text-5xl md:text-6xl font-light text-[#0D2E2B] leading-none tracking-tighter mb-4 max-w-3xl text-balance">
            {t.hero}
          </h1>
          <p className="text-[#888888] font-light text-lg max-w-lg leading-relaxed">
            {t.heroSub}
          </p>

          {/* Category filter chips */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none mt-10">
            {t.categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-wide rounded-[1px] border transition-colors duration-150 ${
                  activeCategory === cat.slug
                    ? "bg-[#0D2E2B] border-[#0D2E2B] text-white"
                    : "bg-white border-[#0D2E2B]/15 text-[#0D2E2B]/60 hover:text-[#0D2E2B] hover:border-[#0D2E2B]/30"
                }`}
              >
                {cat.name}
                {"count" in cat && cat.count !== undefined && (
                  <span className={`text-[10px] ${activeCategory === cat.slug ? "text-[#C8E6C9]" : "text-[#0D2E2B]/30"}`}>
                    {cat.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured: split card, visual left / editorial right ── */}
      <section className="bg-white border-b border-[#0D2E2B]/8">
        <div className="container-site py-16">
          <Link href={featuredHref} className="group grid lg:grid-cols-[1.15fr_1fr] gap-10 items-center">
            <div className="relative aspect-[16/10] rounded-[2px] overflow-hidden bg-[#0D2E2B]/5 border border-[#0D2E2B]/8">
              <Image
                src={featuredImage}
                alt={t.featured.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <div>
              <CategoryBadge category={t.featured.category} />
              <h2 className="text-3xl md:text-4xl font-light text-[#0D2E2B] leading-tight tracking-tighter mt-4 mb-4 group-hover:text-[#1F6B4A] transition-colors text-balance">
                {t.featured.title}
              </h2>
              <p className="text-[#888888] font-light leading-relaxed mb-5 text-sm max-w-xl">
                {t.featured.description}
              </p>
              <p className="text-xs text-[#888888] mb-6">
                {t.featured.date} &nbsp;·&nbsp;{" "}
                <span className="text-[#1F6B4A] font-medium">{t.featured.readTime}</span>
              </p>
              <div className="flex items-center gap-2.5 pt-5 border-t border-[#0D2E2B]/8">
                <div className="relative h-8 w-8 overflow-hidden rounded-full bg-[#F5F4F0] flex-shrink-0">
                  <Image src={featuredAuthorImage} alt={t.featured.authorName} fill className="object-cover" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#0D2E2B]">{t.featured.authorName}</p>
                  <p className="text-[10px] text-[#888888]">{t.featured.authorRole}</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Latest: compact 4-up row ───────────────────────────── */}
      <section className="py-16 bg-[#F5F4F0] border-b border-[#0D2E2B]/8">
        <div className="container-site">
          <p className="section-label mb-8">{t.latest}</p>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {latestRow.map((post, i) => (
              <Link key={i} href={post.href} className="group flex flex-col">
                <div className="relative aspect-[16/10] rounded-[2px] overflow-hidden bg-[#0D2E2B]/5 border border-[#0D2E2B]/8 mb-4">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <CategoryBadge category={post.category} />
                <h3 className="font-light text-[#0D2E2B] leading-snug text-base mt-3 mb-3 group-hover:text-[#1F6B4A] transition-colors line-clamp-2 flex-1">
                  {post.title}
                </h3>
                <p className="text-[10px] text-[#888888] pt-3 border-t border-[#0D2E2B]/8">
                  {post.date} &nbsp;·&nbsp; {post.readTime}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Guide: full-bleed dark promo band ──────────────────── */}
      <section className="bg-[#07201C]">
        <div className="container-site py-20 grid lg:grid-cols-[1.3fr_1fr] gap-16 items-center">
          <div>
            <p className="section-label text-[#C8E6C9] mb-6">{t.guideBand.label}</p>
            <h2 className="text-4xl md:text-5xl font-light text-white leading-tight tracking-tighter mb-4 max-w-xl">
              {t.guideBand.title}
            </h2>
            <p className="text-white/50 font-light text-lg leading-relaxed mb-8">
              {t.guideBand.sub}
            </p>
            <Link
              href="/ghid-bms"
              className="inline-flex items-center gap-2 bg-white text-[#07201C] text-sm font-semibold px-6 py-3.5 rounded-[1px] hover:bg-[#C8E6C9] transition-colors duration-300"
            >
              {t.guideBand.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <Link href="/ghid-bms" className="group justify-self-center lg:justify-self-end">
            <div className="relative w-64 md:w-72 aspect-[3/4] rounded-[2px] overflow-hidden border border-white/10 bg-white/5">
              <Image
                src={guideBandCover}
                alt={t.guideBand.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
          </Link>
        </div>
      </section>

      {/* ── Case study: centered pull-quote + source row ────────── */}
      <section className="bg-white border-b border-[#0D2E2B]/8">
        <div className="max-w-4xl mx-auto px-8 py-20">
          <p className="section-label mb-10 text-center">{t.caseBand.label}</p>
          <blockquote className="text-2xl md:text-3xl font-light text-[#0D2E2B] leading-tight tracking-tighter text-center text-balance mb-12">
            &ldquo;{t.caseBand.quote}&rdquo;
          </blockquote>
          <Link href={caseBandHref} className="group flex items-center gap-5 max-w-xl mx-auto pt-8 border-t border-[#0D2E2B]/8">
            <div className="relative h-14 w-14 rounded-[2px] overflow-hidden bg-[#F5F4F0] border border-[#0D2E2B]/8 flex-shrink-0">
              <Image src={caseBandThumb} alt={t.secondary[0].title} fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-light text-sm text-[#0D2E2B] leading-snug group-hover:text-[#1F6B4A] transition-colors">
                {t.secondary[0].title}
              </h3>
              <p className="text-[10px] text-[#888888] mt-1">
                {t.secondary[0].date} &nbsp;·&nbsp; {t.secondary[0].readTime}
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-[#0D2E2B]/20 group-hover:text-[#1F6B4A] transition-colors flex-shrink-0" />
          </Link>
        </div>
      </section>

      {/* ── Tools: dark band with pastel utility cards ──────────── */}
      <section className="bg-[#07201C]">
        <div className="container-site py-20">
          <p className="section-label text-[#C8E6C9] mb-10">• {t.tools}</p>
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
                  <p className="text-sm text-[#0D2E2B]/60 font-light mt-1.5 leading-snug">
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

      {/* ── Archive: editorial list rows ─────────────────────────── */}
      <section className="py-16 bg-[#F5F4F0]">
        <div className="max-w-5xl mx-auto px-8">
          <p className="section-label mb-8">• {t.catItems[0].toUpperCase()}</p>
          <div className="flex flex-col divide-y divide-[#0D2E2B]/8 border-y border-[#0D2E2B]/8">
            {archiveRows.map((article, i) => (
              <Link key={i} href={article.href} className="group flex gap-6 py-6 items-center">
                <div className="relative h-24 w-40 flex-shrink-0 rounded-[2px] overflow-hidden bg-[#0D2E2B]/5 border border-[#0D2E2B]/8 hidden sm:block">
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <CategoryBadge category={article.category} />
                  <h3 className="font-light text-[#0D2E2B] leading-snug text-lg mt-2 mb-1.5 group-hover:text-[#1F6B4A] transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-[10px] text-[#888888]">
                    {article.date} &nbsp;·&nbsp; {article.readTime}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#0D2E2B]/20 group-hover:text-[#1F6B4A] transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button className="inline-flex items-center gap-2 border border-[#0D2E2B]/15 bg-white text-[#0D2E2B] text-sm font-semibold px-7 py-3.5 rounded-[1px] hover:border-[#0D2E2B]/30 hover:bg-[#F5F4F0] transition-colors">
              {t.viewMore}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Explore footer ────────────────────────────────────── */}
      <section className="bg-white border-t border-[#0D2E2B]/8 py-16">
        <div className="container-site">
          <div className="grid md:grid-cols-[1fr_1fr_1fr_1fr] gap-12">

            <div>
              <p className="section-label mb-6">{t.exploreCat}</p>
              <ul className="space-y-3">
                {t.catItems.map((c) => (
                  <li key={c}>
                    <Link href="#" className="text-sm text-[#0D2E2B]/60 hover:text-[#0D2E2B] font-medium transition-colors flex items-center justify-between group">
                      {c}
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="section-label mb-6">{t.sectorGuides}</p>
              <ul className="space-y-3">
                {t.sectors.map((s) => (
                  <li key={s}>
                    <Link href="#" className="text-sm text-[#0D2E2B]/60 hover:text-[#0D2E2B] font-medium transition-colors flex items-center justify-between group">
                      {s}
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="section-label mb-6">{t.tools}</p>
              <ul className="space-y-3">
                {t.toolItems.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-[#0D2E2B]/60 hover:text-[#0D2E2B] font-medium transition-colors flex items-center justify-between group">
                      {item.label}
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div className="bg-[#0D2E2B] rounded-[2px] p-7 flex flex-col">
              <p className="section-label text-[#1F6B4A] mb-4">{t.newsletter}</p>
              <h3 className="text-xl font-light text-white leading-snug mb-3">
                {t.newsletterTitle}
              </h3>
              <p className="text-white/50 text-sm font-light leading-relaxed mb-6 flex-1">
                {t.newsletterSub}
              </p>
              <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-2">
                <input
                  type="email"
                  placeholder={t.emailPlaceholder}
                  className="h-11 rounded-[2px] border border-white/12 bg-white/8 px-4 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-white/25"
                />
                <button
                  type="submit"
                  className="h-11 bg-white text-[#0D2E2B] text-sm font-bold rounded-[2px] hover:bg-[#F5F4F0] transition-colors"
                >
                  {t.subscribe}
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

    </div>
  )
}
