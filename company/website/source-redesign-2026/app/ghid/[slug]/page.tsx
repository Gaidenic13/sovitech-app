import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArticleJsonLd } from "@/components/article-jsonld"
import { ArticleLayout } from "@/components/article-layout"
import { getArticle } from "@/components/articles/index"
import { EntryShell } from "@/components/entry-shell"
import { coverFor } from "@/lib/article-covers"
import { getEntry, publishedIn } from "@/lib/site-routes"

// Pillar guides. Routes are generated only for entries the registry marks
// "published"; the body comes from components/articles by slug.
export const dynamicParams = false

export async function generateStaticParams() {
  return publishedIn("ghid").map((e) => ({ slug: e.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const entry = getEntry("ghid", slug)
  if (!entry) return {}

  const article = getArticle(slug)
  const cover = coverFor(slug)
  if (article?.meta.title) {
    return {
      title: article.meta.title,
      description: article.meta.description,
      alternates: { canonical: `/ghid/${slug}` },
      ...(cover && {
        openGraph: { images: [`https://sovitech-website-gaidenic.vercel.app${cover}`], type: "article" },
        twitter: { card: "summary_large_image" as const },
      }),
    }
  }
  return {
    title: `${entry.titleRo} | Sovitech Control`,
    description: entry.descRo,
    alternates: { canonical: `/ghid/${slug}` },
  }
}

export default async function GhidEntryRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const entry = getEntry("ghid", slug)
  if (!entry || entry.status !== "published") notFound()

  const article = getArticle(slug)
  return (
    <EntryShell entry={entry}>
      {article && (
        <>
          <ArticleJsonLd entry={entry} article={article} />
          <ArticleLayout
            entry={entry}
            published={article.meta.datePublished}
            modified={article.meta.dateModified}
          >
            <article.Body />
          </ArticleLayout>
        </>
      )}
    </EntryShell>
  )
}
