// Cover images for the first-wave articles, keyed by slug (files in
// /public/coperti, named after the slug they belong to). One map serves the
// article pages, the archive/hub cards and the og:image metadata, so a cover
// can never drift from its article.

// Each cover is 1920x1080 and carries the article's headline figure. A slug
// missing from this map simply renders without a cover: every surface guards
// on `coverFor`, so cards, article pages, og:image and JSON-LD all degrade
// cleanly rather than showing an empty frame.
const covers: Record<string, string> = {
  "sisteme-bms-cladiri": "/coperti/sisteme-bms-cladiri.jpg",
  "obligatie-bacs-legea-372-2005": "/coperti/obligatie-bacs-legea-372-2005.jpg",
  "scada-vs-bms": "/coperti/scada-vs-bms.jpg",
  "cost-sistem-bms": "/coperti/cost-sistem-bms.jpg",
  "caiet-de-sarcini-bms": "/coperti/caiet-de-sarcini-bms.jpg",
  "epbd-2024-romania": "/coperti/epbd-2024-romania.jpg",
  "ce-este-un-sistem-bms": "/coperti/ce-este-un-sistem-bms.jpg",
  "kpi-performanta-cladire": "/coperti/kpi-performanta-cladire.jpg",
  "date-esg-cladiri": "/coperti/date-esg-cladiri.jpg",
  "monitorizare-calitate-aer-epbd": "/coperti/monitorizare-calitate-aer-epbd.jpg",
}

/** Cover path for an article slug, or undefined when none exists. */
export function coverFor(slug: string): string | undefined {
  return covers[slug]
}

// Background color of each cover artwork. Card frames paint this behind the
// inset image so the 10% inner margin is indistinguishable from the cover's
// own background.
// Sampled from the artwork itself, so the inset frame is indistinguishable
// from the cover's own ground. Update alongside any new cover.
const coverBgs: Record<string, string> = {
  "sisteme-bms-cladiri": "#07201C",
  "obligatie-bacs-legea-372-2005": "#5C5FD4",
  "scada-vs-bms": "#C5C0F6",
  "cost-sistem-bms": "#07201C",
  "caiet-de-sarcini-bms": "#C8E6CA",
  "epbd-2024-romania": "#07201C",
  "ce-este-un-sistem-bms": "#5C5FD4",
  "kpi-performanta-cladire": "#07201C",
  "date-esg-cladiri": "#C5C0F6",
  "monitorizare-calitate-aer-epbd": "#C8E6CA",
}

/** Background color of a cover, for seamless inset framing. */
export function coverBgFor(slug: string): string {
  return coverBgs[slug] ?? "#0A231E"
}
