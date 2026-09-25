import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { EntryShell } from "@/components/entry-shell"
import { getEntry, publishedIn } from "@/lib/site-routes"

// Aliases (calculator-economie-energie-bms) never reach this route — they are
// resolved by a redirect in next.config before rendering.
export const dynamicParams = false

export async function generateStaticParams() {
  return publishedIn("instrumente").map((e) => ({ slug: e.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const entry = getEntry("instrumente", slug)
  if (!entry) return {}

  return {
    title: `${entry.titleRo} | Sovitech Control`,
    description: entry.descRo,
    alternates: { canonical: `/instrumente/${slug}` },
  }
}

export default async function ToolEntryRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const entry = getEntry("instrumente", slug)
  if (!entry || entry.status !== "published") notFound()

  return <EntryShell entry={entry} />
}
