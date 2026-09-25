"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Copy, Linkedin, Twitter, Facebook } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

export default function OptimizareHotelBMSPage() {
  const { t } = useLanguage()

  const tocItems = [
    { label: t("Nevoia de sisteme inteligente", "The need for smart systems"), id: "nevoia" },
    { label: t("Soluțiile BMS Sovitech", "Sovitech BMS solutions"), id: "solutii" },
    { label: t("Radisson Blu - Studiu de caz", "Radisson Blu - Case study"), id: "studiu-caz" },
    { label: t("Economii și benchmark-uri", "Savings and benchmarks"), id: "economii" },
    { label: t("Recomandări implementare", "Implementation recommendations"), id: "recomandari" },
    { label: t("KPI-uri de monitorizare", "Monitoring KPIs"), id: "kpis" },
  ]

  const solutions = [
    {
      title: t("Control HVAC inteligent", "Smart HVAC control"),
      desc: t(
        "Reglare automată a temperaturii și ventilație în funcție de ocupare",
        "Automatic temperature adjustment and occupancy-based ventilation",
      ),
    },
    {
      title: t("Monitorizare energetică", "Energy monitoring"),
      desc: t(
        "Dashboard-uri în timp real pentru consum și eficiență",
        "Real-time dashboards for consumption and efficiency",
      ),
    },
    {
      title: t("Integrare Fidelio", "Fidelio integration"),
      desc: t(
        "Conectare cu sistemul de management hotelier pentru control pe cameră",
        "Connection to the hotel management system for per-room control",
      ),
    },
    {
      title: t("Control piscine și spa", "Pool and spa control"),
      desc: t(
        "Automatizare completă pentru facilități de wellness",
        "Complete automation for wellness facilities",
      ),
    },
    {
      title: t("Protocoale deschise", "Open protocols"),
      desc: t(
        "KNX, DALI, Modbus, M-Bus, BACnet pentru interoperabilitate",
        "KNX, DALI, Modbus, M-Bus, BACnet for interoperability",
      ),
    },
    {
      title: t("Alerte și mentenanță", "Alerts and maintenance"),
      desc: t(
        "Notificări automate pentru anomalii și întreținere preventivă",
        "Automatic notifications for anomalies and preventive maintenance",
      ),
    },
  ]

  const benchmarks = [
    {
      hotel: t("DoubleTree by Hilton (170 camere)", "DoubleTree by Hilton (170 rooms)"),
      value: 65,
      detail: t(
        "După audit sistematic și monitorizare nouă",
        "After a systematic audit and new monitoring",
      ),
    },
    {
      hotel: "Carlson Rezidor Amsterdam",
      value: 30,
      detail: t(
        "Automatizare + iluminat eficient + obișnuințe inteligente",
        "Automation + efficient lighting + smart habits",
      ),
    },
    {
      hotel: t("Benchmark mediu industrie", "Industry average benchmark"),
      value: 25,
      detail: t(
        "Estimare conservatoare pentru upgrade BMS standard",
        "Conservative estimate for a standard BMS upgrade",
      ),
    },
  ]

  const recommendations = [
    {
      step: "1",
      title: t("Realizați un audit energetic complet", "Carry out a complete energy audit"),
      desc: t(
        "Cartografiați toate sistemele mecanice, electrice și de apă. Analizați facturile de utilități, contorizați subsistemele și identificați consumatorii excesivi.",
        "Map all mechanical, electrical and water systems. Analyse utility bills, meter the subsystems and identify excessive consumers.",
      ),
    },
    {
      step: "2",
      title: t("Upgrade-uiți senzorii și controlerele", "Upgrade sensors and controllers"),
      desc: t(
        "Înlocuiți termostatele și senzorii de presiune învechiți cu versiuni moderne, conectate la rețea. Instalați subcontoare în zone cheie (bucătărie, spălătorie, spa).",
        "Replace outdated thermostats and pressure sensors with modern, network-connected versions. Install sub-meters in key areas (kitchen, laundry, spa).",
      ),
    },
    {
      step: "3",
      title: t("Integrați sistemele sub un singur BMS", "Integrate the systems under a single BMS"),
      desc: t(
        "Asigurați-vă că HVAC, iluminatul, refrigerarea și alte sisteme raportează către un BMS unificat. Implementați logică pentru programe orare, ajustări bazate pe ocupare și ventilație controlată.",
        "Make sure HVAC, lighting, refrigeration and other systems report to a unified BMS. Implement logic for time schedules, occupancy-based adjustments and controlled ventilation.",
      ),
    },
    {
      step: "4",
      title: t("Folosiți analitica și monitorizarea", "Use analytics and monitoring"),
      desc: t(
        "Utilizați dashboard-uri software pentru a vizualiza tendințe și alerte. Revizuiți regulat consumul față de baseline-uri ajustate la vreme. Folosiți detecția anomaliilor pentru a prinde defecțiunile devreme.",
        "Use software dashboards to visualise trends and alerts. Regularly review consumption against weather-adjusted baselines. Use anomaly detection to catch faults early.",
      ),
    },
    {
      step: "5",
      title: t("Implicați personalul și oaspeții", "Involve staff and guests"),
      desc: t(
        "Instruirea este vitală: echipele de facilități trebuie să înțeleagă interfețele BMS și procedurile de răspuns. Considerați programe orientate către oaspeți care încurajează comportamentul conștient energetic.",
        "Training is vital: facilities teams must understand the BMS interfaces and response procedures. Consider guest-facing programmes that encourage energy-conscious behaviour.",
      ),
    },
  ]

  const kpis = [
    {
      kpi: t("Intensitatea consumului energetic (EUI)", "Energy Use Intensity (EUI)"),
      desc: t(
        "kWh per metru pătrat (sau per cameră-noapte) pe an. Oferă un baseline pentru evaluarea îmbunătățirilor.",
        "kWh per square metre (or per room-night) per year. Provides a baseline for evaluating improvements.",
      ),
    },
    {
      kpi: t("Cost energetic per cameră ocupată (ECOR)", "Energy Cost per Occupied Room (ECOR)"),
      desc: t(
        "Cheltuiala totală cu energia împărțită la numărul de cameră-nopți ocupate. Leagă consumul de generatorii de venituri.",
        "Total energy spend divided by the number of occupied room-nights. Ties consumption to revenue generators.",
      ),
    },
    {
      kpi: t("Eficiența HVAC", "HVAC efficiency"),
      desc: t(
        "Raportul dintre energia reală și cea ideală pentru încălzire/răcire. Metrici precum COP (Coeficientul de Performanță) pentru chillere.",
        "The ratio of actual to ideal energy for heating/cooling. Metrics such as COP (Coefficient of Performance) for chillers.",
      ),
    },
    {
      kpi: t("Indicatori de confort al oaspeților", "Guest comfort indicators"),
      desc: t(
        "Numărul de reclamații de temperatură sau devieri ale senzorilor. Un BMS funcțional menține condițiile în limita a plus/minus 1-2 grade față de setpoint.",
        "The number of temperature complaints or sensor deviations. A well-functioning BMS keeps conditions within plus/minus 1-2 degrees of the setpoint.",
      ),
    },
    {
      kpi: t("Emisii de gaze cu efect de seră", "Greenhouse gas emissions"),
      desc: t(
        "Kg CO2 per oaspete-noapte, mai ales cu inputuri de energie regenerabilă.",
        "Kg CO2 per guest-night, especially with renewable energy inputs.",
      ),
    },
    {
      kpi: t("Uptime mentenanță", "Maintenance uptime"),
      desc: t(
        "Procentul de funcționare al sistemelor critice (boilere, chillere). Sisteme mai stabile înseamnă mai puțină mentenanță reactivă.",
        "The operating percentage of critical systems (boilers, chillers). More stable systems mean less reactive maintenance.",
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b border-border/40">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/resurse"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("Resurse", "Resources")}
          </Link>
        </div>
      </div>

      {/* Article */}
      <article className="container mx-auto px-4 py-12">
        <div className="grid gap-12 lg:grid-cols-[280px_1fr]">
          {/* Left Sidebar */}
          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {t("Categorie", "Category")}
              </p>
              <Link
                href="/resurse?category=ghid"
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {t("Ghid Tehnic", "Technical Guide")}
              </Link>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                {t("Scris de", "Written by")}
              </p>
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted">
                  <Image src="/professional-male-engineer-headshot.jpg" alt="Andrei Popescu" fill className="object-cover" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Andrei Popescu</p>
                  <p className="text-sm text-muted-foreground">{t("Director Tehnic, Sovitech", "Technical Director, Sovitech")}</p>
                </div>
              </div>
            </div>

            {/* Table of Contents */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                {t("Cuprins", "Contents")}
              </p>
              <nav className="space-y-2">
                {tocItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                {t("Distribuie", "Share")}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-transparent">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-transparent">
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-transparent">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-transparent">
                  <Facebook className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="max-w-3xl">
            <header className="mb-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                {t("Ghid Tehnic", "Technical Guide")}
              </div>
              <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tighter text-foreground md:text-5xl">
                {t(
                  "Optimizarea performanței hoteliere prin automatizare și management energetic",
                  "Optimising hotel performance through automation and energy management",
                )}
              </h1>
              <p className="mb-6 text-xl text-muted-foreground leading-relaxed">
                {t(
                  "Cum pot hotelurile moderne să reducă costurile energetice cu 25-65% menținând confortul oaspeților la cele mai înalte standarde prin sisteme BMS integrate.",
                  "How modern hotels can reduce energy costs by 25-65% while keeping guest comfort at the highest standards through integrated BMS systems.",
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("Feb 20, 2026 — 18 min citire", "Feb 20, 2026 — 18 min read")}
              </p>
            </header>

            {/* Hero Image */}
            <div className="relative mb-12 aspect-[16/9] overflow-hidden rounded-[2px] bg-muted">
              <Image
                src="/luxury-hotel-lobby-modern-interior.jpg"
                alt={t("Interior hotel modern cu sistem de automatizare", "Modern hotel interior with automation system")}
                fill
                className="object-cover"
              />
            </div>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none">
              <p className="text-lg leading-relaxed text-foreground">
                {t(
                  "Hotelurile moderne se confruntă cu costuri energetice în creștere și cerințe de sustenabilitate tot mai stricte, în timp ce se străduiesc să mențină confortul oaspeților. Integrarea sistemelor avansate de Building Management (BMS) este acum esențială pentru operațiuni eficiente.",
                  "Modern hotels face rising energy costs and ever-stricter sustainability requirements while striving to maintain guest comfort. Integrating advanced Building Management Systems (BMS) is now essential for efficient operations.",
                )}
              </p>

              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "Sovitech Control, specialist român în BMS, implementează soluții integrate care",
                  "Sovitech Control, a Romanian BMS specialist, implements integrated solutions that",
                )}{" "}
                <strong className="text-foreground">
                  {t(
                    "optimizează consumul energetic, reduc costurile operaționale și mențin confortul ridicat al ocupanților",
                    "optimise energy consumption, reduce operating costs and maintain high occupant comfort",
                  )}
                </strong>
                {t(
                  ". De exemplu, Radisson Blu Hotel București — un hotel de 5 stele cu 424 de camere și facilități extinse (restaurante, spa, sală de fitness, piscine interioare și exterioare) — a adoptat automatizarea inteligentă pentru a-și îndeplini certificarea Green Key și standardele ridicate de eficiență energetică.",
                  ". For example, the Radisson Blu Hotel Bucharest — a 5-star hotel with 424 rooms and extensive facilities (restaurants, spa, fitness room, indoor and outdoor pools) — adopted intelligent automation to meet its Green Key certification and high energy efficiency standards.",
                )}
              </p>

              {/* Section: Need */}
              <h2 id="nevoia" className="mt-16 mb-6 text-3xl font-bold text-foreground">
                {t("Nevoia de sisteme inteligente în hoteluri", "The need for smart systems in hotels")}
              </h2>

              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "Hotelurile funcționează 24/7, generând cerere constantă pentru încălzire, răcire, iluminat și apă caldă. Fără control centralizat, consumul de energie",
                  "Hotels operate 24/7, generating constant demand for heating, cooling, lighting and hot water. Without centralised control, energy consumption",
                )}{" "}
                <strong className="text-foreground">
                  {t("poate scăpa ușor de sub control", "can easily spiral out of control")}
                </strong>
                {t(
                  ", făcând costurile de utilități imprevizibile și mari.",
                  ", making utility costs unpredictable and high.",
                )}
              </p>

              {/* Key Data Point */}
              <div className="my-12 rounded-[2px] border border-border bg-card p-8">
                <h4 className="mb-6 text-lg font-semibold text-foreground">
                  {t("Consumul energetic tipic al unui hotel", "The typical energy consumption of a hotel")}
                </h4>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div className="rounded-[2px] bg-muted/50 p-6">
                    <p className="text-3xl font-bold text-primary mb-2">1.52</p>
                    <p className="text-sm text-muted-foreground">
                      {t("GWh/an consum", "GWh/yr consumption")}
                      <br />
                      {t("hotel 170 camere", "170-room hotel")}
                    </p>
                  </div>
                  <div className="rounded-[2px] bg-muted/50 p-6">
                    <p className="text-3xl font-bold text-primary mb-2">82.6%</p>
                    <p className="text-sm text-muted-foreground">
                      {t("Scor BREEAM", "BREEAM score")}
                      <br />
                      Radisson Blu
                    </p>
                  </div>
                  <div className="rounded-[2px] bg-muted/50 p-6">
                    <p className="text-3xl font-bold text-primary mb-2">100%</p>
                    <p className="text-sm text-muted-foreground">
                      {t("Electricitate din", "Electricity from")}
                      <br />
                      {t("surse regenerabile", "renewable sources")}
                    </p>
                  </div>
                </div>
                <p className="mt-6 text-sm text-muted-foreground">
                  {t(
                    "Sursa: Studiu Spacewell și date Radisson Blu București",
                    "Source: Spacewell study and Radisson Blu Bucharest data",
                  )}
                </p>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "Presiunile de reglementare și branding împing hotelurile către sustenabilitate. Radisson Blu București, de exemplu, folosește 100% electricitate regenerabilă și a obținut un scor BREEAM In-Use Excellent de 82.6%. Atingerea acestor obiective necesită monitorizare și control precis al tuturor sistemelor din clădire.",
                  "Regulatory and branding pressures push hotels towards sustainability. Radisson Blu Bucharest, for example, uses 100% renewable electricity and achieved a BREEAM In-Use Excellent score of 82.6%. Reaching these goals requires precise monitoring and control of every system in the building.",
                )}
              </p>

              {/* Section: Solutions */}
              <h2 id="solutii" className="mt-16 mb-6 text-3xl font-bold text-foreground">
                {t("Soluțiile BMS Sovitech pentru hoteluri", "Sovitech BMS solutions for hotels")}
              </h2>

              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "Sovitech Control furnizează servicii de automatizare end-to-end adaptate sectorului de ospitalitate. Ca partener autorizat al producătorului elvețian SAUTER, Sovitech oferă o gamă completă de hardware BMS (controlere, vane, senzori, termostate) și software.",
                  "Sovitech Control provides end-to-end automation services tailored to the hospitality sector. As an authorised partner of the Swiss manufacturer SAUTER, Sovitech offers a complete range of BMS hardware (controllers, valves, sensors, thermostats) and software.",
                )}
              </p>

              <div className="my-8 grid gap-4 sm:grid-cols-2">
                {solutions.map((item) => (
                  <div key={item.title} className="rounded-[2px] border border-border/40 bg-card p-5">
                    <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "Prin centralizarea datelor din multiple subsisteme, un BMS Sovitech oferă operatorilor",
                  "By centralising data from multiple subsystems, a Sovitech BMS gives operators",
                )}{" "}
                <strong className="text-foreground">
                  {t("o singură interfață pentru toate operațiunile", "a single interface for all operations")}
                </strong>
                {t(
                  ". Echipa de facilități a hotelului poate ajusta temperaturi, seta moduri de ventilație și vizualiza consumul energetic în timp real.",
                  ". The hotel's facilities team can adjust temperatures, set ventilation modes and view energy consumption in real time.",
                )}
              </p>

              {/* Section: Case Study */}
              <h2 id="studiu-caz" className="mt-16 mb-6 text-3xl font-bold text-foreground">
                {t(
                  "Radisson Blu București: un exemplu de ospitalitate sustenabilă",
                  "Radisson Blu Bucharest: an example of sustainable hospitality",
                )}
              </h2>

              <div className="relative my-8 aspect-[16/9] overflow-hidden rounded-[2px] bg-muted">
                <Image
                  src="/ref-radisson-blu.jpg"
                  alt={t("Hotel Radisson Blu București", "Radisson Blu Hotel Bucharest")}
                  fill
                  className="object-cover"
                />
              </div>

              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "Proprietatea de 5 stele — cu 12 săli de conferințe, un ballroom pentru 500+ invitați, multiple restaurante și facilități spa — reprezintă o provocare complexă de control. Implementarea Sovitech a oferit Radisson Blu supraveghere centralizată a sistemelor HVAC, apei calde, încălzirii piscinelor și iluminatului.",
                  "The 5-star property — with 12 conference rooms, a ballroom for 500+ guests, multiple restaurants and spa facilities — is a complex control challenge. The Sovitech implementation gave Radisson Blu centralised oversight of the HVAC systems, hot water, pool heating and lighting.",
                )}
              </p>

              <div className="my-8 rounded-[2px] bg-primary/5 border border-primary/20 p-6">
                <p className="text-foreground font-medium mb-3">
                  {t("Rezultate post-implementare:", "Post-implementation results:")}
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                    <span>
                      <strong className="text-foreground">
                        {t("Vizibilitate energetică în timp real", "Real-time energy visibility")}
                      </strong>{" "}
                      {t("pe întreaga proprietate", "across the entire property")}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                    <span>
                      <strong className="text-foreground">{t("Climate interioare stabile", "Stable indoor climates")}</strong>{" "}
                      {t("în toate zonele, îmbunătățind confortul oaspeților", "in all areas, improving guest comfort")}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                    <span>
                      <strong className="text-foreground">{t("Optimizare chiller", "Chiller optimisation")}</strong>{" "}
                      {t(
                        "în camerele pentru oaspeți în perioadele de ocupare redusă",
                        "in guest rooms during low-occupancy periods",
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                    <span>
                      <strong className="text-foreground">{t("Investiție de 1.6M EUR", "EUR 1.6M investment")}</strong>{" "}
                      {t(
                        "în spații de evenimente pentru reducerea amprentei de carbon",
                        "in event spaces to reduce the carbon footprint",
                      )}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Section: Benchmarks */}
              <h2 id="economii" className="mt-16 mb-6 text-3xl font-bold text-foreground">
                {t("Economii energetice și benchmark-uri din industrie", "Energy savings and industry benchmarks")}
              </h2>

              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "Mai multe lanțuri hoteliere raportează câștiguri semnificative din managementul energetic:",
                  "Several hotel chains report significant gains from energy management:",
                )}
              </p>

              {/* Benchmark Data */}
              <div className="my-12 rounded-[2px] border border-border bg-card p-8">
                <h4 className="mb-6 text-lg font-semibold text-foreground">
                  {t("Reduceri energetice raportate de lanțuri hoteliere", "Energy reductions reported by hotel chains")}
                </h4>
                <div className="space-y-4">
                  {benchmarks.map((item) => (
                    <div key={item.hotel} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.hotel}</span>
                        <span className="font-medium text-foreground">-{item.value}%</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="my-12 rounded-[2px] border border-border bg-card p-8">
                <h4 className="mb-6 text-lg font-semibold text-foreground">
                  {t("KPI-uri tipice de benchmarking", "Typical benchmarking KPIs")}
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-[2px] bg-muted/50 p-5">
                    <p className="text-2xl font-bold text-primary mb-1">{"100-150"}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("kWh/mp/an", "kWh/sqm/yr")}
                      <br />
                      {t("consum hotel tipic", "typical hotel consumption")}
                    </p>
                  </div>
                  <div className="rounded-[2px] bg-muted/50 p-5">
                    <p className="text-2xl font-bold text-primary mb-1">{"20-30%"}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("Reducere țintă", "Target reduction")}
                      <br />
                      {t("obiectiv BMS comun", "common BMS objective")}
                    </p>
                  </div>
                  <div className="rounded-[2px] bg-muted/50 p-5">
                    <p className="text-2xl font-bold text-primary mb-1">{"3-5"}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("Ani perioadă", "Years payback")}
                      <br />
                      {t("de amortizare", "period")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section: Recommendations */}
              <h2 id="recomandari" className="mt-16 mb-6 text-3xl font-bold text-foreground">
                {t("Recomandări pentru implementarea BMS", "Recommendations for BMS implementation")}
              </h2>

              <p className="text-muted-foreground leading-relaxed mb-8">
                {t(
                  "Bazat pe aceste informații, recomandăm managerilor hotelieri o abordare structurată:",
                  "Based on this information, we recommend a structured approach to hotel managers:",
                )}
              </p>

              <div className="space-y-6">
                {recommendations.map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground flex-shrink-0">
                      {item.step}
                    </span>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                      <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Section: KPIs */}
              <h2 id="kpis" className="mt-16 mb-6 text-3xl font-bold text-foreground">
                {t("KPI-uri pentru monitorizarea succesului", "KPIs for monitoring success")}
              </h2>

              <p className="text-muted-foreground leading-relaxed mb-8">
                {t(
                  "Hotelurile ar trebui să urmărească KPI-uri care reflectă atât energia cât și confortul:",
                  "Hotels should track KPIs that reflect both energy and comfort:",
                )}
              </p>

              <div className="my-8 space-y-4">
                {kpis.map((item) => (
                  <div key={item.kpi} className="rounded-[2px] border border-border/40 bg-card p-5">
                    <h4 className="font-semibold text-foreground mb-1">{item.kpi}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Conclusion */}
              <h2 className="mt-16 mb-6 text-3xl font-bold text-foreground">{t("Concluzie", "Conclusion")}</h2>

              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "Pentru managerii de facilități hoteliere, investiția în automatizare avansată este o cale către experiențe mai bune pentru oaspeți și marje de profit mai sănătoase. După cum demonstrează Radisson Blu București și alții, integrarea BMS inteligentă poate reduce dramatic consumul energetic (adesea în intervalul 25-65%) asigurând în același timp confort fiabil.",
                  "For hotel facilities managers, investing in advanced automation is a path to better guest experiences and healthier profit margins. As Radisson Blu Bucharest and others demonstrate, intelligent BMS integration can dramatically reduce energy consumption (often in the 25-65% range) while ensuring reliable comfort.",
                )}
              </p>

              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "Prin urmarea unui proces disciplinat de implementare, monitorizarea KPI-urilor relevante și ajustarea continuă a operațiunilor, hotelurile pot debloca aceste economii și beneficii de sustenabilitate. Într-o industrie unde reputația și bugetele sunt strâns legate, trecerea către managementul inteligent, bazat pe date, al facilităților este atât inevitabilă cât și profitabilă.",
                  "By following a disciplined implementation process, monitoring the relevant KPIs and continuously adjusting operations, hotels can unlock these savings and sustainability benefits. In an industry where reputation and budgets are closely linked, the shift towards smart, data-driven facilities management is both inevitable and profitable.",
                )}
              </p>

              {/* CTA */}
              <div className="mt-16 rounded-[2px] bg-primary/5 border border-primary/20 p-8 text-center">
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  {t(
                    "Doriți o evaluare BMS pentru hotelul dumneavoastră?",
                    "Would you like a BMS assessment for your hotel?",
                  )}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                  {t(
                    "Specialiștii Sovitech oferă audituri energetice gratuite pentru proprietăți hoteliere. Descoperiți cât puteți economisi în maxim 2 ore.",
                    "Sovitech specialists offer free energy audits for hotel properties. Find out how much you can save in no more than 2 hours.",
                  )}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/contact">
                    <Button size="lg" className="rounded-full">
                      {t("Programează audit gratuit", "Schedule a free audit")}
                    </Button>
                  </Link>
                  <Link href="/resurse/studii-de-caz/radisson-bucuresti">
                    <Button size="lg" variant="outline" className="rounded-full bg-transparent">
                      {t("Vezi studiul de caz Radisson", "See the Radisson case study")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Related Articles */}
            <div className="mt-16 border-t border-border/40 pt-12">
              <h3 className="mb-8 text-2xl font-bold text-foreground">{t("Articole similare", "Related articles")}</h3>
              <div className="grid gap-8 sm:grid-cols-2">
                <Link href="/resurse/articole/eficienta-bms" className="group">
                  <div className="relative mb-4 aspect-[5/3] overflow-hidden rounded-[2px] bg-muted">
                    <Image
                      src="/modern-building-automation-dashboard-with-energy-c.jpg"
                      alt={t("Eficiența BMS", "BMS efficiency")}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="mb-2 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                    {t("Date & Analiză", "Data & Analysis")}
                  </div>
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {t(
                      "Cât de eficiente sunt sistemele BMS în reducerea costurilor energetice?",
                      "How effective are BMS systems at reducing energy costs?",
                    )}
                  </h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("Ian 15, 2026 — 12 min citire", "Jan 15, 2026 — 12 min read")}
                  </p>
                </Link>
                <Link href="/resurse/studii-de-caz/therme-bucuresti" className="group">
                  <div className="relative mb-4 aspect-[5/3] overflow-hidden rounded-[2px] bg-muted">
                    <Image
                      src="/therme-bucuresti-spa-exterior-modern.jpg"
                      alt="Therme Bucuresti"
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="mb-2 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                    {t("Studiu de Caz", "Case Study")}
                  </div>
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {t(
                      "Cum a redus Therme București costurile cu 38% prin automatizare BMS",
                      "How Therme București cut costs by 38% through BMS automation",
                    )}
                  </h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("Dec 20, 2025 — 8 min citire", "Dec 20, 2025 — 8 min read")}
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
