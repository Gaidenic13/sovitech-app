"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Download, Award, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

export default function MultumimPage() {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="container mx-auto px-4 section-l">
        <div className="max-w-4xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-6">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-primary mb-4">
              <Award className="h-4 w-4" />
              {t("Ai câștigat +100 puncte!", "You earned +100 points!")}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {t("Mulțumim! Verificați Email-ul", "Thank You! Check Your Email")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t(
                "Am trimis ghidul complet de evaluare BMS pe adresa dvs. de email. Dacă nu găsiți email-ul în câteva minute, verificați și folderul spam.",
                "We have sent the complete BMS evaluation guide to your email address. If you don't find the email within a few minutes, please also check your spam folder.",
              )}
            </p>
          </div>

          {/* Download Card */}
          <Card className="p-8 border-border bg-gradient-to-br from-primary/5 to-primary/10 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="h-12 w-12 rounded-[2px] bg-primary flex items-center justify-center flex-shrink-0">
                <Download className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">{t("Descărcare Imediată", "Immediate Download")}</h2>
                <p className="text-muted-foreground mb-4">
                  {t(
                    "Nu doriți să așteptați? Descărcați ghidul direct din browserul dumneavoastră.",
                    "Don't want to wait? Download the guide directly from your browser.",
                  )}
                </p>
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Download className="mr-2 h-5 w-5" />
                  {t("Descarcă Ghidul Acum (PDF, 8.2 MB)", "Download the Guide Now (PDF, 8.2 MB)")}
                </Button>
              </div>
            </div>
          </Card>

          {/* Dashboard CTA */}
          <Card className="p-8 border-primary bg-primary/5">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">
                {t("Continuă Evaluarea & Câștigă Recompense", "Continue the Assessment & Earn Rewards")}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                {t(
                  "Accesează dashboard-ul tău personalizat pentru a completa quiz-ul, a calcula ROI-ul și a debloca conținut exclusiv. Fiecare etapă completată te aduce mai aproape de o ofertă personalizată!",
                  "Access your personalised dashboard to complete the quiz, calculate the ROI and unlock exclusive content. Each completed step brings you closer to a personalised offer!",
                )}
              </p>
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <Link href="/ghid-bms/dashboard">
                  {t("Accesează Dashboard-ul", "Go to the Dashboard")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                {t(
                  "✨ Deblochează studii de caz • 🏆 Câștigă insigne • 📊 Vezi progresul",
                  "✨ Unlock case studies • 🏆 Earn badges • 📊 Track your progress",
                )}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
