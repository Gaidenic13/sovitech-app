"use client"

import { Check, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

const categoryMeta: Record<string, { labelRo: string; labelEn: string; color: string; textOnBg: string }> = {
  horeca:     { labelRo: "HORECA & Wellness",       labelEn: "HORECA & Wellness",     color: "#8B7B5C", textOnBg: "#ffffff" },
  office:     { labelRo: "Birouri & Office",         labelEn: "Office Buildings",      color: "#C5C0F5", textOnBg: "#0D2E2B" },
  medical:    { labelRo: "Medical & Farma",          labelEn: "Medical & Pharma",      color: "#C8E6C9", textOnBg: "#0D2E2B" },
  industrial: { labelRo: "Industrial & Logistică",   labelEn: "Industrial & Logistics", color: "#0D2E2B", textOnBg: "#ffffff" },
  retail:     { labelRo: "Retail & Shopping",        labelEn: "Retail & Shopping",     color: "#5C5FD4", textOnBg: "#ffffff" },
  civil:      { labelRo: "Educație & Instituții",    labelEn: "Education & Institutions", color: "#A8C5D4", textOnBg: "#0D2E2B" },
}

const impactMetrics = [
  { value: "35%", labelRo: "Reducere a costurilor operaționale", labelEn: "Reduction in operational costs", descRo: "Medie la nivelul clienților noștri", descEn: "Average across our clients" },
  { value: "42%", labelRo: "Economii de energie", labelEn: "Energy savings", descRo: "Obținute prin sistemele BMS", descEn: "Achieved through BMS systems" },
  { value: "28%", labelRo: "Reducere CO₂", labelEn: "CO₂ reduction", descRo: "Emisii reduse anual", descEn: "Emissions reduced annually" },
  { value: "15%", labelRo: "Creștere a valorii proprietății", labelEn: "Increase in property value", descRo: "Prin implementarea BMS", descEn: "Through BMS implementation" },
]

const aggregates = [
  { n: "30+", labelRo: "Proiecte finalizate", labelEn: "Completed projects", color: "#C5C0F5", text: "#5C5FD4", onBg: "#0D2E2B" },
  { n: "92%", labelRo: "Clienți din recomandări", labelEn: "Clients from referrals", color: "#C8E6C9", text: "#1F6B4A", onBg: "#0D2E2B" },
  { n: "15+", labelRo: "Ani de experiență", labelEn: "Years of experience", color: "#0D2E2B", text: "#C8E6C9", onBg: "#ffffff" },
]

const trustStats = [
  { n: "98%", labelRo: "Satisfacția clienților", labelEn: "Client Satisfaction", color: "#C8E6C9", text: "#1F6B4A", onBg: "#0D2E2B" },
  { n: "24/7", labelRo: "Suport tehnic", labelEn: "Technical Support", color: "#C5C0F5", text: "#5C5FD4", onBg: "#0D2E2B" },
  { n: "30+", labelRo: "Proiecte finalizate", labelEn: "Projects Completed", color: "#0D2E2B", text: "#C8E6C9", onBg: "#ffffff" },
]

type Project = { name: string; locationRo: string; locationEn: string; descRo: string; descEn: string; scopeRo: string; scopeEn: string; image?: string; caseStudy?: string }

// Real Sovitech client portfolio (sourced from sovitech.ro/referinte). Sizes are
// public building-area figures verified via web search where available; entries
// without a confirmed public figure carry a qualitative description instead.
const references: Record<string, Project[]> = {
  horeca: [
    { name: "Therme Nord București", locationRo: "București", locationEn: "Bucharest", descRo: "Sistem BMS complet pentru cel mai mare complex de wellness din Europa, ~34.000 m² construiți", descEn: "Complete BMS system for the largest wellness complex in Europe, ~34,000 m² built area", scopeRo: "Control HVAC, iluminat, energie", scopeEn: "HVAC control, lighting, energy", caseStudy: "/resurse/studii-de-caz/therme-bucuresti" },
    { name: "Radisson Blu Hotel", locationRo: "București", locationEn: "Bucharest", descRo: "Automatizare BMS pentru un hotel de 5 stele cu peste 1.800 m² spații de evenimente", descEn: "BMS automation for a 5-star hotel with over 1,800 m² of event space", scopeRo: "BMS, control temperatură, ventilație", scopeEn: "BMS, temperature control, ventilation", caseStudy: "/resurse/studii-de-caz/radisson-bucuresti" },
    { name: "Novotel București", locationRo: "București", locationEn: "Bucharest", descRo: "Sistem BMS pentru un hotel de 258 camere, ~15.900 m² suprafață", descEn: "BMS system for a 258-room hotel, ~15,900 m² floor area", scopeRo: "BMS, control temperatură, ventilație", scopeEn: "BMS, temperature control, ventilation" },
    { name: "Crowne Plaza București", locationRo: "București", locationEn: "Bucharest", descRo: "Automatizare BMS pentru un hotel de 5 stele cu 164 camere", descEn: "BMS automation for a 5-star hotel with 164 rooms", scopeRo: "BMS, control HVAC, iluminat", scopeEn: "BMS, HVAC control, lighting" },
    { name: "Athenee Palace Hilton București", locationRo: "București", locationEn: "Bucharest", descRo: "Sistem BMS pentru un hotel istoric de lux cu 598 camere", descEn: "BMS system for a historic luxury hotel with 598 rooms", scopeRo: "BMS, control climatizare, monitorizare", scopeEn: "BMS, climate control, monitoring" },
  ],
  office: [
    { name: "Floreasca Tower", locationRo: "București", locationEn: "Bucharest", descRo: "Sistem BMS pentru o clădire de birouri clasa A, ~7.500 m²", descEn: "BMS system for a class-A office building, ~7,500 m²", scopeRo: "Control centralizat, raportare energetică", scopeEn: "Centralised control, energy reporting" },
    { name: "BCR Calea Victoriei", locationRo: "București", locationEn: "Bucharest", descRo: "Automatizare BMS pentru o clădire de birouri de 26.300 m² (turn + podium)", descEn: "BMS automation for a 26,300 m² office building (tower + podium)", scopeRo: "BMS, control acces, iluminat", scopeEn: "BMS, access control, lighting" },
    { name: "Monaco Towers", locationRo: "București", locationEn: "Bucharest", descRo: "Sistem BMS pentru un complex mixt cu 20.000 m² spații de birouri și comerciale", descEn: "BMS system for a mixed-use complex with 20,000 m² of office and retail space", scopeRo: "Control centralizat, monitorizare energetică", scopeEn: "Centralised control, energy monitoring" },
    { name: "Ștefan cel Mare Building", locationRo: "București", locationEn: "Bucharest", descRo: "Automatizare BMS pentru o clădire de birouri clasa A, 8.000 m²", descEn: "BMS automation for a class-A office building, 8,000 m²", scopeRo: "BMS, control HVAC, iluminat", scopeEn: "BMS, HVAC control, lighting" },
    { name: "BMTI Strabag", locationRo: "București", locationEn: "Bucharest", descRo: "Sistem BMS pentru prima clădire de birouri Strabag din București, 8.000 m²", descEn: "BMS system for Strabag's first office building in Bucharest, 8,000 m²", scopeRo: "Control centralizat, raportare energetică", scopeEn: "Centralised control, energy reporting" },
  ],
  medical: [
    { name: "Spitalul Foișor", locationRo: "București", locationEn: "Bucharest", descRo: "Sistem BMS pentru noul spital de ortopedie, 9.000 m², 119 paturi", descEn: "BMS system for the new orthopaedic hospital, 9,000 m², 119 beds", scopeRo: "BMS medical, backup sisteme critice", scopeEn: "Medical BMS, critical systems backup" },
    { name: "Spitalul Sfânta Maria", locationRo: "București", locationEn: "Bucharest", descRo: "Automatizare BMS pentru un spital clinic cu 303 paturi", descEn: "BMS automation for a clinical hospital with 303 beds", scopeRo: "BMS medical, control climatizare", scopeEn: "Medical BMS, climate control" },
    { name: "Spitalul Clinic de Chirurgie Plastică", locationRo: "București", locationEn: "Bucharest", descRo: "Sistem BMS pentru un spital clinic de chirurgie plastică și arsuri", descEn: "BMS system for a clinical plastic surgery and burns hospital", scopeRo: "BMS medical, control climatizare, monitorizare", scopeEn: "Medical BMS, climate control, monitoring" },
  ],
  industrial: [
    { name: "Moncler Bacău", locationRo: "Bacău", locationEn: "Bacau", descRo: "Automatizare BMS pentru o fabrică de îmbrăcăminte de lux, 16.000 m²", descEn: "BMS automation for a luxury apparel factory, 16,000 m²", scopeRo: "Control ventilație, iluminat industrial", scopeEn: "Ventilation control, industrial lighting" },
    { name: "NTN-SNR Fabrica de Rulmenți", locationRo: "Sibiu", locationEn: "Sibiu", descRo: "Sistem BMS pentru o fabrică de rulmenți cu 37.000 m² suprafață de producție", descEn: "BMS system for a bearing factory with 37,000 m² of production floor", scopeRo: "Control temperatură, ventilație industrială", scopeEn: "Temperature control, industrial ventilation" },
    { name: "Rompharm Company", locationRo: "Otopeni", locationEn: "Otopeni", descRo: "Sistem BMS pentru o fabrică farmaceutică cu cerințe stricte de calitate", descEn: "BMS system for a pharmaceutical factory with strict quality requirements", scopeRo: "Control temperatură, umiditate, presiune", scopeEn: "Temperature, humidity, pressure control" },
    { name: "Rompharm Uzbekistan", locationRo: "Uzbekistan", locationEn: "Uzbekistan", descRo: "Extinderea internațională a automatizării BMS Rompharm către o nouă fabrică farmaceutică", descEn: "International expansion of Rompharm's BMS automation to a new pharmaceutical factory", scopeRo: "Control temperatură, umiditate, presiune", scopeEn: "Temperature, humidity, pressure control" },
    { name: "Hyperion Pharma", locationRo: "România", locationEn: "Romania", descRo: "Sistem BMS pentru o unitate de producție farmaceutică", descEn: "BMS system for a pharmaceutical production facility", scopeRo: "Control temperatură, filtrare, monitorizare", scopeEn: "Temperature control, filtration, monitoring" },
    { name: "Actavis", locationRo: "România", locationEn: "Romania", descRo: "Automatizare BMS pentru o fabrică de medicamente generice", descEn: "BMS automation for a generic pharmaceuticals factory", scopeRo: "Control temperatură, umiditate, monitorizare", scopeEn: "Temperature, humidity, monitoring" },
    { name: "Monrol Eczacıbaşı", locationRo: "Pantelimon", locationEn: "Pantelimon", descRo: "Sistem BMS pentru o unitate de producție de produse radiofarmaceutice", descEn: "BMS system for a radiopharmaceutical production facility", scopeRo: "Control presiune, filtrare, monitorizare", scopeEn: "Pressure control, filtration, monitoring" },
  ],
  retail: [
    { name: "Pitești Retail Park", locationRo: "Pitești", locationEn: "Pitesti", descRo: "Sistem BMS pentru un parc de retail cu ~24.800 m² suprafață închiriabilă", descEn: "BMS system for a retail park with ~24,800 m² of leasable area", scopeRo: "Control HVAC, iluminat, energie", scopeEn: "HVAC control, lighting, energy" },
    { name: "Roman Value Centre", locationRo: "Roman", locationEn: "Roman", descRo: "Automatizare BMS pentru un centru comercial de peste 22.200 m²", descEn: "BMS automation for a shopping centre of over 22,200 m²", scopeRo: "BMS centralizat, monitorizare energetică", scopeEn: "Centralised BMS, energy monitoring" },
  ],
  civil: [
    { name: "Școala Germană București", locationRo: "București", locationEn: "Bucharest", descRo: "Sistem BMS pentru noul campus al Școlii Germane, 8.000 m² construiți", descEn: "BMS system for the new German School campus, 8,000 m² built area", scopeRo: "Control HVAC, ventilație, monitorizare", scopeEn: "HVAC control, ventilation, monitoring" },
    { name: "Lycée Français Anna de Noailles", locationRo: "București", locationEn: "Bucharest", descRo: "Automatizare BMS pentru campusul liceului francez, 13.500 m² construiți", descEn: "BMS automation for the French lycée campus, 13,500 m² built area", scopeRo: "BMS, control climatizare, monitorizare", scopeEn: "BMS, climate control, monitoring" },
    { name: "Ambasada Canadei", locationRo: "București", locationEn: "Bucharest", descRo: "Sistem BMS pentru clădirea cancelariei Ambasadei Canadei", descEn: "BMS system for the Canadian Embassy chancery building", scopeRo: "BMS, control acces, climatizare", scopeEn: "BMS, access control, climate control" },
  ],
}

export default function ReferintePage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-[#F5F4F0]">

      {/* Hero */}
      <section className="bg-[#07201C] min-h-[45vh] flex items-end pb-16 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fingerprint-59QWj1Ik1Fd1hqzZduTrEqLz2j557z.svg"
            alt=""
            className="h-[600px] w-auto"
          />
        </div>
        <div className="container-site w-full relative z-10">
          <span className="text-[#C8E6C9] text-xs font-semibold tracking-widest uppercase mb-4 block">• {t("Portofoliu", "Portfolio")}</span>
          <h1 className="text-5xl md:text-7xl font-light text-white leading-tight tracking-tighter">
            {t("Referințele noastre", "Our references")}<br />{t("— cartea noastră de vizită.", "— our calling card.")}
          </h1>
          <p className="text-lg text-white/60 font-light mt-4 max-w-xl">
            {t(
              "Proiectele pe care le-am livrat de-a lungul anilor sunt cea mai bună dovadă a încrederii pe care clienții noștri au acordat-o.",
              "The projects we have delivered over the years are the best testament to the trust our clients have placed in us.",
            )}
          </p>
        </div>
      </section>

      {/* Impact metrics */}
      <section className="py-24 bg-[#F5F4F0]">
        <div className="container-site">
          <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">• {t("Impact", "Impact")}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] tracking-tighter mb-12">{t("Impact măsurabil", "Measurable impact")}</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { ...impactMetrics[0], bg: "#C8E6C9", text: "#1F6B4A", onBg: "#0D2E2B" },
              { ...impactMetrics[1], bg: "#C5C0F5", text: "#5C5FD4", onBg: "#0D2E2B" },
              { ...impactMetrics[2], bg: "#0D2E2B", text: "#C8E6C9", onBg: "#ffffff" },
              { ...impactMetrics[3], bg: "#8B7B5C", text: "#ffffff", onBg: "#ffffff" },
            ].map((m, i) => (
              <div key={i} className="rounded-[2px] p-8 flex flex-col justify-between min-h-[180px]" style={{ backgroundColor: m.bg }}>
                <p className="text-4xl font-light" style={{ color: m.text === "#ffffff" ? m.onBg : m.text }}>{m.value}</p>
                <div>
                  <p className="text-sm font-semibold" style={{ color: m.onBg }}>{t(m.labelRo, m.labelEn)}</p>
                  <p className="text-xs font-light mt-1" style={{ color: `${m.onBg}99` }}>{t(m.descRo, m.descEn)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Aggregates */}
          <div className="grid grid-cols-3 gap-4">
            {aggregates.map((s, i) => (
              <div key={i} className="rounded-[2px] p-8 text-center" style={{ backgroundColor: s.color }}>
                <p className="text-4xl font-light mb-1" style={{ color: s.text }}>{s.n}</p>
                <p className="text-sm font-medium" style={{ color: s.onBg }}>{t(s.labelRo, s.labelEn)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects by category */}
      <section className="bg-white py-24">
        <div className="container-site">
          <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">• {t("Proiecte", "Projects")}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] tracking-tighter mb-16">{t("Proiecte finalizate", "Completed projects")}</h2>

          <div className="space-y-20">
            {Object.entries(references).map(([category, projects]) => {
              const meta = categoryMeta[category]
              return (
                <div key={category}>
                  {/* Category header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div
                      className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
                      style={{ backgroundColor: meta.color, color: meta.textOnBg }}
                    >
                      {t(meta.labelRo, meta.labelEn)}
                    </div>
                    <div className="h-px flex-1 bg-[#0D2E2B]/10" />
                    <span className="text-xs text-[#888888] font-medium">{projects.length} {t("proiecte", "projects")}</span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project, i) => (
                      <div
                        key={i}
                        className="group flex flex-col overflow-hidden rounded-[2px] border border-[#0D2E2B]/8 bg-white transition-colors duration-300 hover:border-[#0D2E2B]/20"
                      >
                        {/* Photo — placeholder for now */}
                        <div className="relative aspect-[16/10] overflow-hidden" style={{ backgroundColor: meta.color + "22" }}>
                          <img
                            src={project.image || "/placeholder.svg"}
                            alt={project.name}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex flex-1 flex-col p-6">
                          <h4 className="font-light text-base text-[#0D2E2B]">{project.name}</h4>
                          <p className="text-xs text-[#888888] font-light mt-0.5">{t(project.locationRo, project.locationEn)}</p>
                          <p className="text-sm text-[#888888] font-light leading-relaxed mt-3 mb-4">{t(project.descRo, project.descEn)}</p>
                          <div className="flex items-center gap-2 mb-6">
                            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: meta.color }}>
                              <Check className="h-2.5 w-2.5" style={{ color: meta.textOnBg }} />
                            </div>
                            <span className="text-xs font-medium text-[#0D2E2B]">{t(project.scopeRo, project.scopeEn)}</span>
                          </div>

                          {/* View Case Study button — only for projects with a published case study */}
                          {project.caseStudy && (
                            <Link
                              href={project.caseStudy}
                              className="mt-auto inline-flex items-center justify-center gap-2 border border-[#0D2E2B]/20 text-[#0D2E2B] text-sm font-semibold px-5 py-2.5 rounded-[1px] transition-colors duration-300 hover:bg-[#0D2E2B] hover:text-white hover:border-[#0D2E2B]"
                            >
                              {t("Vezi studiul de caz", "View Case Study")}
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="bg-[#F5F4F0] py-24">
        <div className="container-site">
          <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">• {t("Încredere", "Trust")}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] tracking-tighter mb-6">{t("Creștere prin încredere", "Growth through trust")}</h2>
          <p className="text-base text-[#888888] font-light max-w-2xl mb-12 leading-relaxed">
            {t(
              "Numărul tot mai mare de clienți noi care ajung la noi prin recomandări confirmă calitatea serviciilor noastre. Colaborarea strânsă cu fiecare client și rezultatele măsurabile ne-au făcut partenerul de încredere pentru automatizarea BMS în România.",
              "The growing number of new clients who reach us through referrals confirms the quality of our services. Close collaboration with every client and measurable results have made us the trusted partner for BMS automation in Romania.",
            )}
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-lg">
            {trustStats.map((s, i) => (
              <div key={i} className="rounded-[2px] p-6 text-center" style={{ backgroundColor: s.color }}>
                <p className="text-3xl font-light mb-1" style={{ color: s.text }}>{s.n}</p>
                <p className="text-xs font-medium" style={{ color: s.onBg }}>{t(s.labelRo, s.labelEn)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#C5C0F5] py-24 text-center">
        <div className="max-w-2xl mx-auto px-8">
          <p className="text-xs text-[#0D2E2B]/50 font-semibold tracking-widest uppercase mb-4">• {t("Proiect nou", "New project")}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] leading-tight mb-4 text-balance">
            {t("Ai în minte un proiect de automatizare?", "Do you have an automation project in mind?")}
          </h2>
          <p className="text-base text-[#0D2E2B]/60 font-light mb-8">
            {t("Specialiștii noștri sunt disponibili pentru consultanță și pot oferi soluții personalizate.", "Our specialists are available for consultations and can offer tailored solutions.")}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-[#0D2E2B] text-white text-sm font-semibold px-6 py-3 rounded-[1px] hover:bg-[#0a2220] transition-colors"
            >
              {t("Cere o ofertă personalizată", "Request a personalised quote")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/servicii"
              className="inline-flex items-center gap-2 text-[#0D2E2B] text-sm font-semibold border border-[#0D2E2B]/20 px-6 py-3 rounded-[1px] hover:bg-[#0D2E2B]/5 transition-colors"
            >
              {t("Explorează serviciile noastre", "Explore our services")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
