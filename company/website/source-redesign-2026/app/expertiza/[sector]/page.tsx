import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getSectorBySlug } from "@/lib/sector-data"
import { getEntry, publishedIn, sectorDataSlug } from "@/lib/site-routes"
import { SectorPageClient } from "./sector-client"

// The public URL and the sector-data key are deliberately different: the URL is
// the keyword the editorial plan targets ("cladiri-de-birouri"), the data key is
// the internal one ("civil"). `sectorDataSlug` is the only place they meet.

export async function generateStaticParams() {
  return publishedIn("expertiza").map((e) => ({ sector: e.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sector: string }>
}): Promise<Metadata> {
  const { sector } = await params
  const entry = getEntry("expertiza", sector)
  if (!entry) return {}

  return {
    title: `${entry.titleRo} | Sisteme BMS | Sovitech Control`,
    description: entry.descRo,
    alternates: { canonical: `/expertiza/${entry.slug}` },
  }
}

export default async function SectorPage({
  params,
}: {
  params: Promise<{ sector: string }>
}) {
  const { sector } = await params
  const dataSlug = sectorDataSlug(sector)
  if (!dataSlug || !getSectorBySlug(dataSlug)) notFound()

  // rendering happens client-side so the page can react to the RO/EN switcher
  return <SectorPageClient slug={dataSlug} />
}
