"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  CheckCircle2,
  Lock,
  Trophy,
  Target,
  Calculator,
  ClipboardCheck,
  BookOpen,
  Calendar,
  FileText,
  Sparkles,
  Award,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"

// Simulated user progress (in real app, fetch from backend/localStorage)
const useUserProgress = () => {
  const [progress, setProgress] = useState({
    completedSteps: ["download"],
    totalPoints: 100,
    currentLevel: 1,
    badges: ["early-adopter"],
  })

  return progress
}

export default function DashboardPage() {
  const progress = useUserProgress()
  const { t } = useLanguage()
  const [showConfetti, setShowConfetti] = useState(false)

  const steps = [
    {
      id: "download",
      title: t("Descarcă Ghidul", "Download the Guide"),
      description: t("Obține ghidul complet de evaluare BMS", "Get the complete BMS evaluation guide"),
      points: 100,
      icon: Download,
      link: "/ghid-bms/multumim",
      completed: progress.completedSteps.includes("download"),
    },
    {
      id: "quiz",
      title: t("Evaluare Pregătire", "Readiness Assessment"),
      description: t(
        "Completează quiz-ul de 5 minute despre clădirea ta",
        "Complete the 5-minute quiz about your building",
      ),
      points: 150,
      icon: ClipboardCheck,
      link: "/ghid-bms/quiz",
      completed: progress.completedSteps.includes("quiz"),
      locked: !progress.completedSteps.includes("download"),
    },
    {
      id: "calculator",
      title: t("Calculator ROI Personalizat", "Personalised ROI Calculator"),
      description: t(
        "Descoperă economiile potențiale exact pentru tine",
        "Discover the potential savings tailored exactly to you",
      ),
      points: 200,
      icon: Calculator,
      link: "/ghid-bms/calculator",
      completed: progress.completedSteps.includes("calculator"),
      locked: !progress.completedSteps.includes("quiz"),
      reward: t("Deblochează studii de caz exclusive", "Unlocks exclusive case studies"),
    },
    {
      id: "case-studies",
      title: t("Studiezi Cazuri Similare", "Study Similar Cases"),
      description: t(
        "Explorează proiecte relevante pentru industria ta",
        "Explore projects relevant to your industry",
      ),
      points: 100,
      icon: BookOpen,
      link: "/ghid-bms/case-studies",
      completed: progress.completedSteps.includes("case-studies"),
      locked: !progress.completedSteps.includes("calculator"),
    },
    {
      id: "consultation",
      title: t("Programează Consultație", "Schedule a Consultation"),
      description: t(
        "Discută rezultatele cu un specialist Sovitech",
        "Discuss the results with a Sovitech specialist",
      ),
      points: 250,
      icon: Calendar,
      link: "/contact",
      completed: progress.completedSteps.includes("consultation"),
      locked: !progress.completedSteps.includes("case-studies"),
      reward: t("Deblochează ofertă personalizată", "Unlocks a personalised offer"),
    },
  ]

  const completedCount = steps.filter((s) => s.completed).length
  const totalSteps = steps.length
  const overallProgress = (completedCount / totalSteps) * 100
  const nextStep = steps.find((s) => !s.completed && !s.locked)

  const badges = [
    {
      id: "early-adopter",
      name: t("Early Adopter", "Early Adopter"),
      description: t("Primii 100 care au descărcat ghidul", "First 100 to download the guide"),
      icon: Zap,
      earned: progress.badges.includes("early-adopter"),
    },
    {
      id: "quiz-master",
      name: t("Expert BMS", "BMS Expert"),
      description: t("Completat quiz-ul cu scor peste 80%", "Completed the quiz with a score over 80%"),
      icon: Award,
      earned: progress.badges.includes("quiz-master"),
    },
    {
      id: "roi-calculator",
      name: t("Planificator Financiar", "Financial Planner"),
      description: t("Calculat ROI complet", "Calculated the full ROI"),
      icon: Trophy,
      earned: progress.badges.includes("roi-calculator"),
    },
    {
      id: "ready-to-go",
      name: t("Pregătit pentru BMS", "Ready for BMS"),
      description: t("Completat toate etapele", "Completed all the steps"),
      icon: Target,
      earned: progress.badges.includes("ready-to-go"),
    },
  ]

  useEffect(() => {
    if (completedCount > 0 && completedCount === totalSteps) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }
  }, [completedCount, totalSteps])

  return (
    <div className="min-h-screen bg-background">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-6xl animate-bounce">🎉</div>
        </div>
      )}

      <div className="container mx-auto px-4 section-l">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">{t("Parcursul Tău BMS", "Your BMS Journey")}</h1>
            <p className="text-lg text-muted-foreground">
              {t(
                "Continuă evaluarea și deblochează conținut exclusiv pe măsură ce avansezi",
                "Continue the assessment and unlock exclusive content as you progress",
              )}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Overall Progress Card */}
              <Card className="p-6 border-border bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{t("Progres General", "Overall Progress")}</h2>
                    <p className="text-muted-foreground">
                      {completedCount} {t("din", "of")} {totalSteps} {t("etape completate", "steps completed")}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">{progress.totalPoints}</div>
                    <div className="text-sm text-muted-foreground">{t("puncte", "points")}</div>
                  </div>
                </div>
                <Progress value={overallProgress} className="h-3 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {Math.round(overallProgress)}% {t("completat", "completed")}
                </p>
              </Card>

              {/* Next Step Highlight */}
              {nextStep && (
                <Card className="p-6 border-primary bg-primary/5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <nextStep.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <Badge className="mb-2">{t("Următorul Pas", "Next Step")}</Badge>
                      <h3 className="text-xl font-bold mb-2">{nextStep.title}</h3>
                      <p className="text-muted-foreground mb-4">{nextStep.description}</p>
                      <div className="flex items-center gap-4">
                        <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                          <Link href={nextStep.link}>
                            {t("Începe Acum", "Start Now")}
                            <Sparkles className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Trophy className="h-4 w-4" />+{nextStep.points} {t("puncte", "points")}
                        </div>
                      </div>
                      {nextStep.reward && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                          <Award className="h-4 w-4" />
                          {nextStep.reward}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Steps List */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">{t("Toate Etapele", "All Steps")}</h2>
                {steps.map((step, index) => (
                  <Card
                    key={step.id}
                    className={cn(
                      "p-6 border-border transition-all",
                      step.completed && "bg-muted/30",
                      step.locked && "opacity-60",
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                          step.completed
                            ? "bg-green-100 text-green-600"
                            : step.locked
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/10 text-primary",
                        )}
                      >
                        {step.completed ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : step.locked ? (
                          <Lock className="h-5 w-5" />
                        ) : (
                          <step.icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold">
                                {index + 1}. {step.title}
                              </h3>
                              {step.completed && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  {t("Completat", "Completed")}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                          </div>
                          <div className="text-sm font-medium text-muted-foreground">+{step.points} pts</div>
                        </div>
                        {!step.completed && !step.locked && (
                          <Button size="sm" variant="outline" asChild className="mt-2 bg-transparent">
                            <Link href={step.link}>
                              {step.id === "consultation" ? t("Programează", "Schedule") : t("Începe", "Start")}
                            </Link>
                          </Button>
                        )}
                        {step.locked && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {t(
                              "Completează etapa anterioară pentru a debloca",
                              "Complete the previous step to unlock",
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Level & Points */}
              <Card className="p-6 border-border">
                <div className="text-center mb-4">
                  <div className="inline-flex h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/60 items-center justify-center mb-3">
                    <span className="text-3xl font-bold text-white">{progress.currentLevel}</span>
                  </div>
                  <h3 className="font-semibold mb-1">
                    {t("Nivel", "Level")} {progress.currentLevel}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t("Entuziast BMS", "BMS Enthusiast")}</p>
                </div>
                <Progress value={60} className="mb-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {t("Încă 400 puncte până la Nivel 2", "400 more points until Level 2")}
                </p>
              </Card>

              {/* Badges */}
              <Card className="p-6 border-border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  {t("Insigne Câștigate", "Badges Earned")}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {badges.map((badge) => (
                    <div
                      key={badge.id}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-[2px] border text-center transition-all",
                        badge.earned ? "border-primary/50 bg-primary/5" : "border-border bg-muted/30 opacity-50",
                      )}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center mb-2",
                          badge.earned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        <badge.icon className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-medium mb-1">{badge.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{badge.description}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-6 border-border">
                <h3 className="font-semibold mb-4">{t("Acțiuni Rapide", "Quick Actions")}</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                    <Link href="/ghid-bms/multumim">
                      <Download className="mr-2 h-4 w-4" />
                      {t("Re-descarcă Ghidul", "Re-download the Guide")}
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                    <Link href="/contact">
                      <Calendar className="mr-2 h-4 w-4" />
                      {t("Contactează-ne", "Contact Us")}
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                    <Link href="/referinte">
                      <FileText className="mr-2 h-4 w-4" />
                      {t("Vezi Proiecte", "View Projects")}
                    </Link>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
