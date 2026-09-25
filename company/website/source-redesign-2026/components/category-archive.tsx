"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { coverBgFor, coverFor } from "@/lib/article-covers"
import { articlesInCategory, hrefFor, type RouteEntry } from "@/lib/site-routes"
import { HeroField } from "@/components/hero-field"

// Landing page for one editorial category (/resurse/<categorie>). These pages
// are the degradation target for links to not-yet-published articles (doc 15),
// so they exist and are useful from day one: published articles link, planned
// ones are listed as upcoming.
export function CategoryArchive({ entry }: { entry: RouteEntry }) {
  const { t } = useLanguage()
  const items = entry.category ? articlesInCategory(entry.category) : []
  const live = items.filter((i) => i.status === "published")
  const planned = items.filter((i) => i.status !== "published")

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <section className="bg-[#07201C] section-l relative overflow-hidden">
        <HeroField />
        <div className="container-site relative z-10">
          <Link href="/resurse" className="text-sm font-medium text-[#C8E6C9] hover:text-white transition-colors duration-300">
            ← {t("Toate resursele", "All resources")}
          </Link>
          <h1 className="text-4xl md:text-6xl font-light text-white tracking-tighter mt-6 max-w-3xl">
            {t(entry.titleRo, entry.titleEn)}
          </h1>
          <p className="text-lg text-white/60 font-light mt-5 max-w-2xl leading-relaxed">
            {t(entry.descRo, entry.descEn)}
          </p>
        </div>
      </section>

      <section className="section-l">
        <div className="container-site">
          {live.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              {live.map((a) => (
                <Link
                  key={a.slug}
                  href={hrefFor(a)}
                  className="group flex flex-col justify-between overflow-hidden rounded-[2px] border border-[#0D2E2B]/8 bg-white transition-colors duration-300 hover:border-[#0D2E2B]/25"
                >
                  {coverFor(a.slug) && (
                    <div
                      className="aspect-[16/9] overflow-hidden border-b border-[#0D2E2B]/8 p-[10%]"
                      style={{ backgroundColor: coverBgFor(a.slug) }}
                    >
                      <img src={coverFor(a.slug)} alt="" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" />
                    </div>
                  )}
                  <div className="card-p pb-0">
                    <h2 className="text-lg font-light text-[#0D2E2B] tracking-tight">{t(a.titleRo, a.titleEn)}</h2>
                    <p className="text-sm text-[#888888] font-light leading-relaxed mt-3">{t(a.descRo, a.descEn)}</p>
                  </div>
                  <span className="card-p pt-5 inline-flex items-center gap-2 text-sm font-medium text-[#1F6B4A]">
                    {t("Citește", "Read")}
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
                {planned.map((a) => (
                  <li key={a.slug} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
                    <span className="text-base font-light text-[#0D2E2B]">{t(a.titleRo, a.titleEn)}</span>
                    <span className="text-sm text-[#888888] font-light sm:text-right sm:max-w-md">{t(a.descRo, a.descEn)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-16 rounded-[2px] bg-[#0D2E2B] card-p-lg">
            <h2 className="text-2xl font-light text-white tracking-tight max-w-xl">
              {t(
                "Ai o întrebare din această zonă? Discut-o cu un inginer Sovitech.",
                "Have a question in this area? Talk it through with a Sovitech engineer.",
              )}
            </h2>
            <Link href="/contact" className="btn-sovitech-ghost mt-6 inline-flex">
              {t("Contactează-ne", "Contact us")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
