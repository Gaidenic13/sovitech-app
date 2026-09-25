import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Executie sisteme BMS: tablou, cablare, punere in functiune | Sovitech",
  description:
    "Executie completa de sisteme BMS: tablou de forta si automatizare, cablare, programe de control, interfata HMI, punere in functiune si documentatie As-built.",
  alternates: { canonical: "/servicii/executie-sisteme-bms" },
}

export default function ExecutieLayout({ children }: { children: React.ReactNode }) {
  return children
}
