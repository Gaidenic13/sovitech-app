"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { coverArticleCards } from "@/lib/article-cards"

// The first four cover-backed registry articles, on the pastel card cycle.
const cardBg = ["bg-[#C5C0F5]", "bg-[#E8C5B8]", "bg-[#E8E8C0]", "bg-[#C8E6C9]"]
const blogPosts = coverArticleCards()
  .slice(0, 4)
  .map((c, i) => ({
    id: c.slug,
    titleRo: c.titleRo,
    titleEn: c.titleEn,
    categoryRo: c.categoryRo,
    categoryEn: c.categoryEn,
    href: c.href,
    bgColor: cardBg[i % cardBg.length],
  }))

export function BlogSlider() {
  const [startIndex, setStartIndex] = useState(0)
  const { t } = useLanguage()
  const cardsPerView = 4

  const visiblePosts = blogPosts.slice(startIndex, startIndex + cardsPerView)
  const canGoPrevious = startIndex > 0
  const canGoNext = startIndex < blogPosts.length - cardsPerView

  return (
    <section className="bg-[#07201C] section-l">
      <div className="container-site">
        <p className="text-sm font-semibold tracking-wider uppercase mb-2 text-white/40">• {t("Educație", "Education")}</p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light mb-12 tracking-tighter text-white">
          {t("Resurse & Articole", "Resources & Articles")}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {visiblePosts.map((post) => (
            <Link
              key={post.id}
              href={post.href}
              className={`group relative rounded-[2px] overflow-hidden min-h-[300px] flex flex-col justify-end p-6 cursor-pointer ${post.bgColor}`}
            >
              <div className="absolute bottom-4 right-4 w-9 h-9 bg-[#07201C]/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <ArrowRight className="h-4 w-4 text-[#0D2E2B]" />
              </div>
              <div className="relative z-10">
                <h3 className="font-semibold text-[#0D2E2B] text-base leading-snug mb-1 transition-colors duration-150 group-hover:text-[#0D2E2B]/70">
                  {t(post.titleRo, post.titleEn)}
                </h3>
                <p className="text-sm text-[#0D2E2B]/70 font-light">
                  {t(post.categoryRo, post.categoryEn)}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {blogPosts.length > cardsPerView && (
          <div className="mt-12 flex items-center gap-4">
            <Button
              onClick={() => setStartIndex((p) => Math.max(0, p - 1))}
              disabled={!canGoPrevious}
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full border border-white/20 bg-transparent hover:bg-white/10 disabled:opacity-30 text-white"
              aria-label={t("Articole anterioare", "Previous articles")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.ceil(blogPosts.length / cardsPerView) }).map((_, index) => {
                const isActive = Math.floor(startIndex / cardsPerView) === index
                return (
                  <button
                    key={index}
                    onClick={() => setStartIndex(index * cardsPerView)}
                    className={`h-2 rounded-full transition-all ${isActive ? "w-8 bg-[#C8E6C9]" : "w-2 bg-white/30 hover:bg-white/50"}`}
                    aria-label={`${t("Pagina", "Page")} ${index + 1}`}
                  />
                )
              })}
            </div>
            <Button
              onClick={() => setStartIndex((p) => Math.min(blogPosts.length - cardsPerView, p + 1))}
              disabled={!canGoNext}
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full border border-white/20 bg-transparent hover:bg-white/10 disabled:opacity-30 text-white"
              aria-label={t("Articole următoare", "Next articles")}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}

        <div className="mt-8">
          <Link href="/resurse" className="inline-flex items-center gap-2 text-sm font-medium text-[#C8E6C9] hover:gap-3 transition-all">
            {t("Vezi toate resursele", "View all resources")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
