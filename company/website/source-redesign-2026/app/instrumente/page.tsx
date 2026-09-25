import type { Metadata } from "next"
import { SectionHub } from "@/components/section-hub"
import { entriesIn, publishedIn } from "@/lib/site-routes"

export const metadata: Metadata = {
  title: "Instrumente BMS: caiet de sarcini, checklist, calculator | Sovitech",
  description:
    "Opt instrumente pentru cine specifica, evalueaza sau opereaza un sistem BMS: modele de caiet de sarcini, checklist de audit, calculator si test de prag BACS.",
  alternates: { canonical: "/instrumente" },
  robots: publishedIn("instrumente").length > 0 ? undefined : { index: false, follow: true },
}

export default function InstrumenteHubPage() {
  return (
    <SectionHub
      labelRo="Instrumente"
      labelEn="Tools"
      titleRo="Opt instrumente pentru specificare, audit și estimare de buget"
      titleEn="Eight tools for specification, audits and budget estimates"
      leadRo="Instrumente de lucru, nu materiale de prezentare: calculatorul de economie este disponibil acum și returnează intervale, nu cifre unice, iar modelele de caiet de sarcini, listele de verificare și testul de încadrare sub pragul de 290 kW sunt în pregătire și se pot cere între timp prin pagina de contact."
      leadEn="Working tools, not brochures: the savings calculator is available now and returns ranges, not single figures, while the specification templates, checklists and the 290 kW threshold test are in preparation and can be requested through the contact page in the meantime."
      entries={entriesIn("instrumente")}
    />
  )
}
