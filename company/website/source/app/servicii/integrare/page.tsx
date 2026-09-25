"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, CheckCircle2, Network, Zap, Target, Cpu } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

export default function IntegrarePage() {
  const { t } = useLanguage()

  const protocols = [
    { ro: "BACnet IP/MS-TP", en: "BACnet IP/MS-TP" },
    { ro: "KNX/EIB", en: "KNX/EIB" },
    { ro: "Modbus RTU/TCP", en: "Modbus RTU/TCP" },
    { ro: "M-Bus", en: "M-Bus" },
    { ro: "DALI (iluminat)", en: "DALI (lighting)" },
    { ro: "OPC UA", en: "OPC UA" },
  ]

  const processSteps = [
    {
      num: "1",
      titleRo: "Audit Sisteme Existente",
      titleEn: "Existing Systems Audit",
      bodyRo:
        "Analizăm toate sistemele tehnice existente în clădire: HVAC, iluminat, control acces, contorizare, detecție incendiu. Identificăm protocoalele de comunicație și punctele de integrare disponibile.",
      bodyEn:
        "We analyse all existing technical systems in the building: HVAC, lighting, access control, metering, fire detection. We identify communication protocols and available integration points.",
      durationRo: "Durată: 2–4 zile",
      durationEn: "Duration: 2–4 days",
    },
    {
      num: "2",
      titleRo: "Arhitectură de Integrare",
      titleEn: "Integration Architecture",
      bodyRo:
        "Proiectăm arhitectura de integrare, selectăm gateway-urile necesare și definim structura de date. Stabilim ierarhia sistemului și logica de comunicare între diversele subsisteme.",
      bodyEn:
        "We design the integration architecture, select the necessary gateways and define the data structure. We establish the system hierarchy and the communication logic between the various sub-systems.",
      durationRo: "Durată: 1 săptămână",
      durationEn: "Duration: 1 week",
    },
    {
      num: "3",
      titleRo: "Programare și Configurare",
      titleEn: "Programming and Configuration",
      bodyRo:
        "Programăm controllerele BMS folosind software-ul SAUTER CASE Suite, configurăm comunicația între sisteme și implementăm logica de automatizare. Dezvoltăm interfețe grafice personalizate pentru operare.",
      bodyEn:
        "We programme BMS controllers using SAUTER CASE Suite software, configure inter-system communication and implement automation logic. We develop custom graphical interfaces for operation.",
      durationRo: "Durată: 2–4 săptămâni",
      durationEn: "Duration: 2–4 weeks",
    },
    {
      num: "4",
      titleRo: "Testare End-to-End",
      titleEn: "End-to-End Testing",
      bodyRo:
        "Verificăm comunicația între toate sistemele integrate, testăm scenariile de automatizare și optimizăm parametrii. Validăm funcționarea corectă în condiții reale de operare.",
      bodyEn:
        "We verify communication between all integrated systems, test automation scenarios and optimise parameters. We validate correct operation under real operating conditions.",
      durationRo: "Durată: 1–2 săptămâni",
      durationEn: "Duration: 1–2 weeks",
    },
  ]

  const protocolCards = [
    {
      title: "BACnet",
      descRo: "Protocol standard pentru comunicația între echipamentele BMS. Suportăm BACnet IP și MS/TP.",
      descEn: "Standard protocol for communication between BMS equipment. We support BACnet IP and MS/TP.",
    },
    {
      title: "KNX/EIB",
      descRo: "Standard european pentru automatizarea clădirilor, ideal pentru controlul iluminatului și al jaluzelelor.",
      descEn: "European standard for building automation, ideal for lighting and blind control.",
    },
    {
      title: "Modbus",
      descRo: "Protocol industrial pentru comunicația cu echipamentele de teren, contoare și PLC-uri.",
      descEn: "Industrial protocol for communication with field equipment, meters and PLCs.",
    },
    {
      title: "M-Bus",
      descRo: "Protocol pentru citirea contoarelor de utilități: electricitate, apă, gaz, energie termică.",
      descEn: "Protocol for reading utility meters: electricity, water, gas, heat.",
    },
  ]

  const stats = [
    { value: "100%", labelRo: "Vizibilitate centralizată", labelEn: "Centralised visibility" },
    { value: "40%", labelRo: "Reducerea timpului de intervenție", labelEn: "Reduction in intervention time" },
    { value: "1", labelRo: "Interfață unică de control", labelEn: "Single control interface" },
    { value: "∞", labelRo: "Scenarii de automatizare", labelEn: "Automation scenarios" },
  ]

  return (
    <article className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">
                {t("Acasă", "Home")}
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/servicii" className="hover:text-foreground transition-colors">
                {t("Servicii", "Services")}
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground">{t("Integrare Sisteme", "System Integration")}</li>
          </ol>
        </nav>

        <div className="grid gap-12 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-8">
            <div>
              <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent mb-4">
                {t("Servicii BMS", "BMS Services")}
              </span>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                {t("Durata medie proiect", "Average project duration")}
              </h3>
              <div className="flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-accent" />
                <span className="font-semibold">{t("2–8 săptămâni", "2–8 weeks")}</span>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                {t("Protocoale suportate", "Supported protocols")}
              </h3>
              <ul className="space-y-3 text-sm">
                {protocols.map((item) => (
                  <li key={item.en} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    <span>{t(item.ro, item.en)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-border pt-6">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <Link href="/contact">{t("Solicită o consultație gratuită", "Request a free consultation")}</Link>
              </Button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="max-w-3xl">
            <header className="mb-10">
              <h1 className="text-4xl font-bold text-foreground mb-4 md:text-5xl">
                {t("Integrare Sisteme", "System Integration")}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {t(
                  "Servicii specializate de programare cu software licențiat, integrare de protocoale multiple (KNX, DALI, Modbus, M-Bus, BACnet) și conectarea sistemelor complexe într-o platformă unificată.",
                  "Specialised programming services with licensed software, integration of multiple protocols (KNX, DALI, Modbus, M-Bus, BACnet) and connection of complex systems into a unified platform.",
                )}
              </p>
            </header>

            {/* Hero Image */}
            <div className="mb-12 aspect-video overflow-hidden rounded-[2px] bg-muted">
              <img
                src="/services-system-integration.jpg"
                alt={t("Integrare sisteme BMS", "BMS system integration")}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Process Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Target className="h-6 w-6 text-accent" />
                {t("Procesul de Integrare", "Integration Process")}
              </h2>

              <div className="space-y-6">
                {processSteps.map((step) => (
                  <div key={step.num} className="rounded-[2px] border border-border bg-card p-6">
                    <div className="flex items-start gap-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white text-sm font-bold shrink-0">
                        {step.num}
                      </span>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">{t(step.titleRo, step.titleEn)}</h3>
                        <p className="text-muted-foreground leading-relaxed">{t(step.bodyRo, step.bodyEn)}</p>
                        <p className="text-sm text-accent mt-2">{t(step.durationRo, step.durationEn)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Protocols Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Network className="h-6 w-6 text-accent" />
                {t("Protocoale și Tehnologii", "Protocols and Technologies")}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {protocolCards.map((card) => (
                  <div key={card.title} className="rounded-[2px] border border-border bg-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Cpu className="h-5 w-5 text-accent" />
                      <h3 className="font-semibold text-foreground">{card.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{t(card.descRo, card.descEn)}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Impact Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Zap className="h-6 w-6 text-accent" />
                {t("Impact și Beneficii", "Impact and Benefits")}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {stats.map((stat) => (
                  <Card key={stat.labelEn} className="border-border/40 bg-accent/5">
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl font-bold text-accent mb-2">{stat.value}</div>
                      <p className="text-sm text-muted-foreground">{t(stat.labelRo, stat.labelEn)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* CTA Section */}
            <section className="rounded-[2px] bg-accent/10 border border-accent/20 p-8 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                {t("Ai sisteme separate care nu comunică între ele?", "Do you have separate systems that don't communicate?")}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                {t(
                  "Integrăm toate sistemele tale într-o singură platformă. Contactează-ne pentru o analiză gratuită a infrastructurii existente.",
                  "We integrate all your systems into a single platform. Contact us for a free analysis of your existing infrastructure.",
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                  <Link href="/contact">{t("Solicită un audit gratuit", "Request a free audit")}</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-border hover:bg-accent/10 bg-transparent" asChild>
                  <Link href="/resurse/referinte">{t("Vezi proiecte de integrare", "View integration projects")}</Link>
                </Button>
              </div>
            </section>

            {/* Related Services */}
            <section className="mt-12 pt-12 border-t border-border">
              <h3 className="text-lg font-semibold text-foreground mb-6">{t("Servicii conexe", "Related services")}</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <Link
                  href="/servicii/proiectare"
                  className="group rounded-[2px] border border-border p-4 hover:border-accent/50 transition-colors"
                >
                  <h4 className="font-medium text-foreground group-hover:text-accent transition-colors">
                    {t("Proiectare BMS", "BMS Design")}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("Proiectare completă de sisteme BMS", "Complete BMS system design")}
                  </p>
                </Link>
                <Link
                  href="/servicii/executie"
                  className="group rounded-[2px] border border-border p-4 hover:border-accent/50 transition-colors"
                >
                  <h4 className="font-medium text-foreground group-hover:text-accent transition-colors">
                    {t("Execuție & Implementare", "Execution & Implementation")}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("Instalare echipamente SAUTER", "SAUTER equipment installation")}
                  </p>
                </Link>
                <Link
                  href="/servicii/mentenanta"
                  className="group rounded-[2px] border border-border p-4 hover:border-accent/50 transition-colors"
                >
                  <h4 className="font-medium text-foreground group-hover:text-accent transition-colors">
                    {t("Mentenanță", "Maintenance")}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("Service și upgrade-uri", "Service and upgrades")}
                  </p>
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>
    </article>
  )
}
