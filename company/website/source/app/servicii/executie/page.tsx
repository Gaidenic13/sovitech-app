"use client"

import Link from "next/link"
import { Clock, CheckCircle2, Zap, Target, Shield } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export default function ExecutiePage() {
  const { t } = useLanguage()

  const equipment = [
    { ro: "Controllere SAUTER", en: "SAUTER controllers" },
    { ro: "Senzori de temperatură și umiditate", en: "Temperature and humidity sensors" },
    { ro: "Actuatoare și vane", en: "Actuators and valves" },
    { ro: "Tablouri de automatizare", en: "Control panels" },
  ]

  const steps = [
    {
      num: "1",
      titleRo: "Pregătire și Planificare",
      titleEn: "Preparation and Planning",
      bodyRo:
        "Verificăm documentația de proiectare, comandăm echipamentele necesare și stabilim graficul de execuție. Ne coordonăm cu celelalte echipe implicate în proiect pentru o implementare fără sincope.",
      bodyEn:
        "We verify the design documentation, order the necessary equipment and set the execution schedule. We coordinate with the other teams involved in the project to ensure smooth implementation.",
      durationRo: "1–2 săptămâni",
      durationEn: "1–2 weeks",
    },
    {
      num: "2",
      titleRo: "Instalare Echipamente",
      titleEn: "Equipment Installation",
      bodyRo:
        "Echipa noastră de tehnicieni certificați instalează controllere, senzori, actuatoare și tablouri de automatizare conform specificațiilor tehnice. Realizăm toate conexiunile electrice și de comunicație.",
      bodyEn:
        "Our team of certified technicians installs controllers, sensors, actuators and control panels in accordance with technical specifications. We complete all electrical and communication connections.",
      durationRo: "2–6 săptămâni (în funcție de complexitate)",
      durationEn: "2–6 weeks (depending on complexity)",
    },
    {
      num: "3",
      titleRo: "Configurare și Programare",
      titleEn: "Configuration and Programming",
      bodyRo:
        "Programăm controllerele cu algoritmi optimizați pentru eficiență energetică, configurăm interfața de utilizare și setăm parametrii de funcționare. Implementăm scenarii automatizate și alarme de siguranță.",
      bodyEn:
        "We programme the controllers with algorithms optimised for energy efficiency, configure the user interface and set operating parameters. We implement automated scenarios and safety alarms.",
      durationRo: "1–2 săptămâni",
      durationEn: "1–2 weeks",
    },
    {
      num: "4",
      titleRo: "Testare și Punere în Funcțiune",
      titleEn: "Testing and Commissioning",
      bodyRo:
        "Efectuăm teste complete asupra tuturor sistemelor implementate, verificăm funcționarea corectă a buclelor de control și optimizăm parametrii. Documentăm rezultatele testelor și generăm rapoartele de recepție.",
      bodyEn:
        "We carry out comprehensive tests on all implemented systems, verify the correct operation of control loops and optimise parameters. We document test results and generate acceptance reports.",
      durationRo: "1–2 săptămâni",
      durationEn: "1–2 weeks",
    },
    {
      num: "5",
      titleRo: "Instruire și Predare",
      titleEn: "Training and Handover",
      bodyRo:
        "Organizăm sesiuni de instruire pentru personalul tehnic al clientului, prezentăm funcțiile sistemului și procedurile de operare. Predăm documentația completă și oferim suport pe perioada de garanție.",
      bodyEn:
        "We organise training sessions for the client's technical staff, present the system's functions and operating procedures. We hand over the complete documentation and provide support during the warranty period.",
      durationRo: "2–3 zile",
      durationEn: "2–3 days",
    },
  ]

  const stats = [
    { value: "99%", labelRo: "Rată de succes la recepție", labelEn: "Acceptance success rate" },
    { value: "150+", labelRo: "Proiecte implementate", labelEn: "Projects implemented" },
    { value: t("2 ani", "2 yrs"), labelRo: "Garanție echipamente", labelEn: "Equipment warranty" },
    { value: "4h", labelRo: "Timp de răspuns la urgențe", labelEn: "Emergency response time" },
  ]

  const sauterPoints = [
    { ro: "Echipamente certificate conform standardelor europene", en: "Equipment certified to European standards" },
    { ro: "Suport tehnic direct de la producător", en: "Direct technical support from the manufacturer" },
    { ro: "Piese de schimb disponibile pe termen lung", en: "Spare parts available long-term" },
    { ro: "Software actualizat constant", en: "Constantly updated software" },
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
      href: "/servicii/integrare",
      titleRo: "Integrare Sisteme",
      titleEn: "System Integration",
      descRo: "Programare și integrare protocoale",
      descEn: "Programming and protocol integration",
    },
    {
      href: "/servicii/mentenanta",
      titleRo: "Mentenanță",
      titleEn: "Maintenance",
      descRo: "Service și upgrade-uri",
      descEn: "Service and upgrades",
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
              <li className="text-white/60">{t("Execuție & Implementare", "Execution & Implementation")}</li>
            </ol>
          </nav>
          <p className="text-xs text-[#C8E6C9] font-semibold tracking-widest uppercase mb-3">{t("• Servicii BMS", "• BMS Services")}</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white leading-tight tracking-tighter mb-4">
            {t("Execuție & Implementare", "Execution & Implementation")}
          </h1>
          <p className="text-white/60 font-light text-lg max-w-2xl leading-relaxed">
            {t(
              "Implementare profesională cu echipamente SAUTER de la liderul global în managementul energiei. Testare completă, punere în funcțiune și instruire pentru echipa ta.",
              "Professional implementation with SAUTER equipment from the global leader in energy management. Full testing, commissioning and training for your team.",
            )}
          </p>
        </div>
      </section>

      <div className="container-site py-16">
        <div className="grid gap-12 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-0">
            <div className="bg-white rounded-[2px] overflow-hidden">
              <div className="p-6 border-b border-[#0D2E2B]/8">
                <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">{t("Durata medie", "Average duration")}</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#1F6B4A]" />
                  <span className="font-light text-[#0D2E2B]">{t("4–12 săptămâni", "4–12 weeks")}</span>
                </div>
              </div>
              <div className="p-6 border-b border-[#0D2E2B]/8">
                <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-4">{t("Echipamente utilizate", "Equipment used")}</p>
                <ul className="space-y-3">
                  {equipment.map((item) => (
                    <li key={item.en} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#1F6B4A] mt-0.5 shrink-0" />
                      <span className="text-sm text-[#0D2E2B] font-light">{t(item.ro, item.en)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6">
                <Link
                  href="/contact"
                  className="block w-full text-center bg-[#0D2E2B] text-white text-sm font-semibold py-3 rounded-[2px] hover:bg-[#0a2220] transition-colors"
                >
                  {t("Solicită o consultație gratuită", "Request a free consultation")}
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="space-y-16">
            {/* Hero Image */}
            <div className="aspect-video overflow-hidden rounded-[2px] bg-[#0D2E2B]/5">
              <img
                src="/services-installation-work.jpg"
                alt={t("Execuție BMS - Instalare echipamente", "BMS Execution - Equipment installation")}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Process */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Target className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Procesul de Implementare", "Implementation Process")}</h2>
              </div>

              <div className="space-y-4">
                {steps.map((step) => (
                  <div key={step.num} className="bg-white rounded-[2px] p-6 flex items-start gap-5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0D2E2B] text-white text-sm font-light shrink-0">
                      {step.num}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-light text-[#0D2E2B] mb-2">{t(step.titleRo, step.titleEn)}</h3>
                      <p className="text-sm text-[#888888] font-light leading-relaxed mb-3">{t(step.bodyRo, step.bodyEn)}</p>
                      <span className="text-xs font-semibold text-[#1F6B4A]">{t("Durată: ", "Duration: ")}{t(step.durationRo, step.durationEn)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Impact */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Zap className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Impact și Beneficii", "Impact and Benefits")}</h2>
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

            {/* SAUTER */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Shield className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Parteneriat SAUTER", "SAUTER Partnership")}</h2>
              </div>
              <div className="bg-white rounded-[2px] p-8">
                <p className="text-sm text-[#888888] font-light leading-relaxed mb-5">
                  {t("Sovitech Control este ", "Sovitech Control is an ")}
                  <span className="font-semibold text-[#0D2E2B]">{t("partener autorizat SAUTER", "authorised SAUTER partner")}</span>
                  {t(
                    " în România, oferind acces la cele mai avansate echipamente de automatizare a clădirilor din industrie. SAUTER, cu sediul central în Elveția, este lider mondial în sisteme de management energetic pentru clădiri.",
                    " in Romania, offering access to the most advanced building automation equipment in the industry. SAUTER, headquartered in Switzerland, is a world leader in energy management systems for buildings.",
                  )}
                </p>
                <ul className="space-y-2">
                  {sauterPoints.map((item) => (
                    <li key={item.en} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#1F6B4A]" />
                      <span className="text-sm text-[#0D2E2B] font-light">{t(item.ro, item.en)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* CTA */}
            <section className="bg-[#07201C] rounded-[2px] p-10 text-center">
              <h2 className="text-2xl font-light text-white mb-3">
                {t("Ai un proiect de implementare BMS?", "Do you have a BMS implementation project?")}
              </h2>
              <p className="text-white/60 font-light mb-7 max-w-xl mx-auto text-sm leading-relaxed">
                {t(
                  "Contactează-ne pentru o evaluare gratuită. Echipa noastră va analiza cerințele tale și va propune soluția optimă pentru clădirea ta.",
                  "Contact us for a free assessment. Our team will analyse your requirements and propose the optimal solution for your building.",
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center bg-white text-[#0D2E2B] text-sm font-bold px-6 py-3 rounded-[2px] hover:bg-[#F5F4F0] transition-colors"
                >
                  {t("Solicită o ofertă gratuită", "Request a free quote")}
                </Link>
                <Link
                  href="/produse"
                  className="inline-flex items-center justify-center bg-transparent border border-white/15 text-white text-sm font-medium px-6 py-3 rounded-[2px] hover:bg-white/5 transition-colors"
                >
                  {t("Vezi echipamentele SAUTER", "View SAUTER equipment")}
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
