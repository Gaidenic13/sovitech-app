"use client"

import { useState, type ReactNode } from "react"
import { Check, Link2, Share2 } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { coverFor } from "@/lib/article-covers"
import { categories, type RouteEntry } from "@/lib/site-routes"

// Editorial frame for a ported article: a sticky meta rail on the left
// (category, author, share controls), the article itself in a centered
// column, and a balancing column on the right so the text sits on the page
// axis. On small screens the rail collapses into a horizontal meta row.

function fmtDate(iso?: string): string | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split("-")
  return d && m && y ? `${d}.${m}.${y}` : iso
}

export function ArticleLayout({
  entry,
  published,
  modified,
  children,
}: {
  entry: RouteEntry
  published?: string
  modified?: string
  children: ReactNode
}) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  const cover = coverFor(entry.slug)
  const cat = entry.category ? categories[entry.category] : undefined
  const pub = fmtDate(published)
  const mod = fmtDate(modified)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable: nothing to signal */
    }
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url: window.location.href })
      } catch {
        /* user dismissed the sheet */
      }
    } else {
      copyLink()
    }
  }

  const railLabel = "text-[11px] font-semibold tracking-[0.14em] uppercase text-[#0D2E2B]/45 mb-3"
  const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-[2px] border border-[#0D2E2B]/15 text-[#0D2E2B]/70 transition-colors duration-150 hover:bg-[#0D2E2B]/5 hover:text-[#0D2E2B]"

  return (
    <section className="section-l">
      <div className="container-site">
        <div className="lg:grid lg:grid-cols-[190px_minmax(0,1fr)_190px] lg:gap-12">
          <aside className="mb-10 lg:mb-0">
            <div className="flex flex-row flex-wrap items-start gap-x-12 gap-y-8 lg:sticky lg:top-28 lg:flex-col lg:gap-9">
              {cat && (
                <div>
                  <p className={railLabel}>{t("Categorie", "Category")}</p>
                  <span className="inline-block rounded-[2px] bg-[#0D2E2B]/[0.06] px-3 py-1.5 text-xs font-medium text-[#0D2E2B]">
                    {t(cat.ro, cat.en)}
                  </span>
                </div>
              )}

              <div>
                <p className={railLabel}>{t("Scris de", "Written by")}</p>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#07201C] text-xs font-semibold text-[#C8E6C9]">
                    SC
                  </span>
                  <span>
                    <span className="block text-sm font-medium leading-tight text-[#0D2E2B]">
                      Sovitech Control
                    </span>
                    <span className="block text-xs text-[#0D2E2B]/50">
                      {t("Echipa de inginerie", "Engineering team")}
                    </span>
                  </span>
                </div>
              </div>

              <div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copyLink}
                    aria-label={t("Copiază linkul", "Copy link")}
                    className={iconBtn}
                  >
                    {copied ? <Check className="h-4 w-4 text-[#1F6B4A]" /> : <Link2 className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={share}
                    aria-label={t("Distribuie", "Share")}
                    className={iconBtn}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
                <p
                  className={`mt-2 text-xs text-[#1F6B4A] transition-opacity duration-200 ${copied ? "opacity-100" : "opacity-0"}`}
                  aria-hidden={!copied}
                >
                  {t("Link copiat", "Link copied")}
                </p>
              </div>
            </div>
          </aside>

          <div className="mx-auto w-full min-w-0 max-w-[720px]">
            {pub && (
              <p className="mb-6 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#0D2E2B]/45">
                {t("Publicat", "Published")} {pub}
                {mod && mod !== pub ? ` · ${t("Actualizat", "Updated")} ${mod}` : ""}
              </p>
            )}
            {cover && (
              <img
                src={cover}
                alt={entry.titleRo}
                className="mb-10 w-full rounded-[2px] border border-[#0D2E2B]/10"
              />
            )}
            {children}
          </div>

          <div className="hidden lg:block" aria-hidden />
        </div>
      </div>
    </section>
  )
}
