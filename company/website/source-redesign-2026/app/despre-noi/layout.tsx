import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Despre Sovitech Control: integrator BMS din 2017 | Sovitech Control",
  description:
    "Sovitech Control SRL, CUI 38500895, Bucuresti. Integrator independent de automatizare a cladirilor, partener SAUTER din 2017. Echipa, sediu si date de firma.",
  alternates: { canonical: "/despre-noi" },
}

export default function DespreNoiLayout({ children }: { children: React.ReactNode }) {
  return children
}
