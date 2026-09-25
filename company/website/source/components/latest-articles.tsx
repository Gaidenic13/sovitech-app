"use client"

import Image from "next/image"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

// "Latest articles" 4-up grid — same section as the resources page, reused on
// the homepage above the footer. Photos are placeholders.

type Article = {
  categoryRo: string
  categoryEn: string
  titleRo: string
  titleEn: string
  dateRo: string
  dateEn: string
  readRo: string
  readEn: string
  href: string
  image: string
  badgeBg: string
  badgeText: string
}

const articles: Article[] = [
  {
    categoryRo: "Studiu de caz", categoryEn: "Case Study",
    titleRo: "Cum a redus Therme Bucuresti costurile cu 38%", titleEn: "How Therme Bucharest cut costs by 38%",
    dateRo: "20 DEC 2025", dateEn: "DEC 20, 2025", readRo: "8 MIN CITIRE", readEn: "8 MIN READ",
    href: "/resurse/studii-de-caz/therme-bucuresti", image: "/placeholder.svg",
    badgeBg: "#C8E6C9", badgeText: "#1F6B4A",
  },
  {
    categoryRo: "Studiu de caz", categoryEn: "Case Study",
    titleRo: "Radisson Blu Bucuresti: automatizare hotel 5 stele", titleEn: "Radisson Blu Bucharest: 5-star hotel automation",
    dateRo: "5 DEC 2025", dateEn: "DEC 5, 2025", readRo: "7 MIN CITIRE", readEn: "7 MIN READ",
    href: "/resurse/studii-de-caz/radisson-bucuresti", image: "/placeholder.svg",
    badgeBg: "#C8E6C9", badgeText: "#1F6B4A",
  },
  {
    categoryRo: "Raport de piata", categoryEn: "Market Report",
    titleRo: "Piata BMS din Romania: Tendinte si Previziuni 2026", titleEn: "The Romanian BMS Market: Trends and Forecasts 2026",
    dateRo: "10 DEC 2025", dateEn: "DEC 10, 2025", readRo: "10 MIN CITIRE", readEn: "10 MIN READ",
    href: "/resurse/raport-piata", image: "/placeholder.svg",
    badgeBg: "#C5C0F5", badgeText: "#5C5FD4",
  },
  {
    categoryRo: "Ghid tehnic", categoryEn: "Technical Guide",
    titleRo: "Optimizarea performantei hoteliere prin automatizare si management energetic", titleEn: "Optimising hotel performance through automation and energy management",
    dateRo: "20 FEB 2026", dateEn: "FEB 20, 2026", readRo: "18 MIN CITIRE", readEn: "18 MIN READ",
    href: "/resurse/articole/optimizare-hotel-bms", image: "/placeholder.svg",
    badgeBg: "#C8E6C9", badgeText: "#1F6B4A",
  },
]

export function LatestArticles() {
  const { t } = useLanguage()

  return (
    <section className="py-16 bg-[#F5F4F0]">
      <div className="container-site">
        <p className="section-label mb-8">• {t("ULTIMELE ARTICOLE", "LATEST ARTICLES")}</p>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {articles.map((a, i) => (
            <Link key={i} href={a.href} className="group flex flex-col">
              <div className="relative aspect-[16/10] rounded-[2px] overflow-hidden bg-[#0D2E2B]/5 border border-[#0D2E2B]/8 mb-4">
                <Image
                  src={a.image}
                  alt={t(a.titleRo, a.titleEn)}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <span
                className="inline-block text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                style={{ backgroundColor: a.badgeBg, color: a.badgeText }}
              >
                {t(a.categoryRo, a.categoryEn)}
              </span>
              <h3 className="font-light text-[#0D2E2B] leading-snug text-base mt-3 mb-3 group-hover:text-[#1F6B4A] transition-colors line-clamp-2 flex-1">
                {t(a.titleRo, a.titleEn)}
              </h3>
              <p className="text-[10px] text-[#888888] pt-3 border-t border-[#0D2E2B]/8">
                {t(a.dateRo, a.dateEn)} &nbsp;·&nbsp; {t(a.readRo, a.readEn)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
