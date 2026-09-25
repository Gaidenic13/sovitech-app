import { coverBgFor, coverFor } from "./article-covers"
import { categories, hrefFor, publishedIn, type Category } from "./site-routes"

// Card-ready metadata for every published article. Titles and categories come
// from the route registry; dates are each article's datePublished and the read
// times are word count divided by 200 wpm.
//
// `image` is undefined while cover artwork is being reworked (see
// lib/article-covers.ts). Listings stay complete either way — every surface
// renders the cover frame only when there is an image to put in it.

export interface ArticleCard {
  slug: string
  href: string
  /** Cover path, or undefined when no artwork is set for this slug. */
  image?: string
  /** Cover artwork background, painted behind the inset image. */
  imageBg: string
  /** Registry category key, for filtering. */
  category?: Category
  titleRo: string
  titleEn: string
  descRo: string
  descEn: string
  categoryRo: string
  categoryEn: string
  /** datePublished, for sorting newest first. */
  iso: string
  dateRo: string
  dateEn: string
  readRo: string
  readEn: string
}

const info: Record<string, { iso: string; dateRo: string; dateEn: string; min: number }> = {
  "sisteme-bms-cladiri":            { iso: "2026-08-16", dateRo: "16 AUG 2026", dateEn: "AUG 16, 2026", min: 31 },
  "scada-vs-bms":                   { iso: "2026-08-16", dateRo: "16 AUG 2026", dateEn: "AUG 16, 2026", min: 17 },
  "cost-sistem-bms":                { iso: "2026-08-16", dateRo: "16 AUG 2026", dateEn: "AUG 16, 2026", min: 20 },
  "obligatie-bacs-legea-372-2005":  { iso: "2026-08-16", dateRo: "16 AUG 2026", dateEn: "AUG 16, 2026", min: 20 },
  "caiet-de-sarcini-bms":           { iso: "2026-08-17", dateRo: "17 AUG 2026", dateEn: "AUG 17, 2026", min: 20 },
  "ce-este-un-sistem-bms":          { iso: "2026-08-17", dateRo: "17 AUG 2026", dateEn: "AUG 17, 2026", min: 14 },
  "date-esg-cladiri":               { iso: "2026-08-17", dateRo: "17 AUG 2026", dateEn: "AUG 17, 2026", min: 22 },
  "epbd-2024-romania":              { iso: "2026-08-17", dateRo: "17 AUG 2026", dateEn: "AUG 17, 2026", min: 17 },
  "kpi-performanta-cladire":        { iso: "2026-08-17", dateRo: "17 AUG 2026", dateEn: "AUG 17, 2026", min: 16 },
  "monitorizare-calitate-aer-epbd": { iso: "2026-08-17", dateRo: "17 AUG 2026", dateEn: "AUG 17, 2026", min: 15 },
}

/** Every listed article, pillar guide first, in registry order. */
export function coverArticleCards(): ArticleCard[] {
  return [...publishedIn("ghid"), ...publishedIn("resurse")]
    .filter((e) => !e.archive && info[e.slug])
    .map((e) => {
      const i = info[e.slug]
      return {
        slug: e.slug,
        href: hrefFor(e),
        image: coverFor(e.slug),
        imageBg: coverBgFor(e.slug),
        category: e.category,
        titleRo: e.titleRo,
        titleEn: e.titleEn,
        descRo: e.descRo,
        descEn: e.descEn,
        categoryRo: e.category ? categories[e.category].ro : "Articol",
        categoryEn: e.category ? categories[e.category].en : "Article",
        iso: i?.iso ?? "",
        dateRo: i?.dateRo ?? "",
        dateEn: i?.dateEn ?? "",
        readRo: i ? `${i.min} MIN CITIRE` : "",
        readEn: i ? `${i.min} MIN READ` : "",
      }
    })
}

/** Badge colors per localized category name (RO or EN). */
export function badgeColorsFor(category: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    "Reglementări & Conformare":  { bg: "#C5C0F5", text: "#5C5FD4" },
    "Regulation & Compliance":    { bg: "#C5C0F5", text: "#5C5FD4" },
    "ESG, Energie & Raportare":   { bg: "#C8E6C9", text: "#1F6B4A" },
    "ESG, Energy & Reporting":    { bg: "#C8E6C9", text: "#1F6B4A" },
    "Performanța Clădirii":       { bg: "#E8E8C0", text: "#8B7B5C" },
    "Building Performance":       { bg: "#E8E8C0", text: "#8B7B5C" },
    "BMS, SCADA & Integrare":     { bg: "#C5C0F5", text: "#5C5FD4" },
    "BMS, SCADA & Integration":   { bg: "#C5C0F5", text: "#5C5FD4" },
    "Ghiduri pe Sectoare":        { bg: "#C8E6C9", text: "#1F6B4A" },
    "Sector Guides":              { bg: "#C8E6C9", text: "#1F6B4A" },
    "Modernizare & Retrofit":     { bg: "#E8C5B8", text: "#B14A36" },
    "Modernisation & Retrofit":   { bg: "#E8C5B8", text: "#B14A36" },
  }
  return map[category] ?? { bg: "#C8E6C9", text: "#1F6B4A" }
}
