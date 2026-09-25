import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Servicii BMS: proiectare, executie, integrare, mentenanta | Sovitech",
  description:
    "Sase servicii BMS: proiectare, executie, integrare KNX si Modbus, intretinere, modernizare, consultanta. Livrabile numite, criterii de receptie, exclusii.",
  alternates: { canonical: "/servicii" },
}

export default function ServiciiLayout({ children }: { children: React.ReactNode }) {
  return children
}
