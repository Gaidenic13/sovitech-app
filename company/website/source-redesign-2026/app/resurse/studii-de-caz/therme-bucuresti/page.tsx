"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowUpRight, Share2, Check, ArrowRight } from "lucide-react"
import { useState } from "react"
import { useLanguage } from "@/lib/language-context"

const metrics = [
  { value: "1.400", ro: "Puncte de date", en: "Data points" },
  { value: "6", ro: "Centrale de tratare a aerului", en: "Air handling units" },
  { value: "34.000 m²", ro: "Suprafață construită a complexului", en: "Complex built area" },
  { value: "6 săpt.", ro: "Durată implementare", en: "Implementation time" },
]

const timeline = [
  { phaseRo: "Audit & analiză", phaseEn: "Audit & Analysis", durRo: "Săptămâna 1–2", durEn: "Week 1–2", descRo: "Evaluarea infrastructurii existente și identificarea oportunităților de optimizare.", descEn: "Assessment of existing infrastructure and identification of optimisation opportunities." },
  { phaseRo: "Proiectare sistem", phaseEn: "System Design", durRo: "Săptămâna 2–3", durEn: "Week 2–3", descRo: "Configurarea arhitecturii BMS și selecția echipamentelor SAUTER.", descEn: "BMS architecture configuration and selection of SAUTER equipment." },
  { phaseRo: "Instalare & integrare", phaseEn: "Installation & Integration", durRo: "Săptămâna 3–5", durEn: "Week 3–5", descRo: "Instalarea senzorilor și controlerelor, integrarea cu sistemele HVAC existente.", descEn: "Sensor and controller installation, integration with existing HVAC systems." },
  { phaseRo: "Testare & instruire", phaseEn: "Testing & Training", durRo: "Săptămâna 5–6", durEn: "Week 5–6", descRo: "Punere în funcțiune, calibrare și instruirea echipei tehnice Therme.", descEn: "Commissioning, calibration, and training for the Therme technical team." },
]

const results = [
  { titleRo: "Control centralizat", titleEn: "Centralised control", descRo: "Control inteligent HVAC și iluminat, cu supervizare unificată pentru toate instalațiile complexului.", descEn: "Intelligent HVAC and lighting control, with unified supervision for every system in the complex." },
  { titleRo: "Fiabilitate 99,9%", titleEn: "99.9% reliability", descRo: "Monitorizare non-stop cu alerte predictive și intervenție proactivă.", descEn: "Round-the-clock monitoring with predictive alerts and proactive intervention." },
  { titleRo: "Raportare în timp real", titleEn: "Real-time reporting", descRo: "Dashboard centralizat cu vizibilitate completă asupra tuturor datelor de consum.", descEn: "Centralised dashboard with full visibility of all consumption data." },
  { titleRo: "Confort sporit", titleEn: "Enhanced comfort", descRo: "Temperatură și umiditate optime, menținute în toate zonele complexului.", descEn: "Optimal temperature and humidity maintained across all areas of the complex." },
]

const solutions = [
  { titleRo: "Consultanță strategică", titleEn: "Strategic consultancy", descRo: "Audit complet al infrastructurii și recomandări personalizate pentru arhitectura BMS optimă.", descEn: "Comprehensive infrastructure audit and tailored recommendations for the optimal BMS architecture." },
  { titleRo: "Integrare multi-sistem", titleEn: "Multi-system integration", descRo: "Conectarea tuturor sistemelor prin protocoale deschise BACnet și Modbus într-o singură platformă unificată.", descEn: "Connecting all systems through open BACnet and Modbus protocols into a single unified platform." },
  { titleRo: "Control HVAC inteligent", titleEn: "Intelligent HVAC control", descRo: "Algoritmi de optimizare care ajustează automat temperatura în funcție de ocupare și condițiile meteo.", descEn: "Optimisation algorithms that automatically adjust temperature based on occupancy and weather conditions." },
  { titleRo: "Instruire & suport", titleEn: "Training & support", descRo: "Instruire intensivă pentru echipa tehnică Therme și suport continuu 24/7 după implementare.", descEn: "Intensive training for the Therme technical team and continuous 24/7 post-implementation support." },
]

export default function ThermeBucurestiCaseStudy() {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb Bar */}
      <div className="border-b border-border bg-secondary/50">
        <div className="mx-auto max-w-[1220px] px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/resurse" className="text-muted-foreground hover:text-foreground transition-colors no-underline">{t("Resurse", "Resources")}</Link>
            <span className="text-muted-foreground">/</span>
            <Link href="/referinte" className="text-muted-foreground hover:text-foreground transition-colors no-underline">{t("Studii de caz", "Case Studies")}</Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium">Therme Bucharest</span>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? t("Copiat", "Copied") : t("Distribuie", "Share")}
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-background border-b border-border">
        <div className="mx-auto max-w-[1220px] px-4 sm:px-8 pt-12 pb-16 md:pt-16 md:pb-20">
          <Link
            href="/referinte"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-accent no-underline hover:no-underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("Înapoi la studii de caz", "Back to Case Studies")}
          </Link>

          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold tracking-wide text-accent uppercase mb-6">
                HORECA / Spa &amp; Wellness
              </div>
              <h1 className="text-foreground mb-6 text-balance" style={{ fontSize: "var(--font-size-4xl)", lineHeight: "var(--line-height-tight)", letterSpacing: "-0.03em", fontWeight: 600 }}>
                {t("Therme București: automatizare BMS pentru cel mai mare complex de wellness din Europa", "Therme Bucharest: BMS automation for Europe's largest wellness complex")}
              </h1>
              <p className="text-muted-foreground max-w-xl" style={{ fontSize: "var(--font-size-lg)", lineHeight: "var(--line-height-relaxed)", letterSpacing: "-0.01em" }}>
                {t("Cum cel mai mare complex spa din Europa a implementat un sistem integrat de management al clădirii pentru eficiență energetică și confort operațional.", "How Europe's largest spa complex implemented an integrated building management system for energy efficiency and operational comfort.")}
              </p>
            </div>

            {/* Metrics Card */}
            <div className="lg:col-span-5">
              <div className="rounded-[2px] border border-border bg-card p-6 shadow-apple">
                <div className="grid grid-cols-2 gap-6">
                  {metrics.map((m, i) => (
                    <div key={i} className={i < 2 ? "pb-6 border-b border-border" : ""}>
                      <div className="text-accent font-semibold" style={{ fontSize: "var(--font-size-3xl)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                        {m.value}
                      </div>
                      <div className="text-muted-foreground mt-1.5" style={{ fontSize: "var(--font-size-sm)", letterSpacing: "-0.01em" }}>
                        {t(m.ro, m.en)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Image */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1220px] px-4 sm:px-8 py-0">
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-none md:rounded-[2px] md:my-8 -mx-4 md:mx-0">
            <Image
              src="/thermal-spa-modern-building.jpg"
              alt={t("Therme București, complex spa și wellness", "Therme Bucharest - Spa and wellness complex")}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-[1220px] px-4 sm:px-8 section-l">
        <div className="grid lg:grid-cols-12 gap-16">

          {/* Sidebar */}
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <div className="sticky top-24 space-y-8">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" style={{ letterSpacing: "0.06em" }}>{t("Client", "Client")}</div>
                <div className="font-semibold text-foreground" style={{ fontSize: "var(--font-size-base)", letterSpacing: "-0.01em" }}>Therme București</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" style={{ letterSpacing: "0.06em" }}>{t("Industrie", "Industry")}</div>
                <div className="font-semibold text-foreground" style={{ fontSize: "var(--font-size-base)", letterSpacing: "-0.01em" }}>HORECA / Spa &amp; Wellness</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" style={{ letterSpacing: "0.06em" }}>{t("Serviciu", "Service")}</div>
                <div className="font-semibold text-foreground" style={{ fontSize: "var(--font-size-base)", letterSpacing: "-0.01em" }}>{t("Implementare BMS completă", "Full BMS Implementation")}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" style={{ letterSpacing: "0.06em" }}>{t("Tehnologie", "Technology")}</div>
                <div className="font-semibold text-foreground" style={{ fontSize: "var(--font-size-base)", letterSpacing: "-0.01em" }}>SAUTER - BACnet / Modbus</div>
              </div>
              <div className="pt-4 border-t border-border">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-[1px] bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground no-underline hover:no-underline transition-all"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {t("Cere o consultanță", "Request a Consultation")}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9 order-1 lg:order-2">

            {/* Delivery summary (replaces a testimonial attributed to a person who could not be verified) */}
            <div className="mb-16 rounded-[2px] bg-secondary p-8 md:p-10">
              <p className="text-foreground mb-4 text-pretty" style={{ fontSize: "var(--font-size-xl)", lineHeight: "var(--line-height-relaxed)", letterSpacing: "-0.02em", fontWeight: 500 }}>
                {t(
                  "Automatizare și supervizare pentru instalațiile de tratare a aerului, sistemul de piscine și centrala termică, livrate fără întreruperea activității complexului.",
                  "Automation and supervision for the air-handling plant, the pool systems and the heating plant, delivered without interrupting the complex's operation.",
                )}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "var(--font-size-sm)" }}>
                {t("1.400 de puncte de date · 6 centrale de tratare a aerului · control umiditate și temperatură pe zone · integrare cu contorizarea de energie",
                   "1,400 data points · 6 air handling units · zone-level humidity and temperature control · integration with energy metering")}
              </p>
            </div>

            {/* The challenge */}
            <div className="mb-16">
              <h2 className="text-foreground mb-6" style={{ fontSize: "var(--font-size-2xl)", letterSpacing: "-0.02em", fontWeight: 600 }}>
                {t("Provocarea", "The Challenge")}
              </h2>
              <div className="space-y-4">
                <p className="text-foreground/85" style={{ fontSize: "var(--font-size-base)", lineHeight: "var(--line-height-relaxed)", letterSpacing: "-0.01em", maxWidth: "45rem" }}>
                  {t(
                    "Therme București, cel mai mare complex spa din Europa, se confrunta cu costuri energetice ridicate și un sistem de monitorizare fragmentat. Cu peste 8.000 m² de spații climatizate, piscine termale și zone de wellness, managementul eficient al energiei era esențial.",
                    "Therme Bucharest, Europe's largest spa complex, was facing high energy costs and a fragmented monitoring system. With over 8,000 m² of climate-controlled spaces, thermal pools and wellness areas, efficient energy management was essential.",
                  )}
                </p>
                <p className="text-foreground/85" style={{ fontSize: "var(--font-size-base)", lineHeight: "var(--line-height-relaxed)", letterSpacing: "-0.01em", maxWidth: "45rem" }}>
                  {t(
                    "Furnizorul anterior de automatizare nu se ridica la nivelul așteptărilor privind eficiența energetică și raportarea. Pe măsură ce complexul se pregătea pentru extindere, era nevoie de un partener capabil să livreze standarde internaționale de operare.",
                    "The previous automation provider was not meeting expectations on energy efficiency and reporting. As the complex prepared for expansion, a partner capable of delivering international operating standards was needed.",
                  )}
                </p>
              </div>
            </div>

            {/* Solution */}
            <div className="mb-16">
              <h2 className="text-foreground mb-6" style={{ fontSize: "var(--font-size-2xl)", letterSpacing: "-0.02em", fontWeight: 600 }}>
                {t("Soluția", "The Solution")}
              </h2>
              <p className="text-foreground/85 mb-8" style={{ fontSize: "var(--font-size-base)", lineHeight: "var(--line-height-relaxed)", letterSpacing: "-0.01em", maxWidth: "45rem" }}>
                {t(
                  "Sovitech Control a implementat o platformă BMS SAUTER integrată, care unifică controlul HVAC, iluminatul și managementul energetic într-un singur sistem centralizat:",
                  "Sovitech Control implemented an integrated SAUTER BMS platform that unifies HVAC control, lighting, and energy management under a single centralised system:",
                )}
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {solutions.map((item, i) => (
                  <div key={i} className="rounded-[2px] border border-border bg-card p-5 hover-lift">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-accent" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1" style={{ fontSize: "var(--font-size-sm)", letterSpacing: "-0.01em" }}>
                          {t(item.titleRo, item.titleEn)}
                        </h4>
                        <p className="text-muted-foreground" style={{ fontSize: "var(--font-size-sm)", lineHeight: "var(--line-height-relaxed)" }}>
                          {t(item.descRo, item.descEn)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="mb-16">
              <h2 className="text-foreground mb-8" style={{ fontSize: "var(--font-size-2xl)", letterSpacing: "-0.02em", fontWeight: 600 }}>
                {t("Procesul de implementare", "Implementation Process")}
              </h2>
              <div className="space-y-0">
                {timeline.map((step, i) => (
                  <div key={i} className="relative flex gap-6 pb-8 last:pb-0">
                    {i < timeline.length - 1 && (
                      <div className="absolute left-[15px] top-[32px] bottom-0 w-px bg-border" />
                    )}
                    <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-accent bg-background text-xs font-bold text-accent">
                      {i + 1}
                    </div>
                    <div className="pt-0.5">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-foreground" style={{ fontSize: "var(--font-size-base)", letterSpacing: "-0.01em" }}>
                          {t(step.phaseRo, step.phaseEn)}
                        </h4>
                        <span className="text-xs font-medium text-muted-foreground bg-secondary rounded-full px-2.5 py-0.5">
                          {t(step.durRo, step.durEn)}
                        </span>
                      </div>
                      <p className="text-muted-foreground" style={{ fontSize: "var(--font-size-sm)", lineHeight: "var(--line-height-relaxed)" }}>
                        {t(step.descRo, step.descEn)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="mb-16">
              <h2 className="text-foreground mb-8" style={{ fontSize: "var(--font-size-2xl)", letterSpacing: "-0.02em", fontWeight: 600 }}>
                {t("Rezultate & impact", "Results & Impact")}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {results.map((r, i) => (
                  <div key={i} className="rounded-[2px] bg-secondary p-6">
                    <h4 className="font-semibold text-foreground mb-2" style={{ fontSize: "var(--font-size-base)", letterSpacing: "-0.01em" }}>
                      {t(r.titleRo, r.titleEn)}
                    </h4>
                    <p className="text-muted-foreground" style={{ fontSize: "var(--font-size-sm)", lineHeight: "var(--line-height-relaxed)" }}>
                      {t(r.descRo, r.descEn)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* About Company */}
            <div className="mb-16 rounded-[2px] border border-border bg-card p-8">
              <h3 className="font-semibold text-foreground mb-3" style={{ fontSize: "var(--font-size-lg)", letterSpacing: "-0.01em" }}>
                {t("Despre Therme București", "About Therme Bucharest")}
              </h3>
              <p className="text-muted-foreground" style={{ fontSize: "var(--font-size-base)", lineHeight: "var(--line-height-relaxed)", maxWidth: "45rem" }}>
                {t(
                  "Therme București este cel mai mare complex spa de wellness din Europa, primind peste 3 milioane de vizitatori anual. Cuprinde zone de spa, piscine termale, saune și facilități de wellness, operând la standarde internaționale cu susținere investițională instituțională.",
                  "Therme Bucharest is Europe's largest spa wellness complex, welcoming more than 3 million visitors annually. It encompasses spa zones, thermal pools, saunas and wellness facilities, operating to international standards with institutional investment backing.",
                )}
              </p>
            </div>

            {/* CTA */}
            <div className="rounded-[2px] bg-foreground p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-background font-semibold mb-2" style={{ fontSize: "var(--font-size-xl)", letterSpacing: "-0.02em" }}>
                  {t("Vrei rezultate similare?", "Want similar results?")}
                </h3>
                <p className="text-background/60" style={{ fontSize: "var(--font-size-sm)" }}>
                  {t("Contactează echipa noastră pentru o consultanță personalizată.", "Contact our team for a personalised consultation.")}
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-[1px] bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground no-underline hover:no-underline whitespace-nowrap transition-all"
                style={{ letterSpacing: "-0.01em" }}
              >
                {t("Contactează-ne", "Contact us")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </main>
        </div>
      </div>

      {/* Related Case Studies */}
      <section className="border-t border-border bg-secondary/50 section-m">
        <div className="mx-auto max-w-[1220px] px-4 sm:px-8">
          <h2 className="text-foreground mb-8" style={{ fontSize: "var(--font-size-2xl)", letterSpacing: "-0.02em", fontWeight: 600 }}>
            {t("Alte studii de caz", "Other case studies")}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/resurse/studii-de-caz/radisson-bucuresti" className="group rounded-[2px] border border-border bg-card p-6 no-underline hover:no-underline hover:border-accent/40 transition-all hover-lift">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent mb-3">HORECA / {t("Hotel", "Hotel")}</div>
              <h3 className="text-foreground font-semibold mb-2 group-hover:text-accent transition-colors" style={{ fontSize: "var(--font-size-lg)", letterSpacing: "-0.01em" }}>
                Radisson Blu București
              </h3>
              <p className="text-muted-foreground mb-4" style={{ fontSize: "var(--font-size-sm)", lineHeight: "var(--line-height-relaxed)" }}>
                {t("Creștere de 40% a eficienței operaționale prin control BMS integrat.", "40% increase in operational efficiency through integrated BMS control.")}
              </p>
              <span className="text-sm font-semibold text-accent inline-flex items-center gap-1">
                {t("Citește studiul", "Read the study")} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
            <Link href="/contact" className="group rounded-[2px] border border-border bg-card p-6 no-underline hover:no-underline hover:border-accent/40 transition-all hover-lift">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent mb-3">{t("Proiectul tău", "Your project")}</div>
              <h3 className="text-foreground font-semibold mb-2 group-hover:text-accent transition-colors" style={{ fontSize: "var(--font-size-lg)", letterSpacing: "-0.01em" }}>
                {t("Următorul studiu de caz poate fi al tău", "The next case study could be yours")}
              </h3>
              <p className="text-muted-foreground mb-4" style={{ fontSize: "var(--font-size-sm)", lineHeight: "var(--line-height-relaxed)" }}>
                {t("Contactează-ne și află cum putem ajuta clădirea ta să obțină rezultate similare.", "Contact us and find out how we can help your building achieve similar results.")}
              </p>
              <span className="text-sm font-semibold text-accent inline-flex items-center gap-1">
                {t("Programează o consultanță", "Schedule a consultation")} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
