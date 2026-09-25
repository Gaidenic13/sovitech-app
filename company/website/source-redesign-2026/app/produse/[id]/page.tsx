import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { products, getProductById, articleCodes, categoryEn } from "@/lib/product-data"
import { ProductDetail } from "@/components/product-detail"

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const p = getProductById(id)
  if (!p) return {}

  const codes = articleCodes(p)
  const codesPreview = codes.slice(0, 3).join(", ")
  const description = `${p.shortDesc}${codesPreview ? ` Coduri: ${codesPreview}.` : ""}`.slice(0, 160)

  return {
    title: `${p.code} ${p.name} | SAUTER | Sovitech Control`,
    description,
    keywords: [
      ...codes,
      p.code,
      p.code.replace(/\s+/g, ""),
      p.name,
      ...(p.nameEn ? [p.nameEn] : []),
      p.familyTitle,
      ...(p.familyTitleEn ? [p.familyTitleEn] : []),
      p.category,
      categoryEn[p.category] ?? "",
      "SAUTER",
      "Sovitech",
      "BMS România",
    ].filter(Boolean),
    alternates: { canonical: `/produse/${p.id}` },
    openGraph: {
      title: `SAUTER ${p.code} ${p.name}`,
      description: p.shortDesc,
      images: p.image && p.image !== "/placeholder.svg" ? [p.image] : undefined,
      type: "website",
    },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = getProductById(id)
  if (!p) notFound()

  const codes = articleCodes(p)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `SAUTER ${p.code} ${p.name}`,
    ...(p.nameEn ? { alternateName: p.nameEn } : {}),
    ...(codes.length ? { sku: codes[0] } : {}),
    mpn: p.code,
    brand: { "@type": "Brand", name: "SAUTER" },
    manufacturer: { "@type": "Organization", name: "Fr. Sauter AG" },
    description: p.shortDesc,
    ...(p.image && p.image !== "/placeholder.svg" ? { image: p.image } : {}),
    category: p.category,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductDetail id={id} />
    </>
  )
}
