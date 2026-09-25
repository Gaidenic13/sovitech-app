"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { HeroField } from "@/components/hero-field"

// Opening section shared by every /servicii/* page.
//
// The four service pages were built at different times and had drifted into two
// different openings: two carried the dark hero, two started straight into the
// sidebar grid on a light background. Keeping the markup here rather than
// copied four times means the next service page cannot drift again.

export function ServiceHero({
  titleRo,
  titleEn,
  leadRo,
  leadEn,
}: {
  titleRo: string
  titleEn: string
  leadRo: string
  leadEn: string
}) {
  const { t } = useLanguage()

  return (
    <section className="bg-[#07201C] section-m relative overflow-hidden">
      <HeroField />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fingerprint-59QWj1Ik1Fd1hqzZduTrEqLz2j557z.svg"
          alt=""
          className="h-[400px] w-auto"
        />
      </div>

      <div className="container-site relative z-10">
        <nav className="mb-6">
          <ol className="flex flex-wrap items-center gap-2 text-xs text-white/30">
            <li>
              <Link href="/" className="hover:text-white/60 transition-colors duration-300">
                {t("Acasă", "Home")}
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/servicii" className="hover:text-white/60 transition-colors duration-300">
                {t("Servicii", "Services")}
              </Link>
            </li>
            <li>/</li>
            <li className="text-white/60">{t(titleRo, titleEn)}</li>
          </ol>
        </nav>

        <p className="text-xs text-[#C8E6C9] font-semibold tracking-widest uppercase mb-3">
          {t("• Servicii BMS", "• BMS Services")}
        </p>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white leading-tight tracking-tighter mb-4">
          {t(titleRo, titleEn)}
        </h1>

        <p className="text-white/60 font-light text-lg max-w-2xl leading-relaxed">
          {t(leadRo, leadEn)}
        </p>
      </div>
    </section>
  )
}
