import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Consultanta BMS: compararea ofertelor si arhitectura | Sovitech",
  description:
    "Consultanta tehnica BMS fara achizitie de echipamente: comparare de oferte, verificarea pragului de 290 kW, arhitectura, caiet de sarcini. Raport in 10 zile.",
  alternates: { canonical: "/servicii/consultanta" },
}

export default function ConsultantaLayout({ children }: { children: React.ReactNode }) {
  return children
}
