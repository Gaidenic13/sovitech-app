"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Calculator, Download, TrendingUp, BookOpen } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

export default function ResurseSuplimentarePage() {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0D4D4D] to-[#0A3939] section-l">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t("Resurse Suplimentare BMS", "Additional BMS Resources")}
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              {t(
                "Instrumente, calculatoare și conținut educațional pentru a vă ajuta să luați cea mai bună decizie despre automatizarea clădirii.",
                "Tools, calculators and educational content to help you make the best decision about building automation.",
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Tools & Calculators */}
      <section className="section-l bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            {t("Instrumente Interactive", "Interactive Tools")}
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 border-border hover:border-primary/50 transition-colors">
              <div className="h-14 w-14 rounded-[2px] bg-primary/10 flex items-center justify-center mb-6">
                <Calculator className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{t("Calculator ROI BMS", "BMS ROI Calculator")}</h3>
              <p className="text-muted-foreground mb-6">
                {t(
                  "Estimați economiile potențiale și perioada de recuperare a investiției în automatizare BMS pentru clădirea dumneavoastră.",
                  "Estimate the potential savings and payback period of the BMS automation investment for your building.",
                )}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li>{t("✓ Calcul economii energetice anuale", "✓ Annual energy savings calculation")}</li>
                <li>{t("✓ Estimare perioadă recuperare investiție", "✓ Investment payback period estimate")}</li>
                <li>{t("✓ Comparație scenarii de implementare", "✓ Implementation scenario comparison")}</li>
              </ul>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {t("Deschide Calculatorul", "Open the Calculator")}
              </Button>
            </Card>

            <Card className="p-8 border-border hover:border-primary/50 transition-colors">
              <div className="h-14 w-14 rounded-[2px] bg-primary/10 flex items-center justify-center mb-6">
                <TrendingUp className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{t("Quiz Pregătire BMS", "BMS Readiness Quiz")}</h3>
              <p className="text-muted-foreground mb-6">
                {t(
                  "Evaluați în 5 minute gradul de pregătire al clădirii pentru implementarea unui sistem BMS performant.",
                  "Assess in 5 minutes how ready your building is for implementing a high-performance BMS.",
                )}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li>{t("✓ 15 întrebări despre infrastructură", "✓ 15 questions about infrastructure")}</li>
                <li>{t("✓ Rezultat instant cu scorare", "✓ Instant result with scoring")}</li>
                <li>{t("✓ Recomandări personalizate", "✓ Personalised recommendations")}</li>
              </ul>
              <Button variant="outline" className="w-full bg-transparent">
                {t("Începe Quiz-ul", "Start the Quiz")}
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="section-l bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("Serie de Articole: Ghid Complet BMS", "Article Series: Complete BMS Guide")}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t(
                "Conținut educațional aprofundat despre sisteme de automatizare",
                "In-depth educational content about automation systems",
              )}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <Card className="p-6 border-border hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-primary">{t("PARTEA 1", "PART 1")}</span>
                  <h3 className="text-lg font-bold mt-1 mb-2">
                    {t("Fundamentele BMS: Ce Trebuie să Știți", "BMS Fundamentals: What You Need to Know")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t(
                      "Introducere completă în sistemele de management clădiri: componente, beneficii și tehnologii.",
                      "A complete introduction to building management systems: components, benefits and technologies.",
                    )}
                  </p>
                  <Button variant="link" className="p-0 h-auto text-sm">
                    {t("Citește articolul →", "Read the article →")}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-primary">{t("PARTEA 2", "PART 2")}</span>
                  <h3 className="text-lg font-bold mt-1 mb-2">
                    {t("Evaluarea ROI: Merită Investiția?", "ROI Assessment: Is the Investment Worth It?")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t(
                      "Metodologie detaliată pentru calculul rentabilității investiției în BMS pentru diferite tipuri de clădiri.",
                      "A detailed methodology for calculating the return on BMS investment for different building types.",
                    )}
                  </p>
                  <Button variant="link" className="p-0 h-auto text-sm">
                    {t("Citește articolul →", "Read the article →")}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-primary">{t("PARTEA 3", "PART 3")}</span>
                  <h3 className="text-lg font-bold mt-1 mb-2">
                    {t("Procesul de Implementare Pas cu Pas", "The Step-by-Step Implementation Process")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t(
                      "De la audit inițial la punerea în funcțiune: ghid complet pentru implementarea cu succes a BMS.",
                      "From the initial audit to commissioning: a complete guide to a successful BMS implementation.",
                    )}
                  </p>
                  <Button variant="link" className="p-0 h-auto text-sm">
                    {t("Citește articolul →", "Read the article →")}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-primary">{t("PARTEA 4", "PART 4")}</span>
                  <h3 className="text-lg font-bold mt-1 mb-2">
                    {t("Mentenanță și Optimizare Continuă", "Maintenance and Continuous Optimisation")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t(
                      "Cum să mențineți performanța sistemului BMS și să maximizați economiile pe termen lung.",
                      "How to maintain your BMS performance and maximise savings in the long run.",
                    )}
                  </p>
                  <Button variant="link" className="p-0 h-auto text-sm">
                    {t("Citește articolul →", "Read the article →")}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-l bg-muted/30">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto p-8 md:p-12 border-border bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t("Aveți Întrebări despre BMS?", "Do You Have Questions about BMS?")}
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                {t(
                  "Echipa noastră de specialiști este pregătită să vă ajute cu informații personalizate pentru proiectul dumneavoastră.",
                  "Our team of specialists is ready to help you with personalised information for your project.",
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                  <Link href="/contact">{t("Programează Consultație", "Schedule a Consultation")}</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/ghid-bms/descarca">
                    <Download className="mr-2 h-5 w-5" />
                    {t("Descarcă Ghidul", "Download the Guide")}
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
