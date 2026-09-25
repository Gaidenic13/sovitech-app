import { notFound } from "next/navigation"
import { getSectorBySlug, sectors } from "@/lib/sector-data"
import { SectorPageClient } from "./sector-client"

export async function generateStaticParams() {
  return sectors.map((s) => ({ sector: s.slug }))
}

export default async function SectorPage({
  params,
}: {
  params: Promise<{ sector: string }>
}) {
  const { sector: slug } = await params
  if (!getSectorBySlug(slug)) notFound()

  // rendering happens client-side so the page can react to the RO/EN switcher
  return <SectorPageClient slug={slug} />
}
