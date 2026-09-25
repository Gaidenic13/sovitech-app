"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

export default function QuizPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showResults, setShowResults] = useState(false)

  const questions = [
    {
      id: 1,
      question: t(
        "Care este suprafața totală a clădirii dumneavoastră?",
        "What is the total floor area of your building?",
      ),
      options: [
        { value: "small", label: t("Sub 1.000 m²", "Under 1,000 m²"), points: 1 },
        { value: "medium", label: t("1.000 - 5.000 m²", "1,000 - 5,000 m²"), points: 2 },
        { value: "large", label: t("5.000 - 10.000 m²", "5,000 - 10,000 m²"), points: 3 },
        { value: "xlarge", label: t("Peste 10.000 m²", "Over 10,000 m²"), points: 4 },
      ],
    },
    {
      id: 2,
      question: t("Cât de vechi sunt sistemele HVAC actuale?", "How old are your current HVAC systems?"),
      options: [
        { value: "new", label: t("Mai puțin de 5 ani", "Less than 5 years"), points: 1 },
        { value: "medium", label: t("5-10 ani", "5-10 years"), points: 2 },
        { value: "old", label: t("10-15 ani", "10-15 years"), points: 3 },
        { value: "very-old", label: t("Peste 15 ani", "Over 15 years"), points: 4 },
      ],
    },
    {
      id: 3,
      question: t(
        "Cât cheltuiți lunar pe energie (electricitate + gaze)?",
        "How much do you spend monthly on energy (electricity + gas)?",
      ),
      options: [
        { value: "low", label: t("Sub 5.000 lei", "Under 5,000 lei"), points: 1 },
        { value: "medium", label: t("5.000 - 15.000 lei", "5,000 - 15,000 lei"), points: 2 },
        { value: "high", label: t("15.000 - 30.000 lei", "15,000 - 30,000 lei"), points: 3 },
        { value: "very-high", label: t("Peste 30.000 lei", "Over 30,000 lei"), points: 4 },
      ],
    },
    {
      id: 4,
      question: t(
        "Aveți deja senzori sau automatizări instalate?",
        "Do you already have sensors or automation installed?",
      ),
      options: [
        { value: "none", label: t("Nu, nimic", "No, nothing"), points: 4 },
        { value: "basic", label: t("Termostate simple", "Simple thermostats"), points: 3 },
        { value: "medium", label: t("Câțiva senzori și timere", "A few sensors and timers"), points: 2 },
        { value: "advanced", label: t("Sistem parțial automatizat", "Partially automated system"), points: 1 },
      ],
    },
    {
      id: 5,
      question: t(
        "Cât de des primiți plângeri despre confortul termic?",
        "How often do you receive complaints about thermal comfort?",
      ),
      options: [
        { value: "never", label: t("Niciodată", "Never"), points: 1 },
        { value: "rare", label: t("Rar (o dată pe trimestru)", "Rarely (once a quarter)"), points: 2 },
        { value: "sometimes", label: t("Ocazional (lunar)", "Occasionally (monthly)"), points: 3 },
        { value: "often", label: t("Frecvent (săptămânal)", "Frequently (weekly)"), points: 4 },
      ],
    },
  ]

  const progress = ((currentQuestion + 1) / questions.length) * 100
  const isLastQuestion = currentQuestion === questions.length - 1
  const hasAnswer = answers[questions[currentQuestion].id]

  const handleNext = () => {
    if (isLastQuestion) {
      setShowResults(true)
    } else {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const calculateScore = () => {
    const totalPoints = Object.entries(answers).reduce((sum, [questionId, answer]) => {
      const question = questions.find((q) => q.id === Number.parseInt(questionId))
      const option = question?.options.find((opt) => opt.value === answer)
      return sum + (option?.points || 0)
    }, 0)
    const maxPoints = questions.reduce((sum, q) => sum + Math.max(...q.options.map((opt) => opt.points)), 0)
    return Math.round((totalPoints / maxPoints) * 100)
  }

  const getReadinessLevel = (score: number) => {
    if (score >= 75)
      return {
        level: t("Excelent", "Excellent"),
        color: "text-green-600",
        description: t(
          "Clădirea dumneavoastră are un potențial ridicat pentru economii prin BMS",
          "Your building has a high potential for savings through BMS",
        ),
      }
    if (score >= 50)
      return {
        level: t("Bun", "Good"),
        color: "text-blue-600",
        description: t(
          "Există oportunități semnificative de îmbunătățire",
          "There are significant opportunities for improvement",
        ),
      }
    if (score >= 25)
      return {
        level: t("Moderat", "Moderate"),
        color: "text-yellow-600",
        description: t(
          "BMS-ul ar aduce beneficii, dar necesită investiție inițială mai mare",
          "A BMS would bring benefits, but requires a larger initial investment",
        ),
      }
    return {
      level: t("Scăzut", "Low"),
      color: "text-orange-600",
      description: t(
        "Recomandăm o evaluare detaliată înainte de a continua",
        "We recommend a detailed assessment before proceeding",
      ),
    }
  }

  if (showResults) {
    const score = calculateScore()
    const readiness = getReadinessLevel(score)

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 mb-6 animate-bounce">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h1 className="text-4xl font-bold mb-4">{t("Evaluare Completată!", "Assessment Completed!")}</h1>
              <p className="text-lg text-muted-foreground">
                {t("Felicitări! Ai câștigat +150 puncte", "Congratulations! You earned +150 points")}
              </p>
            </div>

            <Card className="p-8 border-border mb-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center h-32 w-32 rounded-full bg-gradient-to-br from-primary to-primary/60 mb-4">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">{score}</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">{t("Scor Pregătire BMS", "BMS Readiness Score")}</h2>
                <p className={`text-xl font-semibold ${readiness.color}`}>{readiness.level}</p>
                <p className="text-muted-foreground mt-2">{readiness.description}</p>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-muted/30 rounded-[2px]">
                  <h3 className="font-semibold mb-3">{t("Recomandările Noastre:", "Our Recommendations:")}</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>
                        {t(
                          "Folosește calculatorul ROI pentru a estima economiile exacte",
                          "Use the ROI calculator to estimate your exact savings",
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>
                        {t(
                          "Programează o consultație gratuită cu specialiștii noștri",
                          "Schedule a free consultation with our specialists",
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>
                        {t(
                          "Explorează studiile de caz relevante pentru sectorul tău",
                          "Explore the case studies relevant to your sector",
                        )}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="flex-1" asChild>
                    <Link href="/ghid-bms/calculator">
                      {t("Calculează ROI Personalizat", "Calculate Personalised ROI")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="flex-1 bg-transparent" asChild>
                    <Link href="/ghid-bms/dashboard">{t("Vezi Dashboard", "View Dashboard")}</Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const question = questions[currentQuestion]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold">{t("Evaluare Pregătire BMS", "BMS Readiness Assessment")}</h1>
              <span className="text-sm text-muted-foreground">
                {currentQuestion + 1} / {questions.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          <Card className="p-8 border-border mb-6">
            <h2 className="text-2xl font-bold mb-6">{question.question}</h2>
            <RadioGroup
              value={answers[question.id]}
              onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
            >
              <div className="space-y-3">
                {question.options.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-3 rounded-[2px] border border-border p-4 hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                    <Label htmlFor={`${question.id}-${option.value}`} className="flex-1 cursor-pointer text-base">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handlePrevious} disabled={currentQuestion === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("Înapoi", "Back")}
            </Button>
            <Button onClick={handleNext} disabled={!hasAnswer}>
              {isLastQuestion ? t("Vezi Rezultatele", "See Results") : t("Următoarea", "Next")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
