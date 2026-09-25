"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { getSectorBySlug, getRelatedSectors, localizeSector } from "@/lib/sector-data"
import { useLanguage } from "@/lib/language-context"
import { expertizaHref } from "@/lib/site-routes"
import { HeroField } from "@/components/hero-field"

export function SectorPageClient({ slug }: { slug: string }) {
  const { t, lang } = useLanguage()
  const base = getSectorBySlug(slug)!
  const sector = localizeSector(base, lang)
  const related = getRelatedSectors(base.relatedSectors).map((s) => localizeSector(s, lang))

  const accentBg = sector.accentColor
  const accentText = sector.accentTextDark ? "#0D2E2B" : "#ffffff"
  // darker counterpart of light accents, for text sitting on light backgrounds
  const accentOnLight =
    ({ "#C5C0F5": "#5C5FD4", "#C8E6C9": "#1F6B4A", "#E07B6A": "#B14A36" } as Record<string, string>)[
      sector.accentColor
    ] ?? sector.accentColor

  return (
    <div className="min-h-screen bg-[#F5F4F0]">

      {/* ── HERO ── */}
      <section className="bg-[#07201C] relative overflow-hidden">
        <HeroField />
        {/* Accent colour bar top */}
        <div className="h-1 w-full relative z-10" style={{ backgroundColor: accentBg }} />

        <div className="container-site pt-20 pb-24 relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-3 mb-12">
            <Link
              href="/expertiza"
              className="flex items-center gap-2 text-white/40 text-sm hover:text-white/70 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("Toate sectoarele", "All sectors")}
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-sm font-medium" style={{ color: accentBg }}>
              {sector.title}
            </span>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-end">
            {/* Left */}
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-widest uppercase mb-6"
                style={{ backgroundColor: accentBg + "22", color: accentBg }}
              >
                • {sector.title}
              </div>
              <h1 className="text-6xl md:text-7xl font-light text-white leading-[1.0] tracking-tighter mb-6 whitespace-pre-line">
                {sector.heroHeadline}
              </h1>
              <p className="text-lg text-white/50 font-light leading-relaxed max-w-lg">
                {sector.heroSubheadline}
              </p>
              <div className="flex items-center gap-4 mt-10">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-[1px] transition-colors duration-300"
                  style={{ backgroundColor: accentBg, color: accentText }}
                >
                  {t("Vorbește cu un specialist", "Talk to a specialist")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/calculator-roi"
                  className="text-white/50 text-sm border border-white/15 px-5 py-3 rounded-[1px] hover:text-white hover:border-white/30 transition-colors duration-300"
                >
                  {t("Calculează ROI", "Calculate ROI")}
                </Link>
              </div>
            </div>

            {/* Right — metrics strip */}
            <div className="grid grid-cols-2 gap-4">
              {sector.metrics.map((m, i) => (
                <div
                  key={i}
                  className="rounded-[2px] p-6 border border-white/8"
                  style={{ backgroundColor: "#ffffff08" }}
                >
                  <p className="text-3xl font-light text-white mb-1">{m.value}</p>
                  <p className="text-xs text-white/40 font-light leading-snug">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUSTED BY strip ── */}
      <section className="bg-white border-b border-[#0D2E2B]/8 py-8">
        <div className="container-site flex flex-col sm:flex-row items-center gap-6">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#888888] whitespace-nowrap">
            {t("De încredere pentru", "Trusted by")}
          </p>
          <div className="h-px flex-1 bg-[#0D2E2B]/8 hidden sm:block" />
          <div className="flex flex-wrap items-center gap-8">
            {["Therme Nord", "Radisson Blu", "Athenee Palace Hilton", "Rompharm", "NTN-SNR", "Spitalul Foișor"].map((name) => (
              <span key={name} className="text-sm font-semibold text-[#0D2E2B]/30 tracking-wide">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="section-xl bg-[#F5F4F0]">
        <div className="container-site">
          <div className="max-w-2xl mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: accentOnLight }}>
              • {t("Capabilități", "Capabilities")}
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] tracking-tighter leading-tight">
              {t("Software premium,", "Premier software,")}<br />{t("servicii premium.", "premier service.")}
            </h2>
            <p className="text-base text-[#888888] font-light mt-4 leading-relaxed">
              {sector.description}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sector.features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <div
                  key={i}
                  className="bg-white rounded-[2px] p-8 border border-[#0D2E2B]/6 hover:border-[#0D2E2B]/12 transition-colors"
                >
                  <div
                    className="w-11 h-11 rounded-[2px] flex items-center justify-center mb-5"
                    style={{ backgroundColor: accentBg + "22" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: accentOnLight }} />
                  </div>
                  <h3 className="text-base font-light text-[#0D2E2B] mb-2">{feature.title}</h3>
                  <p className="text-sm text-[#888888] font-light leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES LIST + IMAGE ── */}
      <section className="section-l bg-white">
        <div className="container-site grid lg:grid-cols-2 gap-16 items-center">
          {/* List */}
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-4 text-[#888888]">
              • {t("Ce livrăm", "What we deliver")}
            </p>
            <h2 className="text-3xl lg:text-4xl font-light text-[#0D2E2B] tracking-tighter mb-10">
              {t("Tot ce are nevoie clădirea ta.", `Everything your ${sector.title.toLowerCase()} needs.`)}
            </h2>
            <ul className="space-y-4">
              {sector.capabilities.map((cap, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div
                    className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0"
                    style={{ backgroundColor: accentBg }}
                  >
                    <Check className="h-3.5 w-3.5" style={{ color: accentText }} />
                  </div>
                  <span className="text-base text-[#0D2E2B] font-light leading-relaxed">{cap}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Image */}
          <div className="aspect-[4/3] rounded-[2px] overflow-hidden bg-[#F5F4F0]">
            <img
              src={sector.image}
              alt={t(`Instalație BMS, ${sector.title}`, `${sector.title} BMS installation`)}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── RELATED SECTORS ── */}
      {related.length > 0 && (
        <section className="section-l bg-[#F5F4F0]">
          <div className="container-site">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3 text-[#888888]">
              • {t("Alte sectoare", "Other sectors")}
            </p>
            <h2 className="text-3xl lg:text-4xl font-light text-[#0D2E2B] tracking-tighter mb-12">
              {t("Explorează industrii conexe", "Explore related industries")}
            </h2>
            <div className="grid md:grid-cols-3 gap-5">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  href={expertizaHref(rel.slug)}
                  className="group relative rounded-[2px] p-8 flex flex-col justify-between min-h-[200px] overflow-hidden transition-transform duration-200 hover:scale-[1.02]"
                  style={{ backgroundColor: rel.accentColor }}
                >
                  <div>
                    <span
                      className="text-xs tracking-widest uppercase font-semibold"
                      style={{ color: rel.accentTextDark ? "#0D2E2B" : "rgba(255,255,255,0.6)" }}
                    >
                      {rel.subtitle}
                    </span>
                    <h3
                      className="text-2xl font-light mt-2 tracking-tighter"
                      style={{ color: rel.accentTextDark ? "#0D2E2B" : "#ffffff" }}
                    >
                      {rel.title}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <span
                      className="text-sm font-medium"
                      style={{ color: rel.accentTextDark ? "#0D2E2B99" : "rgba(255,255,255,0.9)" }}
                    >
                      {t("Explorează sectorul", "Explore sector")}
                    </span>
                    <ArrowRight
                      className="h-5 w-5 group-hover:translate-x-1 transition-transform"
                      style={{ color: rel.accentTextDark ? "#0D2E2B" : "#ffffff" }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="bg-white border-t border-[#0D2E2B]/8 section-l">
        <div className="container-site flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: accentOnLight }}>
              • {t("Începe acum", "Get started")}
            </p>
            <h2 className="text-3xl lg:text-4xl font-light text-[#0D2E2B] tracking-tighter leading-tight">
              {t("Pregătit să-ți optimizezi clădirea?", `Ready to optimise your ${sector.title.toLowerCase()} building?`)}
            </h2>
            <p className="text-[#888888] font-light mt-3 text-base leading-relaxed">
              {t(
                "Vorbește cu unul dintre specialiștii noștri și primești o estimare ROI personalizată în 48 de ore.",
                "Talk to one of our specialists and get a personalised ROI estimate within 48 hours."
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-7 py-4 rounded-[1px] transition-colors duration-300"
              style={{ backgroundColor: accentBg, color: accentText }}
            >
              {t("Vorbește cu un specialist", "Talk to a specialist")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/calculator-roi"
              className="inline-flex items-center justify-center gap-2 bg-[#0D2E2B] text-white text-sm font-semibold px-7 py-4 rounded-[1px] hover:bg-[#1F6B4A] transition-colors duration-300"
            >
              {t("Calculează ROI", "Calculate ROI")}
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
