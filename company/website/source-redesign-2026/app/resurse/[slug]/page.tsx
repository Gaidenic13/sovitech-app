import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArticleJsonLd } from "@/components/article-jsonld"
import { ArticleLayout } from "@/components/article-layout"
import { getArticle } from "@/components/articles/index"
import { CategoryArchive } from "@/components/category-archive"
import { EntryShell } from "@/components/entry-shell"
import { coverFor } from "@/lib/article-covers"
import { getEntry, publishedIn } from "@/lib/site-routes"

// Serves two kinds of registry entries: category archives (listings) and
// cluster articles (EntryShell + ported body). Static children of /resurse
// (articole, studii-de-caz, raport-piata) take precedence over this segment.
export const dynamicParams = false

export async function generateStaticParams() {
  return publishedIn("resurse").map((e) => ({ slug: e.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const entry = getEntry("resurse", slug)
  if (!entry) return {}

  // Ported articles carry their Part A title tag and meta description verbatim.
  const article = getArticle(slug)
  const cover = coverFor(slug)
  if (article?.meta.title) {
    return {
      title: article.meta.title,
      description: article.meta.description,
      alternates: { canonical: `/resurse/${slug}` },
      ...(cover && {
        openGraph: { images: [`https://sovitech-website-gaidenic.vercel.app${cover}`], type: "article" },
        twitter: { card: "summary_large_image" as const },
      }),
    }
  }
  return {
    title: `${entry.titleRo} | Sovitech Control`,
    description: entry.descRo,
    alternates: { canonical: `/resurse/${slug}` },
  }
}

export default async function ResurseEntryRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const entry = getEntry("resurse", slug)
  if (!entry || entry.status !== "published") notFound()

  if (entry.archive) return <CategoryArchive entry={entry} />

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
