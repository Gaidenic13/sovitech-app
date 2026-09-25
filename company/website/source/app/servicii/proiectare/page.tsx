"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, CheckCircle2, FileText, Zap, Target } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

export default function ProiectarePage() {
  const { t } = useLanguage()

  const deliverables = [
    { ro: "Documentație tehnică completă", en: "Complete technical documentation" },
    { ro: "Scheme electrice și de automatizare", en: "Electrical and automation diagrams" },
    { ro: "Listă echipamente cu specificații", en: "Equipment list with specifications" },
    { ro: "Estimare buget și timeline", en: "Budget estimate and timeline" },
  ]

  const processSteps = [
    {
      num: "1",
      titleRo: "Analiză și Evaluare Inițială",
      titleEn: "Initial Analysis and Assessment",
      bodyRo:
        "Echipa noastră efectuează o evaluare completă a clădirii, analizând infrastructura existentă, consumul energetic actual și obiectivele de eficiență. Identificăm oportunitățile de optimizare și definim scope-ul proiectului împreună cu clientul.",
      bodyEn:
        "Our team carries out a complete assessment of the building, analysing the existing infrastructure, current energy consumption and efficiency objectives. We identify optimisation opportunities and define the project scope together with the client.",
      durationRo: "Durată: 3-5 zile lucrătoare",
      durationEn: "Duration: 3-5 working days",
    },
    {
      num: "2",
      titleRo: "Conceptualizare și Design",
      titleEn: "Concept and Design",
      bodyRo:
        "Dezvoltăm conceptul tehnic al sistemului BMS, selectăm echipamentele optime din gama SAUTER și creăm arhitectura sistemului. Definim punctele de măsurare, controlerele necesare și protocoalele de comunicație (BACnet, KNX, Modbus).",
      bodyEn:
        "We develop the technical concept of the BMS system, select the optimal equipment from the SAUTER range and create the system architecture. We define the measurement points, the necessary controllers and the communication protocols (BACnet, KNX, Modbus).",
      durationRo: "Durată: 1-2 săptămâni",
      durationEn: "Duration: 1-2 weeks",
    },
    {
      num: "3",
      titleRo: "Documentație Tehnică",
      titleEn: "Technical Documentation",
      bodyRo:
        "Elaborăm documentația completă de proiectare: scheme electrice, diagrame de automatizare, liste de echipamente cu specificații tehnice, planuri de amplasare și instrucțiuni de montaj. Toate documentele respectă standardele în vigoare.",
      bodyEn:
        "We produce the complete design documentation: electrical diagrams, automation diagrams, equipment lists with technical specifications, layout plans and installation instructions. All documents comply with the standards in force.",
      durationRo: "Durată: 1-2 săptămâni",
      durationEn: "Duration: 1-2 weeks",
    },
    {
      num: "4",
      titleRo: "Validare și Aprobare",
      titleEn: "Validation and Approval",
      bodyRo:
        "Prezentăm proiectul clientului pentru validare, efectuăm ajustările necesare și obținem aprobările finale. Pregătim caietul de sarcini pentru faza de execuție și oferim suport în procesul de achiziție echipamente.",
      bodyEn:
        "We present the design to the client for validation, make the necessary adjustments and obtain final approvals. We prepare the technical specification for the execution phase and provide support during the equipment procurement process.",
      durationRo: "Durată: 3-5 zile lucrătoare",
      durationEn: "Duration: 3-5 working days",
    },
  ]

  const included = [
    {
      titleRo: "Automatizare HVAC",
      titleEn: "HVAC Automation",
      descRo: " - Control inteligent pentru încălzire, ventilație și aer condiționat cu optimizare energetică",
      descEn: " - Intelligent control for heating, ventilation and air conditioning with energy optimisation",
    },
    {
      titleRo: "Sistem de iluminat",
      titleEn: "Lighting system",
      descRo: " - Control automat bazat pe prezență și lumină naturală pentru economii maxime",
      descEn: " - Automatic control based on occupancy and daylight for maximum savings",
    },
    {
      titleRo: "Control acces și securitate",
      titleEn: "Access control and security",
      descRo: " - Integrare cu sistemele de securitate existente sau noi",
      descEn: " - Integration with existing or new security systems",
    },
    {
      titleRo: "Detecție incendiu",
      titleEn: "Fire detection",
      descRo: " - Monitorizare și alertare automată pentru siguranță maximă",
      descEn: " - Automatic monitoring and alerting for maximum safety",
    },
    {
      titleRo: "Contorizare utilități",
      titleEn: "Utility metering",
      descRo: " - Monitorizare consum energie, apă, gaz cu raportare detaliată",
      descEn: " - Monitoring of energy, water and gas consumption with detailed reporting",
    },
  ]

  const stats = [
    { value: "35%", labelRo: "Reducere costuri energetice", labelEn: "Energy cost reduction" },
    { value: "50%", labelRo: "Mai puține intervenții manuale", labelEn: "Fewer manual interventions" },
    { value: t("2-3 ani", "2-3 yrs"), labelRo: "ROI mediu investiție", labelEn: "Average investment ROI" },
    { value: "24/7", labelRo: "Monitorizare automată", labelEn: "Automatic monitoring" },
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
            <li className="text-foreground">{t("Proiectare BMS", "BMS Design")}</li>
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
                <span className="font-semibold">{t("2-6 săptămâni", "2-6 weeks")}</span>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                {t("Livrabile incluse", "Deliverables included")}
              </h3>
              <ul className="space-y-3 text-sm">
                {deliverables.map((item) => (
                  <li key={item.en} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    <span>{t(item.ro, item.en)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-border pt-6">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <Link href="/contact">{t("Solicită consultație gratuită", "Request a free consultation")}</Link>
              </Button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="max-w-3xl">
            <header className="mb-10">
              <h1 className="text-4xl font-bold text-foreground mb-4 md:text-5xl">
                {t("Proiectare BMS", "BMS Design")}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {t(
                  "Proiectare completă de sisteme Building Management System pentru automatizarea funcțiilor critice ale clădirii: HVAC, securitate, control acces, iluminat și detecție incendiu.",
                  "Complete Building Management System design for automating the building's critical functions: HVAC, security, access control, lighting and fire detection.",
                )}
              </p>
            </header>

            {/* Hero Image */}
            <div className="mb-12 aspect-video overflow-hidden rounded-[2px] bg-muted">
              <img
                src="/services-engineering-design.jpg"
                alt={t("Proiectare BMS - Echipă de ingineri", "BMS Design - Engineering team")}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Process Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Target className="h-6 w-6 text-accent" />
                {t("Procesul de Proiectare", "The Design Process")}
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

            {/* What's Included */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <FileText className="h-6 w-6 text-accent" />
                {t("Ce include proiectarea BMS", "What BMS design includes")}
              </h2>

              <div className="prose prose-gray max-w-none">
                <ul className="space-y-3 text-muted-foreground">
                  {included.map((item) => (
                    <li key={item.titleEn} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                      <span>
                        <strong className="text-foreground">{t(item.titleRo, item.titleEn)}</strong>
                        {t(item.descRo, item.descEn)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* CTA Section */}
            <section className="rounded-[2px] bg-accent/10 border border-accent/20 p-8 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                {t("Pregătit să începi proiectul BMS?", "Ready to start your BMS project?")}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                {t(
                  "Contactează-ne pentru o consultație gratuită. Echipa noastră va analiza cerințele tale și va propune soluția optimă pentru clădirea ta.",
                  "Contact us for a free consultation. Our team will analyse your requirements and propose the optimal solution for your building.",
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                  <Link href="/contact">{t("Solicită ofertă gratuită", "Request a free quote")}</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-border hover:bg-accent/10 bg-transparent" asChild>
                  <Link href="/resurse/referinte">{t("Vezi proiecte similare", "View similar projects")}</Link>
                </Button>
              </div>
            </section>

            {/* Related Services */}
            <section className="mt-12 pt-12 border-t border-border">
              <h3 className="text-lg font-semibold text-foreground mb-6">{t("Servicii conexe", "Related services")}</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <Link
                  href="/servicii/executie"
                  className="group rounded-[2px] border border-border p-4 hover:border-accent/50 transition-colors"
                >
                  <h4 className="font-medium text-foreground group-hover:text-accent transition-colors">
                    {t("Execuție & Implementare", "Execution & Implementation")}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("Implementare profesională cu echipamente SAUTER", "Professional implementation with SAUTER equipment")}
                  </p>
                </Link>
                <Link
                  href="/servicii/integrare"
                  className="group rounded-[2px] border border-border p-4 hover:border-accent/50 transition-colors"
                >
                  <h4 className="font-medium text-foreground group-hover:text-accent transition-colors">
                    {t("Integrare Sisteme", "System Integration")}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("Programare și integrare protocoale multiple", "Programming and multi-protocol integration")}
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
                    {t("Service și upgrade-uri de eficiență", "Service and efficiency upgrades")}
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
