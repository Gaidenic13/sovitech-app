"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, Clock, Leaf, Award, Lock, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useLanguage } from "@/lib/language-context"

export default function CaseStudiesPage() {
  const { t } = useLanguage()
  const [selectedSector, setSelectedSector] = useState<string | null>(null)

  const caseStudies = [
    {
      id: "therme",
      title: "Therme București",
      sector: "HORECA",
      image: "/modern-spa-building-thermal-pools.jpg",
      locked: false,
      metrics: {
        savings: "35%",
        payback: t("2.3 ani", "2.3 years"),
        co2: t("450 tone/an", "450 tonnes/yr"),
      },
      description: t(
        "Complex spa și wellness de 30.000 m² cu control HVAC și iluminat automat",
        "30,000 m² spa and wellness complex with HVAC control and automated lighting",
      ),
    },
    {
      id: "radisson",
      title: "Radisson Blu București",
      sector: "HORECA",
      image: "/luxury-hotel-modern-building.jpg",
      locked: false,
      metrics: {
        savings: "32%",
        payback: t("2.8 ani", "2.8 years"),
        co2: t("280 tone/an", "280 tonnes/yr"),
      },
      description: t(
        "Hotel 5 stele cu 428 camere - automatizare completă BMS",
        "5-star hotel with 428 rooms - complete BMS automation",
      ),
    },
    {
      id: "rompharm",
      title: "Rompharm Company",
      sector: "Pharma",
      image: "/pharmaceutical-manufacturing.png",
      locked: false,
      metrics: {
        savings: "28%",
        payback: t("3.1 ani", "3.1 years"),
        co2: t("320 tone/an", "320 tonnes/yr"),
      },
      description: t(
        "Fabrică farmaceutică cu cerințe stricte de mediu controlat",
        "Pharmaceutical factory with strict controlled-environment requirements",
      ),
    },
  ]

  const filteredStudies = selectedSector ? caseStudies.filter((study) => study.sector === selectedSector) : caseStudies

  const sectors = Array.from(new Set(caseStudies.map((study) => study.sector)))

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-sm text-primary mb-4">
              <Award className="h-4 w-4" />
              {t("Conținut deblocat - +100 puncte", "Content unlocked - +100 points")}
            </div>
            <h1 className="text-4xl font-bold mb-4">{t("Studii de Caz Exclusive", "Exclusive Case Studies")}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t(
                "Explorează cum am ajutat clienți similari să reducă costurile energetice și să îmbunătățească confortul",
                "Explore how we have helped similar clients reduce energy costs and improve comfort",
              )}
            </p>
          </div>

          {/* Sector Filters */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            <Button variant={selectedSector === null ? "default" : "outline"} onClick={() => setSelectedSector(null)}>
              {t("Toate Sectoarele", "All Sectors")}
            </Button>
            {sectors.map((sector) => (
              <Button
                key={sector}
                variant={selectedSector === sector ? "default" : "outline"}
                onClick={() => setSelectedSector(sector)}
              >
                {sector}
              </Button>
            ))}
          </div>

          {/* Case Studies Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {filteredStudies.map((study) => (
              <Card key={study.id} className="overflow-hidden border-border hover:border-primary/40 transition-colors duration-300">
                <div className="relative h-48 bg-muted">
                  <img
                    src={study.image || "/placeholder.svg"}
                    alt={study.title}
                    className="w-full h-full object-cover"
                  />
                  {study.locked && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Lock className="h-12 w-12 text-white" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge>{study.sector}</Badge>
                    {!study.locked && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t("Deblocat", "Unlocked")}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{study.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{study.description}</p>

                  {!study.locked ? (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center p-2 bg-muted/30 rounded">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <TrendingDown className="h-3 w-3 text-green-600" />
                          </div>
                          <p className="text-sm font-bold text-green-600">{study.metrics.savings}</p>
                          <p className="text-xs text-muted-foreground">{t("Economii", "Savings")}</p>
                        </div>
                        <div className="text-center p-2 bg-muted/30 rounded">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Clock className="h-3 w-3 text-blue-600" />
                          </div>
                          <p className="text-sm font-bold text-blue-600">{study.metrics.payback}</p>
                          <p className="text-xs text-muted-foreground">ROI</p>
                        </div>
                        <div className="text-center p-2 bg-muted/30 rounded">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Leaf className="h-3 w-3 text-green-600" />
                          </div>
                          <p className="text-sm font-bold text-green-600">{study.metrics.co2}</p>
                          <p className="text-xs text-muted-foreground">CO₂</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full bg-transparent" asChild>
                        <Link href={`/resurse/studii-de-caz/${study.id}`}>
                          {t("Citește Studiul Complet", "Read the Full Case Study")}
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" className="w-full bg-transparent" disabled>
                      <Lock className="mr-2 h-4 w-4" />
                      {t("Completează calculatorul ROI", "Complete the ROI calculator")}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* CTA */}
          <Card className="p-8 border-border bg-gradient-to-br from-primary/5 to-primary/10 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {t("Gata să Începi Propriul Tău Proiect?", "Ready to Start Your Own Project?")}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              {t(
                "Programează o consultație gratuită și primește o ofertă personalizată pentru clădirea ta",
                "Schedule a free consultation and receive a personalised quote for your building",
              )}
            </p>
            <Button size="lg" asChild>
              <Link href="/contact">{t("Programează Consultație Gratuită", "Schedule a Free Consultation")}</Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
