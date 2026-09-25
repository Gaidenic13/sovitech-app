"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

interface CaseStudy {
  id: number
  slug: string
  clientName: string
  clientRole: string
  clientCompany: string
  industryRo: string
  industryEn: string
  quoteRo: string
  quoteEn: string
  stat1: string
  stat1LabelRo: string
  stat1LabelEn: string
  stat2: string
  stat2LabelRo: string
  stat2LabelEn: string
  stat3: string
  stat3LabelRo: string
  stat3LabelEn: string
  image: string
  accentColor: string
}

const caseStudies: CaseStudy[] = [
  {
    id: 1,
    slug: "therme-bucuresti",
    clientName: "Ion Popescu",
    clientRole: "Director Tehnic",
    clientCompany: "Therme Bucharest",
    industryRo: "HORECA — Spa & Wellness",
    industryEn: "HORECA — Spa & Wellness",
    quoteRo: "Sovitech Control a implementat un sistem BMS complet pentru complexul nostru. Automatizarea HVAC și managementul energetic au redus consumul cu 35%.",
    quoteEn: "Sovitech Control implemented a full BMS system for our complex. HVAC automation and energy management reduced our consumption by 35%.",
    stat1: "35%",
    stat1LabelRo: "Reducere consum",
    stat1LabelEn: "Consumption reduction",
    stat2: "€158K",
    stat2LabelRo: "Economii anuale",
    stat2LabelEn: "Annual savings",
    stat3: "6 sapt",
    stat3LabelRo: "Implementare",
    stat3LabelEn: "Implementation",
    image: "/thermal-spa-modern-building.jpg",
    accentColor: "#C8E6C9",
  },
  {
    id: 2,
    slug: "radisson-bucuresti",
    clientName: "Maria Ionescu",
    clientRole: "Facility Manager",
    clientCompany: "Radisson Blu Bucharest",
    industryRo: "HORECA — Hotel",
    industryEn: "HORECA — Hotel",
    quoteRo: "Sistemul BMS de la Sovitech a transformat complet modul în care operăm. Controlul integrat ne oferă transparență totală și economii substanțiale.",
    quoteEn: "The BMS system from Sovitech completely transformed how we operate. Integrated control gives us total transparency and substantial savings.",
    stat1: "40%",
    stat1LabelRo: "Eficiență operațională",
    stat1LabelEn: "Operational efficiency",
    stat2: "200+",
    stat2LabelRo: "Puncte monitorizare",
    stat2LabelEn: "Monitoring points",
    stat3: "2 ani",
    stat3LabelRo: "Perioadă ROI",
    stat3LabelEn: "ROI period",
    image: "/luxury-hotel-lobby-modern-interior.jpg",
    accentColor: "#C5C0F5",
  },
  {
    id: 3,
    slug: "therme-bucuresti",
    clientName: "Andrei Vasile",
    clientRole: "Director Operatiuni",
    clientCompany: "Rompharm Company",
    industryRo: "Farmaceutic",
    industryEn: "Pharmaceutical",
    quoteRo: "În industria farmaceutică, precizia este esențială. Sistemul Sovitech asigură condiții optime de temperatură și umiditate, cu raportare completă conform GMP.",
    quoteEn: "In the pharmaceutical industry, precision is essential. The Sovitech system ensures optimal temperature and humidity conditions, with full GMP-compliant reporting.",
    stat1: "99.9%",
    stat1LabelRo: "Disponibilitate sistem",
    stat1LabelEn: "System uptime",
    stat2: "±0.5°C",
    stat2LabelRo: "Precizie temperatura",
    stat2LabelEn: "Temperature precision",
    stat3: "GMP",
    stat3LabelRo: "Conformitate",
    stat3LabelEn: "Compliance",
    image: "/sector-industrial-factory.jpg",
    accentColor: "#D4C4A8",
  },
]

export function CaseStudySlider() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const { t } = useLanguage()
  const current = caseStudies[currentIndex]

  return (
    <section className="bg-[#F5F4F0] py-24">
      <div className="container-site">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-sm text-[#888888] font-semibold tracking-wider uppercase mb-2">• {t("Studii de caz", "Case studies")}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] tracking-tighter">
              {t("Povești de succes", "Success stories")}
            </h2>
          </div>
          <Link href="/resurse/referinte" className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-[#1F6B4A] hover:gap-3 transition-all">
            {t("Toate studiile de caz", "All case studies")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-[2px] overflow-hidden bg-white border border-[#0D2E2B]/10">
          <div className="grid lg:grid-cols-2">
            <div className="relative aspect-[4/3] lg:aspect-auto overflow-hidden bg-[#F5F4F0]">
              <img src={current.image} alt={current.clientCompany} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D2E2B]/40 to-transparent lg:bg-gradient-to-r" />
              <div className="absolute bottom-4 left-4">
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-[#0D2E2B]" style={{ backgroundColor: current.accentColor }}>
                  {t(current.industryRo, current.industryEn)}
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between p-8 md:p-10 lg:p-12">
              <div>
                <blockquote className="mb-8">
                  <p className="text-[#0D2E2B] text-lg font-light leading-relaxed mb-6">
                    {'"'}{t(current.quoteRo, current.quoteEn)}{'"'}
                  </p>
                  <footer className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-[#0D2E2B] font-light text-sm flex-shrink-0" style={{ backgroundColor: current.accentColor }}>
                      {current.clientName.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="font-semibold text-[#0D2E2B] text-sm">{current.clientName}</div>
                      <div className="text-[#888888] text-xs">{current.clientRole}, {current.clientCompany}</div>
                    </div>
                  </footer>
                </blockquote>

                <div className="grid grid-cols-3 divide-x divide-[#0D2E2B]/10 py-6 border-t border-[#0D2E2B]/10">
                  {[
                    { v: current.stat1, ro: current.stat1LabelRo, en: current.stat1LabelEn },
                    { v: current.stat2, ro: current.stat2LabelRo, en: current.stat2LabelEn },
                    { v: current.stat3, ro: current.stat3LabelRo, en: current.stat3LabelEn },
                  ].map((s, i) => (
                    <div key={i} className={i > 0 ? "pl-4" : ""}>
                      <div className="text-2xl font-light text-[#0D2E2B] tracking-tighter leading-none mb-1">{s.v}</div>
                      <div className="text-xs text-[#888888] font-light">{t(s.ro, s.en)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <Link href={`/resurse/studii-de-caz/${current.slug}`} className="inline-flex items-center gap-2 bg-[#0D2E2B] text-white text-sm font-medium px-5 py-2.5 rounded-[1px] transition-colors duration-300 hover:bg-[#1F6B4A]">
                  {t("Citește studiul de caz complet", "Read the full case study")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {caseStudies.map((_, index) => (
              <button key={index} onClick={() => setCurrentIndex(index)} className={`h-1.5 rounded-full transition-all ${index === currentIndex ? "w-8 bg-[#1F6B4A]" : "w-1.5 bg-[#0D2E2B]/20 hover:bg-[#0D2E2B]/40"}`} aria-label={`${t("Studiu de caz", "Case study")} ${index + 1}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentIndex((p) => (p === 0 ? caseStudies.length - 1 : p - 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#0D2E2B]/15 bg-white hover:bg-[#F5F4F0] transition-colors" aria-label={t("Anterior", "Previous")}>
              <ChevronLeft className="h-4 w-4 text-[#0D2E2B]" />
            </button>
            <button onClick={() => setCurrentIndex((p) => (p === caseStudies.length - 1 ? 0 : p + 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#0D2E2B]/15 bg-white hover:bg-[#F5F4F0] transition-colors" aria-label={t("Următor", "Next")}>
              <ChevronRight className="h-4 w-4 text-[#0D2E2B]" />
            </button>
          </div>
        </div>

        <div className="mt-6 sm:hidden">
          <Link href="/resurse/referinte" className="inline-flex items-center gap-2 text-sm font-medium text-[#1F6B4A] hover:gap-3 transition-all">
            {t("Toate studiile de caz", "All case studies")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
