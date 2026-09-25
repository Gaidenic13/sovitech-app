import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Intretinere BMS: contract, timpi de raspuns, 4-7% din valoarea sistemului pe an | Sovitech",
  description:
    "Contract de intretinere BMS pe trei niveluri: verificari planificate, interventii la solicitare, timpi de raspuns pe severitate. 4-7% de baza, 7-12% extins.",
  alternates: { canonical: "/servicii/intretinere-sisteme-bms" },
}

export default function IntretinereLayout({ children }: { children: React.ReactNode }) {
  return children
}
