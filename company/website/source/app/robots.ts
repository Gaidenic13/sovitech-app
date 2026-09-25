import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://sovitech-website-gaidenic.vercel.app/sitemap.xml",
  }
}
