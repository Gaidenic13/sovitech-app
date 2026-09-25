import type { ComponentType } from "react"

// Registry of ported article bodies, keyed by slug. Each entry file lives next
// to this one (components/articles/<slug>.tsx) and exports:
//   default        — the article body, a server component of semantic HTML
//                    wrapped in <ArticleProse>
//   meta           — title tag + meta description from the doc's Part A, verbatim
//   faq            — the FAQ pairs, feeding FAQPage JSON-LD
// The /ghid/[slug] and /resurse/[slug] routes look bodies up here; a registry
// entry flipped to "published" without a body here fails the build loudly.

export type ArticleFaq = { q: string; a: string }

export type ArticleMeta = {
  /** Title tag from Part A, character-counted there — used verbatim. */
  title: string
  /** Meta description from Part A — used verbatim. */
  description: string
  datePublished: string // ISO date
  dateModified: string // ISO date, the legal-verification date
}

export type ArticleEntry = {
  Body: ComponentType
  meta: ArticleMeta
  faq: ArticleFaq[]
}

import a01, { meta as m01, faq as f01 } from "./sisteme-bms-cladiri"
import a02, { meta as m02, faq as f02 } from "./obligatie-bacs-legea-372-2005"
import a03, { meta as m03, faq as f03 } from "./scada-vs-bms"
import a04, { meta as m04, faq as f04 } from "./cost-sistem-bms"
import a05, { meta as m05, faq as f05 } from "./caiet-de-sarcini-bms"
import a06, { meta as m06, faq as f06 } from "./epbd-2024-romania"
import a07, { meta as m07, faq as f07 } from "./ce-este-un-sistem-bms"
import a08, { meta as m08, faq as f08 } from "./kpi-performanta-cladire"
import a09, { meta as m09, faq as f09 } from "./date-esg-cladiri"
import a10, { meta as m10, faq as f10 } from "./monitorizare-calitate-aer-epbd"

export const articles: Record<string, ArticleEntry> = {
  "sisteme-bms-cladiri": { Body: a01, meta: m01, faq: f01 },
  "obligatie-bacs-legea-372-2005": { Body: a02, meta: m02, faq: f02 },
  "scada-vs-bms": { Body: a03, meta: m03, faq: f03 },
  "cost-sistem-bms": { Body: a04, meta: m04, faq: f04 },
  "caiet-de-sarcini-bms": { Body: a05, meta: m05, faq: f05 },
  "epbd-2024-romania": { Body: a06, meta: m06, faq: f06 },
  "ce-este-un-sistem-bms": { Body: a07, meta: m07, faq: f07 },
  "kpi-performanta-cladire": { Body: a08, meta: m08, faq: f08 },
  "date-esg-cladiri": { Body: a09, meta: m09, faq: f09 },
  "monitorizare-calitate-aer-epbd": { Body: a10, meta: m10, faq: f10 },
}

export function getArticle(slug: string): ArticleEntry | undefined {
  return articles[slug]
}
