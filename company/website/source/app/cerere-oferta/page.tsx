"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Hotel,
  Store,
  Stethoscope,
  Factory,
  Server,
  Upload,
  FileText,
  X,
  CheckCircle2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { useLanguage } from "@/lib/language-context"

const TOTAL_STEPS = 6

type FormData = {
  industry: string
  projectType: string
  buildingSize: number
  buildingCount: number
  systems: string[]
  services: string[]
  timeline: string
  budget: string
  description: string
  files: string[]
  name: string
  company: string
  email: string
  phone: string
}

const initialData: FormData = {
  industry: "",
  projectType: "",
  buildingSize: 5000,
  buildingCount: 1,
  systems: [],
  services: [],
  timeline: "",
  budget: "",
  description: "",
  files: [],
  name: "",
  company: "",
  email: "",
  phone: "",
}

const industries = [
  { id: "office", icon: Building2, ro: "Birouri & Office", en: "Office Buildings" },
  { id: "horeca", icon: Hotel, ro: "HoReCa & Wellness", en: "HoReCa & Wellness" },
  { id: "medical", icon: Stethoscope, ro: "Medical & Farma", en: "Medical & Pharma" },
  { id: "retail", icon: Store, ro: "Retail & Shopping", en: "Retail & Shopping" },
  { id: "industrial", icon: Factory, ro: "Industrial & Logistică", en: "Industrial & Logistics" },
  { id: "datacenter", icon: Server, ro: "Centru de date", en: "Data Centre" },
]

const projectTypes = [
  { id: "new", ro: "Construcție nouă", en: "New build" },
  { id: "retrofit", ro: "Retrofit / modernizare", en: "Retrofit / modernisation" },
  { id: "upgrade", ro: "Upgrade sistem existent", en: "Upgrade existing system" },
  { id: "extension", ro: "Extindere", en: "Extension" },
]

const systemOptions = [
  { id: "hvac", ro: "HVAC (încălzire, ventilație, climatizare)", en: "HVAC (heating, ventilation, cooling)" },
  { id: "lighting", ro: "Iluminat inteligent", en: "Intelligent lighting" },
  { id: "access", ro: "Control acces & securitate", en: "Access control & security" },
  { id: "energy", ro: "Monitorizare energie", en: "Energy monitoring" },
  { id: "rooms", ro: "Automatizare camere", en: "Room automation" },
  { id: "fire", ro: "Integrare sisteme de incendiu", en: "Fire system integration" },
  { id: "scada", ro: "BMS / SCADA centralizat", en: "Centralised BMS / SCADA" },
  { id: "other", ro: "Altele", en: "Other" },
]

const serviceOptions = [
  { id: "design", ro: "Proiectare", en: "Design" },
  { id: "install", ro: "Execuție & instalare", en: "Installation" },
  { id: "integration", ro: "Integrare sisteme", en: "Systems integration" },
  { id: "maintenance", ro: "Mentenanță", en: "Maintenance" },
  { id: "consultancy", ro: "Consultanță", en: "Consultancy" },
]

const timelineOptions = [
  { id: "now", ro: "Imediat", en: "Immediately" },
  { id: "1-3", ro: "1–3 luni", en: "1–3 months" },
  { id: "3-6", ro: "3–6 luni", en: "3–6 months" },
  { id: "6-12", ro: "6–12 luni", en: "6–12 months" },
  { id: "exploring", ro: "În explorare", en: "Just exploring" },
]

const budgetOptions = [
  { id: "u50", ro: "sub 50.000 EUR", en: "under €50,000" },
  { id: "50-150", ro: "50.000 – 150.000 EUR", en: "€50,000 – €150,000" },
  { id: "150-500", ro: "150.000 – 500.000 EUR", en: "€150,000 – €500,000" },
  { id: "o500", ro: "peste 500.000 EUR", en: "over €500,000" },
  { id: "unsure", ro: "Nedecis", en: "Not sure yet" },
]

// ─── Shared bits ──────────────────────────────────────────────────────────────

function StepHeading({ label, title, subtitle }: { label: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <p className="text-xs text-[#1F6B4A] font-semibold tracking-widest uppercase mb-2">{label}</p>
      <h2 className="text-3xl font-light text-[#0D2E2B] tracking-tighter leading-tight">{title}</h2>
      {subtitle && <p className="text-sm text-[#888888] font-light mt-2 leading-relaxed">{subtitle}</p>}
    </div>
  )
}

function CheckTile({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-[2px] border text-left transition-colors duration-150"
      style={{
        borderColor: selected ? "#1F6B4A" : "rgba(13,46,43,0.12)",
        backgroundColor: selected ? "#C8E6C940" : "#F5F4F0",
      }}
    >
      <div
        className="flex h-5 w-5 items-center justify-center rounded-[1px] shrink-0"
        style={{ backgroundColor: selected ? "#1F6B4A" : "transparent", border: selected ? "none" : "1px solid rgba(13,46,43,0.25)" }}
      >
        {selected && <Check className="h-3 w-3 text-white" />}
      </div>
      <span className="text-sm font-medium text-[#0D2E2B]">{label}</span>
    </button>
  )
}

function PillChoice({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-[1px] border text-sm font-medium transition-colors duration-150 ${
        selected
          ? "bg-[#0D2E2B] border-[#0D2E2B] text-white"
          : "bg-white border-[#0D2E2B]/15 text-[#0D2E2B]/70 hover:border-[#0D2E2B]/30 hover:text-[#0D2E2B]"
      }`}
    >
      {label}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CerereOfertaPage() {
  const { t } = useLanguage()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<FormData>(initialData)
  const [submitted, setSubmitted] = useState(false)

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setData((p) => ({ ...p, [key]: value }))
  const toggle = (key: "systems" | "services", id: string) =>
    setData((p) => ({ ...p, [key]: p[key].includes(id) ? p[key].filter((x) => x !== id) : [...p[key], id] }))

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const names = Array.from(e.target.files ?? []).map((f) => f.name)
    set("files", [...data.files, ...names])
  }

  const canProceed = () => {
    switch (step) {
      case 1: return data.industry !== ""
      case 2: return data.projectType !== "" && data.buildingSize > 0
      case 3: return data.systems.length > 0
      case 4: return data.services.length > 0 && data.timeline !== ""
      case 5: return true
      case 6: return data.name.trim() !== "" && data.email.trim() !== ""
      default: return true
    }
  }

  const next = () => {
    if (step === TOTAL_STEPS) {
      setSubmitted(true)
      return
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }
  const back = () => setStep((s) => Math.max(s - 1, 1))

  const stepLabels = [
    t("Industrie", "Industry"),
    t("Proiect", "Project"),
    t("Sisteme", "Systems"),
    t("Servicii", "Services"),
    t("Documentație", "Documents"),
    t("Contact", "Contact"),
  ]

  // ── Thank you ──
  if (submitted) {
    return (
      <main className="min-h-screen bg-[#F5F4F0]">
        <section className="bg-[#07201C] py-16">
          <div className="max-w-4xl mx-auto px-8">
            <p className="text-xs text-[#C8E6C9] font-semibold tracking-widest uppercase mb-3">• {t("Cerere ofertă", "Offer request")}</p>
            <h1 className="text-3xl md:text-5xl font-light text-white tracking-tighter">{t("Mulțumim!", "Thank you!")}</h1>
          </div>
        </section>
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-6 md:px-8">
            <div className="bg-white rounded-[2px] p-10 border border-[#0D2E2B]/10 text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#C8E6C9]">
                <CheckCircle2 className="h-7 w-7 text-[#1F6B4A]" />
              </div>
              <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter mb-3">
                {t("Cererea ta a fost trimisă", "Your request has been sent")}
              </h2>
              <p className="text-sm text-[#888888] font-light max-w-lg mx-auto leading-relaxed mb-8">
                {t(
                  "Un specialist Sovitech va analiza cerințele proiectului tău și te va contacta cu o propunere personalizată în cel mult 48 de ore.",
                  "A Sovitech specialist will review your project requirements and get back to you with a tailored proposal within 48 hours.",
                )}
              </p>
              <Link
                href="/produse"
                className="inline-flex items-center gap-2 bg-[#0D2E2B] text-white text-sm font-semibold px-6 py-3 rounded-[1px] hover:bg-[#1F6B4A] transition-colors duration-300"
              >
                {t("Înapoi la produse", "Back to products")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  const progress = ((step - 1) / TOTAL_STEPS) * 100

  return (
    <main className="min-h-screen bg-[#F5F4F0]">
      {/* Hero */}
      <section className="bg-[#07201C] pt-12 pb-10 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 h-[3px] bg-[#1F6B4A] transition-all duration-500" style={{ width: `${progress}%` }} />
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          <p className="text-xs text-[#C8E6C9] font-semibold tracking-widest uppercase mb-3">• {t("Cerere ofertă personalizată", "Custom offer request")}</p>
          <h1 className="text-3xl md:text-5xl font-light text-white leading-tight tracking-tighter mb-3 text-balance">
            {t("Spune-ne despre proiectul tău", "Tell us about your project")}
          </h1>
          <p className="text-white/50 font-light text-base max-w-xl leading-relaxed">
            {t(
              "Completează cei 6 pași și primești o propunere adaptată exact nevoilor clădirii tale.",
              "Complete the 6 steps and receive a proposal tailored to your building's exact needs.",
            )}
          </p>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          {/* Progress steps */}
          <div className="bg-white rounded-[2px] p-5 mb-5 border border-[#0D2E2B]/10">
            <div className="flex items-center">
              {stepLabels.map((label, i) => {
                const s = i + 1
                const done = s < step
                const active = s === step
                return (
                  <div key={label} className="flex-1 flex flex-col items-center relative">
                    {i > 0 && (
                      <div
                        className="absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2 transition-colors duration-300"
                        style={{ backgroundColor: done || active ? "#1F6B4A" : "rgba(13,46,43,0.10)" }}
                      />
                    )}
                    <div
                      className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                      style={{
                        backgroundColor: done ? "#1F6B4A" : active ? "#0D2E2B" : "rgba(13,46,43,0.06)",
                        color: done || active ? "#fff" : "#888",
                      }}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : s}
                    </div>
                    <span className={`mt-1.5 text-[11px] hidden sm:block text-center transition-colors ${active ? "text-[#0D2E2B] font-semibold" : "text-[#aaa]"}`}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step content */}
          <div className="bg-white rounded-[2px] p-6 md:p-10 border border-[#0D2E2B]/10 min-h-[360px]">
            {/* Step 1 — Industry */}
            {step === 1 && (
              <div>
                <StepHeading
                  label={`• ${t("Pasul 1 din 6", "Step 1 of 6")}`}
                  title={t("Ce tip de clădire ai?", "What type of building do you have?")}
                  subtitle={t("Alege industria care descrie cel mai bine proiectul tău.", "Choose the industry that best describes your project.")}
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {industries.map((ind) => {
                    const Icon = ind.icon
                    const sel = data.industry === ind.id
                    return (
                      <button
                        key={ind.id}
                        type="button"
                        onClick={() => set("industry", ind.id)}
                        className="relative p-5 rounded-[2px] border text-left transition-colors duration-150"
                        style={{ borderColor: sel ? "#1F6B4A" : "rgba(13,46,43,0.12)", backgroundColor: sel ? "#C8E6C940" : "#F5F4F0" }}
                      >
                        <Icon className="h-6 w-6 mb-3" style={{ color: sel ? "#1F6B4A" : "#888" }} />
                        <p className="text-sm font-semibold text-[#0D2E2B]">{t(ind.ro, ind.en)}</p>
                        {sel && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#1F6B4A] flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 2 — Project details */}
            {step === 2 && (
              <div className="max-w-lg">
                <StepHeading
                  label={`• ${t("Pasul 2 din 6", "Step 2 of 6")}`}
                  title={t("Detalii proiect", "Project details")}
                  subtitle={t("Câteva informații despre amploarea proiectului.", "A few details about the scope of the project.")}
                />
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#0D2E2B]">{t("Tipul proiectului *", "Project type *")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {projectTypes.map((p) => (
                        <PillChoice key={p.id} selected={data.projectType === p.id} label={t(p.ro, p.en)} onClick={() => set("projectType", p.id)} />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-[#0D2E2B]">{t("Suprafața clădirii (m²)", "Building area (m²)")}</Label>
                      <span className="text-sm font-black text-[#1F6B4A]">{data.buildingSize.toLocaleString("ro-RO")}</span>
                    </div>
                    <Slider value={[data.buildingSize]} onValueChange={(v) => set("buildingSize", v[0])} min={500} max={100000} step={500} className="py-1" />
                    <div className="flex justify-between text-xs text-[#aaa]"><span>500 m²</span><span>100.000 m²</span></div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-[#0D2E2B]">{t("Număr de clădiri", "Number of buildings")}</Label>
                      <span className="text-sm font-black text-[#1F6B4A]">{data.buildingCount}</span>
                    </div>
                    <Slider value={[data.buildingCount]} onValueChange={(v) => set("buildingCount", v[0])} min={1} max={50} step={1} className="py-1" />
                    <div className="flex justify-between text-xs text-[#aaa]"><span>1</span><span>50+</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — Systems */}
            {step === 3 && (
              <div>
                <StepHeading
                  label={`• ${t("Pasul 3 din 6", "Step 3 of 6")}`}
                  title={t("Ce sisteme te interesează?", "Which systems are you interested in?")}
                  subtitle={t("Selectează toate sistemele relevante pentru proiect.", "Select all systems relevant to your project.")}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {systemOptions.map((s) => (
                    <CheckTile key={s.id} selected={data.systems.includes(s.id)} label={t(s.ro, s.en)} onClick={() => toggle("systems", s.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Step 4 — Services + timeline + budget */}
            {step === 4 && (
              <div>
                <StepHeading
                  label={`• ${t("Pasul 4 din 6", "Step 4 of 6")}`}
                  title={t("Servicii, termen și buget", "Services, timeline and budget")}
                  subtitle={t("Ce servicii îți dorești și când vrei să începi.", "Which services you need and when you want to start.")}
                />
                <div className="space-y-8">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#0D2E2B]">{t("Servicii necesare *", "Services needed *")}</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {serviceOptions.map((s) => (
                        <CheckTile key={s.id} selected={data.services.includes(s.id)} label={t(s.ro, s.en)} onClick={() => toggle("services", s.id)} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#0D2E2B]">{t("Când vrei să începi? *", "When do you want to start? *")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {timelineOptions.map((p) => (
                        <PillChoice key={p.id} selected={data.timeline === p.id} label={t(p.ro, p.en)} onClick={() => set("timeline", p.id)} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#0D2E2B]">{t("Buget estimat (opțional)", "Estimated budget (optional)")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {budgetOptions.map((p) => (
                        <PillChoice key={p.id} selected={data.budget === p.id} label={t(p.ro, p.en)} onClick={() => set("budget", data.budget === p.id ? "" : p.id)} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5 — Documentation + description */}
            {step === 5 && (
              <div className="max-w-2xl">
                <StepHeading
                  label={`• ${t("Pasul 5 din 6", "Step 5 of 6")}`}
                  title={t("Documentație & cerințe", "Documentation & requirements")}
                  subtitle={t("Adaugă planuri, caiete de sarcini sau orice document util și descrie nevoile tale.", "Add plans, specifications or any useful documents, and describe your needs.")}
                />
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#0D2E2B]">{t("Documentație proiect", "Project documentation")}</Label>
                    <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-[2px] border border-dashed border-[#0D2E2B]/25 bg-[#F5F4F0] cursor-pointer hover:border-[#1F6B4A]/50 transition-colors">
                      <Upload className="h-6 w-6 text-[#888]" />
                      <span className="text-sm font-medium text-[#0D2E2B]">{t("Adaugă documentație", "Add documentation")}</span>
                      <span className="text-xs text-[#888]">{t("PDF, DWG, imagini — până la 20 MB fiecare", "PDF, DWG, images — up to 20 MB each")}</span>
                      <input type="file" multiple className="hidden" onChange={onFiles} accept=".pdf,.dwg,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
                    </label>
                    {data.files.length > 0 && (
                      <ul className="space-y-2 pt-1">
                        {data.files.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-[#0D2E2B] bg-[#F5F4F0] rounded-[1px] px-3 py-2">
                            <FileText className="h-4 w-4 text-[#1F6B4A] shrink-0" />
                            <span className="flex-1 truncate">{f}</span>
                            <button type="button" onClick={() => set("files", data.files.filter((_, idx) => idx !== i))} aria-label={t("Elimină", "Remove")}>
                              <X className="h-4 w-4 text-[#888] hover:text-[#0D2E2B]" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold text-[#0D2E2B]">{t("Descrie nevoile proiectului", "Describe your project needs")}</Label>
                    <Textarea
                      id="description"
                      rows={5}
                      value={data.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder={t("Ex. dorim automatizarea completă a unui hotel de 120 de camere, cu integrare PMS și monitorizare energetică…", "e.g. we want full automation of a 120-room hotel with PMS integration and energy monitoring…")}
                      className="rounded-[2px] bg-[#F5F4F0] border-[#0D2E2B]/15 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 6 — Contact */}
            {step === 6 && (
              <div className="max-w-lg">
                <StepHeading
                  label={`• ${t("Pasul 6 din 6", "Step 6 of 6")}`}
                  title={t("Date de contact", "Contact details")}
                  subtitle={t("Cum te putem contacta cu propunerea personalizată.", "How we can reach you with the tailored proposal.")}
                />
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-semibold text-[#0D2E2B]">{t("Nume complet *", "Full name *")}</Label>
                      <Input id="name" value={data.name} onChange={(e) => set("name", e.target.value)} placeholder={t("Ion Popescu", "John Smith")} className="rounded-[2px] bg-[#F5F4F0] border-[#0D2E2B]/15" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-sm font-semibold text-[#0D2E2B]">{t("Companie", "Company")}</Label>
                      <Input id="company" value={data.company} onChange={(e) => set("company", e.target.value)} placeholder={t("Numele companiei", "Company name")} className="rounded-[2px] bg-[#F5F4F0] border-[#0D2E2B]/15" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-[#0D2E2B]">{t("Email *", "Email *")}</Label>
                    <Input id="email" type="email" value={data.email} onChange={(e) => set("email", e.target.value)} placeholder="ion.popescu@companie.ro" className="rounded-[2px] bg-[#F5F4F0] border-[#0D2E2B]/15" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-semibold text-[#0D2E2B]">{t("Telefon", "Phone")}</Label>
                    <Input id="phone" type="tel" value={data.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+40 7XX XXX XXX" className="rounded-[2px] bg-[#F5F4F0] border-[#0D2E2B]/15" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-5">
            <button
              onClick={back}
              disabled={step === 1}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#888] hover:text-[#0D2E2B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-4 py-2.5 rounded-[1px] hover:bg-[#0D2E2B]/5"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("Înapoi", "Back")}
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#888] hidden sm:block">{t("Pasul", "Step")} {step} {t("din", "of")} {TOTAL_STEPS}</span>
              <button
                onClick={next}
                disabled={!canProceed()}
                className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-[1px] bg-[#0D2E2B] text-white hover:bg-[#1F6B4A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-300"
              >
                {step === TOTAL_STEPS ? t("Trimite cererea", "Send request") : t("Continuă", "Continue")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
