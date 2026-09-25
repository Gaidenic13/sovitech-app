import type { MetadataRoute } from "next"
import { products } from "@/lib/product-data"

const BASE = "https://sovitech-website-gaidenic.vercel.app"

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, priority: 1.0, changeFrequency: "monthly" },
    { url: `${BASE}/servicii`, priority: 0.9, changeFrequency: "monthly" },
    { url: `${BASE}/produse`, priority: 0.9, changeFrequency: "monthly" },
    { url: `${BASE}/sectoare`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${BASE}/contact`, priority: 0.8, changeFrequency: "yearly" },
    { url: `${BASE}/cerere-oferta`, priority: 0.8, changeFrequency: "yearly" },
    { url: `${BASE}/calculator-roi`, priority: 0.7, changeFrequency: "yearly" },
    { url: `${BASE}/resurse`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE}/resurse/referinte`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE}/resurse/studii-de-caz/therme-bucuresti`, priority: 0.6, changeFrequency: "yearly" },
    { url: `${BASE}/resurse/studii-de-caz/radisson-bucuresti`, priority: 0.6, changeFrequency: "yearly" },
    { url: `${BASE}/servicii/proiectare`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE}/servicii/executie`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE}/servicii/integrare`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE}/servicii/mentenanta`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE}/sectoare/civil`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE}/sectoare/medical`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE}/sectoare/retail`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE}/sectoare/horeca`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE}/sectoare/industrial`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE}/sectoare/educational`, priority: 0.6, changeFrequency: "monthly" },
  ]

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE}/produse/${p.id}`,
    priority: 0.8,
    changeFrequency: "monthly",
  }))

  return [...staticRoutes, ...productRoutes]
}
