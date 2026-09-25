"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { sectors, localizeSector } from "@/lib/sector-data"
import { useLanguage } from "@/lib/language-context"
import { expertizaHref } from "@/lib/site-routes"
import { HeroField } from "@/components/hero-field"

export default function SectoarePage() {
  const { t, lang } = useLanguage()

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <section className="bg-[#07201C] min-h-[45vh] flex items-end pt-28 pb-16 relative overflow-hidden">
        <HeroField />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fingerprint-59QWj1Ik1Fd1hqzZduTrEqLz2j557z.svg" alt="" className="h-[600px] w-auto" />
        </div>
        <div className="container-site w-full relative z-10">
          <span className="text-[#C8E6C9] text-sm font-semibold tracking-wider uppercase mb-4 block">• {t("Sectoare", "Sectors")}</span>
          <h1 className="text-5xl md:text-7xl font-light text-white leading-tight tracking-tighter">
            {t("Expertiza BMS", "BMS expertise")}<br />{t("pentru fiecare industrie.", "for every industry.")}
          </h1>
          <p className="text-lg text-white/60 font-light mt-4 max-w-xl">
            {t(
              "Solutii de automatizare adaptate cerintelor specifice fiecarei industrii, de la birouri la productie farmaceutica.",
              "Automation solutions tailored to the specific requirements of each industry, from offices to pharmaceutical production."
            )}
          </p>
        </div>
      </section>

      <section className="bg-[#F5F4F0] section-l">
        <div className="container-site">
          <p className="section-label mb-3">• {t("INDUSTRII", "INDUSTRIES")}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] mb-16 tracking-tighter">
            {t("Alege sectorul tau", "Choose your sector")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-32">
            {sectors.map((raw) => localizeSector(raw, lang)).map((s) => (
              <Link key={s.id} href={expertizaHref(s.slug)} className="group rounded-[2px] p-8 flex items-center justify-center text-center min-h-[200px] hover:scale-[1.02] transition-transform duration-200" style={{ backgroundColor: s.accentColor }}>
                <h3 className="text-2xl font-light tracking-tighter leading-tight" style={{ color: s.accentTextDark ? "#0D2E2B" : "#ffffff" }}>
                  {s.title}
                </h3>
              </Link>
            ))}
          </div>

          <div className="space-y-32">
            {sectors.map((raw) => localizeSector(raw, lang)).map((sector, index) => (
              <div key={sector.id} id={sector.id} className={`flex flex-col gap-16 lg:flex-row lg:items-center ${index % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
                <div className="flex-1">
                  <div className="aspect-[4/3] overflow-hidden rounded-[2px] bg-[#e0ddd7]">
                    <img src={sector.image} alt={sector.title} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                  </div>
                </div>
                <div className="flex-1 space-y-8">
                  <div>
                    <div className="inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-widest uppercase mb-4" style={{ backgroundColor: sector.accentColor, color: sector.accentTextDark ? "#0D2E2B" : "rgba(255,255,255,0.9)" }}>
                      {sector.title}
                    </div>
                    <h2 className="text-3xl lg:text-4xl font-light text-[#0D2E2B] tracking-tighter mb-3">{sector.title}</h2>
                    <p className="text-base text-[#888888] font-light">{sector.description}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase text-[#888888] mb-4">{t("Capabilitati cheie", "Key capabilities")}</p>
                    <ul className="space-y-3">
                      {sector.capabilities.slice(0, 4).map((cap, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-2 h-1 w-4 rounded-full bg-[#0D2E2B]/30 flex-shrink-0" />
                          <span className="text-sm text-[#0D2E2B] font-light leading-relaxed">{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[2px] bg-white p-6 border border-[#0D2E2B]/8">
                    <p className="text-xs font-semibold tracking-widest uppercase text-[#888888] mb-4">{t("Rezultate cheie", "Key results")}</p>
                    <ul className="space-y-3">
                      {sector.metrics.map((metric, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0" style={{ backgroundColor: sector.accentColor }}>
                            <svg className="h-3 w-3" style={{ color: sector.accentTextDark ? "#0D2E2B" : "#fff" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-[#0D2E2B]"><strong>{metric.value}</strong> {metric.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link href={expertizaHref(sector.slug)} className="inline-flex items-center gap-2 text-sm font-semibold hover:gap-3 transition-all" style={{ color: ["#C5C0F5","#C8E6C9","#E07B6A"].includes(sector.accentColor) ? "#0D2E2B" : sector.accentColor }}>
                    {t("Exploreaza solutiile", "Explore")} {sector.title}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#07201C] section-l">
        <div className="container-site flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="section-label text-[#1F6B4A] mb-2">• {t("PROIECTE", "PROJECTS")}</p>
            <h2 className="text-3xl font-light text-white tracking-tighter">
              {t("Solutia BMS perfecta pentru industria ta", "The perfect BMS solution for your industry")}
            </h2>
          </div>
          <div className="flex gap-4 flex-shrink-0">
            <Link href="/contact" className="btn-sovitech">{t("Contacteaza un specialist", "Contact a specialist")}</Link>
            <Link href="/referinte" className="btn-sovitech-ghost">{t("Vezi proiecte similare", "View similar projects")}</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
