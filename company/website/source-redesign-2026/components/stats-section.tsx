"use client"

import { useEffect, useRef, useState } from "react"
import { useLanguage } from "@/lib/language-context"

interface Stat {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  suffixEn?: string
  separator?: boolean
  labelRo: string
  labelEn: string
}

// Figures follow the editorial register (doc 12, Variant A): every percentage
// carries its domain in the label, measured bands only — no bare superlatives.
const stats: Stat[] = [
  {
    value: 250000,
    suffix: "+",
    separator: true,
    labelRo: "mp suprafață automatizată în portofoliul de proiecte",
    labelEn: "sqm automated area across our project portfolio",
  },
  {
    value: 15,
    prefix: "5-",
    suffix: "%",
    labelRo: "reducere a consumului total al clădirii, documentată în studii independente",
    labelEn: "reduction in whole-building consumption, documented in independent studies",
  },
  {
    value: 30,
    suffix: "+",
    labelRo: "proiecte finalizate cu succes",
    labelEn: "successfully completed projects",
  },
  {
    value: 3,
    prefix: "1-",
    suffix: " ani",
    suffixEn: " yrs",
    labelRo: "amortizare pentru optimizarea unui sistem existent",
    labelEn: "payback when optimising an existing system",
  },
  {
    value: 15,
    suffix: "+",
    labelRo: "ani experiență în automatizare",
    labelEn: "years of experience in automation",
  },
]

function formatNumber(val: number, stat: Stat, lang: "ro" | "en" = "ro"): string {
  const fixed = stat.decimals !== undefined ? val.toFixed(stat.decimals) : Math.round(val).toString()
  const parts = fixed.split(".")
  if (stat.separator) {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }
  const formatted = parts.join(".")
  const suffix = lang === "en" && stat.suffixEn !== undefined ? stat.suffixEn : (stat.suffix ?? "")
  return `${stat.prefix ?? ""}${formatted}${suffix}`
}

function useCountUp(target: number, duration: number, started: boolean, decimals = 0) {
  // Initialised at the target so the prerendered HTML shows the real figure;
  // the animation resets to 0 and counts up only once the observer fires.
  const [current, setCurrent] = useState(target)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (!started) return
    setCurrent(0)
    const ease = (t: number) => 1 - Math.pow(1 - t, 4)
    const tick = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const value = ease(progress) * target
      setCurrent(parseFloat(value.toFixed(decimals)))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setCurrent(target)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [started, target, duration, decimals])

  return current
}

function StatCell({ stat, started, lang, size = "lg" }: { stat: Stat; started: boolean; lang: "ro" | "en"; size?: "xl" | "lg" }) {
  const val = useCountUp(stat.value, 600, started, stat.decimals ?? 0)
  const display = formatNumber(val, stat, lang)
  const textSize = size === "xl" ? "text-6xl sm:text-7xl md:text-8xl" : "text-5xl sm:text-6xl md:text-7xl"

  return (
    <div>
      <span className={`font-light tabular-nums leading-none ${textSize}`} style={{ color: "#C8E6C9" }}>
        {display}
      </span>
      <p className="text-sm font-light mt-3 leading-snug max-w-[240px] text-white/60">
        {lang === "ro" ? stat.labelRo : stat.labelEn}
      </p>
    </div>
  )
}

export function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [started, setStarted] = useState(false)
  const { lang, t } = useLanguage()

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect() } },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="bg-[#07201C] section-xl">
      <div className="container-site">
        <div className="grid lg:grid-cols-[340px_1fr] gap-12 lg:gap-20">
          {/* Left — label, heading, description */}
          <div>
            <p className="text-sm font-semibold mb-4 tracking-wider uppercase text-[#C8E6C9]">
              • {t("În cifre", "By the numbers")}
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light mb-6 tracking-tighter text-white">
              {t("Impact măsurabil", "Measurable impact")}
            </h2>
            <p className="text-base font-light leading-relaxed text-white/60 max-w-sm">
              {t(
                "Cifrele din spatele fiecărui proiect BMS pe care l-am livrat, verificate și actualizate constant.",
                "The numbers behind every BMS project we've delivered, verified and continuously updated.",
              )}
            </p>
          </div>

          {/* Right — hero stat, then a 2×2 grid, all sharing one consistent style */}
          <div className="divide-y divide-white/10 border-t border-white/10">
            <div className="section-s">
              <StatCell stat={stats[0]} started={started} lang={lang} size="xl" />
            </div>
            <div className="grid grid-cols-2 gap-x-12 section-s">
              <StatCell stat={stats[1]} started={started} lang={lang} />
              <StatCell stat={stats[2]} started={started} lang={lang} />
            </div>
            <div className="grid grid-cols-2 gap-x-12 section-s">
              <StatCell stat={stats[3]} started={started} lang={lang} />
              <StatCell stat={stats[4]} started={started} lang={lang} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
