import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Proiectare BMS: lista de puncte, caiet de sarcini | Sovitech Control",
  description:
    "Proiectare de automatizari si BMS: schema functionala, lista de puncte, caiet de sarcini, scheme de tablou si specificatie de echipamente. 3-8 saptamani.",
  alternates: { canonical: "/servicii/proiectare-automatizari-bms" },
}

export default function ProiectareLayout({ children }: { children: React.ReactNode }) {
  return children
}
