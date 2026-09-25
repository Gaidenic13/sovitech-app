import type { MetadataRoute } from "next"
import { products } from "@/lib/product-data"
import { hrefFor, publishedIn, type Section } from "@/lib/site-routes"

const BASE = "https://sovitech-website-gaidenic.vercel.app"

// Section pages come from the route registry rather than a hand-kept list, so a
// slug can never be published without appearing here — and a planned slug can
// never leak into the sitemap before its content exists.
const sectionPriority: Record<Section, number> = {
  ghid: 0.9,
  servicii: 0.8,
  expertiza: 0.7,
  resurse: 0.7,
  instrumente: 0.7,
  pentru: 0.5,
}

// Role hubs stay out until the article clusters that feed them are published;
// their pages carry a matching noindex.
const indexedSections: Section[] = ["ghid", "resurse", "instrumente", "expertiza", "servicii"]

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, priority: 1.0, changeFrequency: "monthly" },
    { url: `${BASE}/servicii`, priority: 0.9, changeFrequency: "monthly" },
    { url: `${BASE}/produse`, priority: 0.9, changeFrequency: "monthly" },
    { url: `${BASE}/expertiza`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${BASE}/contact`, priority: 0.8, changeFrequency: "yearly" },
    { url: `${BASE}/despre-noi`, priority: 0.7, changeFrequency: "yearly" },
    { url: `${BASE}/confidentialitate`, priority: 0.3, changeFrequency: "yearly" },
    { url: `${BASE}/termeni`, priority: 0.3, changeFrequency: "yearly" },
    { url: `${BASE}/cookies`, priority: 0.3, changeFrequency: "yearly" },
    { url: `${BASE}/cerere-oferta`, priority: 0.8, changeFrequency: "yearly" },
    { url: `${BASE}/calculator-roi`, priority: 0.7, changeFrequency: "yearly" },
    { url: `${BASE}/calculator-roi/metodologie`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE}/resurse`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE}/referinte`, priority: 0.7, changeFrequency: "monthly" },
    // Legacy case studies and pre-launch articles are unlisted until they
    // have real written content and covers.
  ]

  const registryRoutes: MetadataRoute.Sitemap = indexedSections.flatMap((section) =>
    publishedIn(section).map((entry) => ({
      url: `${BASE}${hrefFor(entry)}`,
      priority: sectionPriority[section],
      changeFrequency: "monthly" as const,
    })),
  )

  const guideHub: MetadataRoute.Sitemap =
    publishedIn("ghid").length > 0
      ? [{ url: `${BASE}/ghid`, priority: 0.8, changeFrequency: "monthly" }]
      : []

  const toolHub: MetadataRoute.Sitemap =
    publishedIn("instrumente").length > 0
      ? [{ url: `${BASE}/instrumente`, priority: 0.7, changeFrequency: "monthly" }]
      : []

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE}/produse/${p.id}`,
    priority: 0.8,
    changeFrequency: "monthly",
  }))

  return [...staticRoutes, ...guideHub, ...toolHub, ...registryRoutes, ...productRoutes]
}
