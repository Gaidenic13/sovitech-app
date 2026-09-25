"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowUpRight, Share2, Check, ArrowRight, Building2, Thermometer, BarChart3, Shield, Wifi, Users, Zap, Award } from "lucide-react"
import { useState } from "react"
import { useLanguage } from "@/lib/language-context"

const metrics = [
  { value: "424", ro: "Camere monitorizate", en: "Monitored rooms" },
  { value: "82,6%", ro: "Scor energetic BREEAM", en: "BREEAM Energy Score" },
  { value: "~30%", ro: "Reducere consum energetic", en: "Energy consumption reduction" },
  { value: "24/7", ro: "Monitorizare activă", en: "Active monitoring" },
]

const challenges = [
  { icon: Wifi, titleRo: "Sisteme disparate", titleEn: "Disparate systems", descRo: "HVAC și iluminatul erau controlate independent, limitând vizibilitatea și coordonarea.", descEn: "HVAC and lighting were controlled independently, limiting visibility and coordination." },
  { icon: Zap, titleRo: "Consum energetic ridicat", titleEn: "High energy consumption", descRo: "Operarea continuă 24/7 amplifica chiar și ineficiențe minore, generând costuri semnificative.", descEn: "Continuous 24/7 operation amplified even minor inefficiencies, generating significant costs." },
  { icon: Users, titleRo: "Monitorizare manuală", titleEn: "Manual monitoring", descRo: "Fără automatizare centralizată, echipa se baza pe verificări manuale și programe fixe.", descEn: "Without centralised automation, the team relied on manual checks and fixed schedules." },
  { icon: Award, titleRo: "Obiective de sustenabilitate", titleEn: "Sustainability targets", descRo: "Obiectivele ambițioase BREEAM și electricitatea 100% regenerabilă necesitau control avansat.", descEn: "Ambitious BREEAM objectives and 100% renewable electricity required advanced control." },
]

const solutionFeatures = [
  { icon: Building2, titleRo: "Platformă centralizată", titleEn: "Centralised platform", descRo: "Interfață SAUTER unificată pentru monitorizarea și controlul HVAC, iluminat și alte sisteme dintr-un singur dashboard.", descEn: "Unified SAUTER interface for monitoring and controlling HVAC, lighting and other systems from a single dashboard." },
  { icon: Thermometer, titleRo: "Automatizare HVAC pe zone", titleEn: "Zoned HVAC automation", descRo: "Control climatic pe zone în camere, coridoare, săli de conferință și spa, adaptat la ocupare și condițiile exterioare.", descEn: "Climate control by zone across rooms, corridors, conference halls and spa, adapting to occupancy and outdoor conditions." },
  { icon: BarChart3, titleRo: "Monitorizare energetică", titleEn: "Energy monitoring", descRo: "Contorizare în timp real a electricității și încălzirii pe zone (bucătării, spălătorie, piscine) pentru a identifica risipa.", descEn: "Real-time metering of electricity and heating by zone (kitchens, laundry, pools) to identify waste." },
  { icon: Shield, titleRo: "Integrare sisteme", titleEn: "Systems integration", descRo: "Comunicare cu sub-sistemele prin protocoale KNX, DALI, Modbus, M-Bus, BACnet și integrare cu PMS-ul Fidelio.", descEn: "Communication with sub-systems via KNX, DALI, Modbus, M-Bus, BACnet protocols and integration with Fidelio PMS." },
]

const timeline = [
  { phaseRo: "Audit și proiectare", phaseEn: "Audit and design", durRo: "Săptămâna 1–3", durEn: "Week 1–3", descRo: "Inventarul HVAC, chillere, cazane, pompe și contoare de electricitate. Proiectarea arhitecturii BMS cu controlere și module SAUTER.", descEn: "Inventory of HVAC, chillers, boilers, pumps and electricity meters. BMS architecture design with SAUTER controllers and modules." },
  { phaseRo: "Instalare echipamente", phaseEn: "Equipment installation", durRo: "Săptămâna 3–6", durEn: "Week 3–6", descRo: "Montarea controlerelor programabile și modulelor I/O în camerele tehnice. Instalarea vanelor, clapetelor și actuatoarelor SAUTER pe unitățile HVAC.", descEn: "Mounting of programmable controllers and I/O modules in technical rooms. Installation of SAUTER valves, dampers and actuators on HVAC units." },
  { phaseRo: "Integrare în rețea", phaseEn: "Network integration", durRo: "Săptămâna 5–7", durEn: "Week 5–7", descRo: "Conectarea tuturor dispozitivelor prin KNX/DALI/M-Bus și legarea la serverele centrale SAUTER modulo.", descEn: "Connecting all devices via KNX/DALI/M-Bus and linking to the central SAUTER modulo servers." },
  { phaseRo: "Configurare software", phaseEn: "Software configuration", durRo: "Săptămâna 6–8", durEn: "Week 6–8", descRo: "Programarea logicii de control (programe, setpoint-uri, alarme). Crearea de dashboard-uri personalizate cu date live.", descEn: "Programming control logic (schedules, setpoints, alarms). Creating custom dashboards with live data." },
  { phaseRo: "Testare și punere în funcțiune", phaseEn: "Testing and commissioning", durRo: "Săptămâna 8–10", durEn: "Week 8–10", descRo: "Testarea fiecărui sub-sistem, calibrarea senzorilor, verificarea protecțiilor. Comutare completă în perioadele cu ocupare redusă.", descEn: "Testing every sub-system, calibrating sensors, verifying protections. Full switchover during periods of low occupancy." },
]

const results = [
  { titleRo: "Vizibilitate în timp real", titleEn: "Real-time visibility", descRo: "Managerii au acces instantaneu la toate sistemele. Un singur dashboard arată condițiile HVAC pe zone, consumul de energie și starea echipamentelor.", descEn: "Managers have instant access to all systems. A single dashboard shows zone-level HVAC conditions, energy consumption and equipment status.", icon: BarChart3 },
  { titleRo: "Confort sporit", titleEn: "Enhanced comfort", descRo: "Controlul climatic mai precis asigură un confort constant. Senzorii avansați de CO₂ și umiditate susțin scorul de 75,4% Health & Wellbeing.", descEn: "More precise climate control ensures consistent comfort. Advanced CO₂ and humidity sensors support the 75.4% Health & Wellbeing score.", icon: Thermometer },
  { titleRo: "~30% economii de energie", titleEn: "~30% energy savings", descRo: "Timpi reduși de funcționare a cazanelor și operare optimizată a chillerelor în perioadele neocupate. Rapoartele lunare identifică ineficiențele.", descEn: "Reduced boiler run times and optimised chiller operation during unoccupied periods. Monthly reports identify inefficiencies.", icon: Zap },
  { titleRo: "Eficiență operațională", titleEn: "Operational efficiency", descRo: "Alarmele și logarea tendințelor permit mentenanță proactivă. Echipa poate interveni de la distanță și detecta anomaliile înainte de defecțiuni.", descEn: "Alarms and trend logging enable proactive maintenance. The team can intervene remotely and detect anomalies before failures occur.", icon: Shield },
  { titleRo: "Conformitate cu sustenabilitatea", titleEn: "Sustainability compliance", descRo: "Optimizarea consumului de energie și apă, plus interfețele cu sursele regenerabile, susțin obiectivele BREEAM Excellent.", descEn: "Energy and water consumption optimisation, plus interfaces with renewable sources, supports BREEAM Excellent objectives.", icon: Award },
  { titleRo: "Scalabilitate", titleEn: "Scalability", descRo: "Platforma poate crește cu noi zone și integrarea viitoare a sistemelor regenerabile, fără o reconstrucție completă.", descEn: "The platform can grow with new zones and future integration of renewable systems, without a complete rebuild.", icon: Building2 },
]

const whyReasons = [
  { ro: "Expertiză specializată în sisteme hoteliere: integrare Fidelio, control piscine, monitorizare camere", en: "Specialised expertise in hotel systems: Fidelio integration, pool control, room monitoring" },
  { ro: "Tehnologie premium SAUTER: controlere și senzori care respectă cele mai înalte standarde internaționale", en: "Premium SAUTER technology: controllers and sensors meeting the highest international standards" },
  { ro: "Livrare full-service: proiectare, execuție, integrare și mentenanță de la un singur furnizor", en: "Full-service delivery: design, execution, integration and maintenance from a single provider" },
  { ro: "Suport local: echipă din București cu timp de răspuns rapid și cunoașterea reglementărilor locale", en: "Local support: Bucharest-based team with fast response times and knowledge of local regulations" },
]

const hospitalityBenefits = [
  { titleRo: "Control centralizat", titleEn: "Centralised control", descRo: "Management unificat al HVAC, iluminat, piscine/spa și securitate de pe o singură platformă.", descEn: "Unified management of HVAC, lighting, pools/spa and security from a single platform." },
  { titleRo: "Confortul oaspeților", titleEn: "Guest comfort", descRo: "Controlul automat al climatului și calității aerului susține o experiență de 5 stele.", descEn: "Automatic climate and air-quality control supports a 5-star experience." },
  { titleRo: "Transparență energetică", titleEn: "Energy transparency", descRo: "Contorizare în timp real și rapoarte care arată unde este consumată și economisită energia.", descEn: "Real-time metering and reports showing where energy is consumed and saved." },
  { titleRo: "Operațiuni hoteliere integrate", titleEn: "Integrated hotel operations", descRo: "Legătura BMS-PMS (Fidelio) permite reducerea HVAC în funcție de ocupare și alerte pentru housekeeping.", descEn: "BMS-PMS (Fidelio) link enables occupancy-based HVAC setback and housekeeping alerts." },
  { titleRo: "Eficiență în mentenanță", titleEn: "Maintenance efficiency", descRo: "Monitorizarea și alertele de la distanță reduc timpii de nefuncționare și riscul de disconfort pentru oaspeți.", descEn: "Remote monitoring and alerts reduce downtime and the risk of inconvenience to guests." },
  { titleRo: "Conformitate cu reglementările", titleEn: "Regulatory compliance", descRo: "Sistemele automate simplifică certificările de sustenabilitate, siguranță și confort.", descEn: "Automated systems simplify sustainability, safety and comfort certifications." },
]

export default function RadissonBucurestiCaseStudy() {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toc = [
    { id: "despre", ro: "Despre Radisson Blu", en: "About Radisson Blu" },
    { id: "provocarea", ro: "Provocarea", en: "The Challenge" },
    { id: "solutia", ro: "Soluția", en: "The Solution" },
    { id: "implementare", ro: "Implementare", en: "Implementation" },
    { id: "rezultate", ro: "Rezultate", en: "Results" },
    { id: "de-ce-sovitech", ro: "De ce Sovitech", en: "Why Sovitech" },
    { id: "beneficii", ro: "Beneficii HoReCa", en: "Hospitality Benefits" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-secondary/50">
        <div className="mx-auto max-w-[1220px] px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/resurse" className="text-muted-foreground hover:text-foreground transition-colors no-underline">{t("Resurse", "Resources")}</Link>
            <span className="text-muted-foreground/50">/</span>
            <Link href="/referinte" className="text-muted-foreground hover:text-foreground transition-colors no-underline">{t("Studii de caz", "Case Studies")}</Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-foreground font-medium">Radisson Blu</span>
          </div>
          <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? t("Copiat", "Copied") : t("Distribuie", "Share")}
          </button>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-background border-b border-border">
        <div className="mx-auto max-w-[1220px] px-4 sm:px-8 pt-12 pb-16 md:pt-16 md:pb-20">
          <Link href="/referinte" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-accent no-underline hover:no-underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("Înapoi la studii de caz", "Back to Case Studies")}
          </Link>
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold tracking-wide text-accent uppercase mb-6">
                HORECA / {t("Hotel 5 stele", "5-Star Hotel")}
              </div>
              <h1 className="text-foreground mb-6 text-balance" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.1, letterSpacing: "-0.03em", fontWeight: 600 }}>
                {t("Cum a obținut Radisson Blu București certificarea BREEAM Excellent prin automatizare BMS integrată", "How Radisson Blu Bucharest achieved BREEAM Excellent certification through integrated BMS automation")}
              </h1>
              <p className="text-muted-foreground max-w-xl" style={{ fontSize: "clamp(1rem, 1.5vw, 1.125rem)", lineHeight: 1.6, letterSpacing: "-0.01em" }}>
                {t("424 de camere, 12 săli de conferință, restaurant, spa, piscină: toate unificate într-o singură platformă inteligentă de control cu tehnologie SAUTER din Elveția.", "424 rooms, 12 conference halls, restaurant, spa, pool: all unified in a single intelligent control platform with SAUTER technology from Switzerland.")}
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-[2px] border border-border bg-card p-6">
                <div className="grid grid-cols-2 gap-6">
                  {metrics.map((m, i) => (
                    <div key={i} className={i < 2 ? "pb-6 border-b border-border" : ""}>
                      <div className="text-accent font-semibold" style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", letterSpacing: "-0.03em", lineHeight: 1 }}>{m.value}</div>
                      <div className="text-muted-foreground mt-1.5" style={{ fontSize: "0.8125rem", letterSpacing: "-0.01em" }}>{t(m.ro, m.en)}</div>
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
        <div className="mx-auto max-w-[1220px] px-4 sm:px-8">
          <div className="relative aspect-[21/9] w-full overflow-hidden md:rounded-[2px] md:my-8 -mx-4 md:mx-0">
            <Image src="/luxury-hotel-lobby-modern-interior.jpg" alt={t("Radisson Blu București, lobby de hotel modern", "Radisson Blu Bucharest - Modern hotel lobby")} fill className="object-cover" priority />
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-[1220px] px-4 sm:px-8 section-l">
        <div className="grid lg:grid-cols-12 gap-16">

          {/* Sidebar */}
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <div className="sticky top-24 space-y-8">
              <nav className="hidden lg:block">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3" style={{ letterSpacing: "0.06em" }}>{t("Cuprins", "Contents")}</div>
                <ul className="space-y-1.5 list-none p-0 m-0">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="text-sm text-muted-foreground hover:text-accent transition-colors no-underline block py-0.5" style={{ letterSpacing: "-0.01em" }}>
                        {t(item.ro, item.en)}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="border-t border-border pt-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" style={{ letterSpacing: "0.06em" }}>{t("Client", "Client")}</div>
                <div className="font-semibold text-foreground text-sm" style={{ letterSpacing: "-0.01em" }}>Radisson Blu București</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" style={{ letterSpacing: "0.06em" }}>{t("Industrie", "Industry")}</div>
                <div className="font-semibold text-foreground text-sm" style={{ letterSpacing: "-0.01em" }}>HORECA / {t("Hotel 5 stele", "5-Star Hotel")}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" style={{ letterSpacing: "0.06em" }}>{t("Serviciu", "Service")}</div>
                <div className="font-semibold text-foreground text-sm" style={{ letterSpacing: "-0.01em" }}>{t("BMS complet: proiectare, execuție, integrare", "Full BMS: Design, Execution, Integration")}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" style={{ letterSpacing: "0.06em" }}>{t("Tehnologie", "Technology")}</div>
                <div className="font-semibold text-foreground text-sm" style={{ letterSpacing: "-0.01em" }}>SAUTER modulo - BACnet / KNX / Modbus</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" style={{ letterSpacing: "0.06em" }}>{t("Certificare", "Certification")}</div>
                <div className="font-semibold text-foreground text-sm" style={{ letterSpacing: "-0.01em" }}>BREEAM In-Use Excellent (2025)</div>
              </div>
              <div className="pt-4 border-t border-border">
                <Link href="/contact" className="inline-flex items-center gap-2 rounded-[1px] bg-accent px-5 py-2.5 text-sm font-semibold text-white no-underline hover:no-underline transition-all" style={{ letterSpacing: "-0.01em" }}>
                  {t("Cere o consultanță", "Request a Consultation")}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="lg:col-span-9 order-1 lg:order-2 space-y-20">

            {/* About */}
            <section id="despre">
              <h2 className="text-foreground mb-6" style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)", letterSpacing: "-0.02em", fontWeight: 600 }}>
                {t("Despre Radisson Blu București", "About Radisson Blu Bucharest")}
              </h2>
              <div className="space-y-4 max-w-[45rem]">
                <p className="text-foreground/85" style={{ fontSize: "clamp(0.9375rem, 1.2vw, 1rem)", lineHeight: 1.7, letterSpacing: "-0.01em" }}>
                  {t(
                    "Radisson Blu Hotel București este un hotel de 5 stele emblematic din capitala României. Deschis în 2007, oferă 424 de camere (standard, business-class și suite) și facilități extinse de conferință și agrement. Hotelul include 12 săli de conferință (una de 540 m² pentru 500 de persoane), mai multe restaurante, baruri, spa, centru de fitness, piscină și alte spații de recreere.",
                    "Radisson Blu Hotel Bucharest is a landmark 5-star hotel in the Romanian capital. Opened in 2007, it offers 424 rooms (including standard, business-class and suites) and extensive conference and leisure facilities. The hotel includes 12 conference halls (one of 540 m² for 500 people), multiple restaurants, bars, spa, fitness centre, pool and other recreational spaces.",
                  )}
                </p>
                <p className="text-foreground/85" style={{ fontSize: "clamp(0.9375rem, 1.2vw, 1rem)", lineHeight: 1.7, letterSpacing: "-0.01em" }}>
                  {t(
                    "În 2025 hotelul a obținut certificarea BREEAM In-Use Excellent, cu un scor de 82,6% pentru Energie și 75,4% pentru Health & Wellbeing. Aceste rezultate evidențiază angajamentul hotelului față de eficiența energetică și menținerea confortului și calității aerului la cel mai înalt nivel.",
                    "In 2025 the hotel achieved BREEAM In-Use Excellent certification, with a score of 82.6% for Energy and 75.4% for Health & Wellbeing. These results highlight the hotel's commitment to energy efficiency and maintaining indoor comfort and air quality at the highest level.",
                  )}
                </p>
              </div>
            </section>

            {/* Challenge */}
            <section id="provocarea">
              <h2 className="text-foreground mb-6" style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)", letterSpacing: "-0.02em", fontWeight: 600 }}>
                {t("Provocarea", "The Challenge")}
              </h2>
              <p className="text-foreground/85 mb-8 max-w-[45rem]" style={{ fontSize: "clamp(0.9375rem, 1.2vw, 1rem)", lineHeight: 1.7, letterSpacing: "-0.01em" }}>
                {t(
                  "Administrarea unui hotel de lux care operează 24/7 implică provocări operaționale complexe. Sistemele de încălzire, răcire, ventilație, iluminat și apă/piscine trebuie să mențină confortul oaspeților în zeci de zone diferite, controlând în același timp consumul de energie.",
                  "Managing a luxury hotel operating 24/7 involves complex operational challenges. Heating, cooling, ventilation, lighting and water/pool systems must maintain guest comfort across dozens of different zones, while simultaneously controlling energy consumption.",
                )}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {challenges.map((c, i) => (
                  <div key={i} className="rounded-[2px] border border-border bg-card p-5 transition-colors hover:border-accent/30">
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5 h-9 w-9 rounded-[2px] bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <c.icon className="h-4.5 w-4.5 text-accent" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1" style={{ fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>{t(c.titleRo, c.titleEn)}</h4>
                        <p className="text-muted-foreground" style={{ fontSize: "0.8125rem", lineHeight: 1.6 }}>{t(c.descRo, c.descEn)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Testimonial */}
            <div className="rounded-[2px] bg-secondary p-8 md:p-10">
              <blockquote>
                <p className="text-foreground mb-6 text-pretty" style={{ fontSize: "clamp(1.0625rem, 1.5vw, 1.25rem)", lineHeight: 1.6, letterSpacing: "-0.02em", fontWeight: 500 }}>
                  {t(
                    "„Obținerea certificării BREEAM este un moment de mândrie care reflectă angajamentul nostru profund față de ospitalitatea sustenabilă. Soluțiile de automatizare Sovitech susțin direct acest angajament, făcând operațiunile hotelului mai eficiente și mai prietenoase cu mediul.”",
                    "\"Achieving BREEAM certification is a proud moment that reflects our deep commitment to sustainable hospitality. Sovitech's automation solutions directly support that commitment, making hotel operations more efficient and environmentally friendly.\"",
                  )}
                </p>
                <footer className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-lg">GM</div>
                  <div>
                    <div className="font-semibold text-foreground" style={{ fontSize: "0.875rem", letterSpacing: "-0.01em" }}>General Manager</div>
                    <div className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>Radisson Blu București</div>
                  </div>
                </footer>
              </blockquote>
            </div>

            {/* Solution */}
            <section id="solutia">
              <h2 className="text-foreground mb-6" style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)", letterSpacing: "-0.02em", fontWeight: 600 }}>
                {t("Soluția: automatizare BMS Sovitech", "The Solution: Sovitech BMS Automation")}
              </h2>
              <p className="text-foreground/85 mb-8 max-w-[45rem]" style={{ fontSize: "clamp(0.9375rem, 1.2vw, 1rem)", lineHeight: 1.7, letterSpacing: "-0.01em" }}>
                {t(
                  "Sovitech Control a livrat un sistem centralizat de management al clădirii (BMS) care conectează toate sistemele hotelului într-o singură platformă inteligentă și eficientă energetic.",
                  "Sovitech Control delivered a centralised Building Management System (BMS) that connects all hotel systems into a single intelligent, energy-efficient platform.",
                )}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {solutionFeatures.map((f, i) => (
                  <div key={i} className="rounded-[2px] border border-border bg-card p-5 transition-colors hover:border-accent/30">
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5 h-9 w-9 rounded-[2px] bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <f.icon className="h-4.5 w-4.5 text-accent" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1" style={{ fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>{t(f.titleRo, f.titleEn)}</h4>
                        <p className="text-muted-foreground" style={{ fontSize: "0.8125rem", lineHeight: 1.6 }}>{t(f.descRo, f.descEn)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-foreground/85 mt-6 max-w-[45rem]" style={{ fontSize: "clamp(0.9375rem, 1.2vw, 1rem)", lineHeight: 1.7, letterSpacing: "-0.01em" }}>
                {t(
                  "Sovitech a integrat de asemenea sistemul cu PMS-ul hotelier Fidelio, permițând ca datele de ocupare a camerelor să fie legate de controlul HVAC și al iluminatului pentru optimizare automată.",
                  "Sovitech also integrated the system with the Fidelio hotel PMS, allowing room occupancy data to be linked to HVAC and lighting control for automatic optimisation.",
                )}
              </p>
            </section>

            {/* Implementation */}
            <section id="implementare">
              <h2 className="text-foreground mb-8" style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)", letterSpacing: "-0.02em", fontWeight: 600 }}>
                {t("Procesul de implementare", "Implementation Process")}
              </h2>
              <p className="text-foreground/85 mb-8 max-w-[45rem]" style={{ fontSize: "clamp(0.9375rem, 1.2vw, 1rem)", lineHeight: 1.7, letterSpacing: "-0.01em" }}>
                {t(
                  "Implementarea a fost realizată în etape, pentru a evita perturbarea operațiunilor hotelului. Comutarea completă la noul sistem a avut loc în perioadele cu ocupare redusă.",
                  "The implementation was carried out in phases to avoid disruption to hotel operations. Full switchover to the new system took place during periods of low occupancy.",
                )}
              </p>
              <div className="space-y-0">
                {timeline.map((step, i) => (
                  <div key={i} className="relative flex gap-6 pb-10 last:pb-0">
                    {i < timeline.length - 1 && (
                      <div className="absolute left-[15px] top-[36px] bottom-0 w-px bg-border" />
                    )}
                    <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-accent bg-background text-xs font-bold text-accent">
                      {i + 1}
                    </div>
                    <div className="pt-0.5 flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-1.5">
                        <h4 className="font-semibold text-foreground" style={{ fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>{t(step.phaseRo, step.phaseEn)}</h4>
                        <span className="text-xs font-medium text-muted-foreground bg-secondary rounded-full px-2.5 py-0.5">{t(step.durRo, step.durEn)}</span>
                      </div>
                      <p className="text-muted-foreground" style={{ fontSize: "0.8125rem", lineHeight: 1.65 }}>{t(step.descRo, step.descEn)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Results */}
            <section id="rezultate">
              <h2 className="text-foreground mb-8" style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)", letterSpacing: "-0.02em", fontWeight: 600 }}>
                {t("Rezultate și impact", "Results and Impact")}
              </h2>
              <p className="text-foreground/85 mb-8 max-w-[45rem]" style={{ fontSize: "clamp(0.9375rem, 1.2vw, 1rem)", lineHeight: 1.7, letterSpacing: "-0.01em" }}>
                {t(
                  "În urma implementării, Radisson Blu București a obținut beneficii semnificative în controlul operațional și sustenabilitate. BMS-ul Sovitech a oferit hotelului o vizibilitate fără precedent asupra sistemelor sale.",
                  "Following implementation, Radisson Blu Bucharest achieved significant benefits in operational control and sustainability. The Sovitech BMS gave the hotel unprecedented visibility over its building systems.",
                )}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {results.map((r, i) => (
                  <div key={i} className="rounded-[2px] bg-secondary p-6">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="h-8 w-8 rounded-[2px] bg-accent/10 flex items-center justify-center">
                        <r.icon className="h-4 w-4 text-accent" />
                      </div>
                      <h4 className="font-semibold text-foreground" style={{ fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>{t(r.titleRo, r.titleEn)}</h4>
                    </div>
                    <p className="text-muted-foreground" style={{ fontSize: "0.8125rem", lineHeight: 1.65 }}>{t(r.descRo, r.descEn)}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Why Sovitech */}
            <section id="de-ce-sovitech">
              <h2 className="text-foreground mb-6" style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)", letterSpacing: "-0.02em", fontWeight: 600 }}>
                {t("De ce a ales Radisson Blu compania Sovitech", "Why Radisson Blu chose Sovitech")}
              </h2>
              <p className="text-foreground/85 mb-6 max-w-[45rem]" style={{ fontSize: "clamp(0.9375rem, 1.2vw, 1rem)", lineHeight: 1.7, letterSpacing: "-0.01em" }}>
                {t(
                  "Sovitech a fost selectat pentru expertiza specializată în automatizarea HORECA și portofoliul dovedit de proiecte similare. Lista de clienți Sovitech include hoteluri renumite: Radisson, Crowne Plaza, Hilton Athenee Palace, Novotel și altele.",
                  "Sovitech was selected for its specialised expertise in HORECA automation and its proven portfolio of similar projects. Sovitech's client list includes renowned hotels: Radisson, Crowne Plaza, Hilton Athenee Palace, Novotel and others.",
                )}
              </p>
              <div className="rounded-[2px] border border-border bg-card p-6">
                <ul className="space-y-3 list-none p-0 m-0">
                  {whyReasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1 h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-accent" />
                      </div>
                      <span className="text-foreground/85" style={{ fontSize: "0.9375rem", lineHeight: 1.6, letterSpacing: "-0.01em" }}>{t(reason.ro, reason.en)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Hospitality Benefits */}
            <section id="beneficii">
              <h2 className="text-foreground mb-6" style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)", letterSpacing: "-0.02em", fontWeight: 600 }}>
                {t("Beneficii cheie pentru facilitățile hoteliere", "Key benefits for hotel facilities")}
              </h2>
              <p className="text-foreground/85 mb-8 max-w-[45rem]" style={{ fontSize: "clamp(0.9375rem, 1.2vw, 1rem)", lineHeight: 1.7, letterSpacing: "-0.01em" }}>
                {t(
                  "Hotelurile care investesc în sisteme BMS moderne obțin avantaje strategice semnificative. Sistemul Sovitech pentru Radisson Blu livrează:",
                  "Hotels that invest in modern BMS systems gain significant strategic advantages. The Sovitech system for Radisson Blu delivers:",
                )}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {hospitalityBenefits.map((b, i) => (
                  <div key={i} className="rounded-[2px] bg-secondary p-5">
                    <h4 className="font-semibold text-foreground mb-1.5" style={{ fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>{t(b.titleRo, b.titleEn)}</h4>
                    <p className="text-muted-foreground" style={{ fontSize: "0.8125rem", lineHeight: 1.6 }}>{t(b.descRo, b.descEn)}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Conclusion */}
            <section className="rounded-[2px] border border-border bg-card p-8 md:p-10">
              <h3 className="font-semibold text-foreground mb-4" style={{ fontSize: "clamp(1.0625rem, 1.5vw, 1.25rem)", letterSpacing: "-0.02em" }}>
                {t("Concluzie", "Conclusion")}
              </h3>
              <div className="space-y-4 max-w-[45rem]">
                <p className="text-foreground/85" style={{ fontSize: "clamp(0.9375rem, 1.2vw, 1rem)", lineHeight: 1.7, letterSpacing: "-0.01em" }}>
                  {t(
                    "Prin implementarea BMS-ului integrat Sovitech, Radisson Blu București și-a transformat infrastructura într-o facilitate inteligentă și eficientă. Proiectul a atins niveluri mai ridicate de confort pentru oaspeți, vizibilitate sporită pentru managerii de facilități și reduceri notabile ale consumului de energie.",
                    "By implementing the integrated Sovitech BMS, Radisson Blu Bucharest transformed its infrastructure into an intelligent, efficient facility. The project achieved higher levels of guest comfort, enhanced visibility for facilities managers and notable reductions in energy consumption.",
                  )}
                </p>
                <p className="text-foreground/85" style={{ fontSize: "clamp(0.9375rem, 1.2vw, 1rem)", lineHeight: 1.7, letterSpacing: "-0.01em" }}>
                  {t(
                    "Acest studiu de caz ilustrează o bună practică: alinierea operațiunilor hoteliere la obiectivele de sustenabilitate și eficiență prin tehnologie. Automatizarea BMS Sovitech permite hotelurilor să obțină aceste rezultate, creând un hotel pregătit pentru viitor, care încântă oaspeții și livrează câștiguri măsurabile de sustenabilitate.",
                    "This case study illustrates a best practice: aligning hotel operations with sustainability and efficiency objectives through technology. Sovitech BMS automation enables hotels to achieve these results, creating a future-ready hotel that delights guests and delivers measurable sustainability gains.",
                  )}
                </p>
              </div>
            </section>

            {/* CTA */}
            <div className="rounded-[2px] bg-foreground p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-background font-semibold mb-2" style={{ fontSize: "clamp(1.0625rem, 1.5vw, 1.25rem)", letterSpacing: "-0.02em" }}>
                  {t("Vrei rezultate similare pentru hotelul tău?", "Want similar results for your hotel?")}
                </h3>
                <p className="text-background/60" style={{ fontSize: "0.875rem" }}>
                  {t("Contactează echipa noastră pentru o consultanță personalizată și un plan de eficiență.", "Contact our team for a personalised consultation and efficiency plan.")}
                </p>
              </div>
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-[1px] bg-accent px-6 py-3 text-sm font-semibold text-white no-underline hover:no-underline whitespace-nowrap transition-all" style={{ letterSpacing: "-0.01em" }}>
                {t("Contactează-ne", "Contact us")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </main>
        </div>
      </div>

      {/* Related */}
      <section className="border-t border-border bg-secondary/50 section-m">
        <div className="mx-auto max-w-[1220px] px-4 sm:px-8">
          <h2 className="text-foreground mb-8" style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)", letterSpacing: "-0.02em", fontWeight: 600 }}>
            {t("Alte studii de caz", "Other case studies")}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/resurse/studii-de-caz/therme-bucuresti" className="group rounded-[2px] border border-border bg-card p-6 no-underline hover:no-underline hover:border-accent/40 transition-all">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent mb-3">HORECA / Spa &amp; Wellness</div>
              <h3 className="text-foreground font-semibold mb-2 group-hover:text-accent transition-colors" style={{ fontSize: "clamp(1rem, 1.5vw, 1.125rem)", letterSpacing: "-0.01em" }}>
                Therme București
              </h3>
              <p className="text-muted-foreground mb-4" style={{ fontSize: "0.8125rem", lineHeight: 1.6 }}>
                {t("Reducere de 35% a costurilor energetice prin automatizare BMS pentru complexul de wellness.", "35% reduction in energy costs through BMS automation for the wellness complex.")}
              </p>
              <span className="text-sm font-semibold text-accent inline-flex items-center gap-1">
                {t("Citește studiul", "Read the study")} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
            <Link href="/contact" className="group rounded-[2px] border border-border bg-card p-6 no-underline hover:no-underline hover:border-accent/40 transition-all">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent mb-3">{t("Proiectul tău", "Your project")}</div>
              <h3 className="text-foreground font-semibold mb-2 group-hover:text-accent transition-colors" style={{ fontSize: "clamp(1rem, 1.5vw, 1.125rem)", letterSpacing: "-0.01em" }}>
                {t("Următorul studiu de caz poate fi al tău", "The next case study could be yours")}
              </h3>
              <p className="text-muted-foreground mb-4" style={{ fontSize: "0.8125rem", lineHeight: 1.6 }}>
                {t("Contactează-ne pentru a discuta cum îți putem transforma clădirea într-un spațiu inteligent și eficient.", "Contact us to discuss how we can transform your building into an intelligent, efficient space.")}
              </p>
              <span className="text-sm font-semibold text-accent inline-flex items-center gap-1">
                {t("Vorbește cu un specialist", "Speak to a specialist")} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
