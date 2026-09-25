import type { ArticleEntry } from "@/components/articles/index"
import { coverFor } from "@/lib/article-covers"
import { hrefFor, type RouteEntry } from "@/lib/site-routes"

const BASE = "https://sovitech-website-gaidenic.vercel.app"

// Article + BreadcrumbList + FAQPage for a published article. No Person node:
// per the editorial blockers, author schema waits for a real engineer's byline.
export function ArticleJsonLd({ entry, article }: { entry: RouteEntry; article: ArticleEntry }) {
  const url = `${BASE}${hrefFor(entry)}`
  const sectionName = entry.section === "ghid" ? "Ghiduri" : "Resurse"
  const cover = coverFor(entry.slug)

  const graph: Record<string, unknown>[] = [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline: entry.titleRo,
      description: article.meta.description,
      inLanguage: "ro",
      datePublished: article.meta.datePublished,
      dateModified: article.meta.dateModified,
      mainEntityOfPage: url,
      ...(cover && { image: `${BASE}${cover}` }),
      author: { "@type": "Organization", name: "Sovitech Control" },
      publisher: { "@type": "Organization", name: "Sovitech Control" },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Acasă", item: `${BASE}/` },
        { "@type": "ListItem", position: 2, name: sectionName, item: `${BASE}/${entry.section}` },
        { "@type": "ListItem", position: 3, name: entry.titleRo, item: url },
      ],
    },
  ]

  if (article.faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: article.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    })
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) }}
    />
  )
}
