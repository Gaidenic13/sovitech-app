"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { coverFor } from "@/lib/article-covers"
import { categories, clustersFor, getEntry, hrefFor, type RouteEntry } from "@/lib/site-routes"
import { HeroField } from "@/components/hero-field"

// Frame for a guide, article or tool page: breadcrumb, title, lead, then the
// ported body, then the pillar/cluster cross-links generated from the registry.
//
// The article port supplies `children`. Everything around it — breadcrumb,
// pillar link, sibling list — is derived, so a ported article never hard-codes
// a navigation link that could go stale.

export function EntryShell({ entry, children }: { entry: RouteEntry; children?: ReactNode }) {
  const { t } = useLanguage()

  const pillar =
    entry.pillar && entry.pillarSection ? getEntry(entry.pillarSection, entry.pillar) : undefined
  const clusters = entry.section === "ghid" ? clustersFor(entry.slug) : []

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <section className="bg-[#07201C] section-l relative overflow-hidden">
        <HeroField />
        <div className="container-site relative z-10">
          {entry.category && (
            <p className="text-sm font-semibold tracking-wider uppercase mb-3 text-[#C8E6C9]">
              • {t(categories[entry.category].ro, categories[entry.category].en)}
            </p>
          )}
          <h1 className="text-4xl md:text-6xl font-light text-white tracking-tighter max-w-4xl">
            {t(entry.titleRo, entry.titleEn)}
          </h1>
          <p className="text-lg text-white/60 font-light mt-5 max-w-2xl leading-relaxed">
            {t(entry.descRo, entry.descEn)}
          </p>

          {pillar && pillar.status !== "planned" && (
            <Link
              href={hrefFor(pillar)}
              className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#C8E6C9] hover:gap-3 transition-all"
            >
              {t("Ghidul complet:", "Full guide:")} {t(pillar.titleRo, pillar.titleEn)}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      {children}

      {clusters.length > 0 && (
        <section className="section-l">
          <div className="container-site">
            <p className="section-label mb-5">• {t("Articole din acest grup", "Articles in this group")}</p>
            <ul className="divide-y divide-[#0D2E2B]/8 border-t border-[#0D2E2B]/8">
              {clusters.map((c) => (
                <li key={c.slug} className="py-4">
                  {c.status === "planned" ? (
                    <span className="text-base font-light text-[#888888]">
                      {t(c.titleRo, c.titleEn)}
                    </span>
                  ) : (
                    <Link
                      href={hrefFor(c)}
                      className="group flex items-center gap-4 text-base font-light text-[#0D2E2B]"
                    >
                      {coverFor(c.slug) && (
                        <span className="hidden sm:block h-12 w-20 shrink-0 overflow-hidden rounded-[2px] border border-[#0D2E2B]/8">
                          <img src={coverFor(c.slug)} alt="" className="h-full w-full object-cover" />
                        </span>
                      )}
                      <span className="inline-flex items-center gap-2">
                        {t(c.titleRo, c.titleEn)}
                        <ArrowRight className="h-4 w-4 text-[#1F6B4A] transition-transform duration-150 group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
