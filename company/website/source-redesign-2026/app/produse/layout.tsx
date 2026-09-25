import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Produse SAUTER România | Catalog BMS | Sovitech Control",
  description:
    "Catalog complet de produse SAUTER pentru automatizarea clădirilor: controllere și PLC, senzori de presiune și ambient, actuatori și vane, panouri de operare, software BMS, gateway-uri și integrare. Partener autorizat SAUTER în România.",
  alternates: { canonical: "/produse" },
}

export default function ProduseLayout({ children }: { children: React.ReactNode }) {
  return children
}
