"use client"

import Link from "next/link"
import { Clock, CheckCircle2, Settings, Phone, Zap, Target, Shield, RefreshCw } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export default function MentenantaPage() {
  const { t } = useLanguage()

  const contractTypes = [
    { ro: "Mentenanță preventivă", en: "Preventive maintenance" },
    { ro: "Mentenanță corectivă", en: "Corrective maintenance" },
    { ro: "Service la cerere", en: "On-demand service" },
    { ro: "Contract full-service", en: "Full-service contract" },
  ]

  const serviceTypes = [
    {
      icon: <RefreshCw className="h-5 w-5 text-[#1F6B4A]" />,
      titleRo: "Mentenanță Preventivă",
      titleEn: "Preventive Maintenance",
      bodyRo:
        "Verificări periodice programate pentru prevenirea defecțiunilor și menținerea performanței optime. Include inspecții vizuale, teste funcționale, curățarea componentelor și actualizări software.",
      bodyEn:
        "Scheduled periodic checks to prevent failures and maintain optimal performance. Includes visual inspections, functional tests, component cleaning and software updates.",
      points: [
        { ro: "Verificări trimestriale sau semestriale", en: "Quarterly or biannual checks" },
        { ro: "Rapoarte detaliate după fiecare vizită", en: "Detailed reports after each visit" },
        { ro: "Recomandări de îmbunătățire", en: "Improvement recommendations" },
      ],
    },
    {
      icon: <Settings className="h-5 w-5 text-[#1F6B4A]" />,
      titleRo: "Mentenanță Corectivă",
      titleEn: "Corrective Maintenance",
      bodyRo:
        "Intervenții rapide pentru remedierea defecțiunilor apărute. Echipa noastră diagnostichează și rezolvă problemele în cel mai scurt timp posibil pentru a minimiza impactul asupra operațiunilor.",
      bodyEn:
        "Rapid interventions to remedy faults that arise. Our team diagnoses and resolves issues as quickly as possible to minimise the impact on operations.",
      points: [
        { ro: "Timp de răspuns de 4 ore pentru urgențe", en: "4-hour response time for emergencies" },
        { ro: "Diagnoză de la distanță, când este posibil", en: "Remote diagnosis when possible" },
        { ro: "Piese de schimb originale SAUTER", en: "Original SAUTER spare parts" },
      ],
    },
    {
      icon: <Zap className="h-5 w-5 text-[#1F6B4A]" />,
      titleRo: "Modernizare și Upgrade",
      titleEn: "Modernisation and Upgrade",
      bodyRo:
        "Actualizarea sistemelor BMS existente pentru îmbunătățirea eficienței energetice și adăugarea de funcționalități noi. Migrăm de la sisteme legacy la tehnologii moderne, păstrând investițiile anterioare.",
      bodyEn:
        "Updating existing BMS systems to improve energy efficiency and add new features. We migrate from legacy systems to modern technologies while preserving previous investments.",
      points: [
        { ro: "Upgrade de controllere și software", en: "Controller and software upgrades" },
        { ro: "Adăugare de senzori și puncte de măsură", en: "Adding sensors and measurement points" },
        { ro: "Implementare monitorizare de la distanță", en: "Remote monitoring implementation" },
      ],
    },
  ]

  const howItWorks = [
    {
      num: "1",
      titleRo: "Evaluare și Contract",
      titleEn: "Assessment and Contract",
      bodyRo:
        "Analizăm sistemul BMS existent și cerințele tale pentru a propune contractul de mentenanță optim. Stabilim frecvența vizitelor, SLA-urile și bugetul anual.",
      bodyEn:
        "We analyse the existing BMS system and your requirements to propose the optimal maintenance contract. We set the visit frequency, SLAs and annual budget.",
    },
    {
      num: "2",
      titleRo: "Planificarea Vizitelor",
      titleEn: "Visit Planning",
      bodyRo:
        "Programăm vizitele de mentenanță preventivă la ore convenabile pentru operațiunile tale. Echipa noastră sosește complet echipată, cu toate uneltele și piesele necesare.",
      bodyEn:
        "We schedule preventive maintenance visits at times convenient for your operations. Our team arrives fully equipped with all the tools and parts required.",
    },
    {
      num: "3",
      titleRo: "Intervenție și Raportare",
      titleEn: "Intervention and Reporting",
      bodyRo:
        "După fiecare vizită primești un raport detaliat al lucrărilor efectuate, al stării sistemului și recomandări pentru viitor. Ai acces la un portal online pentru urmărirea istoricului intervențiilor.",
      bodyEn:
        "After each visit you receive a detailed report of the work carried out, system status and recommendations for the future. You have access to an online portal to track intervention history.",
    },
  ]

  const stats = [
    { value: "95%", labelRo: "Uptime garantat al sistemului", labelEn: "Guaranteed system uptime" },
    { value: "4h", labelRo: "Răspuns maxim la urgențe", labelEn: "Maximum emergency response" },
    { value: "20%", labelRo: "Reducerea costurilor de reparații", labelEn: "Repair cost reduction" },
    { value: "24/7", labelRo: "Suport telefonic disponibil", labelEn: "Phone support available" },
  ]

  const related = [
    {
      href: "/servicii/proiectare",
      titleRo: "Proiectare BMS",
      titleEn: "BMS Design",
      descRo: "Proiectare completă de sisteme BMS",
      descEn: "Complete BMS system design",
    },
    {
      href: "/servicii/executie",
      titleRo: "Execuție & Implementare",
      titleEn: "Execution & Implementation",
      descRo: "Instalare echipamente SAUTER",
      descEn: "SAUTER equipment installation",
    },
    {
      href: "/servicii/integrare",
      titleRo: "Integrare Sisteme",
      titleEn: "System Integration",
      descRo: "Conectarea mai multor sisteme",
      descEn: "Connecting multiple systems",
    },
  ]

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      {/* Hero */}
      <section className="bg-[#07201C] py-14 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fingerprint-59QWj1Ik1Fd1hqzZduTrEqLz2j557z.svg"
            alt=""
            className="h-[400px] w-auto"
          />
        </div>
        <div className="container-site relative z-10">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <ol className="flex items-center gap-2 text-xs text-white/30">
              <li><Link href="/" className="hover:text-white/60 transition-colors">{t("Acasă", "Home")}</Link></li>
              <li>/</li>
              <li><Link href="/servicii" className="hover:text-white/60 transition-colors">{t("Servicii", "Services")}</Link></li>
              <li>/</li>
              <li className="text-white/60">{t("Mentenanță & Modernizare", "Maintenance & Modernisation")}</li>
            </ol>
          </nav>
          <p className="text-xs text-[#C8E6C9] font-semibold tracking-widest uppercase mb-3">{t("• Servicii BMS", "• BMS Services")}</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white leading-tight tracking-tighter mb-4">
            {t("Mentenanță & Modernizare", "Maintenance & Modernisation")}
          </h1>
          <p className="text-white/60 font-light text-lg max-w-2xl leading-relaxed">
            {t(
              "Service profesional, upgrade-uri de eficiență și modernizarea sistemelor BMS pentru îmbunătățirea managementului facilităților și menținerea performanței optime.",
              "Professional servicing, efficiency upgrades and BMS system modernisation to improve facilities management and maintain optimal performance.",
            )}
          </p>
        </div>
      </section>

      <div className="container-site py-16">
        <div className="grid gap-12 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside>
            <div className="bg-white rounded-[2px] overflow-hidden">
              <div className="p-6 border-b border-[#0D2E2B]/8">
                <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">{t("Timp de răspuns", "Response time")}</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#1F6B4A]" />
                  <span className="font-light text-[#0D2E2B]">{t("4 ore (urgențe)", "4 hours (emergencies)")}</span>
                </div>
              </div>
              <div className="p-6 border-b border-[#0D2E2B]/8">
                <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-4">{t("Tipuri de contract", "Contract types")}</p>
                <ul className="space-y-3">
                  {contractTypes.map((item) => (
                    <li key={item.en} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#1F6B4A] mt-0.5 shrink-0" />
                      <span className="text-sm text-[#0D2E2B] font-light">{t(item.ro, item.en)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 border-b border-[#0D2E2B]/8">
                <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">{t("Contact urgențe", "Emergency contact")}</p>
                <div className="flex items-center gap-2 font-light text-[#0D2E2B]">
                  <Phone className="h-4 w-4 text-[#1F6B4A]" />
                  <span>+40 21 XXX XXXX</span>
                </div>
                <p className="text-xs text-[#888888] font-light mt-1">{t("Disponibil 24/7", "Available 24/7")}</p>
              </div>
              <div className="p-6">
                <Link
                  href="/contact"
                  className="block w-full text-center bg-[#0D2E2B] text-white text-sm font-semibold py-3 rounded-[2px] hover:bg-[#0a2220] transition-colors"
                >
                  {t("Solicită un contract de mentenanță", "Request a maintenance contract")}
                </Link>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="space-y-16">
            {/* Hero Image */}
            <div className="aspect-video overflow-hidden rounded-[2px] bg-[#0D2E2B]/5">
              <img
                src="/services-maintenance-support.jpg"
                alt={t("Mentenanță BMS - Echipă de service", "BMS Maintenance - Service team")}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Service Types */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Settings className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Tipuri de Service", "Service Types")}</h2>
              </div>
              <div className="space-y-4">
                {serviceTypes.map((service) => (
                  <div key={service.titleEn} className="bg-white rounded-[2px] p-6 flex items-start gap-5">
                    <div className="w-10 h-10 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center shrink-0">
                      {service.icon}
                    </div>
                    <div>
                      <h3 className="font-light text-[#0D2E2B] mb-2">{t(service.titleRo, service.titleEn)}</h3>
                      <p className="text-sm text-[#888888] font-light leading-relaxed mb-3">{t(service.bodyRo, service.bodyEn)}</p>
                      <ul className="space-y-1">
                        {service.points.map((p) => (
                          <li key={p.en} className="text-xs text-[#888888] font-light">· {t(p.ro, p.en)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* How it works */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Target className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum Funcționează", "How It Works")}</h2>
              </div>
              <div className="space-y-4">
                {howItWorks.map((step) => (
                  <div key={step.num} className="bg-white rounded-[2px] p-6 flex items-start gap-5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0D2E2B] text-white text-sm font-light shrink-0">
                      {step.num}
                    </span>
                    <div>
                      <h3 className="font-light text-[#0D2E2B] mb-2">{t(step.titleRo, step.titleEn)}</h3>
                      <p className="text-sm text-[#888888] font-light leading-relaxed">{t(step.bodyRo, step.bodyEn)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Stats */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Shield className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">
                  {t("Beneficiile Contractului de Mentenanță", "Maintenance Contract Benefits")}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.labelEn} className="bg-white rounded-[2px] p-6 text-center">
                    <p className="text-4xl font-light text-[#1F6B4A] mb-2">{stat.value}</p>
                    <p className="text-xs text-[#888888] font-light">{t(stat.labelRo, stat.labelEn)}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section className="bg-[#07201C] rounded-[2px] p-10 text-center">
              <h2 className="text-2xl font-light text-white mb-3">
                {t("Protejează-ți investiția în sistemul BMS", "Protect your BMS system investment")}
              </h2>
              <p className="text-white/60 font-light mb-7 max-w-xl mx-auto text-sm leading-relaxed">
                {t(
                  "Un contract de mentenanță asigură funcționarea optimă și longevitatea sistemului. Contactează-ne pentru o ofertă personalizată.",
                  "A maintenance contract ensures optimal operation and system longevity. Contact us for a personalised quote.",
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center bg-white text-[#0D2E2B] text-sm font-bold px-6 py-3 rounded-[2px] hover:bg-[#F5F4F0] transition-colors"
                >
                  {t("Solicită o ofertă de mentenanță", "Request a maintenance quote")}
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center bg-transparent border border-white/15 text-white text-sm font-medium px-6 py-3 rounded-[2px] hover:bg-white/5 transition-colors"
                >
                  {t("Vezi pachetele de servicii", "View service packages")}
                </Link>
              </div>
            </section>

            {/* Related */}
            <section className="pt-4 border-t border-[#0D2E2B]/8">
              <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-6">{t("• Servicii conexe", "• Related services")}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {related.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="group rounded-[2px] border border-[#0D2E2B]/8 bg-white p-5 hover:border-[#1F6B4A]/30 transition-colors"
                  >
                    <h4 className="font-light text-sm text-[#0D2E2B] group-hover:text-[#1F6B4A] transition-colors mb-1">
                      {t(s.titleRo, s.titleEn)}
                    </h4>
                    <p className="text-xs text-[#888888] font-light">{t(s.descRo, s.descEn)}</p>
                  </Link>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
