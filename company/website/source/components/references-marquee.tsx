"use client"

import Link from "next/link"
import { Check, ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

// Compact reference cards (name, location, description, scope) — the same
// segment as the portfolio cards, without the "View Case Study" button.
// Rendered in a continuous right-to-left marquee on the homepage.

type Ref = {
  name: string
  locationRo: string
  locationEn: string
  descRo: string
  descEn: string
  scopeRo: string
  scopeEn: string
  dot: string   // category accent colour
  check: string // check-mark colour on the dot
}

const references: Ref[] = [
  {
    name: "Therme Nord București", locationRo: "București", locationEn: "Bucharest",
    descRo: "Sistem BMS complet pentru cel mai mare complex de wellness din Europa, ~34.000 m² construiți",
    descEn: "Complete BMS system for the largest wellness complex in Europe, ~34,000 m² built area",
    scopeRo: "Control HVAC, iluminat, energie", scopeEn: "HVAC control, lighting, energy",
    dot: "#8B7B5C", check: "#ffffff",
  },
  {
    name: "Floreasca Tower", locationRo: "București", locationEn: "Bucharest",
    descRo: "Sistem BMS pentru o clădire de birouri clasa A, ~7.500 m²",
    descEn: "BMS system for a class-A office building, ~7,500 m²",
    scopeRo: "Control centralizat, raportare energetică", scopeEn: "Centralised control, energy reporting",
    dot: "#C5C0F5", check: "#0D2E2B",
  },
  {
    name: "Rompharm Company", locationRo: "Otopeni", locationEn: "Otopeni",
    descRo: "Sistem BMS pentru o fabrică farmaceutică cu cerințe stricte",
    descEn: "BMS system for a pharmaceutical factory with strict requirements",
    scopeRo: "Control temperatură, umiditate, presiune", scopeEn: "Temperature, humidity, pressure control",
    dot: "#C8E6C9", check: "#0D2E2B",
  },
  {
    name: "NTN-SNR Fabrica de Rulmenți", locationRo: "Sibiu", locationEn: "Sibiu",
    descRo: "Sistem BMS pentru o fabrică de rulmenți cu 37.000 m² suprafață de producție",
    descEn: "BMS system for a bearing factory with 37,000 m² of production floor",
    scopeRo: "Control temperatură, ventilație industrială", scopeEn: "Temperature control, industrial ventilation",
    dot: "#0D2E2B", check: "#ffffff",
  },
  {
    name: "Radisson Blu Hotel", locationRo: "București", locationEn: "Bucharest",
    descRo: "Automatizare BMS pentru un hotel de 5 stele cu peste 1.800 m² spații de evenimente",
    descEn: "BMS automation for a 5-star hotel with over 1,800 m² of event space",
    scopeRo: "BMS, control temperatură, ventilație", scopeEn: "BMS, temperature control, ventilation",
    dot: "#8B7B5C", check: "#ffffff",
  },
  {
    name: "Spitalul Foișor", locationRo: "București", locationEn: "Bucharest",
    descRo: "Sistem BMS pentru noul spital de ortopedie, 9.000 m², 119 paturi",
    descEn: "BMS system for the new orthopaedic hospital, 9,000 m², 119 beds",
    scopeRo: "BMS medical, backup sisteme critice", scopeEn: "Medical BMS, critical systems backup",
    dot: "#C8E6C9", check: "#0D2E2B",
  },
  {
    name: "Pitești Retail Park", locationRo: "Pitești", locationEn: "Pitesti",
    descRo: "Sistem BMS pentru un parc de retail cu ~24.800 m² suprafață închiriabilă",
    descEn: "BMS system for a retail park with ~24,800 m² of leasable area",
    scopeRo: "Control HVAC, iluminat, energie", scopeEn: "HVAC control, lighting, energy",
    dot: "#5C5FD4", check: "#ffffff",
  },
  {
    name: "BCR Calea Victoriei", locationRo: "București", locationEn: "Bucharest",
    descRo: "Automatizare BMS pentru o clădire de birouri de 26.300 m² (turn + podium)",
    descEn: "BMS automation for a 26,300 m² office building (tower + podium)",
    scopeRo: "BMS, control acces, iluminat", scopeEn: "BMS, access control, lighting",
    dot: "#C5C0F5", check: "#0D2E2B",
  },
]

function RefCard({ r }: { r: Ref }) {
  const { t } = useLanguage()
  return (
    <div className="mr-4 shrink-0 w-[300px] rounded-[2px] border border-[#0D2E2B]/8 bg-white p-6">
      <h4 className="font-light text-base text-[#0D2E2B]">{r.name}</h4>
      <p className="text-xs text-[#888888] font-light mt-0.5">{t(r.locationRo, r.locationEn)}</p>
      <p className="text-sm text-[#888888] font-light leading-relaxed mt-3 mb-4 line-clamp-2">
        {t(r.descRo, r.descEn)}
      </p>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: r.dot }}>
          <Check className="h-2.5 w-2.5" style={{ color: r.check }} />
        </div>
        <span className="text-xs font-medium text-[#0D2E2B]">{t(r.scopeRo, r.scopeEn)}</span>
      </div>
    </div>
  )
}

export function ReferencesMarquee() {
  const { t } = useLanguage()
  // duplicate the list so the -50% translate loops seamlessly
  const loop = [...references, ...references]

  return (
    <section className="bg-[#F5F4F0] py-16 overflow-hidden">
      <div className="container-site mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="section-label mb-2">• {t("Referințe", "References")}</p>
          <h2 className="text-3xl md:text-4xl font-light text-[#0D2E2B] tracking-tighter">
            {t("Proiecte de referință", "Reference projects")}
          </h2>
        </div>
        <Link
          href="/resurse/referinte"
          className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-[#1F6B4A] hover:gap-3 transition-all shrink-0"
        >
          {t("Vezi toate referințele", "View all references")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Marquee: edges fade out via mask */}
      <div className="[mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
        <div className="flex w-max animate-marquee">
          {loop.map((r, i) => (
            <RefCard key={i} r={r} />
          ))}
        </div>
      </div>
    </section>
  )
}
