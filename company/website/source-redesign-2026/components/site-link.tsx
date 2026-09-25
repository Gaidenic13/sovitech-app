"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { getEntry, hrefFor, type Section } from "@/lib/site-routes"

// Links that survive an unfinished site.
//
// Ported articles cross-reference pages that are not written yet — A09 alone
// points at seven of them. Rather than emit a dead link or strip the reference
// during the port, `SiteLink` consults the route registry: published and alias
// targets become real links, planned ones render as plain text carrying the
// same words. When the target is published later, every reference to it turns
// into a link with no edit to any article.

export function SiteLink({
  section,
  slug,
  children,
  className,
}: {
  section: Section
  slug: string
  children: ReactNode
  className?: string
}) {
  const entry = getEntry(section, slug)

  if (!entry) {
    // A typo in a slug should be loud in development and harmless in production.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[SiteLink] unknown route: ${section}/${slug}`)
    }
    return <span className={className}>{children}</span>
  }

  if (entry.status === "planned") {
    return <span className={className}>{children}</span>
  }

  return (
    <Link href={hrefFor(entry)} className={className}>
      {children}
    </Link>
  )
}
