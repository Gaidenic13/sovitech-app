"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Check } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

export default function PricingPage() {
  const { t } = useLanguage()

  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tighter text-foreground md:text-6xl text-balance">
              {t("Pachete de servicii BMS", "BMS service packages")}
            </h1>
            <p className="mb-8 text-xl text-foreground/80 text-pretty">
              {t("Alege pachetul potrivit pentru proiectul tău de automatizare. Primești o ofertă personalizată, adaptată nevoilor tale.", "Choose the right package for your automation project. Get a personalised quote tailored to your needs.")}
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="flex h-full flex-col border-border/40 bg-card">
              <CardHeader className="border-b border-border/40 p-8">
                <h3 className="mb-2 text-2xl font-bold text-foreground">{t("Esențial", "Essential")}</h3>
                <p className="text-sm text-foreground/70">{t("Pentru proiecte BMS la scară mică", "For small-scale BMS projects")}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col p-8">
                <ul className="mb-8 flex-1 space-y-4">
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground/80">{t("Până la 500 m² suprafață", "Up to 500 m² floor area")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground/80">{t("Control HVAC de bază", "Basic HVAC control")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground/80">{t("Interfață utilizator simplă", "Simple user interface")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground/80">{t("Suport tehnic prin email", "Email technical support")}</span>
                  </li>
                </ul>
                <Button className="w-full bg-transparent" variant="outline" asChild>
                  <Link href="/cerere-oferta">{t("Solicită o ofertă", "Request a quote")}</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col border-accent bg-card">
              <CardHeader className="border-b border-border/40 p-8">
                <div className="mb-2 inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent">
                  {t("CEL MAI POPULAR", "MOST POPULAR")}
                </div>
                <h3 className="mb-2 text-2xl font-bold text-foreground">{t("Profesional", "Professional")}</h3>
                <p className="text-sm text-foreground/70">{t("Pentru clădiri comerciale și de birouri", "For commercial and office buildings")}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col p-8">
                <ul className="mb-8 flex-1 space-y-4">
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground/80">{t("Până la 5.000 m² suprafață", "Up to 5,000 m² floor area")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground/80">{t("Integrare completă BACnet, Modbus, KNX", "Full BACnet, Modbus, KNX integration")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground/80">{t("Management energetic avansat", "Advanced energy management")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground/80">{t("Suport tehnic dedicat", "Dedicated technical support")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground/80">{t("Raportare și analiză consum", "Consumption reporting and analysis")}</span>
                  </li>
                </ul>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                  <Link href="/cerere-oferta">{t("Solicită o ofertă", "Request a quote")}</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col border-border/40 bg-card">
              <CardHeader className="border-b border-border/40 p-8">
                <h3 className="mb-2 text-2xl font-bold text-foreground">{t("Enterprise", "Enterprise")}</h3>
                <p className="text-sm text-foreground/70">{t("Pentru campusuri și complexe mari", "For campuses and large complexes")}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col p-8">
                <ul className="mb-8 flex-1 space-y-4">
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground/80">{t("Suprafață nelimitată", "Unlimited floor area")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground/80">{t("Soluții complet personalizate", "Fully bespoke solutions")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground/80">{t("Integrări multi-protocol complexe", "Complex multi-protocol integrations")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground/80">{t("Manager de cont dedicat", "Dedicated account manager")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground/80">{t("Suport prioritar 24/7", "Priority 24/7 support")}</span>
                  </li>
                </ul>
                <Button className="w-full bg-transparent" variant="outline" asChild>
                  <Link href="/cerere-oferta">{t("Solicită o ofertă", "Request a quote")}</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional Info */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-center text-3xl font-bold text-foreground">{t("Întrebări frecvente", "Frequently asked questions")}</h2>
            <div className="space-y-6">
              <Card className="border-border/40 bg-card">
                <CardContent className="p-6">
                  <h3 className="mb-2 font-semibold text-foreground">{t("Ce include pachetul de servicii?", "What does the service package include?")}</h3>
                  <p className="text-foreground/70">
                    {t("Pachetul include proiectare BMS, executie, integrare protocoale (BACnet, Modbus, KNX), echipamente SAUTER, punere in functiune si training operatori. Serviciile de mentenanta si suport tehnic sunt incluse conform tipului de pachet ales.", "The package includes BMS design, execution, protocol integration (BACnet, Modbus, KNX), SAUTER equipment, commissioning and operator training. Maintenance and technical support services are included according to the chosen package type.")}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/40 bg-card">
                <CardContent className="p-6">
                  <h3 className="mb-2 font-semibold text-foreground">{t("Pot face upgrade la pachet ulterior?", "Can I upgrade my package later?")}</h3>
                  <p className="text-foreground/70">
                    {t("Da, sistemul BMS poate fi extins si actualizat in timp, pe masura ce cerintele proiectului evolueaza. Sovitech ofera servicii complete de upgrade si extindere pentru sistemele BMS existente, asigurand compatibilitatea cu instalatia originala.", "Yes, the BMS system can be expanded and upgraded over time as the project's requirements evolve. Sovitech offers comprehensive upgrade and expansion services for existing BMS systems, ensuring compatibility with the original installation.")}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/40 bg-card">
                <CardContent className="p-6">
                  <h3 className="mb-2 font-semibold text-foreground">{t("Costurile de instalare sunt separate?", "Are installation costs separate?")}</h3>
                  <p className="text-foreground/70">
                    {t("Costurile variaza in functie de complexitatea proiectului, suprafata cladirii si specificatiile tehnice. Contactati echipa noastra pentru o oferta detaliata adaptata proiectului dvs., inclusiv o analiza a consumului actual de energie.", "Costs vary depending on project complexity, building area and technical specifications. Contact our team for a detailed quote tailored to your project, including an analysis of your current energy consumption.")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
