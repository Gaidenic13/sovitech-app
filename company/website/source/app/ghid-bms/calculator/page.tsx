"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Calculator, TrendingDown, TrendingUp, Clock, Leaf, Award } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

export default function CalculatorPage() {
  const { t } = useLanguage()
  const [buildingSize, setBuildingSize] = useState(5000)
  const [energyCost, setEnergyCost] = useState(15000)
  const [buildingType, setBuildingType] = useState("office")
  const [showResults, setShowResults] = useState(false)

  const calculateROI = () => {
    const savingsRate = buildingType === "office" ? 0.3 : buildingType === "retail" ? 0.35 : 0.32
    const annualSavings = energyCost * 12 * savingsRate
    const investmentCost = buildingSize * 150
    const paybackPeriod = investmentCost / annualSavings
    const co2Reduction = buildingSize * 0.05

    return {
      annualSavings: Math.round(annualSavings),
      investmentCost: Math.round(investmentCost),
      paybackPeriod: paybackPeriod.toFixed(1),
      co2Reduction: Math.round(co2Reduction),
      savingsRate: Math.round(savingsRate * 100),
    }
  }

  const handleCalculate = () => {
    setShowResults(true)
  }

  const results = showResults ? calculateROI() : null

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">{t("Calculator ROI Personalizat", "Personalised ROI Calculator")}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t(
                "Descoperă economiile potențiale exacte pentru clădirea ta și perioada de amortizare a investiției în BMS",
                "Discover the exact potential savings for your building and the payback period for your BMS investment",
              )}
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Input Form */}
            <div className="lg:col-span-2">
              <Card className="p-6 border-border sticky top-8">
                <h2 className="text-xl font-bold mb-6">{t("Detaliile Clădirii", "Building Details")}</h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="buildingType">{t("Tipul clădirii", "Building Type")}</Label>
                    <Select value={buildingType} onValueChange={setBuildingType}>
                      <SelectTrigger id="buildingType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="office">{t("Clădire de birouri", "Office Building")}</SelectItem>
                        <SelectItem value="retail">{t("Spațiu retail", "Retail Space")}</SelectItem>
                        <SelectItem value="hotel">{t("Hotel / HORECA", "Hotel / HORECA")}</SelectItem>
                        <SelectItem value="medical">{t("Unitate medicală", "Medical Facility")}</SelectItem>
                        <SelectItem value="industrial">{t("Hală industrială", "Industrial Hall")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buildingSize">{t("Suprafața (m²)", "Floor Area (m²)")}</Label>
                    <div className="space-y-3">
                      <Input
                        id="buildingSize"
                        type="number"
                        value={buildingSize}
                        onChange={(e) => setBuildingSize(Number.parseInt(e.target.value) || 0)}
                        className="text-lg font-semibold"
                      />
                      <Slider
                        value={[buildingSize]}
                        onValueChange={(value) => setBuildingSize(value[0])}
                        min={500}
                        max={20000}
                        step={100}
                      />
                      <p className="text-xs text-muted-foreground">{t("500 – 20.000 m²", "500 – 20,000 m²")}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="energyCost">{t("Costuri lunare cu energia (RON)", "Monthly Energy Costs (RON)")}</Label>
                    <div className="space-y-3">
                      <Input
                        id="energyCost"
                        type="number"
                        value={energyCost}
                        onChange={(e) => setEnergyCost(Number.parseInt(e.target.value) || 0)}
                        className="text-lg font-semibold"
                      />
                      <Slider
                        value={[energyCost]}
                        onValueChange={(value) => setEnergyCost(value[0])}
                        min={1000}
                        max={100000}
                        step={1000}
                      />
                      <p className="text-xs text-muted-foreground">{t("1.000 – 100.000 RON", "1,000 – 100,000 RON")}</p>
                    </div>
                  </div>

                  <Button size="lg" className="w-full" onClick={handleCalculate}>
                    <Calculator className="mr-2 h-5 w-5" />
                    {t("Calculează ROI", "Calculate ROI")}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Results */}
            <div className="lg:col-span-3">
              {!showResults ? (
                <Card className="p-12 border-border text-center bg-muted/30">
                  <Calculator className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{t("Introdu datele tale", "Enter your details")}</h3>
                  <p className="text-muted-foreground">
                    {t(
                      "Completează informațiile despre clădirea ta în formularul din stânga pentru a vedea rezultatele",
                      "Fill in your building information in the form on the left to see the results",
                    )}
                  </p>
                </Card>
              ) : (
                <div className="space-y-6">
                  <Card className="p-8 border-border bg-gradient-to-br from-primary/5 to-primary/10">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center gap-2 text-sm text-primary mb-2">
                        <Award className="h-4 w-4" />
                        {t("+200 puncte câștigate", "+200 points earned")}
                      </div>
                      <h2 className="text-3xl font-bold mb-2">{t("Rezultatele Tale", "Your Results")}</h2>
                      <p className="text-muted-foreground">{t("Pe baza datelor introduse", "Based on the data you entered")}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="p-6 bg-white rounded-[2px] border border-border">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <TrendingDown className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{t("Economii anuale", "Annual Savings")}</p>
                            <p className="text-2xl font-bold text-green-600">
                              {results?.annualSavings.toLocaleString()} RON
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {results?.savingsRate}
                          {t("% reducere a costurilor cu energia", "% reduction in energy costs")}
                        </p>
                      </div>

                      <div className="p-6 bg-white rounded-[2px] border border-border">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{t("Perioada de amortizare", "Payback Period")}</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {results?.paybackPeriod} {t("ani", "years")}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("Investiție totală:", "Total investment:")} {results?.investmentCost.toLocaleString()} RON
                        </p>
                      </div>

                      <div className="p-6 bg-white rounded-[2px] border border-border">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{t("Economii pe 10 ani", "10-Year Savings")}</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {(results!.annualSavings * 10).toLocaleString()} RON
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("ROI cumulat după perioada de amortizare", "Cumulative ROI after the payback period")}
                        </p>
                      </div>

                      <div className="p-6 bg-white rounded-[2px] border border-border">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Leaf className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{t("Reducere CO₂", "CO₂ Reduction")}</p>
                            <p className="text-2xl font-bold text-green-600">
                              {results?.co2Reduction.toLocaleString()} {t("kg/an", "kg/yr")}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("Echivalentul a", "Equivalent to")} {Math.round(results!.co2Reduction / 1000)}{" "}
                          {t("tone CO₂", "tonnes CO₂")}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 border-border">
                    <h3 className="text-lg font-semibold mb-4">{t("Pașii Următori", "Next Steps")}</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-[2px]">
                        <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold">
                          1
                        </div>
                        <div>
                          <p className="font-medium mb-1">
                            {t("Explorează studii de caz similare", "Explore Similar Case Studies")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t(
                              "Vezi cum am ajutat clienți cu clădiri similare să economisească bani",
                              "See how we have helped clients with similar buildings to save money",
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-[2px]">
                        <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold">
                          2
                        </div>
                        <div>
                          <p className="font-medium mb-1">
                            {t("Programează o consultație gratuită", "Schedule a Free Consultation")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t(
                              "Discută rezultatele cu specialiștii noștri și primește o ofertă personalizată",
                              "Discuss the results with our specialists and receive a personalised quote",
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 mt-6">
                      <Button size="lg" className="flex-1" asChild>
                        <Link href="/ghid-bms/case-studies">{t("Vezi studiile de caz", "View Case Studies")}</Link>
                      </Button>
                      <Button size="lg" variant="outline" className="flex-1 bg-transparent" asChild>
                        <Link href="/contact">{t("Programează o consultație", "Schedule a Consultation")}</Link>
                      </Button>
                    </div>
                  </Card>

                  <div className="text-center">
                    <Button variant="link" asChild>
                      <Link href="/ghid-bms/dashboard">{t("Înapoi la Dashboard", "Back to Dashboard")}</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
