import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { RolePage } from "@/components/role-page"
import { getEntry, personaBySlug, personaMeta, publishedIn } from "@/lib/site-routes"

export const dynamicParams = false

export async function generateStaticParams() {
  return publishedIn("pentru").map((e) => ({ slug: e.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const entry = getEntry("pentru", slug)
  const persona = personaBySlug(slug)
  if (!entry || !persona) return {}

  return {
    title: `${entry.titleRo} | Sovitech Control`,
    description: personaMeta[persona].questionRo,
    alternates: { canonical: `/pentru/${slug}` },
    // Indexed once the article clusters feeding this role are published.
    robots: { index: false, follow: true },
  }
}

export default async function RoleRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const persona = personaBySlug(slug)
  if (!persona) notFound()

  return <RolePage persona={persona} />
}
