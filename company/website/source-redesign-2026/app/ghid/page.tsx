import type { Metadata } from "next"
import { SectionHub } from "@/components/section-hub"
import { entriesIn, publishedIn } from "@/lib/site-routes"

// Kept out of the index until at least one pillar is published — an index page
// that lists only unwritten pages is not something a search engine should rank.
export const metadata: Metadata = {
  title: "Ghiduri BMS | Sovitech Control",
  description:
    "Ghidurile de referință Sovitech Control: sisteme BMS, caiet de sarcini, date ESG, protocoale, modernizare și conformare.",
  alternates: { canonical: "/ghid" },
  robots: publishedIn("ghid").length > 0 ? undefined : { index: false, follow: true },
}

export default function GhidHubPage() {
  return (
    <SectionHub
      labelRo="Ghiduri"
      labelEn="Guides"
      titleRo="Ghidurile de referință pentru automatizarea clădirilor"
      titleEn="Reference guides for building automation"
      leadRo="Șase ghiduri care acoperă arhitectura, specificația, datele, protocoalele, modernizarea și conformarea. Fiecare este punctul de plecare pentru un grup de articole mai scurte."
      leadEn="Six guides covering architecture, specification, data, protocols, modernisation and compliance. Each is the entry point for a group of shorter articles."
      entries={entriesIn("ghid")}
      showCategory
    />
  )
}
