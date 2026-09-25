import type { Metadata } from "next"
import { RoiMethodology } from "@/components/roi-methodology"

export const metadata: Metadata = {
  title: "Cum calculăm estimarea ROI | Sovitech Control",
  description:
    "Metodologia completă din spatele calculatorului ROI Sovitech: standardul EN ISO 52120-1, factorii de eficiență pe tip de clădire, formula pas cu pas și economiile măsurate în studii de teren. Transparent, cu surse.",
  alternates: { canonical: "/calculator-roi/metodologie" },
  openGraph: {
    title: "Cum calculăm estimarea ROI | Sovitech Control",
    description:
      "Estimarea nu vine dintr-o formulă inventată de noi, ci din standardul european EN ISO 52120-1. Îți arătăm fiecare pas și fiecare sursă.",
    type: "article",
  },
}

export default function MetodologiePage() {
  return <RoiMethodology />
}
