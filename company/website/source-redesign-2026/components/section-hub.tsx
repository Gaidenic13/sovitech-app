"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { coverBgFor, coverFor } from "@/lib/article-covers"
import { categories, hrefFor, type RouteEntry } from "@/lib/site-routes"
import { HeroField } from "@/components/hero-field"

// Shared index page for /ghid, /resurse, /instrumente and /pentru.
//
// Entries whose status is "planned" are shown but not linked. Listing them is
// deliberate: it tells a reader (and an editor) what the section will contain,
// and it makes the gap between plan and published visible instead of hiding it.

export function SectionHub({
  labelRo,
  labelEn,
  titleRo,
  titleEn,
  leadRo,
  leadEn,
  entries,
  showCategory = false,
}: {
  labelRo: string
  labelEn: string
  titleRo: string
  titleEn: string
  leadRo: string
  leadEn: string
  entries: RouteEntry[]
  showCategory?: boolean
}) {
  const { t } = useLanguage()

  const live = entries.filter((e) => e.status !== "planned")
  const planned = entries.filter((e) => e.status === "planned")

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <section className="bg-[#07201C] section-l relative overflow-hidden">
        <HeroField />
        <div className="container-site relative z-10">
          <p className="text-sm font-semibold tracking-wider uppercase mb-3 text-[#C8E6C9]">
            • {t(labelRo, labelEn)}
          </p>
          <h1 className="text-4xl md:text-6xl font-light text-white tracking-tighter max-w-3xl">
            {t(titleRo, titleEn)}
          </h1>
          <p className="text-lg text-white/60 font-light mt-5 max-w-2xl leading-relaxed">
            {t(leadRo, leadEn)}
          </p>
        </div>
      </section>

      <section className="section-l">
        <div className="container-site">
          {live.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((e) => (
                <Link
                  key={`${e.section}/${e.slug}`}
                  href={hrefFor(e)}
                  className="group flex flex-col justify-between overflow-hidden rounded-[2px] border border-[#0D2E2B]/8 bg-white transition-colors duration-300 hover:border-[#0D2E2B]/25"
                >
                  {coverFor(e.slug) && (
                    <div
                      className="aspect-[16/9] overflow-hidden border-b border-[#0D2E2B]/8 p-[10%]"
                      style={{ backgroundColor: coverBgFor(e.slug) }}
                    >
                      <img src={coverFor(e.slug)} alt="" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" />
                    </div>
                  )}
                  <div className="card-p pb-0">
                    {showCategory && e.category && (
                      <p className="section-label mb-3">
                        {t(categories[e.category].ro, categories[e.category].en)}
                      </p>
                    )}
                    <h2 className="text-lg font-light text-[#0D2E2B] tracking-tight">
                      {t(e.titleRo, e.titleEn)}
                    </h2>
                    <p className="text-sm text-[#888888] font-light leading-relaxed mt-3">
                      {t(e.descRo, e.descEn)}
                    </p>
                  </div>
                  <span className="card-p pt-5 inline-flex items-center gap-2 text-sm font-medium text-[#1F6B4A]">
                    {t("Deschide", "Open")}
                    <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          )}

          {planned.length > 0 && (
            <div className={live.length > 0 ? "mt-16" : ""}>
              <p className="section-label mb-4">• {t("În pregătire", "In preparation")}</p>
              <ul className="divide-y divide-[#0D2E2B]/8 border-t border-[#0D2E2B]/8">
                {planned.map((e) => (
                  <li
                    key={`${e.section}/${e.slug}`}
                    className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
                  >
                    <span className="text-base font-light text-[#0D2E2B]">
                      {t(e.titleRo, e.titleEn)}
                    </span>
                    <span className="text-sm text-[#888888] font-light sm:text-right sm:max-w-md">
                      {t(e.descRo, e.descEn)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
