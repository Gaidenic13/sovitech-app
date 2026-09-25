"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, CheckCircle2, Lock } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"

export default function DescarcaGhidPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Redirect to thank you page
    router.push("/ghid-bms/multumim")
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="container mx-auto px-4 section-l">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8">
            {/* Left: Benefits */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  {t("Obțineți Ghidul Gratuit de Evaluare BMS", "Get the Free BMS Evaluation Guide")}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {t(
                    "Completați formularul pentru a descărca imediat ghidul complet cu toate resursele incluse.",
                    "Fill in the form to immediately download the complete guide with all resources included.",
                  )}
                </p>
              </div>

              <Card className="p-6 bg-muted/30 border-border">
                <h3 className="font-semibold mb-4">{t("Ce veți primi:", "What you will receive:")}</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      {t(
                        "Ghid PDF de 42 pagini cu liste de verificare detaliate",
                        "42-page PDF guide with detailed checklists",
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      {t("Calculator ROI în format Excel editabil", "ROI calculator in editable Excel format")}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      {t("Benchmark-uri actualizate pentru toate sectoarele", "Updated benchmarks for all sectors")}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      {t("Studii de caz cu rezultate măsurabile", "Case studies with measurable results")}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      {t("Acces la webinarii exclusive despre BMS", "Access to exclusive BMS webinars")}
                    </span>
                  </li>
                </ul>
              </Card>

              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">{t("Datele dumneavoastră sunt în siguranță", "Your data is safe")}</p>
                    <p className="text-muted-foreground">
                      {t(
                        "Nu partajăm informațiile cu terți. Datele sunt folosite exclusiv pentru a vă trimite ghidul și conținut relevant.",
                        "We do not share your information with third parties. The data is used exclusively to send you the guide and relevant content.",
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right: Form */}
            <div className="md:col-span-3">
              <Card className="p-8 border-border">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{t("Prenume *", "First name *")}</Label>
                      <Input id="firstName" name="firstName" required placeholder={t("Ion", "John")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t("Nume *", "Last name *")}</Label>
                      <Input id="lastName" name="lastName" required placeholder={t("Popescu", "Smith")} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t("Email profesional *", "Work email *")}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder={t("ion.popescu@companie.ro", "john.smith@company.com")}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Ghidul va fi trimis imediat pe această adresă",
                        "The guide will be sent immediately to this address",
                      )}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("Telefon", "Phone")}</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="+40 721 234 567" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">{t("Companie *", "Company *")}</Label>
                    <Input id="company" name="company" required placeholder={t("Numele companiei", "Company name")} />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="propertyType">{t("Tip proprietate *", "Property type *")}</Label>
                      <Select name="propertyType" required>
                        <SelectTrigger id="propertyType">
                          <SelectValue placeholder={t("Selectați tipul", "Select the type")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="office">{t("Clădire de birouri", "Office building")}</SelectItem>
                          <SelectItem value="retail">{t("Spațiu comercial / Retail", "Commercial / Retail space")}</SelectItem>
                          <SelectItem value="hotel">{t("Hotel / HORECA", "Hotel / HORECA")}</SelectItem>
                          <SelectItem value="medical">{t("Unitate medicală", "Medical facility")}</SelectItem>
                          <SelectItem value="industrial">{t("Hală industrială", "Industrial hall")}</SelectItem>
                          <SelectItem value="mixed">{t("Utilizare mixtă", "Mixed use")}</SelectItem>
                          <SelectItem value="other">{t("Altele", "Other")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">{t("Funcția dumneavoastră *", "Your role *")}</Label>
                      <Select name="role" required>
                        <SelectTrigger id="role">
                          <SelectValue placeholder={t("Selectați funcția", "Select your role")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">{t("Proprietar", "Owner")}</SelectItem>
                          <SelectItem value="fm">{t("Facility Manager", "Facility Manager")}</SelectItem>
                          <SelectItem value="tech">{t("Director Tehnic", "Technical Director")}</SelectItem>
                          <SelectItem value="pm">{t("Project Manager", "Project Manager")}</SelectItem>
                          <SelectItem value="exec">{t("Management Executiv", "Executive Management")}</SelectItem>
                          <SelectItem value="other">{t("Altă funcție", "Other role")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-2">
                    <Checkbox id="consent" required />
                    <Label htmlFor="consent" className="text-sm font-normal leading-snug cursor-pointer">
                      {t(
                        "Sunt de acord să primesc ghidul și să fiu contactat de Sovitech Control cu informații despre soluții BMS. Pot să-mi retrag consimțământul oricând. *",
                        "I agree to receive the guide and to be contacted by Sovitech Control with information about BMS solutions. I can withdraw my consent at any time. *",
                      )}
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox id="newsletter" />
                    <Label htmlFor="newsletter" className="text-sm font-normal leading-snug cursor-pointer">
                      {t(
                        "Doresc să primesc newsletter-ul lunar cu articole despre eficiență energetică și automatizări",
                        "I would like to receive the monthly newsletter with articles about energy efficiency and automation",
                      )}
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>{t("Se trimite...", "Sending...")}</>
                    ) : (
                      <>
                        <Download className="mr-2 h-5 w-5" />
                        {t("Descarcă Ghidul Gratuit", "Download the Free Guide")}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    {t("Respectăm confidențialitatea datelor dumneavoastră. Citiți", "We respect the confidentiality of your data. Read our")}{" "}
                    <a href="/politica-confidentialitate" className="text-primary hover:underline">
                      {t("Politica de Confidențialitate", "Privacy Policy")}
                    </a>
                  </p>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
