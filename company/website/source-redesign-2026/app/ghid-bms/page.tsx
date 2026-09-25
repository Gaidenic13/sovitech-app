"use client"

import Link from "next/link"
import { CheckCircle2, Download, FileText, LineChart, ListChecks, Calculator, ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { HeroField } from "@/components/hero-field"

export default function GhidBMSPage() {
  const { t } = useLanguage()

  const benefits = [
    {
      icon: <ListChecks className="h-6 w-6 text-[#1F6B4A]" />,
      title: t("Checklist-uri complete", "Complete Checklists"),
      desc: t(
        "Evaluați infrastructura existentă, potențialul de economii și gradul de pregătire organizațională pentru BMS.",
        "Assess existing infrastructure, savings potential and organisational readiness for BMS.",
      ),
      bg: "#C8E6C9",
    },
    {
      icon: <LineChart className="h-6 w-6 text-[#5C5FD4]" />,
      title: t("Benchmark-uri de industrie", "Industry Benchmarks"),
      desc: t(
        "Comparați consumul energetic actual cu standardele de industrie pentru sectorul dumneavoastră.",
        "Compare your current energy consumption against industry standards for your sector.",
      ),
      bg: "#C5C0F5",
    },
    {
      icon: <Calculator className="h-6 w-6 text-[#1F6B4A]" />,
      title: t("Template-uri ROI", "ROI Templates"),
      desc: t(
        "Calculați economiile potențiale și perioada de amortizare a investiției în BMS pentru clădirea dumneavoastră.",
        "Calculate the potential savings and investment payback period for BMS in your building.",
      ),
      bg: "#C8E6C9",
    },
  ]

  const sections = [
    {
      num: "01",
      title: t("Evaluarea infrastructurii existente", "Existing Infrastructure Assessment"),
      desc: t(
        "Checklist-uri pentru HVAC, iluminat, sisteme de securitate și consumul energetic actual.",
        "Checklists for HVAC, lighting, security systems and current energy consumption.",
      ),
      items: [
        t("Inventarul echipamentelor și vechimea sistemelor", "Equipment inventory and system age"),
        t(
          "Compatibilitatea cu protocoalele de comunicație (BACnet, KNX, Modbus)",
          "Compatibility with communication protocols (BACnet, KNX, Modbus)",
        ),
        t(
          "Analiza consumului energetic și identificarea pierderilor",
          "Energy consumption analysis and loss identification",
        ),
      ],
    },
    {
      num: "02",
      title: t("Calculul potențialului de economii", "Savings Potential Calculation"),
      desc: t(
        "Metodologie și template-uri pentru estimarea economiilor și a beneficiilor financiare.",
        "Methodology and templates for estimating savings and financial benefits.",
      ),
      items: [
        t(
          "Calculul economiilor de energie: reducere de 25–40% a costurilor operaționale",
          "Energy savings calculation: 25–40% reduction in operational costs",
        ),
        t(
          "Estimarea ROI și perioada de amortizare a investiției (de regulă 2–4 ani)",
          "ROI estimate and investment payback period (typically 2–4 years)",
        ),
        t(
          "Beneficii suplimentare: reducerea emisiilor de CO2, creșterea valorii proprietății",
          "Additional benefits: CO2 emission reduction, increased property value",
        ),
      ],
    },
    {
      num: "03",
      title: t("Benchmark-uri pe sectoare", "Sector Benchmarks"),
      desc: t(
        "Date comparative pentru birouri, retail, medical, HORECA și industrial.",
        "Comparative data for offices, retail, medical, HORECA and industrial.",
      ),
      items: [
        t("Consumul energetic mediu pe sector (kWh/m²/an)", "Average energy consumption by sector (kWh/m²/yr)"),
        t("Costuri operaționale și de mentenanță tipice", "Typical operational and maintenance costs"),
        t(
          "Cazuri de succes și rezultate măsurabile din proiecte reale",
          "Success cases and measurable results from real projects",
        ),
      ],
    },
    {
      num: "04",
      title: t("Planul de implementare", "Implementation Plan"),
      desc: t(
        "Pași concreți pentru a trece de la evaluare la implementarea BMS.",
        "Concrete steps for moving from assessment to BMS implementation.",
      ),
      items: [
        t(
          "Timeline tipic: de la audit la punerea în funcțiune (3–6 luni)",
          "Typical timeline: from audit to commissioning (3–6 months)",
        ),
        t(
          "Resursele necesare și implicarea factorilor de decizie",
          "Required resources and stakeholder involvement",
        ),
        t(
          "Strategii pentru minimizarea întreruperilor operaționale",
          "Strategies to minimise operational disruption",
        ),
      ],
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F4F0]">
      {/* Hero Section */}
      <section className="bg-[#07201C] section-xl relative overflow-hidden">
        <HeroField />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fingerprint-59QWj1Ik1Fd1hqzZduTrEqLz2j557z.svg"
            alt=""
            className="h-[500px] w-auto"
          />
        </div>
        <div className="container-site relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/8 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/60 font-medium mb-6">
              <FileText className="h-3.5 w-3.5" />
              {t("Ghid gratuit de evaluare", "Free Evaluation Guide")}
            </div>
            <h1 className="text-5xl md:text-6xl font-light text-white leading-tight tracking-tighter mb-6 text-balance">
              {t(
                "Evaluați potențialul de automatizare al clădirii dumneavoastră",
                "Assess Your Building's Automation Potential",
              )}
            </h1>
            <p className="text-white/60 font-light text-lg mb-10 max-w-2xl leading-relaxed">
              {t(
                "Obțineți ghidul complet cu checklist-uri, benchmark-uri de industrie și template-uri ROI pentru a determina gradul de pregătire al clădirii dumneavoastră pentru tehnologia BMS.",
                "Get the complete guide with checklists, industry benchmarks and ROI templates to determine your building's readiness for BMS technology.",
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/ghid-bms/descarca"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#0D2E2B] text-sm font-bold px-7 py-3.5 rounded-[2px] hover:bg-[#F5F4F0] transition-colors"
              >
                <Download className="h-4 w-4" />
                {t("Descarcă ghidul gratuit", "Download the Free Guide")}
              </Link>
              <Link
                href="#continut"
                className="inline-flex items-center justify-center gap-2 bg-transparent border border-white/15 text-white text-sm font-medium px-7 py-3.5 rounded-[2px] hover:bg-white/5 transition-colors"
              >
                {t("Vezi cuprinsul", "View Contents")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-white section-l">
        <div className="container-site">
          <div className="max-w-2xl mb-14">
            <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">
              {t("• Ce veți descoperi", "• What you will discover")}
            </p>
            <h2 className="text-3xl lg:text-4xl font-light text-[#0D2E2B] leading-tight tracking-tighter">
              {t("Ce veți găsi în acest ghid", "What You Will Find in This Guide")}
            </h2>
            <p className="text-[#888888] font-light mt-3">
              {t(
                "Un set complet de instrumente pentru evaluarea oportunității de investiție în BMS",
                "A complete toolkit for evaluating the BMS investment opportunity",
              )}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((item) => (
              <div key={item.title} className="rounded-[2px] bg-[#F5F4F0] p-8 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-[2px] flex items-center justify-center" style={{ backgroundColor: item.bg + "60" }}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-light text-[#0D2E2B]">{item.title}</h3>
                <p className="text-sm text-[#888888] font-light leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Overview */}
      <section id="continut" className="bg-[#F5F4F0] section-l">
        <div className="container-site">
          <div className="max-w-2xl mb-14">
            <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">
              {t("• Structura ghidului", "• Guide structure")}
            </p>
            <h2 className="text-3xl lg:text-4xl font-light text-[#0D2E2B] leading-tight tracking-tighter">
              {t("Cuprinsul ghidului", "Guide Contents")}
            </h2>
          </div>

          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.num} className="bg-white rounded-[2px] p-8 flex gap-6">
                <div className="flex-shrink-0">
                  <span className="text-4xl font-light text-[#0D2E2B]/10">{section.num}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-light text-[#0D2E2B] mb-2">{section.title}</h3>
                  <p className="text-sm text-[#888888] font-light mb-4 leading-relaxed">{section.desc}</p>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#1F6B4A] mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-[#0D2E2B] font-light">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#07201C] section-l">
        <div className="container-site">
          <div className="max-w-2xl">
            <p className="text-xs text-[#C8E6C9] font-semibold tracking-widest uppercase mb-3">
              {t("• Descarcă acum", "• Download now")}
            </p>
            <h2 className="text-3xl lg:text-4xl font-light text-white leading-tight tracking-tighter mb-4">
              {t("Sunteți gata să vă evaluați clădirea?", "Ready to Assess Your Building?")}
            </h2>
            <p className="text-white/60 font-light mb-8 leading-relaxed">
              {t(
                "Descărcați ghidul gratuit și începeți evaluarea în doar câteva minute. Fără obligații, fără costuri ascunse.",
                "Download the free guide and start your assessment in just a few minutes. No obligations, no hidden costs.",
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/ghid-bms/descarca"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#0D2E2B] text-sm font-bold px-7 py-3.5 rounded-[2px] hover:bg-[#F5F4F0] transition-colors"
              >
                <Download className="h-4 w-4" />
                {t("Descarcă ghidul acum", "Download the Guide Now")}
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-transparent border border-white/15 text-white text-sm font-medium px-7 py-3.5 rounded-[2px] hover:bg-white/5 transition-colors"
              >
                {t("Programează o consultație", "Schedule a Consultation")}
              </Link>
            </div>
            <p className="text-xs text-white/30 mt-6 font-light">
              {t(
                "Descărcare instantă  ·  Format PDF interactiv  ·  Template-uri Excel editabile",
                "Instant download  ·  Interactive PDF format  ·  Editable Excel templates",
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
