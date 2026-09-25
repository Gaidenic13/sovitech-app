import type { Metadata } from "next"
import { SectionHub } from "@/components/section-hub"
import { entriesIn } from "@/lib/site-routes"

export const metadata: Metadata = {
  title: "Pentru rolul tău | Sovitech Control",
  description:
    "Automatizarea clădirilor arată diferit din fiecare scaun: proprietar, asset manager, facility manager, director tehnic, ESG, industrial, IT/OT, proiectant.",
  alternates: { canonical: "/pentru" },
  // Role hubs are navigation for cross-links inside articles. They go into the
  // index once the article clusters that feed them are published.
  robots: { index: false, follow: true },
}

export default function PentruHubPage() {
  return (
    <SectionHub
      labelRo="Pentru rolul tău"
      labelEn="For your role"
      titleRo="Aceeași clădire, opt întrebări diferite"
      titleEn="One building, eight different questions"
      leadRo="Un proprietar întreabă ce riscă. Un facility manager întreabă cum operează mai bine cu ce are deja. Fiecare pagină adună ce este relevant pentru un singur rol."
      leadEn="An owner asks what they are exposed to. A facility manager asks how to run the building better with what they already have. Each page collects what matters to one role."
      entries={entriesIn("pentru")}
    />
  )
}
