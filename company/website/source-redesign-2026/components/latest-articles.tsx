"use client"

import Image from "next/image"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { badgeColorsFor, coverArticleCards } from "@/lib/article-cards"

// "Latest articles" 4-up grid on the homepage above the footer. Only
// cover-backed registry articles are listed; a different four than the
// BlogSlider higher up the page, so the two sections don't repeat.

export function LatestArticles() {
  const { t } = useLanguage()
  const cards = coverArticleCards().slice(4, 8)

  return (
    <section className="section-m bg-[#F5F4F0]">
      <div className="container-site">
        <p className="section-label mb-8">• {t("ULTIMELE ARTICOLE", "LATEST ARTICLES")}</p>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((a) => {
            const category = t(a.categoryRo, a.categoryEn)
            const colors = badgeColorsFor(category)
            return (
              <Link key={a.slug} href={a.href} className="group flex flex-col">
                {a.image && (
                  <div
                    className="relative aspect-[16/10] rounded-[2px] overflow-hidden border border-[#0D2E2B]/8 mb-4"
                    style={{ backgroundColor: a.imageBg }}
                  >
                    <div className="absolute inset-[10%]">
                      <Image
                        src={a.image}
                        alt={t(a.titleRo, a.titleEn)}
                        fill
                        className="object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  </div>
                )}
                <span
                  className="inline-block self-start text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {category}
                </span>
                <h3 className="font-light text-[#0D2E2B] leading-snug text-base mt-3 mb-3 group-hover:text-[#1F6B4A] transition-colors line-clamp-2 flex-1">
                  {t(a.titleRo, a.titleEn)}
                </h3>
                <p className="text-[10px] text-[#888888] pt-3 border-t border-[#0D2E2B]/8">
                  {t(a.dateRo, a.dateEn)} &nbsp;·&nbsp; {t(a.readRo, a.readEn)}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
