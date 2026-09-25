import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Modernizare BMS: 40-60% din costul unui sistem nou | Sovitech",
  description:
    "Modernizarea unui sistem BMS costa 40-60% din pretul unui sistem nou, cu amortizare de 3-6 ani. Migrare pe etape, fara oprirea cladirii. Licente predate.",
  alternates: { canonical: "/servicii/modernizare-sisteme-de-automatizare-si-bms" },
}

export default function ModernizareLayout({ children }: { children: React.ReactNode }) {
  return children
}
