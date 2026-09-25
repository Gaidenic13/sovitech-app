"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Hotel,
  Store,
  Factory,
  Server,
  Stethoscope,
  Check,
  TrendingUp,
  Wrench,
  Smile,
  Shield,
  Leaf,
  Phone,
  FileText,
  Zap,
  RotateCcw,
  Download,
  Share2,
  Link2,
  Mail,
  Linkedin,
  MessageCircle,
} from "lucide-react"
import {
  type FormData,
  type IndustryId,
  type ROIResults,
  industryDefaults,
  calculateROI,
  initialFormData,
} from "@/lib/roi-calculator"
import { useLanguage } from "@/lib/language-context"

const TOTAL_STEPS = 6 // steps 1–6, results on step 7

// Per-industry accent palette — dark enough to be readable on white
const industryAccent: Record<IndustryId, { bg: string; text: string; textOnBg: string }> = {
  hospitality: { bg: "#8B7B5C", text: "#8B7B5C", textOnBg: "#fff" },
  office:      { bg: "#5C5FD4", text: "#5C5FD4", textOnBg: "#fff" },
  retail:      { bg: "#1F6B4A", text: "#1F6B4A", textOnBg: "#fff" },
  healthcare:  { bg: "#1F6B4A", text: "#1F6B4A", textOnBg: "#fff" },
  industrial:  { bg: "#0D2E2B", text: "#0D2E2B", textOnBg: "#fff" },
  dataCenter:  { bg: "#5C5FD4", text: "#5C5FD4", textOnBg: "#fff" },
}

// Lighter tint for selected card background
const industryTint: Record<IndustryId, string> = {
  hospitality: "#8B7B5C18",
  office:      "#C5C0F5",
  retail:      "#C8E6C9",
  healthcare:  "#C8E6C9",
  industrial:  "#0D2E2B18",
  dataCenter:  "#C5C0F5",
}

const industryIcons: Record<IndustryId, React.ReactNode> = {
  hospitality: <Hotel className="h-7 w-7" />,
  office:      <Building2 className="h-7 w-7" />,
  retail:      <Store className="h-7 w-7" />,
  healthcare:  <Stethoscope className="h-7 w-7" />,
  industrial:  <Factory className="h-7 w-7" />,
  dataCenter:  <Server className="h-7 w-7" />,
}

const goalAccent: Record<string, { tint: string; solid: string; onSolid: string }> = {
  energy:        { tint: "#C8E6C9", solid: "#1F6B4A", onSolid: "#fff" },
  maintenance:   { tint: "#8B7B5C18", solid: "#8B7B5C", onSolid: "#fff" },
  comfort:       { tint: "#C5C0F5", solid: "#5C5FD4", onSolid: "#fff" },
  compliance:    { tint: "#0D2E2B18", solid: "#0D2E2B", onSolid: "#fff" },
  environmental: { tint: "#C8E6C9", solid: "#0D2E2B", onSolid: "#fff" },
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function StepHeading({ label, title, subtitle }: { label?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      {label && <p className="text-xs text-[#1F6B4A] font-semibold tracking-widest uppercase mb-2">{label}</p>}
      <h2 className="text-3xl font-light text-[#0D2E2B] tracking-tighter leading-tight">{title}</h2>
      {subtitle && <p className="text-sm text-[#888888] font-light mt-2 leading-relaxed">{subtitle}</p>}
    </div>
  )
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-[#0D2E2B]">{label}</label>
      {children}
      {hint && <p className="text-xs text-[#888888] font-light">{hint}</p>}
    </div>
  )
}

function RadioOption({ value, id, label, desc }: { value: string; id: string; label: string; desc?: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-[2px] border border-[#0D2E2B]/10 bg-[#F5F4F0] hover:border-[#0D2E2B]/25 transition-colors cursor-pointer">
      <RadioGroupItem value={value} id={id} className="mt-0.5 shrink-0" />
      <div>
        <Label htmlFor={id} className="text-sm font-semibold text-[#0D2E2B] cursor-pointer leading-snug">{label}</Label>
        {desc && <p className="text-xs text-[#888888] font-light mt-0.5">{desc}</p>}
      </div>
    </div>
  )
}

function CheckboxRow({ id, checked, onCheckedChange, label, desc }: {
  id: string; checked: boolean; onCheckedChange: (v: boolean) => void; label: string; desc?: string
}) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-[2px] border transition-colors cursor-pointer"
      style={{ borderColor: checked ? "#1F6B4A40" : "rgba(13,46,43,0.10)", backgroundColor: checked ? "#C8E6C940" : "#F5F4F0" }}
      onClick={() => onCheckedChange(!checked)}
    >
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} className="mt-0.5 shrink-0" />
      <div>
        <Label htmlFor={id} className="text-sm font-semibold text-[#0D2E2B] cursor-pointer leading-snug">{label}</Label>
        {desc && <p className="text-xs text-[#888888] font-light mt-0.5">{desc}</p>}
      </div>
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ currentStep, accent }: { currentStep: number; accent: typeof industryAccent[IndustryId] | null }) {
  const { lang } = useLanguage()
  const steps = lang === "ro"
    ? ["Industrie", "Situație", "Provocări", "Mentenanță", "Obiective", "Preferințe"]
    : ["Industry", "Situation", "Challenges", "Maintenance", "Goals", "Preferences"]

  return (
    <div className="w-full">
      <div className="flex items-center">
        {steps.map((label, i) => {
          const step = i + 1
          const done = step < currentStep
          const active = step === currentStep
          const accentColor = accent?.bg ?? "#0D2E2B"
          return (
            <div key={step} className="flex-1 flex flex-col items-center relative">
              {/* Connector line */}
              {i > 0 && (
                <div
                  className="absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2 transition-colors duration-500"
                  style={{ backgroundColor: done || active ? accentColor : "rgba(13,46,43,0.10)" }}
                />
              )}
              <div
                className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0"
                style={{
                  backgroundColor: done ? accentColor : active ? "#0D2E2B" : "rgba(13,46,43,0.06)",
                  color: done || active ? "#fff" : "#888",
                  boxShadow: active ? `0 0 0 4px ${accentColor}30` : "none",
                }}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : step}
              </div>
              <span className={`mt-1.5 text-xs hidden sm:block text-center transition-colors ${active ? "text-[#0D2E2B] font-semibold" : "text-[#888]"}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 1: Industry ─────────────────────────────────────────────────────────

function IndustrySelect({ formData, onSelect }: { formData: FormData; onSelect: (id: IndustryId) => void }) {
  const { t } = useLanguage()
  return (
    <div>
      <StepHeading
        label={`• ${t("Pasul 1 din 6", "Step 1 of 6")}`}
        title={t("Selectează industria", "Select your Industry")}
        subtitle={t("Alege tipul clădirii pentru o estimare personalizată a economiilor BMS.", "Choose your building type for a personalised BMS savings estimate.")}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.entries(industryDefaults) as [IndustryId, (typeof industryDefaults)[IndustryId]][]).map(([id, cfg]) => {
          const accent = industryAccent[id]
          const tint = industryTint[id]
          const selected = formData.industry === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className="group relative p-6 rounded-[2px] text-left transition-all duration-200 border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D2E2B]"
              style={{
                backgroundColor: selected ? tint : "#F5F4F0",
                borderColor: selected ? accent.bg : "transparent",
              }}
            >
              <div className="mb-4" style={{ color: selected ? accent.bg : "#aaa" }}>
                {industryIcons[id]}
              </div>
              <h3 className="font-light text-base mb-1 text-[#0D2E2B]">{cfg.label}</h3>
              <p className="text-xs font-light mb-3 text-[#888]">{t(cfg.description, cfg.descriptionEn ?? cfg.description)}</p>
              <p className="text-xs font-semibold" style={{ color: accent.bg }}>{t(cfg.paybackInfo, cfg.paybackInfoEn ?? cfg.paybackInfo)}</p>
              {selected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: accent.bg }}>
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 2: Current Situation ────────────────────────────────────────────────

function CurrentSituation({ formData, onInputChange }: {
  formData: FormData
  onInputChange: (f: keyof FormData, v: number | string) => void
}) {
  const { t } = useLanguage()
  const industry = formData.industry || null
  const accent = industry ? industryAccent[industry] : null
  const industryAverages: Record<IndustryId, { energy: string; size: string }> = {
    hospitality: { energy: "150.000 – 500.000 EUR/an", size: "5.000 – 50.000 mp" },
    office:      { energy: "80.000 – 300.000 EUR/an",  size: "3.000 – 30.000 mp" },
    retail:      { energy: "100.000 – 400.000 EUR/an", size: "2.000 – 20.000 mp" },
    healthcare:  { energy: "200.000 – 800.000 EUR/an", size: "10.000 – 100.000 mp" },
    industrial:  { energy: "150.000 – 1.000.000 EUR/an", size: "5.000 – 100.000 mp" },
    dataCenter:  { energy: "500.000 – 5.000.000 EUR/an", size: "1.000 – 20.000 mp" },
  }
  const avg = industry ? industryAverages[industry] : null

  return (
    <div className="max-w-lg">
      <StepHeading
        label={`• ${t("Pasul 2 din 6", "Step 2 of 6")}`}
        title={t("Situație curentă", "Current Situation")}
        subtitle={t("Introdu costurile și dimensiunea clădirii pentru a calcula economiile potențiale.", "Enter your building's costs and size to calculate potential savings.")}
      />
      {industry && accent && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ backgroundColor: industryTint[industry], color: accent.bg }}>
          {industryIcons[industry]}
          <span>{industryDefaults[industry].label}</span>
        </div>
      )}
      <div className="space-y-6">
        <FormField
          label={t("Cost anual energie (EUR) *", "Annual Energy Cost (EUR) *")}
          hint={avg && industry ? `${t("Medie pentru", "Average for")} ${industryDefaults[industry].label}: ${avg.energy}` : undefined}
        >
          <Input
            type="number"
            placeholder={t("ex. 250000", "e.g. 250000")}
            value={formData.annualEnergyCost || ""}
            onChange={(e) => onInputChange("annualEnergyCost", Number(e.target.value) || 0)}
            className="h-12 text-base border-[#0D2E2B]/20 focus-visible:ring-[#0D2E2B] rounded-[2px] bg-[#F5F4F0]"
          />
        </FormField>
        <FormField
          label={t("Suprafața clădirii (m²) *", "Building Area (m²) *")}
          hint={avg && industry ? `${t("Medie pentru", "Average for")} ${industryDefaults[industry].label}: ${avg.size}` : undefined}
        >
          <Input
            type="number"
            placeholder={t("ex. 15000", "e.g. 15000")}
            value={formData.buildingSize || ""}
            onChange={(e) => onInputChange("buildingSize", Number(e.target.value) || 0)}
            className="h-12 text-base border-[#0D2E2B]/20 focus-visible:ring-[#0D2E2B] rounded-[2px] bg-[#F5F4F0]"
          />
        </FormField>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-[#0D2E2B]">{t("Număr de clădiri", "Number of Buildings")}</label>
            <span className="text-sm font-light" style={{ color: accent?.bg ?? "#1F6B4A" }}>{formData.buildingCount}</span>
          </div>
          <Slider value={[formData.buildingCount]} onValueChange={(v) => onInputChange("buildingCount", v[0])} min={1} max={50} step={1} className="py-1" />
          <div className="flex justify-between text-xs text-[#888]">
            <span>{t("1 clădire", "1 building")}</span>
            <span>{t("50 clădiri", "50 buildings")}</span>
          </div>
          {formData.buildingCount > 1 && accent && industry && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-[2px]" style={{ backgroundColor: industryTint[industry] }}>
              <Check className="h-3.5 w-3.5 shrink-0" style={{ color: accent.bg }} />
              <p className="text-xs font-semibold" style={{ color: accent.bg }}>
                {t("Discount aplicat pentru", "Volume discount applied for")} {formData.buildingCount} {t("clădiri", "buildings")}:{" "}
                {Math.round((1 - Math.max(0.6, 1 - formData.buildingCount * 0.05)) * 100)}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Challenges ───────────────────────────────────────────────────────

function PainPoints({ formData, onInputChange, onArrayToggle }: {
  formData: FormData
  onInputChange: (f: keyof FormData, v: number | string | boolean) => void
  onArrayToggle: (f: keyof FormData, v: string) => void
}) {
  const { t } = useLanguage()
  const accent = formData.industry ? industryAccent[formData.industry] : null

  return (
    <div className="max-w-lg">
      <StepHeading
        label={`• ${t("Pasul 3 din 6", "Step 3 of 6")}`}
        title={t("Provocări specifice", "Specific Challenges")}
        subtitle={t("Aceste detalii ne ajută să calibrăm mai precis estimarea ta.", "These details help us calibrate your estimate more precisely.")}
      />

      {formData.industry === "hospitality" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[#0D2E2B]">{t("Grad mediu de ocupare", "Average Occupancy Rate")}</label>
              <span className="text-sm font-light" style={{ color: accent?.bg ?? "#1F6B4A" }}>{formData.occupancyRate}%</span>
            </div>
            <Slider value={[formData.occupancyRate]} onValueChange={(v) => onInputChange("occupancyRate", v[0])} min={0} max={100} step={5} className="py-1" />
            <div className="flex justify-between text-xs text-[#888]"><span>0%</span><span>100%</span></div>
          </div>
          <CheckboxRow
            id="guestComfortIssues"
            checked={formData.guestComfortIssues}
            onCheckedChange={(v) => onInputChange("guestComfortIssues", v)}
            label={t("Probleme de confort ale oaspeților", "Guest comfort issues")}
            desc={t("Reclamații frecvente legate de temperatură, umiditate sau calitatea aerului", "Frequent complaints about temperature, humidity or air quality")}
          />
        </div>
      )}

      {formData.industry === "office" && (
        <div className="space-y-6">
          <FormField label={t("Tipul biroului", "Office Type")}>
            <RadioGroup value={formData.officeType} onValueChange={(v) => onInputChange("officeType", v)} className="grid gap-3 mt-2">
              <RadioOption value="open-plan"   id="op-open"     label={t("Open Plan", "Open Plan")}     desc={t("Spațiu deschis, flexibil", "Open, flexible space")} />
              <RadioOption value="traditional" id="op-trad"     label={t("Tradițional", "Traditional")}  desc={t("Birouri individuale, celulare", "Individual, cellular offices")} />
              <RadioOption value="hybrid"      id="op-hybrid"   label={t("Hibrid", "Hybrid")}             desc={t("Combinație open plan + celular", "Mix of open plan and cellular")} />
            </RadioGroup>
          </FormField>
          <FormField label={t("Tipare de ocupare", "Occupancy Patterns")}>
            <div className="space-y-2 mt-2">
              {(["Variable occupancy", "Hot-desking", "After-hours usage"] as const).map((p) => (
                <CheckboxRow
                  key={p}
                  id={p}
                  checked={formData.occupancyPatterns.includes(p)}
                  onCheckedChange={() => onArrayToggle("occupancyPatterns", p)}
                  label={p === "Variable occupancy" ? t("Ocupare variabilă", "Variable occupancy") : p === "Hot-desking" ? t("Hot-desking / birouri partajate", "Hot-desking / shared desks") : t("Utilizare în afara orelor de program", "After-hours usage")}
                />
              ))}
            </div>
          </FormField>
        </div>
      )}

      {formData.industry === "retail" && (
        <FormField label={t("Formatul magazinului", "Store Format")}>
          <RadioGroup value={formData.storeFormat} onValueChange={(v) => onInputChange("storeFormat", v)} className="grid gap-3 mt-2">
            <RadioOption value="Standalone"   id="rf-stand" label={t("Standalone", "Standalone")}     desc={t("Magazin independent", "Independent store")} />
            <RadioOption value="Mall"          id="rf-mall"  label={t("Mall", "Mall")}                  desc={t("Într-un centru comercial", "Within a shopping mall")} />
            <RadioOption value="Strip Center"  id="rf-strip" label={t("Strip Center", "Strip Center")}  desc={t("Parc comercial de tip strip", "Strip-style retail park")} />
          </RadioGroup>
        </FormField>
      )}

      {(formData.industry === "healthcare" || formData.industry === "industrial" || formData.industry === "dataCenter") && accent && (
        <div className="text-center py-12 rounded-[2px] border-2 border-dashed" style={{ borderColor: accent.bg + "30", backgroundColor: industryTint[formData.industry!] }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: accent.bg }}>
            <Check className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-base font-light text-[#0D2E2B] mb-2">{t("Configurație standard", "Standard Configuration")}</h3>
          <p className="text-sm text-[#888] font-light max-w-xs mx-auto">
            {t("Pentru sectorul", "For the")} <span className="font-semibold text-[#0D2E2B]">{industryDefaults[formData.industry!].label}</span>{t(" vom aplica parametrii standard optimizați pe industrie.", ", we apply industry-optimised standard parameters.")}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Step 4: Maintenance ──────────────────────────────────────────────────────

function MaintenanceData({ formData, onInputChange }: {
  formData: FormData
  onInputChange: (f: keyof FormData, v: number | string) => void
}) {
  const { t } = useLanguage()
  return (
    <div className="max-w-lg">
      <StepHeading
        label={`• ${t("Pasul 4 din 6", "Step 4 of 6")}`}
        title={t("Date de mentenanță", "Maintenance Data")}
        subtitle={t("Cu cât știm mai mult despre costurile de mentenanță, cu atât estimarea va fi mai precisă.", "The more we know about your maintenance costs, the more accurate the estimate.")}
      />
      <div className="space-y-6">
        <FormField label={t("Buget anual mentenanță (EUR) *", "Annual Maintenance Budget (EUR) *")}>
          <Input
            type="number"
            placeholder={t("ex. 50000", "e.g. 50000")}
            value={formData.maintenanceBudget || ""}
            onChange={(e) => onInputChange("maintenanceBudget", Number(e.target.value) || 0)}
            className="h-12 text-base border-[#0D2E2B]/20 focus-visible:ring-[#0D2E2B] rounded-[2px] bg-[#F5F4F0]"
          />
        </FormField>
        <FormField label={t("Frecvența reparațiilor neprevăzute", "Frequency of Unexpected Repairs")}>
          <RadioGroup value={formData.unexpectedRepairs} onValueChange={(v) => onInputChange("unexpectedRepairs", v)} className="grid gap-3 mt-2">
            <RadioOption value="rare"     id="r-rare"  label={t("Rare", "Rare")}         desc={t("De câteva ori pe an", "A few times per year")} />
            <RadioOption value="moderate" id="r-mod"   label={t("Moderate", "Moderate")} desc={t("O dată pe lună", "Once a month")} />
            <RadioOption value="frequent" id="r-freq"  label={t("Frecvente", "Frequent")} desc={t("Săptămânal sau mai des", "Weekly or more often")} />
          </RadioGroup>
        </FormField>
        <FormField label={t("Vârsta echipamentelor HVAC", "HVAC Equipment Age")}>
          <RadioGroup value={formData.equipmentAge} onValueChange={(v) => onInputChange("equipmentAge", v)} className="grid gap-3 mt-2">
            <RadioOption value="new"      id="age-new" label={t("Noi (sub 5 ani)", "New (under 5 yrs)")}    desc={t("Echipamente recente, bine întreținute", "Recent equipment, well maintained")} />
            <RadioOption value="5-years"  id="age-5"   label={t("5–10 ani", "5–10 years")}                  desc={t("Eficiență ușor scăzută", "Slightly reduced efficiency")} />
            <RadioOption value="10-years" id="age-10"  label={t("Peste 10 ani", "Over 10 years")}            desc={t("Costuri crescute, randament scăzut", "Higher costs, lower performance")} />
          </RadioGroup>
        </FormField>
      </div>
    </div>
  )
}

// ─── Step 5: Goals ────────────────────────────────────────────────────────────

function GoalsSelection({ formData, onArrayToggle }: {
  formData: FormData
  onArrayToggle: (f: keyof FormData, v: string) => void
}) {
  const { t } = useLanguage()
  const goals = [
    { id: "energy",        label: t("Eficiență energetică", "Energy Efficiency"),         desc: t("Reducerea consumului de energie al clădirii", "Reduce the building's energy consumption"),      icon: <Zap className="h-5 w-5" /> },
    { id: "maintenance",   label: t("Optimizare mentenanță", "Maintenance Optimisation"),  desc: t("Mentenanță predictivă și reducerea costurilor", "Predictive maintenance and cost reduction"),   icon: <Wrench className="h-5 w-5" /> },
    { id: "comfort",       label: t("Confort ocupanți", "Occupant Comfort"),               desc: t("Confort termic, calitate aer, productivitate", "Thermal comfort, air quality, productivity"),   icon: <Smile className="h-5 w-5" /> },
    { id: "compliance",    label: t("Conformitate & ESG", "Compliance & ESG"),             desc: t("EPBD, certificări verzi, raportare ESG", "EPBD directives, green certifications, ESG reports"), icon: <Shield className="h-5 w-5" /> },
    { id: "environmental", label: t("Sustenabilitate", "Sustainability"),                  desc: t("Reducerea amprentei de carbon a clădirii", "Reduce the building's carbon footprint"),           icon: <Leaf className="h-5 w-5" /> },
  ]
  return (
    <div>
      <StepHeading
        label={`• ${t("Pasul 5 din 6", "Step 5 of 6")}`}
        title={t("Obiectivele tale", "Your Goals")}
        subtitle={t("Selectează cel puțin un obiectiv prioritar. Poți alege mai multe.", "Select at least one priority goal. You can choose multiple.")}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
        {goals.map((g) => {
          const sel = formData.selectedGoals.includes(g.id as FormData["selectedGoals"][number])
          const a = goalAccent[g.id]
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onArrayToggle("selectedGoals", g.id)}
              className="relative p-5 rounded-[2px] border-2 text-left transition-all duration-200 focus:outline-none"
              style={{
                backgroundColor: sel ? a.tint : "#F5F4F0",
                borderColor: sel ? a.solid : "transparent",
              }}
            >
              <div className="mb-3" style={{ color: sel ? a.solid : "#aaa" }}>{g.icon}</div>
              <h3 className="font-light text-sm mb-1 text-[#0D2E2B]">{g.label}</h3>
              <p className="text-xs font-light text-[#888] leading-relaxed">{g.desc}</p>
              {sel && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: a.solid }}>
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>
      {formData.selectedGoals.length === 0 && (
        <p className="text-xs text-red-500 font-medium">{t("Selectează cel puțin un obiectiv pentru a continua.", "Select at least one goal to continue.")}</p>
      )}
    </div>
  )
}

// ─── Step 6: Preferences ──────────────────────────────────────────────────────

function ImplementationPrefs({ formData, onInputChange }: {
  formData: FormData
  onInputChange: (f: keyof FormData, v: number | string | boolean) => void
}) {
  const { t } = useLanguage()
  return (
    <div className="max-w-lg">
      <StepHeading
        label={`• ${t("Pasul 6 din 6", "Step 6 of 6")}`}
        title={t("Preferințe de implementare", "Implementation Preferences")}
        subtitle={t("Ultimele detalii pentru o estimare cât mai precisă a costului și ROI-ului.", "Final details for the most accurate cost and ROI estimate.")}
      />
      <div className="space-y-6">
        <FormField
          label={t("Buget disponibil pentru implementare (EUR) — opțional", "Available implementation budget (EUR) — optional")}
          hint={t("Dacă nu este specificat, estimăm pe baza suprafeței și numărului de clădiri (aprox. 25 EUR/m²).", "If not specified, we estimate based on area and building count (approx. €25/m²).")}
        >
          <Input
            type="number"
            placeholder={t("Lasă gol pentru estimare automată", "Leave blank for automatic estimate")}
            value={formData.implementationBudget || ""}
            onChange={(e) => onInputChange("implementationBudget", Number(e.target.value) || 0)}
            className="h-12 text-base border-[#0D2E2B]/20 focus-visible:ring-[#0D2E2B] rounded-[2px] bg-[#F5F4F0]"
          />
        </FormField>
        <FormField label={t("Orizont de timp ROI dorit", "Desired ROI Timeframe")}>
          <RadioGroup value={formData.timelineROI} onValueChange={(v) => onInputChange("timelineROI", v)} className="grid gap-3 mt-2">
            <RadioOption value="<1yr"   id="t-fast" label={t("Sub 1 an", "Under 1 Year")}  desc={t("Implementare intensivă, economii rapide", "Intensive rollout, fast savings")} />
            <RadioOption value="1-3yrs" id="t-mid"  label={t("1–3 ani", "1–3 Years")}      desc={t("Echilibru optim între cost și beneficii", "Optimal balance between cost and benefits")} />
            <RadioOption value="3-5yrs" id="t-slow" label={t("3–5 ani", "3–5 Years")}      desc={t("Implementare graduală, investiție moderată", "Gradual rollout, moderate investment")} />
          </RadioGroup>
        </FormField>
        <CheckboxRow
          id="hasExistingSystems"
          checked={formData.hasExistingSystems}
          onCheckedChange={(v) => onInputChange("hasExistingSystems", v)}
          label={t("Am deja sisteme de automatizare parțial instalate", "I already have partially installed automation systems")}
          desc={t("Reduce costul de implementare cu aproximativ 30%", "Reduces implementation cost by approximately 30%")}
        />
      </div>
    </div>
  )
}

// ─── Step 7: Results ──────────────────────────────────────────────────────────

function ResultsReport({ results, formData, onReset }: { results: ROIResults; formData: FormData; onReset: () => void }) {
  const { t } = useLanguage()
  const accent = formData.industry ? industryAccent[formData.industry] : null
  const tint = formData.industry ? industryTint[formData.industry] : "#F5F4F0"
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const fmt = (v: number) =>
    new Intl.NumberFormat("ro-RO", { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(v))

  const shareUrl = () => `${window.location.origin}/calculator-roi`
  const shareText = () =>
    t(
      `Am estimat cu calculatorul Sovitech economii anuale de ${fmt(results.totalAnnualSavings)} EUR cu un sistem BMS, cu amortizare în ${results.paybackYears} ani. Calculează și tu:`,
      `I estimated ${fmt(results.totalAnnualSavings)} EUR in annual savings with a BMS using the Sovitech calculator, with payback in ${results.paybackYears} years. Try it yourself:`
    )

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable (e.g. insecure context) — nothing else to do
    }
  }

  const savings = [
    {
      icon: <Zap className="h-5 w-5 text-[#1F6B4A]" />,
      tint: "#C8E6C9",
      label: t("Economii energie/an", "Energy savings/yr"),
      sub: `${results.energySavingsPercent}% ${t("reducere", "reduction")}`,
      value: `${fmt(results.annualEnergySavings)} EUR`,
    },
    {
      icon: <Wrench className="h-5 w-5 text-[#8B7B5C]" />,
      tint: "#8B7B5C18",
      label: t("Economii mentenanță/an", "Maintenance savings/yr"),
      sub: t("Mentenanță predictivă", "Predictive maintenance"),
      value: `${fmt(results.annualMaintenanceSavings)} EUR`,
    },
  ]

  const timeline = [
    { label: t("An 1", "Year 1"),  value: results.totalAnnualSavings,       bg: "#C8E6C9",   text: "#1F6B4A", bar: "#1F6B4A" },
    { label: t("An 3", "Year 3"),  value: results.totalAnnualSavings * 3.2,  bg: "#C5C0F5",   text: "#5C5FD4", bar: "#5C5FD4" },
    { label: t("An 5", "Year 5"),  value: results.totalAnnualSavings * 5.8,  bg: "#0D2E2B",   text: "#C8E6C9", bar: "#C8E6C9" },
  ]

  return (
    <div id="roi-report" className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-[#1F6B4A] font-semibold tracking-widest uppercase mb-1">• {t("Rezultate", "Results")}</p>
          <h2 className="text-3xl md:text-4xl font-light text-[#0D2E2B] leading-tight tracking-tighter">{t("Analiza ta ROI personalizată", "Your Personalised ROI Analysis")}</h2>
          {formData.industry && accent && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mt-2" style={{ backgroundColor: tint, color: accent.bg }}>
              {industryIcons[formData.industry]}
              <span>{industryDefaults[formData.industry].label}</span>
            </div>
          )}
        </div>
        <button
          onClick={onReset}
          className="print-hide inline-flex items-center gap-2 text-sm text-[#888] hover:text-[#0D2E2B] border border-[#0D2E2B]/15 px-4 py-2 rounded-[2px] hover:border-[#0D2E2B]/30 transition-colors shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t("Recalculează", "Recalculate")}
        </button>
      </div>

      {/* Hero metrics */}
      <div className="bg-[#0D2E2B] rounded-[2px] p-6 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-xs text-white/40 font-semibold tracking-widest uppercase mb-2">{t("ROI 5 ani", "5-Year ROI")}</p>
            <p className="text-3xl md:text-4xl font-light" style={{ color: accent?.bg ?? "#C8E6C9" }}>{results.roiPercentage}%</p>
          </div>
          <div>
            <p className="text-xs text-white/40 font-semibold tracking-widest uppercase mb-2">{t("Recuperare invest.", "Payback")}</p>
            <p className="text-3xl md:text-4xl font-light text-white">{results.paybackYears} {t("ani", "yrs")}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 font-semibold tracking-widest uppercase mb-2">{t("Economii/an", "Savings/yr")}</p>
            <p className="text-3xl md:text-4xl font-light text-white">{fmt(results.totalAnnualSavings)}</p>
            <p className="text-xs text-white/40 mt-1">EUR</p>
          </div>
          <div>
            <p className="text-xs text-white/40 font-semibold tracking-widest uppercase mb-2">{t("Beneficiu net 5 ani", "Net benefit 5 yrs")}</p>
            <p className="text-3xl md:text-4xl font-light" style={{ color: "#C8E6C9" }}>{fmt(results.fiveYearReturn)}</p>
            <p className="text-xs text-white/40 mt-1">EUR</p>
          </div>
        </div>
      </div>

      {/* Savings breakdown */}
      <div className="bg-white rounded-[2px] p-6 border border-[#0D2E2B]/8">
        <p className="text-xs text-[#888] font-semibold tracking-widest uppercase mb-5">• {t("Detaliu economii", "Savings breakdown")}</p>
        <div className="space-y-4">
          {savings.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[2px] flex items-center justify-center shrink-0" style={{ backgroundColor: s.tint }}>
                  {s.icon}
                </div>
                <div>
                  <p className="font-light text-sm text-[#0D2E2B]">{s.label}</p>
                  <p className="text-xs text-[#888] font-light">{s.sub}</p>
                </div>
              </div>
              <p className="text-lg font-light text-[#0D2E2B] shrink-0">{s.value}</p>
            </div>
          ))}
          <div className="border-t border-[#0D2E2B]/8 pt-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[2px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#C5C0F5" }}>
                <TrendingUp className="h-5 w-5 text-[#5C5FD4]" />
              </div>
              <div>
                <p className="font-light text-sm text-[#0D2E2B]">{t("Cost estimat implementare", "Estimated implementation cost")}</p>
                <p className="text-xs text-[#888] font-light">{t("Investiție inițială", "Initial investment")}</p>
              </div>
            </div>
            <p className="text-lg font-light text-[#0D2E2B] shrink-0">{fmt(results.implementationCost)} EUR</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="grid gap-3 md:grid-cols-3">
        {timeline.map((item) => (
          <div key={item.label} className="rounded-[2px] p-6 text-center" style={{ backgroundColor: item.bg }}>
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: item.text }}>{item.label}</p>
            <p className="text-2xl font-light leading-tight" style={{ color: item.bg === "#0D2E2B" ? "#fff" : "#0D2E2B" }}>
              {fmt(item.value)} EUR
            </p>
            <p className="text-xs font-light mt-1" style={{ color: item.text }}>{t("economii cumulate", "cumulative savings")}</p>
            <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: item.bg === "#0D2E2B" ? "rgba(255,255,255,0.12)" : "#0D2E2B14" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(item.value / (results.totalAnnualSavings * 5.8)) * 100}%`, backgroundColor: item.bar }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-[#F5F4F0] rounded-[2px] p-6 border border-[#0D2E2B]/8 print-hide">
        <p className="text-base font-light text-[#0D2E2B] mb-1">{t("Vrei o propunere detaliată?", "Want a detailed proposal?")}</p>
        <p className="text-sm text-[#888] font-light mb-5">{t("Specialiștii noștri pot analiza clădirea ta și furniza un raport complet de fezabilitate BMS.", "Our specialists can assess your building and provide a full BMS feasibility report.")}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/contact"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#0D2E2B] text-white text-sm font-semibold px-6 py-3.5 rounded-[2px] hover:bg-[#1F6B4A] transition-colors"
          >
            <FileText className="h-4 w-4" />
            {t("Solicită propunere detaliată", "Request a Detailed Proposal")}
          </Link>
          <Link
            href="/contact"
            className="flex-1 inline-flex items-center justify-center gap-2 border border-[#0D2E2B]/20 text-[#0D2E2B] text-sm font-semibold px-6 py-3.5 rounded-[2px] hover:bg-[#0D2E2B]/5 transition-colors"
          >
            <Phone className="h-4 w-4" />
            {t("Programează o discuție", "Schedule a Call")}
          </Link>
        </div>

        {/* Report actions: download / share / copy link */}
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 inline-flex items-center justify-center gap-2 border border-[#0D2E2B]/20 text-[#0D2E2B] text-sm font-semibold px-6 py-3.5 rounded-[2px] hover:bg-[#0D2E2B]/5 transition-colors"
          >
            <Download className="h-4 w-4" />
            {t("Descarcă PDF", "Download PDF")}
          </button>
          <button
            type="button"
            onClick={() => setShareOpen((v) => !v)}
            aria-expanded={shareOpen}
            className="flex-1 inline-flex items-center justify-center gap-2 border border-[#0D2E2B]/20 text-[#0D2E2B] text-sm font-semibold px-6 py-3.5 rounded-[2px] hover:bg-[#0D2E2B]/5 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            {t("Distribuie", "Share")}
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 inline-flex items-center justify-center gap-2 border border-[#0D2E2B]/20 text-[#0D2E2B] text-sm font-semibold px-6 py-3.5 rounded-[2px] hover:bg-[#0D2E2B]/5 transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-[#1F6B4A]" /> : <Link2 className="h-4 w-4" />}
            {copied ? t("Copiat!", "Copied!") : t("Copiază link", "Copy Link")}
          </button>
        </div>

        {shareOpen && (
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${shareText()} ${shareUrl()}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 border border-[#0D2E2B]/20 text-[#0D2E2B] text-sm font-semibold px-6 py-3.5 rounded-[2px] hover:bg-[#0D2E2B]/5 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent(t("Analiza ROI pentru un sistem BMS", "ROI analysis for a BMS system"))}&body=${encodeURIComponent(`${shareText()}\n${shareUrl()}`)}`}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-[#0D2E2B]/20 text-[#0D2E2B] text-sm font-semibold px-6 py-3.5 rounded-[2px] hover:bg-[#0D2E2B]/5 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Email
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 border border-[#0D2E2B]/20 text-[#0D2E2B] text-sm font-semibold px-6 py-3.5 rounded-[2px] hover:bg-[#0D2E2B]/5 transition-colors"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalculatorROIPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [results, setResults] = useState<ROIResults | null>(null)
  const { t, lang } = useLanguage()

  const stepLabels = lang === "ro"
    ? ["Industrie", "Situație", "Provocări", "Mentenanță", "Obiective", "Preferințe"]
    : ["Industry", "Situation", "Challenges", "Maintenance", "Goals", "Preferences"]

  const onInputChange = (field: keyof FormData, value: number | string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }
  const onArrayToggle = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const arr = prev[field] as string[]
      return { ...prev, [field]: arr.includes(value) ? arr.filter((i) => i !== value) : [...arr, value] }
    })
  }
  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.industry !== ""
      case 2: return formData.annualEnergyCost > 0 && formData.buildingSize > 0
      case 3: return true
      case 4: return formData.maintenanceBudget > 0
      case 5: return formData.selectedGoals.length > 0
      case 6: return true
      default: return true
    }
  }
  const handleNext = () => {
    if (currentStep === TOTAL_STEPS) {
      setResults(calculateROI(formData))
    }
    setCurrentStep((p) => Math.min(p + 1, TOTAL_STEPS + 1))
  }
  const handleBack = () => setCurrentStep((p) => Math.max(p - 1, 1))
  const handleReset = () => {
    setCurrentStep(1)
    setFormData(initialFormData)
    setResults(null)
  }

  const accent = formData.industry ? industryAccent[formData.industry] : null
  const progressPercent = ((currentStep - 1) / TOTAL_STEPS) * 100

  return (
    <main className="min-h-screen bg-[#F5F4F0]">
      {/* Hero */}
      <section className="bg-[#07201C] pt-12 pb-10 relative overflow-hidden">
        {/* Progress stripe */}
        <div
          className="absolute bottom-0 left-0 h-[3px] transition-all duration-500"
          style={{ width: `${progressPercent}%`, backgroundColor: accent?.bg ?? "#1F6B4A" }}
        />
        <div className="max-w-4xl mx-auto px-6 md:px-8 relative z-10">
          <p className="text-xs text-[#C8E6C9] font-semibold tracking-widest uppercase mb-3">• Calculator ROI</p>
          <h1 className="text-3xl md:text-5xl font-light text-white leading-tight tracking-tighter mb-3 text-balance">
            {t("Cât poți economisi cu un BMS?", "How much could you save with a BMS?")}
          </h1>
          <p className="text-white/50 font-light text-base max-w-xl leading-relaxed">
            {t("Completează cei 6 pași și primești o estimare personalizată bazată pe tipul și dimensiunea clădirii tale.", "Complete 6 steps and receive a personalised estimate based on your building type and size.")}
          </p>
        </div>
      </section>

      {/* Wizard */}
      <section className="py-10">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          {/* Progress bar — only visible on steps 1-6 */}
          {currentStep <= TOTAL_STEPS && (
            <div className="bg-white rounded-[2px] p-5 mb-5 border border-[#0D2E2B]/10">
              <ProgressBar currentStep={currentStep} accent={accent} />
            </div>
          )}

          {/* Step content */}
          <div className="bg-white rounded-[2px] p-6 md:p-10 border border-[#0D2E2B]/10 min-h-[400px]">
            {currentStep === 1 && <IndustrySelect formData={formData} onSelect={(id) => setFormData((p) => ({ ...p, industry: id }))} />}
            {currentStep === 2 && <CurrentSituation formData={formData} onInputChange={onInputChange} />}
            {currentStep === 3 && <PainPoints formData={formData} onInputChange={onInputChange} onArrayToggle={onArrayToggle} />}
            {currentStep === 4 && <MaintenanceData formData={formData} onInputChange={onInputChange} />}
            {currentStep === 5 && <GoalsSelection formData={formData} onArrayToggle={onArrayToggle} />}
            {currentStep === 6 && <ImplementationPrefs formData={formData} onInputChange={onInputChange} />}
            {currentStep === 7 && results && <ResultsReport results={results} formData={formData} onReset={handleReset} />}
          </div>

          {/* Navigation — hidden on results */}
          {currentStep <= TOTAL_STEPS && (
            <div className="flex items-center justify-between mt-5">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#888] hover:text-[#0D2E2B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-4 py-2.5 rounded-[2px] hover:bg-[#0D2E2B]/5"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("Înapoi", "Back")}
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#888] hidden sm:block">
                  {t("Pasul", "Step")} {currentStep} {t("din", "of")} {TOTAL_STEPS}
                </span>
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-[2px] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                  style={{
                    backgroundColor: accent ? accent.bg : "#0D2E2B",
                    color: "#fff",
                  }}
                >
                  {currentStep === TOTAL_STEPS ? t("Calculează ROI", "Calculate ROI") : t("Continuă", "Continue")}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
